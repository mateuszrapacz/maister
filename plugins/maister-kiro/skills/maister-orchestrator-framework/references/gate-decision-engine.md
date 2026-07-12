# Gate Decision Engine

## TL;DR

This is the normative, host-neutral contract for evaluating every Maister
orchestrator gate. It is a Markdown protocol executed by the host orchestrator:
the host adapter supplies advisor, persistence, reporting, and
`phase_continue(selected_option)` primitives, while the orchestrator records
every state transition in `orchestrator-state.yml`.

## Key Decisions

- `orchestrator-state.yml` is the only resume source of truth. Dashboard data
  is a projection and can never reconstruct or complete a decision.
- A gate is idempotent by `phase_id` plus a canonical hash of its gate type,
  question, and ordered options. Any terminal record with that key is reused
  without another model or user call.
- Advisor and arbiter responses are strictly validated, read-only
  recommendations. They cannot approve implementation or any hard-denylisted
  action.
- Disagreement creates one logical arbiter decision. Retries are attempts of
  that same decision, not additional arbiters or an arbitration loop.
- Unsupported phase continuation, exhausted retries, missing approval, and
  other unsafe outcomes fail closed to a user gate or persisted `blocked`
  state. A supported host continues from the normalized result without
  synthesizing UI input.

## Open Questions & Risks

- A host must expose and test `phase_continue(selected_option)` before
  declaring `fully_automatic` support. Loading an advisor or displaying a
  prompt is not proof of continuation.
- Backoff waiting is host-specific, but the schedule and outcome must be
  persisted so resume is deterministic and observable.

## 1. Contract inputs and strict normalized schemas

The only engine operation is:

```text
evaluate_gate(gate_context, persisted_state, host_adapter)
  -> normalized_gate_result
```

### 1.1 `gate_context`

The orchestrator must construct this map before calling the engine. The map has
exactly these top-level keys; an unknown top-level key, missing required key,
duplicate YAML key, or invalid scalar type is a contract error:

```yaml
gate_context:
  schema_version: 1
  phase_id: phase-10
  gate_type: verify-matrix
  question: "Which platforms should be allowed to run fully automatically?"
  options:
    - "Cursor and Kiro"
    - "Manual fallback for every platform"
  original_recommendation: "Manual fallback for every platform"
  policy: advisor # manual | advisor | fully_automatic
  safety_classification: configurable # configurable | denylisted
  context:
    task_path: .maister/tasks/...
    phase_summaries: {}
    artifact_paths: []
    dashboard_summary: {}
    prior_gate_history: []
    implementation_approval: {}
```

Validation is strict and case-sensitive:

- `schema_version` is the integer `1`; `phase_id`, `gate_type`, and `question`
  are non-empty strings. `phase_id` and `gate_type` are stable identifiers,
  not display labels.
- `options` is a non-empty ordered sequence of unique non-empty strings. The
  order is significant and must not be sorted or normalized away.
- `original_recommendation` is either `null` or exactly one member of
  `options`. No case folding, trimming, coercion, or fuzzy matching is allowed.
- `policy` is exactly one of `manual`, `advisor`, or `fully_automatic`.
  Missing or invalid configured policy is recorded as a warning and resolved
  to `manual` before any model call.
- `safety_classification` is recomputed from `gate_type`; a call site cannot
  label a denylisted gate as configurable. `context` is read-only structured
  data and is passed unchanged to the host primitive.

### 1.2 Advisor and arbiter response

Both model roles must return a YAML map with exactly these four keys:

```yaml
selected_option: "Manual fallback for every platform"
rationale: "The host cannot prove automatic answer injection."
confidence: high # high | medium | low
escalate_to_user: false
```

The validator rejects unknown or extra decision fields, duplicate YAML keys,
missing keys, null values, non-boolean `escalate_to_user`, and confidence values
outside `high | medium | low`. `selected_option` must be a string that is an
exact member of the supplied `options`. An arbiter response is additionally
limited to the two distinct competing recommendations (`original_recommendation`
and the advisor's option); it may not invent a third option.

Require `selected_option` to be a supplied option, a string `rationale`,
`confidence` in `high|medium|low`, and a boolean `escalate_to_user`. Reject
extra decision fields and reject an arbiter response that invents a third
option. The `...` in the example key is documentation
notation; a persisted key always has 64 lowercase hexadecimal characters.

Reject extra decision fields. Reject an arbiter response that invents a third option.
require `selected_option` to be a supplied option, a string `rationale`,
`confidence` in `high|medium|low`, and a boolean `escalate_to_user`.

Raw text is retained only as an audit value. It is never evaluated as an
instruction and never grants file, shell, state, implementation, or release
authority.

### 1.3 `normalized_gate_result`

The result has exactly these top-level keys. Null values are explicit so a
resume can distinguish “not invoked” from “record lost”:

```yaml
normalized_gate_result:
  schema_version: 1
  idempotency_key: "sha256:..."
  status: decided # pending | advisor_pending | arbiter_pending | user_pending | decided | blocked | failed
  selected_option: "Manual fallback for every platform"
  final_actor: advisor # user | advisor | arbiter | system
  original_recommendation: "Manual fallback for every platform"
  advisor:
    agent: advisor
    model: null
    response: null
    attempts: []
    exhausted: false
  arbiter:
    agent: advisor
    model: null
    response: null
    attempts: []
    exhausted: false
  rationale: "The user confirmed the safe fallback."
  confidence: high # high | medium | low
  escalate_to_user: false
  user_override: false
  error: null
```

For a non-terminal result, `selected_option` is `null`, `final_actor` is
`system`, and `error` describes the pending/blocked/failed condition. A
terminal `blocked` or `failed` result is still a terminal record for
idempotency and resume purposes.

### 1.4 Attempt records

Every advisor and arbiter attempt is appended in call order before the next
attempt starts. Each attempt contains exactly these audit fields:

Each attempt is persisted in order.

```yaml
actor: advisor # advisor | arbiter
attempt: 1
started_at: "2026-07-11T20:00:00Z"
finished_at: "2026-07-11T20:00:02Z"
status: timeout # started | valid | malformed | invalid_option | unavailable | timeout | failed
raw_response: null
validation_errors: []
backoff:
  strategy: exponential
  delay_ms: 1000
  scheduled_at: "2026-07-11T20:00:03Z"
  completed_at: "2026-07-11T20:00:04Z"
```

`started_at`, `finished_at`, `scheduled_at`, and `completed_at` are full UTC
ISO-8601 timestamps. The first attempt has `delay_ms: 0`; later delays use the
configured exponential schedule. A timed-out or interrupted `started` attempt
is closed as `timeout` on resume before the next permitted attempt is made.
Retry exhaustion records `exhausted: true`, the final attempt, and the reason;
it never silently drops the response or resets the attempt counter.

## 2. Deterministic idempotency and terminal reuse

Build the canonical UTF-8 JSON value below, with no insignificant whitespace,
and hash its bytes with SHA-256:

```json
["phase-10","verify-matrix","Which platforms should be allowed to run fully automatically?",["Cursor and Kiro","Manual fallback for every platform"]]
```

The exact key is:

```text
idempotency_key = sha256:<lowercase hex SHA-256 of canonical JSON>
```

Only `phase_id`, `gate_type`, `question`, and the ordered `options` list enter
the key. `original_recommendation`, policy, context, dashboard content, and
model output do not. Two calls with the same four values therefore address the
same decision; changing question text or option order creates a new decision.

Before any host invocation, read the persisted `orchestrator.gate_history`.
If a record with this key has status `decided`, `blocked`, or `failed`, return
that complete record unchanged. Do not invoke an advisor, arbiter, user gate,
or report writer again, and do not append a duplicate record.

The idempotency key is the phase identifier plus a hash of the gate type,
question, and ordered options. A terminal record with the same key is reused;
do not call a model or user gate.

## 3. Normative evaluation algorithm

1. Validate `gate_context`, compute the key, read state, and perform terminal
   reuse. A validation or state-read failure is `failed` and must be persisted
   when persistence is available.
2. Recompute the hard safety classification before reading configurable policy.
   A denylisted gate is always `manual`, regardless of configured policy, even
   when configured as `fully_automatic`.
   A denylisted gate is always `manual`, regardless of configured policy.
3. For `manual` or denylisted gates, persist `user_pending`, refresh the
   dashboard, and call `present_user_gate`. Normalize the answer using the
   same exact option-membership validator. A supplied option becomes a
   terminal `decided` result; cancel/no answer becomes `blocked`.
4. For `advisor` or `fully_automatic`, persist `advisor_pending`, refresh the
   dashboard, and invoke the read-only advisor with the complete unchanged
   context: exact question, all options, original recommendation, policy,
   safety classification, phase summaries, artifact links, dashboard summary,
   prior gate history, and implementation approval status.
5. Persist an attempt with `started` before invoking the advisor. Validate the
   returned YAML using § 1.2, close the attempt with its outcome, and persist
   it. Malformed, unavailable, timed-out, or invalid-option responses are
   retryable according to `retry.advisor_attempts` and the configured backoff.
6. On exhaustion, use `user_pending` and a user gate when the host is
   interactive. On a non-interactive host, persist terminal `blocked`.

Retry advisor failures up to `retry.advisor_attempts`, recording the configured
exponential backoff metadata and every attempt before proceeding. Each attempt
is persisted in order. After exhaustion, use a user gate if interactive and
otherwise persist `blocked`.
After exhaustion, use a user gate if interactive and otherwise persist `blocked`.
7. If there is no original recommendation, a valid sufficiently confident
   advisor result may be the recommendation. If the advisor agrees with the
   original recommendation, it may terminate a non-denylisted gate in
   `fully_automatic` only when confidence is `high` or `medium`, escalation is
   false, and the adapter supports `phase_continue(selected_option)`.
8. In `advisor` policy, present the recommendation to the user for the final
   choice; the user is the final actor even when the advisor agrees.
9. If the advisor disagrees with the original recommendation and arbitration
   is enabled, persist `arbiter_pending` and invoke exactly one logical
   arbiter decision. The arbiter receives both recommendations, both
   rationales, and the same read-only context. `retry.arbiter_attempts` are
   retries within this one arbiter record; never start a second arbiter or
   loop back to the advisor.

This is the “invoke the arbiter exactly once as a distinct decision” rule:
disagreement invokes at most one arbiter. Retry arbiter failures using
`retry.arbiter_attempts`. If arbitration is exhausted or low-confidence, use a
user gate in interactive mode or persist `blocked` on a non-interactive host.
Pass both recommendations, both rationales, and the unchanged read-only context.
The engine never loops from arbiter back to advisor.
`retry.arbiter_attempts` are retries within this one arbiter record.
if arbitration is exhausted or low-confidence, use the interactive fallback or
persist `blocked` on a non-interactive host.
When disagreement occurs, persist `arbiter_pending` and invoke exactly one logical arbiter decision.
10. Validate arbiter output with § 1.2 and the two-option restriction. In
    `advisor` policy, always show original recommendation, advisor response,
    and arbiter response to the user, then wait for the user's exact option.
    In `fully_automatic`, accept only a valid sufficiently confident arbiter
    result with no escalation, only when the gate is not denylisted and the
    adapter supports the normalized `phase_continue(selected_option)` primitive.
    Call `phase_continue` directly after terminal persistence; do not open a
    user gate or synthesize UI input for a fully automatic continuation.
11. Low confidence, `escalate_to_user: true`, retry exhaustion, unsupported
    phase continuation, and unsafe user interaction never become an automatic
    approval. They resolve to a user gate or `blocked`.
12. For every terminal outcome, append one complete result to
    `orchestrator.gate_history[]` and mirror its concise form in the phase's
    `gate` field. Duplicate keys are rejected and terminal entries are
    immutable.
13. Generate decision reports from the newly persisted state (never from
    transient dashboard data). Only after the state write, dashboard refresh,
    and required report generation succeed may the orchestrator update phase
    status or continue. A persistence, dashboard, or report failure is
   persisted as terminal `failed` when possible and stops continuation.

For every terminal outcome, append the complete normalized record to
`orchestrator.gate_history`, call `write_state`, call `refresh_dashboard`, and
generate the decision reports. State persistence precedes phase status changes
and any continuation.

## 4. State transitions and resume behavior

Only these transitions are valid:

```text
pending → user_pending → decided | blocked | failed
pending → advisor_pending → decided | arbiter_pending | user_pending | blocked | failed
advisor_pending → advisor_pending   (retry)
arbiter_pending → arbiter_pending   (retry)
advisor_pending → arbiter_pending   (one logical arbiter decision)
arbiter_pending → user_pending      (interactive fallback)
advisor_pending → user_pending      (interactive fallback)
advisor_pending → blocked           (non-interactive exhaustion)
arbiter_pending → blocked            (non-interactive exhaustion)
```

`decided`, `blocked`, and `failed` are terminal. A `decided`, `blocked`, or
`failed` idempotency record is terminal and is reused as-is. On resume, read the last
persisted state and the attempt history:

A `decided`, `blocked`, or `failed` idempotency record is terminal and is reused as-is.

- `advisor_pending`, `arbiter_pending`, or `user_pending` resumes that exact
  gate. It does not restart already-completed attempts, reset backoff, or invoke a
  different actor because the process restarted.
It does not restart completed attempts, reset backoff, or invoke a different actor.
- A persisted `started` attempt without a finished outcome is closed as an
  interruption/timeout and consumes its recorded retry slot. A `valid`
  attempt is applied before considering another call.
- A terminal idempotency record is returned as-is, even if the current
  dashboard is stale or the workflow was interrupted after the state write.
- Resume cannot infer implementation approval from any gate result. A pending
  or rejected approval remains a stop condition.

## 5. Protected implementation-approval boundary and denylist

The hard denylist is:

The hard denylist is: `rollback`, `data-integrity-halt`, `scope-expansion`,
`unresolved-critical-verification`, `failure-recovery-skip`,
`final-handoff-approval`, `implementation-approval`, and `production-go-no-go`.

`rollback`, `data-integrity-halt`, `scope-expansion`,
`unresolved-critical-verification`, `failure-recovery-skip`,
`final-handoff-approval`, `implementation-approval`, and
`production-go-no-go`.

```text
rollback
data-integrity-halt
scope-expansion
unresolved-critical-verification
failure-recovery-skip
final-handoff-approval
implementation-approval
production-go-no-go
```

The denylist is applied before project policy and cannot be removed or
overridden by an advisor, arbiter, configuration, resume, or dashboard. These
gates always use the user gate. An advisor or arbiter may explain a choice but
cannot select, persist, or execute the protected action automatically.
These gates always use the user gate.

Advisor and arbiter responses are read-only recommendations. They cannot edit
files, approve implementation, skip a required recovery step, or authorize a
release.

Before dispatching an implementation executor, the host must read the current
persisted state and require this exact boundary:
and require this exact boundary:

```yaml
orchestrator:
  implementation_approval:
    status: approved
    approved_by: user
    approved_at: "2026-07-11T20:00:00Z"
    approved_scope:
      - "the exact approved implementation scope"
```

The approval record must contain the approving actor, timestamp, and approved scope.
Advisor, arbiter, automatic gate results, and resume state cannot infer or substitute this approval.

`status: pending`, `rejected`, `not_required`, missing approval, a non-user
approver, or a scope that does not cover the executor request is terminal
`blocked` for implementation dispatch. A missing, pending, or rejected approval
is a terminal `blocked` condition. Automatic gate output, advisor output,
arbiter output, and resume state cannot substitute for this record. Approval
must be written by the user-gate path with the complete scope before the
executor can be reached.

A missing, pending, or rejected approval is a terminal `blocked` condition for
implementation dispatch.

A missing, pending, or rejected approval is a terminal `blocked` condition.

## 6. Persistence ordering and report source of truth

The host/orchestrator must perform these operations in order for each state
transition:

```text
read_state
  → validate/compute key
  → write_state_atomic(pending or *_pending + attempt record)
  → refresh_dashboard(state projection)
  → invoke adapter primitive
  → write_state_atomic(updated attempt or terminal gate_history record)
  → refresh_dashboard(state projection)
  → generate decision-summary.md (and .html when html_output is true) from state
  → phase_continue(selected_option) / update phase status
```

An adapter must not report success for a state write unless the data is
durable. On retry, each attempt and backoff schedule is written before the
next call. Phase completion, implementation dispatch, and any continuation
must not occur before the terminal record and reports are persisted.

Decision reports are generated from `orchestrator.gate_history` only. Reports
enumerate `orchestrator.gate_history[]` from `orchestrator-state.yml` and never
from transient dashboard data; dashboard data is a projection and must never
be used to reconstruct a decision. They include success, blocked, failed,
retry exhaustion, arbitration, resume reuse, and user override. The HTML
companion is a faithful presentation of the Markdown report and contains no
additional decision data.

Reports enumerate `orchestrator.gate_history[]` from `orchestrator-state.yml` only.
The report covers success, blocked, failed, retry exhaustion, arbitration, user override, and resume reuse.
The HTML companion is a faithful presentation of the Markdown report and contains no additional decision data.

Decision reports are generated from `orchestrator.gate_history` only. The
summary covers success, blocked, failed, retry exhaustion, arbitration, user
override, and resume reuse. The HTML companion is a faithful presentation of the
Markdown report and contains no additional decision data.

## 7. Executable continuation runner contract

The host remains responsible for selecting the option. Once the host has a
validated automatic result, it constructs one JSON object for the bundled
`phase-continue.mjs` runner. The payload has exactly these fields:

- Required: `state`, `phase_id`, `gate_type`, `question`, `options`,
  `selected_option`, `actor`, and `confidence`.
- Optional: `next_phase`, `report_md`, and `report_html`.

`actor` is exactly `advisor` or `arbiter`; `confidence` is exactly `high` or
`medium`. Low-confidence or escalated results never enter this automatic
executor path. `options` remains an ordered unique list, and
`selected_option` must be an exact member. The runner accepts only this
validated JSON payload and does not choose an option or reinterpret the
question.

Transport is a hard cutover. With no arguments, the runner reads one complete
JSON object from stdin. The host may instead pass exactly `--input-file PATH`
and the runner reads that file. This is the only accepted CLI argument;
additional command-line arguments are invalid.

Before any write, the runner validates the payload and performs canonical-state
preflight against the requested `orchestrator-state.yml`. It validates phase
membership, the canonical `gate_history`, path separation, denylist status,
and the idempotency key. A denylisted gate is blocked on every attempt and
cannot be continued automatically. A terminal record with the same key is
reused; a changed selection cannot overwrite it or append another record.

Persist the terminal record and requested reports.
Only after durable state and reports does the runner continue. Phase continuation happens only after that durable work succeeds. Reports are
generated from persisted `orchestrator.gate_history`, not from the payload or
dashboard projection. If report generation or a transition write fails, the
terminal record remains durable. Retry from the validated terminal state: it
regenerates missing reports, applies a pending phase transition exactly once,
and must not append another history entry or downgrade a blocked or terminal
selection.

The result channel is strict: stdout contains only the compact JSON result.
Actionable validation, denylist, and operational errors go to stderr and use a
non-zero exit. A non-zero runner exit stops continuation and falls back to the user gate or persists blocked; it never advances the phase. The host must
inspect that result before changing phase state. No low-confidence automatic
execution is added by this contract.

## 8. Host adapter primitives

The host adapter supplies five primitives: `invoke_advisor`,
`invoke_arbiter`, `present_user_gate`, `write_state`, and `refresh_dashboard`.
Every host must map these core primitives and the additional lifecycle
primitives below explicitly:
Every host must map these primitives explicitly:

| Primitive | Required contract |
|---|---|
| `read_state` | Read `orchestrator-state.yml`; never read dashboard data as state. |
| `invoke_advisor` | Read-only call with the complete `gate_context`; return raw response plus timeout/unavailable status. |
| `invoke_arbiter` | One logical call on disagreement; retries stay in the same arbiter record and receive the same context. |
| `present_user_gate` | Present the exact supplied options and return one exact option or cancel/block. |
| `write_state` / `write_state_atomic` | Persist attempt, pending, and terminal records before any continuation; reject partial writes. |
| `refresh_dashboard` | Project current persisted state only; never make decisions. |
| `generate_decision_reports` | Read state and write Markdown plus optional faithful HTML after terminal persistence. |
| `is_interactive` | Report whether a user answer can actually be collected now. |
| `automatic_answer_injection_supported` | Host capability identifier; the supported capability is normalized phase continuation, not synthetic user input. |
| `phase_continue` | Consume the terminal `selected_option` after state, dashboard, and reports succeed. In `fully_automatic`, this is the automatic-answer seam; it must not present a user gate or be callable by advisor/arbiter before validation. |
| `phase_continuation_supported` | Return true when the orchestrator can consume `phase_continue(selected_option)` in the current host runtime. |

The bundled reference adapter is executable at
`skills/orchestrator-framework/bin/phase-continue.mjs`. A host serializes the
exact runner payload above and supplies it through stdin or
`--input-file PATH`. The runner validates exact option membership, rejects the
denylist, computes the idempotency key, writes the terminal record atomically,
generates reports, and only then advances the phase. Hosts may wrap this command
with their native task/subagent mechanism, but they must not bypass the
validated JSON result.

### 8.1 Fully automatic continuation

For a non-denylisted gate in `fully_automatic` mode, automatic answer injection
is the normalized result passed to `phase_continue(selected_option)`. It is not
text typed into **CHAT GATE**, CHAT GATE, `ask_user`, or a plain-text user
question. After the terminal record and reports are durable, the host invokes
`phase_continue(selected_option)` and the orchestrator records the phase
transition. A host that supports this primitive declares `fully_automatic:
supported`; a host that cannot does not bypass the user gate and persists
`blocked` when non-interactive.

`fully_automatic` may continue through `phase_continue(selected_option)` only
after the terminal record is durable.

The host must not call `present_user_gate` for a valid, sufficiently confident
fully automatic result, and it must not call `phase_continue` for a denylisted
gate, implementation approval, low-confidence result, escalated result, or an
unvalidated option.

Required host mapping:

| Capability | Cursor | Kiro | Codex |
|---|---|---|---|
| Invoke advisor | custom `maister-advisor` agent | `maister-advisor` JSON agent | native subagent or documented fallback |
| Invoke arbiter | configured custom agent/model | configured agent/model | configured native role |
| User gate | **CHAT GATE** | chat gate | plain-text user question |
| State write | orchestrator writes YAML atomically | orchestrator writes YAML atomically | orchestrator writes YAML atomically |
| Resume | `maister-resume` state read | `maister-resume`/chat state read | `$maister-resume` state read |
| Automatic answer injection | `phase_continue` supported by orchestrator | `phase_continue` supported by orchestrator | `phase_continue` supported by orchestrator |

If a host cannot consume a validated decision through `phase_continue`, its
generated documentation must state that `fully_automatic` falls back to a user
gate when interactive and persists `blocked` otherwise. A host that supports
`phase_continue(selected_option)` may declare `fully_automatic: supported` for
non-denylisted gates; this is continuation of a normalized result, not a
synthetic answer injected into a UI prompt.

A host that cannot consume a validated result through `phase_continue` must
fall back to a user gate where interactive input exists; otherwise it persists
`blocked`. In `fully_automatic` mode on a non-interactive host, persist
`blocked`. No host may claim `fully_automatic` merely because an advisor agent
can be loaded or a prompt can be displayed.

Automatic injection is a separately verified capability. Prove injection in E2E
before enabling it for a host. No host may claim `fully_automatic` merely
because an advisor agent can be loaded or a prompt can be displayed.

Automatic injection is supported only when the host can prove it. Prove
injection in E2E before declaring `fully_automatic` support. No host may claim
`fully_automatic` merely because an advisor agent can be loaded or a prompt can
be displayed.

## 8. Deterministic fixtures

Fixtures in `gate-decision-fixtures.yml` describe scripted outcomes, not model
judgment. They must cover agreement, disagreement and both arbiter choices,
strict malformed/extra-field validation, exact option membership, low
confidence/escalation, timeout/retry exhaustion, denylist behavior,
implementation approval protection, terminal resume reuse, every pending
resume state, report outcomes, and read-only advisor enforcement.
