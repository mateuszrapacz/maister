import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertManagedArrayUnchanged,
  atomicWriteSetting,
  prepareSetting,
  removeManagedArrayEntry,
} from "../../plugins/maister/lib/distribution/settings-owner.mjs";
import { executeLifecycle } from "../../plugins/maister/lib/distribution/transaction-manager.mjs";
import { portableCoreTreeHash } from "../../plugins/maister/lib/distribution/e3-attestation.mjs";

const SOURCE_ROOT = path.resolve(import.meta.dirname, "../..");
const PI_OVERLAY_ROOT = path.join(SOURCE_ROOT, "plugins/maister/overlays");
const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";

const DEFINITION = Object.freeze({
  path: "settings.json",
  format: "json",
  ownership: "managed_array_entries",
  managed_keys: [],
  array_path: "packages",
  identity: "pi_local_package_v1",
  entries: [{ source: "./maister" }],
  merge_policy: "preserve_unmanaged_refuse_drift",
});

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-pi-managed-array-"));
  const agentRoot = path.join(root, "agent");
  fs.mkdirSync(agentRoot, { recursive: true });
  return {
    root,
    agentRoot,
    settingsPath: path.join(agentRoot, "settings.json"),
    activeRoot: path.join(agentRoot, "maister"),
  };
}

function receiptSetting(prepared) {
  return {
    path: prepared.path,
    format: prepared.format,
    ownership: prepared.ownership,
    managed_keys: prepared.managed_keys,
    before_sha256: prepared.beforeSha256,
    after_sha256: prepared.afterSha256,
    backup_ref: "settings/0",
    mode: prepared.mode,
    before_mode: prepared.beforeMode,
    ...prepared.managedArray,
  };
}

function writePrepared(box, prepared) {
  fs.writeFileSync(box.settingsPath, prepared.bytes, { mode: Number.parseInt(prepared.mode, 8) });
  fs.chmodSync(box.settingsPath, Number.parseInt(prepared.mode, 8));
}

function expectCode(action, code) {
  assert.throws(action, (error) => error.code === code);
}

test("creates the minimal Pi settings file and records the managed-array contract", () => {
  const box = sandbox();
  try {
    const prepared = prepareSetting({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot });
    assert.deepEqual(JSON.parse(prepared.bytes), { packages: ["./maister"] });
    assert.equal(prepared.mode, "0600");
    assert.equal(prepared.managedArray.ownership_schema, "managed_array_entries_v1");
    assert.equal(prepared.managedArray.merge_schema, "pi_local_package_v1");
    assert.equal(prepared.managedArray.entry_representation, "string");
    assert.equal(prepared.managedArray.entry_before, null);
    assert.equal(prepared.managedArray.entry_after, "./maister");
    assert.equal(prepared.managedArray.settings_path, "settings.json");
    assert.equal(prepared.managedArray.array_path, "packages");
    assert.match(prepared.managedArray.normalized_identity, /[\\/]agent[\\/]maister$/u);

    writePrepared(box, prepared);
    const receipt = receiptSetting(prepared);
    assertManagedArrayUnchanged({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot, receiptSetting: receipt });
    const removed = removeManagedArrayEntry({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot, expected: receipt });
    assert.deepEqual(JSON.parse(removed), { packages: [] });
  } finally {
    fs.rmSync(box.root, { recursive: true, force: true });
  }
});

test("matches a tilde package identity against the configured home without appending a duplicate", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-pi-tilde-"));
  const homeRoot = path.join(root, "home");
  const agentRoot = path.join(homeRoot, ".pi", "agent");
  const settingsPath = path.join(agentRoot, "settings.json");
  const activeRoot = path.join(agentRoot, "maister");
  fs.mkdirSync(agentRoot, { recursive: true });
  try {
    fs.writeFileSync(settingsPath, `${JSON.stringify({ packages: ["~/.pi/agent/maister"] })}\n`, { mode: 0o640 });
    const prepared = prepareSetting({ definition: DEFINITION, targetPath: settingsPath, activeRoot, homeRoot });
    assert.equal(prepared.managedArray.entry_before, "~/.pi/agent/maister");
    assert.deepEqual(JSON.parse(prepared.bytes), { packages: ["~/.pi/agent/maister"] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects an operator edit at the atomic rename boundary without replacing it", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-settings-race-"));
  const targetPath = path.join(root, "settings.json");
  const original = Buffer.from("{\"packages\":[\"./maister\"]}\n");
  fs.writeFileSync(targetPath, original, { mode: 0o640 });
  try {
    assert.throws(
      () => atomicWriteSetting(targetPath, Buffer.from("{\"packages\":[] }\n"), "0640", {
        expected: {
          exists: true,
          sha256: crypto.createHash("sha256").update(original).digest("hex"),
          mode: "0640",
        },
        beforeRename: () => fs.writeFileSync(targetPath, "operator-edit\n", { mode: 0o640 }),
      }),
      (error) => error?.kind === "E_DRIFT_CONFLICT" && error.details?.reason === "concurrent_write",
    );
    assert.equal(fs.readFileSync(targetPath, "utf8"), "operator-edit\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("preserves unrelated packages, object representation, fields, order, and mode", () => {
  const box = sandbox();
  try {
    const before = {
      theme: "operator",
      packages: [
        "npm-package",
        { source: "./maister", extensions: ["./extensions/maister.ts"], custom: { owner: "operator" } },
        { source: "https://example.invalid/other.tgz", autoload: true },
      ],
      trailing: { enabled: true },
    };
    fs.writeFileSync(box.settingsPath, `${JSON.stringify(before, null, 4)}\n`, { mode: 0o640 });
    fs.chmodSync(box.settingsPath, 0o640);

    const prepared = prepareSetting({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot });
    assert.equal(prepared.mode, "0640");
    assert.equal(prepared.managedArray.entry_representation, "object");
    assert.deepEqual(prepared.managedArray.entry_before, before.packages[1]);
    assert.deepEqual(prepared.managedArray.entry_after, before.packages[1]);
    writePrepared(box, prepared);
    const after = JSON.parse(fs.readFileSync(box.settingsPath, "utf8"));
    assert.deepEqual(after.theme, before.theme);
    assert.deepEqual(after.trailing, before.trailing);
    assert.deepEqual(after.packages, before.packages);
    assert.equal((fs.statSync(box.settingsPath).mode & 0o7777).toString(8).padStart(4, "0"), "0640");

    assertManagedArrayUnchanged({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot, receiptSetting: receiptSetting(prepared) });
  } finally {
    fs.rmSync(box.root, { recursive: true, force: true });
  }
});

test("fails closed for malformed arrays, duplicates, filters, and an escaping managed root", () => {
  const cases = [
    ["{\"packages\":", "E_SETTINGS_SYNTAX"],
    ["{\"packages\":{}}", "E_SETTINGS_SYNTAX"],
    ["{\"packages\":[\"./maister\",\"./maister\"]}", "E_SETTINGS_DUPLICATE"],
    ["{\"packages\":[{\"source\":\"./maister\",\"autoload\":false}]}", "E_SETTINGS_FILTER"],
    ["{\"packages\":[{\"source\":\"./maister\",\"extensions\":[\"./other.ts\"]}]}", "E_SETTINGS_FILTER"],
  ];
  for (const [text, code] of cases) {
    const box = sandbox();
    try {
      fs.writeFileSync(box.settingsPath, text, { mode: 0o600 });
      expectCode(() => prepareSetting({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot }), code);
    } finally {
      fs.rmSync(box.root, { recursive: true, force: true });
    }
  }

  const box = sandbox();
  const outside = path.join(box.root, "outside");
  try {
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, box.activeRoot, "dir");
    expectCode(() => prepareSetting({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot }), "E_SETTINGS_PATH");
  } finally {
    fs.rmSync(box.root, { recursive: true, force: true });
  }
});

test("detects unrelated settings drift and owned-entry drift before mutation", () => {
  const box = sandbox();
  try {
    const prepared = prepareSetting({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot });
    writePrepared(box, prepared);
    const receipt = receiptSetting(prepared);

    fs.writeFileSync(box.settingsPath, JSON.stringify({ packages: ["./maister"], operator: true }) + "\n", { mode: 0o600 });
    fs.chmodSync(box.settingsPath, 0o600);
    expectCode(() => assertManagedArrayUnchanged({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot, receiptSetting: receipt }), "E_DRIFT_CONFLICT");

    fs.writeFileSync(box.settingsPath, JSON.stringify({ packages: [{ source: "./maister", autoload: false }] }) + "\n", { mode: 0o600 });
    expectCode(() => assertManagedArrayUnchanged({ definition: DEFINITION, targetPath: box.settingsPath, activeRoot: box.activeRoot, receiptSetting: receipt }), "E_DRIFT_CONFLICT");
  } finally {
    fs.rmSync(box.root, { recursive: true, force: true });
  }
});

test("runs the full Pi transaction lifecycle while preserving operator packages", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-pi-lifecycle-test-"));
  const home = path.join(root, "home");
  const state = path.join(root, "state");
  const agentRoot = path.join(home, ".pi", "agent");
  const settingsPath = path.join(agentRoot, "settings.json");
  fs.mkdirSync(agentRoot, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  const env = {
    ...process.env,
    XDG_STATE_HOME: state,
    PI_CODING_AGENT_DIR: ".pi/agent",
  };
  const git = {
    topLevel: () => SOURCE_ROOT,
    head: () => SOURCE_COMMIT,
    status: () => [],
  };
  const portableCoreHash = portableCoreTreeHash(SOURCE_ROOT);
  const e3Attestation = {
    schema_version: 1,
    kind: "maister/e3-portable-core",
    test_command: "node --test tests/platform-independent/portable-core.test.mjs",
    result: "passed",
    source_commit: SOURCE_COMMIT,
    source_version: "1.2.3",
    portable_core_tree_hash: portableCoreHash,
    scenario: "portable-core-v1",
    scenario_version: "1.0.0",
    tested_at: "2026-07-15T00:00:00.000Z",
    expires_at: "2027-07-15T00:00:00.000Z",
    artifact_digest: portableCoreHash,
  };
  const lifecycleOptions = {
    target: "pi",
    source: `local:${SOURCE_ROOT}`,
    home,
    env,
    overlayRoot: PI_OVERLAY_ROOT,
    git,
    sourceVersion: "1.2.3",
    hostVersion: "0.80.10",
    unavailableEvidenceReason: "runtime-or-scenario-unavailable",
  };
  const initialSettings = {
    theme: "operator",
    packages: [
      "external-package",
      {
        source: "./maister",
        autoload: true,
        extensions: ["./extensions/maister.ts"],
        skills: ["./skills"],
        prompts: ["./prompts"],
        operator_field: "keep",
      },
    ],
  };
  try {
    fs.writeFileSync(settingsPath, `${JSON.stringify(initialSettings, null, 2)}\n`, { mode: 0o640 });
    fs.chmodSync(settingsPath, 0o640);

    const installed = await executeLifecycle("install", { ...lifecycleOptions, e3Attestation });
    assert.equal(installed.receipt.target.id, "pi");
    assert.equal(installed.receipt.settings[0].ownership, "managed_array_entries");
    assert.equal(installed.receipt.settings[0].ownership_schema, "managed_array_entries_v1");
    assert.equal(installed.receipt.settings[0].merge_schema, "pi_local_package_v1");
    assert.equal(installed.receipt.settings[0].entry_representation, "object");
    assert.equal(installed.receipt.settings[0].entry_after.operator_field, "keep");
    assert.equal(fs.existsSync(path.join(agentRoot, "maister")), true);

    const verified = await executeLifecycle("verify", lifecycleOptions);
    assert.equal(verified.receipt.receipt_id, installed.receipt.receipt_id);

    const updated = await executeLifecycle("update", { ...lifecycleOptions, e3Attestation });
    assert.notEqual(updated.receipt.receipt_id, installed.receipt.receipt_id);

    const rolledBack = await executeLifecycle("rollback", lifecycleOptions);
    assert.equal(rolledBack.receipt.receipt_id, installed.receipt.receipt_id);

    const recovered = await executeLifecycle("recover", lifecycleOptions);
    assert.equal(recovered.receipt.receipt_id, installed.receipt.receipt_id);

    const uninstalled = await executeLifecycle("uninstall", lifecycleOptions);
    assert.equal(uninstalled.receipt.status, "uninstalled");
    assert.equal(fs.existsSync(path.join(agentRoot, "maister")), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath, "utf8")), {
      theme: "operator",
      packages: ["external-package"],
    });
    assert.equal((fs.statSync(settingsPath).mode & 0o7777).toString(8).padStart(4, "0"), "0640");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
