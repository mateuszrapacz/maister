# Requirements: Kiro CLI Support for Maister

**Date:** 2026-06-07  
**Task path:** `.maister/tasks/development/2026-06-07-kiro-cli-support`

## Initial Description

Implement full Kiro CLI platform support for Maister based on completed research — multi-platform build pipeline (`plugins/maister` → `platforms/kiro-cli/build.sh` → `plugins/maister-kiro`), Kiro CLI API mapping (skills, agents JSON, hooks, steering, MCP, subagents), Makefile/validate/smoke/CI, tool/name transforms, init workflow integration.

## Research Foundation

- Research task: `.maister/tasks/research/2026-06-07-kiro-cli-support`
- Research question: Jak przygotować implementację wsparcia kiro-cli analogicznie do Cursor, Copilot i Claude Code?
- Confidence: medium
- Artifacts: `research-report.md`, `high-level-design.md`, `decision-log.md`, `solution-exploration.md`, `grill-decisions.md`

## Q&A from Clarification Rounds

### Phase 1 Clarifications

| Topic | Decision |
|-------|----------|
| Scope | Full Phases 0–4 |
| todo transforms | Include in this task |
| Per-agent tools | `agent-tools.json` lookup table |
| CI commit | Manual commit (Cursor parity) |
| KIRO_HOME | Isolated `~/.kiro-maister` + `maister-kiro` wrapper |

### Phase 2 Scope Decisions

| Topic | Decision |
|-------|----------|
| Hook paths | Empirical test, absolute fallback |
| Orchestrator | `agents/maister.json`, `name: maister` |
| Agent bodies | `agents/instructions/` |
| Default agent install | `--set-default` opt-in, default N |
| Internal skills | Accept extra slashes in MVP |
| Generator | bash+jq + Node escape hatch |
| Headless gates | Documented defaults + smoke bypass |
| MCP settings | Empirical smoke test |

### Phase 5 Requirements Gathering

**User journey (confirmed):** Install via `smoke-install.sh` → `~/.kiro-maister`; run `maister-kiro chat --agent maister`; invoke `/maister-init`, `/maister-development`, @prompts; CI uses ephemeral KIRO_HOME + workspace `.kiro/` copy.

**Code reuse (clarified):** Platform evolution is Claude Code (`plugins/maister/`) as source of truth → Copilot CLI (first variant) → Cursor Agent (richest template). Kiro follows the **Cursor build pattern** as primary implementation reference while respecting that **all content originates from Claude Code SOT** — never edit `plugins/maister/` for Kiro-specific concerns.

**Visual assets:** None — CLI/build-pipeline task, no UI mockups.

## Similar Features / Patterns to Reference

| Feature | Path | Reuse |
|---------|------|-------|
| Claude Code SOT | `plugins/maister/` | Source only — zero platform edits |
| Copilot CLI (1st variant) | `platforms/copilot-cli/build.sh` | Baseline copy/sedi pattern, instruction file mapping |
| Cursor Agent (latest) | `platforms/cursor/build.sh` | Primary template — hooks, overrides, todo transforms, smoke |
| Cursor validation | `Makefile` `validate-cursor` | Pattern for `validate-kiro` |
| Cursor smoke | `platforms/cursor/smoke-*.sh` | Install + headless CLI test structure |
| Grill decisions | `planning/grill-decisions.md` | ADR-010–016 binding inputs |

## Functional Requirements Summary

### FR-1: Build Pipeline (Phase 0–1)

- Create `platforms/kiro-cli/build.sh` generating `plugins/maister-kiro/`
- Implement `generate-agent-json.sh` — 24 source agents → JSON + 2 synthetic (`maister-explore`, `maister` orchestrator) = 26 total
- Merge 8 commands into skills (22 skill directories total)
- Apply semantic transforms: `maister:` → `maister-`, `Task` → `subagent`, `AskUserQuestion` → chat gates, `TaskCreate`/`TaskUpdate` → `todo`
- Embed hooks in `agents/maister.json`
- Output: skills/, agents/, steering/, hooks/, settings/mcp.json — no commands/, no plugin manifest

### FR-2: Distribution (Phase 1–2)

- `KIRO_HOME=~/.kiro-maister` isolated profile
- `maister-kiro` wrapper script
- `smoke-install.sh` — global install with `--set-default` opt-in (default N)
- `smoke-cli.sh` — headless smoke tests
- Hybrid: global install + workspace `.kiro/` copy for CI

### FR-3: @prompts Layer (Phase 2)

- `$KIRO_HOME/prompts/`: `@init`, `@dev`, `@research`, `@plan`, `@design`, `@status`, `@next`, `@resume`, `@bye`

### FR-4: Init Integration (Phase 1–2)

- `project/.kiro/steering/maister-docs.md` + `AGENTS.md` + `.maister/`
- Patch `skills/init/SKILL.md` at build time

### FR-5: Makefile & Validation (Phase 0–1)

- `build-kiro`, `validate-kiro`, `clean-kiro`
- Extend aggregate `build`, `validate`, `clean`
- Structural grep/jq checks analogous to `validate-cursor`

### FR-6: Hooks (Phase 1–2)

- Adapt Cursor hook scripts for Kiro `preToolUse` semantics
- Empirical hook path resolution with absolute fallback
- Destructive command guard, subagent tracking, skill invocation reminder

### FR-7: Progress Tracking (Phase 1 — included per binding)

- `orchestrator-state.yml` remains SOT
- `todo` tool transforms for orchestrator skills (parity with Cursor TodoWrite)
- Ban `TaskCreate`/`TaskUpdate` in generated output

### FR-8: Documentation (Phase 2–4)

- README Kiro section
- `docs/kiro-cli-support.md` (new)
- Update `build-pipeline.md`, `plugin-development.md`, `tech-stack.md`

### FR-9: E2E Verification (Phase 3)

- 8 scenarios adapted from `docs/cursor-e2e-checklist.md`
- Interactive gate UX + headless smoke paths

### FR-10: Release (Phase 4)

- Manual commit of `plugins/maister-kiro/`
- `release.yml` validates via `make build && make validate`

## Reusability Opportunities

- Copy `sedi()`, path vars, numbered step structure from `platforms/cursor/build.sh`
- Reuse `overrides/commands/quick-plan.md` and `overrides/skills/quick-bugfix/SKILL.md`
- Reuse `templates/agents-md-template.md`
- Adapt `apply_todo_transforms()` pattern for Kiro `todo` tool
- Adapt `transforms/task-to-todo.md` → `transforms/task-to-kiro-todo.md`

## Scope Boundaries

### In Scope

- Full Phases 0–4 per research plan
- todo transforms in this task
- All 24 agents + orchestrator + explore synthetic agent
- All 14 skills + 8 commands merged
- Smoke install/uninstall scripts
- README and standards docs updates

### Out of Scope

- Edits to `plugins/maister/` for platform-specific content (except optional future `tools:` frontmatter — rejected; use lookup table)
- Kiro IDE-only features
- Public Kiro marketplace (no manifest)
- CI auto-commit (manual per user decision)
- Amazon Q Developer migration guide

## Technical Considerations

- **agent-tools.json:** Role → Kiro tool whitelist lookup; no source MD changes
- **Generator risk:** bash+jq frontmatter parser; Node escape hatch if fragile
- **API gaps:** No `AskQuestion`, no built-in `explore`, `todo` experimental
- **Hook uncertainty:** Empirical validation required in smoke
- **MCP:** Empirical test for `includeMcpJson` vs `useLegacyMcpJson`
- **Parallel subagents:** Kiro max 4 concurrent — may affect implementation executor waves

## Assumptions

1. `kiro-cli` binary available locally for smoke tests
2. `jq` available in build environment
3. Research ADRs (010–016) are binding unless superseded by Phase 2 decisions
4. Generated `plugins/maister-kiro/` committed manually like `maister-cursor`
5. No changes to Claude Code marketplace manifests for Kiro
