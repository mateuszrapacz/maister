# Specification Audit: Platform-independent Maister distribution

## TL;DR

The specification is **Mostly Compliant** as a pre-implementation contract: all 17 stated requirements map to the confirmed research decisions, current-state gaps, and measurable migration exit criteria.
There are no critical or high-severity specification defects; two medium clarifications remain around the exact installer/receipt contract and the versioned overlay schema.
The repository is still in the intentional legacy state, so missing common/overlay/installer code is an expected implementation gap, not an audit failure.
The specification is actionable for planning, provided the remaining contract details are frozen before implementation starts.

## Key Decisions

- Treat the audit as a pre-implementation specification audit — the task is expected to have legacy code until Phase 8.
- Classify missing implementation as expected rather than non-compliant — `spec.md` explicitly defines migration, parity, rollback, and deletion exit criteria.
- Classify exact CLI/schema details as medium clarification items — they affect implementability but do not contradict the accepted architecture.

## Open Questions / Risks

- The exact command surface, receipt/journal locations, schema versions, and machine-readable exit/error contract are not frozen in `spec.md`.
- Overlay v1 names required categories but does not yet provide a field-by-field schema or a complete Codex/Cursor/Kiro inventory.
- GitHub source resolution needs explicit authentication, offline, shallow-clone, and missing-ref behavior before implementation.
- The specification HTML companion is a condensed visual representation; it should be kept synchronized if the Markdown specification changes.

## Summary

- **Compliance status**: Mostly Compliant
- **Requirements checked**: 17
- **Requirements mapped**: 17
- **Critical findings**: 0
- **High findings**: 0
- **Medium findings**: 2
- **Low findings**: 2
- **Audit mode**: Pre-implementation contract audit

## Audit Basis

The audit compared `implementation/spec.md` and its HTML companion with `analysis/requirements.md`, `analysis/codebase-analysis.md`, `analysis/gap-analysis.md`, the research handoff, and the project documentation indexed by `.maister/docs/INDEX.md`. The repository was independently inspected at the existing runtime, builder, installer, test, Make, CI, and documentation paths. The audit report was completed locally after the delegated auditor remained unavailable; no specification or implementation files were changed during the inspection.

## Requirement Coverage

| Requirement group | Spec coverage | Evidence / assessment |
| --- | --- | --- |
| R1-R3: common source, overlays, portable runtime | Pass | `spec.md` Core Requirements 1-3 and Technical Approach; the five byte-identical runtime modules are identified in `spec.md` Reusable Components. |
| R4: immutable source/ref provenance | Pass with clarification | Core Requirement 4 and the receipt requirement cover requested ref, resolved commit, source/overlay/host versions, and hashes. Exact resolver CLI/error behavior remains open. |
| R5-R8: lifecycle, staging, transaction, receipt | Pass with clarification | Core Requirements 5-8, Rollback Plan, and deletion criteria cover install/update/status/uninstall/rollback/recovery, validation-before-mutation, journals, receipts, and exact restoration. Exact command and schema contracts are not yet frozen. |
| R9-R10: settings ownership and drift | Pass | Hybrid ownership, managed keys, conflict detection, preservation, and refusal of unsafe destructive changes are explicit in Core Requirements 9-10 and Rollback Plan. |
| R11-R13: capability compatibility and evidence freshness | Pass with clarification | Compatibility and Evidence Policy defines E1-E6, fail-closed semantics, unavailable outcomes, provenance, and expiry. Overlay field-level evidence schema is still to be frozen. |
| R14: test topology | Pass | Implementation Guidance defines six focused groups, 2-8 tests per group, core-once coverage, and per-host seam coverage. |
| R15-R16: parity and deletion | Pass | Legacy Deletion Exit Criteria require baseline inventory, zero unresolved differences, failure evidence, rewired paths, and removal of Claude/generated infrastructure. |
| R17: documentation and release migration | Pass | Core Requirement 17, Standards Compliance, and deletion criteria require README, docs, standards, Make, CI, release, and support-matrix alignment. |

## Current-State Verification

The following are intentional pre-implementation gaps that the specification correctly covers:

- No neutral `common/`, versioned host-overlay schema, shared installer, receipt, journal, or evidence schema currently exists; this is the stated work boundary in `spec.md` Core Requirements 1-8 and New Components Required.
- `platforms/cursor/smoke-install.sh`, `platforms/kiro-cli/smoke-install.sh`, and `platforms/codex-cli/smoke-install.sh` remain host-specific and unsafe compared with the target lifecycle; `spec.md` Rollback Plan and Success Criteria explicitly require their replacement.
- `plugins/maister-cursor/`, `plugins/maister-kiro/`, and `plugins/maister-codex/` remain generated projections; `spec.md` Legacy Deletion Exit Criteria treats them as shadow oracles until parity passes.
- `Makefile`, `.github/workflows/validate-generated-variants.yml`, capability records, README, support docs, and project standards still describe the legacy four-host/generated-tree workflow; `spec.md` Core Requirement 17 and deletion criteria explicitly include their migration.
- Native Cursor/Kiro evidence is unavailable in the current environment; `spec.md` defines `unavailable` as distinct from `passed` and requires it to remain visible.

## Important Gaps

### Medium — Installer command and receipt contract needs one implementation-time freeze

- **Specification reference**: Core Requirements 4-8, Rollback Plan, Success Criteria.
- **Evidence**: The specification requires install, update, status/verify, uninstall, rollback, recovery, source/ref provenance, receipts, journals, and machine-safe ownership, but does not name the exact command syntax, receipt/journal paths, schema versions, active-receipt pointer, or exit/error protocol.
- **Category**: Ambiguous implementation contract.
- **Impact**: Different task groups could implement incompatible lifecycle interfaces or make recovery tooling unable to discover state.
- **Recommendation**: Freeze the CLI command matrix, receipt/journal schema versions and locations, state transitions, and machine-readable error/exit contract in the implementation plan before Phase 8.

### Medium — Overlay v1 schema and per-host inventory need field-level acceptance criteria

- **Specification reference**: Core Requirements 2, 6, 11-13; Compatibility and Evidence Policy.
- **Evidence**: The specification names discovery roots, native inventories, bindings, settings ownership, capability records, forbidden vocabulary, expiry, and required evidence, but does not enumerate the exact required/optional fields or the complete initial Codex/Cursor/Kiro inventory.
- **Category**: Incomplete acceptance detail.
- **Impact**: An overlay could satisfy the prose while omitting a native asset, binding, or safety-relevant path.
- **Recommendation**: Define schema field allowlists, required inventories, collision rules, and one contract fixture per target before materializer implementation.

## Minor Discrepancies

### Low — Source resolver edge behavior is named but not acceptance-tested

`analysis/requirements.md` names authentication, offline mode, shallow clones, missing refs, and temporary cleanup as technical considerations, while `spec.md` requires immutable local/GitHub provenance without enumerating those edge-case outcomes. Add focused resolver scenarios to the implementation plan.

### Low — Performance and scale thresholds are intentionally absent

The specification defines correctness, safety, determinism, and evidence criteria but no installation-size or timing thresholds. This is acceptable for the current migration, but a later plan may add bounded performance checks if repository size or host startup time makes them material.

## Clarification Needed

These are implementation-time contract details, not unresolved architectural choices:

1. What exact installer commands and flags expose target, scope, source/ref, offline mode, status, rollback, and recovery?
2. Where do receipt, journal, backup, and active-receipt files live for each target and scope?
3. What are the versioned overlay schema fields, required inventories, and initial native asset manifests for Codex, Cursor, and Kiro CLI?
4. What machine-readable exit codes and JSON error/evidence format do lifecycle commands expose?

The accepted Phase 2 decisions already resolve the architecture, settings ownership, evidence policy, freshness policy, documentation boundary, and supported target set; these questions should not reopen those decisions.

## Recommendations

- Add the four contract details above to `implementation/implementation-plan.md` before implementation approval.
- Make the plan create one overlay schema fixture and one receipt/journal fixture per target before the materializer and installer workers start.
- Keep the existing byte-exact transaction tests as the baseline for installer failure injection, extending assertions to receipts, journals, settings keys, and topology.
- Preserve the explicit `unavailable` outcome in all capability and release summaries.
- Run the final negative topology check after docs/CI/release migration and before deleting the legacy oracle.

## Audit Conclusion

The specification is ready for planning and independent implementation review. It has no critical or high-severity defect, and it correctly describes the current repository as a migration starting point. Phase 7 should resolve the medium contract details before the protected implementation approval gate is presented.
