# Phase 1 Clarifications

## TL;DR
The user confirmed the research-approved implementation scope.
The supported targets are Codex, Cursor, and Kiro CLI; Claude and committed generated trees are migration-only and must be removed before completion.
Legacy builders may remain temporarily as parity oracles during implementation.

## Key Decisions
- Confirm the complete research-approved migration scope before gap analysis.

## Open Questions / Risks
- Exact deletion and parity criteria remain implementation-planning concerns and must be made testable before legacy removal.

## Clarification Record

**Question:** I assume the implementation scope is Codex, Cursor, and Kiro CLI only, with Claude and committed generated trees removed before completion. Is that correct?

**Answer:** Confirm assumptions

**Confirmed scope:**

- Build one portable common source and one shared core test surface.
- Maintain explicit repository-owned overlays for Codex, Cursor, and Kiro CLI.
- Materialize and install a selected target from a local checkout or immutable GitHub source reference.
- Add transactional staging, validation, receipt ownership, settings handling, atomic commit, recovery, update, uninstall, and rollback.
- Use current generated trees/builders only as temporary comparison oracles.
- Remove Claude support, generated trees, and obsolete generation/drift infrastructure before task completion.
