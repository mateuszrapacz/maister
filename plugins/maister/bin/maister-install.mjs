#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DistributionError } from "../lib/distribution/path-safety.mjs";
import { parseCliArgs, exitCodeFor, envelope } from "../lib/distribution/cli-contract.mjs";
import {
  bindE3AttestationToProvenance,
  loadE3Attestation,
  portableCoreTreeHash,
  requireE3Attestation,
} from "../lib/distribution/e3-attestation.mjs";
import { resolveSource } from "../lib/distribution/source-resolver.mjs";
import { executeLifecycle } from "../lib/distribution/transaction-manager.mjs";

const OVERLAY_ROOT = path.resolve(import.meta.dirname, "../overlays");

function checkoutOverlayRoot(root, target) {
  const candidates = [
    path.join(root, "plugins", "maister", "overlays"),
    path.join(root, "overlays"),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, target, "overlay.yml"))) ?? path.join(root, "overlays");
}

export async function runCli(argv, { env = process.env, git, github } = {}) {
  let options;
  let cleanup;
  try {
    options = parseCliArgs(argv, env);
    let lifecycleGithub = github;
    let overlayRoot = OVERLAY_ROOT;
    let sourceResolution;
    if (["install", "update"].includes(options.command) && options.source?.startsWith("github:")) {
      sourceResolution = await resolveSource(options.source, {
        ref: options.ref,
        github,
        gitTimeoutMs: env.MAISTER_GIT_TIMEOUT_MS,
        sourceVersion: options.sourceVersion,
      });
      if (!sourceResolution.root) {
        throw new DistributionError("E_SOURCE_CONTENT", "GitHub installation requires an immutable checkout root", {
          source: options.source,
          resolved_commit: sourceResolution.resolvedCommit,
        });
      }
      cleanup = sourceResolution.cleanup;
      lifecycleGithub = {
        resolveRef: () => ({ ...sourceResolution, cleanup: undefined }),
      };
      overlayRoot = checkoutOverlayRoot(sourceResolution.root, options.target);
    } else if (["install", "update"].includes(options.command)) {
      sourceResolution = await resolveSource(options.source, {
        ref: options.ref,
        git,
        gitTimeoutMs: env.MAISTER_GIT_TIMEOUT_MS,
        sourceVersion: options.sourceVersion,
        allowDirtyLocal: env.MAISTER_ALLOW_DIRTY_LOCAL === "1",
        env,
      });
    }
    if (["install", "update"].includes(options.command)) {
      const attestation = requireE3Attestation(loadE3Attestation({
        path: options.attestationPath,
        archiveRoot: sourceResolution?.root,
        now: env.MAISTER_EVIDENCE_NOW,
      }), { now: env.MAISTER_EVIDENCE_NOW });
      const coreHash = portableCoreTreeHash(sourceResolution.root);
      bindE3AttestationToProvenance(attestation, {
        provenance: {
          resolvedCommit: sourceResolution.resolvedCommit,
          sourceVersion: sourceResolution.sourceVersion,
          portableCoreTreeHash: coreHash,
          artifactDigest: coreHash,
        },
        now: env.MAISTER_EVIDENCE_NOW,
      });
      options.e3Attestation = attestation;
    }
    const result = await executeLifecycle(options.command, {
      ...options,
      env,
      git,
      github: lifecycleGithub,
      overlayRoot,
      resolvedSource: sourceResolution,
      resolvedSourceRoot: sourceResolution?.root,
      allowDirtyLocal: env.MAISTER_ALLOW_DIRTY_LOCAL === "1",
    });
    const response = envelope({
      command: options.command,
      target: options.target,
      code: 0,
      message: options.command === "status" ? "installation status loaded" : `${options.command} completed`,
      receiptPath: result.receiptPath,
      journalPath: result.journalPath,
      receipt: result.receipt,
    });
    return { status: 0, output: JSON.stringify(response) };
  } catch (error) {
    const failure = error instanceof DistributionError || typeof error?.kind === "string"
      ? error
      : new DistributionError("E_TRANSACTION", error.message, {}, { cause: error });
    const code = exitCodeFor(failure);
    const response = envelope({
      command: options?.command ?? argv[0] ?? null,
      target: options?.target ?? null,
      code,
      message: failure.message.replace(/^\[[^\]]+\] /u, ""),
      receiptPath: failure.details?.receipt_path ?? null,
      journalPath: failure.details?.journal_path ?? null,
      error: { kind: failure.kind, details: failure.details, retryable: failure.retryable },
    });
    return { status: code, output: JSON.stringify(response) };
  } finally {
    if (typeof cleanup === "function") cleanup();
  }
}

const invokedPath = process.argv[1] ? fs.realpathSync.native(process.argv[1]) : null;
const modulePath = fs.realpathSync.native(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  const result = await runCli(process.argv.slice(2));
  process.stdout.write(`${result.output}\n`);
  process.exitCode = result.status;
}
