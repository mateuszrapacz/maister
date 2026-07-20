# Finding 02: Release archives already expose the needed target/version contract

## TL;DR
The release workflow is tag-driven: pushing `v*` validates the repository, packages Codex/Cursor/Kiro archives, smoke-tests extracted installs, and publishes `dist/*` to the GitHub Release.
Each archive is target-specific but records the same source commit/version and portable-core evidence contract.
The npx launcher can therefore select an asset deterministically by `<tag>/<target>` without reproducing build logic.
The release package is the correct distribution source; the npm package should remain a thin launcher rather than a second package builder.

## Key Decisions
- Use `mateuszrapacz/maister` release tags and the existing asset names `maister-codex.tar.gz`, `maister-cursor.tar.gz`, and `maister-kiro-cli.tar.gz`.
- Resolve exact versions from release tags such as `v2.2.1`; support `latest` only as a convenience mapping to the latest published release.
- Verify the selected archive against release metadata before invoking the installer.

## Open Questions / Risks
- The workflow publishes unsigned `SHA256SUMS`, SBOM, and provenance sidecars; the wrapper can detect corruption but those sidecars do not authenticate the publisher by themselves.
- The release workflow currently uploads every `dist/*` file, so the wrapper should allowlist expected asset names rather than trust arbitrary release assets.
- GitHub asset metadata now exposes a digest field, but the project still needs a policy for comparing it with `SHA256SUMS` and the archive's embedded manifest.

## Evidence

### Build and package commands

`Makefile` defines `make package TARGET=<target>` as the target-aware package entrypoint. `plugins/maister/bin/release-interface.mjs` copies the runtime, installer, canonical source, and selected overlay into a staging directory, embeds `.maister-source.json` and an E3 attestation, then emits a deterministic `maister-<target>.tar.gz` archive.

The package manifest binds:

```text
source_commit
source_version
content_hash
```

The package test builds each target twice with fixed timestamps and checks byte-for-byte determinism, target isolation, embedded manifest/E3 integrity, and extracted install/verify/uninstall behavior (`tests/platform-independent/release-package.test.mjs`).

### GitHub Release workflow

`.github/workflows/release.yml` runs on:

```yaml
on:
  push:
    tags: ["v*"]
```

The workflow uses Node 22, runs `make validate`, `make test-parity-release`, and `make test-core`, generates one E3 record bound to `$GITHUB_SHA` and the version without the `v` prefix, then packages all three targets with that same attestation.

It then:

1. smoke-tests all extracted archives;
2. writes `SHA256SUMS` for `maister-*.tar.gz`;
3. writes `SBOM.cdx.json` and `PROVENANCE.json`;
4. uploads `dist/*` as a workflow artifact;
5. publishes `dist/*` to the GitHub Release for the pushed tag.

This means the wrapper can use a stable URL shape:

```text
https://github.com/mateuszrapacz/maister/releases/download/v<version>/maister-<target>.tar.gz
```

The release archive itself contains the installer and selected source, so the wrapper need not clone the repository or depend on the source checkout after download.

### Official GitHub behavior

GitHub's release API exposes a `browser_download_url` for each asset, and public release assets can be downloaded without authentication. The API response also exposes the asset name, size, state, and a SHA-256 digest when available. See [GitHub release endpoints](https://docs.github.com/en/rest/releases/releases?apiversion=2022-11-28) and [release asset endpoints](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28).

For this project, a direct browser download URL is sufficient for public releases; the API is useful when the wrapper needs to discover the latest release or validate the expected asset list.

### Version resolution recommendation

Support two explicit modes:

```text
--version 2.2.1  → tag v2.2.1, exact reproducible asset
--version latest  → resolve the latest non-draft/non-prerelease release, then record the resolved version
```

The wrapper should report the resolved version, tag, asset name, SHA-256, source commit, and installer receipt path. It should not use the repository's default branch as a substitute for a release archive.

## Sources

- `Makefile`
- `plugins/maister/bin/release-interface.mjs`
- `plugins/maister/bin/release-metadata.mjs`
- `.github/workflows/release.yml`
- `tests/platform-independent/release-package.test.mjs`
- `README.md`, Packaged archive lifecycle and provenance
- `docs/README.md`, Package verification
- [GitHub REST API — Releases](https://docs.github.com/en/rest/releases/releases?apiversion=2022-11-28)
- [GitHub REST API — Release assets](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28)
