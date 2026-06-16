# Specification: AJ Skills Wave 1 Adoption (Epic E1)

## Goal

Port three Architekt Jutra (AJ) on-demand utility skills — `requirements-critic`, `transcript-critic`, and `problem-classifier` — into the Maister plugin source (`plugins/maister/`) using the hybrid packaging pattern (full rubrics in `SKILL.md`, thin `quick-*` command wrappers, in-skill chain sections). Integrate critics with `disable-model-invocation: true`, backfill undocumented utility skills in `CLAUDE.md`, and update the Kiro build pipeline so `make build && make validate` passes with skill directory count 26 → 32.

## User Stories

- As an **architect or product owner**, I want to run `/maister:quick-transcript-critic` on meeting notes so I can surface decision-process problems (false consensus, scope drift, marginalized voices) before acting on them.
- As a **requirements author**, I want to run `/maister:quick-requirements-critic` on tickets or user stories so I get interactive critique (problem vs solution, CRUD vs observable behavior, signal map, quantifier probing) only when I explicitly request it.
- As a **domain modeler**, I want to run `/maister:quick-problem-classifier` on business requirements so I can classify them into CRUD, Transformation & Presentation, Integration, or Resource Contention with discriminating questions and implementation guidance.
- As a **Maister plugin consumer**, I want `grill-me`, `thermos`, and thermo-nuclear review skills documented in `CLAUDE.md` so I can discover existing utilities alongside the new Wave 1 skills.
- As a **Maister maintainer**, I want Wave 1 changes confined to source plugin + build integration so all three platform variants regenerate correctly without editing `plugins/maister-cursor/`, `maister-copilot/`, or `maister-kiro/` directly.

## Core Requirements

### FR-1: Port `requirements-critic` skill

**Source:** `/Users/mrapacz/Projects/architekt-jutra-code/week8/2/requirements-critic/SKILL.md` (~261 lines)

**Target:** `plugins/maister/skills/requirements-critic/SKILL.md`

| Aspect | Requirement |
|--------|-------------|
| Frontmatter `name` | Plain kebab `requirements-critic` (strip AJ `maister:` prefix) — **precedent:** `grill-me`, `thermo-nuclear-review` (overrides stale `plugin-development.md` `maister:*` wording for on-demand utilities) |
| Frontmatter `description` | English-primary; preserve explicit-only invocation semantics |
| `argument-hint` | `[requirements text, ticket, or spec to critique]` |
| `disable-model-invocation` | `true` (ADR-008) |
| Body | Preserve bilingual PL/EN content, 4-check rubric, interactive `AskUserQuestion` in Checks 2–4 |
| Invocation guard | Retain explicit trigger phrases ("criticize", "critique", "review this ticket", etc.); do not auto-invoke during requirements writing |
| Chain section | Add **Recommended next steps** per ADR-001 (e.g., after transcript audit → refine questions → re-run requirements critique; RC signals → `problem-classifier`) |
| Cross-references | Use kebab skill dir names (`transcript-critic`, `problem-classifier`), not `maister:` prefixes or `CLAUDE.md` links |

**Acceptance criteria:**
- Skill directory exists with valid YAML frontmatter matching `grill-me` / `thermo-nuclear-review` patterns
- All four checks and interactive reformulation workflow present in body
- `disable-model-invocation: true` present
- No `maister:` in skill frontmatter `name`
- Recommended next steps section links to sibling Wave 1 skills by kebab name

---

### FR-2: Port `transcript-critic` skill

**Source:** `/Users/mrapacz/Projects/architekt-jutra-code/week8/1/transcript-critic/SKILL.md` (~213 lines)

**Target:** `plugins/maister/skills/transcript-critic/SKILL.md`

| Aspect | Requirement |
|--------|-------------|
| Frontmatter fix | **Rewrite `description`** — AJ source incorrectly copies requirements-critic text; description must reflect meeting decision-process audit |
| Frontmatter `name` | Plain kebab `transcript-critic` |
| `argument-hint` | `[meeting transcript or notes]` |
| `disable-model-invocation` | `true` (ADR-008) |
| Body | Non-interactive: 7 analysis checks → structured report with severity, evidence quotes, diagnostic questions |
| Chain section | Link to `requirements-critic` for Bundle A flow (transcript audit → refined user stories / requirements critique) |
| Language | EN-native body (preserve AJ content as-is) |

**Acceptance criteria:**
- Frontmatter description distinct from requirements-critic and accurately describes transcript audit workflow
- Seven checks (fact vs opinion vs hearsay, false consensus, marginalized voices, hidden dependencies, scope drift, severity mismatch, power dynamics) executable without `AskUserQuestion`
- Preserve AJ check section headings from source
- Structured output format section preserved
- `disable-model-invocation: true` present
- Recommended next steps references `requirements-critic`

---

### FR-3: Port `problem-classifier` skill

**Source:** `/Users/mrapacz/Projects/architekt-jutra-code/week8/3/problem-classifier/SKILL.md` (~487 lines)

**Target:** `plugins/maister/skills/problem-classifier/SKILL.md`

| Aspect | Requirement |
|--------|-------------|
| Frontmatter `name` | Plain kebab `problem-classifier` (strip AJ `maister:` prefix) |
| Frontmatter `description` | English-primary; clarify problem-class vs archetype distinction |
| `argument-hint` | `[business requirements or feature description]` |
| `disable-model-invocation` | **Omit** — interactive classifier follows `grill-me` pattern (scope gate decision: critics only) |
| Body | Preserve 4 problem classes (CRUD, T&P, Integration, RC), signal scan, hypothesis, up to 4 discriminating questions, class assignment, implementation suggestions |
| `aggregate-designer` chain | **Stub Wave 3 reference** — replace `invoke maister:aggregate-designer` with Recommended next steps noting aggregate-designer ships in Wave 3; RC next-step offer becomes informational, not an active Skill invocation |
| Cross-ref fix | Use `problem-classifier` kebab refs; fix any AJ typos (e.g., `problem-class-classifier`) |
| Bilingual content | Preserve AJ bilingual pedagogical content (ADR-007); defer language preference gate to post-Wave-1 |

**Acceptance criteria:**
- Full 4-class rubric, edge cases, and composite decomposition guidance present
- No `disable-model-invocation` in frontmatter
- No live invocation of non-existent `aggregate-designer` skill
- Recommended next steps section documents Wave 3 handoff for RC class
- Distinction from archetype mappers preserved in body

---

### FR-4: Create three `quick-*` command wrappers

**Targets:**
- `plugins/maister/commands/quick-requirements-critic.md` → `maister:quick-requirements-critic`
- `plugins/maister/commands/quick-transcript-critic.md` → `maister:quick-transcript-critic`
- `plugins/maister/commands/quick-problem-classifier.md` → `maister:quick-problem-classifier`

**Pattern:** Thin delegate following `plugins/maister/commands/reviews-code.md` structure, but delegate via **Skill tool** (not Task tool to agents).

Each command MUST:
- Declare `name: maister:quick-<skill-stem>` and English `description` in frontmatter
- Open with **ACTION REQUIRED** instructing immediate Skill tool invocation of the target skill
- Pass user arguments to the skill; use `AskUserQuestion` only when input missing (mirror reviews-code argument parsing)
- Contain **no duplicated rubric** — orchestration lives entirely in `SKILL.md`
- Stay under ~200 lines per plugin-development standard

**Normative command template** (all three commands follow this structure):

```markdown
---
name: maister:quick-requirements-critic
description: Critique requirements quality with interactive 4-check rubric
---

**ACTION REQUIRED**: This command delegates to a skill. Invoke the `requirements-critic` skill via the Skill tool NOW. Do not execute the critique yourself.

1. Parse user input from command arguments; if missing, use AskUserQuestion to prompt for requirements text.
2. Invoke Skill tool with skill `requirements-critic` and pass the input as args.

Use Skill tool:
  skill: "requirements-critic"
  args: "[user requirements text]"
```

Substitute skill name and description per command. Pattern derives from `reviews-code.md` (ACTION REQUIRED) + `work.md` (Skill tool delegation). **Deviation from plugin-development.md Task-tool default is intentional** — critics are self-contained skills, not agents (ADR-001/ADR-002).

**Usage strings (documentation):**
- `/maister:quick-requirements-critic [requirements text]`
- `/maister:quick-transcript-critic [transcript or notes]`
- `/maister:quick-problem-classifier [business requirements]`

**Acceptance criteria:**
- Three command files exist in flat `commands/` layout
- Each command delegates exclusively to matching skill via Skill tool
- No inline execution of critique/classification logic in command files

---

### FR-5: `CLAUDE.md` documentation backfill and Wave 1 index

**Target:** `plugins/maister/CLAUDE.md`

**Backfill (currently undocumented):**

| Skill | Documentation focus |
|-------|---------------------|
| `grill-me` | Interactive plan/design stress-test; on-demand utility |
| `thermos` | Parallel thermo-nuclear review orchestration; `disable-model-invocation` |
| `thermo-nuclear-review` | Branch security/correctness audit rubric |
| `thermo-nuclear-code-quality-review` | Maintainability / structure audit rubric |

**Wave 1 additions:**
- Add three new skills to **Available Skills** table (5–15 lines each per plugin doc principles)
- Add three new commands to **Quick Commands** table (or new **Requirements & Modeling** subsection under Quick Commands)
- **Bundle A flow** (3–5 lines): `transcript-critic` → questions for next meeting → `requirements-critic` on refined stories
- **Naming distinction:** Document `task-classifier` agent (5 workflow types: development, performance, migration, research, product-design) vs `problem-classifier` skill (4 DDD modeling problem classes)

**Acceptance criteria:**
- Grep for `grill-me`, `thermos`, `thermo-nuclear` returns matches in CLAUDE.md
- Wave 1 skills and commands listed with usage and purpose
- Bundle A flow documented at index level
- task-classifier vs problem-classifier distinction explicit

---

### FR-6: Build pipeline integration

**Prerequisite (pre-existing baseline):** As of 2026-06-13, `make validate-kiro` **already fails** Rule 14 on master (Makefile expects 26 total skill dirs; live Kiro tree has **51** = 26 `maister-*` + 25 shortcut dirs). Wave 1 FR-6 **must fix this baseline** as part of build integration — not only add Wave 1 deltas.

**Targets:**
- `platforms/kiro-cli/build.sh`
- `Makefile` (validate rules 14 and 28)
- `platforms/kiro-cli/tests/build-core.test.sh`
- `platforms/kiro-cli/tests/validation.test.sh`
- `platforms/kiro-cli/build.sh` inline comments (lines ~722–723 skill count narrative)

**Kiro `merge_commands_to_skills()` — add three `merge_one` entries:**

| Command stem | Merged skill directory |
|--------------|------------------------|
| `quick-requirements-critic` | `maister-quick-requirements-critic` |
| `quick-transcript-critic` | `maister-quick-transcript-critic` |
| `quick-problem-classifier` | `maister-quick-problem-classifier` |

**Kiro `skills_needing_args` — add all six entries** (for `$ARGUMENTS` injection after frontmatter):

Standalone skills (built from source, renamed to `maister-*`):
- `maister-requirements-critic`
- `maister-transcript-critic`
- `maister-problem-classifier`

Merged command-skills:
- `maister-quick-requirements-critic`
- `maister-quick-transcript-critic`
- `maister-quick-problem-classifier`

**Makefile count updates (verified 2026-06-13):**

| Rule | What it counts | Current (master) | Target (post-Wave 1) |
|------|----------------|------------------|----------------------|
| **Rule 14** | All skill directories under `plugins/maister-kiro/skills/` | **51** (validate fails — expects 26) | **57** (+3 source skills + 3 merged commands; shortcuts unchanged at 25) |
| **Rule 28** | `maister-*` skill directories only | **26** | **32** (+3 standalone + 3 merged) |

**Kiro test file updates (explicit targets):**

| File | Assertion | Current | Target |
|------|-----------|---------|--------|
| `build-core.test.sh` | Merged command count (test name/comments) | 8 | **11** |
| `build-core.test.sh` | Total skill directories | 22 | **57** |
| `build-core.test.sh` | `test_no_unprefixed_skill_dirs` | expects 0 unprefixed | **25** unprefixed shortcut dirs (e.g. `grill-me`, `dev`) — update test to match current Kiro shortcut architecture |
| `validation.test.sh` | Rules 14/28 total + `maister-*` | 22 / 22 | **57** / **32** |

**Note:** `e2e-matrix.test.sh` agent JSON count (26) unchanged — Wave 1 adds no agents.

**Inventory delta (source):**

| Metric | Before | After |
|--------|--------|-------|
| Source skills | 18 | 21 |
| Source commands | 8 | 11 |
| Kiro `maister-*` dirs | 26 | 32 |
| Kiro total skill dirs | 51 | 57 |

**Acceptance criteria:**
- `make build && make validate` passes on clean tree after all source edits (including Rule 14 baseline fix)
- Generated variants contain 3 new standalone + 3 merged quick-* dirs under `plugins/maister-kiro/skills/`
- Copilot and Cursor variants include equivalent skills/commands after build
- `$ARGUMENTS` injected for all six new Kiro skills (standalone + merged)
- Kiro test suite (`build-core.test.sh`, `validation.test.sh`) updated with explicit post-Wave-1 counts
- Re-run CHAT GATE audit after port; bump Makefile Rule 26 threshold if interactive skills push total below 200

---

### FR-7: Platform transforms and source-only discipline

| Rule | Requirement |
|------|-------------|
| Source edits | Only `plugins/maister/` and `platforms/kiro-cli/` (build integration) |
| Generated variants | Never edit `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/` directly |
| `AskUserQuestion` | Keep in source for requirements-critic and problem-classifier; build transforms handle Copilot (`ask_user`), Cursor (`AskQuestion`), Kiro (CHAT GATE) |
| Orchestrators | No changes to `development`, `product-design`, `research` (ADR-008 Wave 1 standalone) |
| Subagents | No new agents for Wave 1 |
| Skill size | Each SKILL.md under ~1000 lines (AJ sources already compliant) |

**Acceptance criteria:**
- No orchestrator SKILL.md modifications
- Interactive skills produce CHAT GATE markers in Kiro output after build
- No `CLAUDE.md` references inside skill bodies (validate rule 5)

---

## Reusable Components

### Existing Code to Leverage

| Artifact | Path | Reuse for Wave 1 |
|----------|------|------------------|
| Interactive on-demand frontmatter | `plugins/maister/skills/grill-me/SKILL.md` | `problem-classifier` frontmatter; `argument-hint`; no orchestrator state |
| Critic frontmatter pattern | `plugins/maister/skills/thermo-nuclear-review/SKILL.md` | `disable-model-invocation: true` on requirements-critic, transcript-critic |
| Parallel review orchestration (doc only) | `plugins/maister/skills/thermos/SKILL.md` | CLAUDE.md backfill description; not applicable to Wave 1 implementation |
| Full workflow skill structure | `plugins/maister/skills/quick-bugfix/SKILL.md` | Self-contained rubric depth reference |
| Thin command + Task delegate | `plugins/maister/commands/reviews-code.md` | ACTION REQUIRED pattern; **substitute Skill tool for Task tool** |
| Skill invocation from command | `plugins/maister/commands/work.md` | Skill tool invocation pattern for orchestrators |
| Kiro command merge | `platforms/kiro-cli/build.sh` `merge_one` + `skills_needing_args` | Extend existing arrays |
| Build validation | `Makefile` validate targets | Update hardcoded counts atomically with new skills |
| AJ rubric source | `architekt-jutra-code/week8/{1,2,3}/` | Read-only port reference |

### New Components Required

| Component | Justification |
|-----------|---------------|
| `skills/requirements-critic/SKILL.md` | Capability gap — no Maister requirements quality critique |
| `skills/transcript-critic/SKILL.md` | Capability gap — no meeting decision-process audit |
| `skills/problem-classifier/SKILL.md` | Capability gap — no DDD problem class classification |
| `commands/quick-requirements-critic.md` | User discovery via `/maister:quick-*` (ADR-002) |
| `commands/quick-transcript-critic.md` | Same |
| `commands/quick-problem-classifier.md` | Same |

No new subagents, references directories, or MCP dependencies required for Wave 1.

## Technical Approach

### Architecture: Hybrid Pattern (ADR-001)

```
User explicit request
  → /maister:quick-* (thin command, maister: prefix in command frontmatter)
       ↓ Skill tool
  → skills/*-critic|classifier/SKILL.md (full rubric, plain kebab name in source)
       ↓
  Structured report (no task directory, no orchestrator state)
       ↓ [optional]
  Recommended next steps → sibling skill by kebab name (or Wave 3 stub)
```

**Contrast with existing patterns:**

| Pattern | Example | Wave 1 choice |
|---------|---------|---------------|
| Command → Task → agent | `reviews-code` → `code-reviewer` | **Not used** — critics are self-contained skills |
| Self-contained command | `quick-plan`, `quick-dev` | **Not used** — rubric would duplicate SKILL.md |
| Skill-only, no command | `quick-bugfix`, `grill-me` | **Partial** — skills exist; Wave 1 adds commands for discoverability |
| Hybrid skill + thin command | *(new for AJ ports)* | **Chosen** — ADR-001 + ADR-002 |

### AJ → Maister Adaptations

| Adaptation | Rationale |
|------------|-----------|
| Strip `maister:` from skill `name:` | Source convention: plain kebab; platform build adds prefixes |
| Fix transcript-critic frontmatter | AJ defect — wrong description copied from requirements-critic |
| Stub `aggregate-designer` | Skill not ported until Wave 3 (E4) |
| Critics get `disable-model-invocation` | ADR-008 — prevent auto-invocation during requirements work |
| problem-classifier omits flag | Interactive utility like `grill-me`; lower auto-trigger risk |
| Defer language preference gate | Scope gate — port bilingual bodies as-is (ADR-007 partial) |
| Defer `modeling-*` standard update | No modeling commands in Wave 1; E4 per scope gate |

### Bundle A Flow (Requirements Quality)

Documented in CLAUDE.md and reinforced in skill chain sections:

1. Run `transcript-critic` on meeting transcript → decision-process audit report with diagnostic questions
2. Use diagnostic questions in follow-up meeting or async clarification
3. Run `requirements-critic` on refined user stories / tickets → interactive quality critique

### Data Flow

No persistent state, database, or task directory creation. Skills consume:
- Command argument (`$ARGUMENTS` on Kiro after build injection)
- Conversation context (when no argument provided)
- User responses via `AskUserQuestion` (requirements-critic Check 2–4; problem-classifier discriminating probes)

Outputs are inline structured markdown reports in the conversation.

### Integration Surfaces

| Surface | Wave 1 action |
|---------|---------------|
| `plugins/maister/CLAUDE.md` | Backfill + Wave 1 index + Bundle A + naming distinction |
| `platforms/kiro-cli/build.sh` | +3 merge_one, +3 skills_needing_args, +3 standalone skill dirs via normal build |
| `Makefile` | Rules 14: 51→57, 28: 26→32; fix pre-existing Rule 14 failure |
| `platforms/kiro-cli/tests/build-core.test.sh` | Counts: 22→57 total, 8→11 merged; fix unprefixed shortcut test |
| `platforms/kiro-cli/tests/validation.test.sh` | Counts: 22→57 total, 22→32 maister-* |
| Generated Copilot/Cursor/Kiro variants | Regenerated via `make build` |
| Future Wave 3 `aggregate-designer` | Consumes problem-classifier RC chain (stub only in E1) |

## Implementation Guidance

### Recommended Implementation Sequence

1. **Port skills** (parallelizable — three independent SKILL.md files)
2. **Add commands** (depends on skills existing for cross-reference in docs)
3. **Update CLAUDE.md** (depends on final skill/command names)
4. **Update build pipeline** (depends on command stems finalized)
5. **Build and validate** (merge gate)

Phases 1–2 can run in parallel per skill. Phases 3–5 are sequential.

### Per-Skill Implementation Checklist

| Skill | Frontmatter | disable-model-invocation | Command | Special |
|-------|-------------|--------------------------|---------|---------|
| requirements-critic | Strip `maister:` | Yes | quick-requirements-critic | Invocation guard + bilingual + chain section |
| transcript-critic | **Rewrite description** | Yes | quick-transcript-critic | Non-interactive; 7 checks |
| problem-classifier | Strip `maister:` | No | quick-problem-classifier | Stub aggregate-designer; fix cross-refs |

### Testing Approach

Wave 1 is plugin markdown + build integration — no application unit tests. Verification uses structural gates and manual smoke tests.

**Per implementation step group (2–8 focused checks):**

| Step group | Suggested verification checks |
|------------|------------------------------|
| Skill port (×3) | Frontmatter YAML valid; required sections present; `disable-model-invocation` correct per skill; no `maister:` in skill name; chain section present; grep confirms no `CLAUDE.md` refs in skill body |
| Command wrappers (×3) | Frontmatter `maister:quick-*` name; ACTION REQUIRED + Skill tool delegation; no rubric duplication; file under 200 lines |
| CLAUDE.md | Backfill entries exist; Wave 1 tables updated; Bundle A + task-classifier distinction present |
| Build integration | build.sh arrays extended (6 skills_needing_args + 3 merge_one); Makefile Rule 14→57, Rule 28→32; Kiro tests updated; `make build && make validate` exit 0 |
| Generated output | 3 new + 3 merged skill dirs in each platform variant; Kiro `$ARGUMENTS` present on interactive skills |

**Mandatory gate:** `make build && make validate` must pass before epic completion.

**Manual smoke (post-build):**
- Invoke each `/maister:quick-*` with sample input
- Confirm critics do not auto-trigger during passive requirements discussion
- Kiro: verify CHAT GATE transforms on requirements-critic and problem-classifier interactive paths

Run only new structural checks during incremental verification; full `make validate` before merge.

### Standards Compliance

| Standard | Applicable rules |
|----------|------------------|
| `plugin-development.md` | Source-only edits; kebab-case dirs; thin commands; SKILL.md as SOT; no generated variant edits |
| `build-pipeline.md` | Source `maister:` command prefix; flat commands layout; Kiro merge + naming transforms; CI build/validate gate |
| `conventions.md` | Documentation-first; specification before implementation |
| `minimal-implementation.md` | No speculative Wave 2–4 code; stub aggregate-designer reference only |
| ADR-001, ADR-002, ADR-003, ADR-008 | Hybrid packaging, quick-* commands, strict Wave 1 scope, standalone invocation |

**Deferred standards (out of scope E1):**
- `language-md-convention.md` (E2)
- `modeling-*` command category in `plugin-development.md` (E4)

## Out of Scope

- Waves 2–4 skills: `test-strategy-reviewer`, `metaprogram-classifier`, DDD pack, `archetype-scanner`
- `aggregate-designer` implementation (stub reference only)
- Orchestrator modifications (`development`, `product-design`, `research`) — soft suggestions deferred to Wave 2+ (ADR-008)
- New subagents for critics or classifiers
- `language.md` standard and language preference gate (E2 / post-Wave-1)
- `research --gather-only` (E6)
- Kiro `@shortcut` skills (user did not select)
- `modeling-*` category documentation in standards (defer to E4)
- Locale-specific build transforms
- Editing generated platform variants directly

## Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| SC-1 | Three AJ skills invocable standalone via Skill tool | Manual smoke + skill dirs in generated variants |
| SC-2 | Three `quick-*` commands discoverable and delegate correctly | CLAUDE.md entries + manual `/maister:quick-*` invocation |
| SC-3 | Critics explicit-only (`disable-model-invocation: true`) | Frontmatter on requirements-critic, transcript-critic; behavioral smoke |
| SC-4 | problem-classifier interactive without disable flag | Frontmatter absent; AskUserQuestion probes work |
| SC-5 | transcript-critic frontmatter defect fixed | Description matches meeting audit, not requirements critique |
| SC-6 | aggregate-designer stubbed for Wave 3 | No invoke of non-existent skill; chain section documents deferral |
| SC-7 | grill-me / thermos / thermo-nuclear-* documented | Grep CLAUDE.md |
| SC-8 | task-classifier vs problem-classifier distinguished | CLAUDE.md explicit comparison |
| SC-9 | Bundle A flow documented | CLAUDE.md + transcript-critic chain section |
| SC-10 | Build pipeline green | `make build && make validate` passes (includes Rule 14 baseline fix) |
| SC-11 | Kiro skill counts correct | Rule 14: 57 total dirs; Rule 28: 32 `maister-*` dirs; Kiro tests aligned |
| SC-12 | Additive only — no breaking changes | Existing skills/commands/orchestrators unchanged |
| SC-13 | Bilingual pedagogical content preserved | PL/EN content present in requirements-critic and problem-classifier bodies |

## Architecture Decision References

| ADR | Decision | Wave 1 application |
|-----|----------|-------------------|
| ADR-001 | Hybrid 1D — skills + chain sections | Recommended next steps in each ported SKILL.md |
| ADR-002 | Category-aligned commands | Three `quick-*` wrappers |
| ADR-003 | Strict Wave 1 delivery | Scope frozen to 3 skills |
| ADR-007 | Bilingual bodies, EN frontmatter | Port as-is; defer language gate |
| ADR-008 | Standalone Wave 1; critics get disable flag | No orchestrator hooks; critics only for flag |

## Known Limitations

- Full DDD modeling chain incomplete until Waves 3–4 (`aggregate-designer`, mappers, scanner)
- Language preference gate (ADR-007 option 7D) deferred — bilingual rubrics may feel mixed for English-only users
- No automated rubric/logic tests — quality depends on manual smoke and port fidelity to AJ source
- Kiro shortcut layer not included — discovery relies on slash commands and CLAUDE.md index
- Pre-existing Makefile Rule 14 drift (26 expected vs 51 actual) must be fixed as part of FR-6 — not a Wave 1 regression

## Specification Revision History

| Date | Change | Trigger |
|------|--------|---------|
| 2026-06-13 | FR-6 corrected: Rule 14 51→57, six `skills_needing_args`, explicit Kiro test targets, pre-existing baseline note | Spec audit pass-with-concerns (C1–C3) |
| 2026-06-13 | FR-4 normative command template added; Skill-tool deviation documented | Spec audit H2 |

---

**Epic:** E1 — Wave 1 Requirements & Classification  
**Research task:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`  
**Risk level:** Low–Medium  
**Estimated effort:** ~3 days (~960 lines rubric + 6 artifacts + 4 integration surfaces)
