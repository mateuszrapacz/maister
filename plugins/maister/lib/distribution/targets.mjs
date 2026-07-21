function managedRoot(rootId, discoveryRoot, ownership) {
  return Object.freeze({ rootId, discoveryRoot, ownership });
}

const definitions = [
  {
    id: "codex",
    overlayId: "maister/codex",
    discoveryRoot: ".codex/plugins/local/maister",
    managedRoots: Object.freeze([
      managedRoot("plugin_private", ".codex/plugins/local/maister", "whole_tree"),
    ]),
    probe: "codex",
    probeCommand: "codex",
  },
  {
    id: "cursor",
    overlayId: "maister/cursor",
    discoveryRoot: ".cursor/plugins/local/maister",
    managedRoots: Object.freeze([
      managedRoot("plugin_private", ".cursor/plugins/local/maister", "whole_tree"),
    ]),
    probe: "cursor",
    probeCommand: "agent",
  },
  {
    id: "kiro-cli",
    overlayId: "maister/kiro-cli",
    discoveryRoot: ".kiro-maister",
    managedRoots: Object.freeze([
      managedRoot("plugin_private", ".kiro-maister", "whole_tree"),
      managedRoot("kiro_native_agents", ".kiro/agents", "leaf_set"),
    ]),
    probe: "kiro-cli",
    probeCommand: "kiro-cli",
  },
  {
    id: "pi",
    overlayId: "maister/pi",
    discoveryRoot: ".pi/agent/maister",
    managedRoots: Object.freeze([
      managedRoot("plugin_private", ".pi/agent/maister", "whole_tree"),
    ]),
    probe: "pi",
    probeCommand: "pi",
    adapterId: "pi.native",
    projectionId: "pi.native",
    platform: "posix",
    pathPolicy: Object.freeze({
      agentRootEnv: "PI_CODING_AGENT_DIR",
      defaultAgentRoot: ".pi/agent",
      settingsPath: "settings.json",
      sessionRootEnv: "PI_CODING_AGENT_SESSION_DIR",
      packageRootEnv: "PI_PACKAGE_DIR",
      packagePath: "maister",
    }),
    compatibility: Object.freeze({
      pi: "0.80.10",
      node: "25.9.0",
      piSubagents: "0.35.1",
      delegationProtocol: 1,
    }),
    probes: Object.freeze({
      executable: "pi",
      prerequisite: "pi-subagents",
    }),
  },
].map((definition) => Object.freeze(definition));

export const SUPPORTED_TARGETS = Object.freeze(definitions);
export const SUPPORTED_TARGET_IDS = Object.freeze(definitions.map(({ id }) => id));

const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));

export function getTargetDefinition(target) {
  return definitionsById.get(target);
}
