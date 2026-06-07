#!/usr/bin/env bash
# Task Group 8: smoke install, wrapper, and headless CLI tests.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM="$SCRIPT_DIR/.."
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SMOKE_INSTALL="$PLATFORM/smoke-install.sh"
SMOKE_CLI="$PLATFORM/smoke-cli.sh"
WRAPPER="$PLATFORM/maister-kiro"

pass=0
fail=0
skip=0

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

skip_test() {
  local desc="$1"
  echo "SKIP: $desc"
  skip=$((skip + 1))
}

# 1. smoke-install.sh --help exits 0
test_smoke_install_help() {
  "$SMOKE_INSTALL" --help | grep -q 'KIRO_HOME'
}

# 2. Dry-run install to temp KIRO_HOME without touching ~/.kiro/
test_smoke_install_isolated() {
  local dest
  dest=$(mktemp -d)
  local marker="$HOME/.kiro/.maister-smoke-guard-$$"
  mkdir -p "$HOME/.kiro"
  touch "$marker"
  local before_mtime
  before_mtime=$(stat -f '%m' "$marker" 2>/dev/null || stat -c '%Y' "$marker")

  KIRO_HOME="$dest" "$SMOKE_INSTALL" --no-default "$dest" >/dev/null

  test -f "$dest/agents/maister.json"
  test -d "$dest/skills/maister-init"
  test ! -f "$HOME/.kiro/agents/maister.json"
  local after_mtime
  after_mtime=$(stat -f '%m' "$marker" 2>/dev/null || stat -c '%Y' "$marker")
  test "$before_mtime" = "$after_mtime"

  rm -f "$marker"
  rm -rf "$dest"
}

# 3. maister-kiro wrapper defaults KIRO_HOME to ~/.kiro-maister
test_wrapper_default_kiro_home() {
  test -x "$WRAPPER"
  bash -n "$WRAPPER"
  grep -q 'KIRO_HOME="${KIRO_HOME:-$HOME/.kiro-maister}"' "$WRAPPER"
  grep -q 'exec kiro-cli' "$WRAPPER"
}

# 4. fix_agent_prompts converts promptFile → prompt file:// URI
test_fix_agent_prompts() {
  local tmp
  tmp=$(mktemp -d)
  mkdir -p "$tmp/agents/instructions"
  echo '{"name":"t","promptFile":"instructions/t.md"}' >"$tmp/agents/t.json"
  # shellcheck source=/dev/null
  source "$PLATFORM/smoke-install.sh"
  fix_agent_prompts "$tmp"
  jq -e '.prompt == "file://./instructions/t.md" and (.promptFile | not)' "$tmp/agents/t.json" >/dev/null
  rm -rf "$tmp"
}

# 5. Ephemeral KIRO_HOME + workspace .kiro/ copy pattern
test_workspace_kiro_copy() {
  local kiro_home ws
  kiro_home=$(mktemp -d)
  ws=$(mktemp -d)
  make -C "$ROOT" build-kiro >/dev/null
  # shellcheck source=/dev/null
  source "$SMOKE_INSTALL"
  # shellcheck source=/dev/null
  source "$SMOKE_CLI"
  setup_smoke_workspace "$kiro_home" "$ws"
  test -f "$ws/.kiro/agents/maister.json"
  test -d "$ws/.kiro/skills/maister-init"
  jq -e '.prompt | startswith("file://")' "$ws/.kiro/agents/maister.json" >/dev/null
  rm -rf "$kiro_home" "$ws"
}

# 6–8. Headless smoke-cli tests (skip when kiro-cli unavailable)
run_smoke_cli_test() {
  local n="$1" pattern="$2"
  if ! command -v kiro-cli >/dev/null 2>&1; then
    skip_test "smoke-cli test $n — kiro-cli not in PATH"
    return 0
  fi
  local out
  if out=$("$SMOKE_CLI" --test "$n" 2>&1); then
    echo "$out" | grep -q "$pattern"
  else
    return 1
  fi
}

test_smoke_cli_init_detection() {
  run_smoke_cli_test 1 'maister-init'
}

test_smoke_cli_gap_analyzer() {
  run_smoke_cli_test 2 'maister-gap-analyzer'
}

test_smoke_cli_quick_plan() {
  run_smoke_cli_test 3 '.maister/plans'
}

assert "smoke-install.sh --help documents KIRO_HOME" test_smoke_install_help
assert "smoke-install to temp KIRO_HOME does not touch ~/.kiro/" test_smoke_install_isolated
assert "maister-kiro wrapper sets KIRO_HOME default" test_wrapper_default_kiro_home
assert "fix_agent_prompts converts promptFile to file:// prompt" test_fix_agent_prompts
assert "ephemeral KIRO_HOME + workspace .kiro/ copy works" test_workspace_kiro_copy
assert "smoke-cli test 1 — maister-init skill detection" test_smoke_cli_init_detection
assert "smoke-cli test 2 — maister-gap-analyzer delegation" test_smoke_cli_gap_analyzer
assert "smoke-cli test 3 — quick-plan writes .maister/plans/*.md" test_smoke_cli_quick_plan

echo ""
echo "Results: $pass passed, $fail failed, $skip skipped"
test "$fail" -eq 0
