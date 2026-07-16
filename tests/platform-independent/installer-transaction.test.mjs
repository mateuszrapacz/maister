import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "../../plugins/maister/bin/maister-install.mjs";
import { hashTree } from "../../plugins/maister/lib/distribution/hash-tree.mjs";
import { materialize } from "../../plugins/maister/lib/distribution/materializer.mjs";
import { readJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { removeEntry, restoreFullBackup, snapshotState } from "../../plugins/maister/lib/distribution/recovery.mjs";
import { atomicWriteSetting } from "../../plugins/maister/lib/distribution/settings-owner.mjs";
import { getTargetPaths } from "../../plugins/maister/lib/distribution/target-paths.mjs";
import { readReceipt, validateReceipt } from "../../plugins/maister/lib/distribution/receipt-schema.mjs";
import { validateJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { executeLifecycle } from "../../plugins/maister/lib/distribution/transaction-manager.mjs";
import { createEvidenceRecord } from "../../plugins/maister/lib/distribution/evidence-schema.mjs";
import { e3AttestationDigest, portableCoreTreeHash } from "../../plugins/maister/lib/distribution/e3-attestation.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE_ROOT = path.join(ROOT, "tests/fixtures/platform-independent/source-repos/basic");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const TARGETS = ["codex", "cursor", "kiro-cli"];

const cleanGit = {
  topLevel: () => SOURCE_ROOT,
  head: () => COMMIT,
  status: () => [],
};

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-installer-"));
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  const sourceRoot = path.join(root, "source");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  fs.chmodSync(state, 0o700);
  fs.cpSync(SOURCE_ROOT, sourceRoot, { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, "plugins/maister"), { recursive: true });
  fs.cpSync(
    path.join(ROOT, "plugins/maister/overlays"),
    path.join(sourceRoot, "plugins/maister/overlays"),
    { recursive: true },
  );
  const git = {
    topLevel: () => fs.realpathSync(sourceRoot),
    head: () => COMMIT,
    status: () => [],
  };
  const coreHash = portableCoreTreeHash(sourceRoot);
  const attestationPath = path.join(root, "e3-attestation.json");
  fs.writeFileSync(attestationPath, `${JSON.stringify({
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "node --test tests/platform-independent/portable-core.test.mjs",
    result: "passed",
    source_commit: COMMIT,
    source_version: "unknown",
    portable_core_tree_hash: coreHash,
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: "2026-07-15T00:00:00.000Z",
    expires_at: "2027-07-15T00:00:00.000Z",
    artifact_digest: coreHash,
  }, null, 2)}\n`);
  return {
    root,
    home,
    state,
    sourceRoot,
    git,
    attestationPath,
    env: { ...process.env, XDG_STATE_HOME: state, MAISTER_ENABLE_FAILURE_INJECTION: "1", MAISTER_EVIDENCE_NOW: "2026-07-15T00:00:00.000Z" },
  };
}

function args(command, target, box, extra = []) {
  return [command, "--target", target, "--source", `local:${box.sourceRoot}`, "--home", box.home, "--json", ...extra];
}

async function invoke(command, target, box, extra = []) {
  const cliArgs = args(command, target, box, extra);
  if (command === "install" || command === "update") cliArgs.push("--attestation", box.attestationPath);
  return runCli(cliArgs, { env: box.env, git: box.git });
}

function output(result) {
  return typeof result.output === "string" ? JSON.parse(result.output) : result.output;
}

function readAttestation(box) {
  return JSON.parse(fs.readFileSync(box.attestationPath, "utf8"));
}

function activePath(box, target = "codex") {
  return getTargetPaths({ target, home: box.home, env: box.env }).activeRoot;
}

function readActiveSnapshot(box, target = "codex") {
  const active = activePath(box, target);
  return fs.existsSync(active) ? hashTree(active) : null;
}

function clearJournals(box, target = "codex") {
  const journalsRoot = getTargetPaths({ target, home: box.home, env: box.env }).journalsRoot;
  for (const journal of fs.readdirSync(journalsRoot)) fs.rmSync(path.join(journalsRoot, journal));
}

test("rejects a staging-parent swap after validation without writing outside the staging root", async () => {
  const box = sandbox();
  const stagingParent = path.join(box.root, "staging-parent");
  const renamedParent = path.join(box.root, "staging-parent-original");
  const outside = path.join(box.root, "outside");
  const stagingRoot = path.join(stagingParent, "candidate");
  fs.mkdirSync(stagingParent, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "outside-original\n");

  try {
    await assert.rejects(
      materialize({
        source: `local:${SOURCE_ROOT}`,
        target: "codex",
        overlayPath: path.join(ROOT, "plugins/maister/overlays/codex/overlay.yml"),
        inventoryPath: path.join(ROOT, "plugins/maister/overlays/codex/inventory.yml"),
        overlayBase: path.join(ROOT, "plugins/maister/overlays/codex"),
        stagingRoot,
        git: cleanGit,
        testHooks: {
          afterStagingParentValidation: () => {
            fs.renameSync(stagingParent, renamedParent);
            fs.symlinkSync(outside, stagingParent, "dir");
          },
        },
      }),
      (error) => error?.kind === "E_MATERIALIZE_SYMLINK" || error?.kind === "E_PATH_SECURITY",
    );
    assert.equal(fs.existsSync(path.join(outside, "candidate")), false);
    assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "outside-original\n");
  } finally {
    fs.rmSync(stagingParent, { recursive: true, force: true });
    fs.rmSync(renamedParent, { recursive: true, force: true });
  }
});

test("state reads reject parent and leaf replacement without following an outside symlink", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const outside = path.join(box.root, "outside-state");
  fs.mkdirSync(outside);
  const sentinel = path.join(outside, "sentinel.txt");
  fs.writeFileSync(sentinel, "outside-original\n");

  const cases = [
    ["receipt", installed.receipt_path, paths.receiptsRoot, (filePath, beforeRead) => readReceipt(filePath, { paths, beforeRead }), "E_RECEIPT_IO"],
    ["journal", installed.journal_path, paths.journalsRoot, (filePath, beforeRead) => readJournal(filePath, { paths, beforeRead }), "E_JOURNAL_IO"],
  ];
  for (const [label, filePath, stateRoot, reader, expectedKind] of cases) {
    const movedRoot = `${stateRoot}-original`;
    assert.throws(
      () => reader(filePath, () => {
        fs.renameSync(stateRoot, movedRoot);
        fs.symlinkSync(outside, stateRoot, "dir");
      }),
      (error) => error?.kind === expectedKind,
      `${label} parent replacement after validation`,
    );
    fs.rmSync(stateRoot, { recursive: true, force: true });
    fs.renameSync(movedRoot, stateRoot);

    const movedFile = path.join(outside, `${label}.json`);
    assert.throws(
      () => reader(filePath, () => {
        fs.renameSync(filePath, movedFile);
        fs.symlinkSync(movedFile, filePath);
      }),
      (error) => error?.kind === expectedKind,
      `${label} leaf replacement after validation`,
    );
    fs.rmSync(filePath, { force: true });
    fs.renameSync(movedFile, filePath);
  }
  assert.equal(fs.readFileSync(sentinel, "utf8"), "outside-original\n");
});

test("settings replacement rejects parent and leaf swaps after validation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-settings-boundary-"));
  const settingsRoot = path.join(root, "settings");
  const targetPath = path.join(settingsRoot, "config.json");
  const outside = path.join(root, "outside");
  fs.mkdirSync(settingsRoot);
  fs.mkdirSync(outside);
  fs.writeFileSync(targetPath, "original\n");
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "outside-original\n");
  try {
    const movedRoot = `${settingsRoot}-original`;
    assert.throws(
      () => atomicWriteSetting(targetPath, Buffer.from("parent-escape\n"), "0640", {
        beforeMutation: () => {
          fs.renameSync(settingsRoot, movedRoot);
          fs.symlinkSync(outside, settingsRoot, "dir");
        },
      }),
      (error) => error?.kind === "E_SETTINGS_PATH",
    );
    fs.rmSync(settingsRoot, { recursive: true, force: true });
    fs.renameSync(movedRoot, settingsRoot);
    assert.equal(fs.readFileSync(path.join(settingsRoot, "config.json"), "utf8"), "original\n");

    const movedFile = path.join(outside, "config-original.json");
    assert.throws(
      () => atomicWriteSetting(targetPath, Buffer.from("leaf-escape\n"), "0640", {
        beforeMutation: () => {
          fs.renameSync(targetPath, movedFile);
          fs.symlinkSync(movedFile, targetPath);
        },
      }),
      (error) => error?.kind === "E_SETTINGS_PATH",
    );
    fs.rmSync(targetPath, { force: true });
    fs.renameSync(movedFile, targetPath);
    assert.equal(fs.readFileSync(targetPath, "utf8"), "original\n");
    assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "outside-original\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("recovery removal rejects a swapped parent before recursive deletion", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-recovery-boundary-"));
  const parent = path.join(root, "managed");
  const target = path.join(parent, "candidate");
  const outside = path.join(root, "outside");
  const movedParent = `${parent}-original`;
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(target, "keep.txt"), "keep\n");
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "outside-original\n");
  try {
    assert.throws(
      () => removeEntry(target, {
        root,
        label: "recovery target",
        beforeMutation: () => {
          fs.renameSync(parent, movedParent);
          fs.symlinkSync(outside, parent, "dir");
        },
      }),
      (error) => error?.kind === "E_RECOVERY_PATH",
    );
    fs.rmSync(parent, { recursive: true, force: true });
    fs.renameSync(movedParent, parent);
    assert.equal(fs.readFileSync(path.join(parent, "candidate", "keep.txt"), "utf8"), "keep\n");
    assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "outside-original\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function recoveryFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-recovery-"));
  const home = path.join(root, "home");
  const stateRoot = path.join(root, "state");
  const activeRoot = path.join(home, ".codex", "maister");
  const settingsPath = path.join(home, "settings.json");
  const activeReceiptPath = path.join(stateRoot, "active-receipt.json");
  const backupRoot = path.join(stateRoot, "backups", "journal-1");
  const outside = path.join(root, "outside");
  fs.mkdirSync(path.join(activeRoot, "nested"), { recursive: true });
  fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "outside-original\n");
  fs.writeFileSync(path.join(activeRoot, "nested", "file.txt"), "original-bytes\n");
  fs.chmodSync(path.join(activeRoot, "nested", "file.txt"), 0o640);
  fs.symlinkSync("nested/file.txt", path.join(activeRoot, "link.txt"));
  fs.chmodSync(activeRoot, 0o750);
  fs.writeFileSync(settingsPath, "settings-original\n");
  fs.chmodSync(settingsPath, 0o640);
  fs.writeFileSync(activeReceiptPath, "receipt-original\n");
  fs.chmodSync(activeReceiptPath, 0o600);
  const settings = [{ path: "settings.json", targetPath: settingsPath }];
  const paths = { home, stateRoot, activeRoot, activeReceiptPath };
  const manifest = snapshotState({ activeRoot, settings, backupRoot, activeReceiptPath });
  return { root, home, stateRoot, activeRoot, settingsPath, activeReceiptPath, backupRoot, outside, paths, manifest };
}

test("rejects backup tampering of bytes, modes, symlink targets, types, existence, and topology before restore", () => {
  const cases = [
    ["file bytes", (fixture) => fs.writeFileSync(path.join(fixture.backupRoot, "target", "nested", "file.txt"), "tampered-bytes\n")],
    ["file mode", (fixture) => fs.chmodSync(path.join(fixture.backupRoot, "target", "nested", "file.txt"), 0o600)],
    ["directory mode", (fixture) => fs.chmodSync(path.join(fixture.backupRoot, "target", "nested"), 0o700)],
    ["symlink target", (fixture) => {
      fs.writeFileSync(path.join(fixture.backupRoot, "target", "alternate.txt"), "alternate\n");
      fs.rmSync(path.join(fixture.backupRoot, "target", "link.txt"));
      fs.symlinkSync("alternate.txt", path.join(fixture.backupRoot, "target", "link.txt"));
    }],
    ["entry type", (fixture) => {
      fs.rmSync(path.join(fixture.backupRoot, "target", "nested", "file.txt"));
      fs.mkdirSync(path.join(fixture.backupRoot, "target", "nested", "file.txt"));
    }],
    ["entry existence", (fixture) => fs.rmSync(path.join(fixture.backupRoot, "target", "nested", "file.txt"))],
    ["directory topology", (fixture) => fs.writeFileSync(path.join(fixture.backupRoot, "target", "unexpected.txt"), "unexpected\n")],
    ["setting mode", (fixture) => fs.chmodSync(path.join(fixture.backupRoot, "settings", "0"), 0o600)],
    ["receipt bytes", (fixture) => fs.writeFileSync(path.join(fixture.backupRoot, "active-receipt.json"), "tampered-receipt\n")],
  ];

  for (const [name, mutate] of cases) {
    const fixture = recoveryFixture();
    const targetBefore = hashTree(fixture.activeRoot);
    const settingsBefore = fs.readFileSync(fixture.settingsPath);
    const receiptBefore = fs.readFileSync(fixture.activeReceiptPath);
    mutate(fixture);
    assert.throws(
      () => restoreFullBackup(fixture.backupRoot, { paths: fixture.paths }),
      (error) => error?.kind === "E_RECOVERY_BACKUP" || error?.kind === "E_RECOVERY_PATH",
      name,
    );
    assert.deepEqual(hashTree(fixture.activeRoot), targetBefore, name);
    assert.deepEqual(fs.readFileSync(fixture.settingsPath), settingsBefore, name);
    assert.deepEqual(fs.readFileSync(fixture.activeReceiptPath), receiptBefore, name);
    assert.equal(fs.readFileSync(path.join(fixture.outside, "sentinel.txt"), "utf8"), "outside-original\n", name);
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("clean lifecycle commands have durable receipts for every target seam", async () => {
  for (const target of TARGETS) {
    const box = sandbox();
    const installed = output(await invoke("install", target, box));
    assert.equal(installed.ok, true, target);
    assert.equal(installed.code, 0, target);
    assert.equal(fs.existsSync(activePath(box, target)), true, target);
    assert.equal(output(await invoke("verify", target, box)).code, 0, target);
    assert.equal(output(await invoke("update", target, box)).code, 0, target);
    assert.equal(output(await invoke("rollback", target, box)).code, 0, target);
    assert.equal(output(await invoke("recover", target, box)).code, 0, target);
    const uninstalled = output(await invoke("uninstall", target, box));
    assert.equal(uninstalled.code, 0, target);
    assert.equal(fs.existsSync(activePath(box, target)), false, target);
    assert.equal(fs.existsSync(installed.receipt_path), true, target);
  }
});

test("candidate receipts consume the supplied portable-core E3 attestation", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const receipt = JSON.parse(fs.readFileSync(installed.receipt_path, "utf8"));
  const attestation = readAttestation(box);
  const e3 = receipt.evidence.find((record) => record.capability === "E3");

  assert.equal(e3.result, "passed");
  assert.equal(e3.timestamp, attestation.tested_at);
  assert.equal(e3.expires_at, attestation.expires_at);
  assert.equal(e3.provenance.attestation_digest, e3AttestationDigest(attestation));
  assert.equal(e3.provenance.portable_core_tree_hash, attestation.portable_core_tree_hash);
  assert.equal(e3.provenance.artifact_digest, attestation.artifact_digest);
});

test("install fails closed when the overlay is outside the resolved source root and leaves no target", async () => {
  const box = sandbox();
  const sourceRoot = fs.mkdtempSync(path.join(box.root, "source-without-overlay-"));
  fs.cpSync(SOURCE_ROOT, sourceRoot, { recursive: true });
  fs.rmSync(path.join(sourceRoot, "overlay.yml"));
  fs.rmSync(path.join(sourceRoot, "inventory.yml"));
  const sourceGit = {
    topLevel: () => fs.realpathSync(sourceRoot),
    head: () => COMMIT,
    status: () => [],
  };

  try {
    await assert.rejects(
      () => executeLifecycle("install", {
        target: "codex",
        source: `local:${sourceRoot}`,
        resolvedSourceRoot: sourceRoot,
        home: box.home,
        env: box.env,
        git: sourceGit,
        overlayRoot: path.join(ROOT, "plugins/maister/overlays"),
        e3Attestation: readAttestation(box),
      }),
      (error) => error?.kind === "E_OVERLAY_IO",
    );
    assert.equal(fs.existsSync(activePath(box)), false);
    assert.equal(fs.existsSync(getTargetPaths({ target: "codex", home: box.home, env: box.env }).activeReceiptPath), false);
  } finally {
    fs.rmSync(sourceRoot, { recursive: true, force: true });
  }
});

test("direct lifecycle rejects split resolved and materialized source roots before state mutation", async () => {
  const box = sandbox();
  const otherSourceRoot = path.join(box.root, "other-source");
  fs.cpSync(box.sourceRoot, otherSourceRoot, { recursive: true });
  fs.appendFileSync(path.join(otherSourceRoot, "common/agents/README.md"), "\nsource B\n");
  const otherGit = {
    topLevel: () => fs.realpathSync(otherSourceRoot),
    head: () => COMMIT,
    status: () => [],
  };
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  assert.equal(fs.existsSync(paths.stateRoot), false);

  await assert.rejects(
    () => executeLifecycle("install", {
      target: "codex",
      source: `local:${otherSourceRoot}`,
      resolvedSourceRoot: box.sourceRoot,
      home: box.home,
      env: box.env,
      git: otherGit,
      overlayRoot: path.join(ROOT, "plugins/maister/overlays"),
      e3Attestation: readAttestation(box),
    }),
    (error) => error?.kind === "E_SOURCE_ROOT",
  );

  assert.equal(fs.existsSync(paths.stateRoot), false, "binding mismatch must not create lifecycle state");
  assert.equal(fs.existsSync(paths.activeRoot), false, "binding mismatch must not mutate target content");
});

test("direct executeLifecycle rejects a forged portable-core hash before publishing a receipt", async () => {
  const box = sandbox();
  const forged = {
    ...readAttestation(box),
    portable_core_tree_hash: "0".repeat(64),
    artifact_digest: "0".repeat(64),
  };

  await assert.rejects(
    () => executeLifecycle("install", {
      target: "codex",
      source: `local:${SOURCE_ROOT}`,
      resolvedSourceRoot: SOURCE_ROOT,
      home: box.home,
      env: box.env,
      git: cleanGit,
      overlayRoot: path.join(ROOT, "plugins/maister/overlays"),
      e3Attestation: forged,
    }),
    (error) => error?.kind === "E_EVIDENCE_ATTESTATION_BINDING",
  );
  assert.equal(fs.existsSync(activePath(box)), false);
  assert.equal(fs.existsSync(getTargetPaths({ target: "codex", home: box.home, env: box.env }).activeReceiptPath), false);
});

test("missing, stale, failed, and forged E3 attestations fail before target mutation", async () => {
  const cases = [
    ["missing", null],
    ["stale", (attestation) => ({ ...attestation, expires_at: "2026-07-15T00:00:00.000Z" })],
    ["failed", (attestation) => ({ ...attestation, result: "failed" })],
    ["forged", (attestation) => ({ ...attestation, source_commit: "f".repeat(40) })],
  ];

  for (const [name, mutate] of cases) {
    const box = sandbox();
    const extra = [];
    if (mutate) {
      const forgedPath = path.join(box.root, `${name}-e3.json`);
      fs.writeFileSync(forgedPath, `${JSON.stringify(mutate(readAttestation(box)), null, 2)}\n`);
      extra.push("--attestation", forgedPath);
    }
    const result = output(await runCli(args("install", "codex", box, extra), { env: box.env, git: box.git }));
    assert.equal(result.code, 4, name);
    assert.equal(fs.existsSync(activePath(box)), false, name);
    assert.equal(fs.existsSync(getTargetPaths({ target: "codex", home: box.home, env: box.env }).activeReceiptPath), false, name);
  }
});

test("failed integrity verification leaves no false passed receipt", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const activeBefore = readActiveSnapshot(box);
  const activeReceiptBefore = fs.readFileSync(paths.activeReceiptPath);
  const failed = output(await invoke("update", "codex", box, ["--failure-point", "after-integrity"]));
  const journal = JSON.parse(fs.readFileSync(failed.journal_path, "utf8"));

  assert.equal(failed.code, 7);
  assert.equal(journal.state, "recovered");
  assert.equal(journal.candidate_receipt, null);
  assert.equal(fs.existsSync(path.join(paths.receiptsRoot, `${journal.journal_id}.json`)), false);
  assert.deepEqual(readActiveSnapshot(box), activeBefore);
  assert.deepEqual(fs.readFileSync(paths.activeReceiptPath), activeReceiptBefore);
  assert.equal(fs.existsSync(installed.receipt_path), true);
});

test("E4 is created after committed integrity and before final receipt publication", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const receipt = JSON.parse(fs.readFileSync(installed.receipt_path, "utf8"));
  const journal = JSON.parse(fs.readFileSync(installed.journal_path, "utf8"));
  const integrityIndex = journal.steps.findIndex((step) => step.name === "integrity" && step.status === "completed");
  const publicationIndex = journal.steps.findIndex((step) => step.name === "receipt-published" && step.status === "completed");
  const integrity = journal.steps[integrityIndex];
  const e4 = receipt.evidence.find((record) => record.capability === "E4");

  assert.equal(integrityIndex >= 0, true);
  assert.equal(publicationIndex > integrityIndex, true);
  assert.equal(Date.parse(e4.timestamp) >= Date.parse(integrity.timestamp), true);
  assert.equal(Date.parse(e4.timestamp), Date.parse(receipt.installed_at));
  assert.equal(fs.existsSync(installed.receipt_path), true);

  const before = readActiveSnapshot(box);
  const interrupted = output(await invoke("update", "codex", box, ["--failure-point", "after-e4"]));
  const interruptedJournal = JSON.parse(fs.readFileSync(interrupted.journal_path, "utf8"));
  assert.equal(interrupted.code, 7);
  assert.equal(interruptedJournal.state, "failed");
  assert.equal(interruptedJournal.candidate_receipt.evidence.find((record) => record.capability === "E4").result, "passed");
  assert.equal(fs.existsSync(path.join(getTargetPaths({ target: "codex", home: box.home, env: box.env }).receiptsRoot, `${interruptedJournal.journal_id}.json`)), false);
  assert.deepEqual(readActiveSnapshot(box), before);
});

test("update records the prior receipt and preserves unrelated target content", async () => {
  const box = sandbox();
  const first = output(await invoke("install", "codex", box));
  const userFile = path.join(activePath(box), "user-owned.txt");
  fs.writeFileSync(userFile, "keep me\n");
  const second = output(await invoke("update", "codex", box));
  assert.equal(second.code, 0);
  assert.equal(fs.readFileSync(userFile, "utf8"), "keep me\n");
  const receipt = JSON.parse(fs.readFileSync(second.receipt_path, "utf8"));
  assert.equal(receipt.transaction.previous_receipt_id, JSON.parse(fs.readFileSync(first.receipt_path, "utf8")).receipt_id);
  assert.match(receipt.transaction.backup_manifest_hash, /^[0-9a-f]{64}$/u);
  const manifest = JSON.parse(fs.readFileSync(path.join(receipt.transaction.backup_root, "manifest.json"), "utf8"));
  assert.equal(receipt.transaction.backup_manifest_hash, manifest.manifest_hash);
});

test("rollback fails closed on a tampered transaction backup and preserves the active receipt", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const updated = output(await invoke("update", "codex", box));
  const activeBefore = readActiveSnapshot(box);
  const receipt = JSON.parse(fs.readFileSync(updated.receipt_path, "utf8"));
  const backupFile = path.join(receipt.transaction.backup_root, "target", ".codex-plugin", "plugin.json");
  fs.writeFileSync(backupFile, "tampered-backup\n");

  const rolledBack = output(await invoke("rollback", "codex", box));
  assert.equal(rolledBack.code, 7);
  assert.deepEqual(readActiveSnapshot(box), activeBefore);
  const journal = JSON.parse(fs.readFileSync(rolledBack.journal_path, "utf8"));
  assert.equal(journal.state, "rollback_failed");
  assert.equal(JSON.parse(fs.readFileSync(getTargetPaths({ target: "codex", home: box.home, env: box.env }).activeReceiptPath, "utf8")).receipt_id, receipt.receipt_id);
});

test("whole-file settings drift refuses an update", async () => {
  const box = sandbox();
  await invoke("install", "kiro-cli", box);
  const settings = path.join(box.home, "settings/mcp.json");
  fs.appendFileSync(settings, "\n");
  const result = output(await invoke("update", "kiro-cli", box));
  assert.equal(result.code, 5);
  assert.equal(result.error.kind, "E_DRIFT_CONFLICT");
});

test("managed-key settings preserve unrelated content and refuse owned-key conflicts", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const settings = path.join(box.home, ".codex/config.toml");
  fs.appendFileSync(settings, "user.preference = \"preserve\"\n");
  assert.equal(output(await invoke("update", "codex", box)).code, 0);
  assert.match(fs.readFileSync(settings, "utf8"), /user\.preference = "preserve"/u);
  fs.appendFileSync(settings, "plugins.maister = false\n");
  const result = output(await invoke("update", "codex", box));
  assert.equal(result.code, 5);
  assert.equal(result.error.kind, "E_DRIFT_CONFLICT");
});

test("uninstall drift rejection preserves exact managed tree and settings state", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const settings = path.join(box.home, ".codex/config.toml");
  fs.appendFileSync(settings, "plugins.maister = false\n");
  fs.chmodSync(settings, 0o640);
  const beforeTree = readActiveSnapshot(box);
  const beforeSettings = fs.readFileSync(settings);
  const beforeMode = fs.statSync(settings).mode & 0o7777;

  const result = output(await invoke("uninstall", "codex", box));

  assert.equal(result.code, 5);
  assert.equal(result.error.kind, "E_DRIFT_CONFLICT");
  assert.deepEqual(readActiveSnapshot(box), beforeTree);
  assert.deepEqual(fs.readFileSync(settings), beforeSettings);
  assert.equal(fs.statSync(settings).mode & 0o7777, beforeMode);
});

test("a held target lock returns the stable lock-busy code", async () => {
  const box = sandbox();
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  fs.mkdirSync(path.dirname(paths.lockPath), { recursive: true });
  fs.mkdirSync(paths.lockPath);
  fs.writeFileSync(path.join(paths.lockPath, "owner.json"), JSON.stringify({ pid: process.pid + 1 }));
  const result = output(await invoke("install", "codex", box));
  assert.equal(result.code, 6);
  assert.equal(result.error.kind, "E_LOCK_BUSY");
});

test("failure after snapshot restores a clean pre-install topology", async () => {
  const box = sandbox();
  const result = output(await invoke("install", "codex", box, ["--failure-point", "after-snapshot"]));
  assert.equal(result.code, 7);
  assert.equal(fs.existsSync(activePath(box)), false);
  assert.equal(fs.readdirSync(getTargetPaths({ target: "codex", home: box.home, env: box.env }).stagingRoot).length, 0);
});

test("failure during commit restores exact target bytes, modes, and links", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const active = activePath(box);
  const linkTarget = path.join(active, "skills/example/SKILL.md");
  const link = path.join(active, "user-link");
  fs.symlinkSync(path.relative(path.dirname(link), linkTarget), link);
  const before = readActiveSnapshot(box);
  const result = output(await invoke("update", "codex", box, ["--failure-point", "during-commit"]));
  assert.equal(result.code, 7);
  assert.deepEqual(readActiveSnapshot(box), before);
  assert.equal(fs.readlinkSync(link), path.relative(path.dirname(link), linkTarget));
});

test("failed journals remain auditable and recovery is idempotent", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const activeBefore = readActiveSnapshot(box);
  const activeReceiptBefore = fs.readFileSync(
    getTargetPaths({ target: "codex", home: box.home, env: box.env }).activeReceiptPath,
  );
  clearJournals(box);
  const failed = output(await invoke("update", "codex", box, ["--failure-point", "during-commit"]));
  const failedJournal = JSON.parse(fs.readFileSync(failed.journal_path, "utf8"));

  assert.equal(failed.code, 7);
  assert.equal(failedJournal.state, "recovered");
  assert.equal(failedJournal.failure.kind, "E_TX_FAILURE");
  assert.equal(failedJournal.candidate_receipt, null);
  assert.equal(failedJournal.steps.some((step) => step.name === "recovery" && step.status === "completed"), true);
  assert.deepEqual(readActiveSnapshot(box), activeBefore);
  assert.deepEqual(
    fs.readFileSync(getTargetPaths({ target: "codex", home: box.home, env: box.env }).activeReceiptPath),
    activeReceiptBefore,
  );

  const firstRecovery = output(await invoke("recover", "codex", box));
  const recoveredOnce = fs.readFileSync(failed.journal_path);
  const secondRecovery = output(await invoke("recover", "codex", box));
  const recoveredTwice = fs.readFileSync(failed.journal_path);
  assert.equal(firstRecovery.code, 0);
  assert.equal(secondRecovery.code, 0);
  assert.equal(JSON.parse(recoveredOnce).state, "recovered");
  assert.deepEqual(recoveredTwice, recoveredOnce);
  assert.deepEqual(readActiveSnapshot(box), activeBefore);
  assert.equal(fs.existsSync(installed.receipt_path), true);
});

test("recovery removes orphan candidate receipts and staging while retaining the forensic journal and backup", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  clearJournals(box);
  const failed = output(await invoke("update", "codex", box, ["--failure-point", "after-receipt"]));
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const journal = JSON.parse(fs.readFileSync(failed.journal_path, "utf8"));
  const candidateReceiptPath = path.join(paths.receiptsRoot, `${journal.journal_id}.json`);
  assert.equal(fs.existsSync(candidateReceiptPath), true);
  assert.equal(fs.existsSync(journal.stage_root), false);
  assert.equal(fs.existsSync(journal.candidate_receipt.transaction.backup_root), true);

  const recovered = output(await invoke("recover", "codex", box));
  assert.equal(recovered.code, 0);
  assert.equal(fs.existsSync(candidateReceiptPath), false);
  assert.equal(fs.existsSync(journal.candidate_receipt.transaction.backup_root), true);
  assert.equal(fs.existsSync(failed.journal_path), true);
  assert.equal(JSON.parse(fs.readFileSync(failed.journal_path, "utf8")).state, "recovered");
});

test("recover and rollback restore exact prior state and topology", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const active = activePath(box);
  fs.writeFileSync(path.join(active, "user-owned.txt"), "unmanaged\n");
  const linkTarget = path.join(active, "skills/example/SKILL.md");
  const link = path.join(active, "user-link");
  fs.symlinkSync(path.relative(path.dirname(link), linkTarget), link);
  fs.chmodSync(path.join(active, "user-owned.txt"), 0o751);
  const before = readActiveSnapshot(box);
  clearJournals(box);
  const failed = output(await invoke("update", "codex", box, ["--failure-point", "during-commit"]));
  assert.equal(failed.code, 7);
  assert.equal(output(await invoke("recover", "codex", box)).code, 0);
  assert.deepEqual(readActiveSnapshot(box), before);
  const updated = output(await invoke("update", "codex", box));
  assert.equal(updated.code, 0);
  const rolledBack = output(await invoke("rollback", "codex", box));
  assert.equal(rolledBack.code, 0);
  assert.deepEqual(readActiveSnapshot(box), before);
  assert.equal(fs.readFileSync(path.join(active, "user-owned.txt"), "utf8"), "unmanaged\n");
  assert.equal(fs.readlinkSync(link), path.relative(path.dirname(link), linkTarget));
  assert.match(crypto.createHash("sha256").update(JSON.stringify(rolledBack)).digest("hex"), /^[0-9a-f]{64}$/u);
});

test("rejects symlink escapes at target, state, settings, and staging boundaries", async () => {
  const cases = [
    {
      name: "target parent",
      setup: (box, outside) => {
        const parent = path.join(box.home, ".codex/plugins");
        fs.mkdirSync(parent, { recursive: true });
        fs.symlinkSync(outside, path.join(parent, "local"));
      },
    },
    {
      name: "state root",
      setup: (box, outside) => {
        const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
        fs.mkdirSync(path.dirname(paths.stateRoot), { recursive: true, mode: 0o700 });
        fs.symlinkSync(outside, paths.stateRoot);
      },
    },
    {
      name: "settings leaf",
      setup: (box, outside) => {
        fs.mkdirSync(path.join(box.home, ".codex"), { recursive: true });
        fs.symlinkSync(outside, path.join(box.home, ".codex/config.toml"));
      },
    },
    {
      name: "staging root",
      setup: (box, outside) => {
        const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
        fs.mkdirSync(path.dirname(paths.stagingRoot), { recursive: true, mode: 0o700 });
        fs.symlinkSync(outside, paths.stagingRoot);
      },
    },
  ];
  for (const scenario of cases) {
    const box = sandbox();
    const outside = path.join(box.root, `${scenario.name.replaceAll(" ", "-")}-outside`);
    fs.mkdirSync(outside, { recursive: true });
    const sentinel = path.join(outside, "sentinel");
    fs.writeFileSync(sentinel, "must remain untouched\n");
    scenario.setup(box, outside);
    const result = output(await invoke("install", "codex", box));
    assert.notEqual(result.code, 0, scenario.name);
    assert.equal(fs.readFileSync(sentinel, "utf8"), "must remain untouched\n", scenario.name);
    assert.equal(fs.readdirSync(outside).length, 1, scenario.name);
  }
});

test("rejects untrusted active receipt paths and strict receipt tampering", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const outside = path.join(box.root, "outside");
  fs.mkdirSync(outside, { recursive: true });
  const pointer = JSON.parse(fs.readFileSync(paths.activeReceiptPath, "utf8"));
  fs.writeFileSync(paths.activeReceiptPath, JSON.stringify({ ...pointer, receipt_path: path.join(outside, "receipt.json") }));
  const status = output(await invoke("status", "codex", box));
  assert.notEqual(status.code, 0);
  assert.equal(status.error.kind, "E_RECEIPT_SCHEMA");

  const receipt = JSON.parse(fs.readFileSync(installed.receipt_path, "utf8"));
  assert.throws(() => validateReceipt({ ...receipt, managed_inventory: [{ ...receipt.managed_inventory[0], path: "../escape" }] }, { paths }), /E_RECEIPT_SCHEMA/u);
  assert.throws(() => validateReceipt({ ...receipt, managed_inventory: [{ ...receipt.managed_inventory[0], sha256: "bad" }] }, { paths }), /E_RECEIPT_SCHEMA/u);
  assert.throws(() => validateReceipt({ ...receipt, unexpected: true }, { paths }), /E_RECEIPT_SCHEMA/u);
});

test("preserves existing settings mode and keeps transaction state private", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const settings = path.join(box.home, ".codex/config.toml");
  fs.chmodSync(settings, 0o640);
  assert.equal(output(await invoke("update", "codex", box)).code, 0);
  assert.equal(fs.statSync(settings).mode & 0o7777, 0o640);
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  for (const directory of [paths.stateRoot, paths.journalsRoot, paths.receiptsRoot, paths.backupsRoot, paths.stagingRoot]) {
    assert.equal(fs.statSync(directory).mode & 0o077, 0, directory);
  }
  for (const directory of [paths.journalsRoot, paths.receiptsRoot]) {
    for (const file of fs.readdirSync(directory)) assert.equal(fs.statSync(path.join(directory, file)).mode & 0o077, 0, file);
  }
});

test("recovers the newest unresolved journal and then an interrupted older journal", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  clearJournals(box);
  const first = output(await invoke("update", "codex", box, ["--failure-point", "after-e4"]));
  const second = output(await invoke("update", "codex", box, ["--failure-point", "after-e4"]));
  assert.equal(first.code, 7);
  assert.equal(second.code, 7);
  const interrupted = JSON.parse(fs.readFileSync(second.journal_path, "utf8"));
  const timestamp = new Date(Date.now() + 1000).toISOString();
  interrupted.state = "verified";
  interrupted.updated_at = timestamp;
  interrupted.state_history = interrupted.state_history.filter((entry) => entry.state !== "failed");
  interrupted.state_history.at(-1).timestamp = timestamp;
  interrupted.failure = null;
  fs.writeFileSync(second.journal_path, `${JSON.stringify(interrupted, null, 2)}\n`);
  fs.writeFileSync(path.join(activePath(box), "partial-write"), "remove me\n");

  const recoveredNewest = output(await invoke("recover", "codex", box));
  assert.equal(recoveredNewest.code, 0);
  assert.equal(path.resolve(recoveredNewest.journal_path), path.resolve(second.journal_path));
  assert.equal(JSON.parse(fs.readFileSync(second.journal_path, "utf8")).state, "recovered");
  assert.equal(fs.existsSync(path.join(activePath(box), "partial-write")), false);
  const recoveredOlder = output(await invoke("recover", "codex", box));
  assert.equal(recoveredOlder.code, 0);
  assert.equal(JSON.parse(fs.readFileSync(first.journal_path, "utf8")).state, "recovered");
});

test("records a guarded rollback failure instead of leaving a prepared journal", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const updated = output(await invoke("update", "codex", box));
  const receipt = JSON.parse(fs.readFileSync(updated.receipt_path, "utf8"));
  fs.rmSync(receipt.transaction.backup_root, { recursive: true, force: true });
  const result = output(await invoke("rollback", "codex", box));
  assert.notEqual(result.code, 0);
  assert.equal(result.error.kind, "E_RECOVERY_FAILURE");
  assert.equal(JSON.parse(fs.readFileSync(result.journal_path, "utf8")).state, "rollback_failed");
});

test("rejects illegal persisted journal transitions and malformed paths", async () => {
  const box = sandbox();
  await invoke("install", "codex", box);
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const journalPath = fs.readdirSync(paths.journalsRoot).map((file) => path.join(paths.journalsRoot, file)).find((file) => file.endsWith(".json"));
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  assert.throws(() => validateJournal({ ...journal, destination_root: path.join(paths.home, "../escape") }, { paths }), /E_JOURNAL_SCHEMA/u);
  assert.throws(() => validateJournal({ ...journal, state: "prepared", state_history: [...journal.state_history, { state: "prepared", timestamp: new Date().toISOString() }] }, { paths }), /E_JOURNAL_SCHEMA/u);
});

test("candidate receipts bind complete provenance hashes to collected and evaluated E1-E6 evidence", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const receipt = JSON.parse(fs.readFileSync(installed.receipt_path, "utf8"));
  const hashFields = ["source_hash", "overlay_hash", "materialized_hash", "provenance_hash"];

  assert.equal(receipt.target.overlay_id, "maister/codex");
  assert.deepEqual(Object.keys(receipt.provenance), hashFields);
  for (const field of hashFields) assert.match(receipt.provenance[field], /^[0-9a-f]{64}$/u);
  assert.equal(receipt.source.content_hash, receipt.provenance.source_hash);
  assert.deepEqual(receipt.evidence.map((record) => record.capability), ["E1", "E2", "E3", "E4", "E5", "E6"]);
  for (const record of receipt.evidence) {
    for (const field of hashFields) assert.equal(record.provenance[field], receipt.provenance[field], `${record.capability}.${field}`);
    assert.equal(record.provenance.source_commit, receipt.source.resolved_commit);
    assert.equal(record.provenance.source_version, receipt.source.source_version);
    assert.equal(record.provenance.overlay_version, receipt.target.overlay_version);
    assert.equal(record.provenance.scenario_version, receipt.compatibility.scenario_version);
  }

  const byCapability = Object.fromEntries(receipt.compatibility.evaluations.map((evaluation) => [evaluation.capability, evaluation]));
  assert.equal(byCapability.safety_hooks.status, "passed");
  assert.equal(byCapability.state_persistence.status, "passed");
  assert.equal(byCapability.rollback.status, "passed");
  assert.equal(byCapability.native_discovery.status, "provisional");
  assert.equal(byCapability.semantic_bindings.status, "blocked");
  assert.equal(byCapability.native_runtime.status, "blocked");
  assert.equal(receipt.compatibility.status, "provisional");
  assert.deepEqual(receipt.evidence.filter((record) => ["E5", "E6"].includes(record.capability)).map((record) => record.result), ["unavailable", "unavailable"]);
  for (const evaluation of receipt.compatibility.evaluations) {
    assert.equal(evaluation.passedEvidence.includes("E5") || evaluation.passedEvidence.includes("E6"), false, evaluation.capability);
  }
  assert.doesNotThrow(() => validateReceipt(receipt, { paths }));
});

test("receipt validation rejects tampered evidence, hashes, and evaluation promotion", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const paths = getTargetPaths({ target: "codex", home: box.home, env: box.env });
  const receipt = JSON.parse(fs.readFileSync(installed.receipt_path, "utf8"));

  const tamperedEvidence = {
    ...receipt,
    evidence: receipt.evidence.map((record) => record.capability === "E4" ? { ...record, result: "failed" } : record),
  };
  assert.throws(() => validateReceipt(tamperedEvidence, { paths }), /E_RECEIPT_SCHEMA/u);

  const tamperedHash = {
    ...receipt,
    provenance: { ...receipt.provenance, materialized_hash: "0".repeat(64) },
  };
  assert.throws(() => validateReceipt(tamperedHash, { paths }), /E_RECEIPT_SCHEMA/u);

  const promotedUnavailable = {
    ...receipt,
    evidence: receipt.evidence.map((record) => record.capability === "E5" ? { ...record, result: "passed", provenance: { ...record.provenance, reason: undefined } } : record),
  };
  assert.throws(() => validateReceipt(promotedUnavailable, { paths }), /E_RECEIPT_SCHEMA/u);

  const unknownEvidenceField = {
    ...receipt,
    evidence: receipt.evidence.map((record) => record.capability === "E6" ? { ...record, unexpected: true } : record),
  };
  assert.throws(() => validateReceipt(unknownEvidenceField, { paths }), /E_RECEIPT_SCHEMA/u);

  const missingEvaluations = {
    ...receipt,
    compatibility: { ...receipt.compatibility, evaluations: [] },
  };
  assert.throws(() => validateReceipt(missingEvaluations, { paths }), /E_RECEIPT_SCHEMA/u);
});

test("supplied native evidence is accepted only when all provenance hashes match", async () => {
  const box = sandbox();
  const first = output(await invoke("install", "codex", box));
  const previous = JSON.parse(fs.readFileSync(first.receipt_path, "utf8"));
  const provenance = {
    source_commit: previous.source.resolved_commit,
    source_version: previous.source.source_version,
    overlay_version: previous.target.overlay_version,
    scenario_version: previous.compatibility.scenario_version,
    source_hash: previous.provenance.source_hash,
    overlay_hash: previous.provenance.overlay_hash,
    materialized_hash: previous.provenance.materialized_hash,
    provenance_hash: previous.provenance.provenance_hash,
  };
  const timestamp = new Date().toISOString();
  const nativeEvidence = [
    createEvidenceRecord({ target: "codex", capability: "E5", hostVersion: previous.target.host_version, scenario: "native-discovery-v1", result: "passed", provenance, timestamp }),
    createEvidenceRecord({ target: "codex", capability: "E6", hostVersion: previous.target.host_version, scenario: "native-runtime-v1", result: "passed", provenance, timestamp }),
  ];
  const updated = await executeLifecycle("update", {
    target: "codex",
    source: `local:${box.sourceRoot}`,
    resolvedSourceRoot: box.sourceRoot,
    sourceVersion: previous.source.source_version,
    hostVersion: previous.target.host_version,
    home: box.home,
    env: box.env,
    git: box.git,
    overlayRoot: path.join(ROOT, "plugins/maister/overlays"),
    evidenceRecords: nativeEvidence,
    e3Attestation: readAttestation(box),
  });
  const receipt = JSON.parse(fs.readFileSync(updated.receiptPath, "utf8"));
  assert.equal(receipt.compatibility.status, "supported");
  assert.equal(receipt.evidence.every((record) => record.result === "passed"), true);
  assert.equal(receipt.compatibility.evaluations.every((evaluation) => evaluation.status === "passed"), true);
  assert.doesNotThrow(() => validateReceipt(receipt, { paths: getTargetPaths({ target: "codex", home: box.home, env: box.env }) }));
});

test("offline provisional packaging is explicit and strict policy fails closed without native evidence", async () => {
  const box = sandbox();
  const installed = output(await invoke("install", "codex", box));
  const receipt = JSON.parse(fs.readFileSync(installed.receipt_path, "utf8"));
  assert.equal(receipt.compatibility.policy, "offline-provisional");
  assert.equal(receipt.compatibility.status, "provisional");
  assert.equal(receipt.evidence.find((record) => record.capability === "E5").result, "unavailable");
  assert.equal(receipt.evidence.find((record) => record.capability === "E6").result, "unavailable");

  const strictBox = sandbox();
  await assert.rejects(
    () => executeLifecycle("install", {
      target: "codex",
      source: `local:${strictBox.sourceRoot}`,
      resolvedSourceRoot: strictBox.sourceRoot,
      home: strictBox.home,
      env: strictBox.env,
      git: strictBox.git,
      overlayRoot: path.join(ROOT, "plugins/maister/overlays"),
      releasePolicy: "strict",
      e3Attestation: readAttestation(strictBox),
    }),
    (error) => error?.kind === "E_EVIDENCE_POLICY",
  );
  assert.equal(fs.existsSync(activePath(strictBox)), false);
});

test("receipt provenance and evidence survive update, exact rollback, and uninstall lifecycle", async () => {
  const box = sandbox();
  const first = output(await invoke("install", "codex", box));
  const firstReceipt = JSON.parse(fs.readFileSync(first.receipt_path, "utf8"));
  const updated = output(await invoke("update", "codex", box));
  const updatedReceipt = JSON.parse(fs.readFileSync(updated.receipt_path, "utf8"));
  assert.deepEqual(updatedReceipt.provenance, firstReceipt.provenance);
  assert.deepEqual(updatedReceipt.evidence.map((record) => record.capability), firstReceipt.evidence.map((record) => record.capability));

  const rolledBack = output(await invoke("rollback", "codex", box));
  const rolledBackReceipt = JSON.parse(fs.readFileSync(rolledBack.receipt_path, "utf8"));
  assert.deepEqual(rolledBackReceipt.provenance, firstReceipt.provenance);
  assert.deepEqual(rolledBackReceipt.evidence, firstReceipt.evidence);
  assert.deepEqual(rolledBackReceipt.compatibility, firstReceipt.compatibility);

  const uninstalled = output(await invoke("uninstall", "codex", box));
  const uninstalledReceipt = JSON.parse(fs.readFileSync(uninstalled.receipt_path, "utf8"));
  assert.equal(uninstalledReceipt.status, "uninstalled");
  assert.deepEqual(uninstalledReceipt.provenance, rolledBackReceipt.provenance);
  assert.deepEqual(uninstalledReceipt.evidence, rolledBackReceipt.evidence);
  assert.deepEqual(uninstalledReceipt.compatibility, rolledBackReceipt.compatibility);
});
