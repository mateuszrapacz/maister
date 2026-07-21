import { runCodexInvocationScenario } from "./codex.mjs";

// Pi's public delegation bridge supplies the same role-bound evidence shape as
// the other native adapters.  The Pi-specific probe is responsible for the
// host tuple and public protocol; this scenario keeps the role behavior and
// provenance checks in the shared scenario implementation.
export function runPiInvocationScenario(options = {}) {
  return runCodexInvocationScenario({ ...options, target: "pi" });
}

