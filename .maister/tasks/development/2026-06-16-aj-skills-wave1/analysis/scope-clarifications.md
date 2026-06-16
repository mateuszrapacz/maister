# Scope Clarifications

**Date:** 2026-06-16  
**Status:** Resolved at Phase 2 gate

## User Decisions

| Decision | Choice |
|----------|--------|
| ADR-008 orchestrator scope | **Keep** soft suggestions in `development` and `product-design` as intentional Wave 1 inclusion |
| Task framing | **Verification-first** — close E1 after evidence; minimal code changes |
| AJ rubric fidelity | **Full semantic diff** against AJ week8 source |
| E2E smoke | Not selected — out of scope unless raised in spec |
| problem-classifier `disable-model-invocation` | Default (keep as-is; not explicitly changed) |

## Scope Boundaries

### In scope
- Verify Wave 1 E1 acceptance criteria against existing `plugins/maister/` implementation
- AJ vs Maister rubric fidelity diff (transcript-critic, requirements-critic, problem-classifier)
- `make build && make validate` evidence
- Document ADR-008 as intentional (update decision log note if needed)
- Fix any gaps found during verification (minimal diffs only)

### Out of scope
- Greenfield re-port from AJ
- Wave 2+ skills (metaprogram-classifier already exists separately)
- Meta-orchestrator
- Editing generated platform variants directly
- E2E browser testing (user did not select)

## Skipped Phases

| Phase | Reason |
|-------|--------|
| 3 TDD Red | `has_reproducible_defect: false` |
| 4 UI Mockups | `ui_heavy: false` |
| 9 TDD Green | Phase 3 skipped |
