import { resolveAgent } from "./agent-resolver.mjs";
import { createCodexExecCapabilityInspector } from "./codex-exec-capabilities.mjs";
import { createCodexWorkerManager } from "./codex-worker-manager.mjs";
import { createDispatchTaskPreparer } from "./dispatch-task-preparer.mjs";
import { dispatchAgent } from "./dispatch-agent.mjs";
import { appendExecutionEvent, readExecutionEventStream } from "./execution-event-writer.mjs";
import { createHostAdapters } from "./host-adapters/index.mjs";
import { createNodeProcessPort } from "./node-process-port.mjs";

export function createAgentRuntime({
  target,
  manifest,
  projection,
  paths,
  resolverHooks,
  capabilityPort,
  nativePorts = {},
  workingRoot = process.cwd(),
  processPort = createNodeProcessPort(),
  eventPort = { append: appendExecutionEvent },
  clock,
} = {}) {
  if (target === "codex" && (!capabilityPort || typeof capabilityPort.inspect !== "function")) throw new TypeError("Codex runtime requires a verified capability port");
  const capabilityInspector = target === "codex" ? createCodexExecCapabilityInspector({ port: capabilityPort }) : null;
  const workerManager = target === "codex" ? createCodexWorkerManager({ processPort, eventPort, capabilityInspector, clock }) : null;
  const adapters = createHostAdapters({
    codex: workerManager ? { workerManager } : undefined,
    cursor: { nativePort: nativePorts.cursor, eventPort, clock },
    kiroCli: { nativePort: nativePorts.kiroCli, eventPort, clock },
  });
  const taskPreparer = createDispatchTaskPreparer({ projection, workingRoot });
  return Object.freeze({
    resolveAgent: ({ logical_role_id, dispatch_id }) => resolveAgent({ logical_role_id, dispatch_id, target, manifest, projection, paths, hooks: resolverHooks }),
    async dispatchAgent({ plan, task }) {
      const preparedTask = taskPreparer.prepare({ plan, task });
      return dispatchAgent({ plan, task: preparedTask, adapters });
    },
    readExecutionEventStream,
  });
}
