# Research Brief: Issue Tracker Workflow for Maister

## TL;DR
Research a provider-based issue intake layer for Maister that supports local Markdown and external trackers, makes capturing work fast, and lets any saved issue become input to a normal Maister workflow. Preserve `orchestrator-state.yml` as workflow execution state rather than turning it into a backlog. Use the installed `mattpocock/skills` conventions as a concrete comparison point.

## Key Decisions
- Treat issue tracking as persistent work intake, separate from workflow execution state — the existing orchestrator state becomes authoritative only after a workflow starts.
- Evaluate a small common provider contract plus capability discovery — tracker-specific features should remain available without contaminating core workflows.

## Open Questions / Risks
- The provider abstraction must not erase tracker-specific capabilities or leak credentials.
- Local Markdown needs stable identifiers and concurrency-safe writes if it is to behave like a real tracker.

## Research Question

How should Maister add configurable issue-tracker providers, fast task capture, and issue-to-workflow handoff while reusing good ideas from `mattpocock/skills`?

## Scope

Included:

- Existing Maister commands, workflow state, task directories, and platform adapters.
- Installed `mattpocock/skills` tracker configuration, ticket creation, triage, and implementation handoff.
- Local Markdown, GitHub Issues, and an extensible provider seam for future trackers.
- Capture, list/show/select, and handoff UX for research, planning, and development.
- Testing, migration, security, offline behavior, and cross-platform generation.

Excluded:

- Implementing the feature during this research workflow.
- Selecting or configuring a tracker for this repository.
- Building a hosted issue-tracking product.

## Success Criteria

1. Document the current Maister intake and resume model with exact integration seams.
2. Compare at least three architecture options and identify their trade-offs.
3. Define a recommended provider contract and canonical issue reference format.
4. Specify the minimum commands and end-to-end user journeys.
5. Explain how saved issues feed `$maister:research`, `$maister:quick-plan`, and `$maister:development` without duplicating sources of truth.
6. Identify a migration path, test strategy, and platform-specific risks.
7. Produce an implementation-ready recommendation suitable for a later development workflow.
