import { spawn } from "node:child_process";

const DEFAULT_CAPTURE_BYTES = 1024 * 1024;
const DEFAULT_KILL_GRACE_MS = 2_000;

function appendBounded(chunks, chunk, state, maximumBytes) {
  if (state.bytes >= maximumBytes) {
    if (chunk.length > 0) state.truncated = true;
    return;
  }
  const remaining = maximumBytes - state.bytes;
  const captured = chunk.subarray(0, remaining);
  chunks.push(captured);
  state.bytes += captured.length;
  if (captured.length !== chunk.length) state.truncated = true;
}

function terminalClassification(code, signal, timeoutClassification) {
  if (timeoutClassification) return timeoutClassification;
  if (code === 0 && signal === null) return "passed";
  return "failed";
}

export function runWithExternalWatchdog({
  command,
  args = [],
  cwd,
  env = process.env,
  heartbeatKind,
  heartbeatDeadlineMs = null,
  supervisorHeartbeatMs = null,
  totalDeadlineMs,
  killGraceMs = DEFAULT_KILL_GRACE_MS,
  maximumCaptureBytes = DEFAULT_CAPTURE_BYTES,
  onRecord = () => {},
  onSupervisorHeartbeat = () => {},
  onStdout = () => {},
  onStderr = () => {},
}) {
  if (!command || totalDeadlineMs <= 0 || (heartbeatDeadlineMs !== null && (!heartbeatKind || heartbeatDeadlineMs <= 0)) || (supervisorHeartbeatMs !== null && (!heartbeatKind || supervisorHeartbeatMs <= 0))) {
    throw new TypeError("external watchdog requires a command, a positive total deadline, and valid heartbeat configuration");
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let lastHeartbeatAt = startedAt;
    let timeoutClassification = null;
    let stdoutLineBuffer = "";
    let stderrLineBuffer = "";
    let forceKillTimer;
    const stdoutChunks = [];
    const stderrChunks = [];
    const stdoutState = { bytes: 0, truncated: false };
    const stderrState = { bytes: 0, truncated: false };
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    function requestTermination(classification) {
      if (timeoutClassification || child.exitCode !== null || child.signalCode !== null) return;
      timeoutClassification = classification;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), killGraceMs);
      forceKillTimer.unref();
    }

    function consumeRecords(text, lineBuffer, flush = false) {
      const lines = `${lineBuffer}${text}`.split("\n");
      const remainder = flush ? "" : (lines.pop() ?? "");
      for (const line of lines) {
        if (!line) continue;
        try {
          const record = JSON.parse(line);
          if (record?.kind === heartbeatKind) lastHeartbeatAt = Date.now();
          onRecord(record);
        } catch {
          // Human-readable child diagnostics are forwarded but are not watchdog records.
        }
      }
      return remainder;
    }

    const heartbeatPoll = heartbeatDeadlineMs === null ? null : setInterval(() => {
      if (Date.now() - lastHeartbeatAt > heartbeatDeadlineMs) requestTermination("heartbeat-timeout");
    }, Math.max(10, Math.min(1_000, Math.floor(heartbeatDeadlineMs / 4))));
    heartbeatPoll?.unref();

    const supervisorHeartbeat = supervisorHeartbeatMs === null ? null : setInterval(() => {
      onSupervisorHeartbeat(Object.freeze({
        kind: heartbeatKind,
        source: "external-parent",
        elapsed_ms: Date.now() - startedAt,
        child_pid: child.pid,
      }));
    }, supervisorHeartbeatMs);
    supervisorHeartbeat?.unref();

    const totalDeadline = setTimeout(() => requestTermination("harness-timeout"), totalDeadlineMs);
    totalDeadline.unref();

    child.stdout.on("data", (chunk) => {
      const bytes = Buffer.from(chunk);
      appendBounded(stdoutChunks, bytes, stdoutState, maximumCaptureBytes);
      onStdout(bytes);
      stdoutLineBuffer = consumeRecords(bytes.toString("utf8"), stdoutLineBuffer);
    });
    child.stderr.on("data", (chunk) => {
      const bytes = Buffer.from(chunk);
      appendBounded(stderrChunks, bytes, stderrState, maximumCaptureBytes);
      onStderr(bytes);
      stderrLineBuffer = consumeRecords(bytes.toString("utf8"), stderrLineBuffer);
    });

    child.once("error", (error) => {
      clearInterval(heartbeatPoll);
      clearInterval(supervisorHeartbeat);
      clearTimeout(totalDeadline);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearInterval(heartbeatPoll);
      clearInterval(supervisorHeartbeat);
      clearTimeout(totalDeadline);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      consumeRecords("", stdoutLineBuffer, true);
      consumeRecords("", stderrLineBuffer, true);
      resolve(Object.freeze({
        classification: terminalClassification(code, signal, timeoutClassification),
        code,
        signal,
        timedOut: timeoutClassification !== null,
        elapsedMs: Date.now() - startedAt,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        stdoutTruncated: stdoutState.truncated,
        stderrTruncated: stderrState.truncated,
      }));
    });
  });
}
