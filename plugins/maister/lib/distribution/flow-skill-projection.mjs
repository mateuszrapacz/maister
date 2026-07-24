import fs from "node:fs";
import path from "node:path";

export const FLOW_SKILL_IDS = Object.freeze([
	"bye",
	"dev",
	"next",
	"resume",
	"status",
	"work",
]);

const FLOW_SKILL_SET = new Set(FLOW_SKILL_IDS);
const TARGET_SKILL_PATHS = Object.freeze({
	codex: (id) => `skills/maister-${id}/SKILL.md`,
	"kiro-cli": (id) => `skills/maister-${id}/SKILL.md`,
	pi: (id) => `skills/${id}/SKILL.md`,
	cursor: (id) => `skills/maister-${id}/SKILL.md`,
});

function replaceInvocation(value, target) {
	if (target === "codex") {
		return value.replace(/\/maister-([a-z0-9-]+)/gu, "$maister:maister-$1");
	}
	if (target === "kiro-cli") {
		return value.replace(/maister:([a-z0-9-]+)/gu, "maister-$1");
	}
	if (target === "pi") {
		return value.replace(/\/maister-([a-z0-9-]+)/gu, "/skill:maister-$1");
	}
	return value;
}

function adaptCodexFrontmatter(value) {
	return value.replace(/^user-invocable: true\n?/mu, "");
}

function adaptCursorFrontmatter(value, skillId) {
	return value.replace(`name: ${skillId}`, `name: maister-${skillId}`);
}

export function projectFlowSkillContent(content, { target, skillId } = {}) {
	if (typeof content !== "string" || !FLOW_SKILL_SET.has(skillId))
		return content;
	if (!Object.hasOwn(TARGET_SKILL_PATHS, target)) return content;
	const adapted = replaceInvocation(content, target);
	if (target === "codex") return adaptCodexFrontmatter(adapted);
	if (target === "cursor") return adaptCursorFrontmatter(adapted, skillId);
	return adapted;
}

export function adaptMaterializedFlowSkills(
	stagingRoot,
	target,
	{ canonicalSkillsRoot } = {},
) {
	const pathFor = TARGET_SKILL_PATHS[target];
	if (!pathFor) return { target, files: 0 };
	let files = 0;
	for (const skillId of FLOW_SKILL_IDS) {
		const relative = pathFor(skillId);
		const skillPath = path.join(stagingRoot, relative);
		if (!fs.existsSync(skillPath)) continue;
		const existing = fs.readFileSync(skillPath, "utf8");
		const canonicalPath =
			canonicalSkillsRoot &&
			path.join(canonicalSkillsRoot, skillId, "SKILL.md");
		const source =
			canonicalPath && fs.existsSync(canonicalPath)
				? fs.readFileSync(canonicalPath, "utf8")
				: existing;
		const projected = projectFlowSkillContent(source, { target, skillId });
		if (projected !== existing) fs.writeFileSync(skillPath, projected, "utf8");
		files += 1;
	}
	return { target, files };
}
