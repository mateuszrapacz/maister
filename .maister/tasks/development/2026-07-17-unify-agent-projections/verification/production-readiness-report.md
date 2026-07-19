# Production Readiness — Re-verification 3

## TL;DR

**Status: NOT READY — NO-GO until the owner input boundary is actually bounded.** The critical Re-verification 2 deployment gap is resolved: a packaged executable production owner now reaches the installed-state runtime and gate evaluator, both extracted target tracers invoke it as a subprocess, and the exact required bridge surfaces are documented. Packaging, installed-state validation, typed unavailable behavior, no-fallback execution, credential/version ownership, durable events, and clean-release controls are otherwise production-shaped.

One high-severity resource-safety defect remains. The CLI advertises a 1 MiB stdin limit but performs `fs.readFileSync(0)` before measuring the bytes, so input ingestion itself is unbounded. One warning also remains in the optional exact-native lifecycle contract: `cancel` is correctly optional, but its callback argument and invocation timing are unpublished and not a closed schema.

**Target:** production  
**Decision:** DO NOT PUBLISH AS PRODUCTION-READY YET  
**Re-verification:** 3  
**Findings:** 0 critical, 1 high, 1 warning, 0 informational defects  
**Assessed at:** 2026-07-19T10:38:23Z

## Verification Basis

This review read the fresh `verification/test-suite-results.md` and inspected the executable owner, production runtime, gate evaluator, exact-native and Codex adapters, package assembly/tests, release controls, public docs, and project standards. It did not rerun tests.

| Scope | Fresh result |
|---|---:|
| `make validate` | exit 0 |
| Platform-independent Node suite | 297/297 |
| Gate evaluator | 7/7 |
| Non-overlapping aggregate | 304/304 |
| Extracted Cursor owner tracer | passed |
| Extracted managed-Codex owner tracer | passed |
| Diagnostic parity | Codex 166/0; Cursor 113/0; Kiro CLI 466/0 |
| Strict parity in shared checkout | expected `E_SOURCE_DIRTY` refusal |

## Readiness Scorecard

| Category | Score | Assessment |
|---|---:|---|
| Production ownership/call graph | 10/10 | CLI → owner → runtime → gate evaluator is shipped and exercised from extracted archives. |
| Installed-state/source integrity | 9/10 | Packaged source, receipt, inventory, modes, projection, manifest, and digests are rebound before dispatch. |
| Bridge configuration | 8/10 | Required factory and port schemas are closed; optional cancel input remains unspecified. |
| Error handling and fail closure | 9/10 | Boundary failures use typed envelopes; absent/invalid prerequisites block durably without fallback. |
| Security and resource safety | 7/10 | Path/file checks, private artifacts, no shell interpolation, output limits, and timeouts are strong; owner stdin ingestion is unbounded. |
| Observability and evidence | 9/10 | Hash-chained events bind terminal output/error; requested/accepted/observed policy remains separate. |
| Packaging and deployment | 9/10 | CLI/owner are required package closure, CLI mode is 0755, artifacts are deterministic, extracted lifecycle is covered. |
| Release governance | 9/10 | Dirty parity cannot authorize publication; clean CI parity and same-job artifacts remain mandatory. |
| Maintainability/proportionality | 9/10 | Focused owner and bridge seam close the slice without unnecessary infrastructure. |
| **Overall** | **88/100** | **Strong implementation with one straightforward release-blocking resource-bound defect.** |

## Resolved Critical — A shipped owner now closes the real call graph

- `plugins/maister/bin/maister-agent-gate.mjs` is an executable public entrypoint.
- It calls `runProductionAgentGate()` from `production-owner.mjs`.
- The owner validates target/home/state/working/task inputs, loads only the caller-selected real bridge file or a typed-unavailable default, constructs `createProductionAgentRuntime()`, and supplies the runtime to `evaluateGate()`.
- Package assembly requires both CLI and owner. Every target archive preserves CLI mode `0755`.
- Cursor and Codex extracted-package tests invoke the CLI subprocess rather than importing the factory directly.
- Runtime modules do not import or invoke `agent-projector.mjs`; invocation consumes verified installed projection bytes.

This resolves the Re-verification 2 critical issue. The deterministic tracers prove the supported construction path, while live native E5/E6 remains separately qualified by host/version/scenario evidence.

## Finding R1 — The 1 MiB stdin limit is post-allocation, not an ingestion bound

- **Severity:** high
- **Category:** security / resource exhaustion / boundary validation
- **Location:** `plugins/maister/bin/maister-agent-gate.mjs:19-22`; documentation at `README.md:167`
- **Evidence:** `runCli` defaults `input` to `fs.readFileSync(0)`. JavaScript evaluates that default before entering the function body, so the entire stream is retained before `bytes.length > MAX_INPUT_BYTES` is checked. Static and extracted tests cover valid input and missing bridge behavior but do not exercise an oversized owner request.
- **Exploit/failure mode:** any process able to write to this local CLI can send input far larger than 1 MiB and drive memory consumption before receiving the typed rejection. A host integration bug can cause the same operational failure without malicious intent.
- **Why release-blocking:** this is the public production registration surface, and its documentation explicitly promises bounded stdin. Resource limits must apply before allocation to serve as a production safety control.
- **Required remediation:** replace the default full-fd read with incremental bounded ingestion that retains no more than `MAX_INPUT_BYTES + 1`, stops as soon as overflow is known, and emits the existing `E_AGENT_OWNER_INPUT` envelope/exit 2. Add an extracted or direct subprocess regression with multi-megabyte input and verify natural bounded failure.

## Finding R2 — Exact-native `cancel` is optional but not fully versioned

- **Severity:** warning
- **Category:** integration contract / resilience
- **Locations:** `README.md:195`; `host-adapters/exact-native.mjs:37,57,59,67,69`
- **Evidence:** the response schema and optionality are documented, but the callback input is not. Runtime currently invokes it only when a post-side-effect durable event append fails and passes either the full launch observation or `{error: message}`.
- **Impact:** bridge authors cannot implement cancellation predictably from public documentation and may lack the native identity/session token needed for best-effort compensation.
- **Remediation:** define one closed `cancel` request v1 and its exact trigger/return semantics, or explicitly document the current variants. Exercise it through the public bridge boundary. Cancellation may remain optional and best-effort.

## Security and Failure-Closure Assessment

- Owner requests and bridge responses reject unknown/missing fields; target and path inputs are bounded, NUL-free, real existing entries, and state is required to be a direct child of the declared task root.
- The packaged plugin/source root is derived from the executing owner and cannot be selected by the request. Active receipt/source/projection binding is validated before runtime construction.
- Managed Codex uses argv-based spawning rather than a shell and pins working root, model, effort, sandbox, JSONL, schema, last-message, and user-config isolation controls.
- Missing bridge, failed inspection, missing auth, unsupported host version/control/model/effort, launch failure, and wrong exact-native identity remain typed unavailable/failed outcomes. No adapter substitutes another role, host, root process, or inline execution.
- Event writes are private and hash-chained; terminal results are accepted only when they match durable terminal evidence. Output and last-message retention have real byte bounds.
- Credentials and host-version discovery belong to bridge code; Maister does not cache credentials. The bridge path is explicitly supplied per invocation and module failures are typed.
- The unresolved stdin issue is confined to the outermost CLI ingestion boundary but must be fixed because it precedes every other validation.

## Deployment and Release Assessment

- Package closure includes the owner, CLI, runtime, canonical sources, projection contract, and selected target assets. Foreign assets, parity baselines, and deprecated profiles are excluded.
- Both packaged runtime journeys install into isolated home/state roots and reach durable gate decisions through the executable owner.
- Release CI remains the only publication authority for strict parity. The current `E_SOURCE_DIRTY` result is correct fail-closed behavior, not a product defect; diagnostic zero-unresolved parity cannot replace a clean run.
- Live Cursor/Kiro/Codex semantic support remains evidence-qualified. `unavailable` E5/E6 cannot be promoted to passed merely because packaging/tracers succeed.
- No database migration, persistent service, or new network endpoint is introduced. Rollback remains the existing package/lifecycle rollback with preserved diagnostic state.

## GO Criteria

1. Enforce the owner stdin cap during reading and add an oversized subprocess regression.
2. Close the optional `cancel` request/timing contract or remove the undocumented argument dependency.
3. Re-run the mandatory suite and retain the extracted Cursor/Codex CLI tracers.
4. Obtain strict parity only from the clean release job before publication.
5. Continue to qualify live E5/E6 by exact bridge, host version, and scenario.

## Structured Result

```yaml
status: failed
decision: no_go
target: production
reverification: 3
issue_counts:
  critical: 0
  high: 1
  warning: 1
  info: 0
resolved_previous:
  - id: C1
    category: production_runtime_owner
  - id: W1-required
    category: bridge_required_contract_and_registration
residual:
  - id: R1
    severity: high
    category: stdin_resource_bound
    release_blocking: true
    fixable: true
  - id: R2
    severity: warning
    category: optional_cancel_contract
    release_blocking: false
    fixable: true
recorded_tests:
  mandatory_validation: {exit_code: 0}
  aggregate: {passed: 304, failed: 0}
  cursor_extracted_cli_tracer: passed
  codex_extracted_cli_tracer: passed
parity:
  current_strict: E_SOURCE_DIRTY
  diagnostic:
    codex: {expected: 166, unresolved: 0}
    cursor: {expected: 113, unresolved: 0}
    kiro_cli: {expected: 466, unresolved: 0}
```
