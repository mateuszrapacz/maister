# Orchestrator Phase Gates — Codebase Inventory

## TL;DR

Five orchestrator skills (`development`, `research`, `migration`, `performance`, `product-design`) share a common gate contract from `orchestrator-patterns.md` §2: finish phase work → rewrite `dashboard-data.js` (when `html_output` true) → invoke `AskUserQuestion` → receive answer → only then mark phase completed. There are **34 explicit `→ MANDATORY GATE` markers** across the five orchestrators (development 12 phase-exit + 1 serialization reference, research 3, product-design 5, performance 7, migration 6), plus dozens of in-phase `AskUserQuestion` sites (clarifications, `decisions_needed`, convergence loops, fix-loops). **No advisor agent or `advisor_mode` config exists today** — advisor insertion belongs at the orchestrator parent layer, ideally as a single interception wrapper around every `AskUserQuestion` call site defined in `orchestrator-patterns.md` §2 and replicated per SKILL.md.

## Key Decisions

- **Gate taxonomy for advisor routing**: classify as (A) phase-exit `MANDATORY GATE`, (B) `decisions_needed` triage, (C) optional-phase enable, (D) in-phase interactive/convergence, (E) fix-loop / rollback — each needs different advisor safety rules.
- **State ordering is non-negotiable**: `dashboard-data.js` rewrite BEFORE exit gate; phase `completed` only AFTER answer (`orchestrator-patterns.md:64`, all orchestrator SKILL.md entry self-checks).
- **`decisions_needed` is development-only today** among the five orchestrators; research/product-design use sequential convergence loops with stricter one-question-per-call rules.
- **Hooks reinforce gates post-compaction**: `post-compact-reminder.sh` and `skill-invocation-reminder.sh` inject AskUserQuestion reminders — advisor mode must survive compaction.

## Open Questions / Risks

- **Product-design Phases 0–1**: `MANDATORY GATE` markers at end of Phase 0 and Phase 1 lack explicit follow-up question text (unlike other orchestrators) — advisor must infer "continue?" from preceding in-phase AskUserQuestion.
- **Development Phase 10**: `MANDATORY GATE` follows Q1–Q3 verification-option questions with no additional question line — gate certifies the Q1–Q3 sequence, not a separate continue prompt.
- **Development Phase 6 / Performance Phase 4**: two-step gate (run-audit? → audit summary → continue) — advisor needs artifact-aware context for both steps.
- **Safety denylist gates** (fix-loop skip, rollback, scope expansion, proceed-with-known-issues) are high-risk for auto-answer — need explicit routing exclusions in advisor design.
- **Convergence loops** (research Phase 4, product-design Phase 5) are N× sequential gates — advisor must not batch despite AskUserQuestion supporting up to 4 questions per call.

---

## Gate Lifecycle (Framework Contract)

**Source**: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` §2, §3, §8

### Sequence

```
finish phase work
  → extract structured subagent fields to state (e.g. task_characteristics)
  → rewrite dashboard-data.js (status stays in_progress; register artifacts/summary/decisions/risks)
  → invoke AskUserQuestion (MANDATORY GATE)
  → receive user response
  → record gate answer in dashboard phases[].gate {question, answer}
  → update orchestrator-state.yml / TaskUpdate to completed
  → next phase entry self-check verifies prior AskUserQuestion call ID exists
```

### State Ordering Rule

> Phase state MUST NOT be updated to 'completed' until AFTER the user responds to the exit gate.

**Evidence**: `orchestrator-patterns.md:64`

### Permission / Session Overrides

All five orchestrators duplicate Step 0: `MANDATORY GATE` markers fire regardless of auto/acceptEdits/bypassPermissions, session-reminders, or prior approval patterns (`development/SKILL.md:19`, same block in research/migration/performance/product-design).

### AUTO-CONTINUE (No Gate)

Phases ending with `→ **AUTO-CONTINUE**` skip AskUserQuestion. Example: development Phase 1 (`development/SKILL.md:139`).

### Dashboard `gate` Schema

**Source**: `orchestrator-patterns.md:443-478`

```js
phases: [{
  // ...
  gate: null  // {question, answer} after the exit gate fires
}]
```

**Rewrite triggers involving gates** (`orchestrator-patterns.md:443-450`):
1. At initialization
2. When phase starts (`in_progress`)
3. **BEFORE firing every phase exit gate** (artifacts registered; status stays `in_progress`)
4. After phase completes / skipped
5. **After every gate decision** (record user's choice)
6. After verification cycles
7. At finalization

### `decisions_needed` Pattern (§3)

When subagent returns `decisions_needed.critical` or `.important`:
1. Parse all decisions
2. Present via AskUserQuestion — critical: one call each; important: up to 4 questions in one call
3. SELF-CHECK all decisions presented

**Scope override**: research Phase 4 and product-design convergence override grouping — strictly ONE question per call per decision area.

### Hook Reinforcement

| Hook | File | Gate reminder |
|------|------|---------------|
| Post-compaction | `plugins/maister/hooks/post-compact-reminder.sh` | Must use AskUserQuestion at Phase Gates |
| Skill invocation | `plugins/maister/hooks/skill-invocation-reminder.sh` | AskUserQuestion at every `→ Pause` / `→ MANDATORY GATE`; decide policy once at entry |

---

## Gate Count Summary

| Orchestrator | `MANDATORY GATE` markers | Phase-exit gates (unique) | Additional AskUserQuestion sites (approx.) |
|--------------|--------------------------|---------------------------|---------------------------------------------|
| **development** | 12 (+1 ref in serialization note) | 12 | ~25+ (clarifications, decisions_needed, spec-audit prompt, verification Q1–Q3, fix-loop) |
| **research** | 3 | 3 | ~10+ (optional phases, convergence N×areas, design prefs, failure recovery) |
| **product-design** | 5 | 5 | ~20+ (init context, exploration loops, convergence, refinement, final approval) |
| **performance** | 7 | 7 | ~12+ (clarifications, priorities, spec-audit, verification options, fix-loop) |
| **migration** | 6 | 6 | ~10+ (clarifications, requirements, fix-loop) |
| **Total** | **33–34** | **33** | **~75+** |

*Note: development line 492 counts a MANDATORY GATE mention inside a serialization warning — not a separate gate site.*

---

## Per-Orchestrator Gate Catalog

### 1. Development (`plugins/maister/skills/development/SKILL.md`)

**Phases**: 14 (conditional: 3 TDD red, 4 UI mockups, 9 TDD green, 12 E2E, 13 user docs)

#### Phase-Exit `MANDATORY GATE` Sites

| After Phase | Gate question (summary) | Conditional |
|-------------|-------------------------|-------------|
| 2 Gap analysis | Executive summary + route to Phase 3/4/5 | Always (preceded by optional `decisions_needed` gate) |
| 3 TDD red | "Continue to Phase 4?" | `has_reproducible_defect` |
| 4 UI mockups | "Continue to Phase 5?" | `ui_heavy` |
| 5 Specification | Executive summary + "Continue to specification audit?" | Always |
| 6 Spec audit | Executive summary + "Continue to implementation planning?" | Always (after optional run-audit prompt) |
| 7 Planning | Executive summary + "Continue to implementation?" | Always |
| 8 Implementation | Executive summary + "Continue to verification?" | Always |
| 9 TDD green | "Continue to Phase 10?" | Phase 3 executed |
| 10 Verification options | Q1–Q3 multiselect (verifications, E2E, user docs) then MANDATORY GATE marker | Always |
| 11 Verification/fix | Executive summary + "Continue to Phase 12?" | Always |
| 12 E2E | "Continue to Phase 13?" | `e2e_enabled` |
| 13 User docs | "Continue to Phase 14?" | `user_docs_enabled` |

**Evidence — Phase 2 dual gate** (`development/SKILL.md:155-180`):

```markdown
**⛔ DECISION GATE** (mandatory — do NOT skip):
- Parse `decisions_needed` from gap-analyzer output
...
→ **MANDATORY GATE**
The Phase 2 exit gate **always** invokes `AskUserQuestion`.
```

#### Non-Exit AskUserQuestion Sites

| Location | Type | Notes |
|----------|------|-------|
| Phase 1 | Clarifications | Max 5 critical questions; AUTO-CONTINUE after |
| Phase 2 | `decisions_needed` | Critical: 1 call/decision; important: up to 4/call |
| Phase 5 Part A | Technical/architecture | 3–5 questions or approach selection |
| Phase 5 Part B | Requirements | 2–8 adaptive confirmable-assumption questions |
| Phase 6 (pre-audit) | Optional enable | "Run specification audit? (Recommended)" |
| Phase 10 Step 2 | Verification matrix | Q1 multiselect verifications; Q2 E2E; Q3 user docs |
| Phase 11 Step 4 | Fix-loop | Which issues to fix; re-run verification; max-iter proceed/stop |

#### Advisor Safety Flags (development)

- **HIGH RISK**: Phase 11 fix-loop skip, proceed-with-known-critical-issues, max-iter "Proceed with known issues?"
- **MEDIUM**: Phase 2 `decisions_needed` scope expansion
- **LOWER**: Executive-summary continue gates with recommended default

---

### 2. Research (`plugins/maister/skills/research/SKILL.md`)

**Phases**: 6 (3–5 conditional on brainstorming/design flags)

#### Phase-Exit `MANDATORY GATE` Sites

| After Phase | Gate question | Conditional |
|-------------|---------------|-------------|
| 1 Foundation | "Continue to brainstorming evaluation?" | Always |
| 4 Convergence | "Continue to high-level design?" | `brainstorming_enabled` |
| 5 Design | "Continue to output generation?" | `design_enabled` |

**Evidence** (`research/SKILL.md:198-200`):

```markdown
→ **MANDATORY GATE**
AskUserQuestion - "Research foundation complete ... Continue to brainstorming evaluation?"
```

#### Non-Exit AskUserQuestion Sites

| Location | Type | Notes |
|----------|------|-------|
| Phase 2 | Optional phase enable | Brainstorming on/off; design on/off (skippable via CLI flags) |
| Phase 4 | Convergence loop | **ONE question per decision area** — anti-batch rules (`research/SKILL.md:277-295`) |
| Phase 5 Part B | Design preferences | Architectural constraints before designer subagent |
| Phase 3/5 | Failure recovery | Retry or skip on missing artifacts |

#### Advisor Safety Flags (research)

- **HIGH RISK**: Phase 4 convergence — sequential dependency between areas; advisor must not batch
- **MEDIUM**: Phase 2 optional-phase toggles (brainstorm/design)
- **LOWER**: Phase 1/5 exit continue gates

---

### 3. Product-Design (`plugins/maister/skills/product-design/SKILL.md`)

**Phases**: 9 (0–8; 3 personas conditional; 7 visual conditional)

#### Phase-Exit `MANDATORY GATE` Sites

| After Phase | Gate question | Conditional |
|-------------|---------------|-------------|
| 0 Initialize | *(marker only — no explicit continue text)* | Always |
| 1 Context synthesis | *(marker only — preceded by corrections AskUserQuestion)* | Always |
| 3 Personas | "Continue to Idea Generation?" | `is_greenfield OR is_complex` |
| 5 Idea convergence | "Continue to Feature Specification?" | Always |
| 7 Visual prototyping | "Continue to Review & Handoff?" | `is_ui_focused` |

**Evidence** (`product-design/SKILL.md:390-392`):

```markdown
→ **MANDATORY GATE**
AskUserQuestion — "Personas defined. Continue to Idea Generation?"
```

#### Non-Exit AskUserQuestion Sites

| Location | Type | Notes |
|----------|------|-------|
| Phase 0 | Context gathering | Additional context; URLs; research topics; characteristics confirm |
| Phase 1 | Synthesis review | Corrections before problem exploration |
| Phase 2 | Problem exploration | N questions + refinement loop + phase routing continue |
| Phase 3 | Persona exploration | One-at-a-time + refinement loop |
| Phase 5 | Convergence | One question per decision area (same anti-batch as research) |
| Phase 6 | Spec refinement | Per-section approve/revise loop |
| Phase 7 | Mockup refinement | Per-mockup approve/revise loop |
| Phase 8 | Final approval | Approve brief / revise section / add info |

#### Advisor Safety Flags (product-design)

- **HIGH RISK**: Phase 8 final product-brief approval (handoff to development)
- **HIGH RISK**: Phase 5 convergence decisions
- **MEDIUM**: Phase 2/6/7 refinement loops (scope/constraint changes)
- **LOWER**: Phase routing continues

---

### 4. Performance (`plugins/maister/skills/performance/SKILL.md`)

**Phases**: 9 (mirrors development pipeline minus TDD/UI/E2E/docs)

#### Phase-Exit `MANDATORY GATE` Sites

| After Phase | Gate question | Conditional |
|-------------|---------------|-------------|
| 2 Bottleneck analysis | Bottleneck counts + "Continue to specification?" | Always |
| 3 Specification | Executive summary + "Continue to specification audit?" | Always |
| 4 Spec audit | Executive summary + "Continue to implementation planning?" | Always |
| 5 Planning | Executive summary + "Continue to implementation?" | Always |
| 6 Implementation | Executive summary + "Continue to verification?" | Always |
| 7 Verification options | "Options selected. Continue to Phase 8?" | Always |
| 8 Verification/fix | Executive summary + "Continue to finalization?" | Always |

#### Non-Exit AskUserQuestion Sites

| Location | Type | Notes |
|----------|------|-------|
| Phase 1 | Clarifications | Max 5 performance questions |
| Phase 2 | Profiling data | If user data empty |
| Phase 3 | Optimization priorities | In-phase |
| Phase 4 (pre-audit) | Optional enable | "Run specification audit?" |
| Phase 7 | Verification multiselect | Additional verification checks |
| Phase 8 | Fix-loop | Same pattern as development Phase 11 |

---

### 5. Migration (`plugins/maister/skills/migration/SKILL.md`)

**Phases**: 8 (7 fix-loop optional; 8 docs optional)

#### Phase-Exit `MANDATORY GATE` Sites

| After Phase | Gate question | Conditional |
|-------------|---------------|-------------|
| 2 Gap analysis | Executive summary + "Continue to migration strategy?" | Always |
| 3 Strategy/spec | Executive summary + "Continue to implementation planning?" | Always |
| 4 Planning | Executive summary + "Continue to execute migration?" | Always |
| 5 Execution | Executive summary + "Continue to verification?" | Always |
| 6 Verification | Executive summary + "Continue to Phase [7 or 8]?" | Always |
| 7 Fix-loop | Executive summary + "Continue to documentation?" | When fix phase runs |

#### Non-Exit AskUserQuestion Sites

| Location | Type | Notes |
|----------|------|-------|
| Phase 1 | Clarifications | Max 5 migration scope questions |
| Phase 3 | Requirements | 3–5 migration-specific questions |
| Phase 7 | Fix-loop | Which issues; re-run verification |
| Phase 7 | HALT conditions | Data integrity → recommend rollback (not AskUserQuestion — advisor must not auto-approve) |

**Evidence — rollback halt** (`migration/SKILL.md:280-281`):

```markdown
- ❌ Data integrity issues → HALT immediately, recommend rollback
```

---

## Gate Type Taxonomy (Advisor Routing)

| Type | ID | Description | Orchestrators | Advisor default |
|------|----|-------------|---------------|-----------------|
| Phase exit | `phase-exit` | `MANDATORY GATE` after delegated work | All 5 | Auto-answer with recommended continue |
| Decision triage | `decisions-needed` | Subagent `decisions_needed` parsing | development (gap-analyzer) | Context-dependent; scope = denylist |
| Optional enable | `optional-phase` | Enable/disable brainstorming, design, audit, E2E | research, development, performance | Follow recommended default |
| In-phase clarify | `clarify` | Max-N clarifying questions before analysis | development, performance, migration | Lower risk |
| Convergence | `convergence` | Sequential one-question-per-area | research P4, product-design P5 | **No batching**; sequential only |
| Refinement loop | `refine` | Approve/revise iterations | product-design P2/3/6/7/8 | Medium risk on scope changes |
| Verification matrix | `verify-matrix` | Multiselect verification options | development P10, performance P7 | Follow recommended selections |
| Fix-loop | `fix-loop` | Issue selection, re-verify, proceed-as-is | development P11, performance P8, migration P7 | **Denylist** skip/proceed-as-is |
| Failure recovery | `failure-recovery` | Retry/skip on subagent failure | research, product-design | Ask user or halt |

---

## Top Advisor Insertion Points

Ranked by leverage (single change → broad coverage):

### 1. Framework §2 Gate Policy / Adapter Seam (Highest Leverage)

**Where**: `orchestrator-patterns.md` §2 — add advisor-mode branch in the canonical gate lifecycle:
- If `options.advisor_enabled` → consult advisor agent (Task tool) with gate question + dashboard context + artifact TL;DR
- Record `gate.advisor_answer`, `gate.advisor_model`, `gate.user_override` in state/dashboard schema extension
- In the portable MVP, still invoke AskUserQuestion **or** platform equivalent and show the recommendation; a synthetic answer requires a separate verified host API

**Why**: All five orchestrators read this file at init, so it is the right place for policy and ordering. It is not executable code, so call-site/runtime changes are still required.

### 2. Orchestrator Initialization — Config Seed

**Where**: Each orchestrator Step 3 init + `orchestrator-patterns.md` §4 Project Configuration

**Pattern precedent**: `html_output` → `orchestrator.options.html_output` (read once from `.maister/config.yml`)

**Proposed**: `advisor_mode`, `advisor_model` seeded same way at init.

### 3. Dashboard Pre-Gate Rewrite Hook

**Where**: `orchestrator-patterns.md` §8 trigger #3 — "BEFORE firing every phase exit gate"

**Why**: Advisor needs fresh `phase_summaries`, artifacts, decisions, risks on dashboard before answering; this is already the mandated orchestrator pause point.

### 4. `decisions_needed` Block (Development Phase 2)

**Where**: `development/SKILL.md:155-161` + `orchestrator-patterns.md` §3

**Why**: Highest-stakes scope decisions; explicit structured input from gap-analyzer; natural advisor context bundle.

### 5. Convergence Loops (Research P4, Product-Design P5)

**Where**: Sequential AskUserQuestion per decision area

**Why**: Advisor must emulate sequential user choices, not batch; insertion needs per-iteration advisor call with prior answers in context.

### 6. Fix-Loop Gates (Development P11, Performance P8, Migration P7)

**Where**: "Which issues should I fix?" / "Proceed with known issues?" / rollback HALT

**Why**: Primary safety denylist — advisor should refuse or escalate to user.

### 7. Hooks Layer

**Where**: `post-compact-reminder.sh`, `skill-invocation-reminder.sh`

**Why**: Extend reminders to include advisor-mode policy ("advisor answers gates unless denylisted; gates still fire").

### 8. Per-SKILL Step 0 Block (Lowest — Maintenance Burden)

**Where**: Duplicated session-reminder block in all 5 SKILL.md files

**Why**: Only if advisor semantics cannot live solely in framework reference; prefer centralizing in §2.

---

## Cross-Orchestrator Patterns

### Shared Executive-Summary Exit Gates

development, performance, migration share the pattern:

> Display executive summary before asking. Read `[artifact]` and extract: [fields]. Format as brief overview then "Continue to [next phase]?"

Advisor can use artifact TL;DR + `phase_summaries` as answer context.

### Spec-Audit Two-Step Gate

development Phase 6 and performance Phase 4:
1. In-phase: "Run specification audit?" (optional skip)
2. Exit MANDATORY GATE: audit verdict summary → continue

### Verification Pipeline Gates

development Phase 10 ≈ performance Phase 7:
- Multiselect verification options in-phase
- MANDATORY GATE certifies selections before next phase

### Product-Design Unique: No `decisions_needed`

Uses inline convergence with stricter one-question-per-call rules instead of gap-analyzer structured output.

### Research Unique: Long Phase 1

Phase 1 has incremental dashboard updates per sub-step; single exit gate after synthesizer completes (`research/SKILL.md:59`).

---

## Sources Investigated

| Source | Path | Relevance |
|--------|------|-----------|
| Framework gates | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` §2, §3, §4, §8 | Lifecycle, decisions_needed, config seed, dashboard gate schema |
| Development | `plugins/maister/skills/development/SKILL.md` | Largest gate surface (14 phases) |
| Research | `plugins/maister/skills/research/SKILL.md` | Convergence anti-batch rules |
| Product-design | `plugins/maister/skills/product-design/SKILL.md` | Interactive refinement loops |
| Performance | `plugins/maister/skills/performance/SKILL.md` | Dev-pipeline subset |
| Migration | `plugins/maister/skills/migration/SKILL.md` | Rollback halt, fix-loop |
| Hooks | `plugins/maister/hooks/post-compact-reminder.sh`, `skill-invocation-reminder.sh` | Post-compaction gate enforcement |

**Confidence**: High — direct grep + line-cited reads of all five orchestrator SKILL.md files and framework reference.
