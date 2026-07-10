# Specification Audit Report

**Spec**: `implementation/spec.md`  
**Requirements**: `analysis/requirements.md`  
**Plan**: `analysis/plan-input.md`  
**Audit type**: Pre-implementation (spec quality and implementability)  
**Date**: 2026-07-10

## TL;DR

The spec is **implementation-ready** for a source-plugin Markdown + build-pipeline task. It faithfully incorporates Phase 1 clarifications (user docs, ADR location, Bundle D standalone, commands.md parity) and aligns with the plan's seven-step sequence. Kiro inventory math (67→69, 42→43, 25→26) matches current repository counts. **Verdict: pass-with-concerns** — 0 Critical, 2 High, 5 Medium, 4 Low. No blockers to starting TDD red gate.

## Key Decisions

- **Pre-implementation scope** — Audit evaluates spec completeness/clarity against requirements and codebase evidence, not post-build compliance (nothing implemented yet).
- **Kiro count math verified** — Current generated inventory is 67 total (42 `maister-*` + 25 shortcuts); adding `maister-grill-with-docs` + `/grill-with-docs` shortcut yields spec's 69/43/26 targets.
- **Explicit-only catalog asymmetry is intentional but risky** — D5/FR-3.2 require "Explicit request only." only on `grill-me`; `grill-with-docs` gets the same frontmatter flag but no matching catalog suffix requirement.
- **Behavioral grilling protocol is prose-verified** — FR-1.3–1.8 and FR-2.4–2.6 are not structurally testable; acceptance relies on SKILL.md review and manual session checks.

## Open Questions / Risks

- **FR-5.4 assertion strings undefined** — Implementer must choose grep targets for "prohibit plan implementation" in generated SKILL.md; risk of flaky or weak tests.
- **No repo ADR tree or MADR template** — `.maister/docs/decisions/` does not exist; FR-2.10 "MADR-style" is named but not linked to a canonical template in-repo.
- **Protocol duplication (D2)** — Two independent SKILL.md copies of the grilling protocol may drift unless cross-references are maintained.
- **Cursor inventory stays in range** — Current count 29; after add = 30, within `skill-inventory.test.sh` band 27–31; FR-5.6 extension likely unnecessary.

---

## Verdict Summary

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 2 |
| Medium | 5 |
| Low | 4 |

**Overall**: pass-with-concerns

---

## Audit Dimensions

### Completeness

| Area | Status | Evidence |
|------|--------|----------|
| Requirements traceability | ✅ Complete | All FR-1–FR-7 from `requirements.md` expanded with IDs, priorities, and acceptance criteria in spec |
| Plan alignment | ✅ Complete | Spec covers plan steps 1–7 (TDD tests → skills → catalog → Kiro → build → validate → user docs) |
| Scope boundaries | ✅ Complete | In/out scope matches requirements; Bundle D standalone decision (I1) reflected in D6, FR-3.4, FR-7.6 |
| Platform coverage | ✅ Complete | FR-6.3 names Copilot, Cursor, Kiro, Kilo naming transforms |
| Standards checklist | ✅ Complete | 13-item checklist references applicable standards files |
| Reusable components | ✅ Complete | Template paths verified: `thermos`, `requirements-critic`, `build.sh` grill-me pattern, `language-md-convention.md` |

**Gap**: `docs/cursor-agent-support.md` lists `/grill-me` shortcut (L258) but is outside FR-7 scope — not required, but may drift after implementation.

### Clarity

| Area | Status | Notes |
|------|--------|-------|
| Two-mode differentiation | ✅ Clear | Skill Boundary Matrix (L192–200) and D1/D6 remove ambiguity |
| Kiro inventory targets | ✅ Clear | Six synchronized sites enumerated (D7, FR-4.3–4.4, FR-5.1–5.3) |
| ADR significance criteria | ✅ Clear | Three criteria repeated consistently (FR-2.9, D4, acceptance #2) |
| `language.md` integration | ✅ Clear | FR-2.7–2.8 align with `language-md-convention.md` adoption rules |
| Line-count targets | ⚠️ Minor conflict | FR-1.10: ~60–100 lines; NFR-1: ~60–150 per skill |
| Confirmation granularity | ⚠️ Ambiguous | FR-2.7 "after user confirms term resolution" — per-term vs batch edit unspecified |
| FR-5.4 test contract | ⚠️ Underspecified | New test required but no example grep patterns or source phrases |

### Consistency (Spec ↔ Requirements ↔ Plan)

| Check | Result |
|-------|--------|
| User docs files | ✅ Match — four files locked in requirements Phase 1 and FR-7 |
| ADR default `.maister/docs/decisions/` | ✅ Match — requirements Q&A, plan, spec D4 |
| No shared grilling engine | ✅ Match — D2, out-of-scope |
| No CONTEXT.md | ✅ Match — D3, FR-2.12, out-of-scope |
| TDD-first Kiro counts | ✅ Match — FR-5.5, plan step 1 |
| Bundle D | ✅ Match — standalone cross-links only (scope-clarifications I1) |
| grill-me catalog suffix | ✅ Match — FR-3.2, requirements Phase 1 |

**Resolved gap from gap-analysis**: Plan-input omitted explicit user-docs step; spec FR-7 now includes it.

### Testability

| Requirement | Testability | Notes |
|-------------|-------------|-------|
| FR-4.3–4.4, FR-5.1–5.3 (Kiro counts/shortcut) | ✅ High | Exact counts and file paths; current baseline verified in Makefile L170–204 and three Kiro test files |
| FR-5.4 (implementation prohibition) | ⚠️ Medium | Concept clear; assertion mechanism undefined |
| FR-6.4 (read-only vs docs distinction in generated output) | ⚠️ Medium | Manual inspection or content grep; no prescribed patterns |
| FR-1.3–1.8, FR-2.4–2.6 (grilling behavior) | ⚠️ Low | SKILL.md prose + manual session verification only |
| FR-6.5 (`make validate`) | ✅ High | Binary pass/fail gate |
| FR-5.6 (Cursor/Kilo extension) | ✅ N/A optional | Cursor at 29 skills; +1 = 30, within 27–31 band — extension likely not needed |

### Standards Compliance

| Standard | Spec reference | Codebase evidence |
|----------|------------------|-------------------|
| `plugin-development.md` | NFR-3, checklist | Source-only edit rule matches CLAUDE.md plugin principles |
| `build-pipeline.md` | FR-6, FR-4, checklist | Makefile rules 14/23/28 exist with current 67/25/42 assertions |
| `minimal-implementation.md` | D2, D4, checklist | No shared engine; sparse ADR policy explicit |
| `language-md-convention.md` | D3, FR-2.7–2.8, checklist | Standard file exists with adoption guidance |
| `test-writing.md` | FR-5.5, checklist | TDD-first ordering specified |
| `conventions.md` | Checklist | Read-only / no-implementation boundaries stated |

**Template availability for FR-1.11**: `thermos/SKILL.md` has `disable-model-invocation: true` (L4); `requirements-critic/SKILL.md` has invocation guard block (L10–12). Implementable as specified.

---

## Findings

### High

**H1 — FR-5.4 lacks concrete assertion contract**

**Spec reference**: FR-5.4, FR-5.5, acceptance criterion #10 — "generated-content check: both grilling modes prohibit plan implementation"

**Evidence**: No existing test in `platforms/kiro-cli/tests/` greps for implementation prohibition. Gap-analysis and spec list this as a new component with no example strings (e.g., "never implement", "do not implement the plan").

**Category**: Ambiguous / Incomplete test spec

**Severity**: High — TDD red gate depends on inventing assertions; weak patterns may pass without enforcing behavior

**Recommendation**: Add to spec or implementation plan: minimum grep targets for source `plugins/maister/skills/grill-me/SKILL.md` and `grill-with-docs/SKILL.md` (and optionally generated Kiro copies), e.g. require phrases matching `(?i)(never|do not|prohibit).*(implement|implementation)` and absence of contradictory "proceed to implement" language.

---

**H2 — Explicit-only signaling asymmetric between two equally gated skills**

**Spec reference**: D5, FR-2.1, FR-3.2, acceptance #3 — `disable-model-invocation: true` on both; catalog suffix only on `grill-me`

**Evidence**: Peers `thermos`, `requirements-critic`, `linguistic-boundary-verifier` all carry "Explicit request only." in catalog (`plugins/maister/CLAUDE.md` Review & Utility table). `grill-with-docs` will also use `disable-model-invocation: true` (FR-2.1) but FR-3.3 does not require the suffix.

**Category**: Inconsistency (internal)

**Severity**: High — Users browsing catalog may not recognize `grill-with-docs` as explicit-only; discoverability gap in `docs/on-demand-skills.md` explicit-only section (L31)

**Recommendation**: Add "Explicit request only." to FR-3.3 catalog description for `grill-with-docs`, or document intentional omission in D5 with rationale. Prefer parity with peer explicit-only skills.

---

### Medium

**M1 — Line-count targets conflict**

**Spec reference**: FR-1.10 (~60–100 lines) vs NFR-1 (~60–150 lines)

**Evidence**: Same spec, different ranges for `grill-me` vs both skills

**Category**: Ambiguous

**Severity**: Medium — Implementer may overshoot FR-1.10 while satisfying NFR-1

**Recommendation**: Unify to one range (e.g., 60–120) or state FR-1.10 is stricter target for rewrite, NFR-1 is ceiling for new skill.

---

**M2 — MADR-style ADR format not anchored to repository artifact**

**Spec reference**: FR-2.10, D4 — propose `.maister/docs/decisions/` (MADR-style)

**Evidence**: `Glob **/decisions/**` returns 0 files; no MADR template in `.maister/docs/standards/`. Research workflow may use ADRs elsewhere but no canonical path for this repo.

**Category**: Incomplete detail

**Severity**: Medium — First ADR creation relies entirely on skill prose; acceptable if skill includes inline MADR skeleton

**Recommendation**: FR-2.10 should reference research-workflow MADR example path if one exists, or require skill to embed minimal MADR frontmatter template in SKILL.md.

---

**M3 — `docs/cursor-agent-support.md` omitted from FR-7**

**Spec reference**: FR-7.1–7.5 list four user-doc files

**Evidence**: `docs/cursor-agent-support.md` L258 documents `/grill-me` → `/maister-grill-me`; not in scope list

**Category**: Potential doc drift

**Severity**: Medium — Post-implementation shortcut table incomplete for Cursor users reading Polish technical doc

**Recommendation**: Add optional FR-7.8 or note in out-of-scope that cursor-agent-support is intentionally excluded (if so).

---

**M4 — FR-2.7 confirmation granularity unspecified**

**Spec reference**: FR-2.7 — "Update `language.md` inline only after user confirms term resolution"

**Evidence**: No per-term vs per-session batch rule

**Category**: Ambiguous

**Severity**: Medium — Could cause premature multi-section edits or overly chatty single-term gates

**Recommendation**: Specify "one confirmed term → one inline edit" to match grilling one-question discipline.

---

**M5 — Duplicated grilling protocol (D2) creates long-term drift risk**

**Spec reference**: D2 — duplicate short protocol in two SKILL.md files

**Evidence**: Accepted trade-off; no cross-reference maintenance requirement in spec

**Category**: Risk (accepted)

**Severity**: Medium — Future protocol fixes must touch two files

**Recommendation**: Add one line in both skills: "Protocol parity with `grill-me` / `grill-with-docs` — update both when changing core grilling discipline."

---

### Low

**L1 — User story grammar**

**Spec reference**: User story L41 — "As a **architect**"

**Category**: Editorial

**Severity**: Low

**Recommendation**: "As an architect"

---

**L2 — Plan smoke test not in spec FR-6**

**Spec reference**: Plan step 7 — optional Cursor CLI smoke test for `/maister-grill-me` and `/maister-grill-with-docs`

**Evidence**: Spec FR-6 stops at `make validate`; smoke test absent

**Category**: Omission (optional)

**Severity**: Low — Plan marks it conditional ("If supported by local environment")

**Recommendation**: Add optional FR-6.6 or leave as implementer discretion.

---

**L3 — FR-4.5 / FR-5.6 marked Should**

**Spec reference**: Cursor reference sed; Cursor/Kilo inventory extension

**Evidence**: FR-4.5 needed if cross-skill mentions added; FR-5.6 likely unnecessary (Cursor count 29→30 in range)

**Category**: Informational

**Severity**: Low

**Recommendation**: Implement FR-4.5 when writing cross-links in SKILL.md; skip FR-5.6 unless count exits 27–31 band.

---

**L4 — Behavioral acceptance criteria not automatable**

**Spec reference**: Acceptance #1–2 (separate facts/decisions, convergence gate, sparse ADRs)

**Evidence**: Inherent to interactive skills

**Category**: Testability limitation (expected)

**Severity**: Low

**Recommendation**: Add manual verification checklist to implementation plan or work-log.

---

## Requirements Coverage Matrix

| Requirements source | Spec coverage |
|--------------------|---------------|
| FR-1 strengthen grill-me | FR-1.1–1.11 ✅ |
| FR-2 grill-with-docs | FR-2.1–2.14 ✅ |
| FR-3 catalog | FR-3.1–3.5 ✅ |
| FR-4 Kiro generation | FR-4.1–4.6 ✅ |
| FR-5 structural tests | FR-5.1–5.6 ✅ |
| FR-6 build/verify | FR-6.1–6.5 ✅ |
| FR-7 user docs | FR-7.1–7.7 ✅ |
| Phase 1 clarifications | Reflected in D3–D8, FR-7 ✅ |
| Phase 2 scope (Bundle D, commands.md) | D6, FR-7.3, FR-7.6 ✅ |
| Out-of-scope items | Matches requirements ✅ |

No requirements traceability gaps identified.

---

## Implementability Evidence

| Claim | Verified |
|-------|----------|
| Current Kiro baseline 67/42/25 | ✅ Makefile L170–204; `build-core.test.sh` L45–50; `validation.test.sh` L78–84 |
| `grill-me` lacks `disable-model-invocation` | ✅ `plugins/maister/skills/grill-me/SKILL.md` — frontmatter L1–5 only |
| Kiro dual-skill pattern exists | ✅ `build.sh` L729 `generate_shortcut_skill "grill-me"`; L195 `maister-grill-me` in `skills_needing_args` |
| Template skills exist | ✅ `thermos/SKILL.md`, `requirements-critic/SKILL.md` |
| User doc patterns exist | ✅ `docs/on-demand-skills.md` grill-me section L248–262; `docs/commands.md` L289–297 |
| Source skill count 28 → +1 new | ✅ `find plugins/maister/skills` = 28 directories |
| Generated edit prohibition | ✅ CLAUDE.md / AGENTS.md — never edit `plugins/maister-cursor/` etc. directly |

---

## Recommendations Before Implementation

1. **Define FR-5.4 grep contract** — Add 2–3 required substrings for implementation-ban assertions before writing failing tests.
2. **Resolve explicit-only catalog parity** — Extend FR-3.3 with "Explicit request only." for `grill-with-docs` or document exception.
3. **Unify line-count guidance** — Single range in FR-1.10 and NFR-1.
4. **Clarify FR-2.7 edit gate** — One confirmed term → one inline edit.
5. **Proceed TDD order** — Update six Kiro count sites + phase2 shortcut test + FR-5.4 content test → red → implement skills → `make build && make validate`.

---

## Compliance Status

| Dimension | Assessment |
|-----------|------------|
| Completeness | ✅ |
| Clarity | ⚠️ Minor gaps (H1, M1, M4) |
| Requirements consistency | ✅ |
| Plan consistency | ✅ |
| Testability | ⚠️ FR-5.4 and behavioral criteria need clarification |
| Standards compliance | ✅ |
| Implementability | ✅ |

**Final verdict**: **pass-with-concerns** — safe to proceed; address H1 and H2 during implementation-plan writing or first implementation step to avoid rework.
