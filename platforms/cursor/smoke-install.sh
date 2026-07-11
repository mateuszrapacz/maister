#!/bin/bash
# Install maister-cursor locally for CLI/IDE auto-discovery (no --plugin-dir needed).
#
# Usage:
#   smoke-install.sh [--with-mcp-playwright] [DEST]
#
# Default DEST: ~/.cursor/plugins/local/maister-cursor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$ROOT/plugins/maister-cursor"
DEST="${HOME}/.cursor/plugins/local/maister-cursor"
MCP_PLAYWRIGHT_ENABLED=0

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
    --help|-h)
      cat <<EOF
Install Maister for Cursor Agent.

Usage: smoke-install.sh [OPTIONS] [DEST]

  DEST                    Install directory (default: ~/.cursor/plugins/local/maister-cursor)
  --with-mcp-playwright   Install Playwright MCP for --e2e workflows (default: off)
  --no-mcp-playwright     Do not install Playwright MCP
EOF
      exit 0
      ;;
    -* )
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      DEST="$1"
      shift
      ;;
  esac
done

echo "Building..."
make -C "$ROOT" build-cursor

mkdir -p "$(dirname "$DEST")"

echo "Installing to $DEST"
rm -rf "$DEST"
cp -R "$SOURCE" "$DEST"

if [ "$MCP_PLAYWRIGHT_ENABLED" = "1" ]; then
  cp "$ROOT/plugins/maister/.mcp.json" "$DEST/mcp.json"
fi

echo "Done. Reload Cursor: Developer → Reload Window"
echo "CLI auto-discovers plugin from ~/.cursor/plugins/local/ — no --plugin-dir needed."
if [ "$MCP_PLAYWRIGHT_ENABLED" = "1" ]; then
  echo "Playwright MCP installed for --e2e workflows."
fi
echo "Then run: /maister-init"
