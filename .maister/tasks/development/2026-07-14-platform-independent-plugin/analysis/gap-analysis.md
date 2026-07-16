# Gap Analysis: Implement platform-independent Maister distribution

## TL;DR

The repository still has a Claude-oriented canonical tree, three rewrite-heavy builders, three committed generated trees, and three unrelated installation paths; the requested target-aware distribution architecture is not implemented.
The five orchestrator-framework ESM modules are byte-identical across source and current projections, providing a concrete common-runtime seam, but generic prose and host behavior are still coupled through global rewrites.
The largest missing capabilities are an explicit common/host overlay contract, a shared transactional installer with receipt-backed ownership, and a core-once/per-host evidence test model.
Risk and effort are high because installation safety, semantic parity, host support policy, CI/release orchestration, Claude removal, and project documentation must change together.

## Key Decisions

- Use the five byte-identical modules under `plugins/maister/skills/orchestrator-framework/bin/` as the initial portable-runtime boundary; the repository inventory and SHA-256 comparison show the same files in the source, Codex, Cursor, and Kiro projections.
- Keep documentation-as-code and introduce only minimal typed semantic primitives for control flow, safety, persistence, delegation, continuation, and capability claims; ordinary search/read/test tool choice remains host-owned. This is supported by the accepted research decision and by the current builders' concentrated semantic rewrites.
- Replace the current generator topology with one repository-owned common layer, explicit `codex`, `cursor`, and `kiro-cli` overlays, and a custom copy/merge installer. The accepted research handoff excludes marketplace-driven installation and runtime prompt compilation from this task.
- Treat Claude Code and the committed generated trees as migration-only legacy: use them as a shadow comparison oracle, then remove Claude support and legacy outputs before the implementation task closes, with no placeholder compatibility tree.
- Make installer ownership transactional: staging, path/schema validation, locks, journal, receipt, atomic commit, managed settings ownership, recovery, and byte-exact rollback are required invariants rather than optional hardening.
- Run the common behavior suite once and retain per-host tests for overlay contracts, deterministic assembly, installation lifecycle, and available native evidence; `unavailable` must remain an explicit evidence status and never pass.

## Open Questions / Risks

- Codex, Cursor, and Kiro discovery roots, native agent/hook contracts, settings formats, and capability fingerprints still need implementation-time contract confirmation; the current scripts encode assumptions but do not provide a shared versioned contract.
- Shared settings and shell configuration do not have filesystem-level multi-file atomicity. A journal, backups, conflict detection, recovery path, and byte/mode/topology assertions are required to prevent partial updates and user-data loss.
- A successful file layout will not prove gate, delegation, hook, or continuation parity. The current `sed`/`awk` transforms can silently change semantics while structural checks remain green.
- Task-scoped deletion of legacy removes the current rollback oracle before any post-release observation window exists. Shadow parity and failure-injection gates therefore need explicit exit criteria before deletion.
- Removing Claude is an accepted product decision but is a compatibility and communication change for any existing Claude users; README, support docs, capability records, release notes, and project docs currently still advertise Claude.

## Summary

- **Risk Level**: High
- **Estimated Effort**: High
- **Change Type**: Modificative architecture and distribution migration
- **Compatibility Requirements**: Strict at semantic, safety, persistence, and rollback boundaries; capability-sensitive provisional handling is allowed only for packaging-only differences.
- **Detected Characteristics**: modifies existing code, creates new entities, involves data operations; no reproducible defect and no UI-heavy surface.

## Task Characteristics

- Has reproducible defect: no
- Modifies existing code: yes
- Creates new entities: yes
- Involves data operations: yes — managed plugin trees, settings, shell configuration, receipts, journals, and rollback snapshots
- UI heavy: no

## Evidence Base

- The Phase 1 analysis identifies 136 files in `plugins/maister/`, 474 files across the three committed projections, and 80 files under `platforms/`. It also records builder sizes of approximately 582 lines for Cursor, 860 for Kiro, and 338 for Codex, plus the Kiro JSON generator.
- The portable seam is directly verifiable: the five files in `plugins/maister/skills/orchestrator-framework/bin/` exist, and `gate-evaluator.mjs` and `orchestrator-state-repository.mjs` have identical SHA-256 hashes in source, Codex, Cursor, and Kiro locations.
- No repository-level `common/`, `hosts/`, `installer/`, or `schemas/` directory exists. No shared installer receipt/journal schema, source resolver, overlay schema, or capability-evidence schema was found in the implementation tree.
- `platforms/cursor/build.sh:18-19` copies the canonical tree into a generated destination and `platforms/cursor/build.sh:50-107` applies host vocabulary, path, manifest, and file-removal rewrites. `platforms/kiro-cli/build.sh:94-160` rewrites gates and then continues with other semantic transforms; `platforms/codex-cli/build.sh:44-133` rewrites Markdown and creates platform-specific output.
- `platforms/cursor/smoke-install.sh:49-60` deletes the destination before copying. `platforms/kiro-cli/smoke-install.sh:105-120` clears the target and then rewrites paths, while `platforms/kiro-cli/smoke-install.sh:172-199` can mutate a shell rc and host settings. `platforms/codex-cli/smoke-install.sh:104-119` registers a marketplace, removes an existing selector, and mutates the installed tree for MCP.
- `Makefile:1-20` builds three committed variants; `Makefile:57-65` runs the phase-continuation contract against source plus three projections; `Makefile:47-55` and `tests/host-capability-matrix.test.sh:22-41` still require four host rows, including Claude. `.github/workflows/validate-generated-variants.yml:24-43` checks committed generated-tree drift.
- Existing safety tests are strong models for the missing lifecycle: `tests/phase-continue-contract.test.sh:73-110` and `.maister/docs/standards/testing/test-writing.md:12-18` assert byte-exact non-mutation/rollback, including directory and state effects. They do not yet cover an installer-managed tree, settings ownership, receipt recovery, or user drift.
- Current capability evidence is uneven and not target-shaped: `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:1-14` has Claude, Cursor, Kiro, and Codex rows, while the native continuation scripts for Claude, Cursor, and Kiro can return `77`/unavailable. Codex has the only supported native continuation row.
- Documentation and standards still describe the old model: `README.md:5,23-32` leads with Claude marketplace installation; `docs/codex-support.md:3-32` and `docs/kiro-cli-support.md:157-200` describe generated outputs; `.maister/docs/project/architecture.md:9-31,52-58,77-99`, `vision.md:5,20,29-34`, `tech-stack.md:49-86`, and `standards/global/build-pipeline.md:3-19` encode generated variants and Claude support.

## Impact Assessment

### Maintainer journey

Current: maintainers edit `plugins/maister/` or a host builder, run a host-specific build, inspect a generated tree, and commit source plus projection. Desired: maintainers edit the common layer or one explicit overlay, run deterministic core/overlay/install validation, and use legacy only for shadow parity during this task. The desired journey removes repeated behavior ownership but initially adds contract, receipt, recovery, and evidence artifacts.

### Installer/operator journey

Current: users choose a host-specific shell script, sometimes build first, and receive different destructive or marketplace-backed behavior. Desired: users choose `--target codex|cursor|kiro-cli` and a local or immutable GitHub source/ref; the installer stages, validates, probes compatibility, commits atomically, and reports receipt/evidence status. This is a positive reachability change, but there is currently no common entry point, status command, update policy, or migration path.

### Host integration journey

Current: host behavior is hidden in large global rewrite lists and generated output layout. Desired: every native asset and semantic binding is visible in the owning host overlay, with an allowlisted layout and capability record. This improves reviewability but makes incomplete overlay inventory and misclassified capabilities blocking issues.

### Release and support journey

Current: PR CI primarily rebuilds/checks committed variants, release runs `make build && make validate`, and support documentation names Claude plus generated trees. Desired: CI runs core once, parametrized overlay/materializer/installer checks for three hosts, and structured native evidence; release and docs must stop referring to Claude, legacy trees, and marketplace assumptions.

## Gaps Identified

### Missing Features

1. **Neutral source ownership and host overlay contract** — `common/`, `hosts/<target>/overlay.yml`, primitive bindings, path allowlists, inventory, forbidden vocabulary, settings ownership, and capability fingerprints are absent. The existing `plugins/maister/` source is explicitly Claude-oriented (`plugins/maister/.claude-plugin/plugin.json` and `plugins/maister/CLAUDE.md`), so it cannot become the neutral layer by renaming alone.
2. **Shared target-aware installer** — There is no CLI or library that resolves a local checkout/GitHub ref to immutable source, selects an overlay, probes host facts, validates compatibility, assembles staging, and installs the result for all three hosts.
3. **Transactional installation lifecycle** — No shared lock/journal/receipt store, managed-tree ownership record, settings mutation schema, active receipt pointer, recovery routine, update command, or receipt-driven uninstall/rollback exists.
4. **Capability-sensitive compatibility and structured evidence** — The current four-row matrix exposes a host-level supported/unsupported projection. It does not record capability class, host version, fingerprint, scenario, evidence level, freshness, target, or receipt provenance.
5. **Core-once/per-host evidence test architecture** — The current Makefile executes the same phase runner contract against byte-identical source and projections, while the new overlay schema, deterministic assembly, path containment, collision, receipt, recovery, settings drift, and repository-topology tests do not exist.
6. **Final support topology and documentation migration** — Claude manifests/assets/vocabulary, generated projections, old builders, generated drift CI, support docs, README instructions, project docs, and build-pipeline standards all still encode the legacy model.

### Incomplete Features

- **Portable runtime** — The five runtime modules already provide state, gate, continuation, and safety behavior, but their maintained ownership is still under a Claude-oriented tree and they are duplicated into all generated projections rather than being installed from one common source.
- **Host adapters** — Codex, Cursor, and Kiro have explicit platform directories, but those directories mix native assets with large transformation programs. The adapters are not small overlays and have no common schema or binding-completeness check.
- **Installation** — Cursor and Kiro have local copy scripts and Codex has a marketplace-mediated install script. These cover narrow smoke scenarios, not a common install/update/uninstall/rollback lifecycle with ownership and recovery.
- **Validation and evidence** — Structural and host-specific tests exist, and common transactional tests provide reusable patterns, but native evidence is uneven and unavailable outcomes are projected through a host-level boolean rather than a per-capability record.
- **Documentation and governance** — The project docs and standards accurately describe the current generated-tree system but are incomplete for the accepted target architecture; leaving them unchanged would make the repository prescribe the wrong ownership and release workflow.

### Behavioral Changes Needed

- Change `make build`/`make validate` and CI from producing and diffing committed generated trees to validating one common source plus explicit host overlays, materialization canaries, installer lifecycle, and repository topology.
- Change installation from host-specific destructive copy/marketplace scripts to `maister install --target HOST` with local/GitHub immutable source resolution, staging, compatibility decisions, atomic commit, receipt publication, update, uninstall, rollback, and recovery.
- Change generic instructions from host-tool vocabulary rewritten after the fact to neutral intent plus typed bindings only where control flow, safety, persistence, delegation, or capability semantics differ.
- Change compatibility from a four-host boolean projection to per-host/per-capability records with semantic fail-closed behavior, packaging-only provisional status, explicit evidence freshness, and no global safety override.
- Change the final supported set to Codex, Cursor, and Kiro CLI; remove Claude support and legacy generated outputs before task completion after zero-unresolved-difference shadow parity.

## User Journey Impact Assessment

The task is not UI-heavy, so there are no pages, routes, forms, or visual navigation paths to score. The relevant journey is the maintainer/operator path:

| Dimension | Current | After target implementation | Assessment |
|---|---|---|---|
| Reachability | Separate `build-*` and `smoke-install.sh` scripts, plus Codex marketplace registration | One explicit target-aware installer entry point | ⚠️ until the CLI and docs exist; ✅ after implementation |
| Discoverability | Host-specific instructions scattered across README and support docs | One install command with target, scope, source/ref, status, and receipt output | Current 3/10; target 8/10 if documented |
| Flow integration | Rebuild and copy are separate; update/uninstall behavior differs by host | Resolve → stage → validate → commit → receipt → verify/update/uninstall | ⚠️ requires lifecycle and recovery implementation |
| Multi-persona access | Maintainer, local developer, and end user follow different host paths | Same lifecycle supports local checkout/GitHub source and user/project scope | ⚠️ scope and ownership decisions remain open |

## New Capability Analysis

### Integration Points

- Common source ownership for skills, references, assets, portable runtime, primitives, and neutral vocabulary.
- Three host overlays: `codex`, `cursor`, and `kiro-cli`, including native manifests, agents, commands/skills, hooks, MCP placement, settings, and host contract tests.
- Installer CLI and libraries for source resolution, overlay loading, compatibility, assembly, validation, transaction/recovery, settings merge, and receipt storage.
- Schemas for overlays, primitives, evidence, receipts, transaction journal entries, and managed settings mutations.
- Make targets, CI workflows, release packaging, support matrices, README, host support docs, project docs, and build/test standards.
- Existing runtime, reconciliation, repository, and test fixtures as implementation patterns: `orchestrator-state-schema.mjs`, `orchestrator-state-repository.mjs`, `reconcile-advisor-config.sh`, and the byte-exact transactional tests.

### Patterns to Follow

- Preserve exact allowlists, type validation, legal transitions, canonical serialization, locks, CAS/revision checks, symlink rejection, fsync, atomic rename, and cleanup patterns from the orchestrator state repository.
- Reuse candidate staging, same-directory rename, mode/ownership preservation, and rollback diagnostics from Advisor configuration reconciliation.
- Extend the existing snapshot and injected-failure assertions to cover bytes, modes, symlinks, existence, directory topology, temporary artifacts, settings keys, journal state, and active receipt state.
- Treat `orchestrator-state.yml` as workflow truth and keep installation receipts separate; do not overload workflow state with installation lifecycle.

### Architectural Impact

High. The change introduces a new deep boundary between portable behavior, explicit host contracts, and a transaction manager, while replacing build ownership, public installation behavior, test topology, supported-host policy, release orchestration, and documentation.

## Data Lifecycle Analysis

### Entity: Managed Maister installation state

This task operates on filesystem/configuration state rather than application records. Because `ui_heavy` is false, the CLI/script path is the user-access layer in the table; there is no separate UI component.

| Operation | Backend / installer evidence | CLI access | User access/status |
|---|---|---|---|
| CREATE | Cursor copies a generated tree after deleting its destination (`platforms/cursor/smoke-install.sh:49-60`); Kiro clears and copies (`platforms/kiro-cli/smoke-install.sh:105-120`); Codex resolves a marketplace-installed tree (`platforms/codex-cli/smoke-install.sh:104-114`) | Host-specific scripts only; no common `install --target` | Direct script invocation documented; no receipt or durable ownership | ⚠️ Partial; creation exists but is destructive/non-audited |
| READ | Codex can query `.installedPath`; Cursor/Kiro retain only caller-provided destination knowledge; no shared receipt/status/verify reader | Console output and ad hoc filesystem inspection | No common status, evidence, or ownership view | ❌ Missing for the requested lifecycle |
| UPDATE | Rebuild/re-copy behavior is embedded in host scripts; no receipt-based plan or integrity/drift check | Re-run a host-specific build/install script | No common update command or rollback target | ❌ Missing |
| DELETE | Kiro removes the entire profile (`platforms/kiro-cli/smoke-uninstall.sh:35-42`); Cursor and Codex have no shared receipt-driven uninstall | Kiro-only direct script | No ownership-aware conflict handling or cross-host path | ❌ Incomplete |

**Completeness**: 25% for the requested shared lifecycle. Current scripts partially create installations and Kiro can delete an isolated profile, but no CRUD operation is complete against the common installer/receipt/ownership contract.

**Orphaned Operations**:

- CREATE without durable READ: an installed tree has no common receipt, managed inventory, source commit, or compatibility evidence.
- CREATE/UPDATE without safe recovery: destination deletion and post-copy path/config rewrites can leave partial state.
- DELETE without ownership: whole-profile removal is not based on a receipt and cannot distinguish Maister-owned files from user drift in a shared destination.
- Settings mutation without lifecycle symmetry: Kiro can change shell rc/default-agent state, but there is no shared backup, managed-key declaration, uninstall restoration, or drift report.

**Missing Touchpoints**: user versus project scope; destination containment; shared settings and shell rc; MCP opt-in; active receipt and prior receipt; update integrity; uninstall conflicts; journal recovery; JSON status output; source/ref provenance; native capability evidence.

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

1. **Host contract closure for Codex, Cursor, and Kiro CLI**: The accepted target set is known, but the exact discovery roots, native asset inventory, settings destinations, and semantic bindings are not yet represented in a versioned overlay contract.
   - Options, in order:
     1. **Contract-first overlay v1** — freeze current native layouts/assets into explicit overlays, validate E1/E2/E4 for every host, and run E5/E6 when a real runtime is available (Recommended).
     2. **Host-doc-first overlay** — define new native layouts from current host contracts and use legacy outputs only as semantic comparison fixtures.
     3. **Runtime-gated support** — do not label a host supported until its native discovery and critical scenario evidence are available.
   - Recommendation: **Contract-first overlay v1**, because it preserves the accepted three-host scope while making current assumptions reviewable and testable before legacy deletion.
   - Rationale: `platforms/*/build.sh` and support docs contain host-specific assumptions, but no shared schema proves inventory or discovery compatibility.

2. **Settings and shell-configuration ownership**: The installer must decide which mutations are Maister-owned and which files are shared with the user; current Kiro behavior mutates destination files and can append to shell rc.
   - Options, in order:
     1. **Hybrid ownership contract** — use `whole_file` for dedicated Maister files and `managed_keys` for unavoidable shared files, each with journal, backup, drift detection, and exact rollback (Recommended).
     2. **Dedicated files only** — avoid all shared-file mutation and require manual host settings where a dedicated path is unavailable.
     3. **Shared managed-key merge everywhere** — support all host settings through allowlisted parse/mutate/serialize operations, accepting formatter and recovery complexity.
   - Recommendation: **Hybrid ownership contract**, with dedicated files preferred and shared merges narrowly allowlisted.
   - Rationale: it satisfies the accepted transactional ownership decision while minimizing exposure to user formatting and concurrent configuration changes.

### Important (Should Decide)

1. **Minimum release evidence for hosts without native runtime**: Current Cursor and Kiro continuation probes return `77`/unavailable, while only Codex has a supported native continuation row.
   - Options, in order:
     1. **Require E1–E4 and shared-core E3; record E5/E6 as unavailable when the runtime is absent, never as pass (Recommended/default).**
     2. Require E5/E6 before any host can be labeled supported.
     3. Keep the host in the distribution but label it unsupported/provisional until native evidence is fresh.
   - Default: **Option 1**, consistent with the accepted evidence-boundary decision and the requirement that unavailable remain explicit.
   - Rationale: it keeps static, materialization, and transactional assurance useful without making missing external runtime look green.

2. **Evidence freshness window**: The accepted compatibility policy requires versioned capability records, but the repository has no expiry or re-probe policy.
   - Options, in order:
     1. **Per-capability expiry with host/version/scenario/timestamp renewal (Recommended/default).**
     2. Release-bound evidence that expires only when Maister or the host contract version changes.
     3. No expiry; rely on the recorded host version and manual review.
   - Default: **Option 1**.
   - Rationale: host contracts and external binaries change independently; freshness must be visible rather than inferred from a global boolean.

3. **Documentation and release migration boundary**: README, support docs, CI, project docs, and `build-pipeline.md` currently prescribe generated trees and Claude/marketplace workflows.
   - Options, in order:
     1. **Update all affected documentation, standards, Make/CI/release paths, and support matrices in this task (Recommended/default).**
     2. Implement the runtime and installer first, then maintain a follow-up documentation migration.
     3. Keep legacy instructions as a compatibility guide after the implementation.
   - Default: **Option 1**.
   - Rationale: the accepted Definition of Done requires repository topology and documentation to describe the new architecture; stale instructions would create an operationally broken release path.

## Recommendations

- Establish an M0 baseline manifest from the existing source, generated projections, host assets, hooks, permissions, references, and current test outcomes before changing ownership.
- Extract only the proven portable core first, remove foreign vocabulary from generic content, and register semantic primitives only for repeated host divergence or a safety/persistence invariant. Do not introduce a full workflow DSL or carry forward global rewrite lists.
- Define and validate overlay schemas before implementing materialization. Enforce target-root containment, collision rules, required inventory, forbidden vocabulary, binding completeness, executable modes, deterministic hashes, and native syntax.
- Implement the shared installer as an assembler and transaction manager: resolve local/GitHub source to an immutable commit, probe compatibility, lock, stage, validate, snapshot, commit, write receipt, publish active receipt, recover pending journals, and preserve user drift on update/uninstall.
- Build the test matrix around `test-core`, `test-overlay HOST`, `test-materializer HOST`, `test-install HOST`, structured native evidence, and a final repository-topology negative test. Extend existing byte-exact failure-injection tests instead of relying on exit codes.
- Run shadow parity against legacy for Codex, Cursor, and Kiro, classify every difference, and require zero unresolved semantic/inventory/reference/hook/permission differences before deleting generated trees and old builders.
- Update README, host support docs, Makefile, CI, release, capability records, project docs, and standards as one migration. Explicitly communicate the accepted Claude removal and the evidence status of each remaining host.

## Risk Assessment

- **Complexity Risk: High** — source ownership, overlay schemas, installer lifecycle, settings merge, compatibility policy, test architecture, CI, release, and documentation form one coupled migration. A partial implementation would leave two competing models.
- **Integration Risk: High** — Codex, Cursor, and Kiro differ in manifests, discovery, commands/skills, agents, hooks, settings, MCP placement, and continuation behavior. Current scripts encode these differences but do not expose a shared contract.
- **Regression Risk: High** — global rewrites currently implement gates, delegation, progress, path resolution, and safety vocabulary. Layout parity or textual diff success cannot establish semantic parity.
- **Data/Safety Risk: Critical** — Cursor/Kiro deletion-before-copy and Kiro/Codex post-install mutations can corrupt or remove managed state; shared settings and shell rc require ownership, journal, recovery, and byte-exact tests.
- **Evidence/Governance Risk: High** — native runtime availability is uneven, current capability rows include a target being removed, and stale docs/CI can publish or instruct users toward unsupported legacy paths. `unavailable` must never be converted to pass.

