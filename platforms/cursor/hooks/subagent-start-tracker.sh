#!/bin/bash
# Track active subagents for best-effort shell correlation in preToolUse / beforeShellExecution.
# subagentStart provides subagent_id, subagent_type, and parent_conversation_id reliably.

INPUT=$(cat)
STATE_DIR="${CURSOR_PLUGIN_ROOT}/.hook-state"
SUBAGENT_ID=$(echo "$INPUT" | jq -r '.subagent_id // empty')
SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.subagent_type // empty')
PARENT_CONV=$(echo "$INPUT" | jq -r '.parent_conversation_id // .conversation_id // empty')

mkdir -p "$STATE_DIR"

if [ -n "$SUBAGENT_ID" ] && [ -n "$SUBAGENT_TYPE" ]; then
  echo "$SUBAGENT_TYPE" > "$STATE_DIR/subagent-${SUBAGENT_ID}.type"
  if [ -n "$PARENT_CONV" ]; then
    echo "$PARENT_CONV" > "$STATE_DIR/subagent-${SUBAGENT_ID}.parent"
    if ! grep -qxF "$SUBAGENT_ID" "$STATE_DIR/conv-${PARENT_CONV}.active" 2>/dev/null; then
      echo "$SUBAGENT_ID" >> "$STATE_DIR/conv-${PARENT_CONV}.active"
    fi
  fi
fi

exit 0
