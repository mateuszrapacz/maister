import assert from "node:assert/strict";
import test from "node:test";

import { runWithExternalWatchdog } from "../helpers/external-test-watchdog.mjs";

const HEARTBEAT_KIND = "maister.test.heartbeat";

function nodeProgram(source) {
  return {
    command: process.execPath,
    args: ["--input-type=module", "--eval", source],
  };
}

test("external watchdog streams heartbeats and classifies a clean child terminal", async () => {
  const records = [];
  const child = nodeProgram(`
    process.stderr.write(JSON.stringify({ kind: "${HEARTBEAT_KIND}", progress: 1 }) + "\\n");
    process.stdout.write("child-output\\n");
  `);
  const result = await runWithExternalWatchdog({
    ...child,
    heartbeatKind: HEARTBEAT_KIND,
    heartbeatDeadlineMs: 1_000,
    totalDeadlineMs: 2_000,
    onRecord: (record) => records.push(record),
  });

  assert.equal(result.classification, "passed");
  assert.equal(result.code, 0);
  assert.equal(result.stdout, "child-output\n");
  assert.deepEqual(records, [{ kind: HEARTBEAT_KIND, progress: 1 }]);
});

test("external watchdog recognizes structured records emitted on child stdout", async () => {
  const records = [];
  const terminalKind = "maister.test.final-tree-evidence";
  const child = nodeProgram(`
    process.stdout.write(JSON.stringify({ kind: "${terminalKind}", final_tree_evidence: [{ sandbox: "complete" }] }) + "\\n");
  `);
  const result = await runWithExternalWatchdog({
    ...child,
    heartbeatKind: HEARTBEAT_KIND,
    heartbeatDeadlineMs: null,
    totalDeadlineMs: 2_000,
    onRecord: (record) => records.push(record),
  });

  assert.equal(result.classification, "passed");
  assert.deepEqual(records, [{ kind: terminalKind, final_tree_evidence: [{ sandbox: "complete" }] }]);
});

test("external watchdog terminates a silent live child with an explicit heartbeat timeout", async () => {
  const child = nodeProgram("setInterval(() => {}, 1_000)");
  const result = await runWithExternalWatchdog({
    ...child,
    heartbeatKind: HEARTBEAT_KIND,
    heartbeatDeadlineMs: 50,
    totalDeadlineMs: 2_000,
  });

  assert.equal(result.classification, "heartbeat-timeout");
  assert.equal(result.timedOut, true);
  assert.ok(result.signal || result.code !== 0);
});

test("external watchdog distinguishes child failure from watchdog timeout", async () => {
  const child = nodeProgram("process.exitCode = 9");
  const result = await runWithExternalWatchdog({
    ...child,
    heartbeatKind: HEARTBEAT_KIND,
    heartbeatDeadlineMs: 1_000,
    totalDeadlineMs: 2_000,
  });

  assert.equal(result.classification, "failed");
  assert.equal(result.code, 9);
  assert.equal(result.timedOut, false);
});

test("external watchdog enforces one total harness deadline despite live heartbeats", async () => {
  const child = nodeProgram(`
    setInterval(() => process.stderr.write(JSON.stringify({ kind: "${HEARTBEAT_KIND}" }) + "\\n"), 10);
  `);
  const result = await runWithExternalWatchdog({
    ...child,
    heartbeatKind: HEARTBEAT_KIND,
    heartbeatDeadlineMs: 500,
    totalDeadlineMs: 75,
  });

  assert.equal(result.classification, "harness-timeout");
  assert.equal(result.timedOut, true);
});

test("external parent streams supervisory heartbeats even when the child event loop is silent", async () => {
  const heartbeats = [];
  const child = nodeProgram("setTimeout(() => {}, 60)");
  const result = await runWithExternalWatchdog({
    ...child,
    heartbeatKind: HEARTBEAT_KIND,
    heartbeatDeadlineMs: null,
    supervisorHeartbeatMs: 10,
    totalDeadlineMs: 1_000,
    onSupervisorHeartbeat: (record) => heartbeats.push(record),
  });

  assert.equal(result.classification, "passed");
  assert.ok(heartbeats.length >= 2);
  assert.ok(heartbeats.every((record) => record.kind === HEARTBEAT_KIND && record.source === "external-parent"));
});
