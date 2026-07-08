# Codebase Analysis — Remove Archetype Mappers

## Summary

Remove `accounting-archetype-mapper` and `pricing-archetype-mapper` skills + commands. These are example archetypes that shouldn't live in the plugin as standalone skills.

## Files to DELETE

| Path | Type |
|------|------|
| `plugins/maister/skills/accounting-archetype-mapper/SKILL.md` | Skill directory |
| `plugins/maister/skills/pricing-archetype-mapper/SKILL.md` | Skill directory |
| `plugins/maister/commands/modeling-accounting-archetype.md` | Command |
| `plugins/maister/commands/modeling-pricing-archetype.md` | Command |

## Files to EDIT

| Path | Change |
|------|--------|
| `plugins/maister/skills/problem-classifier/SKILL.md` | Remove archetype mapper routing (2 locations) |
| `plugins/maister/skills/context-distiller/SKILL.md` | Remove optional archetype mapper chain refs |
| `plugins/maister/CLAUDE.md` | Remove 2 skill rows, 2 command rows, update Bundle B |
| `README.md` | Remove 2 command rows, update Bundle B |
| `platforms/kiro-cli/build.sh` | Remove 2 merge_one, 4 skills_needing_args, sedi entries |
| `Makefile` | Rules 14/28: 71→67, 46→42 |
| `platforms/kiro-cli/tests/build-core.test.sh` | 71→67, 18→16, remove 2 test -f |
| `platforms/kiro-cli/tests/validation.test.sh` | 71→67, 46→42 |

## Count Impact

| Metric | Current | After removal |
|--------|---------|---------------|
| Source skills | 30 | 28 |
| Source commands | 16 | 14 |
| Kiro total skill dirs | 71 | 67 |
| Kiro maister-* dirs | 46 | 42 |
| Kiro shortcut dirs | 25 | 25 (unchanged) |
| merge_one entries | 16 | 14 |
| skills_needing_args | 40 | 36 |
| Merged command test label | 18 | 16 |

## Risk Assessment

- **Risk level**: Low — pure removal, well-defined surfaces, no behavioral changes to remaining code
- **Complexity**: Simple — additive removal, grep-verifiable
- **Regression**: None expected — remaining skills work independently

## Generated Variants

All `maister-cursor/`, `maister-copilot/`, `maister-kiro/`, `maister-kilo/` regenerate via `make build`. No manual edits.
