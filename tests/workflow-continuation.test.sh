#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODULE="$ROOT/plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs"
FIXTURE="$ROOT/tests/fixtures/phase-continue/valid-v2-terminal.yml"
WORK="$(mktemp -d)"
WORK="$(cd "$WORK" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

run_case() {
  local name="$1"
  local scenario="$2"
  local state="$WORK/$name.yml"
  cp "$FIXTURE" "$state"
  STATE="$state" MODULE="$MODULE" node --input-type=module - "$scenario" <<'NODE'
const scenario = process.argv[2];
const {
  applySelectionAndCreateDispatch,
  claimDispatch,
  acknowledgeDispatch,
} = await import(process.env.MODULE);
const { readState } = await import(process.env.MODULE.replace("workflow-continuation.mjs", "orchestrator-state-repository.mjs"));

const statePath = process.env.STATE;
const gateKey = "sha256:terminal-gate";
const base = {
  statePath,
  gateKey,
  sourcePhaseId: "phase-1",
  sourceItemId: "decision-area:source",
};

if (scenario === "same-phase") {
  const applied = await applySelectionAndCreateDispatch({
    ...base,
    kind: "same_phase_work_item",
    targetPhaseId: "phase-1",
    targetId: "decision-area:target",
  });
  const claimed = await claimDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: "claim-one", leaseMs: 1000, now: () => "2026-07-13T00:01:00Z" });
  const ack = await acknowledgeDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: claimed.dispatch.claim_token, now: () => "2026-07-13T00:01:01Z" });
  const source = ack.state.orchestrator.work["phase-1"].items[0];
  const target = ack.state.orchestrator.work["phase-1"].items[1];
  if (source.status !== "completed" || source.selected_option !== "Continue" || target.status !== "in_progress" || ack.dispatch.status !== "acknowledged") process.exit(1);
}

if (scenario === "phase-entry") {
  const applied = await applySelectionAndCreateDispatch({ ...base, kind: "phase_entry", targetPhaseId: "phase-2", targetId: "phase-2" });
  const claimed = await claimDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: "claim-phase", leaseMs: 1000, now: () => "2026-07-13T00:01:00Z" });
  const ack = await acknowledgeDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: claimed.dispatch.claim_token, now: () => "2026-07-13T00:01:01Z" });
  if (ack.state.orchestrator.current_phase !== "phase-2" || ack.state.phases[0].status !== "completed" || ack.state.phases[1].status !== "in_progress") process.exit(1);
}

if (scenario === "reclaim") {
  const applied = await applySelectionAndCreateDispatch({ ...base, kind: "same_phase_work_item", targetPhaseId: "phase-1", targetId: "decision-area:target" });
  const first = await claimDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: "claim-old", leaseMs: 1000, now: () => "2026-07-13T00:01:00Z" });
  let rejected = false;
  try {
    await claimDispatch({ statePath, dispatchId: first.dispatch.dispatch_id, claimToken: "claim-early", leaseMs: 1000, now: () => "2026-07-13T00:01:00.500Z" });
  } catch { rejected = true; }
  const reclaimed = await claimDispatch({ statePath, dispatchId: first.dispatch.dispatch_id, claimToken: "claim-new", leaseMs: 1000, now: () => "2026-07-13T00:01:02Z" });
  if (!rejected || reclaimed.dispatch.claim_token !== "claim-new" || reclaimed.dispatch.attempts !== 2) process.exit(1);
}

if (scenario === "ack-recovery") {
  const applied = await applySelectionAndCreateDispatch({ ...base, kind: "same_phase_work_item", targetPhaseId: "phase-1", targetId: "decision-area:target" });
  const claimed = await claimDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: "claim-recovery", leaseMs: 1000, now: () => "2026-07-13T00:01:00Z" });
  const first = await acknowledgeDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: claimed.dispatch.claim_token, now: () => "2026-07-13T00:01:01Z" });
  const recovered = await acknowledgeDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: "unobserved-caller", now: () => "2026-07-13T00:02:00Z" });
  if (!recovered.reused || recovered.dispatch.checkpoint !== first.dispatch.checkpoint || recovered.state.orchestrator.revision !== first.state.orchestrator.revision) process.exit(1);
}

if (scenario === "ack-safety") {
  const applied = await applySelectionAndCreateDispatch({ ...base, kind: "same_phase_work_item", targetPhaseId: "phase-1", targetId: "decision-area:target" });
  const claimed = await claimDispatch({ statePath, dispatchId: applied.dispatch.dispatch_id, claimToken: "claim-owner", leaseMs: 1000, now: () => "2026-07-13T00:01:00Z" });
  let wrongOwnerRejected = false;
  let expiredRejected = false;
  try {
    await acknowledgeDispatch({ statePath, dispatchId: claimed.dispatch.dispatch_id, claimToken: "claim-intruder", now: () => "2026-07-13T00:01:00.500Z" });
  } catch { wrongOwnerRejected = true; }
  try {
    await acknowledgeDispatch({ statePath, dispatchId: claimed.dispatch.dispatch_id, claimToken: "claim-owner", now: () => "2026-07-13T00:01:02Z" });
  } catch { expiredRejected = true; }
  const state = readState(statePath);
  const dispatch = state.orchestrator.dispatch_outbox[0];
  const target = state.orchestrator.work["phase-1"].items[1];
  if (!wrongOwnerRejected || !expiredRejected || dispatch.status !== "claimed" || dispatch.checkpoint !== null || dispatch.acknowledged_at !== null || target.status !== "ready") process.exit(1);
}
NODE
}

run_case same-phase same-phase
echo "PASS: same-phase inventory advances through one acknowledged dispatch"
run_case phase-entry phase-entry
echo "PASS: forward phase entry is checkpointed with acknowledgement"
run_case reclaim reclaim
echo "PASS: expired claims are reclaimed without stealing live claims"
run_case ack-recovery ack-recovery
echo "PASS: acknowledgement recovery returns the stored checkpoint"
run_case ack-safety ack-safety
echo "PASS: wrong-owner and expired acknowledgements cannot start a target"
