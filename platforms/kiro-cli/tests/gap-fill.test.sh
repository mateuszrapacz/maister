#!/usr/bin/env bash
# Task Group 12: strategic gap-fill tests — generator edge cases, hook fallback, chat gate exceptions, resume.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
GENERATOR="$ROOT/platforms/kiro-cli/generate-agent-json.sh"
FIXTURES="$SCRIPT_DIR/fixtures"
CORE_AGENTS="$ROOT/plugins/maister/agents"
OUT="$ROOT/plugins/maister-kiro"
PLATFORM="$ROOT/platforms/kiro-cli"
SMOKE_INSTALL="$PLATFORM/smoke-install.sh"

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
  (cd "$ROOT" && make build-kiro >/dev/null)
}

setup_tmp_agents() {
  local tmp
  tmp=$(mktemp -d)
  mkdir -p "$tmp/agents"
  echo "$tmp"
}

# 1. Generator: skills frontmatter → resources array (docs-operator)
test_generator_skills_to_resources() {
  local out
  out=$(setup_tmp_agents)
  cp "$CORE_AGENTS/docs-operator.md" "$out/agents/docs-operator.md"
  bash "$GENERATOR" "$out" >/dev/null
  jq -e '
    .resources | index("skill://skills/maister-docs-manager/SKILL.md") != null
  ' "$out/agents/maister-docs-operator.json" >/dev/null
  rm -rf "$out"
}

# 2. Generator: agent without skills omits resources field
test_generator_no_resources_without_skills() {
  local out
  out=$(setup_tmp_agents)
  cp "$FIXTURES/gap-analyzer.md" "$out/agents/gap-analyzer.md"
  bash "$GENERATOR" "$out" >/dev/null
  jq -e '(.resources // null) == null' "$out/agents/maister-gap-analyzer.json" >/dev/null
  rm -rf "$out"
}

# 3. Generator: unknown agent stem falls back to defaults.tools
test_generator_defaults_tools_fallback() {
  local out
  out=$(setup_tmp_agents)
  cat >"$out/agents/unknown-agent.md" <<'EOF'
---
name: unknown-agent
description: Fixture agent missing from agent-tools.json
model: inherit
---

# Unknown Agent
EOF
  bash "$GENERATOR" "$out" >/dev/null
  diff -u \
    <(jq -S '.defaults.tools' "$PLATFORM/agent-tools.json") \
    <(jq -S '.tools' "$out/agents/maister-unknown-agent.json") >/dev/null
  rm -rf "$out"
}

# 4. Hook path fallback: patch to absolute when ../hooks does not resolve
test_fix_hook_paths_absolute_fallback() {
  local dest
  dest=$(mktemp -d)
  mkdir -p "$dest/agents"
  cat >"$dest/agents/maister.json" <<'EOF'
{
  "name": "maister",
  "hooks": {
    "userPromptSubmit": [
      { "command": "../hooks/skill-invocation-reminder.sh" }
    ]
  }
}
EOF
  # shellcheck source=/dev/null
  source "$SMOKE_INSTALL"
  fix_hook_paths "$dest"
  jq -e --arg home "$dest" '
    .hooks.userPromptSubmit[0].command == ($home + "/hooks/skill-invocation-reminder.sh")
  ' "$dest/agents/maister.json" >/dev/null
  rm -rf "$dest"
}

# 5. Hook path fallback: preserve relative paths when hooks resolve
test_fix_hook_paths_preserves_relative() {
  local dest
  dest=$(mktemp -d)
  mkdir -p "$dest/agents" "$dest/hooks"
  echo '#!/usr/bin/env bash' >"$dest/hooks/skill-invocation-reminder.sh"
  chmod +x "$dest/hooks/skill-invocation-reminder.sh"
  cat >"$dest/agents/maister.json" <<'EOF'
{
  "name": "maister",
  "hooks": {
    "userPromptSubmit": [
      { "command": "../hooks/skill-invocation-reminder.sh" }
    ]
  }
}
EOF
  # shellcheck source=/dev/null
  source "$SMOKE_INSTALL"
  fix_hook_paths "$dest"
  jq -e '.hooks.userPromptSubmit[0].command == "../hooks/skill-invocation-reminder.sh"' \
    "$dest/agents/maister.json" >/dev/null
  rm -rf "$dest"
}

# 6. Chat gate exceptions: overrides/ authoring copies are AskUserQuestion-free
test_overrides_chat_gate_clean() {
  ! grep -rE 'AskUserQuestion|AskQuestion' "$PLATFORM/overrides" --include='*.md' 2>/dev/null
}

# 7. Chat gate: built hook scripts contain no banned question tools
test_output_hooks_chat_gate_clean() {
  run_build
  ! grep -rE 'AskUserQuestion|AskQuestion' "$OUT/hooks" --include='*.sh' 2>/dev/null
}

# 8. Chat gate: development skill cites headless defaults for --no-interactive
test_development_headless_defaults_cited() {
  run_build
  grep -q 'Headless Defaults' "$OUT/skills/maister-development/SKILL.md" && \
    grep -q '\-\-no-interactive' "$OUT/skills/maister-development/SKILL.md"
}

# 9. Resume: @resume prompt and development skill document --from=PHASE
test_resume_from_phase_documented() {
  run_build
  grep -q '\-\-from=' "$OUT/prompts/resume.md" && \
    grep -q 'orchestrator-state\.yml' "$OUT/prompts/resume.md" && \
    grep -q '\-\-from=PHASE' "$OUT/skills/maister-development/SKILL.md"
}

# 10. Resume: orchestrator-framework patterns reference state file for resume
test_orchestrator_state_resume_sot() {
  run_build
  local f="$OUT/skills/maister-orchestrator-framework/references/orchestrator-patterns.md"
  test -f "$f" && \
    grep -q 'orchestrator-state\.yml' "$f" && \
    grep -qi 'resume' "$f"
}

echo "=== Kiro CLI gap-fill tests (Task Group 12) ==="

assert "generator maps skills frontmatter to resources (docs-operator)" test_generator_skills_to_resources
assert "generator omits resources when agent has no skills" test_generator_no_resources_without_skills
assert "generator uses defaults.tools for unknown agent stem" test_generator_defaults_tools_fallback
assert "fix_hook_paths patches to absolute when ../hooks unresolved" test_fix_hook_paths_absolute_fallback
assert "fix_hook_paths preserves relative paths when hooks resolve" test_fix_hook_paths_preserves_relative
assert "overrides/ has zero AskUserQuestion/AskQuestion (chat gate exceptions)" test_overrides_chat_gate_clean
assert "built hooks/*.sh have zero AskUserQuestion/AskQuestion" test_output_hooks_chat_gate_clean
assert "maister-development cites Headless Defaults for --no-interactive" test_development_headless_defaults_cited
assert "resume prompt + development skill document --from=PHASE" test_resume_from_phase_documented
assert "orchestrator-patterns.md references orchestrator-state.yml for resume" test_orchestrator_state_resume_sot

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
