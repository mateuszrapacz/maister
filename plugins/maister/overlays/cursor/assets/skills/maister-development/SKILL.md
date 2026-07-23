---
name: maister-development
description: Unified orchestrator for all development tasks. ALWAYS execute when invoked — never skip for 'straightforward' tasks. Phases adapt based on detected task characteristics rather than predetermined types. Use for any development work that modifies code.
user-invocable: true
---

# Development Orchestrator

Unified workflow for all development tasks — bug fixes, enhancements, and new features. Phases activate based on context and analysis findings, not predetermined task types.

## Initialization

**BEFORE executing any phase, you MUST complete these steps:**

### Step 0: Session-reminder conflict resolution (decide ONCE)

Before doing anything else, settle this policy now and do not re-litigate it at any gate:

**`→ MANDATORY GATE` markers fire regardless of permission mode, session-reminders, or prior approval patterns.** Auto / acceptEdits / bypassPermissions modes, reminders saying "work without stopping" / "continue without asking" / "minimize clarifying questions," and compaction summaries showing the user approving every prior gate do NOT exempt you from invoking `AskQuestion` at a gate. They apply only to your discretionary clarifications.

If you find yourself reasoning "the user has been approving everything, so I can skip this gate" or "auto-mode is on, so I should minimize questions" — that reasoning IS the failure mode. STOP and fire the gate.

Full framework rule: `../lib/orchestrator-framework/references/orchestrator-patterns.md` § 2 and § 2.1.

### Step 1: Load Framework Patterns

**Read the framework reference file NOW using the Read tool:**

1. `../lib/orchestrator-framework/references/orchestrator-patterns.md` - Delegation rules, interactive mode, state schema, initialization, context passing, issue resolution

### Step 2: Detect Research Context

**If argument is a research folder path** (matches `.maister/tasks/research/*`):
- Auto-detect research folder, extract task description from `research_context.research_question`
- Read research artifacts (see Research-Based Development section below)
- Set `research_reference` in state automatically

**If `--research=<path>` flag provided**:
- Read research artifacts from specified path
- Copy to `analysis/research-context/`
- Set `research_reference` in state

### Step 3: Initialize Workflow

1. **Capture the clock**: run `date -u +"%Y-%m-%dT%H:%M:%SZ"` via Bash NOW — you do NOT know the time from context. Every timestamp written this turn (`created`, `updated`, `generated`, `phases[].started`) uses this value. Date-only or `T00:00:00Z` values are the documented failure mode (orchestrator-patterns.md § 4 Timestamp Rule). Re-run `date` in later turns before writing timestamps.
2. **Create Todo Items**: Use `TodoWrite` for all phases (see Phase Configuration), then set dependencies with `TodoWrite ordering in todos array (merge: true)`
3. **Create Task Directory**: `.maister/tasks/development/YYYY-MM-DD-task-name/`
4. **Initialize State**: Create `orchestrator-state.yml` with task info and research reference
5. **Set up Operator Dashboard** (orchestrator-patterns.md § 8) — first read `.maister/config.yml` and seed `orchestrator.options.html_output` and `orchestrator.options.advisor` (manual defaults when absent). **When `html_output` is false, SKIP this entire step** — no `dashboard.html`, no `dashboard-data.js`, no browser auto-open — and proceed. Otherwise: copy `../lib/orchestrator-framework/assets/dashboard.html` to the task root as `dashboard.html`, write the initial `dashboard-data.js` (all phases pending), then **auto-open it in the user's browser** (`open` / `xdg-open` / `start` per platform, passing the plain absolute filesystem path — NEVER a hand-built `file://` URL; on failure just print the path — never block). On resume: re-copy `dashboard.html` only if missing; regenerate `dashboard-data.js` from state; then auto-open it in the browser again (same opener as a new task — the OS focuses an already-open tab rather than duplicating).
6. **Discover project documentation**: Read `.maister/docs/INDEX.md` (if exists), extract ALL file paths from the "Project Documentation" section. This includes predefined docs (vision, roadmap, tech-stack, architecture) AND any user-added project docs (e.g., deployment.md, api-strategy.md). Store complete list as `project_context.project_doc_paths` in state.

### Step 4: Ingest Design Context

Mockups and design artifacts become **binding inputs** to implementation when present. Auto-detect from three sources and unify under `analysis/design-context/`. Skip silently when no sources exist — non-UI tasks see no change.

**Source 1 — Product-design task path**: If the argument resolves to a `.maister/tasks/product-design/*` directory (presence of `outputs/product-brief.md` or `analysis/mockups/`):
- Copy `outputs/product-brief.md` → `analysis/design-context/brief.md`
- Copy `analysis/mockups/*` → `analysis/design-context/mockups/`

**Source 2 — Inline mockup references in task description**: Scan the task description for absolute or relative paths ending in `.html`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.pdf`, plus design-tool URLs (Figma, Sketch Cloud, Zeplin):
- For each resolvable local file: copy into `analysis/design-context/mockups/`
- For URLs: append the link to `analysis/design-context/external-links.md` (do not fetch — leave to user)

**Source 3 — Legacy locations** (resumed tasks, mid-flight migrations): If `analysis/visuals/` or `analysis/ui-mockups.md` is populated and `analysis/design-context/` does not yet exist, migrate the legacy contents into `design-context/` (visuals → `mockups/`, `ui-mockups.md` → `ascii/ui-mockups.md`).

**After ingestion** (when `design-context/` was populated):
- Generate `analysis/design-context/INDEX.md` enumerating every screen/component with stable IDs (e.g., `screen:login`, `component:user-card`) inferred from filenames and content. One row per screen/component with: id, source mockup, brief description.
- Set `task_context.design_reference` and `phase_summaries.design` (one-paragraph summary + path to INDEX.md).

**Skip if no sources detected** — proceed to phase execution without `design-context/`.

**Output**:
```
🚀 Development Orchestrator Started

Task: [description]
Directory: [task-path]
Dashboard: open [task-path]/dashboard.html in a browser to monitor progress

Starting Phase 1: Codebase Analysis...
```

---

## Operator Visibility (applies to every phase)

> **Config gate**: these rules assume `options.html_output` is true (read from `.maister/config.yml` at init, default true). When **false**: skip rule 2 entirely (no dashboard — no `dashboard.html`/`dashboard-data.js`, no browser open, no rewrites) and rule 3's companions (do NOT pass `html_style_guide_path`; subagents write md only). Rule 1 (§ 7 TL;DR blocks) and `phase_summaries` in state stay active either way.

Cross-cutting rules from `orchestrator-patterns.md` apply throughout this workflow:

1. **Artifact Summary Contract (§ 7)**: every artifact-writing subagent prompt MUST include the contract instruction (artifacts open with TL;DR / Key Decisions / Open Questions & Risks). At context extraction, lift `decisions`, `risks`, and `artifacts` into `phase_summaries.[phase]` (shared entry shape, § 4).
2. **Dashboard upkeep (§ 8)**: rewrite `dashboard-data.js` at every phase START (mark it `in_progress` before delegating), **BEFORE firing every exit gate** (register the finished phase's artifacts/summary/decisions/risks so the operator reviews them on the dashboard while answering — status stays `in_progress` until the gate passes), after every phase completion (including skips, with reason), every gate decision, every verification cycle, and at finalization. It is a terse projection of state — never duplicate artifact content into it.
3. **HTML companions (§ 9)**: pass `html_style_guide_path` (absolute path to `../lib/orchestrator-framework/references/html-report-style.md`) to specification-creator, implementation-planner, and e2e-test-verifier. Register returned `html_path` values in `phase_summaries.[phase].artifacts[].html`.
4. **Advisor audit upkeep (§ 2.2)**: after every advisor, arbiter, retry, escalation, or user override, append the complete record to `orchestrator.gate_history`, rewrite the state, and refresh the dashboard before continuing. Do not use dashboard data as the resume source.

### Advisor Gate Integration

At every phase and decision gate, apply the shared `orchestrator-patterns.md` § 2.2 protocol. The gate call-site must provide a stable `gate_type`, original recommendation, complete options, and read-only context. For this development workflow, `implementation-approval` is always denylisted and must be answered explicitly by the user. Advisor agreement may advance a configured safe gate, but no advisor or arbiter result may start the implementation executor.

Every phase exit, scope decision, optional-phase choice, verification matrix,
fix-loop decision, and implementation-approval gate MUST invoke the algorithm in
`lib/orchestrator-framework/references/gate-decision-engine.md`. The call
site checks the idempotency key before invoking a model or user gate, persists
`advisor_pending`, `arbiter_pending`, or `user_pending` before waiting, and
persists the terminal record before changing phase status. The implementation
executor must re-read state and require `implementation_approval.status:
approved` immediately before dispatch.

### Concrete Gate Call-Site Checklist

The `AskQuestion` lines below describe the host adapter's
`present_user_gate`; they are not direct gate calls. For every listed call site,
invoke `evaluate_gate(gate_context, state, host_adapter)` from
`lib/orchestrator-framework/references/gate-decision-engine.md` first. Build
the complete context with `phase_id`, stable `gate_type`, the exact question,
the exact ordered `options`, `original_recommendation`,
`safety_classification`, and read-only `context` containing `task_path`, all
relevant `phase_summaries`, artifact paths, dashboard summary, prior
`gate_history`, and implementation-approval status when relevant.

The call-site sequence is fixed: read state and reuse a terminal record with
the same idempotency key; persist and dashboard-refresh the applicable
`pending` state before any model or user call; persist every advisor and
arbiter attempt, retry/backoff, escalation, and the single arbiter on
disagreement; then persist the complete terminal record, refresh the
dashboard, and write decision summaries before changing phase status or
continuing. A host executes a valid `fully_automatic` result through
`phase_continue(selected_option)` after persistence; it does not synthesize UI
input. A missing or unsafe continuation falls back to the user gate or persists `blocked`. The implementation executor is reachable only after a
fresh state read proves `orchestrator.implementation_approval.status:
approved`.

### Durable continuation and phase-entry evidence

The evaluator owns policy, role invocation, and the complete terminal gate envelope. For a valid non-denylisted `fully_automatic` result, pass the exact persisted identity, selection, actor, and confidence to `lib/orchestrator-framework/bin/phase-continue.mjs`. Its JSON payload remains:

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

Stable call-site inventory (the literal option order is part of the gate's
idempotency key): `phase-1-clarification` uses
`["Confirm assumptions", "Correct assumptions", "Provide more context"]`;
`phase-2-scope-decision` uses the gap-analyzer's options in returned order and
its original recommendation; `phase-2-routing`, every `phase-N-exit`, and the
TDD exits use `["Continue to the named next phase", "Pause workflow"]`;
`optional-phase-selection` uses `["Run optional phase", "Skip optional phase"]`;
`verification-options` uses the displayed verification options in displayed
order; `verification-fix-selection` uses `["Fix all fixable issues", "Let me
choose specific issues", "Skip fixes, proceed as-is"]`;
`verification-rerun` uses `["Yes, re-run verification", "No, proceed to the
next phase"]`; `verification-known-issues` uses `["Proceed with known issues",
"Stop workflow"]`; and `implementation-approval` uses
`["Approve complete implementation scope", "Reject implementation scope",
"Request scope changes"]`. Rollback, production, unresolved-critical, and
final-handoff decisions remain user-controlled.

Host adapter presentation matrix (each `AskQuestion` entry is a presentation
primitive behind the engine; it never bypasses `evaluate_gate`):

- `phase-1-clarification`: AskQuestion
- `phase-1-exit`: AskQuestion
- `phase-2-scope-decision`: AskQuestion
- `phase-2-routing`: AskQuestion
- `phase-3-exit`: AskQuestion
- `phase-4-exit`: AskQuestion
- `requirements-clarification`: AskQuestion
- `phase-5-exit`: AskQuestion
- `optional-phase-selection/spec-audit`: AskQuestion
- `phase-6-exit`: AskQuestion
- `phase-7-exit`: AskQuestion
- `implementation-approval`: AskQuestion
- `phase-8-exit`: AskQuestion
- `phase-9-exit`: AskQuestion
- `verification-options`: AskQuestion
- `optional-phase-selection/e2e`: AskQuestion
- `optional-phase-selection/user-docs`: AskQuestion
- `verification-fix-selection`: AskQuestion
- `verification-rerun`: AskQuestion
- `verification-known-issues`: AskQuestion
- `phase-11-exit`: AskQuestion
- `phase-12-exit`: AskQuestion
- `phase-13-exit`: AskQuestion
- `final-handoff-approval`: AskQuestion

---

## When to Use

Use for **all development tasks**: bug fixes, enhancements, new features, and any work that modifies code.

**DO NOT use for**: Performance optimization, security remediation, migrations, documentation-only, pure refactoring (use specialized orchestrators).

---

## Phase Configuration

| Phase | content | activity description in content | Activation |
|-------|---------|------------|------------|
| 1 | "Analyze codebase & clarify requirements" | "Analyzing codebase & clarifying" | Always |
| 2 | "Analyze gaps & clarify scope" | "Analyzing gaps & clarifying scope" | Always |
| 3 | "Write failing test (TDD Red)" | "Writing failing test" | When `has_reproducible_defect` |
| 4 | "Generate UI mockups" | "Generating UI mockups" | When `ui_heavy` |
| 5 | "Gather requirements & create specification" | "Gathering requirements & creating specification" | Always |
| 6 | "Audit specification" | "Auditing specification" | Always (conditional) |
| 7 | "Plan implementation" | "Planning implementation" | Always |
| 8 | "Execute implementation" | "Executing implementation" | Always |
| 9 | "Verify test passes (TDD Green)" | "Verifying test passes" | When Phase 3 was executed |
| 10 | "Prompt verification options" | "Prompting verification options" | Always |
| 11 | "Verify implementation & resolve issues" | "Verifying implementation" | Always |
| 12 | "Run E2E tests" | "Running E2E tests" | When `e2e_enabled` |
| 13 | "Generate user documentation" | "Generating user documentation" | When `user_docs_enabled` |
| 14 | "Finalize workflow" | "Finalizing workflow" | Always |

---

## Workflow Phases

### Phase 1: Codebase Analysis & Clarifications

**Purpose**: Comprehensive codebase exploration followed by scope/requirements clarification
**Execute**:
1. Skill tool - `maister-codebase-analyzer`
2. Update state with analysis results
3. For each critical clarification, invoke the engine as `phase-1-clarification` with the exact question and the ordered options from the checklist; `AskQuestion` is only its user-gate adapter.
4. Save clarifications to `analysis/clarifications.md`
**Output**: `analysis/codebase-analysis.md`, `analysis/clarifications.md`
**State**: Update `task_context.risk_level`, `phase_summaries.codebase_analysis`, `task_context.clarifications_resolved`

→ Invoke the engine as `phase-1-exit` with question "Continue to Phase 2?", options `["Continue to Phase 2", "Pause workflow"]`, and original recommendation "Continue to Phase 2"; continue only after the terminal record is persisted.

---

### Phase 2: Gap Analysis & Scope Clarification

**Purpose**: Compare current vs desired state, detect task characteristics, then resolve scope/approach decisions
**Execute**:
1. Common runtime — `resolveAgent({ logical_role_id: "maister:gap-analyzer" })`, then dispatch actor `development`, work item `gap-analysis`, output `analysis/gap-analysis.md`, and the bounded current/desired-state context.
2. **Extract and store structured data from gap-analyzer result**:
   a. Read `task_characteristics` from gap-analyzer output — 5 fields: `has_reproducible_defect`, `modifies_existing_code`, `creates_new_entities`, `involves_data_operations`, `ui_heavy`
   b. Write all 5 fields to `orchestrator-state.yml` at `task_context.task_characteristics`
   c. Read `risk_level` from output and write to `task_context.risk_level`
   d. Extract phase summary (1-2 sentences) and write to `phase_summaries.gap_analysis`
   e. **SELF-CHECK**: "Did I read the 5 task_characteristics from the gap-analyzer output and write them to state? Let me re-read `orchestrator-state.yml` to verify the values match the gap-analyzer output."

**⛔ DECISION GATE** (mandatory — do NOT skip):
- Parse `decisions_needed` from gap-analyzer output
- If `decisions_needed.critical` OR `decisions_needed.important` is non-empty:
  - MUST invoke the engine once per decision as `phase-2-scope-decision`, preserving each exact ordered option set and original recommendation (never flattening options). Critical decisions use separate full-context calls; important decisions may be grouped only as separate engine records.
- If both are empty: Note "No scope decisions needed" in state

**SELF-CHECK** before continuing: "Did every `decisions_needed` item get a terminal `phase-2-scope-decision` record? If not, STOP and go back."

3. Save scope clarifications to `analysis/scope-clarifications.md`
4. **Set optional phase defaults** based on detected characteristics:
   - If `task_characteristics.ui_heavy: true` → set `options.e2e_enabled: true`, `options.user_docs_enabled: true`
   - If `task_characteristics.creates_new_entities: true` → set `options.user_docs_enabled: true`
   - Command flags (`--e2e`, `--no-e2e`, `--user-docs`, `--no-user-docs`) override these defaults

**Output**: `analysis/gap-analysis.md`, `analysis/scope-clarifications.md` (conditional)
**State**: Update `task_context.task_characteristics`, `task_context.scope_expanded`, `options.e2e_enabled`, `options.user_docs_enabled`, `phase_summaries.gap_analysis`

**Context to pass**: Risk level, codebase summary, key files, clarifications, project_doc_paths (from state)

→ **MANDATORY GATE** — invoke the shared engine for `phase-2-routing` now; its user adapter is `AskQuestion`, and continuation requires the persisted terminal decision.

The Phase 2 exit gate **always** invokes `phase-2-routing` in the shared engine. The branching is over *which questions get asked*, not whether to ask:
1. If `decisions_needed.critical` or `.important` is non-empty → present the DECISION GATE questions first (see DECISION GATE block above)
2. Then **always** ask the executive-summary routing question (Phase 3 / 4 / 5 based on `task_characteristics`) shown below

Empty `decisions_needed` skips step 1 only. Step 2 is unconditional. There is no path through Phase 2 that bypasses the engine.

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "The UI change is small/simple, skipping Phase 4..." — STOP. If `ui_heavy` is true, Phase 4 runs. The gap-analyzer made this assessment, not you.
- ❌ "No new screens needed, just a component..." — STOP. `ui_heavy` is a signal from the gap-analyzer. Do NOT override it with your own complexity judgment.

`phase-2-routing` - Display executive summary before the engine call. Read `analysis/gap-analysis.md` and extract: task type detected, risk level, key characteristics enabled (TDD gates, UI mockups, E2E, user docs), scope decisions made (if any). Then read `task_context.task_characteristics` from `orchestrator-state.yml` and determine the exact ordered routing options:
- If `has_reproducible_defect` is true → ask "Continue to Phase 3: TDD Red Gate?"
- If `ui_heavy` is true → ask "Continue to Phase 4: UI Mockup Generation?"
- Otherwise → ask "Continue to Phase 5: Technical Approach, Requirements & Specification?"

---

### Phase 3: TDD Red Gate (Conditional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Write a failing test that reproduces the defect
**Execute**: Direct - write test, verify it FAILS
**Output**: `implementation/tdd-red-gate.md`, failing test file
**State**: Update `tdd_red_passed: true`

**Skip if**: `task_characteristics.has_reproducible_defect` is false (not set by gap-analyzer)

**Critical**: Test MUST fail before implementation (proves defect exists)

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-3-exit` with question "TDD red gate complete. Continue to Phase 4?", options `["Continue to Phase 4", "Pause workflow"]`, original recommendation "Continue to Phase 4", and safety classification `test-gate`.

---

### Phase 4: UI Mockup Generation (Conditional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Generate ASCII mockups showing UI integration
**Execute**: Common runtime — `resolveAgent({ logical_role_id: "maister:ui-mockup-generator" })`, then dispatch actor `development`, work item `ui-mockups`, the documented mockup output paths, and the bounded design context.
**Output**: `analysis/design-context/ascii/ui-mockups.md` + appended entries in `analysis/design-context/INDEX.md`
**State**: Update `phase_summaries.ui_mockups`, `phase_summaries.design`

**Skip if**:
- `task_characteristics.ui_heavy` is false, OR
- `analysis/design-context/mockups/` is already populated (Step 4 ingested external mockups — no need to regenerate ASCII)

**Context to pass**: Gap analysis, scope decisions, component choices, `analysis/design-context/INDEX.md` path (if exists from Step 4)

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-4-exit` with question "UI mockups complete. Continue to Phase 5?", options `["Continue to Phase 5", "Pause workflow"]`, original recommendation "Continue to Phase 5", and safety classification `design-gate`.

---

### Phase 5: Technical Approach, Requirements & Specification

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**⛔ ROUTING GUARD**: Read `task_context.task_characteristics` from `orchestrator-state.yml`. If `has_reproducible_defect` is true and Phase 3 is NOT in `completed_phases` → STOP, execute Phase 3 first. If `ui_heavy` is true and Phase 4 is NOT in `completed_phases` → STOP, execute Phase 4 first.

**Purpose**: Resolve technical decisions, gather specification requirements, then create comprehensive specification
**Execute**:

**Part A — Technical & Architecture Clarification (inline, conditional)**:
1. If complex task with multiple approaches: invoke `technical-clarification` through the engine for 3-5 separate questions.
2. If multiple valid architectural approaches exist: present 2-3 approaches through the engine, preserving exact option order. The chosen approach is passed to specification-creator so the spec is written with the decided architecture.
3. Save to `analysis/technical-clarifications.md` (conditional)

**Skip technical clarification if**: Simple task, risk_level = low, no multiple approaches detected

**Part B — Requirements Gathering (inline)**:
3. Invoke `requirements-clarification` through the engine for specification requirements:
   - Adaptive question count based on description length:
     - Brief (<30 words): 6-8 questions
     - Standard (30-100 words): 4-6 questions
     - Detailed (>100 words): 2-3 focused questions
   - Frame as confirmable assumptions: "I assume X, is that correct?"
   - REQUIRED questions (always include):
     1. **User Journey**: How will users discover/access this? Which personas? How fits existing workflows?
     2. **Existing Code Reuse**: Similar features, UI components, backend patterns to reference?
     3. **Visual Assets**: Any mockups, wireframes, screenshots? Place in `analysis/design-context/mockups/` (or reference paths inline — Step 4 auto-ingests them)
4. Check for visual assets in `analysis/design-context/` (single source of truth — populated by Step 4 ingestion and/or Phase 4 ASCII generation):
   - If `design-context/INDEX.md` exists: note for subagent context (mockup files become binding inputs)
   - If user provides new mockups during this phase: place them in `analysis/design-context/mockups/`, regenerate `INDEX.md`
   - If not found and non-UI task: skip visual asset processing
5. Save gathered requirements to `analysis/requirements.md` with: initial description, Q&A from all rounds, similar features identified, visual assets and insights, functional requirements summary, reusability opportunities, scope boundaries, technical considerations

**Optional (ADR-008 — soft suggestion, no auto-invocation):** After requirements are drafted, you may suggest the user run `requirements-critic` via `/maister-quick-requirements-critic` for interactive quality critique. Do not invoke the skill automatically.

**Part C — Specification Creation (subagent)**:

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me create the specification..." — STOP. Delegate to specification-creator.
- ❌ "I'll write the spec based on requirements..." — STOP. Delegate to specification-creator.
- ❌ "The task is simple enough to spec inline..." — STOP. Simplicity is NOT a reason to skip delegation.

**INVOKE NOW** — common runtime call:

6. `resolveAgent({ logical_role_id: "maister:specification-creator" })`, then dispatch actor `development`, work item `specification`, output `implementation/spec.md`, and the bounded context below.

**Context to pass to subagent**: task_path, task_description, task_characteristics, requirements_path (analysis/requirements.md), project_context_paths (INDEX.md + project_doc_paths from state — all discovered project docs), risk_level, phase_summaries (codebase_analysis, gap_analysis, clarifications, scope_clarifications, ui_mockups, design), research_context (if any), design_reference (if any — points spec-creator to `analysis/design-context/` for mockups and brief), html_style_guide_path (for the spec.html companion)

**SELF-CHECK**: Did you resolve and dispatch exact `maister-specification-creator`? Or did you start writing spec.md yourself? If the latter, STOP immediately and use the common runtime instead.

**Output**: `analysis/technical-clarifications.md` (conditional), `analysis/requirements.md`, `implementation/spec.md`
**State**: Update `task_context.tech_clarified`, `task_context.architecture_decision`, `phase_summaries.specification`

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-5-exit` with question "Continue to specification audit?", options `["Continue to specification audit", "Pause workflow"]`, original recommendation "Continue to specification audit", and the executive summary extracted from `implementation/spec.md` as read-only context.

---

### Phase 6: Specification Audit (Recommended)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Independent review of specification before implementation
**Execute**: Common runtime — `resolveAgent({ logical_role_id: "maister:spec-auditor" })`, then dispatch actor `development`, work item `spec-audit`, output `verification/spec-audit.md`, and the bounded specification context.
**Output**: `verification/spec-audit.md`
**State**: Update `options.spec_audit_enabled`

**Recommended**: Always. Present spec audit as the recommended default. User can skip if they choose.

Invoke the engine as `optional-phase-selection` with question "Run specification audit? (Recommended)", exact options `["Yes, run audit (Recommended)", "No, skip audit"]`, and original recommendation "Yes, run audit (Recommended)".

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-6-exit` with question "Continue to implementation planning?", options `["Continue to implementation planning", "Pause workflow"]`, original recommendation "Continue to implementation planning", and the audit summary as read-only context.

---

### Phase 7: Implementation Planning

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Break specification into implementation steps

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me create the implementation plan..." — STOP. Delegate to implementation-planner.
- ❌ "I'll break this into steps..." — STOP. Delegate to implementation-planner.
- ❌ "This is simple enough to plan inline..." — STOP. Simplicity is NOT a reason to skip delegation.

**INVOKE NOW** — common runtime call:

**Execute**: `resolveAgent({ logical_role_id: "maister:implementation-planner" })`, then dispatch actor `development`, work item `implementation-plan`, output `implementation/implementation-plan.md`, and the bounded context below.
**Output**: `implementation/implementation-plan.md`
**State**: Update task groups and dependencies

**Context to pass to subagent**: task_path, task_description, task_characteristics, phase_summaries (specification, gap_analysis, codebase_analysis, design), research_context (if any), design_reference (if any — when `analysis/design-context/INDEX.md` exists, planner MUST enumerate every screen/component, map task groups to them via the required `Visual References` field, and produce `implementation/visual-coverage.md` proving every screen is covered by ≥1 group), html_style_guide_path (for the implementation-plan.html companion)

**SELF-CHECK**: Did you resolve and dispatch exact `maister-implementation-planner`? Or did you start writing implementation-plan.md yourself? If the latter, STOP immediately and use the common runtime instead.

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-7-exit` with question "Continue to implementation approval?", options `["Continue to implementation approval", "Pause workflow"]`, and original recommendation "Continue to implementation approval". Then invoke the separate denylisted `implementation-approval` engine gate with question "Approve this complete implementation scope?", exact options `["Approve complete implementation scope", "Reject implementation scope", "Request scope changes"]`, and the plan summary as read-only context. Record `orchestrator.implementation_approval.status: approved` only after the explicit user option is terminal; `advisor` and `fully_automatic` cannot answer it.

---

### Phase 8: Implementation

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Execute the implementation plan

**ANTI-PATTERN — DO NOT DO THIS:**
- ❌ "Let me implement this directly..." — STOP. Delegate to implementation-plan-executor.
- ❌ "This is simple enough to code inline..." — STOP. Simplicity is NOT a reason to skip delegation.

**INVOKE NOW** — Skill tool call:

**Execute**: Skill tool - `maister-implementation-plan-executor`
**Output**: Implemented code, `implementation/work-log.md`
**State**: Update implementation progress, extract phase_summaries.implementation

**Protected entry check**: Read `orchestrator.implementation_approval.status` from `orchestrator-state.yml` immediately before invoking the executor. If it is not `approved`, do not invoke the executor; persist the `implementation-approval` gate as pending/blocked and stop for explicit user approval. The executor and task-group implementers may modify source only after this state check passes.

**SELF-CHECK**: Did you just invoke the Skill tool with `maister-implementation-plan-executor`? Or did you start writing code yourself? If the latter, STOP immediately and invoke the Skill tool instead.

**⚠️ POST-IMPLEMENTATION CONTINUATION** — After the skill completes and returns control:
1. **HTML plan reconciliation** (backstop for syncs missed during waves): if `implementation/implementation-plan.html` exists, for every group whose md checkboxes are all `[x]`, run the executor's idempotent marker-flip command (`sed` flipping `data-step="N\.[0-9]*" class="step todo"` and `data-group="N" class="group todo"` to `done`). VERIFY: when all md steps are checked, `grep -c 'class="step todo"' implementation/implementation-plan.html` must return 0 — a non-zero count means unflipped markers remain; flip them before continuing.
2. Read `orchestrator-state.yml` to confirm you are the orchestrator
3. Update state: add Phase 8 to `completed_phases`
4. Evaluate conditional: if `task_characteristics.has_reproducible_defect` AND Phase 3 in `completed_phases` → Phase 9, else → Phase 10

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-8-exit` with question "Continue to verification?", options `["Continue to verification", "Pause workflow"]`, original recommendation "Continue to verification", and the implementation summary as read-only context.

---

### Phase 9: TDD Green Gate (Conditional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Verify the failing test now passes
**Execute**: Direct - run the test written in Phase 3
**Output**: `implementation/tdd-green-gate.md`
**State**: Update `tdd_green_passed: true`

**Skip if**: Phase 3 was not executed

**Critical**: Test MUST pass (proves defect is fixed)

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-9-exit` with question "TDD gate passed. Continue to Phase 10?", options `["Continue to Phase 10", "Pause workflow"]`, original recommendation "Continue to Phase 10".

---

### Phase 10: Verification Options Prompt

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Determine which verification checks to run using tiered decision matrix
**Execute**: Direct - build the complete `verification-options` gate context and invoke the shared engine; `AskQuestion` is only the adapter.
**Output**: Updated state with all verification options
**State**: Set `options.code_review_enabled`, `options.pragmatic_review_enabled`, `options.reality_check_enabled`, `options.production_check_enabled`, `options.e2e_enabled`, `options.user_docs_enabled`
**Auto-set**: `skip_test_suite: true` (full test suite already passed during implementation phase; cleared before re-verification if fixes are applied)

**Step 1**: Display the verification plan:
```
Verification Plan:
  Obligatory (always run):
    ✓ Completeness check
    ✓ Test suite (skipped — passed during implementation; re-enabled after fixes)

  Recommended (adjustable):
    ✓ Code review — quality and security analysis
    ✓ Pragmatic review — detects over-engineering
    ✓ Reality check — validates work solves the problem
    ✓ Production readiness — deployment readiness checks

  Conditional:
    [✓/—] E2E browser testing — [reason]
    [✓/—] User documentation — [reason]
```

**Step 2** (3 questions):

**Q1** (always): invoke `verification-options` (multi-select) — "Which standard verifications to run?"
Options: "Code review (Recommended)", "Pragmatic review (Recommended)", "Reality check (Recommended)", "Production readiness (Recommended)". All pre-selected.

**Q2** (SKIP if `options.e2e_enabled: false` and no `--e2e` flag): invoke `optional-phase-selection` — "Enable E2E browser verification?" Options: `["Yes (Recommended)", "No, skip"]`.

**Q3** (SKIP if `options.user_docs_enabled: false` and no `--user-docs` flag): invoke `optional-phase-selection` — "Generate user documentation?" Options: `["Yes (Recommended)", "No, skip"]`.

→ **MANDATORY GATE** — persist the terminal `verification-options` and optional-phase records through the shared engine before continuing.

---

### Phase 11: Verification & Issue Resolution

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Comprehensive implementation verification with fix-then-reverify cycles
**Output**: `verification/implementation-verification.md`, optional code-review/pragmatic/reality reports, updated `implementation/work-log.md`
**State**: Update verification results, `verification_context`

**Execute**:

**Step 1**: Invoke Skill tool - `maister-implementation-verifier`

**Step 2**: Display detailed issue breakdown grouped by category and severity:
```
Verification Results:
  Critical ([N]):
    - [category]: [description] — [file:line] [fixable/manual]
    ...
  Warning ([N]):
    - [category]: [description] — [file:line] [fixable/manual]
    ...
  Info ([N]):
    - [description] (listed for awareness, not actionable)
```

**Step 3**: Gate on verification status:
- `status: passed` → skip to Post-Verification Continuation
- `status: passed_with_issues` or `failed` → enter user-driven fix loop (Step 4)

**Step 4**: User-driven fix loop (max 3 iterations):
1. Present all critical + warning issues as a numbered list
2. Invoke `verification-fix-selection` — "Which issues should I fix?" with exact options:
   - "Fix all fixable issues" (convenience default)
   - "Let me choose specific issues" (user picks by number)
   - "Skip fixes, proceed as-is"
3. Fix selected issues, log each to `verification_context.fixes_applied`
4. After fixes applied: set `skip_test_suite: false` (code changed, tests must re-run)
5. Invoke `verification-rerun` — "Re-run verification to check fixes?" with exact options:
   - "Yes, re-run verification" → re-invoke `maister-implementation-verifier` → return to Step 2
   - "No, proceed to next phase"
6. Update `verification_context.reverify_count`

**Exit conditions**:
- No critical issues remain → proceed
- User explicitly chooses "Skip fixes, proceed as-is" or "No, proceed to next phase" → proceed with issues logged
- Max 3 iterations reached → invoke `verification-known-issues` with exact options `["Proceed with known issues", "Stop workflow"]`.
- **MUST NOT proceed with unresolved critical issues unless user explicitly approves**

**⚠️ POST-VERIFICATION CONTINUATION** — After issue resolution completes:
1. **Canonical report check**: `verification/implementation-verification.md` + `.html` MUST reflect the FINAL post-fix verdict before leaving this phase. If fixes were applied and the canonical report still shows the pre-fix state (regardless of whether re-checks were run via the full verifier skill or individual subagents writing `*-reverify.md` side files), re-invoke `maister-implementation-verifier` (or have it recompile Phase 3) so the report and companion are rewritten with a "Fix & Re-Verification History" section. A stale pre-fix report is a phase-exit violation.
2. Read `orchestrator-state.yml` to confirm you are the orchestrator
3. Update state: add Phase 11 to `completed_phases`
4. Proceed to Phase 12

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-11-exit` with question "Continue to Phase 12?", options `["Continue to Phase 12", "Pause workflow"]`, original recommendation "Continue to Phase 12", and the final verification report as read-only context.

---

### Phase 12: E2E Testing (Optional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

> **⚠ Serialization rule**: Phases 12 and 13 share the Playwright MCP browser instance. They MUST run strictly sequentially. Do NOT dispatch both common-runtime calls together, even when both are enabled. Wait for Phase 12 to return, honor the `→ **MANDATORY GATE** — fires regardless of permission mode, session-reminders, or prior approval patterns. Invoke `AskQuestion` now. Proceeding without a user response is a protocol violation (orchestrator-patterns.md § 2 / § 2.1).` / `AskQuestion` gate below, then start Phase 13. Concurrent dispatch will corrupt both browser sessions.

**Purpose**: Runtime browser verification with screenshots (via Playwright MCP tools, not test file generation)
**Execute**: Common runtime — `resolveAgent({ logical_role_id: "maister:e2e-test-verifier" })`, then dispatch actor `development`, work item `e2e-verification`, the report/screenshot output contract, and the bounded browser-verification context.
**Prompt must include**: task_path (absolute), spec_path, base_url, html_style_guide_path (for the HTML companion reports). If `analysis/design-context/mockups/` exists, also include `design_context_path` so the verifier performs an LLM-judged structural visual-fidelity comparison and writes `verification/visual-fidelity.md`. Report saves to `{task_path}/verification/e2e-verification-report.md`.
**Output**: `verification/e2e-verification-report.md` (+ `.html` companion), screenshots, `verification/visual-fidelity.md` (+ `.html` companion) (when mockups present — report-only, never gates completion)
**State**: Update E2E results; on success mark Phase 12 in `completed_phases` (Phase 13 reads this as a precondition).

**Skip if**: `options.e2e_enabled = false`

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-12-exit` with question "E2E complete. Continue to Phase 13?", options `["Continue to Phase 13", "Pause workflow"]`, original recommendation "Continue to Phase 13".

---

### Phase 13: User Documentation (Optional)

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

> **⚠ Serialization rule**: Phases 12 and 13 share the Playwright MCP browser instance — see the same rule on Phase 12. Phase 13 MUST NOT be dispatched in the same assistant message as Phase 12, regardless of how the user answered the gate.

**Preconditions**: If `options.e2e_enabled = true`, Phase 12 MUST be present in `completed_phases` before Phase 13 starts. If it is not yet completed (e.g., E2E is still running or failed), do not start Phase 13 — return to the Phase 12 gate.

**Purpose**: Generate user-facing documentation with screenshots
**Execute**: Common runtime — `resolveAgent({ logical_role_id: "maister:user-docs-generator" })`, then dispatch actor `development`, work item `user-documentation`, the guide/screenshot output contract, and the bounded documentation context.
**Prompt must include**: task_path (absolute), spec_path, base_url. **When Phase 12 ran successfully** (E2E enabled and completed), also include `e2e_screenshots_path: {task_path}/verification/screenshots/` together with the instruction *"Reuse applicable E2E screenshots from this directory before capturing new ones via Playwright."* When Phase 12 was skipped or failed, omit `e2e_screenshots_path` entirely. Guide saves to `{task_path}/documentation/user-guide.md`.
**Output**: `documentation/user-guide.md`, screenshots (reused from E2E run when applicable)
**State**: Update docs generation status

**Skip if**: `options.user_docs_enabled = false`

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-13-exit` with question "Documentation complete. Continue to Phase 14?", options `["Continue to Phase 14", "Pause workflow"]`, original recommendation "Continue to Phase 14".

---

### Phase 14: Finalization

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Complete workflow and provide next steps
**Execute**: Direct - create summary, update state, guide commit
**Output**: Workflow summary
**State**: Set `task.status: completed`

**Process**:
1. Read `orchestrator.gate_history` and generate `outputs/decision-summary.md` with every decision, option, recommendation, rationale, confidence, model, retry, arbitration, override, and full-context link.
2. If `orchestrator.options.html_output` is true, invoke `html-companion-writer` for `outputs/decision-summary.md` and register `outputs/decision-summary.html`; otherwise record Markdown-only output.
3. Invoke the denylisted `final-handoff-approval` gate with exact options `["Complete workflow", "Keep workflow open"]`; update task status to `completed` only after its terminal record and the final summary are persisted. For `blocked` or `failed` termination, generate the same summary with the terminal status before stopping.
4. Update the dashboard projection and provide a commit message template and next steps (code review, PR, deployment).

→ End of workflow

---

## Domain Context (State Extensions)

Development-specific fields in `orchestrator-state.yml`:

```yaml
orchestrator:
  options:
    html_output: true  # Seeded from .maister/config.yml at init (default true). Gates dashboard + HTML companions.
    spec_audit_enabled: true
    skip_test_suite: true
    e2e_enabled: null
    user_docs_enabled: null
    code_review_enabled: true
    pragmatic_review_enabled: true
    reality_check_enabled: true
    production_check_enabled: true
    advisor:
      enabled: false
      gate_policies:
        phase-exit: manual
        optional-phase: manual
        clarify: manual
        convergence: manual
        verify-matrix: manual
      advisor_agent: maister:advisor
      arbiter_agent: maister:advisor
      arbiter_enabled_on_disagreement: true
      retry:
        advisor_attempts: 3
        arbiter_attempts: 3
        backoff: exponential
  task_context:
    risk_level: null
    clarifications_resolved: null
    scope_expanded: null
    architecture_decision: null
    task_characteristics:
      has_reproducible_defect: false
      modifies_existing_code: false
      creates_new_entities: false
      involves_data_operations: false
      ui_heavy: false

Creation normalizes the project configuration once into the complete block above, independently of `html_output`. Resume reads `orchestrator.options.advisor` from canonical state only and never rereads `.maister/config.yml`.
    research_reference:
      path: null
      research_question: null
      research_type: null
      confidence_level: null
    design_reference:
      source: null  # "product-design" | "inline-prompt" | "legacy-migration" | null
      product_design_path: null  # set when Source 1 detected
      mockup_count: 0
      has_brief: false
      index_path: null  # path to analysis/design-context/INDEX.md
    phase_summaries:
      # Every entry also carries the shared base shape (orchestrator-patterns.md § 4):
      #   decisions: []   risks: []   artifacts: [{path, label, html}]
      research: {summary: null, key_findings: [], recommended_approach: null}
      design: {summary: null, screen_count: 0, component_count: 0, index_path: null}
      codebase_analysis: {key_files: [], primary_language: null, summary: null}
      clarifications: []
      gap_analysis: {integration_points: [], summary: null}
      scope_clarifications: {scope_expanded: null, summary: null}
      ui_mockups: {components_designed: [], summary: null}
      specification: {summary: null}
      architecture_decision: {decision: null, summary: null}
      advisor: {summary: null, decisions: [], risks: [], artifacts: []}
```

---

## Task Structure

```
.maister/tasks/development/YYYY-MM-DD-task-name/
├── orchestrator-state.yml
├── dashboard.html                 # Operator dashboard (copied plugin asset — never model-generated)
├── dashboard-data.js              # Dashboard data projection (rewritten after each phase/gate)
├── analysis/
│   ├── research-context/          # If --research provided
│   ├── design-context/            # If mockups detected (Step 4 ingestion or Phase 4 generation)
│   │   ├── mockups/               # HTML/PNG/screenshots (from product-design or inline prompt)
│   │   ├── ascii/                 # ASCII mockups from Phase 4 ui-mockup-generator
│   │   ├── brief.md               # Product brief (when ingested from product-design task)
│   │   ├── external-links.md      # Figma/Sketch/Zeplin URLs (no fetch — for reference)
│   │   └── INDEX.md               # Screen/component inventory with stable IDs
│   ├── codebase-analysis.md       # Phase 1
│   ├── clarifications.md          # Phase 1
│   ├── gap-analysis.md            # Phase 2
│   ├── scope-clarifications.md    # Phase 2 (conditional)
│   └── technical-clarifications.md # Phase 5 (conditional)
├── implementation/
│   ├── spec.md                    # Phase 5
│   ├── spec.html                  # Phase 5 (HTML companion)
│   ├── requirements.md            # Phase 5
│   ├── implementation-plan.md     # Phase 7
│   ├── implementation-plan.html   # Phase 7 (HTML companion)
│   ├── visual-coverage.md         # Phase 7 (when design-context exists)
│   ├── work-log.md                # Phase 8
│   ├── tdd-red-gate.md            # Phase 3 (conditional)
│   └── tdd-green-gate.md          # Phase 9 (conditional)
├── verification/
│   ├── spec-audit.md              # Phase 6 (recommended)
│   ├── implementation-verification.md  # Phase 11
│   ├── implementation-verification.html # Phase 11 (HTML companion)
│   ├── e2e-verification-report.md      # Phase 12 (optional)
│   ├── e2e-verification-report.html    # Phase 12 (HTML companion)
│   ├── visual-fidelity.md              # Phase 12 (when design-context exists, report-only)
│   └── visual-fidelity.html            # Phase 12 (HTML companion)
├── documentation/
│   └── user-guide.md              # Phase 13 (optional)
└── outputs/
    ├── decision-summary.md        # Full gate history and context
    └── decision-summary.html      # HTML companion when html_output is true
```

---

## Auto-Recovery

| Phase | Max Attempts | Strategy |
|-------|--------------|----------|
| 1 | 2 | Expand search, prompt user |
| 2 | 2 | Re-analyze, ask user |
| 3 | 2 | Rewrite test, skip TDD with doc |
| 5 | 2 | Regenerate spec |
| 7 | 2 | Regenerate plan |
| 8 | 5 | Fix syntax, imports, tests |
| 9 | 3 | Return to implementation |
| 11 | 3 | Fix tests, re-run |

---

## Command Flags

| Flag | Effect |
|------|--------|
| `--from=PHASE` | Start from specific phase |
| `--research=PATH` | Link to completed research task |
| `--audit` / `--no-audit` | Force/skip specification audit |
| `--e2e` / `--no-e2e` | Force/skip E2E testing |
| `--user-docs` / `--no-user-docs` | Force/skip user documentation |
| `--sequential` | Disable parallel wave dispatch in the executor; run one task group at a time. Persisted as `orchestrator.options.sequential: true` in `orchestrator-state.yml` and read by `implementation-plan-executor` Phase 2. Defaults to off (parallel waves). |

---

## Research-Based Development

When starting development from a completed research task, the orchestrator loads research context to **INFORM** all phases.

### Invocation Methods

**Method 1: Research folder as sole argument** (recommended)
```
/maister-development .maister/tasks/research/2026-01-12-oauth-research
```
The orchestrator auto-detects this is a research folder and:
- Extracts task description from `research_context.research_question`
- Reads all research artifacts
- Sets `research_reference` in state

**Method 2: Explicit --research flag**
```
/maister-development "Implement OAuth" --research=.maister/tasks/research/2026-01-12-oauth-research
```

### Research Artifacts (Standard List)

When research context is detected, read these files from the research folder:

| Artifact | Path | Purpose |
|----------|------|---------|
| State | `orchestrator-state.yml` | research_type, confidence_level |
| Report | `outputs/research-report.md` | Main findings and conclusions |
| Solution Exploration | `outputs/solution-exploration.md` | Alternatives and trade-offs (input to Phase 5) |
| High-Level Design | `outputs/high-level-design.md` | C4 architecture (input to Phase 5) |
| Decision Log | `outputs/decision-log.md` | ADR decisions (input to Phase 5) |

### How Research Informs Each Phase

**Research INFORMS phases, never SKIPS them.** Research context passes to ALL phases via `task_context.phase_summaries.research`. No phases are skipped.

| Phase | How Research Context is Used |
|-------|------------------------------|
| Phase 1 | Codebase analyzer receives research findings as search guidance |
| Phase 2 | Gap analyzer uses research recommendations for comparison |
| Phase 5 | Specification creator uses high-level-design.md as INPUT (still creates full spec). Architecture decisions use research report AND decision-log.md (lighter when ADRs comprehensive) |
| Phase 7 | Implementation planner references research approach for task grouping |

---

## Design-Informed Development

When mockups or design artifacts are present, they become **binding inputs** to implementation — not optional references. The `analysis/design-context/` directory unifies all visual sources (product-design output, inline prompt references, Phase 4 ASCII generation) and propagates through every downstream phase.

### Auto-Detection Sources (Step 4 of Initialization)

**Source 1 — Product-design task path** (recommended handoff):
```
/maister-development .maister/tasks/product-design/2026-05-09-user-dashboard/
```
Auto-detected when the argument resolves to a `.maister/tasks/product-design/*` directory. Brief and mockups are copied into `design-context/`.

**Source 2 — Inline mockup paths in task description**:
```
/maister-development "Implement the dashboard from /tmp/dashboard-mockup.html"
```
Auto-detected file paths (`.html`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.pdf`) are copied into `design-context/mockups/`. Design-tool URLs (Figma, Sketch Cloud, Zeplin) are recorded in `design-context/external-links.md`.

**Source 3 — Phase 4 ASCII generation**: When no external mockups exist and `task_characteristics.ui_heavy` is true, `ui-mockup-generator` produces ASCII mockups in `design-context/ascii/`.

### How Design Context Informs Each Phase

**Design INFORMS phases, never SKIPS them.** Design context passes via `task_context.phase_summaries.design` and `task_context.design_reference`.

| Phase | How Design Context is Used |
|-------|------------------------------|
| Phase 4 | Skipped if `design-context/mockups/` already populated; otherwise outputs to `design-context/ascii/` |
| Phase 5 | `specification-creator` reads from `design-context/` (single source); produces "Visual Design" section in spec.md |
| Phase 7 | `implementation-planner` enumerates screens from `design-context/INDEX.md`, attaches required `Visual References` to UI task groups, produces `implementation/visual-coverage.md` proving every screen is covered by ≥1 group |
| Phase 8 | `task-group-implementer` reads each referenced mockup before coding; layout, copy, field order, and explicit states are binding |
| Phase 12 | `e2e-test-verifier` performs LLM-judged structural visual-fidelity comparison after capturing screenshots; writes `verification/visual-fidelity.md` (report-only, never gates completion) |

### Graceful Degradation

When no mockups are detected at any source, the entire design-context machinery is skipped:
- No `design-context/` directory
- No `design_reference` in state (remains null)
- No `Visual References` field in task groups (planner omits the section entirely)
- No `visual-coverage.md` or `visual-fidelity.md`

Non-UI tasks see zero behavior change.

---

## Command Integration

Invoked via:
- `/maister-development [description] [--e2e] [--user-docs] [--research=PATH]` (new)
- `/maister-development [task-path] [--from=PHASE] [--reset-attempts]` (resume)

---

## TDD Gate Rules

**Phase 3 (Red Gate)**: Test MUST FAIL before implementation (activated when gap-analyzer detects reproducible defect)
**Phase 9 (Green Gate)**: Test MUST PASS after implementation (activated when Phase 3 was executed)
