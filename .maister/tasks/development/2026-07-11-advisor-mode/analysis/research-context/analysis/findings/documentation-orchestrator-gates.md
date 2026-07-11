# Documentation Findings: Orchestrator Gates, Config Seeding, and Subagent Escalation

## TL;DR
Maister's normative gate contract lives in `orchestrator-patterns.md` §2: every `→ Pause` / `→ MANDATORY GATE` **must** invoke `AskUserQuestion` before state is marked completed — permission mode and session reminders do not override this. Project options follow the `html_output` precedent: optional `.maister/config.yml` → read once at init → seed `orchestrator.options.*` in state → all downstream gates read state only. Subagents never answer gates themselves; they return `decisions_needed` or failures to the orchestrator, which escalates to the user via `AskUserQuestion`. Dashboard `phases[].gate: {question, answer}` is the documented audit extension point for advisor answers.

## Open Questions / Risks
- Documentation does not yet define an `advisor_mode` config key or advisor agent — only the `html_output` seeding pattern is normative precedent (medium confidence for schema extension).
- `plugin-development.md` and `build-pipeline.md` document platform gate *transforms* (AskUserQuestion → AskQuestion/CHAT GATE) but not advisor-specific routing — advisor design must compile through those transforms.
- "Escalation" in docs is fragmented: workflow escalation (`quick-bugfix` → development), subagent failure recovery (`implementation-plan-executor`), and decision enforcement (`decisions_needed`) — no unified advisor escalation contract yet.

---

## Sources Investigated

| Source | Path | Relevance |
|--------|------|-----------|
| Orchestrator patterns (primary) | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | §2 gates, §3 decisions/context, §4 config/state, §5 init, §7 artifact contract, §8 dashboard |
| Plugin CLAUDE.md | `plugins/maister/CLAUDE.md` | Config overview, operator visibility, hooks, subagent table |
| Plugin development standard | `.maister/docs/standards/global/plugin-development.md` | SOT rules, agent schema, companion-agent limits |
| Init scaffold | `plugins/maister/skills/init/SKILL.md` | `config.yml` creation pattern |
| Post-compaction hook | `plugins/maister/hooks/post-compact-reminder.sh` | Gate reminder after context compaction |
| Session-start hook | `plugins/maister/hooks/skill-invocation-reminder.sh` | Gate rule injection on every session |
| Hooks manifest | `plugins/maister/hooks/hooks.json` | Hook registration |
| Implementation executor | `plugins/maister/skills/implementation-plan-executor/SKILL.md` | Subagent failure escalation |
| Quick bugfix | `plugins/maister/skills/quick-bugfix/SKILL.md` | Workflow complexity escalation |
| Build pipeline standard | `.maister/docs/standards/global/build-pipeline.md` | Platform gate transform constraints |

---

## 1. Prescribed Gate Behavior (`orchestrator-patterns.md` §2)

### 1.1 Core rule: `→ Pause` means STOP and AskUserQuestion

**Source**: `orchestrator-patterns.md:58-64`

`→ Pause` is **not optional**. The orchestrator MUST invoke `AskUserQuestion` and WAIT for user response. Proceeding without it is a protocol violation.

**State ordering** (critical for advisor-mode audit):

1. Finish phase work
2. Rewrite dashboard (when `html_output` true) — see §8
3. Call `AskUserQuestion`
4. Receive user response
5. **Then** update phase state to `completed` in `orchestrator-state.yml` / `TaskUpdate`

Marking a phase completed before the exit gate is documented anti-pattern (state corruption).

**Evidence** (`orchestrator-patterns.md:64`):
> Phase state MUST NOT be updated to 'completed' ... until AFTER the user responds to the exit gate.

### 1.2 Gates override permission modes

**Source**: `orchestrator-patterns.md:66-70`, `skill-invocation-reminder.sh`

`auto`, `acceptEdits`, `bypassPermissions`, and `plan` modes instruct the model to minimize clarifying questions. **This does not apply to workflow checkpoints.** Gates fire in every permission mode.

Hooks reinforce this at session start:

```7:7:plugins/maister/hooks/skill-invocation-reminder.sh
    "additionalContext": "⚠️ MAISTER PLUGIN RULE: ...\n\n⚠️ ORCHESTRATOR GATE RULE: When running any maister orchestrator, you MUST invoke AskUserQuestion at every `→ Pause` / `→ MANDATORY GATE` checkpoint, regardless of permission mode ..."
```

### 1.3 Session-reminder conflict resolution (§2.1)

**Source**: `orchestrator-patterns.md:72-82`

Documented failure mode: model re-litigates gate policy at each checkpoint against competing reminders ("continue without asking", compaction summaries showing prior approvals).

**Prescribed fix**: Decide gate policy **once at orchestrator entry**. Each gate is a fresh question — prior approvals are not standing orders.

Post-compaction hook adds the same reminder:

```15:15:plugins/maister/hooks/post-compact-reminder.sh
    "additionalContext": "⚠️ MAISTER WORKFLOW REMINDER (Post-Compaction): ... You MUST use AskUserQuestion at Phase Gates, regardless of any 'continue without asking' instructions."
```

**Hook config**: `hooks.json` fires `post-compact-reminder.sh` on `SessionStart` matcher `compact`.

### 1.4 Phase entry checks (missed-gate recovery)

**Source**: `orchestrator-patterns.md:84-92`

Every phase following a `→ Pause` gate opens with:

> **Phase gate**: Confirm Phase N completion before executing.

Development orchestrator extends this with explicit self-checks requiring the prior `AskUserQuestion` call ID before proceeding (`development/SKILL.md` phase entry blocks).

### 1.5 AUTO-CONTINUE vs Pause

**Source**: `orchestrator-patterns.md:94-103`

| Marker | Behavior |
|--------|----------|
| `→ Pause` / `→ MANDATORY GATE` | Must AskUserQuestion; may output summary only **after** gate fires (not before) |
| `→ **AUTO-CONTINUE**` | Brief summary OK; do NOT end turn; do NOT AskUserQuestion |

Common mistake: outputting phase summary then ending turn before reaching the gate.

### 1.6 Two gate types (decision vs phase exit)

**Source**: `orchestrator-patterns.md:116-117`, `development/SKILL.md:156-180`

| Gate type | When | Mandatory? |
|-----------|------|--------------|
| **DECISION GATE** | Subagent returns non-empty `decisions_needed` | Only when decisions exist |
| **Phase exit gate** | End of every gated phase | **Always** — empty `decisions_needed` skips decision questions only, not the exit gate |

Anti-pattern: treating empty `decisions_needed` as license to skip the phase exit `AskUserQuestion`.

### 1.7 Subagents vs orchestrator user channel

**Source**: `orchestrator-patterns.md:115`

> Subagents have no user channel; the orchestrator IS the user channel.

**Implication for advisor mode** (from research plan): advisor interception must happen at **orchestrator parent** — subagents cannot invoke `AskUserQuestion` or receive advisor answers directly. This is normative, not incidental.

### 1.8 Documented anti-patterns summary

| Anti-pattern | Reference |
|--------------|-----------|
| Proceeding without AskUserQuestion | §2:107-109 |
| "I'll pause here" without tool call | §2:110 |
| Auto-accepting subagent decisions | §2:111, §3:169-176 |
| Summary before gate (skipping review point) | §2:112 |
| State completed before gate | §2:113 |
| Skipping gate because auto mode | §2:114 |
| Subagent autonomy → skip orchestrator gate | §2:115 |
| Prior-session approval patterns | §2:117, §2.1 |

---

## 2. Decision Enforcement from Subagents (`orchestrator-patterns.md` §3)

### 2.1 `decisions_needed` flow

**Source**: `orchestrator-patterns.md:165-184`

When a subagent returns `decisions_needed`, the orchestrator **MUST** present them via `AskUserQuestion`. Decisions are never silently skipped, auto-accepted, or merely logged.

**Decision Gate Pattern**:

1. **Parse** critical and important decisions from subagent output
2. **Present** — each decision is its own single-select question; never flatten multiple decisions into one option list
3. **Critical**: one `AskUserQuestion` call each with full context
4. **Important**: up to 4 separate questions within one call
5. **SELF-CHECK**: "Did I present ALL decisions from `decisions_needed`?"

Development Phase 2 example (`development/SKILL.md:156-161`) applies this to gap-analyzer output before the unconditional phase exit gate.

### 2.2 Context passing template

**Source**: `orchestrator-patterns.md:126-147`

Every subagent prompt must include prior phase summaries and the **Artifact Summary Contract** (§7) instruction. Subagents run in isolated context.

Structured fields controlling downstream logic (e.g., `task_characteristics` from gap-analyzer) must be extracted to state immediately — not only prose-summarized.

---

## 3. Config Seeding Pattern — `html_output` Precedent (`orchestrator-patterns.md` §4, §5)

### 3.1 File schema

**Source**: `orchestrator-patterns.md:200-213`, `CLAUDE.md` (Project Configuration), `init/SKILL.md:120-130`

`.maister/config.yml` is **optional** (sibling of `docs/` and `tasks/`). Scaffolded by `/maister:init`; never overwritten if existing.

```yaml
# Maister project configuration.
html_output: true   # Generate operator dashboard + HTML companion reports. false = markdown-only.
```

| Key | Default | Effect |
|-----|---------|--------|
| `html_output` | `true` | When `false`: skip dashboard (§8) and HTML companions (§9). Markdown artifacts, §7 TL;DR blocks, and `orchestrator-state.yml` still produced. |

### 3.2 Read-once, seed-to-state pattern

**Source**: `orchestrator-patterns.md:213`, `orchestrator-patterns.md:328-329`

**Initialization step 4** (§5):

1. Read `.maister/config.yml` if present
2. Set `orchestrator.options.html_output` in `orchestrator-state.yml`
3. Default `true` when file or key absent
4. **All downstream gates read `options.html_output` from state, not the file**

**Why**: Resume consistency; file read happens once per workflow.

**State field** (`orchestrator-patterns.md:230-235`):

```yaml
orchestrator:
  options:
    html_output: true | false   # Seeded from .maister/config.yml at init (default true)
```

### 3.3 Downstream config gates

Options seeded at init gate behavior across orchestrators:

| `html_output: false` | Behavior |
|---------------------|----------|
| Dashboard (§8) | Disabled — no copy `dashboard.html`, no `dashboard-data.js`, no browser open |
| HTML companions (§9) | Disabled — omit `html_style_guide_path` from subagent prompts |
| Still active | Markdown artifacts, §7 TL;DR, `phase_summaries`, context passing |

Orchestrator skills repeat this config gate in their preamble (e.g., `development/SKILL.md:87`, `research/SKILL.md:54`).

### 3.4 Proposed advisor config extension (inferred precedent)

**Confidence**: Medium — pattern is documented; advisor keys are not.

Following `html_output`, an advisor mode would likely:

1. Add keys to `.maister/config.yml` (e.g., `advisor_mode`, `advisor_model`)
2. Seed into `orchestrator.options.*` at init step 4
3. Gate logic reads state only
4. Init scaffold documents defaults with comments (per `init/SKILL.md` pattern)
5. Markdown/state artifacts produced regardless; advisor only changes **who answers** `AskUserQuestion`

Research plan success criteria explicitly reference this precedent (`planning/research-plan.md:169`, synthesis guidance item 3).

---

## 4. Operator Dashboard Gate Schema (`orchestrator-patterns.md` §8)

### 4.1 Config gate

When `options.html_output` is false, entire §8 is skipped. `phase_summaries` still maintained for context passing.

### 4.2 Dashboard files

| File | Role |
|------|------|
| `dashboard.html` | Static plugin asset — copied at init, never model-generated |
| `dashboard-data.js` | Orchestrator-written projection (`window.MAISTER_DATA`) |

### 4.3 Rewrite triggers (gate-relevant)

**Source**: `orchestrator-patterns.md:443-450`

Full rewrite of `dashboard-data.js` at:

1. Initialization
2. Phase starts (`in_progress` before delegation)
3. **BEFORE every phase exit gate** — artifacts/summary/decisions/risks registered while status stays `in_progress`; operator reviews finished work during gate wait
4. After phase completes (including skipped)
5. After every gate decision (record user's choice)
6. After verification cycles
7. Finalization

**Advisor implication**: gate answer should be recorded at trigger #5; question registered at trigger #3.

### 4.4 `phases[].gate` schema

**Source**: `orchestrator-patterns.md:477-478`

```js
gate: null   // {question, answer} after the exit gate fires
```

This is the **documented audit extension point** for advisor mode. Research plan proposes extending with `advisor_answer`, `advisor_model`, `user_override` — not yet in normative docs.

### 4.5 Decisions and risks verbatim rule

`decisions` and `risks` in dashboard data are copied **verbatim** from artifact §7 blocks — never re-summarized. Resolved risks prefixed with `resolved:`.

### 4.6 CLAUDE.md operator visibility summary

**Source**: `plugins/maister/CLAUDE.md` (Operator Visibility Layer)

Three-layer model:

1. **Artifact Summary Contract** (§7) — first ~20 lines of every md artifact
2. **Operator Dashboard** — `dashboard.html` + `dashboard-data.js`
3. **HTML Companion Reports** — gated by `html_output`

Cross-ref: `orchestrator-patterns.md` §7-9.

---

## 5. Escalation Patterns Involving Subagents

Documentation uses "escalation" in several distinct patterns. None define an advisor subagent today; all reinforce that **the orchestrator** owns user interaction.

### 5.1 Subagent → orchestrator decision escalation (`decisions_needed`)

| Step | Actor | Action |
|------|-------|--------|
| 1 | Subagent (e.g., gap-analyzer) | Returns `decisions_needed` in output |
| 2 | Orchestrator | Parses decisions; MUST AskUserQuestion per §3 |
| 3 | User | Selects options |
| 4 | Orchestrator | Records in `phase_summaries.decisions`; continues |

**Cannot**: orchestrator auto-accepts recommended defaults or logs without asking.

### 5.2 Subagent failure → orchestrator recovery escalation

**Source**: `implementation-plan-executor/SKILL.md:115-119`, `368-385`

When `task-group-implementer` fails in a parallel wave:

- Do NOT cancel sibling subagents
- Do NOT auto-rollback (user-confirmed rollback only — `CLAUDE.md`, `plugin-development.md:66-67`)
- Orchestrator analyzes failure, checks easy fixes
- **AskUserQuestion** with options: Try suggested fix / Retry group / Complete manually / Rollback / Stop
- Next wave blocked until all failed groups resolved

Partial-wave pattern: successful groups marked `completed`; failed stay `in_progress` with failure metadata.

### 5.3 Verification issue escalation (`orchestrator-patterns.md` §6)

| Issue type | Escalation |
|------------|------------|
| Trivial/auto-fixable | Fix silently, log |
| Non-trivial | AskUserQuestion |
| Critical unresolved after 3 reverify loops | MUST NOT proceed without user approval |

### 5.4 Workflow complexity escalation (non-subagent)

**Source**: `quick-bugfix/SKILL.md:67-87`

Quick-bugfix assesses complexity signals (2+ triggers → suggest escalation to `/maister:development`). Uses AskUserQuestion: continue quick fix vs switch workflow.

This is **workflow-level** escalation, not subagent delegation — but shows the AskUserQuestion pattern for scope decisions.

### 5.5 Skills-with-subagents cannot use companion-agent pattern

**Source**: `orchestrator-patterns.md:18-20`, `plugin-development.md:72-73`, `CLAUDE.md`

Skills like `codebase-analyzer`, `implementation-plan-executor`, `implementation-verifier` spawn subagents → must use Skill tool in main agent context.

`docs-operator` companion pattern works only for `docs-manager` (file ops, no subagent spawning).

**Advisor implication**: an advisor invoked via Task tool could work as a **gate-answering subagent** called by the orchestrator (orchestrator still fires the gate mechanism), but cannot replace orchestrator gate responsibility.

### 5.6 Subagent model configuration

**Source**: `plugin-development.md:9-18`, research `sources.md`

The SOT contains 26 agents: 23 explicitly use `model: inherit`, while 3 omit `model`; the Cursor-specific `explore` agent brings the wider inventory to 27. No documented precedent exists for a dedicated non-inherit advisor model — this remains greenfield.

### 5.7 Platform gate transforms (documentation constraint)

**Source**: `build-pipeline.md:72`, `sources.md` §6

Generated variants transform gate tool names:

| Platform | Transform |
|----------|-----------|
| Cursor | `AskUserQuestion` → `AskQuestion` |
| Copilot | → `ask_user` |
| Kiro | → **CHAT GATE** (+ `--no-interactive` defaults) |
| Codex | → plain-text user question |

Advisor instructions authored in SOT (`plugins/maister/`) must survive `make build` transforms. Kiro bans `AskUserQuestion` in output entirely.

---

## 6. Artifact Summary Contract (`orchestrator-patterns.md` §7)

Required in every markdown artifact (including this findings file):

```markdown
## TL;DR
[3-5 lines: conclusions, not process]

## Key Decisions
- [decision] — [rationale]   # omit section when empty

## Open Questions / Risks
- [gap or risk]               # omit section when empty
```

**Rules**:

- TL;DR hard-capped at 5 lines
- Omit empty Key Decisions / Open Questions sections (never write "None")
- Orchestrator lifts block content into `phase_summaries.decisions` / `.risks` at context extraction
- Exempt: `orchestrator-state.yml`, `dashboard-data.js`, raw mockups, `work-log.md`

Orchestrators must include contract in every artifact-writing subagent prompt (§3 template).

---

## 7. Plugin Development Standard — Relevant Points

**Source**: `.maister/docs/standards/global/plugin-development.md`

| Standard | Advisor relevance |
|----------|-------------------|
| Never edit generated variants | Advisor feature edits `plugins/maister/` + platform transforms only |
| Agent frontmatter schema | Future `advisor.md` needs `name`, `description`, `model`, `color` |
| Commands as thin wrappers | Gate/advisor logic belongs in `SKILL.md` / `orchestrator-patterns.md`, not commands |
| Single source of truth in SKILL.md | Extend patterns reference, not scatter across CLAUDE.md |
| Companion agent limit | Advisor is not a companion for a spawning skill |
| User-confirmed rollback | Advisor must not auto-rollback on subagent failure |
| Task artifacts under task dir | Gate audit fields live in task `orchestrator-state.yml` / `dashboard-data.js` |

`plugin-development.md` does **not** document gate behavior directly — it points to orchestrator patterns via CLAUDE.md cross-refs.

---

## 8. Gate Lifecycle Trace (documentation synthesis)

Documented flow for a gated phase exit (advisor insertion point marked):

```
Phase work completes (subagent returns)
    ↓
Context extraction → phase_summaries (decisions, risks, artifacts)
    ↓
[html_output true] Rewrite dashboard-data.js (status: in_progress, register artifacts)
    ↓
★ ADVISOR INSERTION POINT ★ — AskUserQuestion (or platform transform equivalent)
    ↓                              ↑ advisor could recommend an answer; user still confirms unless host API supports synthetic answers
Record gate {question, answer} in dashboard-data.js
    ↓
Update orchestrator-state.yml (phase → completed)
    ↓
Next phase entry self-check
```

For `decisions_needed` gates, the DECISION GATE fires **before** the phase exit gate (development Phase 2 pattern).

---

## 9. Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| AskUserQuestion mandatory at `→ Pause` | **High** | §2, hooks, development SKILL.md |
| State-after-gate ordering | **High** | §2 explicit rule + anti-patterns |
| `html_output` seeding pattern | **High** | §4, §5, init SKILL.md, CLAUDE.md |
| Dashboard `gate` schema | **High** | §8 schema |
| Subagents lack user channel | **High** | §2 anti-pattern |
| `decisions_needed` → AskUserQuestion | **High** | §3, development SKILL.md |
| Subagent failure → AskUserQuestion | **High** | implementation-plan-executor |
| Advisor config key names/shape | **Low** | Not documented; inferred from precedent |
| Advisor audit field extensions | **Medium** | `gate: {question, answer}` exists; extensions proposed in research plan only |

---

## 10. Implications for Advisor Mode Design

1. **Gate must still fire** — advisor replaces the *answer path*, not the checkpoint (per research scope and §2 normative contract).
2. **Orchestrator-only** — subagents return structured output; orchestrator invokes advisor (Task tool or platform API) then records answer.
3. **Config follows `html_output`** — `.maister/config.yml` → `orchestrator.options` → state-only reads downstream.
4. **Audit via dashboard** — extend `phases[].gate` and/or `phase_summaries` with advisor metadata; rewrite dashboard before gate (§8 trigger #3) and after answer (trigger #5).
5. **Platform transforms** — advisor docs in SOT must not reference banned tool names on Kiro; gate markers must compile through all `build.sh` pipelines.
6. **Hooks preserve gate discipline** — post-compaction and session-start reminders explicitly override "continue without asking" — advisor mode must not weaken these.
7. **Safety exclusions** — documented escalation paths (rollback, critical verification, scope expansion) are strong candidates for advisor denylist (not yet normative).
