# Phase 1: Codebase Analysis

## TL;DR
Maister has reusable deterministic materialization, transactional lifecycle, exact-agent runtime, durable event, and fail-closed evidence foundations, but every supported-target seam currently closes over Codex, Cursor, and Kiro CLI.
Pi support is a high-risk, cross-cutting target slice: registry, overlay, 28-role projection, package materialization, managed `packages[]` ownership, runtime bridge, evidence, packaging, CI, and tests must land together.
The research recommendation is compatible with the architecture: one generated user-scope Pi package, hybrid semantic projection, public `pi-subagents/delegation` v1, and Maister-owned policy/evidence.
The active design conflict is whether the three-target historical parity oracle remains a release gate or is replaced by current-state all-target admission as decided in ADR-005.

## Key Decisions
- Treat Pi as a new first-class target with adapter identity `pi.native`, not as an alias or unmanaged sidecar — the registry, overlay, projection, runtime, and release contracts are target-aware and closed.
- Keep canonical behavior in `plugins/maister/` and generate Pi artifacts only inside materializer staging — this preserves source ownership, provenance, and deterministic release closure.
- Extend settings ownership with an identity-aware managed-array entry primitive rather than claiming the whole Pi `packages` array — shared settings must preserve unrelated operator entries byte-for-byte and semantically.
- Use the public `pi-subagents/delegation` v1 boundary while keeping exact role resolution, terminal identity validation, and durable event persistence in Maister — this avoids private API coupling and inline fallback.

## Open Questions / Risks
- The research corpus contains a material policy conflict: older sections describe a three-target historical parity oracle while ADR-005 selects current-state all-target admission; this must be resolved before release/test scope is frozen.
- The future Pi package must prove discovery and collision behavior for all 28 namespaced agent descriptors, not only the research probe's builtin `researcher` role.
- `managed_array_entries` affects transaction, receipt, drift, rollback, recovery, and fault-injection semantics; a partial implementation could damage unrelated Pi package registrations.
- Public foreground delegation is process-local and lacks durable replay/resume; process loss after `started` must become a typed terminal failure while Maister's event stream remains intact.

## Current Architecture and Integration Surface

### Target and overlay contracts

- `plugins/maister/lib/distribution/targets.mjs` owns `definitions`, `SUPPORTED_TARGETS`, `SUPPORTED_TARGET_IDS`, and `getTargetDefinition`; it currently admits only `codex`, `cursor`, and `kiro-cli`.
- `plugins/maister/lib/distribution/overlay-loader.mjs` validates ownership, projection identity, settings, inventories, semantic bindings, and target-specific vocabulary. `plugins/maister/overlays/schema/overlay-v1.schema.json` is the closed schema that must gain the Pi contract.
- `plugins/maister/overlays/` contains no Pi overlay or inventory. A valid addition therefore needs registry, overlay, inventory, six semantic bindings, required/forbidden topology, host probes, managed roots, and evidence requirements atomically.

### Canonical projection and materialization

- `plugins/maister/lib/distribution/agent-manifest.mjs` defines the canonical role set and projection manifest; `plugins/maister/lib/distribution/agent-projector.mjs` emits target artifacts.
- `plugins/maister/lib/distribution/materializer.mjs` owns `AGENT_PROJECTION_TARGETS`, `buildAssemblyPlan`, `projectCanonicalAgents`, staged assembly, validation, hashing, and provenance. Pi must be a closed projection target and must not introduce checked-in behavior copies.
- The research design calls for exactly 28 `maister-<role>` descriptors, skills, prompt views, a minimal extension bridge, and private portable runtime closure under one generated package.

### Installation, settings, and recovery

- `plugins/maister/lib/distribution/settings-owner.mjs` currently supports `whole_file` and `managed_keys`; Pi's one local package registration requires an identity-aware `managed_array_entries` ownership kind.
- `plugins/maister/lib/distribution/transaction-manager.mjs`, `receipt-schema.mjs`, `journal-schema.mjs`, and `recovery.mjs` provide locking, staging, snapshots, drift checks, injected-failure recovery, byte/mode/topology restoration, and receipt publication. The new ownership kind must participate in every boundary.
- Pi-owned scope should be `~/.pi/agent/maister/**` plus one identity-managed `packages[]` member. Active Pi, auth, sessions, trust, unrelated packages, and external `pi-subagents` remain operator-owned.

### Runtime, events, and evidence

- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-runtime.mjs` constructs the production runtime; `host-adapters/exact-native.mjs` is the neutral native bridge seam.
- `execution-event-writer.mjs` owns append-only hash-chained execution events. The Pi adapter must append the planned start before the side effect, subscribe before emitting a delegation request, sanitize bounded updates, verify terminal `response.agent`, and append a typed terminal result.
- `plugins/maister/lib/distribution/evidence-policy.mjs` and `host-probes/index.mjs` define target/capability/version/scenario/provenance/expiry evidence and fail-closed unavailable states. Pi needs E1-E6 producers and version-bound host/executable probes; successful research probes do not authorize a support claim.

### Packaging, release, and test closure

- `plugins/maister/bin/release-interface.mjs`, `Makefile`, `.github/workflows/validate-generated-variants.yml`, and `.github/workflows/release.yml` encode target loops, deterministic archives, provenance, SBOM/checksums, extracted lifecycle, and release gates over the existing three targets.
- Core coverage is concentrated in `tests/platform-independent/installer-transaction.test.mjs`, `agent-projection.test.mjs`, `evidence-parity-topology.test.mjs`, plus target registry, overlay, materializer, runtime, release, topology, and Make-interface suites. Pi requires parameterized coverage where possible and Pi-specific fixtures at package/discovery/native boundaries.
- The research's accepted architecture requires replacing or separating historical parity-specific assumptions before enabling four-target release admission; stale three-target assertions must not be silently broadened.

## Task Characteristics

```yaml
risk_level: high
task_characteristics:
  has_reproducible_defect: false
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: true
  ui_heavy: false
```

## Phase Summary

Phase 1 found a reusable but strongly three-target architecture. Pi support requires an end-to-end target slice across registry, overlay, projection, materialization, managed-array ownership, transactions/recovery, runtime, events, evidence, packaging, release, CI, and tests. Implementation scope cannot be finalized until the parity policy and Pi host/ownership contracts are resolved.
