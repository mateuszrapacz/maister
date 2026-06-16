# Scope Clarifications — Wave 3 (Epic E4)

**Date:** 2026-06-16  
**Status:** Resolved at Phase 2 gate

## User Decisions

| Decision | Choice |
|----------|--------|
| Language preference gates on all 4 Wave 3 skills | **Yes** — consistent with Wave 2 |
| Mapper wave numbering in problem-classifier | **Wave 3 live** — activate accounting + pricing mapper refs |
| Continue to specification | **Yes** |

## Scope Boundaries

**In scope:**
- 4 skills: context-distiller, aggregate-designer, accounting-archetype-mapper, pricing-archetype-mapper
- 4 commands: modeling-context-distiller, modeling-aggregate-designer, modeling-accounting-archetype, modeling-pricing-archetype
- Cross-ref activation in problem-classifier, linguistic-boundary-verifier
- Bundle B in CLAUDE.md + README
- modeling-* category in plugin-development.md
- Kiro build.sh, Makefile, test counter updates
- make build && make validate gate

**Out of scope:**
- archetype-scanner (Wave 4 / E5)
- Orchestrator phase changes (development/product-design)
- E6 research --gather-only
- language-md-generator skill
