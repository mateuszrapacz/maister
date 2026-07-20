import path from "node:path";

import { distributionError, readFileNoFollow } from "./path-safety.mjs";
import { validateReceipt, SHA256, UUID, contained } from "./receipt-schema.mjs";
import { getTargetDefinition, SUPPORTED_TARGET_IDS } from "./targets.mjs";

const STATES = new Set([
  "prepared", "staged", "snapshotted", "committing", "committed", "verified",
  "rolled_back", "recovered", "failed", "rollback_failed",
]);
const COMMANDS = new Set(["install", "update", "uninstall", "rollback", "recover"]);
const STEP_NAMES = new Set([
  "materialize", "stage-validated", "snapshot", "commit", "integrity", "receipt-published",
  "control-plane-staged", "control-plane-promoted", "control-plane-pruned", "candidate-receipt-written",
  "active-pointer-transition", "uninstall", "rollback", "restore-active-receipt", "recovery",
]);
const CONTROL_PLANE_FIELDS = [
  "schema_version", "root_ref", "installer_ref", "stage_path", "destination_path",
  "tree_hash", "installer_sha256", "cli_contract_version", "source_version", "source_commit", "source_content_hash", "cleanup_owner",
];
const SHA1_COMMIT = /^[0-9a-f]{40}$/u;
const STEP_STATUSES = new Set(["pending", "completed", "failed"]);
const TRANSITIONS = Object.freeze({
  prepared: new Set(["prepared", "staged", "snapshotted", "committing", "rolled_back", "recovered", "failed", "rollback_failed"]),
  staged: new Set(["staged", "snapshotted", "committing", "recovered", "failed", "rollback_failed"]),
  snapshotted: new Set(["snapshotted", "committing", "recovered", "failed", "rollback_failed"]),
  committing: new Set(["committing", "committed", "recovered", "failed", "rollback_failed"]),
  committed: new Set(["committed", "verified", "rolled_back", "recovered", "failed", "rollback_failed"]),
  verified: new Set(["verified", "failed", "rollback_failed", "recovered"]),
  failed: new Set(["failed", "recovered", "rollback_failed"]),
  rollback_failed: new Set(["rollback_failed", "recovered", "failed"]),
  rolled_back: new Set(["rolled_back"]),
  recovered: new Set(["recovered"]),
});

function invalid(message, details = {}) {
  throw distributionError("E_JOURNAL_SCHEMA", message, details);
}

function rejectLegacySchema(value) {
  if (value?.schema_version === 1) {
    throw distributionError(
      "E_CLEAN_INSTALL_REQUIRED",
      "journal schema v1 is unsupported; a clean install with empty Maister target state is required",
      { persisted_schema_version: 1, required_schema_version: 2, artifact: "journal" },
    );
  }
}

function object(value, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${location} must be an object`, { location });
}

function exactFields(value, fields, location) {
  object(value, location);
  const allowed = new Set(fields);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) invalid(`${location} has unknown field ${unknown}`, { location, field: unknown });
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) invalid(`${location} is missing ${missing}`, { location, field: missing });
}

function exactFieldsWithOptional(value, fields, optionalFields, location) {
  object(value, location);
  const allowed = new Set([...fields, ...optionalFields]);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) invalid(`${location} has unknown field ${unknown}`, { location, field: unknown });
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) invalid(`${location} is missing ${missing}`, { location, field: missing });
}

function string(value, location, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) invalid(`${location} must be a non-empty string`, { location });
}

function timestamp(value, location) {
  string(value, location);
  if (!Number.isFinite(Date.parse(value))) invalid(`${location} must be an ISO timestamp`, { location });
}

function assertTransition(from, to) {
  if (!STATES.has(from) || !STATES.has(to) || !TRANSITIONS[from]?.has(to)) {
    invalid(`illegal journal state transition: ${from} -> ${to}`, { from, to });
  }
}

export function appendTransition(journal, state, details = {}) {
  assertTransition(journal.state, state);
  const timestampValue = new Date().toISOString();
  return {
    ...journal,
    ...details,
    state,
    updated_at: timestampValue,
    state_history: [...journal.state_history, { state, timestamp: timestampValue }],
  };
}

function validateHistory(history, currentState) {
  if (!Array.isArray(history) || history.length === 0) invalid("journal.state_history must be a non-empty array");
  let previous = null;
  for (const [index, entry] of history.entries()) {
    exactFields(entry, ["state", "timestamp"], `state_history[${index}]`);
    if (!STATES.has(entry.state)) invalid(`state_history[${index}].state is unsupported`);
    timestamp(entry.timestamp, `state_history[${index}].timestamp`);
    if (previous !== null) assertTransition(previous, entry.state);
    previous = entry.state;
  }
  if (history[0].state !== "prepared") invalid("journal state history must begin at prepared");
  if (history.at(-1).state !== currentState) invalid("journal.state must equal the last state_history state");
}

function validateSteps(steps) {
  if (!Array.isArray(steps)) invalid("journal.steps must be an array");
  for (const [index, step] of steps.entries()) {
    const location = `steps[${index}]`;
    exactFields(step, ["name", "status", "timestamp", "before_ref", "after_hash"], location);
    if (!STEP_NAMES.has(step.name)) invalid(`${location}.name is unsupported`, { location });
    if (!STEP_STATUSES.has(step.status)) invalid(`${location}.status is unsupported`, { location });
    timestamp(step.timestamp, `${location}.timestamp`);
    string(step.before_ref, `${location}.before_ref`, true);
    if (step.after_hash !== null && (typeof step.after_hash !== "string" || !SHA256.test(step.after_hash))) invalid(`${location}.after_hash must be a SHA-256 hash or null`, { location });
  }
}

function validateFailure(failure) {
  if (failure === null) return;
  exactFields(failure, ["kind", "details", "retryable"], "failure");
  string(failure.kind, "failure.kind");
  object(failure.details, "failure.details");
  if (typeof failure.retryable !== "boolean") invalid("failure.retryable must be boolean");
}

function validateManagedRoots(roots, target, paths) {
  if (!Array.isArray(roots) || roots.length === 0) invalid("journal.managed_roots must be a non-empty array");
  const definition = getTargetDefinition(target);
  const seen = new Set();
  for (const [index, root] of roots.entries()) {
    const location = `managed_roots[${index}]`;
    exactFields(root, ["root_id", "path", "ownership"], location);
    string(root.root_id, `${location}.root_id`);
    if (seen.has(root.root_id)) invalid("journal managed root IDs must be unique", { root_id: root.root_id });
    seen.add(root.root_id);
    absolutePath(root.path, `${location}.path`);
    if (!new Set(["whole_tree", "leaf_set"]).has(root.ownership)) invalid(`${location}.ownership is unsupported`);
    const expected = definition?.managedRoots[index];
    if (!expected || expected.rootId !== root.root_id || expected.ownership !== root.ownership) {
      invalid("journal managed roots do not match the target registry", { target });
    }
    if (paths) {
      const resolved = paths.managedRoots.find(({ rootId }) => rootId === root.root_id);
      if (!resolved || resolved.path !== root.path || resolved.ownership !== root.ownership) invalid("journal managed root path does not match target paths", { root_id: root.root_id });
    }
  }
  if (roots.length !== definition?.managedRoots.length) invalid("journal managed roots are incomplete", { target });
}

function validateControlPlane(controlPlane, journal, paths) {
  if (controlPlane === null) return;
  exactFields(controlPlane, CONTROL_PLANE_FIELDS, "control_plane");
  if (controlPlane.schema_version !== 1) invalid("control_plane.schema_version must be 1");
  const expectedRootRef = `control-planes/${journal.journal_id}`;
  const expectedInstallerRef = `${expectedRootRef}/plugins/maister/bin/maister-install.mjs`;
  if (controlPlane.root_ref !== expectedRootRef || controlPlane.installer_ref !== expectedInstallerRef) {
    invalid("journal control_plane refs must be receipt-bound", { root_ref: controlPlane.root_ref, installer_ref: controlPlane.installer_ref });
  }
  absolutePath(controlPlane.stage_path, "control_plane.stage_path");
  absolutePath(controlPlane.destination_path, "control_plane.destination_path");
  for (const field of ["tree_hash", "installer_sha256", "source_content_hash"]) {
    if (typeof controlPlane[field] !== "string" || !SHA256.test(controlPlane[field])) invalid(`control_plane.${field} must be a SHA-256 hash`);
  }
  if (controlPlane.cli_contract_version !== 1) invalid("control_plane.cli_contract_version is unsupported");
  string(controlPlane.source_version, "control_plane.source_version");
  if (typeof controlPlane.source_commit !== "string" || !SHA1_COMMIT.test(controlPlane.source_commit)) invalid("control_plane.source_commit must be a full commit hash");
  if (controlPlane.cleanup_owner !== "transaction") invalid("control_plane.cleanup_owner must be transaction");
  if (paths) {
    if (controlPlane.stage_path !== path.join(journal.stage_root, "control-plane")) invalid("control_plane.stage_path does not match the journal staging root");
    if (controlPlane.destination_path !== path.join(paths.controlPlanesRoot, journal.journal_id)) invalid("control_plane.destination_path does not match the receipt-bound destination");
  }
}

export function isTerminal(journal) {
  const cleanupComplete = !journal.steps.some((entry) => entry.status === "pending" || entry.status === "failed");
  return cleanupComplete && (journal.state === "rolled_back" || journal.state === "recovered"
    || (journal.state === "verified"
      && journal.steps.some((entry) => entry.name === "receipt-published" && entry.status === "completed")
    ));
}

export function isUnresolved(journal) {
  return !isTerminal(journal);
}

export function validateJournal(journal, { paths = null } = {}) {
  rejectLegacySchema(journal);
  const fields = [
    "schema_version", "journal_id", "command", "target", "started_at", "updated_at", "state",
    "state_history", "stage_root", "managed_roots", "previous_receipt", "candidate_receipt", "control_plane", "backup_root", "backup_manifest_hash", "lock", "steps", "failure",
  ];
  exactFieldsWithOptional(journal, fields.filter((field) => !["control_plane", "backup_root", "backup_manifest_hash"].includes(field)), ["control_plane", "backup_root", "backup_manifest_hash"], "journal");
  if (journal.schema_version !== 2) invalid("journal schema_version must be 2");
  string(journal.journal_id, "journal_id");
  if (!UUID.test(journal.journal_id)) invalid("journal_id must be a UUID");
  string(journal.command, "command");
  if (!COMMANDS.has(journal.command)) invalid(`unsupported journal command: ${journal.command}`);
  string(journal.target, "target");
  if (!SUPPORTED_TARGET_IDS.includes(journal.target)) invalid("journal target is unsupported");
  validateManagedRoots(journal.managed_roots, journal.target, paths);
  timestamp(journal.started_at, "started_at");
  timestamp(journal.updated_at, "updated_at");
  if (!STATES.has(journal.state)) invalid(`unsupported journal state: ${journal.state}`);
  validateHistory(journal.state_history, journal.state);
  absolutePath(journal.stage_root, "stage_root");
  validateControlPlane(journal.control_plane ?? null, journal, paths);
  if (journal.backup_root !== null && journal.backup_root !== undefined) absolutePath(journal.backup_root, "backup_root");
  if (journal.backup_manifest_hash !== null && journal.backup_manifest_hash !== undefined && !SHA256.test(journal.backup_manifest_hash)) invalid("backup_manifest_hash must be a SHA-256 hash or null");
  if (journal.previous_receipt !== null) {
    absolutePath(journal.previous_receipt, "previous_receipt");
    if (!UUID.test(path.basename(journal.previous_receipt, ".json")) || path.extname(journal.previous_receipt) !== ".json") invalid("previous_receipt must name a UUID receipt");
  }
  exactFields(journal.lock, ["path"], "lock");
  absolutePath(journal.lock.path, "lock.path");
  validateSteps(journal.steps);
  validateFailure(journal.failure);
  const published = journal.steps.some((entry) => entry.name === "receipt-published" && entry.status === "completed");
  if (published && !new Set(["verified", "rolled_back", "recovered"]).has(journal.state)) invalid("receipt-published journals must be in a publication terminal state");
  if (journal.state === "recovered" && !journal.steps.some((entry) => entry.name === "recovery" && entry.status === "completed")) invalid("recovered journals must record a recovery step");
  if (journal.state === "rolled_back" && !journal.steps.some((entry) => entry.name === "rollback" || entry.name === "uninstall")) invalid("rolled_back journals must record rollback or uninstall");
  if (journal.candidate_receipt !== null) {
    validateReceipt(journal.candidate_receipt, { paths });
    if (journal.candidate_receipt.receipt_id !== journal.journal_id) invalid("candidate_receipt.receipt_id must equal journal_id");
    if ((journal.control_plane ?? null) !== null && JSON.stringify(journal.candidate_receipt.control_plane) !== JSON.stringify({
      schema_version: journal.control_plane.schema_version,
      root_ref: journal.control_plane.root_ref,
      installer_ref: journal.control_plane.installer_ref,
      tree_hash: journal.control_plane.tree_hash,
      installer_sha256: journal.control_plane.installer_sha256,
      cli_contract_version: journal.control_plane.cli_contract_version,
      source_version: journal.control_plane.source_version,
      source_commit: journal.control_plane.source_commit,
      source_content_hash: journal.control_plane.source_content_hash,
    })) invalid("candidate_receipt.control_plane must equal the journal binding");
  }
  if (paths) {
    const expectedStage = path.join(paths.stagingRoot, journal.journal_id);
    if (journal.target !== paths.target) invalid("journal target does not match the requested target");
    if (path.resolve(journal.stage_root) !== path.resolve(expectedStage)) invalid("journal stage_root is outside the staging root");
    if (path.resolve(journal.lock.path) !== path.resolve(paths.lockPath)) invalid("journal lock path does not match target lock");
    if (journal.previous_receipt !== null) contained(paths.receiptsRoot, journal.previous_receipt, "previous_receipt");
    if (journal.candidate_receipt) {
      const backupRoot = journal.candidate_receipt.transaction.backup_root;
      if (backupRoot !== path.join(paths.backupsRoot, journal.journal_id)) invalid("candidate backup_root is outside the backup root");
    }
    if (journal.backup_root !== null && journal.backup_root !== undefined) {
      contained(paths.backupsRoot, journal.backup_root, "journal backup_root");
      const expectedBackupRoot = path.join(paths.backupsRoot, journal.journal_id);
      const rollbackBackup = journal.command === "rollback" && UUID.test(path.basename(journal.backup_root));
      if (journal.backup_root !== expectedBackupRoot && !rollbackBackup) invalid("journal backup_root is outside the backup root");
    }
  }
  return journal;
}

function absolutePath(value, location) {
  string(value, location);
  if (!path.isAbsolute(value) || path.normalize(value) !== value) invalid(`${location} must be a normalized absolute path`, { location });
}

export function readJournal(filePath, context = {}) {
  const { paths = null, beforeRead = null } = context;
  try {
    const journal = JSON.parse(readFileNoFollow(filePath, {
      root: paths?.journalsRoot ?? path.dirname(filePath),
      label: "journal",
      encoding: "utf8",
      beforeOpen: beforeRead,
      errorCode: "E_PATH_SECURITY",
    }));
    return validateJournal(journal, { paths });
  } catch (error) {
    if (["E_JOURNAL_SCHEMA", "E_JOURNAL_IO", "E_CLEAN_INSTALL_REQUIRED"].includes(error?.kind)) throw error;
    throw distributionError("E_JOURNAL_IO", `could not read journal: ${filePath}`, { filePath }, { cause: error });
  }
}

export { STATES, assertTransition };
