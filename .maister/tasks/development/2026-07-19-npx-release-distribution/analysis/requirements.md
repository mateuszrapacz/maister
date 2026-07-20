# Requirements: GitHub-Only npm-exec Distribution

## TL;DR

Maister is acquired and executed with `npm install` or `npm exec` from an exact GitHub tag or full commit; Maister is never published to a package registry.
GitHub Release archives remain the payload authority, and `plugins/maister/bin/maister-install.mjs` remains the sole host-state mutation authority.
Public acquisition from the currently public canonical repository is anonymous; private transport behavior is hermetically release-blocking until a future private-repository migration activates real authenticated E2E.
Acceptance is release-blocking for exact selector/commit identity, transaction/crash recovery, bounded streaming memory, current public E2E, cross-platform behavior, and zero registry mutation.

## Key Decisions

- Supported package selectors are exactly `#vX.Y.Z` and a full 40-hex commit. Branches, default-branch refs, `latest`, semver ranges, and other moving selectors are unsupported.
- A fixed non-shell prepare producer writes a package-carried resolved-commit manifest from the actual Git checkout; protected CI, not npm runtime metadata, proves the original exact selector.
- `package.json` is protected with `private: true`, has no `publishConfig`, and retains exact normal dependency `tar@7.5.20`; npmjs access is read-only dependency acquisition only.
- Public GitHub metadata and assets are requested without `Authorization`. A private lookup uses `GH_TOKEN`, then `GITHUB_TOKEN`, then bounded `gh auth token --hostname github.com`, then anonymous behavior.
- Authorization may be sent only to `api.github.com`. Every Release asset is fetched through its GitHub API asset URL with `Accept: application/octet-stream`; authorization is permanently stripped on a cross-host redirect.
- State-only commands remain receipt-bound and launcher-network-free after the Git package has been acquired.
- Release CI may upload GitHub Release assets only. It contains no npm publish/view/dist-tag operation, package-registry publication credential, or registry mutation.
- The canonical repository is public now. Real anonymous Git-package/Release E2E is mandatory now; real private E2E becomes mandatory only if the canonical repository changes to private, under the normative migration checklist.

## Open Questions / Risks

- No critical or important design decision remains unresolved.
- Exact tags can be force-moved outside the software boundary; protected immutable release tags and exact commit evidence are required, and a full commit remains the stronger caller pin.
- A future visibility change to private is blocked until protected credentials, authenticated canonical Git/Release E2E, redaction/cross-host checks, and exact identity evidence satisfy the migration checklist.
- Current archive handling must satisfy the new streaming/peak-memory gate; a byte limit alone is not evidence of bounded memory.

## Scope

### In scope

- Root Git-package metadata, launcher, closed CLI, exact-ref documentation, and direct-Git `npm install`/`npm exec` acceptance.
- Anonymous and authenticated GitHub Release metadata/asset transport, including injectable bounded credential command execution.
- Existing release-sidecar, archive, source-manifest, E3, extraction, cleanup, delegation, signal, receipt, transaction, rollback, recovery, and cross-platform contracts.
- Receipt-bound control-plane lifecycle and exact journal recovery.
- GitHub-only release CI, real anonymous public smoke evidence for the current canonical repository, hermetic private transport evidence, and a normative private-repository migration checklist.

### Out of scope

- Publishing Maister to npmjs, GitHub Packages, or any other registry.
- npm dist-tags, registry versions, registry-backed Maister selectors, `latest`, semver ranges, moving branches, arbitrary repositories, URLs, assets, mirrors, or endpoints.
- A second installer, launcher-owned host mutation, persistent launcher cache, product UI, telemetry, host auto-detection, unsupported targets, or legal `LICENSE` attribution changes.

## Supported user journey

```sh
# Public exact tag
npm exec --yes --package='github:mateuszrapacz/maister#v2.2.1' -- maister install --target codex

# Public exact full commit
npm exec --yes --package='github:mateuszrapacz/maister#<40-hex-commit>' -- maister verify --target cursor --json

# Private exact full commit; Git owns SSH credential handling
npm exec --yes --package='git+ssh://git@github.com/mateuszrapacz/maister.git#<40-hex-commit>' -- maister install --target kiro-cli
```

Equivalent exact-ref `npm install` usage is supported. Credentials embedded in package URLs are prohibited. npm may acquire the exact locked `tar@7.5.20` dependency from npmjs; this does not authorize publishing or mutating any registry.

## Traceable requirements

| ID | Priority | Requirement / acceptance condition |
|---|---|---|
| R-001 | Must | Protect the root Git package with `private: true`, no `publishConfig`, one ESM `maister` binary, Node `>=22`, and an explicit runtime file allowlist that carries only the generated resolved-commit manifest and no arbitrary Git metadata. |
| R-002 | Must | Support acquisition/execution only through exact GitHub tag `#vX.Y.Z` or full 40-hex commit package specs using `npm install` or `npm exec`; protected CI and documented commands prove the original selector is exact, while runtime code does not claim npm exposes that selector reliably. |
| R-003 | Must | Keep `tar` exactly at normal dependency version `7.5.20` with lockfile integrity; permit only read-only third-party registry acquisition and include it in dependency/SBOM review. |
| R-004 | Must | Accept exactly the seven lifecycle commands and targets `codex`, `cursor`, `kiro-cli`; accept `--json` at most once and `--journal-id <uuid>` only for `recover`; reject every other public launcher argument before side effects. |
| R-005 | Must | Keep the currently public canonical repository owner/name, release tag shape, target map, and required asset names closed and non-user-configurable. |
| R-006 | Must | Make real Git-package and Release acquisition from the currently public canonical repository work anonymously for exact tag and full commit, and prove that no `Authorization` header is emitted in the public path. |
| R-007 | Must | Leave private Git package acquisition entirely to npm/Git and operator-managed SSH/HTTPS credentials; the launcher never reads, converts, persists, or logs those credentials, and tokens in Git URLs are rejected/documented as unsupported. |
| R-008 | Must | Resolve optional GitHub API credentials in exact precedence `GH_TOKEN` -> `GITHUB_TOKEN` -> bounded non-shell `gh auth token --hostname github.com` -> anonymous. |
| R-009 | Must | Implement the `gh` fallback behind an injected command port with executable `gh`, fixed argv, `shell:false`, bounded stdout/stderr, a hard timeout, token format validation, full redaction, no persistence, and deterministic anonymous fallback on unavailable/non-zero/timeout/malformed command results. |
| R-010 | Must | Attempt the fixed public Release API route anonymously first; only an eligible private-access response may trigger the credential chain and one authenticated retry of the same route. Invalid explicit environment credentials fail closed rather than silently selecting a lower-precedence source. |
| R-011 | Must | Send API authorization only to exact HTTPS host `api.github.com` and approved repository/asset API paths; never send it to `github.com` or content hosts, and permanently strip it before any cross-host redirect. |
| R-012 | Must | Download every selected archive and sidecar by its GitHub Release API asset URL/ID with `Accept: application/octet-stream`; support bounded direct `200` and `302` delivery and reject browser URL substitution. |
| R-013 | Must | Enforce one 15-second pre-header deadline per fetch attempt from immediately before fetch until final response headers, covering DNS, TCP, TLS, proxy negotiation, and redirect response headers; each redirect/retry gets a fresh attempt deadline capped by resource wall and 180-second aggregate deadlines, with typed timeout, eligible retry only before semantic body, abort, partial-file cleanup, a separate 15-second body-idle timer, and injectable transport/clock seams. |
| R-014 | Must | Bind package version to one exact stable `vX.Y.Z` non-draft, non-prerelease Release and require unique allowlisted assets; never use a moving Release endpoint or fallback release. |
| R-015 | Must | At prepare time, use fixed non-shell Git invocation against the actual checkout to validate and atomically write a restricted-mode, closed-schema package-carried resolved-commit manifest; the launcher requires it for `npm install`/`npm exec` tag and full-commit paths and compares its full commit with package version, Release tag target, sidecar source commit, archive digest and `.maister-source.json`, and E3 digest/source identity as one candidate, while protected CI separately proves the original selector exact and any absence, generation failure, spoof/mismatch, or stale temporary output is terminal and cleaned. |
| R-016 | Must | Compute the selected archive SHA-256 while streaming and require agreement with `SHA256SUMS`, SBOM, `PROVENANCE.json`, and GitHub's asset digest when present; unsigned evidence is never described as publisher authentication. |
| R-017 | Must | Independently inspect bounded gzip/ustar input before extraction writes and reject malformed headers, concatenation/trailing data, unsafe paths/types/links/modes/ownership, collisions, unexpected topology, and count/size/ratio breaches. |
| R-018 | Must | Extract only through exact `tar@7.5.20` strict filtered behavior into a new identity-captured private root, with no preserve-paths/owner, no overwrite/follow, exact inspection-plan admission, and no-follow post-extraction comparison. |
| R-019 | Must | Stream download, inspection, and extraction without holding the full compressed or expanded archive in memory; prove bounded peak memory with near-limit and high-ratio fixtures on Linux, macOS, and Windows. |
| R-020 | Must | Validate the selected overlay, required installer closure, source manifest/content hash, portable-core digest, and fresh passed E3 before delegation and build one immutable verified-release descriptor. |
| R-021 | Must | Keep GitHub Release archives as payload authority and `plugins/maister/bin/maister-install.mjs` as the sole writer of host targets, settings, receipts, journals, backups, locks, staging, control planes, rollback, and recovery state. |
| R-022 | Must | Delegate `install`/`update` only to the verified archive installer with the exact local source, full source commit, target, and evidence; no launcher mutation or compensating transaction is permitted. |
| R-023 | Must | Persist the verified control-plane closure transactionally under the receipt identity, bind it in the receipt, journal every durable step, preserve referenced historical closures, and prune only unreferenced closures after terminal commit. |
| R-024 | Must | Resolve `status`, `verify`, `uninstall`, `rollback`, and `recover` only from the validated active receipt/control-plane topology and source hashes, with no launcher DNS/HTTP/Git/registry call after package acquisition and no PATH/cache/checkout fallback. |
| R-025 | Must | Fail state-only delegation explicitly and mutation-free for absent, legacy, ambiguous, escaping, symlinked, unsupported, corrupt, or mismatched receipt/control-plane state; install/update may migrate legacy receipts only through a verified transaction. |
| R-026 | Must | Preserve journal-bound recovery: `recover --journal-id <uuid>` selects exactly one unresolved journal, default recovery fails closed when selection is ambiguous, and every unselected journal and its state remain byte/topology-identical. |
| R-027 | Must | Prove abrupt process termination at every durable transaction/control-plane boundary recovers or preserves exact bytes, modes, links, existence, topology, active receipt, backup, journal, staging, and control-plane state without network or ambient authority search. |
| R-028 | Must | Prove the aggregate installer transaction suite reaches an explicit terminal pass/fail/timeout result on the exact candidate tree; silence, interruption, or missing final-tree comparison is unavailable evidence. |
| R-029 | Must | Preserve the zero-mutation invariant before child spawn by snapshotting host target, settings, and installer state bytes, modes, links, existence, and topology for every rejection fixture. |
| R-030 | Must | Emit typed redacted launcher diagnostics on stderr with stdout machine-readable; after spawn, forward child stdout/stderr byte-for-byte per stream, receipt/journal paths, exit codes `0` and `2`-`8`, and JSON unchanged. |
| R-031 | Must | Preserve signal semantics: abort acquisition, forward the first child signal, await terminal outcome, avoid false success, use POSIX same-signal re-raise where possible and documented Windows `130`/`143`, and never treat cleanup as rollback. |
| R-032 | Must | Register exact-root cleanup immediately and run it after success, rejection, child failure, timeout, and signal; remove only identity-validated operation-owned paths, retain first-install recovery evidence until terminal state, and never replace the child result with a cleanup warning. |
| R-033 | Must | Preserve deterministic three-target packaging, strict parity, shared E3, source manifest, release sidecars, target isolation, extracted lifecycle smoke, drift/lock, rollback, recovery, and code-7 preservation contracts. |
| R-034 | Must | Make release CI GitHub-only: it may create/verify/upload GitHub Release assets and evidence but contains no npm publication/view/dist-tag/registry-observation step and no npm or other registry publication credential. |
| R-035 | Must | Prove statically and at runtime that no package registry is mutated; read-only acquisition of exact locked `tar@7.5.20` is the sole allowed registry interaction. |
| R-036 | Must | While the canonical repository is public, run real anonymous exact-tag/full-commit Git-package and Release E2E across install/status/verify/uninstall and all release-selected targets, and cover private credential/API behavior hermetically without another repository; normative docs must block any future private-repository release until Git credentials, `GH_TOKEN`/`GITHUB_TOKEN`/`gh` fallback, protected secrets/environment, authenticated canonical private Git plus private Release smoke, no token leakage/cross-host auth, and exact identity/evidence reruns pass, at which point real private E2E becomes mandatory. |
| R-037 | Must | Enforce Linux, macOS, and Windows on Node 22 and the release npm major for CLI, auth, transport, archive, memory, zero-mutation, cleanup, signal, authority, transaction, crash, journal, package, and smoke contracts. |
| R-038 | Must | Keep the three TDD-red defects as mandatory green acceptance: `private:true`/no publication machinery, `GH_TOKEN` precedence, and authenticated API asset URL plus octet-stream behavior; update user/operator docs and distribution metadata to `mateuszrapacz` without changing legal `LICENSE` attribution, and automate drift rejection unless R-001–R-038 IDs, priorities, and acceptance text match exactly across requirements Markdown, specification Markdown, and decoded HTML rows. |

## Acceptance summary

All 38 Must requirements are release-blocking. A focused unit pass cannot substitute for terminal aggregate transactions, abrupt-crash and multiple-journal evidence, measured streaming memory, real public no-auth transport, required hermetic private transport evidence, exact identity evidence, artifact-drift proof, or no-registry-mutation proof. Real authenticated private E2E is additionally mandatory only after the canonical repository changes to private.

## decisions_needed

### critical

None.

### important

None.
