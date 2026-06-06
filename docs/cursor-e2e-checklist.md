# Cursor Agent — E2E Checklist (Faza 3)

Manual verification after `make build-cursor` and local install.

## Setup

```bash
make build-cursor
cp -r plugins/maister-cursor ~/.cursor/plugins/local/maister-cursor
# Developer: Reload Window
```

Use a **fresh test project** (or disposable branch) for each full run.

## Scenarios

| # | Scenariusz | Kroki | OK |
|---|------------|-------|-----|
| 1 | Init | `/maister-init` → pełny flow | ☑ CLI 2026-06-06 |
| 1a | Artefakty init | `AGENTS.md` zawiera sekcję Maister; `.cursor/rules/maister-docs.mdc` istnieje | ☑ CLI |
| 2 | Development | `/maister-development "mała feature"` → TodoWrite pokazuje fazy | ☐ |
| 2a | Gates | AskQuestion na mandatory gates | ☐ |
| 3 | Resume | `[task-path] [--from=PHASE]` po przerwaniu | ☐ |
| 4 | Parallel waves | development bez `--sequential` — równoległe implementery | ☐ |
| 5 | Custom agent | Task `subagent_type: "maister-gap-analyzer"` → poprawny agent | ☑ CLI |
| 6 | Quick plan | `/maister-quick-plan "..."` → plan w `.maister/plans/` + gate | ☑ CLI |
| 6b | Quick bugfix | `/maister-quick-bugfix "..."` → plan + TDD red/green | ☑ CLI 2026-06-06 |
| 7 | E2E MCP | `/maister-development "... --e2e"` (MCP włączone) | ☐ opcjonalny |
| 8 | Task tool CLI | Task tool w Cursor CLI | ☑ agent 2026.06.04 |

## Hooks (Faza 2)

| Hook | Test | OK |
|------|------|-----|
| sessionStart | Nowa sesja → reminder o Skill tool przy `/maister-*` | ☐ |
| preCompact | Workflow w toku → kompaktuj → odczyt `orchestrator-state.yml` | ☐ |
| beforeShellExecution | Subagent + `git reset --hard` → deny | ☐ |

## Smoke (Faza 1)

- ☐ Plugin widoczny w Cursor IDE (opcjonalne)
- ☑ `/maister-init` startuje (CLI `--plugin-dir`)
- ☐ AskQuestion multi-select (init Phase 3) — headless używa domyślnych
- ☑ `mcp.json` — Playwright w bundle (`validate-cursor`)

## Po przejściu

1. Commit `plugins/maister-cursor/` + `platforms/cursor/`
2. Faza 4: merge branch `cursor` → `master` (jeśli używasz branch workflow)
