# High-level design: first-class Pi support

## TL;DR

- Pi becomes the fourth current Maister target through one deterministic private package generated from canonical source.
- Native roles execute through a thin public `pi-subagents/delegation` v1 adapter, while Maister retains resolution, exact-identity checks and durable events.
- Installation owns only the package tree and one identity-normalized `packages[]` member, with transactional receipts and rollback.
- One current-state admission matrix covers Codex, Cursor, Kiro CLI and Pi; historical parity is removed from the active architecture.

## Key Decisions

- Use Canonical Core + Generated Host Adapter as the architecture style.
- Project workflows as skills, textual entry points as prompts, imperative operations as a minimal extension, and all 28 roles as namespaced descriptors.
- Keep `pi-subagents` operator-owned and depend only on its public delegation protocol v1.
- Add `managed_array_entries_v1` with `pi_local_package_v1` identity normalization for narrow shared-settings ownership.
- Gate support claims with fresh E1-E6 evidence in one four-target current-state release topology.

## Open Questions / Risks

- The exact command-by-command skill/prompt/extension mapping still requires a closed implementation table and review.
- Compatibility beyond the verified Pi 0.80.10, Node >=22.19 and `pi-subagents` 0.35.1 tuple needs additional evidence.
- Foreground delegation cannot resume a lost child process; process loss must remain a typed failure and retry a new dispatch.
- Array-entry normalization and multi-resource recovery are high-impact primitives that require exhaustive negative and fault-injection tests.
- Ambient Pi resources can shadow projected descriptors, so E5 must prove exact installed origins for all 28 identities.

Status: **Proposed for implementation**  
Date: **2026-07-19**  
Scope: **current Maister product contract for Codex, Cursor, Kiro CLI, and Pi**  
Related: [research report](research-report.md), [solution exploration](solution-exploration.md), [decision log](decision-log.md)

## Executive summary

Add Pi as a fourth first-class target using **Canonical Core + Generated Host Adapter**, a ports-and-adapters architecture in which Maister remains the source of truth and produces one private Pi package. The package exposes workflows as skills, textual entry points as prompt templates, and only imperative host operations as a small TypeScript extension. It exposes all canonical roles as namespaced Pi subagent descriptors.

Native execution uses a thin direct-import adapter over the public `pi-subagents/delegation` protocol v1. The extension is an operator-owned prerequisite: Maister detects and validates it but never bundles, updates, configures, or removes it. Maister retains logical-role resolution, policy, exact-identity checks, durable hash-chained execution events, receipts, recovery, and evidence.

Installation owns exactly two things: the complete generated tree at `~/.pi/agent/maister/**` and one identity-normalized member of Pi's shared `settings.json` `packages` array. Everything else in Pi remains operator-owned. A new `managed_array_entries` receipt primitive makes that narrow ownership transactional and reversible.

Release admission is one current-state matrix over all four supported targets. Historical parity, migration oracles, legacy fixtures, and parity-specific release gates are removed from the active architecture. Pi is not supportable by declaration: E1-E6 evidence must be produced for the current source and the declared runtime tuple before the corresponding support claim is allowed.

## 1. Goals and non-goals

### Goals

1. Make `pi` a closed, registry-backed target wherever current targets are enumerated.
2. Generate a deterministic, self-contained Maister Pi package from canonical source.
3. Preserve workflow, role, command, safety, and evidence semantics without copying canonical behavior into Pi-specific source.
4. Dispatch exact native Pi agents through the installed `pi-subagents` public API.
5. Preserve unrelated Pi configuration and restore exact prior state on failed install, update, or uninstall.
6. Admit releases through one current-state four-target contract and reproducible E1-E6 evidence.

### Non-goals

- Reimplementing, vendoring, installing, updating, or uninstalling `pi-subagents`.
- Depending on `pi-subagents` private modules, files, RPC internals, or process-local background state.
- Resuming a lost child process after Pi or Maister restarts. A retry is a new dispatch.
- Publishing the Maister Pi package to npm in the first implementation.
- Preserving or comparing historical host trees. There is no active legacy/parity architecture.
- Federating ambient `~/.agents/skills` into the Maister support contract.

## 2. Architecture style and boundaries

**Style:** Canonical Core + Generated Host Adapter, implemented as ports and adapters with a transactional projection boundary.

```text
canonical workflows, roles, policies and runtime contracts
                         |
                  deterministic projector
                         |
          +--------------+----------------+
          |                               |
  generated Pi package             Pi overlay/evidence
  skills/prompts/agents/extension  inventory + semantic bindings
          |                               |
          +------------ Pi host ----------+
                         |
              pi.native runtime adapter
                         |
            pi-subagents/delegation v1
                (operator-owned)
```

### Ownership boundaries

| Boundary | Maister owns | Maister must not own |
|---|---|---|
| Canonical product | canonical roles, workflows, policies, schemas, projections, evidence rules | host-specific behavior copies |
| Generated package | all bytes under `~/.pi/agent/maister/**` | any other Pi package or user/project resource |
| Shared settings | one normalized package identity in `packages[]` | the file, array, unrelated keys, order or values |
| Native adapter | public delegation-v1 request/event translation | `pi-subagents` code, configuration or private persistence |
| Runtime evidence | exact plan, sanitized events, terminal observation, hashes and versions | raw transcripts, credentials, unbounded tool arguments, private Pi sessions |
| Toolchain | version probing and compatibility decisions | Pi executable, Node, auth, providers, models or upgrades |

## 3. Logical components

| Component | Responsibility | Principal interfaces |
|---|---|---|
| Target registry | Declares `pi`, roots, overlay, adapter, archive and evidence capabilities in every closed target set | `SUPPORTED_TARGET_IDS`, target definition/schema |
| Pi overlay | Closed manifest for resources, ownership, semantic bindings, runtime and evidence | `overlay.yaml`, validation schemas |
| Pi projector | Deterministically maps canonical workflows, roles and commands into Pi-native artifacts | canonical IR in; package tree + projection manifest out |
| Package extension | Registers only imperative commands and provides the `pi.native` bridge | Pi extension API; `pi-subagents/delegation` v1 |
| Agent descriptors | Expose exact, namespaced external identities for all canonical roles | `agents/maister-*.md`, `agent-projection-v1.json` |
| Runtime composition | Resolves a frozen exact-native plan and dispatches it without fallback | `resolveAgent`, `dispatchAgent`, `readExecutionEventStream` |
| Durable event store | Appends and reads the Maister-owned hash-chained task stream | append-before-launch, append-terminal, replay |
| Settings merger | Owns one `packages[]` identity while preserving all unrelated state | `managed_array_entries`, `pi_local_package_v1` |
| Transaction engine | Stages, snapshots, commits, verifies, rolls back and recovers tree + settings as one operation | journal, backup, receipt, active pointer |
| Host/evidence probes | Establish current Pi/Node/subagents discovery and runtime capability | E5/E6 probes and evidence envelopes |
| Current admission gate | Applies the current source contract to all supported targets and release artifacts | E1-E6 matrix, archive/topology checks |

## 4. Generated package and semantic projection

### 4.1 Package tree

```text
~/.pi/agent/maister/
├── package.json
├── .maister-source.json
├── extensions/
│   └── maister.ts
├── skills/
│   └── <generated workflow skills>/SKILL.md
├── prompts/
│   └── <generated textual entry points>.md
├── agents/
│   └── maister-<canonical-role>.md       # exact 28-role bijection
├── agent-projection-v1.json
└── common/
    ├── lib/
    └── bin/
        └── <portable orchestrator runtime>
```

`package.json` contains an explicit Pi resource manifest for `extensions`, `skills`, and `prompts`. Agent descriptors live in the same package but are consumed by the installed `pi-subagents` convention. The release closure includes only selected canonical runtime files and generated Pi assets; it does not include `pi-subagents`.

### 4.2 Projection rules

The projector classifies each canonical entry point by semantics, not by its current filename:

| Canonical semantic | Pi representation | Rule |
|---|---|---|
| Reusable workflow/capability | Skill | Use when Pi should discover and invoke a structured capability with instructions and bundled resources |
| Textual user entry point | Prompt template | Use when expansion into an editable prompt preserves the complete behavior |
| Imperative host operation | Extension command | Use only for code that must inspect host state, perform typed I/O, or bridge the native runtime |
| Logical role | Namespaced subagent descriptor | One generated descriptor per canonical role; no hand-maintained role behavior |

A reviewed, closed mapping table is an implementation artifact and must cover every canonical command exactly once. Validation rejects missing entries, duplicate representations, accidental executable commands, and host-specific behavior copies.

### 4.3 Role identities

- Logical IDs remain canonical and host-neutral.
- Pi external IDs are deterministic and namespaced: `maister-<role>`.
- `agent-projection-v1.json` binds logical ID, external ID, source digest, projected descriptor digest, model/profile controls, and projector/schema version.
- Materialization proves an exact bijection with the 28 canonical roles.
- E5 proves those exact identities are discovered from the installed Maister package and are not shadowed by ambient user/project definitions.

## 5. Native runtime design

### 5.1 Closed adapter port

The existing three-method runtime surface remains authoritative:

```text
resolveAgent(input) -> frozen exact-native plan
dispatchAgent(plan) -> typed terminal result
readExecutionEventStream(task) -> durable Maister event sequence
```

The Pi adapter ID is `pi.native`. `resolveAgent` remains Maister-owned and validates canonical identity, projection, receipt/provenance, policy, target roots and requested controls. It never delegates logical-role selection to the extension.

The extension directly imports the public `pi-subagents/delegation` v1 surface. The adapter supports only the fields and statuses declared by that protocol and normalizes them into a versioned Maister observation schema. No parent-model tool call or private `pi-subagents` module is permitted.

### 5.2 Runtime sequence

```text
Caller       Resolver       Event store       Pi adapter       pi-subagents
  | resolve     |                |                 |                 |
  |------------>| validate exact plan             |                 |
  |<------------| frozen plan    |                 |                 |
  | dispatch                      |                 |                 |
  |------------------------------>| append dispatch_started          |
  |                               |<----------------|                 |
  |                               |                 | preflight v1   |
  |                               |                 | subscribe      |
  |                               |                 | request(id=dispatch_id)
  |                               |                 |--------------->|
  |                               | append sanitized started/updates |
  |                               |<----------------|<----------------|
  |                               |                 | terminal       |
  |                               |                 |<---------------|
  |                               | append exact terminal observation|
  |                               |<----------------|                 |
  |<-----------------------------------------------| typed result    |
```

Required ordering and checks:

1. Resolve a frozen plan with `adapter_id=pi.native` and exact external ID.
2. Probe active Pi realpath/version, Node version, configured/active `pi-subagents` version, delegation protocol v1, model readiness, and exact descriptor discovery.
3. Append a durable attempt/start event before launch; if it cannot be written, do not emit a request.
4. Subscribe before emitting. Use `requestId=dispatch_id`, exact `agent`, task, cwd, context and only supported controls.
5. Persist bounded, sanitized `started` and `update` observations.
6. Require a terminal v1 response and `response.agent === plan.native_role_external_id`; missing or mismatched identity is failure regardless of output or exit code.
7. Append the terminal result durably before returning success.
8. If cancellation is requested, or a post-launch durable write fails, emit v1 cancel for the same request ID and record the observed outcome. An unobserved cancellation can never become success.

### 5.3 Failure and restart semantics

Foreground delegation has no public durable replay/read-after-restart contract. Therefore:

- a process loss after launch is a typed terminal failure;
- Maister can reconstruct workflow state only from its own event stream;
- retry creates a new dispatch ID and new attempt; it never claims to resume the child;
- `background-work` active IDs and private `status.json`/`events.jsonl` files are not dependencies;
- terminal-write failure after launch remains failed/indeterminate even when Pi produced useful text.

## 6. Installation, receipt, and lifecycle

### 6.1 Overlay delta

The Pi overlay adds:

- private whole-tree root `~/.pi/agent/maister`;
- one shared settings declaration for `.pi/agent/settings.json`;
- `ownership: managed_array_entries`, `array_path: packages`;
- identity algorithm `pi_local_package_v1`;
- package entry resolving to the private root;
- Pi semantic bindings for skills, prompts, extension commands and agents;
- `pi.native` adapter, probes and E1-E6 requirements;
- archive inclusion and foreign-target exclusion rules.

Conceptual declaration:

```yaml
settings:
  - path: .pi/agent/settings.json
    format: json
    ownership: managed_array_entries
    array_path: packages
    identity: pi_local_package_v1
    entries:
      - source: ./maister
    merge_policy: preserve_unmanaged_refuse_drift
```

### 6.2 Identity normalization

`pi_local_package_v1` must match Pi's effective local-package identity:

1. Read string entries and object entries with a `source` field.
2. Resolve local paths relative to the settings file directory.
3. Normalize separators and path segments to one absolute package identity.
4. Treat `"./maister"` and `{ "source": "./maister", ... }` as the same identity.
5. Preserve the exact representation and position of every unrelated member.
6. Refuse duplicate identities, an incompatible operator-owned representation, or drift in the receipt-owned member before mutation.

The merger is schema-versioned. Changing normalization behavior requires a new algorithm version and an explicit receipt upgrade path; silent reinterpretation is forbidden.

### 6.3 Receipt delta

The receipt schema gains a versioned `managed_array_entries` section for each shared file:

```json
{
  "path": ".pi/agent/settings.json",
  "format": "json",
  "array_path": "packages",
  "identity_algorithm": "pi_local_package_v1",
  "normalized_identity": "/home/operator/.pi/agent/maister",
  "installed_entry": { "source": "./maister" },
  "merge_algorithm": "managed_array_entries_v1",
  "before": { "sha256": "...", "mode": "..." },
  "after": { "sha256": "...", "mode": "..." },
  "backup_ref": "..."
}
```

The receipt also binds source/commit, overlay, projector/schema, canonical tree, projected tree, package manifest and runtime artifact digests. It records the observed Pi/Node/subagents tuple as evidence, not as owned state.

### 6.4 Lifecycle sequence

```text
resolve immutable source
        -> preflight target + operator prerequisites
        -> materialize full package in same-filesystem staging
        -> detect path/settings/drift conflicts
        -> journal + snapshot tree/settings bytes/mode/receipt
        -> atomically replace private tree
        -> merge exactly one packages[] member
        -> verify all owned bytes and membership
        -> generate E4 and optional E5/E6
        -> publish receipt and active pointer
```

- **Install:** refuses an unmanaged destination tree or colliding package identity.
- **Update:** verifies current receipt-owned state, stages the complete new tree, preserves prior receipt/backup until commit, and never edits the external prerequisite.
- **Verify:** checks bytes, modes, links, normalized membership, projection closure and evidence freshness without mutation.
- **Uninstall:** removes only the exact receipt-owned package identity and whole private tree; all unrelated settings remain byte/semantically unchanged as applicable.
- **Rollback/recovery:** restores exact settings bytes and mode, prior tree topology, receipt and active pointer. Incomplete recovery stays journaled and blocks a new mutation.

Maister does not call `pi install` because its package/settings sequence is outside the Maister multi-resource journal.

## 7. Current-state four-target admission

### 7.1 Single admission topology

`SUPPORTED_TARGET_IDS = [codex, cursor, kiro-cli, pi]` is the only product target set. Registry, overlays, projection, materialization, lifecycle, evidence, archives, extracted installs, topology and release admission all iterate this same closed set.

The current-state admission gate verifies the repository and artifacts being released. There is no historical target set, legacy oracle, migration comparison, shadow parity, or non-blocking legacy audit in the active architecture.

### 7.2 Required removal/replacement

Implementation must:

- remove the parity-release gate and its three-target oracle assumptions;
- remove immutable legacy/parity fixtures and tests whose purpose is historical comparison;
- remove parity-specific Make/CI/release entry points and metadata fields;
- replace them with `current-admission` (name may vary) driven solely by `SUPPORTED_TARGET_IDS`;
- preserve useful current invariants—canonical completeness, deterministic projection, no foreign assets, lifecycle fidelity, archive reproducibility—as current-state assertions;
- update project architecture/roadmap wording so parity is not presented as a release or product requirement.

Removal is part of the Pi slice: keeping a second release topology would contradict the confirmed current-only contract.

### 7.3 Admission matrix

| Gate | Codex | Cursor | Kiro CLI | Pi | Release rule |
|---|---:|---:|---:|---:|---|
| Registry + closed overlay | required | required | required | required | all pass |
| E1 overlay | required | required | required | required | fresh/current |
| E2 materialization | required | required | required | required | deterministic and closed |
| E3 portable core | required | required | required | required | same canonical attestation |
| E4 transaction | required | required | required | required | install/update/verify/uninstall/rollback |
| E5 native discovery | per target claim | per target claim | per target claim | exact supported tuple | no stale success |
| E6 native runtime | per target claim | per target claim | per target claim | exact supported tuple/scenarios | no stale success |
| Archive/topology/SBOM | required | required | required | required | no foreign target leakage |
| Extracted lifecycle | required | required | required | required | archive is actually installable |

Packaging may be labeled provisional after fresh E1-E4 while E5/E6 are explicitly unavailable, but neither native nor semantic Pi support may be claimed until the corresponding fresh evidence passes.

## 8. E1-E6 evidence contract

| Level | Pi proof | Initial implementation acceptance |
|---|---|---|
| E1 `overlay-contract-v1` | closed overlay, inventory, ownership and semantic bindings | `pi` validates in all registry/schema loops; no unclassified resource |
| E2 `materialize-v1` | deterministic package, mapping and exact 28-role projection | two builds are byte-identical; missing/duplicate/wrong transform fails |
| E3 `portable-core-v1` | fresh canonical-source attestation consumed by Pi build | evidence binds source/commit/tree and generated package |
| E4 `installer-transaction-v1` | atomic tree + array-member lifecycle | success, drift refusal, injected failures, rollback and recovery all pass |
| E5 `native-discovery-v1` | active Pi/Node/subagents tuple, protocol v1, exact 28 IDs and origins | initially bind Pi 0.80.10, Node >=22.19, `pi-subagents` 0.35.1; no shadowing |
| E6 `native-runtime-v1` | ordinary-role and advisor dispatch, exact IDs, terminal result, durable event chain, failure/cancel cases | direct public-v1 use; wrong/unknown ID, timeout, cancel, lost terminal and write failure are typed |

Every envelope binds source/commit, overlay and package digests, projector/scenario/schema versions, host executable realpath/version, Node version, `pi-subagents` identity/version, timestamp, and result. A changed tuple/digest/scenario or newer failed/unavailable observation invalidates the older success for admission.

## 9. Failure modes and required behavior

| Failure | Required behavior |
|---|---|
| Pi absent, unparseable or unsupported | typed E5 unavailable; no native-support claim; structural install policy remains explicit |
| Node below declared engine | fail prerequisite before launch or mutation requiring runtime proof |
| `pi-subagents` absent, inactive, wrong version or no protocol v1 | typed unavailable with remediation; never auto-install |
| Agent descriptor missing or shadowed | E5 fails; dispatch refused |
| Unknown/wrong terminal agent | E6/dispatch fails even with exit 0 or useful output |
| Start event cannot be persisted | do not launch |
| Event write fails after launch | request cancel; record failure/indeterminate outcome; never success |
| Process dies without terminal response | typed terminal failure; retry is new dispatch |
| Shared settings malformed | fail before mutation; preserve exact bytes/mode |
| Duplicate/conflicting package identity | fail before mutation; report normalized colliders |
| Receipt-owned entry/tree drift | refuse update/uninstall unless an explicit recovery policy is invoked |
| Commit fails between tree and settings | restore both from journal; durable recovery blocks concurrent mutation |
| Archive omits Pi asset or includes foreign asset | current admission fails |
| Stale E5/E6 tuple or digest | evidence ignored; rerun required |

## 10. Security, privacy, and operational ownership

- Resolve and validate paths before mutation; reject symlink escapes, unsafe archive members and unmanaged destination trees.
- Use same-filesystem staging, restrictive private-state permissions and a single target lifecycle lock.
- Persist only bounded, sanitized runtime observations. Credentials, auth tokens, raw transcripts, full tool arguments, provider configuration and Pi session files are outside receipts and evidence.
- Treat descriptor text, child output and updates as untrusted data; never interpret them as policy or proof of identity.
- Exact identity comes from the frozen plan plus terminal protocol observation, not natural-language output.
- Pin the initially supported runtime tuple in evidence policy and fail closed on unknown protocol major versions.
- `pi-subagents` is operator-owned throughout install, update, verify and uninstall. Maister may report an exact installation/remediation command but must not execute it implicitly.
- Release provenance and SBOM identify `pi-subagents` as an external runtime prerequisite, not a bundled component.

## 11. Implementation slices and acceptance criteria

### Slice A — close the four-target product model

Add `pi` to registry/schema/overlay/probe/archive loops and replace parity-specific topology with current admission.

Acceptance:

- all target-driven tests derive the same four IDs;
- obsolete parity gate, fixtures, tests and release metadata are removed;
- current completeness/topology invariants still fail closed for any target;
- existing three hosts remain green under the new gate.

### Slice B — Pi overlay and deterministic package projection

Add the Pi overlay, package projector, semantic mapping table and 28 namespaced descriptors.

Acceptance:

- E1/E2 pass from local checkout and extracted release;
- two builds from identical inputs are byte-identical;
- all canonical commands and roles map exactly once;
- package discovery proves correct skill/prompt/extension origins without ambient shadowing.

### Slice C — narrow shared-settings ownership

Implement `managed_array_entries_v1`, receipt schema delta, transaction and recovery integration.

Acceptance:

- string/object forms normalize to one local-package identity;
- unrelated keys, array members, representations and order survive install/update/uninstall;
- duplicate/conflict/drift/malformed JSON fail before mutation;
- injected failures at every commit boundary restore exact bytes, modes, tree and receipt.

### Slice D — Pi native adapter

Implement the thin direct-import delegation-v1 adapter and host probes while retaining Maister resolver/events.

Acceptance:

- request ID equals dispatch ID and requested/observed external IDs match exactly;
- ordinary-role and advisor scenarios reach typed completed terminals;
- unknown/wrong agent, malformed event, timeout, cancel, budget, process loss and terminal-write failure are covered;
- no private `pi-subagents` import, parent-facing tool mediation, inline fallback or generic fallback exists.

### Slice E — E1-E6 and release closure

Produce evidence, archives, checksums, provenance/SBOM and extracted lifecycle tests for Pi in the current matrix.

Acceptance:

- Pi archive contains the full private package and no bundled `pi-subagents`;
- evidence freshness invalidates changed source, package, scenario or runtime tuple;
- clean local/archive/GitHub source installs produce equivalent receipts apart from source provenance;
- current admission passes all four targets and fails when any required artifact/evidence is removed.

## 12. Integration points

| Existing area | Required integration |
|---|---|
| `lib/distribution/targets.mjs` and target schema | declare `pi`, roots, settings membership, overlay, archive and capabilities |
| overlay validator/materializer | accept and validate `managed_array_entries`; generate private package |
| agent manifest/projector/validator | add Pi transform and exact 28-role mapping |
| agent resolver/runtime composition | register `pi.native`; keep resolver/event-stream contracts unchanged |
| extension source/release dependencies | compile/package `extensions/maister.ts` and its direct public import |
| installer transaction/receipt/recovery | atomically coordinate tree and one shared array member |
| host/executable probes | detect active Pi realpath/version/Node and active `pi-subagents` protocol/version |
| evidence schemas/gate evaluator | bind Pi E1-E6 tuple, digests and scenarios |
| release package/Make/CI/topology | add Pi archive and extracted lifecycle; replace parity-release with current admission |
| project documentation | describe four current hosts and remove historical-parity architecture claims |

## 13. Design invariants

1. Canonical source is authoritative; Pi artifacts are deterministic derivatives.
2. `SUPPORTED_TARGET_IDS` is the only active product target set.
3. No release decision depends on historical or legacy host trees.
4. The package tree and one normalized settings member are the complete Maister ownership surface in Pi.
5. `pi-subagents` remains external and operator-owned.
6. Only public delegation protocol v1 is an adapter dependency.
7. Maister resolves roles and durably records events; the extension only executes the exact plan.
8. Success requires both exact observed identity and a durably stored terminal event.
9. Lost execution is failure, not resumable success.
10. Support claims never exceed fresh E1-E6 evidence for the current tuple.

## 14. Open implementation details

These are closed engineering mappings, not unresolved architecture decisions:

- the exact per-command skill/prompt/extension table;
- the concrete receipt schema version number and migration helper name;
- the final current-admission script/Make target name;
- the minimal set of extension commands required after mapping review;
- the exact supported Pi minor range after compatibility tests beyond the verified 0.80.10 tuple.

They must preserve the decisions and invariants above. Any need to bundle `pi-subagents`, use private APIs, broaden settings ownership, or reintroduce historical parity requires a new architecture decision.
