#!/usr/bin/env bash
# Delegation, TUI progress & explore transforms (Task Group 5) — steps 7, 13–15.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="$ROOT/plugins/maister-kiro"
PLATFORM="$ROOT/platforms/kiro-cli"

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

# Single build for all assertions (each test function only greps output)
run_build

# 1. Zero TaskCreate / TaskUpdate (rule 20)
test_no_task_create_update() {
  ! grep -rE 'TaskCreate|TaskUpdate' "$OUT" --include="*.md" 2>/dev/null
}

# 2. Zero subagent_type Explore / explore subagent refs (rule 12)
test_no_explore_subagent_type() {
  ! grep -rE 'subagent_type.*[Ee]xplore' "$OUT" --include="*.md" 2>/dev/null && \
    ! grep -rE 'Explore (subagents|agents|agent)' "$OUT" --include="*.md" 2>/dev/null
}

# 3. Task tool → subagent in sample agent instruction
test_task_to_subagent() {
  local f="$OUT/agents/instructions/maister-docs-operator.md"
  test -f "$f" && \
    grep -q 'subagent tool' "$f" && \
    ! grep -q 'Task tool' "$f"
}

# 4. Skill tool → /maister-* slash semantics in orchestrator skill
test_skill_to_slash() {
  local f="$OUT/skills/maister-development/SKILL.md"
  test -f "$f" && \
    grep -q '/maister-' "$f" && \
    ! grep -q 'Skill tool' "$f"
}

# 5. TUI progress transforms applied to orchestrator-framework (TaskCreate → todo)
test_tui_progress_on_orchestrator_glob() {
  local f="$OUT/skills/maister-orchestrator-framework/SKILL.md"
  grep -q 'todo' "$f" && \
    ! grep -qE 'TaskCreate|TaskUpdate' "$f"
}

# 7. No classic-only enableTodoList setup in output
test_no_classic_enable_todo_list() {
  ! grep -rE 'enableTodoList true|settings chat\.ui.*classic|chat\.ui "classic"' "$OUT" 2>/dev/null
}

# 8. No forced chat.ui in profile settings (Kiro CLI defaults to TUI)
test_no_forced_chat_ui_settings() {
  test ! -f "$OUT/settings/cli.json"
}

echo "=== Kiro CLI delegation/TUI progress tests (Task Group 5) ==="

assert "zero TaskCreate/TaskUpdate in output" test_no_task_create_update
assert "zero Explore subagent_type / Explore agent refs" test_no_explore_subagent_type
assert "Task tool rewritten to subagent in docs-operator instruction" test_task_to_subagent
assert "Skill tool rewritten to /maister-* slash in development skill" test_skill_to_slash
assert "TUI progress transforms on orchestrator-framework skill" test_tui_progress_on_orchestrator_glob
assert "no enableTodoList or classic UI references in output" test_no_classic_enable_todo_list
assert "settings/cli.json does not force chat.ui" test_no_forced_chat_ui_settings

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
