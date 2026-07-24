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
const COMMANDS = ["bye", "dev", "next", "resume", "status", "work"];

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
		inventoryPath: path.join(
			ROOT,
			"plugins/maister/overlays/codex/inventory.yml",
		),
		stagingRoot,
		git: repositoryGit,
		sourceVersion: "1.2.3",
		hostVersion: "1.0.0",
	};
}

function readSkill(stagingRoot, command) {
	const filePath = path.join(stagingRoot, "skills", `maister-${command}`, "SKILL.md");
	const text = fs.readFileSync(filePath, "utf8");
	const match = /^---\n([\s\S]*?)\n---\n/u.exec(text);
	assert.ok(match, `${command} must have frontmatter`);
	return { filePath, text, frontmatter: parseCanonicalYaml(match[1]) };
}

test("materializes the six Codex lifecycle skills with deterministic safe contracts", async () => {
	const firstRoot = fs.mkdtempSync(
		path.join(os.tmpdir(), "maister-codex-utilities-one-"),
	);
	const secondRoot = fs.mkdtempSync(
		path.join(os.tmpdir(), "maister-codex-utilities-two-"),
	);
	const first = await materialize(productionOptions(firstRoot));
	const second = await materialize(productionOptions(secondRoot));

	for (const command of COMMANDS) {
		const skill = readSkill(firstRoot, command);
		assert.equal(skill.frontmatter.name, `maister-${command}`);
		assert.equal(fs.statSync(skill.filePath).mode & 0o777, 0o644);
		assert.doesNotMatch(
			skill.text,
			/(?:\.cursor-plugin|\.claude-plugin|\bclaude\b|\banthropic\b|\bcursor\b|\bpi\b)/iu,
		);
	}
	const skillDirectories = fs
		.readdirSync(path.join(firstRoot, "skills"), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
	assert.ok(skillDirectories.length > 0);
	assert.ok(skillDirectories.every((name) => /^maister-[a-z0-9-]+$/u.test(name)));
	assert.ok(skillDirectories.every((name) => !name.startsWith("maister-maister-")));
	const agentRoot = path.join(
		firstRoot,
		"skills",
		"maister-orchestrator-framework",
		"agents",
	);
	const agentFiles = fs
		.readdirSync(agentRoot)
		.filter((name) => name.endsWith(".md"))
		.sort();
	assert.ok(agentFiles.length > 0);
	assert.ok(agentFiles.every((name) => /^maister-[a-z0-9-]+\.md$/u.test(name)));

	const hookRoot = path.join(firstRoot, "hooks");
	const hookScripts = fs
		.readdirSync(hookRoot)
		.filter((name) => name.endsWith(".sh"))
		.sort();
	assert.deepEqual(hookScripts, [
		"maister-block-destructive-commands.sh",
		"maister-post-compact-reminder.sh",
		"maister-skill-invocation-reminder.sh",
	]);
	assert.ok(hookScripts.every((name) => !name.startsWith("maister-maister-")));
	const hooks = JSON.parse(fs.readFileSync(path.join(hookRoot, "hooks.json"), "utf8"));
	const hookCommands = Object.values(hooks.hooks)
		.flat()
		.flatMap((entry) => entry.hooks ?? [])
		.map((entry) => entry.command)
		.filter(Boolean);
	assert.ok(hookCommands.every((command) => /\/hooks\/maister-[a-z0-9-]+\.sh"$/u.test(command)));

	assert.match(readSkill(firstRoot, "dev").text, /\$maister:maister-development/u);
	assert.match(readSkill(firstRoot, "resume").text, /\$maister:maister-development/u);
	assert.match(readSkill(firstRoot, "resume").text, /--from=<phase>/u);
	assert.match(readSkill(firstRoot, "next").text, /Do not execute/u);
	assert.match(readSkill(firstRoot, "next").text, /top-level task state files/u);
	assert.match(readSkill(firstRoot, "next").text, /newest top-level task/u);
	assert.match(readSkill(firstRoot, "next").text, /Never prefer an older/u);
	assert.match(readSkill(firstRoot, "status").text, /Do not start or resume/u);
	assert.match(readSkill(firstRoot, "status").text, /top-level task state files/u);
	assert.match(readSkill(firstRoot, "status").text, /newest top-level task/u);
	assert.match(readSkill(firstRoot, "status").text, /Never prefer an older/u);
	assert.match(
		readSkill(firstRoot, "bye").text,
		/Do not mark an in-progress workflow as completed/u,
	);

	assert.equal(first.contentHash, second.contentHash);
	assert.equal(
		hashTree(firstRoot).contentHash,
		hashTree(secondRoot).contentHash,
	);
	assert.equal(first.validation.inventory.ok, true);
	assert.equal(first.validation.syntax.ok, true);
});

test("keeps native precedence explicit and unrelated collisions fail closed", () => {
	const root = fs.mkdtempSync(
		path.join(os.tmpdir(), "maister-codex-collision-matrix-"),
	);
	fs.mkdirSync(path.join(root, "common"), { recursive: true });
	fs.mkdirSync(path.join(root, "assets"), { recursive: true });
	fs.writeFileSync(path.join(root, "common", "lifecycle.md"), "common\n");
	fs.writeFileSync(path.join(root, "assets", "native.md"), "native\n");
	fs.writeFileSync(
		path.join(root, "assets", "second-native.md"),
		"second native\n",
	);

	const common = {
		source: "common/lifecycle.md",
		destination: "skills/maister-bye/SKILL.md",
		kind: "file",
		mode: "0644",
		ownership: "whole_file",
	};
	const native = {
		source: "assets/native.md",
		destination: "skills/maister-bye/SKILL.md",
		kind: "file",
		mode: "0644",
		ownership: "whole_file",
		native: true,
	};

	for (const layout of [
		[common, native],
		[native, common],
	]) {
		const plan = buildAssemblyPlan({ sourceRoot: root, overlay: { layout } });
		assert.equal(plan.length, 1);
		assert.equal(path.basename(plan[0].sourcePath), "native.md");
	}

	assert.throws(
		() =>
			buildAssemblyPlan({
				sourceRoot: root,
				overlay: { layout: [common, { ...native, native: false }] },
			}),
		(error) => error.code === "E_MATERIALIZE_COLLISION",
	);

	assert.throws(
		() =>
			buildAssemblyPlan({
				sourceRoot: root,
				overlay: {
					layout: [
						native,
						{ ...native, source: "assets/second-native.md", native: true },
					],
				},
			}),
		(error) => error.code === "E_MATERIALIZE_COLLISION",
	);
});
