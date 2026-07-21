#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { loadCanonicalAgentIr } from "../lib/distribution/agent-ir.mjs";
import {
  buildAgentManifest,
  loadAgentProjectionContract,
} from "../lib/distribution/agent-manifest.mjs";
import { projectAgents } from "../lib/distribution/agent-projector.mjs";
import { loadOverlay } from "../lib/distribution/overlay-loader.mjs";

const TARGETS = ["codex", "cursor", "kiro-cli", "pi"];

function parseArguments(argumentsList) {
  const options = { check: false, targets: [] };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`unexpected argument: ${argument}`);
    const separator = argument.indexOf("=");
    const key = separator >= 0 ? argument.slice(2, separator) : argument.slice(2);
    const value = separator >= 0 ? argument.slice(separator + 1) : argumentsList[++index];
    if (key === "repository-root") options.repositoryRoot = value;
    else if (key === "target") options.targets.push(value);
    else throw new Error(`unexpected argument: --${key}`);
  }
  if (!options.check) throw new Error("project-agents currently requires --check");
  if (options.targets.some((target) => !TARGETS.includes(target))) {
    throw new Error(`--target must be one of: ${TARGETS.join(", ")}`);
  }
  return options;
}

function loadSupportAssets(pluginRoot, manifest, target) {
  const overlayRoot = path.join(pluginRoot, "overlays", target);
  return manifest.support_inventory
    .filter((support) => support.target === target)
    .flatMap((support) => support.assets.map((asset) => ({
      support_id: support.support_id,
      kind: asset.kind,
      source: asset.source,
      destination: asset.destination,
      mode: asset.mode,
      content: fs.readFileSync(path.join(overlayRoot, asset.source), "utf8"),
    })));
}

function assertNoCheckedInBehaviorCopies(pluginRoot) {
  for (const target of ["cursor", "kiro-cli"]) {
    const legacyRoot = path.join(pluginRoot, "overlays", target, "assets", "agents");
    const legacyFiles = fs.existsSync(legacyRoot)
      ? fs.readdirSync(legacyRoot, { recursive: true }).filter((entry) => fs.statSync(path.join(legacyRoot, entry)).isFile())
      : [];
    if (legacyFiles.length > 0) {
      const error = new Error(`checked-in canonical behavior root remains: ${legacyRoot}`);
      error.code = "E_AGENT_PROJECTION_DRIFT";
      throw error;
    }
  }
}

function executeCheck({ repositoryRoot, targets }) {
  const pluginRoot = path.join(repositoryRoot, "plugins/maister");
  const projectionContract = loadAgentProjectionContract({
    projectionPath: path.join(pluginRoot, "agent-projection-v1.json"),
  });
  const agentIr = loadCanonicalAgentIr({
    agentsRoot: path.join(pluginRoot, "agents"),
    skillsRoot: path.join(pluginRoot, "skills"),
    expectedRoleIds: projectionContract.expected_role_ids,
  });
  const selectedTargets = targets.length > 0 ? targets : TARGETS;
  const overlays = Object.fromEntries(TARGETS.map((target) => {
    const overlayRoot = path.join(pluginRoot, "overlays", target);
    return [target, loadOverlay({
      overlayPath: path.join(overlayRoot, "overlay.yml"),
      inventoryPath: path.join(overlayRoot, "inventory.yml"),
    }).overlay];
  }));
  const manifest = buildAgentManifest({ agentIr, projectionContract, overlays });
  assertNoCheckedInBehaviorCopies(pluginRoot);

  const isolatedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-agent-projection-check-"));
  try {
    const results = [];
    for (const target of selectedTargets) {
      const supportAssets = loadSupportAssets(pluginRoot, manifest, target);
      const firstRoot = path.join(isolatedRoot, `${target}-first`);
      const secondRoot = path.join(isolatedRoot, `${target}-second`);
      fs.mkdirSync(firstRoot, { mode: 0o755 });
      fs.mkdirSync(secondRoot, { mode: 0o755 });
      const first = projectAgents({ agentIr, manifest, target, stagingRoot: firstRoot, supportAssets });
      const second = projectAgents({ agentIr, manifest, target, stagingRoot: secondRoot, supportAssets });
      if (JSON.stringify(first) !== JSON.stringify(second)) {
        const error = new Error(`independent ${target} projections differ`);
        error.code = "E_AGENT_PROJECTION_DRIFT";
        throw error;
      }
      results.push({
        target,
        canonical_roles: first.canonical_role_ids.length,
        support_roles: first.support_inventory.length,
        outputs: first.outputs.length,
        manifest_digest: first.manifest_digest,
        projected_tree_digest: first.projected_tree_digest,
      });
    }
    return { ok: true, schema_version: 1, targets: results };
  } finally {
    fs.rmSync(isolatedRoot, { recursive: true, force: true });
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  process.stdout.write(`${JSON.stringify(executeCheck({ ...options, repositoryRoot }), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: {
      code: error.code ?? "E_AGENT_PROJECTION_FAILED",
      message: error.message,
      details: error.details ?? {},
    },
  }, null, 2)}\n`);
  process.exitCode = 2;
}
