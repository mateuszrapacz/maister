# Specification: Cursor Skill Prefix & Slash Palette Consolidation

**Task**: `.maister/tasks/development/2026-07-08-cursor-skill-prefix-and-palette`  
**Authoritative plan**: `.maister/plans/2026-07-08-cursor-skill-prefix-and-palette.md`  
**Date**: 2026-07-08  
**Status**: Implementation-ready

---

## 1. Overview

The Cursor variant (`plugins/maister-cursor/`) is generated from `plugins/maister/` by `platforms/cursor/build.sh`. Today it exposes **~16 commands + ~28 skills (~44 slash palette entries)** because Cursor loads every `skills/*/SKILL.md` and every `commands/*.md`, ignores `user-invocable: false`, and leaves **17 skills** without the `maister-` prefix while commands use `maister-*`. Users see duplicates (e.g. `/maister-quick-problem-classifier` and `/problem-classifier`) and internal engines mixed with public workflows.

This specification implements **build-time transforms only** in `platforms/cursor/` to consolidate the palette to **~25–27 public `maister-*` skills** with one entry per user-facing capability. Source `plugins/maister/` remains unchanged for Claude Code. All naming, deduplication, and internal-engine relocation happen in the Cursor build pipeline, following patterns already proven in `platforms/kiro-cli/build.sh`.

**Per-PR gate** (every phase):

```bash
make build-cursor && make validate-cursor
platforms/cursor/smoke-cli.sh
git diff --exit-code plugins/maister-cursor   # CI drift (D6)
```

---

## 2. Goals and Non-Goals

### Goals

| ID | Goal |
|----|------|
| G1 | **One entry per user-facing capability** — eliminate command + skill duplicates |
| G2 | **Consistent namespace** — all user-facing slash skills use `/maister-*` |
| G3 | **Internal engines** remain invocable via Skill tool by orchestrators; minimize palette noise |
| G4 | **Source of truth unchanged** for other platforms — transforms live in `platforms/cursor/build.sh` (+ overrides) |
| G5 | **Committed generated output** matches fresh build (CI fail-fast per `.github/workflows/validate-generated-variants.yml`) |

### Non-Goals

| ID | Non-Goal |
|----|----------|
| NG1 | Hiding skills from Cursor palette entirely (platform limitation unless relocated outside `skills/`) |
| NG2 | Changing `plugins/maister-copilot/` or `plugins/maister-kiro/` |
| NG3 | Renaming skills in `plugins/maister/` source to `maister:*` for utilities already using plain kebab |
| NG4 | Implementing Cursor API to suppress palette entries (`user-invocable: false`, `disable-model-invocation: true` do not hide from `/` list) |

### Locked Decisions (D1–D6)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Public utility naming | **Shorter form** — e.g. `maister-problem-classifier`, not `maister-quick-problem-classifier` |
| D2 | `grill-me` | Rename to **`maister-grill-me`** in Cursor build output |
| D3 | `commands/` directory | **Remove entirely** after merge into `skills/`; drop `"commands"` from `.cursor-plugin/plugin.json` |
| D4 | Internal engines | **Phase 4B first** — relocate to `lib/skills/`; sentinel smoke gate. **Fallback 4A** → `skills/maister-internal-*` |
| D5 | `orchestrator-framework` | **Always relocate first** to `lib/orchestrator-framework/` before global skill directory renaming |
| D6 | CI drift | **Fail-fast** — every PR leaves `plugins/maister-cursor/` reproducible from build |

---

## 3. Architecture and Approach

### 3.1 Build Transform Pipeline (Target Order)

Current `platforms/cursor/build.sh` ends at step 14 (`apply_todo_transforms`). New steps insert **after copy + colon transforms, before or around existing overrides/TodoWrite**, respecting PR ordering:

```
plugins/maister/
       │
       ▼
platforms/cursor/build.sh
  1. rm -rf + cp → plugins/maister-cursor/
  2. Manifest (.cursor-plugin/plugin.json) — NO "commands" field after PR2
  3–11. Existing transforms (colon→hyphen, Explore, AskQuestion, hooks, agents, …)
  ── PR1 ──
  12a. relocate_orchestrator_framework()  → lib/orchestrator-framework/
  12b. update orchestrator-framework path refs in $OUT
  ── PR2 ──
  13. apply_cursor_overrides() — merge override bodies into skill dirs (not commands/)
  14. merge_commands_to_skills() — Cursor collapse map (D1)
  15. rm -rf $OUT/commands
  ── PR3 ──
  16. rename_skill_directories()
  17. apply_skill_reference_transforms()
  ── PR4 ──
  18. relocate_internal_skills() — lib/skills/ (4B) or maister-internal-* (4A fallback)
  ── existing ──
  19. apply_todo_transforms() — TODO_GLOB paths updated for lib/orchestrator-framework
  20. append orchestrator-patterns-todowrite.md patch
       │
       ▼
plugins/maister-cursor/  (committed; never hand-edited)
```

**Reference implementation**: `platforms/kiro-cli/build.sh` functions `merge_commands_to_skills()` (L41–72), `rename_skill_directories()` (L74–90), and `apply_delegation_transforms()` sed patterns (L260–335) — adapt targets per D1 collapse map, not Kiro's `maister-quick-*` retained names.

### 3.2 PR Sequence

```mermaid
flowchart LR
  PR1[PR1: orchestrator-framework → lib] --> PR2[PR2: merge + collapse commands]
  PR2 --> PR3[PR3: maister- prefix]
  PR3 --> PR4[PR4: internal engines 4B/4A]
  PR4 --> PR5[PR5: docs + inventory test]
```

| PR | Scope | Risk | Estimate |
|----|-------|------|----------|
| PR1 | `orchestrator-framework` → `lib/` | Low | 2–4 h |
| PR2 | merge commands, collapse duplicates, remove manifest commands path | Medium | 0.5–1 d |
| PR3 | `rename_skill_directories()` + reference sed | Low | 0.5 d |
| PR4 | internal engines 4B + sentinel smoke gate, fallback 4A if needed | Medium | 1 d |
| PR5 | docs, validate, inventory test | Low | 2–4 h |

**Branch discipline**: One PR per phase. Rebase sequentially if `build.sh` conflicts with `2026-07-08-cursor-platform-review-fixes` work.

### 3.3 Platform Constraint (Cursor)

| Mechanism | Effect |
|-----------|--------|
| `user-invocable: false` | **Not supported** — no palette effect |
| `disable-model-invocation: true` | Blocks model auto-invocation; **still in `/` list** |
| File outside `skills/` | **Not a slash command** — Skill tool resolution must be smoke-tested |

---

## 4. Detailed Requirements by Phase

### PR1 — Reference Layout: `orchestrator-framework` → `lib/`

**Rationale (D5)**: Move before `rename_skill_directories()` to avoid `skills/orchestrator-framework` vs `skills/maister-orchestrator-framework` path conflict.

#### 4.1.1 Build Function: `relocate_orchestrator_framework()`

Add to `platforms/cursor/build.sh`:

```bash
relocate_orchestrator_framework() {
  mkdir -p "$OUT/lib"
  mv "$OUT/skills/orchestrator-framework" "$OUT/lib/orchestrator-framework"
}
```

Call after initial copy/transforms, **before** `merge_commands_to_skills()`.

#### 4.1.2 Path Reference Updates

Update all generated references from `skills/orchestrator-framework` / `../orchestrator-framework/` to `lib/orchestrator-framework` / `../lib/orchestrator-framework/`:

| Location | Current | Target |
|----------|---------|--------|
| Orchestrator SKILL.md files (`development`, `migration`, `performance`, `research`, `product-design`, `init`, …) | `../orchestrator-framework/references/...` | `../lib/orchestrator-framework/references/...` |
| `TODO_GLOB` in `build.sh` (L272–284) | `"$OUT/skills/orchestrator-framework"` | `"$OUT/lib/orchestrator-framework"` |
| `apply_todo_transforms` sed target (L296) | `$OUT/skills/orchestrator-framework/references/orchestrator-patterns.md` | `$OUT/lib/orchestrator-framework/references/orchestrator-patterns.md` |
| Patch append (L299–300) | `$OUT/skills/orchestrator-framework/...` | `$OUT/lib/orchestrator-framework/...` |
| `orchestrator-patterns.md` self-reference (L438 in source) | `[plugin]/skills/orchestrator-framework/assets/...` | `[plugin]/lib/orchestrator-framework/assets/...` (sed in build) |

Apply via `find "$OUT" -name "*.md"` sed or dedicated `update_orchestrator_framework_paths()` function.

#### 4.1.3 Validation Additions (Makefile `validate-cursor`)

```bash
test ! -d plugins/maister-cursor/skills/orchestrator-framework
test -f plugins/maister-cursor/lib/orchestrator-framework/references/orchestrator-patterns.md
! grep -rq 'skills/orchestrator-framework' plugins/maister-cursor/ --include="*.md"
```

#### 4.1.4 Acceptance Criteria (PR1)

- [ ] `/orchestrator-framework` absent from slash palette (dir not under `skills/`)
- [ ] `maister-development` smoke path finds `lib/orchestrator-framework/references/orchestrator-patterns.md`
- [ ] Dashboard asset copy path `../lib/orchestrator-framework/assets/dashboard.html` valid in orchestrator SKILL.md
- [ ] `make build-cursor && make validate-cursor` passes
- [ ] `platforms/cursor/smoke-cli.sh` passes
- [ ] `git diff --exit-code plugins/maister-cursor` after `make build-cursor`

---

### PR2 — Deduplication: Merge `commands/` → `skills/`

#### 4.2.1 Build Function: `merge_commands_to_skills()`

Port from `platforms/kiro-cli/build.sh` L41–72 with **Cursor-specific targets** per collapse map (§5). Signature:

```bash
merge_commands_to_skills() {
  local commands_dir="$OUT/commands"
  [ -d "$commands_dir" ] || return 0
  # merge_one <command-stem> <target-skill-dir-name> — only when no rich skill exists
  # ...
  rm -rf "$commands_dir"
}
```

**Rules**:

1. **Command-only capabilities** (no rich skill file in source): copy `commands/<stem>.md` → `skills/<target>/SKILL.md`:
   - `reviews-code` → `maister-reviews-code`
   - `reviews-pragmatic` → `maister-reviews-pragmatic`
   - `reviews-production-readiness` → `maister-reviews-production-readiness`
   - `reviews-reality-check` → `maister-reviews-reality-check`
   - `reviews-spec-audit` → `maister-reviews-spec-audit`
   - `work` → `maister-work`

2. **Collapse pairs with existing rich skill**: **do not** copy thin command wrapper. Keep rich skill at plain-kebab dir until PR3 rename (e.g. keep `skills/problem-classifier/SKILL.md`, not `skills/maister-quick-problem-classifier/`).

3. **Cursor overrides** — change step 12 in `build.sh` from copying to `commands/` to merging into skill dirs:
   - `platforms/cursor/overrides/skills/quick-plan/SKILL.md` → `$OUT/skills/quick-plan/SKILL.md` (pre-rename) or directly `$OUT/skills/maister-quick-plan/SKILL.md`
   - `quick-dev`: use rich content from `plugins/maister/skills/quick-dev/SKILL.md` (copied by build), apply Cursor transforms (`AskUserQuestion` → `AskQuestion`). **Do not** use `overrides/commands/quick-dev.md` — that file is a 12-line thin wrapper only. Consider adding `overrides/skills/quick-dev/SKILL.md` if Cursor-specific body diverges from source (same pattern as `quick-plan`).
   - `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` → `$OUT/skills/quick-bugfix/SKILL.md`
   - Remove lines copying overrides to `$OUT/commands/`

4. **Invariant before PR3**: Exactly one source directory per user-facing capability. No coexistence of `skills/maister-quick-problem-classifier` (command-derived) and `skills/problem-classifier` (rich).

#### 4.2.2 Manifest Update

Regenerate `plugin.json` **without** `"commands"` field:

```json
{
  "skills": "./skills/",
  "agents": "./agents/",
  "hooks": "./hooks/hooks.json"
}
```

#### 4.2.3 Remove Commands Directory

```bash
rm -rf "$OUT/commands"
```

#### 4.2.4 Makefile `validate-cursor` Inversion

**Remove** (current L40–49):

- Checks for `commands/quick-plan.md`, `commands/quick-dev.md`
- Thin wrapper line counts (`<25 lines`)
- `"commands"` required in plugin.json (L91)

**Add**:

```bash
test ! -d plugins/maister-cursor/commands
! grep -q '"commands":' plugins/maister-cursor/.cursor-plugin/plugin.json
test -f plugins/maister-cursor/skills/maister-work/SKILL.md          # after PR3; interim: work/ or maister-work/
test -f plugins/maister-cursor/skills/maister-reviews-code/SKILL.md
test -f plugins/maister-cursor/skills/maister-quick-plan/SKILL.md    # or quick-plan/ pre-PR3
test -f plugins/maister-cursor/skills/maister-quick-dev/SKILL.md
test ! -d plugins/maister-cursor/skills/maister-quick-problem-classifier  # collapse check
test -d plugins/maister-cursor/skills/problem-classifier                    # pre-PR3; maister-problem-classifier post-PR3
```

Adjust paths per phase: PR2 may validate plain-kebab dirs; PR3 switches to `maister-*` dir names.

#### 4.2.5 Acceptance Criteria (PR2)

- [ ] `test ! -d plugins/maister-cursor/commands`
- [ ] `plugins/maister-cursor/.cursor-plugin/plugin.json` has no `"commands"` field
- [ ] No duplicate collapse pair (e.g. `maister-problem-classifier` exists; `maister-quick-problem-classifier` does not)
- [ ] `make validate-cursor` passes with skills-only checks
- [ ] `platforms/cursor/smoke-cli.sh` passes (`/maister-quick-plan` still writes plan file)
- [ ] `git diff --exit-code plugins/maister-cursor`

---

### PR3 — Prefix `maister-*` on All Remaining Public Skills

#### 4.3.1 Build Function: `rename_skill_directories()`

Port from `platforms/kiro-cli/build.sh` L74–90:

```bash
rename_skill_directories() {
  local dir skill_file name target_name target_dir
  while IFS= read -r dir; do
    skill_file="$dir/SKILL.md"
    [ -f "$skill_file" ] || continue
    name=$(grep -m1 '^name: ' "$skill_file" | sed 's/^name: //')
    target_name="$name"
    if [[ "$target_name" != maister-* ]]; then
      target_name="maister-${target_name}"
      sedi "s/^name: ${name}/name: ${target_name}/" "$skill_file"
    fi
    target_dir="$OUT/skills/$target_name"
    if [ "$dir" != "$target_dir" ]; then
      mv "$dir" "$target_dir"
    fi
  done < <(find "$OUT/skills" -mindepth 1 -maxdepth 1 -type d)
}
```

**Skip** anything under `$OUT/lib/`. By PR3, `orchestrator-framework` is already in `lib/`.

**D1 enforcement**: Rich skills rename to shorter public names via prior collapse (directory `problem-classifier` → `maister-problem-classifier`, not `maister-quick-problem-classifier`).

#### 4.3.2 Build Function: `apply_skill_reference_transforms()`

Sed across `$OUT` (extend Kiro `apply_delegation_transforms` skill-name patterns). Minimum set:

```
skill: "problem-classifier"           → skill: "maister-problem-classifier"
skill: "transcript-critic"           → skill: "maister-transcript-critic"
skill: "requirements-critic"         → skill: "maister-requirements-critic"
skill: "metaprogram-classifier"      → skill: "maister-metaprogram-classifier"
skill: "context-distiller"           → skill: "maister-context-distiller"
skill: "aggregate-designer"          → skill: "maister-aggregate-designer"
skill: "test-strategy-reviewer"      → skill: "maister-test-strategy-reviewer"
skill: "linguistic-boundary-verifier" → skill: "maister-linguistic-boundary-verifier"
skill: "codebase-analyzer"           → skill: "maister-codebase-analyzer"
skill: "implementation-plan-executor" → skill: "maister-implementation-plan-executor"
skill: "implementation-verifier"     → skill: "maister-implementation-verifier"
skill: "docs-manager"                → skill: "maister-docs-manager"
run `grill-me`                        → run `maister-grill-me`
run `thermos`                         → run `maister-thermos`
run `problem-classifier`             → run `maister-problem-classifier`
… (all plain-kebab skills in inventory)
```

Also update `platforms/cursor/hooks/skill-invocation-reminder.sh` if it references plain skill names (currently references `/maister-*` only — verify post-transform).

Apply to: `skills/`, `agents/`, `rules/`, `hooks/*.sh`, `lib/` (orchestrator refs only if needed).

#### 4.3.3 Makefile `validate-cursor` Extensions

```bash
# All skill names prefixed
! grep -h '^name: ' plugins/maister-cursor/skills/*/SKILL.md | grep -v '^name: maister-'

# No colon names in skills
! grep -h '^name: maister:' plugins/maister-cursor/skills/*/SKILL.md

# No plain-kebab top-level skill dirs
! find plugins/maister-cursor/skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*'

# Plain skill: " references without maister- prefix (orchestrator delegations)
! grep -rE 'skill: "[^m]' plugins/maister-cursor/skills/ --include="*.md" | grep -v 'maister-'
```

Keep existing agent prefix check unchanged.

#### 4.3.4 Acceptance Criteria (PR3)

- [ ] `grep -h '^name: ' plugins/maister-cursor/skills/*/SKILL.md | grep -v '^name: maister-'` returns empty
- [ ] All orchestrator Skill tool delegations use `maister-*` names in generated tree
- [ ] Collapse targets use shorter D1 names (`maister-problem-classifier`, not `maister-quick-problem-classifier`)
- [ ] `platforms/cursor/smoke-cli.sh` passes; `/maister-init` still works
- [ ] `make build-cursor && make validate-cursor`
- [ ] `git diff --exit-code plugins/maister-cursor`

---

### PR4 — Internal Skill-Tool Engines

#### 4.4.1 Candidates

| Source skill (post-PR3) | Invoked by |
|-------------------------|------------|
| `maister-docs-manager` | `maister-init`, `maister-standards-update`, `maister-standards-discover` |
| `maister-codebase-analyzer` | development, migration, performance, research orchestrators |
| `maister-implementation-plan-executor` | development, migration, performance orchestrators |
| `maister-implementation-verifier` | all verify phases |

#### 4.4.2 Attempt 4B: `relocate_internal_skills()`

```bash
relocate_internal_skills() {
  mkdir -p "$OUT/lib/skills"
  for name in docs-manager codebase-analyzer implementation-plan-executor implementation-verifier; do
    local src="$OUT/skills/maister-${name}"
    local dest="$OUT/lib/skills/maister-${name}"
    [ -d "$src" ] && mv "$src" "$dest"
  done
}
```

Keep frontmatter `name: maister-<name>` unless sentinel test proves Cursor requires different addressing. Update `skill: "maister-<name>"` references if path-qualified refs are required.

#### 4.4.3 Sentinel Smoke Test (Gate)

Add to `platforms/cursor/smoke-cli.sh` (or dedicated `platforms/cursor/tests/lib-skill-resolution.sh`):

**Fixture**: `platforms/cursor/tests/fixtures/maister-sentinel-lib-skill/SKILL.md` with unique sentinel string (e.g. `SENTINEL_LIB_SKILL_7f3a9c`).

Build copies fixture to `$OUT/lib/skills/maister-sentinel-lib-skill/` during PR4 branch only; remove from production output after gate passes.

```bash
agent -p --trust --force --plugin-dir plugins/maister-cursor \
  "Invoke the Skill tool for maister-sentinel-lib-skill. Reply only with the sentinel from the loaded SKILL.md."
```

**Pass**: output contains exact sentinel from fixture file. Self-reported "resolved" without sentinel = **fail**.

After pass: remove sentinel fixture from generated tree; rely on orchestrator smoke for real internals.

#### 4.4.4 Fallback 4A: `relocate_internal_skills_fallback()`

If Skill tool **cannot** load `lib/skills/`:

```bash
# Move back to skills/maister-internal-<name>/
# Frontmatter:
#   disable-model-invocation: true
#   description: "[INTERNAL] Orchestrator-only — do not invoke directly."
```

Update orchestrator `skill: "maister-<name>"` → `skill: "maister-internal-<name>"`. Document in `rules/maister-workflows.mdc`.

#### 4.4.5 Acceptance Criteria (PR4)

- [ ] Internal engines absent from palette (4B) **or** only `maister-internal-*` visible (4A)
- [ ] Sentinel smoke test proves or disproves `lib/skills/` resolution
- [ ] Full orchestrator path: `/maister-quick-plan` writes plan file
- [ ] `/maister-init` reaches docs-management flow (`maister-docs-manager` or `maister-internal-docs-manager`)
- [ ] `make build-cursor && make validate-cursor && platforms/cursor/smoke-cli.sh`
- [ ] `git diff --exit-code plugins/maister-cursor`

---

### PR5 — Rules, Documentation, and Inventory Test

#### 4.5.1 `platforms/cursor/templates/maister-workflows-template.mdc`

Add **Slash palette policy** section:

- User-facing: only `/maister-*` (categories: work, orchestrators, reviews, modeling, quick utilities)
- Internal: `maister-internal-*` if 4A fallback — orchestrators only
- Never invoke internal skills from user chat unless explicitly debugging

#### 4.5.2 `docs/cursor-agent-support.md`

New subsection **Skill visibility & naming**:

- Platform limits (`user-invocable`, `disable-model-invocation`)
- Collapse map migration for bookmarked names (`/problem-classifier` → `/maister-problem-classifier`)
- Remove references to `commands/` paths

#### 4.5.3 `plugins/maister/CLAUDE.md` (optional)

One paragraph under Cursor platform: public names are `maister-*` in Cursor build; source plain-kebab unchanged for Claude Code.

#### 4.5.4 `.maister/docs/standards/global/plugin-development.md`

Add **Cursor variant** bullet: prefix enforcement and commands merge in `platforms/cursor/build.sh`, not in source `name:` for utility skills.

#### 4.5.5 New File: `platforms/cursor/tests/skill-inventory.test.sh`

Wire into `make validate-cursor`:

| Check | Rule |
|-------|------|
| Skill count | `find skills -mindepth 1 -maxdepth 1 -type d \| wc -l` within expected range (~25–27 public + optional 4× internal) |
| Prefix | All `skills/*/SKILL.md` names match `^maister-` or `^maister-internal-` |
| No commands dir | `! test -d commands` |
| No plain kebab dirs | `! find skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*'` |
| lib orchestrator | `test -d lib/orchestrator-framework/references` && `test -f lib/orchestrator-framework/references/orchestrator-patterns.md` |

#### 4.5.6 Acceptance Criteria (PR5)

- [ ] Docs match built plugin behavior
- [ ] No references to removed `commands/` in Cursor docs
- [ ] `platforms/cursor/tests/skill-inventory.test.sh` runs from `make validate-cursor`
- [ ] Manual IDE: `/` autocomplete shows only `maister-*` (+ optional `maister-internal-*`)
- [ ] Full regression checklist (§7.3) passes

---

## 5. Collapse Map Table

After merge, each row becomes **one** `skills/maister-*/SKILL.md` (full workflow from rich skill file, not thin command wrapper).

| Retire (command or duplicate name) | Keep (public skill `name:`) | Content source |
|-----------------------------------|----------------------------|----------------|
| `maister-quick-problem-classifier` | `maister-problem-classifier` | `skills/problem-classifier/SKILL.md` |
| `maister-quick-transcript-critic` | `maister-transcript-critic` | `skills/transcript-critic/SKILL.md` |
| `maister-quick-requirements-critic` | `maister-requirements-critic` | `skills/requirements-critic/SKILL.md` |
| `maister-quick-metaprogram-classifier` | `maister-metaprogram-classifier` | `skills/metaprogram-classifier/SKILL.md` |
| `maister-modeling-context-distiller` | `maister-context-distiller` | `skills/context-distiller/SKILL.md` |
| `maister-modeling-aggregate-designer` | `maister-aggregate-designer` | `skills/aggregate-designer/SKILL.md` |
| `maister-reviews-test-strategy` | `maister-test-strategy-reviewer` | `skills/test-strategy-reviewer/SKILL.md` |
| `maister-reviews-linguistic-boundaries` | `maister-linguistic-boundary-verifier` | `skills/linguistic-boundary-verifier/SKILL.md` |
| `commands/quick-plan` + skill dup | `maister-quick-plan` | `platforms/cursor/overrides/skills/quick-plan/SKILL.md` |
| `commands/quick-dev` + skill dup | `maister-quick-dev` | `plugins/maister/skills/quick-dev/SKILL.md` (+ Cursor sed transforms); **not** thin `overrides/commands/quick-dev.md` |
| `commands/quick-bugfix` (if present) | `maister-quick-bugfix` | `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` |

**Command-only merges** (no separate source skill — copy command body to new skill dir):

| Command stem | Target skill `name:` | Source |
|--------------|---------------------|--------|
| `reviews-code` | `maister-reviews-code` | `commands/reviews-code.md` |
| `reviews-pragmatic` | `maister-reviews-pragmatic` | `commands/reviews-pragmatic.md` |
| `reviews-spec-audit` | `maister-reviews-spec-audit` | `commands/reviews-spec-audit.md` |
| `reviews-reality-check` | `maister-reviews-reality-check` | `commands/reviews-reality-check.md` |
| `reviews-production-readiness` | `maister-reviews-production-readiness` | `commands/reviews-production-readiness.md` |
| `work` | `maister-work` | `commands/work.md` |

**Orchestrators** (already skills — prefix + rename only in PR3):

`maister-init`, `maister-development`, `maister-research`, `maister-migration`, `maister-performance`, `maister-product-design`, `maister-standards-discover`, `maister-standards-update`

**Utilities** (prefix only in PR3):

`maister-grill-me`, `maister-thermos`, `maister-thermo-nuclear-review`, `maister-thermo-nuclear-code-quality-review`

**Target palette size**: ~25–27 public `maister-*` skills (down from ~44).

---

## 6. Skill Taxonomy (Target)

| Class | Examples | In `/` palette? | Location after build |
|-------|----------|-----------------|----------------------|
| **A. Public** | `maister-work`, `maister-development`, `maister-problem-classifier`, `maister-reviews-code` | Yes | `skills/maister-*/SKILL.md` |
| **B. Internal (Skill tool)** | `maister-docs-manager`, `maister-codebase-analyzer`, `maister-implementation-plan-executor`, `maister-implementation-verifier` | Minimize — 4B: no; 4A: `maister-internal-*` | `lib/skills/maister-*/` or `skills/maister-internal-*/` |
| **C. Reference-only** | `orchestrator-framework` | **No** | `lib/orchestrator-framework/` |

### Full Public Skill Inventory (Target ~25–27)

**Orchestrators (8)**: `maister-init`, `maister-development`, `maister-research`, `maister-migration`, `maister-performance`, `maister-product-design`, `maister-standards-discover`, `maister-standards-update`

**Work routing (1)**: `maister-work`

**Quick flows (3)**: `maister-quick-plan`, `maister-quick-dev`, `maister-quick-bugfix`

**Reviews (6)**: `maister-reviews-code`, `maister-reviews-pragmatic`, `maister-reviews-spec-audit`, `maister-reviews-reality-check`, `maister-reviews-production-readiness`, plus collapsed `maister-test-strategy-reviewer`, `maister-linguistic-boundary-verifier`

**Modeling / classifiers (8)**: `maister-problem-classifier`, `maister-transcript-critic`, `maister-requirements-critic`, `maister-metaprogram-classifier`, `maister-context-distiller`, `maister-aggregate-designer`, `maister-grill-me`, `maister-thermos`, `maister-thermo-nuclear-review`, `maister-thermo-nuclear-code-quality-review`

*(Exact count depends on whether review collapsed skills are counted separately — baseline ~25–27 after inventory test in PR5.)*

---

## 7. Validation and Testing Strategy

### 7.1 Per-Phase Automated Gates

```bash
make build-cursor && make validate-cursor
platforms/cursor/smoke-cli.sh
git diff --exit-code plugins/maister-cursor
```

### 7.2 Structural Validation (`make validate-cursor`)

| Phase | New/updated checks |
|-------|-------------------|
| PR1 | No `skills/orchestrator-framework`; `lib/orchestrator-framework/references/orchestrator-patterns.md` exists; no stale `skills/orchestrator-framework` paths |
| PR2 | `! test -d commands`; no `"commands"` in plugin.json; merged skills exist; no duplicate collapse pairs |
| PR3 | All `^name: maister-`; no plain-kebab skill dirs; no plain `skill: "` refs |
| PR4 | Internal skills in `lib/skills/` or `maister-internal-*` per outcome |
| PR5 | `bash platforms/cursor/tests/skill-inventory.test.sh` |

**Retain** existing checks: hooks.json, mcp.json, agent prefixes, readonly agents, no TaskCreate/TaskUpdate, no EnterPlanMode, rules files.

### 7.3 Full Regression Checklist (Post-PR5)

- [ ] `make build-cursor && make validate-cursor`
- [ ] `platforms/cursor/smoke-cli.sh`
- [ ] `platforms/cursor/tests/skill-inventory.test.sh`
- [ ] Manual IDE: `/` autocomplete shows only `maister-*` (+ optional `maister-internal-*`)
- [ ] `/maister-work "test"` classifies and routes
- [ ] `/maister-init` scaffolds `.maister/docs/`
- [ ] `/maister-problem-classifier "…"` runs (formerly quick-problem-classifier + problem-classifier)
- [ ] `git status --porcelain plugins/maister-cursor` clean after build
- [ ] CI `.github/workflows/validate-generated-variants.yml` passes

### 7.4 Runtime Smoke (`platforms/cursor/smoke-cli.sh`)

Existing tests (retain and extend):

| Test | Validates |
|------|-----------|
| Test 1 | Plugin detection; `maister-init` skill exists |
| Test 2 | Task + `maister-gap-analyzer` custom agent |
| Test 2b | readonly frontmatter on built agents |
| Test 3 | `/maister-quick-plan` writes `.maister/plans/*.md` |
| **PR4** | Sentinel `lib/skills/` Skill tool resolution |
| **PR4** | `/maister-init` docs-management flow |

### 7.5 CI Drift (D6)

`.github/workflows/validate-generated-variants.yml` runs `make build` then `git diff --exit-code` on `plugins/maister-cursor/`. Developers must commit regenerated output after each PR.

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Skill tool cannot load `lib/skills/` | Medium | High — internal orchestration breaks | Sentinel smoke test in PR4; fallback 4A to `maister-internal-*` |
| Broken relative paths after `orchestrator-framework` move | Medium | High — dashboard, patterns refs break | Grep build output for `skills/orchestrator-framework`; validate-cursor checks |
| Users accustomed to old slash names | High | Low — breaking but accepted (D1) | Document migration in `docs/cursor-agent-support.md` |
| Sed transform misses a reference | Medium | Medium — wrong skill invoked | `validate-cursor` grep for plain-kebab `skill: "` without `maister-`; extend patterns from Kiro |
| Parallel PR touches `build.sh` | Low | Medium — merge conflicts | Rebase `2026-07-08-cursor-platform-review-fixes` first; single-branch `build.sh` integration |
| Override merge breaks quick-dev delegation | Medium | Medium | Merge `quick-dev` override body; fix `skill: "quick-dev"` → `skill: "maister-quick-dev"` in PR3 sed |
| Inventory count drift as skills added | Low | Low | Document baseline count in `skill-inventory.test.sh` after PR2; update range in PR5 |

---

## 9. Files to Modify (Complete List)

### Source / Platform (edit by hand)

| File | PR | Change |
|------|-----|--------|
| `platforms/cursor/build.sh` | PR1–PR4 | Add `relocate_orchestrator_framework()`, `merge_commands_to_skills()`, `rename_skill_directories()`, `apply_skill_reference_transforms()`, `relocate_internal_skills()` (+ fallback); update `TODO_GLOB`, manifest generation, override application order |
| `platforms/cursor/overrides/commands/quick-plan.md` | — | Unchanged content; consumption path changes (no longer → `commands/`) |
| `platforms/cursor/overrides/commands/quick-dev.md` | PR2 | Merged into skill dir, not `commands/` |
| `platforms/cursor/overrides/skills/quick-plan/SKILL.md` | PR2 | Target for `maister-quick-plan` skill body |
| `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` | PR2 | Target for `maister-quick-bugfix` skill body |
| `platforms/cursor/patches/orchestrator-patterns-todowrite.md` | PR1 | Verify append target path (build.sh handles destination) |
| `platforms/cursor/templates/maister-workflows-template.mdc` | PR5 | Slash palette policy section |
| `platforms/cursor/hooks/skill-invocation-reminder.sh` | PR3 | Update if plain skill names referenced |
| `platforms/cursor/smoke-cli.sh` | PR4 | Sentinel test; optional `/maister-init` internal skill check |
| `platforms/cursor/tests/skill-inventory.test.sh` | PR5 | **New** — structural inventory |
| `platforms/cursor/tests/fixtures/maister-sentinel-lib-skill/SKILL.md` | PR4 | **New** — sentinel fixture (temporary) |
| `Makefile` | PR1–PR5 | Invert `validate-cursor` from commands-centric to skills-only; wire inventory test |
| `docs/cursor-agent-support.md` | PR5 | Skill visibility, naming migration, remove `commands/` docs |
| `plugins/maister/CLAUDE.md` | PR5 | Optional Cursor platform note |
| `.maister/docs/standards/global/plugin-development.md` | PR5 | Cursor variant bullet |

### Generated (rebuild only — never hand-edit)

| Path | PR |
|------|-----|
| `plugins/maister-cursor/**` | All — full tree regenerated by `make build-cursor` |
| `plugins/maister-cursor/.cursor-plugin/plugin.json` | PR2 — remove `"commands"` |
| `plugins/maister-cursor/lib/orchestrator-framework/**` | PR1 |
| `plugins/maister-cursor/lib/skills/**` | PR4 (4B) |
| `plugins/maister-cursor/skills/maister-*/**` | PR2–PR4 |
| `plugins/maister-cursor/rules/maister-workflows.mdc` | PR5 (from template) |

### Unchanged (reference only)

| File | Role |
|------|------|
| `platforms/kiro-cli/build.sh` | Reference for `merge_commands_to_skills`, `rename_skill_directories`, sed patterns |
| `plugins/maister/**` | Source of truth — no renames for this task |
| `.github/workflows/validate-generated-variants.yml` | Existing CI drift — no change required |
| `platforms/cursor/hooks/hooks.json` | No change unless skill names in hook scripts |
| `platforms/cursor/agents/explore.md` | No change |

### Explicitly Out of Scope

- `plugins/maister-copilot/**`
- `plugins/maister-kiro/**`
- `platforms/kiro-cli/build.sh` (read-only reference)
- `platforms/copilot-cli/build.sh`

---

## Appendix: Current vs Target Build Step Mapping

| Current `build.sh` step | Action |
|-------------------------|--------|
| L30–48 manifest with `"commands"` | PR2: remove `"commands"` field |
| L51–54 command name sed | PR2: commands dir removed after merge |
| L232–236 overrides → `commands/` | PR2: redirect to `skills/` merge |
| L272–284 `TODO_GLOB` | PR1: `skills/orchestrator-framework` → `lib/orchestrator-framework` |
| L296–300 patch append | PR1: update path to `lib/orchestrator-framework/...` |
| *(missing)* | PR2: `merge_commands_to_skills()` |
| *(missing)* | PR3: `rename_skill_directories()`, `apply_skill_reference_transforms()` |
| *(missing)* | PR4: `relocate_internal_skills()` |

---

## Related Artifacts

- `.maister/plans/2026-07-08-cursor-skill-prefix-and-palette.md` — authoritative plan
- `.maister/plans/2026-07-08-cursor-platform-review-fixes.md` — orthogonal (hooks, CI drift; coordinate `build.sh` merges)
- `.maister/docs/standards/global/build-pipeline.md` — never edit generated variants
- Analysis: `analysis/requirements.md`, `analysis/gap-analysis.md`, `analysis/codebase-analysis.md`
