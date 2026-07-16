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
    || (result?.status === null && result?.signal !== undefined);
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
  scenario = "native-runtime-v1",
  run = defaultRun,
  scenarioProbe,
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
  let scenarioResult = "unavailable";
  let scenarioFailure = null;
  if (available && typeof scenarioProbe === "function") {
    try {
      scenarioResult = scenarioProbe() === true ? "passed" : "failed";
    } catch (error) {
      if (error?.kind !== "E_HOST_PROBE_TIMEOUT") throw error;
      scenarioFailure = error instanceof HostProbeTimeoutError
        ? error
        : new HostProbeTimeoutError(command, [scenario], timeoutMs, { cause: error });
      scenarioResult = "failed";
    }
  }
  const scenarioProvenance = scenarioFailure
    ? { ...provenance, reason: "timeout", timeout_ms: timeoutMs }
    : available && typeof scenarioProbe === "function"
      ? provenance
      : { ...failureProvenance, reason: available ? "scenario-not-configured" : failureProvenance.reason };
  const records = [
    createEvidenceRecord({
      target,
      capability: "E5",
      hostVersion,
      scenario: "native-discovery-v1",
      result: versionFailed ? "failed" : available ? "passed" : "unavailable",
      provenance: failureProvenance,
      timestamp: now,
    }),
    createEvidenceRecord({
      target,
      capability: "E6",
      hostVersion,
      scenario,
      result: versionFailed ? "failed" : scenarioResult,
      provenance: scenarioProvenance,
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
    error: timeoutError ?? scenarioFailure,
  };
}

export { defaultRun, versionFromOutput };
