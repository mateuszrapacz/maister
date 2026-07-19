import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createCapabilityHooks,
  createResolverFixture,
  sha256,
} from "../fixtures/platform-independent/agent-resolver/resolver-fixture.mjs";

const RUNTIME_ROOT = "../../plugins/maister/skills/orchestrator-framework/bin/agent-runtime";

async function runtime() {
  const [{ resolveAgent, AgentResolutionError }, dispatchContract, dispatcher] = await Promise.all([
    import(`${RUNTIME_ROOT}/agent-resolver.mjs`),
    import(`${RUNTIME_ROOT}/dispatch-contract.mjs`),
    import(`${RUNTIME_ROOT}/dispatch-agent.mjs`),
  ]);
  return { resolveAgent, AgentResolutionError, ...dispatchContract, ...dispatcher };
}

async function rejectsKind(promise, kind) {
  await assert.rejects(promise, (error) => error?.kind === kind, kind);
}

test("accepts one exact logical role and returns one deeply immutable plan with separated identities", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent, validateDispatchPlan } = await runtime();
  const plan = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks });

  assert.equal(plan.requested_logical_role_id, "maister:project-analyzer");
  assert.equal(plan.role_id, "project-analyzer");
  assert.equal(plan.adapter_id, "cursor.native");
  assert.equal(plan.native_role_external_id, "maister-project-analyzer");
  assert.equal(plan.dispatch_id, fixture.request.dispatch_id);
  assert.equal(plan.provenance.receipt_id, fixture.receipt.receipt_id);
  assert.equal(plan.provenance.manifest_digest, fixture.manifest.manifest_digest);
  assert.equal(plan.policy.execution_profile_id, "cursor.read-only");
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.policy));
  assert.ok(Object.isFrozen(plan.provenance));
  assert.deepEqual(validateDispatchPlan(plan), plan);
  assert.throws(() => { plan.policy.tools.push("write"); }, TypeError);
});

test("rejects aliases, case changes, whitespace, natural language, and implicit defaults as grammar errors", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  for (const logicalRoleId of [undefined, "", "advisor", "maister:Advisor", " maister:advisor", "maister:advisor ", "use the advisor", "maister:advisor/other"]) {
    await rejectsKind(resolveAgent({ ...fixture.request, logical_role_id: logicalRoleId, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_REQUEST_GRAMMAR");
  }
  assert.deepEqual(fixture.trace, []);
});

test("returns unknown for an exact absent role without probing a host or similar role", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  await rejectsKind(resolveAgent({ ...fixture.request, logical_role_id: "maister:project-analyse", manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_UNKNOWN_ROLE");
  assert.deepEqual(fixture.trace, []);
});

test("returns duplicate when the target manifest repeats an identical exact row", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  const manifest = fixture.clone(fixture.manifest);
  manifest.rows.push(fixture.clone(manifest.rows[0]));
  await rejectsKind(resolveAgent({ ...fixture.request, manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_DUPLICATE_ROLE");
});

test("returns ambiguous when exact target rows claim one logical identity with conflicting adapter identity", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  const manifest = fixture.clone(fixture.manifest);
  manifest.rows.push({ ...fixture.clone(manifest.rows[1]), adapter_id: "other.native" });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_AMBIGUOUS_ROLE");
});

test("returns missing when there is no active receipt", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, loadActiveReceipt: async () => null }), "E_AGENT_MISSING_STATE");
});

test("returns stale for an inactive receipt and legacy receipt schema", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  const uninstalled = { ...fixture.clone(fixture.receipt), status: "uninstalled" };
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, loadActiveReceipt: async () => ({ receipt: uninstalled, receiptPath: fixture.receiptPath }) }), "E_AGENT_STALE_STATE");
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, loadActiveReceipt: async () => ({ receipt: { schema_version: 1 }, receiptPath: fixture.receiptPath }) }), "E_AGENT_STALE_STATE");
});

test("returns mismatched when canonical, manifest, or projected-tree bindings differ", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  for (const field of ["canonical_set_digest", "manifest_digest", "projected_tree_digest"]) {
    const receipt = fixture.clone(fixture.receipt);
    receipt.provenance.agent_projection[field] = sha256(`wrong ${field}`);
    await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, loadActiveReceipt: async () => ({ receipt, receiptPath: fixture.receiptPath }) }), "E_AGENT_MISMATCHED_STATE");
  }
});

test("returns missing when the selected role representation is absent from receipt inventory", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  const receipt = fixture.clone(fixture.receipt);
  receipt.managed_inventory = receipt.managed_inventory.filter(({ path: inventoryPath }) => inventoryPath !== "agents/project-analyzer.md");
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks, loadActiveReceipt: async () => ({ receipt, receiptPath: fixture.receiptPath }) }), "E_AGENT_MISSING_STATE");
});

test("returns mismatched when installed root bytes drift from the receipt and projection", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fs.writeFileSync(path.join(fixture.paths.activeRoot, "agents/project-analyzer.md"), "drifted\n");
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_MISMATCHED_STATE");
});

test("returns collided for an unmanaged exact external-name collision", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.externalCollisions = async () => ({ collisions: [{ external_id: "maister-project-analyzer", source: "project" }] });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_COLLIDED");
});

test("returns unavailable before dispatch when the required adapter is unavailable", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.adapter = async () => ({ available: false, adapter_id: "cursor.native" });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_UNAVAILABLE");
});

test("returns unavailable before dispatch when the host is unavailable", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.host = async () => ({ available: false, host: "cursor" });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_UNAVAILABLE");
});

test("returns unavailable before dispatch for an unsupported host version", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.version = async () => ({ available: true, supported: false, host_version: "0.1.0" });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_UNAVAILABLE");
});

test("returns unavailable before dispatch when authentication is absent", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.auth = async () => ({ available: true, authenticated: false });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_UNAVAILABLE");
});

test("returns unsupported-control with the exact missing control list", async (t) => {
  const fixture = createResolverFixture({ target: "codex" });
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.controls = async () => ({ available: true, unsupported_controls: ["model_reasoning_effort", "output-schema"] });
  await assert.rejects(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), (error) => error?.kind === "E_AGENT_UNSUPPORTED_CONTROL" && error.details.unsupported_controls.length === 2);
});

test("returns unsupported-model instead of inheriting or selecting another model", async (t) => {
  const fixture = createResolverFixture({ target: "codex" });
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.model = async () => ({ available: true, supported: false });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_UNSUPPORTED_MODEL");
});

test("returns reasoning-unavailable instead of dropping a required reasoning policy", async (t) => {
  const fixture = createResolverFixture({ target: "codex" });
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  fixture.hooks.reasoning = async () => ({ available: false, supported: false });
  await rejectsKind(resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks }), "E_AGENT_REASONING_UNAVAILABLE");
});

test("ordinary Advisor traverses the same exact lookup, installed-state, and capability path", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent } = await runtime();
  const ordinaryTrace = [];
  const advisorTrace = [];
  const ordinary = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: createCapabilityHooks(ordinaryTrace) });
  const advisor = await resolveAgent({ ...fixture.request, logical_role_id: "maister:advisor", dispatch_id: "dispatch-advisor", manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: createCapabilityHooks(advisorTrace) });
  assert.deepEqual(advisorTrace, ordinaryTrace);
  assert.deepEqual(advisor.policy, ordinary.policy);
  assert.equal(advisor.adapter_id, ordinary.adapter_id);
  assert.equal(advisor.native_role_external_id, "maister-advisor");
});

test("all target adapters consume one plan contract and return one terminal shape while retaining native observations", async (t) => {
  const { resolveAgent, dispatchAgent } = await runtime();
  const keySets = [];
  for (const target of ["codex", "cursor", "kiro-cli"]) {
    const fixture = createResolverFixture({ target });
    t.after(fixture.cleanup);
    const plan = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks });
    const observation = { mechanism: target, session_id: `session-${target}` };
    const terminal = await dispatchAgent({
      plan,
      task: { bounded_task: "inspect" },
      adapters: {
        [plan.adapter_id]: async ({ plan: consumed }) => ({
          status: "succeeded",
          observed_native_role_external_id: consumed.native_role_external_id,
          output: { ok: true },
          native_observations: observation,
          error: null,
        }),
      },
    });
    keySets.push(Object.keys(terminal));
    assert.deepEqual(terminal.native_observations, observation);
    assert.ok(Object.isFrozen(terminal));
  }
  assert.deepEqual(keySets[1], keySets[0]);
  assert.deepEqual(keySets[2], keySets[0]);
});

test("wrong observed native identity is a typed terminal failure that retains the observation", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent, dispatchAgent } = await runtime();
  const plan = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks });
  const terminal = await dispatchAgent({
    plan,
    task: {},
    adapters: {
      "cursor.native": async () => ({
        status: "succeeded",
        observed_native_role_external_id: "maister-advisor",
        output: { ok: true },
        native_observations: { observed_route: "maister-advisor" },
        error: null,
      }),
    },
  });
  assert.equal(terminal.status, "failed");
  assert.equal(terminal.error.code, "E_AGENT_WRONG_OBSERVED_IDENTITY");
  assert.equal(terminal.observed_native_role_external_id, "maister-advisor");
  assert.deepEqual(terminal.native_observations, { observed_route: "maister-advisor" });
});

test("dispatcher never uses an inline, root, built-in, default, similar-role, or alternate-host fallback", async (t) => {
  const fixture = createResolverFixture();
  t.after(fixture.cleanup);
  const { resolveAgent, dispatchAgent } = await runtime();
  const plan = await resolveAgent({ ...fixture.request, manifest: fixture.manifest, projection: fixture.projection, paths: fixture.paths, hooks: fixture.hooks });
  const calls = [];
  const terminal = await dispatchAgent({
    plan,
    task: {},
    adapters: {
      "codex.exec": async () => { calls.push("alternate-host"); },
      root: async () => { calls.push("root"); },
      default: async () => { calls.push("default"); },
    },
  });
  assert.deepEqual(calls, []);
  assert.equal(terminal.status, "unavailable");
  assert.equal(terminal.error.code, "E_AGENT_UNAVAILABLE");
});

test("an invalid plan fails validation before any adapter invocation", async () => {
  const { dispatchAgent } = await runtime();
  let invoked = false;
  await assert.rejects(
    dispatchAgent({ plan: { schema_version: 1, adapter_id: "cursor.native" }, task: {}, adapters: { "cursor.native": async () => { invoked = true; } } }),
    (error) => error?.kind === "E_DISPATCH_PLAN_SCHEMA",
  );
  assert.equal(invoked, false);
});
