# Findings: Kiro CLI Skills & Steering

**Category:** `kiro-skills-steering`  
**Research question:** Kiro CLI support implementation plan for Maister  
**Sources:** [Kiro CLI skills](https://kiro.dev/docs/cli/skills.md), [steering](https://kiro.dev/docs/cli/steering.md), [slash commands](https://kiro.dev/docs/cli/reference/slash-commands.md), [shared skills spec](https://kiro.dev/docs/skills.md), [Q migration paths](https://kiro.dev/docs/cli/migrating-from-q.md); Maister repo (`platforms/cursor/build.sh`, `plugins/maister/`, `docs/cursor-agent-support.md`)

**Confidence:** High for API facts from official docs; Medium for build/init recommendations (pending agents/hooks gatherer synthesis).

---

## 1. Executive Summary

Kiro CLI aligns closely with Maister’s Cursor direction on **AGENTS.md** and **kebab-case `maister-*` names**, but differs structurally:

| Concern | Kiro CLI | Maister Cursor (today) |
|---------|----------|------------------------|
| User workflows | **Skills only** → `/skill-name` slash commands | `commands/` (8) **+** `skills/` (14) in plugin manifest |
| Persistent project context | `.kiro/steering/*.md` + root **`AGENTS.md`** (always included) | **`AGENTS.md`** + `.cursor/rules/maister-docs.mdc` (`alwaysApply`) |
| Plugin bundle layout | Install tree under `~/.kiro/` or workspace `.kiro/` — **no plugin manifest** | `.cursor-plugin/plugin.json` lists skills, commands, agents, hooks |
| Internal (non-user) skills | **No `user-invocable` equivalent** — all discovered skills become slash commands | `user-invocable: false` on 6 internal skills |
| Skill invocation by orchestrator | Auto-discovery + slash; custom agents need `skill://` URIs | Explicit `Skill` tool (Claude/Cursor) |

**Implication for `platforms/kiro-cli/build.sh`:** Merge `commands/*.md` into `.kiro/skills/` output; map `rules/*.mdc` → `.kiro/steering/`; keep AGENTS.md template path in docs-manager; replace init’s `.cursor/rules/` step with steering file creation.

---

## 2. Kiro Skills API

### 2.1 Locations and precedence

| Location | Scope | Use case |
|----------|-------|----------|
| `.kiro/skills/<dir>/` | Workspace | Project/team workflows (version in git) |
| `~/.kiro/skills/<dir>/` | Global | Personal workflows across projects |

**Precedence:** Workspace skill wins when names collide ([skills.md](https://kiro.dev/docs/cli/skills.md)).

**Q migration mapping:** Amazon Q `rules` → `~/.kiro/steering`; project `.amazonq` still read for backward compat, but new artifacts go to `.kiro/` ([migrating-from-q.md](https://kiro.dev/docs/cli/migrating-from-q.md)).

**Maister distribution hypothesis:** Global install of `plugins/maister-kiro/skills/` → `~/.kiro/skills/` (parity with Cursor `~/.cursor/plugins/local/`), plus optional workspace `.kiro/` for smoke/E2E.

### 2.2 Directory structure

```
<skill-dir>/
├── SKILL.md           # Required
├── references/        # Optional — loaded on demand when SKILL.md points to them
├── scripts/           # Optional (shared spec)
└── assets/            # Optional (shared spec)
```

Skills follow the **open Agent Skills standard** ([skills.md](https://kiro.dev/docs/skills.md), [cli/skills.md](https://kiro.dev/docs/cli/skills.md)).

### 2.3 SKILL.md format and name constraints

YAML frontmatter + markdown body:

```markdown
---
name: pr-review
description: Review pull requests for code quality, security issues, and test coverage. Use when reviewing PRs or preparing code for review.
---
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Lowercase letters, numbers, hyphens only; **max 64 chars**; shared spec says **must match folder name** ([skills.md](https://kiro.dev/docs/skills.md)) |
| `description` | Yes | Activation matching text; **max 1024 chars** |
| `license`, `compatibility`, `metadata` | No | Per shared spec |

**Maister transform:** `name: maister:foo` → `name: maister-foo` (same as Cursor build; satisfies Kiro charset/length for all current Maister skill names).

**Fields to strip or ignore in Kiro output:** Claude-specific `user-invocable`, `argument-hint` (no documented Kiro equivalent in CLI docs — safe to leave as extra YAML or remove in build).

### 2.4 Discovery and activation

1. **Startup:** Kiro loads only `name` + `description` of each skill (progressive disclosure).
2. **Automatic:** Request matched against descriptions → full SKILL.md loaded.
3. **Explicit:** `/skill-name` slash command ([skills.md](https://kiro.dev/docs/cli/skills.md)).

**Arguments:** If body contains `$ARGUMENTS` or `$N` placeholders, trailing slash-command text is substituted; otherwise trailing text is passed as extra context ([cli/skills.md](https://kiro.dev/docs/cli/skills.md)).

**Visibility:** `/context show` lists loaded skills ([cli/skills.md](https://kiro.dev/docs/cli/skills.md)).

### 2.5 Default agent vs custom agents

| Agent type | Skills loading |
|------------|----------------|
| **Default agent** (`kiro_default`) | Auto-loads skills from `.kiro/skills/` and `~/.kiro/skills/` — no config |
| **Custom agents** | **Do not** load skills by default — must add `skill://` URIs to `resources` |

Example custom agent resources ([cli/skills.md](https://kiro.dev/docs/cli/skills.md)):

```json
{
  "name": "my-agent",
  "resources": [
    "skill://.kiro/skills/*/SKILL.md",
    "skill://~/.kiro/skills/*/SKILL.md"
  ]
}
```

`skill://` supports specific paths, globs, and `~` expansion.

**Maister implication:** Orchestrator will likely be a **custom agent JSON** with explicit `skill://` globs for Maister skills + `trustedAgents` for subagents (details in `kiro-agents-hooks` gatherer). Internal skills (`docs-manager`, etc.) can be referenced only from orchestrator/docs-operator agent resources instead of default-agent discovery — mitigates missing `user-invocable`.

### 2.6 Skill tool vs slash commands (Claude/Cursor → Kiro)

| Platform | Orchestrator invokes workflow skill |
|----------|-------------------------------------|
| Claude Code / Cursor | `Skill` tool with skill name |
| Kiro CLI | No separate `Skill` tool in skills docs; **slash command** or **description auto-match**; custom agents preload via `skill://` |

Build must rewrite orchestrator instructions from “invoke Skill tool” to “load/run skill `/maister-development`” or rely on description auto-activation — **open question** (see §8).

---

## 3. Slash Commands Mapping

### 3.1 Built-in vs skill-based

[Kiro slash commands reference](https://kiro.dev/docs/cli/reference/slash-commands.md) lists built-ins (`/help`, `/agent`, `/context`, `/plan`, `/todo`, …). **Skill-based slash commands** are additive:

> Skills defined in `.kiro/skills/` and `~/.kiro/skills/` are automatically available as slash commands. Type `/` followed by the skill name.

Examples from docs: `/pr-review`, `/cdk-deploy`.

### 3.2 Maister command → Kiro slash command map (after build)

| Maister source (Claude) | Cursor output | Kiro target slash |
|-------------------------|---------------|-------------------|
| `commands/quick-plan.md` → `maister:quick-plan` | `/maister-quick-plan` | `/maister-quick-plan` |
| `commands/quick-dev.md` | `/maister-quick-dev` | `/maister-quick-dev` |
| `commands/work.md` | `/maister-work` | `/maister-work` |
| `commands/reviews-*.md` (5 files) | `/maister-reviews-*` | `/maister-reviews-*` |
| `skills/init/SKILL.md` | `/maister-init` (skill) | `/maister-init` |
| `skills/development/SKILL.md` | `/maister-development` | `/maister-development` |
| … orchestrators + utilities | `/maister-*` | `/maister-*` |

**No separate `commands/` directory in Kiro.** Research plan sub-question #5: **commands merge into skills** — confirmed by Kiro API ([sources.md](planning/sources.md) gap table).

### 3.3 Build merge strategy for 8 command files

| Command file | Recommendation |
|--------------|----------------|
| `quick-plan`, `quick-dev` | Emit as `skills/maister-quick-plan/SKILL.md` and `skills/maister-quick-dev/SKILL.md` (or merge body into existing skill if duplicate — currently **commands-only**, no skill twin) |
| `work` | New skill dir `maister-work/` |
| `reviews-*` (5) | Five skill dirs under output `skills/` |
| Overlap with existing skills | `init`, `standards-*`, `development`, etc. already have `skills/*/SKILL.md` — **no command file** |

**Count after Kiro build (estimate):** 14 existing skills + 8 command-as-skill = **22 skill directories** unless command-only entries are merged with existing skill folders (only `quick-bugfix` is skill-only today; `quick-plan`/`quick-dev` are command-only).

---

## 4. Kiro Steering API

### 4.1 Locations and precedence

| Location | Scope |
|----------|-------|
| `.kiro/steering/*.md` | Workspace |
| `~/.kiro/steering/*.md` | Global (team MDM possible) |

Workspace overrides global on conflict ([steering.md](https://kiro.dev/docs/cli/steering.md)).

### 4.2 Foundational files (included every interaction by default)

Documented defaults ([steering.md](https://kiro.dev/docs/cli/steering.md)):

| File | Purpose |
|------|---------|
| `product.md` | Product purpose, users, features |
| `tech.md` | Stack, libraries, constraints |
| `structure.md` | Layout, naming, architecture |

Custom steering: any other `.md` in `.kiro/steering/` (e.g. `api-standards.md`).

**Note:** Shared [skills.md](https://kiro.dev/docs/skills.md) mentions steering modes (`always`, `auto`, `fileMatch`, `manual`) for IDE; **CLI steering doc** describes automatic loading of `.kiro/steering/` without frontmatter modes — treat mode metadata as **IDE-specific** unless CLI reference says otherwise (gap: Low confidence on CLI file-level modes).

### 4.3 Custom agents and steering

Custom agents **do not** auto-include steering. Add to `resources`:

```json
{
  "resources": ["file://.kiro/steering/**/*.md"]
}
```

([steering.md](https://kiro.dev/docs/cli/steering.md))

### 4.4 AGENTS.md support

> Kiro supports providing steering directives via the **AGENTS.md standard**. AGENTS.md files are in markdown format, similar to Kiro steering files; however, **AGENTS.md files are always included**.

Placement ([steering.md](https://kiro.dev/docs/cli/steering.md)):

- Workspace root `AGENTS.md`
- Global: `~/.kiro/steering/AGENTS.md` (implied by “global steering file location”)

**Critical for Maister:** Kiro natively supports the same **AGENTS.md** pattern Cursor adopted in `platforms/cursor/build.sh` (decision #6, [cursor-agent-support.md](../../../docs/cursor-agent-support.md)).

---

## 5. Comparison: Maister Cursor vs Kiro CLI

### 5.1 Project instructions at init

| Step | Cursor (`platforms/cursor/build.sh`) | Kiro (proposed) |
|------|--------------------------------------|-----------------|
| Primary doc | `AGENTS.md` via docs-manager template | Same — `agents-md-template.md` |
| Always-on “read INDEX.md” | `.cursor/rules/maister-docs.mdc` copied to **project** on init | `.kiro/steering/maister-docs.md` (or similar) — **no `.mdc` / `alwaysApply`** |
| Plugin-wide workflows | `rules/maister-workflows.mdc` from `CLAUDE.md` | `.kiro/steering/maister-workflows.md` in **plugin install tree** or workspace |
| Template source | `platforms/cursor/rules/maister-docs.mdc` | Adapt content to plain markdown steering file |

**Cursor `maister-docs.mdc` content** (repo: `platforms/cursor/rules/maister-docs.mdc`):

```markdown
Before starting any task, read `.maister/docs/INDEX.md` first...
Follow standards in `.maister/docs/standards/`...
```

**Kiro equivalent:** Single steering file in project `.kiro/steering/maister-docs.md` with same prose — loaded automatically in default agent sessions ([steering.md](https://kiro.dev/docs/cli/steering.md)).

### 5.2 Plugin documentation placement

| Cursor | Kiro |
|--------|------|
| `plugins/maister-cursor/rules/maister-workflows.mdc` (`alwaysApply: true`) | `plugins/maister-kiro/` → ship as `steering/maister-workflows.md` under global `~/.kiro/steering/` **or** document workspace copy |
| Removes root `CLAUDE.md` from variant | Same — transform `CLAUDE.md` → steering markdown, drop Claude-specific doc links |

Build.sh step reference: Cursor steps 10, 13, 18–19 in `platforms/cursor/build.sh`.

### 5.3 AGENTS.md template and repo example

Maister fork already uses AGENTS.md at repo root (`AGENTS.md`) matching docs-manager template (`platforms/cursor/templates/agents-md-template.md`):

- Read `.maister/docs/INDEX.md` first
- `/maister-*` → execute via Skill tool (Kiro build must rephrase to slash/skill loading)

### 5.4 Naming parity

Grill decision #5 / #15: prefix **`maister-foo`** — compatible with Kiro `name` rules ([cursor-agent-support.md](../../../docs/cursor-agent-support.md)).

---

## 6. Maister Source Inventory (skills & commands)

### 6.1 Skills (`plugins/maister/skills/` — 14)

| Skill dir | `name` (source) | `user-invocable` | Kiro slash (after transform) |
|-----------|-----------------|------------------|------------------------------|
| development | maister:development | true | `/maister-development` |
| research | maister:research | true | `/maister-research` |
| product-design | maister:product-design | true | `/maister-product-design` |
| performance | maister:performance | true | `/maister-performance` |
| migration | maister:migration | true | `/maister-migration` |
| init | maister:init | (unset) | `/maister-init` |
| standards-update | maister:standards-update | (unset) | `/maister-standards-update` |
| standards-discover | maister:standards-discover | (unset) | `/maister-standards-discover` |
| quick-bugfix | maister:quick-bugfix | (unset) | `/maister-quick-bugfix` |
| docs-manager | maister:docs-manager | **false** | Internal — limit exposure |
| orchestrator-framework | maister:orchestrator-framework | **false** | Internal |
| implementation-plan-executor | … | **false** | Internal |
| implementation-verifier | … | **false** | Internal |
| codebase-analyzer | … | **false** | Internal |

### 6.2 Commands only (`plugins/maister/commands/` — 8)

All `name: maister:*` — become **new skill folders** in Kiro output: `work`, `quick-plan`, `quick-dev`, `reviews-code`, `reviews-pragmatic`, `reviews-spec-audit`, `reviews-reality-check`, `reviews-production-readiness`.

---

## 7. Init & docs-manager Implications

### 7.1 Current docs-manager contract (source)

`plugins/maister/skills/docs-manager/SKILL.md`:

- **Mandatory** CLAUDE.md integration (operation §7 “Manage CLAUDE.md Integration”)
- Template: `references/claude-md-template.md`
- Location reference: project `CLAUDE.md` as config anchor

**Cursor build transforms** (`platforms/cursor/build.sh` §13):

- `claude-md-template.md` → `agents-md-template.md`
- “Manage CLAUDE.md Integration” → “Manage AGENTS.md Integration”
- `CLAUDE.md` → `AGENTS.md` string replacements in skills

### 7.2 Kiro-specific init changes (recommended)

| Init step (Cursor) | Kiro replacement |
|------------------|------------------|
| Verify/create `AGENTS.md` with template | **Keep** — Kiro always includes AGENTS.md |
| Create `.cursor/rules/maister-docs.mdc` | Create **`.kiro/steering/maister-docs.md`** in project root (copy from plugin template) |
| standards-discover: `.claude/CLAUDE.md` → `.cursor/rules` | Point extractor at **`AGENTS.md`** + **`.kiro/steering/`** |

**docs-manager patch list for `build-kiro`:**

1. Replace all `CLAUDE.md` → `AGENTS.md` (same as Cursor).
2. Replace “Manage CLAUDE.md Integration” → “Manage AGENTS.md Integration”.
3. Add operation note: optional **“.kiro/steering integration”** — ensure `maister-docs.md` exists after init.
4. Update `agents-md-template.md` Maister Workflows bullet: “invoke Skill tool” → “follow skill `/maister-*`” or “execute skill instructions”.
5. Bundle steering template: `platforms/kiro-cli/templates/steering-maister-docs.md` (from `maister-docs.mdc` body).

### 7.3 `.maister/docs/` unchanged

Steering/skills changes do **not** alter `.maister/docs/` layout — INDEX.md remains SOT ([docs-manager/SKILL.md](../../../../plugins/maister/skills/docs-manager/SKILL.md)).

---

## 8. Gaps

| Gap | Severity | Confidence | Notes |
|-----|----------|------------|-------|
| No `user-invocable: false` in Kiro | **High** | High | All skills in default agent paths become slash commands; mitigate via custom default orchestrator agent + selective `skill://` |
| No `commands/` API | **High** | High | Must duplicate 8 command MD files as SKILL.md trees |
| No plugin manifest / marketplace | **High** | High | Install tree copy to `~/.kiro/` ([research plan](../../../planning/research-plan.md)) |
| `Skill` tool references in orchestrators | **Medium** | Medium | Rewrite to slash invocation or auto-activation semantics |
| Steering `always`/`fileMatch` modes on CLI | **Low** | Low | IDE doc mentions modes; CLI steering page does not |
| `argument-hint` frontmatter | **Low** | Medium | No Kiro doc equivalent; use `$ARGUMENTS` in SKILL body for slash args |
| Folder name must match `name` | **Medium** | High | Ensure output dirs are `maister-foo/` not `foo/` |

---

## 9. Recommendations for `platforms/kiro-cli/build.sh`

1. **Output layout:** `plugins/maister-kiro/skills/<name>/SKILL.md` → installed to `~/.kiro/skills/` (and `steering/`, `agents/` per other gatherers).
2. **Merge commands:** For each `commands/*.md`, emit `skills/maister-<cmd>/SKILL.md` (frontmatter `name` + body from command).
3. **Name transform:** `maister:` → `maister-`; validate length ≤ 64.
4. **Strip/transform:** Remove or ignore `user-invocable`; map `argument-hint` to documented `$ARGUMENTS` pattern where needed.
5. **Steering:** Convert `CLAUDE.md` + Platform section → `steering/maister-workflows.md`; ship `steering/maister-docs.md` template for init.
6. **docs-manager / init:** Mirror Cursor AGENTS.md patches; replace `.cursor/rules/` paths with `.kiro/steering/`.
7. **Validate:** Grep rules — no `maister:`, no `.cursor/rules`, SKILL.md `name` matches parent folder, kebab-case.
8. **Internal skills:** Either (a) omit from global `~/.kiro/skills/` and only reference from custom agent `skill://` paths, or (b) accept extra slash commands and document as advanced.

---

## 10. Open Questions

| # | Question | Confidence |
|---|----------|------------|
| 1 | Can Kiro hide specific skills from slash completion while keeping them in `skill://` resources? | **Low** — not documented |
| 2 | Best rewrite for “execute via Skill tool immediately” in AGENTS.md / orchestrators? | **Medium** — likely “run `/maister-<skill>`” or rely on description match |
| 3 | Global vs workspace install for `maister-workflows` steering — always-on without project init? | **Medium** — global `~/.kiro/steering/` mirrors Cursor plugin rules |
| 4 | Should foundational `product.md`/`tech.md`/`structure.md` be generated at init or only Maister-specific steering? | **Medium** — init already generates `.maister/docs/project/*`; avoid duplication |
| 5 | Headless smoke: are skill slash commands invocable via `kiro-cli chat --no-interactive`? | **Low** — needs `kiro-tools-mcp` / smoke gatherer |

---

## 11. Source Index

| Topic | URL |
|-------|-----|
| CLI Skills | https://kiro.dev/docs/cli/skills.md |
| CLI Steering | https://kiro.dev/docs/cli/steering.md |
| Slash commands (skill section) | https://kiro.dev/docs/cli/reference/slash-commands.md |
| Shared Agent Skills | https://kiro.dev/docs/skills.md |
| Q → Kiro paths | https://kiro.dev/docs/cli/migrating-from-q.md |
| Maister Cursor build | `platforms/cursor/build.sh` |
| Maister docs rule template | `platforms/cursor/rules/maister-docs.mdc` |
| AGENTS.md template | `platforms/cursor/templates/agents-md-template.md` |
| Grill decisions | `docs/cursor-agent-support.md` § decisions #5–6, #15–16, §8 |
