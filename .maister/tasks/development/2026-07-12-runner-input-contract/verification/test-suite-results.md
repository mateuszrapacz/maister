# Full Test Suite Results

## Result

**PASS** — canonical full-suite command completed with exit code `0` on 2026-07-12.

## Command

Canonical command discovered in the repository `Makefile` and testing standard:

```text
make validate
```

Executed read-only as:

```text
rtk make validate
```

`make validate` runs the shared contract and gate tests, the six-runner matrix, platform validation/smoke checks, and `git diff --check`. The build step was not run because it regenerates platform outputs and this verification was explicitly read-only.

## Counts

| Suite or gate | Passed | Failed |
| --- | ---: | ---: |
| Gate-decision engine deterministic contract | 28 | 0 |
| Phase-continue contract matrix per runner | 21 | 0 |
| Phase-continue contract matrix, 6 runners total | 126 | 0 |
| Fully automatic phase-continue smoke test | 1 | 0 |
| Runner syntax checks (`node --check`), 6 runners | 6 | 0 |
| Make validation targets | 7 | 0 |

The seven Make validation targets were `validate-contract`, `validate-copilot`, `validate-cursor`, `validate-kiro`, `validate-kilo`, `validate-codex`, and `validate-diff-check`. Cursor and Codex installation/helper smoke checks also passed. The structural platform checks do not emit independent numeric counters, but each target completed successfully.

## Failures

None.

The expected negative denylist case emitted:

```text
phase_continue: denylisted gate requires an explicit user gate
```

This is expected stderr from a passing denylist test, not a suite failure.

## Pre-existing versus caused by this change

There are no failures to classify as pre-existing or caused by the runner-input-contract change.

The working-tree status before and after the test run was unchanged: the existing runner-input-contract source, test, generated-variant, fixture, plan, and task artifacts remained the only repository changes. Tests used temporary files/directories; no source code, tests, generated outputs, or orchestrator state were modified by this verification.
