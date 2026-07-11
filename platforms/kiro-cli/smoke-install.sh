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
#   --set-alias     Add maister-kiro and mk aliases to shell rc
#   --no-alias      Do not add shell aliases (default when non-interactive)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$ROOT/plugins/maister-kiro"
DEFAULT_DEST="${KIRO_HOME:-$HOME/.kiro-maister}"
WRAPPER="$SCRIPT_DIR/maister-kiro"
ALIAS_BEGIN_MARKER='# >>> maister-kiro aliases (managed by smoke-install.sh) >>>'
ALIAS_END_MARKER='# <<< maister-kiro aliases <<<'

SET_DEFAULT=""
SET_ALIAS=""
RTK_ENABLED=0
MCP_PLAYWRIGHT_ENABLED=0
DEST=""

usage() {
  cat <<EOF
Install Maister for Kiro CLI to an isolated KIRO_HOME profile.

Usage: smoke-install.sh [OPTIONS] [DEST]

  DEST              Install directory (default: \$KIRO_HOME or ~/.kiro-maister)
  --set-default     Set chat.defaultAgent=maister for this profile
  --no-default      Do not set chat.defaultAgent (default in CI/non-TTY)
  --set-alias       Add maister-kiro and mk aliases to shell rc
  --no-alias        Do not add shell aliases (default in CI/non-TTY)
  --with-rtk        Install RTK token optimization hook
  --with-mcp-playwright  Install MCP Playwright for --e2e workflows (default: off)
  --full            Shorthand for --set-alias --set-default --with-rtk (Playwright stays opt-in)
  --help            Show this help

Never modifies personal ~/.kiro/ — only the target KIRO_HOME directory.
EOF
}

# Patch hook commands and skill resource paths to use $dest/ (source ships ~/.kiro-maister/*).
fix_hook_paths() {
  local dest="$1"
  [ -d "$dest/agents" ] || return 0

  # If dest is the default, paths already correct
  [[ "$dest" == "$HOME/.kiro-maister" ]] && return 0

  local f tmp
  for f in "$dest"/agents/*.json; do
    [ -f "$f" ] || continue
    tmp="${f}.tmp.$$"
    jq --arg home "$dest" '
      def fix(cmd):
        if (cmd | type) == "string" and (cmd | contains("/hooks/")) then
          ($home + "/hooks/" + (cmd | split("/hooks/") | last))
        else cmd end;
      def fix_res(r):
        if (r | startswith("file://~/.kiro-maister/")) then
          ("file://" + $home + "/" + (r | ltrimstr("file://~/.kiro-maister/")))
        elif (r | startswith("skill://~/.kiro-maister/")) then
          ("skill://" + $home + "/" + (r | ltrimstr("skill://~/.kiro-maister/")))
        else r end;
      if .hooks then
        .hooks |= with_entries(.value |= map(
          if .command then .command = fix(.command) else . end
        ))
      else . end
      | if .resources then
          .resources |= map(fix_res(.))
        else . end
    ' "$f" >"$tmp"
    mv "$tmp" "$f"
  done
}

# Kiro CLI 2.6.0: relative file://./instructions/*.md prompts load for main agents but
# silently fail for subagents (kirodotdev/Kiro#5241, #6100, #7776). Rewrite to absolute
# paths rooted at the install profile so subagent delegation receives system instructions.
fix_prompt_paths() {
  local dest="$1"
  [ -d "$dest/agents" ] || return 0

  local f tmp
  for f in "$dest"/agents/*.json; do
    [ -f "$f" ] || continue
    tmp="${f}.tmp.$$"
    jq --arg home "$dest" '
      if (.prompt | type) == "string" and (.prompt | startswith("file://./")) then
        .prompt = ("file://" + $home + "/agents/" + (.prompt | ltrimstr("file://./")))
      else . end
    ' "$f" >"$tmp"
    mv "$tmp" "$f"
  done
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
  fix_hook_paths "$dest"
  fix_prompt_paths "$dest"
}

prompt_set_default() {
  SET_DEFAULT=1
}

prompt_set_alias() {
  SET_ALIAS=1
}

detect_shell_rc() {
  if [ -n "${MAISTER_SHELL_RC:-}" ]; then
    echo "$MAISTER_SHELL_RC"
    return 0
  fi
  case "$(basename "${SHELL:-}")" in
    zsh) echo "$HOME/.zshrc" ;;
    bash)
      if [ -f "$HOME/.bashrc" ]; then
        echo "$HOME/.bashrc"
      else
        echo "$HOME/.bash_profile"
      fi
      ;;
    *) echo "$HOME/.zshrc" ;;
  esac
}

remove_alias_block() {
  local rc="$1"
  local tmp
  tmp=$(mktemp)
  awk -v begin="$ALIAS_BEGIN_MARKER" -v end="$ALIAS_END_MARKER" '
    $0 == begin { inblock=1; next }
    $0 == end { inblock=0; next }
    !inblock { print }
  ' "$rc" >"$tmp"
  mv "$tmp" "$rc"
}

write_alias_block() {
  local dest="$1"
  cat <<EOF
$ALIAS_BEGIN_MARKER
# Maister Kiro CLI — isolated profile ($dest)
alias maister-kiro='KIRO_HOME="$dest" $WRAPPER'
alias mk='maister-kiro chat --trust-all-tools --agent maister'
$ALIAS_END_MARKER
EOF
}

install_shell_aliases() {
  local dest="$1"
  local rc
  rc=$(detect_shell_rc)
  mkdir -p "$(dirname "$rc")"
  touch "$rc"

  if grep -qF "$ALIAS_BEGIN_MARKER" "$rc"; then
    remove_alias_block "$rc"
  fi

  {
    echo ""
    write_alias_block "$dest"
    echo ""
  } >>"$rc"

  echo "Shell aliases installed in $rc (maister-kiro, mk)"
  echo "Run: source $rc   (or open a new terminal)"
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
      --no-alias)
        SET_ALIAS=0
        shift
        ;;
      --no-rtk)
        RTK_ENABLED=0
        shift
        ;;
      --with-rtk)
        RTK_ENABLED=1
        shift
        ;;
      --with-mcp-playwright)
        MCP_PLAYWRIGHT_ENABLED=1
        shift
        ;;
      --no-mcp-playwright)
        MCP_PLAYWRIGHT_ENABLED=0
        shift
        ;;
      --full)
        SET_ALIAS=1
        SET_DEFAULT=1
        RTK_ENABLED=1
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

  if [ -z "$SET_ALIAS" ]; then
    prompt_set_alias
  fi

  install_to "$DEST"

  if [ "$RTK_ENABLED" = "0" ]; then
    rm -f "$DEST/hooks/rtk-rewrite.sh"
    local mj="$DEST/agents/maister.json"
    if [ -f "$mj" ]; then
      local tmp="${mj}.tmp.$$"
      jq '.hooks.preToolUse |= map(select(.command | contains("rtk-rewrite") | not))' "$mj" >"$tmp"
      mv "$tmp" "$mj"
    fi
  fi

  if [ "$MCP_PLAYWRIGHT_ENABLED" = "0" ]; then
    rm -f "$DEST/settings/mcp.json"
    local mj="$DEST/agents/maister.json"
    if [ -f "$mj" ]; then
      local tmp="${mj}.tmp.$$"
      jq 'del(.includeMcpJson)' "$mj" >"$tmp"
      mv "$tmp" "$mj"
    fi
  fi

  apply_default_agent "$DEST"

  if [ "$SET_ALIAS" = "1" ]; then
    install_shell_aliases "$DEST"
  fi

  echo "Done."
  echo "KIRO_HOME=$DEST"
  if [ "$SET_ALIAS" = "1" ]; then
    echo "Run: mk   (from your project directory)"
  else
    echo "Run: KIRO_HOME=\"$DEST\" $WRAPPER chat"
    echo "Or:  $WRAPPER chat  (when KIRO_HOME defaults to ~/.kiro-maister)"
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
