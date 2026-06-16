# Gap Analysis: Wave 1 AJ Skills Adoption (Epic E1)

**Date:** 2026-06-13  
**Task:** Port Wave 1 Architekt Jutra skills to Maister plugin  
**Inputs:** `analysis/codebase-analysis.md`, research context (HLD, decision-log, research-report)

---

## Summary

- **Risk Level:** Low-Medium
- **Estimated Effort:** Medium (~3 days; ~960 lines of rubric content + 6 new artifacts + 4 integration surfaces)
- **Detected Characteristics:** `modifies_existing_code`, `creates_new_entities`
- **Change Type:** Additive — no breaking changes to existing skills, commands, or orchestrators

Wave 1 closes three genuine capability gaps in the Maister plugin: requirements quality critique, meeting decision-process audit, and DDD problem classification. The current plugin has 18 skills and 8 commands with established patterns for on-demand utilities (`grill-me`, `thermos`, `quick-bugfix`) and thin command delegates (`reviews-*`), but none of the three AJ Wave 1 skills exist yet. Implementation is primarily a content port with build-pipeline touch points; architectural decisions are frozen in ADR-001 through ADR-009.

---

## Task Characteristics

| Characteristic | Value | Rationale |
|----------------|-------|-----------|
| Has reproducible defect | **no** | Greenfield skill port; no bug or regression to fix |
| Modifies existing code | **yes** | `CLAUDE.md`, `platforms/kiro-cli/build.sh`, `Makefile` |
| Creates new entities | **yes** | 3 skills + 3 commands (6 new files) |
| Involves data operations | **no** | Plugin markdown artifacts only; no application data entities |
| UI heavy | **no** | No UI components, routes, or templates |

---

## Current vs Desired State

### Capability Gaps (Functional)

| Capability | Current State | Desired State | Gap |
|------------|---------------|---------------|-----|
| Requirements quality critique | **Missing** — no skill or command | `requirements-critic` skill + `/maister:quick-requirements-critic` | Full port from AJ week8/2 (~261 lines) |
| Meeting decision-process audit | **Missing** | `transcript-critic` skill + `/maister:quick-transcript-critic` | Full port from AJ week8/1 (~213 lines); fix wrong frontmatter |
| DDD problem classification | **Missing** | `problem-classifier` skill + `/maister:quick-problem-classifier` | Full port from AJ week8/3 (~487 lines); stub `aggregate-designer` chain |
| Explicit-only critique guard | Partial — `thermo-nuclear-*`, `thermos` use `disable-model-invocation` | Same pattern on Wave 1 critics | Apply to `requirements-critic`, `transcript-critic`; see decision on `problem-classifier` |
| On-demand utility discoverability | `grill-me`, `thermos`, `thermo-nuclear-*` exist but **undocumented** in CLAUDE.md | Backfill + Wave 1 entries in Available Skills / Quick Commands | Documentation gap only |
| `task-classifier` vs `problem-classifier` distinction | `task-classifier` agent documented (workflow routing) | Clear CLAUDE.md distinction from DDD classifier | Naming collision risk without docs |

### Artifact Gaps (Files)

| Artifact | Current | Desired | Status |
|----------|---------|---------|--------|
| `plugins/maister/skills/requirements-critic/SKILL.md` | Does not exist | Adapted from AJ; plain `name:`, `disable-model-invocation: true`, bilingual body | **Missing** |
| `plugins/maister/skills/transcript-critic/SKILL.md` | Does not exist | Correct frontmatter (not requirements-critic copy), `disable-model-invocation: true` | **Missing** |
| `plugins/maister/skills/problem-classifier/SKILL.md` | Does not exist | EN frontmatter, chain stub for `aggregate-designer`, cross-ref fix | **Missing** |
| `plugins/maister/commands/quick-requirements-critic.md` | Does not exist | Thin wrapper → Skill tool (not Task/agent) | **Missing** |
| `plugins/maister/commands/quick-transcript-critic.md` | Does not exist | Thin wrapper → Skill tool | **Missing** |
| `plugins/maister/commands/quick-problem-classifier.md` | Does not exist | Thin wrapper → Skill tool | **Missing** |
| `plugins/maister/CLAUDE.md` | 18 skills, 8 commands documented; no `grill-me`/`thermos`/Wave 1 | +3 skills, +3 commands, backfill 4 undocumented skills, Bundle A flow note | **Incomplete** |
| `platforms/kiro-cli/build.sh` | 20 entries in `skills_needing_args`; 8 `merge_one` commands | +3 `skills_needing_args`, +3 `merge_one` for new quick-* commands | **Incomplete** |
| `Makefile` (rules 14, 28) | Expects 26 Kiro skill directories | Expects 32 (+3 skills + 3 merged commands) | **Stale counts** |

### Inventory Delta

| Metric | Current | After Wave 1 |
|--------|---------|--------------|
| Source skills (`plugins/maister/skills/`) | 18 | 21 |
| Source commands (`plugins/maister/commands/`) | 8 | 11 |
| Kiro skill directories (post-build) | 26 | 32 |
| Quick commands | 3 (`quick-plan`, `quick-dev`, `quick-bugfix` skill-only) | 6 (+3 critics/classifier) |

---

## Gaps Identified

### Missing Features (Primary)

1. **`requirements-critic`** — Interactive 4-check requirements critique with invocation guard and heavy `AskUserQuestion` in checks 2–3. AJ source uses `name: maister:requirements-critic`; must strip prefix per Maister convention.

2. **`transcript-critic`** — Non-interactive 7-check meeting decision-process audit. AJ frontmatter incorrectly copies requirements-critic description (verified in source); body implements distinct workflow. Must rewrite frontmatter during port.

3. **`problem-classifier`** — DDD 4-class classifier with discriminating questions. References `maister:aggregate-designer` (Wave 3); must stub with "coming in Wave 3" note and use kebab cross-refs (`problem-classifier`, not `maister:problem-classifier`).

4. **Three `quick-*` commands** — User-facing entry points delegating via Skill tool. Pattern differs from `reviews-*` (Task → agent) and `quick-plan`/`quick-dev` (self-contained logic in command file).

### Incomplete Features (Documentation / Build)

1. **CLAUDE.md skill index** — `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` exist under `plugins/maister/skills/` but have zero matches in CLAUDE.md (confirmed grep). Users cannot discover these via plugin docs.

2. **Kiro build integration** — `merge_commands_to_skills()` merges 8 command stems today (`quick-dev`, `quick-plan`, `reviews-*`, `work`). New `quick-requirements-critic`, `quick-transcript-critic`, `quick-problem-classifier` are not in `merge_one` list; build will not produce merged skill directories without update.

3. **Makefile validation** — Rules 14 and 28 hardcode `26` skill directories. `make validate` will fail immediately after `make build` until counts updated to `32`.

### Behavioral Changes Needed

| Area | From | To |
|------|------|-----|
| AJ skill `name:` frontmatter | `maister:requirements-critic` | `requirements-critic` (plain kebab) |
| transcript-critic description | Requirements critique text (wrong) | Meeting decision-process audit description |
| problem-classifier chain | Invoke `maister:aggregate-designer` | Stub: "Recommended next steps → aggregate-designer (Wave 3)" |
| Command invocation | N/A | `ACTION REQUIRED` + Skill tool (not inline rubric execution) |

### Out of Scope (Confirmed — No Gap to Close in E1)

- Orchestrator changes (`development`, `product-design`, `research`) — ADR-008: Wave 1 standalone only
- New subagents — critics are self-contained skills
- `aggregate-designer`, Waves 2–4 skills — deferred per ADR-003
- `language.md` convention — E2 parallel epic
- `modeling-*` command category standard — E1 or E4 (see decisions)

---

## Integration Points

| Integration | Type | Wave 1 Action | Notes |
|-------------|------|---------------|-------|
| **AJ source** (`architekt-jutra-code/week8/`) | Read-only reference | Port rubrics from week8/{1,2,3}/ | Not distributed; local path during dev |
| **`grill-me` pattern** | Template | requirements-critic interactive structure | Minimal frontmatter, `AskUserQuestion`, `argument-hint` |
| **`thermo-nuclear-review` pattern** | Template | `disable-model-invocation: true` on critics | Explicit-only invocation |
| **`reviews-code` pattern** | Template | Thin command with `ACTION REQUIRED` | Delegate via **Skill tool**, not Task tool |
| **`platforms/kiro-cli/build.sh`** | Build transform | Add 3 `skills_needing_args` + 3 `merge_one` entries | `$ARGUMENTS` injection + command→skill merge |
| **`Makefile` validate** | CI gate | Rules 14, 28: `26` → `32` | Must update atomically with new skills |
| **`make build && make validate`** | Mandatory gate | Run after all source edits | Regenerates cursor/copilot/kiro variants |
| **`plugins/maister/CLAUDE.md`** | Discovery index | Skills table, Quick Commands table, Bundle A flow, task-classifier distinction | 5–15 lines per skill, 3–8 per command |
| **`task-classifier` agent** | Naming neighbor | Document distinct purpose in CLAUDE.md | Workflow routing (5 types) vs DDD classes (4 types) |
| **Future `aggregate-designer`** (Wave 3) | Chain consumer | Stub reference in problem-classifier | RC path handoff |
| **Plugin standards** | Convention | Optional `modeling-*` category doc in E1 | See `plugin-development.md` decision |

### Data Flow (Desired)

```
User explicit request
  → /maister:quick-*-critic|classifier (thin command)
  → Skill tool invokes critic/classifier SKILL.md
  → Rubric execution (checks / signal scan / questions)
  → Structured report (no task directory, no orchestrator state)
  → [problem-classifier] optional stub note → aggregate-designer (Wave 3)
```

---

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

*No blocking critical decisions.* Research phase froze packaging (ADR-001), command taxonomy (ADR-002), wave scope (ADR-003), and workflow integration (ADR-008). AJ source is accessible; templates exist for every pattern.

### Important (Should Decide)

1. **`disable-model-invocation` on `problem-classifier`**
   - **Issue:** ADR-008 mandates `disable-model-invocation: true` on `requirements-critic` and `transcript-critic` only. HLD notes interactive classifiers may omit it. Codebase analysis recommends all three.
   - **Options:**
     - A) Critics only (`requirements-critic`, `transcript-critic`) — matches ADR-008 literally
     - B) All three Wave 1 skills — consistent explicit-only for classification too
   - **Default:** A (critics only)
   - **Rationale:** problem-classifier uses `AskUserQuestion` probes and is closer to `grill-me` (interactive utility) than read-only critique; auto-trigger risk is lower.

2. **Language preference gate on port**
   - **Issue:** ADR-007 recommends optional first-step language ask for `requirements-critic` and `problem-classifier`. AJ bodies are bilingual PL/EN.
   - **Options:**
     - A) Port bodies as-is; add language gate in E1
     - B) Port bodies as-is; defer language gate to post-Wave-1 validation
   - **Default:** B (defer gate)
   - **Rationale:** Minimizes port diff; bilingual content works without gate; gate can be added in Wave 1.1 if user feedback warrants.

3. **`plugin-development.md` modeling-* category**
   - **Issue:** HLD says document `modeling-*` command category in E1 or E4. Wave 1 only adds `quick-*` commands.
   - **Options:**
     - A) Defer to E4 when first `modeling-*` commands ship
     - B) Add stub section in E1 foreshadowing Waves 3–4
   - **Default:** A (defer to E4)
   - **Rationale:** No `modeling-*` commands in Wave 1; premature standard may drift before Wave 3 design.

4. **Bundle A flow documentation depth in CLAUDE.md**
   - **Issue:** HLD documents `transcript-critic` → `requirements-critic` meeting flow. Epic scope says backfill grill-me/thermos + Wave 1 entries; bundle flows are wave deliverable per HLD checklist.
   - **Options:**
     - A) Full Bundle A section with recommended flow (3–5 lines)
     - B) Per-skill "Recommended next steps" only in SKILL.md chain sections
   - **Default:** A (brief Bundle A note in CLAUDE.md + chain sections in skills)
   - **Rationale:** Discoverability at index and point-of-use per ADR-001 hybrid packaging.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| **Complexity** | Low-Medium | Clear templates; no architectural uncertainty |
| **Integration** | Medium | Kiro counts + `merge_one` + `skills_needing_args` must update atomically |
| **Regression** | Low | Additive only; no orchestrator or existing skill changes |
| **Content port** | Medium | transcript-critic frontmatter easy to miss; ~960 lines to adapt carefully |
| **AJ source access** | Low | week8 paths verified present on dev machine |
| **Naming confusion** | Low-Medium | Document task-classifier vs problem-classifier in CLAUDE.md |

**Overall: Low-Medium**

---

## Recommendations

### Implementation Sequence

1. **Port skills** — Create three `SKILL.md` files with adaptations (prefix strip, frontmatter fix, `disable-model-invocation`, aggregate-designer stub, chain sections)
2. **Add commands** — Three thin `quick-*` wrappers following `reviews-code` ACTION REQUIRED pattern but using Skill tool
3. **Update CLAUDE.md** — Backfill grill-me/thermos/thermo-nuclear-*; add Wave 1 skills/commands; task-classifier distinction; Bundle A note
4. **Update build pipeline** — `build.sh` (`skills_needing_args` + `merge_one`); Makefile rules 14/28 (`32`)
5. **Build and validate** — `make build && make validate`; manual smoke per `/maister:quick-*`

### Per-Skill Acceptance Checklist

| Skill | Frontmatter | disable-model-invocation | Command | Special |
|-------|-------------|--------------------------|---------|---------|
| requirements-critic | Strip `maister:` prefix | Yes | quick-requirements-critic | Invocation guard + bilingual body |
| transcript-critic | **Rewrite description** | Yes | quick-transcript-critic | EN-native, non-interactive |
| problem-classifier | EN description | Per decision #1 | quick-problem-classifier | Stub aggregate-designer; fix cross-refs |

### Verification Strategy

1. `make build && make validate` — mandatory structural gate
2. Grep generated variants: 3 new skill dirs in `maister-cursor`, `maister-copilot`, `maister-kiro`
3. Manual smoke: each `/maister:quick-*` with sample input
4. Confirm critics do not auto-invoke during requirements discussion
5. Kiro: verify `$ARGUMENTS` injection and CHAT GATE transforms on interactive skills

---

## Phase Summary

| Phase | Scope | Dependencies | Deliverable |
|-------|-------|--------------|-------------|
| **1. Skill port** | 3 SKILL.md from AJ source | AJ week8 access; template skills | `plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/` |
| **2. Command wrappers** | 3 thin quick-* commands | Phase 1 skills exist | `plugins/maister/commands/quick-*.md` |
| **3. Documentation** | CLAUDE.md backfill + Wave 1 index | Phases 1–2 | Updated Available Skills / Quick Commands tables |
| **4. Build integration** | build.sh + Makefile counts | Phases 1–2 | Kiro 32 skill dirs; merge + args injection |
| **5. Validate** | `make build && make validate` + smoke | Phase 4 | Green CI; manual invocation confirmed |

Phases 1–2 can run in parallel (three independent skills). Phases 3–4 are sequential after artifacts exist. Phase 5 is the merge gate.

---

*Next step: Specification (`implementation/spec.md`) with per-skill acceptance criteria, then implementation plan.*
