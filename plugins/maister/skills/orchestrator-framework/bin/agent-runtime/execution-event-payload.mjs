export function effectivePolicyUnavailable(requestedPolicy) {
  return {
    ...structuredClone(requestedPolicy),
    model: null,
    reasoning_effort: null,
  };
}

export function createExecutionEventPayload({
  plan,
  task,
  eventType,
  clock,
  effectivePolicy = plan.policy,
  attempt = null,
  result = null,
  error = null,
}) {
  const now = clock();
  return {
    event_type: eventType,
    idempotency_key: task.execution_context.idempotency_key,
    dispatch_id: plan.dispatch_id,
    gate_decision_id: task.execution_context.gate_decision_id,
    workflow_id: task.execution_context.workflow_id,
    work_item_id: task.execution_context.work_item_id,
    logical_role_id: plan.requested_logical_role_id,
    canonical_source_digest: task.canonical_source_digest,
    manifest_digest: plan.provenance.manifest_digest,
    projection_digest: plan.provenance.projected_tree_digest,
    adapter_id: plan.adapter_id,
    native_role_external_id: plan.native_role_external_id,
    host: plan.host,
    host_version: plan.host_version,
    requested_execution_policy: structuredClone(plan.policy),
    effective_execution_policy: structuredClone(effectivePolicy),
    occurred_at: now,
    recorded_at: now,
    attempt,
    result,
    error,
  };
}

import crypto from "node:crypto";

export const OBSERVATION_PAYLOAD_LIMITS = Object.freeze({
  maxUpdates: 128,
  maxEventBytes: 16 * 1024,
  maxPayloadBytes: 12 * 1024,
  currentTool: 128,
  currentToolArgs: 2048,
  recentOutput: 4096,
  recentToolPair: 1024,
  recentTools: 16,
  warning: 256,
  warnings: 8,
});

const ANSI_ESCAPE = /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;
const SENSITIVE_KEY = /(?:password|passphrase|secret|token|api[-_]?key|authorization|cookie|credential|private[-_]?key|raw[-_]?transcript|transcript|session[-_]?content|auth[-_]?content|cookie[-_]?jar|^auth$|^authentication$|^session$)/iu;
const SENSITIVE_ASSIGNMENT = /((?:password|passphrase|secret|token|api[-_]?key|authorization|cookie|credential|private[-_]?key|auth|authentication|session)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^,;}\r\n]+)/giu;
const PATH_KEY = /^(?:path|taskPath|outputPath|sessionFile|cwd)$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_SANITIZE_DEPTH = 16;

function truncateUtf8(value, maximumBytes) {
  const text = String(value);
  if (Buffer.byteLength(text, "utf8") <= maximumBytes) return { value: text, truncated: false };
  let end = Math.max(0, maximumBytes);
  while (end > 0) {
    const candidate = text.slice(0, end);
    if (Buffer.byteLength(candidate, "utf8") <= maximumBytes) return { value: candidate, truncated: true };
    end -= 1;
  }
  return { value: "", truncated: true };
}

function scrubString(value, roots = {}) {
  let text = String(value).normalize("NFC").replace(ANSI_ESCAPE, "").replace(CONTROL_CHARS, "");
  const replacements = [
    [roots.home, "$PI_AGENT_ROOT"],
    [roots.agentRoot, "$PI_AGENT_ROOT"],
    [roots.sessionRoot, "$PI_SESSION_ROOT"],
  ].filter(([prefix]) => typeof prefix === "string" && prefix.length > 0)
    .sort(([left], [right]) => right.length - left.length);
  for (const [prefix, replacement] of replacements) text = text.split(prefix).join(replacement);
  text = text.replace(SENSITIVE_ASSIGNMENT, "$1[REDACTED]");
  return text;
}

function boundedPath(value, roots) {
  const text = scrubString(value, roots);
  if (SHA256.test(text) || text.startsWith("$PI_AGENT_ROOT") || text.startsWith("$PI_SESSION_ROOT")) return text;
  if (text.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(text) || text.startsWith("\\\\")) {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
  }
  const normalized = text.replaceAll("\\", "/");
  if (normalized.split("/").includes("..")) {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
  }
  return normalized;
}

function sensitiveKey(key) {
  return SENSITIVE_KEY.test(key);
}

export function sanitizeObservationValue(value, { roots = {}, maximumBytes = null, location = "payload" } = {}) {
  let truncated = false;
  const seen = new WeakSet();
  const visit = (candidate, key = location, depth = 0) => {
    if (sensitiveKey(key)) return "[REDACTED]";
    if (depth > MAX_SANITIZE_DEPTH) return "[REDACTED]";
    if (typeof candidate === "string") return PATH_KEY.test(key) ? boundedPath(candidate, roots) : scrubString(candidate, roots);
    if (candidate === null || typeof candidate === "boolean") return candidate;
    if (typeof candidate === "number") return Number.isFinite(candidate) ? candidate : null;
    if (Array.isArray(candidate)) {
      if (seen.has(candidate)) return "[REDACTED]";
      seen.add(candidate);
      const result = candidate.map((entry) => visit(entry, key, depth + 1));
      seen.delete(candidate);
      return result;
    }
    if (candidate && typeof candidate === "object") {
      if (seen.has(candidate)) return "[REDACTED]";
      seen.add(candidate);
      const result = Object.fromEntries(Object.entries(candidate).map(([entryKey, entry]) => [entryKey, visit(entry, entryKey, depth + 1)]));
      seen.delete(candidate);
      return result;
    }
    return null;
  };
  let sanitized = visit(value);
  if (maximumBytes !== null && Buffer.byteLength(JSON.stringify(sanitized), "utf8") > maximumBytes) {
    const original = JSON.stringify(sanitized);
    const digest = crypto.createHash("sha256").update(original, "utf8").digest("hex");
    sanitized = { truncated: true, sha256: digest };
    truncated = true;
  }
  return { value: sanitized, truncated };
}

function boundedString(value, maximumBytes, roots) {
  const scrubbed = scrubString(value, roots);
  return truncateUtf8(scrubbed, maximumBytes);
}

function boundedToolPair(value, roots) {
  const sanitized = sanitizeObservationValue(value, { roots }).value;
  const result = truncateUtf8(JSON.stringify(sanitized), OBSERVATION_PAYLOAD_LIMITS.recentToolPair);
  if (!result.truncated) return { value: sanitized, truncated: false };
  return { value: { truncated: true, summary: result.value }, truncated: true };
}

export function sanitizeObservationUpdate(update = {}, { roots = {} } = {}) {
  if (update === null || typeof update !== "object" || Array.isArray(update)) {
    throw new TypeError("Pi delegation update must be a mapping");
  }
  const result = {};
  let truncated = false;
  if (Object.hasOwn(update, "currentTool")) {
    const bounded = boundedString(update.currentTool, OBSERVATION_PAYLOAD_LIMITS.currentTool, roots);
    result.currentTool = bounded.value;
    truncated ||= bounded.truncated;
  }
  if (Object.hasOwn(update, "currentToolArgs")) {
    const source = typeof update.currentToolArgs === "string" ? update.currentToolArgs : JSON.stringify(update.currentToolArgs);
    const bounded = boundedString(source, OBSERVATION_PAYLOAD_LIMITS.currentToolArgs, roots);
    result.currentToolArgs = bounded.value;
    truncated ||= bounded.truncated;
  }
  if (Object.hasOwn(update, "recentOutput")) {
    const bounded = boundedString(update.recentOutput, OBSERVATION_PAYLOAD_LIMITS.recentOutput, roots);
    result.recentOutput = bounded.value;
    truncated ||= bounded.truncated;
  }
  if (Array.isArray(update.recentTools)) {
    result.recentTools = [];
    update.recentTools.slice(0, OBSERVATION_PAYLOAD_LIMITS.recentTools).forEach((tool) => {
      const bounded = boundedToolPair(tool, roots);
      result.recentTools.push(bounded.value);
      truncated ||= bounded.truncated;
    });
    truncated ||= update.recentTools.length > OBSERVATION_PAYLOAD_LIMITS.recentTools;
  }
  if (update.counters && typeof update.counters === "object" && !Array.isArray(update.counters)) {
    result.counters = Object.fromEntries(Object.entries(update.counters)
      .filter(([, value]) => Number.isSafeInteger(value) && value >= 0)
      .map(([key, value]) => [key, value]));
  }
  if (Array.isArray(update.warnings)) {
    result.warnings = update.warnings.slice(0, OBSERVATION_PAYLOAD_LIMITS.warnings).map((warning) => boundedString(warning, OBSERVATION_PAYLOAD_LIMITS.warning, roots).value);
    truncated ||= update.warnings.length > OBSERVATION_PAYLOAD_LIMITS.warnings || result.warnings.some((warning, index) => warning !== update.warnings[index]);
  }
  for (const key of ["path", "taskPath", "outputPath", "cwd", "digest"]) {
    if (Object.hasOwn(update, key)) {
      result[key] = sanitizeObservationValue(update[key], { roots, location: key }).value;
    }
  }
  if (update.truncated === true) truncated = true;
  if (truncated) result.truncated = true;
  const bounded = sanitizeObservationValue(result, { roots, maximumBytes: OBSERVATION_PAYLOAD_LIMITS.maxPayloadBytes, location: "update" });
  if (bounded.truncated) return { truncated: true, sha256: crypto.createHash("sha256").update(JSON.stringify(result), "utf8").digest("hex") };
  return result;
}

export function createObservationEventPayload({
  plan,
  task,
  eventType,
  status,
  payload = {},
  observedAgent = null,
  clock = () => new Date().toISOString(),
  streamId = plan.dispatch_id,
  eventId = crypto.randomUUID(),
} = {}) {
  if (!plan || typeof plan !== "object") throw new TypeError("observation payload requires a dispatch plan");
  const roots = {
    home: task?.home ?? process.env.HOME,
    agentRoot: task?.agent_root ?? task?.agentRoot,
    sessionRoot: task?.session_root ?? task?.sessionRoot,
  };
  const eventPayload = eventType === "update" || task?.session_id === undefined
    ? payload
    : { ...payload, session_id: task.session_id };
  const sanitized = eventType === "update"
    ? sanitizeObservationUpdate(eventPayload, { roots })
    : sanitizeObservationValue(eventPayload, { roots, maximumBytes: OBSERVATION_PAYLOAD_LIMITS.maxPayloadBytes }).value;
  const event = {
    schema_version: 1,
    stream_id: streamId,
    event_id: eventId,
    event_type: eventType,
    occurred_at: clock(),
    dispatch_id: plan.dispatch_id,
    request_id: plan.dispatch_id,
    target: "pi",
    adapter_id: "pi.native",
    protocol_version: 1,
    logical_role_id: plan.requested_logical_role_id,
    requested_agent: plan.requested_logical_role_id,
    observed_agent: observedAgent,
    status,
    payload: sanitized,
    previous_hash: null,
  };
  const retryOf = task?.retry_of ?? plan.retry_of;
  if (retryOf !== undefined) event.retry_of = retryOf;
  return event;
}
