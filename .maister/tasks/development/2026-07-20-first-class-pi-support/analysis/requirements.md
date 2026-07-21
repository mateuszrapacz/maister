# Phase 5: Requirements

## TL;DR
Implement Pi as a fourth first-class Maister target through one generated user-scope package, preserving canonical source ownership and the existing transactional/runtime/evidence boundaries.
The v1 host tuple is Pi 0.80.10, Node 25.9.0, `pi-subagents` 0.35.1, and public delegation protocol v1; unsupported or missing prerequisites fail closed.
All 28 canonical agents and every canonical command/skill entry require an explicit, validated Pi origin. The package owns one private tree and one identity-aware settings member.
Structural and transactional support may be provisional; native E5 and semantic E6 support remain unavailable until the approved full delegation lifecycle is evidenced.

## Key Decisions
- Add `pi` with adapter identity `pi.native` and current-state all-target admission — Pi is a first-class target, not an alias or unmanaged sidecar.
- Generate one deterministic package under `~/.pi/agent/maister/` — canonical behavior remains in Maister and the external `pi-subagents` installation remains operator-owned.
- Use hybrid semantic projection — skills for reusable workflows, prompts for textual commands, and a minimal extension for imperative registration/delegation.
- Add normalized identity-aware ownership for one `packages[]` entry — preserve unrelated members and representation, refuse ambiguity, drift, and duplicates.
- Require full public delegation v1 lifecycle evidence for E6 — exact identity, updates, cancellation, bounded failures, process loss, and durable hash-chained events are mandatory.

## Open Questions / Risks
- Pi package-agent discovery for all 28 namespaced roles must be proven against the final generated package and precedence/collision conditions.
- Public foreground delegation has no replay/resume contract; process loss after `started` must become a typed terminal failure.
- Additive schema evolution must be validated carefully; a semantic closure failure requires an explicit version bump rather than permissive parsing.
- The current repository's three-target assumptions must be rewritten into current-state all-target admission without deleting useful target-independent assertions.

## Confirmed Requirements Q&A

### REQ-001 — Users and journey

**Assumption:** Primary users are Maister maintainers, installers, and workflow operators. Pi users discover the generated package through Pi's skills, prompts, extension, and namespaced agent surfaces while retaining existing Maister workflow semantics.

**Answer:** Confirmed assumptions.

**Implication:** User-facing package names, command origins, agent identities, install receipts, evidence statuses, and failure messages must be explicit and auditable.

### REQ-002 — Existing code reuse

**Assumption:** Reuse target registry, overlays, materializer, transaction/receipt/recovery, runtime-event, evidence, packaging, and test seams; do not create parallel Pi lifecycles.

**Answer:** Confirmed assumptions.

**Implication:** Every new module needs a concrete caller in an existing lifecycle and must participate in the same staging, provenance, receipt, rollback, and validation boundaries.

### REQ-003 — Visual assets

**Assumption:** This is non-UI work with no visual assets or browser product surface; Phase 4 and browser E2E remain skipped.

**Answer:** Confirmed assumptions.

**Implication:** No design context is created and no visual fidelity or browser endpoint is required; CLI/package/runtime evidence is authoritative.

### REQ-004 — Compatibility baseline

**Assumption:** v1 compatibility is bound to Pi 0.80.10, Node 25.9.0, `pi-subagents` 0.35.1, delegation v1, one generated package, all 28 roles, and current-state four-target admission.

**Answer:** Confirmed assumptions.

**Implication:** Executable realpath/version and public prerequisite identity must be resolved at evidence and lifecycle boundaries; mismatches return typed unavailable results.

### REQ-005 — Release and scope

**Assumption:** Structural and transactional Pi artifacts may be packaged provisionally, but native E5 and semantic E6 support cannot be claimed until the full approved delegation lifecycle and evidence scenarios pass. Unrelated worktree changes are out of scope.

**Answer:** Confirmed assumptions.

**Implication:** Release metadata must distinguish package/lifecycle readiness from native/semantic support and preserve unrelated user changes.

## Functional Requirements Summary

1. Register `pi` as a supported target with `pi.native`, a versioned Pi overlay, closed semantic bindings, managed roots, host probes, and required/forbidden topology.
2. Generate a deterministic private package at `~/.pi/agent/maister/` containing the Pi manifest, extension bridge, projected skills, prompts, 28 namespaced agent descriptors, projection metadata, and validated portable runtime closure.
3. Keep canonical Maister skills, commands, common runtime, and 28 agent Markdown files as the only behavior owners; generated Pi artifacts must be derived during materialization.
4. Maintain a closed command/skill mapping in the overlay that assigns every canonical entry exactly once to a Pi skill, prompt, or minimal extension origin.
5. Reject missing, duplicate, unsafe, shadowed, or unmappable command and agent origins before package publication.
6. Add `managed_array_entries` ownership for exactly one normalized local package identity in Pi `settings.json`, supporting string and object forms without claiming the whole array.
7. Preserve unrelated settings entries, object fields, array order, bytes, modes, and topology; fail closed on malformed settings, duplicate identities, incompatible representations, drift, or ambiguous matches.
8. Thread the new ownership kind through transaction preflight, staging, commit, verification, receipts, journals, update, uninstall, rollback, crash recovery, and injected-failure tests.
9. Implement `pi.native` over only the public `pi-subagents/delegation` v1 contract; do not deep-import private APIs, reimplement child processes, or silently fall back to another host/agent.
10. Preserve the three-method runtime port: exact `resolveAgent`, bounded `dispatchAgent`, and Maister-owned `readExecutionEventStream`.
11. Append the planned start event before side effects, subscribe before request emission, bind `requestId` to `dispatch_id`, sanitize/bound updates, verify terminal observed identity, and append typed terminal outcomes.
12. Represent unknown role, wrong identity, malformed event, timeout, cancellation, budget, process loss, prerequisite absence, and durable-write failure as typed fail-closed results.
13. Add Pi E1-E6 probes, fixtures, scenarios, and evidence provenance bound to executable realpath/version, Node, `pi-subagents`, overlay/projection bytes, source commit, and scenario version.
14. Permit structural/transactional packaging and installation with E5/E6 unavailable, but never convert unavailable evidence into a pass or support claim.
15. Replace active historical three-target parity release gating with current all-target admission; preserve any retained historical comparison only as explicitly non-gating context.
16. Extend Make, CI, archive, checksum, SBOM, provenance, extracted lifecycle, topology, target registry, projection, installer, runtime, event, evidence, and release tests for Pi.
17. Keep Pi auth, sessions, trust, active executable, unrelated packages, and external `pi-subagents` installation operator-owned.

## Reuse Opportunities

- `targets.mjs` and overlay loader schemas for target registration and closed validation.
- `agent-manifest.mjs`, `agent-projector.mjs`, and `materializer.mjs` for canonical role projection and deterministic staging.
- `settings-owner.mjs`, `transaction-manager.mjs`, receipt/journal schemas, and `recovery.mjs` for lifecycle safety.
- Production runtime owner, exact-native adapter, resolver, and execution-event writer for exact dispatch and durable event semantics.
- Evidence policy/probe helpers, release interface, Make/CI loops, and platform-independent behavior suites for target closure.

## Scope Boundaries

Included: Pi registry/overlay, complete projection, package generation, one settings-array ownership primitive, lifecycle integration, public delegation bridge, durable events, E1-E6 evidence, current-state admission, packaging, release, CI, tests, and operator-facing support status.

Excluded: rewriting Pi or `pi-subagents`; bundling `pi-subagents`; private Pi RPC/async internals; durable Pi-native replay/resume beyond typed process-loss failure; browser/UI implementation; unrelated host changes; automatic installation or removal of operator-owned prerequisites; and changes to unrelated worktree files.

## Technical Considerations

- Use the researched active baseline and resolve the actual executable realpath before trusting version evidence.
- Keep public delegation imports shallow and version-bound; a missing public export is unavailable, not permission to deep-import internals.
- Use additive schema changes where existing validators remain semantically closed; version contracts when they do not.
- Preserve all filesystem bytes, modes, symlinks, existence, and topology across transactional rejection and rollback tests.
- Keep native event updates bounded and sanitized; retain hashes, byte counts, and diagnostic tails without exposing secrets.
- Do not claim native support from package inspection or a single successful dispatch; E5/E6 are scenario- and provenance-bound.
