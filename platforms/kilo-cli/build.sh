#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE="$ROOT/plugins/maister"
OUT="$ROOT/plugins/maister-kilo"

sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

echo "Building Kilo CLI variant..."
rm -rf "$OUT"
cp -r "$CORE" "$OUT"

# 0. Remove Claude Code artifacts that don't apply to Kilo
rm -rf "$OUT/.claude-plugin"

# 1. Global transform: maister: -> maister-
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/maister:/maister-/g' "$f"
done

# 2. Merge commands into skills (Kilo uses skills for all invocable workflows)
if [ -d "$OUT/commands" ]; then
  find "$OUT/commands" -name "*.md" | while read -r f; do
    skill_name=$(grep -m1 '^name: ' "$f" | sed 's/^name: //' | tr -d '\r')
    if [ -z "$skill_name" ]; then
      skill_name="maister-$(basename "$f" .md)"
    fi
    target_dir="$OUT/.kilo/skills/$skill_name"
    mkdir -p "$target_dir"
    mv "$f" "$target_dir/SKILL.md"
  done
  rm -rf "$OUT/commands"
fi

# 3. Move existing skills to .kilo/skills
mkdir -p "$OUT/.kilo/skills"
if [ -d "$OUT/skills" ]; then
  find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d | while read -r dir; do
    dir_name=$(basename "$dir")
    mv "$dir" "$OUT/.kilo/skills/$dir_name"
  done
  rmdir "$OUT/skills" 2>/dev/null || true
fi

# 4. Enforce Kilo skill naming rule: name in frontmatter MUST match directory name
find "$OUT/.kilo/skills" -mindepth 2 -name "SKILL.md" | while read -r f; do
  dir_name=$(basename "$(dirname "$f")")
  sedi "s/^name: .*/name: $dir_name/" "$f"
done

# 5. Transform agents to Kilo format (.kilo/agents/*.md)
mkdir -p "$OUT/.kilo/agents"
if [ -d "$OUT/agents" ]; then
  find "$OUT/agents" -name "*.md" | while read -r f; do
    filename=$(basename "$f")
    agent_name="${filename%.md}"
    
    # Determine permission based on agent name heuristics
    if [[ "$agent_name" == "docs-operator" ]]; then
      # docs-operator performs file operations via the docs-manager skill
      perms="  edit: allow
  bash: ask"
    elif [[ "$agent_name" == "advisor" ]] || [[ "$agent_name" == *"analyzer"* ]] || [[ "$agent_name" == *"checker"* ]] || [[ "$agent_name" == *"auditor"* ]] || [[ "$agent_name" == *"reporter"* ]]; then
      perms="  edit: deny
  bash: deny"
    else
      perms="  edit: allow
  bash: ask"
    fi

    # Extract description from existing content
    desc=$(head -30 "$f" | grep -i -m1 -E '^(Purpose|Description):' | sed 's/^[^:]*: *//' | tr -d '\r' | head -c 200)
    if [ -z "$desc" ]; then
      desc="Maister subagent: $agent_name"
    fi
    
    # Strip original frontmatter (everything up to and including the second '---')
    # and append to new file with Kilo frontmatter
    {
      echo "---"
      echo "description: \"$desc\""
      echo "mode: subagent"
      echo "permission:"
      echo "$perms"
      echo "---"
      echo ""
      # Use awk to skip the first frontmatter block
      awk 'BEGIN{in_fm=1; dashes=0} 
           /^---/{dashes++; if(dashes==2){in_fm=0; next}} 
           !in_fm{print}' "$f"
    } > "$OUT/.kilo/agents/maister-$agent_name.md"
  done
  rm -rf "$OUT/agents"
fi

# 6. Replace CLAUDE.md references with AGENTS.md
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/CLAUDE\.md/AGENTS.md/g' "$f"
done

# 7. Kilo adapter mapping:
#    - source agents/advisor.md becomes .kilo/agents/maister-advisor.md and is
#      invoked with @maister-advisor for both advisor and arbiter calls;
#    - AskUserQuestion/AskQuestion/ask_user become chat gates;
#    - the orchestrator owns writes/resume reads of orchestrator-state.yml;
#    - automatic answer injection is unsupported until E2E proves it, so
#      fully_automatic uses interactive chat fallback or persists blocked.
# 8. Transform AskUserQuestion to chat-native gates (in all relevant files)
find "$OUT" -type f \( -name "*.md" -o -name "*.sh" -o -name "*.json" \) | while read -r f; do
  sedi 's/AskUserQuestion/→ **CHAT GATE** — Present the question in chat and wait for user response/g' "$f"
  sedi 's/AskQuestion/→ **CHAT GATE** — Present the question in chat and wait for user response/g' "$f"
  sedi 's/ask_user/→ **CHAT GATE** — Present the question in chat and wait for user response/g' "$f"
done

# 8. Generate AGENTS.md integration snippet
cat > "$OUT/AGENTS.md" << 'EOF'
# Agent Instructions

## Maister Workflows
This project uses the maister plugin for structured development workflows. 

### Available Skills
Skills are located in `.kilo/skills/maister-*/SKILL.md`. Invoke them by describing the task, and the agent will load the appropriate skill.

### Available Subagents
Subagents are located in `.kilo/agents/maister-*.md`. Invoke them via `@maister-<agent-name>` or let the orchestrator delegate to them.

### Key Workflows
- **Development**: Invoke the `maister-development` skill for features, bug fixes, and enhancements.
- **Research**: Invoke the `maister-research` skill for technical investigation.
- **Quick Bugfix**: Invoke the `maister-quick-bugfix` skill for TDD-driven quick fixes.

**Critical Principle**: Always read `.maister/docs/INDEX.md` before starting work to understand project context and standards.
EOF

# 9. Generate kilo.json template
cat > "$OUT/kilo.json" << 'EOF'
{
  "$schema": "https://app.kilo.ai/config.json",
  "instructions": [
    "AGENTS.md",
    ".kilo/rules/*.md",
    ".maister/docs/INDEX.md"
  ],
  "permission": {
    "bash": "ask",
    "read": "allow",
    "edit": "allow",
    "webfetch": "ask"
  }
}
EOF

# 10. Move CLAUDE.md to .kilo/rules/maister-workflows.md
mkdir -p "$OUT/.kilo/rules"
if [ -f "$OUT/CLAUDE.md" ]; then
  mv "$OUT/CLAUDE.md" "$OUT/.kilo/rules/maister-workflows.md"
  sedi 's/CLAUDE\.md/AGENTS.md/g' "$OUT/.kilo/rules/maister-workflows.md"
fi

# 11. Generate maister-docs.md rule (INDEX.md awareness)
cat > "$OUT/.kilo/rules/maister-docs.md" << 'EOF'
# Maister Documentation

Before starting any task, read `.maister/docs/INDEX.md` first. It indexes coding standards, project vision, tech stack, and architecture decisions.

Follow standards in `.maister/docs/standards/` when writing code. If standards conflict with the task, ask the user.
EOF

# 12. Fix platform identity in maister-workflows.md (Claude Code -> Kilo Code)
if [ -f "$OUT/.kilo/rules/maister-workflows.md" ]; then
  sedi 's/for Claude Code projects/for Kilo Code projects/g' "$OUT/.kilo/rules/maister-workflows.md"
  sedi 's/Claude Code lifecycle events/lifecycle events/g' "$OUT/.kilo/rules/maister-workflows.md"
  sedi 's/(auto-discovered by Claude Code)//g' "$OUT/.kilo/rules/maister-workflows.md"
fi

echo "Built Kilo CLI variant at $OUT"
