# Reality Check

**Date:** 2026-07-21  
**Task:** `2026-07-21-fix-cursor-agents-runtime-discovery`  
**Worktree:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`  
**Mode:** Read-only · `skip_test_suite: true` (TDD results from `implementation/tdd-green-gate.md`) · e2e: false  

---

## TL;DR

**Automated Done is real; product Task discovery is not yet proven.**  
The worktree implements the four TDD contracts: packaged E6 bridge (distribution + overlay inventory), hybrid E5 from `pluginRoot/agents/*.md`, CLI `--agents-fallback` + post-install dual-write, and reload guidance. That solves the *Maister packaging / probe honesty* gap in the spec. It does **not** by itself prove Cursor Task/`subagent_type` lists `maister-*`. Spec S7 (reload + Task smoke) remains mandatory for product Done — and has not been recorded as executed.

**Status:** Issues found (automated slice ready; product Task claim blocked on S7)

---

## Spec reality map

| Spec success / FR | Claimed | Reality |
|-------------------|---------|---------|
| **S1 / FR1** E6 bridge `createMaisterAgentBridgeV1` | Packaged | **Met** — distribution module loads; inspect/launch + observable identity; production-owner export shape |
| **S2 / FR1** Overlay asset + inventory/layout | Required leaf | **Met** — asset exists; `overlay.yml` layout + `inventory.yml` / `inventory.required` list `runtime/cursor-bridge-v1.mjs` |
| **S3 / FR2** Hybrid E5 when `discover` omitted + `pluginRoot` | E5 `passed` | **Met under probe contract** — TDD temp plugin + seams; injected `discover` still wins; missing/unusable root → honest `unavailable` |
| **S4 / FR3** `--agents-fallback` parse | `agentsFallback: true` | **Met** — `cli-contract.mjs`; dual-write helper + transaction hook also present (beyond TDD) |
| **S5 / FR4** Reload guidance | Operator message | **Met** — `successMessage()` for cursor install/update; fallback path labels dual-write secondary |
| **S6 / FR5** TDD 4/4 green | Automated gate | **Met** (per green-gate artifact; suite not re-run here) |
| **S7** Manual Task enum smoke | Product Done | **Not met / not run** — still required |
| Task discovery (Layer 3 problem) | Operator can Task `maister-*` | **Unresolved until S7** — R1 product/session skew remains |
| Hybrid ≠ live Task (R2) | Documented honesty | **Preserved** — install message states disk alone ≠ Task enum |
| E6 live Task subprocess (R3) | Exact-native only | **Honest stub** — echo identity + canned output; not Cursor Task process |

---

## Findings by severity

### Critical

1. **Product Done blocked: Manual S7 not done**  
   - Spec: after reload, Task lists/invokes at least `maister-explore` / `maister-code-reviewer`.  
   - Work-log / tdd-green-gate: “S7 manual smoke remains.”  
   - **Reality:** Claiming “Cursor agents runtime discovery fixed” for the original Layer-3 failure without S7 is a false completion.  
   - **Action:** Reinstall/update from this worktree → reload Cursor → smoke Task/`subagent_type` → record result before marking product Done.

### High

1. **Hybrid E5 proves projected inventory presence, not Task enum**  
   - `observePluginAgentNames` reads frontmatter `name` from disk.  
   - Spec Key Decision 3 + R2 already say this; implementation matches.  
   - **False-completion risk:** Treating E5 `passed` (or green install) as “Task discovery fixed.”

2. **Install/verify does not auto-run hybrid probe**  
   - `maister-install` / `transaction-manager` consume **supplied** native evidence; they do not call `probeCursor({ pluginRoot: activeRoot })` by default.  
   - Hybrid helps when evidence collectors / tests / gates invoke the probe with `pluginRoot`.  
   - Default install can still look “green” on E1–E4-style materialize while E5/E6 stay provisional unless evidence is supplied — same class of operator confusion the task set out to reduce, partially mitigated by reload messaging only.

### Medium

1. **`--agents-fallback` dual-write is best-effort and silent on failure**  
   - Wired after successful cursor install/update; home + cwd copies; outer catch swallows errors.  
   - Fallback path exists per FR3, but operators get no failure signal if copies fail.

2. **E6 packaging ≠ default probe E6 pass**  
   - Bridge is registerable as `bridge_module` (FR1 / S1).  
   - Default `probeCursor` still needs injected `invoke` for E6 scenario; packaged leaf alone does not flip default E6 to `passed`. Spec intended packaging + exact-native contract, not magic auto-pass — keep claims accurate.

### Low

1. **Support inventory `explore` vs `maister-explore` (R6)** — still out of scope; did not block TDD.  
2. **Identical dual bridge files** — drift risk only; both required by contract.

---

## Claimed vs actual completion

| Source | Claim | Assessment |
|--------|-------|------------|
| Implementation plan G1–G5 checkboxes | Complete | Consistent with code present |
| Work-log G5 | Automated Done ready; S7 remains | Accurate |
| TDD green gate | 4/4 pass | Accepted without re-run (`skip_test_suite: true`) |
| Product “Task discovery fixed” | Implied by task title | **Not yet true** without S7 evidence |

**Functional completeness (spec automated slice):** ~90% (S1–S6)  
**Functional completeness (original operator problem: Task lists maister-*):** ~0% proven (pending S7); packaging/fallback improve odds but do not certify.

---

## What this does solve

1. **E6 bridge packaging** — loadable `createMaisterAgentBridgeV1`, overlay fail-closed inventory, exact-native inspect/launch identity for production-owner.  
2. **Hybrid E5** — when `pluginRoot` is usable and `discover` omitted, disk `maister-*` names compared to manifest (including top-level `manifest.target` shape via A1).  
3. **Fallback** — optional dual-write behind `--agents-fallback` after primary plugin path; not primary delivery.  
4. **Honesty** — reload prerequisite messaging; no invented public Task inventory API.

## What this does not yet solve

1. **Confirmed Task/`subagent_type` enumeration** after install (S7).  
2. **Automatic install-time E5/E6 evidence** from hybrid/bridge without callers supplying probe/evidence.  
3. **Real Cursor Task subprocess execution** via the packaged bridge (stub by design).

---

## Pragmatic action plan

1. **Required for product Done:** Manual S7 — install/update Cursor target from this worktree → **reload Cursor** → confirm Task lists/invokes `maister-explore` and `maister-code-reviewer` → record in work-log.  
2. If Task still empty after reload: try `--agents-fallback`, reload again, re-smoke (R1 mitigation).  
3. Optional hardening: warn when fallback copies 0 leaves; pass `pluginRoot` in verify evidence collection.  
4. Do **not** weaken TDD or claim Task discovery from hybrid E5 alone.

---

## Verdict

| Gate | Decision |
|------|----------|
| Automated / TDD Done (S1–S6) | **GO** — implementation matches spec contracts; green gate cited |
| Product Task discovery Done (S7) | **NO-GO** until reload + Task smoke is executed and recorded |
| Overall reality status | **Issues found** — ship packaging with eyes open; finish S7 before calling the original bug fixed end-to-end |

**Deployment decision for the task title (“fix Cursor agents runtime discovery”):**  
**GO for Maister packaging/probe/fallback; hold product Done on S7.**
