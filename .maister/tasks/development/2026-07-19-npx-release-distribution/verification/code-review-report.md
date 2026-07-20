# Post-V-016 Code Quality and Security Review

## TL;DR

**Source-controlled review: PASS after remediation.** V-016 and CQ-102 are resolved. The workflow carries one verified baseline through the required state order, waits for successful Linux, macOS, and Windows public smoke jobs, records `PUBLIC_NO_AUTH_SMOKE_VERIFIED`, runs the hermetic private-transport gate, records `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`, and only then uploads the final evidence artifact. Overall release acceptance remains NO-GO because V-007/V-008 are external.

The public-smoke checkout now sets `persist-credentials: false`; a worktree-aware fail-closed Git residue guard runs immediately after setup-node and before any npm network operation. The smoke manually validates every redirect, clears ambient SSH/proxy/trace variables, and avoids raw child stdout/stderr in diagnostics. Its network observer still does not instrument native Git, so real protected three-OS execution remains external evidence rather than being inferred locally.

The supplied authoritative local report records 530 top-level checks passed, 0 failed, including three terminal 62/62 aggregate child suites. The post-remediation direct `make test-platform-independent` rerun exits 0, and the current focused policy/guard slice passes 16/16.

## Post-remediation update

The read-only findings below are retained as historical review evidence. All locally fixable findings from this review are now addressed: `tests/release/**` is included in validation workflow path filters; the protected release validation job runs the release policy and Git-auth guard suites; redirects are manual, bounded, and revalidated against an allowlist; ambient SSH/proxy/trace variables are removed from the smoke environment; worktree Git configuration is checked; and raw child output is not copied into assertion diagnostics. The current source-controlled verdict is PASS. V-007 and V-008 remain external release blockers.

## Key Decisions

- Mark prior finding V-016 / CQ-101 as resolved in the current tree.
- Treat persisted checkout credentials as a critical source-controlled defect because they invalidate a release-blocking anonymous-acquisition claim, even if a particular npm/Git execution happens not to consume the credential.
- Keep source defects, external GitHub prerequisites, and user-owned stale `dist/` output in separate categories.
- Do not infer release readiness from passing local tests when the real protected release path has never executed.

## Open Questions / Risks

- A real protected run is still required to prove runner behavior, artifact transfer, exact public bytes, and anonymous tag/full-commit acquisition.
- The canonical public `v2.2.1` tag and GitHub Release do not exist.
- GitHub tag/branch/ruleset and `github-release` environment protections are absent or unverified.
- Existing user-owned `dist/` remains stale disposable output and must not be used as release input.

## Review Scope and Evidence

Primary review targets:

- `.github/workflows/release.yml`
- `tests/platform-independent/release-github-only-policy.test.mjs`
- `tests/release/public-git-package-smoke.mjs`
- `tests/release/network-observer.mjs`
- the approved specification, implementation plan, work log, orchestrator state, and `verification/test-suite-results.md`

No production source, test, workflow, orchestrator state, dashboard, roadmap, external GitHub control, tag, Release, or package registry was modified. This report is the only file owned by this review.

## Critical Findings

### CQ-102 — Public smoke retained an Actions checkout credential (resolved)

**Severity:** critical  
**Category:** security / release-evidence correctness  
**Fixability:** locally fixed and locally reverified  
**Locations:** `.github/workflows/release.yml:198-200`; `tests/release/public-git-package-smoke.mjs:36-65,71-77,185-203,273-284`; `tests/release/network-observer.mjs:12-31`; `tests/platform-independent/release-github-only-policy.test.mjs:48-62,100-108`

The public-smoke job checks out the repository without overriding the checkout action's `persist-credentials` input. For the exact pinned checkout revision, the documented default is `true`: the action persists its authentication token in the local Git configuration until post-job cleanup. The smoke then starts npm via `spawnSync` without an isolated `cwd`, so the npm process begins in the checked-out repository and can observe effective local Git configuration.

The smoke removes token environment variables, replaces global/system Git configuration, disables credential helpers, and isolates `HOME`, but it does not remove or reject the checkout-owned local `http.https://github.com/.extraheader`. Consequently the workflow has not established that exact-tag and full-commit npm/Git acquisition is anonymous.

The recorded `network_policy.authorization: false` does not close this gap. `network-observer.mjs` wraps JavaScript `fetch`; it does not instrument native Git HTTP traffic. The finalizer then trusts the smoke record's boolean while validating the 12 records per platform, so a protected run could claim anonymous Git acquisition without observing that boundary.

**Applied correction:**

1. `public-smoke` sets `persist-credentials: false` and runs the worktree-aware guard before npm/Git acquisition.
2. The guard fails closed on local/worktree auth residue without logging values.
3. Redirects are manually followed with host/path validation and a bound; SSH/proxy/trace environment is cleared; diagnostics omit child output.
4. CI path filters and the release validation job cover the release-critical harness, and current focused checks pass 16/16.

## Warnings

No additional source-controlled warning was found in the post-V-016 lifecycle/artifact changes.

## Former review findings now resolved

- CI bypass through missing `tests/release/**` path filters and missing release-job policy execution: fixed and statically enforced.
- Unobserved/followed redirects: fixed with manual bounded redirect handling and per-hop allowlist validation.
- Ambient SSH, proxy, and Git trace overrides: removed from the smoke child environment.
- Raw child stdout/stderr in failure messages: removed to prevent secret-bearing diagnostics.

### External release prerequisites — not source defects

**Severity:** release-blocking external prerequisites  
**Fixability:** not fixable by local source changes; requires explicit repository authority

- The canonical public `v2.2.1` tag, immutable GitHub Release, exact public-byte comparison, and real anonymous exact-selector smoke are unavailable.
- Protected three-OS execution and required tag, branch/ruleset, and `github-release` environment controls are unavailable or unverified.

These correspond to the existing V-007 and V-008 blockers. They must not be simulated with a second repository, local fixtures, or fabricated evidence.

### User-owned stale `dist/` — non-authoritative output

**Severity:** warning  
**Fixability:** operational; do not alter during this review  
**Location:** local untracked `dist/`

The existing output is stale and disposable. Fresh isolated package/parity checks passed, but that does not make the user-owned directory a valid release input. This remains the existing V-014 warning, not a production source defect.

## Informational Findings

### V-016 / CQ-101 is resolved by actual job dependencies and transition timing

**Status:** resolved  
**Locations:** `.github/workflows/release.yml:138-185,187-219,221-276`; `tests/platform-independent/release-github-only-policy.test.mjs:64-98`

The current workflow implements the specified sequence:

1. `github-release` creates `BUILT`, records `GITHUB_PUBLISHED`, verifies exact downloaded bytes, records `GITHUB_VERIFIED`, and uploads a baseline artifact.
2. `public-smoke` depends on `github-release` and runs a non-fail-fast Linux/macOS/Windows matrix.
3. Each matrix leg uploads hidden public-smoke and network-observation evidence.
4. `finalize-release-evidence` depends on both `github-release` and the complete `public-smoke` matrix.
5. The finalizer downloads the baseline and the three separately named smoke artifacts, requires 12 terminal anonymous records for each runner OS, and changes state from `GITHUB_VERIFIED` to `PUBLIC_NO_AUTH_SMOKE_VERIFIED`.
6. Only afterward does it execute the hermetic private-transport tests and change state to `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`.
7. The final evidence upload follows the terminal state and uses `include-hidden-files: true`.

The pinned `actions/download-artifact` behavior supports the path construction used here: with a matching pattern and default `merge-multiple: false`, each artifact is extracted under its artifact-name directory. The pinned upload action excludes dotfiles by default, so the explicit `include-hidden-files: true` flags on both intermediate and final uploads are necessary and correctly present.

The new lifecycle policy test asserts job placement, dependencies, state order, hidden evidence retention, and final upload timing. It is a useful regression gate, although it needs the CQ-102 anonymous-checkout assertions described above.

### Local regression evidence is terminal and green

The supplied `verification/test-suite-results.md` supersedes the earlier interrupted command and reports:

- 530 top-level checks passed, 0 failed;
- `make test-core`, `make test-runtime`, `make test-evidence`, `make test-topology`, strict isolated `make test-parity-release`, and `make validate` all terminally passed;
- three aggregate wrappers passed, each with a 62/62 child suite and non-empty final-tree evidence;
- the focused GitHub-only policy suite passed 8/8.

These results support source regression health but cannot satisfy CQ-102 or the external protected-release evidence requirements.

## Verdict

**Code review verdict: PASS for source-controlled implementation.** V-016 and CQ-102 are fixed and locally reverified. The overall release remains **NO-GO** until V-007 and V-008 are satisfied by the authorized canonical GitHub tag, immutable Release, protected three-OS run, and repository protections. No package-registry publication or additional repository is needed or permitted.
