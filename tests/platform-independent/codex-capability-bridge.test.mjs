import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CODEX_EXEC_CAPABILITY_SCHEMA_VERSION,
  createCodexExecCapabilityInspector,
  REQUIRED_CODEX_EXEC_CONTROLS,
  validateCodexCapabilityObservation,
} from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/codex-exec-capabilities.mjs";
import { CODEX_BRIDGE_MODULE } from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs";
import {
  createCodexExecCapabilityPort,
  createCodexExecInvocationPort,
  createMaisterAgentBridgeV1,
} from "../../plugins/maister/lib/distribution/bridges/codex-bridge-v1.mjs";
import { probeCodex } from "../../plugins/maister/lib/distribution/host-probes/codex.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const NOW = "2026-07-24T10:00:00.000Z";
const HELP = "-C --cd -m --model -c --config model_reasoning_effort --sandbox --json --output-schema --output-last-message --ignore-user-config";

function fakeRun({ authenticated = true, controls = REQUIRED_CODEX_EXEC_CONTROLS } = {}) {
  const calls = [];
  const controlText = controls.every((control) => REQUIRED_CODEX_EXEC_CONTROLS.includes(control)) ? HELP : "-C --cd -m --model -c --config model_reasoning_effort --sandbox --json --output-schema --ignore-user-config";
  return {
    calls,
    run(_command, args) {
      calls.push([...args]);
      if (args[0] === "--version") return { status: 0, stdout: "codex 0.145.0\n", stderr: "", error: null };
      if (args[0] === "login" && args[1] === "status") return { status: authenticated ? 0 : 1, stdout: "", stderr: "", error: null };
      if (args[0] === "exec" && args[1] === "--help") return { status: 0, stdout: controlText, stderr: "", error: null };
      return { status: 1, stdout: "", stderr: "", error: null };
    },
  };
}

function fixturePort(overrides = {}) {
  const observation = {
    schema_version: 1,
    executable: { available: true, path: "/usr/local/bin/codex" },
    authentication: { available: true, authenticated: true },
    version: { value: "0.145.0", allowed: true },
    controls: Object.fromEntries(REQUIRED_CODEX_EXEC_CONTROLS.map((control) => [control, true])),
    model: { available: true, supported: true, value: null },
    reasoning: { available: true, supported: true, value: null },
    ...overrides,
  };
  return {
    calls: [],
    inspect(request) {
      this.calls.push(structuredClone(request));
      const value = structuredClone(observation);
      if (request.required_model !== undefined) value.model.value = request.required_model;
      if (request.required_reasoning_effort !== undefined) value.reasoning.value = request.required_reasoning_effort;
      return value;
    },
  };
}

function plan() {
  return {
    adapter_id: "codex.exec",
    host_version: "0.145.0",
    policy: { model: "gpt-5.6-terra", reasoning_effort: "high" },
  };
}

test("canonical Codex bridge returns the closed v1 observation and supports dispatch policy inspection", () => {
  const executable = fs.realpathSync(process.execPath);
  const fake = fakeRun();
  const port = createCodexExecCapabilityPort({ command: executable, home: os.tmpdir(), run: fake.run });
  const resolverObservation = port.inspect({ schema_version: 1, adapter_id: "codex.exec" });
  assert.deepEqual(Object.keys(resolverObservation).sort(), ["authentication", "controls", "executable", "model", "reasoning", "schema_version", "version"]);
  assert.equal(resolverObservation.authentication.authenticated, true);
  assert.deepEqual(resolverObservation.model, { available: true, supported: true, value: null });
  assert.deepEqual(resolverObservation.reasoning, { available: true, supported: true, value: null });
  const dispatchObservation = port.inspect({
    schema_version: 1,
    adapter_id: "codex.exec",
    host_version: "0.145.0",
    required_model: "gpt-5.6-terra",
    required_reasoning_effort: "high",
  });
  assert.equal(dispatchObservation.model.value, "gpt-5.6-terra");
  assert.equal(dispatchObservation.reasoning.value, "high");
  assert.deepEqual(validateCodexCapabilityObservation(dispatchObservation), dispatchObservation);
  assert.deepEqual(fake.calls.map((args) => args.slice(0, 2)), [
    ["--version"], ["exec", "--help"], ["login", "status"],
    ["--version"], ["exec", "--help"], ["login", "status"],
  ]);
});

test("Codex bridge preserves unavailable authentication and malformed input as fail-closed observations", () => {
  const fake = fakeRun({ authenticated: false });
  const port = createCodexExecCapabilityPort({ command: process.execPath, home: os.tmpdir(), run: fake.run });
  const observation = port.inspect({ schema_version: 1, adapter_id: "codex.exec" });
  assert.deepEqual(observation.authentication, { available: false, authenticated: false });
  assert.throws(
    () => port.inspect({ schema_version: 1, adapter_id: "codex.exec", unexpected: true }),
    /unknown field unexpected/u,
  );
  assert.throws(
    () => validateCodexCapabilityObservation({ ...observation, controls: { ...observation.controls, model: "yes" } }),
    /controls\.model must be boolean/u,
  );
});

test("E5 and production capability inspection consume the same v1 capability port", async () => {
  const port = fixturePort();
  const e5 = probeCodex({
    now: NOW,
    run: () => ({ status: 0, stdout: "0.145.0\n", stderr: "", error: null }),
    hostVersion: "0.145.0",
    capabilityPort: port,
    provenance: {
      source_commit: "a".repeat(40),
      source_version: "test",
      overlay_id: "maister/codex",
      overlay_version: "1.0.0",
      host: "codex",
      scenario_version: "1.0.0",
      schema_version: 1,
      projector_version: "1.0.0",
      canonical_set_digest: "b".repeat(64),
      manifest_digest: "c".repeat(64),
      projected_tree_digest: "d".repeat(64),
    },
  });
  assert.equal(e5.records[0].result, "passed");
  const inspector = createCodexExecCapabilityInspector({ port });
  const production = await inspector.inspect({ plan: plan() });
  assert.equal(production.status, "available");
  assert.deepEqual(port.calls.map((request) => Object.keys(request).sort()), [
    ["adapter_id", "schema_version"],
    ["adapter_id", "host_version", "required_model", "required_reasoning_effort", "schema_version"],
  ]);
});

test("native E6 remains unavailable without a configured real invocation scenario", () => {
  const port = fixturePort();
  const result = probeCodex({
    now: NOW,
    run: () => ({ status: 0, stdout: "0.145.0\n", stderr: "", error: null }),
    capabilityPort: port,
    provenance: {
      source_commit: "a".repeat(40),
      source_version: "test",
      overlay_id: "maister/codex",
      overlay_version: "1.0.0",
      host: "codex",
      scenario_version: "1.0.0",
      schema_version: 1,
      projector_version: "1.0.0",
      canonical_set_digest: "b".repeat(64),
      manifest_digest: "c".repeat(64),
      projected_tree_digest: "d".repeat(64),
    },
    invoke: null,
  });
  assert.equal(result.records[0].result, "passed");
  assert.equal(result.records[1].result, "unavailable");
});

test("canonical Codex bridge exposes a bounded read-only invocation port for E6", () => {
  const calls = [];
  const request = {
    schema_version: 1,
    scenario_version: "1.0.0",
    logical_role_id: "maister:code-reviewer",
    native_role_external_id: null,
    prompt: "Return only the code-reviewer evidence behavior.",
    prompt_digest: "a".repeat(64),
    canonical_prompt_digest: "b".repeat(64),
    nonce: "c".repeat(64),
    output_schema: "maister.evidence.codex.code-reviewer.v1",
    canonical_set_digest: "d".repeat(64),
    manifest_digest: "e".repeat(64),
    projected_tree_digest: "f".repeat(64),
    dispatch_id: "e6-codex-code-reviewer",
    requested_execution_policy: {
      model: { model: "gpt-5.6-terra" },
      reasoning: { effort: "high" },
    },
    expected_behavior: "evidence-code-reviewer-v1",
  };
  const invocation = createCodexExecInvocationPort({
    command: process.execPath,
    home: os.tmpdir(),
    cwd: os.tmpdir(),
    run(_command, args, options) {
      calls.push({ args, options });
      fs.writeFileSync(options.output_last_message_path, JSON.stringify({
        logical_role_id: request.logical_role_id,
        native_role_external_id: null,
        prompt_digest: request.prompt_digest,
        canonical_prompt_digest: request.canonical_prompt_digest,
        nonce: request.nonce,
        output_schema: request.output_schema,
        canonical_set_digest: request.canonical_set_digest,
        manifest_digest: request.manifest_digest,
        projected_tree_digest: request.projected_tree_digest,
        dispatch_id: request.dispatch_id,
        session_id: "codex-session-1",
        behavior: request.expected_behavior,
      }), "utf8");
      return {
        status: 0,
        stdout: [
          JSON.stringify({ type: "thread.started", thread_id: "codex-session-1" }),
          JSON.stringify({ type: "turn.started", thread_id: "codex-session-1" }),
          JSON.stringify({ type: "item.completed", thread_id: "codex-session-1", item: { type: "agent_message" } }),
          JSON.stringify({ type: "turn.completed", thread_id: "codex-session-1", usage: {} }),
          "",
        ].join("\n"),
        stderr: "",
        error: null,
      };
    },
  });

  const observation = invocation.invoke(request);
  assert.equal(observation.logical_role_id, request.logical_role_id);
  assert.equal(observation.session_id, "codex-session-1");
  assert.equal(observation.behavior, request.expected_behavior);
  assert.deepEqual(observation.execution_policy_evidence, {
    requested: { model: "gpt-5.6-terra", reasoning_effort: "high" },
    accepted: { model: "gpt-5.6-terra", reasoning_effort: "high" },
    observed: { model: "gpt-5.6-terra", reasoning_effort: "high", status: "observed" },
  });
  assert.deepEqual(calls[0].args.slice(0, 2), ["exec", "--ignore-user-config"]);
  assert.ok(calls[0].args.includes("--sandbox"));
  assert.equal(calls[0].args[calls[0].args.indexOf("--sandbox") + 1], "read-only");
  assert.ok(calls[0].args.includes("--json"));
  assert.ok(calls[0].args.includes("--output-schema"));
  assert.ok(calls[0].args.includes("--output-last-message"));
  assert.equal(calls[0].options.input.includes(request.prompt), true);
});

test("Codex bridge is packaged from the canonical lib path without an overlay runtime copy", async () => {
  const bridgePath = path.join(ROOT, "plugins/maister/lib/distribution/bridges/codex-bridge-v1.mjs");
  assert.equal(CODEX_BRIDGE_MODULE, bridgePath);
  assert.equal(fs.existsSync(bridgePath), true);
  assert.equal(fs.existsSync(path.join(ROOT, "plugins/maister/overlays/codex/assets/runtime/codex-bridge-v1.mjs")), false);
  const response = await createMaisterAgentBridgeV1({
    schema_version: 1,
    operation: "evaluate_gate",
    target: "codex",
    home: "/tmp",
    state_root: "/tmp",
    working_root: "/tmp",
    state_path: "/tmp/orchestrator-state.yml",
    plugin_source_root: ROOT,
  });
  assert.deepEqual(Object.keys(response).sort(), ["capability_port", "credentials_owner", "schema_version", "target", "version_owner"]);
  assert.equal(typeof response.capability_port.inspect, "function");
  assert.equal(CODEX_EXEC_CAPABILITY_SCHEMA_VERSION, 1);
});
