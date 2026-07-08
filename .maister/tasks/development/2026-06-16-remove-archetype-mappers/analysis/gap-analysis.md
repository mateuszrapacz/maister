# Gap Analysis — Remove Archetype Mappers

## Task Characteristics

| Characteristic | Value | Rationale |
|---------------|-------|-----------|
| has_reproducible_defect | false | Not a bug fix |
| modifies_existing_code | true | Editing problem-classifier, context-distiller, docs, build |
| creates_new_entities | false | Pure removal |
| involves_data_operations | false | No data changes |
| ui_heavy | false | No UI |

## Risk Level

**Low** — Pure removal with well-defined surfaces. All references identifiable via grep. No behavioral logic changes to remaining skills.

## Decisions Needed

### Critical
(none)

### Important
(none — scope is clear from user input: remove both archetype mappers entirely)

## Gap Summary

| Current State | Desired State | Gap |
|---------------|---------------|-----|
| 2 archetype mapper skills exist | Skills removed | Delete 2 skill directories |
| 2 modeling-*-archetype commands exist | Commands removed | Delete 2 command files |
| problem-classifier routes to mappers | No archetype routing | Remove routing table entries + handoff refs |
| context-distiller optional chain to mappers | No mapper chain refs | Remove optional chain refs |
| CLAUDE.md lists mappers in tables + Bundle B | No mapper references | Remove rows, simplify Bundle B |
| README.md lists mapper commands + Bundle B | No mapper references | Remove rows, simplify Bundle B |
| build.sh has merge_one + sedi for mappers | No build entries | Remove 2 merge_one, 4 skills_needing_args, sedi patterns |
| Kiro counts: 71/46 | Kiro counts: 67/42 | Update Makefile + test assertions |

## Integration Points

1. `problem-classifier` — routing table has archetype intent → mapper handoffs
2. `context-distiller` — Recommended next steps mentions mappers as optional chain
3. Bundle B (CLAUDE.md + README.md) — includes mappers in the DDD flow description
4. `build.sh` — merge_one, skills_needing_args, sedi delegation transforms
5. Makefile Rules 14/28 — count assertions
6. Kiro test scripts — count + file existence assertions
