import { validateDispatchPlan } from "../dispatch-contract.mjs";
import { createExecutionEventPayload } from "../execution-event-payload.mjs";
import { recordAfterSideEffect, recordBeforeSideEffect } from "../execution-event-writer.mjs";

export const EXACT_NATIVE_CAPABILITY_SCHEMA_VERSION = 1;

function common(status, nativeIdentity, { output = null, nativeObservations = {}, code = null, message = null } = {}) {
  return { status, observed_native_role_external_id: nativeIdentity, output, native_observations: nativeObservations, error: status === "succeeded" ? null : { code, message, retryable: false } };
}

function validateClosed(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be a mapping`);
  if (Object.keys(value).some((field) => !fields.includes(field)) || fields.some((field) => !Object.hasOwn(value, field))) throw new TypeError(`${label} must use the closed versioned schema`);
}

function validateCapability(value) {
  validateClosed(value, ["schema_version", "exact_launch", "observable_identity"], "native capability observation");
  if (value.schema_version !== 1 || typeof value.exact_launch !== "boolean" || typeof value.observable_identity !== "boolean") throw new TypeError("native capability observation is invalid");
  return value;
}

function validateLaunch(value) {
  validateClosed(value, ["schema_version", "observed_native_role_external_id", "output", "native_observations"], "native launch observation");
  if (value.schema_version !== 1 || typeof value.observed_native_role_external_id !== "string" || value.observed_native_role_external_id.length === 0) throw new TypeError("native launch did not observe an exact identity");
  return value;
}

function recordFailure(recording) {
  return common("failed", null, { code: "E_EXECUTION_RECORD_FAILURE", message: recording.error.message, nativeObservations: { recording_phase: recording.phase, recording_error_code: recording.error.code, recording_error_message: recording.error.message, cancellation_requested: recording.cancellation_requested, cancellation_succeeded: recording.cancellation_succeeded } });
}

function cancelRequest(plan, failedEventType, launchOutcome) {
  return Object.freeze({
    schema_version: 1,
    adapter_id: plan.adapter_id,
    dispatch_id: plan.dispatch_id,
    native_role_external_id: plan.native_role_external_id,
    trigger: "post_launch_durable_write_failure",
    failed_event_type: failedEventType,
    launch_outcome: structuredClone(launchOutcome),
  });
}

export function createExactNativeAdapter({ adapterId, target, nativePort, eventPort, clock = () => new Date().toISOString() } = {}) {
  if (typeof adapterId !== "string" || typeof target !== "string") throw new TypeError("exact native adapter requires identity");
  if (!nativePort || typeof nativePort.inspect !== "function" || typeof nativePort.launch !== "function") throw new TypeError("exact native adapter requires injected inspect and launch ports");
  if (!eventPort || typeof eventPort.append !== "function") throw new TypeError("exact native adapter requires an injected durable event port");
  const payload = (plan, task, eventType, extra = {}) => createExecutionEventPayload({ plan, task, eventType, clock, ...extra });
  const appendAfter = (request, failedEventType, launchOutcome, plan) => recordAfterSideEffect(
    () => eventPort.append(request),
    typeof nativePort.cancel === "function" ? () => nativePort.cancel(cancelRequest(plan, failedEventType, launchOutcome)) : null,
  );
  return async ({ plan: candidatePlan, task } = {}) => {
    const plan = validateDispatchPlan(candidatePlan);
    if (plan.target !== target || plan.adapter_id !== adapterId || typeof plan.native_role_external_id !== "string") throw new TypeError(`${adapterId} adapter received a mismatched dispatch plan`);
    let capability;
    try { capability = validateCapability(await nativePort.inspect({ schema_version: 1, adapter_id: adapterId, host_version: plan.host_version, native_role_external_id: plan.native_role_external_id })); }
    catch (error) { return common("unavailable", null, { code: "E_NATIVE_CAPABILITY_UNAVAILABLE", message: error.message }); }
    if (!capability.exact_launch) return common("unavailable", null, { code: "E_NATIVE_EXACT_LAUNCH_UNAVAILABLE", message: `exact ${adapterId} launch is unavailable` });
    if (!capability.observable_identity) return common("unavailable", null, { code: "E_NATIVE_IDENTITY_UNOBSERVABLE", message: `${adapterId} cannot observe the selected native identity` });
    try { eventPort.append({ taskPath: task.task_path, dispatchId: plan.dispatch_id, event: payload(plan, task, "dispatch_started") }); }
    catch (error) { return recordFailure({ phase: "before_side_effect", cancellation_requested: false, cancellation_succeeded: false, error }); }
    const started = recordBeforeSideEffect(
      () => eventPort.append({ taskPath: task.task_path, dispatchId: plan.dispatch_id, event: payload(plan, task, "attempt_started", { attempt: { number: 1 } }) }),
      () => nativePort.launch({ schema_version: 1, adapter_id: adapterId, native_role_external_id: plan.native_role_external_id, plan, task }),
    );
    if (started.status !== "side_effect_started") return recordFailure(started);
    let launch;
    try { launch = validateLaunch(await started.value); }
    catch (error) {
      const code = "E_NATIVE_LAUNCH_FAILED"; const message = `${adapterId} exact launch failed: ${error.message}`;
      const launchOutcome = { status: "failed", error: { code, message } };
      const attempt = await appendAfter({ taskPath: task.task_path, dispatchId: plan.dispatch_id, event: payload(plan, task, "attempt_completed", { attempt: { number: 1 }, result: { status: "failed", data: { error: { code, message, retryable: false } } } }) }, "attempt_completed", launchOutcome, plan);
      if (attempt.status !== "recorded") return recordFailure(attempt);
      const terminal = await appendAfter({ taskPath: task.task_path, dispatchId: plan.dispatch_id, event: payload(plan, task, "dispatch_terminal", { error: { code, message, retryable: false } }) }, "dispatch_terminal", launchOutcome, plan);
      return terminal.status === "recorded" ? common("failed", null, { code, message }) : recordFailure(terminal);
    }
    const matches = launch.observed_native_role_external_id === plan.native_role_external_id;
    const code = matches ? null : "E_AGENT_WRONG_OBSERVED_IDENTITY";
    const message = matches ? null : "observed native identity differs from the exact dispatch plan";
    const outcome = matches ? { result: { status: "completed", data: { output: launch.output, native_observations: launch.native_observations } } } : { error: { code, message, retryable: false } };
    const attemptOutcome = matches ? outcome : { result: { status: "failed", data: { error: outcome.error, native_observations: launch.native_observations } } };
    const launchOutcome = { status: "observed", observation: launch };
    const attempt = await appendAfter({ taskPath: task.task_path, dispatchId: plan.dispatch_id, event: payload(plan, task, "attempt_completed", { attempt: { number: 1 }, ...attemptOutcome }) }, "attempt_completed", launchOutcome, plan);
    if (attempt.status !== "recorded") return recordFailure(attempt);
    const terminal = await appendAfter({ taskPath: task.task_path, dispatchId: plan.dispatch_id, event: payload(plan, task, "dispatch_terminal", outcome) }, "dispatch_terminal", launchOutcome, plan);
    if (terminal.status !== "recorded") return recordFailure(terminal);
    return matches ? common("succeeded", launch.observed_native_role_external_id, { output: launch.output, nativeObservations: launch.native_observations }) : common("failed", launch.observed_native_role_external_id, { code, message, nativeObservations: launch.native_observations });
  };
}
