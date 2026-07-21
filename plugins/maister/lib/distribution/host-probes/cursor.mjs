import fs from "node:fs";
import path from "node:path";

import { compareNativeInventory, probeHost } from "./base.mjs";
import { runCursorInvocationScenario } from "./scenarios/cursor.mjs";

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

export function probeCursor(options = {}) {
  const injectedDiscover = typeof options.discover === "function" ? options.discover : undefined;
  const hybridObservation = injectedDiscover === undefined
    ? observePluginAgentNames(options.pluginRoot)
    : null;
  return probeHost({
    ...options,
    target: "cursor",
    command: "agent",
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
    runScenario: runCursorInvocationScenario,
  });
}
