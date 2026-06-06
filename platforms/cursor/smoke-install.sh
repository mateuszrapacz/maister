#!/bin/bash
# Install maister-cursor locally for CLI/IDE auto-discovery (no --plugin-dir needed).
#
# Usage:
#   smoke-install.sh [--copy|--symlink] [DEST]
#
# Options:
#   --copy, -c       Copy built plugin to DEST (default)
#   --symlink, -s    Symlink DEST → repo plugins/maister-cursor (dev; updates after make build-cursor)
#   --help, -h       Show help
#
# Default DEST: ~/.cursor/plugins/local/maister-cursor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$ROOT/plugins/maister-cursor"
MODE="copy"
DEST="${HOME}/.cursor/plugins/local/maister-cursor"

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \?//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --copy|-c)
      MODE="copy"
      shift
      ;;
    --symlink|-s)
      MODE="symlink"
      shift
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
      DEST="$1"
      shift
      ;;
  esac
done

echo "Building..."
make -C "$ROOT" build-cursor

mkdir -p "$(dirname "$DEST")"

if [[ "$MODE" == "symlink" ]]; then
  echo "Symlinking $DEST → $SOURCE"
  rm -rf "$DEST"
  ln -sfn "$SOURCE" "$DEST"
else
  echo "Copying to $DEST"
  rm -rf "$DEST"
  cp -R "$SOURCE" "$DEST"
fi

echo "Done ($MODE). Reload Cursor: Developer → Reload Window"
echo "CLI auto-discovers plugin from ~/.cursor/plugins/local/ — no --plugin-dir needed."
echo "Then run: /maister-init"
