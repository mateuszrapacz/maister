# Codex Support

Maister's Codex variant is a native plugin generated from `plugins/maister/`.
It targets Codex CLI and the Codex IDE extension without pretending that
Claude/Cursor component contracts exist in Codex.

## Build

```bash
make build-codex
make validate-codex
```

The generated plugin lives at `plugins/maister-codex/`. Do not edit that
directory manually; edit the source or `platforms/codex-cli/` and rebuild.

The build performs these transformations:

- Source skills become plain-kebab Codex skills under the `maister` namespace
  (for example, `maister:product-design`).
- Public source commands become explicit plain-kebab skill entrypoints under the
  same `maister` namespace because
  Codex plugins do not have a separate command component.
- Claude/Cursor tool names and project-instruction references are rewritten for
  Codex's skill, textual-gate, and `AGENTS.md` model.
- Custom `agents/*.md` are not copied. Native Codex subagent delegation is the
  MVP role mechanism; optional project-scoped custom agents can be added later
  under `.codex/agents/*.toml`.
- Playwright MCP is not enabled by the default Codex plugin installation. Add
  it explicitly in the Codex host configuration when an E2E workflow needs it.
- Codex hook scripts and `hooks/hooks.json` are emitted separately from the
  Claude hook source.

## Local installation

The repository marketplace is `.agents/plugins/marketplace.json`:

```bash
bash platforms/codex-cli/smoke-install.sh
```

The default install omits Playwright MCP. Use
`bash platforms/codex-cli/smoke-install.sh --with-mcp-playwright` only for
workflows that need browser E2E.

Manual equivalent:

```bash
make build-codex
codex plugin marketplace add .
codex plugin add maister@maister-local
```

Start a new Codex session after installation or rebuilding so bundled skills
are rediscovered.

## Workflow behavior

Use `$maister:development` (or another `maister:*` skill) to start a workflow.
The workflow still owns specification, planning, implementation, verification,
and pause gates. Gates are plain-text questions because structured user-input
support is not a stable plugin dependency.

### Session utility skills

The Codex variant also exposes lightweight session controls:

| Skill | Purpose |
|---|---|
| `$maister:resume` | Resume the latest or explicitly supplied task from `orchestrator-state.yml`. |
| `$maister:status` | Report task, phase, completed phases, blockers, and pending gates. |
| `$maister:next` | Suggest one next action without executing it. |
| `$maister:bye` | End the session while preserving state and recording the resume path. |
| `$maister:dev` | Shortcut for `$maister:development`. |

`$maister:resume` selects the workflow from the task directory and passes the
saved phase as `--from=<phase>`. `orchestrator-state.yml` remains the source of
truth; these skills do not create a second session-state mechanism.

`orchestrator-state.yml` remains the source of truth for phases, decisions,
artifacts, and resume. Codex Goals or native planning can improve the session
experience, but do not replace the Maister state graph.

## Models and subagents

The plugin does not pin a model or reasoning effort. Codex chooses the active
model from the host/session configuration, and native subagents inherit those
settings unless a user-owned custom agent explicitly overrides them.

This keeps plugin behavior portable across model availability and avoids
silently changing a user's cost, latency, or safety settings. If a future
project needs named reviewer/explorer profiles, add them as an explicit,
opt-in `.codex/agents/*.toml` installation layer rather than treating them as
part of the plugin manifest.

## Hooks and security

The plugin includes three defense-in-depth hooks:

- Session-start guidance for Maister skill invocation.
- A post-compaction reminder to inspect `orchestrator-state.yml`.
- A `PreToolUse` destructive-command guard for delegated agents.

Plugin hooks require review and trust in Codex. They do not replace the Codex
sandbox or approval policy, and the destructive-command guard cannot intercept
every execution path. Review hooks with `/hooks` and choose the session sandbox
and approval policy explicitly.

## References

- [Codex plugins](https://developers.openai.com/codex/plugins/build)
- [Codex skills](https://developers.openai.com/codex/skills)
- [Codex hooks](https://developers.openai.com/codex/hooks)
- [Codex subagents](https://developers.openai.com/codex/subagents)
