import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  GH_CREDENTIAL_REQUEST,
  createGhCommandRunner,
  resolveGitHubCredential,
} from "../../lib/launcher/credential-provider.mjs";

function commandResult(overrides = {}) {
  return {
    code: 0,
    signal: null,
    stdout: Buffer.from("gh-command-token\n"),
    stderr: Buffer.alloc(0),
    timedOut: false,
    stdoutTruncated: false,
    stderrTruncated: false,
    ...overrides,
  };
}

test("GH_TOKEN takes precedence over GITHUB_TOKEN without invoking gh", async () => {
  let commandCalls = 0;
  const credential = await resolveGitHubCredential({
    environment: { GH_TOKEN: "gh-token", GITHUB_TOKEN: "github-token" },
    async runCommand() {
      commandCalls += 1;
      return commandResult();
    },
  });

  assert.deepEqual(credential, {
    kind: "authenticated",
    source: "GH_TOKEN",
    token: "gh-token",
  });
  assert.equal(commandCalls, 0);
});

test("GITHUB_TOKEN is used only when GH_TOKEN is absent", async () => {
  const credential = await resolveGitHubCredential({
    environment: { GITHUB_TOKEN: "github-token" },
    async runCommand() {
      throw new Error("gh must not run");
    },
  });

  assert.deepEqual(credential, {
    kind: "authenticated",
    source: "GITHUB_TOKEN",
    token: "github-token",
  });
});

test("a present malformed explicit token fails closed without falling through", async () => {
  const secret = "malformed token";
  let commandCalls = 0;
  await assert.rejects(resolveGitHubCredential({
    environment: { GH_TOKEN: secret, GITHUB_TOKEN: "valid-lower-precedence-token" },
    async runCommand() {
      commandCalls += 1;
      return commandResult();
    },
  }), (error) => {
    assert.equal(error.kind, "E_LAUNCHER_CREDENTIAL_INVALID");
    assert.doesNotMatch(error.message, new RegExp(secret, "u"));
    assert.doesNotMatch(JSON.stringify(error.details), new RegExp(secret, "u"));
    return true;
  });
  assert.equal(commandCalls, 0);

  await assert.rejects(resolveGitHubCredential({
    environment: { GH_TOKEN: "", GITHUB_TOKEN: "valid-lower-precedence-token" },
  }), { kind: "E_LAUNCHER_CREDENTIAL_INVALID" });
});

test("explicit tokens accept only 1-4096 printable non-whitespace ASCII bytes", async () => {
  assert.equal((await resolveGitHubCredential({ environment: { GH_TOKEN: "x" } })).token, "x");
  assert.equal((await resolveGitHubCredential({ environment: { GH_TOKEN: "x".repeat(4096) } })).token.length, 4096);

  for (const token of ["x".repeat(4097), "line\n", "tab\t", "non-ascii-é", "control\u001f"]) {
    await assert.rejects(resolveGitHubCredential({ environment: { GH_TOKEN: token } }), {
      kind: "E_LAUNCHER_CREDENTIAL_INVALID",
    });
  }
});

test("gh fallback receives the exact bounded non-shell request", async () => {
  const requests = [];
  const credential = await resolveGitHubCredential({
    environment: {},
    async runCommand(request) {
      requests.push(request);
      return commandResult();
    },
  });

  assert.deepEqual(requests, [{
    executable: "gh",
    argv: ["auth", "token", "--hostname", "github.com"],
    shell: false,
    timeoutMs: 5_000,
    maxStdoutBytes: 16_384,
    maxStderrBytes: 8_192,
  }]);
  assert.deepEqual(GH_CREDENTIAL_REQUEST, {
    executable: "gh",
    argv: ["auth", "token", "--hostname", "github.com"],
    shell: false,
    timeoutMs: 5_000,
    maxStdoutBytes: 16_384,
    maxStderrBytes: 8_192,
  });
  assert.deepEqual(credential, {
    kind: "authenticated",
    source: "gh",
    token: "gh-command-token",
  });
});

test("gh output permits at most one trailing newline", async () => {
  for (const stdout of [Buffer.from("token"), Buffer.from("token\n")]) {
    const credential = await resolveGitHubCredential({
      environment: {},
      async runCommand() { return commandResult({ stdout }); },
    });
    assert.equal(credential.token, "token");
  }

  for (const stdout of [Buffer.from("token\n\n"), Buffer.from("token\r\n"), Buffer.from("two lines\nnext")]) {
    const credential = await resolveGitHubCredential({
      environment: {},
      async runCommand() { return commandResult({ stdout }); },
    });
    assert.deepEqual(credential, {
      kind: "anonymous",
      source: "none",
      commandStatus: "malformed",
    });
  }
});

test("all gh command failures fall back anonymously with redacted status only", async () => {
  const secret = "command-secret";
  const cases = [
    ["unavailable", async () => { throw Object.assign(new Error(`spawn failed ${secret}`), { code: "ENOENT" }); }],
    ["nonzero", async () => commandResult({ code: 1, stdout: Buffer.alloc(0), stderr: Buffer.from(secret) })],
    ["signaled", async () => commandResult({ code: null, signal: "SIGTERM", stdout: Buffer.alloc(0) })],
    ["timeout", async () => commandResult({ code: null, signal: "SIGKILL", stdout: Buffer.alloc(0), timedOut: true })],
    ["overflow", async () => commandResult({ code: null, signal: "SIGKILL", stdoutTruncated: true })],
    ["malformed", async () => commandResult({ stdout: Buffer.from("bad token") })],
  ];

  for (const [commandStatus, runCommand] of cases) {
    const credential = await resolveGitHubCredential({ environment: {}, runCommand });
    assert.deepEqual(credential, { kind: "anonymous", source: "none", commandStatus });
    assert.doesNotMatch(JSON.stringify(credential), new RegExp(secret, "u"));
  }
});

test("the production gh runner kills and awaits the child after timeout", async () => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  let closeObserved = false;
  child.kill = (signal) => {
    assert.equal(signal, "SIGKILL");
    child.killed = true;
    queueMicrotask(() => {
      closeObserved = true;
      child.emit("close", null, "SIGKILL");
    });
    return true;
  };

  const runner = createGhCommandRunner({
    spawnImpl(executable, argv, options) {
      assert.equal(executable, "gh");
      assert.deepEqual(argv, ["auth", "token", "--hostname", "github.com"]);
      assert.equal(options.shell, false);
      return child;
    },
    setTimeoutImpl(callback, milliseconds) {
      assert.equal(milliseconds, 5_000);
      queueMicrotask(callback);
      return 1;
    },
    clearTimeoutImpl() {},
  });

  const result = await runner({ ...GH_CREDENTIAL_REQUEST, argv: [...GH_CREDENTIAL_REQUEST.argv] });
  assert.equal(closeObserved, true);
  assert.equal(result.timedOut, true);
  assert.equal(result.signal, "SIGKILL");
});
