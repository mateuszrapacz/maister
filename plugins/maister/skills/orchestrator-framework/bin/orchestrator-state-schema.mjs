import crypto from "node:crypto";

import { validateDispatchTerminalResult } from "./agent-runtime/dispatch-contract.mjs";

const ROOT_FIELDS = new Set(["orchestrator", "task", "phases"]);
const PHASE_STATUSES = new Set(["pending", "in_progress", "completed", "skipped", "failed", "blocked"]);
const GATE_STATUSES = new Set(["advisor_pending", "arbiter_pending", "user_pending", "decided", "blocked"]);
const POLICIES = new Set(["manual", "advisor", "fully_automatic"]);
const ACTORS = new Set(["system", "advisor", "arbiter", "user"]);
const CONFIDENCE = new Set(["high", "medium", "low", null]);
const ATTEMPT_STATUSES = new Set(["started", "completed", "failed", "interrupted"]);
const WORK_STATUSES = new Set(["ready", "in_progress", "completed", "blocked"]);
const OUTBOX_KINDS = new Set(["same_phase_work_item", "phase_entry"]);
const OUTBOX_STATUSES = new Set(["pending", "claimed", "acknowledged", "blocked"]);

const GATE_FIELDS = [
  "schema_version", "idempotency_key", "phase_id", "gate_type", "question", "options",
  "original_recommendation", "configured_policy", "policy", "safety_classification", "status",
  "selected_option", "final_actor", "rationale", "confidence", "escalate_to_user", "user_override",
  "error", "advisor", "arbiter", "continuation", "provenance_kind", "legacy_record", "created_at",
  "updated_at", "decided_at",
];
const ROLE_FIELDS = ["logical_role_id", "dispatch_id", "terminal_dispatch", "response", "attempts", "exhausted"];
const RESPONSE_FIELDS = ["selected_option", "rationale", "confidence", "escalate_to_user"];
const ATTEMPT_FIELDS = ["number", "dispatch_id", "terminal_dispatch", "status", "started_at", "completed_at", "error"];
const WORK_FIELDS = ["id", "ordinal", "status", "source_gate_key", "selected_option"];
const OUTBOX_FIELDS = [
  "dispatch_id", "source_gate_key", "kind", "phase_id", "target_id", "status", "attempts",
  "claim_token", "claimed_at", "lease_expires_at", "checkpoint", "acknowledged_at", "error",
];

export class StateValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "StateValidationError";
  }
}

function invalid(message) {
  throw new StateValidationError(message);
}

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields, location) {
  if (!isMapping(value)) invalid(`${location} must be a mapping`);
  const allowed = new Set(fields);
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) invalid(`${location} is missing ${missing}`);
  const unknown = Object.keys(value).find((field) => !allowed.has(field));
  if (unknown) invalid(`${location} has unknown field ${unknown}`);
}

function nonEmptyString(value, location, { nullable = false, stable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) invalid(`${location} must be a non-empty NUL-free string${nullable ? " or null" : ""}`);
  if (stable && /[\s/\\]/u.test(value)) invalid(`${location} must be a stable identifier`);
}

function integer(value, location, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) invalid(`${location} must be an integer >= ${minimum}`);
}

function boolean(value, location) {
  if (typeof value !== "boolean") invalid(`${location} must be boolean`);
}

function timestamp(value, location, nullable = false) {
  if (nullable && value === null) return;
  nonEmptyString(value, location);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) || Number.isNaN(Date.parse(value))) {
    invalid(`${location} must be a UTC RFC 3339 timestamp${nullable ? " or null" : ""}`);
  }
}

function uniqueStrings(values, location, { stable = false } = {}) {
  if (!Array.isArray(values)) invalid(`${location} must be a sequence`);
  values.forEach((value, index) => nonEmptyString(value, `${location}[${index}]`, { stable }));
  if (new Set(values).size !== values.length) invalid(`${location} must contain unique values`);
}

function findKeyPaths(value, wantedKey, pathParts = [], matches = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => findKeyPaths(child, wantedKey, [...pathParts, `[${index}]`], matches));
    return matches;
  }
  if (!isMapping(value)) return matches;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (key === wantedKey) matches.push(childPath.join("."));
    findKeyPaths(child, wantedKey, childPath, matches);
  }
  return matches;
}

function assertCanonicalAnchors(state, { legacy = false } = {}) {
  const anchors = [
    ["orchestrator", "orchestrator", true],
    ["task", "task", true],
    ["phases", "phases", true],
    ["gate_history", "orchestrator.gate_history", true],
    ["work", "orchestrator.work", !legacy],
    ["dispatch_outbox", "orchestrator.dispatch_outbox", !legacy],
  ];
  anchors.forEach(([key, canonicalPath, required]) => {
    const paths = findKeyPaths(state, key);
    if ((required && paths.length !== 1) || paths.some((candidate) => candidate !== canonicalPath)) invalid(`${canonicalPath} must exist exactly once at its canonical anchor`);
  });
}

function scalarFromYaml(raw, location) {
  const value = raw.trim();
  if (value === "[]") return [];
  if (value === "{}") return {};
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    if (body.length === 0) return [];
    const values = [];
    let start = 0;
    let quote = null;
    for (let index = 0; index <= body.length; index += 1) {
      const character = body[index];
      if (quote === '"' && character === "\\") {
        index += 1;
        continue;
      }
      if (character === '"' || character === "'") {
        if (quote === null) quote = character;
        else if (quote === character && (quote !== "'" || body[index + 1] !== "'")) quote = null;
        else if (quote === "'" && body[index + 1] === "'") index += 1;
      }
      if ((character === "," && quote === null) || index === body.length) {
        const item = body.slice(start, index).trim();
        if (item.length === 0) invalid(`${location} has an empty inline sequence item`);
        values.push(scalarFromYaml(item, location));
        start = index + 1;
      }
    }
    if (quote !== null) invalid(`${location} has an unterminated quoted scalar`);
    return values;
  }
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:0|[1-9]\d*)$/u.test(value)) return Number(value);
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "string") invalid(`${location} must be a scalar string`);
      return parsed;
    } catch (error) {
      if (error instanceof StateValidationError) throw error;
      invalid(`${location} has an invalid double-quoted scalar`);
    }
  }
  if (value.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/u.test(value)) invalid(`${location} has an invalid single-quoted scalar`);
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value.startsWith("[") || value.startsWith("{") || value.startsWith("&") || value.startsWith("*") || value.startsWith("!")) {
    invalid(`${location} uses unsupported YAML syntax`);
  }
  return value;
}

function rejectYamlFeatures(line, location) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote === '"' && character === "\\") {
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      if (quote === null) quote = character;
      else if (quote === character && (quote !== "'" || line[index + 1] !== "'")) quote = null;
      else if (quote === "'" && line[index + 1] === "'") index += 1;
      continue;
    }
    if (quote === null && (character === "&" || character === "*" || character === "!")) invalid(`${location} uses YAML anchors, aliases, or tags`);
  }
}

function tokenize(source) {
  if (source.length === 0) invalid("state file is empty");
  const tokens = [];
  const lines = source.split(/\r?\n/u);
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    if (line.includes("\t")) invalid(`line ${lineNumber + 1} contains a tab`);
    const indentation = (line.match(/^ */u) ?? [""])[0].length;
    const content = line.slice(indentation);
    if (content.length === 0 || content.startsWith("#")) continue;
    if (content === "---" || content === "..." || content.startsWith("%")) invalid(`line ${lineNumber + 1} uses unsupported YAML document syntax`);
    if (indentation % 2 !== 0) invalid(`line ${lineNumber + 1} uses non-canonical indentation`);
    rejectYamlFeatures(content, `line ${lineNumber + 1}`);
    const mapping = content.match(/^([A-Za-z_][\w-]*):(?:[ ]?(.*))?$/u);
    if (mapping) {
      tokens.push({ lineNumber: lineNumber + 1, indentation, kind: "map", key: mapping[1], value: mapping[2] ?? "" });
      continue;
    }
    const sequence = content.match(/^-(?:[ ]+(.*))?$/u);
    if (sequence) {
      tokens.push({ lineNumber: lineNumber + 1, indentation, kind: "seq", value: sequence[1] ?? "" });
      continue;
    }
    invalid(`line ${lineNumber + 1} is not canonical YAML`);
  }
  return tokens;
}

class CanonicalYamlParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  parse() {
    if (this.tokens.length === 0 || this.tokens[0].indentation !== 0) invalid("root must start at indentation zero");
    const value = this.parseBlock(0);
    if (this.index !== this.tokens.length) invalid(`unexpected indentation at line ${this.tokens[this.index].lineNumber}`);
    return value;
  }

  parseBlock(indentation) {
    const token = this.tokens[this.index];
    if (!token || token.indentation !== indentation) invalid("nested YAML block has invalid indentation");
    return token.kind === "map" ? this.parseMap(indentation) : this.parseSequence(indentation);
  }

  parseMap(indentation, target = {}) {
    const keys = new Set(Object.keys(target));
    while (this.index < this.tokens.length) {
      const token = this.tokens[this.index];
      if (token.indentation < indentation) break;
      if (token.indentation > indentation || token.kind !== "map") invalid(`unexpected YAML structure at line ${token.lineNumber}`);
      if (keys.has(token.key)) invalid(`duplicate mapping key ${token.key}`);
      keys.add(token.key);
      this.index += 1;
      if (token.value.trim() !== "") {
        target[token.key] = scalarFromYaml(token.value, `${token.key} on line ${token.lineNumber}`);
        continue;
      }
      const next = this.tokens[this.index];
      if (!next || next.indentation <= indentation) invalid(`${token.key} on line ${token.lineNumber} has no value`);
      if (next.indentation !== indentation + 2) invalid(`${token.key} on line ${token.lineNumber} has non-canonical indentation`);
      target[token.key] = this.parseBlock(next.indentation);
    }
    return target;
  }

  parseSequence(indentation) {
    const values = [];
    while (this.index < this.tokens.length) {
      const token = this.tokens[this.index];
      if (token.indentation < indentation) break;
      if (token.indentation > indentation || token.kind !== "seq") invalid(`unexpected YAML sequence structure at line ${token.lineNumber}`);
      this.index += 1;
      const value = token.value.trim();
      if (value === "") {
        const next = this.tokens[this.index];
        if (!next || next.indentation !== indentation + 2) invalid(`empty sequence item on line ${token.lineNumber}`);
        values.push(this.parseBlock(next.indentation));
        continue;
      }
      const inline = value.match(/^([A-Za-z_][\w-]*):(?:[ ]?(.*))?$/u);
      if (inline) {
        if ((inline[2] ?? "").trim() === "") invalid(`${inline[1]} on line ${token.lineNumber} has no value`);
        const item = { [inline[1]]: scalarFromYaml(inline[2], `${inline[1]} on line ${token.lineNumber}`) };
        const next = this.tokens[this.index];
        if (next && next.indentation > indentation) {
          if (next.indentation !== indentation + 2 || next.kind !== "map") invalid(`sequence mapping on line ${token.lineNumber} has invalid indentation`);
          this.parseMap(next.indentation, item);
        }
        values.push(item);
        continue;
      }
      values.push(scalarFromYaml(value, `sequence item on line ${token.lineNumber}`));
      const next = this.tokens[this.index];
      if (next && next.indentation > indentation) invalid(`scalar sequence item on line ${token.lineNumber} has a nested value`);
    }
    return values;
  }
}

export function parseCanonicalYaml(source) {
  if (typeof source !== "string") invalid("state input must be text");
  return new CanonicalYamlParser(tokenize(source)).parse();
}

function yamlScalar(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function serialize(value, indentation, lines, sequenceItem = false) {
  const prefix = " ".repeat(indentation);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    value.forEach((item) => {
      if (isMapping(item)) {
        const entries = Object.entries(item);
        const [firstKey, firstValue] = entries[0];
        if (isMapping(firstValue) || (Array.isArray(firstValue) && firstValue.length > 0)) {
          lines.push(`${prefix}- ${firstKey}:`);
          const nested = serialize(firstValue, indentation + 4, lines);
          if (nested !== undefined) lines[lines.length - 1] += ` ${nested}`;
        } else {
          lines.push(`${prefix}- ${firstKey}: ${Array.isArray(firstValue) ? "[]" : yamlScalar(firstValue)}`);
        }
        entries.slice(1).forEach(([key, child]) => writeMappingEntry(key, child, indentation + 2, lines));
      } else {
        lines.push(`${prefix}- ${yamlScalar(item)}`);
      }
    });
    return undefined;
  }
  if (isMapping(value)) {
    if (Object.keys(value).length === 0) return "{}";
    Object.entries(value).forEach(([key, child]) => writeMappingEntry(key, child, indentation, lines));
    return undefined;
  }
  if (sequenceItem) lines.push(`${prefix}- ${yamlScalar(value)}`);
  return yamlScalar(value);
}

function writeMappingEntry(key, value, indentation, lines) {
  const prefix = " ".repeat(indentation);
  if ((Array.isArray(value) && value.length === 0) || (isMapping(value) && Object.keys(value).length === 0)) {
    lines.push(`${prefix}${key}: ${Array.isArray(value) ? "[]" : "{}"}`);
    return;
  }
  if (Array.isArray(value) || isMapping(value)) {
    lines.push(`${prefix}${key}:`);
    serialize(value, indentation + 2, lines);
    return;
  }
  lines.push(`${prefix}${key}: ${yamlScalar(value)}`);
}

export function stringifyCanonicalYaml(value) {
  const lines = [];
  serialize(value, 0, lines);
  return `${lines.join("\n")}\n`;
}

function validateResponse(response, location, options) {
  if (response === null) return;
  exactFields(response, RESPONSE_FIELDS, location);
  nonEmptyString(response.selected_option, `${location}.selected_option`);
  if (!options.includes(response.selected_option)) invalid(`${location}.selected_option is not in gate options`);
  nonEmptyString(response.rationale, `${location}.rationale`);
  if (!CONFIDENCE.has(response.confidence) || response.confidence === null) invalid(`${location}.confidence is unsupported`);
  boolean(response.escalate_to_user, `${location}.escalate_to_user`);
}

function validateTerminalDispatch(value, location, logicalRoleId, dispatchId) {
  if (value === null) return;
  let terminal;
  try {
    terminal = validateDispatchTerminalResult(value);
  } catch (error) {
    invalid(`${location} is not a validated terminal dispatch result: ${error.message}`);
  }
  if (terminal.requested_logical_role_id !== logicalRoleId || terminal.dispatch_id !== dispatchId) {
    invalid(`${location} does not match its persisted role and dispatch identities`);
  }
}

function validateRole(role, location, options) {
  exactFields(role, ROLE_FIELDS, location);
  nonEmptyString(role.logical_role_id, `${location}.logical_role_id`, { nullable: true });
  if (role.logical_role_id !== null && !/^maister:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(role.logical_role_id)) {
    invalid(`${location}.logical_role_id must use exact maister:<role_id> grammar`);
  }
  nonEmptyString(role.dispatch_id, `${location}.dispatch_id`, { nullable: true, stable: true });
  validateResponse(role.response, `${location}.response`, options);
  if (!Array.isArray(role.attempts)) invalid(`${location}.attempts must be a sequence`);
  const numbers = new Set();
  role.attempts.forEach((attempt, index) => {
    const attemptLocation = `${location}.attempts[${index}]`;
    exactFields(attempt, ATTEMPT_FIELDS, attemptLocation);
    integer(attempt.number, `${attemptLocation}.number`, 1);
    if (numbers.has(attempt.number)) invalid(`${location}.attempts has duplicate number ${attempt.number}`);
    numbers.add(attempt.number);
    if (!ATTEMPT_STATUSES.has(attempt.status)) invalid(`${attemptLocation}.status is unsupported`);
    nonEmptyString(attempt.dispatch_id, `${attemptLocation}.dispatch_id`, { stable: true });
    validateTerminalDispatch(attempt.terminal_dispatch, `${attemptLocation}.terminal_dispatch`, role.logical_role_id, attempt.dispatch_id);
    timestamp(attempt.started_at, `${attemptLocation}.started_at`);
    timestamp(attempt.completed_at, `${attemptLocation}.completed_at`, true);
    nonEmptyString(attempt.error, `${attemptLocation}.error`, { nullable: true });
    if ((attempt.status === "started") !== (attempt.completed_at === null)) invalid(`${attemptLocation}.completed_at conflicts with status`);
    if (attempt.status === "started" && attempt.terminal_dispatch !== null) invalid(`${attemptLocation}.started attempt cannot have terminal dispatch evidence`);
  });
  if (role.terminal_dispatch !== null) {
    validateTerminalDispatch(role.terminal_dispatch, `${location}.terminal_dispatch`, role.logical_role_id, role.attempts.at(-1)?.dispatch_id);
  }
  boolean(role.exhausted, `${location}.exhausted`);
}

function validateGate(gate, index, phaseIds) {
  const location = `orchestrator.gate_history[${index}]`;
  exactFields(gate, GATE_FIELDS, location);
  if (gate.schema_version !== 2) invalid(`${location}.schema_version must be 2`);
  nonEmptyString(gate.idempotency_key, `${location}.idempotency_key`);
  nonEmptyString(gate.phase_id, `${location}.phase_id`, { stable: true });
  if (!phaseIds.has(gate.phase_id)) invalid(`${location}.phase_id is not a phase`);
  nonEmptyString(gate.gate_type, `${location}.gate_type`, { stable: true });
  nonEmptyString(gate.question, `${location}.question`);
  uniqueStrings(gate.options, `${location}.options`);
  nonEmptyString(gate.original_recommendation, `${location}.original_recommendation`);
  if (!gate.options.includes(gate.original_recommendation)) invalid(`${location}.original_recommendation is not in options`);
  if (!POLICIES.has(gate.configured_policy) || !POLICIES.has(gate.policy)) invalid(`${location} has unsupported policy`);
  nonEmptyString(gate.safety_classification, `${location}.safety_classification`, { stable: true });
  if (!GATE_STATUSES.has(gate.status)) invalid(`${location}.status is unsupported`);
  nonEmptyString(gate.selected_option, `${location}.selected_option`, { nullable: true });
  if (gate.selected_option !== null && !gate.options.includes(gate.selected_option)) invalid(`${location}.selected_option is not in options`);
  if (!ACTORS.has(gate.final_actor)) invalid(`${location}.final_actor is unsupported`);
  nonEmptyString(gate.rationale, `${location}.rationale`, { nullable: true });
  if (!CONFIDENCE.has(gate.confidence)) invalid(`${location}.confidence is unsupported`);
  boolean(gate.escalate_to_user, `${location}.escalate_to_user`);
  boolean(gate.user_override, `${location}.user_override`);
  nonEmptyString(gate.error, `${location}.error`, { nullable: true });
  validateRole(gate.advisor, `${location}.advisor`, gate.options);
  validateRole(gate.arbiter, `${location}.arbiter`, gate.options);
  if (gate.continuation !== null && !isMapping(gate.continuation)) invalid(`${location}.continuation must be a mapping or null`);
  if (gate.provenance_kind !== "complete" && gate.provenance_kind !== "legacy") invalid(`${location}.provenance_kind is unsupported`);
  if (gate.provenance_kind === "complete" && gate.legacy_record !== null) invalid(`${location}.legacy_record must be null for complete provenance`);
  if (gate.provenance_kind === "legacy" && !isMapping(gate.legacy_record)) invalid(`${location}.legacy_record must preserve the prior mapping`);
  timestamp(gate.created_at, `${location}.created_at`);
  timestamp(gate.updated_at, `${location}.updated_at`);
  timestamp(gate.decided_at, `${location}.decided_at`, true);
  const terminal = gate.status === "decided" || gate.status === "blocked";
  if (terminal !== (gate.decided_at !== null)) invalid(`${location}.decided_at conflicts with status`);
  if (gate.status === "decided") {
    if (gate.selected_option === null || gate.final_actor === "system") invalid(`${location} decided gate requires a selection and terminal actor`);
  } else if (gate.selected_option !== null || gate.final_actor !== "system") {
    invalid(`${location} pending or blocked gate must have null selection and system actor`);
  }
  if (gate.status === "arbiter_pending" && gate.advisor.response === null) invalid(`${location} requires completed Advisor provenance before Arbiter`);
}

function validateRoleTransition(previousRole, nextRole, location) {
  for (const field of ["logical_role_id", "dispatch_id"]) {
    if (previousRole[field] !== null && nextRole[field] !== previousRole[field]) invalid(`${location}.${field} is immutable once assigned`);
  }
  if (previousRole.terminal_dispatch !== null && JSON.stringify(previousRole.terminal_dispatch) !== JSON.stringify(nextRole.terminal_dispatch)) {
    invalid(`${location}.terminal_dispatch is immutable once recorded`);
  }
  if (nextRole.attempts.length < previousRole.attempts.length) invalid(`${location}.attempts cannot be removed`);
  previousRole.attempts.forEach((attempt, index) => {
    const successor = nextRole.attempts[index];
    if (!successor || successor.number !== attempt.number || successor.dispatch_id !== attempt.dispatch_id) {
      invalid(`${location}.attempts[${index}] identity is immutable`);
    }
    if (attempt.status !== "started" && JSON.stringify(successor) !== JSON.stringify(attempt)) {
      invalid(`${location}.attempts[${index}] is immutable after completion`);
    }
    if (attempt.terminal_dispatch !== null && JSON.stringify(successor.terminal_dispatch) !== JSON.stringify(attempt.terminal_dispatch)) {
      invalid(`${location}.attempts[${index}].terminal_dispatch is immutable once recorded`);
    }
  });
}

function validateWork(work, gates) {
  if (!isMapping(work)) invalid("orchestrator.work must be a mapping");
  Object.entries(work).forEach(([phaseId, inventory]) => {
    const location = `orchestrator.work.${phaseId}`;
    exactFields(inventory, ["inventory_version", "items"], location);
    nonEmptyString(inventory.inventory_version, `${location}.inventory_version`);
    if (!Array.isArray(inventory.items)) invalid(`${location}.items must be a sequence`);
    const ids = new Set();
    const ordinals = new Set();
    inventory.items.forEach((item, index) => {
      const itemLocation = `${location}.items[${index}]`;
      exactFields(item, WORK_FIELDS, itemLocation);
      nonEmptyString(item.id, `${itemLocation}.id`, { stable: true });
      integer(item.ordinal, `${itemLocation}.ordinal`, 1);
      if (ids.has(item.id) || ordinals.has(item.ordinal)) invalid(`${location}.items has duplicate identity`);
      ids.add(item.id);
      ordinals.add(item.ordinal);
      if (!WORK_STATUSES.has(item.status)) invalid(`${itemLocation}.status is unsupported`);
      nonEmptyString(item.source_gate_key, `${itemLocation}.source_gate_key`, { nullable: true });
      nonEmptyString(item.selected_option, `${itemLocation}.selected_option`, { nullable: true });
      if (item.status === "completed") {
        const gate = gates.get(item.source_gate_key);
        if (!gate || gate.status !== "decided" || item.selected_option !== gate.selected_option) invalid(`${itemLocation} completion lacks its terminal source selection`);
      }
    });
  });
}

function validateOutbox(outbox, gateKeys, phaseIds) {
  if (!Array.isArray(outbox)) invalid("orchestrator.dispatch_outbox must be a sequence");
  const ids = new Set();
  outbox.forEach((entry, index) => {
    const location = `orchestrator.dispatch_outbox[${index}]`;
    exactFields(entry, OUTBOX_FIELDS, location);
    for (const field of ["dispatch_id", "source_gate_key", "phase_id", "target_id"]) nonEmptyString(entry[field], `${location}.${field}`);
    if (ids.has(entry.dispatch_id)) invalid(`orchestrator.dispatch_outbox has duplicate dispatch_id ${entry.dispatch_id}`);
    ids.add(entry.dispatch_id);
    if (!gateKeys.has(entry.source_gate_key)) invalid(`${location}.source_gate_key is unknown`);
    if (!phaseIds.has(entry.phase_id)) invalid(`${location}.phase_id is unknown`);
    if (!OUTBOX_KINDS.has(entry.kind) || !OUTBOX_STATUSES.has(entry.status)) invalid(`${location} has unsupported kind or status`);
    integer(entry.attempts, `${location}.attempts`, 0);
    for (const field of ["claim_token", "checkpoint", "error"]) nonEmptyString(entry[field], `${location}.${field}`, { nullable: true });
    for (const field of ["claimed_at", "lease_expires_at", "acknowledged_at"]) timestamp(entry[field], `${location}.${field}`, true);
    if (entry.status === "pending" && [entry.claim_token, entry.claimed_at, entry.lease_expires_at, entry.acknowledged_at].some((value) => value !== null)) invalid(`${location} pending claim fields must be null`);
    if (entry.status === "claimed" && [entry.claim_token, entry.claimed_at, entry.lease_expires_at].some((value) => value === null)) invalid(`${location} claimed entry requires claim ownership and lease`);
    if (entry.status === "acknowledged" && (entry.checkpoint === null || entry.acknowledged_at === null)) invalid(`${location} acknowledged entry requires checkpoint and timestamp`);
  });
}

export function validateState(state) {
  if (!isMapping(state)) invalid("root must be a mapping");
  const unknownRoot = Object.keys(state).find((field) => !ROOT_FIELDS.has(field));
  if (unknownRoot || Object.keys(state).length !== ROOT_FIELDS.size) invalid(`root must contain exactly orchestrator, task, and phases${unknownRoot ? `; found ${unknownRoot}` : ""}`);
  assertCanonicalAnchors(state);
  if (!isMapping(state.orchestrator) || !isMapping(state.task) || !Array.isArray(state.phases) || state.phases.length === 0) invalid("root anchors have invalid types");
  const orchestrator = state.orchestrator;
  for (const field of ["schema_version", "revision", "initial_phase", "current_phase", "completed_phases", "failed_phases", "gate_history", "work", "dispatch_outbox"]) {
    if (!Object.hasOwn(orchestrator, field)) invalid(`orchestrator is missing ${field}`);
  }
  if (orchestrator.schema_version !== 2) invalid("orchestrator.schema_version must be 2");
  integer(orchestrator.revision, "orchestrator.revision");
  nonEmptyString(orchestrator.initial_phase, "orchestrator.initial_phase", { stable: true });
  nonEmptyString(orchestrator.current_phase, "orchestrator.current_phase", { stable: true });
  uniqueStrings(orchestrator.completed_phases, "orchestrator.completed_phases", { stable: true });
  uniqueStrings(orchestrator.failed_phases, "orchestrator.failed_phases", { stable: true });
  const phaseIds = new Set();
  state.phases.forEach((phase, index) => {
    if (!isMapping(phase)) invalid(`phases[${index}] must be a mapping`);
    nonEmptyString(phase.id, `phases[${index}].id`, { stable: true });
    if (phaseIds.has(phase.id)) invalid(`phases has duplicate id ${phase.id}`);
    phaseIds.add(phase.id);
    if (!PHASE_STATUSES.has(phase.status)) invalid(`phases[${index}].status is unsupported`);
  });
  if (!phaseIds.has(orchestrator.initial_phase) || !phaseIds.has(orchestrator.current_phase)) invalid("initial_phase and current_phase must name phases");
  const inProgress = state.phases.filter((phase) => phase.status === "in_progress");
  if (inProgress.length !== 1 || inProgress[0].id !== orchestrator.current_phase) invalid("current_phase must be the sole in_progress phase");
  orchestrator.completed_phases.forEach((id) => {
    if (state.phases.find((phase) => phase.id === id)?.status !== "completed") invalid(`completed phase ${id} does not match phase status`);
  });
  orchestrator.failed_phases.forEach((id) => {
    if (state.phases.find((phase) => phase.id === id)?.status !== "failed") invalid(`failed phase ${id} does not match phase status`);
  });
  if (!Array.isArray(orchestrator.gate_history)) invalid("orchestrator.gate_history must be a sequence");
  const gateKeys = new Map();
  orchestrator.gate_history.forEach((gate, index) => {
    validateGate(gate, index, phaseIds);
    if (gateKeys.has(gate.idempotency_key)) invalid(`gate_history has duplicate idempotency_key ${gate.idempotency_key}`);
    gateKeys.set(gate.idempotency_key, gate);
  });
  validateWork(orchestrator.work, gateKeys);
  validateOutbox(orchestrator.dispatch_outbox, new Set(gateKeys.keys()), phaseIds);
  return state;
}

const GATE_TRANSITIONS = {
  advisor_pending: new Set(["advisor_pending", "arbiter_pending", "user_pending", "decided", "blocked"]),
  arbiter_pending: new Set(["arbiter_pending", "user_pending", "decided", "blocked"]),
  user_pending: new Set(["user_pending", "decided", "blocked"]),
  decided: new Set(["decided"]),
  blocked: new Set(["blocked"]),
};
const WORK_TRANSITIONS = {
  ready: new Set(["ready", "in_progress"]),
  in_progress: new Set(["in_progress", "completed", "blocked"]),
  completed: new Set(["completed"]),
  blocked: new Set(["blocked"]),
};
const OUTBOX_TRANSITIONS = {
  pending: new Set(["pending", "claimed", "blocked"]),
  claimed: new Set(["claimed", "acknowledged", "blocked"]),
  acknowledged: new Set(["acknowledged"]),
  blocked: new Set(["blocked"]),
};
const PHASE_TRANSITIONS = {
  pending: new Set(["pending", "in_progress", "skipped", "blocked"]),
  in_progress: new Set(["in_progress", "completed", "failed", "skipped"]),
  completed: new Set(["completed"]),
  skipped: new Set(["skipped"]),
  failed: new Set(["failed"]),
  blocked: new Set(["blocked", "in_progress"]),
};

function objectIndex(values, key) {
  return new Map(values.map((value) => [value[key], value]));
}

export function validateStateTransition(previous, next) {
  validateState(previous);
  validateState(next);
  if (next.orchestrator.revision !== previous.orchestrator.revision + 1) invalid("revision must increment exactly once");
  if (next.orchestrator.initial_phase !== previous.orchestrator.initial_phase) invalid("initial_phase is immutable");
  const previousPhases = objectIndex(previous.phases, "id");
  const nextPhases = objectIndex(next.phases, "id");
  for (const [id, phase] of previousPhases) {
    const successor = nextPhases.get(id);
    if (!successor || !PHASE_TRANSITIONS[phase.status].has(successor.status)) invalid(`phase ${id} has illegal status transition`);
  }
  const previousGates = objectIndex(previous.orchestrator.gate_history, "idempotency_key");
  const nextGates = objectIndex(next.orchestrator.gate_history, "idempotency_key");
  for (const [key, gate] of previousGates) {
    const successor = nextGates.get(key);
    if (!successor) invalid(`gate ${key} cannot be removed`);
    if (!GATE_TRANSITIONS[gate.status].has(successor.status)) invalid(`gate ${key} has illegal status transition`);
    validateRoleTransition(gate.advisor, successor.advisor, `gate ${key}.advisor`);
    validateRoleTransition(gate.arbiter, successor.arbiter, `gate ${key}.arbiter`);
    if (gate.status === "decided" || gate.status === "blocked") {
      const mutableProjectionFields = new Set(["continuation", "updated_at"]);
      const priorDecision = Object.fromEntries(Object.entries(gate).filter(([field]) => !mutableProjectionFields.has(field)));
      const nextDecision = Object.fromEntries(Object.entries(successor).filter(([field]) => !mutableProjectionFields.has(field)));
      if (JSON.stringify(priorDecision) !== JSON.stringify(nextDecision)) invalid(`terminal gate ${key} decision is immutable`);
      if (gate.continuation !== null && JSON.stringify(gate.continuation) !== JSON.stringify(successor.continuation)) invalid(`terminal gate ${key} continuation cannot be replaced`);
    }
  }
  for (const [phaseId, previousInventory] of Object.entries(previous.orchestrator.work)) {
    const nextInventory = next.orchestrator.work[phaseId];
    if (!nextInventory) invalid(`work inventory ${phaseId} cannot be removed`);
    const previousItems = objectIndex(previousInventory.items, "id");
    const nextItems = objectIndex(nextInventory.items, "id");
    for (const [id, item] of previousItems) {
      const successor = nextItems.get(id);
      if (!successor || !WORK_TRANSITIONS[item.status].has(successor.status)) invalid(`work item ${id} has illegal transition`);
    }
  }
  const previousOutbox = objectIndex(previous.orchestrator.dispatch_outbox, "dispatch_id");
  const nextOutbox = objectIndex(next.orchestrator.dispatch_outbox, "dispatch_id");
  for (const [id, entry] of previousOutbox) {
    const successor = nextOutbox.get(id);
    if (!successor || !OUTBOX_TRANSITIONS[entry.status].has(successor.status)) invalid(`dispatch ${id} has illegal transition`);
    for (const field of ["dispatch_id", "source_gate_key", "kind", "phase_id", "target_id"]) {
      if (successor[field] !== entry[field]) invalid(`dispatch ${id}.${field} is immutable`);
    }
  }
  return next;
}

function validateLegacyBase(state) {
  if (!isMapping(state) || Object.keys(state).some((key) => !ROOT_FIELDS.has(key)) || !isMapping(state.orchestrator) || !isMapping(state.task) || !Array.isArray(state.phases)) {
    invalid("unsupported legacy root shape");
  }
  assertCanonicalAnchors(state, { legacy: true });
  const phaseIds = new Set();
  state.phases.forEach((phase, index) => {
    if (!isMapping(phase)) invalid(`legacy phases[${index}] must be a mapping`);
    nonEmptyString(phase.id, `legacy phases[${index}].id`, { stable: true });
    if (phaseIds.has(phase.id)) invalid(`legacy phases has duplicate id ${phase.id}`);
    phaseIds.add(phase.id);
    if (!PHASE_STATUSES.has(phase.status)) invalid(`legacy phases[${index}].status is unsupported`);
  });
  const active = state.phases.filter((phase) => phase.status === "in_progress");
  if (active.length !== 1) invalid("legacy current phase cannot be derived uniquely");
  const current = state.orchestrator.current_phase ?? active[0].id;
  if (current !== active[0].id) invalid("legacy current_phase conflicts with phase status");
  const initial = state.orchestrator.started_phase ?? state.phases[0]?.id;
  if (!phaseIds.has(initial)) invalid("legacy started_phase does not name a phase");
  return { current, initial };
}

export function migrateLegacyState(legacy) {
  if (legacy?.orchestrator?.schema_version === 2) return { state: validateState(legacy), migrated: false };
  if (Object.hasOwn(legacy?.orchestrator ?? {}, "revision") || Object.hasOwn(legacy?.orchestrator ?? {}, "schema_version")) invalid("unsupported legacy schema or revision");
  const { current, initial } = validateLegacyBase(legacy);
  const history = legacy.orchestrator.gate_history;
  if (!Array.isArray(history)) invalid("legacy gate_history must be a sequence");
  const completed = legacy.orchestrator.completed_phases ?? [];
  const failed = legacy.orchestrator.failed_phases ?? [];
  uniqueStrings(completed, "legacy completed_phases", { stable: true });
  uniqueStrings(failed, "legacy failed_phases", { stable: true });
  const extras = Object.fromEntries(Object.entries(legacy.orchestrator).filter(([key]) => !["schema_version", "revision", "started_phase", "initial_phase", "current_phase", "completed_phases", "failed_phases", "gate_history", "work", "dispatch_outbox"].includes(key)));
  const state = {
    orchestrator: {
      schema_version: 2,
      revision: 1,
      initial_phase: initial,
      current_phase: current,
      completed_phases: structuredClone(completed),
      failed_phases: structuredClone(failed),
      gate_history: migrateLegacyHistory(history, legacy.orchestrator, new Set(legacy.phases.map((phase) => phase.id))),
      work: structuredClone(legacy.orchestrator.work ?? {}),
      dispatch_outbox: structuredClone(legacy.orchestrator.dispatch_outbox ?? []),
      ...structuredClone(extras),
    },
    task: structuredClone(legacy.task),
    phases: structuredClone(legacy.phases),
  };
  validateState(state);
  return { state, migrated: true };
}

function legacyTimestamp(orchestrator, field) {
  const candidate = orchestrator[field];
  if (typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(candidate) && !Number.isNaN(Date.parse(candidate))) return candidate;
  return null;
}

function migrateLegacyRole(role, gate, location) {
  const source = role ?? {};
  if (!isMapping(source)) invalid(`${location} must be a mapping`);
  const attempts = source.attempts ?? [];
  if (!Array.isArray(attempts)) invalid(`${location}.attempts must be a sequence`);
  const migratedAttempts = attempts.map((attempt, index) => {
    if (!isMapping(attempt)) invalid(`${location}.attempts[${index}] must be a mapping`);
    const status = attempt.status;
    if (!ATTEMPT_STATUSES.has(status)) invalid(`${location}.attempts[${index}].status is unsupported`);
    if (!Number.isInteger(attempt.number) || attempt.number <= 0 || typeof attempt.started_at !== "string") invalid(`${location}.attempts[${index}] is incomplete`);
    const completedAt = attempt.completed_at ?? null;
    const error = attempt.error ?? null;
    return { number: attempt.number, status, started_at: attempt.started_at, completed_at: completedAt, error };
  });
  const response = source.response ?? null;
  if (response !== null) {
    if (!isMapping(response) || RESPONSE_FIELDS.some((field) => !Object.hasOwn(response, field)) || Object.keys(response).some((field) => !RESPONSE_FIELDS.includes(field))) invalid(`${location}.response is not the exact four-field response`);
    if (!gate.options.includes(response.selected_option)) invalid(`${location}.response selects an illegal option`);
  }
  const active = response !== null || migratedAttempts.length > 0;
  const logicalRoleId = source.logical_role_id ?? (active ? "maister:advisor" : null);
  const dispatchId = source.dispatch_id ?? (active
    ? `legacy-${crypto.createHash("sha256").update(`${gate.idempotency_key}:${location}`).digest("hex")}`
    : null);
  return {
    logical_role_id: logicalRoleId,
    dispatch_id: dispatchId,
    terminal_dispatch: null,
    response: response === null ? null : structuredClone(response),
    attempts: migratedAttempts.map((attempt) => ({
      ...attempt,
      dispatch_id: `${dispatchId}-${attempt.number}`,
      terminal_dispatch: null,
    })),
    exhausted: source.exhausted ?? false,
  };
}

function migrateLegacyHistory(history, orchestrator, phaseIds) {
  const createdAt = legacyTimestamp(orchestrator, "created");
  const updatedAt = legacyTimestamp(orchestrator, "updated") ?? createdAt;
  const keys = new Set();
  return history.map((record, index) => {
    const location = `legacy gate_history[${index}]`;
    if (!isMapping(record) || record.schema_version !== 1) invalid(`${location} has an unsupported shape`);
    for (const field of ["idempotency_key", "phase_id", "gate_type", "question", "options", "original_recommendation", "status"]) {
      if (!Object.hasOwn(record, field)) invalid(`${location} is missing identity field ${field}`);
    }
    nonEmptyString(record.idempotency_key, `${location}.idempotency_key`);
    if (keys.has(record.idempotency_key)) invalid(`${location} duplicates idempotency_key`);
    keys.add(record.idempotency_key);
    if (!phaseIds.has(record.phase_id)) invalid(`${location}.phase_id is unknown`);
    uniqueStrings(record.options, `${location}.options`);
    if (!record.options.includes(record.original_recommendation)) invalid(`${location}.original_recommendation is illegal`);
    const status = record.status === "pending" ? "user_pending" : record.status;
    if (!GATE_STATUSES.has(status)) invalid(`${location}.status is unsupported`);
    const selected = record.selected_option ?? null;
    const actor = record.final_actor ?? "system";
    if (status === "decided" && (!record.options.includes(selected) || !ACTORS.has(actor) || actor === "system")) invalid(`${location} has conflicting terminal selection or actor`);
    if (status !== "decided" && (selected !== null || actor !== "system")) invalid(`${location} has preselected pending/blocked fields`);
    if ((status === "decided" || status === "blocked") && updatedAt === null) invalid(`${location} cannot derive a terminal timestamp`);
    if (status !== "decided" && status !== "blocked" && createdAt === null) invalid(`${location} cannot derive a pending timestamp`);
    const advisor = migrateLegacyRole(record.advisor, record, `${location}.advisor`);
    const arbiter = migrateLegacyRole(record.arbiter, record, `${location}.arbiter`);
    const machineProvenance = actor === "advisor" ? advisor.response !== null : actor === "arbiter" ? arbiter.response !== null : actor === "user";
    const hasRoleSubrecords = isMapping(record.advisor) && isMapping(record.arbiter);
    const complete = status !== "decided" || (hasRoleSubrecords && machineProvenance);
    return {
      schema_version: 2,
      idempotency_key: record.idempotency_key,
      phase_id: record.phase_id,
      gate_type: record.gate_type,
      question: record.question,
      options: structuredClone(record.options),
      original_recommendation: record.original_recommendation,
      configured_policy: record.configured_policy ?? record.policy,
      policy: record.policy,
      safety_classification: record.safety_classification,
      status,
      selected_option: selected,
      final_actor: actor,
      rationale: record.rationale ?? null,
      confidence: record.confidence ?? null,
      escalate_to_user: record.escalate_to_user ?? false,
      user_override: record.user_override ?? false,
      error: record.error ?? null,
      advisor,
      arbiter,
      continuation: record.continuation ?? null,
      provenance_kind: complete ? "complete" : "legacy",
      legacy_record: complete ? null : structuredClone(record),
      created_at: createdAt ?? updatedAt,
      updated_at: updatedAt ?? createdAt,
      decided_at: status === "decided" || status === "blocked" ? updatedAt : null,
    };
  });
}
