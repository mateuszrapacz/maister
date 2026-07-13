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
  return () => new Date(Date.UTC(2026, 6, 13, 20, 0, tick++)).toISOString();
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
    context: { phase_summaries: {}, artifact_paths: [] },
    ...overrides,
  };
}

function roleConfig(overrides = {}) {
  return {
    advisor: { agent: "advisor", model: "advisor-model", max_attempts: 2 },
    arbiter: { agent: "arbiter", model: "arbiter-model", max_attempts: 2 },
    arbiter_enabled_on_disagreement: true,
    backoff_ms: 0,
    ...overrides,
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

async function testAgreement() {
  let advisorCalls = 0;
  let arbiterCalls = 0;
  const result = await evaluateGate({
    statePath: statePath("agreement"),
    gateContext: context(),
    roleConfig: roleConfig(),
    rolePort: {
      async invokeAdvisor(received) {
        advisorCalls += 1;
        assert.deepEqual(received.gate_context.context, context().context);
        return response("A");
      },
      async invokeArbiter() {
        arbiterCalls += 1;
        return response("A");
      },
    },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "continue");
  assert.equal(result.gate.status, "decided");
  assert.equal(result.gate.final_actor, "advisor");
  assert.equal(advisorCalls, 1);
  assert.equal(arbiterCalls, 0);
  assert.equal(result.gate.advisor.attempts.length, 1);
  assert.equal(result.gate.advisor.attempts[0].status, "completed");
  assert.equal(result.state.orchestrator.dispatch_outbox.length, 0);
}

async function testDisagreementUsesOneLogicalArbiter() {
  let advisorCalls = 0;
  let arbiterCalls = 0;
  const arbiterLogicalIds = [];
  const result = await evaluateGate({
    statePath: statePath("disagreement"),
    gateContext: context(),
    roleConfig: roleConfig(),
    rolePort: {
      async invokeAdvisor() {
        advisorCalls += 1;
        return response("B");
      },
      async invokeArbiter(received) {
        arbiterCalls += 1;
        arbiterLogicalIds.push(received.logical_role_id);
        assert.deepEqual(received.competing_options, ["A", "B"]);
        if (arbiterCalls === 1) return { ...response("A"), unexpected: true };
        return response("A");
      },
    },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "continue");
  assert.equal(result.gate.final_actor, "arbiter");
  assert.equal(advisorCalls, 1);
  assert.equal(arbiterCalls, 2);
  assert.equal(new Set(arbiterLogicalIds).size, 1);
  assert.equal(result.gate.arbiter.logical_role_id, arbiterLogicalIds[0]);
  assert.deepEqual(result.gate.arbiter.attempts.map((attempt) => attempt.status), ["failed", "completed"]);
}

async function testUnsafeRoleResultsFailClosed() {
  const unsafeResponses = [
    { ...response("A"), unexpected: true },
    response("A", { confidence: "low" }),
    response("A", { escalate_to_user: true }),
  ];
  for (const [index, unsafeResponse] of unsafeResponses.entries()) {
    let calls = 0;
    const result = await evaluateGate({
      statePath: statePath(`unsafe-${index}`),
      gateContext: context(),
      roleConfig: roleConfig({ advisor: { agent: "advisor", model: "advisor-model", max_attempts: index === 0 ? 1 : 2 } }),
      rolePort: {
        async invokeAdvisor() {
          calls += 1;
          return unsafeResponse;
        },
        async invokeArbiter() {
          throw new Error("arbiter must not run");
        },
      },
      automaticContinuationSupported: true,
      interactive: true,
      now: clock(),
    });
    assert.equal(result.directive, "user_gate");
    assert.equal(result.gate.status, "user_pending");
    assert.equal(result.gate.final_actor, "system");
    assert.equal(result.gate.continuation, null);
    assert.equal(result.state.orchestrator.work && Object.keys(result.state.orchestrator.work).length, 0);
    assert.equal(calls, 1);
  }
}

async function testManualAdvisorOverrideAndUnsupportedFallback() {
  let roleCalls = 0;
  const manual = await evaluateGate({
    statePath: statePath("manual"),
    gateContext: context({ policy: "manual" }),
    roleConfig: roleConfig(),
    rolePort: { async invokeAdvisor() { roleCalls += 1; }, async invokeArbiter() { roleCalls += 1; } },
    userPort: { async presentUserGate() { return "B"; } },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(manual.gate.final_actor, "user");
  assert.equal(manual.gate.user_override, true);
  assert.equal(roleCalls, 0);

  const protectedGate = await evaluateGate({
    statePath: statePath("protected"),
    gateContext: context({ gate_type: "implementation-approval" }),
    roleConfig: roleConfig(),
    rolePort: { async invokeAdvisor() { roleCalls += 1; }, async invokeArbiter() { roleCalls += 1; } },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(protectedGate.directive, "user_gate");
  assert.equal(protectedGate.gate.safety_classification, "denylisted");
  assert.equal(protectedGate.gate.policy, "manual");
  assert.equal(roleCalls, 0);

  const advisor = await evaluateGate({
    statePath: statePath("advisor-policy"),
    gateContext: context({ policy: "advisor" }),
    roleConfig: roleConfig(),
    rolePort: { async invokeAdvisor() { return response("A"); }, async invokeArbiter() { throw new Error("unexpected"); } },
    userPort: { async presentUserGate() { return "B"; } },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(advisor.gate.final_actor, "user");
  assert.equal(advisor.gate.user_override, true);

  const fallback = await evaluateGate({
    statePath: statePath("unsupported"),
    gateContext: context(),
    roleConfig: roleConfig(),
    rolePort: { async invokeAdvisor() { throw new Error("must not run"); }, async invokeArbiter() { throw new Error("must not run"); } },
    automaticContinuationSupported: false,
    interactive: true,
    now: clock(),
  });
  assert.equal(fallback.gate.configured_policy, "fully_automatic");
  assert.equal(fallback.gate.policy, "manual");
  assert.equal(fallback.gate.status, "user_pending");
  assert.match(fallback.gate.rationale, /unsupported/i);
}

async function testAdvisorDisagreementPersistsArbiterBeforeUserOverride() {
  let advisorCalls = 0;
  let arbiterCalls = 0;
  let userCalls = 0;
  const result = await evaluateGate({
    statePath: statePath("advisor-disagreement"),
    gateContext: context({ policy: "advisor" }),
    roleConfig: roleConfig(),
    rolePort: {
      async invokeAdvisor() {
        advisorCalls += 1;
        return response("B");
      },
      async invokeArbiter(received) {
        arbiterCalls += 1;
        assert.deepEqual(received.competing_options, ["A", "B"]);
        return response("A");
      },
    },
    userPort: {
      async presentUserGate() {
        userCalls += 1;
        return "B";
      },
    },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  });
  assert.equal(result.directive, "continue");
  assert.equal(result.gate.status, "decided");
  assert.equal(result.gate.final_actor, "user");
  assert.equal(result.gate.selected_option, "B");
  assert.equal(result.gate.user_override, true);
  assert.equal(result.gate.advisor.response.selected_option, "B");
  assert.equal(result.gate.arbiter.response.selected_option, "A");
  assert.equal(advisorCalls, 1);
  assert.equal(arbiterCalls, 1);
  assert.equal(userCalls, 1);
}

async function testTerminalAndPendingResumeReuse() {
  let advisorCalls = 0;
  const file = statePath("resume-terminal");
  const options = {
    statePath: file,
    gateContext: context(),
    roleConfig: roleConfig(),
    rolePort: {
      async invokeAdvisor() { advisorCalls += 1; return response("A"); },
      async invokeArbiter() { throw new Error("unexpected"); },
    },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  };
  const first = await evaluateGate(options);
  const second = await evaluateGate(options);
  assert.equal(advisorCalls, 1);
  assert.deepEqual(second.gate, first.gate);
  assert.equal(second.state.orchestrator.gate_history.length, 1);

  const pendingFile = statePath("resume-pending");
  let userCalls = 0;
  const pendingOptions = {
    statePath: pendingFile,
    gateContext: context({ policy: "manual" }),
    roleConfig: roleConfig(),
    rolePort: { async invokeAdvisor() { throw new Error("unexpected"); }, async invokeArbiter() { throw new Error("unexpected"); } },
    userPort: { async presentUserGate() { userCalls += 1; return userCalls === 1 ? null : "A"; } },
    automaticContinuationSupported: true,
    interactive: true,
    now: clock(),
  };
  const pending = await evaluateGate(pendingOptions);
  assert.equal(pending.gate.status, "user_pending");
  const decided = await evaluateGate(pendingOptions);
  assert.equal(decided.gate.status, "decided");
  assert.equal(decided.state.orchestrator.gate_history.length, 1);
}

const tests = [
  ["fully automatic agreement", testAgreement],
  ["one logical arbiter across retries", testDisagreementUsesOneLogicalArbiter],
  ["invalid low-confidence and escalated results fail closed", testUnsafeRoleResultsFailClosed],
  ["manual advisor override and unsupported fallback", testManualAdvisorOverrideAndUnsupportedFallback],
  ["advisor disagreement persists arbiter before user override", testAdvisorDisagreementPersistsArbiterBeforeUserOverride],
  ["terminal and pending resume reuse", testTerminalAndPendingResumeReuse],
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
