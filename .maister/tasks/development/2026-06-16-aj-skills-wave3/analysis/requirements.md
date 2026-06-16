# Requirements — AJ Skills Wave 3 (Epic E4)

**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave3`  
**Date:** 2026-06-16

## Initial Description

Implement Epic E4 (Wave 3) from architekt-jutra skills research: port `context-distiller`, `aggregate-designer`, `accounting-archetype-mapper`, and `pricing-archetype-mapper` into `plugins/maister/` as standalone on-demand skills with category-aligned `modeling-*` commands.

## Q&A — Phase 2 Gate

| Question | Answer |
|----------|--------|
| Language gates on all 4 skills? | Yes — Wave 2 convention |
| Mappers as Wave 3 live in problem-classifier? | Yes |
| Continue to specification? | Yes |

## Q&A — Phase 5 Requirements

| Question | Answer |
|----------|--------|
| User journey / discovery | Architects via `/maister:modeling-*` commands and Skill tool; chain from `problem-classifier` |
| Reuse pattern | Mirror Wave 1–2 port pattern exactly |
| Visual assets | None — rubric-only DDD wizard skills |

## Similar Features to Reference

| Feature | Path | Reuse |
|---------|------|-------|
| Wave 1 port | `plugins/maister/skills/problem-classifier/SKILL.md` | Frontmatter, invocation guard, chain section, language gate |
| Wave 2 port | `plugins/maister/skills/metaprogram-classifier/SKILL.md` | Language gate, Recommended next steps |
| Thin command | `plugins/maister/commands/quick-problem-classifier.md` | Delegation pattern |
| Review command | `plugins/maister/commands/reviews-test-strategy.md` | Read-only vs modeling naming |
| Wave 2 work log | `.maister/tasks/development/2026-06-14-aj-skills-wave2-adoption/implementation/work-log.md` | Port checklist, Kiro updates |

## AJ Source Files

| Skill | AJ Path |
|-------|---------|
| context-distiller | `/Users/mrapacz/Projects/architekt-jutra-code/week7/4-uogolnienie-demo/context-distiller/SKILL.md` |
| aggregate-designer | `/Users/mrapacz/Projects/architekt-jutra-code/week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md` |
| accounting-archetype-mapper | `/Users/mrapacz/Projects/architekt-jutra-code/week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md` |
| pricing-archetype-mapper | `/Users/mrapacz/Projects/architekt-jutra-code/week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md` |

## Functional Requirements Summary

### FR-1: Port 4 skills
- Create `plugins/maister/skills/<kebab>/SKILL.md` for each skill
- Strip `maister:` prefix from frontmatter `name`
- English-primary `description`; preserve bilingual body (ADR-007)
- Add invocation guard + Language Preference gate (user confirmed)
- Fix AJ typo `problem-class-classifier` → `problem-classifier`
- Add `## Recommended next steps` chain sections per ADR-001
- Normalize cross-refs to plain kebab skill names

### FR-2: Create 4 modeling-* commands
- `modeling-context-distiller`, `modeling-aggregate-designer`, `modeling-accounting-archetype`, `modeling-pricing-archetype`
- Thin wrappers delegating via Skill tool (ADR-002)

### FR-3: Activate cross-ref stubs
- `problem-classifier`: remove Wave 3/4 deferrals for aggregate-designer and both mappers
- `linguistic-boundary-verifier`: activate context-distiller refs (remove "not yet available")

### FR-4: Documentation
- CLAUDE.md: 4 skill rows, Bundle B flow, Modeling Commands table
- README.md: command rows + Bundle B
- `plugin-development.md`: document `modeling-*` category

### FR-5: Build pipeline
- `platforms/kiro-cli/build.sh`: merge_one (×4), skills_needing_args, Wave 3 sedi block
- Makefile: Rule 14 (63→67), Rule 28 (38→42)
- Kiro tests: update expected counts + merged command checks
- `make build && make validate` must pass

## Scope Boundaries

**In:** E4 Wave 3 only  
**Out:** archetype-scanner (E5), research --gather-only (E6), orchestrator changes, language-md-generator

## Technical Considerations

- Edit only `plugins/maister/` (+ `platforms/kiro-cli/` for build transforms)
- Never edit generated variants directly
- No `disable-model-invocation` on interactive modeling wizards (unlike critique skills)
- Chains are documentation-only — no orchestrator state (ADR-001, ADR-008)

## Research ADRs Applied

- ADR-001: Individual skills + chain sections
- ADR-002: modeling-* commands
- ADR-003: Strict Wave 3 in sequence
- ADR-007: Bilingual bodies + language gates
