/**
 * TDD Red: Cursor agents runtime discovery + E6 bridge packaging.
 *
 * Encodes the smoke defect and scoped fix contract:
 * - Plugin must ship a Cursor bridge exporting createMaisterAgentBridgeV1
 * - probeCursor must support hybrid default discover from plugin agents on disk
 * - Install must support optional --agents-fallback (user/project agents dir)
 * - Overlay inventory must require the packaged bridge leaf
 *
 * These assertions MUST fail before implementation and pass after.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { probeCursor } from "../../plugins/maister/lib/distribution/host-probes/cursor.mjs";
import { parseCliArgs } from "../../plugins/maister/lib/distribution/cli-contract.mjs";

const REPO_ROOT = path.resolve(".");
const CURSOR_OVERLAY = path.join(REPO_ROOT, "plugins/maister/overlays/cursor");
const PACKAGED_BRIDGE = path.join(
  REPO_ROOT,
  "plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs",
);
const OVERLAY_BRIDGE_ASSET = path.join(
  CURSOR_OVERLAY,
  "assets/runtime/cursor-bridge-v1.mjs",
);

function cursorManifestFixture() {
  return {
    schema_version: 1,
    target: "cursor",
    adapter_id: "cursor.native",
    representation: "cursor-markdown",
    rows: [
      {
        role_id: "advisor",
        native_role_external_id: "maister-advisor",
      },
      {
        role_id: "code-reviewer",
        native_role_external_id: "maister-code-reviewer",
      },
      {
        role_id: "explore",
        native_role_external_id: "maister-explore",
      },
    ],
  };
}

function writePluginAgents(pluginRoot, names) {
  const agentsDir = path.join(pluginRoot, "agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  for (const name of names) {
    // Prefixed plugin leaves (maister-*.md); seed short dual-write leaves separately for prune tests.
    fs.writeFileSync(
      path.join(agentsDir, `${name}.md`),
      `---\nname: ${name}\ndescription: "fixture ${name}"\nmodel: inherit\n---\n\n# ${name}\n`,
      "utf8",
    );
  }
  fs.mkdirSync(path.join(pluginRoot, ".cursor-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(pluginRoot, ".cursor-plugin/plugin.json"),
    JSON.stringify({ name: "maister-cursor", agents: "./agents/" }, null, 2),
    "utf8",
  );
}

function seedShortAgentLeaves(agentsDir, shortBasenames, contentsByName = {}) {
  fs.mkdirSync(agentsDir, { recursive: true });
  for (const basename of shortBasenames) {
    fs.writeFileSync(
      path.join(agentsDir, basename),
      contentsByName[basename] ?? `PRIOR ${basename}\n`,
      "utf8",
    );
  }
}

test("Cursor plugin packages createMaisterAgentBridgeV1 at the distribution bridge path", async () => {
  assert.equal(
    fs.existsSync(PACKAGED_BRIDGE),
    true,
    `missing packaged Cursor bridge: ${PACKAGED_BRIDGE}`,
  );
  const mod = await import(pathToFileURL(PACKAGED_BRIDGE).href);
  assert.equal(typeof mod.createMaisterAgentBridgeV1, "function");
  const bridge = await mod.createMaisterAgentBridgeV1({
    schema_version: 1,
    operation: "evaluate_gate",
    target: "cursor",
    home: os.homedir(),
    state_root: path.join(os.tmpdir(), "maister-bridge-state"),
    working_root: REPO_ROOT,
    state_path: path.join(os.tmpdir(), "maister-bridge-state.yml"),
    plugin_source_root: path.join(os.homedir(), ".cursor/plugins/local/maister"),
  });
  assert.equal(bridge.schema_version, 1);
  assert.equal(bridge.target, "cursor");
  assert.equal(bridge.credentials_owner, "host");
  assert.equal(bridge.version_owner, "host");
  assert.ok(bridge.native_port);
  const inspect = await bridge.native_port.inspect({ schema_version: 1 });
  assert.equal(inspect.exact_launch, true);
  assert.equal(inspect.observable_identity, true);
  const launched = await bridge.native_port.launch({
    schema_version: 1,
    native_role_external_id: "maister-code-reviewer",
    task: { bounded_task: "smoke" },
  });
  assert.equal(launched.observed_native_role_external_id, "maister-code-reviewer");
});

test("Cursor overlay ships the bridge asset and requires it in inventory", () => {
  assert.equal(
    fs.existsSync(OVERLAY_BRIDGE_ASSET),
    true,
    `missing overlay bridge asset: ${OVERLAY_BRIDGE_ASSET}`,
  );
  const overlay = fs.readFileSync(path.join(CURSOR_OVERLAY, "overlay.yml"), "utf8");
  const inventory = fs.readFileSync(path.join(CURSOR_OVERLAY, "inventory.yml"), "utf8");
  assert.match(overlay, /runtime\/cursor-bridge-v1\.mjs|cursor-bridge-v1\.mjs/);
  assert.match(inventory, /cursor-bridge-v1\.mjs/);
  assert.match(overlay, /destination:.*cursor-bridge-v1\.mjs|runtime\/cursor-bridge-v1/);
});

test("probeCursor hybrid default discover observes maister-* names from plugin agents on disk", () => {
  const pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-cursor-plugin-"));
  const names = ["maister-advisor", "maister-code-reviewer", "maister-explore"];
  writePluginAgents(pluginRoot, names);
  const manifest = cursorManifestFixture();
  const result = probeCursor({
    clock: () => "2026-07-21T21:00:00.000Z",
    hostVersion: "1.0.0",
    provenance: {
      source_commit: "a".repeat(40),
      source_version: "2.2.1",
      overlay_id: "maister/cursor",
      overlay_version: "1.0.0",
      host: "cursor",
      scenario_version: "1.0.0",
      schema_version: 1,
      projector_version: "1.0.0",
      canonical_set_digest: "b".repeat(64),
      manifest_digest: "c".repeat(64),
      projected_tree_digest: "d".repeat(64),
    },
    manifest,
    pluginRoot,
    // Intentionally omit options.discover — hybrid default must kick in
  });
  const e5 = result.records.find((record) => record.capability === "E5");
  assert.ok(e5, "expected E5 record");
  assert.equal(
    e5.result,
    "passed",
    `expected hybrid discover to pass E5 from plugin agents on disk, got ${e5.result} (${e5.reason ?? e5.provenance?.reason ?? "no reason"})`,
  );
  assert.equal(e5.provenance.discovery_subject, "plugin-disk-agents");
  assert.match(e5.provenance.remediation ?? "", /not live Task/i);
});

test("install CLI accepts --agents-fallback for optional user/project agents dual-write", () => {
  const parsed = parseCliArgs([
    "install",
    "--target",
    "cursor",
    "--source",
    "local:/tmp/maister-src",
    "--home",
    "/tmp/maister-home",
    "--agents-fallback",
  ]);
  assert.equal(parsed.agentsFallback, true);
});

test("agents-fallback dual-write copies prefixed leaves into home and cwd destinations", async () => {
  const { maybeDualWriteCursorAgents } = await import(
    "../../plugins/maister/lib/distribution/cursor-agents-fallback.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-dual-write-"));
  const pluginRoot = path.join(root, "plugin");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  writePluginAgents(pluginRoot, ["maister-advisor", "maister-explore"]);

  const status = maybeDualWriteCursorAgents({
    target: "cursor",
    agentsFallback: true,
    activeRoot: pluginRoot,
    home,
    cwd,
  });
  assert.equal(status.attempted, true);
  assert.equal(status.ok, true);
  assert.equal(status.errors.length, 0);
  const homeAgents = path.join(home, ".cursor", "agents");
  const cwdAgents = path.join(cwd, ".cursor", "agents");
  assert.ok(status.destinations.includes(homeAgents));
  assert.ok(status.destinations.includes(cwdAgents));
  for (const dest of [homeAgents, cwdAgents]) {
    assert.match(fs.readFileSync(path.join(dest, "maister-advisor.md"), "utf8"), /maister-advisor/);
    assert.match(fs.readFileSync(path.join(dest, "maister-explore.md"), "utf8"), /maister-explore/);
  }
});

test("agents-fallback dual-write prunes allowlisted short leaves from both destinations", async () => {
  const { maybeDualWriteCursorAgents } = await import(
    "../../plugins/maister/lib/distribution/cursor-agents-fallback.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-dual-write-prune-"));
  const pluginRoot = path.join(root, "plugin");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  writePluginAgents(pluginRoot, ["maister-advisor", "maister-explore"]);
  const homeAgents = path.join(home, ".cursor", "agents");
  const cwdAgents = path.join(cwd, ".cursor", "agents");
  seedShortAgentLeaves(homeAgents, ["advisor.md", "explore.md"]);
  seedShortAgentLeaves(cwdAgents, ["advisor.md", "explore.md"]);

  const status = maybeDualWriteCursorAgents({
    target: "cursor",
    agentsFallback: true,
    activeRoot: pluginRoot,
    home,
    cwd,
  });
  assert.equal(status.ok, true);
  assert.equal(status.errors.length, 0);
  for (const dest of [homeAgents, cwdAgents]) {
    assert.equal(fs.existsSync(path.join(dest, "advisor.md")), false);
    assert.equal(fs.existsSync(path.join(dest, "explore.md")), false);
    assert.equal(fs.existsSync(path.join(dest, "maister-advisor.md")), true);
    assert.equal(fs.existsSync(path.join(dest, "maister-explore.md")), true);
  }
  assert.ok(Array.isArray(status.pruned));
  assert.ok(status.pruned.includes("advisor.md"));
  assert.ok(status.pruned.includes("explore.md"));
});

test("agents-fallback dual-write preserves operator-owned unrelated agent files", async () => {
  const { maybeDualWriteCursorAgents } = await import(
    "../../plugins/maister/lib/distribution/cursor-agents-fallback.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-dual-write-preserve-"));
  const pluginRoot = path.join(root, "plugin");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  writePluginAgents(pluginRoot, ["maister-advisor"]);
  const homeAgents = path.join(home, ".cursor", "agents");
  seedShortAgentLeaves(homeAgents, ["advisor.md", "my-custom-agent.md"], {
    "my-custom-agent.md": "OPERATOR OWNED\n",
  });

  const status = maybeDualWriteCursorAgents({
    target: "cursor",
    agentsFallback: true,
    activeRoot: pluginRoot,
    home,
    cwd,
  });
  assert.equal(status.ok, true);
  assert.equal(fs.existsSync(path.join(homeAgents, "advisor.md")), false);
  assert.equal(
    fs.readFileSync(path.join(homeAgents, "my-custom-agent.md"), "utf8"),
    "OPERATOR OWNED\n",
  );
  assert.ok(!status.pruned.includes("my-custom-agent.md"));
});

test("agents-fallback dual-write backs up allowlisted short leaves before prune (H1)", async () => {
  const { maybeDualWriteCursorAgents } = await import(
    "../../plugins/maister/lib/distribution/cursor-agents-fallback.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-dual-write-backup-"));
  const pluginRoot = path.join(root, "plugin");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  writePluginAgents(pluginRoot, ["maister-explore"]);
  const homeAgents = path.join(home, ".cursor", "agents");
  seedShortAgentLeaves(homeAgents, ["explore.md"], { "explore.md": "PRIOR SHORT\n" });

  const status = maybeDualWriteCursorAgents({
    target: "cursor",
    agentsFallback: true,
    activeRoot: pluginRoot,
    home,
    cwd,
  });
  assert.equal(status.ok, true);
  const backupPath = path.join(homeAgents, ".maister-backup", "explore.md");
  assert.equal(fs.existsSync(backupPath), true);
  assert.equal(fs.readFileSync(backupPath, "utf8"), "PRIOR SHORT\n");
  assert.equal(fs.existsSync(path.join(homeAgents, "explore.md")), false);
  assert.ok(status.backups.some((entry) => entry === backupPath || entry.endsWith(`${path.sep}.maister-backup${path.sep}explore.md`)));
});

test("agents-fallback dual-write reports prune I/O failure without throwing", async () => {
  const { maybeDualWriteCursorAgents } = await import(
    "../../plugins/maister/lib/distribution/cursor-agents-fallback.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-dual-write-prune-fail-"));
  const pluginRoot = path.join(root, "plugin");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  writePluginAgents(pluginRoot, ["maister-advisor"]);
  const homeAgents = path.join(home, ".cursor", "agents");
  seedShortAgentLeaves(homeAgents, ["advisor.md"]);
  // Block .maister-backup directory creation so prune backup fails after copy.
  fs.mkdirSync(homeAgents, { recursive: true });
  fs.writeFileSync(path.join(homeAgents, ".maister-backup"), "not-a-directory\n", "utf8");

  let thrown = null;
  let status;
  try {
    status = maybeDualWriteCursorAgents({
      target: "cursor",
      agentsFallback: true,
      activeRoot: pluginRoot,
      home,
      cwd,
    });
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown, null);
  assert.equal(status.attempted, true);
  assert.equal(status.ok, false);
  assert.ok(status.errors.some((entry) => entry.destination === homeAgents));
  // cwd still succeeds independently
  assert.equal(fs.existsSync(path.join(cwd, ".cursor", "agents", "maister-advisor.md")), true);
});

test("agents-fallback dual-write skips prune when fallback disabled or non-cursor", async () => {
  const { maybeDualWriteCursorAgents } = await import(
    "../../plugins/maister/lib/distribution/cursor-agents-fallback.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-dual-write-skip-"));
  const pluginRoot = path.join(root, "plugin");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  writePluginAgents(pluginRoot, ["maister-advisor"]);
  const homeAgents = path.join(home, ".cursor", "agents");
  seedShortAgentLeaves(homeAgents, ["advisor.md"]);

  const skippedFallback = maybeDualWriteCursorAgents({
    target: "cursor",
    agentsFallback: false,
    activeRoot: pluginRoot,
    home,
    cwd,
  });
  assert.equal(skippedFallback.attempted, false);
  assert.deepEqual(skippedFallback.pruned, []);
  assert.equal(fs.existsSync(path.join(homeAgents, "advisor.md")), true);

  const skippedTarget = maybeDualWriteCursorAgents({
    target: "codex",
    agentsFallback: true,
    activeRoot: pluginRoot,
    home,
    cwd,
  });
  assert.equal(skippedTarget.attempted, false);
  assert.deepEqual(skippedTarget.pruned, []);
  assert.equal(fs.existsSync(path.join(homeAgents, "advisor.md")), true);
});

test("Cursor verify success message includes reload guidance", async () => {
  const { successMessage } = await import("../../plugins/maister/bin/maister-install.mjs");
  const message = successMessage({ command: "verify", target: "cursor" });
  assert.match(message, /Reload or restart Cursor/i);
  assert.match(message, /Task/);
});
