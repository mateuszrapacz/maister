import os from "node:os";
import path from "node:path";

import { throwDistributionError } from "./path-safety.mjs";
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

export function getTargetPaths({ target, home, env = process.env }) {
  const definition = getTargetDefinition(target);
  if (!definition) {
    throwDistributionError("E_USAGE", `unsupported target: ${target}`, { target });
  }
  const homeRoot = absoluteHome(home);
  const stateBase = path.resolve(env.XDG_STATE_HOME || path.join(homeRoot, ".local", "state"));
  const stateRoot = path.join(stateBase, "maister", target);
  const activeRoot = path.resolve(homeRoot, ...definition.discoveryRoot.split("/"));
  return Object.freeze({
    target,
    home: homeRoot,
    discoveryRoot: TARGETS[target],
    activeRoot,
    stateRoot,
    lockPath: path.join(stateRoot, "install.lock"),
    journalsRoot: path.join(stateRoot, "journals"),
    receiptsRoot: path.join(stateRoot, "receipts"),
    backupsRoot: path.join(stateRoot, "backups"),
    stagingRoot: path.join(stateRoot, "staging"),
    activeReceiptPath: path.join(stateRoot, "active-receipt.json"),
  });
}

export { TARGETS };
