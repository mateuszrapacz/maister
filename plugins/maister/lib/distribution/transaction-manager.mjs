import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { assertPathIdentity, capturePathIdentity, DistributionError, distributionError, ensureDirectoryRoot, readFileNoFollow, throwDistributionError } from "./path-safety.mjs";
import { loadOverlay } from "./overlay-loader.mjs";
import { materialize } from "./materializer.mjs";
import { revalidateResolvedSource, resolveSource } from "./source-resolver.mjs";
import { hashFile, hashTree } from "./hash-tree.mjs";
import { assertNoDrift, describe } from "./drift-detector.mjs";
import { atomicWriteSetting, formatMode, prepareSetting, removeManagedKeys } from "./settings-owner.mjs";
import { getTargetPaths } from "./target-paths.mjs";
import { validateReceipt, readReceipt, UUID } from "./receipt-schema.mjs";
import { appendTransition, isUnresolved, readJournal, validateJournal } from "./journal-schema.mjs";
import { collectEvidence, evaluateTarget, FAIL_CLOSED_CLASSES } from "./evidence-policy.mjs";
import { createEvidenceRecord, normalizeEvidenceProvenance, validateEvidenceRecord } from "./evidence-schema.mjs";
import { consumeE3Attestation, portableCoreTreeHash, requireE3Attestation } from "./e3-attestation.mjs";
import { getTargetDefinition } from "./targets.mjs";
import {
  assertSafePath,
  copyTreeEntry,
  ensureDirectoryTree,
  recoverJournal,
  removeEntry,
  restoreFullBackup,
  snapshotState,
} from "./recovery.mjs";

const INSTALLER_VERSION = "1.0.0";
const DEFAULT_SCENARIO_VERSION = "1.0.0";
const BASE_EVIDENCE = Object.freeze([
  ["E1", "overlay-contract-v1"],
  ["E2", "materialize-v1"],
  ["E3", "portable-core-v1"],
  ["E4", "installer-transaction-v1"],
]);
const NATIVE_EVIDENCE = new Set(["E5", "E6"]);
const RELEASE_POLICIES = Object.freeze({
  "offline-provisional": Object.freeze({ id: "offline-provisional", allowProvisionalPackaging: true, requireFailClosed: false }),
  strict: Object.freeze({ id: "strict", allowProvisionalPackaging: false, requireFailClosed: true }),
});

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function now() {
  return new Date().toISOString();
}

function selectedReleasePolicy(options = {}) {
  const requested = options.releasePolicy ?? options.supportPolicy ?? "offline-provisional";
  if (typeof requested === "string") {
    const alias = requested === "provisional-packaging" ? "offline-provisional" : requested;
    const policy = RELEASE_POLICIES[alias];
    if (!policy) throwDistributionError("E_EVIDENCE_POLICY", `unsupported release policy: ${requested}`, { policy: requested });
    return policy;
  }
  if (!requested || typeof requested !== "object" || Array.isArray(requested)) {
    throwDistributionError("E_EVIDENCE_POLICY", "release policy must be a supported policy name", { policy: requested });
  }
  const id = requested.id ?? "offline-provisional";
  const base = RELEASE_POLICIES[id];
  if (!base) throwDistributionError("E_EVIDENCE_POLICY", `unsupported release policy: ${id}`, { policy: id });
  return Object.freeze({
    id,
    allowProvisionalPackaging: requested.allowProvisionalPackaging ?? base.allowProvisionalPackaging,
    requireFailClosed: requested.requireFailClosed ?? base.requireFailClosed,
  });
}

function provenanceHashes(provenance) {
  return {
    source_hash: provenance.sourceHash,
    overlay_hash: provenance.overlayHash,
    materialized_hash: provenance.materializedHash,
    provenance_hash: provenance.provenanceHash,
  };
}

function evidenceBinding(provenance, scenarioVersion) {
  return {
    source_commit: provenance.resolvedCommit,
    source_version: provenance.sourceVersion,
    overlay_version: provenance.overlayVersion,
    scenario_version: scenarioVersion,
    ...provenanceHashes(provenance),
  };
}

function nativeEvidenceInput(options = {}) {
  const supplied = options.evidenceRecords ?? options.nativeEvidence ?? options.evidence ?? options.hostProbe?.records ?? [];
  if (supplied === null || supplied === undefined) return [];
  if (!Array.isArray(supplied)) throwDistributionError("E_EVIDENCE_SCHEMA", "native evidence must be an array", { field: "evidenceRecords" });
  return supplied;
}

function createValidatedPortableEvidence({ target, materialized, attestation, portableCoreHash, options, timestamp }) {
  const validation = materialized.validation ?? {};
  const checks = Object.entries(validation);
  if (!validation.inventory?.ok || checks.length === 0 || checks.some(([, result]) => result?.ok !== true)) {
    throwDistributionError("E_EVIDENCE_POLICY", "installer evidence requires successful materialization assertions", {
      target,
      checks: checks.map(([name, result]) => ({ name, ok: result?.ok === true })),
    });
  }
  const provenance = evidenceBinding(materialized.provenance, options.scenarioVersion ?? DEFAULT_SCENARIO_VERSION);
  const e1 = createEvidenceRecord({
    target,
    capability: "E1",
    hostVersion: materialized.provenance.hostVersion,
    scenario: "overlay-contract-v1",
    result: "passed",
    provenance,
    timestamp,
  });
  const e2 = createEvidenceRecord({
    target,
    capability: "E2",
    hostVersion: materialized.provenance.hostVersion,
    scenario: "materialize-v1",
    result: "passed",
    provenance,
    timestamp,
  });
  const e3 = consumeE3Attestation({
    attestation,
    target,
    hostVersion: materialized.provenance.hostVersion,
    provenance: {
      ...materialized.provenance,
      scenarioVersion: options.scenarioVersion ?? DEFAULT_SCENARIO_VERSION,
      portableCoreTreeHash: portableCoreHash,
      artifactDigest: portableCoreHash,
    },
    now: timestamp,
    requireArtifactDigest: true,
  });
  return [e1, e2, e3];
}

function collectCandidateEvidence({ target, provenance, options, timestamp, records }) {
  const scenarioVersion = options.scenarioVersion ?? DEFAULT_SCENARIO_VERSION;
  const binding = evidenceBinding(provenance, scenarioVersion);
  const base = records.map((record) => validateEvidenceRecord(record));
  const baseByCapability = new Map(base.map((record) => [record.capability, record]));
  const native = [];
  for (const record of nativeEvidenceInput(options)) {
    const validated = validateEvidenceRecord(record);
    if (validated.target !== target) {
      throwDistributionError("E_EVIDENCE_SCHEMA", "native evidence target does not match the transaction target", { target, actual: validated.target });
    }
    const normalized = normalizeEvidenceProvenance(validated.provenance, binding);
    for (const field of ["source_commit", "source_version", "overlay_version", "scenario_version", ...Object.keys(provenanceHashes(provenance))]) {
      if (normalized[field] !== binding[field]) {
        throwDistributionError("E_PROVENANCE_HASH", `native evidence provenance does not match the candidate: ${field}`, { field });
      }
    }
    if (baseByCapability.has(validated.capability)) {
      const expected = baseByCapability.get(validated.capability);
      if (validated.result !== "passed" || validated.host_version !== expected.host_version || validated.scenario !== expected.scenario) {
        throwDistributionError("E_EVIDENCE_SCHEMA", `installer-owned evidence ${validated.capability} does not match the validated transaction`, { capability: validated.capability });
      }
      continue;
    }
    if (!NATIVE_EVIDENCE.has(validated.capability)) {
      throwDistributionError("E_EVIDENCE_SCHEMA", "installer accepts only E1-E6 evidence capabilities", { capability: validated.capability });
    }
    if (validated.host_version !== provenance.hostVersion) {
      throwDistributionError("E_EVIDENCE_SCHEMA", `native evidence host version does not match the transaction: ${validated.capability}`, { capability: validated.capability });
    }
    native.push(validateEvidenceRecord({ ...validated, provenance: normalized }));
  }
  return collectEvidence({
    target,
    records: [...base, ...native],
    hostVersion: provenance.hostVersion,
    provenance: binding,
    timestamp,
    scenarioVersion,
    unavailableReason: options.unavailableEvidenceReason ?? "runtime-or-scenario-unavailable",
  });
}

function evaluateCandidateCompatibility({ target, overlay, records, provenance, options, installedAt }) {
  const scenarioVersion = options.scenarioVersion ?? DEFAULT_SCENARIO_VERSION;
  const policy = selectedReleasePolicy(options);
  const evaluations = evaluateTarget({
    target,
    records,
    capabilities: overlay.capabilities,
    now: installedAt,
    hostVersion: provenance.hostVersion,
    overlayVersion: provenance.overlayVersion,
    sourceCommit: provenance.resolvedCommit,
    scenarioVersion,
  });
  const baseline = records.filter((record) => BASE_EVIDENCE.some(([level]) => level === record.capability));
  if (baseline.length !== BASE_EVIDENCE.length || baseline.some((record) => record.result !== "passed")) {
    throwDistributionError("E_EVIDENCE_POLICY", "portable baseline evidence E1-E4 must pass before installation", {
      target,
      baseline: baseline.map((record) => ({ capability: record.capability, result: record.result })),
      policy: policy.id,
    });
  }
  const failClosed = evaluations.filter((evaluation) => FAIL_CLOSED_CLASSES.includes(evaluation.capabilityClass));
  const failedClosed = failClosed.filter((evaluation) => evaluation.status !== "passed");
  const unavailableOnly = failedClosed.every((evaluation) => (
    evaluation.status === "blocked"
    && evaluation.unavailable.length > 0
    && evaluation.failed.length === 0
    && evaluation.missing.length === 0
    && evaluation.expired.length === 0
  ));
  if (failedClosed.length > 0 && (!unavailableOnly || policy.requireFailClosed)) {
    throwDistributionError("E_EVIDENCE_POLICY", "required semantic, safety, persistence, or rollback evidence is not satisfied", {
      target,
      policy: policy.id,
      evaluations: failedClosed,
    });
  }
  const provisional = evaluations.some((evaluation) => evaluation.status === "provisional");
  if (provisional && !policy.allowProvisionalPackaging) {
    throwDistributionError("E_EVIDENCE_POLICY", "provisional packaging is not permitted by the release policy", {
      target,
      policy: policy.id,
      evaluations,
    });
  }
  const status = evaluations.every((evaluation) => evaluation.status === "passed")
    ? "supported"
    : failedClosed.length > 0 || provisional ? "provisional" : "blocked";
  return {
    policy: policy.id,
    scenario_version: scenarioVersion,
    status,
    evaluations,
  };
}

function flushDirectory(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(error.code)) throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function ensureDirectories(paths) {
  assertSafePath(paths.home, { root: path.dirname(paths.home), label: "home", allowMissing: false });
  const homeStat = fs.lstatSync(paths.home);
  if (!homeStat.isDirectory()) throwDistributionError("E_PATH_SECURITY", "home must be a directory", { home: paths.home });
  ensureDirectoryTree(path.dirname(paths.activeRoot), { root: paths.home, label: "target parent", mode: 0o755 });
  const stateBase = path.dirname(path.dirname(paths.stateRoot));
  ensureDirectoryTree(stateBase, { root: path.dirname(stateBase), label: "state base", mode: 0o755 });
  ensureDirectoryTree(paths.stateRoot, { root: stateBase, label: "state root", mode: 0o700, privateMode: true });
  for (const directory of [paths.journalsRoot, paths.receiptsRoot, paths.backupsRoot, paths.stagingRoot]) {
    ensureDirectoryTree(directory, { root: paths.stateRoot, label: "private state directory", mode: 0o700, privateMode: true });
  }
  for (const filePath of [paths.activeReceiptPath, paths.lockPath]) assertSafePath(filePath, { root: paths.stateRoot, label: "state file" });
  assertSafePath(paths.activeRoot, { root: paths.home, label: "target root" });
}

function durableJson(filePath, value, mode = 0o600, { root = null } = {}) {
  const parent = path.dirname(filePath);
  const permittedRoot = root ?? path.dirname(parent);
  if (root) assertSafePath(filePath, { root, label: "durable state path" });
  else assertSafePath(filePath, { root: parent, label: "durable state path" });
  ensureDirectoryTree(parent, { root: root ?? path.dirname(parent), label: "durable state parent", mode: 0o700, privateMode: Boolean(root) });
  const parentIdentity = capturePathIdentity(parent, {
    root: root ?? path.dirname(parent),
    label: "durable state parent",
    allowMissing: false,
    errorCode: "E_PATH_SECURITY",
  });
  assertPathIdentity(parentIdentity, { label: "durable state parent", errorCode: "E_PATH_SECURITY" });
  const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
  assertSafePath(temporary, { root: permittedRoot, label: "durable temporary path" });
  const descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, mode);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fchmodSync(descriptor, mode);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    const temporaryIdentity = capturePathIdentity(temporary, {
      root: permittedRoot,
      label: "durable temporary path",
      allowMissing: false,
      errorCode: "E_PATH_SECURITY",
    });
    assertPathIdentity(parentIdentity, { label: "durable state parent", errorCode: "E_PATH_SECURITY" });
    assertPathIdentity(temporaryIdentity, { label: "durable temporary path", errorCode: "E_PATH_SECURITY" });
    fs.renameSync(temporary, filePath);
    assertPathIdentity(parentIdentity, { label: "durable state parent", errorCode: "E_PATH_SECURITY" });
    const destinationIdentity = capturePathIdentity(filePath, {
      root: permittedRoot,
      label: "durable state path",
      allowMissing: false,
      errorCode: "E_PATH_SECURITY",
    });
    assertPathIdentity(destinationIdentity, { label: "durable state path", errorCode: "E_PATH_SECURITY" });
    flushDirectory(parent);
  } catch (error) {
    try {
      assertPathIdentity(parentIdentity, { label: "durable state parent", errorCode: "E_PATH_SECURITY" });
      removeEntry(temporary, { root: permittedRoot, label: "durable temporary path" });
    } catch { /* preserve residue when the destination parent is no longer trusted */ }
    throw error;
  }
}

function readStableFile(filePath, { root, label }) {
  assertSafePath(filePath, { root, label, allowMissing: false });
  const parentIdentity = capturePathIdentity(path.dirname(filePath), {
    root,
    label: `${label} parent`,
    allowMissing: false,
    errorCode: "E_PATH_SECURITY",
  });
  const fileIdentity = capturePathIdentity(filePath, {
    root,
    label,
    allowMissing: false,
    errorCode: "E_PATH_SECURITY",
  });
  assertPathIdentity(parentIdentity, { label: `${label} parent`, errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(fileIdentity, { label, errorCode: "E_PATH_SECURITY" });
  const bytes = readFileNoFollow(filePath, {
    root,
    label,
    encoding: "utf8",
    beforeOpen: () => {
      assertPathIdentity(parentIdentity, { label: `${label} parent`, errorCode: "E_PATH_SECURITY" });
      assertPathIdentity(fileIdentity, { label, errorCode: "E_PATH_SECURITY" });
    },
    errorCode: "E_PATH_SECURITY",
  });
  assertPathIdentity(parentIdentity, { label: `${label} parent`, errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(fileIdentity, { label, errorCode: "E_PATH_SECURITY" });
  return bytes;
}

function acquireLock(lockPath) {
  assertSafePath(lockPath, { root: path.dirname(lockPath), label: "lock path" });
  const lockParent = path.dirname(lockPath);
  const lockParentIdentity = capturePathIdentity(lockParent, { root: path.dirname(lockParent), label: "lock parent", allowMissing: false, errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(lockParentIdentity, { label: "lock parent", errorCode: "E_PATH_SECURITY" });
  const existing = fs.lstatSync(lockPath, { throwIfNoEntry: false });
  if (existing) throwDistributionError("E_LOCK_BUSY", "target installation lock is held", { lockPath }, { retryable: true });
  try {
    assertPathIdentity(lockParentIdentity, { label: "lock parent", errorCode: "E_PATH_SECURITY" });
    const descriptor = fs.openSync(lockPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
    try {
      fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, acquired_at: now() })}\n`, "utf8");
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    assertPathIdentity(lockParentIdentity, { label: "lock parent", errorCode: "E_PATH_SECURITY" });
    const lockIdentity = capturePathIdentity(lockPath, {
      root: lockParent,
      label: "lock path",
      allowMissing: false,
      errorCode: "E_PATH_SECURITY",
    });
    assertPathIdentity(lockIdentity, { label: "lock path", errorCode: "E_PATH_SECURITY" });
    flushDirectory(path.dirname(lockPath));
    return { lockPath };
  } catch (error) {
    if (error.code === "EEXIST" || error.code === "EISDIR") throwDistributionError("E_LOCK_BUSY", "target installation lock is held", { lockPath }, { retryable: true });
    throwDistributionError("E_LOCK_IO", `could not acquire target lock: ${error.message}`, { lockPath }, { cause: error });
  }
}

function releaseLock(lock) {
  try { removeEntry(lock.lockPath, { root: path.dirname(lock.lockPath), label: "lock path" }); } catch { /* cleanup is best effort after a completed transaction */ }
}

function readReceiptSafely(filePath, paths) {
  assertSafePath(filePath, { root: paths.receiptsRoot, label: "receipt path", allowMissing: false });
  const parentIdentity = capturePathIdentity(path.dirname(filePath), {
    root: paths.receiptsRoot,
    label: "receipt parent",
    allowMissing: false,
    errorCode: "E_PATH_SECURITY",
  });
  const receiptIdentity = capturePathIdentity(filePath, {
    root: paths.receiptsRoot,
    label: "receipt path",
    allowMissing: false,
    errorCode: "E_PATH_SECURITY",
  });
  assertPathIdentity(parentIdentity, { label: "receipt parent", errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(receiptIdentity, { label: "receipt path", errorCode: "E_PATH_SECURITY" });
  const receipt = readReceipt(filePath, {
    paths,
    beforeRead: () => {
      assertPathIdentity(parentIdentity, { label: "receipt parent", errorCode: "E_PATH_SECURITY" });
      assertPathIdentity(receiptIdentity, { label: "receipt path", errorCode: "E_PATH_SECURITY" });
    },
  });
  assertPathIdentity(parentIdentity, { label: "receipt parent", errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(receiptIdentity, { label: "receipt path", errorCode: "E_PATH_SECURITY" });
  return receipt;
}

function readActive(paths) {
  assertSafePath(paths.activeReceiptPath, { root: paths.stateRoot, label: "active receipt" });
  const activeParentIdentity = capturePathIdentity(path.dirname(paths.activeReceiptPath), { root: paths.stateRoot, label: "active receipt parent", allowMissing: false, errorCode: "E_PATH_SECURITY" });
  const activeStat = fs.lstatSync(paths.activeReceiptPath, { throwIfNoEntry: false });
  if (!activeStat) return null;
  if (!activeStat.isFile()) throwDistributionError("E_RECEIPT_IO", "active receipt pointer must be a regular file", { path: paths.activeReceiptPath });
  const activeIdentity = capturePathIdentity(paths.activeReceiptPath, { root: paths.stateRoot, label: "active receipt", allowMissing: false, errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(activeParentIdentity, { label: "active receipt parent", errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(activeIdentity, { label: "active receipt", errorCode: "E_PATH_SECURITY" });
  try {
    const pointer = JSON.parse(readStableFile(paths.activeReceiptPath, { root: paths.stateRoot, label: "active receipt" }));
    if (!pointer || typeof pointer !== "object" || Array.isArray(pointer)) throw new Error("invalid active receipt pointer");
    const keys = Object.keys(pointer);
    if (keys.length !== 3 || pointer.schema_version !== 1 || typeof pointer.receipt_id !== "string" || typeof pointer.receipt_path !== "string") throw new Error("invalid active receipt pointer");
    if (!UUID.test(pointer.receipt_id)) throw new Error("invalid active receipt id");
    const expectedPath = path.join(paths.receiptsRoot, `${pointer.receipt_id}.json`);
    if (pointer.receipt_path !== expectedPath) throwDistributionError("E_RECEIPT_SCHEMA", "active receipt path is outside the receipts root", { receipt_path: pointer.receipt_path });
    assertSafePath(pointer.receipt_path, { root: paths.receiptsRoot, label: "active receipt target", allowMissing: false });
    assertPathIdentity(activeParentIdentity, { label: "active receipt parent", errorCode: "E_PATH_SECURITY" });
    assertPathIdentity(activeIdentity, { label: "active receipt", errorCode: "E_PATH_SECURITY" });
    return { receipt: readReceiptSafely(pointer.receipt_path, paths), receiptPath: pointer.receipt_path };
  } catch (error) {
    if (error?.kind === "E_RECEIPT_SCHEMA") throw error;
    throw distributionError("E_RECEIPT_IO", "active receipt pointer is invalid", { path: paths.activeReceiptPath }, { cause: error });
  }
}

function readReceiptById(paths, receiptId) {
  if (!receiptId) return null;
  if (typeof receiptId !== "string" || !UUID.test(receiptId)) throwDistributionError("E_RECEIPT_SCHEMA", "receipt id must be a UUID", { receiptId });
  const filePath = path.join(paths.receiptsRoot, `${receiptId}.json`);
  assertSafePath(filePath, { root: paths.receiptsRoot, label: "receipt path", allowMissing: false });
  return { receipt: readReceiptSafely(filePath, paths), receiptPath: filePath };
}

function writeJournal(paths, journal) {
  validateJournal(journal, { paths });
  const journalPath = path.join(paths.journalsRoot, `${journal.journal_id}.json`);
  durableJson(journalPath, journal, 0o600, { root: paths.journalsRoot });
  return journalPath;
}

function transition(paths, journal, state, details = {}) {
  const next = appendTransition(journal, state, details);
  writeJournal(paths, next);
  return next;
}

function failureInjection(options, point) {
  if (options.failurePoint === point) throwDistributionError("E_TX_FAILURE", `injected transaction failure at ${point}`, { point });
}

function sourcePathValue(source) {
  if (typeof source !== "string" || source.trim() === "") return null;
  if (source.startsWith("local:")) return source.slice("local:".length);
  if (source.startsWith("file:")) {
    try { return new URL(source).pathname; } catch { return null; }
  }
  if (source.startsWith("github:")) return null;
  return source;
}

function assertSourceRootBinding(source, options = {}) {
  const boundRoot = ensureDirectoryRoot(path.resolve(source.root), "resolved source root");
  const candidates = [
    ["resolvedSourceRoot", options.resolvedSourceRoot],
    ["source", sourcePathValue(options.source)],
  ];
  for (const [field, candidate] of candidates) {
    if (typeof candidate !== "string" || candidate.trim() === "") continue;
    const candidateRoot = ensureDirectoryRoot(path.resolve(candidate), `${field} root`);
    if (candidateRoot !== boundRoot) {
      throwDistributionError("E_SOURCE_ROOT", `${field} does not match the resolved lifecycle source binding`, {
        field,
        expected: boundRoot,
        actual: candidateRoot,
      });
    }
  }
  return boundRoot;
}

function assertMaterializedSourceBinding(expected, actual) {
  const fields = [
    "kind",
    "root",
    "requestedSource",
    "requestedRef",
    "resolvedCommit",
    "sourceVersion",
    "contentHash",
    "dirty",
    "statusFingerprint",
  ];
  for (const field of fields) {
    const expectedValue = field === "root" ? fs.realpathSync(expected[field]) : expected[field] ?? null;
    const actualValue = field === "root" ? fs.realpathSync(actual[field]) : actual[field] ?? null;
    if (expectedValue !== actualValue) {
      throwDistributionError("E_SOURCE_BINDING", "materialized source does not match the lifecycle source binding", {
        field,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  }
}

function candidateOverlay(source, target, overlayRoot, { resolvedSourceRoot = null, sourceBound = false } = {}) {
  const sourceCandidates = [];
  const sourceCandidate = resolvedSourceRoot ?? sourcePathValue(source);
  if (sourceCandidate) {
    const sourceAbsolute = sourceBound
      ? ensureDirectoryRoot(path.resolve(sourceCandidate), "resolved source root")
      : path.resolve(sourceCandidate);
    sourceCandidates.push(
      path.join(sourceAbsolute, "plugins/maister/overlays", target),
      path.join(sourceAbsolute, "overlays", target),
      sourceAbsolute,
    );
  }
  const candidates = sourceBound ? sourceCandidates : [...sourceCandidates, path.join(overlayRoot ?? "", target)];
  if (sourceBound && candidates.length === 0) {
    throwDistributionError("E_SOURCE_ROOT", "install/update requires an overlay from the resolved source root", {
      target,
      source: source ?? null,
    });
  }
  const selected = candidates.find((directory) => fs.existsSync(path.join(directory, "overlay.yml")) && fs.existsSync(path.join(directory, "inventory.yml")));
  if (!selected) throwDistributionError("E_OVERLAY_IO", `overlay is not available for ${target}`, { target, candidates });
  if (sourceBound) {
    const sourceRoot = ensureDirectoryRoot(path.resolve(sourceCandidate), "resolved source root");
    for (const candidate of [selected, path.join(selected, "overlay.yml"), path.join(selected, "inventory.yml")]) {
      capturePathIdentity(candidate, {
        root: sourceRoot,
        label: "source-bound overlay path",
        allowMissing: false,
        errorCode: "E_PATH_SECURITY",
      });
    }
  }
  return { overlayPath: path.join(selected, "overlay.yml"), inventoryPath: path.join(selected, "inventory.yml"), overlayBase: selected };
}

function ownershipFor(plan, relative) {
  return plan.find((entry) => entry.destination === relative)?.ownership ?? "whole_file";
}

function receiptInventory(stagingRoot, plan) {
  return hashTree(stagingRoot).entries.map((entry) => ({
    path: entry.path,
    type: entry.type,
    mode: entry.mode,
    sha256: entry.type === "file" ? entry.sha256 : null,
    link_target: entry.type === "symlink" ? entry.target : null,
    ownership: ownershipFor(plan, entry.path),
  }));
}

function removeManagedPath(root, relative, type) {
  const absolute = path.resolve(root, ...relative.split("/"));
  assertSafePath(absolute, { root, label: "managed target path" });
  const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stat) return;
  if (type === "directory") {
    const parent = path.dirname(absolute);
    const parentIdentity = capturePathIdentity(parent, { root, label: "managed target parent", allowMissing: false, errorCode: "E_PATH_SECURITY" });
    const targetIdentity = capturePathIdentity(absolute, { root, label: "managed target path", allowMissing: false, errorCode: "E_PATH_SECURITY" });
    assertPathIdentity(parentIdentity, { label: "managed target parent", errorCode: "E_PATH_SECURITY" });
    assertPathIdentity(targetIdentity, { label: "managed target path", errorCode: "E_PATH_SECURITY" });
    try { fs.rmdirSync(absolute); } catch (error) { if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
    assertPathIdentity(parentIdentity, { label: "managed target parent", errorCode: "E_PATH_SECURITY" });
  } else removeEntry(absolute, { root, label: "managed target path", allowLeafSymlink: true });
}

function validateReceiptPaths(receipt, paths) {
  assertSafePath(paths.activeRoot, { root: paths.home, label: "active target" });
  for (const entry of receipt.managed_inventory) assertSafePath(path.resolve(paths.activeRoot, ...entry.path.split("/")), { root: paths.activeRoot, label: "managed receipt path", allowLeafSymlink: true });
  for (const setting of receipt.settings) assertSafePath(path.resolve(paths.home, ...setting.path.split("/")), { root: paths.home, label: "settings receipt path" });
}

function commitTree({ stagingRoot, activeRoot, candidateInventory, previousReceipt, failurePoint }) {
  const parent = path.dirname(activeRoot);
  assertSafePath(activeRoot, { root: parent, label: "active target" });
  const parentIdentity = capturePathIdentity(parent, { root: path.dirname(parent), label: "active target parent", allowMissing: false, errorCode: "E_PATH_SECURITY" });
  const activeIdentity = capturePathIdentity(activeRoot, { root: parent, label: "active target", allowMissing: true, errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(parentIdentity, { label: "active target parent", errorCode: "E_PATH_SECURITY" });
  assertPathIdentity(activeIdentity, { label: "active target", errorCode: "E_PATH_SECURITY" });
  const replacement = path.join(parent, `.maister-replacement-${crypto.randomUUID()}`);
  const displaced = path.join(parent, `.maister-displaced-${crypto.randomUUID()}`);
  assertSafePath(replacement, { root: parent, label: "replacement target" });
  ensureDirectoryTree(replacement, { root: parent, label: "replacement target", mode: 0o700 });
  try {
    const activeStat = fs.lstatSync(activeRoot, { throwIfNoEntry: false });
    if (activeStat) copyTreeEntry(activeRoot, replacement, { sourceRoot: activeRoot, destinationRoot: parent });
    const next = new Set(candidateInventory.map((entry) => entry.path));
    if (previousReceipt) {
      for (const entry of [...previousReceipt.managed_inventory].sort((left, right) => right.path.length - left.path.length)) {
        if (!next.has(entry.path)) removeManagedPath(replacement, entry.path, entry.type);
      }
    }
    let operations = 0;
    for (const entry of candidateInventory.filter((value) => value.type === "directory")) {
      copyTreeEntry(path.join(stagingRoot, ...entry.path.split("/")), path.join(replacement, ...entry.path.split("/")), { sourceRoot: stagingRoot, destinationRoot: replacement });
    }
    for (const entry of candidateInventory.filter((value) => value.type !== "directory")) {
      copyTreeEntry(path.join(stagingRoot, ...entry.path.split("/")), path.join(replacement, ...entry.path.split("/")), { sourceRoot: stagingRoot, destinationRoot: replacement });
      operations += 1;
      if (failurePoint === "during-commit" && operations === 1) failureInjection({ failurePoint }, "during-commit");
    }
    flushDirectory(replacement);
    assertPathIdentity(parentIdentity, { label: "active target parent", errorCode: "E_PATH_SECURITY" });
    assertPathIdentity(activeIdentity, { label: "active target", errorCode: "E_PATH_SECURITY" });
    if (activeStat) {
      fs.renameSync(activeRoot, displaced);
      assertPathIdentity(parentIdentity, { label: "active target parent", errorCode: "E_PATH_SECURITY" });
      try {
        fs.renameSync(replacement, activeRoot);
      } catch (error) {
        fs.renameSync(displaced, activeRoot);
        throw error;
      }
      flushDirectory(parent);
      removeEntry(displaced, { root: parent, label: "displaced target" });
      flushDirectory(parent);
    } else {
      fs.renameSync(replacement, activeRoot);
      assertPathIdentity(parentIdentity, { label: "active target parent", errorCode: "E_PATH_SECURITY" });
      flushDirectory(parent);
    }
  } catch (error) {
    removeEntry(replacement, { root: parent, label: "replacement target" });
    throw error;
  }
}

function commitSettings(settings, paths, failurePoint) {
  let operations = 0;
  for (const setting of settings) {
    const parent = path.dirname(setting.targetPath);
    ensureDirectoryTree(parent, { root: paths.home, label: "settings parent", mode: 0o755 });
    assertSafePath(setting.targetPath, { root: paths.home, label: "settings target" });
    atomicWriteSetting(setting.targetPath, setting.bytes, setting.mode ?? "0600");
    operations += 1;
    if (failurePoint === "during-commit" && operations === 1) failureInjection({ failurePoint }, "during-commit");
  }
}

function validateSettingPaths(overlay, paths) {
  for (const definition of overlay.settings) {
    const targetPath = path.resolve(paths.home, ...definition.path.split("/"));
    assertSafePath(targetPath, { root: paths.home, label: "settings target" });
    assertSafePath(path.dirname(targetPath), { root: paths.home, label: "settings parent" });
  }
}

function prepareSettings({ overlay, paths, target, activeRoot, stagingRoot }) {
  validateSettingPaths(overlay, paths);
  return overlay.settings.map((definition) => prepareSetting({
    definition,
    targetPath: path.resolve(paths.home, ...definition.path.split("/")),
    target,
    activeRoot,
    stagedPath: path.join(stagingRoot, ...definition.path.split("/")),
  }));
}

function settingsReceipt(settings, backupRoot) {
  return settings.map((setting, index) => ({
    path: setting.path,
    format: setting.format,
    ownership: setting.ownership,
    managed_keys: setting.managed_keys,
    before_sha256: setting.beforeSha256,
    after_sha256: setting.afterSha256,
    backup_ref: path.relative(backupRoot, path.join(backupRoot, "settings", String(index))),
    mode: setting.mode,
    before_mode: setting.beforeMode,
  }));
}

function verifyReceipt(receiptState, paths, overlay) {
  const conflicts = [];
  for (const entry of receiptState.managed_inventory) {
    const absolute = path.resolve(paths.activeRoot, ...entry.path.split("/"));
    assertSafePath(absolute, { root: paths.activeRoot, label: "managed receipt path", allowLeafSymlink: true });
    const actual = describe(paths.activeRoot, entry.path);
    if (!actual.exists || actual.type !== entry.type || actual.mode !== entry.mode || (entry.type === "file" && actual.sha256 !== entry.sha256) || (entry.type === "symlink" && actual.linkTarget !== entry.link_target)) conflicts.push(entry.path);
  }
  for (const setting of receiptState.settings) {
    const targetPath = path.resolve(paths.home, ...setting.path.split("/"));
    assertSafePath(targetPath, { root: paths.home, label: "settings receipt path" });
    const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
    if (!stat || stat.isSymbolicLink() || !stat.isFile() || (setting.ownership === "whole_file" && hashFile(targetPath) !== setting.after_sha256) || formatMode(stat.mode) !== setting.mode) conflicts.push(setting.path);
  }
  if (conflicts.length > 0) throwDistributionError("E_INTEGRITY", "post-commit integrity verification failed", { conflicts });
  if (overlay.target.id !== receiptState.target.id) throwDistributionError("E_INTEGRITY", "receipt target does not match overlay", {});
}

function newJournal({ command, paths, journalId, stageRoot, previousReceipt, candidateReceipt = null }) {
  const started = now();
  return {
    schema_version: 1,
    journal_id: journalId,
    command,
    target: paths.target,
    started_at: started,
    updated_at: started,
    state: "prepared",
    state_history: [{ state: "prepared", timestamp: started }],
    stage_root: stageRoot,
    destination_root: paths.activeRoot,
    previous_receipt: previousReceipt?.receiptPath ?? null,
    candidate_receipt: candidateReceipt,
    lock: { path: paths.lockPath },
    steps: [],
    failure: null,
  };
}

function failedJournal(paths, journal, state, failure) {
  const steps = state === "recovered" && !journal.steps.some((step) => step.name === "recovery" && step.status === "completed")
    ? [...journal.steps, { name: "recovery", status: "completed", timestamp: now(), before_ref: failure.details?.backup_root ?? null, after_hash: null }]
    : journal.steps;
  const next = appendTransition(journal, state, {
    steps,
    failure: { kind: failure.kind, details: failure.details ?? {}, retryable: Boolean(failure.retryable) },
  });
  try { writeJournal(paths, next); } catch (journalError) {
    failure.details = { ...(failure.details ?? {}), journal_write_error: journalError.message };
  }
  return next;
}

async function installOrUpdate(command, options, paths) {
  const active = readActive(paths);
  const previousReceipt = active?.receipt ?? null;
  const overlayFiles = candidateOverlay(options.source, paths.target, options.overlayRoot, {
    resolvedSourceRoot: options.resolvedSourceRoot,
    sourceBound: true,
  });
  const overlay = loadOverlay(overlayFiles).overlay;
  validateSettingPaths(overlay, paths);
  if (command === "install" && previousReceipt?.status === "installed") throwDistributionError("E_DRIFT_CONFLICT", "target is already installed; use update", { target: paths.target });
  if (previousReceipt?.status === "installed") { validateReceiptPaths(previousReceipt, paths); assertNoDrift({ receipt: previousReceipt, activeRoot: paths.activeRoot, settingsRoot: paths.home, settingDefinitions: overlay.settings }); }
  const e3Attestation = requireE3Attestation(options.e3Attestation, { now: now() });
  const sourceRoot = options.resolvedSource.root;
  const portableCoreHashBeforeMaterialize = options.portableCoreHash ?? portableCoreTreeHash(sourceRoot);
  const journalId = crypto.randomUUID();
  const stageRoot = path.join(paths.stagingRoot, journalId);
  ensureDirectoryTree(stageRoot, { root: paths.stagingRoot, label: "staging root", mode: 0o700, privateMode: true });
  let journal = newJournal({ command, paths, journalId, stageRoot, previousReceipt: active });
  const journalPath = writeJournal(paths, journal);
  let backupRoot;
  let backupManifestHash = null;
  let settings = [];
  try {
    const materialized = await materialize({
      source: options.source, target: paths.target, overlayPath: overlayFiles.overlayPath, inventoryPath: overlayFiles.inventoryPath,
      overlayBase: overlayFiles.overlayBase, stagingRoot: stageRoot, ref: options.ref, git: options.git, github: options.github,
      sourceVersion: options.sourceVersion, hostVersion: options.hostVersion, allowDirtyLocal: options.allowDirtyLocal,
      resolvedSource: options.resolvedSource,
    });
    assertMaterializedSourceBinding(options.resolvedSource, materialized.sourceBinding);
    const portableCoreHash = portableCoreTreeHash(sourceRoot);
    if (portableCoreHash !== portableCoreHashBeforeMaterialize) {
      throwDistributionError("E_SOURCE_CONTENT_HASH", "portable-core bytes changed during lifecycle execution", {
        sourceRoot,
        before: portableCoreHashBeforeMaterialize,
        after: portableCoreHash,
      });
    }
    assertSafePath(stageRoot, { root: paths.stagingRoot, label: "staging root", allowMissing: false });
    journal = transition(paths, journal, "staged", { steps: [...journal.steps, { name: "materialize", status: "completed", timestamp: now(), before_ref: null, after_hash: materialized.contentHash }] });
    const candidateInventory = receiptInventory(stageRoot, materialized.plan);
    settings = prepareSettings({ overlay, paths, target: paths.target, activeRoot: paths.activeRoot, stagingRoot: stageRoot });
    if (!previousReceipt) {
      for (const entry of candidateInventory.filter((value) => value.type !== "directory")) {
        const actualPath = path.resolve(paths.activeRoot, ...entry.path.split("/"));
        assertSafePath(actualPath, { root: paths.activeRoot, label: "initial managed path" });
        const actual = describe(paths.activeRoot, entry.path);
        if (actual.exists && (actual.type !== entry.type || (entry.type === "file" && actual.sha256 !== entry.sha256) || (entry.type === "symlink" && actual.linkTarget !== entry.link_target))) throwDistributionError("E_DRIFT_CONFLICT", `existing user content conflicts with managed path: ${entry.path}`, { path: entry.path });
      }
      for (const definition of overlay.settings) {
        if (definition.ownership === "whole_file") {
          const targetPath = path.resolve(paths.home, ...definition.path.split("/"));
          const stagedPath = path.join(stageRoot, ...definition.path.split("/"));
          const targetStat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
          if (targetStat && !targetStat.isSymbolicLink() && fs.existsSync(stagedPath) && hashFile(targetPath) !== hashFile(stagedPath)) throwDistributionError("E_DRIFT_CONFLICT", `existing user settings conflict with ${definition.path}`, { path: definition.path });
        }
      }
    }
    journal = transition(paths, journal, "snapshotted", { steps: [...journal.steps, { name: "stage-validated", status: "completed", timestamp: now(), before_ref: null, after_hash: materialized.contentHash }] });
    backupRoot = path.join(paths.backupsRoot, journalId);
    const backupManifest = snapshotState({ activeRoot: paths.activeRoot, settings, backupRoot, activeReceiptPath: paths.activeReceiptPath });
    backupManifestHash = backupManifest.manifest_hash;
    const portableEvidence = createValidatedPortableEvidence({
      target: paths.target,
      materialized,
      attestation: e3Attestation,
      portableCoreHash,
      options,
      timestamp: now(),
    });
    journal = transition(paths, journal, "snapshotted", { steps: [...journal.steps, { name: "snapshot", status: "completed", timestamp: now(), before_ref: backupRoot, after_hash: null }] });
    failureInjection(options, "after-snapshot");
    journal = transition(paths, journal, "committing");
    commitTree({ stagingRoot: stageRoot, activeRoot: paths.activeRoot, candidateInventory, previousReceipt, failurePoint: options.failurePoint });
    failureInjection(options, "after-tree-swap");
    commitSettings(settings, paths, options.failurePoint);
    journal = transition(paths, journal, "committed", { steps: [...journal.steps, { name: "commit", status: "completed", timestamp: now(), before_ref: backupRoot, after_hash: hashTree(paths.activeRoot).contentHash }] });
    const receiptState = {
      target: { id: paths.target },
      managed_inventory: candidateInventory,
      settings: settingsReceipt(settings, backupRoot),
    };
    verifyReceipt(receiptState, paths, overlay);
    const integrityHash = hashTree(paths.activeRoot).contentHash;
    const integrityTimestamp = now();
    failureInjection(options, "after-integrity");
    const e4Timestamp = now();
    const e4 = createEvidenceRecord({
      target: paths.target,
      capability: "E4",
      hostVersion: materialized.provenance.hostVersion,
      scenario: "installer-transaction-v1",
      result: "passed",
      provenance: evidenceBinding(materialized.provenance, options.scenarioVersion ?? DEFAULT_SCENARIO_VERSION),
      timestamp: e4Timestamp,
    });
    const evidence = collectCandidateEvidence({
      target: paths.target,
      provenance: materialized.provenance,
      options,
      timestamp: e4Timestamp,
      records: [...portableEvidence, e4],
    });
    const compatibility = evaluateCandidateCompatibility({ target: paths.target, overlay, records: evidence, provenance: materialized.provenance, options, installedAt: e4Timestamp });
    const targetDefinition = getTargetDefinition(paths.target);
    if (!targetDefinition) throwDistributionError("E_TARGET_SCHEMA", `unsupported target: ${paths.target}`, { target: paths.target });
    const candidateReceipt = validateReceipt({
      schema_version: 1,
      receipt_id: journalId,
      installer_version: INSTALLER_VERSION,
      status: "installed",
      installed_at: e4Timestamp,
      target: { id: paths.target, overlay_id: targetDefinition.overlayId, overlay_version: materialized.provenance.overlayVersion, host_version: materialized.provenance.hostVersion },
      source: { kind: materialized.provenance.sourceKind, requested: materialized.provenance.requestedSource, requested_ref: materialized.provenance.requestedRef, resolved_commit: materialized.provenance.resolvedCommit, source_version: materialized.provenance.sourceVersion, content_hash: materialized.provenance.sourceHash },
      active_root: paths.activeRoot,
      managed_inventory: candidateInventory,
      settings: receiptState.settings,
      provenance: provenanceHashes(materialized.provenance),
      compatibility,
      evidence,
      transaction: { journal_id: journalId, backup_root: backupRoot, backup_manifest_hash: backupManifestHash, previous_receipt_id: previousReceipt?.receipt_id ?? null },
    }, { paths });
    journal = transition(paths, journal, "verified", { candidate_receipt: candidateReceipt, steps: [...journal.steps, { name: "integrity", status: "completed", timestamp: integrityTimestamp, before_ref: null, after_hash: integrityHash }] });
    failureInjection(options, "after-e4");
    const receiptPath = path.join(paths.receiptsRoot, `${candidateReceipt.receipt_id}.json`);
    durableJson(receiptPath, candidateReceipt, 0o600, { root: paths.receiptsRoot });
    durableJson(paths.activeReceiptPath, { schema_version: 1, receipt_id: candidateReceipt.receipt_id, receipt_path: receiptPath }, 0o600, { root: paths.stateRoot });
    failureInjection(options, "after-receipt");
    journal = transition(paths, journal, "verified", { steps: [...journal.steps, { name: "receipt-published", status: "completed", timestamp: now(), before_ref: null, after_hash: sha256(Buffer.from(JSON.stringify(candidateReceipt))) }] });
    removeEntry(stageRoot, { root: paths.stagingRoot, label: "staging root" });
    return { receipt: candidateReceipt, receiptPath, journalPath };
  } catch (error) {
    let failure = error;
    if (!(failure instanceof DistributionError) && typeof failure?.kind !== "string") failure = distributionError("E_TRANSACTION", failure.message, { journal_id: journalId }, { cause: failure });
    let failureState = "failed";
    const backupManifestPath = backupRoot ? path.join(backupRoot, "manifest.json") : null;
    let backupManifestIdentity = null;
    let backupGuardError = null;
    if (backupManifestPath) {
      try {
        backupManifestIdentity = capturePathIdentity(backupManifestPath, {
          root: backupRoot,
          label: "backup manifest",
          allowMissing: true,
          errorCode: "E_PATH_SECURITY",
        });
      } catch (guardError) {
        backupGuardError = guardError;
      }
    }
    if (backupGuardError) {
      failure = distributionError("E_RECOVERY_FAILURE", "transaction failed and the backup manifest boundary is unsafe", {
        journal_id: journalId,
        backup_root: backupRoot,
      }, { cause: backupGuardError, retryable: true });
      failureState = "rollback_failed";
    } else if (backupManifestIdentity && !backupManifestIdentity.missing) {
      try {
        assertPathIdentity(backupManifestIdentity, { label: "backup manifest", errorCode: "E_PATH_SECURITY" });
        restoreFullBackup(backupRoot, { paths, expectedManifestHash: backupManifestHash ?? journal.candidate_receipt?.transaction?.backup_manifest_hash ?? null });
        if (journal.candidate_receipt === null) failureState = "recovered";
      } catch (restoreError) {
        failure = distributionError("E_RECOVERY_FAILURE", "transaction failed and exact recovery failed", { journal_id: journalId, backup_root: backupRoot }, { cause: restoreError, retryable: true });
        failureState = "rollback_failed";
      }
    }
    try { removeEntry(stageRoot, { root: paths.stagingRoot, label: "staging root" }); } catch { /* journal records the transaction failure */ }
    failure.details = { ...(failure.details ?? {}), journal_path: journalPath, backup_root: backupRoot ?? null };
    failedJournal(paths, journal, failureState, failure);
    throw failure;
  }
}

async function uninstall(options, paths) {
  const active = readActive(paths);
  if (!active || active.receipt.status === "uninstalled") return { receipt: active?.receipt ?? null, receiptPath: active?.receiptPath ?? null, journalPath: null };
  const overlayFiles = candidateOverlay(options.source ?? paths.home, paths.target, options.overlayRoot);
  const overlay = loadOverlay(overlayFiles).overlay;
  validateSettingPaths(overlay, paths);
  if (active.receipt.status === "installed") { validateReceiptPaths(active.receipt, paths); assertNoDrift({ receipt: active.receipt, activeRoot: paths.activeRoot, settingsRoot: paths.home, settingDefinitions: overlay.settings }); }
  const journalId = crypto.randomUUID();
  const stageRoot = path.join(paths.stagingRoot, journalId);
  const backupRoot = path.join(paths.backupsRoot, journalId);
  let journal = newJournal({ command: "uninstall", paths, journalId, stageRoot, previousReceipt: active });
  const journalPath = writeJournal(paths, journal);
  try {
    const settings = overlay.settings.map((definition) => ({ ...definition, targetPath: path.resolve(paths.home, ...definition.path.split("/")) }));
    const backupManifest = snapshotState({ activeRoot: paths.activeRoot, settings, backupRoot, activeReceiptPath: paths.activeReceiptPath });
    journal = transition(paths, journal, "snapshotted", { steps: [{ name: "snapshot", status: "completed", timestamp: now(), before_ref: backupRoot, after_hash: null }] });
    journal = transition(paths, journal, "committing");
    const previous = active.receipt;
    for (const entry of [...previous.managed_inventory].sort((left, right) => right.path.length - left.path.length)) removeManagedPath(paths.activeRoot, entry.path, entry.type);
    for (const definition of settings) {
      assertSafePath(definition.targetPath, { root: paths.home, label: "settings target" });
      if (definition.ownership === "managed_keys") {
        const stat = fs.lstatSync(definition.targetPath, { throwIfNoEntry: false });
        const bytes = removeManagedKeys({ definition, targetPath: definition.targetPath });
        if (bytes && stat) atomicWriteSetting(definition.targetPath, bytes, formatMode(stat.mode));
      } else removeEntry(definition.targetPath, { root: paths.home, label: "settings target" });
    }
    const activeStat = fs.lstatSync(paths.activeRoot, { throwIfNoEntry: false });
    if (activeStat?.isDirectory()) {
      const activeParent = path.dirname(paths.activeRoot);
      const activeParentIdentity = capturePathIdentity(activeParent, { root: paths.home, label: "uninstall target parent", allowMissing: false, errorCode: "E_PATH_SECURITY" });
      const activeIdentity = capturePathIdentity(paths.activeRoot, { root: paths.home, label: "uninstall target", allowMissing: false, errorCode: "E_PATH_SECURITY" });
      assertPathIdentity(activeParentIdentity, { label: "uninstall target parent", errorCode: "E_PATH_SECURITY" });
      assertPathIdentity(activeIdentity, { label: "uninstall target", errorCode: "E_PATH_SECURITY" });
      try { fs.rmdirSync(paths.activeRoot); } catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
      assertPathIdentity(activeParentIdentity, { label: "uninstall target parent", errorCode: "E_PATH_SECURITY" });
      flushDirectory(activeParent);
    }
    const receipt = validateReceipt({ ...previous, receipt_id: journalId, status: "uninstalled", installed_at: now(), managed_inventory: [], settings: [], transaction: { journal_id: journalId, backup_root: backupRoot, backup_manifest_hash: backupManifest.manifest_hash, previous_receipt_id: previous.receipt_id } }, { paths });
    journal = transition(paths, journal, "committed", { candidate_receipt: receipt, steps: [...journal.steps, { name: "uninstall", status: "completed", timestamp: now(), before_ref: previous.receipt_id, after_hash: null }] });
    const receiptPath = path.join(paths.receiptsRoot, `${receipt.receipt_id}.json`);
    durableJson(receiptPath, receipt, 0o600, { root: paths.receiptsRoot });
    durableJson(paths.activeReceiptPath, { schema_version: 1, receipt_id: receipt.receipt_id, receipt_path: receiptPath }, 0o600, { root: paths.stateRoot });
    journal = transition(paths, journal, "rolled_back", { steps: [...journal.steps, { name: "receipt-published", status: "completed", timestamp: now(), before_ref: null, after_hash: sha256(Buffer.from(JSON.stringify(receipt))) }] });
    return { receipt, receiptPath, journalPath };
  } catch (error) {
    const failure = error instanceof DistributionError || typeof error?.kind === "string" ? error : distributionError("E_TRANSACTION", error.message, {}, { cause: error });
    let state = "failed";
    try { restoreFullBackup(backupRoot, { paths, expectedManifestHash: journal.candidate_receipt?.transaction?.backup_manifest_hash ?? null }); } catch (restoreError) {
      state = "rollback_failed";
      failure.details = { ...(failure.details ?? {}), recovery_error: restoreError.message };
    }
    failure.details = { ...(failure.details ?? {}), journal_path: journalPath, backup_root: backupRoot };
    failedJournal(paths, journal, state, failure);
    throw failure;
  }
}

async function rollback(options, paths) {
  const active = readActive(paths);
  const previousId = active?.receipt?.transaction?.previous_receipt_id;
  if (!active || !previousId) throwDistributionError("E_TRANSACTION", "no previous receipt is available for rollback", { target: paths.target });
  const overlayFiles = candidateOverlay(options.source ?? paths.home, paths.target, options.overlayRoot);
  const overlay = loadOverlay(overlayFiles).overlay;
  if (active.receipt.status === "installed") { validateReceiptPaths(active.receipt, paths); assertNoDrift({ receipt: active.receipt, activeRoot: paths.activeRoot, settingsRoot: paths.home, settingDefinitions: overlay.settings }); }
  const previous = readReceiptById(paths, previousId);
  const journalId = crypto.randomUUID();
  const journal = newJournal({ command: "rollback", paths, journalId, stageRoot: path.join(paths.stagingRoot, journalId), previousReceipt: active });
  const journalPath = writeJournal(paths, journal);
  try {
    restoreFullBackup(active.receipt.transaction.backup_root, { paths, expectedManifestHash: active.receipt.transaction.backup_manifest_hash });
    const restored = readActive(paths);
    if (!restored || restored.receipt.receipt_id !== previous.receipt.receipt_id || restored.receiptPath !== previous.receiptPath) throwDistributionError("E_RECOVERY_FAILURE", "rollback did not restore the exact active receipt", { expected: previous.receiptPath, actual: restored?.receiptPath ?? null });
    const completed = transition(paths, journal, "rolled_back", { steps: [{ name: "rollback", status: "completed", timestamp: now(), before_ref: active.receipt.receipt_id, after_hash: hashTree(paths.activeRoot).contentHash }, { name: "restore-active-receipt", status: "completed", timestamp: now(), before_ref: previous.receiptPath, after_hash: null }] });
    return { receipt: previous.receipt, receiptPath: previous.receiptPath, journalPath, journal: completed };
  } catch (error) {
    const failure = error?.kind === "E_RECOVERY_FAILURE"
      ? error
      : distributionError("E_RECOVERY_FAILURE", "rollback could not restore the prior transaction", {}, { cause: error, retryable: true });
    failure.details = { ...(failure.details ?? {}), journal_path: journalPath, backup_root: active.receipt.transaction.backup_root };
    failedJournal(paths, journal, "rollback_failed", failure);
    throw failure;
  }
}

function journalFiles(paths) {
  assertSafePath(paths.journalsRoot, { root: paths.stateRoot, label: "journals root", allowMissing: false });
  const rootIdentity = capturePathIdentity(paths.journalsRoot, {
    root: paths.stateRoot,
    label: "journals root",
    allowMissing: false,
    errorCode: "E_PATH_SECURITY",
  });
  assertPathIdentity(rootIdentity, { label: "journals root", errorCode: "E_PATH_SECURITY" });
  const files = fs.readdirSync(paths.journalsRoot);
  assertPathIdentity(rootIdentity, { label: "journals root", errorCode: "E_PATH_SECURITY" });
  return files.filter((file) => file.endsWith(".json")).map((file) => {
    if (!/^[0-9a-f-]{36}\.json$/iu.test(file)) throwDistributionError("E_JOURNAL_SCHEMA", "journal filename must contain a UUID", { file });
    const journalPath = path.join(paths.journalsRoot, file);
    assertSafePath(journalPath, { root: paths.journalsRoot, label: "journal path", allowMissing: false });
    const journalIdentity = capturePathIdentity(journalPath, {
      root: paths.journalsRoot,
      label: "journal path",
      allowMissing: false,
      errorCode: "E_PATH_SECURITY",
    });
    assertPathIdentity(journalIdentity, { label: "journal path", errorCode: "E_PATH_SECURITY" });
    const stat = fs.lstatSync(journalPath);
    if (!stat.isFile()) throwDistributionError("E_JOURNAL_IO", "journal must be a regular file", { journalPath });
    const journal = readJournal(journalPath, { paths });
    assertPathIdentity(rootIdentity, { label: "journals root", errorCode: "E_PATH_SECURITY" });
    assertPathIdentity(journalIdentity, { label: "journal path", errorCode: "E_PATH_SECURITY" });
    return { journalPath, journal };
  });
}

export async function executeLifecycle(command, options) {
  let resolvedSource = null;
  if (command === "install" || command === "update") {
    resolvedSource = options.resolvedSource
      ? await revalidateResolvedSource(options.resolvedSource, options)
      : await resolveSource(options.source, options);
    const resolvedSourceRoot = assertSourceRootBinding(resolvedSource, options);
    resolvedSource = Object.freeze({ ...resolvedSource, root: resolvedSourceRoot });
  }
  const paths = getTargetPaths({ target: options.target, home: options.home, env: options.env });
  ensureDirectories(paths);
  if (command === "status" || command === "verify") {
    const active = readActive(paths);
    if (!active) return { receipt: null, receiptPath: null, journalPath: null };
    if (command === "verify" && active.receipt.status === "installed") {
      const overlay = loadOverlay(candidateOverlay(options.source ?? options.home, paths.target, options.overlayRoot)).overlay;
      validateSettingPaths(overlay, paths);
      validateReceiptPaths(active.receipt, paths);
      assertNoDrift({ receipt: active.receipt, activeRoot: paths.activeRoot, settingsRoot: paths.home, settingDefinitions: overlay.settings });
      verifyReceipt(active.receipt, paths, overlay);
    }
    return { receipt: active.receipt, receiptPath: active.receiptPath, journalPath: null };
  }
  const resolvedSourceRoot = resolvedSource?.root ?? null;
  const portableCoreHash = resolvedSourceRoot ? portableCoreTreeHash(resolvedSourceRoot) : null;
  const lock = acquireLock(paths.lockPath);
  try {
    if (command === "install" || command === "update") {
      return await installOrUpdate(command, {
        ...options,
        resolvedSource,
        resolvedSourceRoot,
        portableCoreHash,
      }, paths);
    }
    if (command === "uninstall") return await uninstall(options, paths);
    if (command === "rollback") return await rollback(options, paths);
    if (command === "recover") {
      const unresolved = journalFiles(paths).filter(({ journal }) => isUnresolved(journal)).sort((left, right) => {
        const updated = Date.parse(right.journal.updated_at) - Date.parse(left.journal.updated_at);
        return updated || Date.parse(right.journal.started_at) - Date.parse(left.journal.started_at) || right.journal.journal_id.localeCompare(left.journal.journal_id);
      });
      if (unresolved.length === 0) {
        const active = readActive(paths);
        return { receipt: active?.receipt ?? null, receiptPath: active?.receiptPath ?? null, journalPath: null };
      }
      const selected = unresolved[0];
      await recoverJournal({ journalPath: selected.journalPath, journal: selected.journal, paths, setJournalState: (next) => writeJournal(paths, next) });
      const active = readActive(paths);
      return { receipt: active?.receipt ?? null, receiptPath: active?.receiptPath ?? null, journalPath: selected.journalPath };
    }
    throwDistributionError("E_USAGE", `unsupported lifecycle command: ${command}`, { command });
  } finally { releaseLock(lock); }
}

export { INSTALLER_VERSION, acquireLock, durableJson, readActive, writeJournal, receiptInventory };
