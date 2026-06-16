# Phase 2 Scope Clarifications

**Date:** 2026-06-07

## Critical Decisions

### Hook path resolution

**Decision:** Empirical smoke test first, then absolute path fallback if relative `../hooks/*.sh` fails.

**Rationale:** `KIRO_PLUGIN_ROOT` is undocumented; hook execution is blocking for Phase 1 smoke.

### Orchestrator agent naming

**Decision:** `agents/maister.json` with `name: maister`; wrapper uses `--agent maister` (ADR-011).

### Agent body directory

**Decision:** `agents/instructions/` for converted markdown bodies (ADR-013).

**Rationale:** Avoids collision with `$KIRO_HOME/prompts/` @prompts layer.

## Previously Resolved (Phase 1)

| Decision | Choice |
|----------|--------|
| Implementation scope | Full Phases 0–4 |
| todo transforms | Include in this task |
| Per-agent tools | `agent-tools.json` lookup table |
| CI commit | Manual commit (Cursor parity) |
| KIRO_HOME profile | Isolated `~/.kiro-maister` + wrapper |

## Important Decisions

| Decision | Choice |
|----------|--------|
| Default agent at install | `smoke-install --set-default` opt-in, default N (ADR-015) |
| Internal skills slash exposure | Accept extra slash commands in MVP (ADR-005) |
| MD→JSON generator | bash+jq with Node escape hatch if parser fails (ADR-006) |
| Headless gate behavior | Documented defaults for `--no-interactive` + smoke bypass paths |
| MCP settings key | Empirical smoke test for `includeMcpJson` vs `useLegacyMcpJson` |
