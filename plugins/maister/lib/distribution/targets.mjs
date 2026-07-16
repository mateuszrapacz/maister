const definitions = [
  {
    id: "codex",
    overlayId: "maister/codex",
    discoveryRoot: ".codex/plugins/local/maister",
    probe: "codex",
    probeCommand: "codex",
  },
  {
    id: "cursor",
    overlayId: "maister/cursor",
    discoveryRoot: ".cursor/plugins/local/maister",
    probe: "cursor",
    probeCommand: "agent",
  },
  {
    id: "kiro-cli",
    overlayId: "maister/kiro-cli",
    discoveryRoot: ".kiro-maister",
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
