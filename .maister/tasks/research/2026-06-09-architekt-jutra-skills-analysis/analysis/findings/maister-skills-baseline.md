# Maister Skills Baseline — Gatherer Findings (maister-codebase)

**Category:** `maister-codebase`  
**Gatherer:** information-gatherer  
**Date:** 2026-06-09  
**Sources:** `plugins/maister/skills/` (18 SKILL.md), `plugins/maister/commands/` (8 commands), `plugins/maister/agents/`, `plugins/maister/CLAUDE.md`

---

## Executive Summary

Maister ships **18 skills** under `plugins/maister/skills/`, classified into **6 workflow orchestrators**, **4 internal engines**, **2 reference/utility engines**, **3 on-demand utilities**, **2 on-demand review rubrics**, and **1 composite review orchestrator**. Adoption-reference patterns for AJ skills are **`grill-me`** (auto-discovered, minimal prompt-as-skill, no state) and **`thermos`** (explicit-only via `disable-model-invocation`, parallel subagent delegation + synthesis). Review coverage splits three ways: **thermo-nuclear-*** (diff-scoped harsh branch audit), **`reviews-*` commands** (agent-direct, no skill wrapper), and **`implementation-verifier`** (task-scoped post-implementation bundle, internal only). Maister has **no dedicated domain-modeling, requirements-critique, or lightweight research-gatherer** skills — primary complement gaps for AJ adoption.

---

## 1. Full Skill Inventory (18 skills)

Verified via Glob: `plugins/maister/skills/**/SKILL.md` → **18 files**, **5,235 total lines**.

| # | Directory | Frontmatter `name` | Lines | Role | `user-invocable` | `disable-model-invocation` | Command wrapper |
|---|-----------|-------------------|-------|------|------------------|---------------------------|-----------------|
| 1 | `init/` | `maister:init` | 186 | **Orchestrator** (setup) | (default) | — | Skill only (`/maister:init` in CLAUDE.md) |
| 2 | `development/` | `maister:development` | 746 | **Workflow orchestrator** | `true` | — | Skill only |
| 3 | `research/` | `maister:research` | 489 | **Workflow orchestrator** | `true` | — | Skill only |
| 4 | `product-design/` | `maister:product-design` | 834 | **Workflow orchestrator** | `true` | — | Skill only |
| 5 | `performance/` | `maister:performance` | 417 | **Workflow orchestrator** | `true` | — | Skill only |
| 6 | `migration/` | `maister:migration` | 383 | **Workflow orchestrator** | `true` | — | Skill only |
| 7 | `quick-bugfix/` | `maister:quick-bugfix` | 230 | **On-demand utility** | (default) | — | Documented in CLAUDE.md; **no `commands/*.md` file** |
| 8 | `grill-me/` | `grill-me` | 11 | **On-demand utility** | (default) | — | None — skill auto-discovery |
| 9 | `thermos/` | `thermos` | 21 | **On-demand composite** | (default) | **`true`** | None — explicit invocation |
| 10 | `thermo-nuclear-review/` | `thermo-nuclear-review` | 50 | **On-demand review rubric** | (default) | **`true`** | None |
| 11 | `thermo-nuclear-code-quality-review/` | `thermo-nuclear-code-quality-review` | 192 | **On-demand review rubric** | (default) | **`true`** | None |
| 12 | `standards-update/` | `maister:standards-update` | 151 | **On-demand utility** | (default) | — | Skill only |
| 13 | `standards-discover/` | `maister:standards-discover` | 234 | **On-demand utility** | (default) | — | Skill only |
| 14 | `codebase-analyzer/` | `codebase-analyzer` | 162 | **Internal engine** | `false` | — | Invoked by orchestrators via Skill tool |
| 15 | `docs-manager/` | `docs-manager` | 360 | **Internal engine** | `false` | — | Via `docs-operator` agent only |
| 16 | `implementation-plan-executor/` | `implementation-plan-executor` | 403 | **Internal engine** | `false` | — | Invoked by development orchestrator |
| 17 | `implementation-verifier/` | `implementation-verifier` | 302 | **Internal verification orchestrator** | `false` | — | Invoked by development/performance/migration |
| 18 | `orchestrator-framework/` | `orchestrator-framework` | 64 | **Reference (non-executable)** | `false` | — | N/A |

### Role taxonomy (validated)

| Role | Count | Skills | Invocation pattern |
|------|-------|--------|-------------------|
| **Workflow orchestrator** | 6 | init, development, research, product-design, performance, migration | Task directory + `orchestrator-state.yml`; phases with gates; Skill tool entry |
| **Internal engine** | 4 | codebase-analyzer, docs-manager, implementation-plan-executor, implementation-verifier | `user-invocable: false`; parent orchestrator invokes via Skill tool |
| **On-demand utility** | 4 | quick-bugfix, grill-me, standards-update, standards-discover | No task directory (except standards write to `.maister/docs/`); user-facing |
| **On-demand review** | 3 | thermo-nuclear-review, thermo-nuclear-code-quality-review, thermos | Explicit-only (`disable-model-invocation` on all three); diff/branch scoped |
| **Reference** | 1 | orchestrator-framework | Read by orchestrators at init; not executable |

### Naming convention split

| Pattern | Examples | Notes |
|---------|----------|-------|
| `maister:` prefix | `maister:development`, `maister:research`, `maister:quick-bugfix` | Primary workflow and plugin-branded utilities |
| Plain kebab-case | `grill-me`, `thermos`, `thermo-nuclear-*`, `codebase-analyzer`, `implementation-verifier` | On-demand tools, internal engines, review rubrics |

---

## 2. Deep Analysis: `grill-me` and `thermos` Patterns

### 2.1 `grill-me` — Interactive stress-test (auto-discovery)

**Path:** `plugins/maister/skills/grill-me/SKILL.md` (11 lines)

| Aspect | Detail |
|--------|--------|
| **Invocation** | No `disable-model-invocation` → eligible for **model auto-discovery** via description keywords ("grill me", "stress-test a plan") |
| **Frontmatter** | `name: grill-me` (no `maister:` prefix); `argument-hint: "[plan or topic]"` |
| **Body structure** | Entire workflow **is the prompt** — no phases, no subagents, no delegation |
| **State** | None — no task directory, no `orchestrator-state.yml` |
| **Interactivity** | "Ask the questions **one at a time**"; codebase exploration allowed when answerable from code |
| **Subagents** | None |
| **Command** | **No thin command** — relies on skill discovery or explicit user mention |

**Adoption template traits for AJ skills:**
- Minimal SKILL.md (<20 lines acceptable for simple interactive utilities)
- Description drives discovery; trigger phrases in description
- No orchestrator coupling
- Suitable for: requirements-critic, problem-classifier, metaprogram-classifier (interactive critique/classification)

### 2.2 `thermos` — Composite parallel review (explicit-only)

**Path:** `plugins/maister/skills/thermos/SKILL.md` (21 lines)

| Aspect | Detail |
|--------|--------|
| **Invocation guard** | `disable-model-invocation: true` — **never auto-invoked**; user must explicitly request "thermos" / "double thermo review" |
| **Parent responsibilities** | (1) Determine scope, (2) gather diff + file context, (3) launch subagents, (5) synthesize |
| **Subagent delegation** | Single message, **`run_in_background: true`**, parallel Task calls: |
| | • `subagent_type: "maister:thermo-nuclear-review-subagent"` |
| | • `subagent_type: "maister:thermo-nuclear-code-quality-review-subagent"` |
| **Synthesis** | Deduplicate findings; weight overlaps; brief summaries; avoid restating full subagent output if already visible |
| **State** | None — ephemeral branch review |

### 2.3 Thermo-nuclear rubric skills + subagent host pattern

Individual thermo skills are **rubrics**, not orchestrators:

| Skill | Lines | Purpose | Subagent |
|-------|-------|---------|----------|
| `thermo-nuclear-review` | 50 | Security, correctness, breaking changes, devex, feature-flag leaks on **diff only** | `thermo-nuclear-review-subagent` |
| `thermo-nuclear-code-quality-review` | 192 | Maintainability, 1k-line rule, spaghetti, code-judo | `thermo-nuclear-code-quality-review-subagent` |

**Subagent ↔ skill binding** (`agents/thermo-nuclear-review-subagent.md`):
```yaml
skills:
  - thermo-nuclear-review
```
Subagent loads SKILL.md as **complete rubric**. Parent typically gathers diff via parallel `shell` + `explore` Task calls before invoking subagent with labeled `### Git / diff output` and `### Changed file contents` sections.

**All three** (`thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`) set `disable-model-invocation: true`.

**Invocation paths:**
1. User → `thermos` skill → parent gathers context → 2 parallel subagents → synthesis
2. User → individual thermo skill name → parent/agent follows rubric (often via subagent)
3. No `commands/reviews-thermo*.md` — unlike other reviews

---

## 3. Existing Review Skills & Commands

### 3.1 Review surface map

| Mechanism | Type | Scope | When used | Output location |
|-----------|------|-------|-----------|-----------------|
| `thermo-nuclear-review` + subagent | Skill + agent | Branch diff | Pre-merge harsh audit | Inline response |
| `thermo-nuclear-code-quality-review` + subagent | Skill + agent | Branch diff | Maintainability audit | Inline response |
| `thermos` | Composite skill | Branch diff | Both audits in parallel | Synthesized inline |
| `implementation-verifier` | Internal skill | Task directory | Post-implementation, pre-commit | `verification/*.md` |
| `reviews-code` command | Agent-direct | Path/scope | Standalone code review | `[path]/code-review-report.md` |
| `reviews-pragmatic` command | Agent-direct | Path | Over-engineering check | `pragmatic-review.md` |
| `reviews-spec-audit` command | Agent-direct | Spec path | Spec completeness | Spec audit report |
| `reviews-reality-check` command | Agent-direct | Task path | Problem-solution fit | Reality check report |
| `reviews-production-readiness` command | Agent-direct | Path | Deployment GO/NO-GO | Production readiness report |

### 3.2 `implementation-verifier` — Internal verification bundle

**Path:** `plugins/maister/skills/implementation-verifier/SKILL.md`  
**Role:** Read-only QA orchestrator (`user-invocable: false`)

**Subagents delegated (sequential then parallel):**
1. **Step 3a (sequential):** `maister:test-suite-runner` — avoids parallel test conflicts
2. **Step 3b (parallel, up to 5):**
   - `maister:implementation-completeness-checker` (always)
   - `maister:code-reviewer` (optional)
   - `maister:code-quality-pragmatist` (optional)
   - `maister:production-readiness-checker` (optional)
   - `maister:reality-assessor` (optional)

**Modes:**
- **Orchestrator mode:** reads options from `orchestrator-state.yml`; no re-prompting
- **Standalone mode:** AskUserQuestion for each optional review

**Key difference from thermo pattern:** Task-scoped (requires `implementation-plan.md`, `spec.md`, `work-log.md`); compiles structured YAML for orchestrator fix decisions; not branch-diff-focused.

### 3.3 Commands → skills/agents mapping

**Verified:** 8 command files in `plugins/maister/commands/` — **flat layout**, no subdirectories.

| Command file | Delegates to | Skill involved? |
|--------------|--------------|-----------------|
| `work.md` | `task-classifier` agent → orchestrator **skills** via Skill tool | Routes to `maister:development`, `maister:research`, etc. |
| `quick-plan.md` | `EnterPlanMode` + INDEX.md standards discovery | **No skill** — uses built-in plan mode |
| `quick-dev.md` | Direct implementation + standards | **No skill** |
| `reviews-code.md` | `maister:code-reviewer` agent | **No skill** |
| `reviews-pragmatic.md` | `maister:code-quality-pragmatist` agent | **No skill** |
| `reviews-spec-audit.md` | `maister:spec-auditor` agent | **No skill** |
| `reviews-reality-check.md` | `maister:reality-assessor` agent | **No skill** |
| `reviews-production-readiness.md` | `maister:production-readiness-checker` agent | **No skill** |

**Skills documented as commands in CLAUDE.md but lacking `commands/*.md`:**
- `/maister:init`, `/maister:standards-*`, `/maister:development`, `/maister:research`, `/maister:product-design`, `/maister:performance`, `/maister:migration`, `/maister:quick-bugfix`

**Skills with no command and no auto-discovery guard:**
- `grill-me` — auto-discovery only
- `thermos`, `thermo-nuclear-*` — explicit-only (`disable-model-invocation`)

---

## 4. Maister `research` vs AJ `research-gatherer`

### 4.1 Maister `maister:research` (full orchestrator)

**Path:** `plugins/maister/skills/research/SKILL.md` (489 lines)

| Dimension | Maister `maister:research` |
|-----------|---------------------------|
| **Phases** | 6 (foundation → optional brainstorm → optional design → summary) |
| **State** | Full `orchestrator-state.yml` under `.maister/tasks/research/` |
| **Phase 1 pipeline** | Direct init → `research-planner` → N × `information-gatherer` (parallel) → `research-synthesizer` |
| **Gatherer agent** | `maister:information-gatherer` (`agents/information-gatherer.md`, 650 lines) |
| **Synthesis** | **Yes** — `research-synthesizer` produces `analysis/synthesis.md` + `outputs/research-report.md` |
| **Optional downstream** | `solution-brainstormer`, `solution-designer` |
| **References** | `references/research-methodologies.md`, `brainstorming-techniques.md`, `design-techniques.md` |
| **Gates** | Mandatory `AskUserQuestion` at phase boundaries |

**Information-gatherer contract (Maister):**
- Writes to `analysis/findings/[prefix]-*.md`
- Filters `planning/sources.md` to assigned category
- Custom categories from research-planner gathering strategy (cap 8 parallel)
- Does **not** produce `00-summary.md`, `98-rejected.md`, `99-verification.md` when run per-category (orchestrator/synthesizer handles merge)

### 4.2 AJ `research-gatherer` (lightweight, external repo)

**Path:** `/Users/mrapacz/Projects/architekt-jutra-code/week7/3-research-gatherer-demo/research-gatherer-standalone/skills/research-gatherer/SKILL.md`

| Dimension | AJ `research-gatherer` |
|-----------|------------------------|
| **Phases** | 3 only (init → plan+gather → merge+verify) |
| **State** | `orchestrator-state.yml` but `workflow_type: research-gather` |
| **Stops before** | Synthesis report, brainstorming, architecture design |
| **Gatherer agent** | `information-gatherer-lite` (**not present in Maister**) |
| **Phase 3 (Direct)** | Produces `00-summary.md`, `98-rejected.md`, `99-verification.md`, `97-actor-map.md` |
| **Unique features** | Declarative conclusion tagging, actor-tailored views, rejection consolidation with re-include criteria, `--yolo` mode |
| **Command** | `/research-gather [question] [--yolo] [--type=TYPE]` |

### 4.3 Overlap / gap summary

| Capability | Maister | AJ research-gatherer |
|------------|---------|---------------------|
| Multi-source parallel gather | ✅ Phase 1 Step 3 | ✅ Phase 2 Step B |
| research-planner delegation | ✅ | ✅ |
| Polished research report | ✅ research-synthesizer | ❌ Stops at raw findings + verification |
| Cross-source verification doc | Partial (in synthesizer) | ✅ Dedicated `99-verification.md` |
| Actor/stakeholder tailoring | ❌ | ✅ `97-actor-map.md` |
| Declarative conclusion handling | ❌ | ✅ Transcript-aware tagging |
| Rejected-info audit trail | ❌ | ✅ `98-rejected.md` |
| Lightweight / no synthesis | ❌ Full orchestrator only | ✅ Core purpose |

**Preliminary fit (H confidence):** AJ `research-gatherer` is **complement, not duplicate** — Maister lacks a lightweight gather-only path. Adoption would mean either new top-level skill or optional `--gather-only` flag on `maister:research` (larger change).

---

## 5. Internal Engine & Orchestrator Delegation Graph

```
User-facing orchestrators
├── maister:development ──┬── codebase-analyzer (Skill)
│                         ├── implementation-plan-executor (Skill)
│                         └── implementation-verifier (Skill)
├── maister:research ─────┬── research-planner (Task)
│                         ├── information-gatherer × N (Task)
│                         └── research-synthesizer (Task)
├── maister:product-design ── codebase-analyzer, information-gatherer, solution-brainstormer, ui-mockup-generator
├── maister:performance ──── codebase-analyzer, bottleneck-analyzer, specification-creator, implementation-planner, implementation-verifier
├── maister:migration ────── codebase-analyzer, gap-analyzer, specification-creator, implementation-planner, implementation-verifier
└── maister:init ─────────── project-analyzer (Task), docs-operator → docs-manager, standards-discover (Skill)

On-demand (no orchestrator state)
├── grill-me ────────────── inline Q&A only
├── thermos ─────────────── thermo-nuclear-*-subagent × 2 (Task, background)
├── quick-bugfix ────────── inline TDD, escalates to maister:development
└── standards-* ─────────── docs-operator → docs-manager
```

**Delegation rule** (from `orchestrator-framework/references/orchestrator-patterns.md`): Skills that spawn subagents (`codebase-analyzer`, `implementation-plan-executor`, `implementation-verifier`) **must** be invoked via **Skill tool** in main agent context — subagents cannot nest subagents.

---

## 6. Gap Areas — Where AJ Skills Could Complement Maister

| Maister gap | AJ candidate skills | Maister nearest equivalent | Complement vs overlap |
|-------------|--------------------|-----------------------------|----------------------|
| **Requirements critique / stress-test** | `requirements-critic`, `transcript-critic` | `grill-me` (generic); development requirements phase (collect, not critique) | **Complement** — domain-specific critique with invocation guards |
| **Domain modeling / DDD** | `problem-classifier`, `aggregate-designer`, `context-distiller`, `archetype-scanner`, archetype mappers | None | **Complement** — entirely new capability cluster |
| **Linguistic / bounded-context verification** | `linguistic-boundary-verifier` | None | **Complement** |
| **Test strategy vs problem class** | `test-strategy-reviewer` | `reviews-code`, implementation-verifier test analysis | **Partial overlap** — AJ aligns tests to problem class |
| **Lightweight research gather** | `research-gatherer` | `maister:research` Phase 1 only (subset) | **Complement** — Maister always pushes toward synthesis |
| **Communication / NLP metaprograms** | `metaprogram-classifier` | None | **Complement** — novel for SDLC plugin |
| **Platform-specific KG** | `aj-kg-query` | None (Playwright MCP only) | **Not recommended** per brief |
| **Incident / ATIF review** | `incident-diagnosis-review` | None | **Low fit** — evaluator-specific |

### Adoptable skill pattern recommendations (preliminary)

| AJ skill type | Recommended Maister pattern | Rationale |
|---------------|----------------------------|-----------|
| Interactive critique (requirements-critic) | **`grill-me` pattern** + optional `disable-model-invocation` if "explicit only" | Minimal SKILL.md; no state; one question at a time |
| Parallel multi-perspective review | **`thermos` pattern** | If skill needs 2+ specialized subagents |
| Single-purpose read-only audit | **Agent + optional thin command** (like `reviews-code`) OR skill rubric + subagent (like thermo) | Maister already uses both; commands for discoverability |
| Domain modeling wizards | **`grill-me` + references/** | Multi-step interactive; may need `references/` for registries |
| Lightweight research | **New skill** mirroring AJ 3-phase gatherer | Fills genuine gap; could reuse `information-gatherer` agent |

### Command surface gaps for adoption

Current command categories:
- `commands/reviews-*.md` — 5 review commands (agent-direct)
- `commands/quick-*.md` — 2 planning/dev shortcuts (no skill)
- `commands/work.md` — router

**No existing command category for:**
- Domain modeling (`commands/modeling-*` — would break flat layout unless new naming convention approved)
- Critique utilities (`commands/quick-critique-*` or skill-only like grill-me)
- Research gather-only (`commands/quick-research-gather` or similar)

Per research plan hypothesis: high-priority AJ skills likely need **new thin commands** OR skill-only discovery like `grill-me`.

---

## 7. References & `references/` Usage

Skills with supporting `references/` directories (28 files total):

| Skill | Reference files | Purpose |
|-------|----------------|---------|
| `research` | 3 | Methodologies, brainstorming, design |
| `product-design` | 3 | Visual companion, interaction patterns, characteristic detection |
| `codebase-analyzer` | 6 | File discovery, pattern mining, context |
| `standards-discover` | 5 | Subagent prompts, aggregation |
| `orchestrator-framework` | 2 | Patterns, creation checklist |
| `migration` | 2 | Migration types/strategies |
| `performance` | 1 | Optimization guide |
| `init` | 4 | Doc templates |
| `docs-manager` | 2 | INDEX/CLAUDE templates |

**On-demand utilities** (`grill-me`, `thermos`, `thermo-nuclear-*`, `quick-bugfix`) have **no `references/`** — rubric lives entirely in SKILL.md.

---

## 8. Gaps & Open Questions

| # | Question | Confidence | Notes |
|---|----------|------------|-------|
| 1 | Should adopted AJ critique skills use `disable-model-invocation: true` (AJ `requirements-critic` style) or auto-discovery (`grill-me` style)? | **M** | AJ uses explicit-only guards; Maister grill-me does not |
| 2 | Is `quick-bugfix` intentionally skill-only without `commands/quick-bugfix.md`? | **H** | CLAUDE.md documents command; file missing — possible doc drift |
| 3 | Can AJ `research-gatherer` reuse Maister `information-gatherer` or needs `information-gatherer-lite`? | **M** | AJ references lite variant with declarative-conclusion extensions |
| 4 | Should thermo-style review hosts get `commands/reviews-thermo.md` for discoverability? | **L** | Currently skill-name invocation only |
| 5 | Flat command layout vs new category prefix for modeling skills? | **M** | Standards in plugin-development.md — comparative gatherer should resolve |

---

## 9. Preliminary Recommendations (for comparative gatherer)

1. **Primary adoption target pattern:** On-demand utilities matching `grill-me` / explicit-only critique — **not** new orchestrators.
2. **Domain modeling cluster:** Genuine Maister gap; adopt as standalone skills with `references/` for registries; start with `problem-classifier` + `requirements-critic` (generic SDLC value).
3. **research-gatherer:** Recommend **adapt** into Maister as lightweight skill reusing `information-gatherer` + direct merge phase; port declarative-conclusion and actor-map features selectively.
4. **test-strategy-reviewer:** Medium priority — partial overlap with verification stack; differentiate by problem-class alignment.
5. **Do not adopt:** `aj-kg-query`, `incident-diagnosis-review` (per brief exclusions).
6. **Integration convention:** New on-demand skills → kebab-case dir under `plugins/maister/skills/`; optional thin command; never edit generated variants (`maister-cursor/`, etc.).

---

## 10. Source Citations

| Artifact | Path |
|----------|------|
| Skill inventory | `plugins/maister/skills/**/SKILL.md` |
| Adoption reference: grill-me | `plugins/maister/skills/grill-me/SKILL.md` |
| Adoption reference: thermos | `plugins/maister/skills/thermos/SKILL.md` |
| Thermo rubrics | `plugins/maister/skills/thermo-nuclear-review/SKILL.md`, `thermo-nuclear-code-quality-review/SKILL.md` |
| Thermo subagents | `plugins/maister/agents/thermo-nuclear-review-subagent.md`, `thermo-nuclear-code-quality-review-subagent.md` |
| Verification orchestrator | `plugins/maister/skills/implementation-verifier/SKILL.md` |
| Research orchestrator | `plugins/maister/skills/research/SKILL.md` |
| Information gatherer agent | `plugins/maister/agents/information-gatherer.md` |
| Commands | `plugins/maister/commands/*.md` (8 files) |
| Plugin inventory table | `plugins/maister/CLAUDE.md` § Available Skills, Available Commands |
| AJ research-gatherer (comparison) | `/Users/mrapacz/Projects/architekt-jutra-code/week7/3-research-gatherer-demo/research-gatherer-standalone/skills/research-gatherer/SKILL.md` |
| Research plan (this task) | `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/planning/research-plan.md` |
