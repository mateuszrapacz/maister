import crypto from "node:crypto";
import path from "node:path";

import { normalizedPathKey, normalizeRelativePath } from "./path-safety.mjs";
import { canonicalJson } from "./provenance.mjs";

const ERROR_CODES = new Set([
	"E_AGENT_PROJECTION_BINDING",
	"E_AGENT_PROJECTION_COLLISION",
	"E_AGENT_PROJECTION_DRIFT",
	"E_AGENT_PROJECTION_INVENTORY",
	"E_AGENT_PROJECTION_IO",
	"E_AGENT_PROJECTION_PATH",
	"E_AGENT_PROJECTION_REFERENCE",
	"E_AGENT_PROJECTION_SCHEMA",
	"E_AGENT_PROJECTION_TRANSFORM",
]);
const HASH = /^[0-9a-f]{64}$/u;
const MODE = /^0[0-7]{3}$/u;
const TARGET_TRANSFORMS = Object.freeze({
	codex: Object.freeze(["canonical-body-v1", "codex-output-schema-v1"]),
	cursor: Object.freeze(["canonical-body-v1", "cursor-frontmatter-v1"]),
	"kiro-cli": Object.freeze(["canonical-body-v1", "kiro-descriptor-v1"]),
	pi: Object.freeze(["canonical-body-v1", "pi-agent-frontmatter-v1"]),
});
const TARGET_KINDS = Object.freeze({
	codex: Object.freeze(["output-schema", "prompt"]),
	cursor: Object.freeze(["agent"]),
	"kiro-cli": Object.freeze(["descriptor", "prompt"]),
	pi: Object.freeze(["package-agent"]),
});

export class AgentProjectionError extends Error {
	constructor(code, message, details = {}, { cause } = {}) {
		if (!ERROR_CODES.has(code))
			throw new TypeError(`Unknown agent projection error code: ${code}`);
		super(`[${code}] ${message}`, cause === undefined ? {} : { cause });
		this.name = "AgentProjectionError";
		this.code = code;
		this.kind = code;
		this.details = details;
		this.retryable = false;
	}
}

export function failAgentProjection(code, message, details = {}, options = {}) {
	throw new AgentProjectionError(code, message, details, options);
}

function sha256(bytes) {
	return crypto.createHash("sha256").update(bytes).digest("hex");
}

function comparePaths(left, right) {
	const leftKey = normalizedPathKey(left.path);
	const rightKey = normalizedPathKey(right.path);
	return (
		leftKey.localeCompare(rightKey, "en-US") ||
		left.path.localeCompare(right.path, "en-US")
	);
}

function projectionDigest(outputs) {
	return sha256(
		canonicalJson(
			outputs.map((output) => ({
				kind: output.kind,
				mode: output.mode,
				ownership: output.ownership,
				path: output.path,
				role_id: output.role_id,
				sha256: output.sha256,
				size: output.size,
				support_id: output.support_id,
			})),
		),
	);
}

function validateOutput(output, index) {
	if (!output || typeof output !== "object" || Array.isArray(output)) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`outputs[${index}] must be a mapping`,
		);
	}
	const expectedFields = [
		"path",
		"kind",
		"mode",
		"ownership",
		"role_id",
		"support_id",
		"content",
		"size",
		"sha256",
	];
	if (
		canonicalJson(Object.keys(output).sort()) !==
		canonicalJson(expectedFields.sort())
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`outputs[${index}] has an invalid field set`,
			{ index },
		);
	}
	let normalizedPath;
	try {
		normalizedPath = normalizeRelativePath(
			output.path,
			`outputs[${index}].path`,
		);
	} catch (error) {
		failAgentProjection(
			"E_AGENT_PROJECTION_PATH",
			`outputs[${index}].path must be safe`,
			{ path: output.path },
			{ cause: error },
		);
	}
	if (normalizedPath !== output.path || !MODE.test(output.mode)) {
		failAgentProjection(
			"E_AGENT_PROJECTION_PATH",
			`outputs[${index}] has a non-normalized path or mode`,
			{
				path: output.path,
				mode: output.mode,
			},
		);
	}
	if (
		!TARGET_KINDS.codex.includes(output.kind) &&
		!TARGET_KINDS.cursor.includes(output.kind) &&
		!TARGET_KINDS["kiro-cli"].includes(output.kind) &&
		!TARGET_KINDS.pi.includes(output.kind)
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`outputs[${index}].kind is unsupported`,
			{ kind: output.kind },
		);
	}
	if (!["canonical", "support"].includes(output.ownership)) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`outputs[${index}].ownership is unsupported`,
			{ ownership: output.ownership },
		);
	}
	if (
		output.ownership === "canonical" &&
		(typeof output.role_id !== "string" || output.support_id !== null)
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			`outputs[${index}] has invalid canonical ownership`,
			{ index },
		);
	}
	if (
		output.ownership === "support" &&
		(output.role_id !== null || typeof output.support_id !== "string")
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			`outputs[${index}] has invalid support ownership`,
			{ index },
		);
	}
	if (
		typeof output.content !== "string" ||
		output.content.includes("\0") ||
		output.content.includes("\r")
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`outputs[${index}].content must be normalized UTF-8 text`,
			{ index },
		);
	}
	if (!/(?<!\n)\n$/u.test(output.content)) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`outputs[${index}].content must have one trailing newline`,
			{ index },
		);
	}
	const bytes = Buffer.from(output.content, "utf8");
	if (
		bytes.toString("utf8") !== output.content ||
		output.size !== bytes.length ||
		output.sha256 !== sha256(bytes)
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_BINDING",
			`outputs[${index}] content hash or size is stale`,
			{ path: output.path },
		);
	}
	if (output.path.endsWith(".json")) {
		let parsed;
		try {
			parsed = JSON.parse(output.content);
		} catch (error) {
			failAgentProjection(
				"E_AGENT_PROJECTION_SCHEMA",
				`outputs[${index}] is not valid JSON`,
				{ path: output.path },
				{ cause: error },
			);
		}
		if (`${canonicalJson(parsed)}\n` !== output.content) {
			failAgentProjection(
				"E_AGENT_PROJECTION_SCHEMA",
				`outputs[${index}] JSON is not canonical`,
				{ path: output.path },
			);
		}
	}
}

function validateCanonicalBijection(projection) {
	const expectedKinds = TARGET_KINDS[projection.target];
	if (!expectedKinds) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`unsupported projection target ${projection.target}`,
			{ target: projection.target },
		);
	}
	const roleIds = projection.canonical_role_ids;
	if (
		!Array.isArray(roleIds) ||
		roleIds.length === 0 ||
		new Set(roleIds).size !== roleIds.length
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			"canonical_role_ids must be a unique non-empty sequence",
		);
	}
	const sortedRoleIds = [...roleIds].sort((left, right) =>
		left.localeCompare(right, "en-US"),
	);
	if (canonicalJson(roleIds) !== canonicalJson(sortedRoleIds)) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			"canonical_role_ids must be sorted",
		);
	}
	for (const roleId of roleIds) {
		const outputs = projection.outputs.filter(
			(output) => output.ownership === "canonical" && output.role_id === roleId,
		);
		const kinds = outputs.map(({ kind }) => kind).sort();
		if (canonicalJson(kinds) !== canonicalJson([...expectedKinds].sort())) {
			failAgentProjection(
				"E_AGENT_PROJECTION_INVENTORY",
				`canonical role ${roleId} does not have the exact ${projection.target} representation`,
				{
					roleId,
					expectedKinds,
					actualKinds: kinds,
				},
			);
		}
	}
	const unexpectedRole = projection.outputs.find(
		(output) =>
			output.ownership === "canonical" && !roleIds.includes(output.role_id),
	);
	if (unexpectedRole) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			`unexpected canonical output for ${unexpectedRole.role_id}`,
			{
				roleId: unexpectedRole.role_id,
			},
		);
	}
}

function validateSupportSeparation(projection) {
	if (!Array.isArray(projection.support_inventory)) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			"support_inventory must be a sequence",
		);
	}
	const supportIds = projection.support_inventory.map(
		({ support_id: supportId }) => supportId,
	);
	if (new Set(supportIds).size !== supportIds.length) {
		failAgentProjection(
			"E_AGENT_PROJECTION_COLLISION",
			"support inventory IDs must be unique",
		);
	}
	for (const support of projection.support_inventory) {
		if (
			!support ||
			typeof support.support_id !== "string" ||
			!Array.isArray(support.output_paths)
		) {
			failAgentProjection(
				"E_AGENT_PROJECTION_SCHEMA",
				"support inventory entries must declare support_id and output_paths",
			);
		}
		const unqualifiedId = support.support_id.slice(
			support.support_id.indexOf(":") + 1,
		);
		if (projection.canonical_role_ids.includes(unqualifiedId)) {
			failAgentProjection(
				"E_AGENT_PROJECTION_INVENTORY",
				`${support.support_id} collides with canonical inventory`,
				{
					supportId: support.support_id,
				},
			);
		}
		const actualPaths = projection.outputs
			.filter(
				(output) =>
					output.ownership === "support" &&
					output.support_id === support.support_id,
			)
			.map(({ path }) => path);
		if (canonicalJson(actualPaths) !== canonicalJson(support.output_paths)) {
			failAgentProjection(
				"E_AGENT_PROJECTION_INVENTORY",
				`${support.support_id} output inventory is incomplete`,
				{
					supportId: support.support_id,
				},
			);
		}
	}
	const unownedSupport = projection.outputs.find(
		(output) =>
			output.ownership === "support" && !supportIds.includes(output.support_id),
	);
	if (unownedSupport) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			`support output ${unownedSupport.path} has no inventory owner`,
			{
				path: unownedSupport.path,
			},
		);
	}
}

function validateKiroReferences(projection) {
	if (projection.target !== "kiro-cli") return;
	const outputPaths = new Set(projection.outputs.map(({ path }) => path));
	for (const output of projection.outputs.filter(
		({ kind }) => kind === "descriptor",
	)) {
		let descriptor;
		try {
			descriptor = JSON.parse(output.content);
		} catch (error) {
			failAgentProjection(
				"E_AGENT_PROJECTION_REFERENCE",
				`${output.path} descriptor is not valid JSON`,
				{
					path: output.path,
				},
				{ cause: error },
			);
		}
		if (
			typeof descriptor.prompt !== "string" ||
			!descriptor.prompt.startsWith("file://./")
		) {
			failAgentProjection(
				"E_AGENT_PROJECTION_REFERENCE",
				`${output.path} must use a closed relative prompt URI`,
				{
					path: output.path,
				},
			);
		}
		const promptPath = descriptor.prompt.slice("file://./".length);
		let normalizedPromptPath;
		try {
			normalizedPromptPath = normalizeRelativePath(
				promptPath,
				`${output.path}.prompt`,
			);
		} catch (error) {
			failAgentProjection(
				"E_AGENT_PROJECTION_REFERENCE",
				`${output.path} has an unsafe prompt URI`,
				{
					path: output.path,
					prompt: descriptor.prompt,
				},
				{ cause: error },
			);
		}
		const resolvedPromptPath = path.posix.join(
			path.posix.dirname(output.path),
			normalizedPromptPath,
		);
		if (
			normalizedPromptPath !== promptPath ||
			!outputPaths.has(resolvedPromptPath)
		) {
			failAgentProjection(
				"E_AGENT_PROJECTION_REFERENCE",
				`${output.path} prompt URI does not resolve`,
				{
					path: output.path,
					prompt: descriptor.prompt,
				},
			);
		}
	}
}

export function validateAgentProjection({ projection } = {}) {
	if (
		!projection ||
		typeof projection !== "object" ||
		Array.isArray(projection)
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			"projection must be a mapping",
		);
	}
	const projectionFields = [
		"schema_version",
		"projector_version",
		"target",
		"canonical_set_digest",
		"manifest_digest",
		"transform_ids",
		"canonical_role_ids",
		"support_inventory",
		"outputs",
		"projected_tree_digest",
	];
	for (const field of projectionFields) {
		if (!Object.hasOwn(projection, field)) {
			failAgentProjection(
				"E_AGENT_PROJECTION_SCHEMA",
				`projection is missing ${field}`,
				{ field },
			);
		}
	}
	const unknownField = Object.keys(projection).find(
		(field) => !projectionFields.includes(field),
	);
	if (unknownField) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			`projection has unknown field ${unknownField}`,
			{ field: unknownField },
		);
	}
	if (
		projection.schema_version !== 1 ||
		typeof projection.projector_version !== "string"
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_SCHEMA",
			"projection version fields are invalid",
		);
	}
	if (
		!HASH.test(projection.canonical_set_digest) ||
		!HASH.test(projection.manifest_digest)
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_BINDING",
			"projection source or manifest digest is invalid",
		);
	}
	if (
		canonicalJson(projection.transform_ids) !==
		canonicalJson(TARGET_TRANSFORMS[projection.target])
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_TRANSFORM",
			`projection transforms are not the exact allowlist for ${projection.target}`,
			{
				target: projection.target,
				transforms: projection.transform_ids,
			},
		);
	}
	if (!Array.isArray(projection.outputs) || projection.outputs.length === 0) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			"projection outputs must not be empty",
		);
	}
	projection.outputs.forEach(validateOutput);
	const sortedOutputs = [...projection.outputs].sort(comparePaths);
	if (
		canonicalJson(projection.outputs.map(({ path }) => path)) !==
		canonicalJson(sortedOutputs.map(({ path }) => path))
	) {
		failAgentProjection(
			"E_AGENT_PROJECTION_INVENTORY",
			"projection outputs must be sorted by normalized path",
		);
	}
	const normalizedPaths = new Map();
	for (const output of projection.outputs) {
		const key = normalizedPathKey(output.path.normalize("NFC"));
		if (normalizedPaths.has(key)) {
			failAgentProjection(
				"E_AGENT_PROJECTION_COLLISION",
				`projection paths collide after normalization: ${output.path}`,
				{
					path: output.path,
					previous: normalizedPaths.get(key),
				},
			);
		}
		normalizedPaths.set(key, output.path);
	}
	validateCanonicalBijection(projection);
	validateSupportSeparation(projection);
	validateKiroReferences(projection);
	const expectedDigest = projectionDigest(projection.outputs);
	if (projection.projected_tree_digest !== expectedDigest) {
		failAgentProjection(
			"E_AGENT_PROJECTION_BINDING",
			"projected-tree digest is stale",
			{
				expected: expectedDigest,
				actual: projection.projected_tree_digest,
			},
		);
	}
	return projection;
}

export { projectionDigest, TARGET_TRANSFORMS };
