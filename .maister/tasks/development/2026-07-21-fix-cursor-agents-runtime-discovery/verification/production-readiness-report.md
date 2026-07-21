# Production Readiness Report

**Date:** 2026-07-21  
**Path:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents` (Cursor runtime-discovery changes)  
**Task:** `2026-07-21-fix-cursor-agents-runtime-discovery`  
**Target:** production (plugin distribute / operator install)  
**Mode:** Read-only · `skip_test_suite: true` (TDD green cited from gate artifact) · e2e: false  

---

## TL;DR

Packaging and fail-closed inventory are production-ready for the **automated** contracts (bridge leaf, hybrid E5 probe seam, CLI fallback flag, reload messaging). Residual risk is product/host skew: hybrid disk E5 ≠ live Task enum, dual-write failures are swallowed, and the packaged bridge is an exact-native stub — not a real Cursor Task subprocess.  

**Recommendation:** GO with mitigations for plugin release of this packaging.  
**Do not** treat Task/`subagent_type` discovery as production-proven until S7 manual smoke after reload.

---

## Findings by severity

### Blockers (must fix before claiming Task discovery Done)

1. **S7 manual smoke not executed**  
   - Spec S7 / R1–R2: after install + Cursor reload, Task must list/invoke at least `maister-explore` / `maister-code-reviewer`.  
   - Evidence: `implementation/tdd-green-gate.md` and work-log explicitly leave S7 open.  
   - **Mitigation:** Run operator checklist before product Done / release notes that claim Task discovery.

### Concerns (should fix or operationally contain)

1. **Silent dual-write failure**  
   - **Where:** `transaction-manager.mjs` wraps `maybeDualWriteCursorAgents` in empty `catch`; home copy inside the helper is not best-effort (only cwd is).  
   - **Risk:** Operator with `--agents-fallback` may believe fallback ran; install still succeeds with zero copies and no envelope signal.  
   - **Recommendation:** Surface a non-fatal warning in the success envelope or receipt when `agentsFallback` and `copied === 0` / catch thrown.

2. **Hybrid E5 is disk inventory, not Task enum**  
   - **Where:** `host-probes/cursor.mjs` `observePluginAgentNames`  
   - **Risk:** Operators/CI may treat E5 `passed` as “Task lists maister-*”. Messaging already warns on install; keep that honesty in verify/docs.  
   - **Recommendation:** Any release claim language must cite S7, not hybrid E5 alone.

3. **Bridge is exact-native stub**  
   - **Where:** `createMaisterAgentBridgeV1` — fixed `hostVersion`, `authenticated: true`, launch echoes ID + canned `Continue`.  
   - **Risk:** E6 via `bridge_module` proves contract loadability, not live Cursor Task execution (spec R3).  
   - **Recommendation:** Accept for gate packaging; document when claiming `native_runtime`.

4. **Duplicate bridge assets can drift**  
   - Distribution vs overlay copies are identical today; inventory fails closed if overlay leaf missing, not if contents diverge.  
   - **Recommendation:** Optional equality assertion in overlay/TDD suite later.

5. **Empty / nameless `agents/` yields failed E5, not unavailable**  
   - Usable `agents` dir with zero parseable `name` values returns `{ native_role_external_ids: [] }` → compare mismatch `failed`.  
   - **Risk:** Noisy failure vs honest provisional. Low likelihood on healthy materialize; worth knowing for support.

### Recommendations (nice to have)

1. Log dual-write destinations count into install receipt when flag set.  
2. Assert distribution bridge ≡ overlay bridge in CI.  
3. Wire default verify callers to pass installed `pluginRoot` when collecting host probe evidence (install path currently consumes **supplied** evidence; hybrid only helps when callers invoke `probeCursor` with `pluginRoot`).

---

## Category breakdown (adapted for plugin distribution)

| Category | Score | Status | Notes |
|----------|------:|--------|-------|
| Configuration | 90% | OK | Flag allowlisted; no new secrets; overlay inventory requires bridge |
| Monitoring | 55% | Concern | Dual-write failures silent; no structured operator signal |
| Resilience | 80% | OK | Fallback best-effort; primary plugin commit not rolled back |
| Performance | 95% | OK | Sync readdir/copy of agent leaves only; negligible |
| Security | 85% | OK | Copies under `.cursor/agents`; overwrite same leaf names; stub auth flags honest for fixture |
| Deployment | 75% | Caution | Overlay materialize/`--check` fail closed; product Task path needs reload+S7 |

**Overall readiness (automated packaging):** ~80%  
**Deployment risk:** Medium (host product skew), Low (inventory/CLI packaging)

---

## TDD / automated evidence (not re-run)

From `implementation/tdd-green-gate.md` (2026-07-21T21:42:51Z, reconfirmed 21:43:33Z):

- `cursor-agents-runtime-discovery.test.mjs` — **4 pass / 0 fail**  
- Sampled regressions: evidence-parity Cursor inject, overlay-contract Cursor subset — pass  

---

## Verdict

| Claim | Verdict |
|-------|---------|
| Ship packaged Cursor bridge + overlay inventory | **GO** |
| Hybrid E5 probe seam + CLI `--agents-fallback` + reload messaging | **GO** |
| Production claim: “Task lists/invokes maister-*” | **NO-GO until S7** |
| Overall for this task’s automated release slice | **GO with mitigations** (S7 + dual-write observability) |
