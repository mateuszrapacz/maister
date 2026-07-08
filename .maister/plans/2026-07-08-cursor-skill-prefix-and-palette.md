# Cursor Skill Prefix & Slash Palette — Implementation Plan

**Date**: 2026-07-08  
**Scope**: `platforms/cursor/` (build transform) and generated output `plugins/maister-cursor/`  
**Origin**: Review conversation — internal skills without `maister-` prefix are exposed in Cursor slash autocomplete alongside `commands/`; duplication (e.g. `/maister-quick-problem-classifier` + `/problem-classifier`).  
**Status**: Reviewed and corrected — decisions locked per recommendations below; implementation pending.

**How to use this file**: Work phase-by-phase (PR1 → PR5). After each PR: `make build-cursor && make validate-cursor`, then `platforms/cursor/smoke-cli.sh`. Committed `plugins/maister-cursor/` must match fresh build (CI drift check per `.github/workflows/validate-generated-variants.yml`).

---

## Problem statement

In the Cursor variant today:

1. **All skills under `skills/` appear in slash autocomplete** — Cursor loads every `SKILL.md` plus every `commands/*.md`. There is no documented API to hide entries from the palette.
2. **`user-invocable: false` is ignored** — it is a Claude Code convention; `platforms/cursor/build.sh` does not transform it. Kiro explicitly strips it in its build; Cursor does not.
3. **Prefix `maister-` is inconsistent** — all `commands/` use `maister-*`, but many skills keep plain kebab names (`problem-classifier`, `codebase-analyzer`, `grill-me`, …).
4. **Duplication** — thin `commands/` wrappers coexist with full skills for the same capability (e.g. `maister-quick-problem-classifier` command + `problem-classifier` skill; `quick-plan` command + `maister-quick-plan` skill).

**Current inventory (approx.)**: ~16 commands + ~28 skills → ~44 palette entries, with overlap.

---

## Goals

1. **One entry per user-facing capability** — no command + skill duplicates.
2. **Consistent namespace** — all user-facing slash skills use `/maister-*`.
3. **Internal engines** — still invocable via Skill tool by orchestrators; minimize palette noise.
4. **Source of truth unchanged for other platforms** — transforms live in `platforms/cursor/build.sh` (+ overrides); do not break `plugins/maister/` for Claude Code.

## Non-goals

- Hiding skills from Cursor palette entirely (platform limitation — unless relocated outside `skills/`).
- Changing `plugins/maister-copilot/` or `plugins/maister-kiro/` in this effort (Cursor-only unless shared source reference updates are required).
- Renaming skills in `plugins/maister/` source to `maister:*` for utilities already using plain kebab (build-time transform only).

---

## Platform constraint (Cursor)

| Mechanism | Effect in Cursor |
|-----------|------------------|
| `user-invocable: false` | **Not supported** — no effect on palette |
| `disable-model-invocation: true` | Blocks auto-invocation by model; **still appears** in `/` list |
| File outside `skills/` | **Not a slash command** — Skill tool may not resolve it (must smoke-test) |

**Implication**: “Internal” means either (a) relocated outside `skills/`, or (b) prefixed `maister-internal-*` + rules/docs, accepting palette visibility.

---

## Locked decisions (per review recommendations)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Public utility naming | **Shorter form** — e.g. `maister-problem-classifier`, not `maister-quick-problem-classifier`. Retire `quick-*` / `modeling-*` / `reviews-*` as separate public skill names where they duplicate the underlying skill. Update user docs to the shorter `maister-*` name. |
| D2 | `grill-me` | Rename to **`maister-grill-me`** in Cursor build output. |
| D3 | `commands/` directory | **Remove entirely** after merge into `skills/` (Kiro pattern). Drop `"commands"` from `.cursor-plugin/plugin.json` or point to empty/unused path. |
| D4 | Internal engines | **Phase 4B first** — relocate to `lib/skills/`; smoke-test Skill tool with a sentinel-based resolution test. **Fallback 4A** if Skill tool cannot address `lib/skills/`: keep in `skills/` as `maister-internal-*` + `disable-model-invocation: true` + `[INTERNAL]` description prefix. |
| D5 | `orchestrator-framework` | **Always relocate first** to `lib/orchestrator-framework/` before global skill directory renaming. It is reference-only; orchestrators use `Read`, not Skill tool. Guaranteed palette win and avoids a later `skills/orchestrator-framework` vs `skills/maister-orchestrator-framework` path conflict. |
| D6 | CI drift | **Option B (fail-fast)** — already in repo; every PR must leave `plugins/maister-cursor/` reproducible from build. |

---

## Skill taxonomy (target)

| Class | Examples | In `/` palette? | Location after build |
|-------|----------|-----------------|----------------------|
| **A. Public** | `maister-work`, `maister-development`, `maister-problem-classifier`, `maister-reviews-code` | Yes | `skills/maister-*/SKILL.md` |
| **B. Internal (Skill tool)** | `codebase-analyzer`, `docs-manager`, `implementation-plan-executor`, `implementation-verifier` | Minimize (4B or `maister-internal-*`) | `lib/skills/…` or `skills/maister-internal-*/` |
| **C. Reference-only** | `orchestrator-framework` (patterns, assets, html style) | **No** | `lib/orchestrator-framework/` |

---

## Collapse map: duplicate pairs → single public skill

After merge, each row becomes **one** `skills/maister-*/SKILL.md` (full workflow content from the rich skill file, not the thin command wrapper).

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
| `commands/quick-dev` + skill dup | `maister-quick-dev` | `platforms/cursor/overrides/commands/quick-dev.md` → merge body into skill override |
| `commands/quick-bugfix` (if added) | `maister-quick-bugfix` | `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` |

**Commands that delegate to subagents** (no separate skill file today) — merge command markdown into new skill dirs:

- `maister-reviews-code`, `maister-reviews-pragmatic`, `maister-reviews-spec-audit`, `maister-reviews-reality-check`, `maister-reviews-production-readiness`, `maister-work`

**Orchestrators** (already skills, only need prefix + rename):

- `maister-init`, `maister-development`, `maister-research`, `maister-migration`, `maister-performance`, `maister-product-design`, `maister-standards-discover`, `maister-standards-update`

**Utilities** (prefix only):

- `maister-grill-me`, `maister-thermos`, `maister-thermo-nuclear-review`, `maister-thermo-nuclear-code-quality-review`

**Target palette size**: ~25–27 public `maister-*` skills (down from ~44).

---

## Applicable standards

Read before implementation:

- `.maister/docs/standards/global/build-pipeline.md` — never edit `plugins/maister-cursor/` directly; Cursor transforms in `platforms/cursor/`.
- `.maister/docs/standards/global/plugin-development.md` — thin commands, SKILL.md as source of truth (this plan **eliminates** `commands/` on Cursor in favor of skills-only discovery).
- `.maister/docs/standards/global/minimal-implementation.md` — no speculative features; smoke-test before 4B commitment.

**Key files**:

- `platforms/cursor/build.sh` — primary implementation surface
- `platforms/cursor/overrides/` — quick-plan, quick-dev, quick-bugfix Cursor-specific flows
- `platforms/cursor/templates/maister-workflows-template.mdc` — update palette / invocation docs
- `Makefile` — extend `validate-cursor`
- `platforms/cursor/smoke-cli.sh` — extend skill inventory checks
- `docs/cursor-agent-support.md` — user-facing Cursor install/usage

**Reference implementation**: `platforms/kiro-cli/build.sh` — `merge_commands_to_skills()`, `rename_skill_directories()`, skill reference sed transforms (step 13).

---

## Phase 1 — Reference layout: `orchestrator-framework` → `lib/` (PR1)

Do this before global skill directory renaming. If PR2 renames every `skills/*` directory first, `orchestrator-framework` becomes `maister-orchestrator-framework` and the later move step must chase two possible paths.

### 1.1 Move the reference-only framework

Build steps:

1. `mkdir -p "$OUT/lib"`
2. `mv "$OUT/skills/orchestrator-framework" "$OUT/lib/orchestrator-framework"`
3. Update orchestrator references from `../orchestrator-framework/` to `../lib/orchestrator-framework/` (or a tested plugin-root-relative equivalent).
4. Update Cursor-only transform paths in `platforms/cursor/build.sh`, including TodoWrite transforms and patch append paths that currently point at `$OUT/skills/orchestrator-framework`.

### 1.2 Add validation

- `plugins/maister-cursor/skills/orchestrator-framework` does not exist.
- `plugins/maister-cursor/lib/orchestrator-framework/references/orchestrator-patterns.md` exists.
- Grep built output for stale `skills/orchestrator-framework` asset paths and stale `../orchestrator-framework/` relative references.

### Acceptance (PR1)

- [ ] Palette has no `/orchestrator-framework`
- [ ] `maister-development` smoke path still finds `orchestrator-patterns.md`
- [ ] Dashboard asset copy path still valid
- [ ] `make build-cursor && make validate-cursor`
- [ ] `git diff --exit-code plugins/maister-cursor` after `make build-cursor`

---

## Phase 2 — Deduplication: merge `commands/` → `skills/` (PR2)

### 2.1 Add `merge_commands_to_skills()` to `platforms/cursor/build.sh`

Port the Kiro pattern with Cursor-specific target names from the D1 collapse map:

- For each command that has no richer skill file today (`reviews-code`, `reviews-pragmatic`, `reviews-production-readiness`, `reviews-reality-check`, `reviews-spec-audit`, `work`), copy `commands/<stem>.md` to `skills/<target>/SKILL.md`.
- For rows in the collapse map with an existing rich skill file, **do not** copy the thin command wrapper. Keep the rich skill content and make its eventual public name the shorter target (`maister-problem-classifier`, `maister-context-distiller`, etc.).
- For `quick-plan`, `quick-dev`, and `quick-bugfix`, apply Cursor overrides directly into `skills/maister-quick-*` (or into pre-rename dirs followed immediately by deterministic rename). Do not leave a command wrapper behind.

### 2.2 Handle duplicate names before directory rename

Before calling `rename_skill_directories()`, remove or ignore command-derived duplicate targets. Example: after choosing `maister-problem-classifier`, there must not be both a command-derived `skills/maister-quick-problem-classifier` and a rich `skills/problem-classifier` waiting to become `skills/maister-problem-classifier`.

The invariant after this phase: there is exactly one source directory per user-facing capability, even if some of those directories are still plain kebab until Phase 3.

### 2.3 Remove `commands/` and manifest entry

```bash
rm -rf "$OUT/commands"
```

Update generated `plugin.json` — remove `"commands": "./commands/"` field.

### 2.4 Update `validate-cursor` command checks

Remove checks that require `plugins/maister-cursor/commands/quick-plan.md`, `plugins/maister-cursor/commands/quick-dev.md`, or thin command wrappers. Replace them with:

- `test ! -d plugins/maister-cursor/commands`
- `! grep -q '"commands":' plugins/maister-cursor/.cursor-plugin/plugin.json`
- expected merged skill files exist (`skills/maister-work/SKILL.md`, `skills/maister-reviews-code/SKILL.md`, `skills/maister-quick-plan/SKILL.md`, `skills/maister-quick-dev/SKILL.md`)

### Acceptance (PR2)

- [ ] `test ! -d plugins/maister-cursor/commands`
- [ ] `plugins/maister-cursor/.cursor-plugin/plugin.json` has no `"commands"` field
- [ ] No duplicate collapse pair exists. For example, `maister-problem-classifier` exists and `maister-quick-problem-classifier` does not.
- [ ] `make validate-cursor` passes with updated skills-only checks
- [ ] `platforms/cursor/smoke-cli.sh` passes
- [ ] `git diff --exit-code plugins/maister-cursor` after `make build-cursor`

---

## Phase 3 — Prefix `maister-*` on all remaining public skills (PR3)

### 3.1 Add `rename_skill_directories()` (from Kiro)

For each `skills/*/SKILL.md`:

- If `name:` does not start with `maister-`, set `name: maister-${name}`
- Rename directory `skills/foo` → `skills/maister-foo`

Skip anything under `lib/`; by this point `orchestrator-framework` is already outside `skills/`.

### 3.2 Add `apply_skill_reference_transforms()`

Sed replacements across `$OUT` (minimum set — extend from Kiro step 13):

```
skill: "problem-classifier"           → skill: "maister-problem-classifier"
skill: "codebase-analyzer"            → skill: "maister-codebase-analyzer"
skill: "implementation-plan-executor" → skill: "maister-implementation-plan-executor"
skill: "implementation-verifier"      → skill: "maister-implementation-verifier"
skill: "docs-manager"                 → skill: "maister-docs-manager"
run `grill-me`                        → run `maister-grill-me`
run `thermos`                         → run `maister-thermos`
… (all plain-kebab skills)
```

Also update `hooks/skill-invocation-reminder.sh` text if it references plain names.

### 3.3 Extend `validate-cursor` (Makefile)

New checks:

- Every `plugins/maister-cursor/skills/*/SKILL.md` has `^name: maister-`
- No `^name: maister:` colons in skills
- No top-level `plugins/maister-cursor/skills/<plain-kebab>` directories remain
- Agent prefix check (already exists) unchanged

### Acceptance (PR3)

- [ ] `grep -h '^name: ' plugins/maister-cursor/skills/*/SKILL.md | grep -v '^name: maister-'` returns empty
- [ ] All orchestrator Skill tool delegations use `maister-*` names in generated tree
- [ ] Collapse targets keep the shorter names from D1 (`maister-problem-classifier`, not `maister-quick-problem-classifier`)
- [ ] `platforms/cursor/smoke-cli.sh` + `/maister-init` still works

---

## Phase 4 — Internal Skill-tool engines (PR4)

**Candidates**:

| Source skill | Invoked by |
|--------------|------------|
| `docs-manager` | `maister-init`, `maister-standards-update`, `maister-standards-discover` |
| `codebase-analyzer` | development, migration, performance, research orchestrators |
| `implementation-plan-executor` | development, migration, performance orchestrators |
| `implementation-verifier` | all verify phases |

### 4.1 Attempt 4B: move internals to `lib/skills/`

1. `mkdir -p "$OUT/lib/skills"`
2. Move each internal dir from `skills/maister-<name>` to `lib/skills/maister-<name>`
3. Keep frontmatter `name: maister-<name>` unless the smoke test proves Cursor requires a different addressing scheme
4. Update all generated `skill: "…"` references if Cursor's Skill tool requires a path-qualified or `skill://` style reference

### 4.2 Sentinel-based smoke test (gate before merging PR4)

Use a temporary test-only internal skill during the PR4 branch, or add a small fixture under `platforms/cursor/tests/fixtures/` that the smoke script copies into the built plugin before invoking the CLI. The skill must contain a unique sentinel string and instruct the agent to reply with it only after the skill has loaded.

```bash
agent -p --trust --force --plugin-dir plugins/maister-cursor \
  "Invoke the Skill tool for maister-sentinel-lib-skill. Reply only with the sentinel from the loaded SKILL.md."
```

Passing condition: the output contains the exact sentinel from the `lib/skills/maister-sentinel-lib-skill/SKILL.md` file. A self-reported “resolved” answer is not sufficient.

After the sentinel proves `lib/skills/` resolution, remove the temporary fixture from generated output and rely on orchestrator smoke tests for the real internal engines.

### 4.3 Fallback 4A: keep internals visible but clearly marked

If **Skill tool fails** for `lib/skills/` paths:

- Move internals back under `skills/maister-internal-<name>/`
- Set `disable-model-invocation: true`
- Description prefix: `[INTERNAL] Orchestrator-only — do not invoke directly.`
- Document in `rules/maister-workflows.mdc`
- Update orchestrator references to `maister-internal-<name>`

### Acceptance (PR4)

- [ ] Internal engines either absent from palette (4B success) or only visible as `maister-internal-*` (4A fallback)
- [ ] Sentinel smoke test proves or disproves `lib/skills/` resolution
- [ ] Full orchestrator path smoke: `/maister-quick-plan` writes plan file
- [ ] `/maister-init` still reaches docs-management flow

---

## Phase 5 — Rules, documentation, and inventory test (PR5)

### 5.1 `platforms/cursor/templates/maister-workflows-template.mdc`

Add section **Slash palette policy**:

- User-facing: only `/maister-*` (list categories: work, orchestrators, reviews, modeling, quick)
- Internal: `maister-internal-*` if 4A fallback — orchestrators only
- Never invoke internal skills from user chat unless explicitly debugging

### 5.2 `docs/cursor-agent-support.md`

New subsection: **Skill visibility & naming** — document platform limits, collapse map, migration note for users who bookmarked old names (`/problem-classifier` → `/maister-problem-classifier`).

### 5.3 `plugins/maister/CLAUDE.md` (optional, cross-platform note)

One paragraph under Cursor platform: public names are `maister-*` in Cursor build; source plain-kebab names unchanged for Claude Code.

### 5.4 `.maister/docs/standards/global/plugin-development.md`

Add **Cursor variant** bullet: prefix enforcement and commands merge happen in `platforms/cursor/build.sh`, not in source `name:` for utility skills.

### 5.5 Add `platforms/cursor/tests/skill-inventory.test.sh`

| Check | Rule |
|-------|------|
| Skill count | `find skills -mindepth 1 -maxdepth 1 -type d \| wc -l` within expected range (document baseline after PR2) |
| Prefix | All `skills/*/SKILL.md` names match `^maister-` or `^maister-internal-` |
| No commands dir | `! test -d commands` |
| No plain kebab dirs | `! find skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*'` |
| lib orchestrator | `test -d lib/orchestrator-framework/references/orchestrator-patterns.md` |

Wire into `make validate-cursor`; keep runtime flow checks in `platforms/cursor/smoke-cli.sh`.

### Acceptance (PR5)

- [ ] Docs match built plugin behavior
- [ ] No references to removed `commands/` paths in Cursor docs
- [ ] `platforms/cursor/tests/skill-inventory.test.sh` runs from `make validate-cursor`
- [ ] Manual IDE: `/` autocomplete shows only `maister-*` plus optional `maister-internal-*`

---

## PR sequence

```mermaid
flowchart LR
  PR1[PR1: orchestrator-framework to lib] --> PR2[PR2: merge + collapse commands]
  PR2 --> PR3[PR3: maister- prefix]
  PR3 --> PR4[PR4: internal engines 4B/4A]
  PR4 --> PR5[PR5: docs + inventory test]
```

| PR | Scope | Risk | Estimate |
|----|-------|------|----------|
| PR1 | `orchestrator-framework` → `lib` | Low | 2–4 h |
| PR2 | merge commands, collapse duplicates, remove manifest commands path | Medium — skill cross-refs and validation changes | 0.5–1 d |
| PR3 | `rename_skill_directories()` + reference sed | Low — mechanical | 0.5 d |
| PR4 | internal engines 4B + sentinel smoke gate, fallback 4A if needed | Medium | 1 d |
| PR5 | docs, validate, inventory test | Low | 2–4 h |

---

## Regression checklist (full implementation)

- [ ] `make build-cursor && make validate-cursor`
- [ ] `platforms/cursor/smoke-cli.sh`
- [ ] `platforms/cursor/tests/skill-inventory.test.sh` (new)
- [ ] Manual IDE: `/` autocomplete shows only `maister-*` (+ optional `maister-internal-*`)
- [ ] `/maister-work "test"` classifies and routes
- [ ] `/maister-init` scaffolds `.maister/docs/`
- [ ] `/maister-problem-classifier "…"` runs (formerly quick-problem-classifier + problem-classifier)
- [ ] `git status --porcelain plugins/maister-cursor` clean after build
- [ ] CI `validate-generated-variants` passes

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Skill tool cannot load `lib/skills/` | Sentinel smoke test in PR4; fallback 4A |
| Broken relative paths after `orchestrator-framework` move | Grep for `orchestrator-framework` in build output; add validate check |
| Users accustomed to old slash names | Document migration in `docs/cursor-agent-support.md`; old names removed from palette (breaking change — acceptable per D1) |
| Sed transform misses a reference | `validate-cursor` grep for plain-kebab `skill: "` patterns without `maister-` |
| Parallel PR with `2026-07-08-cursor-platform-review-fixes.md` | That plan is largely complete; this plan is orthogonal (naming/palette). Coordinate if both touch `build.sh` — merge build.sh changes in one branch or rebase sequentially. |

---

## Open questions

**None** — all decisions locked in table above (D1–D6).

---

## Related artifacts

- `.maister/plans/2026-07-08-cursor-platform-review-fixes.md` — hooks, readonly agents, CI drift, rule size (separate effort, mostly done)
- `platforms/kiro-cli/build.sh` — reference for `merge_commands_to_skills`, `rename_skill_directories`
- `docs/cursor-agent-support.md` — §8 "Commands vs Skills" (will need update after this plan)
