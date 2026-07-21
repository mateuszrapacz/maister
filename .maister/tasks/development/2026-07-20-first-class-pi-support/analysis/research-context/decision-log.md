# Architecture decision log: first-class Pi support

## TL;DR

- Eight accepted MADRs define one coherent Pi boundary: generated package, semantic projection, native adapter, narrow settings ownership, current admission, external prerequisite, durable events and evidence.
- Maister owns canonical behavior, exact role resolution, receipts and the hash-chained execution stream; Pi and `pi-subagents` remain operator-owned runtime dependencies.
- Success requires exact observed identity, durable terminal evidence and a fresh supported runtime tuple.
- Historical parity is not accepted: the release contract evaluates only the current four-host product state.

## Key Decisions

- ADR-001: generate one private local Maister package for Pi.
- ADR-002: project commands semantically across skills, prompts and a minimal extension.
- ADR-003: use a thin direct-import adapter over public `pi-subagents/delegation` v1.
- ADR-004: own one Pi `packages[]` member through identity-aware `managed_array_entries`.
- ADR-005: use one current-state admission matrix for Codex, Cursor, Kiro CLI and Pi.
- ADR-006: keep `pi-subagents` an operator-owned prerequisite.
- ADR-007: normalize Pi observations into a versioned Maister-owned durable event contract.
- ADR-008: gate Pi support claims with fresh E1-E6 evidence.

## Open Questions / Risks

- The final command projection table may reveal additional—but still minimal—imperative extension commands.
- A future delegation protocol or runtime tuple change can invalidate E5/E6 and requires compatibility renewal.
- Public foreground delegation provides no child replay after process loss; retry cannot claim same-run resume.
- Incorrect package-identity normalization could affect shared operator settings, so schema versioning and fault-injection coverage are mandatory.
- Removing parity-specific machinery must retain every useful current-state completeness, determinism, topology and lifecycle assertion.

Date: **2026-07-19**  
Format: **MADR**  
Scope: **current four-target Maister product contract**  
Related: [high-level design](high-level-design.md), [solution exploration](solution-exploration.md), [research report](research-report.md)

## Decision index

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Generate one private local Maister package for Pi | Accepted |
| ADR-002 | Project commands by semantics across skills, prompts, and a minimal extension | Accepted |
| ADR-003 | Use a thin direct-import adapter over public `pi-subagents/delegation` v1 | Accepted |
| ADR-004 | Add identity-aware ownership for one Pi `packages[]` member | Accepted |
| ADR-005 | Use one current-state admission matrix for all four targets | Accepted |
| ADR-006 | Keep `pi-subagents` an operator-owned prerequisite | Accepted |
| ADR-007 | Version the Pi bridge observation and durable event contract | Accepted |
| ADR-008 | Gate Pi support claims with fresh E1-E6 evidence | Accepted |

---

## ADR-001: Generate one private local Maister package for Pi

### Status

Accepted.

### Context

Pi discovers extensions, skills and prompt templates through packages. Maister requires deterministic projection, a narrow ownership boundary, transactional lifecycle, provenance, archive closure and uninstallability. Loose global resources would spread ownership across user directories and make origin/collision checks harder. A self-contained npm package that bundles subagents would duplicate an operator-owned extension and expand release responsibility.

Alternatives and evidence: [Solution exploration — Decision Area 1](solution-exploration.md#decision-area-1--package-and-discovery-integration).

### Decision drivers

- canonical-source ownership and deterministic generation;
- native Pi discovery;
- one reversible lifecycle boundary;
- local checkout, archive and GitHub source equivalence;
- no ownership of unrelated user/project resources;
- reproducible release closure.

### Considered options

1. One private generated local Pi package.
2. Loose global extensions, skills, prompts and agents.
3. A published/self-contained npm package including subagents.

### Outcome

Materialize one complete package at `~/.pi/agent/maister/**`. It contains an explicit `package.json`, provenance, skills, prompt templates, a minimal extension, all namespaced agent descriptors, projection metadata and selected portable runtime files. The entire tree is Maister-owned and atomically replaceable. The release archive contains the generated package inputs/outputs but not `pi-subagents`.

### Consequences

Positive:

- one obvious ownership and provenance boundary;
- deterministic discovery and extracted-archive testing;
- clean uninstall and drift detection;
- host-specific artifacts remain generated from canonical source.

Negative:

- the projector and archive topology gain a Pi package layout;
- shared settings must register the local package;
- descriptor discovery through `pi-subagents` needs separate E5 proof.

### Validation

E1/E2 must prove the closed overlay, package manifest, complete semantic mapping, exact 28-role projection and byte-identical rebuilds. Archive tests must prove no bundled subagents and no foreign-target leakage.

---

## ADR-002: Project commands by semantics across skills, prompts, and a minimal extension

### Status

Accepted.

### Context

Pi does not provide a single resource kind equivalent to every Maister command. Treating all entries as prompt templates loses imperative host behavior and typed failures; treating all entries as extension commands unnecessarily turns declarative workflows into code and creates a large security/maintenance surface.

Alternatives and evidence: [Solution exploration — Decision Area 2](solution-exploration.md#decision-area-2--command-and-skill-projection-strategy).

### Decision drivers

- preserve behavior rather than filenames;
- minimize executable code;
- keep canonical workflows host-neutral;
- make origin and completeness mechanically testable;
- support Pi-native discovery and user ergonomics.

### Considered options

1. Hybrid semantic projection.
2. Everything as prompt templates.
3. Everything as extension commands.

### Outcome

Project reusable workflows as Pi skills, textual entry points as prompt templates, imperative host operations as extension commands, and roles as `maister-<role>` agent descriptors. Maintain a reviewed, closed command mapping that assigns every canonical entry exactly once. Generated Pi artifacts may bind host APIs but may not copy canonical behavior.

### Consequences

Positive:

- smallest executable surface;
- natural Pi resource discovery;
- explicit semantic mapping and provenance;
- portable core stays authoritative.

Negative:

- the mapping requires deliberate review and validation;
- some current command names may not map one-to-one to a Pi UI primitive;
- origin/shadowing must be checked at runtime.

### Validation

Projection tests reject missing, duplicated or wrongly classified entries. E2 proves deterministic output; E5 proves the effective installed origins and exact agent identities.

---

## ADR-003: Use a thin direct-import adapter over public `pi-subagents/delegation` v1

### Status

Accepted.

### Context

The installed `pi-subagents` 0.35.1 exposes a public delegation protocol v1 with request, start, update, response and cancel events. Empirical probes confirmed exact observed identity, bounded updates, typed unknown-agent failure and queued cancellation. Parent-facing tool mediation obscures typed failure and identity. Reimplementing subprocess orchestration would duplicate the extension and diverge from Pi-native behavior.

Alternatives and evidence: [Solution exploration — Decision Area 3](solution-exploration.md#decision-area-3--native-bridge-shape).

### Decision drivers

- use the installed native-agent extension directly;
- preserve exact identity and typed terminal states;
- avoid private APIs and reimplementation;
- retain Maister policy, resolver and durable evidence;
- enable deterministic adapter tests.

### Considered options

1. Thin direct-import adapter over delegation v1.
2. Parent-facing Pi tool/RPC mediation.
3. Maister-owned child-process reimplementation.

### Outcome

The `pi.native` adapter imports only the public `pi-subagents/delegation` v1 contract. Maister resolves the exact role and writes a durable start event before emitting a request. `requestId` equals `dispatch_id`. The adapter subscribes before emission, sanitizes updates, checks the terminal `response.agent` against the frozen plan, durably appends the terminal result, and uses v1 cancel on cancellation or post-launch persistence failure.

`resolveAgent` and `readExecutionEventStream` remain Maister-owned. There is no generic/inline fallback and no dependency on `background-work`, private RPC modules or private status/event files.

### Consequences

Positive:

- smallest bridge over a verified public contract;
- exact native behavior without surrendering governance;
- typed errors and cancellation observations;
- independently versionable normalization layer.

Negative:

- public foreground delegation cannot replay or resume a child after process loss;
- compatibility is bound to a supported protocol/version tuple;
- updates must be sanitized and bounded before persistence.

### Validation

E6 covers ordinary-role and advisor completion, exact requested/observed identities, unknown/wrong agent, malformed events, timeout, cancellation, budget failures, process loss, and durable-write failures. Static/topology checks reject private `pi-subagents` imports.

---

## ADR-004: Add identity-aware ownership for one Pi `packages[]` member

### Status

Accepted.

### Context

Pi registers packages in a shared `settings.json` array. Existing `managed_keys` ownership would claim/replace the whole `packages` value, which could destroy operator-managed packages. Requiring manual registration would make install receipts incomplete and lifecycle verification nondeterministic.

Alternatives and evidence: [Solution exploration — Decision Area 4](solution-exploration.md#decision-area-4--settings-and-package-ownership).

### Decision drivers

- least ownership in shared configuration;
- deterministic install/update/verify/uninstall;
- preservation of unrelated values, representations and order;
- exact rollback and drift refusal;
- compatibility with Pi string and object package entries.

### Considered options

1. Identity-aware `managed_array_entries`.
2. Own the complete `packages` key.
3. Never touch settings and require manual registration.

### Outcome

Add the closed ownership kind `managed_array_entries` and algorithm `pi_local_package_v1`. The algorithm extracts string or object `source`, resolves local paths relative to the settings file, and normalizes them to one absolute identity. Maister owns exactly the identity resolving to `~/.pi/agent/maister`, not the array or file.

The receipt records file/array path, identity and merge algorithm versions, normalized identity, exact installed entry, before/after hashes and modes, and backup reference. Duplicate identities, incompatible operator-owned representations, malformed JSON or drift fail before mutation. Any semantic change to normalization requires a new version and explicit receipt upgrade.

### Consequences

Positive:

- unrelated Pi packages and settings are preserved;
- the registration is still transactional, verifiable and uninstallable;
- string/object equivalence is explicit and testable.

Negative:

- receipts, drift checks, recovery and schemas gain a new ownership primitive;
- exact byte preservation during semantic merge/rollback requires careful snapshots;
- normalization bugs would be high impact and therefore fail closed.

### Validation

Tests cover string/object equivalence, relative path resolution, duplicates, conflicting filters/objects, malformed JSON, unrelated member ordering, file modes, drift, every injected commit failure, rollback and interrupted recovery.

---

## ADR-005: Use one current-state admission matrix for all four targets

### Status

Accepted. This decision supersedes the historical-parity premise discussed in the original [Solution exploration — Decision Area 5](solution-exploration.md#decision-area-5--greenfield-admission-and-release-architecture). The convergence decision explicitly selected current-state admission only.

### Context

Only the current Maister product contract matters. Pi has no useful legacy tree, and retaining an immutable historical oracle or a separate legacy target set would create two release truths. Existing useful parity checks—canonical completeness, deterministic projection, topology and lifecycle fidelity—are current invariants and do not require historical fixtures.

### Decision drivers

- one understandable product/release contract;
- equal admission for every currently supported host;
- no fabricated Pi legacy evidence;
- removal of obsolete migration complexity;
- fail-closed current artifact verification.

### Considered options

1. One current-state all-target admission matrix.
2. Current-state admission plus a non-blocking legacy audit.
3. Experimental Pi release outside the main matrix.

Historical-oracle expansion and dual-track admission were rejected with the historical-parity premise.

### Outcome

`SUPPORTED_TARGET_IDS = [codex, cursor, kiro-cli, pi]` is the only active target set. All registry, overlay, projection, lifecycle, evidence, archive, extracted-install and release gates iterate it. Remove the parity-release gate, legacy/parity fixtures and tests, parity-specific CI/Make/release metadata, and architecture wording. Replace them with a current-admission gate that preserves current completeness, determinism, topology, lifecycle, reproducibility and evidence invariants.

### Consequences

Positive:

- one source of truth for support and release;
- Pi is admitted honestly under the same current contract;
- obsolete fixtures and gate exceptions disappear;
- adding a future host has one admission path.

Negative:

- tests and documentation that encoded historical migration need removal or rewriting;
- useful assertions must be separated from their parity-specific fixture mechanism;
- release automation changes across Make, CI, packaging and evidence metadata.

### Validation

All four targets pass the same current gate. Removing any required target artifact or evidence fails admission. No product/release code references a historical target set, parity oracle or legacy fixture.

---

## ADR-006: Keep `pi-subagents` an operator-owned prerequisite

### Status

Accepted.

### Context

The user already has Pi and extensions installed and explicitly chose the subagents plugin as the native-agent foundation. Maister can validate the active extension but bundling or updating it would create conflicting package ownership, security and compatibility obligations. The package choice alternatives are described in [Solution exploration — Decision Area 1](solution-exploration.md#decision-area-1--package-and-discovery-integration), and the adapter boundary in [Decision Area 3](solution-exploration.md#decision-area-3--native-bridge-shape).

### Decision drivers

- respect operator control of the Pi toolchain;
- prevent duplicate/incompatible extension installations;
- keep Maister archives deterministic and minimal;
- make compatibility evidence explicit;
- allow independent security/update policy for the extension.

### Considered options

1. Detect and validate an operator-owned prerequisite.
2. Bundle the extension inside the Maister package.
3. Automatically install/update/remove the external extension.

### Outcome

Maister never bundles, installs, updates, configures or uninstalls `pi-subagents`. E5 reads the active configured identity/version and public protocol availability. Missing or incompatible prerequisites produce typed `unavailable` evidence and actionable remediation. Release provenance/SBOM marks the extension as external, not bundled.

### Consequences

Positive:

- clear ownership and upgrade responsibility;
- no hidden mutation of the operator's environment;
- smaller package and security boundary.

Negative:

- native support depends on an independently changing component;
- operators may need a separate installation/remediation step;
- compatibility must be renewed when the active tuple changes.

### Validation

Install/update/uninstall tests assert that external extension files and settings never change. E5 proves active version/protocol; absent/wrong/inactive cases are typed and never auto-remediated.

---

## ADR-007: Version the Pi bridge observation and durable event contract

### Status

Accepted.

### Context

The public delegation protocol is process-local. Maister's safety, audit and workflow resume guarantees require durable events independent of the extension. Directly persisting raw extension events would leak unstable/private data and couple replay to a third-party schema. The adapter choice is detailed in [Solution exploration — Decision Area 3](solution-exploration.md#decision-area-3--native-bridge-shape).

### Decision drivers

- stable audit/replay semantics across adapter versions;
- append-before-launch safety;
- exact requested/observed identity evidence;
- privacy and bounded storage;
- honest behavior after process loss.

### Considered options

1. Normalize into a versioned Maister observation schema and hash-chained stream.
2. Persist raw `pi-subagents` events as the execution record.
3. Treat Pi process/session files or background state as durable storage.

### Outcome

Define a versioned Pi observation mapping for start, bounded update, cancellation and terminal statuses. The durable stream records dispatch/attempt IDs, requested and observed external identity, normalized status, supported metrics/paths, adapter/protocol/runtime versions, and chain integrity. Sensitive or unbounded payloads are excluded. `readExecutionEventStream` reads only Maister state.

A start event must commit before request emission; a terminal event must commit before success returns. Process loss is typed failure and retry is a new attempt.

### Consequences

Positive:

- replay remains under Maister's schema and integrity rules;
- third-party schema changes are isolated in one adapter;
- success and exact identity are auditable;
- privacy rules are enforceable.

Negative:

- the adapter needs an explicit status/field translation table;
- not every extension detail is retained;
- a write failure after launch forces cancellation/failure even if the child completes.

### Validation

Golden mapping tests cover every public v1 terminal status and rejected field. Chain tests prove ordering, tamper detection, start-before-launch and terminal-before-success. Restart tests prove no child-resume claim.

---

## ADR-008: Gate Pi support claims with fresh E1-E6 evidence

### Status

Accepted.

### Context

Research probes establish feasibility, not a product support claim. Pi, Node and `pi-subagents` can change independently; installed descriptors can be shadowed; structural packaging can succeed while native discovery/runtime is unavailable. The evidence alternatives and sequencing are summarized in the [solution exploration implementation sequence](solution-exploration.md#recommended-implementation-sequence) and detailed in the [research report](research-report.md#8-evidence-and-support-levels-e1-e6).

### Decision drivers

- claims must match reproducible evidence;
- structural and native capability must remain distinguishable;
- stale successes must not mask changed runtime state;
- all targets use the same evidence vocabulary;
- releases must fail closed for the claim they make.

### Considered options

1. Versioned E1-E6 evidence with freshness and graduated claims.
2. Declare support after package discovery/version output alone.
3. Treat one research probe as permanent native-runtime evidence.

### Outcome

Pi uses the existing six-level model: E1 overlay, E2 materialization, E3 portable core, E4 installer transaction, E5 native discovery and E6 native runtime. Evidence envelopes bind source/commit, overlay/package/canonical digests, projector/scenario/schema versions, active executable realpath and Pi/Node/subagents tuple, timestamp and result.

The initial tested tuple is Pi 0.80.10, Node >=22.19 (observed 25.9.0), and `pi-subagents` 0.35.1. A changed tuple/digest/scenario or newer failed/unavailable result invalidates earlier native evidence. Provisional packaging may claim E1-E4 only; native or semantic support requires fresh E5/E6 and relevant role scenarios.

### Consequences

Positive:

- honest, granular support language;
- deterministic renewal after environment changes;
- clear separation between installability and native runtime;
- current admission can reason over one evidence model.

Negative:

- release/test cost increases with native scenarios;
- exact compatibility ranges require continuing evidence;
- a functioning but untested tuple remains unavailable by policy.

### Validation

Freshness tests mutate each bound digest/version/scenario and prove invalidation. E5 tests exact 28 identities/origins and prerequisites. E6 tests ordinary/advisor success plus typed failure/cancel paths and durable event integrity.

---

## Combined decision outcome

The eight decisions form one boundary: a deterministic Maister-owned Pi package is registered through one narrowly owned settings member; its declarative resources are projected semantically; its imperative native bridge calls the operator-owned public delegation-v1 API; Maister owns identity resolution and durable events; and one current-state four-target gate admits only claims justified by fresh E1-E6 evidence.

Any proposal to bundle `pi-subagents`, import private extension APIs, own the full Pi settings array/file, persist raw third-party session state, allow fallback identity, or reintroduce historical parity conflicts with this decision set and requires explicit superseding ADRs.
