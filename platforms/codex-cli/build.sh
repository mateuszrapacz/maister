#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE="$ROOT/plugins/maister"
OUT="$ROOT/plugins/maister-codex"
PLATFORM="$SCRIPT_DIR"
CODEX_PLUGIN_NAME="maister"

PLUGIN_REPOSITORY="https://github.com/mateuszrapacz/maister"
PLUGIN_LICENSE="$(head -1 "$ROOT/LICENSE" | awk '{print $1}')"
PLUGIN_VERSION="$(grep '"version"' "$CORE/.claude-plugin/plugin.json" | sed 's/.*: "\([^"]*\)".*/\1/' | head -1)"

rm -rf "$OUT"
mkdir -p "$OUT/.codex-plugin" "$OUT/skills" "$OUT/hooks"

cat > "$OUT/.codex-plugin/plugin.json" <<EOF
{
  "name": "${CODEX_PLUGIN_NAME}",
  "version": "${PLUGIN_VERSION}",
  "description": "Structured, standards-aware development workflows for Codex",
  "author": {
    "name": "Skillpanel",
    "email": "marek@skillpanel.com"
  },
  "repository": "${PLUGIN_REPOSITORY}",
  "license": "${PLUGIN_LICENSE}",
  "homepage": "${PLUGIN_REPOSITORY}",
  "keywords": ["development", "sdlc", "workflows", "skills"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Maister",
    "shortDescription": "Standards-aware development workflows for Codex",
    "longDescription": "Specification, planning, implementation, and verification workflows for Codex.",
    "developerName": "Skillpanel",
    "category": "Developer tools",
    "capabilities": ["Read", "Write"],
    "defaultPrompt": ["Use Maister's structured development workflows for this task."]
  }
}
EOF

transform_markdown() {
  local source="$1"
  local destination="$2"
  local skill_name="${3:-}"
  local temporary

  temporary="$(mktemp)"
  awk -v skill_name="$skill_name" '
    BEGIN { in_frontmatter = 0 }
    NR == 1 && $0 == "---" { in_frontmatter = 1; print; next }
    in_frontmatter && $0 == "---" { in_frontmatter = 0; print; next }
    in_frontmatter && $0 ~ /^name:/ && skill_name != "" { print "name: " skill_name; next }
    in_frontmatter && $0 ~ /^(user-invocable|disable-model-invocation|argument-hint):/ { next }
    { print }
  ' "$source" > "$temporary"

  sed \
    -e 's/CLAUDE\.md/AGENTS.md/g' \
    -e 's/AskUserQuestion/plain-text user question/g' \
    -e 's/AskQuestion/plain-text user question/g' \
    -e 's/TaskCreate/phase entries in orchestrator-state.yml/g' \
    -e 's/TaskUpdate/phase entries in orchestrator-state.yml/g' \
    -e 's/TaskList/orchestrator-state.yml/g' \
    -e 's/EnterPlanMode/native planning flow/g' \
    -e 's/ExitPlanMode/plan approval gate/g' \
    -e 's/Skill tool/skill loader/g' \
    -e 's/Task tool/native subagent delegation/g' \
    -e 's/subagent_type/agent role/g' \
    -e 's/agent role: `maister[-:][^`]*`/agent role: `native Codex subagent`/g' \
    -e 's/agent role: "maister[-:][^"]*"/agent role: "native Codex subagent"/g' \
    -e 's/agent role: maister[-:][A-Za-z0-9-]*/agent role: native Codex subagent/g' \
    -e 's/agent role: general-purpose/agent role: default/g' \
    -e 's/skill: "maister[-:]\([^"]*\)"/skill: "$maister:\1"/g' \
    -e 's/skill: "\([a-z][a-z0-9-]*\)"/skill: "$maister:\1"/g' \
    -e 's/`requirements-critic`/`maister:requirements-critic`/g' \
    -e 's/`transcript-critic`/`maister:transcript-critic`/g' \
    -e 's/`problem-classifier`/`maister:problem-classifier`/g' \
    -e 's/`test-strategy-reviewer`/`maister:test-strategy-reviewer`/g' \
    -e 's/`linguistic-boundary-verifier`/`maister:linguistic-boundary-verifier`/g' \
    -e 's/`metaprogram-classifier`/`maister:metaprogram-classifier`/g' \
    -e 's/`context-distiller`/`maister:context-distiller`/g' \
    -e 's/`aggregate-designer`/`maister:aggregate-designer`/g' \
    -e 's/`grill-me`/`maister:grill-me`/g' \
    -e 's/`grill-with-docs`/`maister:grill-with-docs`/g' \
    -e 's/`thermos`/`maister:thermos`/g' \
    -e 's|/maister:|$maister:|g' \
    "$temporary" > "$destination"
  rm -f "$temporary"
}

transform_tree_markdown() {
  local directory="$1"
  local file temporary

  while IFS= read -r -d '' file; do
    temporary="$(mktemp)"
    sed \
      -e 's/CLAUDE\.md/AGENTS.md/g' \
      -e 's/AskUserQuestion/plain-text user question/g' \
      -e 's/AskQuestion/plain-text user question/g' \
      -e 's/TaskCreate/phase entries in orchestrator-state.yml/g' \
      -e 's/TaskUpdate/phase entries in orchestrator-state.yml/g' \
      -e 's/TaskList/orchestrator-state.yml/g' \
      -e 's/EnterPlanMode/native planning flow/g' \
      -e 's/ExitPlanMode/plan approval gate/g' \
      -e 's/Skill tool/skill loader/g' \
      -e 's/Task tool/native subagent delegation/g' \
      -e 's/subagent_type/agent role/g' \
      -e 's/agent role: `maister[-:][^`]*`/agent role: `native Codex subagent`/g' \
      -e 's/agent role: "maister[-:][^"]*"/agent role: "native Codex subagent"/g' \
      -e 's/agent role: maister[-:][A-Za-z0-9-]*/agent role: native Codex subagent/g' \
      -e 's/agent role: general-purpose/agent role: default/g' \
      -e 's/skill: "maister[-:]\([^"]*\)"/skill: "$maister:\1"/g' \
      -e 's/skill: "\([a-z][a-z0-9-]*\)"/skill: "$maister:\1"/g' \
      -e 's/`requirements-critic`/`maister:requirements-critic`/g' \
      -e 's/`transcript-critic`/`maister:transcript-critic`/g' \
      -e 's/`problem-classifier`/`maister:problem-classifier`/g' \
      -e 's/`test-strategy-reviewer`/`maister:test-strategy-reviewer`/g' \
      -e 's/`linguistic-boundary-verifier`/`maister:linguistic-boundary-verifier`/g' \
      -e 's/`metaprogram-classifier`/`maister:metaprogram-classifier`/g' \
      -e 's/`context-distiller`/`maister:context-distiller`/g' \
      -e 's/`aggregate-designer`/`maister:aggregate-designer`/g' \
      -e 's/`grill-me`/`maister:grill-me`/g' \
      -e 's/`grill-with-docs`/`maister:grill-with-docs`/g' \
      -e 's/`thermos`/`maister:thermos`/g' \
      -e 's|/maister:|$maister:|g' \
      "$file" > "$temporary"
    mv "$temporary" "$file"
  done < <(find "$directory" -type f \( -name '*.md' -o -name '*.mdc' \) -print0)
}

copy_skill() {
  local source="$1"
  local stem="${source##*/}"
  local destination="$OUT/skills/$stem"

  cp -R "$source" "$destination"
  transform_markdown "$destination/SKILL.md" "$destination/SKILL.md.tmp" "$stem"
  mv "$destination/SKILL.md.tmp" "$destination/SKILL.md"
  transform_tree_markdown "$destination"

  if grep -qE '^(user-invocable|disable-model-invocation): false|^disable-model-invocation: true' "$source/SKILL.md"; then
    mkdir -p "$destination/agents"
    cat > "$destination/agents/openai.yaml" <<EOF
interface:
  display_name: "Maister ${stem}"
  short_description: "Internal Maister workflow capability."

policy:
  allow_implicit_invocation: false
EOF
  fi
}

for source in "$CORE/skills"/*; do
  [ -d "$source" ] || continue
  copy_skill "$source"
done

# Codex has no command component. Each source command becomes an explicit
# skill entrypoint, preserving the existing shortcut while using native skill
# discovery and invocation.
for source in "$CORE/commands"/*.md; do
  stem="${source##*/}"
  stem="${stem%.md}"
  destination="$OUT/skills/$stem"
  mkdir -p "$destination"
  transform_markdown "$source" "$destination/SKILL.md" "$stem"
done

# Utility skills are platform-native entrypoints rather than Claude source
# skills: their names and invocation syntax are specific to Codex.
generate_utility_skills() {
  mkdir -p "$OUT/skills/resume"
  cat > "$OUT/skills/resume/SKILL.md" <<'SKILL'
---
name: resume
description: "Resume an interrupted Maister workflow from orchestrator-state.yml."
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
   - `development` → `$maister:development`
   - `performance` → `$maister:performance`
   - `migration` or `migrations` → `$maister:migration`
   - `research` → `$maister:research`
   - `product-design` → `$maister:product-design`

Preserve additional flags from the user's request. Do not restart from scratch
unless the user explicitly asks. If no active state exists, report that clearly
and suggest `$maister:work` or `$maister:init` as appropriate.
SKILL

  mkdir -p "$OUT/skills/status"
  cat > "$OUT/skills/status/SKILL.md" <<'SKILL'
---
name: status
description: "Report the active Maister workflow state, phase, and blockers."
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
clearly and suggest `$maister:init` or `$maister:work`.
SKILL

  mkdir -p "$OUT/skills/next"
  cat > "$OUT/skills/next/SKILL.md" <<'SKILL'
---
name: next
description: "Suggest the best next action from the active Maister workflow state."
---

Read `orchestrator-state.yml` in the active task directory under `.maister/tasks/`.
Use a task path supplied in the user's request when present; otherwise use the
latest active state file.

Suggest exactly one best next action based on `current_phase`,
`completed_phases`, failed phases, blockers, and pending gates. Name the phase,
skill, or user decision and explain the reason in one sentence. Do not execute
the suggested action.

If no workflow is active, suggest `$maister:init` when `.maister/docs/` is
missing; otherwise suggest `$maister:work`.
SKILL

  mkdir -p "$OUT/skills/bye"
  cat > "$OUT/skills/bye/SKILL.md" <<'SKILL'
---
name: bye
description: "End a Maister session gracefully while preserving workflow state for resume."
---

End the Maister session gracefully.

1. Identify the active task from the user's request or the latest
   `orchestrator-state.yml` under `.maister/tasks/`.
2. Ensure the state file reflects the latest `current_phase`,
   `completed_phases`, blockers, pending gates, and task status.
3. Do not mark an in-progress workflow as completed.
4. Summarize what was completed and what remains.
5. Record the task path and the command `$maister:resume <task-path>` for the
   next session.

Do not discard in-progress workflow state.
SKILL

  mkdir -p "$OUT/skills/dev"
  cat > "$OUT/skills/dev/SKILL.md" <<'SKILL'
---
name: dev
description: "Shortcut for $maister:development. Use for development tasks."
---

Invoke `$maister:development` with the task description or task path supplied
in the user's request. Pass the input through verbatim and do not skip the
Maister workflow for a task that looks straightforward.
SKILL
}

generate_utility_skills

cp "$PLATFORM/hooks/hooks.json" "$OUT/hooks/hooks.json"
cp "$PLATFORM/hooks/block-destructive-commands.sh" "$OUT/hooks/block-destructive-commands.sh"
cp "$PLATFORM/hooks/post-compact-reminder.sh" "$OUT/hooks/post-compact-reminder.sh"
cp "$PLATFORM/hooks/skill-invocation-reminder.sh" "$OUT/hooks/skill-invocation-reminder.sh"
chmod +x "$OUT/hooks/"*.sh

cat > "$OUT/README.md" <<'EOF'
# Maister (Codex)

Native Codex plugin packaging for Maister's standards-aware development
workflows.

## Local development

```bash
make build-codex
codex plugin marketplace add .
```

For a repo-scoped marketplace, use the repository's
`.agents/plugins/marketplace.json`. After installing or changing the plugin,
start a new Codex session so the bundled skills are rediscovered.

Invoke public workflows with `$maister:development`, `$maister:init`, or the
other `maister:*` skills. Internal workflow capabilities are bundled as
non-implicitly-invocable skills and are delegated through Codex's native
subagent workflow.

Codex Goals and native planning are optional UX aids. Maister keeps
`orchestrator-state.yml` as the source of truth for phase state and resume.
Models are selected by the Codex host/session; the plugin does not pin models.

Bundled hooks are defense-in-depth and require review/trust in Codex. Keep the
session sandbox and approval policy as the primary security boundary.
EOF

echo "Built Codex plugin at $OUT"
