#!/bin/bash
# Structural skill inventory checks for maister-cursor generated plugin.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PLUGIN="${PLUGIN_DIR:-$ROOT/plugins/maister-cursor}"
cd "$PLUGIN"

count=$(find skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
# Public skills plus five session utility skills (resume/status/next/bye/dev).
if [ "$count" -lt 32 ] || [ "$count" -gt 36 ]; then
  echo "FAIL: skill count $count outside 32-36"
  exit 1
fi

if grep -h '^name: ' skills/*/SKILL.md | grep -vE '^name: maister-'; then
  echo "FAIL: skill name without maister- prefix"
  exit 1
fi

if [ -d commands ]; then
  echo "FAIL: commands/ directory still exists"
  exit 1
fi

if find skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*' | grep -q .; then
  echo "FAIL: plain-kebab skill directories remain"
  exit 1
fi

if [ ! -f lib/orchestrator-framework/references/orchestrator-patterns.md ]; then
  echo "FAIL: lib/orchestrator-framework/references/orchestrator-patterns.md missing"
  exit 1
fi

for skill in maister-resume maister-status maister-next maister-bye maister-dev; do
  test -f "skills/$skill/SKILL.md" || {
    echo "FAIL: Cursor utility skill '$skill' is missing"
    exit 1
  }
done

echo "PASS: skill inventory ($count public skills)"
