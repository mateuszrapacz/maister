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

const KNOWN_OPTIONS = new Set([
  "state",
  "phase_id",
  "gate_type",
  "question",
  "options_json",
  "selected_option",
  "actor",
  "confidence",
  "next_phase",
  "report_md",
  "report_html",
]);

function fail(message, code = 2) {
  console.error(`phase_continue: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) fail(`unexpected argument ${argument}`);
    const key = argument.slice(2).replaceAll("-", "_");
    if (!KNOWN_OPTIONS.has(key)) fail(`unknown option ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`missing value for ${argument}`);
    result[key] = value;
    index += 1;
  }
  if (result.options_json) {
    try {
      result.gate_options = JSON.parse(result.options_json);
    } catch (error) {
      fail(`options-json must be valid JSON: ${error.message}`);
    }
  }
  return result;
}

function requireOptions(options) {
  const required = [
    "state",
    "phase_id",
    "gate_type",
    "question",
    "gate_options",
    "selected_option",
    "actor",
    "confidence",
  ];
  const missing = required.filter((key) => options[key] === undefined);
  if (missing.length > 0) fail(`missing required options: ${missing.join(", ")}`);
  if (
    !Array.isArray(options.gate_options) ||
    options.gate_options.length === 0 ||
    options.gate_options.some((value) => typeof value !== "string" || value.length === 0) ||
    new Set(options.gate_options).size !== options.gate_options.length
  ) {
    fail("options must be a non-empty array of unique strings");
  }
  if (!options.gate_options.includes(options.selected_option)) {
    fail("selected option is not in the supplied option set");
  }
  if (!["high", "medium"].includes(options.confidence)) {
    fail("confidence must be high or medium");
  }
  if (!["advisor", "arbiter"].includes(options.actor)) {
    fail("actor must be advisor or arbiter");
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

function parseGateHistory(stateText) {
  const records = [];
  let current = null;
  let inHistory = false;
  for (const line of stateText.split("\n")) {
    if (line === "  gate_history:" || line === "  gate_history: []") {
      inHistory = true;
      continue;
    }
    if (inHistory && /^  [A-Za-z_][\w-]*:/.test(line)) {
      inHistory = false;
      if (current) records.push(current);
      current = null;
    }
    if (!inHistory) continue;
    const item = line.match(/^    - (?:([\w-]+):\s*(.*))?$/);
    if (item) {
      if (current) records.push(current);
      current = {};
      if (item[1]) current[item[1]] = readScalar(item[2]);
      continue;
    }
    const nestedItem = line.match(/^        - (.*)$/);
    if (current && nestedItem && Array.isArray(current.options)) {
      current.options.push(readScalar(nestedItem[1]));
      continue;
    }
    const field = line.match(/^      ([\w-]+):\s*(.*)$/);
    if (current && field) current[field[1]] = field[1] === "options" ? [] : readScalar(field[2]);
  }
  if (current) records.push(current);
  return records;
}

function atomicWrite(filePath, content) {
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

function renderReports(stateText, markdownPath, htmlPath) {
  if (!markdownPath && !htmlPath) return;
  const history = parseGateHistory(stateText);
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
  if (markdownPath) atomicWrite(markdownPath, markdown);
  if (htmlPath) {
    const headers = columns.map(([, label]) => `<th>${htmlEscape(label)}</th>`).join("");
    const rows = history.map((entry) => `<tr>${columns.map(([key]) => `<td>${htmlEscape(Array.isArray(entry[key]) ? entry[key].join(", ") : entry[key])}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Decision Summary</title><h1>Decision Summary</h1><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    atomicWrite(htmlPath, html);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireOptions(options);
  const stateText = fs.readFileSync(options.state, "utf8");
  const canonical = JSON.stringify([options.phase_id, options.gate_type, options.question, options.gate_options]);
  const idempotencyKey = `sha256:${crypto.createHash("sha256").update(canonical).digest("hex")}`;
  const terminal = parseGateHistory(stateText).find((entry) => entry.idempotency_key === idempotencyKey && ["decided", "blocked", "failed"].includes(entry.status));
  if (terminal) {
    renderReports(stateText, options.report_md, options.report_html);
    console.log(JSON.stringify({ status: "reused", idempotency_key: idempotencyKey, selected_option: terminal.selected_option ?? null, continuation: terminal.continuation ?? null }));
    return;
  }

  const denied = DENYLIST.has(options.gate_type);
  const record = {
    idempotency_key: idempotencyKey,
    phase_id: options.phase_id,
    gate_type: options.gate_type,
    question: options.question,
    options: options.gate_options,
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
  atomicWrite(options.state, nextState);
  renderReports(nextState, options.report_md, options.report_html);
  if (record.status === "decided" && options.next_phase) {
    nextState = updatePhaseState(nextState, options.phase_id, options.next_phase);
    atomicWrite(options.state, nextState);
  }
  if (denied) fail(record.error, 3);
  console.log(JSON.stringify({ status: "decided", idempotency_key: idempotencyKey, selected_option: options.selected_option, continuation: "phase_continue" }));
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), 1);
}
