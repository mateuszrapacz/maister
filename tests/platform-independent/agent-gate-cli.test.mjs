import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runCli } from "../../plugins/maister/bin/maister-agent-gate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function outputSink() {
  let value = "";
  return {
    write(chunk) { value += chunk; },
    json() { return JSON.parse(value); },
  };
}

test("agent-gate CLI stops reading stdin immediately after the one-mebibyte limit", async () => {
  let reads = 0;
  const stdin = {
    async *[Symbol.asyncIterator]() {
      reads += 1;
      yield Buffer.alloc(1024 * 1024, 0x20);
      reads += 1;
      yield Buffer.from("x");
      reads += 1;
      throw new Error("reader consumed beyond the enforced boundary");
    },
  };
  const stdout = outputSink();
  assert.equal(await runCli({ stdin, stdout }), 2);
  assert.equal(reads, 2);
  assert.equal(stdout.json().error.code, "E_AGENT_OWNER_INPUT");
});

test("agent-gate CLI wraps stdin read failures in the typed JSON envelope", async () => {
  const stdin = {
    async *[Symbol.asyncIterator]() {
      const error = new Error("stdin unavailable");
      error.code = "EIO";
      throw error;
    },
  };
  const stdout = outputSink();
  assert.equal(await runCli({ stdin, stdout }), 2);
  assert.deepEqual(stdout.json(), {
    schema_version: 1,
    status: "failed",
    result: null,
    error: {
      code: "E_AGENT_OWNER_STDIN",
      message: "agent-gate stdin read failed: stdin unavailable",
      retryable: false,
      details: { cause_code: "EIO" },
    },
  });
});

test("shipped agent-gate subprocess rejects oversized stdin with one typed envelope", () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, "plugins/maister/bin/maister-agent-gate.mjs")], {
    cwd: ROOT,
    input: Buffer.alloc((1024 * 1024) + 1, 0x20),
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).error.code, "E_AGENT_OWNER_INPUT");
});
