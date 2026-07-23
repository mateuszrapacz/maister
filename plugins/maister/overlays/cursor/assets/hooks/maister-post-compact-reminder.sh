#!/bin/bash
# Reminder after context compaction — point to active in-progress orchestrator-state.yml.

PROJECT_DIR="${CURSOR_PROJECT_DIR:-.}"
TASKS_DIR="$PROJECT_DIR/.maister/tasks"
STATE_HINT=""

is_workflow_in_progress() {
  local f="$1"
  if grep -qE '(^|[[:space:]])status:[[:space:]]*in_progress' "$f" 2>/dev/null; then
    return 0
  fi
  return 1
}

if [ -d "$TASKS_DIR" ]; then
  LATEST_STATE=$(find "$TASKS_DIR" -name orchestrator-state.yml -type f 2>/dev/null | while read -r f; do
    if is_workflow_in_progress "$f"; then
      echo "$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f" 2>/dev/null) $f"
    fi
  done | sort -rn | head -1 | cut -d' ' -f2-)

  if [ -n "$LATEST_STATE" ] && [ -f "$LATEST_STATE" ]; then
    CURRENT_PHASE=$(grep -E '^[[:space:]]*current_phase:' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/^[[:space:]]*current_phase:[[:space:]]*//')
    COMPLETED=$(grep -E '^[[:space:]]*completed_phases:' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/^[[:space:]]*completed_phases:[[:space:]]*//')
    STATE_HINT=" Active workflow: $LATEST_STATE"
    [ -n "$CURRENT_PHASE" ] && STATE_HINT="$STATE_HINT | current_phase: $CURRENT_PHASE"
    [ -n "$COMPLETED" ] && STATE_HINT="$STATE_HINT | completed: $COMPLETED"
  fi
fi

if [ -n "$STATE_HINT" ]; then
  MSG="Maister post-compaction: READ orchestrator-state.yml before continuing.$STATE_HINT Check pending advisor/arbiter/user gates, gate_history, and implementation_approval before resuming. Present gates via AskQuestion when available; if AskQuestion is missing, use an inline chat question with the same options and wait. Never start implementation without explicit approval."
else
  MSG="Maister post-compaction: no in_progress workflow found. If you expected an active Maister task, check .maister/tasks/ for orchestrator-state.yml status. Present gates via AskQuestion when available; otherwise use inline chat with the same options."
fi

jq -n --arg msg "$MSG" '{ "user_message": $msg }'

exit 0
