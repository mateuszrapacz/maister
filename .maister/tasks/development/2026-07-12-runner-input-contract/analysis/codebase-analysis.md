# Codebase Analysis Report

## TL;DR

The continuation runner is still a CLI flag parser with a permissive, indentation-sensitive YAML mutator. The five source orchestrators describe the same legacy runner contract, and all generated platform copies inherit it. Existing executable coverage proves only the happy path, reuse, and denylist behavior; the planned JSON transport and strict state-boundary cases are untested.

## Key Decisions

- Keep `plugins/maister/` as the only implementation source and regenerate platform variants with `make build` — generated outputs are governed by the project build pipeline.
- Treat the payload and canonical YAML shape as fail-fast boundaries — invalid input must be rejected before state/report mutation.
- Preserve the existing atomic persistence, idempotency, denylist, reporting, and phase-transition semantics while hardening their validation and retry behavior.

## Open Questions / Risks

- The plan says `actor` and `confidence` are required, while the normative gate reference also discusses low-confidence results; the specification phase should resolve whether the runner remains limited to `high|medium` and `advisor|arbiter`.
- Report failure after the first state write can leave a terminal history entry without a phase transition; the implementation must decide whether to make the transition retryable or reject the state before this sequence.
- Generated runners are currently behaviorally untested; platform path relocation makes source-to-variant drift a release risk.

## Summary

`plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` accepts `--state`, `--phase-id`, `--gate-type`, `--question`, `--options-json`, `--selected-option`, `--actor`, `--confidence`, and optional transition/report flags. It validates only a subset of values, reads state after argument validation, appends textual gate history, renders reports, and updates phase state using exact indentation patterns. It does not accept stdin or a JSON file payload and duplicate CLI flags overwrite earlier values.

The five source orchestrator skills — `development`, `migration`, `performance`, `product-design`, and `research` — describe the old invocation boundary and the same gate context. Codex, Copilot, Cursor, Kilo, and Kiro variants are generated from source and must be rebuilt rather than edited directly.

## Primary Files

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` — runner input parsing, validation, idempotency, state mutation, report generation, denylist handling.
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` — normative gate contract and host continuation model; it does not yet define stdin/file transport.
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` — shared gate and state behavior used by source orchestrators.

## Source Call-Sites

- `plugins/maister/skills/development/SKILL.md:127-137`
- `plugins/maister/skills/migration/SKILL.md:75-93`
- `plugins/maister/skills/performance/SKILL.md:76-96`
- `plugins/maister/skills/product-design/SKILL.md:88-108`
- `plugins/maister/skills/research/SKILL.md:74-94`

Each describes the state path, phase/gate context, ordered options, selected option, actor, confidence, next phase, and report paths. The migration must replace the old multi-flag invocation with the single payload contract without making the runner responsible for choosing a decision.

## Current State and Mutation Behavior

`parseArgs` (`phase-continue.mjs:37-56`) allowlists CLI flags, parses only `--options-json`, and silently accepts duplicate flags. `requireOptions` (`:59-89`) checks required values, option uniqueness/membership, actor, and confidence but does not validate path or identifier formats.

`parseGateHistory` (`:114-145`) and `appendGateHistory` (`:190-211`) recognize exact two-space anchors. They do not prove that `gate_history` is under `orchestrator`, reject tabs or duplicate anchors, or reject malformed/incomplete history records. `updatePhaseState` (`:215-248`) assumes a root-level canonical `phases:` list and can silently do nothing or record unknown phase IDs when the shape differs.

The runner currently writes the history-bearing state atomically, renders reports, and then writes a second state version containing phase advancement (`:321-326`). If report generation or the second write fails, a terminal record may cause a retry to reuse without reapplying the transition. Report paths are not checked for collisions with the state path. Denylisted gates persist a blocked record, but terminal reuse occurs before denylist evaluation.

## Existing Tests and Gaps

`tests/fully-automatic-phase-continue.test.sh:13-84` covers old-CLI success, reports, phase advancement, idempotent reuse, and a denylisted `implementation-approval` call. `tests/gate-decision-engine.test.sh:64-270` primarily checks fixture/documentation contracts and generated runner paths.

Missing executable coverage includes stdin/file transport, malformed JSON, unknown or duplicate fields, missing/wrong-type values, special characters, path formats, duplicate options, invalid selections, malformed or unsupported state YAML, tabs, duplicate/incomplete anchors, unknown phases, state immutability on validation failure, report retry, denylist retry, and generated-variant behavior.

## Recommended Approach

Add one strict JSON payload reader supporting stdin by default and an explicit file path for deterministic tests. Use an allowlist, duplicate-key detection, type/format/business-rule validation, and validate the canonical `orchestrator.gate_history` and root `phases` anchors before any write. Preserve the current textual update strategy only after those anchors and records are proven canonical. Keep errors actionable on stderr with non-zero exits and stdout reserved for JSON results.

Update the five source skills and contract tests, then run `node --check`, the targeted contract test, `make build`, `make validate`, and `git diff --check`. Generated variants under `plugins/maister-copilot/`, `plugins/maister-cursor/`, `plugins/maister-kilo/`, and `plugins/maister-kiro/` are outputs, not edit targets.
