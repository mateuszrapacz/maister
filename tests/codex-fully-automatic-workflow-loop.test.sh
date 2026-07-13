#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINDING="$ROOT/platforms/codex-cli/bin/fully-automatic-gate.mjs"
FIXTURE="$ROOT/tests/fixtures/phase-continue/valid-v2-empty.yml"
MATRIX="$ROOT/plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml"
WORK="$(mktemp -d)"
WORK="$(cd "$WORK" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

assert_directive_validation_and_evidence_rejection() {
  local directive
  for directive in continue user_gate blocked; do
    printf '{"directive":"%s"}\n' "$directive" >"$WORK/result.json"
    node "$BINDING" --input-file "$WORK/result.json" >"$WORK/output.json"
    jq -e --arg directive "$directive" 'keys == ["directive"] and .directive == $directive' "$WORK/output.json" >/dev/null
  done

  for payload in '{"directive":"retry"}' '{"directive":"continue","evidence_provider":"test"}'; do
    printf '%s\n' "$payload" >"$WORK/result.json"
    if node "$BINDING" --input-file "$WORK/result.json" >"$WORK/output.json" 2>"$WORK/error.log"; then
      return 1
    fi
    test ! -s "$WORK/output.json"
  done
}

run_integrated_tracer() {
  local scenario="$1"
  local state="$WORK/$scenario.yml"
  cp "$FIXTURE" "$state"
  ROOT="$ROOT" STATE="$state" BINDING="$BINDING" SCENARIO="$scenario" node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { runFullyAutomaticGate } = await import(pathToFileURL(process.env.BINDING));
const { readState } = await import(pathToFileURL(`${process.env.ROOT}/plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs`));

let advisorCalls = 0;
let arbiterCalls = 0;
let userGates = 0;
let targetStarts = 0;
let clock = 0;
const now = () => new Date(Date.parse("2026-07-13T01:00:00Z") + clock++ * 1000).toISOString();
const disagreement = process.env.SCENARIO === "disagreement";
const result = await runFullyAutomaticGate({
  statePath: process.env.STATE,
  gateContext: {
    schema_version: 1,
    phase_id: "phase-1",
    gate_type: "research-convergence",
    question: "Continue to the next decision area?",
    options: ["Continue", "Pause"],
    original_recommendation: "Continue",
    policy: "fully_automatic",
    safety_classification: "configurable",
    context: { task_path: "test" },
  },
  roleConfig: {
    advisor: { agent: "advisor", model: "test-advisor", max_attempts: 1 },
    arbiter: { agent: "arbiter", model: "test-arbiter", max_attempts: 1 },
    arbiter_enabled_on_disagreement: true,
    backoff_ms: 0,
  },
  rolePort: {
    invokeAdvisor: async (context) => {
      advisorCalls += 1;
      assert.equal(context.actor, "advisor");
      assert.equal(Object.isFrozen(context), true);
      assert.equal(Object.isFrozen(context.gate_context), true);
      return { selected_option: disagreement ? "Pause" : "Continue", rationale: "Advisor analysis", confidence: "high", escalate_to_user: false };
    },
    invokeArbiter: async (context) => {
      arbiterCalls += 1;
      assert.equal(context.actor, "arbiter");
      assert.notEqual(context.logical_role_id.split(":")[0], "advisor");
      assert.equal(Object.isFrozen(context), true);
      return { selected_option: "Continue", rationale: "Arbiter analysis", confidence: "high", escalate_to_user: false };
    },
  },
  userPort: { presentUserGate: async () => { userGates += 1; return "Pause"; } },
  automaticContinuationSupported: true,
  interactive: false,
  continuationPlan: {
    inventory: {
      phase_id: "phase-1",
      inventory_version: "sha256:research-tracer",
      items: [
        { id: "decision-area:source", status: "in_progress" },
        { id: "decision-area:target", status: "ready" },
      ],
    },
    source_phase_id: "phase-1",
    source_item_id: "decision-area:source",
    kind: "same_phase_work_item",
    target_phase_id: "phase-1",
    target_id: "decision-area:target",
    claim_token: `claim-${process.env.SCENARIO}`,
    lease_ms: 30000,
  },
  targetPort: {
    beginAcknowledgedTarget: async (receipt) => {
      targetStarts += 1;
      assert.equal(Object.isFrozen(receipt), true);
      assert.equal(receipt.dispatch.status, "acknowledged");
      assert.match(receipt.dispatch.checkpoint, /^started:same_phase_work_item:/);
    },
  },
  now,
  wait: async () => {},
});

assert.deepEqual(result, { directive: "continue" });
assert.equal(advisorCalls, 1);
assert.equal(arbiterCalls, disagreement ? 1 : 0);
assert.equal(userGates, 0);
assert.equal(targetStarts, 1);
const state = readState(process.env.STATE);
const items = state.orchestrator.work["phase-1"].items;
assert.equal(items[0].status, "completed");
assert.equal(items[1].status, "in_progress");
assert.equal(state.orchestrator.dispatch_outbox.length, 1);
assert.equal(state.orchestrator.dispatch_outbox[0].status, "acknowledged");
NODE
}

assert_role_isolation_and_active_loop_dispatch() {
  run_integrated_tracer agreement
  run_integrated_tracer disagreement
}

assert_safe_directive_passthrough_has_no_hidden_continuation() {
  local state="$WORK/safe-passthrough.yml"
  cp "$FIXTURE" "$state"
  ROOT="$ROOT" STATE="$state" BINDING="$BINDING" node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { runFullyAutomaticGate } = await import(pathToFileURL(process.env.BINDING));
let continuationCalls = 0;
const base = {
  statePath: process.env.STATE,
  gateContext: {
    schema_version: 1,
    phase_id: "phase-1",
    gate_type: "phase-exit",
    question: "Continue?",
    options: ["Continue", "Pause"],
    original_recommendation: "Continue",
    policy: "fully_automatic",
    safety_classification: "configurable",
    context: {},
  },
  roleConfig: {
    advisor: { agent: "advisor", model: null, max_attempts: 1 },
    arbiter: { agent: "arbiter", model: null, max_attempts: 1 },
    arbiter_enabled_on_disagreement: true,
    backoff_ms: 0,
  },
  rolePort: { invokeAdvisor: async () => { throw new Error("must not run"); }, invokeArbiter: async () => { throw new Error("must not run"); } },
  userPort: { presentUserGate: async () => null },
  automaticContinuationSupported: false,
  interactive: true,
  continuationPlan: null,
  targetPort: { beginAcknowledgedTarget: async () => { continuationCalls += 1; } },
  now: () => "2026-07-13T02:00:00.000Z",
  wait: async () => {},
};
const userGate = await runFullyAutomaticGate(base);
assert.deepEqual(userGate, { directive: "user_gate" });
assert.equal(continuationCalls, 0);

const blockedState = `${process.env.STATE}.blocked`;
await import("node:fs/promises").then(({ copyFile }) => copyFile(`${process.env.ROOT}/tests/fixtures/phase-continue/valid-v2-empty.yml`, blockedState));
const blocked = await runFullyAutomaticGate({
  ...base,
  statePath: blockedState,
  automaticContinuationSupported: true,
  interactive: false,
  rolePort: {
    invokeAdvisor: async () => ({ selected_option: "Continue", rationale: "Unsafe confidence", confidence: "low", escalate_to_user: false }),
    invokeArbiter: async () => { throw new Error("must not run"); },
  },
});
assert.deepEqual(blocked, { directive: "blocked" });
assert.equal(continuationCalls, 0);
NODE
}

assert_build_projection_and_supported_capability() {
  test -f "$ROOT/platforms/codex-cli/templates/advisor.toml"
  test -f "$ROOT/platforms/codex-cli/templates/arbiter.toml"
  grep -Fq 'sandbox_mode = "read-only"' "$ROOT/platforms/codex-cli/templates/advisor.toml"
  grep -Fq 'sandbox_mode = "read-only"' "$ROOT/platforms/codex-cli/templates/arbiter.toml"
  grep -Fq 'name = "advisor"' "$ROOT/platforms/codex-cli/templates/advisor.toml"
  grep -Fq 'name = "arbiter"' "$ROOT/platforms/codex-cli/templates/arbiter.toml"
  grep -A2 '^  - host: codex$' "$MATRIX" | grep -Fq 'declared_status: supported'
  test -f "$ROOT/plugins/maister-codex/skills/orchestrator-framework/bin/fully-automatic-gate.mjs"
  cmp "$BINDING" "$ROOT/plugins/maister-codex/skills/orchestrator-framework/bin/fully-automatic-gate.mjs"
  for runtime in gate-evaluator.mjs orchestrator-state-repository.mjs orchestrator-state-schema.mjs workflow-continuation.mjs; do
    cmp "$ROOT/plugins/maister/skills/orchestrator-framework/bin/$runtime" "$ROOT/plugins/maister-codex/skills/orchestrator-framework/bin/$runtime"
    cmp "$ROOT/plugins/maister/skills/orchestrator-framework/bin/$runtime" "$ROOT/plugins/maister-cursor/lib/orchestrator-framework/bin/$runtime"
    cmp "$ROOT/plugins/maister/skills/orchestrator-framework/bin/$runtime" "$ROOT/plugins/maister-kiro/skills/maister-orchestrator-framework/bin/$runtime"
  done
  test ! -e "$ROOT/plugins/maister-codex/skills/orchestrator-framework/bin/native-evidence-bootstrap.mjs"
  ! grep -Rq 'evidence_provider\|EVIDENCE_PROVIDER\|native-evidence-bootstrap' "$ROOT/plugins/maister-codex" --include='*.mjs' --include='*.md'
}

assert_directive_validation_and_evidence_rejection
echo "PASS: directive validation rejects unknown values and evidence-provider input"
assert_role_isolation_and_active_loop_dispatch
echo "PASS: distinct read-only roles reach one acknowledged active-loop target"
assert_safe_directive_passthrough_has_no_hidden_continuation
echo "PASS: user_gate and blocked directives have no hidden continuation"
assert_build_projection_and_supported_capability
echo "PASS: generated runtime parity is deterministic with evidence-backed Codex support"

echo "Results: 4 passed, 0 failed"
