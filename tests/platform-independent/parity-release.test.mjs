import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ORACLE = path.join(ROOT, "tests/fixtures/platform-independent/parity-oracle/manifest.json");

test("the clean-checkout parity gate is wired to one reviewed immutable oracle", async () => {
  const makefile = fs.readFileSync(path.join(ROOT, "Makefile"), "utf8");
  const releaseWorkflow = fs.readFileSync(path.join(ROOT, ".github/workflows/release.yml"), "utf8");
  const gate = fs.readFileSync(path.join(ROOT, "plugins/maister/bin/parity-release.mjs"), "utf8");
  const releaseInterface = fs.readFileSync(path.join(ROOT, "plugins/maister/bin/release-interface.mjs"), "utf8");
  const oracle = JSON.parse(fs.readFileSync(ORACLE, "utf8"));

  assert.match(makefile, /test-parity-release:/u);
  assert.match(makefile, /release-interface\.mjs parity-release/u);
  assert.match(releaseInterface, /runParityReleaseGate/u);
  assert.doesNotMatch(makefile, /LEGACY_ROOT|MATERIALIZED_ROOT/u);
  assert.match(releaseWorkflow, /make test-parity-release PARITY_REPORT=dist\/parity-release\.json/u);
  assert.doesNotMatch(releaseWorkflow, /PARITY_ALLOW_DIRTY_LOCAL=1/u);
  assert.match(releaseWorkflow, /fetch-depth: 0/u);
  assert.match(gate, /\.\.\/\.\.\/\.\.\/tests\/fixtures\/platform-independent\/parity-oracle\/manifest\.json/u);
  assert.match(gate, /git.*archive/u);
  assert.match(gate, /allowDirtyLocal = false/u);
  assert.equal(oracle.review_status, "reviewed-pre-deletion-immutable-git-tree");
  assert.equal(oracle.commit.length, 40);
  assert.deepEqual(Object.keys(oracle.targets).sort(), [...SUPPORTED_TARGET_IDS].sort());
  for (const target of SUPPORTED_TARGET_IDS) {
    assert.match(oracle.targets[target].tree, /^[0-9a-f]{40}$/u);
    assert.match(oracle.targets[target].legacy_path, /^plugins\/maister-/u);
  }
});

test("the parity release gate compares all targets to the immutable oracle", async () => {
  const { runParityReleaseGate } = await import("../../plugins/maister/bin/parity-release.mjs");
  const result = await runParityReleaseGate({
    root: ROOT,
    oraclePath: ORACLE,
    allowDirtyLocal: true,
  });

  assert.deepEqual(result.targets.map((entry) => entry.target), [...SUPPORTED_TARGET_IDS]);
  assert.ok(result.targets.every((entry) => entry.ok));
  assert.ok(result.targets.every((entry) => entry.counts.unresolved === 0));
  assert.equal(result.oracle.commit, "8034fb4bc08f62eb715afb7913d1b27642bb4788");
});
