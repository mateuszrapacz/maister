import crypto from "node:crypto";

import { throwDistributionError } from "./path-safety.mjs";

const FULL_COMMIT = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) {
    throwDistributionError("E_PROVENANCE_INCOMPLETE", `${field} must be a non-empty string`, { field });
  }
  return value;
}

function requireHash(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throwDistributionError("E_PROVENANCE_HASH", `${field} must be a lowercase SHA-256 hash`, { field, value });
  }
  return value;
}

function projectionBinding(agentProjection) {
  if (!agentProjection || typeof agentProjection !== "object" || Array.isArray(agentProjection)) {
    throwDistributionError("E_PROVENANCE_INCOMPLETE", "agent projection provenance must be an object", {});
  }
  if (!Number.isSafeInteger(agentProjection.schema_version) || agentProjection.schema_version < 1) {
    throwDistributionError("E_PROVENANCE_INCOMPLETE", "agent projection schema version must be a positive integer", {
      schema_version: agentProjection.schema_version,
    });
  }
  return Object.freeze({
    schema_version: agentProjection.schema_version,
    projector_version: requireText(agentProjection.projector_version, "agentProjection.projector_version"),
    canonical_set_digest: requireHash(agentProjection.canonical_set_digest, "agentProjection.canonical_set_digest"),
    manifest_digest: requireHash(agentProjection.manifest_digest, "agentProjection.manifest_digest"),
    projected_tree_digest: requireHash(agentProjection.projected_tree_digest, "agentProjection.projected_tree_digest"),
  });
}

export function createProvenance({
  source,
  overlay,
  hostVersion,
  contentHash,
  materializedHash: suppliedMaterializedHash,
  agentProjection = null,
}) {
  if (!source || !overlay || typeof source !== "object" || typeof overlay !== "object") {
    throwDistributionError("E_PROVENANCE_INCOMPLETE", "source, overlay, and content hash are required", {});
  }
  if (!FULL_COMMIT.test(source.resolvedCommit)) {
    throwDistributionError("E_SOURCE_COMMIT", "provenance requires a full resolved commit", {
      resolvedCommit: source.resolvedCommit,
    });
  }
  const sourceHash = source.contentHash ?? source.content_hash;
  const suppliedOverlayHash = overlay.contractHash ?? overlay.overlayHash ?? overlay.overlay_hash;
  const overlayHash = suppliedOverlayHash ?? crypto.createHash("sha256").update(canonicalJson(overlay)).digest("hex");
  const materializedHash = contentHash ?? suppliedMaterializedHash ?? overlay.materializedHash ?? overlay.materialized_hash;
  const sourceKind = requireText(source.kind, "source.kind");
  const requestedSource = requireText(source.requestedSource ?? source.requested_source, "source.requestedSource");
  const requestedRef = requireText(source.requestedRef ?? source.requested_ref, "source.requestedRef");
  const sourceVersion = requireText(source.sourceVersion ?? source.source_version, "source.sourceVersion");
  const overlayId = requireText(overlay.overlay_id ?? overlay.overlayId, "overlay.overlay_id");
  const overlayVersion = requireText(overlay.overlay_version ?? overlay.overlayVersion, "overlay.overlay_version");
  const host = requireText(overlay.target?.id ?? overlay.target, "overlay.target.id");
  const resolvedHostVersion = requireText(hostVersion ?? overlay.target?.host_version_constraint, "hostVersion");
  if (contentHash !== undefined && suppliedMaterializedHash !== undefined && contentHash !== suppliedMaterializedHash) {
    throwDistributionError("E_PROVENANCE_HASH", "contentHash and materializedHash must match", {
      contentHash,
      materializedHash: suppliedMaterializedHash,
    });
  }
  const hashes = {
    source: requireHash(sourceHash, "sourceHash"),
    overlay: requireHash(overlayHash, "overlayHash"),
    materialized: requireHash(materializedHash, "materializedHash"),
  };
  const payload = {
    schemaVersion: 1,
    requestedSource,
    sourceKind,
    requestedRef,
    resolvedCommit: source.resolvedCommit,
    sourceVersion,
    overlayId,
    overlayVersion,
    overlayHash: hashes.overlay,
    host,
    hostVersion: resolvedHostVersion,
    sourceHash: hashes.source,
    materializedHash: hashes.materialized,
    ...(agentProjection === null ? {} : { agent_projection: projectionBinding(agentProjection) }),
  };
  const provenanceHash = crypto.createHash("sha256").update(canonicalJson(payload)).digest("hex");
  return Object.freeze({
    ...payload,
    contentHash: hashes.materialized,
    provenanceHash,
    hashes: Object.freeze({ ...hashes, provenance: provenanceHash }),
  });
}

export function extendEvidenceProvenance(provenance, {
  command,
  attestationDigest,
  artifactDigest,
  portableCoreTreeHash,
} = {}) {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    throwDistributionError("E_PROVENANCE_INCOMPLETE", "evidence provenance must be an object", {});
  }
  const extended = {
    ...provenance,
    command: requireText(command, "evidence.command"),
    attestation_digest: requireHash(attestationDigest, "evidence.attestationDigest"),
    artifact_digest: requireHash(artifactDigest, "evidence.artifactDigest"),
    portable_core_tree_hash: requireHash(portableCoreTreeHash, "evidence.portableCoreTreeHash"),
  };
  return Object.freeze(extended);
}

export { canonicalJson };
