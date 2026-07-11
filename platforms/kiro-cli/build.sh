#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE="$ROOT/plugins/maister"
OUT="$ROOT/plugins/maister-kiro"
PLATFORM="$SCRIPT_DIR"

sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Avoid concurrent builds corrupting plugins/maister-kiro/ (make watch + manual build).
BUILD_LOCK_DIR="${TMPDIR:-/tmp}/maister-kiro-build.lock.d"

acquire_build_lock() {
  local waited=0
  while ! mkdir "$BUILD_LOCK_DIR" 2>/dev/null; do
    waited=$((waited + 1))
    if [ "$waited" -ge 120 ]; then
      echo "FAIL: another Kiro build is in progress (lock: $BUILD_LOCK_DIR)" >&2
      exit 1
    fi
    sleep 1
  done
  trap 'rmdir "$BUILD_LOCK_DIR" 2>/dev/null || true' EXIT
}

foreach_md() {
  local root="$1" fn="$2" f
  while IFS= read -r -d '' f; do
    "$fn" "$f"
  done < <(find "$root" -name "*.md" -print0)
}

merge_commands_to_skills() {
  local commands_dir="$OUT/commands"
  [ -d "$commands_dir" ] || return 0

  merge_one() {
    local stem="$1"
    local target="$2"
    local src="$commands_dir/${stem}.md"
    local dest_dir="$OUT/skills/${target}"
    if [ -f "$src" ]; then
      mkdir -p "$dest_dir"
      cp "$src" "$dest_dir/SKILL.md"
    fi
  }

  merge_one reviews-code maister-reviews-code
  merge_one reviews-pragmatic maister-reviews-pragmatic
  merge_one reviews-production-readiness maister-reviews-production-readiness
  merge_one reviews-reality-check maister-reviews-reality-check
  merge_one reviews-spec-audit maister-reviews-spec-audit
  merge_one work maister-work
  merge_one quick-requirements-critic maister-quick-requirements-critic
  merge_one quick-transcript-critic maister-quick-transcript-critic
  merge_one quick-problem-classifier maister-quick-problem-classifier
  merge_one reviews-test-strategy maister-reviews-test-strategy
  merge_one reviews-linguistic-boundaries maister-reviews-linguistic-boundaries
  merge_one quick-metaprogram-classifier maister-quick-metaprogram-classifier
  merge_one modeling-context-distiller maister-modeling-context-distiller
  merge_one modeling-aggregate-designer maister-modeling-aggregate-designer

  rm -rf "$commands_dir"
}

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

# Step 8 (T4): AskUserQuestion → chat-native gates — see transforms/askuser-to-chat-gate.md
apply_chat_gate_transforms() {
  local f="$1"
  [ -f "$f" ] || return 0

  # 3C: multi-select → sequential single-choice (before AskUserQuestion replacements)
  sedi 's/multi-select question/sequential single-choice questions (one per option)/g' "$f"
  sedi 's/multi-select/sequential single-choice/g' "$f"
  sedi 's/multiselect/sequential single-choice/g' "$f"
  sedi 's/multiSelect/sequential single-choice/g' "$f"
  sedi 's/allow_multiple/sequential single-choice/g' "$f"

  # 3A: MANDATORY GATE / Pause → CHAT GATE (long form first)
  sedi 's/→ \*\*MANDATORY GATE\*\* — fires regardless of permission mode, session-reminders, or prior approval patterns\. Invoke `AskUserQuestion` now\. Proceeding without a user response is a protocol violation (orchestrator-patterns\.md § 2 \/ § 2\.1)\./→ **CHAT GATE** — Present the question and options in chat. Do not proceed until the user replies in this conversation. In `--no-interactive` mode, use the documented default for this gate (see Headless Defaults table)./g' "$f"

  sedi 's/→ \*\*MANDATORY GATE\*\*/→ **CHAT GATE**/g' "$f"
  sedi 's/→ MANDATORY GATE/→ **CHAT GATE**/g' "$f"
  sedi 's/→ Pause/→ **CHAT GATE**/g' "$f"

  # AskUserQuestion / AskQuestion invocation patterns
  sedi 's/AskUserQuestion - /→ **CHAT GATE** — Present in chat: /g' "$f"
  sedi 's/AskUserQuestion — /→ **CHAT GATE** — Present in chat: /g' "$f"
  sedi 's/AskQuestion - /→ **CHAT GATE** — Present in chat: /g' "$f"
  sedi 's/AskQuestion — /→ **CHAT GATE** — Present in chat: /g' "$f"

  sedi 's/Use `AskUserQuestion`/→ **CHAT GATE** — Present the question in chat/g' "$f"
  sedi 's/Use AskUserQuestion/→ **CHAT GATE** — Present the question in chat/g' "$f"
  sedi 's/use AskUserQuestion/→ **CHAT GATE** — Present the question in chat/g' "$f"
  sedi 's/Use `AskQuestion`/→ **CHAT GATE** — Present the question in chat/g' "$f"
  sedi 's/Use AskQuestion/→ **CHAT GATE** — Present the question in chat/g' "$f"
  sedi 's/use AskQuestion/→ **CHAT GATE** — Present the question in chat/g' "$f"

  sedi 's/MUST use `AskUserQuestion`/MUST fire **CHAT GATE** — present each question in chat/g' "$f"
  sedi 's/MUST invoke `AskUserQuestion`/MUST fire **CHAT GATE**/g' "$f"

  sedi 's/invoking `AskUserQuestion`/firing the **CHAT GATE**/g' "$f"
  sedi 's/invoke `AskUserQuestion`/fire the **CHAT GATE**/g' "$f"
  sedi 's/Invoke `AskUserQuestion`/Fire the **CHAT GATE**/g' "$f"
  sedi 's/invoking `AskQuestion`/firing the **CHAT GATE**/g' "$f"
  sedi 's/invoke `AskQuestion`/fire the **CHAT GATE**/g' "$f"
  sedi 's/Invoke `AskQuestion`/Fire the **CHAT GATE**/g' "$f"

  sedi 's/AskUserQuestion at /**CHAT GATE** at /g' "$f"
  sedi 's/AskUserQuestion with /**CHAT GATE** with /g' "$f"
  sedi 's|AskUserQuestion (|**CHAT GATE** (present sequentially in chat; |g' "$f"
  sedi 's/AskUserQuestion:/→ **CHAT GATE**:/g' "$f"
  sedi 's/AskQuestion:/→ **CHAT GATE**:/g' "$f"

  sedi 's/via AskUserQuestion/via **CHAT GATE** in chat/g' "$f"
  sedi 's/via AskQuestion/via **CHAT GATE** in chat/g' "$f"

  sedi 's/corresponding `AskUserQuestion` call/corresponding **CHAT GATE** reply/g' "$f"
  sedi 's/`AskUserQuestion` tool call/**CHAT GATE** reply/g' "$f"

  # Residual tool names (AskUserQuestion before AskQuestion — no substring overlap)
  sedi 's/`AskUserQuestion`/**CHAT GATE**/g' "$f"
  sedi 's/AskUserQuestion/**CHAT GATE**/g' "$f"
  sedi 's/`AskQuestion`/**CHAT GATE**/g' "$f"
  sedi 's/AskQuestion/**CHAT GATE**/g' "$f"
}

apply_chat_gate_transforms_tree() {
  foreach_md "$OUT" apply_chat_gate_transforms
  if [ -d "$OUT/hooks" ]; then
    local f
    while IFS= read -r -d '' f; do
      apply_chat_gate_transforms "$f"
    done < <(find "$OUT/hooks" -name "*.sh" -print0)
  fi
}

# Step 9 partial: strip plan mode; apply Kiro overrides (post chat-gate)
strip_plan_mode_references() {
  local f
  while IFS= read -r -d '' f; do
    sedi 's/`EnterPlanMode`[^`]*`//g' "$f"
    sedi 's/`ExitPlanMode`[^`]*`//g' "$f"
    sedi 's/EnterPlanMode/structured planning flow/g' "$f"
    sedi 's/ExitPlanMode/plan approval gate/g' "$f"
    sedi "s/Enter Claude Code's planning mode/Plan a task with file-based artifacts/g" "$f"
    sedi "s/Claude Code's builtin planning mode/file-based planning (\.maister\/plans\/)/g" "$f"
    sedi 's/plan mode as context/the plan file as context/g' "$f"
    sedi 's/plan mode phases/plan phases/g' "$f"
    sedi 's/BEFORE plan mode/BEFORE writing the plan/g' "$f"
    sedi 's/(BEFORE plan mode)/(BEFORE writing the plan)/g' "$f"
    sedi 's/into plan mode/into file-based planning/g' "$f"
    sedi 's/carry into plan mode/carry into the plan file/g' "$f"
  done < <(find "$OUT" -name "*.md" -print0)
}

apply_kiro_overrides() {
  # Inject $ARGUMENTS after frontmatter in skills that accept user input.
  # Kiro substitutes text after /slash-command into $ARGUMENTS placeholders.
  local skills_needing_args=(
    maister-work
    maister-development
    maister-quick-dev
    maister-quick-plan
    maister-quick-bugfix
    maister-research
    maister-migration
    maister-performance
    maister-product-design
    maister-grill-me
    maister-grill-with-docs
    maister-reviews-code
    maister-reviews-pragmatic
    maister-reviews-production-readiness
    maister-reviews-reality-check
    maister-reviews-spec-audit
    maister-standards-update
    maister-standards-discover
    maister-thermo-nuclear-review
    maister-thermo-nuclear-code-quality-review
    maister-thermos
    maister-requirements-critic
    maister-transcript-critic
    maister-problem-classifier
    maister-quick-requirements-critic
    maister-quick-transcript-critic
    maister-quick-problem-classifier
    maister-test-strategy-reviewer
    maister-linguistic-boundary-verifier
    maister-metaprogram-classifier
    maister-reviews-test-strategy
    maister-reviews-linguistic-boundaries
    maister-quick-metaprogram-classifier
    maister-context-distiller
    maister-aggregate-designer
    maister-modeling-context-distiller
    maister-modeling-aggregate-designer
  )
  for skill in "${skills_needing_args[@]}"; do
    local sf="$OUT/skills/$skill/SKILL.md"
    [ -f "$sf" ] || continue
    grep -q '\$ARGUMENTS' "$sf" && continue
    # Insert after second --- (end of frontmatter)
    awk 'BEGIN{n=0} /^---$/{n++; if(n==2){print; print ""; print "**User input**: `$ARGUMENTS`"; next}} {print}' "$sf" > "${sf}.tmp"
    mv "${sf}.tmp" "$sf"
  done

  if [ -f "$PLATFORM/overrides/commands/quick-plan.md" ]; then
    mkdir -p "$OUT/skills/maister-quick-plan"
    cp "$PLATFORM/overrides/commands/quick-plan.md" "$OUT/skills/maister-quick-plan/SKILL.md"
  fi
  if [ -f "$PLATFORM/overrides/skills/quick-bugfix/SKILL.md" ]; then
    mkdir -p "$OUT/skills/maister-quick-bugfix"
    cp "$PLATFORM/overrides/skills/quick-bugfix/SKILL.md" "$OUT/skills/maister-quick-bugfix/SKILL.md"
  fi
}

# Step 7: Explore → maister-explore (T8)
apply_explore_transforms() {
  local f="$1"
  [ -f "$f" ] || return 0
  sedi 's/subagent_type="Explore"/agent: maister-explore/g' "$f"
  sedi 's/subagent_type: "Explore"/agent: maister-explore/g' "$f"
  sedi 's/subagent_type="explore"/agent: maister-explore/g' "$f"
  sedi 's/subagent_type: "explore"/agent: maister-explore/g' "$f"
  sedi 's/built-in Explore subagents/maister-explore subagents/g' "$f"
  sedi 's/built-in Explore agents/maister-explore agents/g' "$f"
  sedi 's/parallel Explore subagents/parallel maister-explore subagents/g' "$f"
  sedi 's/parallel Explore agents/parallel maister-explore agents/g' "$f"
  sedi 's/Explore subagents/maister-explore subagents/g' "$f"
  sedi 's/Explore agents/maister-explore agents/g' "$f"
  sedi 's/Explore agent/maister-explore agent/g' "$f"
  sedi 's/Task + explore/subagent + maister-explore/g' "$f"
}

# Step 13: Task → subagent, Skill tool → slash + skill:// semantics (T5, T6)
apply_delegation_transforms() {
  local f="$1"
  [ -f "$f" ] || return 0
  # Use | delimiter — replacements contain /maister-* paths
  sedi 's|Skill tool - `maister-|Invoke `/maister-|g' "$f"
  sedi 's|\*\*INVOKE NOW\*\* -- Skill tool call:|\*\*INVOKE NOW\*\* -- invoke slash skill:|g' "$f"
  sedi 's|`Skill` tool|`/maister-*` slash skill|g' "$f"
  sedi 's|Skill tool|`/maister-*` slash skill|g' "$f"
  sedi 's|Skill/Task tools|`/maister-*` slash and subagent tools|g' "$f"
  sedi 's|delegation enforcement (Skill tool for skills, Task tool for agents)|delegation enforcement (`/maister-*` slash for skills, subagent tool for agents)|g' "$f"
  sedi 's|Task tool with subagent_type|subagent tool with agent|g' "$f"
  sedi 's|Call the Task tool with subagent_type|Call the subagent tool with agent|g' "$f"
  sedi 's|Task tool - `maister-|subagent tool with agent: `maister-|g' "$f"
  sedi 's|Task tool call|subagent tool call|g' "$f"
  sedi 's|Task tool:|subagent tool:|g' "$f"
  sedi 's|via the Task tool|via the subagent tool|g' "$f"
  sedi 's|via Task tool|via subagent tool|g' "$f"
  sedi 's|using the Task tool|using the subagent tool|g' "$f"
  sedi 's|Use Task tool|Use subagent tool|g' "$f"
  sedi 's|Call the Task tool|Call the subagent tool|g' "$f"
  sedi 's|\*\*Execute\*\*: Task tool|\*\*Execute\*\*: subagent tool|g' "$f"
  sedi 's|Task tool|subagent tool|g' "$f"
  sedi 's|subagent_type: "\(maister[^"]*\)"|subagent tool with agent: `\1`|g' "$f"
  sedi 's|subagent_type="|agent: "|g' "$f"
  sedi 's|subagent_type: "|agent: |g' "$f"
  sedi 's|agent: \(maister-[^"]*\)"|subagent tool with agent: `\1`|g' "$f"
  sedi 's|Invoke via Task tool|Invoke via subagent tool|g' "$f"
  sedi 's|invoked via the Task tool|invoked via the subagent tool|g' "$f"
  sedi 's|invoked via Task tool|invoked via subagent tool|g' "$f"
  sedi 's| via Task tool| via subagent tool|g' "$f"
  sedi 's|(Task tool)|(subagent tool)|g' "$f"
  sedi 's|Skill/Task tool parameters|`/maister-*` slash and subagent tool parameters|g' "$f"
  sedi 's|After Skill tool phases|After `/maister-*` slash skill phases|g' "$f"
  sedi 's|agents always use Task tool|agents always use subagent tool|g' "$f"
  sedi 's|Skills always use Skill tool|Skills always use `/maister-*` slash|g' "$f"
  sedi 's|Never invoke a skill via Task tool|Never invoke a skill via subagent tool|g' "$f"
  sedi 's|must run in the main agent context via Skill tool|must run via `/maister-*` slash in main agent context|g' "$f"
  sedi 's|execute it via the Skill tool|execute it via the `/maister-*` slash skill|g' "$f"
  # Wave 1 AJ skills: merged quick-* commands and chain sections reference plain kebab names;
  # after rename_skill_directories, targets must be maister-* slash skills on Kiro.
  sedi 's|skill `requirements-critic`|skill `maister-requirements-critic`|g' "$f"
  sedi 's|skill `transcript-critic`|skill `maister-transcript-critic`|g' "$f"
  sedi 's|skill `problem-classifier`|skill `maister-problem-classifier`|g' "$f"
  sedi 's|Invoke the `requirements-critic` skill|Invoke the `maister-requirements-critic` skill|g' "$f"
  sedi 's|Invoke the `transcript-critic` skill|Invoke the `maister-transcript-critic` skill|g' "$f"
  sedi 's|Invoke the `problem-classifier` skill|Invoke the `maister-problem-classifier` skill|g' "$f"
  sedi 's|skill: "requirements-critic"|skill: "maister-requirements-critic"|g' "$f"
  sedi 's|skill: "transcript-critic"|skill: "maister-transcript-critic"|g' "$f"
  sedi 's|skill: "problem-classifier"|skill: "maister-problem-classifier"|g' "$f"
  # Wave 2 AJ skills: merged command dirs and chain sections reference plain kebab names
  sedi 's|skill `test-strategy-reviewer`|skill `maister-test-strategy-reviewer`|g' "$f"
  sedi 's|skill `linguistic-boundary-verifier`|skill `maister-linguistic-boundary-verifier`|g' "$f"
  sedi 's|skill `metaprogram-classifier`|skill `maister-metaprogram-classifier`|g' "$f"
  sedi 's|Invoke the `test-strategy-reviewer` skill|Invoke the `maister-test-strategy-reviewer` skill|g' "$f"
  sedi 's|Invoke the `linguistic-boundary-verifier` skill|Invoke the `maister-linguistic-boundary-verifier` skill|g' "$f"
  sedi 's|Invoke the `metaprogram-classifier` skill|Invoke the `maister-metaprogram-classifier` skill|g' "$f"
  sedi 's|skill: "test-strategy-reviewer"|skill: "maister-test-strategy-reviewer"|g' "$f"
  sedi 's|skill: "linguistic-boundary-verifier"|skill: "maister-linguistic-boundary-verifier"|g' "$f"
  sedi 's|skill: "metaprogram-classifier"|skill: "maister-metaprogram-classifier"|g' "$f"
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
  # Wave 3 AJ skills: merged modeling-* commands and chain sections reference plain kebab names
  sedi 's|skill `context-distiller`|skill `maister-context-distiller`|g' "$f"
  sedi 's|skill `aggregate-designer`|skill `maister-aggregate-designer`|g' "$f"
  sedi 's|Invoke the `context-distiller` skill|Invoke the `maister-context-distiller` skill|g' "$f"
  sedi 's|Invoke the `aggregate-designer` skill|Invoke the `maister-aggregate-designer` skill|g' "$f"
  sedi 's|skill: "context-distiller"|skill: "maister-context-distiller"|g' "$f"
  sedi 's|skill: "aggregate-designer"|skill: "maister-aggregate-designer"|g' "$f"
  sedi 's|run `aggregate-designer`|run `maister-aggregate-designer`|g' "$f"
  sedi 's|run `thermos`|run `maister-thermos`|g' "$f"
}

# Step 14: TaskCreate/TaskUpdate → TUI task list (T7)
apply_progress_transforms() {
  local f="$1"
  [ -f "$f" ] || return 0
  sedi 's/TaskCreate/todo/g' "$f"
  sedi 's/TaskUpdate/todo/g' "$f"
  sedi 's/TaskList/todo list/g' "$f"
  sedi 's/addBlockedBy/ordering in todo list/g' "$f"
  sedi 's/activeForm/activity description in content/g' "$f"
  sedi 's/metadata: {skipped: true}/cancelled status/g' "$f"
  sedi 's/Task system/TUI task list/g' "$f"
  sedi 's/Task tracking/TUI task tracking/g' "$f"
  sedi 's/Create Task Items/Create TUI tasks/g' "$f"
  sedi 's/task items/TUI tasks/g' "$f"
  sedi 's/Create task items/Create tasks via todo tool (TUI activity tray)/g' "$f"
  sedi 's/Restore task items/Restore tasks via todo tool from orchestrator-state.yml/g' "$f"
  sedi 's/Task Progress/TUI Task Progress/g' "$f"
  sedi 's/TaskCreate\/TaskUpdate/todo tool/g' "$f"
  sedi 's/Progress Tracking with Task System/Progress Tracking (TUI)/g' "$f"
  sedi 's/TaskCreate\/TaskUpdate tools/todo tool (TUI activity tray)/g' "$f"
  sedi 's/todo\/todo tools/todo tool/g' "$f"
}

# Step 15: strip user-invocable: false (T16)
strip_user_invocable() {
  local f="$1"
  [ -f "$f" ] || return 0
  sedi '/^user-invocable: false$/d' "$f"
}

apply_semantic_transforms_tree() {
  foreach_md "$OUT" "$1"
}

acquire_build_lock

# Step 1: Copy source plugin to output
rm -rf "$OUT"
cp -r "$CORE" "$OUT"

# Step 2: Remove Claude Code manifest; keep agents/*.md until step 17
rm -rf "$OUT/.claude-plugin"

sedi_name_prefix() {
  local f="$1"
  sedi 's/^name: maister:/name: maister-/' "$f"
}

sedi_maister_colon() {
  local f="$1"
  sedi 's/maister:/maister-/g' "$f"
}

sedi_claude_to_agents() {
  local f="$1"
  sedi 's/CLAUDE\.md/AGENTS.md/g' "$f"
}

# Step 3: Skill/command name: prefix — maister:foo → maister-foo
if [ -d "$OUT/commands" ]; then
  while IFS= read -r -d '' f; do
    sedi_name_prefix "$f"
  done < <(find "$OUT/commands" -name "*.md" -print0)
fi
while IFS= read -r -d '' f; do
  sedi_name_prefix "$f"
done < <(find "$OUT/skills" -name "SKILL.md" -print0)

# Step 4: Global references — maister: → maister-
foreach_md "$OUT" sedi_maister_colon

# Step 5: Merge commands into skills; remove commands/
merge_commands_to_skills

# Step 6: Rename source skill directories to match name: frontmatter
rename_skill_directories

# Step 8: Chat-native gate transforms (all *.md + hooks/*.sh before JSON generation)
apply_chat_gate_transforms_tree

# Step 9 partial: strip plan mode; copy chat-gate-adapted overrides
strip_plan_mode_references
apply_kiro_overrides

# Step 10: Project instructions — CLAUDE.md → AGENTS.md in skills
foreach_md "$OUT/skills" sedi_claude_to_agents

# Step 12: Plugin doc → steering/maister-workflows.md + Kiro platform section
mkdir -p "$OUT/steering"
{
  if [ -f "$OUT/CLAUDE.md" ]; then
    cat "$OUT/CLAUDE.md"
  fi
  cat << 'EOF'

## Platform: Kiro CLI

This is the Kiro CLI variant. Key differences from Claude Code:
- **Command names**: Prefix `maister-foo` (e.g. `/maister-development`); install to `KIRO_HOME` (~/.kiro-maister)
- **Project instructions file**: Use `AGENTS.md` instead of `CLAUDE.md`, plus `.kiro/steering/maister-docs.md` after init
- **User questions**: Chat-native **CHAT GATE** — present options in chat and wait for reply (no AskQuestion tool)
- **Headless gates**: `--no-interactive` may use a documented default only for a non-protected gate; unsupported automatic injection, denylisted gates, and implementation approval persist `blocked` rather than approving.
- **UI**: Terminal UI (Kiro CLI default); activity tray (`Ctrl+X`) and crew monitor (`Ctrl+G`)
- **Progress tracking**: `todo` tool mirrors phases in activity tray (`Ctrl+X`); subagents in crew monitor (`Ctrl+G`)
- **Planning**: File-based plans in `.maister/plans/` with chat gates (no EnterPlanMode)
- **Subagents**: Custom `maister-explore` agent; other agents referenced as `maister-*`
- **Hooks**: Embedded in `agents/maister.json`; scripts at profile-root `hooks/` (`~/.kiro-maister/hooks/*.sh`; `smoke-install.sh` rewrites to `$DEST/hooks/` for non-default installs)
- **preCompact gap**: Kiro has no `preCompact` hook — use `orchestrator-state.yml` + `@status` / `@resume`; `hooks/post-compact-reminder-stub.sh` is documented only (not wired)
- **Slash shortcuts**: `/dev`, `/work`, `/research`, `/quick-dev`, etc. — shortcut skills in `skills/` that delegate to full `/maister-*` skills
- **MCP**: `settings/mcp.json` (enable Playwright for `--e2e` workflows). Empirical: `kiro-cli settings mcp.includeMcpJson true` (verify vs `useLegacyMcpJson` for your CLI version)
- **Orchestrator**: `maister-kiro chat --agent maister` or `kiro-cli chat --agent maister`

### Kiro CLI Documentation

- Custom agents: https://kiro.dev/docs/cli/custom-agents/
- Hooks: https://kiro.dev/docs/cli/hooks
- Built-in tools: https://kiro.dev/docs/cli/reference/built-in-tools
EOF
} > "$OUT/steering/maister-workflows.md"

sedi 's/## Claude Code Documentation/## Kiro CLI Documentation/g' "$OUT/steering/maister-workflows.md"
sedi 's|https://code.claude.com/docs/en/plugins|https://kiro.dev/docs/cli/custom-agents/|g' "$OUT/steering/maister-workflows.md"
sedi 's|https://code.claude.com/docs/en/skills|https://kiro.dev/docs/cli/custom-agents/creating|g' "$OUT/steering/maister-workflows.md"
sedi 's|https://code.claude.com/docs/en/plugins-reference|https://kiro.dev/docs/cli/custom-agents/configuration-reference|g' "$OUT/steering/maister-workflows.md"
sedi 's|https://code.claude.com/docs/en/sub-agents|https://kiro.dev/docs/cli/reference/built-in-tools|g' "$OUT/steering/maister-workflows.md"
sedi 's/CLAUDE\.md/AGENTS.md/g' "$OUT/steering/maister-workflows.md"
sedi 's/hooks\/hooks\.json/agents\/maister.json (embedded hooks)/g' "$OUT/steering/maister-workflows.md"

rm -f "$OUT/CLAUDE.md"

# Steps 7, 13–15: Explore, delegation, todo, user-invocable (all *.md, post-overrides, pre-JSON)
apply_semantic_transforms_tree apply_explore_transforms
apply_semantic_transforms_tree apply_delegation_transforms

TODO_GLOB=(
  "$OUT/skills/maister-orchestrator-framework"
  "$OUT/skills/maister-development"
  "$OUT/skills/maister-product-design"
  "$OUT/skills/maister-performance"
  "$OUT/skills/maister-migration"
  "$OUT/skills/maister-research"
  "$OUT/skills/maister-init"
  "$OUT/skills/maister-standards-discover"
  "$OUT/skills/maister-implementation-verifier"
  "$OUT/skills/maister-implementation-plan-executor"
  "$OUT/agents"
  "$OUT/steering/maister-workflows.md"
)

for dir in "${TODO_GLOB[@]}"; do
  if [ -f "$dir" ]; then
    apply_progress_transforms "$dir"
  elif [ -d "$dir" ]; then
    foreach_md "$dir" apply_progress_transforms
  fi
done

sedi 's/metadata: {restored: true}/(restored from state — mark completed)/g' \
  "$OUT/skills/maister-orchestrator-framework/references/orchestrator-patterns.md"

while IFS= read -r -d '' f; do
  strip_user_invocable "$f"
done < <(find "$OUT/skills" -name "SKILL.md" -print0)

# Step 16: Init/docs-manager patches — AGENTS.md template, .kiro/steering/maister-docs.md
cp "$PLATFORM/templates/agents-md-template.md" "$OUT/skills/maister-docs-manager/references/agents-md-template.md"
sedi 's/claude-md-template\.md/agents-md-template.md/g' "$OUT/skills/maister-docs-manager/SKILL.md"
sedi 's/Manage CLAUDE.md Integration/Manage AGENTS.md Integration/g' "$OUT/skills/maister-docs-manager/SKILL.md"
sedi 's/CLAUDE\.md/AGENTS.md/g' "$OUT/skills/maister-docs-manager/SKILL.md"

sedi 's/Verify AGENTS.md integration/Verify AGENTS.md integration\
- Create `.kiro\/steering\/maister-docs.md` in project root if missing (copy from plugin `steering\/maister-docs.md` template — read `.maister\/docs\/INDEX.md` first)/' \
  "$OUT/skills/maister-init/SKILL.md"

cp "$PLATFORM/templates/steering-maister-docs.md" "$OUT/steering/maister-docs.md"

sedi 's/\.claude\/AGENTS\.md/.kiro\/steering/g' "$OUT/skills/maister-standards-discover/references/docs-extractor-prompt.md"
sedi 's/CLAUDE.md/AGENTS.md/g' "$OUT/skills/maister-standards-discover/references/docs-extractor-prompt.md"

# Step 16b: Extract catalog sections from steering → lazy-loaded reference
# Sections "Available Skills", "Available Commands", "Available Subagents" waste ~8K tokens
# in always-loaded steering context. Move them to orchestrator-framework/references/catalog.md
# and replace with a short pointer in steering.
extract_catalog_from_steering() {
  local steering="$OUT/steering/maister-workflows.md"
  local catalog="$OUT/skills/maister-orchestrator-framework/references/catalog.md"
  [ -f "$steering" ] || return 0

  # Extract from "## Available Skills" through the line before "## Key Workflow Principles"
  awk '/^## Available Skills$/,/^## Key Workflow Principles$/{
    if (/^## Key Workflow Principles$/) next
    print
  }' "$steering" > "$catalog"

  # Verify extraction produced content
  if [ ! -s "$catalog" ]; then
    echo "WARNING: catalog extraction produced empty file" >&2
    rm -f "$catalog"
    return 0
  fi

  # Add header to catalog
  {
    echo "# Maister Skill, Command & Agent Catalog"
    echo ""
    echo "Reference listing of all available skills, commands, and subagents."
    echo "This file is loaded on-demand by orchestrators — not always in context."
    echo ""
    cat "$catalog"
  } > "${catalog}.tmp"
  mv "${catalog}.tmp" "$catalog"

  # Replace extracted sections in steering with a pointer
  # Use awk to replace the range with a short reference block
  awk '
    /^## Available Skills$/ {
      print "## Catalog Reference"
      print ""
      print "For the full listing of available skills, commands, and subagents, read:"
      print "`skills/maister-orchestrator-framework/references/catalog.md`"
      print ""
      print "Key facts (always available without reading catalog):"
      print "- **5 orchestrator workflows**: development, performance, migration, research, product-design"
      print "- **Delegation**: skills via `/maister-*` slash, agents via subagent tool"
      print "- **Bundles**: A (requirements quality), B (DDD modeling), C (architecture review), D (stakeholder communication)"
      print ""
      skip = 1
      next
    }
    /^## Key Workflow Principles$/ { skip = 0 }
    !skip { print }
  ' "$steering" > "${steering}.tmp"
  mv "${steering}.tmp" "$steering"
}
extract_catalog_from_steering

# Step 11: MCP config — .mcp.json → settings/mcp.json
mkdir -p "$OUT/settings"
if [ -f "$OUT/.mcp.json" ]; then
  mv "$OUT/.mcp.json" "$OUT/settings/mcp.json"
fi
rm -f "$OUT/settings/cli.json"

# Step 17: MD→JSON agent generation (post-transform only — semantic transforms must complete first)
generate_agent_json() {
  bash "$PLATFORM/generate-agent-json.sh" "$OUT"
}
generate_agent_json

# Hook command paths: absolute ~/.kiro-maister/hooks/ (smoke-install rewrites for non-default KIRO_HOME)
hook_command() {
  echo "~/.kiro-maister/hooks/$1"
}

# Step 18: Synthesize maister.json (orchestrator) + maister-explore.json
synthesize_orchestrator_agents() {
  local hook_block hook_subagent_spawn hook_subagent_complete hook_skill_reminder hook_rtk hook_stop
  hook_block=$(hook_command "block-destructive-commands-kiro.sh")
  hook_subagent_spawn=$(hook_command "subagent-spawn-tracker.sh")
  hook_subagent_complete=$(hook_command "subagent-complete-cleanup.sh")
  hook_skill_reminder=$(hook_command "skill-invocation-reminder.sh")
  hook_rtk=$(hook_command "rtk-rewrite.sh")
  hook_stop=$(hook_command "stop-state-reminder-kiro.sh")

  mkdir -p "$OUT/agents/instructions"

  cat > "$OUT/agents/instructions/maister-explore.md" << 'EOF'
# maister-explore

Read-only codebase exploration agent. Use read, grep, glob, and list tools only. Report findings concisely for the parent orchestrator or reporter agent.
EOF

  cat > "$OUT/agents/instructions/maister.md" << 'EOF'
# Maister Orchestrator

You are the Maister workflow orchestrator for Kiro CLI.

- Invoke `/maister-*` slash skills for orchestrated workflows — do not skip workflows for "straightforward" tasks
- Delegate to subagents via the subagent tool with `agent: maister-<name>`
- Track phase progress with the `todo` tool (visible in TUI activity tray via Ctrl+X)
- Monitor subagent waves in crew monitor (Ctrl+G); max 4 parallel subagents
- Read `orchestrator-state.yml` in the active task directory for resume and phase state
- Use Terminal UI features: activity tray (`Ctrl+X`), crew monitor (`Ctrl+G`)
- Read `.maister/docs/INDEX.md` before coding tasks
- After context compaction, ALWAYS read the latest `orchestrator-state.yml` under `.maister/tasks/` before continuing — verify `completed_phases` and resume from `current_phase`
EOF

  jq -n \
    --arg name "maister-explore" \
    --arg description "Read-only codebase exploration (replaces built-in explore)" \
    --arg prompt "file://./instructions/maister-explore.md" \
    --argjson tools '["read","grep","glob","aws"]' \
    --argjson allowedTools '["read","grep","glob","aws"]' \
    '{
      name: $name,
      description: $description,
      tools: $tools,
      allowedTools: $allowedTools,
      prompt: $prompt
    }' > "$OUT/agents/maister-explore.json"

  jq -n \
    --arg name "maister" \
    --arg description "Maister workflow orchestrator — invokes /maister-* skills and delegates to maister-* subagents" \
    --arg prompt "file://./instructions/maister.md" \
    --argjson tools '["*"]' \
    --argjson allowedTools '["*"]' \
    --argjson toolsSettings '{"subagent":{"availableAgents":["maister-*"],"trustedAgents":["maister-*"]}}' \
    --arg hook_block "$hook_block" \
    --arg hook_subagent_spawn "$hook_subagent_spawn" \
    --arg hook_subagent_complete "$hook_subagent_complete" \
    --arg hook_skill_reminder "$hook_skill_reminder" \
    --arg hook_rtk "$hook_rtk" \
    --arg hook_stop "$hook_stop" \
    '{
      name: $name,
      description: $description,
      tools: $tools,
      allowedTools: $allowedTools,
      includeMcpJson: true,
      toolsSettings: $toolsSettings,
      prompt: $prompt,
      hooks: {
        preToolUse: [
          {matcher: "shell", command: $hook_block, timeout_ms: 5000},
          {matcher: "shell", command: $hook_rtk, timeout_ms: 5000},
          {matcher: "subagent", command: $hook_subagent_spawn, timeout_ms: 5000}
        ],
        postToolUse: [
          {matcher: "subagent", command: $hook_subagent_complete, timeout_ms: 5000}
        ],
        agentSpawn: [
          {command: $hook_skill_reminder, timeout_ms: 10000}
        ],
        userPromptSubmit: [
          {command: $hook_skill_reminder, timeout_ms: 10000}
        ],
        stop: [
          {command: $hook_stop, timeout_ms: 10000}
        ]
      }
    }' > "$OUT/agents/maister.json"

  jq empty "$OUT/agents/maister.json"
  jq empty "$OUT/agents/maister-explore.json"
}
synthesize_orchestrator_agents

# Steps 19–21: Phase 1 hooks, .hook-state/, README
rm -rf "$OUT/hooks"
cp -R "$PLATFORM/hooks" "$OUT/hooks"
chmod +x "$OUT/hooks/"*.sh
mkdir -p "$OUT/.hook-state"
printf '*\n!.gitignore\n' > "$OUT/.hook-state/.gitignore"

# Step 20: Generate shortcut skills (replace @prompts — these properly resolve $ARGUMENTS)
generate_shortcut_skill() {
  local name="$1" desc="$2" target="$3" extra="${4:-}"
  mkdir -p "$OUT/skills/$name"
  cat > "$OUT/skills/$name/SKILL.md" <<SKILL
---
name: $name
description: "$desc"
user-invocable: true
---

**User input**: \`\$ARGUMENTS\`

Invoke \`/$target\` with the above user input. Pass \`\$ARGUMENTS\` verbatim.
${extra}
SKILL
}

# Orchestrator shortcuts
generate_shortcut_skill "dev" "Shortcut for /maister-development. Use for any development task: features, bug fixes, enhancements." "maister-development" \
  "Do not skip the workflow for \"straightforward\" tasks — complexity assessment is the workflow's job."
generate_shortcut_skill "work" "Shortcut for /maister-work. Auto-classifies tasks and routes to appropriate workflow." "maister-work" \
  "Classify the task and route to the appropriate Maister orchestrator. Do not skip workflow selection."
generate_shortcut_skill "quick-dev" "Shortcut for /maister-quick-dev. Implement directly with standards awareness — no full workflow." "maister-quick-dev"
generate_shortcut_skill "quick-plan" "Shortcut for /maister-quick-plan. Lightweight plan under .maister/plans/ — not Kiro built-in /plan." "maister-quick-plan" \
  "Do not use Kiro's built-in \`/plan\` — that switches to the Kiro Plan agent."
generate_shortcut_skill "quick-bugfix" "Shortcut for /maister-quick-bugfix. TDD-driven quick fix with complexity escalation." "maister-quick-bugfix"
generate_shortcut_skill "research" "Shortcut for /maister-research. Technical, requirements, or mixed research before implementation." "maister-research"
generate_shortcut_skill "design" "Shortcut for /maister-product-design. Interactive product/feature design before development." "maister-product-design"
generate_shortcut_skill "migration" "Shortcut for /maister-migration. Full migration workflow with rollback planning." "maister-migration"
generate_shortcut_skill "performance" "Shortcut for /maister-performance. Static bottleneck analysis and optimization." "maister-performance"
generate_shortcut_skill "init" "Shortcut for /maister-init. Initialize Maister SDLC framework in this project." "maister-init"
generate_shortcut_skill "grill-me" "Shortcut for /maister-grill-me. Stress-test a plan or design with relentless questions." "maister-grill-me"
generate_shortcut_skill "grill-with-docs" "Shortcut for /maister-grill-with-docs. Stress-test a plan while maintaining language.md and sparse ADRs." "maister-grill-with-docs"
generate_shortcut_skill "thermos" "Shortcut for /maister-thermos. Combined thermo-nuclear branch review (security + code quality)." "maister-thermos" \
  "Gather the scoped diff and changed-file contents first, then run both review subagents."
generate_shortcut_skill "thermo-review" "Shortcut for /maister-thermo-nuclear-review. Deep security and correctness branch diff audit." "maister-thermo-nuclear-review" \
  "Gather diff and changed-file contents first. Scope to added/modified code only."
generate_shortcut_skill "thermo-quality" "Shortcut for /maister-thermo-nuclear-code-quality-review. Strict maintainability branch diff audit." "maister-thermo-nuclear-code-quality-review" \
  "Gather diff and changed-file contents first. Apply the full thermo-nuclear code quality rubric."
generate_shortcut_skill "reviews-code" "Shortcut for /maister-reviews-code. Automated code quality, security, and performance review." "maister-reviews-code"
generate_shortcut_skill "reviews-pragmatic" "Shortcut for /maister-reviews-pragmatic. Detects over-engineering and scale mismatch." "maister-reviews-pragmatic"
generate_shortcut_skill "reviews-production-readiness" "Shortcut for /maister-reviews-production-readiness. Pre-deployment GO/NO-GO verification." "maister-reviews-production-readiness"
generate_shortcut_skill "reviews-reality-check" "Shortcut for /maister-reviews-reality-check. Validates work actually solves the problem." "maister-reviews-reality-check"
generate_shortcut_skill "reviews-spec-audit" "Shortcut for /maister-reviews-spec-audit. Independent spec audit for completeness and clarity." "maister-reviews-spec-audit"
generate_shortcut_skill "standards-discover" "Shortcut for /maister-standards-discover. Discover coding standards from project config and patterns." "maister-standards-discover"
generate_shortcut_skill "standards-update" "Shortcut for /maister-standards-update. Update or create standards under .maister/docs/standards/." "maister-standards-update"

# Utility shortcuts (inline logic, no /maister-* delegation)
mkdir -p "$OUT/skills/resume"
cat > "$OUT/skills/resume/SKILL.md" <<'SKILL'
---
name: resume
description: "Resume interrupted Maister workflow from orchestrator-state.yml."
user-invocable: true
---

**User input**: `$ARGUMENTS`

Resume the Maister workflow from saved state.

1. Find the latest `orchestrator-state.yml` under `.maister/tasks/`
2. Read task path, `current_phase`, and `completed_phases`
3. Invoke the appropriate `/maister-*` skill with `--from=<phase>` if supported, or continue from `current_phase`

Do not restart from scratch unless the user asks.
SKILL

mkdir -p "$OUT/skills/status"
cat > "$OUT/skills/status/SKILL.md" <<'SKILL'
---
name: status
description: "Report current Maister workflow state, phase, and blockers."
user-invocable: true
---

Read the active `orchestrator-state.yml` under `.maister/tasks/` and report:

- Current task path and workflow type
- `current_phase` and `completed_phases`
- Any blockers or pending gates

If no active workflow exists, say so clearly.
SKILL

mkdir -p "$OUT/skills/next"
cat > "$OUT/skills/next/SKILL.md" <<'SKILL'
---
name: next
description: "Suggest the best next action based on current workflow state."
user-invocable: true
---

Read `orchestrator-state.yml` in the active task directory under `.maister/tasks/`.

Suggest the single best next action (phase, skill, or subagent) based on current state.

If no workflow is active, suggest `/init` or `/dev` as appropriate.
SKILL

mkdir -p "$OUT/skills/bye"
cat > "$OUT/skills/bye/SKILL.md" <<'SKILL'
---
name: bye
description: "End Maister session gracefully, preserving workflow state for /resume."
user-invocable: true
---

End the Maister session gracefully.

1. Ensure `orchestrator-state.yml` reflects the latest phase progress
2. Summarize what was completed and what remains
3. Note the task path for `/resume` on the next session

Do not discard in-progress workflow state.
SKILL

cat > "$OUT/README.md" << 'EOF'
# Maister (Kiro CLI)

Structured, standards-aware development workflows for Kiro CLI.

Generated by `platforms/kiro-cli/build.sh`. Do not edit by hand — run `make build-kiro`.

## Install (local)

```bash
bash platforms/kiro-cli/smoke-install.sh
```

Installs to `KIRO_HOME` (default `~/.kiro-maister`). Does not merge into personal `~/.kiro/`.

## Usage

```bash
maister-kiro chat --agent maister
```

Invoke workflows with `/maister-*` slash skills (e.g. `/maister-init`, `/maister-development`).

## Layout

- `agents/maister.json` — orchestrator with embedded hooks
- `agents/maister-*.json` — 28 subagents + `maister-explore` + `maister.json` (30 JSON files total)
- `skills/maister-*/` — 38 slash skills
- `steering/maister-workflows.md` — plugin workflows and Kiro platform notes
- `hooks/` — hook scripts (`~/.kiro-maister/hooks/*.sh`; `smoke-install.sh` rewrites for non-default installs)
- `settings/mcp.json` — Playwright MCP for `--e2e` workflows

## Terminal UI

Maister targets Kiro's **Terminal UI** (default in Kiro CLI 2.0+).

- **Activity tray** (`Ctrl+X`) — phase/task progress
- **Crew monitor** (`Ctrl+G`) — subagent execution
- **Resume** — `@status` / `@resume` or read `orchestrator-state.yml`
EOF

echo "Built $OUT (Kiro CLI)"
