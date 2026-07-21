import crypto from "node:crypto";

export const EXECUTION_EVENT_SCHEMA_VERSION = 1;
export const EXECUTION_EVENT_TYPES = Object.freeze([
  "dispatch_started",
  "attempt_started",
  "attempt_completed",
  "dispatch_terminal",
]);

const EVENT_FIELDS = [
  "schema_version",
  "event_type",
  "sequence",
  "previous_event_digest",
  "event_digest",
  "idempotency_key",
  "dispatch_id",
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
  "occurred_at",
  "recorded_at",
  "attempt",
  "result",
  "error",
];
const POLICY_FIELDS = [
  "execution_profile_id",
  "tools",
  "filesystem",
  "network",
  "model",
  "reasoning_effort",
  "timeout_ms",
  "output_schema_id",
  "concurrency_class",
  "max_parallel",
];
const STREAM_IDENTITY_FIELDS = [
  "idempotency_key",
  "dispatch_id",
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
const SHA256 = /^[0-9a-f]{64}$/u;

export class ExecutionEventValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ExecutionEventValidationError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function fail(code, message, details = {}) {
  throw new ExecutionEventValidationError(code, message, details);
}

function isMapping(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value, fields, location, { omitted = [] } = {}) {
  if (!isMapping(value)) fail("E_EVENT_SCHEMA", `${location} must be a mapping`, { location });
  const omittedSet = new Set(omitted);
  const allowed = new Set(fields.filter((field) => !omittedSet.has(field)));
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) fail("E_EVENT_SCHEMA", `${location} has unknown field ${unknown}`, { location, field: unknown });
  const missing = [...allowed].find((field) => !Object.hasOwn(value, field));
  if (missing) fail("E_EVENT_SCHEMA", `${location} is missing ${missing}`, { location, field: missing });
}

function nonEmptyString(value, location, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    fail("E_EVENT_SCHEMA", `${location} must be a non-empty NUL-free string${nullable ? " or null" : ""}`, { location });
  }
}

function timestamp(value, location) {
  nonEmptyString(value, location);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("E_EVENT_SCHEMA", `${location} must be a canonical ISO-8601 timestamp`, { location, value });
  }
}

function digest(value, location, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("E_EVENT_DIGEST", `${location} must be a lowercase SHA-256 digest${nullable ? " or null" : ""}`, { location, value });
  }
}

function validateJsonValue(value, location) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("E_EVENT_SCHEMA", `${location} must contain finite JSON numbers`, { location });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateJsonValue(entry, `${location}[${index}]`));
    return;
  }
  if (!isMapping(value)) fail("E_EVENT_SCHEMA", `${location} must contain only JSON values`, { location });
  for (const [key, entry] of Object.entries(value)) {
    nonEmptyString(key, `${location} key`);
    validateJsonValue(entry, `${location}.${key}`);
  }
}

function validatePolicy(value, location) {
  exactFields(value, POLICY_FIELDS, location);
  nonEmptyString(value.execution_profile_id, `${location}.execution_profile_id`);
  if (!Array.isArray(value.tools) || value.tools.length === 0) {
    fail("E_EVENT_SCHEMA", `${location}.tools must be a non-empty sequence`, { location: `${location}.tools` });
  }
  value.tools.forEach((tool, index) => nonEmptyString(tool, `${location}.tools[${index}]`));
  if (new Set(value.tools).size !== value.tools.length) {
    fail("E_EVENT_SCHEMA", `${location}.tools must be unique`, { location: `${location}.tools` });
  }
  nonEmptyString(value.filesystem, `${location}.filesystem`);
  nonEmptyString(value.network, `${location}.network`);
  nonEmptyString(value.model, `${location}.model`, { nullable: true });
  nonEmptyString(value.reasoning_effort, `${location}.reasoning_effort`, { nullable: true });
  if (!Number.isInteger(value.timeout_ms) || value.timeout_ms <= 0) {
    fail("E_EVENT_SCHEMA", `${location}.timeout_ms must be a positive integer`, { location: `${location}.timeout_ms` });
  }
  nonEmptyString(value.output_schema_id, `${location}.output_schema_id`);
  nonEmptyString(value.concurrency_class, `${location}.concurrency_class`);
  if (!Number.isInteger(value.max_parallel) || value.max_parallel <= 0) {
    fail("E_EVENT_SCHEMA", `${location}.max_parallel must be a positive integer`, { location: `${location}.max_parallel` });
  }
}

function validateAttempt(value, eventType) {
  if (eventType === "dispatch_started" || eventType === "dispatch_terminal") {
    if (value !== null) fail("E_EVENT_SCHEMA", `${eventType}.attempt must be null`, { eventType });
    return;
  }
  exactFields(value, ["number"], "event.attempt");
  if (!Number.isInteger(value.number) || value.number <= 0) {
    fail("E_EVENT_SCHEMA", "event.attempt.number must be a positive integer", { value: value.number });
  }
}

function validateResult(value, location) {
  if (value === null) return;
  exactFields(value, ["status", "data"], location);
  nonEmptyString(value.status, `${location}.status`);
  validateJsonValue(value.data, `${location}.data`);
}

function validateError(value, location) {
  if (value === null) return;
  exactFields(value, ["code", "message", "retryable"], location);
  nonEmptyString(value.code, `${location}.code`);
  nonEmptyString(value.message, `${location}.message`);
  if (typeof value.retryable !== "boolean") fail("E_EVENT_SCHEMA", `${location}.retryable must be boolean`, { location });
}

function validateOutcome(event) {
  validateResult(event.result, "event.result");
  validateError(event.error, "event.error");
  const hasResult = event.result !== null;
  const hasError = event.error !== null;
  if (event.event_type === "dispatch_started" || event.event_type === "attempt_started") {
    if (hasResult || hasError) fail("E_EVENT_SCHEMA", `${event.event_type} cannot contain a result or error`, { eventType: event.event_type });
    return;
  }
  if (hasResult === hasError) {
    fail("E_EVENT_SCHEMA", `${event.event_type} must contain exactly one result or error`, { eventType: event.event_type });
  }
}

function validateDistinctIdentities(event) {
  const identities = [
    ["dispatch_id", event.dispatch_id],
    ["idempotency_key", event.idempotency_key],
    ["work_item_id", event.work_item_id],
    ["gate_decision_id", event.gate_decision_id],
    ["logical_role_id", event.logical_role_id],
  ].filter(([, value]) => value !== null);
  for (let index = 0; index < identities.length; index += 1) {
    const conflict = identities.slice(index + 1).find(([, value]) => value === identities[index][1]);
    if (conflict) {
      fail("E_EVENT_IDENTITY", `${identities[index][0]} and ${conflict[0]} must remain distinct`, {
        fields: [identities[index][0], conflict[0]],
      });
    }
  }
}

function validateEventShape(event, { omitDigest = false } = {}) {
  exactFields(event, EVENT_FIELDS, "event", { omitted: omitDigest ? ["event_digest"] : [] });
  if (event.schema_version !== EXECUTION_EVENT_SCHEMA_VERSION) {
    fail("E_EVENT_SCHEMA", `event.schema_version must be ${EXECUTION_EVENT_SCHEMA_VERSION}`, { value: event.schema_version });
  }
  if (!EXECUTION_EVENT_TYPES.includes(event.event_type)) {
    fail("E_EVENT_SCHEMA", `unsupported event type ${event.event_type}`, { value: event.event_type });
  }
  if (!Number.isInteger(event.sequence) || event.sequence < 0) {
    fail("E_EVENT_SEQUENCE", "event.sequence must be a non-negative integer", { value: event.sequence });
  }
  digest(event.previous_event_digest, "event.previous_event_digest", { nullable: true });
  if (!omitDigest) digest(event.event_digest, "event.event_digest");
  for (const field of [
    "idempotency_key", "dispatch_id", "workflow_id", "work_item_id", "logical_role_id",
    "adapter_id", "host", "host_version",
  ]) nonEmptyString(event[field], `event.${field}`);
  nonEmptyString(event.gate_decision_id, "event.gate_decision_id", { nullable: true });
  nonEmptyString(event.native_role_external_id, "event.native_role_external_id", { nullable: true });
  for (const field of ["canonical_source_digest", "manifest_digest", "projection_digest"]) digest(event[field], `event.${field}`);
  validatePolicy(event.requested_execution_policy, "event.requested_execution_policy");
  validatePolicy(event.effective_execution_policy, "event.effective_execution_policy");
  timestamp(event.occurred_at, "event.occurred_at");
  timestamp(event.recorded_at, "event.recorded_at");
  validateAttempt(event.attempt, event.event_type);
  validateOutcome(event);
  validateDistinctIdentities(event);
}

export function canonicalExecutionEventJson(value) {
  validateJsonValue(value, "canonical value");
  if (Array.isArray(value)) return `[${value.map(canonicalExecutionEventJson).join(",")}]`;
  if (isMapping(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalExecutionEventJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function executionEventDigest(event) {
  if (!isMapping(event)) fail("E_EVENT_SCHEMA", "event must be a mapping", { location: "event" });
  const payload = { ...event };
  delete payload.event_digest;
  return crypto.createHash("sha256").update(canonicalExecutionEventJson(payload), "utf8").digest("hex");
}

export function createExecutionEvent(eventWithoutDigest) {
  validateEventShape(eventWithoutDigest, { omitDigest: true });
  const event = { ...structuredClone(eventWithoutDigest) };
  event.event_digest = executionEventDigest(event);
  return validateExecutionEvent(event);
}

export function validateExecutionEvent(event) {
  validateEventShape(event);
  const expectedDigest = executionEventDigest(event);
  if (event.event_digest !== expectedDigest) {
    fail("E_EVENT_DIGEST", "event.event_digest does not match the canonical event bytes", {
      expected: expectedDigest,
      actual: event.event_digest,
    });
  }
  return structuredClone(event);
}

function sameIdentity(first, event) {
  return STREAM_IDENTITY_FIELDS.every((field) => canonicalExecutionEventJson(first[field]) === canonicalExecutionEventJson(event[field]));
}

function streamState(events, { requireTerminal = false } = {}) {
  if (!Array.isArray(events) || events.length === 0) fail("E_EVENT_SEQUENCE", "execution event stream must not be empty");
  let openAttempt = null;
  let completedAttempts = 0;
  let nextAttempt = 1;
  let terminal = false;
  for (const [index, candidate] of events.entries()) {
    const event = validateExecutionEvent(candidate);
    if (event.sequence !== index) fail("E_EVENT_SEQUENCE", `event ${index} has non-monotonic sequence`, { index, actual: event.sequence });
    const expectedPrevious = index === 0 ? null : events[index - 1].event_digest;
    if (event.previous_event_digest !== expectedPrevious) {
      fail("E_EVENT_DIGEST", `event ${index} breaks previous-event digest continuity`, { index });
    }
    if (index === 0 && event.event_type !== "dispatch_started") {
      fail("E_EVENT_SEQUENCE", "execution event stream must begin with dispatch_started");
    }
    if (index > 0 && !sameIdentity(events[0], event)) {
      fail("E_EVENT_IDENTITY", `event ${index} changes immutable dispatch identity`, { index });
    }
    if (index === 0) continue;
    if (terminal) fail("E_EVENT_TERMINAL", "events cannot follow dispatch_terminal", { index });
    if (event.event_type === "dispatch_started") fail("E_EVENT_SEQUENCE", "dispatch_started may occur only once", { index });
    if (event.event_type === "attempt_started") {
      if (openAttempt !== null || event.attempt.number !== nextAttempt) {
        fail("E_EVENT_SEQUENCE", "attempt_started must open the next ordered attempt", { index, expectedAttempt: nextAttempt });
      }
      openAttempt = event.attempt.number;
      continue;
    }
    if (event.event_type === "attempt_completed") {
      if (openAttempt === null || event.attempt.number !== openAttempt) {
        fail("E_EVENT_SEQUENCE", "attempt_completed must close the active attempt", { index, openAttempt });
      }
      openAttempt = null;
      completedAttempts += 1;
      nextAttempt += 1;
      continue;
    }
    if (openAttempt !== null || completedAttempts === 0) {
      fail("E_EVENT_SEQUENCE", "dispatch_terminal requires at least one completed attempt and no active attempt", { index });
    }
    terminal = true;
  }
  if (requireTerminal && !terminal) fail("E_EVENT_TERMINAL", "execution event stream is incomplete");
  const nextEventTypes = terminal
    ? []
    : openAttempt === null
      ? completedAttempts === 0 ? ["attempt_started"] : ["attempt_started", "dispatch_terminal"]
      : ["attempt_completed"];
  return { complete: terminal, openAttempt, completedAttempts, nextAttempt, nextEventTypes };
}

export function validateExecutionEventStream(events, options = {}) {
  const state = streamState(events, options);
  return { events: structuredClone(events), ...state };
}

// Pi owns a deliberately separate observation vocabulary.  The legacy event
// vocabulary above remains available to the existing process adapters; Pi
// observations use this schema so a host event can never be mistaken for a
// portable Maister execution record.
export const MAISTER_OBSERVATION_SCHEMA_VERSION = 1;
export const OBSERVATION_EVENT_SCHEMA_VERSION = MAISTER_OBSERVATION_SCHEMA_VERSION;
export const MAISTER_OBSERVATION_EVENT_TYPES = Object.freeze([
  "dispatch_requested",
  "started",
  "update",
  "cancel_requested",
  "response_observed",
  "terminal",
  "failure",
  "process_lost",
]);
export const MAISTER_OBSERVATION_TERMINAL_STATUSES = Object.freeze([
  "completed",
  "failed",
  "timed_out",
  "cancelled",
  "interrupted",
  "turn_budget_exhausted",
  "tool_budget_exhausted",
  "acceptance_failed",
  "invalid_request",
  "unavailable_context",
  "identity_mismatch",
  "durable_write_failed",
  "process_lost",
]);

const OBSERVATION_EVENT_FIELDS = [
  "schema_version",
  "stream_id",
  "event_id",
  "sequence",
  "event_type",
  "occurred_at",
  "dispatch_id",
  "request_id",
  "target",
  "adapter_id",
  "protocol_version",
  "logical_role_id",
  "requested_agent",
  "observed_agent",
  "status",
  "payload",
  "previous_hash",
  "hash",
];
const OBSERVATION_NON_TERMINAL_STATUSES = new Set(["requested", "started", "update", "cancel_requested"]);
const OBSERVATION_TERMINAL_EVENTS = new Set(["terminal", "failure", "process_lost"]);
const OBSERVATION_ROLE_ID = /^maister:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const OBSERVATION_SHA256 = /^[0-9a-f]{64}$/u;

export class MaisterObservationValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MaisterObservationValidationError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function observationFail(code, message, details = {}) {
  throw new MaisterObservationValidationError(code, message, details);
}

function observationMapping(value, location) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    observationFail("E_OBSERVATION_SCHEMA", `${location} must be a mapping`, { location });
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    observationFail("E_OBSERVATION_SCHEMA", `${location} must be a plain mapping`, { location });
  }
}

function observationString(value, location, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    observationFail("E_OBSERVATION_SCHEMA", `${location} must be a non-empty NUL-free string${nullable ? " or null" : ""}`, { location });
  }
}

function observationTimestamp(value, location) {
  observationString(value, location);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    observationFail("E_OBSERVATION_SCHEMA", `${location} must be an RFC3339 UTC timestamp with milliseconds`, { location, value });
  }
}

function observationJson(value, location) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) observationFail("E_OBSERVATION_SCHEMA", `${location} contains a non-finite number`, { location });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => observationJson(entry, `${location}[${index}]`));
    return;
  }
  observationMapping(value, location);
  for (const [key, entry] of Object.entries(value)) {
    observationString(key, `${location} key`);
    observationJson(entry, `${location}.${key}`);
  }
}

function observationExactFields(value, fields, location, { optional = [] } = {}) {
  observationMapping(value, location);
  const allowed = new Set([...fields, ...optional]);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) observationFail("E_OBSERVATION_SCHEMA", `${location} has unknown field ${unknown}`, { location, field: unknown });
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) observationFail("E_OBSERVATION_SCHEMA", `${location} is missing ${missing}`, { location, field: missing });
}

function observationDigest(value, location, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !OBSERVATION_SHA256.test(value)) {
    observationFail("E_OBSERVATION_DIGEST", `${location} must be a lowercase SHA-256 digest${nullable ? " or null" : ""}`, { location, value });
  }
}

function observationEventShape(event, { omitHash = false } = {}) {
  const requiredFields = OBSERVATION_EVENT_FIELDS.filter((field) => field !== "observed_agent" && !(omitHash && field === "hash"));
  const optionalFields = ["observed_agent", "retry_of", ...(omitHash ? ["hash"] : [])];
  observationExactFields(event, requiredFields, "observation event", { optional: optionalFields });
  if (event.schema_version !== MAISTER_OBSERVATION_SCHEMA_VERSION) observationFail("E_OBSERVATION_SCHEMA", "observation schema_version must be 1");
  if (!MAISTER_OBSERVATION_EVENT_TYPES.includes(event.event_type)) observationFail("E_OBSERVATION_SCHEMA", `unsupported observation event type ${event.event_type}`);
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 0) observationFail("E_OBSERVATION_SEQUENCE", "observation sequence must be a non-negative safe integer");
  observationString(event.stream_id, "observation stream_id");
  observationString(event.event_id, "observation event_id");
  observationString(event.dispatch_id, "observation dispatch_id");
  observationString(event.request_id, "observation request_id");
  if (event.request_id !== event.dispatch_id) observationFail("E_OBSERVATION_IDENTITY", "request_id must equal dispatch_id");
  if (event.retry_of !== undefined) {
    if (!/^[a-z0-9][a-z0-9-]{0,127}$/u.test(event.retry_of) || event.retry_of === event.dispatch_id) {
      observationFail("E_OBSERVATION_IDENTITY", "retry_of must identify a different path-safe dispatch");
    }
  }
  if (event.target !== "pi" || event.adapter_id !== "pi.native") observationFail("E_OBSERVATION_IDENTITY", "observation target must be pi/pi.native");
  if (event.protocol_version !== 1) observationFail("E_OBSERVATION_PROTOCOL", "observation protocol_version must be 1");
  if (!OBSERVATION_ROLE_ID.test(event.logical_role_id) || event.requested_agent !== event.logical_role_id) {
    observationFail("E_OBSERVATION_IDENTITY", "requested agent must be the exact maister:<role> identity");
  }
  if (event.observed_agent !== undefined && event.observed_agent !== null && !OBSERVATION_ROLE_ID.test(event.observed_agent)) {
    observationFail("E_OBSERVATION_IDENTITY", "observed_agent must be an exact maister:<role> identity or null");
  }
  const allowedStatuses = new Set([...OBSERVATION_NON_TERMINAL_STATUSES, ...MAISTER_OBSERVATION_TERMINAL_STATUSES]);
  if (typeof event.status !== "string" || !allowedStatuses.has(event.status)) observationFail("E_OBSERVATION_STATUS", `unsupported observation status ${event.status}`);
  if (event.event_type === "dispatch_requested" && event.status !== "requested") observationFail("E_OBSERVATION_STATUS", "dispatch_requested must use requested status");
  if (event.event_type === "started" && event.status !== "started") observationFail("E_OBSERVATION_STATUS", "started must use started status");
  if (event.event_type === "update" && event.status !== "update") observationFail("E_OBSERVATION_STATUS", "update must use update status");
  if (event.event_type === "cancel_requested" && event.status !== "cancel_requested") observationFail("E_OBSERVATION_STATUS", "cancel_requested must use cancel_requested status");
  if (event.event_type === "response_observed" && !MAISTER_OBSERVATION_TERMINAL_STATUSES.includes(event.status)) observationFail("E_OBSERVATION_STATUS", "response_observed must carry a terminal status");
  if (OBSERVATION_TERMINAL_EVENTS.has(event.event_type) && !MAISTER_OBSERVATION_TERMINAL_STATUSES.includes(event.status)) observationFail("E_OBSERVATION_STATUS", `${event.event_type} must carry a terminal status`);
  observationTimestamp(event.occurred_at, "observation occurred_at");
  observationJson(event.payload, "observation payload");
  if (Buffer.byteLength(canonicalObservationJson(event), "utf8") > 16 * 1024) observationFail("E_OBSERVATION_SIZE", "canonical observation event exceeds 16 KiB");
  if (event.previous_hash !== null) observationDigest(event.previous_hash, "observation previous_hash");
  if (!omitHash) observationDigest(event.hash, "observation hash");
}

export function canonicalObservationJson(value) {
  observationJson(value, "canonical observation value");
  if (Array.isArray(value)) return `[${value.map(canonicalObservationJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalObservationJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function observationEventDigest(event) {
  observationMapping(event, "observation event");
  const withoutHash = { ...event };
  delete withoutHash.hash;
  const previous = event.previous_hash === null ? "" : event.previous_hash;
  return crypto.createHash("sha256").update(`${previous}\n${canonicalObservationJson(withoutHash)}`, "utf8").digest("hex");
}

export function createObservationEvent(eventWithoutHash) {
  observationEventShape(eventWithoutHash, { omitHash: true });
  const event = { ...structuredClone(eventWithoutHash), hash: observationEventDigest(eventWithoutHash) };
  return validateObservationEvent(event);
}

export function validateObservationEvent(event) {
  observationEventShape(event);
  const expected = observationEventDigest(event);
  if (event.hash !== expected) observationFail("E_OBSERVATION_DIGEST", "observation hash does not match canonical bytes", { expected, actual: event.hash });
  return structuredClone(event);
}

function sameObservationIdentity(first, candidate) {
  return ["stream_id", "dispatch_id", "request_id", "target", "adapter_id", "protocol_version", "logical_role_id", "requested_agent"].every((field) => first[field] === candidate[field])
    && (first.retry_of ?? null) === (candidate.retry_of ?? null);
}

export function validateObservationStream(events, { requireTerminal = false } = {}) {
  if (!Array.isArray(events) || events.length === 0) observationFail("E_OBSERVATION_SEQUENCE", "observation stream must not be empty");
  const seenEventIds = new Set();
  let started = false;
  let responseObserved = false;
  let cancelRequested = false;
  let terminal = false;
  let updates = 0;
  for (const [index, candidate] of events.entries()) {
    const event = validateObservationEvent(candidate);
    if (event.sequence !== index) observationFail("E_OBSERVATION_SEQUENCE", `observation ${index} has a non-monotonic sequence`);
    if (seenEventIds.has(event.event_id)) observationFail("E_OBSERVATION_SEQUENCE", "observation event_id is duplicated");
    seenEventIds.add(event.event_id);
    const previous = index === 0 ? null : events[index - 1];
    if (event.previous_hash !== (previous?.hash ?? null)) observationFail("E_OBSERVATION_DIGEST", `observation ${index} breaks hash continuity`);
    if (index === 0 && event.event_type !== "dispatch_requested") observationFail("E_OBSERVATION_SEQUENCE", "observation stream must begin with dispatch_requested");
    if (index > 0 && !sameObservationIdentity(events[0], event)) observationFail("E_OBSERVATION_IDENTITY", `observation ${index} changes immutable dispatch identity`);
    if (terminal) observationFail("E_OBSERVATION_SEQUENCE", "events cannot follow a terminal observation");
    if (index > 0 && event.event_type === "dispatch_requested") observationFail("E_OBSERVATION_SEQUENCE", "dispatch_requested may occur only once");
    if (event.event_type === "started") {
      if (started) observationFail("E_OBSERVATION_SEQUENCE", "started may occur only once");
      if (responseObserved) observationFail("E_OBSERVATION_SEQUENCE", "started must precede response observations");
      started = true;
    }
    if (event.event_type === "update") {
      if (!started || responseObserved) observationFail("E_OBSERVATION_SEQUENCE", "update requires an active started dispatch");
      updates += 1;
      if (updates > 128) observationFail("E_OBSERVATION_LIMIT", "observation stream contains more than 128 updates");
    }
    if (event.event_type === "cancel_requested") {
      if (responseObserved) observationFail("E_OBSERVATION_SEQUENCE", "cancellation must precede the response observation");
      if (cancelRequested) observationFail("E_OBSERVATION_SEQUENCE", "cancel_requested may occur only once");
      cancelRequested = true;
    }
    if (event.event_type === "response_observed") {
      if ((!started && !(cancelRequested && event.status === "cancelled")) || responseObserved) {
        observationFail("E_OBSERVATION_SEQUENCE", "response requires an active started dispatch or a queued cancellation");
      }
      responseObserved = true;
    }
    if (OBSERVATION_TERMINAL_EVENTS.has(event.event_type)) terminal = true;
  }
  if (requireTerminal && !terminal) observationFail("E_OBSERVATION_TERMINAL", "observation stream is incomplete");
  const nextEventTypes = terminal
    ? []
    : responseObserved
      ? ["terminal"]
      : started
        ? ["update", "cancel_requested", "response_observed", "terminal", "process_lost"]
        : cancelRequested
          ? ["response_observed", "terminal", "process_lost"]
        : ["started", "process_lost"];
  return { events: structuredClone(events), complete: terminal, updateCount: updates, nextEventTypes };
}
