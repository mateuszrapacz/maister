import { probeHost } from "./base.mjs";

export function probeCursor(options = {}) {
  return probeHost({ ...options, target: "cursor", command: "agent" });
}
