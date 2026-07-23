import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	adaptMaterializedFlowSkills,
	FLOW_SKILL_IDS,
	projectFlowSkillContent,
} from "../../plugins/maister/lib/distribution/flow-skill-projection.mjs";
import { materialize } from "../../plugins/maister/lib/distribution/materializer.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

function canonicalSkill(skillId) {
	return fs.readFileSync(
		path.join(ROOT, "plugins/maister/skills", skillId, "SKILL.md"),
		"utf8",
	);
}

function frontmatterName(content) {
	return /^name:\s*(\S+)$/mu.exec(content)?.[1];
}

test("projects the shared flow skill set into each host command vocabulary", () => {
	for (const target of ["codex", "cursor", "kiro-cli", "pi"]) {
		for (const skillId of FLOW_SKILL_IDS) {
			const projected = projectFlowSkillContent(canonicalSkill(skillId), {
				target,
				skillId,
			});
			assert.equal(
				frontmatterName(projected),
				target === "codex" ? skillId : `maister-${skillId}`,
			);
			assert.doesNotMatch(projected, /(^|\s)\/(?:work|dev)\b/u);
		}
	}

	const codex = projectFlowSkillContent(canonicalSkill("work"), {
		target: "codex",
		skillId: "work",
	});
	assert.match(codex, /\$maister:work/u);
	assert.match(codex, /maister:task-classifier/u);
	assert.doesNotMatch(codex, /^user-invocable:/mu);

	const kiro = projectFlowSkillContent(canonicalSkill("work"), {
		target: "kiro-cli",
		skillId: "work",
	});
	assert.match(kiro, /\/maister-work/u);
	assert.match(kiro, /maister-task-classifier/u);

	const pi = projectFlowSkillContent(canonicalSkill("resume"), {
		target: "pi",
		skillId: "resume",
	});
	assert.match(pi, /\/skill:maister-development/u);

	const cursor = projectFlowSkillContent(canonicalSkill("work"), {
		target: "cursor",
		skillId: "work",
	});
	assert.match(cursor, /\/maister-work/u);
	assert.doesNotMatch(cursor, /`\/work`/u);
});

test("materializes Cursor flow skills from the canonical source", async () => {
	const root = fs.mkdtempSync(
		path.join(os.tmpdir(), "maister-cursor-flow-skills-"),
	);
	try {
		await materialize({
			source: `local:${ROOT}`,
			target: "cursor",
			overlayPath: path.join(
				ROOT,
				"plugins/maister/overlays/cursor/overlay.yml",
			),
			inventoryPath: path.join(
				ROOT,
				"plugins/maister/overlays/cursor/inventory.yml",
			),
			stagingRoot: path.join(root, "stage"),
			git: {
				topLevel: () => ROOT,
				head: () => "0123456789abcdef0123456789abcdef01234567",
				status: () => [],
			},
			sourceVersion: "1.2.3",
			hostVersion: "1.0.0",
		});
		for (const skillId of FLOW_SKILL_IDS) {
			const actual = fs.readFileSync(
				path.join(root, "stage", "skills", `maister-${skillId}`, "SKILL.md"),
				"utf8",
			);
			assert.equal(
				actual,
				projectFlowSkillContent(canonicalSkill(skillId), {
					target: "cursor",
					skillId,
				}),
			);
		}
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test("adapts materialized flow skill paths without host-owned source copies", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-flow-skills-"));
	try {
		for (const [target, directory] of [
			["codex", ""],
			["cursor", "maister-"],
			["kiro-cli", "maister-"],
			["pi", ""],
		]) {
			const targetRoot = path.join(root, target);
			for (const skillId of FLOW_SKILL_IDS) {
				const skillPath = path.join(
					targetRoot,
					"skills",
					`${directory}${skillId}`,
					"SKILL.md",
				);
				fs.mkdirSync(path.dirname(skillPath), { recursive: true });
				fs.writeFileSync(skillPath, canonicalSkill(skillId));
			}
			const canonicalSkillsRoot = path.join(targetRoot, "canonical-skills");
			for (const skillId of FLOW_SKILL_IDS) {
				const canonicalPath = path.join(
					canonicalSkillsRoot,
					skillId,
					"SKILL.md",
				);
				fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
				fs.writeFileSync(canonicalPath, canonicalSkill(skillId));
			}
			assert.deepEqual(
				adaptMaterializedFlowSkills(targetRoot, target, {
					canonicalSkillsRoot,
				}),
				{ target, files: FLOW_SKILL_IDS.length },
			);
			assert.equal(
				frontmatterName(
					fs.readFileSync(
						path.join(targetRoot, "skills", `${directory}bye`, "SKILL.md"),
						"utf8",
					),
				),
				target === "codex" ? "bye" : "maister-bye",
			);
		}
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
