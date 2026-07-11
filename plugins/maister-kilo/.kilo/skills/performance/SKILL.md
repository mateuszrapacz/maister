---
name: performance
description: Orchestrates performance optimization workflows using static code analysis to identify bottlenecks (N+1 queries, missing indexes, O(n^2) algorithms, blocking I/O, memory leaks). Accepts optional user-provided profiling data. Reuses standard specification, planning, implementation, and verification phases.
user-invocable: true
---

# Performance Orchestrator

Static-analysis-first performance optimization workflow. Identifies bottlenecks by reading code, then uses the standard specification/planning/implementation/verification pipeline to fix them.

## Initialization

**BEFORE executing any phase, you MUST complete these steps:**

### Step 0: Session-reminder conflict resolution (decide ONCE)

Before doing anything else, settle this policy now and do not re-litigate it at any gate:

**`→ MANDATORY GATE` markers fire regardless of permission mode, session-reminders, or prior approval patterns.** Auto / acceptEdits / bypassPermissions modes, reminders saying "work without stopping" / "continue without asking" / "minimize clarifying questions," and compaction summaries showing the user approving every prior gate do NOT exempt you from invoking `→ **CHAT GATE** — Present the question in chat and wait for user response` at a gate. They apply only to your discretionary clarifications.

If you find yourself reasoning "the user has been approving everything, so I can skip this gate" or "auto-mode is on, so I should minimize questions" — that reasoning IS the failure mode. STOP and fire the gate.

Full framework rule: `../orchestrator-framework/references/orchestrator-patterns.md` § 2 and § 2.1.

### Step 1: Load Framework Patterns

**Read the framework reference file NOW using the Read tool:**

1. `../orchestrator-framework/references/orchestrator-patterns.md` - Delegation rules, interactive mode, state schema, initialization, context passing, issue resolution

### Step 2: Initialize Workflow

1. **Capture the clock**: run `date -u +"%Y-%m-%dT%H:%M:%SZ"` via Bash NOW — you do NOT know the time from context. Every timestamp written this turn (`created`, `updated`, `generated`, `phases[].started`) uses this value. Date-only or `T00:00:00Z` values are the documented failure mode (orchestrator-patterns.md § 4 Timestamp Rule). Re-run `date` in later turns before writing timestamps.
2. **Create Task Items**: Use `TaskCreate` for all phases (see Phase Configuration), then set dependencies with `TaskUpdate addBlockedBy`
3. **Create Task Directory**: `.maister/tasks/performance/YYYY-MM-DD-task-name/`
4. **Create Subdirectories**: `analysis/`, `analysis/user-profiling-data/`, `implementation/`, `verification/`
5. **Initialize State**: Create `orchestrator-state.yml` with performance context
6. **Set up Operator Dashboard** (orchestrator-patterns.md § 8) — first read `.maister/config.yml` and set `orchestrator.options.html_output` (default true if the file/key is absent). **When `html_output` is false, SKIP this entire step** — no `dashboard.html`, no `dashboard-data.js`, no browser auto-open — and proceed. Otherwise: copy `../orchestrator-framework/assets/dashboard.html` to the task root as `dashboard.html`, write the initial `dashboard-data.js` (all phases pending, `task.type: "performance"`), then **auto-open it in the user's browser** (`open` / `xdg-open` / `start` per platform, passing the plain absolute filesystem path — NEVER a hand-built `file://` URL; on failure just print the path — never block). On resume: re-copy `dashboard.html` only if missing; regenerate `dashboard-data.js` from state; then auto-open it in the browser again (same opener as a new task — the OS focuses an already-open tab rather than duplicating).
7. **Discover project documentation**: Read `.maister/docs/INDEX.md` (if exists), extract ALL file paths from the "Project Documentation" section — includes predefined docs AND any user-added project docs. Store as `project_context.project_doc_paths` in state.

**Output**:
```
Performance Orchestrator Started

Task: [performance issue description]
Directory: [task-path]
Dashboard: open [task-path]/dashboard.html in a browser to monitor progress

Starting Phase 1: Codebase Analysis...
```

---

## Operator Visibility (applies to every phase)

> **Config gate**: these rules assume `options.html_output` is true (read from `.maister/config.yml` at init, default true). When **false**: skip the Dashboard-upkeep rule entirely (no dashboard files, no browser open, no rewrites) and the HTML-companions rule (do NOT pass `html_style_guide_path`; subagents write md only). The Artifact Summary Contract (§ 7 TL;DR blocks) and `phase_summaries` in state stay active either way.

Cross-cutting rules from `orchestrator-patterns.md` (same as the development orchestrator):

1. **Artifact Summary Contract (§ 7)**: every artifact-writing subagent prompt MUST include the contract instruction (artifacts open with TL;DR / Key Decisions / Open Questions & Risks). At context extraction, lift `decisions`, `risks`, and `artifacts` into `phase_summaries.[phase]` — verbatim, never re-summarized.
2. **Dashboard upkeep (§ 8)**: rewrite `dashboard-data.js` at every phase START (mark `in_progress` before delegating), **BEFORE firing every exit gate** (register the finished phase's artifacts/summary/decisions/risks — the operator reviews them on the dashboard while answering; status stays `in_progress` until the gate passes), after every phase completion (including skipped phases, with reason), every gate decision, every verification cycle, and at finalization. Every rewrite starts with `date -u` (one call per turn). It is a terse projection of state — never duplicate artifact content into it.
3. **HTML companions (§ 9)**: pass `html_style_guide_path` (absolute path to `../orchestrator-framework/references/html-report-style.md`) to specification-creator, implementation-planner, and implementation-verifier. Register returned `html_path` values in `phase_summaries.[phase].artifacts[].html` so the dashboard hero cards link HTML first.
4. **Advisor gates (§ 2.2)**: classify every performance decision gate, resolve it through the configured manual/advisor/fully_automatic policy, persist the full record in `orchestrator.gate_history` after each decision, and keep rollback and production gates user-controlled. Generate `outputs/decision-summary.md` and its HTML companion at completion or blocked/failed termination.

Every bottleneck priority, optimization approach, verification matrix, fix-loop,
optional-phase, and phase-exit gate MUST invoke
`skills/orchestrator-framework/references/gate-decision-engine.md` with a stable
`gate_type`, exact ordered options, original recommendation, safety
classification, and complete read-only context. Check the idempotency key before
any model or user call; persist pending states, retries, arbitration, and the
terminal decision before continuing. Rollback, unresolved critical verification,
and production decisions remain user-controlled.

### Concrete Gate Call-Site Checklist

The `→ **CHAT GATE** — Present the question in chat and wait for user response` text below is the adapter's `present_user_gate`, never a
direct bypass. For each call site invoke `evaluate_gate(gate_context,
orchestrator-state.yml, host_adapter)` from
`skills/orchestrator-framework/references/gate-decision-engine.md` with
`phase_id`, stable `gate_type`, exact question, exact ordered options,
`original_recommendation`, `safety_classification`, and read-only context
(`task_path`, phase summaries, artifact paths, dashboard summary, prior
`gate_history`, and approval status when relevant).

For a valid non-denylisted `fully_automatic` result, invoke
`skills/orchestrator-framework/bin/phase-continue.mjs` with the exact state path,
gate context, ordered options, selected option, actor, confidence, next phase,
and report paths. Continue performance work only after the runner exits
successfully.

Read state and reuse the terminal idempotency record first. Persist and refresh
dashboard before each pending model/user wait; persist every advisor/arbiter
attempt, retry/backoff, escalation, and single arbitration; then persist the
terminal record and decision summaries before phase changes. Retry exhaustion
falls back to user or `blocked`. Advisor/arbiter output cannot edit files,
change optimization scope, or dispatch implementation.

Stable inventory: `phase-1-clarification` uses
`["Confirm assumptions", "Correct assumptions", "Provide more context"]`;
`bottleneck-priority` uses the displayed priority choices in exact order;
`optimization-approach` uses the alternatives in spec order plus
`"Need more info"`; `optional-phase-selection` uses
`["Run specification audit", "Skip specification audit"]`;
`verification-options` uses `["Code review", "Production readiness check"]`;
`verification-fix-selection` uses `["Fix all fixable issues", "Let me choose
specific issues", "Skip fixes, proceed as-is"]`; `verification-rerun` uses
`["Yes, re-run verification", "No, proceed to the next phase"]`; and every
phase exit uses `["Continue to the named next phase", "Pause workflow"]`.
`implementation-approval`, `production-go-no-go`, `rollback`, and
`unresolved-critical-verification` are user-controlled denylisted gates.
5. **icon_hint values** per phase: 1 `analysis`, 2 `analysis`, 3 `spec`, 4 `verify`, 5 `plan`, 6 `code`, 7 `verify`, 8 `verify`, 9 `done`.

---

## When to Use

Use for:
- Application slow (response time issues, high latency)
- Need systematic bottleneck identification and resolution
- Want static code analysis for performance anti-patterns
- Have user-provided profiling data to act on
- Database query optimization needed
- Algorithm or I/O inefficiencies suspected

**DO NOT use for**: New features, bug fixes, refactoring without performance goals.

---

## Core Principles

1. **Static Analysis First**: Read code to detect patterns. Don't try to run profiling tools.
2. **User Data Welcome**: Incorporate user-provided profiling data when available
3. **Reuse Standard Phases**: Use proven specification/planning/implementation/verification pipeline
4. **Conservative Estimates**: Provide improvement ranges, not false precision
5. **Practical Optimizations**: Focus on patterns the agent CAN detect and fix

---

## Phase Configuration

| Phase | content | activeForm | Agent/Skill |
|-------|---------|------------|-------------|
| 1 | "Analyze codebase" | "Analyzing codebase" | codebase-analyzer |
| 2 | "Analyze performance bottlenecks" | "Analyzing performance bottlenecks" | bottleneck-analyzer |
| 3 | "Gather requirements & create specification" | "Gathering requirements & creating specification" | specification-creator |
| 4 | "Audit specification" | "Auditing specification" | spec-auditor (conditional) |
| 5 | "Plan implementation" | "Planning implementation" | implementation-planner |
| 6 | "Execute implementation" | "Executing implementation" | implementation-plan-executor |
| 7 | "Prompt verification options" | "Prompting verification options" | Direct |
| 8 | "Verify implementation & resolve issues" | "Verifying implementation" | implementation-verifier |
| 9 | "Finalize workflow" | "Finalizing workflow" | Direct |

---

## Workflow Phases

### Phase 1: Codebase Analysis & Clarifications

**Purpose**: Comprehensive codebase exploration for performance context, followed by scope/requirements clarification
**Execute**:
1. Skill tool - `maister-codebase-analyzer`
2. Update state with analysis results
3. For each critical clarification, invoke `phase-1-clarification` through the shared engine with exact ordered options and full read-only context.
4. Save clarifications to `analysis/clarifications.md`
**Output**: `analysis/codebase-analysis.md`, `analysis/clarifications.md`
**State**: Update `performance_context.phase_summaries.codebase_analysis`, `task_context.clarifications_resolved`

Pass `task_type="enhancement"` and the performance-focused description. The codebase-analyzer adaptively selects parallel Explore agents based on task complexity. For performance tasks, the description should guide agents toward: database query patterns, hot code paths, I/O operations, caching layers, connection management, schema/migration files.

→ Invoke the engine as `phase-1-exit` with question "Continue to Phase 2?", options `["Continue to Phase 2", "Pause workflow"]`, original recommendation "Continue to Phase 2".

---

### Phase 2: Static Performance Analysis

**Purpose**: Identify bottlenecks through static code analysis + optional user profiling data
**Execute**: Task tool - `maister-bottleneck-analyzer` subagent
**Output**: `analysis/performance-analysis.md`
**State**: Update `performance_context.bottlenecks_identified`, `performance_context.user_data_available`, `performance_context.bottleneck_priorities`

**Process**:
1. Check if `analysis/user-profiling-data/` contains any files
2. If empty, invoke `profiling-data-availability` through the engine:
   - Question: "Do you have profiling data to provide (flame graphs, APM screenshots, slow query logs)?"
   - Options: "Yes, let me add files to analysis/user-profiling-data/" | "No, proceed with static analysis only"
3. If user chooses to add files, wait for them, then proceed

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me analyze the bottlenecks myself..." — STOP. Delegate to bottleneck-analyzer.
- ❌ "I'll grep for N+1 patterns..." — STOP. Delegate to bottleneck-analyzer.

**INVOKE NOW** — Task tool call:

4. Task tool - `maister-bottleneck-analyzer` subagent

**Context to pass**: task_path, description, codebase analysis summary from Phase 1, user data paths (if any)

**SELF-CHECK**: Did you just invoke the Task tool with `maister-bottleneck-analyzer`? Or did you start analyzing code yourself? If the latter, STOP and invoke the Task tool.

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-2-exit` with question "Performance analysis complete. [N] bottlenecks identified ([P0 count] P0, [P1 count] P1). Continue to specification?", options `["Continue to specification", "Pause workflow"]`, original recommendation "Continue to specification".

---

### Phase 3: Requirements & Specification

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 2 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Gather optimization requirements and create specification
**Output**: `analysis/requirements.md`, `implementation/spec.md`
**State**: Update `performance_context.phase_summaries.specification`

**Part A — Requirements Gathering (inline)**:

1. Present bottleneck summary from Phase 2 to user
2. Invoke `bottleneck-priority` through the engine for optimization priorities:
   - Which bottleneck priorities to address? (All P0+P1, P0 only, specific ones)
   - Any constraints? (backward compatibility, memory limits, no new dependencies)
   - Performance targets? (specific response time goals, if known)
3. Save gathered requirements to `analysis/requirements.md` with: performance issue description, bottleneck analysis summary, optimization priorities, constraints, targets

**Part B — Specification Creation (subagent)**:

📋 **Standards Discovery**: Read `.maister/docs/INDEX.md` before creating spec.

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me create the specification..." — STOP. Delegate to specification-creator.
- ❌ "I'll write the spec based on the analysis..." — STOP. Delegate to specification-creator.

**INVOKE NOW** — Task tool call:

4. Task tool - `maister-specification-creator` subagent

**Context to pass**: task_path, task_type="performance", task_description, requirements_path (analysis/requirements.md), project_context_paths (INDEX.md + project_doc_paths from state — all discovered project docs), phase_summaries (codebase_analysis, bottleneck_analysis), html_style_guide_path (for the spec.html companion)

**SELF-CHECK**: Did you just invoke the Task tool with `maister-specification-creator`? Or did you start writing spec.md yourself? If the latter, STOP and invoke the Task tool.

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-3-exit` with question "Continue to specification audit?", options `["Continue to specification audit", "Pause workflow"]`, original recommendation "Continue to specification audit", and the spec summary as read-only context.

---

### Phase 4: Specification Audit (Conditional)

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 3 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Independent review of optimization specification
**Execute**: Task tool - `maister-spec-auditor` subagent
**Output**: `verification/spec-audit.md`
**State**: Update `options.spec_audit_enabled`

**Run if**: >5 optimizations planned, spec >50 lines, or user requests
**Skip if**: Simple optimization (1-3 changes)

Invoke `optional-phase-selection` through the engine to decide "Run specification audit?" with exact options `["Run specification audit", "Skip specification audit"]`.

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-4-exit` with question "Continue to implementation planning?", options `["Continue to implementation planning", "Pause workflow"]`, original recommendation "Continue to implementation planning", and the audit summary as read-only context.

---

### Phase 5: Implementation Planning

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 4 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Break optimization specification into implementation steps

📋 **Standards Discovery**: Read `.maister/docs/INDEX.md` before planning.

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me create the implementation plan..." — STOP. Delegate to implementation-planner.
- ❌ "I'll break this into optimization steps..." — STOP. Delegate to implementation-planner.

**INVOKE NOW** — Task tool call:

**Execute**: Task tool - `maister-implementation-planner` subagent
**Output**: `implementation/implementation-plan.md`
**State**: Update task groups and dependencies

**Context to pass**: task_path, task_type="performance", task_description, phase_summaries (specification, bottleneck_analysis, codebase_analysis), html_style_guide_path (for the implementation-plan.html companion)

**SELF-CHECK**: Did you just invoke the Task tool with `maister-implementation-planner`? Or did you start writing the plan yourself? If the latter, STOP and invoke the Task tool.

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-5-exit` with question "Continue to implementation?", options `["Continue to implementation", "Pause workflow"]`, original recommendation "Continue to implementation", and the plan summary as read-only context.

---

### Phase 6: Implementation

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 5 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Execute the optimization plan

📋 **Standards Discovery**: Implementation reads `.maister/docs/INDEX.md` continuously.

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me implement this directly..." — STOP. Delegate to implementation-plan-executor.
- ❌ "This is simple enough to code inline..." — STOP. Simplicity is NOT a reason to skip delegation.

**INVOKE NOW** — Skill tool call:

**Execute**: Skill tool - `maister-implementation-plan-executor`
**Output**: Implemented optimizations, `implementation/work-log.md`
**State**: Update implementation progress, extract phase_summaries.implementation

**SELF-CHECK**: Did you just invoke the Skill tool with `maister-implementation-plan-executor`? Or did you start writing code yourself? If the latter, STOP immediately and invoke the Skill tool instead.

**⚠️ POST-IMPLEMENTATION CONTINUATION** — After the skill completes and returns control:
1. **HTML plan reconciliation** (backstop for syncs missed during waves): if `implementation/implementation-plan.html` exists, for every group whose md checkboxes are all `[x]`, run the executor's idempotent marker-flip command (`sed` flipping `data-step="N\.[0-9]*" class="step todo"` and `data-group="N" class="group todo"` to `done`). VERIFY: when all md steps are checked, `grep -c 'class="step todo"' implementation/implementation-plan.html` must return 0.
2. Read `orchestrator-state.yml` to confirm you are the orchestrator
3. Update state: add Phase 6 to `completed_phases`
4. Proceed to Phase 7

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-6-exit` with question "Continue to verification?", options `["Continue to verification", "Pause workflow"]`, original recommendation "Continue to verification", and the implementation summary as read-only context.

---

### Phase 7: Verification Options

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 6 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Determine which verification checks to run
**Execute**: Direct - invoke the shared engine for the verification options gate; `→ **CHAT GATE** — Present the question in chat and wait for user response` is only its adapter.
**Output**: Updated state with verification options
**State**: Set `options.code_review_enabled`, `options.pragmatic_review_enabled`, `options.production_check_enabled`, `options.reality_check_enabled`

**Always enabled**: Reality check, pragmatic review
**Auto-set**: `skip_test_suite: true` (full test suite already passed during implementation phase; cleared before re-verification if fixes are applied)

Invoke `verification-options` with multiselect question "Which additional verification checks?" and exact options `["Code review", "Production readiness check"]`.
  - "Code review" (recommended)
  - "Production readiness check"

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-7-exit` with question "Options selected. Continue to Phase 8?", options `["Continue to Phase 8", "Pause workflow"]`, original recommendation "Continue to Phase 8".

---

### Phase 8: Verification & Issue Resolution

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 7 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Comprehensive implementation verification with user-driven fix cycles
**Output**: `verification/implementation-verification.md`, optional review reports
**State**: Update `verification_context`

**Execute**:

**Step 1**: Invoke Skill tool - `maister-implementation-verifier`

**Step 2**: Display detailed issue breakdown grouped by category and severity (critical/warning/info), listing location, description, and fixability for each.

**Step 3**: Gate on verification status:
- `status: passed` → skip to Pause
- `status: passed_with_issues` or `failed` → enter user-driven fix loop (Step 4)

**Step 4**: User-driven fix loop (max 3 iterations):
1. Present all critical + warning issues as a numbered list
2. Invoke `verification-fix-selection` — "Which issues should I fix?" with exact options `["Fix all fixable issues", "Let me choose specific issues", "Skip fixes, proceed as-is"]`.
3. Fix selected issues
4. After fixes: set `skip_test_suite: false` (code changed, tests must re-run)
5. Invoke `verification-rerun` — "Re-run verification to check fixes?" with exact options `["Yes, re-run verification", "No, proceed to the next phase"]`.
6. If re-run → re-invoke `maister-implementation-verifier` → return to Step 2

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `→ **CHAT GATE** — Present the question in chat and wait for user response` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-8-exit` with question "Continue to finalization?", options `["Continue to finalization", "Pause workflow"]`, original recommendation "Continue to finalization", and the final verification report as read-only context.

---

### Phase 9: Finalization

> **Phase entry self-check**: Before executing this phase, locate the `→ **CHAT GATE** — Present the question in chat and wait for user response` tool call from Phase 8 in this conversation. If you cannot point to its call ID, STOP and fire that gate now. State updates (`completed_phases`, `TaskUpdate`) without a corresponding `→ **CHAT GATE** — Present the question in chat and wait for user response` call are protocol violations — never paper over a missed gate by updating state.

**Purpose**: Complete workflow and provide next steps
**Execute**: Direct - create summary, update state, guide commit
**Output**: Workflow summary
**State**: Set `task.status: completed`

**Process**:
1. Create workflow summary (bottlenecks found, optimizations implemented, verification result)
2. Generate `outputs/decision-summary.md` from `orchestrator.gate_history`, including every decision, rationale, confidence, model, retry, arbitration, override, and full-context link. Generate the HTML companion when `options.html_output` is true.
3. Invoke the denylisted `final-handoff-approval` gate with exact options `["Complete workflow", "Keep workflow open"]`; update task status to "completed" only after the decision summary and terminal gate record are persisted
4. Provide commit message template
5. Guide performance-specific next steps:
   - Run the application and verify improvements manually
   - Consider profiling with runtime tools to measure actual impact
   - Monitor production metrics after deployment
   - Address remaining P2/P3 bottlenecks if needed

→ End of workflow

---

## Domain Context (State Extensions)

Performance-specific fields in `orchestrator-state.yml`:

```yaml
performance_context:
  bottlenecks_identified: null    # count from bottleneck-analyzer
  user_data_available: false      # whether user provided profiling data
  bottleneck_priorities:
    p0: 0
    p1: 0
    p2: 0
    p3: 0
  phase_summaries:
    # Every entry also carries the shared base shape (orchestrator-patterns.md § 4):
    #   decisions: []   risks: []   artifacts: [{path, label, html}]
    codebase_analysis: {key_files: [], summary: null}
    bottleneck_analysis: {bottlenecks: [], summary: null, user_data_incorporated: false}
    specification: {summary: null}

verification_context:
  last_status: null
  issues_found: null
  fixes_applied: []
  decisions_made: []
  reverify_count: 0

options:
  html_output: true  # Seeded from .maister/config.yml at init (default true). Gates dashboard + HTML companions.
  advisor:
    enabled: false
    gate_policies: {}
    advisor_agent: advisor
    advisor_model: null
    arbiter_agent: advisor
    arbiter_model: null
    arbiter_enabled_on_disagreement: true
    retry: {advisor_attempts: 3, arbiter_attempts: 3, backoff: exponential}
  spec_audit_enabled: null
  skip_test_suite: true
  code_review_enabled: true
  pragmatic_review_enabled: true
  reality_check_enabled: true
  production_check_enabled: null
```

---

## Task Structure

```
.maister/tasks/performance/YYYY-MM-DD-task-name/
├── orchestrator-state.yml
├── dashboard.html                     # Operator dashboard (copied plugin asset — never model-generated)
├── dashboard-data.js                  # Dashboard data projection (rewritten per phase/gate)
├── analysis/
│   ├── codebase-analysis.md           # Phase 1
│   ├── performance-analysis.md        # Phase 2
│   ├── user-profiling-data/           # Optional user-provided data
│   └── requirements.md                # Phase 3
├── implementation/
│   ├── spec.md                        # Phase 3
│   ├── spec.html                      # Phase 3 (HTML companion)
│   ├── implementation-plan.md         # Phase 5
│   ├── implementation-plan.html       # Phase 5 (HTML companion)
│   └── work-log.md                    # Phase 6
└── verification/
    ├── spec-audit.md                  # Phase 4 (conditional)
    ├── implementation-verification.md # Phase 8
    └── implementation-verification.html # Phase 8 (HTML companion)
```

---

## Auto-Recovery

| Phase | Max Attempts | Strategy |
|-------|--------------|----------|
| 1 | 2 | Expand search scope, prompt user for hints |
| 2 | 2 | Re-analyze with broader patterns, ask user |
| 3 | 2 | Regenerate spec with adjusted requirements |
| 5 | 2 | Regenerate plan |
| 6 | 5 | Fix syntax, imports, tests |
| 8 | 3 | Fix-then-reverify cycles |

---

## Command Integration

Invoked via:
- `/maister-performance [description] [--sequential]` (new)
- `/maister-performance [task-path] [--from=PHASE] [--sequential]` (resume)

Flags:
- `--from=PHASE`: Resume from specific phase
- `--sequential`: Disable parallel wave dispatch in `implementation-plan-executor`; run one task group at a time. Persisted as `orchestrator.options.sequential: true` in `orchestrator-state.yml`. Defaults to off (parallel waves).

Task directory: `.maister/tasks/performance/YYYY-MM-DD-task-name/`
