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

Manual equivalent (requires `smoke-install.sh` for working subagent prompts — see Known gaps):

```bash
make build-kiro
bash platforms/kiro-cli/smoke-install.sh   # rewrites prompt paths for subagents
```

Raw `cp -r plugins/maister-kiro ~/.kiro-maister` copies relative `file://./instructions/` prompts that **fail silently for subagents** on kiro-cli 2.6.0; main-agent `--agent maister-*` still works.

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

Maister targets the **Terminal UI** (default since Kiro CLI 2.0). The install profile ships with `chat.ui` = `tui`. Classic interface and `chat.enableTodoList` are not used.

| Shortcut | Purpose |
|----------|---------|
| `Ctrl+X` | Activity tray — phase/task progress and queued messages |
| `Ctrl+G` | Crew monitor — live subagent status (max 4 parallel) |

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

### Slash shortcut skills — primary way to start workflows

In Kiro TUI, **use slash shortcut skills** to discover and launch Maister workflows. Shortcuts are `user-invocable` skills under `skills/<name>/SKILL.md` (e.g. `/dev`, `/work`) and appear in slash autocomplete. Each shortcut delegates to the matching `/maister-*` orchestrator skill and passes `$ARGUMENTS` verbatim.

You can also invoke `/maister-*` skills directly (e.g. `/maister-development "your task"`). Internal orchestrator skills under `skills/maister-*/` load into the `maister` agent context; shortcuts exist so you do not need to type the full `maister-` prefix.

Shortcut skills are generated in `platforms/kiro-cli/build.sh` (step 20). There is no `prompts/` directory in the install profile — an earlier `@prompts` layer was replaced by these slash skills for better `$ARGUMENTS` handling and autocomplete discoverability.

| Shortcut | Maps to | Workflow / behavior |
|----------|---------|---------------------|
| `/init` | `/maister-init` | Initialize `.maister/docs/`, standards, steering |
| `/dev` | `/maister-development` | Full SDLC workflow (requirements → spec → plan → implement → verify) |
| `/work` | `/maister-work` | Router — classify task and delegate to the right orchestrator |
| `/quick-plan` | `/maister-quick-plan` | Lightweight plan in `.maister/plans/`. **Not** Kiro's `/plan`. |
| `/quick-dev` | `/maister-quick-dev` | Implement with standards, no full workflow |
| `/quick-bugfix` | `/maister-quick-bugfix` | TDD bug fix |
| `/research` | `/maister-research` | Research with synthesis before implementation |
| `/design` | `/maister-product-design` | Interactive product/feature design before development |
| `/migration` | `/maister-migration` | Technology or architecture migration |
| `/performance` | `/maister-performance` | Performance optimization workflow |
| `/standards-discover` | `/maister-standards-discover` | Discover standards from codebase and config |
| `/standards-update` | `/maister-standards-update` | Add or refine project standards |
| `/grill-me` | `/maister-grill-me` | Stress-test a plan or design (one question at a time) |
| `/thermos` | `/maister-thermos` | Parallel thermo-nuclear security + code-quality branch review |
| `/thermo-review` | `/maister-thermo-nuclear-review` | Deep security/correctness diff audit only |
| `/thermo-quality` | `/maister-thermo-nuclear-code-quality-review` | Strict maintainability diff audit only |
| `/reviews-code` | `/maister-reviews-code` | Code quality, security, performance review |
| `/reviews-pragmatic` | `/maister-reviews-pragmatic` | Over-engineering / scale review |
| `/reviews-production-readiness` | `/maister-reviews-production-readiness` | Pre-deployment GO/NO-GO |
| `/reviews-reality-check` | `/maister-reviews-reality-check` | Validate work solves the problem |
| `/reviews-spec-audit` | `/maister-reviews-spec-audit` | Independent spec audit |
| `/resume` | Appropriate `/maister-*` skill | Continue from `orchestrator-state.yml` (`--from=PHASE` when supported) |
| `/status` | — | Report task path, phase, blockers from `orchestrator-state.yml` |
| `/next` | — | Suggest best next action; if idle, suggest `/init` or `/dev` |
| `/bye` | — | End session gracefully; note task path for `/resume` |

**Notes:**

- Kiro's built-in `/plan` is the Kiro Plan agent — use `/quick-plan` for Maister quick-plan.
- Kiro also supports its own `@prompts` feature (`/prompts create`, files in `.kiro/prompts/`). Maister does not ship prompt files; use the slash shortcuts above instead.
- Headless/CI: pass `/maister-*` in the initial prompt (see examples below); hooks remind the agent to invoke the skill.

Orchestrator skills delegate internally to subagents (`maister-*` via the `subagent` tool) and other skills (`/maister-implementation-plan-executor`, `/maister-codebase-analyzer`, …). See `steering/maister-workflows.md` in the install profile.

### Resume interrupted work

```bash
maister-kiro chat --agent maister \
  '/maister-development .maister/tasks/development/TASK-DIR --sequential'
```

Or `/resume` in an interactive session. **`orchestrator-state.yml`** is the source of truth for phase progress.

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
| Naming | `maister:foo` → `maister-foo`; slash skills `/maister-*`; shortcut skills `/dev`, `/work`, … |
| Commands | Merged into `skills/maister-*/SKILL.md`; no `commands/` dir |
| Agents | MD → `agents/*.json` + `agents/instructions/*.md` |
| Gates | `AskUserQuestion` / `AskQuestion` → **CHAT GATE** (interactive) |
| Delegation | `Task` → `subagent`; `Skill tool` → slash + `skill://` |
| Progress (TUI) | `TaskCreate`/`TaskUpdate` → `todo` tool; visible in activity tray (`Ctrl+X`) |
| UI default | `settings/cli.json` ships `chat.ui` = `tui` |
| MCP | `.mcp.json` → `settings/mcp.json` |
| Init | `.kiro/steering/maister-docs.md` + `AGENTS.md` template |

Makefile targets: `build-kiro`, `validate-kiro` (31 rules), `clean-kiro`. Aggregate `make build` and `make validate` include Kiro.

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
| 2 | `/maister-development` + TUI task progress | `todo` tool mirrors phases in activity tray (`Ctrl+X`); `orchestrator-state.yml` is SOT | See [Scenario 2 command](#scenario-2-development) | ☐ draft |
| 2a | Interactive phase gates | Orchestrator pauses at **CHAT GATE** until user replies in chat | **Manual only** — not automatable with `--no-interactive` | ☐ manual |
| 3 | Resume `[task-path] [--from=PHASE]` | Reads `orchestrator-state.yml` as source of truth | `/resume` skill or [Scenario 3 command](#scenario-3-resume) | ☐ draft |
| 4 | Parallel subagent waves | Executor dispatches parallel waves; Kiro **max 4 concurrent** `subagent` calls | Development without `--sequential`; verify wave size ≤ 4 | ☐ draft |
| 5 | gap-analyzer delegation | `subagent` to `maister-gap-analyzer` | `smoke-cli.sh --test 2` | ☐ draft |
| 6 | quick-plan + quick-bugfix | Chat gate overrides; plan/TDD artifacts | `smoke-cli.sh --test 3` (plan); `--test 4` (bugfix plan) | ☐ draft |
| 7 | Playwright MCP `--e2e` | Optional browser E2E via bundled `settings/mcp.json` | Enable MCP; run development with `--e2e` flag | ☐ optional |
| 8 | Subagent availability | All **26** agents in `agents/*.json` discoverable | `make validate-kiro` + `e2e-matrix.test.sh` scenario 8 | ☑ structural |

### Interactive gate UX (scenario 2a)

In an **interactive** `maister-kiro chat` session (no `--no-interactive`):

1. Start `/maister-development "small feature"` with `--sequential` for easier observation.
2. Proceed through Phase 1–2 until the first **CHAT GATE** after gap analysis.
3. **Verify**: orchestrator presents the question and options in chat and **does not** advance `completed_phases` or TUI tasks until you reply.
4. Reply in chat; confirm the workflow continues to the next phase.
5. Optional: open activity tray (`Ctrl+X`) to confirm phase tasks update during the workflow.

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
# Observe TUI task progress in activity tray (Ctrl+X); orchestrator-state.yml is SOT
```

#### Scenario 3 — resume

```bash
# After interrupting development:
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development .maister/tasks/development/TASK-DIR --sequential'
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development .maister/tasks/development/TASK-DIR --from=phase_10 --sequential'
```

Or use `/resume` or `skills/resume/SKILL.md` in an interactive session.

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
| **Subagent `file://` prompts** | Relative `file://./instructions/*.md` loads for main agents but **silently fails** for `subagent` delegation on kiro-cli 2.6.0 — subagents run without system instructions ([#5241](https://github.com/kirodotdev/Kiro/issues/5241), [#6100](https://github.com/kirodotdev/Kiro/issues/6100), [#7776](https://github.com/kirodotdev/Kiro/issues/7776)) | `smoke-install.sh` rewrites prompts to absolute `file://$KIRO_HOME/agents/instructions/...` via `fix_prompt_paths()`; verified 2026-07-08 on kiro-cli 2.6.0 |
| **preCompact** hook | Kiro has no `preCompact`; compaction may lose in-context state | `orchestrator-state.yml` SOT; `/status` / `/resume`; `post-compact-reminder-stub.sh` (documented, not wired) |
| **TUI task sync** | Agent `todo` tool vs activity tray may drift | `orchestrator-state.yml` remains authoritative for resume; use `/status` / `/resume` |
| **Max 4 subagents** | Parallel waves capped at 4 concurrent `subagent` calls | Executor should batch waves; use `--sequential` to disable parallelism |
| **Scenario 7 MCP** | Playwright E2E optional | Enable `settings/mcp.json`; not required for release |
| **Interactive multi-select** | Init Phase 3 multi-select not headless | Headless defaults use `global` standards only |

### Hooks (Phase 2)

| Hook | Test | Status |
|------|------|--------|
| `userPromptSubmit` | Skill reminder on `/maister-*` | ☐ manual |
| `stop` | Active workflow → block stop, remind to sync `orchestrator-state.yml` | ☐ manual |
| post-compaction | Read `orchestrator-state.yml` after compact | ☐ manual (no preCompact) |
| `preToolUse` | Subagent + `git reset --hard` → deny | ☐ manual |

### Smoke (Phase 1)

- ☑ `make validate-kiro` (31 rules)
- ☑ `smoke-cli.sh` tests 1–4 (when `kiro-cli` installed)
- ☑ `settings/mcp.json` in bundle
- ☐ Interactive multi-select (init Phase 3) — headless uses `global` only default

---

## Release validation

Tag releases run `make build && make validate` in [`.github/workflows/release.yml`](../.github/workflows/release.yml) — all platforms including Kiro must pass before publish.
