# Research Brief: Unified Agent Projections

## TL;DR
Maister needs one canonical agent inventory and deterministic projections for Codex, Cursor, and Kiro CLI.
`maister-advisor` must follow the same installation and invocation contract as every other agent, without a special Codex profile, read-only mode, or sandbox setting.
The deliverable will define the target architecture, migration boundary, validation matrix, and inputs required by `maister:development`.

## Key Decisions
- Treat `maister-advisor` like every other agent — this is an explicit user constraint and removes the previously proposed Codex-only exception.
- Keep `plugins/maister/agents/*.md` as the portable source of truth — host outputs must be derived rather than independently maintained.
- Research first, implement later through `maister:development` — this task produces evidence and design artifacts only.

## Open Questions / Risks
- Codex plugins do not currently register the Markdown agent assets as native custom agents, so the runtime delegation contract must be made explicit.
- Cursor's projected inventory and the canonical inventory already differ.
- Kiro JSON definitions reference prompt files that the current overlay does not install.

## Research question

How should Maister transform, install, discover, and invoke all canonical agents consistently on Codex, Cursor, and Kiro CLI when `maister-advisor` follows the same rules as every other agent?

## Scope

Included:

- ownership and inventory of canonical agents;
- per-host output formats and discovery roots;
- installation, update, uninstall, rollback, and drift behavior;
- runtime role selection and invocation;
- validation, parity, reference integrity, and behavioral evidence;
- migration of current duplicated and incomplete projections;
- a development-ready recommended architecture.

Excluded:

- production implementation;
- special permissions, read-only mode, or sandbox configuration for Advisor;
- unsupported hosts and historical generated distributions;
- redesign of unrelated skills or workflow semantics.

## Constraints

- `plugins/maister/agents/*.md` remains the only portable behavior owner.
- Host-specific formats belong to explicit overlays or deterministic adapters.
- Generated output must not become a second hand-maintained source of truth.
- The transactional installer must retain exact ownership, recovery, and drift guarantees.
- Every workflow role must map deterministically to one installed or injected host representation.

## Success criteria

1. Inventory every canonical agent and every current host projection.
2. Trace build, installation, discovery, and runtime invocation for all three hosts.
3. Identify concrete broken, missing, duplicated, and ambiguous contracts.
4. Define one recommended transformation and invocation model per host.
5. Define migration rules and verification requirements suitable for `maister:development`.
6. Record remaining decisions explicitly rather than hiding them as implementation detail.
