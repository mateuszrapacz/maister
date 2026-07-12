# Gap Analysis

## TL;DR

The plan addresses a real cross-cutting contract gap, but the current runner is
still entirely legacy CLI based. It validates only a few derived values, parses
state by indentation heuristics, and can record a terminal decision before a
report or second state write succeeds. The five source orchestrators and the
normative gate reference still describe that old boundary; generated variants
inherit it until rebuilt.

Risk is high because this code writes the workflow source of truth and controls
phase advancement. The plan is directionally complete, but implementation must
resolve the exact payload transport, canonical YAML subset, confidence policy,
and retry semantics before coding.

## Key Decisions

- Make the JSON payload a hard replacement for the multi-flag interface. Use
  stdin by default and an explicit file-input flag for deterministic tests and
  diagnostics; do not add a legacy compatibility layer unless an external
  consumer is identified.
- Validate the complete payload before reading state: JSON syntax, duplicate
  fields, exact allowlist, required/optional fields, types, identifiers, paths,
  option uniqueness, and exact selection membership.
- Accept only the canonical state shape that the runner can safely recognize.
  Reject tabs, duplicate or misplaced anchors, malformed history records,
  unknown phase IDs, and unsupported YAML rather than attempting a best-effort
  rewrite.
- Preserve denylist, idempotency, atomic writes, reporting, and phase-transition
  guarantees, but make report/transition retry behavior explicit. A reused
  terminal record must not silently turn a blocked gate into success or skip a
  pending phase transition.
- Update the normative `gate-decision-engine.md` wording as part of the same
  contract migration, then update the five source skills and regenerate all
  platform outputs through `make build`. No generated tree should be edited by
  hand.

## Open Questions / Risks

- The plan does not name the file-input option. The name and precedence between
  stdin and file input must be fixed before call-sites and tests are written.
- The normative engine allows `confidence: low`, while the executable runner
  currently allows only `high|medium`; it also currently restricts `actor` to
  `advisor|arbiter`. The automatic executor boundary needs an explicit policy.
- The current two-write sequence can leave a terminal history record without a
  report or phase transition. Retrying currently finds the terminal record and
  returns `reused` before applying the missing transition.
- `parseGateHistory` does not prove that `gate_history` belongs to
  `orchestrator`, and `updatePhaseState` can update `current_phase` or
  `completed_phases` even when the phase list is absent or the requested IDs are
  unknown.
- The project INDEX lists vision, roadmap, and architecture documents, but those
  files are absent and marked pending. This does not block this task because the
  available tech-stack and standards documents define the relevant constraints.

## Current vs Desired Behavior

| Area | Current behavior | Desired behavior | Gap closure |
|---|---|---|---|
| Input transport | Independent flags; `options-json` is the only JSON fragment; duplicate flags overwrite earlier values (`phase-continue.mjs:18-56`). | One JSON object from stdin, with deterministic file transport. | Replace `parseArgs` with a single strict payload reader; define transport precedence and duplicate-key detection. |
| Payload validation | Required values are checked after CLI coercion; path, identifier, string, and optional-field formats are not checked. Confidence is only `high|medium`; actor is only `advisor|arbiter` (`:59-89`). | Exact allowlist, no unknown/duplicate fields, required fields, types, formats, enum rules, and option membership validated before state access. | Add boundary validation with field-specific errors and no state/report mutation on failure. |
| State boundary | History and phase updates depend on exact indentation patterns (`:114-145`, `:209-248`). Anchors, nesting, tabs, record schema, duplicate keys, and phase membership are not validated. | Validate canonical `orchestrator.gate_history` and root `phases` shape before any mutation; reject unsupported YAML. | Add a strict canonical-state validator or an equivalent dependency-free parser; fail closed. |
| History/idempotency | Terminal records are reused before denylist evaluation (`:289-300`). Malformed records can be ignored by the heuristic parser. | Reuse only a validated terminal record; denylisted gates remain blocked and non-continuing on every attempt. | Validate history records and make blocked/retry outcomes explicit in the result and exit status. |
| Persistence/reporting | History is written, reports are rendered, then phase state is written (`:321-328`). A report or second write failure can strand a terminal record. | Durable terminal state and reports precede transition, with deterministic retry/recovery. | Decide staging/order and record enough state to resume the incomplete transition safely. |
| Call-sites | `development`, `migration`, `performance`, `product-design`, and `research` each refer to the runner with prose describing individual values, not one payload. | Every source host constructs the same payload and passes it through the same transport. | Migrate five source skills and the normative engine reference; remove old flag terminology from source tests/docs. |
| Tests | `fully-automatic-phase-continue.test.sh:32-81` exercises only the legacy happy path, reports, reuse, and one first-attempt denylist case. The 19 engine tests are mostly fixture/documentation assertions (`tests/gate-decision-engine.test.sh:202-270`). | Executable coverage for transport, validation, state immutability, retry, safety, reports, and phase advancement. | Add contract-focused shell tests and run the same behavior suite against built runner copies where paths permit. |
| Build/variants | `Makefile:3-18` copies/transforms source into five outputs; `validate-contract` runs only the current source-oriented tests (`:22-25`). `.mjs` is copied, while Markdown paths are platform-transformed. | Source is authoritative; `make build` regenerates Codex, Copilot, Cursor, Kilo, and Kiro; validation detects drift and path errors. | Rebuild only after source changes, verify transformed references and runner existence, and add generated runtime/contract checks if feasible. |

## Critical Issues

1. **No structured input boundary exists.** The runner cannot accept the planned
   payload and has no way to detect duplicate JSON keys. This is the primary
   contract gap and affects every host adapter.
2. **Payload validation is not safe for JSON input.** Values that are naturally
   strings under CLI parsing will become wrong-type or ambiguous JSON values;
   paths and stable IDs currently have no format checks.
3. **State mutation is not shape-safe.** The parser recognizes textual anchors
   without proving their location or uniqueness, and phase updates can silently
   do nothing or record an unknown transition.
4. **Failure recovery is incomplete.** The history write, report writes, and
   phase update are separate operations. Report failure or second-write failure
   can leave a terminal record that causes a retry to return `reused` without
   completing the intended transition.
5. **Denylist retry behavior is under-specified and under-tested.** Terminal
   reuse precedes denylist evaluation, so a previously blocked record can return
   a successful process exit on retry. The safety guarantee needs an explicit
   result/exit contract.
6. **The source and generated call-site contract can drift.** The five source
   skills, reference documentation, and five generated runners must all converge;
   current tests do not execute the generated copies with the new boundary.

## Decisions Needed

The following should be settled in Phase 2/Specification before implementation.

```yaml
task_characteristics:
  has_reproducible_defect: false
  modifies_existing_code: true
  creates_new_entities: false
  involves_data_operations: true
  ui_heavy: false
risk_level: high
decisions_needed:
  critical:
    - question: "What is the exact file transport and compatibility policy?"
      options:
        - "stdin by default plus --input-file PATH; remove legacy flags"
        - "stdin by default plus a different named file option; remove legacy flags"
        - "Support JSON and legacy flags during a compatibility window"
      recommendation: "stdin by default plus --input-file PATH; hard cutover"
      rationale: "It matches the plan, keeps deterministic tests possible, and avoids a second ambiguous contract. Project standards reject compatibility code unless required."
    - question: "What exact canonical state shape must be accepted?"
      options:
        - "Only the dependency-free canonical shape emitted by this project"
        - "Any YAML accepted by a new parser/dependency"
        - "Best-effort mutation of recognizable fragments"
      recommendation: "Only the dependency-free canonical shape emitted by this project"
      rationale: "The plan explicitly rejects unsupported shapes and forbids a new runtime dependency; best-effort mutation is unsafe for the resume source of truth."
    - question: "How should report or second-write failure be retried?"
      options:
        - "Stage/validate report output, persist terminal state, then retry incomplete transition from validated state"
        - "Keep the current two writes and accept manual recovery"
        - "Attempt a cross-file transaction"
      recommendation: "Stage/validate reports and make terminal reuse resume the missing transition"
      rationale: "Cross-file atomicity is unavailable, but retry must not strand a terminal decision or silently skip phase advancement."
    - question: "What is the automatic runner enum policy?"
      options:
        - "Accept confidence high|medium only and actor advisor|arbiter; low confidence never reaches the runner"
        - "Accept high|medium|low and let the runner persist low-confidence outcomes"
        - "Expand actor values to user/system in the automatic payload"
      recommendation: "Keep high|medium and advisor|arbiter at this executor boundary; handle low confidence before invocation"
      rationale: "The runner is an automatic continuation executor, while the normative engine routes low confidence and user outcomes through other paths."
  important:
    - question: "What path policy applies to state and report fields?"
      options:
        - "Require non-empty strings with no NULs; allow relative and absolute paths; reject state/report collisions"
        - "Require paths relative to the project root"
        - "Preserve unrestricted path strings"
      recommendation: "Require non-empty, NUL-free paths and reject collisions; preserve relative/absolute compatibility"
      rationale: "It closes malformed-input and accidental overwrite gaps without inventing a project-root resolver."
    - question: "Should next_phase be validated against the current state before any write?"
      options:
        - "Yes; require current and next phase IDs to exist and statuses to be transitionable"
        - "Only validate that next_phase is a non-empty string"
        - "Leave phase membership to the caller"
      recommendation: "Require both phase IDs to exist and reject unsupported status transitions"
      rationale: "The runner owns phase persistence and must not record a transition it cannot prove."
    - question: "How should generated runner behavior be verified?"
      options:
        - "Run the same contract test against source and all five built runner paths"
        - "Test source only and rely on structural variant checks"
        - "Add platform-specific tests for each variant"
      recommendation: "Run a shared contract test against source and all built copies"
      rationale: "The scripts mostly copy the `.mjs`, so one matrix catches copy/path drift without five duplicated suites."
    - question: "Which documentation is part of the migration?"
      options:
        - "Normative engine reference plus the five source skills and tests"
        - "Only the five source skills"
        - "All generated Markdown variants edited manually"
      recommendation: "Normative reference plus five source skills and tests; regenerate variants"
      rationale: "The reference is the host-neutral contract and must not describe a stale invocation; generated trees are build outputs."
scope_expansion_recommended: false
critical_issues:
  - "Legacy multi-flag parsing is the only executable interface."
  - "No duplicate-key-aware JSON payload parser or full field/type/path validation exists."
  - "Canonical orchestrator.gate_history and phases shape is not validated before mutation."
  - "Terminal history, report generation, and phase transition can become inconsistent on failure."
  - "Denylist reuse and generated runner behavior lack executable coverage."
phase_summary: "Phase 2 finds a high-risk, cross-cutting input/state-boundary gap rather than a single reproducible defect. The plan is implementable without broadening product scope, provided the transport, canonical YAML, enum, and retry decisions above are locked first."
artifacts:
  - path: ".maister/tasks/development/2026-07-12-runner-input-contract/analysis/codebase-analysis.md"
    label: "Codebase Analysis"
  - path: ".maister/tasks/development/2026-07-12-runner-input-contract/analysis/gap-analysis.md"
    label: "Gap Analysis"
```

## Scope Assessment

`scope_expansion_recommended` is false. The required work fits the proposed
plan: source runner, normative contract/reference, five source call-sites,
contract tests, and generated rebuild/validation. The specification should make
those inclusions explicit; it should not add a YAML library, a new host API, a
legacy compatibility layer, or unrelated research/documentation work.

## Verification Baseline

Read-only baseline checks completed before this report:

- `bash tests/fully-automatic-phase-continue.test.sh` passed, proving only the
  existing flag-based happy path, reports, idempotent reuse, and first-attempt
  denylist behavior.
- `bash tests/gate-decision-engine.test.sh` passed all 19 structural/fixture
  assertions.
- `node --check plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
  passed.

No source code or generated platform variant was edited. `make build` was not
run during analysis because it rewrites generated output; it belongs after the
source implementation and test changes are approved.

## Evidence Set

- Plan: `.maister/plans/2026-07-12-runner-input-contract.md`
- Existing analysis: `.maister/tasks/development/2026-07-12-runner-input-contract/analysis/codebase-analysis.md`
- Runner: `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- Normative contract: `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`
- Source call-sites: `plugins/maister/skills/{development,migration,performance,product-design,research}/SKILL.md`
- Tests: `tests/fully-automatic-phase-continue.test.sh`, `tests/gate-decision-engine.test.sh`
- Build orchestration: `Makefile`, `platforms/{codex-cli,copilot-cli,cursor,kilo-cli,kiro-cli}/build.sh`
- Standards: `.maister/docs/INDEX.md` and the project docs/standards listed in
  `orchestrator-state.yml`.
