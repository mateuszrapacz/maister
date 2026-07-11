# Maister (Cursor Agent)

Structured, standards-aware development workflows for Cursor Agent.

## Install (local)

```bash
bash platforms/cursor/smoke-install.sh
```

Then: **Developer: Reload Window** in Cursor IDE. CLI auto-discovers the plugin without `--plugin-dir`.

## Skills

Use `/maister-*` slash skills (e.g. `/maister-init`, `/maister-development`). Internal orchestrator engines live under `lib/skills/` and are not user-facing.

## MCP

Playwright MCP is opt-in. Install locally with
`--with-mcp-playwright` when an `--e2e` workflow needs it.

## Rules

Plugin workflows: `rules/maister-workflows.mdc` (always applied when plugin is active).
