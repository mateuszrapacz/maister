# Requirements: Platform-independent Maister distribution

## TL;DR

Maister must move from a Claude-oriented source plus three rewrite-heavy generated trees to one portable common source with explicit Codex, Cursor, and Kiro CLI overlays. A shared installer must select the host at installation time, resolve local or immutable GitHub sources, validate compatibility, and commit changes transactionally with receipt-backed ownership and exact rollback. Common behavior is tested once; host overlays, materialization, installation, and available native evidence retain targeted coverage. Claude support and committed generated projections are migration-only and must be removed before completion.

## Initial description

Przeanalizować, jak zastąpić generowanie i osobne testowanie wariantów dla wielu hostów jednym rozwiązaniem niezależnym od narzędzia, z rozróżnieniem platformy możliwym na etapie instalacji.

## Confirmed scope and Q&A

### Scope

- **Question**: Is the implementation scope Codex, Cursor, and Kiro CLI only, with Claude and committed generated trees removed before completion?
- **Answer**: Confirm assumptions.
- **Requirement**: The completed supported target set is Codex, Cursor, and Kiro CLI. Claude assets, manifests, vocabulary, support rows, marketplace paths, and generated projections are migration-only and must be removed before completion.

### Host contract closure

- **Question**: Which host-contract closure policy should the implementation adopt?
- **Answer**: Contract-first overlay v1 with E1/E2/E4 for every host and E5/E6 when runtime exists.
- **Requirement**: Versioned overlays must explicitly encode discovery roots, native inventories, settings destinations, semantic bindings, and required evidence. E1/E2/E4 are required for every host; E5/E6 are collected when a runtime is available.

### Settings ownership

- **Question**: Which settings and shell-configuration ownership contract should the implementation adopt?
- **Answer**: Hybrid `whole_file` and `managed_keys` ownership with journal, backup, drift detection, and exact rollback.
- **Requirement**: Dedicated Maister files use whole-file ownership. Unavoidable shared files use narrowly allowlisted managed keys. Both modes require ownership records, backup/journal support, drift detection, recovery, and byte-exact rollback.

### Native evidence policy

- **Question**: Which minimum release-evidence policy should apply to hosts without native runtime?
- **Answer**: Require E1-E4 and shared-core E3; record E5/E6 as unavailable, never pass.
- **Requirement**: `unavailable` is a first-class evidence status and must never be converted to `passed`. Packaging/static evidence can support a host while semantic native evidence remains explicitly unavailable.

### Evidence freshness

- **Question**: Which evidence freshness policy should the implementation adopt?
- **Answer**: Per-capability expiry with host, version, scenario, and timestamp renewal.
- **Requirement**: Capability evidence records include host identity, host version, scenario, timestamp, capability class, result, provenance, and per-capability expiry/re-probe metadata.

### Documentation and release boundary

- **Question**: Which documentation and release migration boundary should the implementation adopt?
- **Answer**: Update all affected documentation, standards, Make/CI/release paths, and support matrices in this task.
- **Requirement**: No supported release path may continue to prescribe Claude, marketplace installation, or committed generated-tree workflows after completion.

### Routing

- **Question**: Continue to Phase 5: Technical Approach, Requirements & Specification?
- **Answer**: Continue to Phase 5.
- **Requirement**: TDD Red and UI mockup phases are skipped because the task is not defect-driven or UI-heavy. Requirements and specification proceed directly.

## User journey and personas

- **Maintainer**: edits common behavior or one host overlay, runs deterministic core/overlay/materializer/install validation, and uses legacy outputs only as a shadow comparison oracle during migration.
- **Installer operator**: chooses `--target codex|cursor|kiro-cli`, selects user/project scope, and supplies a local checkout or immutable GitHub source/ref. The installer reports compatibility, receipt, evidence, and recovery state.
- **Host integrator**: reviews native assets, semantic bindings, settings ownership, capability evidence, and overlay completeness for one host without reading a global rewrite program.
- **Release/support owner**: publishes one portable source, validates three host overlays, maintains capability evidence, and keeps README, CI, release, and support matrices aligned.

## Functional requirements

1. Provide one repository-owned portable common layer for behavior/runtime content that is independent of host vocabulary.
2. Provide explicit versioned overlays for Codex, Cursor, and Kiro CLI with allowlisted native assets, paths, discovery roots, settings destinations, bindings, and forbidden vocabulary.
3. Preserve the proven portable orchestrator runtime seam, including state, gate, continuation, and safety behavior, without maintaining separate generated copies.
4. Introduce only minimal typed semantic primitives for control flow, safety, persistence, delegation, continuation, and capability claims where host behavior changes semantics.
5. Provide deterministic source/ref resolution for local checkouts and immutable GitHub references, with provenance recorded for each installation.
6. Provide a shared target-aware installer that selects an overlay at install time and supports install, update, status/verify, uninstall, rollback, and recovery operations.
7. Stage and validate assembled output before mutation, enforcing target-root containment, collision rules, schema validity, inventory completeness, syntax/mode checks, deterministic hashes, and symlink safety.
8. Use locks, journal entries, backups, atomic commit, cleanup, and recovery to prevent partial installations and restore the exact previous filesystem/configuration state on failure.
9. Record a receipt containing source/ref provenance, target, overlay version, installed inventory, settings ownership, capability evidence, hashes, and rollback metadata.
10. Support hybrid settings ownership: dedicated whole-file paths plus narrowly allowlisted managed keys for unavoidable shared settings/shell files.
11. Detect user drift and concurrent changes, preserve unmanaged content, and refuse unsafe destructive updates or uninstall operations.
12. Represent compatibility per capability and host rather than as one host-level boolean; semantic/safety/persistence boundaries fail closed, while packaging-only differences may be provisional.
13. Run common-core behavior tests once and retain per-host overlay, materialization, installation lifecycle, settings ownership, topology, and available native evidence tests.
14. Require E1/E2/E4 for each supported host, use shared-core E3, and record E5/E6 as unavailable when native runtime is absent rather than passing them.
15. Expire evidence per capability using host/version/scenario/timestamp metadata and support explicit renewal/re-probe.
16. Use legacy generated trees and old builders only as a shadow parity oracle; classify every difference and require zero unresolved semantic, inventory, reference, hook, permission, or topology differences before deletion.
17. Remove Claude manifests/assets/vocabulary, committed generated projections, old builder/rewrite CI, Claude capability rows, marketplace installation paths, and stale support instructions before task completion.
18. Update README, host support docs, project docs, standards, Make targets, CI, release packaging, capability matrices, and migration notes to describe the new architecture and supported targets.

## Reusability opportunities

- Reuse the byte-identical modules under `plugins/maister/skills/orchestrator-framework/bin/` as the initial common runtime boundary.
- Reuse schema validation, legal transitions, canonical serialization, locks, CAS/revision checks, symlink rejection, atomic rename, and cleanup patterns from `orchestrator-state-repository.mjs`.
- Reuse candidate staging, same-directory rename, mode preservation, rollback diagnostics, and failure injection from `plugins/maister/skills/init/bin/reconcile-advisor-config.sh` and its tests.
- Reuse byte-exact snapshot assertions from `tests/phase-continue-contract.test.sh`, repository tests, advisor lifecycle tests, and Kiro reproducible-build tests.
- Reuse host capability vocabulary and explicit `passed`/`failed`/`unavailable` semantics from `host-capabilities.yml`, the Makefile capability target, and `tests/host-capability-matrix.test.sh`, while reshaping them into per-capability records.
- Preserve existing host-native assets only after inventory and semantics are represented in explicit overlays; the rewrite-heavy builders are comparison fixtures, not new ownership boundaries.

## Visual assets

No visual assets or UI changes are in scope. The operator-facing interface is a CLI/installer lifecycle; no mockups are required.

## Scope boundaries

### In scope

- Portable common source and runtime ownership.
- Codex, Cursor, and Kiro CLI overlays.
- Target-aware source resolution, assembly/materialization, validation, installation, update, status/verify, uninstall, rollback, and recovery.
- Receipt, journal, settings ownership, capability evidence, and schema contracts.
- Core-once plus per-host test topology and shadow parity.
- Deletion of Claude support and committed generated legacy infrastructure.
- Documentation, standards, CI, release, and support-matrix migration.

### Out of scope

- Re-adding Claude support; that requires a separate host-integration task.
- A full workflow DSL or a general-purpose prompt compiler.
- Native runtime evidence that cannot be executed in the current environment; such results remain unavailable.
- New GUI surfaces or visual design work.
- Unrelated feature redesigns outside distribution, portability, installation safety, and host integration.

## Technical considerations and risks

- Semantic parity must be proven by scenarios and binding completeness, not only text/layout diffs.
- Shared settings lack filesystem-level multi-file atomicity; journal, backups, conflict detection, and recovery are mandatory.
- Target-root containment and symlink rejection are required to prevent overlay path escape.
- Native host versions and external binaries change independently; evidence freshness must be explicit.
- Legacy deletion must follow shadow parity and failure-injection evidence so the migration oracle is not lost prematurely.
- The accepted compatibility policy is strict for semantics, safety, persistence, and rollback; provisional status is limited to packaging-only differences.
