# Implementation Plan: AJ Skills Wave 3 — DDD Core (Epic E4)

## Overview

**Total Steps:** 36  
**Task Groups:** 9  
**Expected Verification Checks:** ~54 (6 per skill/command group; 7 for cross-refs; 8 for build integration; 6 for final gate)

**Scope:** Port four AJ DDD transformation skills, add four `modeling-*` command wrappers, activate Wave 1–2 cross-ref stubs, document Bundle B, extend Kiro build pipeline, and pass `make build && make validate`.

**Spec audit correction (C1 — mandatory):** The spec inventory delta (67 total / 42 `maister-*`) undercounts Wave 3 by 4 directories. Verified baseline and Wave 1–2 pattern: **each skill + thin command pair adds 2 Kiro dirs** (renamed `maister-<skill>/` + merged `maister-modeling-*/`). Four pairs → **+8**, not +4.

| Metric | Current (post Wave 2) | Correct Wave 3 target | Spec (wrong — do not use) |
|--------|----------------------|----------------------|---------------------------|
| Source skills | 26 | 30 | 30 ✓ |
| Source commands | 12 | 16 | 16 ✓ |
| Kiro total skill dirs (Rule 14) | 63 | **71** | 67 ✗ |
| Kiro `maister-*` dirs (Rule 28) | 38 | **46** | 42 ✗ |
| Kiro shortcut dirs (Rule 23) | 25 | 25 | 25 ✓ |
| `merge_one` entries | 12 | 16 | — |
| `skills_needing_args` entries | 32 | 40 | — |
| Merged-command test label | 14 | **18** | 18 ✓ |

**User decisions (Phase 2 gate):** Language gates on all 4 skills; mappers live in Wave 3; mirror Wave 1–2 port pattern.

**Source references (read-only):**
- `/Users/mrapacz/Projects/architekt-jutra-code/week7/4-uogolnienie-demo/context-distiller/SKILL.md`
- `/Users/mrapacz/Projects/architekt-jutra-code/week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md`
- `/Users/mrapacz/Projects/architekt-jutra-code/week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md`
- `/Users/mrapacz/Projects/architekt-jutra-code/week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md`

**Maister patterns:**
- `plugins/maister/skills/metaprogram-classifier/SKILL.md` — Language Preference gate, invocation guard, Recommended next steps; **omit** `disable-model-invocation` (not `problem-classifier`, which sets it)
- `plugins/maister/commands/quick-problem-classifier.md` — thin command Skill tool delegation
- `platforms/kiro-cli/build.sh` L293–318 — Wave 2 `apply_delegation_transforms` sedi block template for Wave 3 extension

---

## Implementation Steps

### Task Group 1: Port `context-distiller` Skill (FR-1)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/context-distiller/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 1.0 Complete context-distiller skill port
  - [x] 1.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: context-distiller` (plain kebab, no `maister:`)
    - Frontmatter: **no** `disable-model-invocation` (follow `metaprogram-classifier`, not `problem-classifier`)
    - Frontmatter: `argument-hint` present; English-primary `description` with strategic-design / bounded-context trigger phrases
    - Body: invocation guard with explicit trigger phrases and anti-triggers
    - Body: Language Preference gate (`AskUserQuestion`) at skill start (Wave 2 pattern)
    - No `problem-class-classifier` typo; no `maister:*` body cross-refs; `## Recommended next steps` points to `linguistic-boundary-verifier` (primary) and optionally `accounting-archetype-mapper`, `aggregate-designer`; no `CLAUDE.md` refs in body
  - [x] 1.2 Read AJ source (~483 lines) and Maister precedents (`metaprogram-classifier`)
    - Strip `maister:` from frontmatter `name`
    - Fix `problem-class-classifier` → `problem-classifier`
    - Remove or generalize course-specific paths
  - [x] 1.3 Create `plugins/maister/skills/context-distiller/SKILL.md`
    - Preserve bilingual PL/EN rubric body (ADR-007)
    - Add Recommended next steps chain per spec topology
    - Normalize all skill cross-refs to plain kebab names
  - [x] 1.4 Run ONLY the 6 structural checks from 1.1
    - Do NOT run `make validate` yet (build pipeline not updated)

**Acceptance Criteria:**
- All 6 structural checks pass
- AC-1.1–1.6 partial for context-distiller
- AC-1.7–1.8: no typo, no `maister:*` in body

---

### Task Group 2: Port `aggregate-designer` Skill (FR-2)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/aggregate-designer/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 2.0 Complete aggregate-designer skill port
  - [x] 2.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: aggregate-designer` (plain kebab, no `maister:`)
    - Frontmatter: **no** `disable-model-invocation`; `argument-hint` present; English-primary `description` with RC / consistency-unit trigger phrases
    - Body: invocation guard + Language Preference gate
    - Multi-phase wizard structure and fit-check logic preserved from AJ source
    - `maister:problem-class-classifier` fixed → `problem-classifier`; no `maister:*` body refs
    - Recommended next steps: misfit → `problem-classifier`; optional → `test-strategy-reviewer`
  - [x] 2.2 Read AJ source (~540 lines) and `metaprogram-classifier` gate pattern
  - [x] 2.3 Create `plugins/maister/skills/aggregate-designer/SKILL.md`
    - Preserve AJ multi-phase wizard verbatim
    - Normalize cross-refs to plain kebab skill names
  - [x] 2.4 Run ONLY the 6 structural checks from 2.1

**Acceptance Criteria:**
- All 6 structural checks pass
- AC-1.1–1.6 partial for aggregate-designer
- FR-2.8: wizard structure preserved

---

### Task Group 3: Port `accounting-archetype-mapper` Skill (FR-3)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/accounting-archetype-mapper/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 3.0 Complete accounting-archetype-mapper skill port
  - [x] 3.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: accounting-archetype-mapper`; **no** `disable-model-invocation`
    - Frontmatter: `argument-hint`; English-primary `description` with accounting archetype / ledger trigger phrases
    - Body: invocation guard + Language Preference gate
    - Fit-test hard stop and mutual redirect to `pricing-archetype-mapper` preserved verbatim from AJ
    - Recommended next steps: misfit → `pricing-archetype-mapper`; post-map → `linguistic-boundary-verifier`
    - No `maister:*` body cross-refs
  - [x] 3.2 Read AJ source (~547 lines)
  - [x] 3.3 Create `plugins/maister/skills/accounting-archetype-mapper/SKILL.md`
    - Preserve bilingual body (ADR-007)
    - Normalize cross-refs to plain kebab names
  - [x] 3.4 Run ONLY the 6 structural checks from 3.1

**Acceptance Criteria:**
- All 6 structural checks pass
- FR-3.5: fit-test and pricing redirect preserved
- AC-1.5–1.6 partial

---

### Task Group 4: Port `pricing-archetype-mapper` Skill (FR-4)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/pricing-archetype-mapper/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 4.0 Complete pricing-archetype-mapper skill port
  - [x] 4.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: pricing-archetype-mapper`; **no** `disable-model-invocation`
    - Frontmatter: `argument-hint`; English-primary `description` with pricing archetype / computed-price trigger phrases
    - Body: invocation guard + Language Preference gate
    - Fit-test hard stop and mutual redirect to `accounting-archetype-mapper` preserved verbatim from AJ
    - Recommended next steps: misfit → `accounting-archetype-mapper`
    - No `maister:*` body cross-refs
  - [x] 4.2 Read AJ source (~591 lines)
  - [x] 4.3 Create `plugins/maister/skills/pricing-archetype-mapper/SKILL.md`
    - Preserve bilingual body (ADR-007)
    - Normalize cross-refs to plain kebab names
  - [x] 4.4 Run ONLY the 6 structural checks from 4.1

**Acceptance Criteria:**
- All 6 structural checks pass
- FR-4.5: fit-test and accounting redirect preserved
- AC-1.5–1.6 partial

---

### Task Group 5: Create Four `modeling-*` Command Wrappers (FR-5)

**Dependencies:** 1, 2, 3, 4  
**Files to Modify:**
- `plugins/maister/commands/modeling-context-distiller.md` (create)
- `plugins/maister/commands/modeling-aggregate-designer.md` (create)
- `plugins/maister/commands/modeling-accounting-archetype.md` (create)
- `plugins/maister/commands/modeling-pricing-archetype.md` (create)

**Estimated Steps:** 4

- [x] 5.0 Complete modeling-* command wrappers
  - [x] 5.1 Write 6 focused structural checks for command files
    - Four command files exist in flat `plugins/maister/commands/` layout
    - Each frontmatter: `name: maister:modeling-*` with English `description`
    - Each opens with **ACTION REQUIRED** instructing immediate Skill tool invocation
    - Delegation targets: `context-distiller`, `aggregate-designer`, `accounting-archetype-mapper`, `pricing-archetype-mapper` (plain kebab in Skill tool JSON)
    - Mapper commands use shortened stems (`modeling-accounting-archetype`, `modeling-pricing-archetype`) per ADR-002
    - No duplicated rubric content — orchestration lives in `SKILL.md` only; each file under 200 lines
  - [x] 5.2 Read normative template from spec FR-5 and `quick-problem-classifier.md`
  - [x] 5.3 Create four command files
    - `maister:modeling-context-distiller` → skill `context-distiller`
    - `maister:modeling-aggregate-designer` → skill `aggregate-designer`
    - `maister:modeling-accounting-archetype` → skill `accounting-archetype-mapper`
    - `maister:modeling-pricing-archetype` → skill `pricing-archetype-mapper`
  - [x] 5.4 Run ONLY the 6 structural checks from 5.1

**Acceptance Criteria:**
- All 6 structural checks pass
- AC-2.1–2.4 satisfied
- Source command count: 12 → 16

---

### Task Group 6: Activate Cross-Reference Stubs (FR-6)

**Dependencies:** 1, 2, 3, 4  
**Files to Modify:**
- `plugins/maister/skills/problem-classifier/SKILL.md`
- `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md`

**Estimated Steps:** 4

- [x] 6.0 Complete cross-reference activation
  - [x] 6.1 Write 7 focused cross-ref checks
    - `rg -i "not yet (ported|available)|Wave 3 — not yet|Wave 4 — not yet ported"` on both files returns **zero** matches
    - `problem-classifier` routing table (~L19–20): live `accounting-archetype-mapper` and `pricing-archetype-mapper` (no Wave 4 deferral)
    - `problem-classifier` body (~L409): live `aggregate-designer` ref (no "when that skill is available")
    - `problem-classifier` Recommended next steps (~L507–509): active `aggregate-designer` handoff with context-passing instructions for RC class
    - `linguistic-boundary-verifier` (~L42): active upstream `context-distiller` cross-ref
    - `linguistic-boundary-verifier` Recommended next steps (~L355): active `context-distiller` cross-ref
    - Distinction preserved: distiller = "where should boundaries be?"; verifier = "are boundaries respected?"
  - [x] 6.2 Read current stub locations in both skills
  - [x] 6.3 Apply edits per spec FR-6.1 and FR-6.2
    - RC class → hand off to `aggregate-designer`
    - Archetype intent → hand off to appropriate mapper
  - [x] 6.4 Run ONLY the 7 cross-ref checks from 6.1

**Acceptance Criteria:**
- All 7 cross-ref checks pass
- AC-3.1–3.4 satisfied
- No behavioral rubric changes beyond stub activation

---

### Task Group 7: Documentation Updates (FR-7)

**Dependencies:** 5  
**Files to Modify:**
- `plugins/maister/CLAUDE.md`
- `README.md`
- `.maister/docs/standards/global/plugin-development.md`

**Estimated Steps:** 4

- [x] 7.0 Complete documentation updates
  - [x] 7.1 Write 7 focused documentation checks
    - `CLAUDE.md`: 4 new skill rows in Requirements & Modeling Skills table
    - `CLAUDE.md`: Bundle B paragraph between Bundle A and Bundle C (classifier → distiller → mappers/designer → verifier)
    - `CLAUDE.md`: Modeling Commands subsection with 4 command rows
    - `CLAUDE.md`: chain topology documented (docs-only handoffs, no orchestrator)
    - `README.md`: 4 command rows in Quick Commands table
    - `README.md`: Bundle B paragraph mirroring CLAUDE.md
    - `plugin-development.md`: `modeling-*` added to command category list; note DDD skills use `modeling-*` thin wrappers; document AJ on-demand plain-kebab `name:` exception (spec audit M2)
  - [x] 7.2 Read current CLAUDE.md bundles section, README Quick Commands, plugin-development command categories
  - [x] 7.3 Apply documentation edits per spec FR-7.1–7.3
  - [x] 7.4 Run ONLY the 7 documentation checks from 7.1

**Acceptance Criteria:**
- All 7 documentation checks pass
- AC-4.1–4.5 satisfied
- Documented bundles: A, **B**, C, D

---

### Task Group 8: Build Pipeline Integration (FR-8)

**Dependencies:** 5  
**Files to Modify:**
- `platforms/kiro-cli/build.sh`
- `Makefile`
- `platforms/kiro-cli/tests/build-core.test.sh`
- `platforms/kiro-cli/tests/validation.test.sh`

**Estimated Steps:** 5

- [x] 8.0 Complete build pipeline integration
  - [x] 8.1 Write 8 focused build-integration checks (pre-build static review)
    - `build.sh` `merge_one`: four new entries → `maister-modeling-context-distiller`, `maister-modeling-aggregate-designer`, `maister-modeling-accounting-archetype`, `maister-modeling-pricing-archetype` (12 → 16 total)
    - `build.sh` `skills_needing_args`: eight new entries (4 renamed skills + 4 merged commands):
      - `maister-context-distiller`, `maister-aggregate-designer`, `maister-accounting-archetype-mapper`, `maister-pricing-archetype-mapper`
      - `maister-modeling-context-distiller`, `maister-modeling-aggregate-designer`, `maister-modeling-accounting-archetype`, `maister-modeling-pricing-archetype`
      - (32 → 40 total)
    - Wave 3 `apply_delegation_transforms` sedi block for all four skills: `skill \`...\``, `Invoke the \`...\` skill`, `skill: "..."`, `run \`...\`` patterns (extend L319 stub; mirror Wave 1–2 block at L293–318)
    - Makefile Rule 14: **63 → 71** total skill directories
    - Makefile Rule 28: **38 → 46** `maister-*` skill directories
    - `build-core.test.sh`: merged command label **14 → 18**; total skill dirs **63 → 71**; add 4 `test -f` for `maister-modeling-*` merged dirs
    - `validation.test.sh`: Rules 14/28 assert **71** total / **46** `maister-*`
    - `build.sh` header comment (~L767): "38 slash skills" → **46**
  - [x] 8.2 Update `platforms/kiro-cli/build.sh`
    - Add 4 `merge_one` calls after existing 12
    - Add 8 entries to `skills_needing_args`
    - Add full Wave 3 delegation sedi block (all four skill names)
    - Update inline skill count narrative
  - [x] 8.3 Update `Makefile` validate-kiro rules
    - Rule 14: `63` → `71`
    - Rule 28: `38` → `46`
    - Rule 23 shortcut count unchanged at 25
  - [x] 8.4 Update Kiro test files with correct post-Wave-3 counts
    - `build-core.test.sh`: test names/comments, merged count 18, total 71, unprefixed 25
    - `validation.test.sh`: rename `test_exactly_63_skill_dirs` expectations to 71/46
  - [x] 8.5 Run ONLY the 8 static checks from 8.1 (grep/diff review before full build)

**Acceptance Criteria:**
- All 8 static checks pass on edited files
- AC-5.2–5.3 targets: **71 / 46 / 25** (not spec's incorrect 67 / 42)
- AC-5.5: four `maister-modeling-*` merged dirs asserted in build-core tests
- Sixteen `merge_one` entries; forty `skills_needing_args` entries

---

### Task Group 9: Build, Validate, and Generated Output Verification (FR-8.4, AC-5, AC-6)

**Dependencies:** 6, 7, 8  
**Files to Modify:** None (verification only; generated output via `make build`)

**Estimated Steps:** 3

- [x] 9.0 Complete build gate and generated output verification
  - [x] 9.1 Write 6 focused post-build checks
    - `make build` exits 0
    - `make validate` exits 0
    - Kiro tree: 4 new renamed skill dirs (`maister-context-distiller`, `maister-aggregate-designer`, `maister-accounting-archetype-mapper`, `maister-pricing-archetype-mapper`)
    - Kiro tree: 4 new merged command-skill dirs (`maister-modeling-context-distiller`, etc.)
    - Kiro counts: exactly **71** total / **46** `maister-*` / **25** shortcuts
    - Grep generated Kiro skill bodies: Wave 3 cross-refs use `maister-*` prefixed names in chain sections (no unprefixed `context-distiller` etc. after sedi)
    - Copilot and Cursor variants contain equivalent skills/commands after build (grep spot-check); no manual edits to generated variants
  - [x] 9.2 Run `make build && make validate`
    - Run Kiro test suite: `platforms/kiro-cli/tests/build-core.test.sh`, `platforms/kiro-cli/tests/validation.test.sh`
  - [x] 9.3 Run ONLY the 6 post-build checks from 9.1
    - Confirm no orchestrator SKILL.md modifications (ADR-008)
    - Confirm validate rule 5: no `CLAUDE.md` references inside generated skill bodies
    - Optional manual smoke (AC-6): one `/maister:modeling-*` invocation per skill; accounting ↔ pricing fit-test redirect spot-check

**Acceptance Criteria:**
- All 6 post-build checks pass
- AC-5.1: `make build && make validate` passes on clean tree
- AC-5.2–5.4: Rule 14 = 71; Rule 28 = 46; Rule 23 = 25
- AC-5.6: all platform variants regenerated via build only
- Source skills: 30; source commands: 16

---

## Execution Order

### Wave 1 (parallel — disjoint skill files)
1. **Group 1:** Port `context-distiller` (4 steps)
2. **Group 2:** Port `aggregate-designer` (4 steps)
3. **Group 3:** Port `accounting-archetype-mapper` (4 steps)
4. **Group 4:** Port `pricing-archetype-mapper` (4 steps)

### Wave 2 (sequential — depends on Wave 1)
5. **Group 5:** Create `modeling-*` commands (4 steps, depends on 1–4)

### Wave 3 (parallel — disjoint integration surfaces)
6. **Group 6:** Activate cross-ref stubs (4 steps, depends on 1–4)
7. **Group 7:** Documentation (4 steps, depends on 5)
8. **Group 8:** Build pipeline (5 steps, depends on 5)

### Wave 4 (merge gate)
9. **Group 9:** Build, validate, generated output verification (3 steps, depends on 6–8)

```
[1,2,3,4 parallel] → [5] → [6,7,8 parallel] → [9]
```

---

## FR / AC Coverage Matrix

| Requirement | Task Group(s) |
|-------------|---------------|
| FR-1 context-distiller | 1 |
| FR-2 aggregate-designer | 2 |
| FR-3 accounting-archetype-mapper | 3 |
| FR-4 pricing-archetype-mapper | 4 |
| FR-5 modeling-* commands | 5 |
| FR-6 cross-ref activation | 6 |
| FR-7 documentation | 7 |
| FR-8 build pipeline | 8, 9 |
| FR-9 port checklist | 1–4 |
| AC-1 – AC-4 | Groups 1–7 |
| AC-5 build pipeline | Groups 8–9 |
| AC-6 manual smoke | Group 9 (recommended) |

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

| Standard | Application |
|----------|-------------|
| `global/plugin-development.md` | Source-only edits in `plugins/maister/`; kebab-case dirs; thin commands (<200 lines); SKILL.md as SOT; plain kebab skill `name` for on-demand AJ skills |
| `global/build-pipeline.md` | `maister:` command prefix in source; Kiro `merge_one` + `skills_needing_args`; never edit generated variants |
| `global/conventions.md` | Documentation-first; spec-driven implementation |
| `global/minimal-implementation.md` | No Wave 4 scope; chains are docs-only |
| ADR-001, ADR-002, ADR-003, ADR-007, ADR-008 | Individual skills + chains; modeling-* commands; strict Wave 3; bilingual + language gates; no orchestrator wire-up |

---

## Notes

- **Kiro count correction is blocking:** Implement Group 8 with **71 / 46**, not spec FR-8.2 values (67 / 42). Spec audit C1 verified against live Makefile (63/38) and `merge_one` +2-per-pair pattern.
- **disable-model-invocation precedent:** All four Wave 3 skills omit it — follow `metaprogram-classifier`, not `problem-classifier` (spec audit H1).
- **Test-driven for this epic:** Each group starts with 2–8 focused structural/documentation checks (N.1), implements (N.2–N.3), then runs only those checks (N.4/N.n). Full `make validate` runs only in Group 9.
- **Never edit generated files:** `plugins/maister-cursor/`, `plugins/maister-copilot/`, `plugins/maister-kiro/` — regenerate via `make build`.
- **AJ sources are dev-machine reference:** Ported content committed to Maister repo is implementation SOT.
- **Mark progress:** Check off steps in this file as completed; executor updates `work-log.md`.

---

**Epic:** E4 — Wave 3 DDD Core  
**Spec:** `implementation/spec.md` (FR-8 counts require correction — plan uses verified targets)  
**Spec audit:** `verification/spec-audit.md`  
**Research:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`  
**Risk:** Medium  
**Estimated effort:** ~4 days (~2,160 lines rubric + 8 new artifacts + 10 integration surfaces + Kiro build/test updates)
