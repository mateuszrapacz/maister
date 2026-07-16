#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  E3_ATTESTATION_KIND,
  E3_ATTESTATION_SCHEMA_VERSION,
  E3_ATTESTATION_LOCATIONS,
  e3AttestationDigest,
  portableCoreTreeHash,
  validateE3Attestation,
} from "../lib/distribution/e3-attestation.mjs";

const DEFAULT_SCENARIO = "portable-core-v1";
const DEFAULT_SCENARIO_VERSION = "1.0.0";
const DEFAULT_VALIDITY_MS = 24 * 60 * 60 * 1000;
const MAX_VALIDITY_MS = 7 * DEFAULT_VALIDITY_MS;
const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export class E3GeneratorError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(`[${code}] ${message}`, options);
    this.name = "E3GeneratorError";
    this.code = code;
    this.details = details;
  }
}

function requireText(value, name) {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", `${name} is required`, { name });
  }
  return value;
}

function git(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new E3GeneratorError("E3_GENERATOR_GIT", `could not resolve source identity: git ${args.join(" ")}`, {
      root,
      args,
      stderr: error.stderr?.toString?.() ?? "",
    }, { cause: error });
  }
}

function resolveSourceCommit(root, requested) {
  const actual = git(root, ["rev-parse", "HEAD"]).toLowerCase();
  if (!FULL_COMMIT.test(actual)) {
    throw new E3GeneratorError("E3_GENERATOR_BINDING", "source checkout did not resolve to a full commit", { root, actual });
  }
  if (requested !== undefined && requested.toLowerCase() !== actual) {
    throw new E3GeneratorError("E3_GENERATOR_BINDING", "requested source commit does not match the checkout", {
      requested,
      actual,
    });
  }
  return actual;
}

function isoFromEpoch(value) {
  if (!/^\d+$/u.test(String(value))) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", "source-date-epoch must be a non-negative integer", { value });
  }
  const epoch = Number(value);
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", "source-date-epoch must be a non-negative safe integer", { value });
  }
  return new Date(epoch * 1000).toISOString();
}

function timestamp(value, name) {
  if (!ISO_TIMESTAMP.test(value) || Number.isNaN(Date.parse(value))) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", `${name} must be an ISO-8601 UTC timestamp with milliseconds`, { value });
  }
  return value;
}

function resolveTimes({ testedAt, expiresAt, sourceDateEpoch }) {
  const resolvedTestedAt = testedAt
    ? timestamp(testedAt, "tested-at")
    : sourceDateEpoch !== undefined
      ? isoFromEpoch(sourceDateEpoch)
      : null;
  if (!resolvedTestedAt) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", "tested-at or source-date-epoch is required", {});
  }
  const resolvedExpiresAt = expiresAt
    ? timestamp(expiresAt, "expires-at")
    : new Date(Date.parse(resolvedTestedAt) + DEFAULT_VALIDITY_MS).toISOString();
  const duration = Date.parse(resolvedExpiresAt) - Date.parse(resolvedTestedAt);
  if (duration <= 0 || duration > MAX_VALIDITY_MS) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", "E3 attestation validity must be positive and at most seven days", {
      tested_at: resolvedTestedAt,
      expires_at: resolvedExpiresAt,
      max_validity_ms: MAX_VALIDITY_MS,
    });
  }
  return { testedAt: resolvedTestedAt, expiresAt: resolvedExpiresAt };
}

export function generateE3Attestation({
  root = path.resolve(import.meta.dirname, "../../.."),
  output,
  sourceCommit,
  sourceVersion,
  testCommand,
  result,
  scenario = DEFAULT_SCENARIO,
  scenarioVersion = DEFAULT_SCENARIO_VERSION,
  testedAt,
  expiresAt,
  sourceDateEpoch,
} = {}) {
  const repositoryRoot = path.resolve(requireText(root, "root"));
  const outputPath = path.resolve(requireText(output, "output"));
  const resolvedSourceVersion = requireText(sourceVersion, "source-version");
  const resolvedTestCommand = requireText(testCommand, "test-command");
  if (!Object.prototype.hasOwnProperty.call({ result }, "result") || typeof result !== "string" || result.trim() === "") {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", "result is required; it is never defaulted to passed", { result });
  }
  if (!["passed", "failed", "unavailable"].includes(result)) {
    throw new E3GeneratorError("E3_GENERATOR_USAGE", "result must be passed, failed, or unavailable", { result });
  }
  const resolvedSourceCommit = resolveSourceCommit(repositoryRoot, sourceCommit);
  const times = resolveTimes({ testedAt, expiresAt, sourceDateEpoch });
  const coreHash = portableCoreTreeHash(repositoryRoot);
  const attestation = {
    schema_version: E3_ATTESTATION_SCHEMA_VERSION,
    kind: E3_ATTESTATION_KIND,
    test_command: resolvedTestCommand,
    result,
    source_commit: resolvedSourceCommit,
    source_version: resolvedSourceVersion,
    portable_core_tree_hash: coreHash,
    scenario,
    scenario_version: scenarioVersion,
    tested_at: times.testedAt,
    expires_at: times.expiresAt,
    artifact_digest: coreHash,
  };
  const validated = validateE3Attestation(attestation);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(validated, null, 2)}\n`, { mode: 0o644 });
  return Object.freeze({
    output: outputPath,
    attestation: validated,
    digest: e3AttestationDigest(validated),
    recognized_locations: E3_ATTESTATION_LOCATIONS,
  });
}

function parseArguments(argv) {
  const options = {};
  const names = new Map([
    ["--root", "root"],
    ["--output", "output"],
    ["--source-commit", "sourceCommit"],
    ["--source-version", "sourceVersion"],
    ["--test-command", "testCommand"],
    ["--result", "result"],
    ["--scenario", "scenario"],
    ["--scenario-version", "scenarioVersion"],
    ["--tested-at", "testedAt"],
    ["--expires-at", "expiresAt"],
    ["--source-date-epoch", "sourceDateEpoch"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name) throw new E3GeneratorError("E3_GENERATOR_USAGE", `unknown argument: ${argv[index]}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new E3GeneratorError("E3_GENERATOR_USAGE", `${argv[index - 1]} requires a value`);
    options[name] = value;
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = generateE3Attestation(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      error: { code: error.code ?? "E_E3_GENERATOR", message: error.message, details: error.details ?? {} },
    })}\n`);
    process.exitCode = 2;
  }
}
