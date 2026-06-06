#!/bin/bash
# Install maister-cursor locally for smoke testing.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEST="${1:-$HOME/.cursor/plugins/local/maister-cursor}"

echo "Building..."
make -C "$ROOT" build-cursor

echo "Installing to $DEST"
rm -rf "$DEST"
cp -R "$ROOT/plugins/maister-cursor" "$DEST"

echo "Done. Reload Cursor: Developer → Reload Window"
echo "Then run: /maister-init"
