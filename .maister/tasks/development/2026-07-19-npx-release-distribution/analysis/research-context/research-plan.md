# Research plan: npx-based Maister distribution

## TL;DR
The investigation will treat the npm package as a thin launcher and GitHub Release archives as the distribution source of truth.
It will trace the existing source-to-release-to-install flow before defining the npx boundary.
The plan combines four evidence streams: repository architecture, release packaging, npm CLI behavior, and integrity/ownership concerns.
The outcome will be a recommendation plus implementation-ready requirements, not production code.

## Key Decisions
- Use four gathering categories so the research covers the full delivery boundary without duplicating work.
- Prefer official npm and GitHub documentation for external behavior and repository evidence for project-specific contracts.
- Evaluate both `latest` convenience and exact-version reproducibility.

## Open Questions / Risks
- Whether the npm package should publish as `@mateuszrapacz/maister` or `@mateuszrapacz/maister-cli`.
- Whether checksum sidecars are sufficient for the intended threat model or need a stronger trust anchor.
- Whether the wrapper should support only installation first or mirror the full installer lifecycle.

## Research objectives

1. Map the current canonical source, target overlays, packaging, GitHub Release workflow, and transactional installer.
2. Define the smallest npm package surface that can hide download and extraction while preserving existing lifecycle semantics.
3. Compare latest-version resolution with exact-version pinning and identify the required manifest/checksum bindings.
4. Identify failure, cleanup, cache, permissions, host selection, and offline behavior that must be specified.
5. Produce a concrete implementation and validation checklist, including metadata changes from Skillpanel to mateuszrapacz.

## Gathering strategy

### Category 1: codebase-installer

Trace source resolution, target selection, staging, transaction ownership, receipts, journals, verification, rollback, and recovery.

Expected output: current contract and the exact adapter seam where an npx launcher should call the existing installer.

### Category 2: release-packaging

Trace `make package`, target archive contents, embedded source metadata, E3 attestation, checksum/SBOM/provenance generation, GitHub tag triggers, and release publication.

Expected output: release asset naming/version rules and the wrapper's release-resolution inputs.

### Category 3: npm-cli-boundary

Verify official npm behavior for scoped packages, `bin` commands, `npx`/`npm exec`, package versions, and publishing. Compare the desired command UX with the constraints of a package that downloads a GitHub Release asset and delegates to Node.

Expected output: package shape, command surface, version flags, and publishing workflow.

### Category 4: security-ownership

Analyze checksum verification, unsigned release metadata, temporary extraction, cleanup, network failures, source provenance, target confusion, and stale Skillpanel ownership references.

Expected output: threat model, fail-closed behavior, required tests, and metadata/documentation migration list.

## Synthesis framework

- Preserve the existing installer as the authority for target mutation and recovery.
- Keep the npm layer stateless with respect to installed plugin content; use temporary staging and pass validated archive roots into the installer.
- Bind requested version, target, release asset, archive checksum, source commit, and embedded attestation before installation.
- Separate convenience defaults (`latest`) from reproducible explicit versions.
- Treat publisher identity and legal attribution as separate decisions.

## Expected artifacts

- Category findings under `analysis/findings/`.
- Cross-source synthesis at `analysis/synthesis.md`.
- Main report at `outputs/research-report.md` and companion `outputs/research-report.html`.
