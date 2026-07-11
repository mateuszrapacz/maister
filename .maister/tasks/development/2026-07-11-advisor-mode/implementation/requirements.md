# Requirements: Advisor and Arbiter Mode

## TL;DR
Add opt-in gate decision automation without weakening user control over unsafe decisions or implementation changes.
Every gate decision must be durable, inspectable, retry-aware, and resumable.
The final workflow must expose the complete decision context in Markdown and HTML.

## Key Decisions
- Preserve manual behavior by default — backward compatibility is mandatory.
- Use one configurable policy per gate type — keeps routing predictable.
- Require explicit implementation approval — analysis automation cannot mutate source.

## Open Questions / Risks
- Platform-specific auto-answer support needs runtime smoke tests; the contract must stop safely when unavailable.

## Functional Requirements

1. Seed an `advisor` configuration block from `.maister/config.yml` into `orchestrator.options.advisor`.
2. Support `manual`, `advisor`, and `fully_automatic` policies per stable gate type.
3. Invoke a read-only advisor with the complete gate and workflow context.
4. Validate structured responses: `selected_option`, `rationale`, `confidence`, `escalate_to_user`.
5. Retry advisor and arbiter calls with independent attempt limits and configurable backoff.
6. Run one independent arbiter when the advisor disagrees with the original recommendation.
7. Keep the denylist non-overridable and fail closed on ambiguity, low confidence, invalid output, or exhausted retries.
8. Persist the full decision record after every decision and before any phase transition.
9. Block implementation execution until `implementation_approval.status: approved` is present in state.
10. Generate `outputs/decision-summary.md` and, when enabled, `outputs/decision-summary.html` for all terminal statuses.

## Non-Functional Requirements

- Source-only changes under `plugins/maister/`, plus platform build scripts/templates.
- No secrets or model API keys in configuration.
- Generated variants must pass `make build` and `make validate`.
- Resume must reconstruct the next action from `orchestrator-state.yml`, not dashboard data.
