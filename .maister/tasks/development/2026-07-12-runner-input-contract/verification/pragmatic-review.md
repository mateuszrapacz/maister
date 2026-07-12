# Pragmatic Code-Quality Review

## Structured status

| Field | Result |
|---|---|
| Status | **PASS** |
| Scope verdict | Proportionate to the approved specification; no speculative complexity identified |
| Complexity | Medium, justified by the strict dependency-free input/state boundary and recovery requirements |
| Critical issues | 0 |
| High issues | 0 |
| Medium issues | 0 |
| Low issues | 0 |
| Total issues | 0 |

## Summary

The fixes close the prior `__proto__` allowlist bypass without expanding the design. `JsonParser.parseObject()` now installs parsed keys with `Object.defineProperty`, so `__proto__` is treated as an enumerable own key and is rejected by the exact payload allowlist before state or report mutation. The regression matrix explicitly covers an unknown `__proto__` field and preserves file immutability on rejection.

The implementation remains pragmatic for this repository and the approved scope. The runner’s size is driven by explicit requirements for duplicate-key-aware JSON parsing, fail-closed canonical YAML validation, atomic persistence, deterministic report regeneration, denylist/idempotency behavior, and exact-once transition recovery. The change adds no runtime dependency, general-purpose YAML library, compatibility shim, speculative abstraction, or unrelated infrastructure.

The repeated generated runners and documentation are required by the repository’s source-of-truth/build pipeline. The test-only failure-injection seam is scoped to the approved recovery tests and is disabled unless explicitly requested.

## Prior issue re-check

### Closed — `__proto__` payload key no longer bypasses the allowlist

Evidence:

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:93-98` defines every parsed object key as an own enumerable property, including `__proto__`.
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:209-213` checks own enumerable keys against the exact allowlist before required-field validation or state reads.
- `tests/phase-continue-contract.test.sh:68` creates the adversarial `unknown-proto` payload, and `:226-237` asserts it exits non-zero with unchanged state/reports.
- The same fix is present in all six runner paths; their SHA-256 checksums match.

No broader parser redesign is warranted. The local property-definition fix directly addresses the language-level edge case while preserving the dependency-free parser and the existing contract.

## Scope and developer-experience assessment

- Complexity is contained in the runner and its behavior-focused contract harness; it maps directly to the requirements rather than future extensibility.
- The six-runner matrix is proportionate to the project’s multi-platform generated-artifact model and prevents source/variant drift.
- The validation path is discoverable through `make validate`, with syntax, contract, platform, and whitespace checks wired into the normal quality gate.
- No simplification or scope reduction is recommended.

## Verification evidence

- `make validate`: passed.
- Gate-decision checks: 28/28 passed.
- Phase-continuation contract matrix: 21/21 cases passed for each of 6 runners, 126/126 total.
- `node --check`: passed for all 6 runners.
- Platform validation: Copilot, Cursor, Kiro, Kilo, and Codex checks passed.
- `git diff --check`: passed.

## Recommendation

Approve the pragmatic scope. The previous issue is closed, and no remaining pragmatic-quality issues require changes.
