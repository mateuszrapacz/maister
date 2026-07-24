import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { projectionDigest } from "../../../../plugins/maister/lib/distribution/agent-projection-validator.mjs";
import { canonicalJson } from "../../../../plugins/maister/lib/distribution/provenance.mjs";
import { getTargetPaths } from "../../../../plugins/maister/lib/distribution/target-paths.mjs";

const RECEIPT_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const INSTALLED_AT = "2026-07-18T10:00:00.000Z";
const EXPIRES_AT = "2027-07-18T10:00:00.000Z";
const ROLE_IDS = Object.freeze(["advisor", "project-analyzer"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function targetContract(target) {
  if (target === "codex") {
    return {
      adapterId: "codex.exec",
      representation: "codex-prompt-schema",
      nativeId: () => null,
      destinations: (roleId) => [
        { kind: "prompt", path: `skills/maister-orchestrator-framework/agents/maister-${roleId}.md`, mode: "0644" },
        { kind: "output-schema", path: `skills/maister-orchestrator-framework/agent-schemas/maister-${roleId}.schema.json`, mode: "0644" },
      ],
    };
  }
  if (target === "cursor") {
    return {
      adapterId: "cursor.native",
      representation: "cursor-markdown",
      nativeId: (roleId) => `maister-${roleId}`,
      destinations: (roleId) => [{ kind: "agent", path: `agents/${roleId}.md`, mode: "0644" }],
    };
  }
  return {
    adapterId: "kiro-cli.native",
    representation: "kiro-descriptor-prompt",
    nativeId: (roleId) => `maister-${roleId}`,
    destinations: (roleId) => [
      { kind: "descriptor", path: `agents/maister-${roleId}.json`, mode: "0644" },
      { kind: "prompt", path: `agents/instructions/maister-${roleId}.md`, mode: "0644" },
    ],
  };
}

function executionPolicy(target) {
  const inherited = target !== "codex";
  return {
    tools: { id: "tools.read-only", tools: ["read", "search"] },
    permissions: { id: "permissions.read-only", filesystem: "read-only", network: "restricted" },
    model: { id: inherited ? "model.host-inherit" : "model.codex-pinned", model: inherited ? null : "gpt-5.2-codex", allow_inherit: inherited },
    reasoning: { id: inherited ? "reasoning.host-inherit" : "reasoning.codex-high", effort: inherited ? null : "high", allow_inherit: inherited },
    timeout: { id: "timeout.standard", milliseconds: 900000 },
    output_schema: { id: "output-schema.role-result-v1", schema_id: "maister.agent-role-result.v1" },
    concurrency: { id: "concurrency.read-only", class: "read-only-concurrent", max_parallel: 4 },
  };
}

function manifestRow(target, roleId) {
  const contract = targetContract(target);
  const policy = executionPolicy(target);
  return {
    role_id: roleId,
    logical_role_id: `maister:${roleId}`,
    target,
    adapter_id: contract.adapterId,
    native_role_external_id: contract.nativeId(roleId),
    source_path: `agents/${roleId}.md`,
    source_sha256: sha256(`${roleId} source\n`),
    description: `${roleId} fixture`,
    model_profile_id: "inherit",
    color: null,
    skill_dependencies: [],
    transform_ids: ["canonical-body-v1"],
    destinations: contract.destinations(roleId),
    execution_profile_id: `${target}.read-only`,
    profile_ids: {
      tools: policy.tools.id,
      permissions: policy.permissions.id,
      model: policy.model.id,
      reasoning: policy.reasoning.id,
      timeout: policy.timeout.id,
      output_schema: policy.output_schema.id,
      concurrency: policy.concurrency.id,
    },
    execution_policy: policy,
  };
}

function createManifest(target) {
  const payload = {
    schema_version: 1,
    projector_version: "1.0.0",
    canonical_set_digest: sha256("canonical set"),
    rows: ROLE_IDS.map((roleId) => manifestRow(target, roleId)),
    support_inventory: [],
  };
  return { ...payload, manifest_digest: sha256(canonicalJson(payload)) };
}

function outputFor(row, destination) {
  const content = destination.kind === "output-schema" || destination.kind === "descriptor"
    ? `${canonicalJson({ logical_role_id: row.logical_role_id })}\n`
    : `${row.logical_role_id} instructions\n`;
  return {
    path: destination.path,
    kind: destination.kind,
    mode: destination.mode,
    ownership: "canonical",
    role_id: row.role_id,
    support_id: null,
    content,
    size: Buffer.byteLength(content),
    sha256: sha256(content),
  };
}

function createProjection(manifest, target) {
  const outputs = manifest.rows.flatMap((row) => row.destinations.map((destination) => outputFor(row, destination)));
  outputs.sort((left, right) => left.path.localeCompare(right.path, "en-US"));
  return {
    schema_version: manifest.schema_version,
    projector_version: manifest.projector_version,
    target,
    canonical_set_digest: manifest.canonical_set_digest,
    manifest_digest: manifest.manifest_digest,
    transform_ids: ["canonical-body-v1"],
    canonical_role_ids: [...ROLE_IDS],
    support_inventory: [],
    outputs,
    projected_tree_digest: projectionDigest(outputs),
  };
}

function inventoryIdentity(target, outputPath) {
  return target === "kiro-cli"
    ? { root_id: "plugin_private", path: outputPath }
    : { root_id: "plugin_private", path: outputPath };
}

function evidence(target, hostVersion, provenance) {
  return ["E1", "E2", "E3", "E4", "E5", "E6"].map((capability) => ({
    target,
    capability,
    host_version: hostVersion,
    scenario: `${capability.toLowerCase()}-fixture-v1`,
    timestamp: INSTALLED_AT,
    result: "passed",
    provenance: { ...provenance },
    expires_at: EXPIRES_AT,
  }));
}

function createReceipt({ target, paths, manifest, projection, inventory }) {
  const targetInfo = {
    codex: { overlay: "maister/codex", version: "1.0.0", host: "1.2.3" },
    cursor: { overlay: "maister/cursor", version: "1.0.0", host: "1.2.3" },
    "kiro-cli": { overlay: "maister/kiro-cli", version: "1.0.0", host: "1.2.3" },
  }[target];
  const sourceHash = sha256("source");
  const hashProvenance = {
    source_hash: sourceHash,
    overlay_hash: sha256("overlay"),
    materialized_hash: sha256("materialized"),
    provenance_hash: sha256("provenance"),
  };
  const evidenceProvenance = {
    source_commit: SOURCE_COMMIT,
    source_version: "2.2.1",
    overlay_version: targetInfo.version,
    overlay_id: targetInfo.overlay,
    host: target,
    scenario_version: "1.0.0",
    schema_version: projection.schema_version,
    projector_version: projection.projector_version,
    canonical_set_digest: projection.canonical_set_digest,
    manifest_digest: projection.manifest_digest,
    projected_tree_digest: projection.projected_tree_digest,
    ...hashProvenance,
  };
  const required = ["E1", "E2", "E3", "E4", "E5", "E6"];
  return {
    schema_version: 2,
    receipt_id: RECEIPT_ID,
    installer_version: "2.2.1",
    status: "installed",
    installed_at: INSTALLED_AT,
    target: { id: target, overlay_id: targetInfo.overlay, overlay_version: targetInfo.version, host_version: targetInfo.host },
    source: {
      kind: "local",
      requested: "local:fixture",
      requested_ref: "HEAD",
      resolved_commit: SOURCE_COMMIT,
      source_version: "2.2.1",
      content_hash: sourceHash,
    },
    managed_roots: paths.managedRoots.map((root) => ({ root_id: root.rootId, path: root.path, ownership: root.ownership })),
    managed_inventory: inventory,
    settings: [],
    provenance: {
      ...hashProvenance,
      agent_projection: {
        schema_version: projection.schema_version,
        projector_version: projection.projector_version,
        canonical_set_digest: manifest.canonical_set_digest,
        manifest_digest: manifest.manifest_digest,
        projected_tree_digest: projection.projected_tree_digest,
      },
    },
    compatibility: {
      policy: "strict",
      scenario_version: "1.0.0",
      status: "supported",
      evaluations: [{
        target,
        capability: "runtime",
        capabilityClass: "semantic",
        required,
        passedEvidence: required,
        unavailable: [],
        failed: [],
        missing: [],
        expired: [],
        passed: true,
        status: "passed",
      }],
    },
    evidence: evidence(target, targetInfo.host, evidenceProvenance),
    transaction: { journal_id: RECEIPT_ID, backup_root: null, backup_manifest_hash: null, previous_receipt_id: null },
  };
}

function writeInstalledFiles({ target, paths, projection }) {
  const inventory = [];
  for (const output of projection.outputs) {
    const identity = inventoryIdentity(target, output.path);
    const root = paths.managedRoots.find(({ rootId }) => rootId === identity.root_id);
    const filePath = path.join(root.path, ...identity.path.split("/"));
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o755 });
    fs.writeFileSync(filePath, output.content, { mode: Number.parseInt(output.mode, 8) });
    fs.chmodSync(filePath, Number.parseInt(output.mode, 8));
    inventory.push({
      ...identity,
      type: "file",
      mode: output.mode,
      sha256: output.sha256,
      link_target: null,
      ownership: "whole_file",
    });
  }
  return inventory.sort((left, right) => left.root_id.localeCompare(right.root_id) || left.path.localeCompare(right.path));
}

export function createCapabilityHooks(trace = []) {
  return {
    externalCollisions: async () => { trace.push("external-collisions"); return { collisions: [] }; },
    adapter: async ({ row }) => { trace.push("adapter"); return { available: true, adapter_id: row.adapter_id }; },
    host: async ({ target }) => { trace.push("host"); return { available: true, host: target }; },
    version: async () => { trace.push("version"); return { available: true, supported: true, host_version: "1.2.3" }; },
    auth: async () => { trace.push("auth"); return { available: true, authenticated: true }; },
    controls: async () => { trace.push("controls"); return { available: true, unsupported_controls: [] }; },
    model: async () => { trace.push("model"); return { available: true, supported: true }; },
    reasoning: async () => { trace.push("reasoning"); return { available: true, supported: true }; },
  };
}

export function createResolverFixture({ target = "cursor" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-agent-resolver-"));
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  const env = { ...process.env, XDG_STATE_HOME: state };
  const paths = getTargetPaths({ target, home, env });
  for (const directory of [paths.stateRoot, paths.receiptsRoot, ...paths.managedRoots.map((entry) => entry.path)]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  const manifest = createManifest(target);
  const projection = createProjection(manifest, target);
  const inventory = writeInstalledFiles({ target, paths, projection });
  const receipt = createReceipt({ target, paths, manifest, projection, inventory });
  const receiptPath = path.join(paths.receiptsRoot, `${receipt.receipt_id}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  fs.writeFileSync(paths.activeReceiptPath, `${JSON.stringify({ schema_version: 2, receipt_id: receipt.receipt_id, receipt_path: receiptPath })}\n`, { mode: 0o600 });
  const trace = [];
  return {
    root,
    target,
    paths,
    manifest,
    projection,
    receipt,
    receiptPath,
    trace,
    hooks: createCapabilityHooks(trace),
    request: { logical_role_id: "maister:project-analyzer", target, dispatch_id: `dispatch-${target.replaceAll("-", "")}` },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
    clone,
  };
}

export { sha256 };
