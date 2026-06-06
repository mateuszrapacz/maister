#!/bin/bash
# Block destructive shell commands from subagents.
# Uses subagentStart tracking + optional subagent_type on hook input.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // .tool_input.command // empty')
CONV_ID=$(echo "$INPUT" | jq -r '.conversation_id // empty')
STATE_DIR="${CURSOR_PLUGIN_ROOT}/.hook-state"

AGENT_TYPE=$(echo "$INPUT" | jq -r '.subagent_type // .agent_type // empty')

# Resolve agent type from subagentStart tracker
if [ -z "$AGENT_TYPE" ] && [ -n "$CONV_ID" ]; then
  if [ -f "$STATE_DIR/subagent-${CONV_ID}.type" ]; then
    AGENT_TYPE=$(cat "$STATE_DIR/subagent-${CONV_ID}.type")
  elif [ -f "$STATE_DIR/conv-${CONV_ID}.active" ]; then
    while read -r sid; do
      if [ -f "$STATE_DIR/subagent-${sid}.type" ]; then
        AGENT_TYPE=$(cat "$STATE_DIR/subagent-${sid}.type")
        break
      fi
    done < "$STATE_DIR/conv-${CONV_ID}.active"
  fi
fi

# Main agent — allow
if [ -z "$AGENT_TYPE" ]; then
  exit 0
fi

case "$AGENT_TYPE" in
  test-suite-runner|e2e-test-verifier|user-docs-generator|docs-operator|maister-test-suite-runner|maister-e2e-test-verifier|maister-user-docs-generator|maister-docs-operator)
    exit 0
    ;;
esac

if echo "$COMMAND" | grep -qEi 'git\s+stash|git\s+reset\s+--hard|git\s+checkout\s+--\s+\.|git\s+checkout\s+\.\s*$|git\s+clean|git\s+push\s+(-f|--force)|rm\s+-rf'; then
  cat <<EOF
{
  "permission": "deny",
  "user_message": "Destructive command blocked for subagent '$AGENT_TYPE'.",
  "agent_message": "Destructive command blocked for agent '$AGENT_TYPE': ${COMMAND:0:80}. Use safer alternatives or escalate to the main agent."
}
EOF
  exit 0
fi

exit 0
