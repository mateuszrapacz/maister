# Phase 1 Clarifications

**Date:** 2026-06-13

## Resolved from Research (no user input required)

Research task `2026-06-09-architekt-jutra-skills-analysis` with accepted ADRs provides binding decisions:

| Topic | Resolution |
|-------|------------|
| Scope | Wave 1 only (E1): requirements-critic, transcript-critic, problem-classifier |
| Packaging | Individual skills + "Recommended next steps" chain sections (ADR-001) |
| Commands | Category-aligned `quick-*` commands for all 3 skills (ADR-002) |
| Critics invocation | `disable-model-invocation: true` on requirements-critic and transcript-critic (ADR-008) |
| Orchestrator changes | None in Wave 1 — standalone only (ADR-008) |
| aggregate-designer chain | Stub/defer until Wave 3 — problem-classifier ships with conditional chain text |
| CLAUDE.md backfill | Include grill-me, thermos, thermo-nuclear-* plus Wave 1 skills/commands |
| Source edits | `plugins/maister/` only; `make build && make validate` |
| AJ source | Read-only reference at `/Users/mrapacz/Projects/architekt-jutra-code` |

## Assumptions (pending Phase 2 gate confirmation)

1. **Skill naming:** Plain kebab names (`requirements-critic`) matching grill-me/thermos, not `maister:` prefix in skill frontmatter
2. **Command pattern:** Thin wrappers with ACTION REQUIRED + Skill tool (hybrid of reviews-code + work patterns)
3. **Bilingual bodies:** Preserve PL/EN content from AJ source; English-primary frontmatter descriptions
4. **Build count updates:** Kiro Makefile/tests updated from 26→32 skill directories

## Open Questions

None blocking Phase 2 — deferred to Phase 2 decision gate if gap-analyzer surfaces new scope decisions.
