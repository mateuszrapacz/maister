import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadOverlay,
  parseOverlayYaml,
  validateOverlay,
} from "../../plugins/maister/lib/distribution/overlay-loader.mjs";
import { projectCursorSkills } from "../../plugins/maister/lib/distribution/cursor-skill-projector.mjs";
import { SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const FIXTURE_ROOT = path.join(ROOT, "tests/fixtures/platform-independent/overlays");
const REQUIRED_PRIMITIVES = [
  "continue_workflow",
  "delegate_agent",
  "persist_state",
  "resolve_task_root",
  "track_progress",
  "user_gate",
];
const PORTABLE_RUNTIME_MODULES = [
  "skills/orchestrator-framework/bin/gate-evaluator.mjs",
  "skills/orchestrator-framework/bin/orchestrator-state-repository.mjs",
  "skills/orchestrator-framework/bin/orchestrator-state-schema.mjs",
  "skills/orchestrator-framework/bin/phase-continue.mjs",
  "skills/orchestrator-framework/bin/workflow-continuation.mjs",
];

const REQUIRED_INVENTORY = {
  codex: [
    ".codex-plugin/plugin.json",
    "skills/**/SKILL.md",
    "skills/**/agents/openai.yaml",
    "hooks/hooks.json",
    "skills/orchestrator-framework/bin/gate-evaluator.mjs",
  ],
  cursor: [
    ".cursor-plugin/plugin.json",
    "skills/maister-*/SKILL.md",
    "agents/*.md",
    "rules/*.mdc",
    "hooks/hooks.json",
  ],
  "kiro-cli": [
    "skills/**/SKILL.md",
    "agents/*.json",
    "steering/*.md",
    "hooks/*.sh",
    "agent-tools.json",
  ],
};

function fixturePaths(target) {
  const fixtureRoot = path.join(FIXTURE_ROOT, target);
  return {
    overlayPath: path.join(fixtureRoot, "overlay.yml"),
    inventoryPath: path.join(fixtureRoot, "inventory.yml"),
  };
}

function readFixture(target) {
  const { overlayPath } = fixturePaths(target);
  return parseOverlayYaml(fs.readFileSync(overlayPath, "utf8"), overlayPath);
}

function expectOverlayError(action, code) {
  assert.throws(action, (error) => {
    assert.equal(error.code, code);
    assert.match(error.message, new RegExp(code));
    assert.equal(error.retryable, false);
    return true;
  });
}

test("accepts valid Codex, Cursor, and Kiro CLI fixtures with required inventories", () => {
  for (const target of SUPPORTED_TARGET_IDS) {
    const loaded = loadOverlay(fixturePaths(target));

    assert.equal(loaded.overlay.schema_version, 1);
    assert.equal(loaded.overlay.target.id, target);
    assert.deepEqual(loaded.inventory.required, REQUIRED_INVENTORY[target]);
    assert.ok(loaded.overlay.settings.length > 0);
    assert.deepEqual(
      Object.keys(loaded.overlay.semantic_bindings).sort(),
      REQUIRED_PRIMITIVES,
    );
  }
});

test("keeps the checked-in Cursor skill projection equivalent and detects isolated drift", async () => {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-cursor-projection-"));
  for (const relative of [
    "plugins/maister/skills",
    "plugins/maister/overlays/cursor/assets/skills",
    "plugins/maister/overlays/cursor/skill-projection-v1.json",
  ]) {
    const destination = path.join(repositoryRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }

  const equivalent = await projectCursorSkills({ repositoryRoot, check: true });
  assert.equal(equivalent.changed, 0);
  assert.ok(equivalent.files > 0);

  fs.appendFileSync(
    path.join(repositoryRoot, "plugins/maister/overlays/cursor/assets/skills/maister-development/SKILL.md"),
    "\nprojection drift\n",
  );
  await assert.rejects(
    projectCursorSkills({ repositoryRoot, check: true }),
    /Cursor skill projection is stale/u,
  );
});

test("keeps the six portable primitives bound to the five single-source runtime modules", () => {
  const primitivesPath = path.join(ROOT, "plugins/maister/common/primitives.yml");
  const manifest = parseOverlayYaml(fs.readFileSync(primitivesPath, "utf8"), primitivesPath);

  assert.equal(manifest.schema_version, 1);
  assert.deepEqual(manifest.primitives.map(({ id }) => id).sort(), REQUIRED_PRIMITIVES);
  assert.deepEqual(manifest.runtime_modules, PORTABLE_RUNTIME_MODULES);
  assert.ok(manifest.primitives.every(({ fail_closed, module, operation }) =>
    fail_closed === true
    && PORTABLE_RUNTIME_MODULES.includes(module)
    && typeof operation === "string"
    && operation.length > 0));
  for (const module of PORTABLE_RUNTIME_MODULES) {
    assert.equal(fs.existsSync(path.join(ROOT, "plugins/maister", module)), true, module);
  }
});

test("rejects unknown overlay fields", () => {
  const overlay = readFixture("codex");
  overlay.unexpected_field = true;

  expectOverlayError(() => validateOverlay(overlay), "E_OVERLAY_SCHEMA");
});

test("rejects overlays with missing semantic bindings", () => {
  const overlay = readFixture("cursor");
  delete overlay.semantic_bindings.continue_workflow;

  expectOverlayError(() => validateOverlay(overlay), "E_OVERLAY_BINDINGS");
});

test("rejects incomplete, extra, or non-fail-closed semantic binding fields", () => {
  const mutations = [
    (overlay) => { overlay.semantic_bindings.user_gate.fail_closed = false; },
    (overlay) => { delete overlay.semantic_bindings.delegate_agent.adapter; },
    (overlay) => { overlay.semantic_bindings.persist_state.unreviewed = true; },
    (overlay) => { overlay.semantic_bindings.unreviewed_primitive = { adapter: "x", capability: "semantic", fail_closed: true }; },
  ];
  for (const mutate of mutations) {
    const overlay = readFixture("codex");
    mutate(overlay);
    expectOverlayError(() => validateOverlay(overlay), "E_OVERLAY_BINDINGS");
  }
});

test("rejects invalid ownership combinations", () => {
  const overlay = readFixture("kiro-cli");
  overlay.settings[0].ownership = "whole_file";
  overlay.settings[0].managed_keys = ["chat.defaultAgent"];

  expectOverlayError(() => validateOverlay(overlay), "E_OVERLAY_OWNERSHIP");
});

test("rejects absolute and traversing destinations", () => {
  for (const destination of ["/outside", "../outside", "nested/../../outside"]) {
    const overlay = readFixture("codex");
    overlay.layout[0].destination = destination;

    expectOverlayError(() => validateOverlay(overlay), "E_OVERLAY_PATH");
  }
});

test("rejects normalized inventory collisions and foreign-host or Claude vocabulary", () => {
  const collision = readFixture("cursor");
  collision.inventory.required.push("SKILLS/MAISTER-*/SKILL.md");
  expectOverlayError(() => validateOverlay(collision), "E_OVERLAY_COLLISION");

  const foreignHost = readFixture("codex");
  foreignHost.native_assets[0].source = "assets/claude/plugin.json";
  expectOverlayError(() => validateOverlay(foreignHost), "E_OVERLAY_VOCABULARY");
});
