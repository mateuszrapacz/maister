#!/bin/bash
# Remove stale subagent tracking files when a session ends abnormally.

STATE_DIR="${CURSOR_PLUGIN_ROOT}/.hook-state"

if [ -d "$STATE_DIR" ]; then
  find "$STATE_DIR" -type f ! -name '.gitignore' -delete 2>/dev/null || true
fi

exit 0
