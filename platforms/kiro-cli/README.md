# Kiro CLI Platform Build

Transforms `plugins/maister/` (source of truth) into `plugins/maister-kiro/` for Kiro CLI.

## Usage

```bash
make build-kiro
make validate-kiro
make clean-kiro
```

User guide: [`docs/kiro-cli-support.md`](../../docs/kiro-cli-support.md).

## Install / uninstall

```bash
bash platforms/kiro-cli/smoke-install.sh    # → ~/.kiro-maister (isolated)
bash platforms/kiro-cli/smoke-uninstall.sh  # remove profile
maister-kiro chat --agent maister
```

## Layout

- `build.sh` — full transform pipeline (skills, agents JSON, hooks, shortcut skills)
- `generate-agent-json.sh` — MD→JSON agent generator (invoked by build.sh step 17)
- `agent-tools.json` — tool declarations per subagent
- `hooks/` — scripts embedded in `agents/maister.json` (`agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`, `stop`)
- `overrides/` — hand-maintained Kiro-native replacements for skills where auto-transforms aren't sufficient
- `templates/` — files copied into output for use by skills at runtime (`AGENTS.md` template, steering template)
- `transforms/askuser-to-chat-gate.md` — normative spec for AskUserQuestion→CHAT GATE transforms + Headless Defaults table
- `maister-kiro` — wrapper setting `KIRO_HOME=~/.kiro-maister`

## MCP settings

The build can provide Playwright MCP at `settings/mcp.json`, but the default
installer removes it and disables `includeMcpJson`. Use
`smoke-install.sh --with-mcp-playwright` to opt in.

## Hook path resolution

Build emits absolute paths (`~/.kiro-maister/hooks/*.sh`). `smoke-install.sh` rewrites to `$DEST/hooks/` for non-default installs.

## preCompact gap

Kiro has no `preCompact` hook. `hooks/post-compact-reminder-stub.sh` documents the gap and is **not** wired in `maister.json`. Use `orchestrator-state.yml` + `/status` / `/resume` after compaction.

## Test inventory

```bash
make build-kiro && make validate-kiro
bash platforms/kiro-cli/tests/*.test.sh
bash platforms/kiro-cli/smoke-cli.sh   # requires kiro-cli in PATH; skips if absent
```

**Fixtures:** `tests/fixtures/gap-analyzer.md` + `gap-analyzer.expected.json` (generator golden file).
