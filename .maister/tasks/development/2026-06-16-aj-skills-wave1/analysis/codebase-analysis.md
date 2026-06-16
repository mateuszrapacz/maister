# Codebase Analysis Report

**Date**: 2026-06-16  
**Task**: Implement Epic E1 (Wave 1): Port requirements-critic, transcript-critic, and problem-classifier skills from Architekt Jutra into Maister plugin with quick-* commands  
**Description**: Port three AJ critique/classification skills into `plugins/maister/` following research decisions from architekt-jutra skills analysis (ADR-001, ADR-002, ADR-003, ADR-008).  
**Analyzer**: codebase-analyzer skill (3 Explore agents: File Discovery, Code Analysis, Pattern Mining)

---

## Executive Summary

Epic E1 is **largely already implemented** in the Maister source plugin (`plugins/maister/`). All three Wave 1 skills, three `quick-*` command wrappers, Bundle A chain documentation, CLAUDE.md/README registration, and platform build transforms (including Kiro Wave 1 `sed` block) are present. Maister versions extend AJ originals with `disable-model-invocation: true`, invocation guards, language preference gates, and cross-skill chain sections per ADR-001.

The development task should **shift from greenfield porting to verification and gap closure**: run `make build && make validate`, smoke-test commands on target platforms, diff AJ vs Maister rubric fidelity, and reconcile ADR-008 scope (soft orchestrator suggestions are already present in `development` and `product-design` despite research stating they were deferred to Wave 2+).

---

## Key Files

| Category | Path | Lines | Role |
|----------|------|-------|------|
| **Skill (source)** | `plugins/maister/skills/requirements-critic/SKILL.md` | 292 | Interactive 4-check requirements critique; Bundle A chain; language gate |
| **Skill (source)** | `plugins/maister/skills/transcript-critic/SKILL.md` | 225 | Non-interactive meeting decision-process audit; Bundle A entry point |
| **Skill (source)** | `plugins/maister/skills/problem-classifier/SKILL.md` | 509 | 4-class DDD modeling classifier; clarifying questions; archetype distinction |
| **Command** | `plugins/maister/commands/quick-requirements-critic.md` | 11 | Thin Skill-tool wrapper → `requirements-critic` |
| **Command** | `plugins/maister/commands/quick-transcript-critic.md` | 11 | Thin Skill-tool wrapper → `transcript-critic` |
| **Command** | `plugins/maister/commands/quick-problem-classifier.md` | 11 | Thin Skill-tool wrapper → `problem-classifier` |
| **Docs** | `plugins/maister/CLAUDE.md` | — | Skills table, Bundle A flow, command index, `task-classifier` vs `problem-classifier` distinction |
| **Docs** | `README.md` | — | User-facing quick commands + Bundle A chain description |
| **Orchestrator** | `plugins/maister/skills/development/SKILL.md` | — | ADR-008 soft suggestion for `quick-requirements-critic` after requirements draft |
| **Orchestrator** | `plugins/maister/skills/product-design/SKILL.md` | — | ADR-008 soft suggestion for `quick-transcript-critic` when transcripts in context |
| **Build** | `Makefile` | — | `build` / `validate` orchestration across Copilot, Cursor, Kiro, Kilo |
| **Build** | `platforms/kiro-cli/build.sh` | — | Wave 1 `merge_one` + `sed` renames for `maister-*` skill references |
| **Build test** | `platforms/kiro-cli/tests/build-core.test.sh` | — | Asserts merged quick-* skill dirs exist |
| **Template (NOT E1)** | `plugins/maister/skills/grill-me/SKILL.md` | 12 | Auto-invokable contrast; no command; no `disable-model-invocation` |
| **Template (NOT E1)** | `plugins/maister/skills/thermos/SKILL.md` | 22 | Explicit-only + `disable-model-invocation`; no command |
| **Template (Wave 2 ref)** | `plugins/maister/skills/test-strategy-reviewer/SKILL.md` | 223 | Same on-demand pattern; references `problem-classifier` in Bundle C chain |
| **Generated** | `plugins/maister-cursor/skills/*/` + `commands/quick-*.md` | — | Cursor transform: `maister-` prefix, `AskQuestion` vs `AskUserQuestion` |
| **Generated** | `plugins/maister-copilot/skills/*/` + `commands/` | — | Copilot plain-name transform |
| **Generated** | `plugins/maister-kilo/.kilo/skills/*/` | — | Kilo variant |
| **AJ reference** | `/Users/mrapacz/Projects/architekt-jutra-code/week8/{1,2,3}/*/SKILL.md` | 213 / 261 / 487 | Source rubrics for fidelity diff |
| **Research** | `.maister/tasks/development/2026-06-16-aj-skills-wave1/analysis/research-context/decision-log.md` | — | ADR-001 through ADR-008 decisions |
| **Standards** | `.maister/docs/standards/global/plugin-development.md` | — | Source-only edits, thin commands, kebab naming |
| **Standards** | `.maister/docs/standards/global/build-pipeline.md` | — | Platform transforms, flat commands layout |

**AJ vs Maister line counts** (verified):

| Skill | AJ (week8) | Maister | Delta |
|-------|------------|---------|-------|
| transcript-critic | 213 | 225 | +12 (language gate, invocation guard, Bundle A) |
| requirements-critic | 261 | 292 | +31 (language gate, invocation guard, Bundle A) |
| problem-classifier | 487 | 509 | +22 (invocation guard, archetype distinction, Bundle A) |

---

## Architecture Patterns

### Two skill categories

| Category | Naming | Invocation | Examples |
|----------|--------|------------|----------|
| **User-invocable orchestrators** | `maister:*` in commands; skill dirs may use kebab | Workflow commands, state files | `development`, `research`, `product-design` |
| **On-demand engine skills** | Plain kebab dir + frontmatter `name` | Explicit request only; `disable-model-invocation: true` on critique/classification | Wave 1 trio, `thermos`, `test-strategy-reviewer` |

### On-demand port pattern (canonical for E1)

```
quick-* command (thin wrapper)
    └── Skill tool → engine SKILL.md (orchestration + rubric)
            └── Optional chain section → next skill in Bundle A
```

**Convention checklist** (from Pattern Mining, verified in source):

1. Kebab-case skill directories matching frontmatter `name` (no `maister:` prefix on engine skills)
2. `disable-model-invocation: true` on critique/classification skills
3. Invocation guard block with trigger phrases and explicit "do NOT invoke when drafting" rules
4. Language preference gate (`AskUserQuestion` in source; `AskQuestion` in Cursor build)
5. Thin command wrappers in flat `plugins/maister/commands/` with `**ACTION REQUIRED**` Skill-tool delegation
6. CLAUDE.md + README registration; Bundle A documented at plugin level
7. "Recommended next steps" chain sections in each SKILL.md (ADR-001 hybrid)
8. Edit source only in `plugins/maister/`; run `make build` for generated variants

### Anti-patterns to avoid

| Anti-pattern | Why it matters |
|--------------|----------------|
| Fat `reviews-*` commands with embedded rubric | Violates thin-wrapper principle; rubric belongs in SKILL.md |
| `maister:` prefix on engine skill frontmatter | Breaks Skill-tool references and Kiro naming rules |
| Auto-invoking critique from orchestrators | ADR-008; disrupts requirements drafting flow |
| Editing `plugins/maister-cursor/`, `maister-copilot/`, etc. | Overwritten by `make build` |

### Best templates for future waves

| Purpose | Template |
|---------|----------|
| **Primary E1 pattern** | `requirements-critic/SKILL.md` + `quick-requirements-critic.md` |
| **Command-only reference** | `quick-transcript-critic.md` (minimal 11-line wrapper) |
| **Wave 2 extension** | `test-strategy-reviewer/SKILL.md` (same on-demand pattern + cross-bundle chain) |
| **Contrast: auto-invokable** | `grill-me/SKILL.md` (description-triggered, no command) |
| **Contrast: explicit-only, no command** | `thermos/SKILL.md` |

---

## Integration Points

### Bundle A — Requirements quality flow

Documented in `plugins/maister/CLAUDE.md` and cross-linked in each Wave 1 SKILL.md:

1. `transcript-critic` → decision-process audit + diagnostic questions  
2. Follow-up clarification → refined user stories/tickets  
3. `requirements-critic` → interactive 4-check quality critique  
4. `problem-classifier` → when concurrency/resource-contention signals appear  

Chain is **skill-to-skill via Recommended next steps**, not a meta-orchestrator (ADR-001).

### Orchestrator soft suggestions (ADR-008)

| Orchestrator | Phase context | Suggestion |
|--------------|---------------|------------|
| `development` | After requirements drafted | May suggest `/maister:quick-requirements-critic`; no auto-invocation |
| `product-design` | When transcripts in `context/` | May suggest `/maister:quick-transcript-critic`; no auto-invocation |

**Scope note**: ADR-008 decision log states 8B (soft suggestions) was planned **after Wave 1**, but both orchestrators already contain these bullets. Treat as implemented ahead of schedule; confirm intentional during verification.

### Cross-skill references (downstream consumers)

| Consumer | Reference |
|----------|-----------|
| `test-strategy-reviewer` | Points to `problem-classifier` when domain modeling class unclear (Bundle C) |
| `metaprogram-classifier` | Suggests `requirements-critic` separately for requirements-quality issues |
| `README.md` | Bundle A user-facing chain with command examples |

### Platform build pipeline

| Platform | Transform | Wave 1 specifics |
|----------|-----------|------------------|
| **Cursor** | `maister:` → `maister-`; commands lose colons | Skills copied; `AskUserQuestion` → `AskQuestion` |
| **Copilot** | Plain names | Commands + skills copied |
| **Kiro** | Skills merged via `merge_one`; extensive `sed` renames | Wave 1 block renames plain kebab → `maister-*` in chain sections and command bodies; skill count validation (63 dirs) |
| **Kilo** | `.kilo/skills/` layout | Skills copied |

Build entry: `make build` → `platforms/*/build.sh`. Validation: `make validate` with platform-specific rules in `Makefile`.

### Naming collision guard

`task-classifier` **agent** (5 workflow types) vs `problem-classifier` **skill** (4 DDD modeling classes) — explicitly documented in CLAUDE.md to prevent conflation.

---

## Current Implementation Status

### Already ported (source of truth: `plugins/maister/`)

| Epic E1 deliverable | Status | Evidence |
|---------------------|--------|----------|
| `requirements-critic` skill | ✅ Done | 292 lines; 4 checks; language gate; invocation guard; Bundle A |
| `transcript-critic` skill | ✅ Done | 225 lines; structured non-interactive report; Bundle A |
| `problem-classifier` skill | ✅ Done | 509 lines; 4 classes; archetype distinction; Bundle A |
| `quick-requirements-critic` command | ✅ Done | Thin Skill-tool wrapper |
| `quick-transcript-critic` command | ✅ Done | Thin Skill-tool wrapper |
| `quick-problem-classifier` command | ✅ Done | Thin Skill-tool wrapper |
| `disable-model-invocation` on critics | ✅ Done | All three skills + transcript-critic |
| Bundle A chain sections (ADR-001) | ✅ Done | Each SKILL.md + CLAUDE.md + README |
| Category-aligned commands (ADR-002) | ✅ Done | Three `quick-*` commands |
| CLAUDE.md registration | ✅ Done | Skills table, commands table, bundle docs |
| README user docs | ✅ Done | Commands + Bundle A |
| Kiro Wave 1 build transforms | ✅ Done | `build.sh` sed block + `build-core.test.sh` |
| Generated platform variants | ✅ Present | maister-cursor, maister-copilot, maister-kilo dirs contain all three skills |

### Gaps and verification items

| Item | Status | Notes |
|------|--------|-------|
| `make build && make validate` | ⚠️ Not confirmed this session | Required acceptance gate per research; Kiro rule 14 expects exactly 63 skill dirs |
| E2E smoke tests (commands invoke skills) | ⚠️ Not confirmed | No automated E2E for Wave 1 commands found; manual `/maister:quick-*` smoke recommended |
| AJ vs Maister rubric fidelity diff | ⚠️ Not done | Line counts match expectations (+12–31 lines Maister enhancements); semantic diff not performed |
| ADR-008 scope reconciliation | ⚠️ Review needed | Soft suggestions already in orchestrators despite Wave 1 "standalone only" decision |
| `grill-me` / `thermos` CLAUDE.md backfill | ⚠️ Unclear | Mentioned in orchestrator-state research summary as E1 scope; verify CLAUDE.md completeness if still required |
| Implementation spec / plan | ❌ Missing | Task at phase-1; no `implementation/spec.md` yet — expected for verification phase |
| Task orchestrator `codebase_analysis` summary | ❌ Empty | `orchestrator-state.yml` phase_summaries.codebase_analysis not yet populated |

### Research alignment

| ADR | Decision | Implementation match |
|-----|----------|------------------------|
| ADR-001 | Individual skills + chain sections | ✅ Hybrid pattern in all three SKILL.md files |
| ADR-002 | Category-aligned `quick-*` commands | ✅ Three commands shipped |
| ADR-003 | Strict Wave 1 scope (3 skills) | ✅ Scope matches |
| ADR-008 | Standalone Wave 1; soft suggestions Wave 2+ | ⚠️ Partial — skills standalone ✅; orchestrator suggestions already present |

---

## Dependencies

### Imports (what Wave 1 depends on)

- Maister plugin structure (`plugins/maister/skills/`, `commands/`)
- Build pipeline (`Makefile`, `platforms/*/build.sh`)
- Research decisions (decision-log ADR-001/002/003/008)
- AJ source rubrics (`architekt-jutra-code/week8/`)

### Consumers (what depends on Wave 1)

- Bundle A user workflows (manual chain via commands)
- `development` / `product-design` orchestrators (soft suggestions)
- `test-strategy-reviewer` (problem-classifier cross-reference)
- Future Wave 2–4 skills (chain topology extends from Bundle A)

**Consumer count**: 4+ integration touchpoints  
**Impact scope**: Low for code changes (port exists); Medium for verification failures (multi-platform build)

---

## Test Coverage

### Automated tests

| Test | Location | Coverage |
|------|----------|----------|
| Kiro build core | `platforms/kiro-cli/tests/build-core.test.sh` | Asserts merged `maister-quick-*` skill dirs exist |
| Makefile validate | `Makefile` `validate-*` targets | Structural checks per platform (naming, hooks, skill counts) |

### Gaps

- No unit/integration tests for skill rubric content
- No Playwright or CLI smoke tests for `/maister:quick-*` command → skill delegation
- No regression test comparing AJ vs Maister output structure

**Coverage assessment**: Partial — build pipeline guarded; behavioral/rubric fidelity untested

---

## Complexity Assessment

| Factor | Value | Level |
|--------|-------|-------|
| Source files to touch | 3 skills + 3 commands (+ docs if gaps) | Low |
| Platform variants | 4 platforms (Copilot, Cursor, Kiro, Kilo) | Medium |
| Cross-cutting docs | CLAUDE.md, README, 2 orchestrators | Medium |
| Rubric fidelity | 3 skills, 500+ lines combined | Medium |
| Test coverage | Build tests only | Medium gap |

### Overall: **Moderate**

Implementation is largely complete, but multi-platform validation, rubric fidelity review, and ADR-008 scope confirmation add moderate verification effort. Not a greenfield port.

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Assuming port complete without `make validate` | Medium | Medium | Run full build + validate before marking E1 done |
| Kiro skill count drift (rule 14: 63 dirs) | Medium | Low | Rebuild and validate after any skill add/remove |
| AJ rubric regression during Maister enhancements | Low-Medium | Low | Semantic diff AJ vs Maister checklists |
| ADR-008 orchestrator suggestions cause user confusion | Low | Low | Suggestions are optional bullets with explicit no-auto-invoke |
| Editing generated plugin dirs | High impact | Low if standards followed | Enforce source-only edits per CLAUDE.md |
| `task-classifier` vs `problem-classifier` confusion | Low | Medium | Already documented; preserve in spec |

### Risk Level: **Low-Medium**

Primary risk is **false completion** — code exists but verification gates not run. Secondary risk is minor scope drift (ADR-008 suggestions ahead of schedule).

---

## Recommendations for Development Task

### 1. Reframe task scope: verification-first

Treat E1 as **confirm-and-close**, not net-new implementation. Acceptance criteria:

- [ ] `make build` succeeds for all platforms
- [ ] `make validate` passes (especially Kiro rule 14 skill count)
- [ ] Manual smoke: each `/maister:quick-*` command delegates to correct skill
- [ ] AJ vs Maister semantic diff documents intentional deltas (language gate, invocation guard, Bundle A, archetype table)

### 2. Skip re-porting; audit existing artifacts

Read each Maister SKILL.md against AJ week8 source. Confirm:

- All 4 requirements-critic checks preserved
- Transcript-critic severity categories and output structure intact
- Problem-classifier 4 classes + signal scan + clarifying questions preserved

Only patch if diff reveals missing rubric sections.

### 3. Resolve ADR-008 scope explicitly

Document in spec whether orchestrator soft suggestions are **intentional Wave 1 inclusion** or should be reverted to strict 8A. Current code includes 8B; research said defer — pick one and update decision log if intentional.

### 4. Follow established templates for any fixes

Use `requirements-critic` + `quick-requirements-critic` as the canonical pair. Do not embed rubric in commands.

### 5. Platform verification order

1. Source review (`plugins/maister/`)  
2. `make build`  
3. `make validate` (Cursor → Copilot → Kiro → Kilo)  
4. Spot-check generated `maister-cursor/commands/quick-*.md` for `maister-` prefix and skill references  
5. Kiro: confirm `build-core.test.sh` passes  

### 6. Defer Wave 2+ work

Do not port `test-strategy-reviewer`, archetype mappers, or meta-orchestrator in E1. Reference `test-strategy-reviewer` only as pattern template.

### 7. Update task artifacts

After verification:

- Populate `orchestrator-state.yml` → `phase_summaries.codebase_analysis`
- Proceed to gap analysis / spec with "verification + gap closure" framing
- If all gates pass with no rubric gaps, E1 may close with minimal or zero code diff

---

## Next Steps

1. **Gap analyzer**: Compare Epic E1 acceptance criteria against verified implementation status; flag ADR-008 scope question.  
2. **Specification**: If verification passes, write lightweight spec focused on validation evidence; if gaps found, spec the minimal patches.  
3. **Skip full implementation plan** if verification-only path confirmed — or produce minimal plan for any rubric patches only.

---

## Key Findings

### Strengths

- Complete source implementation following Maister on-demand skill conventions
- Research ADRs (001, 002, 003) fully reflected in code structure
- Multi-platform build pipeline already includes Wave 1 Kiro transforms and tests
- Clear Bundle A documentation at plugin and skill level
- Naming collision between `task-classifier` and `problem-classifier` proactively documented

### Concerns

- Task orchestrator still at phase-1 with empty codebase_analysis summary — may proceed as if greenfield
- No evidence `make validate` run in this task cycle
- ADR-008 timeline mismatch between decision log and current orchestrator content

### Opportunities

- Fast E1 closure if verification passes (low code churn, high confidence)
- Wave 1 validates port pipeline for Waves 2–4 (test-strategy-reviewer pattern already exists as Wave 2 preview)
- Semantic AJ diff can become reusable checklist for future AJ ports
