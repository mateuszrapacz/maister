# Clarifications

**Date**: 2026-07-08

## Assumptions (from locked plan)

All decisions D1–D6 are locked in the plan. No open questions remain per plan author.

| Decision | Choice |
|----------|--------|
| D1 | Shorter public names (`maister-problem-classifier`, not `maister-quick-problem-classifier`) |
| D2 | `grill-me` → `maister-grill-me` |
| D3 | Remove `commands/` entirely |
| D4 | Try `lib/skills/` first (4B), fallback `maister-internal-*` (4A) |
| D5 | Move `orchestrator-framework` to `lib/` before any renaming |
| D6 | CI drift fail-fast (already in repo) |

## Scope

- **In scope**: All 5 PR phases in the plan (full implementation)
- **Out of scope**: Copilot/Kiro variants, source `plugins/maister/` name changes
- **Source of truth**: `.maister/plans/2026-07-08-cursor-skill-prefix-and-palette.md`

## Implementation approach

Execute as a single implementation following PR1→PR5 sequence within one development task, regenerating `plugins/maister-cursor/` after each logical phase and validating with `make build-cursor && make validate-cursor`.
