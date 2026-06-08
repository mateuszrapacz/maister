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

- `build.sh` — full transform pipeline (skills, agents JSON, hooks, prompts)
- `prompts/` — nine `@prompts` shortcuts (`@init`, `@dev`, …)
- `hooks/` — embedded in `agents/maister.json` (`agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`)
- `maister-kiro` — wrapper setting `KIRO_HOME=~/.kiro-maister`

## MCP settings

MCP config ships at `settings/mcp.json`. Empirical smoke: enable with `kiro-cli settings mcp.includeMcpJson true` (verify vs `useLegacyMcpJson` for your CLI version).

## Hook path resolution

Build emits relative paths (`../hooks/*.sh` from `agents/`). `smoke-install.sh` patches to absolute `$KIRO_HOME/hooks/` if relative resolution fails.

## preCompact gap

Kiro has no `preCompact` hook. `hooks/post-compact-reminder-stub.sh` documents the gap and is **not** wired in `maister.json`. Use `orchestrator-state.yml` + `@status` / `@resume` after compaction.

## Test inventory

Run the full Kiro feature test suite:

```bash
make build-kiro && make validate-kiro
bash platforms/kiro-cli/tests/*.test.sh
bash platforms/kiro-cli/smoke-cli.sh   # requires kiro-cli in PATH; skips if absent
```

| Test file | Group | Focus | Tests |
|-----------|-------|-------|-------|
| `scaffold.test.sh` | 1 | `make build-kiro` / `validate-kiro` / `clean-kiro`, stub `build.sh` vars | 7 |
| `generator.test.sh` | 2 | MD→JSON generator, golden `gap-analyzer` fixture, 24 agents | 8 |
| `build-core.test.sh` | 3 | Command merge, skill dirs, MCP location, naming transforms | 8 |
| `chat-gate.test.sh` | 4 | AskUserQuestion→CHAT GATE, multi-select, transform doc | 7 |
| `delegation-todo.test.sh` | 5 | Task→subagent, Skill→slash, TUI progress patterns, Explore ban | 9 |
| `build-completion.test.sh` | 6 | Steering, hooks in `maister.json`, 26 agents, init refs | 8 |
| `validation.test.sh` | 7 | `validate-kiro` rules 1–28, negative injection cases | 8 |
| `smoke.test.sh` | 8 | `smoke-install.sh`, wrapper, `fix_agent_prompts`, headless smoke-cli | 8 |
| `phase2.test.sh` | 9 | `@prompts`, trustedAgents, uninstall, steering hook docs | 8 |
| `e2e-matrix.test.sh` | 10 | E2E matrix doc, scenarios 1–8/2a, smoke-cli cross-refs | 8 |
| `docs-release.test.sh` | 11 | User docs, README, tech-stack, release workflow | 8 |
| `gap-fill.test.sh` | 12 | Generator edge cases, hook path fallback, resume `--from=PHASE` | 10 |

**Fixtures:** `tests/fixtures/gap-analyzer.md` + `gap-analyzer.expected.json` (generator golden file).

**Coverage gaps filled in Group 12:** skills→resources mapping, `defaults.tools` fallback, `fix_hook_paths` absolute/relative behavior, overrides chat-gate cleanliness, headless defaults citation, resume/`--from=PHASE` documentation chain.
