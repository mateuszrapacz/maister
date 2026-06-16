# Kilo CLI — Maister Support

Maister ships a **Kilo CLI** variant (`plugins/maister-kilo/`) built from the same source as Claude Code (`plugins/maister/`). The build pipeline lives in `platforms/kilo-cli/build.sh`.

Related docs:

- [Cursor Agent Support](cursor-agent-support.md) — shared multi-platform architecture
- [README — Kilo CLI section](../README.md#kilo-cli) — quick install

---

## Prerequisites

- [Kilo Code](https://kilocode.ai) CLI installed (`kilo --version`)
- Repository cloned; run builds from repo root

---

## Install

### Build the plugin

```bash
make build-kilo
```

### Project-local install (default)

Copies `.kilo/` directory (skills, agents, rules), `AGENTS.md`, and `kilo.json` into the target project:

```bash
bash platforms/kilo-cli/smoke-install.sh
```

Or target a specific directory:

```bash
bash platforms/kilo-cli/smoke-install.sh /path/to/project
```

### Global install

Merges skills/agents/rules into `~/.kilo/` so they're available in every project without per-project setup:

```bash
bash platforms/kilo-cli/smoke-install.sh --global
```

### Uninstall (project-local)

Remove the installed files manually:

```bash
rm -rf .kilo/skills/maister-* .kilo/skills/{development,init,research,migration,performance,quick-*}
rm -rf .kilo/agents/maister-*
rm -f .kilo/rules/maister-workflows.md .kilo/rules/maister-docs.md
```

---

## Daily use

### Start a session

From your **project directory**:

```bash
kilo
```

Then invoke skills directly in the Kilo chat:

```
/maister-init
/maister-development Add user profile page with avatar upload
/maister-quick-plan Refactor auth module
```

### Skill invocation

Kilo uses skill names directly (no `@prompts` like Kiro). Skills are in `.kilo/skills/` and invoked by slash command matching the directory name:

| Command | Purpose |
|---------|---------|
| `/maister-init` | Initialize framework |
| `/maister-development` | Features, bugs, enhancements |
| `/maister-research` | Technical research |
| `/maister-performance` | Bottleneck analysis |
| `/maister-migration` | Technology migrations |
| `/maister-quick-plan` | Lightweight planning |
| `/maister-quick-dev` | Direct implementation |
| `/maister-quick-bugfix` | TDD-driven bug fix |

### Subagents

Subagents live in `.kilo/agents/maister-*.md`. The orchestrator delegates to them automatically, or invoke directly:

```
@maister-gap-analyzer
@maister-code-reviewer
```

---

## Build architecture

`platforms/kilo-cli/build.sh` transforms the core plugin:

1. Global `maister:` → `maister-` replacement (Kilo uses `-` not `:`)
2. Commands merged into `.kilo/skills/` (Kilo has no separate commands concept)
3. Skills moved to `.kilo/skills/`
4. Agents transformed to `.kilo/agents/` with Kilo frontmatter (permissions, mode)
5. `CLAUDE.md` → `.kilo/rules/maister-workflows.md`
6. `AskUserQuestion` → chat-native gate markers
7. Skill frontmatter `name:` enforced to match directory name

### Key differences from Claude Code variant

| Aspect | Claude Code (`maister`) | Kilo (`maister-kilo`) |
|--------|------------------------|----------------------|
| Config | `.claude-plugin/plugin.json` | `kilo.json` |
| Instructions | `CLAUDE.md` | `AGENTS.md` + `.kilo/rules/*.md` |
| Skills | `skills/` | `.kilo/skills/` |
| Agents | `agents/` | `.kilo/agents/` |
| Commands | `commands/` | merged into `.kilo/skills/` |
| Separator | `:` (e.g. `/maister:init`) | `-` (e.g. `/maister-init`) |
| User questions | `AskUserQuestion` tool | Chat gate (present in chat, wait for reply) |

---

## Smoke test

```bash
bash platforms/kilo-cli/smoke-cli.sh
```

Verifies:
1. Plugin structure (`.kilo/` directory exists with expected contents)
2. Skill detection (`maister-init` skill present)
3. Agent detection (subagents in `.kilo/agents/`)
4. Config validity (`kilo.json` parseable)
