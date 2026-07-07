# Work Log — Cursor Platform Review Fixes

**Date**: 2026-07-08  
**Approach**: 9 parallel agents (one per issue H1–L3)  
**Build**: `make build-cursor && make validate-cursor` — PASS

## Summary

| ID | Status | Key outcome |
|----|--------|-------------|
| H1 | Done | `preToolUse` Shell guard + `subagentStart` allowlist; documented `beforeShellExecution` limits |
| H2 | Done | 19 agents with `readonly: true` (was 1); build.sh step 11c + validate regression checks |
| M1 | Done | `quick-plan.md` thin wrapper (23 lines, was 79) |
| M2 | Done | `.github/workflows/validate-generated-variants.yml` fail-fast drift check |
| M3 | Done | `maister-workflows.mdc` 823→71 lines via template; `alwaysApply` unchanged |
| L1 | Done | `stop` + `sessionEnd` hooks for state reminder and cleanup |
| L2 | Done | `repository`, `license`, `homepage` in plugin.json |
| L3 | Done | `.github/workflows/cursor-cli-smoke.yml` weekly cron |

## Decisions applied (from plan open questions)

1. **H1**: Option (c) — subagentStart gating + preToolUse destructive block; NOT blanket main-agent block
2. **M2**: Option B — fail-fast CI, no auto-commit
3. **M3**: Condensed rule (option a partial); `alwaysApply: true` kept pending user confirmation

## Remaining limitations

- **H1**: Parallel subagent waves fail-open (ambiguous attribution); live deny needs real Cursor session
- **L3**: Requires `CURSOR_API_KEY` secret; smoke may skip if CLI install fails

## Files changed (source)

- `platforms/cursor/build.sh` — readonly injection, condensed rule template, manifest fields
- `platforms/cursor/hooks/*` — H1 + L1 hooks
- `platforms/cursor/templates/maister-workflows-template.mdc` — new
- `platforms/cursor/overrides/commands/quick-plan.md`
- `platforms/cursor/smoke-cli.sh`
- `Makefile` — validate-cursor checks
- `.maister/docs/standards/global/build-pipeline.md`
- `.github/workflows/validate-generated-variants.yml` — new
- `.github/workflows/cursor-cli-smoke.yml` — new
- `plugins/maister-cursor/` — regenerated
