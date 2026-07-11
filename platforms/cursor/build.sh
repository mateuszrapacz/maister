#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE="$ROOT/plugins/maister"
OUT="$ROOT/plugins/maister-cursor"
PLATFORM="$SCRIPT_DIR"

sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

rm -rf "$OUT"
cp -r "$CORE" "$OUT"

# 1. Manifest: .claude-plugin → .cursor-plugin
mv "$OUT/.claude-plugin" "$OUT/.cursor-plugin"
PLUGIN_VERSION=$(grep '"version"' "$OUT/.cursor-plugin/plugin.json" | sed 's/.*: "\([^"]*\)".*/\1/')

# Optional manifest fields: repository, license, homepage
PLUGIN_REPOSITORY="https://github.com/mateuszrapacz/maister"
PLUGIN_LICENSE=$(head -1 "$ROOT/LICENSE" | awk '{print $1}')
PLUGIN_HOMEPAGE="$PLUGIN_REPOSITORY"

cat > "$OUT/.cursor-plugin/plugin.json" << EOF
{
  "name": "maister-cursor",
  "displayName": "Maister",
  "description": "Structured, standards-aware development workflows for Cursor Agent",
  "version": "${PLUGIN_VERSION}",
  "author": {
    "name": "Skillpanel",
    "email": "marek@skillpanel.com"
  },
  "repository": "${PLUGIN_REPOSITORY}",
  "license": "${PLUGIN_LICENSE}",
  "homepage": "${PLUGIN_HOMEPAGE}",
  "keywords": ["development", "sdlc", "workflows", "skills"],
  "skills": "./skills/",
  "agents": "./agents/",
  "hooks": "./hooks/hooks.json"
}
EOF

# 2. Command names: maister:foo → maister-foo
find "$OUT/commands" -name "*.md" | while read -r f; do
  sedi 's/^name: maister:/name: maister-/' "$f"
done

# 3. Skill names: maister:foo → maister-foo
find "$OUT/skills" -name "*.md" | while read -r f; do
  sedi 's/^name: maister:/name: maister-/' "$f"
done

# 4. References: maister: → maister-
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/maister:/maister-/g' "$f"
done

# 5. Explore subagent → maister-explore (inherits parent model; avoids built-in fast Composer)
cp "$PLATFORM/agents/explore.md" "$OUT/agents/explore.md"
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/subagent_type="Explore"/subagent_type="maister-explore"/g' "$f"
  sedi 's/subagent_type: "Explore"/subagent_type: "maister-explore"/g' "$f"
  sedi 's/subagent_type="explore"/subagent_type="maister-explore"/g' "$f"
  sedi 's/subagent_type: "explore"/subagent_type: "maister-explore"/g' "$f"
done

# 6. AskUserQuestion → AskQuestion
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/AskUserQuestion/AskQuestion/g' "$f"
done

# 7. Remove EnterPlanMode / ExitPlanMode references (overrides replace quick-plan/bugfix)
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/`EnterPlanMode`[^`]*`//g' "$f"
  sedi 's/`ExitPlanMode`[^`]*`//g' "$f"
  sedi 's/EnterPlanMode/structured planning flow/g' "$f"
  sedi 's/ExitPlanMode/plan approval gate/g' "$f"
done

# 8. Project instructions: CLAUDE.md → AGENTS.md in skills
find "$OUT/skills" -name "*.md" | while read -r f; do
  sedi 's/CLAUDE\.md/AGENTS.md/g' "$f"
done

# 9. MCP: .mcp.json → mcp.json
if [ -f "$OUT/.mcp.json" ]; then
  mv "$OUT/.mcp.json" "$OUT/mcp.json"
fi

# 10. Condensed workflow rule (not full CLAUDE.md — reduces alwaysApply token cost)
mkdir -p "$OUT/rules"
cp "$PLATFORM/templates/maister-workflows-template.mdc" "$OUT/rules/maister-workflows.mdc"

rm -f "$OUT/CLAUDE.md"

# Short README for cursor variant
cat > "$OUT/README.md" << 'EOF'
# Maister (Cursor Agent)

Structured, standards-aware development workflows for Cursor Agent.

## Install (local)

```bash
bash platforms/cursor/smoke-install.sh
```

Then: **Developer: Reload Window** in Cursor IDE. CLI auto-discovers the plugin without `--plugin-dir`.

## Skills

Use `/maister-*` slash skills (e.g. `/maister-init`, `/maister-development`). Internal orchestrator engines live under `lib/skills/` and are not user-facing.

## MCP

Enable MCP in Cursor settings to use Playwright for `--e2e` workflows. Bundle: `mcp.json`.

## Rules

Plugin workflows: `rules/maister-workflows.mdc` (always applied when plugin is active).
EOF

# 11. Hooks: replace with Cursor format
rm -rf "$OUT/hooks"
cp -R "$PLATFORM/hooks" "$OUT/hooks"
chmod +x "$OUT/hooks/"*.sh
mkdir -p "$OUT/.hook-state"
printf '*\n!.gitignore\n' > "$OUT/.hook-state/.gitignore"

# 11b. Agent frontmatter: align name with maister-* Task references
for f in "$OUT/agents"/*.md; do
  [ -f "$f" ] || continue
  name=$(grep -m1 '^name: ' "$f" | sed 's/^name: //')
  if [[ "$name" != maister-* ]]; then
    sedi "s/^name: ${name}/name: maister-${name}/" "$f"
  fi
done

# 11c. Agent frontmatter: inject readonly: true for read-only agents
READONLY_WRITERS=(
  docs-operator
  user-docs-generator
  ui-mockup-generator
  html-companion-writer
  task-group-implementer
  implementation-planner
  specification-creator
  solution-designer
)
READONLY_ALLOWLIST=(
  spec-auditor
  gap-analyzer
  task-classifier
  research-synthesizer
  research-planner
  information-gatherer
  codebase-analysis-reporter
  thermo-nuclear-review-subagent
  thermo-nuclear-code-quality-review-subagent
  solution-brainstormer
  e2e-test-verifier
)

is_readonly_writer() {
  local base="$1"
  local w
  for w in "${READONLY_WRITERS[@]}"; do
    [[ "$base" == "$w" ]] && return 0
  done
  return 1
}

is_readonly_allowlist() {
  local base="$1"
  local a
  for a in "${READONLY_ALLOWLIST[@]}"; do
    [[ "$base" == "$a" ]] && return 0
  done
  return 1
}

should_agent_be_readonly() {
  local f="$1"
  local base
  base=$(basename "$f" .md)

  is_readonly_writer "$base" && return 1
  is_readonly_allowlist "$base" && return 0
  if grep -m1 '^description:' "$f" | grep -qiE 'read-only|read only'; then
    return 0
  fi
  return 1
}

inject_readonly_frontmatter() {
  local f="$1"
  grep -q '^readonly: true' "$f" && return 0
  if grep -q '^model: inherit' "$f"; then
    sedi '/^model: inherit$/a\
readonly: true
' "$f"
  else
    local tmp end_line
    tmp=$(mktemp)
    end_line=$(awk '/^---$/{c++; if (c==2){print NR; exit}}' "$f")
    if [[ -n "$end_line" ]]; then
      sedi "${end_line}i\\
readonly: true
" "$f"
    else
      awk 'BEGIN{inserted=0} /^---$/{c++} c==2 && !inserted{print "readonly: true"; inserted=1} {print}' "$f" > "$tmp"
      mv "$tmp" "$f"
    fi
  fi
}

for f in "$OUT/agents"/*.md; do
  [ -f "$f" ] || continue
  if should_agent_be_readonly "$f"; then
    inject_readonly_frontmatter "$f"
  fi
done

# --- PR1: orchestrator-framework → lib/ (before skill directory renames) ---

relocate_orchestrator_framework() {
  mkdir -p "$OUT/lib"
  mv "$OUT/skills/orchestrator-framework" "$OUT/lib/orchestrator-framework"
}

update_orchestrator_framework_paths() {
  find "$OUT" \( -name "*.md" -o -name "*.sh" \) -print0 | while IFS= read -r -d '' f; do
    sedi 's|\.\./orchestrator-framework/|../lib/orchestrator-framework/|g' "$f"
    sedi 's|skills/orchestrator-framework/|lib/orchestrator-framework/|g' "$f"
    sedi 's|\[plugin\]/skills/orchestrator-framework/|[plugin]/lib/orchestrator-framework/|g' "$f"
  done
}

# --- PR2: merge commands/ → skills/ (collapse map D1; skip rich-skill duplicates) ---

apply_cursor_overrides() {
  cp "$PLATFORM/overrides/skills/quick-plan/SKILL.md" "$OUT/skills/quick-plan/SKILL.md"
  cp "$PLATFORM/overrides/skills/quick-bugfix/SKILL.md" "$OUT/skills/quick-bugfix/SKILL.md"
  # quick-dev: rich body from copied plugins/maister/skills/quick-dev/SKILL.md (C1)
}

merge_commands_to_skills() {
  local commands_dir="$OUT/commands"
  [ -d "$commands_dir" ] || return 0

  merge_one() {
    local stem="$1" target="$2"
    local src="$commands_dir/${stem}.md"
    local dest_dir="$OUT/skills/${target}"
    [ -f "$src" ] || return 0
    mkdir -p "$dest_dir"
    cp "$src" "$dest_dir/SKILL.md"
  }

  merge_one reviews-code maister-reviews-code
  merge_one reviews-pragmatic maister-reviews-pragmatic
  merge_one reviews-production-readiness maister-reviews-production-readiness
  merge_one reviews-reality-check maister-reviews-reality-check
  merge_one reviews-spec-audit maister-reviews-spec-audit
  merge_one work maister-work

  # Skip collapse stems — rich skill dirs already exist (W1 / D1):
  # quick-problem-classifier, quick-transcript-critic, quick-requirements-critic,
  # quick-metaprogram-classifier, modeling-context-distiller, modeling-aggregate-designer,
  # reviews-test-strategy, reviews-linguistic-boundaries, quick-plan, quick-dev, quick-bugfix

  rm -rf "$commands_dir"
}

# --- PR3: maister-* prefix on all public skills + reference sed ---

rename_skill_directories() {
  local dir skill_file name target_name target_dir
  while IFS= read -r dir; do
    skill_file="$dir/SKILL.md"
    [ -f "$skill_file" ] || continue
    name=$(grep -m1 '^name: ' "$skill_file" | sed 's/^name: //')
    target_name="$name"
    if [[ "$target_name" != maister-* ]]; then
      target_name="maister-${target_name}"
      sedi "s/^name: ${name}/name: ${target_name}/" "$skill_file"
    fi
    target_dir="$OUT/skills/$target_name"
    if [ "$dir" != "$target_dir" ]; then
      mv "$dir" "$target_dir"
    fi
  done < <(find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d)
}

apply_skill_reference_transforms() {
  local f
  while IFS= read -r -d '' f; do
    sedi 's|skill: "requirements-critic"|skill: "maister-requirements-critic"|g' "$f"
    sedi 's|skill: "transcript-critic"|skill: "maister-transcript-critic"|g' "$f"
    sedi 's|skill: "problem-classifier"|skill: "maister-problem-classifier"|g' "$f"
    sedi 's|skill: "test-strategy-reviewer"|skill: "maister-test-strategy-reviewer"|g' "$f"
    sedi 's|skill: "linguistic-boundary-verifier"|skill: "maister-linguistic-boundary-verifier"|g' "$f"
    sedi 's|skill: "metaprogram-classifier"|skill: "maister-metaprogram-classifier"|g' "$f"
    sedi 's|skill: "context-distiller"|skill: "maister-context-distiller"|g' "$f"
    sedi 's|skill: "aggregate-designer"|skill: "maister-aggregate-designer"|g' "$f"
    sedi 's|skill: "codebase-analyzer"|skill: "maister-codebase-analyzer"|g' "$f"
    sedi 's|skill: "implementation-plan-executor"|skill: "maister-implementation-plan-executor"|g' "$f"
    sedi 's|skill: "implementation-verifier"|skill: "maister-implementation-verifier"|g' "$f"
    sedi 's|skill: "docs-manager"|skill: "maister-docs-manager"|g' "$f"
    sedi 's|skill: "quick-dev"|skill: "maister-quick-dev"|g' "$f"
    sedi 's|skill: "quick-plan"|skill: "maister-quick-plan"|g' "$f"
    sedi 's|skill: "quick-bugfix"|skill: "maister-quick-bugfix"|g' "$f"
    sedi 's|skill `requirements-critic`|skill `maister-requirements-critic`|g' "$f"
    sedi 's|skill `transcript-critic`|skill `maister-transcript-critic`|g' "$f"
    sedi 's|skill `problem-classifier`|skill `maister-problem-classifier`|g' "$f"
    sedi 's|skill `test-strategy-reviewer`|skill `maister-test-strategy-reviewer`|g' "$f"
    sedi 's|skill `linguistic-boundary-verifier`|skill `maister-linguistic-boundary-verifier`|g' "$f"
    sedi 's|skill `metaprogram-classifier`|skill `maister-metaprogram-classifier`|g' "$f"
    sedi 's|skill `context-distiller`|skill `maister-context-distiller`|g' "$f"
    sedi 's|skill `aggregate-designer`|skill `maister-aggregate-designer`|g' "$f"
    sedi 's|Invoke the `requirements-critic` skill|Invoke the `maister-requirements-critic` skill|g' "$f"
    sedi 's|Invoke the `transcript-critic` skill|Invoke the `maister-transcript-critic` skill|g' "$f"
    sedi 's|Invoke the `problem-classifier` skill|Invoke the `maister-problem-classifier` skill|g' "$f"
    sedi 's|Invoke the `test-strategy-reviewer` skill|Invoke the `maister-test-strategy-reviewer` skill|g' "$f"
    sedi 's|Invoke the `linguistic-boundary-verifier` skill|Invoke the `maister-linguistic-boundary-verifier` skill|g' "$f"
    sedi 's|Invoke the `metaprogram-classifier` skill|Invoke the `maister-metaprogram-classifier` skill|g' "$f"
    sedi 's|Invoke the `context-distiller` skill|Invoke the `maister-context-distiller` skill|g' "$f"
    sedi 's|Invoke the `aggregate-designer` skill|Invoke the `maister-aggregate-designer` skill|g' "$f"
    sedi 's|run `test-strategy-reviewer`|run `maister-test-strategy-reviewer`|g' "$f"
    sedi 's|run `linguistic-boundary-verifier`|run `maister-linguistic-boundary-verifier`|g' "$f"
    sedi 's|run `metaprogram-classifier`|run `maister-metaprogram-classifier`|g' "$f"
    sedi 's|run `grill-me`|run `maister-grill-me`|g' "$f"
    sedi 's|run `grill-with-docs`|run `maister-grill-with-docs`|g' "$f"
    sedi 's|`grill-with-docs`|`maister-grill-with-docs`|g' "$f"
    sedi 's|`grill-me`|`maister-grill-me`|g' "$f"
    sedi 's|`context-distiller`|`maister-context-distiller`|g' "$f"
    sedi 's|`aggregate-designer`|`maister-aggregate-designer`|g' "$f"
    sedi 's|`linguistic-boundary-verifier`|`maister-linguistic-boundary-verifier`|g' "$f"
    sedi 's|run `problem-classifier`|run `maister-problem-classifier`|g' "$f"
    sedi 's|run `context-distiller`|run `maister-context-distiller`|g' "$f"
    sedi 's|run `aggregate-designer`|run `maister-aggregate-designer`|g' "$f"
    sedi 's|run `thermos`|run `maister-thermos`|g' "$f"
    sedi 's|/maister:standards-discover|/maister-standards-discover|g' "$f"
    sedi 's|/maister:standards-update|/maister-standards-update|g' "$f"
    sedi 's|/maister:init|/maister-init|g' "$f"
    sedi 's|standards-discover skill|maister-standards-discover skill|g' "$f"
    sedi 's|standards-update skill|maister-standards-update skill|g' "$f"
  done < <(find "$OUT/skills" "$OUT/agents" "$OUT/rules" "$OUT/hooks" "$OUT/lib" -type f \( -name "*.md" -o -name "*.sh" -o -name "*.mdc" \) -print0 2>/dev/null)

  # Agent skills: preload lists (W4)
  for agent_f in "$OUT/agents/docs-operator.md" \
    "$OUT/agents/thermo-nuclear-review-subagent.md" \
    "$OUT/agents/thermo-nuclear-code-quality-review-subagent.md"; do
    [ -f "$agent_f" ] || continue
    sedi 's|^  - docs-manager$|  - maister-docs-manager|' "$agent_f"
    sedi 's|^  - thermo-nuclear-review$|  - maister-thermo-nuclear-review|' "$agent_f"
    sedi 's|^  - thermo-nuclear-code-quality-review$|  - maister-thermo-nuclear-code-quality-review|' "$agent_f"
  done
}

# --- PR4: internal Skill-tool engines → lib/skills/ ---

relocate_internal_skills() {
  mkdir -p "$OUT/lib/skills"
  for name in docs-manager codebase-analyzer implementation-plan-executor implementation-verifier; do
    local src="$OUT/skills/maister-${name}"
    local dest="$OUT/lib/skills/maister-${name}"
    [ -d "$src" ] && mv "$src" "$dest"
  done
}

relocate_orchestrator_framework
update_orchestrator_framework_paths

# 12. Overrides (skill bodies only — no command wrappers)
apply_cursor_overrides
merge_commands_to_skills
rename_skill_directories
apply_skill_reference_transforms

# 13. AGENTS.md template for docs-manager (paths post-rename)
cp "$PLATFORM/templates/agents-md-template.md" "$OUT/skills/maister-docs-manager/references/agents-md-template.md"
sedi 's/claude-md-template\.md/agents-md-template.md/g' "$OUT/skills/maister-docs-manager/SKILL.md"
sedi 's/Manage CLAUDE.md Integration/Manage AGENTS.md Integration/g' "$OUT/skills/maister-docs-manager/SKILL.md"

# Init: add Cursor project rule step
sedi 's/Verify AGENTS.md integration/Verify AGENTS.md integration\
- Create `.cursor\/rules\/maister-docs.mdc` in project root if missing (copy from plugin `rules\/maister-docs.mdc` template — read `.maister\/docs\/INDEX.md` first)/' "$OUT/skills/maister-init/SKILL.md"
cp "$PLATFORM/rules/maister-docs.mdc" "$OUT/rules/maister-docs.mdc"
cp "$PLATFORM/rules/maister-no-fast-models.mdc" "$OUT/rules/maister-no-fast-models.mdc"

# standards-discover docs extractor
sedi 's/CLAUDE.md/AGENTS.md/g' "$OUT/skills/maister-standards-discover/references/docs-extractor-prompt.md"
sedi 's/\.claude\/CLAUDE.md/.cursor\/rules/g' "$OUT/skills/maister-standards-discover/references/docs-extractor-prompt.md"

relocate_internal_skills

# 14. TodoWrite transforms (last — after all path moves)
apply_todo_transforms() {
  local f="$1"
  [ -f "$f" ] || return 0
  sedi 's/TaskCreate/TodoWrite/g' "$f"
  sedi 's/TaskUpdate/TodoWrite/g' "$f"
  sedi 's/addBlockedBy/ordering in todos array (merge: true)/g' "$f"
  sedi 's/activeForm/activity description in content/g' "$f"
  sedi 's/metadata: {skipped: true}/status: "cancelled"/g' "$f"
  sedi 's/Task system/Todo list/g' "$f"
  sedi 's/Task tracking/Todo tracking/g' "$f"
  sedi 's/Create Task Items/Create Todo Items/g' "$f"
  sedi 's/task items/todo items/g' "$f"
  sedi 's/Create task items/Create todo items via TodoWrite/g' "$f"
  sedi 's/Restore task items/Restore todo items via TodoWrite/g' "$f"
  sedi 's/Task Progress/Todo Progress/g' "$f"
  sedi 's/TaskCreate\/TaskUpdate/TodoWrite/g' "$f"
}

TODO_GLOB=(
  "$OUT/lib/orchestrator-framework"
  "$OUT/skills/maister-development"
  "$OUT/skills/maister-product-design"
  "$OUT/skills/maister-performance"
  "$OUT/skills/maister-migration"
  "$OUT/skills/maister-research"
  "$OUT/skills/maister-init"
  "$OUT/skills/maister-standards-discover"
  "$OUT/lib/skills/maister-implementation-verifier"
  "$OUT/lib/skills/maister-implementation-plan-executor"
  "$OUT/agents"
)

for dir in "${TODO_GLOB[@]}"; do
  if [ -f "$dir" ]; then
    apply_todo_transforms "$dir"
  elif [ -d "$dir" ]; then
    find "$dir" -name "*.md" | while read -r f; do
      apply_todo_transforms "$f"
    done
  fi
done

sedi 's/metadata: {restored: true}/(restored from state — mark completed)/g' "$OUT/lib/orchestrator-framework/references/orchestrator-patterns.md"

# Cursor-specific TodoWrite examples
if [ -f "$PLATFORM/patches/orchestrator-patterns-todowrite.md" ]; then
  cat "$PLATFORM/patches/orchestrator-patterns-todowrite.md" >> "$OUT/lib/orchestrator-framework/references/orchestrator-patterns.md"
fi

# Utility skills are platform-native entrypoints rather than Claude source
# skills: their names and invocation syntax are specific to Cursor.
generate_utility_skills() {
  mkdir -p "$OUT/skills/maister-resume"
  cat > "$OUT/skills/maister-resume/SKILL.md" <<'SKILL'
---
name: maister-resume
description: "Resume an interrupted Maister workflow from orchestrator-state.yml."
user-invocable: true
---

Resume the Maister workflow from saved state.

1. Treat an explicit task path in the user's request as authoritative.
2. If no task path was supplied, find the latest `orchestrator-state.yml` under
   `.maister/tasks/`.
3. Read the workflow type, task path, `current_phase`, `completed_phases`, and
   any failed phases or pending gates.
4. If `current_phase` is missing, use the first phase that is not listed in
   `completed_phases`.
5. Invoke the matching workflow skill with the task path and
   `--from=<phase>`:
   - `development` → `/maister-development`
   - `performance` → `/maister-performance`
   - `migration` or `migrations` → `/maister-migration`
   - `research` → `/maister-research`
   - `product-design` → `/maister-product-design`

Preserve additional flags from the user's request. Do not restart from scratch
unless the user explicitly asks. If no active state exists, report that clearly
and suggest `/maister-work` or `/maister-init` as appropriate.
SKILL

  mkdir -p "$OUT/skills/maister-status"
  cat > "$OUT/skills/maister-status/SKILL.md" <<'SKILL'
---
name: maister-status
description: "Report the active Maister workflow state, phase, and blockers."
user-invocable: true
---

Read the active `orchestrator-state.yml` under `.maister/tasks/`. Use the task
path supplied in the user's request when present; otherwise use the latest
active state file.

Report:

- task path and workflow type
- task status and `current_phase`
- `completed_phases` and failed phases
- blockers, pending gates, and the next incomplete phase

Do not start or resume the workflow. If no active workflow exists, say so
clearly and suggest `/maister-init` or `/maister-work`.
SKILL

  mkdir -p "$OUT/skills/maister-next"
  cat > "$OUT/skills/maister-next/SKILL.md" <<'SKILL'
---
name: maister-next
description: "Suggest the best next action from the active Maister workflow state."
user-invocable: true
---

Read `orchestrator-state.yml` in the active task directory under `.maister/tasks/`.
Use a task path supplied in the user's request when present; otherwise use the
latest active state file.

Suggest exactly one best next action based on `current_phase`,
`completed_phases`, failed phases, blockers, and pending gates. Name the phase,
skill, or user decision and explain the reason in one sentence. Do not execute
the suggested action.

If no workflow is active, suggest `/maister-init` when `.maister/docs/` is
missing; otherwise suggest `/maister-work`.
SKILL

  mkdir -p "$OUT/skills/maister-bye"
  cat > "$OUT/skills/maister-bye/SKILL.md" <<'SKILL'
---
name: maister-bye
description: "End a Maister session gracefully while preserving workflow state for resume."
user-invocable: true
---

End the Maister session gracefully.

1. Identify the active task from the user's request or the latest
   `orchestrator-state.yml` under `.maister/tasks/`.
2. Ensure the state file reflects the latest `current_phase`,
   `completed_phases`, blockers, pending gates, and task status.
3. Do not mark an in-progress workflow as completed.
4. Summarize what was completed and what remains.
5. Record the task path and the command `/maister-resume <task-path>` for the
   next session.

Do not discard in-progress workflow state.
SKILL

  mkdir -p "$OUT/skills/maister-dev"
  cat > "$OUT/skills/maister-dev/SKILL.md" <<'SKILL'
---
name: maister-dev
description: "Shortcut for /maister-development. Use for development tasks."
user-invocable: true
---

Invoke `/maister-development` with the task description or task path supplied
in the user's request. Pass the input through verbatim and do not skip the
Maister workflow for a task that looks straightforward.
SKILL
}

generate_utility_skills

echo "Built Cursor Agent variant at $OUT"
