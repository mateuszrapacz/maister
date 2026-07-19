import { runCodexInvocationScenario } from "./codex.mjs";

export function runCursorInvocationScenario(options = {}) {
  return runCodexInvocationScenario({ ...options, target: "cursor" });
}
