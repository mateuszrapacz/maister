# Specification: Platform-independent Maister distribution

## TL;DR

Maister will have one portable common source, explicit Codex/Cursor/Kiro CLI overlays, and one target-aware installer that selects the host at installation time.
The installer will resolve immutable source provenance, validate an overlay, stage the result, commit transactionally, and publish receipt-backed ownership with exact rollback.
Common runtime behavior will be tested once; host overlays, materialization, installation, settings ownership, and available native evidence will retain targeted tests.
Claude support and committed generated trees are migration-only and are removed after zero-unresolved-difference shadow parity.

## Key Decisions

- Use a portable common layer plus explicit host overlays — this removes duplicated generated ownership while preserving native host layouts.
- Use minimal typed semantic primitives, not a workflow DSL — only control flow, safety, persistence, delegation, continuation, and capability boundaries need host bindings.
- Treat the installer as a transaction manager — staging, validation, journal, receipt, atomic commit, recovery, and rollback are core behavior.
- Use hybrid settings ownership — dedicated files are whole-file owned; unavoidable shared files use narrowly allowlisted managed keys with drift detection.
- Use capability-sensitive compatibility — semantic, safety, persistence, and rollback capabilities fail closed; packaging-only differences may be provisional.
- Support Codex, Cursor, and Kiro CLI only — Claude and committed generated projections are temporary comparison oracles and are deleted before completion.

## Open Questions / Risks

- Native E5/E6 runtime evidence for Cursor and Kiro may remain unavailable; the implementation must record that state explicitly and never treat it as a pass.
- Exact host discovery roots and native inventories must be frozen in versioned overlays before legacy deletion.
- Shared settings and shell files do not provide multi-file filesystem atomicity; journal recovery and byte-exact failure tests are mandatory.
- Textual parity can hide semantic drift in gates, delegation, hooks, progress, and continuation; scenario evidence is required.
- Removing legacy trees eliminates the current rollback oracle, so parity and failure-injection exit criteria must be met first.

## Goal

Replace build-time host-specific generation and duplicated runtime testing with a portable Maister source, explicit host contracts, and safe install-time target selection.

## User Stories

- As a maintainer, I want to edit common behavior once and host behavior in a visible overlay so that changes do not require synchronized generated trees.
- As an installer operator, I want to select `codex`, `cursor`, or `kiro-cli` and a local or immutable GitHub source so that the correct host layout is assembled safely.
- As a user, I want updates, uninstall, rollback, and recovery to respect my files and settings so that an interrupted install cannot destroy unrelated state.
- As a host integrator, I want capability evidence per host and capability so that unsupported native behavior cannot be mistaken for a green result.
- As a release owner, I want one core test suite and focused host seams so that CI validates behavior without rebuilding committed projections.

## Core Requirements

1. Maintain one neutral common layer containing portable skills, references, assets, runtime modules, and minimal semantic primitive definitions.
2. Maintain versioned `codex`, `cursor`, and `kiro-cli` overlays containing native manifests/assets, discovery roots, layout allowlists, settings destinations, semantic bindings, required inventory, and forbidden vocabulary.
3. Preserve the portable orchestrator runtime behavior from the five proven ESM modules under `plugins/maister/skills/orchestrator-framework/bin/` without maintaining generated copies.
4. Resolve a local checkout or GitHub source/ref to immutable provenance, including requested ref, resolved commit, source version, overlay version, host version, and content hashes.
5. Provide one target-aware install lifecycle covering install, update, status/verify, uninstall, rollback, and recovery for the three supported targets.
6. Assemble into a same-filesystem staging area and validate source, overlay schema, path containment, collisions, inventory, references, syntax, modes, hashes, and symlink safety before mutation.
7. Protect commits with locks, journal entries, exact backups, atomic rename, cleanup, recovery, and failure injection; restore bytes, modes, symlinks, existence, and directory topology on failure.
8. Publish a receipt containing managed inventory, source/ref provenance, target and overlay identity, settings ownership, evidence, hashes, and rollback metadata.
9. Use `whole_file` ownership for dedicated Maister files and narrowly allowlisted `managed_keys` ownership for unavoidable shared settings and shell files.
10. Detect user drift and conflicts, preserve unmanaged content, and refuse unsafe destructive updates or uninstall operations.
11. Represent compatibility per capability with host/version/scenario/timestamp/provenance records. Semantic and safety boundaries fail closed; packaging-only differences may be provisional.
12. Require E1/E2/E4 for every host plus shared-core E3. Record E5/E6 as `unavailable` when runtime evidence cannot be executed; never promote unavailable to passed.
13. Expire and re-probe evidence per capability using host, version, scenario, and timestamp metadata.
14. Run common behavior tests once and retain per-host overlay, materializer, installer, settings, topology, and available native evidence tests.
15. Use legacy generated trees and builders only as a shadow parity oracle. Explain every difference and require zero unresolved semantic, inventory, reference, hook, permission, and topology differences before deletion.
16. Remove Claude manifests, hooks, vocabulary, marketplace paths, capability rows, support instructions, committed generated trees, old builders, and generated-tree drift CI before completion.
17. Update README, host support docs, project docs, standards, Make targets, CI, release packaging, support matrices, and migration notes to describe the new model.

## Compatibility and Evidence Policy

The supported target set is Codex, Cursor, and Kiro CLI. Compatibility is evaluated per capability rather than as a single host boolean. Semantic, safety, persistence, delegation, continuation, and rollback capabilities are fail-closed: a missing or failed binding blocks support for that capability. Packaging-only differences may be marked provisional when their structural and transactional evidence passes.

Evidence levels are defined as follows:

- E1: source/schema and overlay contract validation.
- E2: deterministic materialization, inventory, containment, collision, syntax, and permission validation.
- E3: shared portable-core behavior suite.
- E4: isolated installer transaction, receipt, settings ownership, drift, recovery, and rollback evidence.
- E5: host-native discovery and integration evidence.
- E6: host-native runtime scenario evidence.

Every record includes target, capability, host version, scenario, timestamp, result, provenance, and expiry. `passed`, `failed`, and `unavailable` are distinct outcomes. E5/E6 may be unavailable when the host runtime is absent, but that result remains visible and cannot satisfy a semantic capability by implication.

## Rollback Plan

The installer owns a journal and a receipt separate from workflow state. It resolves source and overlay, acquires a target lock, creates a staging tree, validates it, snapshots the managed tree and owned settings, and commits only through same-filesystem atomic replacement. The receipt is published only after the commit and integrity verification complete.

On any injected or observed failure, recovery uses the journal to determine the last durable step, restores the prior receipt and active pointer, restores exact file bytes/modes/symlinks/topology, restores owned settings according to their ownership mode, removes staging artifacts, and reports the failure without deleting unmanaged user content. Updates and uninstall refuse to overwrite detected drift unless the operation is explicitly safe under the ownership contract.

## Legacy Deletion Exit Criteria

The following must all pass before removing legacy generated trees and Claude support:

- A baseline manifest identifies all common behavior, host assets, hooks, settings, permissions, references, and generated inventory.
- Codex, Cursor, and Kiro shadow materialization has zero unresolved semantic, inventory, reference, hook, permission, and topology differences.
- Core, overlay, materializer, installer, settings, rollback, recovery, and available native evidence tests pass with unavailable outcomes explicit.
- Clean-checkout install, verify, update, uninstall, rollback, and recovery scenarios succeed for each target.
- User modifications and shared settings drift are preserved according to the ownership contract.
- Make, CI, release, docs, manifests, capability records, and tests use the new source/overlay/installer boundaries.
- No active references remain to committed generated trees, Claude support, marketplace installation, or legacy builders.

## Reusable Components

### Existing Code to Leverage

| Existing path | Reuse |
| --- | --- |
| `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs` | Gate identity, validation, idempotency, attempts, and safe terminal outcomes. |
| `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs` | Locks, CAS/revisions, safe paths, fsync, atomic replacement, metadata, and cleanup. |
| `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs` | Strict schema validation, canonical serialization, and legal transitions. |
| `plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs` | Durable inventory, claims, leases, checkpoints, acknowledgements, and idempotent dispatch. |
| `plugins/maister/skills/init/bin/reconcile-advisor-config.sh` | Candidate staging, backups, same-directory rename, mode preservation, and rollback diagnostics. |
| `tests/phase-continue-contract.test.sh` | Byte-exact non-mutation and rollback assertions. |
| `tests/advisor-config-reconciliation.test.sh` and `tests/advisor-init-lifecycle.test.sh` | Failure-injection coverage for configuration transactions and lifecycle recovery. |
| `tests/orchestrator-state-repository.test.sh` | Durable lock, revision, path, and persistence scenarios. |
| `platforms/kiro-cli/tests/reproducible-build.test.sh` | Stable inventory, hashing, build locking, and reproducibility patterns. |
| `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml` | Existing capability vocabulary and explicit unavailable semantics, reshaped per capability. |

### New Components Required

- A neutral common source boundary and portable primitive contract.
- Versioned Codex, Cursor, and Kiro CLI overlay schemas and native asset inventories.
- A deterministic materializer with source/ref resolver, containment checks, collision policy, and provenance manifest.
- A shared transaction manager with lock, journal, receipt, settings ownership, drift detection, recovery, and rollback services.
- Capability evidence and freshness schema plus per-target probe adapters.
- Core-once, overlay, materializer, installer, topology, and native evidence test entry points.
- Migration parity tooling and final negative topology checks.

## Technical Approach

The common layer expresses portable intent and runtime behavior. Overlays own only host-native layout, assets, bindings, settings policy, and capability claims. The materializer combines one immutable source with one validated overlay into a deterministic staging tree; it does not apply arbitrary global prose rewrites.

The installer is the boundary between repository artifacts and user state. It performs source/ref resolution, overlay selection, host probing, capability classification, staging, validation, snapshotting, atomic commit, receipt publication, and recovery. Workflow state remains in `orchestrator-state.yml`; installation receipts and journals use separate schemas.

The migration is validated in parallel against legacy generated outputs. Differences are classified as semantic, inventory/reference, hook/permission, packaging, or expected deletion. The legacy system remains a read-only oracle until the deletion exit criteria pass.

## Implementation Guidance

### Testing Approach

Each implementation step group should contain 2-8 focused tests and should run the new tests first. Common behavior is covered once; per-target tests cover only genuine host seams.

| Step group | Focus | Expected tests |
| --- | --- | ---: |
| Common source and primitives | Schema, neutral vocabulary, portable runtime contracts, binding completeness | 4-8 |
| Overlay and materializer | Overlay validation, containment, collisions, deterministic inventory, syntax, modes, hashes | 5-8 per host |
| Source resolver and installer transaction | Local/GitHub provenance, locks, staging, commit, receipts, journal recovery, rollback | 6-8 per host |
| Settings ownership | Whole-file ownership, managed keys, drift, conflict refusal, exact restore | 4-8 |
| Capability evidence | E1-E6 classification, unavailable semantics, expiry, renewal, fail-closed decisions | 4-8 |
| Migration and topology | Shadow parity, deletion boundary, negative generated-tree/Claude checks, Make/CI/release paths | 4-8 |

### Standards Compliance

- Follow `.maister/docs/standards/global/minimal-implementation.md`: prefer proven seams and avoid a general-purpose DSL or speculative APIs.
- Follow `.maister/docs/standards/global/error-handling.md`: fail closed at safety and persistence boundaries and preserve actionable diagnostics.
- Follow `.maister/docs/standards/global/validation.md`: validate before mutation and report structured evidence.
- Follow `.maister/docs/standards/global/build-pipeline.md`: replace generated-tree drift ownership with deterministic common/overlay/materializer checks.
- Follow `.maister/docs/standards/testing/test-writing.md`: assert bytes, modes, existence, topology, symlinks, and rollback—not just exit codes.
- Follow `.maister/docs/standards/global/coding-style.md` and `.maister/docs/standards/global/conventions.md` for Bash, JavaScript, Markdown, YAML, naming, and file boundaries.

## Out of Scope

- Re-adding Claude support; that is a separate future host-integration task.
- A full workflow DSL, prompt compiler, or arbitrary prose transformation framework.
- Native E5/E6 evidence that cannot be run in the current environment; those outcomes remain unavailable.
- New GUI surfaces, pages, forms, or visual design work.
- Unrelated feature redesign outside portability, distribution, installation safety, host integration, and migration governance.

## Success Criteria

- One neutral common source and three explicit host overlays are the only maintained distribution inputs.
- A target-aware installer supports local and immutable GitHub sources with deterministic staging, receipt, update, uninstall, rollback, and recovery.
- No destructive pre-validation mutation remains in supported install paths.
- Core behavior is tested once; host seams have focused overlay, materializer, installer, and evidence tests.
- All capability evidence includes provenance and expiry, and unavailable never passes.
- Shadow parity has zero unresolved differences before legacy deletion.
- Claude support, committed generated trees, old builders, generated drift CI, marketplace paths, and stale documentation are absent from the final topology.
- Documentation, standards, Make, CI, release, and support matrices describe the same three-host architecture.
