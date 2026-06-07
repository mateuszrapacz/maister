#!/usr/bin/env bash
# Chat-native gate transform tests (Task Group 4) — step 8–9 partial.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="$ROOT/plugins/maister-kiro"
PLATFORM="$ROOT/platforms/kiro-cli"
TRANSFORM_DOC="$PLATFORM/transforms/askuser-to-chat-gate.md"

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

# Ban grep helper — mirrors validate-kiro rules 11/25 (allows "no AskQuestion" documentation)
banned_question_tools() {
  grep -rE 'AskUserQuestion|AskQuestion' "$OUT" --include="*.md" 2>/dev/null \
    | grep -v 'no AskQuestion' \
    | grep -v 'no AskUserQuestion' || true
}

# 1. Zero AskUserQuestion in output markdown (rule 25)
test_no_ask_user_question() {
  run_build
  test -z "$(banned_question_tools | grep AskUserQuestion || true)"
}

# 2. Zero AskQuestion in output markdown
test_no_ask_question() {
  run_build
  test -z "$(banned_question_tools | grep AskQuestion || true)"
}

# 3. Transform reference doc exists (rule 27)
test_transform_doc_exists() {
  test -f "$TRANSFORM_DOC"
}

# 4. Orchestrator development skill contains CHAT GATE markers (rule 26 spot-check)
test_development_has_chat_gate() {
  run_build
  local f="$OUT/skills/maister-development/SKILL.md"
  test -f "$f" && grep -q 'CHAT GATE' "$f"
}

# 5. Headless defaults table documented in transform doc (3B)
test_headless_defaults_table() {
  grep -q 'Headless Defaults' "$TRANSFORM_DOC" && \
    grep -q 'no-interactive' "$TRANSFORM_DOC" && \
    grep -q 'Orchestrator phase exit gates' "$TRANSFORM_DOC"
}

# 6. Multi-select rewritten to sequential single-choice in init skill (3C)
test_multiselect_sequential_rewrite() {
  run_build
  local f="$OUT/skills/maister-init/SKILL.md"
  test -f "$f" && grep -q 'sequential single-choice' "$f" && \
    ! grep -q 'multi-select' "$f"
}

# 7. MANDATORY GATE / Pause markers become CHAT GATE in development orchestrator
test_mandatory_gate_to_chat_gate() {
  run_build
  local f="$OUT/skills/maister-development/SKILL.md"
  test -f "$f" && \
    grep -q '→ \*\*CHAT GATE\*\*' "$f" && \
    ! grep -q 'MANDATORY GATE' "$f"
}

echo "=== Kiro CLI chat gate tests (Task Group 4) ==="

assert "zero AskUserQuestion in output *.md (rule 25)" test_no_ask_user_question
assert "zero AskQuestion in output *.md" test_no_ask_question
assert "transforms/askuser-to-chat-gate.md exists (rule 27)" test_transform_doc_exists
assert "maister-development/SKILL.md contains CHAT GATE markers" test_development_has_chat_gate
assert "headless defaults table in transform doc (3B)" test_headless_defaults_table
assert "multi-select → sequential in maister-init (3C)" test_multiselect_sequential_rewrite
assert "MANDATORY GATE → CHAT GATE in development orchestrator" test_mandatory_gate_to_chat_gate

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
