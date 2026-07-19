#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/test.mjs" <<'NODE'
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.GATE_EVALUATOR_ROOT;
const temporaryRoot = process.env.GATE_EVALUATOR_TMP;
const { evaluateGate } = await import(pathToFileURL(path.join(root, "plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs")));
const { stringifyCanonicalYaml } = await import(pathToFileURL(path.join(root, "plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs")));
const { commitState } = await import(pathToFileURL(path.join(root, "plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs")));

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);

function baseState() {
  return {
    orchestrator: {
      schema_version: 2,
      revision: 0,
      initial_phase: "phase-1",
      current_phase: "phase-1",
      completed_phases: [],
      failed_phases: [],
      gate_history: [],
      work: {},
      dispatch_outbox: [],
    },
    task: { id: "gate-evaluator-test" },
    phases: [{ id: "phase-1", status: "in_progress" }],
  };
}

function statePath(name) {
  const file = path.join(temporaryRoot, `${name}.yml`);
  fs.writeFileSync(file, stringifyCanonicalYaml(baseState()), "utf8");
  return file;
}

function clock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 6, 18, 12, 0, tick++)).toISOString();
}

function context(overrides = {}) {
  return {
    schema_version: 1,
    phase_id: "phase-1",
    gate_type: "phase-exit",
    question: "Continue?",
    options: ["A", "B"],
    original_recommendation: "A",
    policy: "fully_automatic",
    safety_classification: "configurable",
    context: {
      task_path: temporaryRoot,
      phase_summaries: {},
      artifact_paths: [],
      implementation_approval: {},
    },
    ...overrides,
  };
}

function roleConfig(overrides = {}) {
  return {
    advisor: { logical_role_id: "maister:advisor", max_attempts: 2 },
    arbiter: { logical_role_id: "maister:advisor", max_attempts: 2 },
    arbiter_enabled_on_disagreement: true,
    backoff_ms: 0,
    ...overrides,
  };
}

function policy() {
  return {
    execution_profile_id: "codex.read-only",
    tools: ["read", "search"],
    filesystem: "read-only",
    network: "restricted",
    model: "gpt-5.6-terra",
    reasoning_effort: "high",
    timeout_ms: 900000,
    output_schema_id: "maister.gate-decision.v1",
    concurrency_class: "read-only-concurrent",
    max_parallel: 4,
  };
}

function plan(dispatchId) {
  return {
    schema_version: 1,
    dispatch_id: dispatchId,
    requested_logical_role_id: "maister:advisor",
    role_id: "advisor",
    role_source_digest: DIGEST_A,
    target: "codex",
    representation: "codex-prompt-schema",
    adapter_id: "codex.exec",
    native_role_external_id: null,
    host: "codex",
    host_version: "1.2.3",
    policy: policy(),
    provenance: {
      receipt_id: "receipt-001",
      receipt_path: "/state/receipts/receipt-001.json",
      projection_schema_version: 1,
      projector_version: "1.0.0",
      canonical_set_digest: DIGEST_A,
      manifest_digest: DIGEST_B,
      projected_tree_digest: DIGEST_C,
    },
  };
}

function response(selectedOption, overrides = {}) {
  return {
    selected_option: selectedOption,
    rationale: `Choose ${selectedOption}`,
    confidence: "high",
    escalate_to_user: false,
    ...overrides,
  };
}

function terminal(dispatchId, result = response("A"), overrides = {}) {
  const status = overrides.status ?? "succeeded";
  return {
    schema_version: 1,
    status,
    dispatch_id: dispatchId,
    requested_logical_role_id: "maister:advisor",
    role_id: "advisor",
    target: "codex",
    adapter_id: "codex.exec",
    native_role_external_id: null,
    observed_native_role_external_id: null,
    host: "codex",
    host_version: "1.2.3",
    policy: policy(),
    provenance: plan(dispatchId).provenance,
    output: status === "succeeded" ? result : null,
    native_observations: {},
    error: status === "succeeded" ? null : { code: "E_DISPATCH_FAILED", message: "dispatch failed", retryable: false },
    ...overrides,
  };
}

function durableSuccessStream(dispatchId, output, nativeObservations = {}) {
  return {
    complete: true,
    events: [{
      event_type: "dispatch_terminal",
      dispatch_id: dispatchId,
      result: { status: "completed", data: { output, ...nativeObservations } },
      error: null,
    }],
  };
}

function durableFailureStream(dispatchId, error) {
  return {
    complete: true,
    events: [{ event_type: "dispatch_terminal", dispatch_id: dispatchId, result: null, error }],
  };
}

function runtime({ outcomes = [], streams = [] } = {}) {
  const resolved = [];
  const dispatched = [];
  const terminalResults = new Map();
  return {
    resolved,
    dispatched,
    async resolveAgent(request) {
      resolved.push(structuredClone(request));
      assert.equal(request.logical_role_id, "maister:advisor");
      assert.equal(Object.hasOwn(request, "model"), false);
      assert.equal(Object.hasOwn(request, "adapter_id"), false);
      return plan(request.dispatch_id);
    },
    async dispatchAgent({ plan: receivedPlan, task }) {
      dispatched.push({ plan: structuredClone(receivedPlan), task: structuredClone(task) });
      assert.equal(task.actor === "advisor" || task.actor === "arbiter", true);
      assert.deepEqual(Object.keys(task).sort(), ["actor", "bounded_task", "gate_context", "idempotency_context", "output_schema", "work_item"]);
      const outcome = outcomes.shift();
      const terminalResult = typeof outcome === "function" ? outcome(receivedPlan) : outcome ?? terminal(receivedPlan.dispatch_id);
      terminalResults.set(receivedPlan.dispatch_id, terminalResult);
      return terminalResult;
    },
    readExecutionEventStream({ dispatchId }) {
      const stream = streams.shift();
      if (typeof stream === "function") return stream(dispatchId);
      if (stream) return stream;
      const terminalResult = terminalResults.get(dispatchId);
      return terminalResult.status === "succeeded"
        ? durableSuccessStream(dispatchId, terminalResult.output, terminalResult.native_observations)
        : durableFailureStream(dispatchId, terminalResult.error);
    },
  };
}

async function testTerminalContractMustMatchDurableEventPayload() {
  const failedTerminal = (receivedPlan) => terminal(receivedPlan.dispatch_id, null, {
    status: "failed",
    error: { code: "E_EXPECTED", message: "expected durable failure", retryable: false },
  });
  for (const [name, port] of [
    ["success-output", runtime({
      streams: [
        (dispatchId) => durableSuccessStream(dispatchId, response("B"), { session_id: "session-001" }),
        (dispatchId) => durableSuccessStream(dispatchId, response("B"), { session_id: "session-002" }),
      ],
    })],
    ["failed-error", runtime({
      outcomes: [failedTerminal, failedTerminal],
      streams: [
        (dispatchId) => durableFailureStream(dispatchId, { code: "E_OTHER", message: "different durable failure", retryable: false }),
        (dispatchId) => durableFailureStream(dispatchId, { code: "E_OTHER", message: "different durable failure", retryable: false }),
      ],
    })],
  ]) {
    const result = await evaluateGate({
      statePath: statePath(`durable-binding-${name}`),
      gateContext: context(),
      roleConfig: roleConfig(),
      runtimePort: port,
      automaticContinuationSupported: true,
      interactive: true,
      now: clock(),
    });
    assert.equal(result.directive, "user_gate");
    assert.equal(result.gate.selected_option, null);
    assert.equal(result.gate.advisor.response, null);
    assert.equal(result.gate.advisor.attempts.every((attempt) => attempt.terminal_dispatch === null), true);
  }
}

async function testCodexReusedObservationIsTheOnlyAllowedDerivation() {
  const port = runtime({
    outcomes: [(receivedPlan) => terminal(receivedPlan.dispatch_id, response("A"), {
      native_observations: { session_id: "session-001", reused: true },
    })],
    streams: [(dispatchId) => durableSuccessStream(dispatchId, response("A"), { session_id: "session-001" })],
  });
  const result = await evaluateGate({
    statePath: statePath("codex-reused"),
    gateContext: context(),
    roleConfig: roleConfig(),
    runtimePort: port,
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "continue");
  assert.equal(result.gate.advisor.terminal_dispatch.native_observations.reused, true);
}

async function testCommonDispatchPlanAndDistinctDecisionIdentity() {
  const port = runtime();
  const result = await evaluateGate({
    statePath: statePath("agreement"),
    gateContext: context(),
    roleConfig: roleConfig(),
    runtimePort: port,
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "continue");
  assert.equal(result.gate.final_actor, "advisor");
  assert.equal(result.gate.advisor.logical_role_id, "maister:advisor");
  assert.notEqual(result.gate.advisor.dispatch_id, result.gate.idempotency_key);
  assert.equal(result.gate.advisor.terminal_dispatch.status, "succeeded");
  assert.equal(port.resolved.length, 1);
  assert.equal(port.dispatched.length, 1);
  assert.equal(port.dispatched[0].task.work_item.actor, "advisor");
  assert.equal(port.dispatched[0].task.idempotency_context.gate_decision_id, result.gate.advisor.dispatch_id);
  assert.notEqual(port.dispatched[0].task.idempotency_context.gate_decision_id, result.gate.idempotency_key);
}

async function testRetryAndOneArbiterUseTheSameAdvisorRole() {
  const port = runtime({
    outcomes: [
      (receivedPlan) => terminal(receivedPlan.dispatch_id, response("B")),
      (receivedPlan) => terminal(receivedPlan.dispatch_id, null, { status: "failed" }),
      (receivedPlan) => terminal(receivedPlan.dispatch_id, response("A")),
    ],
  });
  const result = await evaluateGate({
    statePath: statePath("arbitration"),
    gateContext: context(),
    roleConfig: roleConfig(),
    runtimePort: port,
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "continue");
  assert.equal(result.gate.final_actor, "arbiter");
  assert.equal(result.gate.advisor.logical_role_id, "maister:advisor");
  assert.equal(result.gate.arbiter.logical_role_id, "maister:advisor");
  assert.notEqual(result.gate.advisor.dispatch_id, result.gate.arbiter.dispatch_id);
  assert.deepEqual(result.gate.arbiter.attempts.map((attempt) => attempt.status), ["failed", "completed"]);
  assert.equal(port.resolved.length, 3);
  assert.equal(new Set(port.resolved.map((request) => request.logical_role_id)).size, 1);
}

async function testDispatchOrDurabilityFailureCannotApprove() {
  for (const [name, port] of [
    ["dispatch", runtime({ outcomes: [(receivedPlan) => terminal(receivedPlan.dispatch_id, null, { status: "failed" }), (receivedPlan) => terminal(receivedPlan.dispatch_id, null, { status: "failed" })] })],
    ["durability", runtime({ streams: [{ complete: false, events: [] }, { complete: false, events: [] }] })],
  ]) {
    const result = await evaluateGate({
      statePath: statePath(`failure-${name}`),
      gateContext: context(),
      roleConfig: roleConfig(),
      runtimePort: port,
      automaticContinuationSupported: true,
      interactive: true,
      now: clock(),
    });
    assert.equal(result.directive, "user_gate");
    assert.equal(result.gate.status, "user_pending");
    assert.equal(result.gate.selected_option, null);
    assert.equal(result.gate.final_actor, "system");
    assert.equal(result.gate.advisor.response, null);
    if (name === "durability") assert.equal(result.gate.advisor.attempts.every((attempt) => attempt.terminal_dispatch === null), true);
  }
}

async function testDenylistedImplementationApprovalNeverDispatches() {
  const port = runtime();
  const result = await evaluateGate({
    statePath: statePath("denylisted"),
    gateContext: context({ gate_type: "implementation-approval" }),
    roleConfig: roleConfig(),
    runtimePort: port,
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "user_gate");
  assert.equal(result.gate.policy, "manual");
  assert.equal(port.resolved.length, 0);
}

async function testValidatedTerminalEvidenceIsFrozen() {
  const file = statePath("frozen-terminal");
  const result = await evaluateGate({
    statePath: file,
    gateContext: context(),
    roleConfig: roleConfig(),
    runtimePort: runtime(),
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  await assert.rejects(
    commitState(file, result.state.orchestrator.revision, (draft) => {
      draft.orchestrator.gate_history[0].advisor.attempts[0].terminal_dispatch.output.rationale = "rewritten";
    }),
    /immutable after completion/u,
  );
}

const tests = [
  ["common plan preserves Advisor equality and distinct decision identity", testCommonDispatchPlanAndDistinctDecisionIdentity],
  ["terminal contracts bind exactly to durable final event payloads", testTerminalContractMustMatchDurableEventPayload],
  ["Codex reused observation is the only allowed derived evidence", testCodexReusedObservationIsTheOnlyAllowedDerivation],
  ["retry and arbitration share Advisor role while keeping dispatches distinct", testRetryAndOneArbiterUseTheSameAdvisorRole],
  ["dispatch and durable-event failures cannot approve", testDispatchOrDurabilityFailureCannotApprove],
  ["denylisted implementation approval never dispatches", testDenylistedImplementationApprovalNeverDispatches],
  ["validated terminal dispatch evidence is frozen", testValidatedTerminalEvidenceIsFrozen],
];

let passed = 0;
for (const [name, test] of tests) {
  await test();
  passed += 1;
  console.log(`PASS: ${name}`);
}
console.log(`Results: ${passed} passed, 0 failed`);
NODE

GATE_EVALUATOR_ROOT="$ROOT" GATE_EVALUATOR_TMP="$TMP" node "$TMP/test.mjs"
