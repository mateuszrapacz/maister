import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { SUPPORTED_TARGET_IDS } from "../lib/distribution/targets.mjs";

export class ShadowParityError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ShadowParityError";
    this.code = "E_SHADOW_PARITY";
    this.details = details;
  }
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const PARITY_BASELINE_SCHEMA_VERSION = 2;
const OBSERVED_CATEGORIES = new Set(["inventory", "permission", "semantic", "hook", "symlink", "topology"]);
const EXPECTED_CATEGORIES = new Set(["packaging", "expected-deletion"]);
const ENTRY_TYPES = new Set(["file", "directory", "symlink"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const MODES = /^0[0-7]{3,4}$/u;

function parityGlobRegex(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") {
        index += 1;
        expression += "(?:.*/)?";
      } else expression += ".*";
    } else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else expression += /[\\^$+.()|{}\[\]]/u.test(character) ? `\\${character}` : character;
  }
  return new RegExp(`${expression}$`, "u");
}

function baselineError(code, message, details = {}) {
  const error = new ShadowParityError(`[${code}] ${message}`, details);
  error.code = code;
  throw error;
}

function validateExactPath(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) {
    baselineError("E_PARITY_BASELINE_PATH", `${field} must be a relative target path`, { field, value });
  }
  if (value.includes("*") || value.includes("?")) {
    baselineError("E_PARITY_BASELINE_SCOPE", `${field} exact paths cannot contain wildcards`, { field, value });
  }
  return value;
}

function validatePattern(value, field, maxMatches) {
  if (typeof value !== "string" || value.length === 0 || value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) {
    baselineError("E_PARITY_BASELINE_PATH", `${field} must be a relative target pattern`, { field, value });
  }
  const literalSegments = value.split("/").filter((segment) => !["*", "**", "?"].includes(segment) && !/[?*]/u.test(segment));
  if (value === "*" || value === "**" || value === "**/*" || value.startsWith("**") || literalSegments.length < 2) {
    baselineError("E_PARITY_BASELINE_SCOPE", `${field} is broader than an approved constrained pattern`, { field, value });
  }
  if (value.includes("**") && !value.endsWith("/**")) {
    baselineError("E_PARITY_BASELINE_SCOPE", `${field} may only use a recursive suffix`, { field, value });
  }
  if (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > 64) {
    baselineError("E_PARITY_BASELINE_SCOPE", `${field} requires max_matches between 1 and 64`, { field, value, maxMatches });
  }
  return value;
}

function validateObservationSide(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} must describe one observed side`, { field });
  }
  if (typeof value.present !== "boolean") {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field}.present must be boolean`, { field });
  }
  if (!value.present) {
    if (Object.keys(value).some((key) => key !== "present")) {
      baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} absent observations cannot contain entry fields`, { field });
    }
    return Object.freeze({ present: false });
  }
  if (!ENTRY_TYPES.has(value.type) || !MODES.test(value.mode)) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} requires a valid type and mode`, { field, type: value.type, mode: value.mode });
  }
  if (value.type === "file" && (typeof value.sha256 !== "string" || !SHA256.test(value.sha256))) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} file observations require a SHA-256 fingerprint`, { field });
  }
  if (value.type === "symlink" && typeof value.target !== "string") {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} symlink observations require a target`, { field });
  }
  const allowed = new Set(["present", "type", "mode", "sha256", "target"]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} has unknown field ${unknown}`, { field, unknown });
  }
  if (value.type !== "file" && value.sha256 !== undefined) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} only files may carry a SHA-256 fingerprint`, { field });
  }
  if (value.type !== "symlink" && value.target !== undefined) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} only symlinks may carry a target`, { field });
  }
  return Object.freeze({
    present: true,
    type: value.type,
    mode: value.mode,
    ...(value.sha256 === undefined ? {} : { sha256: value.sha256 }),
    ...(value.target === undefined ? {} : { target: value.target }),
  });
}

function validateObservation(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} must contain legacy and materialized observations`, { field });
  }
  if (!Object.hasOwn(value, "legacy") || !Object.hasOwn(value, "materialized")) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} must contain both legacy and materialized sides`, { field });
  }
  return Object.freeze({
    legacy: validateObservationSide(value.legacy, `${field}.legacy`),
    materialized: validateObservationSide(value.materialized, `${field}.materialized`),
  });
}

function validateObservationMap(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    baselineError("E_PARITY_BASELINE_OBSERVATION", `${field} must be a non-empty path-to-observation map`, { field });
  }
  const observations = {};
  for (const [observationPath, observation] of Object.entries(value)) {
    validateExactPath(observationPath, `${field}.${observationPath}`);
    observations[observationPath] = validateObservation(observation, `${field}.${observationPath}`);
  }
  return Object.freeze(observations);
}

function observationForExactPath(rule, exactPath, exactPathCount) {
  if (rule.observations !== undefined) {
    const observations = validateObservationMap(rule.observations, `${rule.id}.observations`);
    if (!Object.hasOwn(observations, exactPath)) {
      baselineError("E_PARITY_BASELINE_OBSERVATION", `${rule.id} is missing an observation for ${exactPath}`, { id: rule.id, path: exactPath });
    }
    return observations[exactPath];
  }
  if (rule.observation !== undefined && exactPathCount === 1) {
    return validateObservation(rule.observation, `${rule.id}.observation`);
  }
  baselineError("E_PARITY_BASELINE_OBSERVATION", `${rule.id} requires immutable observations for every exact path`, { id: rule.id, path: exactPath });
}

export function validateParityBaseline(baseline) {
  if (baseline?.__parity_normalized === true) return baseline;
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) {
    baselineError("E_PARITY_BASELINE_SCHEMA", "parity baseline must be an object");
  }
  if (baseline.schema_version !== PARITY_BASELINE_SCHEMA_VERSION) {
    baselineError("E_PARITY_BASELINE_SCHEMA", "unsupported parity baseline schema version", { schema_version: baseline.schema_version });
  }
  if (typeof baseline.baseline_version !== "string" || baseline.baseline_version.length < 3) {
    baselineError("E_PARITY_BASELINE_SCHEMA", "parity baseline requires a version");
  }
  if (!SUPPORTED_TARGET_IDS.includes(baseline.target)) {
    baselineError("E_PARITY_BASELINE_TARGET", "parity baseline target is unsupported", { target: baseline.target });
  }
  if (!Array.isArray(baseline.rules) || baseline.rules.length === 0) {
    baselineError("E_PARITY_BASELINE_SCHEMA", "parity baseline requires rules");
  }
  const ids = new Set();
  const normalizedRules = [];
  for (const rule of baseline.rules) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      baselineError("E_PARITY_BASELINE_SCHEMA", "parity baseline rules must be objects");
    }
    if (typeof rule.id !== "string" || rule.id.length < 3 || ids.has(rule.id)) {
      baselineError("E_PARITY_BASELINE_SCHEMA", "parity baseline rule ids must be unique", { id: rule.id });
    }
    ids.add(rule.id);
    if (rule.target !== undefined && rule.target !== baseline.target) {
      baselineError("E_PARITY_BASELINE_TARGET", "parity rule target does not match its baseline", { id: rule.id, target: rule.target });
    }
    if (!EXPECTED_CATEGORIES.has(rule.category) || !OBSERVED_CATEGORIES.has(rule.observed_category)) {
      baselineError("E_PARITY_BASELINE_CATEGORY", "parity rule categories are invalid", { id: rule.id, category: rule.category, observed_category: rule.observed_category });
    }
    if (typeof rule.rationale !== "string" || rule.rationale.trim().length < 20) {
      baselineError("E_PARITY_BASELINE_SCHEMA", "parity rule rationale must explain the narrow exception", { id: rule.id });
    }
    const exactPaths = [];
    if (rule.path !== undefined) exactPaths.push(validateExactPath(rule.path, `${rule.id}.path`));
    if (rule.paths !== undefined) {
      if (!Array.isArray(rule.paths) || rule.paths.length === 0) {
        baselineError("E_PARITY_BASELINE_SCHEMA", "parity rule paths must be a non-empty array", { id: rule.id });
      }
      for (const value of rule.paths) exactPaths.push(validateExactPath(value, `${rule.id}.paths`));
    }
    if (rule.pattern !== undefined) {
      if (exactPaths.length > 0) {
        baselineError("E_PARITY_BASELINE_SCOPE", "a parity rule cannot combine exact paths and a pattern", { id: rule.id });
      }
      const pattern = validatePattern(rule.pattern, `${rule.id}.pattern`, rule.max_matches);
      const observations = validateObservationMap(rule.observations, `${rule.id}.observations`);
      for (const observationPath of Object.keys(observations)) {
        if (!parityGlobRegex(pattern).test(observationPath)) {
          baselineError("E_PARITY_BASELINE_SCOPE", `${rule.id} observation path is outside its pattern`, { id: rule.id, path: observationPath, pattern });
        }
      }
      normalizedRules.push(Object.freeze({
        ...rule,
        target: baseline.target,
        pattern,
        rule_id: rule.id,
        rule_instance: `${rule.id}::pattern`,
        observations,
      }));
    }
    if (exactPaths.length === 0 && rule.pattern === undefined) {
      baselineError("E_PARITY_BASELINE_SCHEMA", "parity rule requires path, paths, or constrained pattern", { id: rule.id });
    }
    if (new Set(exactPaths).size !== exactPaths.length) {
      baselineError("E_PARITY_BASELINE_SCOPE", `${rule.id} contains duplicate exact paths`, { id: rule.id });
    }
    for (const exactPath of exactPaths) {
      const observation = observationForExactPath(rule, exactPath, exactPaths.length);
      normalizedRules.push(Object.freeze({
        ...rule,
        target: baseline.target,
        path: exactPath,
        rule_id: rule.id,
        rule_instance: `${rule.id}::${exactPath}`,
        observation,
      }));
    }
  }
  return Object.freeze({
    ...baseline,
    __parity_normalized: true,
    rules: Object.freeze(normalizedRules),
  });
}

export function loadParityBaseline(baselinePath, target) {
  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (error) {
    baselineError("E_PARITY_BASELINE_IO", `unable to read parity baseline: ${baselinePath}`, { baselinePath, cause: error.message });
  }
  const validated = validateParityBaseline(baseline);
  if (target !== undefined && validated.target !== target) {
    baselineError("E_PARITY_BASELINE_TARGET", "parity baseline does not match requested target", { target, actual: validated.target });
  }
  return validated;
}

function ruleMatches(rule, pathName) {
  return rule.path === pathName || (rule.pattern !== undefined && parityGlobRegex(rule.pattern).test(pathName));
}

function sensitivePath(pathName) {
  return pathName.startsWith("hooks/")
    || pathName.startsWith("settings/")
    || pathName.startsWith(".codex-plugin/")
    || pathName.startsWith(".cursor-plugin/")
    || pathName.endsWith(".toml")
    || pathName.endsWith(".json")
    || pathName.endsWith(".sh");
}

function assertSafePermissionException(difference, rule) {
  if (difference.category !== "permission") return;
  const modes = [difference.legacy?.mode, difference.materialized?.mode]
    .filter(Boolean)
    .map((mode) => Number.parseInt(mode, 8));
  if (modes.some((mode) => (mode & 0o111) !== 0) || sensitivePath(difference.path)) {
    baselineError("E_PARITY_BASELINE_PERMISSION", "permission baseline cannot exempt executable or sensitive paths", {
      rule: rule.rule_id,
      path: difference.path,
    });
  }
}

function snapshot(root) {
  if (!fs.existsSync(root)) throw new ShadowParityError(`parity root does not exist: ${root}`, { root });
  const entries = new Map();
  const visit = (current, relative = "") => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, item.name);
      const childRelative = relative ? `${relative}/${item.name}` : item.name;
      const stat = fs.lstatSync(child);
      const mode = (stat.mode & 0o7777).toString(8).padStart(4, "0");
      if (stat.isDirectory()) {
        entries.set(childRelative, { path: childRelative, type: "directory", mode });
        visit(child, childRelative);
      } else if (stat.isSymbolicLink()) {
        entries.set(childRelative, { path: childRelative, type: "symlink", mode, target: fs.readlinkSync(child) });
      } else if (stat.isFile()) {
        entries.set(childRelative, { path: childRelative, type: "file", mode, sha256: hashFile(child) });
      }
    }
  };
  visit(root);
  return entries;
}

function categoryFor(pathName, left, right) {
  if (pathName === "hooks" || pathName.startsWith("hooks/")) return "hook";
  if (!left || !right) return "inventory";
  if (left.type !== right.type) return "topology";
  if (left.type === "symlink") return "symlink";
  if (left.mode !== right.mode) return "permission";
  if (left.type === "file") return "semantic";
  return "topology";
}

function observationSide(entry) {
  if (!entry) return { present: false };
  return {
    present: true,
    type: entry.type,
    mode: entry.mode,
    ...(entry.sha256 === undefined ? {} : { sha256: entry.sha256 }),
    ...(entry.target === undefined ? {} : { target: entry.target }),
  };
}

function observedDifference(difference) {
  return {
    legacy: observationSide(difference.legacy),
    materialized: observationSide(difference.materialized),
  };
}

function observationsEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function expectedObservationForRule(rule, entryPath) {
  if (rule.pattern !== undefined) return rule.observations[entryPath];
  return rule.observation;
}

function expectedDifference(pathName, expectedDifferences) {
  return expectedDifferences.find((difference) => (
    typeof difference === "string" ? difference === pathName : difference.path === pathName
  ));
}

export function compareShadowParity({ target, legacyRoot, materializedRoot, baseline, expectedDifferences = [] }) {
  const legacy = snapshot(legacyRoot);
  const materialized = snapshot(materializedRoot);
  const validatedBaseline = baseline === undefined ? null : validateParityBaseline(baseline);
  if (validatedBaseline && validatedBaseline.target !== target) {
    baselineError("E_PARITY_BASELINE_TARGET", "parity baseline does not match parity target", {
      target,
      actual: validatedBaseline.target,
    });
  }
  const paths = [...new Set([...legacy.keys(), ...materialized.keys()])].sort();
  const expected = [];
  const unresolved = [];
  const matchedInstances = new Set();
  const patternMatches = new Map(validatedBaseline?.rules.filter((rule) => rule.pattern !== undefined).map((rule) => [rule.rule_instance, []]) ?? []);
  for (const entryPath of paths) {
    const left = legacy.get(entryPath);
    const right = materialized.get(entryPath);
    if (left && right && JSON.stringify(left) === JSON.stringify(right)) continue;
    const difference = {
      target,
      path: entryPath,
      category: categoryFor(entryPath, left, right),
      legacy: left ?? null,
      materialized: right ?? null,
    };
    if (validatedBaseline) {
      const matchingRules = validatedBaseline.rules.filter((rule) => ruleMatches(rule, entryPath));
      if (matchingRules.length > 1) {
        baselineError("E_PARITY_BASELINE_AMBIGUOUS", "multiple parity rules match one observed difference", {
          path: entryPath,
          rules: matchingRules.map((rule) => rule.rule_id),
        });
      }
      const rule = matchingRules[0];
      if (rule && rule.observed_category !== difference.category) {
        baselineError("E_PARITY_BASELINE_CATEGORY", "parity rule observed category does not match the real difference", {
          path: entryPath,
          rule: rule.rule_id,
          expected: rule.observed_category,
          actual: difference.category,
        });
      }
      if (rule) {
        const expectedObservation = expectedObservationForRule(rule, entryPath);
        if (!expectedObservation || !observationsEqual(observedDifference(difference), expectedObservation)) {
          baselineError("E_PARITY_BASELINE_OBSERVATION", "parity difference does not match its immutable baseline observation", {
            path: entryPath,
            rule: rule.rule_instance,
            expected: expectedObservation ?? null,
            actual: observedDifference(difference),
          });
        }
        assertSafePermissionException(difference, rule);
        matchedInstances.add(rule.rule_instance);
        if (rule.pattern !== undefined) patternMatches.get(rule.rule_instance).push(entryPath);
        expected.push({
          ...difference,
          category: rule.category,
          classification: "expected",
          baseline_version: validatedBaseline.baseline_version,
          baseline_rule: rule.rule_id,
          rationale: rule.rationale,
        });
      } else unresolved.push({ ...difference, classification: "unexplained" });
      continue;
    }
    const expectedEntry = expectedDifference(entryPath, expectedDifferences);
    if (expectedEntry && (typeof expectedEntry === "string" || expectedEntry.category === "packaging")) {
      expected.push({ ...difference, category: "packaging", classification: "expected" });
    } else {
      unresolved.push({ ...difference, classification: "unexplained" });
    }
  }
  if (validatedBaseline) {
    const staleInstances = [];
    for (const rule of validatedBaseline.rules) {
      if (rule.pattern !== undefined) {
        const matches = patternMatches.get(rule.rule_instance) ?? [];
        if (matches.length > rule.max_matches) {
          baselineError("E_PARITY_BASELINE_MATCHES", "parity pattern exceeded max_matches", {
            rule: rule.rule_instance,
            max_matches: rule.max_matches,
            matches,
          });
        }
        if (matches.length === 0) {
          staleInstances.push({ rule: rule.rule_instance, pattern: rule.pattern, reason: "zero-matches" });
          continue;
        }
        for (const observationPath of Object.keys(rule.observations)) {
          if (!matches.includes(observationPath)) {
            staleInstances.push({ rule: `${rule.rule_instance}::${observationPath}`, path: observationPath, reason: "unobserved-pattern-path" });
          }
        }
      } else if (!matchedInstances.has(rule.rule_instance)) {
        staleInstances.push({ rule: rule.rule_instance, path: rule.path, reason: "unobserved-exact-path" });
      }
    }
    if (staleInstances.length > 0) {
      baselineError("E_PARITY_BASELINE_STALE", "parity baseline contains exact or pattern instances not observed in the compared trees", {
        rules: staleInstances,
      });
    }
  }
  return {
    target,
    baseline_version: validatedBaseline?.baseline_version ?? null,
    ok: unresolved.length === 0,
    expected,
    unresolved,
    counts: {
      expected: expected.length,
      unresolved: unresolved.length,
    },
  };
}

export function assertZeroUnresolvedParity(result) {
  if (!result || result.unresolved?.length) {
    throw new ShadowParityError("shadow parity contains unresolved differences", {
      differences: result?.unresolved ?? [],
    });
  }
  return result;
}

function normalizedRelative(value) {
  return value.replaceAll(path.sep, "/").replace(/^\.\//u, "");
}

export const REPOSITORY_TOPOLOGY_POLICY = Object.freeze({
  forbiddenPaths: Object.freeze([
    "plugins/maister-codex",
    "plugins/maister-cursor",
    "plugins/maister-kiro",
    "platforms/codex-cli",
    "platforms/cursor",
    "platforms/kiro-cli",
    ".claude-plugin/marketplace.json",
    ".cursor-plugin/marketplace.json",
    ".agents/plugins/marketplace.json",
  ]),
  forbiddenPatterns: Object.freeze([
    "plugins/maister-(?:codex|cursor|kiro)",
    "(?:^|/)platforms/(?:codex-cli|cursor|kiro-cli)(?:/|$)",
    "(?:^|/)(?:\\.claude-plugin|\\.cursor-plugin)/marketplace\\.json$",
  ]),
  excludePaths: Object.freeze([
    ".maister/tasks",
    "tests/fixtures",
    "tests/platform-independent/evidence-parity-topology.test.mjs",
    "plugins/maister/bin/shadow-parity.mjs",
    "plugins/maister/bin/release-interface.mjs",
  ]),
});

function topologyMatchers({ forbiddenPaths = [], forbiddenPatterns = [], excludePaths = [] }) {
  return {
    forbiddenPaths: forbiddenPaths.map(normalizedRelative),
    patterns: forbiddenPatterns.map((pattern) => pattern instanceof RegExp ? pattern : new RegExp(pattern, "iu")),
    excludes: excludePaths.map(normalizedRelative),
  };
}

function pathMatchesPrefix(candidate, prefixes) {
  return prefixes.some((prefix) => candidate === prefix || candidate.startsWith(`${prefix}/`));
}

function topologyViolationsForFile({ relative, content, forbiddenPaths, patterns }) {
  const violations = [];
  if (pathMatchesPrefix(relative, forbiddenPaths)) {
    violations.push({ path: relative, reason: "forbidden-path" });
  }
  for (const pattern of patterns) {
    if (pattern.test(`${relative}\n${content}`)) {
      violations.push({ path: relative, reason: "forbidden-reference", pattern: pattern.source });
    }
  }
  return violations;
}

export function scanTopology({ root, forbiddenPaths = [], forbiddenPatterns = [], excludePaths = [] }) {
  const violations = [];
  const matchers = topologyMatchers({ forbiddenPaths, forbiddenPatterns, excludePaths });
  const visit = (current, relative = "") => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, item.name);
      const childRelative = relative ? `${relative}/${item.name}` : item.name;
      if (pathMatchesPrefix(childRelative, matchers.excludes)) continue;
      if (pathMatchesPrefix(childRelative, matchers.forbiddenPaths)) {
        violations.push({ path: childRelative, reason: "forbidden-path" });
      }
      if (item.isDirectory()) {
        visit(child, childRelative);
      } else if (item.isFile()) {
        let content = "";
        try { content = fs.readFileSync(child, "utf8"); } catch { return; }
        for (const pattern of matchers.patterns) {
          if (pattern.test(`${childRelative}\n${content}`)) violations.push({ path: childRelative, reason: "forbidden-reference", pattern: pattern.source });
        }
      }
    }
  };
  visit(root);
  return { ok: violations.length === 0, violations };
}

function repositoryTopologyError(code, message, details = {}, cause) {
  const error = new ShadowParityError(`[${code}] ${message}`, details);
  error.code = code;
  if (cause) error.cause = cause;
  throw error;
}

export function scanRepositoryTopology({ root, forbiddenPaths = [], forbiddenPatterns = [], excludePaths = [] }) {
  const resolvedRoot = path.resolve(root);
  let output;
  try {
    output = execFileSync("git", ["-C", resolvedRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    repositoryTopologyError("E_TOPOLOGY_GIT", "cannot enumerate repository topology", { root: resolvedRoot }, error);
  }

  const matchers = topologyMatchers({ forbiddenPaths, forbiddenPatterns, excludePaths });
  const violations = [];
  for (const value of output.split("\0")) {
    if (!value) continue;
    const relative = normalizedRelative(value);
    if (path.isAbsolute(relative) || relative.split("/").includes("..")) {
      repositoryTopologyError("E_TOPOLOGY_GIT", "Git returned a path outside the repository root", { root: resolvedRoot, path: value });
    }
    if (pathMatchesPrefix(relative, matchers.excludes)) continue;

    const candidate = path.resolve(resolvedRoot, relative);
    if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
      repositoryTopologyError("E_TOPOLOGY_GIT", "Git returned a path outside the repository root", { root: resolvedRoot, path: value });
    }

    let stats;
    try {
      stats = fs.lstatSync(candidate);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      repositoryTopologyError("E_TOPOLOGY_READ", "cannot inspect a repository topology candidate", { root: resolvedRoot, path: relative }, error);
    }

    let content = "";
    if (stats.isFile()) {
      try {
        content = fs.readFileSync(candidate, "utf8");
      } catch (error) {
        repositoryTopologyError("E_TOPOLOGY_READ", "cannot read a repository topology candidate", { root: resolvedRoot, path: relative }, error);
      }
    }
    violations.push(...topologyViolationsForFile({
      relative,
      content,
      forbiddenPaths: matchers.forbiddenPaths,
      patterns: matchers.patterns,
    }));
  }
  return { ok: violations.length === 0, violations };
}

export function assertCleanTopology(options) {
  const result = scanTopology(options);
  if (!result.ok) {
    const error = new ShadowParityError("[E_TOPOLOGY_STALE] repository topology contains stale paths or references", result);
    error.code = "E_TOPOLOGY_STALE";
    throw error;
  }
  return result;
}

export function assertCleanRepositoryTopology({ root, ...overrides }) {
  const result = scanRepositoryTopology({ root, ...REPOSITORY_TOPOLOGY_POLICY, ...overrides });
  if (!result.ok) {
    const error = new ShadowParityError("[E_TOPOLOGY_STALE] repository topology contains stale paths or references", result);
    error.code = "E_TOPOLOGY_STALE";
    throw error;
  }
  return result;
}

export { snapshot };

function parseArguments(argv) {
  const options = { topology: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--topology") {
      options.topology = true;
      continue;
    }
    if (["--root", "--target", "--legacy-root", "--materialized-root", "--baseline"].includes(argument)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new ShadowParityError(`${argument} requires a value`);
      options[argument.slice(2).replaceAll("-", "_")] = value;
      continue;
    }
    throw new ShadowParityError(`unknown argument: ${argument}`);
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.topology) {
      const result = assertCleanRepositoryTopology({ root: path.resolve(options.root ?? ".") });
      process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
    } else {
      if (!options.target || !options.legacy_root || !options.materialized_root || !options.baseline) {
        throw new ShadowParityError("--target, --legacy-root, --materialized-root, and --baseline are required");
      }
      const result = assertZeroUnresolvedParity(compareShadowParity({
        target: options.target,
        legacyRoot: path.resolve(options.legacy_root),
        materializedRoot: path.resolve(options.materialized_root),
        baseline: loadParityBaseline(path.resolve(options.baseline), options.target),
      }));
      process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
    }
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      error: { code: error.code ?? "E_SHADOW_PARITY", message: error.message, details: error.details ?? {} },
    })}\n`);
    process.exitCode = 1;
  }
}
