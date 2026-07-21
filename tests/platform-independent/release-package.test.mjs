import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { hashTree } from "../../plugins/maister/lib/distribution/hash-tree.mjs";
import { portableCoreTreeHash } from "../../plugins/maister/lib/distribution/e3-attestation.mjs";
import { canonicalJson } from "../../plugins/maister/lib/distribution/provenance.mjs";
import { createEvidenceRecord } from "../../plugins/maister/lib/distribution/evidence-schema.mjs";
import { SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";
import { generateE3Attestation } from "../../plugins/maister/bin/generate-e3-attestation.mjs";
import {
  createReleaseMetadata,
  verifyReleaseMetadata,
} from "../../plugins/maister/bin/release-metadata.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPO_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const TEST_SOURCE_DATE_EPOCH = 1784073600;
const TEST_EVIDENCE_NOW = "2026-07-15T00:00:01.000Z";

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function piEvidenceRecords() {
  const provenance = {
    source_commit: COMMIT,
    source_version: "test",
    overlay_id: "maister/pi",
    overlay_version: "1.0.0",
    host: "pi",
    scenario_version: "1.0.0",
    schema_version: 1,
    projector_version: "1.0.0",
    canonical_set_digest: "1".repeat(64),
    manifest_digest: "2".repeat(64),
    projected_tree_digest: "3".repeat(64),
    source_hash: "4".repeat(64),
    overlay_hash: "a".repeat(64),
    materialized_hash: "5".repeat(64),
    provenance_hash: "6".repeat(64),
  };
  return ["E1", "E2", "E3", "E4", "E5", "E6"].map((capability) => createEvidenceRecord({
    target: "pi",
    capability,
    hostVersion: "0.80.10",
    scenario: `${capability.toLowerCase()}-v1`,
    result: capability === "E5" || capability === "E6" ? "unavailable" : "passed",
    provenance: capability === "E5" || capability === "E6"
      ? { ...provenance, reason: "host_evidence_unavailable" }
      : provenance,
    timestamp: "2026-07-15T00:00:00.000Z",
  }));
}

function evidenceDigest(records) {
  return crypto.createHash("sha256").update(canonicalJson(records)).digest("hex");
}

function makePackage(directory, target, { attestation, sourceCommit = REPO_COMMIT, sourceVersion = "test" } = {}) {
  const argumentsList = [
    "package",
    `TARGET=${target}`,
    `DIST_DIR=${directory}`,
    `SOURCE_DATE_EPOCH=${TEST_SOURCE_DATE_EPOCH}`,
    `SOURCE_COMMIT=${sourceCommit}`,
    `SOURCE_VERSION=${sourceVersion}`,
  ];
  if (attestation) argumentsList.push(`E3_ATTESTATION=${attestation}`);
  execFileSync("make", argumentsList, { cwd: ROOT, stdio: "pipe" });
  return path.join(directory, `maister-${target}.tar.gz`);
}

function makeTestAttestation(directory) {
  return generateE3Attestation({
    root: ROOT,
    output: path.join(directory, "e3-portable-core.json"),
    sourceCommit: REPO_COMMIT,
    sourceVersion: "test",
    testCommand: "make test-core",
    result: "passed",
    sourceDateEpoch: Math.floor(Date.now() / 1000),
  }).output;
}

function packageArchives() {
  const configuredDirectory = process.env.MAISTER_PACKAGE_DIR;
  if (configuredDirectory) {
    const directory = path.resolve(ROOT, configuredDirectory);
    return Object.fromEntries(SUPPORTED_TARGET_IDS.map((target) => [target, path.join(directory, `maister-${target}.tar.gz`)]));
  }
  const firstDirectory = tempDirectory("maister-package-first-");
  const secondDirectory = tempDirectory("maister-package-second-");
  const attestation = makeTestAttestation(tempDirectory("maister-package-e3-"));
  return Object.fromEntries(SUPPORTED_TARGET_IDS.map((target) => [target, {
    first: makePackage(firstDirectory, target, { attestation }),
    second: makePackage(secondDirectory, target, { attestation }),
  }]));
}

function extractArchive(archive, directory) {
  fs.mkdirSync(directory, { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", directory], { stdio: "pipe" });
}

function invokeArchive(extractedRoot, target, command, home, state) {
  const output = execFileSync(process.execPath, [
    path.join(extractedRoot, "plugins/maister/bin/maister-install.mjs"),
    command,
    "--target",
    target,
    "--source",
    `local:${extractedRoot}`,
    "--home",
    home,
    "--json",
  ], {
    cwd: extractedRoot,
    env: {
      ...process.env,
      XDG_STATE_HOME: state,
      MAISTER_EVIDENCE_NOW: TEST_EVIDENCE_NOW,
      MAISTER_CODEX_NATIVE_DEPLOYMENT: "0",
    },
    encoding: "utf8",
  });
  return JSON.parse(output);
}

function invokeArchiveAttempt(extractedRoot, target, command, home, state, extraArguments = [], env = {}) {
  const result = spawnSync(process.execPath, [
    path.join(extractedRoot, "plugins/maister/bin/maister-install.mjs"),
    command,
    "--target",
    target,
    "--source",
    `local:${extractedRoot}`,
    "--home",
    home,
    ...extraArguments,
    "--json",
  ], {
    cwd: extractedRoot,
    env: {
      ...process.env,
      XDG_STATE_HOME: state,
      MAISTER_EVIDENCE_NOW: TEST_EVIDENCE_NOW,
      MAISTER_CODEX_NATIVE_DEPLOYMENT: "0",
      ...env,
    },
    encoding: "utf8",
  });
  return { status: result.status, response: JSON.parse(result.stdout) };
}

function writeTracerState(statePath, taskId) {
  fs.writeFileSync(statePath, `orchestrator:\n  schema_version: 2\n  revision: 0\n  initial_phase: phase-1\n  current_phase: phase-1\n  completed_phases: []\n  failed_phases: []\n  gate_history: []\n  work: {}\n  dispatch_outbox: []\ntask:\n  id: ${taskId}\nphases:\n  - id: phase-1\n    status: in_progress\n`, "utf8");
}

function invokePackagedAgentGate(extractedRoot, request) {
  const result = spawnSync(process.execPath, [path.join(extractedRoot, "plugins/maister/bin/maister-agent-gate.mjs")], {
    cwd: extractedRoot,
    env: { ...process.env, XDG_STATE_HOME: request.state_root },
    input: `${JSON.stringify(request)}\n`,
    encoding: "utf8",
  });
  assert.equal(result.stderr, "", result.stderr);
  return { status: result.status, response: JSON.parse(result.stdout) };
}

function productionGateRequest({ target, home, stateRoot, workingRoot, statePath, bridgeModule }) {
  return {
    schema_version: 1,
    operation: "evaluate_gate",
    target,
    home,
    state_root: stateRoot,
    working_root: workingRoot,
    state_path: statePath,
    bridge_module: bridgeModule,
    gate_context: { schema_version: 1, phase_id: "phase-1", gate_type: "phase-exit", question: "Continue?", options: ["Continue", "Pause"], original_recommendation: "Continue", policy: "fully_automatic", safety_classification: "configurable", context: { task_path: path.dirname(statePath), workflow_id: "development" } },
    role_config: { advisor: { logical_role_id: "maister:advisor", max_attempts: 1 }, arbiter: { logical_role_id: "maister:advisor", max_attempts: 1 }, arbiter_enabled_on_disagreement: true, backoff_ms: 0 },
    automatic_continuation_supported: true,
    interactive: false,
  };
}

test("extracted package drives a gate through production bootstrap, exact native dispatch, and durable terminal evidence", async (t) => {
  const packageDirectory = tempDirectory("maister-runtime-tracer-package-");
  const attestation = makeTestAttestation(tempDirectory("maister-runtime-tracer-e3-"));
  const archive = makePackage(packageDirectory, "cursor", { attestation });
  const extractedRoot = tempDirectory("maister-runtime-tracer-extract-");
  const sandboxRoot = fs.realpathSync(tempDirectory("maister-runtime-tracer-sandbox-"));
  t.after(() => fs.rmSync(packageDirectory, { recursive: true, force: true }));
  t.after(() => fs.rmSync(extractedRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(sandboxRoot, { recursive: true, force: true }));
  extractArchive(archive, extractedRoot);
  const home = path.join(sandboxRoot, "home");
  const state = path.join(sandboxRoot, "state");
  const taskPath = path.join(sandboxRoot, "task");
  fs.mkdirSync(home);
  fs.mkdirSync(state);
  fs.mkdirSync(taskPath, { mode: 0o700 });
  assert.equal(invokeArchive(extractedRoot, "cursor", "install", home, state).ok, true);

  const activePointer = JSON.parse(fs.readFileSync(path.join(state, "maister/cursor/active-receipt.json"), "utf8"));
  const activeReceipt = JSON.parse(fs.readFileSync(activePointer.receipt_path, "utf8"));
  const statePath = path.join(taskPath, "orchestrator-state.yml");
  writeTracerState(statePath, "production-runtime-tracer");
  const unavailable = invokePackagedAgentGate(extractedRoot, productionGateRequest({ target: "cursor", home, stateRoot: state, workingRoot: extractedRoot, statePath, bridgeModule: null }));
  assert.equal(unavailable.status, 0, JSON.stringify(unavailable.response));
  assert.equal(unavailable.response.result.directive, "blocked");
  assert.match(unavailable.response.result.gate.advisor.attempts[0].error, /E_AGENT_UNAVAILABLE/u);

  const bridgeModule = path.join(sandboxRoot, "cursor-bridge-v1.mjs");
  fs.writeFileSync(bridgeModule, `export async function createMaisterAgentBridgeV1(request) {\n  if (request.schema_version !== 1 || request.target !== "cursor") throw new Error("bad owner request");\n  return { schema_version: 1, target: "cursor", credentials_owner: "host", version_owner: "host", native_port: { hostVersion: ${JSON.stringify(activeReceipt.target.host_version)}, authenticated: true, externalCollisions: [], async inspect(input) { if (input.schema_version !== 1) throw new Error("bad inspect request"); return { schema_version: 1, exact_launch: true, observable_identity: true }; }, async launch(input) { return { schema_version: 1, observed_native_role_external_id: input.native_role_external_id, output: { selected_option: "Continue", rationale: "Production tracer", confidence: "high", escalate_to_user: false }, native_observations: { launch_id: "production-tracer-1" } }; } } };\n}\n`, "utf8");
  writeTracerState(statePath, "production-runtime-tracer");
  const invoked = invokePackagedAgentGate(extractedRoot, productionGateRequest({ target: "cursor", home, stateRoot: state, workingRoot: extractedRoot, statePath, bridgeModule }));
  assert.equal(invoked.status, 0, JSON.stringify(invoked.response));
  assert.equal(invoked.response.result.directive, "continue", JSON.stringify(invoked.response));
  assert.equal(invoked.response.result.gate.selected_option, "Continue");
  assert.equal(invoked.response.result.gate.advisor.terminal_dispatch.native_observations.launch_id, "production-tracer-1");
});

test("extracted package drives a gate through production bootstrap and the managed Codex adapter", async (t) => {
  const packageDirectory = tempDirectory("maister-codex-tracer-package-");
  const attestation = makeTestAttestation(tempDirectory("maister-codex-tracer-e3-"));
  const archive = makePackage(packageDirectory, "codex", { attestation });
  const extractedRoot = tempDirectory("maister-codex-tracer-extract-");
  const sandboxRoot = fs.realpathSync(tempDirectory("maister-codex-tracer-sandbox-"));
  t.after(() => fs.rmSync(packageDirectory, { recursive: true, force: true }));
  t.after(() => fs.rmSync(extractedRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(sandboxRoot, { recursive: true, force: true }));
  extractArchive(archive, extractedRoot);
  const home = path.join(sandboxRoot, "home");
  const state = path.join(sandboxRoot, "state");
  const taskPath = path.join(sandboxRoot, "task");
  fs.mkdirSync(home);
  fs.mkdirSync(state);
  fs.mkdirSync(taskPath, { mode: 0o700 });
  assert.equal(invokeArchive(extractedRoot, "codex", "install", home, state).ok, true);

  const activePointer = JSON.parse(fs.readFileSync(path.join(state, "maister/codex/active-receipt.json"), "utf8"));
  const activeReceipt = JSON.parse(fs.readFileSync(activePointer.receipt_path, "utf8"));
  const executable = path.join(sandboxRoot, "codex-fixture.mjs");
  fs.writeFileSync(executable, `#!/usr/bin/env node
import fs from "node:fs";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = Buffer.concat(chunks).toString("utf8");
const contract = JSON.parse(input.trim().split("\\n").at(-1));
const lastIndex = process.argv.indexOf("--output-last-message");
const output = {
  logical_role_id: contract.logical_role_id,
  status: "completed",
  summary: "Production Codex tracer",
  details: {
    dispatch_id: contract.dispatch_id,
    session_id: "codex-production-session",
    canonical_source_digest: contract.canonical_source_digest,
    manifest_digest: contract.manifest_digest,
    projection_digest: contract.projection_digest,
    nonce: contract.nonce,
    terminal_output: "Production Codex tracer",
    gate_response: { selected_option: "Continue", rationale: "Production Codex tracer", confidence: "high", escalate_to_user: false },
  },
};
fs.writeFileSync(process.argv[lastIndex + 1], JSON.stringify(output));
process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: "codex-production-session" }) + "\\n");
process.stdout.write(JSON.stringify({ type: "turn.started" }) + "\\n");
process.stdout.write(JSON.stringify({ type: "item.completed", item: { id: "item-1", type: "agent_message", text: "Production Codex tracer" } }) + "\\n");
process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 } }) + "\\n");
`, { mode: 0o755 });
  fs.chmodSync(executable, 0o755);
  const statePath = path.join(taskPath, "orchestrator-state.yml");
  writeTracerState(statePath, "production-codex-runtime-tracer");
  const bridgeModule = path.join(sandboxRoot, "codex-bridge-v1.mjs");
  fs.writeFileSync(bridgeModule, `export async function createMaisterAgentBridgeV1(request) {\n  if (request.schema_version !== 1 || request.target !== "codex") throw new Error("bad owner request");\n  return { schema_version: 1, target: "codex", credentials_owner: "host", version_owner: "host", capability_port: { async inspect(input) { return { schema_version: 1, executable: { available: true, path: ${JSON.stringify(executable)} }, authentication: { available: true, authenticated: true }, version: { value: ${JSON.stringify(activeReceipt.target.host_version)}, allowed: true }, controls: { working_root: true, model: true, reasoning_effort: true, sandbox: true, jsonl: true, output_schema: true, last_message: true, ignore_user_config: true }, model: { available: true, supported: true, value: input.required_model ?? "gpt-5.6-terra" }, reasoning: { available: true, supported: true, value: input.required_reasoning_effort ?? "high" } }; } } };\n}\n`, "utf8");
  const invoked = invokePackagedAgentGate(extractedRoot, productionGateRequest({ target: "codex", home, stateRoot: state, workingRoot: extractedRoot, statePath, bridgeModule }));
  assert.equal(invoked.status, 0, JSON.stringify(invoked.response));
  assert.equal(invoked.response.result.directive, "continue", JSON.stringify(invoked.response));
  assert.equal(invoked.response.result.gate.advisor.terminal_dispatch.adapter_id, "codex.exec");
  assert.equal(invoked.response.result.gate.advisor.terminal_dispatch.output.selected_option, "Continue");
});

test("target archives are deterministic, self-contained, and support a clean lifecycle", () => {
  const archives = packageArchives();

  for (const target of SUPPORTED_TARGET_IDS) {
    const packageValue = archives[target];
    const firstArchive = typeof packageValue === "string" ? packageValue : packageValue.first;
    if (typeof packageValue !== "string") {
      assert.equal(sha256(firstArchive), sha256(packageValue.second), `${target} archive is not deterministic`);
    }

    const listing = execFileSync("tar", ["-tzf", firstArchive], { encoding: "utf8" });
    const entries = listing.trim().split(/\r?\n/u);
    assert.deepEqual(entries, [...entries].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)), `${target} archive entries are not sorted`);
    assert.match(listing, /plugins\/maister\/skills\/orchestrator-framework\/bin\/orchestrator-state-schema\.mjs\n/u, target);
    assert.match(listing, new RegExp(`plugins/maister/overlays/${target}/overlay\\.yml\\n`, "u"), target);
    assert.match(listing, /plugins\/maister\/.maister-e3-attestation\.json\n/u, target);
    for (const otherTarget of SUPPORTED_TARGET_IDS.filter((candidate) => candidate !== target)) {
      assert.match(listing, new RegExp(`plugins/maister/overlays/${otherTarget}/overlay\\.yml\\n`, "u"), target);
      assert.match(listing, new RegExp(`plugins/maister/overlays/${otherTarget}/inventory\\.yml\\n`, "u"), target);
      assert.doesNotMatch(listing, new RegExp(`plugins/maister/overlays/${otherTarget}/assets/`, "u"), target);
    }

    const extractedRoot = tempDirectory(`maister-package-${target}-extract-`);
    extractArchive(firstArchive, extractedRoot);
    assert.equal(fs.statSync(path.join(extractedRoot, "plugins/maister/bin/maister-agent-gate.mjs")).mode & 0o777, 0o755, `${target} agent-gate owner must be executable`);
    const sandboxRoot = tempDirectory(`maister-package-${target}-sandbox-`);
    const home = path.join(sandboxRoot, "home");
    const state = path.join(sandboxRoot, "state");
    fs.mkdirSync(home);
    fs.mkdirSync(state);
    const installed = invokeArchive(extractedRoot, target, "install", home, state);
    assert.equal(installed.ok, true, target);
    if (target === "pi" && process.env.MAISTER_RELEASE_EVIDENCE_OUTPUT) {
      const activePointerPath = path.join(state, "maister", target, "active-receipt.json");
      const activePointer = JSON.parse(fs.readFileSync(activePointerPath, "utf8"));
      const activeReceipt = JSON.parse(fs.readFileSync(activePointer.receipt_path, "utf8"));
      const evidenceOutput = path.resolve(ROOT, process.env.MAISTER_RELEASE_EVIDENCE_OUTPUT);
      fs.mkdirSync(path.dirname(evidenceOutput), { recursive: true });
      fs.writeFileSync(evidenceOutput, `${JSON.stringify({ schema_version: 1, target: "pi", records: activeReceipt.evidence }, null, 2)}\n`);
    }
    assert.equal(invokeArchive(extractedRoot, target, "verify", home, state).ok, true, target);
    assert.equal(invokeArchive(extractedRoot, target, "uninstall", home, state).ok, true, target);
  }
});

test("target archives contain the canonical projection contract and runtime closure without foreign behavior trees", () => {
  const archives = packageArchives();

  for (const target of SUPPORTED_TARGET_IDS) {
    const packageValue = archives[target];
    const archive = typeof packageValue === "string" ? packageValue : packageValue.first;
    const entries = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split(/\r?\n/u);
    const entrySet = new Set(entries);

    for (const required of [
      "plugins/maister/agent-projection-v1.json",
      "plugins/maister/agents/advisor.md",
      "plugins/maister/bin/maister-install.mjs",
      "plugins/maister/bin/project-agents.mjs",
      "plugins/maister/lib/distribution/agent-projector.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/agent-resolver.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/create-runtime.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-runtime.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs",
      "plugins/maister/bin/maister-agent-gate.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/dispatch-task-preparer.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/node-process-port.mjs",
      "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/exact-native.mjs",
      "plugins/maister/.maister-source.json",
      "plugins/maister/.maister-e3-attestation.json",
      `plugins/maister/overlays/${target}/inventory.yml`,
      `plugins/maister/overlays/${target}/overlay.yml`,
    ]) {
      assert.equal(entrySet.has(required), true, `${target} package is missing ${required}`);
    }

    assert.equal(entries.some((entry) => /plugins\/maister\/overlays\/cursor\/assets\/agents\//u.test(entry)), false, target);
    assert.equal(entries.some((entry) => /plugins\/maister\/overlays\/kiro-cli\/assets\/agents\//u.test(entry)), false, target);
    assert.equal(entries.some((entry) => /plugins\/maister\/\.codex\/agents\/.*\.toml$/u.test(entry)), false, target);
    assert.equal(entries.some((entry) => /plugins\/maister\/overlays\/[^/]+\/parity-baseline\.json$/u.test(entry)), false, target);

    for (const otherTarget of SUPPORTED_TARGET_IDS.filter((candidate) => candidate !== target)) {
      assert.equal(entries.some((entry) => entry.startsWith(`plugins/maister/overlays/${otherTarget}/assets/`)), false, `${target} contains ${otherTarget} assets`);
    }
  }
});

test("packaged lifecycle rejects missing, forged, mismatched, and stale E3 attestations", () => {
  const validDirectory = tempDirectory("maister-e3-valid-package-");
  const attestation = makeTestAttestation(validDirectory);
  const validArchive = makePackage(validDirectory, "codex", { attestation });
  const missingDirectory = tempDirectory("maister-e3-missing-package-");
  const missingArchive = makePackage(missingDirectory, "codex");

  const missingExtracted = tempDirectory("maister-e3-missing-extract-");
  extractArchive(missingArchive, missingExtracted);
  const missingSandbox = tempDirectory("maister-e3-missing-sandbox-");
  fs.mkdirSync(path.join(missingSandbox, "home"));
  fs.mkdirSync(path.join(missingSandbox, "state"));
  const missing = invokeArchiveAttempt(
    missingExtracted,
    "codex",
    "install",
    path.join(missingSandbox, "home"),
    path.join(missingSandbox, "state"),
  );
  assert.equal(missing.status, 4);
  assert.equal(missing.response.error.kind, "E_EVIDENCE_ATTESTATION_MISSING");

  const validExtracted = tempDirectory("maister-e3-valid-extract-");
  extractArchive(validArchive, validExtracted);
  const embeddedPath = path.join(validExtracted, "plugins/maister/.maister-e3-attestation.json");
  const base = JSON.parse(fs.readFileSync(embeddedPath, "utf8"));
  const cases = [
    ["forged", { ...base, artifact_digest: "0".repeat(64) }, "E_EVIDENCE_ATTESTATION_BINDING", {}],
    ["mismatched", { ...base, source_commit: "a".repeat(40) }, "E_EVIDENCE_ATTESTATION_BINDING", {}],
    ["stale", { ...base, tested_at: "2026-07-14T00:00:00.000Z", expires_at: "2026-07-14T01:00:00.000Z" }, "E_EVIDENCE_ATTESTATION_STALE", { MAISTER_EVIDENCE_NOW: "2026-07-15T00:00:00.000Z" }],
  ];
  for (const [name, value, kind, env] of cases) {
    const sandbox = tempDirectory(`maister-e3-${name}-sandbox-`);
    const home = path.join(sandbox, "home");
    const state = path.join(sandbox, "state");
    const candidatePath = path.join(sandbox, `${name}-e3.json`);
    fs.writeFileSync(candidatePath, `${JSON.stringify(value, null, 2)}\n`);
    fs.mkdirSync(home);
    fs.mkdirSync(state);
    const result = invokeArchiveAttempt(validExtracted, "codex", "install", home, state, ["--attestation", candidatePath], env);
    assert.equal(result.status, 4, name);
    assert.equal(result.response.error.kind, kind, name);
  }
});

test("release metadata binds checksums, current admission, and self-declared limitations", () => {
  const root = tempDirectory("maister-release-metadata-");
  const admissionReport = path.join(root, "current-target-admission.json");
  const attestation = {
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "make test-core",
    result: "passed",
    source_commit: COMMIT,
    source_version: "test",
    portable_core_tree_hash: "b".repeat(64),
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: "2026-07-15T10:00:00.000Z",
    expires_at: "2026-07-16T10:00:00.000Z",
    artifact_digest: "b".repeat(64),
  };
  const archives = SUPPORTED_TARGET_IDS.map((target) => {
    const name = `maister-${target}.tar.gz`;
    const filePath = path.join(root, name);
    const staging = tempDirectory(`maister-release-metadata-${target}-stage-`);
    fs.mkdirSync(path.join(staging, "plugins/maister"), { recursive: true });
    fs.writeFileSync(path.join(staging, "plugins/maister/.maister-e3-attestation.json"), `${JSON.stringify(attestation, null, 2)}\n`);
    execFileSync("tar", ["-czf", filePath, "-C", staging, "plugins"], { stdio: "pipe" });
    return { name, hash: sha256(filePath) };
  });
  fs.writeFileSync(path.join(root, "SHA256SUMS"), `${archives.map(({ name, hash }) => `${hash}  ${name}`).join("\n")}\n`);
  const piRecords = piEvidenceRecords();
  fs.writeFileSync(admissionReport, `${JSON.stringify({
    schema_version: 1,
    gate: "current-target-admission-v1",
    target_set: [...SUPPORTED_TARGET_IDS],
    ok: true,
    targets: SUPPORTED_TARGET_IDS.map((target) => ({ target, ok: true, overlay_id: `maister/${target}`, overlay_version: "1.0.0", contract_hash: "a".repeat(64) })),
    pi_support: {
      label: "pi.structural-transactional.provisional",
      claim_basis: "validated-current-evidence-v1",
      evidence: { E1: "passed", E2: "passed", E3: "passed", E4: "passed", E5: "unavailable", E6: "unavailable" },
      evidence_binding: {
        schema_version: 1,
        kind: "pi-transaction-evidence-v1",
        target: "pi",
        source_commit: COMMIT,
        source_version: "test",
        overlay_id: "maister/pi",
        overlay_version: "1.0.0",
        overlay_hash: "a".repeat(64),
        evidence_digest: evidenceDigest(piRecords),
        evidence_ids: piRecords.map((record) => ({ capability: record.capability, evidence_id: record.evidence_id, result: record.result, timestamp: record.timestamp, expires_at: record.expires_at })),
      },
      evidence_records: piRecords,
      structural_transactional: { status: "provisional", required_evidence: ["E1", "E2", "E3", "E4"] },
      native_discovery: { status: "unavailable", evidence: "E5", reason: "host_evidence_unavailable", remediation: "run E5" },
      native_runtime: { status: "unavailable", evidence: "E6", reason: "host_evidence_unavailable", remediation: "run E6" },
      semantic: { status: "unavailable", evidence: "E6", reason: "native_runtime_unavailable", remediation: "run E6" },
    },
  })}\n`);

  createReleaseMetadata({
    archiveDir: root,
    outputDir: root,
    sourceCommit: COMMIT,
    sourceVersion: "test",
    admissionReportPath: admissionReport,
    sourceDateEpoch: 1700000000,
  });
  assert.equal(verifyReleaseMetadata({ archiveDir: root, outputDir: root }).ok, true);
  const provenance = JSON.parse(fs.readFileSync(path.join(root, "PROVENANCE.json"), "utf8"));
  assert.equal(provenance.sbom.sha256, sha256(path.join(root, "SBOM.cdx.json")));
  assert.equal(provenance.portable_core_attestation.supplied, true);
  assert.equal(provenance.portable_core_attestation.source_commit, COMMIT);
  assert.equal(provenance.build.artifacts[0].attestation.digest, provenance.portable_core_attestation.digest);
  assert.equal(provenance.build.target_admission.gate, "current-target-admission-v1");
  assert.deepEqual(provenance.build.target_admission.target_set, ["codex", "cursor", "kiro-cli", "pi"]);
  assert.equal(provenance.pi_support.label, "pi.structural-transactional.provisional");
  assert.equal(provenance.pi_support.evidence.E5, "unavailable");
  assert.equal(provenance.external_prerequisites[0].name, "pi-subagents");
  assert.equal(provenance.external_prerequisites[0].bundled, false);
  provenance.portable_core_attestation.digest = "0".repeat(64);
  fs.writeFileSync(path.join(root, "PROVENANCE.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  assert.throws(
    () => verifyReleaseMetadata({ archiveDir: root, outputDir: root }),
    (error) => error.code === "E_RELEASE_METADATA_VERIFY",
  );
  createReleaseMetadata({
    archiveDir: root,
    outputDir: root,
    sourceCommit: COMMIT,
    sourceVersion: "test",
    admissionReportPath: admissionReport,
    sourceDateEpoch: 1700000000,
  });
  const changed = path.join(root, "maister-codex.tar.gz");
  fs.appendFileSync(changed, "changed");
  assert.throws(
    () => verifyReleaseMetadata({ archiveDir: root, outputDir: root }),
    (error) => error.code === "E_RELEASE_METADATA_INPUT",
  );
});

test("the public CLI keeps one injected GitHub checkout for source and overlay resolution", async () => {
  const { runCli } = await import("../../plugins/maister/bin/maister-install.mjs");
  const sourceRoot = tempDirectory("maister-github-source-");
  const productionPluginRoot = path.join(ROOT, "plugins/maister");
  const injectedPluginRoot = path.join(sourceRoot, "plugins/maister");
  fs.cpSync(path.join(productionPluginRoot, "common"), path.join(sourceRoot, "common"), { recursive: true });
  for (const entry of ["agent-projection-v1.json", "agents", "bin", "lib", "skills", "overlays"]) {
    fs.cpSync(path.join(productionPluginRoot, entry), path.join(injectedPluginRoot, entry), { recursive: true });
  }
  const attestationPath = path.join(sourceRoot, "e3-portable-core.json");
  const portableCoreHash = portableCoreTreeHash(sourceRoot);
  const testedAt = new Date();
  const expiresAt = new Date(testedAt.getTime() + (60 * 60 * 1000));
  fs.writeFileSync(attestationPath, `${JSON.stringify({
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "fixture-core-test",
    result: "passed",
    source_commit: COMMIT,
    source_version: "2.0.0",
    portable_core_tree_hash: portableCoreHash,
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: testedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    artifact_digest: portableCoreHash,
  }, null, 2)}\n`);
  const root = tempDirectory("maister-github-cli-");
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  fs.mkdirSync(home);
  fs.mkdirSync(state);
  let resolverCalls = 0;
  const github = {
    resolveRef({ owner, repo, ref }) {
      resolverCalls += 1;
      assert.equal(owner, "owner");
      assert.equal(repo, "repo");
      assert.equal(ref, "main");
      return { commit: COMMIT, root: sourceRoot, sourceVersion: "2.0.0", contentHash: hashTree(sourceRoot).contentHash };
    },
  };

  const result = await runCli([
    "install",
    "--target",
    "codex",
    "--source",
    "github:owner/repo",
    "--ref",
    "main",
    "--attestation",
    attestationPath,
    "--home",
    home,
    "--json",
  ], { env: { ...process.env, XDG_STATE_HOME: state, MAISTER_EVIDENCE_NOW: TEST_EVIDENCE_NOW }, github });

  assert.equal(result.status, 0, result.output);
  const response = JSON.parse(result.output);
  assert.equal(response.ok, true);
  assert.equal(resolverCalls, 1);
  const receipt = JSON.parse(fs.readFileSync(response.receipt_path, "utf8"));
  assert.equal(receipt.source.kind, "github");
  assert.equal(receipt.source.requested, "github:owner/repo");
  assert.equal(receipt.source.resolved_commit, COMMIT);
});
