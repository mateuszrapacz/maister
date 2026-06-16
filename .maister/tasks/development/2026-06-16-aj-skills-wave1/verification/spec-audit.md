# Specification Audit Report: Epic E1 (Wave 1) Verification & Close

**Auditor:** spec-auditor subagent  
**Date:** 2026-06-16  
**Spec:** `implementation/spec.md`  
**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave1`  
**Inputs reviewed:** `analysis/requirements.md`, `analysis/gap-analysis.md`, `analysis/codebase-analysis.md`, `analysis/research-context/high-level-design.md`, `analysis/research-context/decision-log.md`, live `plugins/maister/` artifacts

---

## Executive Summary

| Field | Assessment |
|-------|------------|
| **Overall verdict** | **PASS WITH CONCERNS** |
| **Implementability** | High — verification-first scope matches pre-existing implementation; no greenfield port assumed |
| **Completeness vs E1** | Strong — all 10 gap-analysis acceptance criteria mapped to FR-1 with verification methods |
| **ADR consistency** | Reconciled — ADR-008 early 8B inclusion documented per user Phase 2 gate; ADR-001/002/003/007 aligned |
| **Risk level** | Low — primary remaining work is evidence artifacts (AJ diff, validate capture, ADR-008 note) |

**Issue counts**

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 4 |
| **Total** | **10** |

The specification is **fit for implementation**. Wave 1 artifacts already exist in source; independent verification confirms structural readiness. Remaining deliverables are audit reports and documentation, not net-new skills. Concerns are ambiguities, minor internal inconsistencies, and subjective diff quality — none block E1 close if implementer follows FR-2 checklist rigorously.

---

## Independent Implementation Verification

Evidence collected **without trusting** gap-analysis or codebase-analysis claims.

### Wave 1 source artifacts (AC-1–AC-4, AC-9–AC-10)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `requirements-critic` skill | Present | `plugins/maister/skills/requirements-critic/SKILL.md` — `name: requirements-critic` (plain kebab), `disable-model-invocation: true`, invocation guard, 4 checks, language gate |
| `transcript-critic` skill | Present | `plugins/maister/skills/transcript-critic/SKILL.md` — 7 checks (Check 1–7), `disable-model-invocation: true`, invocation guard |
| `problem-classifier` skill | Present | `plugins/maister/skills/problem-classifier/SKILL.md` — 4 classes, edge cases section, `aggregate-designer` Wave 3 stub, `disable-model-invocation: true` |
| Chain sections | Present | All three SKILL.md files have "Recommended Next Steps" / "Recommended next steps" |
| `quick-*` commands | Present | Three 11-line thin wrappers with `**ACTION REQUIRED**` and Skill tool delegation |

### Documentation (AC-5–AC-7)

| Artifact | Status | Evidence |
|----------|--------|----------|
| CLAUDE.md Wave 1 + Bundle A | Present | Lines ~509–515, ~595–597 — skills table, Bundle A flow, task-classifier vs problem-classifier distinction |
| CLAUDE.md grill-me / thermos backfill | Present | Lines ~521–524 — On-Demand Skills section |
| README quick commands + Bundle A | Present | `README.md` lines ~112–119 |

### Orchestrator guards (AC-9, FR-5)

| Orchestrator | Soft suggestion | No-auto-invoke guard |
|--------------|-----------------|----------------------|
| `development/SKILL.md` | `/maister:quick-requirements-critic` after requirements drafted | "Do not invoke the skill automatically" (line ~251) |
| `product-design/SKILL.md` | `/maister:quick-transcript-critic` when transcripts in context | "Do not invoke the skill automatically" (line ~251) |

### Build pipeline gate (AC-8, FR-3)

**Independently executed:** `make validate` → **exit 0** (Copilot, Cursor, Kiro rule 14: 63 dirs, Kilo).

Generated Cursor variants confirmed:

- `plugins/maister-cursor/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md`

Kiro build test asserts merged quick dirs:

- `platforms/kiro-cli/tests/build-core.test.sh` lines 35–37 — `maister-quick-{requirements-critic,transcript-critic,problem-classifier}`

### AJ source baseline (FR-2 dependency)

All three AJ week8 paths **exist locally**:

- `/Users/mrapacz/Projects/architekt-jutra-code/week8/{1,2,3}/*/SKILL.md`
- Line counts match spec: AJ 213/261/487 vs Maister 225/292/509

### Not yet done (expected — spec deliverables)

| Deliverable | Status |
|-------------|--------|
| `verification/aj-rubric-diff.md` | Missing — primary FR-2 output |
| `verification/build-validate-evidence.md` | Missing — FR-3 output (validate green but not captured in task artifacts) |
| ADR-008 reconciliation note | Missing — decision-log still states 8B deferred to post–Wave 1 (lines 307–308) |

---

## Findings by Severity

### Critical (0)

None. No blocking gaps between spec and implementable reality.

---

### High (1)

#### H-1: Hardcoded AJ source paths reduce portability

**Spec reference:** FR-2 AJ source paths table; Known Limitations — "AJ source repo is external read-only reference — path must exist locally"

**Evidence:**

- Spec uses absolute path `/Users/mrapacz/Projects/architekt-jutra-code/week8/...`
- No fallback (env var, submodule, task-local copy, or "skip diff if unavailable")

**Category:** Ambiguous / environment dependency

**Impact:** Another implementer or CI agent without this path cannot complete FR-2 as written. Blocks automated replay outside this machine.

**Recommendation:** Add to spec: primary path + fallback (`AJ_SOURCE_ROOT` env var or copy AJ rubrics into `analysis/research-context/aj-week8/`). Mark diff as blocked-with-evidence if source unavailable.

---

### Medium (5)

#### M-1: FR-2 semantic diff lacks output schema

**Spec reference:** FR-2 — "Produce a semantic diff report"; verdict categories PASS/GAP/ENHANCEMENT

**Evidence:**

- No required section template for `aj-rubric-diff.md` (per-check mapping table, evidence quotes, reviewer sign-off)
- Acceptance depends on manual semantic judgment ("not summarized away")

**Category:** Ambiguous

**Impact:** Two implementers could produce incompatible diff reports; false PASS risk if checklist walked superficially.

**Recommendation:** Add minimal template: per skill → table columns `[AJ element | Maister location | Verdict | Notes]`; require row for each item in per-skill minimum checklist (FR-2 lines 119–123).

---

#### M-2: Success criteria SC-5 contradicts AC-3 and user scope gate

**Spec reference:**

- AC-3: `disable-model-invocation` on critics; `problem-classifier` also has flag — keep per scope gate
- SC-5: "Critics explicit-only (`disable-model-invocation: true`) — Frontmatter on requirements-critic, transcript-critic" **only**

**Evidence:**

- `problem-classifier/SKILL.md` line 4: `disable-model-invocation: true`
- Gap analysis decision `problem-classifier-invocation`: default **Keep**
- Requirements Phase 2 gate: keep flag on problem-classifier

**Category:** Incorrect (internal spec inconsistency)

**Impact:** Implementer following SC-5 alone might omit problem-classifier from explicit-only verification.

**Recommendation:** Update SC-5 to include `problem-classifier` or reference AC-3 verbatim.

---

#### M-3: AC-9 and AC-10 overlap substantially

**Spec reference:** AC-9 "Commands invoke skills; no orchestrator auto-invocation"; AC-10 "Wave 1 standalone — critics not auto-invoked during drafting"

**Evidence:**

- Both verify `disable-model-invocation`, invocation guards, and orchestrator no-auto-invoke text
- Same files checked twice with slightly different framing

**Category:** Over-specification (not blocking)

**Impact:** Redundant audit effort; checklist bloat.

**Recommendation:** Merge AC-9/AC-10 into single criterion or mark AC-10 as derivative of AC-3 + AC-9.

---

#### M-4: ADR-008 reconciliation artifact location ambiguous

**Spec reference:** FR-5 — "Append note to `decision-log.md` **or** task `verification/adr-008-reconciliation.md`"

**Evidence:**

- `decision-log.md` ADR-008 outcome still reads "8B **after Wave 1**" (lines 307–308)
- Spec requires reconciliation but allows two locations with no priority

**Category:** Ambiguous

**Impact:** Split documentation; research task decision log may remain stale while task artifact is updated.

**Recommendation:** Prefer single source: append ADR-008 addendum to `analysis/research-context/decision-log.md` with cross-link from task verification folder.

---

#### M-5: Development orchestrator phase reference imprecise vs HLD

**Spec reference:** FR-5 table — `development` suggestion at "Phase 5 area"; HLD ADR-008 — "development Phase 5 (spec creation)"

**Evidence:**

- Actual bullet in `development/SKILL.md` line ~251 sits at **end of Phase 4 Part B** (requirements gathering), immediately before specification-creator delegation — not Phase 5 spec creation

**Category:** Minor incorrect phase label

**Impact:** Low functional impact (guard text is correct); verification auditor may search wrong phase.

**Recommendation:** Change FR-5 table to "Phase 4 — after requirements drafted (before spec creation)".

---

### Low (4)

#### L-1: Chain section heading case inconsistency

**Spec reference:** AC-4 — "Recommended next steps" chain sections

**Evidence:**

- `requirements-critic`, `transcript-critic`: `## Recommended Next Steps`
- `problem-classifier`: `## Recommended next steps`

**Category:** Cosmetic

**Impact:** None for E1 close; spec FR-4 correctly excludes unless discoverability GAP.

---

#### L-2: requirements.md FR numbering order differs from spec

**Spec reference:** FR-1–FR-5 in spec vs requirements.md (build = FR-2, diff = FR-3)

**Evidence:** Same content, different FR IDs between requirements and spec.

**Category:** Traceability friction

**Recommendation:** Add mapping note in spec revision history or align IDs.

---

#### L-3: requirements.md scope narrower on remediation paths

**Spec reference:** FR-4 allows `platforms/kiro-cli/` if build integration gap; requirements.md says "Source edits only in `plugins/maister/`"

**Evidence:** requirements.md line 84 vs spec FR-4 table.

**Category:** Minor inconsistency (spec is more accurate)

**Impact:** Low — gap analysis already verified Kiro green.

---

#### L-4: No implementation-plan.md referenced

**Spec reference:** Verification workflow phases A–F; no explicit plan artifact

**Evidence:** Task has `implementation/spec.md` only; development orchestrator typically expects `implementation-plan.md`.

**Category:** Process gap

**Impact:** Low for verification-only close — spec phases are sufficient as implicit plan. Planner may still generate minimal plan.

**Recommendation:** Optional one-page plan mirroring Phases A–F, or explicit spec note: "implementation plan optional for verification-only task."

---

## Over-Engineering Assessment

| Area | Assessment |
|------|------------|
| Dual AC + SC tables (10 each) | Mild redundancy — acceptable for audit traceability; AC-9/AC-10 overlap is the main excess |
| Seven-phase workflow (A–F + close) | Appropriate — matches verification-first reality |
| Full semantic AJ diff | **Not over-engineered** — user explicitly selected at Phase 2 gate; gap analysis flagged false-completion risk without it |
| Conditional FR-4 remediation | Well bounded — "zero code diff acceptable" prevents scope creep |
| Excluding E2E smoke | Correctly scoped per user decision; structural validate + rubric diff sufficient for plugin markdown artifacts |

**Verdict:** Spec is proportionate to E1 close. No meta-orchestrator, no greenfield re-port, no test suite for rubric content — appropriately minimal.

---

## Consistency with Research ADRs

| ADR | Research decision | Spec handling | Status |
|-----|-------------------|---------------|--------|
| ADR-001 | Hybrid chain sections, no meta-orchestrator | AC-4, FR-2 dimension 3 | Aligned — verified in source |
| ADR-002 | Category-aligned `quick-*` commands | AC-2 | Aligned — three thin wrappers present |
| ADR-003 | Strict Wave 1 (3 skills) | Out of scope table | Aligned |
| ADR-007 | Bilingual bodies, EN frontmatter | FR-2 ENHANCEMENT labels; SC-10 | Aligned — language gate on requirements-critic and problem-classifier |
| ADR-008 | 8A Wave 1; 8B post–Wave 1 | **Reconciled** — user chose keep 8B in Wave 1; FR-5 documents intentional early inclusion | Aligned with user gate; decision-log still stale until FR-5 executed |

**ADR-008 note:** Spec correctly records user Phase 2 decision to keep orchestrator soft suggestions. Research HLD diagram still labels 8B as "Wave 2+" — expected staleness until decision-log addendum lands.

---

## Completeness vs E1 Acceptance Criteria

| # | Criterion (gap analysis) | Spec coverage | Live code |
|---|--------------------------|---------------|-----------|
| 1 | Three skills, normalized frontmatter | AC-1 | Pass |
| 2 | Three `quick-*` wrappers | AC-2 | Pass |
| 3 | `disable-model-invocation` on critics | AC-3 | Pass (+ problem-classifier) |
| 4 | Chain sections | AC-4 | Pass |
| 5 | CLAUDE.md Wave 1 + Bundle A | AC-5 | Pass |
| 6 | grill-me / thermos backfill | AC-6 | Pass |
| 7 | README docs | AC-7 | Pass |
| 8 | `make build && make validate` | AC-8, FR-3 | Pass (validate verified; evidence file pending) |
| 9 | Explicit-only, no auto-invocation | AC-9 | Pass |
| 10 | Wave 1 standalone | AC-10 | Pass |

**Gap:** Semantic AJ rubric diff (medium gap from gap analysis) — addressed by FR-2 but **not yet executed**.

---

## Top Critical Findings

No critical findings. Top items requiring attention before E1 sign-off:

1. **H-1 — AJ path portability:** Define fallback or task-local AJ baseline so FR-2 is reproducible.
2. **M-1 — Diff report schema:** Add checklist row template to prevent superficial PASS verdicts.
3. **M-2 — SC-5 vs AC-3:** Align success criteria with problem-classifier `disable-model-invocation` decision.
4. **Pending deliverables:** `aj-rubric-diff.md`, `build-validate-evidence.md`, ADR-008 reconciliation (FR-2, FR-3, FR-5) — expected implementation outputs, not spec defects.
5. **M-4 — Stale decision-log:** ADR-008 in research context still says 8B deferred; FR-5 must run before epic close.

---

## Recommendations

### Before implementation start

1. Fix SC-5 to include `problem-classifier` (or defer to AC-3).
2. Add `aj-rubric-diff.md` section template to spec or as task template file.
3. Document AJ source fallback path in FR-2.
4. Clarify FR-5 primary artifact: update `decision-log.md` with Wave 1 8B reconciliation addendum.

### During implementation

1. Execute FR-1 static audit → populate AC checklist with file:line evidence.
2. Run FR-2 full semantic diff using per-skill minimum checklists — do not rely on line-count parity alone.
3. Capture FR-3 evidence (`make build && make validate` output) even though validate is currently green.
4. Apply FR-4 only on GAP verdicts — resist cosmetic heading normalization unless flagged.

### Optional (low priority)

- Normalize chain section heading case across three skills (L-1) — only if diff flags discoverability GAP.
- Generate minimal `implementation-plan.md` mirroring Phases A–F for orchestrator continuity.

---

## Compliance Status

| Dimension | Status |
|-----------|--------|
| Implementability | ✅ Ready |
| Requirements traceability | ⚠️ Minor FR ID drift vs requirements.md |
| E1 acceptance criteria coverage | ✅ Complete mapping |
| ADR alignment | ⚠️ Pending FR-5 decision-log update |
| Scope discipline | ✅ Verification-first; no over-scope |
| Evidence plan | ⚠️ Subjective diff quality — mitigate with template |

**Final verdict: PASS WITH CONCERNS**

The specification accurately reframes E1 as verification-and-close, incorporates all user Phase 2 decisions (keep ADR-008 suggestions, full AJ rubric diff, validate gate, no E2E), and matches the live codebase. Proceed to implementation with the medium-severity clarifications above; no spec rewrite required.

---

## Audit Metadata

| Item | Value |
|------|-------|
| Spec lines | 383 |
| Files independently read | 15+ |
| Commands run | `make validate` (exit 0), AJ path existence checks |
| Code modified | None (read-only audit) |
