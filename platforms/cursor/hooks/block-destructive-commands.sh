#!/bin/bash
# Block destructive shell commands from subagents (best-effort on Cursor).
#
# LIMITATIONS (Cursor hooks contract):
#   - beforeShellExecution event payload is only { command, cwd, sandbox } — no subagent
#     identity. Common hook fields such as conversation_id are not documented for this event
#     and must not be relied on.
#   - preToolUse (matcher: Shell) includes conversation_id and is the primary enforcement
#     path. Agent type is inferred from subagentStart tracker state, not from the shell hook.
#   - When multiple subagents share a parent conversation (parallel implementer waves),
#     attribution is ambiguous — the hook fail-opens (allows) rather than block the main agent.
#   - The main agent is never blocked here; use Cursor permissions / user approval for that.
#
# Whitelist (full destructive Bash): test-suite-runner, e2e-test-verifier,
# user-docs-generator, docs-operator (and maister-* prefixed variants).
# task-group-implementer is NOT whitelisted.

INPUT=$(cat)
STATE_DIR="${CURSOR_PLUGIN_ROOT}/.hook-state"

COMMAND=$(echo "$INPUT" | jq -r '.command // .tool_input.command // empty')
CONV_ID=$(echo "$INPUT" | jq -r '.conversation_id // empty')

resolve_agent_type() {
  local conv_id="$1"
  local agent_type=""

  if [ -z "$conv_id" ]; then
    return 0
  fi

  if [ -f "$STATE_DIR/subagent-${conv_id}.type" ]; then
    agent_type=$(cat "$STATE_DIR/subagent-${conv_id}.type")
    echo "$agent_type"
    return 0
  fi

  if [ -f "$STATE_DIR/conv-${conv_id}.active" ]; then
    local active_file="$STATE_DIR/conv-${conv_id}.active"
    local count
    count=$(grep -cve '^[[:space:]]*$' "$active_file" 2>/dev/null || echo 0)
    if [ "$count" -eq 1 ]; then
      local sid
      sid=$(grep -v '^[[:space:]]*$' "$active_file" | head -n 1)
      if [ -n "$sid" ] && [ -f "$STATE_DIR/subagent-${sid}.type" ]; then
        agent_type=$(cat "$STATE_DIR/subagent-${sid}.type")
        echo "$agent_type"
        return 0
      fi
    fi
  fi

  if [ -f "$STATE_DIR/subagent-${conv_id}.parent" ]; then
    local parent_conv
    parent_conv=$(cat "$STATE_DIR/subagent-${conv_id}.parent")
    if [ -n "$parent_conv" ] && [ -f "$STATE_DIR/conv-${parent_conv}.active" ]; then
      local active_file="$STATE_DIR/conv-${parent_conv}.active"
      local count
      count=$(grep -cve '^[[:space:]]*$' "$active_file" 2>/dev/null || echo 0)
      if [ "$count" -eq 1 ]; then
        local sid
        sid=$(grep -v '^[[:space:]]*$' "$active_file" | head -n 1)
        if [ -n "$sid" ] && [ -f "$STATE_DIR/subagent-${sid}.type" ]; then
          agent_type=$(cat "$STATE_DIR/subagent-${sid}.type")
          echo "$agent_type"
          return 0
        fi
      fi
    fi
  fi

  return 0
}

normalize_agent_type() {
  local t="$1"
  t="${t#maister-}"
  t="${t#maister:}"
  echo "$t"
}

is_whitelisted_agent() {
  local normalized
  normalized=$(normalize_agent_type "$1")
  case "$normalized" in
    test-suite-runner|e2e-test-verifier|user-docs-generator|docs-operator)
      return 0
      ;;
  esac
  return 1
}

is_destructive_command() {
  echo "$COMMAND" | grep -qEi \
    'git[[:space:]]+stash|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+checkout[[:space:]]+--[[:space:]]+\.|git[[:space:]]+checkout[[:space:]]+\.[[:space:]]*$|git[[:space:]]+clean|git[[:space:]]+push[[:space:]]+(-f|--force)|rm[[:space:]]+-rf'
}

AGENT_TYPE=$(resolve_agent_type "$CONV_ID")

# Main agent or unattributed shell — allow (never blanket-block main agent).
if [ -z "$AGENT_TYPE" ]; then
  exit 0
fi

if is_whitelisted_agent "$AGENT_TYPE"; then
  exit 0
fi

if ! is_destructive_command; then
  exit 0
fi

cat <<EOF
{
  "permission": "deny",
  "user_message": "Destructive command blocked for subagent '$AGENT_TYPE'.",
  "agent_message": "Destructive command blocked for agent '$AGENT_TYPE': ${COMMAND:0:80}. Use safer alternatives or escalate to the main agent."
}
EOF
exit 0
