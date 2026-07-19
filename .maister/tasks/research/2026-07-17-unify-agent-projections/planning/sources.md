# Source Plan: Unified Agent Projections

## TL;DR
Repository source, overlays, distribution code, and tests are primary evidence for current Maister behavior.
Official Codex, Cursor, and Kiro CLI documentation is required for native discovery and invocation contracts.
Claims must be tied to exact paths or official sections and triangulated across different source types.
Legacy generated distributions and local `dist/` output are excluded as architectural authority.

## Key Decisions
- Prioritize sources in this order: explicit user constraint and research brief; executable source/configuration; behavior-focused tests; current project architecture; official host documentation and versioned CLI behavior.
- Use host documentation only from OpenAI, Cursor, and AWS/Kiro official domains; use community material solely to locate an official source, never as final evidence.
- Record `maister-advisor` in the same inventory and source trail as every other agent.
- Keep static structure and native runtime evidence in separate source records.

## Open Questions / Risks
- Public host documentation may lag installed runtimes or omit plugin-specific delegation details.
- Overlay paths can be declarative rather than executable; the materializer must confirm their meaning.
- Existing tests may validate inventory shape without proving host-native discovery or invocation.
- Missing native executables or authenticated sessions may limit conclusions to an explicit `unavailable` result.

## Source hierarchy and evidence use

| Priority | Source type | Permitted claim |
|---|---|---|
| P0 | User constraint and `planning/research-brief.md` | Scope, required equality of Advisor, success criteria |
| P1 | Executable source and checked-in overlay contracts | Current transformation, destination, ownership, and adapter declarations |
| P2 | Behavior-focused tests and fixtures | Verified structural, transactional, topology, parity, or runtime behavior actually asserted |
| P3 | Current project architecture and standards | Intended architecture, constraints, release and testing policy |
| P4 | Official host documentation and versioned CLI/runtime observation | Native format, discovery, selection, invocation, and limitations |

## Internal source register

### Canonical behavior and projection

- `plugins/maister/agents/*.md` — canonical role inventory and portable prompt content.
- `plugins/maister/overlays/codex/overlay.yml` — Codex layout, discovery root, semantic bindings, inventory, and managed settings.
- `plugins/maister/overlays/cursor/overlay.yml` — Cursor agent layout, discovery root, semantic bindings, inventory, and managed settings.
- `plugins/maister/overlays/kiro-cli/overlay.yml` — Kiro JSON-agent layout, discovery root, semantic bindings, inventory, and settings.
- `plugins/maister/lib/distribution/materializer.mjs` — resolution of overlay sources and construction of the staged target tree.
- `plugins/maister/lib/distribution/targets.mjs` — supported-target registry and target-level configuration.
- `plugins/maister/lib/distribution/target-paths.mjs` — destination and state-root resolution.

### Platform-independent verification pointers

Gatherers must inspect relevant files identified by filenames under `tests/platform-independent/`, especially:

- `overlay-contract.test.mjs` — overlay schema, inventory, native assets, and semantic-binding assertions.
- `source-materializer.test.mjs` — source resolution, projection, collisions, modes, and staged output.
- `target-registry.test.mjs` — supported targets and path contracts.
- `installer-transaction.test.mjs` — ownership, drift, rollback, and failure behavior.
- `repository-topology.test.mjs` — allowed and forbidden repository topology.
- `evidence-parity-topology.test.mjs` — evidence and topology classification.
- `parity-release.test.mjs` — migration-boundary parity rules.
- `release-package.test.mjs` — packaged target isolation and extracted lifecycle.

These tests can support only the behavior they explicitly assert. A passing structural suite does not prove native agent invocation.

### Architecture, standards, and user-facing contract

- `.maister/docs/project/vision.md` — single-owner and evidence goals.
- `.maister/docs/project/architecture.md` — canonical-source, overlay, transaction, evidence, and migration boundaries.
- `.maister/docs/project/tech-stack.md` — supported artifact formats and deterministic distribution choices.
- `.maister/docs/project/roadmap.md` — parity and native-evidence priorities.
- `.maister/docs/standards/global/build-pipeline.md` — canonical edit locations, target validation, and generated-projection constraints.
- `.maister/docs/standards/testing/test-writing.md` — behavior, transaction, topology, and native-evidence standards.
- `docs/commands.md` and `docs/workflows.md` — current user-visible agent/delegation claims to verify and update.

## Official documentation targets

Each external record must include the final canonical URL, page title/section, access date, and host/CLI version to which it applies.

### Codex / OpenAI

- Official Codex plugin structure and supported plugin components.
- Official custom-agent/subagent configuration, including project and user discovery roots.
- Official subagent spawning/delegation interface and whether instructions can be supplied dynamically.
- Official precedence, naming collision, model selection, and unavailable-agent behavior.
- Official CLI commands or diagnostics that can prove agent/plugin discovery and invocation.

Primary domain targets: `developers.openai.com`, `platform.openai.com`, and current official Codex documentation under `learn.chatgpt.com`. Prefer the current canonical page over cached or redirected copies.

### Cursor

- Official plugin manifest/layout and `agents/*.md` contract.
- Official custom/subagent naming, discovery, invocation, and collision behavior.
- Official CLI or UI diagnostics capable of proving plugin-agent discovery and selected-agent execution.

Primary domain targets: `cursor.com/docs` and other pages on `cursor.com` explicitly identified as Cursor documentation.

### Kiro CLI

- Official custom-agent JSON schema and required/optional fields.
- Official `file://` prompt/instruction resolution semantics and base-directory rules.
- Official agent discovery roots, default-agent setting, named invocation, subagent/delegation behavior, and collision handling.
- Official CLI commands or diagnostics capable of proving descriptor loading and selected-agent execution.

Primary domain targets: `kiro.dev/docs/cli` and official AWS documentation that explicitly governs the installed Kiro CLI version.

## Native observation targets

When the required executable and safe environment are available, record:

- exact host version output;
- materialized plugin/agent inventory from an isolated temporary target root;
- host-native discovery/listing output, if supported;
- one versioned invocation scenario that distinguishes two agents by role-specific expected behavior;
- explicit `unavailable` prerequisites when discovery or invocation cannot be run.

Native observations supplement official documentation; they do not replace deterministic source and transaction tests.

## Excluded or non-authoritative sources

- `dist/` and any stale local package output;
- legacy generated host trees, except as explicitly labeled migration/parity evidence;
- repository-local `.codex/agents/*.toml` remnants as evidence of the current installer contract;
- community posts, unversioned examples, and search-result snippets;
- file counts without normalized identifier and content/reference comparison;
- overlay capability labels without executable or native evidence.

## Source acceptance checklist

A source is ready for synthesis when its record states:

1. the exact claim it supports;
2. path and line range, or official URL and section;
3. source type and applicable host/version;
4. whether it proves declaration, materialization, discovery, or invocation;
5. confidence and any contradiction;
6. whether the same evidence applies to `maister-advisor` without exception.
