# Codebase Findings: Agent Config & Model Parameters

## TL;DR

There are 26 agents in `plugins/maister/agents/`: 23 explicitly use **`model: inherit`**, while 3 companion/skill-preload agents omit `model`. The Cursor-specific `platforms/cursor/agents/explore.md` makes 27 agents in the wider inventory. **No agent pins a non-inherit model today** — there is zero in-repo precedent for `model: sonnet`, `model: opus`, etc. Platform builds treat `inherit` differently: **Cursor** keeps `model: inherit` in `.md` agents and documents Task-tool `model` as an optional runtime override; **Kiro** strips `inherit` from generated JSON and only emits `model` when frontmatter is a concrete slug (validate **Rule 30** forbids `"model": "inherit"` in output). **No `advisor` agent exists**; closest patterns are non-interactive review agents (`spec-auditor`, `reality-assessor`) and interactive **skills** (`requirements-critic`, `grill-me`) run by the main agent. Advisor mode would require a **new agent** with non-inherit `model:` plus orchestrator-level Task invocation with gate context — subagents currently lack `AskUserQuestion` access and no skill passes Task `model` today.

## Open Questions / Risks

- **Cursor Task `model` allowlist**: In-repo policy (`maister-no-fast-models.mdc`) documents omitting `model` to inherit parent; whether arbitrary advisor model slugs work on Task tool is **not verified in codebase** — only `composer-2.5-fast` appears in Cursor system agent docs as an explicit slug example.
- **`task-classifier` exception**: Only agent body instructs `AskUserQuestion` for user confirmation — likely incompatible with subagent tool availability on Cursor/Kiro; advisor agent must not copy this pattern.
- **Kiro headless**: Agents transformed to JSON with no `model` key rely on Kiro host default — a pinned advisor model in SOT frontmatter is the supported Kiro path (`generate-agent-json.sh` lines 134–135).
- **Codex**: Plugin manifest does not pin models; advisor model set in project `.codex/agents/advisor.toml` (init bootstrap from template). Native subagent supports separate agent thread and `model` in TOML.
- **Greenfield**: No `advisor_mode` / `advisor_model` config keys exist anywhere in agents or hooks.

---

## 1. Agent Frontmatter Inventory

**Source**: `plugins/maister/agents/*.md` (26 files), plus `platforms/cursor/agents/explore.md` for the cross-platform inventory

### 1.1 Documented schema

From `.maister/docs/standards/global/plugin-development.md`:

```yaml
---
name: code-reviewer
description: Reviews code for quality and standards compliance
model: inherit
color: blue
---
```

Fields: `name`, `description`, `model` (typically `inherit`), `color`. No `tools:` field in SOT agents.

### 1.2 `model:` distribution

| Pattern | Count | Agents |
|---------|-------|--------|
| `model: inherit` | 23 in SOT (24 including Cursor `explore`) | Standard workflow/review agents |
| No `model` (uses `skills:` instead) | 3 | `docs-operator`, `thermo-nuclear-review-subagent`, `thermo-nuclear-code-quality-review-subagent` |
| Non-inherit `model:` | **0** | — |

**Evidence** — universal inherit example (`plugins/maister/agents/information-gatherer.md:1-6`):

```yaml
---
name: information-gatherer
description: Information gathering specialist...
model: inherit
color: green
---
```

**Evidence** — companion agent without `model` (`plugins/maister/agents/docs-operator.md:1-6`):

```yaml
---
name: docs-operator
description: Internal documentation management service...
skills:
  - docs-manager
---
```

### 1.3 `color:` field

22 agents include `color:` (blue, green, orange, purple, cyan, red, pink, yellow). Thermo-nuclear subagents and `docs-operator` omit `color`. Color is Claude Code UI metadata; not referenced in platform build scripts.

### 1.4 `skills:` preload (companion pattern)

Three agents preload skills via frontmatter instead of `model:`:

| Agent | Preloaded skill | Purpose |
|-------|-----------------|---------|
| `docs-operator` | `docs-manager` | File ops mid-workflow |
| `thermo-nuclear-review-subagent` | `thermo-nuclear-review` | Diff-scoped audit rubric |
| `thermo-nuclear-code-quality-review-subagent` | `thermo-nuclear-code-quality-review` | Maintainability audit rubric |

Documented constraint (`plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`): companion pattern works only for skills that **do not spawn subagents**.

### 1.5 No `tools:` in SOT frontmatter

Per-agent tool allowlists exist only in **Kiro** transform config (`platforms/kiro-cli/agent-tools.json`), not in source `.md` files. Kiro maps 24 agents + synthetic `maister` orchestrator and `maister-explore`.

---

## 2. How `model: inherit` Works

### 2.1 Semantic intent (Claude Code / Cursor)

`model: inherit` means the subagent runs on the **same model as the parent session** unless overridden at invocation time.

**Cursor explicit policy** (`platforms/cursor/rules/maister-no-fast-models.mdc:15-16`):

> Prefer omitting `model` so subagents inherit the parent session model.

**Cursor explore rationale** (`platforms/cursor/agents/explore.md:3-4`):

> Prefer over built-in explore so the subagent inherits the parent session model.

### 2.2 Claude Code source agents

All SOT agents keep `model: inherit` verbatim. Claude Code plugin agent definitions pass frontmatter through without model stripping (agents remain `.md` in `plugins/maister/agents/`).

### 2.3 Cursor build transform

`platforms/cursor/build.sh`:

- Copies agents from SOT; **does not strip or rewrite `model: inherit`**
- Step 11b: prefixes `name:` with `maister-` for Task `subagent_type` alignment
- Step 11c: injects `readonly: true` after `model: inherit` for read-only agents
- Adds platform-only `platforms/cursor/agents/explore.md` → `maister-explore` with `model: inherit` + `readonly: true`
- Copies `maister-no-fast-models.mdc` (always-applied rule on Task `model` param)

Generated output example: `plugins/maister-cursor/agents/information-gatherer.md` retains `model: inherit`.

**No validate-cursor rule** checks model values — Cursor variant accepts `inherit` in agent `.md` indefinitely.

### 2.4 Kiro build transform

`platforms/kiro-cli/generate-agent-json.sh` converts `.md` → `.json`:

```bash
# lines 134-135
+ (if ($model | length) > 0 and $model != "inherit" then {model: $model} else {} end)
```

| Frontmatter `model` | Generated JSON |
|---------------------|----------------|
| `inherit` or absent | **No `model` key** (host default) |
| e.g. `claude-sonnet-4-20250514` | `"model": "claude-sonnet-4-20250514"` |

**Validate Rule 30** (`Makefile:217-220`):

```
Rule 30: no agents/*.json model inherit...
jq -e '.model == "inherit"' → FAIL
```

Kiro smoke tests also assert no `"model": "inherit"` in agent JSON (`platforms/kiro-cli/tests/smoke.test.sh:104-113`).

### 2.5 Codex build

`platforms/codex-cli/build.sh:313` (README section):

> Models are selected by the Codex host/session; the plugin does not pin models.

Plugin output has no root `agents/` directory (`smoke-cli.sh` enforces MVP policy). Advisor model is configured in **project-scoped** `.codex/agents/advisor.toml` — scaffolded at init from `platforms/codex-cli/templates/advisor.toml` (proposed). Codex custom agent TOML supports `model`, `model_reasoning_effort`, `sandbox_mode` per [Codex subagents docs](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents).

### 2.6 Copilot CLI

`platforms/copilot-cli/build.sh` performs prefix/sed transforms on skills; **no agent `model` transform logic** found. Agents ship as copied `.md` from SOT (same as Claude Code pattern).

---

## 3. Task Tool Invocation & `model` Parameter

### 3.1 Orchestrator delegation pattern

**Normative rule** (`orchestrator-patterns.md`):

- Skills → Skill tool (`/maister-*`)
- Agents → Task tool (`subagent_type`)

**Current invocations** (representative, all omit `model`):

```
Task tool with subagent_type: maister:research-planner
Task tool - maister:information-gatherer subagent
Task tool with subagent_type: maister-task-group-implementer
```

**Grep result**: Zero occurrences in `plugins/maister/skills/` of Task invocations passing an explicit `model` parameter.

### 3.2 Cursor Task `model` parameter (runtime, not SOT)

Documented in Cursor platform rule and workflow template:

| Source | Guidance |
|--------|----------|
| `maister-workflows-template.mdc:55` | Omit Task `model` to inherit; see `maister-no-fast-models.mdc` |
| `maister-no-fast-models.mdc` | Never auto-pick `*-fast`; pass `model` only when user explicitly requests fast tier |
| Task tool API (Cursor) | Optional `model` string on Task invocation |

**Implication for advisor**: Two configuration layers exist on Cursor:

1. **Agent frontmatter** `model: <slug>` — static, baked into agent definition
2. **Task call** `model: <slug>` — per-invocation override

Neither is used in Maister SOT today. Advisor could use either; frontmatter is build-pipeline-friendly for Kiro JSON emission.

### 3.3 Cursor-specific `maister-explore`

Platform-injected subagent (`platforms/cursor/agents/explore.md`) exists because built-in Cursor `explore` uses fast Composer. Maister replaces references via `build.sh` step 5 sed rewrites (`Explore` → `maister-explore`).

This is the **only model-motivated agent** in the platform layer — still `inherit`, not a pinned model.

### 3.4 Kiro subagent invocation

Skills reference `subagent_type: maister-*` (post-transform). Model selection:

- If advisor agent has `model: advisor-slug` in SOT → JSON includes `"model": "advisor-slug"`
- If `inherit` → JSON omits model → Kiro session model applies

Tools are fixed per agent in `agent-tools.json`; **no per-invocation tool override**.

---

## 4. Advisor-Like Agents & Skills (Precedent Analysis)

### 4.1 No `advisor` agent

Grep across `plugins/maister/agents/` for `advisor`, `grill`, `critique`, `consult` → **no matches** in agent definitions.

### 4.2 Closest agent patterns

| Agent | Advisor similarity | User interaction | Model |
|-------|-------------------|------------------|-------|
| `spec-auditor` | Independent skeptical reviewer | Non-interactive; reports to orchestrator | inherit |
| `reality-assessor` | Validates claims vs reality | Non-interactive; orchestrates other agents | inherit |
| `solution-brainstormer` | Generates alternatives for user decision | **Explicitly non-interactive** — orchestrator runs gate after | inherit |
| `gap-analyzer` | Flags decisions for orchestrator | Non-interactive; `decisions_needed` to parent | inherit |
| `code-reviewer` | Read-only analysis | Non-interactive | inherit |
| `task-classifier` | Routes workflow | **Uses AskUserQuestion** for low-confidence confirm | inherit |

**Key distinction**: Maister deliberately keeps **user-facing gates on the orchestrator (parent)**, not on content-generating subagents. `solution-brainstormer.md:30`:

> **You do NOT ask users questions** — the orchestrator handles user convergence after you generate alternatives.

### 4.3 Interactive “advisor” behavior lives in skills, not agents

| Skill | Behavior | Invocation |
|-------|----------|------------|
| `requirements-critic` | Interactive 4-check critique | Main agent + `AskUserQuestion` |
| `grill-me` | Stress-test plans, one question at a time | Main agent; `disable-model-invocation: true` |
| `grill-with-docs` | Same + maintains `language.md` | Main agent |
| `transcript-critic` | Non-interactive meeting audit | Main agent |

These are **not** delegatable via Task to a separate model without new agent wrappers.

### 4.4 `task-classifier` — cautionary precedent

`plugins/maister/agents/task-classifier.md` documents `AskUserQuestion` for classification confirmation (lines 198, 222, 314, 355, 392). This is the **only subagent** designed to ask users questions.

**Risk for advisor design**: Subagents on Cursor/Kiro may lack `AskUserQuestion`/`AskQuestion`/CHAT GATE tools. Research brief constraint: advisor replaces **user** answers at orchestrator gates, not subagent-initiated questions. A new `advisor` agent should receive gate context in the Task prompt and return structured answers — mirroring `solution-brainstormer` non-interactive contract, not `task-classifier`.

---

## 5. Hooks Reinforcing Gate Behavior (Orchestrator-Level)

Hooks apply to **main/orchestrator agent**, not subagents:

| Hook | File | Gate-related content |
|------|------|---------------------|
| SessionStart | `skill-invocation-reminder.sh` | Mandates `AskUserQuestion` at every `→ Pause` / `→ MANDATORY GATE` |
| SessionStart (post-compact) | `post-compact-reminder.sh` | Reminds to use `AskUserQuestion` at phase gates |

**Implication**: Advisor mode intercepts at orchestrator gate sites (parent), not by adding hooks to subagents. Hooks would need extension to mention advisor routing when `orchestrator.options.advisor_mode` is enabled (config gatherer scope).

---

## 6. Platform Build Summary for Model Configurability

| Platform | Agent format | `model: inherit` handling | Pin non-inherit model | Task runtime `model` |
|----------|-------------|---------------------------|----------------------|---------------------|
| **Claude Code** (SOT) | `.md` frontmatter | Kept as-is | Supported in frontmatter (unused) | N/A (Claude subagent API) |
| **Cursor** | `.md` frontmatter | Kept as-is | Supported in frontmatter + Task param | Documented; fast-tier banned by rule |
| **Kiro** | `.json` + instructions | Stripped from JSON | Emitted when frontmatter ≠ `inherit` | Host JSON `model` field |
| **Copilot** | `.md` (copied) | Kept as-is | Theoretically in frontmatter | Unknown / not documented in-repo |
| **Codex** | `.codex/agents/*.toml` (project) | N/A in plugin | **`model` in advisor.toml** (init bootstrap) | Native subagent by agent `name` |

---

## 7. Implications for Advisor Mode Design

### 7.1 Recommended agent shape (inferred from evidence)

```yaml
---
name: advisor
description: Recommends answers to orchestrator phase-gate questions using project context and gate artifacts. Non-interactive — returns a structured recommendation or escalation.
model: <verified-platform-model>  # configured per platform; do not hardcode an unverified slug
color: purple
    # read-only is configured per platform; do not add an unrecognized SOT field
---
```

Body should mirror `solution-brainstormer` / `spec-auditor`: autonomous, no `AskUserQuestion`, structured YAML/JSON recommendation for orchestrator to record as pending advisor input in `gate.advisor_answer`.

### 7.2 Config wiring (not present today)

Follow `html_output` precedent (documented in research plan): seed `advisor_enabled` / `advisor_model` / `advisor_agent` from `.maister/config.yml` → `orchestrator.options` → orchestrator passes model to Task or relies on agent frontmatter.

### 7.3 Build pipeline changes required

| Platform | Change if `model: <advisor-slug>` |
|----------|-----------------------------------|
| Cursor | None — frontmatter passes through; optionally document advisor model in `maister-no-fast-models.mdc` exception |
| Kiro | `generate-agent-json.sh` auto-emits `model` — validate Rule 30 already compatible |
| Codex | Add `platforms/codex-cli/templates/advisor.toml`; init scaffold to `.codex/agents/`; §2 `native subagent delegation` branch |

### 7.4 Orchestrator invocation sketch

```
# At MANDATORY GATE when advisor_mode enabled:
Task tool:
  subagent_type: maister:advisor   # or maister:advisor after cursor prefix
  model: <optional runtime override from orchestrator.options.advisor_model>
  prompt: gate question + phase artifacts + routing rules + denylist context
```

Parent records the recommendation in state/dashboard `gate` field. The existing interactive gate still requires a user response unless the host exposes a verified synthetic-answer or headless API.

**Codex variant:** `native subagent delegation` — spawn custom agent `advisor` (from `.codex/agents/advisor.toml`); pass gate question + artifact TL;DR in delegation prompt; use returned summary as a recommendation. A gate answer without user input requires a separate, tested Codex headless/runtime path.

---

## 8. Source Index

| Topic | Path | Lines / notes |
|-------|------|---------------|
| Agent frontmatter schema | `.maister/docs/standards/global/plugin-development.md` | 9-18 |
| All agents `model: inherit` | `plugins/maister/agents/*.md` | 24 files |
| Companion `skills:` agents | `docs-operator.md`, `thermo-nuclear-*.md` | 3 files |
| Delegation rules | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | § delegation |
| Cursor inherit policy | `platforms/cursor/rules/maister-no-fast-models.mdc` | 15-16 |
| Cursor explore agent | `platforms/cursor/agents/explore.md` | 1-6 |
| Cursor build (agents) | `platforms/cursor/build.sh` | 65-72, 137-229 |
| Kiro JSON model logic | `platforms/kiro-cli/generate-agent-json.sh` | 87-89, 134-135 |
| Kiro validate Rule 30 | `Makefile` | 217-220 |
| Kiro agent tools | `platforms/kiro-cli/agent-tools.json` | full file |
| Codex no model pin | `platforms/codex-cli/build.sh` | ~313 |
| Gate hooks | `plugins/maister/hooks/skill-invocation-reminder.sh` | 7 |
| Non-interactive subagent | `solution-brainstormer.md` | 30 |
| Interactive subagent (exception) | `task-classifier.md` | 198+ |

**Confidence**: **High** for frontmatter inventory, platform transform behavior, and absence of advisor agent. **Medium** for Cursor Task `model` allowlist beyond fast-tier policy (requires external Cursor docs verification).
