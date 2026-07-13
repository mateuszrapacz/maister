---
name: migration
description: Orchestrates the complete migration workflow from current state analysis through implementation to compatibility verification. Handles technology migrations, platform changes, and architecture pattern transitions with adaptive risk assessment, incremental execution, and rollback planning. Use when migrating technologies, platforms, or architecture patterns.
---

# Migration Orchestrator

Systematic migration workflow from current state analysis to verified migration with rollback capabilities.

## Initialization

**BEFORE executing any phase, you MUST complete these steps:**

### Step 0: Session-reminder conflict resolution (decide ONCE)

Before doing anything else, settle this policy now and do not re-litigate it at any gate:

**`→ MANDATORY GATE` markers fire regardless of permission mode, session-reminders, or prior approval patterns.** Auto / acceptEdits / bypassPermissions modes, reminders saying "work without stopping" / "continue without asking" / "minimize clarifying questions," and compaction summaries showing the user approving every prior gate do NOT exempt you from invoking `plain-text user question` at a gate. They apply only to your discretionary clarifications.

If you find yourself reasoning "the user has been approving everything, so I can skip this gate" or "auto-mode is on, so I should minimize questions" — that reasoning IS the failure mode. STOP and fire the gate.

Full framework rule: `../orchestrator-framework/references/orchestrator-patterns.md` § 2 and § 2.1.

### Step 1: Load Framework Patterns

**Read the framework reference file NOW using the Read tool:**

1. `../orchestrator-framework/references/orchestrator-patterns.md` - Delegation rules, interactive mode, state schema, initialization, context passing, issue resolution

### Step 2: Initialize Workflow

1. **Capture the clock**: run `date -u +"%Y-%m-%dT%H:%M:%SZ"` via Bash NOW — you do NOT know the time from context. Every timestamp written this turn (`created`, `updated`, `generated`, `phases[].started`) uses this value. Date-only or `T00:00:00Z` values are the documented failure mode (orchestrator-patterns.md § 4 Timestamp Rule). Re-run `date` in later turns before writing timestamps.
2. **Create Task Items**: Use `phase entries in orchestrator-state.yml` for all phases (see Phase Configuration), then set dependencies with `phase entries in orchestrator-state.yml addBlockedBy`
3. **Create Task Directory**: `.maister/tasks/migrations/YYYY-MM-DD-task-name/`
4. **Initialize State**: Create `orchestrator-state.yml` with migration context
5. **Set up Operator Dashboard** (orchestrator-patterns.md § 8) — first read `.maister/config.yml` and set `orchestrator.options.html_output` (default true if the file/key is absent). **When `html_output` is false, SKIP this entire step** — no `dashboard.html`, no `dashboard-data.js`, no browser auto-open — and proceed. Otherwise: copy `../orchestrator-framework/assets/dashboard.html` to the task root as `dashboard.html`, write the initial `dashboard-data.js` (all phases pending, `task.type: "migration"`), then **auto-open it in the user's browser** (`open` / `xdg-open` / `start` per platform, passing the plain absolute filesystem path — NEVER a hand-built `file://` URL; on failure just print the path — never block). On resume: re-copy `dashboard.html` only if missing; regenerate `dashboard-data.js` from state; then auto-open it in the browser again (same opener as a new task — the OS focuses an already-open tab rather than duplicating).
6. **Discover project documentation**: Read `.maister/docs/INDEX.md` (if exists), extract ALL file paths from the "Project Documentation" section — includes predefined docs AND any user-added project docs. Store as `project_context.project_doc_paths` in state.

**Output**:
```
🚀 Migration Orchestrator Started

Task: [migration description]
Directory: [task-path]
Dashboard: open [task-path]/dashboard.html in a browser to monitor progress

Starting Phase 1: Analyze current state...
```

---

## Operator Visibility (applies to every phase)

> **Config gate**: these rules assume `options.html_output` is true (read from `.maister/config.yml` at init, default true). When **false**: skip the Dashboard-upkeep rule entirely (no dashboard files, no browser open, no rewrites) and the HTML-companions rule (do NOT pass `html_style_guide_path`; subagents write md only). The Artifact Summary Contract (§ 7 TL;DR blocks) and `phase_summaries` in state stay active either way.

Cross-cutting rules from `orchestrator-patterns.md` (same as the development orchestrator):

1. **Artifact Summary Contract (§ 7)**: every artifact-writing subagent prompt MUST include the contract instruction (artifacts open with TL;DR / Key Decisions / Open Questions & Risks). At context extraction, lift `decisions`, `risks`, and `artifacts` into `phase_summaries.[phase]` — verbatim, never re-summarized.
2. **Dashboard upkeep (§ 8)**: rewrite `dashboard-data.js` at every phase START (mark `in_progress` before delegating), **BEFORE firing every exit gate** (register the finished phase's artifacts/summary/decisions/risks — the operator reviews them on the dashboard while answering; status stays `in_progress` until the gate passes), after every phase completion (including skipped phases, with reason), every gate decision, every verification cycle, and at finalization. Every rewrite starts with `date -u` (one call per turn). It is a terse projection of state — never duplicate artifact content into it.
3. **HTML companions (§ 9)**: pass `html_style_guide_path` (absolute path to `../orchestrator-framework/references/html-report-style.md`) to specification-creator, implementation-planner, and implementation-verifier. Register returned `html_path` values in `phase_summaries.[phase].artifacts[].html` so the dashboard hero cards link HTML first.
4. **Advisor gates (§ 2.2)**: classify every migration decision gate, resolve it through the configured manual/advisor/fully_automatic policy, persist the full record in `orchestrator.gate_history` after each decision, and keep rollback, data-integrity halts, and production gates user-controlled. Generate `outputs/decision-summary.md` and its HTML companion at completion or blocked/failed termination.

Every migration strategy, scope, optional-phase, verification, fix-loop,
rollback, and phase-exit gate MUST invoke
`skills/orchestrator-framework/references/gate-decision-engine.md` with a stable
`gate_type`, exact ordered options, original recommendation, safety
classification, and complete read-only context. Check the idempotency key before
any model or user call; persist pending states, retries, arbitration, and the
terminal decision before continuing. Rollback, data-integrity, failure-recovery,
and production decisions are denylisted and always require the user gate.

### Concrete Gate Call-Site Checklist

All `plain-text user question` lines in this skill are `present_user_gate` adapter steps.
Before each one invoke `evaluate_gate(gate_context, orchestrator-state.yml,
host_adapter)` from
`skills/orchestrator-framework/references/gate-decision-engine.md`. Supply
`phase_id`, stable `gate_type`, exact question, exact ordered options,
`original_recommendation`, `safety_classification`, and read-only context with
`task_path`, phase summaries, artifact paths, dashboard summary, prior
`gate_history`, and approval status.

### Durable continuation and phase-entry evidence

The evaluator owns policy, role invocation, and the complete terminal gate envelope. For a valid non-denylisted `fully_automatic` result, pass the exact persisted identity, selection, actor, and confidence to `skills/orchestrator-framework/bin/phase-continue.mjs`. Its JSON payload remains:

- Required: `state`, `phase_id`, `gate_type`, `question`, `options`, `selected_option`, `actor`, and `confidence`.
- Optional: `next_phase`, `report_md`, and `report_html`.

The runner is a verifier and recovery boundary only. It re-reads schema-v2 state, requires one matching `decided` record with `provenance_kind: complete`, checks the exact option, actor, confidence, denylist, and legal forward transition, then projects reports and performs only the requested legacy forward-phase commit. It never invokes roles, synthesizes provenance, chooses domain work, creates dispatches, or starts targets. Use stdin or exactly `--input-file PATH`; stdout is compact JSON and actionable errors use stderr.

Workflow-owned routing uses `workflow-continuation.mjs`. Materialize a stable ordered inventory, atomically apply the terminal selection to the source item and create one deterministic outbox record, claim it with a bounded lease, then atomically establish the receiver's target `in_progress` checkpoint and acknowledge that same `dispatch_id`. A retry after acknowledgement returns the stored checkpoint; it never starts the target twice. Research convergence materializes decision-area IDs and artifact order first; other workflows keep target selection in their own phase logic.

At every phase entry, accept either (a) the explicit user-gate call evidence required by the existing checkpoint, or (b) matching automatic evidence: a complete non-denylisted terminal gate, its legal applied selection, one acknowledged outbox record, and the target's matching durable `in_progress` checkpoint. State flags or a claimed-but-unacknowledged dispatch are insufficient. Protected and denylisted gates always require explicit user evidence.

Terminal persistence precedes report projection, selection application, outbox creation, claim, checkpoint, and acknowledgement. Report or transition retries reuse the terminal gate and never append another decision or change its selection.

#### JSON continuation runner contract

The host sends one JSON object with exactly these fields: `state`, `phase_id`,
`gate_type`, `question`, `options`, `selected_option`, `actor`, `confidence`,
`next_phase`, `report_md`, and `report_html`. The runner reads a complete object
from stdin, or from a file when passed exactly `--input-file PATH`; this is the
only accepted CLI argument and additional command-line arguments are invalid.

Persist the terminal record and requested reports. stdout contains only the compact JSON result.
Phase continuation happens only after durable persistence and report generation. A non-zero runner exit stops continuation and falls back to the user gate or persists blocked; low-confidence results never enter the automatic executor path.

Retry from the validated terminal state regenerates missing reports, applies a pending phase transition exactly once, and must not append another history entry.

First reuse a terminal idempotency record; otherwise persist and dashboard-
refresh the pending state before waiting. Persist every retry/backoff,
escalation, arbitration, and user override, then persist the terminal record,
refresh dashboard, and write decision summaries before phase transition. On
failure or unsupported automatic injection, fall back to user or `blocked`.

Stable inventory: `phase-1-clarification` uses
`["Confirm assumptions", "Correct assumptions", "Provide more context"]`;
`migration-strategy` uses the strategy alternatives in gap-analysis order;
`migration-scope` uses the exact requirements options in displayed order;
`phase-2-exit`, `phase-3-exit`, `phase-4-exit`, `phase-5-exit`, and
`phase-6-exit` use `["Continue to the named next phase", "Pause workflow"]`;
`verification-fix-selection` uses `["Fix all fixable issues", "Let me choose
specific issues", "Skip fixes, proceed as-is"]`; `verification-rerun` uses
`["Yes, re-run verification", "No, proceed to the next phase"]`;
`rollback-or-proceed` uses `["Rollback changes", "Proceed with warnings",
"Stop workflow"]`; and `optional-phase-selection` uses
`["Run optional phase", "Skip optional phase"]`. Implementation approval,
rollback, data-integrity, unresolved-critical, and production gates are
denylisted and user-controlled.
5. **icon_hint values** per phase: 1 `analysis`, 2 `analysis`, 3 `spec`, 4 `plan`, 5 `code`, 6 `verify`, 7 `verify`, 8 `docs`.

---

## When to Use

Use for:
- Migrating from one framework/library to another (e.g., Vue 2 → Vue 3, Express → Fastify)
- Changing database platforms (e.g., MySQL → PostgreSQL, MongoDB → DynamoDB)
- Refactoring architecture patterns (e.g., REST → GraphQL, Monolith → Microservices)
- Upgrading major versions with breaking changes

**DO NOT use for**: New features, bug fixes, pure refactoring without technology change.

---

## Core Principles

1. **Analyze Before Migrating**: Understand current system before planning target state
2. **Risk Assessment**: Classify migration type (code/data/architecture) and assess complexity
3. **Incremental Execution**: Support phased migration with rollback points
4. **Rollback Planning**: Document undo procedures for each migration phase
5. **Dual-Run Support**: Enable running old and new systems in parallel during transition

---

## Migration Types

| Type | Keywords | Strategy | Risk Focus |
|------|----------|----------|------------|
| **Code** | framework, library, upgrade | Incremental or phased | Breaking changes, API differences |
| **Data** | database, schema, data migration | Dual-run (zero downtime) | Data integrity, checksums |
| **Architecture** | REST→GraphQL, monolith→microservices | Dual-run or phased | Compatibility, rollback |

---

## Phase Configuration

| Phase | content | activeForm | Agent/Skill |
|-------|---------|------------|-------------|
| 1 | "Analyze current state" | "Analyzing current state" | codebase-analyzer |
| 2 | "Plan target state and gaps" | "Planning target state and gaps" | gap-analyzer |
| 3 | "Gather requirements & create migration strategy" | "Gathering requirements & creating migration strategy" | Direct + specification-creator (subagent) |
| 4 | "Plan implementation" | "Planning implementation" | implementation-planner (subagent) |
| 5 | "Execute migration" | "Executing migration" | implementation-plan-executor |
| 6 | "Verify and test compatibility" | "Verifying and testing compatibility" | implementation-verifier |
| 7 | "Resolve verification issues" | "Resolving verification issues" | Direct (conditional) |
| 8 | "Generate documentation" | "Generating documentation" | user-docs-generator (optional) |

---

## Workflow Phases

### Phase 1: Current State Analysis & Clarifications

**Purpose**: Comprehensive analysis of current system before migration, followed by scope/requirements clarification
**Execute**:
1. skill loader - `maister:codebase-analyzer`
2. Update state with analysis results
3. For each critical clarification, invoke `phase-1-clarification` through the shared engine with exact ordered options and full read-only context.
4. Save clarifications to `analysis/clarifications.md`
**Output**: `analysis/current-state-analysis.md`, `analysis/clarifications.md`
**State**: Update task_context with current system info, `task_context.clarifications_resolved`

→ Invoke the engine as `phase-1-exit` with question "Continue to Phase 2?", options `["Continue to Phase 2", "Pause workflow"]`, original recommendation "Continue to Phase 2".

---

### Phase 2: Target State Planning & Gap Analysis

**Purpose**: Define target system and identify migration gaps
**Execute**: native subagent delegation - `maister:gap-analyzer` subagent
**Output**: `analysis/target-state-plan.md`
**State**: Update `migration_context.migration_type`, `target_system`, `risk_level`, `breaking_changes`

**Gap Analyzer Tasks**:
1. Define target system from migration description
2. Identify gaps (features to migrate, APIs to adapt, data to transform)
3. Classify migration type (code/data/architecture)
4. Recommend migration strategy (incremental/big-bang/dual-run/phased)
5. External research via WebSearch for version upgrades

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `plain-text user question` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-2-exit` with question "Continue to migration strategy?", options `["Continue to migration strategy", "Pause workflow"]`, original recommendation "Continue to migration strategy", and the gap summary as read-only context.

---

### Phase 3: Migration Requirements & Strategy Specification

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Gather migration requirements, then create detailed migration specification with rollback procedures
**Execute**:

**Part A — Migration Requirements Gathering (inline)**:
1. Invoke `migration-scope` through the engine for migration-specific requirements (3-5 questions):
   - Migration scope and boundaries (what's in/out of migration)
   - Rollback expectations and downtime tolerance
   - Data migration specifics (if data migration type)
   - Dual-run requirements (if applicable)
   - Existing code/config to preserve
   - Frame as confirmable assumptions: "I assume X, is that correct?"
2. Save gathered requirements to `analysis/requirements.md`

**Part B — Specification Creation (subagent)**:
3. native subagent delegation - `maister:specification-creator` subagent

**Context to pass to subagent**: task_path, task_type (migration), task_description, requirements_path (analysis/requirements.md), project_context_paths (INDEX.md + project_doc_paths from state — all discovered project docs), migration_type, current_system, target_system, risk_level, breaking_changes, phase_summaries (current_state_analysis, gap_analysis), html_style_guide_path (for the spec.html companion)

**Output**: `analysis/requirements.md`, `implementation/spec.md`, `analysis/rollback-plan.md`, optionally `analysis/dual-run-plan.md`
**State**: Update `rollback_plan_created`, `dual_run_configured`

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `plain-text user question` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-3-exit` with question "Continue to implementation planning?", options `["Continue to implementation planning", "Pause workflow"]`, original recommendation "Continue to implementation planning", and the spec summary as read-only context.

---

### Phase 4: Implementation Planning

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Break migration into task groups with rollback steps
**Execute**: native subagent delegation - `maister:implementation-planner` subagent
**Output**: `implementation/implementation-plan.md` with rollback procedures
**State**: Update task groups and dependencies

**Context to pass to subagent**: task_path, task_type (migration), migration_type, task_description, phase_summaries (current_state_analysis, gap_analysis, specification), html_style_guide_path (for the implementation-plan.html companion)

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `plain-text user question` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-4-exit` with question "Continue to execute migration?", options `["Continue to execute migration", "Pause workflow"]`, original recommendation "Continue to execute migration", and the plan summary as read-only context.

---

### Phase 5: Migration Execution

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Execute migration steps with incremental verification

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me implement this directly..." — STOP. Delegate to implementation-plan-executor.
- ❌ "This migration is simple enough to code inline..." — STOP. Simplicity is NOT a reason to skip delegation.

**INVOKE NOW** — skill loader call:

**Execute**: skill loader - `maister:implementation-plan-executor`
**Output**: Implemented migration changes, `implementation/work-log.md`
**State**: Update implementation progress, extract phase_summaries.implementation

📋 **Standards Reminder**: Review `.maister/docs/INDEX.md` before implementing.

**SELF-CHECK**: Did you just invoke the skill loader with `maister:implementation-plan-executor`? Or did you start writing migration code yourself? If the latter, STOP immediately and invoke the skill loader instead.

**⚠️ POST-IMPLEMENTATION CONTINUATION** — After the skill completes and returns control:
1. **HTML plan reconciliation** (backstop for syncs missed during waves): if `implementation/implementation-plan.html` exists, for every group whose md checkboxes are all `[x]`, run the executor's idempotent marker-flip command (`sed` flipping `data-step="N\.[0-9]*" class="step todo"` and `data-group="N" class="group todo"` to `done`). VERIFY: when all md steps are checked, `grep -c 'class="step todo"' implementation/implementation-plan.html` must return 0.
2. Read `orchestrator-state.yml` to confirm you are the orchestrator
3. Update state: add Phase 5 to `completed_phases`
4. Proceed to Phase 6

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `plain-text user question` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-5-exit` with question "Continue to verification?", options `["Continue to verification", "Pause workflow"]`, original recommendation "Continue to verification", and the implementation summary as read-only context.

---

### Phase 6: Verification + Compatibility Testing

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Verify migration success with compatibility and rollback testing
**Execute**: skill loader - `maister:implementation-verifier`
**Output**: `verification/implementation-verification.md`, `verification/compatibility-test-results.md`
**State**: Update verification results

**Migration-Specific Checks**:
- Verify old system still works (if dual-run)
- Test rollback procedures (non-destructive)
- Validate data integrity (for data migrations)
- Check performance benchmarks (before/after)

**⚠️ POST-VERIFICATION CONTINUATION** — After the skill completes and returns control:
1. Read `orchestrator-state.yml` to confirm you are the orchestrator
2. Update state: add Phase 6 to `completed_phases`
3. Evaluate verdict: if PASS → Phase 8, if fixable issues → Phase 7, otherwise stop workflow

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `plain-text user question` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-6-exit` with question "Continue to Phase [7 or 8]?", options `["Continue to the named next phase", "Pause workflow"]`, original recommendation "Continue to the named next phase", and the verification summary as read-only context.

---

### Phase 7: Migration Issue Resolution (Conditional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Fix verification issues through direct editing and re-verification
**Execute**: Direct - apply fixes, re-verify
**Output**: Updated code, `verification_context.fixes_applied`
**State**: Update `reverify_count`, `decisions_made`

**Skip if**: verdict = PASS

**Process**:
1. Display detailed issue breakdown grouped by category and severity, listing location, description, and fixability
2. Present all critical + warning issues as a numbered list
3. Invoke `verification-fix-selection` — "Which issues should I fix?" with exact options `["Fix all fixable issues", "Let me choose specific issues", "Skip fixes, proceed as-is"]`.
4. Fix selected issues
5. Invoke `verification-rerun` — "Re-run verification to check fixes?" with exact options `["Yes, re-run verification", "No, proceed to the next phase"]`.
6. If re-run → re-invoke `maister:implementation-verifier` → return to Step 1
7. Max 3 iterations

**Data Safety Critical**: HALT on any data integrity issue - never auto-fix data problems. Always present data issues to user with rollback option.

**Exit Conditions**:
- ✅ No critical issues remain → Proceed to Phase 8
- ⚠️ Max iterations (3) reached → invoke `rollback-or-proceed` with exact options `["Rollback changes", "Proceed with warnings", "Stop workflow"]`.
- ❌ Data integrity issues → HALT immediately, recommend rollback

→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `plain-text user question` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).

Invoke the engine as `phase-7-exit` with question "Continue to documentation?", options `["Continue to documentation", "Pause workflow"]`, original recommendation "Continue to documentation", and the final verification report as read-only context.

---

### Phase 8: Documentation (Optional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Create migration guide for end users
**Execute**: native subagent delegation - `maister:user-docs-generator` subagent
**Output**: `documentation/migration-guide.md`
**State**: Set documentation complete

**Skip if**: `options.docs_enabled = false`

**Documentation Covers**:
- Migration overview and goals
- Prerequisites and preparation steps
- Step-by-step migration procedure
- Rollback procedures
- Troubleshooting common issues

Before ending the workflow, invoke the denylisted `final-handoff-approval` gate with exact options `["Complete workflow", "Keep workflow open"]`, then generate `outputs/decision-summary.md` from `orchestrator.gate_history`, including every migration decision, rationale, confidence, retry, arbitration, user override, and full-context link. Generate the HTML companion when enabled and the same summary with terminal status before stopping on `blocked` or `failed`.

→ End of workflow

---

## Domain Context (State Extensions)

Migration-specific fields in `orchestrator-state.yml`:

```yaml
migration_context:
  migration_type: "code" | "data" | "architecture" | "general"
  current_system:
    description: null
    technologies: []
  target_system:
    description: null
    technologies: []
  migration_strategy:
    approach: "incremental" | "big-bang" | "dual-run" | "phased"
    phases: []
  risk_level: null
  breaking_changes: []
  rollback_plan_created: false
  dual_run_configured: false

external_research:
  performed: false
  category: null
  breaking_changes: []
  migration_guide_url: null

verification_context:
  last_status: null
  issues_found: null
  fixes_applied: []
  decisions_made: []
  reverify_count: 0

orchestrator:
  options:
    html_output: true  # Seeded from .maister/config.yml at init (default true). Gates dashboard + HTML companions.
    docs_enabled: false
    advisor:
      enabled: false
      gate_policies:
        phase-exit: manual
        optional-phase: manual
        clarify: manual
        convergence: manual
        verify-matrix: manual
      advisor_agent: advisor
      advisor_model: null
      arbiter_agent: advisor
      arbiter_model: null
      arbiter_enabled_on_disagreement: true
      retry:
        advisor_attempts: 3
        arbiter_attempts: 3
        backoff: exponential
```

Creation normalizes the project configuration once into the complete block above, independently of `html_output`. Resume reads `orchestrator.options.advisor` from canonical state only and never rereads `.maister/config.yml`.

---

## Task Structure

```
.maister/tasks/migrations/YYYY-MM-DD-migration-name/
├── orchestrator-state.yml
├── dashboard.html                    # Operator dashboard (copied plugin asset — never model-generated)
├── dashboard-data.js                 # Dashboard data projection (rewritten per phase/gate)
├── analysis/
│   ├── current-state-analysis.md     # Phase 1
│   ├── target-state-plan.md          # Phase 2
│   ├── requirements.md               # Phase 3
│   ├── rollback-plan.md              # Phase 3
│   └── dual-run-plan.md              # Phase 3 (if dual-run)
├── implementation/
│   ├── spec.md                       # Phase 3
│   ├── spec.html                     # Phase 3 (HTML companion)
│   ├── implementation-plan.md        # Phase 4
│   ├── implementation-plan.html      # Phase 4 (HTML companion)
│   └── work-log.md                   # Phase 5
├── verification/
│   ├── implementation-verification.md    # Phase 6
│   ├── implementation-verification.html  # Phase 6 (HTML companion)
│   └── compatibility-test-results.md     # Phase 6
└── documentation/
    └── migration-guide.md            # Phase 8 (optional)
```

---

## Auto-Recovery

| Phase | Max Attempts | Strategy |
|-------|--------------|----------|
| 1 | 2 | Expand search patterns, prompt user for file paths |
| 2 | 2 | Re-prompt for target details |
| 3 | 2 | Re-gather requirements, re-invoke spec-creator subagent, regenerate rollback plan |
| 4 | 2 | Regenerate with migration constraints |
| 5 | 5 | Fix syntax errors, prompt user on repeated failure |
| 6 | 3 | Fix-then-reverify. **HALT on data integrity issues** |
| 8 | 1 | Generate text-only without screenshots |

---

## Command Integration

Invoked via:
- `$maister:migration [description] [--type=TYPE] [--sequential]` (new)
- `$maister:migration [task-path] [--from=PHASE] [--sequential]` (resume)

Flags:
- `--type=TYPE`: Migration category (e.g. database, api, framework)
- `--from=PHASE`: Resume from specific phase
- `--sequential`: Disable parallel wave dispatch in `implementation-plan-executor`; run one task group at a time. Persisted as `orchestrator.options.sequential: true` in `orchestrator-state.yml`. Defaults to off (parallel waves).

Task directory: `.maister/tasks/migrations/YYYY-MM-DD-task-name/`
