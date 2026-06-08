# Kiro CLI — Maister Support

Maister ships a **Kiro CLI** variant (`plugins/maister-kiro/`) built from the same source as Claude Code (`plugins/maister/`). The build pipeline lives in `platforms/kiro-cli/build.sh`.

Related docs:

- [Cursor Agent Support](cursor-agent-support.md) — shared multi-platform architecture
- [README — Kiro CLI section](../README.md#kiro-cli) — quick install
- [platforms/kiro-cli/README.md](../platforms/kiro-cli/README.md) — build pipeline internals

---

## Prerequisites

- [Kiro CLI](https://kiro.dev/docs/cli/) installed (`kiro-cli --version`)
- Optional: `KIRO_API_KEY` for headless smoke tests
- Repository cloned; run builds from repo root

---

## Install

### Build the plugin

```bash
make build-kiro
make validate-kiro
```

### Isolated profile install (recommended)

`smoke-install.sh` copies the built tree to **`~/.kiro-maister`** (or `$KIRO_HOME`). Your personal **`~/.kiro/`** is never modified.

```bash
bash platforms/kiro-cli/smoke-install.sh
```

Options: `--set-default` (set `chat.defaultAgent=maister`), `--set-alias` / `--no-alias` (add `maister-kiro` and `mk` to shell rc; prompts when omitted in a TTY).

Manual equivalent:

```bash
make build-kiro
cp -r plugins/maister-kiro ~/.kiro-maister
```

### Uninstall

```bash
bash platforms/kiro-cli/smoke-uninstall.sh
```

### Wrapper

Use `maister-kiro` from the repo (or add to PATH) so `KIRO_HOME` defaults to `~/.kiro-maister`:

```bash
./platforms/kiro-cli/maister-kiro chat --agent maister
```

---

## Daily use

### Start a session

From your **project directory** (workspace with code to change):

```bash
maister-kiro chat --agent maister
```

Headless / CI:

```bash
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-init'
```

### Slash skills

Invoke workflows with **`/maister-*`** (hyphenated, no colon):

| Skill | Purpose |
|-------|---------|
| `/maister-init` | Initialize `.maister/docs/`, standards, steering |
| `/maister-development` | Full SDLC workflow |
| `/maister-quick-plan` | Lightweight plan with standards |
| `/maister-quick-bugfix` | TDD bug fix |
| `/maister-research` | Research workflow |
| `/maister-standards-update` | Update project standards |

### `@prompts` shortcuts

Nine prompt files ship in `plugins/maister-kiro/prompts/` — e.g. `@init`, `@dev`, `@plan`, `@resume`, `@status`.

### Resume interrupted work

```bash
maister-kiro chat --agent maister \
  '/maister-development .maister/tasks/development/TASK-DIR --sequential'
```

Or `@resume` in an interactive session. **`orchestrator-state.yml`** is the source of truth for phase progress.

### Rebuild after source changes

Edit only `plugins/maister/` or `platforms/kiro-cli/`, then:

```bash
make build-kiro
bash platforms/kiro-cli/smoke-install.sh   # refresh ~/.kiro-maister
```

---

## Build pipeline

```
plugins/maister/              ← source of truth (Claude Code)
        ↓ make build-kiro
platforms/kiro-cli/build.sh   ← transforms (naming, chat gates, JSON agents, hooks)
        ↓
plugins/maister-kiro/         ← generated output (commit manually; never edit by hand)
```

Key transforms (see `platforms/kiro-cli/` and `.maister/docs/standards/global/build-pipeline.md`):

| Area | Kiro behavior |
|------|----------------|
| Naming | `maister:foo` → `maister-foo`; slash skills `/maister-*` |
| Commands | Merged into `skills/maister-*/SKILL.md`; no `commands/` dir |
| Agents | MD → `agents/*.json` + `agents/instructions/*.md` |
| Gates | `AskUserQuestion` / `AskQuestion` → **CHAT GATE** (interactive) |
| Delegation | `Task` → `subagent`; `Skill tool` → slash + `skill://` |
| Todo | `TaskCreate`/`TaskUpdate` → Kiro `todo` tool (best-effort) |
| MCP | `.mcp.json` → `settings/mcp.json` |
| Init | `.kiro/steering/maister-docs.md` + `AGENTS.md` template |

Makefile targets: `build-kiro`, `validate-kiro` (28 rules), `clean-kiro`. Aggregate `make build` and `make validate` include Kiro.

---

## Manual commit checkpoint

Before tagging a release, **commit generated and platform sources** (maintainer step — not automated in CI):

```bash
git add platforms/kiro-cli/ plugins/maister-kiro/
git commit -m "Add Kiro CLI platform support (maister-kiro)"
```

Regenerate before commit:

```bash
make build-kiro && make validate-kiro
```

`plugins/maister-kiro/` must be reproducible from `make build-kiro` only — same pattern as `maister-cursor` and `maister-copilot`.

---

## Smoke tests

Structural (no `kiro-cli` required):

```bash
bash platforms/kiro-cli/tests/docs-release.test.sh
bash platforms/kiro-cli/tests/e2e-matrix.test.sh
```

Headless CLI (requires `kiro-cli` in PATH):

```bash
bash platforms/kiro-cli/smoke-cli.sh
bash platforms/kiro-cli/smoke-cli.sh --test 1   # skill detection
```

Use a **fresh test project** (or disposable branch) for each full E2E run.

---

## E2E Verification Matrix

Adapted from [`docs/cursor-e2e-checklist.md`](cursor-e2e-checklist.md). Status reflects structural/automated checks plus documented manual paths.

| # | Scenario | Verification | Headless path | Status |
|---|----------|--------------|---------------|--------|
| 1 | `/maister-init` full flow | Creates `AGENTS.md`, `.maister/docs/INDEX.md`, `.kiro/steering/maister-docs.md` | `smoke-cli.sh --test 1` (skill detection); full init: see [Scenario 1 command](#scenario-1-init) | ☐ draft |
| 1a | Init artifacts | `AGENTS.md` Maister section; `.kiro/steering/maister-docs.md` exists | Inspect workspace after scenario 1 | ☐ draft |
| 2 | `/maister-development` + todo progress | Kiro `todo` tool mirrors phase progress (best-effort) | See [Scenario 2 command](#scenario-2-development) | ☐ draft |
| 2a | Interactive phase gates | Orchestrator pauses at **CHAT GATE** until user replies in chat | **Manual only** — not automatable with `--no-interactive` | ☐ manual |
| 3 | Resume `[task-path] [--from=PHASE]` | Reads `orchestrator-state.yml` as source of truth | `@resume` prompt or [Scenario 3 command](#scenario-3-resume) | ☐ draft |
| 4 | Parallel subagent waves | Executor dispatches parallel waves; Kiro **max 4 concurrent** `subagent` calls | Development without `--sequential`; verify wave size ≤ 4 | ☐ draft |
| 5 | gap-analyzer delegation | `subagent` to `maister-gap-analyzer` | `smoke-cli.sh --test 2` | ☐ draft |
| 6 | quick-plan + quick-bugfix | Chat gate overrides; plan/TDD artifacts | `smoke-cli.sh --test 3` (plan); `--test 4` (bugfix plan) | ☐ draft |
| 7 | Playwright MCP `--e2e` | Optional browser E2E via bundled `settings/mcp.json` | Enable MCP; run development with `--e2e` flag | ☐ optional |
| 8 | Subagent availability | All **26** agents in `agents/*.json` discoverable | `make validate-kiro` + `e2e-matrix.test.sh` scenario 8 | ☑ structural |

### Interactive gate UX (scenario 2a)

In an **interactive** `maister-kiro chat` session (no `--no-interactive`):

1. Start `/maister-development "small feature"` with `--sequential` for easier observation.
2. Proceed through Phase 1–2 until the first **CHAT GATE** after gap analysis.
3. **Verify**: orchestrator presents the question and options in chat and **does not** advance `completed_phases` or `todo` until you reply.
4. Reply in chat; confirm the workflow continues to the next phase.

Headless smoke uses defaults from [`platforms/kiro-cli/transforms/askuser-to-chat-gate.md`](../platforms/kiro-cli/transforms/askuser-to-chat-gate.md) (3B table) — gates auto-proceed without user input.

### Headless smoke mapping

| smoke-cli `--test` | E2E scenario | What it checks |
|--------------------|--------------|----------------|
| 1 | 1 (partial) | `maister-init` skill detected in profile |
| 2 | 5 | `maister-gap-analyzer` subagent delegation |
| 3 | 6 (plan) | `maister-quick-plan` writes `.maister/plans/*.md` |
| 4 | 6 (bugfix) | `maister-quick-bugfix` writes fix plan under `.maister/plans/` |

Run structural matrix tests (no `kiro-cli` required):

```bash
bash platforms/kiro-cli/tests/e2e-matrix.test.sh
```

### Manual headless commands

Replace `$WS` with an ephemeral workspace and `$KIRO` with isolated `KIRO_HOME` (see `smoke-cli.sh` setup).

#### Scenario 1 — init

```bash
export WORKSPACE=/tmp/maister-e2e-init-$$
export KIRO_HOME=/tmp/maister-kiro-$$
bash platforms/kiro-cli/smoke-cli.sh --test 1   # skill detection only

# Full init (long-running; pass Headless Defaults from askuser-to-chat-gate.md):
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  "Invoke /maister-init. Use headless defaults: global standards only, skip optional phases."
# Verify: AGENTS.md, .maister/docs/INDEX.md, .kiro/steering/maister-docs.md
```

#### Scenario 2 — development

```bash
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development "Add docstring to greet()" --sequential'
# Observe todo items for phase progress (best-effort; orchestrator-state.yml is SOT)
```

#### Scenario 3 — resume

```bash
# After interrupting development:
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development .maister/tasks/development/TASK-DIR --sequential'
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development .maister/tasks/development/TASK-DIR --from=phase_10 --sequential'
```

Or use `@resume` / `prompts/resume.md` in an interactive session.

#### Scenario 4 — parallel waves

```bash
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development "Add module docstrings" '
# Without --sequential; confirm executor sends at most 4 parallel subagent calls per wave
```

---

## Known gaps

| Gap | Impact | Mitigation |
|-----|--------|------------|
| **preCompact** hook | Kiro has no `preCompact`; compaction may lose in-context state | `orchestrator-state.yml` SOT; `@status` / `@resume`; `post-compact-reminder-stub.sh` (documented, not wired) |
| **todo API** | Experimental; sync is best-effort | `orchestrator-state.yml` remains authoritative for resume |
| **Max 4 subagents** | Parallel waves capped at 4 concurrent `subagent` calls | Executor should batch waves; use `--sequential` to disable parallelism |
| **Scenario 7 MCP** | Playwright E2E optional | Enable `settings/mcp.json`; not required for release |
| **Interactive multi-select** | Init Phase 3 multi-select not headless | Headless defaults use `global` standards only |

### Hooks (Phase 2)

| Hook | Test | Status |
|------|------|--------|
| `userPromptSubmit` | Skill reminder on `/maister-*` | ☐ manual |
| post-compaction | Read `orchestrator-state.yml` after compact | ☐ manual (no preCompact) |
| `preToolUse` | Subagent + `git reset --hard` → deny | ☐ manual |

### Smoke (Phase 1)

- ☑ `make validate-kiro` (28 rules)
- ☑ `smoke-cli.sh` tests 1–4 (when `kiro-cli` installed)
- ☑ `settings/mcp.json` in bundle
- ☐ Interactive multi-select (init Phase 3) — headless uses `global` only default

---

## Release validation

Tag releases run `make build && make validate` in [`.github/workflows/release.yml`](../.github/workflows/release.yml) — all platforms including Kiro must pass before publish.
