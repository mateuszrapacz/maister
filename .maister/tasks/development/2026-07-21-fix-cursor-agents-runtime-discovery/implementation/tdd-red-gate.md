# TDD Red Gate

**Status:** PASSED (tests fail as expected)  
**Timestamp:** 2026-07-21T21:14:21Z (approx)  
**Worktree:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`

## Defect under test

Cursor plugin install materializes 29 agents and declares them in `plugin.json`, but Task does not discover `maister-*`, E5/E6 stay unavailable without injected discover/invoke, and no Cursor bridge is packaged for E6.

## Failing test file

`tests/platform-independent/cursor-agents-runtime-discovery.test.mjs`

| Test | Failure (RED) |
|------|----------------|
| packages `createMaisterAgentBridgeV1` | missing `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` |
| overlay ships/requires bridge asset | missing `overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` + inventory |
| hybrid default discover → E5 passed | E5 `unavailable` (`safe-adapter-not-configured`) |
| CLI `--agents-fallback` | `E_USAGE` unknown option |

## Command

```bash
cd /Users/mrapacz/Workspace/maister-wt-fix-cursor-agents
node --test tests/platform-independent/cursor-agents-runtime-discovery.test.mjs
```

**Result:** 4 fail / 0 pass (exit 1) — defect reproduced; no implementation yet.

## Next

Phase 5+ will specify and implement until these tests go green (Phase 9). Routing skips Phase 4 (`ui_heavy: false`).
