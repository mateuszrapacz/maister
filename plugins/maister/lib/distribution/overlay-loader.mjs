import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  parseCanonicalYaml,
} from "../../skills/orchestrator-framework/bin/orchestrator-state-schema.mjs";
import {
  OverlayValidationError,
  throwOverlayError,
} from "./errors.mjs";
import { SUPPORTED_TARGET_IDS } from "./targets.mjs";

const LAYOUT_KINDS = new Set(["file", "tree", "template"]);
const OWNERSHIP = new Set(["whole_file", "managed_keys"]);
const SETTING_FORMATS = new Set(["json", "toml", "yaml", "shell"]);
const CAPABILITY_CLASSES = new Set(["semantic", "safety", "persistence", "rollback", "packaging"]);
const EVIDENCE_IDS = new Set(["E1", "E2", "E3", "E4", "E5", "E6"]);
const REQUIRED_PRIMITIVES = [
  "user_gate",
  "delegate_agent",
  "track_progress",
  "resolve_task_root",
  "persist_state",
  "continue_workflow",
];
const OVERLAY_FIELDS = [
  "schema_version",
  "overlay_id",
  "overlay_version",
  "target",
  "layout",
  "settings",
  "semantic_bindings",
  "inventory",
  "validation",
  "capabilities",
  "native_assets",
];
const TARGET_FIELDS = ["id", "host_version_constraint", "discovery_roots"];
const LAYOUT_FIELDS = ["source", "destination", "kind", "mode", "ownership"];
const LAYOUT_OPTIONAL_FIELDS = ["merge"];
const SETTING_FIELDS = ["path", "format", "ownership", "managed_keys", "merge_policy"];
const BINDING_FIELDS = ["adapter", "capability", "fail_closed"];
const INVENTORY_FIELDS = ["required", "optional", "forbidden"];
const VALIDATION_FIELDS = ["forbidden_vocabulary", "executable_paths", "syntax_checks"];
const CAPABILITY_FIELDS = ["class", "required_evidence"];
const NATIVE_ASSET_FIELDS = ["source", "destination", "mode", "sha256"];
const INVENTORY_FIXTURE_FIELDS = ["schema_version", "target", "overlay_version", ...INVENTORY_FIELDS];

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ensureMapping(value, location, code = "E_OVERLAY_SCHEMA") {
  if (!isMapping(value)) throwOverlayError(code, `${location} must be a mapping`, { location });
}

function ensureFields(value, fields, location, code = "E_OVERLAY_SCHEMA", { optional = [] } = {}) {
  ensureMapping(value, location, code);
  const allowed = new Set([...fields, ...optional]);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) {
    throwOverlayError(code, `${location} has unknown field ${unknown}`, { location, field: unknown });
  }
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) {
    throwOverlayError(code, `${location} is missing ${missing}`, { location, field: missing });
  }
}

function ensureString(value, location, code = "E_OVERLAY_SCHEMA") {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throwOverlayError(code, `${location} must be a non-empty NUL-free string`, { location });
  }
}

function ensureBoolean(value, location, code = "E_OVERLAY_SCHEMA") {
  if (typeof value !== "boolean") throwOverlayError(code, `${location} must be boolean`, { location });
}

function ensureInteger(value, location, code = "E_OVERLAY_SCHEMA") {
  if (!Number.isInteger(value)) throwOverlayError(code, `${location} must be an integer`, { location });
}

function ensureArray(value, location, code = "E_OVERLAY_SCHEMA") {
  if (!Array.isArray(value)) throwOverlayError(code, `${location} must be a sequence`, { location });
}

function ensureUnique(values, location, code = "E_OVERLAY_SCHEMA") {
  if (new Set(values).size !== values.length) {
    throwOverlayError(code, `${location} must contain unique values`, { location });
  }
}

function ensureSemver(value, location) {
  ensureString(value, location);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(value)) {
    throwOverlayError("E_OVERLAY_SCHEMA", `${location} must be a semantic version`, { location });
  }
}

function ensureMode(value, location) {
  ensureString(value, location);
  if (!/^0[0-7]{3,4}$/u.test(value)) {
    throwOverlayError("E_OVERLAY_SCHEMA", `${location} must be an octal mode`, { location });
  }
}

function ensureRelativePath(value, location, { allowGlob = false } = {}) {
  ensureString(value, location, "E_OVERLAY_PATH");
  if (
    value.startsWith("/")
    || value.startsWith("~")
    || /^[A-Za-z]:[\\/]/u.test(value)
    || value.includes("\\")
  ) {
    throwOverlayError("E_OVERLAY_PATH", `${location} must be target-relative`, { location, value });
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throwOverlayError("E_OVERLAY_PATH", `${location} contains an unsafe path segment`, { location, value });
  }
  if (!allowGlob && /[*?\[\]{}]/u.test(value)) {
    throwOverlayError("E_OVERLAY_PATH", `${location} cannot contain a glob`, { location, value });
  }
  return path.posix.normalize(value);
}

function ensurePathList(values, location, options = {}) {
  ensureArray(values, location);
  const normalized = values.map((value, index) => ensureRelativePath(value, `${location}[${index}]`, options));
  ensureUnique(normalized, location, "E_OVERLAY_COLLISION");
  return normalized;
}

function normalizedInventoryPath(value) {
  return path.posix.normalize(value).toLocaleLowerCase("en-US");
}

function validateTarget(target) {
  ensureFields(target, TARGET_FIELDS, "target");
  if (!SUPPORTED_TARGET_IDS.includes(target.id)) {
    throwOverlayError("E_OVERLAY_TARGET", `target.id is unsupported: ${target.id}`, { target: target.id });
  }
  ensureString(target.host_version_constraint, "target.host_version_constraint");
  ensurePathList(target.discovery_roots, "target.discovery_roots");
}

function validateLayout(layout) {
  ensureArray(layout, "layout");
  const destinations = new Map();
  layout.forEach((entry, index) => {
    const location = `layout[${index}]`;
    ensureFields(entry, LAYOUT_FIELDS, location, "E_OVERLAY_SCHEMA", { optional: LAYOUT_OPTIONAL_FIELDS });
    if (Object.hasOwn(entry, "merge") && typeof entry.merge !== "boolean") {
      throwOverlayError("E_OVERLAY_SCHEMA", `${location}.merge must be boolean`, { location });
    }
    ensureRelativePath(entry.source, `${location}.source`);
    const destination = ensureRelativePath(entry.destination, `${location}.destination`);
    if (!LAYOUT_KINDS.has(entry.kind)) {
      throwOverlayError("E_OVERLAY_SCHEMA", `${location}.kind is unsupported`, { location });
    }
    ensureMode(entry.mode, `${location}.mode`);
    if (!OWNERSHIP.has(entry.ownership)) {
      throwOverlayError("E_OVERLAY_OWNERSHIP", `${location}.ownership is unsupported`, { location });
    }
    if (entry.ownership === "managed_keys" && entry.kind !== "file") {
      throwOverlayError("E_OVERLAY_OWNERSHIP", `${location} managed_keys ownership requires a file`, { location });
    }
    const key = destination.toLocaleLowerCase("en-US");
    const previous = destinations.get(key);
    if (previous && !previous.merge && !entry.merge) {
      throwOverlayError("E_OVERLAY_COLLISION", "layout destinations must contain unique values", {
        location: "layout destinations",
        destination,
      });
    }
    destinations.set(key, entry);
  });
}

function validateSettings(settings) {
  ensureArray(settings, "settings");
  const paths = [];
  settings.forEach((entry, index) => {
    const location = `settings[${index}]`;
    ensureFields(entry, SETTING_FIELDS, location);
    paths.push(ensureRelativePath(entry.path, `${location}.path`));
    if (!SETTING_FORMATS.has(entry.format)) {
      throwOverlayError("E_OVERLAY_SCHEMA", `${location}.format is unsupported`, { location });
    }
    if (!OWNERSHIP.has(entry.ownership)) {
      throwOverlayError("E_OVERLAY_OWNERSHIP", `${location}.ownership is unsupported`, { location });
    }
    ensurePathList(entry.managed_keys, `${location}.managed_keys`);
    if (entry.ownership === "whole_file" && entry.managed_keys.length > 0) {
      throwOverlayError("E_OVERLAY_OWNERSHIP", `${location}.managed_keys must be empty for whole_file`, { location });
    }
    if (entry.ownership === "managed_keys" && entry.managed_keys.length === 0) {
      throwOverlayError("E_OVERLAY_OWNERSHIP", `${location}.managed_keys must be non-empty`, { location });
    }
    if (entry.merge_policy !== "preserve_unmanaged_refuse_drift") {
      throwOverlayError("E_OVERLAY_OWNERSHIP", `${location}.merge_policy is unsupported`, { location });
    }
  });
  ensureUnique(paths.map((value) => value.toLocaleLowerCase("en-US")), "settings paths", "E_OVERLAY_COLLISION");
}

function validateSemanticBindings(bindings) {
  ensureFields(bindings, REQUIRED_PRIMITIVES, "semantic_bindings", "E_OVERLAY_BINDINGS");
  Object.entries(bindings).forEach(([primitive, binding]) => {
    const location = `semantic_bindings.${primitive}`;
    ensureFields(binding, BINDING_FIELDS, location, "E_OVERLAY_BINDINGS");
    ensureString(binding.adapter, `${location}.adapter`, "E_OVERLAY_BINDINGS");
    ensureString(binding.capability, `${location}.capability`, "E_OVERLAY_BINDINGS");
    ensureBoolean(binding.fail_closed, `${location}.fail_closed`, "E_OVERLAY_BINDINGS");
    if (!binding.fail_closed) {
      throwOverlayError("E_OVERLAY_BINDINGS", `${location}.fail_closed must be true`, { location });
    }
  });
}

function validateInventory(inventory, location = "inventory") {
  ensureFields(inventory, INVENTORY_FIELDS, location);
  const normalized = new Map();
  for (const category of INVENTORY_FIELDS) {
    ensureArray(inventory[category], `${location}.${category}`);
    inventory[category].forEach((entry, index) => {
      const normalizedEntry = ensureRelativePath(entry, `${location}.${category}[${index}]`, { allowGlob: true });
      const key = normalizedInventoryPath(normalizedEntry);
      if (normalized.has(key)) {
        throwOverlayError("E_OVERLAY_COLLISION", `inventory paths collide after normalization: ${entry}`, {
          location,
          path: entry,
          previous: normalized.get(key),
        });
      }
      normalized.set(key, entry);
    });
  }
  return inventory;
}

function validateValidation(validation) {
  ensureFields(validation, VALIDATION_FIELDS, "validation");
  ensurePathList(validation.forbidden_vocabulary, "validation.forbidden_vocabulary");
  ensurePathList(validation.executable_paths, "validation.executable_paths", { allowGlob: true });
  ensureArray(validation.syntax_checks, "validation.syntax_checks");
  validation.syntax_checks.forEach((check, index) => {
    ensureString(check, `validation.syntax_checks[${index}]`);
    if (!/^[a-z]+:[^\s].*$/u.test(check)) {
      throwOverlayError("E_OVERLAY_SCHEMA", `validation.syntax_checks[${index}] must be format:path`, { index });
    }
  });
  ensureUnique(validation.syntax_checks, "validation.syntax_checks");
}

function validateCapabilities(capabilities) {
  ensureMapping(capabilities, "capabilities");
  if (Object.keys(capabilities).length === 0) {
    throwOverlayError("E_OVERLAY_SCHEMA", "capabilities must not be empty", { location: "capabilities" });
  }
  Object.entries(capabilities).forEach(([capability, value]) => {
    const location = `capabilities.${capability}`;
    ensureFields(value, CAPABILITY_FIELDS, location);
    if (!CAPABILITY_CLASSES.has(value.class)) {
      throwOverlayError("E_OVERLAY_SCHEMA", `${location}.class is unsupported`, { location });
    }
    ensureArray(value.required_evidence, `${location}.required_evidence`);
    value.required_evidence.forEach((evidence, index) => {
      if (!EVIDENCE_IDS.has(evidence)) {
        throwOverlayError("E_OVERLAY_SCHEMA", `${location}.required_evidence[${index}] is unsupported`, { location });
      }
    });
    ensureUnique(value.required_evidence, `${location}.required_evidence`);
  });
}

function validateNativeAssets(nativeAssets) {
  ensureArray(nativeAssets, "native_assets");
  const destinations = [];
  nativeAssets.forEach((entry, index) => {
    const location = `native_assets[${index}]`;
    ensureFields(entry, NATIVE_ASSET_FIELDS, location);
    ensureRelativePath(entry.source, `${location}.source`);
    destinations.push(ensureRelativePath(entry.destination, `${location}.destination`));
    ensureMode(entry.mode, `${location}.mode`);
    ensureString(entry.sha256, `${location}.sha256`);
    if (!/^[0-9a-f]{64}$/u.test(entry.sha256)) {
      throwOverlayError("E_OVERLAY_SCHEMA", `${location}.sha256 must be a lowercase SHA-256`, { location });
    }
  });
  ensureUnique(destinations.map((value) => value.toLocaleLowerCase("en-US")), "native asset destinations", "E_OVERLAY_COLLISION");
}

function stringsForVocabularyScan(overlay) {
  return [
    overlay.overlay_id,
    overlay.overlay_version,
    overlay.target.host_version_constraint,
    ...overlay.target.discovery_roots,
    ...overlay.layout.flatMap((entry) => [entry.source, entry.destination]),
    ...overlay.settings.flatMap((entry) => [entry.path, entry.format, ...entry.managed_keys]),
    ...Object.values(overlay.semantic_bindings).flatMap((binding) => [binding.adapter, binding.capability]),
    ...overlay.inventory.required,
    ...overlay.inventory.optional,
    ...overlay.validation.executable_paths,
    ...overlay.validation.syntax_checks,
    ...Object.keys(overlay.capabilities),
    ...overlay.native_assets.flatMap((entry) => [entry.source, entry.destination]),
  ];
}

function validateForbiddenVocabulary(overlay) {
  const vocabulary = overlay.validation.forbidden_vocabulary.map((word) => word.toLocaleLowerCase("en-US"));
  const found = stringsForVocabularyScan(overlay).find((value) => {
    const candidate = value.toLocaleLowerCase("en-US");
    return vocabulary.some((word) => candidate.includes(word));
  });
  if (found !== undefined) {
    throwOverlayError("E_OVERLAY_VOCABULARY", `overlay contains forbidden host vocabulary: ${found}`, { value: found });
  }
}

function compareInventory(overlayInventory, fixtureInventory) {
  const normalize = (inventory) => Object.fromEntries(
    INVENTORY_FIELDS.map((field) => [field, [...inventory[field]]]),
  );
  if (JSON.stringify(normalize(overlayInventory)) !== JSON.stringify(normalize(fixtureInventory))) {
    throwOverlayError("E_OVERLAY_INVENTORY", "overlay inventory differs from the versioned inventory fixture", {});
  }
}

export function parseOverlayYaml(source, sourcePath = "<overlay>") {
  try {
    return parseCanonicalYaml(source);
  } catch (error) {
    if (error instanceof OverlayValidationError) throw error;
    throwOverlayError("E_OVERLAY_PARSE", `could not parse ${sourcePath}: ${error.message}`, { sourcePath }, { cause: error });
  }
}

export function validateOverlay(overlay, { sourcePath = "<overlay>" } = {}) {
  ensureFields(overlay, OVERLAY_FIELDS, "overlay");
  ensureInteger(overlay.schema_version, "schema_version");
  if (overlay.schema_version !== 1) {
    throwOverlayError("E_OVERLAY_SCHEMA", "schema_version must be 1", { sourcePath });
  }
  ensureString(overlay.overlay_id, "overlay_id");
  ensureSemver(overlay.overlay_version, "overlay_version");
  validateTarget(overlay.target);
  if (overlay.overlay_id !== `maister/${overlay.target.id}`) {
    throwOverlayError("E_OVERLAY_SCHEMA", "overlay_id must match target.id", { sourcePath });
  }
  validateLayout(overlay.layout);
  validateSettings(overlay.settings);
  validateSemanticBindings(overlay.semantic_bindings);
  validateInventory(overlay.inventory);
  validateValidation(overlay.validation);
  validateCapabilities(overlay.capabilities);
  validateNativeAssets(overlay.native_assets);
  validateForbiddenVocabulary(overlay);
  return overlay;
}

export function validateInventoryFixture(inventory, { sourcePath = "<inventory>" } = {}) {
  ensureFields(inventory, INVENTORY_FIXTURE_FIELDS, "inventory fixture");
  ensureInteger(inventory.schema_version, "inventory fixture.schema_version");
  if (inventory.schema_version !== 1) {
    throwOverlayError("E_OVERLAY_INVENTORY", "inventory fixture schema_version must be 1", { sourcePath });
  }
  if (!SUPPORTED_TARGET_IDS.includes(inventory.target)) {
    throwOverlayError("E_OVERLAY_TARGET", `inventory fixture target is unsupported: ${inventory.target}`, { sourcePath });
  }
  ensureSemver(inventory.overlay_version, "inventory fixture.overlay_version");
  validateInventory({
    required: inventory.required,
    optional: inventory.optional,
    forbidden: inventory.forbidden,
  }, "inventory fixture");
  return inventory;
}

export function loadOverlay({ overlayPath, inventoryPath }) {
  if (typeof overlayPath !== "string" || typeof inventoryPath !== "string") {
    throwOverlayError("E_OVERLAY_IO", "overlayPath and inventoryPath are required", {});
  }
  let overlaySource;
  let inventorySource;
  try {
    overlaySource = fs.readFileSync(overlayPath, "utf8");
    inventorySource = fs.readFileSync(inventoryPath, "utf8");
  } catch (error) {
    throwOverlayError("E_OVERLAY_IO", `could not read overlay contract: ${error.message}`, {
      overlayPath,
      inventoryPath,
    }, { cause: error });
  }
  const overlay = parseOverlayYaml(overlaySource, overlayPath);
  const inventoryFixture = parseOverlayYaml(inventorySource, inventoryPath);
  validateOverlay(overlay, { sourcePath: overlayPath });
  validateInventoryFixture(inventoryFixture, { sourcePath: inventoryPath });
  if (inventoryFixture.target !== overlay.target.id || inventoryFixture.overlay_version !== overlay.overlay_version) {
    throwOverlayError("E_OVERLAY_INVENTORY", "inventory fixture identity does not match overlay", { overlayPath, inventoryPath });
  }
  compareInventory(overlay.inventory, inventoryFixture);
  return {
    overlay,
    inventory: inventoryFixture,
    inventoryFixture,
    overlayPath: path.resolve(overlayPath),
    inventoryPath: path.resolve(inventoryPath),
    contractHash: crypto.createHash("sha256").update(overlaySource).update(inventorySource).digest("hex"),
  };
}

export { normalizedInventoryPath };
