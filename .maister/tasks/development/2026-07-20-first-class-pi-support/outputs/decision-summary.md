# Decision Summary — First-class Pi support

## Decision

Complete the approved implementation workflow. The implementation is accepted for the full public Pi delegation v1 lifecycle. A fresh bound E1-E6 manifest promotes the release claim to `pi.native-semantic`; the explicit provisional path remains available when a host cannot provide E5/E6.

## Delivered scope

- Pi is a registered fourth target alongside Codex, Cursor, and Kiro CLI.
- All 28 canonical roles, the hybrid command projection, skills, prompts, extension source, and package metadata are projected deterministically into a closed Pi package.
- Maister owns only `~/.pi/agent/maister/**` and one identity-managed `packages[]` entry while preserving operator-owned settings, packages, auth, trust, sessions, and external prerequisites.
- Install, update, verify, rollback, recover, and uninstall use the existing receipt/journal/backup transaction lifecycle.
- The runtime uses only the public `pi-subagents/delegation` v1 boundary, exact `maister:<role>` identities, bounded requests, cancellation, process-loss handling, retry links, session identity, and durable redacted hash-chained observations.
- Current-target admission covers exactly `[codex, cursor, kiro-cli, pi]`, consumes validated Pi E1–E6 evidence records, and now supports the full `pi.native-semantic` promotion path.

## Verification

- `make validate`: passed.
- `make test-pi`: 26 passed, 0 failed.
- `make test-evidence`: 45 passed, 0 failed.
- `make test-runtime` and `make test-core`: passed; the installer aggregate stayed under its watchdog.
- Pi integrated lifecycle: 7 passed, 0 failed.
- Release/archive/current admission/topology checks: passed.
- `git diff --check` and affected-module syntax checks: passed.

The audit remediation loop closed the settings rename race, durable secret/session redaction, working-root propagation, tilde identity, exact public event values, session/disposal lifecycle, request bounds, retry provenance, evidence binding, packaged E3 projection binding, and native Pi loader/package-discovery issues.

## Explicit limitation

The pinned native tuple is Pi `0.80.10`, Node `25.9.0`, pi-subagents `0.35.1`, protocol v1. The fresh real-host probe passed E5 and E6: all 28 `maister:<role>` package identities were observed, and code-reviewer, implementation-planner, and advisor completed the public v1 lifecycle with durable ordered observations. The full admission label is `pi.native-semantic` when those records are combined with the passed E1-E4 manifest.

## Handoff

No further implementation work is required for the approved scope. Renew the 14-day E5/E6 records before release publication and use the full E1-E6 manifest to select `pi.native-semantic`; if the tuple is unavailable, the admission code safely falls back to the explicit provisional label.
