# Research Sources: Wsparcie kiro-cli dla Maister

**Created:** 2026-06-07  
**Research question:** Jak przygotować implementację wsparcia kiro-cli analogicznie do Cursor, Copilot i Claude Code?

---

## Codebase Sources

### Platform Build Pipeline (primary reference)

| Path | Relevance |
|------|-----------|
| `platforms/cursor/build.sh` | **Główny wzorzec** — 14 kroków transformacji, overrides, TodoWrite, hooks, rules |
| `platforms/copilot-cli/build.sh` | Wzorzec strip prefix, usunięcie hooks, `ask_user`, copilot-instructions |
| `platforms/cursor/smoke-cli.sh` | Smoke test CLI — adaptacja na `kiro-cli chat --no-interactive` |
| `platforms/cursor/smoke-install.sh` | Local install pattern — adaptacja na `~/.kiro/` |
| `platforms/cursor/hooks/hooks.json` | Format hooków Cursor — porównanie z Kiro hooks w agent JSON |
| `platforms/cursor/hooks/*.sh` | Skrypty: block-destructive, post-compact, skill-invocation, subagent tracker |
| `platforms/cursor/overrides/commands/quick-plan.md` | Override plan mode — reuse dla Kiro |
| `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` | Override quick-bugfix — reuse dla Kiro |
| `platforms/cursor/templates/agents-md-template.md` | Template AGENTS.md dla init |
| `platforms/cursor/rules/maister-docs.mdc` | Cursor rules — Kiro odpowiednik: steering file |
| `platforms/cursor/transforms/task-to-todo.md` | Semantyka TaskCreate→TodoWrite — adapt na `todo` tool |
| `platforms/cursor/patches/orchestrator-patterns-todowrite.md` | Przykłady TodoWrite — adapt na Kiro todo |

### Build Orchestration & CI

| Path | Relevance |
|------|-----------|
| `Makefile` | Targets: `build`, `build-copilot`, `build-cursor`, `validate-*`, `clean-*`, `watch` — wzorzec dla `build-kiro` |
| `.github/workflows/build-copilot.yml` | Auto-rebuild + commit generated variant — wzorzec CI dla kiro |
| `.github/workflows/release.yml` | `make build && make validate` gate |
| `.claude-plugin/marketplace.json` | Marketplace Claude — brak odpowiednika Kiro (gap) |
| `.cursor-plugin/marketplace.json` | Cursor marketplace (local/GH) — analogia dystrybucji |

### Source Plugin (Claude Code — edit only here)

| Path | Relevance |
|------|-----------|
| `plugins/maister/` | **Source of truth** — nigdy nie edytować platform-specific w core |
| `plugins/maister/.claude-plugin/plugin.json` | Manifest źródłowy — wzorzec wersji/branding |
| `plugins/maister/.mcp.json` | Playwright MCP — mapowanie na Kiro MCP path |
| `plugins/maister/CLAUDE.md` | Plugin documentation — transform na steering/README |
| `plugins/maister/hooks/hooks.json` | Claude hooks (SessionStart, PreToolUse) — mapowanie na Kiro |
| `plugins/maister/hooks/*.sh` | Hook scripts — adaptacja matcherów i env vars |
| `plugins/maister/skills/**/SKILL.md` | 14 skills — główny payload dla `.kiro/skills/` |
| `plugins/maister/agents/*.md` | 24 agents — **konwersja MD → JSON** |
| `plugins/maister/commands/*.md` | 8 commands — merge do skills lub osobne skill entries |
| `plugins/maister/CLAUDE.md` | Plugin principles — sekcja Platform: Kiro |

### Generated Variants (read-only — pattern reference)

| Path | Relevance |
|------|-----------|
| `plugins/maister-cursor/` | Najnowszy generated output — target structure comparison |
| `plugins/maister-copilot/` | Copilot output — strip-prefix pattern |
| `plugins/maister-cursor/.cursor-plugin/plugin.json` | Manifest layout — Kiro likely has no equivalent |
| `plugins/maister-cursor/mcp.json` | MCP po transformacji |
| `plugins/maister-cursor/agents/gap-analyzer.md` | Przykład `name: maister-gap-analyzer` po build |

### File Patterns (Glob)

```
platforms/**/*
plugins/maister/**/*
plugins/maister-cursor/**/*
plugins/maister-copilot/**/*
Makefile
.github/workflows/*.yml
docs/cursor*.md
docs/copilot*.md
```

### Grep Patterns (investigate during gathering)

| Pattern | Purpose |
|---------|---------|
| `maister:` | Source namespace — must not appear in kiro variant |
| `AskUserQuestion` | Tool transform target |
| `TaskCreate\|TaskUpdate` | Progress tracking transform |
| `EnterPlanMode\|ExitPlanMode` | Plan mode removal |
| `subagent_type.*Explore` | Explore mapping |
| `Task tool` | Delegation → subagent tool |
| `Skill tool` | Skill invocation semantics |
| `CLAUDE_PLUGIN_ROOT\|CURSOR_PLUGIN_ROOT` | Hook env vars → Kiro equivalent |
| `kiro` | Existing references (currently only in cursor-agent-support.md) |

---

## Project Documentation Sources

| Path | Relevance |
|------|-----------|
| `.maister/docs/INDEX.md` | Discovery entry — tech stack summary |
| `.maister/docs/project/tech-stack.md` | Multi-platform architecture, Makefile targets, CI gaps |
| `.maister/docs/standards/global/build-pipeline.md` | Naming transforms, manifest rules, validate gates |
| `.maister/docs/standards/global/plugin-development.md` | Never edit generated, kebab-case, SKILL.md SOT |
| `.maister/docs/standards/global/conventions.md` | Naming, task artifacts |
| `.maister/docs/standards/testing/test-writing.md` | Structural validate + smoke + E2E approach |
| `docs/cursor-agent-support.md` | **Decyzje grill** #15–16 (kiro ten sam wzorzec), architektura forka |
| `docs/cursor-agent-implementation-plan.md` | Fazy 0–4, status implementacji Cursor — template planu Kiro |
| `docs/cursor-e2e-checklist.md` | Scenariusze E2E — adaptacja na kiro-cli |
| `copilot-cli-issues.md` | Known Copilot issues — lessons for Kiro |
| `CLAUDE.md` (repo root) | Beta branch, manifest files, never edit generated |
| `README.md` | User-facing install docs — sekcja Kiro do dodania |
| `AGENTS.md` (repo root) | Project instructions pattern — Kiro native support |

---

## Kiro CLI Documentation (Literature)

### Documentation Index

| URL | Purpose |
|-----|---------|
| https://kiro.dev/llms.txt | **Master index** — wszystkie strony CLI w formacie .md |

### Core CLI

| URL | Topics |
|-----|--------|
| https://kiro.dev/docs/cli.md | CLI overview |
| https://kiro.dev/docs/cli/installation.md | Install (`curl -fsSL https://cli.kiro.dev/install \| bash`) |
| https://kiro.dev/docs/cli/quick-start.md | First session |
| https://kiro.dev/docs/cli/migrating-from-q.md | Q→Kiro paths: `.kiro/skills`, `.kiro/agents`, `.kiro/steering`, MCP |
| https://kiro.dev/docs/cli/headless.md | `--no-interactive`, `--trust-all-tools` — smoke/E2E |
| https://kiro.dev/docs/cli/reference/cli-commands.md | `kiro-cli` subcommands, integrations |
| https://kiro.dev/docs/cli/reference/settings.md | Settings (`chat.enableTodoList`, `chat.enableDelegate`) |
| https://kiro.dev/docs/cli/reference/built-in-tools.md | `subagent`, `todo`, `read`, `write`, `shell` |
| https://kiro.dev/docs/cli/reference/slash-commands.md | `/skill-name`, `/todo`, `/agent`, `/context` |
| https://kiro.dev/docs/cli/reference/exit-codes.md | CI scripting |

### Skills & Steering

| URL | Topics |
|-----|--------|
| https://kiro.dev/docs/cli/skills.md | `.kiro/skills/<dir>/SKILL.md`, frontmatter `name`/`description`, slash commands |
| https://kiro.dev/docs/cli/steering.md | `.kiro/steering/*.md`, AGENTS.md auto-included |
| https://kiro.dev/docs/skills.md | Shared skills spec (IDE + CLI) |

### Custom Agents & Hooks

| URL | Topics |
|-----|--------|
| https://kiro.dev/docs/cli/custom-agents.md | Agent concepts, tools, permissions |
| https://kiro.dev/docs/cli/custom-agents/creating.md | `/agent create`, `.kiro/agents/` paths |
| https://kiro.dev/docs/cli/custom-agents/configuration-reference.md | **JSON schema**: `tools`, `resources`, `hooks`, `mcpServers`, `includeMcpJson` |
| https://kiro.dev/docs/cli/custom-agents/examples.md | Real-world agent JSON examples |
| https://kiro.dev/docs/cli/custom-agents/troubleshooting.md | Common agent issues |
| https://kiro.dev/docs/cli/hooks.md | Hook types: AgentSpawn, UserPromptSubmit, PreToolUse, PostToolUse, Stop |
| https://kiro.dev/docs/cli/chat/subagents.md | `subagent` tool, `trustedAgents`, `availableAgents`, parallel (max 4) |

### MCP & Experimental

| URL | Topics |
|-----|--------|
| https://kiro.dev/docs/cli/mcp.md | MCP overview |
| https://kiro.dev/docs/cli/mcp/configuration.md | `.kiro/settings/mcp.json` workspace + user paths |
| https://kiro.dev/docs/cli/mcp/examples.md | MCP setup examples |
| https://kiro.dev/docs/cli/mcp/security.md | Security best practices |
| https://kiro.dev/docs/cli/experimental.md | Feature flags overview |
| https://kiro.dev/docs/cli/experimental/todo-lists.md | `todo` tool, `/todo`, `chat.enableTodoList` |
| https://kiro.dev/docs/cli/experimental/delegate.md | Deprecated — use subagents instead |

### Chat & Permissions

| URL | Topics |
|-----|--------|
| https://kiro.dev/docs/cli/chat.md | Chat interaction model |
| https://kiro.dev/docs/cli/chat/permissions.md | Tool approval — maps to `allowedTools` |
| https://kiro.dev/docs/cli/chat/planning-agent.md | Built-in Plan agent — compare with quick-plan override |
| https://kiro.dev/docs/cli/chat/session-management.md | Resume — orchestrator-state.yml compatibility |
| https://kiro.dev/docs/cli/authentication.md | Auth for headless (`KIRO_API_KEY`) |

### IDE-Shared (secondary — only shared concepts)

| URL | Topics |
|-----|--------|
| https://kiro.dev/docs/hooks/types.md | Hook trigger types (IDE format — compare CLI) |
| https://kiro.dev/docs/mcp/configuration.md | Shared MCP concepts |
| https://kiro.dev/docs/migrating-from-q-developer.md | Broader Q migration (IDE + CLI) |

### Third-Party Reference

| URL | Topics |
|-----|--------|
| https://symposium.dev/design/agent-details/kiro.html | Community Kiro hook/agent reference (verify against official docs) |

---

## Configuration Sources

| Path | Relevance |
|------|-----------|
| `plugins/maister/.mcp.json` | Playwright MCP source config |
| `plugins/maister-cursor/mcp.json` | Post-transform MCP — target format reference |
| `plugins/maister/hooks/hooks.json` | Claude hook events and matchers |
| `platforms/cursor/hooks/hooks.json` | Cursor hook events — intermediate mapping |

### Kiro Configuration Paths (from migration docs)

| Config | Workspace | User |
|--------|-----------|------|
| Skills | `.kiro/skills/` | `~/.kiro/skills/` |
| Agents | `.kiro/agents/*.json` | `~/.kiro/agents/` |
| Steering | `.kiro/steering/` | `~/.kiro/steering/` |
| MCP | `.kiro/settings/mcp.json` | `~/.kiro/settings/mcp.json` |
| Settings | — | `~/.kiro/settings/cli.json` |

---

## External / Gap Sources (no direct equivalent yet)

| Concept | Claude/Cursor | Kiro | Notes |
|---------|---------------|------|-------|
| Plugin manifest | `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` | **None identified** | Research: packaging as install tree |
| Plugin marketplace | Claude marketplace, Cursor local/GH | **None identified** | Local install to `~/.kiro/` likely |
| `--plugin-dir` | Cursor `agent --plugin-dir` | **None identified** | Headless + workspace/global paths |
| Commands directory | `commands/*.md` flat | Skills only (slash commands) | Merge commands → skills? |
| Agents format | `agents/*.md` YAML frontmatter | `agents/*.json` | **MD→JSON generator required** |
| Hooks location | `hooks/hooks.json` standalone | `hooks` field in agent JSON | Embed in orchestrator agent |
| Rules | `.cursor/rules/*.mdc` | `.kiro/steering/*.md` | init creates steering not rules |
| Built-in explore | Cursor `explore` subagent | No direct equivalent | Custom agent or code-intelligence |
| Progress tracking | TaskCreate / TodoWrite | `todo` (experimental) | Feature flag required |

---

## Test & Validation Sources

| Path / Command | Purpose |
|----------------|---------|
| `make validate-cursor` | Template for `validate-kiro` grep checks (20+ rules) |
| `make validate-copilot` | Additional naming checks |
| `platforms/cursor/smoke-cli.sh` | 3-test smoke pattern |
| `docs/cursor-e2e-checklist.md` | 6+ E2E scenarios |
| `kiro-cli chat --no-interactive --trust-all-tools` | Headless smoke invocation |
| `kiro-cli settings chat.enableTodoList true` | Enable todo for orchestrator tests |

---

## Source Priority

When findings conflict, resolve in this order:

1. **Official Kiro CLI docs** (`kiro.dev/docs/cli/`)
2. **Implemented Cursor pipeline** (`platforms/cursor/build.sh` + generated `maister-cursor/`)
3. **Project standards** (`.maister/docs/standards/global/`)
4. **Planning decisions** (`docs/cursor-agent-support.md` grill table)
5. **Copilot pipeline** (fallback for simpler transforms)
6. **Third-party references** (symposium.dev — verify only)

---

## Gatherer → Source Mapping

| Gatherer category | Primary sources from this manifest |
|-------------------|-----------------------------------|
| `codebase-build` | Platform build pipeline, Makefile, CI, generated variants |
| `codebase-source` | `plugins/maister/**`, orchestrator-framework references |
| `kiro-skills-steering` | Kiro skills, steering, slash commands docs |
| `kiro-agents-hooks` | Custom agents JSON, hooks docs, Claude/Cursor hook files |
| `kiro-tools-mcp` | Built-in tools, MCP, experimental todo, headless, Q migration |
| `planning-decisions` | cursor-agent-support, implementation-plan, e2e-checklist, tech-stack |
