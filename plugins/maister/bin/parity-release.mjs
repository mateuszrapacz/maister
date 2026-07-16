#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { SUPPORTED_TARGET_IDS } from "../lib/distribution/targets.mjs";
import { materialize } from "../lib/distribution/materializer.mjs";
import {
  assertZeroUnresolvedParity,
  compareShadowParity,
  loadParityBaseline,
} from "./shadow-parity.mjs";

const DEFAULT_ORACLE = path.resolve(import.meta.dirname, "../../../tests/fixtures/platform-independent/parity-oracle/manifest.json");
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const TREE = /^[0-9a-f]{40}$/u;
const ORACLE_STATUS = "reviewed-pre-deletion-immutable-git-tree";

export class ParityReleaseError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(`[${code}] ${message}`, options);
    this.name = "ParityReleaseError";
    this.code = code;
    this.details = details;
  }
}

function git(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: MAX_ARCHIVE_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new ParityReleaseError("E_PARITY_RELEASE_GIT", `git command failed: ${args.join(" ")}`, {
      root,
      args,
      stderr: error.stderr?.toString?.() ?? "",
    }, { cause: error });
  }
}

function exactKeys(value, expected, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `${location} must be an object`, { location });
  }
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `${location} has an unexpected shape`, {
      location,
      expected: required,
      actual,
    });
  }
}

export function loadParityOracle(oraclePath = DEFAULT_ORACLE) {
  let oracle;
  try {
    oracle = JSON.parse(fs.readFileSync(oraclePath, "utf8"));
  } catch (error) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `could not read parity oracle: ${oraclePath}`, { oraclePath }, { cause: error });
  }
  exactKeys(oracle, ["schema_version", "oracle_version", "commit", "review_status", "targets"], "parity oracle");
  if (oracle.schema_version !== 1 || typeof oracle.oracle_version !== "string" || oracle.oracle_version.length < 3) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", "unsupported parity oracle schema", { oraclePath });
  }
  if (!FULL_COMMIT.test(oracle.commit) || oracle.review_status !== ORACLE_STATUS) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", "parity oracle must pin a reviewed full Git commit", {
      oraclePath,
      commit: oracle.commit,
      review_status: oracle.review_status,
    });
  }
  exactKeys(oracle.targets, SUPPORTED_TARGET_IDS, "parity oracle.targets");
  for (const target of SUPPORTED_TARGET_IDS) {
    const entry = oracle.targets[target];
    exactKeys(entry, ["legacy_path", "tree"], `parity oracle.targets.${target}`);
    if (!/^plugins\/maister-[a-z0-9-]+$/u.test(entry.legacy_path) || !TREE.test(entry.tree)) {
      throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `invalid immutable oracle entry for ${target}`, {
        target,
        entry,
      });
    }
  }
  return Object.freeze({
    ...oracle,
    targets: Object.freeze(Object.fromEntries(
      SUPPORTED_TARGET_IDS.map((target) => [target, Object.freeze({ ...oracle.targets[target] })]),
    )),
  });
}

function verifyOracleTree(root, oracle, target) {
  const configured = oracle.targets[target];
  const actualTree = git(root, ["rev-parse", `${oracle.commit}:${configured.legacy_path}`]);
  if (actualTree !== configured.tree) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `immutable oracle tree changed for ${target}`, {
      target,
      commit: oracle.commit,
      legacy_path: configured.legacy_path,
      expected_tree: configured.tree,
      actual_tree: actualTree,
    });
  }
}

function extractOracleTree(root, oracle, target, scratchRoot) {
  verifyOracleTree(root, oracle, target);
  const archivePath = path.join(scratchRoot, `${target}.tar`);
  const extractedRoot = path.join(scratchRoot, "legacy", target);
  fs.mkdirSync(extractedRoot, { recursive: true });
  let archive;
  try {
    archive = execFileSync("git", ["archive", "--format=tar", oracle.commit, oracle.targets[target].legacy_path], {
      cwd: root,
      maxBuffer: MAX_ARCHIVE_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `could not reconstruct the ${target} legacy oracle`, {
      target,
      commit: oracle.commit,
      legacy_path: oracle.targets[target].legacy_path,
      stderr: error.stderr?.toString?.() ?? "",
    }, { cause: error });
  }
  fs.writeFileSync(archivePath, archive);
  try {
    execFileSync("tar", ["-xf", archivePath, "-C", scratchRoot], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `could not extract the ${target} legacy oracle`, {
      target,
      archivePath,
      stderr: error.stderr?.toString?.() ?? "",
    }, { cause: error });
  }
  const legacyRoot = path.join(scratchRoot, oracle.targets[target].legacy_path);
  if (!fs.existsSync(legacyRoot)) {
    throw new ParityReleaseError("E_PARITY_RELEASE_ORACLE", `extracted oracle root is missing for ${target}`, {
      target,
      legacyRoot,
    });
  }
  return legacyRoot;
}

export async function runParityReleaseGate({
  root = path.resolve(import.meta.dirname, "../../.."),
  oraclePath = DEFAULT_ORACLE,
  allowDirtyLocal = false,
  reportPath,
} = {}) {
  const repositoryRoot = path.resolve(root);
  const oracle = loadParityOracle(path.resolve(oraclePath));
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-parity-release-"));
  const targets = [];
  try {
    for (const target of SUPPORTED_TARGET_IDS) {
      const legacyRoot = extractOracleTree(repositoryRoot, oracle, target, scratchRoot);
      const materializedRoot = path.join(scratchRoot, "materialized", target);
      const overlayRoot = path.join(repositoryRoot, "plugins", "maister", "overlays", target);
      await materialize({
        source: `local:${repositoryRoot}`,
        target,
        ref: "HEAD",
        allowDirtyLocal,
        overlayPath: path.join(overlayRoot, "overlay.yml"),
        inventoryPath: path.join(overlayRoot, "inventory.yml"),
        stagingRoot: materializedRoot,
      });
      const parity = assertZeroUnresolvedParity(compareShadowParity({
        target,
        legacyRoot,
        materializedRoot,
        baseline: loadParityBaseline(path.join(overlayRoot, "parity-baseline.json"), target),
      }));
      targets.push({
        target,
        oracle_tree: oracle.targets[target].tree,
        baseline_version: parity.baseline_version,
        counts: parity.counts,
        ok: parity.ok,
      });
    }
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
  const result = {
    schema_version: 1,
    gate: "three-target-shadow-parity",
    oracle: {
      version: oracle.oracle_version,
      commit: oracle.commit,
      review_status: oracle.review_status,
    },
    targets,
    ok: targets.length === SUPPORTED_TARGET_IDS.length && targets.every((entry) => entry.ok && entry.counts.unresolved === 0),
  };
  if (reportPath) {
    const absoluteReport = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(absoluteReport), { recursive: true });
    fs.writeFileSync(absoluteReport, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

function parseArguments(argv) {
  const options = { oraclePath: DEFAULT_ORACLE };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-dirty-local") {
      options.allowDirtyLocal = true;
      continue;
    }
    if (!["--oracle", "--report", "--root"].includes(argument)) {
      throw new ParityReleaseError("E_PARITY_RELEASE_USAGE", `unknown argument: ${argument}`);
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new ParityReleaseError("E_PARITY_RELEASE_USAGE", `${argument} requires a value`);
    if (argument === "--oracle") options.oraclePath = value;
    if (argument === "--report") options.reportPath = value;
    if (argument === "--root") options.root = value;
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runParityReleaseGate(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      error: { code: error.code ?? "E_PARITY_RELEASE", message: error.message, details: error.details ?? {} },
    })}\n`);
    process.exitCode = 1;
  }
}
