# Research Plan: Wsparcie kiro-cli dla Maister

**Created:** 2026-06-07  
**Research type:** Mixed (technical + literature)  
**Task path:** `.maister/tasks/research/2026-06-07-kiro-cli-support/`

## Research Overview

### Research Question

Jak przygotować implementację wsparcia **kiro-cli** w repozytorium Maister, wzorując się na istniejących wariantach platformowych (**Claude Code** jako source of truth, **Copilot CLI**, **Cursor Agent**)?

### Research Type Classification

| Dimension | Classification | Rationale |
|-----------|----------------|-----------|
| Primary | **Technical** | Analiza istniejącego pipeline `platforms/cursor/build.sh`, `Makefile`, validate, smoke — wzorzec do skopiowania |
| Secondary | **Literature** | Oficjalna dokumentacja Kiro CLI (skills, agents JSON, hooks w konfiguracji agenta, steering, subagents, MCP) |
| Combined | **Mixed** | Synteza: mapa transformacji Claude Code → Kiro + plan faz implementacji + identyfikacja luk API |

### Scope Boundaries

**Included:**
- Architektura: `plugins/maister` → `platforms/kiro-cli/build.sh` → `plugins/maister-kiro`
- Mapowanie API Kiro na transformacje build pipeline
- Infrastruktura: Makefile, validate, smoke, CI
- Transformacje narzędzi (`AskUserQuestion`, Task/subagent, TaskCreate/todo, plan mode, Explore)
- Integracja workflow Maister (`init`, orchestratory, docs-manager → AGENTS.md / steering)
- Decyzje z `docs/cursor-agent-support.md` (pkt 15–16)

**Excluded:**
- Implementacja kodu (osobny workflow `/maister-development`)
- Pełna migracja z Amazon Q Developer CLI (poza mapowaniem różnic istotnych)
- Kiro IDE (poza elementami współdzielonymi z CLI)
- Publiczny marketplace Kiro (jeśli brak odpowiednika Cursor marketplace)

**Constraints:**
- Nigdy nie edytować ręcznie `plugins/maister-kiro/` — tylko `make build-kiro`
- Source of truth: `plugins/maister/`
- Standardy: `build-pipeline.md`, `plugin-development.md`
- Wzorzec referencyjny: `platforms/cursor/build.sh` (najnowszy, najbardziej kompletny)

### Sub-Questions

1. **Packaging:** Jak zamodelować `plugins/maister-kiro/` bez `.claude-plugin`/`.cursor-plugin` — czy instalacja to kopia do `~/.kiro/` (skills + agents JSON + mcp.json)?
2. **Agenci:** Jak przekonwertować 24 pliki `agents/*.md` (YAML frontmatter + markdown prompt) na `.kiro/agents/*.json`?
3. **Hooks:** Jak zmapować `hooks/hooks.json` (Claude/Cursor) na pole `hooks` w JSON agenta Kiro (`PreToolUse` → matcher `shell`/`execute_bash`)?
4. **Narzędzia:** `Task` → `subagent`? `TaskCreate`/`TaskUpdate` → experimental `todo` tool? `AskUserQuestion` → jaki odpowiednik w Kiro?
5. **Commands vs skills:** Czy 8 plików `commands/` + user-invocable skills mapują się wyłącznie na skills w `.kiro/skills/` (slash commands), bez osobnego katalogu commands?
6. **Dystrybucja:** Local install (jak Cursor `smoke-install.sh`) vs workspace `.kiro/` — jaka strategia dla smoke/E2E?
7. **CI:** Czy dodać auto-rebuild dla `maister-kiro` (parity z Copilot `build-copilot.yml`)?

---

## Methodology

### Primary Approach

**Reverse-engineering wzorca Cursor + literatura Kiro CLI:**

1. Zdekompilować (analizą) pełny pipeline Cursor jako checklistę kroków build
2. Dla każdego kroku ustalić odpowiednik Kiro lub lukę API
3. Zweryfikować luki w oficjalnej dokumentacji Kiro (`kiro.dev/docs/cli/`)
4. Zsyntetyzować tabelę transformacji (jak w `cursor-agent-support.md`) i plan faz MVP → polish → E2E

### Analysis Framework

| Oś analizy | Pytania | Źródła |
|------------|---------|--------|
| **Struktura artefaktów** | Co kopiować, co generować, co usuwać? | build.sh × 3 platformy, plugin manifests |
| **Nazewnictwo** | `maister:foo` → `maister-foo` (Cursor) czy strip (Copilot)? | Decyzja grill #5, Kiro skill `name` (max 64, kebab) |
| **Format agentów** | MD → JSON: które pola mapować (`tools`, `resources`, `prompt`)? | Kiro agent config reference |
| **Delegacja** | Skill tool vs subagent tool vs wbudowany explore | orchestrator-patterns.md, Kiro subagents docs |
| **Progress tracking** | TaskCreate vs TodoWrite vs Kiro `todo` (experimental) | Cursor transforms, Kiro experimental todo |
| **Kontekst projektu** | CLAUDE.md → AGENTS.md + steering `.kiro/steering/` | init skill, docs-manager |
| **Weryfikacja** | Grep validate + headless smoke | Makefile, smoke-cli.sh |

### Fallback Strategies

- Jeśli brak odpowiednika plugin marketplace → local/global install do `~/.kiro/` (decyzja Cursor #3)
- Jeśli `todo` experimental jest niestabilny → Faza 1 bez progress tracking, Faza 1.5 po włączeniu `chat.enableTodoList`
- Jeśli brak headless plugin-dir → smoke przez workspace `.kiro/` + `kiro-cli chat --no-interactive`
- Jeśli agenci JSON wymagają ręcznej konwersji → generator w `build.sh` (frontmatter + body → JSON)

---

## Research Phases

### Phase 1: Broad Discovery

**Cel:** Zinwentaryzować stan repo i dokumentacji Kiro; potwierdzić brak `platforms/kiro-cli/`.

**Actions:**
- Przeskanować `platforms/`, `Makefile`, `.github/workflows/`
- Policzyć artefakty źródłowe: skills (14), agents (24), commands (8), hooks (3 skrypty)
- Przeczytać `docs/cursor-agent-support.md` decyzje 15–16 i docelowy kształt forka
- Pobrać indeks `https://kiro.dev/llms.txt` — lista stron CLI do głębszej analizy

**Expected outputs:**
- Lista plików do utworzenia (`platforms/kiro-cli/`, `plugins/maister-kiro/`)
- Wstępna hipoteza: Kiro bliżej Cursor (prefix `maister-`, AGENTS.md) niż Copilot (strip prefix)

### Phase 2: Targeted Reading — Build Pipeline

**Cel:** Szczegółowa checklista transformacji z `platforms/cursor/build.sh` (14 kroków).

**Actions:**
- Krok po kroku: manifest, nazwy, Explore, AskQuestion, plan mode, AGENTS.md, MCP, rules, hooks, overrides, init patches, TodoWrite
- Porównać z `platforms/copilot-cli/build.sh` — co Kiro dziedziczy z którego wariantu
- Wyekstrahować wzorce `sedi()`, overrides, patches, templates z `platforms/cursor/`

**Expected outputs:**
- Draft tabeli: Krok Cursor → Krok Kiro → Status (1:1 / adapt / gap)

### Phase 3: Deep Dive — Kiro API Mapping

**Cel:** Mapowanie każdego API Maister na Kiro CLI.

**Focus areas:**

| Maister (Claude) | Kiro CLI (literatura) | Priorytet badania |
|------------------|----------------------|-------------------|
| `plugins/maister/skills/` | `.kiro/skills/<dir>/SKILL.md` | P0 |
| `commands/*.md` | Skills jako slash commands (`/name`) | P0 |
| `agents/*.md` | `.kiro/agents/*.json` | P0 — największa luka formatu |
| `hooks/hooks.json` | `hooks` w JSON agenta orchestratora | P0 |
| `CLAUDE.md` / init | `AGENTS.md` + `.kiro/steering/*.md` | P0 |
| `.mcp.json` | `.kiro/settings/mcp.json` lub `includeMcpJson` | P1 |
| `Task` + subagent_type | `subagent` tool + custom agent name | P0 |
| `Skill` tool | Auto-discovery skills (default agent) vs `skill://` URI | P1 |
| `TaskCreate`/`TaskUpdate` | `todo` tool (experimental) | P1 |
| `AskUserQuestion` | ??? (permissions? interactive chat?) | P0 — do ustalenia |
| `EnterPlanMode` | Własny flow (jak Cursor overrides) | P1 |
| `subagent_type="Explore"` | Brak built-in explore — custom agent lub codebase tools | P1 |

**Expected outputs:**
- Pełna tabela transformacji Claude Code → Kiro CLI
- Lista luk API z poziomem pewności (high/medium/low)

### Phase 4: Infrastructure & Workflow Integration

**Cel:** Makefile targets, validate rules, smoke/headless, CI, init workflow.

**Actions:**
- Zaprojektować `validate-kiro` (grep: brak `maister:`, brak `TaskCreate`, JSON agents valid, skills frontmatter)
- Zaprojektować `smoke-cli.sh` / `smoke-install.sh` wzorowane na Cursor, ale z `kiro-cli chat --no-interactive`
- Przeanalizować `skills/init/SKILL.md` i docs-manager — zmiany dla steering zamiast `.cursor/rules/`
- Ocenić `make build` = copilot + cursor + kiro (decyzja #16)

**Expected outputs:**
- Lista Makefile targets i validate checks (szacunek 15–25 grep rules)
- Scenariusze smoke/E2E (analogia `docs/cursor-e2e-checklist.md`)

### Phase 5: Verification & Synthesis

**Cel:** Spełnić success criteria z research-brief.

**Actions:**
- Cross-reference: czy wszystkie 24 agenty da się wyrazić w JSON (tools whitelist per agent)
- Ocena ryzyk: experimental todo, brak plugin-dir API, trustedAgents dla subagentów
- Rekomendowany plan faz: MVP mechaniczny → todo/progress → hooks → E2E
- Otwarte pytania z poziomem pewności

**Expected outputs:**
- `analysis/findings/` (od gathererów) → `outputs/research-report.md` (następna faza workflow)
- Rekomendacja: Cursor build.sh jako baza vs hybryda Copilot+Cursor

---

## Gathering Strategy

### Instances: 6

| # | Category ID | Focus Area | Tools | Output Prefix |
|---|-------------|------------|-------|---------------|
| 1 | `codebase-build` | Istniejący pipeline multi-platformy: `build.sh` (copilot, cursor), Makefile validate/clean/watch, smoke scripts, CI workflows, marketplace manifests | Glob, Grep, Read | `codebase-build` |
| 2 | `codebase-source` | Zawartość `plugins/maister/`: skills, agents, commands, hooks, orchestrator patterns, init/docs-manager — punkty styku transformacji | Grep, Read, SemanticSearch | `codebase-source` |
| 3 | `kiro-skills-steering` | Kiro skills API, slash commands, steering, AGENTS.md, lokalizacje `.kiro/skills/` i `.kiro/steering/` | WebFetch, WebSearch | `kiro-skills-steering` |
| 4 | `kiro-agents-hooks` | Custom agents JSON schema, tworzenie agentów, hooks w konfiguracji agenta (PreToolUse, AgentSpawn), mapowanie z Claude hooks | WebFetch, Read (Claude hooks) | `kiro-agents-hooks` |
| 5 | `kiro-tools-mcp` | Built-in tools (`subagent`, `read`, `shell`), MCP (`mcp.json`, `includeMcpJson`), experimental todo, headless mode, Q migration paths | WebFetch, WebSearch | `kiro-tools-mcp` |
| 6 | `planning-decisions` | Decyzje z `cursor-agent-support.md`, `cursor-agent-implementation-plan.md`, luki vs Kiro, strategia dystrybucji, plan faz implementacji | Read, Grep | `planning-decisions` |

### Rationale

- **Podział codebase vs Kiro docs:** Równoległe zbieranie faktów z repo i z `kiro.dev` skraca czas; synteza w Phase 5 łączy oba strumienie.
- **Osobny gatherer na agents+hooks:** Największa niepewność implementacji — agenci jako JSON (nie MD) i hooks osadzone w JSON agenta (nie osobny `hooks.json`).
- **Osobny gatherer na tools+MCP+todo:** Mapowanie `Task`→`subagent`, `TaskCreate`→`todo`, Playwright MCP — krytyczne dla orchestratorów Maister.
- **planning-decisions:** Wyciąga już podjęte decyzje (prefix `maister-`, commit artefaktów, brak marketplace) i sprawdza applicability do Kiro.

### Per-Gatherer Deliverables

Każdy gatherer zapisuje do `analysis/findings/[prefix]-*.md`:

1. **Findings** — fakty z cytowanymi ścieżkami/URL
2. **Gaps** — brak odpowiednika API
3. **Recommendations** — propozycje dla build.sh
4. **Open questions** — z confidence (H/M/L)

---

## Data Sources Summary

Pełna lista w `planning/sources.md`.

| Category | Primary sources |
|----------|-----------------|
| Codebase | `platforms/cursor/build.sh`, `platforms/copilot-cli/build.sh`, `Makefile`, smoke scripts, `plugins/maister/` |
| Project docs | `.maister/docs/standards/global/build-pipeline.md`, `plugin-development.md`, `tech-stack.md` |
| Planning docs | `docs/cursor-agent-support.md`, `docs/cursor-agent-implementation-plan.md`, `docs/cursor-e2e-checklist.md` |
| Kiro CLI | `kiro.dev/docs/cli/skills.md`, `custom-agents/`, `hooks.md`, `steering.md`, `chat/subagents.md`, `experimental/todo-lists.md`, `headless.md`, `migrating-from-q.md`, `llms.txt` |

---

## Success Criteria

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | Jasna mapa transformacji Claude Code → Kiro CLI (tabela) | Tabela w research report z ≥12 wierszami transformacji |
| 2 | Lista plików/katalogów do utworzenia | Sekcja „Deliverables tree” w report |
| 3 | Identyfikacja luk API | Tabela gaps z confidence H/M/L |
| 4 | Rekomendowany plan faz (MVP → polish → E2E) | Fazy 0–4 analogiczne do Cursor plan |
| 5 | Ryzyka i otwarte pytania | Sekcja risks z mitigacjami |

---

## Expected Outputs (Research Workflow)

| Artifact | Path | Owner |
|----------|------|-------|
| Research plan | `planning/research-plan.md` | research-planner ✅ |
| Sources manifest | `planning/sources.md` | research-planner ✅ |
| Gatherer findings | `analysis/findings/[prefix]-*.md` | information-gatherer × 6 |
| Synthesis report | `outputs/research-report.md` | research-synthesizer |
| Implementation recommendation | Sekcja w research report | research workflow |

---

## Preliminary Hypotheses (to validate)

1. **Kiro ≈ Cursor semantycznie** (prefix `maister-`, AGENTS.md, zachować hooks) — ale **format agents i hooks radically different** (JSON not MD).
2. **Brak plugin bundle API** — `plugins/maister-kiro/` to drzewo instalacyjne kopiowane do `~/.kiro/` lub symlinkowane (jak Cursor local install).
3. **Commands folder może zniknąć** w wariancie Kiro — commands merge into skills (Kiro nie ma osobnego commands/ w plugin API).
4. **Orchestrator wymaga dedykowanego agenta JSON** (`maister-orchestrator.json`) z `tools: ["subagent", ...]`, `trustedAgents: ["maister-*"]`, embedded hooks.
5. **Progress tracking:** `todo` experimental zamiast TodoWrite — wymaga `kiro-cli settings chat.enableTodoList true` w smoke/E2E.
6. **Nie ma built-in `explore`** — trzeba custom agent `maister-explore` lub przepisać codebase-analyzer na narzędzia `read`/code-intelligence.

---

## Timeline Estimate

| Phase | Effort | Parallel gatherers |
|-------|--------|-------------------|
| Phase 1–2 (discovery + pipeline) | 0.5 dnia | 1 + 2 |
| Phase 3 (Kiro API) | 1 dzień | 3, 4, 5 |
| Phase 4 (infra) | 0.5 dnia | 1, 6 |
| Phase 5 (synthesis) | 0.5 dnia | synthesizer |
| **Total research** | **~2–3 dni** | 6 parallel w Phase 2–3 |

Implementacja (po research): szacunek **1–2 tygodnie** (porównywalnie z Cursor, + overhead konwersji agents MD→JSON).
