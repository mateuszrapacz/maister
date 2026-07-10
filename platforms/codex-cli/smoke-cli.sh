#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN="${PLUGIN_DIR:-$ROOT/plugins/maister-codex}"
MARKETPLACE="$ROOT/.agents/plugins/marketplace.json"

make -C "$ROOT" build-codex >/dev/null

test -f "$PLUGIN/.codex-plugin/plugin.json"
test -f "$PLUGIN/.mcp.json"
test -f "$PLUGIN/hooks/hooks.json"
test -f "$MARKETPLACE"
jq empty "$PLUGIN/.codex-plugin/plugin.json"
jq empty "$PLUGIN/.mcp.json"
jq empty "$PLUGIN/hooks/hooks.json"
jq empty "$MARKETPLACE"
jq -e '.skills == "./skills/" and .mcpServers == "./.mcp.json" and (.interface.defaultPrompt | length > 0)' \
  "$PLUGIN/.codex-plugin/plugin.json" >/dev/null
jq -e '.name == "maister"' "$PLUGIN/.codex-plugin/plugin.json" >/dev/null
jq -e '.mcpServers.playwright.command == "npx"' "$PLUGIN/.mcp.json" >/dev/null
jq -e '.plugins[] | select(.name == "maister") | .source.path == "./plugins/maister-codex"' "$MARKETPLACE" >/dev/null

source_skills=$(find "$ROOT/plugins/maister/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
source_commands=$(find "$ROOT/plugins/maister/commands" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
actual_skills=$(find "$PLUGIN/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
expected_skills=$((source_skills + source_commands))
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

echo "PASS: Codex plugin structure, transforms, manifest, MCP, and hooks"
