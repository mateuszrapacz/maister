# Roadmap

## Current baseline

- One common source with Codex, Cursor, Kiro CLI, and Pi overlays.
- Immutable source and provenance validation.
- Transactional install/update/uninstall/rollback/recovery with receipts and journals.
- Evidence freshness per capability, with explicit unavailable native outcomes.
- Shadow parity and negative topology checks at the migration boundary.
- Bounded immutable GitHub checkout resolution using the same checkout for source and overlay.
- Self-contained deterministic target archives with sorted entries, extracted lifecycle smoke, `SHA256SUMS`, CycloneDX artifact inventory, unsigned reproducibility provenance, and pinned release actions.

## Next release plan — v2.2.2

Release `v2.2.2` is the next patch release after the current `2.2.1` baseline. It is a GitHub-only release; there is no npm or alternate registry publication.

### Included scope

- Keep lifecycle command suggestions host-native: Codex uses `$maister:maister-work`, Cursor and Kiro CLI use `/maister-work`, and Pi uses `/skill:maister-work`.
- Protect the shared `status` and `next` projection with a regression test covering Codex, Cursor, Kiro CLI, and Pi.
- Keep Cursor's checked-in projection regenerated from the canonical lifecycle skills with source fingerprints updated.
- Retain the Codex `0.145.0` E5/E6 bridge and its fail-closed evidence requirements.

### Release gates

- [x] Lifecycle command projection fix and cross-host regression coverage.
- [x] Validate Cursor projection and all four target overlays.
- [x] Verify repository topology and `git diff --check`.
- [ ] Update `package.json`, `package-lock.json`, and `VERSION` to `2.2.2`.
- [ ] Run the complete release validation from a clean checkout, including `make validate`, release policy tests, launcher validation, and deterministic package tests.
- [ ] Generate one passed portable-core E3 attestation and package `codex`, `cursor`, `kiro-cli`, and `pi` with the same attestation bytes.
- [ ] Verify checksums, SBOM, provenance, target admission, and extracted install/verify/uninstall lifecycle evidence.
- [ ] Push the release commit and exact tag `v2.2.2`; never move or reuse an existing release tag.
- [ ] Confirm GitHub publication, exact public bytes, anonymous cross-platform smoke, and final release evidence.

Release publication remains blocked by a dirty checkout, missing or unavailable required evidence, failed deterministic packaging, unresolved transaction/recovery state, or any mismatch between the tag, source commit, package version, and release artifacts.

## Next priorities

- Collect fresh E5/E6 records when native executables, authentication, safe adapters, and versioned scenarios are available; keep missing prerequisites explicit as `unavailable`, never as passed.
- Continue strengthening scenario-level semantic parity and recovery fixtures.
- Keep release packages target-aware without reintroducing committed generated projections; host-native deployment adapters may generate private, receipt-bound handoff state at install time.
- Keep the deterministic portable-core E3 producer and package binding aligned with the portable-core evidence worker; native E5/E6 collection remains environment-dependent and may be provisional.

## Unified projections requirement-to-test inventory

| Requirement | Passing behavior suite(s) |
| --- | --- |
| R1 | `overlay-contract.test.mjs`, `agent-projection.test.mjs` |
| R2 | `agent-ir.test.mjs` |
| R3 | `agent-ir.test.mjs` |
| R4 | `agent-ir.test.mjs`, `agent-projection.test.mjs` |
| R5 | `overlay-contract.test.mjs`, `agent-projection.test.mjs` |
| R6 | `agent-projection.test.mjs`, `agent-resolver.test.mjs`, `repository-topology.test.mjs` |
| R7 | `source-materializer.test.mjs` |
| R8 | `agent-projection.test.mjs`, `source-materializer.test.mjs` |
| R9 | `agent-projection.test.mjs` |
| R10 | `source-materializer.test.mjs` |
| R11 | `agent-projection.test.mjs`, `source-materializer.test.mjs` |
| R12 | `source-materializer.test.mjs`, `target-registry.test.mjs`, `agent-resolver.test.mjs` |
| R13 | `agent-adapters.test.mjs` |
| R14 | `agent-projection.test.mjs`, `evidence-parity-topology.test.mjs` |
| R15 | `agent-projection.test.mjs`, `installer-transaction.test.mjs` |
| R16 | `overlay-contract.test.mjs`, `agent-adapters.test.mjs` |
| R17 | `target-registry.test.mjs` |
| R18 | `installer-transaction.test.mjs`, `target-registry.test.mjs` |
| R19 | `installer-transaction.test.mjs` |
| R20 | `installer-transaction.test.mjs` |
| R21 | `installer-transaction.test.mjs` |
| R22 | `installer-transaction.test.mjs`, `repository-topology.test.mjs` |
| R23 | `agent-resolver.test.mjs` |
| R24 | `agent-resolver.test.mjs` |
| R25 | `agent-resolver.test.mjs`, `agent-adapters.test.mjs` |
| R26 | `agent-resolver.test.mjs`, `agent-adapters.test.mjs` |
| R27 | `agent-execution-events.test.mjs`, `agent-adapters.test.mjs` |
| R28 | `agent-execution-events.test.mjs`, `gate-evaluator.test.sh` |
| R29 | `evidence-parity-topology.test.mjs` |
| R30 | `evidence-parity-topology.test.mjs`, `agent-adapters.test.mjs` |
| R31 | `evidence-parity-topology.test.mjs` |
| R32 | `make-interface.test.mjs`, `parity-release.test.mjs`, `release-package.test.mjs` |
| R33 | `release-package.test.mjs` |
| R34 | `gate-config-reconciliation.test.sh`, `repository-topology.test.mjs` |
| R35 | `make-interface.test.mjs`, `parity-release.test.mjs`, `release-package.test.mjs`, `repository-topology.test.mjs` |

| Success criterion | Passing behavior suite(s) |
| --- | --- |
| SC1 | `agent-ir.test.mjs` |
| SC2 | `agent-projection.test.mjs`, `repository-topology.test.mjs` |
| SC3 | `agent-projection.test.mjs`, `source-materializer.test.mjs` |
| SC4 | `agent-projection.test.mjs`, `release-package.test.mjs` |
| SC5 | `agent-projection.test.mjs`, `source-materializer.test.mjs`, `installer-transaction.test.mjs` |
| SC6 | `source-materializer.test.mjs`, `target-registry.test.mjs`, `agent-resolver.test.mjs` |
| SC7 | `target-registry.test.mjs`, `installer-transaction.test.mjs` |
| SC8 | `installer-transaction.test.mjs` |
| SC9 | `installer-transaction.test.mjs` |
| SC10 | `agent-resolver.test.mjs`, `agent-execution-events.test.mjs`, `gate-evaluator.test.sh` |
| SC11 | `agent-adapters.test.mjs` |
| SC12 | `evidence-parity-topology.test.mjs` |
| SC13 | `evidence-parity-topology.test.mjs` |
| SC14 | `repository-topology.test.mjs`, `gate-config-reconciliation.test.sh` |
| SC15 | `release-package.test.mjs`, `parity-release.test.mjs`, `make-interface.test.mjs` |
