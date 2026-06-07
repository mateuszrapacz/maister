#!/usr/bin/env bash
# Install plugins/maister-kiro to an isolated KIRO_HOME profile (never merges into ~/.kiro/).
#
# Usage:
#   smoke-install.sh [OPTIONS] [DEST]
#
# Default DEST: $KIRO_HOME or ~/.kiro-maister
#
# Options:
#   --help          Show usage
#   --set-default   Set chat.defaultAgent to maister in this profile
#   --no-default    Do not set chat.defaultAgent (default when non-interactive)
#   --set-alias     Print shell alias for maister-kiro wrapper
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$ROOT/plugins/maister-kiro"
DEFAULT_DEST="${KIRO_HOME:-$HOME/.kiro-maister}"

SET_DEFAULT=""
SET_ALIAS=0
DEST=""

usage() {
  cat <<EOF
Install Maister for Kiro CLI to an isolated KIRO_HOME profile.

Usage: smoke-install.sh [OPTIONS] [DEST]

  DEST              Install directory (default: \$KIRO_HOME or ~/.kiro-maister)
  --set-default     Set chat.defaultAgent=maister for this profile
  --no-default      Do not set chat.defaultAgent (default in CI/non-TTY)
  --set-alias       Print suggested shell alias after install
  --help            Show this help

Never modifies personal ~/.kiro/ — only the target KIRO_HOME directory.
EOF
}

# Kiro CLI runtime fixes applied at install/smoke time (empirical API).
# - promptFile → prompt with file:// URI
# - model "inherit" → removed (not valid in kiro-cli headless)
fix_agent_prompts() {
  local root="$1"
  local f pf tmp
  for f in "$root"/agents/*.json; do
    [ -f "$f" ] || continue
    tmp="${f}.tmp.$$"
    jq '
      if .promptFile then
        .prompt = "file://./" + .promptFile | del(.promptFile)
      else . end
      | if .model == "inherit" then del(.model) else . end
    ' "$f" >"$tmp"
    mv "$tmp" "$f"
  done
}

# Patch hook commands to absolute $KIRO_HOME/hooks/ if ../hooks/*.sh does not resolve.
fix_hook_paths() {
  local dest="$1"
  local agent="$dest/agents/maister.json"
  [ -f "$agent" ] || return 0

  if (cd "$dest/agents" && [ -x "../hooks/skill-invocation-reminder.sh" ]); then
    return 0
  fi

  local tmp="${agent}.tmp.$$"
  jq --arg home "$dest" '
    def abs_hook(cmd):
      if (cmd | type) == "string" and (cmd | startswith("../hooks/")) then
        ($home + "/hooks/" + (cmd | ltrimstr("../hooks/")))
      else cmd end;
    if .hooks then
      .hooks |= with_entries(.value |= map(
        if .command then .command = abs_hook(.command) else . end
      ))
    else . end
  ' "$agent" >"$tmp"
  mv "$tmp" "$agent"
}

install_to() {
  local dest="$1"
  if [ "$dest" = "$HOME/.kiro" ]; then
    echo "FAIL: refusing to install into personal ~/.kiro/ — use ~/.kiro-maister or a temp dir" >&2
    exit 1
  fi

  echo "Building..."
  make -C "$ROOT" build-kiro

  echo "Installing to $dest"
  mkdir -p "$dest"
  rm -rf "${dest:?}/"*
  cp -R "$SOURCE/." "$dest/"
  fix_agent_prompts "$dest"
  fix_hook_paths "$dest"
}

prompt_set_default() {
  if [ -t 0 ] && [ -t 1 ]; then
    local answer
    read -r -p "Set chat.defaultAgent=maister for this profile? [y/N] " answer
    case "$answer" in
      [yY]|[yY][eE][sS]) SET_DEFAULT=1 ;;
      *) SET_DEFAULT=0 ;;
    esac
  else
    SET_DEFAULT=0
  fi
}

apply_default_agent() {
  local dest="$1"
  if [ "$SET_DEFAULT" = "1" ] && command -v kiro-cli >/dev/null 2>&1; then
    echo "Setting chat.defaultAgent=maister"
    KIRO_HOME="$dest" kiro-cli settings chat.defaultAgent maister --global 2>/dev/null || \
      KIRO_HOME="$dest" kiro-cli settings chat.defaultAgent maister 2>/dev/null || \
      echo "Note: could not set chat.defaultAgent — use: maister-kiro chat --agent maister"
  fi
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h)
        usage
        exit 0
        ;;
      --set-default)
        SET_DEFAULT=1
        shift
        ;;
      --no-default)
        SET_DEFAULT=0
        shift
        ;;
      --set-alias)
        SET_ALIAS=1
        shift
        ;;
      -*)
        echo "Unknown option: $1" >&2
        usage >&2
        exit 1
        ;;
      *)
        DEST="$1"
        shift
        ;;
    esac
  done

  if [ -z "$DEST" ]; then
    DEST="$DEFAULT_DEST"
  fi

  if [ -z "$SET_DEFAULT" ]; then
    prompt_set_default
  fi

  install_to "$DEST"
  apply_default_agent "$DEST"

  echo "Done."
  echo "KIRO_HOME=$DEST"
  echo "Run: KIRO_HOME=\"$DEST\" $SCRIPT_DIR/maister-kiro chat --agent maister"
  echo "Or:  $SCRIPT_DIR/maister-kiro chat --agent maister  (when KIRO_HOME defaults to ~/.kiro-maister)"

  if [ "$SET_ALIAS" -eq 1 ]; then
    echo ""
    echo "Suggested alias:"
    echo "  alias maister-kiro='KIRO_HOME=\"$DEST\" $SCRIPT_DIR/maister-kiro'"
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
