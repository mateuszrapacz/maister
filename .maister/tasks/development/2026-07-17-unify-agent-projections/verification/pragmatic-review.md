# Pragmatic Review — Re-verification 3

## TL;DR

**Decision: NO-GO pending one small boundary fix.** The final repair closes the former production-owner gap with the smallest proportionate vertical slice: the shipped executable calls `production-owner.mjs`, the owner constructs `createProductionAgentRuntime()`, and the resulting port is passed to `evaluateGate()`. The bridge remains an explicit host-owned seam, not a speculative host framework, and the two extracted-package tracers invoke the actual CLI subprocess.

The implementation is otherwise appropriately sized, but the CLI's advertised 1 MiB stdin bound is not enforced while reading. `fs.readFileSync(0)` consumes the complete stream before `runCli()` checks its length. This leaves a simple local resource-exhaustion path and makes the public bounded-input statement stronger than the implementation.

**Assessed at:** 2026-07-19T10:38:23Z  
**Fresh verification basis:** `make validate` passed; 297/297 Node tests plus 7/7 gate scenarios passed (304/304 non-overlapping). No tests were rerun in this review track.

## What Is Now Proportionate and Complete

- **Real owner/caller:** `bin/maister-agent-gate.mjs → production-owner.mjs → createProductionAgentRuntime() → evaluateGate()` exists in non-test executable code.
- **Distribution surface:** package closure requires the CLI and owner; extracted package tests invoke the CLI as a subprocess for both Cursor exact-native and managed Codex paths; the CLI remains executable at mode `0755`.
- **Narrow bridge abstraction:** one versioned factory supplies either the Codex capability port or exact-native port. Missing bridges use typed-unavailable implementations with no inline, root-agent, built-in, fuzzy, alternate-host, or projector fallback.
- **No dead bootstrap:** unlike Re-verification 2, the installed-state factory has a real caller and a public invocation contract.
- **No speculative infrastructure:** no service, daemon, database, queue, registry framework, dependency, or future-host hierarchy was added. A one-request/one-envelope CLI is appropriate for the current product scale.
- **Runtime/source separation:** runtime code reconstructs and validates installed projection bytes but does not import or invoke the projector.
- **Operational boundaries:** credentials and host-version discovery stay with the bridge owner; dirty-checkout parity remains a diagnostic limitation rather than a bypass of the clean release gate.

## Finding P1 — The CLI checks the stdin limit only after unbounded ingestion

- **Severity:** high
- **Category:** developer experience / resource safety / contract accuracy
- **Location:** `plugins/maister/bin/maister-agent-gate.mjs:19` (default `input = fs.readFileSync(0)`), with the limit check at lines 21–22; public claim at `README.md:167`
- **Evidence:** the default parameter is evaluated before `runCli()` begins, so an arbitrarily large stdin stream is fully allocated in memory before `bytes.length > MAX_INPUT_BYTES` can return `E_AGENT_OWNER_INPUT`. The 1 MiB check limits accepted JSON size, not ingestion memory. The fresh suite contains extracted happy-path and missing-bridge tracers but no oversized-stdin subprocess regression.
- **Impact:** a buggy or hostile local caller can force memory growth well beyond the documented limit before the process fails. The operator-facing contract says stdin is bounded, so maintainers may incorrectly rely on that as a resource boundary.
- **Recommendation:** read fd 0 incrementally with a hard cap of `MAX_INPUT_BYTES + 1`, stop accumulating immediately once the cap is exceeded, and preserve the same typed JSON failure envelope. Keep the injectable byte/string path for unit tests if useful. Add a subprocess regression that sends input substantially larger than 1 MiB and proves typed rejection without full retention.

## Finding P2 — Optional native cancellation lacks an exact invocation contract

- **Severity:** warning
- **Category:** integration contract / developer experience
- **Locations:** `README.md:195`; `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/exact-native.mjs:37,57,59,67,69`
- **Evidence:** documentation correctly says `cancel` is optional and best-effort, but does not define its argument or when it is called. The adapter calls `cancel(observation)` only after a native side effect when durable recording fails; `observation` can be either a validated launch response or an ad-hoc `{error}` mapping. This is observable bridge API behavior not represented by a closed v1 shape.
- **Impact:** host implementers still need to reverse-engineer source for the only optional lifecycle method and can make incompatible assumptions about cancellation identifiers or timing.
- **Recommendation:** either document the two current argument shapes and recording-failure timing exactly, or preferably pass one closed versioned cancellation request containing stable dispatch/native identity and reason fields. Add one contract test at the public bridge boundary.

## Complexity and Maintainability

| Area | Assessment | Reason |
|---|---|---|
| CLI + production owner | Low and proportionate | One executable and one focused composition module close the formerly missing vertical slice. |
| Bridge factory | Proportionate | Three hosts need distinct concrete ports while credentials and version discovery remain host-owned. |
| Installed-state reconstruction | Necessary complexity | Receipt/projection/source verification protects exact installed bytes and prevents caller-selected source substitution. |
| Resolver/adapters/events | Necessary complexity | Exact identity, durable terminal evidence, byte bounds, and no-fallback behavior are explicit requirements. |
| Release/package checks | Proportionate | Deterministic archives and extracted invocation are central product guarantees. |

No simplification by deleting a layer is recommended. The highest-value change is to make the already-simple CLI boundary genuinely bounded; the second is to close the remaining optional method contract without adding a generalized plugin framework.

## Priority Actions

1. Enforce the 1 MiB stdin cap during ingestion and add an oversized subprocess test.
2. Publish or normalize the exact `cancel` request contract and its recording-failure timing.
3. Preserve the current owner call graph, extracted CLI tracers, and clean-release-only strict parity rule.

## Structured Result

```yaml
status: failed
decision: no_go
reverification: 3
issue_counts:
  critical: 0
  high: 1
  warning: 1
  info: 0
resolved_previous:
  - production_runtime_owner
  - bridge_factory_request_response_and_required_methods
residual:
  - id: P1
    severity: high
    category: stdin_resource_bound
    fixable: true
  - id: P2
    severity: warning
    category: optional_cancel_contract
    fixable: true
tests_relied_on:
  mandatory_validation: passed
  aggregate: {passed: 304, failed: 0}
  cursor_extracted_cli_tracer: passed
  codex_extracted_cli_tracer: passed
strict_parity_current_checkout: E_SOURCE_DIRTY
```
