# Upstream Diff Report

**Task:** 2026-06-14-upstream-sync-consistency  
**Category:** upstream-diff  
**Repo:** `/Users/mrapacz/Workspace/maister`  
**Upstream remote:** `upstream/master` (SkillPanel/maister)  
**Merge-base with fork:** `1fc5d3c`  
**Fork HEAD at analysis time:** `d3e8298` (Complete Wave 1 AJ skills adoption verification)  
**Date:** 2026-06-14

---

## Executive Summary

Upstream has **2 commits** since merge-base `1fc5d3c`. The substantive change is `fb5a8f3` (quick-workflow rework + Maister rebrand + template updates); `679958b` is a version bump to **2.1.8**.

The fork is **ahead** of upstream (v2.2.0, Wave 1 AJ skills, Cursor/Kiro platform support) but **has not incorporated** the upstream quick-workflow refactor. Fork still uses **command-based** `quick-plan` / `quick-dev` (130+ line command files); upstream moved them to **thin skills** (~24–26 lines each) and deleted the command files.

Cherry-pick dry-run of `fb5a8f3` on current fork branch: **clean apply, no conflicts**.

---

## Commit Log (`1fc5d3c..upstream/master`)

```
679958b Bump version to 2.1.8
fb5a8f3 Rework quick-* workflows, add default standards/docs awareness, rename to Maister
```

---

## Changed Files (`git diff --name-only 1fc5d3c..upstream/master`)

| # | Path |
|---|------|
| 1 | `.claude-plugin/marketplace.json` |
| 2 | `copilot-cli-issues.md` |
| 3 | `docs/commands.md` |
| 4 | `plugins/maister-copilot/.claude-plugin/plugin.json` |
| 5 | `plugins/maister-copilot/CLAUDE.md` |
| 6 | `plugins/maister-copilot/commands/quick-dev.md` |
| 7 | `plugins/maister-copilot/commands/quick-plan.md` |
| 8 | `plugins/maister-copilot/skills/docs-manager/references/claude-md-template.md` |
| 9 | `plugins/maister-copilot/skills/docs-manager/references/index-md-template.md` |
| 10 | `plugins/maister-copilot/skills/init/SKILL.md` |
| 11 | `plugins/maister-copilot/skills/quick-bugfix/SKILL.md` |
| 12 | `plugins/maister-copilot/skills/quick-dev/SKILL.md` *(new)* |
| 13 | `plugins/maister-copilot/skills/quick-plan/SKILL.md` *(new)* |
| 14 | `plugins/maister-copilot/skills/research/references/research-methodologies.md` |
| 15 | `plugins/maister/.claude-plugin/plugin.json` |
| 16 | `plugins/maister/CLAUDE.md` |
| 17 | `plugins/maister/commands/quick-dev.md` |
| 18 | `plugins/maister/commands/quick-plan.md` |
| 19 | `plugins/maister/hooks/hooks.json` |
| 20 | `plugins/maister/skills/docs-manager/references/claude-md-template.md` |
| 21 | `plugins/maister/skills/docs-manager/references/index-md-template.md` |
| 22 | `plugins/maister/skills/init/SKILL.md` |
| 23 | `plugins/maister/skills/quick-bugfix/SKILL.md` |
| 24 | `plugins/maister/skills/quick-dev/SKILL.md` *(new)* |
| 25 | `plugins/maister/skills/quick-plan/SKILL.md` *(new)* |
| 26 | `plugins/maister/skills/research/references/research-methodologies.md` |

**Total:** 26 files (23 in `fb5a8f3`, +3 version manifests in `679958b`)

**Note:** Changes are mirrored in `plugins/maister/` and `plugins/maister-copilot/`. Fork also has generated `plugins/maister-cursor/` and `plugins/maister-kiro/` — those are **not** in upstream and would need platform rebuild after source changes.

---

## Commit Details

### `fb5a8f3` — Rework quick-* workflows, add default standards/docs awareness, rename to Maister

**Stat:** 23 files, +147 / −687 lines

**Author:** mkaluzny  
**Date:** 2026-06-09

**Commit message summary:**
- Convert `quick-plan` and `quick-dev` from commands to thin skills; refine `quick-bugfix`
- Each extends a default behavior (plan mode / direct dev / plan+TDD) with standards enforcement
- Discover standards during work (INDEX.md as map → read matched files); verify Standards Compliance Checklist after implementation
- Inject INDEX.md + standards discipline into consuming-project CLAUDE.md and INDEX.md templates
- Rename legacy "AI SDLC" → "Maister"; remove `copilot-cli-issues.md`

#### `plugins/maister/` key diffs

| Area | Change |
|------|--------|
| **Commands removed** | `commands/quick-plan.md` (−130 lines), `commands/quick-dev.md` (−134 lines) |
| **Skills added** | `skills/quick-plan/SKILL.md` (+26), `skills/quick-dev/SKILL.md` (+24) |
| **quick-bugfix refined** | `skills/quick-bugfix/SKILL.md` (−51/+refactor): standards discovery deferred to analysis/planning phase; mandatory post-implementation checklist verification; "What This Does" section removed |
| **CLAUDE.md** | Title "AI SDLC Plugin" → "Maister Plugin"; adds `quick-plan` and `quick-dev` to skills table |
| **init skill** | "Initialize AI SDLC Framework" → "Initialize Maister Framework" |
| **hooks.json** | Description: "AI SDLC plugin hooks" → "Maister plugin hooks" |
| **Templates** | `claude-md-template.md`: section renamed to "Project Documentation & Standards"; 3-step INDEX.md discipline (read index → read specific files → follow standards). `index-md-template.md`: clarifies index is a pointer, not a substitute for reading standard files |
| **research-methodologies.md** | "AI SDLC Research Orchestrator" → "Maister Research Orchestrator" |
| **docs/commands.md** | Updated quick-plan/quick-dev descriptions to match thin-skill philosophy |

#### New skill design (upstream)

**`quick-plan`** — Thin wrapper around built-in plan mode:
1. Get task
2. Enter plan mode (do not redefine phases)
3. **Addition:** Read INDEX.md + matched standard files; fold into plan with `## Standards Compliance Checklist`
4. After approval: implement and verify checklist

**`quick-dev`** — Thin wrapper around direct main-agent dev:
1. Get task
2. Implement normally (no plan mode)
3. **Addition:** Read INDEX.md + matched standards as you touch areas
4. Verify Standards Compliance Checklist in summary

**Philosophy shift:** Old commands were 130-line prescriptive workflows. New skills are ~25 lines: "do the default behavior + standards enforcement."

---

### `679958b` — Bump version to 2.1.8

**Stat:** 3 files, +3 / −3 lines

| File | Change |
|------|--------|
| `.claude-plugin/marketplace.json` | 2.1.7 → 2.1.8 |
| `plugins/maister/.claude-plugin/plugin.json` | 2.1.7 → 2.1.8 |
| `plugins/maister-copilot/.claude-plugin/plugin.json` | 2.1.7 → 2.1.8 |

Fork is already at **2.2.0** — version bump is informational only; do not downgrade.

---

## Semantic Change Summary by Area

### Quick Workflows

| Item | Upstream (fb5a8f3) | Fork (current) | Gap |
|------|-------------------|----------------|-----|
| `quick-plan` | Thin skill; command deleted | 130-line command file; no skill | **Not synced** |
| `quick-dev` | Thin skill; command deleted | 134-line command file; no skill | **Not synced** |
| `quick-bugfix` | Deferred standards discovery; mandatory checklist post-impl | Upfront blocking standards read; verbose enforcement section | **Not synced** |
| Invocation model | Skills auto-invoked by Claude | Commands invoked via slash | Architectural divergence |

Upstream intent: quick workflows extend native agent behaviors (plan mode, direct dev, TDD bugfix) with minimal Maister-specific additions rather than redefining full workflows.

### Rebrand (AI SDLC → Maister)

Upstream renames in 11+ locations across `plugins/maister/` and `plugins/maister-copilot/`:

- `CLAUDE.md` title and purpose text
- `hooks/hooks.json` description
- `skills/init/SKILL.md` frontmatter and heading
- `skills/quick-bugfix/SKILL.md` fallback messages
- `skills/research/references/research-methodologies.md`

**Fork status:** Still uses "AI SDLC" in all of the above. Fork intentionally retained "AI SDLC" branding in some areas while adding Wave 1 content — rebrand not applied.

### Templates (docs-manager)

**`claude-md-template.md`** (consuming-project CLAUDE.md injection):
- Section title: "Coding Standards & Conventions" → **"Project Documentation & Standards"**
- Replaces bullet list with 3-step workflow: read INDEX.md → read specific files → follow standards
- Emphasizes INDEX.md as map to **all** project documentation, not just standards

**`index-md-template.md`**:
- Usage guideline #3 updated: index points to standards; must open specific files

**Fork status:** Old template content ("Coding Standards & Conventions", INDEX-only guidance).

### Versioning

- Upstream: 2.1.8 (679958b)
- Fork: 2.2.0 (Wave 1 AJ skills, platform variants)
- Merge-base: 1fc5d3c at 2.1.7 era

No functional conflict on version numbers; fork is ahead.

### Other

- **`copilot-cli-issues.md`:** Deleted upstream (44-line scratch file). **Still present on fork.**
- **`docs/commands.md`:** User-facing command docs updated upstream. Fork has pre-upstream descriptions.

---

## Fork Divergence Context

Beyond the 26 upstream files, fork has substantial unique work since `1fc5d3c`:

- Wave 1 AJ skills: `transcript-critic`, `requirements-critic`, `problem-classifier`, `grill-me`, thermo-nuclear review suite
- Cursor and Kiro CLI platform support (`platforms/cursor/`, `platforms/kiro-cli/`, generated plugins)
- Enhanced `init` skill (inferred project context in single AskUserQuestion)
- Extended `CLAUDE.md` with Requirements & Modeling and Review skill sections

These fork additions do not conflict with upstream's fb5a8f3 changes structurally, but **CLAUDE.md auto-merged** during cherry-pick (upstream adds quick-plan/quick-dev to skills table; fork adds AJ skills sections).

---

## Cherry-Pick Dry-Run Result

**Command:** `git cherry-pick --no-commit fb5a8f3` on fork branch `master` @ `d3e8298`

**Result:** ✅ **Success — no conflicts**

```
Auto-merging plugins/maister-copilot/CLAUDE.md
Auto-merging plugins/maister-copilot/skills/init/SKILL.md
Auto-merging plugins/maister/CLAUDE.md
Auto-merging plugins/maister/skills/init/SKILL.md
EXIT_CODE=0
```

**Staged changes (23 files, +147 / −687):** Matches upstream commit stat exactly.

| Action | Files |
|--------|-------|
| Deleted | `copilot-cli-issues.md`, `commands/quick-dev.md`, `commands/quick-plan.md` (×2 plugins) |
| Added | `skills/quick-dev/SKILL.md`, `skills/quick-plan/SKILL.md` (×2 plugins) |
| Modified | CLAUDE.md, quick-bugfix, init, templates, hooks, research-methodologies, docs/commands.md |

**Cleanup:** Cherry-pick left staged changes without an in-progress cherry-pick state. Working tree restored via `git reset --hard HEAD`.

**679958b cherry-pick:** Not attempted — version-only bump to 2.1.8 would conflict with fork's 2.2.0; skip or apply manifest changes manually if desired.

---

## Sync Recommendations

1. **Cherry-pick `fb5a8f3`** — Clean apply expected. Review auto-merged `CLAUDE.md` and `init/SKILL.md` to preserve fork's Wave 1 sections and enhanced init flow.

2. **Skip `679958b`** — Fork already at 2.2.0.

3. **Regenerate platform plugins** — After applying source changes to `plugins/maister/`, run `make` to propagate to `maister-cursor`, `maister-copilot`, `maister-kiro`.

4. **Reconcile quick workflow invocation on Cursor** — Cursor build may have platform overrides for quick-plan/quick-bugfix (`platforms/cursor/overrides/`). Verify thin-skill model works with Cursor's skill invocation (Task tool vs EnterPlanMode availability).

5. **Decide on rebrand** — Upstream fully commits to "Maister" naming. Fork may want selective adoption (e.g., templates + quick skills) while keeping "AI SDLC" in user-facing docs, or adopt wholesale for consistency.

6. **Delete `copilot-cli-issues.md`** — Safe cleanup if still present after sync.

---

## Evidence Commands Run

```bash
git log --oneline 1fc5d3c..upstream/master
git show fb5a8f3 --stat
git show fb5a8f3 -- plugins/maister/
git show 679958b --stat
git diff --name-only 1fc5d3c..upstream/master
git cherry-pick --no-commit fb5a8f3
git reset --hard HEAD  # cleanup after dry-run
```
