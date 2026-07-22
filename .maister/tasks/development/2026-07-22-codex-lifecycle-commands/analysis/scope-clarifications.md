# Scope Clarifications

> **TL;DR**: The requested behavior is limited to Codex's native Maister utility skills. The canonical portable skill inventory, Cursor projection, removed host builders, and unrelated command behavior remain out of scope.
>
> **Key Decisions**:
> - Include the historical five-command set: `bye`, `dev`, `next`, `resume`, and `status`.
> - Keep workflow state in `.maister/tasks/*/orchestrator-state.yml`.
> - Use Codex host-relative skill names and `$maister:*` references.
>
> **Open Questions & Risks**:
> - Choose the integration boundary at the Phase 2 gate before the specification phase.
> - Confirm parity evidence rules accept target-specific additions.

## In scope

- Codex plugin packaging and overlay materialization for `maister:bye`, `maister:dev`, `maister:next`, `maister:resume`, and `maister:status`.
- Instructions that preserve or report the existing Maister orchestrator state.
- Tests proving the materialized Codex package contains the skills with valid host-relative frontmatter.
- Documentation and target parity evidence required by the repository build.

## Out of scope

- Adding lifecycle utilities to `plugins/maister/skills/` or changing the shared skill inventory.
- Recreating the removed `platforms/codex-cli` or `plugins/maister-codex` builders.
- Changing Cursor's hash-locked projection or Pi's slash-command implementation.
- Implementing a native Codex process termination API that is not exposed by the plugin contract.
- Introducing a second workflow-state format or state database.

## Decision required

The selected boundary is `Codex overlay-only utility skills`. The alternatives—promoting the utilities to common source or restoring the removed host-specific builders—would expand the change beyond the requested Codex support and conflict with the current distribution architecture.
