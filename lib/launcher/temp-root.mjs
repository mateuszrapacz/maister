import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function identity(root) {
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Object.assign(new Error("launcher temporary root is not a private directory"), { kind: "E_LAUNCHER_TEMP_IDENTITY" });
  return Object.freeze({ realpath: fs.realpathSync.native(root), dev: stat.dev, ino: stat.ino });
}

export function createTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maister-launcher-"));
  fs.chmodSync(root, 0o700);
  const captured = identity(root);
  let cleaned = false;
  let retained = false;
  return Object.freeze({
    root,
    retain() { retained = true; return root; },
    cleanup() {
      if (cleaned || retained) return;
      const current = identity(root);
      if (current.realpath !== captured.realpath || current.dev !== captured.dev || current.ino !== captured.ino) {
        throw Object.assign(new Error("launcher temporary root identity changed; refusing cleanup"), { kind: "E_LAUNCHER_CLEANUP_IDENTITY", details: { root } });
      }
      fs.rmSync(root, { recursive: true, force: false });
      cleaned = true;
    },
  });
}
