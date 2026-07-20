# Research sources: npx-based Maister distribution

## TL;DR
Primary evidence is available locally in the release workflow, packaging code, installer, target overlays, tests, and ownership metadata.
External behavior will be checked only against official npm, Node.js, and GitHub documentation.
The source list is organized by the four research categories from the plan.

## Key Decisions
- Treat `mateuszrapacz/maister` and its `v*` release workflow as the canonical distribution path.
- Treat `maister-install.mjs` and its distribution libraries as the authority for installation semantics.
- Do not use Skillpanel references as a distribution source; inspect them only as migration residue.

## Open Questions / Risks
- The repository has an `upstream` remote for SkillPanel while `origin` points to `mateuszrapacz/maister`; release ownership must be explicit in docs and CI assumptions.
- The current release metadata states that checksums and provenance are unsigned and do not authenticate the publisher.
- The repository currently has no npm package manifest or CLI entrypoint.

## Local repository sources

### Codebase and installer

- `plugins/maister/bin/maister-install.mjs`
- `plugins/maister/lib/distribution/cli-contract.mjs`
- `plugins/maister/lib/distribution/source-resolver.mjs`
- `plugins/maister/lib/distribution/materializer.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/lib/distribution/target-paths.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `plugins/maister/lib/distribution/e3-attestation.mjs`
- `plugins/maister/lib/distribution/receipt-schema.mjs`
- `plugins/maister/lib/distribution/recovery.mjs`
- `plugins/maister/overlays/codex/overlay.yml`
- `plugins/maister/overlays/cursor/overlay.yml`
- `plugins/maister/overlays/kiro-cli/overlay.yml`

### Release and packaging

- `Makefile`
- `plugins/maister/bin/release-interface.mjs`
- `plugins/maister/bin/release-metadata.mjs`
- `.github/workflows/release.yml`
- `tests/platform-independent/release-package.test.mjs`
- `tests/platform-independent/installer-transaction.test.mjs`
- `README.md` sections Installation and Packaged archive lifecycle and provenance
- `docs/README.md` sections Operator guide and Package verification

### Project contracts and standards

- `.maister/docs/INDEX.md`
- `.maister/docs/project/vision.md`
- `.maister/docs/project/roadmap.md`
- `.maister/docs/project/tech-stack.md`
- `.maister/docs/project/architecture.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/global/conventions.md`
- `.maister/docs/standards/global/error-handling.md`
- `.maister/docs/standards/global/minimal-implementation.md`
- `.maister/docs/standards/global/validation.md`
- `.maister/docs/standards/testing/test-writing.md`

### Ownership and migration residue

- `plugins/maister/overlays/codex/assets/plugin.json`
- `LICENSE`
- Git remotes (`origin` is `mateuszrapacz/maister`; `upstream` is `SkillPanel/maister`)
- `README.md` GitHub source example
- `.maister/tasks/development/2026-07-14-platform-independent-plugin/documentation/user-guide.md`

## External primary sources to verify

- npm documentation for `npm exec` / `npx` behavior.
- npm documentation for scoped package names, `bin` entries, publishing, and version tags.
- Node.js documentation for built-in `fetch`, child-process execution, temporary filesystem APIs, and archive/process boundaries used by the launcher.
- GitHub documentation for Releases, release asset download URLs, and release asset/API behavior.
- GitHub documentation for workflow release triggers and release asset publication, where it clarifies the local workflow contract.

## Evidence recording rules

- Record exact file paths and relevant symbols/commands for local evidence.
- Record canonical URLs and access dates for external evidence.
- Mark inferences separately from directly documented behavior.
- Treat unsigned checksums/provenance as integrity evidence only, not publisher authentication.
