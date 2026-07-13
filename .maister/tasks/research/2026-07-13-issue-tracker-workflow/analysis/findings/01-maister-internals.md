# Category 1 Findings: Maister Internals and Platform Adapters

## TL;DR
Maister has a strong workflow-state boundary but no durable tracker boundary: `/work` recognizes issue-like inputs and `task-classifier` fetches them ad hoc, while research/development initialize only from prose or Maister task paths. `quick-plan` is not an orchestrated task and owns no `orchestrator-state.yml`.
The safest design is a small canonical issue-intake skill plus a dependency-free executable provider helper, with project defaults in `.maister/config.yml` and a normalized immutable snapshot/reference passed into each workflow before its existing initialization.
Tracker status, comments, assignments, and provider-native metadata must stay tracker-owned; workflow state should retain provenance and the start-time snapshot only. Canonical edits belong under `plugins/maister/` and `platforms/`, then flow through deterministic generated variants.
Platform adapters materially differ in commands, questions, planning, progress, agents, and argument injection, so a new public skill is safer than a command-only feature and still requires adapter/contract coverage.

## Key Decisions
- Keep tracker intake outside phase execution state — `orchestrator-state.yml` becomes authoritative only after research/development starts, while the tracker remains authoritative for the live work item.
- Resolve and snapshot an issue before creating workflow state — downstream phases then operate reproducibly even if the provider is offline or the issue changes.
- Put shared provider execution in one canonical, dependency-light helper and expose it through a canonical public skill — this preserves documentation-as-code while avoiding four prose implementations of parsing, validation, and subprocess behavior.
- Preserve direct prose and existing Maister-task-path inputs — issue references are an additional intake form, not a replacement.

## Open Questions / Risks
- `quick-plan` has divergent persistence: Claude/Codex use host planning, while Cursor/Kiro require `.maister/plans/*.md`; the product must decide where issue provenance is recorded on native-plan hosts.
- `/work` currently claims generic issue integration without a provider contract, stable reference grammar, authentication boundary, or durable transfer of fetched content.
- Cursor and Kiro use explicit command-collapse/argument allowlists; adding only a canonical command can silently omit or under-adapt the feature on those hosts.
- All four host-native automatic-continuation capabilities are currently declared unsupported, so provider logic must not assume automatic gate continuation or synthetic prompt answers.
- The documented/observed workflow state shape and executable continuation state shape currently disagree (`started_phase` plus nested `orchestrator.phases` versus `current_phase` plus root `phases`); adding issue provenance must not deepen this split.

## Evidence and Verification Method

This report treats `plugins/maister/` as canonical, `platforms/*` as adapter-owned, and `plugins/maister-{codex,cursor,kiro}/` as generated parity evidence only. That ownership is direct evidence in `.maister/docs/project/architecture.md` under **Architecture Pattern** and **Generated Variants**, and in `.maister/docs/standards/global/build-pipeline.md` under **Canonical Source and Reproducible Generated Variants**.

Local verification on 2026-07-13 used `rg`, full-file/range reads, generated-output parity inspection, and these focused tests:

- `tests/phase-continue-contract.test.sh`: **21 passed, 0 failed**.
- `tests/advisor-config-reconciliation.test.sh`: **13 passed**.
- `tests/host-capability-matrix.test.sh`: **6 passed, 0 failed**.

No product code or generated plugin tree was modified. **Confidence: High (98%)** for the inspected current-state claims; recommendations are explicitly marked and capped lower where product choices remain.

## 1. Current Intake, Initialization, and Resume Model

### Workflow comparison

| Entry point | Accepted context today | Initialization and persistence | Resume behavior | Evidence type and confidence |
|---|---|---|---|---|
| `/maister:research` | Research question; `--type`; brainstorming/design flags; an existing research task path plus `--from=PHASE` | Captures UTC time, creates phase tasks, creates `.maister/tasks/research/YYYY-MM-DD-*`, writes `orchestrator-state.yml`, snapshots project config into state, optionally creates dashboard files, then writes brief/plan/findings/report | Artifact-aware Phase 1 resume checks plus state-driven phase resume | Direct: `plugins/maister/skills/research/SKILL.md`, **Initialization**, **Phase 1: Research Foundation**, **Domain Context**, **Command Integration**. High (98%). |
| `/maister:quick-plan` | Task argument or a user question | Canonical Claude flow enters host plan mode and has **no task directory or `orchestrator-state.yml`**. Cursor/Kiro override it with `.maister/plans/YYYY-MM-DD-plan-name.md` plus an approval gate | No canonical resumable orchestrator; the plan artifact is the durable object only on Cursor/Kiro | Direct: `plugins/maister/skills/quick-plan/SKILL.md`, **Workflow**; `platforms/cursor/overrides/skills/quick-plan/SKILL.md`, **Workflow**; `platforms/kiro-cli/overrides/commands/quick-plan.md`, **Workflow**. High (97%). |
| `/maister:development` | Prose description; a research task folder; `--research=PATH`; a product-design task path or inline mockup path; phase and optional flags | Resolves research/design context, captures UTC time, creates phase tasks and `.maister/tasks/development/YYYY-MM-DD-*`, writes state containing task/research references, snapshots config, discovers project docs, and optionally creates dashboard/design-context files | Reads state and expected artifacts, restores ephemeral phase-task UI, and resumes at first incomplete phase | Direct: `plugins/maister/skills/development/SKILL.md`, **Initialization**, **Research-Based Development**, **Design-Informed Development**, **Command Integration**. High (98%). |
| `/work` | Existing task path/name, prose, no argument, or advertised GitHub/Jira/Azure issue forms (`#456`, `GH-456`, `PROJ-456`, `AB#123`, URLs) | Does not own workflow state. It detects an existing task and routes resume, or delegates classification and invokes the selected orchestrator with a description | Reads an existing task's state, derives status/next phase, asks how to resume, then passes `--resume`/`--from` to the owning orchestrator | Direct: `plugins/maister/commands/work.md`, **Input Types**, **Step 1**, **Step 2**, **Step 3**. High (96%). |

### Existing issue intake is real but incomplete

**Direct evidence.** `plugins/maister/commands/work.md` advertises issue identifiers and delegates new input to `plugins/maister/agents/task-classifier.md`. Under **Phase 1: Input Processing & Issue Fetching**, that agent recognizes GitHub, Jira, Azure DevOps, and generic URLs, then tries MCP, vendor CLI, `WebFetch`, and finally a user prompt. Its output schema under **Phase 5: Output Classification** retains only a small `issue_source` projection (`type`, `identifier`, `title`, `labels`).

**Inference.** The fetched body/comments/state can influence classification in the isolated classifier, but `/work` subsequently routes with `args: "[description]"`; no canonical payload requires the enriched issue body, retrieval timestamp, provider identity, revision/digest, or normalized reference to reach the selected workflow. A routed workflow can therefore start from less context than the classifier used, and resume cannot reconstruct exactly what was fetched. **Confidence: High (92%)**, based on both command and agent contracts; there is no end-to-end test proving a richer hidden handoff.

**Recommendation.** Replace classifier-owned retrieval with a shared intake result consumed by both classifier and routed workflow. The classifier should classify a normalized snapshot, not own provider fallback policy. **Confidence: Medium (84%)** because the boundary is strongly evidenced but the exact API is a design choice.

### End-to-end current initialization trace: this research task

The active task itself supplies an observed instance of the canonical research path:

1. **Input becomes workflow context.** `/maister:research [question]` is parsed as a mixed research task (`plugins/maister/skills/research/SKILL.md`, **Initialization** and **Research Types**).
2. **The shared contract is loaded.** The skill reads `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`; **§4 State Schema** and **§5 Initialization & Resume** define the canonical state and ordering.
3. **A real clock value is captured.** The current state records `created: "2026-07-13T13:53:40Z"`, not a guessed date (`.maister/tasks/research/2026-07-13-issue-tracker-workflow/orchestrator-state.yml`, `orchestrator.created`).
4. **Phase UI and task directory are created.** Six phase records are persisted under `.maister/tasks/research/2026-07-13-issue-tracker-workflow/`; Phase 1 is `in_progress`, later phases retain `blocked_by` edges.
5. **Project config is normalized into state once.** `.maister/config.yml` has `html_output: true` and Advisor policies; the task state contains the complete effective snapshot under `orchestrator.options`. The research skill's **Domain Context** explicitly says resume reads canonical state and does not reread project config.
6. **Authoritative and derived artifacts separate.** `orchestrator-state.yml` is authoritative; `dashboard.html` is a copied plugin asset and `dashboard-data.js` is a projection (`orchestrator-patterns.md`, **§8 Operator Dashboard**).
7. **Phase 1 artifacts accumulate with resume markers.** The brief, plan, and source register exist; state records `steps_completed: [initialize, plan]`. `research/SKILL.md`, **Phase 1**, resumes by checking these artifacts before gather/synthesis.
8. **A later resume starts from state.** Shared **§5 Task Restoration on Resume** recreates host task UI because host IDs are ephemeral, validates expected artifacts, and finds the first incomplete phase without making the dashboard authoritative.

This is direct local evidence plus the canonical contract. **Confidence: High (99%)**.

### Verified state-schema contradiction

**Direct evidence.** `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`, **§4 Common Fields**, specifies `orchestrator.started_phase`; the active research state follows that name and nests `phases` under `orchestrator`. In contrast, `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` `validateCanonicalState` requires exactly one root-level `phases` sequence, and `validateTransition` requires `orchestrator.current_phase`. `tests/fixtures/phase-continue/valid-empty.yml` and `tests/phase-continue-contract.test.sh` exercise the executable shape, including explicit rejection when root `phases` is absent.

**Inference.** The active task state would not satisfy the continuation runner's canonical preflight. This does not currently create an automatic transition because every host is capability-matrix `unsupported`, but it is a real prerequisite for future automatic continuation and a warning against inventing a third location for `source_issue`. **Confidence: High (97%)**.

**Recommendation.** Reconcile and fixture one canonical workflow-state schema before or in the same development tranche as issue provenance, then place `source_issue` at one shared, tested anchor. Do not make provider code compensate for both shapes. **Confidence: High (92%)**.

## 2. State and Content Ownership

### What must enter the workflow at initialization

**Recommendation:** resolve issue input before the existing clock/task-directory/state sequence and persist the following normalized, immutable intake data:

- `source_issue.ref`: canonical provider-qualified reference.
- `source_issue.provider`: selected provider key and provider kind, not credentials.
- `source_issue.retrieved_at`: real UTC timestamp.
- `source_issue.revision`: provider revision/update token when available, otherwise `null`.
- `source_issue.digest`: digest of the normalized snapshot for drift/audit checks.
- Snapshot fields needed to execute offline: native ID, title, body/description, labels/tags, state at retrieval, canonical URL if available, and selected acceptance criteria/context.
- Retrieval warnings and capabilities actually used, so degraded behavior is auditable.
- For research/development, a human-readable immutable artifact such as `analysis/intake/issue-snapshot.md`, referenced from state; for quick-plan, the same provenance/snapshot summary in the plan artifact or its host-native equivalent.

This mirrors existing research-to-development behavior: `plugins/maister/skills/development/SKILL.md`, **Research-Based Development**, stores a compact `research_reference` in state and copies durable artifacts into `analysis/research-context/`. **Confidence: Medium-High (88%)**; the pattern is direct, field selection is recommended.

### What must remain tracker-owned

The provider remains authoritative for live status/workflow state, comments and discussion history, assignments, projects/milestones, dependencies, custom fields, attachments, reactions, and all later edits. Workflow phases must not mirror these mutable fields into `orchestrator-state.yml` as a second backlog. A later explicit refresh may compare provider revision/digest and append a new snapshot or drift notice; it must not silently rewrite the start-time snapshot.

**Inference from current architecture.** `.maister/docs/project/architecture.md`, **Persistence Model**, makes `orchestrator-state.yml` the sole resume source for workflow execution, while the research brief explicitly separates persistent work intake from execution state. Therefore the state may own source provenance and the exact input used, but not the provider's live lifecycle. **Confidence: High (94%)**.

### Canonical versus generated ownership

- **Canonical and editable:** `plugins/maister/skills/**`, `plugins/maister/commands/**`, `plugins/maister/agents/**`, shared executable/reference files under `plugins/maister/skills/orchestrator-framework/**`, and host adaptations under `platforms/**`.
- **Project-owned runtime data:** `.maister/config.yml`, tracker-local data if local Markdown is selected, `.maister/tasks/**`, and `.maister/plans/**` where the host adapter uses file planning.
- **Generated, never edited directly:** `plugins/maister-codex/**`, `plugins/maister-cursor/**`, `plugins/maister-kiro/**`.

Direct evidence: `.maister/docs/project/architecture.md`, **System Structure**; `.maister/docs/standards/global/build-pipeline.md`; `.github/workflows/validate-generated-variants.yml`, drift check. **Confidence: High (99%)**.

## 3. Seam Map: Exact Proposed Integration Locations

The paths marked “new” are recommendations, not existing files.

| Concern | Safest canonical seam | Exact integration locations | Why this seam fits |
|---|---|---|---|
| Tracker configuration | `.maister/config.yml`; scaffold/upgrade in `plugins/maister/skills/init/SKILL.md`, **Advisor pre-flight** / **Phase 5: Initialize Documentation Structure** | Add a top-level tracker block and normalize it before workflows snapshot config. If strict mutation is needed, add a sibling helper rather than widening Advisor-specific `plugins/maister/skills/init/bin/reconcile-advisor-config.sh`. | Config is already project-local, optional, read-once at workflow initialization, and copied into state. The Advisor reconciler's `build_candidate`, `commit_file`, `restore_file`, and `run_init_transaction` are the atomic/fail-closed precedent, not a generic parser API. |
| Reference parsing and provider selection | **New:** `plugins/maister/skills/issue-tracker/references/issue-ref.md` plus `plugins/maister/skills/issue-tracker/bin/issue-tracker.mjs` | The helper should accept a strict JSON/stdin or narrow CLI contract, parse provider-qualified refs, resolve defaults, and emit normalized JSON/errors. | A single executable avoids inconsistent regex/shell quoting in four host prose variants. Node ESM is already an accepted dependency for `phase-continue.mjs`; no package dependency is needed. |
| Issue retrieval and capability discovery | Same new helper and provider modules/resources under `plugins/maister/skills/issue-tracker/` | Move MCP/CLI/HTTP/filesystem preference and validation out of `plugins/maister/agents/task-classifier.md`, **Phase 1**, so classifier consumes a snapshot. Provider-specific operations remain capability-gated. | Current MCP → CLI → WebFetch fallback is agent prose, has no stable error contract, and is not reusable by direct research/development/quick-plan invocation. |
| Fast capture, list, show, select | **New public skill:** `plugins/maister/skills/issue-tracker/SKILL.md` | Expose capture/read/list/select as explicit modes. Add thin files under `plugins/maister/commands/` only if Claude slash aliases are required; otherwise public skill invocation minimizes adapter work. | Architecture says orchestration belongs in skills and commands should delegate. Codex automatically converts every command, but Cursor/Kiro command collapse is allowlisted, so a skill-first surface is less fragile. |
| Unified `/work` intake | `plugins/maister/commands/work.md`, **Step 1** and **Step 3**; `plugins/maister/agents/task-classifier.md`, **Phase 1** and output schema | Resolve input once through issue-tracker skill/helper, pass normalized snapshot to classifier, then pass the same result to the routed workflow. Existing task-folder detection remains first and unchanged. | `/work` is already the only advertised issue-aware entry, but it currently discards the durable enriched handoff contract. |
| Research handoff | `plugins/maister/skills/research/SKILL.md`, **Initialization**, before current **Step 2: Initialize Workflow**; state schema under **Domain Context** | Accept explicit issue ref/snapshot, resolve before creating task state, derive the research question from snapshot when no override is supplied, persist `source_issue`, and write `analysis/intake/issue-snapshot.md`. | This preserves current question/flags and ensures the brief is built from the exact snapshot. |
| Development handoff | `plugins/maister/skills/development/SKILL.md`, after **Step 2: Detect Research Context** and before **Step 3: Initialize Workflow**; **Domain Context** | Add issue intake alongside research/design references; preserve research-folder precedence and direct prose. Persist `source_issue` and copy the snapshot before Phase 1 analysis. | It follows the existing `research_reference` + copied context pattern and keeps issue intake from becoming a phase. |
| Quick-plan handoff | `plugins/maister/skills/quick-plan/SKILL.md`, **Workflow step 1**, and both platform overrides | Resolve an issue before planning and require provenance in the plan. Cursor/Kiro write it into `.maister/plans/*`; Claude/Codex need an explicit native-plan provenance convention or an optional plan-side Markdown artifact. | Quick-plan has no orchestrator state, and its adapters replace the canonical planning mechanism rather than merely renaming tools. |
| Shared snapshot contract | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`, after **Shared: research_reference** | Add a shared `source_issue` shape and context-passing rule, but keep provider execution out of the orchestrator framework itself. | The framework is the canonical cross-workflow state/context contract; it is explicitly non-executable (`plugins/maister/skills/orchestrator-framework/SKILL.md`, **NOT an Executable Skill**). |
| Build and parity | `platforms/codex-cli/build.sh`, `platforms/cursor/build.sh`, `platforms/kiro-cli/build.sh`; `Makefile`; platform tests | Add only necessary semantic transforms, argument injection, command collapse, inventory counts, and fixtures. Regenerate all outputs with `make build`; validate with `make validate`. | The generated trees are deterministic artifacts and CI rejects drift. |

**Recommendation confidence: Medium-High (86%).** The integration points are high-confidence; naming and whether aliases are needed are implementation choices.

## 4. Platform Transformation and Capability Impact

### Platform impact table

| Host | Canonical-to-host transformation | Relevant host capabilities/differences | Issue-provider impact | Evidence and confidence |
|---|---|---|---|---|
| Claude Code | No generated adapter; `plugins/maister/` is Claude-oriented canonical source with skills, commands, Markdown agents, `AskUserQuestion`, `TaskCreate/TaskUpdate`, `Skill`/`Task`, `EnterPlanMode/ExitPlanMode`, and Bash/Read/Write vocabulary | Native user questions and plan mode; commands remain commands; provider subprocesses can be described through Bash, but writes still need explicit workflow/skill authorization | A canonical public skill/helper works directly. A thin capture command may delegate to it. Never place mutable provider credentials in plugin files or task snapshots. | Direct: canonical files and `orchestrator-patterns.md`, **§1 Delegation Rules**, **§5 Initialization**. High (96%). |
| Codex | `platforms/codex-cli/build.sh` `transform_markdown`/`transform_tree_markdown` removes Claude frontmatter and rewrites questions, task UI, plan mode, Skill/Task terminology, agent roles, instruction filename, and invocation syntax. Every canonical command becomes a skill. | No command component; no bundled custom-agent directory in current plugin MVP; source agents are expressed as native Codex subagent roles; canonical plan mode becomes “native planning flow”; `orchestrator-state.yml` remains progress authority | Put executable resources under the issue-tracker skill so `copy_skill` carries them. New canonical commands are automatically converted, but command and rich-skill name collisions must be avoided. Test strict transform residue and invocation syntax. | Direct: `platforms/codex-cli/build.sh` functions and command loop; `platforms/codex-cli/smoke-cli.sh`; `Makefile` `validate-codex`. High (98%). |
| Cursor | Copies canonical tree, renames `maister:` to `maister-`, `AskUserQuestion` to `AskQuestion`, Claude plan mode to file planning, Task UI to `TodoWrite`, commands to selected skills, framework/internal skills into `lib/`, and agents to host frontmatter/read-only policy | File-based quick plan at `.maister/plans/*`; custom agents; no default Playwright MCP; host user prompt and Todo semantics differ from canonical | New public skill directories are renamed automatically. New command aliases require edits to `merge_commands_to_skills`. A quick-plan issue handoff must update the Cursor override, not only canonical quick-plan. Provider helper subprocess/file assumptions need Cursor runtime smoke coverage. | Direct: `platforms/cursor/build.sh` `merge_commands_to_skills`, `apply_cursor_overrides`, `relocate_*`, `apply_todo_transforms`; Cursor quick-plan override and smoke Test 3. High (98%). |
| Kiro CLI | Copies/renames skills, merges an explicit command list, injects `$ARGUMENTS` only for an allowlist, replaces questions with chat gates, removes plan mode, rewrites Skill/Task/Explore/progress semantics, converts Markdown agents to JSON, and synthesizes TUI agents/hooks | No `AskQuestion`; chat-native gates; documented headless defaults for non-protected gates; `todo` TUI; slash skills/subagent tool; build lock; file-based quick plan; MCP moved to `settings/mcp.json` | Add issue skill to `skills_needing_args` or input can be lost. New command aliases require `merge_commands_to_skills`. Capture/update must never inherit a headless default that performs an external write; protected/ambiguous operations should stop. Update chat-gate, delegation, JSON generation, and inventory tests. | Direct: `platforms/kiro-cli/build.sh` functions `apply_chat_gate_transforms`, `apply_kiro_overrides`, `apply_delegation_transforms`, `apply_progress_transforms`; `transforms/askuser-to-chat-gate.md`; Kiro tests. High (99%). |

### Cross-host automatic continuation posture

`plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml` declares Claude, Cursor, Kiro, and Codex `unsupported`. `Makefile` targets `print-host-capabilities`/`validate-host-capabilities` project missing, skipped, unavailable, inconclusive, or failed native evidence to `unsupported`; shared runner success is explicitly insufficient. The focused host-capability test passed all six cases.

**Direct finding.** Provider operations cannot use “fully automatic workflow continuation exists” as an execution assumption. User prompts, external writes, and recovery must use each host's actual adapter and fail closed when unavailable. **Confidence: High (99%)**.

## 5. Existing Fail-Closed and Test Patterns to Reuse

| Existing precedent | Verified behavior | Provider behavior it should inspire | Confidence |
|---|---|---|---|
| `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` + `tests/phase-continue-contract.test.sh` | Exact payload allowlist/types/enums, duplicate-key rejection, canonical-state validation, path collision checks, stderr-only errors, byte/directory non-mutation on rejection, denylist blocking, deterministic reports, terminal idempotency, recoverable report/transition failures | Exact provider request/result schema; no shell interpolation; selected capability/operation membership; stable idempotency key for create/update; immutable state/files on validation or provider failure | High (99%); 21 cases passed locally. |
| `plugins/maister/skills/init/bin/reconcile-advisor-config.sh` (`build_candidate`, `commit_file`, `restore_file`, `run_init_transaction`) + reconciliation/lifecycle tests | Narrow YAML grammar, allowlists, portable identifiers, same-directory staging/rename, mode preservation, rollback across YAML and Codex TOML, injected-failure coverage | Validate tracker config before use; reject duplicate/ambiguous providers and unsafe paths; stage local tracker writes beside targets; preserve bytes/mode; roll back multi-file updates exactly | High (98%); 13 reconciliation cases passed locally. |
| `host-capabilities.yml`, `Makefile` capability targets, `tests/host-capability-matrix.test.sh` | Native evidence is mandatory; all uncertain outcomes project to unsupported; shared helper tests cannot prove host support | Provider capability discovery must distinguish configured/available/authenticated/supported; missing CLI/MCP/auth/network must not be treated as support | High (99%); 6 cases passed locally. |
| `platforms/*/build.sh`, `Makefile validate-*`, platform transform tests | Structural residue bans, naming/layout assertions, override checks, command inventory, chat-gate/Todo/delegation rewrites, generated runner matrix | Golden/structural tests for issue skill presence, argument preservation, ref grammar text, helper resource copying, and zero stale host vocabulary on every generated target | High (96%). |
| Cursor/Codex install tests for Playwright MCP opt-in | Optional external integration is absent by default and installed only when requested | Vendor CLI/MCP support should be capability-checked and opt-in where installation/config mutation is required; local Markdown must remain usable without it | Medium-High (89%); analogy is architectural rather than tracker-specific. |

### Missing tests exposed by the trace

No current test found by `rg` exercises `/work` issue forms through retrieval, classification, routing, task initialization, persisted provenance, or resume. `task-classifier` behavior is instruction-level only. This is a direct gap, **Confidence: High (96%)**.

Minimum new behavior tests should cover:

1. explicit prose remains byte-for-byte/semantically unchanged at each workflow entry;
2. unambiguous issue ref resolves once and the same snapshot reaches classifier plus research/development/quick-plan;
3. ambiguous shorthand, missing provider, unavailable auth/CLI/MCP, malformed provider output, and untrusted fields fail before task-state creation;
4. local Markdown create/update is atomic, path-confined, idempotent, and leaves complete state unchanged on injected failures;
5. workflow state owns snapshot/provenance but never silently mirrors later tracker mutations;
6. generated variants preserve arguments, helper resources, prompts, plan provenance, and skill discoverability;
7. external provider tests use mocks/fixtures and perform no real writes.

## 6. Minimum Deterministic Change Set

**Recommendation (v1):**

1. Add one canonical public issue-tracker skill and one dependency-free helper under `plugins/maister/skills/issue-tracker/`; implement only local Markdown and GitHub operations required by actual capture/handoff journeys.
2. Extend `.maister/config.yml` and `plugins/maister/skills/init/SKILL.md` with validated provider/default configuration, excluding credentials. Reuse the Advisor reconciler's transactional techniques in a tracker-specific helper; do not overload its narrow Advisor schema.
3. Replace ad hoc retrieval in `plugins/maister/agents/task-classifier.md` with consumption of a normalized snapshot; update `plugins/maister/commands/work.md` to pass that snapshot through routing.
4. Add pre-initialization issue intake to research and development, and pre-planning intake to canonical/Cursor/Kiro quick-plan. Add a shared `source_issue` state/context schema to `orchestrator-patterns.md`.
5. Prefer a skill-first capture surface. If convenience commands/shortcuts are added, update Cursor/Kiro merge/argument allowlists explicitly; Codex's generic command conversion still needs collision and structure tests.
6. Add provider contract fixtures, transactional rejection tests, mocked GitHub tests, workflow handoff tests, and adapter golden/structural checks. Then run `make build`, inspect generated diffs, and run `make validate`; commit canonical, adapter, and generated changes together.
7. Update project/user documentation in the same change: config reference, issue reference grammar, tracker/workflow ownership, auth/offline behavior, and platform invocation examples.

This preserves the current Markdown/YAML/Node/shell documentation-as-code architecture, adds no database or hosted service, keeps dependencies minimal, and leaves current direct prompt/task-path workflows intact. It also avoids speculative provider APIs: capability discovery can expose provider-native differences without implementing unused operations. This follows `.maister/docs/standards/global/minimal-implementation.md`, `.maister/docs/standards/global/validation.md`, `.maister/docs/standards/global/error-handling.md`, and `.maister/docs/standards/testing/test-writing.md`.

**Recommendation confidence: Medium-High (87%).** The repository seams and safety patterns are strongly evidenced. Final confidence is limited by unresolved product choices around canonical issue-reference syntax, quick-plan provenance on native-plan hosts, and which external-write gates are protected.

## Answers to the Six Category Questions

1. **Current context/init/resume:** research and development are stateful orchestrators with task directories and `orchestrator-state.yml`; quick-plan is native planning or a host-specific plan file without orchestrator state; work is a stateless router that can inspect existing state and advertises ad hoc issue fetching.
2. **Safest seams:** project config/init for provider defaults; a new canonical issue-tracker skill/helper for parsing/retrieval/capture; `/work`, research/development pre-initialization, and all quick-plan variants for handoff; shared state shape in orchestrator patterns.
3. **Copy/link boundary:** persist provider-qualified ref, retrieval metadata/digest, capabilities/warnings, and an immutable execution snapshot; keep live status, comments, assignments, custom workflow, and subsequent edits tracker-owned.
4. **Platform transformations:** Claude is canonical; Codex performs generic command-to-skill/tool-vocabulary transforms; Cursor uses selected command collapse, AskQuestion/Todo, custom agents, and file planning; Kiro uses selected collapse plus `$ARGUMENTS`, chat gates, TUI todos, slash/subagent transforms, JSON agents, and file planning.
5. **Fail-closed patterns:** continuation schema/idempotency/transaction tests, Advisor config validation/staging/rollback, host capability projection, and adapter structural/install tests provide direct patterns; current issue intake lacks equivalent end-to-end tests.
6. **Minimum deterministic changes:** one canonical skill/helper, config/init extension, thin integration hooks, shared snapshot schema, adapter allowlist/override updates, behavior/transaction/platform tests, generated rebuild, and documentation updates—without a database or direct edits to generated variants.
