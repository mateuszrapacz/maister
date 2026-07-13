# Specification: Codex Fully Automatic Continuation

## TL;DR

Maister will execute safe Codex `fully_automatic` gates through one shared evaluator and a thin Codex binding, without adding a command or UI.
Agreement ends with the Advisor's choice; disagreement uses one logical Arbiter, including all bounded retries under that identity.
The complete decision is persisted before projections or routing, then a durable workflow-owned dispatch starts the next same-phase item or phase in the active turn.
Codex remains `unsupported` until a real host-native end-to-end test proves the complete no-UI path.

## Key Decisions

- Use the accepted A3/B1/C1/D1 architecture — it separates shared decision semantics, durable state, workflow routing, and host mechanics.
- Keep one executable evaluator in the canonical orchestrator framework — Codex must not acquire a separate policy implementation.
- Make the evaluator own the complete pending-to-terminal gate envelope — the runner verifies persisted provenance instead of reconstructing it.
- Keep work inventory, target selection, outbox, and receipts workflow-owned — the runner remains domain-agnostic.
- Use `orchestrator.current_phase` as the only mutable phase cursor — schema migration removes the current split meaning with `started_phase`.
- Serialize state commits with a task-local lock and revision compare-and-swap — evaluator and runner are sequential writers to one authoritative YAML snapshot.
- Treat exactly-once as one logical effect — physical dispatch may retry only with the same stable `dispatch_id`, and the receiver deduplicates it.
- Keep the Codex capability declaration `unsupported` until real native evidence exits successfully — fake-port and shared contract tests are necessary but insufficient.

## Open Questions / Risks

- The exact Codex active-turn hook must be demonstrated by a narrow implementation spike. If D1 is empirically impossible, work stops for scope clarification before considering the researched MCP fallback.
- Legacy state can contain `started_phase`, no revision, and gate records of different richness. Ambiguous migration must fail closed without changing bytes, permissions, or directory topology.
- A crash after a dispatch effect but before its acknowledgement can cause a physical retry; correctness depends on receiver deduplication by the original `dispatch_id`.
- State, report, phase, and dispatch crash windows cross multiple commits. Recovery must resume the last durable checkpoint without replaying completed role calls or logical effects.

## Goal

Make eligible Codex `fully_automatic` gates select, persist, route, and begin their next target without user interaction, while preserving Maister's auditability, resumability, protected-gate safety, and cross-platform canonical ownership.

## User Stories

- As a Maister workflow operator, I want safe automatic gates to continue inside my current Codex turn so that I am not asked to approve the recommendation the system is configured to resolve automatically.
- As a Maister workflow operator, I want protected, ambiguous, unsupported, or exhausted decisions to stop safely so that automation never overrides decisions that require me.
- As a workflow maintainer, I want one shared gate state machine and full provenance so that every host applies the same agreement, arbitration, retry, and resume rules.
- As a maintainer diagnosing interruption or retry, I want stable work and dispatch identities with durable receipts so that I can distinguish one logical continuation from repeated transport attempts.

## Core Requirements

1. **R1 — Transparent entry points (must):** Existing `maister:*` workflow invocations remain the only user entry points. The repair introduces no new command, prompt convention, or UI.
2. **R2 — Eligibility before automation (must):** Automatic evaluation runs only when the configured policy is `fully_automatic`, the gate is configurable and not denylisted, and the host capability path is eligible. Protected and denylisted gates remain explicit user decisions.
3. **R3 — Stable gate identity and reuse (must):** The runtime derives a deterministic idempotency key from the exact phase, gate type, question, and ordered options, and reuses a matching terminal record before invoking a role, presenting a user gate, or dispatching work.
4. **R4 — Exact gate context (must):** The evaluator receives an allowlisted context containing stable gate identity, ordered options, original recommendation, safety classification, phase identity, and read-only workflow context. Unknown, malformed, duplicate, or unsafe data is rejected.
5. **R5 — Durable pending and attempts (must):** The evaluator persists one gate envelope from pending through terminal state. Role identities, models, each bounded attempt, response or error, retry exhaustion, and timestamps are durable before later effects depend on them.
6. **R6 — Strict role response contract (must):** Advisor and Arbiter responses contain exactly `selected_option`, `rationale`, `confidence`, and `escalate_to_user`; the selected option must be legal and all invalid or transient responses follow configured bounded retry and backoff rules.
7. **R7 — Agreement behavior (must):** When the original recommendation and valid Advisor recommendation agree, the gate becomes terminal with `final_actor: advisor`; the Advisor is invoked once, the Arbiter is not invoked, no user gate is shown, and continuation proceeds automatically.
8. **R8 — Disagreement behavior (must):** When the original and Advisor recommendations differ, the evaluator creates exactly one logical Arbiter identity. All Arbiter retries belong to that identity, the Advisor is not re-invoked, and the terminal actor is `arbiter` when a valid confident result is obtained.
9. **R9 — Arbiter choice boundary (must):** The Arbiter receives the two competing choices and their rationales and may select only one of those choices or escalate. It cannot invent an option, mutate artifacts, or broaden scope.
10. **R10 — Fail-closed outcomes (must):** Manual or denylisted gates, unsupported capability, invalid state or role output after retries, low confidence, explicit escalation, exhausted roles, lock or revision conflict that cannot be reconciled, unsafe transition, or persistence failure returns `user_gate` when an interactive safe path exists and otherwise `blocked`. No work cursor, phase, outbox, or receipt advances.
11. **R11 — Persistence ordering (must):** The complete terminal gate record is committed before decision reports, dashboard data, selection application, cursor or phase changes, outbox creation, or dispatch. Reports remain projections of canonical state and never drive resume.
12. **R12 — Canonical schema v2 (must):** Authoritative state uses the exact field placement, enums, nullability, timestamp rules, and invariants in the Normative Schema-v2 Contract below. `current_phase` identifies exactly one `in_progress` phase; gate, work-item, and dispatch states follow only their declared transitions.
13. **R13 — Safe state migration (must):** Only the legacy shapes in the Supported Legacy Migration Matrix migrate. Migration is one locked atomic commit with output `schema_version: 2` and `revision: 1`; it preserves every legacy record either as complete v2 provenance or an explicitly legacy, non-authorizing record. Every listed rejection fails before mutation with actionable diagnostics.
14. **R14 — Transactional state repository (must):** Every legal commit follows the Platform-bounded Repository Contract below: validate under an owner-token lock, compare revision, increment once, reject symlinks, stage/flush/replace within the state directory, preserve mode and safely preservable ownership, and clean up only artifacts owned by the caller. Rejection, timeout, stale-lock uncertainty, metadata failure, or injected failure preserves bytes, modes, and topology.
15. **R15 — Runner responsibility (must):** The shared continuation runner re-reads and verifies the evaluator-owned terminal record, idempotency key, selected option, actor, confidence, revision, denylist, and optional forward transition. It may recover projections or a legal phase commit but does not call roles, synthesize provenance, choose domain work, or dispatch it.
16. **R16 — Same-phase continuation (must):** A workflow with sequential decision areas materializes stable work-item identities and an inventory version. Applying a terminal choice idempotently completes the source item, preserves its choice and source gate, identifies the next ready item, and creates a deterministic same-phase dispatch intent.
17. **R17 — Next-phase continuation (must):** A legal forward transition completes the source phase, starts the target phase, updates `current_phase`, and creates a phase-entry dispatch. Success requires an observable target-phase checkpoint; phase status mutation or runner stdout alone is not proof that the phase body started.
18. **R18 — Durable logical dispatch (must):** Each outbox entry binds one source gate to one target with a stable `dispatch_id`, target kind, phase, and target identity and follows `pending → claimed → acknowledged|blocked`. The receiver's only logical start effect is the atomic commit that establishes the target checkpoint and acknowledgement together; retry reuses the same ID and returns an existing acknowledgement without starting the target twice.
19. **R19 — Active-turn directive (must):** The thin Codex binding validates shared runtime results and returns only `continue`, `user_gate`, or `blocked`. A valid `continue` causes the workflow loop to re-read canonical state and immediately begin the acknowledged target in the same active Codex turn, without emitting a final response or user question between targets.
20. **R20 — Equivalent phase-entry proof (must):** Workflow phase-entry guards accept either the existing explicit user-gate evidence or a matching terminal automatic gate plus applied transition, dispatch receipt, and target checkpoint. This equivalence never applies to protected gates.
21. **R21 — Resume and deduplication (must):** Resume never duplicates a terminal history record, completed Advisor call, logical Arbiter identity, applied choice, logical dispatch effect, or acknowledged target. Pending attempts are reconciled according to retry rules, and completed durable checkpoints are reused.
22. **R22 — Existing-policy compatibility (must):** Manual, Advisor-assisted, user override, unsupported-automatic fallback, and `user_pending` resume follow the Normative Policy Transitions below. Hard denylist behavior, forward-only transitions, report recovery, immutable terminal selection, and interactive fallback retain their existing safety semantics.
23. **R23 — Canonical and generated ownership (must):** Shared semantics and runtime live under `plugins/maister/`; Codex-only mechanics live under `platforms/codex-cli/`; generated platform trees are changed only by deterministic build projection. Source and generated runtime contracts remain equivalent.
24. **R24 — Capability evidence (must):** Codex remains declared `unsupported` throughout shared implementation and fake-port integration. A repository-owned, non-packaged native-E2E bootstrap may bypass only declaration eligibility while retaining denylist, policy, state, role, and dispatch checks; normal workflows cannot invoke or configure that bypass. Activation is two-step: native evidence exits `0` while declaration is still unsupported, then a separate change sets `supported` and reruns the capability matrix through normal eligibility. Runtime unavailability remains exit `77`.
25. **R25 — Security boundaries (must):** Role contexts remain read-only; model output is treated only as data; state and report paths are canonicalized within the task root; symlink and traversal attacks are rejected; logs and projections retain necessary provenance without copying secrets or unnecessary full prompts.
26. **R26 — Gate-envelope completeness (must):** Every v2 gate record contains the required identity, policy, safety, recommendation, status, actor, selection, confidence, escalation, override, error, Advisor, Arbiter, continuation, and timestamp fields defined below. A `decided` record is immutable except for idempotent projection/continuation completion.
27. **R27 — Dispatch claim recovery (must):** Claiming is an atomic repository commit with an owner token and bounded lease. No target work begins while an entry is merely `claimed`; recovery may reclaim only an expired, safely classified claim and always retains the same `dispatch_id`. A crash after the acknowledged checkpoint commit but before the caller observes it returns that stored acknowledgement on retry.
28. **R28 — Mixed-policy records (must):** `manual` creates `user_pending` without role calls; `advisor` persists Advisor and, on disagreement, Arbiter analysis before `user_pending`; a user response commits `decided` with `final_actor: user`; `user_override` is true exactly when the user's selection differs from the latest machine recommendation. Unsupported `fully_automatic` persists its configured policy and records effective manual fallback.
29. **R29 — Evidence-bootstrap isolation (must):** The native evidence bootstrap exists only under the platform test harness, is excluded from generated/installable plugins, has no environment-variable or production-CLI switch, and invokes the real Codex entrypoint with a test-only eligibility provider. It cannot bypass the hard denylist or convert any unsafe result to `continue`.
30. **R30 — Platform-bounded filesystem behavior (must):** Lock, symlink, metadata, timeout, stale-owner, cleanup, and directory-durability semantics are explicit for supported macOS/Linux Node runtimes. The repository never unconditionally requires privileged ownership changes and never breaks or removes a lock it cannot prove stale and owned under the declared rules.

## Reusable Components

### Existing Code to Leverage

| Existing element | What it provides | Required leverage |
|---|---|---|
| `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` | Duplicate-key-aware JSON transport, exact allowlists, canonical YAML validation, deterministic hashing, denylist checks, report recovery, forward-transition guards, JSON-only stdout | Retain these strict boundary behaviors while changing the runner to verify a full persisted terminal record and use the shared repository. |
| `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` | Normative policy, response schema, retry, agreement, arbitration, denylist, idempotency, and persistence-order contract | Keep documentation synchronized with the executable evaluator; it remains the human-readable contract, not an alternate implementation. |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | Shared phase, state, gate, dashboard, and safety conventions | Extend the canonical schema and phase-entry proof without duplicating workflow-specific variants. |
| `plugins/maister/skills/init/bin/reconcile-advisor-config.sh` | Same-directory staging, preflight, no-op and mode preservation, backup/restore, rollback, and injected-failure patterns | Reuse its transactional guarantees and test style for state commits; do not reuse its config-specific parser or two-file transaction directly. |
| `plugins/maister/skills/research/SKILL.md` | Sequential, dependency-sensitive decision areas that expose the same-phase defect | Use as the first workflow tracer for stable inventory and automatic dispatch to the next decision area. |
| `plugins/maister/skills/development/SKILL.md`, `plugins/maister/skills/migration/SKILL.md`, and `plugins/maister/skills/performance/SKILL.md` | Existing gate call sites, phase routing, and entry self-checks | Consume the shared terminal/dispatch contract while leaving domain-specific routing in each workflow. |
| `plugins/maister/skills/product-design/SKILL.md` | Sequential decision-area behavior and forward phase gates | Adopt the shared forward continuation evidence; backward refinement remains outside this repair. |
| `platforms/codex-cli/templates/advisor.toml` | Read-only Codex role profile and exact four-field response expectation | Preserve read-only role constraints and align the text with the executable host port and separate Arbiter identity. |
| `platforms/codex-cli/build.sh` | Canonical skill copying, host vocabulary transforms, generated plugin assembly, and capability-matrix checks | Project the shared runtime and thin binding deterministically into `plugins/maister-codex/`; do not patch generated files directly. |
| `Makefile` and `tests/host-capability-matrix.test.sh` | Source/generated runner matrix and evidence-based capability projection, including exit `77` | Extend validation matrices while preserving the distinction between shared tests and native host evidence. |
| `tests/phase-continue-contract.test.sh` and `tests/fully-automatic-phase-continue.test.sh` | Strict runner transport, state rejection, idempotent reuse, report recovery, denylist, and transition assertions | Migrate fixtures to the full-record/schema-v2 contract and retain regression coverage for existing behavior. |
| `tests/advisor-config-reconciliation.test.sh` and `tests/advisor-init-lifecycle.test.sh` | Byte, mode, rollback, directory-topology, and failure-injection assertions | Reuse these assertion patterns for repository, migration, and interrupted commit coverage. |
| `tests/codex-fully-automatic-workflow-loop.test.sh` | The failing behavioral tracer for agreement, single-Arbiter disagreement, no user gate, durable same-phase dispatch, and acknowledgement | Make this test pass through the production binding without weakening its observable behavior checks. |
| `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` | The authoritative native capability target and correct unavailable exit | Replace the placeholder only with a real Codex entrypoint harness; it cannot be satisfied by invoking the shared Node runtime alone. |

### New Components Required

| New component | Why existing code cannot supply it |
|---|---|
| Shared executable gate evaluator | Decision behavior currently exists only as prose, while the runner starts after selection. A directly called shared state machine is required to own role invocation, agreement, one logical Arbiter, retry/resume, and terminal provenance. |
| Narrow schema-v2 state repository and migrator | The current runner performs isolated text replacement and has no shared lock, revision/CAS, complete invariant validation, mode-preserving durable replacement, or versioned legacy migration for two writers. This component is limited to orchestrator state and has immediate evaluator/runner/workflow callers. |
| Workflow continuation inventory/outbox contract | No existing structure identifies same-phase work, binds a gate choice to the next target, or records dispatch acknowledgement. The common record shape is shared, while each workflow continues to own its domain inventory and routing. |
| Thin Codex automatic-gate binding and dispatch receiver seam | Codex currently has a read-only role profile and generated instructions but no executable active-turn consumer connecting roles, shared runtime, workflow target, UI-free directive, and receiver deduplication. It must contain host mechanics only. |

## Technical Approach

### Component Boundaries and Flow

The repair follows the accepted ports-and-adapters boundary. A workflow creates an exact gate context and invokes the shared evaluator through a Codex-supplied read-only role port. The evaluator creates or resumes one durable gate envelope, calls the Advisor, and either commits agreement or advances the same envelope to one logical Arbiter. The shared runner verifies the terminal record and commits projections and any legal forward phase transition. The workflow then applies the selected option, creates the next target and outbox entry, and asks the Codex binding to dispatch it. The receiver records a checkpoint and acknowledgement before the binding returns `continue` to the active workflow loop.

The evaluator selects; the repository commits authoritative state; the runner projects and performs forward phase commits; the workflow routes; the Codex binding invokes host roles and dispatches. None of these boundaries may absorb another's policy or domain responsibilities.

### State and Recovery Model

State remains one project-local YAML snapshot. Schema v2 adds `schema_version`, `revision`, `initial_phase`, canonical `current_phase`, complete gate role provenance, stable workflow inventory, and typed dispatch outbox records. One idempotency key identifies one gate envelope updated in place; one logical Arbiter ID spans its retries; one dispatch ID binds one source gate to one target.

Every state change is a short repository commit. Locks are released during model calls and host dispatch. After either external operation, the caller reacquires the lock, checks revision, re-reads state on conflict, and resolves through idempotency instead of overwriting. Recovery independently completes missing projections, selection application, outbox creation, dispatch, or acknowledgement from the last durable checkpoint. It does not roll back a valid terminal decision or replay completed role work.

### Normative Schema-v2 Contract

The root contains exactly one `orchestrator` mapping, one `task` mapping, and one ordered `phases` sequence. `orchestrator` requires `schema_version: 2`, non-negative integer `revision`, stable `initial_phase` and `current_phase`, unique `completed_phases` and `failed_phases`, `gate_history`, `work`, and `dispatch_outbox`. `initial_phase` never changes. `current_phase` names exactly one phase whose status is `in_progress`; every completed/failed ID exists in `phases` and matches its phase status.

Each gate envelope requires: `schema_version`, `idempotency_key`, `phase_id`, `gate_type`, exact `question`, unique ordered `options`, `original_recommendation`, `configured_policy`, effective `policy`, `safety_classification`, `status`, `selected_option`, `final_actor`, `rationale`, `confidence`, `escalate_to_user`, `user_override`, `error`, `advisor`, `arbiter`, `continuation`, `provenance_kind`, `legacy_record`, `created_at`, `updated_at`, and `decided_at`. Policies are `manual | advisor | fully_automatic`; statuses are `advisor_pending | arbiter_pending | user_pending | decided | blocked`; actors are `system | advisor | arbiter | user`; confidence is `high | medium | low | null`. New timestamps are UTC RFC 3339; `decided_at` is non-null only for `decided` or `blocked`. `selected_option` is null before `decided` and otherwise exactly one option. `final_actor` is `system` while pending or blocked and is the actual terminal decision maker for `decided`.

`advisor` and `arbiter` are always present mappings with nullable `logical_role_id`, `agent`, `model`, and `response`, plus `attempts` and `exhausted`. A response, when present, has exactly the four role fields. Attempt status is `started | completed | failed | interrupted`; every attempt has a positive unique number and `started_at`; terminal attempt statuses require `completed_at`, while `started` requires it to be null. An Arbiter mapping may become active only after a completed Advisor disagreement and retains one `logical_role_id` for every retry.

`provenance_kind` is `complete` for native v2 records and `legacy` only for migrated narrow terminal records. A legacy gate preserves its exact prior mapping in `legacy_record`, cannot authorize new automatic continuation, and may only support audit/report projection or exact terminal lookup. Native records require `legacy_record: null` and complete role provenance for their actor.

Workflow inventories require an `inventory_version` and ordered items with stable `id`, positive unique `ordinal`, `status`, nullable `source_gate_key`, and nullable `selected_option`. Item status transitions only `ready → in_progress → completed | blocked`, plus idempotent reuse of the same state. An item cannot be completed without a terminal source gate and applied legal selection.

### Supported Legacy Migration Matrix

| Input shape | Deterministic v2 mapping | Rejection boundary |
|---|---|---|
| Already-v2 snapshot | Validate exactly; do not migrate or change revision | Reject unknown schema, invalid revision, field, enum, invariant, or duplicate identity |
| Legacy workflow snapshot with `current_phase`, ordered `phases`, and no revision | Require `current_phase` to equal the sole `in_progress` phase; set `initial_phase` from valid `started_phase`, otherwise the first ordered phase; remove mutable `started_phase`; set revision 1 | Reject absent/multiple in-progress phases, phase mismatch, or `started_phase` not naming a phase |
| Legacy workflow snapshot with `started_phase` but no `current_phase` | Derive `current_phase` only from the sole `in_progress` phase; use valid `started_phase` as immutable `initial_phase`; set revision 1 | Reject when current phase cannot be derived uniquely or `started_phase` is invalid |
| Empty legacy `gate_history` | Create empty v2 history, work mapping, and outbox | Reject misplaced/duplicate canonical anchors |
| Rich legacy gate with Advisor/Arbiter subrecords | Preserve exact option, actor, policy, role responses, models, attempts, rationale, and errors; derive stable missing logical role IDs; mark complete only when actor provenance is complete | Reject conflicting actor/response, illegal option, duplicate key, or an unfinished attempt that cannot be resumed unambiguously |
| Narrow schema-v1 terminal gate without role subrecords | Preserve the exact record as `provenance_kind: legacy` plus `legacy_record`; retain terminal choice for audit but prohibit it from authorizing new effects | Reject nonterminal narrow records, changed/illegal selection, or records whose identity fields are incomplete |
| Legacy `user_pending` record with complete context | Preserve configured/effective policy, recommendation and available analysis; normalize null terminal fields; resume the same user gate | Reject a preselected option, terminal actor, or conflicting override while pending |

All migration reads and validates the complete source before acquiring its single commit revision. Duplicate YAML keys/anchors, unsupported YAML features, unknown legacy shapes, conflicting phase evidence, duplicate gate/work/dispatch IDs, invalid timestamps, unsafe paths, or any lossy mapping are fail-closed. Migration never fabricates a model response, rationale, user choice, or completed attempt.

### Normative Policy Transitions

| Effective policy and condition | Required transition and terminal behavior |
|---|---|
| `manual` | Create/reuse `user_pending` with no role calls, null selection, actor `system`; user response commits `decided`, actor `user`, and override false unless a prior machine recommendation exists and differs |
| `advisor`, agreement | `advisor_pending → user_pending`; persist Advisor analysis, present original and Advisor recommendations, then user response commits actor `user` |
| `advisor`, disagreement | `advisor_pending → arbiter_pending → user_pending`; persist one logical Arbiter analysis, present original/Advisor/Arbiter recommendations, then user response commits actor `user` |
| User override | Set `user_override: true` exactly when the user's choice differs from the latest valid machine recommendation: Arbiter if present, otherwise Advisor, otherwise original recommendation |
| Unsupported `fully_automatic` in an interactive session | Preserve `configured_policy: fully_automatic`, set effective `policy: manual`, record the unsupported fallback rationale, and enter `user_pending` without automatic dispatch |
| Resume from `user_pending` | Re-present/reuse the same gate identity and analysis without repeating completed roles; commit exactly one user decision or remain pending |

### Dispatch Claim, Checkpoint, and Acknowledgement

Every outbox record requires `dispatch_id`, `source_gate_key`, `kind` (`same_phase_work_item | phase_entry`), `phase_id`, `target_id`, `status`, `attempts`, nullable `claim_token`, `claimed_at`, `lease_expires_at`, `checkpoint`, `acknowledged_at`, and `error`. Its only forward transitions are `pending → claimed → acknowledged | blocked`; retry of an unchanged state is idempotent.

Claiming is a repository commit that assigns an unpredictable owner token and bounded lease. A claim does not start target work. The receiver's logical start effect is one atomic repository commit that both (a) establishes the target's durable `in_progress` checkpoint and (b) changes the matching outbox entry to `acknowledged` with that checkpoint and timestamp. Only after that commit may the binding return `continue` and execute the target body. Therefore a crash while merely claimed has no target effect; after lease expiry a safely authorized receiver may reclaim the same `dispatch_id`. A crash after the acknowledgement commit but before the caller observes it is recovered by returning the stored acknowledgement, never by creating a second checkpoint or target start.

`blocked` is permitted only before acknowledgement and records an actionable non-retryable error. Source gate, target, and dispatch identity are immutable in every state. Recovery cannot steal an unexpired claim, change a target, or infer success from process output alone.

### Platform-bounded Repository Contract

The exclusive lock is an atomically created sibling directory of the state file and contains an owner record with a random token, process ID, hostname, acquisition time, and lease expiry. Acquisition waits only for a bounded configured duration and then returns a non-mutating conflict. Release and cleanup require the matching token. An expired lock is reclaimable only when the repository can prove the recorded same-host process is no longer alive and the owner record is valid; a live, foreign-host, malformed, or otherwise uncertain lock is never broken automatically. Reclamation and cleanup must not remove a successor's lock.

The task root, state path, lock path, report paths, every existing parent, and existing targets are canonicalized before mutation. The repository rejects a symlink at any of those boundaries and requires the state target to be a regular file. Temporary files are created in the state directory. Existing mode bits are preserved exactly. Existing ownership is preserved only when the process already has that ownership or can set it safely on the staged file; inability to establish required ownership aborts before replacement with an actionable error rather than attempting unconditional privileged `chown`. File data is flushed before atomic rename; the containing directory is flushed where the supported Node/macOS/Linux runtime exposes that operation, with any unsupported durability limitation explicit in test evidence. Only token-owned lock and temporary artifacts may be cleaned.

### Native Evidence Bootstrap and Activation

The evidence bootstrap is a platform-test-only adapter under `platforms/codex-cli/tests/`, excluded from build projection and installation. It invokes the real Codex plugin/skill entrypoint and supplies a private test eligibility provider to the binding; there is no production command-line option, environment flag, configuration key, or workflow instruction that can select it. The provider changes only the `declared_status` eligibility answer for that invocation. Denylist, gate policy, state validation, role isolation, confidence/escalation, persistence, dispatch, and no-UI assertions remain identical to production.

Activation has two explicit steps. First, with Codex still declared `unsupported`, run the native target directly through the evidence bootstrap; exit `0` records the required real-host observations, while unavailable remains `77`. Second, in a separate change, set the declaration to `supported`, disable the bootstrap grant for the normal run, and rerun the native target plus capability matrix so declared and projected support match through ordinary eligibility. Failure at either step leaves or restores `unsupported`; fake or shared tests cannot substitute.

### Compatibility and Rollout

The runtime is introduced behind the existing capability-aware fallback. Schema and shared contracts land before workflow adoption; research's sequential decision areas provide the first same-phase tracer; remaining workflows adopt the same evidence contract without changing user entry points. Canonical and adapter sources are rebuilt into every committed platform variant, and source/generated contract matrices must remain green.

The Codex binding can be integrated and tested with deterministic role and dispatcher ports while capability remains `unsupported`. The capability declaration changes only in a separate evidence-backed step after the native E2E exercises the real Codex entrypoint. If the active-turn spike disproves D1, implementation pauses for a scope decision rather than silently introducing an MCP service.

### Safety

The evaluator and runner both enforce the hard denylist and exact option/actor/confidence contracts. Advisor and Arbiter receive read-only context and no mutable artifact handles. Paths stay within the task root, role output is never interpolated into commands, retries are bounded, and low confidence or escalation cannot be suppressed. Manual and protected gates never reach automatic dispatch.

## Implementation Guidance

### Testing Approach

- Organize verification into approximately six focused groups: evaluator behavior; repository and schema migration; runner regression/recovery; workflow inventory and dispatch; Codex binding/build projection; native host evidence.
- Add **2–8 behavior-focused tests per implementation step group** and run only the new or directly affected tests while completing that group; reserve the full repository matrix for integration and final verification.
- Preserve the red tracer in `tests/codex-fully-automatic-workflow-loop.test.sh` and prove agreement and disagreement through observable role counts, actors, state, receipts, checkpoints, and zero user-gate calls.
- Cover Advisor and Arbiter retry/resume, both legal Arbiter outcomes, invalid output, low confidence, escalation, exhaustion, denylist, unsupported capability, and terminal reuse; add manual, Advisor agreement/disagreement, user override, fallback, and `user_pending` resume cases.
- Exercise every supported migration-matrix row and every named rejection. For migration and every rejected or injected-failure write, snapshot and assert byte-exact state and reports, modes and permissions, and unchanged file/directory topology.
- Cover lock timeout, live/expired/malformed/foreign stale locks, token-safe cleanup, symlink boundaries, mode preservation, safely preservable ownership, stale revision, and platform-specific directory durability.
- Inject failure after the atomic target-checkpoint/acknowledgement commit but before the caller observes it; retry must return the stored acknowledgement with one checkpoint and one logical target start. Also cover crash while merely claimed and safe same-ID reclaim after lease expiry.
- Validate the evidence-only bootstrap is absent from generated/installable plugins and inaccessible through environment, configuration, normal CLI, or workflow input. Run the two-step unsupported-evidence then supported-matrix sequence.
- Validate canonical and generated runtimes after a clean double build. Keep the real host-native E2E distinct from fake-port integration and preserve exit `77` when native execution is unavailable.

### Standards Compliance

- Follow `.maister/docs/standards/global/build-pipeline.md`: edit canonical sources and platform adapters only, regenerate all variants, and validate deterministic build output.
- Follow `.maister/docs/standards/global/coding-style.md`, `commenting.md`, and `minimal-implementation.md`: use descriptive focused functions, keep comments timeless and sparse, and add no speculative adapters, services, or unused extension points.
- Follow `.maister/docs/standards/global/error-handling.md` and `validation.md`: validate exact allowlists early, return actionable boundary errors, bound retries with backoff, release locks and temporary resources, and fail closed.
- Follow `.maister/docs/standards/global/conventions.md`: preserve the minimal dependency footprint, document runtime and capability behavior, and keep incomplete native activation behind the existing unsupported capability posture.
- Follow `.maister/docs/standards/testing/test-writing.md`: test externally visible behavior at risk-appropriate depth and prove rejected transactional mutations preserve bytes, modes, permissions, and topology.

## Out of Scope

- Product-design backward refinement, backward phase transitions, or a general phase reset protocol.
- Automation of implementation approval, final handoff, rollback, production go/no-go, scope expansion, data-integrity halt, unresolved critical verification, failure-recovery skip, or any other protected gate.
- A new command, graphical interface, dashboard as source of truth, or changed user journey outside removing unnecessary automatic-gate prompts.
- A daemon, background service, database, append-only event store, generalized persistence framework, or MCP adapter unless D1 is disproved and a new scope decision approves the fallback.
- A Codex-only evaluator, duplicated gate policy, or direct edits to generated plugin trees.
- Claiming Codex support from shared unit tests, fake role/dispatcher integration, smoke checks, file presence, or runner success alone.
- Redesigning unrelated workflow domain logic or adopting a generic work-item SDK beyond the immediately used continuation contract.

## Success Criteria

- Agreement produces one terminal record with `final_actor: advisor`, one Advisor call, zero Arbiter calls, zero user gates, and an acknowledged next-target checkpoint.
- Disagreement produces one logical Arbiter identity, preserves that identity across bounded retries, does not re-invoke the Advisor, selects one competing option, shows zero user gates on the valid confident path, and acknowledges the next target.
- The terminal envelope contains the exact original recommendation, role identities/models, attempts, responses/errors, rationale, confidence, escalation, actor, and selected option before any projection or continuation effect.
- Same-phase continuation completes the source work item and begins the stable next work item in the same active Codex turn.
- Next-phase continuation establishes an observable target-phase checkpoint in addition to updating phase state.
- Resume after every defined crash window produces no duplicate terminal gate, completed role call, logical Arbiter, applied choice, logical dispatch effect, checkpoint, or acknowledgement; post-commit/pre-observation retry returns the stored acknowledgement.
- Manual, denylisted, low-confidence, escalated, exhausted, unsupported, invalid, unsafe, or uncommittable paths do not advance work and return only a safe user gate or blocked result.
- Schema-v2 validation enforces every required field, enum, nullability rule, timestamp rule, actor/provenance invariant, and gate/work/dispatch transition.
- Every supported legacy-matrix shape migrates in one commit to revision 1 without provenance loss; every named ambiguity rejects without changing bytes, modes, permissions, reports, or topology.
- Manual, Advisor agreement/disagreement, user override, unsupported fallback, and `user_pending` resume produce the specified v2 records without duplicate role or user decisions.
- Concurrent or stale writers cannot overwrite a newer revision; lock timeout and uncertain stale owners fail without mutation; token ownership prevents successor cleanup; every legal commit increments revision exactly once.
- Symlink boundaries are rejected, existing mode is exact, ownership is preserved only when safely possible, and inability to establish required metadata fails before replacement on supported macOS/Linux runtimes.
- The runner can recover missing reports and legal forward transitions from the evaluator-owned terminal record without reconstructing provenance or invoking roles.
- Existing manual and Advisor-assisted policies, user override, denylist, forward-only transition, and immutable terminal-selection contracts continue to pass.
- `make build` produces the Codex binding and shared runtime from canonical/adapter sources, a second clean build has no drift, and source/generated contract matrices pass.
- The test-only evidence provider is absent from installed/generated plugins and unreachable from normal workflows; it bypasses declaration eligibility only and leaves every safety check active.
- Codex remains declared `unsupported` for the first real native E2E exit `0`; a separate activation change sets `supported` and reruns the native target and capability matrix through normal eligibility; unavailable exits `77`.
- The successful native E2E observes the real Codex entrypoint, agreement, disagreement, one logical Arbiter, same-phase and next-phase targets, zero UI, resume, deduplication, and durable checkpoints.
- No new user command, UI, service, database, speculative abstraction, or direct generated-tree edit is introduced.
