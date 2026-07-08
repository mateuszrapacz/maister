# Codebase Analysis — Cursor Skill Prefix & Slash Palette

**Task**: Implement `.maister/plans/2026-07-08-cursor-skill-prefix-and-palette.md`  
**Date**: 2026-07-08

## Summary

The Cursor variant is generated from `plugins/maister/` via `platforms/cursor/build.sh`. Today it exposes **16 commands + 28 skills (~44 palette entries)** with inconsistent naming: commands use `maister-*`, many skills use plain kebab (`problem-classifier`, `codebase-analyzer`). Internal engines and reference-only `orchestrator-framework` appear in slash autocomplete because Cursor loads every `skills/*/SKILL.md` and ignores `user-invocable: false`.

The Kiro build (`platforms/kiro-cli/build.sh`) already implements `merge_commands_to_skills()`, `rename_skill_directories()`, and reference sed transforms — the primary porting surface for this work. All changes belong in `platforms/cursor/build.sh`, `Makefile`, smoke tests, and docs — **never** direct edits to `plugins/maister-cursor/`.

## Key Files

| File | Purpose |
|------|---------|
| `platforms/cursor/build.sh` | Primary implementation — add lib move, merge, rename, reference sed |
| `platforms/kiro-cli/build.sh` | Reference: `merge_commands_to_skills`, `rename_skill_directories` (L41–90) |
| `platforms/cursor/overrides/` | quick-plan, quick-dev, quick-bugfix Cursor-specific bodies |
| `platforms/cursor/patches/orchestrator-patterns-todowrite.md` | Appended post-build — paths must update after lib move |
| `Makefile` (validate-cursor L37–103) | Currently **commands-centric** — must invert for skills-only |
| `platforms/cursor/smoke-cli.sh` | Runtime smoke — extend with sentinel test in PR4 |
| `plugins/maister-cursor/.cursor-plugin/plugin.json` | Has `"commands": "./commands/"` — remove in PR2 |

## Current Inventory

### Skills without `maister-` prefix (17)

`orchestrator-framework`, `codebase-analyzer`, `docs-manager`, `implementation-plan-executor`, `implementation-verifier`, `problem-classifier`, `transcript-critic`, `requirements-critic`, `metaprogram-classifier`, `context-distiller`, `aggregate-designer`, `test-strategy-reviewer`, `linguistic-boundary-verifier`, `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`

### Already prefixed (11)

`maister-init`, `maister-development`, `maister-research`, `maister-migration`, `maister-performance`, `maister-product-design`, `maister-standards-discover`, `maister-standards-update`, `maister-quick-plan`, `maister-quick-dev`, `maister-quick-bugfix`

### Duplicate pairs (command + skill)

| Command | Skill | Resolution (D1) |
|---------|-------|-----------------|
| `maister-quick-problem-classifier` | `problem-classifier` | → `maister-problem-classifier` |
| `maister-quick-transcript-critic` | `transcript-critic` | → `maister-transcript-critic` |
| `maister-quick-requirements-critic` | `requirements-critic` | → `maister-requirements-critic` |
| `maister-quick-metaprogram-classifier` | `metaprogram-classifier` | → `maister-metaprogram-classifier` |
| `maister-modeling-context-distiller` | `context-distiller` | → `maister-context-distiller` |
| `maister-modeling-aggregate-designer` | `aggregate-designer` | → `maister-aggregate-designer` |
| `maister-reviews-test-strategy` | `test-strategy-reviewer` | → `maister-test-strategy-reviewer` |
| `maister-reviews-linguistic-boundaries` | `linguistic-boundary-verifier` | → `maister-linguistic-boundary-verifier` |
| `maister-quick-plan` (cmd) | `maister-quick-plan` (skill) | Merge → skill only |
| `maister-quick-dev` (cmd) | `maister-quick-dev` (skill) | Merge → skill only |

### Command-only (no skill file — need merge)

`maister-reviews-code`, `maister-reviews-pragmatic`, `maister-reviews-spec-audit`, `maister-reviews-reality-check`, `maister-reviews-production-readiness`, `maister-work`

## Build Pipeline Gaps

| Plan Phase | Missing in Cursor build |
|------------|-------------------------|
| PR1 | `orchestrator-framework` → `lib/orchestrator-framework/` |
| PR2 | `merge_commands_to_skills()`, remove `commands/`, manifest update |
| PR3 | `rename_skill_directories()`, `apply_skill_reference_transforms()` |
| PR4 | Internal engines → `lib/skills/` or `maister-internal-*` |
| PR5 | `skill-inventory.test.sh`, docs, rules template |

## Integration Points

1. TodoWrite transforms in `build.sh` L272–300 hardcode `skills/orchestrator-framework` — update after PR1
2. Orchestrator SKILL.md files reference `../orchestrator-framework/` — must become `../lib/orchestrator-framework/`
3. `validate-cursor` requires `commands/quick-plan.md` and `commands/quick-dev.md` — remove in PR2
4. `quick-dev` override delegates `skill: "quick-dev"` but skill is `name: maister-quick-dev` — bug fixed by merge
5. CI `validate-generated-variants.yml` requires committed `plugins/maister-cursor/` matches build

## Risks

- **Skill tool `lib/skills/` resolution unproven** — sentinel smoke gate in PR4
- **Sed transform completeness** — plain-kebab refs in orchestrators, hooks, rules
- **Breaking slash names** — `/problem-classifier` → `/maister-problem-classifier` (accepted per D1)

## Primary Language

Bash (build transforms), Markdown (skills/commands), Makefile
