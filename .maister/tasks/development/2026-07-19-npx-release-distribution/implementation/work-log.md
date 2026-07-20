# Implementation Work Log — GitHub-Only Distribution

## 2026-07-20T10:22:06Z — Implementation Started

**Total Steps:** 55  
**Task Groups:** G1–G9 across six dependency waves  
**Approved Scope:** 10 exact items persisted in `orchestrator-state.yml`  
**Execution Mode:** parallel waves (`sequential: false`)

This log supersedes the earlier public-npm implementation log. Historical gate records remain in workflow state for audit, but registry publication, npm dist-tags, `NPM_TOKEN`, `browser_download_url` authority, and public-npm smoke are outside the approved GitHub-only implementation.

## Standards Reading Log

### Loaded Per Group

Entries are added as task groups execute. Every worker reads `.maister/docs/INDEX.md`, the relevant project standards, the audited specification, and its complete group section before editing.

## 2026-07-20T10:22:06Z — Wave 0 TDD Red Baseline

**Command:** `node --test tests/platform-independent/launcher-github-only.test.mjs`  
**Result:** expected red — 3 tests, 0 passed, 3 failed, exit 1

Intended failures:

- Root package lacks `private: true`.
- `GH_TOKEN` does not take precedence over `GITHUB_TOKEN`.
- Authenticated assets use browser download URLs instead of GitHub API asset URLs.

No files were modified by the test runner. The focused red file remains unchanged and is the required Phase 9 green target.

## 2026-07-20T10:35:45Z — Group 1 Complete

**Steps:** 1.1–1.5 completed  
**Checkpoint:** I1 package identity passed; the combined workflow-publication assertion is explicitly deferred to Group 8, which owns `.github/workflows/release.yml`.  
**Tests:** 6 package-identity tests passed; `npm ci`, `npm run validate`, and `npm pack --dry-run --json` passed. The focused three-case red file remains 0/3 because Groups 2, 3, and 8 still own its remaining integration defects.  
**Files:** `package.json`, `bin/prepare-resolved-commit.mjs`, `lib/launcher/package-contract.mjs`, `lib/launcher/verify-package-boundary.mjs`, `tests/platform-independent/launcher-package-identity.test.mjs`, generated `.maister-resolved-commit.json`; lockfile already satisfied the exact dependency contract.

### Standards Reading Log — Group 1

- Global build pipeline and conventions: exact package boundary, deterministic generated evidence, no registry publication lifecycle.
- Error handling and validation: typed fail-fast identity errors, closed schemas, bounded subprocess output.
- Minimal implementation: no ambient selector inference or compatibility fallback.
- Testing: behavior-focused no-follow, malformed identity, symlink, atomic-failure, and package-content coverage.

**Deferred integration evidence:** the unchanged red assertion also scans Group 8's release workflow. It is not weakened or bypassed and must turn green when Group 8 removes registry publication machinery.

## 2026-07-20T10:55:36Z — Wave 2 Complete (Groups 2 and 3)

**Group 2:** strict `GH_TOKEN` → `GITHUB_TOKEN` → bounded non-shell `gh` → anonymous resolver, fail-closed explicit credentials, exact stable Release and numeric API asset contract.  
**Group 3:** API-only authorized transport, permanent cross-host auth stripping, one fresh 15-second pre-header deadline per attempt, separate idle/resource/aggregate bounds, bounded retries, streaming sinks, and partial cleanup.  
**Tests:** credentials 8/8, Release 11/11, transport 14/14; combined Wave 2 total 33 passed, 0 failed.  
**Checkpoint I3:** anonymous metadata success bypasses credentials, selected assets use numeric API URLs with `application/octet-stream`, and no Authorization is emitted on the public path.

### Standards Reading Log — Group 2

- Error handling/validation: typed fail-closed explicit token errors and exact API identity.
- Minimal implementation: fixed repository/tag/assets and no moving or browser URL fallback.
- Testing: precedence, bounded command, retry eligibility, redaction, and anonymous bypass.

### Standards Reading Log — Group 3

- Error handling: bounded retry/backoff, primary-error preservation, and resource cleanup.
- Validation: exact host/path/header/redirect/byte/sink allowlists.
- Testing: injected fake clocks, transport, scheduler, sink, abort, and cross-host auth cases.

The first sibling integration run exposed outdated browser/content URL fixtures in the Group 2-owned Release tests. Their owner corrected them to the exact API asset contract; Group 3 security behavior was not weakened.

## 2026-07-20T11:51:50Z — Wave 3 Complete (Groups 4 and 6)

**Group 4:** streaming gzip/ustar inspection, streamed SHA-256/counters, strict `tar@7.5.20` extraction, no-follow candidate validation, immutable integrity-only descriptor, and child-process RSS evidence.  
**Group 6:** receipt-bound immutable control planes, durable journal markers, exact recovery selection, reference-aware pruning, preserved code-7 recovery state, and bounded aggregate transaction evidence.  
**Tests:** archive 10/10, archive-memory 3/3, installer transaction 61/61. The full transaction run completed in ~450 s under the 12-minute harness deadline and emitted final-tree evidence.  
**Integration:** the public injected-checkout fixture now carries the required installer/runtime closure (`bin` and `lib`); its focused release-package test passes.

### Standards Reading Log — Group 4

- Validation/security: inspect before write, reject hostile gzip/ustar/path/type/mode/topology input, no-follow post-walk.
- Error handling: typed failures, stream abort/close, identity-scoped cleanup.
- Testing: hostile corpus, exact counters/digests, near-limit RSS and 2× growth bound.

### Standards Reading Log — Group 6

- Build/architecture: `maister-install.mjs` remains the sole host-state mutation authority.
- Error handling/recovery: durable transitions, exact rollback/restore, retryable post-commit cleanup, forensic preservation on code 7.
- Testing: terminal aggregate result, heartbeat/deadline, exact final-tree evidence, multi-journal mutation isolation.

Group 4 was committed by its scoped worker as `d349487`. Group 6's worker exhausted its service quota after writing changes; the orchestrator completed validation directly without broadening implementation scope.

## 2026-07-20T12:32:52Z — Waves 4–6 Source-Controlled Work Complete; Group 8 External Evidence Pending

**Group 5:** integrated anonymous-first metadata, strict credential fallback, API-only streamed sidecars/archive, candidate validation, exact installer delegation, receipt-bound offline commands, canonical journal UUID delegation, signals, and cleanup. The local code review found and fixed partial file writes and the missing public `recover --journal-id` contract. Launcher suite: 76 passed, 0 failed; focused TDD file: 3 passed, 0 failed.

**Group 7:** added real SIGKILL workers for every durable marker, final-tree hashes, multiple unresolved-journal isolation, and initial platform path/signal coverage. Crash testing exposed and fixed stale dead-PID locks, pre-backup recovery, and post-publication prune recovery. This was implementation-time evidence; Phase 11 subsequently required deeper byte/mode/symlink/existence/topology oracles and an external watchdog.

**Group 8:** implemented GitHub-only workflow, exact tag/full-commit/manifest checks, three-OS Node 22 gate definitions, static no-registry policy, runtime GitHub request observation, hermetic private transport, the public exact-selector smoke harness, and exact R-001–R-038 drift enforcement. Policy/drift/focused gate: 8/8 and workflow YAML syntax validation passed. Real public smoke and protected three-OS execution remain externally pending; the harness and workflow definition are not execution evidence.

**Group 9:** replaced registry-backed user instructions with exact Git tag/full-commit `npm exec` and `npm install`, documented receipt authority and recovery, and added the normative future-private migration checklist. Codex/Cursor overlay validation passed; `LICENSE` was not modified.

### Integrated evidence

- One implementation-time `make test` run passed and reported an aggregate transaction completion in 449811 ms. Phase 11 found that the timeout and heartbeat lived in the same process as the suite, so this record is historical evidence, not proof of a reliable external watchdog.
- `release-package.test.mjs`: 7/7, including deterministic three-target archive lifecycle.
- Strict parity: passed in an isolated clean candidate clone for Codex, Cursor, and Kiro CLI with zero unresolved differences. The dirty primary worktree was preserved; its diagnostic override also passed after refreshing narrow immutable baseline observations.
- `npm pack --dry-run --json`: passed with one private Git package, one binary, generated commit manifest, and 23 allowlisted files.
- Real public smoke prerequisite: terminal unavailable. The public canonical repository has no `v2.2.1` tag and its exact Release API endpoint returns 404. No substitute repository, fixture claim, tag, or Release was created. Protected CI will run the real smoke after the exact GitHub Release exists.

### Historical code review fallback

The `code-review` skill was applied along Standards and Spec axes. Its required parallel subagents were unavailable because the service quota was exhausted, so the orchestrator performed both axes locally against `debc79d...092903e` in the isolated candidate clone. That historical local review did not replace Phase 11 independent verification. Phase 11 later found source-controlled defects and two external release prerequisites; its canonical verification report supersedes the earlier zero-finding statement.

## 2026-07-20T13:58:12Z — Phase 11 Verification-Depth Fix Loop

**V-009:** added a separately scheduled parent-process watchdog for the aggregate transaction suite. The child streams 30-second heartbeat records and final-tree evidence; the parent independently enforces heartbeat silence and total deadlines, terminates and awaits the child, and emits `passed`, `failed`, `heartbeat-timeout`, or `harness-timeout` terminal classification.

**V-012:** filesystem snapshots now retain complete file bytes plus modes, symlink targets, existence and directory topology. Ambiguous multi-journal recovery proves no mutation, and selected recovery compares every path owned by the unselected journal. Abrupt-crash recovery compares each recovered host tree with its complete expected oracle. The stronger oracle exposed a directory-mode restoration defect at `rollback-started` and `rollback-completed`: topology restoration applied the leaf mode to every ancestor. Recovery now roots each directory creation at its immediate parent, so only the intended directory receives the restored mode. The complete 14-marker crash suite passes 15/15 with byte, mode, symlink, existence, and topology equality.

**V-013:** cross-platform tests now perform real host probes for case behavior, paths longer than 300 characters, replacement while a file descriptor is open, and live child termination. Unsupported host behavior is emitted as an explicit `unavailable` record instead of being inferred or silently passed.

**Documentation and evidence status:** rewrote the user guide for exact GitHub tag/full-commit `npm install` and `npm exec`, separated Git and GitHub API credentials, documented lifecycle recovery, and added the future-private migration checklist. Plan markers 8.4 and 8.9 now remain externally pending until the canonical tag/Release and protected three-OS run exist.

## 2026-07-20T15:00:06Z — Phase 11 Fix Integration

All source-controlled verification findings selected by the user were integrated without creating a repository, tag, Release, registry package, or external GitHub configuration. Exact tag references are independently resolved and annotated tags are peeled; archive producer/consumer failures are supervised; release CI checks exact clean parity before prepare; public-smoke evidence binds exact selectors, Release assets, sidecars, E3 provenance, receipts, and lifecycle results; the workflow pins Node 22/npm 11.4.2 and defines post-Release smoke on Linux, macOS, and Windows; acquisition signals preserve cleanup-before-reraise; delegated stdout uses bounded tail capture with backpressure; and recovery/platform tests now exercise the promised behavioral oracles.

Local focused evidence completed during the fix loop: archive and memory 14/14; transport and Release 28/28; final launcher 83/83; abrupt crash 15/15; watchdog, multi-journal, and cross-platform 13/13; release policy, requirement drift, and Make interface 18/18; release package 7/7; `npm run validate`; zero high-severity audit findings; YAML parsing; and clean diff checks. The aggregate exposed and drove a test-first watchdog parser fix: structured evidence can be emitted by Node's test harness on stdout as well as stderr, so both streams are now parsed and terminal fragments are flushed. Its final rerun passed child 62/62 and external wrapper 1/1 in 458964 ms with classification `passed`, code 0, and non-empty final-tree evidence.

Two findings are intentionally not represented as source fixes: the canonical remote `v2.2.1` tag/Release/protected run does not exist, and required GitHub tag, branch, and environment protection controls are not observable. Those are external release prerequisites and remain release-blocking; no local fixture or unprotected run may substitute for them.

## 2026-07-20T17:16:55Z — Phase 11 V-016 Lifecycle-Order Fix

The second user-approved fix loop corrected the protected release evidence sequence without publishing a tag, GitHub Release, package, or registry artifact. The `github-release` job now stops at `GITHUB_VERIFIED` and transfers a verified baseline. The three-OS `public-smoke` matrix uploads per-platform anonymous evidence, and a downstream `finalize-release-evidence` job requires all three successful targets, validates 12 terminal anonymous records per operating system, records `PUBLIC_NO_AUTH_SMOKE_VERIFIED`, runs hermetic private transport tests, records `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`, and only then uploads canonical release evidence.

TDD evidence: the new lifecycle policy assertion first failed 7/8 because the final job did not exist, then passed 8/8 after the workflow change. A second red/green slice proved and fixed hidden dotfile retention for `.maister-public-smoke-evidence.ndjson` and `.maister-network-observations.ndjson`. Focused policy/Make/requirement tests pass 19/19, evidence tests pass 40/40, `npm run validate` passes, workflow YAML parses, and `git diff --check` passes. V-007 and V-008 remain external release blockers and were not altered.

## 2026-07-20T18:12:11Z — Phase 11 Second Full Re-Verification

The delegated authoritative suite completed 530/530 local checks with no failures, including three terminal aggregate watchdog passes with 62/62 child suites, strict isolated parity, and terminal `make validate`. Independent completeness, code-quality, pragmatic, production-readiness, and reality reviews then reran against the post-V-016 tree. V-016 is confirmed fixed.

Code review found CQ-102 as one new source-controlled critical defect: `public-smoke` does not disable `actions/checkout` credential persistence, so native Git can observe a checkout-owned local extraheader that the Node network observer cannot see. The canonical verifier is therefore Failed/NO-GO and recommends disabling persisted checkout credentials, rejecting effective Git auth residue before acquisition, and adding a job-specific policy regression assertion. V-007/V-008 remain external; V-014 remains an untouched stale-output warning.

## 2026-07-20T18:39:17Z — Phase 11 CQ-102 Anonymous-Checkout Fix

The user selected the third fix-all cycle. TDD first added a job-bounded policy assertion; it failed 8/9 because `public-smoke` persisted checkout credentials. A behavioral guard suite then failed 0/4 while its implementation was absent. The implementation now sets `persist-credentials: false` specifically on the public-smoke checkout and runs `assert-no-git-auth-residue.mjs` immediately after setup-node, before any npm network operation or Git package acquisition.

The cross-platform Node guard reads checkout-local Git configuration without a shell, fails closed on Git invocation or malformed output, rejects credential configuration, authorization-bearing HTTP settings, URL rewrites/includes, and credential-bearing URLs, and emits no key or value on failure. The ordinary validation workflow executes its behavioral regression suite. Final focused evidence: 24/24 policy, guard, requirement-drift, and Make-interface tests pass; both workflow YAML files parse; syntax checks and `git diff --check` pass. No repository, tag, Release, package-registry publication, or external GitHub control was created or changed. CQ-102 is locally fixed and awaits the mandatory full Phase 11 re-verification.

## 2026-07-20T19:35:21Z — Phase 11 Post-Remediation Synchronization

The final source-controlled remediation set is now reflected in the canonical verification artifacts. Release-critical harness files are covered by both validation path filters and the release validation job; public smoke follows manual, bounded redirect validation; ambient SSH/proxy/trace transport variables and arbitrary inherited `NODE_OPTIONS` are removed; and raw child output is no longer copied into diagnostics. The focused policy and Git-auth guard suites pass 16/16, the current direct `make test-platform-independent` run exits 0, and the detailed local verification report retains 530/0 evidence for the previously completed full targets.

No external GitHub state was changed. The exact public `v2.2.1` tag/Release/protected run and required tag, branch, and environment protections remain unresolved external prerequisites, so release acceptance remains NO-GO. The user selected `Proceed with known issues`; Phase 11 now awaits the mandatory `Continue to Phase 12?` gate.
