# Codebase Analysis — Improve Grill Skills

**Task**: Strengthen `grill-me`, add `grill-with-docs`, update plugin catalog and Kiro generation, rebuild generated variants  
**Plan**: `.maister/plans/2026-07-09-improve-grill-skills.md`  
**Date**: 2026-07-09  
**Analyzer**: codebase-analyzer (File Discovery, Code Analysis, Pattern Mining)

## TL;DR

`grill-me` is a minimal 11-line skill lacking explicit-only guards, convergence gates, and mutation prohibitions. `grill-with-docs` does not exist yet. Adding it is **moderate complexity**: mostly SKILL.md authoring plus mechanical build/test plumbing. Kiro uses a dual-skill pattern (`maister-grill-me` + `/grill-me` shortcut) with hard-coded inventory counts (67 total / 42 prefixed / 25 shortcuts → 69 / 43 / 26). Use `thermos` and `requirements-critic` as templates; edit only `plugins/maister/` and platform transforms; run `make build && make validate` as the quality gate.

## Key Decisions

- **Two explicit user-facing modes** — `grill-me` stays read-only; documentation writes occur only via explicit `grill-with-docs` invocation after resolved decisions.
- **No shared `grilling` abstraction yet** — duplicate a short protocol in two SKILL.md files; defer extraction until a third consumer appears.
- **Use Maister `language.md`, not upstream `CONTEXT.md`** — integrates with `linguistic-boundary-verifier` and `.maister/docs/standards/global/language-md-convention.md`.
- **Sparse ADRs only** — offer ADRs when all three significance criteria pass (hard to reverse, surprising, genuine trade-off).
- **TDD structural gate first** — update Kiro count/shortcut tests before implementation per plan step 1.

## Open Questions / Risks

- **Kiro count drift** — `skills_needing_args`, Makefile rules 14/23/28, and three Kiro test files must be updated together or `make validate` fails.
- **Competing glossary formats** — upstream `grilling` references `CONTEXT.md`; skill text must explicitly prohibit it.
- **Unexpected mutations** — without `disable-model-invocation` and explicit prohibitions, `grill-me` may auto-invoke and edit docs during unrelated work.
- **Trivial ADR proliferation** — `grill-with-docs` must not inherit research-workflow mandatory ADR policies.
- **Skill boundary overlap** — `grill-with-docs` must distinguish itself from `context-distiller`, `aggregate-designer`, and `linguistic-boundary-verifier`.
- **Platform drift** — editing generated trees (`maister-cursor`, `maister-kiro`, etc.) directly will be overwritten; all variants must come from `make build`.

---

## Summary

The grill-skills enhancement is a **source-plugin + build-pipeline** task, not a greenfield feature. The existing `grill-me` skill at `plugins/maister/skills/grill-me/SKILL.md` is a thin upstream port (11 lines) that already asks one question at a time and explores the codebase for discoverable facts, but it lacks the explicit-only invocation model, convergence gate, fact-vs-decision separation, and mutation prohibitions required by the plan. The new `grill-with-docs` skill does not exist anywhere in the repository.

Platform impact is predictable and well-trodden: Kiro already implements the dual-skill shortcut pattern for `grill-me` (full `maister-grill-me` + unprefixed `/grill-me` shortcut via `generate_shortcut_skill`). Adding `grill-with-docs` follows the same mechanical steps as prior utility-skill additions — extend `skills_needing_args`, add shortcut generation, bump hard-coded counts, rebuild all four generated variants. Cursor and Copilot need only standard build propagation; no new command wrappers are required (by design).

---

## Files Identified

### Primary Files

| File | Lines | Role |
|------|-------|------|
| `plugins/maister/skills/grill-me/SKILL.md` | 11 | **Rewrite target** — strengthen protocol: `disable-model-invocation`, invocation guard, convergence gate, read-only boundary |
| `plugins/maister/skills/grill-with-docs/SKILL.md` | — | **Create** — explicit-only docs-aware grilling; `language.md` integration; sparse ADR offers |
| `plugins/maister/CLAUDE.md` | — | **Update catalog** — add `grill-with-docs` to Review & Utility Skills; clarify `grill-me` vs docs mode |
| `platforms/kiro-cli/build.sh` | ~857 | **Extend generation** — add `maister-grill-with-docs` to `skills_needing_args`; `generate_shortcut_skill "grill-with-docs"` |
| `Makefile` | — | **Bump counts** — rules 14/23/28: 67→69 total, 42→43 prefixed, 25→26 shortcuts |
| `platforms/kiro-cli/tests/build-core.test.sh` | — | Assert 69 skill dirs, 25→26 unprefixed shortcuts |
| `platforms/kiro-cli/tests/validation.test.sh` | — | Assert 69 total / 43 `maister-*` dirs |
| `platforms/kiro-cli/tests/phase2.test.sh` | — | Assert `/grill-with-docs` shortcut maps to `maister-grill-with-docs` |

### Related Files

| File | Role |
|------|------|
| `.maister/plans/2026-07-09-improve-grill-skills.md` | Authoritative plan with design decisions, standards checklist, acceptance criteria |
| `plugins/maister/skills/thermos/SKILL.md` | **Template** — explicit-only (`disable-model-invocation: true`) + Kiro shortcut peer |
| `plugins/maister/skills/requirements-critic/SKILL.md` | **Template** — invocation guard body structure, trigger phrases, "do NOT invoke when…" rules |
| `~/.agents/skills/grilling/SKILL.md` | Upstream reference for strengthened protocol (not copied verbatim) |
| `.maister/docs/standards/global/language-md-convention.md` | Integration target for `grill-with-docs` vocabulary maintenance |
| `platforms/cursor/build.sh` | Existing `grill-me` sed transform (`run \`grill-me\`` → `maister-grill-me`); may need `grill-with-docs` reference sed |
| `platforms/copilot-cli/build.sh` | Standard skill propagation to Copilot variant |
| `platforms/kilo-cli/build.sh` | Standard skill propagation to Kilo variant |
| `plugins/maister-cursor/`, `plugins/maister-kiro/`, `plugins/maister-copilot/`, `plugins/maister-kilo/` | **Generated — do not edit**; rebuild via `make build` |
| `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md` | Boundary reference — read-only audit; `grill-with-docs` writes docs interactively |
| `plugins/maister/skills/context-distiller/SKILL.md` | Boundary reference — strategic context discovery, not grilling |
| `plugins/maister/skills/aggregate-designer/SKILL.md` | Boundary reference — consistency-unit design, not grilling |

---

## Current Functionality

### `grill-me` (existing)

```1:12:plugins/maister/skills/grill-me/SKILL.md
---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
argument-hint: "[plan or topic]"
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.
```

**Present**: one-question-at-a-time discipline, codebase exploration for discoverable facts, recommended answers, argument hint.  
**Missing** (per plan and code analysis):

| Gap | Impact |
|-----|--------|
| `disable-model-invocation: true` | Skill may auto-invoke during unrelated conversations |
| Invocation guard block | No trigger-phrase / anti-trigger rules |
| Fact vs decision separation | User-owned decisions not distinguished from discoverable facts |
| Wait-for-feedback gate | No explicit pause after each question |
| Decision dependency tracking | No structured walk of decision tree branches |
| Convergence gate | No summary + explicit shared-understanding confirmation |
| Mutation prohibition | No explicit ban on docs/code edits or plan implementation |

### `grill-with-docs` (not present)

No `plugins/maister/skills/grill-with-docs/` directory exists. The plan defines it as explicit-only, applying the strengthened grilling protocol plus `language.md`/ADR maintenance with user confirmation.

### Kiro dual-skill pattern (existing for `grill-me`)

Kiro build script maintains:

1. **Full skill** — `maister-grill-me` in `skills_needing_args` (argument injection via `$ARGUMENTS`)
2. **Shortcut skill** — `generate_shortcut_skill "grill-me"` → unprefixed `/grill-me` mapping to `/maister-grill-me`
3. **Reference sed** — `run \`grill-me\`` → `run \`maister-grill-me\`` in generated markdown

`grill-with-docs` must replicate this pattern: `maister-grill-with-docs` + `/grill-with-docs` shortcut.

### Inventory count formula

```
total = maister-* prefixed + unprefixed shortcuts
67 = 42 + 25   (current)
69 = 43 + 26   (after adding grill-with-docs skill + shortcut)
```

Affected assertion sites:

| Location | Current | Target |
|----------|---------|--------|
| `Makefile` rule 14 | 67 total | 69 |
| `Makefile` rule 23 | 25 shortcuts | 26 |
| `Makefile` rule 28 | 42 prefixed | 43 |
| `build-core.test.sh` | 67 / 25 | 69 / 26 |
| `validation.test.sh` | 67 / 42 | 69 / 43 |
| `phase2.test.sh` | `/grill-me` shortcut | + `/grill-with-docs` |

### Catalog registration (existing)

`plugins/maister/CLAUDE.md` lists `grill-me` under Review & Utility Skills with a one-line description. No `grill-with-docs` entry. Bundle D documents `metaprogram-classifier` → `grill-me` pairing.

### Command wrappers

No command wrapper exists for `grill-me` — **by design**. Skills are invoked directly via slash palette. Same expected for `grill-with-docs`.

---

## Dependencies

### Imports (What This Depends On)

- **Upstream `grilling` skill** (`~/.agents/skills/grilling/SKILL.md`) — protocol inspiration; Maister diverges on `language.md` vs `CONTEXT.md`
- **`language-md-convention.md`** — template sections, relationship types, adoption guidance for `grill-with-docs`
- **Build pipeline** — `make build` propagates to Copilot, Cursor, Kiro, Kilo variants
- **Kiro transforms** — `AskUserQuestion` → CHAT GATE; no banned interactive API references in output

### Consumers (What Depends On This)

- **Bundle D** (`CLAUDE.md`) — `metaprogram-classifier` → `grill-me` documented pairing
- **Kiro shortcut users** — `/grill-me` unprefixed shortcut in generated output
- **Generated variants** — all four platform trees receive rebuilt skills after `make build`

**Consumer Count**: Low direct coupling (catalog doc + Kiro shortcut); no orchestrator wire-up  
**Impact Scope**: Low-Medium — utility skills only; no orchestrator phase changes

---

## Test Coverage

### Test Files

| Test File | What It Asserts | Update Needed |
|-----------|-----------------|---------------|
| `platforms/kiro-cli/tests/build-core.test.sh` | 67 skill dirs, 25 shortcuts | → 69 / 26 |
| `platforms/kiro-cli/tests/validation.test.sh` | 67 total / 42 prefixed | → 69 / 43 |
| `platforms/kiro-cli/tests/phase2.test.sh` | `/grill-me` and `/thermos` shortcut mappings | + `/grill-with-docs` |
| `Makefile` validate-kiro | Rules 14, 23, 28 count checks | Bump all three |
| `make validate` | Full cross-platform validation | Must pass after build |

### Coverage Assessment

- **Structural tests**: Strong for Kiro inventory — exact counts are hard assertions, easy to break
- **Content tests**: Plan calls for new assertion that both grilling modes prohibit plan implementation in generated SKILL.md
- **Gaps**: No dedicated Cursor/Kilo count tests (plan says extend only where extension points exist)
- **Quality gate**: `make build && make validate` is the repository-wide acceptance bar

---

## Coding Patterns

### On-Demand Explicit-Only Skill Pattern

Canonical template from `thermos` and `requirements-critic`:

```yaml
---
name: <skill-name>
description: <purpose>. Use when <trigger phrases>.
disable-model-invocation: true
argument-hint: "[input]"
---
```

Followed by:

1. **Invocation guard** — trigger phrases + explicit "do NOT invoke when…" rules
2. **Principle-based body** — decision frameworks, not verbose pseudocode
3. **Boundary statements** — what the skill does NOT do (no implementation, no auto-chaining)

### Kiro Shortcut Pattern

```bash
# In skills_needing_args:
maister-grill-with-docs

# After build:
generate_shortcut_skill "grill-with-docs" "Shortcut for /maister-grill-with-docs. ..." "maister-grill-with-docs"
```

### Anti-Patterns (from Pattern Mining)

| Anti-Pattern | Why |
|--------------|-----|
| Use `grill-me` as explicit-only template | It lacks `disable-model-invocation` — use `thermos` instead |
| Edit generated variant trees directly | Overwritten on next `make build` |
| Update count sites individually | Partial updates cause cascading `make validate` failures |
| Add shared `grilling` engine now | No third consumer; violates minimal-implementation standard |
| Introduce `CONTEXT.md` | Competes with established `language.md` convention |

---

## Complexity Assessment

| Factor | Value | Level |
|--------|-------|-------|
| New source files | 1 SKILL.md (~80–150 lines est.) | Low |
| Modified source files | 1 SKILL.md rewrite + CLAUDE.md | Low |
| Build script changes | Kiro `build.sh` + Makefile counts | Medium |
| Test updates | 3 Kiro test files + optional content assertion | Medium |
| Generated variant rebuild | 4 platform trees | Low (mechanical) |
| Cross-skill boundary design | `grill-with-docs` vs 3 modeling skills | Medium |

### Overall: **Moderate**

SKILL.md authoring is the substantive work; build plumbing is mechanical but touches many synchronized count sites. No orchestrator changes, no new commands, no database/API work.

---

## Key Findings

### Strengths

- **Established patterns** — `thermos`/`requirements-critic` provide proven templates for explicit-only skills and invocation guards
- **Kiro shortcut infrastructure** — `generate_shortcut_skill` and `skills_needing_args` enumeration already handle `grill-me`; extension is copy-adjacent
- **Clear plan** — `.maister/plans/2026-07-09-improve-grill-skills.md` has detailed acceptance criteria, standards checklist, and phased implementation order
- **TDD-first plan** — structural test updates precede implementation, catching count drift early

### Concerns

- **Hard-coded inventories** — Kiro counts in Makefile + 3 test files + build messages must stay synchronized
- **Thin current skill** — `grill-me` rewrite is effectively a new skill, not a tweak
- **Upstream divergence** — must consciously reject `CONTEXT.md` and shared-engine patterns from upstream `grilling`

### Opportunities

- **Bundle D enhancement** — catalog could document when to choose `grill-me` vs `grill-with-docs` vs `linguistic-boundary-verifier`
- **Content assertion** — generated SKILL.md prohibition check becomes reusable pattern for future utility skills

---

## Impact Assessment

- **Primary changes**: 2 SKILL.md files, `CLAUDE.md`, `platforms/kiro-cli/build.sh`, `Makefile`, 3 Kiro test files
- **Related changes**: `platforms/cursor/build.sh` (reference sed if needed), generated variants via `make build`
- **Test updates**: Kiro structural counts + shortcut mapping + optional generated-content prohibition check
- **No changes**: orchestrators, commands, `context-distiller`, `aggregate-designer`, `linguistic-boundary-verifier`

### Risk Level: **Low-Medium**

Risk is low for SKILL.md authoring (well-defined plan, clear templates) and medium for build synchronization (multiple hard-coded count sites, four generated trees). No runtime behavior changes to existing orchestrators. Primary failure mode is `make validate` breakage from partial count updates — mitigated by TDD-first test updates and updating all sites together.

---

## Recommendations

### 1. Follow TDD structural gate (plan step 1)

Update `build-core.test.sh`, `validation.test.sh`, `phase2.test.sh`, and Makefile rules 14/23/28 **before** creating `grill-with-docs`. Confirm tests fail with expected messages (67→69 mismatch).

### 2. Strengthen `grill-me` using `thermos` + `requirements-critic` templates

- Add `disable-model-invocation: true` to frontmatter
- Add invocation guard with trigger phrases ("grill me", "stress-test my plan") and anti-triggers (writing/describing plans, unrelated tasks)
- Add convergence section: summarize decisions/assumptions/deferrals/contradictions → require explicit shared-understanding confirmation
- Add strict boundary: no documentation edits, no code edits, no plan implementation
- Keep concise — target ~60–100 lines, principle-based

### 3. Author `grill-with-docs` as explicit-only sibling

- Duplicate strengthened grilling protocol (do NOT extract shared engine yet)
- Add docs-aware layer per plan: discover `INDEX.md`, `language.md`, ADRs, code; vocabulary conflict detection; user-confirmed inline updates
- Reference `language-md-convention.md` sections; prohibit `CONTEXT.md`
- ADR offers gated by three significance criteria
- Distinguish from `context-distiller`, `aggregate-designer`, `linguistic-boundary-verifier` in a short "Not this skill" section

### 4. Extend Kiro build in one atomic change

In `platforms/kiro-cli/build.sh`:

- Add `maister-grill-with-docs` to `skills_needing_args` array (near `maister-grill-me`)
- Add `generate_shortcut_skill "grill-with-docs" ... "maister-grill-with-docs"` (near existing `grill-me` shortcut)
- Verify reference sed covers any cross-skill mentions

### 5. Update catalog, rebuild, validate

- Update `plugins/maister/CLAUDE.md` Review & Utility Skills table
- Run `make build` — inspect generated output in all four variants
- Run `make validate` — full quality gate
- Optionally smoke-test Cursor CLI discovery of `/maister-grill-me` and `/maister-grill-with-docs`

### 6. Do NOT

- Edit `plugins/maister-cursor/`, `plugins/maister-kiro/`, `plugins/maister-copilot/`, or `plugins/maister-kilo/` directly
- Add command wrappers (skills are palette-invoked by design)
- Create shared `grilling` or `domain-modeling` engine
- Introduce `CONTEXT.md` / `CONTEXT-MAP.md`

---

## Next Steps

1. Implementation planner can derive task groups directly from plan steps 1–7 (tests → grill-me → grill-with-docs → catalog → Kiro build → rebuild → validate).
2. Gap-analyzer should confirm no undocumented count assertion sites beyond the six identified locations.
3. Spec should reference upstream `grilling` for protocol inspiration while documenting Maister-specific `language.md` integration and explicit rejection of `CONTEXT.md`.
