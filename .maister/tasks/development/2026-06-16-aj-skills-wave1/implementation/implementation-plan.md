# Implementation Plan: Epic E1 (Wave 1) Verification & Close

**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave1`  
**Spec:** `implementation/spec.md`  
**Mode:** Verification-first close — conditional remediation only  
**Date:** 2026-06-16

---

## Overview

| Metric | Value |
|--------|------:|
| **Task Groups** | 6 |
| **Total Steps** | 38 |
| **Verification Checks** | 28–34 (2–8 per group; Group 5 conditional) |
| **Expected Code Diff** | Zero (nominal); minimal patches only if GAP verdicts |
| **Estimated Complexity** | **Low** — evidence artifacts + semantic diff; no greenfield port |

### Key Dependencies

```
Group 1 (AC Static Audit)
    ├──→ Group 2 (AJ Rubric Diff)
    ├──→ Group 3 (Build/Validate Evidence)  [parallel with Group 2]
    └──→ Group 4 (ADR-008 Reconciliation)   [parallel with Groups 2–3]

Groups 1–4 ──→ Group 5 (Conditional Remediation) [only if GAP/fail]
Group 5 (or Groups 1–4 if clean) ──→ Group 6 (Re-verification & Close)
```

### Spec-Audit Findings Addressed

| Finding | Addressed In |
|---------|--------------|
| H-1: AJ source paths machine-specific | Group 2 — task-local copy + `AJ_SOURCE_ROOT` fallback |
| M-1: FR-2 lacks diff row template | Group 2 — per-check table schema in `aj-rubric-diff.md` |
| M-2: SC-5 omits `problem-classifier` | Group 1 — AC-3 verifies all three skills |
| M-4: ADR-008 artifact location ambiguous | Group 4 — primary `verification/adr-008-reconciliation.md` |

---

## Implementation Steps

### Task Group 1: AC Static Audit (FR-1)

**Dependencies:** None  
**Files to Modify:** `verification/ac-static-audit.md` (create)  
**Estimated Steps:** 7

- [x] 1.0 Complete AC static audit
  - [x] 1.1 Write 8 focused verification checks (grep/read assertions)
    - Check AC-1: three skills exist with plain kebab `name:` (no `maister:` prefix)
    - Check AC-2: three `quick-*` commands with `**ACTION REQUIRED**` + Skill tool delegation
    - Check AC-3: `disable-model-invocation: true` on **all three** skills (`requirements-critic`, `transcript-critic`, `problem-classifier`) — addresses M-2
    - Check AC-4: "Recommended next steps" / "Recommended Next Steps" chain sections in all three SKILL.md
    - Check AC-5–AC-7: CLAUDE.md Wave 1 + Bundle A + grill-me/thermos backfill; README quick commands + Bundle A
    - Check AC-9–AC-10: orchestrator no-auto-invoke guards in `development/SKILL.md` and `product-design/SKILL.md`
    - Check invocation guard blocks present in all three skill bodies
    - Check `task-classifier` vs `problem-classifier` distinction documented in CLAUDE.md
  - [x] 1.2 Read frontmatter of all three skills and three command wrappers; record `file:line` evidence per AC
  - [x] 1.3 Grep `plugins/maister/` for `disable-model-invocation` on Wave 1 skills:
    ```bash
    rg -l 'disable-model-invocation: true' plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md
    ```
  - [x] 1.4 Grep CLAUDE.md and README for Wave 1 entries, Bundle A, and quick command docs
  - [x] 1.5 Read orchestrator bullets in `development/SKILL.md` (~line 251) and `product-design/SKILL.md` (~line 251); confirm "Do not invoke automatically"
  - [x] 1.6 Populate `verification/ac-static-audit.md` with AC-1–AC-10 pass/fail table and evidence column
  - [x] 1.7 Ensure all 8 verification checks pass (or flag FAIL items for Group 5)

**Acceptance Criteria:**
- `verification/ac-static-audit.md` exists with all 10 AC rows and file:line evidence
- All 8 grep/read checks pass OR failures explicitly listed as remediation triggers
- AC-3 includes `problem-classifier` (not just critique skills)

---

### Task Group 2: AJ Rubric Diff (FR-2)

**Dependencies:** Group 1  
**Files to Modify:**
- `analysis/research-context/aj-week8/{transcript-critic,requirements-critic,problem-classifier}/SKILL.md` (copy fallback)
- `verification/aj-rubric-diff.md` (create)

**Estimated Steps:** 8

- [x] 2.0 Complete AJ rubric fidelity diff
  - [x] 2.1 Write 8 focused verification checks (semantic mapping assertions)
    - Resolve AJ baseline: primary path OR `AJ_SOURCE_ROOT` env OR task-local copy
    - `transcript-critic`: map all 7 AJ decision-process checks
    - `requirements-critic`: map all 4 AJ checks (problem vs solution, CRUD vs behavior, signal map, quantifier probing)
    - `problem-classifier`: map 4 classes, signal scan, up to 4 discriminating questions, composite decomposition, edge cases
    - Output format templates preserved (severity, evidence quotes, class assignment format)
    - Chain topology: correct kebab sibling refs; `aggregate-designer` Wave 3 stub documented
    - ENHANCEMENT labels applied: invocation guards, language gate, Bundle A, archetype table, plain kebab frontmatter
    - Zero unresolved GAP verdicts at section summary level
    - Per-check row exists for every item in FR-2 minimum checklist (spec lines 119–123)
  - [x] 2.2 Establish AJ source baseline (H-1 fallback):
    ```bash
    # Primary (if exists)
    AJ_PRIMARY="/Users/mrapacz/Projects/architekt-jutra-code/week8"
    # Fallback: copy to task-local baseline
    mkdir -p analysis/research-context/aj-week8/{1,2,3}
    # transcript-critic ← week8/1, requirements-critic ← week8/2, problem-classifier ← week8/3
    # Use: AJ_SOURCE_ROOT="${AJ_SOURCE_ROOT:-$AJ_PRIMARY}" or task-local copy if unavailable
    ```
    Document chosen baseline path in `aj-rubric-diff.md` header. If source unavailable, mark diff BLOCKED-WITH-EVIDENCE and stop E1 close.
  - [x] 2.3 Side-by-side read: AJ vs Maister for `transcript-critic`; fill per-check rows
  - [x] 2.4 Side-by-side read: AJ vs Maister for `requirements-critic`; fill per-check rows
  - [x] 2.5 Side-by-side read: AJ vs Maister for `problem-classifier`; fill per-check rows
  - [x] 2.6 Write `verification/aj-rubric-diff.md` using schema below
  - [x] 2.7 Add per-skill summary table (PASS/GAP/ENHANCEMENT counts) and overall verdict
  - [x] 2.8 Ensure all 8 semantic checks pass (zero unresolved GAPs)

**`aj-rubric-diff.md` Required Schema (M-1):**

```markdown
# AJ Rubric Fidelity Diff — Epic E1 Wave 1

**AJ baseline:** [path used]
**Date:** YYYY-MM-DD

## Per-Skill Summary

| Skill | PASS | GAP | ENHANCEMENT | Verdict |
|-------|-----:|----:|------------:|---------|

## transcript-critic

| AJ element | Maister location | Verdict | Notes |
|------------|------------------|---------|-------|
| Check 1: ... | `plugins/maister/skills/transcript-critic/SKILL.md:L##` | PASS/GAP/ENHANCEMENT | |

[Repeat for Checks 2–7, output format, chain topology, enhancements]

## requirements-critic
[Same table — 4 checks + formats + chain + enhancements]

## problem-classifier
[Same table — 4 classes + probes + edge cases + RC stub + enhancements]

## Orchestrator Soft Suggestions (ADR-008)
Note: development/product-design bullets are Maister ENHANCEMENT, not AJ source content.
```

**Acceptance Criteria:**
- `verification/aj-rubric-diff.md` complete with per-check rows for all FR-2 minimum elements
- AJ baseline path documented with fallback strategy
- Zero unresolved GAP verdicts (or GAPs listed as Group 5 triggers)
- All ENHANCEMENT deltas explicitly labeled (not counted as regressions)

---

### Task Group 3: Build/Validate Evidence Capture (FR-3)

**Dependencies:** Group 1  
**Files to Modify:** `verification/build-validate-evidence.md` (create)  
**Estimated Steps:** 6

- [x] 3.0 Complete build pipeline gate evidence
  - [x] 3.1 Write 6 focused verification checks (structural gate assertions)
    - `make build` exits 0 on clean tree
    - `make validate` exits 0 on all four platforms (Copilot, Cursor, Kiro, Kilo)
    - Kiro rule 14: skill directory count matches expectation (63 dirs)
    - Generated Cursor skills exist for all three Wave 1 skills
    - Kiro merged `maister-quick-*` dirs exist per `build-core.test.sh`
    - No direct edits to generated variants (`plugins/maister-cursor/`, etc.)
  - [x] 3.2 Run build gate from repo root:
    ```bash
    make build 2>&1 | tee /tmp/e1-make-build.log; echo "build exit: $?"
    make validate 2>&1 | tee /tmp/e1-make-validate.log; echo "validate exit: $?"
    ```
  - [x] 3.3 Capture exit codes, platform summary lines, and Kiro rule 14 output in evidence file
  - [x] 3.4 Spot-check generated variants (read-only):
    ```bash
    ls plugins/maister-cursor/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md
    ls plugins/maister-cursor/commands/maister-quick-{requirements-critic,transcript-critic,problem-classifier}.md
    rg 'maister-quick-' platforms/kiro-cli/tests/build-core.test.sh
    ```
  - [x] 3.5 Write `verification/build-validate-evidence.md` with command output summary and timestamps
  - [x] 3.6 Ensure all 6 gate checks pass (or flag failures for Group 5)

**Acceptance Criteria:**
- `verification/build-validate-evidence.md` exists with exit 0 evidence for both commands
- All four platform variants validated
- Three Wave 1 skills confirmed in generated output
- Failures explicitly documented as remediation triggers

---

### Task Group 4: ADR-008 Reconciliation Documentation (FR-5)

**Dependencies:** Group 1  
**Files to Modify:**
- `verification/adr-008-reconciliation.md` (create — primary artifact per M-4)
- `analysis/research-context/decision-log.md` (append cross-link addendum only)

**Estimated Steps:** 6

- [x] 4.0 Complete ADR-008 reconciliation
  - [x] 4.1 Write 5 focused verification checks (documentation assertions)
    - Reconciliation doc states: Wave 1 ships 8A (explicit-only critics) **and** 8B (optional orchestrator bullets)
    - No Skill tool auto-delegation from orchestrators (explicit-only preserved)
    - `development/SKILL.md` bullet present with no-auto-invoke guard (Phase 4 — after requirements drafted, before spec creation)
    - `product-design/SKILL.md` bullet present when transcripts in `context/`
    - Decision-log cross-link added (not full rewrite of historical ADR-008 entry)
  - [x] 4.2 Read current ADR-008 entry in `analysis/research-context/decision-log.md` (lines ~307–308)
  - [x] 4.3 Write `verification/adr-008-reconciliation.md`:
    - User Phase 2 gate decision: keep 8B as intentional Wave 1 inclusion
    - Rationale: optional bullets improve discoverability without violating explicit-only principle
    - Orchestrator locations with file:line references
    - Explicit statement: no revert to strict 8A-only
  - [x] 4.4 Append brief addendum to `decision-log.md` with link to reconciliation doc (one paragraph)
  - [x] 4.5 Note orchestrator soft suggestions as ENHANCEMENT in `aj-rubric-diff.md` ADR-008 section (coordinate with Group 2 if running parallel)
  - [x] 4.6 Ensure all 5 documentation checks pass

**Acceptance Criteria:**
- `verification/adr-008-reconciliation.md` exists as primary artifact
- `decision-log.md` has cross-link addendum (stale "8B after Wave 1" reconciled)
- Both orchestrator bullets verified with "Do not invoke automatically" guards
- No orchestrator auto-invocation wiring added

---

### Task Group 5: Conditional Gap Remediation (FR-4)

**Dependencies:** Groups 1, 2, 3, 4  
**Files to Modify:** Conditional — only if GAP/fail triggers exist:
- `plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md`
- `plugins/maister/commands/quick-*.md`
- `plugins/maister/CLAUDE.md`, `README.md`
- `plugins/maister/skills/{development,product-design}/SKILL.md`
- `platforms/kiro-cli/` (only if build integration gap)

**Estimated Steps:** 6 (may be no-op)

- [x] 5.0 Complete conditional remediation
  - [x] 5.1 Write 4 focused pre-remediation checks (trigger inventory)
    - Collect all GAP verdicts from `aj-rubric-diff.md`
    - Collect all FAIL items from `ac-static-audit.md`
    - Collect all build/validate failures from `build-validate-evidence.md`
    - Confirm remediation scope: source-only (`plugins/maister/` ± `platforms/kiro-cli/`)
  - [x] 5.2 **If zero triggers:** document "No remediation required — verification clean" in `implementation/work-log.md` and skip to Group 6
  - [~] 5.3 **If triggers exist:** apply minimal patches per FR-4 remediation table (no full skill rewrites; no cosmetic heading normalization unless discoverability GAP) — SKIPPED: zero triggers
  - [~] 5.4 Run `make build && make validate` after any source edit — SKIPPED: no source edits
  - [~] 5.5 Update affected verification artifacts (diff rows, AC checklist) from GAP → PASS — SKIPPED: zero GAPs
  - [~] 5.6 Ensure post-remediation gate passes (validate exit 0) — SKIPPED: validate already exit 0 (Group 3)

**Acceptance Criteria:**
- Zero open GAP items after remediation (or documented no-op if clean)
- Source-only discipline maintained — no generated variant direct edits
- `make build && make validate` green after any patch
- Remediation scope bounded to FR-4 allowed actions

---

### Task Group 6: Re-verification & E1 Close

**Dependencies:** Group 5 (or Groups 1–4 if Group 5 was no-op)  
**Files to Modify:** `implementation/work-log.md` (append close entry)  
**Estimated Steps:** 5

- [x] 6.0 Complete re-verification and epic close
  - [x] 6.1 Write 5 focused close-out checks (final gate assertions)
    - Re-run `make validate` — exit 0
    - Re-grep `disable-model-invocation: true` on all three Wave 1 skills
    - Confirm `aj-rubric-diff.md` has zero unresolved GAPs
    - Confirm all AC-1–AC-10 pass in `ac-static-audit.md`
    - Confirm all four verification artifacts exist (ac-static-audit, aj-rubric-diff, build-validate-evidence, adr-008-reconciliation)
  - [x] 6.2 Re-run validate gate:
    ```bash
    make validate 2>&1 | tail -20
    ```
  - [x] 6.3 Final grep sweep:
    ```bash
    rg 'disable-model-invocation: true' plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md
    rg 'Do not invoke' plugins/maister/skills/{development,product-design}/SKILL.md
    ```
  - [x] 6.4 Update `implementation/work-log.md` with E1 close summary: artifacts produced, remediation diff size (0 expected), validate status
  - [x] 6.5 Mark epic E1 complete — ready for `implementation-verifier` if orchestrator requires Phase 12

**Acceptance Criteria:**
- All success criteria SC-1 through SC-10 satisfied (per spec)
- Four verification artifacts present and consistent
- `make validate` exit 0 at close
- Work-log documents close with evidence links

---

## Execution Order

| Order | Group | Steps | Depends On | Parallelizable |
|------:|-------|------:|------------|----------------|
| 1 | AC Static Audit | 7 | — | — |
| 2 | AJ Rubric Diff | 8 | Group 1 | Yes (with 3, 4) |
| 3 | Build/Validate Evidence | 6 | Group 1 | Yes (with 2, 4) |
| 4 | ADR-008 Reconciliation | 6 | Group 1 | Yes (with 2, 3) |
| 5 | Conditional Remediation | 6 | Groups 1–4 | — |
| 6 | Re-verification & Close | 5 | Group 5 | — |

**Parallel wave after Group 1:** Groups 2, 3, and 4 can execute concurrently (no file overlap).

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

| Standard | Application |
|----------|-------------|
| `global/plugin-development.md` | Source-only edits in `plugins/maister/`; never edit generated variants; thin commands; SKILL.md as SOT |
| `global/build-pipeline.md` | `make build` / `make validate` gate; platform transform verification |
| `global/conventions.md` | Task artifacts under task directory; evidence before close |
| ADR-001 | Hybrid chain sections — verify, don't add meta-orchestrator |
| ADR-002 | Category-aligned `quick-*` commands |
| ADR-003 | Strict Wave 1 scope (three skills only) |
| ADR-007 | Bilingual bodies preserved; EN frontmatter |
| ADR-008 | 8A + intentional early 8B documented; no auto-invocation |

---

## Notes

- **Verification-first:** Default outcome is zero code diff. Groups 1–4 produce evidence; Group 5 is conditional.
- **No unit tests:** Structural validation via `make validate` and grep/read checks replaces application test suite.
- **No E2E smoke:** Per user Phase 2 gate — structural validate + rubric diff suffice.
- **No visual-coverage.md:** Non-UI task; design-context absent.
- **AJ portability:** Task-local copy in `analysis/research-context/aj-week8/` makes diff reproducible across machines.
- **Cosmetic items excluded:** Chain heading case (`Recommended Next Steps` vs `next steps`) — L-1; fix only if flagged as discoverability GAP.
- **Mark Progress:** Check off steps in this plan as completed; append activity to `implementation/work-log.md`.

---

## Success Criteria Mapping

| Spec SC | Satisfied By |
|---------|--------------|
| SC-1 (AC-1–AC-10) | Group 1 + Group 6 |
| SC-2 (AJ diff, zero GAPs) | Group 2 + Group 5 + Group 6 |
| SC-3 (validate green) | Group 3 + Group 6 |
| SC-4 (ADR-008 doc) | Group 4 |
| SC-5 (explicit-only, all 3 skills) | Group 1 AC-3 + Group 6 grep |
| SC-6 (Bundle A docs) | Group 1 AC-5/AC-7 |
| SC-7 (task-classifier distinction) | Group 1 |
| SC-8 (source-only) | Group 5 discipline + Group 3 spot-check |
| SC-9 (conditional remediation) | Group 5 no-op path |
| SC-10 (bilingual preserved) | Group 2 diff rows |
