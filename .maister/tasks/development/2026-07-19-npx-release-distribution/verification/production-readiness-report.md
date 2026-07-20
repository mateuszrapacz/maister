# Post-V-016 Production Readiness

## TL;DR

**Overall production decision: NO-GO for releasing `v2.2.1`, solely because required external GitHub evidence and controls do not exist.**
The current source-controlled workflow is conditionally GO: V-016 is resolved with exact, fail-closed lifecycle ordering and final artifact timing.
Authoritative local verification is complete at 530 passed and 0 failed, but it cannot substitute for the missing canonical tag/Release, protected three-OS run, or repository protections.
This review did not publish or mutate GitHub and did not treat stale local `dist/` as evidence. The current direct `make test-platform-independent` rerun exits 0 and the focused policy/guard slice passes 16/16.

## Key Decisions

- Classify the current source-controlled release implementation as **GO pending external execution** — no remaining source-controlled production blocker was found in the reviewed post-V-016 tree.
- Keep the overall production verdict at **NO-GO** — V-007 and V-008 are external release blockers, not defects that local code or fixtures can clear.
- Accept the recorded terminal local suite plus current remediation evidence — `test-suite-results.md` reports 530 passed, 0 failed, three successful watchdog wrappers, three 62/62 aggregate child suites, and the direct current platform-independent rerun exits 0; focused policy/guard checks pass 16/16.
- Require immutable patch-forward recovery after publication — a rerun may verify the same Release bytes but must never replace assets under the same tag/version or route through a registry.
- Exclude the user-owned stale `dist/` directory from candidate and readiness evidence.

## Open Questions / Risks

- The canonical public `v2.2.1` tag and GitHub Release are absent, so real anonymous exact-tag/full-commit smoke and public-byte identity have not run against the candidate.
- No protected Linux/macOS/Windows release run exists; runner behavior, final evidence retention, and complete protected execution remain unobserved.
- Tag/ruleset, protected branch, and `github-release` environment controls are absent or unobservable; workflow YAML cannot prove administrative enforcement or reviewers.
- If publication succeeds but a later verification job fails, the intentionally immutable process requires diagnosis and a safe rerun or a new patch version; it provides no in-place asset rollback.
- Existing local `dist/` is stale, user-owned output and must never be uploaded.

## Scope and evidence basis

Target: the protected GitHub-only release workflow for `mateuszrapacz/maister`.

This was a production-readiness assessment of the current post-remediation tree. It inspected the task specification, implementation plan, work log, orchestrator state, current workflow and policy tests, relevant standards, and terminal test evidence. It did not alter external GitHub state.

The test evidence is authoritative only for local behavior:

| Evidence | Result |
|---|---:|
| Local terminal checks | **530 passed, 0 failed** plus current platform-independent exit 0 |
| Aggregate watchdog wrappers | **3 passed, 0 failed** |
| Aggregate child suites | **186 passed, 0 failed (3 × 62/62)** |
| Strict isolated release parity | **PASS**, all three targets, zero unresolved differences |
| `make validate` | **PASS** |
| Canonical tag/Release/protected run | **Unavailable** |
| GitHub protection controls | **Unavailable / absent** |

## Production verdict by boundary

| Boundary | Verdict | Reason |
|---|---|---|
| Source-controlled workflow | **GO pending external execution** | V-016 is fixed; exact ordering, dependencies, evidence aggregation, and final upload timing are encoded and policy-tested. |
| Local implementation and validation | **GO** | Current terminal report records all authoritative local targets complete with no failure. |
| Canonical GitHub release execution | **NO-GO** | The required public `v2.2.1` tag, immutable Release, and protected three-OS run do not exist. |
| Repository governance | **NO-GO** | Required tag/ruleset, branch, and protected-environment controls are absent or unverified. |
| Existing local `dist/` | **Rejected as evidence** | It is stale, user-owned, and outside the isolated same-job candidate boundary. |

## V-016 resolution: lifecycle and final artifact timing

V-016 is resolved in source. The protected workflow now encodes the required sequence:

```text
BUILT
  -> GITHUB_PUBLISHED
  -> GITHUB_VERIFIED
  -> PUBLIC_NO_AUTH_SMOKE_VERIFIED
  -> HERMETIC_PRIVATE_TRANSPORT_VERIFIED
  -> upload final canonical evidence
```

The implementation is fail-closed at each transition:

1. `github-release` starts lifecycle evidence at `BUILT`, records `GITHUB_PUBLISHED`, compares every downloaded public asset byte-for-byte with the same-job candidate, and only then records `GITHUB_VERIFIED`.
2. That job uploads a baseline containing `lifecycle.json`, selector identity, and verified public assets. It does not record either downstream verification state.
3. `public-smoke` depends on `github-release` and runs the real anonymous exact-tag/full-commit smoke independently on Linux, macOS, and Windows. `fail-fast: false` preserves diagnostics from all matrix members.
4. Each matrix member uploads hidden smoke/network evidence with `if: always()`, so failed runs remain diagnosable without being accepted as successful evidence.
5. `finalize-release-evidence` depends on both `github-release` and the complete `public-smoke` matrix. Under GitHub Actions' default success condition, it cannot run after a failed or cancelled matrix member.
6. Finalization downloads the baseline and matrix artifacts, explicitly requires evidence paths for `Linux`, `macOS`, and `Windows`, requires exactly 12 records per OS, and requires every record to be terminally uninstalled and anonymous.
7. The lifecycle update to `PUBLIC_NO_AUTH_SMOKE_VERIFIED` requires the prior state to be exactly `GITHUB_VERIFIED`.
8. Hermetic credential, Release, and transport tests run only after the public state is recorded. The update to `HERMETIC_PRIVATE_TRANSPORT_VERIFIED` requires the prior state to be exactly `PUBLIC_NO_AUTH_SMOKE_VERIFIED`.
9. The canonical `maister-github-release-evidence-*` artifact is uploaded only after the hermetic state transition. Hidden nested network-observation files are retained.

The lifecycle policy test protects these structural properties, including job ordering, downstream dependencies, hidden evidence retention, transition order, and final upload position. The recorded post-fix TDD slice first failed 7/8, then passed 8/8; the broader terminal report subsequently completed all local targets.

## Fail-closed release behavior

| Control | Assessment |
|---|---|
| Trigger identity | Exact stable `vX.Y.Z` syntax is required; the tag is peeled to a commit and must equal `GITHUB_SHA`; package version must equal the tag version. |
| Clean candidate | Full clean status is checked before `prepare`; strict three-target parity precedes prepare-owned manifest generation. |
| Package identity | The prepare-generated resolved commit must equal `GITHUB_SHA`; selector evidence is transferred with the same-job candidate. |
| Candidate construction | All three deterministic archives, checksums, SBOM, provenance, E3, extracted lifecycle, and parity evidence are generated and verified before publication. |
| Publication surface | Only GitHub Release assets are published. Root package metadata is `private: true`, has no `publishConfig`, and release CI contains no registry publication credential or command. |
| Existing Release | A rerun observes the exact existing Release instead of republishing. Every required public byte must equal the candidate; mismatch blocks continuation. |
| Public smoke | Exact tag and full-commit package selectors are exercised for both npm install and npm exec, across three targets and three operating systems, with authorization sources cleared. |
| Evidence completion | Missing artifacts, wrong record count, non-terminal lifecycle, authorization presence, wrong prior state, or failed hermetic tests prevent the final evidence artifact. |
| Action supply chain | Release actions are pinned to commit SHAs. |
| Registry prohibition | No Maister publish/view/dist-tag/deprecate path exists. npmjs access is limited to read-only acquisition/audit of exact locked `tar@7.5.20` and its closure. |

No source-controlled bypass was found that can turn unavailable or failed public/protected evidence into a terminal pass.

## Exact selector and evidence integrity

The source-controlled chain binds the protected tag, full commit, package manifest, Release target and assets, checksums, provenance, archive source identity, E3 digest, installed receipt, target, and terminal lifecycle. Public smoke records 12 combinations per OS: two selectors × two npm paths × three targets.

The finalizer does not infer matrix completeness from a wildcard count alone. It opens the exact per-OS paths and validates their terminal anonymous records, which prevents one duplicated or missing operating-system artifact from satisfying the final state. Selector and artifact semantic validation occurs in the smoke producer; same-run artifact transfer then carries those records into canonical evidence.

## Observability and operational evidence

Strengths:

- Partial public-smoke evidence is uploaded even on failure, including hidden network observations.
- Lifecycle and selector identity are durable run artifacts rather than log-only claims.
- The final artifact contains the verified public baseline plus all three operating-system smoke records.
- Explicit job and process timeouts bound hung validation, release, smoke, finalization, credential-command, and transport paths.
- The transaction watchdog emits regular heartbeats and terminal final-tree evidence; the current report records three successful independent completions.
- Credential, URL-query, subprocess, and authorization evidence is redacted or reduced to bounded classifications.

External operational gaps:

- There is no protected run from which to inspect real logs, approvals, artifact retention, runner versions, or final artifact contents.
- Repository-level retention and reviewer policies are not established by workflow source and require administrative evidence.
- No real public candidate exists to prove Git/npm/GitHub behavior beyond local and hermetic coverage.

## Rollback, failure recovery, and rerun semantics

Before publication, any validation or packaging failure blocks publication. After publication, the workflow treats GitHub Release bytes as immutable:

- concurrency is scoped by release tag and does not cancel an in-progress release;
- reruns detect an existing Release and skip creation;
- reruns download and byte-compare all required assets against the reconstructed same-commit candidate;
- missing or mismatched bytes fail instead of being replaced;
- downstream public or hermetic failure prevents terminal lifecycle evidence;
- a safe rerun may resume verification of the same exact immutable state;
- an unsafe or semantically wrong published candidate requires patch-forward release under a new version, not asset replacement;
- no npm registry is available as a repair, fallback, or rollback channel.

Installer recovery remains separate from release rollback. Exit code 7 preserves lock metadata, journals, receipts, backups, staging, control planes, and applicable operation state for exact recovery. The local crash, journal, transaction, cleanup, and filesystem-oracle evidence is green; protected cross-platform confirmation remains pending.

## Blockers and concerns

### External blocker V-007 — canonical release evidence absent

The canonical public `v2.2.1` tag and immutable GitHub Release do not exist. Consequently, the following release-blocking evidence is unavailable:

- exact public Release-byte equality;
- real anonymous exact-tag and full-commit npm/Git acquisition;
- install/status/verify/uninstall for all targets on all protected operating systems;
- terminal canonical lifecycle and final evidence artifact from the protected workflow.

This is an external prerequisite, not a source-controlled defect. It must not be replaced with fixtures or an unprotected run.

### External blocker V-008 — repository protections absent or unverified

Required tag/ruleset, protected branch, and `github-release` environment controls do not exist or are not observable. Before release, administrative evidence must prove that untrusted pull requests cannot access release credentials or bypass the protected release path, and that required approvals/checks guard publication.

This is an external governance blocker, not something workflow YAML alone can satisfy.

### Warning V-014 — stale user-owned `dist/`

The current workspace contains stale local `dist/`. It is not candidate output, was not modified by this review, and must remain excluded. Only artifacts generated in the isolated clean protected job and verified in that same job are publishable.

## Production GO criteria

Production may move from NO-GO to GO only when all of the following are true:

1. Configure and independently verify protected tag/ruleset, branch, and `github-release` environment controls, including required reviewers and untrusted-PR secret isolation.
2. Create the canonical protected immutable `v2.2.1` tag at the approved candidate commit and execute the release workflow; do not manually substitute assets or use another repository.
3. Confirm exact same-job candidate/public byte equality for all archives and sidecars.
4. Retain successful protected Linux, macOS, and Windows public-smoke evidence for exact tag and full-commit selectors, both npm paths, and all three targets.
5. Confirm the canonical lifecycle terminates at `HERMETIC_PRIVATE_TRANSPORT_VERIFIED` and the final evidence artifact contains the baseline, all three public-smoke artifacts, network observations, and complete identity chain.
6. Confirm no registry mutation occurred and stale local `dist/` was not used.

## Final decision

**NO-GO for production release.**

The post-V-016 source-controlled implementation is ready for protected execution and has no identified local release blocker. Production publication remains unauthorized and unproven until V-007 and V-008 are cleared by real canonical GitHub state and protected-run evidence. V-014 remains a non-authoritative local-output warning.
