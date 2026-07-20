# Implementation Plan — GitHub-Only npm-exec Distribution

## TL;DR

Implement the approved GitHub-only distribution in nine disjoint groups across six dependency waves; Maister is never published to any package registry, while exact `tar@7.5.20` acquisition from npmjs remains read-only and allowed.
The package records its materialized full commit at prepare time, the launcher acquires one exact GitHub Release anonymously first, streams and verifies API assets under hard bounds, and delegates all host/state mutation to the receipt-bound `maister-install.mjs` authority.
Release acceptance requires all 38 Must requirements, terminal aggregate transaction evidence, every durable crash boundary, unresolved-journal isolation, measured cross-platform memory, real current-public exact-selector E2E, hermetic private transport, and zero registry mutation.
The existing three-test red gate remains unchanged and red until the owning production groups turn all three cases green.

## Key Decisions

- GitHub is the only Maister distribution surface. Do not add npmjs, GitHub Packages, or other registry publication, observation, promotion, or mutation.
- Support only literal exact `#vX.Y.Z` and lowercase full 40-hex commit Git package selectors. Runtime trusts the prepare-generated full-commit manifest; protected CI separately proves the original selector.
- Use the fixed public canonical repository `mateuszrapacz/maister`; do not create or parameterize another repository.
- Use anonymous-first Release metadata. Resolve credentials only after eligible `401`, `403`, or privacy-preserving `404`, in strict order `GH_TOKEN` → `GITHUB_TOKEN` → bounded non-shell `gh auth token --hostname github.com` → anonymous.
- Fetch archives and sidecars only through GitHub API asset URLs with `Accept: application/octet-stream`; authorize only exact approved `api.github.com` routes and permanently strip authorization on cross-host redirects.
- Apply one 15-second pre-header deadline to each initial, redirect, or retry fetch; keep separate 15-second body-idle, 30/120-second resource-wall, and 180-second aggregate deadlines.
- Stream download hashing, gzip/ustar inspection, and exact `tar@7.5.20` extraction. Whole compressed or expanded archive buffering is prohibited.
- Preserve `plugins/maister/bin/maister-install.mjs` as the sole writer of targets, settings, receipts, journals, backups, locks, staging, control planes, rollback, and recovery state.
- Require real anonymous E2E against the currently public canonical repository now. Test private behavior hermetically now and make real protected private E2E mandatory only if that same repository becomes private.
- No UI/design context exists. Do not create `visual-coverage.md` or any product-UI artifact.

## Open Questions / Risks

- Protected immutable tag/ruleset configuration is an operational prerequisite outside the code tree; CI must capture exact tag-target evidence and fail closed when protection or identity cannot be demonstrated.
- Streaming conformance is high risk because the current archive and transport modules retain whole bodies; RSS ceilings are release gates, not advisory optimization targets.
- Crash-boundary and multi-journal fixtures can expose existing transaction defects. Any mismatch in bytes, modes, links, existence, topology, pointer, receipt, backup, journal, staging, or control-plane state reopens Group 6.
- Real public release smoke depends on an already-published exact candidate Release. The workflow must report a terminal blocked/fail result when that external prerequisite is missing; it must not substitute fixtures or a second repository.
- Cross-platform case, path, signal, and locked-file behavior may require platform-specific implementation branches, but no branch may weaken semantic rejection or turn platform unavailability into a pass.

## 1. Execution Contract

### Authority boundary

```text
exact Git package selector
  -> prepare records actual checkout commit
  -> launcher validates closed CLI/package identity
  -> anonymous-first exact GitHub Release API lookup
  -> bounded API-asset streaming, digest and archive verification
  -> immutable verified-release descriptor
  -> exact extracted plugins/maister/bin/maister-install.mjs
  -> existing installer transaction and receipt-bound control plane
```

Before child spawn, the launcher may write only under one identity-captured operation root. After child spawn, the installer result is authoritative and the launcher may only forward streams/signals/result and clean its own eligible root. Cleanup is never rollback.

### TDD discipline

1. Before implementation, run `node --test tests/platform-independent/launcher-github-only.test.mjs` and require the recorded baseline `tests 3`, `pass 0`, `fail 3`, exit `1` for the three intended defects.
2. Do not weaken, skip, rename, delete, or invert those assertions. Group 1 turns package protection green; Groups 2 and 3 provide credential/API-asset primitives; Group 5 integrates them and turns the complete file green.
3. A changed failure reason is a regression in the red gate and must be corrected before proceeding. Do not accept unrelated failures as red evidence.
4. Phase 9 green requires `tests 3`, `pass 3`, `fail 0`, exit `0` on the unchanged focused file.

### Waves and dependencies

```text
Wave 0: red baseline
Wave 1: G1 package/prepare identity
Wave 2: G2 credentials/release contract  ||  G3 transport/deadlines
Wave 3: G4 streaming archive/candidate   ||  G6 installer control plane
Wave 4: G5 orchestration/delegation      -> G7 crash/journal/platform proof
Wave 5: G8 GitHub-only release/E2E/drift -> G9 docs/metadata
Wave 6: integrated release-candidate gate
```

Parallel work is allowed only where shown. Every group has an exclusive write set; an executor must stop and reconcile rather than edit a path owned by another group.

## 2. Implementation Approval Scope

Use the following exact bullet list as `orchestrator.implementation_approval.approved_scope`:

- Protect the root Git package with `private: true`, remove `publishConfig` and every publication lifecycle, retain exact normal dependency `tar@7.5.20`, and add the prepare-time resolved-commit manifest producer and package boundary validation.
- Implement the closed seven-command/three-target launcher contract, exact package/release identity chain, and immutable verified-release descriptor without trusting ambient npm selector metadata.
- Implement strict GitHub API credential resolution in precedence `GH_TOKEN` then `GITHUB_TOKEN` then bounded non-shell `gh auth token --hostname github.com` then anonymous, with invalid explicit credentials failing closed and all secret material redacted.
- Implement anonymous-first exact Release lookup and API-only metadata/asset authorization, API asset URL plus `application/octet-stream` delivery, cross-host authorization stripping, and bounded direct `200`/`302` behavior.
- Implement one 15-second pre-header deadline per fetch attempt plus independent body-idle, resource-wall, aggregate-operation, redirect, retry, byte, abort, and partial-file cleanup bounds through injectable seams.
- Replace whole-buffer archive handling with backpressure-aware streaming download hashing, independent gzip/ustar inspection, exact `tar@7.5.20` strict filtered extraction, no-follow post-validation, and measured cross-platform RSS evidence.
- Preserve `plugins/maister/bin/maister-install.mjs` as sole host/state mutation authority while completing transactional receipt-bound control-plane persistence, offline state-only delegation, exact journal selection, crash recovery, cleanup, signal, and child-result contracts.
- Add terminal aggregate transaction, every durable abrupt-crash boundary, multiple unresolved-journal isolation, zero-pre-spawn-mutation, exact identity, three-target lifecycle, and Linux/macOS/Windows Node 22 acceptance evidence.
- Convert release automation to GitHub-only publication and verification, remove `NPM_TOKEN` and all npm publish/view/dist-tag/registry mutation or observation, add static/runtime no-registry-mutation proof, protected exact-selector evidence, and real anonymous public tag/full-commit E2E against the existing canonical repository.
- Update user/operator/release documentation and distribution-facing metadata to `mateuszrapacz`, preserve legal `LICENSE` attribution, add the normative future-private migration checklist, and enforce exact R-001–R-038 requirements/spec/HTML drift rejection.

Explicitly excluded: another repository, any Maister registry publication, moving selectors, arbitrary URLs/assets/endpoints, a second installer, launcher host-state mutation, persistent launcher cache, telemetry, product UI, legal `LICENSE` attribution changes, and real private E2E before the canonical repository becomes private.

## 3. Disjoint Implementation Groups

### Group 1 — Package protection and prepare-time commit identity

**Wave:** 1  
**Prerequisites:** Wave 0 red baseline; Node 22; actual Git checkout.  
**Owns/writes only:**

- `package.json`
- `package-lock.json`
- `bin/prepare-resolved-commit.mjs` (new)
- `lib/launcher/package-contract.mjs`
- `lib/launcher/verify-package-boundary.mjs`
- `tests/platform-independent/launcher-github-only.test.mjs` (existing red assertions are preserved)
- `tests/platform-independent/launcher-package-identity.test.mjs` (new)

**Steps:**

- [x] 1.1 Preserve the red file exactly, then add package-identity tests for `private:true`, absent `publishConfig`, one ESM `maister` bin, Node `>=22`, exact `tar@7.5.20` lock integrity, the explicit runtime allowlist, and absence of arbitrary Git metadata/publication scripts.

- [x] 1.2 Add the sole `prepare` producer. It captures and no-follow validates the actual checkout/output parent, invokes executable `git` with argv exactly `rev-parse --verify HEAD^{commit}`, `shell:false`, captured checkout `cwd`, 5-second timeout, 128-byte stdout, and 8192-byte stderr bounds.

- [x] 1.3 Validate one lowercase full commit, fixed repository and stable package version; exclusively create a same-directory `0600` regular temporary file, write/fsync, revalidate identities, atomically rename `.maister-resolved-commit.json`, and remove only producer-owned stale/failed temporaries.

- [x] 1.4 Runtime no-follow reads the closed four-field manifest and emits typed `E_LAUNCHER_PACKAGE_IDENTITY` before temp/network/state access for missing, symlinked, non-regular, malformed, wrong repository/version/hash, or absent-prepare cases. Remove selector inference from ambient npm/cache/URL data.

- [x] 1.5 Make the package allowlist carry `.maister-resolved-commit.json` and runtime closure only; exclude `.git`, Git metadata, producer temporaries, tasks, tests, local `dist`, secrets, settings, and workspace files. Keep exact read-only dependency acquisition and SBOM visibility.

**Exact tests:**

```sh
node --test tests/platform-independent/launcher-package-identity.test.mjs
node --test --test-name-pattern='package and release workflow make publishing' tests/platform-independent/launcher-github-only.test.mjs
npm ci --ignore-scripts=false
npm run validate
npm pack --dry-run --json
```

**Acceptance:** Group tests pass; the package-protection red case is green; the credential and asset cases remain red for their original reasons; failed prepare leaves no owned temporary and no manifest replacement; package materialization carries exactly one valid manifest and no arbitrary Git metadata.

**Failure/rollback/recovery:** On producer failure, remove only the exclusively created temporary and leave any prior validated manifest unchanged; package/runtime rejection occurs before operation-root or host/state writes. Revert only Group 1 paths if the package cannot be materialized. Do not use `--ignore-scripts` as a fallback.

**Integration checkpoint I1:** Inspect `npm pack --dry-run --json`; verify package version, generated manifest, exact lock integrity, one bin, no publication metadata, and no `.git`/task/dist payload before Groups 2–5 consume package identity.

### Group 2 — Credential resolver and exact Release contract

**Wave:** 2, parallel with Group 3.  
**Prerequisites:** I1 and fixed repository/version/target constants.  
**Owns/writes only:**

- `lib/launcher/credential-provider.mjs` (new)
- `lib/launcher/release-contract.mjs`
- `tests/platform-independent/launcher-credentials.test.mjs` (new)
- `tests/platform-independent/launcher-release.test.mjs`

**Steps:**

- [x] 2.1 Implement strict environment precedence. A present malformed `GH_TOKEN` or `GITHUB_TOKEN` returns `E_LAUNCHER_CREDENTIAL_INVALID` and never falls through; public anonymous success must bypass all credential inspection and command execution.

- [x] 2.2 Implement the injected command port request exactly as executable `gh`, argv `auth token --hostname github.com`, `shell:false`, timeout 5000 ms, stdout 16384 bytes, stderr 8192 bytes. Kill and await on timeout; never persist streams.

- [x] 2.3 Accept one 1–4096-byte printable non-whitespace ASCII token line with at most one trailing newline. Convert not-found, non-zero, signal, timeout, overflow, or malformed command output to deterministic anonymous mode; expose only redacted source/status enums.

- [x] 2.4 Close the Release contract to `mateuszrapacz/maister`, tag `v<package version>`, non-draft/non-prerelease published Release, numeric API asset IDs/URLs, exactly one allowlisted archive per target plus three sidecars, and no moving/fallback endpoint.

- [x] 2.5 Define anonymous-first state transitions and only permit one authenticated retry of the same metadata route after anonymous `401`, `403`, or privacy-preserving `404`. Build the immutable candidate identity fields needed by Group 5.

**Exact tests:**

```sh
node --test tests/platform-independent/launcher-credentials.test.mjs
node --test tests/platform-independent/launcher-release.test.mjs
node --test --test-name-pattern='GH_TOKEN takes precedence' tests/platform-independent/launcher-github-only.test.mjs
```

**Acceptance:** Every token source, strict precedence, invalid-explicit fail-closed path, bounded `gh` failure class, anonymous bypass, exact Release identity, duplicate/missing/foreign asset, and no-fallback case passes with no token, stream, URL query, or path leak.

**Failure/rollback/recovery:** Credentials live only in invocation memory. Command failure yields anonymous mode; invalid explicit credentials terminate before network/host mutation. There is no credential persistence or cleanup artifact to recover.

**Integration checkpoint I2:** Review the credential port request object and error schema byte-for-byte; inject sentinel secrets and assert they are absent from stdout, stderr, JSON, errors, retained roots, and test evidence.

### Group 3 — API asset transport and deadline composition

**Wave:** 2, parallel with Group 2.  
**Prerequisites:** I1; Group 2's route/asset contract may be consumed only after I2.  
**Owns/writes only:**

- `lib/launcher/release-transport.mjs`
- `tests/platform-independent/launcher-transport.test.mjs` (new)

**Steps:**

- [x] 3.1 Restrict authorization to HTTPS `api.github.com` and exact metadata or `/repos/mateuszrapacz/maister/releases/assets/<numeric-id>` paths. Use API asset URLs with `Accept: application/octet-stream` and API version header for archives and sidecars; reject `browser_download_url` as authority.

- [x] 3.2 Implement manual bounded direct `200`/`302` handling, five redirects, exact HTTPS host allowlist, URL revalidation, signed-query redaction, and permanent authorization removal before the first cross-host redirect.

- [x] 3.3 Implement one fresh 15-second pre-header clock immediately before every initial, redirect, or retry fetch through final response headers, covering DNS/TCP/TLS/proxy/header wait. Compose with non-resetting 30-second metadata/sidecar, 120-second archive, and 180-second aggregate walls; earliest remaining deadline wins.

- [x] 3.4 Start a distinct 15-second body-idle timer after headers and reset it only after a consumed chunk. Bound declared and observed bytes, abort and await transport, close handles, and remove partial operation-owned files on timeout, overrun, truncation, or cancellation.

- [x] 3.5 Permit at most two total attempts for eligible pre-semantic transport failures or `408`/`429`/`5xx`, with at most five seconds backoff and remaining-budget checks. Never retry credentials, semantic body, malformed metadata, identity/digest/archive, installer, or external abort failures.

- [x] 3.6 Expose injectable fetch/clock/scheduler/file-sink seams and stream results with backpressure instead of concatenating whole bodies.

**Exact tests:**

```sh
node --test tests/platform-independent/launcher-transport.test.mjs
node --test --test-name-pattern='authenticated release assets' tests/platform-independent/launcher-github-only.test.mjs
```

**Acceptance:** Fake-clock tests prove exact clock start/end, fresh redirect/retry attempt clocks, non-resetting walls, separate idle typing, API-only authorization, octet-stream negotiation, 200/302 paths, cross-host stripping, partial cleanup, and retry eligibility. No full resource buffer is retained.

**Failure/rollback/recovery:** Abort and await the active fetch/stream, close file handles, delete only the validated partial file under the operation root, retain the primary typed error, and never resume partial bytes. No host/state path is reachable.

**Integration checkpoint I3:** Combine Groups 2 and 3 in an injected transport scenario: anonymous success makes zero credential calls and sends no authorization; eligible anonymous denial performs exactly one credential resolution and one same-route retry; all assets use API IDs.

### Group 4 — Streaming archive inspection, extraction, and candidate verification

**Wave:** 3, parallel with Group 6.  
**Prerequisites:** I3 provides bounded streamed files and metadata; exact `tar@7.5.20` from Group 1.  
**Owns/writes only:**

- `lib/launcher/archive-port.mjs`
- `lib/launcher/extracted-release.mjs`
- `tests/platform-independent/launcher-archive.test.mjs`
- `tests/platform-independent/launcher-archive-memory.test.mjs` (new)
- `tests/fixtures/platform-independent/launcher-archives/**` (new/expanded hostile and memory fixtures)
- `tests/helpers/launcher-memory-worker.mjs` (new)

**Steps:**

- [x] 4.1 Replace sync inflate/full-buffer parsing with a backpressure-aware single-gzip-member ustar inspector that writes nothing and produces one deeply immutable normalized plan plus streamed SHA-256 and exact counters.

- [x] 4.2 Reject malformed/truncated checksums/headers, concatenation/trailing data, extensions/sparse/unknown types, path traversal/absolute/drive/UNC/backslash/control/length/segment issues, duplicate/case/Unicode/parent conflicts, all links/special files, unsafe modes/ownership, unexpected topology, and entry/file/expanded/ratio limit breaches.

- [x] 4.3 Extract only plan-admitted regular files/directories with exact `tar@7.5.20`, `strict:true`, `preservePaths:false`, `keep:true`, `preserveOwner:false`, `maxDepth:128`, `maxDecompressionRatio:100`, `maxMetaEntrySize:1048576`, no overwrite/follow, and a strict plan filter into a new private empty identity-captured child root.

- [x] 4.4 No-follow rewalk and compare exact path/type/mode/size/digest/topology. Validate selected overlay, installer/runtime closure, `.maister-source.json` content hash, portable-core digest, and fresh passed E3 against sidecars and package/Release commit identity.

- [x] 4.5 Compute archive SHA-256 while streaming and require exact agreement with `SHA256SUMS`, SBOM, provenance, and GitHub asset digest when present; record absence, fail mismatch, and label all unsigned evidence as integrity rather than publisher authentication.

- [x] 4.6 Add child-process RSS tests on near-limit and high-ratio fixtures: peak over post-start baseline ≤128 MiB; at least 2× expanded size increases peak ≤16 MiB; terminal completion/counters/digest and rejected-fixture cleanup are mandatory.

**Exact tests:**

```sh
node --test tests/platform-independent/launcher-archive.test.mjs
node --test tests/platform-independent/launcher-archive-memory.test.mjs
```

Run both commands unchanged on Linux, macOS, and Windows Node 22 in Group 8's matrix.

**Acceptance:** Inspection always precedes writes; streamed counters and digests are exact; every hostile fixture fails before extraction or leaves only a cleaned operation root; extraction/post-walk exactly matches the plan; candidate identity and E3 are indivisible; both RSS ceilings pass on each OS.

**Failure/rollback/recovery:** Abort streams and extraction, close handles, and remove only identity-validated operation-owned roots. If cleanup identity changed, retain exact residue and report a secondary warning without broad deletion. No host/state rollback is attempted.

**Integration checkpoint I4:** Feed a deterministic same-job target archive through download-hash → inspection-plan → strict extraction → no-follow source/E3 validation twice and compare descriptor fields, counters, and hashes.

### Group 5 — Launcher orchestration, offline authority, output, signals, and cleanup

**Wave:** 4.  
**Prerequisites:** I1–I4 and Group 6 receipt/control-plane schema.  
**Owns/writes only:**

- `bin/maister.mjs`
- `lib/launcher/orchestrator.mjs`
- `lib/launcher/authority.mjs`
- `lib/launcher/process-port.mjs`
- `lib/launcher/temp-root.mjs`
- `plugins/maister/lib/distribution/cli-contract.mjs`
- `plugins/maister/lib/distribution/target-paths.mjs`
- `tests/platform-independent/launcher-cli.test.mjs`
- `tests/platform-independent/launcher-delegation.test.mjs`
- `tests/platform-independent/launcher-zero-mutation.test.mjs` (new)

**Steps:**

- [x] 5.1 Parse exactly seven commands and three targets, one explicit `--target`, at most one `--json`, and canonical UUID `--journal-id` only for `recover`; reject all other options/positions/duplicates before temp, credentials, network, state read, or child spawn.

- [x] 5.2 Implement install/update order exactly: package/CLI → anonymous-first metadata → unique API assets → streamed sidecars/archive → digest/identity → inspect → extract/post-validate → immutable descriptor → verified installer spawn.

- [x] 5.3 Delegate install/update non-shell through current Node to the exact verified archive installer with command, target, exact `local:` source, full source commit, evidence path, and optional JSON only. Do not mutate host/state or compensate/retry installer outcomes.

- [x] 5.4 Resolve status/verify/uninstall/rollback/recover only from the canonical active receipt and contained control-plane root using no-follow schema/mode/containment/tree/installer/source/CLI-contract validation. Make zero transport, credential, Git, registry, PATH, cache, checkout, sibling-receipt, or fallback calls.

- [x] 5.5 Fail absent/legacy/ambiguous/escaping/symlinked/unsupported/corrupt/mismatched state explicitly and mutation-free. Pass an exact journal UUID only to `recover`; ambiguous default selection remains installer-owned and fail-closed.

- [x] 5.6 Emit typed redacted pre-spawn diagnostics on stderr and keep stdout machine-readable. After spawn, forward stdout/stderr bytes per stream and exit `0`/`2`–`8`, JSON, receipt/journal paths unchanged; do not parse child stdout to manufacture authority claims.

- [x] 5.7 Abort acquisition on first signal; after spawn forward first signal once, await terminal child, use POSIX same-signal re-raise where possible and Windows `130`/`143`, and never report success after interruption.

- [x] 5.8 Register cleanup immediately; validate exact root identity; run after success/rejection/child failure/timeout/signal; preserve unresolved first-install recovery root until terminal installer state; cleanup warnings never replace child result and never claim rollback.

**Exact tests:**

```sh
node --test tests/platform-independent/launcher-cli.test.mjs
node --test tests/platform-independent/launcher-delegation.test.mjs
node --test tests/platform-independent/launcher-zero-mutation.test.mjs
node --test tests/platform-independent/launcher-github-only.test.mjs
```

**Acceptance:** The unchanged three-case red suite is fully green; state-only commands prove zero external acquisition calls; every rejection fixture proves host target/settings/state bytes, modes, links, existence, and topology identical; child stream/result/signal and cleanup precedence match the specification.

**Failure/rollback/recovery:** Before spawn, clean only the operation root. After spawn, preserve installer-owned state and propagate its result; unresolved code 7 retains exact recovery evidence. First-install recovery instructions reference the original verified installer/root/source/evidence/journal with no network or ambient lookup.

**Integration checkpoint I5:** Run install/update through injected verified assets, then status/verify/uninstall/rollback/recover with transport and credential ports set to throw on any call. Snapshot and compare state around every pre-spawn rejection.

### Group 6 — Receipt-bound control plane and transaction authority

**Wave:** 3, parallel with Group 4.  
**Prerequisites:** Group 1 identity fields; existing deterministic archive installer and transaction conventions.  
**Owns/writes only:**

- `plugins/maister/bin/maister-install.mjs`
- `plugins/maister/lib/distribution/receipt-schema.mjs`
- `plugins/maister/lib/distribution/journal-schema.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/lib/distribution/recovery.mjs`
- `tests/platform-independent/installer-transaction.test.mjs`
- `tests/fixtures/platform-independent/installer-control-planes/**` (new)

**Steps:**

- [x] 6.1 Stage one immutable verified control-plane closure under `control-planes/<receipt-id>` inside the same installer transaction; validate topology and compute tree/installer hashes before candidate receipt publication.

- [x] 6.2 Bind contained relative root/installer refs, CLI contract version, hashes, source version/full commit/content hash, and durable promotion steps in receipt/journal schemas. Preserve mode `0700` directories and `0600` private state artifacts.

- [x] 6.3 Preserve every closure referenced by active/history/rollback/recovery/journal/backup state. Prune only proven-unreferenced closures after terminal commit, with journaled/retryable cleanup.

- [x] 6.4 Make legacy receipts diagnostic-only for state commands and return explicit migration failure; only verified install/update can migrate them transactionally.

- [x] 6.5 Implement exact `recover --journal-id <uuid>` selection. With multiple unresolved journals, unqualified recovery fails closed; qualified recovery mutates only selected operation-owned paths and leaves all others byte/topology-identical.

- [x] 6.6 Add deterministic injection markers at lock/journal creation, backup capture, target staging, control-plane staging/promotion, candidate receipt write, active pointer transition, verification, rollback markers, cleanup/prune markers, and terminal journal write without exposing failure injection in the public launcher CLI.

**Exact tests:**

```sh
node --test tests/platform-independent/installer-transaction.test.mjs
```

The aggregate command must terminate with explicit pass/fail/harness-timeout and final-tree evidence; silence or manual interruption is unavailable evidence.

**Acceptance:** Clean lifecycle and all injected failures preserve exact ownership/state contracts; control-plane promotion and receipt publication are recoverable; legacy migration fails closed; exact and ambiguous journal behavior pass; code 7 preserves all diagnosis/recovery state.

**Failure/rollback/recovery:** Follow durable journal state. Complete recorded commit or restore exact bytes/modes/links/existence/topology; if rollback/recovery cannot finish, return code 7 and preserve lock metadata, receipts, journals, backups, staging, control planes, and retained operation roots. Never advise state deletion or repeated blind rollback.

**Integration checkpoint I6:** Run the aggregate suite once with a harness deadline and progress heartbeat, record terminal result and final-tree comparison, then hand the stable injection marker inventory to Group 7.

### Group 7 — Abrupt-crash, multi-journal, aggregate, and cross-platform acceptance

**Wave:** 4 after Group 6; may execute in parallel with late Group 5 tests after I6.  
**Prerequisites:** I4 and I6; stable launcher and transaction injection seams.  
**Owns/writes only:**

- `tests/platform-independent/installer-abrupt-crash.test.mjs` (new)
- `tests/platform-independent/installer-multiple-journals.test.mjs` (new)
- `tests/platform-independent/launcher-cross-platform.test.mjs` (new)
- `tests/helpers/transaction-crash-worker.mjs` (new)
- `tests/helpers/filesystem-snapshot.mjs` (new)

**Steps:**

- [x] 7.1 Spawn a real installer worker and abruptly terminate after every durable Group 6 marker. For each candidate tree, run exact recovery and compare target/settings/state bytes, modes, links, existence, topology, active/historical receipts, backups, journals, staging, and control planes.

- [x] 7.2 Create at least two unresolved journals with disjoint owned state. Prove default recovery fails closed without mutation; select each UUID independently; prove every unselected journal, backup, staging root, closure, receipt, and target remains byte/topology-identical.

- [x] 7.3 Add OS-specific path/case/long-path/drive/UNC/backslash/locked-file and signal assertions while retaining common semantic rejection. Symlink privilege may skip fixture creation only, never equivalent safety assertions.

- [x] 7.4 Run the exact aggregate suite under a harness with bounded heartbeat and explicit timeout classification. Require final candidate-tree evidence for pass or fail and preserve diagnostics for timeout.

**Exact tests:**

```sh
node --test tests/platform-independent/installer-abrupt-crash.test.mjs
node --test tests/platform-independent/installer-multiple-journals.test.mjs
node --test tests/platform-independent/launcher-cross-platform.test.mjs
node --test tests/platform-independent/installer-transaction.test.mjs
```

Run unchanged on Linux, macOS, and Windows Node 22 and the release npm major.

**Acceptance:** Every durable marker has a terminal recovery classification and exact final snapshot; multiple journals are isolated; platform-specific cases pass without semantic waiver; aggregate result is explicit and terminal.

**Failure/rollback/recovery:** Test roots are isolated and operation-owned. Preserve failed fixture roots as named CI artifacts only; never delete user or repository state. Any snapshot difference reopens Group 6 or the owning launcher group before release automation work proceeds.

**Integration checkpoint I7:** Publish a machine-readable marker-to-outcome table in CI logs/artifacts for the exact candidate commit; verify its marker set equals Group 6's inventory and has no missing or duplicate boundary.

### Group 8 — GitHub-only release, exact-selector evidence, public E2E, and drift gates

**Wave:** 5.  
**Prerequisites:** I1–I7 all green; clean exact candidate commit; canonical repository remains public.  
**Owns/writes only:**

- `.github/workflows/release.yml`
- `.github/workflows/validate-generated-variants.yml`
- `tests/platform-independent/release-github-only-policy.test.mjs` (new)
- `tests/platform-independent/requirement-artifact-drift.test.mjs` (new)
- `tests/release/public-git-package-smoke.mjs` (new)
- `tests/release/network-observer.mjs` (new)

**Steps:**

- [x] 8.1 Remove registry URL setup, `id-token:write` when used only for registry publishing, `NPM_TOKEN`/`NODE_AUTH_TOKEN`, npm pack-for-publication, `npm publish`, `npm view`, dist-tag, registry polling/observation, publication states, registry smoke, and registry evidence. Retain only read-only `npm ci`/audit for exact locked `tar@7.5.20` closure.

- [x] 8.2 Preserve clean same-job three-target validation, strict parity, shared passed E3, deterministic packages, extracted lifecycle, checksums, SBOM, provenance, GitHub Release upload, and exact public-byte verification. Canonical states are only `BUILT → GITHUB_PUBLISHED → GITHUB_VERIFIED → PUBLIC_NO_AUTH_SMOKE_VERIFIED → HERMETIC_PRIVATE_TRANSPORT_VERIFIED`.

- [x] 8.3 In protected CI, validate literal exact tag syntax and resolve `refs/tags/vX.Y.Z^{commit}`; separately validate a literal lowercase full commit and resolve `<commit>^{commit}`; require both to equal package manifest, Release tag target, sidecars, archive source manifest/content hash, E3, and lifecycle receipt identity.

- [ ] 8.4 **Externally pending.** Run real anonymous `npm exec`/`npm install` with literal exact tag and full-commit Git package specs against the existing public canonical repository. Clear `GH_TOKEN`, `GITHUB_TOKEN`, Git auth overrides, user `gh` state, and registry publication credentials; exercise install/status/verify/uninstall for codex, cursor, and kiro-cli in isolated roots. This cannot pass until canonical tag `v2.2.1` and its exact GitHub Release assets exist.

- [x] 8.5 Instrument the public smoke to record only request host/path class and authorization-header presence, proving no Authorization is emitted while preserving secret/path redaction. Do not create another repository.

- [x] 8.6 Run hermetic private tests for token precedence/failure, anonymous denial + one retry, API asset 200/302, cross-host stripping, redaction, command bounds, no token-bearing Git URL, and exact identity. Do not label this real private E2E while the repository is public.

- [x] 8.7 Add static and network-observing runtime no-registry-mutation gates. Allow only read-only third-party dependency acquisition for the exact lock closure; fail on Maister publish/view/dist-tag/deprecate/provenance-publish, registry config/credential, or mutation request.

- [x] 8.8 Parse exact ordered `R-001`–`R-038` triples from requirements Markdown and spec Markdown, decode HTML text/entities from spec HTML, and reject missing/duplicate/extra/out-of-order or ID/priority/acceptance-text mismatch.

- [ ] 8.9 **Source-controlled matrix work is implemented; protected execution evidence is externally pending.** Run CLI, auth, transport, archive/RSS, zero-mutation, cleanup, signals, authority, transaction, crash, journal, package, no-registry, and hermetic smoke contracts on Linux, macOS, and Windows Node 22 using the declared release npm major.

**Exact tests:**

```sh
node --test tests/platform-independent/release-github-only-policy.test.mjs
node --test tests/platform-independent/requirement-artifact-drift.test.mjs
npm run test:launcher
make test-core
make test-runtime
make test-evidence
make test-topology
make test-parity-release
node --test tests/platform-independent/release-package.test.mjs
```

Protected release-only command after GitHub assets exist:

```sh
node tests/release/public-git-package-smoke.mjs --tag "$GITHUB_REF_NAME" --commit "$GITHUB_SHA"
```

**Acceptance status:** Source-controlled workflow and test implementation can be completed locally, but Group 8 remains externally pending until the canonical tag/Release exists and the protected three-OS run proves exact-selector identity and real anonymous public E2E. Fixture or hermetic evidence must not mark those external obligations complete.

**Failure/rollback/recovery:** Do not publish or replace bytes when any pre-publication gate fails. After immutable GitHub publication, observe and resume the same exact GitHub state only; never rewrite assets under the same tag/version and never repair through a registry. Missing public Release prerequisite is a terminal blocked/fail result, not fixture substitution.

**Integration checkpoint I8:** Review the release workflow diff with static scans for forbidden registry vocabulary/credentials and required GitHub-only states; then run a dry candidate workflow without publication and inspect exact evidence artifacts for secret/path absence.

### Group 9 — User/operator docs and distribution metadata

**Wave:** 5 after Group 8 state vocabulary is final.  
**Prerequisites:** I8; no source/test/workflow changes in this group.  
**Owns/writes only:**

- `README.md`
- `docs/README.md`
- `docs/commands.md`
- `docs/workflows.md`
- `plugins/maister/overlays/codex/assets/plugin.json`
- `plugins/maister/overlays/cursor/assets/plugin.json`
- `plugins/maister/overlays/codex/overlay.yml`
- `plugins/maister/overlays/cursor/overlay.yml`
- `tests/fixtures/platform-independent/overlays/codex/overlay.yml`
- `tests/fixtures/platform-independent/overlays/cursor/overlay.yml`

`LICENSE` is explicitly read-only and outside this write set.

**Steps:**

- [x] 9.1 Document exact tag/full-commit `npm exec` and equivalent `npm install`; reject moving selectors, `--ignore-scripts`, token-bearing URLs, arbitrary repositories/assets/endpoints, and registry-backed Maister commands.

- [x] 9.2 Explain Git credential ownership versus launcher API credentials, anonymous-first behavior, strict token precedence, API-only authorization, `gh` fallback bounds, redaction, and no-auth public behavior.

- [x] 9.3 Document install/update acquisition versus state-only launcher-network-free behavior, receipt/control-plane authority, legacy migration, exact journal recovery, competing-writer boundary, exit codes, signal mappings, cleanup residue, code-7 preservation, and unsigned-integrity limitations.

- [x] 9.4 Document the GitHub-only protected release runbook, same-job artifacts, exact selector/manifest/tag/sidecar/archive/E3/receipt evidence, public smoke, hermetic private evidence, and zero registry mutation.

- [x] 9.5 Add the normative future-private migration checklist: operator-equivalent Git credentials; tested `GH_TOKEN`, `GITHUB_TOKEN`, and bounded `gh` fallback; protected secrets/environment inaccessible to untrusted PRs; authenticated exact tag/full-commit acquisition and private Release assets from the same canonical repository; no leaks/cross-host auth; complete identity/evidence rerun; release blocked until real private E2E passes.

- [x] 9.6 Update distribution-facing URLs/author/developer metadata to `mateuszrapacz`, refresh deterministic overlay hashes/fixtures through project tooling, and verify legal `LICENSE` attribution is byte-identical.

**Exact tests:**

```sh
node --test tests/platform-independent/launcher-cli.test.mjs
node --test tests/platform-independent/release-github-only-policy.test.mjs
node --test tests/platform-independent/requirement-artifact-drift.test.mjs
make test-overlay TARGET=codex
make test-overlay TARGET=cursor
make test-topology
```

**Acceptance:** Every documented command is executable and exact; no npm publication/latest/browser-asset/private-now claim remains; future-private checklist is normative and complete; distribution metadata consistently names `mateuszrapacz`; `LICENSE` hash is unchanged.

**Failure/rollback/recovery:** Documentation/metadata changes are independently revertible; never alter source/workflow to make prose pass. If overlay drift appears, regenerate only Group 9-owned overlay manifests/fixtures with canonical tooling and rerun target/topology checks.

**Integration checkpoint I9:** Mechanically extract command snippets and forbidden vocabulary from docs, run the referenced safe validation commands, compare `LICENSE` pre/post hash, and review private-migration language against R-036.

## 4. Requirements-to-Task Traceability Matrix

The canonical acceptance text remains the exact normative table in `analysis/requirements.md` and `implementation/spec.md`. This matrix enumerates every Must requirement exactly once and binds it to executable plan work and evidence; Group 8.8 mechanically enforces the full acceptance-text parity rather than maintaining a third normative copy.

| Requirement | Must coverage obligation | Owning steps | Primary evidence |
|---|---|---|---|
| R-001 | Private root Git package; no `publishConfig`; one ESM binary; Node ≥22; explicit files allowlist with only generated commit evidence and no arbitrary Git metadata. | 1.1, 1.3–1.5 | `launcher-package-identity`, package dry-run |
| R-002 | Exact `#vX.Y.Z` or full 40-hex Git package acquisition only; protected CI proves selector; runtime does not infer it from npm metadata. | 1.4, 8.3–8.4, 9.1 | exact-selector CI + public smoke |
| R-003 | Exact normal dependency `tar@7.5.20` with lock integrity; read-only third-party registry acquisition and dependency/SBOM review only. | 1.1, 1.5, 8.1, 8.7 | package policy + SBOM/no-mutation gate |
| R-004 | Exactly seven commands, three targets, one optional JSON flag, recover-only canonical journal UUID; all other launcher arguments rejected before side effects. | 5.1 | `launcher-cli`, zero-mutation suite |
| R-005 | Fixed public canonical repository, release tag shape, target map, and required assets; no user configuration. | 2.4, 3.1 | release/transport contract tests |
| R-006 | Real anonymous exact-tag/full-commit Git package and Release operation now; no public-path Authorization. | 2.1, 8.4–8.5 | protected real public smoke |
| R-007 | Private Git acquisition remains npm/Git/operator-owned; launcher never reads/converts/persists/logs Git credentials; token URLs unsupported. | 2.1–2.3, 8.6, 9.1–9.2 | credential/redaction policy tests |
| R-008 | Credential precedence exactly `GH_TOKEN` → `GITHUB_TOKEN` → bounded non-shell `gh` → anonymous. | 2.1–2.3 | credential suite + focused red case |
| R-009 | Injected fixed `gh` command port with shell false, bounds, timeout, token validation, redaction, no persistence, deterministic anonymous fallback. | 2.2–2.3 | credential command matrix |
| R-010 | Anonymous exact metadata first; eligible private response only triggers one authenticated retry; invalid explicit token fails closed. | 2.1, 2.5, 3.5 | I3 state-machine tests |
| R-011 | Authorization only to exact approved HTTPS `api.github.com` paths; never to browser/content hosts; permanent cross-host stripping. | 3.1–3.2 | transport redirect/auth tests |
| R-012 | Every archive/sidecar fetched via GitHub API asset URL/ID with octet-stream; bounded 200/302; browser URL rejected. | 2.4, 3.1–3.2 | transport + focused red case |
| R-013 | One 15-second pre-header deadline per attempt covering DNS/TCP/TLS/proxy/headers, fresh redirect/retry clocks, capped by resource/aggregate walls, typed abort/retry/cleanup, separate idle timer, injectable seams. | 3.3–3.6 | fake-clock transport suite |
| R-014 | One exact stable non-draft/non-prerelease `vX.Y.Z` Release with unique assets; no moving/fallback Release. | 2.4–2.5 | release contract suite |
| R-015 | Fixed prepare Git invocation writes restricted atomic closed manifest; launcher requires and compares full identity chain; protected CI proves selector; all missing/spoof/mismatch/temp failures terminal and cleaned. | 1.2–1.5, 4.4–4.5, 8.3 | package identity + exact-chain E2E |
| R-016 | Streamed archive SHA-256 agrees with checksums, SBOM, provenance, and optional GitHub digest; unsigned evidence not called authentication. | 4.1, 4.5, 9.3 | archive/candidate tests + docs scan |
| R-017 | Independent bounded gzip/ustar pre-write inspection rejects malformed data, trailing/concatenated input, unsafe metadata/topology, and count/size/ratio breaches. | 4.1–4.2 | hostile archive corpus |
| R-018 | Exact `tar@7.5.20` strict filtered extraction into new identity-captured private root, no preserve/overwrite/follow, exact plan admission, no-follow comparison. | 4.3–4.4 | archive extraction/post-walk tests |
| R-019 | Download, inspect, and extract streams never retain full archive; near-limit/high-ratio cross-platform memory evidence. | 3.6, 4.1, 4.6, 8.9 | RSS child-process suite on three OSes |
| R-020 | Validate selected overlay, installer closure, source manifest/content hash, portable-core digest, fresh passed E3; build immutable descriptor. | 4.4 | deterministic candidate validation |
| R-021 | GitHub archives remain payload authority and `maister-install.mjs` remains sole host/settings/state mutation authority. | 5.2–5.5, 6.1–6.6 | zero-mutation + transaction suites |
| R-022 | Install/update delegate only to verified archive installer with exact local source/full commit/target/evidence; no launcher mutation or compensation. | 5.2–5.3 | delegation and argv tests |
| R-023 | Transactional receipt-bound control-plane closure; every durable step journaled; historical references preserved; prune only unreferenced after terminal commit. | 6.1–6.4 | installer aggregate/crash tests |
| R-024 | State-only commands use validated active receipt/control-plane/source hashes with no launcher DNS/HTTP/Git/registry or ambient fallback. | 5.4 | offline authority throw-port tests |
| R-025 | Absent/legacy/ambiguous/escaping/symlinked/unsupported/corrupt/mismatched authority fails explicit and mutation-free; migration only by verified install/update. | 5.5, 6.4 | authority/legacy snapshot tests |
| R-026 | Exact UUID journal recovery; ambiguous default fails closed; every unselected journal/state remains byte/topology-identical. | 6.5, 7.2 | multiple-journal suite |
| R-027 | Abrupt termination at every durable boundary recovers or preserves exact full state without network/ambient search. | 6.6, 7.1 | crash marker matrix |
| R-028 | Aggregate installer transaction suite reaches explicit terminal pass/fail/timeout with exact final-tree evidence. | 6.6, 7.4 | aggregate harness result |
| R-029 | Every pre-child rejection proves host target/settings/state bytes, modes, links, existence, and topology unchanged. | 5.1–5.5, 5.8 | zero-mutation snapshots |
| R-030 | Typed redacted launcher diagnostics on stderr, machine-readable stdout; byte-faithful child streams, paths, codes 0/2–8, JSON unchanged. | 5.6 | process/delegation tests |
| R-031 | Acquisition abort, one child signal forward, terminal wait, no false success, POSIX re-raise, Windows 130/143, cleanup never rollback. | 5.7 | signal matrix on three OSes |
| R-032 | Immediate exact-root cleanup after all outcomes; identity-only removal; first-install evidence retained until terminal; warning never replaces child result. | 3.4, 4.3, 4.6, 5.8 | cleanup/recovery-root tests |
| R-033 | Preserve deterministic three-target packaging, parity, E3, source/sidecars, isolation, extracted smoke, drift/lock/rollback/recovery/code-7 contracts. | 6.1–6.6, 8.2, 8.9 | make/release/transaction gates |
| R-034 | GitHub-only release CI; no npm publication/view/dist-tag/registry observation or publication credential. | 8.1–8.2, 8.7 | static workflow policy test |
| R-035 | Static/runtime proof of zero registry mutation; only exact locked `tar@7.5.20` read acquisition allowed. | 1.5, 8.1, 8.7 | network observer + policy scan |
| R-036 | Current real anonymous all-target exact-tag/full-commit E2E; hermetic private behavior now; normative future-private checklist activates same-repository protected real private E2E. | 8.4–8.6, 9.4–9.5 | public smoke + hermetic private + docs gate |
| R-037 | Linux/macOS/Windows, Node 22, release npm major cover CLI/auth/transport/archive/memory/mutation/cleanup/signal/authority/transaction/crash/journal/package/smoke. | 4.6, 7.1–7.4, 8.9 | three-OS required matrix |
| R-038 | Three TDD-red defects green; docs/metadata use `mateuszrapacz`; `LICENSE` unchanged; exact R-001–R-038 Markdown/HTML drift rejection. | 1.1, 3.1, 5.2, 8.8, 9.1–9.6 | focused red suite + drift/metadata gates |

Coverage gate: the traceability parser must find exactly the ordered set `R-001` through `R-038`, each once, all priority `Must`, with every row mapped to at least one owning step and executable evidence command.

## 5. Integrated Validation and Release Candidate Gate

Run from a clean exact candidate checkout after all group checkpoints. Do not modify generated/task/workflow state while collecting evidence.

```sh
npm ci --ignore-scripts=false
npm run validate
node --test tests/platform-independent/launcher-github-only.test.mjs
npm run test:launcher
node --test tests/platform-independent/installer-transaction.test.mjs
node --test tests/platform-independent/installer-abrupt-crash.test.mjs
node --test tests/platform-independent/installer-multiple-journals.test.mjs
node --test tests/platform-independent/release-github-only-policy.test.mjs
node --test tests/platform-independent/requirement-artifact-drift.test.mjs
make test-core
make test-runtime
make test-evidence
make test-topology
make test-parity-release
make validate
```

For a protected release tag, additionally generate one source-bound passed E3, package all three targets from the same clean commit/date epoch, run `release-package.test.mjs` against the same-job output, publish only GitHub Release assets, compare public bytes, and execute the public smoke command from Group 8. A local stale `dist/` directory is never release input.

### Integration checkpoints

| Checkpoint | Required result before proceeding |
|---|---|
| I1 Package | Protected private package, generated exact commit manifest, exact tar lock, safe allowlist. |
| I2 Credentials | Strict precedence/fail-closed/redaction and bounded non-shell command contract. |
| I3 Transport | Anonymous-first/API-only asset state machine and exact timing/cleanup composition. |
| I4 Candidate | Streaming inspection/extraction, digest/source/E3 identity, and RSS bounds. |
| I5 Delegation | Red suite green, zero pre-spawn mutation, offline authority, faithful process behavior. |
| I6 Transactions | Receipt-bound closure and aggregate suite produce terminal exact-tree evidence. |
| I7 Recovery | Every durable crash marker and multiple-journal isolation have terminal evidence. |
| I8 Release | No registry mutation machinery; exact-selector/public E2E and hermetic private gates ready. |
| I9 Docs | Exact commands, operational boundaries, future-private checklist, metadata/legal separation. |

### Release acceptance

- All 38 Must requirements and every matrix row pass on the exact candidate commit.
- Focused TDD result is exactly 3 passed, 0 failed.
- Aggregate installer evidence is terminal; no silence, interruption, missing final snapshot, or platform unavailability is counted as pass.
- Every crash marker and multi-journal case is terminal and snapshot-identical or explicit preserved code 7.
- Streaming/RSS ceilings pass on Linux, macOS, and Windows Node 22 with the release npm major.
- Current canonical public exact-tag and full-commit E2E passes all three targets anonymously with no Authorization.
- Hermetic private credential/transport evidence passes; real private E2E is neither required nor claimed while the repository is public.
- Workflows and runtime prove zero registry mutation and contain no publication credential; only read-only exact tar closure acquisition occurs.
- Same-job deterministic archives, sidecars, shared E3, parity, topology, extracted lifecycle, public-byte comparison, and exact identity agree.
- User/operator docs and distribution metadata are current, future-private migration is release-blocking when activated, and `LICENSE` is unchanged.

## 6. Global Failure, Rollback, and Recovery Rules

- Before child spawn, delete only identity-validated operation-owned paths and prove host/state snapshots unchanged. Never use broad paths, globs, unresolved environment variables, or ambient search.
- After child spawn, preserve installer-owned state and propagate child streams/status/signals. Launcher cleanup failure is secondary and never triggers compensation or rollback.
- Code 6 means a cooperating lifecycle lock is busy; stop the competing process and retry the intended operation. It does not authorize lock deletion.
- Code 7 is unresolved transaction/recovery state. Preserve lock metadata, receipts, journals, backups, staging, control planes, and retained operation root; use the exact journal-bound original installer after competing writers stop.
- Drift code 5 and integrity code 8 require diagnosis of the exact recorded state; do not repeatedly retry rollback or delete state.
- Release failures before publication leave GitHub unchanged. Failures after immutable GitHub upload may only re-observe and resume the same exact state; do not replace bytes under the tag and do not publish a registry repair.
- A canonical-repository visibility change immediately activates the Group 9 future-private checklist and blocks every release until protected authenticated exact-selector/private-Release E2E passes.

## 7. Executor Handoff

The later implementation-plan-executor must:

1. Verify the current worktree and preserve unrelated/user changes; never revert paths outside the active group's write set.
2. Execute groups in wave order, mark HTML `data-step` and `data-group` markers only after exact tests and checkpoint acceptance pass, and keep at most one overlapping writer per file.
3. Re-run the focused TDD file after Groups 1, 3, and 5 and report the expected red-to-green progression without editing away assertions.
4. Stop and request a specification decision if RSS ceilings, deadline semantics, repository visibility, exact identity, or a requirement acceptance text would need to change; do not weaken tests or silently broaden scope.
5. Treat any non-terminal aggregate/platform/public-smoke result as unavailable evidence and keep release NO-GO.
6. Deliver source/test/workflow/docs changes plus terminal evidence; do not modify task workflow state, approval scope, or planning artifacts except executor progress markers authorized by the orchestrator.
