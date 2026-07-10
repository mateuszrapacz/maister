# Requirements: Improve Grill Skills

**Date**: 2026-07-09  
**Source**: Plan (`analysis/plan-input.md`), codebase analysis, clarifications, scope decisions

## Initial Description

Strengthen Maister's interactive plan-stress-testing behavior using upstream `grilling` guidance, and add an explicit documentation-aware variant (`grill-with-docs`). Two clearly different user experiences:

- **grill-me**: read-only questioning and codebase investigation; never edits documentation or implements the plan.
- **grill-with-docs**: same questioning discipline, with user-confirmed updates to `language.md` and qualified ADRs; never implements the plan.

## Q&A Rounds

### Phase 1 Clarifications

| Topic | Answer |
|-------|--------|
| User-facing docs in scope? | Yes — `docs/on-demand-skills.md`, `docs/commands.md`, `README.md`, `docs/kiro-cli-support.md` |
| ADR default location | `.maister/docs/decisions/` (MADR-style; user must confirm before first write) |
| grill-me catalog suffix | Add "Explicit request only." |

### Phase 2 Scope Decisions

| Topic | Answer |
|-------|--------|
| Bundle D positioning | Standalone with cross-links — no new bundle |
| commands.md parity | Yes — grill-with-docs pseudo-command section mirroring grill-me |

### Phase 5 Requirements Confirmation

| Topic | Answer |
|-------|--------|
| User journey | Explicit invocation only — natural language or platform slash; no orchestrator auto-chain |
| Code reuse templates | `thermos` (explicit-only + Kiro shortcut) + `requirements-critic` (invocation guard) |
| Structural test scope | Kiro-focused per plan — counts, shortcut mapping, prohibit-implementation content check |

## Similar Features Identified

| Feature | Path | Reuse |
|---------|------|-------|
| grill-me (current) | `plugins/maister/skills/grill-me/SKILL.md` | Rewrite base |
| thermos | `plugins/maister/skills/thermos/SKILL.md` | `disable-model-invocation`, Kiro shortcut pattern |
| requirements-critic | `plugins/maister/skills/requirements-critic/SKILL.md` | Invocation guard body structure |
| linguistic-boundary-verifier | `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md` | Boundary distinction (read-only audit vs interactive docs) |
| Kiro build | `platforms/kiro-cli/build.sh` | `skills_needing_args`, `generate_shortcut_skill` |

## Visual Assets

None — non-UI task. No `design-context/` required.

## Functional Requirements Summary

### FR-1: Strengthen grill-me

- `disable-model-invocation: true`
- One decision question at a time; wait for feedback
- Investigate discoverable facts independently
- Present user-owned decisions with recommended answer + rationale
- Track decision dependencies
- Summarize decisions, assumptions, deferrals, contradictions before closing
- Require explicit shared-understanding confirmation
- Prohibit documentation/code edits and plan implementation
- Keep concise — no session state files or orchestration framework

### FR-2: Add grill-with-docs

- Explicit-only utility applying strengthened grilling protocol
- Discover `.maister/docs/INDEX.md`, applicable `language.md`, existing ADRs, relevant code
- Vocabulary conflict detection; canonical-term proposals; edge-case scenarios
- Contradiction checks between claims, code, documentation
- User-confirmed inline `language.md` updates after term resolution
- Optional `language.md` adoption when none exists (ask first)
- Sparse ADR offers (three significance criteria)
- ADR format/location detection; propose `.maister/docs/decisions/` when none exists
- Documentation edits allowed; code implementation prohibited
- Distinguish from context-distiller, aggregate-designer, linguistic-boundary-verifier

### FR-3: Catalog update

- Add `grill-with-docs` to Review & Utility Skills in `plugins/maister/CLAUDE.md`
- Describe both modes and boundaries
- grill-me gets "Explicit request only." suffix
- Standalone cross-links (not Bundle D extension)

### FR-4: Kiro generation

- Add `maister-grill-with-docs` to `skills_needing_args`
- Generate `/grill-with-docs` shortcut
- Bump counts: 69 total, 43 prefixed, 26 shortcuts
- Update Makefile rules 14/23/28 and Kiro tests

### FR-5: Structural tests (TDD red first)

- Expect `/grill-with-docs` → `maister-grill-with-docs`
- Assert 69/43/26 inventory counts
- Content check: both grilling modes prohibit plan implementation

### FR-6: Build and verify

- `make build` — regenerate Copilot, Cursor, Kiro, Kilo variants
- `make validate` — full validation suite
- Verify read-only vs docs-writing distinction in generated output

### FR-7: User-facing documentation

- `docs/on-demand-skills.md` — grill-with-docs entry
- `docs/commands.md` — pseudo-command section parity with grill-me
- `README.md` — Kiro shortcut list
- `docs/kiro-cli-support.md` — shortcut mapping

## Reusability Opportunities

- Kiro dual-skill pattern (full + shortcut) — identical to grill-me/thermos
- Cursor `apply_skill_reference_transforms` sed lines — add grill-with-docs
- No command wrappers — skill-only invocation model

## Scope Boundaries

### In scope

- grill-me rewrite, grill-with-docs creation
- CLAUDE.md catalog, Kiro build.sh, Makefile, Kiro tests
- User docs listed above
- `make build && make validate`

### Out of scope

- `CONTEXT.md` / `CONTEXT-MAP.md`
- Shared `grilling` or `domain-modeling` engine
- Changes to context-distiller, aggregate-designer, linguistic-boundary-verifier
- Research-workflow ADR policy harmonization
- Implementing plans produced during grilling sessions
- Cursor/Kilo new test infrastructure (extend only if extension point exists)

## Technical Considerations

- Edit `plugins/maister/` and `platforms/*` only — never generated trees directly
- Six synchronized Kiro count assertion sites
- ADR directory `.maister/docs/decisions/` may not exist yet — skill must propose-and-confirm
- Standards: plugin-development, build-pipeline, minimal-implementation, language-md-convention, test-writing
