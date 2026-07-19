import {
  createDispatchTerminalResult,
  DISPATCH_TERMINAL_SCHEMA_VERSION,
  validateDispatchPlan,
} from "./dispatch-contract.mjs";

const OBSERVATION_FIELDS = [
  "status",
  "observed_native_role_external_id",
  "output",
  "native_observations",
  "error",
];
const OBSERVATION_STATUSES = new Set(["succeeded", "failed", "unavailable"]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function terminal(plan, { status, observedNativeRoleExternalId = null, output = null, nativeObservations = {}, error = null }) {
  return createDispatchTerminalResult({
    schema_version: DISPATCH_TERMINAL_SCHEMA_VERSION,
    status,
    dispatch_id: plan.dispatch_id,
    requested_logical_role_id: plan.requested_logical_role_id,
    role_id: plan.role_id,
    target: plan.target,
    adapter_id: plan.adapter_id,
    native_role_external_id: plan.native_role_external_id,
    observed_native_role_external_id: observedNativeRoleExternalId,
    host: plan.host,
    host_version: plan.host_version,
    policy: plan.policy,
    provenance: plan.provenance,
    output,
    native_observations: nativeObservations,
    error,
  });
}

function failure(plan, status, code, message, nativeObservations = {}, observedNativeRoleExternalId = null) {
  return terminal(plan, {
    status,
    nativeObservations,
    observedNativeRoleExternalId,
    error: { code, message, retryable: false },
  });
}

function validateObservation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("adapter observation must be a mapping");
  const allowed = new Set(OBSERVATION_FIELDS);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  const missing = OBSERVATION_FIELDS.find((field) => !Object.hasOwn(value, field));
  if (unknown || missing) throw new TypeError(`adapter observation has ${unknown ? `unknown field ${unknown}` : `missing field ${missing}`}`);
  if (!OBSERVATION_STATUSES.has(value.status)) throw new TypeError(`unsupported adapter observation status ${value.status}`);
  if (!(value.observed_native_role_external_id === null || (typeof value.observed_native_role_external_id === "string" && value.observed_native_role_external_id.length > 0))) {
    throw new TypeError("observed native identity must be a non-empty string or null");
  }
  if (value.status === "succeeded" && value.error !== null) throw new TypeError("successful adapter observation cannot contain an error");
  if (value.status !== "succeeded") {
    if (!value.error || typeof value.error.code !== "string" || typeof value.error.message !== "string" || typeof value.error.retryable !== "boolean") {
      throw new TypeError("failed adapter observation requires a typed error");
    }
  }
  return value;
}

export async function dispatchAgent({ plan: candidatePlan, task, adapters } = {}) {
  const plan = validateDispatchPlan(candidatePlan);
  const adapter = adapters && Object.hasOwn(adapters, plan.adapter_id) ? adapters[plan.adapter_id] : null;
  if (typeof adapter !== "function") {
    return failure(plan, "unavailable", "E_AGENT_UNAVAILABLE", `exact adapter ${plan.adapter_id} is unavailable`);
  }

  let observation;
  try {
    observation = validateObservation(await adapter({
      plan,
      task: deepFreeze(structuredClone(task ?? null)),
    }));
  } catch (error) {
    return failure(plan, "failed", "E_AGENT_ADAPTER_FAILURE", `exact adapter ${plan.adapter_id} failed: ${error.message}`);
  }

  if (observation.observed_native_role_external_id !== plan.native_role_external_id) {
    return failure(
      plan,
      "failed",
      "E_AGENT_WRONG_OBSERVED_IDENTITY",
      "observed native identity differs from the exact dispatch plan",
      observation.native_observations,
      observation.observed_native_role_external_id,
    );
  }
  return terminal(plan, {
    status: observation.status,
    observedNativeRoleExternalId: observation.observed_native_role_external_id,
    output: observation.output,
    nativeObservations: observation.native_observations,
    error: observation.error,
  });
}
