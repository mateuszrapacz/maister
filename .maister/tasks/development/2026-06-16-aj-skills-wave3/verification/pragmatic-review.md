# Pragmatic Code Review: AJ Skills Wave 3 — DDD Core (Epic E4)

**Reviewer:** maister-code-quality-pragmatist  
**Date:** 2026-06-16  
**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave3`  
**Spec:** `implementation/spec.md`  
**Implementation:** commit `38fe19f` — 4 DDD skill ports, 4 `modeling-*` commands, cross-ref activation, Bundle B docs, Kiro build wiring  
**Focus:** Over-engineering, unnecessary complexity, developer experience vs Wave 1–2 precedent

---

## Executive Summary

| Field | Assessment |
|-------|------------|
| **Overall complexity** | Medium (content volume) / Low (structural change) |
| **Verdict** | ✅ **Pass with simplification opportunities** — approve merge for Claude/Cursor primary path |
| **Content over-engineering** | No — rubric depth is inherited AJ pedagogy, consistent with Waves 1–2 |
| **Packaging over-engineering** | Yes — cumulative Kiro dual-dir pattern, hardcoded counts, copy-paste `sedi` blocks |
| **Wave 1–2 precedent adherence** | Yes — thin commands, language gates, docs-only chains, no orchestrator creep |

Wave 3 is a faithful additive port: four AJ rubrics (~2,315 lines), four 10-line command wrappers, stub activation in two existing skills, Bundle B documentation, and incremental Kiro build wiring. It correctly avoids orchestrator integration (ADR-008), adds no `references/` dirs, and fixes the spec-audit Kiro count error (71/46, not 67/42).

Friction concentrates in **platform packaging debt** carried forward from Waves 1–2, not in skill content.

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 1 |
| Medium | 7 |
| Low | 5 |

---

## Complexity Assessment

### Deliverable size

| Artifact | Lines | Notes |
|----------|------:|-------|
| `context-distiller/SKILL.md` | 516 | Strategic design rubric |
| `aggregate-designer/SKILL.md` | 564 | Multi-phase RC wizard |
| `accounting-archetype-mapper/SKILL.md` | 577 | Fit-test + ledger mapping |
| `pricing-archetype-mapper/SKILL.md` | 618 | Symmetric pricing mapper |
| Command wrappers (×4) | 10 each | True thin delegates |
| Cross-ref edits | 2 skills | Stub removal only (~21 lines) |
| Build integration | +4 `merge_one`, +8 `skills_needing_args`, +16 `sedi` | Count rebaseline 63→71, 38→46 |

### Appropriateness vs Wave 1–2

**Justified (keep):**

- Full rubrics in `SKILL.md` — AJ fidelity; splitting into `references/` would add navigation without reducing invocation depth.
- Language preference gates on all four interactive skills — ADR-007; matches `metaprogram-classifier`.
- Omitting `disable-model-invocation` on modeling wizards — intentional per spec; matches interactive classifiers, not review skills.
- Docs-only `## Recommended next steps` chains — ADR-001, ADR-008; no orchestrator state.
- Corrected Kiro counts **71 / 46** in Makefile and tests — implementation fixed spec-audit C1.
- `build-core.test.sh` now asserts all four `maister-modeling-*` merged dirs and labels **18 merged commands** — Wave 2 M3 gap closed.

**Disproportionate (simplify over time):**

- **+8 Kiro directories** for 4 user-facing tools (standalone + merged per pair).
- **182 `sedi` calls** in `build.sh`; Wave 3 adds another 16-line copy-paste block.
- Hardcoded validate counts touched in 4 files for the third wave in a row.
- Three parallel discovery paths (slash commands, plain kebab Skill tool, classifier routing table).
- Stale inventory numbers in archived spec and Kiro README template.

---

## Key Issues Found

### Critical

*None.* Scope matches Wave 1–2 pattern; no orchestrator creep; deferral stubs removed (`rg` clean on `problem-classifier`, `linguistic-boundary-verifier`).

---

### High

#### H1. Kiro directory inflation: two dirs per skill/command pair (cumulative debt)

**Evidence:** Wave 3 adds both renamed source skills and merged command dirs:

| Capability | Standalone Kiro dir | Merged command dir |
|------------|--------------------|--------------------|
| Context distiller | `maister-context-distiller` | `maister-modeling-context-distiller` |
| Aggregate designer | `maister-aggregate-designer` | `maister-modeling-aggregate-designer` |
| Accounting mapper | `maister-accounting-archetype-mapper` | `maister-modeling-accounting-archetype` |
| Pricing mapper | `maister-pricing-archetype-mapper` | `maister-modeling-pricing-archetype` |

`platforms/kiro-cli/build.sh` L68–71 (`merge_one`), L220–227 (`skills_needing_args`). Makefile Rules 14/28: **71 total / 46 `maister-*`**.

**Problem:** Wave 1+2+3 cumulative: **20 Kiro dirs for 10 AJ user-facing tools**. Wave 2 pragmatic review (H1) flagged this; Wave 3 repeated the pattern.

**Impact:** Wrong skill selection, validate count churn every wave, maintainer burden scaling into E5 (`archetype-scanner` + subagents).

**Recommendation:** Before Wave 4/E5, pick one Kiro strategy (standalone-only preferred — merged wrappers are 10-line aliases). Short-term: document canonical path in Bundle B — *"Prefer `/maister:modeling-*` slash commands; standalone `maister-*` dirs are source-skill aliases."*

**Estimated effort:** 30 min (docs); 4–6 h (build dedup).

---

### Medium

#### M1. `build.sh` sedi proliferation is becoming unmaintainable

**Evidence:** `platforms/kiro-cli/build.sh` contains **182** `sedi` calls. Wave 3 block at L332–347 duplicates four pattern variants × four skills — same structure as Wave 1 (L305–315) and Wave 2 (L316–330).

**Problem:** Each wave manually extends identical blocks. Non-`run` chain phrasing (e.g. `` `thermos` `` without `run`) may still slip through despite Wave 3 adding `run \`thermos\`` at L348.

**Recommendation:** Refactor to array-driven loop applying standard pattern set per skill name.

**Estimated effort:** 2–3 h.

---

#### M2. Hardcoded Kiro inventory counts remain operational debt

**Evidence:** Wave 3 rebaselines atomically in Makefile L120–121/L153–154, `build-core.test.sh`, `validation.test.sh`, `skills_needing_args`, and `merge_one`.

**Problem:** Wave 4/E5 repeats this six-touchpoint dance. Wave 1 and Wave 2 pragmatic reviews flagged this; Wave 3 did not address it.

**Recommendation:** Manifest-based diff or derive counts from `merge_one` + source tree.

**Estimated effort:** 4–8 h (cross-cutting).

---

#### M3. Mapper command/skill naming asymmetry hurts discoverability

**Evidence:** ADR-002 shortened mapper command stems:

| Command | Delegates to skill |
|---------|-------------------|
| `modeling-accounting-archetype` | `accounting-archetype-mapper` |
| `modeling-pricing-archetype` | `pricing-archetype-mapper` |

Distiller and aggregate-designer are symmetric. Mapper commands omit `-mapper`; chain sections use full kebab names.

**Recommendation:** Add alias note in command `description` and CLAUDE.md skill table footnote.

**Estimated effort:** 15 min.

---

#### M4. Bundle B discovery: three parallel entry paths + naming split

**Evidence:** Users can start modeling via:

1. `/maister:quick-problem-classifier` (Bundle A/B entry)
2. `/maister:modeling-*` commands (Bundle B)
3. Direct Skill tool with plain kebab names (`context-distiller`, etc.)

`plugins/maister/CLAUDE.md` L519 uses **skill names** in Bundle B prose; `README.md` L125 uses **slash commands**. Both include conditional branching ("when RC class is detected"), but naming convention differs.

**Impact:** New users unsure which entry point or name form to use.

**Recommendation:** Standardize Bundle B to slash commands first, skill names in parentheses.

**Estimated effort:** 15 min.

---

#### M5. Bundle B reads as sequential flow despite conditionals

**Evidence:**

- `CLAUDE.md` L519: classifier → distiller → mappers **or** aggregate (class-dependent) → linguistic verifier
- `README.md` L125: same conditionals, but left-to-right arrow chain can be read as "run all steps in order"

Spec mermaid is class-dependent; neither doc states explicitly *"run only the branch matching classifier output."*

**Impact:** Users may run `modeling-aggregate-designer` before confirming RC class, or run mappers when distillation is still needed.

**Recommendation:** Add one sentence: *"Branch on classifier result — do not run all steps sequentially."*

**Estimated effort:** 10 min.

---

#### M6. Language preference gate adds friction on every invocation

**Evidence:** All four Wave 3 skills include mandatory `AskUserQuestion` language gate at skill start (e.g. `context-distiller/SKILL.md` L19–28). Same pattern as `metaprogram-classifier`.

**Impact:** Repeat users in English-only projects pay a three-option question before domain work on every modeling invocation.

**Recommendation:** Not a Wave 3 blocker. Future polish: default to "Match input language" when args are non-empty, or session-level "Remember choice."

**Estimated effort:** Low–Medium.

---

#### M7. Stale inventory numbers in spec artifact and Kiro README template

**Evidence:**

- `implementation/spec.md` FR-8.2 / AC-5.2–5.3 still document **67 / 42** (incorrect; spec-audit C1).
- `platforms/kiro-cli/build.sh` L795 generated README: *"`skills/maister-*/` — **38** slash skills"* (stale; should be 46).

Implementation correctly uses **71 / 46**.

**Recommendation:** Patch archived spec counts; update build.sh README template to drop hard-coded number or derive from comment.

**Estimated effort:** 15 min.

---

### Low

#### L1. Wave 3 modeling skills lack `disable-model-invocation` while `problem-classifier` has it

**Evidence:** `problem-classifier/SKILL.md` L4: `disable-model-invocation: true`. Wave 3 skills omit flag (per spec, following `metaprogram-classifier`).

**Impact:** Modeling wizards could auto-invoke on domain/DDD language during normal dev work. Mitigated by invocation guard text.

**Recommendation:** Monitor; add flag only if unwanted auto-invocation is reported.

---

#### L2. Chain asymmetry: pricing mapper lacks post-map linguistic handoff

**Evidence:** `accounting-archetype-mapper/SKILL.md` L471–472 recommends `linguistic-boundary-verifier` after successful map. `pricing-archetype-mapper/SKILL.md` L489–493 only redirects to accounting on misfit.

**Impact:** Minor inconsistency; may be intentional.

---

#### L3. Modeling commands combined into single table vs separate subsection

**Evidence:** Spec FR-7.1.3 asked for separate "Modeling Commands" subsection. `CLAUDE.md` L605–608 combines `quick-*` and `modeling-*` in one table — simpler for readers, minor spec deviation.

---

#### L4. `build-core.test.sh` asserts merged modeling dirs but not standalone Wave 3 skill dirs

**Evidence:** `test_commands_merged()` L41–44 checks `maister-modeling-*` merged files. No `test -f` for `maister-context-distiller`, `maister-aggregate-designer`, etc.

**Impact:** Low — Makefile Rule 14/28 still catches total count drift.

**Estimated effort:** 10 min to add four assertions.

---

#### L5. No manual smoke evidence (AC-6)

**Evidence:** Work-log records `make build && make validate` exit 0 but not AC-6 invocations per skill or accounting ↔ pricing fit-test redirect loops.

**Impact:** Bundle B chain behavior unverified in live agent session. Structural gates pass; pedagogical fidelity relies on AJ port fidelity.

---

## Developer Experience

### Friction points

| Area | Assessment |
|------|------------|
| **Discoverability** | ⚠️ Bundle B in README + CLAUDE.md; mapper command/skill name split (M3) |
| **Invocation clarity** | ⚠️ Three entry paths (M4); hybrid skill+command+Kiro merge (H1) |
| **Kiro-specific** | ⚠️ Duplicate dirs; sed transform debt (M1); stale README count (M7) |
| **Language** | ⚠️ Mandatory gate every invocation (M6) — justified for PL/EN |
| **Safety during dev work** | ⚠️ Modeling skills may auto-invoke (L1); classifier is guarded |
| **Orchestrator intrusion** | ✅ No orchestrator changes — ADR-008 respected |
| **Command file size** | ✅ 10 lines, true thin wrappers |
| **Build gate** | ✅ Committed with platform variants synced (`38fe19f`) |

### Positive DX choices

- Thin commands mirror `quick-problem-classifier.md` exactly — no duplicate rubric or input handling
- Cross-ref activation is minimal (stub removal only, no rubric changes to Wave 1–2 skills)
- Course-specific AJ paths removed; no `maister:` body refs or `problem-class-classifier` typos
- `context-distiller` Recommended next steps use conditional table (primary vs optional)
- `plugin-development.md` documents `modeling-*` category in two lines — not over-documented
- Source-only discipline maintained
- Wave 3 partially addresses Wave 2 M1 by adding `run \`thermos\`` sedi (L348)

### Recommended consumer mental model

```text
Start Bundle B:
  → /maister:quick-problem-classifier
  → Branch on classifier result (do NOT run all steps):
      RC → /maister:modeling-aggregate-designer
      Archetype/ledger → /maister:modeling-accounting-archetype or modeling-pricing-archetype
      Ambiguity → /maister:modeling-context-distiller
  → When language.md exists → /maister:reviews-linguistic-boundaries

Prefer slash commands over plain kebab Skill tool unless chaining from Recommended next steps.
```

---

## Requirements Alignment

| Requirement group | Status | Pragmatic note |
|-------------------|--------|----------------|
| FR-1 – FR-4 skill ports | ✅ Met | Guards, language gates, chains, normalized refs |
| FR-5 modeling-* commands | ✅ Met | True thin wrappers |
| FR-6 cross-ref activation | ✅ Met | Zero deferral stubs on grep |
| FR-7 documentation | ✅ Met | Bundle B added; minor table layout deviation (L3) |
| FR-8 build pipeline | ✅ Met (corrected) | 71/46 not spec's 67/42 |
| FR-9 port checklist | ✅ Met | No references/ dirs, no CLAUDE.md in bodies |
| AC-6 manual smoke | ⚠️ Not evidenced | L5 |

### Correctly deferred (reduces over-engineering)

- No orchestrator auto-invocation of modeling skills
- No Wave 4 `archetype-scanner`, subagents, or registry
- No new `references/` directories
- Chains remain documentation-only

---

## Context Consistency (vs Wave 1–2)

| Pattern A | Pattern B | Verdict |
|-----------|-----------|---------|
| Wave 1–2 hybrid packaging (skill + command + Kiro merge) | Wave 3 same pattern | ⚠️ Debt compounded (H1) |
| `problem-classifier` has `disable-model-invocation` | Wave 3 modeling skills omit it | ✅ Intentional (`metaprogram-classifier` precedent) |
| CLAUDE.md Bundle B uses skill names | README uses slash commands | ⚠️ M4 |
| Spec says 67/42 Kiro dirs | Implementation 71/46 | ⚠️ M7 |
| Wave 2 build-core test gap (14 merged) | Wave 3 asserts all 4 modeling merges + 18 total | ✅ Improved |
| Review skills guarded | Modeling wizards unguarded in frontmatter | ✅ Intentional interactive design |

---

## Top Simplification Opportunities

| Priority | Opportunity | Issue | Effort | Impact |
|----------|-------------|-------|--------|--------|
| **1** | Add explicit branching sentence to Bundle B docs | M5 | 10 min | Prevents wrong modeling sequence |
| **2** | Document canonical slash-command entry + mapper aliases | M3, M4, H1 | 15–30 min | Faster discovery, no code change |
| **3** | Fix stale spec/build README counts | M7 | 15 min | Prevents future wave miscounts |
| **4** | Parameterize Wave 3-style `sedi` blocks | M1 | 2–3 h | Reduces Wave 4/E5 build risk |
| **5** | Decide Kiro dedup strategy before E5 | H1, M2 | 5–9 h | Prevents 71 → 83+ dir explosion |
| **6** | Extend build-core tests for standalone Wave 3 Kiro dirs | L4 | 10 min | Catch rename regressions |
| **7** | Run AC-6 manual smoke (one domain per skill) | L5 | Human time | Validates Bundle B chains live |

**Immediate ROI:** ~1 h docs/tests. **Structural ROI:** 2–3 h build refactor + 5–9 h Kiro dedup.

---

## Summary Statistics

| Metric | Wave 3 | Cumulative (W1+W2+W3) |
|--------|--------|------------------------|
| Source skills added | 4 | 10 |
| Source commands added | 4 | 10 |
| Kiro skill dirs added | 8 | 20 |
| `skills_needing_args` entries | +8 | +20 |
| Hardcoded count touchpoints updated | 4 files | 4 files (third time) |
| Wave 3 `sedi` block | +16 rules | ~44 cross-ref rules |
| New SKILL.md lines | ~2,275 | — |
| Orchestrator SKILL.md edits | 0 | ✅ ADR-008 |

---

## Conclusion

Wave 3 is **not over-engineered at the content level**. The AJ DDD rubrics are dense because bounded-context distillation, aggregate design, and archetype mapping require dense guidance. The implementation mirrors Wave 1–2 with appropriately minimal integration.

Over-engineering and DX friction concentrate in **platform packaging**, carried forward and compounded from Waves 1–2:

1. Eight more Kiro directories for four tools (20 total across three waves).
2. Hardcoded inventory counts bumped again without manifest-based validate.
3. Copy-paste `sedi` blocks growing per wave.
4. Bundle B docs use inconsistent naming and read as sequential despite conditionals.

Wave 3 **did** improve on prior waves: build-core tests assert all four `maister-modeling-*` merged dirs; Kiro counts corrected to 71/46; cross-ref stubs fully activated; deferral grep clean; partial Wave 2 chain-transform gap closed (`thermos`).

### Verdict

**✅ Pass with simplification opportunities — approve for merge.**

Schedule doc alignment (Priorities 1–3) as fast-follow before Wave 4/E5. Address build-pipeline refactor and Kiro dedup before `archetype-scanner` lands.

---

*Review complete. Read-only analysis of committed implementation `38fe19f`.*
