import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  EXECUTION_EVENT_SCHEMA_VERSION,
  ExecutionEventValidationError,
  canonicalExecutionEventJson,
  createExecutionEvent,
  MaisterObservationValidationError,
  MAISTER_OBSERVATION_EVENT_TYPES,
  canonicalObservationJson,
  createObservationEvent,
  validateObservationEvent,
  validateObservationStream,
  observationEventDigest,
  validateExecutionEventStream,
} from "./execution-event-schema.mjs";

const SAFE_DISPATCH_ID = /^[a-z0-9][a-z0-9-]{0,127}$/u;
const IMMUTABLE_REUSE_FIELDS = [
  "idempotency_key",
  "gate_decision_id",
  "workflow_id",
  "work_item_id",
  "logical_role_id",
  "canonical_source_digest",
  "manifest_digest",
  "projection_digest",
  "adapter_id",
  "native_role_external_id",
  "host",
  "host_version",
  "requested_execution_policy",
  "effective_execution_policy",
];

export class ExecutionEventWriterError extends Error {
  constructor(code, message, details = {}, { cause } = {}) {
    super(message, cause === undefined ? {} : { cause });
    this.name = "ExecutionEventWriterError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = code === "E_DISPATCH_LOCKED";
  }
}

function fail(code, message, details = {}, options = {}) {
  throw new ExecutionEventWriterError(code, message, details, options);
}

function wrapValidation(error, fallbackCode = null) {
  if (!(error instanceof ExecutionEventValidationError)) throw error;
  fail(fallbackCode ?? error.code, error.message, error.details, { cause: error });
}

function flushDirectory(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0) | (fs.constants.O_NOFOLLOW ?? 0));
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (!["EINVAL", "ENOTSUP", "EISDIR"].includes(error.code)) throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function assertDispatchId(dispatchId) {
  if (typeof dispatchId !== "string" || !SAFE_DISPATCH_ID.test(dispatchId)) {
    fail("E_DISPATCH_ID", "dispatch ID must be a lowercase path-safe identifier", { dispatchId });
  }
  return dispatchId;
}

function assertTaskPath(taskPath) {
  if (typeof taskPath !== "string" || taskPath.length === 0 || taskPath.includes("\0")) {
    fail("E_TASK_PATH", "task path must be a non-empty NUL-free string", { taskPath });
  }
  const absolute = path.resolve(taskPath);
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    fail("E_TASK_PATH", `task path is unavailable: ${absolute}`, { taskPath: absolute }, { cause: error });
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("E_TASK_PATH", "task path must be a real directory", { taskPath: absolute });
  let canonical;
  try {
    canonical = fs.realpathSync(absolute);
  } catch (error) {
    fail("E_TASK_PATH", `task path cannot be resolved safely: ${absolute}`, { taskPath: absolute }, { cause: error });
  }
  return canonical;
}

function assertContained(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("E_TASK_PATH", `${label} escapes the task path`, { root, candidate });
  }
}

export function dispatchEventPaths({ taskPath, dispatchId }) {
  const taskRoot = assertTaskPath(taskPath);
  const safeDispatchId = assertDispatchId(dispatchId);
  const executionDirectory = path.join(taskRoot, "execution");
  const eventDirectory = path.join(executionDirectory, "agent-dispatches");
  const streamPath = path.join(eventDirectory, `${safeDispatchId}.jsonl`);
  const lockPath = path.join(eventDirectory, `${safeDispatchId}.lock`);
  for (const [label, candidate] of [["execution directory", executionDirectory], ["event directory", eventDirectory], ["event stream", streamPath], ["dispatch lock", lockPath]]) {
    assertContained(taskRoot, candidate, label);
  }
  return { taskRoot, executionDirectory, eventDirectory, streamPath, lockPath };
}

function ensurePrivateDirectory(directory, parent) {
  const existing = fs.lstatSync(directory, { throwIfNoEntry: false });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    fail("E_TASK_PATH", `private event path is not a real directory: ${directory}`, { directory });
  }
  if (!existing) {
    try {
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
      flushDirectory(parent);
    } catch (error) {
      fail("E_EVENT_WRITE", `could not create private event directory: ${directory}`, { directory }, { cause: error });
    }
  } else if ((existing.mode & 0o777) !== 0o700) {
    try {
      fs.chmodSync(directory, 0o700);
    } catch (error) {
      fail("E_EVENT_WRITE", `could not enforce private event directory mode: ${directory}`, { directory }, { cause: error });
    }
  }
  const canonicalParent = fs.realpathSync(parent);
  const canonicalDirectory = fs.realpathSync(directory);
  if (canonicalDirectory !== path.join(canonicalParent, path.basename(directory))) {
    fail("E_TASK_PATH", `private event directory changed identity: ${directory}`, { directory });
  }
}

function ensureEventDirectory(paths) {
  ensurePrivateDirectory(paths.executionDirectory, paths.taskRoot);
  ensurePrivateDirectory(paths.eventDirectory, paths.executionDirectory);
}

function acquireDispatchLock(lockPath) {
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0);
  const token = crypto.randomUUID();
  let descriptor;
  try {
    try {
      descriptor = fs.openSync(lockPath, flags, 0o600);
    } catch (error) {
      if (error.code === "EINVAL" || error.code === "ENOTSUP") descriptor = fs.openSync(lockPath, flags & ~(fs.constants.O_NOFOLLOW ?? 0), 0o600);
      else throw error;
    }
    fs.writeFileSync(descriptor, `${JSON.stringify({ token, pid: process.pid, acquired_at: new Date().toISOString() })}\n`, "utf8");
    fs.fchmodSync(descriptor, 0o600);
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (error.code === "EEXIST" || error.code === "EISDIR" || error.code === "ELOOP") {
      fail("E_DISPATCH_LOCKED", "dispatch event stream is locked by another writer", { lockPath }, { cause: error });
    }
    fail("E_EVENT_WRITE", `could not acquire dispatch event lock: ${error.message}`, { lockPath }, { cause: error });
  }
  fs.closeSync(descriptor);
  try {
    flushDirectory(path.dirname(lockPath));
  } catch (error) {
    try { fs.unlinkSync(lockPath); } catch { /* preserve the original durability error */ }
    fail("E_EVENT_FSYNC", `could not persist dispatch event lock: ${error.message}`, { lockPath }, { cause: error });
  }
  return { lockPath, token };
}

function releaseDispatchLock(lock) {
  let owner;
  try {
    owner = JSON.parse(fs.readFileSync(lock.lockPath, "utf8"));
  } catch (error) {
    fail("E_DISPATCH_LOCKED", "dispatch lock ownership cannot be verified during release", { lockPath: lock.lockPath }, { cause: error });
  }
  if (owner.token !== lock.token) fail("E_DISPATCH_LOCKED", "refusing to release a foreign dispatch lock", { lockPath: lock.lockPath });
  try {
    fs.unlinkSync(lock.lockPath);
    flushDirectory(path.dirname(lock.lockPath));
  } catch (error) {
    fail("E_EVENT_WRITE", `could not release dispatch event lock: ${error.message}`, { lockPath: lock.lockPath }, { cause: error });
  }
}

function withDispatchLock(lockPath, callback) {
  const lock = acquireDispatchLock(lockPath);
  let callbackError;
  try {
    return callback();
  } catch (error) {
    callbackError = error;
    throw error;
  } finally {
    try {
      releaseDispatchLock(lock);
    } catch (releaseError) {
      if (callbackError === undefined) throw releaseError;
    }
  }
}

function assertRegularPrivateFile(filePath) {
  const stat = fs.lstatSync(filePath, { throwIfNoEntry: false });
  if (!stat) return false;
  if (!stat.isFile() || stat.isSymbolicLink()) fail("E_STREAM_CORRUPT", "dispatch stream must be a regular file", { streamPath: filePath });
  if ((stat.mode & 0o777) !== 0o600) fail("E_STREAM_CORRUPT", "dispatch stream mode must be 0600", { streamPath: filePath, mode: stat.mode & 0o777 });
  return true;
}

function readStreamFile(streamPath) {
  if (!assertRegularPrivateFile(streamPath)) fail("E_STREAM_MISSING", "dispatch event stream does not exist", { streamPath });
  let text;
  try {
    const descriptor = fs.openSync(streamPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      text = fs.readFileSync(descriptor, "utf8");
    } finally {
      fs.closeSync(descriptor);
    }
  } catch (error) {
    if (error instanceof ExecutionEventWriterError) throw error;
    fail("E_STREAM_CORRUPT", `dispatch stream cannot be read safely: ${error.message}`, { streamPath }, { cause: error });
  }
  if (text.length === 0 || !text.endsWith("\n")) fail("E_STREAM_CORRUPT", "dispatch stream must be non-empty and newline terminated", { streamPath });
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) fail("E_STREAM_CORRUPT", "dispatch stream contains an empty line", { streamPath });
  const events = [];
  try {
    for (const line of lines) {
      const event = JSON.parse(line);
      if (canonicalExecutionEventJson(event) !== line) fail("E_STREAM_CORRUPT", "dispatch stream contains non-canonical JSON", { streamPath });
      events.push(event);
    }
    const state = validateExecutionEventStream(events);
    return { text, ...state };
  } catch (error) {
    if (error instanceof ExecutionEventWriterError) throw error;
    if (error instanceof ExecutionEventValidationError || error instanceof SyntaxError) {
      fail("E_STREAM_CORRUPT", `dispatch stream validation failed: ${error.message}`, { streamPath }, { cause: error });
    }
    throw error;
  }
}

function publicStreamResult(paths, state, status = "validated") {
  return {
    status,
    dispatchId: state.events[0].dispatch_id,
    streamPath: paths.streamPath,
    events: structuredClone(state.events),
    complete: state.complete,
    nextEventTypes: [...state.nextEventTypes],
  };
}

function reuseMatches(existing, proposed) {
  return IMMUTABLE_REUSE_FIELDS.every((field) => canonicalExecutionEventJson(existing[field]) === canonicalExecutionEventJson(proposed[field]));
}

function findIdempotentStream(paths, proposedEvent) {
  const candidates = fs.readdirSync(paths.eventDirectory)
    .filter((name) => name.endsWith(".jsonl"))
    .sort();
  const matches = [];
  for (const name of candidates) {
    const streamPath = path.join(paths.eventDirectory, name);
    const state = readStreamFile(streamPath);
    if (state.events[0].idempotency_key === proposedEvent.idempotency_key) matches.push({ streamPath, state });
  }
  if (matches.length > 1) fail("E_IDEMPOTENCY_CONFLICT", "multiple dispatch streams use the same idempotency key", { idempotencyKey: proposedEvent.idempotency_key });
  if (matches.length === 0) return null;
  const match = matches[0];
  if (!reuseMatches(match.state.events[0], proposedEvent)) {
    fail("E_IDEMPOTENCY_CONFLICT", "idempotency key is already bound to different immutable dispatch context", {
      idempotencyKey: proposedEvent.idempotency_key,
      dispatchId: match.state.events[0].dispatch_id,
    });
  }
  return match;
}

function appendDurably(streamPath, line, { create }) {
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const flags = fs.constants.O_WRONLY | (create ? fs.constants.O_CREAT | fs.constants.O_EXCL : fs.constants.O_APPEND) | noFollow;
  let descriptor;
  try {
    try {
      descriptor = fs.openSync(streamPath, flags, 0o600);
    } catch (error) {
      if (error.code === "EINVAL" || error.code === "ENOTSUP") descriptor = fs.openSync(streamPath, flags & ~noFollow, 0o600);
      else throw error;
    }
    fs.fchmodSync(descriptor, 0o600);
    fs.writeFileSync(descriptor, line, "utf8");
    try {
      fs.fsyncSync(descriptor);
    } catch (error) {
      fail("E_EVENT_FSYNC", `could not fsync dispatch event: ${error.message}`, { streamPath }, { cause: error });
    }
  } catch (error) {
    if (error instanceof ExecutionEventWriterError) throw error;
    fail("E_EVENT_WRITE", `could not append dispatch event: ${error.message}`, { streamPath }, { cause: error });
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  if (create) {
    try {
      flushDirectory(path.dirname(streamPath));
    } catch (error) {
      fail("E_EVENT_FSYNC", `could not persist dispatch stream creation: ${error.message}`, { streamPath }, { cause: error });
    }
  }
}

function prepareEvent(event, events) {
  if (!event || typeof event !== "object" || Array.isArray(event)) fail("E_EVENT_SCHEMA", "event input must be a mapping");
  const previous = events.at(-1) ?? null;
  try {
    return createExecutionEvent({
      ...structuredClone(event),
      schema_version: EXECUTION_EVENT_SCHEMA_VERSION,
      sequence: events.length,
      previous_event_digest: previous?.event_digest ?? null,
    });
  } catch (error) {
    wrapValidation(error);
  }
}

function validateCandidate(events, candidate) {
  try {
    return validateExecutionEventStream([...events, candidate]);
  } catch (error) {
    wrapValidation(error);
  }
}

function appendLegacyExecutionEvent({ taskPath, dispatchId, event }) {
  const paths = dispatchEventPaths({ taskPath, dispatchId });
  if (!event || event.dispatch_id !== dispatchId) fail("E_EVENT_IDENTITY", "event.dispatch_id must equal the requested dispatch ID", { dispatchId, eventDispatchId: event?.dispatch_id });
  ensureEventDirectory(paths);
  return withDispatchLock(paths.lockPath, () => {
    if (event.event_type === "dispatch_started") {
      const existing = findIdempotentStream(paths, event);
      if (existing) {
        const existingPaths = { ...paths, streamPath: existing.streamPath };
        return publicStreamResult(existingPaths, existing.state, "reused");
      }
      if (fs.lstatSync(paths.streamPath, { throwIfNoEntry: false })) {
        fail("E_DISPATCH_CONFLICT", "dispatch ID is already bound to a different event stream", { dispatchId });
      }
      const candidate = prepareEvent(event, []);
      const state = validateCandidate([], candidate);
      appendDurably(paths.streamPath, `${canonicalExecutionEventJson(candidate)}\n`, { create: true });
      const reread = readStreamFile(paths.streamPath);
      if (reread.events.length !== 1 || reread.events[0].event_digest !== candidate.event_digest) {
        fail("E_STREAM_CORRUPT", "dispatch stream reread does not match the appended event", { streamPath: paths.streamPath });
      }
      return { ...publicStreamResult(paths, reread, "recorded"), event: structuredClone(candidate) };
    }

    const current = readStreamFile(paths.streamPath);
    const candidate = prepareEvent(event, current.events);
    const next = validateCandidate(current.events, candidate);
    appendDurably(paths.streamPath, `${canonicalExecutionEventJson(candidate)}\n`, { create: false });
    const reread = readStreamFile(paths.streamPath);
    if (reread.events.length !== next.events.length || reread.events.at(-1).event_digest !== candidate.event_digest) {
      fail("E_STREAM_CORRUPT", "dispatch stream reread does not match the appended event", { streamPath: paths.streamPath });
    }
    return { ...publicStreamResult(paths, reread, "recorded"), event: structuredClone(candidate) };
  });
}

function readLegacyExecutionEventStream({ taskPath, dispatchId }) {
  const paths = dispatchEventPaths({ taskPath, dispatchId });
  const state = readStreamFile(paths.streamPath);
  if (state.events[0].dispatch_id !== dispatchId) fail("E_EVENT_IDENTITY", "dispatch filename does not match stream identity", { dispatchId });
  return publicStreamResult(paths, state);
}

function recoverLegacyExecutionEventStream({ taskPath, dispatchId }) {
  return readLegacyExecutionEventStream({ taskPath, dispatchId });
}

const OBSERVATION_EVENT_TYPE_SET = new Set(MAISTER_OBSERVATION_EVENT_TYPES);
const OBSERVATION_TERMINAL_EVENT_TYPES = new Set(["terminal", "failure", "process_lost"]);

function observationFailure(error, fallbackCode = "E_OBSERVATION_WRITE") {
  if (error instanceof ExecutionEventWriterError) throw error;
  if (error instanceof MaisterObservationValidationError) {
    fail(error.code, error.message, error.details, { cause: error });
  }
  fail(fallbackCode, error instanceof Error ? error.message : String(error), {}, { cause: error });
}

function assertObservationStreamFile(streamPath) {
  const stat = fs.lstatSync(streamPath, { throwIfNoEntry: false });
  if (!stat) fail("E_OBSERVATION_MISSING", "Pi observation stream does not exist", { streamPath });
  if (!stat.isFile() || stat.isSymbolicLink()) fail("E_OBSERVATION_CORRUPT", "Pi observation stream must be a regular file", { streamPath });
  if ((stat.mode & 0o777) !== 0o600) fail("E_OBSERVATION_CORRUPT", "Pi observation stream mode must be 0600", { streamPath });
}

function readObservationStreamFile(streamPath) {
  assertObservationStreamFile(streamPath);
  let text;
  try {
    const descriptor = fs.openSync(streamPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try { text = fs.readFileSync(descriptor, "utf8"); } finally { fs.closeSync(descriptor); }
  } catch (error) {
    observationFailure(error, "E_OBSERVATION_READ");
  }
  if (text.length === 0 || !text.endsWith("\n")) fail("E_OBSERVATION_CORRUPT", "Pi observation stream must be newline terminated", { streamPath });
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) fail("E_OBSERVATION_CORRUPT", "Pi observation stream contains an empty line", { streamPath });
  const events = [];
  try {
    for (const line of lines) {
      const event = JSON.parse(line);
      if (canonicalObservationJson(event) !== line) fail("E_OBSERVATION_CORRUPT", "Pi observation stream contains non-canonical JSON", { streamPath });
      events.push(event);
    }
    return { text, ...validateObservationStream(events) };
  } catch (error) {
    if (error instanceof ExecutionEventWriterError) throw error;
    if (error instanceof MaisterObservationValidationError || error instanceof SyntaxError) {
      fail("E_OBSERVATION_CORRUPT", `Pi observation stream validation failed: ${error.message}`, { streamPath }, { cause: error });
    }
    throw error;
  }
}

function observationPublicResult(paths, state, status = "validated") {
  return {
    status,
    dispatchId: state.events[0].dispatch_id,
    streamId: state.events[0].stream_id,
    streamPath: paths.streamPath,
    events: structuredClone(state.events),
    complete: state.complete,
    nextEventTypes: [...state.nextEventTypes],
  };
}

function observationReuseMatches(existing, proposed) {
  return [
    "stream_id",
    "dispatch_id",
    "request_id",
    "target",
    "adapter_id",
    "protocol_version",
    "logical_role_id",
    "requested_agent",
  ].every((field) => existing[field] === proposed[field]);
}

function prepareObservationEvent(event, events, dispatchId) {
  if (!event || typeof event !== "object" || Array.isArray(event)) fail("E_OBSERVATION_SCHEMA", "observation event input must be a mapping");
  const previous = events.at(-1) ?? null;
  const candidate = {
    ...structuredClone(event),
    schema_version: 1,
    stream_id: event.stream_id ?? dispatchId,
    event_id: event.event_id ?? crypto.randomUUID(),
    sequence: events.length,
    dispatch_id: dispatchId,
    request_id: dispatchId,
    observed_agent: event.observed_agent ?? null,
    previous_hash: previous?.hash ?? null,
  };
  delete candidate.hash;
  try {
    return createObservationEvent(candidate);
  } catch (error) {
    observationFailure(error, "E_OBSERVATION_SCHEMA");
  }
}

function appendObservationDurably(streamPath, line, { create }) {
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const flags = fs.constants.O_WRONLY | (create ? fs.constants.O_CREAT | fs.constants.O_EXCL : fs.constants.O_APPEND) | noFollow;
  let descriptor;
  try {
    try {
      descriptor = fs.openSync(streamPath, flags, 0o600);
    } catch (error) {
      if (error.code === "EINVAL" || error.code === "ENOTSUP") descriptor = fs.openSync(streamPath, flags & ~noFollow, 0o600);
      else throw error;
    }
    fs.fchmodSync(descriptor, 0o600);
    fs.writeFileSync(descriptor, line, "utf8");
    try { fs.fsyncSync(descriptor); } catch (error) { fail("E_OBSERVATION_FSYNC", `could not fsync Pi observation: ${error.message}`, { streamPath }, { cause: error }); }
  } catch (error) {
    if (error instanceof ExecutionEventWriterError) throw error;
    fail("E_OBSERVATION_WRITE", `could not append Pi observation: ${error.message}`, { streamPath }, { cause: error });
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  if (create) {
    try { flushDirectory(path.dirname(streamPath)); } catch (error) { fail("E_OBSERVATION_FSYNC", `could not persist Pi observation stream creation: ${error.message}`, { streamPath }, { cause: error }); }
  }
}

export function appendObservationEvent({ taskPath, dispatchId, event }) {
  const paths = dispatchEventPaths({ taskPath, dispatchId });
  if (!event || event.dispatch_id !== dispatchId) fail("E_OBSERVATION_IDENTITY", "observation dispatch_id must equal the requested dispatch ID", { dispatchId });
  if (!OBSERVATION_EVENT_TYPE_SET.has(event.event_type)) fail("E_OBSERVATION_SCHEMA", `unsupported Pi observation event type ${event.event_type}`);
  ensureEventDirectory(paths);
  return withDispatchLock(paths.lockPath, () => {
    if (event.event_type === "dispatch_requested") {
      if (fs.lstatSync(paths.streamPath, { throwIfNoEntry: false })) {
        let existing;
        try { existing = readObservationStreamFile(paths.streamPath); } catch (error) {
          if (error.code === "E_OBSERVATION_CORRUPT") throw error;
          fail("E_OBSERVATION_CONFLICT", "dispatch ID is already bound to a different stream", { dispatchId }, { cause: error });
        }
        const proposed = prepareObservationEvent(event, [], dispatchId);
        if (!observationReuseMatches(existing.events[0], proposed)) fail("E_IDEMPOTENCY_CONFLICT", "dispatch ID is already bound to different immutable Pi context", { dispatchId });
        return observationPublicResult(paths, existing, "reused");
      }
      const candidate = prepareObservationEvent(event, [], dispatchId);
      appendObservationDurably(paths.streamPath, `${canonicalObservationJson(candidate)}\n`, { create: true });
      const reread = readObservationStreamFile(paths.streamPath);
      if (reread.events.length !== 1 || reread.events[0].hash !== candidate.hash) fail("E_OBSERVATION_CORRUPT", "Pi observation reread differs from the appended dispatch_requested event", { streamPath: paths.streamPath });
      return { ...observationPublicResult(paths, reread, "recorded"), event: structuredClone(candidate) };
    }

    const current = readObservationStreamFile(paths.streamPath);
    if (current.complete) fail("E_OBSERVATION_TERMINAL", "Pi observation stream is already terminal", { dispatchId });
    const candidate = prepareObservationEvent(event, current.events, dispatchId);
    const next = validateObservationStream([...current.events, candidate]);
    appendObservationDurably(paths.streamPath, `${canonicalObservationJson(candidate)}\n`, { create: false });
    const reread = readObservationStreamFile(paths.streamPath);
    if (reread.events.length !== next.events.length || reread.events.at(-1).hash !== candidate.hash) fail("E_OBSERVATION_CORRUPT", "Pi observation reread differs from the appended event", { streamPath: paths.streamPath });
    return { ...observationPublicResult(paths, reread, "recorded"), event: structuredClone(candidate) };
  });
}

export function readObservationEventStream({ taskPath, dispatchId }) {
  const paths = dispatchEventPaths({ taskPath, dispatchId });
  const state = readObservationStreamFile(paths.streamPath);
  if (state.events[0].dispatch_id !== dispatchId) fail("E_OBSERVATION_IDENTITY", "Pi observation filename does not match dispatch identity", { dispatchId });
  return observationPublicResult(paths, state);
}

export function recoverObservationEventStream({ taskPath, dispatchId }) {
  return readObservationEventStream({ taskPath, dispatchId });
}

export function appendExecutionEvent(request) {
  if (OBSERVATION_EVENT_TYPE_SET.has(request?.event?.event_type)) return appendObservationEvent(request);
  return appendLegacyExecutionEvent(request);
}

export function readExecutionEventStream(request) {
  const paths = dispatchEventPaths(request);
  const stat = fs.lstatSync(paths.streamPath, { throwIfNoEntry: false });
  if (!stat) return readLegacyExecutionEventStream(request);
  const firstLine = fs.readFileSync(paths.streamPath, "utf8").split("\n", 1)[0];
  let firstEvent;
  try { firstEvent = JSON.parse(firstLine); } catch { return readLegacyExecutionEventStream(request); }
  return OBSERVATION_EVENT_TYPE_SET.has(firstEvent?.event_type)
    ? readObservationEventStream(request)
    : readLegacyExecutionEventStream(request);
}

export function recoverExecutionEventStream(request) {
  const stream = readExecutionEventStream(request);
  return stream;
}

function recordingFailure(error, phase, cancellationRequested, cancellationSucceeded) {
  return {
    status: "execution_record_failure",
    phase,
    invocation_allowed: false,
    cancellation_requested: cancellationRequested,
    cancellation_succeeded: cancellationSucceeded,
    error: {
      code: typeof error?.code === "string" ? error.code : "E_EVENT_WRITE",
      message: error instanceof Error ? error.message : String(error),
    },
  };
}

export function recordBeforeSideEffect(writeEvent, sideEffect) {
  if (typeof writeEvent !== "function" || typeof sideEffect !== "function") {
    throw new TypeError("recordBeforeSideEffect requires writeEvent and sideEffect functions");
  }
  let record;
  try {
    record = writeEvent();
  } catch (error) {
    return recordingFailure(error, "before_side_effect", false, false);
  }
  return { status: "side_effect_started", record, value: sideEffect() };
}

export async function recordAfterSideEffect(writeEvent, cancel = null) {
  if (typeof writeEvent !== "function" || (cancel !== null && typeof cancel !== "function")) {
    throw new TypeError("recordAfterSideEffect requires a writeEvent function and optional cancel function");
  }
  try {
    const record = await writeEvent();
    return { status: "recorded", record };
  } catch (error) {
    if (cancel === null) return recordingFailure(error, "after_side_effect", false, false);
    let cancellationSucceeded = false;
    try {
      cancellationSucceeded = await cancel() === true;
    } catch {
      cancellationSucceeded = false;
    }
    return recordingFailure(error, "after_side_effect", true, cancellationSucceeded);
  }
}
