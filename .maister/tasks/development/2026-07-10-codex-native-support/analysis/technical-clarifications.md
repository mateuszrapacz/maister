## TL;DR

The selected architecture is a native-first generated variant with semantic transforms.
It avoids copying incompatible Claude/Cursor components while preserving Maister's workflow content.

## Key Decisions

| Decision | Selected approach | Rationale |
|---|---|---|
| Entrypoints | Skills | Codex plugin manifests package skills, not a separate command component. |
| Agent parity | Functional/native delegation | Custom agent TOML is a separate installation surface and the research excludes it from MVP. |
| State | `orchestrator-state.yml` | Native Goal/Plan are UX aids, not a replacement for Maister's phase graph. |
| Models | Host/session controlled | Avoid stale model slugs and unexpected cost/latency changes. |
| Hooks | Codex-specific generated scripts | Claude hook schema and environment names are not a safe copy target. |

## Open Questions / Risks

- Future named role profiles may need an opt-in `.codex/agents/*.toml` bootstrap.
