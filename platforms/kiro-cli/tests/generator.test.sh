#!/usr/bin/env bash
# Task Group 2: MD→JSON generator tests — run only this file for G2 verification.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
GENERATOR="$ROOT/platforms/kiro-cli/generate-agent-json.sh"
FIXTURES="$SCRIPT_DIR/fixtures"
CORE_AGENTS="$ROOT/plugins/maister/agents"
EXPECTED_JSON="$FIXTURES/gap-analyzer.expected.json"

pass=0
fail=0

assert() {
  local desc="$1"
  shift
  if "$@"; then
    echo "PASS: $desc"
    pass=$((pass + 1))
  else
    echo "FAIL: $desc"
    fail=$((fail + 1))
  fi
}

setup_fixture_out() {
  local tmp
  tmp=$(mktemp -d)
  mkdir -p "$tmp/agents"
  cp "$FIXTURES/gap-analyzer.md" "$tmp/agents/gap-analyzer.md"
  echo "$tmp"
}

setup_all_agents_out() {
  local tmp
  tmp=$(mktemp -d)
  mkdir -p "$tmp/agents"
  cp "$CORE_AGENTS"/*.md "$tmp/agents/"
  echo "$tmp"
}

test_gap_analyzer_json_parses() {
  local out
  out=$(setup_fixture_out)
  bash "$GENERATOR" "$out"
  jq empty "$out/agents/maister-gap-analyzer.json"
}

test_gap_analyzer_name_prefixed() {
  local out
  out=$(setup_fixture_out)
  bash "$GENERATOR" "$out" >/dev/null
  [ "$(jq -r '.name' "$out/agents/maister-gap-analyzer.json")" = "maister-gap-analyzer" ]
}

test_tools_from_agent_tools_lookup() {
  local out
  out=$(setup_fixture_out)
  bash "$GENERATOR" "$out" >/dev/null
  diff -u <(jq -S '.tools' "$EXPECTED_JSON") <(jq -S '.tools' "$out/agents/maister-gap-analyzer.json") >/dev/null
}

test_instructions_no_frontmatter() {
  local out
  out=$(setup_fixture_out)
  bash "$GENERATOR" "$out" >/dev/null
  local instructions="$out/agents/instructions/maister-gap-analyzer.md"
  test -f "$instructions"
  ! head -1 "$instructions" | grep -q '^---$'
  grep -q '^# Gap Analyzer' "$instructions"
}

test_frontmatter_fields_in_json() {
  local out
  out=$(setup_fixture_out)
  bash "$GENERATOR" "$out" >/dev/null
  diff -u \
    <(jq -S -c '{description, prompt}' "$EXPECTED_JSON") \
    <(jq -S -c '{description, prompt}' "$out/agents/maister-gap-analyzer.json") >/dev/null
  jq -e '(.model // null) == null and (.promptFile // null) == null' \
    "$out/agents/maister-gap-analyzer.json" >/dev/null
}

test_all_24_agents_valid_json() {
  local out count
  out=$(setup_all_agents_out)
  bash "$GENERATOR" "$out" >/dev/null
  count=$(find "$out/agents" -maxdepth 1 -name 'maister-*.json' | wc -l | tr -d ' ')
  [ "$count" -eq 24 ]
  find "$out/agents" -maxdepth 1 -name 'maister-*.json' -print0 | while IFS= read -r -d '' f; do
    jq empty "$f"
  done
}

test_no_source_md_after_generation() {
  local out
  out=$(setup_all_agents_out)
  bash "$GENERATOR" "$out" >/dev/null
  [ "$(find "$out/agents" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" -eq 0 ]
}

test_golden_file_diff() {
  local out
  out=$(setup_fixture_out)
  bash "$GENERATOR" "$out" >/dev/null
  diff -u "$EXPECTED_JSON" "$out/agents/maister-gap-analyzer.json" >/dev/null
}

echo "=== Kiro CLI MD→JSON generator tests (Task Group 2) ==="

assert "gap-analyzer.md → JSON parses with jq empty" test_gap_analyzer_json_parses
assert "JSON name is maister-gap-analyzer (prefixed)" test_gap_analyzer_name_prefixed
assert "tools array populated from agent-tools.json lookup" test_tools_from_agent_tools_lookup
assert "instructions/maister-gap-analyzer.md has no YAML frontmatter" test_instructions_no_frontmatter
assert "frontmatter description and prompt file:// URI in JSON (no model:inherit)" test_frontmatter_fields_in_json
assert "all 24 source agents produce valid JSON when run in isolation" test_all_24_agents_valid_json
assert "no agents/*.md remains after full generator run" test_no_source_md_after_generation
assert "golden-file diff for gap-analyzer JSON fields" test_golden_file_diff

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
