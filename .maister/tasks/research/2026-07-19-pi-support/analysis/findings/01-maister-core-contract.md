# Maister Core Contract: Change Surface for First-Class Pi Support

## TL;DR
Maister's distribution lifecycle is mostly registry-driven, but its agent projection, exact-native runtime, parity oracle, Make/CI release loops, and several user-facing validators remain closed over exactly Codex, Cursor, and Kiro CLI.
Adding `pi` therefore requires more than a registry row: it needs a Pi overlay/inventory, a fourth projection identity and execution-profile column, a `pi-subagents` native bridge/adapter registration, evidence probing, and release/test parameterization.
The strongest reusable invariant is the existing three-method runtime port plus the exact-native adapter's fail-closed identity check; Pi should satisfy that port through `pi-subagents`, not bypass or reimplement it.
The largest structural blocker is the historical parity gate, whose immutable pre-deletion oracle can never truthfully contain a Pi legacy tree; Pi needs a separate greenfield admission path while retaining the historical gate for the three migrated targets.

## Key Decisions
- Treat `pi` as a fourth first-class target contract, not as a Codex/Kiro alias and not as an unmanaged extension installed beside Maister.
- Keep `plugins/maister/agents/` and canonical skills as the only behavior-bearing sources; generate Pi-native role descriptors/prompts or package resources during materialization.
- Reuse the closed runtime port (`resolveAgent`, `dispatchAgent`, `readExecutionEventStream`) and exact-native observation semantics; implement only the host bridge to installed `pi-subagents` plus Pi-specific projection and discovery.
- Separate the historical three-target shadow-parity gate from greenfield target admission. Pi should pass overlay/materialization/install/runtime/evidence/release tests, but must not receive a fabricated legacy-oracle row.
- Parameterize all loops from a central target contract where behavior is uniform, while keeping explicit target adapters/transforms where host semantics differ.

## Open Questions / Risks
- The exact Pi managed roots, package/settings ownership, projected agent identity, and native launch/event APIs are delegated to the Pi host and `pi-subagents` findings; choosing these incorrectly could turn a safe `whole_tree` install into destructive ownership of operator state.
- `pi-subagents` may launch a selected agent but fail to expose independently observable identity or durable inspection. In that case Pi must remain typed `unavailable` for exact-native E6 even if interactive delegation appears to work.
- Adding `pi` directly to `SUPPORTED_TARGET_IDS` currently breaks the immutable historical parity oracle contract before any Pi code can pass release validation.
- Pi may need multiple managed roots (package-private resources plus shared agent/package discovery). That changes receipt/journal snapshots and must retain one target lock, leaf-set ownership, collision checks, and byte-exact rollback.
- The repository was dirty during research; conclusions are bound to commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`, with pre-existing modified/untracked content listed under Provenance. Confidence in cited tracked source is high; no conclusion relies on untracked implementation code.

## Scope and Provenance

**Fact — high confidence.** This report examines the tracked Maister core at commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`. At capture time `git status --short` reported `.gitignore` modified and untracked `.maister/tasks/...`, `.pi-subagents/`, research notes, and `dist/`. Production sources were not edited by this gatherer. Evidence: `plugins/maister/lib/distribution/**`, `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/**`, `plugins/maister/bin/**`, `tests/platform-independent/**`, `Makefile`, and `.github/workflows/**` at that commit.

**Research boundary.** Pi filesystem and `pi-subagents` implementation details are intentionally not asserted here. This category identifies the Maister-side contract and preliminary change surface that those host findings must satisfy.

## 1. Current Target Flow

### 1.1 Registry and CLI admission

**Fact — high confidence.** `plugins/maister/lib/distribution/targets.mjs:5-40` is the central distribution registry. It freezes exactly three definitions (`codex`, `cursor`, `kiro-cli`) with overlay ID, discovery root, managed roots/ownership, host probe, and probe executable, then derives `SUPPORTED_TARGET_IDS`. `cli-contract.mjs` consumes that list for argument admission (`plugins/maister/lib/distribution/cli-contract.mjs:2,16-17,45`), and journal/receipt/path code imports the same registry (`journal-schema.mjs:5,166`; `receipt-schema.mjs:6,130-138`; `target-paths.mjs:5,20-45`).

**Fact — high confidence.** The registry is immutable by design: `Makefile:3-5` rejects caller-defined `SUPPORTED_TARGETS`. `tests/platform-independent/target-registry.test.mjs:29-80` proves every registered target passes CLI/journal validation, snapshots exact managed roots, and places all roots for a target under one target-specific lock.

**Inference — high confidence.** A correct Pi implementation begins with a registry entry, but that alone only opens generic CLI/journal/receipt/path code. It does not open the independently closed projection/runtime/release contracts described below.

### 1.2 Overlay validation

**Fact — high confidence.** Every target is represented by `plugins/maister/overlays/<target>/overlay.yml` plus `inventory.yml`. The overlay schema is closed: it permits only enumerated top-level fields, six required semantic primitives, evidence IDs E1-E6, declared layout/settings ownership, native assets/hashes, and an agent projection (`overlay-loader.mjs:18,50-82,193-278,324-380,509-569`). Target IDs must already exist in `SUPPORTED_TARGET_IDS` (`overlay-loader.mjs:193-200`).

**Fact — high confidence.** The six semantic bindings are `user_gate`, `delegate_agent`, `track_progress`, `resolve_task_root`, `persist_state`, and `continue_workflow`; all must be present, closed, and `fail_closed: true` (`overlay-loader.mjs:55-62,262-278`). Real overlays bind those primitives to host-specific adapters while sharing the evidence model; see `plugins/maister/overlays/codex/overlay.yml`, `cursor/overlay.yml`, and `kiro-cli/overlay.yml`, especially their `semantic_bindings`, `capabilities`, `native_assets`, and `agent_projection` sections.

**Fact — high confidence.** Overlay projection identity is a separate hard-coded map of exactly three targets: Codex → `codex.exec`/prompt-schema, Cursor → `cursor.native`/Markdown, Kiro → `kiro-cli.native`/descriptor-prompt (`overlay-loader.mjs:50-54,358-380`). Thus a Pi overlay is rejected until this map defines Pi's adapter, representation, and support inventory contract.

### 1.3 Materialization and provenance

**Fact — high confidence.** `materialize()` resolves/revalidates immutable source, creates an empty same-filesystem staging root, builds/copies the overlay plan, projects canonical agents, enumerates staged output, validates inventory/syntax/modes/references/native hashes/projected hashes/content, and only then finalizes source+overlay+projection provenance (`materializer.mjs:1000-1118`, especially `1060-1096`). Failure removes a staging root created by the operation (`materializer.mjs:1119-1121`).

**Fact — high confidence.** Projection is intentionally cross-target. Before projecting the selected target, the materializer loads all projection overlays from a second hard-coded target list `['codex','cursor','kiro-cli']`, reconstructs canonical IR from immutable `agents/` and `skills/`, builds the full manifest, loads only declared support assets, and projects into staging (`materializer.mjs:40,924-993`). Hand-maintained projected leaves are removed from the ordinary assembly plan (`materializer.mjs:957-969`).

**Invariant — high confidence.** Pi must preserve this sequence and ownership boundary: canonical bytes → validated IR/manifest → Pi projection inside isolated staging → complete validation → provenance digest. A checked-in Pi copy of the 28 role bodies would violate the architecture described in `.maister/docs/project/architecture.md` (“Canonical agent projection”) and the materializer's current design.

### 1.4 Agent IR, manifest, and projection

**Fact — high confidence.** The projection contract is closed over three targets in several places:

- `plugins/maister/agent-projection-v1.json:222-273` declares three target identities/destinations/transforms; every role row then has exactly three `execution_profiles` keys (`:275-302`).
- `agent-manifest.mjs:17-21` defines exact target IDs and expected adapter/representation/identity templates; `validateTargets()` and `validateRoles()` require exact fields for all targets (`:259-318`), and overlays must also use those exact keys (`:433-446`).
- `agent-projector.mjs:19-23` and `agent-projection-validator.mjs:22-30` define target identity, transforms, and output kinds. `canonicalOutputs()` has explicit Codex, Cursor, and final Kiro branches (`agent-projector.mjs:224-296`).
- `materializer.mjs:40` and `production-runtime.mjs:218-227` independently load all three overlays to reconstruct the manifest.

**Fact — high confidence.** Canonical completeness is exact: the projector requires the sorted 28-role IR, one manifest row per role for the target, exact source digest/binding, declared transforms, safe destinations, and no normalized path collision (`agent-projector.mjs:58-150`). Support agents are a separate inventory and cannot satisfy canonical coverage (`agent-projector.mjs:299-363`; `agent-projection-validator.mjs:166-199`).

**Recommendation — high confidence.** Add Pi to the projection contract atomically across the JSON contract, overlay identity validator, manifest schema, projector, projection validator, materializer overlay set, fixtures, and all 28 role execution-profile maps. Partial registration should fail tests, which is desirable.

### 1.5 Transactional installation and receipts

**Fact — high confidence.** Paths derive from target definitions and keep state outside plugin/workflow state at `$XDG_STATE_HOME/maister/<target>` with lock, journals, receipts, backups, staging, and active receipt (`target-paths.mjs:20-45`). Managed roots carry explicit ownership and are serialized under one target lock (`target-registry.test.mjs:53-80`). Kiro demonstrates the supported multi-root pattern: one `whole_tree` private root and one `leaf_set` native-agent root (`targets.mjs:27-35`).

**Fact — high confidence.** Receipt validation compares root IDs/order/ownership to the target definition (`receipt-schema.mjs:116-149`), validates managed inventory/settings/evidence, and requires each compatibility evaluation to classify every required evidence level exactly once (`receipt-schema.mjs:223-270`). Candidate receipts require passed E1-E4 (`receipt-schema.mjs:292-311`). Transaction code binds E1 overlay contract, E2 materialization, consumed E3 portable-core attestation, E4 installer transaction, and E5/E6 native evidence (`transaction-manager.mjs:34-39,132-209,213-263`).

**Invariant — high confidence.** Pi-owned paths must be narrowly declared. Dedicated Maister/package files can use whole-file/tree ownership; anything in shared Pi settings or agent directories needs managed-key or leaf-set ownership with drift detection. All receipt-listed state must roll back byte/mode/symlink/topology exactly while unlisted operator content remains untouched, per `.maister/docs/project/architecture.md` (“Installation transaction”) and `tests/platform-independent/installer-transaction.test.mjs`.

### 1.6 Exact-native runtime

**Fact — high confidence.** The public runtime interface is already the desired abstraction. `createAgentRuntime()` returns only `resolveAgent`, `dispatchAgent`, and `readExecutionEventStream` (`agent-runtime/create-runtime.mjs:10-40`). Dispatch uses a projection-bound preparer and a closed adapter map; there is no generic inline fallback (`dispatch-agent.mjs:73-83`).

**Fact — high confidence.** Runtime target identity is independently closed:

- Resolver target contracts: `agent-runtime/agent-resolver.mjs:17-21,157`.
- Adapter factory arguments/registrations: `host-adapters/index.mjs:1-10` and `create-runtime.mjs:26-30`.
- Production owner accepted targets and bridge routing: `production-owner.mjs:22,67,86-105,138-145`.
- Installed runtime native-port selection: `production-runtime.mjs:201,246-260`.

**Fact — high confidence.** Non-Codex hosts share an exact-native adapter whose injected port has `inspect` and `launch`, optional `cancel`, and host-owned credentials/version metadata (`production-owner.mjs:86-105`). It refuses launch when exact launch or observable identity is absent, records durable attempt/terminal events around the side effect, compares observed identity byte-for-byte with the plan, and turns mismatch into `E_AGENT_WRONG_OBSERVED_IDENTITY` (`host-adapters/exact-native.mjs:48-101`). A durable-write failure can trigger best-effort cancellation (`:34-46,81-100`).

**Recommendation — high confidence.** Pi should follow the non-Codex exact-native route: add `pi.native` and a Pi native port whose `launch` delegates through installed `pi-subagents`. The bridge must return an independently observed `observed_native_role_external_id`; if `pi-subagents` cannot provide that, `inspect.observable_identity` must be false and dispatch must remain `unavailable`. Do not add a Pi special case that reports success from text output alone.

## 2. Hard-Coded Assumption Inventory

| Area | Closed assumption | Evidence | Pi consequence |
|---|---|---|---|
| Distribution registry | Exactly three definition rows and immutable caller interface | `targets.mjs:5-40`; `Makefile:3-5` | Add a first-class row; choose managed roots/ownership from verified Pi discovery rules. |
| Overlay validation | Three projection identities; target must be registered | `overlay-loader.mjs:50-54,193-200,358-380` | Add Pi identity/representation/support schema and overlay+inventory. |
| Projection contract | Exact three target keys in targets, profiles, roles, support | `agent-projection-v1.json:222-302`; `agent-manifest.mjs:17-21,259-318` | Schema/version migration is needed; every canonical role gets a Pi profile. |
| Projection implementation | Explicit three identities/transforms/output branches | `agent-projector.mjs:19-23,224-296`; `agent-projection-validator.mjs:22-30` | Implement a Pi projection shape and validation/reference closure. |
| Materializer | Loads exactly three overlays to build the manifest | `materializer.mjs:40,924-993` | Include Pi atomically or derive from the projection contract. |
| Resolver/runtime | Three target contracts and adapter slots | `agent-resolver.mjs:17-21`; `create-runtime.mjs:26-30` | Add Pi resolver contract, adapter, and `nativePorts.pi`. |
| Production bridge | Owner target set and native-port routing name only Cursor/Kiro | `production-owner.mjs:22,67,138-145`; `production-runtime.mjs:246-260` | Register Pi bridge; keep the same closed bridge response schema. |
| Host probes | Probe map imports/exports exactly Codex/Cursor/Kiro implementations | `host-probes/index.mjs:1-13,27-29` | Add Pi E5/E6 probe and version-bound scenario; unavailable prerequisites stay unavailable. |
| Validator errors | User-facing strings list three targets | `validate-overlay.mjs:34-35`; `release-interface.mjs:70-71`; `production-runtime.mjs:201` | Derive messages from registry to prevent drift. |
| Make/CI | Explicit three `test-overlay` and package commands | `Makefile:54-58`; `.github/workflows/validate-generated-variants.yml:32-36`; `.github/workflows/release.yml:37-42` | Add Pi now; preferably introduce a deterministic registry-derived loop with tests. |
| Release package closure | Registry-driven foreign-overlay descriptors, but target-specific forbidden paths | `release-interface.mjs:91-169`; `release-package.test.mjs:248-325` | Include Pi contract descriptors in every archive, Pi assets only in Pi archive, and generalize forbidden behavior-tree checks. |
| Historical parity | Oracle keys must exactly equal supported IDs; every target needs a legacy Git tree | `parity-release.mjs:73-96,165-204`; `parity-oracle/manifest.json`; `parity-release.test.mjs:11-52` | Cannot truthfully add greenfield Pi; split migrated-target parity from supported-target admission. |
| Documentation | Vision names exactly Codex, Cursor, Kiro | `.maister/docs/project/vision.md` | Update only after verified implementation/support level is established. |

## 3. Invariants Pi Must Preserve

1. **One behavior owner — high confidence.** Canonical skills/agents remain in `plugins/maister/skills/`, `plugins/maister/agents/`, and common source. Pi assets declare layout and transforms, not duplicated role behavior.
2. **Closed target contract — high confidence.** Unknown fields, unsafe paths, undeclared transforms, missing roles, collisions, foreign vocabulary, and missing native hashes fail before installation (`overlay-loader.mjs`; `agent-projector.mjs`; `materializer.mjs`).
3. **Immutable source/provenance — high confidence.** Selected overlay and canonical sources come from the same resolved checkout/archive; projection/source/overlay/materialized digests flow into receipt and evidence (`materializer.mjs:1000-1118`; `production-runtime.mjs:201-233`).
4. **Transactional ownership — high confidence.** One target lock covers all Pi managed roots. Receipt inventory is authoritative for managed state; shared settings preserve unmanaged keys and reject drift; recovery is byte-exact.
5. **Exact agent identity — high confidence.** Resolver accepts only canonical logical IDs, selects the exact projected native ID, and launch must independently observe the same ID. Missing capability is `unavailable`, never inline fallback or semantic pass (`exact-native.mjs:48-101`).
6. **Durable execution evidence — high confidence.** `dispatch_started`, `attempt_started`, attempt completion, and terminal result are appended to the private hash-chained task stream; failure to durably record is a failed dispatch, not success (`exact-native.mjs`; `execution-event-writer.mjs:379-387`).
7. **Evidence honesty/freshness — high confidence.** E1-E4 form the structural/transactional baseline; E5/E6 remain unavailable until executable, authentication, discovery/identity, and a version-bound runtime scenario exist (`evidence-policy.mjs:11-23,66-142`; `.maister/docs/project/architecture.md`, “Evidence”).
8. **Deterministic release closure — high confidence.** Each target archive contains canonical source/runtime plus all overlay/inventory contracts, but only selected target assets; archive ordering, hashes, E3 binding, extracted lifecycle, SBOM, and provenance remain reproducible (`release-interface.mjs:80-169`; `release-package.test.mjs:248-325`; `.github/workflows/release.yml:20-58`).

## 4. Preliminary Pi Change Surface

### Slice A — Target admission and overlay

**Recommendation — high confidence.** Add a `pi` row to `targets.mjs` only together with:

- `plugins/maister/overlays/pi/overlay.yml`, `inventory.yml`, and the minimum native/package metadata assets;
- a verified `probe: 'pi'` implementation and executable/prerequisite contract;
- managed roots that distinguish Maister-private package files from any shared Pi discovery/settings leaves;
- semantic bindings for all six primitives, with `delegate_agent` bound to `pi.native` backed by `pi-subagents`;
- E1-E6 capability requirements consistent with current hosts.

The exact Pi paths/settings keys are blocked on host-contract evidence and must not be guessed here.

### Slice B — Canonical Pi projection

**Recommendation — high confidence.** Upgrade `agent-projection-v1.json` (or introduce a compatible v2 if the schema meaning changes) with:

- target identity: proposed adapter `pi.native`;
- a Pi representation name based on verified Pi agent/package descriptors;
- destination kinds/templates/modes for every canonical role;
- explicit Pi transforms and execution profiles for read-only, read-only-shell, and workspace-write policy classes;
- optional support inventory only for genuine Pi-native helpers not covering canonical roles.

Then extend `overlay-loader.mjs`, `agent-manifest.mjs`, `agent-projector.mjs`, `agent-projection-validator.mjs`, and `materializer.mjs`. Prefer deriving target lists from the validated projection contract where possible, but retain explicit allowlisted adapter/representation/transform implementations.

### Slice C — `pi-subagents` runtime bridge

**Recommendation — high confidence.** Add `host-adapters/pi.mjs` as a thin wrapper over `createExactNativeAdapter`, register it in `host-adapters/index.mjs`, and thread `nativePorts.pi` through `create-runtime.mjs`, `production-runtime.mjs`, and `production-owner.mjs`. Add the Pi resolver target contract in `agent-resolver.mjs`.

The host bridge, rather than Maister core, should own Pi executable/package version discovery, authentication, extension availability, and invocation of `pi-subagents`. Its port must implement:

- `inspect({adapter_id:'pi.native', native_role_external_id})` → exact launch and observable-identity booleans;
- `launch(...)` → bounded output, native observations, and exact observed agent ID;
- optional `cancel(...)` only if the extension exposes a real cancellation path.

This is the smallest change that preserves Maister's three-method port and avoids reimplementing subagents.

### Slice D — install/evidence/release

**Recommendation — high confidence.** Add Pi to generic lifecycle matrices and introduce Pi-specific fixtures for shared settings/package ownership, missing extension/version mismatch, identity collision, wrong observed identity, and rollback across all managed roots. Add `host-probes/pi.mjs` and a version-bound E5 discovery/E6 invocation scenario; missing `pi`, missing `pi-subagents`, incompatible version, authentication failure, or unobservable identity must yield typed `unavailable`/`blocked`.

Add Pi package commands to CI/release and extend archive assertions. Refactor the parity gate to distinguish:

- `MIGRATED_PARITY_TARGET_IDS = ['codex','cursor','kiro-cli']` for the immutable legacy oracle; and
- all `SUPPORTED_TARGET_IDS` for overlay, materialization, install, runtime, evidence, package, extracted lifecycle, and metadata gates.

Do not mutate the legacy oracle with a synthetic Pi tree.

### Slice E — tests most likely to change

**Recommendation — high confidence.** Parameterize and extend at minimum:

- `target-registry.test.mjs`, `overlay-contract.test.mjs`, `source-materializer.test.mjs`;
- `agent-ir.test.mjs`, `agent-projection.test.mjs`, `agent-resolver.test.mjs`, `agent-adapters.test.mjs`, `agent-runtime-composition.test.mjs`, `agent-execution-events.test.mjs`, `agent-gate-cli.test.mjs`;
- `installer-transaction.test.mjs`, `evidence-parity-topology.test.mjs`;
- `make-interface.test.mjs`, `release-package.test.mjs`, `parity-release.test.mjs`, `repository-topology.test.mjs`;
- relevant fixtures under `tests/fixtures/platform-independent/overlays/`, projection/runtime fixtures, and CI workflows.

Critical negative tests should prove: adding only a registry row fails; missing Pi overlay/profile/transform fails before staging writes; `pi-subagents` absence never falls back; wrong observed ID fails; event-write failure triggers cancellation where available; shared Pi state survives install/update/uninstall byte-for-byte; Pi assets never leak into non-Pi packages; Pi is not required to have a historical legacy parity tree.

## 5. Empirical Evidence Ledger

### Probe MC-1 — focused target/overlay/projection/runtime suites

- **Hypothesis:** current source enforces three-target completeness and exact projection/runtime invariants.
- **Command:** `rtk node --test tests/platform-independent/target-registry.test.mjs tests/platform-independent/overlay-contract.test.mjs tests/platform-independent/agent-ir.test.mjs tests/platform-independent/agent-projection.test.mjs tests/platform-independent/agent-runtime-composition.test.mjs`
- **Environment:** repository checkout at commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`; Node `v25.9.0`; no active host configuration targeted.
- **Captured:** research session ending before UTC capture `2026-07-19T12:34:21Z`.
- **Result:** exit `0`; 52 tests, 52 passed, 0 failed/cancelled/skipped. Tests included exact canonical bijection for every current host, deterministic projection bytes/digests, three valid real overlay fixtures, rejection of incomplete/unsafe projections, central-registry CLI/journal admission, stable managed-root ownership, and a composed exact-native runtime with durable events.
- **Side effects:** test fixtures used isolated temporary paths; tracked production source status was unchanged.
- **Conclusion:** current invariants are executable and strong, but expected target sets are three-wide. **Confidence: high.**

### Probe MC-2 — real overlay validation

- **Hypothesis:** all currently registered overlays validate through the release interface, and the interface enumerates the registry.
- **Command:** `rtk node plugins/maister/bin/release-interface.mjs validate-overlays`
- **Environment:** same checkout and Node version as MC-1.
- **Captured:** research session ending before UTC capture `2026-07-19T12:34:21Z`.
- **Result:** exit `0`; JSON `ok:true` for Codex, Cursor, and Kiro CLI. Contract hashes: Codex `c83e71b5c93a90fa9d3156b10e6cf825989666222535763de550de9a27982aea`, Cursor `2aab3fc107bd057899407888e55a353638987c41b6af9b50494edc6f2904f447`, Kiro CLI `35807b34e89c09fb682baeb9caa33708dd0ec770a872ece683a2521b05343e0b`.
- **Side effects:** read/validation only; tracked production source status was unchanged.
- **Conclusion:** registry-driven overlay validation is a reusable extension point, but no Pi contract currently exists. **Confidence: high.**

## 6. Findings Summary by Confidence

- **High-confidence facts:** target registry, overlay schema, projection contract, materialization sequence, receipt/evidence schema, exact-native adapter, release package closure, and immutable legacy parity gate are directly supported by tracked source plus passing focused tests.
- **High-confidence inference:** Pi cannot be implemented safely as a single registry/overlay patch; projection/runtime/release/parity changes are mandatory because independent closed enums and branches reject it.
- **High-confidence recommendation:** use `pi-subagents` behind the existing exact-native port and keep unobservable identity as unavailable.
- **Medium-confidence recommendation:** `pi.native` is the clearest adapter ID and Pi likely needs more than one managed root, but exact representation and roots must be finalized from the Pi host/distribution findings.
- **Low-confidence/blocked detail:** exact Pi package tree, settings keys, descriptor syntax, native ID format, and cancellation/event mapping are intentionally unresolved in this report.
