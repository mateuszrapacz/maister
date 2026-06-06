# Maister (Cursor Agent)

Structured, standards-aware development workflows for Cursor Agent.

## Install (local)

```bash
# Copy (stable snapshot)
bash platforms/cursor/smoke-install.sh

# Symlink (dev — updates after make build-cursor, no re-install)
bash platforms/cursor/smoke-install.sh --symlink
```

Then: **Developer: Reload Window** in Cursor IDE. CLI auto-discovers the plugin without `--plugin-dir`.

## Commands

Use `/maister-*` commands (e.g. `/maister-init`, `/maister-development`).

## MCP

Enable MCP in Cursor settings to use Playwright for `--e2e` workflows. Bundle: `mcp.json`.

## Rules

Plugin workflows: `rules/maister-workflows.mdc` (always applied when plugin is active).
