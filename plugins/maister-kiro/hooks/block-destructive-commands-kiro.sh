#!/bin/bash
# Block destructive shell commands from subagents (Kiro preToolUse shell matcher).
# Uses subagent spawn tracker state + agent_type on hook input.
# Kiro blocking: write message to STDERR and exit 2 (not JSON permission).

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
HOOK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${HOOK_ROOT}/.hook-state"

AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // .tool_input.agent // empty')

if [ -z "$AGENT_TYPE" ] && [ -n "$SESSION_ID" ] && [ -f "$STATE_DIR/session-${SESSION_ID}.type" ]; then
  AGENT_TYPE=$(cat "$STATE_DIR/session-${SESSION_ID}.type")
fi

if [ -z "$AGENT_TYPE" ] && [ -f "$STATE_DIR/active-agent.type" ]; then
  AGENT_TYPE=$(cat "$STATE_DIR/active-agent.type")
fi

is_destructive() {
  echo "$COMMAND" | grep -qEi 'git\s+stash|git\s+reset\s+--hard|git\s+checkout\s+--\s+\.|git\s+checkout\s+\.\s*$|git\s+clean|git\s+push\s+(-f|--force)|rm\s+-rf'
}

if ! is_destructive; then
  exit 0
fi

# Main orchestrator may run destructive commands when no subagent context is active.
if [ -z "$AGENT_TYPE" ] || [ "$AGENT_TYPE" = "maister" ]; then
  exit 0
fi

case "$AGENT_TYPE" in
  *test-suite-runner*|*e2e-test-verifier*|*user-docs-generator*|*docs-operator*)
    exit 0
    ;;
esac

echo "Destructive command blocked for subagent '$AGENT_TYPE': ${COMMAND:0:80}. Use safer alternatives or escalate to the main agent." >&2
exit 2
