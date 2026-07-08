# Work Log — Remove Archetype Mappers

## 2026-06-16 — Implementation

**Group 1: Deletions**
- Deleted `plugins/maister/skills/accounting-archetype-mapper/`
- Deleted `plugins/maister/skills/pricing-archetype-mapper/`
- Deleted `plugins/maister/commands/modeling-accounting-archetype.md`
- Deleted `plugins/maister/commands/modeling-pricing-archetype.md`

**Group 2: Edits**
- `problem-classifier/SKILL.md` — removed routing table rows + Recommended next steps mapper entries
- `context-distiller/SKILL.md` — removed optional chain ref + Notes section accounting reference
- `CLAUDE.md` — removed 2 skill rows, 2 command rows, simplified Bundle B
- `README.md` — removed 2 command rows, simplified Bundle B
- `build.sh` — removed 2 merge_one, 4 skills_needing_args, 8 sedi entries
- `Makefile` — 71→67, 46→42
- `build-core.test.sh` — 71→67, 18→16, removed 2 test -f lines
- `validation.test.sh` — 71→67, 46→42

**Group 3: Verification**
- `make build` ✓
- `make validate` ✓ (all rules pass: 67/42/25)
- Grep verification: zero matches in source
