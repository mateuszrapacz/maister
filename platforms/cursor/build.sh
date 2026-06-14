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
  "keywords": ["development", "sdlc", "workflows", "skills"],
  "skills": "./skills/",
  "agents": "./agents/",
  "commands": "./commands/",
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

# 5. Explore subagent
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/subagent_type="Explore"/subagent_type="explore"/g' "$f"
  sedi 's/subagent_type: "Explore"/subagent_type: "explore"/g' "$f"
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

# 10. Plugin doc → rules/maister-workflows.mdc
mkdir -p "$OUT/rules"
{
  echo "---"
  echo "description: Maister plugin workflows and principles"
  echo "alwaysApply: true"
  echo "---"
  echo ""
  if [ -f "$OUT/CLAUDE.md" ]; then
    cat "$OUT/CLAUDE.md"
  fi
  cat << 'EOF'

## Platform: Cursor Agent

This is the Cursor Agent variant. Key differences from Claude Code:
- **Command names**: Prefix `maister-foo` (e.g. `/maister-development`); plugin id is `maister-cursor`
- **Project instructions file**: Use `AGENTS.md` instead of `CLAUDE.md`, plus `.cursor/rules/maister-docs.mdc` after init
- **User questions**: Use `AskQuestion` tool (supports `allow_multiple`)
- **Progress tracking**: Use `TodoWrite` instead of `TaskCreate`/`TaskUpdate`
- **Planning**: File-based plans in `.maister/plans/` with `AskQuestion` gates (no EnterPlanMode)
- **Subagents**: Built-in `explore` (lowercase); custom agents referenced as `maister-*`
- **Hooks**: `beforeShellExecution`, `preCompact`, `sessionStart` (see `hooks/hooks.json`)
- **MCP**: `mcp.json` in plugin root (enable Playwright for `--e2e` workflows)

### Cursor Documentation

- Plugins: https://cursor.com/docs/plugins
- Hooks: https://cursor.com/docs/hooks
- Subagents: https://cursor.com/docs/subagents
EOF
} > "$OUT/rules/maister-workflows.mdc"

# Transform rules file (post-CLAUDE copy)
sedi 's/AskUserQuestion/AskQuestion/g' "$OUT/rules/maister-workflows.mdc"
sedi 's/maister:/maister-/g' "$OUT/rules/maister-workflows.mdc"
sedi 's/TaskCreate/TodoWrite/g' "$OUT/rules/maister-workflows.mdc"
sedi 's/TaskUpdate/TodoWrite/g' "$OUT/rules/maister-workflows.mdc"
sedi 's/## Claude Code Documentation/## Cursor Agent Documentation/g' "$OUT/rules/maister-workflows.mdc"
sedi 's|https://code.claude.com/docs/en/plugins|https://cursor.com/docs/plugins|g' "$OUT/rules/maister-workflows.mdc"
sedi 's|https://code.claude.com/docs/en/skills|https://cursor.com/docs/skills|g' "$OUT/rules/maister-workflows.mdc"
sedi 's|https://code.claude.com/docs/en/plugins-reference|https://cursor.com/docs/plugins|g' "$OUT/rules/maister-workflows.mdc"
sedi 's|https://code.claude.com/docs/en/sub-agents|https://cursor.com/docs/subagents|g' "$OUT/rules/maister-workflows.mdc"
sedi 's/CLAUDE\.md/AGENTS.md/g' "$OUT/rules/maister-workflows.mdc"

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

## Commands

Use `/maister-*` commands (e.g. `/maister-init`, `/maister-development`).

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

# 12. Overrides (quick-plan, quick-dev, quick-bugfix)
cp "$PLATFORM/overrides/commands/quick-plan.md" "$OUT/commands/quick-plan.md"
cp "$PLATFORM/overrides/commands/quick-dev.md" "$OUT/commands/quick-dev.md"
cp "$PLATFORM/overrides/skills/quick-plan/SKILL.md" "$OUT/skills/quick-plan/SKILL.md"
cp "$PLATFORM/overrides/skills/quick-bugfix/SKILL.md" "$OUT/skills/quick-bugfix/SKILL.md"

# 13. AGENTS.md template for docs-manager
cp "$PLATFORM/templates/agents-md-template.md" "$OUT/skills/docs-manager/references/agents-md-template.md"
sedi 's/claude-md-template\.md/agents-md-template.md/g' "$OUT/skills/docs-manager/SKILL.md"
sedi 's/Manage CLAUDE.md Integration/Manage AGENTS.md Integration/g' "$OUT/skills/docs-manager/SKILL.md"

# Init: add Cursor project rule step
sedi 's/Verify AGENTS.md integration/Verify AGENTS.md integration\
- Create `.cursor\/rules\/maister-docs.mdc` in project root if missing (copy from plugin `rules\/maister-docs.mdc` template — read `.maister\/docs\/INDEX.md` first)/' "$OUT/skills/init/SKILL.md"
cp "$PLATFORM/rules/maister-docs.mdc" "$OUT/rules/maister-docs.mdc"

# standards-discover docs extractor
sedi 's/CLAUDE.md/AGENTS.md/g' "$OUT/skills/standards-discover/references/docs-extractor-prompt.md"
sedi 's/\.claude\/CLAUDE.md/.cursor\/rules/g' "$OUT/skills/standards-discover/references/docs-extractor-prompt.md"

# 14. TodoWrite transforms (Phase 1.5)
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
  "$OUT/skills/orchestrator-framework"
  "$OUT/skills/development"
  "$OUT/skills/product-design"
  "$OUT/skills/performance"
  "$OUT/skills/migration"
  "$OUT/skills/research"
  "$OUT/skills/init"
  "$OUT/skills/standards-discover"
  "$OUT/skills/implementation-verifier"
  "$OUT/skills/implementation-plan-executor"
  "$OUT/agents"
  "$OUT/rules/maister-workflows.mdc"
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

# Progress tracking section title in rules
sedi 's/Progress Tracking with Task System/Progress Tracking with TodoWrite/g' "$OUT/rules/maister-workflows.mdc"
sedi 's/metadata: {restored: true}/(restored from state — mark completed)/g' "$OUT/skills/orchestrator-framework/references/orchestrator-patterns.md"

# Cursor-specific TodoWrite examples
if [ -f "$PLATFORM/patches/orchestrator-patterns-todowrite.md" ]; then
  cat "$PLATFORM/patches/orchestrator-patterns-todowrite.md" >> "$OUT/skills/orchestrator-framework/references/orchestrator-patterns.md"
fi

echo "Built Cursor Agent variant at $OUT"
