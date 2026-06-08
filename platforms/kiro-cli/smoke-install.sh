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

prompt_set_alias() {
  if [ -t 0 ] && [ -t 1 ]; then
    local answer
    read -r -p "Add maister-kiro and mk shell aliases? [y/N] " answer
    case "$answer" in
      [yY]|[yY][eE][sS]) SET_ALIAS=1 ;;
      *) SET_ALIAS=0 ;;
    esac
  else
    SET_ALIAS=0
  fi
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
alias mk='maister-kiro chat'
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
