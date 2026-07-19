import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "../..");
const WORKFLOWS = [
  ".github/workflows/release.yml",
  ".github/workflows/validate-generated-variants.yml",
  ".github/workflows/cursor-cli-smoke.yml",
];
const ACTIVE_INSTRUCTION_ROOTS = [
  "plugins/maister/skills",
  "plugins/maister/agents",
  "README.md",
  "docs",
  ".maister/docs/project",
  ".maister/docs/standards",
];

function filesUnder(relativeRoot) {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (fs.statSync(absoluteRoot).isFile()) return [absoluteRoot];
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) files.push(child);
    }
  };
  visit(absoluteRoot);
  return files;
}

test("release CI uses a reproducible clean-checkout parity gate", () => {
  const makefile = fs.readFileSync(path.join(ROOT, "Makefile"), "utf8");
  const release = fs.readFileSync(path.join(ROOT, ".github/workflows/release.yml"), "utf8");
  const gate = fs.readFileSync(path.join(ROOT, "plugins/maister/bin/parity-release.mjs"), "utf8");
  const releaseInterface = fs.readFileSync(path.join(ROOT, "plugins/maister/bin/release-interface.mjs"), "utf8");
  assert.match(makefile, /test-parity-release:/u);
  assert.match(makefile, /release-interface\.mjs parity-release/u);
  assert.doesNotMatch(makefile, /LEGACY_ROOT|MATERIALIZED_ROOT/u);
  assert.match(release, /fetch-depth:\s*0/u);
  assert.match(release, /make test-parity-release PARITY_REPORT=dist\/parity-release\.json/u);
  assert.match(makefile, /generate-e3-attestation:/u);
  assert.match(makefile, /release-interface\.mjs generate-e3/u);
  assert.match(releaseInterface, /E3_RESULT must be passed/u);
  assert.match(releaseInterface, /plugins\/maister\/\.maister-e3-attestation\.json/u);
  const coreIndex = release.indexOf("make test-core");
  const e3Index = release.indexOf("make generate-e3-attestation");
  const packageIndex = release.indexOf("E3_ATTESTATION=dist/e3-portable-core.json make package");
  const lifecycleIndex = release.indexOf("MAISTER_PACKAGE_DIR: dist");
  assert.ok(coreIndex >= 0 && e3Index > coreIndex && packageIndex > e3Index && lifecycleIndex > packageIndex, "release must test core, generate E3, package, then smoke extracted archives");
  assert.match(release, /release-metadata\.mjs/u);
  assert.match(gate, /git.*archive/u);
  assert.match(gate, /parity-oracle\/manifest\.json/u);
});

test("all third-party workflow actions are immutable commit pins", () => {
  for (const workflow of WORKFLOWS) {
    const source = fs.readFileSync(path.join(ROOT, workflow), "utf8");
    for (const line of source.split(/\r?\n/u)) {
      if (!/^\s*-?\s*uses:/u.test(line)) continue;
      assert.match(line, /@[0-9a-f]{40}(?:\s+#.*)?$/u, `${workflow}: ${line}`);
    }
  }
});

test("maintained instructions do not contain active host-specific Claude wording", () => {
  const violations = [];
  for (const relativeRoot of ACTIVE_INSTRUCTION_ROOTS) {
    for (const file of filesUnder(relativeRoot)) {
      const content = fs.readFileSync(file, "utf8");
      if (/(?:Claude Code|CLAUDE\.md|\.claude\/|Anthropic)/iu.test(content)) {
        violations.push(path.relative(ROOT, file));
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("gate runtime topology has no legacy Advisor profiles or host-foreign fallback branch", () => {
  const legacyProfiles = [
    ".codex/agents/advisor.toml",
    ".codex/agents/arbiter.toml",
    ".codex/agents/luna_smoke_agent.toml",
  ];
  for (const relativePath of legacyProfiles) {
    assert.equal(fs.existsSync(path.join(ROOT, relativePath)), false, `${relativePath} must not exist`);
  }

  const materializer = fs.readFileSync(path.join(ROOT, "plugins/maister/lib/distribution/materializer.mjs"), "utf8");
  const evaluator = fs.readFileSync(path.join(ROOT, "plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs"), "utf8");
  const engine = fs.readFileSync(path.join(ROOT, "plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md"), "utf8");
  const topology = `${materializer}\n${evaluator}\n${engine}`;

  assert.doesNotMatch(topology, /reconcile-advisor-config|advisor\.toml|arbiter\.toml/iu);
  assert.doesNotMatch(evaluator, /rolePort|invokeAdvisor|invokeArbiter/iu);
  assert.doesNotMatch(evaluator, /advisor[^\n]{0,80}(?:agent|model|permission|destination|adapter|evidence)/iu);
  assert.doesNotMatch(topology, /(?:advisor|arbiter)_(?:model|permission|destination|adapter|evidence|compatibility)|maister-advisor/iu);
  assert.doesNotMatch(topology, /spawn_agent|subagent_type|app-server|multi-agent v[12]|native Codex custom-agent/iu);
  assert.match(evaluator, /logical_role_id must be exactly maister:advisor/iu);
  assert.match(evaluator, /durable terminal result/iu);
});

test("the shipped agent-gate owner closes the production runtime-to-gate call graph", () => {
  const ownerPath = path.join(ROOT, "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs");
  const cliPath = path.join(ROOT, "plugins/maister/bin/maister-agent-gate.mjs");
  assert.equal(fs.existsSync(ownerPath), true, "the production owner module must be shipped");
  assert.equal(fs.existsSync(cliPath), true, "the operator-facing production CLI must be shipped");

  const owner = fs.readFileSync(ownerPath, "utf8");
  const cli = fs.readFileSync(cliPath, "utf8");
  assert.match(owner, /import \{ createProductionAgentRuntime \} from "\.\/production-runtime\.mjs"/u);
  assert.match(owner, /import \{ evaluateGate \} from "\.\.\/gate-evaluator\.mjs"/u);
  assert.match(owner, /const runtimePort = createProductionAgentRuntime\(/u);
  assert.match(owner, /return evaluateGate\(\{/u);
  assert.match(owner, /runtimePort,/u);
  assert.match(cli, /import \{ runProductionAgentGate \} from "\.\.\/skills\/orchestrator-framework\/bin\/agent-runtime\/production-owner\.mjs"/u);
  assert.match(cli, /await runProductionAgentGate\(/u);
});
