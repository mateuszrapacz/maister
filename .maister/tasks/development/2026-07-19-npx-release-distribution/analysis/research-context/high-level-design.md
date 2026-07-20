## TL;DR

Publish `@mateuszrapacz/maister` as a thin Node.js ESM launcher with a `maister` binary. The launcher resolves one immutable `mateuszrapacz/maister` GitHub Release, selects the allowlisted archive for an explicit `codex`, `cursor`, or `kiro-cli` target, verifies the release binding and archive safety, extracts into a private temporary directory, and delegates to the archive's `plugins/maister/bin/maister-install.mjs`.

The launcher is a distribution adapter, not an installer. It never writes host targets, settings, receipts, journals, backups, or transaction state. `maister-install.mjs` remains the only host mutation authority and retains ownership of install, update, status, verify, uninstall, rollback, recover, drift detection, locking, receipts, and byte-exact recovery.

Exact npm package versions are the reproducible baseline. `latest` is a moving convenience selector: the launcher must resolve it once, display the resolved version/tag before delegation, and ensure the resulting installer receipt records the same immutable source version and commit.

## Key Decisions

- Use a **thin npm launcher plus the existing transactional installer**, with no duplicated lifecycle or host mutation logic ([ADR-001](decision-log.md#adr-001-thin-npm-launcher-and-one-mutation-authority)).
- Use **GitHub Release archives as payload source of truth** and map the explicit target through a closed allowlist ([ADR-002](decision-log.md#adr-002-github-release-payloads-and-target-allowlist)).
- Make **exact versions the reproducible baseline**; `latest` must visibly resolve to one exact release and leave an auditable record ([ADR-003](decision-log.md#adr-003-exact-version-baseline-and-visible-latest-resolution)).
- **Fail closed before delegation** on release, digest, topology, manifest, or E3 failures; extract only into a private bounded temporary root ([ADR-004](decision-log.md#adr-004-fail-closed-verification-and-safe-extraction)).
- Publish npm and GitHub artifacts as **one coordinated release unit** and state clearly that current checksum/provenance records are integrity evidence, not publisher authentication ([ADR-005](decision-log.md#adr-005-coordinated-publication-and-provenance-handling)).

## Open Questions / Risks

- **Node engine floor:** release CI currently uses Node 22, but the minimum supported engine must be measured against the launcher, `fetch`, ESM, archive implementation, and installer during implementation.
- **Publisher authentication:** `SHA256SUMS`, SBOM, GitHub asset digests, and `PROVENANCE.json` can detect inconsistency when fetched through a trusted channel, but the current records are unsigned. Trusted npm publishing and stronger publisher signing remain a follow-up decision.
- **Archive extraction implementation:** the design fixes the safety policy, not the library or subprocess choice. The implementation must prove equivalent path, link, size, count, type, permission, and topology controls on all supported operating systems.
- **Partial publication:** GitHub publication can succeed while npm publication fails, or vice versa. The release workflow needs ordering, idempotent retry rules, and a policy for withholding or deprecating an unpaired npm version.
- **Availability:** GitHub API rate limits, CDN failures, proxies, and npm cache behavior can block install/update. Exact selectors must never fall back to another version, a branch checkout, or a differently named asset.

## Architecture Style

The solution uses **ports and adapters around the existing transactional core**:

```text
User / CI
   |
   | npx --yes @mateuszrapacz/maister@<selector> <command> --target <target>
   v
+---------------- npm distribution adapter ----------------+
| CLI contract | release resolver | downloader | verifier   |
| safe archive inspector/extractor | delegate | cleanup     |
+---------------------------|-------------------------------+
                            | local:<verified-temp-root>
                            v
+---------------- existing mutation authority --------------+
| maister-install.mjs                                      |
| materializer | E3 binding | lock | journal | transaction |
| receipt | drift | rollback | recovery                     |
+---------------------------|-------------------------------+
                            v
              Codex / Cursor / Kiro CLI host state
```

The architecture deliberately has two trust/mutation boundaries:

1. The **distribution boundary** turns a release selector into a verified local payload. It may write only its invocation-owned temporary directory.
2. The **transaction boundary** turns that local payload into managed host state. Only `maister-install.mjs` may cross it.

The launcher must not import internal transaction modules to perform mutations. Delegation occurs through the existing installer CLI contract so package delivery and lifecycle ownership remain independently testable.

## Components and Responsibilities

| Component | Responsibilities | Explicit non-responsibilities |
|---|---|---|
| npm package manifest and `maister` binary | Expose `@mateuszrapacz/maister`, declare ESM/bin/engine metadata, start the launcher, identify its own package version. | Shipping target payloads; managing host state. |
| Launcher CLI adapter | Parse lifecycle command, explicit target, package-selected release selector, `--json`, and supported pass-through options; reject ambiguity before network access. | Reinterpreting installer outcomes; host detection as authority. |
| Release resolver | Convert exact version to tag `v<version>` or resolve `latest` to one published non-draft, non-prerelease release; return immutable release identity. | Falling back to default branch, prerelease, or a nearby version. |
| Target/asset policy | Map `codex`, `cursor`, `kiro-cli` to exactly one archive name and reject all other targets/assets. | Accepting caller-provided URLs or arbitrary archive names. |
| Bounded downloader | Fetch release metadata, selected archive, and verification sidecars with status, redirect, timeout, content-length, streamed-byte, and response-count limits. | Retrying semantic failures or writing outside the temp root. |
| Release verifier | Compute archive SHA-256; bind package version/selector, release tag, asset name/digest, source version/commit, source manifest, release metadata, and embedded E3. | Claiming unsigned metadata authenticates the publisher. |
| Archive inspector/extractor | Inspect before extraction; enforce entry/type/path/link/count/size/topology policy; extract into a newly created private directory; revalidate the extracted tree. | Extracting directly into a host or project root. |
| Installer delegate | Spawn the archive's known installer path with `--source local:<temp-root>`, explicit target, and required evidence; forward signals, stdout/stderr/JSON, and exit status. | Translating codes `2–8`, retrying transaction failures, or editing receipts. |
| Cleanup guard | Remove invocation-owned download/extraction data in `finally`; report retained temp path if cleanup fails. | Removing installer state, target files, receipts, journals, or backups. |
| Existing installer/state | Resolve validated local source, select same-source overlay, materialize, validate E3, lock, journal, mutate, verify, publish receipt, and perform lifecycle recovery. | Resolving npm/GitHub release selectors. |

## Component Boundaries and Contracts

### Launcher input

The public shape remains one package and one binary:

```sh
npx --yes @mateuszrapacz/maister@2.2.1 install --target codex
npx --yes @mateuszrapacz/maister@latest update --target cursor
npx --yes @mateuszrapacz/maister@2.2.1 status --target kiro-cli --json
```

The npm package selector is the release selector. The launcher may expose a normalized internal `requested_version`, but must reject conflicting version inputs rather than choosing one silently. Target is always explicit and is validated before network or filesystem work.

### Verified release descriptor

The resolver/verifier boundary should produce one immutable descriptor conceptually equivalent to:

```json
{
  "requested_version": "latest",
  "resolved_version": "2.2.1",
  "release_tag": "v2.2.1",
  "target": "codex",
  "asset_name": "maister-codex.tar.gz",
  "asset_sha256": "<sha256>",
  "source_commit": "<full-commit>",
  "source_version": "2.2.1",
  "source_content_hash": "<sha256>",
  "e3_attestation_digest": "<sha256>"
}
```

No downstream component may substitute any of those fields. `requested_version` preserves user intent; all other fields are immutable resolved evidence.

### Delegation contract

For `install` and `update`, the launcher invokes the extracted installer with the selected lifecycle command, explicit `--target`, `--source local:<temporary-root>`, and the archive's validated E3 evidence path if the installer contract requires it. Source manifest values must agree with the verified descriptor and ultimately appear in the published receipt.

For state-only commands, the launcher delegates without downloading a release payload. `status`, `verify`, `uninstall`, `rollback`, and `recover` use the installed state contract and explicit target; they must not become dependent on GitHub availability merely because they are invoked through npx.

## Lifecycle Flows

### Install and update

```text
parse command/target/package selector
  -> resolve exact release identity
  -> select allowlisted target asset
  -> create private temp root
  -> download bounded archive + metadata
  -> verify digest and release bindings
  -> inspect archive without extraction
  -> safely extract and revalidate topology
  -> validate .maister-source.json and embedded E3
  -> display/emit resolved provenance
  -> delegate install|update to maister-install.mjs
  -> forward installer result exactly
  -> cleanup temp root
```

Every failure before delegation produces zero host-state mutation. After delegation starts, the launcher never attempts compensating writes; the installer's journal, rollback, and recovery protocol owns the outcome.

### Status and verify

The launcher validates the command and target, then invokes the installed lifecycle entry point against the existing state root. It does not resolve `latest`, fetch release assets, or compare against a network release. `status` reports current receipt/state. `verify` applies the installer's receipt, inventory, managed-settings, provenance, and drift checks. If a future remote-update check is added, it must be a separately named read-only operation.

### Uninstall

The launcher delegates directly. The installer reads the active receipt, detects drift, snapshots or journals as required, removes only receipt-owned files and managed settings, verifies the result, and preserves unmanaged content. The launcher must not pre-delete a downloaded package, host path, lock, or receipt.

### Rollback

The launcher delegates to the existing rollback contract for the explicit target. It preserves installer output and codes, especially drift (`5`), lock (`6`), transaction/recovery (`7`), and integrity (`8`). It does not infer which receipt or backup is safe and does not loop on failure.

### Recover

Recovery operates entirely on durable installer state after the competing process has stopped. The launcher must work without GitHub, preserve journal and backup paths in output, and never “recover” by deleting a lock or state directory. A code `7` remains unresolved operator-visible state until the installer reports successful recovery and verification.

## Exact and `latest` Release Resolution

### Exact version

For npm package version `X.Y.Z`, resolution is strict:

1. Require a matching GitHub release tag `vX.Y.Z`.
2. Require exactly one allowlisted asset for the target.
3. Require release metadata and embedded source version to equal `X.Y.Z`.
4. Require the source commit and content hash to agree across release metadata, source manifest, E3, and installer receipt.
5. On any absence or mismatch, stop. Never fall back to `latest`, another tag, a prerelease, or source checkout.

### `latest`

`latest` resolves the npm dist-tag to a concrete package version before the binary runs. The launcher treats its own package version as the expected exact GitHub version, then confirms a matching published GitHub release. It prints a human-readable resolution line before delegation and includes the same fields in structured output:

```text
Resolved latest -> 2.2.1 (v2.2.1), target codex, asset maister-codex.tar.gz
```

The resulting receipt already records immutable source version and commit through the installer. The launcher output additionally records `requested_version: latest` and `resolved_version: 2.2.1`, so terminal logs explain why that exact payload was selected. The launcher must not query GitHub's independently moving “latest release” and select a version different from its own npm package; npm/GitHub skew is a release-integrity failure.

## Verification and Safe Extraction

Verification is layered and fail-closed:

1. **Input policy:** target, command, version, repository, and asset name are closed-set or strict-format values.
2. **Transport policy:** HTTPS only; expected GitHub hosts; bounded redirects; successful status; known content type where reliable; timeout and maximum bytes enforced while streaming.
3. **Release policy:** release is published, non-draft, non-prerelease for stable selectors; tag/version and selected asset are unique and aligned.
4. **Digest policy:** locally computed SHA-256 equals release `SHA256SUMS`/provenance entry and, when available, GitHub asset digest. A disagreement between observations fails; no source is silently preferred.
5. **Archive policy before extraction:** reject absolute/drive/UNC paths, empty or `.`/`..` segments, NULs, backslash ambiguity, duplicate or case-colliding paths, devices/FIFOs/sockets, hard links, unsafe symlinks, unexpected ownership/mode bits, excessive entry count, excessive file or expanded total size, and an unexpected top-level layout.
6. **Extraction policy:** create a unique private temp directory with restrictive permissions; never follow pre-existing links; never overwrite an existing entry; keep every resolved output path under the extraction root.
7. **Tree policy after extraction:** require exactly one expected installer path, selected target overlay, `.maister-source.json`, and E3 attestation; reject forbidden sibling payloads and topology drift.
8. **Source policy:** validate full source commit, source version, and content hash; bind all three to release metadata and the exact package version.
9. **Evidence policy:** E3 must parse, be `passed`, be fresh, and bind source commit/version, portable-core hash, and artifact digest as required by the existing installer.

The extraction library/tool is an implementation choice gated by these behavioral tests. Shelling out is acceptable only if argument passing is non-shell, binary versions/capabilities are checked, and pre/post inspection still enforces the same policy.

## Temporary Data and Cleanup

- Create one invocation-owned root using the operating system temp facility; set restrictive permissions where supported.
- Put downloads, sidecars, inspection output, and extracted files only below that root.
- Use unpredictable names and exclusive creation; do not reuse a global cache for the first release.
- Register cleanup immediately after creation and execute it in `finally` for success, verification failure, delegated failure, timeout, and signal paths.
- Cleanup only the exact validated invocation root. Never recursively delete a home directory, workspace, target root, or installer state root.
- If cleanup fails, preserve the primary installer result, add a warning with the exact temporary path, and leave manual deletion to the operator. Cleanup failure must not trigger host rollback.
- Do not log archive contents that may expose local paths. Do not retain credentials, authorization headers, or GitHub tokens in files or JSON output.

## Errors, JSON, Signals, and Exit Codes

The launcher has two phases:

- **Before delegation:** return a stable launcher error envelope with phase, typed kind, target, requested/resolved version when known, asset when known, retryability, and no receipt/journal claim. Usage errors use code `2`; implementation must allocate release/download/archive failures without colliding ambiguously with the installer's documented meanings or clearly namespace their `error.kind` while using the closest existing code.
- **After delegation:** installer stdout, stderr, JSON envelope, receipt/journal paths, and exit status are authoritative. Do not wrap, flatten, rewrite, or convert a non-zero status to success.

The established installer codes remain:

| Code | Meaning | Launcher behavior |
|---:|---|---|
| 0 | success | Forward success and resolved-release context. |
| 2 | usage/settings format | Forward; do not retry. |
| 3 | source resolution | Forward; exact selection must not fall back. |
| 4 | overlay/materialization/provenance/evidence validation | Forward; no alternate asset. |
| 5 | drift conflict | Forward; operator decision required. |
| 6 | lock busy | Forward; no blind retry loop. |
| 7 | transaction/recovery | Forward receipt/journal/state guidance; preserve state. |
| 8 | integrity | Forward; stop and investigate. |

With `--json`, stdout must contain machine-readable output only. Resolution/progress diagnostics go to stderr or are incorporated into a documented launcher envelope before delegation; the implementation must choose one composable contract and fixture it. Without `--json`, show the resolved version, tag, target, asset, digest, source commit, and final receipt/journal path when available.

Forward `SIGINT`/`SIGTERM` to the child, wait for its terminal status, then clean temporary data. The launcher must not report success if it was interrupted or if the child was terminated by signal.

## npm and GitHub Publishing Alignment

The release is one logical unit even though it uses two registries:

```text
clean vX.Y.Z tag
  -> core/parity/E3/release-package gates
  -> build all three deterministic archives from one commit
  -> generate and verify SHA256SUMS, SBOM, PROVENANCE
  -> publish GitHub Release vX.Y.Z
  -> verify public assets and metadata
  -> npm pack + fixture smoke for @mateuszrapacz/maister@X.Y.Z
  -> publish npm X.Y.Z with public access/provenance policy
  -> public npx smoke for exact version, then move latest dist-tag
```

Required alignment invariants:

- npm `package.json.version = X.Y.Z` and GitHub tag `vX.Y.Z`;
- package repository/bugs/homepage metadata points to `mateuszrapacz/maister`;
- all target archives bind one source commit/version and identical E3 bytes;
- the launcher has no mutable default-branch URL and no arbitrary repository override;
- `latest` dist-tag moves only after the matching GitHub release and exact-version public smoke pass;
- retries never rebuild bytes under an already published version; npm and GitHub versions are immutable.

If npm publication fails, leave the verified GitHub release available but do not move `latest`; retry the same package bytes/version. If post-publication smoke reveals mismatch, block promotion, deprecate the affected npm version with actionable text where appropriate, and publish a new patch version rather than replacing immutable artifacts.

## Security and Trust Model

### Trusted inputs and trust anchors

- The installed npm package supplies launcher code and its concrete package version.
- GitHub HTTPS/API and release asset delivery supply payload bytes and metadata.
- Repository-owned release policy supplies the target allowlist, expected topology, manifest schema, and E3 validation rules.
- The local OS/user boundary protects npm cache, temp data, and installer state from untrusted same-user or privileged writers only to the extent the operating system permits.

### Threats addressed

- Wrong target or arbitrary asset selection: closed allowlist.
- Version substitution/skew: npm version, GitHub tag, source manifest, provenance, and receipt binding.
- Corruption or inconsistent metadata: local digest plus independent release observations.
- Archive traversal/link/type bombs: inspect-before-extract, bounded extraction, and post-extraction topology validation.
- Partial/failed host writes: existing lock, journal, staging, receipt, rollback, and recover protocol.
- Silent moving input: visible and recorded `latest` resolution.

### Residual threats

Current unsigned checksum, SBOM, provenance, and embedded evidence do not independently authenticate the publisher. Compromise of both publication channels or maintainer credentials may produce internally consistent malicious artifacts. Trusted npm publishing, Sigstore/GitHub artifact attestations, signed release metadata, or another publisher trust anchor require a separate decision and threat-model review.

The launcher must avoid privileged execution guidance. Users run as the account that owns the host configuration and state. Tokens are optional for public releases, read from environment only when needed for rate limits, never persisted, and redacted from diagnostics.

## Observability

Each invocation should expose a correlation/run ID and structured phase transitions without telemetry by default:

```text
resolve -> download -> verify_digest -> inspect -> extract -> verify_source -> delegate -> cleanup
```

Human output reports selector, resolved version/tag, target, asset, digest, source commit, delegated command, result code, and receipt/journal paths. JSON exposes the same stable fields and a typed failure phase. Durations and byte counts may be included for diagnosis, but URLs must be normalized and credentials redacted.

No remote analytics are required. npm/GitHub download logs are external channel observability; local launcher logs remain terminal-scoped unless the user redirects them. Installer receipt/journal evidence remains the authoritative audit trail for host mutation.

## Compatibility

- **Hosts:** only `codex`, `cursor`, and `kiro-cli`; no aliases or implicit detection in the baseline.
- **Platforms:** implementation and CI must cover supported Node environments on Linux, macOS, and Windows, including path case, separators, symlink permissions, long paths, temp permissions, and child-process signaling differences.
- **Node:** ESM and built-in APIs are preferred; the engine floor is verified during implementation and then declared in `engines.node`, documentation, and CI matrix. Node 22 is the current release-CI reference, not yet the guaranteed minimum.
- **npm clients:** document `npx --yes`/`npm exec` behavior and test against the supported npm major versions. Exact package versions remain stable despite npm cache state.
- **Installer:** delegate to the archive's installer, never a globally installed or launcher's bundled mismatched copy. The package and archive version must match.
- **State schema:** the launcher adds no new host-state schema. Existing receipts and journals stay compatible because the installer remains authoritative.

## Test Strategy

### Unit and contract tests

- Parse all commands, explicit targets, exact/prerelease/latest selectors, `--json`, unknown/conflicting arguments, and target-to-asset mapping.
- Resolve exact and latest package versions; reject missing, duplicate, draft, prerelease, skewed, or mismatched releases/assets.
- Validate stable launcher JSON and error kinds; verify child stdout/stderr/status/signal forwarding.
- Test temp-root creation and cleanup on every failure phase, including cleanup failure reporting.

### Adversarial archive tests

- Absolute, drive, UNC, `..`, backslash-confused, NUL, duplicate, and case-colliding paths.
- Symlink/hardlink traversal, special files, nested archive surprises, unsafe modes, excessive entry count, per-file size, expanded size, and compression-ratio limits.
- Missing/duplicate installer, source manifest, overlay, or E3; unexpected top-level and cross-target content.
- Digest, source commit/version/content hash, portable-core hash, artifact digest, E3 freshness/result/schema, and metadata disagreement failures.

### Transactional integration tests

- For every pre-delegation failure, prove host target, managed settings, and state are absent or byte-exact unchanged.
- Fixture-based install/update/status/verify/uninstall for all three targets through the real extracted installer with isolated home and state roots.
- Inject drift, lock contention, transaction failure, rollback failure, and recovery; assert exact forwarding of codes `5–8`, JSON, receipt, and journal paths.
- Interrupt during download, verification, and delegated transaction; assert safe cleanup and installer-owned recovery state.

### Release tests

- `npm pack` contents allow only launcher/package metadata and exclude target payloads/secrets/workspace files.
- Build each target archive twice and preserve current deterministic hash, isolation, E3, metadata, and extracted lifecycle tests.
- Assert npm version, GitHub tag, all archive manifests, source commit/version, and E3 bytes align.
- Smoke exact-version `npx` against a local registry or packed tarball, then a public canary/exact release in isolated environments. Promote `latest` only after exact smoke succeeds.

The acceptance gate includes existing `make validate`, core/parity/release-package tests, and the new launcher suites. Risk-heavy rejection tests must prove byte-exact state and topology preservation, matching the repository testing standard.

## Rollout

1. **Contract fixtures:** freeze launcher CLI, target map, release descriptor, JSON/error semantics, and malicious archive corpus. Confirm the Node engine floor.
2. **Local package:** implement the dependency-light launcher and verify with `npm pack` plus mocked GitHub fixtures; no public publication.
3. **End-to-end staging:** run real archive verification and all lifecycle commands against isolated homes/state roots for three targets and supported operating systems.
4. **Release pipeline alignment:** add version/commit/E3 parity gates and publication ordering. Exercise a non-`latest` canary or prepublication registry path.
5. **First public exact release:** publish matching GitHub assets and npm exact version, run public exact-version smoke, document integrity limitations and recovery guidance.
6. **Promote convenience:** move npm `latest` only after exact smoke. Monitor install failures and publication skew; rollback the dist-tag if needed without replacing artifacts.
7. **Follow-up decision:** evaluate trusted npm publishing and stronger release signing/attestation separately, informed by actual publisher operations.

Rollback of the distribution channel means moving or withholding the npm `latest` dist-tag and publishing a fixed patch; it does not delete user host state. Installed environments continue to use the existing installer rollback/recover lifecycle.

## Integration with Existing Installer and State

The launcher reuses the existing contract instead of changing it:

| Existing capability | Integration rule |
|---|---|
| `cli-contract.mjs` commands and target validation | Launcher accepts the same seven lifecycle commands and same three target IDs, then delegates. |
| `source-resolver.mjs` local source | Install/update pass the verified extraction as `local:<temporary-root>`; no second Git checkout. |
| `.maister-source.json` | Launcher prevalidates release identity; installer validates source provenance again. |
| E3 attestation | Launcher verifies presence/schema/freshness/binding before delegation; installer remains authoritative and records evidence. |
| Materializer and overlay selection | Archive's canonical source and selected same-source overlay are materialized by the installer. |
| Lock/journal/staging/backup | Launcher never opens or edits these paths. |
| Receipt and managed settings | Installer publishes and verifies them; launcher reports paths but does not amend content. |
| Drift/rollback/recovery | Existing codes and operator runbook pass through unchanged. |
| State root | Remains `$XDG_STATE_HOME/maister/<target>` or `~/.local/state/maister/<target>`; launcher state is temporary only. |

The receipt's source version, resolved commit, and content hash are the durable installed record. `latest` resolution context is terminal/JSON evidence from the launcher; if future audit requirements demand durable storage of `requested_version: latest`, that field should be added through a versioned installer receipt decision rather than an npm-side sidecar.

## Success Criteria

1. Exact `npx` install/update for all three targets resolves only the matching `vX.Y.Z` release and allowlisted archive.
2. `latest` prints and emits the concrete package/release version before mutation, and the final receipt binds the same source version and full commit.
3. Every digest, archive, manifest, source, and E3 rejection occurs before installer delegation and leaves host/state bytes and topology unchanged.
4. The launcher never writes host targets, managed settings, receipts, journals, backups, locks, or persistent launcher state.
5. All seven lifecycle commands preserve existing installer JSON, exit codes, receipt/journal paths, rollback, and recovery behavior; state-only commands work offline.
6. npm package version, GitHub tag, archive source manifests, provenance, and E3 bytes are checked as one release unit before `latest` promotion.
7. Temporary files are removed on success, rejection, child failure, and interruption; cleanup failure is visible and targets only the exact invocation root.
8. The tested Node/npm/platform matrix is documented and enforced by package metadata and CI.

## Traceability

- [Research synthesis](../analysis/synthesis.md)
- [Research report](research-report.md)
- [Solution exploration](solution-exploration.md)
- [Decision log](decision-log.md)
- [Project vision](../../../../../docs/project/vision.md)
- [Project roadmap](../../../../../docs/project/roadmap.md)
- [Technology stack](../../../../../docs/project/tech-stack.md)
- [Architecture](../../../../../docs/project/architecture.md)

