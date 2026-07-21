# Requirements: Fix Cursor agents runtime discovery

Gathered: 2026-07-21T21:20:00Z  
Worktree: `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`

## Initial description

Napraw problem z agentami Maister w Cursor: po instalacji pluginu 29 agentów jest na dysku i w `plugin.json`, ale Task/`subagent_type` nie widzi `maister-*`. Skills działają. Dostawa przez Cursor plugin; pełny zakres w tym E6 bridge; hybrid verify/E5; opcjonalny `--agents-fallback`.

## Q&A (confirmed)

| ID | Assumption | Answer |
|----|------------|--------|
| R1 User journey | After install/update (+ reload), operator sees/invokes `maister-*` in Task; hybrid verify/E5 + E6 bridge prove health | Confirm |
| R2 Reuse | Extend `probeCursor`, `cli-contract`, overlay layout/inventory; new bridge modeled on release-package fixture / exact-native; projector only if smoke requires | Confirm |
| R3 Visual | No mockups/UI | Confirm |
| R4 Bridge | Packaged `createMaisterAgentBridgeV1` with inspect/launch + observable identity; test-mockable; ship in plugin as loadable `bridge_module` | Confirm |

## Prior scope (Phase 1–2)

- Success = Task lists/invokes `maister-*`
- Primary delivery = Cursor plugin (not dual-install as primary)
- Hybrid E5/verify; optional `--agents-fallback` after plugin-path exhaustion
- E6 bridge **in scope**
- Skills stay Task-only
- Frontmatter/filename changes only with smoke evidence

## Functional requirements summary

1. Package Cursor bridge (`createMaisterAgentBridgeV1`) in distribution + overlay asset/inventory/layout.
2. Hybrid default discover for `probeCursor` from plugin `agents/*.md` names when `pluginRoot` available; else provisional + document manual smoke.
3. CLI `--agents-fallback` for optional user/project agents dual-write.
4. Make TDD suite `cursor-agents-runtime-discovery.test.mjs` green.
5. Operator guidance: reload Cursor after install when claiming discovery.

## Reusability opportunities

- `host-probes/cursor.mjs` + `base.mjs` compareNativeInventory
- `cli-contract.mjs` parseCliArgs
- Overlay layout/inventory patterns (hooks/skills)
- Bridge contract from `production-owner.mjs` + test fixtures in `release-package.test.mjs`
- Exact-native adapter expectations

## Scope boundaries

- In: Cursor target only (worktree); Task discovery path; E6 bridge packaging; hybrid E5; fallback flag
- Out: Codex runtime install (sibling agent); mass skill rewrite; proactive frontmatter churn without evidence

## Technical considerations

- Do not invent a public Cursor Task inventory API; filesystem hybrid discover is automated half of Hybrid.
- Bridge must satisfy production-owner exact-native port validation.
- Keep receipt/verify fail-closed honesty when discover unavailable.
