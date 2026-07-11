# Configuration: Advisor Extension Points

## TL;DR

Maister has one project-config key today (`html_output`) scaffolded by init and seeded into `orchestrator.options` at workflow start; all runtime gates read state, not the file. `orchestrator.options` is the cross-orchestrator extension surface (shared keys in `orchestrator-patterns.md` §4, plus per-workflow keys in each SKILL.md). Dashboard `phases[].gate` is `{question, answer}` only — the natural audit extension for advisor answers. **Proposed**: add `advisor_enabled`, `advisor_model`, `advisor_agent` to `config.yml` and `orchestrator.options` following the `html_output` seed-once pattern, extend `gate` with `answered_by` / `advisor_model` / `user_override`, and add optional `--advisor` CLI flag like `--sequential`.

## Open Questions / Risks

- `gate` audit data lives only in `dashboard-data.js` today — not persisted in `orchestrator-state.yml`; advisor audit may need a new `gate_history` field in state for resume consistency.
- `advisor_agent` references a not-yet-created `agents/advisor.md`; feasibility of separate model depends on platform (external gatherer scope).
- Unlike `html_output`, advisor mode does not skip features — it intercepts `AskUserQuestion`; routing/safety denylist is separate from the three config keys.
- Kiro `--no-interactive` headless defaults may conflict with advisor auto-answers unless explicitly coordinated.

---

## 1. `.maister/config.yml` Schema (Init Scaffold)

### Current State

The file is **optional** — absent in the maister repo itself. `/maister:init` scaffolds it in Phase 5 Step 2 when missing; existing files are never overwritten.

**Source**: `plugins/maister/skills/init/SKILL.md:120-130`

```yaml
# Maister project configuration.
# html_output — generate the operator dashboard (dashboard.html + dashboard-data.js,
# auto-opened in your browser) and the HTML companion reports (.html twins of spec,
# implementation plan, verification, and research/design outputs). Set to false for
# markdown-only runs. Markdown artifacts, their TL;DR summary blocks, and
# orchestrator-state.yml are produced regardless. Default: true.
html_output: true
```

**Documented contract** (`orchestrator-patterns.md` §4 "Project Configuration"):

| Key | Default | Effect |
|-----|---------|--------|
| `html_output` | `true` | When `false`, skip dashboard (§8) and HTML companions (§9). Markdown artifacts, TL;DR blocks, and `orchestrator-state.yml` still produced. |

**Read mechanism** (§5 Initialization step 4):

> Read `.maister/config.yml` if it exists; set `orchestrator.options.html_output` from its `html_output` key (default `true` when the file or key is absent). This single read seeds the state; all dashboard/companion gates below read `options.html_output` from state.

**Confidence**: High — direct code in init skill + orchestrator-patterns.md.

---

## 2. `orchestrator.options` Fields Across Task Types

### Shared Base (orchestrator-patterns.md §4)

All orchestrators inherit these common `orchestrator.options` fields:

```yaml
orchestrator:
  options:
    e2e_enabled: true | false | null
    user_docs_enabled: true | false | null
    code_review_enabled: true | false | null
    sequential: true | false | null   # CLI --sequential
    html_output: true | false         # Seeded from config.yml
```

**Source**: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:230-235`

### Per-Workflow Extensions

| Workflow | Additional `options` keys | Set by |
|----------|---------------------------|--------|
| **development** | `spec_audit_enabled`, `skip_test_suite`, `pragmatic_review_enabled`, `reality_check_enabled`, `production_check_enabled` | Defaults in SKILL.md schema; verification flags via Phase 10 gate |
| **research** | `brainstorming_enabled`, `design_enabled` | `--brainstorm`/`--no-brainstorm`, `--design`/`--no-design`, or Phase 2 gate |
| **migration** | `docs_enabled` | Migration-specific optional phase |
| **performance** | `spec_audit_enabled`, `skip_test_suite`, `pragmatic_review_enabled`, `reality_check_enabled`, `production_check_enabled` | Same verification pattern as development |
| **product-design** | *(none beyond shared)* | Uses `html_output` only in documented schema |

**Evidence — development** (`development/SKILL.md:555-565`):

```yaml
options:
  html_output: true
  spec_audit_enabled: true
  skip_test_suite: true
  e2e_enabled: null
  user_docs_enabled: null
  code_review_enabled: true
  pragmatic_review_enabled: true
  reality_check_enabled: true
  production_check_enabled: true
```

**Evidence — research** (`research/SKILL.md:417-420`):

```yaml
options:
  html_output: true
  brainstorming_enabled: null
  design_enabled: null
```

**Evidence — migration** (`migration/SKILL.md:345-347`):

```yaml
options:
  html_output: true
  docs_enabled: false
```

**Evidence — performance** (`performance/SKILL.md:381-388`):

```yaml
options:
  html_output: true
  spec_audit_enabled: null
  skip_test_suite: true
  code_review_enabled: true
  pragmatic_review_enabled: true
  reality_check_enabled: true
  production_check_enabled: null
```

**Live example — development task** (`.maister/tasks/development/2026-07-10-codex-native-support/orchestrator-state.yml:11-21`):

```yaml
options:
  html_output: true
  spec_audit_enabled: true
  skip_test_suite: true
  e2e_enabled: false
  user_docs_enabled: true
  code_review_enabled: false
  pragmatic_review_enabled: false
  reality_check_enabled: false
  production_check_enabled: false
  sequential: true
```

### Option Seeding Patterns (Taxonomy)

Three established patterns for how options enter state:

| Pattern | Example | config.yml | CLI flag | Runtime gate |
|---------|---------|------------|----------|--------------|
| **A — Project default** | `html_output` | ✅ seed at init | ❌ | read from state |
| **B — CLI override** | `sequential` | ❌ | `--sequential` | read from state |
| **C — Runtime decision** | `e2e_enabled`, `brainstorming_enabled` | ❌ | partial (`--e2e`, `--brainstorm`) | AskUserQuestion sets value |

Advisor keys should follow **Pattern A** (like `html_output`) with optional **Pattern B** (`--advisor` flag) for per-invocation override.

**Confidence**: High — multiple SKILL.md schemas + live state files confirm.

---

## 3. `dashboard-data.js` Gate Field Schema

### Normative Schema (orchestrator-patterns.md §8)

```js
phases: [{
  // ...
  gate: null   // {question, answer} after the exit gate fires
}]
```

**Source**: `orchestrator-patterns.md:467-478`

### Lifecycle

1. **Before gate fires** — rewrite dashboard with phase artifacts/summary/decisions/risks; status stays `in_progress`; `gate` may be null or pre-populated with `question` only.
2. **After gate decision** — record `{question, answer}`; then mark phase `completed` in state.

**Rewrite triggers** (§8): initialization, phase start, **before every exit gate**, after phase complete, after every gate decision, verification cycles, finalization.

### Dashboard Viewer Rendering

**Source**: `plugins/maister/skills/orchestrator-framework/assets/dashboard.html:485`

```javascript
(ph.gate ? '<div class="gate-line">Gate: ' + esc(ph.gate.question || "") +
  ' → <b>' + esc(ph.gate.answer || "") + '</b></div>' : "")
```

Only `question` and `answer` are displayed today. Additional fields would be ignored by the viewer unless `dashboard.html` is updated (plugin asset — not model-generated).

### Live Example

**Source**: `.maister/tasks/development/2026-07-09-on-demand-skills-user-documentation/dashboard-data.js:20`

```javascript
gate: { question: "Continue to Phase 5?", answer: "Yes" }
```

### State vs Dashboard Gap

`gate` objects are **not** persisted in `orchestrator-state.yml` — only projected into `dashboard-data.js`. Resume regenerates dashboard from `phase_summaries` + state; gate history may be lost on resume unless added to state.

`phase_summaries.[phase].decisions` can capture gate outcomes as `{decision, rationale}` but does not record who answered.

**Confidence**: High — schema documented; live examples confirm `{question, answer}` shape.

---

## 4. Proposed Advisor Extension Points (Following `html_output` Pattern)

### 4.1 `.maister/config.yml` — Project Defaults

Extend init scaffold (`init/SKILL.md` Step 2) with commented keys:

```yaml
# Maister project configuration.
html_output: true

# advisor_enabled — when true, phase-gate questions are first consulted by a
# dedicated advisor agent. The portable MVP shows the recommendation and keeps
# the normal user gate. Default: false (no advisor consultation).
advisor_enabled: false

# advisor_model — model slug for the advisor agent (e.g. a faster/cheaper model).
# null = use the advisor agent definition's default. Only applies when advisor_enabled.
advisor_model: null

# advisor_agent — name of the agent definition file (without .md) under
# plugins/maister/agents/. Default: advisor
advisor_agent: advisor
```

| Key | Default | Effect |
|-----|---------|--------|
| `advisor_enabled` | `false` | When `true`, orchestrator consults advisor at `→ Pause` gates and shows its recommendation; interactive user confirmation remains the portable default. |
| `advisor_model` | `null` | Model override for advisor Task invocation; `null` defers to agent frontmatter. |
| `advisor_agent` | `"advisor"` | Which agent definition to invoke (`agents/advisor.md`). |

### 4.2 `orchestrator.options` — Runtime Canonical Source

Add to `orchestrator-patterns.md` §4 common fields (applies to **all** orchestrators):

```yaml
orchestrator:
  options:
    html_output: true | false
    advisor_enabled: true | false      # Seeded from .maister/config.yml at init (default false)
    advisor_model: string | null       # Seeded from config.yml; overridable by --advisor-model
    advisor_agent: string              # Seeded from config.yml (default "advisor")
    # ... existing keys ...
```

**Initialization** (extend §5 step 4):

```text
Read .maister/config.yml if present; seed orchestrator.options.advisor_enabled,
advisor_model, advisor_agent (defaults: false, null, "advisor" when absent).
All gate routing reads options.advisor_* from state, not the file.
```

**CLI flag** (optional Pattern B, like `--sequential`):

```text
/maister:development "..." --advisor
/maister:research "..." --advisor --advisor-model=fast-model
```

Persisted as `orchestrator.options.advisor_enabled: true` (and model if passed).

### 4.3 Gate Interception Flow (Conceptual)

Mirrors `html_output` config-gate blocks in each orchestrator SKILL.md:

```markdown
> **Advisor consultation**: when `options.advisor_enabled` is true, at every `→ Pause`:
> 1. Present gate context (same as today — artifacts on dashboard)
> 2. Invoke advisor via Task tool (`options.advisor_agent`, `model: options.advisor_model`)
> 3. Validate and show advisor's recommendation
> 4. Invoke the normal user gate; do not assume a synthetic answer exists
> 5. Record recommendation and final user answer in dashboard/state
> 6. Proceed with state update only after the gate response
> When false: existing AskUserQuestion path (unchanged).
```

Unlike `html_output`, advisor does **not** skip dashboard or companions — operator still monitors via dashboard; gate line shows advisor recommendation and final answer separately.

### 4.4 `dashboard-data.js` Gate Schema Extension

Extend `phases[].gate` (backward compatible — viewer ignores unknown fields until updated):

```js
gate: {
  question: "Continue to Phase 5?",
  answer: "Yes",                        // final chosen option (existing)
  answered_by: "user",                  // final responder in recommendation-only mode
  advisor_model: "claude-sonnet-4-...", // when answered_by=advisor (new)
  advisor_agent: "advisor",             // agent definition used (new)
  advisor_rationale: "...",             // optional 1-line audit (new)
  user_override: false                  // true if user corrected advisor recommendation (new)
}
```

**Dashboard viewer update** (plugin asset): extend gate-line to show advisor badge when `answered_by === "advisor"`:

```text
Gate: Continue to Phase 5? → Yes (advisor: sonnet)
```

### 4.5 `orchestrator-state.yml` Persistence (Recommended)

To survive resume, add optional shared field:

```yaml
orchestrator:
  gate_history: []   # append-only audit log
  # Each entry:
  # - phase_id: phase-2
  # - question: "..."
  # - answer: "..."
  # - answered_by: user | advisor
  # - advisor_model: null
  # - timestamp: ISO 8601
```

Alternatively extend `phase_summaries.[phase]` with a `gate` sub-object mirroring dashboard shape — keeps per-phase locality.

### 4.6 Documentation Touchpoints

| File | Change |
|------|--------|
| `plugins/maister/skills/init/SKILL.md` | Extend config scaffold (Step 2) |
| `orchestrator-patterns.md` §4 | Add keys table + seed mechanism |
| `orchestrator-patterns.md` §2 | Advisor interception at `→ Pause` |
| `orchestrator-patterns.md` §8 | Extend gate schema |
| `plugins/maister/CLAUDE.md` | Document config keys (like `html_output` section) |
| Each orchestrator `SKILL.md` | Add "Advisor gate" block (parallel to "Config gate" for html_output) |
| `plugins/maister/agents/advisor.md` | New agent definition (separate workstream) |

---

## 5. Comparison: `html_output` vs Proposed Advisor Keys

| Aspect | `html_output` | `advisor_enabled` / `advisor_model` / `advisor_agent` |
|--------|---------------|------------------------------------------------------|
| config.yml | ✅ single key | ✅ three keys |
| Seed to `orchestrator.options` at init | ✅ once | ✅ once (proposed) |
| Runtime reads file or state? | state only | state only (proposed) |
| CLI flag | ❌ | ✅ `--advisor` (proposed) |
| Affects dashboard | disables it | no — enhances gate audit |
| Default | `true` | `false` (backward compat) |
| Per-workflow options differ | same everywhere | same everywhere (shared key) |
| SKILL.md "Config gate" block | ✅ all 5 orchestrators | needs parallel "Advisor gate" block |

---

## 6. Related State Surfaces (Not `options`, But Relevant)

### `phase_summaries` entry shape (§4)

```yaml
phase_summaries:
  [phase_name]:
    summary: null
    decisions: []    # [{decision, rationale}] — gate outcomes can land here
    risks: []
    artifacts: []
```

Gate decisions already flow into `decisions` informally; advisor audit should **also** populate structured `gate` for dashboard fidelity.

### Domain-specific `phase_summaries` nesting

- Development: `task_context.phase_summaries.*`
- Research: `research_context.phase_summaries.*`
- Performance: `performance_context.phase_summaries.*`

Advisor options live at `orchestrator.options` (orchestrator level) — **not** nested in domain context — matching `html_output` placement.

---

## Sources Investigated

| Source | Path | Relevance |
|--------|------|-----------|
| Init config scaffold | `plugins/maister/skills/init/SKILL.md:120-130` | config.yml schema |
| State schema §4 | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:188-318` | options fields, seeding |
| Dashboard schema §8 | same file `:431-497` | gate field |
| Initialization §5 | same file `:322-334` | config read step |
| Development options | `plugins/maister/skills/development/SKILL.md:555-565` | richest options set |
| Research options | `plugins/maister/skills/research/SKILL.md:417-420` | workflow-specific keys |
| Migration options | `plugins/maister/skills/migration/SKILL.md:345-347` | workflow-specific keys |
| Performance options | `plugins/maister/skills/performance/SKILL.md:381-388` | workflow-specific keys |
| Dashboard viewer | `plugins/maister/skills/orchestrator-framework/assets/dashboard.html:485` | gate rendering |
| Live gate example | `.maister/tasks/development/2026-07-09-on-demand-skills-user-documentation/dashboard-data.js` | `{question, answer}` |
| Live state example | `.maister/tasks/development/2026-07-10-codex-native-support/orchestrator-state.yml` | options in practice |
| Research task state | `.maister/tasks/research/2026-07-11-advisor-mode-option/orchestrator-state.yml` | current research options |

**Sources count**: 12 files investigated.
**Findings documented**: 6 major findings + 1 proposed schema.
**Overall confidence**: High for existing schema; Medium for proposed advisor schema (inferred from `html_output` precedent).
