#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN="${PLUGIN_DIR:-$ROOT/plugins/maister-codex}"
MARKETPLACE="$ROOT/.agents/plugins/marketplace.json"

make -C "$ROOT" build-codex >/dev/null

test -f "$PLUGIN/.codex-plugin/plugin.json"
test -f "$PLUGIN/hooks/hooks.json"
test -f "$MARKETPLACE"
jq empty "$PLUGIN/.codex-plugin/plugin.json"
jq empty "$PLUGIN/hooks/hooks.json"
jq empty "$MARKETPLACE"
jq -e '.skills == "./skills/" and (.mcpServers | not) and (.interface.defaultPrompt | length > 0)' \
  "$PLUGIN/.codex-plugin/plugin.json" >/dev/null
jq -e '.name == "maister"' "$PLUGIN/.codex-plugin/plugin.json" >/dev/null
test ! -f "$PLUGIN/.mcp.json"
jq -e '.plugins[] | select(.name == "maister") | .source.path == "./plugins/maister-codex"' "$MARKETPLACE" >/dev/null

source_skills=$(find "$ROOT/plugins/maister/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
source_commands=$(find "$ROOT/plugins/maister/commands" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
actual_skills=$(find "$PLUGIN/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
utility_skills=5
expected_skills=$((source_skills + source_commands + utility_skills))
test "$actual_skills" -eq "$expected_skills"

if find "$PLUGIN/skills" -mindepth 1 -maxdepth 1 -type d -name 'maister-*' | grep -q .; then
  echo "FAIL: generated skill has redundant maister- prefix" >&2
  exit 1
fi

if grep -RInE 'CLAUDE\.md|AskUserQuestion|AskQuestion|TaskCreate|TaskUpdate|EnterPlanMode|ExitPlanMode' \
  "$PLUGIN/skills" --include='*.md' >/dev/null; then
  echo "FAIL: Claude-specific references remain in Codex skills" >&2
  exit 1
fi

test -f "$PLUGIN/skills/product-design/SKILL.md"
grep -q '^name: product-design$' "$PLUGIN/skills/product-design/SKILL.md"
grep -Fq '$maister:product-design' "$PLUGIN/skills/product-design/SKILL.md"

for skill in resume status next bye dev; do
  test -f "$PLUGIN/skills/$skill/SKILL.md" || {
    echo "FAIL: Codex utility skill '$skill' is missing" >&2
    exit 1
  }
done

for skill_dir in "$PLUGIN/skills"/*; do
  test -f "$skill_dir/SKILL.md" || { echo "FAIL: missing SKILL.md in $skill_dir" >&2; exit 1; }
  name=$(sed -n 's/^name: //p' "$skill_dir/SKILL.md" | head -1)
  test "$name" = "$(basename "$skill_dir")" || {
    echo "FAIL: skill name '$name' does not match $(basename "$skill_dir")" >&2
    exit 1
  }
done

if find "$PLUGIN" -maxdepth 1 -type d -name agents | grep -q .; then
  echo "FAIL: custom agents must not be bundled in the plugin-only MVP" >&2
  exit 1
fi

framework="$PLUGIN/skills/orchestrator-framework"
patterns="$framework/references/orchestrator-patterns.md"
engine="$framework/references/gate-decision-engine.md"
matrix="$framework/references/host-capabilities.yml"
init="$PLUGIN/skills/init/SKILL.md"
advisor_template="$PLUGIN/skills/init/bin/advisor.toml"

test -f "$advisor_template"
grep -q '^name = "advisor"$' "$advisor_template"
grep -q '^sandbox_mode = "read-only"$' "$advisor_template"
grep -q 'same read-only advisor for the primary recommendation and' "$advisor_template"
grep -q 'phase_continue(selected_option)' "$advisor_template"
grep -q 'implementation-approval gate always remain manual' "$advisor_template"
grep -q '^[[:space:]]\+advisor_agent: advisor$' "$patterns"
grep -q '^[[:space:]]\+arbiter_agent: advisor$' "$patterns"
grep -q '^[[:space:]]\+phase-exit: manual$' "$patterns"
grep -q 'The hard denylist is:' "$engine"
grep -q 'exactly one complete `orchestrator.options.advisor` snapshot' "$patterns"
grep -A2 '^  - host: codex$' "$matrix" | grep -q 'target: platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh'
grep -q -- '--advisor=on|off' "$init"
grep -q 'authoritative `codex` signal' "$init"
! grep -RInE 'advisor_version:|AskUserQuestion|AskQuestion' "$PLUGIN/skills" --include='*.md' >/dev/null

echo "PASS: Codex plugin structure, transforms, manifest, hooks, and Advisor platform contract"
