# Research brief: npx-based Maister distribution

## TL;DR
The research will define a thin npm/npx launcher owned by `mateuszrapacz`.
GitHub Release archives remain the source of truth; the launcher downloads the selected host archive, verifies it, and delegates to the existing transactional installer.
The result should reduce installation to one command without weakening commit provenance, target isolation, rollback, or recovery.

## Key Decisions
- Use the `mateuszrapacz/maister` GitHub repository and a package published under the `mateuszrapacz` npm scope.
- Keep `maister-install.mjs` as the authoritative lifecycle implementation; the npx layer is a distribution adapter.

## Open Questions / Risks
- Whether the npm package should be named `@mateuszrapacz/maister` or use a separate `-cli` suffix.
- How `latest` and exact versions should map to GitHub Release tags and asset checksums.
- Current release sidecars are unsigned; checksum verification improves integrity but does not authenticate the publisher by itself.
- Existing Skillpanel branding and source examples must be separated from the new ownership model without changing legal attribution accidentally.

## Research question

How should Maister add an npx-based installer owned by `mateuszrapacz` that downloads the correct GitHub Release archive, verifies it, and invokes the existing target-aware installer without manual extraction while preserving provenance, reproducibility, rollback, recovery, and support for Codex, Cursor, and Kiro CLI?

## Research type

Mixed: technical codebase and release-flow analysis combined with requirements and best-practice analysis for npm distribution and artifact integrity.

## Scope

### Included

- Current source, overlay, packaging, release, and installer architecture.
- npm package and npx CLI boundary under the `mateuszrapacz` account.
- GitHub Release asset selection, versioning, checksum verification, and archive lifecycle.
- User-facing install, update, verify, status, uninstall, and target-selection commands.
- Security, provenance, cleanup, failure handling, and test/release requirements.
- Required metadata and documentation changes away from Skillpanel ownership.

### Excluded

- Implementing the npm wrapper or changing production code during this research.
- Replacing the existing transactional installer.
- Supporting hosts outside Codex, Cursor, and Kiro CLI.
- Changing legal copyright attribution without an explicit decision.

## Constraints

- The canonical GitHub repository and release owner is `mateuszrapacz/maister`.
- The npm package must be published under the `mateuszrapacz` account.
- GitHub Release archives remain the distribution source of truth.
- Existing installer receipts, journals, drift checks, rollback, and recovery remain authoritative.
- No manual extraction should be required from the user's perspective.
- Release output remains target-specific and reproducible.

## Success criteria

1. A recommended one-command UX is documented for exact and latest versions.
2. The boundary between npm launcher responsibilities and the existing installer is explicit.
3. Release asset selection and integrity/provenance checks are specified.
4. Failure, cleanup, target selection, and lifecycle command behavior are covered.
5. Required code, metadata, test, CI, and documentation changes are listed without implementing them.
