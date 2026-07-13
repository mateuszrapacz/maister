# Decision Log: Configurable Issue Tracker Workflow

## TL;DR
Six accepted ADRs define a provider-neutral, executable issue boundary and immutable issue-to-workflow handoff.
Workflow state retains provenance and resume truth without owning the live tracker; quick plans remain portable across hosts.
v1 is deliberately narrow: explicit capture/create, transactional Local Markdown first, then GitHub under one conformance contract.

## Key Decisions
- One small Node ESM boundary owns exact schemas, capabilities, dispatch, typed errors, and redaction.
- Root `source_issue` is added only after the workflow-state schema is unified; snapshot content remains outside state.
- Local Markdown and portable plans establish deterministic behavior before hosted-provider expansion.

## Open Questions / Risks
- State-schema unification and migration fixtures are prerequisites for ADR-002.
- Local transactional guarantees are restricted to ordinary local filesystems.
- GitHub create can remain ambiguous after a post-dispatch timeout, so blind retry is prohibited.
- Codex fully automatic continuation stays unsupported until separately verified.

## ADR-001: Use an Executable Provider Boundary

### Status
Accepted

### Context
Maister needs consistent provider behavior across hosts whose tools, command syntax, and continuation capabilities differ. Prose-only guidance spreads parsing, quoting, validation, error handling, and redaction across prompts, while a declarative command-template approach creates a security-sensitive command language.

### Decision Drivers
- Deterministic, fail-closed validation across all supported hosts.
- Exact machine-readable requests and results suitable for contract tests.
- Explicit representation of provider and permission differences.
- Minimal dependency footprint aligned with the existing Node.js runtime.

### Considered Options
1. Prose instructions with direct host tools.
2. Declarative command templates executed by each host.
3. A small Node ESM helper with exact JSON and a declarative `CapabilitySet`.

### Decision Outcome
Chosen option: **a small Node ESM helper with exact JSON and a declarative `CapabilitySet`**, because it creates one testable safety boundary without introducing a general provider SDK or flattening vendor constraints.

### Consequences

#### Good
- Parsing, schema validation, provider dispatch, typed errors, redaction, and transport rules have one owner.
- Host adapters remain thin and provider semantics remain testable through shared fixtures.
- Capabilities can express `native`, `emulated`, `unsupported`, and `unknown` with permissions and constraints.

#### Bad
- The helper becomes a critical security and compatibility boundary requiring strong contract coverage.
- Packaging and invocation must be validated for every generated host variant.
- More implementation is required than for prose-only guidance.

---

## ADR-002: Anchor Source Provenance in Workflow State

### Status
Accepted

### Context
Issue handoff must record which live input started a workflow without turning workflow state into a backlog replica. Existing evidence reveals competing workflow-state schemas, so adding provenance before schema unification would create multiple authoritative shapes or dual-read complexity.

### Decision Drivers
- Preserve workflow state as the only source of truth for phase execution and resume.
- Keep tracker ownership of live title, body, lifecycle, and relationships.
- Make the exact workflow input auditable and drift-detectable.
- Avoid duplicating snapshot content in state.

### Considered Options
1. A root `source_issue` pointer in the unified workflow state.
2. An authoritative intake manifest outside workflow state.
3. Separate source fields owned by each workflow.

### Decision Outcome
Chosen option: **a root `source_issue` pointer in the unified workflow state after schema unification**, because it gives research and development one resume/audit anchor while immutable artifacts retain the actual snapshot content.

### Consequences

#### Good
- Resume and audit can discover source provenance from one authoritative state document.
- Tracker status remains distinct from phase status, and live issue data is not mirrored.
- Drift checks can compare the captured revision or digest without changing prior decisions.

#### Bad
- State schema unification, versioning, migration behavior, and fixtures are blocking prerequisites.
- Quick-plan requires an analogous source block because it does not always create orchestrated workflow state.
- The pointer and referenced artifacts must be committed transactionally to avoid broken provenance.

---

## ADR-003: Use Portable Quick-Plan Artifacts

### Status
Accepted

### Context
Quick-plan persistence currently depends on the host: some hosts expose native planning state while others produce project-local files. A handoff that exists only in host UI is not reliably auditable, versionable, or transferable to another host or a later development workflow.

### Decision Drivers
- Cross-host semantic parity and durable provenance.
- Git-reviewable handoff from planning to development.
- One canonical representation rather than divergent host-owned copies.
- Compatibility with useful native planning interfaces.

### Considered Options
1. Persist only in each host's native plan mechanism.
2. Persist a canonical `.maister/plans/*.md` artifact on every host and project it into native UI.
3. Store only a central provenance registry referencing host-native plans.

### Decision Outcome
Chosen option: **a canonical Markdown plan artifact on every host, with native UI as a projection**, because the artifact preserves plan content and source provenance independently of session or host lifetime.

### Consequences

#### Good
- Plans are portable, reviewable, and suitable for later development handoff.
- All hosts share one durable source block containing issue ref, revision, digest, and snapshot linkage.
- Native planning UI remains available without becoming authoritative persistence.

#### Bad
- Claude and Codex flows require new persistence behavior and parity fixtures.
- Projection logic must prevent native and canonical plan content from silently diverging.
- The workflow must define exactly when an approved plan artifact becomes durable.

---

## ADR-004: Bound the v1 Mutation Surface

### Status
Accepted

### Context
Tracker mutations are externally visible and harder to reverse than local workflow state. Comment, claim, close, labels, and transitions vary substantially by provider and create uncertain outcomes when a request times out after dispatch.

### Decision Drivers
- Explicit user intent for every external side effect.
- Minimal v1 surface backed by real callers and tests.
- Read-only, reproducible handoff and resume behavior.
- Clear separation between tracker lifecycle and workflow phases.

### Considered Options
1. Expose only explicit capture/create in v1.
2. Add comment, claim, and transition operations behind approvals.
3. Synchronize workflow phases with tracker lifecycle automatically.

### Decision Outcome
Chosen option: **only explicit capture/create in v1**, because it provides fast task capture while keeping select, handoff, resume, drift checks, and workflow completion free of implicit tracker mutation.

### Consequences

#### Good
- The external side-effect surface and ambiguous-commit risk are bounded.
- Workflow replay and resume cannot unexpectedly claim, comment on, or close an issue.
- Later mutations can be introduced with dedicated callers, approvals, receipts, and reconciliation tests.

#### Bad
- Users must update tracker lifecycle manually after workflow work.
- Frontier, claim-before-work, and automated completion patterns remain deferred.
- The provider contract may describe future capabilities that public v1 intentionally does not invoke.

---

## ADR-005: Use Transactional Local Markdown Records

### Status
Accepted

### Context
Local Markdown must remain human-readable and Git-friendly while tolerating concurrent agents in one worktree. Sequential identifiers, edit-in-place updates, or Git-only conflict detection can lose data before version control observes the conflict.

### Decision Drivers
- No lost update under concurrent access.
- Byte-exact transactional rejection and predictable recovery.
- Independent creates that merge cleanly in Git.
- No database or event-store dependency.

### Considered Options
1. One UUID record per issue with per-record lock, CAS, and atomic replace.
2. An append-only event journal with a materialized projection.
3. Plain Markdown files with Git as the only concurrency mechanism.

### Decision Outcome
Chosen option: **per-UUID records with per-record locks, compare-and-swap, and atomic replace on ordinary local filesystems**, because it provides understandable files and deterministic conflict handling without building an event store.

### Consequences

#### Good
- Concurrent updates either commit against the expected revision or fail with a typed conflict.
- Random stable identities reduce collisions and independent-create merge conflicts.
- Partial candidates are never published, and rejected operations can preserve bytes, permissions, and topology.

#### Bad
- Lock ownership, cleanup, flush, replacement, and failure injection require careful tests.
- Stale locks need operator intervention in v1; automatic lock theft is excluded.
- Network filesystems and semantic Git merge are not guaranteed, and same-record Git conflicts remain manual.

---

## ADR-006: Deliver Providers as Sequential Tracers

### Status
Accepted

### Context
Local Markdown and GitHub exercise different failure modes. Implementing both simultaneously combines filesystem transactions, authentication, pagination, rate limiting, transport choice, and uncertain hosted writes before the shared provider seam has conformance evidence.

### Decision Drivers
- Small, verifiable increments with fast feedback.
- Early validation of provider-neutral contracts.
- Isolation of local transaction failures from hosted network failures.
- Avoidance of a speculative multi-provider SDK.

### Considered Options
1. Deliver Local Markdown and GitHub together in one release.
2. Deliver the Local Markdown vertical tracer first, then GitHub under the same conformance contract.
3. Design a public SDK and implement multiple hosted providers before workflow integration.

### Decision Outcome
Chosen option: **Local Markdown first and GitHub second under one conformance contract**, because a deterministic offline tracer can stabilize references, errors, snapshots, and handoff before GitHub proves that the seam survives hosted-provider behavior.

### Consequences

#### Good
- Each increment has a focused acceptance surface and diagnosable failures.
- GitHub must conform to the established provider-neutral contract rather than define it implicitly.
- GitLab, Jira, and Linear remain future conformance tests instead of speculative v1 implementations.

#### Bad
- The first usable increment supports only one provider.
- The Local-first contract must be reviewed actively to avoid filesystem-specific abstractions.
- Hosted integration value arrives after the Local and handoff tracer is complete.
