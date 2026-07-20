import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FAILURE = "E_PUBLIC_SMOKE_GIT_AUTH_RESIDUE: checkout-local Git authentication residue is present or could not be ruled out";

function isAuthenticationKey(rawName) {
  const name = rawName.toLowerCase();
  return name === "core.askpass"
    || name.startsWith("credential.")
    || /^http\..*\.(?:cookiefile|extraheader|proxyauthmethod|proxyauthorization|savecookies|sslcert|sslkey)$/u.test(name)
    || /^url\..*\.insteadof$/u.test(name)
    || name === "include.path"
    || /^includeif\..*\.path$/u.test(name);
}

function hasUrlUserInfo(value) {
  return /^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]*@/iu.test(value);
}

function readConfiguration(scope) {
  const result = spawnSync("git", ["config", scope, "--null", "--list"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || result.signal !== null) throw new Error(FAILURE);

  return result.stdout.split("\0").filter(Boolean).map((record) => {
    const separator = record.indexOf("\n");
    if (separator <= 0) throw new Error(FAILURE);
    return Object.freeze({ name: record.slice(0, separator), value: record.slice(separator + 1) });
  });
}

function localConfiguration() {
  const records = readConfiguration("--local");
  const worktreePath = spawnSync("git", ["rev-parse", "--git-path", "config.worktree"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (worktreePath.error || worktreePath.status !== 0) throw new Error(FAILURE);
  const candidate = worktreePath.stdout.trim();
  if (candidate && fs.existsSync(path.resolve(candidate))) records.push(...readConfiguration("--worktree"));
  return records;
}

try {
  const residue = localConfiguration().some(({ name, value }) => isAuthenticationKey(name) || hasUrlUserInfo(value));
  if (residue) throw new Error(FAILURE);
  process.stdout.write("Checkout-local Git authentication residue check passed.\n");
} catch {
  process.stderr.write(`${FAILURE}\n`);
  process.exitCode = 1;
}
