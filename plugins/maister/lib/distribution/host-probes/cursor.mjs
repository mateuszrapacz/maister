import { compareNativeInventory, probeHost } from "./base.mjs";
import { runCursorInvocationScenario } from "./scenarios/cursor.mjs";

export function probeCursor(options = {}) {
  return probeHost({
    ...options,
    target: "cursor",
    command: "agent",
    discoveryScenario: "cursor-native-inventory-v1",
    scenario: "cursor-native-invocation-v1",
    discover: typeof options.discover === "function"
      ? (context) => compareNativeInventory({ manifest: context.manifest, target: "cursor", observation: options.discover(context) })
      : undefined,
    runScenario: runCursorInvocationScenario,
  });
}
