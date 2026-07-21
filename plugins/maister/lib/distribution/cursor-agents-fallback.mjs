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
 * Optional Cursor dual-write: copy plugin agents/*.md into home and cwd
 * `.cursor/agents/` after a successful primary plugin install/update.
 * Secondary to the plugin path — never for Codex/Pi/Kiro.
 *
 * Overwrites same-named leaves only after copying priors into
 * `<dest>/.maister-backup/`. Returns structured status (never throws for
 * expected I/O failures on optional destinations).
 */
export function maybeDualWriteCursorAgents({
  target,
  agentsFallback,
  activeRoot,
  home,
  cwd = process.cwd(),
} = {}) {
  if (agentsFallback !== true || target !== "cursor") {
    return { attempted: false, ok: true, copied: 0, destinations: [], backups: [], errors: [] };
  }

  const sourceDir = path.join(activeRoot, "agents");
  if (!fs.existsSync(sourceDir)) {
    return {
      attempted: true,
      ok: false,
      copied: 0,
      destinations: [],
      backups: [],
      errors: [{ destination: sourceDir, message: "plugin agents directory missing" }],
    };
  }

  const leaves = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  if (leaves.length === 0) {
    return {
      attempted: true,
      ok: false,
      copied: 0,
      destinations: [],
      backups: [],
      errors: [{ destination: sourceDir, message: "no agent markdown leaves to copy" }],
    };
  }

  const destinations = [];
  const backups = [];
  const errors = [];

  const homeAgents = path.join(home, ".cursor", "agents");
  try {
    backups.push(...copyAgentLeaves(sourceDir, homeAgents, leaves));
    destinations.push(homeAgents);
  } catch (error) {
    errors.push({ destination: homeAgents, message: error.message });
  }

  const cwdAgents = path.join(cwd, ".cursor", "agents");
  try {
    backups.push(...copyAgentLeaves(sourceDir, cwdAgents, leaves));
    destinations.push(cwdAgents);
  } catch (error) {
    errors.push({ destination: cwdAgents, message: error.message });
  }

  return {
    attempted: true,
    ok: errors.length === 0 && destinations.length > 0,
    copied: leaves.length * destinations.length,
    destinations,
    backups,
    errors,
  };
}
