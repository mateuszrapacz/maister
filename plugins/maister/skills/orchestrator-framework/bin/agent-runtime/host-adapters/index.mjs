import { createCodexExecAdapter } from "./codex-exec.mjs";
import { createCursorAdapter } from "./cursor.mjs";
import { createKiroCliAdapter } from "./kiro-cli.mjs";
import { createPiNativeAdapter } from "./pi-native.mjs";

export function createHostAdapters({ codex, cursor, kiroCli, pi } = {}) {
  const adapters = {};
  if (codex?.workerManager) adapters["codex.exec"] = createCodexExecAdapter(codex);
  if (cursor?.nativePort) adapters["cursor.native"] = createCursorAdapter(cursor);
  if (kiroCli?.nativePort) adapters["kiro-cli.native"] = createKiroCliAdapter(kiroCli);
  if (pi?.nativePort || pi?.eventBus || pi?.delegation) adapters["pi.native"] = createPiNativeAdapter(pi);
  return Object.freeze(adapters);
}
