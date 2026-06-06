#!/bin/bash
# Smoke test maister-cursor via Cursor Agent CLI (no IDE).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN="${PLUGIN_DIR:-$ROOT/plugins/maister-cursor}"
WORKSPACE="${WORKSPACE:-/tmp/maister-cli-smoke-$$}"

if ! command -v agent >/dev/null 2>&1; then
  echo "FAIL: 'agent' CLI not found. Install Cursor Agent CLI first."
  exit 1
fi

echo "==> Building plugin"
make -C "$ROOT" build-cursor >/dev/null
PLUGIN="$ROOT/plugins/maister-cursor"

echo "==> Auth"
agent status >/dev/null

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"
git init -q 2>/dev/null || true

run_agent() {
  agent -p --trust --force \
    --plugin-dir "$PLUGIN" \
    --workspace "$WORKSPACE" \
    --output-format text \
    "$@"
}

echo "==> Test 1: plugin detection"
OUT=$(run_agent "Reply ONLY JSON: {\"plugin_detected\": bool, \"init_skill\": string}. Check maister-init skill exists.")
echo "$OUT"
echo "$OUT" | grep -q 'maister-init' || { echo "FAIL: init skill not detected"; exit 1; }

echo "==> Test 2: Task + custom agent"
OUT=$(run_agent "Task subagent_type maister-gap-analyzer, prompt: reply ONLY {\"agent\":\"maister-gap-analyzer\",\"ok\":true}. Return that JSON.")
echo "$OUT"
echo "$OUT" | grep -q 'maister-gap-analyzer' || { echo "FAIL: custom agent"; exit 1; }

echo "==> Test 3: quick-plan artifact"
rm -rf .maister
OUT=$(run_agent "/maister-quick-plan Add ping endpoint. Stop after writing plan file; do not implement.")
echo "$OUT" | tail -5
test -n "$(find .maister/plans -name '*.md' 2>/dev/null | head -1)" || { echo "FAIL: plan file missing"; exit 1; }

echo ""
echo "PASS: maister-cursor works with Cursor Agent CLI"
echo "Plugin: $PLUGIN"
echo "Workspace: $WORKSPACE"
echo ""
echo "Example:"
echo "  agent --plugin-dir \"$PLUGIN\" --workspace . -p --trust --force \"/maister-init\""
