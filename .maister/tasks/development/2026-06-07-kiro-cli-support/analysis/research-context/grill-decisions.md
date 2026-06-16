# Grill Decisions: Kiro CLI Support for Maister

**Session:** 2026-06-07  
**Task:** `.maister/tasks/research/2026-06-07-kiro-cli-support/`  
**Status:** Accepted — overrides conflicting research/convergence choices where noted

---

## Summary

Maister on Kiro CLI is a **dedicated custom agent `maister`**, installed into an **isolated `KIRO_HOME` profile** (`~/.kiro-maister`) with **standard Kiro directory layout**. Users invoke via wrapper `maister-kiro chat --agent maister`, **slash commands**, **natural language**, and **@prompts** for workflow meta-commands. Build output `plugins/maister-kiro/` **mirrors** the install layout 1:1.

---

## Decisions (chronological)

| # | Topic | Decision | Overrides research? |
|---|-------|----------|---------------------|
| 1 | Entry point | Custom agent `maister`; optional default at install; without default → manual `/agent swap` or `--agent maister` | ADR-004 naming |
| 2 | Agent name | **`maister`** (`agents/maister.json`), not `maister-orchestrator` | Yes |
| 3 | Default agent install | **C:** `--set-default` / `--no-default` flags; interactive prompt if no flag; **default answer N** | — |
| 4 | Install merge | Superseded by **KIRO_HOME** isolated profile (no merge into user `~/.kiro/`) | ADR-001 partial |
| 5 | Workflow invocation | **C:** slash `/maister-*` + NL + **@prompts** layer | — |
| 6 | @prompt vocabulary | **B+D:** `@init`, `@dev`, `@research`, `@plan`, `@design`, `@status`, `@next`, `@resume`, `@bye` | New |
| 7 | @plan scope | `@plan` → `quick-plan`; `@design` → `product-design`; bugfix/migration/performance/reviews → slash only in MVP | New |
| 8 | @prompt storage | **A:** flat `prompts/dev.md` under **KIRO_HOME** → invoke `@dev` | Under KIRO_HOME not ~/.kiro |
| 9 | Agent instruction files | **`agents/instructions/`** (not `agents/prompts/`) — avoids collision with Kiro `@prompts` | Yes |
| 10 | Progress / todo | **C:** `todo` transform **from Fase 1** (full Cursor parity), not deferred Fase 1.5 | Yes (was 2B) |
| 11 | CI smoke | **A:** hybrid — ephemeral workspace + **`KIRO_HOME`** temp dir; `maister-kiro` wrapper | ADR-001 |
| 12 | Single-folder bundle | **Rejected** — Kiro requires separate `agents/`, `skills/`, `prompts/` under Kiro root; @prompts and slash skills do not work from inside `agents/maister/` only | New |
| 13 | Install root | **A:** `KIRO_HOME=~/.kiro-maister` dedicated profile | Yes |
| 14 | Daily UX | **D:** wrapper script `maister-kiro` + optional `--set-alias` in `smoke-install` | New |
| 15 | Init steering | **B:** `KIRO_HOME` = plugin global; `maister-init` creates **`project/.kiro/steering/maister-docs.md`** + `AGENTS.md` + `.maister/` | — |
| 16 | Build output layout | **A:** `plugins/maister-kiro/` **mirrors** `KIRO_HOME` layout exactly | Yes |
| 17 | Lifecycle | **A:** `smoke-install.sh` (idempotent overwrite) + **`smoke-uninstall.sh`** | New |
| 18 | Hooks layout | **A:** `agents/maister.json` + **`hooks/` at profile root**; JSON uses `../hooks/*.sh` | Yes |

---

## Target layout (`KIRO_HOME` / `plugins/maister-kiro/`)

```
~/.kiro-maister/                    # KIRO_HOME
├── agents/
│   ├── maister.json                # main agent; hooks → ../hooks/
│   ├── maister-gap-analyzer.json   # + 23 other subagents (flat)
│   └── instructions/
│       └── maister-*.md            # subagent bodies (file://./instructions/...)
├── skills/                         # 22× maister-* (14 skills + 8 merged commands)
├── prompts/                        # @init, @dev, @research, @plan, @design, @status, @next, @resume, @bye
├── steering/
│   └── maister-workflows.md
├── hooks/
│   ├── block-destructive-commands-kiro.sh
│   └── ...
└── settings/
    └── mcp.json                    # Playwright MCP
```

**Project (after `maister-init`):**

```
project/
├── AGENTS.md
├── .maister/
└── .kiro/steering/maister-docs.md   # workspace steering (overrides global per Kiro precedence)
```

---

## User workflow

```bash
# Install
bash platforms/kiro-cli/smoke-install.sh          # optional: --set-default, --set-alias, --no-default

# Daily use
maister-kiro chat --agent maister
> @dev
> /maister-development "feature X"
> @status
> @resume .maister/tasks/development/...
```

---

## Kiro constraints (confirmed in grill)

| Expectation | Reality |
|-------------|---------|
| Everything in one `agents/maister/` folder | **No** — @prompts only from `prompts/`; slash skills only from `skills/` |
| `@dev` from bundle inside agent dir | **No** — must be in `KIRO_HOME/prompts/dev.md` |
| `file://` paths | `prompt` vs `resources` may resolve differently ([kiro#7776](https://github.com/kirodotdev/Kiro/issues/7776)) — smoke required |

---

## Deferred / unchanged from research

- Subagents remain **flat** in `agents/*.json` (Kiro discovery)
- `preCompact` hook gap — document only
- Internal skills visible as extra slash commands (5B+5A) — accept in MVP
- bash+jq MD→JSON (6A)
- Base on Cursor `build.sh` (ADR-009)

---

## Documentation updates (grill Q19)

- [x] This file (`planning/grill-decisions.md`)
- [x] `outputs/decision-log.md` — ADR-010+
- [x] `outputs/high-level-design.md` — grill alignment section + key path updates

---

*Consumable by `/maister-development` — grill decisions take precedence over pre-grill research where marked "Overrides".*
