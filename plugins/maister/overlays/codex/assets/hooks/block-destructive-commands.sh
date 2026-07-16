#!/usr/bin/env bash
set -euo pipefail

# Defense-in-depth only. Codex sandbox and approval policy remain the primary
# security boundary, and PreToolUse does not intercept every execution path.
INPUT="$(cat)"
AGENT_TYPE="$(printf '%s' "$INPUT" | jq -r '.agent_type // empty')"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"

# The root session has no agent_type. Let the user's Codex permission policy
# govern it; this hook protects delegated subagents only.
if [ -z "$AGENT_TYPE" ]; then
  exit 0
fi

case "$AGENT_TYPE" in
  test-suite-runner|e2e-test-verifier|user-docs-generator|docs-operator)
    exit 0
    ;;
esac

if printf '%s' "$COMMAND" | grep -qEi 'git\s+stash|git\s+reset\s+--hard|git\s+checkout\s+--\s+\.|git\s+checkout\s+\.\s*$|git\s+clean|git\s+push\s+(-f|--force)|rm\s+-rf'; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked for delegated agent '${AGENT_TYPE}': ${COMMAND:0:80}"
  }
}
EOF
fi
