# Re-Verification 3 Reality Check: Unified Agent Projections

## TL;DR

**Decision: ✅ Ready / GO for Phase 11 completion.** The final repair closes both findings from re-verification 2 in a shipped, extracted-package subprocess flow. `plugins/maister/bin/maister-agent-gate.mjs` is now the executable production entrypoint; it calls the closed v1 owner, which loads an explicitly registered bridge, constructs `createProductionAgentRuntime()`, and passes the resulting runtime port into `evaluateGate()`. The CLI and owner are included in every target archive, the CLI retains mode `0755`, and extracted Cursor and managed-Codex tracers invoke the CLI as a separate process rather than importing runtime factories from test code.

The bridge contract is now published precisely and agrees with source: closed owner request/envelope, v1 factory and response, Codex capability inspection, exact-native inspect/launch, credential/version ownership, registration lifecycle, typed failures, and optional best-effort native `cancel`. Exact current findings are **0 critical, 0 warning, 0 informational**. The two re-verification 2 findings are **2 resolved / 0 residual**.

Fresh sequential evidence reports `make validate` exit 0, 297/297 platform-independent tests, 7/7 gate scenarios, and 304/304 non-overlapping assertions. I did not rerun tests in this read-only reality track. Strict parity correctly refused the dirty shared checkout with `E_SOURCE_DIRTY`; diagnostic parity is clean at Codex 166/0, Cursor 113/0, and Kiro CLI 466/0, but remains diagnostic rather than release proof.

## Key Decisions

- Accept the shipped CLI and `production-owner.mjs` as the previously missing production ownership edge.
- Accept the extracted CLI subprocess tracers as proof of the public call graph: package → executable CLI → owner → installed-state runtime → `evaluateGate()` → adapter → durable terminal → gate decision.
- Accept the public bridge documentation as aligned with the closed validators, including optional—not required—best-effort native cancellation.
- Reconfirm all earlier critical reality boundaries as closed: task-root containment, exact output bounds, independently observed Codex E6 policy, durable gate identity/output binding, and runtime/projector isolation.
- Keep clean-release parity and live E5/E6 native-host evidence as separate publication gates; neither is replaced by deterministic bridge tests.

## Open Questions / Risks

- No implementation blocker remains in the reviewed scope.
- This dirty shared checkout cannot produce strict clean-release parity evidence. Release must run the existing strict gate from a clean checkout or release commit.
- Extracted bridge tracers prove the shipped integration protocol and deterministic adapter behavior. They do not claim live native support when executable, authentication, observable identity, or effective-policy prerequisites are unavailable; those remain governed by current E5/E6 records.
- The owner deliberately supports non-interactive gate evaluation only. A fail-closed `blocked` gate is a successful owner operation envelope, but not a successful gate decision; the public contract documents this distinction.

## 1. Final Production Call Graph

```text
operator / host
  → packaged executable bin/maister-agent-gate.mjs
      → bounded closed JSON request from stdin
      → runProductionAgentGate(request)
          → validate target/home/state/working/task ownership
          → load explicit createMaisterAgentBridgeV1 module, or null
          → validate closed bridge response and ownership
          → createProductionAgentRuntime(...)
              → read and validate active receipt
              → bind packaged source commit/version
              → reconstruct manifest and installed projection
              → validate receipt-owned bytes and digests
              → compose resolver/preparer/adapters/events
          → evaluateGate({runtimePort, ...})
              → resolve exact maister:advisor
              → prepare bounded dispatch task
              → managed Codex or exact-native adapter
              → durable terminal stream
              → terminal/event equality check
              → committed gate decision or typed blocked result
      → one closed JSON envelope on stdout
```

This is a real non-test call edge:

- `maister-agent-gate.mjs:6,24` imports and calls `runProductionAgentGate()`.
- `production-owner.mjs:5-6,138-153` imports both `evaluateGate()` and `createProductionAgentRuntime()`, creates the runtime, and supplies it as `runtimePort`.
- `release-interface.mjs:113-133` makes both CLI and owner mandatory package closure.
- Archive tests assert both paths exist and the extracted CLI mode is `0755`.

The static repository-topology guard verifies this ownership chain, but the decisive evidence is behavioral: both extracted target tracers spawn the packaged CLI in a new Node subprocess, send its public JSON request through stdin, parse its stdout envelope, and observe the final gate result. Test code no longer owns the factory-to-gate integration edge.

## 2. Shipped CLI and Owner Reality

### CLI boundary

`maister-agent-gate.mjs` is a shebang executable with source mode `0755`. It reads stdin, rejects empty or larger-than-1-MiB input, parses JSON, invokes the owner, and emits exactly one schema-v1 success or failure envelope. Unknown exceptions become `E_AGENT_OWNER_INTERNAL`; typed errors retain code, retryability, and details. Boundary failures exit 2.

### Owner boundary

`production-owner.mjs` accepts only the exact 11-field request, schema version 1, operation `evaluate_gate`, and one of the three target IDs. It requires `interactive: false`, canonicalizes real non-symlinked home/state/working/task/state/bridge paths, and requires `state_path` to be a direct child of the gate task root. The packaged plugin source is derived from the running owner and is not caller-selectable.

The owner loads only an explicitly supplied real bridge module exporting `createMaisterAgentBridgeV1`. It validates the closed response, requires the host to own credentials and version discovery, and then maps the resulting port only to the selected target. There is no root-agent, inline, built-in, fuzzy, or alternate-target fallback.

### Typed fail-closed behavior

- A missing bridge module (`bridge_module: null`) supplies no privileged port. Runtime defaults report unavailable capabilities.
- The extracted Cursor tracer observes process exit 0 because evaluation itself completed, but the returned gate directive is `blocked` and the durable Advisor attempt contains `E_AGENT_UNAVAILABLE`; it cannot approve or continue.
- An unreadable module, missing factory, malformed bridge, or bridge initialization failure returns a typed owner/bridge error envelope and exit 2.
- Failed capability inspection, authentication, version/control/model/effort checks, wrong observed identity, or adapter failures remain typed unavailable/failed runtime results with no fallback.

This split is correct: a fail-closed gate result is valid output from the owner operation, not an infrastructure crash and not a successful gate decision.

## 3. Extracted CLI Subprocess Evidence

### Cursor exact-native

The test builds a Cursor archive, extracts it, installs it into isolated home/state roots, writes a valid orchestrator state, and invokes `plugins/maister/bin/maister-agent-gate.mjs` via `spawnSync`.

It first supplies `bridge_module: null` and proves the gate blocks with `E_AGENT_UNAVAILABLE`. It then writes a v1 bridge module whose factory validates the owner request and returns a closed exact-native port. A second CLI subprocess traverses the production owner/runtime, resolves `maister:advisor`, launches the exact selected native identity, durably records `launch_id`, and returns the `Continue` gate decision.

### Managed Codex

The Codex tracer independently builds, extracts, and installs the Codex archive. Its registered bridge supplies only the closed capability inspection port; the real runtime then constructs the managed Codex adapter and process port. A fixture executable exercises the actual managed-worker argv/stdin contract, JSONL session/turn events, output-schema path, last-message file, dispatch/manifest/projection/nonce identity, selected gate output, and durable terminal binding. The packaged CLI subprocess returns `continue` with adapter `codex.exec` and the expected selected option.

These tests use deterministic host fixtures rather than live native services, which is appropriate for production-seam regression coverage. Live host support remains a separate E5/E6 concern.

## 4. Package Inclusion and Executable Mode

The package stage recursively copies the canonical `bin` and runtime trees, and package closure explicitly requires:

- `bin/maister-agent-gate.mjs`;
- `skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs`;
- `production-runtime.mjs`, resolver, preparer, adapters, events, canonical sources, projection contract, and target contracts.

Release-package tests inspect every target archive, require both owner paths, extract every target, and assert the CLI mode is exactly `0755`. The fresh test record also confirms direct source mode `0755`, syntax checks for both modules, deterministic package lifecycle, and no forbidden legacy Codex TOML profiles.

## 5. Public Bridge Contract and Cancellation

README lines 163-215 now publish the operable v1 protocol rather than merely pointing integrators at source:

- exact owner invocation and all request fields;
- one closed stdout envelope and exit semantics;
- exact factory export name and factory request fields;
- exact Codex and exact-native bridge response ownership fields;
- Codex resolver/dispatch inspect request variants and full observation shape;
- exact-native resolver/dispatch inspect requests, launch request/response, and nested plan/task ownership;
- explicit host ownership of credentials, version discovery, and compatibility;
- registration/update lifecycle and E5/E6 renewal;
- typed unavailable/failed outcomes without inheritance or fallback.

The cancellation wording now matches code. `inspect` and `launch` are required for exact-native bridges; `cancel` is the sole optional port field. When provided, it is used best-effort after a post-side-effect durability failure. Its absence does not make the bridge invalid and never converts a failed durable recording into success.

Architecture and orchestrator-pattern documentation identify the CLI as the production owner and require hosts embedding lower-level libraries to preserve the same owner call graph and closed bridge contract.

## 6. Previous Critical Reality Boundaries Reconfirmed

| Boundary | Current status | Source and fresh evidence |
|---|---|---|
| Symlink containment | **Resolved** | Real task root, component-by-component ancestor rejection, no-follow artifact descriptors, parent/file identity rechecks, and zero-outside-byte regression. |
| Exact output bounds | **Resolved** | Buffer byte-tail retention, valid UTF-8 decoding, pre-read last-message size check, multibyte and oversized-file regressions. |
| Codex E6 policy truthfulness | **Resolved** | Requested/accepted/observed fields are separate; unavailable/null independent observation cannot pass and echoed request remains unavailable. |
| Gate decision identity | **Resolved** | Gate idempotency, decision ID, retry dispatch IDs, and logical role remain distinct across Advisor/Arbiter attempts. |
| Durable returned-output identity | **Resolved** | `evaluateGate()` requires returned terminal output/native observations or failure error to equal the final durable event before accepting a response. |
| Runtime/projector isolation | **Resolved** | Runtime reconstructs receipt-owned installed bytes and imports no projector; materialization-only projector dependency is regression-guarded. |
| Default bridge behavior | **Resolved** | Missing Codex/native port is typed unavailable; CLI subprocess test proves blocked gate with no fallback. |

## 7. Final Two Findings

| ID | Re-verification 2 severity | Re-verification 3 outcome | Evidence |
|---|---|---|---|
| C1 | critical | **Resolved** | Shipped executable CLI imports owner; owner creates production runtime and invokes `evaluateGate`; both extracted CLI subprocess tracers pass. |
| W1 | warning | **Resolved** | README publishes the exact closed bridge/owner schemas, lifecycle, typed errors, credential/version ownership, and optional best-effort cancellation consistent with code. |

**Exact final repair closure:** 2 resolved, 0 partially resolved, 0 residual.

All nine findings from re-verification 1 and both additional tracer-discovered identity/output defects remain independently closed.

## 8. Fresh Test Evidence Reviewed

No tests were rerun in this read-only reality assessment. I consumed the fresh sequential test report and inspected whether its assertions exercise the claimed source paths.

| Scope | Result | Reality interpretation |
|---|---:|---|
| `make validate` | exit 0 | Mandatory repository validation passed. |
| Platform-independent suite | 297/297 | Includes production-owner guard, CLI tracers, package/runtime, security, evidence, and topology. |
| Gate evaluator | 7/7 | Durable evidence equality, identity separation, retry/arbitration, denylist, and fail-closure. |
| Non-overlapping aggregate | 304/304 | 297 Node plus 7 shell gate scenarios; `make validate` is not double-counted. |
| Extracted Cursor CLI tracer | passed | Public CLI/owner with unavailable default and exact-native bridge path. |
| Extracted Codex CLI tracer | passed | Public CLI/owner through managed process adapter and durable decision. |
| CLI packaging/mode | passed | Present in every archive and extracted as `0755`. |
| Strict parity | `E_SOURCE_DIRTY` | Correct refusal on dirty checkout; no clean-release claim. |
| Diagnostic parity | 166/0, 113/0, 466/0 | Zero unresolved content differences; diagnostic only. |

Every recorded long-running process completed naturally; none was interrupted or killed.

## 9. Deployment Decision

The implementation now has the missing operable product edge and the public contract needed to integrate it safely. The archive contains an executable CLI, a closed owner, the installed-state runtime, and all dependencies. Extracted subprocess tests prove both a typed unavailable path and successful exact-native/managed-Codex paths through durable gate decisions. The two final residual findings are closed, and no new functional reality gap was found.

**Final decision: GO for Phase 11 completion and progression to the next workflow phase.** Release publication still requires strict parity from a clean checkout, and target-native support publication still requires current passed E5/E6 evidence for the exact bridge/host/version.

## 10. Structured Result

```yaml
status: passed
decision: go
reverification: 3
report_path: .maister/tasks/development/2026-07-17-unify-agent-projections/verification/reality-check.md
issue_counts:
  critical: 0
  warning: 0
  info: 0
final_fix_closure:
  resolved: 2
  partial: 0
  residual: 0
  issues:
    - id: C1
      outcome: resolved
      evidence: shipped_cli_to_owner_to_runtime_to_evaluate_gate_and_extracted_subprocess_tracers
    - id: W1
      outcome: resolved
      evidence: exact_public_v1_bridge_contract_and_optional_best_effort_cancel
prior_closure_reconfirmed:
  reverification_1_findings: {resolved: 9, residual: 0}
  tracer_identity_output_bugs: {resolved: 2, residual: 0}
tests_reviewed:
  mandatory_validation: {exit_code: 0}
  platform_independent: {passed: 297, failed: 0}
  gate_evaluator: {passed: 7, failed: 0}
  non_overlapping_total: {passed: 304, failed: 0}
  extracted_cli_tracers:
    cursor_exact_native: passed
    codex_managed_exec: passed
package:
  cli_included_all_targets: true
  owner_included_all_targets: true
  extracted_cli_mode: "0755"
call_graph:
  shipped_cli_to_owner_to_runtime_to_evaluate_gate: passed
fail_closed:
  missing_bridge_blocks_gate: true
  alternate_fallback: false
parity:
  strict_current_checkout: {outcome: E_SOURCE_DIRTY, release_proof: false}
  diagnostic:
    release_proof: false
    codex: {expected: 166, unresolved: 0}
    cursor: {expected: 113, unresolved: 0}
    kiro_cli: {expected: 466, unresolved: 0}
release_conditions:
  - strict parity must pass from a clean checkout or release commit
  - native support requires current passed E5/E6 for the exact bridge, host, and version
```
