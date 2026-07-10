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

# 1. Rule 23: shortcut skills exist in output (replaced @prompts)
test_shortcut_skills() {
  run_build
  test -d "$OUT/skills/dev"
  test -d "$OUT/skills/work"
  test -d "$OUT/skills/resume"
  test -d "$OUT/skills/status"
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

# 5. stop-state-reminder-kiro wired to stop hook
test_stop_state_reminder_hook() {
  run_build
  jq -e '
    (.hooks.stop // []) | map(.command) | any(test("stop-state-reminder-kiro"))
  ' "$OUT/agents/maister.json" >/dev/null
  test -x "$OUT/hooks/stop-state-reminder-kiro.sh"
}

# 6. skill-invocation-reminder wired to agentSpawn + userPromptSubmit
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
  grep -q '/maister-development' "$OUT/skills/dev/SKILL.md"
}

# 6b. /quick-plan skill maps to /maister-quick-plan (not Kiro /plan)
test_quick_plan_prompt() {
  run_build
  test -f "$OUT/skills/quick-plan/SKILL.md"
  test ! -d "$OUT/skills/plan"
  grep -q '/maister-quick-plan' "$OUT/skills/quick-plan/SKILL.md"
}

# 6c. grill-me and thermos shortcut skills exist
test_grill_thermos_prompts() {
  run_build
  grep -q '/maister-grill-me' "$OUT/skills/grill-me/SKILL.md"
  grep -q '/maister-thermos' "$OUT/skills/thermos/SKILL.md"
}

# 6e. /grill-with-docs shortcut maps to /maister-grill-with-docs
test_grill_with_docs_shortcut() {
  run_build
  test -d "$OUT/skills/grill-with-docs" && \
    grep -q '/maister-grill-with-docs' "$OUT/skills/grill-with-docs/SKILL.md"
}

# 6f. FR-5.4: grill skills prohibit plan implementation (grep contract A-F)
test_grill_prohibit_implementation() {
  run_build
  local src_me="$ROOT/plugins/maister/skills/grill-me/SKILL.md"
  local src_docs="$ROOT/plugins/maister/skills/grill-with-docs/SKILL.md"
  local gen_me="$OUT/skills/maister-grill-me/SKILL.md"
  local gen_docs="$OUT/skills/maister-grill-with-docs/SKILL.md"
  local ok=1

  # Pattern A: grill-me must prohibit plan implementation
  if ! grep -Eiq '(never|do not|prohibit).*(implement|implementation)' "$src_me"; then
    echo "  missing pattern A on grill-me source"
    ok=0
  fi

  # Pattern B: grill-with-docs must prohibit plan implementation
  if [ -f "$src_docs" ]; then
    if ! grep -Eiq '(never|do not|prohibit).*(implement|implementation)' "$src_docs"; then
      echo "  missing pattern B on grill-with-docs source"
      ok=0
    fi
  else
    echo "  grill-with-docs source missing (pattern B)"
    ok=0
  fi

  # Pattern C: no permissive implementation language in both source skills
  if grep -Eiq 'proceed to implement' "$src_me"; then
    echo "  permissive language in grill-me (pattern C)"
    ok=0
  fi
  if [ -f "$src_docs" ] && grep -Eiq 'proceed to implement' "$src_docs"; then
    echo "  permissive language in grill-with-docs (pattern C)"
    ok=0
  fi

  # Pattern D: grill-me must prohibit doc/code mutation
  if ! grep -Eiq '(never|do not|prohibit).*(edit|mutat).*(documentation|code|files?)' "$src_me" && \
     ! grep -Eiq 'read-only|no (documentation|code) edits' "$src_me"; then
    echo "  missing pattern D on grill-me source"
    ok=0
  fi

  # Pattern E: grill-with-docs must prohibit CONTEXT.md convention
  if [ -f "$src_docs" ]; then
    if ! grep -Eiq '(prohibit|do not|never).*(CONTEXT\.md|CONTEXT-MAP\.md)' "$src_docs"; then
      echo "  missing pattern E on grill-with-docs source"
      ok=0
    fi
  else
    echo "  grill-with-docs source missing (pattern E)"
    ok=0
  fi

  # Pattern F: prohibition survives build (skip generated file if missing during red gate)
  if [ -f "$gen_me" ]; then
    if ! grep -Eiq '(never|do not|prohibit).*(implement|implementation)' "$gen_me"; then
      echo "  missing pattern F on generated grill-me"
      ok=0
    fi
    if ! grep -Eiq 'read-only|no (documentation|code) edits' "$gen_me"; then
      echo "  missing read-only prohibition on generated grill-me (pattern F2)"
      ok=0
    fi
  fi
  if [ -f "$gen_docs" ]; then
    if ! grep -Eiq '(never|do not|prohibit).*(implement|implementation)' "$gen_docs"; then
      echo "  missing pattern F on generated grill-with-docs"
      ok=0
    fi
    if ! grep -Eiq '(prohibit|do not|never).*(CONTEXT\.md|CONTEXT-MAP\.md)' "$gen_docs"; then
      echo "  missing CONTEXT prohibition on generated grill-with-docs (pattern F3)"
      ok=0
    fi
  fi

  test "$ok" -eq 1
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

assert "shortcut skills exist (dev, work, resume, status)" test_shortcut_skills
assert "trustedAgents in maister.json (rule 21)" test_trusted_agents
assert "all hook scripts executable (rule 22)" test_hooks_executable
assert "maister-kiro wrapper executable (rule 24)" test_wrapper_exists
assert "stop-state-reminder-kiro on stop hook" test_stop_state_reminder_hook
assert "skill-invocation-reminder on agentSpawn + userPromptSubmit" test_skill_reminder_hooks
assert "/dev skill maps to /maister-development" test_dev_prompt_maps_development
assert "/quick-plan skill maps to /maister-quick-plan" test_quick_plan_prompt
assert "/grill-me and /thermos skills map to maister skills" test_grill_thermos_prompts
assert "/grill-with-docs shortcut maps to /maister-grill-with-docs" test_grill_with_docs_shortcut
assert "grill skills prohibit plan implementation (FR-5.4 grep contract)" test_grill_prohibit_implementation
assert "thermos skill has valid subagent syntax after build" test_thermos_subagent_syntax
assert "steering documents preCompact gap and hook paths" test_steering_hook_docs
assert "smoke-uninstall.sh removes KIRO_HOME" test_smoke_uninstall

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
