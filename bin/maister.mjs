#!/usr/bin/env node

import { EXIT_CODES, parseLauncherCliArgs } from "../plugins/maister/lib/distribution/cli-contract.mjs";
import { readPackageMetadata } from "../lib/launcher/package-contract.mjs";
import { runLauncher } from "../lib/launcher/orchestrator.mjs";

function launcherError(error, options = null, packageMetadata = null) {
  const json = options?.json === true;
  const kind = error?.kind ?? "E_LAUNCHER_INTERNAL";
  const phase = kind.startsWith("E_LAUNCHER_TRANSPORT") || kind.startsWith("E_LAUNCHER_RELEASE") ? "acquire"
    : kind.startsWith("E_LAUNCHER_ARCHIVE") || kind.startsWith("E_LAUNCHER_DIGEST") || kind.startsWith("E_LAUNCHER_E3") || kind.startsWith("E_LAUNCHER_EXTRACTED") ? "verify"
      : kind.startsWith("E_OFFLINE_AUTHORITY") ? "delegate"
        : kind.startsWith("E_LAUNCHER_USAGE") || kind.startsWith("E_LAUNCHER_PACKAGE") ? "contract" : "delegate";
  const payload = {
    schema_version: 1,
    namespace: "maister.launcher",
    ok: false,
    phase,
    error: {
      kind,
      message: error?.message ?? "launcher failed",
      retryable: kind === "E_LAUNCHER_TRANSPORT_DEADLINE" || kind === "E_LAUNCHER_TRANSPORT_RETRYABLE",
      details: error?.details ?? {},
    },
    command: options?.command ?? null,
    target: options?.target ?? null,
    requested_version: options?.requestedVersion ?? packageMetadata?.version ?? null,
    resolved_version: packageMetadata?.version ?? null,
    asset: null,
    receipt_path: null,
    journal_path: null,
  };
  process.stderr.write(json ? `${JSON.stringify(payload)}\n` : `maister: ${payload.error.message} (${payload.error.kind})\n`);
}

let options = null;
let packageMetadata = null;
try {
  options = parseLauncherCliArgs(process.argv.slice(2));
  packageMetadata = readPackageMetadata();
  const onChildSignal = (signal) => {
    if (process.platform !== "win32" && ["SIGINT", "SIGTERM"].includes(signal)) {
      setImmediate(() => process.kill(process.pid, signal));
    }
  };
  process.exitCode = await runLauncher(options, packageMetadata, { stdout: process.stdout, stderr: process.stderr, onChildSignal });
} catch (error) {
  launcherError(error, options, packageMetadata);
  const kind = error?.kind ?? "";
  process.exitCode = kind === "E_LAUNCHER_USAGE" || kind.startsWith("E_LAUNCHER_PACKAGE") ? EXIT_CODES.usage
    : kind.startsWith("E_LAUNCHER_TRANSPORT") || kind.startsWith("E_LAUNCHER_RELEASE") ? EXIT_CODES.source
      : kind.startsWith("E_LAUNCHER_ARCHIVE") || kind.startsWith("E_LAUNCHER_DIGEST") || kind.startsWith("E_LAUNCHER_E3") || kind.startsWith("E_LAUNCHER_EXTRACTED") || kind.startsWith("E_LAUNCHER_SOURCE") || kind.startsWith("E_OFFLINE_AUTHORITY") ? EXIT_CODES.validation
        : EXIT_CODES.transaction;
}
