# Implementation Plan: Wave 1 AJ Skills Verification & Completion (Epic E1)

## Overview

**Total Steps:** 28  
**Task Groups:** 4  
**Expected Verification Checks:** 27 (6 + 8 + 5 + 8 structural/grep checks across groups)

**Scope:** Close three remaining Wave 1 gaps (G1, G2, G4) on existing AJ skills — no new skills, commands, or agents. Source-only edits in `plugins/maister/` plus `README.md`; regenerate platform variants via `make build`.

**Spec audit resolution (H1):** For `problem-classifier`, place `## Language Preference` **immediately before `## Skill Workflow`** (before Step 0 Input Acquisition), not before `## The 4 Problem Classes`. The rubric sections are reference material; the gate is the first interactive workflow step.

**Gold templates (read-only):**
- `plugins/maister/skills/requirements-critic/SKILL.md` — `disable-model-invocation`, `**Invocation guard**:`, chain section
- `plugins/maister/skills/thermos/SKILL.md` — explicit-only frontmatter precedent
- `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` — CHAT GATE transform patterns

**Files to change (source only):**
1. `plugins/maister/skills/problem-classifier/SKILL.md` — G1 + G4
2. `plugins/maister/skills/requirements-critic/SKILL.md` — G4
3. `README.md` — G2

---

## Implementation Steps

### Task Group 1: G1 — `problem-classifier` Explicit Invocation (FR-1)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/problem-classifier/SKILL.md`

**Estimated Steps:** 6

- [x] 1.0 Complete G1 — explicit-only invocation on problem-classifier
  - [x] 1.1 Write 6 focused structural checks for G1
    - Frontmatter contains `disable-model-invocation: true` after `argument-hint` (matches `requirements-critic` / `transcript-critic` placement)
    - `**Invocation guard**:` bold paragraph present immediately after H1 `# Modelling Problem Classifier` (not a `##` heading — match gold template per audit M4)
    - Guard states skill activates ONLY on explicit user request
    - Guard includes trigger phrases from frontmatter `description`: "jaka klasa problemu", "jak to sklasyfikować modelarsko", "problem class", "which modeling class", "classify"/"classification" in modeling context
    - Guard includes **Do NOT invoke** clause: no auto-invoke during requirements drafting, spec creation, or passive elaboration
    - Diff review: intent table, 4-class rubric, clarifying-question workflow, and `## Recommended next steps` unchanged in substance (only guard + frontmatter additions)
  - [x] 1.2 Read gold template `plugins/maister/skills/requirements-critic/SKILL.md` lines 10–12 for invocation guard format
  - [x] 1.3 Add `disable-model-invocation: true` to YAML frontmatter
  - [x] 1.4 Insert `**Invocation guard**:` block immediately after H1, before the existing "This is a problem class classifier" paragraph; retain intent table after guard
  - [x] 1.5 Run ONLY the 6 structural checks from 1.1 (grep + diff review)
    - `rg 'disable-model-invocation: true' plugins/maister/skills/problem-classifier/SKILL.md`
    - `rg 'Invocation guard' plugins/maister/skills/problem-classifier/SKILL.md`

**Acceptance Criteria:**
- G1-AC-1: `disable-model-invocation: true` in frontmatter
- G1-AC-2: Invocation guard after H1 with trigger phrases and Do NOT invoke clause
- G1-AC-4: Rubric, intent table, chain section substantively unchanged
- All 6 structural checks pass

---

### Task Group 2: G4 — Language Preference Gates (FR-3)

**Dependencies:** Group 1 (problem-classifier edits must not conflict; guard precedes gate in same file)  
**Files to Modify:**
- `plugins/maister/skills/requirements-critic/SKILL.md`
- `plugins/maister/skills/problem-classifier/SKILL.md`

**Estimated Steps:** 8

- [x] 2.0 Complete G4 — first-step language preference gate on interactive skills
  - [x] 2.1 Write 8 focused structural checks for G4
    - `## Language Preference` section exists in `requirements-critic/SKILL.md` after invocation guard, before `## Input Acquisition`
    - `## Language Preference` section exists in `problem-classifier/SKILL.md` immediately before `## Skill Workflow` (H1 resolution — not before `## The 4 Problem Classes`)
    - Both gates use `AskUserQuestion` with prompt *"Which language should I use for questions and output?"*
    - Both gates offer exactly three options: **English**, **Polish**, **Match input language** (detect from user text; default English if ambiguous)
    - Both gates state selection applies for remainder of session; gate runs once per invocation
    - `requirements-critic` Principles section (~L263): supersede "Match the user's language" → reference gate: *"Use the language chosen in the Language Preference gate for all questions and output."*
    - `problem-classifier` Step 2 (~L175): supersede "Always match the user's language" → same gate reference (audit M3)
    - Gate phrasing uses standard `AskUserQuestion — "…"` form so Cursor sed (`platforms/cursor/build.sh`) and Kiro CHAT GATE transform apply
  - [x] 2.2 Insert `## Language Preference` in `requirements-critic/SKILL.md` after invocation guard block, before `## Input Acquisition`
    - Use spec template: AskUserQuestion prompt, three options, apply-for-session instruction
  - [x] 2.3 Update `requirements-critic` Principles bullet (~L263) to reference Language Preference gate
  - [x] 2.4 Insert `## Language Preference` in `problem-classifier/SKILL.md` immediately before `## Skill Workflow` (line ~115 anchor)
    - Rubric (`## The 4 Problem Classes` through edge cases) remains above the gate as reference material
  - [x] 2.5 Update `problem-classifier` Step 2 language instruction (~L175) to reference gate selection
  - [x] 2.6 *(Optional)* Add language-preference row to `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` Headless Defaults table: default **Match input language** for `--no-interactive` (audit M1 — only if implementer touches transform doc)
  - [x] 2.7 Run ONLY the 8 structural checks from 2.1
    - `rg 'Language Preference' plugins/maister/skills/{requirements-critic,problem-classifier}/SKILL.md` → 2 matches
    - `rg 'Language Preference gate' plugins/maister/skills/{requirements-critic,problem-classifier}/SKILL.md` → 2 matches

**Acceptance Criteria:**
- G4-AC-1: `## Language Preference` as first workflow step in both interactive skills (problem-classifier: before `## Skill Workflow`)
- G4-AC-2: AskUserQuestion with English / Polish / Match input language options
- G4-AC-3: Subsequent workflow references gate selection, not ad-hoc detection
- All 8 structural checks pass

---

### Task Group 3: G2 — README Discoverability (FR-2)

**Dependencies:** None (disjoint file — may run parallel with Group 1)  
**Files to Modify:**
- `README.md`

**Estimated Steps:** 6

- [x] 3.0 Complete G2 — minimal README Wave 1 discoverability
  - [x] 3.1 Write 5 focused structural checks for G2
    - Quick Commands table (lines ~107–111) gains three rows with correct backtick-wrapped command names
    - Row: `/maister:quick-transcript-critic` — audit meeting transcript for decision-process problems
    - Row: `/maister:quick-requirements-critic` — interactive requirements quality critique (4-check rubric)
    - Row: `/maister:quick-problem-classifier` — classify business requirements into DDD modeling problem classes
    - Bundle A sentence present immediately after table (chain via Recommended Next Steps, not orchestrator)
    - Diff review: no new AJ adoption essay, no Kiro `@` hints, no CLAUDE.md duplication
  - [x] 3.2 Read existing Quick Commands table format (`quick-plan`, `quick-dev`, `quick-bugfix` rows)
  - [x] 3.3 Append three Wave 1 command rows matching table format exactly
  - [x] 3.4 Add Bundle A sentence per spec FR-2 after the table
  - [x] 3.5 Run ONLY the 5 structural checks from 3.1
    - `rg 'quick-transcript-critic|quick-requirements-critic|quick-problem-classifier|Bundle A' README.md` → 4+ matches

**Acceptance Criteria:**
- G2-AC-1: Three new Quick Commands rows with correct names and one-line purposes
- G2-AC-2: Bundle A sentence present after table
- G2-AC-3: No sections beyond minimal table + sentence
- All 5 structural checks pass

---

### Task Group 4: Build, Validate & Conformance Verification (FR-4, FR-5)

**Dependencies:** Groups 1, 2, 3  
**Files to Modify:**
- `implementation/work-log.md` (activity log only)
- Generated outputs via `make build` (never hand-edit):
  - `plugins/maister-cursor/skills/{problem-classifier,requirements-critic}/SKILL.md`
  - `plugins/maister-copilot/skills/{problem-classifier,requirements-critic}/SKILL.md`
  - `plugins/maister-kiro/skills/maister-{problem-classifier,requirements-critic}/SKILL.md`

**Estimated Steps:** 8

- [x] 4.0 Complete build gate and E1 conformance verification
  - [x] 4.1 Write 8 focused post-build and conformance checks
    - `make build` exits 0
    - `make validate` exits 0; Kiro counts unchanged: Rule 14 = 57 total, Rule 23 = 25 shortcuts, Rule 28 = 32 `maister-*` dirs
    - G1 propagation: `rg 'disable-model-invocation' plugins/maister-*/skills/problem-classifier/SKILL.md` → matches in all three variants
    - G4 Cursor propagation: language gate section in `plugins/maister-cursor/skills/requirements-critic/SKILL.md` contains `AskQuestion`
    - G4 Kiro propagation: built interactive skills contain `CHAT GATE` at language gate (not raw `AskUserQuestion`)
    - FR-5: zero orchestrator leakage — `rg 'requirements-critic|transcript-critic|problem-classifier' plugins/maister/skills/development/` → no matches
    - FR-5: three `quick-*.md` commands use `ACTION REQUIRED` + Skill tool pattern
    - FR-5: three skills have Recommended Next Steps chain sections (`rg -i 'recommended next'`)
    - Actual diff limited to 3 source files (+ generated rebuild + work-log); no hand-edits under `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/`
  - [x] 4.2 Run `make build && make validate`
  - [x] 4.3 Run G1/G2/G4 grep commands from spec Verification Checklist
    - `rg 'disable-model-invocation: true' plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md` → 3 matches
  - [x] 4.4 Run FR-5 conformance greps (orchestrator leakage, ACTION REQUIRED, chain sections)
  - [x] 4.5 Spot-check generated variants
    - `rg 'disable-model-invocation' plugins/maister-cursor/skills/problem-classifier/SKILL.md`
    - `rg 'AskQuestion|CHAT GATE' plugins/maister-cursor/skills/requirements-critic/SKILL.md`
  - [x] 4.6 Update `implementation/work-log.md` with G1/G2/G4 completion summary and build results
  - [x] 4.7 Run ONLY the 8 checks from 4.1; document manual smoke test recommendations (optional, not blocking)

**Acceptance Criteria:**
- G1-AC-3: Flag propagates to all generated variants
- G4-AC-4: `make validate` passes — Kiro CHAT GATE transform succeeds
- G4-AC-5: Cursor variant contains `AskQuestion` at language gate
- E1-AC-1..5: Aggregate epic acceptance (3 skills, 3 commands, build green, README listed, CLAUDE.md unchanged)
- All 8 post-build checks pass

---

## Execution Order

### Wave 1 (parallel — disjoint files)
1. **Group 1:** G1 — problem-classifier explicit invocation (6 steps)
2. **Group 3:** G2 — README discoverability (6 steps)

### Wave 2 (sequential — depends on Group 1 for same file)
3. **Group 2:** G4 — language preference gates (8 steps, depends on 1)

### Wave 3 (merge gate)
4. **Group 4:** Build, validate & conformance (8 steps, depends on 1, 2, 3)

```
[1, 3 parallel] → [2] → [4]
```

**Critical path:** Group 1 → Group 2 → Group 4 (problem-classifier file). Group 3 is independent and can complete anytime before Group 4.

---

## Acceptance Criteria Mapping

| Gap / FR | Acceptance Criteria | Task Group | Verification Step |
|----------|---------------------|------------|-------------------|
| **G1** | G1-AC-1 frontmatter flag | 1 | 1.1, 1.5, 4.3 |
| **G1** | G1-AC-2 invocation guard | 1 | 1.1, 1.5 |
| **G1** | G1-AC-3 variant propagation | 4 | 4.1, 4.5 |
| **G1** | G1-AC-4 rubric unchanged | 1 | 1.1 diff review |
| **G2** | G2-AC-1 three README rows | 3 | 3.1, 3.5 |
| **G2** | G2-AC-2 Bundle A sentence | 3 | 3.1, 3.5 |
| **G2** | G2-AC-3 minimal scope | 3 | 3.1 diff review |
| **G4** | G4-AC-1 Language Preference sections | 2 | 2.1, 2.7 |
| **G4** | G4-AC-2 AskUserQuestion + 3 options | 2 | 2.1, 2.7 |
| **G4** | G4-AC-3 gate reference in workflow | 2 | 2.1, 2.7 |
| **G4** | G4-AC-4 make validate green | 4 | 4.2, 4.7 |
| **G4** | G4-AC-5 Cursor AskQuestion | 4 | 4.1, 4.5 |
| **FR-4** | Build validation | 4 | 4.2 |
| **FR-5** | Conformance greps | 4 | 4.4 |
| **E1** | E1-AC-1..5 aggregate | 4 | 4.1–4.7 |

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

| Standard | Application |
|----------|-------------|
| `global/plugin-development.md` | Source-only edits in `plugins/maister/`; never edit generated variants; minimal diff (guards, gates, README only); SKILL.md as SOT |
| `global/build-pipeline.md` | `make build && make validate` after edits; Cursor `AskUserQuestion`→`AskQuestion` sed; Kiro CHAT GATE transforms |
| `global/conventions.md` | Spec-driven completion; documentation-first |
| `global/minimal-implementation.md` | No rubric re-port; no Wave 2+ scope; no new entities |
| ADR-007 (7A + 7D) | Bilingual rubric bodies preserved; gate controls output language |
| ADR-008 | Explicit-only invocation on all three Wave 1 on-demand utilities |

**Explicitly NOT changed:** `transcript-critic` (already has flag; non-interactive), `quick-*.md` commands, `CLAUDE.md`, `build.sh` / Makefile / Kiro counts, orchestrator skills.

---

## Notes

- **Test-driven for this task:** Each group starts with 2–8 focused structural/grep checks (N.1), implements (N.2–N.n-1), then runs only those checks (N.n). Full `make build && make validate` runs only in Group 4.
- **H1 normative placement:** `problem-classifier` language gate goes immediately before `## Skill Workflow`, resolving spec audit ambiguity. Rubric sections above the gate remain pedagogical reference; language is chosen before interactive classification begins.
- **Invocation guard format:** Use bold `**Invocation guard**:` paragraph (not `##` heading) — matches `requirements-critic` gold template.
- **Supersede targets (M3):** Update both `requirements-critic` L263 and `problem-classifier` L175 inline language instructions.
- **Never edit generated files:** Regenerate `maister-cursor`, `maister-copilot`, `maister-kiro` via `make build` only.
- **Manual smoke (post Group 4, optional):** Invoke each `/maister:quick-*` with sample input; confirm language gate fires on interactive skills; confirm critics do not auto-trigger during passive requirements discussion.
- **Mark progress:** Check off steps in this file; log activity in `work-log.md`.

---

**Epic:** E1 — Wave 1 Requirements & Classification  
**Spec:** `implementation/spec.md`  
**Spec audit:** `verification/spec-audit.md` (pass-with-concerns; H1 resolved in Group 2)  
**Risk:** Low  
**Estimated effort:** ~2–4 hours (3 source files, structural checks, single build/validate cycle)
