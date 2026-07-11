# Maister (Codex)

Native Codex plugin packaging for Maister's standards-aware development
workflows.

## Local install

```bash
bash platforms/codex-cli/smoke-install.sh
```

Playwright MCP is opt-in via `--with-mcp-playwright` when an `--e2e` workflow
needs it. After installing or changing the plugin, start a new Codex session so
the bundled skills are rediscovered.

Invoke public workflows with `$maister:development`, `$maister:init`, or the
other `maister:*` skills. Internal workflow capabilities are bundled as
non-implicitly-invocable skills and are delegated through Codex's native
subagent workflow.

Codex Goals and native planning are optional UX aids. Maister keeps
`orchestrator-state.yml` as the source of truth for phase state and resume.
Models are selected by the Codex host/session; the plugin does not pin models.

Bundled hooks are defense-in-depth and require review/trust in Codex. Keep the
session sandbox and approval policy as the primary security boundary.
