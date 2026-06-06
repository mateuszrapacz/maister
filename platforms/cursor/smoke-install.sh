#!/bin/bash
# Install maister-cursor locally for CLI/IDE auto-discovery (no --plugin-dir needed).
#
# Usage:
#   smoke-install.sh [DEST]
#
# Default DEST: ~/.cursor/plugins/local/maister-cursor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$ROOT/plugins/maister-cursor"
DEST="${HOME}/.cursor/plugins/local/maister-cursor"

if [[ $# -gt 0 ]]; then
  DEST="$1"
fi

echo "Building..."
make -C "$ROOT" build-cursor

mkdir -p "$(dirname "$DEST")"

echo "Installing to $DEST"
rm -rf "$DEST"
cp -R "$SOURCE" "$DEST"

echo "Done. Reload Cursor: Developer → Reload Window"
echo "CLI auto-discovers plugin from ~/.cursor/plugins/local/ — no --plugin-dir needed."
echo "Then run: /maister-init"
