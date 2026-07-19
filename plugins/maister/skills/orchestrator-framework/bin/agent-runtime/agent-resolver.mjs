import crypto from "node:crypto";
import fs from "node:fs";

import { projectionDigest } from "../../../../lib/distribution/agent-projection-validator.mjs";
import { canonicalJson } from "../../../../lib/distribution/provenance.mjs";
import { readFileNoFollow } from "../../../../lib/distribution/path-safety.mjs";
import { readActiveReceipt, validateReceipt } from "../../../../lib/distribution/receipt-schema.mjs";
import {
  getManagedRoot,
  projectedOutputIdentity,
  resolveManagedInventoryPath,
} from "../../../../lib/distribution/target-paths.mjs";
import { createDispatchPlan, DISPATCH_PLAN_SCHEMA_VERSION } from "./dispatch-contract.mjs";

const LOGICAL_ROLE_ID = /^maister:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TARGET_CONTRACTS = Object.freeze({
  codex: Object.freeze({ adapterId: "codex.exec", representation: "codex-prompt-schema", native: false }),
  cursor: Object.freeze({ adapterId: "cursor.native", representation: "cursor-markdown", native: true }),
  "kiro-cli": Object.freeze({ adapterId: "kiro-cli.native", representation: "kiro-descriptor-prompt", native: true }),
});
const OUTCOME_CODES = new Set([
  "E_AGENT_REQUEST_GRAMMAR",
  "E_AGENT_UNKNOWN_ROLE",
  "E_AGENT_AMBIGUOUS_ROLE",
  "E_AGENT_DUPLICATE_ROLE",
  "E_AGENT_MISSING_STATE",
  "E_AGENT_STALE_STATE",
  "E_AGENT_MISMATCHED_STATE",
  "E_AGENT_COLLIDED",
  "E_AGENT_UNAVAILABLE",
  "E_AGENT_UNSUPPORTED_CONTROL",
  "E_AGENT_UNSUPPORTED_MODEL",
  "E_AGENT_REASONING_UNAVAILABLE",
]);

export class AgentResolutionError extends Error {
  constructor(code, message, details = {}, { cause } = {}) {
    if (!OUTCOME_CODES.has(code)) throw new TypeError(`unknown agent resolution outcome: ${code}`);
    super(`[${code}] ${message}`, cause === undefined ? {} : { cause });
    this.name = "AgentResolutionError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function fail(code, message, details = {}, options = {}) {
  throw new AgentResolutionError(code, message, details, options);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function mapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactLogicalRoleId(value) {
  if (typeof value !== "string" || !LOGICAL_ROLE_ID.test(value)) {
    fail("E_AGENT_REQUEST_GRAMMAR", "logical role must use exact maister:<role_id> grammar", { logical_role_id: value ?? null });
  }
  return value;
}

function manifestPayload(manifest) {
  return {
    schema_version: manifest.schema_version,
    projector_version: manifest.projector_version,
    canonical_set_digest: manifest.canonical_set_digest,
    rows: manifest.rows,
    support_inventory: manifest.support_inventory,
  };
}

function manifestRows(manifest, target) {
  if (
    !mapping(manifest)
    || manifest.schema_version !== 1
    || typeof manifest.projector_version !== "string"
    || !SHA256.test(manifest.canonical_set_digest)
    || !Array.isArray(manifest.rows)
    || !Array.isArray(manifest.support_inventory)
    || typeof manifest.manifest_digest !== "string"
  ) {
    fail("E_AGENT_MISMATCHED_STATE", "agent manifest envelope is invalid", {});
  }
  const targetRows = manifest.rows.filter((row) => row?.target === target);
  const byLogicalRole = new Map();
  for (const row of targetRows) {
    if (typeof row.logical_role_id !== "string") fail("E_AGENT_MISMATCHED_STATE", "manifest row has no logical identity", {});
    const rows = byLogicalRole.get(row.logical_role_id) ?? [];
    rows.push(row);
    byLogicalRole.set(row.logical_role_id, rows);
  }
  for (const [logicalRoleId, rows] of byLogicalRole) {
    if (rows.length < 2) continue;
    const first = canonicalJson(rows[0]);
    if (rows.every((row) => canonicalJson(row) === first)) {
      fail("E_AGENT_DUPLICATE_ROLE", `manifest duplicates exact role ${logicalRoleId}`, { logical_role_id: logicalRoleId, target });
    }
    fail("E_AGENT_AMBIGUOUS_ROLE", `manifest maps exact role ${logicalRoleId} more than once`, { logical_role_id: logicalRoleId, target });
  }
  const expectedDigest = sha256(canonicalJson(manifestPayload(manifest)));
  if (manifest.manifest_digest !== expectedDigest) {
    fail("E_AGENT_MISMATCHED_STATE", "agent manifest digest is invalid", { expected: expectedDigest, actual: manifest.manifest_digest });
  }
  return targetRows;
}

function exactRow(rows, logicalRoleId, target) {
  const matches = rows.filter((row) => row.logical_role_id === logicalRoleId);
  if (matches.length === 0) fail("E_AGENT_UNKNOWN_ROLE", `unknown exact role ${logicalRoleId}`, { logical_role_id: logicalRoleId, target });
  return matches[0];
}

function normalizePolicy(row) {
  const policy = row.execution_policy;
  if (!mapping(policy)) fail("E_AGENT_MISMATCHED_STATE", "manifest execution policy is missing", { logical_role_id: row.logical_role_id });
  const tools = policy.tools?.tools;
  const timeoutMs = policy.timeout?.milliseconds;
  const maxParallel = policy.concurrency?.max_parallel;
  if (
    typeof row.execution_profile_id !== "string"
    || !Array.isArray(tools)
    || tools.length === 0
    || typeof policy.permissions?.filesystem !== "string"
    || typeof policy.permissions?.network !== "string"
    || !Number.isInteger(timeoutMs)
    || timeoutMs <= 0
    || typeof policy.output_schema?.schema_id !== "string"
    || typeof policy.concurrency?.class !== "string"
    || !Number.isInteger(maxParallel)
    || maxParallel <= 0
    || !(typeof policy.model?.model === "string" || policy.model?.model === null)
    || !(typeof policy.reasoning?.effort === "string" || policy.reasoning?.effort === null)
  ) {
    fail("E_AGENT_MISMATCHED_STATE", "manifest execution policy is incomplete", { logical_role_id: row.logical_role_id });
  }
  return {
    execution_profile_id: row.execution_profile_id,
    tools: [...tools],
    filesystem: policy.permissions.filesystem,
    network: policy.permissions.network,
    model: policy.model.model,
    reasoning_effort: policy.reasoning.effort,
    timeout_ms: timeoutMs,
    output_schema_id: policy.output_schema.schema_id,
    concurrency_class: policy.concurrency.class,
    max_parallel: maxParallel,
  };
}

function validateRow(row, logicalRoleId, target) {
  const contract = TARGET_CONTRACTS[target];
  if (!contract) fail("E_AGENT_MISMATCHED_STATE", `unsupported dispatch target ${target}`, { target });
  const roleId = logicalRoleId.slice("maister:".length);
  const expectedNative = contract.native ? `maister-${roleId}` : null;
  if (
    row.role_id !== roleId
    || row.target !== target
    || row.adapter_id !== contract.adapterId
    || row.native_role_external_id !== expectedNative
    || !SHA256.test(row.source_sha256)
    || !Array.isArray(row.destinations)
    || row.destinations.length === 0
  ) {
    fail("E_AGENT_MISMATCHED_STATE", "manifest row does not match the exact target representation", { logical_role_id: logicalRoleId, target });
  }
  for (const destination of row.destinations) {
    if (!mapping(destination) || typeof destination.kind !== "string" || typeof destination.path !== "string" || !/^[0-7]{4}$/u.test(destination.mode)) {
      fail("E_AGENT_MISMATCHED_STATE", "manifest destination is incomplete", { logical_role_id: logicalRoleId, target });
    }
  }
  return { roleId, contract, policy: normalizePolicy(row) };
}

function validateProjection(projection, manifest, target) {
  if (
    !mapping(projection)
    || projection.schema_version !== manifest.schema_version
    || projection.projector_version !== manifest.projector_version
    || projection.target !== target
    || projection.canonical_set_digest !== manifest.canonical_set_digest
    || projection.manifest_digest !== manifest.manifest_digest
    || !Array.isArray(projection.outputs)
    || !SHA256.test(projection.projected_tree_digest)
  ) {
    fail("E_AGENT_MISMATCHED_STATE", "installed projection binding differs from the manifest", { target });
  }
  for (const output of projection.outputs) {
    if (
      !mapping(output)
      || typeof output.path !== "string"
      || typeof output.content !== "string"
      || !/^[0-7]{4}$/u.test(output.mode)
      || !SHA256.test(output.sha256)
      || output.sha256 !== sha256(output.content)
      || output.size !== Buffer.byteLength(output.content)
    ) {
      fail("E_AGENT_MISMATCHED_STATE", "installed projection output metadata is invalid", { path: output?.path ?? null });
    }
  }
  const digest = projectionDigest(projection.outputs);
  if (digest !== projection.projected_tree_digest) {
    fail("E_AGENT_MISMATCHED_STATE", "installed projected-tree digest is stale", { expected: digest, actual: projection.projected_tree_digest });
  }
}

async function loadReceipt(loadActive, paths) {
  let active;
  try {
    active = await loadActive(paths);
  } catch (error) {
    if (["E_CLEAN_INSTALL_REQUIRED", "E_RECEIPT_SCHEMA"].includes(error?.kind)) {
      fail("E_AGENT_STALE_STATE", "active receipt schema is stale or invalid", { receipt_error: error.kind }, { cause: error });
    }
    if (error?.kind === "E_RECEIPT_IO") fail("E_AGENT_MISSING_STATE", "active receipt cannot be read", {}, { cause: error });
    throw error;
  }
  if (!active) fail("E_AGENT_MISSING_STATE", "no active receipt is installed", {});
  if (!mapping(active) || !mapping(active.receipt) || typeof active.receiptPath !== "string") {
    fail("E_AGENT_MISSING_STATE", "active receipt loader returned no validated receipt", {});
  }
  try {
    validateReceipt(active.receipt, { paths, receiptPath: active.receiptPath });
  } catch (error) {
    fail("E_AGENT_STALE_STATE", "active receipt schema is stale or invalid", { receipt_error: error?.kind ?? "unknown" }, { cause: error });
  }
  if (active.receipt.status !== "installed") {
    fail("E_AGENT_STALE_STATE", "active receipt is not installed", { status: active.receipt.status });
  }
  return active;
}

function assertProjectionBindings(receipt, manifest, projection) {
  const receiptBinding = receipt.provenance.agent_projection;
  const expected = {
    schema_version: projection.schema_version,
    projector_version: projection.projector_version,
    canonical_set_digest: manifest.canonical_set_digest,
    manifest_digest: manifest.manifest_digest,
    projected_tree_digest: projection.projected_tree_digest,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (receiptBinding[field] !== value) {
      fail("E_AGENT_MISMATCHED_STATE", `active receipt ${field} differs from installed projection`, { field, expected: value, actual: receiptBinding[field] });
    }
  }
}

function installedEntry(paths, entry) {
  const filePath = resolveManagedInventoryPath(paths, entry);
  const stat = fs.lstatSync(filePath, { throwIfNoEntry: false });
  if (!stat) fail("E_AGENT_MISSING_STATE", "receipt-owned inventory entry is missing", { root_id: entry.root_id, path: entry.path });
  const type = stat.isSymbolicLink() ? "symlink" : stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other";
  const mode = (stat.mode & 0o7777).toString(8).padStart(4, "0");
  if (type !== entry.type || mode !== entry.mode) {
    fail("E_AGENT_MISMATCHED_STATE", "receipt-owned inventory type or mode has drifted", { root_id: entry.root_id, path: entry.path, expected_type: entry.type, actual_type: type, expected_mode: entry.mode, actual_mode: mode });
  }
  if (type === "file") {
    const root = getManagedRoot(paths, entry.root_id);
    const bytes = readFileNoFollow(filePath, { root: root.path, label: `managed inventory ${entry.root_id}`, errorCode: "E_PATH_SECURITY" });
    const actualHash = sha256(bytes);
    if (actualHash !== entry.sha256) {
      fail("E_AGENT_MISMATCHED_STATE", "receipt-owned file bytes have drifted", { root_id: entry.root_id, path: entry.path, expected: entry.sha256, actual: actualHash });
    }
  } else if (type === "symlink" && fs.readlinkSync(filePath) !== entry.link_target) {
    fail("E_AGENT_MISMATCHED_STATE", "receipt-owned symlink target has drifted", { root_id: entry.root_id, path: entry.path });
  }
  return filePath;
}

function validateRootInventory(receipt, paths) {
  receipt.managed_inventory.forEach((entry) => installedEntry(paths, entry));
}

function validateRoleRepresentation(row, projection, receipt, paths) {
  for (const destination of row.destinations) {
    const output = projection.outputs.find((entry) => entry.path === destination.path && entry.role_id === row.role_id);
    if (!output) fail("E_AGENT_MISSING_STATE", "selected role projection output is missing", { role_id: row.role_id, path: destination.path });
    const identity = projectedOutputIdentity(paths, destination.path);
    const inventory = receipt.managed_inventory.find((entry) => entry.root_id === identity.rootId && entry.path === identity.path);
    if (!inventory) fail("E_AGENT_MISSING_STATE", "selected role is absent from receipt inventory", { role_id: row.role_id, root_id: identity.rootId, path: identity.path });
    if (inventory.type !== "file" || inventory.mode !== destination.mode || inventory.sha256 !== output.sha256) {
      fail("E_AGENT_MISMATCHED_STATE", "selected role representation differs from manifest, projection, or receipt", { role_id: row.role_id, root_id: identity.rootId, path: identity.path });
    }
  }
}

async function hook(hooks, name, context) {
  if (typeof hooks?.[name] !== "function") fail("E_AGENT_UNAVAILABLE", `required ${name} preflight hook is unavailable`, { stage: name });
  try {
    const result = await hooks[name](context);
    if (!mapping(result)) fail("E_AGENT_UNAVAILABLE", `${name} preflight returned no structured result`, { stage: name });
    return result;
  } catch (error) {
    if (error instanceof AgentResolutionError) throw error;
    fail("E_AGENT_UNAVAILABLE", `${name} preflight failed`, { stage: name }, { cause: error });
  }
}

async function capabilityPreflight(hooks, context) {
  const collision = await hook(hooks, "externalCollisions", context);
  if (!Array.isArray(collision.collisions)) fail("E_AGENT_UNAVAILABLE", "external collision preflight is not observable", { stage: "externalCollisions" });
  if (collision.collisions.length > 0) fail("E_AGENT_COLLIDED", "exact external role identity collides with unmanaged state", { collisions: collision.collisions });

  const adapter = await hook(hooks, "adapter", context);
  if (!adapter.available) fail("E_AGENT_UNAVAILABLE", "required adapter is unavailable", { stage: "adapter", adapter_id: context.row.adapter_id });
  if (adapter.adapter_id !== context.row.adapter_id) fail("E_AGENT_MISMATCHED_STATE", "available adapter identity differs from the manifest", { expected: context.row.adapter_id, actual: adapter.adapter_id });

  const host = await hook(hooks, "host", context);
  if (!host.available || typeof host.host !== "string" || host.host.length === 0) fail("E_AGENT_UNAVAILABLE", "required host is unavailable", { stage: "host" });

  const version = await hook(hooks, "version", { ...context, host: host.host });
  if (!version.available || !version.supported || typeof version.host_version !== "string" || version.host_version.length === 0) {
    fail("E_AGENT_UNAVAILABLE", "host version is unavailable or unsupported", { stage: "version", host_version: version.host_version ?? null });
  }
  if (version.host_version !== context.receipt.target.host_version) {
    fail("E_AGENT_STALE_STATE", "active receipt was installed for a different host version", { installed: context.receipt.target.host_version, current: version.host_version });
  }

  const auth = await hook(hooks, "auth", { ...context, host: host.host, host_version: version.host_version });
  if (!auth.available || !auth.authenticated) fail("E_AGENT_UNAVAILABLE", "required authentication is unavailable", { stage: "auth" });

  const controls = await hook(hooks, "controls", context);
  if (!controls.available || !Array.isArray(controls.unsupported_controls)) fail("E_AGENT_UNAVAILABLE", "required control surface is unavailable", { stage: "controls" });
  if (controls.unsupported_controls.length > 0) {
    fail("E_AGENT_UNSUPPORTED_CONTROL", "required dispatch controls are unsupported", { unsupported_controls: controls.unsupported_controls });
  }

  const model = await hook(hooks, "model", context);
  if (!model.available || !model.supported) fail("E_AGENT_UNSUPPORTED_MODEL", "required model policy cannot be enforced", { model: context.policy.model });

  const reasoning = await hook(hooks, "reasoning", context);
  if (!reasoning.available || !reasoning.supported) {
    fail("E_AGENT_REASONING_UNAVAILABLE", "required reasoning policy cannot be enforced", { reasoning_effort: context.policy.reasoning_effort });
  }
  return { host: host.host, hostVersion: version.host_version };
}

export async function resolveAgent({
  logical_role_id: logicalRoleId,
  target,
  dispatch_id: dispatchId = crypto.randomUUID(),
  manifest,
  projection,
  paths,
  hooks,
  loadActiveReceipt: loadActive = readActiveReceipt,
} = {}) {
  const requestedLogicalRoleId = exactLogicalRoleId(logicalRoleId);
  if (!paths || paths.target !== target) fail("E_AGENT_MISMATCHED_STATE", "target paths do not match the requested target", { target, paths_target: paths?.target ?? null });
  const rows = manifestRows(manifest, target);
  const row = exactRow(rows, requestedLogicalRoleId, target);
  const { roleId, contract, policy } = validateRow(row, requestedLogicalRoleId, target);
  validateProjection(projection, manifest, target);
  const active = await loadReceipt(loadActive, paths);
  assertProjectionBindings(active.receipt, manifest, projection);
  validateRootInventory(active.receipt, paths);
  validateRoleRepresentation(row, projection, active.receipt, paths);

  const context = Object.freeze({
    target,
    row: Object.freeze(structuredClone(row)),
    receipt: Object.freeze(structuredClone(active.receipt)),
    projection: Object.freeze(structuredClone(projection)),
    policy: Object.freeze(structuredClone(policy)),
  });
  const capabilities = await capabilityPreflight(hooks, context);
  return createDispatchPlan({
    schema_version: DISPATCH_PLAN_SCHEMA_VERSION,
    dispatch_id: dispatchId,
    requested_logical_role_id: requestedLogicalRoleId,
    role_id: roleId,
    role_source_digest: row.source_sha256,
    target,
    representation: contract.representation,
    adapter_id: row.adapter_id,
    native_role_external_id: row.native_role_external_id,
    host: capabilities.host,
    host_version: capabilities.hostVersion,
    policy,
    provenance: {
      receipt_id: active.receipt.receipt_id,
      receipt_path: active.receiptPath,
      projection_schema_version: projection.schema_version,
      projector_version: projection.projector_version,
      canonical_set_digest: projection.canonical_set_digest,
      manifest_digest: projection.manifest_digest,
      projected_tree_digest: projection.projected_tree_digest,
    },
  });
}
