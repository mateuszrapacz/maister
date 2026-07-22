# Requirements

> **TL;DR**: Add five Codex-native Maister skills—`bye`, `dev`, `next`, `resume`, and `status`—to the Codex overlay. They must be discoverable as `$maister:<command>`, reuse the existing orchestrator state and historical lifecycle behavior, and leave other host projections unchanged.
>
> **Key Decisions**:
> - Users access the feature through Codex skill invocation, not through a new launcher subcommand.
> - `orchestrator-state.yml` is the only workflow-state source.
> - The implementation reuses the current overlay materializer, historical Codex skill behavior, and Cursor as a compatibility reference.
>
> **Open Questions & Risks**:
> - The assumptions below are awaiting the Phase 5 requirements gate.
> - The parity baseline and materialized package must prove that the new target-specific files are intentional.

## Initial description

Add support for `maister:bye`, `maister:resume`, `maister:status`, and related Maister lifecycle shortcuts for Codex in the same spirit as the existing Cursor support.

## Requirements assumptions for confirmation

### User journey

1. A Codex user invokes `$maister:bye`, `$maister:dev`, `$maister:next`, `$maister:resume`, or `$maister:status` directly from a Codex conversation.
2. `dev` forwards to `$maister:development` and preserves the supplied task description or task path.
3. `next` suggests one action without starting a workflow; `status` reports state without starting or resuming one; `resume` continues the existing workflow from persisted state; `bye` records a safe handoff without falsely completing active work.

### Existing code reuse

- Reuse `plugins/maister/lib/distribution/materializer.mjs` tree merging and the Codex overlay contract.
- Reuse `.maister/tasks/*/orchestrator-state.yml` and the orchestrator framework's state terminology.
- Use the historical Codex implementation and the Cursor projection as behavioral references, adapted to current Codex-relative frontmatter names.

### Visual assets

This is not a UI-heavy task. No mockups, screenshots, or visual assets are required.

## Functional requirements

- Materialize exactly five new Codex skill directories under `skills/`.
- Expose each skill with frontmatter names `bye`, `dev`, `next`, `resume`, and `status`.
- Keep commands Codex-native: references to Maister skills use `$maister:<name>`.
- `bye` preserves current workflow state and summarizes completed and remaining work; it must not mark in-progress work complete.
- `dev` delegates to `$maister:development` with the original task input.
- `next` reads the active task's `orchestrator-state.yml` and suggests exactly one next action without executing it.
- `resume` reads persisted state, determines the first incomplete phase when needed, and invokes the matching workflow with the task path and phase continuation context.
- `status` reports active workflow, phase, completed/failed phases, blockers, pending gates, and the next incomplete action without changing state.
- No new persistent state format, host builder, or common-source skill is introduced.

## Non-functional requirements

- Overlay materialization is deterministic and merge-safe.
- The Codex package remains free of Cursor/Claude-specific paths and vocabulary.
- Existing Cursor projection checks and unrelated host inventories remain unchanged.
- Tests assert observable materialized package contents and frontmatter, not private implementation details.
- Documentation explains the Codex command surface and the read-only/state-preserving behavior.

## Scope boundaries

In scope: Codex overlay assets, overlay merge entry, parity/evidence updates, focused package test, and command documentation.

Out of scope: common portable skills, Pi slash-command aliases, Cursor projection bytes, removed host-specific builders, native process termination, and UI changes.

## Technical considerations

- Codex's plugin namespace supplies the `maister:` prefix; skill frontmatter must therefore use host-relative names.
- The new asset tree must be added with `merge: true` so it coexists with `common/skills`.
- Legacy parity rules currently classify these five historical paths as expected deletions; those rules must be reconciled after materialization is implemented.
