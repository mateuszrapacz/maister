#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DENYLIST = new Set([
  "rollback",
  "data-integrity-halt",
  "scope-expansion",
  "unresolved-critical-verification",
  "failure-recovery-skip",
  "final-handoff-approval",
  "implementation-approval",
  "production-go-no-go",
]);

const REQUIRED_FIELDS = [
  "state",
  "phase_id",
  "gate_type",
  "question",
  "options",
  "selected_option",
  "actor",
  "confidence",
];

const OPTIONAL_FIELDS = [
  "next_phase",
  "report_md",
  "report_html",
];

const PAYLOAD_FIELDS = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);

function fail(message, code = 2) {
  console.error(`phase_continue: ${message}`);
  process.exit(code);
}

function readTransport(argv) {
  if (argv.length === 0) return fs.readFileSync(0, "utf8");
  if (argv.length !== 2 || argv[0] !== "--input-file" || argv[1].length === 0 || argv[1].startsWith("--")) {
    fail("input transport must be stdin or exactly one --input-file PATH", 2);
  }
  return fs.readFileSync(argv[1], "utf8");
}

class JsonParser {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  parse() {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.source.length) this.error("unexpected trailing input");
    return value;
  }

  parseValue() {
    this.skipWhitespace();
    const character = this.source[this.index];
    if (character === "{") return this.parseObject();
    if (character === "[") return this.parseArray();
    if (character === '"') return this.parseString();
    if (character === "t" && this.consume("true")) return true;
    if (character === "f" && this.consume("false")) return false;
    if (character === "n" && this.consume("null")) return null;
    return this.parseNumber();
  }

  parseObject() {
    const object = {};
    const keys = new Set();
    this.index += 1;
    this.skipWhitespace();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return object;
    }
    while (this.index < this.source.length) {
      this.skipWhitespace();
      if (this.source[this.index] !== '"') this.error("object key must be a string");
      const key = this.parseString();
      if (keys.has(key)) this.error(`duplicate JSON key ${JSON.stringify(key)}`);
      keys.add(key);
      this.skipWhitespace();
      this.expect(":");
      Object.defineProperty(object, key, {
        value: this.parseValue(),
        enumerable: true,
        writable: true,
        configurable: true,
      });
      this.skipWhitespace();
      if (this.source[this.index] === "}") {
        this.index += 1;
        return object;
      }
      this.expect(",");
    }
    this.error("unterminated object");
  }

  parseArray() {
    const array = [];
    this.index += 1;
    this.skipWhitespace();
    if (this.source[this.index] === "]") {
      this.index += 1;
      return array;
    }
    while (this.index < this.source.length) {
      array.push(this.parseValue());
      this.skipWhitespace();
      if (this.source[this.index] === "]") {
        this.index += 1;
        return array;
      }
      this.expect(",");
    }
    this.error("unterminated array");
  }

  parseString() {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const character = this.source[this.index];
      if (character === "\\") {
        this.index += 2;
        continue;
      }
      if (character === '"') {
        this.index += 1;
        const raw = this.source.slice(start, this.index);
        try {
          return JSON.parse(raw);
        } catch {
          this.error("invalid JSON string");
        }
      }
      if (character < " ") this.error("unescaped control character in JSON string");
      this.index += 1;
    }
    this.error("unterminated string");
  }

  parseNumber() {
    const match = this.source.slice(this.index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) this.error("invalid JSON value");
    this.index += match[0].length;
    return Number(match[0]);
  }

  consume(value) {
    if (this.source.startsWith(value, this.index)) {
      this.index += value.length;
      return true;
    }
    return false;
  }

  expect(character) {
    if (this.source[this.index] !== character) this.error(`expected ${character}`);
    this.index += 1;
  }

  skipWhitespace() {
    while (/[ \t\n\r]/u.test(this.source[this.index] ?? "")) this.index += 1;
  }

  error(message) {
    throw new Error(`${message} at character ${this.index + 1}`);
  }
}

function readJsonPayload(input) {
  if (input.trim().length === 0) fail("JSON payload is empty", 2);
  let payload;
  try {
    payload = new JsonParser(input).parse();
  } catch (error) {
    fail(`JSON payload is invalid: ${error.message}`, 2);
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    fail("JSON payload must be an object", 2);
  }
  return payload;
}

function requireNonEmptyString(payload, field) {
  if (typeof payload[field] !== "string") fail(`field ${field} must be a string`, 2);
  if (payload[field].length === 0) fail(`field ${field} must not be empty`, 2);
  if (payload[field].includes("\u0000")) fail(`field ${field} must not contain NUL`, 2);
}

function requireStableIdentifier(payload, field) {
  requireNonEmptyString(payload, field);
  if (/[\s/\\]/u.test(payload[field])) {
    fail(`field ${field} must be a stable identifier without whitespace or path separators`, 2);
  }
}

function validatePayload(payload) {
  const unknown = Object.keys(payload).filter((field) => !PAYLOAD_FIELDS.has(field));
  if (unknown.length > 0) fail(`unknown payload field ${unknown[0]}`, 2);
  const missing = REQUIRED_FIELDS.filter((field) => !Object.hasOwn(payload, field));
  if (missing.length > 0) fail(`missing required payload field ${missing[0]}`, 2);

  requireNonEmptyString(payload, "state");
  requireStableIdentifier(payload, "phase_id");
  requireStableIdentifier(payload, "gate_type");
  requireNonEmptyString(payload, "question");
  requireNonEmptyString(payload, "selected_option");
  if (!Array.isArray(payload.options) || payload.options.length === 0) {
    fail("field options must be a non-empty array", 2);
  }
  payload.options.forEach((option, index) => {
    if (typeof option !== "string") fail(`field options[${index}] must be a string`, 2);
    if (option.length === 0) fail(`field options[${index}] must not be empty`, 2);
    if (option.includes("\u0000")) fail(`field options[${index}] must not contain NUL`, 2);
  });
  if (new Set(payload.options).size !== payload.options.length) fail("field options must contain unique strings", 2);
  if (!payload.options.includes(payload.selected_option)) fail("field selected_option must exactly match an option", 2);
  if (payload.actor !== "advisor" && payload.actor !== "arbiter") fail("field actor must be advisor or arbiter", 2);
  if (payload.confidence !== "high" && payload.confidence !== "medium") fail("field confidence must be high or medium", 2);
  if (Object.hasOwn(payload, "next_phase")) requireStableIdentifier(payload, "next_phase");
  if (Object.hasOwn(payload, "report_md")) requireNonEmptyString(payload, "report_md");
  if (Object.hasOwn(payload, "report_html")) requireNonEmptyString(payload, "report_html");

  const paths = ["state", "report_md", "report_html"].filter((field) => Object.hasOwn(payload, field));
  for (let index = 0; index < paths.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < paths.length; otherIndex += 1) {
      if (path.resolve(payload[paths[index]]) === path.resolve(payload[paths[otherIndex]])) {
        fail(`payload paths ${paths[index]} and ${paths[otherIndex]} must be distinct`, 2);
      }
    }
  }
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function readScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'")) return trimmed.slice(1, -1).replaceAll("''", "'");
  return trimmed;
}

const HISTORY_STATUSES = new Set([
  "pending",
  "advisor_pending",
  "arbiter_pending",
  "user_pending",
  "decided",
  "blocked",
  "failed",
]);

const PHASE_STATUSES = new Set(["pending", "in_progress", "completed", "skipped", "failed"]);

const HISTORY_FIELDS = [
  "schema_version",
  "idempotency_key",
  "phase_id",
  "gate_type",
  "question",
  "options",
  "status",
  "selected_option",
  "final_actor",
  "original_recommendation",
  "rationale",
  "confidence",
  "escalate_to_user",
  "user_override",
  "continuation",
  "error",
];

function stateFail(message) {
  fail(`canonical state: ${message}`, 2);
}

function stateString(value, field, { allowNull = false, stable = false } = {}) {
  if (allowNull && value === null) return;
  if (typeof value !== "string" || value.length === 0 || value.includes("\u0000")) {
    stateFail(`${field} must be a non-empty NUL-free string${allowNull ? " or null" : ""}`);
  }
  if (stable && /[\s/\\]/u.test(value)) stateFail(`${field} must be a stable identifier`);
}

function stateBoolean(value, field) {
  if (typeof value !== "boolean") stateFail(`${field} must be boolean`);
}

function yamlScalarValue(raw, location) {
  const value = raw.trim();
  if (value === "[]") return [];
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) return Number(value);
  if (value.startsWith("\"")) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "string") stateFail(`${location} must be a scalar string`);
      return parsed;
    } catch {
      stateFail(`${location} has an invalid double-quoted scalar`);
    }
  }
  if (value.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/u.test(value)) stateFail(`${location} has an invalid single-quoted scalar`);
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value.startsWith("[") || value.startsWith("{") || value.startsWith("&") || value.startsWith("*") || value.startsWith("!")) {
    stateFail(`${location} uses unsupported YAML syntax`);
  }
  return value;
}

function rejectYamlMarkers(line, location) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote === "\"" && character === "\\") {
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'") {
      if (quote === null) quote = character;
      else if (quote === character && (quote !== "'" || line[index + 1] !== "'")) quote = null;
      else if (quote === "'" && line[index + 1] === "'") index += 1;
      continue;
    }
    if (quote === null && (character === "&" || character === "*" || character === "!")) {
      stateFail(`${location} uses YAML anchors, aliases, or tags`);
    }
  }
}

function tokenizeCanonicalYaml(stateText) {
  if (stateText.length === 0) stateFail("state file is empty");
  const tokens = [];
  const lines = stateText.split(/\r?\n/u);
  let blockIndent = null;
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    if (line.includes("\t")) stateFail(`line ${lineNumber + 1} contains a tab`);
    const indentation = (line.match(/^ */u) ?? [""])[0].length;
    const content = line.slice(indentation);
    if (blockIndent !== null) {
      if (content.length === 0 || indentation > blockIndent) continue;
      blockIndent = null;
    }
    if (content.length === 0 || content.startsWith("#")) continue;
    if (content === "---" || content === "..." || content.startsWith("%")) {
      stateFail(`line ${lineNumber + 1} uses unsupported YAML document syntax`);
    }
    if (indentation % 2 !== 0) stateFail(`line ${lineNumber + 1} uses non-canonical indentation`);
    rejectYamlMarkers(content, `line ${lineNumber + 1}`);

    const mapping = content.match(/^([A-Za-z_][\w-]*):(?:[ ]?(.*))?$/u);
    if (mapping) {
      const value = mapping[2] ?? "";
      const block = /^(?:>|\|)[+-]?$/u.test(value.trim());
      tokens.push({ lineNumber: lineNumber + 1, indentation, kind: "map", key: mapping[1], value, block });
      if (block) blockIndent = indentation;
      continue;
    }
    const sequence = content.match(/^-(?:[ ]+(.*))?$/u);
    if (sequence) {
      tokens.push({ lineNumber: lineNumber + 1, indentation, kind: "seq", value: sequence[1] ?? "" });
      continue;
    }
    stateFail(`line ${lineNumber + 1} is not canonical YAML`);
  }
  return tokens;
}

class CanonicalYamlParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  parse() {
    if (this.tokens.length === 0) stateFail("state file has no YAML mappings");
    if (this.tokens[0].indentation !== 0) stateFail("root must start at indentation zero");
    const root = this.parseBlock(this.tokens[0].indentation);
    if (this.index !== this.tokens.length) stateFail(`unexpected indentation at line ${this.tokens[this.index].lineNumber}`);
    return root;
  }

  parseBlock(indentation) {
    const token = this.tokens[this.index];
    if (!token || token.indentation !== indentation) stateFail("nested YAML block has invalid indentation");
    if (token.kind === "map") return this.parseMap(indentation);
    return this.parseSequence(indentation);
  }

  parseMap(indentation, target = {}) {
    const keys = new Set(Object.keys(target));
    while (this.index < this.tokens.length) {
      const token = this.tokens[this.index];
      if (token.indentation < indentation) break;
      if (token.indentation > indentation || token.kind !== "map") {
        stateFail(`unexpected YAML structure at line ${token.lineNumber}`);
      }
      if (keys.has(token.key)) stateFail(`duplicate mapping key ${token.key}`);
      keys.add(token.key);
      this.index += 1;
      if (token.block) {
        target[token.key] = "";
        continue;
      }
      if (token.value.trim() !== "") {
        target[token.key] = yamlScalarValue(token.value, `${token.key} on line ${token.lineNumber}`);
        continue;
      }
      const next = this.tokens[this.index];
      if (!next || next.indentation <= indentation) stateFail(`${token.key} on line ${token.lineNumber} has no value`);
      if (next.indentation !== indentation + 2) stateFail(`${token.key} on line ${token.lineNumber} has non-canonical indentation`);
      target[token.key] = this.parseBlock(next.indentation);
    }
    return target;
  }

  parseSequence(indentation) {
    const values = [];
    while (this.index < this.tokens.length) {
      const token = this.tokens[this.index];
      if (token.indentation < indentation) break;
      if (token.indentation > indentation || token.kind !== "seq") {
        stateFail(`unexpected YAML sequence structure at line ${token.lineNumber}`);
      }
      this.index += 1;
      const value = token.value.trim();
      if (value === "") {
        const next = this.tokens[this.index];
        if (!next || next.indentation <= indentation) stateFail(`empty sequence item on line ${token.lineNumber}`);
        values.push(this.parseBlock(next.indentation));
        continue;
      }
      const inlineMapping = value.match(/^([A-Za-z_][\w-]*):(?:[ ]?(.*))?$/u);
      if (inlineMapping) {
        const item = {};
        const key = inlineMapping[1];
        const inlineValue = inlineMapping[2] ?? "";
        if (inlineValue.trim() === "") stateFail(`${key} on line ${token.lineNumber} has no value`);
        item[key] = yamlScalarValue(inlineValue, `${key} on line ${token.lineNumber}`);
        const next = this.tokens[this.index];
        if (next && next.indentation > indentation) {
          if (next.indentation !== indentation + 2 || next.kind !== "map") stateFail(`sequence mapping on line ${token.lineNumber} has invalid indentation`);
          this.parseMap(next.indentation, item);
        }
        values.push(item);
        continue;
      }
      values.push(yamlScalarValue(value, `sequence item on line ${token.lineNumber}`));
      const next = this.tokens[this.index];
      if (next && next.indentation > indentation) stateFail(`scalar sequence item on line ${token.lineNumber} has a nested value`);
    }
    return values;
  }
}

function findKeyPaths(value, wantedKey, pathParts = [], matches = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => findKeyPaths(child, wantedKey, [...pathParts, `[${index}]`], matches));
    return matches;
  }
  if (!value || typeof value !== "object") return matches;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (key === wantedKey) matches.push(childPath);
    findKeyPaths(child, wantedKey, childPath, matches);
  }
  return matches;
}

function validateHistoryRecord(record, index) {
  if (!record || typeof record !== "object" || Array.isArray(record)) stateFail(`gate_history[${index}] must be a mapping`);
  const missing = HISTORY_FIELDS.find((field) => !Object.hasOwn(record, field));
  if (missing) stateFail(`gate_history[${index}] is missing ${missing}`);
  const unknown = Object.keys(record).find((field) => !HISTORY_FIELDS.includes(field));
  if (unknown) stateFail(`gate_history[${index}] has misplaced field ${unknown}`);
  if (record.schema_version !== 1) stateFail(`gate_history[${index}].schema_version must be 1`);
  stateString(record.idempotency_key, `gate_history[${index}].idempotency_key`);
  stateString(record.phase_id, `gate_history[${index}].phase_id`, { stable: true });
  stateString(record.gate_type, `gate_history[${index}].gate_type`, { stable: true });
  stateString(record.question, `gate_history[${index}].question`);
  if (!Array.isArray(record.options) || record.options.length === 0) stateFail(`gate_history[${index}].options must be a non-empty sequence`);
  record.options.forEach((option, optionIndex) => stateString(option, `gate_history[${index}].options[${optionIndex}]`));
  if (new Set(record.options).size !== record.options.length) stateFail(`gate_history[${index}].options must contain unique values`);
  if (!HISTORY_STATUSES.has(record.status)) stateFail(`gate_history[${index}].status is unsupported`);
  stateString(record.selected_option, `gate_history[${index}].selected_option`, { allowNull: true });
  if (record.selected_option !== null && !record.options.includes(record.selected_option)) stateFail(`gate_history[${index}].selected_option is not in options`);
  stateString(record.final_actor, `gate_history[${index}].final_actor`);
  stateString(record.original_recommendation, `gate_history[${index}].original_recommendation`, { allowNull: true });
  stateString(record.rationale, `gate_history[${index}].rationale`, { allowNull: true });
  if (record.confidence !== "high" && record.confidence !== "medium") stateFail(`gate_history[${index}].confidence is unsupported`);
  stateBoolean(record.escalate_to_user, `gate_history[${index}].escalate_to_user`);
  stateBoolean(record.user_override, `gate_history[${index}].user_override`);
  stateString(record.continuation, `gate_history[${index}].continuation`, { allowNull: true });
  stateString(record.error, `gate_history[${index}].error`, { allowNull: true });
}

function validateCanonicalState(stateText, phaseId) {
  const ast = new CanonicalYamlParser(tokenizeCanonicalYaml(stateText)).parse();
  if (!ast || typeof ast !== "object" || Array.isArray(ast)) stateFail("root must be a mapping");
  if (!Object.hasOwn(ast, "orchestrator") || !ast.orchestrator || typeof ast.orchestrator !== "object" || Array.isArray(ast.orchestrator)) {
    stateFail("root orchestrator must be a mapping");
  }
  if (!Object.hasOwn(ast, "phases") || !Array.isArray(ast.phases)) stateFail("root phases must be a sequence");
  const historyPaths = findKeyPaths(ast, "gate_history");
  if (historyPaths.length !== 1 || historyPaths[0].join(".") !== "orchestrator.gate_history") stateFail("orchestrator.gate_history must exist exactly once at its canonical anchor");
  const phasePaths = findKeyPaths(ast, "phases");
  if (phasePaths.length !== 1 || phasePaths[0].join(".") !== "phases") stateFail("root phases must exist exactly once at its canonical anchor");

  const orchestrator = ast.orchestrator;
  const gateHistory = orchestrator.gate_history;
  if (!Array.isArray(gateHistory)) stateFail("orchestrator.gate_history must be [] or a sequence");
  gateHistory.forEach(validateHistoryRecord);
  const phaseIds = new Set();
  const phases = ast.phases;
  if (phases.length === 0) stateFail("root phases must not be empty");
  phases.forEach((phase, index) => {
    if (!phase || typeof phase !== "object" || Array.isArray(phase)) stateFail(`phases[${index}] must be a mapping`);
    stateString(phase.id, `phases[${index}].id`, { stable: true });
    if (phaseIds.has(phase.id)) stateFail(`phases contains duplicate id ${phase.id}`);
    phaseIds.add(phase.id);
    if (!PHASE_STATUSES.has(phase.status)) stateFail(`phases[${index}].status is unsupported`);
  });
  if (Object.hasOwn(orchestrator, "current_phase")) stateString(orchestrator.current_phase, "orchestrator.current_phase", { stable: true });
  if (Object.hasOwn(orchestrator, "completed_phases")) {
    if (!Array.isArray(orchestrator.completed_phases)) stateFail("orchestrator.completed_phases must be a sequence");
    orchestrator.completed_phases.forEach((id, index) => stateString(id, `orchestrator.completed_phases[${index}]`, { stable: true }));
  }
  if (!phaseIds.has(phaseId)) stateFail(`requested phase_id ${phaseId} is not a member of root phases`);
  return { ast, history: gateHistory, phases, phaseIds, currentPhase: orchestrator.current_phase };
}

function validateTransition(model, phaseId, nextPhase) {
  if (!nextPhase) return;
  const current = model.phases.find((phase) => phase.id === phaseId);
  const target = model.phases.find((phase) => phase.id === nextPhase);
  if (!current) stateFail(`requested current phase ${phaseId} is not in root phases`);
  if (model.currentPhase !== phaseId) stateFail(`orchestrator.current_phase must be ${phaseId} for a transition`);
  if (current.status !== "in_progress") stateFail(`current phase ${phaseId} must be in_progress`);
  if (!target) stateFail(`next_phase ${nextPhase} is not in root phases`);
  if (nextPhase === phaseId) stateFail("next_phase must differ from phase_id");
  if (target.status !== "pending") stateFail(`next phase ${nextPhase} must be pending`);
  const currentIndex = model.phases.indexOf(current);
  const targetIndex = model.phases.indexOf(target);
  if (targetIndex <= currentIndex) stateFail(`transition from ${phaseId} to ${nextPhase} is backward or unsupported`);
}

function transitionAlreadyApplied(model, phaseId, nextPhase) {
  const current = model.phases.find((phase) => phase.id === phaseId);
  const target = model.phases.find((phase) => phase.id === nextPhase);
  return Boolean(
    current &&
      target &&
      model.currentPhase === nextPhase &&
      current.status === "completed" &&
      target.status === "in_progress",
  );
}

function rejectChangedSelection(terminal, selectedOption) {
  if (terminal.status !== "blocked" && terminal.selected_option !== null && terminal.selected_option !== selectedOption) {
    fail("terminal decision selected_option does not match the existing decision", 2);
  }
}

function atomicWrite(filePath, content, operation = "write") {
  if (process.env.PHASE_CONTINUE_TEST_FAILURE === operation) {
    throw new Error(`injected ${operation} failure`);
  }
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryDirectory = fs.mkdtempSync(path.join(directory, ".phase-continue-"));
  const temporaryPath = path.join(temporaryDirectory, path.basename(filePath));
  try {
    fs.writeFileSync(temporaryPath, content, "utf8");
    const descriptor = fs.openSync(temporaryPath, "r");
    try {
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function recordYaml(record) {
  const lines = [
    `    - schema_version: 1`,
    `      idempotency_key: ${yamlScalar(record.idempotency_key)}`,
    `      phase_id: ${yamlScalar(record.phase_id)}`,
    `      gate_type: ${yamlScalar(record.gate_type)}`,
    `      question: ${yamlScalar(record.question)}`,
    "      options:",
    ...record.options.map((option) => `        - ${yamlScalar(option)}`),
    `      status: ${yamlScalar(record.status)}`,
    `      selected_option: ${yamlScalar(record.selected_option)}`,
    `      final_actor: ${yamlScalar(record.final_actor)}`,
    `      original_recommendation: ${yamlScalar(record.original_recommendation)}`,
    `      rationale: ${yamlScalar(record.rationale)}`,
    `      confidence: ${yamlScalar(record.confidence)}`,
    `      escalate_to_user: ${yamlScalar(record.escalate_to_user)}`,
    `      user_override: ${yamlScalar(record.user_override)}`,
    `      continuation: ${yamlScalar(record.continuation)}`,
    `      error: ${yamlScalar(record.error)}`,
  ];
  return lines.join("\n");
}

function appendGateHistory(stateText, record) {
  const lines = stateText.replace(/\n?$/, "\n").split("\n");
  const historyIndex = lines.findIndex((line) => line === "  gate_history: []");
  if (historyIndex >= 0) {
    lines.splice(historyIndex, 1, "  gate_history:", recordYaml(record));
    return lines.join("\n");
  }

  const headerIndex = lines.findIndex((line) => line === "  gate_history:");
  if (headerIndex < 0) fail("state is missing orchestrator.gate_history");
  let insertionIndex = headerIndex + 1;
  while (insertionIndex < lines.length) {
    if (/^( {0,1}\S|  [A-Za-z_][\w-]*:)/.test(lines[insertionIndex])) break;
    insertionIndex += 1;
  }
  lines.splice(insertionIndex, 0, recordYaml(record));
  return lines.join("\n");
}

function updatePhaseState(stateText, phaseId, nextPhase) {
  const lines = stateText.split("\n");
  let inPhases = false;
  let currentPhaseId = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "phases:") {
      inPhases = true;
      continue;
    }
    if (inPhases && /^[A-Za-z_][\w-]*:/.test(line)) {
      inPhases = false;
      currentPhaseId = null;
    }
    if (inPhases) {
      const phase = line.match(/^  - id: (.+)$/);
      if (phase) currentPhaseId = readScalar(phase[1]);
      if (currentPhaseId && /^    status: /.test(line)) {
        if (currentPhaseId === phaseId) lines[index] = "    status: completed";
        if (currentPhaseId === nextPhase) lines[index] = "    status: in_progress";
      }
    }
  }

  const currentPhaseIndex = lines.findIndex((line) => /^  current_phase: /.test(line));
  if (currentPhaseIndex >= 0) lines[currentPhaseIndex] = `  current_phase: ${nextPhase}`;

  const completedEmptyIndex = lines.findIndex((line) => line === "  completed_phases: []");
  if (completedEmptyIndex >= 0) {
    lines.splice(completedEmptyIndex, 1, "  completed_phases:", `    - ${phaseId}`);
  } else {
    const completedIndex = lines.findIndex((line) => line === "  completed_phases:");
    const alreadyCompleted = lines.some((line) => line === `    - ${phaseId}`);
    if (completedIndex >= 0 && !alreadyCompleted) {
      let insertionIndex = completedIndex + 1;
      while (insertionIndex < lines.length && /^    - /.test(lines[insertionIndex])) insertionIndex += 1;
      lines.splice(insertionIndex, 0, `    - ${phaseId}`);
    }
  }
  return lines.join("\n");
}

function markdownEscape(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function htmlEscape(value) {
  return String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderReports(stateModel, markdownPath, htmlPath) {
  if (!markdownPath && !htmlPath) return;
  const history = stateModel.history;
  const columns = [
    ["gate_type", "Gate"],
    ["status", "Status"],
    ["options", "Options"],
    ["selected_option", "Selected option"],
    ["final_actor", "Actor"],
    ["original_recommendation", "Recommendation"],
    ["rationale", "Rationale"],
    ["confidence", "Confidence"],
    ["escalate_to_user", "Escalated"],
    ["user_override", "User override"],
    ["continuation", "Continuation"],
    ["error", "Error"],
  ];
  let markdown = `# Decision Summary\n\n## TL;DR\n\n${history.length} persisted gate decision(s). The report is generated from \`orchestrator-state.yml\`.\n\n## Gate History\n\n| ${columns.map(([, label]) => label).join(" | ")} |\n|${columns.map(() => "---").join("|")}|\n`;
  for (const entry of history) {
    markdown += `| ${columns.map(([key]) => markdownEscape(Array.isArray(entry[key]) ? entry[key].join(", ") : entry[key])).join(" | ")} |\n`;
  }
  if (markdownPath) atomicWrite(markdownPath, markdown, "report");
  if (htmlPath) {
    const headers = columns.map(([, label]) => `<th>${htmlEscape(label)}</th>`).join("");
    const rows = history.map((entry) => `<tr>${columns.map(([key]) => `<td>${htmlEscape(Array.isArray(entry[key]) ? entry[key].join(", ") : entry[key])}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Decision Summary</title><h1>Decision Summary</h1><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    atomicWrite(htmlPath, html, "report");
  }
}

function main() {
  const options = readJsonPayload(readTransport(process.argv.slice(2)));
  validatePayload(options);
  const stateText = fs.readFileSync(options.state, "utf8");
  const stateModel = validateCanonicalState(stateText, options.phase_id);
  const canonical = JSON.stringify([options.phase_id, options.gate_type, options.question, options.options]);
  const idempotencyKey = `sha256:${crypto.createHash("sha256").update(canonical).digest("hex")}`;
  const terminal = stateModel.history.find((entry) => entry.idempotency_key === idempotencyKey && ["decided", "blocked", "failed"].includes(entry.status));
  const denied = DENYLIST.has(options.gate_type);

  if (terminal) {
    rejectChangedSelection(terminal, options.selected_option);
    const retryTransitionApplied = terminal.status === "decided" && options.next_phase && transitionAlreadyApplied(stateModel, options.phase_id, options.next_phase);
    if (!denied && options.next_phase && !retryTransitionApplied) validateTransition(stateModel, options.phase_id, options.next_phase);
    renderReports(stateModel, options.report_md, options.report_html);
    if (terminal.status === "blocked" || denied) fail(terminal.error ?? "denylisted gate requires an explicit user gate", 3);
    if (terminal.status === "decided" && options.next_phase && !retryTransitionApplied) {
      const transitionedState = updatePhaseState(stateText, options.phase_id, options.next_phase);
      atomicWrite(options.state, transitionedState, "transition");
    }
    console.log(JSON.stringify({ status: "reused", idempotency_key: idempotencyKey, selected_option: terminal.selected_option ?? null, continuation: terminal.continuation ?? null }));
    return;
  }

  if (!denied) validateTransition(stateModel, options.phase_id, options.next_phase);
  const record = {
    idempotency_key: idempotencyKey,
    phase_id: options.phase_id,
    gate_type: options.gate_type,
    question: options.question,
    options: options.options,
    status: denied ? "blocked" : "decided",
    selected_option: denied ? null : options.selected_option,
    final_actor: denied ? "system" : options.actor,
    original_recommendation: denied ? options.selected_option : options.selected_option,
    rationale: denied ? null : "Validated fully automatic continuation.",
    confidence: options.confidence,
    escalate_to_user: false,
    user_override: false,
    continuation: denied ? null : "phase_continue",
    error: denied ? "denylisted gate requires an explicit user gate" : null,
  };

  let nextState = appendGateHistory(stateText, record);
  atomicWrite(options.state, nextState, "terminal");
  const persistedState = fs.readFileSync(options.state, "utf8");
  const persistedModel = validateCanonicalState(persistedState, options.phase_id);
  renderReports(persistedModel, options.report_md, options.report_html);
  if (record.status === "decided" && options.next_phase) {
    nextState = updatePhaseState(persistedState, options.phase_id, options.next_phase);
    atomicWrite(options.state, nextState, "transition");
  }
  if (denied) fail(record.error, 3);
  console.log(JSON.stringify({ status: "decided", idempotency_key: idempotencyKey, selected_option: options.selected_option, continuation: "phase_continue" }));
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), 1);
}
