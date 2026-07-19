# Specification Audit: Unified Agent Projections and Exact Invocation

## TL;DR

**Verdict: Compliant for implementation planning.** The revised specification resolves the two previously blocking identity ambiguities and all three medium findings. Codex now has an executable, tested process-worker architecture with an explicit E5 discovery subject and E6 invocation proof; Advisor and Arbiter use exact canonical role binding and the common execution policy. The Agent IR, execution-event durability, and test-count contracts are now precise enough to plan.

## Key Decisions

- Codex uses managed `codex exec` workers, not native custom-agent selection or generic subagent inheritance, whenever per-role model and reasoning policy must be enforced.
- Manifest identity separates `logical_role_id`, `adapter_id`, and nullable `native_role_external_id`; Codex uses `adapter_id: codex.exec` with no native role ID.
- Codex E5 proves the authenticated `codex.exec` adapter and exact required CLI controls. Cursor and Kiro E5 continue to prove exact native inventories.
- Both gate actors default to exact `maister:advisor`; their decision-attempt identities remain separate while role, model, effort, resolver, and adapter paths are shared.
- Runtime evidence is a per-dispatch locked, fsynced, hash-chained JSONL event stream rather than an undefined mutable record.

## Open Questions / Risks

- CLI control names, model catalogs, authentication behavior, and persisted session metadata are version-sensitive. The specified capability probe and `unavailable` outcome contain this risk.
- Read-only process workers may run concurrently, but write workers remain serialized until isolated-worktree ownership and merge semantics are designed.
- HTML and dashboard companions must be regenerated from the revised Markdown before the Phase 6 exit gate; they are presentation artifacts and do not change this compliance verdict.

## Audit Scope and Evidence

Reviewed artifacts:

- `implementation/spec.md`
- `analysis/requirements.md`
- `analysis/technical-clarifications.md`
- `analysis/codex-agent-runtime-experiment.md`
- `.maister/docs/standards/global/*.md`
- `.maister/docs/standards/testing/test-writing.md`
- current Codex CLI `0.144.5` help and persisted runtime observations

The audit checks all 35 requirements for clarity, consistency, testability, standards compliance, and preservation of the approved clean-install scope.

## Compliance Matrix

| Dimension | Result | Evidence |
|---|---|---|
| Completeness | Compliant | R1–R35 cover canonical roles, projection, transactions, process/native adapters, execution events, evidence, release, and clean cutover. |
| Clarity | Compliant | Codex process identity, E5 subject, E6 observations, actor binding, and failure outcomes are explicit. |
| Internal consistency | Compliant | R4, R13, R24, and R29 distinguish logical role, adapter, and optional native identity without requiring impossible Codex native IDs. |
| Testability | Compliant | CLI controls, role nonces, schemas, policy observations, event sequences, digests, and target-specific discovery subjects are observable. |
| Standards | Compliant | The fixed test ceiling was removed; tests follow distinct behavioral and failure boundaries. Persistence and failure paths are explicit and fail closed. |
| Scope discipline | Compliant | Native Codex custom agents, V1/V2 switching, app-server orchestration, and parallel write-worker worktrees are explicitly out of scope. |

## Resolution of Previous Findings

### H1 — Codex per-role E5 identity

**Status: Resolved.**

The manifest now contains three separate identity fields:

- `logical_role_id`: exact `maister:<role_id>`;
- `adapter_id`: target execution/discovery adapter;
- `native_role_external_id`: nullable host-native identity.

Codex uses `adapter_id: codex.exec` and `native_role_external_id: null`. R29 defines Codex E5 as discovery of an authenticated allowed CLI version and the exact required process-control surface: working directory, model, reasoning effort, sandbox, JSONL, output schema, and last-message output. Structural validation proves the 28 prompt/policy projections; E6 proves exact logical-role execution. This preserves independent structural, discovery, and invocation evidence without inventing native Codex role IDs.

### H2 — Advisor/Arbiter workflow binding

**Status: Resolved.**

R6, R16, R34, and the runtime approach now define the clean cutover:

- `advisor_agent` and `arbiter_agent` accept exact logical IDs;
- both default to `maister:advisor`;
- Advisor and Arbiter remain distinct decision actors, idempotency contexts, and attempt streams;
- both resolve the same canonical role and common target execution profile;
- legacy `advisor_model`, `arbiter_model`, unnamespaced `advisor`, and non-canonical `arbiter` values are removed from source defaults/init/orchestrators/evaluator inputs and rejected rather than rewritten.

There is no Advisor-only model, permissions, destination, adapter, or evidence branch.

### M1 — Agent IR metadata and skill dependencies

**Status: Resolved.**

The specification now publishes a closed frontmatter schema for `name`, `description`, `model`, `color`, and `skills`, including requiredness, defaults, normalization, serialization, rejection rules, and exact immutable skill-resolution roots. Target execution policy, transforms, destinations, and tools profiles come from closed overlay tables rather than prompt-body inference.

### M2 — Execution-record durability

**Status: Resolved.**

R27 defines one immutable JSONL stream per dispatch under the workflow task path, modes `0700/0600`, a per-dispatch lock, canonical event kinds, monotonic sequence, hash chain, idempotency reuse, fsync-before-side-effect ordering, recovery validation, and fail-closed behavior for pre- and post-spawn recording failures.

### M3 — Fixed test-count ceiling

**Status: Resolved.**

The `2–8` range was removed. The specification now requires the minimum non-redundant tests necessary to cover every distinct behavior and failure boundary, with no fixed maximum.

## Requirement Coverage

| Area | Requirements | Result |
|---|---:|---|
| Canonical role domain | R1–R6 | Pass |
| Projection and provenance | R7–R12 | Pass |
| Host representations and execution profiles | R13–R16 | Pass |
| Multi-root transaction and ownership | R17–R22 | Pass |
| Resolver, adapters, and execution events | R23–R28 | Pass |
| Evidence, release, topology, documentation | R29–R35 | Pass |

Requirements checked: **35**. Requirements passed: **35**.

## Planning Constraints

The implementation planner must preserve these dependency edges:

1. Agent IR and target execution-profile schema precede manifest generation.
2. Manifest identity separation precedes resolver and E5/E6 work.
3. Durable execution-event writer precedes live worker/process dispatch.
4. Codex capability probe and process manager precede Codex E6 scenarios.
5. Exact Advisor/Arbiter configuration cutover precedes gate-evaluator integration.
6. Managed-root schema/lifecycle changes remain an atomic Kiro delivery group.
7. Release/support claims remain last and require corrected E5/E6 evidence.

## Verdict

**Compliant. Proceed to the Phase 6 exit gate and, after approval, implementation planning.** No critical, high, medium, or low specification findings remain open. Runtime availability may still produce a specified `unavailable` evidence result; that is an operational outcome, not a specification ambiguity.
