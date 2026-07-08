# Implementation Work Log — Kiro CLI Platform Review Fixes

**Date**: 2026-07-08  
**Plan**: `.maister/plans/2026-07-08-kiro-cli-platform-review-fixes.md`

## Parallel Agent Execution

| Issue | Agent | Status |
|-------|-------|--------|
| H1 | promptFile fix | ✅ Complete |
| H2 | subagent prompt verify | ✅ Complete + workaround |
| H3 | hook plain text | ✅ Complete |
| M1/M2 | remove use_aws | ✅ Complete |
| M3 | resources glob | ✅ Complete |
| M4 | validate-kiro rules | ✅ Complete |
| M5 | stop hook | ✅ Complete |
| L1-L5 | deferred | ⏸ Documented below |

## Changes Summary

### H1 — Build emits valid Kiro agent JSON
- `generate-agent-json.sh`: `prompt: file://./instructions/...`, no `promptFile`, no `model: inherit`
- `build.sh`: same for maister + maister-explore
- Removed `fix_agent_prompts()` from smoke-install/smoke-cli
- Updated tests and golden fixtures

### H2 — Subagent prompt loading (kiro-cli 2.6.0)
- **Verified BROKEN** for relative paths via subagent tool
- **Workaround**: `fix_prompt_paths()` in smoke-install.sh rewrites to absolute KIRO_HOME paths
- Documented in `docs/kiro-cli-support.md` Known gaps + analysis artifact

### H3 — Hook plain text
- `skill-invocation-reminder.sh`: JSON envelope → plain text
- `post-compact-reminder-stub.sh`: JSON → plain text (L4 partial)

### M1/M2 — use_aws removed
- `agent-tools.json`: defaults `["read","grep","glob"]`
- All 26 agents + build.sh hardcoded tools updated

### M3 — Orchestrator resources
- Removed wrong `skill://.kiro/skills/**/SKILL.md` glob
- Relies on Kiro default resource inheritance

### M4 — validate-kiro rules 29-31
- No `promptFile` key
- No `model: inherit`
- All agents have `prompt` starting with `file://`

### M5 — stop hook
- Created `stop-state-reminder-kiro.sh`
- Wired to maister.json `hooks.stop`
- L5 reviewed: no stale .hook-state/ interaction

## Deferred (L1-L5)

| ID | Item | Decision |
|----|------|----------|
| L1 | `code` tool for analysis agents | Defer — evaluate when quality gap observed |
| L2 | `knowledgeBase` for .maister/docs | Defer — YAGNI until corpus grows |
| L3 | `/goal` and `delegate` tools | Defer — needs dedicated research spike |
| L4 | post-compact-reminder-stub.sh dead code | Partial — JSON fixed; full removal deferred |
| L5 | hook-state cleanup with stop hook | ✅ Reviewed in M5 — no conflict |

## Verification

- `make build-kiro` — PASS
- `make validate-kiro` — PASS (31 rules)
- `platforms/kiro-cli/tests/generator.test.sh` — 8/8 PASS
- `grep promptFile/inherit` on agents — no matches

## Files Changed (source only)

- `platforms/kiro-cli/build.sh`
- `platforms/kiro-cli/generate-agent-json.sh`
- `platforms/kiro-cli/agent-tools.json`
- `platforms/kiro-cli/smoke-install.sh`
- `platforms/kiro-cli/smoke-cli.sh`
- `platforms/kiro-cli/hooks/skill-invocation-reminder.sh`
- `platforms/kiro-cli/hooks/post-compact-reminder-stub.sh`
- `platforms/kiro-cli/hooks/stop-state-reminder-kiro.sh` (new)
- `platforms/kiro-cli/tests/*`
- `Makefile`
- `docs/kiro-cli-support.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `plugins/maister-kiro/` (regenerated)
