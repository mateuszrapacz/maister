import { runCodexInvocationScenario } from "./codex.mjs";

export function runKiroCliInvocationScenario(options = {}) {
  return runCodexInvocationScenario({ ...options, target: "kiro-cli" });
}
