import { probeHost } from "./base.mjs";

export function probeKiroCli(options = {}) {
  return probeHost({ ...options, target: "kiro-cli", command: "kiro-cli" });
}
