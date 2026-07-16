#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCli } from "./maister-install.mjs";
import { runParityReleaseGate } from "./parity-release.mjs";
import { assertCleanRepositoryTopology } from "./shadow-parity.mjs";
import { validateOverlayCommand } from "./validate-overlay.mjs";
import { generateE3Attestation } from "./generate-e3-attestation.mjs";
import { hashTree } from "../lib/distribution/hash-tree.mjs";
import { loadE3Attestation, portableCoreTreeHash } from "../lib/distribution/e3-attestation.mjs";
import { SUPPORTED_TARGET_IDS } from "../lib/distribution/targets.mjs";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const DEFAULT_ORACLE = path.join(ROOT, "tests/fixtures/platform-independent/parity-oracle/manifest.json");
const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+\-]{0,127}$/u;
const SAFE_COMMAND = /^[A-Za-z0-9][A-Za-z0-9_./:+,=@%+\-]*(?: [A-Za-z0-9_./:+,=@%+\-]+)*$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;

export class ReleaseInterfaceError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(`[${code}] ${message}`, options);
    this.name = "ReleaseInterfaceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new ReleaseInterfaceError(code, message, details);
}

function boundedText(value, name, { max = 4096 } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || /[\0\u0001-\u001f\u007f]/u.test(value)) {
    fail(`E_RELEASE_INTERFACE_${name}`, `${name} must be a bounded string without control characters`, { name });
  }
  return value;
}

function inputPath(value, name, { required = true, mustExist = false, regularFile = false } = {}) {
  if (value === undefined || value === "") {
    if (!required) return null;
    fail("E_RELEASE_INTERFACE_PATH", `${name} is required`, { name });
  }
  const raw = boundedText(value, "PATH");
  if (/[;`$<>{}|&]/u.test(raw)) {
    fail("E_RELEASE_INTERFACE_PATH", `${name} contains shell or JavaScript delimiter characters`, { name });
  }
  const resolved = path.resolve(raw);
  if (mustExist) {
    let stat;
    try {
      stat = fs.lstatSync(resolved);
    } catch (error) {
      fail("E_RELEASE_INTERFACE_PATH", `${name} does not exist`, { name, path: resolved, cause: error.code ?? null });
    }
    if (regularFile && (!stat.isFile() || stat.isSymbolicLink())) {
      fail("E_RELEASE_INTERFACE_PATH", `${name} must be a regular file`, { name, path: resolved });
    }
  }
  return resolved;
}

function targetValue(value) {
  if (!SUPPORTED_TARGET_IDS.includes(value)) {
    fail("E_RELEASE_INTERFACE_TARGET", "TARGET must be codex, cursor, or kiro-cli", { target: value });
  }
  return value;
}

function timestampValue(value) {
  const normalized = boundedText(value, "TIMESTAMP", { max: 32 });
  if (!ISO_TIMESTAMP.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    fail("E_RELEASE_INTERFACE_TIMESTAMP", "timestamp must be an ISO-8601 UTC value with milliseconds", { value });
  }
  return normalized;
}

function regularInputFile(value, name) {
  return inputPath(value, name, { mustExist: true, regularFile: true });
}

function copySourceTree(stage, target) {
  const stagePluginRoot = path.join(stage, "plugins/maister");
  const sourcePluginRoot = path.join(ROOT, "plugins/maister");
  fs.mkdirSync(path.join(stagePluginRoot, "overlays"), { recursive: true });
  for (const entry of ["common", "lib", "bin", "skills", "agents", "commands"]) {
    fs.cpSync(path.join(sourcePluginRoot, entry), path.join(stagePluginRoot, entry), {
      recursive: true,
      preserveTimestamps: true,
    });
  }
  fs.cpSync(path.join(sourcePluginRoot, "overlays", target), path.join(stagePluginRoot, "overlays", target), {
    recursive: true,
    preserveTimestamps: true,
  });
}

function writeSourceManifest(stage, sourceCommit, sourceVersion) {
  const manifestPath = path.join(stage, "plugins/maister/.maister-source.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    schema_version: 1,
    source_commit: sourceCommit,
    source_version: sourceVersion,
    content_hash: null,
  })}\n`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.content_hash = hashTree(stage, {
    ignore: (relative) => relative === "plugins/maister/.maister-source.json",
  }).contentHash;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
}

function validateAndEmbedAttestation(stage, sourceCommit, sourceVersion, epoch, attestationPath) {
  if (!attestationPath) return null;
  const embeddedPath = path.join(stage, "plugins/maister/.maister-e3-attestation.json");
  fs.copyFileSync(attestationPath, embeddedPath);
  const attestation = loadE3Attestation({
    path: attestationPath,
    now: new Date(epoch * 1000).toISOString(),
  });
  if (attestation.source_commit !== sourceCommit) {
    fail("E_RELEASE_INTERFACE_E3", "E3 source commit does not match package source", { expected: sourceCommit, actual: attestation.source_commit });
  }
  if (attestation.source_version !== sourceVersion) {
    fail("E_RELEASE_INTERFACE_E3", "E3 source version does not match package source", { expected: sourceVersion, actual: attestation.source_version });
  }
  const coreHash = portableCoreTreeHash(stage);
  if (attestation.portable_core_tree_hash !== coreHash || attestation.artifact_digest !== coreHash) {
    fail("E_RELEASE_INTERFACE_E3", "E3 portable-core digest does not match package source", {
      expected: coreHash,
      actual: attestation.portable_core_tree_hash,
    });
  }
  return attestation;
}

function stampTree(root, epoch) {
  const stamp = new Date(epoch * 1000);
  const visit = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => (
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    ));
    for (const entry of entries) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isSymbolicLink()) {
        if (fs.lutimesSync) fs.lutimesSync(child, stamp, stamp);
      } else fs.utimesSync(child, stamp, stamp);
    }
    fs.utimesSync(current, stamp, stamp);
  };
  visit(root);
}

function sortedArchiveEntries(root) {
  const entries = [];
  const visit = (current, relative) => {
    entries.push(relative);
    const children = fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => (
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    ));
    for (const entry of children) {
      const child = path.join(current, entry.name);
      const childRelative = `${relative}/${entry.name}`;
      if (entry.isDirectory()) visit(child, childRelative);
      else entries.push(childRelative);
    }
  };
  visit(root, "plugins/maister");
  return entries;
}

function writeArchive(stage, archivePath, fileListPath) {
  fs.writeFileSync(fileListPath, `${sortedArchiveEntries(path.join(stage, "plugins/maister")).join("\n")}\n`);
  const tarBytes = execFileSync("tar", [
    "--format", "ustar",
    "--no-recursion",
    "--uid", "0",
    "--gid", "0",
    "--uname", "",
    "--gname", "",
    "-cf", "-",
    "-C", stage,
    "-T", fileListPath,
  ], { cwd: ROOT, maxBuffer: MAX_ARCHIVE_BYTES });
  const gzipBytes = execFileSync("gzip", ["-n"], {
    cwd: ROOT,
    input: tarBytes,
    maxBuffer: MAX_ARCHIVE_BYTES,
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
  fs.writeFileSync(archivePath, gzipBytes);
}

export function packageTarget({ env = process.env } = {}) {
  const target = targetValue(env.TARGET ?? "codex");
  const distDir = inputPath(env.DIST_DIR ?? "dist", "DIST_DIR");
  const sourceCommit = sourceCommitValueFrom(env);
  const sourceVersion = sourceVersionValueFrom(env);
  const epoch = epochValueFrom(env);
  const attestationValue = env.E3_ATTESTATION || env.MAISTER_E3_ATTESTATION;
  const attestationPath = attestationValue ? regularInputFile(attestationValue, "E3_ATTESTATION") : null;
  fs.mkdirSync(distDir, { recursive: true });
  const stage = fs.mkdtempSync(path.join(distDir, `.maister-package-${target}.`));
  const archivePath = path.join(distDir, `maister-${target}.tar.gz`);
  const fileListPath = path.join(distDir, `.maister-package-${target}-list-${process.pid}-${Date.now()}.txt`);
  try {
    copySourceTree(stage, target);
    validateAndEmbedAttestation(stage, sourceCommit, sourceVersion, epoch, attestationPath);
    writeSourceManifest(stage, sourceCommit, sourceVersion);
    stampTree(path.join(stage, "plugins/maister"), epoch);
    writeArchive(stage, archivePath, fileListPath);
    if (!fs.statSync(archivePath).isFile() || fs.statSync(archivePath).size === 0) {
      fail("E_RELEASE_INTERFACE_PACKAGE", "package archive was not created", { archivePath });
    }
    return { ok: true, target, archive: archivePath };
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    fs.rmSync(fileListPath, { force: true });
  }
}

function sourceCommitValueFrom(env) {
  const value = boundedText(env.SOURCE_COMMIT, "SOURCE_COMMIT", { max: 64 }).toLowerCase();
  if (!FULL_COMMIT.test(value)) fail("E_RELEASE_INTERFACE_COMMIT", "SOURCE_COMMIT must be a full lowercase Git commit", { value });
  return value;
}

function sourceVersionValueFrom(env, { allowUnknown = true } = {}) {
  const value = env.SOURCE_VERSION;
  if (typeof value !== "string" || value.length === 0 || value.length > 128 || /[\0\u0001-\u001f\u007f]/u.test(value)) {
    fail("E_RELEASE_INTERFACE_VERSION", "SOURCE_VERSION must be a bounded release version", { value });
  }
  if (!VERSION.test(value) || (!allowUnknown && value === "unknown")) {
    fail("E_RELEASE_INTERFACE_VERSION", "SOURCE_VERSION must be a safe release version", { value });
  }
  return value;
}

function epochValueFrom(env) {
  const value = boundedText(env.SOURCE_DATE_EPOCH, "SOURCE_DATE_EPOCH", { max: 20 });
  if (!/^\d+$/u.test(value)) fail("E_RELEASE_INTERFACE_EPOCH", "SOURCE_DATE_EPOCH must be a non-negative integer", { value });
  const epoch = Number(value);
  if (!Number.isSafeInteger(epoch) || new Date(epoch * 1000).toString() === "Invalid Date") {
    fail("E_RELEASE_INTERFACE_EPOCH", "SOURCE_DATE_EPOCH is outside the supported timestamp range", { value });
  }
  return epoch;
}

function commandValueFrom(env) {
  const value = boundedText(env.E3_TEST_COMMAND, "COMMAND", { max: 4096 });
  if (!SAFE_COMMAND.test(value)) {
    fail("E_RELEASE_INTERFACE_COMMAND", "E3_TEST_COMMAND must contain only safe command tokens separated by spaces", { value });
  }
  return value;
}

function runGenerateE3({ env = process.env } = {}) {
  const output = inputPath(env.E3_OUTPUT || path.join(env.DIST_DIR || "dist", "e3-portable-core.json"), "E3_OUTPUT");
  const result = boundedText(env.E3_RESULT, "RESULT", { max: 16 });
  if (result !== "passed") fail("E_RELEASE_INTERFACE_RESULT", "E3_RESULT must be passed after test-core", { result });
  const expiresAt = env.E3_EXPIRES_AT ? timestampValue(env.E3_EXPIRES_AT) : undefined;
  const scenario = boundedText(env.E3_SCENARIO || "portable-core-v1", "SCENARIO", { max: 256 });
  const scenarioVersion = boundedText(env.E3_SCENARIO_VERSION || "1.0.0", "SCENARIO_VERSION", { max: 256 });
  const generated = generateE3Attestation({
    root: ROOT,
    output,
    sourceCommit: sourceCommitValueFrom(env),
    sourceVersion: sourceVersionValueFrom(env, { allowUnknown: false }),
    testCommand: commandValueFrom(env),
    result,
    scenario,
    scenarioVersion,
    sourceDateEpoch: epochValueFrom(env),
    expiresAt,
  });
  return {
    ok: true,
    output: generated.output,
    attestation: generated.attestation,
    digest: generated.digest,
  };
}

function runValidateOverlay({ env = process.env } = {}) {
  const argv = ["--target", targetValue(env.TARGET ?? "codex"), "--json"];
  if (env.OVERLAY) argv.push("--overlay", regularInputFile(env.OVERLAY, "OVERLAY"));
  if (env.INVENTORY) argv.push("--inventory", regularInputFile(env.INVENTORY, "INVENTORY"));
  return validateOverlayCommand(argv);
}

function runValidateOverlays() {
  return {
    ok: true,
    targets: SUPPORTED_TARGET_IDS.map((target) => validateOverlayCommand(["--target", target, "--json"])),
  };
}

async function runParity({ env = process.env } = {}) {
  const oraclePath = regularInputFile(env.PARITY_ORACLE ?? DEFAULT_ORACLE, "PARITY_ORACLE");
  const reportPath = env.PARITY_REPORT ? inputPath(env.PARITY_REPORT, "PARITY_REPORT") : null;
  const result = await runParityReleaseGate({
    root: ROOT,
    oraclePath,
    allowDirtyLocal: flagValueFrom(env, "PARITY_ALLOW_DIRTY_LOCAL", "0"),
    reportPath,
  });
  return result;
}

function flagValueFrom(env, name, defaultValue) {
  const value = env[name] ?? defaultValue;
  if (value !== "0" && value !== "1") fail("E_RELEASE_INTERFACE_FLAG", `${name} must be 0 or 1`, { name, value });
  return value === "1";
}

function runTopology() {
  return assertCleanRepositoryTopology({ root: ROOT });
}

async function runInstall({ env = process.env } = {}) {
  const home = inputPath(env.HOME, "HOME");
  const result = await runCli([
    "install",
    "--target", targetValue(env.TARGET ?? "codex"),
    "--source", `local:${ROOT}`,
    "--home", home,
    "--json",
  ], { env });
  process.stdout.write(`${result.output}\n`);
  return { __status: result.status };
}

function outputResult(result) {
  if (result?.__status !== undefined) return result.__status;
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return 0;
}

export async function runReleaseInterface(command, { env = process.env } = {}) {
  if (command === "generate-e3") return runGenerateE3({ env });
  if (command === "package") return packageTarget({ env });
  if (command === "validate-overlay") return runValidateOverlay({ env });
  if (command === "validate-overlays") return runValidateOverlays();
  if (command === "parity-release") return runParity({ env });
  if (command === "topology") return runTopology();
  if (command === "install") return runInstall({ env });
  fail("E_RELEASE_INTERFACE_USAGE", `unknown release interface command: ${command}`, { command });
}

const invokedPath = process.argv[1] ? fs.realpathSync.native(process.argv[1]) : null;
const modulePath = fs.realpathSync.native(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  try {
    const result = await runReleaseInterface(process.argv[2]);
    process.exitCode = outputResult(result);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      error: {
        code: error.code ?? "E_RELEASE_INTERFACE",
        message: error.message,
        details: error.details ?? {},
      },
    })}\n`);
    process.exitCode = 2;
  }
}
