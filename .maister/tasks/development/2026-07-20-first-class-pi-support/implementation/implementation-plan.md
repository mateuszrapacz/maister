# Implementation Plan: First-Class Pi Support

## TL;DR

Implement Pi as a fourth first-class Maister target through the existing target, overlay, materializer, transaction, runtime, evidence, and release seams. The implementation is a single generated package under `<agentRoot>/maister`, a closed hybrid projection of 29 skills, 14 commands, and 28 agent descriptors, one identity-managed `settings.json:packages[]` member, and a `pi.native` adapter over the public `pi-subagents/delegation` v1 contract.

The work must land in dependency order: close target and overlay validation, add deterministic projection and package closure, add managed-array transaction semantics, add the public runtime/event bridge, add version-bound E1–E6 probes, then replace active historical parity gating with current four-target admission. The release path promotes to `pi.native-semantic` only when fresh E5/E6 records pass together; otherwise it remains explicitly provisional or unavailable.

## Key Decisions

- Keep canonical behavior in `plugins/maister/`; Pi output is generated only in materializer staging and is never hand-maintained.
- Use target id `pi` and adapter id `pi.native`; the package root is `PI_CODING_AGENT_DIR/maister`, defaulting to `~/.pi/agent/maister`.
- Project skills to `skills/**`, commands to `prompts/**`, and agents to `agents/maister-<role>.md`; declare Pi's public package-agent discovery contract as `pi.subagents.agents: ["./agents"]` and do not generate `commands/**`.
- Own only the generated package tree and one normalized identity in `settings.json:packages[]`. Preserve all unrelated entries, fields, order, modes, and topology.
- Import only the public `pi-subagents/delegation` entry. A missing or mismatched prerequisite is typed `unavailable`; it never triggers a private import, fallback host, or inline execution.
- Remove active three-target parity admission. Current release admission is exactly `[codex, cursor, kiro-cli, pi]`; any retained historical comparison is non-gating context only.
- Do not claim native or semantic support from package inspection. E5 requires discovery of all 28 exact identities; E6 requires the full ordinary and advisor delegation lifecycle with durable Maister events. Once both pass on one binding, publish only the validated `pi.native-semantic` claim.

## Open Questions & Risks

- E1 must verify the public Pi 0.80.10 `ExtensionAPI` and `EventBus` signatures in the actual executable tuple before native claims are published.
- E5 depends on the active Pi package-manager resolution producing `sourceInfo` for every `maister:<role>` descriptor and rejecting ambient collisions.
- Foreground process loss has no replay/resume contract. After `started`, it must be terminal `process_lost`; a retry receives a new `dispatch_id` and is never called resume.
- `managed_array_entries_v1` crosses every transaction and recovery boundary. Any incomplete receipt, drift, or rollback path is a release blocker because unrelated Pi packages must remain untouched.
- Removing active parity code can accidentally remove target-independent assertions. The implementation log must record each changed historical assertion and the replacement current-state proof.

## Planning Inputs and Constraints

Authoritative inputs:

- `.maister/tasks/development/2026-07-20-first-class-pi-support/implementation/spec.md`, especially Appendix A.
- `analysis/codebase-analysis.md`, `analysis/requirements.md`, `analysis/gap-analysis.md`, `analysis/scope-clarifications.md`.
- `verification/spec-audit.md`, which reports all 18 prior findings addressed and leaves E1/E5/E6 as implementation evidence obligations.
- Project documentation indexed by `.maister/docs/INDEX.md`, including architecture, build-pipeline, error-handling, minimal-implementation, validation, and testing standards.

Constraints:

- No production source is changed until the implementation-approval gate is explicitly approved.
- Every artifact-writing implementation group records its work in `.maister/tasks/development/2026-07-20-first-class-pi-support/implementation/implementation-log.md`.
- Generated output must remain deterministic, LF/UTF-8, bytewise sorted, symlink-free, and limited to the closed package inventory.
- Existing Codex, Cursor, and Kiro CLI behavior remains green except for documented current-admission rewrites.

## Dependency Graph and Execution Waves

| Group | Purpose | Depends on | Can run in parallel with |
| --- | --- | --- | --- |
| G1 | Target registry, Pi overlay, schema, and inventory | Specification approval | G3 after contract review |
| G2 | Closed projection, package materialization, and provenance | G1 | — |
| G3 | Managed-array ownership and transactional lifecycle | G1 | G2 after shared receipt shape is agreed |
| G4 | `pi.native`, public delegation v1, and durable observations | G2 and G3 | — |
| G5 | Host probes and E1–E6 evidence policy/producers | G2, G3, G4 | G6 after evidence schema is stable |
| G6 | Archive, release, Make, CI, and current all-target admission | G1, G2, G3, G5 | G5 fixture work after schema freeze |
| G7 | Integrated acceptance, extracted lifecycle, and handoff evidence | G4, G5, G6 | none |

Recommended waves:

1. **Wave 1:** G1. Review the exact Pi overlay and target closure before any generated output is implemented.
2. **Wave 2:** G2 and G3 in parallel. G2 owns projection/package files; G3 owns settings/transaction files, so their write scopes do not overlap.
3. **Wave 3:** G4. It consumes the generated package contract and the transaction receipt identity.
4. **Wave 4:** G5 and the non-release fixture portion of G6 in parallel after G4 event/status names are frozen.
5. **Wave 5:** finish G6, then run G7 as one integrated lifecycle against the same source/date inputs.

## Task Groups

### G1 — Register Pi and close the overlay contract

**Purpose:** Make `pi` a valid target before projection or installation code can refer to it.

**Owned write scope:**

- `plugins/maister/lib/distribution/targets.mjs`
- `plugins/maister/lib/distribution/target-paths.mjs`
- `plugins/maister/lib/distribution/overlay-loader.mjs`
- `plugins/maister/overlays/schema/overlay-v1.schema.json`
- `plugins/maister/overlays/pi/overlay.yml`
- `plugins/maister/overlays/pi/inventory.yml`
- `tests/fixtures/platform-independent/overlays/pi/overlay.yml`
- `tests/fixtures/platform-independent/overlays/pi/inventory.yml`
- Pi cases in `tests/platform-independent/target-registry.test.mjs` and `tests/platform-independent/overlay-contract.test.mjs`.

**Implementation steps:**

1. Add `pi` to `definitions`, `SUPPORTED_TARGETS`, `SUPPORTED_TARGET_IDS`, and path resolution with projection identity `pi.native`.
2. Define `agentRoot` precedence (`PI_CODING_AGENT_DIR`, otherwise `$HOME/.pi/agent`), settings path, package containment, POSIX-only support, and the package-private tree ownership row.
3. Add the `managed_array_entries` ownership kind and the exact `settings.json:packages[]` row to the strict overlay schema. Unknown fields, foreign target vocabulary, unsafe paths, duplicate destinations, unresolved tokens, incomplete inventories, and missing semantic bindings must fail validation.
4. Encode all six bindings (`user_gate`, `delegate_agent`, `track_progress`, `resolve_task_root`, `persist_state`, `continue_workflow`), compatibility tuple, executable/prerequisite probes, required closure, forbidden topology, and closed command/role inventory in the Pi overlay/inventory.
5. Add fixtures for accepted Pi overlay data and rejection cases: unknown field, escaping package root, duplicate destination, incomplete role list, missing binding, and bundled `pi-subagents`.

**Tests and evidence:**

- Registry returns Pi exactly once and keeps existing target identities unchanged.
- Overlay validation accepts the closed Pi contract and rejects each unsafe/incomplete fixture before materialization.
- E1 is not passed by registry presence alone; the resulting record must still bind source, overlay, and schema digests.

**Exit condition:** `make test-overlay TARGET=pi` and target-registry/overlay-contract tests pass, with no Pi path outside the declared `agentRoot` boundary.

### G2 — Implement closed projection and deterministic Pi package materialization

**Purpose:** Generate the exact package closure without creating a second behavior source.

**Owned write scope:**

- `plugins/maister/lib/distribution/agent-projector.mjs`
- `plugins/maister/lib/distribution/agent-projection-validator.mjs`
- `plugins/maister/lib/distribution/materializer.mjs`
- `plugins/maister/lib/distribution/provenance.mjs`
- New `plugins/maister/lib/distribution/pi-command-projection.mjs` for the closed Pi command map; its public contract is `pi-command-projection-v1`.
- Pi-specific cases in `tests/platform-independent/agent-projection.test.mjs` and `tests/platform-independent/source-materializer.test.mjs`.
- New `tests/platform-independent/pi-package-projection.test.mjs` and its Pi package/projection fixtures.

**Implementation steps:**

1. Add Pi to the projection target table and assembly plan. Read the canonical 29 skill directories, 14 command files, and 28 role files from the existing roots; do not add hand-maintained copies.
2. Emit `skills/<id>/**` using the existing skill/reference transform, `prompts/<command>.md` using `pi-prompt-v1`, and `agents/maister-<role>.md` using `pi-agent-frontmatter-v1`.
3. Generate the exact manifest shape: `name`, `version`, `private`, `description`, `pi.extensions`, `pi.skills`, `pi.prompts`, and the public package-agent discovery contract `pi.subagents.agents: ["./agents"]`. Reject a top-level `agents` manifest key, a `commands/` directory, optional unlisted resources, symlinks, `node_modules`, credentials, sessions, auth, other overlays, and external `pi-subagents` files.
4. Generate `agent-projection-v1.json`, `pi-command-projection-v1.json`, `.maister-source.json`, the extension entry point, and the overlay-listed `common/**`, `lib/**`, `bin/**`, and `orchestrator-framework/**` closure. Every row carries canonical origin, source digest, projection schema, manifest/package digest, and execution profile.
5. Validate exact-once source/destination bijection before enumeration and hashing. Reject omissions, duplicates, stale command hashes, shadowed origins, unsafe outputs, wrong origins, and unexpected role IDs.
6. Preserve deterministic file ordering, LF/UTF-8 encoding, inventory modes, fixed package-root mode, and source/date inputs in provenance. Two runs from equal inputs must produce byte-identical trees and matching provenance.

**Tests and evidence:**

- `pi-package-projection.test.mjs`: 29 skills, 14 commands, 28 roles, exact destinations, exact frontmatter identities, command origin map, manifest shape, forbidden closure, and stale/missing digest rejection.
- `source-materializer.test.mjs`: two equal materializations are byte-identical, and changed source/date inputs invalidate the expected provenance.
- `agent-projection.test.mjs`: existing target behavior remains green and Pi does not broaden another target's output.
- E2/E3 records bind the package tree, projection, source tree, and portable runtime closure.

**Exit condition:** A staged Pi package passes the closed inventory and all 28 projected role IDs exist exactly once before any installer commit is attempted.

### G3 — Add `managed_array_entries_v1` and thread it through transactions

**Purpose:** Own one Pi package identity without claiming the shared `packages[]` array.

**Owned write scope:**

- `plugins/maister/lib/distribution/settings-owner.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/lib/distribution/receipt-schema.mjs`
- `plugins/maister/lib/distribution/journal-schema.mjs`
- `plugins/maister/lib/distribution/drift-detector.mjs`
- `plugins/maister/lib/distribution/recovery.mjs`
- `plugins/maister/lib/distribution/path-safety.mjs`
- Existing transaction tests: `tests/platform-independent/installer-transaction.test.mjs`, `installer-abrupt-crash.test.mjs`, `installer-multiple-journals.test.mjs`.
- New `tests/platform-independent/pi-managed-array.test.mjs` and settings fixtures.

**Algorithm:**

1. Under the existing lock, parse settings strictly and compute the preflight full-file hash, mode, topology, and unmanaged projection. Malformed JSON or a non-array `packages` property fails before mutation.
2. Normalize string/object `source` identities by expanding `~`, resolving relative paths against `settings.json`, normalizing separators and NFC, preserving case, resolving realpaths, and requiring containment under `agentRoot`.
3. Match exactly one generated package identity. Preserve an existing string as string and an existing object as object with all fields unchanged. Interpret only `source`, `autoload`, `extensions`, `skills`, `prompts`, and `themes`; preserve unknown object fields opaquely.
4. Refuse duplicate identities, incompatible filters, disabled `autoload` for a native claim, escaping/ambiguous symlinks, source drift, and concurrent writes. Preserve unrelated member values, order, representation, modes, symlinks, and topology.
5. On absent settings create the minimal `0600` document. On absent `packages` add only that property. On update/remove change only the owned member.
6. Record `managed_array_entries_v1` / `pi_local_package_v1`, settings/array paths, normalized identity, before/after entries and hashes, unmanaged projection hash, modes, and backup reference in the receipt.
7. Stage the package tree and settings snapshot on the same filesystem, commit the tree first, then the managed entry, then verify. Roll back both owned surfaces on failure; retain backup and return unresolved recovery status/code 7 if rollback itself fails.

**Tests and evidence:**

- String and object identity equivalence, object-field preservation, missing settings/property, malformed JSON, non-array packages, duplicate identity, conflicting filters, disabled autoload, path containment, symlink, mode, and order tests in `pi-managed-array.test.mjs`.
- Inject failures before tree commit, after tree commit, after settings commit, during verify, and during rollback. Compare bytes, modes, symlinks, existence, and topology with `tests/helpers/filesystem-snapshot.mjs`.
- Concurrent writer and drift tests prove no operator change is overwritten.
- E4 is passed only after install/update/verify/uninstall, receipts, rollback, recovery, and fault-injection suites pass.

**Exit condition:** The existing transaction lifecycle is unchanged for other ownership kinds, and every Pi rejection leaves unrelated settings state byte-exact and topology-exact.

### G4 — Implement `pi.native`, the public delegation bridge, and durable observations

**Purpose:** Provide the only approved Pi native runtime boundary and map it to Maister's existing runtime port.

**Owned write scope:**

- New `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/pi-native.mjs`.
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/index.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-runtime.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/agent-resolver.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/dispatch-agent.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/dispatch-contract.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-schema.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-payload.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs`
- New `plugins/maister/lib/distribution/pi-extension-source.mjs` for the canonical extension source/template; generated `extensions/maister.ts` output itself remains owned by G2.
- `tests/platform-independent/agent-adapters.test.mjs`, `agent-resolver.test.mjs`, `agent-runtime-composition.test.mjs`, `agent-execution-events.test.mjs`, and new `tests/platform-independent/pi-native-adapter.test.mjs`.

**Implementation steps:**

1. Resolve only exact `maister:<role>` IDs from the active receipt/projection and freeze source digest, external ID, and execution profile before dispatch.
2. Import only the named public delegation exports and require protocol version `1`: request, started, update, response, and cancel event constants. Do not deep-import private Pi or `pi-subagents` modules.
3. Build the closed request with `requestId === dispatch_id`, `version: 1`, frozen agent/task/context/cwd, and bounded optional budgets (`timeoutMs=900000`, max turns `8`, hard tool budget `64`). Reject oversize requests before side effects.
4. Append durable `dispatch_requested` before emitting the request, subscribe to all response channels before emission, sanitize bounded updates, and map terminal statuses exactly as Appendix A.7 defines.
5. Verify terminal `response.agent` against the frozen role. Wrong/missing identity, malformed events, duplicate active IDs, response for another request, process exit without response, and post-cancel missing response are typed failures.
6. Implement best-effort public cancellation with the same request ID. Process loss after `started` is terminal `process_lost`; retry allocates a fresh request/dispatch ID and `retry_of` link.
7. Write `maister-observation-v1` JSONL with sequence, canonical JSON, SHA-256 previous-hash chain, LF, fsync, bounded/redacted payloads, and read-time chain verification. A pre-request durable-write failure prevents Pi side effects; a later write failure cannot claim success.
8. Register exactly one generated Pi command, `maister-delegate`, and use Pi's public `ExtensionAPI`/`EventBus` plus `session_shutdown` cleanup. E1 will verify the concrete Pi 0.80.10 signatures.

**Tests and evidence:**

- `pi-native-adapter.test.mjs`: exact request fields, subscriptions-before-emit, duplicate IDs, ordinary/advisor context, response identity, status mapping, cancellation, timeout/budget, malformed events, process loss, and retry identity.
- `agent-execution-events.test.mjs`: event ordering, update bounds/redaction, canonical JSON, fsync failure, sequence/hash continuity, and no raw transcript/auth persistence.
- Existing adapter/runtime tests prove Pi selection does not change other host adapters.
- E5 is unavailable until final-package discovery and all 28 identities pass; E6 is unavailable until the complete ordinary and advisor lifecycle matrix passes.

**Exit condition:** Unit and hermetic adapter tests pass with a fake public delegation module; no private import or fallback execution path exists.

### G5 — Add version-bound host probes and E1–E6 evidence production

**Purpose:** Make support claims reflect observed host/package/runtime evidence rather than feasibility assumptions.

**Owned write scope:**

- `plugins/maister/lib/distribution/evidence-policy.mjs`
- `plugins/maister/lib/distribution/evidence-schema.mjs`
- `plugins/maister/lib/distribution/e3-attestation.mjs`
- `plugins/maister/lib/distribution/host-probes/index.mjs`
- New `plugins/maister/lib/distribution/host-probes/pi.mjs`
- New `plugins/maister/lib/distribution/host-probes/scenarios/pi.mjs`
- New `tests/platform-independent/pi-evidence.test.mjs` and E1–E6 fixtures.

**Implementation steps:**

1. Resolve the Pi executable from `PATH`, follow its realpath, run that exact executable for version, resolve its own Pi package manifest, record `process.execPath`/Node version, resolve the active `pi-subagents` package identity, and import only `pi-subagents/delegation`.
2. Produce typed reasons for `pi_missing`, `pi_version_mismatch`, `node_engine_mismatch`, `delegation_package_missing`, `delegation_version_mismatch`, `public_export_missing`, `protocol_mismatch`, unsupported platform, and missing readiness. Never downgrade a missing prerequisite to pass.
3. Emit evidence envelopes with target/capability, result/reason/remediation, source/overlay/projection/package hashes, executable realpath/version, Node, prerequisite identity/version/digest, protocol/schema/scenario versions, timestamps, expiry, and artifact references.
4. Set E1/E2 for registry/overlay/package/projection closure, E3 for portable-core binding, E4 for lifecycle/settings/recovery, E5 for exact final package discovery and collision control, and E6 for the full public delegation lifecycle.
5. Implement expiry/invalidation: E1–E4 expire after 30 days, E5/E6 after 14 days; source, overlay, projection, package, host, prerequisite, schema, or scenario identity changes invalidate a pass; a newer failed/unavailable observation invalidates the old pass.
6. Encode the graduated admission table. Permit `pi.structural-transactional.provisional` only with E1–E4 passed and explicit E5/E6 unavailable; promote to `pi.native-semantic` only when both E5 and E6 pass on the same fresh binding.

**Tests and evidence:**

- `pi-evidence.test.mjs` covers exact tuple resolution, wrong executable/package identity, export/protocol absence, freshness/invalidation, unavailable reasons, and claim truth table.
- E5 fixtures discover all 28 package descriptors and reject ambient/project/user collisions, missing `sourceInfo`, disabled descriptors, duplicate IDs, and precedence ambiguity.
- E6 fixtures cover ordinary and advisor dispatch, progress bounds, cancellation, timeout/budget, wrong identity, process loss, and durable event chain.

**Exit condition:** Evidence records are deterministic, provenance-bound, fail closed, and distinguish provisional structural/transactional support from the fully evidenced `pi.native-semantic` claim.

### G6 — Replace historical parity release gating with current four-target admission

**Purpose:** Package and release Pi without making the historical three-target oracle a false gate.

**Owned write scope:**

- `plugins/maister/bin/release-interface.mjs`
- `plugins/maister/bin/release-metadata.mjs`
- `plugins/maister/bin/parity-release.mjs` only where needed to remove active historical gating; do not retain a hidden three-target path.
- `Makefile`
- `.github/workflows/validate-generated-variants.yml`
- `.github/workflows/release.yml`
- `tests/platform-independent/make-interface.test.mjs`
- `tests/platform-independent/release-package.test.mjs`
- `tests/platform-independent/repository-topology.test.mjs`
- Existing `tests/platform-independent/parity-release.test.mjs` rewritten or removed with a replacement `tests/platform-independent/current-target-admission.test.mjs`.
- `tests/fixtures/platform-independent/parity-oracle/manifest.json` and parity-specific evidence fixtures only if they are no longer referenced after the admission rewrite.

**Implementation steps:**

1. Replace target loops and release metadata assumptions with the exact current target set `[codex, cursor, kiro-cli, pi]`; retain target-independent assertions without parity naming.
2. Add Pi overlay/package staging, checksums, deterministic tar/gzip settings, modes, uid/gid, `SOURCE_DATE_EPOCH`, SBOM/provenance, extracted lifecycle smoke, and external `pi-subagents` prerequisite metadata.
3. Ensure archives contain only Pi closure and never `node_modules`, credentials, auth, trust, sessions, `.pi` state, or bundled `pi-subagents`.
4. Make CI run Pi overlay validation, materialization, core/runtime/evidence suites, target-aware loops, and current-target release admission. A missing host remains explicit unavailable and does not incorrectly fail structural packaging.
5. Update release metadata to publish `pi.structural-transactional.provisional` when E1–E4 pass and E5/E6 are explicit unavailable, or `pi.native-semantic` when the complete bound E1–E6 manifest passes; never publish a native/semantic claim without its evidence.
6. For every removed or changed parity assertion, hand off old assertion, new assertion, rationale, and proving test to G7, which owns the implementation log.

**Tests and evidence:**

- `current-target-admission.test.mjs` proves exactly four current targets and proves no active three-target parity oracle is required.
- `release-package.test.mjs` and `repository-topology.test.mjs` prove archive closure, no external prerequisite bundling, deterministic output, and no forbidden sensitive state.
- `make-interface.test.mjs` and CI YAML checks prove all target loops include Pi.

**Exit condition:** `make validate`, target-focused suites, package/archive checks, and current-state release admission pass without an active historical parity gate.

### G7 — Integrated lifecycle, acceptance matrix, and implementation handoff

**Purpose:** Prove that the cross-cutting slice works as one lifecycle and leave evidence for the implementation executor.

**Owned write scope:**

- New `tests/platform-independent/pi-integration.test.mjs` for the hermetic materialize → install → verify → update → uninstall → fault/recovery path.
- `.maister/tasks/development/2026-07-20-first-class-pi-support/implementation/implementation-log.md`.
- Verification/evidence outputs under the task directory only; no source changes in this group.

**Execution checklist:**

1. Materialize twice with identical source/date inputs and compare package bytes, modes, inventory, projection, and provenance.
2. Install with absent settings, existing unrelated string/object packages, incompatible filters, drift, concurrent writer, and injected failure cases.
3. Verify package discovery and record E5 unavailable or passed with exact reason and remediation. Never infer E5 from package files alone.
4. Run ordinary and advisor E6 scenario matrices against the pinned tuple. Check request/response identity, bounded updates, cancellation, terminal failures, process loss, retry IDs, and durable hash chains.
5. Run update, uninstall, rollback, crash recovery, and extracted archive smoke; assert unrelated settings, auth, trust, sessions, packages, and external prerequisites remain untouched.
6. Run the complete traceability matrix and write the final implementation log before Phase 8 completion.

**Exit condition:** All acceptance criteria in the specification are either passed with evidence or explicitly marked unavailable with typed remediation; no unresolved critical transaction, identity, event, or release issue remains.

## Traceability Matrix

| Specification contract / acceptance | Implementation group | Concrete proof |
| --- | --- | --- |
| Target `pi`, adapter `pi.native`, overlay schema, paths, six bindings (Sections 2–3, A.5) | G1 | `target-registry.test.mjs`, `overlay-contract.test.mjs`, E1 |
| 29 skills + 14 commands exact-once map and digests (A.1) | G2 | `pi-package-projection.test.mjs`, `agent-projection.test.mjs`, E2 |
| 28 role identity/discovery bijection (A.2) | G2 + G5 | projection fixture, E2, E5 collision/discovery scenarios |
| Version/executable/prerequisite resolution (A.3) | G5 | `pi-evidence.test.mjs`, E1/E5 unavailable cases |
| Exact package manifest and forbidden closure (A.4) | G2 + G6 | materializer/package/archive/topology tests, E2/E3 |
| Managed-array identity, filters, preservation, receipt (A.6) | G3 | `pi-managed-array.test.mjs`, `installer-transaction.test.mjs`, E4 |
| Public delegation v1 request/status/cancel contract (A.7) | G4 | `pi-native-adapter.test.mjs`, E5/E6 |
| Durable `maister-observation-v1` stream (A.8) | G4 | `agent-execution-events.test.mjs`, E6 |
| Evidence envelope, freshness, invalidation, graduated claims (A.9) | G5 | `pi-evidence.test.mjs`, evidence fixtures, E1–E6 |
| Lock, journal, commit ordering, rollback, recovery, platform rules (A.10) | G3 + G6 | transaction/crash/recovery/integration tests, E4 and archive smoke |
| Current four-target release admission and parity removal (A.10–A.11) | G6 | `current-target-admission.test.mjs`, Make/CI/release tests |
| Full lifecycle and implementation log (A.11) | G7 | `pi-integration.test.mjs`, `implementation-log.md` |

## Verification Matrix

| Layer | Required checks | Blocking result |
| --- | --- | --- |
| Unit/contract | Registry, overlay schema, source map, exact manifests, identity normalization, request/status/event schemas | Any contract mismatch blocks the group |
| Transactional | Byte/mode/topology snapshots, drift, concurrent writer, rollback, unresolved journal, crash recovery | Any unrelated-state mutation blocks E4 and release |
| Runtime | Public exports, subscribe-before-emit, exact identity, bounded updates, cancellation, process loss, retry IDs | Any fallback/private import/identity mismatch blocks E5/E6 |
| Evidence | Version-bound envelope, expiry/invalidation, unavailable reasons, E1–E6 claim table | Unavailable cannot be coerced into pass |
| Package/release | Deterministic archive, source-date epoch, target closure, SBOM/provenance, external prerequisite, current target set | Any forbidden member or active parity gate blocks release |
| Integrated | Materialize/install/verify/update/uninstall/recovery plus ordinary/advisor lifecycle | Must satisfy all applicable acceptance criteria |

## Risk Register

| ID | Risk | Mitigation | Owner group | Exit signal |
| --- | --- | --- | --- | --- |
| R1 | Actual Pi `ExtensionAPI`/`EventBus` differs from researched signatures | E1 probe against Pi 0.80.10 executable; fail closed | G4/G5 | E1 passed or typed unavailable |
| R2 | Ambient package-agent collision or missing `sourceInfo` | Hermetic discovery fixture over all 28 IDs and collision rejection | G5 | E5 passed or unavailable with remediation |
| R3 | Settings merge damages unrelated packages | Identity normalization, unmanaged projection hash, byte/mode/topology snapshots, fault injection | G3 | E4 full lifecycle green |
| R4 | Process loss is misreported as success/resume | Terminal `process_lost`, new retry IDs, no replay claim | G4 | E6 process-loss scenario green |
| R5 | Removing parity gate removes useful shared coverage | Replace only active admission assertions and log each change | G6 | current-target suite plus existing target suites green |
| R6 | Provisional package is mistaken for native support | Evidence truth table, explicit unavailable records, and a separate full-pass claim label | G5/G6 | claim tests reject E5/E6 absence and accept only bound E1-E6 promotion |
| R7 | Generated closure drifts from canonical sources | Exact source/destination bijection, digest checks, deterministic double materialization | G2 | E2/E3 and materializer tests green |

## Evidence-Dependent Unresolved Questions

These are not design decisions awaiting user input; they are host observations that must remain unresolved until implementation evidence exists:

1. Does the pinned Pi 0.80.10 executable expose exactly the documented `ExtensionFactory`, `ExtensionAPI.on`, `registerCommand`, and `EventBus.on/emit` signatures used by the generated extension?
2. Does the active Pi package-manager/settings resolution identify `pi-subagents` 0.35.1 at the exact package source expected by delegation v1?
3. Does the final generated package produce one and only one discoverable `maister:<role>` descriptor for every one of the 28 roles with correct `sourceInfo` under hermetic collision conditions? **Resolved by the fresh E5 host run: yes for the pinned tuple.**

## Definition of Done

- Every group exit condition is met and recorded in `implementation/implementation-log.md`.
- `make validate` and the Pi-focused suites pass; existing target suites remain green.
- E1–E4 are passed before claiming structural/transactional support. E5/E6 are either passed together with complete evidence and promote `pi.native-semantic`, or are published as typed unavailable under the provisional path; neither is silently omitted.
- The generated archive is deterministic and contains no forbidden or operator-owned state.
- The current release target set is exactly Codex, Cursor, Kiro CLI, and Pi, with no active historical three-target parity gate.
- The implementation-approval gate is answered explicitly before the implementation executor is invoked.
