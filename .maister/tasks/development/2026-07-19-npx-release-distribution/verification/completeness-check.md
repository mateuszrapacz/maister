# Post-V-016 Implementation Completeness Check

## TL;DR

**Status: source-controlled implementation complete; release acceptance incomplete / NO-GO.** Current evidence supports **53/55 implementation-plan steps** and **33/38 Must requirements as fully met**. The remaining two plan steps and five partial requirements depend on external GitHub state: the canonical public `v2.2.1` tag and immutable Release, a protected Linux/macOS/Windows run, and required repository/tag/environment protections. No current source-controlled completeness defect was found.

**V-016 is resolved.** `.github/workflows/release.yml` now creates `BUILT`, records `GITHUB_PUBLISHED`, records `GITHUB_VERIFIED`, waits for all three `public-smoke` matrix jobs, validates 12 terminal anonymous records for each of Linux/macOS/Windows, records `PUBLIC_NO_AUTH_SMOKE_VERIFIED`, runs the hermetic private transport gate, records `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`, and only then uploads the canonical final evidence artifact. The policy test enforces this ordering and final-upload timing.

The authoritative local terminal evidence is complete and passing: **530 passed, 0 failed**, including terminal `make test-core`, `make test-runtime`, `make test-evidence`, `make test-topology`, strict clean-candidate `make test-parity-release`, and `make validate`. Three aggregate watchdog runs each completed with wrapper pass, child **62/62**, and non-empty final-tree evidence. The current direct `make test-platform-independent` rerun exits 0 after release-harness remediation, and the focused current policy/guard slice passes **16/16**. This local result does not substitute for missing protected/public GitHub execution.

## Key Decisions

- Count a plan item as complete only when current source and terminal evidence support it; checkbox text alone is not sufficient.
- Mark 8.2 complete because the post-V-016 workflow and policy test now enforce the exact lifecycle and final artifact timing.
- Keep 8.4 and 8.9 externally pending; do not fabricate the absent tag, Release, protected run, or protection controls.
- Keep R-002, R-006, R-019, R-036, and R-037 partial until their required canonical/protected cross-platform evidence exists.
- Treat local `dist/` as user-owned disposable output and never as same-job release evidence.

## Open Questions / Risks

- The canonical repository has no public `v2.2.1` tag or corresponding immutable GitHub Release, so real anonymous exact-tag/full-commit acquisition and public-byte acceptance cannot run.
- Required tag/ruleset, protected branch, and `github-release` environment controls are absent or not observable; the workflow definition cannot prove those administrative protections.
- Linux/macOS/Windows jobs are defined, but no protected terminal run exists for the exact candidate.
- The dirty worktree and stale local `dist/` were preserved. Neither is authoritative release evidence.

## Structured Status

| Area | Result | Count |
|---|---|---:|
| Source-controlled implementation | Complete | 53/53 locally implementable plan steps |
| Full approved plan | Incomplete due to external prerequisites | **53/55** |
| Must requirements fully met | Complete locally where evidence is available | **33/38** |
| Must requirements partial | External evidence pending | **5/38** |
| V-016 lifecycle defect | Resolved | 1/1 |
| Authoritative local terminal checks | Pass | **530/530** plus current platform-independent exit 0 |
| Source-controlled critical findings | None | 0 |
| External critical blockers | Present | 2 categories |
| User-owned stale output | Non-authoritative warning | `dist/` |

## Implementation-Plan Completeness

The plan contains exactly 55 numbered steps. Every step was checked against current source and the terminal evidence in `verification/test-suite-results.md`.

| Group | Steps checked | Complete | Residual gap |
|---|---|---:|---|
| 1 — package protection and prepare identity | 1.1–1.5 | 5/5 | None |
| 2 — credentials and Release contract | 2.1–2.5 | 5/5 | None |
| 3 — authorized transport and deadlines | 3.1–3.6 | 6/6 | None |
| 4 — streaming archive and candidate validation | 4.1–4.6 | 6/6 | None |
| 5 — orchestration and sole-writer delegation | 5.1–5.8 | 8/8 | None |
| 6 — receipt-bound control plane and transaction authority | 6.1–6.6 | 6/6 | None |
| 7 — crash, journals, watchdog, platform acceptance | 7.1–7.4 | 4/4 | Local implementation and terminal evidence complete |
| 8 — GitHub-only release and E2E | 8.1–8.9 | **7/9** | 8.4 and 8.9 externally pending |
| 9 — docs and metadata | 9.1–9.6 | 6/6 | None |
| **Total** | **1.1–9.6** | **53/55** | **2 external** |

### Residual plan steps

- **8.4 — external critical:** the real anonymous exact-tag/full-commit `npm install`/`npm exec` smoke cannot run until canonical `v2.2.1` and its exact GitHub Release assets exist. The harness and workflow are implemented; fixtures are not counted as public acceptance.
- **8.9 — external critical:** the protected three-OS Node 22/npm 11.4.2 run has not occurred. Matrix definitions and local platform probes are implementation evidence, not protected-run evidence.

### V-016 / step 8.2 resolution

The exact current workflow sequence is:

1. `github-release` initializes lifecycle state `BUILT`.
2. GitHub-only asset publication records `GITHUB_PUBLISHED`.
3. byte-for-byte public asset verification records `GITHUB_VERIFIED`.
4. a baseline artifact transfers that state; `github-release` does not record either downstream state.
5. the Linux/macOS/Windows `public-smoke` matrix uploads hidden no-auth evidence files.
6. `finalize-release-evidence`, with `needs: [github-release, public-smoke]`, downloads the baseline and all smoke artifacts and validates exactly 12 terminal anonymous records per OS.
7. only then it records `PUBLIC_NO_AUTH_SMOKE_VERIFIED`.
8. hermetic credential/Release/transport tests run next, after which it records `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`.
9. `Upload complete GitHub-only release evidence` occurs after the final state and retains hidden evidence files.

`tests/platform-independent/release-github-only-policy.test.mjs` asserts the job boundaries, matrix dependency, hidden-file retention, both state transitions, hermetic test placement, release-harness CI coverage, redirect handling, and final artifact timing. Its historical lifecycle slice passed **8/8**; the current policy/guard slice passes **16/16**. V-016 and CQ-102 are therefore closed as source-controlled defects; actual execution remains part of external steps 8.4/8.9.

## Must-Requirement Completeness

All 38 IDs, priorities, and acceptance texts remain exact and ordered across requirements Markdown, specification Markdown, and decoded specification HTML; the drift test passes.

| ID | Status | Current evidence / qualification |
|---|---|---|
| R-001 | Met | Private root package, closed ESM binary/files boundary, Node 22 floor, and generated manifest are covered by package identity and pack validation. |
| R-002 | **Partial — external** | Exact tag/full-commit selectors, manifest binding, docs, and protected-CI checks are implemented; canonical protected selector execution is unavailable. |
| R-003 | Met | Exact normal dependency `tar@7.5.20`, lock integrity, SBOM inclusion, and read-only dependency acquisition are enforced. |
| R-004 | Met | Closed seven-command/three-target CLI and recover-only UUID handling pass launcher CLI and zero-mutation tests. |
| R-005 | Met | Repository, tag, target, Release route, and asset identities are fixed and non-configurable. |
| R-006 | **Partial — external** | Anonymous/no-Authorization transport and real-smoke harness exist; canonical tag/full-commit Git-package and Release acquisition cannot run without `v2.2.1`/Release. |
| R-007 | Met | Git credential ownership remains with npm/Git; launcher credential handling and token-bearing URL rejection are implemented and documented. |
| R-008 | Met | `GH_TOKEN` → `GITHUB_TOKEN` → bounded `gh` → anonymous precedence passes. |
| R-009 | Met | Injected non-shell `gh` command port, bounds, timeout, validation, redaction, and fallback pass. |
| R-010 | Met | Anonymous-first metadata and one eligible authenticated retry with fail-closed explicit credentials pass. |
| R-011 | Met | Authorization is confined to approved `api.github.com` routes and permanently stripped cross-host. |
| R-012 | Met | Selected sidecars/archives use numeric GitHub API asset URLs, octet-stream, and bounded 200/302 behavior. |
| R-013 | Met | One 15-second pre-header deadline per attempt plus body-idle/resource/aggregate bounds and cleanup pass transport tests. |
| R-014 | Met | One stable non-draft/non-prerelease exact Release and unique allowlisted assets are enforced. |
| R-015 | Met | Prepare-time full-commit manifest generation, atomic/no-follow handling, package boundary, and candidate identity chain pass. |
| R-016 | Met | Streaming SHA-256 agreement with checksums, SBOM, provenance, source/E3 identity, and optional asset digest is implemented and tested. |
| R-017 | Met | Independent bounded gzip/ustar inspection rejects hostile headers, paths, types, links, modes, collisions, topology, and limits before writes. |
| R-018 | Met | Exact `tar@7.5.20` filtered extraction into an identity-captured private root and no-follow post-validation pass. |
| R-019 | **Partial — external** | Local near-limit/high-ratio RSS evidence passes; required protected Linux/macOS/Windows terminal evidence is absent. |
| R-020 | Met | Overlay, installer closure, manifests, portable-core digest, E3, and immutable verified descriptor checks pass. |
| R-021 | Met | GitHub Release remains payload authority and `maister-install.mjs` remains the sole host/state mutation authority. |
| R-022 | Met | Install/update delegate only the exact verified archive/source/commit/evidence descriptor without launcher compensation. |
| R-023 | Met | Transactional receipt-bound control-plane persistence, durable journaling, retention, and safe pruning pass aggregate tests. |
| R-024 | Met | State-only commands resolve from receipt/control-plane authority with transport/credential/network ports prohibited. |
| R-025 | Met | Invalid, legacy, escaping, symlinked, corrupt, or mismatched authority fails closed and mutation-free. |
| R-026 | Met | Exact journal UUID selection and ambiguous-default no-mutation isolation pass. |
| R-027 | Met | All durable crash markers recover to exact bytes, modes, links, existence, topology, and authority state. |
| R-028 | Met | External watchdog produces terminal classification, regular heartbeat, 62/62 child result, and final-tree evidence. |
| R-029 | Met | Pre-spawn rejection fixtures preserve complete host/settings/state snapshots. |
| R-030 | Met | Typed/redacted diagnostics and byte-faithful child stream, JSON, receipt/journal, and exit propagation pass. |
| R-031 | Met | Acquisition abort, child signal forwarding, cleanup-before-reraise, POSIX semantics, and Windows mappings are covered. |
| R-032 | Met | Immediate identity-scoped cleanup and unresolved first-install evidence retention pass success/failure/timeout/signal cases. |
| R-033 | Met | Deterministic three-target packaging, strict parity, E3/sidecars, lifecycle, rollback/recovery, and code-7 preservation pass locally. |
| R-034 | Met | Workflow is GitHub-only and policy scans find no registry publication/view/dist-tag path or publication credential. |
| R-035 | Met | Static/runtime no-registry-mutation gates pass; only exact locked dependency acquisition is allowed. |
| R-036 | **Partial — external** | Public smoke and future-private contracts/docs are implemented; real current-public canonical smoke is unavailable. |
| R-037 | **Partial — external** | Three-OS Node 22/npm 11.4.2 matrices and platform probes exist; no protected terminal matrix run exists. |
| R-038 | Met | Original 3-case TDD gate is green, docs/metadata use `mateuszrapacz`, `LICENSE` remains outside scope, and artifact-drift rejection passes. |

Totals: **33 Met + 5 Partial = 38 Must requirements accounted for**. No requirement is missing, failed due to a current source defect, duplicated, or out of order.

## Terminal Test Evidence

The current `verification/test-suite-results.md` supersedes the earlier interrupted `make test-core` attempt. It records:

- prior terminal checks: 112 passed, 0 failed;
- continuation checks: 418 passed, 0 failed;
- cumulative top-level assertions/checks: **530 passed, 0 failed**;
- terminal `make test-core`: 68/68, including aggregate wrapper pass and child 62/62;
- terminal `make test-runtime`: 101/101;
- terminal `make test-evidence`: 40/40;
- `make test-topology`: `ok: true`, zero violations;
- strict clean-candidate `make test-parity-release`: all three targets, zero unresolved differences;
- terminal `make validate`: 209/209 intrinsic assertions, plus aggregate wrapper pass and child 62/62;
- no final completed product-test or authoritative-command failure.

No full suite was rerun by this completeness checker.

## Standards and Documentation Completeness

Source-controlled standards/documentation obligations are complete:

- build and validation entry points align with `.maister/docs/standards/global/build-pipeline.md` and pass terminal local validation;
- release packaging uses same-job isolated artifacts, strict parity, pinned actions, exact E3/source identity, and never consumes stale local `dist/`;
- error paths are typed, fail closed, bounded, redacted, and identity-scoped; unresolved code 7 preserves recovery state;
- tests cover behavior and critical filesystem transaction oracles, including bytes, modes, symlinks, existence, and topology;
- README, command, workflow, and user-guide documentation use exact GitHub tag/full-commit selectors, explain Git versus GitHub API credentials, preserve the sole-writer/recovery boundary, prohibit registry publication, and include the future-private migration checklist;
- distribution metadata is updated without changing legal `LICENSE` attribution.

No recurring convention gap requiring a new project standard was identified during this read-only check.

## Findings

### C-EXT-01 — critical — canonical public release evidence absent

Plan 8.4 and R-002/R-006/R-036 cannot reach terminal acceptance until the exact canonical `v2.2.1` tag and immutable GitHub Release assets exist and real anonymous exact-tag/full-commit lifecycle smoke runs. This is an external prerequisite, not a source-controlled defect.

### C-EXT-02 — critical — protected execution and controls absent

Plan 8.9 and R-019/R-037 require a protected Linux/macOS/Windows run on the exact candidate. Required tag/ruleset, protected branch, and `github-release` environment controls are also external administrative prerequisites. YAML and local tests cannot substitute for them.

### C-LOCAL-01 — warning — stale local `dist/` is non-authoritative

The existing `dist/` directory is user-owned disposable output. It was preserved and excluded from the clean candidate used for strict parity. Release acceptance must use only artifacts produced and verified in the same protected job.

## Verdict

**Implementation completeness: 53/55 plan steps; 33/38 Must requirements fully met, 5/38 partial due only to external evidence. V-016 is resolved.**

There is no remaining source-controlled fix for this checker to recommend. The release remains **NO-GO** until the canonical public tag/Release, protected three-OS execution, and required GitHub protections are established under separate explicit authority.
