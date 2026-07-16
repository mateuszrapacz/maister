import path from "node:path";

import { distributionError, readFileNoFollow } from "./path-safety.mjs";
import { validateReceipt, SHA256, UUID, contained } from "./receipt-schema.mjs";
import { SUPPORTED_TARGET_IDS } from "./targets.mjs";

const STATES = new Set([
  "prepared", "staged", "snapshotted", "committing", "committed", "verified",
  "rolled_back", "recovered", "failed", "rollback_failed",
]);
const COMMANDS = new Set(["install", "update", "uninstall", "rollback", "recover"]);
const STEP_NAMES = new Set([
  "materialize", "stage-validated", "snapshot", "commit", "integrity", "receipt-published",
  "uninstall", "rollback", "restore-active-receipt", "recovery",
]);
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

export function isTerminal(journal) {
  return journal.state === "rolled_back" || journal.state === "recovered"
    || (journal.state === "verified" && journal.steps.some((entry) => entry.name === "receipt-published" && entry.status === "completed"));
}

export function isUnresolved(journal) {
  return !isTerminal(journal);
}

export function validateJournal(journal, { paths = null } = {}) {
  const fields = [
    "schema_version", "journal_id", "command", "target", "started_at", "updated_at", "state",
    "state_history", "stage_root", "destination_root", "previous_receipt", "candidate_receipt", "lock", "steps", "failure",
  ];
  exactFields(journal, fields, "journal");
  if (journal.schema_version !== 1) invalid("journal schema_version must be 1");
  string(journal.journal_id, "journal_id");
  if (!UUID.test(journal.journal_id)) invalid("journal_id must be a UUID");
  string(journal.command, "command");
  if (!COMMANDS.has(journal.command)) invalid(`unsupported journal command: ${journal.command}`);
  string(journal.target, "target");
  if (!SUPPORTED_TARGET_IDS.includes(journal.target)) invalid("journal target is unsupported");
  timestamp(journal.started_at, "started_at");
  timestamp(journal.updated_at, "updated_at");
  if (!STATES.has(journal.state)) invalid(`unsupported journal state: ${journal.state}`);
  validateHistory(journal.state_history, journal.state);
  absolutePath(journal.stage_root, "stage_root");
  absolutePath(journal.destination_root, "destination_root");
  if (journal.previous_receipt !== null) {
    absolutePath(journal.previous_receipt, "previous_receipt");
    if (!UUID.test(path.basename(journal.previous_receipt, ".json")) || path.extname(journal.previous_receipt) !== ".json") invalid("previous_receipt must name a UUID receipt");
  }
  exactFields(journal.lock, ["path"], "lock");
  absolutePath(journal.lock.path, "lock.path");
  validateSteps(journal.steps);
  validateFailure(journal.failure);
  const published = journal.steps.some((entry) => entry.name === "receipt-published" && entry.status === "completed");
  if (published && !new Set(["verified", "rolled_back"]).has(journal.state)) invalid("receipt-published journals must be in a publication terminal state");
  if (journal.state === "recovered" && !journal.steps.some((entry) => entry.name === "recovery" && entry.status === "completed")) invalid("recovered journals must record a recovery step");
  if (journal.state === "rolled_back" && !journal.steps.some((entry) => entry.name === "rollback" || entry.name === "uninstall")) invalid("rolled_back journals must record rollback or uninstall");
  if (journal.candidate_receipt !== null) {
    validateReceipt(journal.candidate_receipt, { paths });
    if (journal.candidate_receipt.receipt_id !== journal.journal_id) invalid("candidate_receipt.receipt_id must equal journal_id");
  }
  if (paths) {
    const expectedStage = path.join(paths.stagingRoot, journal.journal_id);
    if (journal.target !== paths.target) invalid("journal target does not match the requested target");
    if (path.resolve(journal.stage_root) !== path.resolve(expectedStage)) invalid("journal stage_root is outside the staging root");
    if (path.resolve(journal.destination_root) !== path.resolve(paths.activeRoot)) invalid("journal destination_root does not match active_root");
    if (path.resolve(journal.lock.path) !== path.resolve(paths.lockPath)) invalid("journal lock path does not match target lock");
    if (journal.previous_receipt !== null) contained(paths.receiptsRoot, journal.previous_receipt, "previous_receipt");
    if (journal.candidate_receipt) {
      const backupRoot = journal.candidate_receipt.transaction.backup_root;
      if (backupRoot !== path.join(paths.backupsRoot, journal.journal_id)) invalid("candidate backup_root is outside the backup root");
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
    if (error?.kind === "E_JOURNAL_SCHEMA" || error?.kind === "E_JOURNAL_IO") throw error;
    throw distributionError("E_JOURNAL_IO", `could not read journal: ${filePath}`, { filePath }, { cause: error });
  }
}

export { STATES, assertTransition };
