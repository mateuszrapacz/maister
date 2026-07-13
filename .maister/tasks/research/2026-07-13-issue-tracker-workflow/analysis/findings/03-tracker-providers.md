# External Tracker Provider Contracts

## TL;DR
The portable core is eight operations: resolve, create, read, list/search, update, comment, label/transition, and capability discovery. Persist a fully scoped `maister-issue://...` reference, while accepting short aliases only as input. Use filesystem operations for local Markdown and a preflight-selected API/CLI transport for hosted trackers; MCP is an optional host adapter, not the contract. For v1 GitHub, require conventional issue CRUD/comments/labels/open-close and reject PRs; discover hierarchy, dependencies, projects, issue types, and fields as optional capabilities.

## Key Decisions

- **Recommendation — High confidence (90%):** Define a small normalized contract plus a capability map and provider-specific escape hatch. Do not place hierarchy, blockers, projects, custom fields, or assignee rules in the portable core.
- **Recommendation — High confidence (92%):** Persist canonical references as `maister-issue://<provider>/<authority>/<container...>/<kind>/<native-id>`; parse convenient aliases and vendor URLs into that form before workflow initialization.
- **Recommendation — High confidence (90%):** Select one execution transport during read-only preflight. Reads may fall back after a definite “unsupported/unavailable” result; writes must not fail over after dispatch unless the provider proves idempotency or reconciliation proves the first write did not commit.
- **Recommendation — High confidence (93%):** Make the GitHub REST API version `2026-03-10` the normative v1 behavior and allow `gh` to supply authentication and/or execute equivalent calls. MCP remains optional because its availability and tool schemas vary by host and server version.

## Open Questions / Risks

- The exact short-alias grammar (`gh:owner/repo#123` versus another spelling) is a product choice; only the persisted canonical form needs to be stable.
- Hosted issue-create and comment endpoints reviewed here do not document a general client idempotency key. A timeout after dispatch is therefore an **ambiguous commit**, not a retryable failure.
- GitHub's newest issue fields, issue types, dependencies, and sub-issues are present in API version `2026-03-10`, but repository/organization enablement and permissions still vary; GitHub Enterprise Server parity was not verified.
- GitLab capabilities depend on deployment version, offering, and tier; Jira behavior depends on project type, issue type, fields, workflow, and permissions; Linear workflows are team-specific. Capability results need constraints, not booleans alone.

## Scope, Method, and Source Currency

**Direct evidence.** This comparison uses only current official vendor documentation and the installed local Markdown tracker convention. External sources were accessed **2026-07-13**. No real tracker writes were performed. The local environment had GitHub CLI `2.96.0` (released 2026-07-02); `glab`, Jira, and Linear CLIs were not installed, so their runtime behavior was not tested.

| Provider | Reviewed contract / caveat |
|---|---|
| Local Markdown | Installed convention at `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md`, headings **Conventions**, **When a skill says “publish…”**, and **Wayfinding operations**. This is project-local prior art, not a standardized external API. |
| GitHub | REST API version `2026-03-10` is the current documented version; GitHub documents versioned breaking changes and advance notice. [API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions?apiVersion=2026-03-10). CLI observations use installed `gh 2.96.0`; CLI presence is not a product prerequisite. |
| GitLab | Current docs include history through GitLab 19.x and identify tier/offering per feature. Project-issue keyset pagination requires GitLab 18.3+. GitLab's own MCP server is **Beta**, Premium/Ultimate, introduced in 18.3 and changed substantially through 18.11. [REST API](https://docs.gitlab.com/api/rest/), [MCP server](https://docs.gitlab.com/user/gitlab_duo/model_context_protocol/mcp_server/). |
| Jira Cloud | REST API v3 is the latest Cloud API. This does not cover Jira Data Center. Atlassian's new points/quota rate-limit enforcement began 2026-03-02; the rate-limit page was updated 2026-07-10. [REST v3 introduction](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/), [rate limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/). |
| Linear | Public GraphQL API with introspection; limits are explicitly described as evolving. OAuth applications moved to the refresh-token system on 2026-04-01. The official remote MCP server advertises expanding functionality (“more functionality on the way”). [GraphQL getting started](https://linear.app/developers/graphql), [OAuth](https://linear.app/developers/oauth-2-0-authentication), [MCP](https://linear.app/docs/mcp). |

## 1. Smallest Common Operation Set

### Recommended portable interface

**Recommendation — High confidence (92%).** Keep the mandatory semantic surface small, but return structured constraints and provenance from every operation:

```text
resolve(input, context) -> IssueRef
create(containerRef, draft, operationId?) -> Issue
read(issueRef) -> Issue
list(containerRef, query, page?) -> IssuePage
update(issueRef, patch, precondition?) -> Issue
comment(issueRef, body, operationId?) -> Comment
setLabels(issueRef, add[], remove[], precondition?) -> Issue
transition(issueRef, targetCategoryOrNativeTransition, precondition?) -> Issue
capabilities(containerRef?, issueRef?) -> CapabilitySet
```

`Issue` should normalize only: canonical reference, provider URL, title, body (raw source form), coarse state category (`open`, `active`, `done`, `cancelled`, `unknown`), labels/tags, assignee display references, created/updated timestamps, and raw provider metadata. `update` should be a field patch, not a whole-object replacement. `transition` must accept either a coarse requested category or an explicit native transition; the result reports the actual native state.

`CapabilitySet` should describe each operation as `native | emulated | unsupported | unknown`, with `transport`, `read/write`, required permission, tier/version/preview constraints, supported fields, and a human-readable reason. Capability discovery is therefore an operation of the Maister provider, not necessarily a vendor endpoint. It combines static adapter knowledge, configuration, transport availability, and cheap read-only probes.

### Common-operation matrix

Legend: **N** native; **E** safely emulatable by the provider; **C** native but constrained/configuration-dependent; **D** defined by Maister's local file format; **—** unsupported or not established by reviewed evidence.

| Operation | Local Markdown | GitHub Issues | GitLab Issues | Jira Cloud | Linear |
|---|---|---|---|---|---|
| Resolve reference | **D** path/stable file ID | **N** host + owner/repo + number or URL | **N** host + project path + issue IID or URL | **N** site/cloud + project + issue key or ID | **N** workspace/team + identifier or UUID |
| Create | **D** exclusive file creation | **N** REST/`gh` | **N** REST/`glab` | **C** fields and issue type come from create metadata | **C** GraphQL; team is required and default state is team-dependent |
| Read | **D** file read | **N** | **N** | **N** with field/permission visibility | **N** GraphQL |
| List/filter | **D** directory scan | **N** repository endpoint | **N** project/group/global endpoints | **N** JQL search | **N** filtered GraphQL connections |
| Text search | **E** bounded content scan | **N** issue search | **N** `search` filters; advanced search separately limited | **N** JQL text predicates | **N** GraphQL filtering/search surface; exact parity is not assumed |
| Update title/body | **D** guarded file replace | **N** | **N** | **C** editable fields discovered per issue; ADF for rich text | **N** `issueUpdate` |
| Comment | **D** append under `## Comments` | **N** issue-comments API | **N** Notes API | **N** comments API, ADF body in v3 | **N** GraphQL; OAuth has `comments:create` scope |
| Labels/tags | **D** proposed frontmatter/list; absent from installed local convention | **N** labels API | **N** issue labels | **C** `labels` field may be absent/hidden; custom fields differ | **N** issue labels, including team/workspace semantics |
| State change | **D** explicit status field | **N** open/closed plus reason | **N** `state_event=close|reopen`; newer custom status varies | **C** must enumerate and execute allowed workflow transitions | **C** set a team-specific workflow-state ID |
| Capability discovery | **D** static format/version + filesystem probe | **E** adapter knowledge + API/repository/permission probes | **E** adapter + version/tier/permission probes | **E** metadata, fields, transitions, permissions | **E** GraphQL introspection + team/workflow queries |

**Direct evidence — High confidence (95%).** GitHub's issue API exposes create/get/update/list, and separate official endpoints cover comments and labels. Pull requests can appear in issue responses and are identified by a `pull_request` key. [Issues](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10), [comments](https://docs.github.com/en/rest/issues/comments?apiVersion=2026-03-10), [labels](https://docs.github.com/en/rest/issues/labels?apiVersion=2026-03-10).

**Direct evidence — High confidence (95%).** GitLab's Issues API supports create/update/list and uses project-scoped `iid`; close/reopen is an update with `state_event`. Comments are Notes. [Issues API](https://docs.gitlab.com/api/issues/), [Notes API](https://docs.gitlab.com/api/notes/). GitLab's official CLI exposes create/list/view/update/close/reopen/note with `--repo` targeting. [`glab issue`](https://docs.gitlab.com/cli/issue/).

**Direct evidence — High confidence (95%).** Jira creation and editing are metadata-driven, and editing does not transition state; callers must query and execute available transitions. Comments are a separate resource and rich-text bodies use Atlassian Document Format in REST v3. [Issues and transitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [comments](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/), [REST v3 introduction](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/).

**Direct evidence — High confidence (93%).** Linear documents `issueCreate` and `issueUpdate`; the update accepts either UUID or shorthand such as `BLA-123`. Creation requires a team and defaults to Triage or the first Backlog state depending on team configuration. All list queries use Relay-style cursor pagination. [GraphQL getting started](https://linear.app/developers/graphql), [pagination](https://linear.app/developers/pagination).

## 2. Capabilities That Must Not Be Flattened

| Capability | Why it is not safely normalizable | Provider evidence / v1 treatment |
|---|---|---|
| Issue versus PR/MR/work-item kind | GitHub Issues endpoints can return PRs; GitLab issue and MR IIDs are independently scoped; local Markdown has no intrinsic kind. | GitHub explicitly says every PR is an issue but not every issue is a PR. [GitHub Issues](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10). Persist `kind`; v1 GitHub rejects `pull_request` when an `issue` was requested. |
| Parent/sub-issue hierarchy | Depth, cross-project rules, and issue-type constraints differ. | GitHub allows up to 100 sub-issues and eight levels; Jira hierarchy is issue-type/project dependent, with extra hierarchy levels limited to Premium/Enterprise; Linear sub-issues can belong to another team. [GitHub sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues), [Jira hierarchy](https://support.atlassian.com/jira-cloud-administration/docs/configure-the-issue-type-hierarchy/), [Linear teams](https://linear.app/docs/teams). Optional capability only. |
| Blocking/related/duplicate links | Direction, lifecycle effects, tiers, and duplicate semantics differ. | GitHub has issue-dependency endpoints in API `2026-03-10`; GitLab relation types include `blocks` and `is_blocked_by`, but blocking UI behavior is Premium/Ultimate; Jira link types are administrator-defined and issue linking can be disabled; Linear supports blocking/related/duplicate and moves resolved blockers under Related. [GitHub dependencies](https://docs.github.com/en/rest/issues/issue-dependencies?apiVersion=2026-03-10), [GitLab links API](https://docs.gitlab.com/api/issue_links/), [GitLab linked issues](https://docs.gitlab.com/user/project/issues/related_issues/), [Jira issue links](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/), [Linear relations](https://linear.app/docs/issue-relations). Expose typed native relations, not a portable `blocked` boolean. |
| State/workflow | Open/closed is not equivalent to a Jira transition or Linear team state. Validators, permissions, and transition screens can reject a seemingly valid target. | Jira returns only transitions the user can perform; Linear workflows are customizable per team. [Jira transitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [Linear teams/workflows](https://linear.app/docs/teams). Normalize only coarse state category for display; mutate through native transition IDs. |
| Projects/boards/cycles/milestones | “Project” means repository board metadata on GitHub, namespace/container on GitLab/Jira, and a planning object separate from team on Linear. | GitHub Projects can contain issues, PRs, and draft items with custom fields; a Linear issue can belong to only one project. [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects), [Linear projects](https://linear.app/docs/projects). Provider extension only. |
| Issue types and custom fields | Names, IDs, value types, visibility, screens, and silent-drop behavior vary. | GitHub issue fields are organization-defined and unavailable in some contexts; issue-field/type values can be silently dropped without sufficient access. Jira create/edit fields must be discovered and multiline text uses ADF. [GitHub issue fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-issue-fields), [GitHub Issues](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10), [Jira issues](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/). Never claim success without read-after-write verification for constrained metadata. |
| Assignees | Cardinality, eligibility, identity, and tier differ. | GitHub restricts who can be assigned; GitLab multiple assignees are Premium/Ultimate; Jira uses account IDs and permissions; Linear routing can depend on team triage rules and tier. [GitHub assignees](https://docs.github.com/en/rest/issues/assignees?apiVersion=2026-03-10), [GitLab multiple assignees](https://docs.gitlab.com/user/project/issues/multiple_assignees_for_issues/), [Linear assignment](https://linear.app/docs/assigning-issues). Return opaque provider user refs. |
| Rich body and comments | Markdown is native for GitHub/GitLab/Linear, while Jira v3 uses ADF for multiline content. Local files can contain arbitrary frontmatter/headings. | Preserve raw provider representation and an optional rendered/plain projection; do not round-trip all providers through Markdown. [Jira REST v3 introduction](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/). |
| Move/transfer semantics | A “move” can preserve identity, create a replacement, or be unavailable. | GitLab move closes and copies the issue, leaving notes on both; GitHub has transfer; Jira keys may change when moved. [GitLab manage issues](https://docs.gitlab.com/user/project/issues/managing_issues/). Return a replacement canonical ref when identity changes. |

**Inference — High confidence (90%).** A single `supportsBlocking: true` or `status: in_progress` loses behavior needed for safe automation. The capability payload should expose native relation/state/type identifiers plus constraints, while the normalized issue view remains intentionally lossy.

## 3. CLI, HTTP API, MCP, and Filesystem Trade-offs

| Transport | Strengths | Costs / failure modes | Recommended role |
|---|---|---|---|
| Filesystem | Offline, auditable diffs, no credentials or service dependency, natural fit for local Markdown. | Concurrency, path traversal, Git conflicts, no server-side search/permissions/events. | Normative transport for `local`; use stable IDs, exclusive create, atomic replacement, and compare-before-write. |
| Vendor CLI | Excellent interactive auth and host selection; concise commands; often already installed. `gh issue` and `glab issue` cover the core. | Optional dependency; installed versions and output/features drift; prompts are unsafe for automation; exit codes can hide provider detail. | Convenience adapter. Require minimum version, non-interactive flags, structured JSON, explicit repository/host, and preflight auth. |
| HTTP/GraphQL API | Vendor's normative contract, structured errors/headers, testable with fixtures, works without shell quoting, version can be pinned. | Maister must handle tokens, pagination, retries, schemas, and cloud/self-hosted base URLs. | Normative semantics for hosted providers. Prefer API implementation or `gh api`-equivalent behavior for v1 GitHub. |
| MCP/connector | Reuses signed-in host sessions; capability/tool discovery is built in; official GitHub, GitLab, Jira, and Linear servers exist. | Host-dependent, remote availability, dynamic tool names/schema, user/tool approvals, less control over pagination/raw errors, and server tier/preview differences. | Optional host adapter. Never make core workflow correctness depend on MCP presence. Preserve raw tool result and provider URL. |

**Direct evidence — High confidence (92%).** GitHub's official MCP server exposes issue tools and can enforce read-only mode; the currently indexed release is 0.31.0. [Official GitHub MCP server](https://github.com/github/github-mcp-server), [releases](https://github.com/github/github-mcp-server/releases). GitLab's MCP server is Beta and Premium/Ultimate. [GitLab MCP](https://docs.gitlab.com/user/gitlab_duo/model_context_protocol/mcp_server/). Atlassian's Rovo MCP server uses OAuth and organization-controlled read/write/search permissions, with plan-dependent site limits. [Rovo MCP](https://www.atlassian.com/platform/rovo-mcp), [permission controls](https://support.atlassian.com/security-and-access-policies/docs/Configure-Atlassian-Rovo-MCP-server-permission/). Linear's remote MCP server uses OAuth 2.1 and exposes finding/creating/updating issues, projects, and comments. [Linear MCP](https://linear.app/docs/mcp).

**Recommendation — High confidence (90%).** Use a layered preference model, but resolve it before execution:

1. `local` always selects filesystem.
2. Hosted provider preflight discovers configured transport(s), credentials, provider reachability, and capabilities without writing.
3. Select a single transport for the operation. Prefer the API-compatible adapter for reproducibility; allow CLI or MCP when project/host configuration explicitly prefers it.
4. A read may retry through another transport only after a definite non-dispatch failure.
5. A write may switch transport only before dispatch, or after reconciliation proves no mutation occurred. A timeout/connection loss after dispatch returns `ambiguous_commit`.

This avoids both shell coupling and duplicate external writes while still exploiting host-native connectors.

## 4. Canonical Reference Options

### Options considered

| Form | Example | Assessment |
|---|---|---|
| Vendor shorthand | `owner/repo#123`, `group/project#123`, `PROJ-123`, `ENG-123` | Fast but ambiguous across provider, host/workspace, kind, and current repository. Input alias only. |
| Vendor URL | `https://github.com/o/r/issues/123` | Globally meaningful and easy to paste, but provider-specific, may include mutable slugs, and does not give one parser contract. Accept and normalize; retain as `webUrl`. |
| URN | `urn:maister:issue:github:github.com:o%2Fr:issue:123` | Unambiguous and compact-ish, but percent encoding is hard to read/type. Viable persisted alternative, not preferred. |
| Maister URI | `maister-issue://github/github.com/o/r/issue/123` | One parser, provider explicit, hierarchy readable, URI path segments can be percent-encoded. Recommended persisted canonical form. |

### Recommended grammar

```text
maister-issue://<provider>/<authority>/<container-segment>.../<kind>/<native-id>
```

Examples:

```text
maister-issue://github/github.com/openai/codex/issue/123
maister-issue://gitlab/gitlab.com/group/subgroup/project/issue/123
maister-issue://jira/acme.atlassian.net/PROJ/issue/PROJ-123
maister-issue://linear/acme-workspace/ENG/issue/ENG-123
maister-issue://local/workspace/issues/issue/01J2M7Y7W4K8K0M6M4W8YV2R3Z
```

Rules:

- Lowercase and allowlist `provider` and `kind`; preserve provider-native case in path segments where meaningful.
- Percent-encode each path segment; reject `.`/`..`, encoded separators, control characters, and unconfigured authorities.
- For GitHub/GitLab include host and full repository/project path because native issue numbers/IIDs are container-scoped. GitLab documents `id` as global but `iid` as project-scoped and normally used to fetch resources. [GitLab REST `id` vs `iid`](https://docs.gitlab.com/api/rest/#id-vs-iid).
- For Jira include site plus project and preserve the full issue key; Jira APIs accept issue ID or key, but the human key is not site-global without the site authority. [Jira issues](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/).
- For Linear include workspace and team key plus identifier; also retain immutable provider UUID in raw metadata when available. Linear accepts UUID or shorthand identifier for updates. [Linear GraphQL](https://linear.app/developers/graphql).
- For local, generate an immutable ULID/UUID independent of filename slug. The path is metadata, not identity.
- Keep both `canonicalRef` and current `webUrl`; do not infer one from the other forever because resources can move.

Suggested input aliases are `gh:OWNER/REPO#123`, `gl:GROUP/PROJECT#123`, `jira:SITE/PROJ-123`, `lin:WORKSPACE/ENG-123`, and `local:<id>`. Bare `#123` is accepted only when exactly one configured provider/container supplies context; otherwise fail as `ambiguous_reference` with candidate canonical refs.

**Recommendation — High confidence (92%).** Persist only the canonical URI. Alias resolution is context-sensitive UI behavior and must never change the already-persisted identity silently.

## 5. Boundary Semantics: Auth, Pagination, Limits, Errors, Idempotency, Offline

### Provider constraints

| Provider | Authentication | Pagination | Rate limits | Offline |
|---|---|---|---|---|
| Local | OS/filesystem permissions; Git remote auth is outside the provider operation | Deterministic sorted scan with explicit cursor/snapshot token | No service quota; enforce local result/time bounds | Full read/write offline; later Git sync may conflict |
| GitHub | Fine-grained PAT, GitHub App, OAuth, or Actions token; v1 issue writes need repository **Issues: write**. [Authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api), [issue permissions](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10) | REST list defaults to 30; follow `Link`, request up to endpoint-supported `per_page`. [Pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api) | 60/hour unauthenticated, generally 5,000/hour authenticated, plus secondary/content-generation limits; honor `Retry-After` and `X-RateLimit-*`. [Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10) | No; cached snapshots may be displayed as stale but cannot authorize writes |
| GitLab | OAuth2, PAT, project/group token, selected CI job tokens; invalid/missing credentials return 401 while inaccessible private resources can appear as 404. [Authentication](https://docs.gitlab.com/api/rest/authentication/), [Issues API](https://docs.gitlab.com/api/issues/) | Offset default 20/max 100; follow `Link`. Project issues support keyset in 18.3+. Large results can omit totals. [Pagination](https://docs.gitlab.com/api/rest/#pagination) | GitLab.com currently documents 2,000 authenticated API requests/minute, issue creation 200/minute, notes 60/minute; self-managed limits are configurable and layered. Honor 429, `Retry-After`, and `RateLimit-*`. [GitLab.com limits](https://docs.gitlab.com/user/gitlab_com/#rate-limits-on-gitlabcom), [rate-limit headers](https://docs.gitlab.com/administration/settings/user_and_ip_rate_limits/#response-headers) | No; same stale-cache rule |
| Jira Cloud | OAuth 2.0 3LO recommended for integrations; API-token basic auth is for personal/ad-hoc scripts. Password basic auth is deprecated. [REST auth model](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#authentication-and-authorization), [basic auth](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/) | Operation-specific `startAt`, `maxResults`, `total`/`isLast`; limits can change without notice. [Pagination](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#pagination) | Points/quota, burst, and per-issue write limits coexist; handle 429 and `Retry-After` instead of hard-coding a single quota. [Rate limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/) | No; same stale-cache rule |
| Linear | OAuth2 recommended for apps; personal API key for personal scripts. OAuth supports narrow `issues:create` and `comments:create` plus broader `write`. [OAuth](https://linear.app/developers/oauth-2-0-authentication), [GraphQL auth](https://linear.app/developers/graphql) | Relay cursors (`first/after`, `last/before`), default 50; follow `pageInfo`. [Pagination](https://linear.app/developers/pagination) | Current table: API key 2,500 requests/user/hour, OAuth app 5,000/user-or-app-user/hour, plus complexity and endpoint limits. GraphQL rate errors can be HTTP 400 with `extensions.code=RATELIMITED`; limits are evolving. [Rate limiting](https://linear.app/developers/rate-limiting) | No; same stale-cache rule |

### Normalized error contract

**Recommendation — High confidence (91%).** Return a typed error while retaining provider evidence:

```text
kind: invalid_ref | ambiguous_ref | unauthenticated | forbidden | not_found |
      validation | conflict | unsupported | rate_limited | unavailable |
      offline | precondition_failed | ambiguous_commit | provider_error
retryable: boolean
retryAt: timestamp?
operationDispatched: boolean | unknown
providerStatus/providerCode/providerRequestId/rawSummary
capabilityOrConstraint: string?
```

- Do not collapse `403` and `404` based on guesswork: GitHub and GitLab may obscure private resources. Include remediation without revealing resource existence.
- Treat provider validation and unsupported capability separately. GitHub create can return 410 when issues are disabled and 422 for validation/spam; GitLab uses 400 validation and 429 limits; Linear can return partial GraphQL data with an `errors` array even on HTTP 200. [GitHub create statuses](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10), [GitLab status codes](https://docs.gitlab.com/api/rest/troubleshooting/#status-codes), [Linear error handling](https://linear.app/developers/graphql#handling-errors).
- Retry only bounded reads and writes proven not dispatched. Honor provider reset/retry headers and exponential backoff with jitter.
- Preserve request IDs/headers where supplied for audit and support, while redacting credentials and untrusted bodies.

### Idempotency and concurrency

**Direct evidence — Medium confidence (78%).** The reviewed GitHub, GitLab, Jira, and Linear issue-create documentation does not specify a general client idempotency key for issue creation. This is an evidence-of-absence finding limited to the current official create contracts, not proof that no endpoint anywhere supports idempotency. Jira issue-link creation treats a duplicate link as created, but a repeated request with a comment adds the comment again. [GitHub create](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10), [GitLab create](https://docs.gitlab.com/api/issues/#create-an-issue), [Jira create](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post), [Linear create](https://linear.app/developers/graphql), [Jira issue links](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/).

**Recommendation — Medium confidence (85%).** The provider boundary must:

- Generate an `operationId` for every mutation and record it in the local workflow audit before dispatch.
- Where acceptable, embed a non-secret marker in created content/provider metadata and reconcile by marker after an ambiguous response. Search indexing is not proof of absence, so reconciliation should inspect recent container items directly and may still return `ambiguous_commit`.
- Never automatically retry create/comment after an unknown post-dispatch outcome. State-setting updates may be retryable only when a read proves the desired state and no lost-update risk exists.
- Support `expectedUpdatedAt`/ETag/native version when available; otherwise read-before-write, apply the smallest patch, and read-after-write. This mitigates but does not eliminate races.
- For local create, use immutable ULID/UUID identity and exclusive creation. For update/comment, lock per issue, verify an expected digest, write a same-directory temporary file, atomically replace, then release the lock. Bound paths to the configured root. Git conflicts remain a separate synchronization conflict.

### Offline behavior

**Recommendation — High confidence (94%).** Capability discovery must report `offlineRead` and `offlineWrite` independently. Local Markdown supports both. Hosted providers support neither authoritative read nor write offline; a cached issue snapshot can be handed to a workflow only when clearly marked `stale`, with source ref and snapshot time. Queueing silent future writes is out of v1 because it complicates authorization, ordering, idempotency, and user intent.

## 6. Initial GitHub Provider Recommendation

### Required v1 capability profile

**Recommendation — High confidence (93%).** Implement these as the guaranteed GitHub profile:

- Resolve full GitHub issue URLs, canonical Maister URIs, `OWNER/REPO#N`, and bare `#N` only with unambiguous configured repository context.
- Create an issue with title and optional Markdown body; labels may be included only after capability/permission validation.
- Read one issue and reject a response containing `pull_request` when kind `issue` was requested.
- List repository issues with state/label/assignee filters and bounded pagination; search with an explicit query and `type:issue` guard.
- Patch title/body; add/remove labels without replacing unrelated labels; add a comment; close/reopen with the supported state reason where available.
- Return canonical ref, current web URL, raw node/database IDs, timestamps, normalized coarse state, and provider request/rate metadata.
- Provide read-only `capabilities()` and auth/repository preflight. Require fine-grained repository **Issues: read** for reads and **Issues: write** for mutations, or equivalent GitHub App/OAuth permissions.
- Pin `X-GitHub-Api-Version: 2026-03-10` and `Accept: application/vnd.github+json`. GitHub states breaking changes ship in a new API version. [API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions?apiVersion=2026-03-10).

The official REST surface directly guarantees the core operations, and the official `gh issue` family exposes create/list/view/edit/comment/close/reopen. [GitHub REST Issues](https://docs.github.com/en/rest/issues), [`gh issue`](https://cli.github.com/manual/gh_issue). Installed `gh 2.96.0` additionally exposed structured JSON for issue list/view and flags for parent/sub-issue/dependency/type operations; this confirms local executability but does not make those features portable requirements.

### Optional, capability-gated in v1

- Assignees and milestones: permissions/eligibility can cause rejection or silent dropping.
- Issue types and organization issue fields: require feature enablement, organization ownership, and write access; official docs explicitly describe contextual availability and silent drop behavior. Read-after-write verification is mandatory.
- Parent/sub-issues and blocking dependencies: API `2026-03-10` documents them and `gh 2.96.0` exposes corresponding flags, but treat them as native extensions until GitHub Enterprise Server/version and repository capability are known.
- Projects v2: separate permissions and object model; `gh issue create` requires the `project` scope for project assignment. Keep outside core capture/handoff.
- Pin/lock/transfer/delete and PR operations: not needed for intake-to-workflow handoff.

### Graceful degradation and safety rules

1. If `gh` is absent but API credentials and network are available, use the API adapter. If API transport is not implemented/configured, return `transport_unavailable`; do not ask a workflow model to improvise shell commands.
2. If `gh` is selected, require a supported version, explicit `--repo`, non-interactive flags, and JSON output. `gh auth status`/equivalent preflight must not leak tokens.
3. If labels/assignees/type/fields are requested, preflight them. After create/update, re-read and compare requested values because GitHub documents silent dropping for some metadata without sufficient access. [Create/update issue parameters](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10).
4. Follow `Link` headers, cap total pages/results, surface truncation, and preserve rate-limit headers. Do not fetch all pages by default.
5. Map 401/403/404/410/422/429/503 with raw status and actionable remediation. Respect primary and secondary rate-limit guidance; repeated requests while limited can ban an integration. [Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10).
6. Never auto-retry an ambiguous create/comment. Reconcile by operation marker/recent issues, or return `ambiguous_commit` for user review.
7. Treat issue bodies, comments, labels, titles, and URLs as untrusted input. Pass structured arguments/JSON rather than interpolated shell, redact auth headers, and allow only configured GitHub hosts/repositories.

**Inference — High confidence (90%).** This profile is large enough for fast capture and issue-to-workflow handoff, while every excluded feature has a documented configuration, permission, tier, kind, or object-model dependency. It therefore supports a real v1 without pretending GitHub's richer planning model is portable.

## Answers to the Six Category 3 Questions

1. **Smallest common set:** resolve, create, read, list/search, patch update, comment, labels, state transition, and capability discovery; normalize only minimal issue fields and retain raw metadata.
2. **Non-normalizable:** issue/PR kind, hierarchy, dependency links, projects, workflow states/transitions, issue types/custom fields, assignee identity/cardinality, rich text, and move semantics stay capability-gated/native.
3. **Execution:** filesystem for local; API semantics as the hosted baseline; CLI as a versioned convenience adapter; MCP as an optional host adapter. Preselect transport, and never post-dispatch fail over a write without proof.
4. **References:** persist `maister-issue://<provider>/<authority>/<container...>/<kind>/<native-id>` plus current `webUrl`; accept aliases and vendor URLs only as resolver inputs.
5. **Boundary semantics:** expose auth requirements, continuation cursor, rate/reset metadata, typed errors with raw provider evidence, dispatch/ambiguous-commit state, preconditions, and independent offline read/write capabilities.
6. **GitHub v1:** pin REST `2026-03-10`; guarantee issue-only CRUD/comments/labels/open-close/search with capability/auth preflight; gate hierarchy/dependencies/types/fields/projects/assignees and degrade explicitly.

