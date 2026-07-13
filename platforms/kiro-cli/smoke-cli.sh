#!/usr/bin/env bash
# Headless smoke tests for maister-kiro via kiro-cli (no IDE).
#
# Usage:
#   smoke-cli.sh           Run all four tests
#   smoke-cli.sh --test N  Run test 1, 2, 3, or 4 only
#
# E2E scenario mapping (see docs/kiro-cli-support.md):
#   --test 1 → scenario 1 (init skill detection)
#   --test 2 → scenario 5 (gap-analyzer delegation)
#   --test 3 → scenario 6 quick-plan
#   --test 4 → scenario 6 quick-bugfix
#
# Prerequisites: kiro-cli in PATH; optional KIRO_API_KEY for CI.
# Uses ephemeral KIRO_HOME + workspace .kiro/ copy (ADR-001/ADR-010).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$ROOT/plugins/maister-kiro"
WRAPPER="$SCRIPT_DIR/maister-kiro"

# Headless defaults (3B) — platforms/kiro-cli/transforms/askuser-to-chat-gate.md
HEADLESS_DEFAULTS='Headless Defaults (3B): orchestrator phase gates → proceed to next phase; scope/decision gates → accept recommended option; verification prompts → run all recommended checks; init standards scope → global only; quick-plan approval → proceed with generated plan; quick-bugfix escalation → stay in quick-bugfix; fix-loop → fix all fixable issues; optional E2E/user-docs → skip.'

WORKSPACE="${WORKSPACE:-}"
KIRO_HOME_EPHEMERAL="${KIRO_HOME:-}"
SINGLE_TEST=""
CLEANUP_KIRO_HOME=0
CLEANUP_WORKSPACE=0

contract_check() {
  local framework="$SOURCE/skills/maister-orchestrator-framework"
  local patterns="$framework/references/orchestrator-patterns.md"
  local engine="$framework/references/gate-decision-engine.md"
  local matrix="$framework/references/host-capabilities.yml"
  local init="$SOURCE/skills/maister-init/SKILL.md"

  test -f "$SOURCE/agents/maister-advisor.json"
  jq -e '.name == "maister-advisor" and .tools == ["read","grep","glob"]' "$SOURCE/agents/maister-advisor.json" >/dev/null
  grep -q '^[[:space:]]\+advisor_agent: advisor$' "$patterns"
  grep -q '^[[:space:]]\+arbiter_agent: advisor$' "$patterns"
  grep -q '^[[:space:]]\+phase-exit: manual$' "$patterns"
  grep -q 'The hard denylist is:' "$engine"
  grep -q 'exactly one complete `orchestrator.options.advisor` snapshot' "$patterns"
  grep -q '^  - host: kiro$' "$matrix"
  grep -A2 '^  - host: kiro$' "$matrix" | grep -q 'target: platforms/kiro-cli/tests/fully-automatic-continuation.e2e.sh'
  grep -q '^argument-hint: "\[--standards-from=PATH\] \[--advisor=on|off\]"$' "$init"
  grep -q 'native question capability' "$init"
  grep -q 'CHAT GATE' "$SOURCE/skills/maister-development/SKILL.md"
  ! grep -RInE 'AskUserQuestion|AskQuestion|schema_version:|advisor_version:|synthetic user answer' "$SOURCE/skills" "$framework" --include='*.md' >/dev/null
  test ! -e "$SOURCE/skills/maister-init/bin/advisor.toml"
  echo "PASS: Kiro Advisor platform contract"
}

usage() {
  cat <<EOF
Headless smoke tests for Maister on Kiro CLI.

Usage: smoke-cli.sh [--test N]

  --test 1   maister-init skill detection (E2E scenario 1 partial)
  --test 2   subagent maister-gap-analyzer delegation (E2E scenario 5)
  --test 3   quick-plan writes .maister/plans/*.md (E2E scenario 6)
  --test 4   quick-bugfix writes fix plan under .maister/plans/ (E2E scenario 6)
  --help     Show this help

Environment:
  WORKSPACE   Test workspace directory (default: ephemeral temp dir)
  KIRO_HOME   Profile directory (default: ephemeral temp dir)
  KIRO_API_KEY  Optional API key for CI
EOF
}

# shellcheck source=/dev/null
source "$SCRIPT_DIR/smoke-install.sh"

setup_smoke_workspace() {
  local kiro_home="$1"
  local ws="$2"

  mkdir -p "$kiro_home"
  rm -rf "${kiro_home:?}/"*
  cp -R "$SOURCE/." "$kiro_home/"
  fix_hook_paths "$kiro_home"
  fix_prompt_paths "$kiro_home"

  mkdir -p "$ws"
  rm -rf "$ws/.kiro"
  mkdir -p "$ws/.kiro"
  cp -R "$kiro_home/." "$ws/.kiro/"
  fix_hook_paths "$ws/.kiro"
  fix_prompt_paths "$ws/.kiro"
  cd "$ws"
  git init -q 2>/dev/null || true
}

run_chat() {
  local model_args=()
  if [ -n "${KIRO_SMOKE_MODEL:-}" ]; then
    model_args=(--model "$KIRO_SMOKE_MODEL")
  fi
  KIRO_HOME="$KIRO_HOME_EPHEMERAL" "$WRAPPER" chat \
    --no-interactive \
    --trust-all-tools \
    --agent maister \
    "${model_args[@]}" \
    "$@"
}

test_1_init_detection() {
  echo "==> Test 1: plugin detection (maister-init skill)"
  local out
  out=$(run_chat "Reply ONLY JSON: {\"plugin_detected\": bool, \"init_skill\": string}. Check whether maister-init slash skill exists in this profile. ${HEADLESS_DEFAULTS}")
  echo "$out"
  echo "$out" | grep -q 'maister-init' || { echo "FAIL: init skill not detected"; return 1; }
}

test_2_gap_analyzer() {
  echo "==> Test 2: subagent maister-gap-analyzer delegation"
  local out
  out=$(run_chat "Delegate to subagent agent maister-gap-analyzer with prompt: reply ONLY {\"agent\":\"maister-gap-analyzer\",\"ok\":true}. Return that JSON. ${HEADLESS_DEFAULTS}")
  echo "$out"
  echo "$out" | grep -q 'maister-gap-analyzer' || { echo "FAIL: custom agent delegation"; return 1; }
}

test_3_quick_plan() {
  echo "==> Test 3: quick-plan artifact"
  rm -rf .maister
  local out
  out=$(run_chat "Invoke the maister-quick-plan slash skill for: Add ping endpoint. ${HEADLESS_DEFAULTS} Stop after writing the plan file under .maister/plans/; do not implement code.")
  echo "$out" | tail -10
  test -n "$(find .maister/plans -name '*.md' 2>/dev/null | head -1)" || {
    echo "FAIL: plan file missing under .maister/plans/"
    return 1
  }
}

test_4_quick_bugfix() {
  echo "==> Test 4: quick-bugfix plan artifact"
  rm -rf .maister
  local out
  out=$(run_chat "Invoke the maister-quick-bugfix slash skill for: greet() returns undefined when name is empty. ${HEADLESS_DEFAULTS} Stop after writing the fix plan under .maister/plans/; do not implement code or run tests yet.")
  echo "$out" | tail -10
  test -n "$(find .maister/plans -name '*.md' 2>/dev/null | head -1)" || {
    echo "FAIL: bugfix plan file missing under .maister/plans/"
    return 1
  }
}

run_test() {
  case "$1" in
    1) test_1_init_detection ;;
    2) test_2_gap_analyzer ;;
    3) test_3_quick_plan ;;
    4) test_4_quick_bugfix ;;
    *) echo "Unknown test: $1" >&2; return 1 ;;
  esac
}

main() {
  if [ "${1:-}" = "--contract" ]; then
    contract_check
    exit 0
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --test)
        SINGLE_TEST="${2:-}"
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done

  if ! command -v kiro-cli >/dev/null 2>&1; then
    echo "SKIP: kiro-cli not found in PATH — install Kiro CLI to run headless smoke tests"
    echo "Structural install tests: bash platforms/kiro-cli/tests/smoke.test.sh"
    exit 0
  fi

  echo "==> Building plugin"
  make -C "$ROOT" build-kiro >/dev/null

  if [ -z "$KIRO_HOME_EPHEMERAL" ]; then
    KIRO_HOME_EPHEMERAL=$(mktemp -d)
    CLEANUP_KIRO_HOME=1
  fi

  if [ -z "$WORKSPACE" ]; then
    WORKSPACE=$(mktemp -d)
    CLEANUP_WORKSPACE=1
  fi

  trap 'if [ "$CLEANUP_KIRO_HOME" -eq 1 ]; then rm -rf "$KIRO_HOME_EPHEMERAL"; fi; if [ "$CLEANUP_WORKSPACE" -eq 1 ]; then rm -rf "$WORKSPACE"; fi' EXIT

  setup_smoke_workspace "$KIRO_HOME_EPHEMERAL" "$WORKSPACE"

  if [ -n "$SINGLE_TEST" ]; then
    run_test "$SINGLE_TEST"
    echo ""
    echo "PASS: smoke-cli test $SINGLE_TEST"
    exit 0
  fi

  test_1_init_detection
  test_2_gap_analyzer
  test_3_quick_plan
  test_4_quick_bugfix

  echo ""
  echo "PASS: maister-kiro headless smoke tests (4/4)"
  echo "KIRO_HOME: $KIRO_HOME_EPHEMERAL"
  echo "Workspace: $WORKSPACE"
  echo ""
  echo "Example:"
  echo "  KIRO_HOME=\"$KIRO_HOME_EPHEMERAL\" $WRAPPER chat --agent maister"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
