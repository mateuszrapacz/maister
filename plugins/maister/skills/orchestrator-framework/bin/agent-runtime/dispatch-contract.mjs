export const DISPATCH_PLAN_SCHEMA_VERSION = 1;
export const DISPATCH_TERMINAL_SCHEMA_VERSION = 1;

const PLAN_FIELDS = [
  "schema_version",
  "dispatch_id",
  "requested_logical_role_id",
  "role_id",
  "role_source_digest",
  "target",
  "representation",
  "adapter_id",
  "native_role_external_id",
  "host",
  "host_version",
  "policy",
  "provenance",
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
const PROVENANCE_FIELDS = [
  "receipt_id",
  "receipt_path",
  "projection_schema_version",
  "projector_version",
  "canonical_set_digest",
  "manifest_digest",
  "projected_tree_digest",
];
const TERMINAL_FIELDS = [
  "schema_version",
  "status",
  "dispatch_id",
  "requested_logical_role_id",
  "role_id",
  "target",
  "adapter_id",
  "native_role_external_id",
  "observed_native_role_external_id",
  "host",
  "host_version",
  "policy",
  "provenance",
  "output",
  "native_observations",
  "error",
];
const SAFE_DISPATCH_ID = /^[a-z0-9][a-z0-9-]{0,127}$/u;
const LOGICAL_ROLE_ID = /^maister:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const ROLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "unavailable"]);

export class DispatchContractValidationError extends Error {
  constructor(code, message, details = {}) {
    super(`[${code}] ${message}`);
    this.name = "DispatchContractValidationError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function fail(code, message, details = {}) {
  throw new DispatchContractValidationError(code, message, details);
}

function mapping(value, location, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code, `${location} must be a mapping`, { location });
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, `${location} must be a plain mapping`, { location });
  }
}

function exactFields(value, fields, location, code) {
  mapping(value, location, code);
  const allowed = new Set(fields);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) fail(code, `${location} has unknown field ${unknown}`, { location, field: unknown });
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) fail(code, `${location} is missing ${missing}`, { location, field: missing });
}

function text(value, location, code, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    fail(code, `${location} must be a non-empty NUL-free string${nullable ? " or null" : ""}`, { location });
  }
}

function jsonValue(value, location, code) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(code, `${location} contains a non-finite number`, { location });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => jsonValue(entry, `${location}[${index}]`, code));
    return;
  }
  mapping(value, location, code);
  Object.entries(value).forEach(([key, entry]) => {
    text(key, `${location} key`, code);
    jsonValue(entry, `${location}.${key}`, code);
  });
}

function policy(value, location, code) {
  exactFields(value, POLICY_FIELDS, location, code);
  text(value.execution_profile_id, `${location}.execution_profile_id`, code);
  if (!Array.isArray(value.tools) || value.tools.length === 0 || new Set(value.tools).size !== value.tools.length) {
    fail(code, `${location}.tools must be a non-empty unique sequence`, { location: `${location}.tools` });
  }
  value.tools.forEach((tool, index) => text(tool, `${location}.tools[${index}]`, code));
  text(value.filesystem, `${location}.filesystem`, code);
  text(value.network, `${location}.network`, code);
  text(value.model, `${location}.model`, code, { nullable: true });
  text(value.reasoning_effort, `${location}.reasoning_effort`, code, { nullable: true });
  if (!Number.isInteger(value.timeout_ms) || value.timeout_ms <= 0) fail(code, `${location}.timeout_ms must be positive`, { location });
  text(value.output_schema_id, `${location}.output_schema_id`, code);
  text(value.concurrency_class, `${location}.concurrency_class`, code);
  if (!Number.isInteger(value.max_parallel) || value.max_parallel <= 0) fail(code, `${location}.max_parallel must be positive`, { location });
}

function provenance(value, location, code) {
  exactFields(value, PROVENANCE_FIELDS, location, code);
  text(value.receipt_id, `${location}.receipt_id`, code);
  text(value.receipt_path, `${location}.receipt_path`, code);
  if (!Number.isSafeInteger(value.projection_schema_version) || value.projection_schema_version < 1) {
    fail(code, `${location}.projection_schema_version must be positive`, { location });
  }
  text(value.projector_version, `${location}.projector_version`, code);
  for (const field of ["canonical_set_digest", "manifest_digest", "projected_tree_digest"]) {
    if (typeof value[field] !== "string" || !SHA256.test(value[field])) fail(code, `${location}.${field} must be a SHA-256 digest`, { location, field });
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function validateDispatchPlan(candidate) {
  const code = "E_DISPATCH_PLAN_SCHEMA";
  exactFields(candidate, PLAN_FIELDS, "dispatch plan", code);
  if (candidate.schema_version !== DISPATCH_PLAN_SCHEMA_VERSION) fail(code, `dispatch plan schema_version must be ${DISPATCH_PLAN_SCHEMA_VERSION}`);
  if (!SAFE_DISPATCH_ID.test(candidate.dispatch_id)) fail(code, "dispatch_id must be a lowercase path-safe identifier", { dispatch_id: candidate.dispatch_id });
  if (!LOGICAL_ROLE_ID.test(candidate.requested_logical_role_id)) fail(code, "requested_logical_role_id is not exact", { logical_role_id: candidate.requested_logical_role_id });
  if (!ROLE_ID.test(candidate.role_id) || candidate.requested_logical_role_id !== `maister:${candidate.role_id}`) {
    fail(code, "role_id must exactly match requested_logical_role_id", { role_id: candidate.role_id });
  }
  if (typeof candidate.role_source_digest !== "string" || !SHA256.test(candidate.role_source_digest)) fail(code, "role_source_digest must be a SHA-256 digest");
  for (const field of ["target", "representation", "adapter_id", "host", "host_version"]) text(candidate[field], `dispatch plan.${field}`, code);
  text(candidate.native_role_external_id, "dispatch plan.native_role_external_id", code, { nullable: true });
  policy(candidate.policy, "dispatch plan.policy", code);
  provenance(candidate.provenance, "dispatch plan.provenance", code);
  return deepFreeze(structuredClone(candidate));
}

export function createDispatchPlan(candidate) {
  return validateDispatchPlan(candidate);
}

function terminalError(value, code) {
  if (value === null) return;
  exactFields(value, ["code", "message", "retryable"], "terminal result.error", code);
  text(value.code, "terminal result.error.code", code);
  text(value.message, "terminal result.error.message", code);
  if (typeof value.retryable !== "boolean") fail(code, "terminal result.error.retryable must be boolean");
}

export function validateDispatchTerminalResult(candidate) {
  const code = "E_DISPATCH_TERMINAL_SCHEMA";
  exactFields(candidate, TERMINAL_FIELDS, "terminal result", code);
  if (candidate.schema_version !== DISPATCH_TERMINAL_SCHEMA_VERSION) fail(code, `terminal result schema_version must be ${DISPATCH_TERMINAL_SCHEMA_VERSION}`);
  if (!TERMINAL_STATUSES.has(candidate.status)) fail(code, `unsupported terminal status ${candidate.status}`, { status: candidate.status });
  if (!SAFE_DISPATCH_ID.test(candidate.dispatch_id)) fail(code, "terminal dispatch_id must be path-safe");
  if (!LOGICAL_ROLE_ID.test(candidate.requested_logical_role_id) || candidate.requested_logical_role_id !== `maister:${candidate.role_id}`) {
    fail(code, "terminal logical identity is inconsistent");
  }
  for (const field of ["target", "adapter_id", "host", "host_version"]) text(candidate[field], `terminal result.${field}`, code);
  text(candidate.native_role_external_id, "terminal result.native_role_external_id", code, { nullable: true });
  text(candidate.observed_native_role_external_id, "terminal result.observed_native_role_external_id", code, { nullable: true });
  policy(candidate.policy, "terminal result.policy", code);
  provenance(candidate.provenance, "terminal result.provenance", code);
  jsonValue(candidate.output, "terminal result.output", code);
  jsonValue(candidate.native_observations, "terminal result.native_observations", code);
  terminalError(candidate.error, code);
  if (candidate.status === "succeeded" && candidate.error !== null) fail(code, "successful terminal result cannot contain an error");
  if (candidate.status !== "succeeded" && candidate.error === null) fail(code, "non-success terminal result requires an error");
  return deepFreeze(structuredClone(candidate));
}

export function createDispatchTerminalResult(candidate) {
  return validateDispatchTerminalResult(candidate);
}
