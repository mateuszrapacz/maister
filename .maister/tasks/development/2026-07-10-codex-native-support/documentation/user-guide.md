## TL;DR

Build and validate the native Codex plugin with `make build-codex` and `make validate-codex`.
Install it through the repository marketplace, then start a new Codex session.
Review/trust hooks and keep sandbox/approval policy as the primary safety boundary.

## Key Decisions

- Use `$maister-development` and other `maister-*` skills.
- Configure models and reasoning in Codex, not in the plugin.
- Treat `orchestrator-state.yml` as the authoritative workflow state.

## Open Questions / Risks

- Live Codex runtime smoke testing remains a deployment follow-up.

## Quick Start

```bash
make build-codex
make validate-codex
codex plugin marketplace add .
```

Install `maister-codex` from the Codex plugin browser and start a new session.
Read the full guide at `docs/codex-support.md`.
