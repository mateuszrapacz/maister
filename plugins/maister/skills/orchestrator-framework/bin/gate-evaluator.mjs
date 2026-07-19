import crypto from "node:crypto";

import { validateDispatchPlan, validateDispatchTerminalResult } from "./agent-runtime/dispatch-contract.mjs";
import { canonicalExecutionEventJson } from "./agent-runtime/execution-event-schema.mjs";
import { commitState, readState, StateRepositoryError } from "./orchestrator-state-repository.mjs";

const CONTEXT_FIELDS = [
  "schema_version",
  "phase_id",
  "gate_type",
  "question",
  "options",
  "original_recommendation",
  "policy",
  "safety_classification",
  "context",
];
const RESPONSE_FIELDS = ["selected_option", "rationale", "confidence", "escalate_to_user"];
const POLICIES = new Set(["manual", "advisor", "fully_automatic"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const DENYLIST = new Set([
  "rollback",
  "data-integrity-halt",
  "scope-expansion",
  "unresolved-critical-verification",
  "failure-recovery-skip",
  "final-handoff-approval",
  "implementation-approval",
  "production-go-no-go",
]);

export class GateEvaluationError extends Error {
  constructor(message, code = "INVALID_GATE_EVALUATION") {
    super(message);
    this.name = "GateEvaluationError";
    this.code = code;
  }
}

function fail(message, code) {
  throw new GateEvaluationError(message, code);
}

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, expected, location) {
  if (!isMapping(value)) fail(`${location} must be a mapping`, "INVALID_CONTEXT");
  const expectedSet = new Set(expected);
  const missing = expected.find((field) => !Object.hasOwn(value, field));
  if (missing) fail(`${location} is missing ${missing}`, "INVALID_CONTEXT");
  const unknown = Object.keys(value).find((field) => !expectedSet.has(field));
  if (unknown) fail(`${location} has unknown field ${unknown}`, "INVALID_CONTEXT");
}

function nonEmptyString(value, location, { stable = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) fail(`${location} must be a non-empty NUL-free string`, "INVALID_CONTEXT");
  if (stable && /[\s/\\]/u.test(value)) fail(`${location} must be a stable identifier`, "INVALID_CONTEXT");
}

function validateGateContext(gateContext) {
  exactFields(gateContext, CONTEXT_FIELDS, "gate_context");
  if (gateContext.schema_version !== 1) fail("gate_context.schema_version must be 1", "INVALID_CONTEXT");
  nonEmptyString(gateContext.phase_id, "gate_context.phase_id", { stable: true });
  nonEmptyString(gateContext.gate_type, "gate_context.gate_type", { stable: true });
  nonEmptyString(gateContext.question, "gate_context.question");
  if (!Array.isArray(gateContext.options) || gateContext.options.length === 0) fail("gate_context.options must be a non-empty sequence", "INVALID_CONTEXT");
  gateContext.options.forEach((option, index) => nonEmptyString(option, `gate_context.options[${index}]`));
  if (new Set(gateContext.options).size !== gateContext.options.length) fail("gate_context.options must be unique", "INVALID_CONTEXT");
  nonEmptyString(gateContext.original_recommendation, "gate_context.original_recommendation");
  if (!gateContext.options.includes(gateContext.original_recommendation)) fail("gate_context.original_recommendation must be an exact option", "INVALID_CONTEXT");
  if (!POLICIES.has(gateContext.policy)) fail("gate_context.policy is unsupported", "INVALID_CONTEXT");
  if (gateContext.safety_classification !== "configurable" && gateContext.safety_classification !== "denylisted") fail("gate_context.safety_classification is unsupported", "INVALID_CONTEXT");
  if (!isMapping(gateContext.context)) fail("gate_context.context must be a mapping", "INVALID_CONTEXT");
  return structuredClone(gateContext);
}

function validateRoleDefinition(role, location) {
  exactFields(role, ["logical_role_id", "max_attempts"], location);
  if (role.logical_role_id !== "maister:advisor") fail(`${location}.logical_role_id must be exactly maister:advisor`, "INVALID_ROLE_CONFIG");
  if (!Number.isInteger(role.max_attempts) || role.max_attempts < 1) fail(`${location}.max_attempts must be a positive integer`, "INVALID_ROLE_CONFIG");
}

function validateRoleConfig(roleConfig) {
  exactFields(roleConfig, ["advisor", "arbiter", "arbiter_enabled_on_disagreement", "backoff_ms"], "role_config");
  validateRoleDefinition(roleConfig.advisor, "role_config.advisor");
  validateRoleDefinition(roleConfig.arbiter, "role_config.arbiter");
  if (typeof roleConfig.arbiter_enabled_on_disagreement !== "boolean") fail("role_config.arbiter_enabled_on_disagreement must be boolean", "INVALID_ROLE_CONFIG");
  if (!Number.isInteger(roleConfig.backoff_ms) || roleConfig.backoff_ms < 0) fail("role_config.backoff_ms must be a non-negative integer", "INVALID_ROLE_CONFIG");
  return structuredClone(roleConfig);
}

function idempotencyKey(gateContext) {
  const canonical = JSON.stringify([
    gateContext.phase_id,
    gateContext.gate_type,
    gateContext.question,
    gateContext.options,
  ]);
  return `sha256:${crypto.createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function decisionDispatchId(actor, key) {
  return `gate-${actor}-${crypto.createHash("sha256").update(`${actor}:${key}`, "utf8").digest("hex").slice(0, 24)}`;
}

function attemptDispatchId(actor, key, attempt) {
  return `${decisionDispatchId(actor, key)}-${attempt}`;
}

function blankRole() {
  return {
    logical_role_id: null,
    dispatch_id: null,
    terminal_dispatch: null,
    response: null,
    attempts: [],
    exhausted: false,
  };
}

function createGate(gateContext, key, effectivePolicy, safetyClassification, timestamp, fallbackRationale) {
  return {
    schema_version: 2,
    idempotency_key: key,
    phase_id: gateContext.phase_id,
    gate_type: gateContext.gate_type,
    question: gateContext.question,
    options: structuredClone(gateContext.options),
    original_recommendation: gateContext.original_recommendation,
    configured_policy: gateContext.policy,
    policy: effectivePolicy,
    safety_classification: safetyClassification,
    status: effectivePolicy === "manual" ? "user_pending" : "advisor_pending",
    selected_option: null,
    final_actor: "system",
    rationale: fallbackRationale,
    confidence: null,
    escalate_to_user: false,
    user_override: false,
    error: null,
    advisor: blankRole(),
    arbiter: blankRole(),
    continuation: null,
    provenance_kind: "complete",
    legacy_record: null,
    created_at: timestamp,
    updated_at: timestamp,
    decided_at: null,
  };
}

function findGate(state, key) {
  return state.orchestrator.gate_history.find((gate) => gate.idempotency_key === key) ?? null;
}

function terminal(gate) {
  return gate.status === "decided" || gate.status === "blocked";
}

function directiveFor(gate) {
  if (gate.status === "decided") return "continue";
  if (gate.status === "user_pending") return "user_gate";
  return "blocked";
}

function result(state, gate) {
  return { directive: directiveFor(gate), gate: structuredClone(gate), state: structuredClone(state) };
}

async function commitGate(statePath, key, mutate, { allowCreate = null } = {}) {
  for (let conflictAttempt = 0; conflictAttempt < 4; conflictAttempt += 1) {
    const current = readState(statePath);
    const existing = findGate(current, key);
    if (terminal(existing ?? {})) return { state: current, gate: existing, reused: true };
    if (!existing && allowCreate === null) fail(`gate ${key} is missing`, "GATE_STATE_MISSING");
    try {
      const next = await commitState(statePath, current.orchestrator.revision, (draft) => {
        let gate = findGate(draft, key);
        if (!gate) {
          gate = structuredClone(allowCreate);
          draft.orchestrator.gate_history.push(gate);
        }
        mutate(gate, draft);
      });
      return { state: next, gate: findGate(next, key), reused: false };
    } catch (error) {
      if (!(error instanceof StateRepositoryError) || error.code !== "REVISION_CONFLICT" || conflictAttempt === 3) throw error;
    }
  }
  fail("state revision could not be reconciled", "REVISION_CONFLICT");
}

function validateRoleResponse(rawResponse, allowedOptions) {
  exactFields(rawResponse, RESPONSE_FIELDS, "role_response");
  nonEmptyString(rawResponse.selected_option, "role_response.selected_option");
  if (!allowedOptions.includes(rawResponse.selected_option)) fail("role_response.selected_option is not allowed", "INVALID_ROLE_RESPONSE");
  nonEmptyString(rawResponse.rationale, "role_response.rationale");
  if (!CONFIDENCE.has(rawResponse.confidence)) fail("role_response.confidence is unsupported", "INVALID_ROLE_RESPONSE");
  if (typeof rawResponse.escalate_to_user !== "boolean") fail("role_response.escalate_to_user must be boolean", "INVALID_ROLE_RESPONSE");
  return structuredClone(rawResponse);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function dispatchTask(gateContext, key, actor, attempt, extra = {}) {
  return deepFreeze({
    gate_context: structuredClone(gateContext),
    actor,
    work_item: {
      id: `${key}:${actor}:${attempt.dispatch_id}`,
      actor,
      attempt: attempt.number,
      dispatch_id: attempt.dispatch_id,
      ...structuredClone(extra),
    },
    idempotency_context: {
      idempotency_key: key,
      gate_decision_id: decisionDispatchId(actor, key),
    },
    output_schema: {
      schema_id: "maister.gate-decision.v1",
      fields: structuredClone(RESPONSE_FIELDS),
    },
    bounded_task: "Return only the gate decision response for the supplied read-only gate context.",
  });
}

function latestMachineRecommendation(gate) {
  return gate.arbiter.response?.selected_option ?? gate.advisor.response?.selected_option ?? gate.original_recommendation;
}

async function finishUserGate({ statePath, key, interactive, userPort, gateContext, now }) {
  let state = readState(statePath);
  let gate = findGate(state, key);
  if (terminal(gate)) return result(state, gate);
  if (!interactive) {
    const committed = await commitGate(statePath, key, (draftGate) => {
      draftGate.status = "blocked";
      draftGate.error = draftGate.error ?? "interactive user gate is unavailable";
      draftGate.updated_at = now();
      draftGate.decided_at = draftGate.updated_at;
    });
    return result(committed.state, committed.gate);
  }
  if (!userPort || typeof userPort.presentUserGate !== "function") return result(state, gate);
  const selection = await userPort.presentUserGate(deepFreeze({ gate_context: structuredClone(gateContext), gate: structuredClone(gate) }));
  if (selection === null || selection === undefined) {
    state = readState(statePath);
    return result(state, findGate(state, key));
  }
  if (typeof selection !== "string" || !gate.options.includes(selection)) return result(state, gate);
  const committed = await commitGate(statePath, key, (draftGate) => {
    const machineRecommendation = latestMachineRecommendation(draftGate);
    draftGate.status = "decided";
    draftGate.selected_option = selection;
    draftGate.final_actor = "user";
    draftGate.rationale = "The user selected an exact supplied option.";
    draftGate.confidence = null;
    draftGate.escalate_to_user = false;
    draftGate.user_override = machineRecommendation !== null && selection !== machineRecommendation;
    draftGate.error = null;
    draftGate.updated_at = now();
    draftGate.decided_at = draftGate.updated_at;
  });
  return result(committed.state, committed.gate);
}

async function prepareAttempt({ statePath, key, actor, definition, now }) {
  return commitGate(statePath, key, (gate) => {
    const role = gate[actor];
    role.logical_role_id ??= definition.logical_role_id;
    role.dispatch_id ??= decisionDispatchId(actor, key);
    const unfinished = role.attempts.find((attempt) => attempt.status === "started");
    if (unfinished) {
      unfinished.status = "interrupted";
      unfinished.completed_at = now();
      unfinished.error = "attempt was interrupted before a durable response";
    }
    if (role.attempts.length >= definition.max_attempts) {
      role.exhausted = true;
      return;
    }
    role.attempts.push({
      number: role.attempts.length + 1,
      dispatch_id: attemptDispatchId(actor, key, role.attempts.length + 1),
      terminal_dispatch: null,
      status: "started",
      started_at: now(),
      completed_at: null,
      error: null,
    });
    gate.status = actor === "advisor" ? "advisor_pending" : "arbiter_pending";
    gate.updated_at = now();
  });
}

function durableEvidenceDigest(value) {
  return crypto.createHash("sha256").update(canonicalExecutionEventJson(value), "utf8").digest("hex");
}

function sameDurableEvidence(left, right) {
  return durableEvidenceDigest(left) === durableEvidenceDigest(right);
}

function durableSuccessEvidence(event, terminalResult) {
  if (!isMapping(event.result) || !isMapping(event.result.data) || !Object.hasOwn(event.result.data, "output")) {
    fail("successful dispatch terminal event has no durable output", "INVALID_DISPATCH_RESULT");
  }
  if (!sameDurableEvidence(terminalResult.output, event.result.data.output)) {
    fail("successful dispatch output differs from durable terminal evidence", "INVALID_DISPATCH_RESULT");
  }
  if (terminalResult.adapter_id === "codex.exec") {
    const durableNativeObservations = { ...event.result.data };
    delete durableNativeObservations.output;
    const terminalNativeObservations = structuredClone(terminalResult.native_observations);
    if (Object.hasOwn(terminalNativeObservations, "reused")) {
      if (terminalNativeObservations.reused !== true) fail("Codex reused observation is invalid", "INVALID_DISPATCH_RESULT");
      delete terminalNativeObservations.reused;
    }
    if (!sameDurableEvidence(terminalNativeObservations, durableNativeObservations)) {
      fail("Codex native observations differ from durable terminal evidence", "INVALID_DISPATCH_RESULT");
    }
    return;
  }
  const expectedFields = ["native_observations", "output"];
  if (Object.keys(event.result.data).sort().join(",") !== expectedFields.join(",")) {
    fail("native dispatch terminal event has an invalid durable evidence shape", "INVALID_DISPATCH_RESULT");
  }
  if (!sameDurableEvidence(terminalResult.native_observations, event.result.data.native_observations)) {
    fail("native observations differ from durable terminal evidence", "INVALID_DISPATCH_RESULT");
  }
}

function durableTerminal(stream, terminalResult) {
  if (!isMapping(stream) || stream.complete !== true || !Array.isArray(stream.events)) fail("dispatch stream has no durable terminal result", "INVALID_DISPATCH_RESULT");
  const event = stream.events.at(-1);
  if (!isMapping(event) || event.event_type !== "dispatch_terminal" || event.dispatch_id !== terminalResult.dispatch_id) {
    fail("dispatch stream terminal does not match the dispatch result", "INVALID_DISPATCH_RESULT");
  }
  if (terminalResult.status === "succeeded") {
    if (event.error !== null) fail("successful dispatch has no durable successful terminal event", "INVALID_DISPATCH_RESULT");
    durableSuccessEvidence(event, terminalResult);
    return;
  }
  if (event.error === null || event.result !== null) fail("failed dispatch has no durable failed terminal event", "INVALID_DISPATCH_RESULT");
  if (!sameDurableEvidence(terminalResult.error, event.error)) {
    fail("failed dispatch error differs from durable terminal evidence", "INVALID_DISPATCH_RESULT");
  }
}

async function invokeRole({ statePath, key, actor, definition, runtimePort, allowedOptions, invocationExtra, gateContext, now, wait, backoffMs }) {
  while (true) {
    const prepared = await prepareAttempt({ statePath, key, actor, definition, now });
    if (prepared.reused) return prepared;
    const preparedRole = prepared.gate[actor];
    if (preparedRole.exhausted) return prepared;
    const attempt = preparedRole.attempts.at(-1);
    let validResponse = null;
    let responseError = null;
    let terminalDispatch = null;
    try {
      const plan = validateDispatchPlan(await runtimePort.resolveAgent({
        logical_role_id: preparedRole.logical_role_id,
        dispatch_id: attempt.dispatch_id,
      }));
      if (plan.requested_logical_role_id !== preparedRole.logical_role_id || plan.dispatch_id !== attempt.dispatch_id) {
        fail("resolver returned a dispatch plan for a different gate identity", "INVALID_DISPATCH_RESULT");
      }
      const candidateTerminalDispatch = validateDispatchTerminalResult(await runtimePort.dispatchAgent({
        plan,
        task: dispatchTask(gateContext, key, actor, attempt, invocationExtra),
      }));
      if (candidateTerminalDispatch.dispatch_id !== plan.dispatch_id || candidateTerminalDispatch.requested_logical_role_id !== plan.requested_logical_role_id) {
        fail("dispatcher returned a terminal result for a different dispatch plan", "INVALID_DISPATCH_RESULT");
      }
      const taskPath = gateContext.context.task_path;
      if (typeof taskPath !== "string" || taskPath.length === 0) fail("gate context has no task_path for durable dispatch evidence", "INVALID_DISPATCH_RESULT");
      durableTerminal(runtimePort.readExecutionEventStream({ taskPath, dispatchId: attempt.dispatch_id }), candidateTerminalDispatch);
      terminalDispatch = candidateTerminalDispatch;
      if (terminalDispatch.status === "succeeded") validResponse = validateRoleResponse(terminalDispatch.output, allowedOptions);
      else responseError = terminalDispatch.error.message;
    } catch (error) {
      responseError = error instanceof Error ? error.message : String(error);
    }
    const completed = await commitGate(statePath, key, (gate) => {
      const role = gate[actor];
      const durableAttempt = role.attempts.find((candidate) => candidate.number === attempt.number);
      durableAttempt.status = validResponse ? "completed" : "failed";
      durableAttempt.completed_at = now();
      durableAttempt.error = responseError;
      durableAttempt.terminal_dispatch = terminalDispatch;
      if (validResponse) role.terminal_dispatch = terminalDispatch;
      if (validResponse) role.response = validResponse;
      if (!validResponse && role.attempts.length >= definition.max_attempts) role.exhausted = true;
      gate.updated_at = now();
    });
    if (completed.reused || validResponse || completed.gate[actor].exhausted) return completed;
    const delay = backoffMs * (2 ** Math.max(0, attempt.number - 1));
    if (delay > 0) await wait(delay);
  }
}

async function failClosedAfterRole({ statePath, key, interactive, reason, now }) {
  const committed = await commitGate(statePath, key, (gate) => {
    gate.status = interactive ? "user_pending" : "blocked";
    gate.selected_option = null;
    gate.final_actor = "system";
    gate.rationale = reason;
    gate.confidence = null;
    gate.escalate_to_user = true;
    gate.error = reason;
    gate.updated_at = now();
    gate.decided_at = interactive ? null : gate.updated_at;
  });
  return committed;
}

export async function evaluateGate({
  statePath,
  gateContext,
  roleConfig,
  runtimePort,
  userPort = null,
  automaticContinuationSupported = false,
  interactive = true,
  now = () => new Date().toISOString(),
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  if (typeof statePath !== "string" || statePath.length === 0) fail("statePath must be a non-empty string", "INVALID_STATE_PATH");
  const context = validateGateContext(gateContext);
  const roles = validateRoleConfig(roleConfig);
  if (!isMapping(runtimePort)) fail("runtime_port must be a mapping", "INVALID_RUNTIME_PORT");
  for (const field of ["resolveAgent", "dispatchAgent", "readExecutionEventStream"]) {
    if (typeof runtimePort[field] !== "function") fail(`runtime_port.${field} must be a function`, "INVALID_RUNTIME_PORT");
  }
  if (typeof now !== "function" || typeof wait !== "function") fail("now and wait must be functions", "INVALID_RUNTIME_PORT");
  if (typeof automaticContinuationSupported !== "boolean" || typeof interactive !== "boolean") fail("host capability flags must be boolean", "INVALID_RUNTIME_PORT");

  const key = idempotencyKey(context);
  let state = readState(statePath);
  if (!state.phases.some((phase) => phase.id === context.phase_id)) fail(`phase ${context.phase_id} is not present in state`, "INVALID_PHASE");
  let gate = findGate(state, key);
  if (terminal(gate ?? {})) return result(state, gate);

  const denylisted = DENYLIST.has(context.gate_type);
  const safetyClassification = denylisted ? "denylisted" : "configurable";
  const unsupportedAutomatic = context.policy === "fully_automatic" && !automaticContinuationSupported;
  let effectivePolicy = denylisted || unsupportedAutomatic ? "manual" : context.policy;
  const fallbackRationale = denylisted
    ? "This protected gate is denylisted and requires an explicit user decision."
    : unsupportedAutomatic
      ? "Fully automatic continuation is unsupported by this host; effective policy is manual."
      : null;
  if (!gate) {
    const created = createGate(context, key, effectivePolicy, safetyClassification, now(), fallbackRationale);
    const committed = await commitGate(statePath, key, () => {}, { allowCreate: created });
    state = committed.state;
    gate = committed.gate;
  }
  if (terminal(gate)) return result(state, gate);
  effectivePolicy = gate.policy;

  if (gate.status === "user_pending") {
    return finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now });
  }

  if (effectivePolicy === "manual") {
    const pending = await commitGate(statePath, key, (draftGate) => {
      draftGate.status = "user_pending";
      draftGate.rationale = fallbackRationale;
      draftGate.error = null;
      draftGate.updated_at = now();
    });
    if (pending.reused) return result(pending.state, pending.gate);
    return finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now });
  }

  let advisorState = readState(statePath);
  let advisorGate = findGate(advisorState, key);
  if (advisorGate.advisor.response === null && !advisorGate.advisor.exhausted) {
    const advisorResult = await invokeRole({
      statePath,
      key,
      actor: "advisor",
      definition: roles.advisor,
      runtimePort,
      allowedOptions: context.options,
      invocationExtra: {},
      gateContext: context,
      now,
      wait,
      backoffMs: roles.backoff_ms,
    });
    if (advisorResult.reused) return result(advisorResult.state, advisorResult.gate);
    advisorState = advisorResult.state;
    advisorGate = advisorResult.gate;
  }
  if (advisorGate.advisor.response === null) {
    const failed = await failClosedAfterRole({ statePath, key, interactive, reason: "Advisor retry attempts were exhausted.", now });
    return interactive
      ? finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now })
      : result(failed.state, failed.gate);
  }

  const advisorResponse = advisorGate.advisor.response;
  if (advisorResponse.confidence === "low" || advisorResponse.escalate_to_user) {
    const failed = await failClosedAfterRole({ statePath, key, interactive, reason: advisorResponse.escalate_to_user ? "Advisor escalated the decision to the user." : "Advisor confidence is too low for automatic continuation.", now });
    return interactive
      ? finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now })
      : result(failed.state, failed.gate);
  }

  if (advisorResponse.selected_option === context.original_recommendation) {
    if (effectivePolicy === "advisor") {
      await commitGate(statePath, key, (draftGate) => {
        draftGate.status = "user_pending";
        draftGate.rationale = advisorResponse.rationale;
        draftGate.confidence = advisorResponse.confidence;
        draftGate.updated_at = now();
      });
      return finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now });
    }
    const decided = await commitGate(statePath, key, (draftGate) => {
      draftGate.status = "decided";
      draftGate.selected_option = advisorResponse.selected_option;
      draftGate.final_actor = "advisor";
      draftGate.rationale = advisorResponse.rationale;
      draftGate.confidence = advisorResponse.confidence;
      draftGate.escalate_to_user = false;
      draftGate.error = null;
      draftGate.updated_at = now();
      draftGate.decided_at = draftGate.updated_at;
    });
    return result(decided.state, decided.gate);
  }

  if (!roles.arbiter_enabled_on_disagreement) {
    const failed = await failClosedAfterRole({ statePath, key, interactive, reason: "Advisor disagreement requires an available Arbiter.", now });
    return interactive
      ? finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now })
      : result(failed.state, failed.gate);
  }

  let arbiterState = readState(statePath);
  let arbiterGate = findGate(arbiterState, key);
  if (arbiterGate.arbiter.response === null && !arbiterGate.arbiter.exhausted) {
    const competingOptions = [context.original_recommendation, advisorResponse.selected_option];
    const arbiterResult = await invokeRole({
      statePath,
      key,
      actor: "arbiter",
      definition: roles.arbiter,
      runtimePort,
      allowedOptions: competingOptions,
      invocationExtra: {
        competing_options: competingOptions,
        competing_rationales: ["Original workflow recommendation.", advisorResponse.rationale],
      },
      gateContext: context,
      now,
      wait,
      backoffMs: roles.backoff_ms,
    });
    if (arbiterResult.reused) return result(arbiterResult.state, arbiterResult.gate);
    arbiterState = arbiterResult.state;
    arbiterGate = arbiterResult.gate;
  }
  const arbiterResponse = arbiterGate.arbiter.response;
  if (arbiterResponse === null || arbiterResponse.confidence === "low" || arbiterResponse.escalate_to_user) {
    const reason = arbiterResponse === null
      ? "Arbiter retry attempts were exhausted."
      : arbiterResponse.escalate_to_user
        ? "Arbiter escalated the decision to the user."
        : "Arbiter confidence is too low for automatic continuation.";
    const failed = await failClosedAfterRole({ statePath, key, interactive, reason, now });
    return interactive
      ? finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now })
      : result(failed.state, failed.gate);
  }

  if (effectivePolicy === "advisor") {
    await commitGate(statePath, key, (draftGate) => {
      draftGate.status = "user_pending";
      draftGate.rationale = arbiterResponse.rationale;
      draftGate.confidence = arbiterResponse.confidence;
      draftGate.updated_at = now();
    });
    return finishUserGate({ statePath, key, interactive, userPort, gateContext: context, now });
  }
  const decided = await commitGate(statePath, key, (draftGate) => {
    draftGate.status = "decided";
    draftGate.selected_option = arbiterResponse.selected_option;
    draftGate.final_actor = "arbiter";
    draftGate.rationale = arbiterResponse.rationale;
    draftGate.confidence = arbiterResponse.confidence;
    draftGate.escalate_to_user = false;
    draftGate.error = null;
    draftGate.updated_at = now();
    draftGate.decided_at = draftGate.updated_at;
  });
  return result(decided.state, decided.gate);
}
