# Research Brief: Wsparcie kiro-cli dla Maister

**Created:** 2026-06-07  
**Research type:** Mixed (technical + literature)

## Research Question

Jak przygotować implementację wsparcia **kiro-cli** w repozytorium Maister, wzorując się na istniejących wariantach platformowych (**Claude Code** jako source of truth, **Copilot CLI**, **Cursor Agent**)?

## Scope

### Included

- Architektura multi-platformy: `plugins/maister` → `platforms/kiro-cli/build.sh` → `plugins/maister-kiro`
- Mapowanie API Kiro CLI (skills, agents, hooks, steering, MCP, subagents, slash commands) na transformacje build pipeline
- Infrastruktura: Makefile, validate, smoke scripts, CI, dystrybucja
- Transformacje nazw, narzędzi agenta (`AskUserQuestion`, Task/Todo, plan mode, Explore)
- Integracja z workflow Maister (`init`, orchestratory, docs-manager → AGENTS.md / steering)
- Decyzje już podjęte w `docs/cursor-agent-support.md` (punkt 15–16: kiro ten sam wzorzec)

### Excluded

- Implementacja kodu (to będzie osobny workflow `/maister-development`)
- Pełna migracja z Amazon Q Developer CLI (poza mapowaniem różnic istotnych dla Maister)
- Kiro IDE (poza elementami współdzielonymi z CLI)
- Publiczny marketplace Kiro (jeśli nie istnieje odpowiednik Cursor marketplace)

### Constraints

- **Nigdy nie edytować ręcznie** `plugins/maister-kiro/` — tylko generować przez `make build-kiro`
- Source of truth pozostaje w `plugins/maister/`
- Zachować spójność z istniejącymi standardami: `.maister/docs/standards/global/build-pipeline.md`, `plugin-development.md`
- Wzorować się na `platforms/cursor/build.sh` (najnowszy, najbardziej kompletny wariant) i `platforms/copilot-cli/build.sh`

## Success Criteria

1. Jasna mapa transformacji Claude Code → Kiro CLI (tabela jak w `cursor-agent-support.md`)
2. Lista plików/katalogów do utworzenia (`platforms/kiro-cli/`, `plugins/maister-kiro/`, Makefile targets)
3. Identyfikacja luk API (brak odpowiednika Cursor plugin marketplace, różnice hooks, agents jako JSON vs MD)
4. Rekomendowany plan faz implementacji (MVP → polish → E2E)
5. Ryzyka i otwarte pytania z poziomem pewności

## Research Type Rationale

- **Technical**: analiza istniejącego pipeline Copilot/Cursor w repo
- **Literature**: dokumentacja Kiro CLI (skills, custom agents, hooks, steering, subagents)
- **Mixed**: łączy oba źródła w actionable plan implementacji

## Project Documentation Paths

From `.maister/docs/INDEX.md`:

- `.maister/docs/project/tech-stack.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/global/plugin-development.md`
- `.maister/docs/standards/global/conventions.md`
- `.maister/docs/standards/testing/test-writing.md`
- `docs/cursor-agent-support.md`
- `docs/cursor-agent-implementation-plan.md`
- `docs/cursor-e2e-checklist.md`
- `copilot-cli-issues.md`
