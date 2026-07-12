# Reality Check: Runner Input-Contract Hardening (Refreshed)

## Decision

**✅ Ready for the requested runner-input-contract verification scope.**

The previously reported persisted-state compatibility failure is resolved. Invalid terminal retries are immutable, the complete validation gate passes on the settled checkout, and all six runner variants are behaviorally and byte-for-byte aligned.

This is a targeted reality assessment, not a replacement for the separate production-readiness decision. The persisted workflow still records `skip_test_suite: true` and `e2e_enabled: false`; those optional host-level checks were not run.

## Verification run

All checks below were run read-only. The only repository artifact written by this assessment is this report.

| Area | Result | Evidence |
|---|---|---|
| Current persisted state compatibility | **PASS** | Safe probe against a copy of the current state exited 0; the runner parsed the populated history and generated the requested result/reports without a canonical-state error. |
| Invalid terminal retry immutability | **PASS** | `terminal retries validate transitions before report rendering` passed for every runner; invalid transition plus injected report failure exited non-zero with empty stdout and unchanged state/Markdown/HTML files. |
| Full validation gate | **PASS** | `make validate` exited 0; gate contract 28/28, six runner matrices 21/21 each, all platform validators, syntax checks, smoke checks, and `git diff --check` passed. |
| Six-runner parity | **PASS** | Source, Codex, Copilot, Cursor, Kilo, and Kiro paths all exist, pass `node --check`, have identical SHA-256, and pass the same 21-case matrix. |

## Current persisted-state compatibility

The current `.maister/tasks/development/2026-07-12-runner-input-contract/orchestrator-state.yml` was copied to a temporary directory and exercised through the source runner using a valid no-transition JSON payload. The probe returned exit code 0 with no stderr validation error. The persisted verification-options record now includes `All four recommended checks` in its `options` sequence, so its selected value is an exact canonical option.

The real task state was not passed as the write target; no workflow state, report, or parent directory was modified by the probe.

## Invalid terminal retry immutability

The shared contract case passed on all six runner paths:

```text
terminal retries validate transitions before report rendering
```

The case first persists a terminal decision, then retries it with an invalid active target while report failure injection is enabled. The retry fails at transition validation before report rendering; stdout remains empty and the state, Markdown report, and HTML report remain byte-identical. The same six-runner matrix also passes changed-selection rejection, denylist retry protection, report-failure recovery, and exact-once transition recovery.

## Full validation evidence

Fresh settled-checkout command:

```text
make validate                         exit 0
bash tests/gate-decision-engine.test.sh       28 passed, 0 failed
phase-continue contract matrix        21 passed, 0 failed per runner
fully automatic continuation smoke    passed
node --check                           all six runners passed
platform validators                    Copilot, Cursor, Kiro, Kilo, Codex passed
git diff --check                       passed
```

The six runner cases total **126/126**. The expected denylist error was emitted on stderr during the passing negative smoke case and did not indicate a suite failure.

## Six-runner parity

All six runner files currently have this SHA-256:

```text
6559e506d5e9bf60dbbebb632f26b14da9e9a28d185fd112856e028ab9e4b21d
```

Direct `cmp` checks against the source runner returned success for Codex, Copilot, Cursor, Kilo, and Kiro. The final completed matrix reported 21/21 cases for each of source, Codex, Copilot, Cursor, Kilo, and Kiro.

## Verification-stability note

During the assessment, a concurrent `platforms/cursor/build.sh` process temporarily removed or relocated generated Cursor files. This caused transient validation failures (`MODULE_NOT_FOUND` for the Cursor runner and a stale `skills/orchestrator-framework` layout) and one interrupted matrix run after three runners. The build process was not stopped or modified. After it settled, the generated Cursor layout was valid, `make validate-cursor` passed, and a fresh complete `make validate` exited 0.

This is an environment/concurrency note, not a current runner-contract failure. Generated validation should be run against a quiescent checkout or isolated build workspace.

## Residual scope notes

- The persisted workflow remains active (`task.status: in_progress`, `current_phase: phase-11`) because this read-only assessment does not finalize workflow state.
- The state records `skip_test_suite: true` and `e2e_enabled: false`; no additional repository-wide or optional host-level test run is claimed beyond `make validate`.
- The separate production-readiness report may retain broader release concerns; this report only closes the four requested runner-input-contract reality checks.

## Status summary

| Check | Status |
|---|---|
| Persisted-state validation | ✅ Pass |
| Invalid terminal retry immutability | ✅ Pass |
| Full validation evidence | ✅ Pass |
| Six-runner parity | ✅ Pass |
| Overall targeted reality assessment | ✅ Ready |
