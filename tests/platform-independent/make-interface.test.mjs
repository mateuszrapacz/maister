import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RELEASE_INTERFACE = path.join(ROOT, "plugins/maister/bin/release-interface.mjs");
const SOURCE_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runMake(argumentsList, env = {}) {
  return spawnSync("make", argumentsList, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function runInterface(command, env = {}) {
  return spawnSync(process.execPath, [RELEASE_INTERFACE, command], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

test("Make delegates caller-controlled release values without shell or inline-JS interpolation", () => {
  const makefile = fs.readFileSync(path.join(ROOT, "Makefile"), "utf8");

  assert.match(makefile, /release-interface\.mjs generate-e3/u);
  assert.match(makefile, /release-interface\.mjs package/u);
  assert.match(makefile, /release-interface\.mjs install/u);
  assert.match(makefile, /export\s+TARGET\s+DIST_DIR\s+SOURCE_DATE_EPOCH/u);
  assert.doesNotMatch(makefile, /node --input-type=module -e/u);
  assert.doesNotMatch(makefile, /--(?:target|source|home|output|source-commit|source-version|test-command|result|scenario-version|expires-at)\s+[^\n]*\$\(/u);
});

test("Make rejects SUPPORTED_TARGETS overrides before evaluating caller syntax", () => {
  const root = tempDirectory("maister-make-supported-targets-");
  const makeFunctionMarker = path.join(root, "make-function-injected");
  const shellMarker = path.join(root, "shell-injected");

  const makeFunction = runMake([
    "validate",
    `SUPPORTED_TARGETS=$(shell touch ${makeFunctionMarker})`,
  ]);
  assert.notEqual(makeFunction.status, 0, `${makeFunction.stdout}\n${makeFunction.stderr}`);
  assert.equal(fs.existsSync(makeFunctionMarker), false, "Make function syntax must not execute");

  const shellSyntax = runMake([
    "validate",
    `SUPPORTED_TARGETS=codex; touch ${shellMarker}; #`,
  ]);
  assert.notEqual(shellSyntax.status, 0, `${shellSyntax.stdout}\n${shellSyntax.stderr}`);
  assert.equal(fs.existsSync(shellMarker), false, "shell metacharacters must not execute");
  assert.match(`${makeFunction.stdout}\n${makeFunction.stderr}\n${shellSyntax.stdout}\n${shellSyntax.stderr}`, /SUPPORTED_TARGETS.*not configurable/u);
});

test("release interface validates every target from the central registry", () => {
  const result = runInterface("validate-overlays");
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.targets.map(({ target }) => target), ["codex", "cursor", "kiro-cli"]);
  assert.equal(payload.targets.every(({ ok }) => ok === true), true);
});

test("Make rejects an unsafe package version without executing shell text", () => {
  const root = tempDirectory("maister-make-package-safety-");
  const marker = path.join(root, "package-injected");
  const maliciousVersion = `safe\"; touch ${marker}; #`;
  const result = runMake([
    "package",
    "TARGET=codex",
    `DIST_DIR=${path.join(root, "dist")}`,
    `SOURCE_COMMIT=${SOURCE_COMMIT}`,
    `SOURCE_VERSION=${maliciousVersion}`,
    "SOURCE_DATE_EPOCH=1784073600",
  ]);

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(marker), false, "caller text must never execute as shell syntax");
  assert.match(`${result.stdout}\n${result.stderr}`, /E_RELEASE_INTERFACE/u);
});

test("Make rejects an unsafe E3 command without executing shell text", () => {
  const root = tempDirectory("maister-make-e3-safety-");
  const marker = path.join(root, "e3-injected");
  const result = runMake([
    "generate-e3-attestation",
    `E3_OUTPUT=${path.join(root, "e3.json")}`,
    `SOURCE_COMMIT=${SOURCE_COMMIT}`,
    "SOURCE_VERSION=test",
    "E3_RESULT=passed",
    `E3_TEST_COMMAND=make test-core; touch ${marker}; #`,
    "SOURCE_DATE_EPOCH=1784073600",
  ]);

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(marker), false, "attestation command text must never execute as shell syntax");
  assert.match(`${result.stdout}\n${result.stderr}`, /E_RELEASE_INTERFACE/u);
});

test("safe Make release values preserve the generate-then-package interface", () => {
  const root = tempDirectory("maister-make-release-interface-");
  const e3Output = path.join(root, "evidence with spaces", "e3.json");
  const generated = runMake([
    "generate-e3-attestation",
    `E3_OUTPUT=${e3Output}`,
    `SOURCE_COMMIT=${SOURCE_COMMIT}`,
    "SOURCE_VERSION=test",
    "E3_RESULT=passed",
    "E3_TEST_COMMAND=make test-core",
    "SOURCE_DATE_EPOCH=1784073600",
  ]);
  assert.equal(generated.status, 0, `${generated.stdout}\n${generated.stderr}`);
  assert.equal(fs.existsSync(e3Output), true);

  const packaged = runMake([
    "package",
    "TARGET=codex",
    `DIST_DIR=${path.join(root, "package with spaces")}`,
    `SOURCE_COMMIT=${SOURCE_COMMIT}`,
    "SOURCE_VERSION=test",
    "SOURCE_DATE_EPOCH=1784073600",
    `E3_ATTESTATION=${e3Output}`,
  ]);
  assert.equal(packaged.status, 0, `${packaged.stdout}\n${packaged.stderr}`);
  assert.equal(fs.existsSync(path.join(root, "package with spaces", "maister-codex.tar.gz")), true);
});

test("release interface validates command, epoch, and path formats before work", () => {
  const root = tempDirectory("maister-release-interface-validation-");
  const base = {
    E3_OUTPUT: path.join(root, "e3.json"),
    SOURCE_COMMIT,
    SOURCE_VERSION: "test",
    E3_RESULT: "passed",
    E3_TEST_COMMAND: "make test-core",
    SOURCE_DATE_EPOCH: "1784073600",
  };

  const unsafeCommand = runInterface("generate-e3", {
    ...base,
    E3_TEST_COMMAND: "make test-core; touch /tmp/should-not-run",
  });
  assert.notEqual(unsafeCommand.status, 0);
  assert.match(`${unsafeCommand.stdout}\n${unsafeCommand.stderr}`, /E_RELEASE_INTERFACE_COMMAND/u);

  const unsafeEpoch = runInterface("generate-e3", {
    ...base,
    SOURCE_DATE_EPOCH: "1784073600.5",
  });
  assert.notEqual(unsafeEpoch.status, 0);
  assert.match(`${unsafeEpoch.stdout}\n${unsafeEpoch.stderr}`, /E_RELEASE_INTERFACE_EPOCH/u);

  const unsafePath = runInterface("package", {
    ...base,
    TARGET: "codex",
    DIST_DIR: `${root}/bad\npath`,
  });
  assert.notEqual(unsafePath.status, 0);
  assert.match(`${unsafePath.stdout}\n${unsafePath.stderr}`, /E_RELEASE_INTERFACE_PATH/u);
});

test("adversarial strings stay data across Make and the release interface", () => {
  const root = tempDirectory("maister-release-interface-adversarial-");
  const marker = path.join(root, "sentinel");
  const base = {
    SOURCE_COMMIT,
    SOURCE_VERSION: "test",
    E3_RESULT: "passed",
    SOURCE_DATE_EPOCH: "1784073600",
  };
  const hostileVersions = [
    `quoted\"value`,
    "line\nbreak",
    "value with spaces",
    `value; touch ${marker}`,
    "value${process.exit()}",
  ];
  for (const value of hostileVersions) {
    const output = path.join(root, `version-${hostileVersions.indexOf(value)}.json`);
    const result = runInterface("generate-e3", {
      ...base,
      E3_OUTPUT: output,
      E3_TEST_COMMAND: "make test-core",
      SOURCE_VERSION: value,
    });
    assert.notEqual(result.status, 0, JSON.stringify({ value, stdout: result.stdout, stderr: result.stderr }));
    assert.match(`${result.stdout}\n${result.stderr}`, /E_RELEASE_INTERFACE_VERSION/u);
  }

  const hostileCommands = [
    `make test-core; touch ${marker}`,
    "make test-core && echo injected",
    "make \"test-core\"",
    "make test-core\n touch sentinel",
    "make test-core }; process.exit() //",
  ];
  for (const value of hostileCommands) {
    const output = path.join(root, `command-${hostileCommands.indexOf(value)}.json`);
    const result = runInterface("generate-e3", {
      ...base,
      E3_OUTPUT: output,
      E3_TEST_COMMAND: value,
    });
    assert.notEqual(result.status, 0, JSON.stringify({ value, stdout: result.stdout, stderr: result.stderr }));
    assert.match(`${result.stdout}\n${result.stderr}`, /E_RELEASE_INTERFACE_COMMAND/u);
  }
  assert.equal(fs.existsSync(marker), false);

  const attestationDirectory = path.join(root, "attestation with spaces", "quote'folder");
  const attestationPath = path.join(attestationDirectory, "e3.json");
  const generated = runInterface("generate-e3", {
    ...base,
    E3_OUTPUT: attestationPath,
    E3_TEST_COMMAND: "make test-core",
  });
  assert.equal(generated.status, 0, `${generated.stdout}\n${generated.stderr}`);

  const firstDirectory = path.join(root, "dist with spaces one", "quote'folder");
  const secondDirectory = path.join(root, "dist with spaces two", "quote'folder");
  for (const directory of [firstDirectory, secondDirectory]) {
    const packaged = runInterface("package", {
      ...base,
      TARGET: "codex",
      DIST_DIR: directory,
      E3_ATTESTATION: attestationPath,
    });
    assert.equal(packaged.status, 0, `${packaged.stdout}\n${packaged.stderr}`);
  }
  const firstArchive = path.join(firstDirectory, "maister-codex.tar.gz");
  const secondArchive = path.join(secondDirectory, "maister-codex.tar.gz");
  assert.equal(fs.readFileSync(firstArchive).equals(fs.readFileSync(secondArchive)), true, "safe path punctuation must not affect deterministic packaging");

  for (const value of [
    `attestation; touch ${marker}`,
    "attestation\nwith-newline",
    "attestation${process.exit()}",
  ]) {
    const hostileAttestation = runInterface("package", {
      ...base,
      TARGET: "codex",
      DIST_DIR: path.join(root, "hostile-attestation-dist"),
      E3_ATTESTATION: path.join(root, value, "e3.json"),
    });
    assert.notEqual(hostileAttestation.status, 0);
    assert.match(`${hostileAttestation.stdout}\n${hostileAttestation.stderr}`, /E_RELEASE_INTERFACE_PATH/u);
  }

  for (const value of [
    `dist; touch ${marker}`,
    "dist\nwith-newline",
    "dist${process.exit()}",
  ]) {
    const hostileDirectory = runInterface("package", {
      ...base,
      TARGET: "codex",
      DIST_DIR: path.join(root, value),
      E3_ATTESTATION: attestationPath,
    });
    assert.notEqual(hostileDirectory.status, 0);
    assert.match(`${hostileDirectory.stdout}\n${hostileDirectory.stderr}`, /E_RELEASE_INTERFACE_PATH/u);
  }

  const safeParityReport = runInterface("parity-release", {
    PARITY_REPORT: path.join(root, "report with spaces 'quote'.json"),
    PARITY_ALLOW_DIRTY_LOCAL: "1",
  });
  assert.equal(safeParityReport.status, 0, `${safeParityReport.stdout}\n${safeParityReport.stderr}`);

  for (const value of [
    `report; touch ${marker}`,
    "report\nwith-newline",
    "report${process.exit()}",
  ]) {
    const hostileParityReport = runInterface("parity-release", {
      PARITY_REPORT: path.join(root, value),
      PARITY_ALLOW_DIRTY_LOCAL: "1",
    });
    assert.notEqual(hostileParityReport.status, 0);
    assert.match(`${hostileParityReport.stdout}\n${hostileParityReport.stderr}`, /E_RELEASE_INTERFACE_PATH/u);
  }
  assert.equal(fs.existsSync(marker), false);
});

test("install arguments are passed through the Node boundary and unsafe targets never execute", () => {
  const root = tempDirectory("maister-make-install-safety-");
  const marker = path.join(root, "install-injected");
  const maliciousTarget = `codex; touch ${marker}; #`;
  const result = runMake([
    "install",
    `TARGET=${maliciousTarget}`,
    `HOME=${path.join(root, "home")}`,
    "MAISTER_ALLOW_DIRTY_LOCAL=1",
  ]);

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(marker), false, "install target text must never execute as shell syntax");
  assert.match(`${result.stdout}\n${result.stderr}`, /E_RELEASE_INTERFACE_TARGET/u);
});
