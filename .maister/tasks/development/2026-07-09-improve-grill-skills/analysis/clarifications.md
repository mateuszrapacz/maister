# Phase 1 Clarifications

**Date**: 2026-07-09T19:37:50Z  
**Status**: Resolved

## Assumed from plan (no clarification needed)

| Topic | Resolution |
|-------|------------|
| Two modes (`grill-me` read-only, `grill-with-docs` docs-only) | Locked in plan design decisions |
| No shared `grilling` abstraction | Locked — duplicate short protocol |
| Use `language.md`, not `CONTEXT.md` | Locked per language-md-convention |
| `grill-me` gets `disable-model-invocation: true` | Locked in plan step 2 |
| Kiro counts 67→69, 42→43, 25→26 | Locked in plan |
| TDD structural tests before implementation | Locked in plan step 1 |
| No command wrappers for grill skills | Locked — skill-only like `grill-me`/`thermos` |
| Edit source only; `make build` for variants | Locked per plugin-development standards |

## User decisions

| Question | Answer |
|----------|--------|
| User-facing docs in scope? | **Yes** — update docs/on-demand-skills.md, docs/commands.md, README Kiro shortcuts |
| Default ADR location for grill-with-docs? | **`.maister/docs/decisions/`** (MADR-style; user must still confirm) |
| Add "Explicit request only." to grill-me catalog? | **Yes** — match thermos/requirements-critic peers |

## Codebase analysis summary

- `grill-me`: 11-line minimal skill; missing explicit-only guards and convergence protocol
- `grill-with-docs`: does not exist
- Primary touch points: 8 source/build files + 3 Kiro test files
- Complexity: moderate; risk: low-medium
- Templates: `thermos` (explicit-only + shortcut), `requirements-critic` (invocation guard)
