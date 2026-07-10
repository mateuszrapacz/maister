## TL;DR

Current state: Claude/Copilot/Cursor/Kiro/Kilo variants exist; Codex support is absent.
Desired state: a generated native Codex plugin installable through a local marketplace and validated by Make.
The gap is medium-risk platform integration with no UI or data migration.

## Key Decisions

- Use native-first packaging with a semantic transform.
- Preserve `orchestrator-state.yml` as Maister's workflow state source of truth.
- Keep custom Codex agents and live app-server integration out of MVP.

## Open Questions / Risks

- Codex hook trust and runtime install behavior need a live environment check.

## Task Characteristics

```yaml
has_reproducible_defect: false
modifies_existing_code: true
creates_new_entities: true
involves_data_operations: false
ui_heavy: false
```

## Current vs Desired

| Area | Current | Desired |
|---|---|---|
| Plugin manifest | Claude `.claude-plugin/plugin.json` | Codex `.codex-plugin/plugin.json` |
| Workflow entrypoints | Commands plus skills | Skills only, including command-derived shortcuts |
| Agents | Markdown agent definitions | Native subagent delegation; no bundled custom agents |
| MCP | Claude `.mcp.json` wrapper | Codex-compatible `.mcp.json` |
| Hooks | Claude event schema | Codex `hooks/hooks.json`, `PLUGIN_ROOT`, Codex output schema |
| Distribution | Existing platform channels | Repo marketplace at `.agents/plugins/marketplace.json` |
