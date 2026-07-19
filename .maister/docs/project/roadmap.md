# Roadmap

## Current baseline

- One common source with Codex, Cursor, and Kiro CLI overlays.
- Immutable source and provenance validation.
- Transactional install/update/uninstall/rollback/recovery with receipts and journals.
- Evidence freshness per capability, with explicit unavailable native outcomes.
- Shadow parity and negative topology checks at the migration boundary.
- Bounded immutable GitHub checkout resolution using the same checkout for source and overlay.
- Self-contained deterministic target archives with sorted entries, extracted lifecycle smoke, `SHA256SUMS`, CycloneDX artifact inventory, unsigned reproducibility provenance, and pinned release actions.

## Next priorities

- Collect fresh E5/E6 records when native executables, authentication, safe adapters, and versioned scenarios are available; keep missing prerequisites explicit as `unavailable`, never as passed.
- Continue strengthening scenario-level semantic parity and recovery fixtures.
- Keep release packages target-aware without reintroducing generated projections or marketplace assumptions.
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
