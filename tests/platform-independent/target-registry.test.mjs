import assert from "node:assert/strict";
import test from "node:test";

import { parseCliArgs } from "../../plugins/maister/lib/distribution/cli-contract.mjs";
import { validateJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { validateReceipt } from "../../plugins/maister/lib/distribution/receipt-schema.mjs";
import { getTargetPaths } from "../../plugins/maister/lib/distribution/target-paths.mjs";
import { SUPPORTED_TARGETS, SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";

const JOURNAL = Object.freeze({
  schema_version: 2,
  journal_id: "00000000-0000-4000-8000-000000000001",
  command: "recover",
  target: "codex",
  started_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
  state: "prepared",
  state_history: [{ state: "prepared", timestamp: "2026-07-15T00:00:00.000Z" }],
  stage_root: "/tmp/maister/staging/00000000-0000-4000-8000-000000000001",
  managed_roots: [{ root_id: "plugin_private", path: "/tmp/maister/active", ownership: "whole_tree" }],
  previous_receipt: null,
  candidate_receipt: null,
  lock: { path: "/tmp/maister/lock" },
  steps: [],
  failure: null,
});

test("every registered target is accepted by CLI and journal validation", () => {
  for (const target of SUPPORTED_TARGET_IDS) {
    assert.equal(parseCliArgs(["status", "--target", target]).target, target);
    const definition = SUPPORTED_TARGETS.find(({ id }) => id === target);
    const managedRoots = definition.managedRoots.map(({ rootId, ownership }, index) => ({
      root_id: rootId,
      path: `/tmp/maister/${target}/root-${index}`,
      ownership,
    }));
    assert.equal(validateJournal({ ...JOURNAL, target, managed_roots: managedRoots }).target, target);
  }
});

test("unknown targets are rejected by CLI and journal validation", () => {
  assert.throws(
    () => parseCliArgs(["status", "--target", "unknown-target"]),
    (error) => error?.kind === "E_USAGE" && error.message.includes(SUPPORTED_TARGET_IDS.join(", ")),
  );
  assert.throws(
    () => validateJournal({ ...JOURNAL, target: "unknown-target" }),
    (error) => error?.kind === "E_JOURNAL_SCHEMA",
  );
});

test("registered targets expose stable immutable managed-root ownership", () => {
  const rootsByTarget = Object.fromEntries(SUPPORTED_TARGETS.map((target) => [
    target.id,
    target.managedRoots.map(({ rootId, discoveryRoot, ownership }) => ({ rootId, discoveryRoot, ownership })),
  ]));

  assert.deepEqual(rootsByTarget, {
    codex: [{ rootId: "plugin_private", discoveryRoot: ".codex/plugins/local/maister", ownership: "whole_tree" }],
    cursor: [{ rootId: "plugin_private", discoveryRoot: ".cursor/plugins/local/maister", ownership: "whole_tree" }],
    "kiro-cli": [
      { rootId: "plugin_private", discoveryRoot: ".kiro-maister", ownership: "whole_tree" },
      { rootId: "kiro_native_agents", discoveryRoot: ".kiro/agents", ownership: "leaf_set" },
    ],
  });
  for (const target of SUPPORTED_TARGETS) {
    assert.equal(Object.isFrozen(target), true, target.id);
    assert.equal(Object.isFrozen(target.managedRoots), true, target.id);
    assert.equal(target.managedRoots.every(Object.isFrozen), true, target.id);
  }
});

test("target paths resolve every managed root under one target lock", () => {
  const home = "/tmp/maister-managed-root-home";
  const env = { XDG_STATE_HOME: "/tmp/maister-managed-root-state" };

  for (const target of SUPPORTED_TARGET_IDS) {
    const paths = getTargetPaths({ target, home, env });
    assert.equal(paths.managedRoots.length, target === "kiro-cli" ? 2 : 1, target);
    assert.equal(paths.activeRoot, paths.managedRoots.find(({ rootId }) => rootId === "plugin_private").path, target);
    assert.equal(new Set(paths.managedRoots.map(({ rootId }) => rootId)).size, paths.managedRoots.length, target);
    assert.equal(paths.managedRoots.every((root) => root.path.startsWith(`${home}/`)), true, target);
    assert.equal(paths.lockPath, `${env.XDG_STATE_HOME}/maister/${target}/install.lock`, target);
  }
});

test("journal v2 validates root identity as part of the transaction contract", () => {
  assert.equal(validateJournal(JOURNAL).schema_version, 2);
  assert.throws(
    () => validateJournal({ ...JOURNAL, managed_roots: [...JOURNAL.managed_roots, JOURNAL.managed_roots[0]] }),
    (error) => error?.kind === "E_JOURNAL_SCHEMA" && /root/i.test(error.message),
  );
  assert.throws(
    () => validateJournal({ ...JOURNAL, managed_roots: [{ ...JOURNAL.managed_roots[0], path: "relative" }] }),
    (error) => error?.kind === "E_JOURNAL_SCHEMA",
  );
});

test("persisted v1 receipt and journal schemas require a typed clean install", () => {
  assert.throws(
    () => validateReceipt({ schema_version: 1 }),
    (error) => error?.kind === "E_CLEAN_INSTALL_REQUIRED" && /clean install/i.test(error.message),
  );
  assert.throws(
    () => validateJournal({ schema_version: 1 }),
    (error) => error?.kind === "E_CLEAN_INSTALL_REQUIRED" && /clean install/i.test(error.message),
  );
});
