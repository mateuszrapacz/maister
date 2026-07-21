import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createEvidenceRecord } from "../../plugins/maister/lib/distribution/evidence-schema.mjs";
import {
  CURRENT_RELEASE_TARGETS,
  CurrentTargetAdmissionError,
  runCurrentTargetAdmission,
  validateCurrentTargetAdmission,
} from "../../plugins/maister/bin/parity-release.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

function temporaryRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeArchive(root, target, { forbidden = false } = {}) {
  const staging = path.join(root, `${target}-stage`);
  const overlay = path.join(staging, "plugins/maister/overlays", target);
  fs.mkdirSync(overlay, { recursive: true });
  fs.writeFileSync(path.join(overlay, "overlay.yml"), "schema_version: 1\n");
  if (forbidden) {
    fs.mkdirSync(path.join(staging, "plugins/maister/node_modules"), { recursive: true });
    fs.writeFileSync(path.join(staging, "plugins/maister/node_modules", "forbidden.txt"), "external\n");
  }
  const archive = path.join(root, `maister-${target}.tar.gz`);
  execFileSync("tar", ["-czf", archive, "-C", staging, "plugins"], { stdio: "pipe" });
  return archive;
}

function piEvidence(valid, { native = false } = {}) {
  const pi = valid.targets.find((entry) => entry.target === "pi");
  const provenance = {
    source_commit: "e".repeat(40),
    source_version: "test",
    overlay_id: pi.overlay_id,
    overlay_version: pi.overlay_version,
    host: "pi",
    scenario_version: "1.0.0",
    schema_version: 1,
    projector_version: "1.0.0",
    canonical_set_digest: "a".repeat(64),
    manifest_digest: "b".repeat(64),
    projected_tree_digest: "c".repeat(64),
    source_hash: "d".repeat(64),
    overlay_hash: pi.contract_hash,
    materialized_hash: "1".repeat(64),
    provenance_hash: "2".repeat(64),
  };
  return ["E1", "E2", "E3", "E4", "E5", "E6"].map((capability) => createEvidenceRecord({
    target: "pi",
    capability,
    hostVersion: "0.80.10",
    scenario: `${capability.toLowerCase()}-v1`,
    result: capability === "E5" || capability === "E6" ? (native ? "passed" : "unavailable") : "passed",
    provenance: capability === "E5" || capability === "E6"
      ? native ? provenance : { ...provenance, reason: "host_evidence_unavailable" }
      : provenance,
    timestamp: "2026-07-21T00:00:00.000Z",
  }));
}

test("current admission is exactly the four registered targets and does not require a historical oracle", async () => {
  const result = await runCurrentTargetAdmission({ root: ROOT });

  assert.deepEqual(CURRENT_RELEASE_TARGETS, ["codex", "cursor", "kiro-cli", "pi"]);
  assert.equal(result.schema_version, 1);
  assert.equal(result.gate, "current-target-admission-v1");
  assert.equal(result.ok, true);
  assert.deepEqual(result.target_set, CURRENT_RELEASE_TARGETS);
  assert.deepEqual(result.targets.map((entry) => entry.target), CURRENT_RELEASE_TARGETS);
  assert.ok(result.targets.every((entry) => entry.ok === true));
  assert.equal(result.pi_support.label, "pi.registered");
  assert.deepEqual(result.pi_support.evidence, {
    E1: "unavailable",
    E2: "unavailable",
    E3: "unavailable",
    E4: "unavailable",
    E5: "unavailable",
    E6: "unavailable",
  });
});

test("current admission publishes provisional Pi claims only from a bound E1-E6 manifest", async () => {
  const baseline = await runCurrentTargetAdmission({ root: ROOT });
  const evidenceRoot = temporaryRoot("maister-current-admission-evidence-");
  const evidencePath = path.join(evidenceRoot, "pi-evidence.json");
  try {
    fs.writeFileSync(evidencePath, `${JSON.stringify({ records: piEvidence(baseline) }, null, 2)}\n`);
    const result = await runCurrentTargetAdmission({ root: ROOT, evidencePath });
    assert.equal(result.pi_support.label, "pi.structural-transactional.provisional");
    assert.equal(result.pi_support.evidence.E1, "passed");
    assert.equal(result.pi_support.evidence.E5, "unavailable");
    assert.equal(result.pi_support.evidence_binding.overlay_hash, baseline.targets.find((entry) => entry.target === "pi").contract_hash);
    assert.equal(result.pi_support.evidence_records.length, 6);
  } finally {
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
  }
});

test("current admission promotes a bound full Pi E1-E6 manifest to native-semantic support", async () => {
  const baseline = await runCurrentTargetAdmission({ root: ROOT });
  const evidenceRoot = temporaryRoot("maister-current-admission-native-evidence-");
  const evidencePath = path.join(evidenceRoot, "pi-evidence.json");
  try {
    fs.writeFileSync(evidencePath, `${JSON.stringify({ records: piEvidence(baseline, { native: true }) }, null, 2)}\n`);
    const result = await runCurrentTargetAdmission({ root: ROOT, evidencePath });
    assert.equal(result.pi_support.label, "pi.native-semantic");
    assert.deepEqual(result.pi_support.evidence, {
      E1: "passed",
      E2: "passed",
      E3: "passed",
      E4: "passed",
      E5: "passed",
      E6: "passed",
    });
    assert.equal(result.pi_support.structural_transactional.status, "passed");
    assert.equal(result.pi_support.native_discovery.status, "passed");
    assert.equal(result.pi_support.native_runtime.status, "passed");
    assert.equal(result.pi_support.semantic.status, "passed");
  } finally {
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
  }
});

test("current admission rejects target-set drift and native claims without E5/E6", async () => {
  const valid = await runCurrentTargetAdmission({ root: ROOT });

  assert.throws(
    () => validateCurrentTargetAdmission({ ...valid, target_set: ["codex", "cursor", "kiro-cli"] }),
    (error) => error instanceof CurrentTargetAdmissionError && error.code === "E_CURRENT_TARGET_ADMISSION_REPORT",
  );
  assert.throws(
    () => validateCurrentTargetAdmission({
      ...valid,
      pi_support: {
        ...valid.pi_support,
        evidence: { ...valid.pi_support.evidence, E5: "passed" },
      },
    }),
    (error) => error instanceof CurrentTargetAdmissionError && error.code === "E_CURRENT_TARGET_ADMISSION_CLAIMS",
  );
});

test("archive admission checks all four target archives and rejects bundled Pi state or prerequisites", async () => {
  const archiveRoot = temporaryRoot("maister-current-admission-archives-");
  try {
    for (const target of CURRENT_RELEASE_TARGETS) writeArchive(archiveRoot, target);
    const result = await runCurrentTargetAdmission({ root: ROOT, archiveDir: archiveRoot });
    assert.deepEqual(result.archives.map((entry) => entry.target), CURRENT_RELEASE_TARGETS);
    assert.ok(result.archives.every((entry) => /^[0-9a-f]{64}$/u.test(entry.sha256)));

    writeArchive(archiveRoot, "pi", { forbidden: true });
    await assert.rejects(
      runCurrentTargetAdmission({ root: ROOT, archiveDir: archiveRoot }),
      (error) => error instanceof CurrentTargetAdmissionError && error.code === "E_CURRENT_TARGET_ADMISSION_ARCHIVE",
    );
  } finally {
    fs.rmSync(archiveRoot, { recursive: true, force: true });
  }
});
