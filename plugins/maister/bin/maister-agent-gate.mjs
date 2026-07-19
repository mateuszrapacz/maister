#!/usr/bin/env node

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { runProductionAgentGate } from "../skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs";

const MAX_INPUT_BYTES = 1024 * 1024;

function ownerError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, retryable: false, details });
}

function typedError(error) {
  return {
    code: typeof error?.code === "string" ? error.code : "E_AGENT_OWNER_INTERNAL",
    message: error instanceof Error ? error.message : String(error),
    retryable: error?.retryable === true,
    details: error?.details && typeof error.details === "object" ? error.details : {},
  };
}

async function readInput(input, stdin) {
  if (input !== undefined) return Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of stdin) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += bytes.length;
      if (length > MAX_INPUT_BYTES) throw ownerError("E_AGENT_OWNER_INPUT", "agent-gate input must be between 1 byte and 1 MiB");
      chunks.push(bytes);
    }
  } catch (error) {
    if (error?.code === "E_AGENT_OWNER_INPUT") throw error;
    throw ownerError("E_AGENT_OWNER_STDIN", `agent-gate stdin read failed: ${error instanceof Error ? error.message : String(error)}`, {
      cause_code: typeof error?.code === "string" ? error.code : "E_UNKNOWN",
    });
  }
  return Buffer.concat(chunks, length);
}

export async function runCli({ input, stdin = process.stdin, stdout = process.stdout } = {}) {
  try {
    const bytes = await readInput(input, stdin);
    if (bytes.length === 0 || bytes.length > MAX_INPUT_BYTES) throw ownerError("E_AGENT_OWNER_INPUT", "agent-gate input must be between 1 byte and 1 MiB");
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
