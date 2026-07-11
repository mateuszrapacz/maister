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

# 3. Default install enables the default agent and aliases, but not Playwright MCP
test_default_install_profile() {
  local dest rc mock_bin log
  dest=$(mktemp -d)
  rc=$(mktemp)
  mock_bin=$(mktemp -d)
  log=$(mktemp)
  cat >"$mock_bin/kiro-cli" <<EOF
#!/bin/bash
echo "\$*" >> "$log"
EOF
  chmod +x "$mock_bin/kiro-cli"

  PATH="$mock_bin:$PATH" KIRO_HOME="$dest" MAISTER_SHELL_RC="$rc" \
    "$SMOKE_INSTALL" "$dest" >/dev/null

  grep -q 'settings chat.defaultAgent maister --global' "$log"
  grep -q "alias maister-kiro='KIRO_HOME=\"$dest\"" "$rc"
  grep -q "alias mk='maister-kiro chat" "$rc"
  test ! -e "$dest/settings/mcp.json"

  rm -rf "$dest" "$mock_bin" "$rc" "$log"
}

# 4. Playwright MCP remains an explicit opt-in for Kiro
test_opt_in_mcp_install() {
  local dest
  dest=$(mktemp -d)
  KIRO_HOME="$dest" "$SMOKE_INSTALL" --no-default --no-alias --with-mcp-playwright "$dest" >/dev/null
  test -f "$dest/settings/mcp.json"
  jq -e '.includeMcpJson == true' "$dest/agents/maister.json" >/dev/null
  rm -rf "$dest"
}

# 5. maister-kiro wrapper defaults KIRO_HOME to ~/.kiro-maister
test_wrapper_default_kiro_home() {
  test -x "$WRAPPER"
  bash -n "$WRAPPER"
  grep -q 'KIRO_HOME="${KIRO_HOME:-$HOME/.kiro-maister}"' "$WRAPPER"
  grep -q 'exec kiro-cli' "$WRAPPER"
}

# 6. build output uses prompt file:// URI (no promptFile, no model:inherit)
test_agent_json_prompt_shape() {
  make -C "$ROOT" build-kiro >/dev/null
  local f="$ROOT/plugins/maister-kiro/agents/maister-gap-analyzer.json"
  jq -e '
    .prompt == "file://./instructions/maister-gap-analyzer.md"
    and (.promptFile | not)
    and ((.model // null) | . == null or . != "inherit")
  ' "$f" >/dev/null
  ! grep -rl 'promptFile\|"model": "inherit"' "$ROOT/plugins/maister-kiro/agents"/*.json >/dev/null 2>&1
}

# 7. --set-alias writes idempotent maister-kiro/mk block to shell rc
test_install_shell_aliases() {
  local dest rc
  dest=$(mktemp -d)
  rc=$(mktemp)
  MAISTER_SHELL_RC="$rc" "$SMOKE_INSTALL" --no-default --set-alias "$dest" >/dev/null
  grep -qF '# >>> maister-kiro aliases' "$rc"
  grep -q "alias maister-kiro='KIRO_HOME=\"$dest\"" "$rc"
  grep -q "alias mk='maister-kiro chat'" "$rc"
  local count
  count=$(grep -c "alias mk='maister-kiro chat'" "$rc" || true)
  test "$count" -eq 1
  MAISTER_SHELL_RC="$rc" "$SMOKE_INSTALL" --no-default --set-alias "$dest" >/dev/null
  count=$(grep -c "alias mk='maister-kiro chat'" "$rc" || true)
  test "$count" -eq 1
  rm -rf "$dest" "$rc"
}

# 8. fix_prompt_paths rewrites relative file:// prompts to absolute KIRO_HOME paths
test_fix_prompt_paths_absolute() {
  local dest
  dest=$(mktemp -d)
  mkdir -p "$dest/agents/instructions"
  echo '{"name":"maister-gap-analyzer","prompt":"file://./instructions/maister-gap-analyzer.md"}' \
    >"$dest/agents/maister-gap-analyzer.json"
  # shellcheck source=/dev/null
  source "$SMOKE_INSTALL"
  fix_prompt_paths "$dest"
  jq -e --arg home "$dest" \
    '.prompt == ("file://" + $home + "/agents/instructions/maister-gap-analyzer.md")' \
    "$dest/agents/maister-gap-analyzer.json" >/dev/null
  rm -rf "$dest"
}

# 9. Hook contracts: plain text for agentSpawn, JSON block for stop
test_hook_output_contracts() {
  local skill_out stop_out
  skill_out=$("$ROOT/plugins/maister-kiro/hooks/skill-invocation-reminder.sh" </dev/null)
  echo "$skill_out" | grep -q 'MAISTER PLUGIN RULE'
  ! echo "$skill_out" | jq -e . >/dev/null 2>&1

  local ws
  ws=$(mktemp -d)
  mkdir -p "$ws/.maister/tasks/demo-task"
  cat >"$ws/.maister/tasks/demo-task/orchestrator-state.yml" <<'EOF'
status: in_progress
current_phase: implementation
completed_phases: []
EOF
  stop_out=$(echo "{\"cwd\":\"$ws\"}" | "$ROOT/plugins/maister-kiro/hooks/stop-state-reminder-kiro.sh")
  echo "$stop_out" | jq -e '.decision == "block" and (.reason | length > 0)' >/dev/null
  rm -rf "$ws"
}

# 10. Ephemeral KIRO_HOME + workspace .kiro/ copy pattern
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
assert "default install enables agent and aliases without Playwright MCP" test_default_install_profile
assert "Playwright MCP is opt-in for Kiro" test_opt_in_mcp_install
assert "maister-kiro wrapper sets KIRO_HOME default" test_wrapper_default_kiro_home
assert "build emits prompt file:// URI without promptFile or model:inherit" test_agent_json_prompt_shape
assert "fix_prompt_paths rewrites relative prompts to absolute KIRO_HOME paths" test_fix_prompt_paths_absolute
assert "hook scripts emit Kiro contracts (plain text + stop JSON block)" test_hook_output_contracts
assert "--set-alias installs maister-kiro and mk in shell rc" test_install_shell_aliases
assert "ephemeral KIRO_HOME + workspace .kiro/ copy works" test_workspace_kiro_copy
assert "smoke-cli test 1 — maister-init skill detection" test_smoke_cli_init_detection
assert "smoke-cli test 2 — maister-gap-analyzer delegation" test_smoke_cli_gap_analyzer
assert "smoke-cli test 3 — quick-plan writes .maister/plans/*.md" test_smoke_cli_quick_plan

echo ""
echo "Results: $pass passed, $fail failed, $skip skipped"
test "$fail" -eq 0
