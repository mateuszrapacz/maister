# Requirements

**Date**: 2026-07-08  
**Source**: `.maister/plans/2026-07-08-cursor-skill-prefix-and-palette.md` + gap analysis

## Initial Description

Implement Cursor skill prefix and slash palette consolidation: move orchestrator-framework to lib/, merge commands into skills, apply maister-* prefix to all public skills, relocate internal engines, update docs and validation.

## Functional Requirements

### FR1 — Reference layout (PR1)
- Move `orchestrator-framework` from `skills/` to `lib/orchestrator-framework/` at build time
- Update all relative references in orchestrator SKILL.md files
- Update TodoWrite transform paths in build.sh
- Validate: no `skills/orchestrator-framework`, lib path exists

### FR2 — Deduplication (PR2)
- Port `merge_commands_to_skills()` from Kiro with Cursor collapse map (D1)
- Remove duplicate command+skill pairs; one skill per capability
- Merge command-only capabilities (reviews-*, work) into new skill dirs
- Remove `commands/` directory and `"commands"` from plugin.json
- Update Makefile validate-cursor for skills-only checks

### FR3 — Prefix enforcement (PR3)
- Port `rename_skill_directories()` — all public skills get `maister-*` name and dir
- Port `apply_skill_reference_transforms()` — sed all skill references
- Validate: no plain-kebab skill dirs, all names prefixed

### FR4 — Internal engines (PR4)
- Attempt move to `lib/skills/maister-<name>/` for: docs-manager, codebase-analyzer, implementation-plan-executor, implementation-verifier
- Sentinel smoke test gates 4B vs 4A fallback
- Fallback: `skills/maister-internal-<name>/` with disable-model-invocation

### FR5 — Documentation & tests (PR5)
- Update maister-workflows-template.mdc with slash palette policy
- Update docs/cursor-agent-support.md with naming migration
- Add platforms/cursor/tests/skill-inventory.test.sh
- Wire inventory test into make validate-cursor
- Optional: plugin-development.md Cursor variant bullet

## Non-Functional Requirements

- Never edit `plugins/maister-cursor/` directly — build only
- Each phase must pass `make build-cursor && make validate-cursor`
- Committed generated output must match fresh build (CI drift)
- `platforms/cursor/smoke-cli.sh` must pass after each phase
- Source `plugins/maister/` unchanged for Claude Code

## Scope Boundaries

**In**: platforms/cursor/build.sh, overrides, Makefile, smoke-cli.sh, new inventory test, docs, templates, generated maister-cursor output

**Out**: Copilot/Kiro variants, renaming source skills in plugins/maister/, hiding skills from palette entirely (platform limitation)

## Assumptions

- D1–D6 decisions locked per plan
- Breaking change for old slash names is acceptable
- PR sequence PR1→PR5 must be respected in build.sh step ordering

## Reuse

- `platforms/kiro-cli/build.sh` — merge_commands_to_skills, rename_skill_directories, sed patterns
- Existing validate-cursor and smoke-cli.sh patterns
- Plan collapse map table for target names
