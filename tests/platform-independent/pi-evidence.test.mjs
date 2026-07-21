import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_EXPIRY_MS,
  createEvidenceRecord,
} from "../../plugins/maister/lib/distribution/evidence-schema.mjs";
import {
  collectEvidence,
  evaluateCapability,
  evidenceNeedsRenewal,
} from "../../plugins/maister/lib/distribution/evidence-policy.mjs";
import {
  PI_DELEGATION_EVENT_VALUES,
  PI_DELEGATION_PUBLIC_EXPORTS,
  PI_COMPATIBILITY,
  probePi,
} from "../../plugins/maister/lib/distribution/host-probes/pi.mjs";
import { probeTarget } from "../../plugins/maister/lib/distribution/host-probes/index.mjs";

const NOW = "2026-07-21T00:00:00.000Z";
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const DIGEST_D = "d".repeat(64);

function provenance(overrides = {}) {
  return {
    source_commit: "e".repeat(40),
    source_version: "2.2.1",
    overlay_id: "maister/pi",
    overlay_version: "1.0.0",
    host: "pi",
    scenario_version: "1.0.0",
    schema_version: 1,
    projector_version: "1.0.0",
    canonical_set_digest: DIGEST_A,
    manifest_digest: DIGEST_B,
    projected_tree_digest: DIGEST_C,
    source_hash: DIGEST_A,
    overlay_hash: DIGEST_B,
    materialized_hash: DIGEST_C,
    provenance_hash: DIGEST_D,
    ...overrides,
  };
}

function manifest() {
  return {
    canonical_set_digest: DIGEST_A,
    manifest_digest: DIGEST_B,
    projected_tree_digest: DIGEST_C,
    rows: [
      ["code-reviewer", "evidence-code-reviewer-v1"],
      ["implementation-planner", "evidence-implementation-planner-v1"],
      ["advisor", "evidence-advisor-v1"],
    ].map(([role, behavior]) => ({
      target: "pi",
      logical_role_id: `maister:${role}`,
      native_role_external_id: `maister:${role}`,
      source_sha256: DIGEST_D,
      execution_policy: { model: "pi-default", reasoning_effort: null },
      behavior,
    })),
  };
}

function availableVersion(commandOrOutput, args) {
  const output = args === undefined
    ? (commandOrOutput ?? "Pi 0.80.10\n")
    : "Pi 0.80.10\n";
  return { status: 0, stdout: output, stderr: "", error: null, signal: null };
}

function environmentObservation(overrides = {}) {
  const nativeRoleExternalIds = manifest().rows.map((row) => row.native_role_external_id);
  return {
    executable_realpath: "/opt/pi/bin/pi",
    pi_version: PI_COMPATIBILITY.pi,
    node_version: PI_COMPATIBILITY.node,
    pi_subagents_version: PI_COMPATIBILITY.piSubagents,
    pi_subagents_source: "/opt/pi/node_modules/pi-subagents/package.json",
    pi_subagents_digest: DIGEST_D,
    public_exports: [...PI_DELEGATION_PUBLIC_EXPORTS],
    protocol_version: PI_COMPATIBILITY.delegationProtocol,
    public_event_values: { ...PI_DELEGATION_EVENT_VALUES },
    native_role_external_ids: nativeRoleExternalIds,
    package_identity: "maister",
    package_root: "/opt/pi/agent/maister",
    native_descriptors: nativeRoleExternalIds.map((native_role_external_id) => ({
      native_role_external_id,
      name: native_role_external_id,
      disabled: false,
      source_info: {
        package_name: "maister",
        package_root: "/opt/pi/agent/maister",
      },
    })),
    ...overrides,
  };
}

function invocation(request) {
  return {
    logical_role_id: request.logical_role_id,
    observed_native_role_external_id: request.native_role_external_id,
    prompt_digest: request.prompt_digest,
    canonical_prompt_digest: request.canonical_prompt_digest,
    nonce: request.nonce,
    output_schema: request.output_schema,
    canonical_set_digest: request.canonical_set_digest,
    manifest_digest: request.manifest_digest,
    projected_tree_digest: request.projected_tree_digest,
    dispatch_id: request.dispatch_id,
    session_id: `pi-session-${request.logical_role_id}`,
    effective_execution_policy: request.requested_execution_policy,
    behavior: request.expected_behavior,
  };
}

function probe(overrides = {}) {
  return probePi({
    now: NOW,
    run: availableVersion,
    provenance: provenance(),
    manifest: manifest(),
    expectedExecutableRealpath: "/opt/pi/bin/pi",
    discover: () => environmentObservation(),
    invoke: invocation,
    ...overrides,
  });
}

test("Pi probe is registered and passes only the pinned executable, Node, public export, and inventory tuple", () => {
  const result = probe();
  assert.equal(probeTarget("pi", {
    now: NOW,
    run: availableVersion,
    provenance: provenance(),
    manifest: manifest(),
    expectedExecutableRealpath: "/opt/pi/bin/pi",
    discover: () => environmentObservation(),
    invoke: invocation,
  }).records[0].result, "passed");
  assert.deepEqual(result.records.map((record) => record.result), ["passed", "passed"]);
  assert.equal(result.records[0].provenance.executable_realpath, "/opt/pi/bin/pi");
  assert.equal(result.records[0].provenance.node_version, PI_COMPATIBILITY.node);
  assert.equal(result.records[1].provenance.prerequisite_version, PI_COMPATIBILITY.piSubagents);
  assert.deepEqual(result.records[0].provenance.native_role_external_ids, [
    "maister:advisor",
    "maister:code-reviewer",
    "maister:implementation-planner",
  ]);
});

test("Pi probe fails closed with typed unavailable reasons and does not infer native support from version alone", () => {
  const missingExport = probe({
    discover: () => environmentObservation({ public_exports: null }),
  });
  assert.equal(missingExport.records[0].result, "unavailable");
  assert.equal(missingExport.records[0].provenance.reason, "public_export_missing");
  assert.equal(missingExport.records[1].provenance.reason, "public_export_missing");

  const wrongNode = probe({
    discover: () => environmentObservation({ node_version: "24.0.0" }),
  });
  assert.equal(wrongNode.records[0].result, "unavailable");
  assert.equal(wrongNode.records[0].provenance.reason, "node_engine_mismatch");

  const wrongPi = probe({
    run: () => availableVersion("Pi 0.79.10\n"),
    discover: () => environmentObservation({ pi_version: "0.79.10" }),
  });
  assert.equal(wrongPi.records[0].provenance.reason, "pi_version_mismatch");
  assert.equal(wrongPi.records[1].provenance.reason, "pi_version_mismatch");

  const versionOnly = probe({
    discover: undefined,
    invoke: undefined,
    inspect: () => environmentObservation({ pi_subagents_version: null, public_exports: null }),
  });
  assert.equal(versionOnly.records[0].result, "unavailable");
  assert.equal(versionOnly.records[0].provenance.reason, "delegation_package_missing");

  const missingRuntime = probe({
    run: () => ({ status: null, stdout: "", stderr: "", error: { code: "ENOENT" }, signal: null }),
    discover: undefined,
    invoke: undefined,
  });
  assert.deepEqual(missingRuntime.records.map((record) => record.provenance.reason), ["pi_missing", "pi_missing"]);

  const unsupportedPlatform = probe({
    platform: "win32",
    discover: () => environmentObservation(),
    invoke: invocation,
  });
  assert.deepEqual(unsupportedPlatform.records.map((record) => record.provenance.reason), ["platform_unsupported", "platform_unsupported"]);

  const missingDigest = probe({
    discover: () => environmentObservation({ pi_subagents_digest: null }),
    invoke: undefined,
  });
  assert.equal(missingDigest.records[0].provenance.reason, "delegation_package_missing");

  const notReady = probe({
    discover: () => environmentObservation({ readiness: false }),
    invoke: undefined,
  });
  assert.equal(notReady.records[0].provenance.reason, "readiness_unavailable");
});

test("Pi discovery rejects public delegation exports with incompatible event channel values", () => {
  const result = probePi({
    now: NOW,
    sourceCommit: "0123456789abcdef0123456789abcdef01234567",
    sourceVersion: "1.2.3",
    overlayVersion: "1.0.0",
    discover: () => environmentObservation({ public_event_values: { ...PI_DELEGATION_EVENT_VALUES, request: "wrong:event" } }),
    run: availableVersion,
    invoke: invocation,
  });
  assert.deepEqual(result.records.map((record) => record.provenance.reason), ["public_event_mismatch", "public_event_mismatch"]);
});

test("Pi evidence expiry and host/prerequisite binding force renewal", () => {
  const baseline = createEvidenceRecord({ target: "pi", capability: "E1", hostVersion: "0.80.10", scenario: "overlay-contract-v1", result: "passed", provenance: provenance(), timestamp: NOW });
  const native = createEvidenceRecord({
    target: "pi",
    capability: "E5",
    hostVersion: "0.80.10",
    scenario: "pi-native-discovery-v1",
    result: "passed",
    provenance: provenance({ executable_realpath: "/opt/pi/bin/pi", node_version: "25.9.0", prerequisite_version: "0.35.1", prerequisite_digest: DIGEST_D, protocol_version: 1 }),
    timestamp: NOW,
  });
  assert.equal(Date.parse(baseline.expires_at) - Date.parse(NOW), EVIDENCE_EXPIRY_MS.baseline);
  assert.equal(Date.parse(native.expires_at) - Date.parse(NOW), EVIDENCE_EXPIRY_MS.native);
  assert.equal(evidenceNeedsRenewal(native, {
    now: "2026-07-22T00:00:00.000Z",
    host: "pi",
    hostVersion: "0.80.10",
    executableRealpath: "/opt/pi/bin/pi",
    nodeVersion: "25.9.0",
    prerequisiteVersion: "0.35.1",
    prerequisiteDigest: DIGEST_D,
    protocolVersion: 1,
  }), false);
  assert.equal(evidenceNeedsRenewal(native, { now: "2026-07-22T00:00:00.000Z", prerequisiteVersion: "0.35.2" }), true);
  assert.equal(evidenceNeedsRenewal(native, { now: "2026-07-22T00:00:00.000Z", executableRealpath: "/other/pi" }), true);
});

test("Pi claim evaluation allows provisional packaging but blocks native/semantic claims when E5/E6 are unavailable", () => {
  const records = collectEvidence({
    target: "pi",
    hostVersion: "unknown",
    provenance: provenance(),
    timestamp: NOW,
    records: ["E1", "E2", "E3", "E4"].map((capability) => createEvidenceRecord({
      target: "pi",
      capability,
      hostVersion: "unknown",
      scenario: `${capability.toLowerCase()}-fixture-v1`,
      result: "passed",
      provenance: provenance(),
      timestamp: NOW,
    })),
  });
  const packaging = evaluateCapability({
    target: "pi",
    capability: "packaging",
    capabilityClass: "packaging",
    requiredEvidence: ["E1", "E2", "E3", "E4", "E5", "E6"],
    records,
    now: NOW,
  });
  const semantic = evaluateCapability({
    target: "pi",
    capability: "native_runtime",
    capabilityClass: "semantic",
    requiredEvidence: ["E3", "E6"],
    records,
    now: NOW,
  });
  assert.equal(packaging.status, "provisional");
  assert.equal(packaging.passed, false);
  assert.equal(semantic.status, "blocked");
  assert.deepEqual(semantic.unavailable, ["E6"]);
});
