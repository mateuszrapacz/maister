import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DistributionError,
  revalidateResolvedSource,
  resolveSource,
  runGit,
} from "../../plugins/maister/lib/distribution/source-resolver.mjs";
import { hashTree } from "../../plugins/maister/lib/distribution/hash-tree.mjs";
import {
  buildAssemblyPlan,
  materialize,
} from "../../plugins/maister/lib/distribution/materializer.mjs";
import {
  loadOverlay,
  parseOverlayYaml,
} from "../../plugins/maister/lib/distribution/overlay-loader.mjs";
import { SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE_ROOT = path.join(ROOT, "tests/fixtures/platform-independent/source-repos/basic");
const FIXTURE_OVERLAY = path.join(SOURCE_ROOT, "overlay.yml");
const FIXTURE_INVENTORY = path.join(SOURCE_ROOT, "inventory.yml");
const PRODUCTION_OVERLAY_ROOT = path.join(ROOT, "plugins/maister/overlays");
const PROJECTION_PLUGIN_ROOT = path.join(ROOT, "plugins/maister");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

const cleanGit = {
  topLevel: () => SOURCE_ROOT,
  head: () => COMMIT,
  status: () => [],
};

const repositoryGit = {
  topLevel: () => ROOT,
  head: () => COMMIT,
  status: () => [],
};

function tempDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "maister-materializer-"));
}

function readTree(directory) {
  const entries = [];
  const walk = (current, relative = "") => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child, childRelative);
      else if (entry.isSymbolicLink()) entries.push(`${childRelative}=symlink:${fs.readlinkSync(child)}`);
      else entries.push(`${childRelative}=file:${fs.readFileSync(child, "utf8")}`);
    }
  };
  walk(directory);
  return entries;
}

function productionOptions(target, stagingRoot) {
  return {
    source: `local:${ROOT}`,
    target,
    overlayPath: path.join(PRODUCTION_OVERLAY_ROOT, target, "overlay.yml"),
    inventoryPath: path.join(PRODUCTION_OVERLAY_ROOT, target, "inventory.yml"),
    stagingRoot,
    git: repositoryGit,
    sourceVersion: "1.2.3",
    hostVersion: "1.0.0",
  };
}

function installProjectionInputs(source) {
  const fixturePluginRoot = path.join(source, "plugins/maister");
  fs.mkdirSync(fixturePluginRoot, { recursive: true });
  fs.cpSync(path.join(PROJECTION_PLUGIN_ROOT, "agents"), path.join(fixturePluginRoot, "agents"), { recursive: true });
  fs.copyFileSync(
    path.join(PROJECTION_PLUGIN_ROOT, "agent-projection-v1.json"),
    path.join(fixturePluginRoot, "agent-projection-v1.json"),
  );
  for (const skillId of ["docs-manager", "thermo-nuclear-code-quality-review", "thermo-nuclear-review"]) {
    const fixtureSkillRoot = path.join(fixturePluginRoot, "skills", skillId);
    fs.mkdirSync(fixtureSkillRoot, { recursive: true });
    fs.copyFileSync(
      path.join(PROJECTION_PLUGIN_ROOT, "skills", skillId, "SKILL.md"),
      path.join(fixtureSkillRoot, "SKILL.md"),
    );
  }
  for (const target of SUPPORTED_TARGET_IDS) {
    const sourceOverlayRoot = path.join(PRODUCTION_OVERLAY_ROOT, target);
    const fixtureOverlayRoot = path.join(fixturePluginRoot, "overlays", target);
    fs.mkdirSync(fixtureOverlayRoot, { recursive: true });
    fs.copyFileSync(path.join(sourceOverlayRoot, "overlay.yml"), path.join(fixtureOverlayRoot, "overlay.yml"));
    fs.copyFileSync(path.join(sourceOverlayRoot, "inventory.yml"), path.join(fixtureOverlayRoot, "inventory.yml"));
    const supportRoot = path.join(sourceOverlayRoot, "assets/support-agents");
    if (fs.existsSync(supportRoot)) {
      fs.cpSync(supportRoot, path.join(fixtureOverlayRoot, "assets/support-agents"), { recursive: true });
    }
  }
}

function cloneFixtureSource() {
  const root = tempDirectory();
  const source = path.join(root, "source");
  fs.cpSync(SOURCE_ROOT, source, { recursive: true });
  installProjectionInputs(source);
  return { root, source };
}

function fixtureOverlay() {
  const overlay = parseOverlayYaml(fs.readFileSync(FIXTURE_OVERLAY, "utf8"), FIXTURE_OVERLAY);
  const productionProjection = loadOverlay({
    overlayPath: path.join(PRODUCTION_OVERLAY_ROOT, "codex/overlay.yml"),
    inventoryPath: path.join(PRODUCTION_OVERLAY_ROOT, "codex/inventory.yml"),
  }).overlay.agent_projection;
  overlay.agent_projection = structuredClone(productionProjection);
  return overlay;
}

function fixtureOptions(source, stagingRoot, overlay = fixtureOverlay()) {
  return {
    source: `local:${source}`,
    target: "codex",
    overlay,
    overlayContractHash: "0".repeat(64),
    stagingRoot,
    git: {
      topLevel: () => fs.realpathSync(source),
      head: () => COMMIT,
      status: () => [],
    },
    sourceVersion: "1.2.3",
    hostVersion: "1.0.0",
  };
}

test("resolves a local checkout to an immutable commit", async () => {
  const resolved = await resolveSource(`local:${SOURCE_ROOT}`, { git: cleanGit, sourceVersion: "1.2.3" });

  assert.equal(resolved.kind, "local");
  assert.equal(resolved.root, SOURCE_ROOT);
  assert.equal(resolved.requestedRef, "HEAD");
  assert.equal(resolved.resolvedCommit, COMMIT);
  assert.equal(resolved.sourceVersion, "1.2.3");
  assert.match(resolved.contentHash, /^[0-9a-f]{64}$/u);

  await assert.rejects(
    resolveSource(`local:${SOURCE_ROOT}`, {
      git: { ...cleanGit, status: () => [" M tracked.txt"] },
    }),
    (error) => error.code === "E_SOURCE_DIRTY",
  );
  const dirty = await resolveSource(`local:${SOURCE_ROOT}`, {
    git: { ...cleanGit, status: () => [" M tracked.txt"] },
    allowDirtyLocal: true,
  });
  assert.equal(dirty.dirty, true);
  assert.match(dirty.contentHash, /^[0-9a-f]{64}$/u);

  await assert.rejects(
    resolveSource(`local:${SOURCE_ROOT}`, {
      ref: "release/v1",
      git: { ...cleanGit, resolve: () => "abcdefabcdefabcdefabcdefabcdefabcdefabcd", head: () => COMMIT },
    }),
    (error) => error.code === "E_SOURCE_REF",
  );

  await assert.rejects(
    resolveSource(`local:${SOURCE_ROOT}`, {
      git: { ...cleanGit, status: () => ["!! common/skills/ignored.md"] },
    }),
    (error) => error.code === "E_SOURCE_DIRTY" && error.details.ignored === true,
  );
});

test("resolves an injected GitHub ref to a full commit", async () => {
  const resolved = await resolveSource("github:owner/repo", {
    ref: "main",
    github: {
      resolveRef: ({ owner, repo, ref }) => ({
        owner,
        repo,
        ref,
        commit: COMMIT,
        root: SOURCE_ROOT,
        sourceVersion: "2.0.0",
      }),
    },
  });

  assert.equal(resolved.kind, "github");
  assert.equal(resolved.requestedRef, "main");
  assert.equal(resolved.resolvedCommit, COMMIT);
  assert.equal(resolved.sourceVersion, "2.0.0");
  assert.equal(resolved.identityMode, "content-hash");
  const rebound = await revalidateResolvedSource(resolved);
  assert.equal(rebound.contentHash, resolved.contentHash);
});

test("independently verifies injected GitHub checkout bytes and identity", async () => {
  const contentHash = hashTree(SOURCE_ROOT).contentHash;
  await assert.rejects(
    resolveSource("github:owner/repo", {
      ref: "main",
      github: {
        resolveRef: () => ({
          commit: COMMIT,
          root: SOURCE_ROOT,
          contentHash: "f".repeat(64),
        }),
      },
    }),
    (error) => error.code === "E_SOURCE_CONTENT_HASH" && error.details.expected === "f".repeat(64) && error.details.actual === contentHash,
  );

  const wrongHead = "fedcba9876543210fedcba9876543210fedcba98";
  await assert.rejects(
    resolveSource("github:owner/repo", {
      ref: "main",
      github: {
        resolveRef: () => ({
          commit: COMMIT,
          root: SOURCE_ROOT,
          contentHash,
          git: {
            topLevel: () => SOURCE_ROOT,
            head: () => wrongHead,
            status: () => [],
          },
        }),
      },
    }),
    (error) => error.code === "E_SOURCE_REF" && error.details.head === wrongHead,
  );

  await assert.rejects(
    resolveSource("github:owner/repo", {
      ref: "main",
      github: {
        resolveRef: () => ({
          commit: COMMIT,
          root: SOURCE_ROOT,
          contentHash,
          git: {
            topLevel: () => SOURCE_ROOT,
            head: () => COMMIT,
            status: () => ["!! ignored-secret.txt"],
          },
        }),
      },
    }),
    (error) => error.code === "E_SOURCE_DIRTY" && error.details.ignored === true,
  );
});

test("rejects mutable, ambiguous, unsupported, or checkout-escaping source provenance", async () => {
  await assert.rejects(resolveSource("github:owner/repo", {}), (error) => error.code === "E_SOURCE_REF");
  await assert.rejects(
    resolveSource("github:owner/repo", {
      ref: "main",
      github: { resolveRef: () => ({ commit: "0123456", root: SOURCE_ROOT }) },
    }),
    (error) => error.code === "E_SOURCE_AMBIGUOUS_SHA",
  );
  await assert.rejects(resolveSource("ssh:owner/repo", {}), (error) => error.code === "E_SOURCE_SCHEME");
  await assert.rejects(
    resolveSource(`local:${SOURCE_ROOT}`, {
      git: { ...cleanGit, topLevel: () => path.dirname(SOURCE_ROOT) },
    }),
    (error) => error.code === "E_SOURCE_ROOT",
  );
  await assert.rejects(
    resolveSource(`local:${SOURCE_ROOT}`, {
      ref: "--upload-pack=evil",
      git: cleanGit,
    }),
    (error) => error.code === "E_SOURCE_REF",
  );
});

test("wraps bounded Git timeouts as typed retryable source failures", () => {
  assert.throws(
    () => runGit(SOURCE_ROOT, ["status"], {
      gitTimeoutMs: 25,
      execFileSync: () => {
        const error = new Error("simulated timeout");
        error.code = "ETIMEDOUT";
        throw error;
      },
    }),
    (error) => error.code === "E_SOURCE_GIT_TIMEOUT" && error.retryable === true && error.details.timeout_ms === 25,
  );
});

test("preserves typed GitHub resolver failures", async () => {
  await assert.rejects(
    resolveSource("github:owner/repo", {
      ref: "main",
      github: {
        resolveRef: () => {
          throw new DistributionError("E_SOURCE_GIT_TIMEOUT", "simulated GitHub timeout", { timeout_ms: 25 }, { retryable: true });
        },
      },
    }),
    (error) => error.code === "E_SOURCE_GIT_TIMEOUT" && error.retryable === true && error.details.timeout_ms === 25,
  );
});

test("revalidates a resolved source through the final-byte API", async () => {
  const fixture = cloneFixtureSource();
  const resolved = await resolveSource(`local:${fixture.source}`, {
    git: {
      topLevel: () => fs.realpathSync(fixture.source),
      head: () => COMMIT,
      status: () => [],
    },
  });

  const rebound = await revalidateResolvedSource(resolved, {
    git: {
      topLevel: () => fs.realpathSync(fixture.source),
      head: () => COMMIT,
      status: () => [],
    },
  });
  assert.equal(rebound.contentHash, resolved.contentHash);
  assert.equal(rebound.resolvedCommit, COMMIT);
  assert.equal(rebound.statusFingerprint, resolved.statusFingerprint);
});

test("rejects a local source mutation before assembly", async () => {
  const fixture = cloneFixtureSource();
  const sourceFile = path.join(fixture.source, "common", "skills", "maister-example", "SKILL.md");
  await assert.rejects(
    materialize({
      ...fixtureOptions(fixture.source, path.join(fixture.root, "stage")),
      testHooks: {
        afterStagingParentValidation: () => fs.appendFileSync(sourceFile, "\nmutation before assembly\n"),
      },
    }),
    (error) => error.code === "E_SOURCE_CONTENT_HASH",
  );
});

test("rejects a local source mutation after assembly", async () => {
  const fixture = cloneFixtureSource();
  const sourceFile = path.join(fixture.source, "common", "skills", "maister-example", "SKILL.md");
  await assert.rejects(
    materialize({
      ...fixtureOptions(fixture.source, path.join(fixture.root, "stage")),
      testHooks: {
        afterAssembly: () => fs.appendFileSync(sourceFile, "\nmutation after assembly\n"),
      },
    }),
    (error) => error.code === "E_SOURCE_CONTENT_HASH",
  );
});

test("binds dirty-local opt-in to a deterministic status snapshot", async () => {
  const fixture = cloneFixtureSource();
  let statusCalls = 0;
  const git = {
    topLevel: () => fs.realpathSync(fixture.source),
    head: () => COMMIT,
    status: () => {
      statusCalls += 1;
      return statusCalls === 1 ? [" M tracked.txt"] : [" M tracked.txt", "?? added.txt"];
    },
  };

  await assert.rejects(
    materialize({
      ...fixtureOptions(fixture.source, path.join(fixture.root, "stage")),
      git,
      allowDirtyLocal: true,
    }),
    (error) => error.code === "E_SOURCE_DIRTY" && statusCalls >= 2,
  );
});

test("materializes identical source and overlay inputs deterministically", async () => {
  const fixture = cloneFixtureSource();
  const first = path.join(fixture.root, "one");
  const second = path.join(fixture.root, "two");
  const options = fixtureOptions(fixture.source, first);

  const firstResult = await materialize(options);
  const secondResult = await materialize({ ...options, stagingRoot: second });

  assert.deepEqual(readTree(first), readTree(second));
  assert.equal(firstResult.contentHash, secondResult.contentHash);
  assert.deepEqual(firstResult.provenance, secondResult.provenance);

  for (const target of SUPPORTED_TARGET_IDS) {
    const targetFirst = path.join(tempDirectory(), target, "one");
    const targetSecond = path.join(tempDirectory(), target, "two");
    const firstTargetResult = await materialize(productionOptions(target, targetFirst));
    const secondTargetResult = await materialize(productionOptions(target, targetSecond));
    assert.deepEqual(readTree(targetFirst), readTree(targetSecond));
    assert.equal(firstTargetResult.contentHash, secondTargetResult.contentHash);
  }
});

test("refuses path containment violations and symlink escapes", () => {
  const fixture = cloneFixtureSource();
  assert.throws(
    () => buildAssemblyPlan({
      sourceRoot: fixture.source,
      overlay: {
        layout: [{ source: "common/skills", destination: "../outside", kind: "tree", mode: "0755" }],
      },
    }),
    (error) => error.code === "E_MATERIALIZE_PATH",
  );

  const outside = path.join(fixture.root, "outside.txt");
  fs.writeFileSync(outside, "outside\n");
  const escaped = path.join(fixture.source, "common/skills/escape");
  try {
    fs.symlinkSync(outside, escaped);
    assert.throws(
      () => buildAssemblyPlan({
        sourceRoot: fixture.source,
        overlay: {
          layout: [{ source: "common/skills", destination: "skills", kind: "tree", mode: "0755" }],
        },
      }),
      (error) => error.code === "E_MATERIALIZE_SYMLINK",
    );
  } finally {
    fs.rmSync(escaped, { force: true });
  }
});

test("refuses source traversal and symlink cycles before assembly", () => {
  const fixture = cloneFixtureSource();
  assert.throws(
    () => buildAssemblyPlan({
      sourceRoot: fixture.source,
      overlay: {
        layout: [{ source: "../outside", destination: "skills", kind: "tree", mode: "0755" }],
      },
    }),
    (error) => error.code === "E_MATERIALIZE_PATH",
  );

  const cycle = path.join(fixture.source, "common/skills/cycle");
  try {
    fs.symlinkSync("cycle", cycle);
    assert.throws(
      () => buildAssemblyPlan({
        sourceRoot: fixture.source,
        overlay: {
          layout: [{ source: "common/skills", destination: "skills", kind: "tree", mode: "0755" }],
        },
      }),
      (error) => error.code === "E_MATERIALIZE_SYMLINK_CYCLE",
    );
  } finally {
    fs.rmSync(cycle, { force: true });
  }
});

test("refuses normalized destination collisions", () => {
  assert.throws(
    () => buildAssemblyPlan({
      sourceRoot: SOURCE_ROOT,
      overlay: {
        layout: [
          { source: "assets/plugin.json", destination: "A/file.json", kind: "file", mode: "0644" },
          { source: "assets/plugin.json", destination: "a/FILE.json", kind: "file", mode: "0644" },
        ],
      },
    }),
    (error) => error.code === "E_MATERIALIZE_COLLISION",
  );
});

test("validates inventory, syntax, executable modes, and hashes before accepting staging", async () => {
  const fixture = cloneFixtureSource();
  const staging = path.join(fixture.root, "materialized");
  const result = await materialize(fixtureOptions(fixture.source, staging));

  assert.equal(result.validation.inventory.ok, true);
  assert.equal(result.validation.syntax.ok, true);
  assert.equal(result.validation.modes.ok, true);
  assert.equal(result.validation.hashes.ok, true);
  assert.equal(result.provenance.overlayVersion, "1.0.0");
  assert.equal(result.provenance.hostVersion, "1.0.0");
  assert.equal(hashTree(staging).contentHash, result.contentHash);

  for (const target of SUPPORTED_TARGET_IDS) {
    const targetResult = await materialize(productionOptions(target, path.join(tempDirectory(), target)));
    assert.equal(targetResult.validation.inventory.ok, true);
    assert.equal(targetResult.validation.syntax.ok, true);
    assert.equal(targetResult.validation.modes.ok, true);
    assert.equal(targetResult.validation.hashes.ok, true);
  }
});

test("rejects source fallback outside the checkout and a staging-root symlink", async () => {
  const root = tempDirectory();
  const checkout = path.join(root, "checkout");
  const outsideCommon = path.join(root, "common", "skills");
  fs.mkdirSync(checkout, { recursive: true });
  fs.mkdirSync(outsideCommon, { recursive: true });
  fs.writeFileSync(path.join(outsideCommon, "SKILL.md"), "outside\n");

  assert.throws(
    () => buildAssemblyPlan({
      sourceRoot: checkout,
      overlay: { layout: [{ source: "common/skills", destination: "skills", kind: "tree", mode: "0755" }] },
    }),
    (error) => error.code === "E_MATERIALIZE_SOURCE",
  );

  const stagingTarget = path.join(root, "staging-target");
  const stagingLink = path.join(root, "staging-link");
  fs.mkdirSync(stagingTarget);
  fs.symlinkSync(stagingTarget, stagingLink);
  await assert.rejects(
    materialize(fixtureOptions(SOURCE_ROOT, stagingLink)),
    (error) => error.code === "E_MATERIALIZE_SYMLINK",
  );
});

test("refuses a symlinked staging parent before materialization can escape", async () => {
  const root = tempDirectory();
  const outside = path.join(root, "outside");
  const parentTarget = path.join(outside, "parent");
  const parentLink = path.join(root, "staging-parent");
  fs.mkdirSync(parentTarget, { recursive: true });
  fs.symlinkSync(parentTarget, parentLink);

  await assert.rejects(
    materialize(fixtureOptions(SOURCE_ROOT, path.join(parentLink, "stage"))),
    (error) => error.code === "E_MATERIALIZE_SYMLINK",
  );
  assert.equal(fs.existsSync(path.join(parentTarget, "stage")), false);
});

test("revalidates the staging parent when it is swapped after the initial check", async () => {
  const root = tempDirectory();
  const parent = path.join(root, "staging-parent");
  const outside = path.join(root, "outside");
  fs.mkdirSync(outside);

  await assert.rejects(
    materialize({
      ...fixtureOptions(SOURCE_ROOT, path.join(parent, "stage")),
      testHooks: {
        afterStagingParentValidation: () => fs.symlinkSync(outside, parent),
      },
    }),
    (error) => error.code === "E_MATERIALIZE_SYMLINK",
  );
  assert.equal(fs.existsSync(path.join(outside, "stage")), false);
});

test("scans every staged text file for unresolved tokens and forbidden vocabulary", async () => {
  const vocabularyFixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(vocabularyFixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\nThis historical note mentions cursor and must be rejected.\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(vocabularyFixture.source, path.join(vocabularyFixture.root, "stage"))),
    (error) => error.code === "E_OVERLAY_VOCABULARY",
  );

  const tokenFixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(tokenFixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\n{{UNRESOLVED_TOKEN}}\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(tokenFixture.source, path.join(tokenFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_TEMPLATE",
  );
});

test("validates frontmatter and staged internal references", async () => {
  const frontmatterFixture = cloneFixtureSource();
  fs.writeFileSync(
    path.join(frontmatterFixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "---\ntitle: [unterminated\n---\n\n# Fixture\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(frontmatterFixture.source, path.join(frontmatterFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_SYNTAX",
  );

  const referenceFixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(referenceFixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\n[missing internal reference](references/does-not-exist.md)\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(referenceFixture.source, path.join(referenceFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_REFERENCE",
  );
});

test("accepts the complete supported frontmatter and reference contract", async () => {
  const fixture = cloneFixtureSource();
  const skillRoot = path.join(fixture.source, "common", "skills", "maister-example");
  fs.mkdirSync(path.join(skillRoot, "references"), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, "references", "guide.md"), "# Guide\n");
  fs.writeFileSync(path.join(skillRoot, "references", "image.png"), "fixture image\n");
  fs.writeFileSync(
    path.join(skillRoot, "SKILL.md"),
    "---\n"
      + "title: \"Fixture: Example\"\n"
      + "tags: [one, two]\n"
      + "metadata:\n"
      + "  nested: true\n"
      + "description: \"A complete supported description.\"\n"
      + "---\n\n"
      + "[Guide][guide]\n\n"
      + "![Guide image](references/image.png)\n\n"
      + "<a href=\"references/guide.md\"><img src='file://./references/image.png'></a>\n\n"
      + "[guide]: references/guide.md\n",
  );

  const result = await materialize(fixtureOptions(fixture.source, path.join(fixture.root, "stage")));
  assert.equal(result.validation.references.ok, true);
  assert.equal(result.validation.syntax.ok, true);
  assert.equal(result.sourceBinding.contentHash, result.provenance.sourceHash);
  assert.equal(result.provenance.materializedHash, result.contentHash);
  const rebound = await revalidateResolvedSource(result.sourceBinding, {
    git: {
      ...cleanGit,
      topLevel: () => fs.realpathSync(fixture.source),
    },
  });
  assert.equal(rebound.contentHash, result.sourceBinding.contentHash);
});

test("rejects frontmatter mappings outside the supported YAML contract", async () => {
  const fixture = cloneFixtureSource();
  fs.writeFileSync(
    path.join(fixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "---\ntitle: &defaults value\n---\n\n# Fixture\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(fixture.source, path.join(fixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_SYNTAX",
  );
});

test("parses BOM and CRLF frontmatter instead of bypassing validation", async () => {
  const fixture = cloneFixtureSource();
  fs.writeFileSync(
    path.join(fixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\ufeff---\r\nname: [unterminated\r\n---\r\n\r\n# Fixture\r\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(fixture.source, path.join(fixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_SYNTAX",
  );
});

test("resolves Markdown reference definitions and rejects missing definition targets", async () => {
  const fixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(fixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\n[Missing guide][docs]\n\n[docs]: references/does-not-exist.md\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(fixture.source, path.join(fixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_REFERENCE" && error.details.reference === "references/does-not-exist.md",
  );
});

test("rejects absolute file URLs instead of treating them as external references", async () => {
  const fixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(fixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\n<a href=\"file:///outside/secret.md\">secret</a>\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(fixture.source, path.join(fixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_REFERENCE" && error.details.reference === "file:///outside/secret.md",
  );
});

test("rejects malformed supported reference syntax instead of ignoring it", async () => {
  const inlineFixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(inlineFixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\n[Guide [nested]](references/guide.md)\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(inlineFixture.source, path.join(inlineFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_REFERENCE",
  );

  const encodedFixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(encodedFixture.source, "common", "skills", "maister-example", "SKILL.md"),
    "\n<a href=\"references/%ZZ.md\">bad encoding</a>\n",
  );
  await assert.rejects(
    materialize(fixtureOptions(encodedFixture.source, path.join(encodedFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_REFERENCE",
  );
});

test("enforces directory inventory entries and rejects forbidden directories", async () => {
  const fixture = cloneFixtureSource();
  const requiredOverlay = fixtureOverlay();
  requiredOverlay.inventory.required.push("skills");
  const requiredStage = path.join(fixture.root, "required-stage");
  const required = await materialize(fixtureOptions(fixture.source, requiredStage, requiredOverlay));
  assert.equal(required.validation.inventory.ok, true);

  const forbiddenOverlay = fixtureOverlay();
  forbiddenOverlay.inventory.forbidden.push("skills");
  await assert.rejects(
    materialize(fixtureOptions(fixture.source, path.join(fixture.root, "forbidden-stage"), forbiddenOverlay)),
    (error) => error.code === "E_MATERIALIZE_INVENTORY",
  );
});

test("enforces native asset source type, declared mode, and hash contract", async () => {
  const modeFixture = cloneFixtureSource();
  fs.chmodSync(path.join(modeFixture.source, "assets", "plugin.json"), 0o600);
  await assert.rejects(
    materialize(fixtureOptions(modeFixture.source, path.join(modeFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_MODE",
  );

  const typeOverlay = fixtureOverlay();
  typeOverlay.native_assets[0].source = "common/skills";
  const typeFixture = cloneFixtureSource();
  await assert.rejects(
    materialize(fixtureOptions(typeFixture.source, path.join(typeFixture.root, "stage"), typeOverlay)),
    (error) => error.code === "E_MATERIALIZE_NATIVE",
  );

  const symlinkFixture = cloneFixtureSource();
  const outside = path.join(symlinkFixture.root, "outside-plugin.json");
  fs.writeFileSync(outside, "outside\n");
  const nativeSource = path.join(symlinkFixture.source, "assets", "plugin.json");
  fs.rmSync(nativeSource);
  fs.symlinkSync(outside, nativeSource);
  await assert.rejects(
    materialize(fixtureOptions(symlinkFixture.source, path.join(symlinkFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_SYMLINK",
  );

  const hashFixture = cloneFixtureSource();
  fs.appendFileSync(path.join(hashFixture.source, "assets", "plugin.json"), "\n");
  await assert.rejects(
    materialize(fixtureOptions(hashFixture.source, path.join(hashFixture.root, "stage"))),
    (error) => error.code === "E_MATERIALIZE_HASH",
  );
});

test("runs projection after trusted assembly and source revalidation but before candidate enumeration", async () => {
  const phases = [];
  const stagingRoot = path.join(tempDirectory(), "stage");
  const result = await materialize({
    ...productionOptions("cursor", stagingRoot),
    testHooks: {
      onPhase: (phase) => phases.push(phase),
      afterProjection: ({ stagingRoot: projectedRoot }) => {
        assert.equal(fs.existsSync(path.join(projectedRoot, "agents/maister-advisor.md")), true);
        assert.equal(
          fs.existsSync(path.join(projectedRoot, "agents/maister-user-docs-generator.md")),
          true,
        );
      },
    },
  });

  assert.deepEqual(phases, [
    "source-revalidated",
    "assembly-complete",
    "source-revalidated-after-assembly",
    "projection-complete",
    "staging-enumerated",
    "candidate-validated",
    "provenance-finalized",
  ]);
  assert.equal(result.validation.inventory.files.includes("agents/maister-advisor.md"), true);
  assert.equal(
    result.validation.inventory.files.includes("agents/maister-user-docs-generator.md"),
    true,
  );
});

test("binds projection schema, projector, canonical set, manifest, and projected tree into provenance", async () => {
  const result = await materialize(productionOptions("codex", path.join(tempDirectory(), "stage")));

  assert.deepEqual(result.provenance.agent_projection, {
    schema_version: result.projection.schema_version,
    projector_version: result.projection.projector_version,
    canonical_set_digest: result.projection.canonical_set_digest,
    manifest_digest: result.projection.manifest_digest,
    projected_tree_digest: result.projection.projected_tree_digest,
  });
  assert.equal(result.provenance.contentHash, result.contentHash);
  assert.equal(hashTree(result.stagingRoot).contentHash, result.contentHash);
});

test("rejects projected JSON syntax corruption during normal candidate validation", async () => {
  await assert.rejects(
    materialize({
      ...productionOptions("kiro-cli", path.join(tempDirectory(), "stage")),
      testHooks: {
        afterProjection: ({ stagingRoot }) => fs.writeFileSync(path.join(stagingRoot, "maister-advisor.json"), "{broken\n"),
      },
    }),
    (error) => error.code === "E_MATERIALIZE_SYNTAX" && error.details.path === "maister-advisor.json",
  );
});

test("rejects projected mode drift during normal candidate validation", async () => {
  await assert.rejects(
    materialize({
      ...productionOptions("cursor", path.join(tempDirectory(), "stage")),
      testHooks: {
        afterProjection: ({ stagingRoot }) => fs.chmodSync(path.join(stagingRoot, "agents/maister-advisor.md"), 0o600),
      },
    }),
    (error) => error.code === "E_MATERIALIZE_MODE" && error.details.path === "agents/maister-advisor.md",
  );
});

test("rejects projected byte drift during normal candidate hash validation", async () => {
  await assert.rejects(
    materialize({
      ...productionOptions("cursor", path.join(tempDirectory(), "stage")),
      testHooks: {
        afterProjection: ({ stagingRoot }) => fs.appendFileSync(path.join(stagingRoot, "agents/maister-advisor.md"), "drift\n"),
      },
    }),
    (error) => error.code === "E_MATERIALIZE_HASH" && error.details.path === "agents/maister-advisor.md",
  );
});

for (const scenario of [
  {
    name: "missing",
    mutate: (stagingRoot) => fs.rmSync(path.join(stagingRoot, "agents/instructions/maister-advisor.md")),
  },
  {
    name: "escaping",
    mutate: (stagingRoot) => {
      const descriptorPath = path.join(stagingRoot, "agents/maister-advisor.json");
      const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
      descriptor.prompt = "file://./../outside.md";
      fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor)}\n`);
    },
  },
  {
    name: "absolute",
    mutate: (stagingRoot) => {
      const descriptorPath = path.join(stagingRoot, "agents/maister-advisor.json");
      const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
      descriptor.prompt = "file:///outside.md";
      fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor)}\n`);
    },
  },
]) {
  test(`rejects ${scenario.name} generated Kiro prompt references without a broad exception`, async () => {
    await assert.rejects(
      materialize({
        ...productionOptions("kiro-cli", path.join(tempDirectory(), "stage")),
        testHooks: { afterProjection: ({ stagingRoot }) => scenario.mutate(stagingRoot) },
      }),
      (error) => error.code === "E_MATERIALIZE_REFERENCE" && error.details.path === "agents/maister-advisor.json",
    );
  });
}

test("projection failure precedes later candidate phases and preserves source and unrelated host bytes", async () => {
  const sourceBefore = hashTree(ROOT).contentHash;
  const hostRoot = tempDirectory();
  fs.writeFileSync(path.join(hostRoot, "unrelated-agent.md"), "operator-owned\n");
  const hostBefore = hashTree(hostRoot).contentHash;
  const phases = [];

  await assert.rejects(
    materialize({
      ...productionOptions("cursor", path.join(tempDirectory(), "stage")),
      testHooks: {
        onPhase: (phase) => phases.push(phase),
        afterProjection: () => {
          throw new DistributionError("E_MATERIALIZE_FAILED", "injected projection failure");
        },
      },
    }),
    (error) => error.code === "E_MATERIALIZE_FAILED",
  );

  assert.equal(phases.includes("staging-enumerated"), false);
  assert.equal(phases.includes("candidate-validated"), false);
  assert.equal(hashTree(ROOT).contentHash, sourceBefore);
  assert.equal(hashTree(hostRoot).contentHash, hostBefore);
});

test("canonical source changes invalidate canonical, manifest, projected-tree, and provenance bindings", async () => {
  const firstFixture = cloneFixtureSource();
  const secondFixture = cloneFixtureSource();
  fs.appendFileSync(
    path.join(secondFixture.source, "plugins/maister/agents/advisor.md"),
    "\nCanonical fixture change.\n",
  );

  const first = await materialize(fixtureOptions(firstFixture.source, path.join(firstFixture.root, "stage")));
  const second = await materialize(fixtureOptions(secondFixture.source, path.join(secondFixture.root, "stage")));

  assert.notEqual(second.projection.canonical_set_digest, first.projection.canonical_set_digest);
  assert.notEqual(second.projection.manifest_digest, first.projection.manifest_digest);
  assert.notEqual(second.projection.projected_tree_digest, first.projection.projected_tree_digest);
  assert.notEqual(second.provenance.provenanceHash, first.provenance.provenanceHash);
});

test("materialization writes generated host files only to staging and runtime code has no projector dependency", async () => {
  const sourceBefore = hashTree(ROOT).contentHash;
  const stagingRoot = path.join(tempDirectory(), "stage");
  await materialize(productionOptions("cursor", stagingRoot));

  assert.equal(fs.existsSync(path.join(stagingRoot, "agents/maister-advisor.md")), true);
  assert.equal(hashTree(ROOT).contentHash, sourceBefore);
  const runtimeRoot = path.join(PROJECTION_PLUGIN_ROOT, "skills/orchestrator-framework/bin/agent-runtime");
  for (const entry of fs.readdirSync(runtimeRoot)) {
    if (!entry.endsWith(".mjs")) continue;
    assert.doesNotMatch(fs.readFileSync(path.join(runtimeRoot, entry), "utf8"), /agent-projector|projectAgents/u);
  }
});
