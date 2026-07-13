#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TESTS_DIR, "../../..");
const BINDING = path.join(ROOT, "plugins/maister-codex/skills/orchestrator-framework/bin/fully-automatic-gate.mjs");
const REPOSITORY = path.join(ROOT, "plugins/maister-codex/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs");
const MATRIX = path.join(ROOT, "plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml");
const SCENARIOS = new Set(["agreement-same-phase", "disagreement-next-phase", "denylisted"]);

function parseArguments(argv) {
  if (argv.length !== 6 || argv[0] !== "--scenario" || argv[2] !== "--state" || argv[4] !== "--trace") {
    throw new Error("usage: native-evidence-bootstrap.mjs --scenario <name> --state <path> --trace <path>");
  }
  const result = { scenario: argv[1], statePath: argv[3], tracePath: argv[5] };
  if (!SCENARIOS.has(result.scenario)) throw new Error(`unknown evidence scenario ${result.scenario}`);
  for (const [field, value] of Object.entries(result)) {
    if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new Error(`${field} must be a non-empty NUL-free string`);
  }
  return result;
}

async function codexDeclaration() {
  const matrix = await readFile(MATRIX, "utf8");
  const match = matrix.match(/^  - host: codex\n    declared_status: (supported|unsupported)$/m);
  if (!match) throw new Error("canonical Codex capability declaration is missing or invalid");
  return match[1];
}

function evidenceEligibility(declaredStatus) {
  if (declaredStatus === "supported") return { automaticContinuationSupported: true, source: "declaration" };
  return { automaticContinuationSupported: true, source: "test_bootstrap" };
}

function roleConfig() {
  return {
    advisor: { agent: "advisor", model: "native-evidence-advisor", max_attempts: 1 },
    arbiter: { agent: "arbiter", model: "native-evidence-arbiter", max_attempts: 1 },
    arbiter_enabled_on_disagreement: true,
    backoff_ms: 0,
  };
}

function gateContext(scenario) {
  const denylisted = scenario === "denylisted";
  return {
    schema_version: 1,
    phase_id: "phase-1",
    gate_type: denylisted ? "implementation-approval" : "research-convergence",
    question: denylisted ? "Approve implementation?" : `Continue native evidence for ${scenario}?`,
    options: ["Continue", "Pause"],
    original_recommendation: "Continue",
    policy: "fully_automatic",
    safety_classification: "configurable",
    context: { evidence_scenario: scenario },
  };
}

function continuationPlan(scenario) {
  if (scenario === "denylisted") return null;
  const samePhase = scenario === "agreement-same-phase";
  return {
    inventory: {
      phase_id: "phase-1",
      inventory_version: `sha256:native-evidence-${scenario}`,
      items: samePhase
        ? [
            { id: "decision-area:source", status: "in_progress" },
            { id: "decision-area:target", status: "ready" },
          ]
        : [{ id: "decision-area:source", status: "in_progress" }],
    },
    source_phase_id: "phase-1",
    source_item_id: "decision-area:source",
    kind: samePhase ? "same_phase_work_item" : "phase_entry",
    target_phase_id: samePhase ? "phase-1" : "phase-2",
    target_id: samePhase ? "decision-area:target" : "phase-2",
    claim_token: `native-evidence-${scenario}`,
    lease_ms: 30000,
  };
}

async function runScenario({ scenario, statePath, tracePath }) {
  const [{ runFullyAutomaticGate }, { readState }] = await Promise.all([
    import(pathToFileURL(BINDING)),
    import(pathToFileURL(REPOSITORY)),
  ]);
  const declaredStatus = await codexDeclaration();
  const eligibility = evidenceEligibility(declaredStatus);
  let advisorCalls = 0;
  let arbiterCalls = 0;
  let userGates = 0;
  let receiverInvocations = 0;
  let logicalTargetStarts = 0;
  let clock = 0;
  const startedCheckpoints = new Set();
  const now = () => new Date(Date.parse("2026-07-13T12:00:00Z") + clock++ * 1000).toISOString();
  const disagreement = scenario === "disagreement-next-phase";

  const options = {
    statePath,
    gateContext: gateContext(scenario),
    roleConfig: roleConfig(),
    rolePort: {
      invokeAdvisor: async (context) => {
        advisorCalls += 1;
        assert.equal(context.actor, "advisor");
        assert.equal(Object.isFrozen(context), true);
        assert.equal(Object.isFrozen(context.gate_context), true);
        return {
          selected_option: disagreement ? "Pause" : "Continue",
          rationale: disagreement ? "Pause for independent review" : "Continue with the acknowledged target",
          confidence: "high",
          escalate_to_user: false,
        };
      },
      invokeArbiter: async (context) => {
        arbiterCalls += 1;
        assert.equal(context.actor, "arbiter");
        assert.equal(Object.isFrozen(context), true);
        assert.deepEqual(new Set(context.competing_options), new Set(["Continue", "Pause"]));
        return {
          selected_option: "Continue",
          rationale: "The original recommendation is safe",
          confidence: "high",
          escalate_to_user: false,
        };
      },
    },
    userPort: {
      presentUserGate: async () => {
        userGates += 1;
        return "Pause";
      },
    },
    automaticContinuationSupported: eligibility.automaticContinuationSupported,
    interactive: false,
    continuationPlan: continuationPlan(scenario),
    targetPort: {
      beginAcknowledgedTarget: async (receipt) => {
        receiverInvocations += 1;
        assert.equal(Object.isFrozen(receipt), true);
        assert.equal(Object.isFrozen(receipt.state), true);
        assert.equal(receipt.dispatch.status, "acknowledged");
        if (!startedCheckpoints.has(receipt.dispatch.checkpoint)) {
          startedCheckpoints.add(receipt.dispatch.checkpoint);
          logicalTargetStarts += 1;
        }
      },
    },
    now,
    wait: async () => {},
  };

  const first = await runFullyAutomaticGate(options);
  if (scenario === "agreement-same-phase") {
    const resumed = await runFullyAutomaticGate(options);
    assert.deepEqual(resumed, first);
  }

  const state = readState(statePath);
  const dispatch = state.orchestrator.dispatch_outbox[0] ?? null;
  const arbiterIds = state.orchestrator.gate_history
    .map((gate) => gate.arbiter.logical_role_id)
    .filter((value) => value !== null);
  const sourcePhase = state.phases.find((phase) => phase.id === "phase-1");
  const targetPhase = state.phases.find((phase) => phase.id === "phase-2");
  const samePhaseTarget = state.orchestrator.work["phase-1"]?.items.find((item) => item.id === "decision-area:target");
  const trace = {
    scenario,
    directive: first.directive,
    declared_status: declaredStatus,
    eligibility_source: eligibility.source,
    advisor_calls: advisorCalls,
    arbiter_calls: arbiterCalls,
    logical_arbiter_id_count: new Set(arbiterIds).size,
    user_gates: userGates,
    receiver_invocations: receiverInvocations,
    logical_target_starts: logicalTargetStarts,
    gate_history_count: state.orchestrator.gate_history.length,
    dispatch_count: state.orchestrator.dispatch_outbox.length,
    dispatch_status: dispatch?.status ?? null,
    dispatch_attempts: dispatch?.attempts ?? null,
    checkpoint: dispatch?.checkpoint ?? null,
    target_kind: dispatch?.kind ?? null,
    target_status: samePhaseTarget?.status ?? null,
    current_phase: state.orchestrator.current_phase,
    source_phase_status: sourcePhase?.status ?? null,
    target_phase_status: targetPhase?.status ?? null,
  };
  await writeFile(tracePath, `${JSON.stringify(trace, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ directive: first.directive })}\n`);
}

try {
  await runScenario(parseArguments(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`native-evidence-bootstrap: ${message}\n`);
  process.exitCode = 1;
}
