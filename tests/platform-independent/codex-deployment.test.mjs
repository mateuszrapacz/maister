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
    assert.deepEqual(codex.calls.slice(0, 2).map((call) => call.slice(0, 4)), [
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
