# Specification: Maister Kiro CLI Platform Support (Phases 0–4)

## Goal

Add a fourth generated platform variant — **Kiro CLI** — that transforms the Claude Code source plugin (`plugins/maister/`) into an installable tree (`plugins/maister-kiro/`) via `platforms/kiro-cli/build.sh`, enabling Maister workflows on Kiro through slash skills, JSON agents, embedded hooks, `@prompts`, and an isolated `KIRO_HOME=~/.kiro-maister` profile with `maister-kiro` wrapper.

## User Stories

- As a **developer using Kiro CLI**, I want to install Maister once via `smoke-install.sh` and run `maister-kiro chat --agent maister` so I can invoke `/maister-init`, `/maister-development`, and `@prompts` without polluting my personal `~/.kiro/` config.
- As a **CI maintainer**, I want `make build && make validate` to include Kiro structural checks and `smoke-cli.sh` headless tests so releases cannot ship a broken Kiro variant.
- As a **Maister contributor**, I want all Kiro-specific logic confined to `platforms/kiro-cli/` so `plugins/maister/` remains the single source of truth across Claude Code, Copilot, Cursor, and Kiro.
- As a **workflow user resuming a task**, I want `/maister-development [task-path] [--from=PHASE]` to read `orchestrator-state.yml` (SOT) with `todo` mirroring progress, matching Cursor TodoWrite parity.

## Core Requirements

1. **FR-1 Build pipeline** — `platforms/kiro-cli/build.sh` generates `plugins/maister-kiro/` with 22 skills, 26 JSON agents, steering, hooks, `settings/mcp.json`; no `commands/`, no plugin manifest.
2. **FR-2 MD→JSON agents** — `generate-agent-json.sh` converts 24 source `.md` agents to JSON + `agents/instructions/*.md`; synthesize `maister.json` (orchestrator) and `maister-explore.json`; tool whitelists from `agent-tools.json`.
3. **FR-3 Commands→skills merge** — 8 command files become `skills/maister-*/SKILL.md` directories; source `commands/` removed from output.
4. **FR-4 Semantic transforms** — `maister:` → `maister-`, `Task` → `subagent`, `AskUserQuestion` → chat-native gates, `TaskCreate`/`TaskUpdate` → `todo`, `Explore` → `maister-explore`.
5. **FR-5 Hooks** — Adapt Cursor hook scripts for Kiro `preToolUse`/`postToolUse`; embed in `agents/maister.json`; scripts at profile-root `hooks/` with `../hooks/*.sh` refs (absolute fallback if smoke fails).
6. **FR-6 Distribution** — `KIRO_HOME=~/.kiro-maister`, `maister-kiro` wrapper, `smoke-install.sh` (`--set-default` opt-in, default N), `smoke-uninstall.sh`, workspace `.kiro/` copy for CI.
7. **FR-7 @prompts layer** — Nine prompt files under `prompts/`: `@init`, `@dev`, `@research`, `@plan`, `@design`, `@status`, `@next`, `@resume`, `@bye`.
8. **FR-8 Init integration** — Build-time patch: `project/.kiro/steering/maister-docs.md` + `AGENTS.md` + `.maister/`; reuse Cursor `agents-md-template.md`.
9. **FR-9 Makefile & validation** — `build-kiro`, `validate-kiro`, `clean-kiro`; extend aggregate `build`, `validate`, `clean`, `watch`.
10. **FR-10 Todo transforms** — Include in Phase 1 build (ADR-014): `apply_todo_transforms()` mirroring Cursor pattern; ban `TaskCreate`/`TaskUpdate` in output.
11. **FR-11 Documentation** — README Kiro section, new `docs/kiro-cli-support.md`, update `build-pipeline.md`, `plugin-development.md`, `tech-stack.md`.
12. **FR-12 E2E verification (Phase 3)** — Eight scenarios adapted from `docs/cursor-e2e-checklist.md`; interactive gate UX + headless smoke paths.
13. **FR-13 Release (Phase 4)** — Manual commit of `plugins/maister-kiro/`; `release.yml` validates via `make build && make validate`.

## Reusable Components

### Existing Code to Leverage

| Component | Path | Reuse |
|-----------|------|-------|
| Source of truth | `plugins/maister/` | Copy target only — zero Kiro-specific edits |
| Primary build template | `platforms/cursor/build.sh` | `sedi()`, numbered steps, overrides, init patches, `apply_todo_transforms()` pattern |
| Copilot baseline | `platforms/copilot-cli/build.sh` | Reference for copy/sed structure only (opposite naming semantics) |
| Cursor overrides | `platforms/cursor/overrides/commands/quick-plan.md`, `overrides/skills/quick-bugfix/SKILL.md` | Reuse with chat-gate edits |
| Cursor templates | `platforms/cursor/templates/agents-md-template.md` | Init → `AGENTS.md` |
| Cursor steering template | `platforms/cursor/rules/maister-docs.mdc` | Adapt → `templates/steering-maister-docs.md` |
| Cursor hooks | `platforms/cursor/hooks/*.sh` | Adapt matchers/events for Kiro |
| Cursor todo reference | `platforms/cursor/transforms/task-to-todo.md`, `patches/orchestrator-patterns-todowrite.md` | Adapt → `task-to-kiro-todo.md`, `orchestrator-patterns-todo.md` |
| Cursor smoke | `platforms/cursor/smoke-install.sh`, `smoke-cli.sh` | Install + headless test structure |
| Makefile validation | `Makefile` `validate-cursor` | Pattern for ~22 `validate-kiro` grep/jq checks |
| Generated artifact example | `plugins/maister-cursor/` | Output shape comparison after first build |
| Representative agent | `plugins/maister/agents/gap-analyzer.md` | Golden-file MD→JSON prototype |
| Research ADRs | `analysis/research-context/decision-log.md`, `grill-decisions.md` | ADR-001–016 binding inputs |

### New Components Required

| Component | Why new |
|-----------|---------|
| `platforms/kiro-cli/build.sh` | Kiro-specific 18-step pipeline (no manifest, commands merge, JSON agents, embedded hooks) |
| `generate-agent-json.sh` | Kiro requires JSON agents + `instructions/` split — no Cursor equivalent |
| `agent-tools.json` | Kiro needs explicit per-agent tool whitelists; source MD has no `tools:` frontmatter (rejected per requirements) |
| `maister.json` synthesis | Synthetic orchestrator with embedded hooks and `skill://` resources — not in source MD |
| `maister-explore.json` | Kiro has no built-in `explore` subagent |
| Commands→skills merge step | Kiro has no `commands/` API — net-new build logic |
| Chat-native gate patches | Kiro has no `AskQuestion` — cannot reuse Cursor sed rename |
| `maister-kiro` wrapper | Sets `KIRO_HOME` before `exec kiro-cli` — Kiro-specific distribution |
| `@prompts/` layer (9 files) | Kiro-native workflow shortcuts — not in other platforms |
| `docs/kiro-cli-support.md` | Platform-specific user/maintainer documentation |

## Technical Approach

### Architecture Overview

```
plugins/maister/  ──copy+transform──►  plugins/maister-kiro/
       │                                      │
       │                              smoke-install.sh
       │                                      ▼
       │                              ~/.kiro-maister/  (KIRO_HOME)
       │                                      │
       │                              maister-kiro wrapper
       │                                      ▼
       │                              kiro-cli chat --agent maister
       │
platforms/kiro-cli/  ──orchestrates──►  build.sh + generate-agent-json.sh
                                        + agent-tools.json + hooks/overrides/templates
```

**Layout contract (ADR-010, ADR-016):** `plugins/maister-kiro/` mirrors `KIRO_HOME` layout 1:1:

```
plugins/maister-kiro/
├── agents/
│   ├── maister.json                 # orchestrator; hooks → ../hooks/
│   ├── maister-*.json               # 24 converted + maister-explore
│   └── instructions/
│       └── maister-*.md             # agent bodies (no frontmatter)
├── skills/                          # 22× maister-* directories
├── prompts/                         # 9× @prompt shortcuts
├── steering/
│   ├── maister-workflows.md
│   └── maister-docs.md              # init template
├── hooks/                           # profile-root hook scripts
├── settings/
│   └── mcp.json
└── README.md
```

**Project after init:**

```
project/
├── AGENTS.md
├── .maister/
└── .kiro/steering/maister-docs.md   # workspace overrides global
```

### Data Flow

1. **Build:** `make build-kiro` → `build.sh` copies SOT → merges commands → renames skill directories → applies **all semantic transforms on `.md`** (chat gates, delegation, todo) → **then** `generate-agent-json.sh` → synthesizes `maister.json` + `maister-explore.json` → copies platform assets → emits `plugins/maister-kiro/`.
2. **Install:** `smoke-install.sh` runs build, copies output tree → `$KIRO_HOME` (default `~/.kiro-maister`), optionally sets `chat.defaultAgent`.
3. **CI smoke:** `smoke-cli.sh` uses ephemeral `$KIRO_HOME` + workspace `.kiro/` copy; runs `kiro-cli chat --no-interactive --trust-all-tools --agent maister`.
4. **Runtime:** User invokes `/maister-*` skills or `@prompts`; orchestrator delegates via `subagent` to `maister-*` JSON agents; progress in `orchestrator-state.yml` (SOT) + `todo` mirror.

### Semantic Transform Table

| # | Source (Claude Code) | Cursor (reference) | Kiro (target) | Mechanism | Risk |
|---|---------------------|-------------------|---------------|-----------|------|
| T1 | `name: maister:foo` | `name: maister-foo` | `name: maister-foo` | sed on skills/commands pre-merge | Low — copy Cursor |
| T2 | `maister:` references | `maister-` | `maister-` | global sed on `.md` | Low |
| T3 | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` | sed in skills + steering | Low |
| T4 | `AskUserQuestion` | `AskQuestion` | **Chat-native gates** (3A+3B+3C) | Instruction rewrites + overrides; **no sed rename** | **High** (~230+ refs) |
| T5 | `Task` tool + `subagent_type` | unchanged | `subagent` tool + `agent: maister-*` | sed + instruction patches | Medium (~100+ refs) |
| T6 | `Skill` tool | unchanged | `/maister-*` slash + `skill://` resources | sed + orchestrator `resources` | Medium |
| T7 | `TaskCreate`/`TaskUpdate` | `TodoWrite` | `todo` tool | `apply_todo_transforms()` Phase 1 | Medium (~70 refs) |
| T8 | `subagent_type="Explore"` | `explore` | `maister-explore` synthetic agent | sed + `maister-explore.json` | Medium |
| T9 | Agents `.md` + frontmatter | `.md` + `maister-*` prefix | `.json` + `instructions/*.md` | `generate-agent-json.sh` | **High** |
| T10 | `commands/*.md` (8) | kept in `commands/` | merged to `skills/maister-*/` | build merge step | **High** |
| T11 | `hooks/hooks.json` | `hooks/hooks.json` | embedded in `maister.json` | synthesize orchestrator | **High** |
| T12 | `.claude-plugin/` | `.cursor-plugin/` | **removed** | `rm -rf` | Low |
| T13 | `.mcp.json` | `mcp.json` | `settings/mcp.json` | mv + path adapt | Low |
| T14 | `CLAUDE.md` plugin doc | `rules/maister-workflows.mdc` | `steering/maister-workflows.md` | template + Platform section | Low |
| T15 | `.cursor/rules/maister-docs.mdc` | init step | `.kiro/steering/maister-docs.md` | init skill patch | Medium |
| T16 | `user-invocable: false` | unchanged | strip frontmatter (5 skills) | sed strip; accept extra slashes (ADR-005) | Low |
| T17 | `EnterPlanMode`/`ExitPlanMode` | removed/overridden | removed/overridden | sed + quick-plan override | Low |
| T18 | Distribution | `~/.cursor/plugins/local/` | `KIRO_HOME=~/.kiro-maister` | smoke-install + wrapper | Medium |

### Chat-Native Phase Gates (T4 detail)

Kiro has no `AskQuestion` tool. Replace `AskUserQuestion` with three combined patterns (ADR-003). This is a **mechanical build transform**, not runtime documentation only.

#### Transform contract

**Scope:** All `*.md` under `OUT` **before** `generate-agent-json.sh` runs — including `agents/*.md`, `skills/**/SKILL.md`, `steering/*.md`, and patched init skill. After JSON generation, also scan `agents/instructions/*.md` is unnecessary if generator runs post-transform (instructions inherit clean bodies).

**Detection patterns** (build script applies in order):

| Pattern | Replacement |
|---------|-------------|
| `AskUserQuestion` tool invocation blocks | Chat gate instruction block (see templates below) |
| `→ Pause` / `MANDATORY GATE` markers | `→ **CHAT GATE**` + wait-for-reply wording |
| Multi-select `AskUserQuestion` | Sequential single-choice prompts (3C) — one question per gate |
| `AskUserQuestion` in code fences/examples | Same rewrite; preserve fence structure |

**Gate instruction template (3A):**

```markdown
→ **CHAT GATE** — Present the question and options in chat. Do not proceed until the user replies in this conversation. In `--no-interactive` mode, use the documented default for this gate (see Headless Defaults table).
```

**Headless defaults table (3B)** — normative; smoke-cli.sh prompts reference these:

| Gate context | `--no-interactive` default |
|--------------|---------------------------|
| Orchestrator phase exit gates | Proceed to next phase |
| Scope/decision gates with recommendation | Accept recommended option |
| Verification option prompts | Run all recommended checks |
| Init standards scope selection | `global` only |
| `quick-plan` approval gate | Proceed with generated plan |
| `quick-bugfix` complexity escalation | Stay in quick-bugfix (no escalation) |
| Fix-loop "which issues to fix" | Fix all fixable issues |
| E2E / user-docs enable prompts | Skip optional phases |

**Build implementation:**

1. `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` — documents all patterns (like `task-to-kiro-todo.md`)
2. `apply_chat_gate_transforms()` function in `build.sh` — scoped glob, same style as `apply_todo_transforms()`
3. Full-file overrides for high-churn files: `overrides/skills/development/SKILL.md` (orchestrator), `overrides/commands/quick-plan.md`, `overrides/skills/quick-bugfix/SKILL.md`

**Validate rules (testable):**

- Rule 25: Zero `AskUserQuestion`, `AskQuestion` in output tree
- Rule 26: Orchestrator skills contain `CHAT GATE` marker where source had `AskUserQuestion` or `→ Pause` (grep count ≥ source count minus documented exceptions)
- Rule 27: `transforms/askuser-to-chat-gate.md` exists in `platforms/kiro-cli/`

**Smoke test criteria:**

- Headless: `smoke-cli.sh` passes using defaults table (no user input)
- Interactive (Phase 3 E2E scenario 2a): orchestrator pauses at gate until user replies

Overrides required for `quick-plan` and `quick-bugfix` (reuse Cursor overrides as base, adapt gates). Init Phase 3 standards selection needs sequential rewrite per defaults table.

### `generate-agent-json.sh` Contract

**Input per agent:** `agents/<stem>.md` with YAML frontmatter (`name`, `description`, `model`, `color`).

**Output per agent:**
- `agents/maister-<stem>.json` — Kiro agent definition
- `agents/instructions/maister-<stem>.md` — body without frontmatter

**JSON fields (minimum):**
- `name` — prefixed `maister-*` (orchestrator exception: `maister`)
- `description`, `model` — from frontmatter
- `tools` — from `agent-tools.json` lookup by agent name
- `promptFile` or equivalent — reference to `instructions/maister-<stem>.md`
- `resources` (optional) — inferred from frontmatter `skills:` → `skill://.kiro/skills/maister-*/SKILL.md`
- `toolsSettings.subagent.trustedAgents` — `["maister-*"]` for orchestrator-class agents

**Synthetic agents (outside MD loop):**
- `maister-explore.json` — read-only tools; replaces built-in explore
- `maister.json` — full orchestrator with `hooks`, `resources` (all 22 skills), `subagent` + `todo` tools

**Runtime:** bash + jq (ADR-006); escalate to `generate-agents.mjs` (gray-matter) if frontmatter parser exceeds ~100 lines or fails edge cases.

### Commands→Skills Merge Contract

For each `commands/<name>.md`:

1. Create `skills/maister-<name>/SKILL.md`
2. Frontmatter: `name: maister-<name>`, `description` from command
3. Body: command body (post-transform)
4. Apply overrides for `quick-plan` (from `overrides/commands/quick-plan.md` after chat-gate adapt)
5. Remove entire `commands/` directory from output

**Command mapping (8 → 8 skill dirs):**

| Source command | Target skill directory |
|----------------|------------------------|
| `quick-dev.md` | `skills/maister-quick-dev/` |
| `quick-plan.md` | `skills/maister-quick-plan/` |
| `reviews-code.md` | `skills/maister-reviews-code/` |
| `reviews-pragmatic.md` | `skills/maister-reviews-pragmatic/` |
| `reviews-production-readiness.md` | `skills/maister-reviews-production-readiness/` |
| `reviews-reality-check.md` | `skills/maister-reviews-reality-check/` |
| `reviews-spec-audit.md` | `skills/maister-reviews-spec-audit/` |
| `work.md` | `skills/maister-work/` |

Plus 14 existing source skills → **22 total**.

### Skill Directory Rename Contract (C2 fix)

After command merge and `name:` frontmatter transform (`maister:foo` → `maister-foo`), **rename skill directories** so folder names match `name:` frontmatter and `skill://` paths.

**Rule:** For each `skills/<dir>/SKILL.md` where `name: maister-<dir>` (or `name: maister-<stem>`), directory must be `skills/maister-<dir>/`.

**Build step `rename_skill_directories()`:**

```bash
# For each skills/*/SKILL.md (excluding already maister-* prefixed dirs):
#   Read name: from frontmatter → extract maister-<stem>
#   If dirname != maister-<stem>: mv skills/<dir> skills/maister-<stem>
```

**Source mappings (14 existing skills):**

| Source directory | Target directory | Frontmatter after step 3 |
|------------------|------------------|--------------------------|
| `skills/development/` | `skills/maister-development/` | `name: maister-development` |
| `skills/init/` | `skills/maister-init/` | `name: maister-init` |
| `skills/research/` | `skills/maister-research/` | `name: maister-research` |
| *(etc. for all 14)* | `skills/maister-<stem>/` | `name: maister-<stem>` |

Merged commands (step 12) already create `skills/maister-<name>/` — no rename needed.

**Validate rule 13 (updated):** Every `skills/maister-*/SKILL.md` has `name:` matching parent directory; no `skills/<unprefixed>/` directories remain.

**Validate rule 28:** `find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d` returns exactly 22 directories, all matching `maister-*`.

### `maister.json` Orchestrator Contract (ADR-011, ADR-008, ADR-016)

- **File:** `agents/maister.json`
- **Name field:** `"maister"` (not `maister-orchestrator`)
- **User invocation:** `maister-kiro chat --agent maister`
- **Hooks:** embedded in JSON; script paths `../hooks/*.sh` relative to `agents/` (empirical test in smoke; absolute `$KIRO_HOME/hooks/` fallback)
- **Hook event mapping:**

| Cursor event | Kiro event | Script |
|--------------|------------|--------|
| `beforeShellExecution` | `preToolUse` matcher `shell` | `block-destructive-commands-kiro.sh` (exit 2 + STDERR) |
| `subagentStart` | `preToolUse` matcher `subagent` | `subagent-spawn-tracker.sh` |
| `subagentStop` | `postToolUse` matcher `subagent` | `subagent-complete-cleanup.sh` |
| `sessionStart` | `agentSpawn` + `userPromptSubmit` | `skill-invocation-reminder.sh` |
| `preCompact` | **GAP** — no Kiro equivalent | `post-compact-reminder-stub.sh` + docs |

- **Bash guard whitelist:** `maister-test-suite-runner`, `maister-e2e-test-verifier`, `maister-user-docs-generator`, `maister-docs-operator` (with and without prefix)
- **`resources`:** all 22 skills via `skill://.kiro/skills/maister-*/SKILL.md` including 5 internal skills (ADR-005)

### Todo Transforms (Phase 1 — ADR-014)

Mirror Cursor `apply_todo_transforms()` with Kiro-specific mappings per `transforms/task-to-kiro-todo.md`:

| Claude Code | Kiro `todo` |
|-------------|-------------|
| `TaskCreate` (pending) | `todo` create with pending status |
| `TaskUpdate` → `in_progress` | `todo` update in_progress |
| `TaskUpdate` → `completed` | `todo` update completed |
| `addBlockedBy` | ordering in todo list |
| `activeForm` | activity in content text |
| `metadata: {skipped: true}` | cancelled status |

**SOT:** `orchestrator-state.yml` remains authoritative for `--from=PHASE` resume; `todo` is UX mirror only.

**Glob (same as Cursor):** orchestrator-framework, development, product-design, performance, migration, research, init, standards-discover, implementation-verifier, implementation-plan-executor, agents/instructions/, steering/maister-workflows.md.

Append `patches/orchestrator-patterns-todo.md` to orchestrator-patterns reference.

Document: `kiro-cli settings chat.enableTodoList true`.

### `@prompts` Layer (ADR-012)

Nine files in `prompts/` (flat, invoked as `@init`, `@dev`, etc.):

| File | Maps to |
|------|---------|
| `init.md` | `/maister-init` |
| `dev.md` | `/maister-development` |
| `research.md` | `/maister-research` |
| `plan.md` | `/maister-quick-plan` |
| `design.md` | `/maister-product-design` |
| `status.md` | Read `orchestrator-state.yml` + report |
| `next.md` | Suggest next action from state |
| `resume.md` | Resume workflow with task path |
| `bye.md` | Graceful session end / save state |

Less common workflows (bugfix, migration, performance, reviews) remain slash-only in MVP.

### Distribution & Smoke

**`maister-kiro` wrapper (ADR-015):**
```
KIRO_HOME="${KIRO_HOME:-$HOME/.kiro-maister}" exec kiro-cli "$@"
```

**`smoke-install.sh`:**
- `set -euo pipefail`
- `make build-kiro`
- Copy `plugins/maister-kiro/*` → `$KIRO_HOME` (default `~/.kiro-maister`)
- Flags: `--set-default` / `--no-default` (interactive prompt default **N**), `--set-alias`, optional `DEST` override
- Do **not** merge into user's personal `~/.kiro/`

**`smoke-cli.sh`:**
- Ephemeral `$KIRO_HOME` + workspace `.kiro/` copy (hybrid ADR-001/ADR-010)
- Prerequisites: `kiro-cli` in PATH; optional `KIRO_API_KEY` for CI
- Runner: `kiro-cli chat --no-interactive --trust-all-tools --agent maister`
- Three tests: (1) maister-init detection, (2) subagent maister-gap-analyzer, (3) quick-plan artifact `.maister/plans/*.md`
- Headless gate bypass via documented defaults in smoke prompts

**`smoke-uninstall.sh`:** Remove `$KIRO_HOME`; optional alias cleanup.

### `validate-kiro` Rules

| # | Rule | Phase |
|---|------|-------|
| 1 | `plugins/maister-kiro/` exists | 0 |
| 2 | No `maister:` anywhere in output | 1 |
| 3 | No colons in skill `name:` frontmatter | 1 |
| 4 | No `EnterPlanMode` / `ExitPlanMode` | 1 |
| 5 | No `CLAUDE.md` references in skills | 1 |
| 6 | No `.claude-plugin/` or `.cursor-plugin/` | 1 |
| 7 | All `agents/*.json` parse with `jq empty` | 1 |
| 8 | Agent names are `maister` or `maister-*` | 1 |
| 9 | `settings/mcp.json` exists; no `.mcp.json` at root | 1 |
| 10 | `steering/maister-workflows.md` exists | 1 |
| 11 | No `AskUserQuestion` or `AskQuestion` | 1 |
| 12 | No capitalized `Explore` / `subagent_type="Explore"` | 1 |
| 13 | Each `SKILL.md` `name:` matches parent directory | 1 |
| 14 | Exactly **22** skill directories | 1 |
| 15 | No standalone `hooks/hooks.json` | 1 |
| 16 | No `commands/` directory | 1 |
| 17 | `agents/maister.json` exists with `hooks` field | 1 |
| 18 | `agents/maister-explore.json` exists | 1 |
| 19 | No `agents/*.md` (all JSON + instructions) | 1 |
| 20 | No `TaskCreate` / `TaskUpdate` | 1 |
| 21 | `maister.json` contains `trustedAgents` in toolsSettings | 2 |
| 22 | Hook scripts in `hooks/` are executable | 2 |
| 23 | Nine files in `prompts/` | 2 |
| 24 | `maister-kiro` wrapper exists in `platforms/kiro-cli/` | 2 |

Aggregate: `validate: validate-copilot validate-cursor validate-kiro`

## Phased Delivery (0–4)

### Phase 0 — Scaffold (~0.25 day)

**Deliverables:**
- Create `platforms/kiro-cli/` directory skeleton
- Stub `build.sh` with `sedi()`, `CORE`/`OUT`/`PLATFORM` vars, copy, naming transform, manifest removal
- Stub `agent-tools.json` with defaults + 2–3 agent entries
- Stub `generate-agent-json.sh` (1–2 agents proof-of-pipeline)
- Makefile: `build-kiro`, `validate-kiro` (existence only), `clean-kiro`; extend `build`, `validate`, `clean`

**Exit criteria:** `make build-kiro` produces minimal `plugins/maister-kiro/`; `make validate-kiro` passes existence check.

### Phase 1 — MVP Mechanical + Todo (~2–3 days)

**Deliverables:**
- Full `build.sh` steps 0–21 (semantic transforms before JSON generation per C1 fix; todo transforms at step 14)
- Complete `generate-agent-json.sh` for all 24 agents
- Commands→skills merge (8 commands)
- Synthesize `agents/maister.json` + `agents/maister-explore.json`
- Hooks Phase 1: shell block + subagent trackers embedded in `maister.json`
- Copy/adapt overrides, templates, steering from Cursor
- Chat-native gates (T4) across skills, agents/instructions, steering
- `Task` → `subagent`; `Skill` → slash semantics (T5, T6)
- Init patch: `.kiro/steering/maister-docs.md` step in init skill
- `transforms/task-to-kiro-todo.md`, `patches/orchestrator-patterns-todo.md`
- `smoke-install.sh`, `smoke-cli.sh`
- `validate-kiro` rules 1–20
- Manual commit of `plugins/maister-kiro/` after green validate

**Exit criteria:** `make build-kiro && make validate-kiro && bash platforms/kiro-cli/smoke-cli.sh` — test 1 PASS.

### Phase 2 — Hooks Polish + @prompts + UX (~1–2 days)

**Deliverables:**
- Full hook set in `maister.json` (agentSpawn, userPromptSubmit reminders)
- Empirical hook path resolution; absolute fallback if `../hooks/*.sh` fails
- `@prompts` layer — 9 files in `prompts/`
- `maister-kiro` wrapper script
- `smoke-uninstall.sh`
- `post-compact-reminder-stub.sh` + steering docs for preCompact gap
- MCP settings empirical test (`includeMcpJson` vs `useLegacyMcpJson`); document working key
- `validate-kiro` rules 21–24
- README Kiro section (mirror Cursor install block)

**Exit criteria:** All 24 validate rules pass; hooks execute in smoke; `@dev` prompt invokes development workflow.

### Phase 3 — E2E Verification (~2–3 days)

**Scenarios (adapted from cursor E2E checklist):**

| # | Scenario | Notes |
|---|----------|-------|
| 1 | `/maister-init` full flow | Interactive for Phase 3 gates; headless with defaults |
| 2 | `/maister-development` + todo progress | Requires Phase 1 todo transforms |
| 2a | Interactive phase gates UX | Separate from headless smoke |
| 3 | Resume `[task-path] [--from=PHASE]` | `orchestrator-state.yml` SOT |
| 4 | Parallel subagent waves | Kiro max 4 concurrent — verify executor waves |
| 5 | gap-analyzer delegation | `subagent` to `maister-gap-analyzer` |
| 6 | quick-plan + quick-bugfix | Override chat gates |
| 7 | Playwright MCP `--e2e` | P2 optional |
| 8 | Subagent availability | All 26 agents discoverable |

**Exit criteria:** Documented pass/fail matrix in `docs/kiro-cli-support.md`; interactive gate scenario verified manually.

### Phase 4 — Release (~0.5 day)

**Deliverables:**
- Commit `platforms/kiro-cli/` + `plugins/maister-kiro/` (manual, Cursor parity)
- `docs/kiro-cli-support.md` — install, daily use, platform comparison, known gaps
- Update `.maister/docs/standards/global/build-pipeline.md` — Kiro section
- Update `.maister/docs/project/tech-stack.md` — fourth platform
- Update `CLAUDE.md` structure section — `maister-kiro` generated artifact rule
- Cross-link from `docs/cursor-agent-support.md`
- Verify `.github/workflows/release.yml` passes `make build && make validate` with Kiro included
- Optional: `build-kiro.yml` (not required — manual commit binding)

**Exit criteria:** Tag release validates all three platforms; README documents Kiro install path.

## Implementation Guidance

### Testing Approach

- **Structural validation:** `make validate-kiro` after every build — fail-fast grep/jq checks (no unit test framework required for bash pipeline).
- **Smoke tests:** `smoke-cli.sh` three headless tests; run locally before committing generated artifact.
- **Golden-file:** Prototype MD→JSON on `gap-analyzer.md`; validate JSON with `jq empty` and spot-check `tools` whitelist.
- **Incremental agent rollout:** Generate 2–3 agents first, then batch remaining 21 + synthetics.
- **2–8 focused tests per implementation step group** during `/maister-development` execution; verification runs only new tests, not entire suite.
- **Interactive E2E:** Phase 3 scenario 2a requires manual session — not automatable in headless smoke.

### Build Script Step Order

**Normative ordering principle (C1 fix):** All semantic transforms on `.md` files complete **before** `generate-agent-json.sh`. Cursor keeps agents as `.md` through step 14; Kiro splits to JSON only after bodies are fully transformed. This matches `platforms/cursor/build.sh` where agent prefix + todo transforms precede any format conversion.

Reference `platforms/cursor/build.sh`; Kiro `build.sh` steps:

| Step | Action | Transform scope |
|------|--------|-----------------|
| 0 | `set -e`, `sedi()`, path vars | — |
| 1 | `rm -rf OUT && cp -r CORE OUT` | — |
| 2 | Remove `.claude-plugin/`; keep source `agents/*.md` for now | — |
| 3 | Skill/command `name:` prefix transform (`maister:foo` → `maister-foo`) | `skills/**`, `commands/**` |
| 4 | Global `maister:` → `maister-` | all `*.md` |
| 5 | Commands→skills merge; remove `commands/` | creates 8 new `skills/maister-*/` |
| 6 | **`rename_skill_directories()`** — 14 source skills → `skills/maister-*/` | skills only |
| 7 | Explore → `maister-explore` references in `.md` | all `*.md` |
| 8 | **`apply_chat_gate_transforms()`** — AskUserQuestion → chat gates | all `*.md` |
| 9 | Strip EnterPlanMode/ExitPlanMode; copy overrides (quick-plan, quick-bugfix) | skills + steering |
| 10 | CLAUDE.md → AGENTS.md in skills | `skills/**` |
| 11 | `.mcp.json` → `settings/mcp.json` | file move |
| 12 | Plugin CLAUDE.md → `steering/maister-workflows.md` + Kiro platform section | steering |
| 13 | Rewrite delegation: `Task` → `subagent`, `Skill tool` → slash semantics | **all `*.md`** (incl. `agents/*.md`) |
| 14 | **`apply_todo_transforms()`** + append orchestrator-patterns-todo | orchestrator glob + `agents/*.md` + steering |
| 15 | Strip `user-invocable: false` from skill frontmatter | `skills/**` |
| 16 | Init/docs-manager patches (AGENTS.md, `.kiro/steering/`) | init skill |
| 17 | **`generate-agent-json.sh`** — 24 agents → JSON + `agents/instructions/*.md` | agents (post-transform bodies) |
| 18 | Synthesize `maister.json` + `maister-explore.json` from templates + hook refs | agents JSON |
| 19 | Copy/adapt hooks to `OUT/hooks/`; chmod +x; create `.hook-state/` | hooks |
| 20 | Copy `@prompts` templates to `OUT/prompts/` | prompts |
| 21 | Emit `README.md` with install/settings docs | — |

**Post-build validate bans on `agents/instructions/`:** No `Task tool`, `Skill tool`, `TaskCreate`, `TaskUpdate`, `AskUserQuestion` (validate rules 11, 20, 25).

### Standards Compliance

- **Build pipeline** (`.maister/docs/standards/global/build-pipeline.md`): bash fail-fast, cross-platform `sedi()`, CI build+validate gate, no manual edits to generated artifacts.
- **Plugin development** (`.maister/docs/standards/global/plugin-development.md`): source-only edits in `plugins/maister/`; kebab-case naming; thin commands; SKILL.md as SOT.
- **Conventions** (`.maister/docs/standards/global/conventions.md`): spec-before-implementation; never hand-edit `plugins/maister-kiro/`.
- **Test writing** (`.maister/docs/standards/testing/test-writing.md`): structural validation via `make validate`; CLI smoke tests; risk-based coverage on generator and chat gates.

### Enforcement Rules

1. **Never edit `plugins/maister/` for Kiro concerns** — all platform logic in `platforms/kiro-cli/`.
2. **Never hand-edit `plugins/maister-kiro/`** — rebuild via `make build-kiro`.
3. **Use grill ADR naming** — `maister.json` not `maister-orchestrator`; `instructions/` not `prompts/` for agent bodies; `KIRO_HOME=~/.kiro-maister`.
4. **Manual commit discipline** — like Cursor; no auto-commit CI required.

## Out of Scope

- Edits to `plugins/maister/` for platform-specific content (including `tools:` frontmatter in source MD)
- Kiro IDE-only features
- Public Kiro marketplace / plugin manifest
- CI auto-commit of `plugins/maister-kiro/` (manual per user decision)
- Amazon Q Developer migration guide
- `skills-internal/` dual tree (5E) — revisit only if slash pollution blocks UX
- Node generator (6B) — only if bash+jq parser fails
- `preCompact` hook parity — document gap only
- Unified multi-platform install CLI

## Acceptance Criteria

### Build & Validate

- [ ] `make build` includes `build-kiro` and produces `plugins/maister-kiro/`
- [ ] `make validate-kiro` passes all 28 rules after Phase 2
- [ ] Zero `maister:`, `AskUserQuestion`, `AskQuestion`, `TaskCreate`, `TaskUpdate`, `EnterPlanMode`, `ExitPlanMode`, `Task tool`, `Skill tool` in output (including `agents/instructions/`)
- [ ] All 14 source skill directories renamed to `skills/maister-*/` (validate rules 13, 28)
- [ ] Chat gate transform doc exists; orchestrator skills contain `CHAT GATE` markers (validate rules 26–27)
- [ ] Exactly 22 skill directories, 26 JSON agents, 9 prompt files
- [ ] No `commands/`, no plugin manifest directories

### Runtime

- [ ] `smoke-install.sh` installs to `~/.kiro-maister` without touching `~/.kiro/`
- [ ] `maister-kiro chat --agent maister` starts orchestrator session
- [ ] `smoke-cli.sh` passes 3 headless tests
- [ ] `/maister-init` creates `AGENTS.md`, `.maister/docs/INDEX.md`, `.kiro/steering/maister-docs.md`
- [ ] `/maister-development [task-path] [--from=PHASE]` resumes from `orchestrator-state.yml`
- [ ] Destructive bash blocked for non-whitelisted subagents (hook exit 2)
- [ ] `subagent` delegation to `maister-gap-analyzer` works

### Documentation & Release

- [ ] `docs/kiro-cli-support.md` published with install, daily use, known gaps
- [ ] README Kiro section mirrors Cursor install block
- [ ] `build-pipeline.md` includes Kiro naming, layout, API bans
- [ ] `release.yml` validates Kiro on tag push
- [ ] `plugins/maister-kiro/` committed manually after green build+validate

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MD→JSON generator bugs (malformed JSON, lost frontmatter) | High | High | Incremental rollout; `jq` validation; golden-file on gap-analyzer; Node escape hatch |
| Chat gates UX regression (~230 rewrites) | Medium | High | 3A+3B+3C patterns; interactive E2E Phase 3; overrides for quick-plan/bugfix |
| Hook path resolution failure | Medium | High | Empirical smoke first; absolute `$KIRO_HOME/hooks/` fallback in JSON |
| Kiro `todo` API instability | Medium | Medium | `orchestrator-state.yml` SOT; best-effort sync wording |
| Commands→skills merge breaks discovery | Low | High | Validate 22 dirs; smoke test `/maister-init` |
| MCP settings key uncertainty | Medium | Medium | Empirical smoke; document working setting |
| Parallel subagent limit (max 4) | Medium | Low | Document in implementation-executor; test wave dispatch |
| Document naming drift (orchestrator vs maister) | Medium | Medium | Lock to ADR-011 in all new files and validate rules |
| Scope creep into source plugin | Low | High | Platforms-only enforcement in code review |
| Install path confusion | Medium | Low | `KIRO_HOME` wrapper + isolated profile docs |

## File Checklist

### New — `platforms/kiro-cli/` (create all)

| File | Phase | Purpose |
|------|-------|---------|
| `build.sh` | 0→1 | Main 18–20 step transform pipeline |
| `generate-agent-json.sh` | 0→1 | MD→JSON + instructions split |
| `agent-tools.json` | 0→1 | Per-agent Kiro tool whitelist lookup |
| `maister-kiro` | 2 | KIRO_HOME wrapper script |
| `smoke-install.sh` | 1 | Install to `~/.kiro-maister` |
| `smoke-cli.sh` | 1 | Headless smoke tests |
| `smoke-uninstall.sh` | 2 | Remove KIRO_HOME profile |
| `overrides/commands/quick-plan.md` | 1 | Chat-gate adapted quick-plan |
| `overrides/skills/quick-bugfix/SKILL.md` | 1 | Chat-gate adapted quick-bugfix |
| `templates/agents-md-template.md` | 1 | Copy from Cursor |
| `templates/steering-maister-docs.md` | 1 | Adapt from Cursor maister-docs.mdc |
| `hooks/block-destructive-commands-kiro.sh` | 1 | preToolUse shell guard |
| `hooks/subagent-spawn-tracker.sh` | 1 | preToolUse subagent |
| `hooks/subagent-complete-cleanup.sh` | 1 | postToolUse subagent |
| `hooks/skill-invocation-reminder.sh` | 2 | agentSpawn + userPromptSubmit |
| `hooks/post-compact-reminder-stub.sh` | 2 | preCompact gap documentation |
| `transforms/task-to-kiro-todo.md` | 1 | Todo semantic mapping reference |
| `patches/orchestrator-patterns-todo.md` | 1 | Append patterns for Kiro todo |
| `prompts/init.md` | 2 | @init shortcut |
| `prompts/dev.md` | 2 | @dev shortcut |
| `prompts/research.md` | 2 | @research shortcut |
| `prompts/plan.md` | 2 | @plan shortcut |
| `prompts/design.md` | 2 | @design shortcut |
| `prompts/status.md` | 2 | @status shortcut |
| `prompts/next.md` | 2 | @next shortcut |
| `prompts/resume.md` | 2 | @resume shortcut |
| `prompts/bye.md` | 2 | @bye shortcut |
| `README.md` | 2 | Maintainer notes (optional) |

### Generated — `plugins/maister-kiro/` (never hand-edit)

| Path | Count | Phase |
|------|-------|-------|
| `skills/maister-*/SKILL.md` | 22 | 1 |
| `agents/*.json` | 26 | 1 |
| `agents/instructions/maister-*.md` | 24 | 1 |
| `agents/instructions/maister.md` | 1 | 1 |
| `agents/instructions/maister-explore.md` | 1 | 1 |
| `steering/maister-workflows.md` | 1 | 1 |
| `steering/maister-docs.md` | 1 | 1 |
| `hooks/*.sh` | 5 | 1–2 |
| `settings/mcp.json` | 1 | 1 |
| `prompts/*.md` | 9 | 2 |
| `README.md` | 1 | 1 |

### Modified — integration files

| File | Change | Phase |
|------|--------|-------|
| `Makefile` | Add `build-kiro`, `validate-kiro`, `clean-kiro`; extend aggregates | 0 |
| `README.md` | Kiro CLI install section | 2–4 |
| `CLAUDE.md` | Document `maister-kiro` generated artifact | 4 |
| `docs/kiro-cli-support.md` | **New** — full platform guide | 4 |
| `docs/cursor-agent-support.md` | Cross-link to Kiro docs | 4 |
| `.maister/docs/standards/global/build-pipeline.md` | Kiro naming, layout, API bans | 4 |
| `.maister/docs/project/tech-stack.md` | Fourth platform entry | 4 |
| `.maister/docs/standards/global/plugin-development.md` | `maister-kiro` never-edit rule | 4 |

### Unchanged (verify only)

| File | Notes |
|------|-------|
| `plugins/maister/**` | Zero Kiro-specific edits |
| `.github/workflows/release.yml` | Auto-includes Kiro once Makefile updated |
| `.github/workflows/build-copilot.yml` | No change required (manual Kiro commit) |
| `.claude-plugin/marketplace.json` | No Kiro marketplace entry |

## Success Criteria

1. `make build && make validate` passes for Copilot, Cursor, and Kiro without manual intervention.
2. `smoke-install.sh` + `maister-kiro chat --agent maister` runs `/maister-init` with correct project artifacts.
3. `smoke-cli.sh` passes 3 headless tests with `--no-interactive --trust-all-tools`.
4. Resume workflow works via `orchestrator-state.yml` SOT; `todo` mirrors progress.
5. Hooks block destructive bash for non-whitelisted subagents; subagent spawn tracked.
6. All semantic transforms applied — no banned API symbols in generated output.
7. Architecture documented in `docs/kiro-cli-support.md`; standards updated.
8. `plugins/maister-kiro/` committed manually; reproducible via `make build-kiro`.

---

*Binding inputs: requirements Q&A, grill ADR-010–016, gap-analysis phase plan, Cursor `build.sh` reference. Pre-grill `maister-orchestrator` / `agents/prompts/` / `~/.kiro/` naming superseded by grill decisions.*
