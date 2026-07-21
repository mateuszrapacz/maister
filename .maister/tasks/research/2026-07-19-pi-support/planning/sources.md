# Source Catalog: First-Class Pi Support

## TL;DR
Primary evidence comes from the current Maister repository, the installed Pi runtime and packages, reproducible isolated probes, and official upstream repositories at version-matched revisions.
Installed behavior outranks generic documentation when versions disagree, while source code outranks secondary commentary for contract claims.
Every material finding must carry a precise, version-aware citation and an explicit confidence level.

## Key Decisions
- Separate local primary evidence, official upstream primary sources, and optional secondary context.
- Treat the installed fork `@earendil-works/pi-coding-agent` 0.79.10—not an assumed upstream distribution—as the immediate compatibility baseline.
- Treat installed `pi-subagents` 0.35.1 and its official repository as the required native-agent substrate.
- Use package metadata to resolve canonical repository URLs and version lineage before browsing broader sources.

## Open Questions / Risks
- The installed Pi package fork may differ materially from documentation for another Pi distribution or a newer `earendil-works/pi` revision.
- `pi-subagents` 0.35.1 declares development peers at Pi 0.80.10 while the installed coding agent is 0.79.10; runtime proof is required.
- Some useful tests may exist only in upstream repositories and not in the published npm packages.
- User session files and settings may contain sensitive data; they are discovery boundaries, not content sources unless sanitized and strictly necessary.

## Source Evaluation Order

For a disputed claim, use this precedence:

1. Reproducible behavior of the installed executable/package in an isolated environment.
2. Installed package implementation and metadata at the exact installed version.
3. Official upstream source at the matching tag or commit.
4. Current official upstream documentation, with version drift called out.
5. Current Maister project documentation for intended invariants and supported topology.
6. Optional secondary material only for discovery or context.

Project intent does not override observed host behavior, and host behavior does not override Maister's safety requirements; a conflict becomes a documented design gap.

## Local Primary Evidence: Maister

### Project intent and architecture

- `.maister/docs/project/vision.md` — supported-target vision, source ownership, safety, auditability, resumability.
- `.maister/docs/project/roadmap.md` — current baseline and requirement/success-criterion mapping to behavior suites.
- `.maister/docs/project/tech-stack.md` — supported implementation and release technologies.
- `.maister/docs/project/architecture.md` — canonical source, overlays, agent projection, exact runtime, transactional install, evidence, and releases.
- `.maister/docs/INDEX.md` and applicable `.maister/docs/standards/` — project-wide conventions discovered by the orchestrator.

### Canonical assets and target contracts

- `plugins/maister/common/` — portable primitives and common assets.
- `plugins/maister/skills/`, `plugins/maister/commands/`, and `plugins/maister/agents/` — current behavior-bearing sources and host-facing concepts.
- `plugins/maister/overlays/codex/`, `plugins/maister/overlays/cursor/`, `plugins/maister/overlays/kiro-cli/` — supported target contracts, inventories, and semantic bindings.
- `plugins/maister/agent-projection-v1.json` — projection manifest/contract evidence.

### Distribution, runtime, and evidence implementation

- `plugins/maister/lib/distribution/targets.mjs` — target registration and target-specific metadata.
- `plugins/maister/lib/distribution/overlay-loader.mjs` and `materializer.mjs` — overlay validation and staged materialization.
- `plugins/maister/lib/distribution/agent-ir.mjs`, `agent-projector.mjs`, `agent-projection-validator.mjs`, and `agent-manifest.mjs` — canonical role conversion and validation.
- `plugins/maister/lib/distribution/transaction-manager.mjs`, `receipt-schema.mjs`, `journal-schema.mjs`, `drift-detector.mjs`, and `recovery.mjs` — install ownership and recovery guarantees.
- `plugins/maister/lib/distribution/evidence-schema.mjs`, `evidence-policy.mjs`, `e3-attestation.mjs`, and `provenance.mjs` — support evidence and provenance rules.
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/` — three-method runtime port, resolver, dispatcher, event stream, and host adapters.
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/` — existing Codex/Cursor/Kiro adapter boundaries and unavailable behavior.

### Behavior tests and release automation

- `tests/platform-independent/target-registry.test.mjs`
- `tests/platform-independent/overlay-contract.test.mjs`
- `tests/platform-independent/source-materializer.test.mjs`
- `tests/platform-independent/agent-ir.test.mjs`
- `tests/platform-independent/agent-projection.test.mjs`
- `tests/platform-independent/agent-resolver.test.mjs`
- `tests/platform-independent/agent-adapters.test.mjs`
- `tests/platform-independent/agent-execution-events.test.mjs`
- `tests/platform-independent/agent-runtime-composition.test.mjs`
- `tests/platform-independent/installer-transaction.test.mjs`
- `tests/platform-independent/evidence-parity-topology.test.mjs`
- `tests/platform-independent/release-package.test.mjs`
- `tests/platform-independent/parity-release.test.mjs`
- `tests/platform-independent/make-interface.test.mjs`
- `tests/fixtures/platform-independent/overlays/` and related source/evidence/runtime fixtures.
- `Makefile` and `.github/workflows/` — validation, packaging, extracted lifecycle, and release gates.

**Citation expectation:** repository-relative path plus line range or exported symbol/test name; include the current commit SHA and dirty-state note for claims about exact repository state.

## Local Primary Evidence: Installed Pi Environment

### Runtime and configuration

- Resolved `pi` executable path, `pi --version`, and `pi --help` output captured during research.
- `/Users/mrapacz/.pi/agent/settings.json` — active package declarations and configuration shape; cite keys only, redact values that could expose credentials or private endpoints.
- `/Users/mrapacz/.pi/agent/extensions/` — examples of locally loaded extension contracts; use only files relevant to discovery/loading and do not edit them.
- `/Users/mrapacz/.pi/agent/npm/package.json` and `package-lock.json` — installed package intent, resolved names, and versions.

### Installed Pi coding-agent package

- `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/package.json` — observed version `0.79.10`, binary, exports, repository, engine, and packaged file inventory.
- `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/docs/` — shipped documentation for extensions, packages, skills, prompts, CLI, SDK, and configuration, subject to actual file inventory.
- `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/dist/` — executable implementation and type declarations where shipped docs are incomplete.

### Installed native subagents extension

- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/package.json` — observed version `0.35.1`, exports, Pi manifest, repository, and peer versions.
- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/README.md` and `CHANGELOG.md` — documented usage and version behavior.
- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/index.ts` — Pi extension registration surface.
- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/api/delegation.ts` and `src/api/background-work.ts` — published API exports.
- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/extension/`, `src/agents/`, `src/intercom/`, and `src/shared/` — implementation evidence for identity, dispatch, RPC, event/result transport, persistence, and concurrency.
- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/agents/`, `skills/`, and `prompts/` — native descriptor and workflow examples.
- Isolated native-delegation probe artifacts created under an explicit temporary task directory.

**Citation expectation:** absolute path, package name and exact version, plus line range or exported symbol. For commands, record sanitized invocation, isolated environment variables/config root, UTC timestamp, exit status, stdout/stderr artifact path, and cleanup status. Do not cite raw session databases or JSONL conversations.

## Official Upstream Primary Sources

### Installed Pi fork

- [earendil-works/pi](https://github.com/earendil-works/pi) — repository declared by the installed `@earendil-works/pi-coding-agent` package; focus on `packages/coding-agent` and version/tag history corresponding to 0.79.10.
- [npm: @earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) — published version metadata and package provenance.

Use official source files for package discovery, extension API, skills, prompts, CLI modes, SDK/event interfaces, and configuration precedence. Prefer a tag or commit matching 0.79.10; if absent, pin the closest verified commit and explain the mapping.

### Required subagents extension

- [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents) — repository declared by installed package metadata; use tag/release 0.35.1 when available.
- [npm: pi-subagents](https://www.npmjs.com/package/pi-subagents) — published metadata, versions, and packaged surface.
- Official repository tests for unit, integration, and end-to-end behavior, especially agent selection, chains/fan-out, background work, RPC, cancellation, and failure cases.

### Lineage and comparison only

- The original upstream repository linked by official fork history, if any, may explain inherited Pi concepts. It must be clearly labeled **lineage/comparison**, and its behavior must not be attributed to the installed `@earendil-works` fork without verification.
- npm registry metadata retrieved directly from the registry may be used to bind tarball integrity, dependency versions, and repository URLs.

**Citation expectation:** direct canonical file/document URL plus repository, tag/commit/release, relevant line range or heading, and access date. Never cite a search-result URL. When current upstream differs from installed behavior, cite both sides and label the version mismatch.

## Optional Secondary Sources

Use only when primary sources leave a terminology, adoption, or operational gap:

- Maintainer-authored issue or pull-request discussions in the official repositories.
- Maintainer release notes not duplicated in the repository or package changelog.
- Community examples that demonstrate a Pi package layout or subagent workflow, provided the behavior is reproduced locally.
- Security advisories for the exact installed packages or dependencies.

Do not use generic blog posts, generated package summaries, social posts, or unrelated Pi implementations as authoritative contract evidence. Secondary sources may suggest a probe or question but cannot establish support by themselves.

**Citation expectation:** author, date, stable URL, relation to the official project, and an explicit `secondary` label. Assign no more than medium confidence unless independently reproduced and triangulated with primary evidence.

## Empirical Evidence Ledger

Each probe should add a compact record to its finding report with:

- probe ID and research category;
- hypothesis and capability under test;
- exact installed versions and executable path;
- sanitized command and isolated filesystem/config roots;
- UTC timestamp and exit code;
- observed output/event/artifact hashes where useful;
- side effects and cleanup result;
- conclusion and confidence;
- links to upstream expectations and conflicting evidence.

Minimum required probes are:

1. Pi executable/version/help and active package discovery.
2. Isolated loading/discovery of representative extension, skill, and prompt/command surfaces.
3. One successful bounded native-agent delegation through installed `pi-subagents`.
4. One negative delegation case proving typed failure or documenting its absence.
5. A safe package/install-layout discovery check that does not modify the active Pi home.

## Citation and Confidence Checklist

Before accepting a finding, verify:

- Is the claim bound to a specific Pi, extension, Maister, and Node version where relevant?
- Does the citation point to the exact code, documentation, test, or probe that supports it?
- Is observed behavior distinguished from documented promise?
- Are fork lineage and installed-package identity explicit?
- Are secrets, private prompts, and user session content excluded?
- Are contradictions recorded rather than silently resolved?
- Is confidence calibrated as high, medium, or low using the research methodology?

High confidence normally requires a reproducible probe plus matching installed/upstream implementation, or multiple independent direct sources. Medium confidence covers a single authoritative source or partially verified behavior. Low confidence covers inference, undocumented internals, unresolved version drift, or unrepeatable observations.
