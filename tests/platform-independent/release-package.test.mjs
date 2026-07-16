import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { hashTree } from "../../plugins/maister/lib/distribution/hash-tree.mjs";
import { portableCoreTreeHash } from "../../plugins/maister/lib/distribution/e3-attestation.mjs";
import { SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";
import { generateE3Attestation } from "../../plugins/maister/bin/generate-e3-attestation.mjs";
import {
  createReleaseMetadata,
  verifyReleaseMetadata,
} from "../../plugins/maister/bin/release-metadata.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPO_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const TEST_SOURCE_DATE_EPOCH = 1784073600;

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function makePackage(directory, target, { attestation, sourceCommit = REPO_COMMIT, sourceVersion = "test" } = {}) {
  const argumentsList = [
    "package",
    `TARGET=${target}`,
    `DIST_DIR=${directory}`,
    `SOURCE_DATE_EPOCH=${TEST_SOURCE_DATE_EPOCH}`,
    `SOURCE_COMMIT=${sourceCommit}`,
    `SOURCE_VERSION=${sourceVersion}`,
  ];
  if (attestation) argumentsList.push(`E3_ATTESTATION=${attestation}`);
  execFileSync("make", argumentsList, { cwd: ROOT, stdio: "pipe" });
  return path.join(directory, `maister-${target}.tar.gz`);
}

function makeTestAttestation(directory) {
  return generateE3Attestation({
    root: ROOT,
    output: path.join(directory, "e3-portable-core.json"),
    sourceCommit: REPO_COMMIT,
    sourceVersion: "test",
    testCommand: "make test-core",
    result: "passed",
    sourceDateEpoch: TEST_SOURCE_DATE_EPOCH,
  }).output;
}

function packageArchives() {
  const configuredDirectory = process.env.MAISTER_PACKAGE_DIR;
  if (configuredDirectory) {
    const directory = path.resolve(ROOT, configuredDirectory);
    return Object.fromEntries(SUPPORTED_TARGET_IDS.map((target) => [target, path.join(directory, `maister-${target}.tar.gz`)]));
  }
  const firstDirectory = tempDirectory("maister-package-first-");
  const secondDirectory = tempDirectory("maister-package-second-");
  const attestation = makeTestAttestation(tempDirectory("maister-package-e3-"));
  return Object.fromEntries(SUPPORTED_TARGET_IDS.map((target) => [target, {
    first: makePackage(firstDirectory, target, { attestation }),
    second: makePackage(secondDirectory, target, { attestation }),
  }]));
}

function extractArchive(archive, directory) {
  fs.mkdirSync(directory, { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", directory], { stdio: "pipe" });
}

function invokeArchive(extractedRoot, target, command, home, state) {
  const output = execFileSync(process.execPath, [
    path.join(extractedRoot, "plugins/maister/bin/maister-install.mjs"),
    command,
    "--target",
    target,
    "--source",
    `local:${extractedRoot}`,
    "--home",
    home,
    "--json",
  ], {
    cwd: extractedRoot,
    env: { ...process.env, XDG_STATE_HOME: state },
    encoding: "utf8",
  });
  return JSON.parse(output);
}

function invokeArchiveAttempt(extractedRoot, target, command, home, state, extraArguments = [], env = {}) {
  const result = spawnSync(process.execPath, [
    path.join(extractedRoot, "plugins/maister/bin/maister-install.mjs"),
    command,
    "--target",
    target,
    "--source",
    `local:${extractedRoot}`,
    "--home",
    home,
    ...extraArguments,
    "--json",
  ], {
    cwd: extractedRoot,
    env: { ...process.env, XDG_STATE_HOME: state, ...env },
    encoding: "utf8",
  });
  return { status: result.status, response: JSON.parse(result.stdout) };
}

test("target archives are deterministic, self-contained, and support a clean lifecycle", () => {
  const archives = packageArchives();

  for (const target of SUPPORTED_TARGET_IDS) {
    const packageValue = archives[target];
    const firstArchive = typeof packageValue === "string" ? packageValue : packageValue.first;
    if (typeof packageValue !== "string") {
      assert.equal(sha256(firstArchive), sha256(packageValue.second), `${target} archive is not deterministic`);
    }

    const listing = execFileSync("tar", ["-tzf", firstArchive], { encoding: "utf8" });
    const entries = listing.trim().split(/\r?\n/u);
    assert.deepEqual(entries, [...entries].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)), `${target} archive entries are not sorted`);
    assert.match(listing, /plugins\/maister\/skills\/orchestrator-framework\/bin\/orchestrator-state-schema\.mjs\n/u, target);
    assert.match(listing, new RegExp(`plugins/maister/overlays/${target}/overlay\\.yml\\n`, "u"), target);
    assert.match(listing, /plugins\/maister\/.maister-e3-attestation\.json\n/u, target);
    for (const otherTarget of SUPPORTED_TARGET_IDS.filter((candidate) => candidate !== target)) {
      assert.doesNotMatch(listing, new RegExp(`plugins/maister/overlays/${otherTarget}/overlay\\.yml\\n`, "u"), target);
    }

    const extractedRoot = tempDirectory(`maister-package-${target}-extract-`);
    extractArchive(firstArchive, extractedRoot);
    const sandboxRoot = tempDirectory(`maister-package-${target}-sandbox-`);
    const home = path.join(sandboxRoot, "home");
    const state = path.join(sandboxRoot, "state");
    fs.mkdirSync(home);
    fs.mkdirSync(state);
    const installed = invokeArchive(extractedRoot, target, "install", home, state);
    assert.equal(installed.ok, true, target);
    assert.equal(invokeArchive(extractedRoot, target, "verify", home, state).ok, true, target);
    assert.equal(invokeArchive(extractedRoot, target, "uninstall", home, state).ok, true, target);
  }
});

test("packaged lifecycle rejects missing, forged, mismatched, and stale E3 attestations", () => {
  const validDirectory = tempDirectory("maister-e3-valid-package-");
  const attestation = makeTestAttestation(validDirectory);
  const validArchive = makePackage(validDirectory, "codex", { attestation });
  const missingDirectory = tempDirectory("maister-e3-missing-package-");
  const missingArchive = makePackage(missingDirectory, "codex");

  const missingExtracted = tempDirectory("maister-e3-missing-extract-");
  extractArchive(missingArchive, missingExtracted);
  const missingSandbox = tempDirectory("maister-e3-missing-sandbox-");
  fs.mkdirSync(path.join(missingSandbox, "home"));
  fs.mkdirSync(path.join(missingSandbox, "state"));
  const missing = invokeArchiveAttempt(
    missingExtracted,
    "codex",
    "install",
    path.join(missingSandbox, "home"),
    path.join(missingSandbox, "state"),
  );
  assert.equal(missing.status, 4);
  assert.equal(missing.response.error.kind, "E_EVIDENCE_ATTESTATION_MISSING");

  const validExtracted = tempDirectory("maister-e3-valid-extract-");
  extractArchive(validArchive, validExtracted);
  const embeddedPath = path.join(validExtracted, "plugins/maister/.maister-e3-attestation.json");
  const base = JSON.parse(fs.readFileSync(embeddedPath, "utf8"));
  const cases = [
    ["forged", { ...base, artifact_digest: "0".repeat(64) }, "E_EVIDENCE_ATTESTATION_BINDING", {}],
    ["mismatched", { ...base, source_commit: "a".repeat(40) }, "E_EVIDENCE_ATTESTATION_BINDING", {}],
    ["stale", { ...base, tested_at: "2026-07-14T00:00:00.000Z", expires_at: "2026-07-14T01:00:00.000Z" }, "E_EVIDENCE_ATTESTATION_STALE", { MAISTER_EVIDENCE_NOW: "2026-07-15T00:00:00.000Z" }],
  ];
  for (const [name, value, kind, env] of cases) {
    const sandbox = tempDirectory(`maister-e3-${name}-sandbox-`);
    const home = path.join(sandbox, "home");
    const state = path.join(sandbox, "state");
    const candidatePath = path.join(sandbox, `${name}-e3.json`);
    fs.writeFileSync(candidatePath, `${JSON.stringify(value, null, 2)}\n`);
    fs.mkdirSync(home);
    fs.mkdirSync(state);
    const result = invokeArchiveAttempt(validExtracted, "codex", "install", home, state, ["--attestation", candidatePath], env);
    assert.equal(result.status, 4, name);
    assert.equal(result.response.error.kind, kind, name);
  }
});

test("release metadata binds checksums, parity, and self-declared limitations", () => {
  const root = tempDirectory("maister-release-metadata-");
  const parityReport = path.join(root, "parity-release.json");
  const attestation = {
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "make test-core",
    result: "passed",
    source_commit: COMMIT,
    source_version: "test",
    portable_core_tree_hash: "b".repeat(64),
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: "2026-07-15T10:00:00.000Z",
    expires_at: "2026-07-16T10:00:00.000Z",
    artifact_digest: "b".repeat(64),
  };
  const archives = SUPPORTED_TARGET_IDS.map((target) => {
    const name = `maister-${target}.tar.gz`;
    const filePath = path.join(root, name);
    const staging = tempDirectory(`maister-release-metadata-${target}-stage-`);
    fs.mkdirSync(path.join(staging, "plugins/maister"), { recursive: true });
    fs.writeFileSync(path.join(staging, "plugins/maister/.maister-e3-attestation.json"), `${JSON.stringify(attestation, null, 2)}\n`);
    execFileSync("tar", ["-czf", filePath, "-C", staging, "plugins"], { stdio: "pipe" });
    return { name, hash: sha256(filePath) };
  });
  fs.writeFileSync(path.join(root, "SHA256SUMS"), `${archives.map(({ name, hash }) => `${hash}  ${name}`).join("\n")}\n`);
  fs.writeFileSync(parityReport, `${JSON.stringify({
    schema_version: 1,
    gate: "three-target-shadow-parity",
    ok: true,
    targets: SUPPORTED_TARGET_IDS.map((target) => ({ target, ok: true, counts: { unresolved: 0 } })),
  })}\n`);

  createReleaseMetadata({
    archiveDir: root,
    outputDir: root,
    sourceCommit: COMMIT,
    sourceVersion: "test",
    parityReportPath: parityReport,
    sourceDateEpoch: 1700000000,
  });
  assert.equal(verifyReleaseMetadata({ archiveDir: root, outputDir: root }).ok, true);
  const provenance = JSON.parse(fs.readFileSync(path.join(root, "PROVENANCE.json"), "utf8"));
  assert.equal(provenance.sbom.sha256, sha256(path.join(root, "SBOM.cdx.json")));
  assert.equal(provenance.portable_core_attestation.supplied, true);
  assert.equal(provenance.portable_core_attestation.source_commit, COMMIT);
  assert.equal(provenance.build.artifacts[0].attestation.digest, provenance.portable_core_attestation.digest);
  provenance.portable_core_attestation.digest = "0".repeat(64);
  fs.writeFileSync(path.join(root, "PROVENANCE.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  assert.throws(
    () => verifyReleaseMetadata({ archiveDir: root, outputDir: root }),
    (error) => error.code === "E_RELEASE_METADATA_VERIFY",
  );
  createReleaseMetadata({
    archiveDir: root,
    outputDir: root,
    sourceCommit: COMMIT,
    sourceVersion: "test",
    parityReportPath: parityReport,
    sourceDateEpoch: 1700000000,
  });
  const changed = path.join(root, "maister-codex.tar.gz");
  fs.appendFileSync(changed, "changed");
  assert.throws(
    () => verifyReleaseMetadata({ archiveDir: root, outputDir: root }),
    (error) => error.code === "E_RELEASE_METADATA_INPUT",
  );
});

test("the public CLI keeps one injected GitHub checkout for source and overlay resolution", async () => {
  const { runCli } = await import("../../plugins/maister/bin/maister-install.mjs");
  const sourceRoot = tempDirectory("maister-github-source-");
  fs.cpSync(
    path.join(ROOT, "tests/fixtures/platform-independent/source-repos/basic/common"),
    path.join(sourceRoot, "common"),
    { recursive: true },
  );
  const overlayRoot = path.join(sourceRoot, "plugins/maister/overlays/codex");
  fs.mkdirSync(overlayRoot, { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "tests/fixtures/platform-independent/source-repos/basic/overlay.yml"),
    path.join(overlayRoot, "overlay.yml"),
  );
  fs.copyFileSync(
    path.join(ROOT, "tests/fixtures/platform-independent/source-repos/basic/inventory.yml"),
    path.join(overlayRoot, "inventory.yml"),
  );
  fs.cpSync(
    path.join(ROOT, "tests/fixtures/platform-independent/source-repos/basic/assets"),
    path.join(overlayRoot, "assets"),
    { recursive: true },
  );
  const attestationPath = path.join(sourceRoot, "e3-portable-core.json");
  const portableCoreHash = portableCoreTreeHash(sourceRoot);
  fs.writeFileSync(attestationPath, `${JSON.stringify({
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "fixture-core-test",
    result: "passed",
    source_commit: COMMIT,
    source_version: "2.0.0",
    portable_core_tree_hash: portableCoreHash,
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: "2026-07-15T10:00:00.000Z",
    expires_at: "2026-07-16T10:00:00.000Z",
    artifact_digest: portableCoreHash,
  }, null, 2)}\n`);
  const root = tempDirectory("maister-github-cli-");
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  fs.mkdirSync(home);
  fs.mkdirSync(state);
  let resolverCalls = 0;
  const github = {
    resolveRef({ owner, repo, ref }) {
      resolverCalls += 1;
      assert.equal(owner, "owner");
      assert.equal(repo, "repo");
      assert.equal(ref, "main");
      return { commit: COMMIT, root: sourceRoot, sourceVersion: "2.0.0", contentHash: hashTree(sourceRoot).contentHash };
    },
  };

  const result = await runCli([
    "install",
    "--target",
    "codex",
    "--source",
    "github:owner/repo",
    "--ref",
    "main",
    "--attestation",
    attestationPath,
    "--home",
    home,
    "--json",
  ], { env: { ...process.env, XDG_STATE_HOME: state }, github });

  assert.equal(result.status, 0, result.output);
  const response = JSON.parse(result.output);
  assert.equal(response.ok, true);
  assert.equal(resolverCalls, 1);
  const receipt = JSON.parse(fs.readFileSync(response.receipt_path, "utf8"));
  assert.equal(receipt.source.kind, "github");
  assert.equal(receipt.source.requested, "github:owner/repo");
  assert.equal(receipt.source.resolved_commit, COMMIT);
});
