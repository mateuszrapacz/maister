# Technical Clarifications: GitHub-Only npm-exec Distribution

## TL;DR

The launcher is a GitHub acquisition/verification/delegation adapter, not a published npm package and not a second installer.
Exact Git refs, a prepare-generated checkout-commit manifest, exact Release identity, anonymous-first transport, API-only authorization, streamed archive handling, and receipt-bound offline lifecycle behavior are fixed contracts.
The credential subprocess and every network/filesystem/process boundary are injectable, bounded, redacted, and deterministic.
No design decision remains open; the risks below are acceptance evidence still to be produced.

## Key Decisions

- Exact Git tag/full commit acquisition supersedes all registry-version, dist-tag, `latest`, semver range, and branch behavior.
- The package carries a prepare-generated resolved-commit manifest; protected CI separately proves the caller used an exact selector because npm does not reliably expose the original selector at runtime.
- Public Release resolution is anonymous-first. Private API authentication is activated only after an eligible anonymous denial.
- Environment-token precedence is strict; `gh` is a bounded optional source and its operational failure deterministically yields anonymous mode.
- The Release API asset endpoint is used for archives and sidecars in both public and private modes.
- Streaming is normative; whole-buffer compressed or expanded archive processing is non-conforming even when byte-capped.
- Transaction, crash, journal, cleanup, signal, rollback, and recovery acceptance remain byte/topology based.
- The canonical repository is public now: real anonymous E2E is mandatory, private auth/transport is hermetic, and a normative migration checklist activates real private E2E only if repository visibility changes.

## Open Questions / Risks

- No critical or important technical choice remains unresolved.
- Exact protected-tag enforcement and the future private-repository migration controls are external release prerequisites.
- The streaming memory ceiling and abrupt-crash matrix are expected to fail until their implementation and evidence are completed.

## 1. Acquisition and identity semantics

The npm client is only a local Git-package acquisition/execution mechanism. Supported package specs terminate in either exact `#vX.Y.Z` or a full 40-lowercase-hex commit. Moving branches, omitted refs, `HEAD`, `latest`, semver ranges, prerelease selectors, and dist-tags are unsupported in documentation, tests, and release automation. npm does not reliably expose the original package selector to installed runtime code, so runtime code MUST NOT infer or claim that observation from ambient npm variables, Git cache layout, package URLs, or caller-supplied launcher inputs.

### Prepare-time resolved-commit manifest

The Git package has one allowed lifecycle producer: `prepare` generates `.maister-resolved-commit.json` before npm materializes the package for either exact-ref `npm install` or `npm exec`. It performs no network access, source selection, host mutation, dependency mutation, or publication. The producer:

1. captures and no-follow validates the actual package checkout root and output parent;
2. invokes executable `git` through the injected/fixed non-shell process boundary with argv exactly `["rev-parse", "--verify", "HEAD^{commit}"]`, `shell:false`, the captured checkout as `cwd`, bounded output, and a hard timeout;
3. accepts exactly one lowercase 40-hex commit line, validates package version and fixed repository identity, and emits only the closed canonical JSON schema below;
4. exclusively creates a same-directory temporary regular file at mode `0600`, writes/fsyncs it, atomically renames it to the manifest after revalidating parent/output identity, and removes stale or failed temporary output; and
5. fails the lifecycle terminally if Git execution, schema/hash validation, identity checks, restricted creation, fsync, or rename fails.

```json
{
  "schema_version": 1,
  "repository": "mateuszrapacz/maister",
  "package_version": "X.Y.Z",
  "resolved_commit": "0123456789abcdef0123456789abcdef01234567"
}
```

No selector, credential, URL, environment value, Git directory path, branch, tag name, or arbitrary Git metadata is recorded. The package runtime allowlist includes this resulting manifest and excludes `.git`, Git config, refs, logs, index, objects, worktree metadata, producer temporary files, and all other Git metadata. After successful materialization the manifest remains read-only package evidence for the package lifetime; npm owns eventual package-directory cleanup. The launcher never rewrites or deletes it. A failed prepare removes only producer-owned temporary files; an absent, non-regular, symlinked, malformed, wrong-mode-at-production, wrong-repository/version, or invalid-hash manifest causes typed `E_LAUNCHER_PACKAGE_IDENTITY` before network or host mutation. `--ignore-scripts` and any acquisition path that omits successful prepare are unsupported and fail at that same runtime gate.

Within the stated threat model this handoff resists caller spoofing because the public CLI/environment cannot supply or override it, the producer reads `HEAD` from the actual captured checkout through fixed argv, and arbitrary Git metadata is absent from the package. It does not protect against a malicious canonical repository commit that changes both producer and launcher, malicious same-user/privileged mutation of package files, or a compromised npm/Git executable; release-channel and protected-CI controls own those risks.

The root package version selects exact Release tag `v<version>`. Acceptance records and compares:

```text
protected-CI exact package selector
  -> package-carried resolved full commit
  = exact Release tag target commit
  = PROVENANCE/SBOM source commit
  = archive .maister-source.json source_commit
  = E3 source_commit
  = installed receipt source commit
```

For a tag invocation, protected CI runs fixed documented resolution equivalent to `git rev-parse --verify refs/tags/vX.Y.Z^{commit}`, records the full result, and invokes npm with the literal `#vX.Y.Z` package spec. For a commit invocation, it validates the literal lowercase 40-hex selector, resolves it with `git rev-parse --verify <full-commit>^{commit}`, invokes npm with that literal full commit, and requires it to equal the Release tag target. Protected tag/ruleset configuration and the checked workflow prove selector exactness; npm runtime metadata does not. The launcher reads the package manifest and compares its resolved commit to the Release tag target, sidecar source commit, archive `.maister-source.json`, and E3 source identity. Package version, Release tag version, source version, and E3 version are identical. Missing observations and mismatches fail closed; there is no nearby Release or ref fallback.

## 2. Credential provider and anonymous-first behavior

Git package credentials and GitHub API credentials are separate trust boundaries:

- npm/Git owns SSH agent/key, credential-helper, and askpass use for private repository acquisition.
- The launcher never receives or translates Git credentials and rejects/documentation forbids token-bearing Git URLs.
- The launcher first requests the fixed exact-tag Release API route anonymously. Public success fixes the invocation in anonymous mode; assets also carry no authorization.
- Only anonymous `401`, `403`, or privacy-preserving `404` from that exact route may trigger API credential resolution and one authenticated retry.

Credential precedence is exact:

1. If non-empty `GH_TOKEN` is present, select and validate it.
2. Otherwise, if non-empty `GITHUB_TOKEN` is present, select and validate it.
3. Otherwise invoke the injected credential command.
4. Otherwise continue anonymously, which produces the ordinary redacted private-access failure if the repository is private.

The first present environment token is authoritative. A malformed explicit environment token produces `E_LAUNCHER_CREDENTIAL_INVALID`; it does not fall through to a lower-precedence secret.

### Injectable command boundary

The production command request is immutable:

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

The port captures stdout/stderr only in bounded memory, kills the child at deadline, awaits terminal outcome, and never persists either stream. Success requires exit code `0`, no signal, no truncation, empty-or-ignored bounded stderr, and stdout containing exactly one token line after one optional trailing newline. The token must be 1-4096 printable non-whitespace ASCII characters with no CR/LF/NUL/control bytes. The implementation stores only the validated token in invocation memory.

Executable-not-found, non-zero, signal, timeout, output overflow, or malformed command output deterministically means “no command credential” and proceeds anonymously. Diagnostics expose only a redacted source/status kind, never stdout/stderr, token length, prefix, argv-derived secret, environment value, or child error details containing output. Tests inject the command port; they do not shell out to a real user session.

## 3. API authorization and asset transport

Authorization may be attached only when all are true:

- scheme is `https:`;
- hostname is exactly `api.github.com`;
- method and normalized path match the fixed Release metadata or `/repos/mateuszrapacz/maister/releases/assets/<numeric-id>` policy;
- the invocation is in authenticated-private mode.

All required asset names are selected uniquely from Release metadata, but download uses each asset's API `url`/numeric ID—not `browser_download_url`—with:

```http
Accept: application/octet-stream
X-GitHub-Api-Version: 2022-11-28
```

Public mode sends no `Authorization` on metadata or asset requests even when ambient token variables exist; the anonymous success prevents credential lookup. Private mode may receive a direct bounded `200` body or a bounded `302`. Before following any cross-host redirect, authorization is removed permanently for that request chain. It is never sent to `github.com`, `release-assets.githubusercontent.com`, `objects.githubusercontent.com`, or another host. Redirect destinations are HTTPS/host allowlisted and signed query values are redacted.

The existing limits remain normative: 1 MiB Release JSON; 64 KiB checksums; 8 MiB SBOM; 4 MiB provenance; 256 MiB compressed archive; five redirects; a 15-second pre-header deadline and separate 15-second body-idle deadline; 30-second metadata/asset-sidecar and 120-second archive wall clocks; 180-second whole acquisition; two total retry attempts for eligible pre-semantic transport failure/408/429/5xx; and five-second maximum backoff. Declared and observed byte caps both apply.

Each initial fetch, redirect fetch, and retry fetch is one attempt for timing purposes. Its pre-header clock starts immediately before calling fetch and ends only when final response headers for that fetch arrive; DNS resolution, TCP connection, TLS handshake, proxy negotiation, and redirect response-header wait all consume the same 15 seconds. A redirect or eligible retry starts a fresh 15-second pre-header clock, but never resets the enclosing 30/120-second resource wall clock or 180-second aggregate acquisition clock. The earliest remaining deadline wins. Expiry aborts the active fetch/stream with typed `E_LAUNCHER_PREHEADER_TIMEOUT`, waits for transport termination, closes handles, and removes the partial operation-owned file. It is retry-eligible only when no semantic body has been accepted, the failure class is otherwise eligible, and attempt/redirect/resource/aggregate budgets remain. Final response headers end the pre-header clock and start the independent 15-second body-idle timer, which resets only after a successfully consumed body chunk; idle expiry is separately typed, aborts, and performs the same partial-file cleanup. Neither timer pauses or extends wall deadlines.

## 4. Archive implementation, limits, and memory

`tar@7.5.20` remains an exact normal dependency with lockfile integrity. This is permitted read-only third-party acquisition, not Maister registry distribution. Dependency advisories, lock integrity, runtime closure, and SBOM inclusion are checked before Release publication.

The two-stage archive port remains fixed:

1. Stream gzip/ustar inspection without filesystem writes into an immutable normalized plan.
2. Extract only plan-admitted regular files/directories with node-tar strict filtered settings into an empty private identity-captured root, then no-follow compare the tree to the plan.

Required node-tar controls remain `strict:true`, `preservePaths:false`, `keep:true`, `preserveOwner:false`, `maxDepth:128`, `maxDecompressionRatio:100`, `maxMetaEntrySize:1048576`, and a filter that admits only planned entries. Links and special types are rejected for the current payload inventory.

The existing hard limits remain: 50,000 entries; 128 MiB per regular file; 512 MiB expanded regular-file bytes; 1,024 UTF-8 path bytes; 128 segments; and 100:1 ratio after the first 1 MiB expanded.

Whole-buffer compressed or expanded processing is prohibited. Download hashing, inspection, and extraction use backpressure-aware streams. A dedicated child-process test samples RSS while processing near-limit and high-compression-ratio fixtures. On each supported OS, peak RSS above post-start baseline must stay at or below 128 MiB and increasing expanded fixture size by at least 2x must increase peak RSS by no more than 16 MiB. The test must also show terminal stream completion, exact counters/digest, and cleanup after limit rejection. If platform noise invalidates these explicit ceilings, changing them is a specification decision, not a test skip.

## 5. Verification and delegation order

Normative order:

1. Validate runtime/package/CLI.
2. Resolve exact anonymous Release metadata, or bounded private retry.
3. Select unique fixed assets and create/register the private operation root.
4. Stream/download sidecars/archive through API asset URLs.
5. Compare local archive digest and all sidecar/API observations.
6. Stream-inspect gzip/ustar and reject policy violations before extraction writes.
7. Extract privately and revalidate no-follow topology, modes, sizes, manifest/content hash, selected overlay, installer closure, and E3.
8. Build the immutable descriptor and emit redacted provenance.
9. Delegate to the exact verified `maister-install.mjs`.

Every pre-delegation failure mutates only the invocation root and proves host/state byte-, mode-, link-, existence-, and topology-identity. No later check waives an earlier mismatch.

## 6. State-only authority and recovery

`status`, `verify`, `uninstall`, `rollback`, and `recover` do not call the launcher transport, credential command, Git, or a registry after the launcher starts. They resolve only the active receipt's contained control-plane root and exact installer, validate receipt schema/target/source hashes/tree hash/installer hash/CLI contract with no-follow reads, and spawn that installer without source/ref/network arguments.

Install/update stage and commit the release-owned control-plane closure in the same transaction as candidate receipt and active pointer publication. Journals bind staging/destination identity and hashes. Update/rollback/recovery preserve every still-referenced historical closure; pruning removes only unreferenced closures after a terminal journal state. Pre-feature receipts fail state-only delegation with the explicit migration error and are migrated only by a verified install/update transaction.

`recover` accepts optional exact UUID `--journal-id`. With multiple unresolved journals, no selector fails closed without touching any journal. An explicit selector can recover only that journal; all others remain byte/topology-identical. Abrupt termination is injected after each durable journal/control-plane/receipt/pointer boundary and must produce deterministic resume/rollback or preserved code-7 evidence.

An interrupted first install retains its identity-captured verified operation root and journal until the installer reaches a terminal state. Recovery uses the original verified installer, exact source/ref/evidence, and journal ID without network, PATH, cache, or sibling-journal search. Cleanup occurs only after terminal completion.

## 7. Process, output, signals, and cleanup

Launcher diagnostics are typed, redacted, and stderr-only; stdout stays empty before delegation. After spawn, child stdout and stderr are forwarded byte-for-byte in their own stream order, with no global ordering claim and no wrapper around installer JSON. Child exit codes `0` and `2`-`8`, receipt/journal paths, and terminal signal outcome are authoritative.

The first `SIGINT`/`SIGTERM` aborts acquisition or is forwarded once to the child. The launcher waits for terminal child outcome before cleaning only its own temp root. POSIX uses same-signal re-raise where available; Windows uses documented `130`/`143`. Cleanup warnings never turn failure into success, replace a child result, delete installer state, or claim rollback.

## 8. CI and publication state

The current canonical repository `mateuszrapacz/maister` is public. The only current publication sequence is:

```text
BUILT
  -> GITHUB_PUBLISHED
  -> GITHUB_VERIFIED
  -> PUBLIC_NO_AUTH_SMOKE_VERIFIED
  -> HERMETIC_PRIVATE_TRANSPORT_VERIFIED
```

CI may upload deterministic target archives and sidecars to a GitHub Release. It must contain no npm publish/view/dist-tag/registry-observation command; no `NPM_TOKEN`, registry OIDC publishing grant, or equivalent registry mutation credential; and no state named for npm publication or promotion. Static workflow/package scans and a network-observing test prove zero external registry mutation while allowing only read-only installation of locked `tar@7.5.20`.

The release-blocking public smoke is a real anonymous Git-package and GitHub Release E2E against the canonical repository. It clears GitHub/Git auth overrides, executes literal exact tag and full-commit package specs, proves protected-CI selector resolution and package-manifest commit agreement, downloads assets through API URLs with no authorization, and exercises isolated lifecycle roots. Current private credential precedence, denial/retry, API asset, redirect stripping, redaction, malformed credential, timeout, and no-token-leak behavior is covered hermetically through injected Git/credential/transport seams; it does not require or claim another repository or a real private E2E.

User/operator documentation and the protected release runbook MUST include this normative future private-repository migration checklist. Before the canonical repository visibility changes to private or any release occurs afterward: configure operator-equivalent Git SSH/HTTPS credentials; configure and test `GH_TOKEN`, `GITHUB_TOKEN`, and bounded `gh auth token --hostname github.com` fallback; place credentials only in protected secrets/environments unavailable to untrusted pull requests; replace the public real smoke with authenticated exact-tag/full-commit acquisition from the same canonical private repository and its private Release; verify authorization never leaks to Git URLs, logs, artifacts, subprocess output, signed query diagnostics, or cross-host redirects; rerun selector, resolved-manifest commit, tag-target, sidecar, archive manifest/digest, E3, and lifecycle evidence; and block release until every item passes. Real private E2E becomes mandatory only when the canonical repository is private.

## 9. Mandatory TDD and verification gates

The three Phase 3 red tests remain direct acceptance tests:

1. package protection (`private:true`, no `publishConfig` or publication machinery);
2. `GH_TOKEN` precedence over `GITHUB_TOKEN`;
3. authenticated asset request uses the API asset URL and octet-stream negotiation.

Release acceptance additionally requires terminal aggregate transactions, abrupt-crash coverage at every durable boundary, multiple unresolved-journal isolation, streaming/RSS evidence, real anonymous public E2E, hermetic authenticated-private transport, exact selector/manifest identity evidence, no registry mutation, all hostile archive/zero-mutation/signal/cleanup contracts, and Linux/macOS/Windows Node 22 plus the declared npm major. Real authenticated private Git/Release E2E is required only after the canonical repository becomes private, when the migration checklist blocks release.

One automated drift gate parses the `R-001`–`R-038` table rows from `analysis/requirements.md` and `implementation/spec.md`, decodes HTML entities and text content from `implementation/spec.html`, and compares ordered IDs, exact priorities, and exact acceptance text. It also rejects missing, duplicate, extra, or out-of-order IDs. The two Markdown row triples must be byte-identical, and each decoded HTML triple must equal the canonical Markdown triple; summaries are explicitly non-normative and excluded from this comparison.

## decisions_needed

### critical

None.

### important

None.
