#!/bin/bash
# Structural smoke tests for maister-kilo plugin.
#
# Usage:
#   smoke-cli.sh           Run all tests
#   smoke-cli.sh --test N  Run test 1, 2, 3, or 4 only
#
# Prerequisites: make build-kilo must have been run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN="$ROOT/plugins/maister-kilo"
SINGLE_TEST=""
PASS=0
FAIL=0

usage() {
  cat <<EOF
Structural smoke tests for Maister Kilo CLI plugin.

Usage: smoke-cli.sh [--test N]

  --test 1   Plugin structure (.kilo/ dirs exist)
  --test 2   Skill detection (maister-init, maister-development present)
  --test 3   Agent detection (subagents in .kilo/agents/)
  --test 4   Config validity (kilo.json, AGENTS.md)
  --help     Show this help
EOF
}

assert_exists() {
  local path="$1" desc="${2:-$1}"
  if [ -e "$path" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (missing: $path)"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_exists() {
  local path="$1" desc="${2:-$1}"
  if [ ! -e "$path" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (should not exist: $path)"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local file="$1" pattern="$2" desc="${3:-$pattern in $file}"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (pattern '$pattern' not found in $file)"
    FAIL=$((FAIL + 1))
  fi
}

test_1_structure() {
  echo "==> Test 1: Plugin structure"
  assert_exists "$PLUGIN/.kilo/skills" ".kilo/skills/ directory"
  assert_exists "$PLUGIN/.kilo/agents" ".kilo/agents/ directory"
  assert_exists "$PLUGIN/.kilo/rules" ".kilo/rules/ directory"
  assert_exists "$PLUGIN/kilo.json" "kilo.json config"
  assert_exists "$PLUGIN/AGENTS.md" "AGENTS.md"
  assert_not_exists "$PLUGIN/.claude-plugin" "no .claude-plugin/ orphan"
}

test_2_skills() {
  echo "==> Test 2: Skill detection"
  assert_exists "$PLUGIN/.kilo/skills/init/SKILL.md" "init skill"
  assert_exists "$PLUGIN/.kilo/skills/development/SKILL.md" "development skill"
  assert_exists "$PLUGIN/.kilo/skills/quick-plan/SKILL.md" "quick-plan skill"
  assert_exists "$PLUGIN/.kilo/skills/quick-bugfix/SKILL.md" "quick-bugfix skill"
  assert_exists "$PLUGIN/.kilo/skills/research/SKILL.md" "research skill"
  assert_exists "$PLUGIN/.kilo/skills/migration/SKILL.md" "migration skill"
}

test_3_agents() {
  echo "==> Test 3: Agent detection"
  assert_exists "$PLUGIN/.kilo/agents/maister-gap-analyzer.md" "gap-analyzer agent"
  assert_exists "$PLUGIN/.kilo/agents/maister-project-analyzer.md" "project-analyzer agent"
  assert_exists "$PLUGIN/.kilo/agents/maister-task-classifier.md" "task-classifier agent"
  assert_exists "$PLUGIN/.kilo/agents/maister-specification-creator.md" "specification-creator agent"
  # Verify agent frontmatter
  assert_contains "$PLUGIN/.kilo/agents/maister-gap-analyzer.md" "mode: subagent" "agent frontmatter has mode: subagent"
}

test_4_config() {
  echo "==> Test 4: Config validity"
  assert_contains "$PLUGIN/kilo.json" '"\$schema"' "kilo.json has schema"
  assert_contains "$PLUGIN/kilo.json" 'instructions' "kilo.json has instructions"
  assert_contains "$PLUGIN/AGENTS.md" "maister" "AGENTS.md references maister"
  assert_exists "$PLUGIN/.kilo/rules/maister-workflows.md" "maister-workflows rule"
  assert_exists "$PLUGIN/.kilo/rules/maister-docs.md" "maister-docs rule"
}

run_test() {
  case "$1" in
    1) test_1_structure ;;
    2) test_2_skills ;;
    3) test_3_agents ;;
    4) test_4_config ;;
    *) echo "Unknown test: $1" >&2; return 1 ;;
  esac
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --test) SINGLE_TEST="${2:-}"; shift 2 ;;
      --help|-h) usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    esac
  done

  if [ ! -d "$PLUGIN/.kilo" ]; then
    echo "Plugin not built. Running make build-kilo..."
    make -C "$ROOT" build-kilo >/dev/null
  fi

  if [ -n "$SINGLE_TEST" ]; then
    run_test "$SINGLE_TEST"
  else
    test_1_structure
    test_2_skills
    test_3_agents
    test_4_config
  fi

  echo ""
  echo "Results: $PASS passed, $FAIL failed"
  if [ "$FAIL" -gt 0 ]; then
    exit 1
  fi
  echo "PASS: maister-kilo structural smoke tests"
}

main "$@"
