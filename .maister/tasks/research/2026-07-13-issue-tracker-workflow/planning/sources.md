# Source Register: Configurable Issue Tracker Workflow

## TL;DR
Primary evidence comes from Maister's canonical plugin, adapters, and tests; the installed `mattpocock/skills` files; and current official tracker documentation. Local sources listed as verified were confirmed present during planning. External URLs are planned and unverified until a gatherer records access date, applicability, and relevant evidence.

## Key Decisions
- Prefer canonical source and tests over generated variants or descriptive documentation when determining current Maister behavior.
- Treat the installed `/Users/mrapacz/.agents/skills` copy as authoritative for locally available prior art and the upstream repository as provenance/comparison.
- Use only official vendor documentation for material API, authentication, rate-limit, and capability claims.
- Keep an explicit source status so planned sources cannot be mistaken for reviewed evidence.

## Open Questions / Risks
- External documentation paths and API behavior may change; every planned URL needs current verification before citation.
- Some tracker capabilities depend on plan, repository settings, CLI version, or preview APIs.
- Installed skills may differ from the current upstream repository.
- Generated Maister variants can look authoritative while being derived artifacts; conclusions must trace back to canonical source or adapters.

## Status Legend

- **Verified local** — path was confirmed present and, where noted, read during planning.
- **Planned local** — expected local evidence to be read by a gatherer; presence or relevance still needs confirmation.
- **Planned external / unverified** — candidate primary source; URL, currency, and exact claim support must be checked during gathering.
- **Supporting** — useful context but not sufficient as sole evidence for behavior.

## Research Foundation

| Status | Source | Purpose |
|---|---|---|
| Verified local, read | `.maister/tasks/research/2026-07-13-issue-tracker-workflow/planning/research-brief.md` | Scope, constraints, success criteria, and initial state-ownership decisions. |
| Verified local, read | `.maister/docs/INDEX.md` | Index of project documentation and standards. |
| Verified local, read | `.maister/docs/project/vision.md` | Product goals: cross-platform parity, auditability, resumability, safety, and minimal dependencies. |
| Verified local, read | `.maister/docs/project/roadmap.md` | Current priorities and known platform/runtime assurance gaps. |
| Verified local, read | `.maister/docs/project/tech-stack.md` | Implementation constraints: Markdown/YAML, shell, Node ESM, no database, deterministic build. |
| Verified local, read | `.maister/docs/project/architecture.md` | Canonical/generated ownership, adapters, persistence, configuration, and workflow control flow. |
| Verified local, read | `/Users/mrapacz/.codex/plugins/cache/maister-local/maister/2.2.1-fork.1/skills/research/references/research-methodologies.md` | Mixed-method decomposition, triangulation, comparative analysis, and confidence scoring. |

## Category 1 Sources — Maister Internals and Platform Adapters

### Primary local evidence

| Status | Source | Questions supported |
|---|---|---|
| Verified local | `plugins/maister/skills/research/SKILL.md` | Research input, initialization, task state, outputs, and handoff semantics. |
| Verified local | `plugins/maister/skills/quick-plan/SKILL.md` | Current quick-plan input contract and output behavior. |
| Verified local | `plugins/maister/skills/development/SKILL.md` | Development entry points, phase initialization, and source-context handling. |
| Verified local | `plugins/maister/commands/work.md` | Thin command delegation and unified workflow entry. |
| Verified local | `plugins/maister/skills/orchestrator-framework/SKILL.md` | Shared orchestration responsibilities and framework boundaries. |
| Verified local | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | Canonical state schema, phase lifecycle, gates, persistence, and context-passing rules. |
| Verified local | `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml` | Host capability differences relevant to provider execution and continuation. |
| Verified local | `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` | Executable state-validation and continuation patterns. |
| Verified local | `platforms/codex-cli/build.sh` | Codex transformation and generated-artifact impact. |
| Verified local | `platforms/cursor/build.sh` | Cursor transformation and generated-artifact impact. |
| Verified local | `platforms/kiro-cli/build.sh` | Kiro transformation and generated-artifact impact. |
| Planned local | `plugins/maister/commands/` and `plugins/maister/skills/` invocation wrappers related to research, planning, development, and quick flows | Exact command-to-skill input vocabulary and aliases. |
| Planned local | `.maister/config.yml` and configuration initialization/reconciliation paths | Current configuration ownership, defaults, validation, and atomic update patterns. |

### Verification and precedent

| Status | Source | Purpose |
|---|---|---|
| Verified local | `tests/phase-continue-contract.test.sh` | Contract-test pattern for state and continuation boundaries. |
| Verified local | `tests/fully-automatic-phase-continue.test.sh` | Transactional continuation and fail-closed behavior. |
| Verified local | `tests/host-capability-matrix.test.sh` | Cross-host capability validation precedent. |
| Verified local | `tests/advisor-config-reconciliation.test.sh` | Atomic, allowlisted, fail-closed configuration reconciliation. |
| Verified local | `tests/fixtures/phase-continue/` | Valid/invalid state fixture patterns. |
| Verified local | `platforms/codex-cli/tests/install.test.sh` | Codex installation contract and generated layout. |
| Verified local | `platforms/cursor/tests/install.test.sh` | Cursor installation contract and generated layout. |
| Verified local | `platforms/kiro-cli/tests/validation.test.sh` | Kiro validation and platform-specific constraints. |
| Supporting local | `plugins/maister-codex/`, `plugins/maister-cursor/`, `plugins/maister-kiro/` | Generated parity checks only; not canonical evidence. |

## Category 2 Sources — Installed `mattpocock/skills`

### Primary installed evidence

| Status | Source | Purpose |
|---|---|---|
| Verified local, read | `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/SKILL.md` | Interactive tracker selection, repository-local config, labels, and domain-doc setup. |
| Verified local, read | `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md` | Local Markdown layout, publication/fetch semantics, status, blocking, claim, and resolve behavior. |
| Verified local, read | `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md` | GitHub CLI operations, issue/PR ambiguity, dependencies, frontier, and handoff conventions. |
| Verified local, read | `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-gitlab.md` | GitLab CLI operations, MR semantics, blocking links, tier fallback, and handoff conventions. |
| Verified local, read | `/Users/mrapacz/.agents/skills/to-spec/SKILL.md` | Conversation/codebase-to-spec publication and readiness labeling. |
| Verified local, read | `/Users/mrapacz/.agents/skills/to-tickets/SKILL.md` | Tracer-bullet decomposition, blocking edges, provider-dependent publication, and implementation handoff. |
| Verified local, read | `/Users/mrapacz/.agents/skills/triage/SKILL.md` | Tracker-independent role/state machine and agent-ready brief workflow. |
| Verified local, read | `/Users/mrapacz/.agents/skills/implement/SKILL.md` | Ticket/spec-to-implementation handoff and completion expectations. |
| Planned local | `/Users/mrapacz/.agents/skills/triage/AGENT-BRIEF.md` | Durable context contract handed to implementation agents. |
| Planned local | `/Users/mrapacz/.agents/skills/wayfinder/SKILL.md` | Map, frontier, claim, blocking, and resolution semantics across providers. |
| Planned local | `/Users/mrapacz/.agents/skills/domain-modeling/SKILL.md` | Domain terminology and decision persistence used during triage. |
| Planned local | `/Users/mrapacz/.agents/skills/tdd/SKILL.md` and `/Users/mrapacz/.agents/skills/code-review/SKILL.md` | Downstream implementation quality gates where relevant. |

### Upstream provenance

| Status | Source | Purpose |
|---|---|---|
| Planned external / unverified | https://github.com/mattpocock/skills | Upstream repository history, current templates, and differences from the installed copy. |

## Category 3 Sources — External Tracker Providers

All URLs below are **planned external / unverified** until the gatherer opens them, records the access date, confirms they are current official documentation, and cites the exact sections used.

### GitHub

| Source | Purpose |
|---|---|
| https://docs.github.com/en/rest/issues/issues | Create, read, update, list, lock, and state behavior for issues. |
| https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api | Pagination contract. |
| https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api | Rate limits and response handling. |
| https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api | Authentication boundaries and token use. |
| https://cli.github.com/manual/gh_issue | Official `gh issue` command family. |
| https://cli.github.com/manual/gh_issue_create | Fast creation flags and interactive/non-interactive behavior. |
| https://cli.github.com/manual/gh_issue_view | Issue retrieval and JSON output behavior. |

### GitLab

| Source | Purpose |
|---|---|
| https://docs.gitlab.com/api/issues/ | Issue API operations, identifiers, pagination, and fields. |
| https://docs.gitlab.com/api/issue_links/ | Related and blocking issue capabilities and tier constraints. |
| https://docs.gitlab.com/api/rest/authentication/ | Authentication methods and credential handling. |
| https://docs.gitlab.com/api/rest/ | REST conventions, pagination, status codes, and errors. |
| https://docs.gitlab.com/cli/issue/ | Official `glab issue` command surface; verify URL and installed-version parity. |

### Jira Cloud

| Source | Purpose |
|---|---|
| https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/ | Issue create/read/edit and project-scoped identifiers. |
| https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/ | Authentication guidance and constraints. |
| https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/ | REST conventions, errors, pagination, and versioning. |

### Linear

| Source | Purpose |
|---|---|
| https://linear.app/developers/graphql | GraphQL endpoint, authentication, queries, mutations, and pagination. |
| https://linear.app/developers/rate-limiting | Rate-limit semantics and client behavior. |
| https://linear.app/developers/webhooks | Change-notification options; likely post-v1, useful for ownership analysis. |

### Local Markdown and portable persistence

| Status | Source | Purpose |
|---|---|---|
| Verified local | `/Users/mrapacz/.agents/skills/setup-matt-pocock-skills/issue-tracker-local.md` | Concrete local layout and operations to evaluate. |
| Planned local | Existing Maister atomic-write and rollback tests/scripts discovered through `rg` in `plugins/maister/` and `tests/` | Repository-native precedent for safe writes and transactional rejection. |
| Planned external / unverified | https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html | Portable atomic-replacement semantics and limitations relevant to local writes. |

## Category 4 Sources — UX, Domain Model, Testing, and Security

### Project standards and precedents

| Status | Source | Purpose |
|---|---|---|
| Planned local | `.maister/docs/standards/global/validation.md` | Allowlisting, format checks, sanitization, and boundary validation. |
| Planned local | `.maister/docs/standards/global/error-handling.md` | Fail-fast errors, retries, degradation, and cleanup. |
| Planned local | `.maister/docs/standards/global/minimal-implementation.md` | Minimum viable interface and avoidance of speculative provider abstractions. |
| Planned local | `.maister/docs/standards/global/build-pipeline.md` | Canonical edits, generated ownership, and cross-platform validation. |
| Planned local | `.maister/docs/standards/global/conventions.md` | Project structure, dependencies, feature flags, and test expectations. |
| Planned local | `.maister/docs/standards/testing/test-writing.md` | Behavior-focused, risk-based, external-mock, and transactional rejection tests. |
| Verified local | `.maister/docs/project/vision.md` | User and safety goals for UX trade-offs. |
| Verified local | `.maister/docs/project/architecture.md` | State ownership, configuration, and integration constraints. |
| Verified local | `.maister/docs/project/tech-stack.md` | No-database and minimal-dependency constraints. |

### Security primary sources

| Status | Source | Purpose |
|---|---|---|
| Planned external / unverified | https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html | Credential storage, exposure prevention, rotation, and least privilege. |
| Planned external / unverified | https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html | Command/input injection threat framing. |
| Planned external / unverified | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | Prompt-injection and untrusted issue-content risks; verify current project/version and use only applicable guidance. |
| Planned external / unverified | Vendor authentication pages listed in Category 3 | Provider-specific token scopes and credential handling. |

## Source Evaluation Rules

For every cited finding, record:

1. source path or direct URL;
2. access date for external sources;
3. version, plan/tier, preview status, or CLI version when behavior depends on it;
4. whether evidence is direct, inferred, or recommended;
5. contradictions or limitations;
6. confidence according to `planning/research-plan.md`.

Do not promote a source from planned to verified merely because its URL resolves. The gatherer must confirm that the source directly supports the claim and is current for the relevant product/API version.
