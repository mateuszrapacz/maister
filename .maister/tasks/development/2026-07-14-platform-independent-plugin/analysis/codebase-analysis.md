# Codebase Analysis: Platform-Independent Maister Distribution

## TL;DR
The repository currently uses a Claude-oriented canonical tree, three rewrite-heavy host builders, three committed generated trees, and three host-specific installers.
Five portable ESM runtime modules and several transactional/configuration tests are strong foundations for a common core.
The migration seam is a neutral common source plus explicit Codex, Cursor, and Kiro CLI overlays, assembled and installed by one target-aware transactional installer.
The highest risks are semantic drift in gate/delegation/hooks vocabulary, unsafe destination mutation, settings ownership, and deleting legacy trees before parity evidence is complete.

## Key Decisions
- Treat `plugins/maister/skills/orchestrator-framework/bin/` as the initial portable-runtime boundary because its five core modules are byte-identical across current targets.
- Replace global prose rewrites with repository-owned host overlays and typed semantic bindings for control flow, safety, persistence, and capability evidence.
- Run the common behavior suite once and retain per-host tests only for overlay, materialization, installation, and real host evidence.
- Keep legacy generated trees as a temporary comparison oracle, then delete them and Claude-specific support before this task is complete.

## Open Questions / Risks
- The final neutral source layout and exact overlay schema must be chosen without copying current generator complexity into a new abstraction.
- Settings that are shared with a host require explicit `whole_file` or `managed_keys` ownership and byte-exact rollback tests.
- Host contracts and runtime evidence may be unavailable; `unavailable` must remain explicit and must never be treated as pass.
- Repository docs, CI, release, and project standards currently describe the generated-tree/Claude model and must move with the implementation.

## 1. Task Scope and Characteristics

The task is a migration and architecture change, not a defect fix or UI feature. It modifies existing code and creates new installer, overlay, schema, receipt, and test entities. It performs filesystem/configuration data operations and has no UI-heavy surface.

Expected characteristics for Phase 2:

- `has_reproducible_defect`: false
- `modifies_existing_code`: true
- `creates_new_entities`: true
- `involves_data_operations`: true
- `ui_heavy`: false
- risk: high, because the change crosses source ownership, packaging, installation, rollback, CI, and supported-host policy.

## 2. Current Repository Structure

```text
plugins/maister/                 Claude-oriented canonical source
platforms/codex-cli/build.sh    Codex projection builder
platforms/cursor/build.sh       Cursor projection builder
platforms/kiro-cli/build.sh     Kiro projection builder
plugins/maister-codex/           committed generated Codex tree
plugins/maister-cursor/          committed generated Cursor tree
plugins/maister-kiro/            committed generated Kiro tree
tests/                           common shell/Node contract tests
Makefile                         build, validation, drift, and host matrix orchestration
.github/workflows/               generated drift, release, and host smoke workflows
```

The canonical tree contains roughly 136 files: skills, agents, command wrappers, Claude hooks, a Claude plugin manifest, `CLAUDE.md`, and shared MCP configuration. The current committed projections together contain roughly 474 generated/duplicated files. These counts are useful inventory evidence, not semantic contracts.

## 3. Existing Portable Core

The strongest candidate for `common/runtime` is:

- `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs`

These modules are currently byte-identical in the canonical, Codex, Cursor, and Kiro trees. They already implement state schema validation, durable state writes, gate evaluation, idempotency, continuation, leases, outbox/checkpoints, and safety boundaries. They should be moved or re-owned as common source rather than copied into maintained host trees.

The canonical prose layer is not neutral. Relevant host vocabulary and assumptions occur in `plugins/maister/CLAUDE.md`, the orchestrator framework, `docs-manager`, `init`, `standards-discover`, `quick-plan`, `development`, hooks, agents, and wrappers. Examples include `AskUserQuestion`, `TaskCreate`, `TaskUpdate`, `Skill tool`, `Task tool`, `CLAUDE.md`, `${CLAUDE_PLUGIN_ROOT}`, and `${CLAUDE_PROJECT_DIR}`.

## 4. Current Build and Distribution Flow

The current flow is:

```text
plugins/maister/
  ├─ platforms/cursor/build.sh   → plugins/maister-cursor/
  ├─ platforms/kiro-cli/build.sh → plugins/maister-kiro/
  └─ platforms/codex-cli/build.sh→ plugins/maister-codex/
```

`platforms/cursor/build.sh` is about 582 lines and performs global renames, tool-vocabulary rewrites, directory moves, agent metadata injection, command collapse, and host asset injection. `platforms/kiro-cli/build.sh` is about 860 lines, with a separate 160-line JSON agent generator; it performs command merging, agent serialization, gate/delegation rewrites, shortcuts, steering, MCP relocation, and install-time path rewriting. `platforms/codex-cli/build.sh` is about 338 lines and creates a manifest, converts commands to skills, rewrites host vocabulary, synthesizes utilities, and injects hooks/templates.

These builders are not thin overlays. They contain duplicated transform logic and silent-failure surface. They are migration inputs and inventories of host differences, not the target architecture.

The Makefile currently owns build targets, generated-tree validation, a four-runner phase-continuation matrix, byte-comparison checks, host capability projection, and large structural validation blocks. `.github/workflows/validate-generated-variants.yml` also assumes committed generated trees and drift checks.

## 5. Current Installation Flow and Safety Gaps

Host-specific installers are:

- `platforms/cursor/smoke-install.sh`: builds, deletes the destination, copies the generated tree, and optionally adds MCP.
- `platforms/kiro-cli/smoke-install.sh`: clears an isolated profile, copies the tree, rewrites prompt/hook paths, and manages aliases/settings.
- `platforms/codex-cli/smoke-install.sh`: registers a local marketplace, invokes Codex installation, then mutates the installed tree.
- `platforms/kiro-cli/smoke-uninstall.sh`: removes the Kiro profile.

The current installers are not transactional. Cursor and Kiro mutate or clear destinations before a complete validation boundary; Codex depends on marketplace installation and then performs mutations. There is no shared target-aware source resolver, overlay contract, receipt store, recovery journal, settings ownership model, or byte-exact managed-tree rollback.

The target pipeline should be:

```text
resolve local/GitHub source and immutable ref
  → load target overlay
  → probe host facts
  → classify capability compatibility
  → acquire target/scope lock
  → assemble common + overlay into staging
  → validate schema, paths, inventory, references, vocabulary, and hashes
  → snapshot managed tree and settings
  → commit atomically
  → write immutable receipt
  → publish active receipt
```

Any failure before publication must restore bytes, modes, symlinks, and directory topology. Uninstall must use receipt ownership and preserve user drift.

## 6. Host Overlay Inputs

Likely assets to move under explicit repository-owned overlays:

- Codex: `platforms/codex-cli/templates/`, `bin/fully-automatic-gate.mjs`, `hooks/`, and `tests/`.
- Cursor: `platforms/cursor/agents/`, `overrides/`, `patches/`, `rules/`, `templates/`, `hooks/`, and `tests/`.
- Kiro CLI: `agent-tools.json`, `overrides/`, `templates/`, `transforms/`, `hooks/`, `generate-agent-json.sh`, and `tests/`.

Every overlay should declare host ID and contract version, managed layout/discovery root, native asset inventory, agents/commands/hooks/settings/MCP placement, semantic versus packaging capability classification, bindings for user gates/delegation/continuation/safety, evidence target/fingerprint constraints, settings ownership, forbidden vocabulary, required paths, and path allowlists.

The overlay must not copy generic skills or render arbitrary prose. A host can own a native asset directly, while common instructions describe intent and the host harness owns ordinary tool selection.

## 7. Reusable Patterns

The repository already contains patterns to reuse:

- `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs`: exact field allowlists, format/type validation, legal transitions, and canonical serialization.
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`: strict transport validation, denylist checks, safe retry and idempotency.
- `plugins/maister/skills/init/bin/reconcile-advisor-config.sh`: candidate staging, preservation of modes/ownership, same-directory rename, and rollback.
- `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs`: locks, leases, revision/CAS checks, symlink rejection, fsync, atomic rename, metadata preservation, and cleanup.
- `plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs`: durable dispatch IDs, outbox, claim leases, checkpoints, acknowledgement, reclaim, and idempotent reuse; this is the closest existing receipt-like pattern.
- `platforms/kiro-cli/tests/reproducible-build.test.sh`: stable inventories, SHA-256 manifests, a build lock, concurrent rebuild serialization, and byte comparison.
- `tests/phase-continue-contract.test.sh`, `tests/orchestrator-state-repository.test.sh`, `tests/advisor-config-reconciliation.test.sh`, and `tests/advisor-init-lifecycle.test.sh`: byte, mode, existence, topology, and injected-failure assertions.
- `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`, `Makefile` capability targets, and `tests/host-capability-matrix.test.sh`: explicit passed/failed/unavailable/missing outcomes and fail-closed projection.

Avoid using the current long `sed`/`awk` rewrite lists, generated utility bodies embedded in shell functions, `rm -rf` install-before-validation, hard-coded directory counts, global boolean support claims, and structural scripts that are labeled as runtime smoke tests.

## 8. Test and CI Coverage

The repository has about 13 common shell tests, Codex tests, Cursor install/inventory/continuation tests, and a much larger Kiro generator/build/install suite. Common tests meaningfully cover gate evaluation, state repository behavior, workflow continuation, phase continuation, advisor config/lifecycle, migration, snapshots, and Codex workflow loops.

The same phase-continuation contract is currently executed against canonical, Codex, Cursor, and Kiro paths in `Makefile`; runtime files are also compared with `cmp`. That duplicates core behavior testing and should become one `test-core` run plus injected target-specific checks.

Missing coverage for the target design includes overlay schema/path containment/collisions, deterministic common-plus-overlay assembly, source/ref resolution, receipt/provenance, journal recovery, lifecycle rollback, settings ownership and user drift, structured capability records, native evidence freshness, and a final repository-topology negative test proving that generated trees and Claude support are gone.

Existing tests are valuable models for transactional safety: they snapshot files, modes, symlinks, existence, directory topology, and temporary artifacts, and inject failures before and after commit actions. The new installer should extend these exact assertions rather than only checking exit codes.

Native host evidence is uneven. Codex has authenticated runtime coverage for a narrow continuation scenario. Claude, Cursor, and Kiro continuation scripts can return `77`/unavailable. A `77` outcome must be surfaced as unavailable, never pass.

Suggested replacement test layers:

1. `test-core`: portable state/gate/continuation suite once.
2. `test-overlay-contract HOST`: schema, inventory, bindings, vocabulary, and native syntax.
3. `test-materializer HOST`: deterministic assembly, semantic golden, hashes, and installed canary.
4. `test-install HOST`: fresh/update/uninstall/rollback/settings ownership with failure injection.
5. `test-native-smoke HOST` / `test-host-e2e HOST`: only when runtime/auth exists, with explicit evidence status.
6. `test-repository-topology`: no generated trees, legacy builders, Claude support, or foreign vocabulary.

## 9. Migration and Documentation Impact

The migration must rewrite Makefile targets, CI workflows, release orchestration, README and host support docs, `.maister/docs/project/{vision,architecture,tech-stack,roadmap}.md`, and the build-pipeline standard. It must also update support matrices, install instructions, capability declarations, and test references.

After shadow parity, the likely deletion boundary includes `plugins/maister-{cursor,kiro,codex}`, old build/generator scripts, generated drift jobs, the canonical Claude manifest and `CLAUDE.md` assets, Claude marketplace entries, the Claude continuation stub, and stale Claude vocabulary. No placeholder `hosts/claude` compatibility tree should remain under the minimal-implementation standard.

## 10. Risk Assessment

Risk is **high**. The change touches source ownership and public installation behavior, and a successful file layout can still conceal broken gate, delegation, hook, or continuation semantics. The implementation plan must therefore sequence source extraction, explicit overlays, installer transaction boundaries, shadow parity, test matrix migration, documentation/CI updates, and final deletion with clear rollback points.

The research handoff is binding context for this analysis and is copied under `analysis/research-context/`. Its accepted decisions are consistent with the codebase evidence: minimal typed primitives, repository-owned Codex/Cursor/Kiro overlays, transactional installer, capability-sensitive compatibility, Claude removal, receipt-backed settings ownership, and core/per-host evidence separation.
