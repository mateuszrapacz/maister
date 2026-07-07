#!/usr/bin/env bash
# Task Group 6: build pipeline completion — steering, init, hooks, orchestrator synthesis.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="$ROOT/plugins/maister-kiro"

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

run_build() {
  (cd "$ROOT" && make build-kiro)
}

test_steering_workflows_kiro_section() {
  run_build
  test -f "$OUT/steering/maister-workflows.md" && \
    grep -q '## Platform: Kiro CLI' "$OUT/steering/maister-workflows.md"
}

test_maister_json_has_hooks() {
  run_build
  test -f "$OUT/agents/maister.json" && \
    jq -e '.hooks != null' "$OUT/agents/maister.json" >/dev/null
}

test_maister_explore_json_exists() {
  run_build
  test -f "$OUT/agents/maister-explore.json" && \
    jq -e '.name == "maister-explore"' "$OUT/agents/maister-explore.json" >/dev/null
}

test_exactly_26_json_agents() {
  run_build
  local count
  count=$(find "$OUT/agents" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')
  test "$count" -eq 29
}

test_no_hooks_json() {
  run_build
  test ! -f "$OUT/hooks/hooks.json"
}

test_hook_scripts_executable() {
  run_build
  local f ok=1
  for f in "$OUT/hooks"/*.sh; do
    [ -x "$f" ] || ok=0
  done
  test "$ok" -eq 1 && [ -n "$(ls -A "$OUT/hooks"/*.sh 2>/dev/null)" ]
}

test_init_skill_steering_refs() {
  run_build
  grep -q '\.kiro/steering/maister-docs\.md' "$OUT/skills/maister-init/SKILL.md" && \
    grep -q 'AGENTS\.md' "$OUT/skills/maister-init/SKILL.md"
}

test_full_build_succeeds() {
  run_build
  test -d "$OUT/skills" && test -d "$OUT/agents"
}

echo "=== Kiro CLI build completion tests (Task Group 6) ==="

assert "steering/maister-workflows.md exists with Kiro platform section" test_steering_workflows_kiro_section
assert "agents/maister.json exists with hooks field" test_maister_json_has_hooks
assert "agents/maister-explore.json exists" test_maister_explore_json_exists
assert "exactly 29 JSON agents (26 converted + 2 synthetic + maister + explore)" test_exactly_26_json_agents
assert "no standalone hooks/hooks.json" test_no_hooks_json
assert "hook scripts in hooks/ are executable" test_hook_scripts_executable
assert "init skill references .kiro/steering/maister-docs.md and AGENTS.md" test_init_skill_steering_refs
assert "make build-kiro completes without error" test_full_build_succeeds

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
