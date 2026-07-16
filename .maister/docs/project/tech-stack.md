# Technology stack

- Markdown, YAML, JSON, TOML, and shell for contracts, documentation, and host-native assets.
- Node.js ESM with built-in modules for schema validation, source resolution, materialization, probing, receipts, journals, and transactions.
- GNU Make for target-aware validation, focused tests, packaging, and install entry points.
- GitHub Actions for core, overlay, evidence, topology, and release validation.
- Git full-commit validation for clean local provenance and a bounded GitHub resolver that performs detached immutable checkouts with source/overlay co-location.
- Node's built-in test runner for fast behavior-focused tests.

The distribution no longer relies on independently maintained generated host trees, marketplace publishing, host-specific builders, or a general workflow DSL. Cursor's checked-in compatibility projection is deterministically derived and drift-checked, with explicit exceptions recorded as migration debt. Runtime state and transaction receipts are filesystem artifacts outside the plugin source. Release tarballs are self-contained deterministic archives with explicitly sorted entries and an embedded source manifest. Release output includes SHA-256 checksums, a CycloneDX artifact SBOM, and an unsigned source/overlay/parity provenance record; those records provide integrity only when obtained through a trusted channel, are not publisher authentication or cryptographic attestations, and do not claim native E6. Release actions are pinned to commit SHAs.
