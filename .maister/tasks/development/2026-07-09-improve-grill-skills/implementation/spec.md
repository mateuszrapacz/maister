# Specification: Improve Grill Skills

**Task**: `.maister/tasks/development/2026-07-09-improve-grill-skills`  
**Authoritative inputs**: `analysis/requirements.md`, `analysis/plan-input.md`  
**Date**: 2026-07-09  
**Status**: Implementation-ready

## TL;DR

Strengthen Maister's interactive plan-stress-testing by rewriting `grill-me` (read-only, explicit-only) and adding `grill-with-docs` (same grilling discipline plus user-confirmed `language.md` and sparse ADR maintenance). Neither skill implements plans. Update plugin catalog, Kiro build generation (69/43/26 inventory), structural tests, user docs, and regenerate all platform variants via `make build && make validate`.

## Key Decisions

- **D1 — Two explicit modes** — `grill-me` is strictly read-only; `grill-with-docs` may edit documentation only after resolved decisions; neither implements the plan.
- **D2 — No shared grilling engine** — Duplicate a short protocol in two `SKILL.md` files; defer extraction until a third consumer appears.
- **D3 — `language.md`, not `CONTEXT.md`** — Integrate with `.maister/docs/standards/global/language-md-convention.md`; explicitly prohibit upstream `CONTEXT.md` / `CONTEXT-MAP.md`.
- **D4 — Sparse ADRs only** — Offer ADRs only when all three significance criteria pass (hard to reverse, surprising, genuine trade-off); default location `.maister/docs/decisions/` (MADR-style) with user confirmation before first write.
- **D5 — Explicit invocation only** — Both skills use `disable-model-invocation: true`; catalog suffix "Explicit request only." on `grill-me`; no orchestrator auto-chain.
- **D6 — Standalone positioning** — `grill-with-docs` is a standalone utility with cross-links to `grill-me` and modeling skills; not a Bundle D extension.
- **D7 — TDD-first Kiro counts** — Update six synchronized assertion sites (Makefile rules 14/23/28 + three Kiro test files) before implementation.
- **D8 — User docs in scope** — Update `docs/on-demand-skills.md`, `docs/commands.md`, `README.md`, `docs/kiro-cli-support.md` with `grill-with-docs` parity to `grill-me`.

## Open Questions / Risks

- **Kiro count drift** — Partial updates to Makefile or Kiro tests break `make validate`; all six sites must change together.
- **Skill boundary overlap** — `grill-with-docs` must distinguish from `context-distiller`, `aggregate-designer`, and `linguistic-boundary-verifier` in skill text and user docs.
- **Trivial ADR proliferation** — Must not inherit research-workflow mandatory ADR policies.
- **Unexpected mutations** — Without strengthened boundaries, grilling sessions may edit docs or implement plans during unrelated work.
- **Missing ADR tree** — `.maister/docs/decisions/` may not exist; first ADR requires propose-format-and-confirm flow.

---

## Goal

Provide two clearly differentiated, explicitly invoked grilling experiences that stress-test plans and designs until shared understanding is reached — one read-only (`grill-me`), one documentation-maintaining (`grill-with-docs`) — with correct platform discovery, catalog registration, and build-pipeline propagation across Copilot, Cursor, Kiro, and Kilo variants.

## User Stories

- As a **developer stress-testing a plan**, I want `grill-me` to ask one decision question at a time, investigate discoverable facts in the codebase, and never edit files or implement the plan, so I can refine my design safely before building.
- As a **domain modeler hardening vocabulary**, I want `grill-with-docs` to challenge overloaded terms, propose canonical language, and update `language.md` only after I confirm each resolution, so domain documentation stays accurate without accidental code changes.
- As a **architect recording significant decisions**, I want sparse ADR offers only when a decision is hard to reverse, surprising, or trade-off-driven, with confirmation before establishing a new ADR location, so decision logs stay meaningful.
- As a **Kiro CLI user**, I want `/grill-with-docs` as an unprefixed shortcut mapping to `maister-grill-with-docs`, mirroring `/grill-me`, so I can invoke the docs-aware mode from the TUI palette.
- As a **Maister user browsing docs**, I want clear when-to-use guidance distinguishing `grill-me`, `grill-with-docs`, and related modeling skills, so I pick the right tool without conflating grilling with context distillation or boundary audits.
- As a **maintainer**, I want structural tests and inventory counts to catch skill-registration drift before merge, so `make validate` remains a reliable quality gate.

## Functional Requirements

### FR-1 — Strengthen `grill-me`

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Frontmatter includes `disable-model-invocation: true` | Must |
| FR-1.2 | Invocation guard: trigger phrases (e.g. "grill me", "stress-test this plan") and anti-triggers (writing/describing plans, unrelated tasks) | Must |
| FR-1.3 | Ask exactly one decision question at a time; wait for user feedback before proceeding | Must |
| FR-1.4 | Investigate discoverable facts independently (codebase, docs, config) instead of asking the user | Must |
| FR-1.5 | Present user-owned decisions with a recommended answer and concise rationale | Must |
| FR-1.6 | Track dependencies between decisions; walk the decision tree branch by branch | Must |
| FR-1.7 | Before closing: summarize decisions, assumptions, deferrals, and contradictions | Must |
| FR-1.8 | Require explicit shared-understanding confirmation from the user before ending the session | Must |
| FR-1.9 | Prohibit documentation edits, code edits, and plan implementation | Must |
| FR-1.10 | Remain concise and principle-based (~60–100 lines); no session state files or orchestration framework | Must |
| FR-1.11 | Follow explicit-only skill patterns from `thermos` (frontmatter) and `requirements-critic` (invocation guard structure) | Must |

### FR-2 — Add `grill-with-docs`

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | New skill at `plugins/maister/skills/grill-with-docs/SKILL.md` with `disable-model-invocation: true` | Must |
| FR-2.2 | Apply the strengthened grilling protocol from FR-1 (one question, wait, fact/decision split, convergence gate, no implementation) | Must |
| FR-2.3 | Discover `.maister/docs/INDEX.md`, applicable `language.md` files, existing ADRs, and relevant code at session start | Must |
| FR-2.4 | Detect vocabulary conflicts and overloaded terms; propose precise canonical terms | Must |
| FR-2.5 | Test domain boundaries with concrete edge-case scenarios | Must |
| FR-2.6 | Check contradictions between user claims, code, and existing documentation | Must |
| FR-2.7 | Update `language.md` inline only after user confirms term resolution | Must |
| FR-2.8 | When no `language.md` exists: explain optional adoption per `language-md-convention.md` and ask before creating the first file | Must |
| FR-2.9 | Offer ADRs only when all three significance criteria pass (hard to reverse, surprising without context, genuine trade-off) | Must |
| FR-2.10 | Detect existing ADR format/location; when none exists, propose `.maister/docs/decisions/` (MADR-style) and obtain confirmation before first write | Must |
| FR-2.11 | Allow documentation edits; prohibit code implementation | Must |
| FR-2.12 | Explicitly prohibit `CONTEXT.md` / `CONTEXT-MAP.md` | Must |
| FR-2.13 | Include "Not this skill" boundary distinguishing from `context-distiller`, `aggregate-designer`, `linguistic-boundary-verifier` | Must |
| FR-2.14 | Cross-link to `grill-me` as the read-only alternative; suggest `linguistic-boundary-verifier` for read-only audits | Should |

### FR-3 — Plugin catalog update

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Add `grill-with-docs` to Review & Utility Skills in `plugins/maister/CLAUDE.md` | Must |
| FR-3.2 | Describe `grill-me` as non-mutating stress-testing mode with "Explicit request only." suffix | Must |
| FR-3.3 | Describe `grill-with-docs` as documentation-maintaining mode with `language.md`/ADR integration | Must |
| FR-3.4 | Document boundaries vs modeling/review skills; standalone cross-links (not Bundle D extension) | Must |
| FR-3.5 | Keep catalog entries short; operational detail remains in each `SKILL.md` | Must |

### FR-4 — Kiro generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Add `maister-grill-with-docs` to `skills_needing_args` in `platforms/kiro-cli/build.sh` | Must |
| FR-4.2 | Generate `/grill-with-docs` shortcut via `generate_shortcut_skill`, mapping to `maister-grill-with-docs` | Must |
| FR-4.3 | Bump Kiro inventory counts: 69 total, 43 `maister-*` prefixed, 26 unprefixed shortcuts | Must |
| FR-4.4 | Update Makefile rules 14, 23, and 28 to match new counts | Must |
| FR-4.5 | Add reference sed for `grill-with-docs` → `maister-grill-with-docs` if cross-skill mentions are introduced | Should |
| FR-4.6 | Kiro output must contain no banned interactive API references (`AskUserQuestion` → CHAT GATE) | Must |

### FR-5 — Structural tests

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | `phase2.test.sh`: assert `/grill-with-docs` shortcut maps to `maister-grill-with-docs` | Must |
| FR-5.2 | `build-core.test.sh`: assert 69 skill directories and 26 unprefixed shortcuts | Must |
| FR-5.3 | `validation.test.sh`: assert 69 total and 43 `maister-*` directories | Must |
| FR-5.4 | Generated-content check: both grilling modes prohibit plan implementation in generated `SKILL.md` output | Must |
| FR-5.5 | Update tests before implementation (TDD red gate) | Must |
| FR-5.6 | Extend Cursor/Kilo inventory tests only where an existing extension point exists | Should |

### FR-6 — Build and verification

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Edit only `plugins/maister/` and `platforms/*` source/transform files — never generated variant trees directly | Must |
| FR-6.2 | Run `make build` to regenerate Copilot, Cursor, Kiro, and Kilo variants | Must |
| FR-6.3 | Generated output includes `grill-with-docs` on all four platforms with correct naming transforms | Must |
| FR-6.4 | Verify read-only vs docs-writing distinction is preserved in generated skill content | Must |
| FR-6.5 | Run `make validate` as repository quality gate; full suite must pass | Must |

### FR-7 — User-facing documentation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | `docs/on-demand-skills.md`: add `grill-with-docs` catalog entry; update `grill-me` with convergence/docs-mode distinction and explicit-only wording | Must |
| FR-7.2 | `docs/on-demand-skills.md`: when-to-use table distinguishing `grill-me` vs `grill-with-docs` vs modeling skills | Must |
| FR-7.3 | `docs/commands.md`: add `/maister:grill-with-docs` pseudo-command section mirroring `grill-me` (explicit-request primary + Cursor callout) | Must |
| FR-7.4 | `README.md`: add `/grill-with-docs` to Kiro shortcut list | Must |
| FR-7.5 | `docs/kiro-cli-support.md`: add `/grill-with-docs` → `/maister-grill-with-docs` shortcut row | Must |
| FR-7.6 | Cross-link `grill-with-docs` to `grill-me` and `linguistic-boundary-verifier`; do not extend Bundle D as a third step | Must |
| FR-7.7 | User docs link to `SKILL.md` for behavioral depth; do not copy skill algorithm bodies | Must |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Skill text remains principle-based per `plugin-development.md`; target ~60–150 lines per skill |
| NFR-2 | No command wrappers — skills invoked via slash palette or explicit natural language |
| NFR-3 | Standards compliance: `build-pipeline.md`, `minimal-implementation.md`, `language-md-convention.md`, `test-writing.md` |
| NFR-4 | English throughout skill and user documentation |

## Reusable Components

### Existing Code to Leverage

| Component | Path | Reuse |
|-----------|------|-------|
| Explicit-only frontmatter | `plugins/maister/skills/thermos/SKILL.md` | `disable-model-invocation`, Kiro shortcut peer pattern |
| Invocation guard structure | `plugins/maister/skills/requirements-critic/SKILL.md` | Trigger/anti-trigger body, "do NOT invoke when…" |
| Kiro dual-skill pattern | `platforms/kiro-cli/build.sh` (`maister-grill-me` + `/grill-me`) | Copy-adjacent for `grill-with-docs` |
| Read-only audit boundary | `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md` | Contrast: read-only audit vs interactive docs writes |
| Language convention | `.maister/docs/standards/global/language-md-convention.md` | Template sections, adoption guidance for FR-2 |
| User doc patterns | `docs/on-demand-skills.md`, `docs/commands.md` | Catalog template, pseudo-command format for `grill-me` |
| Upstream protocol inspiration | `~/.agents/skills/grilling/SKILL.md` | Decision-tree discipline (not copied verbatim; Maister diverges on docs format) |

### New Components Required

| Component | Why new |
|-----------|---------|
| `plugins/maister/skills/grill-with-docs/SKILL.md` | Docs-aware grilling mode does not exist |
| Kiro shortcut `grill-with-docs` | Unprefixed TUI entry for new skill |
| Generated-content prohibition test | No existing assertion for grilling implementation ban |

## Scope Boundaries

### In scope

- Rewrite `plugins/maister/skills/grill-me/SKILL.md`
- Create `plugins/maister/skills/grill-with-docs/SKILL.md`
- Update `plugins/maister/CLAUDE.md` catalog
- Extend `platforms/kiro-cli/build.sh`, `Makefile`, three Kiro test files
- Optional `platforms/cursor/build.sh` reference sed
- User docs: `docs/on-demand-skills.md`, `docs/commands.md`, `README.md`, `docs/kiro-cli-support.md`
- `make build && make validate`

### Out of scope

- `CONTEXT.md` / `CONTEXT-MAP.md` introduction
- Shared `grilling` or `domain-modeling` engine
- Command wrappers for grill skills
- Changes to `context-distiller`, `aggregate-designer`, `linguistic-boundary-verifier`
- Research-workflow ADR policy harmonization
- Implementing plans produced during grilling sessions
- Orchestrator auto-chain wiring
- New Cursor/Kilo test infrastructure beyond existing extension points
- Bundle D extension (standalone cross-links only)

## Skill Boundary Matrix

| Skill | Primary intent | Mutates docs? | Mutates code? | vs grilling |
|-------|----------------|---------------|---------------|-------------|
| `grill-me` | Stress-test plan/design | No | No | — |
| `grill-with-docs` | Stress-test + maintain domain language | Yes (confirmed) | No | Adds docs layer to grilling |
| `context-distiller` | Strategic bounded-context discovery | No | No | Strategic design, not plan grilling |
| `aggregate-designer` | Consistency-unit design wizard | No | No | RC modeling, not plan grilling |
| `linguistic-boundary-verifier` | Read-only language-leakage audit | No | No | Audit only; no interactive term resolution |

## Acceptance Criteria

1. `grill-me` separates facts from decisions, waits after each question, requires convergence confirmation, and never mutates documentation, code, or implements the plan.
2. `grill-with-docs` is explicitly invocable, uses the same interview discipline, maintains `language.md`/qualified ADRs only with user confirmation, and never implements the plan.
3. Both skills have `disable-model-invocation: true` and invocation guards; catalog shows "Explicit request only." on `grill-me`.
4. No `CONTEXT.md` convention or speculative shared grilling engine is introduced.
5. Plugin catalog documents both modes, boundaries, and standalone cross-links.
6. Kiro inventory: 69 total, 43 prefixed, 26 shortcuts; `/grill-with-docs` maps to `maister-grill-with-docs`.
7. All four generated platform variants expose correctly named skills with preserved read-only vs docs-writing distinction.
8. User docs updated across four files with `grill-with-docs` parity to `grill-me`.
9. `make build && make validate` passes with no generated drift.
10. Structural tests include generated-content prohibition check for both grilling modes.

## Standards Compliance Checklist

- [x] Only source and platform-transform files edited directly (`plugin-development.md`)
- [x] Generated variants updated only through `make build` (`build-pipeline.md`)
- [x] Skill behavior concise and principle-based (`plugin-development.md`)
- [x] No speculative `grilling` abstraction (`minimal-implementation.md`)
- [x] `grill-me` read-only with explicit convergence (`conventions.md`)
- [x] `grill-with-docs` never implements resulting plan (`conventions.md`)
- [x] Documentation changes follow resolved user decisions (`conventions.md`)
- [x] Domain vocabulary uses `language.md`, not `CONTEXT.md` (`language-md-convention.md`)
- [x] Missing `language.md` adoption requires user confirmation (`language-md-convention.md`)
- [x] ADRs pass three significance criteria (`minimal-implementation.md`)
- [x] Structural assertions updated before build changes (`test-writing.md`)
- [x] Kiro inventory counts and shortcuts match generated output (`build-pipeline.md`)
- [x] `make build && make validate` passes (`build-pipeline.md`, `test-writing.md`)
