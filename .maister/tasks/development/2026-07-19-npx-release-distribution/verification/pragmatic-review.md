# Post-V-016 Pragmatic Review

## TL;DR

**PASS for source-controlled pragmatic design; release remains NO-GO on external prerequisites.**
V-016 is resolved: one downstream finalizer records the exact public-then-hermetic lifecycle and uploads canonical evidence only after the terminal state.
The extra job and artifact transfers are proportionate to GitHub Actions job isolation and the required three-OS matrix join; no repository, registry, or speculative abstraction was added.
Local authoritative evidence is complete and passing, the current direct `make test-platform-independent` rerun exits 0, and the focused current policy/guard slice passes 16/16; the absent canonical `v2.2.1` Release/protected run and GitHub protections remain external blockers.

## Key Decisions

- Keep `finalize-release-evidence` as the single canonical lifecycle owner after `GITHUB_VERIFIED` — it is the smallest maintainable join point for three isolated public-smoke jobs.
- Keep the verified baseline and per-OS evidence as explicitly named intermediate artifacts — GitHub Actions jobs do not share a filesystem, so transfer is required rather than architectural ceremony.
- Treat only `maister-github-release-evidence-${{ github.run_id }}` as complete evidence — it is uploaded after the exact terminal state and includes the joined anonymous-smoke records.
- Do not add another repository, npm registry, GitHub Packages flow, or generic release abstraction.

## Open Questions / Risks

- The canonical public `v2.2.1` tag/Release and its protected Linux/macOS/Windows run do not exist, so the source-controlled workflow has not produced real release evidence.
- Required GitHub tag, branch/ruleset, and `github-release` environment protections remain absent external controls.
- Public smoke executes 12 selector/path/target combinations on each of three operating systems; protected-run duration and artifact-retention cost remain unobserved until the first real release.
- Local `dist/` is stale, user-owned disposable output and must not be treated as same-job release evidence.

## Status

| Area | Status | Pragmatic assessment |
|---|---|---|
| V-016 lifecycle ordering | **Resolved** | Exact sequence is enforced in one downstream job: `GITHUB_VERIFIED -> PUBLIC_NO_AUTH_SMOKE_VERIFIED -> HERMETIC_PRIVATE_TRANSPORT_VERIFIED`. |
| Final artifact timing | **Resolved** | The complete evidence upload appears only after hermetic tests pass and the terminal lifecycle state is written. |
| Finalization architecture | **Proportionate** | One matrix join job replaces incompatible distributed lifecycle ownership; it does not introduce a reusable framework or second source of truth. |
| Distribution scope | **Proportionate** | GitHub is the only Maister distribution surface; registry use remains limited to read-only locked third-party dependency acquisition. |
| Launcher/installer seams | **Proportionate** | Credential, transport, archive, process, authority, and recovery boundaries correspond to binding security and failure contracts and have active callers/tests. |
| Test depth | **Risk-aligned** | Filesystem, crash, transaction, identity, transport, and release-policy coverage matches the consequences of partial installation and untrusted acquisition. |
| External release readiness | **Blocked** | V-007/V-008 require real GitHub state and administrative controls; local fixtures cannot satisfy them. |

## Findings

### P-101 — resolved — canonical lifecycle has one ordered finalization owner

The previous defect placed `HERMETIC_PRIVATE_TRANSPORT_VERIFIED` in `github-release` before the downstream public smoke. The current workflow corrects that ownership:

1. `github-release` publishes and byte-verifies the immutable GitHub Release, records only `GITHUB_VERIFIED`, and uploads a clearly named baseline.
2. `public-smoke` depends on `github-release` and emits hidden per-OS anonymous evidence for Linux, macOS, and Windows.
3. `finalize-release-evidence` depends on both jobs, downloads the baseline and all smoke shards, requires 12 terminal no-authorization records per OS, and advances from `GITHUB_VERIFIED` to `PUBLIC_NO_AUTH_SMOKE_VERIFIED`.
4. The same finalizer runs the hermetic credential/Release/transport tests, requires the public state, advances to `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`, and only then uploads `maister-github-release-evidence-${{ github.run_id }}`.

This is a linear state machine rather than parallel claims. The intermediate baseline is not presented as terminal evidence, and `github-release` contains neither post-public state.

### P-102 — info — finalizer complexity is required, not speculative

The finalizer adds checkout, dependency setup, two artifact downloads, matrix evidence validation, three focused hermetic test invocations, two guarded state transitions, and one final upload. Each operation is directly required by either job isolation, the three-OS join, or the binding lifecycle. There is no new library, reusable workflow, state-machine framework, repository, or registry integration to maintain.

Collapsing the finalizer into `github-release` would recreate V-016 because the matrix has not run yet. Moving finalization into one matrix member would make one operating system own incomplete global evidence. The current join job is therefore the least complex faithful shape.

### P-103 — info — policy test binds ordering and artifact timing

`release-github-only-policy.test.mjs` verifies that:

- post-public lifecycle states do not occur in `github-release`;
- the finalizer depends on both `github-release` and `public-smoke`;
- hidden smoke evidence is retained;
- public verification precedes hermetic tests and terminal state; and
- terminal state precedes the complete evidence upload.

The historical lifecycle slice passed **8/8**; the current release policy/guard slice passes **16/16**. The authoritative Phase 11 report records **530 passed, 0 failed** across completed local targets, including terminal `make test-core`, `make validate`, strict clean isolated parity, and three passing aggregate watchdog runs; the direct current platform-independent rerun exits 0.

### P-104 — external blocker — release evidence cannot yet be produced

V-007 and V-008 are not source-controlled design defects. The public `v2.2.1` tag/Release, protected three-OS run, and GitHub protections are absent. The implementation correctly leaves plan items 8.4 and 8.9 externally pending and does not substitute fixtures, another repository, a package registry, or an unprotected run.

### P-105 — info — stale `dist/` remains non-authoritative

The untracked local `dist/` directory is user-owned residue. This read-only review did not remove or regenerate it. The release workflow uses isolated same-job output and byte-verifies the published assets, so stale local files are neither input nor proof.

## Maintainability Assessment

The workflow uses familiar GitHub Actions primitives with exact-SHA-pinned actions and descriptive artifact/job names. Lifecycle guards fail if a prior state is unexpected, preventing accidental state skipping. Evidence count and anonymous-terminal checks are close to the orchestration point and avoid an unnecessary helper abstraction for a short, release-specific policy.

The 12-record expectation is intentionally explicit because it represents two selector forms, two npm invocation paths, and three targets. If that matrix changes, the static count and smoke producer must change together; this is a visible policy coupling, not hidden generalized machinery.

## Verdict

**Source-controlled implementation: PASS, pragmatically sound, no fixable finding.**

**Release decision: NO-GO until V-007 and V-008 are satisfied by real protected GitHub state.**
