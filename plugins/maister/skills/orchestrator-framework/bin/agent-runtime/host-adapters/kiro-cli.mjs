import { createExactNativeAdapter } from "./exact-native.mjs";

export function createKiroCliAdapter(options = {}) {
  return createExactNativeAdapter({ ...options, adapterId: "kiro-cli.native", target: "kiro-cli" });
}
