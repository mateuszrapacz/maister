import { compareNativeInventory, probeHost } from "./base.mjs";
import { runKiroCliInvocationScenario } from "./scenarios/kiro-cli.mjs";

export function probeKiroCli(options = {}) {
  return probeHost({
    ...options,
    target: "kiro-cli",
    command: "kiro-cli",
    discoveryScenario: "kiro-cli-native-inventory-v1",
    scenario: "kiro-cli-native-invocation-v1",
    discover: typeof options.discover === "function"
      ? (context) => compareNativeInventory({ manifest: context.manifest, target: "kiro-cli", observation: options.discover(context) })
      : undefined,
    runScenario: runKiroCliInvocationScenario,
  });
}
