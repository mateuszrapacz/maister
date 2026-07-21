export const PI_EXTENSION_SOURCE = `import { createPiExtensionBridge } from "../orchestrator-framework/bin/agent-runtime/host-adapters/pi-native.mjs";

export default function maisterExtension(pi) {
  return createPiExtensionBridge({ pi });
}
`;

