# Cursor Desktop plugin agents ↔ Task / `subagent_type` discovery

Research date: 2026-07-21  
Scope: How Cursor registers custom agents from plugins for the Task tool, with Maister local-plugin context.

Evidence classes used below:
- **Confirmed (docs)** — official Cursor documentation
- **Confirmed (Cursor staff / forum)** — Cursor employee replies on forum.cursor.com
- **Confirmed (local install)** — files/settings on this machine
- **Observed (this session)** — runtime prompt/tool catalog in the agent that wrote this note
- **Speculation** — inference not stated in docs

---

## TL;DR

1. **Yes — Cursor documents plugin `agents` as a first-class plugin component**, via `plugin.json` `"agents"` and/or default `agents/` discovery. Format is markdown + YAML frontmatter (`name`, `description`).  
2. **Task discovery is documented primarily for project/user agent folders** (`.cursor/agents/`, `~/.cursor/agents/`, plus Claude/Codex compat paths) — **not** explicitly for plugin install roots. Docs never say “plugin agents are file-only / non–Task-discoverable.”  
3. **Cursor staff treat plugin agents as Task-visible** when the plugin loads correctly; community reports show **intermittent loading bugs** (restart required; marketplace plugins sometimes load MCP-only).  
4. **Practical fallback** with strongest docs coverage: copy/symlink agents into `~/.cursor/agents/` or project `.cursor/agents/`, then **reload Cursor**. Skills/rules/MCP are separate surfaces and do not register Task `subagent_type`s.

---

## Key Decisions

| Decision | Verdict | Confidence | Basis |
| --- | --- | --- | --- |
| Does `plugin.json` `"agents"` exist and matter? | **Yes** | High | Plugins reference |
| Expected agent file format for plugins? | `.md`/`.mdc`/`.markdown` under `agents/` (or manifest path); frontmatter `name` + `description`; body = prompt | High | Plugins reference + plugin-template |
| Do plugin agents *should* become Task `subagent_type`s? | **Intended yes** (when plugin components load) | Medium–High | Staff forum reply; packaging docs; template ships `agents/` |
| Is there a documented “file-only, not Task-discoverable” limitation? | **No such documented limitation** | High | Absence in Subagents + Plugins docs |
| Why Maister skills visible but agents missing from Task? | Likely **loader/session wiring or stale session**, not wrong Maister manifest shape | Medium | Local format matches template; skills load; known plugin-component load bugs |
| Best alternative registration? | **User/project `.cursor/agents/`** (+ restart) | High | Subagents docs + create-subagent skill |

---

## Open Questions & Risks

1. **Docs gap:** Subagents docs list Task discovery locations and omit plugins; Plugins docs package agents but never say “these become Task `subagent_type`s.” Bridging behavior is underspecified.  
2. **Partial component load:** Skills can load while agents do not — is that a known product bug, CLI-vs-Desktop difference, or session-start caching? Not documented.  
3. **Restart / reload requirement:** Staff confirmed new agents often need Cursor restart to enter the Task enum. Risk for local plugin iteration.  
4. **Non-standard frontmatter:** Maister uses `color` and `skills:` arrays. Not in Cursor agent frontmatter tables. Unknown whether they break registration or are ignored.  
5. **Session skew:** This research subagent’s prompt lists many `maister-*` types under `available_subagent_types`, while the parent task reports only built-ins. Treat discovery as **session-dependent** until reproduced with a controlled reload.  
6. **Marketplace vs local:** Forum reports marketplace plugins installing MCP-only (skills/rules/agents missing). Local `~/.cursor/plugins/local` may share related loader bugs.  
7. **Name vs filename:** Template uses matching `security-reviewer.md` / `name: security-reviewer`. Maister filenames omit `maister-` prefix while `name:` includes it — docs allow filename-derived names; unclear if mismatch ever confuses tooling.

---

## Context: Maister local install (confirmed local)

| Item | Value |
| --- | --- |
| Install root | `~/.cursor/plugins/local/maister` |
| Enabled | `~/.cursor/settings.json` → `plugins.maister.enabled: true`, `root` → that path |
| Manifest | `.cursor-plugin/plugin.json` includes `"agents": "./agents/"`, `"skills": "./skills/"`, `"hooks": "./hooks/hooks.json"` |
| Agent files | 29 × `agents/*.md` with `name: maister-…`, `description`, usually `model: inherit` |
| User agents dir | `~/.cursor/agents/` exists (empty for this user at research time) |
| Project agents dir | Worktree has **no** `.cursor/agents/` |

Sample frontmatter (Maister):

```yaml
name: maister-code-reviewer
description: "Automated code quality..."
model: inherit
color: orange   # not in official Cursor agent field tables
```

Official template agent (`cursor/plugin-template` → `plugins/starter-advanced/agents/security-reviewer.md`):

```yaml
name: security-reviewer
description: Security-focused reviewer that checks for common vulnerabilities and unsafe defaults.
```

Maister’s shape matches the documented plugin agent format for required fields; extras (`color`, `skills`) are beyond published Cursor agent fields.

---

## Q1. Does Cursor support custom agents via plugin.json `agents` for Task?

### Confirmed (docs)

**Plugins package agents.** Official Plugins overview and Plugins reference state plugins can bundle **Agents** (“Custom agent configurations and prompts”), and the manifest optional field:

- `agents` — path(s) to agent files or directories  

Sources:
- https://cursor.com/docs/plugins  
- https://cursor.com/docs/reference/plugins.md  

**Discovery rules (plugins):**

- Default: `agents/` → all `.md`, `.mdc`, `.markdown`  
- If `"agents": "./agents/"` is set, that path **replaces** default discovery for agents (default folder is not also scanned)

**Local plugin testing** is documented: put plugin under `~/.cursor/plugins/local/<name>`, ensure `.cursor-plugin/plugin.json` at root, then **Restart Cursor** or **Developer: Reload Window**. Verify list in docs examples: “rules, skills, or MCP servers” (agents not named in that verify sentence — docs gap, not a denial).

**Task / subagents docs** describe custom subagents and Task delegation, and say custom subagents’ `description` appears in **Task tool hints**. File locations documented:

| Type | Location |
| --- | --- |
| Project | `.cursor/agents/`, `.claude/agents/`, `.codex/agents/` |
| User | `~/.cursor/agents/`, `~/.claude/agents/`, `~/.codex/agents/` |

Source: https://cursor.com/docs/subagents.md  

**Plugins are not listed** in that table.

### Confirmed (Cursor staff / forum)

Forum thread where Task rejected a user-folder agent with enum of built-ins + **plugin** agents:

> “Some of those listed agents are from plugins so those seem to work…”  
> Staff (Dean Rie): “If you can see the built-in and **plugin subagents**, that means the Task tool itself is working.”

Resolution for user agents: **restart Cursor** after creating files.

Source: https://forum.cursor.com/t/message-not-a-valid-subagent-type-when-creating-a-custom-agent/159054  

### Speculation

Cursor **intends** plugin agents to populate Task `subagent_type` when the plugin loader succeeds. Official Subagents docs simply haven’t been updated to list plugin install roots alongside `.cursor/agents/`. Absence of an explicit “plugin agents → Task” sentence is a documentation gap, not proof of non-support.

---

## Q2. Expected agent file format and naming

### Confirmed (docs) — Plugins reference

- Location: `agents/` (or manifest `agents` path)  
- Files: `.md`, `.mdc`, or `.markdown`  
- YAML frontmatter fields documented for plugins:

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Agent identifier (lowercase, kebab-case) |
| `description` | string | Brief description of the agent's purpose |

Body after frontmatter = agent prompt/behavior.

Source: https://cursor.com/docs/reference/plugins.md § Agents format  

### Confirmed (docs) — Subagents (richer Task-oriented schema)

For project/user subagents, Subagents docs additionally document:

| Field | Default | Notes |
| --- | --- | --- |
| `name` | derived from filename | lowercase + hyphens |
| `description` | — | shown in Task tool hints |
| `model` | `inherit` | or specific model ID |
| `readonly` | `false` | restricts writes |
| `is_background` | `false` | async subagent |

Source: https://cursor.com/docs/subagents.md  

### Confirmed (local skill) — create-subagent

`~/.cursor/skills-cursor/create-subagent/SKILL.md` documents only:

- `.cursor/agents/` (project)  
- `~/.cursor/agents/` (user)  

Troubleshooting “Subagent Not Found” lists those paths only — **not** `~/.cursor/plugins/local/.../agents/`.

### Confirmed (template)

`https://github.com/cursor/plugin-template` → `plugins/starter-advanced/`:

- Ships `agents/security-reviewer.md`  
- Manifest does **not** need an explicit `"agents"` field (folder discovery)  
- Maister’s explicit `"agents": "./agents/"` is valid and equivalent for that path

### Naming

- **Confirmed:** `name` is kebab-case identifier used as the agent id / Task type.  
- **Confirmed:** if `name` omitted, Subagents docs say it is derived from filename.  
- **Speculation:** prefer `name` matching the intended Task `subagent_type` string; filename matching `name` reduces ambiguity.

---

## Q3. Known limitation: plugin agents file-only / not Task-discoverable?

### Confirmed (docs)

**No.** No official statement that plugin agents are decorative or non–Task-discoverable. Agents are listed as a peer component to skills/rules/commands.

### Confirmed (forum) — opposite expectation

Staff language assumes plugin subagents appear in the Task allowed-values list when plugins load.

### Confirmed (forum) — related loading bugs (not “by design”)

- Custom agents missing from Task enum until **restart** (user agents).  
- Task tool missing entirely in some versions while `<subagent_delegation_context>` still injected (older 2.4.x reports).  
- Marketplace plugins sometimes install **MCP only**; skills/rules/commands/**subagents** inaccessible — staff: “known issue… team is aware.”

Sources:
- https://forum.cursor.com/t/message-not-a-valid-subagent-type-when-creating-a-custom-agent/159054  
- https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors/149771  
- https://forum.cursor.com/t/no-skill-rule-command-subagent-access-in-plugins-only-mcp/152468  

### Speculation

If Maister skills appear but agents do not in Task:

1. **Incomplete plugin component binding** for agents (bug), or  
2. **Stale agent session** started before agents were registered (restart/new chat needed), or  
3. **Surface split:** skills injected into skill catalog; agents require a separate registry refresh for Task enum  

None of these are documented as intentional “file-only agents.”

### Observed (this session) — contradictory runtime signal

The writing agent’s Task tool catalog includes numerous `maister-*` entries (e.g. `maister-code-reviewer`, `maister-explore`) alongside built-ins (`generalPurpose`, `cursor-guide`, `bugbot`, …). That suggests **in at least one Desktop agent session on this machine, plugin agents are Task-discoverable**. Parent-reported “only built-ins” may reflect a different session, CLI host, or pre-reload state — treat as open risk #5.

---

## Q4. Alternative registration paths

| Mechanism | Registers Task `subagent_type`? | Notes | Evidence class |
| --- | --- | --- | --- |
| Project `.cursor/agents/*.md` | **Yes (documented)** | Highest-priority project scope | Confirmed docs |
| User `~/.cursor/agents/*.md` | **Yes (documented)** | All projects; restart often required | Confirmed docs + staff |
| `.claude/agents/`, `.codex/agents/` | **Yes (compat)** | Listed in Subagents docs | Confirmed docs |
| Plugin `agents/` + `plugin.json` | **Intended yes** | Underspecified vs Task docs | Confirmed packaging docs; staff; speculation on reliability |
| Skills (`skills/*/SKILL.md`) | **No** | Separate skill surface; Maister skills visible ≠ agents | Confirmed docs (skills vs subagents) |
| Rules (`.mdc`) | **No** | Persistent guidance only | Confirmed docs |
| MCP servers | **No** | Tools/resources, not subagent types | Confirmed docs |
| Hooks | **No** for types | Can observe `subagentStart`/`Stop`; `workspaceOpen` can return plugin paths to load | Confirmed docs |
| AGENTS.md / create-rule | **No** | Project instructions / rules, not Task enum | Confirmed create-rule skill |

### Practical workarounds (speculation + community practice)

1. **Flatten into project agents:** symlink or copy Maister `agents/*.md` → `<repo>/.cursor/agents/` (matches Subagents docs discovery).  
2. **Flatten into user agents:** same into `~/.cursor/agents/`.  
3. **Reload:** Developer: Reload Window or full Cursor restart after changes.  
4. **Installer tools** (e.g. community `agents-pkg --project`) explicitly symlink plugin agents into `.cursor/agents/` because that path is the reliably documented Task discovery root — third-party practice, not Cursor docs.

---

## Source index

### Official Cursor docs
- Plugins overview: https://cursor.com/docs/plugins  
- Plugins reference: https://cursor.com/docs/reference/plugins.md  
- Subagents: https://cursor.com/docs/subagents.md  

### Bundled Cursor skills (local)
- `~/.cursor/skills-cursor/create-subagent/SKILL.md` — project/user agents only; no plugin path  
- `~/.cursor/skills-cursor/create-rule/SKILL.md` — rules only; unrelated to Task types  

### Template
- https://github.com/cursor/plugin-template (`plugins/starter-advanced/agents/security-reviewer.md`)  

### Forum
- Plugin agents in Task enum + restart fix: https://forum.cursor.com/t/message-not-a-valid-subagent-type-when-creating-a-custom-agent/159054  
- Task tool missing / custom agents broken (historical): https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors/149771  
- Plugin non-MCP components missing: https://forum.cursor.com/t/no-skill-rule-command-subagent-access-in-plugins-only-mcp/152468  

### Local Maister evidence
- `~/.cursor/plugins/local/maister/.cursor-plugin/plugin.json`  
- `~/.cursor/plugins/local/maister/agents/*.md`  
- `~/.cursor/settings.json` → `plugins.maister`

---

## Implications for Maister (actionable, mostly speculation)

1. **Manifest/format is not the smoking gun** — Maister matches official plugin agent packaging.  
2. **First debug step:** full Cursor reload / new Agent chat; confirm agents under Customize / Settings → Agents if UI shows them.  
3. **Reliability fallback:** dual-publish agents to `~/.cursor/agents/` or project `.cursor/agents/` (docs-backed Task discovery).  
4. **Consider stripping or testing without** undocumented `color` / `skills:` frontmatter if registration remains flaky.  
5. **Do not expect** rules, skills, or MCP to substitute for Task `subagent_type` registration.
