# Decision Log — Kiro CLI Support for Maister

Rekordy decyzji architektonicznych w formacie MADR. Powiązane z [high-level-design.md](high-level-design.md).

---

## ADR-001: Hybrid Distribution (1C)

### Status
Accepted

### Context
Kiro CLI nie oferuje plugin manifest ani flagi `--plugin-dir` (w przeciwieństwie do Cursor). Skills, agenci i steering ładują się z `~/.kiro/` (global) lub `.kiro/` (workspace), przy czym workspace wygrywa przy kolizji nazw. Maister wymaga zarówno wygodnej instalacji dla developerów (parity z `smoke-install.sh` Cursor), jak i izolowanego CI/E2E bez mutacji home directory.

### Decision Drivers
- Brak marketplace i `--plugin-dir` w Kiro
- Precedencja workspace nad global w dokumentacji Kiro
- Wzorzec smoke dwuwarstwowy z Copilot/Cursor
- Grill #3: lokalna instalacja dla użytkowników

### Considered Options
1. **1A Global-only** — tylko `~/.kiro/`
2. **1B Workspace-only** — tylko `.kiro/` w projekcie
3. **1C Hybrid** — global install + workspace copy dla CI
4. **1D Symlink-primary** — dev-only
5. **1E Flat install bez zachowania repo tree**

### Decision Outcome
Chosen option: **1C Hybrid**, ponieważ łączy DX „zainstaluj raz” z reprodukowalnym smoke w ephemeral workspace, zgodnie z natywnym modelem precedencji Kiro i istniejącym wzorcem Maister.

### Consequences

#### Good
- Developerzy: `smoke-install.sh` → `~/.kiro/` (jak Cursor → `~/.cursor/plugins/local/`)
- CI: `smoke-cli.sh` kopiuje build do `/tmp/.../.kiro/` bez side effects
- Dokumentacja może wyjaśnić override workspace vs global

#### Bad
- Dwa code pathy instalacji do utrzymania
- Ryzyko driftu dokumentacji („która kopia jest aktywna?”)
- Flatten layout `plugins/maister-kiro/` → `~/.kiro/*` wymaga prototypu (open Q#1)

---

## ADR-002: orchestrator-state.yml SOT with todo Mirror (Fase 1.5)

### Status
Accepted

### Context
Cursor mapuje `TaskCreate`/`TaskUpdate` na `TodoWrite` w Fazie 1.5. Kiro oferuje eksperymentalne narzędzie `todo` i `chat.enableTodoList`. Maister już wymaga `orchestrator-state.yml` jako source of truth dla resume (`--from=PHASE`). Użytkownik żąda **pełnej parzystości Cursor** w artefaktach projektowych, w tym Fazy 1.5 — mimo że MVP Fazy 1 może ją odłożyć implementacyjnie.

### Decision Drivers
- Kontrakt orchestratora: resume bez utraty fazy
- `todo` experimental — ryzyko zmian API
- Wzorzec Cursor: ship MVP bez todo, dodaj w 1.5
- Hybrid 2C: odporność na wyczyszczenie listy todo

### Considered Options
1. **2A todo immediate** — od Fazy 1
2. **2B state only** — bez todo na stałe
3. **2C Hybrid** — YAML SOT + optional todo mirror
4. **2D narrative-only progress**
5. **2E defer all structured progress**

### Decision Outcome
Chosen option: **2B w Fazie 1 implementacji + 2C w Fazie 1.5 projekcie**, ponieważ `orchestrator-state.yml` jest platform-agnostic i wystarcza do resume, a `todo` dodaje UX parity z Cursor TodoWrite bez ryzyka blokady MVP na niestabilnym API.

### Consequences

#### Good
- Resume działa nawet gdy `todo` zawiedzie lub zostanie wyczyszczony
- Faza 1.5 ma gotowy transform (`task-to-kiro-todo.md`) i validate ban `TaskCreate`
- Zgodność z orchestrator-patterns.md (state file authority)

#### Bad
- Dual-write complexity w instrukcjach orchestratorów (Faza 1.5)
- Możliwy drift między todo UI a YAML — wymaga „best-effort sync” wording
- Dodatkowe 2–3 dni pracy po zielonym smoke MVP

---

## ADR-003: Chat-Native Phase Gates (3A+3B+3C)

### Status
Accepted

### Context
Źródło Maister zawiera 200+ wystąpień `AskUserQuestion`. Cursor sed → `AskQuestion`. Kiro **nie ma** built-in narzędzia do pytań strukturalnych (High confidence gap). CI wymaga headless path; `maister-init` Phase 3 używa multi-select — lekcja z Copilot: sekwencyjne pytania.

### Decision Drivers
- P0 blocker: gates orchestratorów
- Headless smoke z `--no-interactive --trust-all-tools`
- Wzorzec Plan agent w dokumentacji Kiro (pytania w czacie)
- Copilot multi-select workaround

### Considered Options
1. **3A Chat gates** — natural language w instrukcjach
2. **3B Headless skip** — auto-defaults w non-interactive
3. **3C Sequential prompts** — zamiast multi-select
4. **3D File-based gates**
5. **3E Tool permission prompts**

### Decision Outcome
Chosen option: **kombinacja 3A + 3B + 3C**, ponieważ razem pokrywają interaktywny UX, CI i init multi-select bez fałszywego narzędzia AskQuestion.

### Consequences

#### Good
- Brak sed do nieistniejącego API
- Smoke init może przejść z documented defaults
- Init standards selection działa bez `allow_multiple`

#### Bad
- Medium confidence — agent może pominąć „czekaj na odpowiedź” w headless
- Wymaga osobnego interaktywnego E2E (Faza 3 scenariusz 2a)
- Większa złożoność build patches dla init Phase 3

---

## ADR-004: Single maister-orchestrator Agent (4A)

### Status
Accepted

### Context
Kiro nie ma Skill tool — skills są slash commands. Hooks **muszą** być osadzone w JSON agenta (brak `hooks.json`). Grill #10 wymaga zachowania hooks (semantic alignment z Cursor). 14 skills + 8 commands mieści się w jednym kontekście orchestratora.

### Decision Drivers
- Hook embedding mandatory w Kiro
- `trustedAgents: ["maister-*"]` dla subagent delegation
- `skill://` selective resources
- Unikanie duplikacji hooków w wielu agentach

### Considered Options
1. **4A Single maister-orchestrator.json**
2. **4B Default agent + skill discovery only**
3. **4C Per-workflow orchestrators**
4. **4D chat.defaultAgent setting only**
5. **4E Steering-only orchestration**

### Decision Outcome
Chosen option: **4A z dokumentacją 4D** (`chat.defaultAgent` opcjonalnie w README), ponieważ tylko dedykowany agent JSON zapewnia centralny punkt hooków i delegacji subagent zgodny z Maister orchestrator contract.

### Consequences

#### Good
- Jeden `--agent maister-orchestrator` entry point
- Wszystkie hooki (bash guard, subagent tracking, skill reminder) w jednym miejscu
- Jasny podział: orchestrator vs 24 subagenty JSON

#### Bad
- Syntetyczny agent poza source MD — dodatkowy maintenance w build.sh
- Użytkownik musi znać flagę `--agent` lub setting defaultAgent
- Slash commands mogą trafiać do innego agenta bez defaultAgent

---

## ADR-005: Internal Skills (5B + 5A MVP)

### Status
Accepted

### Context
Sześć skills ma `user-invocable: false` w źródle Claude. Kiro eksponuje wszystkie `SKILL.md` jako slash commands — brak odpowiednika frontmatter (High confidence). Orchestrator musi jednak ładować internal engines (`docs-manager`, `codebase-analyzer`) przez `skill://` resources.

### Decision Drivers
- Poprawność orchestracji ważniejsza niż ukrycie slash w MVP
- 5D/5E (omit internal) łamie delegation chain
- Open Q#5: czy `skill://`-only ukrywa slash — nieweryfikowane

### Considered Options
1. **5A Accept all slashes**
2. **5B Selective skill:// on orchestrator**
3. **5C Naming hide convention**
4. **5D Omit internal from install**
5. **5E Dual tree skills-internal/**

### Decision Outcome
Chosen option: **5B + 5A dla MVP** — orchestrator z pełnym `skill://` resources (w tym internal); akceptacja dodatkowych slash commands do czasu eksperymentu 5C/5E w Fazie 2+.

### Consequences

#### Good
- `codebase-analyzer` i `docs-manager` dostępne orchestratorowi bez refactoru layoutu
- Prosty build (strip `user-invocable` only)
- Ścieżka eskalacji udokumentowana (5E jeśli UX problem)

#### Bad
- 22+ slash commands w completion — noise dla użytkowników
- Ryzyko uruchomienia internal engine bez orchestratora
- Dokumentacja musi oznaczyć „advanced” commands

---

## ADR-006: bash+jq Agent Generation (6A)

### Status
Accepted

### Context
24 agenci źródłowych bez pola `tools` w frontmatter. Kiro wymaga explicit JSON whitelist. Repo Maister używa bash-first build (`set -e`, `sedi()`); `validate-kiro` już zakłada `jq`. Największy unikalny koszt vs Cursor (~2–3 dni).

### Decision Drivers
- Spójność z Copilot/Cursor pipeline (brak Node w build)
- `jq` dostępny lokalnie i w CI
- YAGNI — Node tylko gdy parser zawiedzie
- Scope guardrail: zero edycji `plugins/maister/` (odrzuca 6E)

### Considered Options
1. **6A bash + jq loop** + `generate-agent-json.sh`
2. **6B Node generate-agents.mjs**
3. **6C Embedded Python**
4. **6D Pre-generated committed JSON**
5. **6E tools: w source MD**

### Decision Outcome
Chosen option: **6A**, ponieważ utrzymuje jednolity bash pipeline i `agent-tools.json` jako maintainable lookup; eskalacja do 6B jest explicit escape hatch przy >~100 linii parsera lub bugach frontmatter.

### Consequences

#### Good
- Brak nowego runtime dep w build (poza `jq`)
- `agent-tools.json` reviewable w PR
- Jedna odpowiedzialność: `generate-agent-json.sh`

#### Bad
- Fragile frontmatter parsing w bash
- Trudniejsze unit testy niż Node
- Złożony embed hooks w orchestrator wymaga ostrożnego `jq`

---

## ADR-007: Merge Commands into Skills

### Status
Accepted

### Context
Kiro nie ma API katalogu `commands/` ani manifestu z ścieżką commands. Claude source ma 8 plików `commands/*.md` jako thin wrappers. Cursor zachowuje `commands/` — Kiro musi mapować na auto-discovered skills.

### Decision Drivers
- Kiro slash = skill name z folderu
- 14 + 8 = 22 skills — zgodne z validate count
- Naming `maister-foo` już ustalony (grill #5)

### Considered Options
1. Build-time emit `skills/maister-*/SKILL.md` z body commands
2. Zostawić `commands/` w output (martwy katalog)
3. Steering-only command docs

### Decision Outcome
Chosen option: **build-time merge do skills**, ponieważ to jedyny sposób na `/maister-quick-plan` i pozostałe slash commands bez nieistniejącego API.

### Consequences

#### Good
- Parity slash map z Cursor (`/maister-development`, etc.)
- `validate-kiro`: brak `commands/` w output
- Jeden mechanizm discovery

#### Bad
- Duplikacja konceptualna skill vs command w build logic
- Commands bez `references/` mogą wymagać minimalnego SKILL frontmatter template

---

## ADR-008: Embedded Hooks in Orchestrator JSON

### Status
Accepted

### Context
Cursor używa `hooks/hooks.json` + `${CURSOR_PLUGIN_ROOT}`. Kiro wymaga hooks w polu `hooks` agenta JSON. Blocking w Kiro: **exit code 2 + STDERR** (nie JSON deny). Brak `preCompact`, `subagentStart`/`subagentStop` — wymaga redesignu mapowania.

### Decision Drivers
- Semantic alignment z Cursor (grill #10 — keep hooks)
- Bash guard dla parallel implementers (task-group-implementer nie na whitelist)
- subagent tracking dla destructive command context

### Considered Options
1. Embed all hooks in `maister-orchestrator.json`
2. Per-agent hooks on all 26 agents
3. Defer hooks entirely (4B) — odrzucone
4. Steering-only guards

### Decision Outcome
Chosen option: **centralized embed w maister-orchestrator.json** z adaptowanymi skryptami w `OUT/hooks/`, mapowaniem Cursor events → Kiro events (tabela w high-level-design.md).

### Consequences

#### Good
- Jeden punkt aktualizacji hooków
- Parzystość destructive guard i skill-invocation reminder
- Hook scripts reusable jako pliki (nie inline JSON)

#### Bad
- Hooks działają tylko gdy sesja używa `maister-orchestrator`
- `preCompact` gap wymaga stub + manual recovery docs
- `${KIRO_PLUGIN_ROOT}` Medium confidence — fallback na absolute paths w build

---

## ADR-009: Base Implementation on Cursor build.sh (Informacyjny)

### Status
Accepted

### Context
Synthesis i research-report potwierdzają High confidence: Kiro bliżej Cursor niż Copilot (naming, AGENTS.md, hooks retained). Copilot strip naming i brak hooks nie są odpowiednim szablonem.

### Decision Outcome
**Kopiować i adaptować `platforms/cursor/`**, nie `platforms/copilot-cli/`.

### Consequences
- Reuse overrides, templates, hook script structure
- ~60% pracy Cursor jako starting point
- Dodatkowe kroki: MD→JSON, commands merge, orchestrator synthesize

---

## ADR-010: Dedicated KIRO_HOME Profile (Grill)

### Status
Accepted (supersedes ADR-001 install paths)

### Context
Grill session established that Kiro cannot colocate @prompts, skills, and agent config in a single nested agent folder. Users need isolation from personal `~/.kiro/` configuration.

### Decision Outcome
**`KIRO_HOME=~/.kiro-maister`** with standard Kiro subdirectories (`agents/`, `skills/`, `prompts/`, `steering/`, `settings/`). `plugins/maister-kiro/` build output mirrors this layout 1:1. `smoke-install.sh` copies build → `$KIRO_HOME`.

### Consequences
- Clean uninstall: `rm -rf ~/.kiro-maister`
- Wrapper `maister-kiro` sets `KIRO_HOME` before `exec kiro-cli`
- CI uses ephemeral `$KIRO_HOME` in `smoke-cli.sh`

---

## ADR-011: Agent Name `maister` (Grill)

### Status
Accepted (supersedes ADR-004 agent filename `maister-orchestrator`)

### Decision Outcome
Main synthetic agent: **`agents/maister.json`**, `name: "maister"`. User runs `maister-kiro chat --agent maister`.

---

## ADR-012: @prompts Workflow Layer (Grill)

### Status
Accepted

### Decision Outcome
Install flat prompt files under `$KIRO_HOME/prompts/`:

**Start:** `@init`, `@dev`, `@research`, `@plan` (quick-plan), `@design` (product-design)  
**Meta:** `@status`, `@next`, `@resume`, `@bye`

Slash remains for less common workflows (bugfix, migration, performance, reviews). Invoke via slash + NL + @prompts (grill Q5=C).

---

## ADR-013: agents/instructions/ for Subagent Bodies (Grill)

### Status
Accepted

### Decision Outcome
Rename generated agent body directory from `agents/prompts/` to **`agents/instructions/`** to avoid confusion with Kiro `@prompts` in `$KIRO_HOME/prompts/`.

---

## ADR-014: todo from Fase 1 (Grill)

### Status
Accepted (supersedes ADR-002 deferral)

### Decision Outcome
**`TaskCreate`/`TaskUpdate` → `todo` transform included in Fase 1 build**, not deferred to Fase 1.5. Document `chat.enableTodoList true`. `orchestrator-state.yml` remains SOT for resume.

---

## ADR-015: Wrapper and Install UX (Grill)

### Status
Accepted

### Decision Outcome
- **`platforms/kiro-cli/maister-kiro`** wrapper: `KIRO_HOME=~/.kiro-maister exec kiro-cli "$@"`
- `smoke-install.sh`: `--set-default` / `--no-default`; interactive prompt default **N**; optional `--set-alias`
- `smoke-uninstall.sh`: remove `$KIRO_HOME` + optional alias cleanup

---

## ADR-016: Hooks at Profile Root (Grill)

### Status
Accepted

### Decision Outcome
`agents/maister.json` references hooks as **`../hooks/*.sh`**. Hook scripts live at **`$KIRO_HOME/hooks/`** (profile root), not inside `agents/`.

---

*Ostatnia aktualizacja: 2026-06-07 (post-grill). Konsumowane przez specification-creator — grill decisions (ADR-010–016) override pre-grill ADRs where noted.*

