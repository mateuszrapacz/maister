#!/bin/bash
# Verify Cursor installation defaults and explicit Playwright MCP opt-in.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INSTALL="$ROOT/platforms/cursor/smoke-install.sh"

default_dest=$(mktemp -d)
opt_in_dest=$(mktemp -d)
trap 'rm -rf "$default_dest" "$opt_in_dest"' EXIT

"$INSTALL" "$default_dest" >/dev/null
test ! -e "$default_dest/mcp.json"

"$INSTALL" --with-mcp-playwright "$opt_in_dest" >/dev/null
test -f "$opt_in_dest/mcp.json"
jq -e '.mcpServers.playwright.command == "npx"' "$opt_in_dest/mcp.json" >/dev/null

echo "PASS: Cursor default install omits Playwright MCP and opt-in installs it"
