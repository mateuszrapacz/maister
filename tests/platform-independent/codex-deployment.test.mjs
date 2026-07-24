import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import nodeTest from "node:test";

import {
  attachCodexDeployment,
  detachCodexDeployment,
  installPreparedCodexDeployment,
  prepareCodexDeployment,
  removeCodexDeployment,
  verifyCodexDeployment,
} from "../../plugins/maister/lib/distribution/codex-deployment.mjs";
import { getTargetPaths } from "../../plugins/maister/lib/distribution/target-paths.mjs";

const test = nodeTest;

function pathsFor(root) {
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  return getTargetPaths({
    target: "codex",
    home,
    env: { XDG_STATE_HOME: state },
  });
}

function activePlugin(paths) {
  fs.mkdirSync(path.join(paths.activeRoot, ".codex-plugin"), { recursive: true });
  fs.writeFileSync(path.join(paths.activeRoot, ".codex-plugin/plugin.json"), `${JSON.stringify({
    name: "maister",
    version: "2.2.1-fork.1",
  })}\n`);
  fs.mkdirSync(path.join(paths.activeRoot, "skills/research"), { recursive: true });
  fs.writeFileSync(path.join(paths.activeRoot, "skills/research/SKILL.md"), "---\nname: research\n---\n");
}

function fakeCodex(paths, { failPluginAdd = false, omitSourcePath = false } = {}) {
  const calls = [];
  const installedPath = path.join(paths.home, "codex-cache/maister/2.2.1-fork.1");
  let sourcePath = null;
  let installed = false;
  let installedPluginId = null;
  const run = (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === "plugin" && args[1] === "add") {
      if (failPluginAdd) return { status: 1, stdout: "", stderr: "plugin rejected" };
      installed = true;
      installedPluginId = args[2];
      return { status: 0, stdout: JSON.stringify({ installedPath }), stderr: "" };
    }
    if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "add") {
      sourcePath = path.join(args[3], "plugins/maister");
      return { status: 0, stdout: "{}", stderr: "" };
    }
    if (args[0] === "plugin" && args[1] === "list") {
      return {
        status: 0,
        stdout: JSON.stringify({
          installed: installed ? [{
            pluginId: installedPluginId,
            name: "maister",
            installed: true,
            enabled: true,
            source: omitSourcePath ? {} : { path: sourcePath },
          }] : [],
          available: [],
        }),
        stderr: "",
      };
    }
    if (args[0] === "plugin" && args[1] === "remove") {
      installed = false;
      return { status: 0, stdout: "{}", stderr: "" };
    }
    return { status: 0, stdout: "{}", stderr: "" };
  };
  return { calls, run, installedPath };
}

test("Codex native deployment materializes a private marketplace and registers the plugin", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const codex = fakeCodex(paths);
    const prepared = prepareCodexDeployment({ paths, deploymentId: "11111111-1111-4111-8111-111111111111" });
    const marketplace = JSON.parse(fs.readFileSync(path.join(prepared.marketplace_root, ".agents/plugins/marketplace.json"), "utf8"));

    assert.equal(marketplace.name, prepared.marketplace_name);
    assert.equal(marketplace.plugins[0].source.path, "./plugins/maister");
    assert.equal(fs.existsSync(path.join(prepared.plugin_root, ".codex-plugin/plugin.json")), true);

    const installed = installPreparedCodexDeployment({ deployment: prepared, run: codex.run });
    assert.equal(installed.installed_path, codex.installedPath);
    assert.equal(verifyCodexDeployment({ deployment: installed, run: codex.run }), true);
    fs.appendFileSync(path.join(installed.plugin_root, "skills/research/SKILL.md"), "drift\n");
    assert.throws(
      () => verifyCodexDeployment({ deployment: installed, run: codex.run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT",
    );
    assert.deepEqual(codex.calls.filter((call) => call[2] !== "list").slice(0, 2).map((call) => call.slice(0, 4)), [
      ["codex", "plugin", "marketplace", "add"],
      ["codex", "plugin", "add", prepared.plugin_id],
    ]);

    detachCodexDeployment({ deployment: installed, run: codex.run });
    attachCodexDeployment({ deployment: installed, run: codex.run });
    removeCodexDeployment({ deployment: installed, run: codex.run });
    assert.equal(fs.existsSync(prepared.marketplace_root), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex native deployment rejects an enabled same-name plugin before registration", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-collision-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const codex = fakeCodex(paths);
    const prepared = prepareCodexDeployment({ paths, deploymentId: "44444444-4444-4444-8444-444444444444" });
    const calls = [];
    const run = (command, args, options) => {
      calls.push([command, ...args]);
      if (args[0] === "plugin" && args[1] === "list") {
        return {
          status: 0,
          stdout: JSON.stringify({
            installed: [{
              pluginId: "maister@foreign-marketplace",
              name: "maister",
              installed: true,
              enabled: true,
              source: { path: "/tmp/foreign-maister/plugins/maister" },
            }],
            available: [],
          }),
          stderr: "",
        };
      }
      return codex.run(command, args, options);
    };

    assert.throws(
      () => installPreparedCodexDeployment({ deployment: prepared, run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT"
        && error.details?.collisions?.some((collision) => collision.plugin_id === "maister@foreign-marketplace"),
    );
    assert.equal(calls.some((call) => call[1] === "plugin" && call[2] === "add"), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex native deployment fails closed when the plugin registry shape is invalid", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-invalid-registry-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const codex = fakeCodex(paths);
    const prepared = prepareCodexDeployment({ paths, deploymentId: "88888888-8888-4888-8888-888888888888" });
    const calls = [];
    const run = (command, args, options) => {
      calls.push([command, ...args]);
      if (args[0] === "plugin" && args[1] === "list") {
        return { status: 0, stdout: JSON.stringify({ available: [] }), stderr: "" };
      }
      return codex.run(command, args, options);
    };

    assert.throws(
      () => installPreparedCodexDeployment({ deployment: prepared, run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT"
        && error.details?.installed === null,
    );
    assert.equal(calls.some((call) => call[1] === "plugin" && call[2] === "add"), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex native deployment allows only the explicitly previous receipt during replacement", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-update-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const prepared = prepareCodexDeployment({ paths, deploymentId: "55555555-5555-4555-8555-555555555555" });
    const previousPluginId = "maister@previous-receipt";
    let registered = false;
    const calls = [];
    const run = (command, args) => {
      calls.push([command, ...args]);
      if (args[0] === "plugin" && args[1] === "list") {
        const installed = [{
          pluginId: previousPluginId,
          name: "maister",
          installed: true,
          enabled: true,
          source: { path: "/tmp/previous-receipt/plugins/maister" },
        }];
        if (registered) installed.push({
          pluginId: prepared.plugin_id,
          name: "maister",
          installed: true,
          enabled: true,
          source: { path: prepared.plugin_root },
        });
        return { status: 0, stdout: JSON.stringify({ installed, available: [] }), stderr: "" };
      }
      if (args[0] === "plugin" && args[1] === "add") {
        registered = true;
        return { status: 0, stdout: JSON.stringify({ installedPath: path.join(paths.home, "codex-cache/maister/update") }), stderr: "" };
      }
      return { status: 0, stdout: "{}", stderr: "" };
    };

    const installed = installPreparedCodexDeployment({
      deployment: prepared,
      run,
      allowedPluginIds: [previousPluginId],
    });
    assert.equal(installed.plugin_id, prepared.plugin_id);
    assert.equal(verifyCodexDeployment({
      deployment: installed,
      run,
      allowedPluginIds: [previousPluginId],
    }), true);
    assert.equal(calls.some((call) => call[1] === "plugin" && call[2] === "marketplace" && call[3] === "add"), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex deployment verification rejects a foreign same-name plugin", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-verify-collision-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const prepared = prepareCodexDeployment({ paths, deploymentId: "66666666-6666-4666-8666-666666666666" });
    const run = (command, args) => {
      if (args[0] === "plugin" && args[1] === "list") {
        return {
          status: 0,
          stdout: JSON.stringify({
            installed: [
              { pluginId: prepared.plugin_id, name: "maister", installed: true, enabled: true, source: { path: prepared.plugin_root } },
              { pluginId: "maister@foreign-marketplace", name: "maister", installed: true, enabled: true, source: { path: "/tmp/foreign/plugins/maister" } },
            ],
            available: [],
          }),
          stderr: "",
        };
      }
      return { status: 0, stdout: "{}", stderr: "" };
    };

    assert.throws(
      () => verifyCodexDeployment({ deployment: prepared, run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT"
        && error.details?.collisions?.some((collision) => collision.plugin_id === "maister@foreign-marketplace"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex native deployment attach rejects a foreign same-name plugin before registration", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-attach-collision-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const prepared = prepareCodexDeployment({ paths, deploymentId: "77777777-7777-4777-8777-777777777777" });
    const calls = [];
    const run = (command, args) => {
      calls.push([command, ...args]);
      if (args[0] === "plugin" && args[1] === "list") {
        return {
          status: 0,
          stdout: JSON.stringify({
            installed: [{
              pluginId: "maister@foreign-marketplace",
              name: "maister",
              installed: true,
              enabled: true,
              source: { path: "/tmp/foreign-maister/plugins/maister" },
            }],
            available: [],
          }),
          stderr: "",
        };
      }
      return { status: 0, stdout: "{}", stderr: "" };
    };

    assert.throws(
      () => attachCodexDeployment({ deployment: prepared, run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT"
        && error.details?.collisions?.some((collision) => collision.plugin_id === "maister@foreign-marketplace"),
    );
    assert.equal(calls.some((call) => call[1] === "plugin" && call[2] === "marketplace"), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex native deployment cleans its generated marketplace when plugin registration fails", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-failure-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const codex = fakeCodex(paths, { failPluginAdd: true });
    const prepared = prepareCodexDeployment({ paths, deploymentId: "22222222-2222-4222-8222-222222222222" });

    assert.throws(
      () => installPreparedCodexDeployment({ deployment: prepared, run: codex.run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT",
    );
    removeCodexDeployment({ deployment: prepared, run: codex.run });
    assert.equal(fs.existsSync(prepared.marketplace_root), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex native deployment rejects missing source binding and invalid preparation inputs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-deployment-validation-"));
  try {
    const paths = pathsFor(root);
    activePlugin(paths);
    const codex = fakeCodex(paths, { omitSourcePath: true });
    const prepared = prepareCodexDeployment({ paths, deploymentId: "33333333-3333-4333-8333-333333333333" });
    const installed = installPreparedCodexDeployment({ deployment: prepared, run: codex.run });

    assert.throws(
      () => verifyCodexDeployment({ deployment: installed, run: codex.run }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT",
    );
    assert.throws(
      () => prepareCodexDeployment({ paths: null, deploymentId: "33333333-3333-4333-8333-333333333333" }),
      (error) => error?.kind === "E_CODEX_DEPLOYMENT",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Codex skills do not carry the unsupported disable-model-invocation frontmatter", () => {
  const root = path.resolve(import.meta.dirname, "../../plugins/maister/skills");
  const offenders = [];
  const visit = (directory) => {
    for (const name of fs.readdirSync(directory)) {
      const candidate = path.join(directory, name);
      const stat = fs.lstatSync(candidate);
      if (stat.isDirectory()) visit(candidate);
      else if (name === "SKILL.md" && /disable-model-invocation:\s*true/u.test(fs.readFileSync(candidate, "utf8"))) offenders.push(candidate);
    }
  };
  visit(root);
  assert.deepEqual(offenders, []);
});

test("Codex skill frontmatter keeps the Maister resource prefix", () => {
  const root = path.resolve(import.meta.dirname, "../../plugins/maister/skills");
  const mismatches = [];
  const visit = (directory) => {
    for (const name of fs.readdirSync(directory)) {
      const candidate = path.join(directory, name);
      const stat = fs.lstatSync(candidate);
      if (stat.isDirectory()) visit(candidate);
      else if (name === "SKILL.md") {
        const content = fs.readFileSync(candidate, "utf8");
        const frontmatterName = /^name:\s*(\S+)$/mu.exec(content)?.[1];
		const expectedName = `maister-${path.basename(path.dirname(candidate))}`;
		if (frontmatterName !== expectedName || frontmatterName.startsWith("maister:maister-")) {
          mismatches.push({ path: candidate, frontmatterName, expectedName });
        }
      }
    }
  };
  visit(root);
  assert.deepEqual(mismatches, []);
});
