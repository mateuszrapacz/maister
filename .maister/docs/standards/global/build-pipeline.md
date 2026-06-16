## Build Pipeline

### Source Command Namespace
Source commands use `maister:` prefix in frontmatter `name:` fields. Build scripts transform per platform.

```yaml
# Source (plugins/maister/)
name: maister:development
```

### Flat Command Layout
Command markdown files must live directly under `commands/` with no nested subdirectories.

### Copilot Command Naming
Copilot variant: no colons in `name:`, no `maister-` prefix, no `maister:` references anywhere.

### Cursor Command Naming
Cursor variant: `maister-` hyphenated names, no colons, no `maister:` references.

```yaml
# Cursor variant
name: maister-development
```

### Cursor Agent Naming
Cursor agent frontmatter must use `maister-` prefix (e.g., `name: maister-gap-analyzer`).

### Platform Instruction File Mapping
Source uses `CLAUDE.md`. Copilot uses `.github/copilot-instructions.md`. Cursor uses `AGENTS.md`.

### Cursor Manifest Layout
Cursor plugin ships `.cursor-plugin/plugin.json` with skills, agents, commands, hooks paths. No `.claude-plugin/`.

### Cursor MCP File Location
Cursor uses `mcp.json` at plugin root. Legacy `.mcp.json` must not remain after build.

### Cursor Hooks Contract
`hooks.json` version 1 with beforeShellExecution, preCompact, sessionStart, subagentStart, subagentStop. Timeouts 5-10s.

### Destructive Shell Command Guard
Block destructive git/fs commands (stash, reset --hard, checkout ., clean, push --force, rm -rf) from subagents unless whitelisted.

### No Multi-Select In Copilot Skills
Copilot skills must not reference multi-select UI patterns.

### Cursor-Specific API Bans
Cursor variant must not reference EnterPlanMode/ExitPlanMode, capitalized Explore, or TaskCreate/TaskUpdate.

### Kiro Command Naming
Kiro variant: `maister-` hyphenated skill names, no colons, no `maister:` references. Slash invocation uses `/maister-*`.

```yaml
# Kiro variant (skills/maister-development/SKILL.md)
name: maister-development
```

### Kiro Agent Layout
Kiro agents ship as JSON (`agents/maister-<stem>.json`) with instructions in `agents/instructions/maister-<stem>.md`. Orchestrator `agents/maister.json` references all skills via `skill://.kiro/skills/maister-*/SKILL.md`. Source `agents/*.md` is removed from output after JSON generation.

### Kiro Instruction File Mapping
Init creates `AGENTS.md` (project) and `.kiro/steering/maister-docs.md` (steering). No `CLAUDE.md` or `.cursor-plugin/` in output.

### Kiro Hooks Contract
Hooks embedded in `agents/maister.json`: `userPromptSubmit`, `preToolUse`, `postToolUse`, `agentSpawn`. No `preCompact` equivalent — document compaction gap; use `orchestrator-state.yml` + `@resume`.

### Kiro-Specific API Bans
Kiro variant must not reference AskUserQuestion, AskQuestion, EnterPlanMode/ExitPlanMode, capitalized Explore, TaskCreate/TaskUpdate, or Claude/Cursor-only tool names. Interactive gates use **CHAT GATE** markers; headless builds apply documented defaults from `transforms/askuser-to-chat-gate.md`.

### Never Edit maister-kiro Output
Do not manually modify `plugins/maister-kiro/`. Edit `plugins/maister/` or `platforms/kiro-cli/` and rebuild with `make build-kiro`.

### Bash Fail-Fast
Shell scripts use `set -e`. Install/smoke scripts use `set -euo pipefail`.

```bash
set -euo pipefail
```

### Cross-Platform sed
Use portable `sedi()` wrapper for in-place sed (macOS `sed -i ''` vs Linux `sed -i`).

### CI Build and Validate Gate
All CI pipelines run `make build && make validate` before publishing or committing generated artifacts.

### Auto-Rebuild Copilot Variant
Pushes to master touching `plugins/maister/**` or `platforms/**` trigger Copilot variant rebuild and auto-commit.

### Tag-Triggered Release
Production releases gated on `v*` tags with build, validate, and GitHub release notes.

### Git Ignore Local Artifacts
Do not commit `.DS_Store`, `.idea/`, `.claude/settings.local.json`, `.maister/`, `/.worktrees/`.
