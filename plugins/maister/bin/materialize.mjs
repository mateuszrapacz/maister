#!/usr/bin/env node

import process from "node:process";

import { materialize } from "../lib/distribution/materializer.mjs";

function parseArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--allow-dirty-local") {
      options.allowDirtyLocal = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`unexpected argument: ${argument}`);
    const separator = argument.indexOf("=");
    if (separator >= 0) options[argument.slice(2, separator)] = argument.slice(separator + 1);
    else options[argument.slice(2)] = argumentsList[++index];
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const {
    overlay,
    inventory,
    "staging-root": stagingRoot,
    "source-version": sourceVersion,
    "host-version": hostVersion,
    ...materializerOptions
  } = options;
  const result = await materialize({
    ...materializerOptions,
    overlayPath: overlay,
    inventoryPath: inventory,
    stagingRoot,
    sourceVersion,
    hostVersion,
  });
  process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: { code: error.code ?? "E_MATERIALIZE_FAILED", message: error.message, details: error.details ?? {} },
  }, null, 2)}\n`);
  process.exitCode = 2;
}
