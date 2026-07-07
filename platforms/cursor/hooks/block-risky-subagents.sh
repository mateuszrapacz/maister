#!/bin/bash
# subagentStart gate: allow only maister-* custom agents and an explicit built-in allowlist.
#
# Cursor beforeShellExecution does not expose subagent identity (command/cwd/sandbox only).
# subagentStart is the reliable hook for subagent-type policy; write-capable maister agents
# are tracked by subagent-start-tracker.sh for best-effort shell correlation via preToolUse.

INPUT=$(cat)
SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.subagent_type // empty')

# Built-in Cursor subagent types the plugin intentionally uses (see source skills/agents).
case "$SUBAGENT_TYPE" in
  generalPurpose|general-purpose|shell|explore|Explore)
    exit 0
    ;;
esac

# Maister custom agents (Task tool subagent_type after build transform).
case "$SUBAGENT_TYPE" in
  maister-*|maister:*)
    exit 0
    ;;
esac

cat <<EOF
{
  "permission": "deny",
  "user_message": "Subagent type '$SUBAGENT_TYPE' is not allowed by the maister plugin. Use maister-* custom agents via the Task tool."
}
EOF
exit 0
