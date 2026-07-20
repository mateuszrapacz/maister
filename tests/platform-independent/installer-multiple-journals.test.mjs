import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { executeLifecycle } from "../../plugins/maister/lib/distribution/transaction-manager.mjs";
import { filesystemSnapshot, filesystemSnapshotSet } from "../helpers/filesystem-snapshot.mjs";

const WORKER = path.resolve("tests/helpers/transaction-crash-worker.mjs");

function journalOwnedPaths(journalPath, journal) {
  const targetStateRoot = path.resolve(path.dirname(journalPath), "..");
  const receiptsRoot = path.join(targetStateRoot, "receipts");
  return [
    journalPath,
    journal.stage_root,
    journal.backup_root,
    journal.control_plane?.stage_path,
    journal.control_plane?.destination_path,
    journal.candidate_receipt?.receipt_id ? path.join(receiptsRoot, `${journal.candidate_receipt.receipt_id}.json`) : null,
  ].filter(Boolean);
}

function seed(root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER, root, "unused", "seed-multiple"], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    const stderr = [];
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(Buffer.concat(stderr).toString("utf8"))));
  });
}

test("multiple unresolved journals fail closed and exact recovery isolates the unselected journal", { timeout: 180_000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-multiple-journals-"));
  await seed(root);
  const home = path.join(root, "home");
  const env = { ...process.env, XDG_STATE_HOME: path.join(root, "state"), MAISTER_EVIDENCE_NOW: "2026-07-15T00:00:00.000Z" };
  const { journalPaths } = JSON.parse(fs.readFileSync(path.join(root, "multiple-journals.json"), "utf8"));
  assert.equal(journalPaths.length, 2);
  const before = filesystemSnapshot(root);
  await assert.rejects(executeLifecycle("recover", { target: "codex", home, env }), { kind: "E_RECOVERY_AMBIGUOUS" });
  assert.deepEqual(filesystemSnapshot(root), before);

  const [selectedPath, unselectedPath] = journalPaths;
  const selected = readJournal(selectedPath);
  const unselected = readJournal(unselectedPath);
  const unselectedBefore = filesystemSnapshotSet(journalOwnedPaths(unselectedPath, unselected));
  await executeLifecycle("recover", { target: "codex", home, env, journalId: selected.journal_id });
  assert.deepEqual(
    filesystemSnapshotSet(journalOwnedPaths(unselectedPath, unselected)),
    unselectedBefore,
    "selected recovery must preserve every unselected journal-owned byte, mode, symlink, existence state, and topology",
  );
  assert.equal(readJournal(selectedPath).state, "recovered");
  fs.rmSync(root, { recursive: true, force: true });
});
