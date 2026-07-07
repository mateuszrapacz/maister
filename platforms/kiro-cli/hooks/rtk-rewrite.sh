#!/usr/bin/env bash
# rtk-hook-version: 3
# RTK Kiro CLI preToolUse hook — suggests RTK-optimized shell commands for token savings.
# Requires: rtk >= 0.23.0, jq
#
# Kiro contract (no hookSpecificOutput): block with STDERR + exit 2 so the agent
# re-runs using the suggested command. See kiro.dev/docs/cli/hooks.md.
#
# Exit code protocol for `rtk rewrite` (RTK single source of truth):
#   0 + stdout  Allow — rewrite found, safe to auto-allow (Claude/Cursor)
#   1           No RTK equivalent — pass through unchanged
#   2           Deny rule matched — pass through (native deny handles it)
#   3 + stdout  Ask/Default — rewrite available, prompt user (Claude/Cursor)

if ! command -v jq &>/dev/null; then
  echo "[rtk] WARNING: jq is not installed. Hook cannot rewrite commands." >&2
  exit 0
fi

if ! command -v rtk &>/dev/null; then
  exit 0
fi

# Version guard: rtk rewrite requires >= 0.23.0
CACHE_DIR=${XDG_CACHE_HOME:-$HOME/.cache}
CACHE_FILE="$CACHE_DIR/rtk-hook-version-ok"
if [ ! -f "$CACHE_FILE" ]; then
  RTK_VERSION_RAW=$(rtk --version 2>/dev/null)
  RTK_VERSION=${RTK_VERSION_RAW#rtk }
  RTK_VERSION=${RTK_VERSION%% *}
  if [ -n "$RTK_VERSION" ]; then
    IFS=. read -r MAJOR MINOR _ <<<"$RTK_VERSION"
    if [ "$MAJOR" -eq 0 ] && [ "$MINOR" -lt 23 ]; then
      echo "[rtk] WARNING: rtk $RTK_VERSION is too old (need >= 0.23.0)." >&2
      exit 0
    fi
  fi
  mkdir -p "$CACHE_DIR" 2>/dev/null
  touch "$CACHE_FILE" 2>/dev/null
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

case "$TOOL_NAME" in
  shell|execute_bash|execute_cmd) ;;
  *) exit 0 ;;
esac

CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

# Already using RTK — pass through
case "$CMD" in
  rtk\ *) exit 0 ;;
esac

REWRITTEN=$(rtk rewrite "$CMD" 2>/dev/null)
EXIT_CODE=$?

case $EXIT_CODE in
  0|3)
    [ "$CMD" = "$REWRITTEN" ] && exit 0
    echo "Use \`$REWRITTEN\` instead for token savings (RTK auto-filter)." >&2
    exit 2
    ;;
  1|2)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
