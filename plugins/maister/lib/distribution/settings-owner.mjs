import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  assertPathIdentity,
  capturePathIdentity,
  distributionError,
  readFileNoFollow,
  throwDistributionError,
  withMutationBoundary,
} from "./path-safety.mjs";

function getNested(object, dotted) {
  return dotted.split(".").reduce((current, key) => current === undefined || current === null ? undefined : current[key], object);
}

function setNested(object, dotted, value) {
  const parts = dotted.split(".");
  let current = object;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)] = value;
}

function deleteNested(object, dotted) {
  const parts = dotted.split(".");
  const parents = [];
  let current = object;
  for (const part of parts.slice(0, -1)) {
    if (!current || typeof current !== "object") return;
    parents.push([current, part]);
    current = current[part];
  }
  if (current && typeof current === "object") delete current[parts.at(-1)];
  for (const [parent, part] of parents.toReversed()) {
    if (parent[part] && typeof parent[part] === "object" && !Array.isArray(parent[part]) && Object.keys(parent[part]).length === 0) delete parent[part];
  }
}

function jsonCandidate(text, keys, desired) {
  let parsed = {};
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw distributionError("E_SETTINGS_SYNTAX", "managed JSON settings are invalid", {}, { cause: error });
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throwDistributionError("E_SETTINGS_SYNTAX", "managed JSON settings must be an object", {});
  for (const key of keys) setNested(parsed, key, desired[key]);
  const indentMatch = text.match(/\n([ \t]+)"/u);
  const indent = indentMatch ? indentMatch[1] : 2;
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  return `${JSON.stringify(parsed, null, indent).replaceAll("\n", newline)}${newline}`;
}

function tomlValue(value) {
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function tomlValues(text, keys) {
  const values = {};
  for (const key of keys) {
    const expression = new RegExp(`^\\s*${key.replaceAll(".", "\\.")}\\s*=\\s*(.*?)\\s*(?:#.*)?$`, "gmu");
    let match;
    while ((match = expression.exec(text)) !== null) {
      const raw = match[1].trim();
      try {
        values[key] = raw === "true" ? true : raw === "false" ? false : JSON.parse(raw);
      } catch {
        values[key] = raw;
      }
    }
  }
  return values;
}

function tomlCandidate(text, keys, desired) {
  let result = text || "";
  for (const key of keys) {
    const expression = new RegExp(`^(\\s*)${key.replaceAll(".", "\\.")}\\s*=.*$`, "mu");
    const replacement = `${key} = ${tomlValue(desired[key])}`;
    if (expression.test(result)) result = result.replace(expression, (match, indent) => `${indent}${replacement}`);
    else result += `${result.length > 0 && !result.endsWith("\n") ? "\n" : ""}${replacement}\n`;
  }
  return result;
}

export function desiredManagedValues({ target, activeRoot, keys }) {
  const values = {};
  for (const key of keys) {
    if (key === "plugins.maister") values[key] = target === "codex" ? true : { enabled: true, root: activeRoot };
    else if (key === "chat.defaultAgent") values[key] = "maister";
    else values[key] = true;
  }
  return values;
}

export function parseManagedValues(text, format, keys) {
  if (format === "json") {
    let parsed = {};
    if (text.trim()) {
      try { parsed = JSON.parse(text); } catch (error) { throw distributionError("E_SETTINGS_SYNTAX", "managed JSON settings are invalid", {}, { cause: error }); }
    }
    return Object.fromEntries(keys.map((key) => [key, getNested(parsed, key)]));
  }
  if (format === "toml") return tomlValues(text, keys);
  throwDistributionError("E_SETTINGS_FORMAT", `managed-key format is not supported: ${format}`, { format });
}

export function prepareSetting({ definition, targetPath, target, activeRoot, stagedPath }) {
  const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink()) throwDistributionError("E_SETTINGS_PATH", `settings path must not be a symlink: ${definition.path}`, { path: definition.path });
  if (stat && !stat.isFile()) throwDistributionError("E_SETTINGS_PATH", `settings path must be a regular file: ${definition.path}`, { path: definition.path });
  const exists = stat !== undefined && stat !== null;
  const targetIdentity = capturePathIdentity(targetPath, {
    root: path.dirname(targetPath),
    label: "settings target",
    allowMissing: true,
    errorCode: "E_SETTINGS_PATH",
  });
  const before = exists ? readFileNoFollow(targetPath, { root: path.dirname(targetPath), label: "settings target", errorCode: "E_SETTINGS_PATH" }) : Buffer.alloc(0);
  assertPathIdentity(targetIdentity, { label: "settings target", errorCode: "E_SETTINGS_PATH" });
  const beforeText = before.toString("utf8");
  const beforeMode = exists ? formatMode(stat.mode & 0o7777) : null;
  const mode = beforeMode ?? "0600";
  if (definition.ownership === "whole_file") {
    const stagedStat = stagedPath ? fs.lstatSync(stagedPath, { throwIfNoEntry: false }) : null;
    if (!stagedStat || !stagedStat.isFile() || stagedStat.isSymbolicLink()) {
      throwDistributionError("E_SETTINGS_SOURCE", `whole-file setting has no staged candidate: ${definition.path}`, { path: definition.path });
    }
    const candidate = readFileNoFollow(stagedPath, { root: path.dirname(stagedPath), label: "staged setting", errorCode: "E_SETTINGS_PATH" });
    return { ...definition, path: definition.path, targetPath, bytes: candidate, beforeSha256: exists ? sha256(before) : null, afterSha256: sha256(candidate), beforeMode, mode, managedValues: null };
  }
  const desired = desiredManagedValues({ target, activeRoot, keys: definition.managed_keys });
  const candidateText = definition.format === "json"
    ? jsonCandidate(beforeText, definition.managed_keys, desired)
    : tomlCandidate(beforeText, definition.managed_keys, desired);
  return {
    ...definition,
    path: definition.path,
    targetPath,
    bytes: Buffer.from(candidateText, "utf8"),
    beforeSha256: exists ? sha256(before) : null,
    afterSha256: sha256(Buffer.from(candidateText, "utf8")),
    beforeMode,
    mode,
    managedValues: desired,
  };
}

export function assertManagedKeysUnchanged({ definition, targetPath, target, activeRoot }) {
  if (definition.ownership !== "managed_keys") return;
  const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isSymbolicLink() || !stat.isFile()) throwDistributionError("E_SETTINGS_PATH", `settings path must be a regular file: ${definition.path}`, { path: definition.path });
  const current = parseManagedValues(readFileNoFollow(targetPath, { root: path.dirname(targetPath), label: "settings target", encoding: "utf8", errorCode: "E_SETTINGS_PATH" }), definition.format, definition.managed_keys);
  const expected = desiredManagedValues({ target, activeRoot, keys: definition.managed_keys });
  for (const key of definition.managed_keys) {
    if (JSON.stringify(current[key]) !== JSON.stringify(expected[key])) {
      throwDistributionError("E_DRIFT_CONFLICT", `owned settings key has drifted: ${definition.path}.${key}`, { path: definition.path, key });
    }
  }
}

export function removeManagedKeys({ definition, targetPath }) {
  const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
  if (!stat) return null;
  if (stat.isSymbolicLink() || !stat.isFile()) throwDistributionError("E_SETTINGS_PATH", `settings path must be a regular file: ${definition.path}`, { path: definition.path });
  const text = readFileNoFollow(targetPath, { root: path.dirname(targetPath), label: "settings target", encoding: "utf8", errorCode: "E_SETTINGS_PATH" });
  if (definition.format === "json") {
    let parsed;
    try { parsed = JSON.parse(text); } catch (error) { throw distributionError("E_SETTINGS_SYNTAX", "managed JSON settings are invalid", {}, { cause: error }); }
    for (const key of definition.managed_keys) deleteNested(parsed, key);
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    return Buffer.from(`${JSON.stringify(parsed, null, 2).replaceAll("\n", newline)}${newline}`, "utf8");
  }
  if (definition.format === "toml") {
    const lines = text.split(/(?<=\n)/u).filter((line) => !definition.managed_keys.some((key) => new RegExp(`^\\s*${key.replaceAll(".", "\\.")}\\s*=`, "u").test(line)));
    return Buffer.from(lines.join(""), "utf8");
  }
  throwDistributionError("E_SETTINGS_FORMAT", `managed-key format is not supported: ${definition.format}`, { format: definition.format });
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function formatMode(mode) {
  return (mode & 0o7777).toString(8).padStart(4, "0");
}

export function atomicWriteSetting(targetPath, bytes, mode = "0600", { beforeMutation = null } = {}) {
  const parent = path.dirname(targetPath);
  return withMutationBoundary(targetPath, {
    root: path.dirname(parent),
    label: "settings target",
    allowMissing: true,
    allowLeafSymlink: false,
    beforeMutation,
    errorCode: "E_SETTINGS_PATH",
  }, (boundary) => {
    const stat = fs.lstatSync(targetPath, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) throwDistributionError("E_SETTINGS_PATH", `settings path must not be a symlink: ${targetPath}`, { targetPath });
    if (stat && stat.isDirectory()) throwDistributionError("E_SETTINGS_PATH", `settings path must not be a directory: ${targetPath}`, { targetPath });
    const temporary = `${targetPath}.${crypto.randomUUID()}.tmp`;
    const noFollow = fs.constants.O_NOFOLLOW ?? 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow;
    let descriptor;
    try {
      try {
        descriptor = fs.openSync(temporary, flags, Number.parseInt(mode, 8));
      } catch (error) {
        if (error.code === "EINVAL" || error.code === "ENOTSUP") descriptor = fs.openSync(temporary, flags & ~noFollow, Number.parseInt(mode, 8));
        else throw error;
      }
      fs.writeFileSync(descriptor, bytes);
      fs.fchmodSync(descriptor, Number.parseInt(mode, 8));
      fs.fsyncSync(descriptor);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
    assertPathIdentity(boundary.parentSnapshot, { label: "settings parent", errorCode: "E_SETTINGS_PATH" });
    fs.renameSync(temporary, targetPath);
    if (boundary.parentDescriptor !== null) {
      try { fs.fsyncSync(boundary.parentDescriptor); } catch (error) {
        if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(error.code)) throw error;
      }
    }
  });
}

export { formatMode, getNested };
