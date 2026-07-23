import { createHash } from "node:crypto";
import {
	chmod,
	mkdir,
	readFile,
	readdir,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
	".md",
	".mdc",
	".json",
	".sh",
	".yml",
	".yaml",
]);

const TODO_TARGETS = new Set([
	"maister-development",
	"maister-init",
	"maister-migration",
	"maister-performance",
	"maister-product-design",
	"maister-research",
	"maister-standards-discover",
]);

const LOGICAL_ROLE_IDS = new Set([
	"advisor",
	"bottleneck-analyzer",
	"code-quality-pragmatist",
	"code-reviewer",
	"codebase-analysis-reporter",
	"docs-operator",
	"e2e-test-verifier",
	"gap-analyzer",
	"html-companion-writer",
	"implementation-completeness-checker",
	"implementation-planner",
	"information-gatherer",
	"production-readiness-checker",
	"project-analyzer",
	"reality-assessor",
	"research-planner",
	"research-synthesizer",
	"solution-brainstormer",
	"solution-designer",
	"spec-auditor",
	"specification-creator",
	"task-classifier",
	"task-group-implementer",
	"test-suite-runner",
	"thermo-nuclear-code-quality-review-subagent",
	"thermo-nuclear-review-subagent",
	"ui-mockup-generator",
	"user-docs-generator",
]);

const SKILL_REFERENCE_REPLACEMENTS = [
	['skill: "requirements-critic"', 'skill: "maister-requirements-critic"'],
	['skill: "transcript-critic"', 'skill: "maister-transcript-critic"'],
	['skill: "problem-classifier"', 'skill: "maister-problem-classifier"'],
	[
		'skill: "test-strategy-reviewer"',
		'skill: "maister-test-strategy-reviewer"',
	],
	[
		'skill: "linguistic-boundary-verifier"',
		'skill: "maister-linguistic-boundary-verifier"',
	],
	[
		'skill: "metaprogram-classifier"',
		'skill: "maister-metaprogram-classifier"',
	],
	['skill: "context-distiller"', 'skill: "maister-context-distiller"'],
	['skill: "aggregate-designer"', 'skill: "maister-aggregate-designer"'],
	['skill: "codebase-analyzer"', 'skill: "maister-codebase-analyzer"'],
	[
		'skill: "implementation-plan-executor"',
		'skill: "maister-implementation-plan-executor"',
	],
	[
		'skill: "implementation-verifier"',
		'skill: "maister-implementation-verifier"',
	],
	['skill: "docs-manager"', 'skill: "maister-docs-manager"'],
	['skill: "quick-dev"', 'skill: "maister-quick-dev"'],
	['skill: "quick-plan"', 'skill: "maister-quick-plan"'],
	['skill: "quick-bugfix"', 'skill: "maister-quick-bugfix"'],
	["skill `requirements-critic`", "skill `maister-requirements-critic`"],
	["skill `transcript-critic`", "skill `maister-transcript-critic`"],
	["skill `problem-classifier`", "skill `maister-problem-classifier`"],
	["skill `test-strategy-reviewer`", "skill `maister-test-strategy-reviewer`"],
	[
		"skill `linguistic-boundary-verifier`",
		"skill `maister-linguistic-boundary-verifier`",
	],
	["skill `metaprogram-classifier`", "skill `maister-metaprogram-classifier`"],
	["skill `context-distiller`", "skill `maister-context-distiller`"],
	["skill `aggregate-designer`", "skill `maister-aggregate-designer`"],
	[
		"Invoke the `requirements-critic` skill",
		"Invoke the `maister-requirements-critic` skill",
	],
	[
		"Invoke the `transcript-critic` skill",
		"Invoke the `maister-transcript-critic` skill",
	],
	[
		"Invoke the `problem-classifier` skill",
		"Invoke the `maister-problem-classifier` skill",
	],
	[
		"Invoke the `test-strategy-reviewer` skill",
		"Invoke the `maister-test-strategy-reviewer` skill",
	],
	[
		"Invoke the `linguistic-boundary-verifier` skill",
		"Invoke the `maister-linguistic-boundary-verifier` skill",
	],
	[
		"Invoke the `metaprogram-classifier` skill",
		"Invoke the `maister-metaprogram-classifier` skill",
	],
	[
		"Invoke the `context-distiller` skill",
		"Invoke the `maister-context-distiller` skill",
	],
	[
		"Invoke the `aggregate-designer` skill",
		"Invoke the `maister-aggregate-designer` skill",
	],
	["run `test-strategy-reviewer`", "run `maister-test-strategy-reviewer`"],
	[
		"run `linguistic-boundary-verifier`",
		"run `maister-linguistic-boundary-verifier`",
	],
	["run `metaprogram-classifier`", "run `maister-metaprogram-classifier`"],
	["run `grill-me`", "run `maister-grill-me`"],
	["run `grill-with-docs`", "run `maister-grill-with-docs`"],
	["`grill-with-docs`", "`maister-grill-with-docs`"],
	["`grill-me`", "`maister-grill-me`"],
	["`context-distiller`", "`maister-context-distiller`"],
	["`aggregate-designer`", "`maister-aggregate-designer`"],
	["`linguistic-boundary-verifier`", "`maister-linguistic-boundary-verifier`"],
	["run `problem-classifier`", "run `maister-problem-classifier`"],
	["run `context-distiller`", "run `maister-context-distiller`"],
	["run `aggregate-designer`", "run `maister-aggregate-designer`"],
	["run `thermos`", "run `maister-thermos`"],
	["/maister:standards-discover", "/maister-standards-discover"],
	["/maister:standards-update", "/maister-standards-update"],
	["/maister:init", "/maister-init"],
	["standards-discover skill", "maister-standards-discover skill"],
	["standards-update skill", "maister-standards-update skill"],
];

const TODO_REPLACEMENTS = [
	["TaskCreate", "TodoWrite"],
	["TaskUpdate", "TodoWrite"],
	["addBlockedBy", "ordering in todos array (merge: true)"],
	["activeForm", "activity description in content"],
	["metadata: {skipped: true}", 'status: "cancelled"'],
	["Task system", "Todo list"],
	["Task tracking", "Todo tracking"],
	["Create Task Items", "Create Todo Items"],
	["task items", "todo items"],
	["Create task items", "Create todo items via TodoWrite"],
	["Restore task items", "Restore todo items via TodoWrite"],
	["Task Progress", "Todo Progress"],
	["TaskCreate/TaskUpdate", "TodoWrite"],
];

function replaceAllLiteral(value, from, to) {
	return value.split(from).join(to);
}

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function validateCommandMappings(commandMappings) {
	if (!Array.isArray(commandMappings)) {
		throw new Error(
			"Cursor skill projection manifest must declare command_mappings",
		);
	}

	const sources = new Set();
	const targets = new Set();
	for (const mapping of commandMappings) {
		const keys = Object.keys(mapping).sort();
		if (
			JSON.stringify(keys) !==
			JSON.stringify(["source", "source_sha256", "target"])
		) {
			throw new Error(
				"Each command mapping must declare only source, target, and source_sha256",
			);
		}
		if (
			!/^plugins\/maister\/commands\/[a-z][a-z0-9-]*\.md$/u.test(mapping.source)
		) {
			throw new Error(`Invalid canonical command source: ${mapping.source}`);
		}
		if (!/^maister-[a-z][a-z0-9-]*\/SKILL\.md$/u.test(mapping.target)) {
			throw new Error(`Invalid Cursor command target: ${mapping.target}`);
		}
		if (!/^[a-f0-9]{64}$/u.test(mapping.source_sha256)) {
			throw new Error(`Invalid canonical command digest for ${mapping.source}`);
		}
		if (sources.has(mapping.source))
			throw new Error(`Duplicate canonical command source: ${mapping.source}`);
		if (targets.has(mapping.target))
			throw new Error(`Duplicate Cursor command target: ${mapping.target}`);
		sources.add(mapping.source);
		targets.add(mapping.target);
	}

	const sortedSources = [...sources].sort();
	if (JSON.stringify([...sources]) !== JSON.stringify(sortedSources)) {
		throw new Error("Canonical command mappings must be sorted by source");
	}
}

function validatePreservedExceptions(preservedExceptions) {
	if (!Array.isArray(preservedExceptions)) {
		throw new Error(
			"Cursor skill projection manifest must declare preserved_exceptions",
		);
	}

	const targets = new Set();
	for (const exception of preservedExceptions) {
		const keys = Object.keys(exception).sort();
		const expectedKeys = [
			"mapping_rationale",
			"mode",
			"sha256",
			"source",
			"target",
		];
		if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
			throw new Error(
				"Each preserved exception must declare only target, source, mapping_rationale, sha256, and mode",
			);
		}
		if (!/^maister-[a-z][a-z0-9-]*\/SKILL\.md$/u.test(exception.target)) {
			throw new Error(
				`Invalid preserved exception target: ${exception.target}`,
			);
		}
		if (typeof exception.source !== "string" || exception.source.length === 0) {
			throw new Error(
				`Invalid preserved exception source for ${exception.target}`,
			);
		}
		if (
			typeof exception.mapping_rationale !== "string" ||
			exception.mapping_rationale.length === 0
		) {
			throw new Error(
				`Invalid preserved exception rationale for ${exception.target}`,
			);
		}
		if (!/^[a-f0-9]{64}$/u.test(exception.sha256)) {
			throw new Error(
				`Invalid preserved exception digest for ${exception.target}`,
			);
		}
		if (!/^(?:0644|0755)$/u.test(exception.mode)) {
			throw new Error(
				`Invalid preserved exception mode for ${exception.target}: ${exception.mode}`,
			);
		}
		if (targets.has(exception.target))
			throw new Error(
				`Duplicate preserved exception target: ${exception.target}`,
			);
		targets.add(exception.target);
	}
}

async function normalizedSourceMode(source) {
	return ((await stat(source)).mode & 0o111) === 0 ? 0o644 : 0o755;
}

async function listFiles(root) {
	const files = [];
	async function visit(directory) {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) await visit(absolute);
			else if (entry.isFile())
				files.push(path.relative(root, absolute).split(path.sep).join("/"));
			else throw new Error(`Unsupported source entry: ${absolute}`);
		}
	}
	await visit(root);
	return files.sort();
}

async function treeFingerprint(root) {
	const hash = createHash("sha256");
	for (const relative of await listFiles(root)) {
		hash.update(relative);
		hash.update("\0");
		hash.update(await readFile(path.join(root, relative)));
		hash.update("\0");
	}
	return hash.digest("hex");
}

const CURSOR_ASK_QUESTION_ADAPTER = [
	"",
	"**Cursor user-gate adapter:** Prefer the `AskQuestion` tool for mandatory gates and clarifying choices. If `AskQuestion` is not available in this session (for example `Tool not found: AskQuestion`, as with some Grok 4.5 sessions), fall back to an **inline chat question** that lists the same options, then WAIT for the user's reply before continuing. Never skip a gate because the tool is missing.",
	"",
].join("\n");

function injectCursorAskQuestionFallback(value) {
	if (!value.includes("AskQuestion")) return { value, injected: false };
	if (value.includes("Cursor user-gate adapter:"))
		return { value, injected: false };
	if (value.startsWith("---\n")) {
		const end = value.indexOf("\n---\n", 4);
		if (end !== -1) {
			const insertAt = end + "\n---\n".length;
			return {
				value:
					value.slice(0, insertAt) +
					CURSOR_ASK_QUESTION_ADAPTER +
					value.slice(insertAt),
				injected: true,
			};
		}
	}
	const heading = value.match(/^# .+$/m);
	if (heading && heading.index !== undefined) {
		const insertAt = heading.index + heading[0].length;
		return {
			value:
				value.slice(0, insertAt) +
				"\n" +
				CURSOR_ASK_QUESTION_ADAPTER +
				value.slice(insertAt),
			injected: true,
		};
	}
	return { value: CURSOR_ASK_QUESTION_ADAPTER + value, injected: true };
}

function applyCursorTransforms(
	buffer,
	targetRelative,
	transformationIds,
	observedTransformationIds = new Set(),
) {
	if (!TEXT_EXTENSIONS.has(path.extname(targetRelative))) return buffer;

	let value = buffer.toString("utf8");
	const applied = new Set();
	const apply = (id, from, to) => {
		if (value.includes(from)) {
			value = replaceAllLiteral(value, from, to);
			applied.add(id);
		}
	};

	value = value.replace(
		/\bmaister:\[([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\]/gu,
		(_match, identifier) => {
			applied.add("cursor-skill-name-v1");
			return `maister-[${identifier}]`;
		},
	);
	value = value.replace(
		/\bmaister:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\b/gu,
		(match, identifier) => {
			if (LOGICAL_ROLE_IDS.has(identifier)) return match;
			applied.add("cursor-skill-name-v1");
			return `maister-${identifier}`;
		},
	);
	value = value.replace(/^name: (?!maister-)([^\r\n]+)$/m, (_match, name) => {
		applied.add("cursor-skill-name-v1");
		return `name: maister-${name}`;
	});
	apply(
		"cursor-explore-agent-v1",
		'subagent_type="Explore"',
		'subagent_type="maister-explore"',
	);
	apply(
		"cursor-explore-agent-v1",
		'subagent_type: "Explore"',
		'subagent_type: "maister-explore"',
	);
	apply(
		"cursor-explore-agent-v1",
		'subagent_type="explore"',
		'subagent_type="maister-explore"',
	);
	apply(
		"cursor-explore-agent-v1",
		'subagent_type: "explore"',
		'subagent_type: "maister-explore"',
	);
	apply("cursor-question-tool-v1", "AskUserQuestion", "AskQuestion");
	apply(
		"cursor-question-tool-v1",
		"do NOT exempt you from invoking `AskQuestion` at a gate",
		"do NOT exempt you from presenting the gate via `AskQuestion` (or inline chat fallback if `AskQuestion` is unavailable) at a gate",
	);
	apply(
		"cursor-question-tool-v1",
		"Invoke `AskQuestion` now. Proceeding without a user response is a protocol violation",
		"Present the gate now via `AskQuestion` (or an inline chat question with the same options if `AskQuestion` is unavailable). Proceeding without a user response is a protocol violation",
	);
	apply(
		"cursor-question-tool-v1",
		"invoke AskQuestion at every mandatory gate checkpoint",
		"present every mandatory gate via AskQuestion (inline chat fallback if unavailable)",
	);
	{
		const injected = injectCursorAskQuestionFallback(value);
		value = injected.value;
		if (injected.injected) applied.add("cursor-question-tool-v1");
	}
	value = value.replace(/`EnterPlanMode`[^`]*`/g, (match) => {
		applied.add("cursor-plan-mode-v1");
		return "";
	});
	value = value.replace(/`ExitPlanMode`[^`]*`/g, (match) => {
		applied.add("cursor-plan-mode-v1");
		return "";
	});
	apply("cursor-plan-mode-v1", "EnterPlanMode", "structured planning flow");
	apply("cursor-plan-mode-v1", "ExitPlanMode", "plan approval gate");
	apply("cursor-project-instructions-v1", "CLAUDE.md", "AGENTS.md");
	apply(
		"cursor-framework-path-v1",
		"../orchestrator-framework/",
		"../lib/orchestrator-framework/",
	);
	apply(
		"cursor-framework-path-v1",
		"skills/orchestrator-framework/",
		"lib/orchestrator-framework/",
	);
	apply(
		"cursor-framework-path-v1",
		"[plugin]/skills/orchestrator-framework/",
		"[plugin]/lib/orchestrator-framework/",
	);

	for (const [from, to] of SKILL_REFERENCE_REPLACEMENTS) {
		apply("cursor-skill-references-v1", from, to);
	}

	const targetSkill = targetRelative.split("/")[0];
	if (TODO_TARGETS.has(targetSkill)) {
		for (const [from, to] of TODO_REPLACEMENTS)
			apply("cursor-todowrite-v1", from, to);
	}

	if (targetRelative === "maister-init/SKILL.md") {
		apply(
			"cursor-init-rule-v1",
			"Verify AGENTS.md integration",
			"Verify AGENTS.md integration\n- Create `.cursor/rules/maister-docs.mdc` in project root if missing (copy from plugin `rules/maister-docs.mdc` template — read `.maister/docs/INDEX.md` first)",
		);
	}

	if (targetRelative.startsWith("maister-init/")) {
		apply("cursor-host-neutralization-v1", ".codex", ".host-config");
		apply("cursor-host-neutralization-v1", "Codex", "host-native");
		apply("cursor-host-neutralization-v1", "codex", "native-host");
	}
	if (targetRelative.startsWith("maister-migration/references/")) {
		apply("cursor-host-neutralization-v1", "Claude", "the former host");
	}
	if (
		targetRelative ===
		"maister-standards-discover/references/docs-extractor-prompt.md"
	) {
		apply("cursor-host-neutralization-v1", ".claude", ".the-former-host");
	}

	for (const id of applied) {
		if (!transformationIds.has(id)) {
			throw new Error(
				`Transformation ${id} is not allowlisted for ${targetRelative}`,
			);
		}
		observedTransformationIds.add(id);
	}
	return Buffer.from(value);
}

async function pathExists(target) {
	try {
		await stat(target);
		return true;
	} catch (error) {
		if (error.code === "ENOENT") return false;
		throw error;
	}
}

export async function projectCursorSkills({ repositoryRoot, check = false }) {
	const manifestPath = path.join(
		repositoryRoot,
		"plugins/maister/overlays/cursor/skill-projection-v1.json",
	);
	let manifest;
	try {
		manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	} catch (error) {
		throw new Error(
			`Could not read Cursor skill projection manifest: ${manifestPath}`,
			{ cause: error },
		);
	}
	if (
		manifest.schema_version !== 1 ||
		manifest.projection_version !== "cursor-skill-projection-v1"
	) {
		throw new Error(
			`Unsupported Cursor skill projection manifest: ${manifestPath}`,
		);
	}
	validateCommandMappings(manifest.command_mappings);
	validatePreservedExceptions(manifest.preserved_exceptions);

	const sourceRoot = path.join(repositoryRoot, manifest.source_root);
	const outputRoot = path.join(repositoryRoot, manifest.output_root);
	const transformationIds = new Set(
		manifest.transformations.map(({ id }) => id),
	);
	const knownTransformationIds = new Set([
		"cursor-skill-name-v1",
		"cursor-explore-agent-v1",
		"cursor-question-tool-v1",
		"cursor-plan-mode-v1",
		"cursor-project-instructions-v1",
		"cursor-framework-path-v1",
		"cursor-skill-references-v1",
		"cursor-todowrite-v1",
		"cursor-init-rule-v1",
		"cursor-host-neutralization-v1",
	]);
	const dormantTransformationIds = new Set([
		"cursor-host-neutralization-v1",
		"cursor-skill-name-v1",
	]);
	for (const id of transformationIds) {
		if (!knownTransformationIds.has(id))
			throw new Error(`Unknown allowlisted transformation: ${id}`);
	}

	const sourceDirectories = (await readdir(sourceRoot, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	const classifiedDirectories = [
		...manifest.mappings.map(({ source }) => source),
		...manifest.source_exclusions.map(({ source }) => source),
	].sort();
	if (
		JSON.stringify(sourceDirectories) !== JSON.stringify(classifiedDirectories)
	) {
		throw new Error(
			"Canonical skill inventory changed; update the projection manifest before regenerating",
		);
	}

	const preserved = new Map(
		manifest.preserved_exceptions.map((entry) => [entry.target, entry]),
	);
	const desired = new Map();
	const observedTransformationIds = new Set();
	for (const mapping of manifest.mappings) {
		const sourceDirectory = path.join(sourceRoot, mapping.source);
		const sourceFingerprint = await treeFingerprint(sourceDirectory);
		if (mapping.source_fingerprint !== sourceFingerprint) {
			throw new Error(
				`Canonical source drift for ${mapping.source}: expected ${mapping.source_fingerprint}, got ${sourceFingerprint}`,
			);
		}
		for (const relative of await listFiles(sourceDirectory)) {
			const targetRelative = `${mapping.target}/${relative}`;
			const exception = preserved.get(targetRelative);
			if (exception) continue;
			const sourceAbsolute = path.join(sourceDirectory, relative);
			const source = await readFile(sourceAbsolute);
			desired.set(targetRelative, {
				content: applyCursorTransforms(
					source,
					targetRelative,
					transformationIds,
					observedTransformationIds,
				),
				mode: await normalizedSourceMode(sourceAbsolute),
			});
		}
	}

	for (const mapping of manifest.command_mappings) {
		if (preserved.has(mapping.target)) {
			throw new Error(
				`Cursor command target cannot also be a preserved exception: ${mapping.target}`,
			);
		}
		if (desired.has(mapping.target))
			throw new Error(`Duplicate projected target: ${mapping.target}`);
		const sourceAbsolute = path.join(repositoryRoot, mapping.source);
		const source = await readFile(sourceAbsolute);
		const sourceDigest = sha256(source);
		if (mapping.source_sha256 !== sourceDigest) {
			throw new Error(
				`Canonical command drift for ${mapping.source}: expected ${mapping.source_sha256}, got ${sourceDigest}`,
			);
		}
		desired.set(mapping.target, {
			content: applyCursorTransforms(
				source,
				mapping.target,
				transformationIds,
				observedTransformationIds,
			),
			mode: await normalizedSourceMode(sourceAbsolute),
		});
	}

	const unmatchedTransformationIds = [...transformationIds].filter(
		(id) =>
			!observedTransformationIds.has(id) && !dormantTransformationIds.has(id),
	);
	if (unmatchedTransformationIds.length > 0) {
		throw new Error(
			`Allowlisted transformations matched no canonical content: ${unmatchedTransformationIds.join(", ")}`,
		);
	}

	for (const exception of manifest.preserved_exceptions) {
		const absolute = path.join(outputRoot, exception.target);
		if (!(await pathExists(absolute)))
			throw new Error(`Preserved exception is missing: ${exception.target}`);
		const content = await readFile(absolute);
		const actual = sha256(content);
		if (actual !== exception.sha256) {
			throw new Error(
				`Preserved exception drift for ${exception.target}: expected ${exception.sha256}, got ${actual}`,
			);
		}
		desired.set(exception.target, {
			content,
			mode: Number.parseInt(exception.mode, 8),
		});
	}

	const desiredPaths = [...desired.keys()].sort();
	const currentPaths = (await pathExists(outputRoot))
		? await listFiles(outputRoot)
		: [];
	const differences = [];
	if (JSON.stringify(currentPaths) !== JSON.stringify(desiredPaths))
		differences.push("file inventory");
	for (const relative of desiredPaths) {
		const absolute = path.join(outputRoot, relative);
		if (!(await pathExists(absolute))) {
			differences.push(relative);
			continue;
		}
		const expected = desired.get(relative);
		if (!(await readFile(absolute)).equals(expected.content))
			differences.push(relative);
		const actualMode = (await stat(absolute)).mode & 0o7777;
		if (actualMode !== expected.mode) {
			differences.push(
				`${relative} (mode ${actualMode.toString(8)} != ${expected.mode.toString(8)})`,
			);
		}
	}

	if (check) {
		if (differences.length > 0)
			throw new Error(
				`Cursor skill projection is stale: ${differences.join(", ")}`,
			);
		return { mode: "check", files: desired.size, changed: 0 };
	}

	await rm(outputRoot, { recursive: true, force: true });
	for (const [relative, entry] of [...desired.entries()].sort(([a], [b]) =>
		a < b ? -1 : a > b ? 1 : 0,
	)) {
		const absolute = path.join(outputRoot, relative);
		await mkdir(path.dirname(absolute), { recursive: true });
		await writeFile(absolute, entry.content);
		await chmod(absolute, entry.mode);
	}
	return { mode: "write", files: desired.size, changed: differences.length };
}

export { applyCursorTransforms, treeFingerprint };
