# Phase 1: Clarifications

## TL;DR
The completed Pi research resolves the recommended architecture, but five high-impact boundaries still need explicit development-scope confirmation.
These confirmations determine whether the implementation is a current-state four-target admission or a migration-era parity extension, what Pi owns, and what evidence is required before support claims.
No source changes are authorized by this artifact.

## Key Decisions
- Carry the accepted research choices into development as the starting recommendation: generated local package, hybrid projection, public delegation v1, external `pi-subagents`, and identity-aware package membership.

## Open Questions / Risks
- The historical parity conflict can change the release and fixture deletion surface substantially.
- A broad first-class support claim without E5/E6 evidence would contradict the project's fail-closed evidence policy.

## Critical Clarifications for the Development Scope

1. **Admission policy:** Should Pi be implemented under the research ADR-005 recommendation of one current-state all-target admission matrix, while keeping the immutable three-target oracle only as explicitly historical context?
2. **Projection completeness:** Should v1 include all 28 canonical agent descriptors plus a reviewed one-to-one mapping for every canonical command/skill entry, with unmappable entries rejected rather than silently omitted?
3. **Host contract:** Should the first supported tuple be pinned to the researched active baseline (Pi 0.80.10, Node 25.9.0, `pi-subagents` 0.35.1, public delegation protocol v1), with other versions returning unavailable until separately evidenced?
4. **Ownership boundary:** Should Maister own only `~/.pi/agent/maister/**` and one identity-managed `packages[]` member, preserving all other settings, packages, auth, trust, sessions, and the external `pi-subagents` installation?
5. **Support claim:** Should structural/transactional packaging be allowed before native E5/E6, but the release remain explicitly provisional/unavailable for Pi native and semantic support until version-bound discovery and runtime evidence pass?

## Recommended Answers from Research

- Current-state all-target admission only; do not expand the historical parity oracle with a greenfield Pi target.
- Project all 28 roles and every canonical command exactly once through hybrid Pi-native representations, with closed validation for omissions, duplicates, and wrong origins.
- Bind the initial evidence tuple to Pi 0.80.10, Node 25.9.0, `pi-subagents` 0.35.1, and delegation v1; fail closed on mismatch.
- Manage one private generated package and exactly one identity-aware `packages[]` entry; leave operator-owned Pi state and `pi-subagents` untouched.
- Permit graduated structural/transactional claims only; E5/E6 remain unavailable/provisional until native discovery, identity, event, failure, cancellation, and role-specific scenarios pass.
