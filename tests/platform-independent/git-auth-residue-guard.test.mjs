import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const guard = path.resolve("tests/release/assert-no-git-auth-residue.mjs");

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
}

function runGuard(cwd) {
  return spawnSync(process.execPath, [guard], { cwd, encoding: "utf8", windowsHide: true });
}

function repository() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "maister-git-auth-guard-"));
  git(cwd, ["init", "--quiet"]);
  return cwd;
}

test("Git auth residue guard accepts a clean local repository", (t) => {
  const cwd = repository();
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));

  const result = runGuard(cwd);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

for (const residue of [
  {
    name: "checkout authorization extraheader",
    key: "http.https://github.com/.extraheader",
    value: "AUTHORIZATION: basic cq102-secret-extraheader",
  },
  {
    name: "credential helper",
    key: "credential.helper",
    value: "!printf cq102-secret-helper",
  },
  {
    name: "token-bearing URL rewrite",
    key: "url.https://cq102-secret-token@github.com/.insteadOf",
    value: "https://github.com/",
  },
]) {
  test(`Git auth residue guard rejects ${residue.name} without leaking its value`, (t) => {
    const cwd = repository();
    t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
    git(cwd, ["config", "--local", residue.key, residue.value]);

    const result = runGuard(cwd);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    const diagnostics = `${result.stdout}\n${result.stderr}`;
    assert.doesNotMatch(diagnostics, /cq102-secret/u);
    assert.match(diagnostics, /E_PUBLIC_SMOKE_GIT_AUTH_RESIDUE/u);
  });
}

test("Git auth residue guard rejects worktree Git authentication configuration", (t) => {
  const cwd = repository();
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  git(cwd, ["config", "extensions.worktreeConfig", "true"]);
  git(cwd, ["config", "--worktree", "http.https://github.com/.extraheader", "AUTHORIZATION: basic cq102-worktree-secret"]);

  const result = runGuard(cwd);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  const diagnostics = `${result.stdout}\n${result.stderr}`;
  assert.doesNotMatch(diagnostics, /cq102-worktree-secret/u);
  assert.match(diagnostics, /E_PUBLIC_SMOKE_GIT_AUTH_RESIDUE/u);
});
