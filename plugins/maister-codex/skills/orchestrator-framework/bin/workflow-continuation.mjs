import crypto from "node:crypto";

import { commitState, readState, StateRepositoryError } from "./orchestrator-state-repository.mjs";

const DISPATCH_KINDS = new Set(["same_phase_work_item", "phase_entry"]);

export class WorkflowContinuationError extends Error {
  constructor(message, code = "INVALID_CONTINUATION") {
    super(message);
    this.name = "WorkflowContinuationError";
    this.code = code;
  }
}

function fail(message, code) {
  throw new WorkflowContinuationError(message, code);
}

function nonEmpty(value, location) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) fail(`${location} must be a non-empty NUL-free string`, "INVALID_INPUT");
}

function parseTimestamp(value, location) {
  nonEmpty(value, location);
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || !value.endsWith("Z")) fail(`${location} must be a UTC RFC 3339 timestamp`, "INVALID_TIME");
  return timestamp;
}

function findGate(state, gateKey) {
  return state.orchestrator.gate_history.find((gate) => gate.idempotency_key === gateKey) ?? null;
}

function findDispatch(state, dispatchId) {
  return state.orchestrator.dispatch_outbox.find((entry) => entry.dispatch_id === dispatchId) ?? null;
}

function inventoryFor(state, phaseId) {
  return state.orchestrator.work[phaseId] ?? null;
}

function deterministicDispatchId(gateKey, kind, phaseId, targetId) {
  const identity = JSON.stringify([gateKey, kind, phaseId, targetId]);
  return `sha256:${crypto.createHash("sha256").update(identity).digest("hex")}`;
}

async function retryCommit(statePath, mutate) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = readState(statePath);
    try {
      return await commitState(statePath, current.orchestrator.revision, mutate);
    } catch (error) {
      if (!(error instanceof StateRepositoryError) || error.code !== "REVISION_CONFLICT" || attempt === 3) throw error;
    }
  }
  fail("state revision could not be reconciled", "REVISION_CONFLICT");
}

export async function materializeInventory({ statePath, phaseId, inventoryVersion, items }) {
  for (const [location, value] of [["statePath", statePath], ["phaseId", phaseId], ["inventoryVersion", inventoryVersion]]) nonEmpty(value, location);
  if (!Array.isArray(items) || items.length === 0) fail("items must be a non-empty ordered sequence", "INVALID_INVENTORY");
  const normalized = items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some((key) => !["id", "status"].includes(key))) fail(`items[${index}] has an invalid shape`, "INVALID_INVENTORY");
    nonEmpty(item.id, `items[${index}].id`);
    const status = item.status ?? (index === 0 ? "in_progress" : "ready");
    if (status !== "ready" && status !== "in_progress") fail(`items[${index}].status must be ready or in_progress`, "INVALID_INVENTORY");
    return { id: item.id, ordinal: index + 1, status, source_gate_key: null, selected_option: null };
  });
  if (new Set(normalized.map((item) => item.id)).size !== normalized.length) fail("inventory item IDs must be unique", "INVALID_INVENTORY");
  const current = readState(statePath);
  const existing = inventoryFor(current, phaseId);
  if (existing) {
    if (existing.inventory_version !== inventoryVersion || JSON.stringify(existing.items.map(({ id, ordinal }) => ({ id, ordinal }))) !== JSON.stringify(normalized.map(({ id, ordinal }) => ({ id, ordinal })))) fail("existing inventory identity differs", "INVENTORY_CONFLICT");
    return { state: current, inventory: structuredClone(existing), reused: true };
  }
  const state = await retryCommit(statePath, (draft) => {
    if (inventoryFor(draft, phaseId)) fail("inventory appeared concurrently", "INVENTORY_CONFLICT");
    draft.orchestrator.work[phaseId] = { inventory_version: inventoryVersion, items: structuredClone(normalized) };
  });
  return { state, inventory: structuredClone(inventoryFor(state, phaseId)), reused: false };
}

export async function applySelectionAndCreateDispatch({ statePath, gateKey, sourcePhaseId, sourceItemId, kind, targetPhaseId, targetId }) {
  for (const [location, value] of [["statePath", statePath], ["gateKey", gateKey], ["sourcePhaseId", sourcePhaseId], ["sourceItemId", sourceItemId], ["targetPhaseId", targetPhaseId], ["targetId", targetId]]) nonEmpty(value, location);
  if (!DISPATCH_KINDS.has(kind)) fail("kind must be same_phase_work_item or phase_entry", "INVALID_INPUT");
  if (kind === "same_phase_work_item" && targetPhaseId !== sourcePhaseId) fail("same-phase dispatch must retain the source phase", "INVALID_TARGET");
  const dispatchId = deterministicDispatchId(gateKey, kind, targetPhaseId, targetId);
  const current = readState(statePath);
  const existing = findDispatch(current, dispatchId);
  if (existing) return { state: current, dispatch: structuredClone(existing), reused: true };
  const state = await retryCommit(statePath, (draft) => {
    const gate = findGate(draft, gateKey);
    if (!gate || gate.status !== "decided" || gate.provenance_kind !== "complete" || gate.selected_option === null) fail("dispatch requires a complete terminal gate", "GATE_NOT_TERMINAL");
    if (gate.escalate_to_user || gate.confidence === "low" || gate.confidence === null) fail("unsafe terminal gate cannot dispatch", "UNSAFE_GATE");
    const inventory = inventoryFor(draft, sourcePhaseId);
    const source = inventory?.items.find((item) => item.id === sourceItemId);
    if (!source) fail("source work item is missing", "SOURCE_ITEM_MISSING");
    if (source.status !== "in_progress" && source.status !== "completed") fail("source work item must be in_progress", "SOURCE_ITEM_STATE");
    if (source.status === "completed" && (source.source_gate_key !== gateKey || source.selected_option !== gate.selected_option)) fail("source item has a conflicting applied selection", "SELECTION_CONFLICT");
    if (kind === "same_phase_work_item") {
      const target = inventory.items.find((item) => item.id === targetId);
      if (!target || (target.status !== "ready" && target.status !== "in_progress")) fail("same-phase target must be a ready inventory item", "INVALID_TARGET");
    } else {
      const targetPhase = draft.phases.find((phase) => phase.id === targetPhaseId);
      if (!targetPhase || targetPhase.status !== "pending") fail("phase-entry target must be a pending phase", "INVALID_TARGET");
    }
    source.status = "completed";
    source.source_gate_key = gateKey;
    source.selected_option = gate.selected_option;
    draft.orchestrator.dispatch_outbox.push({
      dispatch_id: dispatchId,
      source_gate_key: gateKey,
      kind,
      phase_id: targetPhaseId,
      target_id: targetId,
      status: "pending",
      attempts: 0,
      claim_token: null,
      claimed_at: null,
      lease_expires_at: null,
      checkpoint: null,
      acknowledged_at: null,
      error: null,
    });
  });
  return { state, dispatch: structuredClone(findDispatch(state, dispatchId)), reused: false };
}

export async function claimDispatch({ statePath, dispatchId, claimToken = crypto.randomUUID(), leaseMs = 30000, now = () => new Date().toISOString() }) {
  nonEmpty(statePath, "statePath");
  nonEmpty(dispatchId, "dispatchId");
  nonEmpty(claimToken, "claimToken");
  if (!Number.isInteger(leaseMs) || leaseMs <= 0 || typeof now !== "function") fail("leaseMs and now are invalid", "INVALID_INPUT");
  const observed = readState(statePath);
  const existing = findDispatch(observed, dispatchId);
  if (!existing) fail("dispatch is missing", "DISPATCH_MISSING");
  if (existing.status === "acknowledged") return { state: observed, dispatch: structuredClone(existing), reused: true };
  const claimedAt = now();
  const claimedMilliseconds = parseTimestamp(claimedAt, "now");
  if (existing.status === "claimed" && Date.parse(existing.lease_expires_at) > claimedMilliseconds) fail("dispatch has an unexpired claim", "CLAIM_CONFLICT");
  if (existing.status === "blocked") fail("blocked dispatch cannot be claimed", "DISPATCH_BLOCKED");
  const state = await retryCommit(statePath, (draft) => {
    const dispatch = findDispatch(draft, dispatchId);
    if (!dispatch) fail("dispatch disappeared", "DISPATCH_MISSING");
    if (dispatch.status === "acknowledged") return;
    if (dispatch.status === "claimed" && Date.parse(dispatch.lease_expires_at) > claimedMilliseconds) fail("dispatch has an unexpired claim", "CLAIM_CONFLICT");
    if (dispatch.status !== "pending" && dispatch.status !== "claimed") fail("dispatch cannot be claimed from its current state", "CLAIM_CONFLICT");
    dispatch.status = "claimed";
    dispatch.attempts += 1;
    dispatch.claim_token = claimToken;
    dispatch.claimed_at = claimedAt;
    dispatch.lease_expires_at = new Date(claimedMilliseconds + leaseMs).toISOString();
    dispatch.error = null;
  });
  return { state, dispatch: structuredClone(findDispatch(state, dispatchId)), reused: false };
}

export async function acknowledgeDispatch({ statePath, dispatchId, claimToken, now = () => new Date().toISOString() }) {
  for (const [location, value] of [["statePath", statePath], ["dispatchId", dispatchId], ["claimToken", claimToken]]) nonEmpty(value, location);
  if (typeof now !== "function") fail("now must be a function", "INVALID_INPUT");
  const observed = readState(statePath);
  const existing = findDispatch(observed, dispatchId);
  if (!existing) fail("dispatch is missing", "DISPATCH_MISSING");
  if (existing.status === "acknowledged") return { state: observed, dispatch: structuredClone(existing), reused: true };
  const acknowledgedAt = now();
  parseTimestamp(acknowledgedAt, "now");
  const checkpoint = `started:${existing.kind}:${existing.target_id}:${existing.dispatch_id}`;
  const state = await retryCommit(statePath, (draft) => {
    const dispatch = findDispatch(draft, dispatchId);
    if (dispatch.status === "acknowledged") return;
    if (dispatch.status !== "claimed" || dispatch.claim_token !== claimToken) fail("dispatch acknowledgement requires the matching active claim", "CLAIM_OWNERSHIP");
    if (Date.parse(dispatch.lease_expires_at) < Date.parse(acknowledgedAt)) fail("dispatch claim expired before acknowledgement", "CLAIM_EXPIRED");
    if (dispatch.kind === "same_phase_work_item") {
      const inventory = inventoryFor(draft, dispatch.phase_id);
      const target = inventory?.items.find((item) => item.id === dispatch.target_id);
      if (!target) fail("dispatch target work item is missing", "INVALID_TARGET");
      if (target.status === "ready") {
        target.status = "in_progress";
        target.source_gate_key = dispatch.source_gate_key;
      } else if (target.status !== "in_progress" || target.source_gate_key !== dispatch.source_gate_key) {
        fail("dispatch target has a conflicting checkpoint", "CHECKPOINT_CONFLICT");
      }
    } else {
      const sourcePhaseId = draft.orchestrator.current_phase;
      const sourcePhase = draft.phases.find((phase) => phase.id === sourcePhaseId);
      const targetPhase = draft.phases.find((phase) => phase.id === dispatch.phase_id);
      if (!sourcePhase || !targetPhase || targetPhase.id === sourcePhase.id) fail("phase-entry checkpoint has invalid phases", "INVALID_TARGET");
      if (targetPhase.status === "pending") {
        sourcePhase.status = "completed";
        targetPhase.status = "in_progress";
        draft.orchestrator.current_phase = targetPhase.id;
        if (!draft.orchestrator.completed_phases.includes(sourcePhase.id)) draft.orchestrator.completed_phases.push(sourcePhase.id);
      } else if (targetPhase.status !== "in_progress" || draft.orchestrator.current_phase !== targetPhase.id) {
        fail("phase-entry target has a conflicting checkpoint", "CHECKPOINT_CONFLICT");
      }
    }
    dispatch.status = "acknowledged";
    dispatch.checkpoint = checkpoint;
    dispatch.acknowledged_at = acknowledgedAt;
    dispatch.error = null;
  });
  return { state, dispatch: structuredClone(findDispatch(state, dispatchId)), reused: false };
}
