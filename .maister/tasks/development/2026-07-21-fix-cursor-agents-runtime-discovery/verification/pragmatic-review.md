# Pragmatic Code Review

**Date:** 2026-07-21  
**Task:** `2026-07-21-fix-cursor-agents-runtime-discovery`  
**Worktree:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`  
**Scope:** Cursor agents runtime discovery fix (bridge packaging, hybrid E5, `--agents-fallback`, reload messaging)  
**Mode:** Read-only  

---

## TL;DR

Complexity matches the problem. The change set is small, flag-gated, and aligned with the spec’s “minimal implementation” bar — not over-engineered. The only structural tax is the intentional duplicate bridge leaf (distribution + overlay asset), which FR1/TDD require. No speculative Task API, projector churn, or multi-layer abstractions.

**Status:** Appropriate  
**Complexity:** Low  
**Over-engineering:** No  

---

## Findings by severity

### Critical

_None._

### High

_None._

### Medium

1. **Duplicate bridge modules (maintenance drift)**  
   - **Where:** `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` and `plugins/maister/overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` (identical ~47 LOC copies)  
   - **Why it matters:** Two sources of truth can diverge over time.  
   - **Pragmatic take:** Acceptable — FR1 and TDD test 2 require both paths to exist and load. Do not invent a shared-import build step unless drift actually appears. Optional follow-up: a one-line comment or test asserting byte/contract equality.

### Low

1. **Separate `cursor-agents-fallback.mjs` helper**  
   - **Where:** `plugins/maister/lib/distribution/cursor-agents-fallback.mjs` (~41 LOC)  
   - **Why noted:** Could have been inlined in `transaction-manager.mjs`.  
   - **Pragmatic take:** Correct call — keeps the huge transaction manager thinner; plan explicitly allowed this helper. Keep it.

2. **Local `frontmatterValue` in `probeCursor`**  
   - **Where:** `host-probes/cursor.mjs`  
   - **Why noted:** Similar helpers exist elsewhere (e.g. Pi).  
   - **Pragmatic take:** Fine for this scope; deduping would be premature abstraction.

3. **Stub bridge always `authenticated: true` / fixed `Continue` launch**  
   - **Where:** bridge `native_port`  
   - **Why noted:** Looks “fake” if read as a real Task subprocess.  
   - **Pragmatic take:** Matches release-package fixture and spec R3 (exact-native + observable identity, not live Cursor Task). Do not grow it into a host subprocess launcher without product evidence.

---

## Complexity assessment

| Dimension | Assessment |
|-----------|------------|
| Project scale | Production plugin / multi-target distribution |
| Problem scale | High-risk host seam, but narrow Cursor-only fix |
| Abstraction layers | Flat ESM modules; reuse `probeHost` / `compareNativeInventory` / overlay inventory |
| Config / flags | One boolean CLI flag; default path unchanged |
| DX | Hybrid path mockable via `hostVersion`/`clock`; TDD file is the contract |

**Requirements alignment:** Implementation tracks FR1–FR5 and plan G1–G5 without scope inflation (no Codex/Pi edits, no projector/frontmatter churn, no invented Task inventory API).

**Developer experience:** Positive — fail-closed inventory for missing bridge; honest E5 `unavailable` when `pluginRoot` unusable; reload messaging refuses to claim Task enum from disk alone.

---

## Verdict

**Appropriate — ship the shape as-is for automated Done.**  
No simplification required before merge of the packaging/probe/CLI work. Watch only for bridge-copy drift and remember product Task discovery still needs S7 smoke (out of scope for this pragmatism pass).
