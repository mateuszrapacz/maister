import { probeCodex } from "./codex.mjs";
import { probeCursor } from "./cursor.mjs";
import { probeKiroCli } from "./kiro-cli.mjs";
import { probePi } from "./pi.mjs";
import { DEFAULT_TIMEOUT_MS, HostProbeTimeoutError, MAX_TIMEOUT_MS } from "./base.mjs";
import { SUPPORTED_TARGET_IDS, getTargetDefinition } from "../targets.mjs";

const PROBE_IMPLEMENTATIONS = Object.freeze({
  codex: probeCodex,
  cursor: probeCursor,
  "kiro-cli": probeKiroCli,
  pi: probePi,
});
const PROBES = Object.freeze(Object.fromEntries(
  SUPPORTED_TARGET_IDS.map((target) => [target, PROBE_IMPLEMENTATIONS[getTargetDefinition(target).probe]]),
));

export function probeTarget(target, options = {}) {
  const probe = PROBES[target];
  if (!probe) throw new Error(`unsupported target: ${target}`);
  return probe(options);
}

export {
  DEFAULT_TIMEOUT_MS,
  HostProbeTimeoutError,
  MAX_TIMEOUT_MS,
  PROBES,
  probeCodex,
  probeCursor,
  probeKiroCli,
  probePi,
};

export { cursorHybridDiscoveryManifest, probeCursorForInstall } from "./cursor.mjs";
export { kiroCliDiscoveryManifest, probeKiroCliForInstall } from "./kiro-cli.mjs";

