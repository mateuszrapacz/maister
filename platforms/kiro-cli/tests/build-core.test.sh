#!/usr/bin/env bash
# Build pipeline core tests (Task Group 3) — steps 1–6, 11.
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

# 1. Eighteen commands merged into skills/maister-*/SKILL.md; commands/ absent
test_commands_merged() {
  run_build
  test ! -d "$OUT/commands" && \
    test -f "$OUT/skills/maister-quick-dev/SKILL.md" && \
    test -f "$OUT/skills/maister-work/SKILL.md" && \
    test -f "$OUT/skills/maister-reviews-code/SKILL.md" && \
    test -f "$OUT/skills/maister-quick-requirements-critic/SKILL.md" && \
    test -f "$OUT/skills/maister-quick-transcript-critic/SKILL.md" && \
    test -f "$OUT/skills/maister-quick-problem-classifier/SKILL.md" && \
    test -f "$OUT/skills/maister-reviews-test-strategy/SKILL.md" && \
    test -f "$OUT/skills/maister-reviews-linguistic-boundaries/SKILL.md" && \
    test -f "$OUT/skills/maister-quick-metaprogram-classifier/SKILL.md" && \
    test -f "$OUT/skills/maister-modeling-context-distiller/SKILL.md" && \
    test -f "$OUT/skills/maister-modeling-aggregate-designer/SKILL.md"
}

# 2. Exactly 69 skill directories (43 maister-* + 26 shortcut dirs)
test_skill_dir_count() {
  run_build
  local count
  count=$(find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
  test "$count" -eq 69
}

# 3. Exactly 26 unprefixed shortcut skill directories
test_no_unprefixed_skill_dirs() {
  run_build
  test "$(find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*' | wc -l | tr -d ' ')" -eq 26
}

# 4. Each SKILL.md name: matches parent directory (rule 13)
test_skill_name_matches_dir() {
  run_build
  local f name parent mismatches=0
  while IFS= read -r f; do
    name=$(grep -m1 '^name: ' "$f" | sed 's/^name: //')
    parent=$(basename "$(dirname "$f")")
    if [ "$name" != "$parent" ]; then
      echo "  mismatch: $f (name=$name, dir=$parent)"
      mismatches=$((mismatches + 1))
    fi
  done < <(find "$OUT/skills" -name "SKILL.md")
  test "$mismatches" -eq 0
}

# 5. No maister: in output tree (rule 2)
test_no_maister_colon() {
  run_build
  ! grep -r 'maister:' "$OUT" --include="*.md" 2>/dev/null
}

# 6. No colons in skill name: frontmatter (rule 3)
test_no_colons_in_skill_names() {
  run_build
  ! grep -r '^name:.*:' "$OUT/skills/" --include="SKILL.md" 2>/dev/null
}

# 7. .mcp.json moved to settings/mcp.json (rule 9)
test_mcp_location() {
  run_build
  test -f "$OUT/settings/mcp.json" && test ! -f "$OUT/.mcp.json"
}

# 8. Merged quick-plan skill dir is skills/maister-quick-plan/
test_quick_plan_skill_dir() {
  run_build
  test -f "$OUT/skills/maister-quick-plan/SKILL.md" && \
    grep -q '^name: maister-quick-plan' "$OUT/skills/maister-quick-plan/SKILL.md"
}

echo "=== Kiro CLI build core tests (Task Group 3) ==="

assert "16 commands merged into skills/maister-*/; commands/ absent" test_commands_merged
assert "exactly 69 skill directories after core build" test_skill_dir_count
assert "exactly 26 unprefixed shortcut skill directories" test_no_unprefixed_skill_dirs
assert "each SKILL.md name: matches parent directory" test_skill_name_matches_dir
assert "no maister: in output tree" test_no_maister_colon
assert "no colons in skill name: frontmatter" test_no_colons_in_skill_names
assert ".mcp.json moved to settings/mcp.json" test_mcp_location
assert "merged quick-plan at skills/maister-quick-plan/" test_quick_plan_skill_dir

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
