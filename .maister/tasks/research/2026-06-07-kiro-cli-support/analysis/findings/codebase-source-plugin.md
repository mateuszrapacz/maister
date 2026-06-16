# Codebase Source Findings: `plugins/maister/`

**Category:** `codebase-source`  
**Research question:** Kiro CLI support implementation plan for Maister  
**Source of truth:** `plugins/maister/` (Claude Code plugin — never edit generated variants)  
**Gathered:** 2026-06-07

---

## 1. Inventory Summary

| Artifact type | Count | Location |
|---------------|------:|----------|
| **Agents** | 24 | `plugins/maister/agents/*.md` |
| **Skills** | 14 | `plugins/maister/skills/**/SKILL.md` |
| **Commands** | 8 | `plugins/maister/commands/*.md` |
| **Hook scripts** | 3 | `plugins/maister/hooks/*.sh` |
| **Hook manifest** | 1 | `plugins/maister/hooks/hooks.json` |
| **MCP config** | 1 | `plugins/maister/.mcp.json` |
| **Plugin manifest** | 1 | `plugins/maister/.claude-plugin/plugin.json` |
| **Plugin doc** | 1 | `plugins/maister/CLAUDE.md` (~722 lines) |

**Confidence:** High (100%) — direct file enumeration via glob.

---

## 2. Agents (`agents/` — 24 files)

### 2.1 Complete list

| File | Frontmatter `name` | `model` | `color` | Special frontmatter |
|------|-------------------|---------|---------|---------------------|
| `bottleneck-analyzer.md` | `bottleneck-analyzer` | inherit | blue | — |
| `code-quality-pragmatist.md` | `code-quality-pragmatist` | inherit | purple | — |
| `code-reviewer.md` | `code-reviewer` | inherit | orange | — |
| `codebase-analysis-reporter.md` | `codebase-analysis-reporter` | inherit | blue | — |
| `docs-operator.md` | `docs-operator` | — | — | `skills: [docs-manager]` |
| `e2e-test-verifier.md` | `e2e-test-verifier` | inherit | green | — |
| `gap-analyzer.md` | `gap-analyzer` | inherit | blue | — |
| `implementation-completeness-checker.md` | `implementation-completeness-checker` | inherit | yellow | — |
| `implementation-planner.md` | `implementation-planner` | inherit | blue | — |
| `information-gatherer.md` | `information-gatherer` | inherit | green | — |
| `production-readiness-checker.md` | `production-readiness-checker` | inherit | red | — |
| `project-analyzer.md` | `project-analyzer` | haiku | blue | — |
| `reality-assessor.md` | `reality-assessor` | inherit | pink | — |
| `research-planner.md` | `research-planner` | inherit | blue | — |
| `research-synthesizer.md` | `research-synthesizer` | inherit | purple | — |
| `solution-brainstormer.md` | `solution-brainstormer` | inherit | orange | — |
| `solution-designer.md` | `solution-designer` | inherit | cyan | — |
| `spec-auditor.md` | `spec-auditor` | inherit | orange | — |
| `specification-creator.md` | `specification-creator` | inherit | green | — |
| `task-classifier.md` | `task-classifier` | inherit | purple | — |
| `task-group-implementer.md` | `task-group-implementer` | inherit | green | — |
| `test-suite-runner.md` | `test-suite-runner` | inherit | red | — |
| `ui-mockup-generator.md` | `ui-mockup-generator` | inherit | cyan | — |
| `user-docs-generator.md` | `user-docs-generator` | inherit | blue | — |

**Source:** `plugins/maister/agents/*.md` (frontmatter lines 1–6 per file).

### 2.2 Agent frontmatter schema (Claude Code)

Observed YAML frontmatter fields:

| Field | Required | Values observed | Notes |
|-------|----------|-----------------|-------|
| `name` | Yes | kebab-case slug (no `maister:` prefix in source) | Runtime namespace `maister:` added by platform builds |
| `description` | Yes | One-line summary | Maps to Kiro agent metadata |
| `model` | Usually | `inherit` (23 agents), `haiku` (`project-analyzer`) | Kiro may use different model selection |
| `color` | Usually | blue, green, red, orange, purple, cyan, yellow, pink | UI-only; likely dropped in Kiro JSON |
| `skills` | Rare | `docs-operator` only: `skills: [docs-manager]` | Preloads internal skill; Kiro equivalent TBD (`resources`?) |

**Not present in any source agent:** `tools`, `allowedTools`, `hooks`, `mcpServers`.

**Evidence — typical agent:**

```1:6:plugins/maister/agents/gap-analyzer.md
---
name: gap-analyzer
description: Compares current vs desired state, identifies gaps with user journey and data lifecycle analysis. Reports findings for orchestrator to act on. Adapts analysis based on detected task characteristics.
model: inherit
color: blue
---
```

**Evidence — companion agent with preloaded skill:**

```1:6:plugins/maister/agents/docs-operator.md
---
name: docs-operator
description: Internal documentation management service. Executes docs-manager operations and returns results to the calling workflow.
skills:
  - docs-manager
---
```

**Kiro implication:** All 24 agents require **MD → JSON** conversion. Body markdown becomes `prompt` (or equivalent). Per-agent `tools` whitelist must be **inferred** from role (read-only vs write vs Bash) — not declared in source today.

---

## 3. Skills (`skills/` — 14 SKILL.md files)

### 3.1 Complete list with frontmatter

| Directory | `name` | `user-invocable` | Role |
|-----------|--------|------------------|------|
| `codebase-analyzer/` | `codebase-analyzer` | `false` | Internal — parallel Explore + reporter |
| `development/` | `maister:development` | `true` | Orchestrator |
| `docs-manager/` | `docs-manager` | `false` | Internal — file ops, CLAUDE.md |
| `implementation-plan-executor/` | `implementation-plan-executor` | `false` | Internal — wave dispatch |
| `implementation-verifier/` | `implementation-verifier` | `false` | Internal — QA orchestrator |
| `init/` | `maister:init` | *(omitted — default invocable)* | Setup |
| `migration/` | `maister:migration` | `true` | Orchestrator |
| `orchestrator-framework/` | `orchestrator-framework` | `false` | Reference only — not executable |
| `performance/` | `maister:performance` | `true` | Orchestrator |
| `product-design/` | `maister:product-design` | `true` | Orchestrator |
| `quick-bugfix/` | `maister:quick-bugfix` | *(omitted)* | Quick workflow |
| `research/` | `maister:research` | `true` | Orchestrator |
| `standards-discover/` | `maister:standards-discover` | *(omitted)* | Setup |
| `standards-update/` | `maister:standards-update` | *(omitted)* | Setup |

**Source:** `plugins/maister/skills/**/SKILL.md` lines 1–5.

### 3.2 Skill frontmatter schema

| Field | Required | Pattern |
|-------|----------|---------|
| `name` | Yes | `maister:*` for user workflows; bare kebab for internal (`codebase-analyzer`, `docs-manager`, etc.) |
| `description` | Yes | Short purpose string |
| `user-invocable` | Optional | `true` / `false`; omitted on 4 setup/quick skills (treated as invocable in Claude) |
| `argument-hint` | Optional | `maister:init` only: `[--standards-from=PATH]` |

**Evidence — user-invocable orchestrator:**

```1:5:plugins/maister/skills/development/SKILL.md
---
name: maister:development
description: Unified orchestrator for all development tasks. ALWAYS execute when invoked — never skip for 'straightforward' tasks. Phases adapt based on detected task characteristics rather than predetermined types. Use for any development work that modifies code.
user-invocable: true
---
```

**Evidence — internal engine:**

```1:5:plugins/maister/skills/docs-manager/SKILL.md
---
name: docs-manager
description: Internal engine for managing project documentation and technical standards in .maister/docs/. Handles file operations, INDEX.md generation, and CLAUDE.md integration. Invoked by maister:init, standards-update, and standards-discover skills.
user-invocable: false
---
```

**Kiro implication:** Skills map 1:1 to `.kiro/skills/<dir>/SKILL.md`. Namespace `maister:` → likely `maister-` prefix (Cursor pattern). Internal skills (`user-invocable: false`) remain non–slash-command skills.

---

## 4. Commands (`commands/` — 8 files)

### 4.1 Complete list

| File | Frontmatter `name` | Delegation pattern |
|------|-------------------|-------------------|
| `work.md` | `maister:work` | Task → `task-classifier`; Skill → orchestrators |
| `quick-plan.md` | `maister:quick-plan` | Inline + `EnterPlanMode` / `ExitPlanMode` |
| `quick-dev.md` | `maister:quick-dev` | Inline implementation (no skill/agent) |
| `reviews-code.md` | `maister:reviews-code` | Task → `maister:code-reviewer` |
| `reviews-pragmatic.md` | `maister:reviews-pragmatic` | Task → `maister:code-quality-pragmatist` |
| `reviews-spec-audit.md` | `maister:reviews-spec-audit` | Task → `maister:spec-auditor` |
| `reviews-reality-check.md` | `maister:reviews-reality-check` | Task → `maister:reality-assessor` |
| `reviews-production-readiness.md` | `maister:reviews-production-readiness` | Task → `maister:production-readiness-checker` |

**Source:** `plugins/maister/commands/*.md`.

### 4.2 Command structure

Commands are **thin markdown wrappers** with YAML frontmatter (`name`, `description`) and procedural body. Several include an **ACTION REQUIRED** block forcing immediate Task delegation:

```1:6:plugins/maister/commands/reviews-code.md
---
name: maister:reviews-code
description: Run automated code quality, security, and performance analysis on your code
---

**ACTION REQUIRED**: This command delegates to a subagent. The `<command-name>` tag refers to THIS command, not the target. Invoke the code-reviewer subagent via the Task tool NOW. Pass path and scope arguments. Do not read files, explore code, or execute workflow steps yourself.
```

`work.md` routes via **Skill tool** to orchestrator skills (`maister:development`, etc.) — see `plugins/maister/commands/work.md` lines 134–140, 177–187.

### 4.3 Commands vs skills overlap

| User-facing entry | In `commands/` | In `skills/` |
|-------------------|----------------|--------------|
| Orchestrators (development, research, …) | No | Yes (`maister:*` SKILL.md) |
| init, standards-*, quick-bugfix | No | Yes |
| work, reviews-*, quick-plan, quick-dev | Yes (8 files) | No |

**Total distinct slash surfaces:** ~17 (9 skill-only + 8 command-only; orchestrators not duplicated in commands).

**Kiro implication:** Kiro has **no `commands/` directory** — all 8 command files must become **generated skills** under `.kiro/skills/` (build-time merge), matching research hypothesis in `planning/research-plan.md` § Preliminary Hypotheses #3.

---

## 5. Hooks (`hooks/`)

### 5.1 `hooks/hooks.json` (Claude plugin manifest)

```1:38:plugins/maister/hooks/hooks.json
{
  "description": "AI SDLC plugin hooks for workflow enforcement and state preservation",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-compact-reminder.sh",
            "timeout": 10
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/skill-invocation-reminder.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/block-destructive-commands.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 5.2 Hook scripts

| Script | Event | Purpose |
|--------|-------|---------|
| `post-compact-reminder.sh` | `SessionStart` (matcher: `compact`) | Remind to read `orchestrator-state.yml`; enforce AskUserQuestion at gates |
| `skill-invocation-reminder.sh` | `SessionStart` (unconditional) | Force Skill tool on `/maister:*`; gate AskUserQuestion policy |
| `block-destructive-commands.sh` | `PreToolUse` (matcher: `Bash`) | Whitelist bypass for 4 agents; block destructive git/rm for others |

**Env vars:** `${CLAUDE_PLUGIN_ROOT}` in `hooks.json`; `post-compact-reminder.sh` uses `$CLAUDE_PROJECT_DIR` (line 6).

**PreToolUse matcher:** `Bash` (Claude) — Cursor build adapts to different tool names; Kiro likely `shell` / `execute_bash` per `planning/sources.md`.

**Kiro implication:** Standalone `hooks/hooks.json` **does not exist** in Kiro — hooks must be **embedded in orchestrator agent JSON** (`hooks` field). Hook script paths need Kiro install root variable (analog of `CURSOR_PLUGIN_ROOT` / `KIRO_PLUGIN_ROOT`).

---

## 6. MCP (`.mcp.json`)

```1:10:plugins/maister/.mcp.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

**Consumers:** `e2e-test-verifier`, `user-docs-generator` agents (Playwright screenshots/E2E).

**Kiro target:** `.kiro/settings/mcp.json` or agent-level `includeMcpJson` / `mcpServers` per Kiro agent config reference.

---

## 7. Plugin manifest & documentation

### 7.1 `.claude-plugin/plugin.json`

```1:9:plugins/maister/.claude-plugin/plugin.json
{
  "name": "maister",
  "version": "2.1.8",
  "description": "Structured, standards-aware development workflows for Claude Code",
  ...
}
```

**Kiro gap:** No `.kiro-plugin` or marketplace manifest identified — packaging is install-tree only.

### 7.2 `CLAUDE.md` (plugin-level doc, ~722 lines)

Serves as **authoritative plugin reference** for humans and agents:

- Workflow types table (development, performance, migration, research, product-design) — lines 43–53
- Available Skills / Commands / Subagents tables — lines 464–620
- **Delegation contract:** Skill tool for skills, Task tool for agents — line 497
- **Progress tracking:** TaskCreate/TaskUpdate — lines 634–651
- **Hooks section** — lines 653–679
- **Documentation principles** — commands as thin wrappers; SKILL.md as SOT — lines 311–326

**Project init integration:** `docs-manager` writes **project** `CLAUDE.md` (not plugin `CLAUDE.md`) — see `plugins/maister/skills/docs-manager/SKILL.md` § "Manage CLAUDE.md Integration" (lines 254–269).

**Kiro implication:** Plugin `CLAUDE.md` → steering/README; project init must target **AGENTS.md** + `.kiro/steering/` instead of CLAUDE.md / `.cursor/rules/`.

---

## 8. Orchestrator API references (Task, Skill, gates, Explore)

### 8.1 Canonical delegation rules

**Source:** `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` § 1

| Claude API | Usage in Maister | Key rule |
|------------|------------------|----------|
| **Skill tool** | Skills (`codebase-analyzer`, `implementation-plan-executor`, `implementation-verifier`, orchestrators via `/work`) | Skills run in main context; can spawn subagents |
| **Task tool** | All `agents/*.md` subagents | Isolated subprocess; cannot spawn nested subagents |
| **AskUserQuestion** | Phase gates (`→ Pause`, `→ MANDATORY GATE`), decisions, init prompts | Mandatory at gates; overrides auto permission mode (§ 2) |
| **TaskCreate / TaskUpdate** | All orchestrators + init, standards-discover, implementation-planner | Phase/group progress UX; `task_ids` in `orchestrator-state.yml` |
| **EnterPlanMode / ExitPlanMode** | `quick-bugfix`, `commands/quick-plan.md` | Claude Code builtin planning mode |
| **Explore** (built-in subagent) | `codebase-analyzer` only: `subagent_type="Explore"` | Parallel codebase discovery; `commands/quick-plan.md` Phase 1 |

**Anti-pattern explicitly documented:** Never invoke skills via Task `subagent_type` — fails with "Agent type not found" (`orchestrator-patterns.md` line 16).

### 8.2 Reference counts (grep across `plugins/maister/`)

| Pattern | Files with matches | Approx. total mentions |
|---------|-------------------|------------------------|
| `AskUserQuestion` | 28 files | 200+ (orchestrators dominate) |
| `TaskCreate` | 14 files | ~20 |
| `TaskUpdate` | (subset of above) | bundled with TaskCreate docs |
| `EnterPlanMode` / `ExitPlanMode` | 2 files | `quick-bugfix/SKILL.md`, `commands/quick-plan.md` |
| `subagent_type.*Explore` / Explore agents | 6 files | `codebase-analyzer`, `quick-plan`, reporter agent, CLAUDE.md |
| `Task tool` / `Skill tool` | 30+ files | pervasive in orchestrators |
| `subagent_type: maister:` | 15 files | explicit agent delegation |
| `subagent_type: general-purpose` | 1 file | `standards-discover/SKILL.md` line 101 |
| `subagent_type="Explore"` | 1 file | `codebase-analyzer/SKILL.md` line 97 |

### 8.3 Explore subagent (critical Kiro gap)

**Only declared usage:**

```97:100:plugins/maister/skills/codebase-analyzer/SKILL.md
**3c. Launch agents** — Use the Task tool with `subagent_type="Explore"` — one call per selected role, all in ONE message.

**IMPORTANT**: Every Explore agent prompt MUST include this instruction:
> IMPORTANT: Do NOT create, write, or modify any files. Output all findings as text in your response only.
```

`quick-plan.md` also instructs launching Explore agents with standards context (line 63–68) but does not use `codebase-analyzer` skill.

**Kiro implication:** No built-in Explore — need custom `maister-explore` JSON agent or rewrite to `read`/code-intelligence tools + `subagent` tool.

### 8.4 Development orchestrator delegation graph (sample)

From `plugins/maister/skills/development/SKILL.md`:

- **Skill:** `maister:codebase-analyzer`, `maister:implementation-plan-executor`, `maister:implementation-verifier`
- **Task agents:** `gap-analyzer`, `ui-mockup-generator`, `specification-creator`, `spec-auditor`, `implementation-planner`, `e2e-test-verifier`, `user-docs-generator`

### 8.5 TaskCreate wiring in state schema

```210:213:plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md
  # Task tracking IDs (maps phase names to TaskCreate IDs)
  task_ids:
    phase-1: null
    phase-2: null
```

Documented in `CLAUDE.md` lines 634–651 as dual-level tracking (orchestrator phases + implementation task groups).

---

## 9. Kiro transformation matrix (source → target)

| Source artifact | Claude/Cursor today | Kiro target | Transform type |
|-----------------|---------------------|-------------|----------------|
| `agents/*.md` | YAML frontmatter + markdown body | `.kiro/agents/*.json` | **Generate** — MD→JSON; infer `tools`; map `skills` on docs-operator |
| `skills/**/SKILL.md` | Plugin skills dir | `.kiro/skills/**/SKILL.md` | **Copy + sed** — rename `maister:` → `maister-`; patch tool refs |
| `commands/*.md` | Claude slash commands | `.kiro/skills/*/SKILL.md` | **Merge/generate** — no commands dir in Kiro |
| `hooks/hooks.json` + `hooks/*.sh` | Plugin-level hooks | `hooks` in orchestrator agent JSON | **Relocate + adapt matchers** |
| `.mcp.json` | Plugin MCP | `.kiro/settings/mcp.json` or agent `mcpServers` | **Copy/repath** |
| `.claude-plugin/plugin.json` | Marketplace manifest | *(none)* | **Omit** or README version only |
| `CLAUDE.md` (plugin) | Plugin doc | Steering / README in bundle | **Adapt** |
| `docs-manager` → project `CLAUDE.md` | Init output | `AGENTS.md` + `.kiro/steering/` | **Patch init skill + templates** |
| `Task` tool | Subagent spawn | `subagent` tool + `trustedAgents` | **Text transform in all SKILL.md** |
| `Skill` tool | Skill invocation | Auto-discovery / slash `/skill-name` | **Rewrite delegation instructions** |
| `TaskCreate`/`TaskUpdate` | Progress UI | Kiro experimental `todo` tool | **Transform + feature flag** |
| `AskUserQuestion` | Interactive gates | TBD (permissions? chat?) | **Gap — highest uncertainty** |
| `EnterPlanMode` | Planning mode | Custom flow or Kiro Plan agent | **Override skill** (Cursor pattern) |
| `Explore` subagent | Built-in | Custom agent or inline tools | **New agent or rewrite** |

---

## 10. Gaps

| Gap | Confidence | Evidence |
|-----|------------|----------|
| Agent `tools` not in source MD | High | No `tools:` in any of 24 agents |
| `AskUserQuestion` Kiro equivalent unknown | High | Used 200+ times; no Kiro mapping in repo |
| `Explore` has no Kiro built-in | High | Only `codebase-analyzer` + `quick-plan` depend on it |
| `general-purpose` subagent in standards-discover | Medium | Single use — may map to default agent |
| Hook env var `CLAUDE_PLUGIN_ROOT` | High | `hooks.json` lines 10, 19, 31 |
| Commands-only workflows (quick-dev, quick-plan) not skills | High | 8 commands lack SKILL.md counterparts |
| `docs-operator` `skills:` frontmatter | Medium | Only agent with preloaded skill — Kiro JSON field TBD |

---

## 11. Recommendations for `platforms/kiro-cli/build.sh`

1. **Agent generator:** Parse YAML frontmatter + markdown body → JSON with `name`, `description`, `prompt`, inferred `tools`, and optional `resources` for `docs-operator` (docs-manager skill content).
2. **Commands → skills:** Emit 8 additional `SKILL.md` files from `commands/*.md` (e.g. `skills/maister-work/SKILL.md`), preserving ACTION REQUIRED delegation blocks with Kiro `subagent` syntax.
3. **Orchestrator agent JSON:** Create `maister-orchestrator.json` (or per-orchestrator agents) with embedded hooks from `hooks.json`, `trustedAgents: ["maister-*"]`, and hook script paths using install-root placeholder.
4. **Text transforms (reuse Cursor patterns):** `maister:` → `maister-`; `Task tool` → `subagent` tool; `TaskCreate`/`TaskUpdate` → `todo`; strip/replace `EnterPlanMode`; replace `Skill tool` invocations with slash-command or skill URI semantics.
5. **Explore replacement:** Add generated `maister-explore.json` agent OR patch `codebase-analyzer/SKILL.md` to use `subagent` + read/grep tools instead of `subagent_type="Explore"`.
6. **Init/docs-manager:** Fork `claude-md-template.md` → `agents-md-template.md`; update `docs-manager/SKILL.md` references from CLAUDE.md to AGENTS.md + steering paths.
7. **Validate-kiro:** Grep for residual `maister:`, `TaskCreate`, `AskUserQuestion`, `EnterPlanMode`, `Explore`, invalid JSON agents.
8. **MCP:** Copy Playwright config to `.kiro/settings/mcp.json`; ensure e2e/user-docs agents include MCP access.

---

## 12. Open questions

| # | Question | Confidence |
|---|----------|------------|
| 1 | How to map `AskUserQuestion` multi-select gates in headless `kiro-cli chat --no-interactive`? | Low |
| 2 | Does Kiro support preloading skill content on an agent (docs-operator pattern)? | Medium |
| 3 | Should `quick-plan` use Kiro built-in Plan agent or a generated override skill? | Medium |
| 4 | Per-agent `tools` whitelist: static table in build.sh vs role-based inference? | Medium |
| 5 | Embed all hooks in one orchestrator agent vs distribute across agents? | Medium |
| 6 | Is `general-purpose` Task in standards-discover a separate Kiro agent or default? | Low |

---

## 13. Source index

| Path | Topic |
|------|-------|
| `plugins/maister/agents/*.md` | 24 subagent definitions |
| `plugins/maister/skills/**/SKILL.md` | 14 skills |
| `plugins/maister/commands/*.md` | 8 slash commands |
| `plugins/maister/hooks/hooks.json` | Hook event wiring |
| `plugins/maister/hooks/*.sh` | Hook script implementations |
| `plugins/maister/.mcp.json` | Playwright MCP |
| `plugins/maister/.claude-plugin/plugin.json` | Plugin manifest |
| `plugins/maister/CLAUDE.md` | Plugin documentation SOT |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | Delegation, gates, TaskCreate schema |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-creation-checklist.md` | Authoring checklist |
| `plugins/maister/skills/codebase-analyzer/SKILL.md` | Explore subagent usage |
| `plugins/maister/skills/docs-manager/SKILL.md` | CLAUDE.md project integration |
| `plugins/maister/skills/init/SKILL.md` | Init workflow, docs-operator Task calls |
