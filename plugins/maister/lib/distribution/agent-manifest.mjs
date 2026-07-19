import crypto from "node:crypto";
import fs from "node:fs";

import { normalizeRelativePath } from "./path-safety.mjs";
import { canonicalJson } from "./provenance.mjs";

const MANIFEST_ERROR_CODES = new Set([
  "E_AGENT_MANIFEST_ADVISOR",
  "E_AGENT_MANIFEST_COLLISION",
  "E_AGENT_MANIFEST_INVENTORY",
  "E_AGENT_MANIFEST_IO",
  "E_AGENT_MANIFEST_PATH",
  "E_AGENT_MANIFEST_PROFILE",
  "E_AGENT_MANIFEST_SCHEMA",
  "E_AGENT_MANIFEST_TARGET",
]);
const TARGET_IDS = ["codex", "cursor", "kiro-cli"];
const EXPECTED_TARGETS = Object.freeze({
  codex: Object.freeze({ adapter_id: "codex.exec", representation: "codex-prompt-schema", native_role_external_id_template: null }),
  cursor: Object.freeze({ adapter_id: "cursor.native", representation: "cursor-markdown", native_role_external_id_template: "maister-{role_id}" }),
  "kiro-cli": Object.freeze({ adapter_id: "kiro-cli.native", representation: "kiro-descriptor-prompt", native_role_external_id_template: "maister-{role_id}" }),
});
const SAFE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const SAFE_PROFILE_ID = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

export class AgentManifestValidationError extends Error {
  constructor(code, message, details = {}, { cause } = {}) {
    if (!MANIFEST_ERROR_CODES.has(code)) throw new TypeError(`Unknown agent manifest error code: ${code}`);
    super(`[${code}] ${message}`, cause === undefined ? {} : { cause });
    this.name = "AgentManifestValidationError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = false;
  }
}

function fail(code, message, details = {}, options = {}) {
  throw new AgentManifestValidationError(code, message, details, options);
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

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ensureMapping(value, location, code = "E_AGENT_MANIFEST_SCHEMA") {
  if (!isMapping(value)) fail(code, `${location} must be a mapping`, { location });
}

function ensureFields(value, required, location, { optional = [], code = "E_AGENT_MANIFEST_SCHEMA" } = {}) {
  ensureMapping(value, location, code);
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) fail(code, `${location} has unknown field ${unknown}`, { location, field: unknown });
  const missing = required.find((field) => !Object.hasOwn(value, field));
  if (missing) fail(code, `${location} is missing ${missing}`, { location, field: missing });
}

function ensureString(value, location, code = "E_AGENT_MANIFEST_SCHEMA") {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    fail(code, `${location} must be a non-empty NUL-free string`, { location });
  }
}

function ensureBoolean(value, location) {
  if (typeof value !== "boolean") fail("E_AGENT_MANIFEST_SCHEMA", `${location} must be boolean`, { location });
}

function ensureInteger(value, location, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) {
    fail("E_AGENT_MANIFEST_SCHEMA", `${location} must be an integer >= ${minimum}`, { location });
  }
}

function ensureArray(value, location, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    fail("E_AGENT_MANIFEST_SCHEMA", `${location} must be ${nonEmpty ? "a non-empty " : "a "}sequence`, { location });
  }
}

function ensureUnique(values, location, code = "E_AGENT_MANIFEST_COLLISION") {
  if (new Set(values).size !== values.length) fail(code, `${location} must contain unique values`, { location });
}

function ensureSafePath(value, location, { template = false } = {}) {
  ensureString(value, location, "E_AGENT_MANIFEST_PATH");
  const candidate = template ? value.replaceAll("{role_id}", "role") : value;
  if (template && (candidate.includes("{") || candidate.includes("}"))) {
    fail("E_AGENT_MANIFEST_PATH", `${location} contains an unsupported template token`, { location, value });
  }
  try {
    normalizeRelativePath(candidate, location);
  } catch (error) {
    fail("E_AGENT_MANIFEST_PATH", `${location} must be a safe relative path`, { location, value }, { cause: error });
  }
  return value;
}

function ensureProfileId(value, location) {
  ensureString(value, location, "E_AGENT_MANIFEST_PROFILE");
  if (!SAFE_PROFILE_ID.test(value)) {
    fail("E_AGENT_MANIFEST_PROFILE", `${location} must be a namespaced profile ID`, { location, value });
  }
}

function validateRoleEquality(contract) {
  const roles = Array.isArray(contract?.roles) ? contract.roles : [];
  for (const role of roles) {
    if (!isMapping(role)) continue;
    const prohibited = Object.keys(role).find((field) => !["role_id", "execution_profiles"].includes(field));
    if (prohibited) {
      fail("E_AGENT_MANIFEST_ADVISOR", `canonical roles cannot declare per-role special field ${prohibited}`, {
        roleId: role.role_id ?? null,
        field: prohibited,
      });
    }
  }
  const supportEntries = Array.isArray(contract?.support_inventory) ? contract.support_inventory : [];
  const canonicalRoleIds = new Set(Array.isArray(contract?.expected_role_ids) ? contract.expected_role_ids : []);
  const prohibitedSupport = supportEntries.find((entry) => {
    if (!isMapping(entry)) return false;
    const unqualifiedSupportId = typeof entry.support_id === "string"
      ? entry.support_id.slice(entry.support_id.indexOf(":") + 1)
      : null;
    const paths = [entry.source, entry.destination];
    if (Array.isArray(entry.assets)) {
      paths.push(...entry.assets.flatMap((asset) => isMapping(asset) ? [asset.source, asset.destination] : []));
    }
    return canonicalRoleIds.has(unqualifiedSupportId)
      || paths.some((value) => typeof value === "string" && value.toLocaleLowerCase("en-US").endsWith(".toml"));
  });
  if (prohibitedSupport) {
    fail("E_AGENT_MANIFEST_ADVISOR", "canonical roles cannot appear in support inventory or TOML/native compatibility paths", {
      supportId: prohibitedSupport.support_id ?? null,
    });
  }
}

function validateIdSequence(values, location) {
  ensureArray(values, location, { nonEmpty: true });
  values.forEach((value, index) => {
    ensureString(value, `${location}[${index}]`);
    if (!SAFE_ID.test(value)) fail("E_AGENT_MANIFEST_INVENTORY", `${location}[${index}] must be a safe role ID`, { location, value });
  });
  ensureUnique(values, location, "E_AGENT_MANIFEST_INVENTORY");
}

function validateProfileCatalog(profiles) {
  ensureFields(profiles, ["tools", "permissions", "model", "reasoning", "timeout", "output_schema", "concurrency", "execution"], "profiles");
  const profileFields = {
    tools: ["id", "tools"],
    permissions: ["id", "filesystem", "network"],
    model: ["id", "model", "allow_inherit"],
    reasoning: ["id", "effort", "allow_inherit"],
    timeout: ["id", "milliseconds"],
    output_schema: ["id", "schema_id"],
    concurrency: ["id", "class", "max_parallel"],
    execution: [
      "id", "target", "tools_profile_id", "permissions_profile_id", "model_profile_id",
      "reasoning_profile_id", "timeout_profile_id", "output_schema_profile_id", "concurrency_profile_id",
    ],
  };
  const catalogs = {};
  for (const [category, fields] of Object.entries(profileFields)) {
    ensureArray(profiles[category], `profiles.${category}`, { nonEmpty: true });
    const ids = [];
    catalogs[category] = new Map();
    profiles[category].forEach((profile, index) => {
      const location = `profiles.${category}[${index}]`;
      ensureFields(profile, fields, location);
      ensureProfileId(profile.id, `${location}.id`);
      ids.push(profile.id);
      catalogs[category].set(profile.id, profile);
    });
    ensureUnique(ids, `profiles.${category} IDs`, "E_AGENT_MANIFEST_PROFILE");
  }
  profiles.tools.forEach((profile) => {
    ensureArray(profile.tools, `profiles.tools.${profile.id}.tools`, { nonEmpty: true });
    profile.tools.forEach((tool, index) => ensureString(tool, `profiles.tools.${profile.id}.tools[${index}]`));
    ensureUnique(profile.tools, `profiles.tools.${profile.id}.tools`, "E_AGENT_MANIFEST_PROFILE");
  });
  profiles.permissions.forEach((profile) => {
    if (!new Set(["read-only", "workspace-write"]).has(profile.filesystem)) {
      fail("E_AGENT_MANIFEST_PROFILE", `permissions profile ${profile.id} has unsupported filesystem policy`, { profileId: profile.id });
    }
    if (!new Set(["restricted", "host-controlled"]).has(profile.network)) {
      fail("E_AGENT_MANIFEST_PROFILE", `permissions profile ${profile.id} has unsupported network policy`, { profileId: profile.id });
    }
  });
  profiles.model.forEach((profile) => {
    if (profile.model !== null) ensureString(profile.model, `profiles.model.${profile.id}.model`, "E_AGENT_MANIFEST_PROFILE");
    ensureBoolean(profile.allow_inherit, `profiles.model.${profile.id}.allow_inherit`);
    if (!profile.allow_inherit && profile.model === null) {
      fail("E_AGENT_MANIFEST_PROFILE", `model profile ${profile.id} forbids inheritance but has no model`, { profileId: profile.id });
    }
  });
  profiles.reasoning.forEach((profile) => {
    if (profile.effort !== null) ensureString(profile.effort, `profiles.reasoning.${profile.id}.effort`, "E_AGENT_MANIFEST_PROFILE");
    ensureBoolean(profile.allow_inherit, `profiles.reasoning.${profile.id}.allow_inherit`);
    if (!profile.allow_inherit && profile.effort === null) {
      fail("E_AGENT_MANIFEST_PROFILE", `reasoning profile ${profile.id} forbids inheritance but has no effort`, { profileId: profile.id });
    }
  });
  profiles.timeout.forEach((profile) => ensureInteger(profile.milliseconds, `profiles.timeout.${profile.id}.milliseconds`, 1));
  profiles.output_schema.forEach((profile) => ensureString(profile.schema_id, `profiles.output_schema.${profile.id}.schema_id`));
  profiles.concurrency.forEach((profile) => {
    if (!new Set(["read-only-concurrent", "workspace-write-serial"]).has(profile.class)) {
      fail("E_AGENT_MANIFEST_PROFILE", `concurrency profile ${profile.id} has unsupported class`, { profileId: profile.id });
    }
    ensureInteger(profile.max_parallel, `profiles.concurrency.${profile.id}.max_parallel`, 1);
    if (profile.class === "workspace-write-serial" && profile.max_parallel !== 1) {
      fail("E_AGENT_MANIFEST_PROFILE", "workspace-writing execution must remain serial", { profileId: profile.id });
    }
  });
  profiles.execution.forEach((profile) => {
    if (!TARGET_IDS.includes(profile.target)) {
      fail("E_AGENT_MANIFEST_TARGET", `execution profile ${profile.id} has unsupported target`, { profileId: profile.id });
    }
    const references = [
      ["tools", profile.tools_profile_id],
      ["permissions", profile.permissions_profile_id],
      ["model", profile.model_profile_id],
      ["reasoning", profile.reasoning_profile_id],
      ["timeout", profile.timeout_profile_id],
      ["output_schema", profile.output_schema_profile_id],
      ["concurrency", profile.concurrency_profile_id],
    ];
    for (const [category, profileId] of references) {
      ensureProfileId(profileId, `profiles.execution.${profile.id}.${category}_profile_id`);
      if (!catalogs[category].has(profileId)) {
        fail("E_AGENT_MANIFEST_PROFILE", `execution profile ${profile.id} references unknown ${category} profile ${profileId}`, { profileId });
      }
    }
    if (profile.target === "codex") {
      const model = catalogs.model.get(profile.model_profile_id);
      const reasoning = catalogs.reasoning.get(profile.reasoning_profile_id);
      if (model.allow_inherit || model.model === null || reasoning.allow_inherit || reasoning.effort === null) {
        fail("E_AGENT_MANIFEST_PROFILE", `Codex execution profile ${profile.id} must pin model and reasoning effort`, { profileId: profile.id });
      }
    }
  });
  return catalogs;
}

function validateTargets(targets, allowedTransformIds) {
  ensureFields(targets, TARGET_IDS, "targets");
  for (const targetId of TARGET_IDS) {
    const target = targets[targetId];
    const location = `targets.${targetId}`;
    ensureFields(target, [
      "adapter_id", "representation", "native_role_external_id_template", "destinations", "transform_ids", "support_ids",
    ], location);
    const expected = EXPECTED_TARGETS[targetId];
    if (
      target.adapter_id !== expected.adapter_id
      || target.representation !== expected.representation
      || target.native_role_external_id_template !== expected.native_role_external_id_template
    ) {
      fail("E_AGENT_MANIFEST_TARGET", `${location} identity does not match the target adapter contract`, { targetId });
    }
    ensureArray(target.destinations, `${location}.destinations`, { nonEmpty: true });
    const destinationKeys = [];
    target.destinations.forEach((destination, index) => {
      const destinationLocation = `${location}.destinations[${index}]`;
      ensureFields(destination, ["kind", "path_template", "mode"], destinationLocation);
      ensureString(destination.kind, `${destinationLocation}.kind`);
      ensureSafePath(destination.path_template, `${destinationLocation}.path_template`, { template: true });
      if (!/^0[0-7]{3,4}$/u.test(destination.mode)) {
        fail("E_AGENT_MANIFEST_PATH", `${destinationLocation}.mode must be an octal mode`, { targetId });
      }
      destinationKeys.push(destination.path_template.normalize("NFC").toLocaleLowerCase("en-US"));
    });
    ensureUnique(destinationKeys, `${location}.destinations`, "E_AGENT_MANIFEST_COLLISION");
    ensureArray(target.transform_ids, `${location}.transform_ids`, { nonEmpty: true });
    target.transform_ids.forEach((transformId) => {
      if (!allowedTransformIds.has(transformId)) {
        fail("E_AGENT_MANIFEST_SCHEMA", `${location} references unknown transform ${transformId}`, { targetId, transformId });
      }
    });
    ensureUnique(target.transform_ids, `${location}.transform_ids`);
    ensureArray(target.support_ids, `${location}.support_ids`);
    target.support_ids.forEach((supportId, index) => ensureString(supportId, `${location}.support_ids[${index}]`));
    ensureUnique(target.support_ids, `${location}.support_ids`);
  }
}

function validateRoles(contract, catalogs) {
  validateIdSequence(contract.expected_role_ids, "expected_role_ids");
  ensureArray(contract.roles, "roles", { nonEmpty: true });
  const roleIds = [];
  contract.roles.forEach((role, index) => {
    const location = `roles[${index}]`;
    ensureFields(role, ["role_id", "execution_profiles"], location);
    ensureString(role.role_id, `${location}.role_id`, "E_AGENT_MANIFEST_INVENTORY");
    if (!SAFE_ID.test(role.role_id)) fail("E_AGENT_MANIFEST_INVENTORY", `${location}.role_id must be a safe role ID`, { roleId: role.role_id });
    roleIds.push(role.role_id);
    ensureFields(role.execution_profiles, TARGET_IDS, `${location}.execution_profiles`, { code: "E_AGENT_MANIFEST_PROFILE" });
    for (const targetId of TARGET_IDS) {
      const profileId = role.execution_profiles[targetId];
      ensureProfileId(profileId, `${location}.execution_profiles.${targetId}`);
      const profile = catalogs.execution.get(profileId);
      if (!profile || profile.target !== targetId) {
        fail("E_AGENT_MANIFEST_PROFILE", `${location} references an unknown or wrong-target execution profile ${profileId}`, {
          roleId: role.role_id,
          targetId,
          profileId,
        });
      }
    }
  });
  ensureUnique(roleIds, "roles", "E_AGENT_MANIFEST_COLLISION");
  const expected = [...contract.expected_role_ids].sort((left, right) => left.localeCompare(right, "en-US"));
  const actual = [...roleIds].sort((left, right) => left.localeCompare(right, "en-US"));
  if (canonicalJson(actual) !== canonicalJson(expected) || canonicalJson(roleIds) !== canonicalJson(expected)) {
    fail("E_AGENT_MANIFEST_INVENTORY", "roles must exactly cover expected_role_ids in sorted order", { expected, actual: roleIds });
  }
}

function validateSupportInventory(contract, catalogs) {
  ensureArray(contract.support_inventory, "support_inventory");
  const canonicalIds = new Set(contract.expected_role_ids);
  const supportIds = [];
  contract.support_inventory.forEach((entry, index) => {
    const location = `support_inventory[${index}]`;
    ensureFields(entry, ["support_id", "target", "native_role_external_id", "execution_profile_id", "assets"], location);
    ensureString(entry.support_id, `${location}.support_id`);
    if (!/^(?:codex|cursor|kiro-cli):[a-z][a-z0-9-]*$/u.test(entry.support_id)) {
      fail("E_AGENT_MANIFEST_INVENTORY", `${location}.support_id must be target-qualified`, { supportId: entry.support_id });
    }
    supportIds.push(entry.support_id);
    if (!TARGET_IDS.includes(entry.target) || !entry.support_id.startsWith(`${entry.target}:`)) {
      fail("E_AGENT_MANIFEST_TARGET", `${location} target does not match support_id`, { supportId: entry.support_id });
    }
    const unqualifiedId = entry.support_id.slice(entry.support_id.indexOf(":") + 1);
    if (canonicalIds.has(unqualifiedId)) {
      fail("E_AGENT_MANIFEST_INVENTORY", `${entry.support_id} collides with canonical role inventory`, { supportId: entry.support_id });
    }
    ensureString(entry.native_role_external_id, `${location}.native_role_external_id`);
    ensureProfileId(entry.execution_profile_id, `${location}.execution_profile_id`);
    const profile = catalogs.execution.get(entry.execution_profile_id);
    if (!profile || profile.target !== entry.target) {
      fail("E_AGENT_MANIFEST_PROFILE", `${location} references an unknown or wrong-target execution profile`, {
        supportId: entry.support_id,
      });
    }
    ensureArray(entry.assets, `${location}.assets`, { nonEmpty: true });
    const destinations = [];
    entry.assets.forEach((asset, assetIndex) => {
      const assetLocation = `${location}.assets[${assetIndex}]`;
      ensureFields(asset, ["kind", "source", "destination", "mode"], assetLocation);
      ensureString(asset.kind, `${assetLocation}.kind`);
      ensureSafePath(asset.source, `${assetLocation}.source`);
      ensureSafePath(asset.destination, `${assetLocation}.destination`);
      if (!/^0[0-7]{3,4}$/u.test(asset.mode)) fail("E_AGENT_MANIFEST_PATH", `${assetLocation}.mode must be octal`, { supportId: entry.support_id });
      destinations.push(`${entry.target}:${asset.destination.normalize("NFC").toLocaleLowerCase("en-US")}`);
    });
    ensureUnique(destinations, `${location}.assets`, "E_AGENT_MANIFEST_COLLISION");
  });
  ensureUnique(supportIds, "support_inventory", "E_AGENT_MANIFEST_COLLISION");
  for (const targetId of TARGET_IDS) {
    const expected = [...contract.targets[targetId].support_ids].sort();
    const actual = contract.support_inventory.filter(({ target }) => target === targetId).map(({ support_id: supportId }) => supportId).sort();
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      fail("E_AGENT_MANIFEST_INVENTORY", `support inventory for ${targetId} does not match its target declaration`, { expected, actual });
    }
  }
}

export function validateAgentProjectionContract(contract) {
  validateRoleEquality(contract);
  ensureFields(contract, [
    "schema_version", "projector_version", "expected_role_ids", "allowed_transform_ids", "defaults",
    "profiles", "targets", "roles", "support_inventory",
  ], "agent projection contract");
  if (contract.schema_version !== 1) fail("E_AGENT_MANIFEST_SCHEMA", "schema_version must be 1", {});
  ensureString(contract.projector_version, "projector_version");
  if (!SEMVER.test(contract.projector_version)) fail("E_AGENT_MANIFEST_SCHEMA", "projector_version must be semantic", {});
  ensureFields(contract.defaults, ["canonical_model_profile_id"], "defaults");
  if (contract.defaults.canonical_model_profile_id !== "inherit") {
    fail("E_AGENT_MANIFEST_PROFILE", "canonical model profile default must be inherit", {});
  }
  ensureArray(contract.allowed_transform_ids, "allowed_transform_ids", { nonEmpty: true });
  contract.allowed_transform_ids.forEach((transformId, index) => ensureString(transformId, `allowed_transform_ids[${index}]`));
  ensureUnique(contract.allowed_transform_ids, "allowed_transform_ids");
  const catalogs = validateProfileCatalog(contract.profiles);
  validateTargets(contract.targets, new Set(contract.allowed_transform_ids));
  validateRoles(contract, catalogs);
  validateSupportInventory(contract, catalogs);
  return deepFreeze(contract);
}

export function loadAgentProjectionContract({ projectionPath } = {}) {
  if (typeof projectionPath !== "string" || projectionPath.length === 0) {
    fail("E_AGENT_MANIFEST_IO", "projectionPath is required", {});
  }
  let contract;
  try {
    contract = JSON.parse(fs.readFileSync(projectionPath, "utf8"));
  } catch (error) {
    fail("E_AGENT_MANIFEST_IO", `could not read agent projection contract: ${error.message}`, { projectionPath }, { cause: error });
  }
  return validateAgentProjectionContract(contract);
}

function validateAgentIr(agentIr, projectionContract) {
  ensureFields(agentIr, ["schema_version", "canonical_set_digest", "roles"], "agentIr", { code: "E_AGENT_MANIFEST_INVENTORY" });
  if (agentIr.schema_version !== 1 || !SHA256.test(agentIr.canonical_set_digest)) {
    fail("E_AGENT_MANIFEST_INVENTORY", "Agent IR version or canonical-set digest is invalid", {});
  }
  const expected = projectionContract.expected_role_ids;
  const actual = agentIr.roles.map(({ role_id: roleId }) => roleId);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail("E_AGENT_MANIFEST_INVENTORY", "Agent IR does not match projection contract inventory", { expected, actual });
  }
}

function validateOverlayBindings(overlays, contract) {
  ensureMapping(overlays, "overlays", "E_AGENT_MANIFEST_TARGET");
  ensureFields(overlays, TARGET_IDS, "overlays", { code: "E_AGENT_MANIFEST_TARGET" });
  for (const targetId of TARGET_IDS) {
    const projection = overlays[targetId]?.agent_projection;
    ensureMapping(projection, `overlays.${targetId}.agent_projection`, "E_AGENT_MANIFEST_TARGET");
    const target = contract.targets[targetId];
    if (
      projection.adapter_id !== target.adapter_id
      || projection.representation !== target.representation
      || projection.projector_version !== contract.projector_version
      || projection.schema_version !== contract.schema_version
    ) {
      fail("E_AGENT_MANIFEST_TARGET", `overlay ${targetId} does not match the projection contract identity`, { targetId });
    }
    if (canonicalJson(projection.canonical_roles) !== canonicalJson(contract.expected_role_ids)) {
      fail("E_AGENT_MANIFEST_INVENTORY", `overlay ${targetId} has incomplete canonical role coverage`, { targetId });
    }
    if (canonicalJson(projection.destinations) !== canonicalJson(target.destinations)) {
      fail("E_AGENT_MANIFEST_TARGET", `overlay ${targetId} destinations differ from the projection contract`, { targetId });
    }
    if (canonicalJson(projection.transform_ids) !== canonicalJson(target.transform_ids)) {
      fail("E_AGENT_MANIFEST_TARGET", `overlay ${targetId} transforms differ from the projection contract`, { targetId });
    }
    const declaredProfiles = new Set(projection.execution_profile_ids);
    const expectedProfiles = new Set(contract.roles.map((role) => role.execution_profiles[targetId]));
    for (const profileId of expectedProfiles) {
      if (!declaredProfiles.has(profileId)) {
        fail("E_AGENT_MANIFEST_PROFILE", `overlay ${targetId} does not declare required execution profile ${profileId}`, { targetId, profileId });
      }
    }
    for (const profileId of declaredProfiles) {
      const profile = contract.profiles.execution.find(({ id }) => id === profileId);
      if (!profile || profile.target !== targetId) {
        fail("E_AGENT_MANIFEST_PROFILE", `overlay ${targetId} declares unsupported execution profile ${profileId}`, { targetId, profileId });
      }
    }
    const expectedSupport = contract.support_inventory
      .filter(({ target }) => target === targetId)
      .map(({ support_id: supportId }) => supportId.slice(supportId.indexOf(":") + 1));
    const actualSupport = projection.support_inventory.map(({ support_id: supportId }) => supportId);
    if (canonicalJson(actualSupport) !== canonicalJson(expectedSupport)) {
      fail("E_AGENT_MANIFEST_INVENTORY", `overlay ${targetId} support inventory differs from the projection contract`, { targetId });
    }
  }
}

function resolveExecutionPolicy(profile, catalogs) {
  return {
    tools: catalogs.tools.get(profile.tools_profile_id),
    permissions: catalogs.permissions.get(profile.permissions_profile_id),
    model: catalogs.model.get(profile.model_profile_id),
    reasoning: catalogs.reasoning.get(profile.reasoning_profile_id),
    timeout: catalogs.timeout.get(profile.timeout_profile_id),
    output_schema: catalogs.output_schema.get(profile.output_schema_profile_id),
    concurrency: catalogs.concurrency.get(profile.concurrency_profile_id),
  };
}

export function buildAgentManifest({ agentIr, projectionContract, overlays } = {}) {
  const contract = validateAgentProjectionContract(structuredClone(projectionContract));
  validateAgentIr(agentIr, contract);
  validateOverlayBindings(overlays, contract);
  const catalogs = Object.fromEntries(
    Object.entries(contract.profiles).map(([category, profiles]) => [category, new Map(profiles.map((profile) => [profile.id, profile]))]),
  );
  const irByRole = new Map(agentIr.roles.map((role) => [role.role_id, role]));
  const rows = [];
  for (const roleContract of contract.roles) {
    const role = irByRole.get(roleContract.role_id);
    for (const targetId of TARGET_IDS) {
      const target = contract.targets[targetId];
      const executionProfileId = roleContract.execution_profiles[targetId];
      const executionProfile = catalogs.execution.get(executionProfileId);
      rows.push({
        role_id: role.role_id,
        logical_role_id: role.logical_role_id,
        target: targetId,
        adapter_id: target.adapter_id,
        native_role_external_id: target.native_role_external_id_template === null
          ? null
          : target.native_role_external_id_template.replaceAll("{role_id}", role.role_id),
        source_path: role.source_path,
        source_sha256: role.source_sha256,
        description: role.description,
        model_profile_id: role.model_profile_id,
        color: role.color,
        skill_dependencies: [...role.skill_dependencies],
        transform_ids: [...target.transform_ids],
        destinations: target.destinations.map((destination) => ({
          kind: destination.kind,
          path: destination.path_template.replaceAll("{role_id}", role.role_id),
          mode: destination.mode,
        })),
        execution_profile_id: executionProfileId,
        profile_ids: {
          tools: executionProfile.tools_profile_id,
          permissions: executionProfile.permissions_profile_id,
          model: executionProfile.model_profile_id,
          reasoning: executionProfile.reasoning_profile_id,
          timeout: executionProfile.timeout_profile_id,
          output_schema: executionProfile.output_schema_profile_id,
          concurrency: executionProfile.concurrency_profile_id,
        },
        execution_policy: resolveExecutionPolicy(executionProfile, catalogs),
      });
    }
  }
  rows.sort((left, right) =>
    left.logical_role_id.localeCompare(right.logical_role_id, "en-US")
    || left.target.localeCompare(right.target, "en-US"));
  const payload = {
    schema_version: contract.schema_version,
    projector_version: contract.projector_version,
    canonical_set_digest: agentIr.canonical_set_digest,
    rows,
    support_inventory: contract.support_inventory,
  };
  return deepFreeze({ ...payload, manifest_digest: sha256(canonicalJson(payload)) });
}
