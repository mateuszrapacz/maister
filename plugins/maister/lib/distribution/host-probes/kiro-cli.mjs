import fs from "node:fs";
import path from "node:path";

import { compareNativeInventory, probeHost } from "./base.mjs";
import { runKiroCliInvocationScenario } from "./scenarios/kiro-cli.mjs";

const KIRO_CLI_LIVE_INVOCATION_UNAVAILABLE = Object.freeze({
  result: "unavailable",
  reason: "kiro-cli-live-invocation-unobservable-from-cli",
  provenance: Object.freeze({
    remediation:
      "E6 requires a configured bridge with nativePort.launch; disk inventory is not live subagent proof",
  }),
});

/**
 * Read installed Kiro CLI agent descriptors from disk and extract
 * native_role_external_id values (the `name` field in each .json descriptor).
 */
function observeKiroCliAgentNames(kiroHome) {
  if (typeof kiroHome !== "string" || kiroHome.length === 0) return null;
  const agentsDir = path.join(kiroHome, "agents");
  let entries;
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
  } catch {
    return null;
  }
  const nativeRoleExternalIds = [];
  for (const entry of entries) {
    let content;
    try {
      content = fs.readFileSync(path.join(agentsDir, entry), "utf8");
    } catch {
      continue;
    }
    let descriptor;
    try {
      descriptor = JSON.parse(content);
    } catch {
      continue;
    }
    const name = descriptor?.name;
    if (typeof name === "string" && name.length > 0) nativeRoleExternalIds.push(name);
  }
  return {
    native_role_external_ids: nativeRoleExternalIds,
    observable_identity: true,
    safe_adapter: true,
    discovery_subject: "kiro-cli-disk-agents",
  };
}

/**
 * Build the discovery manifest from overlay agent_projection for Kiro CLI.
 * native_role_external_id values are maister-{role_id} per the overlay contract.
 */
export function kiroCliDiscoveryManifest(overlay) {
  const projection = overlay?.agent_projection;
  if (!projection || !Array.isArray(projection.canonical_roles)) return null;
  const rows = [];
  for (const roleId of projection.canonical_roles) {
    if (typeof roleId !== "string" || roleId.length === 0) return null;
    rows.push({
      role_id: roleId,
      target: "kiro-cli",
      native_role_external_id: `maister-${roleId}`,
    });
  }
  for (const support of projection.support_inventory ?? []) {
    if (!support || typeof support !== "object") continue;
    const nativeId = support.native_role_external_id;
    if (typeof nativeId === "string" && nativeId.length > 0) {
      rows.push({
        role_id: typeof support.support_id === "string" ? support.support_id : nativeId,
        target: "kiro-cli",
        native_role_external_id: nativeId,
      });
    }
  }
  if (rows.length === 0) return null;
  return {
    schema_version: 1,
    target: "kiro-cli",
    adapter_id: "kiro-cli.native",
    representation: "kiro-descriptor-prompt",
    rows,
  };
}

export function probeKiroCli(options = {}) {
  const injectedDiscover = typeof options.discover === "function" ? options.discover : undefined;
  const hybridObservation = injectedDiscover === undefined
    ? observeKiroCliAgentNames(options.kiroHome)
    : null;
  const runScenario = typeof options.runScenario === "function"
    ? options.runScenario
    : typeof options.invoke === "function"
      ? runKiroCliInvocationScenario
      : () => ({ ...KIRO_CLI_LIVE_INVOCATION_UNAVAILABLE, provenance: { ...KIRO_CLI_LIVE_INVOCATION_UNAVAILABLE.provenance } });
  return probeHost({
    ...options,
    target: "kiro-cli",
    command: options.command ?? "kiro-cli",
    discoveryScenario: "kiro-cli-native-inventory-v1",
    scenario: "kiro-cli-native-invocation-v1",
    discover: injectedDiscover
      ? (context) => compareNativeInventory({
        manifest: context.manifest,
        target: "kiro-cli",
        observation: injectedDiscover(context),
      })
      : hybridObservation
        ? (context) => compareNativeInventory({
          manifest: context.manifest,
          target: "kiro-cli",
          observation: hybridObservation,
        })
        : undefined,
    invoke: options.invoke,
    runScenario,
  });
}

/**
 * Collect Kiro CLI hybrid E5 (+ honest E6 unavailable) records for installer evidence.
 * Uses provenance.hostVersion so native evidence binds to the transaction.
 */
export function probeKiroCliForInstall({
  kiroHome,
  overlay,
  provenance,
  clock,
  now,
} = {}) {
  const manifest = kiroCliDiscoveryManifest(overlay);
  if (!manifest || typeof kiroHome !== "string" || kiroHome.length === 0) {
    return null;
  }
  if (!provenance || typeof provenance !== "object") return null;
  const hostVersion = provenance.hostVersion ?? provenance.host_version;
  if (typeof hostVersion !== "string" || hostVersion.length === 0) return null;
  return probeKiroCli({
    kiroHome,
    manifest,
    hostVersion,
    clock,
    now,
    provenance: {
      source_commit: provenance.resolvedCommit ?? provenance.source_commit,
      source_version: provenance.sourceVersion ?? provenance.source_version,
      overlay_id: provenance.overlayId ?? provenance.overlay_id,
      overlay_version: provenance.overlayVersion ?? provenance.overlay_version,
      host: provenance.host ?? "kiro-cli",
      scenario_version: provenance.scenarioVersion ?? provenance.scenario_version ?? "1.0.0",
      schema_version: provenance.agent_projection?.schema_version ?? provenance.schema_version,
      projector_version: provenance.agent_projection?.projector_version ?? provenance.projector_version,
      canonical_set_digest: provenance.agent_projection?.canonical_set_digest ?? provenance.canonical_set_digest,
      manifest_digest: provenance.agent_projection?.manifest_digest ?? provenance.manifest_digest,
      projected_tree_digest: provenance.agent_projection?.projected_tree_digest ?? provenance.projected_tree_digest,
      source_hash: provenance.sourceHash ?? provenance.source_hash,
      overlay_hash: provenance.overlayHash ?? provenance.overlay_hash,
      materialized_hash: provenance.materializedHash ?? provenance.materialized_hash,
      provenance_hash: provenance.provenanceHash ?? provenance.provenance_hash,
    },
  });
}
