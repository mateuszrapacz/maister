# Gap Analysis: Wave 1 AJ Skills Adoption — Verification & Completion (Epic E1)

**Date:** 2026-06-14  
**Task:** `.maister/tasks/development/2026-06-14-aj-skills-adoption`  
**Scope:** Verify & complete Wave 1 only — NOT greenfield port, NOT Wave 2+  
**Baseline:** Commit `607ed5b` (v2.2.0); Wave 1 artifacts already in `plugins/maister/`  
**Inputs:** `analysis/codebase-analysis.md`, `analysis/clarifications.md`, research HLD (E1 acceptance criteria)

---

## Summary

- **Risk Level:** Low
- **Estimated Effort:** Low (~0.5–1 day) — verification + small completion fixes
- **Detected Characteristics:** `modifies_existing_code` only (completion edits)
- **Change Type:** Additive completion — no breaking changes; no orchestrator changes

Wave 1 is **substantially complete**. Three skills, three `quick-*` commands, Bundle A chain sections, CLAUDE.md backfill (including `grill-me` / `thermos`), and Kiro build integration (`merge_one`, `$ARGUMENTS`, skill count 57) are in place. `make validate` passes on all three platform variants.

Remaining gaps are **completion items**, not missing Wave 1 deliverables: (1) `problem-classifier` lacks `disable-model-invocation: true` per user clarification, (2) `README.md` does not document the new quick commands or AJ-derived skills, (3) optional Kiro `@` shortcut skills and language preference gates are not implemented.

---

## Task Characteristics

| Characteristic | Value | Rationale |
|----------------|-------|-----------|
| Has reproducible defect | **no** | Verification/completion task; no bug report |
| Modifies existing code | **yes** | Edits to existing SKILL.md, README, possibly `build.sh` |
| Creates new entities | **no** | Skills/commands already exist; task closes gaps only |
| Involves data operations | **no** | Plugin markdown artifacts only |
| UI heavy | **no** | No application UI |

---

## E1 Acceptance Criteria Audit

Research HLD Epic E1: *"3 skills, 3 commands, `disable-model-invocation` on critics, CLAUDE.md backfill for grill-me/thermos. Acceptance: Commands invoke skills; validate passes; critics explicit-only."*

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `requirements-critic` skill | ✅ Done | `plugins/maister/skills/requirements-critic/SKILL.md` — `disable-model-invocation: true`, invocation guard, 4-check rubric, Bundle A chain |
| `transcript-critic` skill | ✅ Done | `plugins/maister/skills/transcript-critic/SKILL.md` — `disable-model-invocation: true`, 7-check audit, chain to `requirements-critic` |
| `problem-classifier` skill | ⚠️ Partial | Skill body complete; **missing** `disable-model-invocation: true` and explicit invocation guard block |
| `quick-requirements-critic` command | ✅ Done | Thin wrapper → Skill tool delegation |
| `quick-transcript-critic` command | ✅ Done | Thin wrapper → Skill tool delegation |
| `quick-problem-classifier` command | ✅ Done | Thin wrapper → Skill tool delegation |
| Commands invoke skills (not inline rubric) | ✅ Done | All three commands use `ACTION REQUIRED` + Skill tool pattern |
| `disable-model-invocation` on critics | ⚠️ Partial | `requirements-critic` ✅, `transcript-critic` ✅; `problem-classifier` ❌ (user confirmed fix) |
| Critics explicit-only | ⚠️ Partial | Guard text in requirements-critic; transcript-critic relies on description; problem-classifier has intent table only |
| CLAUDE.md skills table | ✅ Done | All 3 Wave 1 skills documented (lines ~507–509) |
| CLAUDE.md commands table | ✅ Done | All 3 `quick-*` commands documented (lines ~582–584) |
| Bundle A chain in CLAUDE.md | ✅ Done | Documented at lines ~511–513 |
| grill-me / thermos backfill | ✅ Done | Review & Utility Skills table (lines ~519–522) |
| task-classifier vs problem-classifier distinction | ✅ Done | Explicit note in CLAUDE.md (lines ~513, ~598) |
| Recommended next steps in each SKILL.md | ✅ Done | All three skills have chain sections |
| No orchestrator changes (Wave 1) | ✅ Done | Grep: no references in `skills/development/` |
| `make build && make validate` | ✅ Done | Validated 2026-06-14 — Kiro 57 skill dirs, all rules pass |
| Kiro build integration | ✅ Done | `merge_one` + `skills_needing_args` + cross-ref sed in `build.sh` |
| Kiro skill count (Makefile) | ✅ Done | Rule 14: 57 directories; Rule 28: 32 `maister-*` dirs |

---

## Current vs Desired State

### Functional Gaps

| Capability | Current State | Desired State (E1) | Gap |
|------------|---------------|-------------------|-----|
| Requirements quality critique | Implemented | Explicit-only on-demand utility | ✅ Met |
| Meeting decision-process audit | Implemented | Explicit-only on-demand utility | ✅ Met |
| DDD problem classification | Implemented | Explicit-only on-demand utility | ⚠️ Missing `disable-model-invocation` |
| User-facing discovery (README) | Quick commands undocumented | README lists all 6 `quick-*` commands + Bundle A hint | ❌ Gap |
| Kiro `@` shortcuts | 25 shortcuts; no Wave 1 critics | Optional parity with `@grill-me`, `@thermos` | ⚠️ Optional gap |
| Language preference gate | Bilingual bodies; match user language inline | Optional first-step AskUserQuestion (ADR-007) | ⚠️ Deferred (optional) |
| Orchestrator soft suggestions | None | Deferred to Wave 2+ (ADR-008) | ✅ Correctly out of scope |

### Artifact Checklist (Per-Wave Deliverables)

| # | Deliverable | Status | Notes |
|---|-------------|--------|-------|
| 1 | SKILL.md with normalized frontmatter | ⚠️ | Fix `problem-classifier` frontmatter |
| 2 | Thin command(s) | ✅ | All three present |
| 3 | CLAUDE.md entries | ✅ | Skills, commands, Bundle A, backfill complete |
| 4 | Recommended next steps chain sections | ✅ | All three skills |
| 5 | `make build && make validate` | ✅ | Passing |
| 6 | Kiro Makefile skill count | ✅ | 57 dirs |
| 7 | Cross-ref fixes | ✅ | `aggregate-designer` stubbed as Wave 3 |

---

## Gaps Identified

### Must Fix (Wave 1 Completion)

#### G1 — `problem-classifier` missing `disable-model-invocation: true`

**Current:** Frontmatter has plain `name:`, `description`, `argument-hint` only — no `disable-model-invocation`.

**Desired:** Per user clarification (Phase 1 Q2), add `disable-model-invocation: true` for consistency with critic skills and E1 explicit-only invocation model.

**File:** `plugins/maister/skills/problem-classifier/SKILL.md`

**Also recommended:** Add an **Invocation guard** block (matching `requirements-critic` pattern) with trigger phrases from the description ("jaka klasa problemu", "problem class", "jak to sklasyfikować modelarsko", etc.).

**Verification:** After edit, run `make build && make validate`; confirm generated `plugins/maister-cursor/skills/problem-classifier/SKILL.md` carries the flag.

---

#### G2 — `README.md` not updated for Wave 1

**Current:** Quick Commands table (lines ~107–111) lists only `quick-plan`, `quick-dev`, `quick-bugfix`. No mention of Architekt Jutra adoption, `requirements-critic`, `transcript-critic`, `problem-classifier`, or Bundle A flow.

**Desired:** Per HLD per-wave checklist item 3 and research report, user-facing README should document:
- Three new `/maister:quick-*` commands with one-line purpose
- Brief Bundle A flow note (`transcript-critic` → `requirements-critic` → `problem-classifier` when RC signals)
- Optional: Kiro `@` invocation hints if shortcuts added (G3)

**File:** `README.md` (Quick Commands section; optionally Kiro CLI section)

---

### Optional / Should Decide

#### G3 — Kiro `@` shortcut skills for Wave 1

**Current:** `platforms/kiro-cli/build.sh` Step 20 generates 25 unprefixed shortcut skills (`@grill-me`, `@thermos`, `@quick-plan`, …). Wave 1 critics/classifier are **not** in `generate_shortcut_skill()` list. Users invoke via merged `maister-quick-*` skill dirs or natural language.

**Desired (optional):** Add shortcuts e.g. `@quick-requirements-critic`, `@quick-transcript-critic`, `@quick-problem-classifier` delegating to `/maister-quick-*`.

**Impact if implemented:**
- `build.sh`: 3 new `generate_shortcut_skill()` calls
- `Makefile` / `build-core.test.sh`: Rule 23 count `25` → `28`; Rule 14 total `57` → `60`
- README Kiro section: update `@prompts` list

**Default recommendation:** Include in completion task for Kiro parity with `@grill-me` / `@thermos`; low effort, improves discoverability.

---

#### G4 — Language preference gate (ADR-007)

**Current:** Skills use bilingual PL/EN bodies and instruct "match the user's language" in output. No first-step `AskUserQuestion` language preference gate.

**Desired (HLD):** Optional gate on interactive skills (`requirements-critic`, `problem-classifier`).

**Default recommendation:** Defer — not blocking E1; bilingual content works without gate. Can add in Wave 1.1 if validation feedback warrants.

---

#### G5 — `modeling-*` command category in `plugin-development.md`

**Current:** Standard not present in `.maister/docs/standards/global/plugin-development.md`.

**Desired (HLD):** Document during E1 or E4.

**Default recommendation:** Defer to E4 — no `modeling-*` commands in Wave 1.

---

### Confirmed Non-Gaps (Out of Scope)

| Item | Rationale |
|------|-----------|
| Orchestrator changes | ADR-008: Wave 1 standalone only — correctly absent |
| Wave 2+ skills/commands | User scope: Wave 1 only |
| `language.md` convention | E2 parallel epic |
| Meta-orchestrator | Rejected per ADR-001 |
| Re-porting AJ rubrics | Already ported in `607ed5b` |

---

## Integration Points

| Integration | Type | Wave 1 Status | Action |
|-------------|------|---------------|--------|
| `plugins/maister/skills/*` | Source of truth | ✅ Implemented | Fix G1 only |
| `plugins/maister/commands/quick-*` | Thin wrappers | ✅ Complete | None |
| `plugins/maister/CLAUDE.md` | Discovery index | ✅ Complete | None |
| `README.md` | User-facing docs | ❌ Gap | Fix G2 |
| `platforms/kiro-cli/build.sh` | Build transform | ✅ Core done | Optional G3 shortcuts |
| `Makefile` + Kiro tests | Validation gates | ✅ Passing | Update counts if G3 |
| `make build` → cursor/copilot/kiro | Generated variants | ✅ Regenerated | Re-run after fixes |
| `development` / `product-design` orchestrators | Soft suggestions | ⏸ Wave 2+ | No action |
| `aggregate-designer` (Wave 3) | Chain consumer | ✅ Stubbed | No action |
| `task-classifier` agent | Naming neighbor | ✅ Documented | None |
| AJ source repo | Read-only reference | N/A at runtime | Not distributed |

---

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

*None.* User clarifications resolved scope (verify/complete only) and `problem-classifier` invocation model (add `disable-model-invocation: true`).

### Important (Should Decide)

1. **Kiro `@` shortcuts for Wave 1 (G3)**
   - **Options:** A) Add 3 shortcuts in completion task | B) Defer to separate polish PR
   - **Default:** A — low effort, matches `@grill-me` / `@thermos` precedent
   - **Impact:** Makefile/test count updates if A

2. **Language preference gate (G4)**
   - **Options:** A) Add AskUserQuestion gate to requirements-critic + problem-classifier | B) Defer
   - **Default:** B — optional per ADR-007; not in user clarifications

3. **README depth (G2)**
   - **Options:** A) Minimal — 3 command rows + Bundle A sentence | B) Section on AJ skills adoption + Bundle A
   - **Default:** A — sufficient for E1 discoverability

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Duplicate re-implementation | **High if attempted** | Task scoped to verification only — do not re-port rubrics |
| Missing disable-model-invocation | **Medium** | User-confirmed fix G1 |
| README drift | **Low** | G2 is documentation-only |
| Kiro count regression | **Low** | Run `make validate` after any build.sh change |
| Scope creep to Wave 2+ | **Medium** | Explicit out-of-scope list enforced |
| Over-engineering language gate | **Low** | Defer G4 unless user requests |

**Overall: Low**

---

## Recommendations

### Completion Sequence

1. **G1** — Add `disable-model-invocation: true` + invocation guard to `problem-classifier/SKILL.md`
2. **G2** — Update `README.md` Quick Commands (+ Kiro section if G3)
3. **G3 (optional)** — Add Kiro shortcut skills; bump test counts 25→28, 57→60
4. **Validate** — `make build && make validate`
5. **Smoke** — Manual invoke each `/maister:quick-*` (or Kiro `@` equivalent) with sample input
6. **Conformance grep** — Confirm no orchestrator references; confirm critics have `disable-model-invocation` in all generated variants

### Verification Checklist

| Check | Command / Method |
|-------|------------------|
| Structural validation | `make build && make validate` |
| disable-model-invocation on all 3 | `rg disable-model-invocation plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/` |
| Commands delegate to Skill tool | Read `plugins/maister/commands/quick-*.md` |
| Bundle A documented | Grep CLAUDE.md + README |
| No orchestrator leakage | `rg requirements-critic\|transcript-critic\|problem-classifier plugins/maister/skills/development/` |
| Kiro merged skills exist | `build-core.test.sh` assertions for `maister-quick-*` dirs |

---

## Phase Summary

Wave 1 implementation is **~95% complete**. The development task should execute a short **verification and completion** pass: fix `problem-classifier` explicit-invocation frontmatter (user-confirmed), update README for discoverability, optionally add Kiro `@` shortcuts, re-run build validation, and smoke-test the three commands. No orchestrator changes, no Wave 2+ porting, no meta-orchestrator.

---

*Next step: Specification or direct implementation of G1–G2 (and optional G3), then `make build && make validate`.*
