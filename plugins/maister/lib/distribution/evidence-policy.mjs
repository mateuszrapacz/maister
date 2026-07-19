import {
  EVIDENCE_LEVELS,
  EvidenceValidationError,
  createEvidenceRecord,
  normalizeEvidenceProvenance,
  validateEvidenceRecord,
  validateEvidenceSet,
} from "./evidence-schema.mjs";
import { SUPPORTED_TARGET_IDS } from "./targets.mjs";

export const BASE_EVIDENCE = Object.freeze(["E1", "E2", "E3", "E4"]);
export const NATIVE_EVIDENCE = Object.freeze(["E5", "E6"]);
const PROVISIONAL_NATIVE = new Set(NATIVE_EVIDENCE);
const CAPABILITY_CLASSES = new Set(["semantic", "safety", "persistence", "rollback", "packaging"]);
const SUPPORTED_TARGETS = new Set(SUPPORTED_TARGET_IDS);
export const FAIL_CLOSED_CLASSES = Object.freeze(["semantic", "safety", "persistence", "rollback"]);
const DEFAULT_SCENARIOS = Object.freeze({
  E1: "overlay-contract-v1",
  E2: "materialize-v1",
  E3: "portable-core-v1",
  E4: "installer-transaction-v1",
  E5: "native-discovery-v1",
  E6: "native-runtime-v1",
});

function matchingRecords(records, target, level) {
  return records
    .map((record) => validateEvidenceRecord(record))
    .filter((record) => record.target === target && record.capability === level)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}

function assertTarget(target) {
  if (!SUPPORTED_TARGETS.has(target)) {
    throw new EvidenceValidationError(`unsupported evidence target: ${target}`, { target });
  }
}

function assertRequiredEvidence(requiredEvidence) {
  if (!Array.isArray(requiredEvidence) || requiredEvidence.length === 0) {
    throw new EvidenceValidationError("requiredEvidence must contain at least one evidence level", {
      field: "requiredEvidence",
    });
  }
  if (new Set(requiredEvidence).size !== requiredEvidence.length) {
    throw new EvidenceValidationError("requiredEvidence must contain unique evidence levels", {
      field: "requiredEvidence",
    });
  }
  for (const level of requiredEvidence) {
    if (!EVIDENCE_LEVELS.has(level)) {
      throw new EvidenceValidationError(`unsupported required evidence level: ${level}`, { level });
    }
  }
}

export function collectEvidence({
  target,
  records = [],
  hostVersion = "unknown",
  provenance,
  timestamp = new Date().toISOString(),
  expiresAt,
  scenarioVersion = "1.0.0",
  scenarios = {},
  unavailableReason = "not-collected",
} = {}) {
  assertTarget(target);
  if (!Array.isArray(records)) {
    throw new EvidenceValidationError("records must be an array", { field: "records" });
  }
  const validated = records.map((record) => validateEvidenceRecord(record));
  if (validated.some((record) => record.target !== target)) {
    throw new EvidenceValidationError("evidence records must use the requested target", { target });
  }
  const normalizedProvenance = normalizeEvidenceProvenance(provenance, {
    scenario_version: scenarioVersion,
  });
  const byLevel = new Map();
  for (const record of validated) {
    if (byLevel.has(record.capability)) {
      throw new EvidenceValidationError(`duplicate evidence record: ${record.capability}`, {
        capability: record.capability,
      });
    }
    byLevel.set(record.capability, record);
  }
  for (const level of EVIDENCE_LEVELS) {
    if (byLevel.has(level)) continue;
    byLevel.set(level, createEvidenceRecord({
      target,
      capability: level,
      hostVersion,
      scenario: scenarios[level] ?? DEFAULT_SCENARIOS[level],
      result: "unavailable",
      provenance: { ...normalizedProvenance, reason: unavailableReason },
      timestamp,
      expiresAt,
    }));
  }
  return validateEvidenceSet([...byLevel.values()], { target });
}

export function evidenceNeedsRenewal(record, {
  now = new Date().toISOString(),
  host,
  hostVersion,
  sourceVersion,
  overlayId,
  overlayVersion,
  sourceCommit,
  scenarioVersion,
  schemaVersion,
  projectorVersion,
  canonicalSetDigest,
  manifestDigest,
  projectedTreeDigest,
} = {}) {
  const validated = validateEvidenceRecord(record);
  if (validated.result !== "passed") return true;
  if (Date.parse(now) >= Date.parse(validated.expires_at)) return true;
  if (host !== undefined && validated.provenance.host !== host) return true;
  if (hostVersion !== undefined && validated.host_version !== hostVersion) return true;
  const provenance = validated.provenance;
  if (sourceVersion !== undefined && provenance.source_version !== sourceVersion) return true;
  if (overlayId !== undefined && provenance.overlay_id !== overlayId) return true;
  if (overlayVersion !== undefined && provenance.overlay_version !== overlayVersion) return true;
  if (sourceCommit !== undefined && provenance.source_commit !== sourceCommit) return true;
  if (scenarioVersion !== undefined && provenance.scenario_version !== scenarioVersion) return true;
  if (schemaVersion !== undefined && provenance.schema_version !== schemaVersion) return true;
  if (projectorVersion !== undefined && provenance.projector_version !== projectorVersion) return true;
  if (canonicalSetDigest !== undefined && provenance.canonical_set_digest !== canonicalSetDigest) return true;
  if (manifestDigest !== undefined && provenance.manifest_digest !== manifestDigest) return true;
  if (projectedTreeDigest !== undefined && provenance.projected_tree_digest !== projectedTreeDigest) return true;
  return false;
}

export function requiredEvidenceForTarget(target, { runtimeAvailable = false } = {}) {
  assertTarget(target);
  return [...BASE_EVIDENCE, ...NATIVE_EVIDENCE].map((level) => ({
    level,
    required: !PROVISIONAL_NATIVE.has(level) || runtimeAvailable,
  }));
}

export function evaluateCapability({
  target,
  capability,
  capabilityClass,
  requiredEvidence,
  records = [],
  now = new Date().toISOString(),
  host,
  hostVersion,
  sourceVersion,
  overlayId,
  overlayVersion,
  sourceCommit,
  scenarioVersion,
  schemaVersion,
  projectorVersion,
  canonicalSetDigest,
  manifestDigest,
  projectedTreeDigest,
}) {
  assertTarget(target);
  if (!CAPABILITY_CLASSES.has(capabilityClass)) {
    throw new EvidenceValidationError(`unsupported capability class: ${capabilityClass}`, { capabilityClass });
  }
  assertRequiredEvidence(requiredEvidence);
  if (!Array.isArray(records)) {
    throw new EvidenceValidationError("records must be an array", { field: "records" });
  }
  const context = {
    now,
    host,
    hostVersion,
    sourceVersion,
    overlayId,
    overlayVersion,
    sourceCommit,
    scenarioVersion,
    schemaVersion,
    projectorVersion,
    canonicalSetDigest,
    manifestDigest,
    projectedTreeDigest,
  };
  const passed = [];
  const unavailable = [];
  const failed = [];
  const missing = [];
  const expired = [];

  for (const level of requiredEvidence) {
    const candidates = matchingRecords(records, target, level);
    const latest = candidates[0];
    if (!latest) {
      missing.push(level);
      continue;
    }
    if (latest.result === "passed" && !evidenceNeedsRenewal(latest, context)) {
      passed.push(level);
      continue;
    }
    if (latest.result === "unavailable") {
      unavailable.push(level);
    } else if (latest.result === "failed") {
      failed.push(level);
    } else {
      expired.push(level);
    }
  }

  const incompleteNative = unavailable.length > 0
    && missing.length === 0
    && unavailable.every((level) => PROVISIONAL_NATIVE.has(level));
  const baselineSatisfied = requiredEvidence
    .filter((level) => !PROVISIONAL_NATIVE.has(level))
    .every((level) => passed.includes(level));
  const provisional = capabilityClass === "packaging" && baselineSatisfied && incompleteNative;
  const fullySatisfied = passed.length === requiredEvidence.length;
  return {
    target,
    capability,
    capabilityClass,
    required: [...requiredEvidence],
    passedEvidence: passed,
    unavailable,
    failed,
    missing,
    expired,
    passed: fullySatisfied,
    status: fullySatisfied ? "passed" : provisional ? "provisional" : "blocked",
  };
}

export function evaluateTarget({ target, records, capabilities, ...context }) {
  assertTarget(target);
  if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities) || Object.keys(capabilities).length === 0) {
    throw new EvidenceValidationError("capabilities must be a non-empty mapping", { field: "capabilities" });
  }
  return Object.entries(capabilities).map(([capability, definition]) => evaluateCapability({
    target,
    capability,
    capabilityClass: definition.class,
    requiredEvidence: definition.required_evidence,
    records,
    ...context,
  }));
}

export { PROVISIONAL_NATIVE };
