import fs from "node:fs";
import path from "node:path";

import { portableCoreTreeHash } from "../../plugins/maister/lib/distribution/e3-attestation.mjs";
import { executeLifecycle } from "../../plugins/maister/lib/distribution/transaction-manager.mjs";
import { filesystemSnapshot } from "./filesystem-snapshot.mjs";

const [root, marker, operation = "install"] = process.argv.slice(2);
const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.join(repositoryRoot, "tests/fixtures/platform-independent/source-repos/basic");
const sourceRoot = path.join(root, "source");
const home = path.join(root, "home");
const state = path.join(root, "state");
const commit = "0123456789abcdef0123456789abcdef01234567";

fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(state, { recursive: true, mode: 0o700 });
if (!fs.existsSync(sourceRoot)) {
  fs.cpSync(fixtureRoot, sourceRoot, { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, "plugins/maister"), { recursive: true });
  for (const directory of ["overlays", "agents", "skills", "bin", "lib"]) {
    fs.cpSync(path.join(repositoryRoot, "plugins/maister", directory), path.join(sourceRoot, "plugins/maister", directory), { recursive: true });
  }
  fs.cpSync(path.join(repositoryRoot, "plugins/maister/agent-projection-v1.json"), path.join(sourceRoot, "plugins/maister/agent-projection-v1.json"));
}

const git = Object.freeze({ topLevel: () => fs.realpathSync(sourceRoot), head: () => commit, status: () => [] });
const environment = {
  ...process.env,
  XDG_STATE_HOME: state,
  MAISTER_EVIDENCE_NOW: "2026-07-15T00:00:00.000Z",
  MAISTER_CODEX_NATIVE_DEPLOYMENT: "0",
};
const coreHash = portableCoreTreeHash(sourceRoot);
const e3Attestation = Object.freeze({
  schema_version: 1,
  kind: "maister/e3-portable-core",
  test_command: "node --test tests/platform-independent/portable-core.test.mjs",
  result: "passed",
  source_commit: commit,
  source_version: "unknown",
  portable_core_tree_hash: coreHash,
  scenario: "portable-core-v1",
  scenario_version: "1.0.0",
  tested_at: "2026-07-15T00:00:00.000Z",
  expires_at: "2027-07-15T00:00:00.000Z",
  artifact_digest: coreHash,
});

function options(onDurableBoundary) {
  return {
    target: "codex",
    source: `local:${sourceRoot}`,
    resolvedSourceRoot: sourceRoot,
    home,
    env: environment,
    git,
    overlayRoot: path.join(repositoryRoot, "plugins/maister/overlays"),
    e3Attestation,
    onDurableBoundary,
  };
}

if (operation === "seed-multiple") {
  await executeLifecycle("install", options());
  const journalPaths = [];
  for (let index = 0; index < 2; index += 1) {
    try {
      await executeLifecycle("update", { ...options(), failurePoint: "after-e4" });
    } catch (error) {
      if (error?.details?.journal_path) journalPaths.push(error.details.journal_path);
    }
  }
  fs.writeFileSync(path.join(root, "multiple-journals.json"), `${JSON.stringify({ journalPaths })}\n`, { mode: 0o600 });
  process.exit(0);
}

let rollbackExpected = null;
if (operation === "rollback") {
  await executeLifecycle("install", options());
  rollbackExpected = filesystemSnapshot(home);
  await executeLifecycle("update", options());
}

const beforeOperation = filesystemSnapshot(home);

await executeLifecycle(operation, options(({ marker: observed }) => {
  if (observed !== marker) return;
  const oracle = {
    marker: observed,
    operation,
    before_operation: beforeOperation,
    after_rollback: rollbackExpected,
    at_crash: filesystemSnapshot(home),
  };
  fs.writeFileSync(path.join(root, "recovery-oracle.json"), `${JSON.stringify(oracle)}\n`, { mode: 0o600 });
  fs.writeFileSync(path.join(root, "crash-observed.json"), `${JSON.stringify({ marker: observed, operation })}\n`, { mode: 0o600 });
  process.kill(process.pid, "SIGKILL");
}));

throw new Error(`durable marker was not observed: ${marker}`);
