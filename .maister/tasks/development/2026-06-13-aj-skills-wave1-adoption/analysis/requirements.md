# Requirements: AJ Skills Wave 1 Adoption (Epic E1)

**Date:** 2026-06-13  
**Task:** Port Wave 1 Architekt Jutra skills to Maister plugin

## Initial Description

Port Wave 1 Architekt Jutra skills to Maister plugin (Epic E1): `requirements-critic`, `transcript-critic`, `problem-classifier` with `quick-*` commands, `disable-model-invocation` on critics, CLAUDE.md backfill for `grill-me`/`thermos`.

Derived from research: `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`

## Q&A — Phase 1 Clarifications

Resolved from research ADRs (see `analysis/clarifications.md`).

## Q&A — Phase 2 Scope Gate

| Question | Answer |
|----------|--------|
| `disable-model-invocation` scope | Critics only (`requirements-critic`, `transcript-critic`) |
| Language preference gate | Defer; port bilingual bodies as-is |
| Bundle A documentation | CLAUDE.md + chain sections in SKILL.md |
| `modeling-*` category docs | Defer to Wave 4 |
| Continue to specification? | Yes |

## Q&A — Phase 5 Requirements

| Question | Answer |
|----------|--------|
| User journey / discovery | Primary via `/maister:quick-*` slash commands |
| AJ source access | Yes — `/Users/mrapacz/Projects/architekt-jutra-code` accessible for direct port |
| Validation scope | `make build && make validate` must pass |

## Similar Features / Reuse Patterns

| Maister artifact | Reuse for |
|------------------|-----------|
| `plugins/maister/skills/grill-me/SKILL.md` | Minimal on-demand skill frontmatter |
| `plugins/maister/skills/thermo-nuclear-review/SKILL.md` | `disable-model-invocation` critic pattern |
| `plugins/maister/skills/quick-bugfix/SKILL.md` | Full workflow skill structure |
| `plugins/maister/commands/reviews-code.md` | Thin ACTION REQUIRED + delegate pattern |
| `plugins/maister/commands/work.md` | Skill tool invocation pattern |

## AJ Source Files (read-only reference)

| Skill | Path | Lines |
|-------|------|-------|
| requirements-critic | `/Users/mrapacz/Projects/architekt-jutra-code/week8/2/requirements-critic/SKILL.md` | ~261 |
| transcript-critic | `/Users/mrapacz/Projects/architekt-jutra-code/week8/1/transcript-critic/SKILL.md` | ~213 |
| problem-classifier | `/Users/mrapacz/Projects/architekt-jutra-code/week8/3/problem-classifier/SKILL.md` | ~487 |

## Visual Assets

None — non-UI task.

## Functional Requirements

### FR-1: Port requirements-critic skill
- Create `plugins/maister/skills/requirements-critic/SKILL.md` adapted from AJ source
- Add `disable-model-invocation: true`
- Plain kebab `name: requirements-critic` (no `maister:` prefix in skill frontmatter)
- Preserve bilingual PL/EN body and interactive `AskUserQuestion` gates
- Preserve explicit invocation guard ("criticize", "critique", "review this ticket")
- Add "Recommended next steps" chain section per ADR-001

### FR-2: Port transcript-critic skill
- Create `plugins/maister/skills/transcript-critic/SKILL.md` adapted from AJ source
- **Fix AJ frontmatter bug** (description currently copies requirements-critic)
- Add `disable-model-invocation: true`
- Non-interactive: 7 analysis checks → structured report
- Add chain section linking to requirements-critic (Bundle A)

### FR-3: Port problem-classifier skill
- Create `plugins/maister/skills/problem-classifier/SKILL.md` adapted from AJ source
- **No** `disable-model-invocation` (interactive classifier, like grill-me)
- Stub `aggregate-designer` chain reference (Wave 3 — not yet ported)
- Preserve 4 problem classes (CRUD, T&P, Integration, RC) and discriminating probes

### FR-4: Create quick-* command wrappers
- `plugins/maister/commands/quick-requirements-critic.md` → `maister:quick-requirements-critic`
- `plugins/maister/commands/quick-transcript-critic.md` → `maister:quick-transcript-critic`
- `plugins/maister/commands/quick-problem-classifier.md` → `maister:quick-problem-classifier`
- Thin wrappers: ACTION REQUIRED + Skill tool delegation (no duplicated rubric)

### FR-5: CLAUDE.md documentation backfill
- Add missing entries: `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`
- Add Wave 1 skills to Available Skills table
- Add Wave 1 commands to Quick Commands (or new "Requirements & Modeling" subsection)
- Document Bundle A flow: transcript-critic → requirements-critic
- Distinguish `problem-classifier` skill from `task-classifier` agent

### FR-6: Build pipeline integration
- Update `platforms/kiro-cli/build.sh`: `skills_needing_args` (6 entries), `merge_one` (3 entries)
- Fix Makefile Rule 14 baseline: 51→57 total dirs; Rule 28: 26→32 `maister-*`
- Update `build-core.test.sh` and `validation.test.sh` with explicit post-Wave-1 counts
- Run `make build && make validate` — must pass (includes pre-existing Rule 14 fix)

### FR-7: Platform transforms (automatic via build)
- Keep `AskUserQuestion` in source (Copilot→`ask_user`, Cursor→`AskQuestion`, Kiro→CHAT GATE)
- Never edit generated `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/` directly

## Reusability Opportunities

- Existing build transforms handle AskUserQuestion platform differences
- Kiro `merge_commands_to_skills` pattern for quick-* commands
- grill-me/thermos Kiro shortcut pattern (optional — not in validation scope per user)

## Scope Boundaries

### In scope
- Wave 1 only (3 skills + 3 commands + docs + build)
- CLAUDE.md backfill for undocumented utilities
- Bundle A documentation

### Out of scope
- Waves 2–4 (test-strategy-reviewer, metaprogram-classifier, DDD pack, archetype-scanner)
- Orchestrator modifications (development, product-design)
- `language.md` standard (E2)
- `research --gather-only` (E6)
- `aggregate-designer` implementation (stub reference only)
- Kiro @shortcut skills (user did not select)

## Technical Considerations

- Edit source only in `plugins/maister/`
- SKILL.md is single source of truth; commands are thin wrappers
- Kebab-case naming throughout
- Skills under ~1000 lines each (AJ sources already compliant)
- No new subagents required for Wave 1

## Architecture Decision (from research)

**Hybrid 1D packaging** (ADR-001): Individual standalone skills with "Recommended next steps" chain sections. Category-aligned `quick-*` commands (ADR-002). Strict Wave 1 delivery (ADR-003). Standalone invocation only — no orchestrator hooks (ADR-008).
