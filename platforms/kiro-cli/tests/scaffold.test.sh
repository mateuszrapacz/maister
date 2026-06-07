#!/usr/bin/env bash
# Phase 0 scaffold tests — run only this file for Task Group 1 verification.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BUILD_SH="$ROOT/platforms/kiro-cli/build.sh"
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

# 1. make build-kiro exits 0 and creates plugins/maister-kiro/
test_build_kiro() {
  (cd "$ROOT" && make build-kiro) && test -d "$OUT"
}

# 2. make validate-kiro passes existence-only check (rule 1)
test_validate_kiro() {
  (cd "$ROOT" && make validate-kiro)
}

# 3. make clean-kiro removes output directory
test_clean_kiro() {
  (cd "$ROOT" && make clean-kiro)
  test ! -d "$OUT"
}

# 4. make build invokes build-kiro (aggregate target)
test_build_aggregate() {
  grep -q 'build-kiro' "$ROOT/Makefile" && \
    grep -E '^build:' "$ROOT/Makefile" | grep -q 'build-kiro'
}

# 5. stub build.sh defines sedi(), CORE, OUT, PLATFORM vars
test_build_sh_vars() {
  grep -q 'sedi()' "$BUILD_SH" && \
    grep -q 'CORE=' "$BUILD_SH" && \
    grep -q 'OUT=' "$BUILD_SH" && \
    grep -q 'PLATFORM=' "$BUILD_SH"
}

# 6. stub build removes .claude-plugin/ from output
test_no_claude_plugin() {
  (cd "$ROOT" && make build-kiro)
  test ! -d "$OUT/.claude-plugin"
}

# 7. stub build applies maister: → maister- on at least one skill
test_skill_name_transform() {
  (cd "$ROOT" && make build-kiro)
  grep -rq '^name: maister-' "$OUT/skills/" --include="SKILL.md"
}

echo "=== Kiro CLI Phase 0 scaffold tests ==="

assert "make build-kiro exits 0 and creates plugins/maister-kiro/" test_build_kiro
assert "make validate-kiro passes existence-only check" test_validate_kiro
assert "make clean-kiro removes output directory" test_clean_kiro
assert "make build invokes build-kiro (aggregate target)" test_build_aggregate
assert "stub build.sh defines sedi(), CORE, OUT, PLATFORM vars" test_build_sh_vars
assert "stub build removes .claude-plugin/ from output" test_no_claude_plugin
assert "stub build applies maister: → maister- on at least one skill" test_skill_name_transform

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
