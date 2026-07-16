#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadOverlay } from "../lib/distribution/overlay-loader.mjs";
import { OverlayValidationError, overlayError } from "../lib/distribution/errors.mjs";
import { SUPPORTED_TARGET_IDS } from "../lib/distribution/targets.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../../..");

function usageError(message) {
  return overlayError("E_OVERLAY_SCHEMA", message, { usage: true });
}

function parseArguments(argv) {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (!["--target", "--overlay", "--inventory"].includes(argument)) {
      throw usageError(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw usageError(`${argument} requires a value`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  if (!options.target || !SUPPORTED_TARGET_IDS.includes(options.target)) {
    throw usageError("--target must be codex, cursor, or kiro-cli");
  }
  const targetRoot = path.join(REPOSITORY_ROOT, "plugins/maister/overlays", options.target);
  options.overlay = path.resolve(options.overlay ?? path.join(targetRoot, "overlay.yml"));
  options.inventory = path.resolve(options.inventory ?? path.join(targetRoot, "inventory.yml"));
  return options;
}

function assertNativeAssets(loaded) {
  const overlayRoot = path.dirname(loaded.overlayPath);
  for (const asset of loaded.overlay.native_assets) {
    const sourcePath = path.resolve(overlayRoot, asset.source);
    if (!sourcePath.startsWith(`${overlayRoot}${path.sep}`)) {
      throw overlayError("E_OVERLAY_PATH", `native asset escapes overlay root: ${asset.source}`, { source: asset.source });
    }
    let metadata;
    try {
      metadata = fs.lstatSync(sourcePath);
    } catch (error) {
      throw overlayError("E_OVERLAY_IO", `native asset is missing: ${asset.source}`, { source: asset.source }, { cause: error });
    }
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw overlayError("E_OVERLAY_IO", `native asset must be a regular file: ${asset.source}`, { source: asset.source });
    }
    const hash = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
    if (hash !== asset.sha256) {
      throw overlayError("E_OVERLAY_SCHEMA", `native asset hash mismatch: ${asset.source}`, {
        source: asset.source,
        expected: asset.sha256,
        actual: hash,
      });
    }
    const declaredMode = Number.parseInt(asset.mode, 8);
    if ((metadata.mode & 0o7777) !== declaredMode) {
      throw overlayError("E_OVERLAY_SCHEMA", `native asset mode mismatch: ${asset.source}`, {
        source: asset.source,
        expected: asset.mode,
        actual: (metadata.mode & 0o7777).toString(8),
      });
    }
  }
}

export function validateOverlayCommand(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const loaded = loadOverlay({ overlayPath: options.overlay, inventoryPath: options.inventory });
  if (loaded.overlay.target.id !== options.target) {
    throw overlayError("E_OVERLAY_TARGET", "--target does not match overlay target", {
      requested: options.target,
      actual: loaded.overlay.target.id,
    });
  }
  assertNativeAssets(loaded);
  return {
    ok: true,
    target: loaded.overlay.target.id,
    overlay_id: loaded.overlay.overlay_id,
    overlay_version: loaded.overlay.overlay_version,
    contract_hash: loaded.contractHash,
    native_asset_count: loaded.overlay.native_assets.length,
  };
}

function writeResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  process.stdout.write(`Overlay valid: ${result.overlay_id} v${result.overlay_version} (${result.target})\n`);
  process.stdout.write(`Native assets: ${result.native_asset_count}\n`);
}

function main() {
  const json = process.argv.includes("--json");
  try {
    writeResult(validateOverlayCommand(), json);
  } catch (error) {
    const typed = error instanceof OverlayValidationError
      ? error
      : overlayError("E_OVERLAY_IO", error.message, {}, { cause: error });
    const result = {
      ok: false,
      error: {
        kind: typed.code,
        message: typed.message,
        details: typed.details,
        retryable: typed.retryable,
      },
    };
    if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else process.stderr.write(`${typed.message}\n`);
    process.exitCode = typed.code === "E_OVERLAY_SCHEMA" ? 2 : 4;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
