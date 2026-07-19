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
].map((definition) => Object.freeze(definition));

export const SUPPORTED_TARGETS = Object.freeze(definitions);
export const SUPPORTED_TARGET_IDS = Object.freeze(definitions.map(({ id }) => id));

const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));

export function getTargetDefinition(target) {
  return definitionsById.get(target);
}
