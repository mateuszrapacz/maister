import { spawnSync } from "node:child_process";

import { createEvidenceRecord } from "../evidence-schema.mjs";

export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_TIMEOUT_MS = 120_000;

export class HostProbeTimeoutError extends Error {
  constructor(command, args, timeoutMs, { cause, stdout = "", stderr = "", signal = null } = {}) {
    super(`[E_HOST_PROBE_TIMEOUT] host probe timed out after ${timeoutMs}ms: ${command}`, cause === undefined ? {} : { cause });
    this.name = "HostProbeTimeoutError";
    this.code = "E_HOST_PROBE_TIMEOUT";
    this.kind = this.code;
    this.details = {
      command,
      args,
      timeout_ms: timeoutMs,
      signal,
      stdout,
      stderr,
    };
    this.retryable = true;
  }
}

function assertTimeout(timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new TypeError(`timeoutMs must be an integer between 1 and ${MAX_TIMEOUT_MS}`);
  }
}

function timedOut(result) {
  return result?.timedOut === true
    || result?.error?.code === "ETIMEDOUT"
    || (result?.status === null && result?.signal !== null && result?.signal !== undefined);
}

function defaultRun(command, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  assertTimeout(timeoutMs);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    killSignal: "SIGTERM",
  });
  if (timedOut(result)) {
    throw new HostProbeTimeoutError(command, args, timeoutMs, {
      cause: result.error,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      signal: result.signal ?? null,
    });
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
    signal: result.signal ?? null,
  };
}

function versionFromOutput(output) {
  return output.match(/\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/u)?.[0] ?? "unknown";
}

export function probeHost({
  target,
  command,
  discoveryScenario = "native-discovery-v1",
  scenario = "native-runtime-v1",
  run = defaultRun,
  discover,
  invoke,
  manifest,
  runScenario,
  sourceCommit = "0".repeat(40),
  sourceVersion = "unknown",
  overlayVersion = "1.0.0",
  scenarioVersion = "1.0.0",
  now = new Date().toISOString(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  provenance: provenanceOverrides = {},
} = {}) {
  assertTimeout(timeoutMs);
  let versionResult;
  let timeoutError = null;
  try {
    versionResult = run(command, ["--version"], { timeoutMs });
  } catch (error) {
    if (error?.kind !== "E_HOST_PROBE_TIMEOUT") throw error;
    timeoutError = error instanceof HostProbeTimeoutError
      ? error
      : new HostProbeTimeoutError(command, ["--version"], timeoutMs, { cause: error });
    versionResult = { status: null, stdout: "", stderr: "", timedOut: true };
  }
  if (timedOut(versionResult) && !timeoutError) {
    timeoutError = new HostProbeTimeoutError(command, ["--version"], timeoutMs);
  }
  const executableMissing = versionResult.error?.code === "ENOENT";
  const available = timeoutError === null && versionResult.status === 0;
  const versionFailed = timeoutError !== null || (!available && !executableMissing);
  const hostVersion = available ? versionFromOutput(`${versionResult.stdout}\n${versionResult.stderr}`) : "unknown";
  const provenance = {
    source_commit: sourceCommit,
    source_version: sourceVersion,
    overlay_version: overlayVersion,
    scenario_version: scenarioVersion,
    command,
    ...provenanceOverrides,
  };
  const failureProvenance = timeoutError
    ? { ...provenance, reason: "timeout", timeout_ms: timeoutMs }
    : executableMissing
      ? { ...provenance, reason: "runtime-not-installed" }
      : versionFailed
        ? { ...provenance, reason: "version-command-failed" }
        : provenance;
  let discovery = { result: "unavailable", reason: "safe-adapter-not-configured" };
  let scenarioResult = { result: "unavailable", reason: "scenario-not-configured" };
  let discoveryFailure = null;
  let scenarioFailure = null;
  if (available && typeof discover === "function") {
    try {
      discovery = discover({ target, command, hostVersion, manifest, timeoutMs });
    } catch (error) {
      if (error?.kind !== "E_HOST_PROBE_TIMEOUT") throw error;
      discoveryFailure = error instanceof HostProbeTimeoutError
        ? error
        : new HostProbeTimeoutError(command, [discoveryScenario], timeoutMs, { cause: error });
      discovery = { result: "failed", reason: "timeout" };
    }
  }
  if (available && typeof invoke === "function" && typeof runScenario === "function") {
    try {
      scenarioResult = runScenario({ target, hostVersion, manifest, provenance, invoke, timeoutMs });
    } catch (error) {
      if (error?.kind !== "E_HOST_PROBE_TIMEOUT") throw error;
      scenarioFailure = error instanceof HostProbeTimeoutError
        ? error
        : new HostProbeTimeoutError(command, [scenario], timeoutMs, { cause: error });
      scenarioResult = { result: "failed", reason: "scenario-timeout" };
    }
  }
  const normalizedDiscovery = normalizeProbeOutcome(discovery, "discovery");
  const normalizedScenario = normalizeProbeOutcome(scenarioResult, "scenario");
  const discoveryProvenance = !available
    ? failureProvenance
    : discoveryFailure
      ? { ...provenance, reason: "timeout", timeout_ms: timeoutMs }
      : normalizedDiscovery.result === "passed"
        ? { ...provenance, ...normalizedDiscovery.provenance }
        : { ...provenance, ...normalizedDiscovery.provenance, reason: normalizedDiscovery.reason };
  const scenarioProvenance = !available
    ? failureProvenance
    : scenarioFailure
      ? { ...provenance, reason: "scenario-timeout", timeout_ms: timeoutMs }
      : { ...provenance, ...normalizedScenario.provenance, reason: normalizedScenario.result === "passed" ? undefined : normalizedScenario.reason };
  const records = [
    createEvidenceRecord({
      target,
      capability: "E5",
      hostVersion,
      scenario: discoveryScenario,
      result: versionFailed ? "failed" : available ? normalizedDiscovery.result : "unavailable",
      provenance: versionFailed ? failureProvenance : discoveryProvenance,
      timestamp: now,
    }),
    createEvidenceRecord({
      target,
      capability: "E6",
      hostVersion,
      scenario,
      result: versionFailed ? "failed" : available ? normalizedScenario.result : "unavailable",
      provenance: versionFailed ? failureProvenance : scenarioProvenance,
      timestamp: now,
    }),
  ];
  return {
    target,
    command,
    available,
    hostVersion,
    timeoutMs,
    records,
    error: timeoutError ?? scenarioFailure ?? (normalizedScenario.result === "passed" ? null : discoveryFailure),
  };
}

function normalizeProbeOutcome(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} probe must return an outcome mapping`);
  }
  if (!new Set(["passed", "failed", "unavailable"]).has(value.result)) {
    throw new TypeError(`${name} probe result must be passed, failed, or unavailable`);
  }
  if (value.result !== "passed" && (typeof value.reason !== "string" || value.reason.length === 0)) {
    throw new TypeError(`${name} probe non-pass outcome requires a reason`);
  }
  const provenance = value.provenance === undefined ? {} : value.provenance;
  if (provenance === null || typeof provenance !== "object" || Array.isArray(provenance)) {
    throw new TypeError(`${name} probe provenance must be a mapping`);
  }
  return { result: value.result, reason: value.reason, provenance };
}

export function expectedNativeInventory(manifest, target) {
  const rows = manifest?.rows;
  if (!Array.isArray(rows)) return null;
  const nativeIds = rows
    .filter((row) => row?.target === target)
    .map((row) => row?.native_role_external_id);
  if (nativeIds.length === 0 || nativeIds.some((id) => typeof id !== "string" || id.length === 0)) return null;
  return [...nativeIds].sort((left, right) => left.localeCompare(right, "en-US"));
}

export function compareNativeInventory({ manifest, target, observation } = {}) {
  if (!observation || typeof observation !== "object" || Array.isArray(observation) || observation.observable_identity === false) {
    return { result: "unavailable", reason: "observable-identity-unavailable" };
  }
  if (observation.safe_adapter === false) return { result: "unavailable", reason: "safe-adapter-unavailable" };
  const expected = expectedNativeInventory(manifest, target);
  if (!expected) return { result: "unavailable", reason: "manifest-discovery-subject-unavailable" };
  if (new Set(expected).size !== expected.length) return { result: "failed", reason: "native-inventory-collision" };
  if (!Array.isArray(observation.native_role_external_ids)) {
    return { result: "unavailable", reason: "observable-identity-unavailable" };
  }
  const observed = observation.native_role_external_ids;
  if (observed.some((id) => typeof id !== "string" || id.length === 0)) {
    return { result: "failed", reason: "native-inventory-mismatch" };
  }
  const normalized = [...observed].sort((left, right) => left.localeCompare(right, "en-US"));
  if (new Set(normalized).size !== normalized.length) return { result: "failed", reason: "native-inventory-collision" };
  if (normalized.length !== expected.length || normalized.some((id, index) => id !== expected[index])) {
    return { result: "failed", reason: "native-inventory-mismatch" };
  }
  return {
    result: "passed",
    provenance: { native_role_external_ids: normalized },
  };
}

export { defaultRun, versionFromOutput };
