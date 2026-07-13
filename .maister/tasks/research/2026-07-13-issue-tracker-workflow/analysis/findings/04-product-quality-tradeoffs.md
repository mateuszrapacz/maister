# Category 4 Findings: Product Quality Trade-offs

## TL;DR

Use a small executable provider boundary with declarative capabilities; ship local Markdown and GitHub first. Handoff should persist a canonical `IssueRef`, an immutable normalized snapshot, and its revision—not a live mutable copy. Local Markdown needs random stable IDs, same-directory atomic publication, per-issue locks, and optimistic revision checks. Treat issue content as untrusted data, keep credentials outside repository configuration, and require explicit confirmation for external writes.

## Key Decisions

- **Recommendation (confidence: 86%, medium):** v1 should combine a canonical `IssueRef`, immutable captured snapshot, normalized fields, and source revision; `orchestrator-state.yml` remains workflow execution/resume state.
- **Recommendation (confidence: 84%, medium):** use a small executable provider helper with a strict normalized contract and capability discovery, while preserving provider-specific escape hatches outside the common workflow path.
- **Recommendation (confidence: 90%, high):** local issue identity must not depend on a slug or next sequential number; use an opaque random ID and treat the title slug as presentation only.
- **Recommendation (confidence: 91%, high):** project configuration may name credentials but must never contain them; external writes require an explicit operation and validated target.
- **v1 scope:** capture, list, show, select, and handoff; local Markdown plus GitHub; read-only drift checks; mocked external tests; direct-prompt workflows remain supported.
- **Later scope:** bidirectional synchronization, comments/status/labels from workflows, webhooks, user-global defaults, provider plugins, native dependency graphs, and automated stale-lock recovery.

## Open Questions / Risks

- The exact user-facing command names and canonical `IssueRef` grammar must be reconciled with Category 1 and Category 3 findings; this document specifies required behavior, not a final parser syntax.
- Product choice: whether an interactive first use may offer one-step local setup or must always stop and direct the user to `$maister:init`.
- Product choice: whether a workflow may refresh its snapshot after initialization. The safer v1 posture is an explicit refresh that archives the previous snapshot and never silently changes active workflow context.
- Filesystem guarantees vary on network filesystems. v1 should define support for ordinary local filesystems and fail with a diagnostic when lock or atomic-replace assumptions cannot be established.
- Git merge conflicts cannot be made atomic by the local provider. They must be detected and surfaced for human resolution.

## Evidence Labels and Confidence

- **Direct evidence** describes current repository behavior, tests, standards, or installed prior art.
- **Inference** connects direct evidence to the proposed tracker boundary.
- **Recommendation** is a product or architecture choice.
- Confidence follows `planning/research-plan.md` § **Confidence Rules**: high is 90–100%, medium is 60–89%, and low is below 60%.

External security sources were accessed on **2026-07-13**. They are official OWASP or GitHub documentation.

## 1. Minimum UX and Complete User Journeys

### 1.1 Minimum command vocabulary

**Recommendation (confidence: 82%, medium):** expose one issue-intake surface with these behavioral operations. Names may be rendered as host-native skills or commands, but their semantics should remain stable.

| Operation | Explicit use | Interactive use | v1 behavior |
|---|---|---|---|
| Capture | `issue capture "title" [--body ...] [--provider P]` | Prompt for provider only when selection is genuinely ambiguous; collect title and optional body | Create exactly one issue and return its canonical `IssueRef`; no workflow starts implicitly |
| List | `issue list [--provider P] [--status open] [--limit N]` | Show a bounded numbered list and provider/status for each item | Read-only; stable ordering; state when results are incomplete/offline |
| Show | `issue show <IssueRef>` | Show the chosen list item | Read-only normalized fields plus provider-specific URL/path and freshness metadata |
| Select | `issue select [filters]` | Numbered choice from bounded results | Return one `IssueRef`; cancellation performs no write |
| Handoff | `research --issue <IssueRef>`, `quick-plan --issue <IssueRef>`, `development --issue <IssueRef>`, or unified `work <IssueRef>` | After show/select, ask which workflow to start | Resolve, snapshot, initialize one workflow task, and record provenance |

This separates persistent intake from workflow execution, matching the research brief § **Key Decisions** and project architecture § **Persistence Model**. Existing workflows already accept direct task descriptions and create their task directories/state (`plugins/maister/skills/research/SKILL.md` § **Initialization**, `plugins/maister/skills/quick-plan/SKILL.md` § **Workflow**, `plugins/maister/skills/development/SKILL.md` § **Initialization**); the issue path should be additive, not a replacement. **Direct evidence (confidence: 96%, high).**

The installed prior art uses repository-local tracker instructions and explicit publish/fetch vocabulary rather than conflating tracker state with execution: `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md` § **Section A — Issue tracker**, and the three templates’ headings **When a skill says “publish to the issue tracker”** / **When a skill says “fetch the relevant ticket”**. **Direct evidence (confidence: 95%, high).**

### 1.2 Journey A — interactive local capture to research

**v1 must-have; recommendation (confidence: 88%, medium).**

1. User invokes issue capture with no provider and no title in an interactive host.
2. Resolution finds one valid project default, `local`; if multiple providers are configured without a default, the UI asks the user to choose. No guessing from Git remotes occurs after providers are explicitly configured.
3. UI asks for a required title and optional body. It previews `provider=local` and repository-local destination; cancellation leaves files and directories unchanged.
4. Provider allocates an opaque ID, derives a bounded display slug, publishes one complete Markdown record atomically, and returns a canonical `IssueRef` plus local path.
5. UI offers read-only show, start workflow, or stop. User selects research.
6. Handoff re-reads the issue under revision protection, writes `source/issue-ref.yml` and an immutable `source/issue-snapshot.md` (or equivalently structured files) inside the new research task, then initializes `orchestrator-state.yml` with a pointer/digest to that snapshot.
7. Research starts from the snapshot as untrusted source material. Later edits to the local issue do not rewrite active research context; show/resume can report “source changed since capture.”

The installed local template’s `.scratch/<feature>/issues/<NN>-<slug>.md` and “first by number wins” conventions demonstrate a usable simple journey, but sequential IDs and in-place `Status:` edits are not concurrency-safe (`/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md` § **Conventions** and § **Wayfinding operations**). **Direct evidence plus inference (confidence: 93%, high for the limitation).**

### 1.3 Journey B — explicit GitHub capture/select to quick planning

**v1 must-have; recommendation (confidence: 85%, medium).**

1. User runs explicit capture with `--provider github`, title, and body. The command resolves the configured owner/repository; it does not infer a different target from an unrelated current directory.
2. Before the network write, Maister validates the repository allowlist, authentication availability, requested capability, and body size, then shows the target in interactive mode. The operation performs one create request and returns a fully qualified `IssueRef` and URL.
3. Alternatively, user runs bounded `issue list --provider github --status open`, then `issue show <ref>` or interactively selects one result. List/show are read-only and can degrade to an actionable offline/auth error.
4. User invokes quick plan with `--issue <ref>`. A full provider-qualified ref is authoritative; a conflicting `--provider local` is rejected before reads or writes.
5. Handoff fetches the issue once, normalizes fields, records native revision/freshness data, writes an immutable snapshot, and starts quick planning from the normalized objective/body.
6. Quick plan remains behaviorally compatible with direct task text; after approval it follows its existing implementation/verification flow rather than using tracker status as execution state (`plugins/maister/skills/quick-plan/SKILL.md` § **Workflow**).

The GitHub prior-art template demonstrates explicit create/read/list and the ambiguity of bare GitHub numbers because issues and PRs share a number space (`/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md` § **Conventions** and § **Pull requests as a triage surface**). **Direct evidence (confidence: 94%, high).**

### 1.4 Journey C — existing reference to development with provenance

**v1 must-have; recommendation (confidence: 87%, medium).**

1. User invokes development or unified work with a full `IssueRef`; no capture occurs.
2. Parser validates provider, repository/project namespace, issue kind, and native ID before provider invocation. An unknown provider, ambiguous bare number, or namespace mismatch fails closed with examples of valid references.
3. Provider resolves and reads the issue. If offline and no explicit cached snapshot was selected, initialization stops without creating a task. A later capability may permit `--snapshot <path>` offline handoff.
4. Maister displays source, title, current tracker status, and snapshot timestamp. In an interactive host, starting the workflow is the only approval; no tracker mutation is implied.
5. Development task initialization stores ref + snapshot + revision and then creates normal workflow state. `orchestrator-state.yml` owns phase/gate/resume semantics; tracker status remains live tracker data.
6. During resume, Maister may perform a read-only revision check. If changed, it warns and links/show diffs; it does not rewrite the task objective, reset phases, close the issue, or post comments.
7. Completion reports the source reference and workflow result locally. Updating/closing the external issue is a separate explicit command with a target preview and confirmation.

Current unified work already distinguishes new descriptions from task folders containing `orchestrator-state.yml` and routes resume from that state (`plugins/maister/commands/work.md` § **Usage**, § **Step 1: Parse Input and Detect Task Folder**, and § **Step 2: Resume Existing Task**). Development can also derive task context from an existing research folder (`plugins/maister/skills/development/SKILL.md` § **Initialization**). **Direct evidence (confidence: 96%, high).**

### 1.5 Journey D — explicit non-interactive list/show/select

**v1 must-have; recommendation (confidence: 83%, medium).**

1. Automation runs `issue list --provider local --status open --limit 20 --format json`.
2. Output contains schema version, provider, canonical refs, normalized summaries, and `complete: true|false`; diagnostics go to stderr.
3. Automation passes one returned ref to `issue show --format json`, checks the revision, then starts a workflow with that exact ref.
4. If configuration is ambiguous, results exceed a required deterministic bound, or the selected ref disappeared, the command exits nonzero and makes no mutation. Non-interactive execution never opens a prompt or silently chooses the first item.

This mirrors the executable continuation boundary’s JSON-only stdout, stderr diagnostics, exact schema checks, and non-mutation on invalid input in `tests/phase-continue-contract.test.sh` functions `test_valid_stdin`, `test_exact_schema_validation`, and `test_validation_channels_and_immutability`. **Direct precedent and recommendation (confidence: 93%, high).**

## 2. Domain Glossary

**Recommendation (confidence: 90%, high):** use distinct tracker-intake and workflow-execution terms. The architecture’s no-database persistence model and authoritative workflow state make this separation essential (`.maister/docs/project/architecture.md` § **Persistence Model**).

| Term | Owned by | Definition and invariant |
|---|---|---|
| `Issue` | Tracker context | The provider’s current, mutable work item as read now. It is normalized for consumption but remains tracker-owned. It is not a workflow and is not authoritative for resume. |
| `IssueRef` | Intake boundary | Immutable, canonical locator containing provider, namespace/repository, kind, and native ID. It identifies an issue but does not promise that it currently exists or is accessible. |
| `TrackerProvider` | Provider layer | Adapter implementing validated operations and declaring capabilities. Provider-specific terms are translated at this anti-corruption boundary. |
| `ProviderCapability` | Provider layer | A discoverable operation/feature with semantics, e.g. `read`, `create`, `list`, `update`, `comment`, `labels`, `state`, `native_dependencies`. Absence is data, not an exception or emulation promise. |
| `CapturedSnapshot` | Workflow task source | Immutable, time-stamped representation used to initialize a workflow: ref, selected normalized fields, native URL/path, capture time, source revision, and digest. Its content is untrusted data. |
| `SourceRevision` | Provider/intake boundary | Provider-native version token when available (ETag/update timestamp/object ID) or a deterministic content digest. Used for drift detection and compare-before-update, not as issue identity. |
| `WorkflowTask` | Workflow context | One research/planning/development execution directory under `.maister/tasks/`, including artifacts and source provenance. Multiple workflow tasks may originate from one issue. |
| `WorkflowState` | Orchestrator | `orchestrator-state.yml`: authoritative phase, gate, attempt, audit, and resume state after task initialization. It never serves as the backlog. |
| `TrackerStatus` | Tracker context | Provider-normalized lifecycle such as open/closed, plus native state. It must not be called workflow status. |
| `PhaseStatus` | Orchestrator | Workflow execution status such as pending/in-progress/completed/blocked. It never automatically changes `TrackerStatus`. |
| `Handoff` | Integration boundary | Read-only resolve + capture + workflow initialization operation that turns one `IssueRef` into one workflow task with provenance. Handoff is not synchronization. |
| `Drift` | Integration boundary | The live issue’s current revision differs from the captured source revision. Drift is surfaced, never silently merged into an active workflow. |

The vocabulary is an anti-corruption layer in the sense of `.maister/docs/standards/global/language-md-convention.md` § **Relationship Types**: vendor words such as GitLab “note,” GitHub “comment,” PR/MR, and native dependency links should not leak into core workflow semantics. The installed GitHub and GitLab templates visibly use different words and number spaces, confirming the need (`issue-tracker-github.md` / `issue-tracker-gitlab.md` § **Conventions**). **Direct evidence and inference (confidence: 92%, high).**

## 3. Tracker-vs-Workflow Ownership and Snapshot Policy

### 3.1 Ownership model

| Data/behavior | Tracker owns | Captured snapshot owns | Workflow task owns | `orchestrator-state.yml` owns |
|---|---:|---:|---:|---:|
| Canonical locator and native URL/path | Live resolution | Exact ref/URL used at capture | Pointer to source files | Snapshot path/digest only |
| Title/body/acceptance context | Current mutable value | Immutable captured value | Derived objective and authored artifacts | No backlog copy |
| Labels, assignees, comments, dependencies | Yes | Optional normalized values as-of capture | No live authority | No |
| Tracker open/closed/native state | Yes | Value as-of capture | No | No |
| Source revision/capture time/digest | Current revision | Yes | Source audit files | Pointer/digest may be recorded |
| Workflow phases, attempts, gates, decisions | No | No | Artifacts/reports | Sole resume/audit authority |
| External mutations | Explicit provider command | Never | May propose a mutation | Never implicitly performs it |

**Direct evidence (confidence: 98%, high):** `.maister/docs/project/architecture.md` § **Persistence Model** says there is no database and `orchestrator-state.yml` is the only resume source of truth; the research brief § **Key Decisions** explicitly excludes backlog ownership from it.

### 3.2 What initialization stores

**Recommendation (confidence: 86%, medium): store the combination, not one alternative.**

- `IssueRef`: durable provenance and future re-resolution.
- Immutable snapshot: reproducibility when the issue changes, disappears, becomes private, or the provider is offline.
- Selected normalized fields: workflow-friendly input without importing provider-specific schemas. At minimum: title, body, tracker status, labels, URL/path, created/updated timestamps when available.
- Source revision and digest: drift detection and integrity checks.
- Capture metadata: provider version/capabilities used, capture timestamp, and whether fields were unavailable/truncated.

Ref-only is not reproducible; snapshot-only loses provenance and freshness; normalized-fields-only may omit evidence needed later. The project vision requires safe, auditable, resumable workflows and exact state provenance (`.maister/docs/project/vision.md` § **Purpose**). **Inference (confidence: 93%, high).**

### 3.3 Later tracker changes

**v1 behavior:** compare revisions on explicit show/refresh and optionally at resume if the provider is reachable. Report `unchanged`, `changed`, `deleted/inaccessible`, or `unknown/offline`. Do not block normal resume merely because the freshness check is unavailable; clearly label that the workflow is using its captured snapshot. Do block explicit external update when expected revision differs. **Recommendation (confidence: 87%, medium).**

An explicit refresh should archive the prior snapshot, create a new immutable snapshot, record who/when/why, and ask the workflow to reconcile; it must not rewrite completed decisions. Automatic bidirectional synchronization is **later**, because it introduces two-writer conflict semantics and violates minimal-implementation guidance (`.maister/docs/standards/global/minimal-implementation.md` § **No Speculative Abstractions**). **Recommendation (confidence: 91%, high).**

## 4. Configuration Precedence and Failure Behavior

### 4.1 Recommended v1 configuration ownership

- Store non-secret project configuration under the existing `.maister/config.yml`: enabled providers, one optional default, local root, and fixed external namespace/repository allowlists.
- Store credentials only in provider-native authenticated CLIs, host credential stores, environment variables, or secret managers. Configuration may contain an allowlisted environment-variable *name*, never its value.
- Do not add a user-global default in v1. Repository-local configuration is deterministic across hosts and follows installed precedent (`/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md` § **Write**), while `.maister/config.yml` is already the project-local policy surface (`.maister/docs/project/architecture.md` § **Configuration**).

**Recommendation (confidence: 89%, medium).**

### 4.2 Selection precedence

Apply this order and stop at the first decisive, valid source:

1. A fully qualified `IssueRef` determines provider and namespace for operations on that ref.
2. Explicit command override `--provider P` determines provider for capture/list or unqualified input. If it conflicts with a full ref, reject; do not reinterpret the ref.
3. Project `tracker.default_provider` when it names exactly one enabled provider.
4. If exactly one provider is enabled, use it as the unambiguous effective provider.
5. If multiple are enabled without a default, interactive hosts ask; non-interactive hosts fail with provider names and the exact override syntax.
6. If none is configured, fail with setup guidance. An interactive one-step “configure local” offer is an unresolved product choice and must be confirmed before writing config.

Never choose a provider from a Git remote once explicit tracker configuration exists. Remote inference is acceptable only during setup as a recommendation, matching installed setup prior art (`setup-matt-pocock-skills/SKILL.md` § **Explore** / **Section A — Issue tracker**). **Recommendation (confidence: 92%, high).**

### 4.3 Validation and failure semantics

| Condition | Required behavior |
|---|---|
| Duplicate keys, aliases/anchors, noncanonical managed shape, unknown provider, contradictory overrides | Reject before any read/write; identify exact field and accepted values |
| Missing default with multiple providers | Ask only if interactive; otherwise fail without choosing |
| Missing credentials | Read-only local operations remain available; external operation fails with provider-specific login guidance, without printing tokens |
| Unsupported capability | Return a typed `unsupported_capability` result; do not emulate a write through prose or silently drop fields |
| Provider offline/rate-limited | Preserve local state; return retryability and safe retry guidance; never switch providers |
| Invalid repository/URL/ref | Reject via allowlist and canonical parser before subprocess/network/filesystem access |
| Setup/reconciliation failure | Preserve complete original bytes, modes, and directory topology; name recovery artifacts only if rollback itself fails |

This follows `.maister/docs/standards/global/validation.md` § **Validate Early**, **Allowlists Over Blocklists**, and **Consistent Enforcement**, plus `.maister/docs/standards/global/error-handling.md` § **Clear User Messages**, **Fail Fast**, and **Graceful Degradation**. Existing configuration tests reject ambiguous/unsafe YAML unchanged and preserve bytes/modes (`tests/advisor-config-reconciliation.test.sh` cases 5–9); lifecycle tests prove contradictory flags fail before mutation and second-artifact failures restore exact YAML/TOML state (`tests/advisor-init-lifecycle.test.sh` cases 1, 6, 8–13). **Direct precedent (confidence: 98%, high).**

## 5. Local Markdown Persistence and Concurrency Design

### 5.1 Record and identity design

**Recommendation (confidence: 92%, high):** use an opaque random ID generated by a built-in cryptographic primitive (for example UUIDv4), independent of title and creation order. A possible layout is `.maister/issues/<id>.md`; a sanitized slug may appear in frontmatter or a derived index, but never participates in lookup authority.

Each canonical record should have strict, bounded frontmatter: schema version, ID, title, tracker status, created/updated timestamps, integer revision, and optional normalized labels; body follows as Markdown. Reject duplicate keys, aliases, unsupported types, NULs, invalid UTF-8, conflict markers in managed metadata, and files whose frontmatter ID differs from the filename. Preserve unknown body content verbatim.

Why not sequential `NN-slug`? The installed local template allocates numbers from `01` and scans “first by number,” which races when multiple sessions create tickets (`/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md` § **Conventions** / **Frontier**). The wayfinder skill explicitly warns that unblocked tickets may be worked in parallel (`/Users/mrapacz/.agents/skills/wayfinder/SKILL.md` § **Work through the map**). **Direct evidence and inference (confidence: 95%, high).**

### 5.2 Create transaction

1. Validate all fields, root containment, size limits, and ID/slug allowlists in memory.
2. Ensure issue root and lock root are real directories under the configured project root; reject symlinks for managed roots.
3. Generate a random ID and final path; if it exists, generate another ID rather than overwrite.
4. Write the complete record to an unpredictable same-directory temporary file opened exclusively; set intended mode; flush file contents.
5. Acquire a short-lived creation/index lock only if a shared derived index must be changed. Prefer no mutable shared index in v1: list can scan canonical records.
6. Recheck final nonexistence and atomically publish the temporary file to the final path. Flush the parent directory where supported.
7. Remove temporary/lock artifacts in cleanup. On failure before publication, no canonical issue exists; on failure after publication, report the returned ref and do not retry creation blindly.

The repository’s executable precedent writes to a same-directory temporary directory, fsyncs, then renames in `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` function `atomicWrite`. Advisor reconciliation stages beside the destination and uses candidate/backup/commit/restore functions in `plugins/maister/skills/init/bin/reconcile-advisor-config.sh`. **Direct precedent (confidence: 97%, high).**

### 5.3 Update transaction and multiple agents

1. Require canonical ID and optional `expected_revision`/digest.
2. Acquire an exclusive per-issue lock by atomically creating `.locks/<id>.lock/`; lock metadata contains random owner token, PID, host, and timestamp for diagnostics.
3. Read and strictly parse the current record after lock acquisition.
4. If expected revision/digest differs, return `conflict` with current revision and perform no mutation.
5. Build a complete candidate with incremented revision; write/fsync same-directory temporary; recheck lock ownership; atomically replace final; flush directory where supported.
6. Release only a lock whose owner token matches. On timeout, fail with owner/age diagnostics. v1 must not automatically steal stale locks because PID and liveness are not portable across hosts/network filesystems.

Locks prevent two cooperating provider processes from overwriting one another; revision checks protect callers with stale reads. No design can stop an unrelated editor from bypassing the provider, so compare the on-disk digest again immediately before replacement and fail on drift. **Recommendation (confidence: 88%, medium).**

### 5.4 Required edge behavior

| Case | v1 design |
|---|---|
| Duplicate slugs/titles | Allowed; opaque ID is identity. UI may disambiguate with short ID/provider/status. |
| Random ID collision | Retry allocation; never overwrite. |
| Two simultaneous creates | Different IDs publish independently; no global sequential counter. |
| Two simultaneous updates | Per-issue lock serializes; stale expected revision loses without mutation. |
| Partial process crash | Canonical file is old or complete new version; incomplete temp is ignored by scans and may be cleaned later. |
| Git conflict markers | Managed parser rejects conflicted frontmatter; show may expose raw path; update refuses until manual resolution. |
| Git branch divergence | Stable IDs reduce rename conflicts but same-record edits can conflict; never auto-merge tracker records in v1. |
| Path traversal | IDs and provider names use strict allowlists; canonicalized target must remain below root; reject absolute paths, `..`, separators, NUL, symlinks, and root escapes. |
| Permissions | Preserve mode on update; create least-permissive project-appropriate mode; tests assert modes and topology. |
| Lock timeout | Fail actionable and unchanged; provide manual inspection/recovery instructions, not automatic lock deletion. |

Transactional rejection is a documented testing requirement: `.maister/docs/standards/testing/test-writing.md` § **Prove Rejected Transactional Mutations Leave State Unchanged** requires byte-exact snapshots plus modes and directory topology. `tests/phase-continue-contract.test.sh` helpers `snapshot_files`, `snapshot_directories`, and `state_reports_and_directories_unchanged` are concrete precedent. **Direct evidence (confidence: 99%, high).**

## 6. Security Boundaries and Threat/Failure Table

### 6.1 Trust boundaries

1. **User/config → core parser:** untrusted until exact schema, allowlist, and precedence validation succeeds.
2. **Issue content/provider output → model/workflow:** untrusted data, never instructions. Preserve provenance and visibly delimit it.
3. **Core → subprocess/API/filesystem:** use structured argument arrays/APIs, fixed executables/operations, canonical paths, and least privilege.
4. **Read → write:** reads do not authorize writes. Every external mutation names provider, target, operation, expected revision, and confirmation policy.
5. **Credential boundary:** tokens are retrieved at execution time and never enter snapshots, prompts, logs, command strings, config, or generated artifacts.

OWASP describes indirect prompt injection through external files/content and recommends strict output formats, least privilege, human approval for high-risk actions, and clearly segregating external content ([OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), §§ **Types**, **Prevention and Mitigation Strategies**). OWASP’s command-injection guidance prefers direct APIs; where processes are unavoidable, it recommends structured separation of commands/data plus allowlist validation ([OWASP OS Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html), §§ **Primary Defenses**). **Direct external evidence (confidence: 94%, high).**

OWASP recommends least-privilege and fine-grained secret access ([OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), § **Access Control**). GitHub recommends fine-grained tokens restricted to specific repositories and permissions; issue access has separate read/write levels ([GitHub: Managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), §§ **Permissions**, **Repository permissions**). **Direct external evidence (confidence: 95%, high).**

### 6.2 Threat and failure table

| Threat/failure | Impact | v1 control | Residual/later work | Confidence |
|---|---|---|---|---:|
| Credential committed in `.maister/config.yml` | Repository-wide secret leak | Schema accepts credential references only; reject token-like managed fields; redact diagnostics; provider-native auth/env/secret store | Automated secret scanning/rotation integration later | 96% high |
| Over-broad token | Unauthorized reads/writes across repos | Document least privilege; fixed repository allowlist; separate read/write capability checks | Provider-specific scope auditor later | 92% high |
| Shell/argument injection through title, ref, repo, labels | Arbitrary command or altered CLI operation | No shell interpolation; spawn fixed executable with argument array; `--` where supported; allowlist provider/ref/repo/enum fields; prefer API/library | CLI-specific adversarial fixtures remain necessary | 95% high |
| Indirect prompt injection in issue body/comments | Model ignores workflow policy, leaks data, or writes externally | Label/delimit snapshot as untrusted; issue content cannot select tools/provider/paths; deterministic schema checks; explicit confirmation for external writes | Content filtering and adversarial evaluation later | 93% high |
| Secret pasted into issue then copied into snapshot/report | Durable leakage in Git/task artifacts | Warn on capture; bounded secret-pattern detection/redaction gate before snapshot/log; never echo credentials; preserve safe audit marker | Full DLP is out of scope and imperfect | 81% medium |
| Malicious URL/repository/ref | Wrong target, SSRF-like fetch, credential forwarding | Provider-specific canonical grammar; configured host/repository allowlist; reject arbitrary URL schemes/credentials/redirected hosts | Enterprise/self-hosted host policy later | 90% high |
| Wrong-repository external write | Corrupts unrelated backlog | Full ref or fixed project config; preview target; expected revision; confirmation; never infer during write | Batch writes later require per-target audit | 94% high |
| Path traversal or symlink escape | Overwrite/read arbitrary project or user files | Strict ID regex, canonical containment checks, `lstat`, reject managed symlinks/absolute/`..`/separators, same-directory temp | Platform-specific no-follow primitives if needed | 93% high |
| Concurrent local updates | Lost update | Per-issue lock + expected revision/digest + atomic replacement | Network filesystem qualification | 88% medium |
| Crash/partial write | Corrupt issue or misleading success | Complete same-directory candidate, fsync, atomic publish, cleanup, post-publication ref reporting | Power-loss matrix varies by filesystem | 87% medium |
| Git conflict | Invalid metadata or silent lost change | Reject conflict markers in managed frontmatter; no auto-merge; manual recovery message | Semantic merge tool later | 92% high |
| Provider returns malformed/oversized data | Memory/resource abuse or schema confusion | Exact bounded response schema, pagination/item/body limits, UTF-8 checks, unknown-field policy | Streaming for very large bodies later | 90% high |
| Provider unavailable, rate-limited, or auth expired | Handoff/capture failure, unsafe retry | Typed retryable/nonretryable result; no provider fallback; read-only snapshot remains usable; create retries require idempotency/ref check | Provider-specific retry budgets later | 90% high |
| Source changes after handoff | Non-reproducible or contradictory workflow | Immutable snapshot + source revision; visible drift; no silent refresh | Explicit archived refresh later | 91% high |
| Ambiguous bare `#42` | Wrong issue/PR/provider | Require context or full `IssueRef`; fail when ambiguity remains | Friendly shorthand after deterministic resolution | 95% high |
| External write triggered by “close this” text inside issue | Unauthorized action via content | Issue content is data; only user command/workflow policy can request write; human confirmation for high-risk mutation | Policy-configurable low-risk writes later | 96% high |

## 7. Risk-Based Behavior Test Matrix

Tests should assert observable contracts and mock external systems, following `.maister/docs/standards/testing/test-writing.md` §§ **Test Behavior**, **Mock External Dependencies**, **Risk-Based Testing**, and **Critical Path Focus**. No test should write to a real tracker.

| Risk / priority | Area | Behavior cases | Required assertions | Scope |
|---|---|---|---|---|
| Critical | Provider contract | Same fixture suite for local/GitHub: create/read/list/ref resolution/capabilities; unsupported operation; malformed response; pagination bound | Exact normalized schema; provider-specific data stays in extension field; typed errors; no silent fallback | v1 |
| Critical | Config precedence | Full ref, override, project default, sole provider, multiple/no default, none configured, contradictory flags, duplicate/unsafe YAML | Deterministic provider; interactive-only prompt; noninteractive failure; byte/mode/topology unchanged | v1 |
| Critical | Local create | Parallel creates with same title/slug, forced ID collision, invalid body/metadata, injected write/fsync/publish failure | Unique stable refs; no overwrite; canonical files old-or-complete; no leaked temp/lock artifacts | v1 |
| Critical | Local update | Two writers, stale expected revision, lock timeout, process crash, permission failure, conflicted file | Exactly one successful revision; loser gets conflict; bytes/mode/topology unchanged on rejection; actionable recovery | v1 |
| Critical | Filesystem security | `../`, absolute path, separators, NUL, symlinked root/record/lock, oversized file, filename/frontmatter mismatch | Access rejected before read/write; no out-of-root artifacts | v1 |
| Critical | Handoff to research | Valid local/GitHub issue, changed/deleted issue during fetch, snapshot write failure | One task only on success; ref/snapshot/revision/digest present; no task/state on precommit failure; research receives snapshot | v1 |
| Critical | Handoff to quick plan | Explicit ref and interactive selection; direct prompt regression | Issue path creates provenance; direct text still works unchanged; tracker status is not phase status | v1 |
| Critical | Handoff to development/work | Full ref, ambiguous bare number, existing task-folder resume, source drift | Correct routing; ambiguous input fails; existing `orchestrator-state.yml` resumes; drift never rewrites state | v1 |
| Critical | External write security | Injected shell metacharacters/leading flags, wrong repo, prompt-injection body, expired auth, duplicate create retry | Fixed argv/API calls; allowlist rejection; no content-driven write; no token in stdout/stderr/snapshot; idempotent outcome | v1 |
| High | Transactional setup/migration | Add tracker config to absent/valid config; malformed existing config; injected second-artifact failure; rollback failure | Exact rollback of bytes, modes, existence, directories; critical recovery paths retained only when rollback fails | v1 |
| High | Snapshot/freshness | Unchanged, changed, deleted/private, offline; explicit refresh | Stable original snapshot; correct drift state; offline resume uses labeled snapshot; refresh archives prior version | v1 read-only; refresh later |
| High | Generated platforms | Canonical skill/helper transformed for Claude, Codex, Cursor, Kiro; host command/tool vocabulary fixtures | `make build` deterministic; generated diff expected; host-capability behavior explicit; `make validate` passes | v1 |
| High | Migration/backward compatibility | Existing `.maister/config.yml` without tracker section; direct workflow invocation; no issue directory | Existing workflows behave identically; no eager directory/config mutation; feature opt-in | v1 |
| Medium | UX output | Bounded list, empty list, cancellation, JSON output, truncation/incomplete marker | Stable order; clear provider/status/ref; cancellation is read-only; JSON-only stdout and stderr diagnostics | v1 |
| Medium | Capability extensions | Labels/comments/state/native dependencies absent or present | Capability discovery governs UI; unsupported never pretends success | basic v1, mutations later |
| Medium | Git collaboration | Independent creates, same-record edits, conflict markers, branch rename | Stable IDs merge where independent; same-record conflict rejects; no automatic conflict resolution | v1 |
| Medium | Resilience | Rate limit with retry hint, timeout, malformed CLI JSON, provider command missing | Typed error/retryability; bounded retries; local provider remains usable; no cross-provider fallback | v1 |

### 7.1 Test implementation precedents

- `tests/phase-continue-contract.test.sh` validates duplicate JSON rejection, exact schema, path collisions, canonical state, unchanged files/directories, and durable recovery after injected report/transition failures. **Direct evidence (confidence: 98%, high).**
- `tests/advisor-config-reconciliation.test.sh` cases 5–9 validate ambiguity rejection, exact no-op, mode preservation, domain bounds, and unsupported YAML features. **Direct evidence (confidence: 98%, high).**
- `tests/advisor-init-lifecycle.test.sh` cases 1 and 6–13 validate precedence, pre-mutation rejection, two-artifact rollback, retained recovery artifacts on critical rollback failure, cleanup, and directory topology. **Direct evidence (confidence: 99%, high).**
- `.maister/docs/standards/global/build-pipeline.md` § **Canonical Source and Reproducible Generated Variants** requires canonical edits under `plugins/maister/`/`platforms/` and deterministic generated outputs, while § **Build and Validate Every Platform Before Release** requires `make build && make validate`. **Direct evidence (confidence: 99%, high).**

## 8. Architecture Options

### 8.1 Common evaluation rubric

Scores: 1 poor, 3 mixed, 5 strong. These are comparative recommendations, not measured facts.

| Criterion | A. Prose/config instructions | B. Declarative contract, host-executed | C. Small executable helper + declarative capabilities |
|---|---:|---:|---:|
| Initial simplicity | 5 | 3 | 3 |
| Deterministic generation/parity | 2 | 4 | 5 |
| Validation/fail-closed behavior | 1 | 3 | 5 |
| Testability and atomic local writes | 1 | 3 | 5 |
| Minimal dependencies | 5 | 5 | 4 |
| Offline local use | 4 | 4 | 5 |
| Extensibility | 3 | 4 | 4 |
| Tracker-specific escape hatches | 5 | 3 | 4 |
| Security/credential boundary | 2 | 3 | 5 |
| Host parity | 2 | 3 | 5 |
| Migration cost | 5 | 4 | 3 |

### 8.2 Option A — repository prose/config instructions

Each provider is described in Markdown like the installed `docs/agents/issue-tracker.md` templates; skills interpret “publish,” “fetch,” “list,” “claim,” and “resolve” using host tools/CLIs.

- **Strengths:** fastest to author; highly adaptable; almost no runtime dependency; proven understandable in `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-{local,github,gitlab}.md`.
- **Weaknesses:** implicit interface, variable model execution, weak machine validation, difficult atomicity/idempotency guarantees, and high risk that credentials/content enter prompts or shell strings.
- **Fit:** useful documentation and provider guidance, not sufficient as the v1 safety boundary.
- **Recommendation:** reject as sole architecture. **Confidence: 94%, high** because current templates directly expose tracker-specific command prose and concurrency gaps.

### 8.3 Option B — canonical declarative provider contract executed by each host

A strict provider/config schema declares operations, command templates, capabilities, and normalized fields; each host adapter invokes its available subprocess/filesystem/tool mechanisms.

- **Strengths:** documentation-as-code fit, low runtime footprint, deterministic schema, and visible capabilities.
- **Weaknesses:** safe command templates become a programming language; host execution differences can change quoting, errors, auth, and atomicity; complex validation logic risks duplication across generated variants.
- **Fit:** credible if all providers are read-only, but weaker for writes and local concurrency.
- **Recommendation:** retain declarative configuration/capabilities but not host-specific execution as the only implementation. **Confidence: 82%, medium.**

### 8.4 Option C — small executable provider helper with declarative capabilities

A canonical, versioned helper exposes structured stdin/stdout operations and owns parsing, target validation, local transactions, subprocess/API invocation, redaction, typed errors, and capability discovery. Skills remain thin UX/orchestration wrappers; adapters package/invoke the helper and map host prompts.

- **Strengths:** one testable safety boundary; exact schema; consistent local atomicity; structured argv; deterministic JSON; easy mocked providers; strongest parity and audit behavior. Node built-ins are already part of the tech stack (`.maister/docs/project/tech-stack.md` §§ **JavaScript ESM on Node.js**, **Key Dependencies**), and `phase-continue.mjs` proves this pattern for a narrow cross-host state boundary.
- **Weaknesses:** adds code and schema migration responsibility; host packaging and Node availability must be validated; provider-specific features need an extension channel rather than core-field growth.
- **Fit:** best balance for v1 local + GitHub, provided the interface stays narrow and called code only.
- **Recommendation:** choose Option C, with declarative config/capabilities and prose documentation. **Confidence: 87%, medium**; the architecture is strongly supported by repository precedent, but final provider contract and host execution findings remain dependencies on Categories 1 and 3.

### 8.5 Minimum executable boundary

**v1 must-have:** `capabilities`, `create`, `resolve/read`, and bounded `list`; structured request/response envelopes; canonical ref parser; typed `invalid_input`, `ambiguous`, `not_found`, `unauthorized`, `forbidden`, `conflict`, `unsupported_capability`, `offline`, `rate_limited`, and `internal` outcomes. Handoff orchestration belongs in workflow skills, not the provider helper. **Recommendation (confidence: 85%, medium).**

**Later:** `update`, `comment`, labels/state, native dependency links, search DSL, webhooks, and provider plugin loading. Add only with a workflow caller and contract tests, following `.maister/docs/standards/global/minimal-implementation.md` §§ **Build What You Need** and **No Future Stubs**. **Recommendation (confidence: 95%, high).**

## 9. v1 Must-Haves vs Later Capabilities

| v1 must-have | Later capability |
|---|---|
| Local Markdown and GitHub providers | GitLab/Jira/Linear implementations after contract validation |
| Full canonical ref; deterministic shorthand rejection | Configurable friendly aliases and cross-repository search |
| Capture, bounded list, show/select, handoff | Comments, labels, assignment, close/state transitions |
| Source ref + immutable snapshot + normalized fields + revision/digest | Webhook-driven freshness and explicit multi-snapshot reconciliation UI |
| Read-only drift detection; explicit external writes only | Policy-controlled low-risk synchronization |
| Random stable local IDs; atomic create/update; per-issue lock; revision conflict | Semantic Git merge driver, stale-lock recovery tooling, shared indexes |
| Strict project-local config; credentials external | User-global preference layer and enterprise credential brokers |
| Three workflow handoffs plus direct-prompt compatibility | Automatic tracker updates on workflow milestones |
| Mocked external provider tests and full transactional rejection tests | Live sandbox conformance suites run only with explicit credentials |
| Canonical source + generated platform parity | Third-party provider/plugin SDK |

## 10. Answers to the Eight Category Questions

1. **Minimum journeys:** capture, bounded list, show/select, and explicit handoff, each usable interactively and non-interactively; four complete journeys are specified in §1.
2. **Domain model:** distinct tracker and workflow contexts with `Issue`, `IssueRef`, `TrackerProvider`, `ProviderCapability`, `CapturedSnapshot`, `SourceRevision`, `WorkflowTask`, `WorkflowState`, `TrackerStatus`, `PhaseStatus`, `Handoff`, and `Drift`; see §2.
3. **Initialization storage:** combination of source ref, immutable snapshot, selected normalized fields, revision/digest, and capture metadata; later changes are surfaced as drift and never silently rewrite active context; see §3.
4. **Configuration:** full ref/explicit override → project default → sole provider → interactive choice, otherwise fail; credentials stay external and ambiguity rejects unchanged; see §4.
5. **Local concurrency:** opaque random IDs, strict records, same-directory staged publication, per-issue locks, expected revisions, no auto lock stealing, conflict-marker rejection, and canonical path containment; see §5.
6. **Security:** credentials, command/argument injection, prompt injection, secret leakage, target/URL validation, path traversal, and external writes each have explicit trust boundaries and mitigations; see §6.
7. **Tests:** provider contracts, local persistence, mocked externals, all three workflow handoffs, platform generation, migration, rollback, and transactional rejection are covered by the risk matrix in §7.
8. **Architecture:** three options are compared in §8; recommend a small executable provider helper plus declarative capabilities and prose docs, limited to called v1 operations.

## 11. Primary Source Index

### Local project evidence

- `.maister/tasks/research/2026-07-13-issue-tracker-workflow/planning/research-brief.md` — § **Key Decisions**, § **Success Criteria**.
- `.maister/tasks/research/2026-07-13-issue-tracker-workflow/planning/research-plan.md` — § **Category 4**, § **Confidence Rules**.
- `.maister/docs/project/vision.md` — § **Purpose**, § **Evolution**.
- `.maister/docs/project/architecture.md` — § **Persistence Model**, § **Configuration**, § **Data and Control Flow**.
- `.maister/docs/project/tech-stack.md` — § **JavaScript ESM on Node.js**, § **Database**, § **Testing**, § **Key Dependencies**.
- `.maister/docs/standards/global/validation.md`, `error-handling.md`, `minimal-implementation.md`, `build-pipeline.md`, `conventions.md`, and `language-md-convention.md` — cited headings above.
- `.maister/docs/standards/testing/test-writing.md` — § **Test Behavior**, § **Mock External Dependencies**, § **Risk-Based Testing**, § **Prove Rejected Transactional Mutations Leave State Unchanged**.
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` — function `atomicWrite`.
- `plugins/maister/skills/init/bin/reconcile-advisor-config.sh` — functions `build_candidate`, `commit_file`, `restore_file`, `resolve_flags`, `run_init_transaction`.
- `tests/advisor-config-reconciliation.test.sh`, `tests/advisor-init-lifecycle.test.sh`, `tests/phase-continue-contract.test.sh` — cases/functions cited above.
- `plugins/maister/skills/research/SKILL.md`, `plugins/maister/skills/quick-plan/SKILL.md`, `plugins/maister/skills/development/SKILL.md`, `plugins/maister/commands/work.md` — initialization and routing headings cited above.

### Installed tracker precedent

- `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md` — § **Process**, especially tracker selection and repository-local write behavior.
- `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md` — § **Conventions**, § **Wayfinding operations**.
- `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md` — § **Conventions**, § **Pull requests as a triage surface**, § **Wayfinding operations**.
- `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-gitlab.md` — § **Conventions**, § **Merge requests as a triage surface**, § **Wayfinding operations**.
- `/Users/mrapacz/.agents/skills/to-spec/SKILL.md`, `to-tickets/SKILL.md`, `triage/SKILL.md`, `implement/SKILL.md`, and `wayfinder/SKILL.md` — explicit publication, readiness, handoff, claim, frontier, and parallel-work semantics.

### Official external security evidence (accessed 2026-07-13)

- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — external-content risk, least privilege, segregation, validation, and human approval.
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html) — direct API preference, parameterization, argument separation, allowlists, and least privilege.
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) — access control and secret lifecycle guidance.
- [GitHub: Managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) — fine-grained repository restriction and issue read/write permissions.
