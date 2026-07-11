#!/usr/bin/env bash
# Verify Codex install MCP helpers and default/opt-in behavior on a temp plugin tree.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INSTALL="$ROOT/platforms/codex-cli/smoke-install.sh"
PLUGIN="$ROOT/plugins/maister-codex"

# shellcheck source=/dev/null
source "$INSTALL"

default_tree=$(mktemp -d)
opt_in_tree=$(mktemp -d)
trap 'rm -rf "$default_tree" "$opt_in_tree"' EXIT

make -C "$ROOT" build-codex >/dev/null
cp -R "$PLUGIN/." "$default_tree/"
cp -R "$PLUGIN/." "$opt_in_tree/"

remove_playwright_mcp "$default_tree"
test ! -f "$default_tree/.mcp.json"
jq -e '.mcpServers == null' "$default_tree/.codex-plugin/plugin.json" >/dev/null

apply_playwright_mcp "$opt_in_tree"
test -f "$opt_in_tree/.mcp.json"
jq -e '.mcpServers == "./.mcp.json"' "$opt_in_tree/.codex-plugin/plugin.json" >/dev/null
jq -e '.mcpServers.playwright.command == "npx"' "$opt_in_tree/.mcp.json" >/dev/null

echo "PASS: Codex default install omits Playwright MCP and opt-in installs it"
