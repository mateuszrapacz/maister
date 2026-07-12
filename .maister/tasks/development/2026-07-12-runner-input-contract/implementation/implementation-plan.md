# Implementation Plan: Harden the `phase-continue` Input Contract

## TL;DR

Implement the change in five serialized groups: runner transport/payload validation, canonical YAML and phase preflight, persistence/recovery semantics, source contract migration, then generated-variant and full verification. The first three groups share the runner and contract harness, so they must run in order; the documentation migration follows the executable contract; the final group rebuilds every platform output and runs the complete safety matrix. No source code or generated output is edited in this planning phase.

## Key Decisions

- Treat stdin plus `--input-file PATH` as a hard JSON cutover; remove every legacy flag and `--options-json` reference rather than adding compatibility parsing.
- Keep validation dependency-free and fail closed at the canonical YAML boundary. Define accepted empty/populated fixtures before implementing the parser so “canonical” cannot drift into best-effort indentation matching.
- Keep `plugins/maister/` authoritative. Generated Codex, Copilot, Cursor, Kilo, and Kiro artifacts are produced only by `make build`.
- Use one shared executable contract script against the source runner and every built runner path. Static documentation assertions remain in `tests/gate-decision-engine.test.sh`.
- Make report and transition failure injection deterministic through a test-only operational seam (disabled unless explicitly requested by the test), then verify recovery from durable terminal state. The seam is not part of the JSON contract or host-facing API.
- Preserve `actor: advisor|arbiter`, `confidence: high|medium`, the existing idempotency tuple/hash, denylist statuses, atomic writes, and stdout/stderr channel semantics.

## Open Questions / Risks

- Duplicate JSON object keys cannot be detected after `JSON.parse`; the implementation must use a dependency-free scanner or equivalent recursive parser and cover nested objects in tests.
- Canonical YAML acceptance is intentionally narrower than general YAML. Fixtures must prove the exact `orchestrator.gate_history` and root `phases` anchors, record fields, scalar types, options ordering, duplicate-key rejection, and unsupported-construct rejection.
- State, Markdown, and HTML files have no cross-file transaction. A report failure or transition-write failure can occur after the terminal record is durable, so retries must regenerate missing reports and apply only the still-pending transition without changing the decision.
- The existing denylist-reuse ordering can accidentally turn a blocked retry into success. Denylist evaluation and terminal reuse need an explicit result/exit contract and repeated-invocation tests.
- Generated runner locations differ by platform (`lib`, `.kilo/skills`, and `skills/maister-*`). The shared matrix must fail when a built path is missing or behavior diverges, not only when Markdown transforms look correct.

## Overview

- **Total steps:** 29
- **Task groups:** 5
- **Expected focused tests:** 34 scenarios across the first four groups and the final review matrix
- **Risk:** High; the runner mutates the workflow resume source of truth and controls phase advancement
- **UI/data layer:** No UI; data-operation hardening at a CLI and canonical-state boundary

| Group | Focus | Dependencies | Focused tests | Main files |
|---|---|---:|---:|---|
| 1 | JSON transport and payload boundary | None | 8 | runner, existing smoke test, shared contract test |
| 2 | Canonical YAML and phase preflight | 1 | 7 | runner, contract test, state fixtures |
| 3 | Durable outcomes and retry recovery | 2 | 8 | runner, contract test |
| 4 | Normative/source contract migration | 3 | 5 | reference, five source skills, static contract test |
| 5 | Generated variants and final gap review | 1–4 | 6 | Makefile, contract tests, generated trees via build only |

## Implementation Steps

### Task Group 1: Strict JSON Transport and Payload Validation

**Dependencies:** None  
**Files to Modify:**

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `tests/fully-automatic-phase-continue.test.sh`
- `tests/phase-continue-contract.test.sh` (create)

**Estimated Steps:** 6  
**Focused tests:** 8

- [x] **1.0 Establish the shared runner contract harness.** Keep temporary state/report directories isolated per case and capture stdout, stderr, exit code, and byte snapshots of every file under test.
- [x] **1.1 Write focused tests before implementation.** Add exactly these boundary cases to `tests/phase-continue-contract.test.sh`:
  1. valid stdin payload succeeds and produces JSON-only stdout;
  2. valid `--input-file PATH` payload succeeds;
  3. empty input, malformed JSON, primitive, array, and `null` fail;
  4. duplicate `--input-file`, positional arguments, legacy flags, and `--options-json` fail;
  5. duplicate JSON keys (including a nested object) fail before `JSON.parse` can collapse them;
  6. exact field allowlist, required fields, wrong types, actor/confidence enums, and optional fields are enforced;
  7. identifiers, strings, paths, NULs, state/report collisions, duplicate options, and exact option membership are enforced while meaningful spaces/Unicode/quotes/pipes/newlines remain exact;
  8. every validation error is non-zero, identifies the field/boundary on stderr, leaves state/reports byte-identical, and emits no error text on stdout.
- [x] **1.2 Replace `parseArgs` with a single transport reader.** Accept no arguments for stdin or exactly one `--input-file PATH`; reject duplicates, missing values, trailing/positional values, and all former flags. Read one complete JSON value and keep stdout reserved for the compact result.
- [x] **1.3 Add dependency-free duplicate-key-aware JSON parsing and an exact allowlist validator.** Reject duplicate keys at every object depth, unknown/missing keys, wrong JSON types, empty/NUL-containing values, invalid stable identifiers, invalid paths, duplicate options, invalid selections, and unsupported actor/confidence values with focused messages.
- [x] **1.4 Preserve canonical identity inputs and error channels.** Map `options` directly to the existing ordered idempotency tuple; do not trim, sort, coerce, or normalize decision strings. Retain existing validation/blocked/operational exit classes and make unexpected input failures go through the established `fail` boundary.
- [x] **1.5 Run only the eight new/updated boundary cases and the migrated smoke test.** Do not run the full build or full suite until the group is green.

**Acceptance Criteria:**

- Both transports accept the same exact object and no legacy invocation survives in executable tests.
- Duplicate keys are rejected before object materialization loses evidence of duplication.
- All R1–R3 and R8 payload/channel cases pass with state and report immutability on validation failure.
- `tests/fully-automatic-phase-continue.test.sh` exercises JSON transport, reports, phase continuation, idempotent reuse, and denylist behavior rather than the removed flag interface.

### Task Group 2: Canonical YAML State Boundary and Phase Preflight

**Dependencies:** Group 1  
**Files to Modify:**

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `tests/phase-continue-contract.test.sh`
- `tests/fixtures/phase-continue/valid-empty.yml` (create)
- `tests/fixtures/phase-continue/valid-populated.yml` (create)
- `tests/fixtures/phase-continue/invalid-tabs.yml` (create)
- `tests/fixtures/phase-continue/invalid-duplicate-anchors.yml` (create)
- `tests/fixtures/phase-continue/invalid-misplaced-anchors.yml` (create)
- `tests/fixtures/phase-continue/invalid-history-record.yml` (create)
- `tests/fixtures/phase-continue/invalid-phases.yml` (create)
- `tests/fixtures/phase-continue/unsupported-yaml.yml` (create)

**Estimated Steps:** 6  
**Focused tests:** 7

- [x] **2.0 Define the fixture boundary before parser implementation.** Make the two valid fixtures representative of the states emitted by the five orchestrators: empty history, populated canonical history, root `phases`, current phase, completed phases, and supported statuses.
- [x] **2.1 Write focused state/preflight tests first.** Cover: valid empty/populated fixtures; tabs; duplicate mapping keys; anchors/aliases/tags and unsupported YAML; duplicate or misplaced `orchestrator.gate_history`/`phases`; malformed/incomplete history records and option sequences; missing/malformed phases and duplicate phase IDs; unknown phase membership and invalid current/target/self/backward/already-active transitions; and byte-identical files after every preflight rejection.
- [x] **2.2 Add a strict, dependency-free canonical-state validator.** Prove root `orchestrator`, exactly one nested `gate_history`, exactly one root `phases`, canonical indentation, no tabs, no unsupported YAML constructs, and no duplicate keys/anchors before returning a parsed mutation model.
- [x] **2.3 Validate canonical history records and phase records.** Enforce the runner’s schema version, scalar types, supported statuses, unique ordered options, required/misplaced fields, unique non-empty phase IDs, supported phase statuses, and the requested `phase_id` membership.
- [x] **2.4 Harden append and phase-update operations to consume only the validated model.** Retain textual preservation and existing serialization/atomic helpers where safe, but refuse best-effort insertion or silent no-op updates. For `next_phase`, require the current phase to be `orchestrator.current_phase` and `in_progress`, the target to be distinct and `pending`, and the transition to be an allowed forward edge.
- [x] **2.5 Run only the seven state/preflight cases plus Group 1 boundary tests needed to prove the integration gate.** Confirm no state/report/temporary output is written before canonical validation completes.

**Acceptance Criteria:**

- The accepted YAML subset is fixture-defined and dependency-free; unsupported shapes fail closed.
- R4 and the state-safety portion of R10 pass, including duplicate-key detection, canonical anchor placement, phase membership, and path collision checks.
- Invalid state or transition requests leave state, reports, and parent directories as they were.
- Validated phase updates cannot silently skip unknown phases, self-transition, move backward, or overwrite a terminal/already-active state.

### Task Group 3: Durable Terminal Outcomes, Denylist, Reports, and Recovery

**Dependencies:** Group 2  
**Files to Modify:**

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `tests/phase-continue-contract.test.sh`

**Estimated Steps:** 6  
**Focused tests:** 8

- [x] **3.0 Lock the recovery state machine against validated terminal history.** The terminal record is durable before report generation or transition; a retry starts from validated state and distinguishes missing reports from a pending transition.
- [x] **3.1 Write focused outcome/recovery tests first.** Cover: normal decision with Markdown/HTML; denylist first invocation and retry with a changed selection; same-key reuse with a changed selection; no-transition decision; valid forward transition; deterministic report failure followed by report regeneration; deterministic transition-write failure followed by exact-once transition recovery; and already-applied transition/no downgrade of blocked or terminal selection.
- [x] **3.2 Preserve deterministic idempotency and denylist semantics.** Reuse only a validated terminal record, evaluate denylist behavior on every attempt, reject changed selections without append/overwrite, and keep blocked gates blocked with actionable stderr/non-zero exit.
- [x] **3.3 Reorder and harden persistence/reporting.** Append and atomically persist the complete `decided`/`blocked` record first; generate reports solely from persisted `orchestrator.gate_history`; apply a validated transition only after requested reports succeed; return JSON only after all requested work succeeds.
- [x] **3.4 Add deterministic test-only failure injection at the operational seam.** Allow tests to fail one report operation or the post-terminal transition write, without exposing a payload field or changing production behavior when unset. Ensure temporary directories are cleaned and a later invocation can recover missing work from the validated terminal record.
- [x] **3.5 Run only the eight outcome/recovery cases and the minimal preceding preflight cases required to distinguish validation failures from operational failures.

**Acceptance Criteria:**

- R5–R8 pass: denylist retries remain blocked, idempotency is deterministic, reports are faithful/escaped/deterministic, and stdout/stderr/exit classes remain stable.
- A report failure leaves the terminal record durable and a retry regenerates reports without another history entry.
- A transition-write failure leaves a durable terminal record and a retry applies the supported transition exactly once; an already-applied retry does not duplicate completion or downgrade outcome.
- Existing `atomicWrite`, fsync, rename, cleanup, record serialization, hashing, and report helpers are reused or minimally deepened rather than replaced by a broad runtime abstraction.

### Task Group 4: Normative Reference and Five Source Call-Sites

**Dependencies:** Group 3  
**Files to Modify:**

- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`
- `plugins/maister/skills/development/SKILL.md`
- `plugins/maister/skills/migration/SKILL.md`
- `plugins/maister/skills/performance/SKILL.md`
- `plugins/maister/skills/product-design/SKILL.md`
- `plugins/maister/skills/research/SKILL.md`
- `tests/gate-decision-engine.test.sh`

**Estimated Steps:** 5  
**Focused tests:** 5

- [x] **4.0 Define the source documentation assertions before editing prose.** Add checks that the normative reference and every source skill describe the exact payload fields, stdin/file transport, terminal-before-continuation ordering, JSON result channel, non-zero stop/fallback behavior, and retry semantics.
- [x] **4.1 Update the normative engine reference.** Replace the old runner invocation description with the host-neutral JSON object contract, hard-cutover transport, `actor`/`confidence` policy, canonical-state preflight, denylist/idempotency behavior, report/transition recovery, and explicit responsibility that the host still selects the option.
- [x] **4.2 Migrate the five source orchestrator call-sites.** Each must construct the same payload with exact state path, phase/gate context, question, ordered options, selected option, actor, confidence, optional next phase, and optional report paths; invoke stdin or named `--input-file PATH`; reuse terminal state; persist before continuation; and stop/fallback on non-zero exit.
- [x] **4.3 Remove stale source terminology without broadening scope.** Eliminate options-json, independent decision flags, prose-as-input, and compatibility-shim language from the normative/source contract. Do not change advisor/arbiter selection or introduce a low-confidence executor path.
- [x] **4.4 Run only the five static documentation/source-contract tests and a repository search for stale terms.** Inspect transformed-sensitive wording before build; generated artifacts remain untouched in this group.

**Acceptance Criteria:**

- R9 passes: the source of truth documents one payload contract consistently in all six normative/source files.
- Every automatic source call-site preserves who selects the decision and states that non-zero runner exit stops/falls back.
- No source Markdown contains `options-json` or the removed independent runner flags as an invocation contract.
- The docs still express reports as a faithful projection of persisted history and phase continuation only after durable work.

### Task Group 5: Generated Platform Variants and Final Verification Review

**Dependencies:** Groups 1, 2, 3, and 4  
**Files to Modify:**

- `tests/phase-continue-contract.test.sh`
- `tests/gate-decision-engine.test.sh`
- `Makefile`
- Generated trees written by `make build` only: `plugins/maister-codex/`, `plugins/maister-copilot/`, `plugins/maister-cursor/`, `plugins/maister-kilo/`, `plugins/maister-kiro/`

**Estimated Steps:** 6  
**Focused tests:** 6

- [x] **5.0 Prepare the final verification matrix.** Resolve the six runner paths explicitly: source; Codex `skills/orchestrator-framework/bin/phase-continue.mjs`; Copilot `skills/orchestrator-framework/bin/phase-continue.mjs`; Cursor `lib/orchestrator-framework/bin/phase-continue.mjs`; Kilo `.kilo/skills/orchestrator-framework/bin/phase-continue.mjs`; and Kiro `skills/maister-orchestrator-framework/bin/phase-continue.mjs`.
- [x] **5.1 Write/run six focused final-review checks.** Verify: every built runner executes the shared behavioral matrix; all six runners pass `node --check`; generated references contain the migrated transport and no stale terminology; `make build` produces the expected paths; `make validate` passes all structural/contract gates; and `git diff --check` reports no whitespace errors or unexpected hand-edited generated drift.
- [x] **5.2 Wire the shared contract suite into the project validation path.** Update `Makefile` and `tests/gate-decision-engine.test.sh` only as needed so source and generated behavior are exercised from the repository root while existing platform validation remains authoritative.
- [x] **5.3 Run `make build`.** Treat all five generated trees as disposable outputs; inspect the diff for expected runner copies, transformed Markdown, and no unrelated changes.
- [x] **5.4 Run targeted and structural verification.** Execute the shared contract matrix, existing gate-engine tests, `node --check` for all six runners, `make validate`, and the required platform smoke/validation checks that are part of the repository’s build pipeline.
- [x] **5.5 Perform the final gap review.** Confirm every R1–R12 acceptance item, the three audit concerns, report/transition failure injection, canonical YAML fixture boundaries, denylist retry, source-only ownership, and generated-variant parity. Record any residual risk rather than weakening a safety assertion.

**Acceptance Criteria:**

- R10–R12 pass from the repository root.
- The same behavior suite passes against source and all five generated runner paths; variant path relocation is covered explicitly.
- `make build` followed by `make validate` is clean, generated outputs are not hand-edited, all six runners parse, and no stale `options-json`/legacy invocation remains in source or generated contract docs.
- The final review has evidence for duplicate keys, canonical YAML boundaries, report failure recovery, transition failure recovery, state immutability, denylist retry, idempotency, and atomic persistence.

## Execution Order

1. **Group 1 — Strict JSON Transport and Payload Validation** (6 steps; no dependency).
2. **Group 2 — Canonical YAML State Boundary and Phase Preflight** (6 steps; depends on Group 1). Do not implement mutation changes until the valid/invalid YAML fixtures and immutability tests exist.
3. **Group 3 — Durable Terminal Outcomes, Denylist, Reports, and Recovery** (6 steps; depends on Group 2). Failure-injection tests must be red before changing recovery flow.
4. **Group 4 — Normative Reference and Five Source Call-Sites** (5 steps; depends on Group 3 so documentation can describe final retry semantics).
5. **Group 5 — Generated Platform Variants and Final Verification Review** (6 steps; depends on all previous groups). Run `make build` only after source runner, tests, and source Markdown are complete.

The runner and shared contract test are intentionally serialized across Groups 1–3. Group 4 touches disjoint source Markdown and could be reviewed in parallel after the payload contract is stable, but the planned order keeps the normative docs synchronized with the implemented recovery semantics. Group 5 is the only group permitted to change generated trees, and only through the build scripts.

## Standards Compliance

Follow `.maister/docs/INDEX.md` and these applicable standards:

- `.maister/docs/standards/global/validation.md`: validate early at the transport/state boundaries, use allowlists and field-specific errors, and enforce business rules before mutation.
- `.maister/docs/standards/global/error-handling.md`: fail fast, keep actionable user-facing errors on stderr, preserve typed exit behavior, and clean temporary resources.
- `.maister/docs/standards/global/conventions.md`: documentation-first planning, minimal dependencies, incremental tests, and no speculative compatibility layer.
- `.maister/docs/standards/global/coding-style.md` and `commenting.md`: keep the runner readable and comment only duplicate-key/YAML/recovery logic whose safety invariant is non-obvious.
- `.maister/docs/standards/global/minimal-implementation.md`: deepen existing helpers only where required; do not add a general YAML runtime, host API, or unrelated abstraction.
- `.maister/docs/standards/global/plugin-development.md`: edit only `plugins/maister/` source, keep artifacts under the task directory, and never hand-edit generated variants.
- `.maister/docs/standards/global/build-pipeline.md`: use `make build`, platform transforms, drift checks, and `make validate`; respect the distinct Codex/Copilot/Cursor/Kilo/Kiro paths.
- `.maister/docs/standards/testing/test-writing.md`: behavior-focused tests, test-first ordering, 2–8 focused tests per group, incremental execution, and full-suite verification only at the end.

## Notes

- Test-first ordering is mandatory: each group’s focused cases are written and made red before its implementation steps.
- The shared contract suite should use temporary copies of the fixture states and byte snapshots so a failing test can prove immutability rather than infer it from exit status.
- Failure injection must be deterministic, isolated, and disabled by default; it must not become an accepted payload field or a production-facing compatibility path.
- Reports are generated from persisted `orchestrator.gate_history`, not transient input or dashboard projections. HTML must remain a faithful escaped presentation of Markdown data.
- Do not run destructive cleanup against user changes. Existing dirty/untracked `.maister` artifacts belong to the user; preserve them while executing the plan.
- If a recurring safety pattern is discovered during implementation (for example, all canonical YAML mutators must expose an anchor-proof validation result), suggest capturing it in the project standards after the implementation is complete.
