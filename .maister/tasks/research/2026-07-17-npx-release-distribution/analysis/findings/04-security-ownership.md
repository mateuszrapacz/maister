# Finding 04: Convenience requires a bounded, fail-closed release adapter

## TL;DR
The npx wrapper creates a new network and archive boundary, so it must fail closed before the existing installer sees untrusted or mismatched bytes.
At minimum it must bind target, requested/resolved version, allowlisted asset name, archive digest, source manifest commit, and embedded E3 attestation.
Temporary extraction must be private, bounded, path-checked, and cleaned on every exit; the existing installer remains responsible for target drift, receipts, rollback, and recovery.
Ownership migration should update distribution metadata and documentation to mateuszrapacz while treating the legal LICENSE attribution as a separate explicit decision.

## Key Decisions
- Never select assets by arbitrary filename or repository branch; map each supported target to one expected release asset.
- Verify archive bytes before extraction and verify the extracted source manifest/attestation before invoking `maister-install.mjs`.
- Preserve the existing unsigned-metadata limitation in documentation; checksums are integrity evidence, not publisher authentication.

## Open Questions / Risks
- GitHub release assets and `SHA256SUMS` are fetched from the same publisher boundary; an attacker who replaces both can defeat unsigned checksum verification.
- Archive extraction via a system tool needs path traversal, symlink, size, and ownership controls on every supported platform.
- The current `upstream` remote and several files still contain Skillpanel references; incomplete migration could make users fetch the wrong source.
- The wrapper needs an explicit policy for network timeout, retry count, cache reuse, proxy/TLS errors, and cleanup failures.

## Evidence

### Existing validation and provenance

`plugins/maister/lib/distribution/source-resolver.mjs` requires full 40-character commits, rejects unsafe/ambiguous refs, checks clean local/GitHub source state, and hashes source content. `plugins/maister/lib/distribution/e3-attestation.mjs` validates schema, result, freshness, source commit, source version, portable-core hash, and artifact digest.

`plugins/maister/bin/release-metadata.mjs` and the release workflow produce `SHA256SUMS`, `SBOM.cdx.json`, and `PROVENANCE.json`. The project documentation explicitly says these sidecars are unsigned, do not authenticate the publisher, and are trustworthy only through a trusted release channel. The wrapper must not advertise checksum comparison as a signature or publisher-authentication mechanism.

### Threats at the npx boundary

#### Wrong version or target

The wrapper must use an allowlist:

```text
codex   → maister-codex.tar.gz
cursor  → maister-cursor.tar.gz
kiro-cli → maister-kiro-cli.tar.gz
```

The user-selected target must be carried unchanged into the installer. A resolved `latest` version must be displayed and recorded. An exact version must never silently fall back to latest.

#### Archive corruption or substitution

Before extraction:

1. fetch the expected archive and checksum/metadata;
2. enforce response status, content-type where available, maximum byte size, and download timeout;
3. compute SHA-256 over the received archive;
4. compare against the selected release evidence;
5. reject mismatches before extraction.

After extraction:

1. reject absolute paths, `..` traversal, unexpected symlinks, and unexpected top-level shape;
2. read `.maister-source.json`;
3. verify the requested/ref-resolved commit and content hash;
4. verify the embedded E3 attestation binds to the same source and artifact;
5. invoke the existing installer only after all checks pass.

GitHub's release asset API exposes `browser_download_url`, asset name/state/size, and a SHA-256 digest when available. It can provide an additional comparison, but it does not replace the project's source manifest and E3 binding. See [GitHub release assets](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28).

#### Temporary files and cleanup

Use a private directory below the platform temporary root, with restrictive permissions where supported. Keep downloaded archive, checksum metadata, extraction root, and a cleanup status in one operation scope. Cleanup runs in a `finally` path and should report a warning/error if it cannot remove a temporary directory, without deleting or modifying the installed target tree.

Do not reuse an arbitrary existing directory and do not extract directly into `$HOME`, `$HOME/.codex`, `$HOME/.cursor`, or `$HOME/.kiro`.

#### Installer races and drift

The wrapper should stop at the installer boundary and let the existing lock/journal/drift/recovery protocol handle target mutations. It must not retry an installer code 5/6/7/8 blindly. It should preserve the installer's JSON error envelope and tell the user which state/journal path to preserve.

### Ownership migration

The canonical Git remote is already `mateuszrapacz/maister` at `origin`; `upstream` still points to `SkillPanel/maister`. Distribution identity should be updated in:

- `README.md` GitHub source examples;
- `plugins/maister/overlays/codex/assets/plugin.json` author/developer metadata;
- stale user-guide examples under `.maister/tasks/` if those documents are maintained;
- npm package metadata and release URL construction.

The repository's `LICENSE` contains a copyright attribution to Marek Kaluzny/SkillPanel. That is a legal attribution and must not be changed automatically as part of a publisher/URL migration; it needs an explicit ownership/legal decision.

### Required tests

- unit tests for target-to-asset mapping and exact/latest version parsing;
- download status, timeout, size, and retry tests;
- checksum/digest mismatch tests that prove no extraction and no target mutation;
- archive traversal/symlink/topology rejection tests;
- manifest commit/version/content-hash mismatch tests;
- E3 missing, stale, failed, and mismatched attestation tests;
- cleanup tests on success, download failure, validation failure, and installer failure;
- end-to-end tests that invoke the wrapper against local fixture archives and verify installed target receipts;
- release CI test that publishes or stages a fixture package and exercises the exact npx command with an isolated home/state root.

## Sources

- `plugins/maister/lib/distribution/source-resolver.mjs`
- `plugins/maister/lib/distribution/e3-attestation.mjs`
- `plugins/maister/lib/distribution/path-safety.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/bin/release-metadata.mjs`
- `.github/workflows/release.yml`
- `.maister/docs/standards/global/error-handling.md`
- `.maister/docs/standards/global/validation.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/testing/test-writing.md`
- `plugins/maister/overlays/codex/assets/plugin.json`
- `README.md`
- `LICENSE`
- [GitHub REST API — Release assets](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28)
