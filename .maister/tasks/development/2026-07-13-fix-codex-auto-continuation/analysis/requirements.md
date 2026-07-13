# Requirements

## Initial description

Repair Codex `fully_automatic` so agreement between the main recommendation and advisor selects automatically, disagreement invokes exactly one logical arbiter, and the terminal result automatically continues to the next problem without user interaction.

## Confirmable assumptions

### User journey

Confirmed: the repair is transparent to Maister workflow users. They access it through existing `maister:*` workflows, with no new command or UI, and eligible automatic gates continue within the active Codex turn.

### Existing code reuse

Confirmed: extend the canonical orchestrator framework, shared state/continuation runtime, existing build projections, host capability matrix, and contract-test patterns. Keep Codex-specific code to a thin binding; do not create a separate Codex-only evaluator.

### Visual assets

Confirmed: there are no mockups, wireframes, screenshots, or other visual assets. Phase 4 was skipped because the task has no UI surface, and the specification contains no visual implementation requirements.

## Q&A record

- **User journey:** Confirmed transparent access through existing `maister:*` workflows, with no new command or UI and continuation inside the active Codex turn.
- **Existing code reuse:** Confirmed canonical shared framework/runtime, projections, capability matrix, and contract-test reuse with only a thin Codex binding.
- **Visual assets:** Confirmed none; no visual implementation requirements.

## Functional requirements summary

- Agreement terminates with actor `advisor`, zero arbiter calls, zero user gates, and automatic continuation.
- Disagreement creates one logical arbiter identity; bounded retries remain attempts of that same arbiter.
- Terminal provenance is persisted before reports, cursor changes, or dispatch.
- Same-phase and next-phase continuation use stable target and dispatch identifiers with durable acknowledgement and receiver deduplication.
- Invalid state, unsafe gates, unsupported capability, exhausted roles, or failed commits stop fail-closed without advancing work.
- Canonical state migration and all writers preserve transactional state integrity.
- Generated host variants remain projections of canonical sources.
- Capability status changes only after real Codex-native evidence succeeds.

## Scope boundaries

- No product-design backward refinement.
- No automation of protected or denylisted gates.
- No new user interface.
- No daemon, service, or database.

## Technical considerations

See [technical clarifications](technical-clarifications.md), [gap analysis](gap-analysis.md), and the imported [high-level design](research-context/high-level-design.md).
