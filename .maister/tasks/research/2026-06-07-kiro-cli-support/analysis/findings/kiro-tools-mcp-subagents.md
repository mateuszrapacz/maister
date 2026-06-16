# Kiro CLI Tools, MCP, Subagents & Todos — Research Findings

**Category:** `kiro-tools-mcp`  
**Research question:** Kiro CLI support implementation plan for Maister  
**Gathered:** 2026-06-07  
**Sources:** Official Kiro CLI docs (`kiro.dev/docs/cli/`), `platforms/cursor/build.sh`, `plugins/maister/`

---

## Executive Summary

Kiro CLI provides direct analogs for Maister's highest-impact Claude/Cursor transforms: **`subagent`** replaces the **Task tool**, **`todo`** (experimental) replaces **TaskCreate/TaskUpdate/TodoWrite**, and **skills auto-discovery** replaces the **Skill tool** for the default agent. There is **no `AskQuestion` / `AskUserQuestion` built-in tool** — user gates must use **natural-language structured questions in chat** (as the built-in Plan agent does) or rely on **interactive permission prompts** (unsuitable for headless). **EnterPlanMode/ExitPlanMode** map to Kiro's built-in **`/plan` agent** or Maister's existing **file-based plan + gate** pattern (Cursor override). **Explore** has no built-in subagent; use a **custom `maister-explore` agent** or rewrite codebase-analyzer to use **`read`/`grep`/`glob`/`code`**. MCP config lives at **`.kiro/settings/mcp.json`** with optional per-agent **`includeMcpJson`** and **`mcpServers`** override hierarchy.

---

## 1. Tool Mapping: Claude Code / Cursor → Kiro CLI

| Maister (Claude) | Cursor transform (`build.sh`) | Kiro CLI equivalent | Mapping quality | Notes |
|------------------|------------------------------|---------------------|-----------------|-------|
| **Task tool** (`subagent_type`) | Rename agents to `maister-*`; `explore` lowercase | **`subagent` tool** | **High** | Spawn by agent name in natural language or tool call; max 4 parallel; DAG + review loops supported |
| **TaskCreate / TaskUpdate** | → `TodoWrite` (sed + patches) | **`todo` tool** (experimental) | **Medium** | Different API: persisted JSON lists in `.kiro/cli-todo-lists/`; requires `chat.enableTodoList true` |
| **AskUserQuestion** | → `AskQuestion` | **No dedicated tool** | **Gap** | Use chat questions (Plan agent pattern) or interactive `/tools` approvals; headless blocks mid-session input |
| **Skill tool** | (unchanged in Cursor) | **Auto-discovery + `/skill-name`** | **High** (default agent) | Default agent loads `.kiro/skills/` automatically; custom agents need `skill://` in `resources` |
| **EnterPlanMode / ExitPlanMode** | Strip/replace; quick-plan override | **`/plan` built-in agent** or file-based flow | **Medium** | Kiro Plan agent is read-only, structured MC questions; Maister may prefer Cursor-style file plan + gate |
| **Explore subagent** | `Explore` → `explore` | **No built-in explore** | **Gap** | Default subagent has full tool set; custom agent `maister-explore` with restricted tools recommended |
| **delegate tool** (Q legacy) | N/A | **`delegate`** (deprecated) | **N/A** | Use `subagent` instead per Kiro docs |
| **MCP (`.mcp.json`)** | `.mcp.json` → `mcp.json` in plugin root | **`.kiro/settings/mcp.json`** | **High** | Same `mcpServers` JSON shape; workspace + user paths |
| **Playwright MCP** | Copied verbatim to `mcp.json` | Same config in `.kiro/settings/mcp.json` | **High** | `npx @playwright/mcp@latest` — identical to source |

---

## 2. Subagent Tool (`Task` → `subagent`)

### Kiro behavior

**Source:** [Subagents](https://kiro.dev/docs/cli/chat/subagents.md), [Built-in tools — Subagent](https://kiro.dev/docs/cli/reference/built-in-tools.md)

- Tool name: `subagent` (aliases: `use_subagent`)
- Orchestrator custom agents **must** include `subagent` in `tools` (or `@builtin`)
- Up to **4 parallel** subagents; task graphs (DAG) and review loops planned by main agent
- Subagents return via built-in **`summary`** tool (auto-included)
- Reference custom agents by name: e.g. "Use the **backend** agent to refactor…"
- Default subagent uses **built-in default agent** — same tools as default main agent (`read`, `write`, `shell`, `grep`, `glob`, `code`, `web_search`, `web_fetch`, `todo`, MCP tools, etc.)

### Permission model for orchestrators

**Source:** [Subagents — Configuring subagent access](https://kiro.dev/docs/cli/chat/subagents.md)

```json
{
  "name": "maister-orchestrator",
  "tools": ["read", "subagent"],
  "toolsSettings": {
    "subagent": {
      "availableAgents": ["maister-*"],
      "trustedAgents": ["maister-gap-analyzer", "maister-research-planner"]
    }
  }
}
```

- **`availableAgents`**: restrict spawnable agents (glob supported, e.g. `maister-*`)
- **`trustedAgents`**: skip approval prompts (required for headless subagents)
- Non-interactive subagents **fail fast** if approval needed — must use `trustedAgents` or `dangerously_trust_all_tools`

### Cursor `build.sh` comparison

**Source:** `platforms/cursor/build.sh` steps 5, 11b

| Cursor step | Content | Kiro build implication |
|-------------|---------|------------------------|
| Step 5 | `subagent_type="Explore"` → `explore` | **No equivalent** — generate `maister-explore.json` agent instead |
| Step 11b | Agent frontmatter `name: maister-*` | Convert `agents/*.md` → `.kiro/agents/maister-*.json`; reference names in skill text |
| (implicit) | Task tool in orchestrator-patterns | Rewrite to **`subagent` tool** + agent name; document `trustedAgents` for smoke |

### Maister orchestrator patterns

**Source:** `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`

- **Skill tool** → skills that spawn subagents (`codebase-analyzer`, `implementation-plan-executor`) must run in **main agent context**
- **Task tool** → isolated subagents (`docs-operator`, planners, gatherers)

**Kiro adaptation:**

| Pattern | Claude/Cursor | Kiro |
|---------|---------------|------|
| Invoke skill with sub-spawns | Skill tool (main context) | **Slash command `/maister-development`** or prompt "follow skill X" — default agent auto-loads skill metadata; **no Skill tool** — orchestrator agent must stay as default or custom agent with `skill://` resources |
| Invoke isolated agent | Task tool + `subagent_type` | **`subagent` tool** + agent name |
| Companion agent (`docs-operator`) | Task tool | **`subagent`** to `maister-docs-operator` agent with `skill://` preload in `resources` |

**Confidence:** High for Task→subagent; Medium for Skill tool semantics (auto-discovery vs explicit invocation).

---

## 3. Todo / Progress Tracking (`TaskCreate` → `todo`)

### Kiro `todo` tool (experimental)

**Source:** [TODO lists](https://kiro.dev/docs/cli/experimental/todo-lists.md), [Settings — `chat.enableTodoList`](https://kiro.dev/docs/cli/reference/settings.md), [Built-in tools](https://kiro.dev/docs/cli/reference/built-in-tools.md)

| Aspect | Detail |
|--------|--------|
| Enable | `kiro-cli settings chat.enableTodoList true` |
| Tool name | `todo` (docs also show `todo_list` in examples) |
| User commands | `/todo view`, `/todo resume`, `/todo delete`, `/todo clear-finished` |
| Storage | `.kiro/cli-todo-lists/<timestamp>-*.json` |
| Agent capabilities | Create, complete, add/remove tasks, load by ID, search |
| Limitations | No manual JSON edit, no merge/split, no reorder after creation |

### Cursor transform reference

**Source:** `platforms/cursor/build.sh` step 14, `platforms/cursor/transforms/task-to-todo.md`

Cursor maps:

| Claude | Cursor `TodoWrite` |
|--------|-------------------|
| `TaskCreate` (pending) | `status: "pending"` |
| `TaskUpdate` → `in_progress` | `merge: true`, `status: "in_progress"` |
| `TaskUpdate` → `completed` | `merge: true`, `status: "completed"` |
| `addBlockedBy` | Ordering in todos array |
| `activeForm` | Activity in `content` string |
| `metadata: {skipped: true}` | `status: "cancelled"` |

### Proposed Kiro transform (build.sh)

Replace Cursor's `TodoWrite` sed block with **`todo` tool** instructions:

1. At workflow start: instruct orchestrator to **create todo list** with phase items (natural language or `todo` tool)
2. Phase start/end: **mark complete** via `todo` tool (no `merge` API — update via tool operations)
3. Skipped phases: remove or mark complete with note in task description
4. **State file** (`orchestrator-state.yml`) remains source of truth for resume; `todo` is UX mirror only (same principle as Cursor)

**Gaps vs TodoWrite:**

| Gap | Severity | Mitigation |
|-----|----------|------------|
| Experimental + classic-only flag | Medium | Enable in smoke/E2E; document fallback to state-file-only in MVP |
| No `addBlockedBy` / dependency API | Medium | Encode order in list creation; document in orchestrator-patterns patch |
| No `merge: true` incremental update | Low | Use todo tool's add/complete operations |
| Headless: todo still works if tool trusted | Low | `--trust-all-tools` or trust `todo` |

**Confidence:** Medium (experimental, API differs from TodoWrite).

---

## 4. AskUserQuestion → ? (No AskQuestion in Kiro)

### Finding: No dedicated user-question tool

**Sources searched:** [Built-in tools](https://kiro.dev/docs/cli/reference/built-in-tools.md), [Permissions](https://kiro.dev/docs/cli/chat/permissions.md), [Plan agent](https://kiro.dev/docs/cli/chat/planning-agent.md)

Kiro built-in tools list does **not** include `AskQuestion`, `AskUserQuestion`, or similar. User interaction mechanisms:

| Mechanism | Use case | Headless compatible? |
|-----------|----------|---------------------|
| **Natural language questions in chat** | Plan agent structured MC questions; orchestrator gates | **No** — headless has no mid-session input |
| **`/tools` permission prompts** | Tool approval (Yes/Trust/No) | Partial — `--trust-all-tools` bypasses |
| **Plan agent `/plan`** | Requirements gathering with numbered options | Interactive only |
| **Interactive `/todo` commands** | User manages lists | Interactive only |

### Cursor transform

**Source:** `platforms/cursor/build.sh` step 6

```bash
sedi 's/AskUserQuestion/AskQuestion/g'  # all *.md
```

**Source:** `docs/cursor-agent-support.md` — Cursor has native `AskQuestion` with `allow_multiple`.

### Kiro recommendation for Maister build

| Strategy | Description |
|----------|-------------|
| **A. Chat-native gates (primary)** | Replace `AskUserQuestion` with explicit instruction: "Ask the user in chat with numbered options (a/b/c) and **wait for response** before proceeding." Matches [Plan agent](https://kiro.dev/docs/cli/chat/planning-agent.md) pattern. |
| **B. Document gate protocol** | Keep MANDATORY GATE markers; remove tool name; reference orchestrator-patterns §2 |
| **C. Headless smoke** | Gates cannot be tested in `--no-interactive` without mock/user fixture — smoke tests should use prompts that skip gates or test sub-paths only |
| **D. No sed to AskQuestion** | Unlike Cursor step 6, Kiro build should **not** sed to `AskQuestion` |

**Confidence:** High (gap confirmed). **Risk:** Orchestrator gate enforcement is softer without a dedicated tool.

---

## 5. Skill Tool → Auto-loaded Skills

### Kiro skills model

**Source:** [Agent Skills](https://kiro.dev/docs/cli/skills.md)

| Aspect | Behavior |
|--------|----------|
| Discovery | Session start: read skill `name` + `description` from `.kiro/skills/` and `~/.kiro/skills/` |
| Activation | **Automatic** (description match) or **`/skill-name`** slash command |
| Default agent | **Auto-loads all skills** — no config required |
| Custom agents | Must add `resources`: `"skill://.kiro/skills/**/SKILL.md"` |
| Arguments | `$ARGUMENTS` / `$N` placeholders in SKILL.md body |
| Name format | kebab-case, max 64 chars (aligns with `maister-foo` Cursor prefix) |

### Maister implications

**Source:** `plugins/maister/CLAUDE.md` — docs-manager invoked via Task tool, not user-facing Skill tool.

| Claude pattern | Kiro equivalent |
|----------------|-----------------|
| `Skill tool` for orchestrators | User runs `/maister-development` or agent loads skill on demand |
| `user-invocable: false` (docs-manager) | Omit from slash commands — no `name` exposure OR keep internal skill without user docs |
| Command `commands/*.md` | Merge into skills; Kiro has no separate commands directory |
| Cursor step 2–4: `maister:` → `maister-` | Same transform for Kiro skill `name` frontmatter |

**Cursor build.sh steps 2–4** apply directly to Kiro skill names and references.

**Confidence:** High for default-agent skill loading; Medium for non-user-invocable internal skills (may need agent `resources` filtering).

---

## 6. EnterPlanMode / ExitPlanMode → Plan Agent vs File-based Flow

### Kiro Plan agent

**Source:** [Plan agent](https://kiro.dev/docs/cli/chat/planning-agent.md)

- Invoke: `/plan`, `Shift+Tab`, or `/plan <prompt>`
- **Read-only**: no write, limited shell, **no MCP**
- Structured requirements gathering with numbered MC questions
- Produces implementation plan; user approves; hands off to previous agent
- Cannot modify files during planning

### Cursor approach (Maister override)

**Source:** `platforms/cursor/build.sh` step 7, 12; `platforms/cursor/overrides/commands/quick-plan.md`

- Strip `EnterPlanMode`/`ExitPlanMode` references
- **File-based plan** in `.maister/plans/` + **`AskQuestion` gate**
- quick-bugfix override removes plan mode dependency

### Kiro recommendation

| Option | Pros | Cons |
|--------|------|------|
| **Reuse Cursor file-based flow** | Consistent across Cursor+Kiro; standards-aware; works with Maister task dirs | No native plan mode UX |
| **Document `/plan` for quick-plan only** | Native Kiro UX | Plan agent can't write spec files; doesn't read `.maister/docs/INDEX.md` by default |
| **Hybrid** | quick-plan mentions `/plan` as optional pre-step | Two paths to maintain |

**Recommended:** Same as Cursor — **file-based plan + chat gate** (step 7 transforms), add Kiro steering note for `/plan` as optional. Do **not** map to EnterPlanMode literally.

**Confidence:** High.

---

## 7. Explore Subagent → Default vs Custom Agent

### Kiro: no built-in `explore`

**Source:** [Subagents — Tool availability](https://kiro.dev/docs/cli/chat/subagents.md)

Default subagent has broad tools including `grep`, `glob`, `code` — functionally similar to Cursor Explore but **not read-only by default**.

### Cursor transform

**Source:** `platforms/cursor/build.sh` step 5

```bash
sedi 's/subagent_type="Explore"/subagent_type="explore"/g'
```

### Kiro options

| Option | Implementation |
|--------|----------------|
| **A. Custom `maister-explore` agent** | JSON agent: `tools: ["read", "grep", "glob", "code"]`, read-only via `allowedTools`; spawn via `subagent` |
| **B. Default subagent** | Rewrite codebase-analyzer to spawn unnamed default subagent — **risk**: write/shell access |
| **C. Inline tools** | Main orchestrator uses `grep`/`glob` directly — loses isolation |

**Recommended:** Option A — `maister-explore.json` with restricted tools; sed `subagent_type="Explore"` → "use subagent with **maister-explore** agent" in skill text.

**Confidence:** High (gap); Medium (custom agent tool whitelist sufficiency).

---

## 8. MCP Configuration

### Paths and format

**Sources:** [MCP Configuration](https://kiro.dev/docs/cli/mcp/configuration.md), [Migrating from Q](https://kiro.dev/docs/cli/migrating-from-q.md)

| Scope | Path |
|-------|------|
| Workspace | `.kiro/settings/mcp.json` |
| User/global | `~/.kiro/settings/mcp.json` |

JSON structure matches Claude/Cursor:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**Source:** `plugins/maister/.mcp.json` — identical Playwright config to `plugins/maister-cursor/mcp.json`.

### Loading priority (highest wins)

**Source:** [MCP Configuration — Loading priority](https://kiro.dev/docs/cli/mcp/configuration.md)

1. Agent config `mcpServers` field
2. Workspace `.kiro/settings/mcp.json`
3. Global `~/.kiro/settings/mcp.json`

Additive when server **names** differ; agent can **disable** workspace servers with `"disabled": true`.

### `includeMcpJson` in agent JSON

**Source:** [Agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)

```json
{
  "includeMcpJson": true
}
```

When `true`, agent merges MCP servers from global + workspace `mcp.json` **in addition to** agent's own `mcpServers`.

**Note:** Complete example in same doc shows legacy field `useLegacyMcpJson` — prefer documented `includeMcpJson`.

### Cursor vs Kiro MCP transform

| Cursor (`build.sh` step 9) | Kiro proposed |
|----------------------------|---------------|
| `.mcp.json` → `mcp.json` at plugin root | Copy to `plugins/maister-kiro/.kiro/settings/mcp.json` OR install tree `~/.kiro/settings/mcp.json` |
| Cursor plugin bundle `mcp.json` | No plugin manifest — workspace/global install |
| Smoke: enable MCP in IDE settings | `kiro-cli chat --require-mcp-startup` for CI fail-fast |

### Per-agent MCP for E2E

`maister-e2e-test-verifier` agent should include Playwright via `includeMcpJson: true` or explicit `mcpServers` + `tools: ["@playwright/*"]` pattern.

**Confidence:** High.

---

## 9. Headless Mode (Smoke / CI)

**Source:** [Headless mode](https://kiro.dev/docs/cli/headless.md)

```bash
kiro-cli chat --no-interactive --trust-all-tools "prompt"
kiro-cli chat --no-interactive --trust-tools=read,grep "prompt"
```

| Flag | Purpose |
|------|---------|
| `--no-interactive` | No TUI, no mid-session input |
| `--trust-all-tools` | Auto-approve tools (smoke) |
| `--trust-tools=cats` | Least-privilege trust |
| `--require-mcp-startup` | Fail if MCP can't connect |

**Auth:** `KIRO_API_KEY` env var (Pro+ tiers).

**Limitations relevant to Maister:**

- No interactive slash commands (`/agent`, `/model` pickers)
- **No AskUserQuestion equivalent** — orchestrator gates won't work
- Subagents need **`trustedAgents`** or subagent tool trust
- Todo requires `chat.enableTodoList true` + trusted `todo` tool

**Cursor smoke comparison:** `platforms/cursor/smoke-cli.sh` uses `agent` CLI with `--plugin-dir`; Kiro likely uses workspace `.kiro/` copy or `KIRO_HOME` override.

**Confidence:** High.

---

## 10. Built-in Tools Reference (Kiro inventory)

**Source:** [Built-in tools](https://kiro.dev/docs/cli/reference/built-in-tools.md)

| Tool | Aliases | Maister relevance |
|------|---------|-------------------|
| `read` | `fs_read` | Core |
| `write` | `fs_write` | Core |
| `shell` | `execute_bash` | Hooks matcher uses `execute_bash` |
| `grep` | — | Explore replacement |
| `glob` | — | Explore replacement |
| `code` | — | LSP / symbol search |
| `subagent` | `use_subagent` | **Task tool replacement** |
| `todo` | — | **Progress tracking** |
| `web_search`, `web_fetch` | — | Research workflows |
| `tool_search` | — | MCP on-demand loading |
| `delegate` | — | Deprecated → use `subagent` |
| `knowledge`, `thinking` | — | Experimental |
| `session` | — | Session setting overrides |
| `summary` | — | Subagent return channel (auto) |

Hook matchers use internal names: `fs_read`, `fs_write`, `execute_bash`, `use_aws` ([Hooks in agent config](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)).

---

## 11. Cursor `build.sh` Transform Checklist → Kiro

| Step | Cursor action | Kiro proposed action | Status |
|------|---------------|---------------------|--------|
| 1 | `.cursor-plugin` manifest | **Skip** — no Kiro plugin manifest; README + install script | Gap |
| 2–4 | `maister:` → `maister-` | **Same** — skill frontmatter + markdown refs | 1:1 |
| 5 | Explore → explore | **`maister-explore` agent** + rewrite spawn instructions | Adapt |
| 6 | AskUserQuestion → AskQuestion | **Chat-native questions** — no sed to AskQuestion | Adapt |
| 7 | Strip EnterPlanMode | **Same** + optional `/plan` docs | 1:1 |
| 8 | CLAUDE.md → AGENTS.md | **Same** + `.kiro/steering/` | 1:1 |
| 9 | MCP rename | → `.kiro/settings/mcp.json` | Adapt path |
| 10 | rules `.mdc` | → `.kiro/steering/maister-workflows.md` | Adapt |
| 11 | Cursor hooks.json | → `hooks` in orchestrator agent JSON | Adapt format |
| 11b | Agent `maister-*` names | → `.kiro/agents/maister-*.json` | **MD→JSON** |
| 12 | quick-plan/quick-bugfix overrides | **Reuse** overrides (adjust AskQuestion refs) | Adapt |
| 13 | init/docs-manager AGENTS | **Same** + steering template | 1:1 |
| 14 | TaskCreate → TodoWrite | **TaskCreate → `todo` tool** + enable setting | Adapt |

---

## 12. Gaps Summary

| Gap | Confidence | Impact | Mitigation |
|-----|------------|--------|------------|
| No `AskQuestion` tool | **High** | P0 — orchestrator gates | Chat-native questions; document protocol |
| No built-in `explore` subagent | **High** | P1 — codebase-analyzer | Custom `maister-explore` JSON agent |
| `todo` experimental + classic-only | **High** | P1 — progress UX | `chat.enableTodoList true`; MVP without todos |
| No Skill tool (explicit) | **High** | P1 — delegation semantics | Slash commands + default agent auto-discovery |
| No `--plugin-dir` | **High** | P1 — smoke install | Workspace `.kiro/` or `KIRO_HOME` |
| Subagent headless approvals | **High** | P0 — CI | `trustedAgents`, `--trust-all-tools` |
| `todo` ≠ TodoWrite API | **Medium** | P2 — transform complexity | New patch file like `orchestrator-patterns-todo.md` |
| `delegate` deprecated | **High** | Low | Ignore; use `subagent` only |

---

## 13. Recommendations for `platforms/kiro-cli/build.sh`

1. **Copy Cursor steps 2–4, 7–8, 12–13** with path substitutions (`steering` not `rules`).
2. **Replace step 6** with AskUserQuestion → "ask user in chat" pattern (not AskQuestion).
3. **Replace step 14** with `todo` tool documentation patch (not TodoWrite).
4. **Add step: generate `.kiro/settings/mcp.json`** from `plugins/maister/.mcp.json`.
5. **Add step: convert agents MD → JSON** with `tools`, `prompt: file://`, `includeMcpJson`, embedded `hooks`, orchestrator `toolsSettings.subagent`.
6. **Emit `maister-orchestrator.json`** with `subagent`, `availableAgents: ["maister-*"]`, `trustedAgents: [...]`.
7. **Emit `maister-explore.json`** read-only explorer agent.
8. **Smoke script:** `kiro-cli settings chat.enableTodoList true` + `chat --no-interactive --trust-all-tools`.
9. **Validate:** grep for `AskQuestion`, `TodoWrite`, `TaskCreate`, `Task tool`, `Skill tool`, `maister:`.

---

## 14. Open Questions

| Question | Confidence |
|----------|------------|
| Does terminal UI support `chat.enableTodoList` (settings say "classic only")? | Low — verify on installed CLI |
| Exact `subagent` tool JSON schema for programmatic spawn (vs NL delegation)? | Medium — docs show NL examples |
| Can custom orchestrator be `chat.defaultAgent` for slash commands? | Medium — `chat.defaultAgent` setting exists |
| Tool name in hooks: `subagent` vs `use_subagent` for PreToolUse matcher? | Medium — use internal names from hooks docs |
| `useLegacyMcpJson` vs `includeMcpJson` — which is current? | Medium — docs list `includeMcpJson`; example shows legacy field |

---

## Source Index

| Source | URL / Path |
|--------|------------|
| Kiro subagents | https://kiro.dev/docs/cli/chat/subagents.md |
| Kiro MCP configuration | https://kiro.dev/docs/cli/mcp/configuration.md |
| Kiro todo lists | https://kiro.dev/docs/cli/experimental/todo-lists.md |
| Kiro headless | https://kiro.dev/docs/cli/headless.md |
| Kiro built-in tools | https://kiro.dev/docs/cli/reference/built-in-tools.md |
| Kiro permissions | https://kiro.dev/docs/cli/chat/permissions.md |
| Kiro plan agent | https://kiro.dev/docs/cli/chat/planning-agent.md |
| Kiro agent config reference | https://kiro.dev/docs/cli/custom-agents/configuration-reference.md |
| Kiro skills | https://kiro.dev/docs/cli/skills.md |
| Kiro settings | https://kiro.dev/docs/cli/reference/settings.md |
| Kiro Q migration | https://kiro.dev/docs/cli/migrating-from-q.md |
| Cursor build.sh | `platforms/cursor/build.sh` |
| Cursor task→todo transform | `platforms/cursor/transforms/task-to-todo.md` |
| Maister MCP source | `plugins/maister/.mcp.json` |
| Maister orchestrator patterns | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` |
| Cursor agent decisions | `docs/cursor-agent-support.md` |
