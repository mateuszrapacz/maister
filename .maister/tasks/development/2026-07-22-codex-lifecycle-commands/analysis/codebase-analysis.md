# Codebase Analysis

> **TL;DR**: Codex's current overlay materializes `common/skills` but has no target-specific lifecycle skill tree. Cursor retains the five requested lifecycle utilities as a compatibility projection, and the repository history contains the original Codex implementation.
>
> **Key Decisions**:
> - Add `bye`, `dev`, `next`, `resume`, and `status` to the Codex overlay as native skills with host-relative frontmatter names.
> - Keep the canonical portable skill inventory unchanged; these entrypoints are host-specific lifecycle adapters.
>
> **Open Questions & Risks**:
> - The overlay must merge utility assets without colliding with canonical skills.
> - Materialization and vocabulary validation must prove that the Codex package contains no Cursor/Claude-specific references.

## Relevant architecture

- `plugins/maister/overlays/codex/overlay.yml` materializes `common/skills` into `skills/` and adds Codex-native assets such as hooks and agent metadata.
- `plugins/maister/overlays/cursor/skill-projection-v1.json` and its checked-in output contain `maister-bye`, `maister-dev`, `maister-next`, `maister-resume`, and `maister-status` as preserved historical exceptions.
- `plugins/maister/lib/distribution/materializer.mjs` supports merged overlay trees, so Codex can add a small `assets/skills` tree without changing the common source inventory.
- `plugins/maister/overlays/codex/assets/plugin.json` exposes the materialized `skills/` directory to Codex.

## Historical evidence

Commit `661ea1a` added the exact five Codex utility skills under the former `plugins/maister-codex/skills/` tree. The platform-independent distribution migration removed that generated tree, while the Cursor compatibility projection retained equivalent hash-locked files. The current request restores the missing Codex target behavior in the current overlay model.

## Relevant standards

- Build and generated-target ownership: edit canonical plugin sources and overlays; validate with target-aware Make entrypoints.
- Minimal implementation: add only the requested lifecycle entrypoints and their focused test coverage.
- Testing: assert observable package contents and host-relative frontmatter rather than internal implementation details.
