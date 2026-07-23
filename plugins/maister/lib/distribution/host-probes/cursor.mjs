import fs from "node:fs";
import path from "node:path";

import { compareNativeInventory, probeHost } from "./base.mjs";

const CURSOR_LIVE_INVOCATION_UNAVAILABLE = Object.freeze({
  result: "unavailable",
  reason: "cursor-live-invocation-unobservable-from-cli",
  provenance: Object.freeze({
    remediation:
      "E6 requires an in-session Cursor Task smoke after reload; disk/hybrid inventory is not live Task/subagent_type proof",
  }),
});

function frontmatterValue(source, field) {
  if (typeof source !== "string") return null;
  const match = source.match(new RegExp(`^${field}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n]+))\\s*$`, "mu"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "").trim() : null;
}

function observePluginAgentNames(pluginRoot) {
  if (typeof pluginRoot !== "string" || pluginRoot.length === 0) return null;
  const agentsDir = path.join(pluginRoot, "agents");
  let entries;
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);
  } catch {
    return null;
  }
  const nativeRoleExternalIds = [];
  for (const entry of entries) {
    let source;
    try {
      source = fs.readFileSync(path.join(agentsDir, entry), "utf8");
    } catch {
      continue;
    }
    const name = frontmatterValue(source, "name");
    if (typeof name === "string" && name.length > 0) nativeRoleExternalIds.push(name);
  }
  return {
    native_role_external_ids: nativeRoleExternalIds,
    // Honest marker: this is plugin-disk inventory, not live Task enum observation.
    discovery_subject: "plugin-disk-agents",
  };
}

/**
 * Build the hybrid discovery manifest Cursor install uses for E5.
 * native_role_external_id values must match agent frontmatter `name:` on disk
 * (maister-*), including support agents such as maister-explore.
 */
export function cursorHybridDiscoveryManifest(overlay) {
  const projection = overlay?.agent_projection;
  if (!projection || !Array.isArray(projection.canonical_roles)) return null;
  const rows = [];
  for (const roleId of projection.canonical_roles) {
    if (typeof roleId !== "string" || roleId.length === 0) return null;
    rows.push({
      role_id: roleId,
      target: "cursor",
      native_role_external_id: `maister-${roleId}`,
    });
  }
  for (const support of projection.support_inventory ?? []) {
    if (!support || typeof support !== "object") continue;
    const assets = Array.isArray(support.assets) ? support.assets : [];
    for (const asset of assets) {
      if (!asset || asset.kind !== "agent" || typeof asset.destination !== "string") continue;
      const base = path.basename(asset.destination, ".md");
      if (!base.startsWith("maister-")) continue;
      rows.push({
        role_id: typeof support.support_id === "string" ? support.support_id : base,
        target: "cursor",
        native_role_external_id: base,
      });
    }
  }
  if (rows.length === 0) return null;
  return {
    schema_version: 1,
    target: "cursor",
    adapter_id: "cursor.native",
    representation: "cursor-markdown",
    rows,
  };
}

export function probeCursor(options = {}) {
  const injectedDiscover = typeof options.discover === "function" ? options.discover : undefined;
  const hybridObservation = injectedDiscover === undefined
    ? observePluginAgentNames(options.pluginRoot)
    : null;
  const invoke = typeof options.invoke === "function" ? options.invoke : () => ({ ok: false });
  const runScenario = typeof options.runScenario === "function"
    ? options.runScenario
    : () => ({ ...CURSOR_LIVE_INVOCATION_UNAVAILABLE, provenance: { ...CURSOR_LIVE_INVOCATION_UNAVAILABLE.provenance } });
  return probeHost({
    ...options,
    target: "cursor",
    command: options.command ?? "agent",
    discoveryScenario: "cursor-native-inventory-v1",
    scenario: "cursor-native-invocation-v1",
    discover: injectedDiscover
      ? (context) => compareNativeInventory({
        manifest: context.manifest,
        target: "cursor",
        observation: injectedDiscover(context),
      })
      : hybridObservation
        ? (context) => compareNativeInventory({
          manifest: context.manifest,
          target: "cursor",
          observation: hybridObservation,
        })
        : undefined,
    invoke,
    runScenario,
  });
}

/**
 * Collect Cursor hybrid E5 (+ honest E6 unavailable) records for installer evidence.
 * Uses provenance.hostVersion so native evidence binds to the transaction.
 */
export function probeCursorForInstall({
  pluginRoot,
  overlay,
  provenance,
  clock,
  now,
} = {}) {
  const manifest = cursorHybridDiscoveryManifest(overlay);
  if (!manifest || typeof pluginRoot !== "string" || pluginRoot.length === 0) {
    return null;
  }
  if (!provenance || typeof provenance !== "object") return null;
  const hostVersion = provenance.hostVersion ?? provenance.host_version;
  if (typeof hostVersion !== "string" || hostVersion.length === 0) return null;
  return probeCursor({
    pluginRoot,
    manifest,
    hostVersion,
    clock,
    now,
    provenance: {
      source_commit: provenance.resolvedCommit ?? provenance.source_commit,
      source_version: provenance.sourceVersion ?? provenance.source_version,
      overlay_id: provenance.overlayId ?? provenance.overlay_id,
      overlay_version: provenance.overlayVersion ?? provenance.overlay_version,
      host: provenance.host ?? "cursor",
      scenario_version: provenance.scenarioVersion ?? provenance.scenario_version ?? "1.0.0",
      schema_version: provenance.agent_projection?.schema_version ?? provenance.schema_version,
      projector_version: provenance.agent_projection?.projector_version ?? provenance.projector_version,
      canonical_set_digest: provenance.agent_projection?.canonical_set_digest ?? provenance.canonical_set_digest,
      manifest_digest: provenance.agent_projection?.manifest_digest ?? provenance.manifest_digest,
      projected_tree_digest: provenance.agent_projection?.projected_tree_digest ?? provenance.projected_tree_digest,
      source_hash: provenance.source_hash ?? provenance.sourceHash,
      overlay_hash: provenance.overlay_hash ?? provenance.overlayHash,
      materialized_hash: provenance.materialized_hash ?? provenance.materializedHash,
      provenance_hash: provenance.provenance_hash ?? provenance.provenanceHash,
      attestation_digest: provenance.attestation_digest ?? provenance.attestationDigest,
      artifact_digest: provenance.artifact_digest ?? provenance.artifactDigest,
      portable_core_tree_hash:
        provenance.portable_core_tree_hash ?? provenance.portableCoreTreeHash,
    },
  });
}
