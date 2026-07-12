# Specification: Harden the `phase-continue` Input Contract

## TL;DR

Replace the continuation runner's legacy multi-flag interface with one strict JSON decision payload read from stdin by default or from `--input-file PATH`. The runner must validate the payload and the canonical `orchestrator-state.yml` boundary before any state or report mutation, preserve denylist/idempotency/atomic persistence behavior, and recover safely when report or phase-transition work is interrupted. Migrate the normative gate reference, five source orchestrator skills, and contract tests; regenerate all five platform variants through `make build`.

## Key Decisions

- JSON is a hard cutover: legacy flags, `--options-json`, and compatibility shims are removed.
- The runner accepts only the dependency-free canonical YAML shape already emitted by Maister; unsupported YAML is rejected before writes.
- `actor` remains `advisor|arbiter`; `confidence` remains `high|medium`; low-confidence routing happens before this executor boundary.
- Paths are non-empty and NUL-free; relative and absolute paths are allowed, but state/report path collisions are rejected.
- A terminal decision is durable before continuation. Retrying an incomplete report or phase transition resumes from validated terminal state instead of silently returning success without completing the transition.
- `plugins/maister/` is the source of truth. Generated Codex, Copilot, Cursor, Kilo, and Kiro outputs are rebuilt, never edited by hand.

## Open Questions / Risks

- Cross-file atomicity is unavailable: state, Markdown, and HTML files cannot be committed as one transaction. The implementation must make each retry deterministic and must never claim a completed transition until the state reflects it.
- The strict YAML subset must match every state shape produced by the five orchestrators. Fixtures should include representative existing records before implementation is considered complete.
- Generated runners are copied/transformed build outputs; behavioral parity depends on the shared test matrix executing every built runner path.

## 1. Goal and User Journey

The host orchestrator or adapter remains responsible for evaluating a gate and selecting an option. Once it has a validated automatic decision, it serializes the decision object and invokes `phase-continue.mjs`. The runner validates the object, validates the state it is about to mutate, persists the decision/report, applies an allowed phase transition, and returns a JSON result. A malformed or unsafe request exits non-zero with an actionable stderr message and leaves state and reports unchanged.

The runner is not a decision-maker, model adapter, YAML conversion service, or compatibility layer. Individual decision values must no longer travel as independently shell-quoted flags.

## 2. Scope

### Included

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` input, state-boundary, persistence, report, and retry behavior.
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` as the normative host-neutral contract.
- The five source orchestrator skills: `development`, `migration`, `performance`, `product-design`, and `research`.
- Executable contract coverage and the existing gate-engine tests where their contract assertions need updating.
- Rebuilding and validating Codex, Copilot, Cursor, Kilo, and Kiro variants through `make build` and `make validate`.

### Excluded

- Advisor, arbiter, or host model selection logic.
- New host APIs, interactive UI behavior, or a low-confidence executor path.
- Legacy CLI compatibility, a YAML/npm dependency, or conversion of `orchestrator-state.yml` to JSON.
- Changes to unrelated orchestrators, research artifacts, or generated variants by hand.

## 3. Canonical Input Contract

The runner accepts exactly one JSON object. With no arguments it reads one complete JSON value from stdin. With `--input-file PATH` it reads the complete JSON value from that file. The transport option itself is the only accepted CLI argument; duplicate `--input-file`, positional arguments, legacy flags, `--options-json`, and trailing arguments are errors. Empty input, malformed JSON, a JSON primitive, array, or `null` is rejected.

The payload has this exact allowlist:

| Field | Required | Type and validation |
|---|---:|---|
| `state` | Yes | Non-empty NUL-free path; relative or absolute; must not collide with either report path. |
| `phase_id` | Yes | Non-empty stable identifier; exact state phase membership is required. |
| `gate_type` | Yes | Non-empty stable identifier; exact case-sensitive denylist matching. |
| `question` | Yes | Non-empty NUL-free string; preserved exactly for identity and history. |
| `options` | Yes | Non-empty ordered array of unique non-empty NUL-free strings. Order is significant. |
| `selected_option` | Yes | Non-empty NUL-free string; exact member of `options`, with no trimming, sorting, or fuzzy matching. |
| `actor` | Yes | Exactly `advisor` or `arbiter`. |
| `confidence` | Yes | Exactly `high` or `medium`. |
| `next_phase` | No | If present, a non-empty stable identifier and a validated supported transition target. |
| `report_md` | No | If present, a non-empty NUL-free path; distinct from state and `report_html`. |
| `report_html` | No | If present, a non-empty NUL-free path; distinct from state and `report_md`. |

Stable identifiers use the existing phase/gate naming vocabulary and must not contain whitespace, NUL, or path separators. Other decision strings may contain meaningful spaces, Unicode, quotes, pipes, and newlines; their exact values are retained in the decision identity and persisted/report output. Every JSON object in the payload is parsed with duplicate-key detection. Unknown keys, duplicate keys, missing required keys, wrong JSON types, duplicate options, invalid selection, and invalid strings are field-specific errors.

The runner keeps stdout exclusively for a compact JSON result. Errors go to stderr with a non-zero exit code: invalid input/state uses the validation failure code, denied gates use the existing blocked/denylisted code, and unexpected I/O or persistence failures use the existing operational failure path. Error text must identify the failing boundary or field without leaking implementation internals.

## 4. Canonical State Boundary

Validation occurs after payload validation and before any state, report, or temporary output write. The runner may preserve unrelated state text, but it must prove the mutation anchors are canonical:

- `orchestrator.gate_history` exists exactly once under the root `orchestrator` mapping and is either `[]` or a sequence at the canonical indentation used by `recordYaml`.
- Every history record uses the canonical record schema emitted by the runner, has valid scalar types, a supported status (`pending`, `advisor_pending`, `arbiter_pending`, `user_pending`, `decided`, `blocked`, or `failed`), and has no duplicate keys or misplaced fields. Options are an ordered unique sequence.
- Root-level `phases` exists exactly once and is a sequence of phase records. Every phase record has a unique non-empty `id` and a supported status; no requested current or next phase may be inferred from an absent or malformed list.
- The state contains no tabs, YAML anchors/aliases/tags, duplicate mapping keys, duplicate/misplaced `gate_history` or `phases` anchors, malformed canonical records, or unsupported constructs that the dependency-free validator cannot prove safe.
- Validation rejects state/report path collisions and rejects a payload whose `phase_id` is absent from `phases`.

Validation failures must leave the state file, reports, and their parent directories as they were before invocation. The implementation must not fall back to best-effort indentation matching when the canonical boundary is not proven.

## 5. Decision, Denylist, Idempotency, and Transition Semantics

The idempotency identity is the existing canonical tuple of `phase_id`, `gate_type`, `question`, and ordered `options`, hashed as `sha256:<hex>`. `selected_option`, actor, confidence, and report paths do not change that identity. A validated terminal record (`decided`, `blocked`, or `failed`) with the same key is reused; a different selection cannot overwrite it or append a second terminal record.

The denylist is evaluated before automatic continuation and on every retry. A denylisted gate appends or reuses a `blocked` record, returns an actionable error on stderr, exits non-zero, never applies `next_phase`, and remains blocked when invoked again with another selection. Denylisted gates include the existing rollback, data-integrity, scope-expansion, unresolved-critical-verification, failure-recovery-skip, final-handoff-approval, implementation-approval, and production-go-no-go identifiers.

When `next_phase` is absent, the runner records the decision and generates requested reports without changing phase state. When `next_phase` is present, a fresh transition requires:

1. `phase_id` exists, is the current `orchestrator.current_phase`, and has status `in_progress`.
2. `next_phase` exists, differs from `phase_id`, and has status `pending`.
3. The requested transition is one supported forward phase transition; unknown phase IDs, skipped/terminal current phases, already-active targets, self-transitions, and backward transitions are rejected before the first write.

An interrupted retry is recognized only from validated state. If the terminal record already exists, reports are regenerated from `orchestrator.gate_history`; if the transition is still pending, the validated transition is applied exactly once. If the current phase is already `completed`, the target is already `in_progress`, and `current_phase` is the target, the transition is considered applied and is not duplicated. A retry must never change a terminal selection or downgrade a blocked result.

## 6. Persistence and Reporting Flow

The mutation flow preserves the existing atomic temp-file write, file `fsync`, rename, and temporary-directory cleanup helpers:

1. Parse the transport and validate the exact payload.
2. Read and validate the canonical state boundary, calculate the idempotency key, and inspect terminal history.
3. For a new request, append the complete `decided` or `blocked` record and atomically persist state.
4. Generate requested Markdown and HTML reports from the persisted `orchestrator.gate_history` only. The HTML report remains a faithful presentation of the Markdown report and introduces no decision data.
5. Apply and atomically persist a validated phase transition when requested and permitted.
6. Return JSON only after all requested work is complete. A report or transition failure reports an operational error, preserves the durable terminal record, and allows a later invocation to recover the missing work from validated state.

Report generation must be deterministic for the same state and paths. A report retry must not append history or alter the selected option. No state/report path may be written before payload and state validation succeeds.

## 7. Source Contract Migration

Update the normative reference and each of the five source skills so that every automatic call site:

- Builds the same JSON object with exact state path, phase/gate context, question, ordered options, selected option, actor, confidence, optional next phase, and optional report paths.
- Invokes the runner through stdin or an explicitly named `--input-file PATH` transport; no prose, independent decision flags, or `--options-json` terminology remains.
- Reuses terminal state before host/model calls, persists the terminal record before phase continuation, and treats non-zero runner exit as a stop/fallback condition.
- Documents the runner result channel and retry behavior without changing who selects the decision.

Generated Markdown and runner copies are updated only by the existing platform scripts. The source contract must continue to transform cleanly for Copilot, Cursor, Kilo, Kiro, and Codex.

## 8. Requirements and Acceptance Criteria

| ID | Requirement | Acceptance evidence |
|---|---|---|
| R1 | Read one JSON object from stdin by default and support `--input-file PATH`. | Contract test covers both transports, empty input, extra args, duplicate transport, and legacy flag rejection. |
| R2 | Detect malformed JSON, duplicate keys, unknown fields, missing fields, wrong types, invalid strings/paths, duplicate options, and invalid selection. | Each invalid class exits non-zero, emits field-specific stderr, and leaves state/reports byte-identical. |
| R3 | Enforce the exact required/optional payload allowlist and actor/confidence enums. | Positive and negative schema cases pass against source and every built runner. |
| R4 | Validate canonical `orchestrator.gate_history` and root `phases` before writes. | Fixtures cover tabs, duplicate/misplaced anchors, malformed records, unsupported YAML, missing anchors, and unknown phases. |
| R5 | Preserve denylist behavior on first invocation and retry. | Denylisted requests remain blocked, never transition, and return non-zero on repeated attempts. |
| R6 | Preserve deterministic idempotency. | Same identity reuses the terminal result; changed selection does not overwrite or duplicate it. |
| R7 | Preserve atomic persistence and make report/transition recovery retry-safe. | Failure-injection or equivalent fixtures prove durable terminal state and exact-once recovery of reports/phase state. |
| R8 | Keep stdout as JSON result channel and stderr as actionable error channel. | Tests parse stdout as JSON and assert errors are absent from stdout and present on stderr. |
| R9 | Migrate the normative reference and all five source skills. | Source search finds no stale multi-flag/`options-json` invocation terminology and every call site names the payload transport. |
| R10 | Add executable contract coverage for transport, validation, special characters, immutability, state shape, transitions, denylist, idempotency, reports, and retries. | Shared test suite passes from the repository root. |
| R11 | Run the same contract behavior against source and all five generated runner paths. | Runner matrix locates each built `.mjs` and reports a pass/fail per path. |
| R12 | Regenerate and structurally validate all platform variants through the existing pipeline. | `make build`, `make validate`, `node --check` for six runners, and `git diff --check` pass. |

## 9. Verification Matrix

| Area | Cases |
|---|---|
| Transport | stdin success; `--input-file` success; empty/malformed JSON; primitive/array/null; duplicate `--input-file`; positional/legacy flags; duplicate JSON keys. |
| Payload | missing/unknown keys; wrong types; empty/NUL strings; invalid identifiers; duplicate options; exact option membership; special characters and Unicode; actor/confidence enums; report/state collisions. |
| State safety | valid empty and populated history; duplicate/misplaced anchors; tabs; malformed record; unsupported YAML; missing/malformed phases; unknown current/next phase; state immutability on every validation error. |
| Outcomes | normal decision; denylist first attempt and retry; same-key reuse; changed selection; no transition; valid transition; unsupported/self/backward/already-applied transition. |
| Recovery | report generation failure; transition write failure; rerun from terminal state; report regeneration; exact-once transition recovery; no downgrade or overwrite. |
| Artifacts/build | Markdown/HTML report content and escaping; stdout/stderr channels; source runner syntax; all five generated runner syntax/behavior; stale terminology; `make build`; `make validate`; `git diff --check`. |

## 10. Implementation Boundaries and Reuse

Retain and minimally deepen the existing `fail`, atomic-write, YAML scalar, record serialization, report rendering, denylist, and hashing helpers where their responsibilities remain valid. Replace the legacy argument parser and extend the state parser only enough to prove the specified canonical boundary and recovery states. Do not introduce a general YAML library, a new runtime abstraction, compatibility flags, or unrelated refactors. Keep validation functions focused and field-specific, and keep generated output out of source edits.

## 11. Deliverables

- Updated source runner and contract tests.
- Updated normative gate-decision reference and five source orchestrator skills.
- Regenerated Codex, Copilot, Cursor, Kilo, and Kiro variants.
- Passing verification commands listed in R12.

Implementation begins only after this Phase 5 specification is approved and the subsequent specification audit/planning gates complete.
