# System Architecture

## Overview

Maister is one cohesive, multi-platform product implemented as a single canonical plugin plus deterministic platform adapters. Workflow behavior is primarily documentation-as-code: skills, agents, commands, references, standards, and YAML state contracts describe how an AI coding host should execute structured software-delivery work.

## Architecture Pattern

**Pattern**: Single-source, multi-target plugin transformation and distribution pipeline

The canonical Claude-oriented plugin under `plugins/maister/` is the source of truth. Adapter scripts translate that source into committed Cursor, Kiro, and Codex variants. The generated trees are distribution artifacts and must not be edited directly. Host-specific differences are made explicit in `platforms/`, where tool vocabulary, naming, manifests, hooks, instructions, agent representation, and continuation behavior are adapted to native contracts.

## System Structure

### Canonical Plugin

- **Location**: `plugins/maister/`
- **Purpose**: Defines skills, agents, thin commands, hooks, MCP configuration, references, and canonical plugin metadata
- **Key files**: `plugins/maister/CLAUDE.md`, `plugins/maister/.claude-plugin/plugin.json`, `plugins/maister/skills/*/SKILL.md`

### Platform Adapters

- **Location**: `platforms/cursor/`, `platforms/kiro-cli/`, `platforms/codex-cli/`
- **Purpose**: Transform the canonical plugin into host-native layouts and terminology
- **Key files**: Each platform's `build.sh` plus its templates, rules, manifests, and validation helpers

### Generated Variants

- **Location**: `plugins/maister-cursor/`, `plugins/maister-kiro/`, `plugins/maister-codex/`
- **Purpose**: Committed, installable artifacts for their respective hosts
- **Ownership rule**: Regenerate from canonical sources and adapters; never modify directly

### Orchestration Framework

- **Location**: `plugins/maister/skills/orchestrator-framework/`
- **Purpose**: Defines shared phase, gate, state, continuation, dashboard, and safety behavior
- **Key files**: `references/orchestrator-patterns.md`, `references/gate-decision-engine.md`, `bin/phase-continue.mjs`

### Workflow Skills and Agents

- **Location**: `plugins/maister/skills/`, `plugins/maister/agents/`, `plugins/maister/commands/`
- **Purpose**: Implement user-invocable workflows, internal engines, read-only review roles, and thin command entry points
- **Design rule**: Orchestration lives in `SKILL.md`; commands remain thin delegators

### Build, Validation, and Release

- **Location**: `Makefile`, `tests/`, `.github/workflows/`
- **Purpose**: Generate variants, detect drift, run contract and smoke tests, validate manifests, and publish tagged releases

## Data and Control Flow

### Build Flow

1. Maintainers edit `plugins/maister/` or a platform adapter under `platforms/`.
2. `make build` runs platform-specific transformations.
3. Generated Cursor, Kiro, and Codex trees are replaced with native artifacts.
4. `make validate` and CI compare committed outputs with fresh builds and run structural/contract checks.
5. Synchronized semantic versions are released through marketplace and tag automation.

### Workflow Execution Flow

1. A user invokes a Maister workflow skill on a supported host.
2. The orchestrator classifies the task and creates phase records in `orchestrator-state.yml`.
3. Skills and agents perform bounded phase work using project standards from `.maister/docs/`.
4. Gate decisions are persisted immediately; protected decisions remain explicit user gates.
5. Markdown reports and optional dashboards are generated as projections of authoritative state.
6. Host continuation capabilities may resume eligible phases without changing the safety policy.

### Advisor and Arbiter Flow

1. A gate policy determines whether the decision is manual, Advisor-assisted, or fully automatic.
2. The read-only Advisor analyzes the gate context with bounded retry behavior.
3. If configured and disagreement occurs, one logical read-only Arbiter resolves the decision.
4. Hard-denylisted gates cannot be automated by configuration.
5. The final decision and provenance are written to `orchestrator-state.yml` before continuation.

## External Integrations

- Claude Code plugin and marketplace APIs
- Codex CLI/IDE plugin, skills, agents, and local marketplace conventions
- Cursor Agent plugin/CLI and MDC rules
- Kiro CLI custom agents and skills
- GitHub Actions and GitHub Releases
- Optional Playwright MCP for browser verification

## Persistence Model

There is no database. Consumer projects store workflow state and task artifacts under `.maister/tasks/`. `orchestrator-state.yml` is the only resume source of truth; dashboards and reports must never be used as authoritative state.

## Configuration

- `.maister/config.yml` controls project-local output and Advisor policies.
- Host-specific manifests and MCP configuration live in canonical or generated plugin layouts.
- Codex Advisor configuration is reconciled into `.codex/agents/advisor.toml` as an atomic companion to project configuration.
- Safety-sensitive configuration is allowlisted, canonicalized, and rejected on ambiguity.

## Deployment Architecture

Maister is distributed as plugin files rather than a hosted service. Platform-specific build outputs are installed locally or delivered through their host marketplace mechanisms. GitHub Actions validates generated artifacts and creates tagged release assets. No container or cloud runtime is required.

---

*Based on codebase analysis performed 2026-07-13.*
