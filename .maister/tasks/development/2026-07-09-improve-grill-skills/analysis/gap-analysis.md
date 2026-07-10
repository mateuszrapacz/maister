# Gap Analysis: Improve Grill Skills

## TL;DR

Source-plugin enhancement with one skill rewrite (`grill-me`), one new skill (`grill-with-docs`), synchronized Kiro build/test count bumps (67→69), catalog updates, user-facing doc refresh, and `make build && make validate`. No orchestrator, command-wrapper, or UI work. Phase 1 locked scope and ADR defaults; remaining risk is build-inventory drift and skill-boundary prose in `grill-with-docs`. Effort moderate; risk low-medium.

## Key Decisions

- **Two explicit modes (locked)** — `grill-me` read-only; `grill-with-docs` docs-only after resolved decisions; neither implements plans.
- **No shared `grilling` engine (locked)** — duplicate short protocol in two SKILL.md files until a third consumer appears.
- **`language.md` not `CONTEXT.md` (locked)** — integrate with existing convention and `linguistic-boundary-verifier`.
- **Sparse ADRs (locked)** — three significance criteria; default location `.maister/docs/decisions/` (MADR-style) with user confirmation before first write.
- **User docs in scope (locked)** — `docs/on-demand-skills.md`, `docs/commands.md`, `README.md`, `docs/kiro-cli-support.md`.
- **Catalog suffix (locked)** — `grill-me` gets "Explicit request only." like `thermos` / `requirements-critic` peers.
- **TDD-first Kiro counts (locked)** — update tests/Makefile before implementation; six synchronized assertion sites only.

## Open Questions / Risks

- **Plan vs clarifications gap** — `plan-input.md` steps 1–7 omit an explicit user-docs implementation step; clarifications add it. Spec/planner must include doc updates or they will be missed.
- **Kiro count synchronization** — partial updates to Makefile rules 14/23/28 or the three Kiro test files break `make validate`.
- **Skill boundary overlap** — `grill-with-docs` must distinguish from `context-distiller`, `aggregate-designer`, and `linguistic-boundary-verifier` in SKILL.md and user docs.
- **Trivial ADR proliferation** — must not inherit research-workflow mandatory ADR policy.
- **Auto-invocation** — without `disable-model-invocation: true`, strengthened `grill-me` could still fire during unrelated work.
- **No repo ADR tree yet** — `.maister/docs/decisions/` does not exist; first ADR requires propose-format-and-confirm flow in skill text.
- **Bundle D positioning** — optional whether `grill-with-docs` appears in Bundle D or as a standalone vocabulary path (see important decision I1).

---

## Summary

- **Risk Level**: low-medium
- **Estimated Effort**: medium
- **Detected Characteristics**: modifies_existing_code, creates_new_entities

## Task Characteristics

| Field | Value | Rationale |
|-------|-------|-----------|
| `has_reproducible_defect` | false | Enhancement of utility skills, not a broken runtime behavior |
| `modifies_existing_code` | true | Rewrite `grill-me`, update catalog, Kiro build, tests, user docs |
| `creates_new_entities` | true | New `grill-with-docs` skill directory and Kiro shortcut |
| `involves_data_operations` | false | Markdown skills and build artifacts only |
| `ui_heavy` | false | No UI components or screens |

**Change classification**: additive + modificative (new skill + strengthened existing skill + build inventory bump)

## Current vs Desired State

### `grill-me` protocol

| Aspect | Current | Desired | Gap |
|--------|---------|---------|-----|
| Frontmatter | `name`, `description`, `argument-hint` only | + `disable-model-invocation: true` | Missing explicit-only guard |
| Invocation guard | None | Trigger phrases + anti-triggers | May auto-invoke or run during writing tasks |
| Question discipline | One at a time (implicit) | One decision question; wait for feedback | No explicit pause gate |
| Fact vs decision | Codebase exploration mentioned | Investigate facts independently; present decisions with recommendation + rationale | Not distinguished |
| Dependency tracking | "Walk down each branch" (vague) | Track dependencies between decisions | Unstructured |
| Convergence | None | Summarize decisions/assumptions/deferrals/contradictions; require explicit shared-understanding confirmation | Session can end without closure |
| Boundaries | None | No doc edits, no code edits, no plan implementation | Mutation risk during grilling |
| Catalog entry | No "Explicit request only." suffix | Match `thermos` / `requirements-critic` peers | Inconsistent catalog signaling |

### `grill-with-docs` skill

| Aspect | Current | Desired | Gap |
|--------|---------|---------|-----|
| Skill directory | Absent | `plugins/maister/skills/grill-with-docs/SKILL.md` | **Full gap — create** |
| Protocol | N/A | Strengthened grilling + docs-aware layer | N/A |
| `language.md` integration | N/A | Discover, challenge vocabulary, user-confirmed inline updates | N/A |
| ADR offers | N/A | Sparse (3 criteria); detect existing format or propose `.maister/docs/decisions/` | N/A |
| Boundaries | N/A | Docs edits allowed; no code implementation; distinguish from 3 modeling/review skills | N/A |

### Plugin catalog (`plugins/maister/CLAUDE.md`)

| Aspect | Current | Desired | Gap |
|--------|---------|---------|-----|
| `grill-me` | One-line description, no explicit-only suffix | Non-mutating mode + "Explicit request only." | Update wording |
| `grill-with-docs` | Not listed | Documentation-maintaining mode; `language.md`/ADR integration; boundaries vs modeling skills | **Missing entry** |
| Bundle D | `metaprogram-classifier` → `grill-me` | May optionally document when to choose `grill-with-docs` | Optional enhancement (I1) |

### Kiro build pipeline

| Aspect | Current | Desired | Gap |
|--------|---------|---------|-----|
| `skills_needing_args` | Includes `maister-grill-me` | + `maister-grill-with-docs` | Not enumerated |
| Shortcut | `/grill-me` → `maister-grill-me` | + `/grill-with-docs` → `maister-grill-with-docs` | Not generated |
| Reference sed | `run \`grill-me\`` transform | May need `grill-with-docs` if cross-skill refs added | Conditional |
| Inventory counts | 67 total / 42 prefixed / 25 shortcuts | 69 / 43 / 26 | Six sites out of sync after add |

**Synchronized count assertion sites** (no additional hidden sites found in active code):

1. `Makefile` — Rule 14 (total), Rule 23 (shortcuts), Rule 28 (prefixed)
2. `platforms/kiro-cli/tests/build-core.test.sh` — total + shortcuts
3. `platforms/kiro-cli/tests/validation.test.sh` — total + prefixed
4. `platforms/kiro-cli/tests/phase2.test.sh` — shortcut mapping (extend `test_grill_thermos_prompts` or add parallel test)

### Generated variants

| Platform | Current | Desired | Gap |
|----------|---------|---------|-----|
| Copilot | `grill-me` only | + `grill-with-docs` | Rebuild via `make build` |
| Cursor | `maister-grill-me` | + `maister-grill-with-docs` | Rebuild |
| Kiro | `maister-grill-me` + `/grill-me` | + `maister-grill-with-docs` + `/grill-with-docs` | Build script + rebuild |
| Kilo | `grill-me` transform | + `grill-with-docs` | Rebuild |

**Do not edit** `plugins/maister-cursor/`, `maister-kiro/`, `maister-copilot/`, `maister-kilo/` directly.

### User-facing documentation

| File | Current | Desired | Gap |
|------|---------|---------|-----|
| `docs/on-demand-skills.md` | `grill-me` only; no convergence/docs-mode distinction | Document both modes, trigger phrases, when-to-use boundaries, Kiro `/grill-with-docs` | **Incomplete** |
| `docs/commands.md` | `/maister:grill-me` pseudo-entry | Add `grill-with-docs` entry (explicit-request pattern) | **Missing** |
| `README.md` | Lists `/grill-me` Kiro shortcut | + `/grill-with-docs` | **Missing** |
| `docs/kiro-cli-support.md` | `/grill-me` shortcut row | + `/grill-with-docs` row | **Missing** |

Note: `plan-input.md` implementation steps do not list user-doc updates; clarifications add them — treat as in-scope gap to close during implementation.

### Tests

| Test | Current | Desired | Gap |
|------|---------|---------|-----|
| Kiro structural counts | Assert 67/42/25 | Assert 69/43/26 | Update before implementation (TDD) |
| `phase2.test.sh` shortcut mapping | `/grill-me`, `/thermos` | + `/grill-with-docs` | Extend assertion |
| Generated content prohibition | None | Both grilling modes prohibit plan implementation in generated SKILL.md | New assertion per plan step 1 |

No dedicated Cursor/Kilo inventory count tests exist; plan correctly limits extensions to existing extension points.

## Gaps Identified

### Missing features

- `plugins/maister/skills/grill-with-docs/SKILL.md` — new explicit-only docs-aware grilling skill
- Kiro `/grill-with-docs` shortcut generation
- User-doc coverage for `grill-with-docs` across four doc files
- Optional generated-content test for implementation prohibition language

### Incomplete features

- `grill-me` — 11-line upstream port missing 7 protocol elements (explicit-only, invocation guard, fact/decision split, wait gate, dependency tracking, convergence, mutation ban)
- `plugins/maister/CLAUDE.md` — missing `grill-with-docs`; `grill-me` lacks explicit-only catalog suffix
- Kiro build inventory — counts and shortcut list stale for new skill

### Out of scope (confirmed)

- `CONTEXT.md` / `CONTEXT-MAP.md` conventions
- Shared `grilling` or `domain-modeling` engine
- Command wrappers for grill skills
- Changes to `context-distiller`, `aggregate-designer`, `linguistic-boundary-verifier`
- Harmonizing research-workflow ADR policies
- Plan implementation during grilling sessions

## Integration Points

| Integration | Role |
|-------------|------|
| `plugins/maister/skills/grill-me/SKILL.md` | Rewrite target |
| `plugins/maister/skills/grill-with-docs/SKILL.md` | New skill (templates: `thermos`, `requirements-critic`) |
| `plugins/maister/CLAUDE.md` | Catalog + Bundle D prose |
| `platforms/kiro-cli/build.sh` | `skills_needing_args`, `generate_shortcut_skill`, reference sed |
| `Makefile` | Rules 14, 23, 28 |
| `platforms/kiro-cli/tests/*.test.sh` | Structural + shortcut assertions |
| `platforms/cursor/build.sh` | Optional `grill-with-docs` reference sed |
| `.maister/docs/standards/global/language-md-convention.md` | `grill-with-docs` vocabulary rules |
| `docs/on-demand-skills.md`, `docs/commands.md`, `README.md`, `docs/kiro-cli-support.md` | User-facing discovery |
| `make build` → four generated plugin trees | Drift-free variant propagation |
| `make validate` | Repository quality gate |

**Patterns to follow**: `thermos` (explicit-only frontmatter + Kiro shortcut), `requirements-critic` (invocation guard body), existing `grill-me` Kiro dual-skill pattern.

## User Journey Impact Assessment

| Dimension | Current | After | Assessment |
|-----------|---------|-------|------------|
| Reachability | `grill-me` via NL + `/maister-grill-me` + Kiro `/grill-me` | + `grill-with-docs` paths on all platforms | Positive — new explicit entry point |
| Discoverability | Two grilling intents conflated under one skill | Clear read-only vs docs-maintaining split in catalog and user docs | +2 (estimated 6→8 for grilling use cases) |
| Flow integration | Bundle D ends at `grill-me` | Optional path to vocabulary-hardening via `grill-with-docs` | Neutral until I1 resolved |
| Mis-invocation risk | `grill-me` may auto-invoke; may mutate docs during stress-test | Explicit-only + hard boundaries on both skills | Positive — reduces accidental edits |

## Issues Requiring Decisions

### Critical

None — Phase 1 clarifications resolved blocking scope questions (two modes, `language.md`, ADR default location, user docs in scope, catalog suffix).

### Important

| ID | Question | Options | Recommendation | Rationale |
|----|----------|---------|----------------|-----------|
| I1 | How should user docs position `grill-with-docs` relative to Bundle D? | A) Extend Bundle D as optional third step after `grill-me` B) New "Bundle E" for vocabulary + ADR hardening C) Standalone skill only — no bundle | **C** with cross-links | Bundle D is stakeholder-communication focused; `grill-with-docs` is domain-language maintenance — different intent. Cross-link from `grill-me` "suggested next" and from `linguistic-boundary-verifier` comparison table avoids bundle sprawl. |
| I2 | Should `docs/commands.md` add a `/maister:grill-with-docs` pseudo-command section mirroring `grill-me`? | A) Yes — parity with `grill-me` entry B) Document only in `on-demand-skills.md` | **A** | `commands.md` already documents `grill-me` as explicit-request pseudo-command; parity keeps slash-reference discoverability consistent. |

## Recommendations

1. **TDD structural gate first** — bump Kiro tests and Makefile counts; confirm expected failures before creating the skill.
2. **Author skills from templates** — `thermos` + `requirements-critic`, not current `grill-me`.
3. **Atomic Kiro build change** — `skills_needing_args`, shortcut generation, and count bumps in one commit slice.
4. **Add implementation plan step for user docs** — update four doc files; align `on-demand-skills.md` §2 explicit-request list and trigger table.
5. **Prohibit `CONTEXT.md` explicitly** in `grill-with-docs` SKILL.md body.
6. **Content assertion** — add generated SKILL.md check that both modes ban plan implementation.
7. **Run `make build && make validate`** as final gate; optionally smoke-test Cursor palette for `/maister-grill-me` and `/maister-grill-with-docs`.

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Kiro count drift | Medium | Update all six sites together; TDD-first |
| Unexpected mutations | Medium | `disable-model-invocation` + explicit boundaries in both skills |
| Trivial ADRs | Low-Medium | Three-criteria gate in skill text; no research-workflow inheritance |
| Skill boundary confusion | Low-Medium | "Not this skill" section in `grill-with-docs`; user-doc when-to-use table |
| Platform drift | Low | Source-only edits + `make build` |
| User-doc / plan drift | Low | Treat clarifications as authoritative; add explicit doc step to implementation plan |
| SKILL.md verbosity | Low | Principle-based prose; target ~60–150 lines per skill |

**Overall risk**: **low-medium** — well-defined plan and established patterns; primary failure mode is mechanical build/test desynchronization.
