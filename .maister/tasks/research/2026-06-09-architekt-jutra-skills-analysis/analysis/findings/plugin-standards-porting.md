# Plugin Standards: Skill Porting Requirements

**Gatherer category:** `plugin-standards`  
**Created:** 2026-06-09  
**Task path:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/`

## Scope

This document extracts enforceable Maister plugin conventions for adding new skills and assesses adaptations required when porting external skills (e.g., Architekt Jutra) into `plugins/maister/`. Sources are limited to the `plugin-standards` category from `planning/sources.md` and Phase 3 of `planning/research-plan.md`.

### Primary Sources

| Source | Path | Relevance |
|--------|------|-----------|
| Plugin development standard | `.maister/docs/standards/global/plugin-development.md` | Directory layout, frontmatter, commands, SOT |
| Conventions standard | `.maister/docs/standards/global/conventions.md` | Documentation-first, standards compliance |
| Build pipeline standard | `.maister/docs/standards/global/build-pipeline.md` | Platform transforms, validation gates |
| Tech stack | `.maister/docs/project/tech-stack.md` | Multi-platform architecture, `make validate` |
| Plugin documentation principles | `plugins/maister/CLAUDE.md` § Plugin Documentation Principles | CLAUDE.md authoring, references sizing |
| Build scripts | `platforms/cursor/build.sh`, `platforms/copilot-cli/build.sh`, `platforms/kiro-cli/build.sh` | Concrete transform behavior |
| Validation | `Makefile` (`validate-*` targets) | CI gates for new artifacts |

---

## Requirements for Adding a New Skill

### 1. Directory Structure

**Rule:** Each skill lives in a kebab-case directory under `plugins/maister/skills/` with uppercase `SKILL.md` as the entry point.

```
plugins/maister/skills/<skill-name>/
├── SKILL.md              # Required — single source of truth
└── references/           # Optional — conceptual guidance only
    └── *.md
```

**Additional layout rules:**

| Rule | Source |
|------|--------|
| Edit source only in `plugins/maister/` — never generated variants | `plugin-development.md`, repo `CLAUDE.md` |
| Plugin root layout: `agents/`, `commands/`, `skills/`, `hooks/`, `.claude-plugin/`, `.mcp.json`, `CLAUDE.md` | `plugin-development.md` |
| Cross-reference artifacts with backtick paths (e.g., `` `orchestrator-state.yml` ``), not `@`-prefixed paths | `plugin-development.md` |
| Task artifacts under `.maister/tasks/[type]/YYYY-MM-DD-task-name/` | `plugin-development.md`, `conventions.md` |
| Project docs referenced via `.maister/docs/INDEX.md` | `plugin-development.md` |

**Skill role → directory naming pattern (observed in Maister baseline):**

| Role | Directory example | `name:` frontmatter |
|------|-------------------|---------------------|
| Workflow orchestrator | `development/`, `research/` | `maister:development` |
| On-demand utility | `grill-me/`, `thermos/` | `grill-me` (no prefix) |
| Internal engine | `docs-manager/`, `codebase-analyzer/` | `docs-manager` + `user-invocable: false` |
| Review subagent host | `thermo-nuclear-review/` | `thermo-nuclear-review` + `disable-model-invocation: true` |

---

### 2. Frontmatter Schema

**YAML frontmatter is required** on `SKILL.md`. Fields vary by skill role.

#### User-invocable orchestrator skills

```yaml
---
name: maister:<skill-name>
description: <trigger-rich description for auto-discovery>
user-invocable: true   # optional; default true
---
```

Examples: `maister:development`, `maister:research`, `maister:quick-bugfix`.

#### On-demand utility skills (primary AJ adoption target)

```yaml
---
name: <skill-name>          # plain kebab — NO maister: prefix
description: <trigger phrases for auto-discovery>
argument-hint: "[optional hint]"   # optional
disable-model-invocation: true     # optional — explicit-only invocation
---
```

Examples: `grill-me`, `thermos`, `thermo-nuclear-review`.

**When to use `disable-model-invocation: true`:** Skills that must run only on explicit user request (not auto-discovered from description). Used by `thermos` and both `thermo-nuclear-*` skills. Good match for AJ skills with "Invoked ONLY on explicit request" guards.

#### Internal engine skills

```yaml
---
name: <skill-name>
description: <what the engine does; who invokes it>
user-invocable: false
---
```

Examples: `docs-manager`, `codebase-analyzer`, `implementation-plan-executor`.

#### Agent frontmatter (when skill delegates to subagents)

```yaml
---
name: <agent-name>          # must match filename stem
description: <purpose>
model: inherit
color: <color>
skills:                     # optional — preload skill rubric
  - <skill-name>
---
```

Agents use lowercase kebab-case filenames (e.g., `code-reviewer.md`, `thermo-nuclear-review-subagent.md`).

---

### 3. Commands (Optional)

**Commands are not required for every skill.** On-demand skills like `grill-me` and `thermos` have no command wrapper — they are invoked via the Skill tool when description trigger phrases match.

**When a command is needed:**

| Rule | Detail |
|------|--------|
| Location | Flat `plugins/maister/commands/` — no nested subdirectories |
| Filename | Kebab-case with category prefix: `reviews-*`, `quick-*` (new categories like `modeling-*` follow same flat pattern) |
| Frontmatter | `name: maister:<command-name>` |
| Size | Under ~200 lines |
| Role | Thin wrapper — delegates to skill or agent via Task tool; no orchestration logic |
| Body pattern | Parse user args → invoke subagent/skill immediately |

Example command frontmatter:

```yaml
---
name: maister:reviews-code
description: Run automated code quality, security, and performance analysis
---
```

**Existing command inventory (8 files):** `quick-plan`, `quick-dev`, `quick-bugfix` (via skill), `reviews-code`, `reviews-pragmatic`, `reviews-spec-audit`, `reviews-reality-check`, `reviews-production-readiness`, `work`.

**Adoption implication for AJ:** High-priority on-demand skills (e.g., `requirements-critic`, `problem-classifier`) may ship skill-only (like `grill-me`) or gain a thin command under a new category prefix (e.g., `commands/modeling-problem-classifier.md`). Command is optional if description triggers are sufficient.

---

### 4. Agents (When Required)

Create agents in `plugins/maister/agents/` when a skill delegates work via the Task tool.

| Requirement | Detail |
|-------------|--------|
| Filename | Kebab-case matching agent identifier |
| `name` field | Must match filename stem |
| Size target | 300–450 lines (CLAUDE.md guidelines) |
| Read-only default | Unless agent needs write access (e.g., `task-group-implementer`) |
| Skill preload | `skills:` list in frontmatter when agent loads a skill rubric (see `thermo-nuclear-review-subagent.md`) |
| Cursor transform | Build adds `maister-` prefix to agent `name` |
| Kiro transform | Agents become JSON (`agents/maister-<stem>.json`) + `agents/instructions/maister-<stem>.md` |

**Companion agent pattern restriction:** Only `docs-manager` may use the `docs-operator` companion pattern. Skills that spawn subagents must not use companion agents (`plugin-development.md`).

**AJ porting:** Skills referencing non-Maister `subagent_type` values must either (a) map to existing Maister agents, (b) create new Maister agents, or (c) inline the workflow without subagent delegation.

---

### 5. Documentation in CLAUDE.md

`plugins/maister/CLAUDE.md` is the plugin-level index. New skills require entries following documentation principles.

#### What to add

| Artifact | CLAUDE.md section | Target length | Content focus |
|----------|-------------------|---------------|---------------|
| New skill | Available Skills table | 5–15 lines | Purpose, key capabilities, philosophy |
| New command | Available Commands table | 3–8 lines | What it does, when to use |
| New agent | Available Subagents table | Row entry | Purpose, invoked by, path reference |

#### Principles (do not duplicate SKILL.md)

1. Reference `skills/<name>/SKILL.md` for technical orchestration — do not copy workflow steps
2. Provide principles and decision frameworks, not prescriptive implementations
3. Ask: "Does this duplicate skill.md content?" → reference instead
4. Commands are thin wrappers; orchestration lives in SKILL.md

#### Known gap in current inventory

`grill-me`, `thermos`, and `thermo-nuclear-*` skills exist under `plugins/maister/skills/` but are **not listed** in the CLAUDE.md Available Skills table (as of 2026-06-09). New adopted skills should be documented; consider backfilling these on-demand utilities.

#### Optional manifest update

`plugins/maister/.claude-plugin/plugin.json` description may need updating if new skills materially change the plugin's advertised capabilities.

---

### 6. Build Process

#### Workflow for adding a skill

```
1. Create plugins/maister/skills/<name>/SKILL.md (+ optional references/, agents/)
2. Optionally create plugins/maister/commands/<category>-<name>.md
3. Update plugins/maister/CLAUDE.md (skills/commands/agents tables)
4. make build          # generates maister-copilot, maister-cursor, maister-kiro
5. make validate       # structural checks — must pass before merge
```

#### Platform transforms (source → variant)

| Transform | Claude Code (source) | Cursor | Copilot | Kiro |
|-----------|---------------------|--------|---------|------|
| Skill `name:` | `maister:foo` or `foo` | `maister-foo` | `foo` (prefix stripped) | `maister-foo` |
| Command `name:` | `maister:foo` | `maister-foo` | `foo` | Merged into skill dirs |
| `maister:` refs in body | `maister:agent` | `maister-agent` | `maister-agent` | `maister-agent` |
| `AskUserQuestion` | Source convention | `AskQuestion` | `ask_user` | `**CHAT GATE**` markers |
| `CLAUDE.md` refs | Allowed in source | → `AGENTS.md` | Stripped in skills | → `AGENTS.md` |
| Skill directories | kebab-case | kebab-case (unchanged) | kebab-case | Renamed to `maister-<name>/` |
| `TaskCreate`/`TaskUpdate` | Source (orchestrators) | → `TodoWrite` | Unchanged | Banned — use `todo` |
| `EnterPlanMode`/`ExitPlanMode` | Source (quick-plan) | Removed/overridden | Unchanged | Banned |
| Multi-select UI | Allowed in source | `allow_multiple` on AskQuestion | **Banned** in output | → sequential single-choice |

#### CI gate

All pipelines run `make build && make validate` before publishing (`build-pipeline.md`). Pushes to master touching `plugins/maister/**` or `platforms/**` trigger Copilot variant auto-rebuild.

#### Kiro-specific maintenance when adding skills

Adding a skill currently requires updating hardcoded validation counts in `Makefile`:

- **Rule 14:** exactly 26 skill directories
- **Rule 28:** exactly 26 `maister-*` skill directories
- **Rule 23:** exactly 25 files in `prompts/`

Also verify `platforms/kiro-cli/build.sh` skill registration lists and `agents/maister.json` resources if the new skill needs Kiro slash invocation.

---

## Adoptable Standalone Skill Checklist

Derived from research-plan Phase 3 and plugin standards. Use when evaluating AJ skills for Maister adoption.

| # | Criterion | Enforceable standard |
|---|-----------|---------------------|
| 1 | Kebab-case directory under `plugins/maister/skills/` | `plugin-development.md` |
| 2 | `SKILL.md` is single source of truth; commands are thin wrappers | `plugin-development.md`, CLAUDE.md principles |
| 3 | Frontmatter `description` includes trigger phrases for discovery | Observed pattern (`grill-me`) |
| 4 | On-demand skills: plain `name:` without `maister:` prefix | Observed pattern; AJ `maister:` prefix should be stripped for utilities |
| 5 | Explicit-only skills: `disable-model-invocation: true` + invocation guard in body | `thermos` pattern |
| 6 | Interactive gates use `AskUserQuestion` in source (build transforms per platform) | `build-pipeline.md`, cursor `build.sh` |
| 7 | `references/` files are conceptual (<1,000 lines each, <3,000 total); no production code >10 lines | CLAUDE.md Reference Documentation Guidelines |
| 8 | Subagents reference `maister:<agent>` in source; agents exist in `plugins/maister/agents/` | `build-pipeline.md` |
| 9 | No AJ-specific paths, MCP servers, or registry tables without generalization | Research-plan constraints |
| 10 | Documented in CLAUDE.md Available Skills table | CLAUDE.md principles |
| 11 | `make build && make validate` passes (incl. Kiro count rules) | `build-pipeline.md`, `Makefile` |
| 12 | No companion-agent pattern for subagent-spawning skills | `plugin-development.md` |

---

## Porting Adaptations: External Skill → Maister

### AskUserQuestion vs AskQuestion

| Aspect | Maister convention | AJ likely state | Adaptation |
|--------|-------------------|-----------------|------------|
| Source authoring | Write `AskUserQuestion` | May use `AskUserQuestion` or `AskQuestion` | **Normalize to `AskUserQuestion` in source** — build pipeline handles platform mapping |
| Cursor output | Auto-replaced with `AskQuestion` | N/A | No manual edit needed |
| Copilot output | Auto-replaced with `ask_user` | N/A | Avoid multi-select patterns (validation fails) |
| Kiro output | Replaced with `**CHAT GATE**` markers | N/A | Ensure gates are unambiguous; add headless defaults if orchestrator-scale |
| Multi-select | Allowed in Claude Code source | May use multi-select | Copilot: convert to sequential single-choice; Kiro: build auto-converts |

**Confidence:** High — transforms are automated in `platforms/*/build.sh`.

**Recommendation:** Ported AJ skills should use `AskUserQuestion` exclusively in `plugins/maister/` source. Do not author platform-specific tool names.

---

### `maister:` Prefix

| Context | Maister rule | AJ observed pattern | Adaptation |
|---------|-------------|---------------------|------------|
| Orchestrator skills | `name: maister:<skill>` | Several AJ skills use `maister:` prefix | Keep prefix for workflow-scale skills |
| On-demand utilities | Plain kebab `name:` (no prefix) | Mixed — some AJ skills use `maister:` in a non-Maister repo | **Strip `maister:` prefix** for standalone utilities (match `grill-me`, `requirements-critic` guard pattern) |
| Directory name | Kebab-case matching skill identity | Nested in week/demo folders | Flatten to `plugins/maister/skills/<kebab-name>/` |
| Subagent references in body | `subagent_type: "maister:<agent>"` | May reference non-Maister agents | Map to new or existing Maister agents |
| Command frontmatter | `name: maister:<command>` | N/A | Always prefixed in source commands |

**Build transforms:**

- Cursor/Kiro: `maister:foo` → `maister-foo` (frontmatter and body refs)
- Copilot: `maister:foo` → `foo` (frontmatter); body refs → `maister-foo`

**Confidence:** High.

**Recommendation:** AJ skills like `maister:requirements-critic` should become directory `requirements-critic/` with `name: requirements-critic` (on-demand pattern), not `name: maister:requirements-critic`.

---

### `references/` Directory

| Aspect | Maister rule | Adaptation for AJ |
|--------|-------------|-------------------|
| Purpose | Conceptual patterns, decision frameworks — not implementations | Review AJ `references/` for code-heavy content; trim or refactor |
| Size | <1,000 lines per file; <3,000 lines total per skill | Audit AJ reference files (e.g., `research-methodologies.md`) for overlap with Maister `research/references/` |
| Content bans | No production code >10 lines, no extensive pseudocode | Convert implementation blocks to decision criteria |
| Portability | Tool/framework agnostic where possible | Remove AJ course-week context, Neo4j ontology, AJ-specific registry paths |
| Loading | Referenced from SKILL.md; not loaded at runtime automatically | Add explicit "Read `references/foo.md` before Phase X" gates in SKILL.md |

**Confidence:** High for structure; Medium for content trimming effort (depends per AJ skill).

---

### `disable-model-invocation`

| Aspect | Detail |
|--------|--------|
| Purpose | Prevents automatic skill discovery from description; requires explicit user invocation |
| Maister usage | `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` |
| AJ fit | Skills with "Invoked ONLY on explicit request" or evaluator-only scope (e.g., `incident-diagnosis-review`) |
| Build behavior | Passes through unchanged to all platform variants |
| Complements | Invocation guard prose in SKILL.md body (belt-and-suspenders) |

**When to apply for AJ adoption:**

| AJ skill type | `disable-model-invocation`? |
|---------------|----------------------------|
| Interactive critique (`requirements-critic`) | Optional — `grill-me` works without it (description triggers suffice); add if auto-invocation is undesirable |
| Review/evaluator skills (`test-strategy-reviewer`) | Recommended |
| Domain modeling wizards (`aggregate-designer`) | Optional — likely invoked explicitly via command |
| Platform-specific (`aj-kg-query`) | N/A — not recommended for adoption |

**Confidence:** High.

---

## Additional Porting Considerations

### Subagent and MCP dependencies

| Dependency type | Maister support | AJ porting action |
|-----------------|-----------------|-------------------|
| Maister agents (`code-reviewer`, `information-gatherer`, etc.) | Available | Reuse where workflow fits |
| Custom AJ subagents | Not in Maister | Create new `agents/<name>.md` or inline workflow |
| Neo4j MCP (`aj-kg-query`) | Not in Maister (Playwright MCP only) | Not portable — exclude or replace with codebase search |
| `TaskCreate`/`TaskUpdate` | Claude Code orchestrators only | Do not port to on-demand skills; Cursor/Kiro transforms differ |
| Orchestrator state (`orchestrator-state.yml`) | Full orchestrators only | On-demand AJ skills should avoid orchestrator state pattern |

### Language (Polish/English)

No standard mandates English-only. Maister accepts bilingual skills. Ensure `description` frontmatter includes English trigger phrases for auto-discovery regardless of body language.

### Command surface for AJ clusters

Research plan hypothesizes new command categories for domain modeling skills. Standards allow flat layout with category prefixes — `modeling-*` is convention-compatible alongside `reviews-*` and `quick-*`. Commands remain optional for skill-only invocation.

---

## Gaps and Open Questions

| # | Gap / question | Confidence | Notes |
|---|----------------|------------|-------|
| 1 | `grill-me`, `thermos`, `thermo-nuclear-*` undocumented in CLAUDE.md | High | Standards say to document; current inventory incomplete |
| 2 | Kiro `Makefile` rules 14/28 hardcode skill count (26) | High | Each new skill requires validation rule updates |
| 3 | Whether AJ `maister:` prefixed utilities should keep prefix or strip | High | Standards + observed patterns favor strip for on-demand utilities |
| 4 | Optimal command category for DDD modeling cluster | Medium | `modeling-*` fits flat layout convention; not yet used in Maister |
| 5 | `transcript-critic` vs `requirements-critic` canonical naming | Medium | Comparative gatherer owns decision; standards favor single kebab-case dir |
| 6 | Copilot multi-select in ported AJ skills | High | Must eliminate or sequentialize for Copilot validation |
| 7 | Kiro CHAT GATE headless defaults for interactive AJ skills | Medium | On-demand skills with few gates may need manual defaults in SKILL.md |

---

## Preliminary Recommendations (plugin-standards perspective)

These are structural recommendations only — final adoption ranking belongs to the comparative gatherer.

### High structural fit (minimal adaptation)

Skills matching on-demand utility pattern with `AskUserQuestion` gates and no external MCP:

- `requirements-critic` → `skills/requirements-critic/SKILL.md`, `name: requirements-critic`
- `problem-classifier` → `skills/problem-classifier/SKILL.md`, `name: problem-classifier`
- `test-strategy-reviewer` → `skills/test-strategy-reviewer/SKILL.md`, consider `disable-model-invocation: true`
- `linguistic-boundary-verifier` → `skills/linguistic-boundary-verifier/SKILL.md`

**Per-skill work:** Create skill dir + SKILL.md, port/trim `references/`, add CLAUDE.md table row, `make build && make validate`, update Kiro skill counts.

### Medium structural fit (agent or reference work)

Domain modeling cluster (`aggregate-designer`, `context-distiller`, archetype mappers, `archetype-scanner`):

- Flatten nested AJ paths to kebab-case dirs
- Generalize AJ registry tables into `references/` decision frameworks
- May need new agents for parallel scan patterns (see `archetype-scanner`)
- Optional `commands/modeling-*` wrappers

### Low structural fit (standards conflicts)

| AJ skill | Blocker |
|----------|---------|
| `aj-kg-query` | Requires Neo4j MCP — not in Maister distribution |
| `incident-diagnosis-review` | ATIF/evaluator context — AJ-specific |
| `research-gatherer` | Overlaps `maister:research` orchestrator scope (comparative analysis, not standards) |

### Minimum porting checklist (per skill)

1. Create `plugins/maister/skills/<kebab-name>/SKILL.md`
2. Set frontmatter: plain `name:` for on-demand, or `maister:` for orchestrator-scale
3. Normalize `AskUserQuestion` (remove platform-specific tool names)
4. Add `disable-model-invocation: true` if explicit-only
5. Port `references/` with size/content review
6. Create agents if skill delegates via Task tool
7. Optionally add thin command in `plugins/maister/commands/`
8. Add 5–15 line entry to CLAUDE.md Available Skills
9. Run `make build && make validate`; fix Kiro count rules if needed
10. Never edit `plugins/maister-copilot/`, `plugins/maister-cursor/`, or `plugins/maister-kiro/` directly

---

## Evidence Index

| Claim | Citation |
|-------|----------|
| Kebab-case skill directories | `.maister/docs/standards/global/plugin-development.md` § Kebab-case Skill Directories |
| `maister:*` vs plain names | `.maister/docs/standards/global/plugin-development.md` § Skill Frontmatter Schema |
| Thin commands, flat layout | `.maister/docs/standards/global/plugin-development.md` § Commands As Thin Wrappers |
| SOT in SKILL.md | `.maister/docs/standards/global/plugin-development.md` § Single Source Of Truth In SKILL.md |
| Reference size limits | `plugins/maister/CLAUDE.md` § Reference Documentation Guidelines |
| Cursor AskUserQuestion transform | `platforms/cursor/build.sh` lines 63–66 |
| Copilot ask_user transform | `platforms/copilot-cli/build.sh` lines 69–71 |
| Kiro CHAT GATE transform | `platforms/kiro-cli/build.sh` § Step 8; `build-pipeline.md` § Kiro-Specific API Bans |
| `disable-model-invocation` usage | `plugins/maister/skills/thermos/SKILL.md`, `thermo-nuclear-review/SKILL.md` |
| On-demand naming (no prefix) | `plugins/maister/skills/grill-me/SKILL.md` |
| CI validate gate | `.maister/docs/standards/global/build-pipeline.md` § CI Build and Validate Gate |
| Kiro skill count validation | `Makefile` rules 14, 28 |
