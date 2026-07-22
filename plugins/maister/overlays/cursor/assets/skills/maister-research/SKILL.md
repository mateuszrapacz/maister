---
name: maister-research
description: Orchestrates comprehensive research workflows from question definition through findings documentation. Handles technical, requirements, literature, and mixed research types with adaptive methodology, multi-source gathering, pattern synthesis, and evidence-based reporting. Supports standalone research tasks and embedded research phase in other workflows.
user-invocable: true
---

# Research Orchestrator

Systematic research workflow from question definition to evidence-based documentation.

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

### Step 2: Initialize Workflow

1. **Capture the clock**: run `date -u +"%Y-%m-%dT%H:%M:%SZ"` via Bash NOW — you do NOT know the time from context. Every timestamp written this turn (`created`, `updated`, `generated`, `phases[].started`) uses this value. Date-only or `T00:00:00Z` values are the documented failure mode (orchestrator-patterns.md § 4 Timestamp Rule). Re-run `date` in later turns before writing timestamps.
2. **Create Todo Items**: Use `TodoWrite` for all phases (see Phase Configuration), then set dependencies with `TodoWrite ordering in todos array (merge: true)`
3. **Create Task Directory**: `.maister/tasks/research/YYYY-MM-DD-task-name/`
4. **Initialize State**: Create `orchestrator-state.yml` with research context
5. **Set up Operator Dashboard** (orchestrator-patterns.md § 8) — first read `.maister/config.yml` and set `orchestrator.options.html_output` (default true if the file/key is absent). **When `html_output` is false, SKIP this entire step** — no `dashboard.html`, no `dashboard-data.js`, no browser auto-open — and proceed. Otherwise: copy `../lib/orchestrator-framework/assets/dashboard.html` to the task root as `dashboard.html`, write the initial `dashboard-data.js` (all phases pending, `task.type: "research"`), then **auto-open it in the user's browser** (`open` / `xdg-open` / `start` per platform, passing the plain absolute filesystem path — NEVER a hand-built `file://` URL; on failure just print the path — never block). On resume: re-copy `dashboard.html` only if missing; regenerate `dashboard-data.js` from state; then auto-open it in the browser again (same opener as a new task — the OS focuses an already-open tab rather than duplicating).

**Output**:
```
🚀 Research Orchestrator Started

Task: [research question]
Directory: [task-path]
Dashboard: open [task-path]/dashboard.html in a browser to monitor progress

Starting Phase 1: Initialize research...
```

---

## Operator Visibility (applies to every phase)

> **Config gate**: these rules assume `options.html_output` is true (read from `.maister/config.yml` at init, default true). When **false**: skip the Dashboard-upkeep rule entirely (no dashboard files, no browser open, no rewrites) and the HTML-companions rule (do NOT pass `html_style_guide_path`; subagents write md only). The Artifact Summary Contract (§ 7 TL;DR blocks) and `phase_summaries` in state stay active either way.

Cross-cutting rules from `orchestrator-patterns.md` (same as the development orchestrator):

1. **Artifact Summary Contract (§ 7)**: every artifact-writing subagent prompt MUST include the contract instruction (artifacts open with TL;DR / Key Decisions / Open Questions & Risks). At context extraction, lift `decisions`, `risks`, and `artifacts` into `phase_summaries.[phase]` — verbatim, never re-summarized.
2. **Dashboard upkeep (§ 8)**: rewrite `dashboard-data.js` at every phase START (mark `in_progress` before delegating), **BEFORE firing every exit gate** (register the finished phase's artifacts/summary/decisions/risks — the operator reviews them on the dashboard while answering; status stays `in_progress` until the gate passes), after every phase completion (including skipped phases 3-5, with reason), every gate decision, and at finalization. **Phase 1 addition**: also refresh after each of its 4 steps completes, registering that step's artifacts — Phase 1 is long and the operator should see brief → plan → findings → report appear incrementally. In particular, after Step 4 the report (`outputs/research-report.md` + `.html`) MUST be registered before the Phase 1 exit gate fires.
3. **HTML companions (§ 9)**: pass `html_style_guide_path` (absolute path to `../lib/orchestrator-framework/references/html-report-style.md`) to research-synthesizer, solution-brainstormer, and solution-designer. Register returned companion paths in `phase_summaries.[phase].artifacts[].html` so the dashboard hero cards link HTML first.
4. **Advisor gates (§ 2.2)**: classify every research decision gate, resolve it through the configured manual/advisor/fully_automatic policy, persist the full record in `orchestrator.gate_history` after each decision, and never let advisor output modify source files. Generate `outputs/decision-summary.md` and its HTML companion at completion or blocked/failed termination.

Every research convergence, clarification, scope, optional-phase, verification,
and phase-exit gate MUST invoke
`lib/orchestrator-framework/references/gate-decision-engine.md` with a stable
`gate_type`, exact ordered options, original recommendation, safety
classification, and complete read-only context. Check the idempotency key before
any model or user call; persist pending states and every retry before waiting;
persist the terminal decision before continuing. Advisor and arbiter output may
recommend a research choice but cannot edit research artifacts.

### Concrete Gate Call-Site Checklist

Every `AskQuestion` below is only the host adapter's
`present_user_gate`. Before it, invoke `evaluate_gate(gate_context,
orchestrator-state.yml, host_adapter)` from
`lib/orchestrator-framework/references/gate-decision-engine.md`. Each
`gate_context` must include `phase_id`, stable `gate_type`, exact question,
exact ordered options, `original_recommendation`, `safety_classification`, and
read-only `context` with `task_path`, phase summaries, artifact paths,
dashboard summary, and prior `gate_history`.

For every call site: reuse a terminal idempotency record before any call;
persist and refresh dashboard for `user_pending`, `advisor_pending`, or
`arbiter_pending` before waiting; persist each retry/backoff and the one
arbiter on disagreement; then persist the full terminal record and refresh
dashboard/decision summaries before phase status or continuation. On retry
exhaustion use the user gate or persist `blocked`. Advisor/arbiter output is
read-only and cannot edit research artifacts or expand scope.

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

Stable inventory: `phase-1-exit`, `phase-3-exit`, `phase-4-exit`, and
`phase-5-exit` use `["Continue to the named next phase", "Pause workflow"]`;
`optional-phase-selection` uses `["Enable brainstorming", "Disable brainstorming"]`
and then `["Enable high-level design", "Disable high-level design"]` in that
order; `research-convergence` uses the decision-area alternatives in exact
artifact order plus `"Need more info"`; `research-clarification` uses
`["Confirm assumptions", "Correct assumptions", "Provide more context"]`;
`design-failure-recovery` uses `["Retry design", "Skip design", "Stop workflow"]`.
Each row carries the displayed question and original recommendation. Final
handoff is `final-handoff-approval` with
`["Complete workflow", "Keep workflow open"]` and is always user-controlled.
5. **icon_hint values** per phase: 1 `analysis`, 2 `plan`, 3 `spec`, 4 `plan`, 5 `spec`, 6 `done`.

---

## When to Use

Use when:
- Need comprehensive research on a topic
- Exploring codebase patterns or architecture
- Gathering requirements or best practices
- Want systematic evidence-based answers
- Research will feed into development workflows

**DO NOT use for**: Development tasks, bug fixes, performance optimization.

---

## Core Principles

1. **Evidence-Based**: Every finding must have source citation
2. **Systematic**: Follow structured methodology for consistent results
3. **Multi-Source**: Gather from codebase, docs, config, external sources
4. **Synthesized**: Cross-reference findings, identify patterns
5. **Actionable**: Produce outputs that enable next steps

---

## Local References

| File | When to Use | Purpose |
|------|-------------|---------|
| `references/research-methodologies.md` | Phase 1 | Research type classification, methodology selection, gathering strategies, analysis frameworks |
| `references/brainstorming-techniques.md` | Phase 3 | Divergent/convergent thinking, interactive exploration, scope guardrails |
| `references/design-techniques.md` | Phase 5 | Decision documentation (MADR), ADR guidance, decision linking |

---

## Phase Configuration

| Phase | content | activity description in content | Agent/Skill |
|-------|---------|------------|-------------|
| 1 | "Research foundation (init, plan, gather, synthesize)" | "Executing research foundation" | Direct + research-planner + information-gatherer (xN) + research-synthesizer |
| 2 | "Evaluate brainstorming value" | "Evaluating brainstorming value" | Direct |
| 3 | "Generate solution alternatives" | "Generating solution alternatives" | solution-brainstormer |
| 4 | "Evaluate brainstorming alternatives" | "Evaluating brainstorming alternatives" | Direct (interactive) |
| 5 | "Design high-level architecture" | "Designing high-level architecture" | Direct + solution-designer |
| 6 | "Summarize research and suggest next steps" | "Completing research" | Direct |

---

## Research Types

| Type | Keywords | Focus | Typical Outputs |
|------|----------|-------|-----------------|
| **Technical** | "how does", "where is", "implementation" | Codebase analysis | Knowledge base, architecture docs |
| **Requirements** | "what are requirements", "user needs" | User/business needs | Specifications, requirements doc |
| **Literature** | "best practices", "industry standards" | External research | Recommendations, comparisons |
| **Mixed** | Multiple keywords, broad questions | Comprehensive investigation | All output types |

---

## Workflow Phases

### Phase 1: Research Foundation

**Purpose**: Initialize research, plan methodology, gather information from all sources, and synthesize findings into a research report
**Execute**: Multi-step: Direct + research-planner + information-gatherer (xN) + research-synthesizer
**Output**: `planning/research-brief.md`, `planning/research-plan.md`, `planning/sources.md`, `analysis/findings/*.md`, `analysis/synthesis.md`, `outputs/research-report.md`
**State**: Set `research_context.research_type`, `research_question`, `scope`, `methodology`, `sources`, `confidence_level`, `gathering_strategy`

This phase executes 4 sequential steps. On resume, check existing artifacts to skip completed steps.

#### Step 1: Initialize (Direct)

**Artifacts**: `planning/research-brief.md`
**Resume check**: If `planning/research-brief.md` exists, skip to Step 2

1. Parse research question (from command or prompt user)
2. Classify research type (auto-detect from keywords or use `--type` flag)
3. Determine scope (included, excluded, constraints)
4. Define success criteria
5. Create research brief
6. Update state: set `research_context.research_type`, `research_question`, `scope`
7. **Discover project documentation**: Read `.maister/docs/INDEX.md` (if exists), extract ALL file paths from the "Project Documentation" section — includes predefined docs AND any user-added project docs. Store as `research_context.project_doc_paths` in state.

#### Step 2: Plan (Subagent)

**Artifacts**: `planning/research-plan.md`, `planning/sources.md`
**Resume check**: If `planning/research-plan.md` AND `planning/sources.md` exist, skip to Step 3

**Read `references/research-methodologies.md` NOW using the Read tool** — research type classification, methodology selection, gathering strategies

**INVOKE NOW**: `resolveAgent({ logical_role_id: "maister-research-planner" })`, then dispatch actor `research`, work item `research-plan`, the planning output contract, and the bounded research brief.

**Context to pass**: task_path, research_brief_path, research_type, research_question, scope, project_doc_paths (from state)

Update state: `research_context.methodology`, `sources`

#### Step 3: Gather + Merge (Parallel Subagents + Direct)

**Artifacts**: `analysis/findings/*.md` (category-specific)
**Resume check**: If any `analysis/findings/*.md` files exist, skip to Step 4

**Determine gatherer count and categories**:
1. Read `planning/research-plan.md` for **Gathering Strategy** section
2. If gathering strategy found: use specified categories and count (cap at 8 max)
3. If no gathering strategy: fall back to default 4 categories (codebase, documentation, configuration, external)
4. Update state: `research_context.gathering_strategy`

**CRITICAL: Launch all N agents in ONE message for parallel execution.**

**Parallel Execution Pattern**:
```
Read gathering strategy from research-plan.md
For each category in strategy:
  Resolve `resolveAgent({ logical_role_id: "maister-information-gatherer" })`, then dispatch actor `research`, one stable work item per `source_category`, output `analysis/findings/[prefix]-*.md`, and that category's bounded gathering context.
```

#### Step 4: Synthesize (Subagent)

**Artifacts**: `analysis/synthesis.md`, `outputs/research-report.md`
**Resume check**: If `analysis/synthesis.md` AND `outputs/research-report.md` exist, skip (Phase 1 complete)

**INVOKE NOW**: `resolveAgent({ logical_role_id: "maister-research-synthesizer" })`, then dispatch actor `research`, work item `research-synthesis`, the synthesis/report output contract, and bounded findings context.

**Context to pass**: task_path, findings_directory_path, research_question, research_type, methodology, html_style_guide_path (for the research-report.html companion)

**Synthesizer produces**:
- Pattern analysis and cross-references (`analysis/synthesis.md`)
- Comprehensive research report answering research question (`outputs/research-report.md`)
- Confidence levels for each finding
- Documented gaps and uncertainties

Update state: `research_context.confidence_level`

---

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-1-exit` with question "Research foundation complete (initialized, planned, gathered, synthesized). Continue to brainstorming evaluation?", options `["Continue to brainstorming evaluation", "Pause workflow"]`, original recommendation "Continue to brainstorming evaluation".

---

### Phase 2: Optional Phases Decision

> **Phase entry self-check**: Before executing this phase, require either the Phase 1 explicit user-gate call or matching schema-v2 automatic evidence: complete non-denylisted terminal gate, applied selection, acknowledged dispatch, and this phase's durable `in_progress` checkpoint. Without either, STOP and resolve the gate. Protected gates always require the explicit call.

**Purpose**: Evaluate whether brainstorming and/or design phases would be valuable (independently)
**Execute**: Direct
**Output**: Updated `orchestrator-state.yml`
**State**: Set `options.brainstorming_enabled`, `options.design_enabled`

**Auto-resolve if**: `--brainstorm`/`--no-brainstorm` flags (brainstorming only), `--design`/`--no-design` flags (design only)

**Process**:
1. Read `analysis/synthesis.md` summary and `research_type` from state
2. Evaluate brainstorming value based on:
   - Number of viable approaches identified in synthesis (multiple → valuable)
   - Problem novelty (new domain → valuable; well-understood → less so)
   - Whether synthesis identified competing trade-offs (yes → valuable)
3. Evaluate design value based on:
   - Whether research suggests architectural decisions (yes → valuable)
   - Research type (requirements/mixed → likely valuable; technical → depends)
   - Whether design artifacts would feed into development workflow
4. If `brainstorming_enabled` not already set by flag, invoke `optional-phase-selection` through the engine:
   - "[Brainstorming recommendation]. Would you like to explore solution alternatives?"
   - Exact options: `["Yes, explore alternatives", "No, skip brainstorming"]`; original recommendation is the analyzer's recommendation.
5. If `design_enabled` not already set by flag, invoke `optional-phase-selection` through the engine:
   - "[Design recommendation]. Would you like to generate a high-level design?"
   - Exact options: `["Yes, generate design", "No, skip design"]`; original recommendation is the analyzer's recommendation.
6. Update state: set `brainstorming_enabled` and `design_enabled`

→ Persist the terminal `optional-phase-selection` records before routing; if brainstorming is enabled continue to Phase 3, if disabled and design is enabled skip to Phase 5, otherwise skip to Phase 6.

---

### Phase 3: Solution Generation

**Purpose**: Generate solution alternatives from research evidence using specialized brainstormer subagent
**Execute**: solution-brainstormer subagent
**Output**: `outputs/solution-exploration.md`
**State**: Update `phase_summaries.phase-3`

**Skip if**: `brainstorming_enabled = false` (user chose to skip in Phase 2, or `--no-brainstorm` flag)

**Read `references/brainstorming-techniques.md` NOW using the Read tool** — divergent/convergent thinking techniques, scope guardrails

> **ANTI-PATTERN**: Do NOT generate solution alternatives inline. The solution-brainstormer agent has specialized multi-perspective analysis capabilities.

**INVOKE NOW**: `resolveAgent({ logical_role_id: "maister-solution-brainstormer" })`, then dispatch actor `research`, work item `solution-exploration`, output `outputs/solution-exploration.md`, and the bounded context below.

**Context to pass** (Pattern 7):
- `task_path`, `synthesis_path`, `research_report_path`
- `output_path`: `outputs/solution-exploration.md` — brainstormer MUST write to this exact path
- `html_style_guide_path` (for the solution-exploration.html companion)
- Accumulated context: `research_type`, `research_question`, `confidence_level`, `phase_summaries` (Phase 1)
- `project_doc_paths` (from state)

> **SELF-CHECK**: After dispatch returns, verify `outputs/solution-exploration.md` exists and contains alternatives. If missing: **STOP. Do NOT proceed to Phase 4 or Phase 5.** Re-dispatch the exact role with corrected bounded context (ensure `output_path` is `outputs/solution-exploration.md`). If second attempt also fails, invoke `design-failure-recovery` with exact options `["Retry design", "Skip design", "Stop workflow"]`.

→ Invoke the engine as `phase-3-exit` with question "Continue to solution convergence?", options `["Continue to solution convergence", "Pause workflow"]`, original recommendation "Continue to solution convergence", then continue only after the terminal record is persisted.

---

### Phase 4: Solution Convergence

**Purpose**: Present brainstorming alternatives to user for decision-making on each decision area
**Execute**: Direct (interactive)
**Output**: Updated `orchestrator-state.yml` with chosen approaches
**State**: Update `phase_summaries.phase-4` with `decision_areas` and `deferred_ideas`

**Skip if**: `brainstorming_enabled = false`
**Resume check**: Re-read `orchestrator.work.phase-4` and skip only items already `completed` with a matching terminal source gate and applied selection. Phase summaries are projections, not resume authority.

> **ANTI-PATTERN**: Do NOT present all decision areas in a single summary table and ask one combined "do you agree?" question. Each area MUST get its own detailed presentation and its own AskQuestion call.
>
> **ANTI-PATTERN**: Do NOT show full alternatives/pros/cons for the first area and then shortcut remaining areas to just a recommendation line + question. EVERY area gets the SAME level of detail — all alternatives with descriptions, pros, and cons. No exceptions.
>
> **ANTI-PATTERN**: Do NOT batch multiple decision areas into one AskQuestion call. The tool accepts up to 4 questions per call — using that capacity here IS the documented failure mode. One call = one question = one decision area. The § 3 "group important decisions" guidance applies to subagent `decisions_needed` triage, NOT to convergence — convergence is strictly sequential.

1. Read `outputs/solution-exploration.md`, derive one stable `decision-area:<artifact-id>` for every area in artifact order plus a final `convergence-summary` item, hash that ordered identity list as `inventory_version`, and call `materializeInventory` once. Reject identity drift on resume.
2. For each unresolved decision-area item **sequentially** — later areas may depend on earlier answers (a choice in area 1 can change which alternatives are even relevant in area 3), so do NOT pre-render or pre-ask later areas before the current one is answered. Output ALL of the following (steps a-d) BEFORE invoking the gate engine:
   a. **Area header**: area name and why this decision matters (1-2 sentences of context)
   b. **Alternatives detail**: For EVERY alternative in this area, show:
      - Name and description (2-3 sentences)
      - Pros (bullet list)
      - Cons (bullet list)
   c. **Recommendation**: which alternative is recommended and why (1 sentence)
   d. Invoke `research-convergence` (exactly ONE question for this area) with the area's alternatives in artifact order (mark recommended with "(Recommended)") + `"Need more info"` last.
   e. After a terminal choice, call `applySelectionAndCreateDispatch` with the current item and the next stable item, then claim and acknowledge that dispatch. Move to the next area only after its durable `in_progress` checkpoint exists. A successful `fully_automatic` decision presents no user gate.
   f. If "Need more info" → present the detailed trade-off analysis for the requested alternative, then re-ask

> **SELF-CHECK before each convergence call**: Did you output the alternatives with pros/cons for THIS area and construct one complete `research-convergence` context with exact ordered options? If not, STOP and correct it.

3. After all areas resolved, present a brief summary of the chosen combination
4. Update state with chosen approaches per decision area

> **GATE CHECK**: Verify that a terminal `research-convergence` record exists for EACH decision area. If any area was skipped, STOP and resolve before continuing. Do NOT mark Phase 4 complete without persisted convergence records.

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-4-exit` with question "Brainstorming complete. Continue to high-level design?", options `["Continue to high-level design", "Pause workflow"]`, original recommendation "Continue to high-level design".

---

### Phase 5: High-Level Design

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching complete terminal/applied-selection/acknowledged-dispatch/`in_progress` checkpoint evidence. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Create architecture design from selected solution approach
**Execute**: Orchestrator-Direct Hybrid
**Output**: `outputs/high-level-design.md`, `outputs/decision-log.md`
**State**: Update `phase_summaries.phase-5`

**Skip if**: `design_enabled = false`

**Read `references/design-techniques.md` NOW using the Read tool** — MADR format, ADR guidance, decision documentation patterns

**Part A — Design Direction (Direct)**:
1. If Phase 4 ran: confirm selected approaches from convergence
2. If Phase 4 was skipped: use research report recommendations as design input
3. Invoke `research-clarification` through the engine for any design preferences or constraints (e.g., "Any architectural constraints or preferences?") with exact options `["Confirm assumptions", "Correct assumptions", "Provide more context"]`.

**Part B — Design Generation (Subagent)**:

> **ANTI-PATTERN**: Do NOT generate C4 architecture diagrams or ADRs inline. The solution-designer agent has specialized architecture and MADR documentation capabilities.

**INVOKE NOW**: `resolveAgent({ logical_role_id: "maister-solution-designer" })`, then dispatch actor `research`, work item `solution-design`, the high-level-design/decision-log output contract, and the bounded context below.

**Context to pass** (Pattern 7):
- `task_path`, `synthesis_path`, `research_report_path`
- `solution_exploration_path` (only if Phase 3-4 ran)
- `selected_approach` (from Phase 4 convergence if ran, or from research report recommendations)
- `design_preferences` (from Part A)
- `html_style_guide_path` (for the high-level-design.html + decision-log.html companions)
- Accumulated context: `research_type`, `research_question`, `confidence_level`, `phase_summaries`
- `project_doc_paths` (from state)

> **SELF-CHECK**: After dispatch returns, verify both `outputs/high-level-design.md` and `outputs/decision-log.md` exist. If missing: **STOP. Do NOT proceed to Part C.** Re-dispatch the exact role with corrected bounded context. If second attempt also fails, invoke `design-failure-recovery` with exact options `["Retry design", "Skip design", "Stop workflow"]`.

**Part C — Summary (Direct)**:
3. Read `outputs/high-level-design.md` and `outputs/decision-log.md`
4. Present executive summary to user:
   - Architecture style and key components
   - Number of architectural decisions recorded
   - Key decision highlights (1 line each)
   - Integration points with existing system (if applicable)

→ **MANDATORY GATE** — invoke the shared gate engine now; `AskQuestion` is only its user-gate adapter. Proceeding without a persisted terminal engine record is a protocol violation.

Invoke the engine as `phase-5-exit` with question "Design complete. Continue to output generation?", options `["Continue to output generation", "Pause workflow"]`, original recommendation "Continue to output generation".

---

### Phase 6: Completion

> **Phase entry self-check**: Require either the preceding explicit user-gate call or matching complete terminal/applied-selection/acknowledged-dispatch/`in_progress` checkpoint evidence. Without either, STOP and resolve the gate. Protected gates always require explicit user evidence.

**Purpose**: Summarize research results and suggest next steps
**Execute**: Direct
**Output**: `outputs/decision-summary.md` and, when enabled, `outputs/decision-summary.html`

**Process**:
1. Inventory all generated outputs: `outputs/research-report.md` (always), plus conditional: `solution-exploration.md`, `high-level-design.md`, `decision-log.md`
2. Generate `outputs/decision-summary.md` from `orchestrator.gate_history`, including every question, option, recommendation, rationale, confidence, model, retry, arbitration, user override, full-context link, and terminal status. Generate the HTML companion when `options.html_output` is true.
3. Present executive summary to user, then invoke `final-handoff-approval` through the engine:
   - Key findings and confidence level
   - Which optional phases ran (brainstorming, design)
   - Key decision highlights (if brainstorming/design ran)
4. If design artifacts exist, suggest starting development in a fresh session:
   ```
   To start development based on this research, clear context first or start a new session, then run:
   /maister-development [task-path]
   ```

→ End of workflow

---

## Domain Context (State Extensions)

Research-specific fields in `orchestrator-state.yml`:

```yaml
research_context:
  research_type: "technical" | "requirements" | "literature" | "mixed"
  research_question: "[user's question]"
  scope:
    included: []
    excluded: []
    constraints: []
  methodology: []
  sources: []
  confidence_level: "high" | "medium" | "low"
  gathering_strategy:
    categories: []       # e.g., ["codebase", "documentation", "external-apis"]
    count: 4             # number of gatherer instances
    source: "planner" | "default"  # where strategy came from
  phase_summaries:
    # Every entry also carries the shared base shape (orchestrator-patterns.md § 4):
    #   decisions: []   risks: []   artifacts: [{path, label, html}]
    phase-1:
      summary: "..."
      steps_completed: []  # track which steps completed for resume
    phase-3:
      summary: "..."
    phase-4:
      summary: "..."
      decision_areas: []        # list of {area, alternatives_count, chosen_approach}
      deferred_ideas: []
    phase-5:
      summary: "..."
      architecture_style: null
      decisions_count: 0

orchestrator:
  options:
    html_output: true  # Seeded from .maister/config.yml at init (default true). Gates dashboard + HTML companions.
    advisor:
      enabled: false
      gate_policies:
        phase-exit: manual
        optional-phase: manual
        clarify: manual
        convergence: manual
        verify-matrix: manual
      advisor_agent: maister-advisor
      arbiter_agent: maister-advisor
      arbiter_enabled_on_disagreement: true
      retry:
        advisor_attempts: 3
        arbiter_attempts: 3
        backoff: exponential
    brainstorming_enabled: null  # null=not yet decided, set by Phase 2 or --brainstorm/--no-brainstorm flag
    design_enabled: null          # independent, set by Phase 2 or --design/--no-design flag
```

Creation normalizes the project configuration once into the complete block above, independently of `html_output`. Resume reads `orchestrator.options.advisor` from canonical state only and never rereads `.maister/config.yml`.

---

## Task Structure

```
.maister/tasks/research/YYYY-MM-DD-research-name/
├── orchestrator-state.yml
├── dashboard.html                  # Operator dashboard (copied plugin asset — never model-generated)
├── dashboard-data.js               # Dashboard data projection (rewritten after each phase/step/gate)
├── planning/
│   ├── research-brief.md           # Phase 1, Step 1
│   ├── research-plan.md            # Phase 1, Step 2
│   └── sources.md                  # Phase 1, Step 2
├── analysis/
│   ├── findings/
│   │   ├── codebase-*.md           # Phase 1, Step 3
│   │   ├── docs-*.md               # Phase 1, Step 3
│   │   ├── config-*.md             # Phase 1, Step 3
│   │   ├── external-*.md           # Phase 1, Step 3
│   │   └── [custom-category]-*.md  # Phase 1, Step 3 (dynamic categories)
│   └── synthesis.md                # Phase 1, Step 4 (reasoning log)
├── outputs/
│   ├── research-report.md          # Phase 1, Step 4 (main deliverable)
│   ├── research-report.html        # Phase 1, Step 4 (HTML companion)
│   ├── solution-exploration.md     # Phase 3 (conditional)
│   ├── solution-exploration.html   # Phase 3 (HTML companion)
│   ├── high-level-design.md        # Phase 5 (conditional)
│   ├── high-level-design.html      # Phase 5 (HTML companion)
│   ├── decision-log.md             # Phase 5 (conditional)
│   └── decision-log.html           # Phase 5 (HTML companion)
```

---

## Auto-Recovery

| Phase | Max Attempts | Strategy |
|-------|--------------|----------|
| 1 (Step 1) | 1 | Prompt user for clarification if question unclear |
| 1 (Step 2) | 2 | Expand search patterns, use fallback mixed methodology |
| 1 (Step 3) | 3 | Retry failed agents only, continue with successful categories |
| 1 (Step 4) | 2 | Request targeted re-gathering for gaps |
| 2 | 1 | Re-evaluate recommendation if synthesis unclear |
| 3 | 2 | Re-invoke solution-brainstormer with adjusted context |
| 4 | 1 | Re-read exploration file, re-present decision areas |
| 5 | 2 | Re-invoke solution-designer with adjusted context |
| 6 | 0 | Summary only |

---

## Integration with Other Workflows

### As Standalone Research

**Command**: `/maister-research [research-question]`
**Flow**: Complete all phases, save outputs in task directory

### As Embedded Research Phase

**Invoked by**: development orchestrator, migration orchestrator

**Integration**:
1. Parent orchestrator invokes research skill
2. Research executes phases 1-5 (skip Phase 6 completion — parent orchestrator handles next steps)
3. Design outputs fed into parent's specification phase
4. Research report saved in parent task's `analysis/research/` directory

**Handoff**:
```yaml
research_outputs:
  research_report: "[path to outputs/research-report.md]"
  findings_directory: "[path to analysis/findings/]"
  solution_exploration: "[path to outputs/solution-exploration.md]"
  high_level_design: "[path to outputs/high-level-design.md]"
  decision_log: "[path to outputs/decision-log.md]"
```

---

## Command Integration

Invoked via:
- `/maister-research [question] [--type=TYPE] [--brainstorm] [--no-brainstorm] [--design] [--no-design]` (new)
- `/maister-research [task-path] [--from=PHASE]` (resume)

**Brainstorming flags**:
- `--brainstorm`: Force brainstorming phase (auto-resolves Phase 2 brainstorming decision to "enable")
- `--no-brainstorm`: Skip brainstorming phase
- Neither: Phase 2 presents recommendation and asks user

**Design flags**:
- `--design`: Force high-level design phase (auto-resolves Phase 2 design decision to "enable")
- `--no-design`: Skip high-level design phase
- Neither: Phase 2 presents recommendation and asks user

Task directory: `.maister/tasks/research/YYYY-MM-DD-task-name/`
