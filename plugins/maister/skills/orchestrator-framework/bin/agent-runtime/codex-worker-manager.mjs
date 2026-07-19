import {
  recordAfterSideEffect,
  recordBeforeSideEffect,
} from "./execution-event-writer.mjs";
import crypto from "node:crypto";
import path from "node:path";
import { createExecutionEventPayload, effectivePolicyUnavailable } from "./execution-event-payload.mjs";
import { validateDispatchPlan } from "./dispatch-contract.mjs";

const TASK_FIELDS = [
  "task_path",
  "working_root",
  "role_prompt",
  "bounded_task",
  "output_schema_path",
  "last_message_path",
  "output_schema_id",
  "result_selector",
  "canonical_source_digest",
  "nonce",
  "execution_context",
];
const CONTEXT_FIELDS = ["idempotency_key", "gate_decision_id", "workflow_id", "work_item_id"];
const SHA256 = /^[0-9a-f]{64}$/u;

function mapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields, location) {
  if (!mapping(value)) throw new TypeError(`${location} must be a mapping`);
  const allowed = new Set(fields);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (unknown || missing) throw new TypeError(`${location} has ${unknown ? `unknown field ${unknown}` : `missing field ${missing}`}`);
}

function text(value, location, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new TypeError(`${location} must be a non-empty NUL-free string${nullable ? " or null" : ""}`);
  }
}

function validateTask(candidate) {
  exactFields(candidate, TASK_FIELDS, "Codex worker task");
  for (const field of TASK_FIELDS.filter((field) => !["execution_context", "result_selector"].includes(field))) text(candidate[field], `Codex worker task.${field}`);
  text(candidate.result_selector, "Codex worker task.result_selector", { nullable: true });
  if (!SHA256.test(candidate.canonical_source_digest)) throw new TypeError("canonical_source_digest must be a SHA-256 digest");
  exactFields(candidate.execution_context, CONTEXT_FIELDS, "Codex execution context");
  text(candidate.execution_context.idempotency_key, "execution_context.idempotency_key");
  text(candidate.execution_context.gate_decision_id, "execution_context.gate_decision_id", { nullable: true });
  text(candidate.execution_context.workflow_id, "execution_context.workflow_id");
  text(candidate.execution_context.work_item_id, "execution_context.work_item_id");
  return structuredClone(candidate);
}

function insideDispatchDirectory(taskPath, candidate) {
  const directory = path.resolve(taskPath, "execution", "agent-dispatches");
  const relative = path.relative(directory, path.resolve(candidate));
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function validateArtifactBindings(plan, workerTask) {
  if (workerTask.canonical_source_digest !== plan.role_source_digest) throw new TypeError("Codex role prompt digest is not bound to the dispatch plan");
  if (workerTask.output_schema_id !== plan.policy.output_schema_id) throw new TypeError("Codex output schema identity is not bound to the dispatch plan");
  if (!insideDispatchDirectory(workerTask.task_path, workerTask.output_schema_path)) throw new TypeError("Codex output schema path is outside the private dispatch boundary");
  if (!insideDispatchDirectory(workerTask.task_path, workerTask.last_message_path)) throw new TypeError("Codex last-message path is outside the private dispatch boundary");
}

function observation(status, { output = null, nativeObservations = {}, code = null, message = null } = {}) {
  return {
    status,
    observed_native_role_external_id: null,
    output,
    native_observations: nativeObservations,
    error: status === "succeeded" ? null : { code, message, retryable: false },
  };
}

function failure(code, message, nativeObservations = {}) {
  return observation("failed", { code, message, nativeObservations });
}

function capabilityFailure(result) {
  return observation(result.status === "unavailable" ? "unavailable" : "failed", {
    code: result.error.code,
    message: result.error.message,
    nativeObservations: { capability: result.observation },
  });
}

function sandboxFor(plan) {
  if (plan.policy.filesystem === "read-only") return "read-only";
  if (plan.policy.filesystem === "workspace-write") return "workspace-write";
  throw new TypeError(`unsupported Codex filesystem policy ${plan.policy.filesystem}`);
}

function codexArgs(plan, workerTask) {
  if (plan.policy.model === null || plan.policy.reasoning_effort === null) {
    throw new TypeError("managed Codex workers require pinned model and reasoning effort");
  }
  return [
    "exec",
    "--ignore-user-config",
    "-C",
    workerTask.working_root,
    "-m",
    plan.policy.model,
    "-c",
    `model_reasoning_effort=${JSON.stringify(plan.policy.reasoning_effort)}`,
    "--sandbox",
    sandboxFor(plan),
    "--json",
    "--output-schema",
    workerTask.output_schema_path,
    "--output-last-message",
    workerTask.last_message_path,
    "-",
  ];
}

function codexStdin(plan, workerTask) {
  const contract = {
    canonical_source_digest: workerTask.canonical_source_digest,
    dispatch_id: plan.dispatch_id,
    logical_role_id: plan.requested_logical_role_id,
    manifest_digest: plan.provenance.manifest_digest,
    nonce: workerTask.nonce,
    projection_digest: plan.provenance.projected_tree_digest,
    required_model: plan.policy.model,
    required_reasoning_effort: plan.policy.reasoning_effort,
  };
  return `${workerTask.role_prompt}\n\n## Bounded Task\n\n${workerTask.bounded_task}\n\n## Dispatch Contract\n\n${JSON.stringify(contract)}\n`;
}

function eventPayload(plan, workerTask, eventType, clock, extra = {}) {
  return createExecutionEventPayload({ plan, task: workerTask, eventType, clock, effectivePolicy: effectivePolicyUnavailable(plan.policy), ...extra });
}

function eventError(code, message) {
  return { code, message, retryable: false };
}

function processObservations(processResult) {
  const stdout = typeof processResult.stdout === "string" ? processResult.stdout : "";
  const stderr = typeof processResult.stderr === "string" ? processResult.stderr : "";
  const tail = (value) => value.length <= 8192 ? value : value.slice(-8192);
  return {
    exit_code: processResult.exit_code ?? null,
    signal: processResult.signal ?? null,
    timed_out: processResult.timed_out === true,
    stdout_tail: tail(stdout),
    stderr_tail: tail(stderr),
    stdout_bytes: Buffer.byteLength(stdout),
    stderr_bytes: Buffer.byteLength(stderr),
    stdout_sha256: crypto.createHash("sha256").update(stdout).digest("hex"),
    stderr_sha256: crypto.createHash("sha256").update(stderr).digest("hex"),
    output_truncated: stdout.length > 8192 || stderr.length > 8192,
  };
}

function parseJsonLines(stdout) {
  if (typeof stdout !== "string" || stdout.length === 0 || !stdout.endsWith("\n")) {
    throw new Error("Codex JSONL must be non-empty and newline terminated");
  }
  const lines = stdout.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) throw new Error("Codex JSONL contains an empty line");
  return lines.map((line) => {
    const value = JSON.parse(line);
    if (!mapping(value) || typeof value.type !== "string") throw new Error("Codex JSONL event is not a typed mapping");
    return value;
  });
}

function validateJsonl(events) {
  const threadStarts = events.map((event, index) => ({ event, index })).filter(({ event }) => event.type === "thread.started");
  if (threadStarts.length !== 1 || typeof threadStarts[0].event.thread_id !== "string" || threadStarts[0].event.thread_id.length === 0) {
    throw new Error("Codex JSONL does not expose one stable session identity");
  }
  const sessionId = threadStarts[0].event.thread_id;
  if (events.some((event) => Object.hasOwn(event, "thread_id") && event.thread_id !== sessionId)) {
    throw new Error("Codex JSONL session identity changes during the turn");
  }

  const terminalIndex = events.length - 1;
  const terminal = events[terminalIndex];
  if (terminal?.type !== "turn.completed" || events.filter((event) => event.type === "turn.completed").length !== 1 || !mapping(terminal.usage)) {
    throw new Error("Codex JSONL has no terminal completed turn with usage");
  }
  const turnStartedIndex = events.findIndex((event) => event.type === "turn.started");
  const completedItemIndex = events.findIndex((event) => event.type === "item.completed");
  if (turnStartedIndex <= threadStarts[0].index || completedItemIndex <= turnStartedIndex || completedItemIndex >= terminalIndex) {
    throw new Error("Codex JSONL has invalid terminal turn semantics");
  }
  return { sessionId, eventCount: events.length };
}

function parseFinalOutput(lastMessage) {
  if (typeof lastMessage !== "string" || lastMessage.length === 0) {
    const error = new Error("Codex last-message output is missing");
    error.code = "E_CODEX_TERMINAL_OUTPUT_MISSING";
    throw error;
  }
  let output;
  try {
    output = JSON.parse(lastMessage);
  } catch (cause) {
    const error = new Error(`Codex last-message output is not JSON: ${cause.message}`);
    error.code = "E_CODEX_FINAL_SCHEMA";
    throw error;
  }
  const required = ["logical_role_id", "status", "summary", "details"];
  if (!mapping(output) || Object.keys(output).some((field) => !required.includes(field)) || required.some((field) => !Object.hasOwn(output, field))) {
    const error = new Error("Codex final output does not match the closed role schema");
    error.code = "E_CODEX_FINAL_SCHEMA";
    throw error;
  }
  if (typeof output.logical_role_id !== "string" || !["completed", "blocked", "failed"].includes(output.status) || typeof output.summary !== "string" || output.summary.length === 0 || !mapping(output.details)) {
    const error = new Error("Codex final output has invalid role result fields");
    error.code = "E_CODEX_FINAL_SCHEMA";
    throw error;
  }
  return output;
}

function validateFinalIdentity(output, plan, workerTask, sessionId) {
  const expected = {
    logical_role_id: plan.requested_logical_role_id,
    dispatch_id: plan.dispatch_id,
    session_id: sessionId,
    canonical_source_digest: workerTask.canonical_source_digest,
    manifest_digest: plan.provenance.manifest_digest,
    projection_digest: plan.provenance.projected_tree_digest,
    nonce: workerTask.nonce,
  };
  for (const [field, value] of Object.entries(expected)) {
    const actual = field === "logical_role_id" ? output.logical_role_id : output.details[field];
    if (actual !== value) throw new Error(`Codex final output ${field} differs from the dispatch contract`);
  }
  if (typeof output.details.terminal_output !== "string" || output.details.terminal_output.length === 0) {
    throw new Error("Codex final output has no terminal output observation");
  }
}

function selectOutput(output, selector) {
  if (selector === null) return output;
  if (selector !== "details.gate_response" || !mapping(output.details.gate_response)) throw new Error("Codex final output has no schema-bound gate response");
  return structuredClone(output.details.gate_response);
}

function recordFailure(recording) {
  return failure("E_EXECUTION_RECORD_FAILURE", recording.error.message, {
    recording_phase: recording.phase,
    cancellation_requested: recording.cancellation_requested,
    cancellation_succeeded: recording.cancellation_succeeded,
    recording_error_code: recording.error.code,
  });
}

function reusedStreamObservation(record) {
  if (!record.complete || !Array.isArray(record.events)) {
    return failure("E_EXECUTION_RECORD_INCOMPLETE", "an incomplete idempotent dispatch stream requires recovery", { reused: true });
  }
  const terminal = record.events.at(-1);
  if (!terminal || terminal.event_type !== "dispatch_terminal") {
    return failure("E_EXECUTION_RECORD_INVALID", "the reused dispatch stream has no durable terminal event", { reused: true });
  }
  if (terminal.error) {
    return failure(terminal.error.code, terminal.error.message, { reused: true });
  }
  if (!terminal.result || !mapping(terminal.result.data) || !Object.hasOwn(terminal.result.data, "output")) {
    return failure("E_EXECUTION_RECORD_INVALID", "the reused terminal event has no validated output", { reused: true });
  }
  const { output, ...nativeObservations } = terminal.result.data;
  return observation("succeeded", {
    output,
    nativeObservations: { ...nativeObservations, reused: true },
  });
}

async function appendAfterSpawn(eventPort, request, processHandle) {
  return recordAfterSideEffect(
    () => eventPort.append(request),
    () => processHandle.cancel(),
  );
}

async function finishWithFailure({ plan, workerTask, eventPort, clock, processHandle, code, message, observations }) {
  const attemptRecord = await appendAfterSpawn(eventPort, {
    taskPath: workerTask.task_path,
    dispatchId: plan.dispatch_id,
    event: eventPayload(plan, workerTask, "attempt_completed", clock, {
      attempt: { number: 1 },
      result: {
        status: "failed",
        data: {
          error: eventError(code, message),
          native_observations: observations,
        },
      },
    }),
  }, processHandle);
  if (attemptRecord.status !== "recorded") return recordFailure(attemptRecord);
  const terminalRecord = await appendAfterSpawn(eventPort, {
    taskPath: workerTask.task_path,
    dispatchId: plan.dispatch_id,
    event: eventPayload(plan, workerTask, "dispatch_terminal", clock, {
      error: eventError(code, message),
    }),
  }, processHandle);
  if (terminalRecord.status !== "recorded") return recordFailure(terminalRecord);
  return failure(code, message, observations);
}

function validatedWorkerResult(processResult, plan, workerTask) {
  let jsonl;
  try {
    jsonl = validateJsonl(parseJsonLines(processResult.stdout));
  } catch (cause) {
    const error = new Error(cause.message, { cause });
    error.code = "E_CODEX_JSONL_INVALID";
    throw error;
  }
  let output;
  try {
    output = parseFinalOutput(processResult.last_message);
    if (output.logical_role_id !== plan.requested_logical_role_id) {
      throw new Error("Codex final output violates the role-specific logical_role_id constraint");
    }
  } catch (cause) {
    const error = new Error(cause.message, { cause });
    error.code = cause.code ?? "E_CODEX_FINAL_SCHEMA";
    throw error;
  }
  try {
    validateFinalIdentity(output, plan, workerTask, jsonl.sessionId);
  } catch (cause) {
    const error = new Error(cause.message, { cause });
    error.code = "E_CODEX_IDENTITY_MISMATCH";
    throw error;
  }
  let selectedOutput;
  try {
    selectedOutput = selectOutput(output, workerTask.result_selector);
  } catch (cause) {
    const error = new Error(cause.message, { cause });
    error.code = "E_CODEX_FINAL_SCHEMA";
    throw error;
  }
  return { jsonl, output, selectedOutput };
}

async function recordSuccessfulWorker({ plan, workerTask, eventPort, clock, processHandle, observations, jsonl, output, selectedOutput, policyEvidence }) {
  const nativeObservations = { ...observations, session_id: jsonl.sessionId, jsonl_event_count: jsonl.eventCount, execution_policy_evidence: policyEvidence };
  const attemptRecord = await appendAfterSpawn(eventPort, {
    taskPath: workerTask.task_path,
    dispatchId: plan.dispatch_id,
    event: eventPayload(plan, workerTask, "attempt_completed", clock, {
      attempt: { number: 1 },
      result: { status: output.status, data: { session_id: jsonl.sessionId, jsonl_event_count: jsonl.eventCount, stdout_sha256: observations.stdout_sha256, stderr_sha256: observations.stderr_sha256 } },
    }),
  }, processHandle);
  if (attemptRecord.status !== "recorded") return recordFailure(attemptRecord);
  const terminalRecord = await appendAfterSpawn(eventPort, {
    taskPath: workerTask.task_path,
    dispatchId: plan.dispatch_id,
    event: eventPayload(plan, workerTask, "dispatch_terminal", clock, {
      result: { status: output.status, data: { output: selectedOutput, ...nativeObservations } },
    }),
  }, processHandle);
  if (terminalRecord.status !== "recorded") return recordFailure(terminalRecord);
  return observation("succeeded", { output: selectedOutput, nativeObservations });
}

async function runManagedWorker({ plan, workerTask, processPort, eventPort, capabilityInspector, clock }) {
  const capability = await capabilityInspector.inspect({ plan });
  if (capability.status !== "available") return capabilityFailure(capability);

  let dispatchRecord;
  try {
    dispatchRecord = eventPort.append({
      taskPath: workerTask.task_path,
      dispatchId: plan.dispatch_id,
      event: eventPayload(plan, workerTask, "dispatch_started", clock),
    });
  } catch (error) {
    return recordFailure({
      phase: "before_side_effect",
      cancellation_requested: false,
      cancellation_succeeded: false,
      error: { code: error.code ?? "E_EVENT_WRITE", message: error.message },
    });
  }
  if (dispatchRecord?.status === "reused") return reusedStreamObservation(dispatchRecord);

  const spawnRequest = {
    executable: capability.observation.executable.path,
    args: codexArgs(plan, workerTask),
    cwd: workerTask.working_root,
    stdin: codexStdin(plan, workerTask),
    timeout_ms: plan.policy.timeout_ms,
    max_output_bytes: 8 * 1024 * 1024,
    task_path: workerTask.task_path,
    output_schema_path: workerTask.output_schema_path,
    last_message_path: workerTask.last_message_path,
  };
  const started = recordBeforeSideEffect(
    () => eventPort.append({
      taskPath: workerTask.task_path,
      dispatchId: plan.dispatch_id,
      event: eventPayload(plan, workerTask, "attempt_started", clock, { attempt: { number: 1 } }),
    }),
    () => processPort.spawn(spawnRequest),
  );
  if (started.status !== "side_effect_started") return recordFailure(started);

  let processHandle;
  try {
    processHandle = await started.value;
    if (!processHandle || typeof processHandle.wait !== "function" || typeof processHandle.cancel !== "function") {
      throw new TypeError("Codex process port returned no managed handle");
    }
  } catch (error) {
    const code = "E_CODEX_SPAWN_FAILED";
    const message = `Codex spawn failed: ${error.message}`;
    const nullHandle = { cancel: async () => false };
    return finishWithFailure({ plan, workerTask, eventPort, clock, processHandle: nullHandle, code, message, observations: { spawn_error_code: error.code ?? null } });
  }

  let processResult;
  try {
    processResult = await processHandle.wait();
  } catch (error) {
    return finishWithFailure({
      plan, workerTask, eventPort, clock, processHandle,
      code: "E_CODEX_PROCESS_FAILED",
      message: `Codex process observation failed: ${error.message}`,
      observations: { process_error_code: error.code ?? null },
    });
  }
  const observations = processObservations(processResult);
  if (processResult.output_overflow === true) {
    return finishWithFailure({ plan, workerTask, eventPort, clock, processHandle, code: "E_CODEX_OUTPUT_LIMIT", message: "Codex worker exceeded the bounded output limit", observations });
  }
  if (processResult.timed_out === true) {
    try {
      await processHandle.cancel();
    } catch {
      // The durable timeout outcome is still required when cancellation itself fails.
    }
    return finishWithFailure({ plan, workerTask, eventPort, clock, processHandle, code: "E_CODEX_TIMEOUT", message: "Codex worker timed out", observations });
  }
  if (processResult.exit_code !== 0) {
    return finishWithFailure({ plan, workerTask, eventPort, clock, processHandle, code: "E_CODEX_EXIT_STATUS", message: `Codex worker exited with status ${processResult.exit_code}`, observations });
  }

  let validated;
  try {
    validated = validatedWorkerResult(processResult, plan, workerTask);
  } catch (error) {
    return finishWithFailure({ plan, workerTask, eventPort, clock, processHandle, code: error.code, message: error.message, observations });
  }
  const policyEvidence = {
    requested: { model: plan.policy.model, reasoning_effort: plan.policy.reasoning_effort },
    accepted: { model: capability.observation.model.value, reasoning_effort: capability.observation.reasoning.value },
    observed: { model: null, reasoning_effort: null, status: "unavailable" },
  };
  return recordSuccessfulWorker({ plan, workerTask, eventPort, clock, processHandle, observations, ...validated, policyEvidence });
}

function createLimiter(limit) {
  let active = 0;
  const queue = [];
  const drain = () => {
    while (active < limit && queue.length > 0) {
      active += 1;
      const { operation, resolve, reject } = queue.shift();
      Promise.resolve().then(operation).then(resolve, reject).finally(() => {
        active -= 1;
        drain();
      });
    }
  };
  return (operation) => new Promise((resolve, reject) => {
    queue.push({ operation, resolve, reject });
    drain();
  });
}

export function createCodexWorkerManager({ processPort, eventPort, capabilityInspector, clock = () => new Date().toISOString() } = {}) {
  if (!processPort || typeof processPort.spawn !== "function") throw new TypeError("Codex worker manager requires an injected process port");
  if (!eventPort || typeof eventPort.append !== "function") throw new TypeError("Codex worker manager requires an injected durable event port");
  if (!capabilityInspector || typeof capabilityInspector.inspect !== "function") throw new TypeError("Codex worker manager requires a capability inspector");
  if (typeof clock !== "function") throw new TypeError("Codex worker manager clock must be a function");
  const readOnlyLimiters = new Map();
  const writeLimiters = new Map();
  return Object.freeze({
    run({ plan: candidatePlan, task: candidateTask } = {}) {
      const plan = validateDispatchPlan(candidatePlan);
      if (plan.adapter_id !== "codex.exec" || plan.native_role_external_id !== null) {
        throw new TypeError("Codex worker manager accepts only codex.exec plans with null native identity");
      }
      const workerTask = validateTask(candidateTask);
      validateArtifactBindings(plan, workerTask);
      const operation = () => runManagedWorker({ plan, workerTask, processPort, eventPort, capabilityInspector, clock });
      if (plan.policy.concurrency_class === "read-only-concurrent" && plan.policy.filesystem === "read-only") {
        const key = `${workerTask.working_root}\0${plan.policy.max_parallel}`;
        if (!readOnlyLimiters.has(key)) readOnlyLimiters.set(key, createLimiter(plan.policy.max_parallel));
        return readOnlyLimiters.get(key)(operation);
      }
      if (plan.policy.concurrency_class === "workspace-write-serial" && plan.policy.filesystem === "workspace-write") {
        if (!writeLimiters.has(workerTask.working_root)) writeLimiters.set(workerTask.working_root, createLimiter(1));
        return writeLimiters.get(workerTask.working_root)(operation);
      }
      return Promise.resolve(failure("E_CODEX_CONCURRENCY_UNPROVEN", "Codex concurrency class is not proven by the dispatch plan"));
    },
  });
}
