#!/usr/bin/env bash
# Install maister-codex from the repo marketplace into Codex CLI/IDE cache.
#
# Usage:
#   smoke-install.sh [--with-mcp-playwright] [--marketplace NAME]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_NAME="maister"
MARKETPLACE="maister-local"
MCP_PLAYWRIGHT_ENABLED=0
MCP_SOURCE="$ROOT/plugins/maister/.mcp.json"

usage() {
  cat <<EOF
Install Maister for Codex CLI and IDE from the local repo marketplace.

Usage: smoke-install.sh [OPTIONS]

  --with-mcp-playwright   Install Playwright MCP for --e2e workflows (default: off)
  --no-mcp-playwright     Do not install Playwright MCP
  --marketplace NAME      Marketplace name (default: maister-local)
  --help                  Show this help

Requires: codex CLI, make, jq
EOF
}

apply_playwright_mcp() {
  local dest="$1"
  cp "$MCP_SOURCE" "$dest/.mcp.json"
  local tmp="${dest}/.codex-plugin/plugin.json.tmp.$$"
  jq '. + {"mcpServers": "./.mcp.json"}' "$dest/.codex-plugin/plugin.json" >"$tmp"
  mv "$tmp" "$dest/.codex-plugin/plugin.json"
}

remove_playwright_mcp() {
  local dest="$1"
  rm -f "$dest/.mcp.json"
  local tmp="${dest}/.codex-plugin/plugin.json.tmp.$$"
  jq 'del(.mcpServers)' "$dest/.codex-plugin/plugin.json" >"$tmp"
  mv "$tmp" "$dest/.codex-plugin/plugin.json"
}

resolve_installed_path() {
  local selector="$1"
  local installed_path

  if ! installed_path="$(codex plugin add --json "$selector" | jq -er '.installedPath')"; then
    echo "FAIL: could not resolve installed plugin path for $selector" >&2
    exit 1
  fi

  if [ ! -d "$installed_path/.codex-plugin" ]; then
    echo "FAIL: installed plugin tree missing at $installed_path" >&2
    exit 1
  fi

  printf '%s' "$installed_path"
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --with-mcp-playwright)
        MCP_PLAYWRIGHT_ENABLED=1
        shift
        ;;
      --no-mcp-playwright)
        MCP_PLAYWRIGHT_ENABLED=0
        shift
        ;;
      --marketplace)
        MARKETPLACE="${2:-}"
        if [ -z "$MARKETPLACE" ]; then
          echo "FAIL: --marketplace requires a value" >&2
          exit 1
        fi
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      -*)
        echo "Unknown option: $1" >&2
        usage >&2
        exit 1
        ;;
      *)
        echo "Unexpected argument: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done

  if ! command -v codex >/dev/null 2>&1; then
    echo "FAIL: codex CLI is not installed" >&2
    exit 1
  fi

  echo "Building..."
  make -C "$ROOT" build-codex

  echo "Registering marketplace..."
  (cd "$ROOT" && codex plugin marketplace add . >/dev/null)

  local selector="${PLUGIN_NAME}@${MARKETPLACE}"
  echo "Installing $selector..."
  codex plugin remove "$selector" >/dev/null 2>&1 || true
  local installed_path
  installed_path="$(resolve_installed_path "$selector")"

  if [ "$MCP_PLAYWRIGHT_ENABLED" = "1" ]; then
    apply_playwright_mcp "$installed_path"
  else
    remove_playwright_mcp "$installed_path"
  fi

  echo "Done."
  echo "Installed plugin root: $installed_path"
  echo "Start a new Codex session so bundled skills are rediscovered."
  if [ "$MCP_PLAYWRIGHT_ENABLED" = "1" ]; then
    echo "Playwright MCP installed for --e2e workflows."
  fi
  echo "Then invoke: \$maister:init or \$maister:development"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
