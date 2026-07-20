# Phase 11 Test Suite Results

## TL;DR

**Terminal local status: COMPLETE / PASS.** The prior run contributed 112 passed and 0 failed top-level Node tests. This continuation terminally completed every previously missing authoritative local target: `make test-core`, `make test-runtime`, `make test-evidence`, `make test-topology`, strict `make test-parity-release` in an isolated clean candidate clone, and `make validate`. Across those targets, 530 top-level test/check assertions passed and 0 failed; three aggregate watchdog wrappers each completed a 62/62 child transaction suite with terminal pass classification and non-empty final-tree evidence. The final direct `make test-platform-independent` rerun against the post-review-remediation tree also exited 0, and the current release policy/guard slice passes 16/16. External GitHub release/protection checks remain unavailable and were not mutated or fabricated.

## Key Decisions

- The earlier interrupted `make test-core` remains historical non-terminal evidence and is not counted. This continuation reran that target once to a terminal pass.
- Strict parity ran against a clean locally committed candidate snapshot in an isolated `/tmp` clone. The dirty primary worktree was neither reset nor used with `PARITY_ALLOW_DIRTY_LOCAL`.
- Duplicate aggregate/runtime/evidence execution intrinsic to `make validate` is counted as independent terminal evidence because the approved plan explicitly requires that final Make target.
- Public GitHub tag/Release, protected runs, and repository controls were not created or changed.
- Post-review remediation is covered by the direct terminal `make test-platform-independent` exit-0 run and the focused 16/16 policy/guard slice; the earlier 530-count report remains the detailed count for the complete core/runtime/evidence/parity/validate targets.

## Open Questions / Risks

- The canonical public `v2.2.1` tag and GitHub Release do not exist, so real anonymous exact-selector public smoke and public-byte comparison remain unavailable.
- Protected Linux/macOS/Windows execution and GitHub tag, branch, ruleset, and environment protections remain external release blockers.
- Local completion does not convert those unavailable external checks into release evidence.

## Cumulative Result Summary

| Metric | Result |
|---|---:|
| Authoritative local suite | **COMPLETE / PASS** |
| Prior terminal top-level tests | 112 passed, 0 failed |
| Continuation terminal checks | 418 passed, 0 failed |
| Cumulative terminal checks | **530 passed, 0 failed** |
| Aggregate watchdog wrappers | 3 passed, 0 failed |
| Aggregate child suites | 186 passed, 0 failed (3 × 62/62) |
| Terminal command failures affecting final verdict | 0 |
| Successful terminal-command wall time | 1527.82 s |
| Continuation wall time | 969.92 s |
| External checks | unavailable; not fabricated |

Top-level totals count each terminal invocation, including the independent checks repeated intrinsically by `make validate`. Aggregate child counts are shown separately because each 62-test child suite executes beneath one top-level watchdog wrapper.

## Prior Terminal Evidence — 112 Passed, 0 Failed

| Command | Status | Counts / outcome | Wall duration |
|---|---|---|---:|
| `rtk /usr/bin/time -p npm ci --ignore-scripts=false` | PASS | 6 packages added; 7 audited; 0 vulnerabilities; `prepare` passed | 0.91 s |
| `rtk /usr/bin/time -p npm run validate` | PASS | Package-boundary validation passed | 0.20 s |
| `rtk /usr/bin/time -p node --test tests/platform-independent/launcher-github-only.test.mjs` | PASS | 3 passed, 0 failed | 0.07 s |
| `rtk /usr/bin/time -p npm run test:launcher` | PASS | 83 passed, 0 failed | 4.23 s |
| `rtk /usr/bin/time -p node --test tests/platform-independent/installer-transaction.test.mjs` | PASS | Wrapper 1/1; child 62/62; terminal `passed`; final-tree evidence present | 456.75 s |
| `rtk /usr/bin/time -p node --test tests/platform-independent/installer-abrupt-crash.test.mjs` | PASS | 15 passed, 0 failed | 74.68 s |
| `rtk /usr/bin/time -p node --test tests/platform-independent/installer-multiple-journals.test.mjs` | PASS | 1 passed, 0 failed | 20.88 s |
| `rtk /usr/bin/time -p node --test tests/platform-independent/release-github-only-policy.test.mjs` | PASS | 8 passed, 0 failed | 0.12 s |
| `rtk /usr/bin/time -p node --test tests/platform-independent/requirement-artifact-drift.test.mjs` | PASS | 1 passed, 0 failed | 0.06 s |

Prior successful terminal-command wall time: **557.90 s**.

The earlier first invocation of `make test-core` was externally interrupted after a healthy `300022 ms` heartbeat and had no terminal result. It remains excluded from every pass count and duration total.

## Continuation Evidence — 418 Passed, 0 Failed

### `make test-core`

Command:

```text
rtk /usr/bin/time -p make test-core
```

Result: **PASS**, 68 passed, 0 failed, wall duration **476.16 s**.

- Intrinsic aggregate wrapper: passed.
- Aggregate child: 62 passed, 0 failed.
- Heartbeats remained regular through `450034 ms`.
- Child PID: `14136`.
- Final-tree evidence emitted at `472824 ms` and was non-empty.
- Wrapper test duration: `476055.765375 ms`.
- No heartbeat timeout or harness timeout.

### `make test-runtime`

Command:

```text
rtk /usr/bin/time -p make test-runtime
```

Result: **PASS**, wall duration **1.31 s**.

- Node runtime tests: 94 passed, 0 failed.
- Shell gate-evaluator checks: 7 passed, 0 failed.
- Combined: 101 passed, 0 failed.

### `make test-evidence`

Command:

```text
rtk /usr/bin/time -p make test-evidence
```

Result: **PASS**, 40 passed, 0 failed, wall duration **0.56 s**.

### `make test-topology`

Command:

```text
rtk /usr/bin/time -p make test-topology
```

Result: **PASS**, wall duration **0.08 s**.

```json
{"ok":true,"violations":[]}
```

### Strict isolated `make test-parity-release`

The candidate was created in an isolated local clone under `/tmp`, populated with the current workspace snapshot while excluding `.git`, `node_modules`, stale local `dist`, and operator residue `.idea`/`.pi`. All candidate changes were committed only inside the clone, its status was proven clean including ignored entries, and strict parity ran without `PARITY_ALLOW_DIRTY_LOCAL`.

Successful command inside the isolated clone:

```text
/usr/bin/time -p make test-parity-release
```

Result: **PASS**, wall duration **1.09 s**.

| Target | Expected | Unresolved | Result |
|---|---:|---:|---|
| Codex | 167 | 0 | PASS |
| Cursor | 114 | 0 | PASS |
| Kiro CLI | 466 | 0 | PASS |

Global parity result: `ok: true`.

Preparation history: one shell setup attempt stopped before parity because it used zsh's reserved `status` variable. A subsequent candidate incorrectly included ignored `.idea/` and `.pi/` residue and strict parity correctly rejected it with terminal `E_SOURCE_DIRTY` in 0.15 s. The candidate construction was corrected without source changes or dirty override, and the clean strict invocation above passed. These setup/environment attempts are not counted as product test failures or successful-command duration.

### `make validate`

Command:

```text
rtk /usr/bin/time -p make validate
```

Result: **PASS**, wall duration **490.72 s**.

Pre-test validation:

- Cursor projection: 56 files checked, 0 changes.
- Codex overlay: `ok: true`, 2 native assets.
- Cursor overlay: `ok: true`, 3 native assets.
- Kiro CLI overlay: `ok: true`, 2 native assets.

Intrinsic test results:

| Component | Result |
|---|---:|
| Core | 68 passed, 0 failed |
| Runtime Node | 94 passed, 0 failed |
| Gate evaluator | 7 passed, 0 failed |
| Evidence | 40 passed, 0 failed |
| Topology | `ok: true`, 0 violations |
| Combined assertion count | 209 passed, 0 failed |

Final intrinsic aggregate watchdog:

- wrapper: passed;
- child: 62 passed, 0 failed;
- child PID: `24668`;
- regular heartbeats through `480032 ms`;
- final-tree evidence emitted at `486064 ms` and was non-empty;
- wrapper test duration: `488668.769583 ms`;
- no heartbeat timeout or harness timeout.

## Failures

- Final completed product test failures: **none**.
- Final completed authoritative command failures: **none**.
- Historical interrupted command: one earlier `make test-core`, excluded and superseded by the terminal passing continuation.
- Candidate-preparation issue: one strict parity attempt rejected ignored operator residue with `E_SOURCE_DIRTY`; corrected by constructing the required clean isolated candidate, after which strict parity passed with zero unresolved differences.

## External Checks Unavailable

The following require external GitHub state and were not performed or mutated by this local runner:

- canonical public `v2.2.1` Git tag and immutable GitHub Release;
- real anonymous exact-tag and full-commit public smoke against that Release;
- public-byte comparison against same-job release artifacts;
- protected Linux, macOS, and Windows Node 22 workflow execution;
- GitHub tag/ruleset, protected branch, and protected environment controls;
- future private-repository E2E, activated only if the canonical repository becomes private.

These remain **unavailable external evidence**. The local suite is complete and passing, but release acceptance remains blocked until the external evidence exists.
