export function createCodexExecAdapter({ workerManager } = {}) {
  if (!workerManager || typeof workerManager.run !== "function") {
    throw new TypeError("codex.exec adapter requires a managed Codex worker manager");
  }
  return async function codexExecAdapter({ plan, task } = {}) {
    return workerManager.run({ plan, task });
  };
}
