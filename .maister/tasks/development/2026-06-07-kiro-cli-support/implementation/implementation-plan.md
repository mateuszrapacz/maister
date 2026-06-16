# Implementation Plan: Maister Kiro CLI Platform Support

## Overview

**Total task groups:** 11 (+ 1 test review group = 12)  
**Total implementation steps:** ~78 (excluding test-review sub-steps)  
**Expected tests:** ~16–34 (2–8 per group; structural/golden/smoke; no traditional unit framework for bash)  
**Phases:** 0–4 per spec  
**Highest risk:** Group 4 (chat gates ~230 refs), Group 2 (MD→JSON generator), Group 6 (orchestrator synthesis)

**Dependency chain (critical path):**

```
G1 Scaffold → G2 Generator + G3 Build Core (parallel)
           → G4 Chat Gates + G5 Delegation/Todo (parallel, after G3)
           → G6 Build Completion
           → G7 Validation
           → G8 Smoke/CI
           → G9 Phase 2 UX
           → G10 E2E
           → G11 Docs/Release
           → G12 Test Review
```

---

## Implementation Steps

### Task Group 1: Phase 0 — Scaffold & Makefile Integration

**Dependencies:** None  
**Files to Modify:** `Makefile`, `platforms/kiro-cli/build.sh`, `platforms/kiro-cli/generate-agent-json.sh`, `platforms/kiro-cli/agent-tools.json`, `platforms/kiro-cli/README.md` (stub)

**Estimated Steps:** 6

- [x] 1.0 Complete Phase 0 scaffold layer
  - [x] 1.1 Write 2–8 focused tests for scaffold
    - Test: `make build-kiro` exits 0 and creates `plugins/maister-kiro/`
    - Test: `make validate-kiro` passes existence-only check (rule 1)
    - Test: `make clean-kiro` removes output directory
    - Test: `make build` invokes `build-kiro` (aggregate target)
    - Test: stub `build.sh` defines `sedi()`, `CORE`, `OUT`, `PLATFORM` vars
    - Test: stub build removes `.claude-plugin/` from output
    - Test: stub build applies `maister:` → `maister-` on at least one skill
  - [x] 1.2 Create `platforms/kiro-cli/` directory skeleton
    - Subdirs: `hooks/`, `overrides/commands/`, `overrides/skills/`, `templates/`, `transforms/`, `patches/`, `prompts/` (empty stubs OK for Phase 0)
  - [x] 1.3 Implement stub `build.sh` (Phase 0 scope)
    - Copy Cursor pattern: `set -e`, `sedi()`, path vars, `rm -rf OUT && cp -r CORE OUT`
    - Remove `.claude-plugin/`; no manifest creation
    - Skill/command `name:` prefix transform (`maister:foo` → `maister-foo`) on skills only
    - Emit minimal `README.md` placeholder
  - [x] 1.4 Stub `agent-tools.json` with defaults + 2–3 agent entries (`gap-analyzer`, `implementation-planner`, orchestrator-class placeholder)
  - [x] 1.5 Stub `generate-agent-json.sh` — proof-of-pipeline for 1–2 agents (`gap-analyzer` golden path)
    - Output: `agents/maister-gap-analyzer.json` + `agents/instructions/maister-gap-analyzer.md`
    - Validate with `jq empty`
  - [x] 1.6 Extend `Makefile`: `build-kiro`, `validate-kiro` (existence only), `clean-kiro`; extend `build`, `validate`, `clean`, `watch`
  - [x] 1.7 Ensure scaffold tests pass
    - Run ONLY the 2–8 tests from 1.1

**Acceptance Criteria:**
- `make build-kiro` produces minimal `plugins/maister-kiro/`
- `make validate-kiro` passes rule 1 (directory exists)
- Aggregate `make build` and `make validate` include Kiro targets
- No edits to `plugins/maister/`

---

### Task Group 2: MD→JSON Generator & Tool Whitelists

**Dependencies:** Group 1  
**Files to Modify:** `platforms/kiro-cli/generate-agent-json.sh`, `platforms/kiro-cli/agent-tools.json`, `platforms/kiro-cli/build.sh` (wire step 17 hook only), `platforms/kiro-cli/tests/` (golden fixtures)

**Estimated Steps:** 7

- [x] 2.0 Complete MD→JSON generator layer
  - [x] 2.1 Write 2–8 focused tests for generator
    - Test: `gap-analyzer.md` → JSON parses with `jq empty`
    - Test: JSON `name` is `maister-gap-analyzer` (prefixed)
    - Test: `tools` array populated from `agent-tools.json` lookup
    - Test: `instructions/maister-gap-analyzer.md` has no YAML frontmatter
    - Test: frontmatter fields `description`, `model` preserved in JSON
    - Test: all 24 source agents produce valid JSON when run in isolation
    - Test: no `agents/*.md` remains after full generator run (post-step cleanup)
    - Test: golden-file diff for `gap-analyzer` JSON fields (name, tools, promptFile path)
  - [x] 2.2 Complete `agent-tools.json` for all 24 source agents + orchestrator defaults
    - Reuse: Cursor destructive-command whitelist agent names from hooks
    - No `tools:` frontmatter in source MD (per spec)
  - [x] 2.3 Implement full `generate-agent-json.sh` contract
    - Input: `agents/<stem>.md` with YAML frontmatter (`name`, `description`, `model`, `color`)
    - Output per agent: `agents/maister-<stem>.json`, `agents/instructions/maister-<stem>.md`
    - `resources` from frontmatter `skills:` → `skill://.kiro/skills/maister-*/SKILL.md`
    - `toolsSettings.subagent.trustedAgents` for orchestrator-class agents
    - bash + jq; document Node escape hatch threshold (~100 lines)
  - [x] 2.4 Add golden fixture: `platforms/kiro-cli/tests/fixtures/gap-analyzer.{md,expected.json}`
  - [x] 2.5 Wire generator invocation in `build.sh` step 17 (callable function; full pipeline integration in Group 6)
  - [x] 2.6 Remove source `agents/*.md` from OUT after JSON generation
  - [x] 2.7 Ensure generator tests pass
    - Run ONLY the 2–8 tests from 2.1

**Acceptance Criteria:**
- All 24 agents convert to valid JSON + instructions
- Golden-file `gap-analyzer` matches expected schema
- `agent-tools.json` covers every converted agent
- Generator runs post-transform only (documented in build.sh comment)

---

### Task Group 3: Build Pipeline Core — Copy, Naming, Commands→Skills, Rename

**Dependencies:** Group 1  
**Files to Modify:** `platforms/kiro-cli/build.sh`, `platforms/kiro-cli/overrides/commands/quick-plan.md`, `platforms/kiro-cli/overrides/skills/quick-bugfix/SKILL.md` (copy from Cursor, pre–chat-gate)

**Estimated Steps:** 8

- [x] 3.0 Complete build pipeline core (steps 1–6, 11 partial)
  - [x] 3.1 Write 2–8 focused tests for build core
    - Test: 8 command files merged into `skills/maister-*/SKILL.md`; `commands/` absent
    - Test: exactly 22 skill directories after full core build
    - Test: no `skills/<unprefixed>/` directories (14 renamed to `maister-*`)
    - Test: each `SKILL.md` `name:` matches parent directory (rule 13)
    - Test: no `maister:` in output tree (rule 2)
    - Test: no colons in skill `name:` frontmatter (rule 3)
    - Test: `.mcp.json` moved to `settings/mcp.json` (rule 9)
    - Test: merged `quick-plan` skill dir is `skills/maister-quick-plan/`
  - [x] 3.2 Implement build steps 1–2: copy, remove `.claude-plugin/`, keep `agents/*.md` until step 17
  - [x] 3.3 Implement step 3–4: skill/command `name:` prefix + global `maister:` → `maister-`
  - [x] 3.4 Implement step 5: `merge_commands_to_skills()` — 8 commands per mapping table in spec
  - [x] 3.5 Implement step 6: `rename_skill_directories()` for 14 source skills
  - [x] 3.6 Implement step 11: `.mcp.json` → `settings/mcp.json`
  - [x] 3.7 Copy Cursor overrides (quick-plan, quick-bugfix) as base — chat-gate adapt deferred to Group 4
  - [x] 3.8 Ensure build core tests pass
    - Run ONLY the 2–8 tests from 3.1

**Acceptance Criteria:**
- 22 skill directories, all `maister-*` prefixed
- Zero `commands/` in output
- MCP at `settings/mcp.json`
- Skill directory names match frontmatter `name:`

---

### Task Group 4: Chat-Native Gate Transforms (T4)

**Dependencies:** Group 3  
**Files to Modify:** `platforms/kiro-cli/build.sh`, `platforms/kiro-cli/transforms/askuser-to-chat-gate.md`, `platforms/kiro-cli/overrides/skills/development/SKILL.md`, `platforms/kiro-cli/overrides/commands/quick-plan.md`, `platforms/kiro-cli/overrides/skills/quick-bugfix/SKILL.md`

**Estimated Steps:** 7

- [x] 4.0 Complete chat-native gate transforms
  - [ ] 4.1 Write 2–8 focused tests for chat gates
    - Test: zero `AskUserQuestion` in output (rule 11/25)
    - Test: zero `AskQuestion` in output
    - Test: `transforms/askuser-to-chat-gate.md` exists (rule 27)
    - Test: orchestrator `development/SKILL.md` contains `CHAT GATE` where source had gates (rule 26 spot-check)
    - Test: headless defaults table documented in transform doc (3B)
    - Test: multi-select patterns rewritten to sequential single-choice (3C) in at least one file
    - Test: `→ Pause` / `MANDATORY GATE` → `→ **CHAT GATE**` in sample orchestrator file
  - [ ] 4.2 Create `transforms/askuser-to-chat-gate.md` — pattern catalog (3A+3B+3C)
  - [ ] 4.3 Implement `apply_chat_gate_transforms()` in `build.sh` (step 8)
    - Scoped glob: all `*.md` under OUT before JSON generation
    - Gate instruction template (3A) injection
    - Preserve code fence structure
  - [ ] 4.4 Adapt Cursor overrides for chat gates: `development/SKILL.md`, `quick-plan.md`, `quick-bugfix/SKILL.md`
  - [ ] 4.5 Apply step 9 partial: strip EnterPlanMode/ExitPlanMode; copy chat-gate-adapted overrides
  - [ ] 4.6 Grep audit: compare source vs output gate counts (document exceptions)
  - [ ] 4.7 Ensure chat gate tests pass
    - Run ONLY the 2–8 tests from 4.1

**Acceptance Criteria:**
- Zero `AskUserQuestion` / `AskQuestion` in output
- `CHAT GATE` markers present in orchestrator-class skills
- Transform doc is binding reference for maintainers
- Overrides applied for high-churn orchestrator files

---

### Task Group 5: Delegation, Todo & Explore Transforms (T5–T8, T16)

**Dependencies:** Group 3  
**Files to Modify:** `platforms/kiro-cli/build.sh`, `platforms/kiro-cli/transforms/task-to-kiro-todo.md`, `platforms/kiro-cli/patches/orchestrator-patterns-todo.md`

**Estimated Steps:** 7

- [x] 5.0 Complete delegation and todo transforms
  - [ ] 5.1 Write 2–8 focused tests for delegation/todo
    - Test: zero `TaskCreate` / `TaskUpdate` in output (rule 20)
    - Test: zero `subagent_type="Explore"` / capitalized Explore (rule 12)
    - Test: `Task` tool references rewritten to `subagent` in sample agent instruction
    - Test: `Skill` tool references rewritten to `/maister-*` slash semantics
    - Test: `apply_todo_transforms()` applied to orchestrator glob (mirror Cursor TODO_GLOB)
    - Test: `orchestrator-patterns-todo.md` appended to orchestrator-patterns reference
    - Test: `user-invocable: false` stripped from 5 internal skills (T16)
  - [ ] 5.2 Implement step 7: Explore → `maister-explore` references in all `*.md`
  - [ ] 5.3 Implement step 13: `Task` → `subagent`, `Skill tool` → slash + `skill://` semantics
  - [ ] 5.4 Implement step 14: `apply_todo_transforms()` + Kiro mappings per `task-to-kiro-todo.md`
  - [ ] 5.5 Create `transforms/task-to-kiro-todo.md` and `patches/orchestrator-patterns-todo.md` (adapt from Cursor)
  - [ ] 5.6 Implement step 15: strip `user-invocable: false` from skill frontmatter
  - [ ] 5.7 Ensure delegation/todo tests pass
    - Run ONLY the 2–8 tests from 5.1

**Acceptance Criteria:**
- No banned Claude Code APIs in `.md` bodies pre-JSON
- Todo transform glob matches spec (orchestrator-framework, development, agents, steering, etc.)
- Explore references point to `maister-explore`
- `orchestrator-state.yml` remains SOT wording preserved

---

### Task Group 6: Build Pipeline Completion — Steering, Init, Hooks, Orchestrator Synthesis

**Dependencies:** Groups 2, 4, 5  
**Files to Modify:** `platforms/kiro-cli/build.sh`, `platforms/kiro-cli/templates/agents-md-template.md`, `platforms/kiro-cli/templates/steering-maister-docs.md`, `platforms/kiro-cli/hooks/*.sh`, `platforms/kiro-cli/templates/maister.json.tpl` (or inline synthesis), `plugins/maister-kiro/README.md` (generated)

**Estimated Steps:** 10

- [x] 6.0 Complete full build pipeline (steps 10, 12, 16–21)
  - [ ] 6.1 Write 2–8 focused tests for build completion
    - Test: `steering/maister-workflows.md` exists with Kiro platform section (rule 10)
    - Test: `agents/maister.json` exists with `hooks` field (rule 17)
    - Test: `agents/maister-explore.json` exists (rule 18)
    - Test: exactly 26 JSON agents (24 converted + 2 synthetic)
    - Test: no standalone `hooks/hooks.json` (rule 15)
    - Test: hook scripts in `hooks/` are executable (rule 22 — wire in Group 9 if hooks incomplete)
    - Test: init skill references `.kiro/steering/maister-docs.md` and `AGENTS.md`
    - Test: full `make build-kiro` completes steps 0–21 without error
  - [ ] 6.2 Implement step 10: `CLAUDE.md` → `AGENTS.md` in skills
  - [ ] 6.3 Implement step 12: plugin `CLAUDE.md` → `steering/maister-workflows.md` + Kiro platform section
  - [ ] 6.4 Copy/adapt templates from Cursor: `agents-md-template.md`, `steering-maister-docs.md`
  - [ ] 6.5 Implement step 16: init/docs-manager patches (`.kiro/steering/maister-docs.md`, AGENTS.md template)
  - [ ] 6.6 Run step 17: full `generate-agent-json.sh` for all 24 agents
  - [ ] 6.7 Implement step 18: synthesize `maister.json` (orchestrator) + `maister-explore.json`
    - Embedded hooks with `../hooks/*.sh` paths
    - `resources`: all 22 skills via `skill://.kiro/skills/maister-*/SKILL.md`
    - `toolsSettings.subagent.trustedAgents`: `["maister-*"]`
    - Name field `"maister"` (ADR-011)
  - [ ] 6.8 Implement steps 19–21: copy hooks (Phase 1 set), chmod +x, `.hook-state/`, emit `README.md`
    - Phase 1 hooks: `block-destructive-commands-kiro.sh`, `subagent-spawn-tracker.sh`, `subagent-complete-cleanup.sh`
  - [ ] 6.9 Manual commit checkpoint: `plugins/maister-kiro/` after green partial validate
  - [ ] 6.10 Ensure build completion tests pass
    - Run ONLY the 2–8 tests from 6.1

**Acceptance Criteria:**
- Full 22-step build order per spec (semantic transforms before JSON generation)
- 26 JSON agents, 22 skills, steering files, Phase 1 hooks
- `maister.json` is user-facing orchestrator (`chat --agent maister`)
- Generated artifact reproducible via `make build-kiro` only

---

### Task Group 7: validate-kiro — Structural Rules 1–28

**Dependencies:** Group 6  
**Files to Modify:** `Makefile` (`validate-kiro` target)

**Estimated Steps:** 6

- [x] 7.0 Complete validate-kiro structural checks
  - [ ] 7.1 Write 2–8 focused tests for validation target
    - Test: `make validate-kiro` fails when output missing (rule 1 negative)
    - Test: `make validate-kiro` passes after full build (rules 1–20 minimum)
    - Test: inject `AskUserQuestion` into fixture → validate fails (rule 11)
    - Test: inject `maister:` → validate fails (rule 2)
    - Test: `jq empty` on all `agents/*.json` (rule 7)
    - Test: skill count exactly 22 (rule 14/28)
    - Test: `CHAT GATE` count check (rule 26) — documented threshold
    - Test: rules 21–24 pass after Group 9 (defer if needed; stub with TODO in Makefile)
  - [ ] 7.2 Implement `validate-kiro` rules 1–20 in `Makefile` (mirror `validate-cursor` style)
  - [ ] 7.3 Implement rules 21–24 (trustedAgents, executable hooks, 9 prompts, wrapper exists) — may require Group 9 artifacts; add conditional or split
  - [ ] 7.4 Implement rules 25–28 (chat gate bans, transform doc, CHAT GATE count, 22 dirs)
  - [ ] 7.5 Extend aggregate `validate: validate-copilot validate-cursor validate-kiro`
  - [ ] 7.6 Ensure validation tests pass
    - Run ONLY the 2–8 tests from 7.1

**Acceptance Criteria:**
- All 28 validate rules implemented and documented in Makefile comments
- `make validate` includes Kiro; CI `release.yml` picks up automatically
- Fail-fast grep/jq checks with clear FAIL messages

---

### Task Group 8: Smoke Install & Headless CLI (Phase 1)

**Dependencies:** Groups 6, 7  
**Files to Modify:** `platforms/kiro-cli/smoke-install.sh`, `platforms/kiro-cli/smoke-cli.sh`, `platforms/kiro-cli/maister-kiro`

**Estimated Steps:** 7

- [x] 8.0 Complete Phase 1 smoke and distribution scripts
  - [ ] 8.1 Write 2–8 focused tests for smoke layer
    - Test: `smoke-install.sh --help` or dry-run copies to temp `KIRO_HOME` without touching `~/.kiro/`
    - Test: `maister-kiro` wrapper sets `KIRO_HOME` default `~/.kiro-maister`
    - Test: `smoke-cli.sh` test 1 PASS — maister-init skill detection (headless)
    - Test: `smoke-cli.sh` test 2 PASS — subagent `maister-gap-analyzer` delegation
    - Test: `smoke-cli.sh` test 3 PASS — quick-plan writes `.maister/plans/*.md`
    - Test: headless mode uses documented gate defaults (no hang)
    - Test: ephemeral `KIRO_HOME` + workspace `.kiro/` copy pattern works
  - [ ] 8.2 Implement `smoke-install.sh` (`set -euo pipefail`)
    - `make build-kiro`; copy tree → `$KIRO_HOME` (default `~/.kiro-maister`)
    - Flags: `--set-default` / `--no-default` (default N), `--set-alias`, optional `DEST`
  - [ ] 8.3 Implement `maister-kiro` wrapper: `KIRO_HOME="${KIRO_HOME:-$HOME/.kiro-maister}" exec kiro-cli "$@"`
  - [ ] 8.4 Implement `smoke-cli.sh` — three headless tests per spec
    - Runner: `kiro-cli chat --no-interactive --trust-all-tools --agent maister`
    - Prerequisites check: `kiro-cli` in PATH; optional `KIRO_API_KEY`
  - [ ] 8.5 Document headless defaults table in smoke prompt strings (3B linkage)
  - [ ] 8.6 Exit criteria gate: `make build-kiro && make validate-kiro && bash platforms/kiro-cli/smoke-cli.sh`
  - [ ] 8.7 Ensure smoke tests pass
    - Run ONLY the 2–8 tests from 8.1

**Acceptance Criteria:**
- `smoke-install.sh` installs isolated profile
- `smoke-cli.sh` passes all 3 headless tests
- Personal `~/.kiro/` never modified
- Wrapper enables `maister-kiro chat --agent maister`

---

### Task Group 9: Phase 2 — Hooks Polish, @prompts, Uninstall & UX

**Dependencies:** Group 8  
**Files to Modify:** `platforms/kiro-cli/hooks/skill-invocation-reminder.sh`, `platforms/kiro-cli/hooks/post-compact-reminder-stub.sh`, `platforms/kiro-cli/prompts/*.md` (9 files), `platforms/kiro-cli/smoke-uninstall.sh`, `platforms/kiro-cli/build.sh` (step 20), `agents/maister.json` synthesis (hook path fallback), `README.md` (repo root, Kiro section stub)

**Estimated Steps:** 8

- [x] 9.0 Complete Phase 2 UX layer
  - [ ] 9.1 Write 2–8 focused tests for Phase 2
    - Test: 9 files in `plugins/maister-kiro/prompts/` (rule 23)
    - Test: `maister.json` contains `trustedAgents` in toolsSettings (rule 21)
    - Test: all hook scripts executable (rule 22)
    - Test: `maister-kiro` exists in `platforms/kiro-cli/` (rule 24)
    - Test: `skill-invocation-reminder.sh` wired to agentSpawn + userPromptSubmit events
    - Test: `@dev` prompt content maps to `/maister-development`
    - Test: absolute `$KIRO_HOME/hooks/` fallback documented if relative paths fail smoke
    - Test: `smoke-uninstall.sh` removes `$KIRO_HOME`
  - [ ] 9.2 Complete hook set in `maister.json`: agentSpawn, userPromptSubmit reminders
  - [ ] 9.3 Empirical hook path resolution; absolute fallback in JSON if `../hooks/*.sh` fails
  - [ ] 9.4 Create 9 `@prompts` files: init, dev, research, plan, design, status, next, resume, bye
  - [ ] 9.5 Implement `post-compact-reminder-stub.sh` + steering docs for preCompact gap
  - [ ] 9.6 MCP settings empirical test; document working key (`includeMcpJson` vs `useLegacyMcpJson`)
  - [ ] 9.7 Implement `smoke-uninstall.sh`; README Kiro install block (mirror Cursor)
  - [ ] 9.8 Ensure Phase 2 tests pass
    - Run ONLY the 2–8 tests from 9.1

**Acceptance Criteria:**
- All validate rules 21–24 pass
- Hooks execute in smoke (destructive bash blocked for non-whitelisted subagents)
- `@dev` invokes development workflow
- preCompact gap documented only (no false parity claim)

---

### Task Group 10: Phase 3 — E2E Verification

**Dependencies:** Group 9  
**Files to Modify:** `docs/kiro-cli-support.md` (E2E matrix section), `platforms/kiro-cli/smoke-cli.sh` (extensions optional)

**Estimated Steps:** 6

- [x] 10.0 Complete E2E verification matrix
  - [ ] 10.1 Write 2–8 focused tests for E2E scenarios
    - Test: scenario 1 — `/maister-init` headless with defaults creates `AGENTS.md`, `.maister/docs/INDEX.md`, `.kiro/steering/maister-docs.md`
    - Test: scenario 2 — `/maister-development` updates todo mirror (best-effort)
    - Test: scenario 3 — resume `[task-path] [--from=PHASE]` reads `orchestrator-state.yml`
    - Test: scenario 5 — gap-analyzer delegation via `subagent`
    - Test: scenario 6 — quick-plan + quick-bugfix with chat gate overrides
    - Test: scenario 8 — 26 agents discoverable (grep/json inventory)
    - Test: scenario 2a — interactive gate UX (manual checklist item, not automatable)
    - Test: scenario 4 — parallel subagent waves (document max 4 concurrent)
  - [ ] 10.2 Adapt 8 scenarios from `docs/cursor-e2e-checklist.md` to Kiro
  - [ ] 10.3 Run headless scenarios via `smoke-cli.sh` extensions or documented manual commands
  - [ ] 10.4 Manual session: scenario 2a interactive gate pause until user reply
  - [ ] 10.5 Document pass/fail matrix in `docs/kiro-cli-support.md` (draft section)
  - [ ] 10.6 Ensure automatable E2E tests pass
    - Run ONLY the 2–8 tests from 10.1 (skip 2a manual)

**Acceptance Criteria:**
- Documented pass/fail matrix for all 8 scenarios (+ 2a manual)
- Headless paths covered in smoke or scripted checks
- Known gaps (preCompact, todo experimental, max 4 subagents) recorded

---

### Task Group 11: Phase 4 — Documentation & Release

**Dependencies:** Group 10 (E2E matrix); may start after Group 9 for doc drafts  
**Files to Modify:** `docs/kiro-cli-support.md`, `README.md`, `CLAUDE.md`, `docs/cursor-agent-support.md`, `.maister/docs/standards/global/build-pipeline.md`, `.maister/docs/project/tech-stack.md`, `.maister/docs/standards/global/plugin-development.md`, `plugins/maister-kiro/` (manual commit)

**Estimated Steps:** 7

- [x] 11.0 Complete documentation and release integration
  - [ ] 11.1 Write 2–8 focused tests for release readiness
    - Test: `make build && make validate` passes all three platforms
    - Test: `docs/kiro-cli-support.md` exists with install, daily use, known gaps sections
    - Test: README contains Kiro CLI install block
    - Test: `build-pipeline.md` includes Kiro naming, layout, API bans
    - Test: `tech-stack.md` lists fourth platform
    - Test: `plugin-development.md` documents never-edit `maister-kiro` rule
    - Test: `.github/workflows/release.yml` runs `make build && make validate` (verify no change needed)
    - Test: `plugins/maister-kiro/` committed and reproducible from `make build-kiro`
  - [ ] 11.2 Publish `docs/kiro-cli-support.md` — full platform guide
  - [ ] 11.3 Update standards: `build-pipeline.md`, `plugin-development.md`, `tech-stack.md`
  - [ ] 11.4 Update `README.md`, `CLAUDE.md`, cross-link from `docs/cursor-agent-support.md`
  - [ ] 11.5 Manual commit: `platforms/kiro-cli/` + `plugins/maister-kiro/`
  - [ ] 11.6 Verify tag release path: `make build && make validate` green
  - [ ] 11.7 Ensure release readiness tests pass
    - Run ONLY the 2–8 tests from 11.1

**Acceptance Criteria:**
- All documentation published and cross-linked
- Generated artifact committed manually (Cursor parity)
- CI release workflow validates Kiro without workflow edits
- Standards reflect Kiro API bans and layout contract

---

### Task Group 12: Test Review & Gap Analysis

**Dependencies:** All previous groups (1–11)  
**Files to Modify:** `platforms/kiro-cli/tests/` (optional consolidated fixtures), `Makefile` (if gap fixes needed)

**Estimated Steps:** 5

- [x] 12.0 Review and fill critical test gaps
  - [x] 12.1 Review tests from previous groups (~22–44 existing structural/smoke checks)
  - [x] 12.2 Analyze gaps for THIS feature only (generator edge cases, hook path fallback, chat gate exceptions)
  - [x] 12.3 Write up to 10 additional strategic tests
    - Examples: malformed frontmatter agent, empty skills list, hook exit 2 destructive block, resume `--from=PHASE` state file fixture
  - [x] 12.4 Run feature-specific tests only (validate-kiro + smoke-cli + golden fixtures)
  - [x] 12.5 Document test inventory in `platforms/kiro-cli/README.md`

**Acceptance Criteria:**
- All feature tests pass (~16–34 total, max 10 added in this group)
- No full unrelated suite run
- Critical path: build → validate → smoke → E2E matrix

---

## Execution Order

| Order | Group | Steps | Depends on |
|-------|-------|-------|------------|
| 1 | G1 Phase 0 Scaffold | 6 | — |
| 2a | G2 MD→JSON Generator | 7 | G1 |
| 2b | G3 Build Core | 8 | G1 |
| 3a | G4 Chat Gates | 7 | G3 |
| 3b | G5 Delegation/Todo | 7 | G3 |
| 4 | G6 Build Completion | 10 | G2, G4, G5 |
| 5 | G7 validate-kiro | 6 | G6 |
| 6 | G8 Smoke/CI Phase 1 | 7 | G6, G7 |
| 7 | G9 Phase 2 UX | 8 | G8 |
| 8 | G10 E2E | 6 | G9 |
| 9 | G11 Docs/Release | 7 | G10 |
| 10 | G12 Test Review | 5 | G1–G11 |

**Parallelization:** G2 and G3 after G1; G4 and G5 after G3.

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- **global/build-pipeline.md** — bash fail-fast, `sedi()`, CI build+validate gate, no manual edits to `plugins/maister-kiro/`
- **global/plugin-development.md** — source-only edits in `plugins/maister/`; kebab-case; SKILL.md SOT
- **global/conventions.md** — spec-before-implementation; never hand-edit generated artifact
- **global/validation.md** — structural validation at build boundary
- **testing/test-writing.md** — `make validate`, CLI smoke, risk-based coverage on generator and chat gates

---

## Complexity Summary

| Area | Complexity | Rationale |
|------|------------|-----------|
| Phase 0 scaffold | Low | Copy Cursor Makefile/build stub pattern |
| MD→JSON generator | **High** | Net-new; 24 agents; jq frontmatter parsing; golden files |
| Commands→skills merge | **High** | Net-new step; 8 mappings; discovery validation |
| Chat-native gates | **High** | ~230 refs; no sed rename; overrides + mechanical transforms |
| Orchestrator synthesis | **High** | Embedded hooks, resources, trustedAgents; path resolution |
| Todo/delegation transforms | Medium | Adapt Cursor `apply_todo_transforms()` pattern |
| validate-kiro | Medium | 28 grep/jq rules; mirror Cursor |
| Smoke/CI | Medium | Kiro CLI availability; headless defaults |
| @prompts + Phase 2 UX | Low–Medium | 9 template files; hook polish |
| E2E + docs | Low–Medium | Adapt existing Cursor checklist and docs |

**Estimated calendar effort:** ~1.5–2.5 weeks (per gap analysis), with Phase 1 (Groups 2–8) as the bulk.

---

## Notes

- **Test-driven:** Each group starts with 2–8 focused tests; ends by running only those tests.
- **Run incrementally:** After each group, `make build-kiro && make validate-kiro` before proceeding.
- **Mark progress:** Check off steps in this plan as completed during `/maister-development` execution.
- **Reuse first:** Cursor `build.sh`, overrides, templates, hooks, smoke scripts are primary references.
- **Enforcement:** Zero Kiro-specific edits in `plugins/maister/`; all logic under `platforms/kiro-cli/`.
- **C1 ordering:** All semantic transforms on `.md` complete before `generate-agent-json.sh` (step 17).
- **Manual commit:** `plugins/maister-kiro/` committed like `maister-cursor`; no auto-commit CI required.
