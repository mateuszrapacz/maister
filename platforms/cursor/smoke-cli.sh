#!/bin/bash
# Smoke test maister-cursor via Cursor Agent CLI (no IDE).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN="${PLUGIN_DIR:-$ROOT/plugins/maister-cursor}"
WORKSPACE="${WORKSPACE:-/tmp/maister-cli-smoke-$$}"

contract_check() {
  local framework="$PLUGIN/lib/orchestrator-framework"
  local patterns="$framework/references/orchestrator-patterns.md"
  local engine="$framework/references/gate-decision-engine.md"
  local matrix="$framework/references/host-capabilities.yml"
  local init="$PLUGIN/skills/maister-init/SKILL.md"

  test -f "$PLUGIN/agents/advisor.md"
  grep -q '^name: maister-advisor$' "$PLUGIN/agents/advisor.md"
  grep -q '^readonly: true$' "$PLUGIN/agents/advisor.md"
  grep -q '^[[:space:]]\+advisor_agent: advisor$' "$patterns"
  grep -q '^[[:space:]]\+arbiter_agent: advisor$' "$patterns"
  grep -q '^[[:space:]]\+phase-exit: manual$' "$patterns"
  grep -q 'The hard denylist is:' "$engine"
  grep -q 'exactly one complete `orchestrator.options.advisor` snapshot' "$patterns"
  grep -q '^  - host: cursor$' "$matrix"
  grep -A2 '^  - host: cursor$' "$matrix" | grep -q 'target: platforms/cursor/tests/fully-automatic-continuation.e2e.sh'
  grep -q '^argument-hint: "\[--standards-from=PATH\] \[--advisor=on|off\]"$' "$init"
  grep -q 'native question capability' "$init"
  ! grep -RInE 'schema_version:|advisor_version:|synthetic user answer' "$PLUGIN/skills" "$framework" --include='*.md' >/dev/null
  test ! -e "$PLUGIN/skills/maister-init/bin/advisor.toml"
  echo "PASS: Cursor Advisor platform contract"
}

if [ "${1:-}" = "--contract" ]; then
  contract_check
  exit 0
fi

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

echo "==> Test 2b: readonly frontmatter on built agents"
for agent in explore advisor code-reviewer gap-analyzer thermo-nuclear-review-subagent; do
  grep -q '^readonly: true' "$PLUGIN/agents/${agent}.md" || { echo "FAIL: $agent missing readonly: true"; exit 1; }
done
for agent in docs-operator task-group-implementer specification-creator; do
  grep -q '^readonly: true' "$PLUGIN/agents/${agent}.md" && { echo "FAIL: $agent should not be readonly"; exit 1; } || true
done

echo "==> Test 2c: advisor adapter contract"
grep -q '^name: maister-advisor$' "$PLUGIN/agents/advisor.md" || { echo "FAIL: Cursor advisor mapping"; exit 1; }
grep -q 'fully_automatic' "$PLUGIN/lib/orchestrator-framework/references/gate-decision-engine.md" || { echo "FAIL: gate policy mapping"; exit 1; }
grep -q 'Automatic injection' "$PLUGIN/lib/orchestrator-framework/references/gate-decision-engine.md" || { echo "FAIL: fail-closed automatic injection mapping"; exit 1; }
grep -q 'orchestrator-state.yml' "$PLUGIN/lib/orchestrator-framework/references/gate-decision-engine.md" || { echo "FAIL: state/resume mapping"; exit 1; }

echo "==> Test 3: quick-plan artifact"
rm -rf .maister
OUT=$(run_agent "/maister-quick-plan Add ping endpoint. Stop after writing plan file; do not implement.")
echo "$OUT" | tail -5
test -n "$(find .maister/plans -name '*.md' 2>/dev/null | head -1)" || { echo "FAIL: plan file missing"; exit 1; }

echo "==> Test 4: lib/skills Skill tool resolution (sentinel)"
SENTINEL_DIR="$PLUGIN/lib/skills/maister-sentinel-lib-skill"
mkdir -p "$SENTINEL_DIR"
cp "$ROOT/platforms/cursor/tests/fixtures/maister-sentinel-lib-skill/SKILL.md" "$SENTINEL_DIR/"
OUT=$(run_agent "Invoke the Skill tool for maister-sentinel-lib-skill. Reply ONLY with the sentinel string from the loaded SKILL.md.")
echo "$OUT" | tail -3
echo "$OUT" | grep -q 'SENTINEL_LIB_SKILL_7f3a9c' || { echo "FAIL: lib/skills sentinel — Skill tool may not resolve lib/skills/"; rm -rf "$SENTINEL_DIR"; exit 1; }
rm -rf "$SENTINEL_DIR"

echo ""
echo "PASS: maister-cursor works with Cursor Agent CLI"
echo "Plugin: $PLUGIN"
echo "Workspace: $WORKSPACE"
echo ""
echo "Example:"
echo "  agent --plugin-dir \"$PLUGIN\" --workspace . -p --trust --force \"/maister-init\""
