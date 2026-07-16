import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  assertMutationBoundary,
  assertPathIdentity,
  capturePathIdentity,
  distributionError,
  ensureDirectoryPath,
  readFileNoFollow,
  throwDistributionError,
  withMutationBoundary,
} from "./path-safety.mjs";
import { readJournal, validateJournal, appendTransition, isTerminal } from "./journal-schema.mjs";
import { readReceipt } from "./receipt-schema.mjs";

const MODE = /^[0-7]{4}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function flushDirectory(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0) | (fs.constants.O_NOFOLLOW ?? 0));
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(error.code)) throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function assertContained(root, candidate, label) {
  const rootAbsolute = path.resolve(root);
  const candidateAbsolute = path.resolve(candidate);
  const relative = path.relative(rootAbsolute, candidateAbsolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throwDistributionError("E_RECOVERY_PATH", `${label} escapes its permitted root`, { root: rootAbsolute, candidate: candidateAbsolute });
  }
  return candidateAbsolute;
}

/** Check every existing component without following a pre-existing symlink. */
export function assertSafePath(candidate, { root = null, label = "path", allowMissing = true, allowLeafSymlink = false } = {}) {
  return capturePathIdentity(candidate, {
    root,
    label,
    allowMissing,
    allowLeafSymlink,
    errorCode: "E_RECOVERY_PATH",
  }).path;
}

export function ensureDirectoryTree(directory, { root = null, label = "directory", mode = null, privateMode = false } = {}) {
  const absolute = path.resolve(directory);
  const permittedRoot = path.resolve(root ?? path.dirname(absolute));
  let anchor = permittedRoot;
  while (!fs.lstatSync(anchor, { throwIfNoEntry: false }) && anchor !== path.dirname(anchor)) anchor = path.dirname(anchor);
  const ensured = ensureDirectoryPath(absolute, {
    root: anchor,
    label,
    mode: mode ?? 0o755,
    privateMode,
    errorCode: "E_RECOVERY_PATH",
  });
  flushDirectory(ensured);
  return ensured;
}

function secureRemove(target, options = {}) {
  const absolute = assertSafePath(target, { ...options, allowMissing: true });
  const targetIdentity = capturePathIdentity(absolute, {
    root: options.root,
    label: options.label ?? "path",
    allowMissing: true,
    allowLeafSymlink: options.allowLeafSymlink ?? false,
    errorCode: "E_RECOVERY_PATH",
  });
  assertPathIdentity(targetIdentity, { label: options.label ?? "path", errorCode: "E_RECOVERY_PATH" });
  return withMutationBoundary(absolute, {
    root: options.root ?? path.parse(absolute).root,
    label: options.label ?? "path",
    allowMissing: true,
    allowLeafSymlink: options.allowLeafSymlink ?? false,
    beforeMutation: options.beforeMutation,
    errorCode: "E_RECOVERY_PATH",
  }, (boundary) => {
    assertPathIdentity(targetIdentity, { label: options.label ?? "path", errorCode: "E_RECOVERY_PATH" });
    fs.rmSync(absolute, { recursive: true, force: true });
    if (boundary.parentDescriptor !== null) {
      try { fs.fsyncSync(boundary.parentDescriptor); } catch (error) {
        if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(error.code)) throw error;
      }
    } else flushDirectory(path.dirname(absolute));
  });
}

function assertSafeLink(linkPath, destinationRoot) {
  const linkIdentity = capturePathIdentity(linkPath, {
    root: destinationRoot,
    label: "backup symlink",
    allowMissing: false,
    allowLeafSymlink: true,
    errorCode: "E_RECOVERY_PATH",
  });
  const linkTarget = fs.readlinkSync(linkPath);
  assertPathIdentity(linkIdentity, { label: "backup symlink", errorCode: "E_RECOVERY_PATH" });
  if (path.isAbsolute(linkTarget) || linkTarget.includes("\0")) throwDistributionError("E_RECOVERY_PATH", "backup contains an absolute symlink", { linkPath });
  const rootReal = fs.realpathSync(destinationRoot);
  const linkDirectoryReal = fs.realpathSync(path.dirname(linkPath));
  const lexical = path.resolve(linkDirectoryReal, linkTarget);
  assertContained(rootReal, lexical, "backup symlink");
  try {
    assertContained(rootReal, fs.realpathSync(linkPath), "backup symlink");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return linkTarget;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function formatMode(mode) {
  return (mode & 0o7777).toString(8).padStart(4, "0");
}

function fingerprintEntry(entryPath, { root, label = "backup entry" } = {}) {
  const absolute = assertSafePath(entryPath, {
    root,
    label,
    allowMissing: true,
    allowLeafSymlink: true,
  });
  const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stat) return null;
  if (stat.isSymbolicLink()) {
    return { type: "symlink", mode: formatMode(stat.mode), target: assertSafeLink(absolute, root ?? path.dirname(absolute)) };
  }
  if (stat.isFile()) {
    return { type: "file", mode: formatMode(stat.mode), sha256: sha256(readFileNoFollow(absolute, { root, label, errorCode: "E_RECOVERY_PATH" })) };
  }
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(absolute).sort().map((name) => ({
      name,
      fingerprint: fingerprintEntry(path.join(absolute, name), { root, label: `${label}/${name}` }),
    }));
    return { type: "directory", mode: formatMode(stat.mode), entries };
  }
  throwDistributionError("E_RECOVERY_BACKUP", `unsupported backup entry type: ${absolute}`, { path: absolute });
}

function manifestPayload(manifest) {
  return {
    schema_version: manifest.schema_version,
    active_root: manifest.active_root,
    target: manifest.target,
    settings: manifest.settings,
    active_receipt: manifest.active_receipt,
  };
}

function manifestHash(manifest) {
  return sha256(canonical(manifestPayload(manifest)));
}

function snapshotRecord(source, destination, options) {
  const snapshot = snapshotEntry(source, destination, options);
  return {
    ...snapshot,
    fingerprint: snapshot.exists ? fingerprintEntry(destination, { root: options.destinationRoot ?? path.dirname(destination), label: "snapshot fingerprint" }) : null,
  };
}

export function copyTreeEntry(source, destination, { sourceRoot = null, destinationRoot = null } = {}) {
  const sourceAbsolute = assertSafePath(source, { root: sourceRoot, label: "backup source", allowMissing: false, allowLeafSymlink: true });
  const destinationAbsolute = assertSafePath(destination, { root: destinationRoot, label: "backup destination", allowLeafSymlink: true });
  const sourceIdentity = capturePathIdentity(sourceAbsolute, {
    root: sourceRoot,
    label: "backup source",
    allowMissing: false,
    allowLeafSymlink: true,
    errorCode: "E_RECOVERY_PATH",
  });
  return withMutationBoundary(destinationAbsolute, {
    root: destinationRoot ?? path.parse(destinationAbsolute).root,
    label: "backup destination",
    allowMissing: true,
    allowLeafSymlink: true,
    errorCode: "E_RECOVERY_PATH",
  }, (boundary) => {
    const destinationParent = path.dirname(destinationAbsolute);
    ensureDirectoryPath(destinationParent, {
      root: destinationRoot ?? path.dirname(destinationParent),
      label: "backup destination parent",
      mode: null,
      errorCode: "E_RECOVERY_PATH",
    });
    assertPathIdentity(sourceIdentity, { label: "backup source", errorCode: "E_RECOVERY_PATH" });
    assertPathIdentity(boundary.parentSnapshot, { label: "backup destination parent", errorCode: "E_RECOVERY_PATH" });
    const stat = fs.lstatSync(sourceAbsolute);
    const existing = fs.lstatSync(destinationAbsolute, { throwIfNoEntry: false });
    if (existing) secureRemove(destinationAbsolute, { root: destinationRoot, label: "backup destination", allowLeafSymlink: true });
    assertMutationBoundary(boundary, { includeTarget: false });
    if (stat.isSymbolicLink()) {
      const target = assertSafeLink(sourceAbsolute, sourceRoot ?? path.dirname(sourceAbsolute));
      fs.symlinkSync(target, destinationAbsolute);
    } else if (stat.isDirectory()) {
      ensureDirectoryPath(destinationAbsolute, {
        root: destinationRoot ?? destinationParent,
        label: "backup destination",
        mode: stat.mode & 0o7777,
        errorCode: "E_RECOVERY_PATH",
      });
      for (const name of fs.readdirSync(sourceAbsolute).sort()) {
        copyTreeEntry(path.join(sourceAbsolute, name), path.join(destinationAbsolute, name), { sourceRoot: sourceRoot ?? sourceAbsolute, destinationRoot: destinationRoot ?? destinationAbsolute });
      }
      fs.chmodSync(destinationAbsolute, stat.mode & 0o7777);
      flushDirectory(destinationAbsolute);
    } else if (stat.isFile()) {
      const bytes = readFileNoFollow(sourceAbsolute, { root: sourceRoot ?? path.parse(sourceAbsolute).root, label: "backup source", errorCode: "E_RECOVERY_PATH" });
      const noFollow = fs.constants.O_NOFOLLOW ?? 0;
      const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow;
      let descriptor;
      try {
        try {
          descriptor = fs.openSync(destinationAbsolute, flags, stat.mode & 0o7777);
        } catch (error) {
          if (error.code === "EINVAL" || error.code === "ENOTSUP") descriptor = fs.openSync(destinationAbsolute, flags & ~noFollow, stat.mode & 0o7777);
          else throw error;
        }
        fs.writeFileSync(descriptor, bytes);
        fs.fchmodSync(descriptor, stat.mode & 0o7777);
        fs.fsyncSync(descriptor);
      } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
      }
    } else {
      throwDistributionError("E_RECOVERY_ENTRY", `unsupported backup entry: ${sourceAbsolute}`, { source: sourceAbsolute });
    }
    flushDirectory(path.dirname(destinationAbsolute));
    assertPathIdentity(sourceIdentity, { label: "backup source", errorCode: "E_RECOVERY_PATH" });
  });
}

export function snapshotEntry(source, destination, { sourceRoot = null, destinationRoot = null } = {}) {
  assertSafePath(source, { root: sourceRoot, label: "snapshot source" });
  const stat = fs.lstatSync(source, { throwIfNoEntry: false });
  if (!stat) return { exists: false, mode: null };
  copyTreeEntry(source, destination, { sourceRoot, destinationRoot });
  return { exists: true, mode: (stat.mode & 0o7777).toString(8).padStart(4, "0") };
}

function durableJson(filePath, value, mode = 0o600) {
  const parent = path.dirname(filePath);
  return withMutationBoundary(filePath, {
    root: path.dirname(parent),
    label: "durable JSON",
    allowMissing: true,
    errorCode: "E_RECOVERY_PATH",
  }, (boundary) => {
    const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0);
    let descriptor;
    try {
      try {
        descriptor = fs.openSync(temporary, flags, mode);
      } catch (error) {
        if (error.code === "EINVAL" || error.code === "ENOTSUP") descriptor = fs.openSync(temporary, flags & ~(fs.constants.O_NOFOLLOW ?? 0), mode);
        else throw error;
      }
      fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      fs.fchmodSync(descriptor, mode);
      fs.fsyncSync(descriptor);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
    assertPathIdentity(boundary.parentSnapshot, { label: "durable JSON parent", errorCode: "E_RECOVERY_PATH" });
    fs.renameSync(temporary, filePath);
    if (boundary.parentDescriptor !== null) {
      try { fs.fsyncSync(boundary.parentDescriptor); } catch (error) {
        if (!['EINVAL', 'ENOTSUP', 'EISDIR'].includes(error.code)) throw error;
      }
    } else flushDirectory(parent);
  });
}

export function snapshotState({ activeRoot, settings, backupRoot, activeReceiptPath = null }) {
  ensureDirectoryTree(backupRoot, { root: path.dirname(backupRoot), label: "backup root", mode: 0o700, privateMode: true });
  if (settings.length > 0) ensureDirectoryTree(path.join(backupRoot, "settings"), { root: backupRoot, label: "backup settings root", mode: 0o700, privateMode: true });
  const targetBackup = path.join(backupRoot, "target");
  const target = { ...snapshotRecord(activeRoot, targetBackup, { sourceRoot: activeRoot, destinationRoot: backupRoot }), backup_path: targetBackup };
  const settingRecords = [];
  for (const [index, setting] of settings.entries()) {
    const backupPath = path.join(backupRoot, "settings", String(index));
    const snapshot = snapshotRecord(setting.targetPath, backupPath, { sourceRoot: path.dirname(setting.targetPath), destinationRoot: backupRoot });
    settingRecords.push({ path: setting.path, targetPath: setting.targetPath, backupPath, ...snapshot });
  }
  const activeReceiptBackup = path.join(backupRoot, "active-receipt.json");
  const activeReceipt = activeReceiptPath
    ? { path: activeReceiptPath, backupPath: activeReceiptBackup, ...snapshotRecord(activeReceiptPath, activeReceiptBackup, { sourceRoot: path.dirname(activeReceiptPath), destinationRoot: backupRoot }) }
    : { path: null, backupPath: activeReceiptBackup, exists: false, mode: null, fingerprint: null };
  const manifest = { schema_version: 1, active_root: activeRoot, target, settings: settingRecords, active_receipt: activeReceipt };
  manifest.manifest_hash = manifestHash(manifest);
  durableJson(path.join(backupRoot, "manifest.json"), manifest, 0o600);
  return manifest;
}

function exactFields(value, fields, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throwDistributionError("E_RECOVERY_BACKUP", `${location} must be an object`, { location });
  const allowed = new Set(fields);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) throwDistributionError("E_RECOVERY_BACKUP", `${location} has unknown field ${unknown}`, { field: unknown });
  for (const field of fields) if (!Object.hasOwn(value, field)) throwDistributionError("E_RECOVERY_BACKUP", `${location} is missing ${field}`, { field });
}

function validateFingerprint(value, location) {
  if (value === null) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) throwDistributionError("E_RECOVERY_BACKUP", `${location} fingerprint must be an object or null`, { location });
  if (value.type === "file") {
    exactFields(value, ["type", "mode", "sha256"], location);
    if (!MODE.test(value.mode) || !SHA256.test(value.sha256)) throwDistributionError("E_RECOVERY_BACKUP", `${location} file fingerprint is invalid`, { location });
    return;
  }
  if (value.type === "symlink") {
    exactFields(value, ["type", "mode", "target"], location);
    if (!MODE.test(value.mode) || typeof value.target !== "string" || value.target.length === 0 || path.isAbsolute(value.target) || value.target.includes("\0")) throwDistributionError("E_RECOVERY_BACKUP", `${location} symlink fingerprint is invalid`, { location });
    return;
  }
  if (value.type === "directory") {
    exactFields(value, ["type", "mode", "entries"], location);
    if (!MODE.test(value.mode) || !Array.isArray(value.entries)) throwDistributionError("E_RECOVERY_BACKUP", `${location} directory fingerprint is invalid`, { location });
    let previous = null;
    for (const [index, entry] of value.entries.entries()) {
      exactFields(entry, ["name", "fingerprint"], `${location}.entries[${index}]`);
      if (typeof entry.name !== "string" || entry.name.length === 0 || entry.name.includes("/") || (previous !== null && previous >= entry.name)) throwDistributionError("E_RECOVERY_BACKUP", `${location} directory topology is invalid`, { location });
      previous = entry.name;
      validateFingerprint(entry.fingerprint, `${location}.entries[${index}].fingerprint`);
    }
    return;
  }
  throwDistributionError("E_RECOVERY_BACKUP", `${location} has an unsupported fingerprint type`, { location });
}

function validateSnapshotRecord(record, location) {
  if (typeof record.exists !== "boolean" || (record.mode !== null && !MODE.test(record.mode))) throwDistributionError("E_RECOVERY_BACKUP", `${location} existence or mode is invalid`, { location });
  validateFingerprint(record.fingerprint, `${location}.fingerprint`);
  if (record.exists !== (record.fingerprint !== null)) throwDistributionError("E_RECOVERY_BACKUP", `${location} existence does not match its fingerprint`, { location });
}

function validateManifest(manifest, backupRoot, paths = null) {
  exactFields(manifest, ["schema_version", "active_root", "target", "settings", "active_receipt", "manifest_hash"], "backup manifest");
  if (manifest.schema_version !== 1) throwDistributionError("E_RECOVERY_BACKUP", "backup manifest schema_version must be 1", {});
  if (!SHA256.test(manifest.manifest_hash) || manifest.manifest_hash !== manifestHash(manifest)) throwDistributionError("E_RECOVERY_BACKUP", "backup manifest integrity hash is invalid", {});
  const backupAbsolute = path.resolve(backupRoot);
  assertSafePath(backupAbsolute, { root: path.dirname(backupAbsolute), label: "backup root", allowMissing: false });
  if (!path.isAbsolute(manifest.active_root) || path.normalize(manifest.active_root) !== manifest.active_root || path.resolve(manifest.active_root) !== path.resolve(paths?.activeRoot ?? manifest.active_root)) throwDistributionError("E_RECOVERY_BACKUP", "backup active_root does not match target", { active_root: manifest.active_root });
  exactFields(manifest.target, ["exists", "mode", "fingerprint", "backup_path"], "backup target");
  validateSnapshotRecord(manifest.target, "backup target");
  if (path.normalize(manifest.target.backup_path) !== manifest.target.backup_path || manifest.target.backup_path !== path.join(backupAbsolute, "target")) throwDistributionError("E_RECOVERY_BACKUP", "backup target path is invalid", {});
  if (!Array.isArray(manifest.settings)) throwDistributionError("E_RECOVERY_BACKUP", "backup settings must be an array", {});
  for (const [index, setting] of manifest.settings.entries()) {
    exactFields(setting, ["path", "targetPath", "backupPath", "exists", "mode", "fingerprint"], `backup settings[${index}]`);
    if (typeof setting.path !== "string" || path.isAbsolute(setting.path) || setting.path.split("/").some((part) => !part || part === "." || part === "..")) throwDistributionError("E_RECOVERY_BACKUP", "backup setting path is invalid", { path: setting.path });
    if (path.normalize(setting.backupPath) !== setting.backupPath || setting.backupPath !== path.join(backupAbsolute, "settings", String(index))) throwDistributionError("E_RECOVERY_BACKUP", "backup setting path is invalid", { path: setting.backupPath });
    validateSnapshotRecord(setting, `backup settings[${index}]`);
    if (!path.isAbsolute(setting.targetPath) || path.normalize(setting.targetPath) !== setting.targetPath || (paths && path.resolve(setting.targetPath) !== path.resolve(paths.home, ...setting.path.split("/")))) throwDistributionError("E_RECOVERY_BACKUP", "backup setting target is outside home", { path: setting.targetPath });
    assertSafePath(setting.targetPath, { root: paths?.home ?? path.dirname(setting.targetPath), label: "backup setting target" });
  }
  exactFields(manifest.active_receipt, ["path", "backupPath", "exists", "mode", "fingerprint"], "backup active receipt");
  if (manifest.active_receipt.path !== null) {
    if (!path.isAbsolute(manifest.active_receipt.path) || path.normalize(manifest.active_receipt.path) !== manifest.active_receipt.path || (paths && path.resolve(manifest.active_receipt.path) !== path.resolve(paths.activeReceiptPath))) throwDistributionError("E_RECOVERY_BACKUP", "backup active receipt path does not match target", {});
    assertSafePath(manifest.active_receipt.path, { root: paths?.stateRoot ?? path.dirname(manifest.active_receipt.path), label: "backup active receipt" });
  }
  if (path.normalize(manifest.active_receipt.backupPath) !== manifest.active_receipt.backupPath || manifest.active_receipt.backupPath !== path.join(backupAbsolute, "active-receipt.json")) throwDistributionError("E_RECOVERY_BACKUP", "backup active receipt backup path is invalid", {});
  validateSnapshotRecord(manifest.active_receipt, "backup active receipt");
  return manifest;
}

function assertFingerprint(actual, expected, label) {
  if (canonical(actual) !== canonical(expected)) throwDistributionError("E_RECOVERY_BACKUP", `${label} does not match its recorded backup fingerprint`, { label });
}

function verifyManifestContents(manifest, backupRoot) {
  const backupAbsolute = path.resolve(backupRoot);
  const expectedTopLevel = ["manifest.json"];
  if (manifest.target.exists) expectedTopLevel.push("target");
  if (manifest.settings.length > 0) expectedTopLevel.push("settings");
  if (manifest.active_receipt.exists) expectedTopLevel.push("active-receipt.json");
  const actualTopLevel = fs.readdirSync(backupAbsolute).sort();
  expectedTopLevel.sort();
  if (canonical(actualTopLevel) !== canonical(expectedTopLevel)) throwDistributionError("E_RECOVERY_BACKUP", "backup topology contains unrecorded residue", { expected: expectedTopLevel, actual: actualTopLevel });
  assertFingerprint(fingerprintEntry(manifest.target.backup_path, { root: backupAbsolute, label: "backup target" }), manifest.target.fingerprint, "backup target");
  for (const [index, setting] of manifest.settings.entries()) {
    assertFingerprint(fingerprintEntry(setting.backupPath, { root: backupAbsolute, label: `backup setting[${index}]` }), setting.fingerprint, `backup setting[${index}]`);
  }
  assertFingerprint(fingerprintEntry(manifest.active_receipt.backupPath, { root: backupAbsolute, label: "backup active receipt" }), manifest.active_receipt.fingerprint, "backup active receipt");
  return manifest;
}

export function readManifest(backupRoot, { paths = null } = {}) {
  try {
    const backupAbsolute = path.resolve(backupRoot);
    assertSafePath(backupAbsolute, { root: path.dirname(backupAbsolute), label: "backup root", allowMissing: false });
    const manifest = JSON.parse(readFileNoFollow(path.join(backupRoot, "manifest.json"), {
      root: backupAbsolute,
      label: "backup manifest",
      encoding: "utf8",
      errorCode: "E_RECOVERY_PATH",
    }));
    return verifyManifestContents(validateManifest(manifest, backupRoot, paths), backupRoot);
  } catch (error) {
    if (error?.kind === "E_RECOVERY_BACKUP") throw error;
    throw distributionError("E_RECOVERY_BACKUP", `could not read backup manifest: ${backupRoot}`, { backupRoot }, { cause: error });
  }
}

export function restoreFullBackup(backupRoot, { paths = null, expectedManifestHash = null } = {}) {
  const manifest = readManifest(backupRoot, { paths });
  if (expectedManifestHash !== null && expectedManifestHash !== manifest.manifest_hash) throwDistributionError("E_RECOVERY_BACKUP", "backup manifest hash does not match the transaction record", { backupRoot });
  const activeRoot = paths?.activeRoot ?? manifest.active_root;
  assertSafePath(activeRoot, { root: paths?.home ?? path.dirname(activeRoot), label: "restore active root" });
  secureRemove(activeRoot, { root: paths?.home ?? path.dirname(activeRoot), label: "restore active root" });
  if (manifest.target.exists) copyTreeEntry(manifest.target.backup_path, activeRoot, { sourceRoot: manifest.target.backup_path, destinationRoot: paths?.home ?? path.dirname(activeRoot) });
  for (const setting of manifest.settings) {
    secureRemove(setting.targetPath, { root: paths?.home ?? path.dirname(setting.targetPath), label: "restore setting" });
    if (setting.exists) copyTreeEntry(setting.backupPath, setting.targetPath, { sourceRoot: path.dirname(setting.backupPath), destinationRoot: paths?.home ?? path.dirname(setting.targetPath) });
  }
  const receipt = manifest.active_receipt;
  if (receipt.path) {
    secureRemove(receipt.path, { root: paths?.stateRoot ?? path.dirname(receipt.path), label: "restore active receipt" });
    if (receipt.exists) copyTreeEntry(receipt.backupPath, receipt.path, { sourceRoot: path.dirname(receipt.backupPath), destinationRoot: paths?.stateRoot ?? path.dirname(receipt.path) });
  }
  flushDirectory(path.dirname(activeRoot));
  verifyManifestContents(manifest, backupRoot);
  assertFingerprint(fingerprintEntry(activeRoot, { root: paths?.home ?? path.dirname(activeRoot), label: "restored active root" }), manifest.target.exists ? manifest.target.fingerprint : null, "restored active root");
  for (const setting of manifest.settings) assertFingerprint(fingerprintEntry(setting.targetPath, { root: paths?.home ?? path.dirname(setting.targetPath), label: "restored setting" }), setting.exists ? setting.fingerprint : null, "restored setting");
  if (manifest.active_receipt.path) assertFingerprint(fingerprintEntry(manifest.active_receipt.path, { root: paths?.stateRoot ?? path.dirname(manifest.active_receipt.path), label: "restored active receipt" }), manifest.active_receipt.exists ? manifest.active_receipt.fingerprint : null, "restored active receipt");
  return manifest;
}

function cleanupRecoveryResidue(journal, paths) {
  const residue = [journal.stage_root, path.join(paths.receiptsRoot, `${journal.journal_id}.json`)].filter(Boolean);
  for (const candidate of residue) {
    const root = candidate === journal.stage_root ? paths.stagingRoot : paths.receiptsRoot;
    removeEntry(candidate, { root, label: "recovery residue" });
  }
}

export async function recoverJournal({ journalPath, journal, paths, setJournalState = () => {} }) {
  if (paths && journalPath) assertSafePath(journalPath, { root: paths.journalsRoot, label: "journal path", allowMissing: false });
  const current = journal ?? readJournal(journalPath, { paths });
  validateJournal(current, { paths });
  if (isTerminal(current)) return current;
  const rollbackReceipt = current.command === "rollback" && current.previous_receipt
    ? readReceipt(current.previous_receipt, { paths })
    : null;
  const transaction = current.candidate_receipt?.transaction ?? rollbackReceipt?.transaction;
  const backupRoot = transaction?.backup_root;
  const expectedManifestHash = transaction?.backup_manifest_hash ?? null;
  if (!backupRoot) throwDistributionError("E_RECOVERY_BACKUP", "journal has no recoverable backup", { journal_id: current.journal_id });
  try {
    restoreFullBackup(backupRoot, { paths, expectedManifestHash });
    cleanupRecoveryResidue(current, paths);
  } catch (error) {
    const failure = distributionError("E_RECOVERY_FAILURE", "journal recovery could not restore the verified backup", { journal_id: current.journal_id, backup_root: backupRoot }, { cause: error });
    const failed = appendTransition(current, "rollback_failed", { failure: { kind: failure.kind, details: failure.details, retryable: true } });
    try { setJournalState(failed); } catch { /* retain the original recovery error */ }
    throw failure;
  }
  const recovered = appendTransition(current, "recovered", {
    failure: current.failure ?? { kind: "E_RECOVERY_COMPLETED", details: {}, retryable: false },
    steps: [...current.steps, { name: "recovery", status: "completed", timestamp: new Date().toISOString(), before_ref: backupRoot, after_hash: null }],
  });
  setJournalState(recovered);
  return recovered;
}

export { removeEntry as removeEntry };

function removeEntry(target, options = {}) {
  secureRemove(target, options);
}
