# Synthesis: npx-based Maister distribution

## TL;DR
Maister already has the core lifecycle needed for safe installation; the missing piece is a distribution adapter, not a second installer.
The recommended design is a public `@mateuszrapacz/maister` npm package with a `maister` binary that resolves a GitHub Release archive and delegates to `maister-install.mjs`.
Exact versions are reproducible; `latest` is a convenience mode that must print and record the resolved release.
The main unresolved risk is publisher trust: current checksums and provenance are unsigned, so they improve corruption detection but do not authenticate the publisher.

## Key Decisions
- Keep GitHub Release archives as the distribution source of truth and npm as a thin launcher.
- Keep `plugins/maister/bin/maister-install.mjs` as the only component allowed to mutate host files/settings.
- Bind target, release version/tag, asset name, archive digest, `.maister-source.json`, and E3 attestation before installation.
- Use `@mateuszrapacz/maister` as the working package name unless npm naming or product considerations require the explicit `-cli` suffix.
- Treat Skillpanel references as distribution metadata migration; treat LICENSE attribution as a separate legal decision.

## Open Questions / Risks
- Decide whether `latest` is acceptable as the default or whether exact version should be required for production usage.
- Define the archive extraction implementation and cross-platform path/symlink/size safeguards.
- Decide whether to add a stronger signed/provenance trust anchor beyond the current unsigned SHA256SUMS and metadata.
- Confirm the npm publishing account, package name, Node engine floor, and trusted publishing setup.
- Planner/gatherer/synthesizer subagents timed out; this synthesis is an orchestrator fallback based on local evidence and official documentation.

## Evidence cross-reference

### Existing installer contract

`plugins/maister/bin/maister-install.mjs`, `cli-contract.mjs`, `source-resolver.mjs`, `e3-attestation.mjs`, and `transaction-manager.mjs` already implement source resolution, full-commit validation, overlay selection, attestation binding, staging, transactional mutation, receipts, journals, drift detection, rollback, and recovery. This is direct codebase evidence, not a proposed behavior.

### Release contract

`Makefile`, `release-interface.mjs`, `release-metadata.mjs`, and `.github/workflows/release.yml` already create deterministic target archives named `maister-<target>.tar.gz` for `codex`, `cursor`, and `kiro-cli` when a `v*` tag is pushed. The workflow smoke-tests extracted archives and publishes `dist/*` to the GitHub Release. The archive records source commit/version/content hash and carries embedded E3 evidence.

### npm contract

Official npm documentation confirms that `npx`/`npm exec` can fetch a remote package, expose its `bin` executable, and run it; `--yes` suppresses the confirmation prompt. A published package requires `package.json`, and a scoped user package can use the `@mateuszrapacz` namespace. The current repository has no root `package.json` or npm binary, so this is a new package boundary.

### Integrity contract

The project documents SHA256SUMS, SBOM, and PROVENANCE as unsigned records. They can detect mismatched bytes when obtained through a trusted release channel, but they do not authenticate the publisher. The wrapper must preserve this wording and should fail closed on mismatched digest, manifest, source commit, version, content hash, or E3 evidence.

## Recommended architecture

```text
@mateuszrapacz/maister (npm / npx launcher)
  ├─ parse lifecycle + target + version
  ├─ resolve exact release or latest release
  ├─ allowlist target → archive filename
  ├─ download archive + verification metadata
  ├─ validate digest, archive paths, manifest, and E3
  ├─ extract into private temporary directory
  ├─ invoke packaged maister-install.mjs
  └─ cleanup and forward JSON/exit code

GitHub Release archives
  ├─ maister-codex.tar.gz
  ├─ maister-cursor.tar.gz
  └─ maister-kiro-cli.tar.gz

Existing transactional installer
  └─ owns host target, settings, receipts, journals, backups, rollback, recovery
```

The wrapper must not write `.codex`, `.cursor`, `.kiro`, receipts, journals, backups, or managed settings itself. It should pass a validated `local:<temporary-root>` and the archive's immutable `source_commit` to the existing installer.

## User experience

Recommended commands:

```sh
npx --yes @mateuszrapacz/maister@latest install --target codex
npx --yes @mateuszrapacz/maister@2.2.1 install --target codex
npx --yes @mateuszrapacz/maister@latest update --target codex
npx --yes @mateuszrapacz/maister@latest status --target codex
npx --yes @mateuszrapacz/maister@latest verify --target codex
npx --yes @mateuszrapacz/maister@latest uninstall --target codex
```

The command should display the resolved release version, tag, target, asset, digest, source commit, and final receipt/journal path. `latest` must not be silent: it is a moving input even though the resolved archive is immutable after selection.

`status`, `verify`, `uninstall`, `rollback`, and `recover` can operate from local installer state and should not download an archive unless the existing lifecycle contract explicitly requires source input. `install` and `update` need the selected archive.

## Release resolution and verification

1. Parse the target from an explicit allowlist: `codex`, `cursor`, `kiro-cli`.
2. Parse `--version` as either an exact semantic release version or `latest`.
3. For an exact version, resolve only tag `v<version>` and expected asset `maister-<target>.tar.gz`.
4. For `latest`, query published GitHub releases, exclude drafts/prereleases unless explicitly requested, then record the resolved tag.
5. Download the expected archive and verification metadata with bounded timeout, response-size, and status checks.
6. Compare archive SHA-256 with the selected release evidence. Optionally compare GitHub's asset digest as a second observation.
7. Inspect the archive listing before extraction; reject absolute paths, `..` segments, unexpected symlinks, and unexpected top-level shape.
8. Extract into a private temporary directory.
9. Read `plugins/maister/.maister-source.json` and verify source commit, source version, and content hash.
10. Verify embedded E3 attestation freshness and binding to the same source/artifact.
11. Invoke `maister-install.mjs` only after all checks pass.

The wrapper should never fall back from an exact version to `latest`, the default branch, or `github:owner/repo` source checkout.

## Failure and cleanup behavior

- Network/status/timeout/size/digest/manifest/E3 errors stop before target mutation.
- Installer error codes and JSON are forwarded unchanged; codes 5–8 must not be retried blindly.
- Temporary archive and extraction roots are created per invocation and cleaned in `finally` paths.
- Cleanup failure must not trigger deletion or rollback of the installed target; report the temporary path for operator cleanup.
- The wrapper should use an isolated temp root, never a user home or host plugin root.
- If the installer returns a transaction/recovery failure, preserve and report the receipt/journal/state paths according to the existing runbook.

## Required implementation slices

1. Add npm package metadata and `bin/maister` launcher under the `mateuszrapacz` scope.
2. Add release resolver with exact/latest modes and target asset allowlist.
3. Add bounded downloader and archive verifier/extractor.
4. Add adapter invocation tests using fixture archives and isolated home/state directories.
5. Add release/CI publishing for npm package, ideally after GitHub Release validation succeeds.
6. Update README/operator docs and remove stale Skillpanel distribution references.
7. Decide legal handling of the LICENSE attribution separately.

## Validation strategy

- Unit-test CLI parsing, target/asset mapping, exact/latest resolution, and error envelopes.
- Test network failure, redirect/status failure, timeout, oversized response, bad checksum, bad GitHub digest, invalid archive paths, symlinks, and cleanup.
- Test source manifest commit/version/content-hash mismatch and E3 missing/stale/failed/mismatched attestation tests.
- Test that every pre-install failure leaves target and settings byte-identical.
- Test successful install/update/verify/status/uninstall for each supported target from extracted fixture archives.
- Run existing `make validate`, core/install/release package tests, and a fixture-based npx smoke with isolated home/state roots.
- Publish a canary package or use a local npm pack/exec test before the first public release.

## Confidence and gaps

Confidence is high for the architecture boundary and release asset contract because they are directly implemented and tested locally. Confidence is medium for npm publishing/CLI details until a package is scaffolded and exercised against the intended npm account. Confidence is medium-to-low for the final publisher trust model because the current release metadata is intentionally unsigned.
