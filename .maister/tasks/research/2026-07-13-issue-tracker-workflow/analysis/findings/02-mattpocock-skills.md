# Category 2 Findings: Installed `mattpocock/skills` Prior Art

## TL;DR

The installed skills implement tracker portability through repository-local prose in `docs/agents/issue-tracker.md`, not through a typed provider API. GitHub and GitLab are substantially specified; local Markdown is useful prior art but internally inconsistent and unsafe for concurrent writers. The flow has strong handoff patterns—role labels, durable briefs, dependency frontiers, claim-before-work—but setup, spec/tickets, triage, and implementation are composable skills rather than one enforced state machine. Maister should reuse those user-facing conventions while making provider capabilities, references, snapshots, validation, and workflow-boundary state explicit.

## Key Decisions

- **Recommendation (92% confidence):** Keep tracker configuration repository-local and human-readable, but replace open-ended operational prose with a validated canonical provider configuration plus provider-specific instructions or adapters.
- **Recommendation (94% confidence):** Treat tracker items as persistent intake and provenance. At workflow start, capture an immutable source snapshot and stable reference; thereafter keep execution, gates, resume, and audit state in the workflow's own `orchestrator-state.yml`.
- **Recommendation (90% confidence):** Reuse readiness roles, acceptance-criterion briefs, dependency edges, frontier selection, and claim-before-work semantics, but make every operation capability-discoverable and fail closed when unsupported.
- **Recommendation (96% confidence):** Do not copy the installed local Markdown write protocol as-is. Define stable IDs, one canonical layout, atomic conditional writes, and explicit conflict behavior first.

## Open Questions / Risks

- Should Maister v1 expose tracker mutation after handoff (claim/comment/close), or remain read-only after capture except through an explicit completion command?
- Is `ready-for-agent` a tracker-owned intake state, a guarantee that a durable brief exists, or both? The installed skills use all three interpretations.
- Should a completed Maister workflow automatically resolve its source issue, or only propose a provider-specific completion action for approval?
- Native dependency and sub-issue capabilities vary by provider and plan. A fallback body convention is useful, but the source of truth and conflict rule must be explicit.

## Scope and Evidence Basis

This analysis treats the installed files under `/Users/mrapacz/.agents/skills/` as authoritative. I read the setup skill and all of its tracker seed templates in full, along with `to-spec`, `to-tickets`, `triage`, `triage/AGENT-BRIEF.md`, `implement`, and the directly referenced `wayfinder`, `domain-modeling`, `grilling`, `tdd`, and `code-review` skills. No upstream repository was inspected, so there are no upstream-only observations or version-difference claims in this artifact.

Material claims are tagged as **Direct evidence**, **Inference**, or **Recommendation** and carry confidence according to `planning/research-plan.md` § “Confidence Rules.” Installed prose is direct evidence of the agent contract, but not proof that a vendor CLI currently supports every described command.

## 1. Setup and Repository-Local Configuration

### 1.1 Selection and persistence flow

**Direct evidence (98% confidence):** Setup is an interactive, prompt-driven scaffold rather than a deterministic installer. It:

1. Inspects remotes, root agent-instruction files, domain docs, `docs/agents/`, and `.scratch/`.
2. Walks the user through three decisions one at a time: tracker, triage label vocabulary, and domain-doc layout.
3. Proposes GitHub when a GitHub remote exists, GitLab for a GitLab remote, and otherwise offers GitHub, GitLab, local Markdown, or “Other.” “Other” is captured as free-form prose supplied by the user.
4. For GitHub/GitLab only, records whether external PRs/MRs are a triage request surface.
5. Shows drafts before writing.
6. Writes an `## Agent skills` discovery block to an existing root instruction file and writes `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md`.

Source: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md`, headings “Process,” “1. Explore,” “2. Present findings and ask,” “3. Confirm and edit,” and “4. Write.”

**Direct evidence (97% confidence):** Root instruction-file precedence is deterministic: edit `CLAUDE.md` if present, otherwise `AGENTS.md`; if neither exists, ask. Existing `## Agent skills` content is updated in place and surrounding user edits must be preserved. Source: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md`, “4. Write” → “Pick the file to edit.”

**Direct evidence (96% confidence):** Provider persistence is prose-by-copy:

- GitHub, GitLab, and local Markdown start from bundled seed templates.
- The selected template becomes `docs/agents/issue-tracker.md`.
- Other trackers are written from scratch using the user's paragraph.
- The generated root block points downstream skills at that document.

Source: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md`, “4. Write”; bundled templates `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md`, `issue-tracker-gitlab.md`, and `issue-tracker-local.md`.

### 1.2 Repository-local configuration analysis for Maister

**Direct evidence (99% confidence, observed 2026-07-13):** This repository is not currently configured for the installed skills. Both `/Users/mrapacz/Workspace/maister/CLAUDE.md` and `/Users/mrapacz/Workspace/maister/AGENTS.md` exist, but neither contains an `## Agent skills` block or a `docs/agents` reference; `docs/agents/` and `.scratch/` are absent. If the setup skill were run now, its precedence rule would target `CLAUDE.md`. This is analysis only; setup was not run and no configuration was written.

**Inference (94% confidence):** The root block is a discovery pointer, while `docs/agents/*.md` is the operational configuration. This is a strong low-dependency pattern: instructions are versioned with the repository, reviewable in diffs, and available to any agent that reads the root file. It is not, however, machine-validatable configuration.

**Recommendation (91% confidence):** Maister should preserve the same ownership and discoverability while separating data from guidance:

- `.maister/config.yml`: selected provider, provider key, project/repository identity, defaults, and capability policy.
- A canonical provider contract: normalized operations, references, results, errors, and capability discovery.
- Provider-specific guidance: optional prose for host/CLI details and escape hatches.
- Root instructions: a short pointer, not duplicated operational configuration.

### 1.3 Triage and domain configuration

**Direct evidence (98% confidence):** `docs/agents/triage-labels.md` maps five canonical state roles to repository-specific label strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. Source: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/triage-labels.md`, “Triage Labels.”

**Direct evidence (96% confidence):** Domain configuration records single- versus multi-context layout and tells consumers to use glossary vocabulary and surface ADR conflicts. Domain files are created lazily only when terms or decisions are resolved. Sources: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/domain.md`, “Before exploring, read these,” “Use the glossary's vocabulary,” and “Flag ADR conflicts”; `/Users/mrapacz/.agents/skills/domain-modeling/SKILL.md`, “File structure,” “Update CONTEXT.md inline,” and “Offer ADRs sparingly.”

**Weakness—direct evidence plus inference (95% confidence):** Triage requires exactly one category role (`bug` or `enhancement`) and one state role, but setup only configures the five state-role strings. It neither maps nor verifies category labels. Sources: `/Users/mrapacz/.agents/skills/triage/SKILL.md`, “Roles”; `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md`, “Section B — Triage label vocabulary”; `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/triage-labels.md`.

## 2. Implicit Provider Interface

The provider interface is encoded as phrases downstream skills are expected to interpret using `docs/agents/issue-tracker.md`. There is no schema, executable interface, declared capability set, or normalized error model.

### 2.1 Operation semantics

| Phrase / operation | Installed semantic contract | Evidence | Confidence |
|---|---|---|---:|
| `publish` | Materialize a spec, ticket, or map in the selected tracker and return/use its native identity. | All three tracker templates, “When a skill says ‘publish to the issue tracker’”; `to-spec` process step 3; `to-tickets` process step 5. | 98% |
| `fetch` / `read` | Retrieve the full work item; callers often also require comments, labels, author/dates, or a PR diff. | Tracker templates, “Conventions” and “fetch the relevant ticket”; `to-tickets` step 1; `triage` step 1. | 97% |
| `list` / query | Return open items filtered by state/label; triage additionally needs age and reporter-activity ordering. | GitHub/GitLab templates, “List issues”; `triage`, “Show what needs attention.” | 94% |
| `label` / role | Map canonical triage roles to provider labels or local `Status:` values; enforce one category and one state during triage. | `triage-labels.md`; `triage`, “Roles”; tracker templates, label operations. | 96% |
| `comment` | Append durable discussion, triage notes, briefs, or resolution answers; triage-generated external text starts with an AI disclaimer. | Tracker templates, “Conventions”; `triage`, opening disclaimer and “Apply the outcome.” | 98% |
| `close` | Transition an external item out of the open queue, sometimes after a required explanatory comment. | GitHub/GitLab templates, “Close”; `triage`, “Apply the outcome.” | 97% |
| `blocking` | Store directed “blocked by” edges, preferring native UI-visible relationships and falling back to body metadata. A child is unblocked when every blocker is closed/resolved. | Tracker templates, “Wayfinding operations”; `wayfinder`, “Tickets.” | 97% |
| `frontier` | Query open children, remove blocked and claimed items, and choose the first remaining item in map order. | Tracker templates, “Frontier query/Frontier”; `wayfinder`, “Tickets” and “Work through the map.” | 98% |
| `claim` | Perform the session's first write before work so concurrent sessions skip the item; remote providers use assignee, local uses `Status: claimed`. | Tracker templates, “Claim”; `wayfinder`, “Tickets” and “Work through the map.” | 99% |
| `resolve` | Record the answer, close/mark resolved, then append a gist/link context pointer to the parent map's decision index. | Tracker templates, “Resolve”; `wayfinder`, “Work through the map.” | 98% |
| reference resolution | Interpret native number, URL, or local path in repository context; distinguish issue from PR where required. | GitHub/GitLab templates, PR/MR sections; `triage`, “Invocation”; `to-tickets`, step 1. | 88% |

**Inference (91% confidence):** The minimum interface implied by all consumers is larger than CRUD. It includes `create`, `read-with-discussion`, `query`, `set-roles`, `comment`, `close`, `resolve-reference`, dependency operations, claim ownership, and capability/fallback selection. The installed templates leave this interface implicit, so each skill can silently assume a different subset.

### 2.2 Provider operation matrix

Legend: **Native** = explicitly backed by the provider CLI/native relationship; **Prose** = specified as file editing or convention; **Fallback** = native preferred but body metadata allowed; **Unspecified** = no usable contract in the installed template.

| Operation | GitHub template | GitLab template | Local Markdown template | Other / free-form |
|---|---|---|---|---|
| Create/publish | Native: `gh issue create` | Native: `glab issue create` | Prose: create under `.scratch/<feature-slug>/` | User-authored prose |
| Resolve reference | Repo inferred from remote; `#n` probed as PR then issue | Repo inferred; issue/MR number spaces separate, but caller must know surface | Path or “issue number”; resolution algorithm unspecified | Unspecified unless user writes it |
| Read item | Native: `gh issue view <n> --comments`; labels additionally required | Native: `glab issue view <n> --comments`, optional JSON | Prose: read referenced file | User-authored prose |
| List/search | Native list with state/label filters | Native list with label filters | Unspecified generally; directory scan only for wayfinder frontier | User-authored prose |
| Add/remove role label | Native `gh issue edit` | Native `glab issue update` | Prose: edit `Status:` line | User-authored prose |
| Comment | Native `gh issue comment` | Native `glab issue note` | Prose: append under `## Comments` | User-authored prose |
| Close | Native close with comment | Native note then close | No generic close operation; wayfinder uses `resolved` | User-authored prose |
| PR/MR request surface | Optional; external-author filter; shared issue/PR number space | Optional; external-author filter; separate issue/MR spaces | Not supported | User-authored prose |
| Parent/child | Native sub-issue, task-list/body fallback | `Part of #map`; optional epic mentioned | Map file plus child files | Unspecified |
| Blocking | Native issue dependency; `Blocked by:` fallback | Native blocking link on paid tiers; `Blocked by:` fallback | `Blocked by: NN, NN` line | Unspecified |
| Frontier | Query children, drop open blockers and assignees | Query children, drop open blockers and assignees | Scan ordered files; drop blocked/claimed | Unspecified |
| Claim | Assign `@me` | Assign `@me` | Set `Status: claimed` | Unspecified |
| Resolve | Comment, close, update map pointer | Note, close, update map pointer | Append `## Answer`, set resolved, update map pointer | Unspecified |
| Capability discovery | Implicit fallback prose only | Tier-dependent fallback prose only | Not defined | Not defined |
| Concurrency / idempotency | Delegated to provider; no idempotency contract | Delegated to provider; no idempotency contract | Not defined | Not defined unless user supplies it |
| Error/auth/offline behavior | Unspecified | Unspecified | Offline-capable by inference, but conflict behavior unspecified | Unspecified |

Sources: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md`, `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-gitlab.md`, and `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md`, especially “Conventions,” request-surface, publication/fetch, and “Wayfinding operations” headings. **Confidence: 95%** for template contents; **60%** that all vendor commands work unchanged today because current vendor docs/CLI behavior were intentionally outside this installed-file analysis.

## 3. Setup → Spec/Tickets → Triage → Implement Sequence

### 3.1 What is actually enforced

The installed skills support the following explicit sequence, but do not orchestrate it as one transactional pipeline:

```text
setup
  ├─ writes tracker + role + domain instructions
  ├─ conversation/codebase ── to-spec ──> published spec + ready-for-agent
  │                                      └─ to-tickets ──> approved vertical-slice tickets
  │                                                           + blocking edges
  │                                                           + ready-for-agent
  └─ incoming issue/PR ── triage ──> category/state + verification
                                   ├─ needs-info / wontfix / ready-for-human
                                   └─ ready-for-agent + authoritative agent brief

ready work / chosen frontier ticket ── implement ──> TDD + checks + code review + commit
```

#### Stage A — setup

**Direct evidence (98% confidence):** Setup establishes where items live, how canonical state roles map to tracker labels/status, and which domain docs downstream skills read. It does not test CLI installation, authentication, permissions, label existence, or provider operations. Source: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md`, “Process.”

#### Stage B — specification

**Direct evidence (96% confidence):** `to-spec` synthesizes existing conversation and codebase context without interviewing the user. It explores the codebase, agrees test seams with the user, writes a problem/solution/user-story/implementation/testing/out-of-scope spec, publishes it, and immediately applies `ready-for-agent` “with no need for additional triage.” Source: `/Users/mrapacz/.agents/skills/to-spec/SKILL.md`, “Process” and `<spec-template>`.

#### Stage C — tickets

**Direct evidence (98% confidence):** `to-tickets` accepts current context or fetches a referenced path/issue/URL with full body and comments. It drafts single-context-window tracer-bullet vertical slices, records blocking edges, quizzes the user until approved, then publishes blockers first so later edges can reference real IDs. Real trackers use native dependency/sub-issue relations when possible; tickets receive `ready-for-agent`. The parent issue is not modified or closed. Source: `/Users/mrapacz/.agents/skills/to-tickets/SKILL.md`, steps 1–5, `<tickets-file-template>`, and `<issue-template>`.

**Direct evidence (98% confidence):** The explicit implementation handoff is: “Work the frontier one ticket at a time with `/implement`, clearing context between tickets.” Source: `/Users/mrapacz/.agents/skills/to-tickets/SKILL.md`, final instruction.

#### Stage D — triage

**Direct evidence (97% confidence):** Triage is a separate intake state machine, not a mandatory post-publication phase. It gathers the full item, checks redundancy and prior rejection, recommends category/state, verifies the claim, optionally grills and updates the domain model, then applies an outcome. `ready-for-agent` posts an agent brief comment described as the authoritative implementation contract. Sources: `/Users/mrapacz/.agents/skills/triage/SKILL.md`, “Roles,” “Show what needs attention,” and “Triage a specific issue or PR”; `/Users/mrapacz/.agents/skills/triage/AGENT-BRIEF.md`, opening paragraphs and “Template.”

#### Stage E — implementation

**Direct evidence (95% confidence):** `implement` consumes whatever spec or ticket the user supplies, recommends TDD at pre-agreed seams, runs typechecks and focused/full tests, invokes code review, and commits to the current branch. Source: `/Users/mrapacz/.agents/skills/implement/SKILL.md`.

**Direct evidence (95% confidence):** Supporting quality contracts require behavior tests at agreed public seams and a red→green vertical-slice loop, then a two-axis review against repository standards and the originating spec. Sources: `/Users/mrapacz/.agents/skills/tdd/SKILL.md`, “What a good test is,” “Seams,” and “Rules of the loop”; `/Users/mrapacz/.agents/skills/code-review/SKILL.md`, “Process” and “Why two axes.”

### 3.2 Critical discontinuities

**Inference (97% confidence):** `to-spec`/`to-tickets` and `triage` define competing routes to `ready-for-agent`:

- `to-spec` applies readiness without additional triage.
- `to-tickets` says its tickets are agent-grabbable by construction.
- `triage` says a `ready-for-agent` item receives an authoritative agent brief.

Nothing requires generated specs/tickets to contain that brief, and nothing says whether a later brief supersedes the spec, ticket body, or comments. Sources: the three skills cited above.

**Inference (98% confidence):** `implement` is not tracker-aware. It does not resolve a reference, claim the item, check blockers, update status, post progress, close the item, or record a commit/PR link. Thus “frontier one ticket at a time” is a human/agent convention, not an enforced end-to-end workflow. Sources: `/Users/mrapacz/.agents/skills/to-tickets/SKILL.md`, final instruction; `/Users/mrapacz/.agents/skills/implement/SKILL.md` in full.

**Recommendation (92% confidence):** Maister should make handoff a named boundary operation: `start workflow from IssueRef`. It should validate readiness only if policy requires it, fetch and snapshot the source, optionally claim after explicit authorization, initialize workflow state, and record the source reference. Completion should be a separate, auditable provider operation rather than an implicit side effect of implementation.

## 4. Reusable Patterns

### 4.1 Patterns worth carrying forward

1. **Repository-local, reviewable configuration — direct evidence; recommendation (93% confidence).** The root pointer plus `docs/agents/*.md` keeps team decisions in version control and in agent discovery paths. Reuse the ownership model, adding schema validation and config versioning. Source: setup skill, “3. Confirm and edit” and “4. Write.”

2. **Canonical roles mapped to provider vocabulary — direct evidence; recommendation (94% confidence).** A stable semantic role such as `ready-for-agent` can map to an existing repository label. Extend the map to category roles and provider workflow states, and validate one-to-one/allowlisted values. Source: `triage-labels.md`; `triage`, “Roles.”

3. **Provider-neutral verbs with provider-specific realization — inference; recommendation (89% confidence).** “Publish,” “fetch,” “claim,” and “resolve” let workflow prose remain stable. Maister should retain the vocabulary but back it with typed requests/results and declared capabilities. Source: all three tracker templates.

4. **Native feature first, explicit fallback — direct evidence; recommendation (91% confidence).** GitHub/GitLab dependency guidance prefers native UI-visible edges and falls back to body metadata. This is a good capability-negotiation UX if the chosen representation and fallback reason are recorded. Source: GitHub/GitLab templates, “Wayfinding operations” → “Blocking.”

5. **Stable human display names wrapping native references — direct evidence; recommendation (88% confidence).** Wayfinder insists that humans see ticket names while IDs/URLs ride inside links. Keep a machine-stable `IssueRef` and a separate display title. Source: `/Users/mrapacz/.agents/skills/wayfinder/SKILL.md`, “Refer by name.”

6. **Dependency graph and frontier — direct evidence; recommendation (93% confidence).** “Open, unblocked, unclaimed” is a compact provider-independent definition of takeable work. It supports parallel agents when claim is the first write. Sources: wayfinder “Tickets” and tracker “Wayfinding operations.”

7. **Create first, wire second — direct evidence; recommendation (94% confidence).** Publishing blockers first and wiring edges after native IDs exist avoids fake references. Source: `to-tickets`, step 5; `wayfinder`, “Chart the map” step 4.

8. **Parent as index, child as detail — direct evidence; recommendation (90% confidence).** Wayfinder prevents duplicated decisions by keeping one detailed answer in its ticket and only a gist/link in the map. This is directly relevant to avoiding tracker/workflow duplication. Source: wayfinder, “The Map.”

9. **Durable behavioral handoff — direct evidence; recommendation (95% confidence).** Agent briefs specify current/desired behavior, interfaces, acceptance criteria, and scope without line numbers or implementation procedures. Maister specs and snapshots should preserve that structure. Source: `triage/AGENT-BRIEF.md`, “Principles” and “Template.”

10. **Explicit approval before ticket publication — direct evidence; recommendation (91% confidence).** `to-tickets` shows title, blockers, and delivered behavior, then iterates on granularity and edges with the user. This is a strong external-write gate. Source: `to-tickets`, step 4.

11. **Fresh-context, one-ticket execution — direct evidence; recommendation (86% confidence).** Tickets are sized for one context and the implementation handoff asks users to clear context between frontier items. Maister can translate this to one workflow task per external issue while using its own resume state inside that task. Sources: `to-tickets`, vertical-slice rules and final instruction; wayfinder, “Tickets.”

12. **AI disclosure for external triage writes — direct evidence; recommendation (84% confidence).** Triage requires every generated issue/comment to begin with a disclosure. Maister should make disclosure provider/policy configurable but preserve an auditable authorship marker. Source: `triage`, opening disclaimer.

## 5. Weaknesses and Underspecified Parts

| Gap | Evidence / impact | Strengthening recommendation | Confidence |
|---|---|---|---:|
| Prose is the provider API | Setup writes free-form operational instructions; downstream skills infer commands and fields. Typos or omissions cannot be validated. | Define normalized operations, typed results/errors, config schema/version, and capability discovery; retain prose only as guidance. | 97% |
| “Other” has no minimum contract | The user supplies one paragraph; setup does not require create/read/list/comment/label/close/reference semantics. | Require a provider checklist and reject configuration missing operations needed by enabled workflows. | 98% |
| No setup verification | Setup does not test CLI presence/version, auth, repository resolution, permissions, or labels. | Add read-only preflight plus explicit opt-in for label creation/external writes. | 96% |
| No canonical reference | GitHub relies on repo context and probes `#42`; GitLab requires surface knowledge; local accepts a path or number without an algorithm. | Use a provider-qualified, project-qualified, kind-qualified `IssueRef`, with short forms only when resolution is unambiguous. | 96% |
| Local layout contradiction | Local template says PRD at `.scratch/<feature>/PRD.md` and issues under `.scratch/<feature>/issues/NN-*.md`; `to-tickets` instead mandates one root `tickets.md`. | Select one canonical local model and contract-test all publishing consumers against it. | 99% |
| Local publish is ambiguous | “Create a new file under `.scratch/<feature-slug>/`” does not choose PRD vs issue name, allocate a number, or define required metadata. | Provider owns naming/ID allocation and returns the resulting stable reference. | 98% |
| Local status vocabularies collide | Generic triage uses a `Status:` line with role strings; wayfinder uses the same field for `claimed`/`resolved`. | Separate lifecycle fields, e.g. `triage_role`, `work_state`, and `claim`, with schema validation. | 98% |
| Local writes are race-prone | “First by number,” edit-in-place claim, and append operations have no lock, compare-and-swap, atomic rename, or collision retry. | Allocate collision-resistant IDs or locked monotonic IDs; write temp+atomic rename; claim conditionally on expected revision; report conflicts. | 99% |
| No idempotency or retry semantics | Create/comment/close sequences can partially succeed, especially resolve's three writes. | Give mutations idempotency keys and return partial-result/reconciliation data. | 95% |
| Dependency source-of-truth ambiguity | Native edge and body fallback are both described, but migration/divergence precedence is not. | Persist the selected representation and capability decision; never silently merge conflicting edge sets. | 94% |
| Read/list result shape is unstable | Consumers need different combinations of body, comments, labels, author, dates, diff, blockers, and assignee; no normalized result exists. | Define base `Issue` plus optional capability-specific expansions and pagination metadata. | 95% |
| Readiness meaning diverges | Specs/tickets become ready automatically; triage says ready has an authoritative brief. | Define readiness invariants and validate them before handoff. | 98% |
| Parent/spec/brief authority diverges | `to-tickets` does not modify parent; agent brief says it is authoritative; no supersession marker connects versions. | Store explicit `derived_from` and `supersedes` references; identify one current handoff artifact. | 94% |
| Implementation does not close the loop | `implement` commits but does not claim/update/resolve the source ticket. | Add explicit start/claim and completion/report commands around, not inside, workflow execution. | 99% |
| Automatic commit is broad | `implement` instructs committing the current branch without stating dirty-tree, approval, or branch safeguards. | Let Maister's normal development safety policy govern commits; never infer tracker handoff as commit authorization. | 91% |
| Local “resolve” is not fully local | It requires a “gist + link” pointer without defining gist storage, availability, or offline fallback. | Link repository-local workflow artifacts or a provider-neutral artifact reference; external publication must be optional. | 96% |
| Comments lack durable metadata locally | Append-only comments have no required author, timestamp, ID, escaping, or concurrent merge rules. | Use structured frontmatter/records and atomic append or one-comment-per-file storage. | 95% |
| Security is absent | Templates do not discuss credential storage, command injection, untrusted issue text, path traversal, or secret redaction. | Keep credentials outside repo config; validate refs/paths; use argument arrays/structured APIs; treat fetched text as untrusted content. | 97% |
| Vendor behavior is assumed | Templates prescribe CLI commands and plan-dependent features but do not pin versions or run capability checks. | Treat installed prose as intent; verify provider behavior at runtime and degrade explicitly. | 91% |

## 6. Concrete Mapping to Maister Semantics

### 6.1 State ownership

**Direct project constraint (100% confidence):** Issue tracking is persistent intake; `.maister/tasks/**/orchestrator-state.yml` becomes authoritative only after a workflow begins and must remain execution/resume state. Sources: `/Users/mrapacz/Workspace/maister/.maister/tasks/research/2026-07-13-issue-tracker-workflow/planning/research-brief.md`, “Key Decisions” and “Scope”; `planning/research-plan.md`, “Research Objective.”

**Recommendation (94% confidence):** At handoff, materialize four distinct things:

| Concern | Owner | Stored in workflow? | Rationale |
|---|---|---|---|
| Current title/body/comments/labels | Tracker | Immutable normalized snapshot, captured time, and content hash | Reproducible input even if tracker changes later |
| Stable identity and URL | Tracker/provider | Canonical `IssueRef` plus provider/project/native ID | Provenance and later refresh/reporting |
| Readiness, assignee, provider status | Tracker | Snapshot only; optionally refresh and show drift | Avoid mirroring mutable backlog state |
| Phases, gates, attempts, decisions, artifacts, verification | Maister workflow | Authoritative in `orchestrator-state.yml` and task artifacts | Resume and audit are workflow concerns |
| Completion comment/close | Tracker | Operation receipt in audit state, not replicated status | External mutation is explicit and retryable |

This follows the useful wayfinder principle that an index points to detail rather than duplicating it, while making a captured source reproducible. Source prior art: `/Users/mrapacz/.agents/skills/wayfinder/SKILL.md`, “The Map.”

### 6.2 Installed semantics → Maister semantics

| Installed concept | Maister mapping | Boundary rule |
|---|---|---|
| Repository-local tracker prose | Validated provider config in `.maister/config.yml` plus provider guidance | Config selects behavior; prose does not define executable semantics alone. |
| Native issue/path/URL | Canonical `IssueRef` accepted by capture/show/start commands | Resolve before creating workflow state; fail on ambiguity. |
| Triage `ready-for-agent` | Optional intake precondition/policy | Never encode it as a workflow phase or completion state. |
| Agent brief/spec/ticket body | Source snapshot and initial task description | Record which artifact is authoritative at capture time. |
| `to-spec` | Research/design output or a planning input published back to tracker | Publication is optional external output, not workflow state. |
| `to-tickets` blocking graph | External backlog/dependency graph | Do not replace development phase/task-group state; each selected ticket can start its own workflow. |
| Frontier query | Candidate-selection UX before workflow start | Claim only after selection and explicit write authorization. |
| Claim-before-work | Conditional provider mutation at workflow initialization | Store claim receipt; if claim conflicts, do not start or ask to proceed unclaimed. |
| `/implement` | `$maister:development` | Maister retains specification, approval, implementation, verification, resume, and audit semantics. |
| Local comments/resolution answer | Workflow artifacts plus optional completion report/comment | Tracker receives a concise pointer; detailed artifacts remain in the task directory. |
| Closed/resolved tracker item | Intake lifecycle | Never infer that `orchestrator-state.yml` is complete solely from tracker status, or vice versa. |

**Direct evidence (98% confidence):** Maister research creates a task directory containing `orchestrator-state.yml`, planning artifacts, per-category findings, synthesis, and outputs. It can resume by task path and phase. Source: `/Users/mrapacz/Workspace/maister/plugins/maister/skills/research/SKILL.md`, “Task Structure,” “Integration with Other Workflows,” and “Command Integration.”

**Direct evidence (97% confidence):** Maister development can ingest a completed research directory, copy/read research context, set a research reference, and use research to inform rather than skip its own phases. Source: `/Users/mrapacz/Workspace/maister/plugins/maister/skills/development/SKILL.md`, “Initialization” → “Detect Research Context,” and “Research-Based Development.”

**Direct evidence (95% confidence):** Quick plan takes a task description, applies repository standards, and requires plan approval before implementation. It does not define a persisted tracker or orchestration state. Source: `/Users/mrapacz/Workspace/maister/plugins/maister/skills/quick-plan/SKILL.md`, “Workflow.”

### 6.3 Explicit journey mapping

#### Journey 1 — setup → issue → research

1. Configure provider repository-locally and validate read/create capabilities.
2. Capture or select an issue and resolve it to canonical `IssueRef`.
3. Fetch full normalized content, record the source revision/time, and create a workflow-local snapshot.
4. Invoke `$maister:research` with the snapshot's task question and source metadata.
5. From this point, `orchestrator-state.yml` is the resume authority; tracker changes appear as optional drift, not hidden input mutation.
6. Optionally publish the research report link as a comment after an explicit external-write gate.

**Recommendation confidence: 92%.** It combines installed publish/fetch conventions with Maister's existing research task structure and state boundary.

#### Journey 2 — issue/spec → quick plan

1. Resolve and snapshot the issue or published spec.
2. Feed the snapshot's authoritative brief into `$maister:quick-plan` as the task description/context.
3. Include source reference and captured acceptance criteria in the plan; apply relevant `.maister/docs` standards.
4. Approval remains quick-plan's gate. The tracker remains the owner of backlog/readiness state.
5. If implementation follows, start development with the approved plan and the same source provenance rather than reinterpreting a mutable issue silently.

**Recommendation confidence: 86%.** Quick plan's current skill has no durable workflow task directory, so exact snapshot persistence needs a product decision.

#### Journey 3 — ready ticket/frontier → development → resume/audit

1. Query the tracker frontier if supported; select a ticket.
2. Conditionally claim it as the first external write. A failed/conflicting claim stops or requires an explicit override.
3. Snapshot the authoritative ticket/brief and initialize `$maister:development` with `IssueRef`, source revision, and acceptance criteria.
4. Development performs its own analysis, specification, approval, implementation, and verification; tracker blocking/readiness does not masquerade as phase state.
5. Resume always targets the Maister task directory and `orchestrator-state.yml`, even if the source issue has changed or closed.
6. Final audit records the source, snapshot, claim receipt, workflow decisions, verification, and any explicit completion mutation. Closing/commenting is idempotent and separately authorized.

**Recommendation confidence: 94%.** This preserves the installed claim/frontier UX and Maister's stronger execution/resume/audit model.

### 6.4 Why this avoids duplicated state

**Inference (95% confidence):** Duplication is avoided by distinguishing a historical snapshot from a mutable replica. The snapshot answers “what input did this workflow act on?”; `IssueRef` answers “where did it come from?”; tracker fetch answers “what is true upstream now?”; `orchestrator-state.yml` answers “where is this workflow now?” These are different facts and should not overwrite one another.

**Recommendation (93% confidence):** If the upstream issue changes after initialization, show a structured drift summary and offer refresh/restart/continue choices. Never silently rewrite accepted requirements or workflow state.

## 7. Answers to the Exact Category 2 Questions

1. **Selection/persistence:** Interactive setup detects remotes and existing conventions, asks tracker/PR-surface/label/domain decisions one at a time, previews drafts, then persists a root pointer plus three repository-local prose documents. GitHub/GitLab/local use templates; other trackers use free-form prose.
2. **Implicit interface:** The phrases encode create, resolve-reference, read-with-discussion, list/filter, role-label mutation, comment, close, dependency, frontier, claim, and multi-write resolution operations. Capabilities and errors are implicit.
3. **Flow:** Conversation can become a ready spec, then approved blocker-first vertical-slice tickets; incoming items can independently pass triage into an authoritative brief; implementation consumes selected work with TDD/review/commit. No skill enforces the entire chain or closes the tracker loop.
4. **Reusable conventions:** Repository-local discovery/config, canonical roles mapped to labels, provider-neutral verbs, native-plus-fallback relationships, human titles with machine refs, parent/child provenance, blocker frontiers, first-write claims, durable behavioral briefs, and explicit publication approval.
5. **Avoid/strengthen:** Replace unvalidated prose as executable contract, ambiguous refs, conflicting local layouts/status fields, non-atomic local writes, undefined idempotency/errors/security, unclear authority/readiness, and missing implementation completion integration.
6. **Maister mapping:** Use tracker items for intake and provenance; snapshot once at research/plan/development initialization; keep external lifecycle in the tracker and workflow execution/resume/audit in `orchestrator-state.yml`; synchronize only through explicit, receipted boundary operations.
