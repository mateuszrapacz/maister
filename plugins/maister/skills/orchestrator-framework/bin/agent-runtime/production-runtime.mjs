import fs from "node:fs";
import path from "node:path";

import { loadCanonicalAgentIr } from "../../../../lib/distribution/agent-ir.mjs";
import { buildAgentManifest, loadAgentProjectionContract } from "../../../../lib/distribution/agent-manifest.mjs";
import { TARGET_TRANSFORMS, projectionDigest, validateAgentProjection } from "../../../../lib/distribution/agent-projection-validator.mjs";
import { loadOverlay } from "../../../../lib/distribution/overlay-loader.mjs";
import { normalizedPathKey, readFileNoFollow } from "../../../../lib/distribution/path-safety.mjs";
import { readActiveReceipt } from "../../../../lib/distribution/receipt-schema.mjs";
import { getManagedRoot, getTargetPaths, projectedOutputIdentity, resolveManagedInventoryPath } from "../../../../lib/distribution/target-paths.mjs";
import { SUPPORTED_TARGET_IDS } from "../../../../lib/distribution/targets.mjs";
import { createAgentRuntime } from "./create-runtime.mjs";

const PACKAGED_PLUGIN_ROOT = path.resolve(import.meta.dirname, "../../../..");

export class ProductionRuntimeError extends Error {
  constructor(code, message, details = {}) {
    super(`[${code}] ${message}`);
    this.name = "ProductionRuntimeError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function fail(code, message, details = {}) {
  throw new ProductionRuntimeError(code, message, details);
}

function trustedInstalledRoot(candidate) {
  const root = path.resolve(candidate);
  const stat = fs.lstatSync(root, { throwIfNoEntry: false });
  if (!stat?.isDirectory() || stat.isSymbolicLink()) fail("E_RUNTIME_INSTALL_STATE", "installed plugin root must be a real directory", { root });
  return fs.realpathSync(root);
}

function installedOutput(paths, receipt, descriptor) {
  const identity = projectedOutputIdentity(paths, descriptor.path);
  const inventory = receipt.managed_inventory.find((entry) => (
    entry.root_id === identity.rootId && entry.path === identity.path
  ));
  if (!inventory || inventory.type !== "file" || inventory.mode !== descriptor.mode) {
    fail("E_RUNTIME_PROJECTION_MISMATCH", "installed projection output is absent from the receipt-owned inventory", {
      root_id: identity.rootId,
      path: identity.path,
    });
  }
  const root = getManagedRoot(paths, identity.rootId);
  trustedInstalledRoot(root.path);
  const bytes = readFileNoFollow(resolveManagedInventoryPath(paths, {
    root_id: identity.rootId,
    path: identity.path,
  }), {
    root: root.path,
    label: `installed projection ${identity.rootId}`,
    errorCode: "E_RUNTIME_PROJECTION_MISMATCH",
  });
  const content = bytes.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(bytes)) {
    fail("E_RUNTIME_PROJECTION_MISMATCH", "installed projection output is not valid UTF-8", { path: descriptor.path });
  }
  return {
    path: descriptor.path,
    kind: descriptor.kind,
    mode: descriptor.mode,
    ownership: descriptor.ownership,
    role_id: descriptor.role_id,
    support_id: descriptor.support_id,
    content,
    size: bytes.length,
    sha256: inventory.sha256,
  };
}

function loadInstalledProjection(paths, receipt, manifest, agentIr, target) {
  const descriptors = manifest.rows
    .filter((row) => row.target === target)
    .flatMap((row) => row.destinations.map((destination) => ({
      ...destination,
      ownership: "canonical",
      role_id: row.role_id,
      support_id: null,
    })));
  const supportInventory = manifest.support_inventory
    .filter((support) => support.target === target)
    .map((support) => ({
      support_id: support.support_id,
      output_paths: support.assets.map((asset) => asset.destination).sort(),
    }));
  for (const support of manifest.support_inventory.filter((entry) => entry.target === target)) {
    descriptors.push(...support.assets.map((asset) => ({
      path: asset.destination,
      kind: asset.kind,
      mode: asset.mode,
      ownership: "support",
      role_id: null,
      support_id: support.support_id,
    })));
  }
  const outputs = descriptors
    .map((descriptor) => installedOutput(paths, receipt, descriptor))
    .sort((left, right) => normalizedPathKey(left.path).localeCompare(normalizedPathKey(right.path), "en-US") || left.path.localeCompare(right.path, "en-US"));
  const projection = {
    schema_version: manifest.schema_version,
    projector_version: manifest.projector_version,
    target,
    canonical_set_digest: manifest.canonical_set_digest,
    manifest_digest: manifest.manifest_digest,
    transform_ids: [...TARGET_TRANSFORMS[target]],
    canonical_role_ids: agentIr.roles.map(({ role_id: roleId }) => roleId),
    support_inventory: supportInventory,
    outputs,
    projected_tree_digest: projectionDigest(outputs),
  };
  return validateAgentProjection({ projection });
}

function assertReceiptProjection(receipt, projection) {
  const binding = receipt.provenance?.agent_projection;
  if (receipt.status !== "installed" || !binding) fail("E_RUNTIME_INSTALL_STATE", "active installed receipt has no agent projection binding");
  for (const field of ["schema_version", "projector_version", "canonical_set_digest", "manifest_digest", "projected_tree_digest"]) {
    if (binding[field] !== projection[field]) {
      fail("E_RUNTIME_PROJECTION_MISMATCH", `installed projection ${field} does not match active receipt`, { expected: binding[field], actual: projection[field] });
    }
  }
}

function unavailableNativePort() {
  return Object.freeze({
    hostVersion: "unknown",
    authenticated: false,
    externalCollisions: [],
    async inspect() { return { schema_version: 1, exact_launch: false, observable_identity: false }; },
    async launch() { throw new Error("native host bridge is unavailable"); },
  });
}

function codexResolverHooks(capabilityPort) {
  const cached = new Map();
  const inspect = (request = { schema_version: 1, adapter_id: "codex.exec" }) => {
    const key = JSON.stringify(request);
    if (!cached.has(key)) cached.set(key, Promise.resolve(capabilityPort.inspect(request)));
    return cached.get(key);
  };
  const inspectPolicy = async (policy) => {
    const base = await inspect();
    return inspect({
      schema_version: 1,
      adapter_id: "codex.exec",
      host_version: base.version?.value ?? "unknown",
      required_model: policy.model,
      required_reasoning_effort: policy.reasoning_effort,
    });
  };
  return {
    externalCollisions: async () => ({ collisions: [] }),
    adapter: async () => ({ available: true, adapter_id: "codex.exec" }),
    host: async () => ({ available: true, host: "codex" }),
    version: async () => { const value = await inspect(); return { available: value.version?.allowed === true, supported: value.version?.allowed === true, host_version: value.version?.value ?? "unknown" }; },
    auth: async () => { const value = await inspect(); return { available: value.authentication?.available === true, authenticated: value.authentication?.authenticated === true }; },
    controls: async () => { const value = await inspect(); return { available: Boolean(value.controls), unsupported_controls: Object.entries(value.controls ?? {}).filter(([, supported]) => supported !== true).map(([control]) => control) }; },
    model: async ({ policy }) => {
      const value = await inspectPolicy(policy);
      return { available: value.model?.available === true, supported: value.model?.supported === true && value.model.value === policy.model };
    },
    reasoning: async ({ policy }) => {
      const value = await inspectPolicy(policy);
      return { available: value.reasoning?.available === true, supported: value.reasoning?.supported === true && value.reasoning.value === policy.reasoning_effort };
    },
  };
}

function nativeResolverHooks(target, nativePort) {
  let cached;
  const inspect = () => {
    cached ??= Promise.resolve(nativePort.inspect({ schema_version: 1, adapter_id: `${target}.native`, native_role_external_id: null }));
    return cached;
  };
  return {
    externalCollisions: async () => ({ collisions: Array.isArray(nativePort.externalCollisions) ? [...nativePort.externalCollisions] : [] }),
    adapter: async () => { const value = await inspect(); return { available: value.exact_launch === true, adapter_id: `${target}.native` }; },
    host: async () => ({ available: typeof nativePort.hostVersion === "string", host: target }),
    version: async () => ({ available: typeof nativePort.hostVersion === "string", supported: true, host_version: nativePort.hostVersion ?? "unknown" }),
    auth: async () => ({ available: nativePort.authenticated === true, authenticated: nativePort.authenticated === true }),
    controls: async () => { const value = await inspect(); return { available: true, unsupported_controls: value.exact_launch === true && value.observable_identity === true ? [] : ["exact_native_identity"] }; },
    model: async () => ({ available: true, supported: true }),
    reasoning: async () => ({ available: true, supported: true }),
  };
}

export function loadInstalledAgentRuntimeInputs({ target, home, env = process.env, pluginSourceRoot = PACKAGED_PLUGIN_ROOT } = {}) {
  if (!SUPPORTED_TARGET_IDS.includes(target)) fail("E_RUNTIME_TARGET", "target must be codex, cursor, kiro-cli, or pi", { target });
  const paths = getTargetPaths({ target, home, env });
  const active = readActiveReceipt(paths);
  if (!active) fail("E_RUNTIME_INSTALL_STATE", "no active installed receipt exists", { target });
  const installedRoot = trustedInstalledRoot(paths.activeRoot);
  const pluginRoot = trustedInstalledRoot(pluginSourceRoot);
  const sourceManifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".maister-source.json"), "utf8"));
  if (sourceManifest.source_commit !== active.receipt.source.resolved_commit || sourceManifest.source_version !== active.receipt.source.source_version) {
    fail("E_RUNTIME_SOURCE_MISMATCH", "packaged runtime source does not match the active installed receipt", {
      packaged_commit: sourceManifest.source_commit,
      installed_commit: active.receipt.source.resolved_commit,
    });
  }
  const projectionContract = loadAgentProjectionContract({ projectionPath: path.join(pluginRoot, "agent-projection-v1.json") });
  const agentIr = loadCanonicalAgentIr({
    agentsRoot: path.join(pluginRoot, "agents"),
    skillsRoot: path.join(pluginRoot, "skills"),
    expectedRoleIds: projectionContract.expected_role_ids,
  });
  const overlays = Object.fromEntries(SUPPORTED_TARGET_IDS.map((targetId) => {
    const overlayRoot = path.join(pluginRoot, "overlays", targetId);
    return [targetId, loadOverlay({
      overlayPath: path.join(overlayRoot, "overlay.yml"),
      inventoryPath: path.join(overlayRoot, "inventory.yml"),
    }).overlay];
  }));
  const manifest = buildAgentManifest({ agentIr, projectionContract, overlays });
  const projection = loadInstalledProjection(paths, active.receipt, manifest, agentIr, target);
  assertReceiptProjection(active.receipt, projection);
  return Object.freeze({ target, paths, manifest, projection, activeReceipt: active, installedRoot, pluginRoot });
}

export function createProductionAgentRuntime({
  target,
  home,
  env = process.env,
  workingRoot = process.cwd(),
  capabilityPort = null,
  nativePorts = {},
  processPort,
  eventPort,
  clock,
  pluginSourceRoot,
} = {}) {
  const installed = loadInstalledAgentRuntimeInputs({ target, home, env, pluginSourceRoot });
  const codexPort = capabilityPort;
  const nativePort = target === "cursor"
    ? nativePorts.cursor ?? unavailableNativePort()
    : target === "kiro-cli"
      ? nativePorts.kiroCli ?? unavailableNativePort()
      : target === "pi"
        ? nativePorts.pi ?? unavailableNativePort()
        : null;
  const resolverHooks = target === "codex" ? codexResolverHooks(codexPort) : nativeResolverHooks(target, nativePort);
  return createAgentRuntime({
    target,
    manifest: installed.manifest,
    projection: installed.projection,
    paths: installed.paths,
    resolverHooks,
    capabilityPort: target === "codex" ? codexPort : undefined,
    nativePorts: target === "cursor"
      ? { cursor: nativePort }
      : target === "kiro-cli"
        ? { kiroCli: nativePort }
        : target === "pi"
          ? { pi: nativePort }
          : {},
    workingRoot: path.resolve(workingRoot),
    processPort,
    eventPort,
    clock,
  });
}
