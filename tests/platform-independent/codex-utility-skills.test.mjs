import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { hashTree } from "../../plugins/maister/lib/distribution/hash-tree.mjs";
import {
  buildAssemblyPlan,
  materialize,
} from "../../plugins/maister/lib/distribution/materializer.mjs";
import { parseCanonicalYaml } from "../../plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const COMMANDS = ["bye", "dev", "next", "resume", "status"];

const repositoryGit = {
  topLevel: () => ROOT,
  head: () => COMMIT,
  status: () => [],
};

function productionOptions(stagingRoot) {
  return {
    source: `local:${ROOT}`,
    target: "codex",
    overlayPath: path.join(ROOT, "plugins/maister/overlays/codex/overlay.yml"),
    inventoryPath: path.join(ROOT, "plugins/maister/overlays/codex/inventory.yml"),
    stagingRoot,
    git: repositoryGit,
    sourceVersion: "1.2.3",
    hostVersion: "1.0.0",
  };
}

function readSkill(stagingRoot, command) {
  const filePath = path.join(stagingRoot, "skills", command, "SKILL.md");
  const text = fs.readFileSync(filePath, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/u.exec(text);
  assert.ok(match, `${command} must have frontmatter`);
  return { filePath, text, frontmatter: parseCanonicalYaml(match[1]) };
}

test("materializes the five Codex lifecycle skills with deterministic safe contracts", async () => {
  const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-utilities-one-"));
  const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-utilities-two-"));
  const first = await materialize(productionOptions(firstRoot));
  const second = await materialize(productionOptions(secondRoot));

  for (const command of COMMANDS) {
    const skill = readSkill(firstRoot, command);
    assert.equal(skill.frontmatter.name, command);
    assert.equal(fs.statSync(skill.filePath).mode & 0o777, 0o644);
    assert.doesNotMatch(skill.text, /(?:\.cursor-plugin|\.claude-plugin|\bclaude\b|\banthropic\b|\bcursor\b|\bpi\b)/iu);
  }

  assert.match(readSkill(firstRoot, "dev").text, /\$maister:development/u);
  assert.match(readSkill(firstRoot, "resume").text, /\$maister:development/u);
  assert.match(readSkill(firstRoot, "resume").text, /--from=<phase>/u);
  assert.match(readSkill(firstRoot, "next").text, /Do not execute/u);
  assert.match(readSkill(firstRoot, "status").text, /Do not start or resume/u);
  assert.match(readSkill(firstRoot, "bye").text, /Do not mark an in-progress workflow as completed/u);

  assert.equal(first.contentHash, second.contentHash);
  assert.equal(hashTree(firstRoot).contentHash, hashTree(secondRoot).contentHash);
  assert.equal(first.validation.inventory.ok, true);
  assert.equal(first.validation.syntax.ok, true);
});

test("keeps native precedence explicit and unrelated collisions fail closed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-codex-collision-matrix-"));
  fs.mkdirSync(path.join(root, "common"), { recursive: true });
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.writeFileSync(path.join(root, "common", "lifecycle.md"), "common\n");
  fs.writeFileSync(path.join(root, "assets", "native.md"), "native\n");
  fs.writeFileSync(path.join(root, "assets", "second-native.md"), "second native\n");

  const common = {
    source: "common/lifecycle.md",
    destination: "skills/bye/SKILL.md",
    kind: "file",
    mode: "0644",
    ownership: "whole_file",
  };
  const native = {
    source: "assets/native.md",
    destination: "skills/bye/SKILL.md",
    kind: "file",
    mode: "0644",
    ownership: "whole_file",
    native: true,
  };

  for (const layout of [[common, native], [native, common]]) {
    const plan = buildAssemblyPlan({ sourceRoot: root, overlay: { layout } });
    assert.equal(plan.length, 1);
    assert.equal(path.basename(plan[0].sourcePath), "native.md");
  }

  assert.throws(
    () => buildAssemblyPlan({
      sourceRoot: root,
      overlay: { layout: [common, { ...native, native: false }] },
    }),
    (error) => error.code === "E_MATERIALIZE_COLLISION",
  );

  assert.throws(
    () => buildAssemblyPlan({
      sourceRoot: root,
      overlay: {
        layout: [native, { ...native, source: "assets/second-native.md", native: true }],
      },
    }),
    (error) => error.code === "E_MATERIALIZE_COLLISION",
  );
});
