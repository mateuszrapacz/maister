import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runLauncher } from "../../lib/launcher/orchestrator.mjs";

const COMMIT = "a".repeat(40);

function snapshot(root) {
  if (!fs.existsSync(root)) return null;
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .map((entry) => `${entry.parentPath ?? entry.path}/${entry.name}:${entry.isDirectory() ? "d" : "f"}`)
    .sort();
}

test("pre-spawn release rejection mutates only the registered operation root", async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "maister-zero-mutation-"));
  const host = path.join(scratch, "host");
  const operation = path.join(scratch, "operation");
  fs.mkdirSync(host);
  fs.writeFileSync(path.join(host, "sentinel"), "unchanged\n", { mode: 0o640 });
  const before = snapshot(host);
  let cleaned = false;
  let delegated = false;
  await assert.rejects(runLauncher(
    { command: "install", target: "codex", json: false },
    { name: "@mateuszrapacz/maister", version: "2.2.1", resolvedCommit: COMMIT },
    {
      tempFactory: { create: () => ({
        root: operation,
        cleanup() { fs.rmSync(operation, { recursive: true, force: true }); cleaned = true; },
      }) },
      transport: { request: async () => ({ status: 200, bytes: Buffer.from("{}") }) },
      delegate: async () => { delegated = true; return { code: 0, signal: null }; },
    },
  ), { kind: "E_LAUNCHER_RELEASE_IDENTITY" });
  assert.equal(delegated, false);
  assert.equal(cleaned, true);
  assert.deepEqual(snapshot(host), before);
  assert.equal(fs.existsSync(operation), false);
  fs.rmSync(scratch, { recursive: true, force: true });
});

test("state-only authority rejection performs no acquisition and creates no state", async () => {
  let transportCalls = 0;
  let credentialCalls = 0;
  await assert.rejects(runLauncher(
    { command: "status", target: "codex", json: false },
    { version: "2.2.1" },
    {
      authorityStore: { readActiveReceipt() { throw Object.assign(new Error("absent"), { kind: "E_OFFLINE_AUTHORITY" }); } },
      transport: { request: async () => { transportCalls += 1; } },
      resolveCredential: async () => { credentialCalls += 1; },
    },
  ), { kind: "E_OFFLINE_AUTHORITY" });
  assert.equal(transportCalls, 0);
  assert.equal(credentialCalls, 0);
});
