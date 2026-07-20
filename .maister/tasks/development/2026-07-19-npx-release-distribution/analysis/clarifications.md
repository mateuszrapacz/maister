# Phase 1 Clarifications

## TL;DR

The recommended offline lifecycle behavior is confirmed. State-only commands must locate and invoke the matching installed Maister lifecycle authority without GitHub access, while install and update download and verify a target-specific release archive before delegating to the transactional installer.

## Key Decisions

- Keep state-only commands offline — users must be able to inspect or manage an existing installation when GitHub is unavailable.
- Download and verify archives only for install/update — network and untrusted archive handling remain outside the existing host-state mutation boundary.
- Preserve one mutation authority — the npx launcher must not write targets, settings, receipts, journals, locks, backups, or recovery state.

## Open Questions / Risks

- The implementation must define a safe, version-matched locator for the installed lifecycle authority without bundling a second installer.
- Offline command behavior needs dedicated tests proving no network request and faithful installer result forwarding.

## Resolved assumption

**Question:** I assume state-only npx commands must work without GitHub access by locating and invoking the matching installed Maister lifecycle authority, while install/update download and verify a release archive. Is that correct?

**Answer:** Confirm assumptions.

The user instructed the workflow to proceed with the recommendations, which is recorded as confirmation of this assumption.
