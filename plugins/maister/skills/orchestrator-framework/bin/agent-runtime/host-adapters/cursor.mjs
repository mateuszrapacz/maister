import { createExactNativeAdapter } from "./exact-native.mjs";

export function createCursorAdapter(options = {}) {
  return createExactNativeAdapter({ ...options, adapterId: "cursor.native", target: "cursor" });
}
