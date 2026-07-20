# Post-V-016 Reality Check

## TL;DR

**Reality status: NOT READY / NO-GO for release, with no remaining source-controlled defect found in the inspected post-V-016 scope.** V-016 is resolved: the protected workflow now records the exact lifecycle order `BUILT → GITHUB_PUBLISHED → GITHUB_VERIFIED → PUBLIC_NO_AUTH_SMOKE_VERIFIED → HERMETIC_PRIVATE_TRANSPORT_VERIFIED`, and uploads the canonical complete evidence only after the three-OS public smoke matrix and hermetic private-transport verification succeed.

The implementation credibly provides a GitHub-only Git-package launcher and preserves GitHub Release archives plus `maister-install.mjs` as the payload and mutation authorities. The supplied terminal local test report records 530 passed checks and 0 failures; the current direct platform-independent rerun exits 0 and focused policy/guard checks pass 16/16. Local evidence does not, and cannot, prove the currently unavailable real public Git-package/Release path or protected GitHub controls. The absent canonical `v2.2.1` tag, GitHub Release, protected three-OS run, and repository protections therefore remain external release blockers.

## Key Decisions

- Treat `verification/test-suite-results.md` and current terminal remediation checks as test-execution evidence; no external GitHub workflow was run during this assessment.
- Classify V-016 as resolved from direct source inspection plus the recorded passing lifecycle policy test.
- Distinguish the intermediate `maister-github-release-baseline-*` transfer artifact from the final canonical `maister-github-release-evidence-*` artifact. The baseline intentionally stops at `GITHUB_VERIFIED`; only the latter represents the complete lifecycle.
- Do not convert workflow definitions, hermetic fixtures, or local tests into evidence of a real public/private GitHub E2E or protected-run execution.

## Open Questions / Risks

- The real anonymous exact-tag and full-commit flows remain unobserved until the canonical public `v2.2.1` tag and immutable GitHub Release exist.
- Linux, macOS, and Windows behavior in the protected release workflow remains unobserved until a protected run completes.
- Tag/ruleset, branch, and `github-release` environment protections remain unavailable external evidence.
- If the canonical repository becomes private, the documented migration checklist becomes release-blocking and real authenticated private Git plus private Release E2E must replace the current public smoke; hermetic transport tests alone are insufficient.
- Local `dist/` is user-owned stale/disposable output and must not be treated as same-job candidate evidence or uploaded.

## Assessment Scope and Evidence

This assessment inspected the current task specification, implementation plan, work log, orchestrator state, release workflow, GitHub-only policy test, package boundary, operator documentation, prior verification reports, and `verification/test-suite-results.md`. Test execution was explicitly skipped.

The latest supplied test report supersedes the historical interrupted `make test-core` attempt. It records:

| Evidence | Recorded terminal result |
|---|---:|
| Prior focused/local checks | 112 passed, 0 failed |
| Continuation checks | 418 passed, 0 failed |
| Cumulative local checks | **530 passed, 0 failed** |
| Aggregate watchdog wrappers | 3 passed, 0 failed |
| Aggregate child suites | 186 passed, 0 failed (three terminal 62/62 runs) |
| Strict parity | Passed for Codex, Cursor, and Kiro CLI with zero unresolved differences |
| External GitHub acceptance | Unavailable; not fabricated |

The clean-candidate parity run occurred in an isolated clone. It does not make the dirty primary worktree or its existing `dist/` release-authoritative.

## V-016 Verification

### Exact lifecycle ordering

V-016 is **resolved** in `.github/workflows/release.yml`:

1. `github-release` creates `lifecycle.json` at `BUILT`.
2. GitHub Release publication advances it to `GITHUB_PUBLISHED`.
3. Exact public-byte comparison advances it to `GITHUB_VERIFIED`.
4. That job uploads an explicitly named baseline artifact and does not record either later state.
5. `public-smoke` depends on `github-release` and runs on Ubuntu, macOS, and Windows.
6. `finalize-release-evidence` depends on both `github-release` and the complete `public-smoke` matrix.
7. The finalizer downloads all public-smoke artifacts and requires, for each runner OS, exactly 12 parseable records whose lifecycle is terminally `uninstalled` and whose authorization observation is `false`.
8. Only after those checks does it require prior state `GITHUB_VERIFIED` and advance to `PUBLIC_NO_AUTH_SMOKE_VERIFIED`.
9. It then runs the credential, Release, and transport test suites, requires the public-smoke state, and advances to `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`.
10. Only after the final state does it upload `maister-github-release-evidence-${{ github.run_id }}`.

The public-smoke and final evidence uploads explicitly include hidden files, so the dotfile NDJSON evidence is not silently dropped at the job boundary.

### Regression enforcement

`tests/platform-independent/release-github-only-policy.test.mjs` enforces the important structural invariants:

- the finalizer follows the public-smoke matrix and depends on it;
- the publication job cannot claim either post-smoke lifecycle state;
- public smoke artifacts and final evidence retain hidden files;
- `PUBLIC_NO_AUTH_SMOKE_VERIFIED` precedes hermetic verification;
- `HERMETIC_PRIVATE_TRANSPORT_VERIFIED` precedes final evidence upload.

The historical lifecycle slice recorded 8 passed and 0 failed; the current policy/guard slice records 16 passed and 0 failed. This is credible source-controlled prevention of the ordering, checkout-auth, redirect, CI-coverage, and diagnostic-leakage defects, while still not claiming a real protected workflow run.

## Functional Reality

### GitHub-only npm Git-package distribution

The current implementation genuinely establishes the intended local/source-controlled architecture:

- the root package is `@mateuszrapacz/maister`, `private: true`, has no `publishConfig`, exposes one ESM `maister` binary, requires Node 22+, and pins normal dependency `tar` to `7.5.20`;
- package acquisition is designed for exact GitHub tag or full-commit npm Git specs, not npmjs or GitHub Packages publication;
- prepare-time resolved-commit evidence is carried in the package and protected CI checks selector/tag/commit agreement;
- public Release access is anonymous-first, while optional private Release API credentials follow the closed `GH_TOKEN → GITHUB_TOKEN → bounded gh → anonymous` policy;
- Release assets are acquired through the fixed GitHub API asset boundary, verified, streamed, extracted into a private operation root, and delegated to the existing installer;
- state-only commands bind to the installed receipt/control plane rather than reacquiring payloads;
- release automation contains GitHub Release publication but no Maister registry publication, dist-tag, registry observation, or publication credential machinery;
- deterministic package, extracted lifecycle, strict parity, transaction, crash, journal, launcher, transport, archive-memory, topology, and validation checks have terminal local evidence in the supplied report.

This is sufficient to conclude that the implementation is internally coherent and locally functional. It is not sufficient to conclude that a user can install `v2.2.1` from the canonical GitHub repository today, because the tag and Release assets required by that path do not exist as verified external evidence.

### Public versus future private operation

For the repository's current public mode, the intended user path should work anonymously once the exact tag and matching Release exist, but that statement remains an implementation expectation rather than observed E2E fact.

If the repository later becomes private, npm/Git must authenticate Git-package acquisition through operator-managed SSH or HTTPS credentials, while the launcher separately authenticates private Release API access. The repository documentation records the required future-private migration checklist, including protected secret boundaries, all credential paths, exact-selector/private-Release smoke, leak prevention, and complete identity/evidence reruns. No second repository or package registry is required.

## Findings

### Resolved source finding

#### RC-201 — resolved — V-016 lifecycle and final artifact timing

The post-V-016 workflow and policy test implement and enforce the normative state order. The final canonical evidence artifact cannot be uploaded before successful public no-auth smoke aggregation and hermetic private-transport verification.

### External critical blockers

#### RC-202 — critical external — canonical public release acceptance unavailable

The canonical public `v2.2.1` tag and immutable GitHub Release are absent. Therefore there is no real evidence for exact-tag/full-commit npm Git acquisition, anonymous Release metadata/assets, public-byte identity, all-target lifecycle, or public no-authorization behavior against the canonical release.

#### RC-203 — critical external — protected three-OS execution unavailable

The source-controlled matrix is defined, but no protected Linux/macOS/Windows Node 22 run proves the complete candidate on GitHub-hosted runners. Local tests and workflow syntax cannot substitute for that execution.

#### RC-204 — critical external — GitHub protection posture unavailable

Required tag/ruleset, protected branch, and protected environment controls are not evidenced. These controls are external prerequisites and must not be represented as source defects or fabricated by local fixtures.

### Non-authoritative local output

#### RC-205 — warning — user-owned stale `dist/`

The existing local `dist/` directory is disposable output. It is not the isolated same-job candidate described by the release contract and must remain excluded from publication evidence.

## Claim Reconciliation

| Claim | Assessment |
|---|---|
| V-016 is fixed | **Supported** by exact workflow ordering, final artifact timing, and the recorded passing policy test. |
| The GitHub-only/no-registry architecture is implemented | **Supported locally/source-wise.** |
| Local authoritative validation is complete | **Supported by the supplied terminal report:** 530 passed, 0 failed. |
| Public `v2.2.1` install/exec works today | **Not evidenced.** The canonical tag/Release path is unavailable. |
| Protected three-OS release flow works | **Not evidenced.** The workflow exists but has not supplied a protected run. |
| Real private E2E works | **Not claimed and not evidenced.** It becomes mandatory only after a visibility change. |
| Existing local `dist/` is releasable | **Rejected.** It is stale, user-owned, and non-authoritative. |

## Deployment Decision

**❌ NOT READY / NO-GO for release.**

No source-controlled V-016 defect remains in the inspected tree. Release readiness is blocked by external evidence and controls only:

1. create the authorized canonical protected `v2.2.1` tag and matching immutable GitHub Release through the approved release process;
2. complete the protected Linux/macOS/Windows run, exact public-byte verification, and real anonymous exact-tag/full-commit smoke;
3. establish and capture the required GitHub tag/ruleset, branch, and environment protections;
4. accept only the resulting final lifecycle artifact ending in `HERMETIC_PRIVATE_TRANSPORT_VERIFIED` as canonical release evidence.

Until those conditions are met, the correct status is a locally complete GitHub-only implementation with unavailable external release acceptance—not a production-ready public or private release.
