#!/usr/bin/env bash
# Task Group 9: Phase 2 UX — @prompts, hooks polish, uninstall.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PLATFORM="$SCRIPT_DIR/.."
OUT="$ROOT/plugins/maister-kiro"
SMOKE_UNINSTALL="$PLATFORM/smoke-uninstall.sh"
STEERING="$OUT/steering/maister-workflows.md"

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

# 1. Rule 23: 25 prompt files in output
test_prompt_count() {
  run_build
  test -d "$OUT/prompts"
  test "$(find "$OUT/prompts" -maxdepth 1 -type f | wc -l | tr -d ' ')" -eq 25
}

# 2. Rule 21: trustedAgents in maister.json
test_trusted_agents() {
  run_build
  jq -e '.toolsSettings.subagent.trustedAgents | length > 0' \
    "$OUT/agents/maister.json" >/dev/null
}

# 3. Rule 22: all hook scripts executable
test_hooks_executable() {
  run_build
  local f ok=1
  for f in "$OUT/hooks"/*.sh; do
    [ -x "$f" ] || ok=0
  done
  test "$ok" -eq 1
}

# 4. Rule 24: maister-kiro wrapper exists and is executable
test_wrapper_exists() {
  test -x "$PLATFORM/maister-kiro"
}

# 5. skill-invocation-reminder wired to agentSpawn + userPromptSubmit
test_skill_reminder_hooks() {
  run_build
  jq -e '
    (.hooks.agentSpawn // []) | map(.command) | any(test("skill-invocation-reminder"))
  ' "$OUT/agents/maister.json" >/dev/null
  jq -e '
    (.hooks.userPromptSubmit // []) | map(.command) | any(test("skill-invocation-reminder"))
  ' "$OUT/agents/maister.json" >/dev/null
}

# 6. @dev prompt maps to /maister-development
test_dev_prompt_maps_development() {
  run_build
  grep -q '/maister-development' "$OUT/prompts/dev.md"
}

# 6b. @quick-plan prompt maps to /maister-quick-plan (not Kiro /plan)
test_quick_plan_prompt() {
  run_build
  test -f "$OUT/prompts/quick-plan.md"
  test ! -f "$OUT/prompts/plan.md"
  grep -q '/maister-quick-plan' "$OUT/prompts/quick-plan.md"
  grep -q '@quick-plan' "$OUT/prompts/quick-plan.md"
}

# 6c. grill-me and thermos prompts exist
test_grill_thermos_prompts() {
  run_build
  grep -q '/maister-grill-me' "$OUT/prompts/grill-me.md"
  grep -q '/maister-thermos' "$OUT/prompts/thermos.md"
}

# 6d. thermos skill subagent lines survive Kiro build transforms
test_thermos_subagent_syntax() {
  run_build
  grep -q 'subagent tool with agent: `maister-thermo-nuclear-review-subagent`' \
    "$OUT/skills/maister-thermos/SKILL.md"
  ! grep -q 'review-subagent"' "$OUT/skills/maister-thermos/SKILL.md"
}

# 7. preCompact gap + hook path fallback documented in steering
test_steering_hook_docs() {
  run_build
  grep -qi 'preCompact' "$STEERING"
  grep -q 'hooks/' "$STEERING"
}

# 8. smoke-uninstall.sh removes KIRO_HOME
test_smoke_uninstall() {
  local dest
  dest=$(mktemp -d)
  mkdir -p "$dest/agents"
  echo '{}' >"$dest/agents/maister.json"
  KIRO_HOME="$dest" "$SMOKE_UNINSTALL" "$dest" >/dev/null
  test ! -d "$dest"
}

echo "=== Kiro CLI Phase 2 tests (Task Group 9) ==="

assert "25 files in prompts/ (rule 23)" test_prompt_count
assert "trustedAgents in maister.json (rule 21)" test_trusted_agents
assert "all hook scripts executable (rule 22)" test_hooks_executable
assert "maister-kiro wrapper executable (rule 24)" test_wrapper_exists
assert "skill-invocation-reminder on agentSpawn + userPromptSubmit" test_skill_reminder_hooks
assert "@dev prompt maps to /maister-development" test_dev_prompt_maps_development
assert "@quick-plan prompt maps to /maister-quick-plan; plan.md removed" test_quick_plan_prompt
assert "@grill-me and @thermos prompts map to skills" test_grill_thermos_prompts
assert "thermos skill has valid subagent syntax after build" test_thermos_subagent_syntax
assert "steering documents preCompact gap and hook paths" test_steering_hook_docs
assert "smoke-uninstall.sh removes KIRO_HOME" test_smoke_uninstall

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
