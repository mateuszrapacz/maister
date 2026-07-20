import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function mode(stat) {
  return (stat.mode & 0o7777).toString(8).padStart(4, "0");
}

export function filesystemSnapshot(root) {
  const rootStat = fs.lstatSync(root, { throwIfNoEntry: false });
  if (!rootStat) return Object.freeze({ exists: false, entries: Object.freeze([]) });
  const entries = [];
  function visit(current, relative) {
    const stat = fs.lstatSync(current);
    const common = { path: relative || ".", mode: mode(stat) };
    if (stat.isSymbolicLink()) {
      entries.push({ ...common, type: "symlink", target: fs.readlinkSync(current) });
      return;
    }
    if (stat.isFile()) {
      const bytes = fs.readFileSync(current);
      entries.push({
        ...common,
        type: "file",
        size: stat.size,
        bytes_base64: bytes.toString("base64"),
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      });
      return;
    }
    if (!stat.isDirectory()) {
      entries.push({ ...common, type: "unsupported" });
      return;
    }
    entries.push({ ...common, type: "directory" });
    for (const name of fs.readdirSync(current).sort()) visit(path.join(current, name), relative ? `${relative}/${name}` : name);
  }
  visit(root, "");
  const canonical = entries.map((entry) => JSON.stringify(entry)).join("\n");
  return Object.freeze({
    exists: true,
    entries: Object.freeze(entries.map(Object.freeze)),
    sha256: crypto.createHash("sha256").update(canonical).digest("hex"),
  });
}

export function filesystemSnapshotSet(candidates) {
  return Object.freeze([...new Set(candidates)].sort().map((candidate) => Object.freeze({
    path: candidate,
    snapshot: filesystemSnapshot(candidate),
  })));
}
