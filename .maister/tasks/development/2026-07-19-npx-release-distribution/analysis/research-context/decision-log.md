## TL;DR

Five accepted architecture decisions define the npx distribution path. `@mateuszrapacz/maister` is a thin release launcher; GitHub Release archives are authoritative payloads; exact versions are the reproducible baseline and `latest` is visibly resolved; all archive and provenance checks fail closed before extraction/delegation; and npm/GitHub publication is coordinated as one immutable release unit.

The decisions preserve the project's strongest existing boundary: `maister-install.mjs` remains the sole authority that mutates host files, settings, receipts, journals, backups, locks, and recovery state. The npm package owns only release selection, verified temporary materialization, delegation, result forwarding, and cleanup.

## Key Decisions

- [ADR-001](#adr-001-thin-npm-launcher-and-one-mutation-authority): thin npm launcher; existing installer owns every host mutation.
- [ADR-002](#adr-002-github-release-payloads-and-target-allowlist): GitHub Release archives are authoritative; target-to-asset mapping is closed.
- [ADR-003](#adr-003-exact-version-baseline-and-visible-latest-resolution): exact versions are reproducible; `latest` must resolve visibly and audibly to one exact version.
- [ADR-004](#adr-004-fail-closed-verification-and-safe-extraction): verify release, digest, archive, source manifest, and E3 before delegation.
- [ADR-005](#adr-005-coordinated-publication-and-provenance-handling): publish npm and GitHub artifacts as one aligned unit while accurately describing unsigned provenance.

## Open Questions / Risks

- The minimum Node engine is verified during implementation; Node 22 is the current CI reference, not yet the final floor.
- The archive safety contract is accepted, but the extraction library/tool remains an implementation choice subject to cross-platform adversarial tests.
- Current integrity records do not authenticate the publisher. Trusted publishing, signing, and stronger attestations require a follow-up ADR.
- Publication across npm and GitHub is not atomic. CI must define promotion, retry, deprecation, and skew-response procedures.

## ADR-001: Thin npm launcher and one mutation authority

### Status

Accepted

### Context

Maister already has a transactional lifecycle in `plugins/maister/bin/maister-install.mjs`: source resolution, overlay selection, E3 binding, staging, locks, journals, settings ownership, receipts, drift detection, rollback, and recovery. The missing capability is one-command public distribution, not another installer.

Embedding target payloads or reimplementing file copies inside an npm CLI would create a second mutation authority with separate receipts, error semantics, rollback behavior, and host knowledge. Delegating to generic Agent Skills copy/symlink tooling would similarly omit Maister's broader plugin and settings lifecycle.

### Decision Drivers

- Preserve one owner for host state and lifecycle invariants.
- Reuse tested transactional install/update/uninstall/rollback/recover behavior.
- Keep npm package size and responsibility small.
- Avoid semantic drift between manual archive and npx installation.
- Keep status, verify, uninstall, rollback, and recover available without network access.

### Considered Options

1. Publish complete target payloads in npm and implement lifecycle mutation in the launcher.
2. Delegate installation to a generic Agent Skills copy/symlink package.
3. Publish a thin launcher that verifies a release payload and invokes the payload's existing installer.
4. Build host-specific marketplace installers first.

### Decision Outcome

Chosen option: **3**.

Publish public package `@mateuszrapacz/maister` with binary `maister`. Its authority ends at parsing, exact release resolution, target/asset selection, bounded download, verification, safe temporary extraction, delegation, faithful result forwarding, and cleanup.

`maister-install.mjs` remains the only component allowed to write Codex/Cursor/Kiro targets, managed settings, state roots, locks, staging, receipts, journals, or backups. Install/update delegate with a validated `local:<temporary-root>` source. State-only lifecycle commands delegate directly and do not fetch a release.

### Consequences

#### Good

- npx and manual archive paths converge on identical transaction and recovery semantics.
- Existing receipts and state schemas remain authoritative and require no npm-specific sidecar.
- Launcher failures before delegation are easy to prove mutation-free.
- Future distribution channels can reuse the same verified-payload/delegation boundary.

#### Bad

- Node/npm is required for the npx channel.
- The launcher and installer have adjacent CLI/error contracts that need compatibility fixtures.
- The downloaded archive includes installer/runtime content even though npm already delivered launcher code.

#### Neutral / follow-up

- Host-native marketplaces may be added later, but they must hand off to the same mutation authority or define an explicit replacement ADR.

### Evidence and Links

- [Research synthesis — Recommended architecture](../analysis/synthesis.md#recommended-architecture)
- [Research report — Existing installer boundary](research-report.md#existing-installer-boundary)
- [Solution exploration — Thin npx release launcher](solution-exploration.md#1-thin-npx-release-launcher--recommended-now)
- [High-level design — Architecture Style](high-level-design.md#architecture-style)

---

## ADR-002: GitHub Release payloads and target allowlist

### Status

Accepted

### Context

The release pipeline already builds deterministic self-contained archives from a clean tagged commit:

```text
codex    -> maister-codex.tar.gz
cursor   -> maister-cursor.tar.gz
kiro-cli -> maister-kiro-cli.tar.gz
```

Each archive includes canonical source, one selected overlay, the installer, `.maister-source.json`, and embedded E3 evidence. Existing release tests verify deterministic hashes, target isolation, and extracted lifecycle behavior. Duplicating those payloads in npm would establish two artifact sources and increase version-skew risk.

### Decision Drivers

- One authoritative payload per target/version.
- Reuse deterministic archive and release validation already in CI.
- Explicit multi-host selection without unreliable auto-detection.
- Prevent arbitrary URL, repository, asset-name, and cross-target substitution.
- Keep npm as an executable delivery channel rather than an artifact store.

### Considered Options

1. Bundle all three target payloads into the npm package.
2. Build payloads dynamically from the repository default branch.
3. Download arbitrary user-supplied archive URLs.
4. Resolve target-specific archives from matching `mateuszrapacz/maister` GitHub Releases through a fixed allowlist.

### Decision Outcome

Chosen option: **4**.

The launcher resolves only releases from `mateuszrapacz/maister`. The caller must pass exactly one target: `codex`, `cursor`, or `kiro-cli`. A closed mapping selects exactly one archive name. The repository and asset URL are not general public inputs.

The archive is the payload source of truth. npm contains launcher code only. Release metadata, source manifest, and E3 must agree on target-independent source identity; the selected archive must contain only the expected target overlay/runtime topology.

### Consequences

#### Good

- Existing release artifacts and tests become the npx payload contract.
- Cross-target or arbitrary archive installation is rejected before extraction.
- npm package stays small and independent of target payload size.
- Manual and npx installation can refer to the same immutable archive digest.

#### Bad

- Install/update depends on GitHub availability in addition to npm availability.
- Rate limits, proxies, redirects, and CDN behavior become launcher concerns.
- Publishing and retaining GitHub Release assets becomes part of npm package operability.

#### Neutral / follow-up

- A future offline/cache feature requires a separate cache identity, ownership, expiry, and verification design; the baseline uses invocation-local temporary storage.

### Evidence and Links

- [Research synthesis — Release contract](../analysis/synthesis.md#release-contract)
- [Research report — Release resolution](research-report.md#release-resolution)
- [Solution exploration — Recommendation](solution-exploration.md#recommendation)
- [High-level design — Components and Responsibilities](high-level-design.md#components-and-responsibilities)

---

## ADR-003: Exact version baseline and visible `latest` resolution

### Status

Accepted

### Context

An exact npm package version is immutable and reproducible; `latest` is a mutable npm dist-tag resolved before execution. Independently asking GitHub for its “latest release” could select a different version during partial publication or propagation. Silent moving selection would also make incident diagnosis and audit logs ambiguous.

Users still benefit from a convenient `@latest` command, especially for first installation. Convenience is acceptable only if the selected immutable version is made explicit and aligns with the installed receipt.

### Decision Drivers

- Reproducible installation and rollback instructions.
- Clear audit trail from user selector to installed source commit.
- Detection of npm/GitHub publication skew.
- Familiar one-command `npx ...@latest` onboarding.
- No fallback from an unavailable exact release.

### Considered Options

1. Support only `latest` and resolve GitHub's current latest release at runtime.
2. Require exact versions for every use and reject `latest`.
3. Support exact versions and `latest`; treat the running npm package version as the expected exact GitHub version and visibly record the resolution.
4. Allow a separate `--version` to override the npm package version.

### Decision Outcome

Chosen option: **3**.

Exact versions are the reproducible baseline. Package `@mateuszrapacz/maister@X.Y.Z` must resolve only GitHub tag `vX.Y.Z`, then verify archive/source/E3 alignment. `@latest` first resolves through npm to one concrete launcher version; that concrete version is the only acceptable GitHub release version.

Before delegation, human output displays `latest -> X.Y.Z`, tag, target, asset, digest, and source commit. Structured output carries both requested and resolved values. The installer receipt remains the durable record for resolved source version, full commit, and content hash. No mismatch falls back to another version, branch, prerelease, or archive.

### Consequences

#### Good

- Exact commands are replayable and suitable for CI/runbooks.
- `latest` remains easy to use without hiding what was installed.
- npm/GitHub skew is detected as integrity failure rather than silently tolerated.
- Receipt provenance and terminal/JSON resolution evidence can be correlated.

#### Bad

- Documentation must distinguish moving convenience commands from reproducible commands.
- npm dist-tag propagation can briefly differ across caches/registries.
- Persisting the literal requested selector (`latest`) in durable installer state would require a future receipt-schema decision; baseline logs it at the launcher boundary.

#### Neutral / follow-up

- Prerelease channels may later use explicit npm dist-tags and matching GitHub prereleases, but are outside the stable baseline and must never be selected by stable `latest`.

### Evidence and Links

- [Research synthesis — Release resolution and verification](../analysis/synthesis.md#release-resolution-and-verification)
- [Research report — Proposed command surface](research-report.md#proposed-command-surface)
- [Solution exploration — Deferred Ideas](solution-exploration.md#deferred-ideas)
- [High-level design — Exact and latest Release Resolution](high-level-design.md#exact-and-latest-release-resolution)

---

## ADR-004: Fail-closed verification and safe extraction

### Status

Accepted

### Context

The launcher introduces untrusted network bytes and archive extraction before the existing installer can apply its source, materialization, provenance, and transaction checks. Digest validation alone does not prevent path traversal, link escape, special files, decompression bombs, unexpected topology, or a correctly hashed but incorrectly bound payload.

Calling the installer before establishing target, release, asset, digest, archive topology, source manifest, and E3 identity would allow malformed input to reach the mutation boundary. Extracting directly into a host/project path would bypass the transaction system entirely.

### Decision Drivers

- Zero host mutation for release/download/archive verification failures.
- Defense in depth across transport, digest, archive, source, and evidence layers.
- Cross-platform path and filesystem safety.
- Bounded resource use and deterministic cleanup.
- Preserve the installer's own independent validation as the final authority.

### Considered Options

1. Download and immediately extract with the platform's default tar command, then trust the installer.
2. Verify only SHA-256 and delegate the archive path.
3. Inspect and validate every layer before safe private extraction, revalidate after extraction, then delegate a local source.
4. Stream archive entries directly into host targets.

### Decision Outcome

Chosen option: **3**.

The launcher validates command/target/version, published release identity, expected asset, bounded HTTPS download, locally computed digest, release metadata agreement, archive entry safety, expected topology, `.maister-source.json`, and embedded E3 before invoking `maister-install.mjs`.

Archive policy rejects absolute/drive/UNC/traversal/ambiguous paths, duplicates and case collisions, unsafe links and special files, excessive counts/sizes, unsafe modes, and unexpected top-level content. Extraction occurs only in a unique private temp root and is followed by topology and binding revalidation. Cleanup runs in `finally` and may delete only the exact invocation root.

The existing installer repeats source/E3/materialization checks and owns all mutation. No pre-delegation error triggers installer rollback because no host mutation has occurred.

### Consequences

#### Good

- Malicious or malformed archives cannot write directly into host state.
- Verification failures have a simple invariant: target/settings/state are unchanged.
- Multiple independent bindings make accidental release skew visible.
- Cleanup behavior is explicit for success, failure, signal, and partial download.

#### Bad

- Safe cross-platform archive handling is the launcher's largest implementation/test surface.
- Pre-inspection plus extraction can require extra I/O and temporary disk space.
- Strict topology limits must evolve intentionally when release package structure changes.

#### Neutral / follow-up

- The specific archive library or non-shell subprocess is selected during implementation only after it demonstrates the accepted behavioral policy and Node/platform matrix.

### Evidence and Links

- [Research synthesis — Failure and cleanup behavior](../analysis/synthesis.md#failure-and-cleanup-behavior)
- [Research report — Verification and extraction](research-report.md#verification-and-extraction)
- [Solution exploration — Thin launcher risks](solution-exploration.md#1-thin-npx-release-launcher--recommended-now)
- [High-level design — Verification and Safe Extraction](high-level-design.md#verification-and-safe-extraction)

---

## ADR-005: Coordinated publication and provenance handling

### Status

Accepted

### Context

The npx path spans two public channels. npm publishes executable launcher version `X.Y.Z`; GitHub publishes tag `vX.Y.Z`, three target archives, `SHA256SUMS`, SBOM, and `PROVENANCE.json`. The current release records and embedded E3 create strong consistency and reproducibility bindings, but the project explicitly describes the sidecars as unsigned and not publisher authentication.

Publishing channels cannot be updated atomically. If `latest` points to an npm version before matching GitHub assets are public and verified, users receive a broken or skewed installer. Conversely, overstating unsigned provenance as a signature would create a false security guarantee.

### Decision Drivers

- One source commit/version across npm launcher and every target archive.
- Prevent `latest` promotion before public end-to-end verification.
- Preserve immutable, reproducible artifacts and retry safely after partial failure.
- Communicate integrity versus authentication accurately.
- Leave room for trusted publishing/signing without blocking the thin launcher.

### Considered Options

1. Publish npm and GitHub independently and rely on maintainers to align versions manually.
2. Publish npm first and let the launcher wait for any matching GitHub release.
3. Publish and verify GitHub assets first, publish the exact npm version from the same tag/commit, smoke exact npx, then promote `latest`.
4. Block all npx publication until a new signing system is implemented.

### Decision Outcome

Chosen option: **3**.

The release workflow treats npm and GitHub outputs as one logical release. Clean-tag validation, parity/E3/package tests, deterministic archive construction, sidecar verification, and public GitHub asset checks precede npm publication. The npm exact version is packed and smoked before publish; after publish, an exact-version public npx smoke must pass before moving the `latest` dist-tag.

All metadata must agree on version and source commit. A retry reuses identical bytes and version; it does not rebuild an already published version. A broken publication is withheld from `latest`, deprecated where appropriate, and corrected with a new patch.

Documentation and launcher output state that current checksums, SBOM, GitHub digest, provenance, and E3 provide integrity/consistency when obtained through trusted channels but are not independent publisher authentication. Stronger trusted npm publishing, signed release metadata, or attestations are a follow-up ADR.

### Consequences

#### Good

- Users do not receive stable `latest` until the full public chain works.
- Version/source/E3 skew becomes a release-gate failure.
- Partial publication has a defined, recoverable promotion policy.
- Security claims remain accurate and auditable.

#### Bad

- Release automation is longer and must coordinate two services and propagation delays.
- Exact npm versions may exist briefly without being promoted to `latest`.
- Maintainers need permissions, protected environments, and idempotent retry procedures for both channels.

#### Neutral / follow-up

- Stronger publisher identity should be designed separately because it changes credentials, trust roots, incident response, and possibly artifact formats; it is not treated as a small implementation detail.

### Evidence and Links

- [Research synthesis — npm contract and integrity contract](../analysis/synthesis.md#npm-contract)
- [Research report — CI and publishing](research-report.md#ci-and-publishing)
- [Solution exploration — Open Questions / Risks](solution-exploration.md#open-questions--risks)
- [High-level design — npm and GitHub Publishing Alignment](high-level-design.md#npm-and-github-publishing-alignment)

## Decision Summary

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Thin npm launcher and one mutation authority | Accepted |
| ADR-002 | GitHub Release payloads and target allowlist | Accepted |
| ADR-003 | Exact version baseline and visible `latest` resolution | Accepted |
| ADR-004 | Fail-closed verification and safe extraction | Accepted |
| ADR-005 | Coordinated publication and provenance handling | Accepted |

## Supersession and Review Triggers

Revisit these records if any of the following becomes true:

- a host-native marketplace becomes the authoritative mutation/lifecycle owner;
- GitHub Release archives cease to be deterministic self-contained payloads;
- target auto-detection or arbitrary third-party repositories are proposed;
- a persistent launcher cache or durable launcher state is introduced;
- receipt schema must preserve the original moving selector, not just resolved source identity;
- publisher signing/trusted publishing changes the release trust anchor;
- the installer CLI or exit-code contract is versioned incompatibly.

