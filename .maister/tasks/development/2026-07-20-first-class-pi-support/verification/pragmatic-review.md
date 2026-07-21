# Pragmatic Review — Final

## Decision

**Accept for the complete Pi support boundary.** The implementation reuses the project’s existing registry, projection, materializer, transaction, receipt, runtime, evidence, and release seams. That breadth is proportionate to Pi’s operator-owned settings, rollback, provenance, and external-prerequisite requirements.

## What is appropriately scoped

- One generated Pi package is built from canonical Maister sources.
- Pi-specific behavior is isolated at the package/materializer, managed-array, native adapter, probe, and release boundaries.
- The external `pi-subagents` prerequisite is discovered and evidenced, never bundled.
- The current four-target admission gate replaces active historical parity gating while retaining target-independent topology/archive assertions.
- The graduated labels explicitly separate provisional package/transaction support from the fully evidenced `pi.native-semantic` claim.

## Remediation outcomes

The prior pragmatic blockers are closed: tilde identity uses the real home root; retry streams link through `retry_of`; ExtensionAPI binds the session ID; evidence admission consumes a validated current manifest; settings mutation has a pre-rename drift check; and the Pi-focused suites are now a discoverable `make test-pi` gate in CI.

The long installer aggregate remains intentional. It exercises full-tree hashing, crash points, settings ownership, rollback, and recovery. It is suitable for a watchdog-backed CI gate and not a short edit/test loop; the focused `test-pi` target provides the practical developer loop.

## Remaining trade-off

E5/E6 are fresh but host-bound: Pi `0.80.10`, Node `25.9.0`, pi-subagents `0.35.1`, and public delegation v1 must remain pinned and renewed. A different or changed tuple correctly falls back to unavailable/provisional rather than inheriting this claim.

## Verdict

No simplification is required before the approved scope is considered complete. Future work is limited to renewing the host-bound evidence before expiry and rerunning the same public lifecycle on any changed Pi tuple.
