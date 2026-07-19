import { probeHost } from "./base.mjs";
import { runCodexInvocationScenario } from "./scenarios/codex.mjs";

const REQUIRED_CONTROLS = Object.freeze([
  "working_root",
  "model",
  "reasoning_effort",
  "sandbox",
  "jsonl",
  "output_schema",
  "last_message",
  "ignore_user_config",
]);

function inspectCodexDiscovery(discover) {
  return (context) => {
    const observation = discover(context);
    if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
      return { result: "unavailable", reason: "safe-adapter-unavailable" };
    }
    if (observation.adapter_id !== "codex.exec") return { result: "failed", reason: "wrong-adapter-identity" };
    if (observation.authentication !== true) return { result: "unavailable", reason: "authentication-unavailable" };
    if (observation.allowed_version !== true) return { result: "unavailable", reason: "allowed-version-unavailable" };
    if (!observation.controls || typeof observation.controls !== "object") {
      return { result: "unavailable", reason: "required-control-unavailable" };
    }
    if (REQUIRED_CONTROLS.some((control) => observation.controls[control] !== true)) {
      return { result: "unavailable", reason: "required-control-unavailable" };
    }
    return { result: "passed", provenance: { discovery_subject: "codex.exec" } };
  };
}

export function probeCodex(options = {}) {
  return probeHost({
    ...options,
    target: "codex",
    command: "codex",
    discoveryScenario: "codex-exec-discovery-v1",
    scenario: "codex-exec-invocation-v1",
    discover: typeof options.discover === "function" ? inspectCodexDiscovery(options.discover) : undefined,
    runScenario: runCodexInvocationScenario,
  });
}
