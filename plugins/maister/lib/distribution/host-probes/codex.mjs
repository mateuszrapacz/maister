import { HostProbeTimeoutError, probeHost } from "./base.mjs";
import { runCodexInvocationScenario } from "./scenarios/codex.mjs";
import {
  createCodexExecCapabilityPort,
  createCodexExecInvocationPort,
} from "../bridges/codex-bridge-v1.mjs";
import {
  REQUIRED_CODEX_EXEC_CONTROLS,
  validateCodexCapabilityObservation,
} from "../../../skills/orchestrator-framework/bin/agent-runtime/codex-exec-capabilities.mjs";

function inspectCodexDiscovery(capabilityPort) {
  return (context) => {
    let observation;
    try {
      observation = capabilityPort.inspect({ schema_version: 1, adapter_id: "codex.exec" });
      if (observation && typeof observation.then === "function") return { result: "unavailable", reason: "async-adapter-unavailable" };
      observation = validateCodexCapabilityObservation(observation);
    } catch (error) {
      if (error instanceof HostProbeTimeoutError || error?.kind === "E_HOST_PROBE_TIMEOUT") throw error;
      return { result: "unavailable", reason: "safe-adapter-unavailable" };
    }
    if (!observation.executable.available || observation.executable.path === null) return { result: "unavailable", reason: "executable-unavailable" };
    if (!observation.authentication.available || !observation.authentication.authenticated) return { result: "unavailable", reason: "authentication-unavailable" };
    if (!observation.version.allowed || observation.version.value !== context.hostVersion) return { result: "unavailable", reason: "allowed-version-unavailable" };
    if (REQUIRED_CODEX_EXEC_CONTROLS.some((control) => observation.controls[control] !== true)) return { result: "unavailable", reason: "required-control-unavailable" };
    if (!observation.model.available || !observation.model.supported) return { result: "unavailable", reason: "model-unavailable" };
    if (!observation.reasoning.available || !observation.reasoning.supported) return { result: "unavailable", reason: "reasoning-unavailable" };
    return { result: "passed", provenance: { discovery_subject: "codex.exec" } };
  };
}

export function probeCodex(options = {}) {
  if (Object.hasOwn(options, "discover")) throw new TypeError("Codex E5 requires the canonical capability_port.inspect seam");
  const capabilityPort = options.capabilityPort ?? createCodexExecCapabilityPort({
    home: options.home,
    command: options.command,
    env: options.env,
    cwd: options.cwd,
    timeoutMs: options.timeoutMs,
    run: options.run,
  });
  if (!capabilityPort || typeof capabilityPort.inspect !== "function") throw new TypeError("Codex E5 requires a capability_port.inspect function");
  const invoke = Object.hasOwn(options, "invoke")
    ? options.invoke
    : createCodexExecInvocationPort({
      home: options.home,
      command: options.command,
      env: options.env,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs ?? 120_000,
      run: options.run,
    }).invoke;
  return probeHost({
    ...options,
    target: "codex",
    command: options.command ?? "codex",
    discoveryScenario: "codex-exec-discovery-v1",
    scenario: "codex-exec-invocation-v1",
    discover: inspectCodexDiscovery(capabilityPort),
    runScenario: runCodexInvocationScenario,
    invoke,
  });
}
