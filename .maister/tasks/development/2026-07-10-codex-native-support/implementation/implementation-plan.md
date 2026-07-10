## TL;DR

Five sequential groups implement the Codex native variant without touching generated variants manually.
The build and smoke test come before documentation claims and final repository validation.

## Key Decisions

- Build script and platform hooks are the core seam.
- Generated output is rebuilt and checked rather than hand-curated.
- Full repository validation is the final technical gate.

## Open Questions / Risks

- Live Codex runtime testing remains outside this session.

## Plan

- [x] 1.1 Add Codex build target, generator, native hooks, and structural smoke test.
- [x] 1.2 Generate Codex manifest, skills, command-derived entrypoints, MCP, and README.
- [x] 1.3 Add local marketplace metadata and generated-variant CI drift coverage.
- [x] 1.4 Add Codex support docs and update project tech-stack documentation.
- [x] 1.5 Run `make build`, `make validate`, and `make validate-codex`; inspect the resulting tree.
