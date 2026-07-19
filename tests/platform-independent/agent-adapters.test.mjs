import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);

async function capabilitiesRuntime() {
  return import("../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/codex-exec-capabilities.mjs");
}

async function workerRuntime() {
  return import("../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/codex-worker-manager.mjs");
}

async function adapterRuntime(name) {
  return import(`../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/${name}.mjs`);
}

async function processRuntime() {
  return import("../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/node-process-port.mjs");
}

function policy(overrides = {}) {
  return {
    execution_profile_id: "codex.read-only",
    tools: ["read", "search"],
    filesystem: "read-only",
    network: "restricted",
    model: "gpt-5.6-terra",
    reasoning_effort: "high",
    timeout_ms: 900000,
    output_schema_id: "maister.agent-role-result.v1",
    concurrency_class: "read-only-concurrent",
    max_parallel: 4,
    ...overrides,
  };
}

function plan(overrides = {}) {
  return {
    schema_version: 1,
    dispatch_id: "dispatch-001",
    requested_logical_role_id: "maister:project-analyzer",
    role_id: "project-analyzer",
    role_source_digest: DIGEST_A,
    target: "codex",
    representation: "codex-prompt-schema",
    adapter_id: "codex.exec",
    native_role_external_id: null,
    host: "codex",
    host_version: "1.2.3",
    policy: policy(),
    provenance: {
      receipt_id: "receipt-001",
      receipt_path: "/state/receipts/receipt-001.json",
      projection_schema_version: 1,
      projector_version: "1.0.0",
      canonical_set_digest: DIGEST_A,
      manifest_digest: DIGEST_B,
      projected_tree_digest: DIGEST_C,
    },
    ...overrides,
  };
}

function task(overrides = {}) {
  const taskPath = overrides.task_path ?? "/task";
  return {
    task_path: taskPath,
    working_root: "/workspace",
    role_prompt: "FULL CANONICAL ROLE\nsecond line",
    bounded_task: "Inspect only the bounded change.",
    output_schema_path: `${taskPath}/execution/agent-dispatches/dispatch-001.schema.json`,
    last_message_path: `${taskPath}/execution/agent-dispatches/dispatch-001.last.json`,
    output_schema_id: "maister.agent-role-result.v1",
    result_selector: null,
    canonical_source_digest: DIGEST_A,
    nonce: "nonce-001",
    execution_context: {
      idempotency_key: "execution-key-001",
      gate_decision_id: "gate-decision-001",
      workflow_id: "development",
      work_item_id: "work-item-001",
    },
    ...overrides,
  };
}

function capabilityObservation(overrides = {}) {
  const observation = {
    schema_version: 1,
    executable: { available: true, path: "/usr/local/bin/codex" },
    authentication: { available: true, authenticated: true },
    version: { value: "1.2.3", allowed: true },
    controls: {
      working_root: true,
      model: true,
      reasoning_effort: true,
      sandbox: true,
      jsonl: true,
      output_schema: true,
      last_message: true,
      ignore_user_config: true,
    },
    model: { available: true, supported: true, value: "gpt-5.6-terra" },
    reasoning: { available: true, supported: true, value: "high" },
  };
  return { ...observation, ...overrides };
}

function capabilityPort(observation = capabilityObservation(), calls = []) {
  return {
    async inspect(request) {
      calls.push(structuredClone(request));
      return structuredClone(observation);
    },
  };
}

function lastMessage(candidatePlan = plan(), candidateTask = task(), overrides = {}) {
  return JSON.stringify({
    logical_role_id: candidatePlan.requested_logical_role_id,
    status: "completed",
    summary: "inspection complete",
    details: {
      dispatch_id: candidatePlan.dispatch_id,
      session_id: "session-001",
      canonical_source_digest: candidateTask.canonical_source_digest,
      manifest_digest: candidatePlan.provenance.manifest_digest,
      projection_digest: candidatePlan.provenance.projected_tree_digest,
      nonce: candidateTask.nonce,
      effective_model: candidatePlan.policy.model,
      effective_reasoning_effort: candidatePlan.policy.reasoning_effort,
      terminal_output: "inspection complete",
      ...overrides,
    },
  });
}

function successfulProcessResult(candidatePlan = plan(), candidateTask = task(), overrides = {}) {
  const stdout = [
    JSON.stringify({ type: "thread.started", thread_id: "session-001" }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { id: "item-001", type: "agent_message", text: "inspection complete" } }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 42, cached_input_tokens: 0, output_tokens: 7 } }),
  ].join("\n");
  return {
    exit_code: 0,
    signal: null,
    timed_out: false,
    stdout: `${stdout}\n`,
    stderr: "",
    last_message: lastMessage(candidatePlan, candidateTask),
    ...overrides,
  };
}

function eventPort({ failAt = null } = {}) {
  const events = [];
  return {
    events,
    append({ event }) {
      events.push(structuredClone(event));
      if (events.length === failAt) {
        const error = new Error(`event failure ${failAt}`);
        error.code = "E_EVENT_FSYNC";
        throw error;
      }
      return { status: "recorded", event: structuredClone(event), complete: event.event_type === "dispatch_terminal" };
    },
  };
}

function processPort({ result, spawnError = null, wait = null } = {}) {
  const calls = [];
  let cancellations = 0;
  return {
    calls,
    get cancellations() { return cancellations; },
    async spawn(request) {
      calls.push(structuredClone(request));
      if (spawnError) throw spawnError;
      return {
        async wait() {
          if (wait) return wait();
          return structuredClone(result ?? successfulProcessResult());
        },
        async cancel() {
          cancellations += 1;
          return true;
        },
      };
    },
  };
}

test("Node process port retains at most the configured UTF-8 bytes for multibyte output", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "maister-process-port-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const { createNodeProcessPort } = await processRuntime();
  const outputSchemaPath = path.join(directory, "schema.json");
  fs.writeFileSync(outputSchemaPath, "{}\n", { mode: 0o600 });
  const handle = await createNodeProcessPort().spawn({
    executable: process.execPath,
    args: ["-e", "process.stdout.write('😀😀😀😀😀')"],
    cwd: directory,
    stdin: "",
    timeout_ms: 5_000,
    max_output_bytes: 10,
    task_path: directory,
    output_schema_path: outputSchemaPath,
    last_message_path: path.join(directory, "last.json"),
  });
  const result = await handle.wait();
  assert.equal(result.output_overflow, true);
  assert.ok(Buffer.byteLength(result.stdout, "utf8") <= 10);
});

test("Node process port rejects an oversized last-message file without reading it", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "maister-process-port-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const lastMessagePath = path.join(directory, "last.json");
  const { createNodeProcessPort } = await processRuntime();
  const outputSchemaPath = path.join(directory, "schema.json");
  fs.writeFileSync(outputSchemaPath, "{}\n", { mode: 0o600 });
  const handle = await createNodeProcessPort().spawn({
    executable: process.execPath,
    args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(lastMessagePath)}, 'x'.repeat(11))`],
    cwd: directory,
    stdin: "",
    timeout_ms: 5_000,
    max_output_bytes: 10,
    task_path: directory,
    output_schema_path: outputSchemaPath,
    last_message_path: lastMessagePath,
  });
  const result = await handle.wait();
  assert.equal(result.output_overflow, true);
  assert.equal(result.last_message, "");
});

async function createManager({ observation, events = eventPort(), process = processPort(), clock } = {}) {
  const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
  const { createCodexWorkerManager } = await workerRuntime();
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(observation ?? capabilityObservation()) });
  return {
    events,
    process,
    manager: createCodexWorkerManager({
      processPort: process,
      eventPort: events,
      capabilityInspector: inspector,
      clock: clock ?? (() => "2026-07-18T10:00:00.000Z"),
    }),
  };
}

test("Codex capability inspection proves executable, auth, version, all controls, model, and reasoning", async () => {
  const { createCodexExecCapabilityInspector, REQUIRED_CODEX_EXEC_CONTROLS } = await capabilitiesRuntime();
  const calls = [];
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation(), calls) });
  const result = await inspector.inspect({ plan: plan() });
  assert.equal(result.status, "available");
  assert.deepEqual(Object.keys(result.observation.controls).sort(), [...REQUIRED_CODEX_EXEC_CONTROLS].sort());
  assert.equal(calls[0].schema_version, 1);
  assert.equal(calls[0].required_model, "gpt-5.6-terra");
  assert.equal(calls[0].required_reasoning_effort, "high");
});

test("Codex inspection returns typed unavailable when the executable is missing", async () => {
  const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation({ executable: { available: false, path: null } })) });
  const result = await inspector.inspect({ plan: plan() });
  assert.equal(result.status, "unavailable");
  assert.equal(result.error.code, "E_CODEX_EXECUTABLE_UNAVAILABLE");
});

test("Codex inspection returns typed unavailable when normal authentication is absent", async () => {
  const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation({ authentication: { available: true, authenticated: false } })) });
  const result = await inspector.inspect({ plan: plan() });
  assert.equal(result.status, "unavailable");
  assert.equal(result.error.code, "E_CODEX_AUTH_UNAVAILABLE");
});

test("Codex inspection rejects a disallowed host version", async () => {
  const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation({ version: { value: "9.0.0", allowed: false } })) });
  const result = await inspector.inspect({ plan: plan() });
  assert.equal(result.status, "unsupported");
  assert.equal(result.error.code, "E_CODEX_VERSION_UNSUPPORTED");
});

for (const control of ["working_root", "model", "reasoning_effort", "sandbox", "jsonl", "output_schema", "last_message", "ignore_user_config"]) {
  test(`Codex inspection rejects missing ${control} control`, async () => {
    const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
    const controls = { ...capabilityObservation().controls, [control]: false };
    const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation({ controls })) });
    const result = await inspector.inspect({ plan: plan() });
    assert.equal(result.status, "unsupported");
    assert.equal(result.error.code, "E_CODEX_CONTROL_UNSUPPORTED");
    assert.deepEqual(result.error.details.unsupported_controls, [control]);
  });
}

test("Codex inspection rejects an unavailable pinned model without inheriting", async () => {
  const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation({ model: { available: true, supported: false, value: "other" } })) });
  const result = await inspector.inspect({ plan: plan() });
  assert.equal(result.status, "unsupported");
  assert.equal(result.error.code, "E_CODEX_MODEL_UNSUPPORTED");
});

test("Codex inspection rejects unavailable pinned reasoning effort without inheriting", async () => {
  const { createCodexExecCapabilityInspector } = await capabilitiesRuntime();
  const inspector = createCodexExecCapabilityInspector({ port: capabilityPort(capabilityObservation({ reasoning: { available: true, supported: false, value: "low" } })) });
  const result = await inspector.inspect({ plan: plan() });
  assert.equal(result.status, "unsupported");
  assert.equal(result.error.code, "E_CODEX_REASONING_UNSUPPORTED");
});

test("managed Codex launch pins argv and passes the complete role plus bounded task on stdin", async () => {
  const runtime = await createManager();
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "succeeded");
  assert.equal(runtime.process.calls.length, 1);
  assert.deepEqual(runtime.process.calls[0].args, [
    "exec", "--ignore-user-config", "-C", "/workspace", "-m", "gpt-5.6-terra",
    "-c", "model_reasoning_effort=\"high\"", "--sandbox", "read-only", "--json",
    "--output-schema", "/task/execution/agent-dispatches/dispatch-001.schema.json", "--output-last-message",
    "/task/execution/agent-dispatches/dispatch-001.last.json", "-",
  ]);
  assert.equal(runtime.process.calls[0].executable, "/usr/local/bin/codex");
  assert.match(runtime.process.calls[0].stdin, /^FULL CANONICAL ROLE\nsecond line/);
  assert.match(runtime.process.calls[0].stdin, /Inspect only the bounded change\./);
  assert.match(runtime.process.calls[0].stdin, /nonce-001/);
});

test("dispatch and attempt started events are durable before Codex spawn", async () => {
  const trace = [];
  const events = eventPort();
  const originalAppend = events.append.bind(events);
  events.append = (request) => { trace.push(request.event.event_type); return originalAppend(request); };
  const process = processPort();
  const originalSpawn = process.spawn.bind(process);
  process.spawn = (request) => { trace.push("spawn"); return originalSpawn(request); };
  const runtime = await createManager({ events, process });
  await runtime.manager.run({ plan: plan(), task: task() });
  assert.deepEqual(trace.slice(0, 3), ["dispatch_started", "attempt_started", "spawn"]);
  assert.deepEqual(events.events.map(({ event_type }) => event_type), ["dispatch_started", "attempt_started", "attempt_completed", "dispatch_terminal"]);
});

test("pre-spawn durable record failure prevents Codex invocation", async () => {
  const runtime = await createManager({ events: eventPort({ failAt: 2 }) });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_EXECUTION_RECORD_FAILURE");
  assert.equal(runtime.process.calls.length, 0);
});

test("Codex spawn failure records attempt observation and a durable terminal failure", async () => {
  const error = new Error("spawn denied");
  error.code = "EACCES";
  const runtime = await createManager({ process: processPort({ spawnError: error }) });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_CODEX_SPAWN_FAILED");
  assert.deepEqual(runtime.events.events.map(({ event_type }) => event_type), ["dispatch_started", "attempt_started", "attempt_completed", "dispatch_terminal"]);
  assert.equal(runtime.events.events[2].result.data.error.code, "E_CODEX_SPAWN_FAILED");
});

test("post-spawn attempt-record failure cancels the worker when possible", async () => {
  const process = processPort();
  const runtime = await createManager({ process, events: eventPort({ failAt: 3 }) });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_EXECUTION_RECORD_FAILURE");
  assert.equal(process.cancellations, 1);
});

test("Codex timeout cancels the process and records a durable timeout terminal", async () => {
  const process = processPort({ result: successfulProcessResult(plan(), task(), { timed_out: true, exit_code: null }) });
  const runtime = await createManager({ process });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_CODEX_TIMEOUT");
  assert.equal(process.cancellations, 1);
  assert.equal(runtime.events.events.at(-1).error.code, "E_CODEX_TIMEOUT");
});

test("non-zero Codex exit is rejected with captured process observations", async () => {
  const process = processPort({ result: successfulProcessResult(plan(), task(), { exit_code: 2, stderr: "bad invocation" }) });
  const runtime = await createManager({ process });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_CODEX_EXIT_STATUS");
  assert.equal(result.native_observations.exit_code, 2);
  assert.equal(result.native_observations.stderr_tail, "bad invocation");
  assert.equal(runtime.events.events[2].result.data.native_observations.exit_code, 2);
});

test("malformed JSONL and missing stable session identity fail closed", async () => {
  const process = processPort({ result: successfulProcessResult(plan(), task(), { stdout: "not-json\n" }) });
  const runtime = await createManager({ process });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_CODEX_JSONL_INVALID");
});

test("role-specific final schema and logical identity are validated", async () => {
  const message = JSON.parse(lastMessage());
  message.logical_role_id = "maister:advisor";
  const process = processPort({ result: successfulProcessResult(plan(), task(), { last_message: JSON.stringify(message) }) });
  const runtime = await createManager({ process });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_CODEX_FINAL_SCHEMA");
});

test("worker self-reported model and effort do not masquerade as independent observations", async () => {
  const successfulRuntime = await createManager();
  const successfulResult = await successfulRuntime.manager.run({ plan: plan(), task: task() });
  assert.equal(successfulResult.status, "succeeded");

  for (const details of [
    { effective_model: "gpt-5.6" },
    { effective_reasoning_effort: "medium" },
  ]) {
    const message = JSON.parse(lastMessage(plan(), task(), details));
    const process = processPort({ result: successfulProcessResult(plan(), task(), { last_message: JSON.stringify(message) }) });
    const runtime = await createManager({ process });
    const result = await runtime.manager.run({ plan: plan(), task: task() });
    assert.equal(result.status, "succeeded");
    assert.deepEqual(result.native_observations.execution_policy_evidence.observed, {
      model: null,
      reasoning_effort: null,
      status: "unavailable",
    });
  }
});

test("Codex artifacts are dispatch-contained and schema/source-bound", async () => {
  const runtime = await createManager();
  assert.throws(
    () => runtime.manager.run({ plan: plan(), task: task({ last_message_path: "/tmp/caller-controlled.json" }) }),
    /private dispatch boundary/u,
  );
  assert.throws(
    () => runtime.manager.run({ plan: plan(), task: task({ output_schema_id: "other.schema" }) }),
    /schema identity/u,
  );
  assert.throws(
    () => runtime.manager.run({ plan: plan(), task: task({ canonical_source_digest: DIGEST_B }) }),
    /prompt digest/u,
  );
  assert.equal(runtime.process.calls.length, 0);
});

test("missing terminal last-message output is rejected", async () => {
  const process = processPort({ result: successfulProcessResult(plan(), task(), { last_message: "" }) });
  const runtime = await createManager({ process });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_CODEX_TERMINAL_OUTPUT_MISSING");
});

test("terminal event failure never returns success and requests cancellation", async () => {
  const process = processPort();
  const runtime = await createManager({ process, events: eventPort({ failAt: 4 }) });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "E_EXECUTION_RECORD_FAILURE");
  assert.equal(process.cancellations, 1);
});

test("managed Codex success produces a complete durable Group 5 event stream", async (t) => {
  const taskPath = fs.mkdtempSync(path.join(os.tmpdir(), "maister-agent-adapter-"));
  t.after(() => fs.rmSync(taskPath, { recursive: true, force: true }));
  const eventWriter = await import("../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs");
  const runtime = await createManager({
    events: { append: eventWriter.appendExecutionEvent },
  });
  const result = await runtime.manager.run({ plan: plan(), task: task({ task_path: taskPath }) });
  assert.equal(result.status, "succeeded");
  const stream = eventWriter.readExecutionEventStream({ taskPath, dispatchId: "dispatch-001" });
  assert.equal(stream.complete, true);
  assert.deepEqual(stream.events.map(({ event_type }) => event_type), ["dispatch_started", "attempt_started", "attempt_completed", "dispatch_terminal"]);
  assert.equal(fs.statSync(stream.streamPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(stream.streamPath)).mode & 0o777, 0o700);
  assert.equal(stream.events[0].effective_execution_policy.model, null);
  assert.equal(stream.events[0].effective_execution_policy.reasoning_effort, null);
  assert.equal(Object.hasOwn(stream.events[2].result.data, "output"), false);
  assert.equal(stream.events[3].result.data.execution_policy_evidence.observed.status, "unavailable");
});

test("a complete idempotent Group 5 stream is reused without spawning another worker", async () => {
  const output = JSON.parse(lastMessage());
  const events = {
    append() {
      return {
        status: "reused",
        complete: true,
        events: [{
          event_type: "dispatch_terminal",
          result: { status: "completed", data: { output, session_id: "session-001" } },
          error: null,
        }],
      };
    },
  };
  const runtime = await createManager({ events });
  const result = await runtime.manager.run({ plan: plan(), task: task() });
  assert.equal(result.status, "succeeded");
  assert.equal(result.native_observations.reused, true);
  assert.equal(runtime.process.calls.length, 0);
});

test("proven read-only workers honor manifest max_parallel", async () => {
  let active = 0;
  let maximum = 0;
  const releases = [];
  const process = processPort({
    wait: async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => releases.push(resolve));
      active -= 1;
      return successfulProcessResult();
    },
  });
  const runtime = await createManager({ process });
  const concurrentPlan = plan({ policy: policy({ max_parallel: 2 }) });
  const runs = [1, 2, 3].map((number) => runtime.manager.run({
    plan: { ...concurrentPlan, dispatch_id: `dispatch-00${number}` },
    task: task({
      nonce: `nonce-00${number}`,
      execution_context: { ...task().execution_context, idempotency_key: `execution-key-00${number}`, work_item_id: `work-item-00${number}` },
    }),
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maximum, 2);
  releases.splice(0).forEach((release) => release());
  await new Promise((resolve) => setImmediate(resolve));
  releases.splice(0).forEach((release) => release());
  await Promise.all(runs);
});

test("workspace-writing workers targeting the same checkout serialize", async () => {
  let active = 0;
  let maximum = 0;
  const releases = [];
  const process = processPort({
    wait: async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => releases.push(resolve));
      active -= 1;
      return successfulProcessResult(plan({ policy: policy({ filesystem: "workspace-write", concurrency_class: "workspace-write-serial", max_parallel: 1 }) }));
    },
  });
  const runtime = await createManager({ process });
  const writePlan = plan({ policy: policy({ execution_profile_id: "codex.workspace-write", filesystem: "workspace-write", concurrency_class: "workspace-write-serial", max_parallel: 1 }) });
  const runs = [1, 2].map((number) => runtime.manager.run({
    plan: { ...writePlan, dispatch_id: `dispatch-write-${number}` },
    task: task({
      nonce: `nonce-write-${number}`,
      execution_context: { ...task().execution_context, idempotency_key: `execution-write-${number}`, work_item_id: `work-write-${number}` },
    }),
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maximum, 1);
  releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maximum, 1);
  releases.shift()();
  await Promise.all(runs);
});

function nativePlan(target) {
  const adapterId = target === "cursor" ? "cursor.native" : "kiro-cli.native";
  return plan({
    target,
    representation: target === "cursor" ? "cursor-markdown" : "kiro-descriptor-prompt",
    adapter_id: adapterId,
    native_role_external_id: "maister-project-analyzer",
    host: target,
    policy: policy({
      execution_profile_id: `${target}.read-only`,
      model: null,
      reasoning_effort: null,
    }),
  });
}

function nativePort({ exactLaunch = true, observableIdentity = true, observedIdentity = "maister-project-analyzer", launchError = null } = {}) {
  const launches = [];
  return {
    launches,
    async inspect() {
      return { schema_version: 1, exact_launch: exactLaunch, observable_identity: observableIdentity };
    },
    async launch(request) {
      launches.push(structuredClone(request));
      if (launchError) throw launchError;
      return {
        schema_version: 1,
        observed_native_role_external_id: observedIdentity,
        output: { logical_role_id: request.plan.requested_logical_role_id, status: "completed" },
        native_observations: { session_id: "native-session-001" },
      };
    },
  };
}

for (const [target, moduleName, exportName] of [
  ["cursor", "cursor", "createCursorAdapter"],
  ["kiro-cli", "kiro-cli", "createKiroCliAdapter"],
]) {
  test(`${target} launches only the exact manifest-declared native identity and preserves observation`, async () => {
    const runtime = await adapterRuntime(moduleName);
    const native = nativePort();
    const adapter = runtime[exportName]({ nativePort: native, eventPort: eventPort(), clock: () => "2026-07-18T10:00:00.000Z" });
    const candidatePlan = nativePlan(target);
    const result = await adapter({ plan: candidatePlan, task: task() });
    assert.equal(result.status, "succeeded");
    assert.equal(native.launches.length, 1);
    assert.equal(native.launches[0].native_role_external_id, candidatePlan.native_role_external_id);
    assert.equal(result.observed_native_role_external_id, candidatePlan.native_role_external_id);
    assert.equal(result.native_observations.session_id, "native-session-001");
  });

  test(`${target} returns unavailable without fallback when exact launch cannot be enforced`, async () => {
    const runtime = await adapterRuntime(moduleName);
    const native = nativePort({ exactLaunch: false });
    const result = await runtime[exportName]({ nativePort: native, eventPort: eventPort() })({ plan: nativePlan(target), task: task() });
    assert.equal(result.status, "unavailable");
    assert.equal(result.error.code, "E_NATIVE_EXACT_LAUNCH_UNAVAILABLE");
    assert.equal(native.launches.length, 0);
  });

  test(`${target} returns unavailable without fallback when observed identity is not enforceable`, async () => {
    const runtime = await adapterRuntime(moduleName);
    const native = nativePort({ observableIdentity: false });
    const result = await runtime[exportName]({ nativePort: native, eventPort: eventPort() })({ plan: nativePlan(target), task: task() });
    assert.equal(result.status, "unavailable");
    assert.equal(result.error.code, "E_NATIVE_IDENTITY_UNOBSERVABLE");
    assert.equal(native.launches.length, 0);
  });

  test(`${target} rejects wrong observed identity and never retries or falls back`, async () => {
    const runtime = await adapterRuntime(moduleName);
    const native = nativePort({ observedIdentity: "maister-advisor" });
    const result = await runtime[exportName]({ nativePort: native, eventPort: eventPort() })({ plan: nativePlan(target), task: task() });
    assert.equal(result.status, "failed");
    assert.equal(result.error.code, "E_AGENT_WRONG_OBSERVED_IDENTITY");
    assert.equal(native.launches.length, 1);
  });

  test(`${target} records exact-launch failure as a durable terminal outcome`, async () => {
    const runtime = await adapterRuntime(moduleName);
    const native = nativePort({ launchError: new Error("native launch rejected") });
    const events = eventPort();
    const result = await runtime[exportName]({ nativePort: native, eventPort: events })({ plan: nativePlan(target), task: task() });
    assert.equal(result.status, "failed");
    assert.equal(result.error.code, "E_NATIVE_LAUNCH_FAILED");
    assert.deepEqual(events.events.map(({ event_type }) => event_type), ["dispatch_started", "attempt_started", "attempt_completed", "dispatch_terminal"]);
  });
}

test("Advisor uses the identical native adapter path with only manifest identity differing", async () => {
  const { createCursorAdapter } = await adapterRuntime("cursor");
  const native = nativePort({ observedIdentity: "maister-advisor" });
  const advisorPlan = {
    ...nativePlan("cursor"),
    dispatch_id: "dispatch-advisor",
    requested_logical_role_id: "maister:advisor",
    role_id: "advisor",
    native_role_external_id: "maister-advisor",
  };
  const result = await createCursorAdapter({ nativePort: native, eventPort: eventPort() })({ plan: advisorPlan, task: task() });
  assert.equal(result.status, "succeeded");
  assert.equal(native.launches[0].native_role_external_id, "maister-advisor");
});

test("host adapter registry exposes only the three manifest adapter IDs", async () => {
  const { createHostAdapters } = await adapterRuntime("index");
  const adapters = createHostAdapters({
    codex: { workerManager: { run: async () => ({}) } },
    cursor: { nativePort: nativePort(), eventPort: eventPort() },
    kiroCli: { nativePort: nativePort(), eventPort: eventPort() },
  });
  assert.deepEqual(Object.keys(adapters).sort(), ["codex.exec", "cursor.native", "kiro-cli.native"]);
});

test("projection execution profiles pin Codex policy and distinguish concurrency classes", () => {
  const contractPath = new URL("../../plugins/maister/agent-projection-v1.json", import.meta.url);
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const codexModel = contract.profiles.model.find(({ id }) => id === "model.codex-pinned");
  const codexReasoning = contract.profiles.reasoning.find(({ id }) => id === "reasoning.codex-high");
  assert.equal(codexModel.model, "gpt-5.6-terra");
  assert.equal(codexModel.allow_inherit, false);
  assert.equal(codexReasoning.allow_inherit, false);
  assert.deepEqual(contract.profiles.concurrency, [
    { id: "concurrency.read-only", class: "read-only-concurrent", max_parallel: 4 },
    { id: "concurrency.workspace-write", class: "workspace-write-serial", max_parallel: 1 },
  ]);
});

test("target overlays bind delegation to the concrete Group 7 adapter with no generic fallback", () => {
  const expected = {
    codex: "codex.exec",
    cursor: "cursor.native",
    "kiro-cli": "kiro-cli.native",
  };
  const forbidden = {
    codex: "codex.subagent",
    cursor: "cursor.subagent",
    "kiro-cli": "kiro-cli.subagent",
  };
  for (const [target, adapterId] of Object.entries(expected)) {
    const overlayPath = new URL(`../../plugins/maister/overlays/${target}/overlay.yml`, import.meta.url);
    const overlay = fs.readFileSync(overlayPath, "utf8");
    assert.ok(overlay.includes(`delegate_agent:\n    adapter: ${adapterId}`));
    assert.ok(!overlay.includes(`delegate_agent:\n    adapter: ${forbidden[target]}`));
  }
});
