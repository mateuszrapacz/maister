# Technical Clarifications

## Outcome

No additional technical-choice gate is needed in Phase 5.
The referenced high-confidence research already selected the binding architecture and Phase 2 found no unresolved critical or important scope decision.

## Binding decisions

- A3: shared executable gate evaluator behind a read-only host role port.
- B1: evaluator owns the complete pending-to-terminal gate record.
- C1: workflow owns durable work inventory, outbox, dispatch receipt, and receiver deduplication.
- D1: a thin Codex binding maps the result to `continue`, `user_gate`, or `blocked` within the active turn.
- Codex capability remains `unsupported` until a real host-native E2E exits successfully.

## Revisit condition

Return to scope clarification only if an implementation spike disproves the existence of a viable Codex active-turn hook for D1.
