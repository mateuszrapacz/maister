#!/bin/bash
# Reminder at end of agent turn — verify orchestrator-state.yml consistency (Kiro stop hook).
# Kiro contract: {"decision":"block","reason":"..."} on STDOUT prevents stopping and feeds reason to the LLM.

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')
TASKS_DIR="$PROJECT_DIR/.maister/tasks"

is_workflow_in_progress() {
  local f="$1"
  if grep -qE '(^|[[:space:]])status:[[:space:]]*in_progress' "$f" 2>/dev/null; then
    return 0
  fi
  local phase
  phase=$(grep -E '^current_phase:' "$f" 2>/dev/null | head -1 | sed 's/^current_phase:[[:space:]]*//')
  if [ -n "$phase" ] && [ "$phase" != "completed" ]; then
    return 0
  fi
  return 1
}

LATEST_STATE=""
if [ -d "$TASKS_DIR" ]; then
  LATEST_STATE=$(find "$TASKS_DIR" -name orchestrator-state.yml -type f 2>/dev/null | while read -r f; do
    echo "$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f" 2>/dev/null) $f"
  done | sort -rn | head -1 | cut -d' ' -f2-)
fi

if [ -z "$LATEST_STATE" ] || [ ! -f "$LATEST_STATE" ] || ! is_workflow_in_progress "$LATEST_STATE"; then
  exit 0
fi

CURRENT_PHASE=$(grep -E '^current_phase:' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/^current_phase:[[:space:]]*//')
COMPLETED=$(grep -E '^completed_phases:' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/^completed_phases:[[:space:]]*//')
TASK_STATUS=$(grep -E '(^|[[:space:]])status:[[:space:]]*in_progress' "$LATEST_STATE" 2>/dev/null | head -1 | sed 's/.*status:[[:space:]]*//')

STATE_HINT=" Active workflow: $LATEST_STATE"
[ -n "$CURRENT_PHASE" ] && STATE_HINT="$STATE_HINT | current_phase: $CURRENT_PHASE"
[ -n "$COMPLETED" ] && STATE_HINT="$STATE_HINT | completed: $COMPLETED"
[ -n "$TASK_STATUS" ] && STATE_HINT="$STATE_HINT | status: $TASK_STATUS"

MSG="Maister stop check: before ending this turn, verify orchestrator-state.yml matches work done (phase progress, completed_phases, task status).$STATE_HINT Update state if you finished phase work or advanced gates."

jq -n --arg msg "$MSG" '{"decision": "block", "reason": $msg}'

exit 0
