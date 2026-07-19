import { createCodexExecAdapter } from "./codex-exec.mjs";
import { createCursorAdapter } from "./cursor.mjs";
import { createKiroCliAdapter } from "./kiro-cli.mjs";

export function createHostAdapters({ codex, cursor, kiroCli } = {}) {
  const adapters = {};
  if (codex?.workerManager) adapters["codex.exec"] = createCodexExecAdapter(codex);
  if (cursor?.nativePort) adapters["cursor.native"] = createCursorAdapter(cursor);
  if (kiroCli?.nativePort) adapters["kiro-cli.native"] = createKiroCliAdapter(kiroCli);
  return Object.freeze(adapters);
}
