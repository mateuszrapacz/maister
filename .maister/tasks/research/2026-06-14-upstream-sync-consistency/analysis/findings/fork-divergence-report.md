# Fork Divergence Report

**Category:** `fork-divergence`  
**Task:** Upstream Sync Consistency Research  
**Date:** 2026-06-14  
**Gatherer:** maister-information-gatherer  

## Executive Summary

The fork (`origin/master`, `mateuszrapacz/maister`) diverged from upstream (`SkillPanel/maister`) at commit **`1fc5d3c`** (*Bump version to 2.1.7*). Since then, the fork accumulated **34 commits** touching **501 files** (+72,297 / −40 lines), while upstream advanced **2 commits** on the same base.

Fork work centers on **multi-platform support** (Cursor, Kiro, Kilo), **Wave 1 AJ skills**, **grill-me/thermos review skills**, **init UX improvements**, and a **multi-variant build pipeline**. Upstream work centers on **quick-* command→skill refactor**, **Maister rebrand**, and **docs/standards awareness**.

**Overlap in `plugins/maister/` source:** 3 files (`plugin.json`, `CLAUDE.md`, `skills/init/SKILL.md`). All three require manual merge during cherry-pick.

---

## Divergence Baseline

| Metric | Value |
|--------|-------|
| Common ancestor | `1fc5d3c` — Bump version to 2.1.7 |
| Fork HEAD | `d3e8298` — Complete Wave 1 AJ skills adoption verification (E1) |
| Fork commits | 34 |
| Fork files changed | 501 |
| Upstream commits since base | 2 (`fb5a8f3`, `679958b`) |
| Fork current version | 2.2.0 (`plugins/maister/.claude-plugin/plugin.json`) |
| Upstream current version | 2.1.8 |

---

## Commit Inventory (34 commits, newest first)

```
d3e8298 Complete Wave 1 AJ skills adoption verification (E1).
ea5ab29 chore: regenerate copilot/cursor variants after build-script fix
607ed5b Port Wave 1 AJ skills with quick-* commands and build integration (v2.2.0)
ab14051 fix(kiro): add project-level .kiro/skills/ to agent resources
b63dee6 feat(kilo): add Kilo CLI support and fix build script markdown replacement
03f9dab fix(kiro): generate shortcut skills in build.sh step 20
3a49581 feat(kiro): replace @prompts with /slash shortcut skills
bda6d95 fix(rtk): handle exit code 3 (ask/rewrite available) from rtk rewrite
8979b48 feat(kiro): replace --no-rtk with --with-rtk, add --full flag
e0a3b9d feat(kiro): add --no-rtk flag to smoke-install.sh
865143f feat(kiro): add RTK hook for token-optimized shell commands
d523395 fix(kiro): inject $ARGUMENTS into all 20 user-facing skills
ee8e45d fix(kiro): inject $ARGUMENTS into /work skill for Kiro CLI argument passing
f1a1067 fix(work): add $ARGUMENTS placeholder so /work <text> passes argument to skill
b2fe02a fix(init): use numbered list for Phase 3 context gate
3f8de99 fix(init): consolidate Phase 3 context questions into single smart-defaults gate
ec4ecc5 fix(kiro-cli): align agent config with Kiro CLI docs
9866695 fix(kiro): wildcard tools, lazy skill resources, allowedTools, includeMcpJson, auto-install defaults
c900a3c fix(kiro): use absolute paths for hooks/skills, remove resources from orchestrator context
8580682 Rebuild Cursor thermos skill after subagent syntax source fix.
fabe8cf Add full Kiro @prompt set and fix thermos subagent build transform.
bd5f18f Rename Kiro @plan prompt to @quick-plan to avoid /plan collision.
1204ea1 Add grill-me and thermos review skills from Cursor plugins.
b08af9c Adapt Maister Kiro plugin for Terminal UI instead of classic todo flow.
56a9528 Document Kiro @prompts to slash-skill mapping in user guide.
4cfa9ad Install maister-kiro shell aliases during Kiro smoke-install.
729acce Add Kiro CLI platform support for Maister workflows.
023c7db Restore Cursor Agent planning and analysis docs.
1f627fc Fix Cursor IDE plugin discovery and simplify local install.
dfc5f55 Remove internal Cursor Agent planning docs.
75f67d5 Add symlink option to maister-cursor local install.
1707a26 Bump version to 2.1.8.
f5beb76 Document Cursor Agent E2E verification results.
c726313 Add Cursor Agent variant (maister-cursor) with CLI-first build pipeline.
```

---

## Commits Grouped by Theme

### 1. Cursor (6 commits + 1 shared build)

| Commit | Summary |
|--------|---------|
| `c726313` | Add Cursor Agent variant (`maister-cursor`) with CLI-first build pipeline — foundational |
| `f5beb76` | Document Cursor Agent E2E verification results |
| `75f67d5` | Add symlink option to `maister-cursor` local install |
| `dfc5f55` | Remove internal Cursor Agent planning docs |
| `1f627fc` | Fix Cursor IDE plugin discovery and simplify local install |
| `023c7db` | Restore Cursor Agent planning and analysis docs |
| `8580682` | Rebuild Cursor thermos skill after subagent syntax source fix *(shared with thermos/build)* |

**Scope:** `platforms/cursor/` (build.sh, hooks, smoke-install, overrides), `plugins/maister-cursor/` (generated), `.cursor-plugin/marketplace.json`, `docs/cursor-agent-*.md`.

**Key artifacts:**
- Cursor-specific hooks (subagent tracking, destructive command blocking, skill invocation reminder)
- Platform overrides for `quick-plan` command and `quick-bugfix` skill
- `maister-docs.mdc` rule, `task-to-todo` transform, orchestrator TodoWrite patch

---

### 2. Kiro (18 commits + 2 shared)

| Commit | Summary |
|--------|---------|
| `729acce` | Add Kiro CLI platform support — foundational (build.sh, agent-tools.json, hooks, tests) |
| `4cfa9ad` | Install `maister-kiro` shell aliases during smoke-install |
| `56a9528` | Document Kiro @prompts → slash-skill mapping |
| `b08af9c` | Adapt Kiro plugin for Terminal UI (TUI vs classic todo flow) |
| `bd5f18f` | Rename `@plan` prompt → `@quick-plan` (avoid `/plan` collision) |
| `fabe8cf` | Add full Kiro @prompt set; fix thermos subagent build transform |
| `c900a3c` | Absolute paths for hooks/skills; remove resources from orchestrator context |
| `9866695` | Wildcard tools, lazy skill resources, allowedTools, includeMcpJson |
| `ec4ecc5` | Align agent config with Kiro CLI docs |
| `f1a1067` | Add `$ARGUMENTS` placeholder to `/work` skill |
| `ee8e45d` | Inject `$ARGUMENTS` into `/work` skill |
| `d523395` | Inject `$ARGUMENTS` into all 20 user-facing skills |
| `865143f` | Add RTK hook for token-optimized shell commands |
| `e0a3b9d` | Add `--no-rtk` flag to smoke-install.sh |
| `8979b48` | Replace `--no-rtk` with `--with-rtk`; add `--full` flag |
| `bda6d95` | Handle RTK exit code 3 (ask/rewrite available) |
| `3a49581` | Replace `@prompts` with `/slash` shortcut skills |
| `03f9dab` | Generate shortcut skills in build.sh step 20 |
| `ab14051` | Add project-level `.kiro/skills/` to agent resources |

**Scope:** `platforms/kiro-cli/` (~581-line build.sh, 10+ test scripts, hooks, overrides), `plugins/maister-kiro/` (generated), `docs/kiro-cli-support.md`.

**Evolution arc:** @prompts → slash shortcut skills; classic todo → TUI delegation; RTK token optimization; `$ARGUMENTS` injection for CLI argument passing.

---

### 3. Kilo (1 commit)

| Commit | Summary |
|--------|---------|
| `b63dee6` | Add Kilo CLI support; fix build script markdown replacement |

**Scope:** `platforms/kilo-cli/` (build.sh, smoke-install.sh), `plugins/maister-kilo/` (generated — `.kilo/agents/`, kilo.json).

**Side effect:** Fixed malformed nested bolding in MANDATORY GATE markdown across 5 orchestrator skills (`development`, `migration`, `performance`, `product-design`, `research`).

---

### 4. AJ Skills — Wave 1 (3 commits)

| Commit | Summary |
|--------|---------|
| `607ed5b` | Port Wave 1 AJ skills with quick-* commands and build integration (v2.2.0) |
| `ea5ab29` | Regenerate copilot/cursor variants after build-script fix |
| `d3e8298` | Complete Wave 1 AJ skills adoption verification (E1) |

**New source skills:**
- `skills/problem-classifier/SKILL.md` (489 lines)
- `skills/requirements-critic/SKILL.md` (279 lines)
- `skills/transcript-critic/SKILL.md` (225 lines)

**New source commands:**
- `commands/quick-problem-classifier.md`
- `commands/quick-requirements-critic.md`
- `commands/quick-transcript-critic.md`

**Also updated:** `CLAUDE.md` (Requirements & Modeling sections), `plugin.json` (2.2.0), Kiro build pipeline for AJ skill delegation transforms.

---

### 5. Grill-me & Thermos (2 commits + 1 shared build)

| Commit | Summary |
|--------|---------|
| `1204ea1` | Add grill-me and thermos review skills from Cursor plugins |
| `fabe8cf` | Fix thermos subagent build transform; expand Kiro @prompt set |
| `8580682` | Rebuild Cursor thermos skill after subagent syntax source fix |

**New source files:**
- `skills/grill-me/SKILL.md`
- `skills/thermos/SKILL.md`
- `skills/thermo-nuclear-review/SKILL.md`
- `skills/thermo-nuclear-code-quality-review/SKILL.md`
- `agents/thermo-nuclear-review-subagent.md`
- `agents/thermo-nuclear-code-quality-review-subagent.md`

**Propagated to:** maister-copilot, maister-cursor, maister-kiro (via build).

---

### 6. Init (2 commits)

| Commit | Summary |
|--------|---------|
| `3f8de99` | Consolidate Phase 3 context questions into single smart-defaults gate |
| `b2fe02a` | Use numbered list format for Phase 3 context gate |

**Changed file:** `plugins/maister/skills/init/SKILL.md`

**Semantic change:** Phase 3 Step 3 moved from 5 separate AskUserQuestion calls to a single gate presenting inferred values (name, description, goals, team, requirements) as a numbered list for confirm/correct.

**Upstream also touches init:** Maister rebrand in description/title only — no Phase 3 logic change. Merge risk: **low on logic, medium on surrounding text**.

---

### 7. Build & Versioning (cross-cutting)

| Commit | Summary |
|--------|---------|
| `1707a26` | Bump version to 2.1.8 (parallel to upstream `679958b`) |
| `607ed5b` | Bump to 2.2.0 with AJ skills |
| `ea5ab29` | Regenerate copilot/cursor after build-script fix |
| `8580682` | Rebuild after thermos subagent syntax fix |
| `c726313` | Makefile + build pipeline for Cursor |
| `729acce` | Makefile + build pipeline for Kiro |
| `b63dee6` | Kilo build pipeline + markdown replacement fix |
| `607ed5b` | Makefile validate rules for AJ quick-* commands |

**Makefile changes:** Multi-platform `build`, `validate`, `smoke-*` targets for cursor/kiro/kilo variants.

**Generated variants (never edit directly):**
- `plugins/maister-cursor/` — Cursor Agent
- `plugins/maister-kiro/` — Kiro CLI
- `plugins/maister-kilo/` — Kilo CLI
- `plugins/maister-copilot/` — Copilot CLI (regenerated)

---

## Overlap Analysis: `plugins/maister/` vs Upstream

Computed via `comm -12` on changed paths since `1fc5d3c`:

### Overlapping Files (both sides changed)

| File | Fork changes | Upstream changes | Merge risk |
|------|-------------|------------------|------------|
| `plugins/maister/.claude-plugin/plugin.json` | Version 2.1.7 → 2.2.0 | Version 2.1.7 → 2.1.8 | **High** — version conflict |
| `plugins/maister/CLAUDE.md` | +AJ skills, grill-me, thermos sections; task-classifier clarification | Maister rebrand; quick-plan/quick-dev skill entries; removes command refs | **High** — both add content in Skills/Commands tables |
| `plugins/maister/skills/init/SKILL.md` | Phase 3 smart-defaults gate (Steps 3–4) | Maister rebrand in title/description only | **Medium** — fork logic + upstream text |

### Upstream-Only Changes (fork did not touch)

| File | Upstream intent |
|------|-----------------|
| `commands/quick-dev.md` | **Deleted** — migrated to skill |
| `commands/quick-plan.md` | **Deleted** — migrated to skill |
| `hooks/hooks.json` | Hook config updates |
| `skills/docs-manager/references/claude-md-template.md` | Template updates |
| `skills/docs-manager/references/index-md-template.md` | Template updates |
| `skills/quick-bugfix/SKILL.md` | Simplified skill |
| `skills/quick-dev/SKILL.md` | **New** — standards-aware direct dev |
| `skills/quick-plan/SKILL.md` | **New** — standards-aware planning |
| `skills/research/references/research-methodologies.md` | Methodology updates |

**Semantic note:** Fork still has `commands/quick-dev.md` and `commands/quick-plan.md` at HEAD (unchanged since `1fc5d3c`). Upstream deletes these and adds `skills/quick-dev/` and `skills/quick-plan/`. This is a **design divergence**, not captured in overlapping file list.

### Fork-Only Changes (upstream lacks)

| Category | Files |
|----------|-------|
| **AJ skills** | `skills/problem-classifier/`, `skills/requirements-critic/`, `skills/transcript-critic/`, `commands/quick-{problem-classifier,requirements-critic,transcript-critic}.md` |
| **Grill-me & thermos** | `skills/grill-me/`, `skills/thermos/`, `skills/thermo-nuclear-review/`, `skills/thermo-nuclear-code-quality-review/`, `agents/thermo-nuclear-*-subagent.md` |
| **Orchestrator markdown fix** | `skills/development/`, `skills/migration/`, `skills/performance/`, `skills/product-design/`, `skills/research/` (MANDATORY GATE formatting) |
| **Init UX** | `skills/init/SKILL.md` Phase 3 gate (partial overlap — see above) |

---

## Preserve List (Integration Constraints)

These fork-only features **must survive** upstream cherry-pick integration:

### 1. AJ Skills (Wave 1)

| Asset | Type | Preserve action |
|-------|------|-----------------|
| `problem-classifier` | Skill + `quick-problem-classifier` command | Keep entire skill + command; no upstream equivalent |
| `requirements-critic` | Skill + `quick-requirements-critic` command | Keep entire skill + command |
| `transcript-critic` | Skill + `quick-transcript-critic` command | Keep entire skill + command |
| CLAUDE.md sections | Requirements & Modeling Skills/Commands tables | Merge with upstream Maister rebrand + quick-* skill entries |
| Kiro build transforms | AJ skill delegation in `platforms/kiro-cli/build.sh` | Rebuild after source merge |

### 2. Grill-me

| Asset | Type | Preserve action |
|-------|------|-----------------|
| `skills/grill-me/SKILL.md` | Skill | Keep; fork-only |
| Kiro `/grill-me` shortcut skill | Generated | Rebuild via `make build` |
| Cursor/Copilot variants | Generated | Rebuild |

### 3. Thermos (Thermo-nuclear Review Suite)

| Asset | Type | Preserve action |
|-------|------|-----------------|
| `skills/thermos/SKILL.md` | Orchestrator skill | Keep; launches both thermo subagents in parallel |
| `skills/thermo-nuclear-review/SKILL.md` | Review skill | Keep |
| `skills/thermo-nuclear-code-quality-review/SKILL.md` | Review skill | Keep |
| `agents/thermo-nuclear-review-subagent.md` | Subagent | Keep |
| `agents/thermo-nuclear-code-quality-review-subagent.md` | Subagent | Keep |
| Kiro `/thermos`, `/thermo-review`, `/thermo-quality` | Generated shortcut skills | Rebuild |
| Thermos subagent build transform | `platforms/kiro-cli/build.sh` | Preserve transform logic |

### 4. Platform Support

| Platform | Source paths | Generated output | Preserve action |
|----------|-------------|------------------|-----------------|
| **Cursor** | `platforms/cursor/` | `plugins/maister-cursor/` | Keep entire platform directory; rebuild after merge |
| **Kiro** | `platforms/kiro-cli/` | `plugins/maister-kiro/` | Keep entire platform directory + 18 commits of CLI adaptations |
| **Kilo** | `platforms/kilo-cli/` | `plugins/maister-kilo/` | Keep entire platform directory |
| **Copilot** | `platforms/copilot-cli/` (existing) | `plugins/maister-copilot/` | Regenerate only; no direct edits |
| **Makefile** | Multi-platform build/validate/smoke targets | — | Merge carefully; fork adds cursor/kiro/kilo targets |
| **Platform overrides** | `platforms/cursor/overrides/commands/quick-plan.md`, `platforms/kiro-cli/overrides/commands/quick-plan.md`, `platforms/*/overrides/skills/quick-bugfix/` | — | Must reconcile with upstream quick-* skill migration |

### 5. Init Phase 3 Gate (fork UX improvement)

| Asset | Preserve action |
|-------|-----------------|
| Smart-defaults single AskUserQuestion gate | Keep fork logic; apply upstream Maister rebrand text around it |

### 6. Orchestrator MANDATORY GATE Fix

| Asset | Preserve action |
|-------|-----------------|
| Fixed markdown in 5 orchestrator skills | Keep fork formatting fix from `b63dee6` |

---

## Fork Feature Map (Non-`plugins/maister/` Highlights)

| Area | Files | Commits |
|------|-------|---------|
| Cursor platform | 15 files under `platforms/cursor/` | 6+ |
| Kiro platform | 30+ files under `platforms/kiro-cli/` | 18+ |
| Kilo platform | 2 files under `platforms/kilo-cli/` | 1 |
| Generated Cursor | ~100+ files `plugins/maister-cursor/` | via build |
| Generated Kiro | ~200+ files `plugins/maister-kiro/` | via build |
| Generated Kilo | ~50+ files `plugins/maister-kilo/` | via build |
| Docs | `docs/cursor-agent-*.md`, `docs/kiro-cli-support.md` | 5+ |
| Marketplace | `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json` | 2+ |

---

## Integration Implications

### Low-conflict areas (preserve as-is, rebuild)

- All fork-only skills (AJ, grill-me, thermos)
- All platform directories (`platforms/cursor/`, `platforms/kiro-cli/`, `platforms/kilo-cli/`)
- Generated variants (rebuild via `make build`)

### High-conflict areas (manual merge required)

1. **`plugin.json`** — fork at 2.2.0, upstream at 2.1.8; target scheme `2.1.8-10` per research brief
2. **`CLAUDE.md`** — fork adds AJ/grill-me/thermos sections; upstream adds quick-plan/quick-dev skills + Maister rebrand
3. **Quick workflows** — upstream deletes `commands/quick-dev.md` + `commands/quick-plan.md`, adds skills; fork keeps commands + platform overrides referencing commands
4. **`skills/quick-bugfix/SKILL.md`** — upstream simplifies; fork has platform overrides in cursor/kiro

### Semantic conflicts (no git conflict, incompatible design)

| Issue | Fork state | Upstream state |
|-------|-----------|----------------|
| quick-dev invocation | Command at `commands/quick-dev.md` + platform overrides | Skill at `skills/quick-dev/SKILL.md`; command deleted |
| quick-plan invocation | Command at `commands/quick-plan.md` + Kiro `/quick-plan` shortcut | Skill at `skills/quick-plan/SKILL.md`; command deleted |
| Plugin naming | Fork CLAUDE.md still says "AI SDLC Plugin" in body | Upstream renames to "Maister Plugin" |
| Version numbering | Fork jumped to 2.2.0 (AJ skills) | Upstream at 2.1.8 |

---

## Evidence Commands

```bash
# Commit inventory
git log --oneline 1fc5d3c..HEAD

# Fork-changed source files
git diff --name-only 1fc5d3c..HEAD -- plugins/maister/

# Overlap computation
comm -12 \
  <(git diff --name-only 1fc5d3c..upstream/master -- plugins/maister/ | sort) \
  <(git diff --name-only 1fc5d3c..HEAD -- plugins/maister/ | sort)

# Fork scale
git diff --stat 1fc5d3c..HEAD | tail -1
# 501 files changed, 72297 insertions(+), 40 deletions(-)
```

---

## Sources

- Git history: `1fc5d3c..HEAD` (fork), `1fc5d3c..upstream/master` (upstream)
- Research brief: `planning/research-brief.md`
- Research plan Phase 3: `planning/research-plan.md`
