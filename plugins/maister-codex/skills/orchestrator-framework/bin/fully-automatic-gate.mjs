#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ALLOWED_DIRECTIVES = new Set(["continue", "user_gate", "blocked"]);
const RUN_FIELDS = [
  "statePath",
  "gateContext",
  "roleConfig",
  "rolePort",
  "userPort",
  "automaticContinuationSupported",
  "interactive",
  "continuationPlan",
  "targetPort",
  "now",
  "wait",
];
const PLAN_FIELDS = [
  "inventory",
  "source_phase_id",
  "source_item_id",
  "kind",
  "target_phase_id",
  "target_id",
  "claim_token",
  "lease_ms",
];

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields, location) {
  if (!isMapping(value)) throw new Error(`${location} must be an object`);
  const allowed = new Set(fields);
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) throw new Error(`${location} is missing ${missing}`);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) throw new Error(`${location} has unknown field ${unknown}`);
}

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--input-file" || argv[1].length === 0) {
    throw new Error("usage: fully-automatic-gate.mjs --input-file <shared-runtime-result.json>");
  }
  return argv[1];
}

function validateSharedRuntimeResult(result) {
  exactFields(result, ["directive"], "shared runtime result");
  if (!ALLOWED_DIRECTIVES.has(result.directive)) {
    throw new Error("directive must be one of: continue, user_gate, blocked");
  }
  return { directive: result.directive };
}

function nonEmpty(value, location) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new Error(`${location} must be a non-empty NUL-free string`);
}

function validateContinuationPlan(plan) {
  exactFields(plan, PLAN_FIELDS, "continuationPlan");
  for (const field of ["source_phase_id", "source_item_id", "kind", "target_phase_id", "target_id", "claim_token"]) nonEmpty(plan[field], `continuationPlan.${field}`);
  if (plan.kind !== "same_phase_work_item" && plan.kind !== "phase_entry") throw new Error("continuationPlan.kind is unsupported");
  if (!Number.isInteger(plan.lease_ms) || plan.lease_ms <= 0) throw new Error("continuationPlan.lease_ms must be a positive integer");
  if (plan.inventory !== null) {
    exactFields(plan.inventory, ["phase_id", "inventory_version", "items"], "continuationPlan.inventory");
    nonEmpty(plan.inventory.phase_id, "continuationPlan.inventory.phase_id");
    nonEmpty(plan.inventory.inventory_version, "continuationPlan.inventory.inventory_version");
    if (!Array.isArray(plan.inventory.items) || plan.inventory.items.length === 0) throw new Error("continuationPlan.inventory.items must be a non-empty sequence");
  }
}

function runtimePath(filename) {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(directory, filename),
    path.resolve(directory, "../../../plugins/maister/skills/orchestrator-framework/bin", filename),
  ];
  const selected = candidates.find((candidate) => fs.existsSync(candidate));
  if (!selected) throw new Error(`shared runtime is missing ${filename}`);
  return selected;
}

async function loadSharedRuntime() {
  const evaluator = await import(pathToFileURL(runtimePath("gate-evaluator.mjs")));
  const continuation = await import(pathToFileURL(runtimePath("workflow-continuation.mjs")));
  const repository = await import(pathToFileURL(runtimePath("orchestrator-state-repository.mjs")));
  return { ...evaluator, ...continuation, ...repository };
}

function verifyTerminalWithRunner(statePath, gate) {
  const payload = {
    state: statePath,
    phase_id: gate.phase_id,
    gate_type: gate.gate_type,
    question: gate.question,
    options: gate.options,
    selected_option: gate.selected_option,
    actor: gate.final_actor,
    confidence: gate.confidence,
  };
  const execution = spawnSync(process.execPath, [runtimePath("phase-continue.mjs")], {
    encoding: "utf8",
    input: `${JSON.stringify(payload)}\n`,
    maxBuffer: 1024 * 1024,
  });
  if (execution.error) throw execution.error;
  if (execution.status !== 0) throw new Error(`phase continuation verification failed: ${execution.stderr.trim() || `exit ${execution.status}`}`);
  let result;
  try {
    result = JSON.parse(execution.stdout);
  } catch {
    throw new Error("phase continuation verifier returned invalid JSON");
  }
  if (result.gate_status !== "decided" || result.actor !== gate.final_actor || result.selected_option !== gate.selected_option) {
    throw new Error("phase continuation verifier returned a conflicting terminal record");
  }
}

function frozenReceipt(state, dispatch) {
  const receipt = { state: structuredClone(state), dispatch: structuredClone(dispatch) };
  const freeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  };
  freeze(receipt);
  return receipt;
}

export async function runFullyAutomaticGate(options) {
  exactFields(options, RUN_FIELDS, "Codex automatic gate options");
  if (!isMapping(options.rolePort)) throw new Error("rolePort must be an object");
  if (options.continuationPlan !== null) validateContinuationPlan(options.continuationPlan);
  const runtime = await loadSharedRuntime();
  const evaluation = await runtime.evaluateGate({
    statePath: options.statePath,
    gateContext: options.gateContext,
    roleConfig: options.roleConfig,
    rolePort: options.rolePort,
    userPort: options.userPort,
    automaticContinuationSupported: options.automaticContinuationSupported,
    interactive: options.interactive,
    now: options.now,
    wait: options.wait,
  });
  const directive = validateSharedRuntimeResult({ directive: evaluation.directive });
  if (directive.directive !== "continue") return directive;
  if (options.continuationPlan === null) throw new Error("continue requires a continuationPlan");
  if (!isMapping(options.targetPort) || typeof options.targetPort.beginAcknowledgedTarget !== "function") throw new Error("continue requires targetPort.beginAcknowledgedTarget");

  const canonical = runtime.readState(options.statePath);
  const gate = canonical.orchestrator.gate_history.find((candidate) => candidate.idempotency_key === evaluation.gate.idempotency_key);
  if (!gate || gate.status !== "decided" || gate.provenance_kind !== "complete") throw new Error("canonical terminal gate is missing or unsafe");
  verifyTerminalWithRunner(options.statePath, gate);

  const plan = options.continuationPlan;
  if (plan.inventory !== null) {
    await runtime.materializeInventory({
      statePath: options.statePath,
      phaseId: plan.inventory.phase_id,
      inventoryVersion: plan.inventory.inventory_version,
      items: plan.inventory.items,
    });
  }
  const applied = await runtime.applySelectionAndCreateDispatch({
    statePath: options.statePath,
    gateKey: gate.idempotency_key,
    sourcePhaseId: plan.source_phase_id,
    sourceItemId: plan.source_item_id,
    kind: plan.kind,
    targetPhaseId: plan.target_phase_id,
    targetId: plan.target_id,
  });
  const claimed = await runtime.claimDispatch({
    statePath: options.statePath,
    dispatchId: applied.dispatch.dispatch_id,
    claimToken: plan.claim_token,
    leaseMs: plan.lease_ms,
    now: options.now,
  });
  const acknowledged = await runtime.acknowledgeDispatch({
    statePath: options.statePath,
    dispatchId: applied.dispatch.dispatch_id,
    claimToken: claimed.dispatch.claim_token,
    now: options.now,
  });
  const reread = runtime.readState(options.statePath);
  const durableDispatch = reread.orchestrator.dispatch_outbox.find((candidate) => candidate.dispatch_id === acknowledged.dispatch.dispatch_id);
  if (!durableDispatch || durableDispatch.status !== "acknowledged" || durableDispatch.checkpoint !== acknowledged.dispatch.checkpoint) {
    throw new Error("acknowledged target checkpoint is not durable");
  }
  await options.targetPort.beginAcknowledgedTarget(frozenReceipt(reread, durableDispatch));
  return directive;
}

async function main() {
  const inputFile = parseArguments(process.argv.slice(2));
  const input = await readFile(inputFile, "utf8");
  const result = validateSharedRuntimeResult(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fully-automatic-gate: ${message}\n`);
    process.exitCode = 1;
  }
}
