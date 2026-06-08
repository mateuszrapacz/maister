#!/usr/bin/env bash
# RTK preToolUse hook — blocks raw shell commands when rtk can optimize them.
# Only active when rtk binary is in PATH.
# RTK exit codes: 0=allow, 1=passthrough, 2=deny, 3=ask(rewrite available)

command -v rtk &>/dev/null || exit 0

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

case "$TOOL_NAME" in
  shell|execute_bash|execute_cmd) ;;
  *) exit 0 ;;
esac

CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

REWRITTEN=$(rtk rewrite "$CMD" 2>/dev/null)
RTK_EXIT=$?

# Exit 0 or 3 = rewrite available; check if actually different
case $RTK_EXIT in
  0|3)
    [ "$CMD" = "$REWRITTEN" ] && exit 0
    echo "Use \`$REWRITTEN\` instead for token savings (RTK auto-filter)." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
