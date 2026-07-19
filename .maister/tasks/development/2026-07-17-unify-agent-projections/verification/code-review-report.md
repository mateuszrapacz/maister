# Re-Verification 3 — Code, Standards, and Security Review

## TL;DR

**Verdict: NO-GO with one warning.** The owner/runtime design is focused, typed, shell-free, fail-closed, package-complete, and consistent with the published v1 bridge contract. The remaining defect is at the CLI's first trust boundary: it advertises a 1 MiB stdin bound but reads all stdin before enforcing it, and the read happens outside the `try` that guarantees a typed JSON envelope.

## Finding Counts

| Severity | Count |
|---|---:|
| Critical | 0 |
| Warning | 1 |
| Informational | 0 |

## Findings

### CODE-W1 — The production CLI does not actually bound stdin ingestion and can bypass its typed envelope

- **Severity:** Warning
- **Location:** `plugins/maister/bin/maister-agent-gate.mjs:19-22`
- **Standards/contract:** validation must reject bounded input at the boundary; errors should be typed and handled at the boundary; README lines 167 and 186 promise stdin bounded to 1 MiB and one typed stdout envelope.
- **Evidence:** `runCli({ input = fs.readFileSync(0), ... } = {})` evaluates `fs.readFileSync(0)` before entering the function body. The length check runs only after the entire stream is resident in memory. Consequently an arbitrarily large pipe can force unbounded allocation before rejection, and a stdin read error is thrown during default-parameter evaluation, before the `try/catch`, so stdout is not guaranteed to contain the documented typed failure envelope. The fresh suite has successful subprocess tracers, but no test exercises oversized or failed CLI stdin.
- **Impact:** A malformed or hostile local host integration can cause avoidable memory exhaustion at the production owner boundary. Read failures also violate the stable machine-readable CLI contract. This does not enable dispatch fallback or source mutation, but it contradicts an explicit final-fix security claim.
- **Recommendation:** Move stdin acquisition inside the `try` and read incrementally from `process.stdin`, rejecting as soon as cumulative bytes exceed `MAX_INPUT_BYTES` without concatenating the remainder. Keep injectable bytes/stream support for tests. Add a subprocess regression that sends more than 1 MiB and asserts exit `2` plus exactly one typed `E_AGENT_OWNER_INPUT` envelope; add a focused injected read-error test proving the same envelope contract. Do not shell out or silently truncate.

## Verified Strengths

- The production call graph is real and non-test-owned: CLI → `runProductionAgentGate` → `createProductionAgentRuntime()` → `evaluateGate()`.
- `production-runtime.mjs` has no projector/materializer import or invocation. It reconstructs expected projection metadata and validates receipt-owned installed bytes.
- Owner requests and bridge responses use closed field sets. Target, operation, task/state ownership, path shape, bridge identity, credentials/version ownership, and port functions are validated before dispatch.
- Bridge modules are explicitly selected, canonicalized existing regular files, imported through `pathToFileURL`, and never interpolated into a shell command. A missing/malformed bridge or prerequisite cannot switch target or enable inline/root/built-in fallback.
- Codex capability observations and exact-native inspect/launch observations use closed schemas with typed unavailable/unsupported/failure outcomes.
- Exact-native observed identity must equal the dispatch plan. Optional `cancel` is used only as best-effort compensation after a side effect when durable recording fails, matching documentation.
- Managed Codex execution pins working root, model, reasoning effort, sandbox, JSONL, output schema, last-message output, and ignored user defaults. Terminal identity/digest/nonce/session binding is validated before durable success.
- Byte-bound regressions for multibyte stdout/stderr and pre-read last-message size are present and green. Symlinked dispatch ancestors are rejected before outside writes.
- Codex E6 separates requested, accepted, and independently observed effective policy; request echo alone remains `unavailable`.
- Package validation requires the CLI/owner/runtime closure, tests executable mode, and invokes both Cursor and Codex tracers as subprocesses from extracted archives.
- Public owner/bridge documentation matches code, including exact factory/inspect/launch fields, plan/task shapes, explicit registration lifecycle, host-owned credentials/version discovery, typed failure semantics, and optional best-effort cancellation.
- Fresh sequential evidence is green at 304/304; `git diff --check` and syntax checks passed. Strict dirty-worktree parity correctly refuses with `E_SOURCE_DIRTY`.

## Verdict

**NO-GO.** Fix `CODE-W1` and rerun focused CLI/package/topology validation. No other standards, correctness, security, or maintainability issue was found in the reviewed final residual scope.

_Generated: 2026-07-19T10:46:00Z_
