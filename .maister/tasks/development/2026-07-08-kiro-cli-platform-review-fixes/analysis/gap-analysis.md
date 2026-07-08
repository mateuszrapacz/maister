# Gap Analysis — Kiro CLI Platform Review Fixes

**Source**: `.maister/plans/2026-07-08-kiro-cli-platform-review-fixes.md`
**Date**: 2026-07-08

## Task Type
Platform build-pipeline bug fixes and hardening for Kiro CLI variant.

## Risk Level
**Medium** — changes affect all 29 generated agent JSON files and hook contracts; must preserve `make build-kiro && make validate-kiro` reproducibility.

## Task Characteristics
| Field | Value |
|-------|-------|
| has_reproducible_defect | true (H1: manual install path broken) |
| modifies_existing_code | true |
| creates_new_entities | false (M5 adds hook script) |
| involves_data_operations | false |
| ui_heavy | false |

## Issues by Priority

### HIGH (implement now)
- **H1**: `promptFile` + `model: "inherit"` invalid — move fix from smoke-install to build
- **H2**: Relative `file://` prompt paths may fail for subagents — verify with kiro-cli 2.6.0
- **H3**: `skill-invocation-reminder.sh` emits Claude-style JSON envelope — should be plain text

### MEDIUM (implement now)
- **M1**: Remove blanket `use_aws` from all subagents
- **M2**: Rename surviving `use_aws` → `aws` (likely N/A if M1 removes all)
- **M3**: Orchestrator `resources` skill glob may be wrong/redundant
- **M4**: Add validate-kiro schema rules
- **M5**: Add `stop` hook mirroring Cursor

### LOW (analysis/defer)
- **L1-L3**: Exploratory — defer
- **L4**: Dead hook stub — cosmetic, bundle with H3 audit
- **L5**: Review checkpoint for M5

## Decisions Needed
- **critical**: None — plan is prescriptive
- **important**: M1 — remove `use_aws` entirely (no Maister workflow touches AWS)

## Parallel Execution Plan
Each issue assigned to a separate agent for concurrent implementation.
