# Implementation Plan: Platform-independent Maister distribution

## TL;DR

The migration is organized into four implementation groups followed by one focused test-review group. Work is intentionally serialized through the overlay contract, deterministic materializer, transactional installer, and final parity/deletion boundary because each group freezes an interface consumed by the next. The plan expects 26 focused tests from the implementation groups and permits up to 8 strategic gap tests, for a maximum of 34 feature tests. Claude support, legacy builders, and committed generated trees are removed only in Group 4 after parity and failure-injection evidence is green.

## Key Decisions

- Keep `plugins/maister/` as the single maintained common source and add explicit `plugins/maister/overlays/` contracts — this avoids a disruptive second source move while removing Claude-specific ownership from the common boundary.
- Freeze overlay v1 before writing the materializer — source layout, semantic bindings, settings ownership, inventory, forbidden vocabulary, and evidence requirements become validated data rather than rewrite-script behavior.
- Expose one Node ESM entry point, `plugins/maister/bin/maister-install.mjs`, for every lifecycle operation — one command contract gives install, update, verify, rollback, recovery, and automation the same error and receipt semantics.
- Keep receipt and journal state under a target-scoped state root, separate from workflow `orchestrator-state.yml` — installation recovery must not depend on development workflow state.
- Treat legacy outputs as read-only parity fixtures until Group 4 — deletion is an acceptance step, not an early cleanup step.

## Open Questions / Risks

- Cursor and Kiro CLI may not be installed in the verification environment. Their E5/E6 records must remain `unavailable`; E1-E4 and shared E3 still gate release.
- GitHub source resolution may require network access in CI. Tests use a local fixture repository and a stubbed resolver boundary; one release smoke test should exercise a real immutable GitHub ref when credentials/network are available.
- Atomic rename protects the managed tree only when staging and destination share a filesystem. Shared settings remain a journaled multi-file transaction and therefore require exact recovery tests at every durable step.
- No performance threshold is introduced in this task. Determinism and bounded inventory are required, while timing regressions remain observable rather than release-gating.

## Overview

- Total Steps: 39
- Task Groups: 5
- Expected Tests: 26-34
- Testing Group: Yes
- Visual Coverage: Not applicable; no design context exists

## Frozen Contracts

### Overlay v1

`plugins/maister/overlays/schema/overlay-v1.schema.json` is the canonical schema. Each `plugins/maister/overlays/<target>/overlay.yml` must contain these fields and reject unknown fields:

- `schema_version`: integer `1`.
- `overlay_id`: stable string `maister/<target>`.
- `overlay_version`: semantic version.
- `target`: `{ id, host_version_constraint, discovery_roots[] }`, where `id` is `codex`, `cursor`, or `kiro-cli` and roots are target-home-relative templates with no absolute paths or `..` traversal.
- `layout`: ordered entries `{ source, destination, kind, mode, ownership }`; `kind` is `file`, `tree`, or `template`, `mode` is an octal file mode, and `ownership` is `whole_file` or `managed_keys`.
- `settings`: entries `{ path, format, ownership, managed_keys[], merge_policy }`; `managed_keys` must be empty for `whole_file`, non-empty and allowlisted for `managed_keys`, and `merge_policy` is `preserve_unmanaged_refuse_drift`.
- `semantic_bindings`: exactly the required primitive IDs `user_gate`, `delegate_agent`, `track_progress`, `resolve_task_root`, `persist_state`, and `continue_workflow`, each with `{ adapter, capability, fail_closed }`.
- `inventory`: `{ required[], optional[], forbidden[] }`, using normalized target-relative paths or anchored glob patterns.
- `validation`: `{ forbidden_vocabulary[], executable_paths[], syntax_checks[] }`.
- `capabilities`: a map from capability ID to `{ class, required_evidence[] }`, where `class` is `semantic`, `safety`, `persistence`, `rollback`, or `packaging` and evidence IDs are E1-E6.
- `native_assets`: entries `{ source, destination, mode, sha256 }` for host-only manifests, rules, hooks, templates, or agent metadata.

The per-host inventory fixtures are explicit and versioned in `plugins/maister/overlays/<target>/inventory.yml`:

- Codex requires `.codex-plugin/plugin.json`, `skills/**/SKILL.md`, applicable `skills/**/agents/openai.yaml`, `hooks/hooks.json`, and the Codex native gate adapter; it forbids Cursor rules, Kiro steering/JSON agents, Claude manifests, and Claude hook vocabulary.
- Cursor requires `.cursor-plugin/plugin.json`, `skills/maister-*/SKILL.md`, `agents/*.md`, `rules/*.mdc`, and `hooks/hooks.json`; it forbids Codex agent metadata, Kiro steering/JSON agents, Claude manifests, and Claude hook vocabulary.
- Kiro CLI requires `skills/**/SKILL.md`, `agents/*.json`, `steering/*.md`, `hooks/*.sh`, and `agent-tools.json`; it forbids Codex/Cursor manifests, Cursor rules/Markdown agents, Claude manifests, and Claude hook vocabulary.

### Installer CLI, errors, receipt, and journal

The public entry point is:

```text
node plugins/maister/bin/maister-install.mjs <install|update|status|verify|uninstall|rollback|recover> \
  --target <codex|cursor|kiro-cli> [--source <path|github:owner/repo>] [--ref <ref>] \
  [--home <path>] [--json] [--failure-point <name>]
```

`install` and `update` require `--source`; GitHub sources require `--ref` and must resolve to a full commit SHA before materialization. `--failure-point` is accepted only when `MAISTER_ENABLE_FAILURE_INJECTION=1`. JSON output uses `{ schema_version, ok, command, target, code, message, error, receipt_path, journal_path, evidence }`; `error`, when present, is `{ kind, details, retryable }`.

Exit codes are stable: `0` success, `2` usage/schema, `3` source/provenance, `4` overlay/materialization/compatibility validation, `5` drift or ownership conflict, `6` lock busy, `7` transaction/recovery failure, and `8` post-commit integrity failure.

Receipt schema v1 contains:

- `schema_version`, `receipt_id`, `installer_version`, `status`, `installed_at`.
- `target: { id, overlay_id, overlay_version, host_version }`.
- `source: { kind, requested, requested_ref, resolved_commit, source_version, content_hash }`.
- `active_root` and `managed_inventory[]: { path, type, mode, sha256, link_target, ownership }`.
- `settings[]: { path, format, ownership, managed_keys, before_sha256, after_sha256, backup_ref }`.
- `evidence[]: { target, capability, host_version, scenario, timestamp, result, provenance, expires_at }`.
- `transaction: { journal_id, backup_root, previous_receipt_id }`.

Journal schema v1 contains `schema_version`, `journal_id`, `command`, `target`, `started_at`, `state`, `stage_root`, `destination_root`, `previous_receipt`, `candidate_receipt`, `lock`, `steps[]`, and `failure`. `state` is one of `prepared`, `staged`, `snapshotted`, `committing`, `committed`, `verified`, `rolled_back`, `recovered`, or `failed`; each step records `{ name, status, timestamp, before_ref, after_hash }`. Receipt publication is the final durable step after integrity verification.

Target-scoped state defaults to `${XDG_STATE_HOME:-$HOME/.local/state}/maister/<target>/`; the lock, journals, receipts, backups, and active-receipt pointer live below that root. Tests always pass `--home` and `XDG_STATE_HOME` sandbox paths.

## Requirement Coverage

| Requirement | Primary Group(s) |
| --- | --- |
| R1-R3 common source, primitives, portable runtime | Group 1 |
| R2 host overlays and inventories | Group 1 |
| R4 immutable source provenance | Group 2 |
| R5 lifecycle operations | Groups 2-3 |
| R6 staged validation and symlink/path safety | Group 2 |
| R7 transaction, recovery, exact rollback | Group 3 |
| R8 receipt ownership and provenance | Group 3 |
| R9-R10 settings ownership and drift | Group 3 |
| R11-R13 capability evidence and freshness | Group 4 |
| R14 core-once/per-host tests | Groups 1-5 |
| R15 shadow parity and zero unresolved differences | Group 4 |
| R16 Claude/generated-tree/builder removal | Group 4 |
| R17 docs, standards, Make, CI, release, support matrix | Group 4 |

## Implementation Steps

### Task Group 1: Portable core and overlay v1 contracts

**Dependencies:** None  
**Files to Modify:** `plugins/maister/common/primitives.yml`, `plugins/maister/overlays/schema/overlay-v1.schema.json`, `plugins/maister/overlays/codex/overlay.yml`, `plugins/maister/overlays/codex/inventory.yml`, `plugins/maister/overlays/cursor/overlay.yml`, `plugins/maister/overlays/cursor/inventory.yml`, `plugins/maister/overlays/kiro-cli/overlay.yml`, `plugins/maister/overlays/kiro-cli/inventory.yml`, `plugins/maister/overlays/*/assets/**`, `plugins/maister/lib/distribution/overlay-loader.mjs`, `plugins/maister/lib/distribution/errors.mjs`, `plugins/maister/bin/validate-overlay.mjs`, `tests/platform-independent/overlay-contract.test.mjs`, `tests/fixtures/platform-independent/overlays/**`  
**Estimated Steps:** 7

- [x] 1.0 Complete the portable-core and overlay-contract layer.
  - [x] 1.1 Write 6 focused overlay-contract tests.
    - Accept one valid fixture for each target and assert the required per-host inventory categories.
    - Reject unknown fields, missing semantic bindings, invalid ownership combinations, absolute/traversing destinations, collisions in normalized inventory paths, and foreign-host/Claude vocabulary.
  - [x] 1.2 Define the six minimal semantic primitives in `common/primitives.yml` and map them to the five proven orchestrator ESM modules without copying those modules.
    - Reuse: `gate-evaluator.mjs`, `orchestrator-state-repository.mjs`, `orchestrator-state-schema.mjs`, `phase-continue.mjs`, and `workflow-continuation.mjs`.
  - [x] 1.3 Add the strict overlay v1 JSON Schema and typed error helpers.
    - Enforce the field-level contract in the Frozen Contracts section and stable `E_OVERLAY_*` error kinds.
  - [x] 1.4 Create Codex, Cursor, and Kiro CLI overlay and inventory fixtures from the current generated outputs.
    - Make native discovery roots, layout roots, settings destinations, semantic adapters, required inventory, executable paths, forbidden vocabulary, and E1-E6 claims explicit.
  - [x] 1.5 Extract only host-native manifests, hooks, templates, rules/steering, and agent metadata into overlay-owned assets.
    - Do not delete or rewrite legacy generated trees in this group; they remain the comparison oracle.
  - [x] 1.6 Run only `tests/platform-independent/overlay-contract.test.mjs` and make all 6 tests pass.

**Acceptance Criteria:**

- All 6 focused tests pass.
- Every target validates against overlay v1 and has an explicit inventory fixture.
- Every required semantic primitive has exactly one target adapter and fail-closed capability classification.
- The five portable runtime modules remain single-source under `plugins/maister/skills/orchestrator-framework/bin/`.
- Invalid paths, ownership declarations, incomplete bindings, and foreign vocabulary fail with stable machine-readable errors.

### Task Group 2: Immutable source resolution and deterministic materialization

**Dependencies:** Group 1  
**Files to Modify:** `plugins/maister/lib/distribution/source-resolver.mjs`, `plugins/maister/lib/distribution/provenance.mjs`, `plugins/maister/lib/distribution/materializer.mjs`, `plugins/maister/lib/distribution/hash-tree.mjs`, `plugins/maister/lib/distribution/path-safety.mjs`, `plugins/maister/bin/materialize.mjs`, `tests/platform-independent/source-materializer.test.mjs`, `tests/fixtures/platform-independent/source-repos/**`, `tests/fixtures/platform-independent/materialized/**`  
**Estimated Steps:** 8

- [x] 2.0 Complete source resolution and materialization.
  - [x] 2.1 Write 6 focused source/materializer tests.
    - Cover local checkout resolution, GitHub ref-to-commit resolution through an injected resolver, deterministic repeated output, path containment/symlink escape refusal, normalized collision refusal, and inventory/syntax/mode/hash validation.
  - [x] 2.2 Implement local and `github:owner/repo` source adapters with immutable provenance.
    - Record requested source/ref, full resolved commit, source version, overlay version, host version, and source/content hashes.
    - Reject a mutable GitHub ref that cannot be resolved to a full commit.
  - [x] 2.3 Implement source resolver edge behavior explicitly.
    - Reject dirty local worktrees unless `--allow-dirty-local` is explicitly supplied to the internal materializer command; include a deterministic dirty-tree content hash when allowed.
    - Reject missing refs, ambiguous short SHAs, submodule/worktree paths escaping the source root, unsupported source schemes, and symlink cycles.
  - [x] 2.4 Implement deterministic overlay loading and normalized assembly planning.
    - Sort by normalized destination, reject duplicate/case-fold collisions, and prevent writes outside the selected target root.
  - [x] 2.5 Materialize common files plus native overlay assets into a caller-provided same-filesystem staging root.
    - Preserve declared modes and safe symlinks; never mutate a user destination.
  - [x] 2.6 Validate required/forbidden inventory, internal references, JSON/YAML/Markdown/frontmatter syntax, executable modes, file hashes, and symlink targets.
  - [x] 2.7 Run only `tests/platform-independent/source-materializer.test.mjs` and make all 6 tests pass.

**Acceptance Criteria:**

- All 6 focused tests pass for all three overlays using parameterized fixtures.
- Identical source commit plus overlay version produces byte-identical inventory and hashes.
- Local and GitHub provenance records are complete and immutable before staging is accepted.
- Traversal, collisions, unsafe symlinks, invalid syntax/modes, and missing inventory fail before destination mutation.
- Materialized output contains no unresolved template tokens or forbidden host vocabulary.

### Task Group 3: Transactional installer, ownership, receipt, and recovery

**Dependencies:** Group 2  
**Files to Modify:** `plugins/maister/bin/maister-install.mjs`, `plugins/maister/lib/distribution/cli-contract.mjs`, `plugins/maister/lib/distribution/transaction-manager.mjs`, `plugins/maister/lib/distribution/receipt-schema.mjs`, `plugins/maister/lib/distribution/journal-schema.mjs`, `plugins/maister/lib/distribution/settings-owner.mjs`, `plugins/maister/lib/distribution/drift-detector.mjs`, `plugins/maister/lib/distribution/recovery.mjs`, `plugins/maister/lib/distribution/target-paths.mjs`, `plugins/maister/overlays/*/overlay.yml`, `tests/platform-independent/installer-transaction.test.mjs`, `tests/fixtures/platform-independent/user-homes/**`  
**Estimated Steps:** 10

- [x] 3.0 Complete the shared installer lifecycle and transaction layer.
  - [x] 3.1 Write 8 focused installer tests.
    - Cover clean install/verify/uninstall, update with prior receipt, whole-file drift refusal, managed-key preservation/conflict refusal, lock contention, failure after snapshot, failure during commit, and recovery/rollback with exact bytes/modes/symlinks/existence/topology.
  - [x] 3.2 Implement the frozen CLI and JSON/error contract for `install`, `update`, `status`, `verify`, `uninstall`, `rollback`, and `recover`.
    - Preserve exit codes 0/2/3/4/5/6/7/8 and never emit a success envelope for a failed or unavailable semantic boundary.
  - [x] 3.3 Implement target path resolution and same-filesystem staging.
    - Resolve host discovery destinations from the selected overlay and sandbox all tests through `--home` plus `XDG_STATE_HOME`.
  - [x] 3.4 Implement exclusive target locks, durable journal transitions, exact backups, candidate receipt generation, atomic tree replacement, integrity verification, and final active-receipt publication.
    - Reuse repository lock/fsync/atomic-replace patterns from `orchestrator-state-repository.mjs` without coupling installer state to workflow state.
  - [x] 3.5 Implement receipt schema v1 and journal schema v1 exactly as frozen above.
    - Validate every read and write; retain previous receipts and backup references required for rollback.
  - [x] 3.6 Implement `whole_file` and allowlisted `managed_keys` ownership.
    - Preserve unmanaged keys and formatting where the format adapter supports it; compare before/after hashes; refuse destructive drift or ambiguous ownership.
  - [x] 3.7 Implement failure injection and idempotent recovery for every durable transaction state.
    - Restore bytes, modes, symlink targets, prior existence/non-existence, empty directories needed by prior topology, settings, previous active receipt, and cleanup of staging artifacts.
  - [x] 3.8 Implement update, uninstall, and rollback conflict policy.
    - Managed unmodified paths may change; modified owned paths and overlapping managed keys fail with `E_DRIFT_CONFLICT`; unrelated user content is never removed.
  - [x] 3.9 Run only `tests/platform-independent/installer-transaction.test.mjs` and make all 8 tests pass.

**Acceptance Criteria:**

- All 8 focused tests pass across parameterized Codex, Cursor, and Kiro CLI target homes.
- The command, error, receipt, and journal contracts exactly match the Frozen Contracts section.
- No supported command mutates target files before source, overlay, stage, and snapshot validation complete.
- Failure injection at each durable boundary restores byte-exact prior state and leaves an auditable terminal journal.
- Update, uninstall, and rollback preserve unmanaged content and refuse unsafe drift.

### Task Group 4: Capability evidence, shadow parity, topology migration, and release/docs

**Dependencies:** Groups 1, 2, and 3  
**Files to Modify:** `plugins/maister/lib/distribution/evidence-schema.mjs`, `plugins/maister/lib/distribution/evidence-policy.mjs`, `plugins/maister/lib/distribution/host-probes/*.mjs`, `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`, `plugins/maister/bin/shadow-parity.mjs`, `tests/platform-independent/evidence-parity-topology.test.mjs`, `tests/fixtures/platform-independent/evidence/**`, `Makefile`, `.github/workflows/validate-generated-variants.yml`, `.github/workflows/cursor-cli-smoke.yml`, `.github/workflows/release.yml`, `README.md`, `docs/README.md`, `.maister/docs/project/vision.md`, `.maister/docs/project/architecture.md`, `.maister/docs/project/tech-stack.md`, `.maister/docs/project/roadmap.md`, `.maister/docs/standards/global/build-pipeline.md`, `.maister/docs/standards/global/validation.md`, `.maister/docs/standards/testing/test-writing.md`, `platforms/codex-cli/**`, `platforms/cursor/**`, `platforms/kiro-cli/**`, `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `plugins/maister/.claude-plugin/**`, `plugins/maister/CLAUDE.md`, `plugins/maister/hooks/**`, `plugins/maister-codex/**`, `plugins/maister-cursor/**`, `plugins/maister-kiro/**`, `tests/host-continuation/claude.e2e.sh`  
**Estimated Steps:** 9

- [x] 4.0 Complete compatibility evidence and the legacy-removal migration.
  - [x] 4.1 Write 6 focused evidence/parity/topology tests.
    - Cover E1-E6 record validation, `unavailable` never satisfying `passed`, per-capability expiry/renewal, semantic fail-closed versus packaging provisional policy, classified zero-unresolved shadow parity, and final negative topology/Claude/legacy-reference checks.
  - [x] 4.2 Implement evidence schema and policy evaluation.
    - Require `{ target, capability, host_version, scenario, timestamp, result, provenance, expires_at }`; result is `passed`, `failed`, or `unavailable`.
    - Require E1/E2/E4 per target plus shared E3; execute E5/E6 only when a native runtime probe is available, otherwise record `unavailable` without promotion.
  - [x] 4.3 Implement per-target native probe adapters and freshness renewal.
    - Expire on `expires_at`, host-version mismatch, overlay-version mismatch, source commit change, or scenario-version change.
  - [x] 4.4 Implement the shadow parity baseline and classifier against the three legacy generated trees.
    - Compare semantic bindings, inventory, internal references, hooks, permissions, symlinks, and topology; classify expected packaging/deletion differences and fail while any semantic or unexplained difference remains.
  - [x] 4.5 Run clean-checkout lifecycle and failure-injection evidence for all three targets.
    - Capture install, verify, update, uninstall, rollback, recovery, settings drift, and available native scenarios in receipts/evidence fixtures.
  - [x] 4.6 Replace Make and CI/release entry points with `test-core`, `test-overlay TARGET`, `test-materializer TARGET`, `test-install TARGET`, `test-evidence TARGET`, `test-topology`, and target-aware packaging/install commands.
    - Remove generated-tree drift jobs and marketplace publishing/install assumptions.
  - [x] 4.7 Update all operator/project/standards/support documentation to the one-source, three-overlay, transactional-installer model.
    - Document local and immutable GitHub usage, receipt/state locations, drift behavior, recovery, evidence meanings, Cursor/Kiro E5/E6 availability, migration, and explicit Claude removal.
  - [x] 4.8 After 4.1-4.7 are green and parity reports zero unresolved differences, delete Claude manifests/hooks/vocabulary/support rows, marketplace paths, old host builders/installers, committed generated trees, Claude continuation tests, and every stale reference to them; then run the 6 focused tests again.

**Acceptance Criteria:**

- All 6 focused tests pass.
- Every capability record has provenance and expiry; `unavailable` is visible and never counted as a pass.
- Shadow parity reports zero unresolved semantic, inventory, reference, hook, permission, symlink, or topology differences before deletion.
- `plugins/maister-codex/`, `plugins/maister-cursor/`, `plugins/maister-kiro/`, old builders, Claude support, marketplace paths, and generated-drift CI are absent.
- Make, CI, release, README, project docs, standards, and support matrices all describe the same Codex/Cursor/Kiro architecture.
- A repository-wide negative scan finds no active legacy path, Claude support, or generated-tree installation instruction.

### Task Group 5: Test review and gap analysis

**Dependencies:** Groups 1, 2, 3, and 4  
**Files to Modify:** `tests/platform-independent/*.test.mjs`, `tests/fixtures/platform-independent/**`, `Makefile`  
**Estimated Steps:** 5

- [x] 5.0 Review and fill critical feature-test gaps.
  - [x] 5.1 Review the 26 focused tests from Groups 1-4 against all 17 requirements and the legacy-deletion exit criteria.
  - [x] 5.2 Check specifically for missing negative cases at source/path, semantic-binding, settings ownership, journal recovery, evidence freshness, and final topology boundaries.
  - [x] 5.3 Add no more than 8 strategic tests, keeping the total feature suite at 34 or fewer.
  - [x] 5.4 Run only the platform-independent feature suite through the new Make target and record the final test inventory.

**Acceptance Criteria:**

- All 26-34 platform-independent feature tests pass.
- Every requirement and legacy deletion criterion maps to at least one focused assertion.
- Core behavior runs once; target parameterization is limited to actual overlay/materializer/installer/evidence seams.
- No more than 8 additional tests are added in this group.

## Execution Order

1. Group 1: Portable core and overlay v1 contracts (7 steps, no dependencies).
2. Group 2: Immutable source resolution and deterministic materialization (8 steps, depends on Group 1).
3. Group 3: Transactional installer, ownership, receipt, and recovery (10 steps, depends on Group 2).
4. Group 4: Capability evidence, shadow parity, topology migration, and release/docs (9 steps, depends on Groups 1-3).
5. Group 5: Test review and gap analysis (5 steps, depends on all implementation groups).

The default executor may parallelize tests or documentation work inside a group when file ownership is disjoint, but it must not run these groups concurrently: the shared overlay, installer, Make, and topology boundaries require the declared order.

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- `global/minimal-implementation.md` — introduce only the six proven semantic primitives and avoid a general workflow DSL.
- `global/error-handling.md` — use stable structured errors, fail closed, and preserve recovery diagnostics.
- `global/validation.md` — validate source, overlay, staging, ownership, evidence, and receipts before mutation or publication.
- `global/build-pipeline.md` — replace generated projections and drift checks with deterministic common/overlay/materializer/install boundaries.
- `global/coding-style.md` and `global/conventions.md` — use repository ESM, Bash, YAML, Markdown, naming, and path conventions.
- `testing/test-writing.md` — assert content bytes, modes, symlinks, existence, topology, failure points, and rollback rather than exit status alone.

## Notes

- Test-Driven: Every implementation group starts with 2-8 focused tests.
- Run Incrementally: Run only the group tests while implementing that group; the focused feature suite runs in Group 5.
- Mark Progress: Check off both parent and child steps and keep the HTML progress markers synchronized.
- Reuse First: Reuse the existing orchestrator runtime, atomic-state repository patterns, advisor reconciliation transaction tests, and Kiro reproducibility patterns.
- Delete Last: Legacy projections, builders, and Claude support remain read-only until Group 4 parity and recovery gates are green.
