# Specification Audit: AJ Skills Wave 1 Adoption (Epic E1)

**Auditor:** maister-spec-auditor  
**Date:** 2026-06-13  
**Spec:** `implementation/spec.md`  
**Requirements:** `analysis/requirements.md`  
**Scope gate:** `analysis/scope-clarifications.md`  
**Risk level:** Low–Medium (content port + build integration)

---

## Executive Summary

The specification is **substantially complete** for Wave 1 scope: all seven functional requirements trace to requirements and scope-clarification decisions, AJ source paths are verified on disk, and Maister reuse patterns (`grill-me`, `thermo-nuclear-review`, `reviews-code`, Kiro `merge_one` / `skills_needing_args`) are correctly identified for the skill ports and documentation work.

**FR-6 (build pipeline integration) contains critical count errors** that would leave `make validate` failing even after a correct Wave 1 implementation. Independent verification shows `validate-kiro` **already fails today** on Rule 14, and the spec’s proposed Rule 14 update (26 → 32) does not match how the Kiro build actually counts directories.

**Overall verdict:** **pass-with-concerns** — proceed to implementation planning only after correcting FR-6 Makefile/test targets and completing `skills_needing_args` for all six new argument-bearing skills.

| Severity | Count |
|----------|------:|
| Critical | 3 |
| High | 5 |
| Medium | 7 |
| Low | 4 |

---

## FR Implementability Matrix

Evidence from existing Maister patterns and verified AJ sources (`/Users/mrapacz/Projects/architekt-jutra-code/week8/{1,2,3}/` — all three `SKILL.md` files present).

| FR | Verdict | Evidence |
|----|---------|----------|
| **FR-1** requirements-critic | ✅ Implementable | `plugins/maister/skills/grill-me/SKILL.md` (plain kebab `name`, `argument-hint`, interactive); `plugins/maister/skills/thermo-nuclear-review/SKILL.md` (`disable-model-invocation: true`); AJ source has 4 checks + `AskUserQuestion` in checks 2–3 |
| **FR-2** transcript-critic | ✅ Implementable | AJ frontmatter bug confirmed (description copies requirements-critic text); body has 7 `### Check N` sections, non-interactive; thermo-nuclear critic frontmatter pattern applies |
| **FR-3** problem-classifier | ✅ Implementable | AJ source ~487 lines, 4 classes, `maister:aggregate-designer` invoke at line 399 (stub target clear); `grill-me` omits `disable-model-invocation` — matches scope gate (critics only) |
| **FR-4** quick-* commands | ⚠️ Implementable with gap | `plugins/maister/commands/reviews-code.md` (ACTION REQUIRED + delegate); `plugins/maister/commands/work.md` (Skill tool invocation). **No existing single-purpose command delegates only via Skill tool** — hybrid is new but derivable |
| **FR-5** CLAUDE.md backfill | ✅ Implementable | `plugins/maister/CLAUDE.md` has Available Skills/Commands tables; grep confirms no `grill-me` / `thermo` entries today |
| **FR-6** build pipeline | ❌ Not implementable as written | Makefile Rule 14 semantics wrong; Kiro tests stale; `skills_needing_args` list incomplete (see Critical) |
| **FR-7** platform discipline | ✅ Implementable | Matches `plugin-development.md` source-only rule; `platforms/kiro-cli/build.sh` `apply_chat_gate_transforms()` handles `AskUserQuestion` |

---

## Build Pipeline Count Verification

### Makefile (authoritative for `make validate-kiro`)

| Rule | Spec claim | Verified current | Correct Wave 1 target (inferred) |
|------|------------|------------------|----------------------------------|
| **Rule 14** (all skill dirs) | 26 → 32 | **51 total** — **validate FAILS today** | **57** (51 + 3 source skills + 3 merged commands) |
| **Rule 28** (`maister-*` only) | 26 → 32 | **26** — would pass if Rule 14 did not fail first | **32** (21 source + 11 merged) |

**Grep evidence:**

```110:111:Makefile
	@echo "Rule 14: exactly 26 skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') -eq 26 || (echo "FAIL: expected 26 skill directories" && exit 1)
```

```144:145:Makefile
	@echo "Rule 28: exactly 26 maister-* skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d -name 'maister-*' | wc -l | tr -d ' ') -eq 26 || (echo "FAIL: expected 26 maister-* skill directories (rule 28)" && exit 1)
```

**Live counts** (built tree, 2026-06-13): total **51**, `maister-*` **26**, non-`maister-*` shortcut dirs **25** (from `build.sh` step 20 `generate_shortcut_skill`).

**Inventory delta (source)** — spec accurate:

| Metric | Verified current | Spec after Wave 1 |
|--------|------------------|-------------------|
| Source skills | 18 | 21 |
| Source commands | 8 | 11 |
| Kiro `maister-*` dirs | 26 | 32 |

**Kiro `merge_one` entries** — spec accurate: currently **8** in `platforms/kiro-cli/build.sh` (lines 56–63); Wave 1 adds 3 → **11**.

### Kiro tests (stale vs Makefile)

| File | Asserted count | Makefile / live reality |
|------|----------------|-------------------------|
| `platforms/kiro-cli/tests/build-core.test.sh` | **22** total skill dirs; **8** merged commands | Makefile Rule 28: **26** `maister-*`; live total **51** |
| `platforms/kiro-cli/tests/validation.test.sh` | **22** total and **22** `maister-*` | Makefile Rules 14/28: **26** / **26**; live **51** / **26** |
| `platforms/kiro-cli/tests/e2e-matrix.test.sh` | **26** agent JSON files | Unchanged by Wave 1 (no new agents) — still valid |

Spec FR-6 says “verify during implementation” but does not specify corrected test targets. Requirements FR-6 explicitly requires updating Kiro tests — **spec should name files and expected values**.

---

## AJ Source Path Verification

| Skill | Spec path | Verified |
|-------|-----------|----------|
| requirements-critic | `.../week8/2/requirements-critic/SKILL.md` (~261 lines) | ✅ Exists |
| transcript-critic | `.../week8/1/transcript-critic/SKILL.md` (~213 lines) | ✅ Exists; wrong frontmatter confirmed |
| problem-classifier | `.../week8/3/problem-classifier/SKILL.md` (~487 lines) | ✅ Exists; `maister:aggregate-designer` invoke present |

Week numbering `{1,2,3}` matches requirements and gap analysis.

---

## Scope Boundary Alignment

| scope-clarifications.md decision | Spec alignment |
|-----------------------------------|----------------|
| `disable-model-invocation` — critics only | ✅ FR-1, FR-2 yes; FR-3 omit (matches ADR-008 literal + scope gate) |
| Language gate deferred | ✅ ADR-007 partial; bilingual bodies preserved |
| Bundle A in CLAUDE.md + chain sections | ✅ FR-5 + FR-1/FR-2 chain sections |
| `modeling-*` standard deferred to Wave 4 (E4) | ✅ Out of scope + deferred standards table |
| No orchestrator changes | ✅ FR-7; out of scope lists development/product-design/research |
| No Kiro @shortcut layer | ✅ Out of scope; spec does not add shortcuts |
| `aggregate-designer` stub only | ✅ FR-3 |

Minor: requirements out-of-scope lists only `development`/`product-design`; spec also excludes `research` — **additive, not contradictory**.

---

## Standards Compliance (`plugin-development.md`)

| Standard rule | Spec behavior | Conflict? |
|---------------|---------------|-----------|
| Never edit generated variants | FR-7 explicit | ✅ |
| Kebab-case skill dirs / command files | FR-1–4 | ✅ |
| Commands as thin wrappers, &lt;200 lines | FR-4 | ✅ |
| SKILL.md as SOT | Hybrid pattern ADR-001 | ✅ |
| **Skill frontmatter `name: maister:*` for user-invocable** | Spec: plain kebab (`grill-me` precedent) | ⚠️ **Standards doc stale** — live source uses plain kebab for on-demand utilities; HLD and `build.sh` `rename_skill_directories()` add `maister-` at build time. Spec is correct vs practice; standards text is wrong |
| Commands delegate via **Task tool** | FR-4: Skill tool for self-contained rubric skills | ⚠️ **Documented deviation** — justified by ADR-001 hybrid (skills not agents). Recommend one-line note in spec pointing to ADR-002 / no agent for critics |

No contradiction that blocks implementation if implementer follows spec + existing `grill-me`/`thermo-nuclear-*` artifacts over outdated standards wording.

---

## Critical Issues

### C1. Rule 14 Makefile target is wrong (26 → 32)

**Spec reference:** FR-6 Makefile table; SC-10, SC-11.

**Evidence:** Rule 14 counts **all** skill directories; Kiro build emits **25 shortcut dirs** (e.g. `dev`, `grill-me`, `resume`) plus **26** `maister-*` dirs today (**51 total**). `make validate-kiro` fails at Rule 14 on current tree.

**Impact:** Implementing spec literally (Rule 14 = 32) still fails validate (actual total ≈ **57** after Wave 1).

**Recommendation:** Update spec to Rule 14 **51 → 57** (or change Rule 14 to count only `maister-*` and document that shortcut dirs are excluded — align Rule 14 with Rule 28 semantics).

---

### C2. `skills_needing_args` incomplete — missing standalone skills

**Spec reference:** FR-6 lists only merged `maister-quick-*` entries.

**Evidence:** `grill-me` with `argument-hint` is in `skills_needing_args` as `maister-grill-me` (`build.sh` lines 179–200). New standalone skills all declare `argument-hint` in FR-1–3 but spec omits:

- `maister-requirements-critic`
- `maister-transcript-critic`
- `maister-problem-classifier`

**Impact:** Direct `/maister-*` skill invocation on Kiro would not receive `$ARGUMENTS` injection; acceptance criterion “$ARGUMENTS injected for new Kiro skills that accept user input” fails for standalone paths.

**Recommendation:** Add all **six** entries (3 standalone + 3 merged) to FR-6 and implementation checklist.

---

### C3. Kiro test expected counts unspecified and internally inconsistent

**Spec reference:** FR-6 “Kiro test files if they assert skill directory counts (verify during implementation)”; requirements FR-6 mandates test updates.

**Evidence:** Tests assert **22**; Makefile asserts **26** (total for Rule 14); live tree has **51** total / **26** `maister-*`.

**Impact:** Implementation plan cannot close FR-6 without guessing test targets; risk of green Makefile + red test suite.

**Recommendation:** Spec must list `build-core.test.sh`, `validation.test.sh` with explicit post-Wave-1 expectations aligned with C1 fix.

---

## High Issues

### H1. Pre-existing validate gate failure not acknowledged

**Evidence:** `make validate-kiro` exits at Rule 14 on master (2026-06-13).

**Recommendation:** Add spec prerequisite or Wave 1 sub-task: fix Rule 14 baseline before or as part of FR-6; SC-10 cannot pass otherwise.

---

### H2. No prior art for single-purpose Skill-tool command wrapper

**Evidence:** Only `work.md` uses Skill tool from commands; it is multi-step orchestration, not a thin rubric delegate.

**Recommendation:** Add normative command template (5–10 lines) in spec or reference a draft stub in implementation plan — reduces implementer variance.

---

### H3. `build-core.test.sh` merged-command count not in spec

**Evidence:** Test asserts **8** merged commands; Wave 1 → **11**.

**Recommendation:** Add to FR-6 acceptance criteria alongside skill-dir counts.

---

### H4. Rule 26 CHAT GATE threshold may need rebaseline

**Evidence:** Makefile Rule 26 requires total CHAT GATE count ≥ **200**; new interactive skills (`requirements-critic`, `problem-classifier`) add gates.

**Recommendation:** Note in testing approach: re-run gate audit after port; bump threshold if needed.

---

### H5. `build.sh` / generated README skill count comments stale

**Evidence:** `platforms/kiro-cli/build.sh` lines 722–723 document “26 slash skills”; Wave 1 needs **32** for `maister-*` narrative.

**Recommendation:** Include in FR-6 file list (comments only, not generated output).

---

## Medium Issues

### M1. plugin-development.md frontmatter schema drift undocumented in spec

Standards say `maister:*` for user-invocable skills; Wave 1 follows `grill-me` plain kebab. Spec should cite precedent explicitly to prevent implementer confusion.

### M2. FR-1 Check 4 and `AskUserQuestion`

AJ Check 4 (quantifier probe) generates questions but does not mandate `AskUserQuestion` tool calls. Spec FR-1 says interactive gates in “Checks 2–4” — acceptable intent, minor port ambiguity.

### M3. Transcript check naming vs AJ

Spec lists seven check themes; AJ uses “Fact vs Opinion vs **Hearsay**”, “Consensus Audit”, etc. Acceptable if port preserves AJ headings — add “preserve AJ check titles” to FR-2 acceptance.

### M4. Codebase analysis drift

`analysis/codebase-analysis.md` recommends `disable-model-invocation` on all three skills; spec correctly follows scope gate (critics only). Analysis doc should not drive implementation.

### M5. FR-6 “Copilot and Cursor variants include equivalent skills/commands”

No Makefile structural count rules for Copilot/Cursor documented in spec — verification is grep/manual only.

### M6. Requirements FR-6 vs spec test detail gap

Requirements require Kiro test updates; spec defers to “verify during implementation” without numbers.

### M7. ADR-007 language gate (7D) deferred but HLD still lists it for requirements-critic

Scope gate overrides; spec documents deferral — note ADR-007 is partially superseded for E1 to avoid planner conflict.

---

## Low Issues

### L1. Gap analysis says `AskUserQuestion` heavy in checks 2–3; spec says 2–4 — minor wording delta.

### L2. FR-5 task-classifier “5 workflow types” vs CLAUDE.md table showing “4 workflow types” in one section — spec correctly says 5; backfill should fix plugin doc inconsistency (in scope).

### L3. Epic effort “~960 lines” — AJ sources sum ~961; accurate.

### L4. Spec references `plugins/maister/commands/reviews-code.md` for Skill substitution — file uses Task tool throughout; comment in spec is clear but easy to misread.

---

## Success Criteria Audit

| Criterion | Testable? | Notes |
|-----------|-----------|-------|
| SC-1 – SC-9 | ✅ | Frontmatter, smoke, grep, CLAUDE.md |
| SC-10 | ⚠️ | Blocked until C1/H1 resolved |
| SC-11 | ⚠️ | Rule 28 → 32 correct; Rule 14 as spec written is wrong |
| SC-12 – SC-13 | ✅ | Additive + bilingual preservation |

---

## Top Critical Findings (action before implementation)

1. **Fix Rule 14 semantics** — do not set Rule 14 to 32; either **51 → 57** for all dirs or redefine Rule 14 to match `maister-*` only and reconcile with shortcut skills.
2. **Add six `skills_needing_args` entries** — standalone critics/classifier plus merged `quick-*`, not just three merged commands.
3. **Specify Kiro test file updates** — `build-core.test.sh` and `validation.test.sh` need explicit post-Wave-1 counts aligned with Makefile; current tests assert obsolete **22**.

---

## Verdict

**pass-with-concerns**

Wave 1 functional design (FR-1–FR-5, FR-7), scope alignment, AJ sources, and hybrid packaging are sound and implementable. **FR-6 must be corrected** before implementation planning is considered complete; without that, SC-10/SC-11 are not achievable as specified.

**Recommended next step:** Patch `implementation/spec.md` FR-6 (Makefile Rule 14, full `skills_needing_args` list, named Kiro test targets, pre-existing Rule 14 failure note), then proceed to implementation plan.

---

*Linked inputs: `analysis/requirements.md`, `analysis/gap-analysis.md`, `analysis/codebase-analysis.md`, `analysis/scope-clarifications.md`, `analysis/research-context/decision-log.md`, `analysis/research-context/high-level-design.md`, `.maister/docs/standards/global/plugin-development.md`*
