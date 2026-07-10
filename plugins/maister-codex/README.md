# Maister (Codex)

Native Codex plugin packaging for Maister's standards-aware development
workflows.

## Local development

```bash
make build-codex
codex plugin marketplace add .
```

For a repo-scoped marketplace, use the repository's
`.agents/plugins/marketplace.json`. After installing or changing the plugin,
start a new Codex session so the bundled skills are rediscovered.

Invoke public workflows with `$maister:development`, `$maister:init`, or the
other `maister:*` skills. Internal workflow capabilities are bundled as
non-implicitly-invocable skills and are delegated through Codex's native
subagent workflow.

Codex Goals and native planning are optional UX aids. Maister keeps
`orchestrator-state.yml` as the source of truth for phase state and resume.
Models are selected by the Codex host/session; the plugin does not pin models.

Bundled hooks are defense-in-depth and require review/trust in Codex. Keep the
session sandbox and approval policy as the primary security boundary.
