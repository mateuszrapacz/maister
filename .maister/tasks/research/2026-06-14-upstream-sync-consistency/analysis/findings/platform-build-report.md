# Platform Build Report: Commands vs Skills (quick-* focus)

**Category:** platform-build  
**Gathered by:** maister-information-gatherer  
**Date:** 2026-06-14  
**Repo:** `/Users/mrapacz/Workspace/maister`

## Executive Summary

Upstream today places `quick-plan` and `quick-dev` as **full-workflow commands** (`plugins/maister/commands/`), while `quick-bugfix` is already a **skill** (`plugins/maister/skills/quick-bugfix/`). Platform builds treat commands and skills differently:

| Platform | Commands | Skills | quick-plan special handling |
|----------|----------|--------|----------------------------|
| **Cursor** | Kept as `commands/*.md` | Copied + name transform | Override **replaces command file**; global EnterPlanMode strip |
| **Kiro** | Merged into `skills/maister-*/` then deleted | Renamed to `maister-*` dirs | Override **replaces skill** at `skills/maister-quick-plan/SKILL.md` |
| **Copilot** | Kept as `commands/*.md` | Copied + prefix strip | **No override** — EnterPlanMode ships in output |

If upstream moves `quick-dev` / `quick-plan` from commands to skills (matching `quick-bugfix` / `init` / `development`), **Kiro needs minimal or no build changes**; **Cursor needs deliberate updates** to avoid duplicate artifacts and broken validation; **Copilot may need EnterPlanMode handling** if `quick-plan` content still references plan mode.

---

## Current Upstream Layout (`plugins/maister/`)

### Commands (11 files, flat `commands/`)

| File | `name:` frontmatter | Content type |
|------|---------------------|--------------|
| `quick-plan.md` | `maister:quick-plan` | Full inline workflow (EnterPlanMode / ExitPlanMode) |
| `quick-dev.md` | `maister:quick-dev` | Full inline workflow |
| `quick-problem-classifier.md` | `maister:quick-problem-classifier` | Thin wrapper → `problem-classifier` skill |
| `quick-requirements-critic.md` | `maister:quick-requirements-critic` | Thin wrapper → `requirements-critic` skill |
| `quick-transcript-critic.md` | `maister:quick-transcript-critic` | Thin wrapper → `transcript-critic` skill |
| `work.md` | `maister:work` | Full inline router |
| `reviews-*.md` (5) | `maister:reviews-*` | Review entry points |

### Skills (21 directories)

Includes orchestrators (`development`, `init`, `research`, …), internal engines (`docs-manager`), and **`quick-bugfix`** — the only `quick-*` already modeled as a skill.

**Pattern gap:** `quick-bugfix` is skill-only; `quick-plan` / `quick-dev` are command-only with full workflow bodies. Orchestrators (`development`, `init`) are skill-only with no command twins.

---

## Makefile Orchestration

```makefile
build: build-copilot build-cursor build-kiro
validate: validate-copilot validate-cursor validate-kiro
```

- **Build:** Each platform runs `bash platforms/<platform>/build.sh`; copies `plugins/maister/` → `plugins/maister-{copilot,cursor,kiro}/`.
- **Validate:** Structural grep/jq checks on **generated** trees only (not source).
- **Watch:** `fswatch plugins/maister/` → `make build` (all three platforms).

No Makefile logic distinguishes commands vs skills beyond delegating to per-platform validate rules.

---

## Per-Platform Build Behavior

### Copilot (`platforms/copilot-cli/build.sh`)

1. Copy core; remove `hooks/`.
2. Command `name:` `maister:foo` → `foo` (plugin id adds prefix).
3. Skill `name:` same strip.
4. Global `maister:` → `maister-` in all `.md`.
5. Multi-select → sequential single-choice in skills.
6. `CLAUDE.md` → `.github/copilot-instructions.md` in skills.
7. `AskUserQuestion` → `ask_user`.

**quick-* handling:** No overrides. Commands and skills pass through transforms only. `quick-plan` command retains **EnterPlanMode / ExitPlanMode** references in `plugins/maister-copilot/commands/quick-plan.md`.

**If upstream moves quick-dev/plan to skills:**

- Output becomes `skills/quick-plan/SKILL.md`, `skills/quick-dev/SKILL.md` (names stripped to `quick-plan`, `quick-dev`).
- No `commands/` entries unless thin wrappers remain in source.
- **No build.sh changes required** for the move itself.
- **Risk:** Copilot variant would still ship Claude Code plan-mode APIs for `quick-plan` unless upstream removes them from skill content or Copilot adds stripping (Cursor/Kiro already do).

### Cursor (`platforms/cursor/build.sh`)

1. Copy core; manifest `.claude-plugin` → `.cursor-plugin`.
2. Command/skill `name:` `maister:foo` → `maister-foo`.
3. Global `maister:` → `maister-`.
4. `Explore` → `explore`; `AskUserQuestion` → `AskQuestion`.
5. **Step 7:** Strip/replace `EnterPlanMode` / `ExitPlanMode` on **all** `.md` (before overrides).
6. Skills: `CLAUDE.md` → `AGENTS.md`; MCP, hooks, agent prefixing, TodoWrite transforms.
7. **Step 12 — Overrides:**
   - `platforms/cursor/overrides/commands/quick-plan.md` → **`$OUT/commands/quick-plan.md`** (full replacement)
   - `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` → **`$OUT/skills/quick-bugfix/SKILL.md`**

**Current Cursor output:**

- `commands/quick-plan.md`, `commands/quick-dev.md` — **no** `skills/maister-quick-plan/` or `skills/maister-quick-dev/`.
- `skills/quick-bugfix/SKILL.md` only for quick-* skills.

**If upstream moves quick-dev/plan to skills (remove commands):**

| Step | Effect without pipeline changes |
|------|----------------------------------|
| Copy | `skills/quick-plan/`, `skills/quick-dev/` appear in output |
| Step 7 | Strips EnterPlanMode from skill copies (may leave broken partial text) |
| Step 12 | Still **creates** `commands/quick-plan.md` from override — command path preserved |
| Result | **Duplicate:** stale `skills/quick-plan/` + override `commands/quick-plan.md` with different content |

**Build pipeline changes needed for Cursor:**

1. Move override to `platforms/cursor/overrides/skills/quick-plan/SKILL.md` (mirror `quick-bugfix` pattern).
2. Change step 12 to copy override into `skills/quick-plan/SKILL.md` (or `skills/maister-quick-plan/` if upstream uses that dir name).
3. Stop copying to `commands/quick-plan.md` unless a thin command wrapper is intentionally kept.
4. Update `make validate-cursor` quick-plan check (see below).
5. Decide invocation model: skill-only (`/maister-quick-plan` as skill) vs command + skill duplicate.

`quick-dev` has **no Cursor override** today — if moved to skill only, it would appear as `skills/quick-dev/SKILL.md` with `name: maister-quick-dev` (no directory rename in Cursor build). No validate rule references `quick-dev`.

### Kiro (`platforms/kiro-cli/build.sh`)

Kiro is the most command-aware platform.

**`merge_commands_to_skills()` (step 5)** — copies command files into skill directories, then deletes `commands/`:

```bash
merge_one quick-dev maister-quick-dev
merge_one quick-plan maister-quick-plan
# ... work, reviews-*, quick-* critics
rm -rf "$commands_dir"
```

**`rename_skill_directories()` (step 6)** — aligns directory names with `name:` frontmatter (`maister-*`).

**`apply_kiro_overrides()` (step 9)** — replaces platform-specific content:

- `overrides/commands/quick-plan.md` → `skills/maister-quick-plan/SKILL.md`
- `overrides/skills/quick-bugfix/SKILL.md` → `skills/maister-quick-bugfix/SKILL.md`
- Injects `$ARGUMENTS` into listed `maister-*` skills

**Shortcut skills (step 20)** — generates unprefixed delegators:

- `skills/quick-plan/` → invokes `/maister-quick-plan`
- `skills/quick-dev/` → invokes `/maister-quick-dev`

**Current Kiro output:** 57 skill dirs (32 `maister-*` + 25 shortcuts); **no** `commands/`.

**If upstream moves quick-dev/plan to skills:**

| Step | Effect |
|------|--------|
| `merge_one quick-dev/plan` | Source command missing → **no-op** (`[ -f "$src" ]` guard) |
| Source skills | `skills/quick-dev/`, `skills/quick-plan/` copied; renamed to `maister-quick-dev`, `maister-quick-plan` |
| Overrides | Still replace `maister-quick-plan` skill content |
| Shortcuts | Still generated — same as today |
| Skill counts | **Should remain 57** (merge path vs native skill path produce same dirs) |

**Likely build changes:** Optional cleanup — remove `merge_one quick-dev` / `merge_one quick-plan` from `merge_commands_to_skills()` once commands are gone upstream (dead code, not breakage). Update `build-core.test.sh` wording if “11 commands merged” becomes “N commands merged”. **No Makefile validate count changes** if totals stay 57.

---

## `make validate` — quick-plan Specifics

### `validate-cursor` (only platform with quick-plan hardcode)

```makefile
@test -d plugins/maister-cursor || (echo "FAIL: ... run make build-cursor" && exit 1)
@! grep -r '^name:.*:' plugins/maister-cursor/commands/ ...
@grep -q '^name: maister-' plugins/maister-cursor/commands/quick-plan.md || \
  (echo "FAIL: expected maister- command prefix" && exit 1)
```

**What it checks for quick-plan:**

1. **File must exist:** `plugins/maister-cursor/commands/quick-plan.md` (implicit — `grep` fails if missing).
2. **Prefix:** Frontmatter contains `name: maister-` (expects `name: maister-quick-plan`).
3. **No colons in any command name** (global rule).

**What it does NOT check:**

- Skill path `skills/quick-plan/` or `skills/maister-quick-plan/`
- `quick-dev` at all
- Override vs source content equivalence
- EnterPlanMode absence (separate global rule on entire `plugins/maister-cursor/`)

**If quick-plan becomes skill-only in Cursor output:** `make validate-cursor` **fails** until the grep target moves to e.g. `plugins/maister-cursor/skills/quick-plan/SKILL.md` (or remove the smoke-test-specific check and rely on generic skill rules).

### `validate-copilot`

No quick-plan reference. Checks flat commands, no colons, no `maister:` / `maister-` in copilot tree, no multi-select in skills.

### `validate-kiro`

No quick-plan filename hardcode. Relevant rules:

| Rule | Check |
|------|-------|
| 13 | `SKILL.md` `name:` matches parent directory |
| 14 | Exactly **57** skill directories |
| 16 | **No** `commands/` directory |
| 23 | Exactly **25** unprefixed shortcut dirs |
| 28 | Exactly **32** `maister-*` skill dirs |

`maister-quick-plan` must satisfy rule 13 (`dir=maister-quick-plan`, `name: maister-quick-plan`). Shortcut `quick-plan/` must satisfy rule 13 (`dir=quick-plan`, `name: quick-plan`).

---

## Scenario Matrix: Upstream Moves quick-dev / quick-plan to Skills

| Artifact | Copilot | Cursor (no build change) | Cursor (updated) | Kiro |
|----------|---------|--------------------------|------------------|------|
| `commands/quick-plan.md` | Absent if no wrapper | **Created by override** | Absent or thin wrapper only | Never (rule 16) |
| `skills/…/quick-plan` | `skills/quick-plan/` | Duplicate stale + override command | Single override skill | `maister-quick-plan/` + shortcut `quick-plan/` |
| `commands/quick-dev.md` | Absent | Absent | Absent or wrapper | Never |
| `skills/…/quick-dev` | `skills/quick-dev/` | `skills/quick-dev/` | Same | `maister-quick-dev/` + shortcut |
| `make validate` | Pass | **Fail** (quick-plan command grep) | Pass after grep update | Pass (if counts stay 57) |
| EnterPlanMode in quick-plan | Present if upstream keeps it | Stripped in skill copy; override command clean | Override skill clean | Override skill clean |

---

## Alignment with Existing Patterns

| Pattern | Examples | quick-plan / quick-dev today |
|---------|----------|------------------------------|
| Skill-only orchestrator | `development`, `init`, `research` | — |
| Skill-only quick workflow | `quick-bugfix` | — |
| Command thin wrapper → skill | `quick-problem-classifier` → `problem-classifier` | — |
| Command full workflow | `quick-plan`, `quick-dev`, `work` | **Current** |
| Kiro command → merged skill | All 11 commands | quick-* included in merge list |

Upstream move to skills would align `quick-plan` / `quick-dev` with **`quick-bugfix`** and orchestrators, not with `quick-problem-classifier` wrappers.

---

## Recommended Build Pipeline Changes (if upstream migrates)

### Required

1. **Cursor `build.sh` step 12:** Apply `quick-plan` override to `skills/` (not `commands/`), matching `quick-bugfix`.
2. **Cursor `Makefile` validate-cursor:** Change quick-plan assertion to skill path or generic “quick-plan exists with `maister-` prefix”.
3. **Cursor:** Remove or prevent duplicate `skills/quick-plan/` from stripped upstream copy when override targets skill.

### Recommended

4. **Kiro `build.sh`:** Remove `merge_one quick-dev` / `merge_one quick-plan` after upstream deletion (avoid double-processing if someone re-adds commands).
5. **Kiro overrides path:** Consider `overrides/skills/maister-quick-plan/SKILL.md` for naming consistency with output layout.
6. **Copilot:** Add EnterPlanMode stripping or upstream-only content fix for `quick-plan` skill (Copilot has no plan mode).
7. **Tests:** `platforms/cursor/smoke-cli.sh` uses `/maister-quick-plan` — verify skill invocation still works after command→skill move.
8. **Standards:** Update `.maister/docs/standards/global/build-pipeline.md` to document quick-* command/skill duality and override locations.

### Optional

9. **Cursor `quick-dev`:** No override exists; if upstream skill retains Claude-specific APIs, add Cursor override similar to `quick-bugfix` if needed.
10. **Thin command wrappers:** Keep `commands/quick-plan.md` as one-line “invoke skill” for Cursor slash-command discovery — only if Cursor requires both artifacts.

---

## Source Files Referenced

| Path | Role |
|------|------|
| `Makefile` | `validate-cursor` line 37 — quick-plan command grep |
| `platforms/cursor/build.sh` | Steps 7, 12 — plan mode strip + command override |
| `platforms/cursor/overrides/commands/quick-plan.md` | Cursor-specific quick-plan content |
| `platforms/kiro-cli/build.sh` | `merge_commands_to_skills`, `apply_kiro_overrides`, shortcut generation |
| `platforms/kiro-cli/overrides/commands/quick-plan.md` | Kiro-specific quick-plan skill content |
| `platforms/copilot-cli/build.sh` | Prefix transforms only; no quick-* overrides |
| `platforms/kiro-cli/tests/build-core.test.sh` | Asserts merged quick-plan at `skills/maister-quick-plan/` |
| `.maister/docs/standards/global/build-pipeline.md` | Platform naming and validate contracts |

---

## Conclusion

**Does the build pipeline need changes when upstream moves quick-dev/plan from commands to skills?**

- **Kiro:** No functional breakage expected; optional merge-list cleanup. Validate rules and skill counts should remain stable.
- **Cursor:** **Yes** — current override and validate logic **assume** `quick-plan` lives under `commands/`. Unchanged pipeline risks duplicate artifacts and `make validate-cursor` failure.
- **Copilot:** Move itself needs no build change, but **plan-mode API leakage** into Copilot output becomes a skill-content or Copilot-build concern.

**What does `make validate` check for quick-plan?**

Only in **Cursor**: `plugins/maister-cursor/commands/quick-plan.md` must exist and contain `^name: maister-` in frontmatter. No other platform or target references the quick-plan filename directly.
