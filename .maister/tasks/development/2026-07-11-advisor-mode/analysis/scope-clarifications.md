# Scope Clarifications

## TL;DR
Scope covers the shared contract, five orchestrators, initialization, agent permissions, durable state, implementation approval, and final reports.
It does not include a custom model proxy or a universal runtime implementation of synthetic answers.

## Key Decisions
- Source of truth remains `plugins/maister/`; generated platform variants are rebuilt — avoids drift.
- Advisor and arbiter are read-only and write only state/audit artifacts through the orchestrator — preserves user control.

## Open Questions / Risks
- Native runtime support for fully automatic gate injection must be verified per platform in later smoke tests.

## Included

- Configurable per-gate policy and model/agent routing.
- Hard denylist and retry/backoff.
- Durable gate history and dashboard visibility.
- Explicit implementation approval guard.
- Final Markdown and HTML decision summaries for success, blocked, and failed workflows.

## Excluded

- Custom API proxy or model service.
- Automatic rollback.
- Advisor as a replacement for the main executor.
- Manual edits to generated `plugins/maister-*` variants.
