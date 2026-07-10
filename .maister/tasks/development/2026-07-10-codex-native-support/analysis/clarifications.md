## TL;DR

Research provides enough direction to implement without expanding scope.
The MVP targets native Codex plugin packaging and functional workflow parity.
Runtime Codex authentication and optional custom-agent installation are deferred.

## Key Decisions

- Use native skills, hooks, MCP, and a repo marketplace.
- Transform commands into skills and rewrite Claude/Cursor-only references.
- Omit custom agent files and model pinning.

## Open Questions / Risks

- Exact runtime behavior of plugin hook trust and installed-cache refresh should be checked in a configured Codex environment.

## Clarifications

1. The research folder is the task input and is copied to `analysis/research-context/`.
2. The implementation must preserve the source-of-truth/generated-variant boundary.
3. A structural smoke test is required; live authenticated Codex smoke is not required for this MVP session.
