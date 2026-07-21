# Implementation Log

## TL;DR

The approved seven-group Pi implementation is complete. Pi is now a first-class registered target with deterministic package projection/materialization, identity-aware `packages[]` ownership, transactional lifecycle support, a public `pi-subagents/delegation` v1 bridge, durable observation events, version-bound evidence, and current four-target release admission.

The pinned host run now passes E5 and E6 through the real Pi public delegation boundary. Release admission promotes a complete, fresh E1-E6 manifest to `pi.native-semantic`; hosts without the native tuple still fail closed into the explicit provisional path. The implementation never claims native or semantic support from package inspection alone.

## Key Decisions

- Pi uses the existing target, overlay, materializer, transaction, runtime, evidence, packaging, and release seams.
- The generated Pi package contains the closed canonical projection: 28 namespaced agents, 14 commands, 29 skill directories, prompts, extension source, and package metadata.
- Maister owns only `~/.pi/agent/maister/**` plus one identity-managed `packages[]` member; unrelated settings, packages, auth, trust, sessions, and external `pi-subagents` remain operator-owned.
- The active historical three-target parity gate is replaced by `current-target-admission-v1` over `codex`, `cursor`, `kiro-cli`, and `pi`. Target-independent parity and archive-closure assertions remain.
- E6 requires the full public delegation v1 lifecycle. Process loss is a typed terminal failure, cancellation is explicit, retry uses a new request ID, and every observation stream is durable and hash chained.
- Archive sources use the same immutable source-binding contract as Git checkouts. The resolver now returns the same `archive-clean` status fingerprint on initial resolution and revalidation.

## Open Questions & Risks

- E5/E6 evidence is host-bound and expires after 14 days. The verified tuple is Pi `0.80.10`, Node `25.9.0`, pi-subagents `0.35.1`, and public delegation protocol v1; other tuples still fail closed.
- The implementation is version-bound to Pi `0.80.10`, Node `25.9.0`, pi-subagents `0.35.1`, and public delegation protocol v1. Other tuples fail closed as unavailable until separately evidenced.
- The long installer transaction aggregate is intentionally expensive (approximately 644 seconds) because it exercises the external watchdog and final-tree evidence across many crash/recovery scenarios.

## Group Results

### Group 1 — Register Pi and close the overlay contract

Registered `pi` with `pi.native`, POSIX path policy, pinned compatibility metadata, environment-derived roots, Pi overlay/inventory contracts, plugin-private ownership, managed-array settings ownership, origin inventories, forbidden topology, probes, and schema extensions.

Focused evidence: `rtk node --test tests/platform-independent/target-registry.test.mjs tests/platform-independent/overlay-contract.test.mjs` — 38 passed, 0 failed.

### Group 2 — Closed projection and deterministic materialization

Added the complete Pi-native agent projection, closed command projection, deterministic package manifest, canonical skills/prompts/agents, provenance, source-digest binding, and fail-closed collision/origin validation. The normative skill inventory was corrected to 29 directories.

Focused evidence: the target/overlay, agent projection, source materializer, Pi package projection suite — 97 passed, 0 failed.

### Group 3 — Managed-array ownership and transactional lifecycle

Added `managed_array_entries_v1` identity normalization with representation preservation, operator-field preservation, duplicate/conflict refusal, settings-path routing, receipt ownership, drift checks, backup/recovery validation, and full install/update/verify/rollback/recover/uninstall behavior.

Focused evidence: the combined lifecycle/settings suite — 102 passed, 0 failed. An independent six-operation lifecycle probe also passed.

### Group 4 — Public delegation bridge and durable observations

Added the direct public `pi-subagents/delegation` v1 adapter, exact `maister:<role>` identity, bounded request policy, export/protocol validation, typed status handling, cancellation, process-loss handling, session shutdown cleanup, the public `maister-delegate` extension command, and durable `maister-observation-v1` JSONL events with canonical redaction and hash chains.

Focused evidence: the runtime, adapter, event, resolver, composition, and projection suite — 100 passed, 0 failed.

### Group 5 — Version-bound probes and E1–E6 evidence

Added the Pi executable/package/Node/version/public-export probe, exact pinned tuple checks, typed unavailable reasons, digest/provenance requirements, expiry/renewal behavior, and evidence truth-table coverage. Missing Pi or pi-subagents never becomes a false positive.

Focused evidence: the E1–E6/evidence/probe/attestation suite — 38 passed, 0 failed. A fresh real-host probe on 2026-07-21 passed E5 and E6 for the pinned Pi tuple, discovering all 28 package agents and completing ordinary/planner/advisor public delegation with durable observations.

### Group 6 — Current four-target release admission

Replaced active historical three-target release gating with explicit current admission for `codex`, `cursor`, `kiro-cli`, and `pi`. Added archive closure checks, Pi external-prerequisite metadata, checksums/SBOM/provenance, graduated provisional/full E1–E6 claim handling, Make targets, and CI workflow coverage.

Focused evidence: current admission, Make interface, release package, and topology tests — 25 passed, 0 failed. `rtk make test-current-target-admission` passed for all four targets.

Parity disposition: old active parity gate removed; historical parity assertions are retained only as target-independent/contextual checks. The proving tests are `current-target-admission.test.mjs`, `release-package.test.mjs`, `repository-topology.test.mjs`, and the Make admission target.

### Group 7 — Integrated lifecycle and handoff

Added the integrated Pi acceptance suite covering deterministic materialization, absent/existing managed-array settings, update/rollback/uninstall preservation, drift and cooperating locks, injected failure recovery, explicit E5 unavailability, ordinary/advisor delegation lifecycle, cancellation, process loss, retry IDs, observation hash chains, archive extraction, and archive install/verify/uninstall.

Focused evidence: `rtk node --test tests/platform-independent/pi-integration.test.mjs` — 7 passed, 0 failed, 88.1 seconds. The archive scenario initially exposed an actual source-binding defect; `resolveArchive()` now returns `statusFingerprint: "archive-clean"` and `statusEntries: []`, matching revalidation.

The external installer transaction aggregate also passed 1/1 after approximately 644 seconds.

## Standards Applied

- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/global/coding-style.md`
- `.maister/docs/standards/global/conventions.md`
- `.maister/docs/standards/global/error-handling.md`
- `.maister/docs/standards/global/minimal-implementation.md`
- `.maister/docs/standards/global/validation.md`
- `.maister/docs/standards/testing/test-writing.md`

## Implementation Scope

All changes stayed inside the approved seven-group scope and its integrated acceptance evidence. Unrelated dirty-worktree changes were preserved.

## Final verification and audit remediation — 2026-07-21

The independent review findings were resolved within the approved scope:

- Settings commits now re-check expected existence, content hash, and mode immediately before atomic rename; the operator edit remains intact on a concurrent-write conflict.
- Observation sanitization now fully redacts auth/session/transcript/credential values, including quoted and whitespace-containing assignments, with bounded depth, cycles, and payload size.
- Native task preparation carries the verified absolute working root; Pi request budgets reject over-limit values rather than clamping them.
- Managed-array tilde identity uses the supplied home root; public event constants, ExtensionContext session IDs, idempotent disposal, and retry provenance are all enforced.
- Evidence records have deterministic envelope IDs and artifact/projection bindings; current admission consumes the receipt-derived E1–E6 manifest; packaged E3 evidence carries the same projection binding as E1/E2/E4.
- `make test-pi` is a first-class CI/validation gate.

Final gates: `make validate` passed; `make test-pi` passed 26/26; `make test-evidence` passed 45/45; `make test-runtime` passed; Pi integration passed 7/7; release/archive/current-admission/topology components passed; syntax and `git diff --check` passed.

The fresh pinned-host probe passes E5 and E6. The admission implementation now publishes `pi.native-semantic` for a complete bound E1-E6 manifest and retains `pi.structural-transactional.provisional` for hosts where both native levels are explicitly unavailable. Detailed host evidence is recorded in `verification/pi-native-evidence.md`.
