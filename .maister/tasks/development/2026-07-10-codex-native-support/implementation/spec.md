## TL;DR

Build a generated `plugins/maister-codex/` package using Codex-native manifest, skills, hooks, MCP, and marketplace contracts.
Transform all source skills and commands while omitting Claude-style custom agent files.
Integrate the build into Make and generated-variant CI, and document installation and boundaries.

## Key Decisions

1. Source remains `plugins/maister/`; Codex-specific behavior lives under `platforms/codex-cli/`.
2. Generate 43 skill directories: 29 source skills plus 14 command-derived entrypoints.
3. Use native subagent delegation instructions without bundling `.codex/agents/*.toml`.
4. Keep `orchestrator-state.yml` authoritative and leave model selection to the host.
5. Add a local repo marketplace entry at `.agents/plugins/marketplace.json`.

## Open Questions / Risks

- Live installation, hook trust, MCP startup, and authenticated subagent execution are not covered by structural CI.

## Scope

Included: build script, Codex hooks, MCP conversion, generated plugin, local marketplace, Make targets, drift CI, README/docs, and structural smoke checks.

Excluded: app-server orchestration, model pinning, automatic custom-agent bootstrap, and a required authenticated runtime smoke test.

## Acceptance Criteria

- `make build` succeeds for all variants.
- `make validate` succeeds for all variants.
- `make validate-codex` verifies manifest, skill inventory, names, native transform bans, MCP, hooks, and no bundled custom agents.
- Generated output is reproducible from `make build-codex`.
- Public workflow entrypoints are discoverable as `$maister-*` skills.
- Documentation explains local marketplace installation, new-session refresh, hook trust, sandbox/approval boundaries, and host-controlled models.
