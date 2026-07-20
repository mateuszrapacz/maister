import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_NAME = "@mateuszrapacz/maister";
export const PACKAGE_REPOSITORY = "mateuszrapacz/maister";
export const RESOLVED_COMMIT_MANIFEST = ".maister-resolved-commit.json";

const PACKAGE_REPOSITORY_URL = "git+https://github.com/mateuszrapacz/maister.git";
const STABLE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const MANIFEST_KEYS = Object.freeze([
  "schema_version",
  "repository",
  "package_version",
  "resolved_commit",
]);

export class LauncherPackageIdentityError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "LauncherPackageIdentityError";
    this.kind = "E_LAUNCHER_PACKAGE_IDENTITY";
  }
}

function packageMetadataError(message, cause) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.kind = "E_LAUNCHER_PACKAGE_METADATA";
  return error;
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function readNoFollowRegularFile(filePath, maximumBytes, createError) {
  let descriptor;
  try {
    const before = fs.lstatSync(filePath);
    if (before.isSymbolicLink() || !before.isFile() || before.size > maximumBytes) {
      throw createError("file must be a bounded no-follow regular file");
    }
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || !sameIdentity(before, opened)) {
      throw createError("file identity changed while opening");
    }
    const contents = fs.readFileSync(descriptor, "utf8");
    const after = fs.lstatSync(filePath);
    if (after.isSymbolicLink() || !after.isFile() || !sameIdentity(opened, after)) {
      throw createError("file identity changed while reading");
    }
    return contents;
  } catch (cause) {
    if (cause?.kind === "E_LAUNCHER_PACKAGE_IDENTITY" || cause?.kind === "E_LAUNCHER_PACKAGE_METADATA") {
      throw cause;
    }
    throw createError("file could not be read", cause);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function parseJson(contents, createError) {
  try {
    return JSON.parse(contents);
  } catch (cause) {
    throw createError("file is not valid JSON", cause);
  }
}

export function validatePackageVersion(version) {
  if (typeof version !== "string" || !STABLE_SEMVER.test(version)) {
    const error = new Error("launcher package version must be a stable X.Y.Z SemVer");
    error.kind = "E_LAUNCHER_PACKAGE_VERSION";
    throw error;
  }
  return version;
}

export function validateRuntimeVersion(version = process.versions.node) {
  const major = Number.parseInt(String(version).split(".", 1)[0], 10);
  if (!Number.isSafeInteger(major) || major < 22) {
    const error = new Error("Maister npx launcher requires Node.js 22 or newer");
    error.kind = "E_LAUNCHER_PACKAGE_RUNTIME";
    throw error;
  }
  return version;
}

export function validateResolvedCommitManifest(manifest, packageVersion) {
  if (
    manifest === null
    || typeof manifest !== "object"
    || Array.isArray(manifest)
    || Object.keys(manifest).length !== MANIFEST_KEYS.length
    || MANIFEST_KEYS.some((key) => !Object.hasOwn(manifest, key))
    || manifest.schema_version !== 1
    || manifest.repository !== PACKAGE_REPOSITORY
    || manifest.package_version !== packageVersion
    || typeof manifest.resolved_commit !== "string"
    || !FULL_COMMIT.test(manifest.resolved_commit)
  ) {
    throw new LauncherPackageIdentityError("launcher resolved-commit manifest is invalid");
  }
  return Object.freeze({
    schema_version: manifest.schema_version,
    repository: manifest.repository,
    package_version: manifest.package_version,
    resolved_commit: manifest.resolved_commit,
  });
}

export function readResolvedCommitManifest(packageRoot, packageVersion) {
  const manifestPath = path.join(packageRoot, RESOLVED_COMMIT_MANIFEST);
  const contents = readNoFollowRegularFile(
    manifestPath,
    8_192,
    (message, cause) => new LauncherPackageIdentityError(
      `launcher resolved-commit manifest ${message}`,
      cause === undefined ? undefined : { cause },
    ),
  );
  return validateResolvedCommitManifest(parseJson(
    contents,
    (message, cause) => new LauncherPackageIdentityError(
      `launcher resolved-commit manifest ${message}`,
      cause === undefined ? undefined : { cause },
    ),
  ), packageVersion);
}

export function readPackageMetadata(packageUrl = new URL("../../package.json", import.meta.url)) {
  validateRuntimeVersion();
  const requestedPackagePath = fileURLToPath(packageUrl);
  let requestedPackageStat;
  try {
    requestedPackageStat = fs.lstatSync(requestedPackagePath);
  } catch (cause) {
    throw packageMetadataError("launcher package metadata could not be inspected", cause);
  }
  if (requestedPackageStat.isSymbolicLink() || !requestedPackageStat.isFile()) {
    throw packageMetadataError("launcher package metadata must be a no-follow regular file");
  }
  const packagePath = fs.realpathSync.native(requestedPackagePath);
  const packageRoot = path.dirname(packagePath);
  let rootStat;
  try {
    rootStat = fs.lstatSync(packageRoot);
  } catch (cause) {
    throw new LauncherPackageIdentityError("launcher package root could not be inspected", { cause });
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new LauncherPackageIdentityError("launcher package root must be a no-follow directory");
  }

  const contents = readNoFollowRegularFile(
    packagePath,
    64 * 1_024,
    (message, cause) => packageMetadataError(`launcher package metadata ${message}`, cause),
  );
  const metadata = parseJson(
    contents,
    (message, cause) => packageMetadataError(`launcher package metadata ${message}`, cause),
  );
  if (
    metadata === null
    || typeof metadata !== "object"
    || Array.isArray(metadata)
    || metadata.name !== PACKAGE_NAME
    || metadata.repository?.type !== "git"
    || metadata.repository?.url !== PACKAGE_REPOSITORY_URL
  ) {
    throw packageMetadataError("launcher package identity is invalid");
  }
  const version = validatePackageVersion(metadata.version);
  const manifest = readResolvedCommitManifest(packageRoot, version);
  return Object.freeze({
    name: metadata.name,
    version,
    root: packageRoot,
    resolvedCommit: manifest.resolved_commit,
  });
}
