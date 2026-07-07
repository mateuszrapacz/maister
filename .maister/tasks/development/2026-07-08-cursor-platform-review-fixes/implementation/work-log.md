# Work Log — Cursor Platform Review Fixes

**Date**: 2026-07-08  
**Status**: **Completed**  
**Approach**: 9 parallel agents (one per issue H1–L3) + follow-up CI/URL closure

## Summary

| ID | Status | Key outcome |
|----|--------|-------------|
| H1 | Done | `preToolUse` Shell guard + `subagentStart` allowlist; documented `beforeShellExecution` limits |
| H2 | Done | 19 agents with `readonly: true` (was 1); build.sh step 11c + validate regression checks |
| M1 | Done | `quick-plan.md` thin wrapper (23 lines, was 79) |
| M2 | Done | `.github/workflows/validate-generated-variants.yml` fail-fast drift check |
| M3 | Done | `maister-workflows.mdc` 823→71 lines via template; `alwaysApply: true` retained |
| L1 | Done | `stop` + `sessionEnd` hooks for state reminder and cleanup |
| L2 | Done | `repository`, `license`, `homepage` in plugin.json (pinned to fork URL) |
| L3 | Done | `.github/workflows/cursor-cli-smoke.yml` weekly cron |
| Extra | Done | `maister-no-fast-models.mdc` — no `*-fast` models by default |

## Decisions (open questions resolved)

1. **H1**: Option (c) — `subagentStart` gating + `preToolUse` destructive block; NOT blanket main-agent block
2. **M2**: Option B — fail-fast CI, no auto-commit for cursor/kiro/kilo variants
3. **M3**: Condensed rule shipped; **`alwaysApply: true` kept** — acceptable after 823→71 line reduction
4. **L2 URL**: **`https://github.com/mateuszrapacz/maister`** — fork is distribution source (`2.2.1-fork.1`), not upstream SkillPanel

## Acceptance verification

| Test | Result |
|------|--------|
| `make build && make validate` | PASS |
| H1 — subagent `git reset --hard` via hook simulation | PASS (`permission: deny`) |
| H1 — main agent unattributed shell | PASS (allowed) |
| H1 — `platforms/cursor/smoke-cli.sh` | PASS |
| H2 — 19 agents with `readonly: true` | PASS |
| H2 — runtime Write on `readonly` Task subagent | PASS (blocked in IDE) |
| CI `validate-generated-variants` (28905355878) | PASS |
| CI `build-copilot` (28905355867) | PASS |
| CI `cursor-cli-smoke` (28904269313) | PASS |

## Known limitations (accepted)

- **H1**: Parallel subagent waves fail-open when shell attribution is ambiguous
- **H1**: `beforeShellExecution` payload has no subagent identity — enforcement via `preToolUse` + tracker state
- **H2**: `bugbot` / `security-review` are Cursor built-ins, not Maister plugin agents
- **H2**: `cursor-agent` CLI does not consistently enforce `readonly: true` on Task subagents (IDE does)
- **L3**: Weekly smoke requires `CURSOR_API_KEY`; skips gracefully if CLI install fails

## Commits

| SHA | Message |
|-----|---------|
| `adbbfa8` | Fix Cursor platform gaps from review plan (hooks, readonly, CI, rules) |
| `492b67e` | Fix cursor-cli-smoke workflow: secrets unavailable in if conditions |
| `56607a0` | Pin Cursor plugin manifest to fork repo URL and harden Copilot CI |

## Files changed (source)

- `platforms/cursor/build.sh` — readonly injection, condensed rule template, pinned fork manifest URL
- `platforms/cursor/hooks/*` — H1 + L1 hooks
- `platforms/cursor/rules/maister-no-fast-models.mdc` — new
- `platforms/cursor/templates/maister-workflows-template.mdc` — new
- `platforms/cursor/overrides/commands/quick-plan.md`
- `platforms/cursor/smoke-cli.sh`
- `Makefile` — validate-cursor checks
- `.maister/docs/standards/global/build-pipeline.md`
- `.github/workflows/validate-generated-variants.yml` — new
- `.github/workflows/cursor-cli-smoke.yml` — new
- `.github/workflows/build-copilot.yml` — permissions + graceful push
- `plugins/maister-cursor/` — regenerated
