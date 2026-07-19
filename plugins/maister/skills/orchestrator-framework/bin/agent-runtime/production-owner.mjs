import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { evaluateGate } from "../gate-evaluator.mjs";
import { createProductionAgentRuntime } from "./production-runtime.mjs";

const REQUEST_FIELDS = [
  "schema_version",
  "operation",
  "target",
  "home",
  "state_root",
  "working_root",
  "state_path",
  "bridge_module",
  "gate_context",
  "role_config",
  "automatic_continuation_supported",
  "interactive",
];
const TARGETS = new Set(["codex", "cursor", "kiro-cli"]);
const PACKAGED_PLUGIN_ROOT = path.resolve(import.meta.dirname, "../../../..");

export class ProductionOwnerError extends Error {
  constructor(code, message, details = {}) {
    super(`[${code}] ${message}`);
    this.name = "ProductionOwnerError";
    this.code = code;
    this.kind = code;
    this.details = structuredClone(details);
    this.retryable = false;
  }
}

function fail(code, message, details = {}) {
  throw new ProductionOwnerError(code, message, details);
}

function mapping(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("E_AGENT_OWNER_INPUT", `${label} must be a mapping`);
}

function exactFields(value, fields, label, optional = []) {
  mapping(value, label);
  const allowed = new Set([...fields, ...optional]);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (unknown || missing) fail("E_AGENT_OWNER_INPUT", `${label} has ${unknown ? `unknown field ${unknown}` : `missing field ${missing}`}`);
}

function realPath(value, label, { file = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096 || value.includes("\0")) {
    fail("E_AGENT_OWNER_PATH", `${label} must be a bounded NUL-free path`);
  }
  const resolved = path.resolve(value);
  const stat = fs.lstatSync(resolved, { throwIfNoEntry: false });
  if (!stat || stat.isSymbolicLink() || (file ? !stat.isFile() : !stat.isDirectory())) {
    fail("E_AGENT_OWNER_PATH", `${label} must be an existing real ${file ? "file" : "directory"}`, { path: resolved });
  }
  return fs.realpathSync(resolved);
}

function validateRequest(candidate) {
  exactFields(candidate, REQUEST_FIELDS, "owner request");
  if (candidate.schema_version !== 1 || candidate.operation !== "evaluate_gate") fail("E_AGENT_OWNER_INPUT", "owner request must use schema_version 1 and operation evaluate_gate");
  if (!TARGETS.has(candidate.target)) fail("E_AGENT_OWNER_TARGET", "target must be codex, cursor, or kiro-cli", { target: candidate.target });
  if (typeof candidate.automatic_continuation_supported !== "boolean" || candidate.interactive !== false) {
    fail("E_AGENT_OWNER_INPUT", "automatic_continuation_supported must be boolean and interactive must be false");
  }
  mapping(candidate.gate_context, "gate_context");
  mapping(candidate.role_config, "role_config");
  const taskPath = realPath(candidate.gate_context.context?.task_path, "gate_context.context.task_path");
  const statePath = realPath(candidate.state_path, "state_path", { file: true });
  if (path.dirname(statePath) !== taskPath) fail("E_AGENT_OWNER_PATH", "state_path must be owned directly by gate_context.context.task_path", { state_path: statePath, task_path: taskPath });
  return Object.freeze({
    ...structuredClone(candidate),
    home: realPath(candidate.home, "home"),
    state_root: realPath(candidate.state_root, "state_root"),
    working_root: realPath(candidate.working_root, "working_root"),
    state_path: statePath,
    bridge_module: candidate.bridge_module === null ? null : realPath(candidate.bridge_module, "bridge_module", { file: true }),
  });
}

function validateBridge(target, bridge) {
  const portField = target === "codex" ? "capability_port" : "native_port";
  exactFields(bridge, ["schema_version", "target", "credentials_owner", "version_owner", portField], "bridge response");
  if (bridge.schema_version !== 1 || bridge.target !== target || bridge.credentials_owner !== "host" || bridge.version_owner !== "host") {
    fail("E_AGENT_BRIDGE_CONTRACT", "bridge response identity and ownership fields are invalid");
  }
  const port = bridge[portField];
  if (target === "codex") {
    exactFields(port, ["inspect"], "Codex capability port");
    if (typeof port.inspect !== "function") fail("E_AGENT_BRIDGE_CONTRACT", "Codex capability_port.inspect must be a function");
  } else {
    exactFields(port, ["hostVersion", "authenticated", "externalCollisions", "inspect", "launch"], "exact-native port", ["cancel"]);
    if (typeof port.hostVersion !== "string" || port.hostVersion.length === 0 || typeof port.authenticated !== "boolean" || !Array.isArray(port.externalCollisions)) {
      fail("E_AGENT_BRIDGE_CONTRACT", "exact-native host metadata is invalid");
    }
    if (typeof port.inspect !== "function" || typeof port.launch !== "function" || (Object.hasOwn(port, "cancel") && typeof port.cancel !== "function")) {
      fail("E_AGENT_BRIDGE_CONTRACT", "exact-native inspect/launch must be functions and cancel, when present, must be a function");
    }
  }
  return port;
}

async function loadBridge(request) {
  if (request.bridge_module === null) return null;
  let module;
  try {
    module = await import(pathToFileURL(request.bridge_module).href);
  } catch (error) {
    fail("E_AGENT_BRIDGE_UNAVAILABLE", `bridge module could not be loaded: ${error.message}`, { bridge_module: request.bridge_module });
  }
  if (typeof module.createMaisterAgentBridgeV1 !== "function") fail("E_AGENT_BRIDGE_CONTRACT", "bridge module must export createMaisterAgentBridgeV1");
  const bridgeRequest = Object.freeze({
    schema_version: 1,
    operation: request.operation,
    target: request.target,
    home: request.home,
    state_root: request.state_root,
    working_root: request.working_root,
    state_path: request.state_path,
    plugin_source_root: PACKAGED_PLUGIN_ROOT,
  });
  try {
    return validateBridge(request.target, await module.createMaisterAgentBridgeV1(bridgeRequest));
  } catch (error) {
    if (error instanceof ProductionOwnerError) throw error;
    fail("E_AGENT_BRIDGE_UNAVAILABLE", `bridge initialization failed: ${error.message}`);
  }
}

export async function runProductionAgentGate(candidate, { env = process.env } = {}) {
  const request = validateRequest(candidate);
  const port = await loadBridge(request);
  const runtimePort = createProductionAgentRuntime({
    target: request.target,
    home: request.home,
    env: { ...env, XDG_STATE_HOME: request.state_root },
    workingRoot: request.working_root,
    capabilityPort: request.target === "codex" ? port : null,
    nativePorts: request.target === "cursor" ? { cursor: port } : request.target === "kiro-cli" ? { kiroCli: port } : {},
  });
  return evaluateGate({
    statePath: request.state_path,
    gateContext: request.gate_context,
    roleConfig: request.role_config,
    runtimePort,
    automaticContinuationSupported: request.automatic_continuation_supported,
    interactive: request.interactive,
  });
}
