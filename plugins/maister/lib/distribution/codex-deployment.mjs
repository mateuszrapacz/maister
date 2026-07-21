import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { copyTreeEntry, ensureDirectoryTree, removeEntry } from "./recovery.mjs";
import { hashTree } from "./hash-tree.mjs";
import { distributionError, readFileNoFollow, assertPathIdentity, capturePathIdentity } from "./path-safety.mjs";

export const CODEX_NATIVE_DEPLOYMENT_SCHEMA_VERSION = 1;

const PLUGIN_NAME = "maister";
const DEPLOYMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fail(message, details = {}, cause = undefined) {
  throw distributionError("E_CODEX_DEPLOYMENT", message, details, { cause, retryable: true });
}

function assertDeploymentId(value) {
  if (typeof value !== "string" || !DEPLOYMENT_ID.test(value)) fail("Codex deployment identity must be a UUID", { deployment_id: value });
}

function assertSafeName(value, field) {
  if (typeof value !== "string" || !SAFE_NAME.test(value)) fail(`Codex deployment ${field} is unsafe`, { [field]: value });
}

function normalizeResult(result) {
  return {
    status: result?.status ?? 1,
    stdout: result?.stdout ?? "",
    stderr: result?.stderr ?? "",
  };
}

function defaultRun(command, args, { env = process.env } = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env,
    timeout: 30_000,
    killSignal: "SIGTERM",
  });
  if (result.error?.code === "ETIMEDOUT") fail("Codex deployment command timed out", { command, args }, result.error);
  return normalizeResult(result);
}

function runCommand(run, args, { env = process.env } = {}) {
  let result;
  try {
    result = normalizeResult(run("codex", args, { env }));
  } catch (error) {
    fail("Codex deployment command could not be executed", { command: "codex", args }, error);
  }
  if (result.status !== 0) {
    fail("Codex deployment command failed", {
      command: "codex",
      args,
      status: result.status,
      stdout: result.stdout.slice(-4_000),
      stderr: result.stderr.slice(-4_000),
    });
  }
  return result;
}

function runCommandIdempotent(run, args, { env = process.env } = {}) {
  try {
    return runCommand(run, args, { env });
  } catch (error) {
    const output = `${error.details?.stdout ?? ""}\n${error.details?.stderr ?? ""}`;
    if (/not found|not installed|does not exist|already removed|unknown plugin|unknown marketplace/iu.test(output)) return null;
    throw error;
  }
}

function parseJson(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`Codex ${label} returned invalid JSON`, { stdout: result.stdout.slice(-4_000) }, error);
  }
}

function normalizeAllowedPluginIds(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((pluginId) => typeof pluginId !== "string" || pluginId.length === 0)) {
    fail("Codex deployment allowedPluginIds must be a non-empty-string array", { allowed_plugin_ids: value });
  }
  return [...new Set(value)];
}

function listInstalledPlugins(run, env) {
  const result = parseJson(runCommand(run, ["plugin", "list", "--json"], { env }), "plugin list");
  if (!result || typeof result !== "object" || Array.isArray(result) || !Array.isArray(result.installed)) {
    fail("Codex plugin list response has an invalid installed inventory", {
      installed: result?.installed ?? null,
    });
  }
  return result.installed;
}

function assertNoPluginNameCollisions({ installed, deployment, allowedPluginIds }) {
  const allowed = new Set(allowedPluginIds);
  const collisions = installed
    .filter((entry) => entry?.name === PLUGIN_NAME && entry?.installed === true && entry?.enabled === true)
    .filter((entry) => entry?.pluginId !== deployment.plugin_id && !allowed.has(entry?.pluginId))
    .map((entry) => ({
      plugin_id: typeof entry?.pluginId === "string" ? entry.pluginId : null,
      name: entry.name,
      source_path: typeof entry?.source?.path === "string" ? entry.source.path : null,
    }));
  if (collisions.length > 0) {
    fail("Codex has an enabled plugin name collision", {
      plugin_id: deployment.plugin_id,
      collisions,
    });
  }
}

function equivalentPath(first, second) {
  if (typeof first !== "string" || typeof second !== "string") return false;
  try {
    return fs.realpathSync.native(first) === fs.realpathSync.native(second);
  } catch {
    return path.normalize(first) === path.normalize(second);
  }
}

function writePrivateJson(filePath, value, root) {
  const parent = path.dirname(filePath);
  ensureDirectoryTree(parent, { root, label: "Codex deployment marketplace parent", mode: 0o700, privateMode: true });
  const parentIdentity = capturePathIdentity(parent, {
    root,
    label: "Codex deployment marketplace parent",
    allowMissing: false,
    errorCode: "E_CODEX_DEPLOYMENT",
  });
  const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
  const descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    assertPathIdentity(parentIdentity, { label: "Codex deployment marketplace parent", errorCode: "E_CODEX_DEPLOYMENT" });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}

function pluginManifest(activeRoot) {
  const manifestPath = path.join(activeRoot, ".codex-plugin", "plugin.json");
  try {
    const manifest = JSON.parse(readFileNoFollow(manifestPath, {
      root: activeRoot,
      label: "Codex plugin manifest",
      encoding: "utf8",
      errorCode: "E_CODEX_DEPLOYMENT",
    }));
    if (manifest?.name !== PLUGIN_NAME || typeof manifest.version !== "string" || manifest.version.length === 0) {
      fail("materialized Codex plugin manifest has an invalid identity", { manifestPath });
    }
    return manifest;
  } catch (error) {
    if (error?.kind === "E_CODEX_DEPLOYMENT") throw error;
    fail("materialized Codex plugin manifest could not be read", { manifestPath }, error);
  }
}

function descriptorPaths(paths, deploymentId) {
  assertDeploymentId(deploymentId);
  const marketplaceRoot = path.join(paths.stateRoot, "native", "codex", deploymentId);
  const pluginRoot = path.join(marketplaceRoot, "plugins", PLUGIN_NAME);
  return { marketplaceRoot, pluginRoot };
}

function marketplaceDocument({ marketplaceName, pluginVersion }) {
  return {
    name: marketplaceName,
    interface: { displayName: "Maister" },
    plugins: [{
      name: PLUGIN_NAME,
      source: { source: "local", path: "./plugins/maister" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Developer tools",
      ...(pluginVersion ? { version: pluginVersion } : {}),
    }],
  };
}

export function prepareCodexDeployment({ paths, deploymentId, activeRoot = null }) {
  if (!paths || paths.target !== "codex") fail("Codex deployment requires the codex target", { target: paths?.target });
  assertDeploymentId(deploymentId);
  const resolvedActiveRoot = activeRoot ?? paths.activeRoot;
  const manifest = pluginManifest(resolvedActiveRoot);
  const marketplaceName = `maister-${deploymentId.slice(0, 8).toLowerCase()}`;
  const { marketplaceRoot, pluginRoot } = descriptorPaths(paths, deploymentId);
  assertSafeName(marketplaceName, "marketplace_name");
  removeEntry(marketplaceRoot, { root: path.join(paths.stateRoot, "native", "codex"), label: "stale Codex deployment" });
  try {
    ensureDirectoryTree(marketplaceRoot, { root: paths.stateRoot, label: "Codex deployment root", mode: 0o700, privateMode: true });
    ensureDirectoryTree(path.dirname(pluginRoot), { root: marketplaceRoot, label: "Codex deployment plugin parent", mode: 0o700, privateMode: true });
    copyTreeEntry(resolvedActiveRoot, pluginRoot, { sourceRoot: paths.home, destinationRoot: paths.stateRoot });
    const marketplacePath = path.join(marketplaceRoot, ".agents", "plugins", "marketplace.json");
    writePrivateJson(marketplacePath, marketplaceDocument({ marketplaceName, pluginVersion: manifest.version }), paths.stateRoot);
    return {
      schema_version: CODEX_NATIVE_DEPLOYMENT_SCHEMA_VERSION,
      marketplace_name: marketplaceName,
      plugin_id: `${PLUGIN_NAME}@${marketplaceName}`,
      plugin_version: manifest.version,
      marketplace_root: marketplaceRoot,
      plugin_root: pluginRoot,
      installed_path: null,
      source_tree_hash: hashTree(resolvedActiveRoot).contentHash,
    };
  } catch (error) {
    try { removeEntry(marketplaceRoot, { root: paths.stateRoot, label: "failed Codex deployment" }); } catch { /* preserve the primary deployment error */ }
    throw error;
  }
}

export function installPreparedCodexDeployment({ deployment, run = defaultRun, env = process.env, allowedPluginIds = undefined }) {
  if (!deployment || deployment.schema_version !== CODEX_NATIVE_DEPLOYMENT_SCHEMA_VERSION) fail("Codex deployment descriptor is invalid", {});
  const normalizedAllowedPluginIds = normalizeAllowedPluginIds(allowedPluginIds);
  try {
    assertNoPluginNameCollisions({
      installed: listInstalledPlugins(run, env),
      deployment,
      allowedPluginIds: normalizedAllowedPluginIds,
    });
    runCommand(run, ["plugin", "marketplace", "add", deployment.marketplace_root, "--json"], { env });
    const result = parseJson(runCommand(run, ["plugin", "add", deployment.plugin_id, "--json"], { env }), "plugin add");
    const installedPath = result.installedPath ?? result.installed_path;
    if (typeof installedPath !== "string" || !path.isAbsolute(installedPath) || path.normalize(installedPath) !== installedPath) {
      fail("Codex plugin add did not return a safe installed path", { plugin_id: deployment.plugin_id, result });
    }
    return { ...deployment, installed_path: installedPath };
  } catch (error) {
    try { removeCodexDeployment({ deployment, run, env }); } catch { /* preserve the registration failure */ }
    throw error;
  }
}

export function verifyCodexDeployment({ deployment, run = defaultRun, env = process.env, allowedPluginIds = undefined }) {
  if (!deployment?.plugin_id) fail("Codex deployment descriptor has no plugin identity", {});
  const normalizedAllowedPluginIds = normalizeAllowedPluginIds(allowedPluginIds);
  const installed = listInstalledPlugins(run, env);
  assertNoPluginNameCollisions({ installed, deployment, allowedPluginIds: normalizedAllowedPluginIds });
  const match = installed.find((entry) => entry?.pluginId === deployment.plugin_id);
  if (!match || match.installed !== true || match.enabled !== true) {
    fail("Codex plugin is not installed and enabled", { plugin_id: deployment.plugin_id });
  }
  if (!match.source?.path || !equivalentPath(match.source.path, deployment.plugin_root)) {
    fail("Codex plugin source path does not match the deployment receipt", {
      plugin_id: deployment.plugin_id,
      expected: deployment.plugin_root,
      actual: match.source.path,
    });
  }
  const observedTreeHash = hashTree(deployment.plugin_root).contentHash;
  if (observedTreeHash !== deployment.source_tree_hash) {
    fail("Codex plugin source tree does not match the deployment receipt", {
      plugin_id: deployment.plugin_id,
      expected: deployment.source_tree_hash,
      actual: observedTreeHash,
    });
  }
  return true;
}

export function detachCodexDeployment({ deployment, run = defaultRun, env = process.env }) {
  if (!deployment?.plugin_id) return false;
  runCommandIdempotent(run, ["plugin", "remove", deployment.plugin_id, "--json"], { env });
  return true;
}

export function attachCodexDeployment({ deployment, run = defaultRun, env = process.env, allowedPluginIds = undefined }) {
  if (!deployment?.marketplace_root || !deployment.plugin_id) fail("Codex deployment cannot be attached without its marketplace identity", {});
  const normalizedAllowedPluginIds = normalizeAllowedPluginIds(allowedPluginIds);
  assertNoPluginNameCollisions({
    installed: listInstalledPlugins(run, env),
    deployment,
    allowedPluginIds: normalizedAllowedPluginIds,
  });
  runCommand(run, ["plugin", "marketplace", "add", deployment.marketplace_root, "--json"], { env });
  const result = parseJson(runCommand(run, ["plugin", "add", deployment.plugin_id, "--json"], { env }), "plugin add");
  const installedPath = result.installedPath ?? result.installed_path ?? deployment.installed_path;
  return { ...deployment, installed_path: installedPath };
}

export function removeCodexMarketplace({ deployment, run = defaultRun, env = process.env, removeRoot = false, paths = null }) {
  if (!deployment?.marketplace_name) return false;
  runCommandIdempotent(run, ["plugin", "marketplace", "remove", deployment.marketplace_name, "--json"], { env });
  if (removeRoot && paths) {
    removeEntry(deployment.marketplace_root, { root: paths.stateRoot, label: "Codex deployment marketplace" });
  }
  return true;
}

export function removeCodexDeployment({ deployment, run = defaultRun, env = process.env, paths = null }) {
  if (!deployment) return false;
  detachCodexDeployment({ deployment, run, env });
  removeCodexMarketplace({ deployment, run, env, removeRoot: true, paths });
  if (!paths && deployment.marketplace_root) {
    try { fs.rmSync(deployment.marketplace_root, { recursive: true, force: true }); } catch { /* command result remains authoritative */ }
  }
  return true;
}

export { defaultRun as defaultCodexDeploymentRunner };
