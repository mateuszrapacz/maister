import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const WORKER = new URL("../helpers/launcher-memory-worker.mjs", import.meta.url);
const FIXTURES = JSON.parse(fs.readFileSync(new URL("../fixtures/platform-independent/launcher-archives/memory-fixtures.json", import.meta.url), "utf8"));
const MAX_RSS_GROWTH = 128 * 1024 * 1024;
const MAX_SCALING_GROWTH = 16 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 64 * 1024;

function runWorker(fixture, expected = "accepted") {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `maister-archive-memory-${fixture.name}-`));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER.pathname, scratch, JSON.stringify(fixture), expected], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const collect = (target, field) => (chunk) => {
      if (field === "stdout") stdoutBytes += chunk.length;
      else stderrBytes += chunk.length;
      if (stdoutBytes > MAX_OUTPUT_BYTES || stderrBytes > MAX_OUTPUT_BYTES) child.kill("SIGKILL");
      else target.push(chunk);
    };
    child.stdout.on("data", collect(stdout, "stdout"));
    child.stderr.on("data", collect(stderr, "stderr"));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      try {
        assert.equal(signal, null, Buffer.concat(stderr).toString("utf8"));
        assert.equal(code, 0, Buffer.concat(stderr).toString("utf8"));
        const lines = Buffer.concat(stdout).toString("utf8").trim().split(/\r?\n/u);
        assert.equal(lines.length, 1, "worker must emit exactly one terminal evidence record");
        resolve({ scratch, evidence: JSON.parse(lines[0]) });
      } catch (error) {
        fs.rmSync(scratch, { recursive: true, force: true });
        reject(error);
      }
    });
  });
}

test("streaming inspection remains within the near-limit RSS ceiling and reports terminal counters", async () => {
  const fixture = FIXTURES.accepted.find(({ name }) => name === "near-file-limit");
  const { scratch, evidence } = await runWorker(fixture);
  try {
    assert.equal(evidence.status, "accepted");
    assert.equal(evidence.counters.regularFileBytes, fixture.expanded_bytes);
    assert.equal(evidence.counters.regularFiles, 1);
    assert.equal(evidence.counters.entries, 3);
    assert.equal(evidence.extractedEntries, 3);
    assert.match(evidence.archiveSha256, /^[0-9a-f]{64}$/u);
    assert.ok(evidence.peakRssBytes - evidence.baselineRssBytes <= MAX_RSS_GROWTH, JSON.stringify(evidence));
    assert.deepEqual(fs.readdirSync(scratch), ["archive.tar.gz"]);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test("at least two-times expanded growth adds no more than 16 MiB peak RSS", async () => {
  const smallFixture = FIXTURES.accepted.find(({ name }) => name === "high-ratio-small");
  const largeFixture = FIXTURES.accepted.find(({ name }) => name === "high-ratio-large");
  const small = await runWorker(smallFixture);
  const large = await runWorker(largeFixture);
  try {
    assert.ok(largeFixture.expanded_bytes >= smallFixture.expanded_bytes * 2);
    for (const result of [small, large]) {
      assert.equal(result.evidence.status, "accepted");
      assert.equal(result.evidence.extractedEntries, 3);
      assert.ok(result.evidence.peakRssBytes - result.evidence.baselineRssBytes <= MAX_RSS_GROWTH, JSON.stringify(result.evidence));
    }
    const smallGrowth = small.evidence.peakRssBytes - small.evidence.baselineRssBytes;
    const largeGrowth = large.evidence.peakRssBytes - large.evidence.baselineRssBytes;
    assert.ok(largeGrowth - smallGrowth <= MAX_SCALING_GROWTH, JSON.stringify({ small: small.evidence, large: large.evidence }));
  } finally {
    fs.rmSync(small.scratch, { recursive: true, force: true });
    fs.rmSync(large.scratch, { recursive: true, force: true });
  }
});

test("ratio-limit rejection terminates with typed evidence and no extraction residue", async () => {
  const fixture = FIXTURES.rejected[0];
  const { scratch, evidence } = await runWorker(fixture, "rejected");
  try {
    assert.equal(evidence.status, "rejected");
    assert.equal(evidence.kind, fixture.expected_kind);
    assert.ok(evidence.elapsedMs < 10_000, JSON.stringify(evidence));
    assert.deepEqual(fs.readdirSync(scratch), ["archive.tar.gz"]);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
