#!/usr/bin/env bash
# Task Group 10: E2E verification matrix — structural/doc checks + smoke path references.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="$ROOT/plugins/maister-kiro"
DOC="$ROOT/docs/kiro-cli-support.md"
SMOKE_CLI="$ROOT/platforms/kiro-cli/smoke-cli.sh"

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
  (cd "$ROOT" && make build-kiro >/dev/null)
}

run_build

# 1. E2E doc exists with matrix section
test_e2e_doc_exists() {
  test -f "$DOC" && grep -q '## E2E Verification Matrix' "$DOC"
}

# 2. Matrix documents scenarios 1–8 and 2a
test_matrix_covers_all_scenarios() {
  local n
  for n in 1 2 3 4 5 6 7 8; do
    grep -qE "\| ${n} \|" "$DOC" || return 1
  done
  grep -qE '\| 2a \|' "$DOC"
}

# 3. Scenario 1 — init artifacts documented and build outputs present
test_scenario_1_init_artifacts() {
  grep -q 'AGENTS\.md' "$DOC" && \
    grep -q '\.maister/docs/INDEX\.md' "$DOC" && \
    grep -q '\.kiro/steering/maister-docs\.md' "$DOC" && \
    test -d "$OUT/skills/maister-init" && \
    test -f "$OUT/steering/maister-docs.md"
}

# 4. Scenario 2 — development todo mirror documented and transformed
test_scenario_2_todo_mirror() {
  grep -qi 'todo' "$DOC" && \
    grep -q 'Use `todo`' "$OUT/skills/maister-development/SKILL.md"
}

# 5. Scenario 3 — resume reads orchestrator-state.yml
test_scenario_3_resume() {
  grep -q 'orchestrator-state\.yml' "$DOC" && \
    grep -q 'orchestrator-state\.yml' "$OUT/prompts/resume.md" && \
    grep -qE '\-\-from=' "$DOC"
}

# 6. Scenarios 5–6 — smoke-cli headless path references
test_scenario_5_6_smoke_paths() {
  grep -q 'smoke-cli\.sh' "$DOC" && \
    grep -q '\-\-test 2' "$DOC" && \
    grep -q '\-\-test 3' "$DOC" && \
    grep -q '\-\-test 4' "$DOC" && \
    grep -q '\-\-test 2' "$SMOKE_CLI" && \
    grep -q '\-\-test 4' "$SMOKE_CLI"
}

# 7. Scenario 8 — 26 agents discoverable in built output
test_scenario_8_agent_inventory() {
  test "$(find "$OUT/agents" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')" -eq 26
}

# 8. Scenario 2a manual, scenario 4 parallel limit, known gaps recorded
test_manual_parallel_gaps_documented() {
  grep -qi 'manual' "$DOC" && grep -q '2a' "$DOC" && \
    grep -qi 'max 4' "$DOC" && \
    grep -qi 'preCompact' "$DOC" && \
    grep -qi 'todo' "$DOC"
}

assert "kiro-cli-support.md has E2E Verification Matrix section" test_e2e_doc_exists
assert "matrix table covers scenarios 1–8 and 2a" test_matrix_covers_all_scenarios
assert "scenario 1 — init artifacts documented and build outputs exist" test_scenario_1_init_artifacts
assert "scenario 2 — todo mirror documented and in maister-development skill" test_scenario_2_todo_mirror
assert "scenario 3 — resume/orchestrator-state.yml documented" test_scenario_3_resume
assert "scenarios 5–6 — smoke-cli.sh headless paths referenced" test_scenario_5_6_smoke_paths
assert "scenario 8 — exactly 26 agent JSON files after build" test_scenario_8_agent_inventory
assert "scenario 2a manual, parallel max 4, and known gaps documented" test_manual_parallel_gaps_documented

echo ""
echo "Results: $pass passed, $fail failed"
test "$fail" -eq 0
