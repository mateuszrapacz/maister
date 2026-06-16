# Phase 1 Clarifications

**Date:** 2026-06-07

## Task Description

Implement Kiro CLI platform support for Maister based on completed research (`.maister/tasks/research/2026-06-07-kiro-cli-support`).

## Clarifying Questions & Answers

### Q1: Implementation scope

**Question:** What implementation scope should this development task target?

**Answer:** **Full Phases 0–4** — complete Kiro support including todo transforms, hooks polish, CI auto-commit, README/docs.

### Q2: todo tool timing

**Question:** When should Kiro `todo` tool transforms be included?

**Answer:** **Include todo transforms in this task** — full Cursor TodoWrite parity via Kiro todo tool.

### Q3: Per-agent tool whitelists

**Question:** How should per-agent Kiro tool whitelists be determined?

**Answer:** **agent-tools.json lookup table** — maintain role→tools mapping in `platforms/kiro-cli/` (research 6A decision).

### Q4: CI commit strategy

**Question:** How should generated `plugins/maister-kiro/` be committed?

**Answer:** **Manual commit** — developer runs `make build-kiro &&` commits (like Cursor today).

### Q5: KIRO_HOME install profile

**Question:** Confirm KIRO_HOME install profile strategy?

**Answer:** **Isolated profile** — `KIRO_HOME=~/.kiro-maister` + `maister-kiro` wrapper script.

## Confirmed Assumptions

- Source of truth remains `plugins/maister/` — no platform-specific edits in core
- Never hand-edit `plugins/maister-kiro/` — generated only via `make build-kiro`
- Primary build template: `platforms/cursor/build.sh`
- Agent orchestrator named `maister.json` (not `maister-orchestrator`)
- Hybrid distribution: global install to `~/.kiro-maister` + workspace copy for CI smoke
- Chat-native phase gates replace `AskQuestion` (no sed rename)
- Commands merge into skills (no `commands/` in Kiro output)

## Research Context

Research question: "Jak przygotować implementację wsparcia kiro-cli analogicznie do Cursor, Copilot i Claude Code?"

Confidence: medium. Key deliverables: `platforms/kiro-cli/build.sh`, `generate-agent-json.sh`, `plugins/maister-kiro/`, Makefile targets, smoke scripts, validate-kiro.
