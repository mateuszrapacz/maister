# Code Review Report

**Date**: 2026-07-21  
**Path**: `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents` (Cursor agents runtime discovery fix only)  
**Scope**: all (quality, security, performance, best practices)  
**Status**: ⚠️ Issues Found

## TL;DR

**No Critical findings.** The change set meets the TDD contract (4/4 green) and keeps plugin-primary delivery, fail-closed inventory for the bridge leaf, and honest “reload ≠ disk” messaging on Cursor install/update. Merge blockers are quality/ops: `--agents-fallback` can **clobber** existing `~/.cursor/agents/*.md` with no backup/receipt, dual-write failures are **swallowed silently**, hybrid E5 `passed` lacks a disk-vs-Task provenance marker, and FR3 dual-write behavior is **untested** beyond CLI parse. The packaged E6 bridge is an intentional host-mockable stub (spec R3), not a live Task launcher.

## Summary

- **Critical**: 0 issues
- **Warnings**: 5 issues
- **Info**: 4 issues
- **Files analyzed**: 12 (changed/new under distribution, overlays/cursor, install CLI, TDD test)

## Critical Issues

None.

## Warnings

### W1 — `--agents-fallback` overwrites home agents without backup or conflict check

**Severity**: warning  
**Category**: security / best_practices (data loss on opt-in path)  
**Fixable**: true  
**Location**: `plugins/maister/lib/distribution/cursor-agents-fallback.mjs:4-9,27-30`

`copyAgentLeaves` uses `fs.copyFileSync` into `path.join(home, ".cursor", "agents")` with no existence check, content hash compare, backup, or journal. Same-named operator or third-party agents are replaced. Home write is **not** in the cwd best-effort `try/catch`; failures only die into the outer empty catch in the transaction manager.

**Why it matters**: Opt-in still implies “additive fallback,” not silent clobber. Recovery after a bad dual-write is outside the installer transaction.

**Recommendation**: Before copy, skip or conflict when destination exists with different bytes; or stage + atomic rename with a backup under Maister state; record destinations/skipped leaves on the receipt. Mirror home write with the same best-effort boundary as cwd (or fail the fallback step visibly without failing primary install).

### W2 — Dual-write errors are swallowed with no operator signal

**Severity**: warning  
**Category**: best_practices / error_handling  
**Fixable**: true  
**Location**: `plugins/maister/lib/distribution/transaction-manager.mjs:1894-1904`

```js
try {
  maybeDualWriteCursorAgents({ ... });
} catch {
  /* best-effort: primary delivery already committed */
}
```

Empty catch discards the error. Success envelope may still claim `--agents-fallback dual-write is secondary…` via `successMessage` whenever the flag was set, even if zero leaves were copied.

**Why it matters**: Conflicts with project error-handling guidance (actionable messages; graceful degradation should be observable). Operators cannot tell primary-only vs dual-write-failed.

**Recommendation**: Capture `{ copied, destinations, error? }` into receipt/journal or envelope details; keep primary install non-failing, but never imply fallback succeeded when it did not.

### W3 — Hybrid E5 `passed` is indistinguishable from live Task inventory

**Severity**: warning  
**Category**: quality / evidence honesty  
**Fixable**: true  
**Location**: `plugins/maister/lib/distribution/host-probes/cursor.mjs:40-60`; compare path via `host-probes/base.mjs:233-256`

When `discover` is omitted and `pluginRoot` is usable, E5 uses on-disk frontmatter names under scenario `cursor-native-inventory-v1` and can return `passed` with provenance `{ native_role_external_ids }` only. No `discovery_mode` / `reason` marks hybrid-disk vs injected/live observation (spec R2).

**Why it matters**: Downstream admission or operators can treat E5 `passed` as “Task lists `maister-*`,” which this code does not prove. Install messaging warns about reload/disk; the evidence record does not.

**Recommendation**: Attach provenance such as `discovery_mode: "plugin-disk-frontmatter"` (or a dedicated reason) whenever hybrid default discover is used; keep injected discover unmarked or marked separately.

### W4 — FR3 dual-write semantics have no behavioral tests

**Severity**: warning  
**Category**: quality / testing  
**Fixable**: true  
**Location**: `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs:156-168`; `cursor-agents-fallback.mjs` (untested)

TDD covers `parseCliArgs(… "--agents-fallback")` only. No test asserts target gating, copy destinations (`$home/.cursor/agents`, `$cwd/.cursor/agents`), no-op when flag false, or non-cursor no-op.

**Why it matters**: Regressions in the only side-effectful fallback path will not fail the critical-path suite.

**Recommendation**: Add focused unit tests around `maybeDualWriteCursorAgents` with temp `home`/`cwd`/`activeRoot` (including overwrite/skip policy once W1 is decided).

### W5 — FR4 reload guidance omitted for `verify`

**Severity**: warning  
**Category**: best_practices / spec alignment  
**Fixable**: true  
**Location**: `plugins/maister/bin/maister-install.mjs:25-40`

Spec FR4 calls for install/update/**verify** operator messaging that reload is required before Task discovery claims. `successMessage` only appends reload text for `target === "cursor"` and `command ∈ {install, update}`. `verify` returns bare `"verify completed"`.

**Recommendation**: Include the same reload caveat for Cursor `verify` (and optionally `status` when reporting discovery-related fields).

## Informational

### I1 — Byte-identical bridge duplicated in two trees

**Severity**: info  
**Category**: quality (DRY / drift)  
**Location**: `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs`; `plugins/maister/overlays/cursor/assets/runtime/cursor-bridge-v1.mjs`

Spec allows identical content. Drift risk if one copy is patched later.

**Suggestion**: Add a small test that `readFileSync` hashes (or contents) of both paths are equal, or generate one from the other in the build.

### I2 — Packaged bridge is a contract stub, not a Cursor Task subprocess

**Severity**: info  
**Category**: best_practices (intentional per spec R3)  
**Location**: `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs:16-44`

`authenticated: true`, fixed `hostVersion: "1.0.0"`, `launch` echoes identity without validating `schema_version` or invoking Cursor. Matches release-package fixture shape and production-owner closed fields; does **not** prove live Task launch.

**Suggestion**: Document in overlay/operator notes that E6 via this module is exact-native contract evidence only; keep fail-closed when `bridge_module` is unset.

### I3 — Sync filesystem I/O in hybrid discover

**Severity**: info  
**Category**: performance  
**Location**: `plugins/maister/lib/distribution/host-probes/cursor.mjs:17-35`

`readdirSync` + per-file `readFileSync` for all `agents/*.md`. Fine for ~30 agents; not ideal if probe is called in a tight loop.

**Suggestion**: No change required for current scale; prefer async only if probe becomes hot-path.

### I4 — `expectedNativeInventory` subject-level row matching

**Severity**: info  
**Category**: quality  
**Location**: `plugins/maister/lib/distribution/host-probes/base.mjs:219-230`

Rows without `target` are included when `manifest.target ===` probe target (needed for TDD fixture / R4). Mixed multi-target manifests that omit per-row `target` could over-include IDs.

**Suggestion**: Keep fixture-compatible behavior; document that multi-target manifests must set per-row `target`.

## Metrics

| Metric | Value |
|--------|-------|
| Max new function length | ~35 lines (`observePluginAgentNames` / `maybeDualWriteCursorAgents`) |
| Max nesting depth (new code) | ~3 |
| Potential vulnerabilities | 0 Critical; 1 opt-in overwrite data-loss (W1) |
| N+1 / sync I/O risks | Hybrid discover sync reads (I3) — acceptable |
| TDD suite (`cursor-agents-runtime-discovery.test.mjs`) | 4 passed / 0 failed |

## Prioritized Recommendations

1. Harden `--agents-fallback` copy (conflict/backup + visible degraded result) — **W1, W2**
2. Mark hybrid E5 provenance as disk-frontmatter — **W3**
3. Add dual-write unit tests — **W4**
4. Extend reload guidance to Cursor `verify` — **W5**
5. Optional: bridge content-equality test and operator note that bridge ≠ live Task — **I1, I2**

## Go / no-go (code review)

**Conditional go** for the automated TDD/spec slice: no Critical defects; primary plugin path and inventory fail-closed look sound.

**Hold merge** until W1–W2 are addressed or explicitly accepted (opt-in data clobber + silent fallback failure), and preferably W3–W4 for evidence honesty and regression coverage.

---

## Structured result (orchestrator)

```yaml
status: issues_found
report_path: .maister/tasks/development/2026-07-21-fix-cursor-agents-runtime-discovery/verification/code-review-report.md

summary:
  critical: 0
  warning: 5
  info: 4
  files_analyzed: 12

issues:
  - source: code_review
    severity: warning
    category: security
    description: "--agents-fallback overwrites ~/.cursor/agents without backup or conflict check"
    location: plugins/maister/lib/distribution/cursor-agents-fallback.mjs:4-9,27-30
    fixable: true
    suggestion: "Skip/conflict on differing bytes; backup or journal destinations; surface skip/fail in receipt"
  - source: code_review
    severity: warning
    category: best_practices
    description: "Dual-write failures swallowed; success text may still imply fallback ran"
    location: plugins/maister/lib/distribution/transaction-manager.mjs:1894-1904
    fixable: true
    suggestion: "Record copied/destinations/error on receipt or envelope without failing primary install"
  - source: code_review
    severity: warning
    category: quality
    description: "Hybrid E5 passed lacks discovery_mode distinguishing disk vs Task inventory"
    location: plugins/maister/lib/distribution/host-probes/cursor.mjs:40-60
    fixable: true
    suggestion: "Add provenance discovery_mode=plugin-disk-frontmatter for hybrid default discover"
  - source: code_review
    severity: warning
    category: quality
    description: "FR3 dual-write behavior untested beyond CLI parse"
    location: tests/platform-independent/cursor-agents-runtime-discovery.test.mjs:156-168
    fixable: true
    suggestion: "Unit-test maybeDualWriteCursorAgents with temp home/cwd/activeRoot"
  - source: code_review
    severity: warning
    category: best_practices
    description: "FR4 reload guidance missing on Cursor verify success message"
    location: plugins/maister/bin/maister-install.mjs:25-40
    fixable: true
    suggestion: "Include reload caveat for command=verify when target=cursor"
  - source: code_review
    severity: info
    category: quality
    description: "Identical bridge module duplicated; drift risk"
    location: plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs
    fixable: true
    suggestion: "Assert content equality of distribution and overlay bridge assets in tests"
  - source: code_review
    severity: info
    category: best_practices
    description: "Packaged bridge is contract stub (authenticated/hostVersion hardcoded; no Task subprocess)"
    location: plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs:16-44
    fixable: false
    suggestion: "Document E6 stub semantics for operators; keep fail-closed without bridge_module"
  - source: code_review
    severity: info
    category: performance
    description: "Hybrid discover uses sync readdir/readFile over all agent markdown files"
    location: plugins/maister/lib/distribution/host-probes/cursor.mjs:17-35
    fixable: true
    suggestion: "Acceptable at current agent count; revisit if probe becomes hot-path"
  - source: code_review
    severity: info
    category: quality
    description: "expectedNativeInventory includes target-less rows when manifest.target matches"
    location: plugins/maister/lib/distribution/host-probes/base.mjs:219-230
    fixable: false
    suggestion: "Document that multi-target manifests must set per-row target"

issue_counts:
  critical: 0
  warning: 5
  info: 4
```
