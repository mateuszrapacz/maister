import assert from "node:assert/strict";
import test from "node:test";

import { parseCliArgs } from "../../plugins/maister/lib/distribution/cli-contract.mjs";
import { validateJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { validateReceipt } from "../../plugins/maister/lib/distribution/receipt-schema.mjs";
import { getTargetPaths, resolveTargetSettingPath } from "../../plugins/maister/lib/distribution/target-paths.mjs";
import { getTargetDefinition, SUPPORTED_TARGETS, SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";

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
    pi: [{ rootId: "plugin_private", discoveryRoot: ".pi/agent/maister", ownership: "whole_tree" }],
  });
  for (const target of SUPPORTED_TARGETS) {
    assert.equal(Object.isFrozen(target), true, target.id);
    assert.equal(Object.isFrozen(target.managedRoots), true, target.id);
    assert.equal(target.managedRoots.every(Object.isFrozen), true, target.id);
  }
});

test("Pi exposes the native identity, compatibility tuple, and closed path policy", () => {
  const definition = getTargetDefinition("pi");

  assert.deepEqual({
    adapterId: definition.adapterId,
    projectionId: definition.projectionId,
    platform: definition.platform,
    pathPolicy: definition.pathPolicy,
    compatibility: definition.compatibility,
    probes: definition.probes,
  }, {
    adapterId: "pi.native",
    projectionId: "pi.native",
    platform: "posix",
    pathPolicy: {
      agentRootEnv: "PI_CODING_AGENT_DIR",
      defaultAgentRoot: ".pi/agent",
      settingsPath: "settings.json",
      sessionRootEnv: "PI_CODING_AGENT_SESSION_DIR",
      packageRootEnv: "PI_PACKAGE_DIR",
      packagePath: "maister",
    },
    compatibility: {
      pi: "0.80.10",
      node: "25.9.0",
      piSubagents: "0.35.1",
      delegationProtocol: 1,
    },
    probes: {
      executable: "pi",
      prerequisite: "pi-subagents",
    },
  });
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

test("Kiro resolves settings below the native Kiro home", () => {
  const home = "/tmp/maister-kiro-settings-home";
  const paths = getTargetPaths({ target: "kiro-cli", home, env: {} });

  assert.equal(paths.settingsRoot, `${home}/.kiro`);
  assert.equal(resolveTargetSettingPath(paths, "settings/mcp.json"), `${home}/.kiro/settings/mcp.json`);
  assert.equal(resolveTargetSettingPath(paths, "settings/settings.json"), `${home}/.kiro/settings/settings.json`);
});

test("Pi resolves its agent root from PI_CODING_AGENT_DIR before HOME and rejects non-POSIX platforms", () => {
  const home = "/tmp/maister-pi-home";
  const env = { XDG_STATE_HOME: "/tmp/maister-pi-state" };
  const defaultPaths = getTargetPaths({ target: "pi", home, env, platform: "darwin" });
  assert.equal(defaultPaths.agentRoot, `${home}/.pi/agent`);
  assert.equal(defaultPaths.activeRoot, `${home}/.pi/agent/maister`);
  assert.equal(defaultPaths.settingsPath, `${home}/.pi/agent/settings.json`);

  const configuredPaths = getTargetPaths({
    target: "pi",
    home,
    env: {
      ...env,
      PI_CODING_AGENT_DIR: "/tmp/configured-pi-agent",
      PI_CODING_AGENT_SESSION_DIR: "/tmp/configured-pi-sessions",
    },
    platform: "linux",
  });
  assert.equal(configuredPaths.agentRoot, "/tmp/configured-pi-agent");
  assert.equal(configuredPaths.activeRoot, "/tmp/configured-pi-agent/maister");
  assert.equal(configuredPaths.settingsPath, "/tmp/configured-pi-agent/settings.json");
  assert.equal(configuredPaths.sessionRoot, "/tmp/configured-pi-sessions");

  assert.throws(
    () => getTargetPaths({ target: "pi", home, env, platform: "win32" }),
    (error) => error?.code === "E_USAGE" && /POSIX/u.test(error.message),
  );
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
