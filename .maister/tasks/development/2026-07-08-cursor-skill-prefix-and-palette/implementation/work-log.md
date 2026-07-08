# Work Log — Cursor Skill Prefix & Slash Palette

**Date**: 2026-07-08

## PR1 — orchestrator-framework → lib/

- Added `relocate_orchestrator_framework()` and `update_orchestrator_framework_paths()` to `platforms/cursor/build.sh`
- Updated `TODO_GLOB` and patch append paths to `lib/orchestrator-framework/`

## PR2 — merge commands → skills

- Added `merge_commands_to_skills()` with D1 skip list (no collapse duplicates)
- Added `apply_cursor_overrides()` — skill bodies only, no command wrappers
- Removed `"commands"` from `.cursor-plugin/plugin.json` generation

## PR3 — maister-* prefix

- Added `rename_skill_directories()` and `apply_skill_reference_transforms()`
- Updated agent `skills:` preload lists (docs-operator, thermo subagents)
- Updated init/docs-manager patch paths to `maister-*` dirs

## PR4 — internal engines → lib/skills/

- Added `relocate_internal_skills()` for 4 internal engines
- Added sentinel fixture + smoke test in `platforms/cursor/smoke-cli.sh`

## PR5 — docs & inventory

- Updated `maister-workflows-template.mdc` slash palette policy
- Updated `docs/cursor-agent-support.md` §8 skill visibility & naming
- Added `platforms/cursor/tests/skill-inventory.test.sh`
- Updated `Makefile validate-cursor` (skills-only checks)
- Updated `plugin-development.md` Cursor variant bullet
- Updated generated README in build.sh

## Validation

```
make build-cursor && make validate-cursor  # PASS
skill inventory: 29 public skills
```

## Files changed (source)

- `platforms/cursor/build.sh`
- `Makefile`
- `platforms/cursor/smoke-cli.sh`
- `platforms/cursor/templates/maister-workflows-template.mdc`
- `platforms/cursor/tests/skill-inventory.test.sh` (new)
- `platforms/cursor/tests/fixtures/maister-sentinel-lib-skill/SKILL.md` (new)
- `docs/cursor-agent-support.md`
- `.maister/docs/standards/global/plugin-development.md`
- `plugins/maister-cursor/**` (regenerated)
