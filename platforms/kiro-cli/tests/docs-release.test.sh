#!/usr/bin/env bash
# Task Group 11 — documentation and release readiness tests.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="$ROOT/plugins/maister-kiro"
DOCS="$ROOT/docs/kiro-cli-support.md"

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

test_kiro_docs_sections() {
  test -f "$DOCS" && \
    grep -qi 'install\|setup' "$DOCS" && \
    grep -qi 'daily\|workflow\|slash' "$DOCS" && \
    grep -qi 'known gap' "$DOCS"
}

test_readme_kiro_block() {
  grep -q '## Kiro CLI' "$ROOT/README.md" && \
    grep -q 'smoke-install.sh' "$ROOT/README.md" && \
    grep -q 'maister-kiro' "$ROOT/README.md"
}

test_build_pipeline_kiro() {
  local f="$ROOT/.maister/docs/standards/global/build-pipeline.md"
  grep -q 'Kiro' "$f" && \
    grep -q 'maister-kiro' "$f" && \
    grep -q 'AskUserQuestion\|AskQuestion' "$f"
}

test_tech_stack_fourth_platform() {
  local f="$ROOT/.maister/docs/project/tech-stack.md"
  grep -q 'Kiro CLI' "$f" && \
    grep -q 'maister-kiro' "$f" && \
    grep -q 'build-kiro' "$f"
}

test_plugin_dev_never_edit_kiro() {
  local f="$ROOT/.maister/docs/standards/global/plugin-development.md"
  grep -q 'maister-kiro' "$f" && \
    grep -qi 'never\|do not' "$f"
}

test_release_workflow_build_validate() {
  grep -q 'make build && make validate' "$ROOT/.github/workflows/release.yml"
}

test_maister_kiro_reproducible() {
  (cd "$ROOT" && make build-kiro) && \
    test -d "$OUT" && \
    test -f "$OUT/agents/maister.json" && \
    test -d "$OUT/skills" && \
    test -f "$OUT/settings/mcp.json"
}

test_cursor_cross_link() {
  grep -q 'kiro-cli-support.md' "$ROOT/docs/cursor-agent-support.md"
}

echo "=== Kiro CLI docs & release readiness tests ==="

assert "docs/kiro-cli-support.md has install, daily use, known gaps" test_kiro_docs_sections
assert "README contains Kiro CLI install block" test_readme_kiro_block
assert "build-pipeline.md includes Kiro naming and API bans" test_build_pipeline_kiro
assert "tech-stack.md lists Kiro as fourth platform" test_tech_stack_fourth_platform
assert "plugin-development.md documents never-edit maister-kiro" test_plugin_dev_never_edit_kiro
assert "release.yml runs make build && make validate" test_release_workflow_build_validate
assert "plugins/maister-kiro/ reproducible from make build-kiro" test_maister_kiro_reproducible
assert "cursor-agent-support.md cross-links kiro-cli-support.md" test_cursor_cross_link

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
