import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createPiExtensionBridge,
  createPiNativeAdapter,
  PI_DELEGATION_EVENTS,
  PI_ORCHESTRATION_COMMANDS,
  PI_DELEGATION_PROTOCOL_VERSION,
} from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/pi-native.mjs";
import { sanitizeObservationValue } from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-payload.mjs";
import { readObservationEventStream } from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);

const DELEGATION = Object.freeze({
  SUBAGENT_DELEGATION_PROTOCOL_VERSION: PI_DELEGATION_PROTOCOL_VERSION,
  SUBAGENT_DELEGATION_REQUEST_EVENT: PI_DELEGATION_EVENTS.request,
  SUBAGENT_DELEGATION_STARTED_EVENT: PI_DELEGATION_EVENTS.started,
  SUBAGENT_DELEGATION_UPDATE_EVENT: PI_DELEGATION_EVENTS.update,
  SUBAGENT_DELEGATION_RESPONSE_EVENT: PI_DELEGATION_EVENTS.response,
  SUBAGENT_DELEGATION_CANCEL_EVENT: PI_DELEGATION_EVENTS.cancel,
});

function createEventBus() {
  const listeners = new Map();
  const emitted = [];
  return {
    emitted,
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
      emitted.push({ channel, value: structuredClone(value) });
      for (const handler of [...(listeners.get(channel) ?? [])]) handler(value);
      return true;
    },
  };
}

function createTask(taskPath, overrides = {}) {
  const home = path.join(taskPath, "home");
  const agentRoot = path.join(home, ".pi", "agent");
  const sessionRoot = path.join(agentRoot, "sessions");
  fs.mkdirSync(sessionRoot, { recursive: true, mode: 0o700 });
  return {
    task_path: taskPath,
    working_root: taskPath,
    bounded_task: "Inspect only the bounded change.",
    home,
    agent_root: agentRoot,
    session_root: sessionRoot,
    ...overrides,
  };
}

function createPlan(overrides = {}) {
  return {
    schema_version: 1,
    dispatch_id: "dispatch-pi-001",
    requested_logical_role_id: "maister:project-analyzer",
    role_id: "project-analyzer",
    role_source_digest: DIGEST_A,
    target: "pi",
    representation: "pi-native-delegation-v1",
    adapter_id: "pi.native",
    native_role_external_id: "maister:project-analyzer",
    host: "pi",
    host_version: "0.80.10",
    policy: {
      execution_profile_id: "pi.read-only",
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
      receipt_id: "receipt-pi-001",
      receipt_path: "/state/receipts/receipt-pi-001.json",
      projection_schema_version: 1,
      projector_version: "1.0.0",
      canonical_set_digest: DIGEST_A,
      manifest_digest: DIGEST_B,
      projected_tree_digest: DIGEST_C,
    },
    ...overrides,
  };
}

function createNativePort(eventBus, { onProcessLoss = null, delegation = DELEGATION } = {}) {
  return {
    eventBus,
    delegation,
    hostVersion: "0.80.10",
    authenticated: true,
    externalCollisions: [],
    async inspect() {
      return {
        schema_version: 1,
        exact_launch: true,
        observable_identity: true,
      };
    },
    onProcessLoss,
  };
}

function captureEventPort() {
  const events = [];
  return {
    events,
    append({ event }) {
      events.push(structuredClone(event));
      return { status: "recorded", event: structuredClone(event), complete: event.event_type === "terminal" || event.event_type === "failure" || event.event_type === "process_lost" };
    },
  };
}

function driveCompletion(eventBus, requests, { output = { summary: "done" }, update = null, responseStatus = "completed", responseAgent = null } = {}) {
  eventBus.on(PI_DELEGATION_EVENTS.request, (request) => {
    requests.push(structuredClone(request));
    eventBus.emit(PI_DELEGATION_EVENTS.started, {
      version: 1,
      requestId: request.requestId,
      agent: request.agent,
    });
    if (update) {
      eventBus.emit(PI_DELEGATION_EVENTS.update, {
        version: 1,
        requestId: request.requestId,
        agent: request.agent,
        update,
      });
    }
    eventBus.emit(PI_DELEGATION_EVENTS.response, {
      version: 1,
      requestId: request.requestId,
      agent: responseAgent ?? request.agent,
      status: responseStatus,
      output,
    });
  });
}

function temporaryTask() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "maister-pi-native-"));
}

test("Pi adapter emits a bounded public v1 request only after durable dispatch_requested", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const eventBus = createEventBus();
  const requests = [];
  const events = captureEventPort();
  driveCompletion(eventBus, requests, { update: { currentTool: "read", counters: { turns: 1 } } });
  const adapter = createPiNativeAdapter({
    nativePort: createNativePort(eventBus),
    eventPort: events,
    clock: () => "2026-07-21T00:00:00.000Z",
  });

  const candidatePlan = createPlan();
  const result = await adapter({ plan: candidatePlan, task: createTask(root) });

  assert.equal(result.status, "succeeded");
  assert.equal(result.observed_native_role_external_id, "maister:project-analyzer");
  assert.deepEqual(requests, [{
    version: 1,
    requestId: candidatePlan.dispatch_id,
    agent: "maister:project-analyzer",
    task: "Inspect only the bounded change.",
    context: "fresh",
    cwd: root,
    model: "pi-default",
    timeoutMs: 900_000,
    turnBudget: { maxTurns: 8 },
    toolBudget: { hard: 64 },
  }]);
  assert.deepEqual(events.events.map((event) => event.event_type), [
    "dispatch_requested",
    "started",
    "update",
    "response_observed",
    "terminal",
  ]);
  assert.equal(events.events[0].request_id, candidatePlan.dispatch_id);
  assert.equal(events.events[0].requested_agent, candidatePlan.requested_logical_role_id);
  assert.equal(eventBus.emitted[0].channel, PI_DELEGATION_EVENTS.request);
});

test("Pi adapter rejects timeout and cwd values outside the public request contract", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const eventBus = createEventBus();
  const adapter = createPiNativeAdapter({ nativePort: createNativePort(eventBus), eventPort: captureEventPort() });
  const baseline = createPlan();
  const oversized = await adapter({
    plan: createPlan({ policy: { ...baseline.policy, timeout_ms: 900_001 } }),
    task: createTask(root),
  });
  assert.equal(oversized.status, "failed");
  assert.equal(oversized.error.code, "E_PI_REQUEST_BOUNDS");
  const missingRoot = await adapter({
    plan: createPlan({ dispatch_id: "dispatch-pi-no-cwd" }),
    task: createTask(root, { working_root: undefined, cwd: undefined }),
  });
  assert.equal(missingRoot.status, "failed");
  assert.equal(missingRoot.error.code, "E_PI_REQUEST_BOUNDS");
});

test("Pi adapter fails closed on a response identity mismatch", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const eventBus = createEventBus();
  const events = captureEventPort();
  const requests = [];
  driveCompletion(eventBus, requests, { responseAgent: "maister:other-role" });
  const adapter = createPiNativeAdapter({ nativePort: createNativePort(eventBus), eventPort: events });

  const result = await adapter({ plan: createPlan(), task: createTask(root) });

  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_PI_IDENTITY_MISMATCH");
  assert.deepEqual(events.events.map((event) => event.event_type), ["dispatch_requested", "started", "failure"]);
  assert.equal(requests.length, 1);
});

test("Pi observation JSONL is durable, hash-chained, and redacts sensitive updates", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const eventBus = createEventBus();
  const requests = [];
  const privatePath = path.join(root, "home", "private.txt");
  driveCompletion(eventBus, requests, {
    update: {
      currentTool: "read",
      currentToolArgs: `token=super-secret cwd=${privatePath}`,
      recentOutput: "password=top-secret",
      path: privatePath,
      counters: { turns: 1, tools: 1 },
    },
  });
  const candidatePlan = createPlan();
  const candidateTask = createTask(root);
  const adapter = createPiNativeAdapter({
    nativePort: createNativePort(eventBus),
    clock: () => "2026-07-21T00:00:00.000Z",
  });

  const result = await adapter({ plan: candidatePlan, task: candidateTask });
  const stream = readObservationEventStream({ taskPath: root, dispatchId: candidatePlan.dispatch_id });

  assert.equal(result.status, "succeeded");
  assert.equal(stream.complete, true);
  assert.deepEqual(stream.events.map((event) => event.event_type), [
    "dispatch_requested",
    "started",
    "update",
    "response_observed",
    "terminal",
  ]);
  assert.equal(stream.events.at(-1).previous_hash, stream.events.at(-2).hash);
  const serialized = JSON.stringify(stream.events);
  assert.doesNotMatch(serialized, /super-secret|top-secret/);
  assert.match(serialized, /\$PI_AGENT_ROOT/);
  assert.equal(fs.statSync(stream.streamPath).mode & 0o777, 0o600);
});

test("Pi observation sanitization redacts credential, auth, session, and quoted assignment values completely", () => {
  const sanitized = sanitizeObservationValue({
    auth: "bearer-secret",
    session: "raw transcript contents",
    headers: { Authorization: "Bearer super-secret" },
    password: "quoted secret value",
    text: "authorization: \"Bearer quoted-secret\" password=secret phrase",
  }, { maximumBytes: 12 * 1024 }).value;
  const serialized = JSON.stringify(sanitized);
  assert.deepEqual(sanitized.auth, "[REDACTED]");
  assert.deepEqual(sanitized.session, "[REDACTED]");
  assert.deepEqual(sanitized.headers.Authorization, "[REDACTED]");
  assert.deepEqual(sanitized.password, "[REDACTED]");
  assert.doesNotMatch(serialized, /bearer-secret|raw transcript|super-secret|quoted-secret|secret phrase/u);
});

test("Pi adapter exposes public cancellation and records process loss as terminal outcomes", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const cancelBus = createEventBus();
  const cancelEvents = captureEventPort();
  cancelBus.on(PI_DELEGATION_EVENTS.request, (request) => {
  });
  cancelBus.on(PI_DELEGATION_EVENTS.cancel, (request) => {
    cancelBus.emit(PI_DELEGATION_EVENTS.response, { requestId: request.requestId, agent: "maister:project-analyzer", status: "cancelled" });
  });
  const cancelAdapter = createPiNativeAdapter({ nativePort: createNativePort(cancelBus), eventPort: cancelEvents });
  const cancelPlan = createPlan({ dispatch_id: "dispatch-pi-cancel" });
  const cancelPromise = cancelAdapter({ plan: cancelPlan, task: createTask(root) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await cancelAdapter.cancel(cancelPlan.dispatch_id), true);
  const cancelled = await cancelPromise;
  assert.equal(cancelled.status, "failed");
  assert.equal(cancelled.error.code, "E_PI_CANCELLED");
  assert.deepEqual(cancelEvents.events.map((event) => event.event_type), ["dispatch_requested", "cancel_requested", "response_observed", "terminal"]);

  let processLoss;
  const lossBus = createEventBus();
  const lossEvents = captureEventPort();
  lossBus.on(PI_DELEGATION_EVENTS.request, (request) => {
    lossBus.emit(PI_DELEGATION_EVENTS.started, { requestId: request.requestId, agent: request.agent });
  });
  const lossAdapter = createPiNativeAdapter({
    nativePort: createNativePort(lossBus, { onProcessLoss: (handler) => { processLoss = handler; return () => { processLoss = null; }; } }),
    eventPort: lossEvents,
  });
  const lossPlan = createPlan({ dispatch_id: "dispatch-pi-loss" });
  const lossPromise = lossAdapter({ plan: lossPlan, task: createTask(root) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof processLoss, "function");
  processLoss();
  const lost = await lossPromise;
  assert.equal(lost.status, "failed");
  assert.equal(lost.error.code, "E_PI_PROCESS_LOST");
  assert.deepEqual(lossEvents.events.map((event) => event.event_type), ["dispatch_requested", "started", "process_lost"]);
});

test("the generated ExtensionAPI bridge registers orchestration commands and cleans up on session shutdown", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const eventBus = createEventBus();
  const events = captureEventPort();
  const requests = [];
  const userMessages = [];
  driveCompletion(eventBus, requests);
  const commands = new Map();
  const lifecycle = new Map();
  const pi = {
    events: eventBus,
    registerCommand(name, definition) {
      commands.set(name, definition);
    },
    sendUserMessage: (message, options) => userMessages.push({ message, options }),
    on(name, handler) {
      lifecycle.set(name, handler);
      return () => lifecycle.delete(name);
    },
  };
  const bridge = createPiExtensionBridge({ pi, delegation: DELEGATION, eventPort: events, clock: () => "2026-07-21T00:00:00.000Z" });
  const commandContext = {
    cwd: root,
    taskPath: root,
    isIdle: () => true,
    sessionManager: { getSessionId: () => "session-pi-command" },
  };
  const candidatePlan = createPlan({ dispatch_id: "dispatch-pi-command" });
  const result = await commands.get("maister-delegate").handler({ plan: candidatePlan, task: createTask(root) }, commandContext);
  await commands.get("maister-work").handler("Add a feature", commandContext);
  await commands.get("maister-development").handler("Add a feature --e2e", commandContext);
  await commands.get("maister-init").handler("", commandContext);
  await commands.get("maister-bye").handler("Keep this path", commandContext);
  await commands.get("maister-resume").handler(".maister/tasks/development/example", commandContext);
  await commands.get("maister-status").handler("", commandContext);
  await commands.get("maister-development").handler("Queue this", { ...commandContext, isIdle: () => false });

  assert.equal(commands.size, 1 + PI_ORCHESTRATION_COMMANDS.length);
  assert.deepEqual(
    [...commands.keys()],
    ["maister-delegate", ...PI_ORCHESTRATION_COMMANDS.map(({ name }) => name)],
  );
  assert.deepEqual(userMessages, [
    { message: "/skill:maister-work Add a feature", options: undefined },
    { message: "/skill:maister-development Add a feature --e2e", options: undefined },
    { message: "/skill:maister-init", options: undefined },
    { message: "/skill:maister-bye Keep this path", options: undefined },
    { message: "/skill:maister-resume .maister/tasks/development/example", options: undefined },
    { message: "/skill:maister-status", options: undefined },
    { message: "/skill:maister-development Queue this", options: { deliverAs: "followUp" } },
  ]);
  assert.equal(result.status, "succeeded");
  assert.equal(requests.length, 1);
  assert.equal(events.events[0].payload.session_id, "session-pi-command");
  assert.equal(lifecycle.has("session_shutdown"), true);
  lifecycle.get("session_shutdown")();
  await bridge.dispose();
  assert.equal(lifecycle.has("session_shutdown"), false);
});

test("ExtensionAPI disposal terminates an active delegation and is idempotent", async (t) => {
  const root = temporaryTask();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const eventBus = createEventBus();
  const events = captureEventPort();
  const commands = new Map();
  const pi = {
    events: eventBus,
    registerCommand(name, definition) {
      commands.set(name, definition);
    },
    on() {
      return () => {};
    },
  };
  const bridge = createPiExtensionBridge({ pi, delegation: DELEGATION, eventPort: events, clock: () => "2026-07-21T00:00:00.000Z" });
  const pending = commands.get("maister-delegate").handler({
    plan: createPlan({ dispatch_id: "dispatch-pi-dispose" }),
    task: createTask(root),
  }, {
    cwd: root,
    taskPath: root,
    sessionManager: { getSessionId: () => "session-pi-dispose" },
  });
  await new Promise((resolve) => setImmediate(resolve));
  await bridge.dispose();
  await bridge.dispose();
  const result = await pending;
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_PI_PROCESS_LOST");
  assert.deepEqual(events.events.map((event) => event.event_type), ["dispatch_requested", "process_lost"]);
});
