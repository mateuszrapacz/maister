import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  migrateLegacyState,
  parseCanonicalYaml,
  stringifyCanonicalYaml,
  validateState,
  validateStateTransition,
} from "./orchestrator-state-schema.mjs";

export class StateRepositoryError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "StateRepositoryError";
    this.code = code;
  }
}

function repositoryError(message, code) {
  throw new StateRepositoryError(message, code);
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function assertSafePath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0 || filePath.includes("\0")) repositoryError("state path must be a non-empty NUL-free string", "INVALID_PATH");
  const absolute = path.resolve(filePath);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) continue;
    const metadata = fs.lstatSync(cursor);
    if (metadata.isSymbolicLink()) repositoryError(`symlink boundary is not allowed: ${cursor}`, "UNSAFE_SYMLINK");
  }
  const parent = path.dirname(absolute);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) repositoryError(`state parent directory does not exist: ${parent}`, "INVALID_PATH");
  const canonicalParent = fs.realpathSync(parent);
  if (canonicalParent !== parent) repositoryError(`state parent is not canonical: ${parent}`, "UNSAFE_PATH");
  if (fs.existsSync(absolute) && !fs.lstatSync(absolute).isFile()) repositoryError("state target must be a regular file", "INVALID_TARGET");
  return absolute;
}

function readOwner(ownerPath) {
  let owner;
  try {
    owner = JSON.parse(fs.readFileSync(ownerPath, "utf8"));
  } catch {
    return null;
  }
  const fields = ["token", "pid", "hostname", "acquired_at", "lease_expires_at"];
  if (!owner || typeof owner !== "object" || Array.isArray(owner) || Object.keys(owner).length !== fields.length || fields.some((field) => !Object.hasOwn(owner, field))) return null;
  if (typeof owner.token !== "string" || owner.token.length === 0 || !Number.isInteger(owner.pid) || owner.pid <= 0 || typeof owner.hostname !== "string") return null;
  if (Number.isNaN(Date.parse(owner.acquired_at)) || Number.isNaN(Date.parse(owner.lease_expires_at))) return null;
  return owner;
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    return true;
  }
}

function reclaimExpiredLock(lockPath, owner) {
  if (owner.hostname !== os.hostname() || Date.parse(owner.lease_expires_at) > Date.now() || processIsAlive(owner.pid)) return false;
  const quarantine = `${lockPath}.reclaim-${crypto.randomUUID()}`;
  try {
    fs.renameSync(lockPath, quarantine);
  } catch (error) {
    if (error.code === "ENOENT") return true;
    return false;
  }
  try {
    const movedOwner = readOwner(path.join(quarantine, "owner.json"));
    if (!movedOwner || movedOwner.token !== owner.token) repositoryError("lock ownership changed during reclamation", "LOCK_CONFLICT");
    fs.rmSync(quarantine, { recursive: true });
    return true;
  } catch (error) {
    if (fs.existsSync(quarantine) && !fs.existsSync(lockPath)) fs.renameSync(quarantine, lockPath);
    throw error;
  }
}

function acquireLock(statePath, { waitMs = 1000, leaseMs = 30000 } = {}) {
  if (!Number.isInteger(waitMs) || waitMs < 0 || !Number.isInteger(leaseMs) || leaseMs <= 0) repositoryError("lock timing must use non-negative integer milliseconds", "INVALID_LOCK_OPTIONS");
  const lockPath = `${statePath}.lock`;
  const token = crypto.randomUUID();
  const deadline = Date.now() + waitMs;
  while (true) {
    let createdByCaller = false;
    try {
      fs.mkdirSync(lockPath, { mode: 0o700 });
      createdByCaller = true;
      const acquiredAt = new Date();
      const owner = {
        token,
        pid: process.pid,
        hostname: os.hostname(),
        acquired_at: acquiredAt.toISOString(),
        lease_expires_at: new Date(acquiredAt.getTime() + leaseMs).toISOString(),
      };
      const ownerPath = path.join(lockPath, "owner.json");
      const descriptor = fs.openSync(ownerPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
      try {
        fs.writeFileSync(descriptor, `${JSON.stringify(owner)}\n`, "utf8");
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      return { lockPath, token };
    } catch (error) {
      if (error.code !== "EEXIST") {
        if (createdByCaller && fs.existsSync(lockPath)) fs.rmSync(lockPath, { recursive: true });
        throw error;
      }
      const owner = readOwner(path.join(lockPath, "owner.json"));
      if (owner && reclaimExpiredLock(lockPath, owner)) continue;
      if (Date.now() >= deadline) repositoryError("state lock is held by a live, foreign, malformed, or uncertain owner", "LOCK_TIMEOUT");
      sleep(Math.min(10, Math.max(1, deadline - Date.now())));
    }
  }
}

function releaseLock(lock) {
  if (!fs.existsSync(lock.lockPath)) return;
  const owner = readOwner(path.join(lock.lockPath, "owner.json"));
  if (!owner || owner.token !== lock.token) repositoryError("refusing to release a lock owned by another token", "LOCK_OWNERSHIP");
  const cleanupPath = `${lock.lockPath}.release-${lock.token}`;
  fs.renameSync(lock.lockPath, cleanupPath);
  fs.rmSync(cleanupPath, { recursive: true });
}

function parseStateFile(statePath) {
  const text = fs.readFileSync(statePath, "utf8");
  return { text, state: parseCanonicalYaml(text), metadata: fs.statSync(statePath) };
}

function flushDirectory(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (!["EINVAL", "ENOTSUP", "EISDIR"].includes(error.code)) throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function durableReplace(statePath, content, metadata, token) {
  const directory = path.dirname(statePath);
  const temporaryPath = path.join(directory, `.orchestrator-state-${token}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporaryPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, metadata.mode & 0o7777);
    const staged = fs.fstatSync(descriptor);
    if (staged.uid !== metadata.uid || staged.gid !== metadata.gid) {
      try {
        fs.fchownSync(descriptor, metadata.uid, metadata.gid);
      } catch (error) {
        repositoryError(`cannot safely preserve state ownership: ${error.message}`, "OWNERSHIP_UNSAFE");
      }
    }
    fs.fchmodSync(descriptor, metadata.mode & 0o7777);
    fs.writeFileSync(descriptor, content, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    if (process.env.ORCHESTRATOR_STATE_TEST_FAILURE === "before_rename") repositoryError("injected failure before atomic rename", "INJECTED_FAILURE");
    fs.renameSync(temporaryPath, statePath);
    flushDirectory(directory);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
  }
}

export function readState(filePath) {
  const statePath = assertSafePath(filePath);
  const state = parseCanonicalYaml(fs.readFileSync(statePath, "utf8"));
  return validateState(state);
}

export async function commitState(filePath, expectedRevision, mutate, options = {}) {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) repositoryError("expected revision must be a non-negative integer", "INVALID_REVISION");
  if (typeof mutate !== "function") repositoryError("state mutation must be a function", "INVALID_MUTATOR");
  const statePath = assertSafePath(filePath);
  const lock = acquireLock(statePath, options);
  try {
    const current = parseStateFile(statePath);
    validateState(current.state);
    if (current.state.orchestrator.revision !== expectedRevision) repositoryError(`revision conflict: expected ${expectedRevision}, found ${current.state.orchestrator.revision}`, "REVISION_CONFLICT");
    const next = structuredClone(current.state);
    await mutate(next);
    next.orchestrator.revision = expectedRevision + 1;
    validateStateTransition(current.state, next);
    durableReplace(statePath, stringifyCanonicalYaml(next), current.metadata, lock.token);
    return structuredClone(next);
  } finally {
    releaseLock(lock);
  }
}

export async function migrateState(filePath, options = {}) {
  const statePath = assertSafePath(filePath);
  const initial = parseStateFile(statePath);
  const candidate = migrateLegacyState(initial.state);
  if (!candidate.migrated) return { state: structuredClone(candidate.state), migrated: false };
  const lock = acquireLock(statePath, options);
  try {
    const current = parseStateFile(statePath);
    const migrated = migrateLegacyState(current.state);
    if (!migrated.migrated) return { state: structuredClone(migrated.state), migrated: false };
    durableReplace(statePath, stringifyCanonicalYaml(migrated.state), current.metadata, lock.token);
    return { state: structuredClone(migrated.state), migrated: true };
  } finally {
    releaseLock(lock);
  }
}
