# Clarifications

## TL;DR
The approved behavior is advisor-led gate resolution with explicit arbitration on disagreement.
Safe gate types may advance automatically; dangerous gates remain user-controlled regardless of configuration.
Implementation is separately protected by a final user approval gate.

## Key Decisions
- Gate policy is configurable per gate type with `manual`, `advisor`, and `fully_automatic` — default remains manual.
- A disagreement launches one independent arbiter; the user decides in interactive mode, while fully automatic mode uses the arbiter for safe gates.
- Invalid, low-confidence, or exhausted-retry responses fail closed — interactive mode falls back to the user, fully automatic mode stops.
- Full decision history and final summaries are required — interruption and resume must not lose context.

## Open Questions / Risks
- Exact host-specific synthetic-answer adapters remain a platform integration risk.

## Confirmed Requirements

1. Advisor receives the question, all options, original recommendation, dashboard, relevant artifacts, phase summaries, and gate history in read-only context.
2. If the advisor agrees with the original recommendation, a configured safe gate continues automatically.
3. If the advisor disagrees, a second advisor/arbiter compares both recommendations.
4. The hard denylist cannot be overridden by `fully_automatic`.
5. Retry count and backoff are configurable independently for advisor and arbiter.
6. The user receives a complete decision summary in Markdown and HTML, including blocked and failed terminal states.
7. No agent may implement source changes before explicit user approval of the complete implementation scope.
