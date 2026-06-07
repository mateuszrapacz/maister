#!/bin/bash
# STUB: Kiro CLI has no preCompact hook equivalent (see steering/maister-workflows.md).
# Not wired in agents/maister.json — manual/orchestrator guidance only.
# Adapted from Cursor post-compact-reminder.sh for future parity if Kiro adds compaction hooks.

PROJECT_DIR="${KIRO_PROJECT_DIR:-.}"
TASKS_DIR="$PROJECT_DIR/.maister/tasks"
STATE_HINT=""

if [ -d "$TASKS_DIR" ]; then
  LATEST_STATE=$(find "$TASKS_DIR" -name orchestrator-state.yml -type f 2>/dev/null | while read -r f; do
    echo "$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f" 2>/dev/null) $f"
  done | sort -rn | head -1 | cut -d' ' -f2-)

  if [ -n "$LATEST_STATE" ] && [ -f "$LATEST_STATE" ]; then
    CURRENT_PHASE=$(grep -E '^current_phase:' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/^current_phase:[[:space:]]*//')
    COMPLETED=$(grep -E '^completed_phases:' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/^completed_phases:[[:space:]]*//')
    STATE_HINT=" Active workflow: $LATEST_STATE"
    [ -n "$CURRENT_PHASE" ] && STATE_HINT="$STATE_HINT | current_phase: $CURRENT_PHASE"
    [ -n "$COMPLETED" ] && STATE_HINT="$STATE_HINT | completed: $COMPLETED"
  fi
fi

if [ -n "$STATE_HINT" ]; then
  MSG="Maister post-compaction (manual): READ orchestrator-state.yml before continuing.$STATE_HINT Use **CHAT GATE** at phase gates."
else
  MSG="Maister post-compaction (manual): if a workflow was in progress, read orchestrator-state.yml in .maister/tasks/ and use **CHAT GATE** at phase gates."
fi

jq -n --arg msg "$MSG" '{ "user_message": $msg }'

exit 0
