#!/usr/bin/env bash
# Remove Maister Kiro CLI profile from KIRO_HOME (never touches personal ~/.kiro/).
#
# Usage:
#   smoke-uninstall.sh [DEST]
#
# Default DEST: $KIRO_HOME or ~/.kiro-maister
set -euo pipefail

DEFAULT_DEST="${KIRO_HOME:-$HOME/.kiro-maister}"
DEST="${1:-$DEFAULT_DEST}"

usage() {
  cat <<EOF
Uninstall Maister for Kiro CLI from an isolated KIRO_HOME profile.

Usage: smoke-uninstall.sh [DEST]

  DEST    Profile directory to remove (default: \$KIRO_HOME or ~/.kiro-maister)

Never modifies personal ~/.kiro/ — only removes the target KIRO_HOME directory.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [ "$DEST" = "$HOME/.kiro" ]; then
  echo "FAIL: refusing to remove personal ~/.kiro/ — pass a Maister profile path" >&2
  exit 1
fi

if [ ! -e "$DEST" ]; then
  echo "Nothing to remove: $DEST does not exist"
  exit 0
fi

echo "Removing Maister Kiro profile: $DEST"
rm -rf "$DEST"
echo "Done."
