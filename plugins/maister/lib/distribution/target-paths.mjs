import os from "node:os";
import path from "node:path";

import { normalizeRelativePath, resolveInside, throwDistributionError } from "./path-safety.mjs";
import { SUPPORTED_TARGETS, getTargetDefinition } from "./targets.mjs";

const TARGETS = Object.freeze(Object.fromEntries(
  SUPPORTED_TARGETS.map(({ id, discoveryRoot }) => [id, discoveryRoot]),
));

function absoluteHome(home) {
  const resolved = path.resolve(home ?? os.homedir());
  if (resolved === path.parse(resolved).root) {
    throwDistributionError("E_USAGE", "--home must not be the filesystem root", { home: resolved });
  }
  return resolved;
}

export function getTargetPaths({ target, home, env = process.env, platform = process.platform }) {
  const definition = getTargetDefinition(target);
  if (!definition) {
    throwDistributionError("E_USAGE", `unsupported target: ${target}`, { target });
  }
  const homeRoot = absoluteHome(home);
  if (target === "pi" && !["darwin", "linux"].includes(platform)) {
    throwDistributionError("E_USAGE", "pi target supports POSIX platforms only", { target, platform });
  }
  const agentRoot = target === "pi"
    ? path.resolve(homeRoot, env.PI_CODING_AGENT_DIR || definition.pathPolicy.defaultAgentRoot)
    : null;
  const rootBase = agentRoot || homeRoot;
  const settingsRoot = target === "pi"
    ? agentRoot
    : definition.settingsRoot
      ? resolveInside(homeRoot, definition.settingsRoot, "target settings root")
      : homeRoot;
  const stateBase = path.resolve(env.XDG_STATE_HOME || path.join(homeRoot, ".local", "state"));
  const stateRoot = path.join(stateBase, "maister", target);
  const managedRoots = Object.freeze(definition.managedRoots.map((root) => Object.freeze({
    rootId: root.rootId,
    path: target === "pi"
      ? path.resolve(rootBase, definition.pathPolicy.packagePath)
      : path.resolve(homeRoot, ...root.discoveryRoot.split("/")),
    ownership: root.ownership,
  })));
  const activeRoot = managedRoots.find(({ rootId }) => rootId === "plugin_private").path;
  const sessionRoot = target === "pi" && env.PI_CODING_AGENT_SESSION_DIR
    ? path.resolve(homeRoot, env.PI_CODING_AGENT_SESSION_DIR)
    : undefined;
  return Object.freeze({
    target,
    home: homeRoot,
    discoveryRoot: TARGETS[target],
    settingsRoot,
    ...(target === "pi" ? {
      agentRoot,
      settingsPath: path.join(agentRoot, definition.pathPolicy.settingsPath),
      ...(sessionRoot ? { sessionRoot } : {}),
    } : {}),
    activeRoot,
    managedRoots,
    stateRoot,
    lockPath: path.join(stateRoot, "install.lock"),
    journalsRoot: path.join(stateRoot, "journals"),
    receiptsRoot: path.join(stateRoot, "receipts"),
    controlPlanesRoot: path.join(stateRoot, "control-planes"),
    backupsRoot: path.join(stateRoot, "backups"),
    stagingRoot: path.join(stateRoot, "staging"),
    activeReceiptPath: path.join(stateRoot, "active-receipt.json"),
  });
}

export function getManagedRoot(paths, rootId) {
  if (!paths || !Array.isArray(paths.managedRoots)) {
    throwDistributionError("E_USAGE", "target paths with managed roots are required", {});
  }
  const root = paths.managedRoots.find((entry) => entry.rootId === rootId);
  if (!root) {
    throwDistributionError("E_USAGE", `managed root is not declared: ${rootId}`, { rootId, target: paths.target });
  }
  return root;
}

export function projectedOutputIdentity(paths, outputPath) {
  const normalized = normalizeRelativePath(outputPath, "projected output path");
  return Object.freeze({ rootId: "plugin_private", path: normalized });
}

export function resolveManagedInventoryPath(paths, { root_id: rootId, path: relativePath }) {
  const root = getManagedRoot(paths, rootId);
  return resolveInside(root.path, relativePath, `managed inventory ${rootId}`);
}

export function resolveTargetSettingPath(paths, relativePath) {
  const normalized = normalizeRelativePath(relativePath, "target setting path");
  if (paths.target === "pi" && normalized === "settings.json") return paths.settingsPath;
  return resolveInside(paths.settingsRoot ?? paths.home, normalized, "target setting path");
}

export { TARGETS };
