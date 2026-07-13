# Research Plan: Configurable Issue Tracker Workflow

## TL;DR
Use a mixed-method, four-stream investigation: Maister internals, installed `mattpocock/skills`, external tracker contracts, and cross-cutting product-quality trade-offs. Run the streams independently in parallel, then triangulate their evidence into provider options, a minimum user journey, and an implementation-ready recommendation. Keep issue intake separate from `orchestrator-state.yml`, which remains authoritative only after a workflow starts.

## Key Decisions
- Use four independent gathering categories, each with one owned findings file and explicit source priorities.
- Treat local code, tests, and installed skill files as primary evidence; use official vendor documentation as primary evidence for external APIs.
- Require the synthesis to compare at least three architecture options and trace capture-to-workflow handoff across research, planning, and development.
- Score confidence per claim from evidence quality and triangulation, not from researcher certainty.

## Open Questions / Risks
- A common provider contract may become either too weak for useful tracker features or too broad for a reliable local Markdown implementation.
- Tracker references may be ambiguous across providers, repositories, and issue/PR number spaces.
- CLI and API capabilities, authentication, rate limits, and offline behavior can change; external claims require current primary-source verification.
- Platform generation may constrain where canonical commands, configuration, and provider helpers can live.

## Research Objective

Answer: **How should Maister add configurable issue-tracker providers, fast task capture, and issue-to-workflow handoff while reusing good ideas from `mattpocock/skills`?**

The final research must be detailed enough to start a later Maister development workflow without repeating discovery. It must preserve these boundaries:

- issue tracking is persistent work intake;
- `.maister/tasks/**/orchestrator-state.yml` is execution and resume state after a workflow begins;
- generated platform variants are not edited directly;
- the feature must work without introducing a hosted service or database;
- local Markdown and GitHub are required comparison points, while future providers remain possible.

## Methodology

This is mixed research combining:

1. **Technical iterative deepening** — discover components, trace invocation and state flows, identify canonical and generated ownership, then verify seams against tests.
2. **Requirements extraction** — derive functional and non-functional requirements from the brief, current workflows, and user journeys.
3. **Comparative literature review** — inspect current official tracker API/CLI documentation and compare capabilities and constraints.
4. **Multi-source triangulation** — validate important conclusions across source code, instructions, tests, configuration, and official documentation.

Each gatherer should distinguish direct evidence, inference, and recommendation. Scope expansion is allowed only when a newly discovered dependency is necessary to answer one of the exact questions below; record other ideas as deferred.

## Gathering Strategy

Launch all four categories in parallel. Each gatherer owns only its expected findings file under `analysis/findings/` and must open the artifact with the required TL;DR, Key Decisions, and Open Questions / Risks sections.

### Category 1 — Maister Internals and Platform Adapters

**Expected output:** `analysis/findings/01-maister-internals.md`

**Exact questions:**

1. How do `$maister:research`, `$maister:quick-plan`, `$maister:development`, and `$maister:work` currently accept task context, initialize task directories, and persist resume state?
2. Which canonical files are the safest seams for: tracker configuration, issue reference parsing, issue retrieval, fast capture, and workflow handoff?
3. What data must be copied or linked into a workflow at initialization, and what must remain owned by the tracker to avoid two sources of truth?
4. How are canonical skills and commands transformed for Claude, Codex, Cursor, and Kiro, and which host capability differences affect subprocesses, user prompts, file access, or CLI invocation?
5. Which existing continuation, gate, config reconciliation, validation, and build tests provide patterns for fail-closed provider behavior?
6. What minimum changes would preserve the project's documentation-as-code architecture and deterministic generated variants?

**Authoritative source priority:**

1. Canonical files under `plugins/maister/`, especially workflow skills and `skills/orchestrator-framework/`.
2. Platform adapter scripts and overrides under `platforms/`.
3. Contract, fixture, install, and end-to-end tests under `tests/` and `platforms/*/tests/`.
4. `.maister/docs/project/` and applicable standards as supporting intent; generated `plugins/maister-*` trees only as parity checks.

**Required evidence:** cite exact local paths and relevant headings/functions; trace at least one end-to-end current workflow initialization path; distinguish canonical source from generated output.

### Category 2 — Installed `mattpocock/skills` Prior Art

**Expected output:** `analysis/findings/02-mattpocock-skills.md`

**Exact questions:**

1. How does `setup-matt-pocock-skills` select and persist GitHub, GitLab, local Markdown, or free-form tracker configuration?
2. What implicit provider interface is encoded by `docs/agents/issue-tracker.md` phrases such as publish, fetch, list, label, comment, close, claim, resolve, blocking, and frontier?
3. How do `to-spec`, `to-tickets`, `triage`, and `implement` pass work from idea/specification through ticket publication, readiness state, and implementation?
4. Which conventions are reusable in Maister: repository-local configuration, prose adapter instructions, stable references, labels-as-roles, local file layout, dependency edges, and explicit handoff?
5. Which conventions should Maister avoid or strengthen because they are underspecified, tracker-specific, difficult to validate, or unsafe under concurrent/local writes?
6. Can the installed skills' setup-to-tickets-to-triage-to-implement journey be mapped onto Maister research, planning, development, resume, and audit semantics without duplicating state?

**Authoritative source priority:**

1. Installed files under `/Users/mrapacz/.agents/skills/`, read in full for setup, tracker templates, `to-spec`, `to-tickets`, `triage`, and `implement`.
2. Supporting installed skills directly referenced by that flow, including `wayfinder`, `domain-modeling`, `grilling`, `tdd`, and `code-review`, only where needed to understand handoff contracts.
3. The upstream `mattpocock/skills` repository for provenance and changes relative to the installed copy; treat local installed behavior as authoritative for what is available in this environment.

**Required evidence:** produce an operation matrix by provider and a sequence narrative from setup through implementation; cite exact installed paths; label upstream-only observations separately.

### Category 3 — External Tracker Provider Contracts

**Expected output:** `analysis/findings/03-tracker-providers.md`

**Exact questions:**

1. What is the smallest common operation set needed for capture and handoff across local Markdown, GitHub Issues, GitLab Issues, Jira Cloud, and Linear: create, resolve reference, read, list/search, update, comment, label/state, and capability discovery?
2. Which capabilities cannot be normalized cleanly, such as sub-issues, native blocking links, issue/PR ambiguity, projects, custom workflows, assignees, or rich metadata?
3. Should providers use vendor CLIs, HTTP APIs, MCP/connectors, filesystem operations, or a layered preference/fallback model in Maister's supported hosts?
4. What canonical reference syntax can unambiguously identify provider, repository/project, issue kind, and native ID while remaining quick to type?
5. What authentication, pagination, rate-limit, error, idempotency, and offline semantics must the provider boundary expose?
6. Which current API or CLI guarantees are stable enough for an initial GitHub provider, and which assumptions require capability checks or graceful degradation?

**Authoritative source priority:**

1. Current official vendor API and CLI documentation, including authentication, issue operations, pagination/rate limits, and error contracts.
2. Official schemas or machine-readable API references where available.
3. Installed CLI help/version output as environment evidence, without treating local installation as a product requirement.
4. Third-party examples only to identify gaps; never use them as sole support for contract claims.

**Required evidence:** include a provider capability matrix; record access date and source version where available; mark unsupported or unverified capabilities explicitly; do not test writes against real trackers.

### Category 4 — UX, Domain Model, Testing, and Security Trade-offs

**Expected output:** `analysis/findings/04-product-quality-tradeoffs.md`

**Exact questions:**

1. What are the minimum fast-capture, list/show/select, and handoff journeys for both interactive and explicit command use?
2. What domain vocabulary and entities prevent confusion among `Issue`, `IssueRef`, `TrackerProvider`, captured snapshot, workflow task, workflow state, status, and provider capability?
3. Should workflow initialization store a source reference, an immutable snapshot, selected normalized fields, or a combination, and how should later tracker changes be surfaced?
4. How should default provider selection, per-project configuration, command overrides, and missing/ambiguous configuration behave?
5. What failure and concurrency cases matter for local Markdown: stable IDs, atomic creation/update, duplicate slugs, multiple agents, partial writes, Git conflicts, and path traversal?
6. What security boundaries apply to credentials, untrusted issue content, command injection, prompt injection, secret leakage, URL/repository validation, and external writes?
7. What behavior-focused test matrix covers provider contracts, local persistence, mocked external providers, handoff into three workflows, platform generation, migration, rollback, and transactional rejection?
8. Which architecture options best balance a shared provider contract, tracker-specific capabilities, minimal dependencies, offline use, and cross-platform parity?

**Authoritative source priority:**

1. Research brief, project vision/architecture/tech-stack, and global validation/error-handling/minimal-implementation plus testing standards.
2. Existing Maister fail-closed configuration, gate persistence, atomic reconciliation, fixtures, and rollback-oriented tests as implementation precedent.
3. Installed tracker templates and workflow UX as concrete prior art.
4. Official security guidance and vendor authentication documentation for boundary-specific recommendations.

**Required evidence:** provide a domain glossary, at least three complete user journeys, a threat/failure table, and a risk-based test matrix; separate must-have v1 behavior from later capabilities.

## Synthesis Procedure

The synthesizer must read all four findings files and produce `analysis/synthesis.md` plus `outputs/research-report.md`. It should:

1. Reconcile terminology before comparing designs; use one name for each domain concept and call out conflicting source vocabulary.
2. Build a requirements matrix covering fast capture, provider selection, reference resolution, retrieval, handoff, offline behavior, security, auditability, and platform parity.
3. Compare at least three architecture options, including:
   - prose/config-driven provider instructions similar to `mattpocock/skills`;
   - a canonical declarative provider contract with host-adapted execution;
   - a small executable provider layer/helper with declarative capabilities.
4. Evaluate each option against the same criteria: simplicity, deterministic generation, extensibility, tracker-specific escape hatches, validation, testability, security, offline behavior, migration cost, and host parity.
5. Define a recommended v1 provider contract, canonical `IssueRef` format, configuration shape, command vocabulary, and capability/error model at enough detail for implementation planning.
6. Trace at least these end-to-end journeys:
   - configure local Markdown, quickly capture a task, then start research from it;
   - configure GitHub, capture or select an issue, then start quick planning;
   - hand an existing issue reference into development while retaining source provenance and workflow-local state.
7. Explicitly state what remains tracker-owned versus what becomes a workflow snapshot/reference, including behavior when the upstream issue changes.
8. Propose an incremental migration and test strategy that introduces no database and preserves existing direct-prompt workflow invocation.
9. Record rejected alternatives and unresolved decisions rather than silently choosing defaults.

## Synthesis Acceptance Criteria

The research is ready for a development handoff only if:

- every success criterion from `planning/research-brief.md` is answered with cited evidence;
- all four findings artifacts exist and satisfy their required evidence;
- at least three architecture options are compared on a common rubric;
- the recommendation includes a provider contract, issue-reference grammar, configuration ownership, minimal commands, and fallback behavior;
- local Markdown and GitHub flows are specified end to end, with future-provider extension points identified but not overbuilt;
- workflow handoff semantics for research, quick plan, and development preserve `orchestrator-state.yml` as the resume source of truth;
- platform adapter impact and generated-artifact ownership are explicit;
- security, concurrency, migration, and behavior-focused testing risks have concrete mitigations;
- contradictions and evidence gaps remain visible in the final report.

## Confidence Rules

Assign confidence to each material finding and final recommendation component:

- **High (90–100%)** — direct current evidence plus at least one independent confirmation, such as canonical code + tests, installed skill + observed config template, or official API docs + official schema/CLI help; no material contradiction.
- **Medium (60–89%)** — one authoritative source or multiple indirect sources, with minor gaps, version uncertainty, or behavior inferred but not covered by tests.
- **Low (<60%)** — proposal, extrapolation, conflicting evidence, stale/unverified external documentation, or behavior unsupported by direct evidence.

Rules for applying scores:

- A recommendation cannot have higher confidence than its most important unresolved dependency.
- Generated Maister variants do not independently confirm canonical behavior; tests or adapter logic are needed for triangulation.
- Upstream `mattpocock/skills` behavior does not confirm the installed version unless the files match.
- External API facts without a current official source are low confidence.
- User preference questions and product choices are decisions, not factual findings; label them as open decisions rather than assigning false certainty.

## Planned Deliverables

- `analysis/findings/01-maister-internals.md`
- `analysis/findings/02-mattpocock-skills.md`
- `analysis/findings/03-tracker-providers.md`
- `analysis/findings/04-product-quality-tradeoffs.md`
- `analysis/synthesis.md`
- `outputs/research-report.md`

