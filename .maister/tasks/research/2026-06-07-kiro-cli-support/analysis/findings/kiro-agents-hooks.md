# Kiro CLI: Custom Agents & Hooks

**Category:** `kiro-agents-hooks`  
**Gathered:** 2026-06-07  
**Research question:** Kiro CLI support implementation plan for Maister

---

## Executive Summary

Kiro custom agents are **JSON files** (not Markdown) stored in `~/.kiro/agents/` (global) or `.kiro/agents/` (workspace). Hooks are **embedded in agent JSON** under a `hooks` object — there is no standalone `hooks.json` equivalent to Claude Code or Cursor plugins.

Maister must add a **build-time MD→JSON generator** for 24 `plugins/maister/agents/*.md` files, embed workflow hooks in a **dedicated orchestrator agent** (e.g. `maister-orchestrator.json`), and adapt hook scripts for Kiro's stdin/stdout contract (`preToolUse` exit code 2 blocks; no `permissionDecision` JSON).

**Critical gaps vs Cursor:** no `preCompact` hook, no `subagentStart`/`subagentStop` hooks — destructive-command protection must be redesigned (likely `preToolUse` on `subagent` + `shell` with agent name from Kiro hook event fields).

---

## 1. Kiro Agent JSON Schema (Official)

**Source:** [Agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)

| Field | Purpose | Maister relevance |
|-------|---------|-------------------|
| `name` | Agent ID (optional; derived from filename) | Map from `name:` frontmatter → `maister-*` prefix (Cursor parity) |
| `description` | Human-readable summary | Direct map from frontmatter `description:` |
| `prompt` | System context (inline or `file://`) | Map from Markdown body (after frontmatter) |
| `tools` | Whitelist of built-in + MCP tools | **No source field** — must be inferred per agent role |
| `allowedTools` | Auto-approved tools (no prompt) | Security layer for read-only vs write agents |
| `toolsSettings` | Per-tool config (`shell.deniedCommands`, `write.allowedPaths`) | Alternative/complement to bash-blocking hook |
| `resources` | `file://` and `skill://` URIs | Skills steering, steering files, orchestrator patterns |
| `hooks` | Lifecycle/tool hooks (see §3) | Replaces `hooks/hooks.json` |
| `includeMcpJson` | Pull MCP from `~/.kiro/settings/mcp.json` | Map from `.mcp.json` |
| `mcpServers` | Inline MCP config | Playwright MCP for e2e/user-docs agents |
| `model` | Model ID override | `model: inherit` in Maister has no Kiro equivalent — omit or map to default |

**Filename rule:** `"The filename (without .json) becomes the agent's name"` when `name` is omitted ([config reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)).

**Prompt via external file (recommended for 24 agents):**

```json
{
  "name": "maister-gap-analyzer",
  "description": "...",
  "prompt": "file://./prompts/maister-gap-analyzer.md"
}
```

Relative `file://` paths resolve relative to the agent JSON directory ([config reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)).

---

## 2. MD → JSON Conversion (Maister `agents/*.md`)

### 2.1 Current Maister agent format

**Source:** `plugins/maister/agents/*.md` (24 files)

Example frontmatter (`gap-analyzer.md`):

```yaml
---
name: gap-analyzer
description: Compares current vs desired state...
model: inherit
color: blue
---
```

**Observed frontmatter fields across 24 agents:**

| Field | Count | Kiro mapping |
|-------|-------|--------------|
| `name` | 24/24 | → JSON `name` with `maister-` prefix (Cursor build step 11b) |
| `description` | 24/24 | → JSON `description` |
| `model: inherit` | 23/24 | **Drop** or omit `model` (Kiro falls back to default) |
| `color` | 23/24 | **Drop** — no Kiro equivalent |
| `skills` | 1/24 (`docs-operator`) | → `resources: ["skill://.kiro/skills/docs-manager/SKILL.md"]` |

**No `tools` field** exists in any Maister agent file — Claude Code plugin agents inherit platform tool policies. Kiro **requires** explicit `tools` (and typically `allowedTools`) per agent JSON.

### 2.2 Recommended conversion algorithm (`build.sh`)

```
FOR each plugins/maister/agents/{basename}.md:
  1. Parse YAML frontmatter (name, description, skills)
  2. kiro_name = "maister-" + name (if not already prefixed)
  3. Write body (sans frontmatter) to agents/prompts/{kiro_name}.md
  4. Emit agents/{kiro_name}.json:
       {
         "name": kiro_name,
         "description": <from frontmatter>,
         "prompt": "file://./prompts/{kiro_name}.md",
         "tools": <from role table §2.3>,
         "allowedTools": <from role table>,
         "resources": <optional skill:// + file:// refs>,
         "includeMcpJson": true   // for MCP-dependent agents
       }
```

**Rationale for `file://` prompt:** Maister agent bodies are 300–500+ lines ([`plugins/maister/CLAUDE.md`](plugins/maister/CLAUDE.md) agent guidelines). Inline JSON strings are unwieldy; external prompts match Kiro best practices ([creating custom agents](https://kiro.dev/docs/cli/custom-agents/creating.md)).

### 2.3 Tool whitelist inference (no source metadata)

Because Maister agents lack `tools:` frontmatter, `build.sh` needs a **role-based lookup table**:

| Agent category | Examples | Suggested `tools` | Notes |
|----------------|----------|-------------------|-------|
| Read-only analysis | gap-analyzer, spec-auditor, research-* | `read`, `grep`, `glob`, `code` | Match read-only subagent pattern |
| Implementation | task-group-implementer | `read`, `write`, `shell`, `grep`, `glob` | Restrict destructive shell via hook or `toolsSettings.shell.deniedCommands` |
| Test execution | test-suite-runner | `read`, `shell`, `grep` | Whitelist in destructive-command bypass |
| MCP browser | e2e-test-verifier, user-docs-generator | `read`, `@playwright/*` or `includeMcpJson` + MCP tools | Requires Playwright MCP in build output |
| Orchestrator (new) | maister-orchestrator (generated) | `subagent`, `todo`, `read`, `write`, `shell`, … | Not a source agent — synthesized in build |

**Confidence:** Medium — role inference is reasonable but should be validated against each agent's actual tool usage in body text during build validate.

### 2.4 `docs-operator` skills frontmatter

**Source:** `plugins/maister/agents/docs-operator.md`

```yaml
skills:
  - docs-manager
```

**Kiro mapping:**

```json
{
  "resources": [
    "skill://.kiro/skills/maister-docs-manager/SKILL.md"
  ]
}
```

Use built skill path after `maister:` → `maister-` rename ([`platforms/cursor/build.sh`](platforms/cursor/build.sh) step 3).

**Alternative:** Rely on default agent skill auto-discovery — but explicit `skill://` ensures progressive loading per [config reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md).

### 2.5 Subagent delegation (`subagent` tool)

**Source:** [Built-in tools — Subagent](https://kiro.dev/docs/cli/reference/built-in-tools.md)

Orchestrator agent needs:

```json
{
  "tools": ["subagent", "todo", "read", "write", "shell", ...],
  "toolsSettings": {
    "subagent": {
      "availableAgents": ["maister-*"],
      "trustedAgents": ["maister-*"]
    }
  }
}
```

- `availableAgents` / `trustedAgents` support glob patterns
- Custom agents referenced **by name** when delegating (analogous to Cursor `subagent_type: "maister-gap-analyzer"`)
- Max 4 parallel subagents ([built-in tools](https://kiro.dev/docs/cli/reference/built-in-tools.md))

**No built-in `explore` subagent** in Kiro — Maister needs `maister-explore` custom agent or codebase tools (`read`/`grep`/`glob`/`code`).

---

## 3. Hooks: Kiro vs Claude vs Cursor

### 3.1 Architectural difference

| Platform | Hook location | Discovery |
|----------|---------------|-----------|
| Claude Code | `plugins/maister/hooks/hooks.json` | Plugin manifest auto-discovery |
| Cursor | `platforms/cursor/hooks/hooks.json` → `plugins/maister-cursor/hooks/` | `.cursor-plugin` manifest `hooks` key |
| **Kiro** | `hooks` field **inside agent JSON** | Per-agent; no global plugin hooks file |

**Source (Kiro):** [Hooks](https://kiro.dev/docs/cli/hooks.md), [Agent configuration reference — Hooks field](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)

### 3.2 Hook type mapping

| Maister hook (Cursor) | Maister hook (Claude) | Kiro hook | Matcher | Feasibility |
|----------------------|----------------------|-----------|---------|-------------|
| `beforeShellExecution` | `PreToolUse` (`Bash`) | `preToolUse` | `shell` or `execute_bash` | **Direct** — same script logic, different block mechanism |
| `sessionStart` | `SessionStart` (no matcher) | `agentSpawn` | — | **Partial** — fires on agent activation, not every session start |
| `preCompact` | `SessionStart` (`compact`) | — | — | **GAP — no Kiro equivalent** |
| `subagentStart` | — | — | — | **GAP — no Kiro equivalent** |
| `subagentStop` | — | — | — | **GAP — no Kiro equivalent** |
| — | — | `userPromptSubmit` | — | **New option** for skill-invocation reminder on each prompt |
| — | — | `postToolUse` | e.g. `fs_write` | Not used by Maister today |
| — | — | `stop` | — | Potential post-turn validation (not in Maister today) |

### 3.3 Kiro hook contract

**Source:** [Hooks](https://kiro.dev/docs/cli/hooks.md)

**Input (stdin):** JSON with `hook_event_name`, `cwd`, `session_id`; tool hooks add `tool_name`, `tool_input`, `tool_response` (post only).

**Output / exit codes:**

| Exit code | `preToolUse` behavior | Maister adaptation |
|-----------|----------------------|-------------------|
| 0 | Allow (stdout captured, not shown) | Default allow |
| 2 | **Block** — STDERR returned to LLM | Replace Claude `permissionDecision: deny` JSON |
| Other | Warning to user, allow | Error logging |

**Blocking example (Kiro):** write blocking message to STDERR, `exit 2` — not JSON `permission` object like Cursor's `beforeShellExecution`.

**Cursor blocking** (`platforms/cursor/hooks/block-destructive-commands.sh`):

```json
{
  "permission": "deny",
  "user_message": "...",
  "agent_message": "..."
}
```

**Claude blocking** (`plugins/maister/hooks/block-destructive-commands.sh`):

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "..."
  }
}
```

→ Kiro build must ship **`block-destructive-commands-kiro.sh`** using exit code 2 + STDERR.

### 3.4 Proposed hooks embed (orchestrator agent only)

Embed in `maister-orchestrator.json` (or default workflow agent):

```json
{
  "hooks": {
    "agentSpawn": [
      {
        "command": "${KIRO_PLUGIN_ROOT}/hooks/skill-invocation-reminder.sh",
        "timeout_ms": 10000
      }
    ],
    "userPromptSubmit": [
      {
        "command": "${KIRO_PLUGIN_ROOT}/hooks/skill-invocation-reminder.sh",
        "timeout_ms": 10000
      }
    ],
    "preToolUse": [
      {
        "matcher": "shell",
        "command": "${KIRO_PLUGIN_ROOT}/hooks/block-destructive-commands.sh",
        "timeout_ms": 5000
      },
      {
        "matcher": "subagent",
        "command": "${KIRO_PLUGIN_ROOT}/hooks/subagent-spawn-tracker.sh",
        "timeout_ms": 5000
      }
    ],
    "postToolUse": [
      {
        "matcher": "subagent",
        "command": "${KIRO_PLUGIN_ROOT}/hooks/subagent-complete-cleanup.sh",
        "timeout_ms": 5000
      }
    ]
  }
}
```

**Notes:**
- Kiro uses `timeout_ms` ([hooks.md](https://kiro.dev/docs/cli/hooks.md)); Cursor uses `timeout` (seconds) in `hooks.json`
- `${KIRO_PLUGIN_ROOT}` is a **proposed** env var (like `CURSOR_PLUGIN_ROOT`) — **not documented in Kiro**; may need absolute paths or wrapper scripts
- `userPromptSubmit` partially replaces `sessionStart` skill reminder (fires every prompt, not once per session)

### 3.5 Subagent tracking workaround (Cursor dependency)

Cursor's `block-destructive-commands.sh` depends on `subagentStart` to write agent type to `.hook-state/`:

**Source:** `platforms/cursor/hooks/subagent-start-tracker.sh`, `subagent-stop-cleanup.sh`

```
subagentStart → writes subagent-{id}.type
beforeShellExecution → reads type to apply whitelist bypass
subagentStop → cleans up state files
```

**Kiro gap:** No `subagentStart`/`subagentStop`. Mitigation options:

1. **`preToolUse` matcher `subagent`** — parse `tool_input` for target agent name before spawn; persist to `.hook-state/`
2. **`toolsSettings.subagent.trustedAgents`** — only bypass destructive blocks for trusted execution agents (coarser than per-command)
3. **`toolsSettings.shell.deniedCommands`** on non-trusted agent JSON files — defense in depth at agent config level ([config reference — toolsSettings.shell](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md))

**Confidence:** Medium — option 1 needs empirical test of Kiro `preToolUse` payload for `subagent` tool.

### 3.6 Post-compaction reminder (`preCompact` gap)

**Cursor script:** `platforms/cursor/hooks/post-compact-reminder.sh` — injects `user_message` with `orchestrator-state.yml` path after compaction.

**Claude equivalent:** `SessionStart` matcher `compact` in `plugins/maister/hooks/hooks.json`.

**Kiro:** No compaction lifecycle hook documented.

**Mitigations:**
- `userPromptSubmit` hook checks compaction heuristics (unreliable)
- Document manual recovery in orchestrator patterns
- `stop` hook with block decision to force state re-read (heavy-handed)

**Confidence:** High that this is a real gap.

---

## 4. Global vs Local Agent Paths

**Sources:** [Configuration reference — File locations](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md), [Creating custom agents — Directory values](https://kiro.dev/docs/cli/custom-agents/creating.md), [Migrating from Q — Configuration file paths](https://kiro.dev/docs/cli/migrating-from-q.md)

| Scope | Path | Default for `/agent create` |
|-------|------|----------------------------|
| Workspace (local) | `.kiro/agents/*.json` | `--directory workspace` |
| User (global) | `~/.kiro/agents/*.json` | **Yes** (when `--directory` omitted) |

**Precedence:** Local first → global fallback; same name in both → **local wins with warning** ([config reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)).

### Maister distribution strategy

| Strategy | Use case | Parity |
|----------|----------|--------|
| **Global install** `~/.kiro/agents/` + `~/.kiro/skills/` | User plugin install (like Cursor `smoke-install.sh`) | Cursor local/GH marketplace install |
| **Workspace `.kiro/`** | E2E in CI, project-pinned version | Cursor `--plugin-dir` / workspace rules |
| **Both** | Global plugin + optional project override | Kiro native precedence model |

**Recommendation:** `plugins/maister-kiro/` tree copied/symlinked to `~/.kiro/` for smoke; validate supports workspace install for headless `kiro-cli chat --no-interactive` ([research plan](planning/research-plan.md) Phase 4).

**Launch with custom agent:**

```bash
kiro-cli --agent maister-orchestrator
```

([Creating custom agents](https://kiro.dev/docs/cli/custom-agents/creating.md))

---

## 5. `resources` Field: `skill://` and `file://`

**Source:** [Configuration reference — Resources field](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)

### 5.1 URI schemes

| Scheme | Load behavior | Maister use |
|--------|---------------|-------------|
| `file://` | Full content at agent startup | `file://.kiro/steering/**/*.md`, orchestrator reference files |
| `skill://` | Metadata at startup; full content on demand | All Maister skills for orchestrator agent |

**Glob support:** Both schemes support globs, e.g. `skill://.kiro/skills/**/SKILL.md`.

### 5.2 Recommended orchestrator resources

```json
{
  "resources": [
    "skill://.kiro/skills/**/SKILL.md",
    "file://.kiro/steering/**/*.md",
    "file://.kiro/agents/prompts/maister-orchestrator-patterns.md"
  ]
}
```

Optional: package `skills/orchestrator-framework/references/orchestrator-patterns.md` as a `file://` resource for the orchestrator agent instead of relying on skill progressive load.

### 5.3 Skills vs resources vs slash commands

- Skills in `.kiro/skills/<dir>/SKILL.md` are auto-discoverable for slash commands (`/maister-development`)
- `skill://` in `resources` gives orchestrator **progressive** access without bloating context
- `docs-operator` should use explicit `skill://.kiro/skills/maister-docs-manager/SKILL.md`

**Creating custom agents example** includes the canonical resources pattern:

```json
"resources": [
  "file://README.md",
  "file://.kiro/steering/**/*.md",
  "skill://.kiro/skills/**/SKILL.md"
]
```

([creating.md](https://kiro.dev/docs/cli/custom-agents/creating.md))

---

## 6. Comparison to Maister Cursor Hooks Pipeline

### 6.1 Cursor build step (reference)

**Source:** [`platforms/cursor/build.sh`](platforms/cursor/build.sh) steps 11, 11b

```
# 11. Hooks: replace with Cursor format
rm -rf "$OUT/hooks"
cp -R "$PLATFORM/hooks" "$OUT/hooks"
chmod +x "$OUT/hooks/"*.sh
mkdir -p "$OUT/.hook-state"

# 11b. Agent frontmatter: maister-* prefix
```

Cursor output: **MD agents unchanged** + standalone `hooks/hooks.json`.

Kiro output: **JSON agents** + hooks embedded in orchestrator JSON + adapted `.sh` scripts (no `hooks.json`).

### 6.2 Hook inventory

| Script | Cursor event | Purpose |
|--------|--------------|---------|
| `block-destructive-commands.sh` | `beforeShellExecution` | Block git stash/reset/rm -rf for non-whitelisted subagents |
| `post-compact-reminder.sh` | `preCompact` | Point to `orchestrator-state.yml` after compaction |
| `skill-invocation-reminder.sh` | `sessionStart` | Enforce Skill tool for `/maister-*` commands |
| `subagent-start-tracker.sh` | `subagentStart` | Track active subagent type for bash guard |
| `subagent-stop-cleanup.sh` | `subagentStop` | Clean `.hook-state/` |

**Claude source** (`plugins/maister/hooks/hooks.json`): only `SessionStart` + `PreToolUse(Bash)` — no subagent hooks. Cursor added subagent tracking in `platforms/cursor/hooks/`.

### 6.3 Env var mapping

| Cursor | Claude | Proposed Kiro |
|--------|--------|---------------|
| `CURSOR_PLUGIN_ROOT` | `CLAUDE_PLUGIN_ROOT` | `KIRO_PLUGIN_ROOT` or install-relative path |
| `CURSOR_PROJECT_DIR` | — | `cwd` from hook JSON (Kiro provides) |

---

## 7. Gaps

| Gap | Severity | Confidence |
|-----|----------|------------|
| No standalone `hooks.json` — must duplicate hook config if multiple agents need same hooks | Medium | High |
| No `preCompact` / post-compaction hook | High | High |
| No `subagentStart`/`subagentStop` — bash guard needs redesign | High | High |
| No `permissionDecision` JSON — scripts must use exit 2 + STDERR | Low (adaptable) | High |
| Maister agents lack `tools` metadata — inference table required | Medium | High |
| `color`, `model: inherit` not portable | Low | High |
| `${KIRO_PLUGIN_ROOT}` not in Kiro docs | Medium | Medium |
| No plugin manifest / `--plugin-dir` — install is filesystem copy | Medium | High (per research plan) |

---

## 8. Recommendations for `platforms/kiro-cli/build.sh`

1. **Add `agents/` generator step** — parse frontmatter, emit `agents/*.json` + `agents/prompts/*.md`
2. **Synthesize `maister-orchestrator.json`** — embed all workflow hooks; include `subagent` + `todo` tools
3. **Copy/adapt hook scripts** from `platforms/cursor/hooks/`:
   - Rewrite `block-destructive-commands.sh` for Kiro exit code 2
   - Replace `subagent-start/stop` with `preToolUse`/`postToolUse` on `subagent` matcher
   - Drop or stub `post-compact-reminder.sh` until Kiro adds compaction hooks
4. **Map `sessionStart` reminder** → `agentSpawn` + optionally `userPromptSubmit`
5. **Apply `maister-` prefix** to agent `name` (same as Cursor step 11b)
6. **Per-agent `tools`/`allowedTools` table** in `platforms/kiro-cli/agent-tools.json` (maintainable manifest)
7. **Validate:** `jq` parse all `agents/*.json`; grep no `hooks.json`; confirm hook commands reference existing `.sh` files
8. **Global install layout** for `plugins/maister-kiro/`:
   ```
   agents/
   agents/prompts/
   skills/
   steering/   (from rules template)
   hooks/
   settings/mcp.json
   ```

---

## 9. Open Questions

| Question | Confidence | Next step |
|----------|------------|-----------|
| Does `preToolUse` on `subagent` expose target agent name in `tool_input` for tracking? | Low | Headless smoke test |
| Can hooks use env vars like `$KIRO_PLUGIN_ROOT` in `command` field? | Medium | Test with `kiro-cli --agent` |
| Should every Maister agent JSON include `hooks.preToolUse.shell` or only orchestrator? | Medium | Security review — subagents inherit own agent config |
| Is `userPromptSubmit` on every prompt too noisy for skill reminder? | Medium | Compare UX vs `agentSpawn` only |
| Per-agent `tools` inference vs adding `tools:` to source MD frontmatter? | Medium | Team decision — source change vs build table |
| `trustedAgents: ["maister-*"]` — does it bypass shell prompts entirely? | Medium | Read [chat permissions](https://kiro.dev/docs/cli/chat/permissions.md) in tools gatherer |

---

## 10. Source Index

### Kiro documentation
- [Agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference.md)
- [Creating custom agents](https://kiro.dev/docs/cli/custom-agents/creating.md)
- [Hooks](https://kiro.dev/docs/cli/hooks.md)
- [Built-in tools (subagent)](https://kiro.dev/docs/cli/reference/built-in-tools.md)
- [Migrating from Q — configuration paths](https://kiro.dev/docs/cli/migrating-from-q.md)

### Maister codebase
- `plugins/maister/agents/*.md` — 24 source agents (YAML frontmatter + body)
- `plugins/maister/hooks/hooks.json` — Claude hook events
- `plugins/maister/hooks/block-destructive-commands.sh` — Claude PreToolUse block format
- `platforms/cursor/hooks/hooks.json` — Cursor hook events (5 types)
- `platforms/cursor/hooks/*.sh` — Adapted hook scripts
- `platforms/cursor/build.sh` — Steps 11–11b (hooks copy, agent rename)
- `plugins/maister-cursor/hooks/` — Generated Cursor output (parity check)
- `docs/cursor-agent-support.md` — Decision #15–16 (kiro same pattern as Cursor)
