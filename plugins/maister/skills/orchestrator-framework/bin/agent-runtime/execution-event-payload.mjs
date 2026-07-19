export function effectivePolicyUnavailable(requestedPolicy) {
  return {
    ...structuredClone(requestedPolicy),
    model: null,
    reasoning_effort: null,
  };
}

export function createExecutionEventPayload({
  plan,
  task,
  eventType,
  clock,
  effectivePolicy = plan.policy,
  attempt = null,
  result = null,
  error = null,
}) {
  const now = clock();
  return {
    event_type: eventType,
    idempotency_key: task.execution_context.idempotency_key,
    dispatch_id: plan.dispatch_id,
    gate_decision_id: task.execution_context.gate_decision_id,
    workflow_id: task.execution_context.workflow_id,
    work_item_id: task.execution_context.work_item_id,
    logical_role_id: plan.requested_logical_role_id,
    canonical_source_digest: task.canonical_source_digest,
    manifest_digest: plan.provenance.manifest_digest,
    projection_digest: plan.provenance.projected_tree_digest,
    adapter_id: plan.adapter_id,
    native_role_external_id: plan.native_role_external_id,
    host: plan.host,
    host_version: plan.host_version,
    requested_execution_policy: structuredClone(plan.policy),
    effective_execution_policy: structuredClone(effectivePolicy),
    occurred_at: now,
    recorded_at: now,
    attempt,
    result,
    error,
  };
}
