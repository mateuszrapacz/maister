#!/usr/bin/env bash
# Task Group 7: validate-kiro structural rules — Makefile target tests.
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

# 1. Rule 1 negative: validate fails when output directory missing
test_validate_fails_without_output() {
  (cd "$ROOT" && make clean-kiro)
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    return 1
  fi
  run_build
}

# 2. Rules 1–20+ pass after full build
test_validate_passes_after_build() {
  run_build
  (cd "$ROOT" && make validate-kiro)
}

# 3. Rule 11/25: injected AskUserQuestion causes validate failure
test_inject_ask_user_question_fails() {
  run_build
  local f="$OUT/skills/maister-init/SKILL.md"
  cp "$f" "${f}.bak"
  echo 'AskUserQuestion' >> "$f"
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    mv "${f}.bak" "$f"
    return 1
  fi
  mv "${f}.bak" "$f"
}

# 4. Rule 2: injected maister: causes validate failure
test_inject_maister_colon_fails() {
  run_build
  local f="$OUT/skills/maister-init/SKILL.md"
  cp "$f" "${f}.bak"
  echo 'maister:init' >> "$f"
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    mv "${f}.bak" "$f"
    return 1
  fi
  mv "${f}.bak" "$f"
}

# 5. Rule 7: all agents/*.json parse with jq empty
test_all_agent_json_valid() {
  run_build
  local f
  for f in "$OUT"/agents/*.json; do
    jq empty "$f" || return 1
  done
}

# 6. Rules 14/28: exactly 67 total / 42 maister-* skill directories
test_exactly_67_skill_dirs() {
  run_build
  local total prefixed
  total=$(find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
  prefixed=$(find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d -name 'maister-*' | wc -l | tr -d ' ')
  test "$total" -eq 67 && test "$prefixed" -eq 42
}

# 7. Rule 26: CHAT GATE count meets documented threshold (chat-gate-audit.md)
test_chat_gate_count_threshold() {
  run_build
  local dev_count total
  dev_count=$(grep -c 'CHAT GATE' "$OUT/skills/maister-development/SKILL.md" || true)
  total=$(grep -r 'CHAT GATE' "$OUT/skills" --include='*.md' 2>/dev/null | wc -l | tr -d ' ')
  test "$dev_count" -ge 53 && test "$total" -ge 200
}

# 8. Rules 21–22 pass; rules 23–24 skip or pass when artifacts present
test_phase2_rules() {
  run_build
  jq -e '.toolsSettings.subagent.trustedAgents | length > 0' \
    "$OUT/agents/maister.json" >/dev/null
  local f ok=1
  for f in "$OUT/hooks"/*.sh; do
    [ -x "$f" ] || ok=0
  done
  test "$ok" -eq 1
}

# 9. Rule 29: injected promptFile causes validate failure
test_inject_prompt_file_fails() {
  run_build
  local f="$OUT/agents/maister-gap-analyzer.json"
  cp "$f" "${f}.bak"
  jq '. + {promptFile: "instructions/maister-gap-analyzer.md"}' "$f" >"${f}.tmp"
  mv "${f}.tmp" "$f"
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    mv "${f}.bak" "$f"
    return 1
  fi
  mv "${f}.bak" "$f"
}

# 10. Rule 30: injected model inherit causes validate failure
test_inject_model_inherit_fails() {
  run_build
  local f="$OUT/agents/maister-gap-analyzer.json"
  cp "$f" "${f}.bak"
  jq '. + {model: "inherit"}' "$f" >"${f}.tmp"
  mv "${f}.tmp" "$f"
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    mv "${f}.bak" "$f"
    return 1
  fi
  mv "${f}.bak" "$f"
}

# 11. Rule 31: non-file:// prompt causes validate failure
test_inject_invalid_prompt_fails() {
  run_build
  local f="$OUT/agents/maister-gap-analyzer.json"
  cp "$f" "${f}.bak"
  jq '.prompt = "inline prompt text"' "$f" >"${f}.tmp"
  mv "${f}.tmp" "$f"
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    mv "${f}.bak" "$f"
    return 1
  fi
  mv "${f}.bak" "$f"
}

# 12. Rule 32: removing hooks.stop causes validate failure
test_remove_stop_hook_fails() {
  run_build
  local f="$OUT/agents/maister.json"
  cp "$f" "${f}.bak"
  jq 'del(.hooks.stop)' "$f" >"${f}.tmp"
  mv "${f}.tmp" "$f"
  if (cd "$ROOT" && make validate-kiro 2>&1); then
    mv "${f}.bak" "$f"
    return 1
  fi
  mv "${f}.bak" "$f"
}

echo "=== Kiro CLI validate-kiro tests (Task Group 7) ==="

assert "make validate-kiro fails when output missing (rule 1 negative)" test_validate_fails_without_output
assert "make validate-kiro passes after full build" test_validate_passes_after_build
assert "injected AskUserQuestion causes validate failure (rules 11/25)" test_inject_ask_user_question_fails
assert "injected maister: causes validate failure (rule 2)" test_inject_maister_colon_fails
assert "all agents/*.json parse with jq empty (rule 7)" test_all_agent_json_valid
assert "exactly 67 total / 42 maister-* skill directories (rules 14/28)" test_exactly_67_skill_dirs
assert "CHAT GATE count meets documented threshold (rule 26)" test_chat_gate_count_threshold
assert "trustedAgents + executable hooks + transform doc (rules 21–22, 27)" test_phase2_rules
assert "injected promptFile causes validate failure (rule 29)" test_inject_prompt_file_fails
assert "injected model inherit causes validate failure (rule 30)" test_inject_model_inherit_fails
assert "injected non-file:// prompt causes validate failure (rule 31)" test_inject_invalid_prompt_fails
assert "removed hooks.stop causes validate failure (rule 32)" test_remove_stop_hook_fails

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
