# Gap Analysis: Wave 3 AJ Skills Adoption (Epic E4)

**Date:** 2026-06-16  
**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave3`  
**Inputs:** `analysis/codebase-analysis.md`, `analysis/research-context/high-level-design.md`, `analysis/research-context/decision-log.md`  
**Baseline:** Waves 1–2 complete (6 AJ skills, 6 commands, E1 + E2 + E3 verified)

---

## Summary

- **Risk Level:** Medium
- **Estimated Effort:** Medium (~4 days; ~2,160 lines of rubric content + 8 new artifacts + 10 integration surfaces + Kiro build/test updates)
- **Detected Characteristics:** `modifies_existing_code`, `creates_new_entities`
- **Change Type:** Additive — completes DDD modeling chain stubs from Waves 1–2; no orchestrator or breaking changes

Wave 3 closes the DDD core capability gap: strategic context distillation, RC aggregate design, and accounting/pricing archetype mapping. Waves 1–2 established the port template (plain kebab skill names, invocation guards, language gates, thin commands, chain sections, Kiro build transforms). All four AJ source files exist locally (~483–591 lines each). Wave 3 skills, commands, Bundle B documentation, and `modeling-*` standards are **entirely missing**; upstream/downstream skills already contain **deferred stubs** that must be activated in the same PR.

---

## Task Characteristics

| Characteristic | Value | Rationale |
|----------------|-------|-----------|
| Has reproducible defect | **no** | Greenfield skill port; stubs are intentional deferrals, not bugs |
| Modifies existing code | **yes** | `problem-classifier`, `linguistic-boundary-verifier`, `CLAUDE.md`, `README.md`, `plugin-development.md`, `build.sh`, `Makefile`, Kiro tests |
| Creates new entities | **yes** | 4 skills + 4 commands (8 new files) |
| Involves data operations | **no** | Plugin markdown artifacts only; no application data entities |
| UI heavy | **no** | No UI components, routes, or templates |

---

## Current vs Desired State

### Capability Gaps (Functional)

| Capability | Current State | Desired State | Gap |
|------------|---------------|---------------|-----|
| Strategic context distillation | **Missing** — stub only in `linguistic-boundary-verifier` | `context-distiller` skill + `/maister:modeling-context-distiller` | Full port from AJ week7/4 (~483 lines) |
| RC consistency unit design | **Missing** — stub in `problem-classifier` Recommended next steps | `aggregate-designer` skill + `/maister:modeling-aggregate-designer` | Full port from AJ week7/6 (~540 lines); fix `problem-class-classifier` typo |
| Accounting archetype mapping | **Missing** — labeled "Wave 4 — not yet ported" in `problem-classifier` | `accounting-archetype-mapper` + `/maister:modeling-accounting-archetype` | Full port from AJ week7/5 (~547 lines) |
| Pricing archetype mapping | **Missing** — labeled "Wave 4 — not yet ported" in `problem-classifier` | `pricing-archetype-mapper` + `/maister:modeling-pricing-archetype` | Full port from AJ week7/5 (~591 lines) |
| DDD modeling command category | **Missing** — no `modeling-*` commands or standard | 4 `modeling-*` thin wrappers per ADR-002 | New command prefix; document in `plugin-development.md` |
| Bundle B (DDD modeling flow) | **Missing** — CLAUDE.md has Bundles A, C, D only | Bundle B: classifier → distiller → mappers/designer → verifier | Documentation gap |
| Cross-skill chain activation | **Partial** — 5 stub/deferral refs in Wave 1–2 skills | Live kebab cross-refs + Recommended next steps in all 4 Wave 3 skills | Activation + new chain sections |
| Full DDD chain (without scanner) | **Broken** — classifier routes to nonexistent skills | End-to-end handoffs through distiller, designer, mappers, verifier | Wave 3 completes chain; `archetype-scanner` remains Wave 4 |

### Artifact Gaps (Files)

| Artifact | Current | Desired | Status |
|----------|---------|---------|--------|
| `plugins/maister/skills/context-distiller/SKILL.md` | Does not exist | Adapted from AJ; plain `name:`, invocation guard, language gate, chain to verifier | **Missing** |
| `plugins/maister/skills/aggregate-designer/SKILL.md` | Does not exist | Multi-phase wizard; fix `problem-class-classifier` → `problem-classifier` | **Missing** |
| `plugins/maister/skills/accounting-archetype-mapper/SKILL.md` | Does not exist | Fit-test hard stops; mutual redirect to pricing mapper | **Missing** |
| `plugins/maister/skills/pricing-archetype-mapper/SKILL.md` | Does not exist | Fit-test hard stops; mutual redirect to accounting mapper | **Missing** |
| `plugins/maister/commands/modeling-context-distiller.md` | Does not exist | Thin wrapper → Skill tool | **Missing** |
| `plugins/maister/commands/modeling-aggregate-designer.md` | Does not exist | Thin wrapper → Skill tool | **Missing** |
| `plugins/maister/commands/modeling-accounting-archetype.md` | Does not exist | Thin wrapper → Skill tool (shortened stem per ADR-002) | **Missing** |
| `plugins/maister/commands/modeling-pricing-archetype.md` | Does not exist | Thin wrapper → Skill tool | **Missing** |
| `plugins/maister/skills/problem-classifier/SKILL.md` | 3 Wave 3/4 deferral stubs (L19–20, L409, L507–509) | Live refs to `aggregate-designer`, both mappers | **Incomplete** |
| `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md` | 2 "Wave 3 — not yet available" stubs (L42, L355) | Active `context-distiller` cross-refs | **Incomplete** |
| `plugins/maister/CLAUDE.md` | No Wave 3 skills; no Bundle B; no Modeling Commands section | +4 skills, +4 commands, Bundle B topology | **Incomplete** |
| `README.md` | Bundles A, C, D; no modeling commands | +4 command rows + Bundle B paragraph | **Incomplete** |
| `.maister/docs/standards/global/plugin-development.md` | Documents `reviews-*`, `quick-*` only | Add `modeling-*` category (deferred from E1 per Wave 1 decision) | **Incomplete** |
| `platforms/kiro-cli/build.sh` | Partial: `run \`context-distiller\`` sedi only (L319) | Full Wave 3 block: 4× `merge_one`, 8× `skills_needing_args`, delegation sedi | **Incomplete** |
| `Makefile` (rules 14, 28) | Expects 63 total / 38 `maister-*` Kiro dirs | Expects 67 / 42 (+4 skills + 4 merged commands) | **Stale counts** |
| Kiro test scripts | Hardcoded 63/38 assertions | Update to 67/42; add 4 merged command file checks | **Stale** |

### Inventory Delta

| Metric | Current (post Wave 2) | After Wave 3 |
|--------|----------------------|--------------|
| Source skills (`plugins/maister/skills/`) | 26 | 30 |
| Source commands (`plugins/maister/commands/`) | 12 | 16 |
| AJ skills ported | 6 of 10 (Waves 1–2) | 10 of 10 (excl. Wave 4 scanner) |
| Kiro skill directories (post-build) | 63 | 67 |
| Kiro `maister-*` directories | 38 | 42 |
| Kiro shortcut directories | 25 | 25 (unchanged) |
| Documented bundles (CLAUDE.md) | A, C, D | A, **B**, C, D |

---

## Gaps Identified

### Missing Features (Primary)

1. **`context-distiller`** — Multi-phase strategic design wizard for bounded-context discovery. AJ source uses `name: maister:context-distiller`; references `problem-class-classifier` (typo). Must chain downstream to `linguistic-boundary-verifier` and optionally to mappers/`aggregate-designer`.

2. **`aggregate-designer`** — RC consistency unit wizard triggered when `problem-classifier` detects Resource Contention class. AJ references `maister:problem-class-classifier` — must fix to `problem-classifier`. Enables activation of Wave 1 stub in Recommended next steps.

3. **`accounting-archetype-mapper`** — Value-tracking ledger mapping with fit-test hard stop and mutual redirect to pricing mapper. Currently mislabeled as Wave 4 in `problem-classifier` routing table.

4. **`pricing-archetype-mapper`** — Computed price archetype mapping; symmetric fit-test with accounting mapper. Same Wave 4 mislabel to correct.

5. **Four `modeling-*` commands** — User-facing entry points per ADR-002. Mapper commands use shortened stems (`modeling-accounting-archetype`, `modeling-pricing-archetype`) while delegating to full skill dir names.

### Incomplete Features (Cross-Refs & Documentation)

1. **`problem-classifier` stub activation** — Three locations defer Wave 3 skills; mappers incorrectly tagged Wave 4. Must unify to live Wave 3 refs in routing table and Recommended next steps.

2. **`linguistic-boundary-verifier` upstream ref** — Two locations say context-distiller is "not yet available." Distiller is the upstream "where should boundaries be?" skill; verifier is downstream "are boundaries respected?"

3. **Bundle B documentation** — HLD defines DDD modeling flow (`problem-classifier` → `context-distiller` → mappers/designer → `linguistic-boundary-verifier`). Neither CLAUDE.md nor README documents Bundle B today (Bundles A, C, D exist).

4. **`modeling-*` standards** — Explicitly deferred to E4 in Wave 1 gap analysis. Wave 3 is the delivery wave; `plugin-development.md` must document the new command category.

5. **Kiro build pipeline** — Only `context-distiller` `run \`...\`` transform pre-wired. Missing: 4× `merge_one`, 8× `skills_needing_args`, full delegation sedi block for all four skills (skill/backtick/skill: JSON patterns), header comment count update.

### Behavioral Changes Needed

| Area | From | To |
|------|------|-----|
| AJ skill `name:` frontmatter | `maister:context-distiller`, `maister:aggregate-designer` | Plain kebab names |
| Cross-skill refs | `maister:problem-class-classifier`, `maister:*` prefixes | Plain kebab (`problem-classifier`, etc.) |
| problem-classifier mappers | "Wave 4 — not yet ported" | Live skill handoff instructions |
| problem-classifier aggregate-designer | "Wave 3 — not yet ported" | Live RC handoff with context passing |
| linguistic-boundary-verifier | "Wave 3 — not yet available" for distiller | Active upstream cross-ref |
| Command invocation | N/A | `ACTION REQUIRED` + Skill tool (same as Wave 1–2 quick/reviews pattern) |
| Wave 3 skills | N/A | Omit `disable-model-invocation` (interactive wizards, same as `problem-classifier`, `metaprogram-classifier`) |

### Out of Scope (Confirmed — No Gap to Close in E4)

- **`archetype-scanner`** — Wave 4 (E5): skill, 3 subagents, `archetype-registry.md`, `modeling-archetype-scanner` command (ADR-005)
- **Orchestrator changes** — ADR-001/008: chains are documentation + Recommended next steps only; no `development`/`product-design`/`research` edits
- **`language-md-generator`** — Deferred per ADR-006
- **Party archetype mapper** — Not in AJ registry; omit indefinitely
- **Editing generated variants** — `maister-cursor/`, `maister-copilot/`, `maister-kiro/` update via `make build` only

---

## Integration Points

| Integration | Type | Wave 3 Action | Notes |
|-------------|------|---------------|-------|
| **AJ source** (`architekt-jutra-code/week7/`) | Read-only reference | Port 4 SKILL.md from week7 demos | Verified present on dev machine (4/4 files) |
| **`problem-classifier`** | Upstream chain hub | Activate 3 stub locations; fix Wave 4 → Wave 3 labels for mappers | RC → `aggregate-designer`; archetype intent → mappers |
| **`linguistic-boundary-verifier`** | Downstream of distiller | Remove 2 deferral stubs; distiller chains TO verifier | "Where" vs "respected" distinction |
| **`metaprogram-classifier`** | Template | Language gate + Recommended next steps pattern | Wave 3 interactive skills follow same convention |
| **`platforms/kiro-cli/build.sh`** | Build transform | 4× `merge_one`, 8× `skills_needing_args`, Wave 3 sedi block | Partial prep exists for context-distiller only |
| **`Makefile` validate** | CI gate | Rules 14, 28: `63`→`67`, `38`→`42` | Must update atomically with new skills |
| **`make build && make validate`** | Mandatory gate | Run after all source edits | Regenerates cursor/copilot/kiro variants |
| **`plugins/maister/CLAUDE.md`** | Discovery index | Skills table, Modeling Commands table, Bundle B flow | Bundles A, C, D already documented |
| **`README.md`** | User-facing index | +4 command rows, Bundle B paragraph | Mirror CLAUDE.md |
| **`plugin-development.md`** | Standards | Document `modeling-*` category | Deferred from E1; deliver in E4 |
| **Future `archetype-scanner`** (Wave 4) | Chain consumer | Wave 3 mappers must have stable rubrics before scanner | ADR-005 dependency |

### Chain Topology (Desired — Post Wave 3)

```
problem-classifier ──(RC)──► aggregate-designer
problem-classifier ──(archetype)──► accounting-archetype-mapper / pricing-archetype-mapper
context-distiller ──► linguistic-boundary-verifier
context-distiller ──(optional)──► mappers / aggregate-designer
accounting-archetype-mapper ◄──fit test──► pricing-archetype-mapper
```

### Data Flow (Desired)

```
User explicit request
  → /maister:modeling-* (thin command)
  → Skill tool invokes modeling SKILL.md
  → Multi-phase wizard (AskUserQuestion probes, fit tests)
  → Structured modeling output (no orchestrator state)
  → Recommended next steps → sibling skill via explicit handoff
```

---

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

*No blocking critical decisions.* Research and design phases froze packaging (ADR-001), command taxonomy including `modeling-*` (ADR-002), wave scope (ADR-003), localization (ADR-007), and workflow integration (ADR-008). AJ source is accessible; Waves 1–2 provide proven templates for every pattern.

### Important (Should Decide)

1. **Language preference gates on all four Wave 3 skills**
   - **Issue:** ADR-007 lists specific interactive skills for language ask; Wave 3 skills are multi-phase interactive wizards (~483–591 lines, bilingual PL/EN bodies). Wave 2 added gates to `metaprogram-classifier`, `test-strategy-reviewer`, and `linguistic-boundary-verifier`.
   - **Options:**
     - A) Add language gate to all 4 Wave 3 skills (consistent with Wave 2 interactive pattern)
     - B) Port bodies as-is; defer language gates to post-Wave-3 validation
   - **Default:** A (add gates)
   - **Rationale:** Wave 2 established precedent; bilingual rubrics benefit from explicit preference; Kiro CHAT GATE transforms already handle AskUserQuestion.

2. **Manual smoke testing scope before merge**
   - **Issue:** Wave 1 deferred SC-1–SC-3 manual smoke to user. Four large interactive wizards increase regression risk for invocation and chain handoffs.
   - **Options:**
     - A) Maintainer runs at least one `/maister:modeling-*` smoke per skill before merge
     - B) Rely on `make build && make validate` only; defer smoke to post-merge
   - **Default:** A (one smoke per skill)
   - **Rationale:** Fit-test redirect loops (accounting ↔ pricing) and multi-phase wizards are hard to validate structurally.

3. **`problem-classifier` mapper wave label correction**
   - **Issue:** Routing table labels mappers as "Wave 4 — not yet ported" while E4 scope includes both mappers in Wave 3. Not an architectural fork — implementation must align stubs with task scope.
   - **Options:**
     - A) Activate mappers as Wave 3 live refs (per E4 / ADR-003)
     - B) Keep mappers deferred to Wave 4; port only distiller + aggregate-designer in this epic
   - **Default:** A (full E4 scope)
   - **Rationale:** Task description, orchestrator-state, HLD, and decision-log all list 4 skills in Wave 3. Option B would require scope change.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| **Complexity** | Medium | 4 large SKILL.md files (~2,160 lines total); established port checklist from Waves 1–2 |
| **Integration** | Medium | 5 stub activations + 4 new chain sections must stay consistent; fix Wave 4 mislabels atomically |
| **Kiro build pipeline** | Medium | Partial sedi prep misleading; full Wave 3 delegation block required before validate |
| **Regression** | Low | Additive skills; Wave 1–2 skill edits are stub removal only |
| **Cross-skill misfit loops** | Low | Preserve AJ fit-test hard stops verbatim (accounting ↔ pricing) |
| **AJ source access** | Low | 4/4 week7 paths verified on dev machine |
| **Wave numbering inconsistency** | Medium | Unify all stubs in same PR; grep for "not yet ported/available" as acceptance gate |
| **Discoverability** | Low | Bundle B + command table closes gap; mitigated by docs task in scope |

**Overall: Medium** — lower than Wave 4 (scanner + subagents) due to proven port pattern; higher than Wave 1 due to volume, cross-ref surface, and incomplete Kiro prep.

---

## Recommendations

### Implementation Sequence

1. **Port skills (dependency order)** — `context-distiller` → `aggregate-designer` → mappers (parallel)
2. **Add commands** — Four thin `modeling-*` wrappers following `quick-problem-classifier` pattern
3. **Activate cross-refs** — `problem-classifier` (3 locations), `linguistic-boundary-verifier` (2 locations)
4. **Documentation** — CLAUDE.md (Bundle B + tables), README.md, `plugin-development.md` (`modeling-*`)
5. **Build pipeline** — `build.sh`, Makefile, Kiro tests (67/42 counts)
6. **Validate** — `make build && make validate`; grep for zero deferral stubs; optional manual smoke

### Per-Skill Acceptance Checklist

| Skill | Frontmatter | disable-model-invocation | Command | Special |
|-------|-------------|--------------------------|---------|---------|
| context-distiller | Strip `maister:` prefix | No (interactive) | modeling-context-distiller | Fix `problem-class-classifier`; chain to verifier |
| aggregate-designer | Strip `maister:` prefix | No | modeling-aggregate-designer | Fix typo refs; RC wizard |
| accounting-archetype-mapper | Plain name (already) | No | modeling-accounting-archetype | Fit-test → pricing redirect |
| pricing-archetype-mapper | Plain name (already) | No | modeling-pricing-archetype | Fit-test → accounting redirect |

### Verification Strategy

1. `make build && make validate` — mandatory structural gate
2. Grep source: zero matches for "not yet ported", "not yet available", "Wave 3 — not yet" for Wave 3 skill names
3. Grep generated Kiro: 4 new skill dirs + 4 merged `maister-modeling-*` command dirs
4. Kiro counts: 67 total skill dirs, 42 `maister-*`, 25 shortcuts
5. Manual smoke (recommended): one `/maister:modeling-*` per skill with sample domain input
6. Chain spot-check: `problem-classifier` RC output → aggregate-designer handoff text present and accurate

### Acceptance Criteria (Epic E4)

- [ ] 4 skill dirs exist with valid frontmatter and Recommended next steps
- [ ] 4 `modeling-*` commands delegate via Skill tool
- [ ] No deferral stubs for Wave 3 skills in source plugin
- [ ] Bundle B documented in CLAUDE.md + README
- [ ] `modeling-*` documented in `plugin-development.md`
- [ ] `make build && make validate` passes on all three platform variants
- [ ] Kiro counts: 67 total, 42 `maister-*`, 25 shortcuts

---

## Phase Summary

Wave 3 is a **copy-adapt-integrate** epic: port four AJ DDD wizards into `plugins/maister/`, wire them into the existing classifier/verifier chain by activating Wave 1–2 stubs, expose them via new `modeling-*` commands and Bundle B documentation, and update the Kiro build pipeline counts (63→67, 38→42). Architectural decisions are frozen; the main work is content adaptation (~2,160 lines), cross-ref consistency, and build/test counter updates — no orchestrator or meta-skill changes.

Implementation can parallelize the two mappers after `context-distiller` and `aggregate-designer` land; documentation and build pipeline updates are sequential gates before `make validate`.

---

*Next step: Specification (`implementation/spec.md`) with per-skill acceptance criteria, then implementation plan.*
