import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  CODEX_EXEC_CAPABILITY_SCHEMA_VERSION,
  REQUIRED_CODEX_EXEC_CONTROLS,
} from "../../../skills/orchestrator-framework/bin/agent-runtime/codex-exec-capabilities.mjs";

export const SUPPORTED_CODEX_HOST_VERSION = "0.145.0";

const OWNER_FIELDS = Object.freeze([
  "schema_version",
  "operation",
  "target",
  "home",
  "state_root",
  "working_root",
  "state_path",
  "plugin_source_root",
]);
const RESOLVER_INSPECT_FIELDS = Object.freeze(["schema_version", "adapter_id"]);
const DISPATCH_INSPECT_FIELDS = Object.freeze([
  ...RESOLVER_INSPECT_FIELDS,
  "host_version",
  "required_model",
  "required_reasoning_effort",
]);
const VERSION_PATTERN = /\b(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?\b/u;
const CONTROL_PATTERNS = Object.freeze({
  working_root: /(?:^|\s)(?:-C|--cd)(?:\s|,|$)/mu,
  model: /(?:^|\s)(?:-m|--model)(?:\s|,|$)/mu,
  reasoning_effort: /model_reasoning_effort|(?:^|\s)(?:-c|--config)(?:\s|,|$)/mu,
  sandbox: /--sandbox\b/u,
  jsonl: /(?:^|\s)--json(?:\s|,|$)/mu,
  output_schema: /--output-schema\b/u,
  last_message: /--output-last-message\b/u,
  ignore_user_config: /--ignore-user-config\b/u,
});

function mapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields, label) {
  if (!mapping(value)) throw new TypeError(`${label} must be a mapping`);
  const allowed = new Set(fields);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (unknown || missing) throw new TypeError(`${label} has ${unknown ? `unknown field ${unknown}` : `missing field ${missing}`}`);
}

function boundedPath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096 || value.includes("\0")) {
    throw new TypeError(`${label} must be a bounded NUL-free path`);
  }
  return value;
}

function parseVersion(output) {
  const match = VERSION_PATTERN.exec(output);
  return match ? match[0] : "unknown";
}

function versionAllowed(value) {
  return value === SUPPORTED_CODEX_HOST_VERSION;
}

function executableFromPath(command, env) {
  if (path.isAbsolute(command)) {
    const stat = fs.statSync(command, { throwIfNoEntry: false });
    return stat?.isFile() ? fs.realpathSync(command) : null;
  }
  for (const directory of (env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, command);
    const stat = fs.statSync(candidate, { throwIfNoEntry: false });
    if (stat?.isFile()) return fs.realpathSync(candidate);
  }
  return null;
}

function defaultRun(command, args, { env, cwd, timeoutMs, input = "" } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    input,
    timeout: timeoutMs,
    killSignal: "SIGTERM",
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
    timedOut: result.signal !== null && result.signal !== undefined,
  };
}

function failedResult() {
  return { status: 1, stdout: "", stderr: "", error: null, timedOut: false };
}

function runCommand(run, command, args, options) {
  try {
    return run(command, args, options);
  } catch {
    return failedResult();
  }
}

function policyFor(request) {
  const policy = request?.requested_execution_policy;
  const model = policy?.model?.model;
  const reasoningEffort = policy?.reasoning?.effort;
  if (typeof model !== "string" || model.length === 0 || typeof reasoningEffort !== "string" || reasoningEffort.length === 0) {
    throw new TypeError("Codex invocation request requires a pinned model and reasoning effort");
  }
  return { model, reasoning_effort: reasoningEffort };
}

function structuredBehaviorFor(request) {
  if (request?.logical_role_id !== "maister:advisor" || !request.expected_behavior?.includes("\n")) return null;
  const fields = Object.fromEntries(request.expected_behavior.split("\n").map((line) => {
    const separator = line.indexOf(": ");
    if (separator < 1) throw new TypeError("Codex advisor behavior must use key-value lines");
    const key = line.slice(0, separator);
    const raw = line.slice(separator + 2);
    let value = raw;
    if (raw === "true") value = true;
    else if (raw === "false") value = false;
    else if (raw.startsWith('"') && raw.endsWith('"')) value = JSON.parse(raw);
    return [key, value];
  }));
  return fields;
}

function invocationSchema(request) {
  const constant = (value) => ({
    type: value === null ? "null" : Array.isArray(value) ? "array" : typeof value,
    const: value,
  });
  const structuredBehavior = structuredBehaviorFor(request);
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "logical_role_id",
      "prompt_digest",
      "canonical_prompt_digest",
      "nonce",
      "output_schema",
      "canonical_set_digest",
      "manifest_digest",
      "projected_tree_digest",
      "dispatch_id",
      "session_id",
      "behavior",
    ],
    properties: {
      logical_role_id: constant(request.logical_role_id),
      prompt_digest: constant(request.prompt_digest),
      canonical_prompt_digest: constant(request.canonical_prompt_digest),
      nonce: constant(request.nonce),
      output_schema: constant(request.output_schema),
      canonical_set_digest: constant(request.canonical_set_digest),
      manifest_digest: constant(request.manifest_digest),
      projected_tree_digest: constant(request.projected_tree_digest),
      dispatch_id: constant(request.dispatch_id),
      session_id: { type: "string", minLength: 1 },
      behavior: structuredBehavior
        ? {
          type: "object",
          additionalProperties: false,
          required: Object.keys(structuredBehavior),
          properties: Object.fromEntries(Object.entries(structuredBehavior).map(([key, value]) => [key, constant(value)])),
        }
        : constant(request.expected_behavior),
    },
  };
}

function parseJsonLines(stdout) {
  if (typeof stdout !== "string" || stdout.length === 0 || !stdout.endsWith("\n")) {
    throw new Error("Codex E6 JSONL must be non-empty and newline terminated");
  }
  const events = stdout.slice(0, -1).split("\n").map((line) => JSON.parse(line));
  if (events.some((event) => !mapping(event) || typeof event.type !== "string")) {
    throw new Error("Codex E6 JSONL contains an untyped event");
  }
  const starts = events.filter((event) => event.type === "thread.started");
  if (starts.length !== 1 || typeof starts[0].thread_id !== "string" || starts[0].thread_id.length === 0) {
    throw new Error("Codex E6 JSONL does not expose one session identity");
  }
  const sessionId = starts[0].thread_id;
  if (events.some((event) => Object.hasOwn(event, "thread_id") && event.thread_id !== sessionId)) {
    throw new Error("Codex E6 JSONL session identity changed during invocation");
  }
  const terminal = events.at(-1);
  if (terminal?.type !== "turn.completed" || events.filter((event) => event.type === "turn.completed").length !== 1) {
    throw new Error("Codex E6 JSONL has no terminal completed turn");
  }
  const startIndex = events.findIndex((event) => event.type === "thread.started");
  const turnStartedIndex = events.findIndex((event) => event.type === "turn.started");
  const completedItemIndex = events.findIndex((event) => event.type === "item.completed");
  if (turnStartedIndex <= startIndex || completedItemIndex <= turnStartedIndex || completedItemIndex >= events.length - 1) {
    throw new Error("Codex E6 JSONL has invalid turn semantics");
  }
  return sessionId;
}

function invocationPrompt(request) {
  const structuredBehavior = structuredBehaviorFor(request);
  return [
    request.prompt,
    "",
    "This is a read-only Maister Codex E6 conformance probe.",
    "Do not inspect files, do not use tools, and do not modify any state.",
    "Return exactly one JSON object matching the supplied output schema.",
    structuredBehavior
      ? `The behavior field must be an object with these exact fields and values: ${JSON.stringify(structuredBehavior)}.`
      : `The behavior field must equal this exact string, including line breaks:\n${request.expected_behavior}`,
    `The exact bound request is ${JSON.stringify({
      logical_role_id: request.logical_role_id,
      prompt_digest: request.prompt_digest,
      canonical_prompt_digest: request.canonical_prompt_digest,
      nonce: request.nonce,
      output_schema: request.output_schema,
      canonical_set_digest: request.canonical_set_digest,
      manifest_digest: request.manifest_digest,
      projected_tree_digest: request.projected_tree_digest,
      dispatch_id: request.dispatch_id,
      expected_behavior: request.expected_behavior,
    })}.`,
  ].join("\n");
}

export function createCodexExecInvocationPort({
  command = process.env.MAISTER_CODEX_EXECUTABLE ?? "codex",
  home = process.env.HOME ?? process.cwd(),
  env = process.env,
  cwd = process.cwd(),
  timeoutMs = 120_000,
  run = defaultRun,
} = {}) {
  boundedPath(home, "home");
  boundedPath(cwd, "cwd");
  if (typeof command !== "string" || command.length === 0 || command.includes("\0")) throw new TypeError("command must be a non-empty NUL-free string");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new TypeError("timeoutMs must be between 1 and 120000");
  const childEnv = Object.freeze({ ...env, HOME: home });
  return Object.freeze({
    invoke(request) {
      const policy = policyFor(request);
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-e6-"));
      const schemaPath = path.join(tempRoot, "output-schema.json");
      const lastMessagePath = path.join(tempRoot, "last-message.json");
      try {
        fs.writeFileSync(schemaPath, JSON.stringify(invocationSchema(request)), { encoding: "utf8", mode: 0o600 });
        const args = [
          "exec",
          "--ignore-user-config",
          "--ignore-rules",
          "--ephemeral",
          "-C",
          cwd,
          "-m",
          policy.model,
          "-c",
          `model_reasoning_effort=${JSON.stringify(policy.reasoning_effort)}`,
          "--sandbox",
          "read-only",
          "--json",
          "--output-schema",
          schemaPath,
          "--output-last-message",
          lastMessagePath,
          "-",
        ];
        const result = run(command, args, {
          env: childEnv,
          cwd,
          timeoutMs,
          input: invocationPrompt(request),
          output_last_message_path: lastMessagePath,
        });
        if (result?.timedOut === true || result?.error?.code === "ETIMEDOUT") {
          const error = new Error("Codex E6 invocation timed out");
          error.kind = "E_HOST_PROBE_TIMEOUT";
          throw error;
        }
        if (result?.status !== 0) {
          const error = new Error(`Codex E6 invocation exited with status ${result?.status ?? 1}`);
          error.code = "codex-invocation-failed";
          throw error;
        }
        const sessionId = parseJsonLines(result.stdout);
        const lastMessage = fs.readFileSync(lastMessagePath, "utf8");
        const observation = JSON.parse(lastMessage);
        if (!mapping(observation)) {
          const error = new Error("Codex E6 final output is not an observation mapping");
          error.code = "codex-session-identity-mismatch";
          throw error;
        }
        const structuredBehavior = structuredBehaviorFor(request);
        // Policy evidence is host-owned: it is derived from the exact flags used
        // for the completed process, never from model output.
        const hostPolicyEvidence = {
          requested: policy,
          accepted: policy,
          observed: { ...policy, status: "observed" },
        };
        if (structuredBehavior) {
          if (!mapping(observation.behavior) || JSON.stringify(observation.behavior) !== JSON.stringify(structuredBehavior)) {
            const error = new Error("Codex E6 advisor behavior does not match the bound structured behavior");
            error.code = "codex-behavior-mismatch";
            throw error;
          }
          return {
            ...observation,
            session_id: sessionId,
            behavior: request.expected_behavior,
            execution_policy_evidence: hostPolicyEvidence,
          };
        }
        return { ...observation, session_id: sessionId, execution_policy_evidence: hostPolicyEvidence };
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
  });
}

function controlsFromHelp(help) {
  return Object.fromEntries(REQUIRED_CODEX_EXEC_CONTROLS.map((control) => [control, CONTROL_PATTERNS[control].test(help)]));
}

function inspectRequest(input) {
  if (!mapping(input) || input.schema_version !== CODEX_EXEC_CAPABILITY_SCHEMA_VERSION || input.adapter_id !== "codex.exec") {
    throw new TypeError("Codex capability inspect request has invalid schema or adapter identity");
  }
  const fields = Object.hasOwn(input, "host_version") || Object.hasOwn(input, "required_model") || Object.hasOwn(input, "required_reasoning_effort")
    ? DISPATCH_INSPECT_FIELDS
    : RESOLVER_INSPECT_FIELDS;
  exactFields(input, fields, "Codex capability inspect request");
  if (fields === DISPATCH_INSPECT_FIELDS) {
    for (const field of ["host_version", "required_model", "required_reasoning_effort"]) {
      if (typeof input[field] !== "string" || input[field].length === 0) throw new TypeError(`${field} must be a non-empty string`);
    }
  }
  return input;
}

function observationFor({ command, env, cwd, timeoutMs, run, request }) {
  const executablePath = executableFromPath(command, env);
  const versionResult = runCommand(run, command, ["--version"], { env, cwd, timeoutMs });
  const executableAvailable = executablePath !== null && versionResult.status === 0;
  const version = parseVersion(`${versionResult.stdout}\n${versionResult.stderr}`);
  const versionAvailable = version !== "unknown";
  const helpResult = executablePath === null
    ? failedResult()
    : runCommand(run, command, ["exec", "--help"], { env, cwd, timeoutMs });
  const controls = helpResult.status === 0 ? controlsFromHelp(`${helpResult.stdout}\n${helpResult.stderr}`) : Object.fromEntries(REQUIRED_CODEX_EXEC_CONTROLS.map((control) => [control, false]));
  const loginResult = executablePath === null
    ? failedResult()
    : runCommand(run, command, ["login", "status"], { env, cwd, timeoutMs });
  const dispatchRequest = Object.hasOwn(request, "required_model");
  const modelSupported = controls.model === true;
  const reasoningSupported = controls.reasoning_effort === true;
  return {
    schema_version: CODEX_EXEC_CAPABILITY_SCHEMA_VERSION,
    executable: { available: executableAvailable, path: executablePath },
    authentication: { available: loginResult.status === 0, authenticated: loginResult.status === 0 },
    version: { value: versionAvailable ? version : "unknown", allowed: versionAllowed(version) },
    controls,
    model: {
      available: modelSupported,
      supported: modelSupported,
      value: dispatchRequest ? request.required_model : null,
    },
    reasoning: {
      available: reasoningSupported,
      supported: reasoningSupported,
      value: dispatchRequest ? request.required_reasoning_effort : null,
    },
  };
}

export function createCodexExecCapabilityPort({
  command = process.env.MAISTER_CODEX_EXECUTABLE ?? "codex",
  home = process.env.HOME ?? process.cwd(),
  env = process.env,
  cwd = process.cwd(),
  timeoutMs = 10_000,
  run = defaultRun,
} = {}) {
  boundedPath(home, "home");
  if (typeof command !== "string" || command.length === 0 || command.includes("\0")) throw new TypeError("command must be a non-empty NUL-free string");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new TypeError("timeoutMs must be between 1 and 120000");
  const childEnv = Object.freeze({ ...env, HOME: home });
  return Object.freeze({
    inspect(input) {
      const request = inspectRequest(input);
      return observationFor({ command, env: childEnv, cwd, timeoutMs, run, request });
    },
  });
}

function validateOwnerRequest(request) {
  exactFields(request, OWNER_FIELDS, "Codex bridge request");
  if (request.schema_version !== 1 || request.operation !== "evaluate_gate" || request.target !== "codex") {
    throw new TypeError("Codex bridge request must target codex with operation evaluate_gate");
  }
  for (const field of ["home", "state_root", "working_root", "state_path", "plugin_source_root"]) boundedPath(request[field], field);
}

export async function createMaisterAgentBridgeV1(request) {
  validateOwnerRequest(request);
  return {
    schema_version: 1,
    target: "codex",
    credentials_owner: "host",
    version_owner: "host",
    capability_port: createCodexExecCapabilityPort({ home: request.home }),
  };
}
