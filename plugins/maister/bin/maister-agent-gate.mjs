#!/usr/bin/env node

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { runProductionAgentGate } from "../skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs";

const MAX_INPUT_BYTES = 1024 * 1024;

function typedError(error) {
  return {
    code: typeof error?.code === "string" ? error.code : "E_AGENT_OWNER_INTERNAL",
    message: error instanceof Error ? error.message : String(error),
    retryable: error?.retryable === true,
    details: error?.details && typeof error.details === "object" ? error.details : {},
  };
}

export async function runCli({ input = fs.readFileSync(0), stdout = process.stdout } = {}) {
  try {
    const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
    if (bytes.length === 0 || bytes.length > MAX_INPUT_BYTES) throw Object.assign(new Error("agent-gate input must be between 1 byte and 1 MiB"), { code: "E_AGENT_OWNER_INPUT" });
    const request = JSON.parse(bytes.toString("utf8"));
    const result = await runProductionAgentGate(request);
    stdout.write(`${JSON.stringify({ schema_version: 1, status: "succeeded", result, error: null })}\n`);
    return 0;
  } catch (error) {
    const failure = typedError(error);
    stdout.write(`${JSON.stringify({ schema_version: 1, status: "failed", result: null, error: failure })}\n`);
    return 2;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) process.exitCode = await runCli();
