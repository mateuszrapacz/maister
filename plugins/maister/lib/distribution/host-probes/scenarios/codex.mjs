import crypto from "node:crypto";

const ROLE_SCENARIOS = Object.freeze([
  Object.freeze({ role_id: "code-reviewer", behavior: "evidence-code-reviewer-v1" }),
  Object.freeze({ role_id: "implementation-planner", behavior: "evidence-implementation-planner-v1" }),
  Object.freeze({ role_id: "advisor", behavior: "evidence-advisor-v1" }),
]);

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function result(reason) {
  return { result: "failed", reason };
}

function expectedCodexPolicy(request) {
  return {
    model: request.requested_execution_policy?.model?.model,
    reasoning_effort: request.requested_execution_policy?.reasoning?.effort,
  };
}

function validateCodexPolicy(request, observation) {
  const evidence = observation.execution_policy_evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return { result: "unavailable", reason: "effective-policy-observation-unavailable" };
  }
  const expected = expectedCodexPolicy(request);
  if (typeof expected.model !== "string" || typeof expected.reasoning_effort !== "string") {
    return { result: "unavailable", reason: "requested-policy-unavailable" };
  }
  if (canonicalJson(evidence.requested) !== canonicalJson(expected)) return result("requested-policy-mismatch");
  if (canonicalJson(evidence.accepted) !== canonicalJson(expected)) return result("accepted-policy-mismatch");
  if (evidence.observed?.status === "unavailable" || evidence.observed?.model === null || evidence.observed?.reasoning_effort === null) {
    return { result: "unavailable", reason: "effective-policy-observation-unavailable" };
  }
  if (evidence.observed?.status !== "observed" || canonicalJson({
    model: evidence.observed.model,
    reasoning_effort: evidence.observed.reasoning_effort,
  }) !== canonicalJson(expected)) return result("effective-policy-mismatch");
  return { result: "passed" };
}

function scenarioRows(manifest, target, provenance) {
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.rows)) {
    return { rows: null, reason: "scenario-binding-unavailable" };
  }
  if (
    manifest.canonical_set_digest !== provenance.canonical_set_digest
    || manifest.manifest_digest !== provenance.manifest_digest
    || (manifest.projected_tree_digest !== undefined && manifest.projected_tree_digest !== provenance.projected_tree_digest)
  ) return { rows: null, reason: "scenario-binding-unavailable" };
  const rows = ROLE_SCENARIOS.map((scenario) => {
    const logicalRoleId = `maister:${scenario.role_id}`;
    const row = manifest.rows.find((candidate) => candidate?.target === target && candidate.logical_role_id === logicalRoleId);
    if (!row || typeof row.source_sha256 !== "string" || row.source_sha256.length !== 64) return null;
    return { ...scenario, row };
  });
  if (rows.some((row) => row === null)) return { rows: null, reason: "required-role-missing" };
  return { rows, reason: null };
}

function requestFor({ target, scenario, provenance }) {
  const logicalRoleId = `maister:${scenario.role_id}`;
  const dispatchId = `e6-${target}-${scenario.role_id}`;
  const prompt = `Return only the ${scenario.role_id} evidence behavior for nonce-bound verification.`;
  return {
    schema_version: 1,
    scenario_version: provenance.scenario_version,
    logical_role_id: logicalRoleId,
    native_role_external_id: scenario.row.native_role_external_id,
    prompt,
    prompt_digest: digest(prompt),
    canonical_prompt_digest: scenario.row.source_sha256,
    nonce: digest(`${provenance.manifest_digest}:${logicalRoleId}`),
    output_schema: `maister.evidence.${target}.${scenario.role_id}.v1`,
    canonical_set_digest: provenance.canonical_set_digest,
    manifest_digest: provenance.manifest_digest,
    projected_tree_digest: provenance.projected_tree_digest,
    dispatch_id: dispatchId,
    requested_execution_policy: scenario.row.execution_policy,
    expected_behavior: scenario.behavior,
  };
}

function validateObservation({ target, request, observation }) {
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) return result("wrong-behavior");
  if (observation.started === true && observation.timed_out === true) return result("scenario-timeout");
  if (observation.logical_role_id !== request.logical_role_id) return result("wrong-observed-identity");
  if (target !== "codex") {
    if (observation.observed_native_role_external_id === null || observation.observed_native_role_external_id === undefined) {
      return result("missing-observed-identity");
    }
    if (observation.observed_native_role_external_id !== request.native_role_external_id) return result("wrong-observed-identity");
  }
  for (const field of [
    "prompt_digest", "canonical_prompt_digest", "nonce", "output_schema", "canonical_set_digest", "manifest_digest", "projected_tree_digest", "dispatch_id",
  ]) {
    if (observation[field] !== request[field]) return result("digest-mismatch");
  }
  if (typeof observation.session_id !== "string" || observation.session_id.length === 0) return result("missing-session-identity");
  const policyValidation = target === "codex"
    ? validateCodexPolicy(request, observation)
    : canonicalJson(observation.effective_execution_policy) === canonicalJson(request.requested_execution_policy)
      ? { result: "passed" }
      : result("effective-policy-mismatch");
  if (policyValidation.result !== "passed") return policyValidation;
  if (observation.behavior !== request.expected_behavior) return result("wrong-behavior");
  return { result: "passed" };
}

export function runCodexInvocationScenario({ target = "codex", manifest, provenance, invoke } = {}) {
  if (typeof invoke !== "function") return { result: "unavailable", reason: "scenario-not-configured" };
  const resolved = scenarioRows(manifest, target, provenance);
  if (!resolved.rows) return { result: "unavailable", reason: resolved.reason };
  for (const scenario of resolved.rows) {
    const validation = validateObservation({ target, request: requestFor({ target, scenario, provenance }), observation: invoke(requestFor({ target, scenario, provenance })) });
    if (validation.result !== "passed") return validation;
  }
  return { result: "passed" };
}

export { ROLE_SCENARIOS };
