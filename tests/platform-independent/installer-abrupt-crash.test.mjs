import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isUnresolved, readJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { getTargetPaths } from "../../plugins/maister/lib/distribution/target-paths.mjs";
import { DURABLE_BOUNDARY_MARKERS, executeLifecycle } from "../../plugins/maister/lib/distribution/transaction-manager.mjs";
import { filesystemSnapshot } from "../helpers/filesystem-snapshot.mjs";

const WORKER = path.resolve("tests/helpers/transaction-crash-worker.mjs");
const COMMITTED_MARKERS = new Set([
  "cleanup-prune-started",
  "cleanup-prune-completed",
  "terminal-journal-written",
]);

function runCrash(root, marker, operation) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER, root, marker, operation], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const stderr = [];
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`crash worker timed out at ${marker}`)); }, 60_000);
    child.once("error", reject);
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stderr: Buffer.concat(stderr).toString("utf8") });
    });
  });
}

function unresolvedJournals(paths) {
  if (!fs.existsSync(paths.journalsRoot)) return [];
  return fs.readdirSync(paths.journalsRoot)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(paths.journalsRoot, name))
    .filter((journalPath) => isUnresolved(readJournal(journalPath, { paths })));
}

test("every durable transaction marker has abrupt-crash recovery and terminal tree evidence", { timeout: 12 * 60_000 }, async (t) => {
  const results = [];
  for (const marker of DURABLE_BOUNDARY_MARKERS) {
    const operation = marker.startsWith("rollback-") ? "rollback" : "install";
    await t.test(marker, async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), `maister-crash-${marker}-`));
      const crashed = await runCrash(root, marker, operation);
      assert.ok(crashed.signal || crashed.code !== 0, crashed.stderr);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "crash-observed.json"), "utf8")), { marker, operation });
      const home = path.join(root, "home");
      const env = { ...process.env, XDG_STATE_HOME: path.join(root, "state"), MAISTER_EVIDENCE_NOW: "2026-07-15T00:00:00.000Z" };
      const paths = getTargetPaths({ target: "codex", home, env });
      let recovery = "completed";
      try {
        await executeLifecycle("recover", { target: "codex", home, env });
      } catch (error) {
        recovery = error.kind ?? error.name;
      }
      const unresolved = unresolvedJournals(paths);
      assert.equal(unresolved.length, 0, `${marker}: ${recovery}`);
      const oracle = JSON.parse(fs.readFileSync(path.join(root, "recovery-oracle.json"), "utf8"));
      const expectedHome = operation === "rollback"
        ? oracle.after_rollback
        : COMMITTED_MARKERS.has(marker) ? oracle.at_crash : oracle.before_operation;
      assert.deepEqual(filesystemSnapshot(home), expectedHome, `${marker}: recovered host tree must match the complete expected oracle`);
      const journals = fs.readdirSync(paths.journalsRoot)
        .filter((name) => name.endsWith(".json"))
        .map((name) => readJournal(path.join(paths.journalsRoot, name), { paths }));
      const recovered = journals.filter((journal) => journal.state === "recovered" || journal.state === "rolled_back" || journal.state === "verified");
      if (marker === "lock-created") {
        assert.equal(journals.length, 0, "lock-only crash is pre-journal and must not invent recovery state");
      } else {
        assert.ok(recovered.length > 0, `${marker}: recovery must leave a terminal journal classification`);
      }
      const homeSnapshot = filesystemSnapshot(home);
      const stateSnapshot = filesystemSnapshot(path.join(root, "state"));
      const evidence = {
        marker,
        operation,
        recovery,
        expected_home: operation === "rollback"
          ? "previous-receipt"
          : COMMITTED_MARKERS.has(marker) ? "committed" : "pre-operation",
        home: { sha256: homeSnapshot.sha256, entries: homeSnapshot.entries.length },
        state: { sha256: stateSnapshot.sha256, entries: stateSnapshot.entries.length },
      };
      results.push(evidence);
      fs.rmSync(root, { recursive: true, force: true });
    });
  }
  assert.deepEqual(results.map(({ marker }) => marker), DURABLE_BOUNDARY_MARKERS);
  process.stderr.write(`${JSON.stringify({ kind: "maister.transaction-crash.marker-outcomes", results })}\n`);
});
