# TDD Red Gate

## Outcome

The defect is reproduced by `tests/codex-fully-automatic-workflow-loop.test.sh`.
The test fails before production implementation, as required by the red gate.

## Behavior under test

The contract exercises two Codex fully automatic paths through deterministic role and dispatch ports:

1. Agreement: the main recommendation and advisor both select `A`; the terminal actor must be `advisor`, the arbiter must not run, and the next work item must be dispatched without a user gate.
2. Disagreement: the main recommendation selects `A` and the advisor selects `B`; exactly one logical arbiter must run, its result must become terminal, and the next work item must be dispatched without a user gate.

Both paths require a durable acknowledged dispatch, completion of the current work item, and an `in_progress` checkpoint for the next work item.

## Red evidence

Command:

```sh
bash tests/codex-fully-automatic-workflow-loop.test.sh
```

Observed exit code: `1`

Observed failure:

```text
Error: Cannot find module '/Users/mrapacz/Workspace/maister/platforms/codex-cli/bin/fully-automatic-gate.mjs'
code: 'MODULE_NOT_FOUND'
```

The failure identifies the intended missing seam: no executable Codex binding currently connects role evaluation, terminal persistence, workflow routing, and automatic dispatch.

## Guardrails

- External role and dispatch behavior is isolated behind deterministic command fixtures.
- The test asserts observable decisions, state transitions, invocation counts, and dispatch receipts rather than internal function structure.
- The host capability remains `unsupported`; this contract is not a substitute for the real Codex-native E2E required before changing the capability matrix.
