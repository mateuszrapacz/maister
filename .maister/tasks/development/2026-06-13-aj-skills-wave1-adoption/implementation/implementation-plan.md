# Implementation Plan: AJ Skills Wave 1 Adoption (Epic E1)

## Overview

**Total Steps:** 28  
**Task Groups:** 7  
**Expected Verification Checks:** 42 (6 per skill/command/docs group; 8 for build integration; 6 for final gate)

**Scope:** Port three AJ on-demand skills (`requirements-critic`, `transcript-critic`, `problem-classifier`), add three `quick-*` command wrappers, backfill `CLAUDE.md`, update Kiro build pipeline counts (Rule 14: 51→57, Rule 28: 26→32), and pass `make build && make validate`.

**Source references (read-only):**
- `/Users/mrapacz/Projects/architekt-jutra-code/week8/2/requirements-critic/SKILL.md`
- `/Users/mrapacz/Projects/architekt-jutra-code/week8/1/transcript-critic/SKILL.md`
- `/Users/mrapacz/Projects/architekt-jutra-code/week8/3/problem-classifier/SKILL.md`

**Maister patterns:**
- `plugins/maister/skills/grill-me/SKILL.md` — plain kebab `name`, `argument-hint`, interactive (no `disable-model-invocation`)
- `plugins/maister/skills/thermo-nuclear-review/SKILL.md` — critic with `disable-model-invocation: true`
- `plugins/maister/commands/reviews-code.md` — ACTION REQUIRED delegate pattern (substitute Skill tool for Task tool)
- `plugins/maister/commands/work.md` — Skill tool invocation from commands

**Prerequisite:** `make validate-kiro` currently fails on Rule 14 (expects 26, live tree has 51). FR-6 fixes this baseline as part of Wave 1 — not a regression.

---

## Implementation Steps

### Task Group 1: Port `requirements-critic` Skill (FR-1)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/requirements-critic/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 1.0 Complete requirements-critic skill port
  - [x] 1.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: requirements-critic` (plain kebab, no `maister:`)
    - Frontmatter: `disable-model-invocation: true`, `argument-hint` present, English-primary `description`
    - Body contains all four checks and `AskUserQuestion` gates in Checks 2–4
    - Explicit invocation guard phrases retained (e.g. "criticize", "critique", "review this ticket")
    - "Recommended next steps" section links to `transcript-critic` and `problem-classifier` by kebab name; no `CLAUDE.md` refs in body
  - [x] 1.2 Read AJ source and Maister precedents (`grill-me`, `thermo-nuclear-review`)
    - Strip `maister:` prefix from skill `name`
    - Preserve bilingual PL/EN body and interactive reformulation workflow
  - [x] 1.3 Create `plugins/maister/skills/requirements-critic/SKILL.md`
    - Port 4-check rubric from AJ source (~261 lines)
    - Add ADR-001 chain section (Bundle A handoff to transcript/requirements flow; RC signals → problem-classifier)
    - Cross-references use kebab skill dir names only
  - [x] 1.4 Run ONLY the 6 structural checks from 1.1
    - Do NOT run `make validate` yet (build pipeline not updated)

**Acceptance Criteria:**
- All 6 structural checks pass
- SC-1 partial: skill invocable standalone via Skill tool (structure ready)
- SC-3 partial: `disable-model-invocation: true` present
- SC-13 partial: bilingual PL/EN content preserved

---

### Task Group 2: Port `transcript-critic` Skill (FR-2)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/transcript-critic/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 2.0 Complete transcript-critic skill port
  - [x] 2.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: transcript-critic` (plain kebab, no `maister:`)
    - Frontmatter `description` is distinct from requirements-critic and describes meeting decision-process audit
    - Frontmatter: `disable-model-invocation: true`, `argument-hint: [meeting transcript or notes]`
    - Body contains seven checks with AJ section headings preserved (fact vs opinion vs hearsay, false consensus, marginalized voices, hidden dependencies, scope drift, severity mismatch, power dynamics)
    - Non-interactive workflow (no `AskUserQuestion`); structured output format section present; chain section references `requirements-critic`
  - [x] 2.2 Read AJ source and fix frontmatter defect
    - Rewrite `description` — AJ source incorrectly copies requirements-critic text
  - [x] 2.3 Create `plugins/maister/skills/transcript-critic/SKILL.md`
    - Port 7-check non-interactive rubric (~213 lines, EN-native body)
    - Add "Recommended next steps" for Bundle A → `requirements-critic`
  - [x] 2.4 Run ONLY the 6 structural checks from 2.1

**Acceptance Criteria:**
- All 6 structural checks pass
- SC-3 partial: `disable-model-invocation: true` present
- SC-5: frontmatter description defect fixed
- SC-9 partial: chain section links transcript → requirements critic

---

### Task Group 3: Port `problem-classifier` Skill (FR-3)

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/problem-classifier/SKILL.md` (create)

**Estimated Steps:** 4

- [x] 3.0 Complete problem-classifier skill port
  - [x] 3.1 Write 6 focused structural checks for this skill
    - Skill directory and `SKILL.md` exist
    - Frontmatter: `name: problem-classifier` (plain kebab, no `maister:`)
    - Frontmatter: **no** `disable-model-invocation` (follows `grill-me` pattern)
    - Frontmatter: `argument-hint`, English-primary `description` clarifying problem-class vs archetype distinction
    - Full 4-class rubric present (CRUD, Transformation & Presentation, Integration, Resource Contention) with signal scan, hypothesis, discriminating questions, implementation suggestions
    - No live `aggregate-designer` invocation; Wave 3 stub in "Recommended next steps"; fix AJ typos (`problem-class-classifier` → `problem-classifier`)
  - [x] 3.2 Read AJ source (~487 lines) and `grill-me` frontmatter pattern
  - [x] 3.3 Create `plugins/maister/skills/problem-classifier/SKILL.md`
    - Preserve bilingual pedagogical content (ADR-007 partial)
    - Replace `invoke maister:aggregate-designer` with informational Wave 3 handoff for RC class
    - Preserve composite decomposition guidance and edge cases
  - [x] 3.4 Run ONLY the 6 structural checks from 3.1

**Acceptance Criteria:**
- All 6 structural checks pass
- SC-4 partial: no `disable-model-invocation` in frontmatter
- SC-6: aggregate-designer stubbed, no invoke of non-existent skill
- SC-13 partial: bilingual content preserved

---

### Task Group 4: Create `quick-*` Command Wrappers (FR-4)

**Dependencies:** 1, 2, 3  
**Files to Modify:**
- `plugins/maister/commands/quick-requirements-critic.md` (create)
- `plugins/maister/commands/quick-transcript-critic.md` (create)
- `plugins/maister/commands/quick-problem-classifier.md` (create)

**Estimated Steps:** 4

- [x] 4.0 Complete quick-* command wrappers
  - [x] 4.1 Write 6 focused structural checks for command files
    - Three command files exist in flat `plugins/maister/commands/` layout
    - Each frontmatter: `name: maister:quick-<stem>` with English `description`
    - Each opens with **ACTION REQUIRED** instructing immediate Skill tool invocation (not Task tool)
    - Each delegates exclusively to matching skill (`requirements-critic`, `transcript-critic`, `problem-classifier`)
    - No duplicated rubric content — orchestration lives in `SKILL.md` only
    - Each file under 200 lines; argument parsing uses `AskUserQuestion` when input missing (mirror `reviews-code.md`)
  - [x] 4.2 Read normative template from spec FR-4 and reference commands (`reviews-code.md`, `work.md`)
  - [x] 4.3 Create three command files following spec template
    - `maister:quick-requirements-critic` → skill `requirements-critic`
    - `maister:quick-transcript-critic` → skill `transcript-critic`
    - `maister:quick-problem-classifier` → skill `problem-classifier`
  - [x] 4.4 Run ONLY the 6 structural checks from 4.1

**Acceptance Criteria:**
- All 6 structural checks pass
- SC-2 partial: three commands discoverable with correct delegation pattern
- FR-4 normative template followed (Skill tool deviation from plugin-development.md Task-tool default is intentional per ADR-001/002)

---

### Task Group 5: `CLAUDE.md` Documentation Backfill (FR-5)

**Dependencies:** 4  
**Files to Modify:**
- `plugins/maister/CLAUDE.md`

**Estimated Steps:** 4

- [x] 5.0 Complete CLAUDE.md backfill and Wave 1 index
  - [x] 5.1 Write 7 focused documentation checks
    - `grep grill-me plugins/maister/CLAUDE.md` returns matches in Available Skills or equivalent
    - `grep thermos plugins/maister/CLAUDE.md` returns matches
    - `grep thermo-nuclear plugins/maister/CLAUDE.md` returns matches for both review skills
    - Wave 1 skills listed in **Available Skills** table (5–15 lines each: purpose, when to use)
    - Wave 1 commands listed in **Quick Commands** (or new **Requirements & Modeling** subsection)
    - Bundle A flow documented (3–5 lines): transcript-critic → diagnostic questions → requirements-critic
    - Explicit distinction: `task-classifier` agent (5 workflow types) vs `problem-classifier` skill (4 DDD problem classes); fix any "4 workflow types" inconsistency
  - [x] 5.2 Read current `plugins/maister/CLAUDE.md` Available Skills and Quick Commands sections
  - [x] 5.3 Add backfill entries and Wave 1 documentation
    - Backfill: `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`
    - Add Wave 1 skills and commands with usage strings from spec FR-4
  - [x] 5.4 Run ONLY the 7 documentation checks from 5.1

**Acceptance Criteria:**
- All 7 documentation checks pass
- SC-2 partial: commands listed with usage and purpose
- SC-7: grill-me / thermos / thermo-nuclear-* documented
- SC-8: task-classifier vs problem-classifier distinction explicit
- SC-9 partial: Bundle A flow at index level

---

### Task Group 6: Build Pipeline Integration (FR-6)

**Dependencies:** 4  
**Files to Modify:**
- `platforms/kiro-cli/build.sh`
- `Makefile`
- `platforms/kiro-cli/tests/build-core.test.sh`
- `platforms/kiro-cli/tests/validation.test.sh`

**Estimated Steps:** 5

- [x] 6.0 Complete build pipeline integration
  - [x] 6.1 Write 8 focused build-integration checks (pre-build static review)
    - `build.sh` `merge_one`: three new entries (`quick-requirements-critic`, `quick-transcript-critic`, `quick-problem-classifier` → `maister-quick-*`)
    - `build.sh` `skills_needing_args`: six new entries (3 standalone + 3 merged)
    - Makefile Rule 14 updated: **57** total skill directories (not 32)
    - Makefile Rule 28 updated: **32** `maister-*` skill directories
    - `build-core.test.sh`: merged command count **11** (was 8); total skill dirs **57** (was 22)
    - `build-core.test.sh`: `test_no_unprefixed_skill_dirs` expects **25** shortcut dirs (not 0)
    - `validation.test.sh`: Rules 14/28 assert **57** total / **32** `maister-*`
    - `build.sh` inline comments (~lines 722–723) updated: 26 → 32 `maister-*` slash skills narrative
  - [x] 6.2 Update `platforms/kiro-cli/build.sh`
    - Add 3 `merge_one` calls after existing 8
    - Add 6 entries to `skills_needing_args`:
      - `maister-requirements-critic`, `maister-transcript-critic`, `maister-problem-classifier`
      - `maister-quick-requirements-critic`, `maister-quick-transcript-critic`, `maister-quick-problem-classifier`
    - Update README comment block skill count narrative
  - [x] 6.3 Update `Makefile` validate-kiro rules
    - Rule 14: `26` → `57`
    - Rule 28: `26` → `32`
    - Note Rule 26 CHAT GATE threshold (≥200 total) — rebaseline only if new interactive skills push count below threshold after build
  - [x] 6.4 Update Kiro test files with explicit post-Wave-1 counts
    - `build-core.test.sh`: test names/comments, merged count 11, total 57, unprefixed 25
    - `validation.test.sh`: total 57, `maister-*` 32
  - [x] 6.5 Run ONLY the 8 static checks from 6.1 (grep/diff review before full build)

**Acceptance Criteria:**
- All 8 static checks pass on edited files
- SC-11 partial: Makefile and test targets aligned (57 / 32)
- Six `$ARGUMENTS` injection targets declared in `skills_needing_args`
- `e2e-matrix.test.sh` agent count (26) unchanged — no edits required

---

### Task Group 7: Build, Validate, and Generated Output Verification (FR-6, FR-7)

**Dependencies:** 5, 6  
**Files to Modify:** None (verification only; generated output via `make build`)

**Estimated Steps:** 3

- [x] 7.0 Complete build gate and generated output verification
  - [x] 7.1 Write 6 focused post-build checks
    - `make build` exits 0
    - `make validate` exits 0 (includes Rule 14 baseline fix)
    - Kiro tree: 3 new standalone skill dirs (`maister-requirements-critic`, `maister-transcript-critic`, `maister-problem-classifier`)
    - Kiro tree: 3 new merged command-skill dirs (`maister-quick-requirements-critic`, etc.)
    - Copilot and Cursor variants contain equivalent skills/commands after build (grep spot-check)
    - Kiro built skills: `$ARGUMENTS` placeholder present in all six new argument-bearing skills; CHAT GATE markers on interactive paths (`requirements-critic`, `problem-classifier`)
  - [x] 7.2 Run `make build && make validate`
    - If Rule 26 CHAT GATE threshold fails, rebaseline Makefile threshold per spec FR-6 note and re-run
  - [x] 7.3 Run ONLY the 6 post-build checks from 7.1
    - Run Kiro test suite spot-check: `platforms/kiro-cli/tests/build-core.test.sh`, `platforms/kiro-cli/tests/validation.test.sh`
    - Confirm no orchestrator SKILL.md modifications (FR-7)
    - Confirm validate rule 5: no `CLAUDE.md` references inside generated skill bodies

**Acceptance Criteria:**
- All 6 post-build checks pass
- SC-10: `make build && make validate` passes on clean tree
- SC-11: Rule 14 = 57 total dirs; Rule 28 = 32 `maister-*` dirs; Kiro tests aligned
- SC-12: additive only — existing skills/commands/orchestrators unchanged
- Manual smoke recommended post-merge: invoke each `/maister:quick-*` with sample input; confirm critics do not auto-trigger during passive requirements discussion

---

## Execution Order

### Wave 1 (parallel — disjoint files)
1. **Group 1:** Port `requirements-critic` (4 steps)
2. **Group 2:** Port `transcript-critic` (4 steps)
3. **Group 3:** Port `problem-classifier` (4 steps)

### Wave 2 (sequential — depends on Wave 1)
4. **Group 4:** Create `quick-*` commands (4 steps, depends on 1–3)

### Wave 3 (parallel — disjoint files)
5. **Group 5:** `CLAUDE.md` backfill (4 steps, depends on 4)
6. **Group 6:** Build pipeline integration (5 steps, depends on 4)

### Wave 4 (merge gate)
7. **Group 7:** Build, validate, generated output verification (3 steps, depends on 5–6)

```
[1,2,3 parallel] → [4] → [5,6 parallel] → [7]
```

---

## FR / SC Coverage Matrix

| Requirement | Task Group(s) |
|-------------|---------------|
| FR-1 requirements-critic | 1 |
| FR-2 transcript-critic | 2 |
| FR-3 problem-classifier | 3 |
| FR-4 quick-* commands | 4 |
| FR-5 CLAUDE.md backfill | 5 |
| FR-6 build pipeline | 6, 7 |
| FR-7 platform discipline | 1–4 (source-only), 7 (validate) |
| SC-1 – SC-9 | Groups 1–5 + 7 smoke |
| SC-10 – SC-13 | Group 7 |

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

| Standard | Application |
|----------|-------------|
| `global/plugin-development.md` | Source-only edits in `plugins/maister/`; kebab-case dirs; thin commands (<200 lines); SKILL.md as SOT; plain kebab skill `name` for on-demand utilities |
| `global/build-pipeline.md` | `maister:` command prefix in source; Kiro `merge_one` + `skills_needing_args`; never edit generated variants |
| `global/conventions.md` | Documentation-first; spec-driven implementation |
| `global/minimal-implementation.md` | No Wave 2–4 code; aggregate-designer stub only |
| ADR-001, ADR-002, ADR-003, ADR-008 | Hybrid packaging, quick-* commands, strict Wave 1 scope, critics-only disable flag |

**Deferred (out of scope E1):** `language-md-convention.md` (E2), `modeling-*` category (E4)

---

## Notes

- **Test-driven for this epic:** Each group starts with 2–8 focused structural/documentation checks (N.1), implements (N.2–N.3), then runs only those checks (N.4/N.n). Full `make validate` runs only in Group 7.
- **Never edit generated files:** `plugins/maister-cursor/`, `plugins/maister-copilot/`, `plugins/maister-kiro/` — regenerate via `make build`.
- **Skill-tool command deviation:** FR-4 intentionally uses Skill tool (not Task tool) because critics/classifiers are self-contained skills, not agents.
- **Rule 14 fix is mandatory:** Current master fails validate; Wave 1 must set Rule 14 to **57**, not 32.
- **Mark progress:** Check off steps in this file as completed; executor updates `work-log.md`.
- **Manual smoke (post Group 7):** Three `/maister:quick-*` invocations; passive requirements discussion should not auto-trigger critics.

---

**Epic:** E1 — Wave 1 Requirements & Classification  
**Spec:** `implementation/spec.md`  
**Research:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`  
**Risk:** Low–Medium  
**Estimated effort:** ~3 days (~960 lines rubric + 6 artifacts + 4 integration surfaces)
