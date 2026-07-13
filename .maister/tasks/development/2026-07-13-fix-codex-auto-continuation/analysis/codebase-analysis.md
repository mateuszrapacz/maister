# Codebase Analysis: Codex Fully Automatic Continuation

## TL;DR

The repository specifies the intended Advisor/Arbiter behavior, but does not execute it: there is no shared evaluator and no Codex active-turn binding.
`phase-continue.mjs` is a sound starting point for commit/report/phase-transition behavior, but it accepts a narrow selected-result payload, synthesizes incomplete history, and exits without routing or dispatching the next work item.
Research and product-design expose the same-phase failure most clearly; all five orchestrators also contain user-question-only phase-entry guards that reject a valid automatic gate record.
The accepted repair is A3/B1/C1/D1: shared executable evaluator, evaluator-owned full decision record, workflow-owned durable inventory/outbox/receipt, and a thin host-native Codex binding.
Overall complexity and risk are **high** because the change crosses state schema, crash recovery, multiple workflow call sites, generated variants, and capability evidence.

## Key Decisions

- Keep four boundaries distinct: the evaluator selects, the runner persists and projects, the workflow loop routes, and the Codex binding preserves the active turn.
- Make the evaluator, not the runner, own the complete pending-to-terminal gate envelope and exactly-one-logical-arbiter semantics.
- Use `orchestrator.current_phase` as the only mutable phase cursor; migrate away from the competing `started_phase` meaning.
- Give sequential workflow work items stable IDs and durable dispatch receipts; runner stdout or a phase status change alone is not continuation proof.
- Edit only canonical files under `plugins/maister/` and host adapters under `platforms/`; regenerate committed platform variants through `make build`.
- Keep Codex `fully_automatic` capability `unsupported` until a real host-native E2E exits 0 and proves agreement, disagreement, same-phase and next-phase continuation, no UI, resume, and deduplication.

## Open Questions / Risks

- The exact Codex host-native active-turn hook and injectable role-invocation seam still require a narrow implementation spike; current packaging exposes no executable binding.
- Schema-v2 migration must handle real, richer `gate_history` snapshots without losing provenance and must fail closed on ambiguous state.
- Exactly-once can only mean one logical effect: physical dispatch may retry after interruption and therefore needs a stable `dispatch_id` plus receiver deduplication.
- The proposed repository becomes a shared writer boundary; locking, revision/CAS, atomic replacement, mode preservation, and directory durability must be correct across macOS/Linux.
- Product-design backward refinement is not part of this repair and must not weaken the runner's forward-only transition rule.

Generated: `2026-07-13T17:56:39Z`

## 1. Scope and Current-State Conclusion

This report distinguishes **current repository facts** from **accepted research recommendations**.

Current fact: Maister already has detailed prose describing exact four-field role responses, agreement, one logical arbiter, retry, idempotency, persistence ordering, and automatic continuation. The normative contract is in `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md:1-565` and is repeated in `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:97-135`. There is no executable `evaluate_gate` implementation corresponding to that prose.

Current fact: the only executable continuation component is `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`. It validates a transport payload (`:209-244`), parses a narrow gate-history/state schema (`:502-561`), validates forward transitions (`:564-588`), writes temporary files and renames them (`:597-617`), appends a gate record (`:642-659`), updates phase state textually (`:661-700`), writes reports, emits JSON, and exits (`:741-800`). It does not invoke Advisor/Arbiter roles, apply a domain choice, advance a same-phase cursor, or dispatch a phase body.

Accepted recommendation: implement the A3/B1/C1/D1 architecture documented in the research artifacts under `analysis/research-context/`. Research informs the repair but does not prove that any recommended runtime exists today.

## 2. Ranked File Map

### Primary files

1. `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`
   - Defines the desired gate context, role-response allowlist, agreement/arbitration logic, retry/resume behavior, persistence order, host continuation primitive, and hard denylist.
   - Current limitation: it is documentation only. `tests/gate-decision-engine.test.sh` checks phrases and fixture labels rather than executing a state machine.

2. `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
   - The present executable commit boundary.
   - `validatePayload` (`:209-244`) enforces exact JSON transport.
   - State/history parsing (`:502-561`) expects the current narrow schema.
   - Transition validation (`:564-588`) requires `current_phase` and forward movement.
   - `atomicWrite` (`:597-617`) stages and renames output, but there is no shared lock, revision/CAS, explicit directory `fsync`, or complete mode-preservation contract.
   - `appendGateHistory` and `updatePhaseState` (`:642-700`) perform textual YAML insertion/replacement.
   - `main` (`:741-800`) synthesizes `original_recommendation` from `selected_option` and a generic rationale at `:775-776`, then prints JSON and terminates.

3. `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`
   - Defines shared orchestration state and gate rules.
   - Current mismatch: the state template still uses `started_phase` at `:280`, while the runner requires `orchestrator.current_phase` for transitions (`phase-continue.mjs:555-569`). This is a split-brain risk.
   - Its fully automatic prose at `:120-135` is the intended behavior that should become executable.

4. `plugins/maister/skills/research/SKILL.md`
   - Best reproduction of broken same-phase continuation.
   - Phase 4 requires decision areas sequentially because later choices may depend on earlier ones (`:329-349`), but the instruction remains “If user picks → record choice, move to next area” (`:349`). There is no stable work-item ID, durable cursor, outbox, receipt, or dispatcher.
   - Phase-entry checks require an `AskUserQuestion` call ID (`:265-269`, `:367-371`, `:416-420`), which rejects a valid terminal automatic gate record.

5. `platforms/codex-cli/templates/advisor.toml`
   - Correctly constrains the Advisor to a read-only, exact four-field YAML result (`:1-18`).
   - Current limitation: statements about a “Codex host adapter” and `phase_continue(selected_option)` are declarative instructions; no corresponding executable adapter is installed.

6. `platforms/codex-cli/build.sh`
   - Copies canonical skills and transforms Markdown (`:135-175`) and validates the capability-matrix entry (`:315-331`).
   - Current limitation: it does not build or copy a Codex-only evaluator/runner/active-turn binding beyond inherited shared skill files.

7. `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`
   - Current fact: it always prints that no deterministic Codex adapter harness exists and exits `77` (`:1-5`). This is the authoritative reason capability remains unsupported.

8. `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`
   - Correctly declares Codex `unsupported` and points to the native E2E target (`:14-16`).
   - Must remain unchanged until host-native evidence succeeds.

### Related consumers and infrastructure

- `plugins/maister/skills/development/SKILL.md`: many gate call sites, repeated runner transport contract, scope-decision sequencing, and user-question-only phase-entry guards (`:102-168` and subsequent phase entries).
- `plugins/maister/skills/product-design/SKILL.md`: sequential decision areas and backward-refinement concerns; uses the same prose engine and user-question entry checks (`:79-100`, `:415`, `:459`, `:511-543`).
- `plugins/maister/skills/migration/SKILL.md`: duplicates engine/adapter prose and entry checks (`:66-90`, `:212` onward).
- `plugins/maister/skills/performance/SKILL.md`: duplicates engine/adapter prose and entry checks (`:67-90`, `:220` onward).
- `plugins/maister/skills/research/SKILL.md`: sequential convergence needs a durable work inventory, not only a phase transition.
- `tests/phase-continue-contract.test.sh`: strongest current executable runner specification.
- `tests/fully-automatic-phase-continue.test.sh`: concise happy-path phase mutation, idempotent reuse, and denylist test, but not an evaluator or dispatcher test.
- `tests/gate-decision-engine.test.sh` and `plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml`: prose/catalog conformance only.
- `tests/advisor-config-reconciliation.test.sh`, `tests/advisor-init-lifecycle.test.sh`, and `tests/advisor-workflow-snapshot.test.sh`: transactional and snapshot precedents.
- `plugins/maister/skills/init/bin/reconcile-advisor-config.sh`: strongest same-directory staging, validation, permission/no-op preservation, backup/restore, rollback, and failure-injection precedent (`:37-38`, `:222-257`, `:330-346`, `:414-438`).
- `Makefile:1-62`: executes source/generated runner matrices and host capability validation; `:50` explicitly rejects shared runner tests as host-native evidence.
- `platforms/codex-cli/smoke-cli.sh:66-89`: validates files and phrases, not runtime continuation.

## 3. Execution and Data Flow

### Current execution flow

```text
workflow gate call site
  -> Markdown instruction to evaluate the gate
  -> read-only advisor.toml prompt profile
  -> [missing executable evaluator and role-invocation adapter]
  -> phase-continue.mjs, if explicitly invoked
       -> validate narrow JSON/state
       -> append synthesized terminal gate record
       -> generate reports
       -> optionally mutate current_phase/phases[]
       -> print compact JSON and exit
  -> [missing apply-choice, cursor/outbox, dispatch, active-turn continuation]
```

The immediate failure is therefore not option selection alone. Even when the runner exits 0, no consumer turns that result into “apply the selected approach, persist the next target, and start it now.” For a same-phase decision area, `next_phase` is inapplicable and self-transition is rejected. For a next-phase gate, the runner can mutate state but cannot execute the target phase body.

### Accepted target flow

```text
workflow call site
  -> shared evaluator
       -> persist advisor_pending and attempts
       -> invoke read-only Advisor
       -> agreement: terminal actor=advisor
       -> disagreement: one logical Arbiter, retries inside that record
       -> persist complete terminal envelope
  -> phase-continue runner
       -> verify terminal envelope and idempotency
       -> project reports
       -> optionally commit forward phase transition
  -> thin Codex binding returns continue|user_gate|blocked
  -> workflow loop
       -> apply selection
       -> persist next work item/phase-entry outbox with dispatch_id
       -> dispatch and record checkpoint/receipt
       -> continue in the same active turn
```

The runner remains deliberately domain-agnostic. Same-phase inventory belongs to the workflow; host-native role/turn mechanics belong to the Codex binding.

## 4. Important Functions and Responsibilities

| Current function/area | Current responsibility | Gap relevant to this repair |
|---|---|---|
| `validatePayload`, `phase-continue.mjs:209-244` | Exact input keys/types and transport shape | Accepts a preselected result rather than a full persisted evaluator record |
| history/state validators, `:502-561` | Narrow canonical-state preflight | Reject or cannot preserve richer real gate histories and provenance |
| transition validation, `:564-588` | Forward phase transition invariants | Correctly does not solve same-phase routing or phase-body dispatch |
| `atomicWrite`, `:597-617` | Same-directory temp write and rename | Needs shared locking, revision/CAS, mode and directory-durability guarantees |
| `appendGateHistory`, `:642-659` | Append synthesized gate YAML | B1 requires update-in-place pending-to-terminal ownership by evaluator |
| `updatePhaseState`, `:661-700` | Textual phase/current-phase update | Should use the shared versioned state repository and schema invariants |
| `main`, `:741-800` | Validate, persist, report, transition, emit JSON | Stops at runner outcome; no workflow cursor or dispatch consumer |
| `evaluate_gate` prose | Specifies policy and result state machine | Must become a small executable evaluator with injected `roleInvoker` |

## 5. Tests and Coverage Assessment

### Existing strengths

- `tests/phase-continue-contract.test.sh` verifies exact stdin/`--input-file` transport, JSON-only stdout, schema rejection, denylist handling, transition invariants, immutable terminal reuse, report recovery, and rejection without mutation. It is the primary template for extending the runner contract.
- `tests/fully-automatic-phase-continue.test.sh:1-63` demonstrates a selected Advisor result can transition `phase-1` to `phase-2`, reuse the decision idempotently, and reject automatic implementation approval.
- Advisor configuration tests use byte comparisons, permission checks, rollback injection, and topology assertions. They align with `.maister/docs/standards/testing/test-writing.md` and should be reused for state-repository rejection tests.
- `Makefile:50` and the capability matrix correctly distinguish shared/integration tests from real host-native evidence.

### Critical missing coverage

1. Executable evaluator tests with role call logs and exact counts:
   - agreement: Advisor 1, Arbiter 0, user UI 0;
   - disagreement: Advisor 1 and exactly one logical Arbiter, including Arbiter retry/resume;
   - invalid schema/option, low confidence, escalation, exhaustion, denylist, and pending-state resume.
2. Full-record runner consumption and versioned migration tests using realistic workflow state rather than narrow synthetic history.
3. State-repository concurrency and transaction tests: lock timeout, stale revision/CAS, crash windows, byte/mode/topology preservation, and no partial report/state transition.
4. Workflow-loop tests for two dependent same-phase items and a next-phase entry checkpoint, including deterministic `dispatch_id` deduplication.
5. Codex adapter integration with fake role invoker, fake dispatcher, and a UI spy that fails if successful `fully_automatic` execution presents a question.
6. Deterministic build/projection tests proving the binding reaches `plugins/maister-codex/` from canonical/adapter sources.
7. Real Codex host-native E2E covering agreement, arbitration, same-phase, next-phase, resume, dedupe, and no UI. Only this test may justify the capability flip.

## 6. Reusable Patterns and Constraints

### Patterns to reuse

- **Strict CLI boundary:** copy the runner's duplicate-key-safe JSON parsing, exact allowlists, canonical YAML rejection, deterministic gate-key hashing, stderr diagnostics, and JSON-only stdout behavior.
- **Transactional file update:** follow `reconcile-advisor-config.sh` for same-directory staging, complete validation before replacement, no-op preservation, mode preservation, backup/restore, and injectable failures.
- **State-local bounded lock:** the repository has an atomic `mkdir` lock precedent in `platforms/kiro-cli/build.sh`; use a task/state-local lock rather than global temporary state.
- **Canonical/generated ownership:** shared runtime belongs under `plugins/maister/skills/orchestrator-framework/`; Codex-only binding belongs under `platforms/codex-cli/`; generated trees must come from `make build`.
- **Risk-based transactional assertions:** rejected inputs and injected failures must preserve bytes, modes, and directory topology, not merely return nonzero.

### Anti-patterns to avoid

- Do not turn `phase-continue.mjs` into the evaluator or domain dispatcher.
- Do not add Codex-only gate-policy semantics; policy must remain shared.
- Do not manipulate rich state through ad hoc textual YAML splicing.
- Do not treat runner stdout, report generation, or `current_phase` mutation as evidence that the next work actually started.
- Do not introduce a daemon, MCP service, event store, or generalized persistence abstraction without evidence that the thin host-native binding cannot work.
- Do not edit `plugins/maister-codex/`, `plugins/maister-cursor/`, or `plugins/maister-kiro/` directly.
- Do not mark Codex supported based on smoke tests, fake-port integration, or shared runner tests.

## 7. Complexity and Risk

**Complexity: high.** The implementation is small in conceptual modules but wide in integration surface:

- JavaScript ESM runtime and shell tests;
- a versioned YAML state contract and migration;
- concurrent sequential writers across evaluator and runner;
- five canonical workflow consumers;
- Codex adapter/build projection;
- source plus three generated runner matrices;
- crash recovery and exact non-mutation requirements.

**Risk level: high.** A false success can silently bypass a user gate, lose decision provenance, double-dispatch work, strand a phase after state mutation, or advertise a capability the host cannot execute. Fail-closed behavior and host-native evidence are release conditions, not optional hardening.

Likely task characteristics for downstream planning:

- `has_reproducible_defect: true`
- `modifies_existing_code: true`
- `creates_new_entities: true` (small runtime/helper modules and fixtures)
- `involves_data_operations: true` (versioned YAML state, reports, receipts)
- `ui_heavy: false`

## 8. Impact Analysis

### Direct impact

- Shared orchestration state and gate semantics under `plugins/maister/skills/orchestrator-framework/`.
- All canonical gate-consuming orchestrators: development, research, product-design, migration, and performance.
- Codex packaging and runtime behavior under `platforms/codex-cli/`.
- Contract, integration, build, and capability test matrices.

### Generated impact

`make build` will project shared framework changes into Codex, Cursor, and Kiro variants. Host-specific Codex binding files need an explicit adapter copy rule. Generated diffs are expected consequences, not edit targets.

### Compatibility impact

- Existing real state may contain `started_phase`, narrow or rich histories, and no schema version/revision. Migration must be explicit and fail closed.
- Manual, denylisted, low-confidence, escalation, exhaustion, and unsupported-host paths must retain user-gate/blocked behavior.
- Phase-entry checks must accept either an actual user-question call proof or a persisted terminal automatic record with matching continuation receipt; simply deleting the checks would weaken safety.

## 9. Implementation Recommendations

1. Define schema v2 and executable fixtures first: full gate envelope, `current_phase`, `revision`, work inventory, continuation target, dispatch outbox, and receipt/checkpoint.
2. Add a narrowly scoped shared `state-repository.mjs` used directly by evaluator and runner: bounded state-local lock, validate-under-lock, expected-revision CAS, same-directory temp/`fsync`/rename, directory `fsync`, and mode preservation.
3. Add `gate-evaluate.mjs` plus a small core with an injected read-only role invoker. Enforce exact four-key responses, agreement short-circuit, one logical Arbiter, retries within one role record, and resume without re-invoking completed roles.
4. Change `phase-continue.mjs` to verify and reuse the evaluator-owned terminal record. Keep report generation and optional forward phase transition; remove synthesized provenance.
5. Implement one tracer-bullet workflow loop, preferably research Phase 4: two stable dependent work items, applied choice, deterministic outbox/receipt, and same-turn next dispatch.
6. Add a thin Codex binding that maps host-native role calls and evaluator/runner outcomes to `continue | user_gate | blocked`; on `continue`, return control to the workflow loop without ending the turn.
7. Migrate phase-entry guards and gate consumers across research, product-design, development, migration, and performance.
8. Extend Codex build/smoke/integration coverage, then run `make build` and the complete validation matrix.
9. Replace the Codex E2E skip only when the real entrypoint is observable. Flip `host-capabilities.yml` to supported only after that target exits 0.

These recommendations implement the accepted research architecture; they are not descriptions of code currently present.

## 10. Next Steps for Specification and Planning

- Specify the schema-v2 envelope, migration rules, repository invariants, and crash windows before assigning implementation groups.
- Make the TDD red gate reproduce both visible failure modes: agreement still requires interaction/stops, and disagreement cannot prove exactly one logical Arbiter plus automatic next dispatch.
- Split implementation into tracer bullets with explicit dependencies: schema/repository, evaluator, runner consumption, workflow loop, Codex binding, call-site migration, build projection, and host-native proof.
- Require every group that mutates state to include byte/mode/topology rejection tests.
- Preserve unrelated dirty work and review generated diffs separately from canonical edits.
- Keep capability activation as the final evidence-gated step, not part of initial runtime implementation.
