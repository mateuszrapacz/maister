# Gap Analysis: Wave 2 AJ Skills Adoption (E2 + E3)

**Date:** 2026-06-14  
**Baseline:** Wave 1 complete (3 skills, 3 quick commands, E1 verified)

## Summary

Wave 2 closed 8 gaps: E2 standard, 3 skills, 3 commands, orchestrator soft suggestions, CLAUDE.md, README Bundles C/D, build/CI counts.

## Gaps Closed

| ID | Gap | Resolution |
|----|-----|------------|
| G1 | No `language-md-convention` standard | Created E2 standard + INDEX entry |
| G2 | Missing `test-strategy-reviewer` | Ported with guard, language gate, chain |
| G3 | Missing `linguistic-boundary-verifier` | Ported with graceful degradation |
| G4 | Missing `metaprogram-classifier` | Ported with language gate, grill-me chain |
| G5 | Missing Wave 2 commands | 3 thin Skill wrappers |
| G6 | No ADR-008 soft suggestions | development Phase 5, product-design Phase 1 |
| G7 | CLAUDE.md / README gaps | Bundles C/D + command tables |
| G8 | Kiro counts stale | 63/25/38 after build |

## Deferred (per clarifications)

- Kiro `@` shortcuts for Wave 2 commands
- `implementation-verifier` optional test-strategy mention (8D)
- `language-md-generator` skill

## Verification

- `make build && make validate` — pass
- 3 `disable-model-invocation` on review skills (not metaprogram-classifier)
- 3 ACTION REQUIRED commands
- 3 Recommended next steps sections
