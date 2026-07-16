import fs from "node:fs";
import path from "node:path";

export class DistributionError extends Error {
  constructor(code, message, details = {}, { cause, retryable = false } = {}) {
    super(`[${code}] ${message}`, cause === undefined ? {} : { cause });
    this.name = "DistributionError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export function distributionError(code, message, details = {}, options = {}) {
  return new DistributionError(code, message, details, options);
}

export function throwDistributionError(code, message, details = {}, options = {}) {
  throw distributionError(code, message, details, options);
}

export function normalizeRelativePath(value, location = "path", { allowGlob = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throwDistributionError("E_MATERIALIZE_PATH", `${location} must be a non-empty relative path`, { location });
  }
  if (
    value.startsWith("/")
    || value.startsWith("~")
    || /^[A-Za-z]:[\\/]/u.test(value)
    || value.includes("\\")
  ) {
    throwDistributionError("E_MATERIALIZE_PATH", `${location} must be relative`, { location, value });
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throwDistributionError("E_MATERIALIZE_PATH", `${location} contains an unsafe path segment`, { location, value });
  }
  if (!allowGlob && /[*?\[\]{}]/u.test(value)) {
    throwDistributionError("E_MATERIALIZE_PATH", `${location} cannot contain a glob`, { location, value });
  }
  return path.posix.normalize(value);
}

export function normalizedPathKey(value) {
  return path.posix.normalize(value).toLocaleLowerCase("en-US");
}

export function resolveInside(root, relative, location = "path") {
  const normalized = normalizeRelativePath(relative, location);
  const rootAbsolute = path.resolve(root);
  const candidate = path.resolve(rootAbsolute, ...normalized.split("/"));
  const relativeToRoot = path.relative(rootAbsolute, candidate);
  if (relativeToRoot === ".." || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
    throwDistributionError("E_MATERIALIZE_PATH", `${location} escapes its root`, { location, relative });
  }
  return candidate;
}

function identityOf(stat) {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode & fs.constants.S_IFMT,
    kind: stat.isSymbolicLink() ? "symlink" : stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other",
  };
}

function sameIdentity(actual, expected) {
  return actual.dev === expected.dev
    && actual.ino === expected.ino
    && actual.mode === expected.mode
    && actual.kind === expected.kind;
}

function pathSecurityError(errorCode, message, details) {
  throwDistributionError(errorCode, message, details);
}

/**
 * Capture the identity of every existing component of a path.  The snapshot
 * is deliberately based on lstat, so an attacker cannot turn a checked
 * directory into a symlink without changing the identity observed below.
 * Callers must revalidate the snapshot immediately before and after a path
 * mutation; Node does not expose portable mkdirat/renameat primitives.
 */
export function capturePathIdentity(candidate, {
  root = null,
  label = "path",
  allowMissing = true,
  allowLeafSymlink = false,
  errorCode = "E_PATH_SECURITY",
} = {}) {
  const absolute = path.resolve(candidate);
  const permittedRoot = path.resolve(root ?? path.parse(absolute).root);
  const permittedRelative = path.relative(permittedRoot, absolute);
  if (permittedRelative === ".." || permittedRelative.startsWith(`..${path.sep}`) || path.isAbsolute(permittedRelative)) {
    pathSecurityError(errorCode, `${label} escapes its permitted root`, { root: permittedRoot, candidate: absolute });
  }
  let anchor = permittedRoot;
  while (!fs.lstatSync(anchor, { throwIfNoEntry: false }) && anchor !== path.dirname(anchor)) anchor = path.dirname(anchor);
  const relative = path.relative(anchor, absolute);
  let current = anchor;
  const entries = [];
  const anchorStat = fs.lstatSync(anchor, { throwIfNoEntry: false });
  if (!anchorStat) pathSecurityError(errorCode, `${label} filesystem root does not exist`, { path: anchor });
  if (anchorStat.isSymbolicLink()) pathSecurityError(errorCode, `${label} has a symlink root`, { path: anchor });
  if (!anchorStat.isDirectory()) pathSecurityError(errorCode, `${label} root must be a directory`, { path: anchor });
  entries.push({ path: anchor, identity: identityOf(anchorStat) });
  const components = relative === "" ? [] : relative.split(path.sep);
  for (const [index, component] of components.entries()) {
    current = path.join(current, component);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) {
      if (!allowMissing) pathSecurityError(errorCode, `${label} does not exist`, { path: current });
      return { path: absolute, root: permittedRoot, entries, missing: current };
    }
    if (stat.isSymbolicLink() && !(allowLeafSymlink && index === components.length - 1)) {
      pathSecurityError(errorCode, `${label} contains a symlink component`, { path: current });
    }
    if (index < components.length - 1 && !stat.isDirectory()) {
      pathSecurityError(errorCode, `${label} contains a non-directory parent`, { path: current });
    }
    entries.push({ path: current, identity: identityOf(stat) });
  }
  return { path: absolute, root: permittedRoot, entries, missing: null };
}

export function assertPathIdentity(snapshot, { label = "path", errorCode = "E_PATH_SECURITY" } = {}) {
  if (!snapshot || !Array.isArray(snapshot.entries)) {
    pathSecurityError(errorCode, `${label} has no usable identity snapshot`, { path: snapshot?.path });
  }
  for (const entry of snapshot.entries) {
    const stat = fs.lstatSync(entry.path, { throwIfNoEntry: false });
    if (!stat || !sameIdentity(identityOf(stat), entry.identity)) {
      pathSecurityError(errorCode, `${label} changed after validation`, { path: entry.path });
    }
  }
  if (snapshot.missing && fs.lstatSync(snapshot.missing, { throwIfNoEntry: false })) {
    pathSecurityError(errorCode, `${label} changed after validation`, { path: snapshot.missing });
  }
  return snapshot.path;
}

function openDirectoryDescriptor(directory) {
  const flags = fs.constants.O_RDONLY
    | (fs.constants.O_DIRECTORY ?? 0)
    | (fs.constants.O_NOFOLLOW ?? 0);
  try {
    return fs.openSync(directory, flags);
  } catch (error) {
    if (["EINVAL", "ENOTSUP", "EPERM", "EISDIR"].includes(error.code)) return null;
    throw error;
  }
}

function assertDescriptorIdentity(descriptor, expected, label, errorCode) {
  if (descriptor === null) return;
  let stat;
  try { stat = fs.fstatSync(descriptor); } catch (error) {
    pathSecurityError(errorCode, `${label} descriptor is no longer valid`, { label, code: error.code ?? null });
  }
  if (!sameIdentity(identityOf(stat), expected)) pathSecurityError(errorCode, `${label} descriptor changed after validation`, { label });
}

function openNoFollow(candidate, flags, { label, errorCode }) {
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  try {
    return fs.openSync(candidate, flags | noFollow);
  } catch (error) {
    if (error.code === "ELOOP") pathSecurityError(errorCode, `${label} is a symlink`, { path: candidate });
    if (noFollow !== 0 && ["EINVAL", "ENOTSUP"].includes(error.code)) {
      try {
        return fs.openSync(candidate, flags);
      } catch (fallbackError) {
        throwDistributionError(errorCode, `${label} could not be opened`, { path: candidate, code: fallbackError.code ?? null }, { cause: fallbackError });
      }
    }
    throwDistributionError(errorCode, `${label} could not be opened`, { path: candidate, code: error.code ?? null }, { cause: error });
  }
}

/**
 * Read a regular file through an identity-checked descriptor.  Node does not
 * expose portable openat/read-at APIs, so the parent and leaf are checked
 * before opening, the descriptor identity is checked after opening, and both
 * path identities are checked again after the descriptor read.  O_NOFOLLOW is
 * used where the host provides it; the identity checks are the fallback on
 * hosts without that flag.
 */
export function readFileNoFollow(filePath, {
  root = null,
  label = "file",
  encoding = null,
  beforeOpen = null,
  errorCode = "E_PATH_SECURITY",
} = {}) {
  const absolute = path.resolve(filePath);
  const permittedRoot = path.resolve(root ?? path.parse(absolute).root);
  const parent = path.dirname(absolute);
  const parentSnapshot = capturePathIdentity(parent, {
    root: permittedRoot,
    label: `${label} parent`,
    allowMissing: false,
    errorCode,
  });
  const fileSnapshot = capturePathIdentity(absolute, {
    root: permittedRoot,
    label,
    allowMissing: false,
    allowLeafSymlink: false,
    errorCode,
  });
  assertPathIdentity(parentSnapshot, { label: `${label} parent`, errorCode });
  assertPathIdentity(fileSnapshot, { label, errorCode });
  if (typeof beforeOpen === "function") beforeOpen({ path: absolute });
  assertPathIdentity(parentSnapshot, { label: `${label} parent`, errorCode });
  assertPathIdentity(fileSnapshot, { label, errorCode });

  let descriptor;
  try {
    descriptor = openNoFollow(absolute, fs.constants.O_RDONLY, { label, errorCode });
    const descriptorStat = fs.fstatSync(descriptor);
    if (!sameIdentity(identityOf(descriptorStat), fileSnapshot.entries.at(-1).identity)) {
      pathSecurityError(errorCode, `${label} changed while opening`, { path: absolute });
    }
    assertPathIdentity(parentSnapshot, { label: `${label} parent`, errorCode });
    assertPathIdentity(fileSnapshot, { label, errorCode });
    const contents = fs.readFileSync(descriptor, encoding ?? undefined);
    assertPathIdentity(parentSnapshot, { label: `${label} parent`, errorCode });
    assertPathIdentity(fileSnapshot, { label, errorCode });
    return contents;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

/** Capture the strongest portable ownership boundary available for a path mutation. */
export function captureMutationBoundary(target, {
  root = null,
  label = "path",
  allowMissing = true,
  allowLeafSymlink = false,
  errorCode = "E_PATH_SECURITY",
} = {}) {
  const absolute = path.resolve(target);
  const permittedRoot = path.resolve(root ?? path.parse(absolute).root);
  const parent = path.dirname(absolute);
  const parentSnapshot = capturePathIdentity(parent, {
    root: permittedRoot,
    label: `${label} parent`,
    allowMissing: false,
    errorCode,
  });
  const targetSnapshot = capturePathIdentity(absolute, {
    root: permittedRoot,
    label,
    allowMissing,
    allowLeafSymlink,
    errorCode,
  });
  const parentDescriptor = openDirectoryDescriptor(parent);
  assertPathIdentity(parentSnapshot, { label: `${label} parent`, errorCode });
  assertDescriptorIdentity(parentDescriptor, parentSnapshot.entries.at(-1).identity, `${label} parent`, errorCode);
  return { path: absolute, root: permittedRoot, parentSnapshot, targetSnapshot, parentDescriptor, label, errorCode };
}

export function assertMutationBoundary(boundary, { includeTarget = true } = {}) {
  if (!boundary?.parentSnapshot) pathSecurityError(boundary?.errorCode ?? "E_PATH_SECURITY", "path mutation has no ownership boundary", {});
  assertPathIdentity(boundary.parentSnapshot, { label: `${boundary.label} parent`, errorCode: boundary.errorCode });
  assertDescriptorIdentity(boundary.parentDescriptor, boundary.parentSnapshot.entries.at(-1).identity, `${boundary.label} parent`, boundary.errorCode);
  if (includeTarget) assertPathIdentity(boundary.targetSnapshot, { label: boundary.label, errorCode: boundary.errorCode });
  return boundary.path;
}

export function releaseMutationBoundary(boundary) {
  if (boundary?.parentDescriptor !== null && boundary?.parentDescriptor !== undefined) {
    try { fs.closeSync(boundary.parentDescriptor); } catch { /* best effort */ }
  }
}

export function withMutationBoundary(target, options, operation) {
  const boundary = captureMutationBoundary(target, options);
  try {
    assertMutationBoundary(boundary);
    if (typeof options?.beforeMutation === "function") options.beforeMutation({ path: boundary.path });
    assertMutationBoundary(boundary);
    const result = operation(boundary);
    assertMutationBoundary(boundary, { includeTarget: false });
    return result;
  } finally {
    releaseMutationBoundary(boundary);
  }
}

/** Create a directory one component at a time with identity revalidation. */
export function ensureDirectoryPath(directory, {
  root = null,
  label = "directory",
  mode = 0o755,
  privateMode = false,
  errorCode = "E_PATH_SECURITY",
} = {}) {
  const absolute = path.resolve(directory);
  const anchor = path.resolve(root ?? path.parse(absolute).root);
  const relative = path.relative(anchor, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    pathSecurityError(errorCode, `${label} escapes its permitted root`, { root: anchor, directory: absolute });
  }
  let current = anchor;
  const components = relative === "" ? [] : relative.split(path.sep);
  capturePathIdentity(anchor, { root: anchor, label, allowMissing: false, errorCode });
  for (const component of components) {
    const parent = current;
    const parentIdentity = capturePathIdentity(parent, { root: anchor, label, allowMissing: false, errorCode });
    const parentDescriptor = openDirectoryDescriptor(parent);
    try {
      current = path.join(parent, component);
      const existing = fs.lstatSync(current, { throwIfNoEntry: false });
      if (existing?.isSymbolicLink()) pathSecurityError(errorCode, `${label} contains a symlink component`, { path: current });
      if (existing && !existing.isDirectory()) pathSecurityError(errorCode, `${label} contains a non-directory component`, { path: current });
      assertPathIdentity(parentIdentity, { label, errorCode });
      assertDescriptorIdentity(parentDescriptor, parentIdentity.entries.at(-1).identity, label, errorCode);
      if (!existing) fs.mkdirSync(current, { mode });
      const childIdentity = capturePathIdentity(current, { root: anchor, label, allowMissing: false, errorCode });
      assertPathIdentity(parentIdentity, { label, errorCode });
      assertDescriptorIdentity(parentDescriptor, parentIdentity.entries.at(-1).identity, label, errorCode);
      assertPathIdentity(childIdentity, { label, errorCode });
      if (privateMode || mode !== null) {
        const desired = privateMode ? 0o700 : mode;
        const stat = fs.lstatSync(current);
        if ((stat.mode & 0o7777) !== desired) {
          assertPathIdentity(childIdentity, { label, errorCode });
          fs.chmodSync(current, desired);
          assertPathIdentity(childIdentity, { label, errorCode });
        }
      }
    } finally {
      if (parentDescriptor !== null) {
        try { fs.closeSync(parentDescriptor); } catch { /* best effort */ }
      }
    }
  }
  return absolute;
}

export function assertSafeSymlink(linkPath, root, { allowMissing = false } = {}) {
  let linkTarget;
  try {
    linkTarget = fs.readlinkSync(linkPath);
  } catch (error) {
    throwDistributionError("E_MATERIALIZE_SYMLINK", `could not read symlink ${linkPath}`, { linkPath }, { cause: error });
  }
  if (path.isAbsolute(linkTarget) || linkTarget.includes("\0")) {
    throwDistributionError("E_MATERIALIZE_SYMLINK", `absolute symlink target is not allowed: ${linkPath}`, { linkPath, linkTarget });
  }
  const rootReal = fs.realpathSync(root);
  const lexicalTarget = path.resolve(path.dirname(linkPath), linkTarget);
  const lexicalRelative = path.relative(rootReal, lexicalTarget);
  if (lexicalRelative === ".." || lexicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(lexicalRelative)) {
    throwDistributionError("E_MATERIALIZE_SYMLINK", `symlink escapes its root: ${linkPath}`, { linkPath, linkTarget });
  }
  try {
    const targetReal = fs.realpathSync(linkPath);
    const targetRelative = path.relative(rootReal, targetReal);
    if (targetRelative === ".." || targetRelative.startsWith(`..${path.sep}`) || path.isAbsolute(targetRelative)) {
      throwDistributionError("E_MATERIALIZE_SYMLINK", `symlink resolves outside its root: ${linkPath}`, { linkPath, linkTarget });
    }
  } catch (error) {
    if (error instanceof DistributionError) throw error;
    if (allowMissing && error.code === "ENOENT") return linkTarget;
    const code = error.code === "ELOOP" ? "E_MATERIALIZE_SYMLINK_CYCLE" : "E_MATERIALIZE_SYMLINK";
    throwDistributionError(code, `unsafe symlink target: ${linkPath}`, { linkPath, linkTarget }, { cause: error });
  }
  return linkTarget;
}

export function assertSameFilesystem(sourceRoot, stagingRoot) {
  let sourceStat;
  let stagingStat;
  try {
    sourceStat = fs.statSync(sourceRoot);
    stagingStat = fs.statSync(stagingRoot);
  } catch (error) {
    throwDistributionError("E_MATERIALIZE_IO", "source and staging roots must exist before materialization", {
      sourceRoot,
      stagingRoot,
    }, { cause: error });
  }
  if (sourceStat.dev !== stagingStat.dev) {
    throwDistributionError("E_MATERIALIZE_FILESYSTEM", "source and staging roots must share a filesystem", {
      sourceRoot,
      stagingRoot,
    });
  }
}

export function ensureDirectoryRoot(root, location = "root") {
  let stat;
  try {
    stat = fs.statSync(root);
  } catch (error) {
    throwDistributionError("E_MATERIALIZE_IO", `${location} does not exist`, { root }, { cause: error });
  }
  if (!stat.isDirectory()) {
    throwDistributionError("E_MATERIALIZE_IO", `${location} must be a directory`, { root });
  }
  return fs.realpathSync(root);
}
