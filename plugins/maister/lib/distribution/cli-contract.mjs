import { DistributionError, distributionError } from "./path-safety.mjs";
import { SUPPORTED_TARGET_IDS } from "./targets.mjs";

export const EXIT_CODES = Object.freeze({
  success: 0,
  usage: 2,
  source: 3,
  validation: 4,
  drift: 5,
  lock: 6,
  transaction: 7,
  integrity: 8,
});

export const CLI_CONTRACT_VERSION = 1;

const COMMANDS = new Set(["install", "update", "status", "verify", "uninstall", "rollback", "recover"]);
const TARGETS = new Set(SUPPORTED_TARGET_IDS);
const TARGET_USAGE = SUPPORTED_TARGET_IDS.join(", ");
const EVIDENCE_OPTIONS = new Set(["--evidence", "--attestation"]);
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function inputPath(value, argument) {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) {
    throw distributionError("E_USAGE", `${argument} requires a non-empty safe path`, { argument });
  }
  return value;
}

export function parseCliArgs(argv, env = process.env) {
  const command = argv[0];
  if (!COMMANDS.has(command)) throw distributionError("E_USAGE", "command must be one of install, update, status, verify, uninstall, rollback, recover", { command });
  const options = { command, json: false, env };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (["--target", "--source", "--ref", "--home", "--failure-point", "--journal-id"].includes(argument)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw distributionError("E_USAGE", `${argument} requires a value`, { argument });
      options[{ "--target": "target", "--source": "source", "--ref": "ref", "--home": "home", "--failure-point": "failurePoint", "--journal-id": "journalId" }[argument]] = value;
    } else if (EVIDENCE_OPTIONS.has(argument)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw distributionError("E_USAGE", `${argument} requires a value`, { argument });
      if (options.attestationPath) throw distributionError("E_USAGE", "--evidence and --attestation cannot both be supplied", { argument });
      options.attestationPath = inputPath(value, argument);
    } else throw distributionError("E_USAGE", `unknown option: ${argument}`, { argument });
  }
  if (!options.target || !TARGETS.has(options.target)) throw distributionError("E_USAGE", `--target must be one of: ${TARGET_USAGE}`, { target: options.target });
  if (["install", "update"].includes(command) && !options.source) throw distributionError("E_USAGE", `${command} requires --source`, { command });
  if (options.attestationPath && !["install", "update"].includes(command)) {
    throw distributionError("E_USAGE", "E3 attestations are accepted only for install and update", { command });
  }
  if (options.journalId && command !== "recover") {
    throw distributionError("E_USAGE", "--journal-id is accepted only for recover", { command });
  }
  if (options.source?.startsWith("github:") && !options.ref && !options.source.includes("#")) throw distributionError("E_USAGE", "GitHub sources require --ref", {});
  if (options.failurePoint && env.MAISTER_ENABLE_FAILURE_INJECTION !== "1") throw distributionError("E_USAGE", "--failure-point requires MAISTER_ENABLE_FAILURE_INJECTION=1", {});
  return options;
}

export function parseLauncherCliArgs(argv) {
  const command = argv[0];
  if (!COMMANDS.has(command)) {
    throw distributionError("E_LAUNCHER_USAGE", "command must be one of install, update, status, verify, uninstall, rollback, recover", { command });
  }
  const options = { command, target: null, json: false };
  let targetOccurrences = 0;
  let jsonOccurrences = 0;
  let journalOccurrences = 0;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--target") {
      targetOccurrences += 1;
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw distributionError("E_LAUNCHER_USAGE", "--target requires exactly one value", { argument });
      }
      options.target = value;
      index += 1;
    } else if (argument === "--json") {
      jsonOccurrences += 1;
      options.json = true;
    } else if (argument === "--journal-id") {
      journalOccurrences += 1;
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw distributionError("E_LAUNCHER_USAGE", "--journal-id requires exactly one value", { argument });
      }
      options.journalId = value;
      index += 1;
    } else {
      throw distributionError("E_LAUNCHER_USAGE", `unknown or positional argument: ${argument}`, { argument });
    }
  }
  if (targetOccurrences !== 1 || !TARGETS.has(options.target)) {
    throw distributionError("E_LAUNCHER_USAGE", `--target must occur exactly once and be one of: ${TARGET_USAGE}`, {
      target: options.target,
      occurrences: targetOccurrences,
    });
  }
  if (jsonOccurrences > 1) {
    throw distributionError("E_LAUNCHER_USAGE", "--json may occur at most once", { occurrences: jsonOccurrences });
  }
  if (journalOccurrences > 1 || (journalOccurrences === 1 && (command !== "recover" || !CANONICAL_UUID.test(options.journalId)))) {
    throw distributionError("E_LAUNCHER_USAGE", "--journal-id must be one canonical UUID and is accepted only for recover", {
      command,
      occurrences: journalOccurrences,
    });
  }
  return Object.freeze(options);
}

export function exitCodeFor(error) {
  if (!(error instanceof DistributionError) && typeof error?.kind !== "string") return EXIT_CODES.transaction;
  if (error.kind === "E_INTEGRITY") return EXIT_CODES.integrity;
  if (error.kind === "E_USAGE" || error.kind === "E_SETTINGS_FORMAT") return EXIT_CODES.usage;
  if (error.kind === "E_CLEAN_INSTALL_REQUIRED") return EXIT_CODES.validation;
  if (error.kind === "E_LOCK_BUSY") return EXIT_CODES.lock;
  if (error.kind.startsWith("E_SOURCE")) return EXIT_CODES.source;
  if (error.kind.startsWith("E_OVERLAY") || error.kind.startsWith("E_MATERIALIZE") || error.kind.startsWith("E_PROVENANCE") || error.kind.startsWith("E_SETTINGS_") || error.kind.startsWith("E_EVIDENCE")) return EXIT_CODES.validation;
  if (error.kind === "E_DRIFT_CONFLICT") return EXIT_CODES.drift;
  return EXIT_CODES.transaction;
}

export function envelope({ command, target, code, message, receiptPath = null, journalPath = null, evidence = [], error = null, receipt = null }) {
  return {
    schema_version: 1,
    ok: code === 0,
    command,
    target,
    code,
    message,
    error,
    receipt_path: receiptPath,
    journal_path: journalPath,
    evidence: receipt?.evidence ?? evidence,
  };
}

export { COMMANDS, EVIDENCE_OPTIONS, TARGETS };
