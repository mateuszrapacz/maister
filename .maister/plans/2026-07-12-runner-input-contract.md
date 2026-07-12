# Plan: Harden `phase-continue` Input Contract

**Status:** proposed — implementation not started

**Created:** 2026-07-12

**Related task:** `.maister/tasks/development/2026-07-11-advisor-mode`

## Objective

Make the continuation runner resilient at its input boundary. The runner must
receive one structured decision payload, validate it before processing, avoid
shell-quoting ambiguity, and refuse to modify state it cannot recognize safely.

The runner remains an executor, not a decision-maker: the LLM/adapter supplies
`selected_option`; the runner validates and persists it.

## Current Problem

The runner currently accepts many independent CLI flags and parses only
`options-json` as JSON. This makes quoting and duplicated/malformed arguments a
host responsibility. Its state adapter also relies on the canonical YAML
indentation shape rather than validating the state boundary explicitly.

## Decisions

- Use one JSON payload as the primary input contract.
- Read the payload from stdin by default; allow a file path for deterministic
  tests and diagnostics.
- Reject unknown fields and invalid types before reading or writing state.
- Keep `orchestrator-state.yml` as the source of truth and preserve the
  project’s no-new-runtime-dependency approach.
- Validate the required canonical state structure before applying a textual
  YAML update. Do not silently rewrite unsupported YAML shapes.
- Keep the JSON result on stdout and actionable errors on stderr with non-zero
  exit codes.
- Migrate all source call-sites to the new payload contract, then regenerate
  platform variants with `make build`.

## Payload Contract

```json
{
  "state": ".maister/tasks/.../orchestrator-state.yml",
  "phase_id": "phase-1",
  "gate_type": "phase-exit",
  "question": "Continue to phase 2?",
  "options": ["Continue to phase 2", "Pause workflow"],
  "selected_option": "Continue to phase 2",
  "actor": "advisor",
  "confidence": "high",
  "next_phase": "phase-2",
  "report_md": ".maister/tasks/.../decision-summary.md",
  "report_html": ".maister/tasks/.../decision-summary.html"
}
```

`state`, `phase_id`, `gate_type`, `question`, `options`, `selected_option`,
`actor`, and `confidence` are required. `next_phase`, `report_md`, and
`report_html` are optional. `options` must be a non-empty array of unique
strings, and `selected_option` must be an exact member of that array.

## Implementation Steps

### 1. Contract and validation

- Add a single JSON payload reader for stdin and file input.
- Define an explicit field allowlist and reject unknown or duplicate fields.
- Validate required fields, string types, confidence, actor, option membership,
  and path formats before any state access.
- Keep denylist, implementation-approval, idempotency, and terminal-result
  rules unchanged.

### 2. State boundary

- Validate the required `orchestrator.gate_history` and `phases` anchors and
  the canonical indentation shape before mutation.
- Reject tabs, malformed history entries, and unsupported state shapes with a
  clear error.
- Preserve atomic temp-file write, fsync, rename, cleanup, phase transition,
  and report retry behavior.

### 3. Call-site migration

- Update the five source orchestrator skills to construct/pass the payload
  contract.
- Remove the old multi-flag invocation from source instructions and tests.
- Rebuild Codex, Copilot, Cursor, Kilo, and Kiro variants only through
  `make build`.

### 4. Tests and verification

- Add a failing contract test before implementation for the new payload path.
- Cover stdin/file transport, special characters, unknown fields, missing
  fields, wrong types, duplicate options, invalid selection, malformed state,
  denylist blocking, idempotent reuse, reports, and phase advancement.
- Run the targeted test, `node --check`, `make build`, `make validate`, and
  `git diff --check`.
- Run standards/spec code review before the final commit.

## Acceptance Criteria

- No decision value is parsed from free-form LLM prose.
- A single structured payload is accepted consistently by every host adapter.
- Invalid or ambiguous input fails before state mutation.
- Shell quoting is not required for individual decision fields.
- Unsupported state YAML is rejected rather than silently rewritten.
- Existing denylist, idempotency, atomic persistence, reporting, and phase
  transition behavior remains passing.
- All generated variants are reproducible from source and pass validation.

## Scope Exclusions

- No change to how the LLM or arbiter chooses a recommendation.
- No new model API, host-specific auto-answer mechanism, or npm dependency.
- No conversion of `orchestrator-state.yml` to JSON.
- No changes to unrelated research artifacts.

## Standards Compliance Checklist

- [ ] Edit only `plugins/maister/` and relevant platform source; regenerate
      variants with `make build` (`.maister/docs/standards/global/plugin-development.md`).
- [ ] Keep the runner and payload contract minimal, with no unused compatibility
      layer or speculative abstraction (`.maister/docs/standards/global/minimal-implementation.md`).
- [ ] Validate allowlisted fields, types, formats, and business rules at the
      boundary (`.maister/docs/standards/global/validation.md`).
- [ ] Emit clear actionable errors, fail fast, and clean up file descriptors and
      temporary files (`.maister/docs/standards/global/error-handling.md`).
- [ ] Keep functions focused, names descriptive, and remove dead code
      (`.maister/docs/standards/global/coding-style.md`).
- [ ] Test behavior first, include critical boundary cases, and finish with
      `make validate` (`.maister/docs/standards/testing/test-writing.md`).
- [ ] Preserve platform transforms and generated-variant drift checks
      (`.maister/docs/standards/global/build-pipeline.md`).

## Approval Gate

Implementation starts only after explicit user approval of this plan.
