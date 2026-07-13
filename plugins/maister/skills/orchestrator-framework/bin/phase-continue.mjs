#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { commitState, readState, StateRepositoryError } from "./orchestrator-state-repository.mjs";

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
const REQUIRED_FIELDS = ["state", "phase_id", "gate_type", "question", "options", "selected_option", "actor", "confidence"];
const OPTIONAL_FIELDS = ["next_phase", "report_md", "report_html"];
const ALLOWED_FIELDS = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);

function fail(message, code = 2) {
  console.error(`phase_continue: ${message}`);
  process.exit(code);
}

class JsonParser {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  parse() {
    this.skip();
    const value = this.value();
    this.skip();
    if (this.index !== this.source.length) this.error("unexpected trailing input");
    return value;
  }

  value() {
    this.skip();
    const character = this.source[this.index];
    if (character === "{") return this.object();
    if (character === "[") return this.array();
    if (character === '"') return this.string();
    if (this.consume("true")) return true;
    if (this.consume("false")) return false;
    if (this.consume("null")) return null;
    const match = this.source.slice(this.index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
    if (!match) this.error("invalid JSON value");
    this.index += match[0].length;
    return Number(match[0]);
  }

  object() {
    const result = {};
    const keys = new Set();
    this.index += 1;
    this.skip();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return result;
    }
    while (this.index < this.source.length) {
      if (this.source[this.index] !== '"') this.error("object key must be a string");
      const key = this.string();
      if (keys.has(key)) this.error(`duplicate JSON key ${JSON.stringify(key)}`);
      keys.add(key);
      this.skip();
      this.expect(":");
      Object.defineProperty(result, key, { value: this.value(), enumerable: true, writable: true, configurable: true });
      this.skip();
      if (this.source[this.index] === "}") {
        this.index += 1;
        return result;
      }
      this.expect(",");
      this.skip();
    }
    this.error("unterminated object");
  }

  array() {
    const result = [];
    this.index += 1;
    this.skip();
    if (this.source[this.index] === "]") {
      this.index += 1;
      return result;
    }
    while (this.index < this.source.length) {
      result.push(this.value());
      this.skip();
      if (this.source[this.index] === "]") {
        this.index += 1;
        return result;
      }
      this.expect(",");
    }
    this.error("unterminated array");
  }

  string() {
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
        try {
          return JSON.parse(this.source.slice(start, this.index));
        } catch {
          this.error("invalid JSON string");
        }
      }
      if (character < " ") this.error("unescaped control character");
      this.index += 1;
    }
    this.error("unterminated string");
  }

  consume(value) {
    if (!this.source.startsWith(value, this.index)) return false;
    this.index += value.length;
    return true;
  }

  expect(character) {
    if (this.source[this.index] !== character) this.error(`expected ${character}`);
    this.index += 1;
  }

  skip() {
    while (/[ \t\r\n]/u.test(this.source[this.index] ?? "")) this.index += 1;
  }

  error(message) {
    throw new Error(`${message} at character ${this.index + 1}`);
  }
}

function readTransport(argv) {
  if (argv.length === 0) return fs.readFileSync(0, "utf8");
  if (argv.length !== 2 || argv[0] !== "--input-file" || argv[1].length === 0 || argv[1].startsWith("--")) fail("input transport must be stdin or exactly one --input-file PATH");
  return fs.readFileSync(argv[1], "utf8");
}

function readPayload(source) {
  if (source.trim().length === 0) fail("JSON payload is empty");
  let payload;
  try {
    payload = new JsonParser(source).parse();
  } catch (error) {
    fail(`JSON payload is invalid: ${error.message}`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("JSON payload must be an object");
  return payload;
}

function requireString(payload, field, stable = false) {
  if (typeof payload[field] !== "string" || payload[field].length === 0 || payload[field].includes("\0")) fail(`field ${field} must be a non-empty NUL-free string`);
  if (stable && /[\s/\\]/u.test(payload[field])) fail(`field ${field} must be a stable identifier`);
}

function validatePayload(payload) {
  const missing = REQUIRED_FIELDS.find((field) => !Object.hasOwn(payload, field));
  if (missing) fail(`missing required payload field ${missing}`);
  const unknown = Object.keys(payload).find((field) => !ALLOWED_FIELDS.has(field));
  if (unknown) fail(`unknown payload field ${unknown}`);
  requireString(payload, "state");
  requireString(payload, "phase_id", true);
  requireString(payload, "gate_type", true);
  requireString(payload, "question");
  requireString(payload, "selected_option");
  if (!Array.isArray(payload.options) || payload.options.length === 0) fail("field options must be a non-empty array");
  payload.options.forEach((option, index) => {
    if (typeof option !== "string" || option.length === 0 || option.includes("\0")) fail(`field options[${index}] must be a non-empty NUL-free string`);
  });
  if (new Set(payload.options).size !== payload.options.length) fail("field options must contain unique strings");
  if (!payload.options.includes(payload.selected_option)) fail("field selected_option must exactly match an option");
  if (payload.actor !== "advisor" && payload.actor !== "arbiter") fail("field actor must be advisor or arbiter");
  if (payload.confidence !== "high" && payload.confidence !== "medium") fail("field confidence must be high or medium");
  if (Object.hasOwn(payload, "next_phase")) requireString(payload, "next_phase", true);
  if (Object.hasOwn(payload, "report_md")) requireString(payload, "report_md");
  if (Object.hasOwn(payload, "report_html")) requireString(payload, "report_html");
  const paths = ["state", "report_md", "report_html"].filter((field) => Object.hasOwn(payload, field)).map((field) => [field, path.resolve(payload[field])]);
  for (let index = 0; index < paths.length; index += 1) {
    for (let other = index + 1; other < paths.length; other += 1) {
      if (paths[index][1] === paths[other][1]) fail(`payload paths ${paths[index][0]} and ${paths[other][0]} must be distinct`);
    }
  }
}

function findTerminalGate(state, payload) {
  const matching = state.orchestrator.gate_history.filter((gate) => gate.phase_id === payload.phase_id && gate.gate_type === payload.gate_type && gate.question === payload.question && JSON.stringify(gate.options) === JSON.stringify(payload.options));
  if (matching.length !== 1) fail("exact evaluator-owned terminal gate record is missing or ambiguous");
  const gate = matching[0];
  if (gate.status !== "decided" || gate.provenance_kind !== "complete") fail("gate is not a complete terminal decision");
  if (gate.selected_option !== payload.selected_option) fail("terminal decision selection does not match payload");
  if (gate.final_actor !== payload.actor || gate.confidence !== payload.confidence) fail("terminal decision actor or confidence does not match payload");
  if (gate.escalate_to_user || gate.error !== null || gate.confidence === "low") fail("terminal decision is unsafe for automatic continuation");
  const role = gate[payload.actor];
  if (!role?.response || role.response.selected_option !== gate.selected_option || role.response.confidence !== gate.confidence || !role.attempts.some((attempt) => attempt.status === "completed")) {
    fail("terminal decision lacks complete provenance for its final actor");
  }
  return gate;
}

function transitionStatus(state, phaseId, nextPhase) {
  if (!nextPhase) return "none";
  const source = state.phases.find((phase) => phase.id === phaseId);
  const target = state.phases.find((phase) => phase.id === nextPhase);
  if (!source || !target || phaseId === nextPhase) fail("phase transition target is invalid");
  if (state.orchestrator.current_phase === nextPhase && source.status === "completed" && target.status === "in_progress") return "applied";
  if (state.orchestrator.current_phase !== phaseId || source.status !== "in_progress" || target.status !== "pending") fail("phase transition is not a legal forward transition");
  if (state.phases.indexOf(target) <= state.phases.indexOf(source)) fail("backward phase transition is not allowed");
  return "pending";
}

function markdownEscape(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function htmlEscape(value) {
  return String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderReports(state) {
  const columns = [["gate_type", "Gate"], ["status", "Status"], ["options", "Options"], ["selected_option", "Selected option"], ["final_actor", "Actor"], ["rationale", "Rationale"], ["confidence", "Confidence"]];
  let markdown = `# Decision Summary\n\n${state.orchestrator.gate_history.length} persisted gate decision(s).\n\n| ${columns.map(([, label]) => label).join(" | ")} |\n|${columns.map(() => "---").join("|")}|\n`;
  for (const gate of state.orchestrator.gate_history) markdown += `| ${columns.map(([key]) => markdownEscape(Array.isArray(gate[key]) ? gate[key].join(", ") : gate[key])).join(" | ")} |\n`;
  const headers = columns.map(([, label]) => `<th>${htmlEscape(label)}</th>`).join("");
  const rows = state.orchestrator.gate_history.map((gate) => `<tr>${columns.map(([key]) => `<td>${htmlEscape(Array.isArray(gate[key]) ? gate[key].join(", ") : gate[key])}</td>`).join("")}</tr>`).join("");
  return { markdown, html: `<!doctype html><meta charset="utf-8"><title>Decision Summary</title><h1>Decision Summary</h1><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>` };
}

function safeOutputPath(filePath) {
  const absolute = path.resolve(filePath);
  const parent = path.dirname(absolute);
  if (!fs.existsSync(parent) || fs.realpathSync(parent) !== parent) fail(`report parent path is missing, non-canonical, or unsafe: ${parent}`);
  if (fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink()) fail(`report target must not be a symlink: ${absolute}`);
  return absolute;
}

function atomicWrite(filePath, content) {
  const target = safeOutputPath(filePath);
  const existingMode = fs.existsSync(target) ? fs.statSync(target).mode & 0o7777 : null;
  const temporary = path.join(path.dirname(target), `.phase-continue-${process.pid}-${Math.random().toString(16).slice(2)}.tmp`);
  try {
    fs.writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
    if (existingMode !== null) fs.chmodSync(temporary, existingMode);
    const descriptor = fs.openSync(temporary, "r");
    try {
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
  }
}

async function applyTransition(statePath, phaseId, nextPhase) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = readState(statePath);
    const status = transitionStatus(current, phaseId, nextPhase);
    if (status === "applied") return { state: current, reused: true };
    try {
      const state = await commitState(statePath, current.orchestrator.revision, (draft) => {
        const source = draft.phases.find((phase) => phase.id === phaseId);
        const target = draft.phases.find((phase) => phase.id === nextPhase);
        source.status = "completed";
        target.status = "in_progress";
        draft.orchestrator.current_phase = nextPhase;
        if (!draft.orchestrator.completed_phases.includes(phaseId)) draft.orchestrator.completed_phases.push(phaseId);
      });
      return { state, reused: false };
    } catch (error) {
      if (!(error instanceof StateRepositoryError) || error.code !== "REVISION_CONFLICT" || attempt === 3) throw error;
    }
  }
  fail("phase transition revision could not be reconciled");
}

async function main() {
  const payload = readPayload(readTransport(process.argv.slice(2)));
  validatePayload(payload);
  if (DENYLIST.has(payload.gate_type)) fail(`gate type ${payload.gate_type} is denylisted and requires an explicit user gate`, 3);
  const state = readState(payload.state);
  const gate = findTerminalGate(state, payload);
  const transition = transitionStatus(state, payload.phase_id, payload.next_phase);
  const reports = renderReports(state);
  if (process.env.PHASE_CONTINUE_TEST_FAILURE === "report") throw new Error("injected report failure");
  if (payload.report_md) atomicWrite(payload.report_md, reports.markdown);
  if (payload.report_html) atomicWrite(payload.report_html, reports.html);
  if (process.env.PHASE_CONTINUE_TEST_FAILURE === "transition") throw new Error("injected transition failure");
  let reused = transition === "applied";
  if (transition === "pending") reused = (await applyTransition(payload.state, payload.phase_id, payload.next_phase)).reused;
  process.stdout.write(`${JSON.stringify({ status: reused ? "reused" : payload.next_phase ? "continued" : "verified", gate_status: gate.status, actor: gate.final_actor, selected_option: gate.selected_option, continuation: "phase_continue" })}\n`);
}

main().catch((error) => fail(error.message, error.code === "LOCK_TIMEOUT" ? 4 : 1));
