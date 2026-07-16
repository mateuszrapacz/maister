import fs from "node:fs";
import path from "node:path";

import { hashFile } from "./hash-tree.mjs";
import { distributionError, throwDistributionError } from "./path-safety.mjs";
import { normalizeRelativePath } from "./path-safety.mjs";
import { assertManagedKeysUnchanged } from "./settings-owner.mjs";

function describe(root, relative) {
  const normalized = normalizeRelativePath(relative, "managed path");
  const absolute = path.join(root, ...normalized.split("/"));
  const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stat) return { exists: false, path: normalized };
  if (stat.isDirectory()) return { exists: true, path: normalized, type: "directory", mode: (stat.mode & 0o7777).toString(8).padStart(4, "0") };
  if (stat.isSymbolicLink()) return { exists: true, path: normalized, type: "symlink", mode: (stat.mode & 0o7777).toString(8).padStart(4, "0"), linkTarget: fs.readlinkSync(absolute) };
  if (stat.isFile()) return { exists: true, path: normalized, type: "file", mode: (stat.mode & 0o7777).toString(8).padStart(4, "0"), sha256: hashFile(absolute) };
  throwDistributionError("E_DRIFT_CONFLICT", `unsupported managed entry: ${relative}`, { path: relative });
}

function matchesExpected(actual, expected) {
  if (!actual.exists) return false;
  if (actual.type !== expected.type || actual.mode !== expected.mode) return false;
  if (actual.type === "file") return actual.sha256 === expected.sha256;
  if (actual.type === "symlink") return actual.linkTarget === expected.link_target;
  return true;
}

export function detectDrift({ receipt, activeRoot, settingsRoot = path.dirname(activeRoot), settingDefinitions = [] }) {
  const conflicts = [];
  for (const entry of receipt.managed_inventory) {
    const actual = describe(activeRoot, entry.path);
    if (!matchesExpected(actual, entry)) conflicts.push({ path: entry.path, expected: entry, actual });
  }
  for (const definition of settingDefinitions) {
    const setting = receipt.settings.find((entry) => entry.path === definition.path);
    const targetPath = path.resolve(settingsRoot, ...definition.path.split("/"));
    if (definition.ownership === "whole_file") {
      const actual = fs.existsSync(targetPath) ? hashFile(targetPath) : null;
      if (setting && actual !== setting.after_sha256) conflicts.push({ path: definition.path, expected: setting.after_sha256, actual });
    } else {
      try { assertManagedKeysUnchanged({ definition, targetPath, target: receipt.target.id, activeRoot }); }
      catch (error) { if (error?.kind === "E_DRIFT_CONFLICT") conflicts.push(error.details); else throw error; }
    }
  }
  return conflicts;
}

export function assertNoDrift(options) {
  const conflicts = detectDrift(options);
  if (conflicts.length > 0) {
    throw distributionError("E_DRIFT_CONFLICT", "managed content or settings have changed", { conflicts });
  }
  return true;
}

export { describe, matchesExpected };
