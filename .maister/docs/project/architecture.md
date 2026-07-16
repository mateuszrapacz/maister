# Architecture

## Source and overlays

`plugins/maister/common/` owns portable primitives and common assets, while canonical portable skills/agents remain under the common source tree consumed by Codex and Kiro CLI. Each directory under `plugins/maister/overlays/` is a strict versioned contract for one supported target. An overlay owns native layout, manifests, settings destinations, semantic bindings, required inventory, forbidden vocabulary, and native hashes. Cursor currently carries a behavior-bearing skills projection in its overlay; that is migration debt, not a second intended source of truth.

The public installer resolves a clean local Git checkout, a self-contained archive, or `github:owner/repo`. GitHub resolution uses bounded Git commands to resolve a safe ref to one full commit, creates a temporary detached checkout, verifies `HEAD`, status, and content hash, and selects the target overlay from that same checkout. The materializer validates the selected source and overlay, rejects unsafe paths and collisions, and creates a deterministic same-filesystem staging tree with provenance.

## Installation transaction

The installer acquires a target lock, writes a durable journal, snapshots managed files and settings, commits through staging, verifies integrity, and publishes a receipt. Whole-file ownership is used for dedicated Maister files. Shared settings use narrowly allowlisted managed keys with drift detection. Rollback and recovery restore bytes, modes, symlinks, existence, and topology while preserving unmanaged content. A code-7 result remains an unresolved operational state: preserve the journal and backups, use the recovery command after the competing process has stopped, and verify the resulting receipt before continuing.

The lock serializes cooperating Maister lifecycle processes for the same target and state root; it does not serialize the host application or arbitrary external writers. Receipt-listed inventory and managed settings keys are Maister-owned, while all unlisted content is operator-owned. The transaction assumes the operator stops host/editor/synchronization processes that can mutate those paths and protects the state directory from untrusted same-user or privileged writers. Identity revalidation and drift checks fail supported races closed, but no filesystem protocol can guarantee rollback against a malicious process that replaces files concurrently.

State is separate from workflow state at `$XDG_STATE_HOME/maister/<target>` or `~/.local/state/maister/<target>`.

State contains `active-receipt.json`, `receipts/`, `journals/`, `backups/`, `staging/`, and `install.lock`. Operators should keep directories at `0700` and receipts, lock metadata, journals, and settings snapshots at `0600`. A code-7 recovery or rollback failure requires preserving this state for diagnosis; it is not resolved by deleting the lock or repeatedly retrying rollback.

## Evidence

Compatibility is per capability. E1/E2/E4 are required for each target and E3 is shared. E5/E6 are recorded as `unavailable` when the native executable, authentication, safe probe adapter, or configured versioned scenario is absent. The installer attaches validated baseline and native records to the transaction receipt and evaluates them against the selected release policy. Structural and transactional evidence may permit provisional packaging, but an unavailable record never becomes a semantic pass or a host-native support claim. Evidence must be renewed when its prerequisite becomes available or its host/version/scenario/provenance binding changes.

## Release artifacts

`make package TARGET=<target>` stages the runtime, installer, canonical source, selected overlay, `.maister-source.json`, and one validated E3 record at `plugins/maister/.maister-e3-attestation.json`, then emits a deterministically sorted archive with normalized timestamps and ownership. Release order is `make test-core`, `make generate-e3-attestation E3_RESULT=passed`, strict `make test-parity-release` from a clean checkout, package all targets with the same `E3_ATTESTATION`, and run the extracted lifecycle smoke. A dirty-local parity override is diagnostic only and cannot authorize publication. `tests/platform-independent/release-package.test.mjs` builds each target twice, checks deterministic hashes and target isolation, extracts the archives, and runs install/verify/uninstall. Release CI writes `dist/SHA256SUMS`, `dist/SBOM.cdx.json`, and unsigned `dist/PROVENANCE.json` using commit-pinned GitHub Actions; both SBOM and provenance bind the embedded E3 digest and bytes. These sidecars are reproducibility records, not signatures, publisher authentication, or native E6 evidence. Local `dist/` is disposable and may contain stale artifacts; only archives generated and verified in the same clean release job are publishable.

## Migration boundary

Legacy generated trees and old builders were shadow oracles only. The parity classifier compares semantic bindings, inventory, references, hooks, permissions, symlinks, and topology, and requires zero unresolved differences before cleanup. Legacy host manifests, hooks, marketplace paths, generated projections, and support rows are migration-era history, not part of the current architecture.
