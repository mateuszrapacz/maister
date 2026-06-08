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

  merge_one quick-dev maister-quick-dev
  merge_one quick-plan maister-quick-plan
  merge_one reviews-code maister-reviews-code
  merge_one reviews-pragmatic maister-reviews-pragmatic
  merge_one reviews-production-readiness maister-reviews-production-readiness
  merge_one reviews-reality-check maister-reviews-reality-check
  merge_one reviews-spec-audit maister-reviews-spec-audit
  merge_one work maister-work

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
  done < <(find "$OUT" -name "*.md" -print0)
}

apply_kiro_overrides() {
  if [ -f "$PLATFORM/overrides/skills/development/SKILL.md" ]; then
    mkdir -p "$OUT/skills/maister-development"
    cp "$PLATFORM/overrides/skills/development/SKILL.md" "$OUT/skills/maister-development/SKILL.md"
  fi
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
- **UI**: Terminal UI only (`chat.ui` = `tui`); classic interface unsupported
- **Progress tracking**: `todo` tool mirrors phases in activity tray (`Ctrl+X`); subagents in crew monitor (`Ctrl+G`)
- **Planning**: File-based plans in `.maister/plans/` with chat gates (no EnterPlanMode)
- **Subagents**: Custom `maister-explore` agent; other agents referenced as `maister-*`
- **Hooks**: Embedded in `agents/maister.json`; scripts at profile-root `hooks/` (`~/.kiro-maister/hooks/*.sh`; `smoke-install.sh` rewrites to `$DEST/hooks/` for non-default installs)
- **preCompact gap**: Kiro has no `preCompact` hook — use `orchestrator-state.yml` + `@status` / `@resume`; `hooks/post-compact-reminder-stub.sh` is documented only (not wired)
- **@prompts**: Nine shortcuts in `prompts/` — invoke as `@init`, `@dev`, `@research`, etc.
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

if [ -f "$PLATFORM/patches/orchestrator-patterns-tui.md" ]; then
  cat "$PLATFORM/patches/orchestrator-patterns-tui.md" >> \
    "$OUT/skills/maister-orchestrator-framework/references/orchestrator-patterns.md"
fi

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

sedi 's/CLAUDE.md/AGENTS.md/g' "$OUT/skills/maister-standards-discover/references/docs-extractor-prompt.md"
sedi 's/\.claude\/CLAUDE.md/.kiro\/steering/g' "$OUT/skills/maister-standards-discover/references/docs-extractor-prompt.md"

# Step 11: MCP config — .mcp.json → settings/mcp.json; default TUI profile settings
mkdir -p "$OUT/settings"
if [ -f "$OUT/.mcp.json" ]; then
  mv "$OUT/.mcp.json" "$OUT/settings/mcp.json"
fi
if [ -f "$OUT/settings/cli.json" ]; then
  tmp="${OUT}/settings/cli.json.tmp.$$"
  jq '.["chat.ui"] = "tui" | del(.["chat.enableTodoList"])' "$OUT/settings/cli.json" >"$tmp"
  mv "$tmp" "$OUT/settings/cli.json"
else
  echo '{"chat.ui":"tui"}' >"$OUT/settings/cli.json"
fi

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
  local hook_block hook_subagent_spawn hook_subagent_complete hook_skill_reminder
  hook_block=$(hook_command "block-destructive-commands-kiro.sh")
  hook_subagent_spawn=$(hook_command "subagent-spawn-tracker.sh")
  hook_subagent_complete=$(hook_command "subagent-complete-cleanup.sh")
  hook_skill_reminder=$(hook_command "skill-invocation-reminder.sh")

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
- Maister targets Terminal UI (`chat.ui` = `tui`); classic interface is unsupported
- Read `.maister/docs/INDEX.md` before coding tasks
EOF

  jq -n \
    --arg name "maister-explore" \
    --arg description "Read-only codebase exploration (replaces built-in explore)" \
    --arg promptFile "instructions/maister-explore.md" \
    --argjson tools '["read","grep","glob","list"]' \
    '{
      name: $name,
      description: $description,
      model: "inherit",
      tools: $tools,
      promptFile: $promptFile
    }' > "$OUT/agents/maister-explore.json"

  jq -n \
    --arg name "maister" \
    --arg description "Maister workflow orchestrator — invokes /maister-* skills and delegates to maister-* subagents" \
    --arg promptFile "instructions/maister.md" \
    --argjson tools '["*"]' \
    --argjson allowedTools '["*"]' \
    --argjson resources '["skill://~/.kiro-maister/skills/**/SKILL.md"]' \
    --argjson toolsSettings '{"subagent":{"trustedAgents":["maister-*"]}}' \
    --arg hook_block "$hook_block" \
    --arg hook_subagent_spawn "$hook_subagent_spawn" \
    --arg hook_subagent_complete "$hook_subagent_complete" \
    --arg hook_skill_reminder "$hook_skill_reminder" \
    '{
      name: $name,
      description: $description,
      model: "inherit",
      tools: $tools,
      allowedTools: $allowedTools,
      includeMcpJson: true,
      resources: $resources,
      toolsSettings: $toolsSettings,
      promptFile: $promptFile,
      hooks: {
        preToolUse: [
          {matcher: "shell", command: $hook_block, timeout: 5},
          {matcher: "subagent", command: $hook_subagent_spawn, timeout: 5}
        ],
        postToolUse: [
          {matcher: "subagent", command: $hook_subagent_complete, timeout: 5}
        ],
        agentSpawn: [
          {command: $hook_skill_reminder, timeout: 10}
        ],
        userPromptSubmit: [
          {command: $hook_skill_reminder, timeout: 10}
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

# Step 20: Copy @prompts templates to OUT/prompts/
rm -rf "$OUT/prompts"
cp -R "$PLATFORM/prompts" "$OUT/prompts"

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
- `agents/maister-*.json` — 26 subagents + `maister-explore`
- `skills/maister-*/` — 26 slash skills
- `steering/maister-workflows.md` — plugin workflows and Kiro platform notes
- `hooks/` — hook scripts (`~/.kiro-maister/hooks/*.sh`; `smoke-install.sh` rewrites for non-default installs)
- `prompts/` — `@prompts` shortcuts (`@init`, `@dev`, `@grill-me`, `@thermos`, …)
- `settings/mcp.json` — Playwright MCP for `--e2e` workflows

## Terminal UI

Maister targets the **Terminal UI** (default since Kiro CLI 2.0). Profile ships with `chat.ui` = `tui`.

- **Activity tray** (`Ctrl+X`) — phase/task progress
- **Crew monitor** (`Ctrl+G`) — subagent execution
- **Resume** — `@status` / `@resume` or read `orchestrator-state.yml`

Classic interface and `chat.enableTodoList` are not used.
EOF

echo "Built $OUT (Kiro CLI)"
