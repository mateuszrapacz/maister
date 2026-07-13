# High-Level Design: Configurable Issue Tracker Workflow

## TL;DR
Maister adds a provider-neutral issue boundary as a small Node ESM helper with exact JSON, typed errors, and a declarative `CapabilitySet`.
Issues remain live in their tracker; workflows consume immutable snapshots and retain only a root `source_issue` provenance pointer in the unified workflow state.
Local Markdown is the first tracer, GitHub the second; v1 mutates trackers only through explicit capture/create.
Portable `.maister/plans/*.md` files are canonical quick-plan handoff artifacts, while host-native plan UI is a projection.

## Key Decisions
- Use one executable provider boundary instead of prose-only adapters or a command-template DSL — this centralizes validation, redaction, and cross-host semantics ([ADR-001](decision-log.md#adr-001-use-an-executable-provider-boundary)).
- Keep tracker data and workflow execution state under separate ownership, with root `source_issue` provenance after state-schema unification ([ADR-002](decision-log.md#adr-002-anchor-source-provenance-in-workflow-state)).
- Persist quick plans as portable Markdown artifacts on every host and treat native plan UI as a projection ([ADR-003](decision-log.md#adr-003-use-portable-quick-plan-artifacts)).
- Limit v1 mutations to explicit capture/create; handoff, resume, and drift checks remain read-only ([ADR-004](decision-log.md#adr-004-bound-the-v1-mutation-surface)).
- Give Local Markdown per-UUID records, per-record locks, compare-and-swap, and atomic replace only on ordinary local filesystems ([ADR-005](decision-log.md#adr-005-use-transactional-local-markdown-records)).
- Deliver Local Markdown first and GitHub second under the same conformance contract ([ADR-006](decision-log.md#adr-006-deliver-providers-as-sequential-tracers)).

## Open Questions / Risks
- The competing workflow-state schemas must be unified and fixture-tested before adding the root `source_issue` field; dual-read behavior is not part of this design.
- Local filesystem guarantees do not extend to network or distributed filesystems; unsupported environments must fail preflight with an actionable diagnostic.
- A GitHub create timeout after dispatch may remain `ambiguous_commit`; v1 must not blindly retry or switch transport.
- Cross-host fixtures must prove that canonical quick-plan content and native UI projections cannot silently diverge.
- Fully automatic Codex continuation remains unsupported until a host-native adapter, unified state schema, and end-to-end verification exist.

## Design Overview

Maister users need to capture work quickly and start research, planning, or development from an issue without turning workflow state into a second backlog. The design gives all supported hosts one auditable handoff model while preserving existing direct-text invocation and task-path resume.

The chosen architecture is a **layered provider boundary with immutable handoff snapshots**. A thin host-facing workflow delegates reference parsing, capability discovery, provider dispatch, exact JSON validation, error normalization, and redaction to a small **Node ESM boundary**. The live tracker remains authoritative for issue content and lifecycle, while Maister owns the captured input, phase decisions, and resume state. Provider support grows through sequential vertical tracers and a shared conformance contract rather than a speculative public SDK.

**Key decisions:**

- Provider differences are represented explicitly as `native`, `emulated`, `unsupported`, or `unknown`, with transport, permission, and constraint metadata.
- Handoff resolves and reads an issue once, persists an immutable snapshot before task initialization, and reports later drift without rewriting history.
- External writes require an explicit capture/create action; workflow start, resume, and completion have no implicit tracker side effects.
- Canonical plugin behavior is transformed into generated host variants; generated outputs remain projections rather than edit targets.

## Architecture

### System Context (C4 Level 1)

```text
[Software practitioner]
    | capture/select/start workflow through host-native skill UX
    v
[Maister Issue-to-Workflow System]
    | read/create through provider contract       | persist workflow provenance, snapshots, plans
    +--------------------------------------------> [Configured Issue Tracker]
    |                                              (Local Markdown or GitHub)
    |
    | execute research / quick-plan / development with immutable input
    v
[Maister Workflow Engine]
    | host-native invocation and presentation
    v
[Claude Code | Codex | Cursor | Kiro]
```

The practitioner invokes a host-native Maister skill, but the issue contract and handoff semantics are host-independent. Trackers own live issues; the workflow engine owns execution state and derived artifacts. Host surfaces render the same canonical behavior within their native constraints.

### Container Overview (C4 Level 2)

```text
[Host UX / Workflow Skills]
    | exact request envelope
    v
[Provider Boundary: Node ESM]
    | parse/refine ref  | capabilities  | typed result/error
    +-------------------+---------------+
    |                                   |
    v                                   v
[Local Markdown Provider]          [GitHub Provider]
    | locked CAS + atomic replace       | preselected REST/CLI transport
    v                                   v
[Local Issue Record Store]         [GitHub Issues API]

[Provider Boundary]
    | immutable normalized snapshot before initialization
    v
[Handoff Coordinator]
    | root source_issue pointer         | durable source block
    v                                   v
[Workflow State + Intake Artifacts] [Quick-Plan Artifact]
    |                                     |
    +--------------- resume/handoff ------+
                    v
             [Workflow Engine]

[Canonical Plugin + Platform Adapters] -- deterministic build --> [Host-Native Variants]
```

Container responsibilities:

- **Host UX / Workflow Skills:** expose configure, capture, list, show, select, and start-from-issue behavior with explicit user intent.
- **Provider Boundary:** enforce exact input/output contracts, normalize capabilities and errors, choose transport before dispatch, and redact secrets.
- **Provider Adapters:** translate the common contract to Local Markdown or GitHub without leaking vendor semantics into workflows.
- **Handoff Coordinator:** freeze the exact issue input, then initialize a workflow or durable plan transactionally.
- **Workflow Persistence:** retain provenance, snapshots, phase state, gates, and portable plan artifacts without mirroring tracker lifecycle.
- **Build Pipeline:** generate host-native projections from canonical behavior and validate semantic parity.

## Key Components

| Component | Purpose | Responsibilities | Key Interfaces | Dependencies |
|---|---|---|---|---|
| Issue Tracker Skill UX | Provides a consistent, explicit user journey across hosts. | Configure and preflight providers.<br>Capture exactly one issue.<br>List, show, and select bounded results.<br>Start a workflow from a selected issue. | Host-native skill/command invocation; exact request envelopes to Provider Boundary. | Canonical plugin model; host adapters; Provider Boundary. |
| Provider Boundary | Creates one fail-closed execution seam for all providers. | Parse canonical refs and unambiguous aliases.<br>Validate exact JSON schemas.<br>Discover capabilities and preselect transport.<br>Normalize typed errors and redact secrets. | `resolve`, `create`, `read`, bounded `list`, and `capabilities` operations. | Node.js runtime; validated project configuration; provider adapters. |
| Local Markdown Provider | Supplies an offline, reviewable first tracer with transactional behavior. | Manage UUID-backed records.<br>Validate containment, metadata, and symlink safety.<br>Use per-record locks and CAS.<br>Publish through same-directory atomic replacement. | Common provider operations and normalized result envelopes. | Ordinary local filesystem; Local Issue Record Store. |
| GitHub Provider | Proves the provider seam against a hosted tracker and network failures. | Resolve GitHub refs and URLs.<br>Create/read/list issues with PR guards.<br>Honor auth, pagination, rate, and version constraints.<br>Return `ambiguous_commit` when dispatch outcome is uncertain. | Common provider operations over one preselected REST or CLI transport. | GitHub Issues; external credentials kept outside repository config. |
| Handoff Coordinator | Converts a live issue into deterministic workflow input without tracker mutation. | Re-read and normalize the selected issue.<br>Persist ref, revision, digest, and immutable snapshot.<br>Initialize exactly one workflow or plan after snapshot success.<br>Report later drift read-only. | Provider Boundary; workflow initialization; snapshot and provenance contracts. | Unified workflow-state schema; Workflow Persistence. |
| Workflow Persistence | Separates execution truth from tracker truth. | Store root `source_issue` provenance pointer.<br>Keep snapshots and intake metadata immutable.<br>Retain phase/gate/resume state.<br>Persist canonical quick-plan handoff artifacts. | Workflow state contract; intake snapshot contract; plan handoff contract. | Local project filesystem; Handoff Coordinator; Workflow Engine. |
| Platform Build and Conformance | Preserves one product across Claude, Codex, Cursor, and Kiro. | Generate host-native variants from canonical sources.<br>Package helper resources and invocation adapters.<br>Run provider contract fixtures and host parity checks.<br>Reject generated drift. | Deterministic build and validation pipeline. | Canonical plugin; platform adapters; conformance fixtures. |

## Data Flow

### Capture flow

1. The user explicitly invokes capture and selects or confirms a configured provider and target.
2. The skill sends one exact request to the Provider Boundary; preflight validates configuration, target, capability, permissions, and transport before dispatch.
3. Local Markdown publishes a new UUID record transactionally, or GitHub performs one create through the preselected transport.
4. The provider returns a normalized result with a canonical `IssueRef`; uncertain hosted outcomes return `ambiguous_commit` and are not retried automatically.
5. Capture ends after reporting the result. It does not start a workflow or mutate tracker lifecycle metadata.

### Issue-to-workflow handoff flow

```text
Issue alias / canonical ref
    -> resolve and validate
    -> read live issue once at SourceRevision
    -> normalize untrusted content as data
    -> write immutable snapshot + ref/revision/digest
    -> commit root source_issue pointer or plan source block
    -> initialize research, quick-plan, development, or work classification
    -> later resume from workflow state; optional drift read only
```

If resolution, read, validation, or snapshot persistence fails before commit, no workflow task or state is created. For research and development, the unified workflow state is the sole resume authority and points to the captured artifacts. For quick-plan, the durable Markdown plan carries the source block and remains portable across hosts; native plan UI renders that artifact rather than becoming a second authority.

### Local update flow

Although public v1 exposes only create, the Local persistence protocol establishes safe record evolution: acquire the record lock, verify owner token and expected revision/digest, construct a full candidate, write and flush a same-directory temporary file, re-check ownership and CAS, atomically replace, then release only the owned lock. Rejection leaves bytes, permissions, and directory topology unchanged.

## Integration Points

| Integration | Direction | Contract and boundary behavior |
|---|---|---|
| Host-native skill surfaces | Inbound | Host syntax maps to the same configure/capture/list/show/select/start semantics; interactive decisions stay explicit. |
| Project configuration | Inbound | Non-secret provider configuration is validated with clear precedence and fail-closed preflight; credentials remain outside project files and logs. |
| Local filesystem | Outbound | Issue records use UUID identity, strict bounded metadata, containment checks, locks, CAS, and atomic replace only on supported ordinary local filesystems. |
| GitHub Issues | Outbound | A versioned REST contract or explicitly selected CLI transport supplies create/read/list; pagination, rate limits, auth, PR exclusion, and uncertain dispatch are normalized. |
| Workflow engine and state | Internal | Snapshot-before-init feeds research/development; root `source_issue` records provenance while workflow state remains the sole phase/resume truth. |
| Quick-plan workflow | Internal | Every host produces one canonical Markdown plan with source provenance; host UI is a projection. |
| Build and validation pipeline | Internal | Canonical behavior and adapters generate host variants; conformance and drift tests protect parity. |

## Design Decisions

| ADR | Decision | Architectural effect |
|---|---|---|
| [ADR-001](decision-log.md#adr-001-use-an-executable-provider-boundary) | Use an executable provider boundary. | Centralizes schema enforcement, capabilities, errors, redaction, and dispatch behavior. |
| [ADR-002](decision-log.md#adr-002-anchor-source-provenance-in-workflow-state) | Anchor source provenance in unified workflow state. | Keeps one resume/audit anchor while snapshots hold content and trackers hold live state. |
| [ADR-003](decision-log.md#adr-003-use-portable-quick-plan-artifacts) | Use portable quick-plan artifacts. | Makes plans auditable and transferable across all supported hosts. |
| [ADR-004](decision-log.md#adr-004-bound-the-v1-mutation-surface) | Bound v1 mutations to explicit capture/create. | Prevents handoff and resume from acquiring hidden external side effects. |
| [ADR-005](decision-log.md#adr-005-use-transactional-local-markdown-records) | Use transactional Local Markdown records. | Prevents lost updates and partial publication on supported local filesystems. |
| [ADR-006](decision-log.md#adr-006-deliver-providers-as-sequential-tracers) | Deliver providers as sequential tracers. | Stabilizes the common seam locally before adding hosted failure modes. |

## Concrete Examples

### Scenario 1: Local capture starts research

**Given** Local Markdown is configured on a supported local filesystem, **when** a user captures “Research cache strategy” and then starts research from the returned canonical ref, **then** exactly one UUID issue record is published, an immutable issue snapshot is committed before research initialization, root `source_issue` points to that snapshot, and the live issue is not claimed, commented on, or closed.

### Scenario 2: GitHub issue becomes a portable quick plan

**Given** GitHub preflight confirms repository access and read capability, **when** a user selects an existing issue and invokes quick-plan, **then** the issue is read once at a recorded revision, one canonical Markdown plan containing source provenance is produced, each host may project it in native UI, and no tracker mutation occurs.

### Scenario 3: Concurrent Local update is rejected safely

**Given** two agents read the same Local Markdown issue revision, **when** the first publishes an update and the second attempts an update with the stale revision, **then** the second receives a typed conflict, the first record remains byte-exact and valid, and no temporary file or foreign lock is removed.

## Out of Scope

- Comment, claim, close, label, transition, and completion receipts until a concrete caller, approval policy, and reconciliation tests exist.
- Bidirectional synchronization between tracker lifecycle and workflow phases.
- GitLab, Jira, and Linear providers until the Local and GitHub conformance contract stabilizes.
- A public or dynamic provider SDK before at least three providers and real external authors establish stable extension needs.
- Semantic merging of Local Markdown records, automated stale-lock theft, and distributed/network filesystem locking guarantees.
- Hosted offline mutation queues or silent transport fallback after write dispatch.
- Automatic snapshot refresh or silent merging of upstream issue changes.
- Fully automatic Codex continuation until host-native continuation and end-to-end state behavior are verified.

## Success Criteria

- The same conformance suite validates exact request/result envelopes, capabilities, typed errors, and bounded list behavior for both Local Markdown and GitHub.
- A failed handoff before commit creates zero workflow tasks and leaves existing state and artifacts byte-exactly unchanged.
- Successful research and development handoffs persist one immutable snapshot and one root `source_issue` pointer; resume uses only the unified workflow state.
- Every host produces a semantically identical canonical quick-plan artifact, and generated native projections pass parity fixtures.
- Concurrent Local updates either commit one revision-consistent result or return a typed conflict without partial writes, leaked temporary files, or unauthorized lock removal.
- Existing direct-text workflow invocation, existing task-path resume, and repositories without tracker configuration continue to behave unchanged.
- Canonical changes generate all host variants deterministically, and the full build plus validation gate reports no generated drift.
