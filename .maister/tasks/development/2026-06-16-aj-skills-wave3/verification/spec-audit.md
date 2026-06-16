# Specification Audit: AJ Skills Wave 3 — DDD Core (Epic E4)

**Auditor:** maister-spec-auditor  
**Date:** 2026-06-16  
**Spec:** `implementation/spec.md`  
**Requirements:** `analysis/requirements.md`  
**Analysis inputs:** `analysis/codebase-analysis.md`, `analysis/gap-analysis.md`, `analysis/scope-clarifications.md`  
**Risk level:** Medium (large rubric port + cross-ref activation + Kiro build integration)

---

## Executive Summary

The specification is **substantially complete and implementable** for Wave 3 scope: four AJ source files are verified on disk, Wave 1–2 port patterns exist and are correctly referenced, downstream stub locations in `problem-classifier` and `linguistic-boundary-verifier` match live codebase line numbers, and scope boundaries align with ADRs and prior wave decisions.

**FR-8 (build pipeline) contains critical Kiro count errors** that mirror the Wave 1 spec-audit finding: the spec applies a **+4 delta** for four new skill/command pairs, but the established Wave 1–2 pattern adds **+2 Kiro directories per pair** (one renamed skill dir + one merged command dir). Implementing FR-8.2/AC-5.2–AC-5.3 as written (**67 total / 42 `maister-*`**) would leave `make validate` failing after an otherwise correct implementation. Correct Wave 3 targets are **71 total / 46 `maister-*`** (shortcuts unchanged at 25).

**Overall verdict:** **pass-with-concerns** — proceed to implementation planning only after correcting FR-8 Makefile/test count targets and clarifying the `disable-model-invocation` reference pattern in FR-1.4.

| Severity | Count |
|----------|------:|
| Critical | 1 |
| High | 3 |
| Medium | 5 |
| Low | 3 |

---

## FR Implementability Matrix

Evidence from verified codebase state (2026-06-16) and AJ sources under `/Users/mrapacz/Projects/architekt-jutra-code/week7/`.

| FR | Verdict | Evidence |
|----|---------|----------|
| **FR-1** context-distiller | ✅ Implementable | AJ source 483 lines; `problem-class-classifier` typo at L42 confirmed; no `disable-model-invocation` in AJ source; `metaprogram-classifier` language gate pattern at L21–23 |
| **FR-2** aggregate-designer | ✅ Implementable | AJ source 540 lines; `maister:problem-class-classifier` ref at L49 confirmed |
| **FR-3** accounting-archetype-mapper | ✅ Implementable | AJ source 547 lines; plain frontmatter name; mutual pricing redirect present in source |
| **FR-4** pricing-archetype-mapper | ✅ Implementable | AJ source 591 lines; symmetric fit-test pattern with accounting mapper |
| **FR-5** modeling-* commands | ✅ Implementable | Template at `plugins/maister/commands/quick-problem-classifier.md`; ADR-002 shortened mapper stems documented |
| **FR-6** cross-ref activation | ✅ Implementable | Stubs verified at `problem-classifier` L19–20, L409, L507–509 and `linguistic-boundary-verifier` L42, L355 |
| **FR-7** documentation | ✅ Implementable | Bundle B absent from `CLAUDE.md` (Bundles A, C, D only); `plugin-development.md` L37 lists only `reviews-*`, `quick-*` |
| **FR-8** build pipeline | ❌ Not implementable as written | Kiro count targets wrong (see Critical C1); partial Wave 3 sedi at `build.sh` L319 confirmed; `skills_needing_args` list incomplete in spec text |
| **FR-9** port checklist | ✅ Implementable | Matches Wave 1–2 work-log patterns; Makefile Rule 5/28 (no CLAUDE.md in skill bodies) enforced in existing tree |

---

## Build Pipeline Count Verification

### Established Wave 1–2 increment pattern

Each AJ skill + thin command pair adds **two** Kiro skill directories:

1. Source skill copied and renamed → `maister-<skill-name>/`
2. Command merged via `merge_one` → `maister-<command-stem>/`

| Wave | Pairs added | Total dirs delta | `maister-*` delta | Verified result |
|------|-------------|------------------|-------------------|-----------------|
| Wave 1 | 3 | +6 (51→57) | +6 (26→32) | Wave 1 spec audit + work-log |
| Wave 2 | 3 | +6 (57→63) | +6 (32→38) | `2026-06-14-aj-skills-wave2-adoption/implementation/work-log.md` |
| **Wave 3 (spec)** | **4** | **+4 (63→67) ❌** | **+4 (38→42) ❌** | **Contradicts pattern** |
| **Wave 3 (correct)** | **4** | **+8 (63→71)** | **+8 (38→46)** | **Inferred from pattern** |

### Verified current baseline (independent)

```bash
# Source plugin
find plugins/maister/skills -mindepth 1 -maxdepth 1 -type d | wc -l   # 26
ls plugins/maister/commands/*.md | wc -l                                 # 12

# Kiro generated (post Wave 2)
find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d | wc -l           # 63
find plugins/maister-kiro/skills ... -name 'maister-*' | wc -l                     # 38
find plugins/maister-kiro/skills ... ! -name 'maister-*' | wc -l                   # 25
```

Math check: 38 + 25 = 63 ✓

### Spec vs correct Wave 3 targets

| Rule | Spec claim | Correct target | Impact if spec followed |
|------|------------|----------------|-------------------------|
| **Rule 14** (all skill dirs) | 63 → **67** | 63 → **71** | `make validate` fails (actual 71, expected 67) |
| **Rule 28** (`maister-*` only) | 38 → **42** | 38 → **46** | `make validate` fails (actual 46, expected 42) |
| **Rule 23** (shortcuts) | 25 → 25 | 25 → 25 | ✅ Correct |

**Related stale references:** `analysis/gap-analysis.md` L350 claims merged checks "18 → 22" (contradicts spec FR-8.3 "14 → 18"); `analysis/clarifications.md` L12 repeats 63→67 / 38→42. Only the Wave 1–2 +2-per-pair pattern is consistent with live tree.

### Kiro build partial prep (spec accurate)

`platforms/kiro-cli/build.sh`:

- `merge_one` currently has **12** entries (L56–67); Wave 3 needs **+4** → 16 total
- `skills_needing_args` has **32** entries (L183–216); Wave 3 needs **+8** → 40 total
- Wave 3 sedi: only `run \`context-distiller\`` at L319; Wave 1–2 block at L293–318 is the template for full Wave 3 extension
- Header comment L767: "38 slash skills" → should become **46**, not 42

---

## AJ Source Path Verification

| Skill | Spec path | Lines (spec) | Verified |
|-------|-----------|--------------|----------|
| context-distiller | `week7/4-uogolnienie-demo/context-distiller/SKILL.md` | ~483 | ✅ 483 lines |
| aggregate-designer | `week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md` | ~540 | ✅ 540 lines |
| accounting-archetype-mapper | `week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md` | ~547 | ✅ 547 lines |
| pricing-archetype-mapper | `week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md` | ~591 | ✅ 591 lines |

**CI note:** AJ repo is dev-machine reference only (spec risk table L519). Ported content committed to Maister repo is the implementation source of truth — acceptable if implementer copies AJ content into `plugins/maister/` in this PR.

---

## Cross-Reference Stub Verification

| Location | Spec claim | Verified current text |
|----------|------------|----------------------|
| `problem-classifier` L19 | Wave 4 deferral for accounting mapper | ✅ `(Wave 4 — not yet ported)` |
| `problem-classifier` L20 | Wave 4 deferral for pricing mapper | ✅ `(Wave 4 — not yet ported)` |
| `problem-classifier` L409 | Wave 3 deferral for aggregate-designer | ✅ "when that skill is available" |
| `problem-classifier` L507–509 | Wave 3 not yet ported | ✅ table + handoff deferral text |
| `linguistic-boundary-verifier` L42 | Wave 3 not yet available | ✅ `(Wave 3 — not yet available in Maister)` |
| `linguistic-boundary-verifier` L355 | Same deferral in Recommended next steps | ✅ `(Wave 3)` stub |

Wave 3 skills **do not exist** under `plugins/maister/skills/` (grep confirms only stub references in Wave 1–2 skills). Gap analysis "entirely missing" claim is accurate.

---

## Scope & Requirements Alignment

| Decision (requirements / scope-clarifications) | Spec alignment |
|------------------------------------------------|----------------|
| Language gates on all 4 skills | ✅ FR-1.6, FR-2.4, FR-3.4, FR-4.4, AC-1.5 |
| Mappers live in Wave 3 (not Wave 4 deferral) | ✅ FR-6.1, user decisions table |
| Mirror Wave 1–2 port pattern | ✅ FR-9 checklist |
| No orchestrator changes | ✅ Out of scope, ADR-008 |
| `modeling-*` in plugin-development.md | ✅ FR-7.3 (deferred from E1 per gap analysis) |
| Bundle B documentation | ✅ FR-7.1.2, FR-7.2.2 |
| `make build && make validate` gate | ✅ AC-5.1 |

Out-of-scope items (`archetype-scanner`, orchestrator wire-up, generated variant edits) are consistently excluded across spec, requirements, and gap analysis.

---

## Critical Issues

### C1. Kiro Rule 14/28 count targets undercount by 4

**Spec reference:** FR-8.2, Inventory Delta table (L44–45), AC-5.2, AC-5.3, Test Strategy Kiro checks (L459–460)

**Evidence:**

- Wave 2 established +6 per 3 skill/command pairs (`57→63`, `32→38`)
- Wave 3 adds 4 pairs → **+8**, not +4
- Correct post-Wave-3 targets: **71 total**, **46 `maister-*`**, **25 shortcuts**

**Category:** Incorrect

**Impact:** Critical — `make validate` fails after correct implementation if Makefile/tests updated per spec

**Recommendation:** Update spec FR-8.2, Inventory Delta, AC-5.2–5.3, validation bash snippets, `build.sh` header comment (46 slash skills), and downstream analysis docs (`gap-analysis.md`, `clarifications.md`) to **71 / 46 / 25**.

---

## High Issues

### H1. FR-1.4 cites contradictory `disable-model-invocation` precedent

**Spec reference:** FR-1.4 — "same as `problem-classifier`, `metaprogram-classifier`"

**Evidence:**

```4:4:plugins/maister/skills/problem-classifier/SKILL.md
disable-model-invocation: true
```

`metaprogram-classifier` omits `disable-model-invocation`; AJ Wave 3 sources also omit it. Interactive modeling wizards should follow `metaprogram-classifier`, not `problem-classifier`.

**Category:** Ambiguous

**Severity:** High — risk of adding `disable-model-invocation: true` to modeling wizards, breaking natural-language discovery intent

**Recommendation:** Change FR-1.4 reference to **`metaprogram-classifier` only** (omit `problem-classifier` from disable-model-invocation precedent).

### H2. FR-8.1.2 does not enumerate eight new `skills_needing_args` entries

**Spec reference:** FR-8.1.2 — "+8" without names

**Evidence:** Wave 1 spec audit (C2) flagged same gap. Required entries (inferred from Wave 2 pattern):

- `maister-context-distiller`, `maister-aggregate-designer`, `maister-accounting-archetype-mapper`, `maister-pricing-archetype-mapper`
- `maister-modeling-context-distiller`, `maister-modeling-aggregate-designer`, `maister-modeling-accounting-archetype`, `maister-modeling-pricing-archetype`

**Category:** Incomplete

**Recommendation:** List all eight names explicitly in FR-8.1.2 (mirrors Wave 2 spec quality after Wave 1 audit fixes).

### H3. FR-8.3 / gap-analysis merged-command assertion counts inconsistent

**Spec reference:** FR-8.3 "14→18 merged command assertions"; gap-analysis L350 "18 → 22"

**Evidence:** `build-core.test.sh` uses **file existence checks**, not a merged-command counter. Current test label says "14 commands merged" (L28, L99) while `merge_one` has 12 entries + quick-dev/plan handled separately.

**Category:** Ambiguous / Incorrect (gap-analysis)

**Recommendation:** Specify exact four new `test -f` assertions for `maister-modeling-*` dirs; update comment label 14→**18** (12+4 merge_one + quick-dev/plan nuance). Remove gap-analysis "22" figure.

---

## Medium Issues

### M1. Wave 3 sedi block scope underspecified for prose cross-refs

**Spec reference:** FR-8.1.3

**Evidence:** Wave 2 code review (CR-4) noted `linguistic-boundary-verifier` prose refs to `context-distiller` are not rewritten by existing `run \`...\`` sedi. Wave 3 adds live cross-refs in body text; Kiro needs full Wave 3 sedi block per Wave 1–2 patterns (`skill \`...\``, `Invoke the \`...\` skill`, `skill: "..."`).

**Recommendation:** FR-8.1.3 is directionally correct; implementation plan should include a grep pass on generated Kiro output for unprefixed Wave 3 skill names in chain sections.

### M2. `plugin-development.md` standard conflicts with AJ plain-kebab precedent

**Spec reference:** Standards Compliance note (L532–533)

**Evidence:** `plugin-development.md` L25: "User-invocable skills use `name: maister:*` prefix." Wave 1–2 AJ on-demand skills use plain kebab in source.

**Category:** Ambiguous (documented workaround in spec, not resolved in standard)

**Recommendation:** Either update `plugin-development.md` with AJ on-demand exception in FR-7.3 scope, or accept spec note as sufficient for this wave.

### M3. AC-3.1 grep gate may miss mapper Wave 4 deferral strings post-fix

**Spec reference:** AC-3.1 grep command (L439–441)

**Evidence:** Current stubs use `Wave 4 — not yet ported` for mappers; grep pattern includes this variant — good. After fix, zero matches expected. Consider adding `Wave 4 — not yet` without "ported" if any variant remains.

**Category:** Incomplete test coverage (minor)

### M4. Bundle B command vs skill naming in flow text

**Spec reference:** FR-7.1.4 minimum Bundle B text (L177)

**Evidence:** Uses `/maister:reviews-linguistic-boundaries` (command) while chain topology uses skill kebab names — consistent with Bundle A/C pattern in CLAUDE.md.

**Category:** Ambiguous (low confusion risk)

### M5. Analysis documents propagate incorrect Kiro counts

**Spec reference:** N/A (downstream doc drift)

**Evidence:** `gap-analysis.md` L76–77, `clarifications.md` L12 repeat 63→67 / 38→42.

**Recommendation:** Sync analysis docs when spec FR-8 counts are corrected.

---

## Low Issues

### L1. FR-1.1 lists `argument-hint` for context-distiller but FR-2–4 omit explicit requirement

AJ sources include argument hints; Wave 2 skills have them. Implementers should add `argument-hint` to all four — implied by FR-9 / Wave 1–2 checklist but not repeated per skill.

### L2. AC-6 manual smoke is recommended, not blocking

Acceptable per Wave 1 precedent; spec clearly labels "Recommended."

### L3. Spec status "Ready for implementation" should be conditional on FR-8 count fix

Metadata only — update after patch.

---

## Acceptance Criteria Audit

| AC group | Verifiable? | Notes |
|----------|-------------|-------|
| AC-1 Skill artifacts | ✅ | Grep + file checks sufficient |
| AC-2 Commands | ✅ | Pattern matches Wave 1–2 |
| AC-3 Cross-refs | ✅ | Grep gate well-defined |
| AC-4 Documentation | ✅ | Bundle B / tables checkable |
| AC-5 Build pipeline | ⚠️ | **AC-5.2–5.3 targets wrong** (see C1) |
| AC-6 Manual smoke | ✅ | Optional, appropriately scoped |

---

## Clarification Needed

No blocking stakeholder questions. The Kiro count error is a spec correction, not a product decision.

**Resolved at Phase 2 gate (verified in spec):**

- Language gates: Yes (all 4)
- Mapper wave numbering: Wave 3 live
- Port pattern: Mirror Wave 1–2

---

## Recommendations (Priority Order)

1. **Fix Kiro counts** — FR-8.2, Inventory Delta, AC-5.2–5.3, validation snippets: **71 / 46 / 25**
2. **Clarify FR-1.4** — cite `metaprogram-classifier` only for omitting `disable-model-invocation`
3. **Enumerate `skills_needing_args`** — all eight Wave 3 entry names in FR-8.1.2
4. **Specify build-core.test.sh changes** — four new `maister-modeling-*` file assertions + count updates
5. **Sync analysis docs** — correct gap-analysis/clarifications count tables after spec patch

**Recommended next step:** Patch `implementation/spec.md` FR-8 count targets, then generate `implementation/implementation-plan.md`.

---

## Compliance Status

| Dimension | Status |
|-----------|--------|
| Requirements traceability | ✅ FR-1–FR-9 map to requirements and ADRs |
| Codebase baseline accuracy | ✅ Stubs, counts, missing artifacts verified |
| AJ source availability | ✅ 4/4 files on dev machine |
| Build pipeline spec | ❌ Count targets wrong (C1) |
| Scope boundaries | ✅ Consistent |
| Test strategy | ⚠️ Structural gate sound; count assertions need fix |

**Overall verdict:** **pass-with-concerns**
