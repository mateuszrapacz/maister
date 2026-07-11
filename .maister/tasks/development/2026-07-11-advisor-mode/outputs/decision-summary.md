# Decision Summary: Advisor and Arbiter Mode

## TL;DR
The implementation follows the approved advisor-led gate model with one arbiter on disagreement.
Policies are configurable per gate type, but the safety denylist and implementation approval remain user-controlled.
All decisions are designed to persist in `orchestrator-state.yml` and be resumable.
The implementation is validated structurally across all five generated platform variants and by live Cursor/Kiro smoke checks.

## Key Decisions
- Default all gates to `manual` — preserves backward compatibility.
- Support `manual`, `advisor`, and `fully_automatic` policies per gate type — makes automation explicit and configurable.
- Run one independently configured arbiter on disagreement — resolves competing recommendations without an unbounded loop.
- Require explicit `implementation_approval.status: approved` before source changes — advisors cannot implement autonomously.
- Generate Markdown and HTML decision summaries — keeps the full context inspectable after completion or failure.

## Open Questions / Risks
- Fully automatic synthetic gate-answer injection remains platform-runtime dependent.
- Live model pinning and headless behavior require platform-specific smoke tests.

## Decision Context

This implementation was based on `.maister/tasks/research/2026-07-11-advisor-mode-option/outputs/research-report.md` and the confirmed requirements from the grill-me session. The complete runtime decision record is written by orchestrators to `orchestrator.gate_history[]`; this task summary records the approved design and verification result.

## Approved Behavior

1. Advisor receives the full read-only gate context.
2. Agreement with the original recommendation advances a configured safe gate.
3. Disagreement launches one arbiter with its own optional model.
4. Interactive mode presents both recommendations and the arbiter result to the user.
5. Fully automatic mode may accept a valid arbiter result only for non-denylisted gates.
6. Invalid, low-confidence, unavailable, or exhausted-retry results fail closed.
7. Every decision is persisted before the workflow continues.
8. The implementation executor is blocked until explicit user approval.

## Verification

`make build` and `make validate` passed for Copilot, Cursor, Kiro, Kilo, and Codex. Cursor runtime smoke passed; Kiro runtime smoke passed 4/4 scenarios. Live advisor recommendation, disagreement/arbiter, denylist escalation, and read-only boundary checks passed. Kiro build-completion and E2E matrix tests passed 8/8 each after updating the expected inventory to 30 agents.

## Follow-up Completion — Groups 0–6

The approved follow-up is complete. The shared engine contract now governs every documented gate call site, terminal decisions are persisted before continuation, and resume reuses terminal idempotency records. Host adapters explicitly map advisor, arbiter, user-gate, state, resume, and fail-closed capabilities.

Validation completed at `2026-07-11T21:37:54Z`: `make build`, `make validate`, 15/15 deterministic engine checks, Cursor smoke, Kiro smoke 4/4, Kiro build completion 8/8, Kiro E2E matrix 8/8, and `git diff --check` all passed.

## Executable Continuation Fix

At `2026-07-11T22:07:03Z`, the workflow gained the executable
`phase-continue.rb` adapter. It validates exact options and confidence, rejects
denylisted gates, writes state atomically, generates Markdown/HTML reports,
advances the phase, and returns a `phase_continue` result. The integration test
also verifies terminal idempotent reuse and that implementation approval cannot
be auto-granted.
