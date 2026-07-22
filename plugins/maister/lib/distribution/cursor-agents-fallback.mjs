import fs from "node:fs";
import path from "node:path";

function backupExistingLeaf(destinationPath, backupRoot) {
  if (!fs.existsSync(destinationPath)) return null;
  fs.mkdirSync(backupRoot, { recursive: true });
  const backupPath = path.join(backupRoot, path.basename(destinationPath));
  fs.copyFileSync(destinationPath, backupPath);
  return backupPath;
}

function copyAgentLeaves(sourceDir, destination, leaves, { backup = true } = {}) {
  fs.mkdirSync(destination, { recursive: true });
  const backupRoot = path.join(destination, ".maister-backup");
  const backups = [];
  for (const name of leaves) {
    const destPath = path.join(destination, name);
    if (backup && fs.existsSync(destPath)) {
      const backupPath = backupExistingLeaf(destPath, backupRoot);
      if (backupPath) backups.push(backupPath);
    }
    fs.copyFileSync(path.join(sourceDir, name), destPath);
  }
  return backups;
}

/**
 * Derive prune allowlist by stripping leading `maister-` from copied plugin
 * leaf basenames matching `^maister-.+\.md$` (M3). Never delete arbitrary
 * non-maister leaves.
 */
function shortLeafAllowlistFromPrefixed(leaves) {
  const allowlist = [];
  for (const name of leaves) {
    if (!/^maister-.+\.md$/.test(name)) continue;
    allowlist.push(name.slice("maister-".length));
  }
  return allowlist;
}

/**
 * H1: backup allowlisted short leaves into `<dest>/.maister-backup/` then unlink.
 */
function pruneAllowlistedShortLeaves(destination, allowlist) {
  const backupRoot = path.join(destination, ".maister-backup");
  const backups = [];
  const pruned = [];
  for (const shortName of allowlist) {
    if (path.basename(shortName) !== shortName || shortName.includes("..") || shortName.includes("/") || shortName.includes("\\")) {
      continue;
    }
    const shortPath = path.join(destination, shortName);
    if (!fs.existsSync(shortPath)) continue;
    const backupPath = backupExistingLeaf(shortPath, backupRoot);
    if (backupPath) backups.push(backupPath);
    fs.unlinkSync(shortPath);
    pruned.push(shortName);
  }
  return { backups, pruned };
}

function emptyDualWriteStatus(overrides = {}) {
  return {
    attempted: false,
    ok: true,
    copied: 0,
    destinations: [],
    backups: [],
    pruned: [],
    errors: [],
    ...overrides,
  };
}

/**
 * Optional Cursor dual-write: copy plugin agents/*.md into home and cwd
 * `.cursor/agents/` after a successful primary plugin install/update.
 * Secondary to the plugin path — never for Codex/Pi/Kiro.
 *
 * Overwrites same-named leaves only after copying priors into
 * `<dest>/.maister-backup/`. After a successful copy, prunes allowlisted
 * short leaves (strip-`maister-` from copied prefixed basenames) with the
 * same backup-then-unlink contract. Returns structured status (never throws
 * for expected I/O failures on optional destinations).
 */
export function maybeDualWriteCursorAgents({
  target,
  agentsFallback,
  activeRoot,
  home,
  cwd = process.cwd(),
} = {}) {
  if (agentsFallback !== true || target !== "cursor") {
    return emptyDualWriteStatus();
  }

  const sourceDir = path.join(activeRoot, "agents");
  if (!fs.existsSync(sourceDir)) {
    return emptyDualWriteStatus({
      attempted: true,
      ok: false,
      errors: [{ destination: sourceDir, message: "plugin agents directory missing" }],
    });
  }

  const leaves = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  if (leaves.length === 0) {
    return emptyDualWriteStatus({
      attempted: true,
      ok: false,
      errors: [{ destination: sourceDir, message: "no agent markdown leaves to copy" }],
    });
  }

  const allowlist = shortLeafAllowlistFromPrefixed(leaves);
  const destinations = [];
  const backups = [];
  const pruned = [];
  const errors = [];

  const dualWriteInto = (destination) => {
    backups.push(...copyAgentLeaves(sourceDir, destination, leaves));
    const pruneResult = pruneAllowlistedShortLeaves(destination, allowlist);
    backups.push(...pruneResult.backups);
    pruned.push(...pruneResult.pruned);
    destinations.push(destination);
  };

  const homeAgents = path.join(home, ".cursor", "agents");
  try {
    dualWriteInto(homeAgents);
  } catch (error) {
    errors.push({ destination: homeAgents, message: error.message });
  }

  const cwdAgents = path.join(cwd, ".cursor", "agents");
  try {
    dualWriteInto(cwdAgents);
  } catch (error) {
    errors.push({ destination: cwdAgents, message: error.message });
  }

  return {
    attempted: true,
    ok: errors.length === 0 && destinations.length > 0,
    copied: leaves.length * destinations.length,
    destinations,
    backups,
    pruned,
    errors,
  };
}
