# Scope Clarifications

**Date:** 2026-06-13  
**Gate:** Phase 2 exit — user confirmed

## Decisions Made

| Decision | Choice |
|----------|--------|
| `disable-model-invocation` scope | Critics only (`requirements-critic`, `transcript-critic`) — ADR-008 literal |
| Language preference gate (ADR-007) | Defer; port bilingual bodies as-is |
| Bundle A documentation | CLAUDE.md Bundle A section + chain sections in SKILL.md |
| `modeling-*` category standard | Defer to Wave 4 (E4) |

## Confirmed Scope (Wave 1 / E1)

**Create:**
- `plugins/maister/skills/requirements-critic/SKILL.md`
- `plugins/maister/skills/transcript-critic/SKILL.md`
- `plugins/maister/skills/problem-classifier/SKILL.md`
- `plugins/maister/commands/quick-requirements-critic.md`
- `plugins/maister/commands/quick-transcript-critic.md`
- `plugins/maister/commands/quick-problem-classifier.md`

**Modify:**
- `plugins/maister/CLAUDE.md` — backfill grill-me/thermos/thermo-nuclear-* + Wave 1 + Bundle A
- `platforms/kiro-cli/build.sh` — skills_needing_args, merge_one
- `Makefile` + kiro tests — skill counts 26→32

**Out of scope:**
- Waves 2–4 skills
- Orchestrator changes (development/product-design)
- `language.md` standard (E2)
- `research --gather-only` (E6)
- `aggregate-designer` port (stub chain only)

## Skipped Phases

- Phase 3 (TDD Red): `has_reproducible_defect: false`
- Phase 4 (UI Mockups): `ui_heavy: false`
