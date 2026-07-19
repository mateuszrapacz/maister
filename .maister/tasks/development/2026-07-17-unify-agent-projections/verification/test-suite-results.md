# Phase 11 Re-Verification 3 — Test Suite Results

## TL;DR

**Status: PASS for the mandatory final post-fix validation and test suite.**
`make validate` exited 0; the complete platform-independent Node suite passed 297/297 and the gate evaluator passed 7/7.
The new packaged production owner, extracted Cursor and managed-Codex CLI tracers, runtime/projector isolation, containment, byte bounds, and evidence fail-closure all passed.
Strict parity correctly refused the dirty shared checkout with `E_SOURCE_DIRTY`; allow-dirty parity is diagnostic evidence only and reported zero unresolved differences.
Every long-running process completed naturally; none was interrupted or killed.

## Key Decisions

- Treat `make validate` as the repository's canonical mandatory validation command, per the Makefile.
- Run all `tests/platform-independent/*.test.mjs` separately to obtain an exact aggregate that includes package tracers and the final production-owner regression.
- Count the independent Node aggregate and shell gate scenarios once. Do not add the overlapping assertions executed inside `make validate`.
- Preserve strict parity's fail-closed `E_SOURCE_DIRTY` result as authoritative for the current dirty checkout; the allow-dirty run is not clean-release proof.
- Preserve the intentional absence of `.codex/agents/advisor.toml`, `.codex/agents/arbiter.toml`, and `.codex/agents/luna_smoke_agent.toml`.

## Open Questions / Environment Limitations

- A strict clean-checkout parity proof cannot be produced from this shared dirty worktree. It requires an isolated clean checkout or disposable clean commit; this read-only verification track was not authorized to create either.
- Real native-host E5/E6 execution can remain `unavailable` when executable, authentication, safe bridge, versioned scenario, or observable-identity prerequisites are absent. The test suite verifies that unavailable evidence never becomes a support claim.

## Result Summary

| Verification scope | Result | Exact evidence |
|---|---:|---|
| Mandatory repository validation | PASS | `make validate`, exit 0 |
| Complete platform-independent Node suite | PASS | 297 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo |
| Gate evaluator | PASS | 7 passed, 0 failed |
| Non-overlapping observable assertion aggregate | PASS | 304 passed, 0 failed (297 Node + 7 shell gate scenarios) |
| Cursor checked-in projection | PASS | 56 files, 0 changes |
| Overlay validation | PASS | Codex, Cursor, and Kiro CLI contracts valid |
| Extracted Cursor production CLI tracer | PASS | Gate invoked through packaged CLI, production owner, exact-native adapter, and durable terminal evidence |
| Extracted managed-Codex production CLI tracer | PASS | Gate invoked through packaged CLI, production owner, managed Codex adapter, and durable terminal evidence |
| Strict parity on current checkout | EXPECTED REFUSAL | exit 2, `E_SOURCE_DIRTY` |
| Diagnostic allow-dirty parity | PASS, diagnostic only | Codex 166/0; Cursor 113/0; Kiro CLI 466/0 expected/unresolved |
| CLI and owner syntax | PASS | both `node --check` commands exited 0 |
| CLI executable mode | PASS | `plugins/maister/bin/maister-agent-gate.mjs` mode 0755 |
| Whitespace integrity | PASS | `git diff --check`, exit 0 |
| Deprecated Codex profiles | PASS | `.codex/agents` empty; all three profiles absent |

The 304 assertion aggregate deliberately excludes `make validate`, because that command substantially overlaps the separately aggregated Node and gate suites.

## Exact Commands and Outcomes

### 1. Mandatory validation

```text
rtk make validate
```

- Exit code: `0`
- Natural completion: yes
- Included by Makefile:
  - Cursor skill projection check
  - all-target overlay validation
  - core and runtime tests
  - gate evaluator
  - evidence tests
  - repository topology verification
- Projection result: `Cursor skill projection check passed: 56 files, 0 change(s)`.
- Overlay result: `ok: true` for `codex`, `cursor`, and `kiro-cli`.

### 2. Exact complete Node aggregate

```text
rtk node --test tests/platform-independent/*.test.mjs
```

- Exit code: `0`
- Natural completion: yes
- Duration reported by Node: `252819.439792 ms`
- Exact totals:
  - tests: 297
  - passed: 297
  - failed: 0
  - cancelled: 0
  - skipped: 0
  - todo: 0

### 3. Gate evaluator aggregate

```text
rtk bash tests/gate-evaluator.test.sh
```

- Exit code: `0`
- Exact totals: 7 passed, 0 failed
- Covered common plans, Advisor equality with distinct decision/dispatch identity, terminal-to-durable-event binding, reused Codex observation, retry/arbitration isolation, dispatch/event fail-closure, denylisted implementation approval, and frozen validated evidence.

### 4. Strict parity

```text
rtk make test-parity-release
```

- Exit code: `2`
- Result: expected strict refusal with typed `E_SOURCE_DIRTY`.
- Assessment: correct fail-closed behavior on the known dirty shared checkout; not a parity-content failure.

### 5. Diagnostic parity only

```text
rtk env PARITY_ALLOW_DIRTY_LOCAL=1 make test-parity-release
```

- Exit code: `0`
- Gate: `three-target-shadow-parity`
- Counts:
  - Codex: 166 expected, 0 unresolved
  - Cursor: 113 expected, 0 unresolved
  - Kiro CLI: 466 expected, 0 unresolved
- This result describes content parity in the dirty development worktree and is not clean-release proof.

### 6. Integrity, syntax, topology-reference, executable-mode, and profile checks

```text
rtk git diff --check
rtk node --check plugins/maister/bin/maister-agent-gate.mjs
rtk node --check plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs
rtk ls -l plugins/maister/bin/maister-agent-gate.mjs
rtk rg -n 'production-owner|createProductionAgentRuntime|evaluateGate|bounded|bridge' tests/platform-independent/repository-topology.test.mjs tests/platform-independent/release-package.test.mjs tests/platform-independent/agent-runtime-composition.test.mjs
rtk rg -n 'advisor\.toml|arbiter\.toml|luna_smoke_agent\.toml' .codex/agents
rtk ls -la .codex/agents
```

- `git diff --check`: exit 0, no output.
- Both `node --check` commands: exit 0.
- CLI mode: 0755.
- Topology/test search found the shipped owner call-graph assertions and both extracted bridge tracers.
- Deprecated-profile search returned exit 1 with no matches, the expected negative-search outcome.
- `.codex/agents`: empty.
- The first composite integrity command therefore returned exit 1 solely because its final negative `rg` found no deprecated profiles; a subsequent standalone `git diff --check` again exited 0.

## Required Final-Fix Coverage

The complete suite passed the behavior-focused assertions required for re-verification 3, including:

- `the shipped agent-gate owner closes the production runtime-to-gate call graph`, proving the non-test chain `CLI → production-owner → createProductionAgentRuntime() → evaluateGate()`.
- `extracted package drives a gate through production bootstrap, exact native dispatch, and durable terminal evidence`.
- `extracted package drives a gate through production bootstrap and the managed Codex adapter`.
- `target archives are deterministic, self-contained, and support a clean lifecycle` and `target archives contain the canonical projection contract and runtime closure without foreign behavior trees`.
- `packaged runtime composes resolver, task preparation, exact native adapter, and durable events`.
- `materialization writes generated host files only to staging and runtime code has no projector dependency`.
- `Node process port retains at most the configured UTF-8 bytes for multibyte output` and rejects an oversized last-message file without reading it.
- `Codex task preparation rejects a symlinked dispatch ancestor before writing outside the task root`.
- Missing exact-launch/observable-identity controls, authentication, model, reasoning, or bridge prerequisites return typed unavailable/unsupported outcomes without fallback; wrong observed identity is a typed failure.
- `Codex E6 remains unavailable when effective policy only echoes the request`, while stale digests, timeouts, wrong identities, and wrong behavior fail closed.
- Transactional and Kiro multi-root tests preserve bytes, modes, links, unrelated leaves, receipts, journals, and topology across rejection, failure, recovery, rollback, and uninstall boundaries.

The packaged CLI subprocess tracers exercise the public request/owner/bridge boundary from extracted target archives rather than importing runtime factories directly. Repository topology and package tests also assert owner/CLI inclusion and the closed call graph. Bridge documentation/code consistency is assessed by the parallel documentation and production-readiness tracks; the executable tests validate both v1 bridge shapes used by Cursor exact-native and managed Codex production paths.

## Failures

No mandatory validation or test assertion failed. The only non-zero product command was the intentionally strict parity invocation on the dirty shared checkout; it returned the expected typed `E_SOURCE_DIRTY` refusal before parity evaluation. The negative deprecated-profile search also returned its expected no-match exit code 1.

## Structured Result

```yaml
status: passed
generated_at: 2026-07-19T10:33:51Z
mandatory_validation:
  command: "rtk make validate"
  exit_code: 0
platform_independent:
  command: "rtk node --test tests/platform-independent/*.test.mjs"
  passed: 297
  failed: 0
gate_evaluator:
  command: "rtk bash tests/gate-evaluator.test.sh"
  passed: 7
  failed: 0
non_overlapping_total:
  passed: 304
  failed: 0
strict_parity:
  command: "rtk make test-parity-release"
  exit_code: 2
  outcome: E_SOURCE_DIRTY
  assessment: expected_fail_closed_refusal
diagnostic_parity:
  command: "rtk env PARITY_ALLOW_DIRTY_LOCAL=1 make test-parity-release"
  exit_code: 0
  release_proof: false
  codex: {expected: 166, unresolved: 0}
  cursor: {expected: 113, unresolved: 0}
  kiro_cli: {expected: 466, unresolved: 0}
production_tracers:
  cursor_exact_native_cli: passed
  codex_managed_exec_cli: passed
call_graph:
  cli_to_owner_to_runtime_to_gate: passed
deprecated_codex_profiles_absent: true
all_processes_completed_naturally: true
```
