#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { e3AttestationDigest, validateE3Attestation } from "../lib/distribution/e3-attestation.mjs";
import { SUPPORTED_TARGET_IDS } from "../lib/distribution/targets.mjs";

const ARCHIVE_PATTERN = /^maister-(codex|cursor|kiro-cli)\.tar\.gz$/u;
const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const METADATA_VERSION = 1;
const SBOM_NAME = "SBOM.cdx.json";
const PROVENANCE_NAME = "PROVENANCE.json";
const EMBEDDED_ATTESTATION_PATH = "plugins/maister/.maister-e3-attestation.json";
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;

export class ReleaseMetadataError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(`[${code}] ${message}`, options);
    this.name = "ReleaseMetadataError";
    this.code = code;
    this.details = details;
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `could not read ${label}`, { filePath }, { cause: error });
  }
}

function readChecksums(archiveDir) {
  const checksumPath = path.join(archiveDir, "SHA256SUMS");
  if (!fs.existsSync(checksumPath)) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "SHA256SUMS is required before release metadata is generated", { checksumPath });
  }
  const checksums = new Map();
  for (const line of fs.readFileSync(checksumPath, "utf8").split(/\r?\n/u).filter(Boolean)) {
    const match = /^(?<hash>[0-9a-f]{64})\s+(?:\*|)(?<name>[^\s]+)$/u.exec(line);
    if (!match || !ARCHIVE_PATTERN.test(match.groups.name)) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "SHA256SUMS contains an invalid archive entry", { line });
    }
    checksums.set(match.groups.name, match.groups.hash);
  }
  return checksums;
}

function readEmbeddedAttestation(filePath) {
  let listing;
  try {
    listing = execFileSync("tar", ["-tzf", filePath], {
      encoding: "utf8",
      maxBuffer: MAX_ARCHIVE_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
    }).split(/\r?\n/u).filter(Boolean);
  } catch (error) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `could not inspect embedded E3 attestation in ${filePath}`, { filePath }, { cause: error });
  }
  const matches = listing.filter((entry) => entry === EMBEDDED_ATTESTATION_PATH);
  if (matches.length !== 1) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `archive must contain exactly one embedded E3 attestation at ${EMBEDDED_ATTESTATION_PATH}`, {
      filePath,
      matches,
    });
  }
  let bytes;
  try {
    bytes = execFileSync("tar", ["-xOzf", filePath, EMBEDDED_ATTESTATION_PATH], {
      maxBuffer: 256 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `could not read embedded E3 attestation in ${filePath}`, { filePath }, { cause: error });
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `embedded E3 attestation is not valid JSON in ${filePath}`, { filePath }, { cause: error });
  }
  let attestation;
  try {
    attestation = validateE3Attestation(value);
  } catch (error) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `embedded E3 attestation is invalid in ${filePath}`, { filePath }, { cause: error });
  }
  if (attestation.result !== "passed") {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `embedded E3 attestation is not passed in ${filePath}`, { filePath, result: attestation.result });
  }
  return Object.freeze({
    path: EMBEDDED_ATTESTATION_PATH,
    digest: e3AttestationDigest(attestation),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    source_commit: attestation.source_commit,
    source_version: attestation.source_version,
    portable_core_tree_hash: attestation.portable_core_tree_hash,
    artifact_digest: attestation.artifact_digest,
  });
}

function archiveObservations(archiveDir) {
  const checksums = readChecksums(archiveDir);
  const archives = SUPPORTED_TARGET_IDS.map((target) => {
    const name = `maister-${target}.tar.gz`;
    const filePath = path.join(archiveDir, name);
    if (!fs.existsSync(filePath)) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `missing ${name}`, { filePath });
    }
    const hash = sha256File(filePath);
    if (checksums.get(name) !== hash) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `checksum mismatch for ${name}`, {
        expected: checksums.get(name),
        actual: hash,
      });
    }
    return Object.freeze({ target, name, sha256: hash, size: fs.statSync(filePath).size, attestation: readEmbeddedAttestation(filePath) });
  });
  if (checksums.size !== archives.length) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "SHA256SUMS must contain exactly the three target archives", {
      expected: archives.length,
      actual: checksums.size,
    });
  }
  return archives;
}

function assertAttestationSet(archives, sourceCommit, sourceVersion) {
  const first = archives[0]?.attestation;
  if (!first) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "release archives must contain an embedded E3 attestation", {});
  }
  for (const archive of archives) {
    if (archive.attestation.digest !== first.digest || archive.attestation.sha256 !== first.sha256) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "all target archives must embed identical E3 attestation bytes", { target: archive.target });
    }
    if (archive.attestation.source_commit !== sourceCommit || archive.attestation.source_version !== String(sourceVersion)) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `embedded E3 attestation does not bind ${archive.name} to the release source`, {
        target: archive.target,
        expected: { source_commit: sourceCommit, source_version: String(sourceVersion) },
        actual: archive.attestation,
      });
    }
  }
  return first;
}

function validateParityReport(parityReportPath) {
  const report = readJson(parityReportPath, "parity report");
  if (report.schema_version !== 1 || report.gate !== "three-target-shadow-parity" || report.ok !== true) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "parity report is not a successful three-target gate result", { parityReportPath });
  }
  if (!Array.isArray(report.targets) || report.targets.length !== SUPPORTED_TARGET_IDS.length) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "parity report does not cover all targets", { parityReportPath });
  }
  for (const target of SUPPORTED_TARGET_IDS) {
    const entry = report.targets.find((candidate) => candidate?.target === target);
    if (!entry || entry.ok !== true || entry.counts?.unresolved !== 0) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", `parity report is not green for ${target}`, { target });
    }
  }
  return report;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function validateSourceCommit(sourceCommit) {
  if (!FULL_COMMIT.test(sourceCommit)) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "source commit must be a full 40-character Git commit", { sourceCommit });
  }
}

export function createReleaseMetadata({
  archiveDir,
  outputDir = archiveDir,
  sourceCommit,
  sourceVersion = "unknown",
  parityReportPath,
  sourceDateEpoch = process.env.SOURCE_DATE_EPOCH ?? "0",
} = {}) {
  if (!archiveDir || !parityReportPath) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_USAGE", "archiveDir and parityReportPath are required");
  }
  validateSourceCommit(sourceCommit);
  const archives = archiveObservations(path.resolve(archiveDir));
  const parityReport = validateParityReport(path.resolve(parityReportPath));
  const attestation = assertAttestationSet(archives, sourceCommit, sourceVersion);
  const epoch = Number(sourceDateEpoch);
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_INPUT", "source date epoch must be a non-negative integer", { sourceDateEpoch });
  }
  const outputRoot = path.resolve(outputDir);
  fs.mkdirSync(outputRoot, { recursive: true });

  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${crypto.createHash("sha256").update(`${sourceCommit}:${sourceVersion}`).digest("hex").slice(0, 32)}`,
    version: 1,
    metadata: {
      timestamp: new Date(epoch * 1000).toISOString(),
      component: { type: "application", name: "maister", version: String(sourceVersion) },
      properties: [
        { name: "maister.source.commit", value: sourceCommit },
        { name: "maister.parity.report.sha256", value: sha256File(path.resolve(parityReportPath)) },
      ],
    },
    components: archives.map((archive) => ({
      type: "file",
      name: archive.name,
      version: String(sourceVersion),
      hashes: [{ alg: "SHA-256", content: archive.sha256 }],
      properties: [
        { name: "maister.target", value: archive.target },
        { name: "maister.e3.attestation.digest", value: archive.attestation.digest },
        { name: "maister.e3.attestation.sha256", value: archive.attestation.sha256 },
      ],
    })),
  };

  const provenance = {
    schema_version: METADATA_VERSION,
    record_type: "unsigned-build-provenance-record-v1",
    signed: false,
    source: {
      repository: "same-checkout",
      commit: sourceCommit,
      version: String(sourceVersion),
    },
    build: {
      source_date_epoch: epoch,
      parity_gate: {
        report: path.basename(parityReportPath),
        sha256: sha256File(path.resolve(parityReportPath)),
        result: "passed",
      },
      artifacts: archives,
    },
    sbom: { file: SBOM_NAME, sha256: null },
    portable_core_attestation: {
      supplied: true,
      path: attestation.path,
      digest: attestation.digest,
      sha256: attestation.sha256,
      portable_core_tree_hash: attestation.portable_core_tree_hash,
      artifact_digest: attestation.artifact_digest,
      source_commit: attestation.source_commit,
      source_version: attestation.source_version,
      integration: "embedded E3 schema and validation remain owned by the portable-core evidence boundary",
    },
    limitations: [
      "This record is unsigned and is not a cryptographic attestation.",
      "Native host capability evidence E5/E6 may be unavailable or provisional on runners without the host runtime.",
    ],
  };
  writeJson(path.join(outputRoot, SBOM_NAME), sbom);
  provenance.sbom.sha256 = sha256File(path.join(outputRoot, SBOM_NAME));
  writeJson(path.join(outputRoot, PROVENANCE_NAME), provenance);
  return { sbom, provenance };
}

export function verifyReleaseMetadata({ archiveDir, outputDir = archiveDir } = {}) {
  const root = path.resolve(outputDir);
  const sbomPath = path.join(root, SBOM_NAME);
  const provenancePath = path.join(root, PROVENANCE_NAME);
  if (!fs.existsSync(sbomPath) || !fs.existsSync(provenancePath)) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", "release metadata files are missing", { root });
  }
  const sbom = readJson(sbomPath, SBOM_NAME);
  const provenance = readJson(provenancePath, PROVENANCE_NAME);
  if (sbom.bomFormat !== "CycloneDX" || sbom.specVersion !== "1.5" || provenance.record_type !== "unsigned-build-provenance-record-v1" || provenance.signed !== false) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", "release metadata schema or signing declaration is invalid", { root });
  }
  if (provenance.sbom?.sha256 !== sha256File(sbomPath)) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", "provenance does not bind the SBOM bytes", { sbomPath });
  }
  const archives = archiveObservations(path.resolve(archiveDir));
  const expectedAttestation = provenance.portable_core_attestation;
  if (!expectedAttestation?.supplied || typeof expectedAttestation.digest !== "string" || typeof expectedAttestation.sha256 !== "string") {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", "provenance does not bind an embedded E3 attestation", { provenancePath });
  }
  if (expectedAttestation.source_commit !== provenance.source?.commit || expectedAttestation.source_version !== provenance.source?.version) {
    throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", "provenance source identity does not match its embedded E3 attestation", { provenancePath });
  }
  const observed = new Map((provenance.build?.artifacts ?? []).map((entry) => [entry.name, entry.sha256]));
  const sbomComponents = new Map((sbom.components ?? []).map((entry) => [entry.name, entry.hashes?.find((hash) => hash.alg === "SHA-256")?.content]));
  const sbomAttestationProperties = new Map((sbom.components ?? []).map((entry) => [entry.name, new Map(entry.properties?.map((property) => [property.name, property.value]) ?? [])]));
  for (const archive of archives) {
    if (observed.get(archive.name) !== archive.sha256) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", `provenance does not match ${archive.name}`, { archive });
    }
    if (sbomComponents.get(archive.name) !== archive.sha256) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", `SBOM does not match ${archive.name}`, { archive });
    }
    const provenanceArtifact = provenance.build.artifacts.find((entry) => entry.name === archive.name);
    if (provenanceArtifact?.attestation?.digest !== archive.attestation.digest || provenanceArtifact?.attestation?.sha256 !== archive.attestation.sha256) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", `provenance does not match embedded E3 attestation for ${archive.name}`, { archive });
    }
    if (archive.attestation.digest !== expectedAttestation.digest || archive.attestation.sha256 !== expectedAttestation.sha256) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", `embedded E3 attestation differs for ${archive.name}`, { archive });
    }
    if (archive.attestation.source_commit !== provenance.source?.commit || archive.attestation.source_version !== provenance.source?.version) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", `embedded E3 source identity differs for ${archive.name}`, { archive });
    }
    const properties = sbomAttestationProperties.get(archive.name);
    if (properties?.get("maister.e3.attestation.digest") !== archive.attestation.digest || properties?.get("maister.e3.attestation.sha256") !== archive.attestation.sha256) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_VERIFY", `SBOM does not bind embedded E3 attestation for ${archive.name}`, { archive });
    }
  }
  return { ok: true, targets: archives.map((archive) => archive.target) };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    if (!["--archive-dir", "--output-dir", "--source-commit", "--source-version", "--parity-report", "--source-date-epoch"].includes(argument)) {
      throw new ReleaseMetadataError("E_RELEASE_METADATA_USAGE", `unknown argument: ${argument}`);
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new ReleaseMetadataError("E_RELEASE_METADATA_USAGE", `${argument} requires a value`);
    if (argument === "--archive-dir") options.archiveDir = value;
    if (argument === "--output-dir") options.outputDir = value;
    if (argument === "--source-commit") options.sourceCommit = value;
    if (argument === "--source-version") options.sourceVersion = value;
    if (argument === "--parity-report") options.parityReportPath = value;
    if (argument === "--source-date-epoch") options.sourceDateEpoch = value;
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = options.check ? verifyReleaseMetadata(options) : createReleaseMetadata(options);
    process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: { code: error.code ?? "E_RELEASE_METADATA", message: error.message, details: error.details ?? {} } })}\n`);
    process.exitCode = 1;
  }
}
