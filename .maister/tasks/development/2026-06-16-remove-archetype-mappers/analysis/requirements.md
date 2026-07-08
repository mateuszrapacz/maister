# Requirements — Remove Archetype Mappers

## User Request

"Wywal te accounting-archetype-mapper oraz pricing-archetype-mapper. to sa przykladowe jakie archetypy"

Translation: Remove accounting-archetype-mapper and pricing-archetype-mapper — they are just examples of what archetypes exist.

## Functional Requirements

1. **Delete skill directories**: `plugins/maister/skills/accounting-archetype-mapper/`, `plugins/maister/skills/pricing-archetype-mapper/`
2. **Delete command files**: `plugins/maister/commands/modeling-accounting-archetype.md`, `plugins/maister/commands/modeling-pricing-archetype.md`
3. **Remove cross-references** in `problem-classifier/SKILL.md` — archetype intent routing and handoff mentions
4. **Remove cross-references** in `context-distiller/SKILL.md` — optional archetype mapper chain refs in Recommended next steps
5. **Update CLAUDE.md** — remove 2 skill rows from Requirements & Modeling Skills, 2 command rows from Modeling Commands, simplify Bundle B (remove mapper refs)
6. **Update README.md** — remove 2 command rows, simplify Bundle B
7. **Update build pipeline** — remove 2 merge_one entries, 4 skills_needing_args entries, sedi patterns for both mappers from `build.sh`
8. **Update counts** — Makefile 71→67, 46→42; build-core.test.sh 71→67, 18→16; validation.test.sh 71→67, 46→42
9. **Regenerate** — `make build && make validate` must pass

## Scope Boundaries

- Do NOT remove `context-distiller` or `aggregate-designer` — those remain
- Do NOT touch generated variants manually — they regenerate via `make build`
- Bundle B simplifies but still includes: classifier → distiller → aggregate-designer → verifier flow
- `plugin-development.md` — `modeling-*` category stays (context-distiller and aggregate-designer commands still exist)

## Reusability

No new code needed. Pure deletion + reference cleanup.
