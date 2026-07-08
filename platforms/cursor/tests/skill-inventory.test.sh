#!/bin/bash
# Structural skill inventory checks for maister-cursor generated plugin.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PLUGIN="${PLUGIN_DIR:-$ROOT/plugins/maister-cursor}"
cd "$PLUGIN"

count=$(find skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
# 4B baseline: 29 public skills under skills/ (33 renamed minus 4 relocated internals)
if [ "$count" -lt 27 ] || [ "$count" -gt 31 ]; then
  echo "FAIL: skill count $count outside 27-31"
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

echo "PASS: skill inventory ($count public skills)"
