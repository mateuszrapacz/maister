# Research Plan: Architekt Jutra Skills for Maister Adoption

**Created:** 2026-06-09  
**Research type:** Mixed (literature + technical comparative analysis)  
**Task path:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/`

## Research Overview

### Research Question

Extract all skills from `/Users/mrapacz/Projects/architekt-jutra-code`, analyze and categorize each one, and recommend which could be adopted into the Maister plugin as standalone invocable skills (similar to `grill-me` or `thermos`).

### Research Type Classification

| Dimension | Classification | Rationale |
|-----------|----------------|-----------|
| Primary | **Literature** | AJ skills are external markdown artifacts — purpose, workflow, invocation model must be read and interpreted |
| Secondary | **Technical** | Fit assessment requires Maister plugin architecture, existing skill inventory, build pipeline constraints |
| Combined | **Mixed** | Inventory + taxonomy + gap analysis + ranked adoption recommendations with integration notes |

### Scope Boundaries

**Included:**
- All 14 `SKILL.md` files under architekt-jutra-code (verified via Glob)
- Per-skill: purpose, workflow phases, invocation guards, dependencies (subagents, MCP, `AskUserQuestion`/`AskQuestion`, `references/`)
- Maister skills in `plugins/maister/skills/` (18 skills)
- Adoption fit for Maister as generic AI SDLC plugin marketplace (not AJ-dotnet application code)
- Categorization by function (requirements, domain modeling, review, research, communication, platform-specific)
- Priority recommendations: high / medium / low / not recommended
- Integration notes for top candidates (command name, dependencies, overlap with existing workflows)

**Excluded:**
- Porting week-demo application code or AJ-dotnet runtime
- Implementing adopted skills (recommendations only)
- Deep analysis of AJ application runtime (skill artifacts only)
- `incident-diagnosis-review` and `aj-kg-query` as first-class Maister skills unless strong generic value found (likely AJ-specific)

**Constraints:**
- Maister source of truth: `plugins/maister/skills/` — never edit generated variants
- Follow plugin conventions: thin commands, `SKILL.md` as single source of truth, optional `disable-model-invocation`
- Polish and English skills acceptable (Maister already has bilingual-friendly patterns)
- Skills requiring Neo4j MCP or AJ-specific knowledge graph are low fit for generic distribution

### Sub-Questions

1. **Inventory completeness:** Do the 14 identified `SKILL.md` files represent all AJ skills, or are there additional skill-like artifacts (commands, agents masquerading as skills)?
2. **Duplication:** Are `transcript-critic` and `requirements-critic` duplicates? Which naming/frontmatter pattern should Maister follow if adopting?
3. **Invocation model:** Which AJ skills match the `grill-me`/`thermos` pattern (explicit-only, on-demand, no orchestrator state)?
4. **Dependency portability:** Which skills require AJ-specific subagents, MCP servers, or registry tables that cannot ship in generic Maister?
5. **Overlap vs complement:** Where do AJ skills duplicate Maister orchestrators (`development`, `research`, `product-design`) vs fill genuine gaps?
6. **Domain modeling cluster:** Can the week7/week8 DDD modeling skills (archetypes, aggregates, context distiller, problem classifier) stand alone in Maister without AJ course context?
7. **Command surface:** For each high-priority candidate, what thin command wrapper (`commands/quick-*` or `commands/reviews-*`) is appropriate?

---

## Methodology

### Primary Approach

**Structured skill audit + comparative fit matrix:**

1. **Catalog** — Read all 14 AJ `SKILL.md` files; extract structured metadata (name, description, workflow steps, tools, language, line count, references)
2. **Classify** — Assign each skill to a taxonomy (see Analysis Framework)
3. **Baseline** — Map Maister's 18 skills by role (orchestrator vs engine vs on-demand utility)
4. **Compare** — Build overlap/complement/gap matrix (AJ skill × Maister capability)
5. **Score** — Rank adoption using fit criteria (see below)
6. **Recommend** — Top candidates get integration notes (directory name, command, dependencies, adaptation effort)

### Analysis Framework

#### Skill Taxonomy (proposed — validate during gathering)

| Category | Description | Example AJ skills (hypothesis) |
|----------|-------------|--------------------------------|
| **Requirements & critique** | Interactive requirement quality, user-story reformulation | `requirements-critic`, `transcript-critic` |
| **Domain modeling — classification** | Problem/archetype/metaprogram classification | `problem-classifier`, `metaprogram-classifier`, `archetype-scanner` |
| **Domain modeling — transformation** | Requirements → domain models (archetypes, aggregates, contexts) | `accounting-archetype-mapper`, `pricing-archetype-mapper`, `aggregate-designer`, `context-distiller` |
| **Architecture & boundaries** | Bounded context, linguistic leakage | `linguistic-boundary-verifier` |
| **Review & verification** | Read-only audits of tests, incidents, code strategy | `test-strategy-reviewer`, `incident-diagnosis-review` |
| **Research & gathering** | Lightweight multi-source collection | `research-gatherer` |
| **Platform-specific** | AJ KG, Neo4j MCP, course/demo context | `aj-kg-query`, possibly demo-nested paths |

#### Maister Skill Roles (baseline for comparison)

| Role | Maister examples | Adoption pattern for AJ |
|------|------------------|-------------------------|
| **Workflow orchestrator** | `development`, `research`, `product-design`, `migration`, `performance` | Unlikely direct adoption — assess if AJ skill should remain standalone or merge into phase |
| **Internal engine** | `docs-manager`, `implementation-plan-executor`, `orchestrator-framework` | Not user-facing; AJ equivalents unlikely unless engine reuse |
| **On-demand utility** | `grill-me`, `thermos`, `quick-bugfix` | **Primary adoption target** — explicit invocation, optional `disable-model-invocation` |
| **Review subagent hosts** | `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` | Pattern for skills that delegate to agents in parallel |

#### Adoption Fit Criteria

Score each AJ skill 1–5 per dimension; aggregate to high / medium / low / not recommended:

| Criterion | High fit | Low fit |
|-----------|----------|---------|
| **Generic SDLC value** | Useful in any software project without AJ platform | Requires AJ host app, course week context, or Neo4j KG |
| **Standalone invocability** | Works like `grill-me` — paste input, get guided output | Requires multi-skill registry, external MCP, or orchestrator state |
| **Maister gap** | No existing Maister skill covers this | Duplicates `development` requirements phase, `research`, or review commands |
| **Portability** | Uses only `AskUserQuestion`, Read, Grep — no AJ-specific agents | Hard-coded subagent_type to non-Maister agents |
| **Plugin conventions** | Kebab-case dir, principles in SKILL.md, <1000 lines, optional thin command | Deep coupling to AJ repo paths, Polish-only without EN description |
| **Distribution** | No extra MCP beyond Maister's Playwright | Requires `neo4j-aj-kb` or ATIF trajectory artifacts |

#### Reference Adoption Patterns (Maister)

| Pattern | Skill | Key traits |
|---------|-------|--------------|
| **Interactive stress-test** | `grill-me` | No frontmatter `maister:` prefix; description triggers auto-discovery; one question at a time |
| **Parallel review composite** | `thermos` | `disable-model-invocation: true`; launches two Maister subagents; synthesizes deduplicated findings |
| **Explicit-only critique** | AJ `requirements-critic` | Invocation guard in body; "Invoked ONLY on explicit request" — good model for on-demand skills |
| **Orchestrator with gates** | `maister:research` | Full state, task directory — **not** the target pattern for AJ adoption unless skill is truly workflow-scale |

### Fallback Strategies

- If an AJ skill is valuable but AJ-coupled: document as **adapt** (generalize registry, replace MCP with codebase search) rather than **adopt as-is**
- If overlap with Maister orchestrator: recommend **embed as optional phase** or **reference file** inside existing skill, not new top-level skill
- If duplicate AJ skills (`transcript-critic` vs `requirements-critic`): recommend single canonical version for Maister
- If skill bundle (archetype-scanner + mappers): recommend phased adoption — scanner first, mappers as follow-on

---

## Research Phases

### Phase 1: Broad Discovery

**Goal:** Confirm complete AJ skill inventory; map directory layout; identify Maister on-demand skill patterns.

**Actions:**
- Glob `**/SKILL.md` under architekt-jutra-code (confirm 14 files)
- Glob `plugins/maister/skills/**/SKILL.md` (confirm 18 files)
- List AJ skills by week/demo folder — note which live outside `.claude/skills/`
- Read frontmatter-only pass on all 14 AJ skills (name, description, argument-hint)
- Read `grill-me`, `thermos`, `thermo-nuclear-*` as adoption reference templates
- Scan `plugins/maister/CLAUDE.md` "Available Skills" table for documented inventory

**Expected outputs:**
- Master inventory table (14 rows) with path, skill name, line count estimate
- Note on duplicates and naming inconsistency (`maister:` prefix vs plain kebab-case in AJ)

### Phase 2: Targeted Reading — AJ Skill Deep Dive

**Goal:** Per-skill structured extraction for taxonomy assignment.

**Actions (per skill):**
- Read full `SKILL.md`
- Extract: workflow steps, interactive gates, subagent delegations, MCP references, `references/` dependencies
- Flag language (PL/EN/mixed)
- Note invocation guards and trigger phrases
- Record estimated complexity (lines, number of decision branches)

**Batch by week/theme:**
- Week7: modeling cluster (context-distiller, archetype-*, aggregate-designer, research-gatherer)
- Week8: classification + critique (transcript/requirements-critic, problem-classifier, metaprogram-classifier)
- Week10: review (test-strategy-reviewer, linguistic-boundary-verifier)
- Tools/Claude: platform-specific (aj-kg-query, incident-diagnosis-review)

**Expected outputs:**
- One-paragraph description per skill (success criterion #1)
- Draft taxonomy assignments (success criterion #2)

### Phase 3: Maister Baseline & Standards Alignment

**Goal:** Understand where AJ skills would live and what conventions apply.

**Actions:**
- Read `plugin-development.md`, `conventions.md`, relevant sections of `plugins/maister/CLAUDE.md`
- Classify Maister's 18 skills: orchestrator / engine / on-demand / review-host
- Map existing commands (`commands/reviews-*`, `commands/quick-*`) to skills
- Identify `disable-model-invocation` usage pattern
- Check build pipeline: skill name transforms (`maister:` → platform variants)

**Expected outputs:**
- Maister skill role matrix
- Checklist for "adoptable standalone skill" derived from standards

### Phase 4: Comparative Analysis & Gap Matrix

**Goal:** Overlap, complement, missing capabilities; ranked recommendations.

**Actions:**
- Build AJ × Maister capability matrix:
  - **Overlap:** e.g., `research-gatherer` vs `maister:research`; `requirements-critic` vs development requirements phase
  - **Complement:** e.g., domain modeling skills vs Maister (no DDD modeling utilities today)
  - **Missing in Maister:** genuine gaps worth filling
- Apply adoption fit criteria; assign high/medium/low/not recommended
- For high candidates: draft integration notes (skill dir name, command, agents to create, overlap mitigation)
- Explicitly score `aj-kg-query` and `incident-diagnosis-review` against exclusion hypothesis

**Expected outputs:**
- Gap analysis table (success criterion #3)
- Ranked adoption list with rationale (success criterion #4)
- Integration notes for top 3–5 candidates (success criterion #5)

### Phase 5: Verification & Synthesis

**Goal:** Validate completeness; produce research report.

**Actions:**
- Cross-check: all 14 skills appear in inventory and taxonomy
- Verify every high/medium recommendation cites evidence (SKILL.md path + Maister comparison)
- Resolve open questions (duplicates, naming, bundle vs individual adoption)
- Hand off to research-synthesizer → `outputs/research-report.md`

**Expected outputs:**
- `analysis/synthesis.md` with consolidated findings
- `outputs/research-report.md` with executive summary and phased adoption roadmap

---

## Gathering Strategy

### Instances: 4

| # | Category ID | Focus Area | Tools | Output Prefix |
|---|-------------|------------|-------|---------------|
| 1 | `external-skills-repo` | All 14 AJ `SKILL.md` files: inventory, per-skill summary, workflow/deps/MCP/subagents, taxonomy draft, duplicate detection (`transcript-critic` vs `requirements-critic`) | Glob, Grep, Read | `external-skills` |
| 2 | `maister-codebase` | Maister `plugins/maister/skills/` (18 skills), `commands/`, adoption references (`grill-me`, `thermos`, `thermo-nuclear-*`), `CLAUDE.md` skill tables | Glob, Grep, Read | `maister-skills` |
| 3 | `plugin-standards` | `.maister/docs/standards/global/plugin-development.md`, `conventions.md`, `tech-stack.md`, build pipeline implications for new skills | Read, Grep | `plugin-standards` |
| 4 | `comparative-analysis` | Gap/overlap matrix, adoption fit scoring, ranked recommendations, integration notes for top candidates; explicit assessment of excluded skills | Read (findings from 1–3), structured comparison | `comparative` |

### Rationale

- **external-skills-repo:** Single gatherer owns the full AJ corpus — avoids splitting 14 files across agents and ensures consistent taxonomy labels.
- **maister-codebase:** Separates baseline inventory from external repo so comparative agent can consume both findings files without re-reading all SKILL.md.
- **plugin-standards:** Adoption recommendations must cite enforceable conventions (kebab-case dirs, thin commands, never edit generated variants, `disable-model-invocation` pattern).
- **comparative-analysis:** Runs after or in parallel with 1–3; produces the ranked adoption list and gap matrix that directly answer the research question.

**Execution order:** Gatherers 1, 2, and 3 can run in parallel. Gatherer 4 should start after 1–3 complete (or read partial findings if orchestrator streams results).

### Per-Gatherer Deliverables

Each gatherer writes to `analysis/findings/[prefix]-*.md`:

1. **Findings** — facts with cited paths
2. **Tables** — inventory, taxonomy, or matrix as appropriate
3. **Gaps / open questions** — with confidence (H/M/L)
4. **Preliminary recommendations** — gatherer 4 owns final rankings; others may note obvious fits/misfits

---

## Data Sources Summary

Full manifest in `planning/sources.md`.

| Category | Primary sources |
|----------|-----------------|
| External skills repo | 14 `SKILL.md` paths under `/Users/mrapacz/Projects/architekt-jutra-code` |
| Maister codebase | `plugins/maister/skills/`, `plugins/maister/commands/`, `plugins/maister/CLAUDE.md` |
| Plugin standards | `.maister/docs/standards/global/plugin-development.md`, `conventions.md`, `tech-stack.md` |
| Comparative | Cross-product of gatherer outputs 1–3 |

---

## Success Criteria

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | Complete inventory of all AJ skills with one-paragraph description each | 14-row table in synthesis/report |
| 2 | Taxonomy with every skill assigned | Category column populated for all 14 |
| 3 | Gap analysis vs Maister current skills | Overlap/complement/missing matrix |
| 4 | Ranked adoption recommendations with rationale | high/medium/low/not recommended for each skill |
| 5 | Integration notes for top candidates | Command name, dependencies, overlap notes for ≥3 high-priority skills |

---

## Expected Outputs (Research Workflow)

| Artifact | Path | Owner |
|----------|------|-------|
| Research brief | `planning/research-brief.md` | Phase 1 Step 1 ✅ |
| Research plan | `planning/research-plan.md` | research-planner ✅ |
| Sources manifest | `planning/sources.md` | research-planner ✅ |
| Gatherer findings | `analysis/findings/[prefix]-*.md` | information-gatherer × 4 |
| Synthesis | `analysis/synthesis.md` | research-synthesizer |
| Research report | `outputs/research-report.md` | research workflow |

---

## Preliminary Hypotheses (to validate)

1. **High adoption candidates:** `requirements-critic`, `problem-classifier`, `test-strategy-reviewer`, `linguistic-boundary-verifier` — generic SDLC value, interactive on-demand pattern, minimal external deps.
2. **Medium (bundle or adapt):** Domain modeling cluster (`aggregate-designer`, `context-distiller`, archetype mappers, `archetype-scanner`) — strong value for DDD practitioners but Polish-heavy, some need subagent registry generalization.
3. **Low / not recommended:** `aj-kg-query` (Neo4j MCP), `incident-diagnosis-review` (ATIF/AJ evaluator context), `research-gatherer` (overlaps Maister research orchestrator).
4. **Duplicate to resolve:** `transcript-critic` appears to mirror `requirements-critic` — adopt one canonical skill if proceeding.
5. **Naming cleanup:** Several AJ skills already use `maister:` prefix in a non-Maister repo — Maister adoption should use consistent kebab-case dirs without duplicating prefix in filename.
6. **Command wrappers:** High-priority skills likely need new `commands/quick-*` or domain-specific command category (e.g., `commands/modeling-*`) — verify against flat command layout standard.

---

## Timeline Estimate

| Phase | Effort | Parallel gatherers |
|-------|--------|-------------------|
| Phase 1 (discovery) | 0.25 day | — |
| Phase 2–3 (deep dive + baseline) | 0.5 day | 1, 2, 3 in parallel |
| Phase 4 (comparative) | 0.25 day | 4 |
| Phase 5 (synthesis) | 0.25 day | synthesizer |
| **Total research** | **~1–1.5 days** | 4 parallel in Phase 2–3 |

Implementation of adopted skills (post-research): separate `/maister-development` workflow per skill or batched epic.
