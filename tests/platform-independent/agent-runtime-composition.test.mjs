import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createResolverFixture } from "../fixtures/platform-independent/agent-resolver/resolver-fixture.mjs";

const RUNTIME_ROOT = "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime";

function gateTask(taskPath) {
  return {
    gate_context: { context: { task_path: taskPath, workflow_id: "development" } },
    actor: "advisor",
    work_item: { id: "work-item-runtime", actor: "advisor" },
    idempotency_context: { idempotency_key: "gate-key-runtime", gate_decision_id: "gate-decision-runtime" },
    output_schema: { schema_id: "maister.gate-decision.v1", fields: ["selected_option"] },
    bounded_task: "Return the decision.",
  };
}

test("packaged runtime composes resolver, task preparation, exact native adapter, and durable events", async (t) => {
  const fixture = createResolverFixture({ target: "cursor" });
  t.after(fixture.cleanup);
  const launches = [];
  const { createAgentRuntime } = await import(`${RUNTIME_ROOT}/create-runtime.mjs`);
  const runtime = createAgentRuntime({
    target: fixture.target,
    manifest: fixture.manifest,
    projection: fixture.projection,
    paths: fixture.paths,
    resolverHooks: fixture.hooks,
    workingRoot: process.cwd(),
    nativePorts: {
      cursor: {
        async inspect() { return { schema_version: 1, exact_launch: true, observable_identity: true }; },
        async launch(request) {
          launches.push(request);
          return { schema_version: 1, observed_native_role_external_id: request.native_role_external_id, output: { selected_option: "Continue" }, native_observations: { launch_id: "native-1" } };
        },
      },
    },
    clock: () => "2026-07-19T10:00:00.000Z",
  });
  const plan = await runtime.resolveAgent({ logical_role_id: "maister:project-analyzer", dispatch_id: "dispatch-runtime" });
  const terminal = await runtime.dispatchAgent({ plan, task: gateTask(fixture.root) });
  assert.equal(terminal.status, "succeeded");
  assert.equal(launches.length, 1);
  assert.equal(launches[0].task.execution_context.idempotency_key, "gate-key-runtime");
  assert.equal(runtime.readExecutionEventStream({ taskPath: fixture.root, dispatchId: plan.dispatch_id }).complete, true);
});

test("Codex gate tasks become projection-bound private worker tasks", async (t) => {
  const fixture = createResolverFixture({ target: "codex" });
  t.after(fixture.cleanup);
  const taskPath = fs.mkdtempSync(path.join(os.tmpdir(), "maister-runtime-task-"));
  t.after(() => fs.rmSync(taskPath, { recursive: true, force: true }));
  const [{ resolveAgent }, { createDispatchTaskPreparer }] = await Promise.all([
    import(`${RUNTIME_ROOT}/agent-resolver.mjs`),
    import(`${RUNTIME_ROOT}/dispatch-task-preparer.mjs`),
  ]);
  const plan = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, dispatch_id: "dispatch-gate-real" });
  const prepared = createDispatchTaskPreparer({ projection: fixture.projection, workingRoot: process.cwd() }).prepare({ plan, task: gateTask(taskPath) });
  assert.equal(prepared.result_selector, "details.gate_response");
  assert.equal(prepared.canonical_source_digest, plan.role_source_digest);
  assert.equal(prepared.output_schema_id, plan.policy.output_schema_id);
  assert.equal(path.dirname(prepared.output_schema_path), path.join(fs.realpathSync(taskPath), "execution", "agent-dispatches"));
  assert.equal(fs.statSync(prepared.output_schema_path).mode & 0o777, 0o600);
});

test("Codex task preparation rejects a symlinked dispatch ancestor before writing outside the task root", async (t) => {
  const fixture = createResolverFixture({ target: "codex" });
  t.after(fixture.cleanup);
  const taskPath = fs.mkdtempSync(path.join(os.tmpdir(), "maister-runtime-task-"));
  const outsidePath = fs.mkdtempSync(path.join(os.tmpdir(), "maister-runtime-outside-"));
  t.after(() => fs.rmSync(taskPath, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsidePath, { recursive: true, force: true }));
  fs.symlinkSync(outsidePath, path.join(taskPath, "execution"));
  const [{ resolveAgent }, { createDispatchTaskPreparer }] = await Promise.all([
    import(`${RUNTIME_ROOT}/agent-resolver.mjs`),
    import(`${RUNTIME_ROOT}/dispatch-task-preparer.mjs`),
  ]);
  const plan = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, dispatch_id: "dispatch-symlink" });

  assert.throws(
    () => createDispatchTaskPreparer({ projection: fixture.projection, workingRoot: process.cwd() }).prepare({ plan, task: gateTask(taskPath) }),
    /trusted task root|symlink|real directory|unsafe ancestor/,
  );
  assert.deepEqual(fs.readdirSync(outsidePath), []);
});
