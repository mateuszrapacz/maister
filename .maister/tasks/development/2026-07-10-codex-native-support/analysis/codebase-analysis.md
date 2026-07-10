## TL;DR

The repository uses `plugins/maister/` as source of truth and platform-specific Bash transforms to produce committed variants.
Codex needs a semantic transform because it packages skills, hooks, MCP, and marketplace metadata but not Claude/Cursor-style command and agent trees.
Validation is structural and Make-driven; no application test framework is present.

## Key Decisions

- Add `platforms/codex-cli/build.sh` as the only generator for `plugins/maister-codex/`.
- Keep Codex-specific hooks in `platforms/codex-cli/hooks/` rather than changing Claude hook source.
- Add the Codex variant to the generated-drift check and Make build/validate/clean targets.

## Open Questions / Risks

- A live Codex install/trust/subagent smoke test requires a configured Codex environment and was not available in this session.

## Findings

Relevant source boundaries:

- `plugins/maister/skills/`: 29 source skills, including public orchestrators and internal engines.
- `plugins/maister/commands/`: 14 thin public wrappers that need Codex skill entrypoints.
- `plugins/maister/agents/`: 27 Claude-style Markdown roles; research explicitly excludes automatic conversion to `.codex/agents/*.toml` for MVP.
- `plugins/maister/.mcp.json`: Playwright MCP source configuration using Claude's `mcpServers` wrapper.
- `plugins/maister/hooks/hooks.json`: Claude hook schema and `${CLAUDE_PLUGIN_ROOT}` paths; not directly reusable as Codex output.
- `platforms/cursor/build.sh`: precedent for prefix transforms, generated output, and structural validation.
- `Makefile`: central orchestration for all generated variants.

The project documentation and plugin-development standards require source-only
edits, generated variants from `make build`, and validation before handoff.
