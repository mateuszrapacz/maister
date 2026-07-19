import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { parseCanonicalYaml } from "../../skills/orchestrator-framework/bin/orchestrator-state-schema.mjs";
import {
  normalizedPathKey,
  normalizeRelativePath,
  resolveInside,
} from "./path-safety.mjs";
import { canonicalJson } from "./provenance.mjs";

const AGENT_IR_ERROR_CODES = new Set([
  "E_AGENT_IR_BODY",
  "E_AGENT_IR_COLLISION",
  "E_AGENT_IR_DEPENDENCY",
  "E_AGENT_IR_FRONTMATTER",
  "E_AGENT_IR_IDENTITY",
  "E_AGENT_IR_INVENTORY",
  "E_AGENT_IR_IO",
  "E_AGENT_IR_PATH",
]);
const FRONTMATTER_FIELDS = new Set(["name", "description", "model", "color", "skills"]);
const SAFE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const ALLOWED_MODEL_PROFILE_IDS = new Set(["inherit"]);
const ALLOWED_COLORS = new Set(["blue", "cyan", "green", "orange", "pink", "purple", "red", "yellow"]);

export class AgentIrValidationError extends Error {
  constructor(code, message, details = {}, { cause } = {}) {
    if (!AGENT_IR_ERROR_CODES.has(code)) throw new TypeError(`Unknown Agent IR error code: ${code}`);
    super(`[${code}] ${message}`, cause === undefined ? {} : { cause });
    this.name = "AgentIrValidationError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function fail(code, message, details = {}, options = {}) {
  throw new AgentIrValidationError(code, message, details, options);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validateSourcePath(sourcePath) {
  if (typeof sourcePath !== "string" || sourcePath.includes("\0") || sourcePath.includes("\\")) {
    fail("E_AGENT_IR_PATH", "canonical agent source path must be a NUL-free POSIX path", { sourcePath });
  }
  let normalized;
  try {
    normalized = normalizeRelativePath(sourcePath, "canonical agent source path");
  } catch (error) {
    fail("E_AGENT_IR_PATH", "canonical agent source path must be a safe relative path", { sourcePath }, { cause: error });
  }
  const segments = normalized.split("/");
  if (
    segments.length !== 2
    || segments[0] !== "agents"
    || path.posix.extname(normalized) !== ".md"
  ) {
    fail("E_AGENT_IR_PATH", "canonical agent source path must be agents/<role-id>.md", { sourcePath });
  }
  return path.posix.basename(normalized, ".md");
}

function splitMarkdown(source, sourcePath) {
  if (typeof source !== "string" || source.includes("\0") || /\r(?!\n)/u.test(source)) {
    fail("E_AGENT_IR_FRONTMATTER", "canonical agent source must be NUL-free UTF-8 text with valid newlines", { sourcePath });
  }
  const normalized = source.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u);
  if (!match) {
    fail("E_AGENT_IR_FRONTMATTER", "canonical agent must contain one leading YAML frontmatter document", { sourcePath });
  }
  let instructionBody = normalized.slice(match[0].length);
  if (instructionBody.startsWith("\n")) instructionBody = instructionBody.slice(1);
  if (instructionBody.trim().length === 0) {
    fail("E_AGENT_IR_BODY", "canonical agent instruction body must not be empty", { sourcePath });
  }
  instructionBody = instructionBody.replace(/\n+$/u, "\n");
  if (!instructionBody.endsWith("\n")) instructionBody += "\n";
  return { frontmatterSource: match[1], instructionBody };
}

function parseFrontmatter(frontmatterSource, sourcePath) {
  let metadata;
  try {
    metadata = parseCanonicalYaml(frontmatterSource);
  } catch (error) {
    fail("E_AGENT_IR_FRONTMATTER", `could not parse canonical frontmatter: ${error.message}`, { sourcePath }, { cause: error });
  }
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    fail("E_AGENT_IR_FRONTMATTER", "canonical frontmatter must be a mapping", { sourcePath });
  }
  const unknown = Object.keys(metadata).find((field) => !FRONTMATTER_FIELDS.has(field));
  if (unknown) {
    fail("E_AGENT_IR_FRONTMATTER", `canonical frontmatter has unknown field ${unknown}`, { sourcePath, field: unknown });
  }
  for (const field of ["name", "description"]) {
    if (!Object.hasOwn(metadata, field)) {
      fail("E_AGENT_IR_FRONTMATTER", `canonical frontmatter is missing ${field}`, { sourcePath, field });
    }
  }
  for (const field of ["name", "description", "model", "color"]) {
    if (Object.hasOwn(metadata, field) && (typeof metadata[field] !== "string" || metadata[field].length === 0 || metadata[field].includes("\n"))) {
      fail("E_AGENT_IR_FRONTMATTER", `${field} must be a non-empty single-line string`, { sourcePath, field });
    }
  }
  if (metadata.description.trim().length === 0) {
    fail("E_AGENT_IR_FRONTMATTER", "description must not be blank", { sourcePath, field: "description" });
  }
  const modelProfileId = metadata.model ?? "inherit";
  if (!ALLOWED_MODEL_PROFILE_IDS.has(modelProfileId)) {
    fail("E_AGENT_IR_FRONTMATTER", `unsupported canonical model profile ${modelProfileId}`, { sourcePath, modelProfileId });
  }
  if (metadata.color !== undefined && !ALLOWED_COLORS.has(metadata.color)) {
    fail("E_AGENT_IR_FRONTMATTER", `unsupported canonical color ${metadata.color}`, { sourcePath, color: metadata.color });
  }
  if (metadata.skills !== undefined) {
    if (!Array.isArray(metadata.skills) || metadata.skills.length === 0) {
      fail("E_AGENT_IR_DEPENDENCY", "skills must be a non-empty sequence when present", { sourcePath });
    }
    if (metadata.skills.some((skillId) => typeof skillId !== "string" || !SAFE_ID.test(skillId))) {
      fail("E_AGENT_IR_DEPENDENCY", "skill dependencies must be safe lowercase IDs", { sourcePath });
    }
    if (new Set(metadata.skills).size !== metadata.skills.length) {
      fail("E_AGENT_IR_DEPENDENCY", "skill dependencies must not contain duplicates", { sourcePath });
    }
  }
  return {
    name: metadata.name,
    description: metadata.description,
    modelProfileId,
    color: metadata.color ?? null,
    skills: metadata.skills ?? [],
  };
}

function validateSkillDependencies(skillIds, skillsRoot, sourcePath) {
  if (typeof skillsRoot !== "string" || skillsRoot.length === 0) {
    fail("E_AGENT_IR_DEPENDENCY", "skillsRoot is required to validate skill dependencies", { sourcePath });
  }
  const absoluteRoot = path.resolve(skillsRoot);
  for (const skillId of skillIds) {
    let skillPath;
    try {
      skillPath = resolveInside(absoluteRoot, `${skillId}/SKILL.md`, "canonical skill dependency");
    } catch (error) {
      fail("E_AGENT_IR_DEPENDENCY", `skill dependency escapes the immutable skill root: ${skillId}`, {
        sourcePath,
        skillId,
      }, { cause: error });
    }
    let stat;
    try {
      stat = fs.lstatSync(skillPath);
    } catch (error) {
      fail("E_AGENT_IR_DEPENDENCY", `skill dependency does not resolve to ${skillId}/SKILL.md`, {
        sourcePath,
        skillId,
      }, { cause: error });
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail("E_AGENT_IR_DEPENDENCY", `skill dependency must resolve to a regular immutable file: ${skillId}`, {
        sourcePath,
        skillId,
      });
    }
  }
}

function parseAgentSource({ path: sourcePath, source }, skillsRoot) {
  const filenameStem = validateSourcePath(sourcePath);
  const { frontmatterSource, instructionBody } = splitMarkdown(source, sourcePath);
  const metadata = parseFrontmatter(frontmatterSource, sourcePath);
  if (!SAFE_ID.test(filenameStem) || !SAFE_ID.test(metadata.name) || filenameStem !== metadata.name) {
    fail("E_AGENT_IR_IDENTITY", "filename stem, frontmatter name, and role_id must be the same lowercase safe ID", {
      sourcePath,
      filenameStem,
      name: metadata.name,
    });
  }
  validateSkillDependencies(metadata.skills, skillsRoot, sourcePath);
  return {
    role_id: filenameStem,
    logical_role_id: `maister:${filenameStem}`,
    source_path: sourcePath,
    source_sha256: sha256(Buffer.from(source, "utf8")),
    description: metadata.description,
    model_profile_id: metadata.modelProfileId,
    color: metadata.color,
    skill_dependencies: [...metadata.skills],
    instruction_body: instructionBody,
  };
}

function validateExpectedInventory(roles, expectedRoleIds) {
  if (expectedRoleIds === undefined) return;
  if (!Array.isArray(expectedRoleIds) || expectedRoleIds.some((roleId) => typeof roleId !== "string" || !SAFE_ID.test(roleId))) {
    fail("E_AGENT_IR_INVENTORY", "expectedRoleIds must be a sequence of safe role IDs", {});
  }
  if (new Set(expectedRoleIds).size !== expectedRoleIds.length) {
    fail("E_AGENT_IR_INVENTORY", "expectedRoleIds must not contain duplicates", {});
  }
  const actual = roles.map(({ role_id: roleId }) => roleId);
  const expected = [...expectedRoleIds].sort((left, right) => left.localeCompare(right, "en-US"));
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail("E_AGENT_IR_INVENTORY", "canonical role inventory differs from the exact expected inventory", { expected, actual });
  }
}

export function parseAgentSources({ sources, skillsRoot, expectedRoleIds } = {}) {
  if (!Array.isArray(sources) || sources.length === 0) {
    fail("E_AGENT_IR_INVENTORY", "canonical agent sources must be a non-empty sequence", {});
  }
  const normalizedSources = new Map();
  for (const entry of sources) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail("E_AGENT_IR_IO", "canonical agent source entries must be mappings", {});
    }
    const collisionKey = typeof entry.path === "string"
      ? normalizedPathKey(entry.path.normalize("NFC"))
      : String(entry.path);
    if (normalizedSources.has(collisionKey)) {
      fail("E_AGENT_IR_COLLISION", "canonical agent source paths collide after Unicode and case normalization", {
        sourcePath: entry.path,
        previous: normalizedSources.get(collisionKey),
      });
    }
    normalizedSources.set(collisionKey, entry.path);
  }
  const roles = sources.map((entry) => parseAgentSource(entry, skillsRoot));
  const normalizedRoles = new Map();
  for (const role of roles) {
    const collisionKey = role.role_id.normalize("NFC").toLocaleLowerCase("en-US");
    if (normalizedRoles.has(collisionKey)) {
      fail("E_AGENT_IR_COLLISION", "canonical role IDs collide after Unicode and case normalization", {
        roleId: role.role_id,
        previous: normalizedRoles.get(collisionKey),
      });
    }
    normalizedRoles.set(collisionKey, role.role_id);
  }
  roles.sort((left, right) => left.role_id.localeCompare(right.role_id, "en-US"));
  validateExpectedInventory(roles, expectedRoleIds);
  const canonicalSetDigest = sha256(canonicalJson(roles));
  return deepFreeze({
    schema_version: 1,
    canonical_set_digest: canonicalSetDigest,
    roles,
  });
}

export function loadCanonicalAgentIr({ agentsRoot, skillsRoot, expectedRoleIds } = {}) {
  if (typeof agentsRoot !== "string" || agentsRoot.length === 0) {
    fail("E_AGENT_IR_IO", "agentsRoot is required", {});
  }
  let entries;
  try {
    entries = fs.readdirSync(agentsRoot, { withFileTypes: true });
  } catch (error) {
    fail("E_AGENT_IR_IO", `could not read canonical agent root: ${error.message}`, { agentsRoot }, { cause: error });
  }
  const markdownEntries = entries.filter((entry) => entry.name.endsWith(".md"));
  if (markdownEntries.some((entry) => !entry.isFile() || entry.isSymbolicLink())) {
    fail("E_AGENT_IR_PATH", "canonical agent entries must be regular Markdown files", { agentsRoot });
  }
  const sources = markdownEntries.map((entry) => {
    const filePath = path.join(agentsRoot, entry.name);
    try {
      return { path: `agents/${entry.name}`, source: fs.readFileSync(filePath, "utf8") };
    } catch (error) {
      fail("E_AGENT_IR_IO", `could not read canonical agent ${entry.name}`, { filePath }, { cause: error });
    }
  });
  return parseAgentSources({ sources, skillsRoot, expectedRoleIds });
}
