# Specification: GitHub-Only npm-exec Distribution

## TL;DR

Maister is never published to npmjs, GitHub Packages, or another registry; users run or install the repository package from an exact GitHub tag or full commit.
The launcher uses a prepare-generated checkout-commit manifest, anonymously or privately acquires exact GitHub Release assets, verifies and streams them into a private root, then delegates to the release's installer.
GitHub Release archives remain payload authority, and `plugins/maister/bin/maister-install.mjs` remains the sole host/installer-state mutation authority.
All 38 requirements are release-blocking, including exact selector/commit identity, transaction/crash/journal completion, bounded memory, current real public E2E, hermetic private transport, and zero registry mutation.

## Key Decisions

- Exact `#vX.Y.Z` tags and full 40-hex commits are supported; branches, default refs, `latest`, dist-tags, and semver/range selectors are unsupported.
- A fixed non-shell prepare producer records the actual checkout's full commit in a package-carried manifest; protected CI separately proves the original selector is exact because npm does not expose it reliably at runtime.
- The root package has `private: true`, no `publishConfig`, and exact normal dependency `tar@7.5.20`; registry access is permitted only to acquire that locked third-party dependency read-only.
- Public GitHub Release access sends no authorization. Private API credentials resolve as `GH_TOKEN` → `GITHUB_TOKEN` → bounded `gh auth token --hostname github.com` → anonymous.
- Authorization is confined to `https://api.github.com`; all assets use API asset URLs plus `Accept: application/octet-stream`, and authorization is stripped permanently on cross-host redirects.
- State-only commands are active-receipt/control-plane bound and make no launcher network, Git, credential-command, or registry call after the package has been acquired.
- Release CI publishes only GitHub Release assets and carries no package-registry publication command, dist-tag operation, or publication credential.
- The canonical repository is public now. Its real anonymous Git/Release E2E is mandatory now; real private E2E activates only if the same canonical repository becomes private and the normative migration checklist passes.

## Open Questions / Risks

- No critical or important design decision is unresolved.
- Protected tags and the controls in the future private-repository migration checklist are operational prerequisites outside the launcher boundary.
- The implementation is not releasable until whole-buffer archive behavior is replaced by conforming streaming and measured RSS evidence.
- Aggregate transaction completion, abrupt crash boundaries, and multiple unresolved journals remain mandatory evidence even when focused tests pass.

## 1. Status and Context

| Field | Value |
|---|---|
| Status | Implementation-ready; all design decisions resolved |
| Task | `2026-07-19-npx-release-distribution` |
| Package/binary | Git package `@mateuszrapacz/maister`; binary `maister` |
| Canonical repository | `mateuszrapacz/maister` |
| Runtime floor | Node.js 22 or newer |
| Supported targets | `codex`, `cursor`, `kiro-cli` |
| Risk | High |
| Requirements | 38 Must |
| Product UI | None |

This specification supersedes every historical assumption that Maister is publicly published as an npm package. References in earlier research, plans, implementation notes, CI states, or reports to npm publication, package ownership, `NPM_TOKEN`, `npm publish`, `npm view`, npm versions, dist-tags, `@latest`, registry propagation, registry-backed npx smoke, or latest promotion are historical only and MUST NOT drive implementation.

npm remains in the supported journey solely as a local client capable of acquiring a Git package, resolving its exact Git dependency closure, and exposing its `bin`. Read-only npmjs acquisition of locked `tar@7.5.20` is explicitly allowed. No action may publish or otherwise mutate Maister or metadata in a package registry.

## 2. Architecture and Authority Boundaries

```text
exact Git tag/full commit package spec
  -> npm install/npm exec invokes Git
  -> public Git access or operator-owned private Git credentials
  -> package launcher (parse, acquire, verify, extract, delegate, clean)
  -> exact GitHub Release API metadata and API asset URLs
  -> verified private operation root
  -> plugins/maister/bin/maister-install.mjs
  -> existing lock/journal/transaction/receipt/recovery authority
  -> Codex, Cursor, or Kiro CLI state
```

The launcher is a distribution adapter. Before delegation it may write only beneath one identity-captured invocation root. It MUST NOT write host target roots or settings, create/alter receipts, journals, backups, locks, staging, control planes, rollback records, or recovery state, infer a transaction target, or import transaction internals to mutate state.

`plugins/maister/bin/maister-install.mjs` is the sole mutation authority. GitHub Release archives produced by the existing deterministic release pipeline are the sole target payload authority. The same archive installer and runtime closure are preserved transactionally as the active receipt's control plane; this is one version-matched installer implementation, not a second installer.

## 3. Supported Acquisition and CLI

### 3.1 Package acquisition

Supported examples:

```sh
# Public exact tag
npm exec --yes --package='github:mateuszrapacz/maister#v2.2.1' -- maister install --target codex

# Public exact full commit
npm exec --yes --package='github:mateuszrapacz/maister#0123456789abcdef0123456789abcdef01234567' -- maister verify --target cursor --json

# Private exact commit using existing Git SSH credentials
npm exec --yes --package='git+ssh://git@github.com/mateuszrapacz/maister.git#0123456789abcdef0123456789abcdef01234567' -- maister install --target kiro-cli
```

Equivalent exact-ref `npm install` is supported. The fragment MUST be an exact stable release tag `vX.Y.Z` or full 40-hex commit. An omitted fragment, branch, `HEAD`, default branch, `latest`, dist-tag, semver selector/range, prerelease selector, short SHA, pull-request ref, or moving symbolic ref is unsupported and absent from production instructions and smokes.

Private Git credentials belong to npm/Git. SSH agents/keys and HTTPS credential helpers/askpass are allowed. The launcher MUST NOT inspect, translate, persist, or log them. Tokens in Git/package URLs are prohibited because URLs leak through process and diagnostic boundaries.

### 3.2 Closed launcher CLI

```text
maister <command> --target <target> [--json]
maister recover --target <target> [--journal-id <uuid>] [--json]
```

- `<command>` is exactly `install`, `update`, `status`, `verify`, `uninstall`, `rollback`, or `recover`.
- `<target>` is exactly `codex`, `cursor`, or `kiro-cli`, appears once, and is explicit.
- `--json` appears at most once.
- `--journal-id` appears at most once, is an exact canonical UUID, and is accepted only by `recover`.
- Public launcher inputs do not include repository, URL, asset, branch, version, source, ref, home, evidence, failure injection, cache, target alias, or auto-detection.
- Unknown, duplicate, missing, conflicting, positional-tail, short-form, or ambiguous input fails before temp-root creation, credential access, network, receipt access, or delegation.

### 3.3 Command classes

| Command | Acquisition performed by running launcher | Delegation |
|---|---|---|
| `install`, `update` | Exact Release metadata, sidecars, selected archive; verification and private extraction | Verified archive installer with exact `local:` source, full commit, target, and evidence |
| `status`, `verify` | None | Active-receipt-bound installed control plane |
| `uninstall`, `rollback` | None | Active-receipt-bound installed control plane; no inferred receipt/backup |
| `recover` | None | Receipt/journal-bound installed control plane; optional exact `--journal-id` |

“Launcher-network-free” begins after npm has acquired/started the Git package. npm may require its cache, Git, and read-only dependency registry access before process start. Truly disconnected use requires the exact package and dependency closure to be installed/cached locally; documentation MUST distinguish these boundaries.

## 4. Package and Target Contract

The root package MUST contain:

- name `@mateuszrapacz/maister`, `private: true`, no `publishConfig`, ESM, one `maister` bin, and `engines.node: >=22`;
- an explicit runtime files allowlist including `.maister-resolved-commit.json` and excluding `.git`, every other Git metadata/config/ref/log/index/object/worktree file, producer temporary files, archives, task artifacts, tests/fixtures not used at runtime, secrets, local `dist`, host settings, and workspace files;
- exact normal dependency `tar: 7.5.20` and lock integrity `sha512-9FcyK4PA6+WbzlTM9WhQm6vB5W7cP7dUiPsv1g7YDwEQnQ1CGpK3MGlKk/ITVWMk05kHZuBhmVhiv8LZoy/PFQ==`;
- distribution metadata pointing to `mateuszrapacz/maister`, while legal `LICENSE` attribution remains unchanged.

The sole permitted package lifecycle producer is `prepare` for `.maister-resolved-commit.json`; it performs no network, source selection, host mutation, dependency mutation, or publication. Other install scripts are prohibited. npm's ordinary dependency install may read from the configured registry for the exact locked `tar` closure.

The closed target/asset mapping is:

| Target | Selected archive | Required selected overlay |
|---|---|---|
| `codex` | `maister-codex.tar.gz` | `plugins/maister/overlays/codex/**` |
| `cursor` | `maister-cursor.tar.gz` | `plugins/maister/overlays/cursor/**` |
| `kiro-cli` | `maister-kiro-cli.tar.gz` | `plugins/maister/overlays/kiro-cli/**` |

Every candidate Release exposes exactly one of each selected archive plus `SHA256SUMS`, `SBOM.cdx.json`, and `PROVENANCE.json`. Additional release-note artifacts may exist but cannot influence selection or become authority. Duplicate/missing names, non-uploaded state, cross-target payload, foreign behavior tree, extra top-level root, or missing installer/source/E3 closure fails closed.

## 5. Exact Candidate Identity

The launcher derives stable package version `X.Y.Z` from its own package metadata and requests only exact Release tag `vX.Y.Z` from fixed repository `mateuszrapacz/maister`. The Release MUST be published, non-draft, non-prerelease, and expose unique required assets.

### 5.1 Package-carried resolved commit

For both Git-package `npm install` and `npm exec`, npm's Git dependency preparation runs the package `prepare` producer before materialization. The producer captures and no-follow validates the actual checkout/package root, then executes `git` through a fixed non-shell process request:

```json
{
  "executable": "git",
  "argv": ["rev-parse", "--verify", "HEAD^{commit}"],
  "shell": false,
  "cwd": "<captured-actual-package-checkout>",
  "timeout_ms": 5000,
  "max_stdout_bytes": 128,
  "max_stderr_bytes": 8192
}
```

Success is exit code `0`, no signal/truncation, and exactly one lowercase 40-hex commit line after one optional trailing newline. The producer validates fixed repository identity and package version, emits canonical JSON with only `schema_version:1`, `repository:"mateuszrapacz/maister"`, `package_version:"X.Y.Z"`, and `resolved_commit:"<40-lowercase-hex>"`, and writes it by exclusive same-directory temporary regular file, mode `0600`, write/fsync, parent/output identity revalidation, and atomic rename to `.maister-resolved-commit.json`. It removes only producer-owned stale/failed temporary files. Any command, schema/hash, containment, symlink, mode, fsync, or rename failure terminates package preparation.

The resulting manifest, and no arbitrary Git metadata, is carried by the package allowlist. It persists unchanged as runtime package evidence until npm cleans the package directory; the launcher never rewrites or deletes it. At startup the launcher no-follow reads it and fails typed `E_LAUNCHER_PACKAGE_IDENTITY` before network or host mutation when it is absent, non-regular, symlinked, malformed, repository/version-mismatched, or hash-invalid. Acquisition with lifecycle scripts disabled is unsupported and fails this gate.

The public CLI and environment contain no manifest override, resolved-commit override, package selector, source, evidence, or Git metadata input. This prevents caller spoofing within the supported boundary. It does not claim safety from a malicious canonical repository commit, malicious same-user/privileged package-file mutation, or compromised npm/Git; protected CI, trusted release-channel controls, and the documented concurrency threat model own those risks.

The following form one indivisible identity:

| Observation | Required value |
|---|---|
| Protected-CI package selector | Literal exact tag or full commit |
| Package manifest resolved commit | Full 40-hex actual checkout commit |
| Package version | `X.Y.Z` |
| Release tag | `vX.Y.Z` |
| Release tag target | Resolved package commit |
| Sidecar source identity | Same version/full commit |
| Archive `.maister-source.json` | Same version/full commit plus content hash |
| E3 | Same version/full commit plus portable-core/artifact digest |
| Installed receipt | Same version/full commit/content hash/control-plane identity |

Protected CI proves the original selector exact before invoking npm: the tag path runs fixed documented resolution equivalent to `git rev-parse --verify refs/tags/vX.Y.Z^{commit}` and invokes the literal `#vX.Y.Z`; the commit path validates a literal lowercase 40-hex selector, resolves `<full-commit>^{commit}`, and invokes that literal commit. Protected tag/ruleset configuration is release evidence. npm does not expose the original selector reliably at runtime, and launcher code MUST NOT infer it from npm environment, Git cache topology, URLs, or caller input. The launcher instead requires the package manifest and compares its commit with Release tag target, sidecar source commit, archive `.maister-source.json`, E3 source identity, and package/release/source versions. Missing or inconsistent identity is terminal; no other tag, release, branch, URL, asset, target, or archive may substitute.

The immutable verified-release descriptor contains package version, Release tag, target, asset ID/name/size/SHA-256, source commit/version/content hash, E3 digest, selected overlay, and installer relative path. No downstream component may modify it. It is invocation evidence; the installer receipt remains durable mutation evidence.

## 6. Public and Private GitHub API Authentication

### 6.1 Anonymous-first state machine

1. Request the fixed exact-tag Release API route anonymously.
2. On success, lock the invocation to public/anonymous mode. Do not inspect token environment variables or invoke `gh`; every asset request remains unauthenticated.
3. Only anonymous `401`, `403`, or privacy-preserving `404` on that exact route may trigger credential resolution.
4. Resolve one optional API credential and retry the same route once.
5. Missing/invalid authorization response produces one redacted private-access failure. It never tries a different repository/ref or leaks whether a token was present.

### 6.2 Credential precedence

1. First non-empty `GH_TOKEN`.
2. Otherwise first non-empty `GITHUB_TOKEN`.
3. Otherwise bounded `gh auth token --hostname github.com` command result.
4. Otherwise anonymous/no credential.

The first present environment source is authoritative. Tokens must be 1-4096 printable non-whitespace ASCII characters with no CR/LF/NUL/control bytes. Malformed explicit environment input returns `E_LAUNCHER_CREDENTIAL_INVALID`; it does not fall through to another credential source.

### 6.3 Injectable `gh` command boundary

The production command request is fixed:

```json
{
  "executable": "gh",
  "argv": ["auth", "token", "--hostname", "github.com"],
  "shell": false,
  "timeout_ms": 5000,
  "max_stdout_bytes": 16384,
  "max_stderr_bytes": 8192
}
```

The injected port captures bounded stdout/stderr in memory, kills at deadline, and awaits terminal outcome. A valid result has exit code 0, no signal/truncation, and stdout containing exactly one valid token line after one optional trailing newline. Only the validated token survives in invocation memory. Stdout/stderr are never persisted or included in errors.

Executable-not-found, non-zero exit, signal, timeout, output overflow, or malformed command result deterministically means “no command credential” and continues anonymously. Diagnostics expose only a source/status enum. They MUST NOT expose subprocess streams, token length/prefix, environment value, authorization, signed URL, or child error detail containing output.

## 7. Transport Contract

### 7.1 Authorization and routes

Authorization is legal only when scheme is HTTPS, hostname is exactly `api.github.com`, path is the fixed Release metadata route or fixed repository Release asset API route with numeric ID, and the invocation is authenticated-private. Public mode sends no authorization even if ambient token variables exist.

All selected archives and sidecars are fetched from their Release API asset URL/ID with:

```http
Accept: application/octet-stream
X-GitHub-Api-Version: 2022-11-28
```

The transport accepts bounded direct `200` or bounded redirect behavior. Before following a cross-host redirect, it strips authorization permanently for that request chain. Authorization is never sent to `github.com`, `release-assets.githubusercontent.com`, `objects.githubusercontent.com`, `*.githubusercontent.com`, or another host. Redirect destinations are HTTPS and exact-host allowlisted; every URL and path is revalidated, and signed query strings are redacted.

### 7.2 Limits and retry behavior

| Resource | Limit |
|---|---:|
| Release API JSON | 1 MiB |
| `SHA256SUMS` | 64 KiB |
| `SBOM.cdx.json` | 8 MiB |
| `PROVENANCE.json` | 4 MiB |
| Selected compressed archive | 256 MiB |
| Redirects | 5 per request |
| Pre-header attempt / body idle | 15 seconds each |
| Metadata/sidecar wall time | 30 seconds each |
| Archive wall time | 120 seconds |
| Whole acquisition | 180 seconds |
| Attempts | 2 total per request |
| Retry delay | 5 seconds maximum |

Declared `Content-Length` and observed streamed bytes are bounded. Missing length is allowed only with stream enforcement. Over-limit, malformed, partial, wrong content type/encoding, timeout, or cancellation aborts and cleans partial files.

Each initial fetch, redirect fetch, and retry fetch is one timing attempt. Its 15-second pre-header clock starts immediately before fetch and ends only when final response headers for that fetch arrive, so DNS, TCP, TLS, proxy negotiation, and redirect response-header wait all consume the same deadline. Every redirect/retry starts a fresh attempt clock, but no redirect or retry resets the enclosing 30/120-second resource wall clock or 180-second aggregate acquisition clock; the earliest remaining clock wins. Expiry produces typed `E_LAUNCHER_PREHEADER_TIMEOUT`, aborts transport, awaits termination, closes handles, and removes the partial operation-owned file. It is retry-eligible only before a semantic body is accepted and only while failure class plus attempt, redirect, resource, and aggregate budgets permit.

Final response headers end the pre-header clock and start the separate 15-second body-idle timer. That timer resets only after a body chunk is successfully consumed, never pauses or extends wall clocks, and on expiry emits its distinct typed timeout, aborts, and performs the same partial-file cleanup.

Retry is allowed only for eligible transport failure before a semantic body, HTTP 408, 429, or 5xx. There is no retry for other 4xx, credential validation, malformed metadata, identity/digest disagreement, archive rejection, or any installer outcome. Redirects count inside one attempt; partial bodies are never resumed or reused.

Production uses injected transport, clock/deadline, temp-root, archive, process, authority-store, and credential-command ports. Tests use fixtures without live mutable network/user auth state.

## 8. Sidecar, Archive, and Source Verification

Normative order:

1. Validate runtime, package metadata, CLI, command class, and target.
2. Resolve exact Release metadata anonymously or through the one bounded private retry.
3. Select unique fixed assets; create/register one private operation root.
4. Stream API asset sidecars and archive under transport limits.
5. Compute local archive SHA-256 while streaming.
6. Parse closed sidecar schemas and compare all required source/archive/E3 observations.
7. Stream-inspect gzip/ustar without extraction writes.
8. Reject every archive-policy violation.
9. Extract plan-admitted entries into a new empty private child root.
10. No-follow rewalk and compare topology, type, mode, size, digest, selected overlay, source manifest/content hash, installer closure, and E3.
11. Build the immutable descriptor and emit redacted provenance.
12. Spawn the verified installer.

Local archive SHA-256 MUST equal its unique `SHA256SUMS` entry, SBOM hash, provenance artifact hash, and GitHub asset digest when present. Absence of GitHub's digest is recorded; disagreement is fatal. Sidecars MUST bind all three target archives to one source version/commit and identical E3 bytes/digest. Unsigned checksums, SBOM, provenance, GitHub digest, and E3 are integrity/consistency evidence obtained through a trusted channel—not independent publisher authentication.

## 9. Archive Safety and Bounded Memory

### 9.1 Inspection policy

Only one gzip member containing supported ustar input is accepted. Inspection rejects malformed/truncated checksums or headers, concatenated members, trailing non-padding bytes, unsupported path/size-altering extensions, sparse/nested surprises, advertised/actual disagreement, and any unknown type.

Allowed entries are directories and regular files. Current payload inventory rejects every symlink, hard link, device, FIFO, socket, whiteout, and special type. Each path is normalized relative POSIX under `plugins/maister/` and rejects NUL/control, absolute/drive/UNC, backslash, empty/dot/dot-dot segments, overlong path, excess segments, duplicate/case/Unicode-normalization collision, and file/directory parent conflict.

Entries require deterministic ownership (uid/gid 0, empty owner names), directory `0755`, file `0644` or allowlisted executable `0755`, and no setuid/setgid/sticky/group/world writable bits.

| Archive property | Limit |
|---|---:|
| Entries | 50,000 |
| One regular file | 128 MiB |
| Expanded regular-file bytes | 512 MiB |
| UTF-8 path bytes | 1,024 |
| Path segments | 128 |
| Compression ratio | 100:1 after first 1 MiB expanded |

### 9.2 Extraction policy

`tar@7.5.20` is invoked only through the archive port with `strict:true`, `preservePaths:false`, `keep:true`, `preserveOwner:false`, `maxDepth:128`, `maxDecompressionRatio:100`, `maxMetaEntrySize:1048576`, and a filter admitting only exact regular-file/directory entries in the immutable inspection plan.

The operation root is unpredictable, mode `0700` where supported, exclusively created, identity-captured, and registered for cleanup immediately. Downloads remain `0600` until validated. Extraction target is new/empty. Creation never follows links or overwrites; parent identity is revalidated at write boundaries. Post-extraction no-follow traversal must exactly match the plan. Unchecked system `tar -xzf` is prohibited.

### 9.3 Streaming and measurable memory bound

Download hashing, gzip/ustar inspection, and node-tar extraction are backpressure-aware streams. The implementation MUST NOT retain the complete compressed or expanded archive in a JavaScript buffer/string/array or duplicate it in memory.

A dedicated child-process acceptance test samples RSS for near-limit and high-compression-ratio fixtures on Linux, macOS, and Windows. Peak RSS over the post-start baseline MUST be ≤128 MiB. At least a 2x increase in expanded fixture size under the same policy MUST increase peak RSS by ≤16 MiB. The test also proves exact byte/entry/digest counters, terminal stream completion, timely limit abort, and cleanup. A skip or byte cap without RSS/stream evidence is unavailable evidence.

## 10. Mutation, Control Plane, and State-Only Commands

### 10.1 Install/update delegation

The child executable is exactly the verified archive's `plugins/maister/bin/maister-install.mjs`, spawned non-shell with the current Node executable. Arguments contain only validated lifecycle command, target, `--source local:<verified-operation-root>`, full source commit, optional `--json`, and required exact evidence path. No forbidden launcher input is forwarded.

After spawn, the installer exclusively owns lock, journal, staging, backup, target/settings mutation, receipt/pointer commit, verification, rollback, recovery, and control-plane persistence. The launcher performs no compensating write or blind retry.

### 10.2 Receipt-bound control plane

Install/update transactionally stage an immutable closure conceptually at:

```text
<target-state-root>/control-planes/<receipt-id>/plugins/maister/...
```

Before candidate receipt publication, the installer validates closure topology and computes tree/installer hashes. The journal binds exact source identity, staged/destination identities, hashes, ownership, and every durable promotion step. The receipt binds contained relative root/installer refs, CLI contract version, tree and installer hashes, source version/full commit/content hash.

Update creates a new receipt-ID closure and preserves every closure referenced by active/history/rollback/recovery/journal/backup state. Rollback validates the historical receipt and matching closure before pointer restoration. Uninstall/prune removes only closures proven unreferenced after terminal commit; pruning is journaled/retryable. Recovery completes or removes only operation-owned pending state according to its journal. Partial schema evolution is forbidden.

Pre-feature receipts without a valid control-plane binding permit read-only diagnosis but fail state-only delegation with the explicit migration error. Only verified install/update may migrate them.

### 10.3 Offline discovery

For state-only commands the launcher:

1. validates CLI/target without transport or credential command;
2. derives the canonical target state root without creating it;
3. no-follow reads active pointer and referenced receipt using containment/schema/mode/identity checks;
4. validates target/source/provenance and contained control-plane refs;
5. recomputes tree and installer hashes and verifies CLI contract;
6. spawns only that exact installer with command, target, optional journal ID, and optional `--json`.

There is no PATH, npm cache, current checkout, package-carried fallback, sibling receipt, nearest version, Git, GitHub, credential command, registry, or network search. Missing, legacy, ambiguous, escaping, symlinked, corrupt, unsupported, or mismatched state fails typed and mutation-free.

## 11. Journals, Crashes, Rollback, and Recovery

`recover --journal-id <uuid>` selects exactly one unresolved journal. When multiple unresolved journals exist, unqualified recovery MUST fail closed and list only redacted safe identifiers; it must not choose newest/oldest/nearest. Qualified recovery mutates only the selected journal's operation-owned paths. Every unselected journal, backup, staging root, closure, receipt, and target remains byte-, mode-, link-, existence-, and topology-identical.

Abrupt termination is injected after every durable boundary, including lock/journal creation, backup capture, target staging, control-plane staging/promotion, candidate receipt write, active pointer transition, verification, rollback markers, cleanup/prune markers, and terminal journal write. Recovery must deterministically complete, roll back, or preserve explicit code-7 state. Assertions cover host bytes, modes, symlink targets, existence, topology, active receipt, historical receipts, backup manifest/root, journal, staging, and control planes.

An interrupted first install with no valid active receipt retains only the identity-captured verified operation root, exact source/evidence, and selected journal until terminal state. The documented operator route invokes that root's original installer with exact target, local source, full ref, evidence, and journal ID. It performs no network or ambient executable search. Cleanup may remove that root only after terminal completion.

The aggregate `tests/platform-independent/installer-transaction.test.mjs` run on the exact candidate tree MUST emit bounded progress and terminate as explicit pass, fail, or harness timeout with final-tree evidence. Silence, manual interruption, killed runner, or partial focused scenarios are unavailable—not passing—evidence.

## 12. Output, Exit, Signals, and Cleanup

Before delegation, launcher progress/errors are typed, schema-versioned, redacted, and stderr-only; stdout remains empty. With `--json`, stderr uses newline-delimited `maister.launcher` events and exactly one terminal failure event with null receipt/journal claims.

After spawn, child stdout and stderr are forwarded byte-for-byte in their independent stream order; no global inter-stream ordering is claimed. The launcher does not parse/re-emit/wrap installer JSON and never manufactures receipt/journal paths. Child exit codes `0` and `2`-`8` remain exact. Drift (`5`), lock (`6`), transaction/recovery (`7`), and integrity (`8`) are never retried or translated.

Before child spawn, `SIGINT`/`SIGTERM` aborts active transport/archive work, waits for termination, cleans only owned temp state, and exits non-success. After spawn, the first signal is forwarded once to the child/process group, no new work starts, and the launcher waits for child terminal outcome. A second signal may force launcher exit but may not delete installer state. POSIX re-raises the child signal where possible; Windows maps interruption/termination to documented `130`/`143`. Success is impossible after interruption.

Exact-root cleanup is registered immediately and runs after success, rejection, child failure, timeout, and signal. It validates operation-root identity and never uses broad directories, globs, unresolved environment values, host roots, or installer state. After child spawn, cleanup warning is secondary and never replaces child result or triggers rollback. Recovery-owned first-install roots remain until terminal state.

## 13. Zero-Mutation and Concurrency Contracts

Before successful child spawn, the launcher may mutate only its operation root. Every rejection test snapshots every affected host target/settings/state location and compares bytes, modes, symlink targets, existence, and directory topology afterward. A missing state root must remain missing. Exit code alone is insufficient evidence.

Once delegated, existing installer concurrency remains cooperative: the target lock serializes Maister lifecycle processes for one target/state root, not host/editor/sync/direct/malicious writers. Identity and drift checks fail observed races closed. Documentation requires competing host/editor/synchronization writers to stop and MUST NOT claim atomicity against malicious same-user or privileged mutation.

Code `7` remains unresolved operational state. Preserve lock metadata, journals, receipts, backups, staging, control planes, and operation root as applicable; use exact recovery after competing processes stop. Deleting state or repeatedly retrying rollback is prohibited guidance.

## 14. Release CI and Registry Prohibition

The GitHub-only release sequence is:

```text
clean protected vX.Y.Z tag at candidate commit
  -> validate source/overlays/topology/runtime
  -> strict clean three-target parity
  -> one source-bound passed E3
  -> deterministic package all targets
  -> extracted lifecycle smoke all targets
  -> SHA256SUMS + SBOM + PROVENANCE
  -> launcher/auth/transport/archive/memory/transaction/platform gates
  -> publish GitHub Release assets only
  -> verify exact public bytes/identity
  -> real public no-auth exact-tag/full-commit smoke
  -> hermetic private credential/API transport gate
```

Canonical states are:

```text
BUILT -> GITHUB_PUBLISHED -> GITHUB_VERIFIED
      -> PUBLIC_NO_AUTH_SMOKE_VERIFIED
      -> HERMETIC_PRIVATE_TRANSPORT_VERIFIED
```

Same-job artifacts come from an isolated empty output directory; stale local `dist` is never input. Actions are commit-SHA pinned. Re-runs observe exact immutable GitHub state and never replace published bytes under the same tag/version.

Package metadata/workflows/scripts/docs MUST contain no npm publish/view/dist-tag/deprecate/provenance-publish/registry-observation command or npm/GitHub Packages/other-registry publication configuration. CI has no `NPM_TOKEN`, registry trusted-publishing permission, registry auth file, or equivalent mutation credential. Static scans and network-observing tests prove no registry mutation. The only allowed registry traffic is read-only acquisition/audit of exact locked `tar@7.5.20` and its transitive closure.

## 15. Current Public Evidence and Future Private Migration

The canonical repository `mateuszrapacz/maister` is public now. The release-blocking real public smoke clears `GH_TOKEN`, `GITHUB_TOKEN`, Git auth overrides, and user `gh` state from the launcher environment. It acquires literal exact public tag and full commit through npm/Git, proves protected-CI selector resolution and package-manifest resolved-commit agreement, uses anonymous Release metadata/API assets, proves no Authorization header, and executes install/status/verify/uninstall in isolated home/state roots for every release-policy target.

Current private behavior is release-blocking hermetic evidence through injected Git/credential/transport seams: each API credential source and precedence, eligible anonymous denial and one retry, direct `200` and `302` API asset paths, authorization confinement, cross-host stripping, redaction, malformed credentials, command timeout/failure, and no token-bearing Git URL or leaked secret. It MUST NOT require another repository and MUST NOT claim real private Git/Release E2E while the canonical repository remains public.

User/operator documentation and the protected release runbook MUST contain a normative private-repository migration checklist. Before changing the canonical repository to private or releasing it afterward, operators MUST:

1. configure operator-equivalent Git SSH/HTTPS credentials without token-bearing package URLs;
2. configure and test `GH_TOKEN`, `GITHUB_TOKEN`, and bounded `gh auth token --hostname github.com` fallback;
3. place credentials only in protected secrets/environments unavailable to untrusted pull requests;
4. replace the real public smoke with authenticated exact-tag/full-commit npm/Git acquisition from the same canonical private repository and authenticated assets from its private Release;
5. verify no token or authorization leaks through Git URLs, logs, artifacts, subprocess output, signed query diagnostics, redirects, or cross-host requests;
6. rerun exact selector, package-manifest commit, Release tag target, sidecar, archive digest/manifest, E3, target lifecycle, and cleanup evidence; and
7. block release until every migration item and the authenticated private E2E pass.

Real private E2E becomes mandatory only when the canonical repository is private. Each current public smoke and future private smoke records package spec, protected-CI resolved selector commit, package-manifest commit, package version, Release tag/target, asset ID/name/digest, sidecar source commit, archive manifest/content hash, E3 digest, target, and terminal lifecycle result. Evidence contains no token, auth header, signed URL query, command stdout, Git credential, or private path.

## 16. Cross-Platform Test Matrix

Linux, macOS, and Windows run Node 22 and the exact npm major declared by release CI. Mandatory behavior includes:

- closed CLI and exact Git package specs;
- anonymous-first/API-only credential behavior and bounded injected command outcomes;
- redirect/path/timeout/retry/byte-cap transport;
- hostile archive inspection, strict `tar@7.5.20` extraction, no-follow races, and RSS bounds;
- zero-mutation snapshots and exact-root cleanup, including Windows locked-file behavior;
- receipt-bound authority, legacy migration failure, update/rollback/uninstall closure retention;
- terminal aggregate transaction, abrupt-crash boundaries, and multiple unresolved journals;
- child stdout/stderr/JSON/codes/signals with POSIX and Windows mappings;
- current real public smoke and hermetic private behavior, plus exact identity/no-registry evidence; after a visibility migration, the protected real private smoke replaces the public smoke as mandatory.

Windows fixtures cover drive/UNC/backslash/case/long-path behavior; macOS covers default case-insensitive and available case-sensitive volumes; Linux covers case-sensitive baseline. Symlink privilege unavailability may skip only fixture creation, never archive-header rejection, collision/path checks, no-follow assertions, or equivalent semantic safety. Platform unavailability is not a pass.

## 17. Requirements

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

## 18. Verification and Definition of Done

The work is done only when all 38 requirements pass on the exact release candidate and existing validation remains green. Required evidence includes:

- the three `launcher-github-only.test.mjs` red cases turned green for their intended behavior;
- closed CLI, package boundary, exact-ref acquisition, and identity-chain tests;
- real public no-auth Git/Release E2E and hermetic private metadata/API asset transport, including all credential source/failure/redaction/redirect cases;
- complete hostile archive corpus, strict `tar@7.5.20`, streaming/RSS thresholds, zero-mutation snapshots, cleanup, child output/codes/signals;
- terminal aggregate transaction results, every durable abrupt-crash boundary, and multiple unresolved-journal isolation;
- install/update/status/verify/uninstall/rollback/recover and control-plane retention/recovery across all three targets;
- deterministic package/parity/source/E3/sidecar/extracted lifecycle gates;
- Linux/macOS/Windows Node 22 and declared npm major;
- static/runtime no-registry-mutation evidence, requirement-artifact drift rejection, and GitHub-only release workflow inspection;
- complete user/operator documentation for exact refs, public/private credentials, offline boundary, code-7 and exact journal recovery, integrity limitations, cleanup residue, protected release runbook, and the normative private-repository migration checklist.

A focused test, dry-run pack, checksum alone, interrupted runner, skipped platform semantic, or unsigned provenance claim cannot substitute for these gates. Release status remains NO-GO until every currently applicable release-blocking item has terminal evidence; after the canonical repository becomes private, unavailable protected private E2E is a blocker rather than a pass.

### 18.1 Requirement artifact drift gate

One automated gate parses the `R-001`–`R-038` rows from `analysis/requirements.md` and this Markdown file, extracts and HTML-decodes the normative rows from `implementation/spec.html`, and compares ordered ID, exact priority, and exact acceptance text triples. It rejects missing, duplicate, extra, or out-of-order IDs. The two Markdown row triples MUST be byte-identical and every decoded HTML triple MUST equal the canonical Markdown triple. Visual summaries are explicitly non-normative and excluded.

## 19. Scope Exclusions

- Publishing Maister or its dist-tags/metadata to npmjs, GitHub Packages, or another registry.
- Moving/latest/branch/range selectors, additional or arbitrary repositories, release URLs, assets, mirrors, custom endpoints/CAs, or fallback versions.
- A second installer, launcher-owned host transaction, duplicated materialization/settings/receipt/recovery logic, or direct host writes.
- Target auto-detection/aliases, unsupported hosts, interactive wizard, persistent launcher cache/state, background updates, telemetry, or product UI.
- Host marketplace or generic Agent Skills publication as the full Maister lifecycle.
- Replacing current unsigned evidence with a signing/trusted-publisher architecture in this task, or claiming current evidence authenticates the publisher.
- Changing legal `LICENSE` attribution.

## 20. Traceability

| Concern | Existing authority / source |
|---|---|
| Commands/options/codes | `plugins/maister/lib/distribution/cli-contract.mjs` |
| Targets/state paths | `targets.mjs`, `target-paths.mjs` |
| Sole mutation CLI | `plugins/maister/bin/maister-install.mjs` |
| Source/path/E3 | `source-resolver.mjs`, `path-safety.mjs`, `e3-attestation.mjs` |
| Materialization/transaction/recovery | `materializer.mjs`, receipt/journal schemas, `transaction-manager.mjs`, recovery modules |
| Archive/release production | `release-interface.mjs`, `release-metadata.mjs`, `Makefile`, `.github/workflows/release.yml` |
| Revised scope | `analysis/gap-analysis.md`, `analysis/scope-clarifications.md` |
| Requirements/clarifications | `analysis/requirements.md`, `analysis/technical-clarifications.md` |
| Red tests | `implementation/tdd-red-gate.md`, `tests/platform-independent/launcher-github-only.test.mjs` |
| Project standards | `.maister/docs/INDEX.md`, build, validation, error, minimal implementation, and testing standards |

## decisions_needed

### critical

None.

### important

None.
