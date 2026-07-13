# Phase 1 Clarifications

## TL;DR

The completed research resolves the architectural direction and implementation boundaries for this development workflow.
No critical clarification remains before gap analysis: implement A3/B1/C1/D1 in canonical sources, preserve protected/manual gates, and keep Codex capability unsupported until real host-native E2E evidence passes.

## Key Decisions

- Treat the problem as a reproducible runtime defect plus an architectural enhancement of existing workflow infrastructure — the configured `fully_automatic` path currently falls back to user gates and cannot dispatch subsequent work.
- Keep evaluator selection, runner commit/projection, workflow routing, and Codex active-turn transport as separate responsibilities — this is the accepted research architecture.
- Include schema migration, lock/revision/CAS, durable work-item dispatch receipts, five workflow call-site migrations, generated projections, and layered verification in scope — each is required by the accepted end-to-end behavior.
- Exclude product-design backward refinement and any weakening of denylisted/manual gates — both are outside the researched repair.
- Leave Codex capability `unsupported` until the native Codex E2E exits `0` and proves agreement, one logical arbiter on disagreement, no UI, same-phase continuation, next-phase entry, resume, and deduplication.

## Open Questions / Risks

- The exact Codex active-turn/headless binding is an implementation spike within the accepted D1 boundary; a negative empirical result may require returning to scope clarification before considering a different transport.
- The final schema-v2 serialization must be validated against real workflow snapshots and may expose migration details not resolved by research.

Generated: `2026-07-13T18:00:05Z`

## Assumptions Confirmed from Research

1. The canonical editable runtime lives under `plugins/maister/`; Codex-specific transport belongs under `platforms/codex-cli/`.
2. Generated plugin variants are build outputs and will only be changed through `make build`.
3. The shared evaluator owns the complete pending-to-terminal decision record and exactly-one-logical-arbiter behavior.
4. The runner verifies and projects a persisted terminal decision; it does not choose an option or dispatch domain work.
5. Each workflow owns stable work-item inventory and routing; shared helpers may validate IDs, outbox entries, and receipts.
6. Logical exactly-once is achieved through deterministic `dispatch_id` values and receiver deduplication, while physical retries remain possible.
7. Unsupported capability, denylist, low confidence, escalation, retry exhaustion, or persistence failure remain fail-closed.

## Clarification Status

`clarifications_resolved: true` for Phase 1. Remaining unknowns are implementation discoveries covered by the planned spike and verification gates, not missing product or scope decisions.
