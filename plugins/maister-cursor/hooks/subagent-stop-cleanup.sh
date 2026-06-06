#!/bin/bash
# Clear subagent tracking state when a subagent finishes.

INPUT=$(cat)
STATE_DIR="${CURSOR_PLUGIN_ROOT}/.hook-state"
SUBAGENT_ID=$(echo "$INPUT" | jq -r '.subagent_id // empty')
PARENT_CONV=$(echo "$INPUT" | jq -r '.parent_conversation_id // .conversation_id // empty')

if [ -n "$SUBAGENT_ID" ]; then
  rm -f "$STATE_DIR/subagent-${SUBAGENT_ID}.type"
fi

if [ -n "$PARENT_CONV" ] && [ -f "$STATE_DIR/conv-${PARENT_CONV}.active" ]; then
  if [ -n "$SUBAGENT_ID" ]; then
    grep -vxF "$SUBAGENT_ID" "$STATE_DIR/conv-${PARENT_CONV}.active" > "$STATE_DIR/conv-${PARENT_CONV}.active.tmp" 2>/dev/null || true
    if [ -s "$STATE_DIR/conv-${PARENT_CONV}.active.tmp" ]; then
      mv "$STATE_DIR/conv-${PARENT_CONV}.active.tmp" "$STATE_DIR/conv-${PARENT_CONV}.active"
    else
      rm -f "$STATE_DIR/conv-${PARENT_CONV}.active" "$STATE_DIR/conv-${PARENT_CONV}.active.tmp"
    fi
  fi
fi

exit 0
