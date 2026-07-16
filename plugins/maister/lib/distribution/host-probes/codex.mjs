import { probeHost } from "./base.mjs";

export function probeCodex(options = {}) {
  return probeHost({ ...options, target: "codex", command: "codex" });
}
