# Research Report: Advisor Mode for Maister Orchestrators

**Research type:** Mixed (technical + literature)  
**Date:** 2026-07-11 (revised 2026-07-11 — Codex feasibility and gate-answer correctness review)  
**Researcher:** maister-research-synthesizer  
**Task:** `.maister/tasks/research/2026-07-11-advisor-mode-option/`

## TL;DR

Advisor mode w Maister może przenośnie **konsultować bramkę i rekomendować odpowiedź**, ale research nie potwierdza jeszcze mechanizmu, który zastępuje użytkownika w `AskUserQuestion`/`CHAT GATE`. Konsultacja musi działać na poziomie orchestratora rodzica, po dashboard rewrite i przed zmianą fazy na `completed`. Wzorzec Task/subagent jest wykonalny jako recommendation path; pełny auto-answer wymaga dodatkowego runtime/API albo platformowego trybu headless. Konfiguracja: `advisor_enabled`, `advisor_model`, `advisor_agent` w `.maister/config.yml` → `orchestrator.options`. Obowiązkowy denylist obejmuje rollback, fix-loop, scope expansion, final handoff i nierozstrzygnięte błędy krytyczne.

## Key Decisions

- **Centralny kontrakt w framework §2** — §2 definiuje wspólną politykę, ale rzeczywista implementacja wymaga zmian w call-site'ach orchestratorów albo runtime wrappera.
- **Task advisor subagent** jako wzorzec konsultacji multi-platform; Anthropic Advisor Tool tylko jako literatura cost/quality split.
- **`advisor_enabled` domyślnie `false`** — pełna backward compatibility; bramki nadal się odpalają.
- **Denylist per gate-type** — global enable nie oznacza automatycznej akceptacji; dla bramek wyłączonych advisor zwraca `escalate_to_user`.
- **Audyt w `gate_history`** — `dashboard-data.js` nie przetrwa resume bez zapisu w `orchestrator-state.yml`.
- **Codex: init bootstrap advisora** — template `advisor.toml` kopiowany do `.codex/agents/` przy init (plugin MVP nie bundluje `agents/` u roota); ta ścieżka ma potwierdzone wsparcie platformy, ale wymaga testu bramki.

## Open Questions / Risks

- Cursor: czy osobny model advisora jest faktycznie honorowany — **low/medium confidence**; dokumentacja i zachowanie runtime są rozbieżne.
- Copilot: stabilność `ask_user` (#1898) i brak pipeline dla pinned model — **low-medium confidence**.
- Kiro interactive: advisor może przygotować rekomendację, ale CHAT GATE nadal wymaga odpowiedzi użytkownika; auto-answer jest potwierdzone tylko dla istniejącego headless default path.
- Brak dowodu na „pre-selected answer” dla `AskUserQuestion`; to główna luka implementacyjna.
- Codex: wymaga opt-in `.codex/agents/advisor.toml` (init scaffold); plugin root `agents/` nadal zabroniony przez smoke test MVP.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Objectives](#research-objectives)
3. [Methodology](#methodology)
4. [Findings](#findings)
5. [Analysis and Insights](#analysis-and-insights)
6. [Conclusions](#conclusions)
7. [Recommendations](#recommendations)
8. [Appendices](#appendices)

---

## Executive Summary

### What Was Researched

Jak dodać opcję advisor mode delegującą pytania bramek workflow (`AskUserQuestion` / transformy platformowe) do dedykowanego agenta z osobnym modelem, odpowiadającego zamiast użytkownika — wzorując się na Anthropic Advisor Tool i wzorcach agentowych loopów.

### How It Was Researched

Metodologia **mixed** z **6 równoległymi gathererami** (triangulacja): inventory bramek w kodzie, dokumentacja kontraktów, agenci i `model:`, punkty rozszerzenia konfiguracji, dokumentacja Anthropic Advisor Tool + ograniczenia `AskUserQuestion` w subagentach, oraz macierz transformów 5 platform (`build.sh`).

### Key Findings

- **33 unikalne bramki wyjściowe** (`→ MANDATORY GATE`; 34 literalne markery, bo jeden jest referencją) + około **75+ zidentyfikowanych miejsc interaktywnych** w 5 orchestratorach. Liczba dodatkowych miejsc jest przybliżona, ponieważ część wystąpień to instrukcje/self-checki, nie niezależne call-site'y.
- Subagenty **nie mają** `AskUserQuestion` — advisor musi być na orchestratorze.
- **Brak** istniejącego agenta advisora i kluczy config — greenfield z precedensem `html_output`.
- Anthropic Advisor Tool to API server-side (`advisor_20260301`) — **nie** mapuje się na markdown plugin multi-platform.
- Kiro `--no-interactive` już ma Headless Defaults (3B) auto-odpowiadające — advisor_mode wymaga rozszerzenia, nie zastąpienia.

### Main Conclusions

Konsultacyjny advisor jest wykonalny na Claude Code, Kiro i Codex; Cursor pozostaje warunkowy z powodu niepewnego pinowania modelu, a Copilot częściowy. Na Codex możliwy jest `native subagent` z custom agentem `advisor` (osobny agent thread, osobny model w TOML), scaffoldowanym przy init do `.codex/agents/`. Research nie potwierdza, że Task/subagent może automatycznie zasilić `AskUserQuestion` odpowiedzią. Implementacja musi najpierw wybrać między recommendation-only a platformowym/runtime’owym auto-answer.

---

## Research Objectives

### Primary Research Question

Jak dodać opcję advisor mode w Maister, która deleguje pytania bramek workflow do dedykowanego agenta z osobnym modelem odpowiadającego zamiast użytkownika?

### Sub-Questions

| ID | Question | Answered |
|----|----------|----------|
| SQ1 | Gdzie odpalają się bramki fazowe? | Tak — inventory 5 orchestratorów |
| SQ2 | Jak skonfigurować model agenta? | Tak — `model: inherit` everywhere; pinned model greenfield |
| SQ3 | Co przepisuje `orchestrator-patterns.md`? | Tak — §2 gates, §4 config, §8 dashboard |
| SQ4 | Jakie punkty rozszerzenia config/state? | Tak — propozycja schema |
| SQ5 | Co specyfikuje Anthropic Advisor Tool? | Tak — API shape, limitations |
| SQ6 | Feasibility per platforma? | Tak — macierz 5 platform |

### Scope

**Included:** bramki fazowe, config/state, agenci, platform transforms, routing, audyt, headless/interactive.

**Excluded:** implementacja kodu, custom API proxy, pełna automatyzacja bez override, advisor jako zamiennik executora.

---

## Methodology

### Research Type and Approach

Mixed hybrid: dekompozycja 6 sub-pytań → równoległe zbieranie → triangulacja (kod + docs + config + external) → synteza zintegrowana.

### Data Sources

| Source type | Files analyzed |
|-------------|----------------|
| Gatherer findings | 6 files in `analysis/findings/` |
| Planning | `research-brief.md`, `research-plan.md`, `sources.md` |
| Codebase (via findings) | 5 orchestrator SKILL.md, 26 SOT agents + 1 Cursor-specific agent, 5× `build.sh`, hooks |
| External | Anthropic Advisor Tool docs, Claude Code subagents docs, GitHub issues, platform docs |

### Analysis Framework

Technical component inventory + flow analysis + integration mapping; literature approach comparison (native API vs Task subagent vs headless defaults); requirements gap analysis for config, agent, transforms, denylist.

---

## Findings

### F1: Gate Surface Area

**Category:** Architecture  
**Confidence:** High

Pięć orchestratorów dzieli kontrakt z `orchestrator-patterns.md` §2. Liczba markerów `→ MANDATORY GATE`:

| Orchestrator | Phase-exit gates | Additional AskUserQuestion sites |
|--------------|------------------|----------------------------------|
| development | 12 | ~25+ |
| research | 3 | ~10+ |
| product-design | 5 | ~20+ |
| performance | 7 | ~12+ |
| migration | 6 | ~10+ |

**Cykl bramki:** finish work → dashboard rewrite → `AskUserQuestion` → answer → `completed`.

**Evidence:** `codebase-orchestrators-gates.md`, `documentation-orchestrator-gates.md`.

**Implication:** §2 jest właściwym miejscem dla wspólnej polityki i kolejności lifecycle, ale nie jest wykonywalnym interceptorem. Call-site'y lub runtime adaptery nadal wymagają osobnej implementacji i testów.

---

### F2: Gate Type Taxonomy

**Category:** Design  
**Confidence:** High

| Type ID | Description | Advisor default |
|---------|-------------|-----------------|
| `phase-exit` | MANDATORY GATE po fazie | Auto-continue (recommended) |
| `decisions-needed` | gap-analyzer structured decisions | Context-dependent; scope = denylist |
| `optional-phase` | Enable brainstorming/audit/E2E | Follow recommended |
| `clarify` | Max-N clarifying questions | Lower risk |
| `convergence` | One question per area (research P4, PD P5) | Sequential only — no batching |
| `refine` | Approve/revise loops | Medium risk |
| `verify-matrix` | Multiselect verification options | Recommended selections |
| `fix-loop` | Issue selection, proceed-as-is | **Denylist** |
| `failure-recovery` | Retry/skip on subagent failure | Escalate to user |

**Evidence:** `codebase-orchestrators-gates.md` § Gate Type Taxonomy.

---

### F3: Orchestrator-Only Insertion Point

**Category:** Architecture constraint  
**Confidence:** High

> Subagents have no user channel; the orchestrator IS the user channel.

`AskUserQuestion` jest zbanowane w subagentach (Claude Code docs + GitHub #18721, #34592, #40263).

**Advisor insertion (ranked by leverage):**

1. **Framework §2 gate policy + adapter seam** (highest)
2. Init config seed (`advisor_*` → `orchestrator.options`)
3. Dashboard pre-gate rewrite hook (§8 trigger #3)
4. `decisions_needed` block (development P2)
5. Convergence loops (sequential advisor calls)
6. Fix-loop gates (denylist)
7. Hooks layer
8. Per-SKILL duplication (lowest — avoid)

**Evidence:** `documentation-orchestrator-gates.md` §1.7, `external-anthropic-advisor-tool.md` §6.

---

### F4: Agent Model Configuration Today

**Category:** Implementation  
**Confidence:** High

- 24 agents: `model: inherit`
- 3 agents: no `model` (companion `skills:` preload)
- **0 agents** with non-inherit pinned model
- **No `advisor` agent** exists

Platform handling of `model:`:

| Platform | Non-inherit `model:` support |
|----------|------------------------------|
| Claude Code | Frontmatter kept |
| Cursor | Frontmatter kept; Task `model` param documented |
| Kiro | Emitted to JSON when ≠ `inherit` (Rule 30) |
| Copilot | Copied `.md`; unclear pinning |
| Codex | **Via `.codex/agents/advisor.toml`** — `model` w TOML (init bootstrap); plugin manifest nie pinuje |

**Evidence:** `codebase-agents-config-models.md`.

---

### F5: Config Extension Schema (Proposed)

**Category:** Configuration  
**Confidence:** Medium (inferred from `html_output` precedent)

**.maister/config.yml:**

```yaml
html_output: true

advisor_enabled: false      # default: user answers manually
advisor_model: null         # null = agent frontmatter default
advisor_agent: advisor      # agents/advisor.md
```

**orchestrator.options** (seeded at init, read-only downstream):

```yaml
orchestrator:
  options:
    advisor_enabled: false
    advisor_model: null
    advisor_agent: advisor
```

**CLI override (optional):** `--advisor`, `--advisor-model=<slug>` (Pattern B like `--sequential`).

**Evidence:** `configuration-advisor-extension-points.md`.

---

### F6: Audit Trail Extension (Proposed)

**Category:** Observability  
**Confidence:** Medium

Current: `phases[].gate: {question, answer}` in `dashboard-data.js` only.

Proposed extension:

```js
gate: {
  question: "...",
  answer: "...",
  answered_by: "advisor",       // "user" | "advisor"
  advisor_model: "claude-sonnet-4-...",
  advisor_agent: "advisor",
  advisor_rationale: "...",
  user_override: false
}
```

Plus `orchestrator.gate_history[]` in `orchestrator-state.yml` for resume persistence.

**Evidence:** `configuration-advisor-extension-points.md` §4.4–4.5.

---

### F7: Anthropic Advisor Tool vs Maister Advisor

**Category:** Literature  
**Confidence:** High

| Dimension | Anthropic Advisor Tool | Maister advisor mode |
|-----------|------------------------|----------------------|
| Trigger | Executor mid-generation | Orchestrator at MANDATORY GATE |
| Mechanism | `advisor_20260301` server-side API | Task subagent in plugin markdown |
| Platforms | Claude API / AWS only | Must compile to 5 platforms |
| Who answers | Advice to executor | Recommends gate option; replacing the user is not demonstrated |

**Conclusion:** Literatura dla model split i cost; implementacja przez Task subagent.

**Evidence:** `external-anthropic-advisor-tool.md` §5.

---

### F8: Per-Platform Feasibility Matrix

**Category:** Integration  
**Confidence:** High (transforms); Medium (model separation)

| Platform | Gate surface | Subagent API | Model pin | Advisor path | Feasibility |
|----------|-------------|--------------|-----------|--------------|-------------|
| **Claude Code** | `AskUserQuestion` | `Task tool` | Agent frontmatter | Task → advisor | **High** |
| **Cursor** | `AskQuestion` | `Task tool` + `maister-*` | Frontmatter/Task param niepewne | Task → `maister-advisor` → rekomendacja; auto-answer niepotwierdzony | **Low–Medium** |
| **Copilot** | `ask_user` | No agent packaging | Not in pipeline | Orchestrator synthesis + defaults; `--no-ask-user` headless | **Medium–Low** |
| **Kiro** | **CHAT GATE** | `subagent tool` | JSON `model` if ≠ inherit | Subagent advisor + recommendation; headless default osobno | **Medium (interactive), High (consultation/headless)** |
| **Codex** | plain-text question | native subagent delegation | `.codex/agents/advisor.toml` (`model` w TOML) | Spawn `advisor` custom agent → summary → gate answer | **Medium–High** |

**SOT authoring rules:** Always write `AskUserQuestion` and `Task tool` in `plugins/maister/`; never `CHAT GATE`, `AskQuestion`, or `ask_user` in source.

**Evidence:** `external-platform-constraints.md`.

---

### Findings Summary Table

| ID | Title | Category | Confidence | Sources |
|----|-------|----------|------------|---------|
| F1 | Gate surface area | Architecture | High | 2 |
| F2 | Gate taxonomy | Design | High | 1 |
| F3 | Orchestrator-only insertion | Architecture | High | 3 |
| F4 | Agent model config | Implementation | High | 1 |
| F5 | Config schema (proposed) | Configuration | Medium | 2 |
| F6 | Audit trail (proposed) | Observability | Medium | 2 |
| F7 | Anthropic vs Maister | Literature | High | 1 |
| F8 | Platform feasibility | Integration | High/Medium | 2 |

---

## Analysis and Insights

### Patterns Identified

| Pattern | Type | Prevalence | Assessment |
|---------|------|------------|------------|
| Centralized gate contract | Architectural | Universal | Mature — leverage for advisor |
| Parent-as-user-channel | Design | Universal | Normative — blocks subagent advisor |
| Config seed-once | Implementation | `html_output` only today | Proven — extend for advisor |
| Platform compile transforms | Integration | 5 platforms | Must survive in SOT authoring |
| Headless-as-naive-advisor | Organizational | Kiro/Copilot | Differentiate from true advisor |

### Key Insights

1. **§2 policy + adapter seam** gives the highest-leverage coordination point, but does not remove the need to update call-sites or runtime adapters.
2. **`advisor_enabled` ≠ auto-answer everywhere** — denylist per gate-type is safety-critical.
3. **First pinned-model agent** (`advisor.md`) — Kiro build ready; Cursor needs testing.
4. **Convergence requires sequential advisor calls** — anti-batch rules from research/product-design must propagate to advisor prompts.
5. **`gate_history` in state** closes resume audit gap.

### Relationships and Dependencies

```
config.yml → orchestrator.options.advisor_*
    → gate type classifier → denylist check
        → [allowed] Task(advisor) → structured answer → gate record → completed
        → [denied] AskUserQuestion → user answer → gate record → completed
    → dashboard-data.js + gate_history
    → build.sh transforms (per platform gate surface)
```

### Quality Assessment (SWOT)

| | |
|---|---|
| **Strengths** | Mature gate contract; `html_output` config precedent; Kiro model JSON pipeline ready |
| **Weaknesses** | No advisor agent; gate audit not in state; 0 pinned-model precedent |
| **Opportunities** | Kiro 3B extension; dashboard advisor badge; `--advisor` CLI for CI/headless |
| **Threats** | Cursor model override bug; Copilot `ask_user` regression; AUQ skill regressions |

---

## Conclusions

### Primary Conclusions (with confidence)

1. **Advisor policy belongs in `orchestrator-patterns.md` §2** between dashboard pre-gate rewrite and phase completion, but §2 alone is not an executable interceptor. (**High**)

2. **Portable pattern: Task-tool advisor subagent** with `agents/advisor.md`, non-interactive structured recommendation. Native Anthropic Advisor Tool API is out of scope for markdown plugin. (**High**)

3. **Config schema** follows `html_output`: `advisor_enabled`, `advisor_model`, `advisor_agent` in config.yml → `orchestrator.options`. (**Medium**)

4. **Platform feasibility**: Claude/Kiro/Codex support a consultation path; Cursor is conditional because separate-model runtime behavior is unresolved; Copilot remains defaults/synthesis only. (**High** for transforms; **Medium–High** for Codex model separation)

5. **Safety denylist mandatory** for fix-loop, rollback, scope expansion, final handoff, failure recovery skip, critical verification unresolved. (**High**)

### Direct Answer to Research Question

Aby dodać advisor mode w Maister:

1. **Gdzie wstrzyknąć:** politykę i kolejność konsultacji umieścić w lifecycle bramki `orchestrator-patterns.md` §2 — po rewrite dashboardu (§8 trigger #3), przed zmianą fazy na `completed`. Następnie dodać rzeczywisty adapter/call-site'y w orchestratorach; sam reference file nie zapewnia interceptora.

2. **Schema konfiguracji:** trzy klucze w `.maister/config.yml` (`advisor_enabled`, `advisor_model`, `advisor_agent`), seed do `orchestrator.options` przy init (jak `html_output`), opcjonalny flag CLI `--advisor`. Routing: global enable + denylist per gate-type.

3. **Agent advisora:** nowy `plugins/maister/agents/advisor.md` z polami zgodnymi ze standardem SOT (`name`, `description`, `model`, `color`), bez `AskUserQuestion`, zwracający structured YAML/JSON z `selected_option`, `rationale`, `confidence`, `escalate_to_user`. Read-only trzeba skonfigurować per platforma (`disallowedTools`/`tools`, Cursor build, Kiro permissions, Codex `sandbox_mode`).

4. **Przepływ recommendation-only:** gdy `advisor_enabled` i gate jest dozwolony → Task/advisor z pytaniem, opcjami, artifact TL;DR i historią bramek → walidacja strukturalnej rekomendacji → pokazanie rekomendacji użytkownikowi przez istniejącą bramkę → zapis audytu → `completed` dopiero po odpowiedzi użytkownika. „Pre-selected answer” należy usunąć, dopóki nie zostanie potwierdzony konkretnym runtime API.

5. **Platformy:** autoruj w SOT; `make build` kompiluje. Kiro: rozdziel interactive CHAT GATE od istniejącego headless default. Cursor: najpierw test model pinning; Codex: `native subagent delegation` → agent `advisor`; init kopiuje template TOML do `.codex/agents/` (model z `advisor_model` w config).

---

## Recommendations

### Top 3 Recommendations

| # | Recommendation | Priority | Effort | Rationale |
|---|----------------|----------|--------|-----------|
| **1** | **Zdefiniuj w §2 recommendation-only contract** + osobny adapter/runtime seam | P0 | Medium | Rozdziela politykę od mechanizmu faktycznej odpowiedzi |
| **2** | **Implementuj Task-tool advisor subagent** jako konsultanta, nie jako udawaną odpowiedź `AskUserQuestion` | P0 | Medium | Działa bez łamania istniejącego kontraktu bramek |
| **3** | **Rozszerz audyt: `gate_history` w state + `answered_by` w dashboard** | P1 | Small | Resume consistency; operator visibility; accountability |

### Additional Recommendations

| # | Recommendation | Priority | Effort |
|---|----------------|----------|--------|
| 4 | Seed `advisor_*` w init scaffold + `orchestrator.options` (precedens `html_output`) | P0 | Small |
| 5 | Safety denylist jako normatywna tabela w §2 (fix-loop, rollback, scope, handoff) | P0 | Small |
| 6 | Kiro: rozszerz Headless Defaults 3B o advisor_mode rows + denylist halt | P1 | Medium |
| 7 | Cursor: dodaj `advisor` do readonly allowlist w `build.sh` step 11c | P1 | Small |
| 8 | Hooks: wspomnij advisor policy przy `advisor_enabled` (post-compaction survival) | P2 | Small |
| 9 | Dashboard viewer: badge „advisor: model” przy `answered_by === "advisor"` | P2 | Small |
| 10 | Copilot: udokumentuj degraded path (defaults/synthesis, no model split) | P2 | Small |
| 11 | Codex: template `advisor.toml` + init bootstrap do `.codex/agents/`; §2 branch `native subagent delegation` | P1 | Small |

### Implementation Phases

```
Phase 1 — Framework core (P0)
  orchestrator-patterns.md §2 advisor policy + adapter seam
  §4 options, §8 gate schema
  agents/advisor.md (recommendation-only, platform-specific read-only config)
  init/SKILL.md scaffold

Phase 2 — Safety routing (P0)
  Gate taxonomy allow/deny in §2
  Document denylist gates explicitly

Phase 3 — Audit persistence (P1)
  gate_history in orchestrator-state.yml
  dashboard.html advisor badge

Phase 4 — Platform transforms (P1)
  Kiro 3B Headless Defaults extension
  Cursor model-pinning/runtime smoke test; readonly only through supported build mechanism
  Codex: platforms/codex-cli/templates/advisor.toml + init scaffold
  Copilot headless defaults table (optional)

Phase 5 — Orchestrator SKILL.md (P2)
  „Advisor gate” block parallel to html_output Config gate (5 skills)

Phase 6 — Hooks & documentation (P2)
  Hook reminders, CLAUDE.md config section
```

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Cursor ignores advisor model | Treat separate-model mode as unavailable until runtime smoke test passes; fallback to recommendation-only on parent model |
| Copilot `ask_user` missing | Headless `--no-ask-user` + documented defaults |
| Kiro advisor invisible to user | CHAT GATE shows question + „(advisor selected: X)” |
| Gates skipped when advisor on | Recommendation-only contract: existing gate still asks user; no synthetic answer without a verified host API |
| Convergence batched | Advisor prompt: one area per invocation; prior answers in context |

---

## Appendices

### A. Complete Source List

| # | Source | Path / URL |
|---|--------|------------|
| 1 | Gate inventory | `analysis/findings/codebase-orchestrators-gates.md` |
| 2 | Documentation gates | `analysis/findings/documentation-orchestrator-gates.md` |
| 3 | Agents & models | `analysis/findings/codebase-agents-config-models.md` |
| 4 | Config extension | `analysis/findings/configuration-advisor-extension-points.md` |
| 5 | Anthropic Advisor Tool | `analysis/findings/external-anthropic-advisor-tool.md` |
| 6 | Platform constraints | `analysis/findings/external-platform-constraints.md` |
| 7 | Research brief | `planning/research-brief.md` |
| 8 | Research plan | `planning/research-plan.md` |
| 9 | Orchestrator patterns | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` |
| 10 | Anthropic Advisor Tool (external) | https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool |
| 11 | Claude Code subagents (external) | https://code.claude.com/docs/en/sub-agents |
| 12 | Cursor subagents model behavior (official docs) | https://cursor.com/docs/subagents |
| 13 | Cursor Task model limitation report | https://forum.cursor.com/t/task-tool-model-parameter-only-accepts-fast-cannot-specify-model-ids-for-subagents/156736 |
| 14 | GitHub Copilot CLI tools and `--no-ask-user` | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference |
| 15 | Copilot `ask_user` availability issue | https://github.com/github/copilot-cli/issues/1898 |
| 16 | Codex custom agents and model configuration | https://learn.chatgpt.com/docs/agent-configuration/subagents |

### B. Safety Denylist (Complete)

Advisor **MUST NOT** auto-answer when gate matches:

| Gate context | Orchestrator / phase | Reason |
|--------------|---------------------|--------|
| Fix-loop „proceed with known issues” | dev P11, perf P8, migr P7 | Quality/safety commitment |
| Fix-loop „skip fixing” | dev P11, perf P8 | Leaves defects unresolved |
| Rollback recommendation | implementation-plan-executor | User-confirmed rollback principle |
| Data integrity HALT | migration P7 | Irreversible data loss |
| `decisions_needed` scope expansion (critical) | dev P2 | Scope commitment |
| Final product-brief approval | product-design P8 | Development handoff |
| Failure recovery „skip subagent” | research, product-design | Hides failures |
| Critical verification unresolved (3 loops) | orchestrator-patterns §6 | Safety gate |
| Production readiness GO/NO-GO | verification phases | Deployment risk |

Advisor **MAY** recommend a default (interactive mode still requires user confirmation):

- Phase-exit „Continue to Phase N?”
- Optional phase enable (audit, E2E, brainstorming, design)
- Clarifying questions (max-N pre-analysis)
- Verification matrix multiselect (recommended checks)
- Convergence per-area (sequential, one advisor call per area)

### C. Proposed Advisor Agent Shape

```yaml
---
name: advisor
description: Recommends answers to orchestrator phase-gate questions. Non-interactive — returns a structured recommendation or escalates to the user.
model: <verified-platform-model>   # configurable via advisor_model; do not hardcode an unverified slug
color: purple
---
```

Response contract:

```yaml
selected_option: "Continue to Phase 5"
rationale: "Specification complete; no open critical risks in artifact TL;DR."
confidence: high
escalate_to_user: false   # true for denylisted gates, ambiguity, or insufficient context
```

### G. Correctness Boundary: Recommendation vs Auto-Answer

The current plugin contract defines a gate as a real user interaction: the orchestrator invokes the platform's gate mechanism and waits for a response before marking the phase complete. A Task/subagent result is only a recommendation unless the host platform exposes a tested API for injecting a synthetic answer or running the workflow in a documented headless mode.

Therefore the implementation must choose explicitly:

| Mode | Advisor role | Gate behavior | Portability |
|------|--------------|---------------|-------------|
| `recommendation` | Selects an option and explains why | User sees the recommendation and confirms through the normal gate | Portable baseline |
| `headless` | Selects an option or uses documented default | Host runs without interactive gate | Platform-specific; must be tested per platform |
| `synthetic-answer` | Supplies a machine-readable answer to the host | Runtime injects answer without user interaction | Not demonstrated by current Markdown/plugin contract |

The MVP recommendation is `recommendation`. Do not describe it as “answering instead of the user” until a runtime smoke test proves the third mode.

### D. Gaps and Uncertainties

- Cursor Task `model` slug allowlist beyond fast-tier ban — not verified in codebase
- Copilot custom agent model pinning — not in Maister transform pipeline
- Codex advisor spawn at gate — structural path clear; live runtime smoke deferred (jak cały Codex MVP)
- Product-design Phases 0–1 implicit gate question text
- Anthropic AUQ regression in skills (#34592) — version-specific

### E. Methodology Details

Parallel 6-gatherer triangulation per `planning/research-plan.md`. Synthesis cross-referenced all 6 findings for convergent claims. Confidence scored per claim: High = multiple direct sources; Medium = single source or inference from precedent; Low = unverified external behavior.

### F. Revision: Codex Feasibility (2026-07-11)

**Trigger:** Follow-up review — pierwotna ocena „Low” myliła ograniczenie **plugin MVP** z ograniczeniem **platformy Codex**.

**Co się zmieniło:**

| Aspekt | Pierwotna ocena | Skorygowana ocena |
|--------|-----------------|-------------------|
| Codex feasibility | Low — orchestrator-only, no model split | **Medium–High** — native subagent + custom agent TOML |
| Przyczyna „Low” | Brak `agents/` w `maister-codex` output | Świadoma polityka MVP (`smoke-cli.sh` FAIL przy plugin root `agents/`), nie brak API |
| Model advisora | „Host only” | `model` w `.codex/agents/advisor.toml`; wartość seedowana z `advisor_model` przy init |
| Osobny kontekst | Nie rozważono | Tak — osobny *agent thread*; parent dostaje summary ([Codex subagents docs](https://learn.chatgpt.com/docs/agent-configuration/subagents)) |
| Ścieżka implementacji | Tekst orchestratora | `native subagent delegation` → spawn agent `advisor` + init bootstrap |

**Dlaczego nie bundle w pluginie:** `platforms/codex-cli/smoke-cli.sh` wymaga braku `agents/` u roota pluginu. Rozwiązanie: template w `platforms/codex-cli/templates/advisor.toml`, kopiowany do **projektu** `.codex/agents/advisor.toml` przez `/maister:init` (analogicznie do planowanego opt-in bootstrap z tasku `codex-native-support`).

**Proponowany shape TOML (skrót):**

```toml
name = "advisor"
description = "Answers orchestrator phase-gate questions on behalf of the user."
model = "gpt-5.6-terra"   # z config advisor_model przy scaffoldzie
sandbox_mode = "read-only"
developer_instructions = """
Return structured gate decision only. No code edits. escalate_to_user when denylist matches.
"""
```

**Opcjonalny fallback:** `codex exec -m <model> --output-schema` dla CI/automation — nie główna ścieżka interaktywnego workflow.

---

*Synthesis companion: `analysis/synthesis.md`*
