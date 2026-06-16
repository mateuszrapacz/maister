# AJ Rubric Fidelity Diff — Epic E1 Wave 1

**AJ baseline:** Primary path `/Users/mrapacz/Projects/architekt-jutra-code/week8` (resolved and copied to task-local fallback `analysis/research-context/aj-week8/{1,2,3}/` for reproducibility). Fallback strategy: `AJ_SOURCE_ROOT` env → primary path → task-local copy.

**Maister source:** `plugins/maister/skills/{transcript-critic,requirements-critic,problem-classifier}/SKILL.md`

**Date:** 2026-06-16

**Diff method:** Side-by-side semantic read of AJ baseline vs Maister Wave 1 skills; verdict per FR-2 minimum checklist element.

---

## Semantic Verification Checks (Group 2.1)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | AJ baseline resolved (primary or fallback) | **PASS** | Primary exists; copies at `analysis/research-context/aj-week8/` |
| 2 | `transcript-critic`: all 7 AJ decision-process checks mapped | **PASS** | Checks 1–7 at `SKILL.md:L36–L123` match AJ `week8/1/.../SKILL.md:L35–L122` |
| 3 | `requirements-critic`: all 4 AJ checks mapped | **PASS** | Checks 1–4 at `SKILL.md:L39–L242` match AJ `week8/2/.../SKILL.md:L25–L228` |
| 4 | `problem-classifier`: 4 classes, signal scan, ≤4 questions, decomposition, edge cases | **PASS** | Classes `L28–L116`; scan `L145–L187`; max 4 Q `L193`; decomposition `L383–L401`; edge cases `L462–L497` |
| 5 | Output format templates preserved (severity, evidence quotes, class assignment) | **PASS** | See per-skill output-format rows below |
| 6 | Chain topology: kebab sibling refs; Wave 3 stub documented | **PASS** | Bundle A uses plain kebab; `aggregate-designer` Wave 3 stub at `problem-classifier/SKILL.md:L501–L509` |
| 7 | ENHANCEMENT deltas explicitly labeled | **PASS** | All Maister-only additions marked ENHANCEMENT in tables below |
| 8 | Zero unresolved GAP verdicts at section summary level | **PASS** | 0 GAP across all three skills |

**Overall verdict:** **PASS** — AJ rubric fidelity preserved; all deltas are documented Maister enhancements.

---

## Per-Skill Summary

| Skill | PASS | GAP | ENHANCEMENT | Verdict |
|-------|-----:|----:|------------:|---------|
| `transcript-critic` | 12 | 0 | 4 | **PASS** |
| `requirements-critic` | 11 | 0 | 7 | **PASS** |
| `problem-classifier` | 14 | 0 | 8 | **PASS** |
| **Total** | **37** | **0** | **19** | **PASS** |

**Remediation triggers (Group 5):** None — zero GAP verdicts.

---

## transcript-critic

| AJ element | Maister location | Verdict | Notes |
|------------|------------------|---------|-------|
| Check 1: Fact vs Opinion vs Hearsay (+ Opinion→Fact escalation) | `plugins/maister/skills/transcript-critic/SKILL.md:L36–L51` | PASS | Semantically identical to AJ baseline |
| Check 2: Consensus Audit (matrix format) | `SKILL.md:L53–L66` | PASS | Participant / position / genuine agreement / evidence preserved |
| Check 3: Interrupted & Marginalized Topics | `SKILL.md:L68–L80` | PASS | Raised/cut off, deferred, silent patterns preserved |
| Check 4: Hidden Dependencies | `SKILL.md:L82–L92` | PASS | Topic A/B linkage and risk framing preserved |
| Check 5: Scope Drift Detection | `SKILL.md:L94–L102` | PASS | Stated goal vs actual outcome; first-proposal signal preserved |
| Check 6: Severity Mismatch | `SKILL.md:L104–L114` | PASS | frequency × consequence = real risk preserved |
| Check 7: Authority & Social Dynamics | `SKILL.md:L116–L123` | PASS | Four social-dynamics patterns preserved |
| Workflow (5 steps: inventory → checks → cross-ref → questions → report) | `SKILL.md:L127–L154` | PASS | Full workflow preserved |
| Output format: severity, evidence quotes, diagnostic questions, consensus/deferred tables | `SKILL.md:L158–L195` | PASS | Template structure matches AJ |
| Pitfalls (4 pitfalls) | `SKILL.md:L199–L215` | PASS | All four pitfalls preserved |
| Non-interactive (no AskUserQuestion in rubric) | `SKILL.md` (full file) | PASS | Report-only critique; no interactive probes in AJ or Maister |
| Frontmatter `name: transcript-critic` (plain kebab) | `SKILL.md:L2` | PASS | AJ also uses plain kebab (no `maister:` prefix) |
| Frontmatter description distinct from requirements-critic | `SKILL.md:L3` | ENHANCEMENT | AJ baseline incorrectly copies requirements-critic description (`week8/1/.../SKILL.md:L3`); Maister has transcript-specific description |
| `disable-model-invocation: true` | `SKILL.md:L4` | ENHANCEMENT | Maister explicit-only invocation (ADR-003/SC-5); absent in AJ |
| Recommended Next Steps / Bundle A chain | `SKILL.md:L219–L225` | ENHANCEMENT | Maister ADR-001 hybrid chain: follow-up → requirements → `requirements-critic`; absent in AJ |
| Chain ref: `requirements-critic` (plain kebab sibling) | `SKILL.md:L225` | PASS | Correct kebab reference in Bundle A |

---

## requirements-critic

| AJ element | Maister location | Verdict | Notes |
|------------|------------------|---------|-------|
| Check 1: Problem vs. Solution (flag/leave table, settled-constraint test) | `plugins/maister/skills/requirements-critic/SKILL.md:L39–L56` | PASS | Rubric and examples preserved |
| Check 2: Observable Behavior vs CRUD Status (trigger signals, probing table, interactive reformulation) | `SKILL.md:L60–L122` | PASS | Polish probe table, draft structure, reservation example preserved |
| Check 3: Signal Map — 8 clusters + extensibility instructions | `SKILL.md:L126–L214` | PASS | All clusters (personal data, money, shared data, integration, status, notifications, dates, search) preserved |
| Check 4: Rigid Quantifier Probe (trigger words, boundary scenarios, process) | `SKILL.md:L218–L242` | PASS | Invoice example and 4-step process preserved |
| Invocation guard + explicit trigger phrases | `SKILL.md:L10–L12` | PASS | Present in both AJ and Maister |
| Input acquisition (argument / scan / ask) | `SKILL.md:L29–L35` | PASS | Identical flow |
| Output format (issues, questions, suggested rewrite, summary) | `SKILL.md:L246–L266` | PASS | Per-requirement template preserved |
| Principles (genuine issues, specificity, blockers, quantifier as conversation) | `SKILL.md:L270–L276` | PASS | Core principles preserved |
| Bilingual body (Polish probes in Check 2, Polish reformulation example) | `SKILL.md:L75–L120` | PASS | ADR-007 bilingual body preserved |
| Interactive reformulation via AskUserQuestion (Checks 2–4) | `SKILL.md:L73–L92`, `L136`, `L228` | PASS | Interactive pattern preserved; Check 4 now explicitly names `AskUserQuestion` |
| Frontmatter `name: requirements-critic` (plain kebab, no `maister:` prefix) | `SKILL.md:L2` | ENHANCEMENT | AJ uses `maister:requirements-critic` (`week8/2/.../SKILL.md:L2`); Maister strips prefix per Wave 1 convention |
| `disable-model-invocation: true` | `SKILL.md:L4` | ENHANCEMENT | Maister explicit-only; absent in AJ |
| Language Preference gate (AskUserQuestion at start) | `SKILL.md:L16–L25` | ENHANCEMENT | ADR-007 structured language gate; AJ uses inline "Match the user's language" in Principles only |
| Principles: language via gate vs inline match | `SKILL.md:L276` | ENHANCEMENT | Replaces AJ `L262` inline language rule with gate-driven selection |
| Recommended Next Steps / Bundle A chain | `SKILL.md:L280–L292` | ENHANCEMENT | Maister chain: `transcript-critic` → this skill → `problem-classifier`; absent in AJ |
| Chain refs: `transcript-critic`, `problem-classifier` (plain kebab) | `SKILL.md:L284`, `L288` | PASS | Correct sibling topology |

---

## problem-classifier

| AJ element | Maister location | Verdict | Notes |
|------------|------------------|---------|-------|
| 4 problem classes: CRUD, T&P, Integration, Resource Contention | `plugins/maister/skills/problem-classifier/SKILL.md:L28–L116` | PASS | Essence, signals, implementation suggestions preserved for all four |
| Signal scan: UI mockup signal table | `SKILL.md:L151–L172` | PASS | Interactive-element decomposition preserved |
| Signal scan: text input signal table | `SKILL.md:L174–L187` | PASS | Confidence levels and composite signals preserved |
| Targeted clarifying questions (max 4 per AskUserQuestion call) | `SKILL.md:L191–L193` | PASS | "Maximum 4 questions per call" preserved from AJ |
| Universal discriminators (4 questions) | `SKILL.md:L225–L241` | PASS | Screen effect, state change, modules, concurrency preserved |
| Depth probes: CRUD (Behaving/Becoming), T&P, CRUD vs RC, RC (A/B/C), Integration | `SKILL.md:L245–L337` | PASS | Full probe hierarchy preserved |
| Step 3: Classification (primary/secondary, confidence, evidence, decomposition flag) | `SKILL.md:L341–L349` | PASS | Classification synthesis preserved |
| Step 4: Output format (deduction trail table, why/not-to-do/suggested approach) | `SKILL.md:L353–L381` | PASS | Class assignment format and reasoning trail preserved |
| Composite decomposition + component relationship diagram | `SKILL.md:L383–L401`, `L411–L446` | PASS | Split table and ASCII diagram patterns preserved |
| Class Quick Reference table | `SKILL.md:L450–L458` | PASS | 4-class comparison matrix preserved |
| Edge Cases & Traps section (15+ traps) | `SKILL.md:L462–L497` | PASS | All AJ edge-case guidance preserved including "Max 3 times — but not by us" |
| Archetype vs problem-class distinction table | `SKILL.md:L14–L20` | ENHANCEMENT | Maister labels archetype mappers as Wave 4 not yet ported; AJ references live skills |
| RC handoff to `aggregate-designer` | `SKILL.md:L403–L409`, `L501–L509` | ENHANCEMENT | AJ actively invokes `maister:aggregate-designer` via AskUserQuestion (`week8/3/.../SKILL.md:L385–L399`); Maister documents Wave 3 stub — skill not ported in Wave 1 |
| Chain ref: `aggregate-designer` (plain kebab, Wave 3 stub) | `SKILL.md:L507–L509` | PASS | Stub explicitly states "Do not invoke in Wave 1" |
| Frontmatter `name: problem-classifier` (plain kebab) | `SKILL.md:L2` | ENHANCEMENT | AJ uses `maister:problem-classifier`; Maister strips prefix |
| `disable-model-invocation: true` | `SKILL.md:L4` | ENHANCEMENT | Maister explicit-only; absent in AJ |
| Invocation guard block | `SKILL.md:L10–L12` | ENHANCEMENT | Maister adds explicit trigger phrases and do-not-invoke-when-drafting guard; AJ relies on description only |
| Language Preference gate | `SKILL.md:L120–L129`, `L137` | ENHANCEMENT | ADR-007 structured gate; AJ uses inline "Always match the user's language" at Step 2 |
| Recommended next steps table (RC → aggregate-designer) | `SKILL.md:L501–L509` | ENHANCEMENT | Replaces AJ interactive wizard offer with documented Wave 3 handoff table |

---

## Orchestrator Soft Suggestions (ADR-008)

Note: `development` and `product-design` orchestrator bullets are **Maister ENHANCEMENT**, not AJ source content. AJ week8 skills do not define orchestrator integration.

| Element | Maister location | Verdict | Notes |
|---------|------------------|---------|-------|
| `development/SKILL.md`: optional `requirements-critic` suggestion after requirements drafted | `plugins/maister/skills/development/SKILL.md:L251` | ENHANCEMENT | ADR-008 8B soft suggestion; "Do not invoke the skill automatically" guard present |
| `product-design/SKILL.md`: optional `transcript-critic` when transcripts in `context/` | `plugins/maister/skills/product-design/SKILL.md:L251` | ENHANCEMENT | ADR-008 8B soft suggestion; "Do not invoke the skill automatically" guard present |
| No Skill tool auto-delegation from orchestrators | Both orchestrator bullets above | PASS | Explicit-only preserved; bullets are discoverability hints only |

---

## Maister Enhancement Index (labeled, not regressions)

| Enhancement | Skills affected | Rationale |
|-------------|-----------------|-----------|
| **Invocation guard** (body blocks + trigger phrases) | `requirements-critic`, `problem-classifier` | Explicit-only critics; prevents auto-invoke during drafting |
| **`disable-model-invocation: true`** | All three | SC-5 / ADR-003 — model cannot auto-select Wave 1 critics |
| **Language gate** (AskUserQuestion at start) | `requirements-critic`, `problem-classifier` | ADR-007 — structured EN/PL/match-input vs inline match rule |
| **Bundle A** (Recommended Next Steps chain) | All three | ADR-001 hybrid chain: transcript → requirements → classifier |
| **Plain kebab `name:`** (no `maister:` prefix) | `requirements-critic`, `problem-classifier` | Wave 1 frontmatter convention; `transcript-critic` already plain in AJ |
| **ADR-008 orchestrator bullets** | N/A (orchestrators) | Optional discoverability without auto-invocation |
| **Archetype table Wave 4 stub** | `problem-classifier` | Documents not-yet-ported archetype mappers |
| **Wave 3 `aggregate-designer` stub** | `problem-classifier` | Replaces AJ live invoke with documented future handoff |
| **Transcript-specific frontmatter description** | `transcript-critic` | Fixes AJ copy-paste error in baseline frontmatter |

---

## Group 5 Remediation Triggers

**None.** All FR-2 minimum checklist elements verified PASS or ENHANCEMENT. Zero GAP verdicts require source patches.
