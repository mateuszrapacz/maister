import crypto from "node:crypto";

import { SUPPORTED_TARGET_IDS } from "./targets.mjs";

export const EVIDENCE_RESULTS = new Set(["passed", "failed", "unavailable"]);
export const EVIDENCE_LEVELS = new Set(["E1", "E2", "E3", "E4", "E5", "E6"]);
export const SUPPORTED_TARGETS = new Set(SUPPORTED_TARGET_IDS);
const SHA256 = /^[0-9a-f]{64}$/u;
const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const PROVENANCE_FIELDS = new Set([
  "source_commit",
  "source_version",
  "overlay_version",
  "scenario_version",
  "source_hash",
  "overlay_hash",
  "materialized_hash",
  "provenance_hash",
  "attestation_digest",
  "artifact_digest",
  "portable_core_tree_hash",
  "command",
  "reason",
  "timeout_ms",
]);
const REQUIRED_PROVENANCE_FIELDS = ["source_commit", "source_version", "overlay_version", "scenario_version"];
const PROVENANCE_INPUT_FIELDS = new Set([
  ...PROVENANCE_FIELDS,
  "resolvedCommit",
  "sourceVersion",
  "overlayVersion",
  "sourceHash",
  "overlayHash",
  "materializedHash",
  "contentHash",
  "provenanceHash",
  "attestationDigest",
  "artifactDigest",
  "portableCoreTreeHash",
  "scenarioVersion",
  "hostVersion",
  "schemaVersion",
  "requestedSource",
  "sourceKind",
  "requestedRef",
  "overlayId",
  "host",
  "hashes",
]);
const RECORD_FIELDS = new Set([
  "target",
  "capability",
  "host_version",
  "scenario",
  "timestamp",
  "result",
  "provenance",
  "expires_at",
]);

const REQUIRED_FIELDS = [
  "target",
  "capability",
  "host_version",
  "scenario",
  "timestamp",
  "result",
  "provenance",
  "expires_at",
];

export class EvidenceValidationError extends Error {
  constructor(message, details = {}) {
    super(`[E_EVIDENCE_SCHEMA] ${message}`);
    this.name = "EvidenceValidationError";
    this.code = "E_EVIDENCE_SCHEMA";
    this.kind = this.code;
    this.details = details;
    this.retryable = false;
  }
}

function assertObject(value, location) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new EvidenceValidationError(`${location} must be an object`, { location });
  }
}

function assertText(value, location) {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) {
    throw new EvidenceValidationError(`${location} must be a non-empty string`, { location });
  }
}

function assertTimestamp(value, location) {
  assertText(value, location);
  if (!ISO_TIMESTAMP.test(value) || Number.isNaN(Date.parse(value))) {
    throw new EvidenceValidationError(`${location} must be an ISO timestamp`, { location, value });
  }
}

function assertHash(value, location) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new EvidenceValidationError(`${location} must be a lowercase SHA-256 hash`, { location, value });
  }
}

function assertProvenance(provenance) {
  assertObject(provenance, "record.provenance");
  const unknown = Object.keys(provenance).find((field) => !PROVENANCE_FIELDS.has(field));
  if (unknown) {
    throw new EvidenceValidationError(`record.provenance has unknown field ${unknown}`, {
      field: `provenance.${unknown}`,
    });
  }
  for (const field of REQUIRED_PROVENANCE_FIELDS) assertText(provenance[field], `record.provenance.${field}`);
  if (!FULL_COMMIT.test(provenance.source_commit)) {
    throw new EvidenceValidationError("record.provenance.source_commit must be a full commit", {
      field: "provenance.source_commit",
    });
  }
  for (const field of [
    "source_hash",
    "overlay_hash",
    "materialized_hash",
    "provenance_hash",
    "attestation_digest",
    "artifact_digest",
    "portable_core_tree_hash",
  ]) {
    if (provenance[field] !== undefined) assertHash(provenance[field], `record.provenance.${field}`);
  }
  if (provenance.timeout_ms !== undefined && (!Number.isInteger(provenance.timeout_ms) || provenance.timeout_ms <= 0)) {
    throw new EvidenceValidationError("record.provenance.timeout_ms must be a positive integer", {
      field: "provenance.timeout_ms",
    });
  }
  if (provenance.reason !== undefined) assertText(provenance.reason, "record.provenance.reason");
  if (provenance.command !== undefined) assertText(provenance.command, "record.provenance.command");
  return provenance;
}

export function normalizeEvidenceProvenance(value = {}, defaults = {}) {
  assertObject(value, "record.provenance");
  const unknown = Object.keys(value).find((field) => !PROVENANCE_INPUT_FIELDS.has(field));
  if (unknown) {
    throw new EvidenceValidationError(`record.provenance has unknown field ${unknown}`, {
      field: `provenance.${unknown}`,
    });
  }
  const hashes = value.hashes && typeof value.hashes === "object" && !Array.isArray(value.hashes)
    ? value.hashes
    : {};
  const normalized = {
    source_commit: value.source_commit ?? value.resolvedCommit ?? defaults.source_commit,
    source_version: value.source_version ?? value.sourceVersion ?? defaults.source_version,
    overlay_version: value.overlay_version ?? value.overlayVersion ?? defaults.overlay_version,
    scenario_version: value.scenario_version ?? value.scenarioVersion ?? defaults.scenario_version,
    source_hash: value.source_hash ?? value.sourceHash ?? hashes.source ?? hashes.sourceHash,
    overlay_hash: value.overlay_hash ?? value.overlayHash ?? hashes.overlay ?? hashes.overlayHash,
    materialized_hash: value.materialized_hash ?? value.materializedHash ?? value.contentHash ?? hashes.materialized ?? hashes.materializedHash,
    provenance_hash: value.provenance_hash ?? value.provenanceHash ?? hashes.provenance ?? hashes.provenanceHash,
    attestation_digest: value.attestation_digest ?? value.attestationDigest ?? hashes.attestation ?? hashes.attestationDigest,
    artifact_digest: value.artifact_digest ?? value.artifactDigest ?? hashes.artifact ?? hashes.artifactDigest,
    portable_core_tree_hash: value.portable_core_tree_hash ?? value.portableCoreTreeHash ?? hashes.portableCore ?? hashes.portable_core_tree,
    command: value.command,
    reason: value.reason,
    timeout_ms: value.timeout_ms,
  };
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== undefined));
}

function freeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

export function validateEvidenceRecord(record) {
  assertObject(record, "record");
  const unknown = Object.keys(record).find((field) => !RECORD_FIELDS.has(field));
  if (unknown) {
    throw new EvidenceValidationError(`record has unknown field ${unknown}`, { field: unknown });
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(record, field)) {
      throw new EvidenceValidationError(`record is missing ${field}`, { field });
    }
  }
  if (!SUPPORTED_TARGETS.has(record.target)) {
    throw new EvidenceValidationError(`unsupported evidence target: ${record.target}`, { target: record.target });
  }
  assertText(record.capability, "record.capability");
  assertText(record.host_version, "record.host_version");
  assertText(record.scenario, "record.scenario");
  assertTimestamp(record.timestamp, "record.timestamp");
  if (!EVIDENCE_LEVELS.has(record.capability)) {
    throw new EvidenceValidationError(`unsupported evidence capability: ${record.capability}`, { capability: record.capability });
  }
  if (!EVIDENCE_RESULTS.has(record.result)) {
    throw new EvidenceValidationError(`unsupported evidence result: ${record.result}`, { result: record.result });
  }
  assertProvenance(record.provenance);
  if (record.result === "unavailable" && !record.provenance.reason) {
    throw new EvidenceValidationError("unavailable evidence must include provenance.reason", {
      field: "provenance.reason",
    });
  }
  assertTimestamp(record.expires_at, "record.expires_at");
  if (Date.parse(record.expires_at) <= Date.parse(record.timestamp)) {
    throw new EvidenceValidationError("record.expires_at must be after record.timestamp", {
      timestamp: record.timestamp,
      expires_at: record.expires_at,
    });
  }
  return freeze({ ...record, provenance: { ...record.provenance } });
}

export function createEvidenceRecord({
  target,
  capability,
  hostVersion,
  scenario,
  result,
  provenance,
  timestamp = new Date().toISOString(),
  expiresAt,
}) {
  assertTimestamp(timestamp, "timestamp");
  if (expiresAt !== undefined) assertTimestamp(expiresAt, "expiresAt");
  const effectiveExpiresAt = expiresAt ?? new Date(Date.parse(timestamp) + 24 * 60 * 60 * 1000).toISOString();
  return validateEvidenceRecord({
    target,
    capability,
    host_version: hostVersion,
    scenario,
    timestamp,
    result,
    provenance: normalizeEvidenceProvenance(provenance),
    expires_at: effectiveExpiresAt,
  });
}

export function validateEvidenceSet(records, { target } = {}) {
  if (!Array.isArray(records)) {
    throw new EvidenceValidationError("evidence set must be an array", { field: "records" });
  }
  const validated = records.map((record) => validateEvidenceRecord(record));
  if (validated.length !== EVIDENCE_LEVELS.size) {
    throw new EvidenceValidationError("evidence set must contain exactly E1-E6", {
      expected: [...EVIDENCE_LEVELS],
      actual: validated.map((record) => record.capability),
    });
  }
  const actualTarget = target ?? validated[0]?.target;
  if (!SUPPORTED_TARGETS.has(actualTarget)) {
    throw new EvidenceValidationError(`unsupported evidence target: ${actualTarget}`, { target: actualTarget });
  }
  const levels = new Set();
  for (const record of validated) {
    if (record.target !== actualTarget) {
      throw new EvidenceValidationError("evidence set contains multiple targets", {
        target: actualTarget,
        actual: record.target,
      });
    }
    if (levels.has(record.capability)) {
      throw new EvidenceValidationError(`evidence set contains duplicate ${record.capability}`, {
        capability: record.capability,
      });
    }
    levels.add(record.capability);
  }
  for (const level of EVIDENCE_LEVELS) {
    if (!levels.has(level)) {
      throw new EvidenceValidationError(`evidence set is missing ${level}`, { capability: level });
    }
  }
  return Object.freeze([...validated].sort((left, right) => left.capability.localeCompare(right.capability)));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function evidenceFingerprint(record) {
  const validated = validateEvidenceRecord(record);
  return crypto.createHash("sha256").update(canonicalJson(validated)).digest("hex");
}

export { REQUIRED_FIELDS, PROVENANCE_FIELDS };
