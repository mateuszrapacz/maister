# Codebase Analysis Report

**Date**: 2026-06-13  
**Task**: Port Wave 1 Architekt Jutra skills to Maister plugin (Epic E1)  
**Description**: Port `requirements-critic`, `transcript-critic`, and `problem-classifier` from Architekt Jutra with category-aligned `quick-*` commands, `disable-model-invocation` on critics, and CLAUDE.md backfill for `grill-me`/`thermos`.  
**Analyzer**: codebase-analyzer skill (3 Explore agents: File Discovery, Code Analysis, Pattern Mining)

---

## Summary

Wave 1 adoption adds three on-demand utility skills to fill Maister capability gaps in requirements critique, meeting decision-process audit, and DDD problem classification. The Maister plugin already has established patterns for interactive skills (`grill-me`, `quick-bugfix`), read-only critics with `disable-model-invocation` (`thermo-nuclear-*`, `thermos`), and thin delegate commands (`reviews-*`). The port is primarily a source adaptation exercise: copy AJ rubrics into `plugins/maister/skills/`, wrap with `quick-*` commands, fix known AJ defects (transcript-critic frontmatter), and update build/integration surfaces (CLAUDE.md, Kiro `build.sh`, Makefile skill counts 26→32). No new subagents are required; `task-classifier` serves a different purpose (workflow routing vs. domain modeling classification).

---

## Files Identified

### Primary Files (to create)

**`plugins/maister/skills/requirements-critic/SKILL.md`** (~261 lines, adapted from AJ)
- Interactive requirements quality critique with 4 checks and invocation guard
- Source: `/Users/mrapacz/Projects/architekt-jutra-code/week8/2/requirements-critic/SKILL.md`
- Adapt: strip `maister:` prefix from AJ frontmatter; add `disable-model-invocation: true`; preserve bilingual PL/EN body

**`plugins/maister/skills/transcript-critic/SKILL.md`** (~213 lines, adapted from AJ)
- Non-interactive meeting transcript decision-process audit (7 checks, no `AskUserQuestion`)
- Source: `/Users/mrapacz/Projects/architekt-jutra-code/week8/1/transcript-critic/SKILL.md`
- Adapt: **fix frontmatter** (currently copies requirements-critic description); add `disable-model-invocation: true`

**`plugins/maister/skills/problem-classifier/SKILL.md`** (~487 lines, adapted from AJ)
- DDD modeling problem class classifier (CRUD, Transformation & Presentation, Integration, Resource Contention)
- Source: `/Users/mrapacz/Projects/architekt-jutra-code/week8/3/problem-classifier/SKILL.md`
- Adapt: stub `aggregate-designer` chain reference (Wave 3); fix cross-ref typo; add `disable-model-invocation: true`

**`plugins/maister/commands/quick-requirements-critic.md`** (~50–80 lines)
- Thin wrapper: `ACTION REQUIRED` + Skill tool invocation pattern from `reviews-code.md`
- Usage: `/maister:quick-requirements-critic [requirements text]`

**`plugins/maister/commands/quick-transcript-critic.md`** (~50–80 lines)
- Thin wrapper for transcript critique on explicit request
- Usage: `/maister:quick-transcript-critic [transcript or notes]`

**`plugins/maister/commands/quick-problem-classifier.md`** (~50–80 lines)
- Thin wrapper for domain modeling classification
- Usage: `/maister:quick-problem-classifier [business requirements]`

### Primary Files (to modify)

**`plugins/maister/CLAUDE.md`**
- Backfill undocumented skills: `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`
- Add Wave 1 skills and commands to Available Skills / Quick Commands tables
- Currently: no matches for `grill-me` or `thermo*` in CLAUDE.md (confirmed gap)

**`platforms/kiro-cli/build.sh`**
- Add new skills to `skills_needing_args` array (lines 179–200) for `$ARGUMENTS` injection
- Existing entries include `maister-grill-me`, `maister-thermo-nuclear-*`, `maister-thermos` — new critics need same treatment

**`Makefile`** (validate targets)
- Rule 14: skill directory count `26` → `32` (+6: 3 skills + 3 merged command-skills)
- Rule 28: `maister-*` skill directory count `26` → `32`
- Kiro tests may need parallel count updates

### Related Files (templates and patterns)

**`plugins/maister/skills/grill-me/SKILL.md`** (11 lines)
- Minimal frontmatter template: `name`, `description`, `argument-hint`, no orchestrator state
- Best pattern for interactive on-demand skills with `AskUserQuestion`

**`plugins/maister/skills/thermo-nuclear-review/SKILL.md`** (~51 lines)
- `disable-model-invocation: true` frontmatter pattern for read-only critique skills
- Full rubric lives in SKILL.md body

**`plugins/maister/skills/thermos/SKILL.md`** (22 lines)
- Orchestrator pattern delegating to subagents with `disable-model-invocation: true`
- Documents parallel subagent launch — not applicable to Wave 1 (no subagents)

**`plugins/maister/skills/quick-bugfix/SKILL.md`** (~231 lines)
- Self-contained skill with `maister:` prefix, full workflow in SKILL.md
- Kiro uses platform override at `platforms/kiro-cli/overrides/skills/quick-bugfix/SKILL.md`

**`plugins/maister/commands/quick-plan.md`** (~131 lines)
- Self-contained command pattern (logic in command file, no Skill delegation)
- Not recommended for Wave 1 — hybrid approach preferred

**`plugins/maister/commands/reviews-code.md`** (~86 lines)
- Thin delegate pattern: `ACTION REQUIRED` + Task tool to subagent
- Wave 1 commands should delegate to **Skill tool** (skills, not agents)

**`plugins/maister/agents/task-classifier.md`** (~433 lines)
- Classifies tasks into 5 **workflow types** (development, performance, migration, research, product-design)
- **Distinct from** `problem-classifier` (4 DDD **modeling problem classes**)
- No naming collision in implementation, but documentation must clarify the distinction

### AJ Source (read-only reference)

| Path | Lines | Notes |
|------|-------|-------|
| `architekt-jutra-code/week8/1/transcript-critic/SKILL.md` | 213 | Wrong frontmatter description |
| `architekt-jutra-code/week8/2/requirements-critic/SKILL.md` | 261 | Has `maister:` prefix in AJ |
| `architekt-jutra-code/week8/3/problem-classifier/SKILL.md` | 487 | References `aggregate-designer` (Wave 3) |

### Generated Outputs (never edit directly)

- `plugins/maister-copilot/` — Copilot CLI variant
- `plugins/maister-cursor/` — Cursor Agent variant  
- `plugins/maister-kiro/` — Kiro CLI variant (26 skills today → 32 after build)

---

## Current Functionality

### Maister Plugin Inventory

| Artifact | Count | Location |
|----------|-------|----------|
| Skills | 18 | `plugins/maister/skills/` |
| Commands | 8 | `plugins/maister/commands/` |
| Agents | 26 | `plugins/maister/agents/` |

Existing command categories:
- **Workflow**: `work.md` (routes via task-classifier)
- **Review & audit**: `reviews-*` (5 commands, delegate to agents)
- **Quick**: `quick-plan`, `quick-dev` (self-contained); `quick-bugfix` (skill-only, no command file in source)

### Capability Gaps (from research)

| Gap | Wave 1 Skill |
|-----|----------------|
| Requirements quality critique | `requirements-critic` |
| Meeting decision-process audit | `transcript-critic` |
| DDD problem classification | `problem-classifier` |

### Recommended Architecture: Hybrid Pattern

```
User → /maister:quick-*-critic (thin command)
         ↓ Skill tool
       skills/*-critic/SKILL.md (full rubric, disable-model-invocation)
```

- **Full rubric in SKILL.md** — single source of truth per plugin standards
- **Thin `quick-*` commands** — user-facing entry with `ACTION REQUIRED` + Skill tool invocation
- **`disable-model-invocation: true`** — on all three critics/classifiers (prevents automatic skill triggering; explicit invocation only)
- **Not agent-based** — unlike `reviews-code` → `code-reviewer` agent; these are self-contained skills

### Key Components

- **`requirements-critic`**: 4-check interactive critique (problem vs solution, CRUD vs observable behavior, signal map, quantifier probing); heavy `AskUserQuestion` in checks 2–3; invocation guard for explicit-only use
- **`transcript-critic`**: 7-check non-interactive audit (false consensus, opinion-as-fact, marginalized voices, hidden dependencies, scope drift, severity mismatch, power dynamics); outputs structured report with quotes
- **`problem-classifier`**: Signal scan → hypothesis → up to 4 discriminating questions → class assignment → implementation suggestions; optional chain to `aggregate-designer` (stub in Wave 1)

### Data Flow

```
Explicit user request
  → quick-* command (parse args / AskUserQuestion if missing)
  → Skill tool invokes critic/classifier skill
  → Skill reads input (argument, conversation context, or prompt)
  → Rubric execution (checks / signal scan / questions)
  → Structured report output (no task directory, no orchestrator state)
  → [problem-classifier only] optional stub note for aggregate-designer (Wave 3)
```

### AJ → Maister Adaptations

| Adaptation | Rationale |
|------------|-----------|
| Strip `maister:` prefix from AJ skill names | Maister source uses plain kebab names; platform build adds prefixes |
| Fix transcript-critic frontmatter | AJ copies requirements-critic description; body implements different workflow |
| Preserve bilingual PL/EN bodies | Domain terminology and trigger phrases are bilingual in AJ |
| Stub `aggregate-designer` chain | Skill not yet ported (Wave 3); replace invoke with "coming in Wave 3" note |
| `AskUserQuestion` in source | Kiro build transforms to CHAT GATE via `platforms/kiro-cli/build.sh` |
| Cross-ref kebab dir names | Use `problem-classifier`, not `maister:problem-classifier` |

---

## Dependencies

### Imports (What Wave 1 Depends On)

- **Plugin standards**: `.maister/docs/standards/global/plugin-development.md` — kebab-case dirs, thin commands, SKILL.md as source of truth
- **Build pipeline**: `.maister/docs/standards/global/build-pipeline.md` — platform transforms, `make build && make validate`
- **Template skills**: `grill-me`, `thermo-nuclear-review`, `quick-bugfix` — frontmatter and structure patterns
- **Template commands**: `reviews-code.md` — thin delegate with ACTION REQUIRED
- **AJ source**: `architekt-jutra-code/week8/{1,2,3}/` — rubric content
- **Research context**: `.maister/tasks/development/2026-06-13-aj-skills-wave1-adoption/analysis/research-context/research-report.md`

### Consumers (What Depends On Wave 1)

- **`plugins/maister/CLAUDE.md`**: Must document new skills/commands and backfill grill-me/thermos
- **`platforms/kiro-cli/build.sh`**: `skills_needing_args`, `merge_commands_to_skills`
- **`Makefile`**: validate rules 14, 28 (skill counts)
- **`platforms/kiro-cli/tests/`**: validation.test.sh, build-completion.test.sh (count assertions)
- **Future Wave 3**: `aggregate-designer` will consume problem-classifier output chain

**Consumer Count**: 5 integration surfaces  
**Impact Scope**: Medium — localized to plugin source and build pipeline; no runtime application code affected

---

## Test Coverage

### Test Files

- **`Makefile` `validate` target**: Structural checks for all three platform variants (Copilot, Cursor, Kiro)
- **`platforms/kiro-cli/tests/validation.test.sh`**: Kiro-specific rule enforcement
- **`platforms/kiro-cli/tests/build-completion.test.sh`**: Post-build artifact verification
- **`platforms/kiro-cli/tests/build-core.test.sh`**: Core build script behavior

### Coverage Assessment

- **Existing tests**: Strong for build pipeline integrity (skill counts, frontmatter rules, CHAT GATE transforms, no CLAUDE.md in skills)
- **Gaps**: No unit tests for skill rubric logic (expected — skills are markdown workflows); manual smoke test via `/maister:quick-*` commands post-build
- **Test updates required**: Makefile rules 14 and 28 counts (26→32); any hardcoded skill lists in Kiro tests

### Verification Strategy

1. `make build && make validate` — must pass with updated counts
2. Manual invocation of each `/maister:quick-*` command in Claude Code
3. Confirm `disable-model-invocation: true` prevents auto-triggering
4. Kiro smoke: verify `$ARGUMENTS` injection and CHAT GATE transforms for interactive skills

---

## Coding Patterns

### Naming Conventions

- **Skill directories**: kebab-case under `plugins/maister/skills/` (e.g., `requirements-critic/`)
- **Skill frontmatter `name`**: plain kebab for user-invocable (build adds `maister:` prefix per platform)
- **Commands**: category-prefixed flat files in `plugins/maister/commands/` (e.g., `quick-requirements-critic.md`)
- **Command frontmatter `name`**: `maister:quick-requirements-critic`

### Architecture Patterns

- **Two command patterns in Maister**:
  1. Self-contained (`quick-plan`, `quick-dev`) — logic in command file
  2. Thin delegate (`reviews-*`) — ACTION REQUIRED + Task/Skill tool
- **Wave 1 recommendation**: Hybrid — full rubric in SKILL.md + thin `quick-*` command with Skill tool delegation
- **Critics pattern**: `disable-model-invocation: true` (from thermo-nuclear-*), explicit invocation only
- **Interactive pattern**: `AskUserQuestion` in skill body (from grill-me/requirements-critic); Kiro transforms at build time

### Anti-Patterns to Avoid

| Anti-pattern | Correct approach |
|--------------|------------------|
| Edit `plugins/maister-cursor/` etc. directly | Edit source in `plugins/maister/`, run `make build` |
| Leave grill-me/thermos undocumented | Backfill CLAUDE.md in same epic |
| Copy transcript-critic AJ frontmatter verbatim | Write correct description for meeting audit workflow |
| Create subagents for critics | Skills are self-contained; no Task tool to agents |
| Confuse task-classifier with problem-classifier | Document distinct purposes in CLAUDE.md |

---

## Complexity Assessment

| Factor | Value | Level |
|--------|-------|-------|
| New files | 6 (3 skills + 3 commands) | Medium |
| Modified integration files | 3 (CLAUDE.md, build.sh, Makefile) | Low |
| Source content to port | ~961 lines (3 SKILL.md files) | Medium |
| Dependencies | AskUserQuestion, build transforms | Low |
| Consumers / integration surfaces | 5 | Medium |
| Test coverage | Build validation strong; no rubric tests | Partial |

### Overall: Moderate

The work is well-scoped content porting with clear templates and research-backed decisions. Complexity comes from volume (~960 lines of rubric content) and build pipeline touch points (Kiro skill counts, `$ARGUMENTS` injection), not from architectural uncertainty.

---

## Key Findings

### Strengths

- Research report provides detailed per-skill integration notes and Wave 1 scope is frozen (3 skills, no MCP/subagents)
- Maister has proven templates for every required pattern (grill-me, thermo-nuclear-*, quick-bugfix, reviews-*)
- AJ skills are self-contained with minimal dependencies; only optional Wave 3 chain to stub
- Plugin development standards explicitly document source-only edits and rebuild workflow

### Concerns

- AJ `transcript-critic` has incorrect frontmatter (copied from requirements-critic) — must fix during port, not copy blindly
- Kiro Makefile validates exactly 26 skill directories — will fail until counts updated to 32
- `task-classifier` vs `problem-classifier` naming similarity may confuse users without clear CLAUDE.md distinction
- `grill-me` and `thermos` exist but are undocumented in CLAUDE.md — backfill is part of epic scope

### Opportunities

- Requirements pack flow: meeting → `transcript-critic` → questions → `requirements-critic` on user stories
- Foundation for Wave 2–3 DDD bundle (`problem-classifier` → `aggregate-designer` chain)
- Category-aligned `quick-*` commands extend the quick command family consistently with `quick-bugfix`

---

## Impact Assessment

- **Primary changes**: 6 new files in `plugins/maister/skills/` and `plugins/maister/commands/`
- **Related changes**: CLAUDE.md (skills + commands tables + grill-me/thermos backfill), `platforms/kiro-cli/build.sh` (`skills_needing_args`), Makefile (validate counts 26→32)
- **Test updates**: Kiro validation tests with hardcoded skill counts; run full `make validate` after build

### Risk Level: Low-Medium

**Low risk factors**: Clear templates, no new subagents, no application runtime changes, research-validated scope, self-contained AJ content.

**Medium risk factors**: Kiro build count assertions must be updated atomically with new skills; bilingual content and CHAT GATE transforms need smoke verification; frontmatter fix for transcript-critic is easy to miss if porting is rushed.

---

## Recommendations

### Implementation Strategy

1. **Port skills first** — create three SKILL.md files from AJ source with adaptations (frontmatter fix, prefix strip, `disable-model-invocation`, aggregate-designer stub)
2. **Add thin commands** — three `quick-*` command files following `reviews-code.md` pattern but delegating via Skill tool
3. **Update CLAUDE.md** — backfill grill-me/thermos/thermo-nuclear-* entries; add Wave 1 skills and Quick Commands table rows; clarify task-classifier vs problem-classifier
4. **Update build pipeline** — add 3 new skills to Kiro `skills_needing_args`; update Makefile counts 26→32
5. **Build and validate** — `make build && make validate`; fix any Kiro test failures

### Per-Skill Checklist

| Skill | Frontmatter | disable-model-invocation | Command | Special |
|-------|-------------|--------------------------|---------|---------|
| requirements-critic | Strip `maister:` prefix | Yes | quick-requirements-critic | Preserve invocation guard + bilingual |
| transcript-critic | **Rewrite description** | Yes | quick-transcript-critic | EN-native, non-interactive |
| problem-classifier | EN description parity | Yes | quick-problem-classifier | Stub aggregate-designer chain |

### Backward Compatibility

- No breaking changes to existing skills or commands
- Additive only: 3 skills + 3 commands + documentation
- Generated platform variants rebuilt from source — no manual migration

### Testing Requirements

- `make build && make validate` (mandatory gate)
- Manual smoke: each `/maister:quick-*` command with sample input
- Verify critics do not auto-invoke (disable-model-invocation behavior)
- Kiro: confirm new skills appear in skill list and `$ARGUMENTS` works

---

## Next Steps

1. **Gap analysis** — invoke gap-analyzer with this report to compare current vs desired state for Epic E1
2. **Specification** — create `implementation/spec.md` with acceptance criteria per skill
3. **Implementation plan** — batch as single epic or 3 parallel task groups (skills independent, integration sequential)
4. **Execute** — port skills → commands → CLAUDE.md → build pipeline → validate
