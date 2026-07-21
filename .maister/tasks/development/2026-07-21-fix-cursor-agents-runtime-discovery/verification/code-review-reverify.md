# Code Review Re-Verification (post W1–W5)

**Date:** 2026-07-21T22:01:00Z  
**Worktree:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`  
**Prior report:** `verification/code-review-report.md`  
**Mode:** Read-only source/test re-check after fix loop  

---

## TL;DR

**All five Warnings (W1–W5) are addressed in code and covered by tests.** Re-run of `cursor-agents-runtime-discovery.test.mjs`: **6/6 pass**. No new Critical or Warning defects found in the fix surface. Residual items are prior **Info** notes (I1–I4) plus product **S7** manual Task smoke (out of automated code-review scope).

**Status:** ✅ Warnings cleared (fixable W1–W5)

---

## W1–W5 disposition

| ID | Original issue | Re-check evidence | Verdict |
|----|----------------|-------------------|---------|
| **W1** | `--agents-fallback` overwrote home/cwd agents with no backup | `cursor-agents-fallback.mjs`: `backupExistingLeaf` → `<dest>/.maister-backup/<leaf>` before `copyFileSync`; test asserts prior content preserved under backup | **Addressed** |
| **W2** | Dual-write errors swallowed; success text implied fallback ran | `maybeDualWriteCursorAgents` returns `{ attempted, ok, copied, destinations, backups, errors }`; transaction-manager catch maps to structured `dualWrite` (never empty swallow); `successMessage` branches on `dualWrite.ok` vs errors; CLI passes `result.dualWrite` into envelope | **Addressed** |
| **W3** | Hybrid E5 `passed` lacked disk-vs-Task provenance | `observePluginAgentNames` sets `discovery_subject: "plugin-disk-agents"`; `compareNativeInventory` copies it into provenance and adds remediation when subject is plugin-disk; TDD asserts subject + remediation | **Addressed** |
| **W4** | FR3 dual-write untested beyond CLI parse | New test `agents-fallback dual-write copies leaves and backs up prior same-named files` exercises copy + backup | **Addressed** |
| **W5** | FR4 reload guidance missing on Cursor `verify` | `successMessage`: `cursorReloadCommands = ["install", "update", "verify"]`; test matches Reload/Task on verify | **Addressed** |

---

## Automated confirmation

```text
node --test tests/platform-independent/cursor-agents-runtime-discovery.test.mjs
→ 6 pass / 0 fail
```

---

## Remaining issues

### Critical / Warning

None on the W1–W5 fix surface.

### Info (unchanged from prior review; non-blocking)

| ID | Note |
|----|------|
| I1 | Byte-identical bridge still duplicated (distribution + overlay asset) — drift risk |
| I2 | Packaged bridge remains exact-native contract stub (intentional per R3) |
| I3 | Hybrid discover still sync `readdir`/`readFile` — fine at current scale |
| I4 | `expectedNativeInventory` still includes target-less rows when manifest.target matches |

### Out of code-review fix scope

- **S7** manual reload + Task/`subagent_type` smoke still required for product Done claim (see `reality-check-reverify.md`).

### Minor residual (acceptable)

- Same-named leaves are still overwritten after backup (by design of W1 fix: backup-then-copy, not skip-on-conflict).
- Outer `try/catch` around dual-write remains, but failures are now observable via structured status + honest messaging (W2 intent met).

---

## Go / no-go (code review re-check)

**Go** for merge of the automated packaging/probe/fallback slice: prior hold reasons (W1–W2) are fixed; W3–W5 also fixed.

Product Task-enum Done remains gated on **S7**, not on further code-review Warnings.
