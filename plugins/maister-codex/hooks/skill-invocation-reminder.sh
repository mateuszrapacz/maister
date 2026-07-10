#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Maister plugin rule: when a user explicitly invokes a maister:* skill, load that skill before analyzing the task. For orchestrator workflows, preserve phase gates as plain-text user questions; keep orchestrator-state.yml as the source of truth for phase progress and resume."
  }
}
EOF
