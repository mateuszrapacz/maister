# Finding 01: Existing installer is the authoritative mutation boundary

## TL;DR
Maister already has the required transactional installation boundary; the npx layer should not copy files into Codex, Cursor, or Kiro paths itself.
The launcher should resolve a release archive into a temporary local source root and call `maister-install.mjs install` with the target, source root, and immutable source commit.
The installer validates the selected overlay, materializes staging, updates only owned target/settings content, verifies integrity, and writes receipts/journals/backups.
The archive's embedded attestation and source manifest are the natural handoff between release download and lifecycle installation.

## Key Decisions
- Keep `plugins/maister/bin/maister-install.mjs` as the sole target mutation authority — this preserves transaction, drift, receipt, rollback, and recovery semantics.
- Make the npx launcher an input adapter: release resolution, download, archive validation, temporary extraction, and cleanup only.
- Pass an extracted release as `local:<temporary-root>` with the `source_commit` read from `.maister-source.json`.

## Open Questions / Risks
- The wrapper must define a safe archive extraction policy before passing any bytes to the installer.
- `status`, `verify`, `uninstall`, `rollback`, and `recover` may not need a network download, while `install` and `update` do.
- The current CLI requires a full source ref and a valid E3 attestation for install/update; the wrapper must preserve those bindings.

## Evidence

### CLI and source resolution

`plugins/maister/bin/maister-install.mjs` parses the lifecycle command, resolves the source, selects the overlay from the same resolved root, loads/validates the E3 attestation, computes the portable-core hash, and binds the attestation to the resolved commit/version/hash before calling `executeLifecycle`.

`plugins/maister/lib/distribution/cli-contract.mjs` accepts only these lifecycle commands:

```text
install, update, status, verify, uninstall, rollback, recover
```

`install` and `update` require `--source`; GitHub sources require an explicit ref and reject short SHAs. The CLI accepts `--attestation`/`--evidence` only for install and update.

`plugins/maister/lib/distribution/source-resolver.mjs` supports `local:` and `github:` sources. A local archive is recognized through `.maister-source.json`; it must match its recorded source commit/content hash. A GitHub source is resolved to one full commit and a detached clean checkout, not to an arbitrary moving branch.

### Codex target contract

`plugins/maister/lib/distribution/targets.mjs` defines Codex discovery as:

```text
.codex/plugins/local/maister
```

`plugins/maister/overlays/codex/overlay.yml` maps common skills, common agents, Codex metadata, and hooks into that root. It separately owns the managed `plugins.maister` key in `.codex/config.toml`. The wrapper must not recreate these mappings.

### Transaction and state

`plugins/maister/lib/distribution/transaction-manager.mjs` stages and validates the selected source before replacing the managed target tree. It acquires a target-scoped lock, writes a durable journal, snapshots managed files/settings, commits through staging, verifies the result, and publishes a receipt.

`plugins/maister/lib/distribution/target-paths.mjs` places lifecycle state under `$XDG_STATE_HOME/maister/<target>` or `~/.local/state/maister/<target>`, including receipts, journals, backups, staging, and the lock.

The target tree and shared settings are not npm-owned. They are Maister-owned only through the receipt-listed inventory and allowlisted settings keys. Unmanaged files and settings must remain untouched.

### Recommended npx handoff

```text
npx CLI
  → resolve target + version
  → download archive and verification metadata
  → validate archive paths and checksum
  → extract to private temporary directory
  → read plugins/maister/.maister-source.json
  → invoke maister-install.mjs install/update
  → verify lifecycle result
  → remove temporary directory
```

For a packaged archive, the installer can auto-discover the embedded E3 record under `plugins/maister/.maister-e3-attestation.json`. The wrapper should pass the archive root and manifest commit; it should not manufacture or rewrite evidence.

### Lifecycle implications

- `install`: download/extract the requested target archive, then invoke the existing installer.
- `update`: resolve a new release archive, preserve unmanaged settings/files, and let installer drift detection decide whether update is safe.
- `status`: read the receipt/state locally; no archive download is required.
- `verify`: verify the active receipt and target locally; optionally accept a source only when the existing CLI requires it for a specific check.
- `uninstall`, `rollback`, `recover`: delegate directly to the installer and do not download a new release.

The npx wrapper should return the installer's JSON envelope and exit code instead of inventing a second result schema.

## Sources

- `plugins/maister/bin/maister-install.mjs`
- `plugins/maister/lib/distribution/cli-contract.mjs`
- `plugins/maister/lib/distribution/source-resolver.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/lib/distribution/target-paths.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `plugins/maister/lib/distribution/e3-attestation.mjs`
- `plugins/maister/overlays/codex/overlay.yml`
- `tests/platform-independent/installer-transaction.test.mjs`
- `README.md`, Installation and lifecycle sections
