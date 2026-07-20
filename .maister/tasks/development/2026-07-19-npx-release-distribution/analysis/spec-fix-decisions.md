# Specification Audit Resolved-Remediation Record

## TL;DR

All two blocking and three important findings from the first Phase 6 audit are resolved.
The independent re-audit verdict is **PASS** with **0 blocking, 0 important, and 0 advisory findings**.
No critical or important decision remains, and implementation planning is no longer blocked by specification quality.
This file is a closure record; it contains no stale `decisions_needed` work.

## Key Decisions

- Use a prepare-generated, package-carried resolved-commit manifest for runtime materialization identity and protected CI for literal exact-selector proof; never infer selector identity from ambient npm/cache metadata.
- Require real anonymous E2E against the currently public canonical repository now, hermetic private credential/API behavior now, and protected authenticated real private E2E against the same canonical repository when visibility changes.
- Use one 15-second pre-header deadline per fetch attempt across DNS, TCP, TLS, proxy negotiation, and headers, composed with fresh redirect/retry clocks and non-resetting idle/resource/aggregate bounds.
- Preserve exact R-001–R-038 ID, priority, and decoded acceptance-text parity across both Markdown artifacts and HTML, enforced by an automated drift gate.
- Preserve GitHub Release archives as payload authority and `plugins/maister/bin/maister-install.mjs` as sole host/state mutation authority.

## Resolved Remediation

| Original finding | Adopted remediation | Re-audit status |
|---|---|---|
| B-001 acquisition identity | Fixed non-shell `prepare` producer writes a closed, restricted, atomic checkout-commit manifest. Runtime compares it across the complete candidate identity; protected CI separately resolves and invokes literal exact tag/full-commit selectors. Ambient npm variables, cache topology, URLs, and caller overrides are forbidden as authority. | **Resolved** |
| B-002 public/private smoke contradiction | Current canonical public repository receives real anonymous Git/Release E2E. Private behavior is hermetic now. A normative migration checklist blocks a visibility change or later release until authenticated exact-ref Git/private Release E2E and all credential, no-leak, and identity evidence pass against the same canonical repository. No second repository is required. | **Resolved** |
| I-001 lossy HTML twin | HTML now contains all 38 exact normative rows. Mechanical comparison confirms ordered IDs, `Must` priority, and decoded acceptance text are exactly equal to both Markdown sources. | **Resolved** |
| I-002 undefined connection timing | One 15-second per-fetch pre-header clock now covers DNS/TCP/TLS/proxy/headers; redirect/retry attempts get fresh clocks without resetting resource or aggregate walls; body idle, timeout typing, retry eligibility, abort, and cleanup are explicit. | **Resolved** |
| I-003 stale active workflow authority | Active state is technically clarified and summarizes exact Git refs, API assets, GitHub-only release, zero registry mutation, current public E2E, and future private activation. Superseded registry advice is historical/labeled. | **Resolved** |

## Closure Evidence

- Re-audit verdict: **PASS**.
- Findings: blocking **0**, important **0**, advisory **0**.
- `decisions_needed`: **0**.
- Canonical repository visibility verified live through an unauthenticated GitHub API request: public, active, and unarchived.
- Requirement parser result: 38/38/38 rows; ordered R-001–R-038; byte-identical Markdown triples; exact decoded HTML triples; `Must` only.
- Original security, authority, transaction, archive, recovery, cleanup, release, no-registry, and cross-platform requirements re-audited without regression.
- No production code, tests, requirements, technical clarifications, specification, HTML, workflow state, or user documentation changed during re-audit.

## decisions_needed

### critical

None.

### important

None.
