# Comparative Adoption Matrix: Architekt Jutra × Maister

**Gatherer:** comparative-analysis  
**Date:** 2026-06-09  
**Sources:** 14 AJ `SKILL.md` files (`/Users/mrapacz/Projects/architekt-jutra-code`), 18 Maister skills (`plugins/maister/skills/`), research plan adoption criteria

---

## Executive Summary

Maister's skill inventory is strong on **workflow orchestration** (development, research, product-design), **verification** (implementation-verifier, thermo-nuclear reviews), and **on-demand stress-testing** (grill-me, thermos). It has **no DDD modeling utilities**, **no requirements-quality critique**, and **no meeting-process critique**.

The highest-value AJ adoptions are **standalone, on-demand skills** with minimal dependencies: `requirements-critic`, `transcript-critic`, `problem-classifier`, `test-strategy-reviewer`, and `linguistic-boundary-verifier`. The DDD modeling cluster (`context-distiller`, archetype mappers, `aggregate-designer`, `archetype-scanner`) fills a genuine Maister gap but should ship as a **phased bundle** with naming cleanup and optional subagent registry generalization.

**Explicit exclusions confirmed:** `aj-kg-query` (Neo4j MCP + AJ platform ontology) and `incident-diagnosis-review` (ATIF trajectory evaluator) are not suitable for generic Maister distribution. `research-gatherer` substantially overlaps `maister:research` and should not be adopted as a separate top-level skill.

**Duplicate hypothesis resolved:** `transcript-critic` and `requirements-critic` are **not duplicates** — different inputs (meeting transcript vs requirements text), different check frameworks (7 process checks vs 4 requirement-quality checks).

---

## Maister Baseline (18 Skills by Role)

| Role | Maister Skills | Relevance to AJ Comparison |
|------|----------------|---------------------------|
| **Workflow orchestrator** | `development`, `research`, `product-design`, `migration`, `performance` | AJ `research-gatherer` overlaps `research`; AJ modeling skills complement (not replace) orchestrators |
| **Internal engine** | `docs-manager`, `orchestrator-framework`, `implementation-plan-executor` | No AJ equivalent; adoption target is user-facing skills only |
| **On-demand utility** | `grill-me`, `thermos`, `quick-bugfix` | **Primary adoption pattern** for AJ skills |
| **Review / verification host** | `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`, `implementation-verifier`, `codebase-analyzer` | Partial overlap with `test-strategy-reviewer`, `linguistic-boundary-verifier`; different focus |
| **Setup / standards** | `init`, `standards-discover`, `standards-update` | No direct AJ overlap |

**Reference adoption patterns in Maister:**

| Pattern | Example | Traits |
|---------|---------|--------|
| Interactive stress-test | `grill-me` | No `maister:` prefix; one question at a time; auto-discovery via description |
| Parallel review composite | `thermos` | `disable-model-invocation: true`; launches Maister subagents; synthesizes |
| Explicit-only critique | AJ `requirements-critic` | Invocation guard; on-demand only |
| Full orchestrator | `maister:research` | State, task directory — **not** target for AJ adoption unless workflow-scale |

---

## 1. Gap / Overlap Matrix (AJ Skill × Maister Capability)

**Legend:** ● = strong overlap | ◐ = partial overlap / complement | ○ = gap (Maister lacks) | ✗ = AJ-specific / not portable

| AJ Skill | development | product-design | research | grill-me | thermos / thermo-* | implementation-verifier | codebase-analyzer | quick-bugfix | Relationship |
|----------|:-----------:|:--------------:|:--------:|:--------:|:------------------:|:---------------------:|:-----------------:|:------------:|--------------|
| **requirements-critic** | ◐ | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | **Complement** — development/product-design gather requirements; no 4-check critique + interactive reformulation |
| **transcript-critic** | ○ | ◐ | ○ | ◐ | ○ | ○ | ○ | ○ | **Complement** — product-design may ingest transcripts; no decision-process audit |
| **problem-classifier** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **Gap** — no modeling problem-class taxonomy |
| **metaprogram-classifier** | ○ | ○ | ○ | ◐ | ○ | ○ | ○ | ○ | **Complement** — grill-me stress-tests *your* plan; metaprogram diagnoses *others'* communication filters |
| **test-strategy-reviewer** | ○ | ○ | ○ | ○ | ◐ | ◐ | ○ | ○ | **Complement** — verifier runs tests; thermo reviews code quality; none match problem-class → test-strategy alignment |
| **linguistic-boundary-verifier** | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | **Gap** — no bounded-context language leakage detection |
| **context-distiller** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **Gap** — no strategic DDD context generalization |
| **archetype-scanner** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **Gap** — no archetype recognition; needs mapper sub-skills |
| **accounting-archetype-mapper** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **Gap** — no ledger/value-flow modeling utility |
| **pricing-archetype-mapper** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **Gap** — no pricing engine modeling utility |
| **aggregate-designer** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **Gap** — no consistency-unit design wizard |
| **research-gatherer** | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ | **Overlap** — stripped `maister:research` (gather only, no synthesis) |
| **incident-diagnosis-review** | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | **AJ-specific** — ATIF trajectory rubric; partial overlap with reality-assessor |
| **aj-kg-query** | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ○ | **AJ-specific** — Neo4j KG; codebase-analyzer covers generic code discovery |

### Capability Cluster View

| Maister Capability Area | AJ Skills That Fill Gap | AJ Skills That Overlap |
|-------------------------|---------------------------|------------------------|
| Requirements quality | `requirements-critic` | — |
| Meeting / decision quality | `transcript-critic` | — |
| Domain modeling — classification | `problem-classifier`, `metaprogram-classifier` | — |
| Domain modeling — transformation | `context-distiller`, `accounting-archetype-mapper`, `pricing-archetype-mapper`, `aggregate-designer` | — |
| Domain modeling — orchestration | `archetype-scanner` | — |
| Architecture boundaries | `linguistic-boundary-verifier` | — |
| Test strategy (problem-class aligned) | `test-strategy-reviewer` | — |
| Research gathering | — | `research-gatherer` → `maister:research` |
| Platform KG query | — | `aj-kg-query` |
| Incident evaluation | — | `incident-diagnosis-review` |

---

## 2. Adoption Scoring (6 Dimensions, 1–5 Each)

Scoring criteria from research plan: **Generic SDLC value**, **Standalone invocability**, **Maister gap**, **Portability**, **Plugin conventions**, **Distribution**.

| AJ Skill | Generic SDLC | Standalone | Maister Gap | Portability | Plugin Conv. | Distribution | **Total** | **Tier** |
|----------|:------------:|:----------:|:-----------:|:-----------:|:------------:|:------------:|:---------:|:--------:|
| requirements-critic | 5 | 5 | 5 | 5 | 4 | 5 | **29** | **High** |
| transcript-critic | 5 | 5 | 5 | 5 | 5 | 5 | **30** | **High** |
| problem-classifier | 5 | 5 | 5 | 5 | 4 | 5 | **29** | **High** |
| metaprogram-classifier | 4 | 5 | 5 | 5 | 4 | 5 | **28** | **High** |
| test-strategy-reviewer | 5 | 5 | 4 | 5 | 4 | 5 | **28** | **High** |
| linguistic-boundary-verifier | 4 | 5 | 5 | 4 | 4 | 5 | **27** | **High** |
| context-distiller | 4 | 5 | 5 | 5 | 4 | 5 | **28** | **Medium** |
| aggregate-designer | 4 | 5 | 5 | 5 | 4 | 5 | **28** | **Medium** |
| accounting-archetype-mapper | 4 | 5 | 5 | 5 | 4 | 5 | **28** | **Medium** |
| pricing-archetype-mapper | 4 | 5 | 5 | 5 | 4 | 5 | **28** | **Medium** |
| archetype-scanner | 4 | 3 | 5 | 3 | 3 | 4 | **22** | **Medium** |
| research-gatherer | 3 | 2 | 2 | 2 | 2 | 5 | **16** | **Low** |
| incident-diagnosis-review | 2 | 3 | 3 | 1 | 3 | 2 | **14** | **Not recommended** |
| aj-kg-query | 1 | 3 | 1 | 1 | 2 | 1 | **9** | **Not recommended** |

**Tier thresholds:** High ≥27 | Medium 22–26 | Low 17–21 | Not recommended ≤16

### Scoring Notes (Evidence)

| Skill | Key Evidence |
|-------|--------------|
| requirements-critic | Explicit invocation guard; 4 checks + `AskUserQuestion` reformulation; ~260 lines; `maister:` prefix in AJ repo needs strip on adoption |
| transcript-critic | 7-check meeting audit framework; no subagents/MCP; distinct from requirements-critic (different input + checks) |
| problem-classifier | 4-class taxonomy (CRUD/T&P/Integration/RC); chains optionally to `aggregate-designer`; ~480 lines |
| metaprogram-classifier | 7 NLP metaprograms; ethical guardrails; complements (not duplicates) `grill-me` |
| test-strategy-reviewer | Problem-class → test-strategy matrix; read-only; confirms classification with user before recommending |
| linguistic-boundary-verifier | Requires `language.md` per module; grep-based leakage detection; pairs with `context-distiller` |
| context-distiller | Bidirectional linguistic analysis; 6 principles; standalone without AJ course context |
| aggregate-designer | Interactive wizard; fit-check redirects to problem-classifier; ~541 lines |
| archetype-scanner | Registry table + parallel `subagent_type` launch — needs Maister agent/skill registry adaptation |
| research-gatherer | Uses `orchestrator-framework`, `TaskCreate`, `research-planner` + `information-gatherer` — near-duplicate of `maister:research` Phase 2 only |
| incident-diagnosis-review | Requires `agent/trajectory.json`, `ground_truth_decisions.json`, AJ incident topology vocabulary |
| aj-kg-query | Hard dependency on `neo4j-aj-kb` MCP; AJ platform ontology only |

---

## 3. Ranked Recommendations (All 14 Skills)

### High — Adopt as standalone on-demand skills

| Skill | Rationale | Adaptation |
|-------|-----------|------------|
| **transcript-critic** | Highest composite score; unique capability; zero deps; EN-native | Rename dir `transcript-critic`; add thin command |
| **requirements-critic** | Fills requirements-quality gap; excellent `grill-me`-style invocation model | Strip `maister:` prefix; bilingual PL/EN retained |
| **problem-classifier** | Foundational DDD classifier; chains to aggregate-designer in Phase 2 | Strip `maister:` prefix; add EN description parity |
| **test-strategy-reviewer** | Distinct from Maister code/test review; problem-class heuristic valuable | New `commands/reviews-*` category entry |
| **metaprogram-classifier** | Team communication gap; pairs with product/development stakeholder work | Ethical preamble retained; PL markers + EN output |
| **linguistic-boundary-verifier** | Unique architecture health check; read-only | Document `language.md` convention in skill prereqs |

### Medium — Adopt as phased bundle (DDD modeling pack)

| Skill | Rationale | Adaptation |
|-------|-----------|------------|
| **context-distiller** | Strategic design complement; no Maister equivalent | Bundle Phase 1; generalize examples |
| **aggregate-designer** | Natural follow-on from problem-classifier (RC path) | Cross-reference `problem-classifier` by kebab dir name |
| **accounting-archetype-mapper** | Standalone mapper; fit-test gate prevents misuse | Large (~548 lines) but under 1k limit |
| **pricing-archetype-mapper** | Standalone mapper; complements accounting | Same as accounting |
| **archetype-scanner** | Useful orchestration over mappers | **Adapt:** replace hard-coded `subagent_type` with Maister Task tool + skill dir refs; ship after mappers |

### Low — Do not adopt as top-level skill

| Skill | Rationale | Alternative |
|-------|-----------|-------------|
| **research-gatherer** | Substantial overlap with `maister:research`; uses same subagents/framework | Add `--gather-only` flag or Phase 2 shortcut doc inside `research` skill |

### Not recommended

| Skill | Rationale |
|-------|-----------|
| **aj-kg-query** | Neo4j MCP + AJ-specific KG; fails distribution and generic SDLC criteria per research brief exclusion |
| **incident-diagnosis-review** | ATIF trajectory evaluator tied to AJ incident demo; not portable to generic Maister consumers |

---

## 4. Top 5 Integration Proposals

| # | AJ Skill | Suggested Command | Suggested Skill Directory | Effort | Dependencies | Overlap Mitigation |
|---|----------|-------------------|---------------------------|:------:|--------------|-------------------|
| 1 | requirements-critic | `/maister:quick-requirements-critic` | `plugins/maister/skills/requirements-critic/` | **S** | `AskQuestion` only | Distinct from development requirements phase — explicit-only, no orchestrator state |
| 2 | transcript-critic | `/maister:quick-transcript-critic` | `plugins/maister/skills/transcript-critic/` | **S** | None | Complements product-design context ingestion; does not summarize |
| 3 | problem-classifier | `/maister:quick-problem-classifier` | `plugins/maister/skills/problem-classifier/` | **S** | `AskQuestion`; optional chain to `aggregate-designer` | No Maister modeling taxonomy exists today |
| 4 | test-strategy-reviewer | `/maister:reviews-test-strategy` | `plugins/maister/skills/test-strategy-reviewer/` | **S** | Read test + production code | Position alongside `reviews-code`; different rubric (strategy vs quality) |
| 5 | linguistic-boundary-verifier | `/maister:reviews-linguistic-boundaries` | `plugins/maister/skills/linguistic-boundary-verifier/` | **M** | `language.md` convention; Grep/Read | Document prerequisite; offer `language.md` draft generation via separate future skill |

**Effort key:** S = port SKILL.md + thin command + CLAUDE.md table entry (<1 day) | M = port + convention docs + optional reference file | L = port + new subagents/registry + command category

**Naming cleanup on adoption:**
- Remove erroneous `maister:` prefix from AJ frontmatter `name:` fields (AJ repo used Maister naming prematurely)
- Use kebab-case directories matching skill purpose
- Add `disable-model-invocation: true` only where explicit-only invocation is required (requirements-critic, transcript-critic candidates)

---

## 5. Recommended Skill Bundles

### Bundle A: Requirements Quality Pack

**Skills:** `requirements-critic`, `transcript-critic`  
**Command category:** `commands/quick-*`  
**Use case:** Pre-implementation requirements hardening — critique written specs *and* meeting decisions before they become tickets.  
**Invocation flow:** Meeting → `transcript-critic` → refined questions → `requirements-critic` on resulting stories.  
**Phase:** Ship together in one epic; no inter-skill deps.

### Bundle B: DDD Modeling Pack (phased)

| Phase | Skills | Dependency |
|-------|--------|------------|
| **B1 — Classification** | `problem-classifier` | None |
| **B2 — Strategic design** | `context-distiller`, `linguistic-boundary-verifier` | B1 optional; `language.md` for boundary verifier |
| **B3 — Pattern mapping** | `accounting-archetype-mapper`, `pricing-archetype-mapper` | B1 fit tests |
| **B4 — Consistency units** | `aggregate-designer` | B1 RC classification path |
| **B5 — Orchestration** | `archetype-scanner` | B3 mappers + Maister registry adaptation |

**Command category:** `commands/modeling-*` (new category — 5 commands)  
**Use case:** Teams practicing DDD/event storming within Maister SDLC without AJ course context.

### Bundle C: Architecture Review Pack

**Skills:** `linguistic-boundary-verifier`, `test-strategy-reviewer`  
**Command category:** `commands/reviews-*`  
**Use case:** Periodic architecture health — language boundaries + test-strategy alignment. Complements existing `reviews-code` and `thermos`.  
**Suggested pairing:** Run after `thermos` on same PR scope for complementary lenses (code risk + linguistic leakage + test strategy).

### Bundle D: Stakeholder Communication Pack

**Skills:** `metaprogram-classifier`, `grill-me` (existing)  
**Use case:** Prepare for difficult conversations — diagnose counterparty filters (`metaprogram-classifier`), then stress-test your proposal (`grill-me`).  
**Note:** No new Maister skill beyond `metaprogram-classifier`; document pairing in CLAUDE.md.

### Bundle E: Not bundled

| Skill | Disposition |
|-------|-------------|
| `research-gatherer` | Embed as `maister:research` gather-only mode — not a bundle member |
| `aj-kg-query` | Exclude |
| `incident-diagnosis-review` | Exclude |

---

## Cross-Cutting Findings

### Naming inconsistency in AJ repo

Several AJ skills use `name: maister:*` in frontmatter while living in the AJ codebase (`requirements-critic`, `problem-classifier`, `metaprogram-classifier`, `context-distiller`, `aggregate-designer`, `test-strategy-reviewer`). Maister adoption should use **kebab-case dirs without double prefix** and platform build transforms handle `maister:` namespacing.

### Command surface gap

Maister today has `commands/quick-*` (plan, dev, bugfix) and `commands/reviews-*` (code, pragmatic, spec-audit, reality-check, production-readiness). High-priority AJ skills need:
- 2 new `quick-*` commands (requirements, transcript, problem-classifier)
- 2 new `reviews-*` commands (test-strategy, linguistic-boundaries)
- Optional new `modeling-*` category for DDD bundle

### Chain relationships to preserve

```
problem-classifier ──(RC detected)──► aggregate-designer
context-distiller ──(boundaries defined)──► linguistic-boundary-verifier
archetype-scanner ──(parallel)──► accounting-archetype-mapper
                               └──► pricing-archetype-mapper
problem-classifier ──(classifies code under test)──► test-strategy-reviewer
```

### Open questions (confidence)

| Question | Finding | Confidence |
|----------|---------|------------|
| Are transcript-critic and requirements-critic duplicates? | **No** — different inputs and frameworks | **High** |
| Can DDD skills stand alone without AJ course? | **Yes** — skills are self-contained; examples are generic | **High** |
| Should research-gatherer be adopted? | **No** — overlap with `maister:research` | **High** |
| archetype-scanner portability? | Needs registry generalization for Maister subagents | **Medium** |

---

## Phased Adoption Roadmap (Recommended)

| Wave | Skills | Effort | User Value |
|------|--------|--------|------------|
| **Wave 1** | requirements-critic, transcript-critic, problem-classifier | 3× S | Immediate on-demand utility; minimal deps |
| **Wave 2** | test-strategy-reviewer, linguistic-boundary-verifier, metaprogram-classifier | 2× S + 1× S | Review + communication depth |
| **Wave 3** | context-distiller, aggregate-designer, accounting-archetype-mapper, pricing-archetype-mapper | 4× S | DDD modeling pack core |
| **Wave 4** | archetype-scanner | 1× M/L | Parallel scan after mappers + registry |
| **Defer / exclude** | research-gatherer, aj-kg-query, incident-diagnosis-review | — | Overlap or AJ-specific |

---

## Source Paths

| AJ Skill | Path |
|----------|------|
| requirements-critic | `week8/2/requirements-critic/SKILL.md` |
| transcript-critic | `week8/1/transcript-critic/SKILL.md` |
| problem-classifier | `week8/3/problem-classifier/SKILL.md` |
| metaprogram-classifier | `week8/4/metaprogram-classifier/SKILL.md` |
| test-strategy-reviewer | `week10/test-strategy-reviewer/SKILL.md` |
| linguistic-boundary-verifier | `week10/linguistic-boundary-verifier/SKILL.md` |
| context-distiller | `week7/4-uogolnienie-demo/context-distiller/SKILL.md` |
| archetype-scanner | `week7/5-znanewzorce-demo/archetype-scanner/SKILL.md` |
| accounting-archetype-mapper | `week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md` |
| pricing-archetype-mapper | `week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md` |
| aggregate-designer | `week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md` |
| research-gatherer | `week7/3-research-gatherer-demo/research-gatherer-standalone/skills/research-gatherer/SKILL.md` |
| incident-diagnosis-review | `tools/kg-incidents/evaluator_skills/incident-diagnosis-review/SKILL.md` |
| aj-kg-query | `.claude/skills/aj-kg-query/SKILL.md` |
