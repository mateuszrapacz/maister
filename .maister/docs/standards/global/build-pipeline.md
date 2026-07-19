# Build pipeline

`plugins/maister/common/`, canonical portable skills, and `plugins/maister/overlays/` are distribution inputs. There are no independently maintained generated target trees and no host builder that rewrites a second source of truth. Cursor's checked-in compatibility projection is a deterministic, drift-checked migration exception; its source mappings, transformations, exclusions, and preserved exception hashes must remain explicit until the projection is removed.

Use the target-aware entry points:

```sh
make test-core
make test-runtime
make test-overlay TARGET=codex
make test-materializer TARGET=cursor
make test-install TARGET=kiro-cli
make test-evidence
make test-parity-release
make test-topology
make validate
make package TARGET=codex
```

`make validate` loops over `codex`, `cursor`, and `kiro-cli` before running the common core, evidence, and topology checks. Use the explicit `make test-overlay TARGET=<target>` entry point when diagnosing one overlay.

`test-parity-release` is the reproducible migration/release check: it reconstructs each legacy tree from the reviewed full-commit Git-tree oracle under `tests/fixtures/platform-independent/parity-oracle/manifest.json`, materializes Codex, Cursor, and Kiro CLI from the current checkout, and compares each target with its versioned baseline. No external legacy root is accepted. Rules contain exact paths (or a constrained pattern), immutable side observations, an observed category, and a rationale; the CLI never learns exceptions from its current output. Executable and sensitive permission differences cannot be waived. The release gate must run from a clean checkout; `E_SOURCE_DIRTY` blocks publication. `PARITY_ALLOW_DIRTY_LOCAL=1` is a development-only diagnostic option, is not used by release CI, and can never substitute for the strict result.

Before release, validate the common core, every overlay, evidence policy, topology, the strict three-target parity gate, package contents, and a clean extracted-archive lifecycle for Codex, Cursor, and Kiro CLI. Run `make test-core`, then `make generate-e3-attestation E3_RESULT=passed` with an explicit source version and deterministic source-date epoch. Pass the generated file as `E3_ATTESTATION` to all three `make package` invocations; the package validator checks its schema, freshness, commit/version binding, and portable-core digest before embedding it at `plugins/maister/.maister-e3-attestation.json`. Archive input paths are explicitly sorted. The release-package test compares two builds per target; release CI invokes the test against all three produced archives, generates `dist/SHA256SUMS`, `dist/SBOM.cdx.json`, and unsigned `dist/PROVENANCE.json`, binds the E3 digest/bytes in the metadata, and blocks publication if the E3-backed lifecycle is not green. Unsigned sidecars do not authenticate the publisher and are trustworthy only through a trusted release channel. E5/E6 may be unavailable because a runtime, authentication, safe adapter, or scenario is missing; this permits only explicitly provisional claims and never a native semantic pass.

Treat `dist/` as disposable output. A release job starts from an empty or isolated output directory and publishes only artifacts generated and verified in that same job. Existing archives, even with expected names, must not be reused; confirm the `plugins/maister/**` package shape, target isolation, extracted lifecycle, checksums, SBOM, provenance, and strict parity before upload.
