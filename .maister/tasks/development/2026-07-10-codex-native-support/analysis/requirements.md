## TL;DR

The deliverable is a native Codex plugin generated from the existing Maister source tree.
It must preserve public workflow discoverability, keep internal roles functional through native delegation, and remain safe to rebuild.
Repository docs and structural validation are part of the feature.

## Key Decisions

- Public skill names use `maister-*` and command wrappers become skills with the same prefix.
- Codex-specific native contracts are generated rather than hand-edited in output.
- Host/session controls model, sandbox, approval policy, and reasoning effort.

## Open Questions / Risks

- Runtime compatibility can only be confirmed with a Codex installation and trusted hooks.

## Functional Requirements

1. `make build-codex` generates a complete Codex plugin.
2. The manifest uses `.codex-plugin/plugin.json` and points to skills, MCP, and hooks.
3. All 29 source skills are emitted with Codex-safe names.
4. All 14 source command wrappers are emitted as skill entrypoints.
5. Claude/Cursor-only identifiers are removed from generated skill markdown.
6. No `plugins/maister/agents/*.md` are copied into the Codex plugin.
7. Codex MCP uses the supported `mcp_servers` wrapper.
8. Codex hooks use `PLUGIN_ROOT` and Codex hook output contracts.
9. The destructive-command hook remains defense-in-depth and does not change host security policy.
10. `.agents/plugins/marketplace.json` exposes the generated plugin as a local entry.
11. `make build` includes Codex.
12. `make validate` includes Codex structural smoke validation.
13. Generated-variant CI checks Codex drift.
14. README and platform documentation explain installation, limits, models, hooks, and subagents.
15. The plugin does not pin a model or reasoning effort.
