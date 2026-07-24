#!/usr/bin/env bash
set -euo pipefail

INPUT="$(cat)"
CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // empty')"
[ -n "$CWD" ] || CWD="$(pwd)"

if git -C "$CWD" rev-parse --show-toplevel >/dev/null 2>&1; then
  ROOT="$(git -C "$CWD" rev-parse --show-toplevel)"
else
  ROOT="$CWD"
fi

if [ -d "$ROOT/.maister/tasks" ]; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Maister workflow detected. After compaction, read the active .maister/tasks/*/orchestrator-state.yml before continuing. Preserve the phase state and use plain-text user gates at workflow checkpoints."
  }
}
EOF
fi
