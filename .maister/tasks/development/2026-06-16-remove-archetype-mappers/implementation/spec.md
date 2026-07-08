# Specification: Remove Archetype Mappers

## Goal

Remove `accounting-archetype-mapper` and `pricing-archetype-mapper` skills, their commands, and all cross-references. These are example archetypes that shouldn't exist as standalone skills in the plugin.

## Scope

### In Scope
- Delete 2 skill directories + 2 command files
- Remove cross-references in problem-classifier, context-distiller
- Update documentation (CLAUDE.md, README.md) — rows + Bundle B
- Update build pipeline (build.sh, Makefile, test scripts)
- Verify via `make build && make validate`

### Out of Scope
- `context-distiller` and `aggregate-designer` remain untouched as skills
- Generated variants (maister-cursor/, maister-kiro/, etc.) — handled by `make build`
- `plugin-development.md` — `modeling-*` category stays (other modeling commands exist)

## File Manifest

### Delete (4 files)

| Path | Reason |
|------|--------|
| `plugins/maister/skills/accounting-archetype-mapper/SKILL.md` | Example archetype, not a real skill |
| `plugins/maister/skills/pricing-archetype-mapper/SKILL.md` | Example archetype, not a real skill |
| `plugins/maister/commands/modeling-accounting-archetype.md` | Command for removed skill |
| `plugins/maister/commands/modeling-pricing-archetype.md` | Command for removed skill |

### Edit (8 files)

| Path | Change |
|------|--------|
| `plugins/maister/skills/problem-classifier/SKILL.md` | Remove archetype intent routing + handoff mentions |
| `plugins/maister/skills/context-distiller/SKILL.md` | Remove optional archetype mapper chain in Recommended Next Steps |
| `plugins/maister/CLAUDE.md` | Remove 2 skill rows, 2 command rows, simplify Bundle B |
| `README.md` | Remove 2 command rows, simplify Bundle B |
| `platforms/kiro-cli/build.sh` | Remove 2 merge_one, 4 skills_needing_args, sedi patterns |
| `Makefile` | Update count assertions: 71→67, 46→42 |
| `platforms/kiro-cli/tests/build-core.test.sh` | Update counts: 71→67, 18→16; remove 2 `test -f` lines |
| `platforms/kiro-cli/tests/validation.test.sh` | Update counts: 71→67, 46→42 |

## Count Targets

| Metric | Before | After |
|--------|--------|-------|
| Kiro total skill dirs | 71 | 67 |
| Kiro maister-* dirs | 46 | 42 |
| Kiro shortcut dirs | 25 | 25 |
| Source skills | 30 | 28 |
| Source commands | 16 | 14 |
| merge_one entries | 16 | 14 |
| skills_needing_args | 40 | 36 |
| Merged command test label | 18 | 16 |

## Acceptance Criteria

1. **Grep clean**: `grep -r "archetype-mapper\|archetype_mapper\|accounting-archetype\|pricing-archetype" plugins/ platforms/ Makefile README.md` returns zero matches
2. **Build passes**: `make build` completes without errors
3. **Validation passes**: `make validate` (or equivalent test target) passes all assertions
4. **Count checks**: Makefile and test scripts assert the "After" values from the count table above
5. **Remaining skills intact**: `context-distiller`, `aggregate-designer`, `problem-classifier` function unchanged (no broken references to removed mappers)

## Testing Approach

- 2-3 verification steps: grep scan, build gate, validate gate
- No new tests needed — existing test infrastructure validates counts and file presence

## Standards Compliance

No new code created — standards compliance is N/A for pure removal.
