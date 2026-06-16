# Code Review Report: AJ Skills Wave 1 Adoption (Epic E1)

**Date**: 2026-06-13  
**Reviewer**: maister-code-reviewer  
**Task**: `.maister/tasks/development/2026-06-13-aj-skills-wave1-adoption`  
**Spec**: `implementation/spec.md`  
**Scope**: Three ported skills, three `quick-*` commands, `CLAUDE.md` backfill, `platforms/kiro-cli/build.sh`, `Makefile`, Kiro tests (`build-core.test.sh`, `validation.test.sh`)  
**Status**: ⚠️ **Pass with concerns** — source quality is strong; Kiro delegation naming and build fragility need attention before merge

---

## Summary

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 4 |
| Info | 3 |

Wave 1 delivers three faithful AJ rubric ports with correct frontmatter conventions, explicit-only critics, thin command wrappers, and well-structured `CLAUDE.md` index updates. Source-only discipline is respected; rubrics live in `SKILL.md` as single source of truth.

Primary gaps are **Kiro platform integration**: merged `maister-quick-*` skills delegate to bare kebab skill names (`requirements-critic`) while Kiro renames all skills to `maister-*` directories. Build transforms do not rewrite those delegation targets. Secondary concerns are duplicated input handling in commands vs skills, forward references to unported archetype mappers, and hardcoded skill-count maintenance debt.

**Build verification note**: `make clean-kiro && make build-kiro` failed in this review environment (`sed: .../maister-orchestrator-framework/SKILL.md: No such file or directory`; build lock contention on first attempt). Work log records prior `make build && make validate` PASS. Re-run clean build before merge.

---

## Requirements Alignment

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FR-1 `requirements-critic` | ✅ Met | 279 lines; 4 checks; `disable-model-invocation: true`; invocation guard; chain section |
| FR-2 `transcript-critic` | ✅ Met | Distinct frontmatter description; 7 checks; non-interactive; chain to `requirements-critic` |
| FR-3 `problem-classifier` | ✅ Met | 489 lines; 4-class rubric; no disable flag; `aggregate-designer` stubbed (Wave 3) |
| FR-4 `quick-*` commands | ⚠️ Mostly met | Thin Skill-tool delegates; Kiro target names wrong (see H1) |
| FR-5 `CLAUDE.md` | ✅ Met | Wave 1 skills/commands; Bundle A; backfill; task-classifier distinction |
| FR-6 Build pipeline | ⚠️ Mostly met | Arrays/counts updated; Kiro delegation gap; build race observed |
| FR-7 Platform discipline | ✅ Met | Edits confined to `plugins/maister/` + `platforms/kiro-cli/` |

---

## High Issues

### H1. Kiro merged `quick-*` skills delegate to wrong skill names

**Location**: Generated `plugins/maister-kiro/skills/maister-quick-requirements-critic/SKILL.md` (and transcript/proble-classifier siblings); source `plugins/maister/commands/quick-*.md`

**Description**: Source commands correctly delegate to plain-kebab skills for Claude Code / Cursor / Copilot:

```markdown
Invoke Skill tool with skill `requirements-critic` and pass the input as args.
```

Kiro `rename_skill_directories()` renames standalone skills to `maister-requirements-critic`, but `apply_delegation_transforms()` only replaces the phrase `Skill tool` — it does **not** rewrite `skill: \`requirements-critic\`` to `maister-requirements-critic`. Observed Kiro output still instructs:

```markdown
2. Invoke Skill tool with skill `requirements-critic` and pass the input as args.
```

Compare with working Kiro pattern in `maister-work/SKILL.md`, which uses `skill: "maister-development"`.

**Risk**: On Kiro, `/maister-quick-requirements-critic` may fail to reach the rubric skill, or agents may run the critique inline despite ACTION REQUIRED.

**Recommendation**: Add a Kiro build transform (after `rename_skill_directories`) mapping Wave 1 delegation targets:

```bash
# In apply_delegation_transforms or a dedicated wave1_skill_ref fix:
sedi 's|skill `requirements-critic`|skill `maister-requirements-critic`|g' "$f"
sedi 's|skill `transcript-critic`|skill `maister-transcript-critic`|g' "$f"
sedi 's|skill `problem-classifier`|skill `maister-problem-classifier`|g' "$f"
```

Alternatively, change merged Kiro quick-* skills to invoke `/maister-requirements-critic` slash directly (skip nested hop). Add a Kiro test asserting merged quick-* files reference `maister-*` skill names.

---

## Medium Issues

### M1. Duplicate input acquisition in commands and skills

**Location**: `plugins/maister/commands/quick-*.md` step 1; each skill § Input Acquisition

**Description**: Commands instruct `AskUserQuestion` when args missing; skills also scan conversation and prompt. Violates thin-wrapper intent; risk of double prompts or args not forwarded through Skill-tool hop.

**Recommendation**: Commands should only parse args and invoke Skill tool. Remove AskUserQuestion/AskQuestion fallback from all three command files; rely on skill Input Acquisition sections.

---

### M2. Forward references to unported archetype mapper skills

**Location**: `plugins/maister/skills/problem-classifier/SKILL.md:11-15`

**Description**: Skill routing table references `accounting-archetype-mapper` and `pricing-archetype-mapper`, which are not in Maister (planned Waves 3–4). Unlike `aggregate-designer`, these are presented as live alternatives without Wave N stub language.

**Risk**: Agents or users may attempt to invoke non-existent skills when disambiguating problem class vs archetype.

**Recommendation**: Mirror the `aggregate-designer` pattern — mark as Wave N deferred with “do not invoke” guard, or replace with “not yet ported to Maister.”

---

### M3. Hardcoded Kiro inventory counts are fragile maintenance debt

**Location**: `Makefile` rules 14/28/23; `build-core.test.sh`; `validation.test.sh`; `build.sh` inline comments (~732)

**Description**: Wave 1 correctly rebaselines 51→57 total dirs and 26→32 `maister-*` dirs, fixing pre-existing Rule 14 drift. Every future skill batch requires synchronized updates across four+ files plus `skills_needing_args` and `merge_one` arrays.

**Risk**: Repeat of master Rule 14 failure (expected 26 vs actual 51) when counts drift.

**Recommendation**: Short-term acceptable for Wave 1. Before Wave 2, consider manifest-based directory diff validation (see pragmatic review M2).

---

### M4. Kiro exposes duplicate slash entry points per capability

**Location**: `platforms/kiro-cli/build.sh` — standalone rename + `merge_one` for each Wave 1 skill

**Description**: Three user-facing tools produce six Kiro skill directories (`maister-requirements-critic` + `maister-quick-requirements-critic`, etc.). No generated guidance explains that quick-* is a thin alias.

**Risk**: Wrong skill selection when browsing `skills/`; inflated `$ARGUMENTS` maintenance.

**Recommendation**: Document in `CLAUDE.md` / Kiro steering: prefer `/maister-quick-*` for discovery; standalone `maister-*-critic` is equivalent rubric. Plan merge-only or standalone-only dedup before Wave 2.

---

### M5. `build-core.test.sh` test name contradicts assertion

**Location**: `platforms/kiro-cli/tests/build-core.test.sh:48-51`

**Description**: Function `test_no_unprefixed_skill_dirs` asserts count **equals 25** unprefixed shortcut dirs — it validates their **presence**, not absence. Misleading for future maintainers.

**Recommendation**: Rename to `test_shortcut_skill_dir_count` or `test_exactly_25_unprefixed_shortcut_dirs`.

---

## Low Issues

### L1. Three coexisting `quick-*` packaging patterns undocumented

**Location**: `plugins/maister/CLAUDE.md` — Quick Commands vs Requirements & Modeling Commands

**Description**: Wave 1 hybrid (skill + thin command) coexists with `quick-bugfix` (skill-only with `maister:` prefix in SKILL.md) and `quick-plan`/`quick-dev` (inline command workflows). Consumers must infer which pattern applies.

**Recommendation**: Add a 3–5 line “On-demand utility patterns” note to `CLAUDE.md` (skill-only vs hybrid) and a Bundle A decision tree.

---

### L2. `thermos` backfill omits explicit `disable-model-invocation` mention

**Location**: `plugins/maister/CLAUDE.md:522`

**Description**: Spec FR-5 table requested documenting `disable-model-invocation` for `thermos`. Entry says “Explicit request only” but does not name the frontmatter flag (unlike skill file itself).

**Recommendation**: Append “(`disable-model-invocation: true`)” to thermo-nuclear-* and thermos entries for parity with critic skills.

---

### L3. No cross-reference between Quick Commands and Requirements & Modeling Commands

**Location**: `plugins/maister/CLAUDE.md:570-584`

**Description**: Wave 1 commands live in a separate subsection; `quick-bugfix` remains under Quick Commands. Minor discoverability gap.

**Recommendation**: One-line “See also Requirements & Modeling Commands below” under Quick Commands.

---

### L4. Bilingual interactive content without language gate

**Location**: `requirements-critic/SKILL.md` Check 2 probing table (PL questions); `problem-classifier` pedagogical PL/EN mix

**Description**: Spec explicitly defers ADR-007 language gate — not an implementation defect. English-only consumers may find mixed-language probes confusing.

**Recommendation**: One-line intro note per interactive skill: “Probing questions may appear in PL or EN; respond in your preferred language.” Full gate is E2 scope.

---

## Info / Observations

### I1. Rubric size is intentional and within limits

| Skill | Lines | Limit |
|-------|------:|------:|
| `requirements-critic` | 279 | <1,000 ✅ |
| `transcript-critic` | 225 | <1,000 ✅ |
| `problem-classifier` | 489 | <1,000 ✅ |
| `quick-*` commands (×3) | 9 each | <200 ✅ |

Dense AJ content is appropriate for the domain; no unnecessary abstraction layers in rubrics.

---

### I2. Positive standards compliance

- **Source-only**: No manual edits required in generated variants for Wave 1 logic
- **Frontmatter**: Plain kebab skill names; `maister:quick-*` command names; critics have `disable-model-invocation: true`; classifier omits flag (matches `grill-me` pattern)
- **No CLAUDE.md refs in skill bodies** — validate rule 5 safe
- **Chain sections**: Kebab cross-refs (`transcript-critic` → `requirements-critic` → `problem-classifier`); `aggregate-designer` honestly stubbed
- **transcript-critic frontmatter defect fixed** — description distinct from requirements-critic
- **Build arrays**: `merge_one` +3, `skills_needing_args` +6 correctly enumerated in `build.sh`
- **Makefile**: Rules 14 (57), 28 (32), 23 (25 shortcuts) aligned with spec
- **Tests**: `build-core.test.sh` merge count 8→11; directory counts 57/32/25; `validation.test.sh` rules 14/28 updated
- **CHAT GATE**: Interactive paths in `requirements-critic` and `problem-classifier` transform correctly in partial Kiro output
- **`$ARGUMENTS` injection**: Present on standalone and merged Kiro skills after `apply_kiro_overrides`

---

### I3. No automated behavioral tests for `disable-model-invocation`

Structural validation only (`make validate`). Critics’ explicit-only behavior relies on frontmatter + manual smoke. Acceptable per spec known limitations.

---

## File-by-File Notes

### Skills (source)

| File | Assessment |
|------|------------|
| `skills/requirements-critic/SKILL.md` | Strong invocation guard; interactive Check 2 reformulation workflow; extensible signal map; principles section; Bundle A chain |
| `skills/transcript-critic/SKILL.md` | Clear 7-check framework; pitfalls section prevents over-interpretation; structured output template |
| `skills/problem-classifier/SKILL.md` | Comprehensive 4-class pedagogical content; composite decomposition guidance; edge-case traps valuable; archetype refs need stubbing (M2) |

### Commands (source)

| File | Assessment |
|------|------------|
| `commands/quick-requirements-critic.md` | Excellent thin wrapper; ACTION REQUIRED clear; duplicate input prompt (M1) |
| `commands/quick-transcript-critic.md` | Same pattern; appropriate for non-interactive target |
| `commands/quick-problem-classifier.md` | Same pattern; appropriate for interactive classifier |

### Documentation

| File | Assessment |
|------|------------|
| `plugins/maister/CLAUDE.md` | High-value backfill for `grill-me`, `thermos`, thermo-nuclear-*; new Requirements & Modeling section; Bundle A + naming distinction well placed |

### Build integration

| File | Assessment |
|------|------------|
| `platforms/kiro-cli/build.sh` | Correct `merge_one` and `skills_needing_args` extensions; skill count comment updated (32 maister-*); missing Wave 1 skill name rewrite (H1) |
| `Makefile` | Rule 14/28/23 counts correct; Rule 26 threshold ≥200 accommodates new CHAT GATE markers |
| `build-core.test.sh` | Wave 1 merge artifacts asserted; count tests aligned; misleading test name (M5) |
| `validation.test.sh` | Rules 14/28 test updated to 57/32 |

---

## Recommended Actions (Priority Order)

1. **Fix Kiro skill delegation names** in merged quick-* output (H1) — add transform + test
2. **Remove duplicate AskUserQuestion from command wrappers** (M1) — 15 min
3. **Stub archetype mapper references** in `problem-classifier` (M2) — 15 min
4. **Rename misleading Kiro test** `test_no_unprefixed_skill_dirs` (M5) — 5 min
5. **Add CLAUDE.md utility pattern note + Bundle A decision tree** (L1) — 30 min
6. **Re-run `make clean-kiro && make build && make validate`** before merge; commit regenerated variants

---

## Go / No-Go

| Criterion | Verdict |
|-----------|---------|
| Spec functional requirements (FR-1–FR-3, FR-5, FR-7) | ✅ Go |
| Command/skill packaging (FR-4) | ⚠️ Go after H1 for Kiro |
| Build pipeline (FR-6) | ⚠️ Go after clean validate + H1 |
| Additive / non-breaking | ✅ Go |
| Documentation discoverability | ✅ Go (minor L1–L3 polish optional) |

**Overall**: **Conditional GO** — merge after H1 fix and clean `make validate`. M1–M2 are quick fixes worth including in the same PR. M3–M5 and L-items can follow in Wave 2 prep.

---

*Review is read-only. No implementation files were modified.*
