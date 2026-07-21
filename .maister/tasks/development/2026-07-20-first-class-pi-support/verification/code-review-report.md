# Code Review — Final

## Decision

**PASS for the complete approved Pi scope.** No Critical or High finding remains after the remediation loop. The fresh pinned-host run now supplies the required E5/E6 evidence; admission remains fail-closed for other host tuples.

## Scope reviewed

The review covered the Pi target/overlay, canonical projection and materializer, managed-array settings ownership, transaction/recovery paths, public delegation adapter and ExtensionAPI bridge, durable observations, evidence schema/admission, release packaging, Make/CI gates, and the integrated acceptance suite.

## Findings resolved

- Settings writes now compare expected existence, SHA-256, and mode immediately before atomic rename. An operator edit at that boundary returns typed `E_DRIFT_CONFLICT` with `reason: concurrent_write` and is preserved.
- Durable observation sanitization redacts `auth`, `authentication`, `session`, credentials, headers, cookies, transcripts, quoted assignments, and whitespace-containing secret values. Depth, cycles, and byte limits remain bounded.
- The common prepared native task now carries the verified absolute `working_root`; Pi rejects a missing or relative root instead of falling back to the process directory.
- Managed-array identity expands `~` against the supplied user home and preserves the operator’s original string/object representation.
- Pi discovery and runtime both validate the exact public delegation event-channel values and protocol v1.
- Extension disposal is idempotent, removes the lifecycle listener, and awaits adapter shutdown so active dispatches receive one terminal process-loss outcome.
- Timeout and raw command-argument limits are rejected before request emission/parsing; over-limit values are not silently clamped.
- Retry plans and observation streams carry and validate `retry_of`; the ExtensionContext session ID is obtained from `sessionManager.getSessionId()` and recorded in the durable event payload.
- Evidence records now have deterministic IDs, envelope identity, artifact hashes, projection binding, conditional reason/remediation, expiry, and source/overlay/package/projection provenance. Current-target admission consumes a validated Pi E1–E6 manifest instead of asserting an unbound native claim.
- E3 portable-core evidence now carries the same projection binding as E1/E2/E4, including in extracted release archives.
- Pi-focused tests are exposed through `make test-pi` and run in the validation workflow.

## Remaining boundary

The pinned host tuple is Pi `0.80.10`, Node `25.9.0`, pi-subagents `0.35.1`, delegation protocol v1. The fresh host probe passes E5 and E6 through the public package/export and runtime boundaries. No private import, bundled prerequisite, or unbound native claim was introduced.

## Verification evidence

- `make validate` completed successfully after the final workflow-expectation corrections.
- `make test-pi`: 26 passed, 0 failed.
- `make test-evidence`: 45 passed, 0 failed.
- `make test-runtime`: passed, including the shell gate evaluator.
- `make test-core`: passed under the installer watchdog.
- Pi integration: 7 passed, 0 failed.
- Release/current-admission/topology suite: all component tests passed; archive lifecycle covers all four registered targets.
- `git diff --check` and affected-module syntax checks passed.

## Final verdict

The implementation is ready for the explicitly labelled `pi.native-semantic` release boundary when the complete E1-E6 manifest is current. The evidence is host-bound and expires; the provisional label remains the only valid fallback when both E5 and E6 are unavailable.
