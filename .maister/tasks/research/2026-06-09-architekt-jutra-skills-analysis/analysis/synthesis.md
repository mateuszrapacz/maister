# Synthesis: Architekt Jutra Skills × Maister Adoption

**Task:** `2026-06-09-architekt-jutra-skills-analysis`  
**Synthesized:** 2026-06-09  
**Sources:** 4 gatherer findings files + research brief/plan  
**Methodology:** Structured skill audit + comparative fit matrix (6 dimensions × 14 skills)

---

## 1. Research Question — Answered

**Pytanie badawcze:** Wyciągnij wszystkie skille z architekt-jutra-code, przeanalizuj, skategoryzuj i zarekomenduj adopcję do Maister jako standalone invocable skills (wzorzec `grill-me` / `thermos`).

**Odpowiedź skrócona:** Z 14 skilli AJ **11 nadaje się do adopcji** (6 high, 5 medium w bundle DDD), **1 niska** (`research-gatherer` — overlap z `maister:research`), **2 wykluczone** (`aj-kg-query`, `incident-diagnosis-review`). Maister ma silne orchestratory SDLC, ale **brakuje mu całego klastra DDD, krytyki wymagań i audytu procesu decyzyjnego** — to główna wartość adopcji.

---

## 2. Cross-Source Pattern Analysis

### 2.1 Corpus Completeness

| Metric | Value | Confidence |
|--------|-------|------------|
| AJ `SKILL.md` files inventoried | 14 / 14 | **High** |
| Maister `SKILL.md` baseline | 18 / 18 | **High** |
| Total AJ corpus lines | 5,039 | **High** |
| All skills under 1k-line Maister threshold | Yes (max 591) | **High** |

**Pattern:** Pełny inwentarz AJ potwierdzony przez Glob w `planning/sources.md` i pełny odczyt każdego pliku (gatherer `external-skills-repo`). Brak dodatkowych skill-like artifacts poza 14 plikami — **niezweryfikowane** (confidence **Low**); nie blokuje rekomendacji.

### 2.2 Naming & Frontmatter Patterns

| Pattern | AJ (14) | Maister (18) | Adoption rule |
|---------|---------|--------------|---------------|
| `maister:` prefix in `name:` | 6 skills (w repo AJ!) | Orchestratory + branded utilities | **Strip** dla on-demand utilities |
| Plain kebab-case `name:` | 8 skills | `grill-me`, `thermos`, thermo-* | **Keep** |
| `disable-model-invocation` | 0 w AJ | 3 w Maister (thermos, thermo-*) | **Add** dla explicit-only critique |
| `argument-hint` | 14/14 | Częściowo | **Retain** |
| `references/` sibling | 2 (research-gatherer, aj-kg-query) | 9 Maister skills | Port selectively |

**Cross-reference:** `plugin-standards-porting.md` § `maister:` Prefix + `maister-skills-baseline.md` § Naming convention split → **spójna reguła:** on-demand skills → `plugins/maister/skills/<kebab>/` z `name: <kebab>` bez prefiksu.

### 2.3 Invocation Model Taxonomy

| Model | AJ skills | Maister analog | Adoption fit |
|-------|-----------|----------------|--------------|
| **Explicit-only on-demand** | requirements-critic, transcript-critic, test-strategy-reviewer | `grill-me`, `thermos` | **Primary target** |
| **Trigger-phrase on-demand** | problem-classifier, metaprogram-classifier, mappers, context-distiller, aggregate-designer | Partial `grill-me` | **Adopt** — opcjonalnie `disable-model-invocation` |
| **Interactive multi-phase wizard** | aggregate-designer, problem-classifier | Beyond simple utility | **Adopt** jako standalone (nie orchestrator) |
| **Parallel subagent composite** | archetype-scanner | `thermos` | **Adapt** — registry + Maister agents |
| **Full orchestrator + state** | research-gatherer | `maister:research` | **Do not adopt** jako top-level |
| **MCP platform query** | aj-kg-query | Brak | **Exclude** |
| **Evaluator rubric** | incident-diagnosis-review | Brak | **Exclude** |

**Pattern:** 12/14 skilli AJ pasuje do wzorca on-demand utility. Tylko `research-gatherer` i `aj-kg-query` wymagają infrastruktury poza standardowym Maister.

### 2.4 Dependency Portability Matrix

| Dependency | AJ usage | Maister support | Port action |
|------------|----------|-----------------|-------------|
| `AskUserQuestion` | 10+ skills | Build transform → `AskQuestion` (Cursor) | Normalize to `AskUserQuestion` in source |
| Subagents (Task) | archetype-scanner, research-gatherer | Maister agents available | Create agents or inline |
| Neo4j MCP | aj-kg-query only | Not distributed | Exclude |
| ATIF trajectory | incident-diagnosis-review | Not available | Exclude |
| `language.md` files | linguistic-boundary-verifier | No convention yet | Document prerequisite |
| `references/` | 2 skills | Standard pattern | Audit size/content on port |
| Skill chains (cross-ref) | 5 chains | N/A | Preserve kebab dir names |

**Cross-reference:** `external-skills-inventory.md` Dependency Matrix + `plugin-standards-porting.md` § Subagent and MCP → **zero MCP blockers** dla 12 adoptable skills.

### 2.5 Duplicate Hypothesis — Resolved

| Claim | Evidence | Confidence |
|-------|----------|------------|
| `transcript-critic` ≠ `requirements-critic` | Identical frontmatter (metadata bug); bodies: 7 vs 4 checks; transcript vs requirements input | **High** |
| `transcript-critic` frontmatter is stale | Body implements meeting decision-process audit, not requirements critique | **High** |
| Both should be adopted | Different capabilities; complementary in Requirements Quality Pack | **High** |

**Cross-reference:** `external-skills-inventory.md` § Transcript-Critic vs Requirements-Critic + `comparative-adoption-matrix.md` § Open questions.

### 2.6 Maister Gap Clusters

| Gap cluster | AJ skills filling gap | Maister nearest | Relationship |
|-------------|----------------------|-----------------|--------------|
| **Requirements quality** | requirements-critic | development requirements phase (collect, not critique) | Complement |
| **Meeting decision quality** | transcript-critic | product-design (ingest only) | Complement |
| **DDD classification** | problem-classifier, metaprogram-classifier | None | Gap |
| **DDD transformation** | context-distiller, mappers, aggregate-designer | None | Gap |
| **DDD orchestration** | archetype-scanner | None | Gap (needs adapt) |
| **Architecture boundaries** | linguistic-boundary-verifier | None | Gap |
| **Test strategy alignment** | test-strategy-reviewer | reviews-code, implementation-verifier | Complement |
| **Lightweight research** | research-gatherer | maister:research Phase 1 | Overlap |
| **Platform KG** | aj-kg-query | codebase-analyzer (partial) | AJ-specific |

**Cross-reference:** `maister-skills-baseline.md` § Gap Areas + `comparative-adoption-matrix.md` § Capability Cluster View.

### 2.7 Adoption Scoring Convergence

All 4 gatherers converge on tier assignments:

| Tier | Skills | Gatherer agreement |
|------|--------|-------------------|
| **High** (≥27/30) | requirements-critic, transcript-critic, problem-classifier, metaprogram-classifier, test-strategy-reviewer, linguistic-boundary-verifier | All 4 agree |
| **Medium** (22–26) | context-distiller, aggregate-designer, accounting/pricing mappers, archetype-scanner | All 4 agree |
| **Low** (16) | research-gatherer | All 4 agree |
| **Not recommended** (≤14) | aj-kg-query, incident-diagnosis-review | All 4 agree + brief exclusion |

**Scoring dimensions (1–5 each):** Generic SDLC value, Standalone invocability, Maister gap, Portability, Plugin conventions, Distribution.

### 2.8 Maister Adoption Pattern Mapping

| AJ skill type | Recommended Maister pattern | Reference skill |
|---------------|----------------------------|-----------------|
| Interactive critique | `grill-me` + optional `disable-model-invocation` | `grill-me`, `requirements-critic` guard |
| Read-only audit | Skill rubric + optional `reviews-*` command | `thermo-nuclear-review`, `reviews-code` |
| Parallel multi-mapper | `thermos` pattern | `thermos` |
| Multi-phase wizard | Standalone SKILL.md + `AskUserQuestion` gates | `aggregate-designer` (no state) |
| Orchestrator-scale | **Not adopted** — embed in existing | `maister:research` |

**Cross-reference:** `maister-skills-baseline.md` § grill-me/thermos + `plugin-standards-porting.md` § Adoptable Standalone Skill Checklist.

---

## 3. Skill Chain Topology (Preserve on Adoption)

```
                    ┌─────────────────────┐
                    │  problem-classifier │
                    └──────────┬──────────┘
                               │ RC detected
                               ▼
                    ┌─────────────────────┐
                    │  aggregate-designer │
                    └─────────────────────┘

┌──────────────────┐     boundaries      ┌────────────────────────────┐
│ context-distiller│ ──────────────────► │ linguistic-boundary-verifier │
└────────┬─────────┘                     └────────────────────────────┘
         │ recommends
         ▼
┌────────────────────────┐    ┌────────────────────────┐
│ accounting-archetype-  │    │ pricing-archetype-     │
│ mapper                 │    │ mapper                 │
└───────────┬────────────┘    └───────────┬────────────┘
            │                             │
            └──────────┬──────────────────┘
                       │ parallel (Task)
                       ▼
            ┌─────────────────────┐
            │  archetype-scanner  │
            └─────────────────────┘

problem-classifier ──(classifies code)──► test-strategy-reviewer

Meeting flow:
transcript-critic ──(refined questions)──► requirements-critic
```

**Confidence:** **High** — chains documented in AJ SKILL.md cross-refs; no AJ course runtime dependency.

---

## 4. Recommended Bundles (Synthesized)

| Bundle | Skills | Command category | Phase |
|--------|--------|------------------|-------|
| **A: Requirements Quality Pack** | requirements-critic, transcript-critic | `quick-*` | Wave 1 |
| **B: DDD Modeling Pack** | problem-classifier → context-distiller → mappers → aggregate-designer → archetype-scanner | `modeling-*` | Wave 1 + 3 + 4 |
| **C: Architecture Review Pack** | linguistic-boundary-verifier, test-strategy-reviewer | `reviews-*` | Wave 2 |
| **D: Stakeholder Communication Pack** | metaprogram-classifier + existing grill-me | skill-only | Wave 2 |
| **E: Excluded** | research-gatherer, aj-kg-query, incident-diagnosis-review | — | Defer/exclude |

---

## 5. Phased Adoption Roadmap (Synthesized)

| Wave | Skills | Effort | Rationale |
|------|--------|--------|-----------|
| **Wave 1** | requirements-critic, transcript-critic, problem-classifier | 3× S (<1 day each) | Natychmiastowa wartość; zero deps; wypełnia największe luki |
| **Wave 2** | test-strategy-reviewer, linguistic-boundary-verifier, metaprogram-classifier | 2× S + 1× S | Review + komunikacja; uzupełnia istniejące `reviews-*` i `grill-me` |
| **Wave 3** | context-distiller, aggregate-designer, accounting-archetype-mapper, pricing-archetype-mapper | 4× S | Rdzeń DDD pack; zależność od Wave 1 (problem-classifier) |
| **Wave 4** | archetype-scanner | 1× M/L | Wymaga mapperów + generalizacji registry subagentów |
| **Defer** | research-gatherer | — | `--gather-only` w `maister:research` zamiast nowego skilla |
| **Exclude** | aj-kg-query, incident-diagnosis-review | — | MCP/ATIF lock-in |

---

## 6. Integration Notes — Top 5 Candidates

| # | Skill | Directory | Command | Key adaptations |
|---|-------|-----------|---------|-----------------|
| 1 | requirements-critic | `skills/requirements-critic/` | `quick-requirements-critic` | Strip `maister:` prefix; `disable-model-invocation: true`; PL/EN retained |
| 2 | transcript-critic | `skills/transcript-critic/` | `quick-transcript-critic` | Fix stale frontmatter; EN-native |
| 3 | problem-classifier | `skills/problem-classifier/` | `quick-problem-classifier` | Strip prefix; EN description parity; chain ref to aggregate-designer |
| 4 | test-strategy-reviewer | `skills/test-strategy-reviewer/` | `reviews-test-strategy` | `disable-model-invocation: true`; position vs reviews-code |
| 5 | linguistic-boundary-verifier | `skills/linguistic-boundary-verifier/` | `reviews-linguistic-boundaries` | Document `language.md` convention; M effort |

**Per-skill porting checklist (all):** SKILL.md → optional command → CLAUDE.md entry → `make build && make validate` → Kiro Makefile count update.

---

## 7. Open Questions & Confidence Summary

| # | Question | Finding | Confidence |
|---|----------|---------|------------|
| 1 | transcript-critic vs requirements-critic duplicate? | **No** — metadata mismatch only | **High** |
| 2 | DDD skills standalone without AJ course? | **Yes** — self-contained SKILL.md | **High** |
| 3 | research-gatherer adopt? | **No** — overlap; embed in research | **High** |
| 4 | archetype-scanner portability? | Needs registry + Maister agents | **Medium** |
| 5 | archetype-scanner party mapper missing? | Output template refs party; registry has 2 | **Medium** |
| 6 | aggregate-designer cross-ref typo? | References `problem-class-classifier` vs `problem-classifier` | **High** |
| 7 | Skill-like artifacts beyond 14? | Not verified in this research | **Low** |
| 8 | `disable-model-invocation` for critique skills? | Recommended for requirements/transcript; optional for classifiers | **Medium** |
| 9 | New `modeling-*` command category? | Compatible with flat layout standard | **High** |
| 10 | grill-me/thermos undocumented in CLAUDE.md? | Gap in current Maister docs; backfill on adoption epic | **High** |

---

## 8. Evidence Cross-Reference Index

| Finding | Primary source | Corroborated by |
|---------|---------------|-----------------|
| 14-skill complete inventory | external-skills-inventory.md | research-plan.md, sources.md |
| 18-skill Maister baseline | maister-skills-baseline.md | plugin-standards-porting.md |
| Adoption scoring tiers | comparative-adoption-matrix.md | external-skills-inventory.md § Preliminary Fit |
| Port conventions | plugin-standards-porting.md | maister-skills-baseline.md § grill-me/thermos |
| Bundle definitions | comparative-adoption-matrix.md § Bundles | synthesis skill chains (§3) |
| Exclusion rationale | comparative-adoption-matrix.md | research-brief.md § Excluded |

---

## 9. Success Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Complete inventory (14 skills, 1 paragraph each) | ✅ See research-report.md §2 |
| 2 | Taxonomy with every skill assigned | ✅ 7 categories, 14/14 |
| 3 | Gap analysis vs Maister | ✅ Matrix in research-report.md §3 |
| 4 | Ranked recommendations (high/medium/low/not) | ✅ All 14 scored |
| 5 | Integration notes for top candidates | ✅ Top 5 + bundles |

**Overall research confidence:** **High** — four independent gatherers converge on tier assignments, gap clusters, and exclusion decisions with cited SKILL.md evidence.
