export const CODEX_EXEC_CAPABILITY_SCHEMA_VERSION = 1;
export const REQUIRED_CODEX_EXEC_CONTROLS = Object.freeze([
  "working_root",
  "model",
  "reasoning_effort",
  "sandbox",
  "jsonl",
  "output_schema",
  "last_message",
  "ignore_user_config",
]);

const TOP_LEVEL_FIELDS = [
  "schema_version",
  "executable",
  "authentication",
  "version",
  "controls",
  "model",
  "reasoning",
];

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

function typed(status, code, message, observation, details = {}) {
  return Object.freeze({
    status,
    observation: structuredClone(observation),
    error: Object.freeze({ code, message, retryable: false, details: Object.freeze(structuredClone(details)) }),
  });
}

function validateObservation(observation) {
  exactFields(observation, TOP_LEVEL_FIELDS, "Codex capability observation");
  if (observation.schema_version !== CODEX_EXEC_CAPABILITY_SCHEMA_VERSION) {
    throw new TypeError(`Codex capability schema_version must be ${CODEX_EXEC_CAPABILITY_SCHEMA_VERSION}`);
  }
  exactFields(observation.executable, ["available", "path"], "Codex executable observation");
  exactFields(observation.authentication, ["available", "authenticated"], "Codex authentication observation");
  exactFields(observation.version, ["value", "allowed"], "Codex version observation");
  exactFields(observation.controls, REQUIRED_CODEX_EXEC_CONTROLS, "Codex control observation");
  exactFields(observation.model, ["available", "supported", "value"], "Codex model observation");
  exactFields(observation.reasoning, ["available", "supported", "value"], "Codex reasoning observation");
  for (const field of ["available", "authenticated"]) {
    if (typeof observation.authentication[field] !== "boolean") throw new TypeError(`authentication.${field} must be boolean`);
  }
  if (typeof observation.executable.available !== "boolean") throw new TypeError("executable.available must be boolean");
  if (!(observation.executable.path === null || (typeof observation.executable.path === "string" && observation.executable.path.length > 0))) {
    throw new TypeError("executable.path must be a non-empty string or null");
  }
  if (typeof observation.version.value !== "string" || observation.version.value.length === 0 || typeof observation.version.allowed !== "boolean") {
    throw new TypeError("version observation is incomplete");
  }
  for (const control of REQUIRED_CODEX_EXEC_CONTROLS) {
    if (typeof observation.controls[control] !== "boolean") throw new TypeError(`controls.${control} must be boolean`);
  }
  for (const field of ["model", "reasoning"]) {
    if (typeof observation[field].available !== "boolean" || typeof observation[field].supported !== "boolean") {
      throw new TypeError(`${field} availability must be boolean`);
    }
    if (!(observation[field].value === null || (typeof observation[field].value === "string" && observation[field].value.length > 0))) {
      throw new TypeError(`${field}.value must be a non-empty string or null`);
    }
  }
  return structuredClone(observation);
}

export function createCodexExecCapabilityInspector({ port } = {}) {
  if (!port || typeof port.inspect !== "function") throw new TypeError("Codex capability inspector requires an injected inspect port");
  return Object.freeze({
    async inspect({ plan } = {}) {
      if (!mapping(plan) || !mapping(plan.policy)) throw new TypeError("Codex capability inspection requires a dispatch plan");
      let observation;
      try {
        observation = validateObservation(await port.inspect({
          schema_version: CODEX_EXEC_CAPABILITY_SCHEMA_VERSION,
          adapter_id: plan.adapter_id,
          host_version: plan.host_version,
          required_model: plan.policy.model,
          required_reasoning_effort: plan.policy.reasoning_effort,
        }));
      } catch (error) {
        return typed("unavailable", "E_CODEX_CAPABILITY_UNAVAILABLE", `Codex capability observation failed: ${error.message}`, {}, {});
      }
      if (!observation.executable.available || observation.executable.path === null) {
        return typed("unavailable", "E_CODEX_EXECUTABLE_UNAVAILABLE", "Codex executable is unavailable", observation);
      }
      if (!observation.authentication.available || !observation.authentication.authenticated) {
        return typed("unavailable", "E_CODEX_AUTH_UNAVAILABLE", "normal Codex authentication is unavailable", observation);
      }
      if (!observation.version.allowed || observation.version.value !== plan.host_version) {
        return typed("unsupported", "E_CODEX_VERSION_UNSUPPORTED", "Codex version is not allowed by the dispatch plan", observation, {
          expected: plan.host_version,
          observed: observation.version.value,
        });
      }
      const unsupportedControls = REQUIRED_CODEX_EXEC_CONTROLS.filter((control) => !observation.controls[control]);
      if (unsupportedControls.length > 0) {
        return typed("unsupported", "E_CODEX_CONTROL_UNSUPPORTED", "Codex exec lacks required deterministic controls", observation, {
          unsupported_controls: unsupportedControls,
        });
      }
      if (!observation.model.available || !observation.model.supported || observation.model.value !== plan.policy.model) {
        return typed("unsupported", "E_CODEX_MODEL_UNSUPPORTED", "the pinned Codex model cannot be enforced", observation, {
          expected: plan.policy.model,
          observed: observation.model.value,
        });
      }
      if (!observation.reasoning.available || !observation.reasoning.supported || observation.reasoning.value !== plan.policy.reasoning_effort) {
        return typed("unsupported", "E_CODEX_REASONING_UNSUPPORTED", "the pinned Codex reasoning effort cannot be enforced", observation, {
          expected: plan.policy.reasoning_effort,
          observed: observation.reasoning.value,
        });
      }
      return Object.freeze({ status: "available", observation: Object.freeze(observation), error: null });
    },
  });
}
