import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { generateE3Attestation } from "../../plugins/maister/bin/generate-e3-attestation.mjs";
import { packageTarget } from "../../plugins/maister/bin/release-interface.mjs";
import { PI_DELEGATION_EVENT_VALUES, probePi } from "../../plugins/maister/lib/distribution/host-probes/pi.mjs";
import { materialize } from "../../plugins/maister/lib/distribution/materializer.mjs";
import { portableCoreTreeHash } from "../../plugins/maister/lib/distribution/e3-attestation.mjs";
import { getTargetPaths } from "../../plugins/maister/lib/distribution/target-paths.mjs";
import {
  acquireLock,
  executeLifecycle,
} from "../../plugins/maister/lib/distribution/transaction-manager.mjs";
import {
  createPiNativeAdapter,
  PI_DELEGATION_EVENTS,
  PI_DELEGATION_PROTOCOL_VERSION,
} from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/pi-native.mjs";
import { readObservationEventStream } from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OVERLAY_ROOT = path.join(ROOT, "plugins/maister/overlays");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPO_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const SOURCE_VERSION = "g7-test";
const HOST_VERSION = "0.80.10";
const NOW = "2026-07-21T00:00:00.000Z";

const repositoryGit = {
  topLevel: () => ROOT,
  head: () => COMMIT,
  status: () => [],
};

const DELEGATION = Object.freeze({
  SUBAGENT_DELEGATION_PROTOCOL_VERSION: PI_DELEGATION_PROTOCOL_VERSION,
  SUBAGENT_DELEGATION_REQUEST_EVENT: PI_DELEGATION_EVENTS.request,
  SUBAGENT_DELEGATION_STARTED_EVENT: PI_DELEGATION_EVENTS.started,
  SUBAGENT_DELEGATION_UPDATE_EVENT: PI_DELEGATION_EVENTS.update,
  SUBAGENT_DELEGATION_RESPONSE_EVENT: PI_DELEGATION_EVENTS.response,
  SUBAGENT_DELEGATION_CANCEL_EVENT: PI_DELEGATION_EVENTS.cancel,
});

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function temporaryRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function snapshotTree(root) {
  const entries = [];
  const visit = (current, relative = "") => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(current, entry.name);
      const entryPath = relative ? `${relative}/${entry.name}` : entry.name;
      const stat = fs.lstatSync(absolute);
      const mode = (stat.mode & 0o7777).toString(8).padStart(4, "0");
      if (entry.isDirectory()) {
        entries.push({ path: entryPath, type: "directory", mode });
        visit(absolute, entryPath);
      } else if (entry.isFile()) {
        const bytes = fs.readFileSync(absolute);
        entries.push({ path: entryPath, type: "file", mode, size: bytes.length, sha256: sha256(bytes) });
      } else if (entry.isSymbolicLink()) {
        entries.push({ path: entryPath, type: "symlink", mode, target: fs.readlinkSync(absolute) });
      } else {
        entries.push({ path: entryPath, type: "unsupported", mode });
      }
    }
  };
  const stat = fs.lstatSync(root);
  visit(root);
  return {
    root_mode: (stat.mode & 0o7777).toString(8).padStart(4, "0"),
    entries,
    sha256: sha256(Buffer.from(JSON.stringify(entries), "utf8")),
  };
}

function materializeOptions(stagingRoot) {
  return {
    source: `local:${ROOT}`,
    target: "pi",
    overlayPath: path.join(OVERLAY_ROOT, "pi/overlay.yml"),
    inventoryPath: path.join(OVERLAY_ROOT, "pi/inventory.yml"),
    stagingRoot,
    git: repositoryGit,
    sourceVersion: SOURCE_VERSION,
    hostVersion: HOST_VERSION,
  };
}

function attestation() {
  const hash = portableCoreTreeHash(ROOT);
  return {
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "node --test tests/platform-independent/pi-integration.test.mjs",
    result: "passed",
    source_commit: COMMIT,
    source_version: SOURCE_VERSION,
    portable_core_tree_hash: hash,
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: "2026-07-15T00:00:00.000Z",
    expires_at: "2027-07-15T00:00:00.000Z",
    artifact_digest: hash,
  };
}

function sandbox(prefix = "maister-pi-g7-") {
  const root = temporaryRoot(prefix);
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  return {
    root,
    home,
    state,
    env: {
      ...process.env,
      XDG_STATE_HOME: state,
      PI_CODING_AGENT_DIR: ".pi/agent",
      MAISTER_EVIDENCE_NOW: NOW,
    },
  };
}

function lifecycleOptions(box, overrides = {}) {
  return {
    target: "pi",
    source: `local:${ROOT}`,
    home: box.home,
    env: box.env,
    overlayRoot: OVERLAY_ROOT,
    git: repositoryGit,
    sourceVersion: SOURCE_VERSION,
    hostVersion: HOST_VERSION,
    e3Attestation: attestation(),
    unavailableEvidenceReason: "pi-host-prerequisite-unavailable",
    ...overrides,
  };
}

function settingsPath(box) {
  return path.join(box.home, ".pi/agent/settings.json");
}

function activeRoot(box) {
  return path.join(box.home, ".pi/agent/maister");
}

function writeSettings(box, value, mode = 0o640) {
  fs.mkdirSync(path.dirname(settingsPath(box)), { recursive: true });
  fs.writeFileSync(settingsPath(box), `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.chmodSync(settingsPath(box), mode);
}

function readSettings(box) {
  return JSON.parse(fs.readFileSync(settingsPath(box), "utf8"));
}

function assertObservationChain(stream) {
  assert.equal(stream.complete, true);
  for (const [index, event] of stream.events.entries()) {
    assert.match(event.hash, /^[0-9a-f]{64}$/u);
    assert.equal(event.previous_hash, index === 0 ? null : stream.events[index - 1].hash);
  }
}

function createEventBus() {
  const listeners = new Map();
  return {
    on(channel, handler) {
      const channelListeners = listeners.get(channel) ?? new Set();
      channelListeners.add(handler);
      listeners.set(channel, channelListeners);
      return () => channelListeners.delete(handler);
    },
    off(channel, handler) {
      listeners.get(channel)?.delete(handler);
    },
    emit(channel, value) {
      for (const handler of [...(listeners.get(channel) ?? [])]) handler(value);
      return true;
    },
  };
}

function runtimeTask(root, box) {
  const taskPath = path.join(root, "task");
  const sessionRoot = path.join(box.home, ".pi/agent/sessions");
  fs.mkdirSync(taskPath, { recursive: true, mode: 0o700 });
  fs.mkdirSync(sessionRoot, { recursive: true, mode: 0o700 });
  return {
    task_path: taskPath,
    working_root: root,
    bounded_task: "Inspect the bounded Pi integration fixture.",
    home: box.home,
    agent_root: path.join(box.home, ".pi/agent"),
    session_root: sessionRoot,
  };
}

function runtimePlan(receipt, role, dispatchId, descriptorPath, overrides = {}) {
  const projection = receipt.provenance.agent_projection;
  return {
    schema_version: 1,
    dispatch_id: dispatchId,
    requested_logical_role_id: `maister:${role}`,
    role_id: role,
    role_source_digest: sha256(fs.readFileSync(descriptorPath)),
    target: "pi",
    representation: "pi-native-delegation-v1",
    adapter_id: "pi.native",
    native_role_external_id: `maister:${role}`,
    host: "pi",
    host_version: HOST_VERSION,
    policy: {
      execution_profile_id: "pi.native",
      tools: ["read", "search"],
      filesystem: "read-only",
      network: "restricted",
      model: "pi-default",
      reasoning_effort: null,
      timeout_ms: 900_000,
      output_schema_id: "maister.agent-role-result.v1",
      concurrency_class: "read-only-concurrent",
      max_parallel: 1,
    },
    provenance: {
      receipt_id: receipt.receipt_id,
      receipt_path: "receipt://pi-g7",
      projection_schema_version: projection.schema_version,
      projector_version: projection.projector_version,
      canonical_set_digest: projection.canonical_set_digest,
      manifest_digest: projection.manifest_digest,
      projected_tree_digest: projection.projected_tree_digest,
    },
    ...overrides,
  };
}

function nativePort(eventBus, extras = {}) {
  return {
    eventBus,
    delegation: DELEGATION,
    hostVersion: HOST_VERSION,
    authenticated: true,
    externalCollisions: [],
    async inspect() {
      return { schema_version: 1, exact_launch: true, observable_identity: true };
    },
    ...extras,
  };
}

function extractArchive(archive, destination) {
  fs.mkdirSync(destination, { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", destination], { stdio: "pipe" });
}

test("G7 materialize is byte/mode/inventory/provenance deterministic and closed", async (t) => {
  const root = temporaryRoot("maister-pi-g7-materialize-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const first = await materialize(materializeOptions(path.join(root, "first")));
  const second = await materialize(materializeOptions(path.join(root, "second")));

  assert.deepEqual(snapshotTree(first.stagingRoot), snapshotTree(second.stagingRoot));
  assert.deepEqual(first.projection, second.projection);
  assert.deepEqual(first.commandProjection, second.commandProjection);
  assert.deepEqual(first.provenance, second.provenance);
  assert.equal(first.projection.outputs.length, 28);
  assert.equal(first.commandProjection.entries.length, 14);

  const manifest = JSON.parse(fs.readFileSync(path.join(first.stagingRoot, "package.json"), "utf8"));
  assert.deepEqual(manifest, {
    name: "maister",
    version: "1.0.0-generated",
    private: true,
    description: "Maister workflow package for Pi",
    pi: {
      extensions: ["./extensions/maister.ts"],
      skills: ["./skills"],
      prompts: ["./prompts"],
      subagents: { agents: ["./agents"] },
    },
  });
  const paths = snapshotTree(first.stagingRoot).entries.map(({ path: entryPath }) => entryPath);
  assert.equal(paths.filter((entryPath) => entryPath.startsWith("agents/maister-") && entryPath.endsWith(".md")).length, 28);
  assert.equal(paths.filter((entryPath) => entryPath.startsWith("prompts/") && entryPath.endsWith(".md")).length, 14);
  assert.equal(paths.some((entryPath) => /(?:node_modules|sessions|auth|trust|pi-subagents)(?:\/|$)/u.test(entryPath)), false);
  assert.equal(paths.some((entryPath) => entryPath.startsWith("commands/")), false);
});

test("G7 Pi lifecycle preserves absent and existing managed-array settings through update/rollback/uninstall", async (t) => {
  const absent = sandbox("maister-pi-g7-absent-");
  const existing = sandbox("maister-pi-g7-existing-");
  t.after(() => fs.rmSync(absent.root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(existing.root, { recursive: true, force: true }));

  const absentInstalled = await executeLifecycle("install", lifecycleOptions(absent));
  assert.deepEqual(readSettings(absent), { packages: ["./maister"] });
  assert.equal((fs.statSync(settingsPath(absent)).mode & 0o7777).toString(8).padStart(4, "0"), "0600");
  await executeLifecycle("verify", lifecycleOptions(absent));
  const absentUninstalled = await executeLifecycle("uninstall", lifecycleOptions(absent));
  assert.equal(absentUninstalled.receipt.status, "uninstalled");
  assert.deepEqual(readSettings(absent), { packages: [] });
  assert.equal(fs.existsSync(activeRoot(absent)), false);
  assert.equal(absentInstalled.receipt.settings[0].ownership_schema, "managed_array_entries_v1");

  const initial = {
    theme: "operator",
    auth: { token: "operator-owned" },
    trust: { pi: true },
    sessions: { keep: true },
    packages: [
      "npm:unrelated-string-package",
      {
        source: "./maister",
        autoload: true,
        extensions: ["./extensions/maister.ts"],
        skills: ["./skills"],
        prompts: ["./prompts"],
        operator_field: { keep: true },
      },
      { source: "https://example.invalid/unrelated.tgz", autoload: true },
    ],
  };
  writeSettings(existing, initial);
  const initialMode = (fs.statSync(settingsPath(existing)).mode & 0o7777).toString(8).padStart(4, "0");
  const installed = await executeLifecycle("install", lifecycleOptions(existing));
  assert.equal(installed.receipt.settings[0].entry_representation, "object");
  assert.equal(installed.receipt.settings[0].entry_after.operator_field.keep, true);
  assert.equal(installed.receipt.compatibility.status, "provisional");
  const evidence = Object.fromEntries(installed.receipt.evidence.map((record) => [record.capability, record]));
  assert.deepEqual(["E1", "E2", "E3", "E4"].map((level) => evidence[level].result), ["passed", "passed", "passed", "passed"]);
  for (const level of ["E5", "E6"]) {
    assert.equal(evidence[level].result, "unavailable");
    assert.equal(evidence[level].provenance.reason, "pi-host-prerequisite-unavailable");
  }

  const updated = await executeLifecycle("update", lifecycleOptions(existing));
  assert.notEqual(updated.receipt.receipt_id, installed.receipt.receipt_id);
  assert.deepEqual(readSettings(existing).packages, initial.packages);
  const rolledBack = await executeLifecycle("rollback", lifecycleOptions(existing));
  assert.equal(rolledBack.receipt.receipt_id, installed.receipt.receipt_id);
  const recovered = await executeLifecycle("recover", lifecycleOptions(existing));
  assert.equal(recovered.receipt.receipt_id, installed.receipt.receipt_id);
  await executeLifecycle("uninstall", lifecycleOptions(existing));
  assert.deepEqual(readSettings(existing), {
    theme: "operator",
    auth: { token: "operator-owned" },
    trust: { pi: true },
    sessions: { keep: true },
    packages: ["npm:unrelated-string-package", { source: "https://example.invalid/unrelated.tgz", autoload: true }],
  });
  assert.equal((fs.statSync(settingsPath(existing)).mode & 0o7777).toString(8).padStart(4, "0"), initialMode);
});

test("G7 Pi settings filters, drift, and cooperating concurrent writers fail closed before mutation", async (t) => {
  const filtered = sandbox("maister-pi-g7-filter-");
  const drifted = sandbox("maister-pi-g7-drift-");
  t.after(() => fs.rmSync(filtered.root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(drifted.root, { recursive: true, force: true }));

  const incompatible = { packages: [{ source: "./maister", autoload: false }], operator: true };
  writeSettings(filtered, incompatible);
  const beforeFiltered = fs.readFileSync(settingsPath(filtered));
  await assert.rejects(
    () => executeLifecycle("install", lifecycleOptions(filtered)),
    (error) => error?.kind === "E_SETTINGS_FILTER",
  );
  assert.deepEqual(fs.readFileSync(settingsPath(filtered)), beforeFiltered);
  assert.equal(fs.existsSync(activeRoot(filtered)), false);

  writeSettings(drifted, { packages: ["./maister", "operator-package"], operator: { keep: true } });
  const installed = await executeLifecycle("install", lifecycleOptions(drifted));
  fs.writeFileSync(settingsPath(drifted), `${JSON.stringify({ packages: ["./maister", "operator-package"], operator: { changed: true } }, null, 2)}\n`);
  await assert.rejects(
    () => executeLifecycle("verify", lifecycleOptions(drifted)),
    (error) => error?.kind === "E_DRIFT_CONFLICT",
  );
  const paths = getTargetPaths({ target: "pi", home: drifted.home, env: drifted.env });
  const lock = acquireLock(paths.lockPath);
  try {
    await assert.rejects(
      () => executeLifecycle("update", lifecycleOptions(drifted)),
      (error) => error?.kind === "E_LOCK_BUSY",
    );
  } finally {
    fs.rmSync(lock.lockPath, { force: true });
  }
  assert.equal(installed.receipt.status, "installed");
});

test("G7 injected failure rolls back Pi tree/settings and leaves recoverable terminal evidence", async (t) => {
  const box = sandbox("maister-pi-g7-failure-");
  t.after(() => fs.rmSync(box.root, { recursive: true, force: true }));
  writeSettings(box, { packages: ["operator-package"], operator: { keep: true } });
  const beforeHome = snapshotTree(box.home);

  await assert.rejects(
    () => executeLifecycle("install", lifecycleOptions(box, { failurePoint: "after-settings" })),
    (error) => error?.kind === "E_TX_FAILURE",
  );
  assert.deepEqual(snapshotTree(box.home), beforeHome);
  assert.equal(fs.existsSync(activeRoot(box)), false);
  const paths = getTargetPaths({ target: "pi", home: box.home, env: box.env });
  const journals = fs.readdirSync(paths.journalsRoot).filter((name) => name.endsWith(".json"));
  assert.equal(journals.length, 1);
  const journal = JSON.parse(fs.readFileSync(path.join(paths.journalsRoot, journals[0]), "utf8"));
  assert.equal(journal.state, "recovered");
  const recovered = await executeLifecycle("recover", lifecycleOptions(box));
  assert.equal(recovered.receipt, null);
});

test("G7 E5 remains explicitly unavailable without Pi host inference", () => {
  const result = probePi({
    now: NOW,
    sourceCommit: COMMIT,
    sourceVersion: SOURCE_VERSION,
    overlayVersion: "1.0.0",
    run: () => ({ status: null, stdout: "", stderr: "", error: { code: "ENOENT" }, signal: null }),
    inspect: () => ({
      executable_realpath: "/opt/pi/bin/pi",
      pi_version: HOST_VERSION,
      node_version: "25.9.0",
      pi_subagents_version: "0.35.1",
      pi_subagents_source: "/opt/pi/node_modules/pi-subagents/package.json",
      pi_subagents_digest: "a".repeat(64),
      public_exports: Object.keys(DELEGATION),
      protocol_version: 1,
      public_event_values: { ...PI_DELEGATION_EVENT_VALUES },
    }),
  });
  assert.deepEqual(result.records.map((record) => record.result), ["unavailable", "unavailable"]);
  assert.deepEqual(result.records.map((record) => record.provenance.reason), ["pi_missing", "pi_missing"]);
  assert.notEqual(result.records[0].provenance.reason, "passed");
});

test("G7 ordinary/advisor Pi public delegation lifecycle preserves identity, cancellation, process loss, retry IDs, and hash chains", async (t) => {
  const box = sandbox("maister-pi-g7-runtime-");
  t.after(() => fs.rmSync(box.root, { recursive: true, force: true }));
  const installed = await executeLifecycle("install", lifecycleOptions(box));
  const receipt = installed.receipt;
  const task = runtimeTask(box.root, box);
  const descriptorRoot = activeRoot(box);

  for (const role of ["project-analyzer", "advisor"]) {
    const eventBus = createEventBus();
    eventBus.on(PI_DELEGATION_EVENTS.request, (request) => {
      eventBus.emit(PI_DELEGATION_EVENTS.started, { version: 1, requestId: request.requestId, agent: request.agent });
      eventBus.emit(PI_DELEGATION_EVENTS.update, {
        version: 1,
        requestId: request.requestId,
        agent: request.agent,
        update: { currentTool: "read", counters: { turns: 1 }, path: path.join(box.home, ".pi/agent/private.txt") },
      });
      eventBus.emit(PI_DELEGATION_EVENTS.response, {
        version: 1,
        requestId: request.requestId,
        agent: request.agent,
        status: "completed",
        output: { role, selected_option: "Continue" },
      });
    });
    const adapter = createPiNativeAdapter({ nativePort: nativePort(eventBus), clock: () => NOW });
    const dispatchId = `g7-${role}`;
    const result = await adapter({
      plan: runtimePlan(receipt, role, dispatchId, path.join(descriptorRoot, `agents/maister-${role}.md`)),
      task,
    });
    assert.equal(result.status, "succeeded");
    assert.equal(result.observed_native_role_external_id, `maister:${role}`);
    const stream = readObservationEventStream({ taskPath: task.task_path, dispatchId });
    assertObservationChain(stream);
    assert.deepEqual(stream.events.map((event) => event.event_type), ["dispatch_requested", "started", "update", "response_observed", "terminal"]);
    assert.equal(stream.events[0].request_id, dispatchId);
  }

  const cancelBus = createEventBus();
  let cancelAdapter;
  cancelBus.on(PI_DELEGATION_EVENTS.request, (request) => {
    cancelBus.emit(PI_DELEGATION_EVENTS.started, { version: 1, requestId: request.requestId, agent: request.agent });
    setImmediate(() => cancelAdapter.cancel(request.requestId, "cancelled"));
  });
  cancelBus.on(PI_DELEGATION_EVENTS.cancel, (request) => {
    cancelBus.emit(PI_DELEGATION_EVENTS.response, {
      version: 1,
      requestId: request.requestId,
      agent: "maister:advisor",
      status: "cancelled",
      output: null,
    });
  });
  cancelAdapter = createPiNativeAdapter({ nativePort: nativePort(cancelBus), clock: () => NOW });
  const cancelId = "g7-cancel";
  const cancelled = await cancelAdapter({
    plan: runtimePlan(receipt, "advisor", cancelId, path.join(descriptorRoot, "agents/maister-advisor.md")),
    task,
  });
  assert.equal(cancelled.status, "failed");
  assert.equal(cancelled.error.code, "E_PI_CANCELLED");
  const cancelStream = readObservationEventStream({ taskPath: task.task_path, dispatchId: cancelId });
  assertObservationChain(cancelStream);
  assert.deepEqual(cancelStream.events.map((event) => event.event_type), ["dispatch_requested", "started", "cancel_requested", "response_observed", "terminal"]);

  let processLoss;
  const lossBus = createEventBus();
  lossBus.on(PI_DELEGATION_EVENTS.request, (request) => {
    lossBus.emit(PI_DELEGATION_EVENTS.started, { version: 1, requestId: request.requestId, agent: request.agent });
  });
  const lossAdapter = createPiNativeAdapter({
    nativePort: nativePort(lossBus, { onProcessLoss: (handler) => { processLoss = handler; return () => { processLoss = null; }; } }),
    clock: () => NOW,
  });
  const lossId = "g7-loss";
  const lossPromise = lossAdapter({
    plan: runtimePlan(receipt, "advisor", lossId, path.join(descriptorRoot, "agents/maister-advisor.md")),
    task,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof processLoss, "function");
  processLoss();
  const lost = await lossPromise;
  assert.equal(lost.status, "failed");
  assert.equal(lost.error.code, "E_PI_PROCESS_LOST");
  const lossStream = readObservationEventStream({ taskPath: task.task_path, dispatchId: lossId });
  assertObservationChain(lossStream);
  assert.equal(lossStream.events.at(-1).event_type, "process_lost");

  const retryBus = createEventBus();
  retryBus.on(PI_DELEGATION_EVENTS.request, (request) => {
    retryBus.emit(PI_DELEGATION_EVENTS.started, { version: 1, requestId: request.requestId, agent: request.agent });
    retryBus.emit(PI_DELEGATION_EVENTS.response, { version: 1, requestId: request.requestId, agent: request.agent, status: "completed", output: { retry: true } });
  });
  const retryAdapter = createPiNativeAdapter({ nativePort: nativePort(retryBus), clock: () => NOW });
  const retryId = "g7-retry";
  const retried = await retryAdapter({
    plan: runtimePlan(receipt, "advisor", retryId, path.join(descriptorRoot, "agents/maister-advisor.md"), { retry_of: lossId }),
    task,
  });
  assert.equal(retried.status, "succeeded");
  assert.notEqual(retryId, lossId);
  const retryStream = readObservationEventStream({ taskPath: task.task_path, dispatchId: retryId });
  assertObservationChain(retryStream);
  assert.equal(retryStream.events[0].retry_of, lossId);
});

test("G7 extracted Pi archive is sorted, prerequisite-free, and drives install/verify/uninstall", { timeout: 180_000 }, async (t) => {
  const root = temporaryRoot("maister-pi-g7-archive-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dist = path.join(root, "dist");
  const attestationPath = path.join(root, "e3.json");
  generateE3Attestation({
    root: ROOT,
    output: attestationPath,
    sourceCommit: REPO_COMMIT,
    sourceVersion: SOURCE_VERSION,
    testCommand: "node --test tests/platform-independent/pi-integration.test.mjs",
    result: "passed",
    sourceDateEpoch: 1785000000,
  });
  const packaged = packageTarget({
    env: {
      ...process.env,
      TARGET: "pi",
      DIST_DIR: dist,
      SOURCE_DATE_EPOCH: "1785000000",
      SOURCE_COMMIT: REPO_COMMIT,
      SOURCE_VERSION,
      E3_ATTESTATION: attestationPath,
    },
  });
  const listing = execFileSync("tar", ["-tzf", packaged.archive], { encoding: "utf8" }).trim().split(/\r?\n/u);
  assert.deepEqual(listing, [...listing].sort());
  assert.equal(listing.some((entry) => /(?:node_modules|sessions|auth|trust|pi-subagents)(?:\/|$)/u.test(entry)), false);

  const extracted = path.join(root, "extracted");
  extractArchive(packaged.archive, extracted);
  const archiveE3 = JSON.parse(fs.readFileSync(path.join(extracted, "plugins/maister/.maister-e3-attestation.json"), "utf8"));
  const box = sandbox("maister-pi-g7-archive-lifecycle-");
  t.after(() => fs.rmSync(box.root, { recursive: true, force: true }));
  const options = {
    target: "pi",
    source: `local:${extracted}`,
    home: box.home,
    env: box.env,
    overlayRoot: path.join(extracted, "plugins/maister/overlays"),
    sourceVersion: SOURCE_VERSION,
    hostVersion: HOST_VERSION,
    e3Attestation: archiveE3,
    unavailableEvidenceReason: "pi-host-prerequisite-unavailable",
  };
  assert.equal((await executeLifecycle("install", options)).receipt.target.id, "pi");
  assert.equal((await executeLifecycle("verify", options)).receipt.target.id, "pi");
  assert.equal((await executeLifecycle("uninstall", options)).receipt.status, "uninstalled");
});
