# Synthesis: Advisor Mode for Maister Orchestrators

## TL;DR

Advisor mode powinien działać **wyłącznie na poziomie orchestratora (parent)** w kanonicznym cyklu bramki z `orchestrator-patterns.md` §2 — po przepisaniu dashboardu, przed oznaczeniem fazy jako `completed`. Wzorzec przenośny to **Task-tool advisor subagent** jako rekomendujący (`agents/advisor.md`); na Codex możliwy jest **native subagent delegation** do custom agenta `advisor` (`.codex/agents/advisor.toml`). Nie natywny Anthropic Advisor Tool API (Claude API only). Konfiguracja: `advisor_enabled` / `advisor_model` / `advisor_agent` w `.maister/config.yml` → seed do `orchestrator.options`. Feasibility: wysoka dla konsultacji na Claude/Kiro/Codex, warunkowa na Cursor, częściowa na Copilot. Pełny auto-answer wymaga osobnego runtime/API albo platformowego headless path.

## Key Decisions

- **Punkt polityki**: §2 definiuje wspólną kolejność i zasady, ale nie jest wykonywalnym interceptorem; call-site'y/runtime adaptery nadal trzeba zaimplementować.
- **Wzorzec przenośny**: Task → `advisor` subagent jako structured recommendation zamiast native `advisor_20260301` API.
- **Recommendation-only MVP**: bramka nadal pyta użytkownika; advisor dostarcza rekomendację i uzasadnienie.
- **Denylist per gate-type** — `advisor_enabled` ≠ automatyczna akceptacja; denylisted gates zwracają `escalate_to_user`.
- **Audyt**: rozszerzyć `phases[].gate` + `orchestrator.gate_history` w state (dashboard nie przetrwa resume sam).

## Open Questions / Risks

- Cursor Task `model` param — forum bugi o parent override; osobny model advisora **medium confidence**.
- Copilot `ask_user` — regresja #1898; headless wymaga `--no-ask-user` + defaults.
- Kiro interactive UX — advisor odpowiada, ale CHAT GATE nadal wymaga prezentacji w czacie lub headless 3B.
- Brak `agents/advisor.md` — greenfield; pierwszy agent z non-inherit `model:` w repo.

---

## Research Question

Jak dodać opcję advisor mode w Maister, która deleguje pytania bramek workflow do dedykowanego agenta z osobnym modelem odpowiadającego zamiast użytkownika?

---

## Executive Summary

Sześć niezależnych gathererów potwierdza spójny obraz: Maister ma **33 unikalne bramki wyjściowe** i około **75+ zidentyfikowanych miejsc interaktywnych** w pięciu orchestratorach. Subagenty **nie mają** kanału użytkownika (`AskUserQuestion` zbanowane w subagentach — potwierdzone w docs Anthropic i issue GitHub). Advisor musi więc działać na **orchestratorze rodzica**.

Anthropic Advisor Tool to inspiracja dla **rozdziału executor/advisor model**, ale mechanizm API (`advisor_20260301`, server-side w jednym `/v1/messages`) nie mapuje się na bramki fazowe markdown pluginu i nie jest dostępny na Cursor/Copilot/Kiro/Codex. Przenośna implementacja to nowy agent `advisor` wywoływany przez Task tool przed bramką, zwracający strukturalną rekomendację. Nie znaleziono mechanizmu, który automatycznie wstrzykuje tę rekomendację do `AskUserQuestion`.

Konfiguracja powinna naśladować precedens `html_output`: klucze w `.maister/config.yml`, seed raz przy init do `orchestrator.options`, runtime czyta tylko state. Audyt przez rozszerzenie `phases[].gate` w dashboard i nowe `gate_history` w `orchestrator-state.yml`.

---

## Cross-Source Analysis

### Validated Findings (multi-source confirmation)

| Finding | Sources | Confidence |
|---------|---------|------------|
| Bramki wymagają `AskUserQuestion` przed `completed` | codebase-orchestrators, documentation, hooks | **High** |
| Subagenty nie mogą używać `AskUserQuestion` | external-anthropic, documentation, codebase-agents | **High** |
| `html_output` seed pattern: config → options → state | documentation, configuration | **High** |
| 26 agentów w SOT: 23 jawne `model: inherit`, 3 bez pola; brak pinned model | codebase-agents-config | **High** |
| Platform transforms: AskQuestion / ask_user / CHAT GATE / plain-text | external-platform-constraints, documentation | **High** |
| `phases[].gate: {question, answer}` — audit point | configuration, documentation, codebase-orchestrators | **High** |
| Kiro headless defaults (3B) już auto-odpowiadają | external-platform-constraints | **High** |

### Contradictions Resolved

| Tension | Resolution |
|---------|------------|
| Brief używa `advisor_mode`; config finding proponuje `advisor_enabled` | Preferuj `advisor_enabled` (boolean jak `html_output`); alias w docs opcjonalny |
| Anthropic Advisor Tool vs Maister advisor | Literatura = model split + cost; implementacja = Task subagent at gate boundary |
| Kiro headless „proceed” vs advisor | Advisor mode **rozszerza** tabelę 3B, nie zastępuje — denylist wymaga real chat reply nawet w `--no-interactive` |
| Gates „still fire” vs advisor auto-answer | W recommendation-only advisor dostarcza rekomendację, a użytkownik nadal odpowiada; synthetic answer wymaga osobnego, potwierdzonego API |

### Confidence Assessment Summary

| Area | Level |
|------|-------|
| Gate inventory & lifecycle | High |
| Orchestrator-only insertion | High |
| Platform transform survival | High |
| Config schema shape | Medium (inferred from `html_output`) |
| Separate advisor model on Cursor | Low–Medium |
| Copilot advisor with distinct model | Low |
| Codex model via `.codex/agents/advisor.toml` | Medium–High (init bootstrap; plugin root agents/ banned by MVP smoke) |

---

## Patterns and Themes

### P1: Centralized Gate Contract (Architectural)

**Description**: Wszystkie orchestratory delegują semantykę bramek do `orchestrator-patterns.md` §2/§3.

**Evidence**: 5 SKILL.md + hooks + dashboard schema.

**Prevalence**: Universal.

**Quality**: Mature, documented, hook-enforced.

**Advisor implication**: §2 centralizuje politykę i lifecycle, ale nie jest wykonywalnym interceptorem; call-site'y lub runtime adaptery nadal wymagają implementacji.

### P2: Parent-as-User-Channel (Design)

**Description**: Subagenty zwracają `decisions_needed`; orchestrator jest jedynym kanałem do użytkownika.

**Evidence**: §2 anti-pattern „subagent autonomy → skip gate”; `solution-brainstormer` explicit non-interactive.

**Advisor implication**: Advisor jest konsultantem na poziomie parent, nie „syntetycznym użytkownikiem”; bez host API nie może sam zakończyć interaktywnej bramki.

### P3: Config Seed-Once (Implementation)

**Description**: `.maister/config.yml` → `orchestrator.options` at init → state-only reads.

**Evidence**: `html_output` w §4/§5, init SKILL.md, live state files.

**Advisor implication**: `advisor_enabled`, `advisor_model`, `advisor_agent` follow same 3-step pattern.

### P4: Platform Compile-Time Transforms (Integration)

**Description**: SOT pisze `AskUserQuestion` + `Task tool`; build.sh kompiluje per platformę.

**Evidence**: 5× `build.sh`, Kiro validate rules 11/25/30.

**Advisor implication**: Advisor logic w SOT musi używać `AskUserQuestion` i `Task tool` — nigdy `CHAT GATE` w źródle.

### P5: Headless-as-Naive-Advisor (Organizational — Kiro/Copilot)

**Description**: `--no-interactive` + Headless Defaults już auto-wybierają „recommended”.

**Evidence**: Kiro 3B table, Copilot `--no-ask-user`.

**Advisor implication**: Prawdziwy advisor_mode musi być rozróżniony od dumb defaults; denylist gates wymagają halt.

---

## Key Insights

### I1: Highest-Leverage Insertion = Framework §2 Interceptor

**Evidence**: codebase-orchestrators ranked insertion #1; documentation gate lifecycle trace.

**Implication**: Phase 1 implementacji = edycja `orchestrator-patterns.md`, nie 5 orchestratorów.

**Confidence**: High.

### I2: Gate Taxonomy Drives Safety Routing

**Evidence**: 9 gate types catalogued (phase-exit, decisions-needed, convergence, fix-loop, etc.).

**Implication**: `advisor_enabled` global + per-type allow/deny matrix; convergence wymaga sequential advisor calls.

**Confidence**: High.

### I3: First Non-Inherit Model Precedent

**Evidence**: 0 pinned agents today; SOT contains 26 agents (23 explicit `inherit`, 3 without the field), plus Cursor's platform-specific `explore`; Kiro Rule 30 forbids `inherit` in JSON output only.

**Implication**: `advisor.md` z `model: <slug>` będzie pierwszym pinned agentem; Kiro auto-emits JSON model field.

**Confidence**: High for Kiro mechanism; Low–Medium for Cursor model selection.

### I4: Anthropic Advisor Tool ≠ Gate Mechanism

**Evidence**: external-anthropic comparison table; API is mid-generation server-side tool.

**Implication**: Cytuj jako literaturę cost/quality; implementuj Task subagent.

**Confidence**: High.

### I5: Audit Gap Between Dashboard and State

**Evidence**: configuration finding — `gate` only in `dashboard-data.js`, lost on resume.

**Implication**: `gate_history` in `orchestrator-state.yml` mandatory for advisor accountability.

**Confidence**: High.

---

## Relationships and Dependencies

```
.maister/config.yml
    │ seed (init §5 step 4)
    ▼
orchestrator-state.yml → orchestrator.options.advisor_*
    │
    ├─► orchestrator-patterns.md §2 gate lifecycle
    │       │
    │       ├─ [advisor_allowed?] ──NO──► AskUserQuestion (user)
    │       │
    │       └─ YES ──► Task tool → agents/advisor.md
    │                    │
    │                    ▼
    │              structured recommendation
    │                    │
    │                    ▼
    │              show recommendation to user
    │                    │
    │                    ▼
    │              user confirms through existing gate
    │                    │
    │                    ▼
    │              record gate + gate_history → phase completed
    │
    └─► dashboard-data.js (phases[].gate audit)
            │
            ▼
        dashboard.html viewer (optional advisor badge)

Platform build.sh transforms (parallel):
  AskUserQuestion → AskQuestion | ask_user | CHAT GATE | plain-text
  Task tool → subagent tool | native subagent delegation
```

**Dependency chain**: advisor agent → framework §2 → init scaffold → dashboard schema → platform transforms (Kiro 3B) → hooks reminders.

---

## Gaps and Uncertainties

| Gap | Impact | Mitigation |
|-----|--------|------------|
| Brak `agents/advisor.md` | Blocker for Phase 1 | Create in implementation workflow |
| Cursor Task model override bug | Advisor may inherit parent model | Prefer agent frontmatter; test on Cursor |
| Copilot `ask_user` availability | Gates may fail silently | Document fallback; headless defaults table |
| Codex plugin root agents/ banned | Init bootstrap `.codex/agents/advisor.toml` from template | Native subagent + separate model/thread |
| Product-design Phases 0–1 implicit gate text | Advisor must infer continue intent | Pass phase summary as context |
| AUQ regression in skills (#34592) | Orchestrator gates may break on some CC versions | Version note in docs |

---

## Synthesis by Framework (Mixed)

### Technical: Component Analysis

| Component | Exists | Advisor change |
|-----------|--------|----------------|
| `orchestrator-patterns.md` §2 | Yes | Add advisor branch in gate lifecycle |
| `orchestrator-patterns.md` §4 | Yes | Add `advisor_*` options |
| `orchestrator-patterns.md` §8 | Yes | Extend `gate` schema |
| `agents/advisor.md` | **No** | Create |
| `.maister/config.yml` keys | **No** | Extend init scaffold |
| Hooks | Yes | Mention advisor policy when enabled |
| Kiro Headless Defaults 3B | Yes | Add advisor rows + denylist overrides |

### Technical: Flow Analysis

Canonical advisor-enabled gate flow:

1. Phase work completes → context extraction
2. Rewrite `dashboard-data.js` (status `in_progress`)
3. Classify gate type → check denylist
4. If allowed + `advisor_enabled`: Task → advisor with question + options + artifact TL;DR + prior gate answers
5. Validate the advisor recommendation and record it as pending recommendation
6. Present the recommendation through the existing user gate
7. Record `{question, answer, answered_by, advisor_model, advisor_rationale}` in gate + `gate_history` after a real user response
8. Mark phase `completed`

### Literature: Trade-Off Analysis

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Native Advisor Tool API | Server-side, billing transparent | Claude API only; not in plugin | Out of scope |
| Task advisor subagent | Multi-platform; matches Maister delegation | Extra latency/cost per gate; does not itself answer the gate | **Recommended for consultation** |
| Headless defaults only | Already exists on Kiro | No separate model; no audit | Insufficient alone |
| Skip gates when advisor on | Simplest | Breaks „gates fire regardless” | **Rejected** |

### Requirements: Safety Denylist

Gates where advisor **MUST NOT** auto-answer (escalate to user):

| Gate type | Examples | Rationale |
|-----------|----------|-----------|
| `fix-loop` skip/proceed-as-is | dev P11, perf P8, migr P7 | User-confirmed rollback principle |
| Rollback / HALT | migration data integrity | Irreversible |
| `decisions-needed` scope expansion | dev P2 gap-analyzer critical | Scope commitment |
| Final handoff approval | product-design P8 | Development handoff |
| Failure recovery skip | research/product-design | Hides subagent failures |
| Critical verification unresolved | §6 after 3 reverify loops | Safety |
| Subagent failure rollback option | implementation-plan-executor | User-confirmed rollback |
| Production deploy gates | `production_check_enabled` paths | Deployment risk |

Gates where advisor **MAY** recommend a default (the user still confirms in interactive mode):

| Gate type | Default behavior |
|-----------|------------------|
| `phase-exit` continue | Accept „Continue to Phase N?” |
| `optional-phase` enable | Follow recommended (audit on, E2E off, etc.) |
| `clarify` | Recommend only; user-specific facts require escalation |
| `verify-matrix` | Run recommended checks |
| `convergence` | Sequential per-area (never batch) |

---

## Conclusions

### Primary Conclusions

1. **Advisor policy belongs in orchestrator-patterns.md §2** — between dashboard pre-gate rewrite and phase completion; §2 is not itself an executable interceptor. Confidence: **High**.

2. **Portable pattern is Task-tool advisor subagent as recommendation-only consultant**, not Anthropic Advisor Tool API. Confidence: **High**.

3. **Config schema**: `advisor_enabled` (default false), `advisor_model` (null), `advisor_agent` ("advisor") in config.yml → `orchestrator.options`. Confidence: **Medium**.

4. **Platform feasibility**: Claude/Kiro/Codex support a consultation path; Cursor is conditional because separate-model runtime behavior is unresolved; Copilot remains partial. Confidence: **High** for transforms; **Medium–High** for Codex model separation.

5. **Safety denylist is mandatory** — global enable ≠ universal auto-answer. Confidence: **High**.

### Revision note (2026-07-11)

Pierwotna ocena Codex jako „orchestrator-only / Low” wynikała z polityki MVP (`smoke-cli.sh` zabrania `agents/` w pluginie), nie z braku wsparcia platformy. Codex subagents mają osobny agent thread; custom agent TOML wspiera `model` i `sandbox_mode`. Szczegóły: `outputs/research-report.md` Appendix F.

### Secondary Conclusions

- Convergence loops require N sequential advisor invocations, not batched AskUserQuestion.
- Dashboard viewer needs minor update for `answered_by: advisor` badge.
- Hooks should mention advisor policy to survive post-compaction.
- `task-classifier` AskUserQuestion pattern is anti-pattern for advisor agent design.

### Recommendations (Implementation Phases)

| Phase | Scope | Effort |
|-------|-------|--------|
| **1 — Framework core** | `orchestrator-patterns.md` §2 advisor policy + adapter seam, §4 options, §8 gate schema; `agents/advisor.md`; init scaffold | Medium |
| **2 — Safety routing** | Gate taxonomy allow/deny rules in §2; document denylist | Small |
| **3 — Audit persistence** | `gate_history` in state; dashboard viewer badge | Small |
| **4 — Platform transforms** | Kiro interactive/headless split; Cursor model-pinning runtime smoke test; Codex `advisor.toml` template + init bootstrap; Copilot headless table | Medium |
| **5 — Orchestrator SKILL.md** | Parallel „Advisor gate” block (like Config gate for html_output) in 5 skills | Small |
| **6 — Hooks & docs** | Hook reminders; CLAUDE.md config section | Small |

---

## Source Integration

| Gatherer file | Key contribution |
|---------------|------------------|
| `codebase-orchestrators-gates.md` | Gate inventory, taxonomy, insertion ranking |
| `documentation-orchestrator-gates.md` | Normative contracts, anti-patterns, escalation |
| `codebase-agents-config-models.md` | Model frontmatter, Task tool, platform transforms |
| `configuration-advisor-extension-points.md` | Config schema proposal, gate audit extension |
| `external-anthropic-advisor-tool.md` | API semantics, subagent AUQ ban, portable fallback |
| `external-platform-constraints.md` | Per-platform feasibility matrix, SOT authoring rules |

**Patterns identified**: 5  
**Key insights**: 5  
**Overall confidence**: **Medium-High**
