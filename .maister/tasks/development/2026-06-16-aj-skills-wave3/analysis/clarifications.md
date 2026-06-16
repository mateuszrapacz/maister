# Clarifications — Wave 3 (Epic E4)

**Date:** 2026-06-16  
**Status:** Resolved via codebase analysis + research ADRs (no blocking questions)

## Confirmed Assumptions

1. **Scope:** Epic E4 only — 4 skills + 4 `modeling-*` commands; Wave 4 (`archetype-scanner`) out of scope.
2. **AJ source:** `/Users/mrapacz/Projects/architekt-jutra-code/week7/` — all 4 SKILL.md files available.
3. **Port pattern:** Follow Waves 1–2 conventions (plain kebab names, invocation guards, language gates, thin commands, chain sections).
4. **Cross-ref activation:** Update `problem-classifier` and `linguistic-boundary-verifier` stubs from "not yet ported" to live refs.
5. **Build:** `make build && make validate` mandatory; Kiro counts 63→67 skills, 38→42 `maister-*`.
6. **No orchestrator changes:** ADR-001 — chains are documentation only.

## Open Items (non-blocking — deferred to Phase 2 gate)

- Language preference gates on all 4 interactive skills (default: yes, Wave 2 convention)
- Manual smoke scope (default: one modeling command per skill)
- Mapper wave numbering alignment in `problem-classifier` (default: Wave 3 live)
