# Specification Audit: Wave 1 AJ Skills Verification & Completion (Epic E1)

**Auditor:** maister-spec-auditor  
**Date:** 2026-06-14  
**Spec:** `implementation/spec.md`  
**Requirements:** `analysis/requirements.md`  
**Scope gate:** `analysis/scope-clarifications.md`  
**Risk level:** Low (completion edits only; Wave 1 artifacts already shipped)

---

## Executive Summary

The specification accurately describes the remaining work for Epic E1. Independent codebase verification confirms the three scoped gaps (G1, G2, G4) exist exactly as documented, baseline Wave 1 artifacts are in place, and `make validate` passes on all three platform variants without changes.

The spec is **implementable as written** with one structural ambiguity on `problem-classifier` language-gate placement and a minor Kiro headless-default documentation gap. No Makefile, build-script, or skill-count updates are required — correctly excluded from scope.

**Overall verdict:** **pass-with-concerns**

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 1 |
| Medium | 4 |
| Low | 3 |

**Top concerns (no critical blockers):**

1. **H1 — Contradictory language-gate placement for `problem-classifier`:** FR-3 says “before existing input/workflow logic” (which starts at `## Skill Workflow` / Step 0, line ~115), but Implementation Notes say insert “before `## The 4 Problem Classes`” (line ~23). Implementers may place the gate ~90 lines apart; G4-AC-1 (“first workflow step”) does not disambiguate.
2. **M1 — Kiro headless default undocumented:** FR-3 specifies headless default “Match input language” for Kiro, but `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` Headless Defaults table has no row for this gate. Build validation should still pass; `--no-interactive` behavior is normatively undefined.

---

## Baseline Reality Check

Verified against live tree at audit time (commit baseline `607ed5b` / v2.2.0 context).

### Gap inventory (spec claims vs codebase)

| Gap | Spec claim | Verified state | Match? |
|-----|------------|----------------|--------|
| **G1** | `problem-classifier` missing `disable-model-invocation` + invocation guard | Frontmatter has no flag; no “Invocation guard” block. Siblings `requirements-critic` and `transcript-critic` both have flag + guard/description-only explicit-only pattern. | ✅ Accurate |
| **G2** | README Quick Commands missing 3 Wave 1 rows + Bundle A | `README.md` L103–111 lists only `quick-plan`, `quick-dev`, `quick-bugfix`. No `Bundle A` text. | ✅ Accurate |
| **G4** | Language preference gate missing on interactive skills | No `## Language Preference` in repo. Inline “Match the user's language” at `requirements-critic` L263; `problem-classifier` L175. | ✅ Accurate |

### Already-complete items (spec “no change” claims)

| Item | Verification |
|------|--------------|
| 3 skills present | `plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md` exist |
| 3 commands present | `plugins/maister/commands/quick-{requirements-critic,transcript-critic,problem-classifier}.md` — all use `ACTION REQUIRED` + Skill tool delegation |
| Bundle A chain sections | `rg -i 'recommended next'` → 3 matches (incl. `problem-classifier` `## Recommended next steps`) |
| CLAUDE.md backfill | L507–584 documents skills, commands, Bundle A, task-classifier vs problem-classifier distinction |
| No orchestrator leakage | Zero matches in `skills/development/` and `skills/product-design/` |
| Kiro build integration | `merge_one` + `skills_needing_args` include all 6 Wave 1 entries (`build.sh` L64–66, L203–208) |
| Skill counts | `make validate` exit 0; Rule 14 = 57, Rule 23 = 25 shortcuts, Rule 28 = 32 `maister-*` |
| Generated Kiro paths | `maister-{requirements-critic,transcript-critic,problem-classifier}` dirs confirmed under `plugins/maister-kiro/skills/` |

### Gold templates cited in spec

| Template | Verified |
|----------|----------|
| `requirements-critic/SKILL.md` — frontmatter, invocation guard, chain | ✅ `disable-model-invocation: true`; `**Invocation guard**:` block L10–12; `## Recommended Next Steps` L267+ |
| `quick-requirements-critic.md` — thin Skill wrapper | ✅ 11 lines, Skill tool pattern |
| `thermos/SKILL.md` — explicit-only precedent | ✅ `disable-model-invocation: true` only (no invocation guard prose) |

---

## FR Implementability Matrix

| FR | Verdict | Evidence |
|----|---------|----------|
| **FR-1** G1 — problem-classifier explicit invocation | ✅ Implementable | Clear file, frontmatter field, guard pattern from `requirements-critic`. Trigger phrases align with existing description L3. |
| **FR-2** G2 — README discoverability | ✅ Implementable | Target section located L103–111; table format matches existing rows. |
| **FR-3** G4 — language preference gate | ⚠️ Implementable with ambiguity | No existing `Language Preference` precedent in repo; spec provides template. Cursor `AskUserQuestion`→`AskQuestion` sed in `platforms/cursor/build.sh` L63–65. Kiro transform patterns cover `AskUserQuestion — "…"` (`askuser-to-chat-gate.md` L15). **Placement for problem-classifier ambiguous** (H1). |
| **FR-4** Build validation | ✅ Implementable | `make build && make validate` passes today; no count changes needed post-edits. |
| **FR-5** Conformance verification | ✅ Implementable | Grep commands in Verification Checklist are accurate and runnable. |

---

## Acceptance Criteria Audit

| AC group | Assessable? | Notes |
|----------|-------------|-------|
| G1-AC-1..4 | ✅ Yes | Grep + diff review sufficient. G1-AC-2: match `requirements-critic` bold guard, not necessarily `##` heading. |
| G2-AC-1..3 | ✅ Yes | Straightforward README inspection. |
| G4-AC-1..5 | ⚠️ Partial | G4-AC-1 “first workflow step” conflicts with Implementation Notes for `problem-classifier` (H1). G4-AC-4/5 depend on standard gate phrasing — should pass if template followed. |
| E1-AC-1..5 | ✅ Yes | Aggregate checks trace to G1/G2/G4 + existing artifacts. E1-AC-4 already satisfied. |

---

## Scope Boundary Alignment

Cross-checked against `analysis/scope-clarifications.md` and ADRs in `analysis/research-context/decision-log.md`.

| Decision | Spec alignment |
|----------|----------------|
| G1: `disable-model-invocation` on problem-classifier | ✅ FR-1; supersedes prior Wave 1 audit scope gate (critics-only) per user clarification |
| G2: Minimal README | ✅ FR-2 |
| G3: Kiro `@` shortcuts deferred | ✅ Excluded; no `build.sh` shortcut changes |
| G4: Language gate on interactive skills | ✅ FR-3; correctly excludes `transcript-critic` |
| ADR-008 Wave 1 standalone only | ✅ FR-5 orchestrator grep; no development/product-design edits |
| ADR-007 7A + 7D | ✅ Bilingual bodies preserved; gate added without locale build infra |
| No rubric re-port | ✅ File change list limits edits to guards, gate, README |
| 3 source files only | ✅ Matches gap scope |

---

## Standards Compliance

| Standard | Spec behavior | Conflict? |
|----------|---------------|-----------|
| `plugin-development.md` — never edit generated variants | Source-only + rebuild | ✅ |
| `plugin-development.md` — commands as thin wrappers | No command edits; existing wrappers verified | ✅ |
| `plugin-development.md` — commands delegate via Task tool | Quick commands use **Skill tool** (pre-existing Wave 1 pattern) | ⚠️ Standards text stale; spec and live commands are correct |
| `build-pipeline.md` — CI `make build && make validate` | FR-4 | ✅ |
| `build-pipeline.md` — Kiro CHAT GATE transforms | FR-3 platform table | ✅ with M1 headless-default gap |

---

## Issues by Severity

### High

#### H1. `problem-classifier` language-gate placement contradictory

**Spec references:** FR-3 (gate placement), Implementation Notes “Language gate placement”, G4-AC-1.

**Evidence:** `problem-classifier/SKILL.md` structure:

- L11–15: intent table (after intro)
- L23+: `## The 4 Problem Classes` (reference rubric, ~90 lines)
- L115+: `## Skill Workflow` → Step 0 Input Acquisition (actual workflow start)

FR-3: insert after intent table, **“before existing input/workflow logic.”**  
Implementation Notes: insert **“before `## The 4 Problem Classes`.”**

These diverge: rubric content is not input/workflow logic, but placing the gate at L22 vs L114 changes when language is chosen relative to rubric ingestion.

**Impact:** Implementation may pass grep-based AC (section exists) but fail reviewer expectation of “first workflow step” inside `## Skill Workflow`.

**Recommendation:** Pick one normative location — **recommended:** immediately before `## Skill Workflow` / Step 0 (true first workflow step), or reword G4-AC-1 to “before classification workflow begins.”

---

### Medium

#### M1. Kiro headless default for language gate not in transform doc

**Spec reference:** FR-3 Platform compatibility table — “headless default: Match input language.”

**Evidence:** `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` Headless Defaults table (L31–40) has no language-preference row.

**Impact:** `make validate` likely still passes; Kiro `--no-interactive` / smoke behavior for new gate is unspecified in normative transform doc.

**Recommendation:** Add row to Headless Defaults table during G4 implementation, or explicitly defer to skill-local default text in gate section.

---

#### M2. G4-AC-1 wording vs `problem-classifier` document structure

**Spec reference:** G4-AC-1.

**Evidence:** `problem-classifier` interleaves reference rubric (`## The 4 Problem Classes`) before `## Skill Workflow`. “First workflow step” is ambiguous when gate precedes rubric.

**Recommendation:** Tie AC to explicit anchor: “`## Language Preference` appears before `## Skill Workflow`” (or before Step 0).

---

#### M3. Multiple inline language instructions to supersede

**Spec reference:** FR-3 point 4.

**Evidence:** Spec cites `requirements-critic` L263 only. `problem-classifier` also has L175 (“Always match the user's language”) inside Step 2.

**Impact:** Partial update leaves conflicting instructions.

**Recommendation:** Add explicit line reference for `problem-classifier` L175 to FR-3 / File Change List.

---

#### M4. Invocation guard format: “section” vs bold paragraph

**Spec reference:** FR-1 point 2 (“Invocation guard section”).

**Evidence:** Gold template `requirements-critic` uses `**Invocation guard**:` bold paragraph (L10), not `## Invocation guard`. Verification grep `'Invocation guard'` matches either.

**Impact:** Low risk if implementer reads gold template; literal “section” could mislead.

**Recommendation:** Already mitigated by “matching requirements-critic pattern” — note in implementation plan.

---

### Low

#### L1. Subjective trigger phrases for G1 guard

**Spec reference:** FR-1 — “classify / classification in modeling context.”

**Impact:** Guard prose requires judgment; not machine-verifiable beyond grep.

**Recommendation:** Acceptable; mirror `requirements-critic` guard style.

---

#### L2. Smoke tests manual only

**Spec reference:** Verification Checklist — smoke invoke.

**Impact:** No automated regression for interactive gates; acceptable for Wave 1 completion task.

---

#### L3. README line number drift

**Spec reference:** FR-2 “lines ~107–111.”

**Evidence:** Verified accurate today; may drift with unrelated README edits.

---

## Completeness Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Requirements traceability | ✅ Complete | G1/G2/G4 map to scope clarifications, gap analysis, ADR-007/008 |
| File change list | ✅ Complete | 3 source files; exclusions accurate |
| Verification checklist | ✅ Complete | Runnable grep/build commands; ordered sensibly |
| Platform propagation | ✅ Complete | Cursor sed + Kiro CHAT GATE documented; generated paths correct |
| Risks & mitigations | ✅ Adequate | Scope creep and rubric re-port risks well covered |
| Definition of Done | ✅ Complete | Includes work-log expectation |

**Missing (non-blocking):**

- Explicit decision on `problem-classifier` gate anchor (H1)
- Kiro headless default row (M1)
- Second supersede target for `problem-classifier` L175 (M3)

---

## Ambiguities Summary

| ID | Topic | Resolution needed? |
|----|-------|-------------------|
| A1 | problem-classifier gate: before rubric vs before Step 0 | **Yes — recommend before `## Skill Workflow`** |
| A2 | “Invocation guard section” heading level | No — follow `requirements-critic` bold pattern |
| A3 | Kiro headless default sourcing | Optional — add transform table row |
| A4 | “classify” trigger phrase scope | No — prose judgment acceptable |

---

## Recommendations Before Implementation

1. **Resolve H1** in spec or implementation plan: normative anchor for `problem-classifier` language gate (prefer before `## Skill Workflow`).
2. **Extend FR-3** to list both supersede targets: `requirements-critic` L263 and `problem-classifier` L175.
3. **Optional:** Add language-preference row to Kiro Headless Defaults table when implementing G4.
4. **Proceed** — no spec rewrite required for G1/G2; build pipeline and counts need no changes.

---

## Auditor Sign-off

| Criterion | Result |
|-----------|--------|
| Spec matches codebase baseline | ✅ |
| Scoped gaps verified on disk | ✅ |
| Implementable without new skills/commands | ✅ |
| Build/validate expectations correct | ✅ |
| Critical blockers | **None** |

**Verdict:** **pass-with-concerns** — safe to proceed to implementation planning; resolve H1 during planning or first implementation step to avoid AC review disagreement.

---

*Linked from: `implementation/spec.md`*
