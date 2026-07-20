# Research report: npx-based Maister distribution

## TL;DR
Add a thin public `@mateuszrapacz/maister` npm launcher and keep GitHub Release archives as the distribution source of truth.
The launcher should resolve the target/version, download and verify `maister-<target>.tar.gz`, extract it privately, and delegate to the existing transactional installer.
This enables `npx --yes @mateuszrapacz/maister@latest install --target codex` without manual extraction or a second host installer.
Exact versions are reproducible; `latest` is convenience-only and must report its resolved release.

## Key Decisions
- Use GitHub repository `mateuszrapacz/maister` and npm user scope `@mateuszrapacz`.
- Prefer package name `@mateuszrapacz/maister`, with binary `maister`.
- Keep `maister-install.mjs` as the only target mutation authority.
- Validate target, release asset, archive digest, source manifest, and E3 attestation before invoking installation.
- Treat Skillpanel references as distribution metadata to migrate; treat LICENSE attribution as a separate legal decision.

## Open Questions / Risks
- Whether `latest` should be the default for convenience or whether exact versions should be required in production instructions.
- How to implement cross-platform archive extraction with safe path, symlink, size, and ownership checks.
- Unsigned checksums/provenance improve integrity checking but do not authenticate the publisher.
- The repository currently lacks npm package metadata and an npx entrypoint.

## Executive answer

Yes, the project can be reduced to a one-command release installation with `npx`, but `npx` should be an invocation mechanism rather than the place where plugin files are installed. The existing release archive and transactional installer already provide the stronger boundaries:

```text
npx package → GitHub Release archive → existing installer → host target
```

The npm package should be small and stateless. It should hide network download, checksum validation, archive extraction, and source-manifest handling. It should then invoke the archive's copy of `plugins/maister/bin/maister-install.mjs` with a temporary `local:` source.

This keeps the existing receipt, journal, lock, drift, rollback, recovery, and settings ownership model intact.

## Current project evidence

The repository has one common source plus explicit host overlays. `plugins/maister/bin/release-interface.mjs` packages a selected target, while `.github/workflows/release.yml` runs on `v*` tags and publishes `maister-codex.tar.gz`, `maister-cursor.tar.gz`, and `maister-kiro-cli.tar.gz` with shared source commit/version and E3 evidence.

`plugins/maister/bin/maister-install.mjs` resolves a local archive or immutable Git source, selects the overlay from that same source root, validates E3, materializes a staging tree, and executes a journaled transaction. The Codex target root is `.codex/plugins/local/maister`; state is stored separately under `~/.local/state/maister/codex` unless `XDG_STATE_HOME` is set.

The current repository does not contain a root `package.json` or npm `bin` entrypoint. Adding one thin launcher package is therefore a new distribution boundary, not a migration of an existing npm runtime.

## Proposed command surface

```sh
# Moving convenience mode
npx --yes @mateuszrapacz/maister@latest install --target codex

# Reproducible mode
npx --yes @mateuszrapacz/maister@2.2.1 install --target codex

# Lifecycle commands
npx --yes @mateuszrapacz/maister@latest update --target codex
npx --yes @mateuszrapacz/maister@latest status --target codex
npx --yes @mateuszrapacz/maister@latest verify --target codex
npx --yes @mateuszrapacz/maister@latest uninstall --target codex
```

The target should remain explicit because the same package serves three hosts. A future convenience default may detect Codex, but implicit host selection should not override an explicit `--target`.

The launcher should print resolved version/tag, target, archive, digest, source commit, and receipt/journal paths. It should forward the existing installer's JSON envelope and exit code rather than inventing incompatible lifecycle semantics.

## Release resolution

For an exact version `2.2.1`, the launcher should use the `v2.2.1` release and the allowlisted asset:

```text
codex    → maister-codex.tar.gz
cursor   → maister-cursor.tar.gz
kiro-cli → maister-kiro-cli.tar.gz
```

For `latest`, it should resolve the latest published non-draft/non-prerelease release, record the resolved tag, and then use the same exact asset rules. It must never silently fall back to the default branch or an arbitrary GitHub checkout.

GitHub exposes release asset names, browser download URLs, sizes, states, and SHA-256 digests through its release APIs. Public assets can be downloaded without authentication. See [GitHub Releases API](https://docs.github.com/en/rest/releases/releases?apiversion=2022-11-28) and [GitHub release assets API](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28).

## Verification and extraction

Before the existing installer runs, the launcher should:

1. validate the target/version arguments;
2. fetch the expected archive and checksum/metadata with bounded timeout and size limits;
3. calculate the archive SHA-256 and compare it with the selected evidence;
4. inspect archive entries and reject absolute paths, traversal segments, unexpected symlinks, and unexpected package topology;
5. extract into a private temporary directory;
6. verify `plugins/maister/.maister-source.json` source commit, source version, and content hash;
7. verify the embedded E3 attestation is fresh and bound to the same source/artifact;
8. invoke `maister-install.mjs` with `--source local:<temporary-root>` and the manifest commit.

The current release docs explicitly warn that SHA256SUMS, SBOM, and PROVENANCE are unsigned and do not authenticate the publisher. The launcher must preserve that limitation in its output/docs. GitHub's asset digest can be an additional observation, but it does not replace the source manifest and E3 binding.

Node's built-in `fetch` and temporary-directory APIs are sufficient for a dependency-light launcher. The final Node engine floor should be tested against the current ESM/runtime APIs; release CI currently uses Node 22.

## Existing installer boundary

The launcher must not directly write:

```text
$HOME/.codex/**
$HOME/.cursor/**
$HOME/.kiro/**
receipts/
journals/
backups/
managed settings
```

It must delegate these operations to `maister-install.mjs`, which owns staging, locks, settings merge/drift checks, receipts, journals, rollback, and recovery. Installer codes 5–8 should be surfaced without blind retry. A transaction or recovery failure must preserve and report the state/journal paths according to the existing runbook.

## npm package design

The package needs a `package.json` with a `bin` mapping, for example:

```json
{
  "name": "@mateuszrapacz/maister",
  "version": "2.2.1",
  "type": "module",
  "bin": { "maister": "bin/maister.mjs" },
  "engines": { "node": ">=22" }
}
```

The exact engine floor needs implementation validation. Official npm documentation confirms that a package requires `package.json`, the `bin` field exposes commands to `npm exec`/`npx`, and user-scoped packages use an account-matching namespace. See [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/), [package.json](https://docs.npmjs.com/files/package.json/), [npm scopes](https://docs.npmjs.com/about-scopes/), and [publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

The package should not include all target archive contents. GitHub Release remains the release artifact store and source of truth; npm carries only the launcher and its tested code.

## CI and publishing

Recommended order:

```text
push v<version>
  → validate source and all overlays
  → run parity/core/package/lifecycle gates
  → publish GitHub Release archives
  → publish @mateuszrapacz/maister at matching version
  → run npx smoke test against the public release/package
```

The npm publish should be tied to the same version and source commit as the GitHub Release. A canary `npm pack`/`npm exec` test should run before public publication. Trusted npm publishing/provenance can be considered separately from the current unsigned GitHub sidecars.

## Tests required before implementation is accepted

- target-to-asset allowlist and exact/latest version tests;
- network status, timeout, size, redirect, and cleanup tests;
- checksum/GitHub digest mismatch tests proving no target mutation;
- archive traversal, symlink, topology, and extraction permission tests;
- manifest/source commit/version/content-hash mismatch tests;
- missing, stale, failed, and mismatched E3 tests;
- successful fixture-based install/update/verify/status/uninstall for all supported targets;
- installer error-code forwarding tests;
- isolated-home/state npx smoke test;
- release CI test proving GitHub archive and npm package versions align.

## Ownership migration

The canonical Git remote is already `mateuszrapacz/maister` at `origin`, while `upstream` still references SkillPanel. Distribution-facing references to Skillpanel should be updated in README examples, Codex plugin author/developer metadata, maintained user documentation, npm metadata, and release URL construction. The `LICENSE` copyright attribution should be handled separately because it is a legal decision, not merely a publisher URL.

## Recommendation

Implement the thin `@mateuszrapacz/maister` npx launcher first, without changing the transaction core or target overlays. Make exact version selection and full verification the baseline, then add `latest` convenience resolution. Keep GitHub Release archives authoritative and use the existing installer for every state mutation.

## Sources

### Local

- `plugins/maister/bin/maister-install.mjs`
- `plugins/maister/lib/distribution/cli-contract.mjs`
- `plugins/maister/lib/distribution/source-resolver.mjs`
- `plugins/maister/lib/distribution/e3-attestation.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `plugins/maister/overlays/codex/overlay.yml`
- `plugins/maister/bin/release-interface.mjs`
- `plugins/maister/bin/release-metadata.mjs`
- `Makefile`
- `.github/workflows/release.yml`
- `tests/platform-independent/release-package.test.mjs`
- `tests/platform-independent/installer-transaction.test.mjs`
- `README.md`
- `docs/README.md`
- `.maister/docs/project/architecture.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/global/validation.md`
- `.maister/docs/standards/global/error-handling.md`
- `.maister/docs/standards/testing/test-writing.md`

### External primary documentation

- [npm exec / npx](https://docs.npmjs.com/cli/v11/commands/npm-exec/)
- [npm package.json](https://docs.npmjs.com/files/package.json/)
- [npm scopes](https://docs.npmjs.com/about-scopes/)
- [Publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases?apiversion=2022-11-28)
- [GitHub release assets API](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28)
- [Node.js globals](https://nodejs.org/api/globals.html)
- [Node.js fs](https://nodejs.org/api/fs.html)
