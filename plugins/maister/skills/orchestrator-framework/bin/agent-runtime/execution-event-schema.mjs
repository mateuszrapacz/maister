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
