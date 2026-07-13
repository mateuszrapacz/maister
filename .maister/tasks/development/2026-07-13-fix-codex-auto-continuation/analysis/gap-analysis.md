# Gap Analysis: Fix Codex Fully Automatic Continuation

## TL;DR

The current repository can validate and persist a preselected gate result, but it cannot execute the complete `fully_automatic` path or start the next work item.
The deterministic reproduction is split: shared prose/runner contracts pass, while the only Codex-native capability test exits `77` because no executable adapter harness exists.
The accepted A3/B1/C1/D1 design closes the missing evaluator, full-record persistence, workflow routing, durable dispatch, and active-turn binding gaps without weakening protected gates.
Risk and effort are high because the repair changes authoritative YAML state, five workflow consumers, the shared runner, Codex packaging, generated variants, and capability evidence.

## Key Decisions

- Implement A3/B1/C1/D1 exactly as accepted in the research decision log: shared executable evaluator, evaluator-owned full gate record, workflow-owned durable inventory/outbox/receipt, and thin Codex binding.
- Keep the evaluator, continuation runner, workflow loop, and Codex active-turn binding as separate boundaries; runner success is not proof of dispatch.
- Use `orchestrator.current_phase` as the only mutable phase cursor and introduce versioned, fail-closed migration plus revision/CAS protection.
- Preserve all manual, denylisted, low-confidence, escalation, exhaustion, unsupported-host, and persistence-failure paths as fail-closed.
- Keep Codex `fully_automatic` declared `unsupported` until the real host-native E2E exits `0`; shared tests and fake-port integration are not capability evidence.

## Open Questions / Risks

- The exact Codex active-turn/headless hook remains an implementation spike inside the accepted D1 boundary. If the spike disproves D1, implementation must stop and return to scope clarification before adopting the researched D2 MCP fallback.
- Real legacy `orchestrator-state.yml` files may contain `started_phase`, no revision, and richer or poorer gate-history records than the current runner accepts; ambiguous migrations must fail closed without mutation.
- Logical exactly-once requires receiver deduplication by stable `dispatch_id`; a physical dispatch may be retried after an interruption.
- Evaluator and runner become sequential writers to one YAML snapshot, so a shared lock, validation under lock, expected-revision CAS, atomic replacement, mode preservation, and directory durability are correctness requirements.

## Summary

- **Risk Level**: High
- **Estimated Effort**: High
- **Detected Characteristics**: Reproducible defect, modifies existing code, creates new runtime/state entities, authoritative state/data operations, not UI-heavy
- **Change Type**: Modificative, with additive runtime modules and fixtures
- **Compatibility Requirement**: Strict
- **Architectural Impact**: High
- **Scope Expansion Recommended**: No. The research-approved scope already includes every material gap found here.

The implementation must change behavior from “persist a selected result and exit” to “evaluate, persist full provenance, apply the selection, durably route, and start the next target in the same active turn.” This is aligned with the project vision and roadmap priorities for auditable Advisor/Arbiter automation, runtime continuation coverage, and host parity.

## Task Characteristics

- Has reproducible defect: **yes**
- Modifies existing code: **yes**
- Creates new entities: **yes** — executable evaluator/repository/binding modules, versioned gate envelopes, work items, dispatch outbox entries, and receipts do not exist today
- Involves data operations: **yes** — the task changes creation, validation, transition, recovery, and concurrent persistence of authoritative YAML workflow state
- UI heavy: **no** — dashboards/reports remain derived projections; no page, form, route, component, or styling work is required

## Current State vs Desired State

| Concern | Current state | Desired state | Gap |
|---|---|---|---|
| Gate selection | Agreement/arbitration is normative Markdown only in `gate-decision-engine.md` | Executable evaluator with injected read-only role invoker | No runtime state machine or deterministic role-call accounting |
| Agreement | Runner accepts an already selected option | Original/advisor agreement terminates with `final_actor: advisor` | No component compares recommendations before commit |
| Disagreement | Prose says to arbitrate | One logical Arbiter record; retries append attempts to that record | No executable exactly-one-logical-arbiter behavior |
| Gate provenance | `phase-continue.mjs` synthesizes `original_recommendation` from `selected_option` and a generic rationale | Evaluator owns the full pending-to-terminal record | Provenance, role responses, models, attempts, and real rationale are lost |
| State cursor | Shared state template uses `started_phase`; runner optionally reads `current_phase` | Versioned state with one canonical `current_phase` | Competing phase meanings and incomplete invariants |
| State writes | Temp file, file `fsync`, and rename exist per write | Shared lock, validate-under-lock, revision/CAS, mode preservation, directory durability | Atomic single write does not prevent lost updates across writers |
| Same-phase continuation | Research/product-design prose says “move to next area” after a user choice | Stable work-item inventory, applied choice, outbox, dispatch, checkpoint, receipt | No cursor, target identity, dispatch consumer, or resume proof |
| Next-phase continuation | Runner can mark source completed and target in progress | Target phase body starts and records an observable checkpoint | State transition is not phase execution |
| Phase-entry proof | Canonical workflows require an `AskUserQuestion` call ID | Accept either explicit user-gate proof or matching terminal auto record plus continuation receipt | Valid automatic decisions are rejected by entry guards |
| Codex binding | Read-only `advisor.toml` describes behavior; build copies/transforms skills | Thin native binding returns `continue | user_gate | blocked` to the active workflow loop | No executable active-turn adapter or native role/dispatcher seam |
| Capability evidence | Codex native E2E exits `77`; capability is correctly unsupported | Real Codex E2E exits `0` and observes agreement, arbitration, same/next phase, no UI, resume, dedupe | No host-native proof; capability must not flip early |

## Gaps Identified

### Missing Features

- **Executable gate evaluator**: No runtime under `plugins/maister/skills/orchestrator-framework/bin/` executes policy, denylist, pending states, role calls, output validation, retries, agreement, arbitration, or resume.
- **Shared state repository**: No common writer provides task-local locking, revision/CAS, schema-v2 invariants, mode preservation, or durable directory replacement for evaluator and runner.
- **Workflow work inventory and dispatch protocol**: No stable `work_item_id`, deterministic `dispatch_id`, outbox, receiver deduplication, checkpoint, or acknowledgement exists for same-phase or phase-entry continuation.
- **Codex host-native binding**: `platforms/codex-cli/build.sh` copies and transforms shared skills, but does not package an executable adapter that connects native role invocation, evaluator, runner, and the current active turn.
- **Host-native capability test**: `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` contains only an unavailable message and `exit 77`.
- **Schema-v2 migration**: There is no fail-closed migration from `started_phase`/narrow history to `current_phase`/revision/full envelope.

### Incomplete Features

- **Continuation runner**: `phase-continue.mjs` has strong exact-input validation, canonical-state checks, deterministic gate keys, report recovery, forward transition guards, and failure injection, but it chooses neither Advisor nor Arbiter and exits after JSON stdout.
- **Terminal history**: The runner appends a schema-v1 terminal record and can reuse it, but it creates rather than verifies the evaluator-owned full record required by B1.
- **Atomic persistence**: `atomicWrite` performs same-directory staging, file `fsync`, and rename, but creates target directories, does not share a lock, has no expected revision, does not preserve an existing file mode explicitly, and does not `fsync` the containing directory.
- **Workflow call sites**: Development, research, product-design, migration, and performance all describe the shared runner contract, but none consumes a successful automatic result through a durable workflow loop.
- **Tests**: `tests/gate-decision-engine.test.sh` passes 28 prose/structure checks and current runner tests cover selection persistence, forward transition, recovery, and denylist behavior. They do not execute the evaluator, count role calls, prove no UI, dispatch a next target, or exercise a real Codex entrypoint.

### Behavioral Changes Needed

- Change agreement from a possible user-facing stop to an automatic terminal Advisor decision with zero Arbiter and zero user-gate calls.
- Change disagreement from prose-only arbitration to one logical Arbiter whose retries remain within one durable record and never loop back to Advisor.
- Change runner input from “trust this selected result and synthesize provenance” to “verify this already persisted terminal evaluator record and commit projections/transition.”
- Change successful continuation from stdout/phase mutation to a durable target dispatch followed by an observable same-turn checkpoint.
- Change phase-entry guards to accept persisted automatic evidence without weakening explicit-user requirements for protected gates.
- Change capability only after host-native evidence, not as part of source implementation or fake-port integration.

## Defect Analysis

### Reproduction Data

**Inputs**

- A safe, non-denylisted gate configured as `fully_automatic`.
- Ordered options and an original recommendation.
- Either an Advisor response agreeing with the original recommendation or a differing valid recommendation requiring arbitration.
- A subsequent same-phase work item or forward phase target.

**Steps and observed evidence**

1. Run `bash tests/gate-decision-engine.test.sh`.
2. Observe all 28 checks pass; these checks validate prose, fixture labels, runner references, and generated structure rather than native active-turn behavior.
3. Run `bash platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`.
4. Observe `UNAVAILABLE: no deterministic Codex adapter harness executes and observes native continuation` and exit code `77`.
5. Inspect `phase-continue.mjs`: `main()` validates a preselected payload, appends/synthesizes a terminal record, writes reports, optionally updates `current_phase`, prints compact JSON, and returns. There is no role invoker, selection application, next-item router, dispatcher, or receiver acknowledgement.

**Expected**

- Agreement: Advisor called once, Arbiter never called, user gate never shown, full terminal record persisted, next target started in the same active turn.
- Disagreement: Advisor called once, exactly one logical Arbiter created, legal Arbiter result persisted, user gate never shown on a safe confident path, next target started in the same active turn.
- Resume: no duplicate terminal history, logical Arbiter, applied choice, or logical dispatch.

**Actual**

- The repository has no executable Codex path that can perform and observe that sequence. Shared runner success ends at JSON output or phase-state mutation; the native capability test is unavailable and capability remains unsupported.

### Root Cause Hypothesis

The root cause is a missing executable ownership chain between normative gate policy and host workflow execution. Decision semantics exist primarily as Markdown; `phase-continue.mjs` begins too late, after an option has already been selected, and ends too early, before workflow routing and dispatch. Codex has a read-only role profile but no active-turn binding that supplies role calls to a shared evaluator and returns successful continuation to a durable workflow loop.

### Regression Risk Areas

- Hard denylist and explicit user ownership of implementation approval, final handoff, rollback, production, and other protected gates.
- Manual and `advisor` policies, including user overrides and interactive fallback.
- Pending-state resume, retry budgets, exponential-backoff metadata, and exactly-one logical Arbiter semantics.
- Terminal record immutability, idempotency-key reuse, report regeneration, and changed-selection rejection.
- State schema migration, phase invariants, lock/CAS conflicts, permissions, directory topology, and crash windows.
- Same-phase dependent decision areas in research and product-design.
- Scope decisions and phase exits in development, migration, and performance.
- Generated Cursor, Kiro, and Codex variants and reproducible second builds.
- Capability projection rules that distinguish exit `0`, exit `77`, and failure.

## Change and Compatibility Classification

### Change Type

**Modificative**. The task changes existing gate, persistence, continuation, workflow-entry, and Codex packaging behavior. It also adds narrowly scoped runtime modules and state entities, but these additions serve the modification rather than define an independent product feature.

### Compatibility Requirements

**Strict**:

- Existing manual and Advisor-assisted workflows must retain their behavior.
- Denylisted gates must never call Advisor, Arbiter, automatic runner, or dispatcher.
- Existing supported runner recovery properties must remain: deterministic idempotency, immutable terminal selection, report regeneration, and exactly-once forward transition.
- Existing state must either migrate deterministically to schema v2 or fail before mutation with actionable diagnostics.
- Canonical edits must remain under `plugins/maister/` and Codex-specific edits under `platforms/codex-cli/`; generated variants may change only through `make build`.
- Codex capability must remain unsupported until the prescribed real native E2E succeeds.

## User Journey Impact Assessment

The affected “user journey” is the workflow operator's passage through configurable orchestration gates rather than a graphical UI.

| Dimension | Current | After | Assessment |
|---|---|---|---|
| Reachability | The same workflow commands and phases are reachable | Entry points remain unchanged | Neutral (`0`) |
| Discoverability/observability | `fully_automatic` is configured but cannot be experienced as a complete Codex flow; capability is unsupported | Durable audit, dashboard projection, target checkpoint, and explicit capability evidence make behavior observable | Improves from 2/10 to 9/10 |
| Flow integration | Safe auto gates fall back, stop, or end after persistence/transition | Safe agreement/arbitration continues directly to the next target in the same turn | Positive |
| Protected decisions | Explicit user control is preserved by prose and denylist | Explicit user control is rechecked by executable evaluator and runner | No negative impact |
| Resume | Terminal selection can be reused by runner, but next work is ambiguous | Decision, applied choice, target, dispatch, and acknowledgement are independently resumable | Strong improvement |

## State and Data Lifecycle Analysis

### Entity: Gate Decision Envelope

| Lifecycle operation | Current evidence | Desired behavior | Status |
|---|---|---|---|
| CREATE pending | Described in Markdown only | Persist `advisor_pending`/`arbiter_pending` and attempts before role calls | Missing |
| READ/reuse | Runner validates narrow schema-v1 history and reuses terminal keys | Shared schema-v2 read and invariant validation | Partial |
| UPDATE pending to terminal | Runner appends a new terminal record | Evaluator updates one record in place with complete provenance | Missing |
| RECOVER | Runner recovers report/transition from a terminal record | Resume exact role/attempt without reinvoking completed roles | Partial |
| REJECT invalid mutation | Runner contract asserts many byte-exact rejection cases | Extend to repository, migration, evaluator, and outbox failures including modes/topology | Partial |

### Entity: Workflow Continuation/Dispatch

| Lifecycle operation | Current evidence | Desired behavior | Status |
|---|---|---|---|
| CREATE intent | Runner writes scalar `continuation: phase_continue` | Persist typed target with source gate, `work_item_id`, and deterministic `dispatch_id` | Incomplete |
| READ target | No workflow loop consumes the scalar as a durable target | Workflow rereads canonical state and resolves the exact next target | Missing |
| UPDATE status | Optional phase statuses change | `pending → dispatched/in_progress → acknowledged/completed|blocked` | Missing |
| DEDUPLICATE | Gate-key and transition reuse exist | Receiver deduplicates logical effect by `dispatch_id` | Missing |
| RECOVER | Report and phase transition can recover | Retry the same dispatch and record the same acknowledgement/checkpoint | Missing |

- **Completeness score**: 35%
- **Orphaned operations**:
  - A continuation marker can be created without any executable consumer or acknowledgement.
  - A phase can be marked `in_progress` without evidence that its body started.
  - A same-phase selection can be terminal without a stable next-item cursor or dispatch receipt.
- **Missing touchpoints**:
  - Shared evaluator/repository boundary.
  - Workflow apply-selection and target-materialization boundary.
  - Codex active-turn dispatcher/receiver boundary.
  - Schema migration and realistic legacy-state fixtures.

These lifecycle gaps would normally force scope-expansion decisions. Here they do not create new `decisions_needed` entries because ADR-001 through ADR-008 already explicitly accepted their inclusion and Phase 1 clarifications confirmed that scope. Removing any of them would contradict the binding research context.

## Integration Points

- `plugins/maister/skills/orchestrator-framework/bin/`: new evaluator and state repository; runner migrated to full-record verification.
- `plugins/maister/skills/orchestrator-framework/references/`: synchronized executable schema, gate algorithm, state template, fixtures, and capability wording.
- `plugins/maister/skills/research/SKILL.md`: first same-phase tracer bullet with stable dependent decision-area inventory.
- `plugins/maister/skills/product-design/SKILL.md`: shared forward continuation contract only; backward refinement remains out of scope.
- `plugins/maister/skills/development/SKILL.md`, `migration/SKILL.md`, and `performance/SKILL.md`: terminal result consumption, routing, and automatic phase-entry proof.
- `platforms/codex-cli/`: thin binding, role-invocation/dispatcher seam, build copy rules, smoke checks, integration test, and native E2E.
- `tests/`: evaluator, repository/runner, migration, workflow-loop, dispatch, adapter, build projection, and failure-injection coverage.
- `Makefile`: fast contract matrices plus preservation of host-native E2E as the only capability proof.
- Generated `plugins/maister-{codex,cursor,kiro}/`: build outputs only.

## Patterns to Follow

- Exact allowlists and JSON-only stdout/stderr separation from `phase-continue.mjs`.
- Deterministic idempotency key derived from phase, gate type, exact question, and ordered options.
- Same-directory staging, validation-before-replacement, no-op/mode preservation, rollback, and failure injection from `plugins/maister/skills/init/bin/reconcile-advisor-config.sh`.
- State-local atomic lock precedent from platform build tooling, extended with bounded timeout and revision/CAS.
- Behavior-focused shell tests and byte/mode/directory-topology assertions required by `.maister/docs/standards/testing/test-writing.md`.
- Canonical-source and deterministic generated-variant ownership from `.maister/docs/standards/global/build-pipeline.md`.
- Minimal direct modules with real callers; no daemon, generalized event store, speculative SDK, or MCP service unless the D1 spike is empirically disproven.
- Model outputs parsed strictly as four-field data; never interpolate them into shell commands or let roles mutate files.

## Architectural Impact

**High.** The accepted design introduces an executable state machine and a narrow shared persistence boundary, changes the authoritative YAML schema, and adds durable routing/dispatch semantics across five orchestrators. It preserves the existing system architecture—single canonical plugin plus deterministic adapters—and does not introduce a service, database, daemon, or frontend framework.

The deepest seam is intentional:

```text
workflow loop
  -> shared evaluator -> read-only role port + state repository
  -> continuation runner -> reports / optional forward transition
  -> thin Codex binding -> continue | user_gate | blocked
  -> workflow-owned target + dispatcher -> durable checkpoint/receipt
```

## Issues Requiring Decisions

### Critical

None. The research task and Phase 1 clarifications already settled all critical architecture and scope questions, including state lifecycle expansion and fail-closed safety behavior.

### Important

None at this stage. The Codex active-turn shape is an implementation spike within D1, not permission to choose another architecture. A negative spike result must return to scope clarification before D2 is considered.

## Recommendations

1. Start Phase 3 with failing executable tests for agreement, disagreement, and missing next-target dispatch; make call counts and no-UI behavior observable.
2. Define schema v2 and realistic migration fixtures before runtime changes, including rich histories and invalid/ambiguous legacy states.
3. Implement the narrow state repository and evaluator before changing the runner; make every rejected or injected-failure case prove byte/mode/topology preservation.
4. Convert the runner to verify the evaluator-owned terminal record and retain its proven report/transition recovery behavior.
5. Deliver one research Phase 4 tracer bullet with two dependent stable work items and dispatch acknowledgement before migrating all call sites.
6. Add the thin Codex binding and fake-port integration while capability remains unsupported.
7. Migrate the remaining workflow consumers and automatic phase-entry guards only after the tracer bullet passes.
8. Run `make build`, inspect generated diffs, run `make validate`, and verify a second clean build produces no diff.
9. Run the real Codex native E2E last; flip capability only when it exits `0` and observes agreement, one logical Arbiter, no UI, same-phase continuation, next-phase checkpoint, resume, and deduplication.

## Risk Assessment

- **Complexity Risk: High** — several small modules cross a large number of state, workflow, build, and generated-artifact contracts.
- **Integration Risk: High** — the exact Codex active-turn seam is unproven, and successful process exit must return control without ending the assistant turn.
- **Regression Risk: High** — a false positive could bypass user control, lose audit provenance, double-dispatch work, corrupt resume state, or advertise unsupported capability.
- **Data Integrity Risk: High** — two writers and schema migration introduce lost-update and partial-state hazards unless lock/CAS/atomic invariants are shared.
- **Platform Risk: Medium-High** — shared framework changes project into three generated variants, while only Codex receives the native binding.
- **Mitigation** — staged tracer bullet, strict schemas, executable call-count tests, failure injection, full build/validation, and evidence-gated capability activation.

## Structured Result

```yaml
status: success
report_path: .maister/tasks/development/2026-07-13-fix-codex-auto-continuation/analysis/gap-analysis.md
risk_level: high
effort_estimate: high
task_characteristics:
  has_reproducible_defect: true
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: true
  ui_heavy: false
change_type: modificative
compatibility_requirements: strict
reproduction_data:
  steps:
    - Run bash tests/gate-decision-engine.test.sh and observe prose/structure contracts pass.
    - Run bash platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh.
    - Observe the unavailable diagnostic and exit code 77.
    - Inspect phase-continue.mjs and observe it prints JSON and exits without role invocation or target dispatch.
  inputs:
    - Safe non-denylisted fully_automatic gate
    - Ordered options and original recommendation
    - Agreeing or disagreeing valid Advisor response
    - Same-phase or forward-phase continuation target
  expected: Agreement or one-logical-Arbiter resolution persists full provenance and starts the next target in the same active turn without UI.
  actual: No executable Codex adapter/evaluator/workflow consumer performs that sequence; the native E2E exits 77.
regression_risk_areas:
  - Hard denylist and protected user gates
  - Manual and advisor policies
  - Retry, arbitration, and pending-state resume
  - Terminal idempotency and report/transition recovery
  - Schema migration, concurrent state writes, modes, and crash windows
  - Same-phase workflow inventories and phase-entry guards
  - Generated platform parity and capability projection
root_cause_hypothesis: Gate policy is prose-only at selection time, the runner starts after selection and stops before routing, and Codex has no active-turn binding connecting those boundaries.
user_journey_impact:
  reachability_change: "0"
  discoverability_before: 2
  discoverability_after: 9
  flow_integration: positive
integration_points:
  - Canonical orchestrator framework runtime and references
  - Research, product-design, development, migration, and performance workflows
  - Codex adapter, build projection, smoke checks, integration, and native E2E
  - Shared contract, migration, workflow-loop, and failure-injection tests
  - Makefile build, validation, and host capability matrix
patterns_to_follow:
  - Strict runner input and canonical-state allowlists
  - Atomic reconciliation and failure-injection precedents
  - State-local lock plus revision/CAS
  - Canonical-source/generated-output build discipline
  - Behavior-focused byte/mode/topology-preserving tests
  - Minimal modules with direct callers
architectural_impact: high
data_lifecycle_gaps:
  orphaned_operations:
    - Continuation marker without executable consumer or acknowledgement
    - In-progress phase transition without target-body checkpoint
    - Terminal same-phase choice without stable cursor or receipt
  missing_touchpoints:
    - Shared evaluator and repository
    - Workflow apply-selection and target materialization
    - Codex dispatcher/receiver active-turn binding
    - Schema-v2 migration with realistic legacy fixtures
  completeness_score: 35
decisions_needed:
  critical: []
  important: []
scope_expansion_recommended: false
critical_issues:
  - No executable agreement/arbitration evaluator
  - No exactly-one-logical-Arbiter runtime behavior
  - Runner synthesizes incomplete provenance from a preselected payload
  - No durable same-phase cursor, outbox, dispatch receipt, or dedupe
  - No Codex active-turn binding or successful native E2E
  - No safe schema-v2 migration or shared lock/revision state repository
summary: The repair is a high-risk modificative change with a deterministically demonstrated native-runtime gap. The accepted A3/B1/C1/D1 architecture fully resolves scope, so implementation should proceed test-first without additional scope decisions while capability remains unsupported until real Codex evidence passes.
```
