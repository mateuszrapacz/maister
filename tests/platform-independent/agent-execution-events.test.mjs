import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  canonicalExecutionEventJson,
  createExecutionEvent,
  ExecutionEventValidationError,
  validateExecutionEvent,
  validateExecutionEventStream,
} from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-schema.mjs";
import {
  appendExecutionEvent,
  dispatchEventPaths,
  ExecutionEventWriterError,
  readExecutionEventStream,
  recordAfterSideEffect,
  recordBeforeSideEffect,
  recoverExecutionEventStream,
} from "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs";

const temporaryRoots = [];
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);

afterEach(() => {
  while (temporaryRoots.length > 0) fs.rmSync(temporaryRoots.pop(), { recursive: true, force: true });
});

function taskPath() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-agent-events-"));
  temporaryRoots.push(root);
  const task = path.join(root, "task");
  fs.mkdirSync(task, { mode: 0o700 });
  return task;
}

function policy(overrides = {}) {
  return {
    execution_profile_id: "codex.read-only",
    tools: ["read", "search"],
    filesystem: "read-only",
    network: "restricted",
    model: "gpt-5.2-codex",
    reasoning_effort: "high",
    timeout_ms: 900000,
    output_schema_id: "maister.agent-role-result.v1",
    concurrency_class: "read-only-concurrent",
    max_parallel: 4,
    ...overrides,
  };
}

function eventPayload(eventType, overrides = {}) {
  const defaults = {
    event_type: eventType,
    idempotency_key: "execution-key-001",
    dispatch_id: "dispatch-001",
    gate_decision_id: "gate-decision-001",
    workflow_id: "development",
    work_item_id: "work-item-001",
    logical_role_id: "maister:task-group-implementer",
    canonical_source_digest: DIGEST_A,
    manifest_digest: DIGEST_B,
    projection_digest: DIGEST_C,
    adapter_id: "codex.exec",
    native_role_external_id: null,
    host: "codex",
    host_version: "1.2.3",
    requested_execution_policy: policy(),
    effective_execution_policy: policy(),
    occurred_at: "2026-07-18T10:00:00.000Z",
    recorded_at: "2026-07-18T10:00:00.001Z",
    attempt: null,
    result: null,
    error: null,
  };
  if (eventType === "attempt_started") defaults.attempt = { number: 1 };
  if (eventType === "attempt_completed") {
    defaults.attempt = { number: 1 };
    defaults.result = { status: "completed", data: { message: "done" } };
  }
  if (eventType === "dispatch_terminal") defaults.result = { status: "completed", data: { output: "done" } };
  return { ...defaults, ...overrides };
}

function append(task, eventType, overrides = {}) {
  const dispatchId = overrides.dispatch_id ?? "dispatch-001";
  return appendExecutionEvent({
    taskPath: task,
    dispatchId,
    event: eventPayload(eventType, overrides),
  });
}

function expectSchemaError(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof ExecutionEventValidationError);
    assert.equal(error.code, code);
    return true;
  });
}

function expectWriterError(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof ExecutionEventWriterError);
    assert.equal(error.code, code);
    return true;
  });
}

test("canonical event JSON sorts every mapping key and produces a stable digest", () => {
  const canonical = canonicalExecutionEventJson({ z: 1, nested: { beta: true, alpha: null }, array: [{ y: 2, x: 1 }] });
  assert.equal(canonical, "{\"array\":[{\"x\":1,\"y\":2}],\"nested\":{\"alpha\":null,\"beta\":true},\"z\":1}");
  assert.equal(crypto.createHash("sha256").update(canonical).digest("hex"), "30aebb977a780f6515afb16e5e5f0a4aca90e8bcd34c8c30c22e8e9ad15c34a3");
});

test("the versioned event schema is closed and keeps dispatch identities distinct", () => {
  const event = createExecutionEvent({
    ...eventPayload("dispatch_started"),
    schema_version: 1,
    sequence: 0,
    previous_event_digest: null,
  });
  assert.deepEqual(validateExecutionEvent(event), event);

  expectSchemaError(() => validateExecutionEvent({ ...event, unexpected: true }), "E_EVENT_SCHEMA");
  expectSchemaError(
    () => createExecutionEvent({
      ...eventPayload("dispatch_started", { dispatch_id: "work-item-001" }),
      schema_version: 1,
      sequence: 0,
      previous_event_digest: null,
    }),
    "E_EVENT_IDENTITY",
  );
});

test("the writer creates a contained canonical JSONL stream with private modes", () => {
  const task = taskPath();
  const written = append(task, "dispatch_started");
  const paths = dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-001" });

  assert.equal(written.status, "recorded");
  assert.equal(written.streamPath, paths.streamPath);
  assert.equal(fs.statSync(paths.eventDirectory).mode & 0o777, 0o700);
  assert.equal(fs.statSync(paths.streamPath).mode & 0o777, 0o600);
  const bytes = fs.readFileSync(paths.streamPath, "utf8");
  assert.equal(bytes, `${canonicalExecutionEventJson(written.event)}\n`);
  assert.equal(bytes.trim().includes("\n"), false);
  assert.equal(written.event.sequence, 0);
  assert.equal(written.event.previous_event_digest, null);
});

test("a complete stream is monotonic, hash-chained, and terminal exactly once", () => {
  const task = taskPath();
  append(task, "dispatch_started");
  append(task, "attempt_started");
  append(task, "attempt_completed");
  const terminal = append(task, "dispatch_terminal");

  const stream = readExecutionEventStream({ taskPath: task, dispatchId: "dispatch-001" });
  assert.equal(stream.complete, true);
  assert.deepEqual(stream.events.map((event) => event.event_type), [
    "dispatch_started",
    "attempt_started",
    "attempt_completed",
    "dispatch_terminal",
  ]);
  stream.events.forEach((event, index) => {
    assert.equal(event.sequence, index);
    assert.equal(event.previous_event_digest, index === 0 ? null : stream.events[index - 1].event_digest);
  });
  assert.equal(terminal.event.event_digest, stream.events.at(-1).event_digest);
  expectWriterError(() => append(task, "dispatch_terminal"), "E_EVENT_TERMINAL");
});

test("lifecycle order and attempt pairing fail closed before bytes change", () => {
  const task = taskPath();
  append(task, "dispatch_started");
  const paths = dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-001" });
  const before = fs.readFileSync(paths.streamPath);

  expectWriterError(() => append(task, "attempt_completed"), "E_EVENT_SEQUENCE");
  assert.deepEqual(fs.readFileSync(paths.streamPath), before);

  append(task, "attempt_started");
  const startedBytes = fs.readFileSync(paths.streamPath);
  expectWriterError(
    () => append(task, "attempt_completed", { attempt: { number: 2 } }),
    "E_EVENT_SEQUENCE",
  );
  assert.deepEqual(fs.readFileSync(paths.streamPath), startedBytes);
});

test("duplicate idempotency keys reuse the validated dispatch stream", () => {
  const task = taskPath();
  append(task, "dispatch_started");

  const duplicate = append(task, "dispatch_started", { dispatch_id: "dispatch-002" });
  assert.equal(duplicate.status, "reused");
  assert.equal(duplicate.dispatchId, "dispatch-001");
  assert.equal(duplicate.events.length, 1);
  assert.equal(fs.existsSync(dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-002" }).streamPath), false);
});

test("a reused idempotency key with conflicting immutable context is rejected", () => {
  const task = taskPath();
  append(task, "dispatch_started");
  const directory = dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-001" }).eventDirectory;

  expectWriterError(
    () => append(task, "dispatch_started", { dispatch_id: "dispatch-002", work_item_id: "work-item-002" }),
    "E_IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual(fs.readdirSync(directory).filter((name) => name.endsWith(".jsonl")), ["dispatch-001.jsonl"]);
});

test("corrupt streams are rejected without repair or truncation", () => {
  const task = taskPath();
  append(task, "dispatch_started");
  const paths = dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-001" });
  const corrupted = JSON.parse(fs.readFileSync(paths.streamPath, "utf8"));
  corrupted.workflow_id = "tampered-workflow";
  fs.writeFileSync(paths.streamPath, `${JSON.stringify(corrupted)}\n`, { mode: 0o600 });
  const before = fs.readFileSync(paths.streamPath);

  expectWriterError(
    () => readExecutionEventStream({ taskPath: task, dispatchId: "dispatch-001" }),
    "E_STREAM_CORRUPT",
  );
  assert.deepEqual(fs.readFileSync(paths.streamPath), before);
});

test("recovery validates and preserves an incomplete stream for continuation", () => {
  const task = taskPath();
  append(task, "dispatch_started");
  append(task, "attempt_started");
  const paths = dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-001" });
  const before = fs.readFileSync(paths.streamPath);

  const recovered = recoverExecutionEventStream({ taskPath: task, dispatchId: "dispatch-001" });
  assert.equal(recovered.complete, false);
  assert.deepEqual(recovered.nextEventTypes, ["attempt_completed"]);
  assert.deepEqual(fs.readFileSync(paths.streamPath), before);

  append(task, "attempt_completed", { error: { code: "E_INTERRUPTED", message: "worker was interrupted", retryable: true }, result: null });
  append(task, "dispatch_terminal", { result: null, error: { code: "E_FAILED", message: "dispatch failed", retryable: false } });
  assert.equal(recoverExecutionEventStream({ taskPath: task, dispatchId: "dispatch-001" }).complete, true);
});

test("unsafe dispatch IDs and symlinked task roots are rejected before creating event files", () => {
  const task = taskPath();
  expectWriterError(
    () => appendExecutionEvent({ taskPath: task, dispatchId: "../escape", event: eventPayload("dispatch_started", { dispatch_id: "../escape" }) }),
    "E_DISPATCH_ID",
  );
  assert.equal(fs.existsSync(path.join(task, "execution")), false);

  const alias = path.join(path.dirname(task), "task-alias");
  fs.symlinkSync(task, alias);
  expectWriterError(
    () => appendExecutionEvent({ taskPath: alias, dispatchId: "dispatch-001", event: eventPayload("dispatch_started") }),
    "E_TASK_PATH",
  );
});

test("a live per-dispatch lock refuses a competing writer without mutation", () => {
  const task = taskPath();
  append(task, "dispatch_started");
  const paths = dispatchEventPaths({ taskPath: task, dispatchId: "dispatch-001" });
  fs.writeFileSync(paths.lockPath, "foreign owner\n", { mode: 0o600, flag: "wx" });
  const before = fs.readFileSync(paths.streamPath);

  expectWriterError(() => append(task, "attempt_started"), "E_DISPATCH_LOCKED");
  assert.deepEqual(fs.readFileSync(paths.streamPath), before);
  assert.equal(fs.readFileSync(paths.lockPath, "utf8"), "foreign owner\n");
});

test("a pre-side-effect recording failure prevents invocation", () => {
  let invoked = false;
  const result = recordBeforeSideEffect(
    () => { throw new ExecutionEventWriterError("E_EVENT_WRITE", "disk unavailable"); },
    () => { invoked = true; },
  );

  assert.equal(invoked, false);
  assert.deepEqual(result, {
    status: "execution_record_failure",
    phase: "before_side_effect",
    invocation_allowed: false,
    cancellation_requested: false,
    cancellation_succeeded: false,
    error: { code: "E_EVENT_WRITE", message: "disk unavailable" },
  });
});

test("a successful pre-side-effect record allows the side effect exactly once", () => {
  let invocations = 0;
  const result = recordBeforeSideEffect(
    () => ({ sequence: 0 }),
    () => { invocations += 1; return "worker-started"; },
  );

  assert.equal(invocations, 1);
  assert.deepEqual(result, { status: "side_effect_started", record: { sequence: 0 }, value: "worker-started" });
});

test("a post-side-effect recording failure requests cancellation and never reports success", async () => {
  let cancellations = 0;
  const result = await recordAfterSideEffect(
    () => { throw new ExecutionEventWriterError("E_EVENT_FSYNC", "fsync failed"); },
    async () => { cancellations += 1; return true; },
  );

  assert.equal(cancellations, 1);
  assert.deepEqual(result, {
    status: "execution_record_failure",
    phase: "after_side_effect",
    invocation_allowed: false,
    cancellation_requested: true,
    cancellation_succeeded: true,
    error: { code: "E_EVENT_FSYNC", message: "fsync failed" },
  });
});

test("only an exact true cancel result counts as successful best-effort cancellation", async () => {
  for (const cancel of [async () => false, async () => "true", async () => { throw new Error("host rejected cancellation"); }]) {
    const result = await recordAfterSideEffect(
      () => { throw new ExecutionEventWriterError("E_EVENT_FSYNC", "fsync failed"); },
      cancel,
    );
    assert.equal(result.cancellation_requested, true);
    assert.equal(result.cancellation_succeeded, false);
    assert.deepEqual(result.error, { code: "E_EVENT_FSYNC", message: "fsync failed" });
  }
});

test("stream validation rejects a missing terminal when completeness is required", () => {
  const started = createExecutionEvent({
    ...eventPayload("dispatch_started"),
    schema_version: 1,
    sequence: 0,
    previous_event_digest: null,
  });
  expectSchemaError(
    () => validateExecutionEventStream([started], { requireTerminal: true }),
    "E_EVENT_TERMINAL",
  );
});
