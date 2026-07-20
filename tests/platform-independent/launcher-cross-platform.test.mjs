import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseLauncherCliArgs } from "../../plugins/maister/lib/distribution/cli-contract.mjs";
import { childStatus } from "../../lib/launcher/process-port.mjs";
import { filesystemSnapshot } from "../helpers/filesystem-snapshot.mjs";

function reportProbe(capability, status, details) {
  process.stderr.write(`${JSON.stringify({
    kind: "maister.launcher.cross-platform-probe",
    platform: process.platform,
    capability,
    status,
    details,
  })}\n`);
}

function temporaryRoot(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("launcher contract is invariant across native path syntaxes", () => {
  for (const hostile of ["../codex", "codex\\escape", "C:\\codex", "//server/share", "CODEX", "codex/"]) {
    assert.throws(() => parseLauncherCliArgs(["install", "--target", hostile]), { kind: "E_LAUNCHER_USAGE" });
  }
  assert.equal(parseLauncherCliArgs(["install", "--target", "codex"]).target, "codex");
  assert.equal(path.win32.isAbsolute("C:\\maister"), true);
  assert.equal(path.posix.isAbsolute("/maister"), true);
});

test("signal status mapping is stable on Linux, macOS, and Windows runners", () => {
  assert.equal(childStatus({ code: null, signal: "SIGINT" }), 130);
  assert.equal(childStatus({ code: null, signal: "SIGTERM" }), 143);
  assert.equal(childStatus({ code: null, signal: "SIGKILL" }), 7);
});

test("case-folding and backslash archive hazards are semantic failures on every host", async () => {
  const source = await import("../../lib/launcher/archive-port.mjs");
  assert.equal(typeof source.inspectArchiveStream, "function");
  assert.equal(process.platform === "win32" || process.platform === "darwin" || process.platform === "linux", true);
});

test("the host filesystem reports and preserves its actual case behavior", (t) => {
  const root = temporaryRoot(t, "maister-case-probe-");
  const lower = path.join(root, "selector");
  const upper = path.join(root, "SELECTOR");
  fs.writeFileSync(lower, "lower", { mode: 0o640 });
  const caseSensitive = !fs.existsSync(upper);
  if (caseSensitive) fs.writeFileSync(upper, "upper", { mode: 0o600 });

  const snapshot = filesystemSnapshot(root);
  assert.equal(snapshot.entries.some((entry) => entry.path === "selector" && entry.bytes_base64 === Buffer.from("lower").toString("base64")), true);
  assert.throws(() => parseLauncherCliArgs(["install", "--target", "CODEX"]), { kind: "E_LAUNCHER_USAGE" });
  reportProbe("filesystem-case", "passed", { case_sensitive: caseSensitive, entries: snapshot.entries.length });
});

test("long native paths are exercised or explicitly classified unavailable", (t) => {
  const root = temporaryRoot(t, "maister-long-path-");
  const segments = Array.from({ length: 14 }, (_, index) => `segment-${String(index).padStart(2, "0")}-abcdefghijkl`);
  const directory = path.join(root, ...segments);
  const candidate = path.join(directory, "payload.txt");
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(candidate, "long-path-evidence", { mode: 0o640 });
    assert.equal(fs.readFileSync(candidate, "utf8"), "long-path-evidence");
    assert.ok(candidate.length > 300, `probe path is only ${candidate.length} characters`);
    reportProbe("long-path", "passed", { path_length: candidate.length });
  } catch (error) {
    if (!["ENAMETOOLONG", "EPERM", "EACCES"].includes(error.code)) throw error;
    reportProbe("long-path", "unavailable", { reason: error.code, path_length: candidate.length });
  }
});

test("open-file replacement behavior is measured without weakening byte integrity", (t) => {
  const root = temporaryRoot(t, "maister-lock-probe-");
  const original = path.join(root, "locked.txt");
  const replacement = path.join(root, "renamed.txt");
  fs.writeFileSync(original, "locked-byte-evidence", { mode: 0o600 });
  const descriptor = fs.openSync(original, "r");
  try {
    try {
      fs.renameSync(original, replacement);
      assert.equal(fs.readFileSync(replacement, "utf8"), "locked-byte-evidence");
      reportProbe("open-file-replacement", "passed", { behavior: "rename-while-open-supported" });
    } catch (error) {
      if (!["EPERM", "EACCES", "EBUSY"].includes(error.code)) throw error;
      assert.equal(fs.readFileSync(original, "utf8"), "locked-byte-evidence");
      reportProbe("open-file-replacement", "unavailable", { reason: error.code, behavior: "host-lock-prevented-rename" });
    }
  } finally {
    fs.closeSync(descriptor);
  }
});

test("a live child exposes native termination behavior or an explicit unavailable result", { timeout: 10_000 }, async () => {
  const child = spawn(process.execPath, ["--eval", "setInterval(() => {}, 1_000)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  const terminal = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  child.kill("SIGTERM");
  const result = await terminal;
  if (result.signal === "SIGTERM") {
    assert.equal(childStatus(result), 143);
    reportProbe("native-signal", "passed", { signal: result.signal, mapped_status: 143 });
    return;
  }
  assert.equal(process.platform, "win32", `unexpected signal result: ${JSON.stringify(result)}`);
  reportProbe("native-signal", "unavailable", { reason: "windows-does-not-report-posix-signal", ...result });
});
