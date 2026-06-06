# Maister (Cursor Agent)

Structured, standards-aware development workflows for Cursor Agent.

## Install (local)

```bash
make build-cursor
cp -r plugins/maister-cursor ~/.cursor/plugins/local/maister-cursor
```

Then: **Developer: Reload Window** in Cursor.

## Commands

Use `/maister-*` commands (e.g. `/maister-init`, `/maister-development`).

## MCP

Enable MCP in Cursor settings to use Playwright for `--e2e` workflows. Bundle: `mcp.json`.

## Rules

Plugin workflows: `rules/maister-workflows.mdc` (always applied when plugin is active).
