# Requirements: Harden phase-continue Input Contract

## TL;DR

Replace the runner's multi-flag interface with one strict JSON payload read from stdin by default or `--input-file PATH` for deterministic tests and diagnostics. Validate all input and the canonical state shape before any mutation, preserve existing safety/persistence behavior, migrate five source orchestrator call-sites and the normative reference, rebuild all platform variants, and verify source plus generated runners.

## Confirmed Decisions

- JSON-only hard cutover; reject legacy CLI flags.
- Use stdin by default and `--input-file PATH` for file transport.
- Accept only the project's dependency-free canonical YAML state shape.
- Retry incomplete report/phase transitions safely from validated terminal state.
- Preserve `actor: advisor|arbiter` and `confidence: high|medium` at the runner boundary.
- Require non-empty NUL-free paths, allow relative/absolute paths, and reject state/report collisions.
- Require current and next phase IDs to exist and reject unsupported transitions before writes.
- Run the shared contract tests against source and all five generated runner paths.
- Update the normative gate reference, five source skills, and tests; regenerate platform outputs with `make build`.

## Functional Requirements

1. Read exactly one structured JSON object from stdin by default; support explicit `--input-file PATH`.
2. Reject empty/malformed/non-object JSON, duplicate keys, unknown fields, missing required fields, wrong types, invalid strings/paths, duplicate options, and selections outside `options`.
3. Require `state`, `phase_id`, `gate_type`, `question`, `options`, `selected_option`, `actor`, and `confidence`; allow only `next_phase`, `report_md`, and `report_html` as optional fields.
4. Validate the canonical state boundary before any state or report write: `orchestrator.gate_history`, canonical history records, root `phases`, phase IDs/statuses, no tabs, no duplicate/misplaced anchors, and no unsupported YAML shape.
5. Preserve denylist behavior: denylisted gates remain blocked, return actionable stderr/non-zero status, never transition phases, and remain blocked on retry.
6. Preserve deterministic idempotency: the same phase/gate/question/ordered-options identity reuses the persisted terminal decision; a different selection does not overwrite it.
7. Preserve atomic temp-file write, fsync, rename, cleanup, report generation, and phase transition behavior while making incomplete transition/report retries safe.
8. Keep stdout as the JSON result channel and stderr as the actionable error channel.
9. Migrate all five source orchestrator skills and the normative gate-decision reference to construct/pass the same payload contract and remove old multi-flag invocation terminology.
10. Add executable contract coverage for transport, validation, special characters, state immutability, malformed state, phase transitions, denylist, idempotency, reports, retry behavior, and generated runner paths.
11. Rebuild Codex, Copilot, Cursor, Kilo, and Kiro variants only through the existing build pipeline.

## Scope Boundaries

Included: runner, normative contract docs, five source orchestrator skills, focused tests, build/variant regeneration, syntax and structural validation.

Excluded: decision selection logic, host-specific model APIs, legacy compatibility shim, new YAML/runtime dependency, JSON conversion of `orchestrator-state.yml`, unrelated research artifacts, and unrelated refactors.

## User Journey / Reuse

The host adapter or orchestrator remains responsible for selecting a recommendation. It serializes the validated decision payload and invokes the runner; the runner validates and persists it, then returns JSON for continuation. Existing atomic-write, report, idempotency, denylist, and phase-update helpers should be retained or minimally deepened rather than replaced with a new runtime abstraction.

## Verification Requirements

- Run the targeted contract test before and after implementation.
- Run `node --check` for the source and all generated runners.
- Run `make build`, `make validate`, and `git diff --check`.
- Confirm no generated variant was edited independently and no stale `options-json` invocation remains in source.
