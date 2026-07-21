#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { validateOverlayCommand } from "./validate-overlay.mjs";
import { SUPPORTED_TARGET_IDS } from "../lib/distribution/targets.mjs";
import { canonicalJson } from "../lib/distribution/provenance.mjs";
import { validateEvidenceSet } from "../lib/distribution/evidence-schema.mjs";

const DEFAULT_ROOT = path.resolve(import.meta.dirname, "../../..");
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;

/**
 * The release contract is deliberately current-state based.  Keep this list
 * explicit so a target cannot enter release admission merely by being added to
 * an unrelated registry without the release surface being reviewed.
 */
export const CURRENT_RELEASE_TARGETS = Object.freeze(["codex", "cursor", "kiro-cli", "pi"]);
export const PI_PROVISIONAL_CLAIM = "pi.structural-transactional.provisional";
export const PI_NATIVE_SEMANTIC_CLAIM = "pi.native-semantic";

const FORBIDDEN_ARCHIVE_SEGMENTS = new Set([
  ".pi",
  "auth",
  "credentials",
  "node_modules",
  "sessions",
  "trust",
]);

export class CurrentTargetAdmissionError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(`[${code}] ${message}`, options);
    this.name = "CurrentTargetAdmissionError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new CurrentTargetAdmissionError(code, message, details);
}

function assertCurrentTargetContract() {
  if (JSON.stringify([...SUPPORTED_TARGET_IDS]) !== JSON.stringify([...CURRENT_RELEASE_TARGETS])) {
    fail("E_CURRENT_TARGET_ADMISSION_TARGETS", "the central target registry does not match the current release target contract", {
      expected: CURRENT_RELEASE_TARGETS,
      actual: SUPPORTED_TARGET_IDS,
    });
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function readEvidenceRecords(filePath) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail("E_CURRENT_TARGET_ADMISSION_EVIDENCE", "could not read the supplied evidence manifest", {
      evidence: filePath,
      cause: error.code ?? error.message,
    });
  }
  const records = Array.isArray(value) ? value : value?.records;
  if (!Array.isArray(records)) {
    fail("E_CURRENT_TARGET_ADMISSION_EVIDENCE", "evidence manifest must contain a records array", { evidence: filePath });
  }
  try {
    return validateEvidenceSet(records, { target: "pi" });
  } catch (error) {
    fail("E_CURRENT_TARGET_ADMISSION_EVIDENCE", "evidence manifest does not contain a valid Pi E1-E6 set", {
      evidence: filePath,
      cause: error.message,
    });
  }
}

function archiveListing(filePath) {
  try {
    return execFileSync("tar", ["-tzf", filePath], {
      encoding: "utf8",
      maxBuffer: MAX_ARCHIVE_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
    }).split(/\r?\n/u).filter(Boolean);
  } catch (error) {
    fail("E_CURRENT_TARGET_ADMISSION_ARCHIVE", "could not inspect a current target archive", {
      archive: filePath,
      stderr: error.stderr?.toString?.() ?? "",
    });
  }
}

function assertArchiveClosure(filePath, target) {
  const entries = archiveListing(filePath);
  const expectedOverlay = `plugins/maister/overlays/${target}/overlay.yml`;
  if (!entries.includes(expectedOverlay)) {
    fail("E_CURRENT_TARGET_ADMISSION_ARCHIVE", "current target archive is missing its overlay contract", {
      target,
      archive: filePath,
      expectedOverlay,
    });
  }
  const forbidden = entries.filter((entry) => {
    const segments = entry.split("/");
    return FORBIDDEN_ARCHIVE_SEGMENTS.has(segments.at(-1))
      || segments.some((segment) => FORBIDDEN_ARCHIVE_SEGMENTS.has(segment))
      || /(?:^|\/)pi-subagents(?:\/|$)/u.test(entry);
  });
  if (forbidden.length > 0) {
    fail("E_CURRENT_TARGET_ADMISSION_ARCHIVE", "current target archive contains operator-owned or external prerequisite state", {
      target,
      archive: filePath,
      forbidden,
    });
  }
  const packageRootEntries = new Set(["plugins", "plugins/", "plugins/maister", "plugins/maister/"]);
  if (entries.some((entry) => !packageRootEntries.has(entry) && !entry.startsWith("plugins/maister/"))) {
    fail("E_CURRENT_TARGET_ADMISSION_ARCHIVE", "current target archive contains files outside the Maister package closure", {
      target,
      archive: filePath,
    });
  }
  return Object.freeze({
    target,
    name: path.basename(filePath),
    sha256: sha256File(filePath),
    size: fs.statSync(filePath).size,
    entries: entries.length,
  });
}

function unavailableSupportClaims(reason = "evidence_manifest_required") {
  return Object.freeze({
    label: "pi.registered",
    claim_basis: "current-target-contract-v1",
    evidence: Object.freeze({ E1: "unavailable", E2: "unavailable", E3: "unavailable", E4: "unavailable", E5: "unavailable", E6: "unavailable" }),
    registered: Object.freeze({ status: "passed" }),
    structural_transactional: Object.freeze({
      status: "unavailable",
      required_evidence: Object.freeze(["E1", "E2", "E3", "E4"]),
      reason,
      remediation: "run the target lifecycle evidence gate and pass its E1-E6 manifest to current-target-admission",
    }),
    native_discovery: Object.freeze({
      status: "unavailable",
      evidence: "E5",
      reason: "host_evidence_unavailable",
      remediation: "run the pinned Pi package-agent discovery probe before claiming native support",
    }),
    native_runtime: Object.freeze({
      status: "unavailable",
      evidence: "E6",
      reason: "host_evidence_unavailable",
      remediation: "run the ordinary and advisor public delegation v1 lifecycle matrix before claiming native runtime support",
    }),
    semantic: Object.freeze({
      status: "unavailable",
      evidence: "E6",
      reason: "native_runtime_unavailable",
      remediation: "complete E6 before publishing semantic support",
    }),
  });
}

function currentSupportClaims({ evidenceRecords = null, piTarget, archives = undefined } = {}) {
  if (evidenceRecords === null) return unavailableSupportClaims();
  const records = validateEvidenceSet(evidenceRecords, { target: "pi" });
  const byCapability = new Map(records.map((record) => [record.capability, record]));
  for (const level of ["E1", "E2", "E3", "E4"]) {
    if (byCapability.get(level)?.result !== "passed") {
      fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", `${level} must pass before Pi packaging is admitted`, {
        level,
        result: byCapability.get(level)?.result ?? null,
      });
    }
  }
  for (const level of ["E5", "E6"]) {
    const result = byCapability.get(level)?.result;
    if (result !== "unavailable" && result !== "passed") {
      fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", `${level} must either pass or remain explicitly unavailable`, { level, result: result ?? null });
    }
  }
  const nativeEvidencePassed = ["E5", "E6"].every((level) => byCapability.get(level)?.result === "passed");
  const nativeEvidenceUnavailable = ["E5", "E6"].every((level) => byCapability.get(level)?.result === "unavailable");
  if (!nativeEvidencePassed && !nativeEvidenceUnavailable) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "E5 and E6 must move together between unavailable and passed", {
      E5: byCapability.get("E5")?.result ?? null,
      E6: byCapability.get("E6")?.result ?? null,
    });
  }
  const binding = {
    schema_version: 1,
    kind: "pi-transaction-evidence-v1",
    target: "pi",
    source_commit: records[0].provenance.source_commit,
    source_version: records[0].provenance.source_version,
    overlay_id: records[0].provenance.overlay_id,
    overlay_version: records[0].provenance.overlay_version,
    overlay_hash: records[0].provenance.overlay_hash,
    evidence_digest: sha256Json(records),
    evidence_ids: records.map((record) => ({
      capability: record.capability,
      evidence_id: record.evidence_id,
      result: record.result,
      timestamp: record.timestamp,
      expires_at: record.expires_at,
    })),
    ...(archives === undefined ? {} : {
      archive_sha256: archives.find((archive) => archive.target === "pi")?.sha256 ?? null,
    }),
  };
  if (binding.overlay_id !== piTarget.overlay_id || binding.overlay_version !== piTarget.overlay_version || binding.overlay_hash !== piTarget.contract_hash) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi evidence is not bound to the admitted Pi overlay", {
      expected: { overlay_id: piTarget.overlay_id, overlay_version: piTarget.overlay_version, overlay_hash: piTarget.contract_hash },
      actual: binding,
    });
  }
  return Object.freeze({
    label: nativeEvidencePassed ? PI_NATIVE_SEMANTIC_CLAIM : PI_PROVISIONAL_CLAIM,
    claim_basis: "validated-current-evidence-v1",
    evidence: Object.freeze(Object.fromEntries(records.map((record) => [record.capability, record.result]))),
    evidence_binding: Object.freeze(binding),
    evidence_records: records,
    structural_transactional: Object.freeze({
      status: nativeEvidencePassed ? "passed" : "provisional",
      required_evidence: Object.freeze(["E1", "E2", "E3", "E4"]),
    }),
    native_discovery: nativeEvidencePassed
      ? Object.freeze({ status: "passed", evidence: "E5" })
      : Object.freeze({
        status: "unavailable",
        evidence: "E5",
        reason: "host_evidence_unavailable",
        remediation: "run the pinned Pi package-agent discovery probe before claiming native support",
      }),
    native_runtime: nativeEvidencePassed
      ? Object.freeze({ status: "passed", evidence: "E6" })
      : Object.freeze({
        status: "unavailable",
        evidence: "E6",
        reason: "host_evidence_unavailable",
        remediation: "run the ordinary and advisor public delegation v1 lifecycle matrix before claiming native runtime support",
      }),
    semantic: nativeEvidencePassed
      ? Object.freeze({ status: "passed", evidence: "E6" })
      : Object.freeze({
        status: "unavailable",
        evidence: "E6",
        reason: "native_runtime_unavailable",
        remediation: "complete E6 before publishing semantic support",
      }),
  });
}

function validateSupportClaims(claims) {
  if (!claims || !["pi.registered", PI_PROVISIONAL_CLAIM, PI_NATIVE_SEMANTIC_CLAIM].includes(claims.label)) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi admission must publish a registered, provisional, or native-semantic claim label");
  }
  const evidence = claims.evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi admission must declare E1-E6 results");
  }
  if (claims.label === "pi.registered") {
    if (Object.values(evidence).some((result) => result !== "unavailable")) {
      fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "registered Pi admission cannot claim evaluated evidence");
    }
    return claims;
  }
  if (claims.claim_basis !== "validated-current-evidence-v1" || !Array.isArray(claims.evidence_records)) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "evaluated Pi claims must carry validated current evidence");
  }
  const records = validateEvidenceSet(claims.evidence_records, { target: "pi" });
  const expected = Object.fromEntries(records.map((record) => [record.capability, record.result]));
  if (JSON.stringify(expected) !== JSON.stringify(claims.evidence)) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi claim statuses do not match the bound evidence records");
  }
  if (!claims.evidence_binding?.evidence_digest || claims.evidence_binding.evidence_digest !== sha256Json(records)) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi claim evidence binding does not match its records");
  }
  const binding = claims.evidence_binding;
  const firstProvenance = records[0].provenance;
  for (const field of ["source_commit", "source_version", "overlay_id", "overlay_version", "overlay_hash"]) {
    if (binding[field] !== firstProvenance[field]) {
      fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", `Pi claim binding does not match evidence provenance.${field}`, {
        field,
        binding: binding[field],
        evidence: firstProvenance[field],
      });
    }
  }
  if (records.some((record) => record.provenance.source_commit !== binding.source_commit
    || record.provenance.source_version !== binding.source_version
    || record.provenance.overlay_id !== binding.overlay_id
    || record.provenance.overlay_version !== binding.overlay_version)) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi evidence records do not share one source/overlay binding");
  }
  for (const level of ["E1", "E2", "E3", "E4"]) {
    if (evidence[level] !== "passed") fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", `${level} must pass before Pi support is admitted`);
  }
  const expectedNativeResult = claims.label === PI_NATIVE_SEMANTIC_CLAIM ? "passed" : "unavailable";
  for (const level of ["E5", "E6"]) {
    if (evidence[level] !== expectedNativeResult) {
      fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", `${level} does not match the Pi claim label`, { level, expected: expectedNativeResult, actual: evidence[level] });
    }
  }
  if (claims.label === PI_NATIVE_SEMANTIC_CLAIM
    && (claims.structural_transactional?.status !== "passed"
      || claims.native_discovery?.status !== "passed"
      || claims.native_runtime?.status !== "passed"
      || claims.semantic?.status !== "passed")) {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "native-semantic Pi claims must publish passed structural, discovery, runtime, and semantic statuses");
  }
  if (claims.label === PI_PROVISIONAL_CLAIM && claims.structural_transactional?.status !== "provisional") {
    fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "provisional Pi claims must publish provisional structural/transactional status");
  }
  return claims;
}

export function validateCurrentTargetAdmission(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    fail("E_CURRENT_TARGET_ADMISSION_REPORT", "current target admission report must be an object");
  }
  if (report.schema_version !== 1 || report.gate !== "current-target-admission-v1" || report.ok !== true) {
    fail("E_CURRENT_TARGET_ADMISSION_REPORT", "report is not a successful current-target admission", {
      schema_version: report.schema_version,
      gate: report.gate,
      ok: report.ok,
    });
  }
  if (JSON.stringify(report.target_set) !== JSON.stringify([...CURRENT_RELEASE_TARGETS])) {
    fail("E_CURRENT_TARGET_ADMISSION_REPORT", "report target_set must contain exactly the four current targets", {
      expected: CURRENT_RELEASE_TARGETS,
      actual: report.target_set,
    });
  }
  if (!Array.isArray(report.targets) || report.targets.length !== CURRENT_RELEASE_TARGETS.length) {
    fail("E_CURRENT_TARGET_ADMISSION_REPORT", "report must contain one result for each current target");
  }
  const targets = report.targets.map((entry) => entry?.target);
  if (JSON.stringify(targets) !== JSON.stringify([...CURRENT_RELEASE_TARGETS])) {
    fail("E_CURRENT_TARGET_ADMISSION_REPORT", "report targets are not the exact current target set", {
      expected: CURRENT_RELEASE_TARGETS,
      actual: targets,
    });
  }
  for (const entry of report.targets) {
    if (entry.ok !== true || typeof entry.overlay_id !== "string" || typeof entry.overlay_version !== "string" || typeof entry.contract_hash !== "string") {
      fail("E_CURRENT_TARGET_ADMISSION_REPORT", `target ${entry.target} did not pass current admission`, { entry });
    }
  }
  const piTarget = report.targets.find((entry) => entry.target === "pi");
  validateSupportClaims(report.pi_support);
  if (report.pi_support.label !== "pi.registered") {
    const binding = report.pi_support.evidence_binding;
    if (binding.target !== "pi"
      || binding.overlay_id !== piTarget.overlay_id
      || binding.overlay_version !== piTarget.overlay_version
      || binding.overlay_hash !== piTarget.contract_hash) {
      fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi evidence binding does not match the admitted Pi overlay", {
        binding,
        target: piTarget,
      });
    }
    if (report.archives !== undefined) {
      const piArchive = report.archives.find((entry) => entry.target === "pi");
      if (binding.archive_sha256 !== piArchive.sha256) {
        fail("E_CURRENT_TARGET_ADMISSION_CLAIMS", "Pi evidence binding does not match the admitted Pi archive", {
          expected: piArchive.sha256,
          actual: binding.archive_sha256,
        });
      }
    }
  }
  if (report.archives !== undefined) {
    if (!Array.isArray(report.archives) || report.archives.length !== CURRENT_RELEASE_TARGETS.length) {
      fail("E_CURRENT_TARGET_ADMISSION_REPORT", "archive admission must contain exactly one archive per current target");
    }
    const archiveTargets = report.archives.map((entry) => entry?.target);
    if (JSON.stringify(archiveTargets) !== JSON.stringify([...CURRENT_RELEASE_TARGETS])) {
      fail("E_CURRENT_TARGET_ADMISSION_REPORT", "archive admission target order is not the current target order", { archiveTargets });
    }
  }
  return report;
}

export async function runCurrentTargetAdmission({
  root = DEFAULT_ROOT,
  archiveDir,
  reportPath,
  evidencePath,
} = {}) {
  assertCurrentTargetContract();
  const repositoryRoot = path.resolve(root);
  const targets = CURRENT_RELEASE_TARGETS.map((target) => {
    const overlayRoot = path.join(repositoryRoot, "plugins", "maister", "overlays", target);
    const result = validateOverlayCommand([
      "--target", target,
      "--overlay", path.join(overlayRoot, "overlay.yml"),
      "--inventory", path.join(overlayRoot, "inventory.yml"),
      "--json",
    ]);
    return Object.freeze({
      target,
      ok: result.ok === true,
      overlay_id: result.overlay_id,
      overlay_version: result.overlay_version,
      contract_hash: result.contract_hash,
      native_asset_count: result.native_asset_count,
    });
  });
  const archives = archiveDir === undefined || archiveDir === ""
    ? undefined
    : CURRENT_RELEASE_TARGETS.map((target) => {
      const archive = path.join(path.resolve(archiveDir), `maister-${target}.tar.gz`);
      if (!fs.existsSync(archive) || !fs.statSync(archive).isFile()) {
        fail("E_CURRENT_TARGET_ADMISSION_ARCHIVE", `missing current target archive for ${target}`, { target, archive });
      }
      return assertArchiveClosure(archive, target);
    });
  const evidenceRecords = evidencePath === undefined || evidencePath === ""
    ? null
    : readEvidenceRecords(path.resolve(evidencePath));
  const result = {
    schema_version: 1,
    gate: "current-target-admission-v1",
    target_set: [...CURRENT_RELEASE_TARGETS],
    targets,
    ...(archives === undefined ? {} : { archives }),
    pi_support: currentSupportClaims({
      evidenceRecords,
      piTarget: targets.find((entry) => entry.target === "pi"),
      archives,
    }),
    ok: targets.every((entry) => entry.ok) && (archives === undefined || archives.length === CURRENT_RELEASE_TARGETS.length),
  };
  validateCurrentTargetAdmission(result);
  if (reportPath) {
    const absoluteReport = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(absoluteReport), { recursive: true });
    fs.writeFileSync(absoluteReport, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--archive-dir", "--report", "--root", "--evidence"].includes(argument)) {
      throw new CurrentTargetAdmissionError("E_CURRENT_TARGET_ADMISSION_USAGE", `unknown argument: ${argument}`);
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) {
      throw new CurrentTargetAdmissionError("E_CURRENT_TARGET_ADMISSION_USAGE", `${argument} requires a value`);
    }
    if (argument === "--archive-dir") options.archiveDir = value;
    if (argument === "--report") options.reportPath = value;
    if (argument === "--root") options.root = value;
    if (argument === "--evidence") options.evidencePath = value;
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runCurrentTargetAdmission(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      error: { code: error.code ?? "E_CURRENT_TARGET_ADMISSION", message: error.message, details: error.details ?? {} },
    })}\n`);
    process.exitCode = 1;
  }
}
