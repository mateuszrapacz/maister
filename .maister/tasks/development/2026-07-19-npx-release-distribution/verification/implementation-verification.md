# Post-V-016 Implementation Verification

## TL;DR

**Overall status: Failed / NO-GO for external release acceptance.** V-016 and CQ-102 are resolved in source. The authoritative local targets pass, the current direct `make test-platform-independent` rerun exits 0, and the focused policy/guard slice passes **16/16**. Two external critical blockers (V-007 and V-008) and one non-authoritative stale-output warning (V-014) remain.

## Key Decisions

- Keep publication blocked until the canonical GitHub tag/Release and protected controls exist and execute successfully.
- Accept V-016 as resolved: all three public-smoke jobs precede hermetic transport and final evidence upload.
- Keep V-007 and V-008 classified as external GitHub prerequisites; no local fixture, additional repository, or registry publication may substitute.
- Preserve user-owned `dist/` as untouched, stale, non-authoritative output.

## Open Questions / Risks

- CQ-102 is fixed: the public-smoke checkout disables credential persistence; a worktree-aware fail-closed guard runs before any npm network operation; manual redirects, SSH/proxy environment cleanup, and bounded diagnostics are enforced.
- The canonical public `v2.2.1` tag, immutable GitHub Release, and protected three-OS run do not exist.
- Required tag/ruleset, branch, and `github-release` environment protections remain absent or unverified.

## Executive Summary

The second full re-verification confirms that V-016 is fixed and that local source, runtime, transaction, parity, evidence, and validation checks are terminally green. Completeness is 53/55 plan steps and 33/38 Must requirements, with the residual plan and requirement gaps depending on external GitHub state.

The independent security review found CQ-102 after the other reviews completed. It supersedes their narrower “no source blocker” statements: clearing token environment variables and global/system Git configuration is insufficient while `actions/checkout` persists a local Git extraheader by default. Because the observer covers Node `fetch`, not native Git HTTP, current public-smoke evidence cannot prove anonymous Git package acquisition.

## Implementation Plan Verification

| Measure | Result |
|---|---:|
| Locally implementable plan steps | 53/53 complete |
| Full approved plan | **53/55** |
| Must requirements fully met | **33/38** |
| Must requirements partial on external evidence | 5/38 |
| Source-controlled V-016 | Resolved |

Plan steps 8.4 and 8.9 remain externally pending. R-002, R-006, R-019, R-036, and R-037 remain partial only because the canonical tag/Release, protected cross-platform execution, or repository protections are unavailable. CQ-102 is a verification finding against the anonymous-smoke implementation and must be fixed before those external steps can produce valid evidence.

## Test Suite Results

The delegated test runner completed every authoritative local target:

| Evidence | Terminal result |
|---|---:|
| Cumulative top-level tests/checks | **530 passed, 0 failed** |
| Aggregate watchdog wrappers | 3 passed, 0 failed |
| Aggregate child suites | 186 passed, 0 failed (3 × 62/62) |
| `make test-core` | 68/68, watchdog pass |
| `make test-runtime` | 94/94 Node + 7/7 shell |
| `make test-evidence` | 40/40 |
| `make test-topology` | 0 violations |
| Strict isolated parity | all targets pass, 0 unresolved |
| `make validate` | complete pass |

The earlier interrupted `make test-core` attempt was excluded and superseded by a terminal rerun. No external GitHub state was created or changed.

## Standards and Documentation

- GitHub remains the only Maister distribution surface; no package registry publication path was introduced.
- `tar@7.5.20` remains an allowed read-only third-party dependency.
- Release actions remain commit-SHA pinned, the package stays private, and strict clean parity precedes prepare-time identity generation.
- Exact GitHub tag/full-commit user documentation and the future-private migration checklist remain present.
- CQ-102 violates the anonymous release-evidence contract and must be corrected at the workflow/Git-config seam.

## Optional Review Results

| Review | Status | Headline |
|---|---|---|
| Code quality/security | **Failed** | CQ-102: checkout credential can reach native Git during anonymous smoke. |
| Pragmatic review | Pass for inspected architecture | V-016 finalizer is proportionate and introduces no extra repository/registry. |
| Production readiness | **NO-GO** | Source flow is structurally ready except CQ-102; V-007/V-008 remain external. |
| Reality check | **NO-GO** | GitHub-only architecture is credible locally; real public/protected evidence is unavailable. |

## Issues Requiring Attention

### Critical — source-controlled and fixable

1. **CQ-102 — Public smoke retained an Actions checkout credential; fixed and reverified locally.** `.github/workflows/release.yml` now sets `persist-credentials: false` specifically in `public-smoke`, invokes a worktree-aware redacting fail-closed Git auth guard immediately after setup-node, validates redirects manually, clears ambient SSH/proxy/trace variables, and enforces the controls through static and behavioral tests. Focused evidence passes 16/16; the direct full platform-independent rerun exits 0.

### Critical — external

2. **V-007 — Canonical public release evidence unavailable.** No authorized canonical `v2.2.1` tag, exact GitHub Release, or terminal protected run exists.
3. **V-008 — GitHub protection controls unavailable.** Tag/ruleset, branch, and `github-release` environment protections require explicit repository administration and evidence.

### Warning

4. **V-014 — Stale user-owned `dist/`.** It remains untouched and cannot be used as release input or evidence.

## Fix & Re-Verification History

| Finding | Final status | Post-fix evidence |
|---|---|---|
| V-001 exact Release-tag target | Fixed | Exact tag resolution and annotated-tag peeling pass launcher tests. |
| V-002 archive rejection race | Fixed | Producer/consumer failures are immediately supervised; hostile archive tests pass. |
| V-003 release CI self-dirty | Fixed | Clean strict parity precedes prepare; policy tests pass. |
| V-004 GitHub-only user guide | Fixed | Exact tag/full-commit usage and future-private checklist are present. |
| V-005 public-smoke identity/evidence | Fixed | Exact selectors, Release assets, sidecars, provenance, receipts, and lifecycle are bound. |
| V-006 protected toolchain/matrix | Fixed in source | Node 22/npm 11.4.2 and Linux/macOS/Windows jobs are defined; protected execution remains external. |
| V-007 canonical Release/run | Open external critical | Canonical tag/Release/protected run absent. |
| V-008 repository protections | Open external critical | Administrative controls absent or unverified. |
| V-009 aggregate watchdog | Fixed | Three terminal wrapper passes, each with child 62/62 and final-tree evidence. |
| V-010 acquisition signal semantics | Fixed | Cleanup and native signal behavior pass. |
| V-011 delegated output bounds | Fixed | Backpressure and bounded rolling tails pass. |
| V-012 filesystem oracles | Fixed | Crash/recovery byte, mode, link, existence, and topology checks pass. |
| V-013 cross-platform probes | Fixed in source | Real probes or explicit unavailable outcomes are enforced. |
| V-014 stale `dist/` | Accepted warning | Preserved and excluded from authoritative evidence. |
| V-015 plan/work-log overstatement | Fixed | Only 8.4 and 8.9 remain externally pending; 8.2 is restored after V-016. |
| V-016 release lifecycle order | **Fixed** | Policy 8/8; finalizer waits for all public smokes, then hermetic transport, then final upload. |
| CQ-102 anonymous checkout credential | **Fixed and locally reverified** | Checkout persistence, worktree/local residue, CI coverage, manual redirects, ambient transport env, and raw diagnostic leakage are covered; focused policy/guard evidence passes 16/16 and the direct full platform-independent rerun exits 0. |

## Overall Assessment

| Category | Status |
|---|---|
| Source-controlled implementation | **PASS** |
| Local regression suite | Passed, 530/530 |
| V-016 | Resolved |
| External release acceptance | Unavailable / blocked |
| Production release | **NO-GO** |

## Recommendations

1. Create the authorized canonical GitHub `v2.2.1` tag/Release and run the protected three-OS workflow.
2. Verify repository/tag/branch/environment protections through GitHub administration.
3. After source verification passes, resolve V-007 and V-008 only through authorized canonical GitHub state and protected execution.
4. Do not publish Maister to npmjs, GitHub Packages, or another registry, and do not create another repository.

## Verification Checklist

- [x] Completeness checker completed.
- [x] Full authoritative local test suite completed terminally.
- [x] Code quality/security review completed.
- [x] Pragmatic review completed.
- [x] Production readiness review completed.
- [x] Reality assessment completed.
- [x] V-016 reverified as resolved.
- [x] CQ-102 fixed locally test-first.
- [x] CQ-102 independently reverified locally.
- [ ] Canonical public tag/Release/protected run available.
- [ ] Required GitHub protections evidenced.

## Release Decision

**NO-GO for external release acceptance.** The source-controlled implementation and local verification are green. V-007 and V-008 remain release-blocking external prerequisites; no registry publication or additional repository is permitted.
