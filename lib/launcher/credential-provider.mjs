import { spawn } from "node:child_process";

export const GH_CREDENTIAL_REQUEST = Object.freeze({
  executable: "gh",
  argv: Object.freeze(["auth", "token", "--hostname", "github.com"]),
  shell: false,
  timeoutMs: 5_000,
  maxStdoutBytes: 16_384,
  maxStderrBytes: 8_192,
});

function credentialError(source) {
  const error = new Error(`GitHub API credential from ${source} is invalid`);
  error.kind = "E_LAUNCHER_CREDENTIAL_INVALID";
  error.details = Object.freeze({ source });
  return error;
}

function tokenFromLine(value, { trailingNewline }) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value ?? "");
  let tokenBytes = bytes;
  if (trailingNewline && tokenBytes.at(-1) === 0x0a) {
    tokenBytes = tokenBytes.subarray(0, tokenBytes.length - 1);
  }
  if (tokenBytes.length < 1 || tokenBytes.length > 4_096) return null;
  for (const byte of tokenBytes) {
    if (byte < 0x21 || byte > 0x7e) return null;
  }
  return tokenBytes.toString("ascii");
}

function appendBounded(chunks, value, currentBytes, maximumBytes, onOverflow) {
  const chunk = Buffer.from(value);
  if (currentBytes + chunk.length > maximumBytes) {
    onOverflow();
    return currentBytes;
  }
  chunks.push(chunk);
  return currentBytes + chunk.length;
}

export function createGhCommandRunner({
  spawnImpl = spawn,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
} = {}) {
  return function runGhCommand(request) {
    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawnImpl(request.executable, request.argv, {
          shell: request.shell,
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (cause) {
        reject(cause);
        return;
      }

      const stdout = [];
      const stderr = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let stdoutTruncated = false;
      let stderrTruncated = false;
      let timedOut = false;
      let settled = false;

      const kill = () => {
        if (!child.killed) child.kill("SIGKILL");
      };
      child.stdout?.on("data", (chunk) => {
        stdoutBytes = appendBounded(stdout, chunk, stdoutBytes, request.maxStdoutBytes, () => {
          stdoutTruncated = true;
          kill();
        });
      });
      child.stderr?.on("data", (chunk) => {
        stderrBytes = appendBounded(stderr, chunk, stderrBytes, request.maxStderrBytes, () => {
          stderrTruncated = true;
          kill();
        });
      });

      let timer;
      child.once("error", (cause) => {
        if (settled) return;
        settled = true;
        clearTimeoutImpl(timer);
        reject(cause);
      });
      child.once("close", (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeoutImpl(timer);
        resolve(Object.freeze({
          code,
          signal,
          stdout: Buffer.concat(stdout, stdoutBytes),
          stderr: Buffer.concat(stderr, stderrBytes),
          timedOut,
          stdoutTruncated,
          stderrTruncated,
        }));
      });
      timer = setTimeoutImpl(() => {
        timedOut = true;
        kill();
      }, request.timeoutMs);
    });
  };
}

export const runGhCommand = createGhCommandRunner();

function anonymous(commandStatus) {
  return Object.freeze({ kind: "anonymous", source: "none", commandStatus });
}

export async function resolveGitHubCredential({
  environment = process.env,
  runCommand = runGhCommand,
} = {}) {
  for (const source of ["GH_TOKEN", "GITHUB_TOKEN"]) {
    if (!Object.hasOwn(environment, source)) continue;
    const token = tokenFromLine(environment[source], { trailingNewline: false });
    if (token === null) throw credentialError(source);
    return Object.freeze({ kind: "authenticated", source, token });
  }

  let result;
  try {
    result = await runCommand({
      ...GH_CREDENTIAL_REQUEST,
      argv: [...GH_CREDENTIAL_REQUEST.argv],
    });
  } catch {
    return anonymous("unavailable");
  }

  if (result?.timedOut) return anonymous("timeout");
  if (result?.stdoutTruncated || result?.stderrTruncated) return anonymous("overflow");
  if (result?.signal !== null && result?.signal !== undefined) return anonymous("signaled");
  if (result?.code !== 0) return anonymous("nonzero");
  const token = tokenFromLine(result.stdout, { trailingNewline: true });
  if (token === null) return anonymous("malformed");
  return Object.freeze({ kind: "authenticated", source: "gh", token });
}
