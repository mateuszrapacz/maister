#!/bin/bash
# Track active subagents on preToolUse subagent matcher for bash guard context.

INPUT=$(cat)
HOOK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${HOOK_ROOT}/.hook-state"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.agent // .tool_input.name // .tool_input.subagent_type // empty')

mkdir -p "$STATE_DIR"

if [ -n "$AGENT_TYPE" ]; then
  echo "$AGENT_TYPE" > "$STATE_DIR/active-agent.type"
  if [ -n "$SESSION_ID" ]; then
    echo "$AGENT_TYPE" > "$STATE_DIR/session-${SESSION_ID}.type"
  fi
fi

exit 0
