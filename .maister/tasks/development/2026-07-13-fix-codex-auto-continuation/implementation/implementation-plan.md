# Implementation Plan: Codex Fully Automatic Continuation

## TL;DR

Execute seven task groups in order: prove the D1 active-turn hook, establish transactional schema-v2 state, implement the shared evaluator, add workflow-owned continuation, finish the thin Codex projection, prove native capability, then close feature-level test gaps.
The state repository precedes every state writer; evaluator and workflow behavior remain canonical under `plugins/maister/`, while Codex mechanics stay under `platforms/codex-cli/`.
Codex remains `unsupported` until the real native evidence group exits `0`; an empirically disproved D1 hook stops the plan for scope clarification.

## Key Decisions

- Make D1 viability Group 1 and a dependency of all production groups — the approved architecture requires a stop-and-reclarify outcome if Codex cannot continue within the active turn.
- Sequence repository before evaluator and continuation — every role attempt, terminal record, work item, claim, and acknowledgement needs one lock/CAS/atomic-commit contract.
- Keep policy and state transitions in shared executable modules — Codex receives a thin directive/role/receiver binding, never a second evaluator.
- Adopt Research as the first same-phase workflow tracer, then update other workflow entry guards to consume equivalent automatic evidence — this proves the defect without inventing a generic workflow SDK.
- Treat capability activation as a two-commit evidence gate — native evidence runs while support is still declared `unsupported`; only a successful exit `0` permits the later declaration change.

## Open Questions / Risks

- The exact Codex active-turn hook is not yet proven. Group 1 must record a real-host observation; if D1 is disproved, stop before Group 2 and return to scope clarification without introducing D2/MCP.
- Native Codex may be unavailable in the implementation environment. Exit `77` preserves `unsupported` but does not satisfy Group 6 or authorize activation.
- Repository correctness depends on macOS/Linux lock ownership, metadata, symlink, and directory-flush behavior; injected failures must prove byte-, mode-, and topology-exact non-mutation.
- A crash after dispatch acknowledgement but before observation must return the stored acknowledgement. Receiver logic must never infer success from stdout or repeat a logical target start.
- Generated variants touch broad trees. Only canonical and adapter sources are hand-edited; `make build` owns generated changes and a second build must be clean.

## Overview

- Total Steps: 39
- Task Groups: 7
- Expected Tests: 25 focused tests before review, up to 9 strategic additions (25–34 total)
- Parallelism: none before the D1 checkpoint; repository and evaluator are serial; final review follows all implementation groups

## Implementation Steps

### Task Group 1: Codex Active-Turn Hook Viability

**Dependencies:** None  
**Files to Modify:** `platforms/codex-cli/bin/fully-automatic-gate.mjs`, `platforms/codex-cli/tests/active-turn-hook.e2e.sh`, `tests/codex-fully-automatic-workflow-loop.test.sh`  
**Estimated Steps:** 5

- [x] 1.0 Prove the D1 active-turn hook or stop for scope clarification
  - [x] 1.1 Write 3 focused tests for directive validation and real active-turn continuation
    - Reject any binding result outside `continue | user_gate | blocked`.
    - Observe that `continue` returns control to the live Codex workflow loop without a final response or user question.
    - Preserve exit `77` when the native Codex runtime is unavailable; do not treat it as proof.
  - [x] 1.2 Implement the narrow Codex binding entrypoint needed by the spike
    - Keep host mechanics in `platforms/codex-cli/bin/fully-automatic-gate.mjs` and consume a shared-runtime result as data.
    - Do not implement policy, choose workflow work, bypass the denylist, or expose a production eligibility override.
  - [x] 1.3 Run the real-host spike and record the architectural outcome
    - Require an observable same-turn target-start marker, not process exit or JSON stdout alone.
    - If D1 is empirically impossible, make no fallback changes and return to scope clarification before Group 2.
  - [x] 1.4 Ensure the 3 Group 1 tests pass
    - Run only `platforms/codex-cli/tests/active-turn-hook.e2e.sh` and the directly targeted binding cases in `tests/codex-fully-automatic-workflow-loop.test.sh`.

**Acceptance Criteria:**

- The 3 focused tests pass on an available real Codex runtime; unavailable execution exits `77` without claiming viability.
- `continue` demonstrably re-enters the workflow loop in the same active turn with no user-facing boundary.
- The binding exposes only the three directives and contains no decision policy or configurable evidence bypass.
- A disproved D1 produces a documented stop/reclarify outcome and no D2/MCP implementation.

### Task Group 2: Schema-v2 State Repository and Migration

**Dependencies:** Group 1  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs`, `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs`, `tests/orchestrator-state-repository.test.sh`, `tests/orchestrator-state-migration.test.sh`, `tests/fixtures/orchestrator-state-v2/**`  
**Estimated Steps:** 6

- [x] 2.0 Implement the transactional schema-v2 state boundary
  - [x] 2.1 Write 5 focused repository and migration tests
    - Cover one valid v2 commit, supported legacy migration, ambiguous migration rejection, revision conflict, and lock/metadata/symlink failure without mutation.
    - Snapshot bytes, mode, permissions, and relevant directory topology for every rejection or injected failure.
  - [x] 2.2 Implement exact schema-v2 parsing and invariant validation
    - Validate canonical anchors, strict fields/enums/nullability/timestamps, one `current_phase`, immutable `initial_phase`, and legal gate/work/outbox transitions.
    - Reuse the strict duplicate-key, allowlist, canonical-path, and YAML-boundary behavior from `phase-continue.mjs` rather than weakening it.
  - [x] 2.3 Implement the supported legacy migration matrix
    - Migrate in one locked commit to `schema_version: 2` and `revision: 1`.
    - Preserve complete provenance or an explicitly non-authorizing `legacy` record; reject lossy or ambiguous shapes before mutation.
  - [x] 2.4 Implement lock, revision/CAS, and durable atomic replacement
    - Use a token-owned sibling lock, bounded wait/lease, same-host dead-owner proof, same-directory staging, data flush, atomic rename, supported directory flush, exact mode preservation, and safe ownership handling.
    - Clean only caller-owned temporary and lock artifacts; never steal uncertain locks or remove a successor lock.
  - [x] 2.5 Ensure the 5 Group 2 tests pass
    - Run only `tests/orchestrator-state-repository.test.sh` and `tests/orchestrator-state-migration.test.sh`.

**Acceptance Criteria:**

- The 5 focused tests pass.
- Every valid commit increments the expected revision exactly once; stale or concurrent writers cannot overwrite a newer snapshot.
- Every supported legacy row migrates deterministically and ambiguous/unsafe input leaves bytes, metadata, reports, and topology unchanged.
- Lock, symlink, ownership, cleanup, timeout, and durability behavior is explicit and safe on supported macOS/Linux Node runtimes.

### Task Group 3: Shared Gate Evaluator and Policy Compatibility

**Dependencies:** Group 2  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs`, `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`, `plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml`, `tests/gate-evaluator.test.sh`, `tests/gate-decision-engine.test.sh`, `tests/fixtures/gate-evaluator/**`  
**Estimated Steps:** 6

- [x] 3.0 Implement one executable gate state machine
  - [x] 3.1 Write 5 focused evaluator tests
    - Cover fully-automatic agreement, disagreement with one logical Arbiter across retries, invalid/low-confidence/escalated fail-closed output, manual/advisor/user override compatibility, and terminal/pending resume reuse.
    - Assert role call counts, stable logical role IDs, complete attempts, immutable terminal records, and no continuation mutation on unsafe outcomes.
  - [x] 3.2 Implement strict gate context and role-response boundaries
    - Accept only the allowlisted gate context and exact four-field role response; validate options, recommendation, safety, capability, confidence, and escalation before effects.
    - Treat role output only as data and keep role contexts read-only.
  - [x] 3.3 Implement pending-to-terminal evaluation through the repository
    - Persist every started/completed/failed/interrupted attempt before dependent effects.
    - End agreement with `final_actor: advisor`; create one Arbiter logical identity for disagreement and retain it through bounded retries.
  - [x] 3.4 Preserve mixed-policy and fallback semantics
    - Keep denylisted gates explicit, manual gates role-free, advisor policy user-confirmed, user override exact, and unsupported fully-automatic effective-manual with configured policy retained.
    - Reuse terminal and `user_pending` records before any repeated role call or prompt.
  - [x] 3.5 Ensure the 5 Group 3 tests pass
    - Run only `tests/gate-evaluator.test.sh` and the directly affected cases in `tests/gate-decision-engine.test.sh`.

**Acceptance Criteria:**

- The 5 focused tests pass.
- Agreement invokes Advisor once and Arbiter zero times; disagreement invokes Advisor once and one logical Arbiter with bounded attempts.
- The evaluator owns a complete durable gate envelope and never advances workflow state, renders reports, or dispatches work.
- Manual, advisor, override, fallback, denylist, retry, and resume behavior matches the normative policy table.

### Task Group 4: Continuation Runner, Workflow Inventory, and Dispatch

**Dependencies:** Groups 2 and 3  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`, `plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs`, `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`, `plugins/maister/skills/research/SKILL.md`, `plugins/maister/skills/development/SKILL.md`, `plugins/maister/skills/migration/SKILL.md`, `plugins/maister/skills/performance/SKILL.md`, `plugins/maister/skills/product-design/SKILL.md`, `tests/workflow-continuation.test.sh`, `tests/phase-continue-contract.test.sh`, `tests/fully-automatic-phase-continue.test.sh`, `tests/codex-fully-automatic-workflow-loop.test.sh`, `tests/fixtures/phase-continue/**`  
**Estimated Steps:** 6

- [x] 4.0 Implement durable workflow-owned routing and recovery
  - [x] 4.1 Write 5 focused continuation tests
    - Cover same-phase inventory advance, forward phase-entry checkpoint, claim expiry/reclaim, crash after acknowledgement before observation, and runner/report/transition recovery without duplicated effects.
    - Retain agreement/disagreement tracer assertions for completed source item, acknowledged dispatch, next item `in_progress`, zero user gates, and stable IDs.
  - [x] 4.2 Refactor `phase-continue.mjs` into a verifier/recovery runner
    - Re-read the evaluator-owned terminal record and verify identity, option, actor, confidence, revision, denylist, and legal forward transition.
    - Reuse repository commits; do not invoke roles, synthesize provenance, select domain work, or dispatch targets.
  - [x] 4.3 Implement workflow inventory, apply-selection, and outbox operations
    - Materialize stable ordered Research decision-area work items first; idempotently complete the source and create a deterministic same-phase or phase-entry dispatch.
    - Keep target selection in each workflow and the common record/claim/checkpoint mechanics in the shared continuation module.
  - [x] 4.4 Implement receiver checkpoint and phase-entry evidence
    - Atomically establish the target `in_progress` checkpoint and acknowledge the same `dispatch_id`; retries return the stored acknowledgement.
    - Update workflow entry guards to accept explicit user evidence or matching automatic terminal/transition/receipt/checkpoint evidence, never for protected gates.
  - [x] 4.5 Ensure the 5 Group 4 tests pass
    - Run only the four listed continuation/runner scripts and directly affected fixture cases.

**Acceptance Criteria:**

- The 5 focused tests pass, including the original red tracer.
- Terminal gate persistence precedes projection, choice application, cursor/phase mutation, outbox creation, claim, and acknowledgement.
- Same-phase and next-phase paths create one stable logical dispatch and one durable target checkpoint; recovery never duplicates starts or receipts.
- Existing manual/advisor, denylist, immutable selection, forward-only transition, and report-recovery behavior remains compatible.

### Task Group 5: Thin Codex Binding and Deterministic Build Projection

**Dependencies:** Groups 1, 3, and 4  
**Files to Modify:** `platforms/codex-cli/bin/fully-automatic-gate.mjs`, `platforms/codex-cli/templates/advisor.toml`, `platforms/codex-cli/templates/arbiter.toml`, `platforms/codex-cli/build.sh`, `platforms/kiro-cli/build.sh`, `platforms/kiro-cli/tests/reproducible-build.test.sh`, `.gitignore`, `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`, `Makefile`, `tests/codex-fully-automatic-workflow-loop.test.sh`, `tests/host-capability-matrix.test.sh`, `plugins/maister-codex/skills/orchestrator-framework/**`, `plugins/maister-cursor/lib/orchestrator-framework/**`, `plugins/maister-kiro/skills/maister-orchestrator-framework/**`, `plugins/maister-codex/skills/{research,development,migration,performance,product-design}/SKILL.md`, `plugins/maister-cursor/skills/maister-{research,development,migration,performance,product-design}/SKILL.md`, `plugins/maister-kiro/skills/maister-{research,development,migration,performance,product-design}/SKILL.md`  
**Estimated Steps:** 6

- [x] 5.0 Connect Codex host mechanics and regenerate platform variants
  - [x] 5.1 Write 4 focused binding/build tests
    - Cover role-port isolation, directive validation, safety-result passthrough, and deterministic source/generated contract parity while Codex remains declared `unsupported`.
    - Assert Advisor and Arbiter use separate read-only identities and that normal input cannot select the evidence provider.
  - [x] 5.2 Complete the Codex role and receiver binding
    - Invoke the shared evaluator through read-only Advisor/Arbiter ports, pass its terminal result through the shared runner/workflow receiver, and return only a validated directive.
    - On `continue`, re-read canonical state and begin the acknowledged target in the same active turn; on `user_gate` or `blocked`, expose no hidden continuation.
  - [x] 5.3 Project canonical runtime and workflow contracts
    - Update adapter templates/build transforms, run `make build`, and inspect generated Codex/Cursor/Kiro changes without hand-editing generated files.
    - Keep Codex `fully_automatic: unsupported`; shared and fake-port success cannot activate it.
  - [x] 5.4 Validate deterministic build ownership
    - Use a repository-local Kiro build lock so differing `TMPDIR` values cannot overlap writes; run two clean `make build` executions, require identical generated manifests, and verify the evidence-only harness is absent from generated/installable plugins.
  - [x] 5.5 Ensure the 4 Group 5 tests pass
    - Run only `tests/codex-fully-automatic-workflow-loop.test.sh`, affected build assertions, and `tests/host-capability-matrix.test.sh` with the declaration still unsupported.

**Acceptance Criteria:**

- The 4 focused tests pass.
- Codex binding code contains host mechanics only; the shared evaluator remains the sole policy state machine.
- Generated variants reproduce from canonical/adapter sources on two consecutive builds with no drift.
- Codex is still declared `unsupported`, and no production CLI, environment, configuration, or workflow value enables evidence bypass.

### Task Group 6: Native Evidence Bootstrap and Capability Activation

**Dependencies:** Group 5  
**Files to Modify:** `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`, `platforms/codex-cli/tests/native-evidence-bootstrap.mjs`, `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`, `tests/host-capability-matrix.test.sh`, `Makefile`, `docs/codex-support.md`  
**Estimated Steps:** 5

- [x] 6.0 Prove native behavior before activating capability
  - [x] 6.1 Write 3 focused native-evidence tests
    - Observe the real Codex entrypoint for agreement, disagreement/one logical Arbiter, same-phase and next-phase continuation, zero UI, resume/deduplication, and durable checkpoints.
    - Prove the private test provider bypasses only declaration eligibility, remains test-tree-only, and unavailable native execution exits `77`.
  - [x] 6.2 Implement the isolated native evidence bootstrap
    - Keep it under `platforms/codex-cli/tests/`, exclude it from builds/installations, and provide no production environment, CLI, config, or workflow selector.
    - Leave policy, denylist, state, role, confidence, persistence, dispatch, and directive checks unchanged.
  - [x] 6.3 Execute the two-step activation sequence
    - First run native evidence to exit `0` while Codex is declared `unsupported` and retain the recorded real-host observations.
    - Only in a separate change after that success, set the declaration to `supported`, disable the bootstrap grant for normal execution, rebuild, and rerun native evidence plus the capability matrix.
    - If native evidence is unavailable (`77`) or fails, leave/restore `unsupported` and do not mark this group complete.
  - [x] 6.4 Ensure the 3 Group 6 tests pass
    - Run only `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` and the directly affected capability-matrix targets for the two activation states.

**Acceptance Criteria:**

- The 3 focused tests pass against the real Codex entrypoint; exit `77` is handled safely but is not success.
- Evidence succeeds once while declaration remains `unsupported`, then activation occurs as a distinct evidence-backed change.
- The normal supported run passes without the bootstrap grant, and the capability matrix matches source and generated declarations.
- Evidence bootstrap code is absent from every generated/installable plugin and cannot weaken any protected or fail-closed path.

### Task Group 7: Test Review and Gap Analysis

**Dependencies:** Groups 1–6  
**Files to Modify:** `tests/gate-evaluator.test.sh`, `tests/orchestrator-state-repository.test.sh`, `tests/orchestrator-state-migration.test.sh`, `tests/workflow-continuation.test.sh`, `tests/phase-continue-contract.test.sh`, `tests/fully-automatic-phase-continue.test.sh`, `tests/codex-fully-automatic-workflow-loop.test.sh`, `tests/host-capability-matrix.test.sh`, `platforms/codex-cli/tests/active-turn-hook.e2e.sh`, `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`  
**Estimated Steps:** 5

- [x] 7.0 Review and fill critical feature gaps
  - [x] 7.1 Review the 25 focused tests from Groups 1–6
    - Map them to R1–R30, the supported migration matrix, policy transitions, crash windows, and activation sequence.
  - [x] 7.2 Analyze gaps for this feature only
    - Prioritize missing security boundaries, transactional rejection proofs, retry/resume identities, protected-gate behavior, and source/generated parity.
  - [x] 7.3 Write up to 9 additional strategic tests
    - Keep the feature total within 25–34 tests; do not add exhaustive variants already covered by exact schema tables or equivalent fixtures.
  - [x] 7.4 Run the 25–34 feature-specific tests only
    - Defer full `make validate` and release-wide checks to implementation verification after group completion.

**Acceptance Criteria:**

- All 25–34 feature tests pass.
- No more than 9 strategic tests are added during review.
- Every R1–R30 requirement and every critical crash/safety boundary has direct or explicitly mapped evidence.
- No protected gate, D2/MCP fallback, UI, service, database, or direct generated-tree edit enters the implementation.

## Execution Order

1. Group 1 — Codex Active-Turn Hook Viability (5 steps)
2. Group 2 — Schema-v2 State Repository and Migration (6 steps, depends on 1)
3. Group 3 — Shared Gate Evaluator and Policy Compatibility (6 steps, depends on 2)
4. Group 4 — Continuation Runner, Workflow Inventory, and Dispatch (6 steps, depends on 2 and 3)
5. Group 5 — Thin Codex Binding and Deterministic Build Projection (6 steps, depends on 1, 3, and 4)
6. Group 6 — Native Evidence Bootstrap and Capability Activation (5 steps, depends on 5)
7. Group 7 — Test Review and Gap Analysis (5 steps, depends on all previous groups)

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- `global/build-pipeline.md` — edit canonical sources/adapters, regenerate all variants, and require reproducible generated output.
- `global/coding-style.md`, `global/commenting.md`, and `global/minimal-implementation.md` — focused descriptive modules, sparse timeless comments, immediate callers, and no speculative framework.
- `global/error-handling.md` and `global/validation.md` — exact allowlists, early actionable rejection, bounded retries, fail-closed outcomes, and reliable cleanup.
- `global/conventions.md` — minimal dependencies, documented capability behavior, and unsupported posture until native proof.
- `testing/test-writing.md` — behavior-focused risk depth and byte/mode/permission/topology proofs for rejected transactions.

## Notes

- Test-Driven: each implementation group begins with 2–8 focused tests; the review group adds at most 9.
- Run Incrementally: run only each group's new or directly affected tests until final verification.
- Mark Progress: check off both parent and child steps as implementation completes; mirror status in the HTML companion markers.
- Reuse First: preserve strict `phase-continue.mjs` transport/state boundaries, reconciliation failure-injection patterns, canonical workflow sources, build projections, and existing capability matrices.
- Stop Condition: if Group 1 disproves D1, or Group 6 cannot produce native exit `0`, do not silently change architecture or claim support.
