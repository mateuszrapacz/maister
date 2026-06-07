#!/bin/bash
# Clear subagent tracking state after subagent tool completes (postToolUse subagent matcher).

INPUT=$(cat)
HOOK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${HOOK_ROOT}/.hook-state"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

rm -f "$STATE_DIR/active-agent.type"

if [ -n "$SESSION_ID" ]; then
  rm -f "$STATE_DIR/session-${SESSION_ID}.type"
fi

exit 0
