# Runtime Completion Plan: Advisor and Arbiter Mode

## TL;DR

The current repository contains the advisor/arbiter contract, configuration, read-only agent, platform transforms, approval guard, and reporting format. The missing part is the concrete gate execution flow at every orchestrator call site: invoking the advisor, validating its response, retrying, invoking the arbiter on disagreement, deciding whether to ask the user, persisting the decision before continuation, and resuming from that persisted decision.

This plan completes that missing runtime behavior in the project's Markdown-as-code model. It does not introduce a speculative external service. The shared framework will provide one normative gate-decision algorithm and each supported host will map its own subagent and user-question primitives to that algorithm.

## Key Decisions

- Keep `plugins/maister/` as the source of truth; generated platform variants continue to be produced only by `make build`.
- Implement the gate engine as a reusable orchestrator-framework reference/contract with explicit call-site integration, not as an unconnected description in `orchestrator-patterns.md`.
- Treat host capabilities as an explicit adapter boundary: advisor invocation, arbiter invocation, user gate, state write, and resume read must each be mapped for Cursor, Kiro, Kilo, Copilot, and Codex.
- Keep `implementation-approval` and the safety denylist outside advisor/arbiter authority.
- Fail closed when a host cannot safely inject an automatic answer: fall back to a user gate where interactive input exists; otherwise stop and persist `blocked`.
- Do not enable `fully_automatic` by default. Existing projects remain on `manual` unless configuration opts in per gate type.

## Current Gap

The current implementation defines what an orchestrator should do, but the orchestrator skills do not yet contain a complete, reusable execution algorithm that can be followed deterministically at each gate. The live tests prove that an advisor can be loaded and can return YAML, but they do not prove that a real phase gate:

1. passes the complete context to the advisor;
2. validates the response against the exact option set;
3. performs configured retries with backoff;
4. invokes the arbiter exactly once on disagreement;
5. applies interactive versus fully automatic semantics;
6. writes `gate_history` before changing phase status;
7. resumes without repeating a completed decision; and
8. blocks implementation until explicit user approval.

## Proposed Runtime Contract

Create a single normative gate-decision contract under the orchestrator framework. The exact filename is to be locked during specification, with the recommended location:

`plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`

The contract must define these operations:

```text
evaluate_gate(gate_context, state, host_adapter)
  → normalized_gate_result
```

`gate_context` contains:

- stable `gate_type`;
- exact question and complete option list;
- original recommendation, if one exists;
- policy and safety classification;
- phase summaries, artifact links, dashboard projection, and prior `gate_history`;
- implementation approval status when relevant.

`normalized_gate_result` contains:

- selected option or `pending_user` / `blocked` status;
- final actor (`user`, `advisor`, `arbiter`, or `system`);
- advisor and arbiter raw normalized records;
- retry attempts and backoff outcome;
- rationale, confidence, escalation, and user override;
- state/report persistence status.

The algorithm must be deterministic:

1. Load the persisted state and check whether this exact gate already has a terminal record. If yes, reuse it and do not invoke another model.
2. Classify the gate and apply the hard denylist before reading configurable policy.
3. For `manual` or denylisted gates, present the user gate.
4. For `advisor` and `fully_automatic`, invoke the configured read-only advisor with the full context.
5. Validate YAML strictly: required keys, exact option membership, boolean escalation, allowed confidence, and no extra decision option.
6. Retry malformed, unavailable, or timed-out responses according to the configured attempts and exponential backoff. Persist each attempt in the audit record.
7. If the advisor agrees with the original recommendation, continue only when the gate is not denylisted and confidence/escalation allow it.
8. If the advisor disagrees and arbitration is enabled, invoke the arbiter once with both recommendations and the same read-only context. Apply arbiter retries independently.
9. In `advisor` mode, show the original recommendation, advisor recommendation, and arbiter result to the user and wait for the final choice.
10. In `fully_automatic`, accept only a valid, sufficiently confident arbiter decision for a safe gate. Otherwise fall back to a user gate or persist `blocked`.
11. Persist the complete decision to `orchestrator-state.yml`, refresh dashboard data, and only then update phase status or continue.
12. Generate/update decision-summary Markdown and HTML after a terminal decision and at blocked/failed termination.

## Host Adapter Contract

Each platform must document and implement the following mapping in its generated workflow:

| Capability | Cursor | Kiro | Kilo | Copilot | Codex |
|---|---|---|---|---|---|
| Invoke advisor | custom `maister-advisor` agent | `maister-advisor` JSON agent | `@maister-advisor` | converted advisor agent | native subagent or documented fallback |
| Invoke arbiter | same or configured custom agent/model | same or configured agent/model | same or configured agent/model | same or configured agent/model | same or configured native role |
| User gate | `AskUserQuestion` | chat gate | chat gate | `ask_user` | plain-text user question |
| State write | orchestrator writes YAML | orchestrator writes YAML | orchestrator writes YAML | orchestrator writes YAML | orchestrator writes YAML |
| Resume | `maister:resume` state read | `maister-resume`/chat state read | `.maister` state read | resume workflow state read | `$maister:resume` state read |
| Automatic answer injection | must be proven in E2E | must be proven in E2E | must be proven in E2E | must be proven in E2E | must be proven in E2E |

If a host cannot provide the last capability, its generated documentation must state that `fully_automatic` stops or falls back to manual. It must not silently claim support.

## Implementation Task Groups

### Group 0 — Capability and Boundary Audit

**Dependencies:** None

**Outputs:** `analysis/runtime-capability-matrix.md`, `analysis/runtime-boundary-decision.md`

- Inspect the actual host APIs and current generated instructions for agent invocation, question presentation, hooks, shell calls, and state persistence.
- Identify which operations are genuinely executable on each host and which are only prompt-level conventions.
- Decide whether the shared engine remains Markdown-only or needs a small host-neutral executable helper. Do not add a helper unless at least one host can invoke it reliably and the protocol can be tested.
- Record unsupported capabilities explicitly instead of treating smoke-test delegation as proof of full gate execution.

### Group 1 — Normative Gate Decision Engine

**Dependencies:** Group 0

**Files:** orchestrator-framework reference, state schema, config reference, shared report contract.

- Extract the algorithm above from the current prose into one reusable contract.
- Define the normalized decision schema and validation rules.
- Define idempotency key for a gate (`phase_id + gate_type + question/options hash`).
- Define state transitions: `pending`, `advisor_pending`, `arbiter_pending`, `user_pending`, `decided`, `blocked`, `failed`.
- Define retry records, timeout records, and backoff timestamps.
- Define how a resumed workflow recognizes a terminal decision and avoids duplicate model calls.
- Define report generation from state only, never from transient dashboard data.

### Group 2 — Real Orchestrator Call-Site Integration

**Dependencies:** Group 1

**Files:** development, research, product-design, performance, and migration orchestrator skills; shared implementation executor.

- Replace every generic “apply advisor protocol” instruction with an explicit call to the shared gate engine contract.
- At every phase exit, scope decision, optional phase, verification matrix, fix loop, and approval gate, provide stable `gate_type`, question, options, original recommendation, and context.
- Add the idempotency/resume check before each gate.
- Add the required ordering: decision record → state write → dashboard refresh → phase transition.
- Ensure the implementation executor cannot be reached from advisor or arbiter output.
- Ensure denylisted gates always use the user gate, even when policy says `fully_automatic`.

### Group 3 — Platform Adapter Completion

**Dependencies:** Groups 0–2

- Add explicit Cursor mapping for advisor/arbiter Task calls and final user override.
- Add explicit Kiro chat-gate mapping, including headless defaults and blocked behavior.
- Add explicit Kilo mapping for `@maister-advisor`, chat gates, and state persistence.
- Add explicit Copilot mapping for `ask_user` and converted agent names.
- Add explicit Codex mapping for native subagents and plain-text gates; if custom advisor agents cannot be bundled, define the supported fallback and test it.
- Rebuild all generated variants and validate that transforms preserve the engine algorithm and safety rules.

### Group 4 — Persistence, Reports, and Operator Visibility

**Dependencies:** Groups 1–3

- Persist every advisor attempt, arbiter attempt, escalation, user override, and final decision.
- Refresh dashboard projection after each persisted record.
- Make the dashboard show pending advisor/arbiter/user gates and retry exhaustion.
- Generate both decision-summary files after every terminal decision and after blocked/failed termination.
- Verify that HTML is a faithful companion of Markdown and contains no unique decision data.

### Group 5 — Tests and Fixtures

**Dependencies:** Groups 1–4

Add deterministic fixtures that do not depend on model judgment:

- advisor agrees with original recommendation;
- advisor chooses a different option;
- arbiter selects advisor recommendation;
- arbiter selects original recommendation;
- malformed YAML;
- option not in the supplied list;
- low confidence / escalation;
- timeout and retry exhaustion;
- denylisted gate under `fully_automatic`;
- implementation approval rejected or pending;
- duplicate resume after a persisted terminal decision;
- interrupted workflow resumes from `advisor_pending`, `arbiter_pending`, and `user_pending`;
- report generation for success, blocked, failed, and user override;
- advisor attempts to edit files and is denied on every platform.

The fixtures should use deterministic stub responses for policy-engine tests. Live smoke tests remain limited to proving host wiring and one real advisor/arbiter call per host.

### Group 6 — Documentation and Release Readiness

**Dependencies:** Groups 1–5

- Document configuration examples and per-host capability limitations.
- Document the exact meaning of `fully_automatic` and the hard denylist.
- Add resume and recovery runbooks.
- Update generated platform docs and inventories.
- Run the complete Maister verification workflow and record results in the task artifacts.

## Maister Workflow and Gates

The follow-up implementation must use these phases:

1. **Phase 1 — Codebase and capability analysis:** complete Group 0.
2. **Phase 2 — Gap analysis:** confirm the runtime gap and host capability matrix.
3. **Phase 5 — Specification:** lock the engine schema, state machine, adapter boundary, and unsupported-host behavior.
4. **Phase 6 — Specification audit:** verify safety, idempotency, and no unauthorized mutation.
5. **Phase 7 — Implementation plan:** approve task groups and dependencies.
6. **Phase 8 — Implementation:** execute Groups 1–4 only after explicit implementation approval.
7. **Phase 10 — Verification options:** choose deterministic fixtures, platform smoke tests, and optional E2E.
8. **Phase 11 — Verification:** run Groups 5–6 tests and resolve failures.
9. **Phase 12 — E2E:** required for any host claiming `fully_automatic` runtime support.
10. **Phase 13 — User documentation:** required because configuration and host limitations change.
11. **Phase 14 — Finalization:** generate decision summaries and mark the task complete only when the Definition of Done passes.

Required plain-text gates:

- **Architecture gate:** “Czy akceptujesz architekturę wspólnego gate engine z adapterami per host oraz fail-closed dla nieobsługiwanych hostów?”
- **Scope gate:** “Czy akceptujesz pełny zakres Groups 0–6, w tym deterministyczne testy resume/retry/arbiter i E2E dla każdego hosta deklarującego `fully_automatic`?”
- **Implementation approval gate:** “Czy zatwierdzasz rozpoczęcie implementacji tego zakresu? Żaden agent nie może modyfikować kodu przed tą akceptacją.”
- **Verification gate:** “Które platformy mają zostać dopuszczone do `fully_automatic`, a które mają pozostać przy manual fallback do czasu spełnienia E2E?”

## Definition of Done

- [ ] A real orchestrator call site executes the shared gate algorithm; no call site only references the protocol abstractly.
- [ ] Advisor output is strictly validated and limited to supplied options.
- [ ] Retry/backoff and exhaustion are observable and persisted.
- [ ] Disagreement invokes exactly one arbiter with complete context.
- [ ] Interactive mode always gives the user the final choice after disagreement.
- [ ] Fully automatic mode never bypasses the denylist or implementation approval.
- [ ] Every decision is persisted before phase continuation and is idempotent on resume.
- [ ] Success, blocked, failed, retry, arbitration, and user override appear in MD and HTML summaries.
- [ ] Deterministic tests cover all state transitions and failure paths.
- [ ] Every supported platform has a passing runtime smoke test; unsupported hosts explicitly fail closed.
- [ ] `make build`, `make validate`, `git diff --check`, and the complete relevant test suite pass.
- [ ] The Maister Standards Compliance Checklist is fully checked.

## Standards Compliance Checklist

- [ ] Source-of-truth edits are limited to `plugins/maister/`; generated variants are rebuilt with `make build` (from `.maister/docs/standards/global/plugin-development.md`).
- [ ] Platform transforms, manifests, permissions, and smoke tests are updated together (from `.maister/docs/standards/global/build-pipeline.md`).
- [ ] Inputs and advisor outputs are validated at the boundary; malformed or unsafe data fails closed (from `.maister/docs/standards/global/validation.md`).
- [ ] Errors are classified, persisted, surfaced, and never silently ignored (from `.maister/docs/standards/global/error-handling.md`).
- [ ] No speculative runtime proxy or unused abstraction is introduced before the capability audit proves the seam (from `.maister/docs/standards/global/minimal-implementation.md`).
- [ ] Tests focus on behavior, use deterministic stubs for model calls, and cover critical paths and recovery (from `.maister/docs/standards/testing/test-writing.md`).
- [ ] Full validation runs before completion and the verification artifact records exact commands and results (from `.maister/docs/standards/global/conventions.md`).

## Open Questions / Risks

- Which host APIs can actually inject a validated automatic answer rather than merely display instructions?
- Can Codex bundle or resolve the advisor/arbiter agent in the plugin distribution, or must it use a native subagent fallback?
- Should the host-neutral engine be executable code, or is the Markdown contract sufficient once every call site follows it explicitly?
- How should a non-interactive host expose a blocked gate to CI without accidentally treating it as approval?
- What timeout budget is acceptable for three advisor retries plus three arbiter retries?

## Approval

This is a plan-only artifact. No implementation changes from Groups 1–6 should begin until the architecture, scope, and implementation-approval gates above receive explicit user approval.
