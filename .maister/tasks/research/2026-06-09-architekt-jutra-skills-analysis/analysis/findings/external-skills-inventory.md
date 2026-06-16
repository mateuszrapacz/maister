# External Skills Inventory: Architekt Jutra Code

**Gatherer category:** `external-skills-repo`  
**Source root:** `/Users/mrapacz/Projects/architekt-jutra-code`  
**Gathered:** 2026-06-09  
**Skills analyzed:** 14 (complete inventory per `planning/sources.md`)

---

## Executive Summary

All 14 `SKILL.md` files were read in full. Total corpus: **5,039 lines**. Skills span week7–week10 demos, `.claude/skills/`, and `tools/kg-incidents/`. Naming is inconsistent: 6 skills use `maister:` prefix in frontmatter `name`, 8 use plain kebab-case.

**Critical duplicate-detection finding:** `transcript-critic` and `requirements-critic` share **identical frontmatter descriptions** (both claim “4 checks” for requirements critique), but their **bodies implement entirely different workflows**. They are **not duplicates** — they are **metadata mismatches**. `requirements-critic` is the canonical requirements skill; `transcript-critic` is a meeting-transcript decision-process critique with 7 checks and no `AskUserQuestion` usage.

---

## Master Inventory Table

| # | Path | Frontmatter `name` | Lines | Language | Taxonomy | Invocation |
|---|------|-------------------|-------|----------|----------|------------|
| 1 | `week8/1/transcript-critic/SKILL.md` | `transcript-critic` | 213 | EN | Requirements & critique | Explicit-only (description) |
| 2 | `week8/2/requirements-critic/SKILL.md` | `maister:requirements-critic` | 261 | Mixed PL/EN | Requirements & critique | Explicit-only (body guard) |
| 3 | `week8/3/problem-classifier/SKILL.md` | `maister:problem-classifier` | 487 | Mixed PL/EN | Domain modeling — classification | Trigger phrases + chains to aggregate-designer |
| 4 | `week8/4/metaprogram-classifier/SKILL.md` | `maister:metaprogram-classifier` | 472 | Mixed PL/EN | Domain modeling — classification* | Trigger phrases |
| 5 | `week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md` | `maister:aggregate-designer` | 540 | Mixed PL/EN | Domain modeling — transformation | Trigger phrases; multi-phase wizard |
| 6 | `week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md` | `pricing-archetype-mapper` | 591 | Mixed PL/EN | Domain modeling — transformation | On-demand; fit test gate |
| 7 | `week7/5-znanewzorce-demo/archetype-scanner/SKILL.md` | `archetype-scanner` | 237 | EN | Domain modeling — classification | Parallel subagent orchestrator |
| 8 | `week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md` | `accounting-archetype-mapper` | 547 | Mixed PL/EN | Domain modeling — transformation | On-demand; fit test gate |
| 9 | `week7/4-uogolnienie-demo/context-distiller/SKILL.md` | `maister:context-distiller` | 483 | Mixed PL/EN | Domain modeling — transformation | On-demand; fit test gate |
| 10 | `week7/3-research-gatherer-demo/.../research-gatherer/SKILL.md` | `research-gatherer` | 480 | EN | Research & gathering | Full orchestrator (state + task dir) |
| 11 | `week10/test-strategy-reviewer/SKILL.md` | `maister:test-strategy-reviewer` | 196 | EN | Review & verification | Explicit trigger phrases |
| 12 | `week10/linguistic-boundary-verifier/SKILL.md` | `linguistic-boundary-verifier` | 334 | EN | Architecture & boundaries | On-demand; `--pr` mode |
| 13 | `tools/kg-incidents/.../incident-diagnosis-review/SKILL.md` | `incident-diagnosis-review` | 61 | EN | Review & verification | Evaluator (ATIF + workspace) |
| 14 | `.claude/skills/aj-kg-query/SKILL.md` | `aj-kg-query` | 137 | EN | Platform-specific | MCP-driven query skill |

\* *`metaprogram-classifier` is communication/NLP-focused; placed under “Domain modeling — classification” per research-plan hypothesis, but functionally aligns with stakeholder communication more than DDD modeling.*

---

## Naming & Frontmatter Patterns

| Pattern | Skills | Notes |
|---------|--------|-------|
| `maister:` prefix in `name` | requirements-critic, problem-classifier, metaprogram-classifier, aggregate-designer, context-distiller, test-strategy-reviewer | AJ repo uses Maister-style naming outside Maister plugin |
| Plain kebab-case `name` | transcript-critic, pricing-archetype-mapper, archetype-scanner, accounting-archetype-mapper, research-gatherer, linguistic-boundary-verifier, incident-diagnosis-review, aj-kg-query | No prefix |
| `disable-model-invocation` | **None** | No AJ skill uses this frontmatter flag |
| `argument-hint` | All 14 | Consistent thin-command hint pattern |
| `references/` sibling dir | research-gatherer, aj-kg-query | See References section |

---

## Transcript-Critic vs Requirements-Critic Relationship

### Shared frontmatter (misleading)

Both skills declare:

```yaml
description: Critiques requirements and interactively rebuilds them. Applies 4 checks — problem-vs-solution framing, observable behavior vs CRUD status (interactively reformulates into proper user stories), extensible signal map of hidden domain decisions, and rigid quantifier probing. Invoked ONLY on explicit request.
argument-hint: "[requirements text, ticket, or spec to critique]"
```

### Actual body content (different skills)

| Dimension | `transcript-critic` | `requirements-critic` |
|-----------|---------------------|----------------------|
| **Primary input** | Meeting transcripts | Requirements text, tickets, specs |
| **Checks** | 7 checks: fact/opinion/hearsay, consensus audit, marginalized topics, hidden dependencies, scope drift, severity mismatch, authority dynamics | 4 checks: problem vs solution, CRUD vs observable behavior, signal map, quantifier probe |
| **Output** | Transcript critique report with diagnostic questions for next meeting | Per-requirement issue list + interactive reformulation |
| **Interactive gates** | None (`AskUserQuestion` not used) | Heavy `AskUserQuestion` for probing and reformulation |
| **Invocation guard** | Description only | Explicit body guard with trigger phrases |
| **Language** | English throughout | Mixed PL/EN (probes and reformulation in Polish) |

### Conclusion

- **Not duplicates.** `transcript-critic` frontmatter appears **copied/stale** — body implements meeting decision-process critique, not requirements critique.
- **Canonical requirements skill:** `week8/2/requirements-critic/SKILL.md` (`maister:requirements-critic`).
- **Maister adoption implication:** Adopt `requirements-critic` only; either fix or exclude `transcript-critic` unless meeting-transcript critique is desired as a separate skill with corrected frontmatter.

---

## Per-Skill Detailed Inventory

### 1. transcript-critic

| Field | Value |
|-------|-------|
| **Path** | `week8/1/transcript-critic/SKILL.md` |
| **Name** | `transcript-critic` |
| **Description** | *(Shared with requirements-critic — see mismatch note above)* |
| **Purpose** | Surfaces hidden decision-making problems in meeting transcripts: false consensus, opinion-as-fact escalation, marginalized voices, hidden dependencies, scope drift, severity mismatches, and authority dynamics. Produces a structured critique with evidence quotes and diagnostic questions — not a summary. |
| **Workflow summary** | (1) Read transcript, inventory participants/topics/decisions → (2) Run 7 independent checks → (3) Cross-reference findings across checks → (4) Generate specific diagnostic questions → (5) Produce markdown report (metadata, critical findings, consensus audit, deferred topics, questions). |
| **Invocation model** | Explicit-only via description (“Invoked ONLY on explicit request”). No body-level guard or trigger phrase list. |
| **Dependencies** | **AskQuestion/AskUserQuestion:** None. **Subagents:** None. **MCP:** None. **References:** None. |
| **Line count** | 213 |
| **Language** | EN |
| **Category** | Requirements & critique *(metadata says requirements; body is meeting/transcript critique)* |

---

### 2. requirements-critic

| Field | Value |
|-------|-------|
| **Path** | `week8/2/requirements-critic/SKILL.md` |
| **Name** | `maister:requirements-critic` |
| **Description** | Critiques requirements interactively; 4 checks; explicit-only invocation. |
| **Purpose** | Interactive requirements quality review. Flags problem-vs-solution framing, CRUD disguised as domain logic, hidden decisions via extensible signal map, and rigid quantifiers. When Check 2 triggers, interactively rebuilds requirements with the user into observable-behavior form. |
| **Workflow summary** | Acquire input (arg, conversation scan, or ask user) → Apply 4 checks per requirement → Check 2: probe via `AskUserQuestion`, draft reformulation, iterate until accepted → Check 3: signal-map clusters fire `AskUserQuestion` → Check 4: quantifier boundary scenarios → Output per-requirement issues + summary stats. |
| **Invocation model** | **Strong explicit guard** in body: only on “criticize”, “critique”, “review this ticket”, etc. Must NOT invoke when user is writing/describing requirements. |
| **Dependencies** | **AskUserQuestion:** Yes (Check 2 reformulation, Check 3 clusters). **Subagents:** None. **MCP:** None. **References:** None (inline signal map). |
| **Line count** | 261 |
| **Language** | Mixed PL/EN (probes, reformulation templates, examples in Polish; structure in English) |
| **Category** | Requirements & critique |

---

### 3. problem-classifier

| Field | Value |
|-------|-------|
| **Path** | `week8/3/problem-classifier/SKILL.md` |
| **Name** | `maister:problem-classifier` |
| **Description** | Classify requirements into 4 modeling problem classes (CRUD, T&P, Integration, Resource Contention); not an archetype mapper. |
| **Purpose** | Determines which of four DDD-style problem classes best fits a business requirement, asks discriminating questions to resolve ambiguity, suggests implementation approach, and optionally decomposes composite requirements. Offers handoff to `aggregate-designer` when RC is identified. |
| **Workflow summary** | Step 0: input acquisition → Step 1: silent signal scan (text + UI mockup tables) → Step 2: targeted `AskUserQuestion` probes (up to 4/call) → Step 3: classification with confidence + evidence → Step 4: structured markdown output (+ decomposition diagram if composite) → Optional: offer aggregate-designer wizard. |
| **Invocation model** | Trigger phrases in description (“jaka klasa problemu”, “problem class”, etc.). Cross-references archetype mappers for different intent. |
| **Dependencies** | **AskUserQuestion:** Yes (extensive probe library). **Subagents:** None (invokes `maister:aggregate-designer` skill by reference). **MCP:** None. **References:** None. |
| **Line count** | 487 |
| **Language** | Mixed PL/EN |
| **Category** | Domain modeling — classification |

---

### 4. metaprogram-classifier

| Field | Value |
|-------|-------|
| **Path** | `week8/4/metaprogram-classifier/SKILL.md` |
| **Name** | `maister:metaprogram-classifier` |
| **Description** | Recognize/classify 7 NLP metaprograms; suggest communication strategies. |
| **Purpose** | Analyzes utterances, emails, or described behavior to identify active NLP metaprograms (similarities/differences, detail/big-picture, internal/external reference, away-from/toward, reactive/proactive, necessity/possibility, self/others). Produces context-qualified communication strategies — explicitly not personality typing or manipulation. |
| **Workflow summary** | Step 0: input acquisition → Step 1: context identification (silent) → Step 2: signal scan table for all 7 MPs → Step 3: compound pattern detection → Step 4: communication strategy generation → Step 5: Polish-titled markdown output with strategies and opening phrase templates. |
| **Invocation model** | Trigger phrases (“metaprogram”, “jak rozmawiać z tą osobą”, etc.). |
| **Dependencies** | **AskUserQuestion:** Not required in workflow (analysis is direct). **Subagents:** None. **MCP:** None. **References:** None. |
| **Line count** | 472 |
| **Language** | Mixed PL/EN (many PL linguistic marker examples; output template in Polish) |
| **Category** | Domain modeling — classification *(functionally: communication / stakeholder interaction)* |

---

### 5. aggregate-designer

| Field | Value |
|-------|-------|
| **Path** | `week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md` |
| **Name** | `maister:aggregate-designer` |
| **Description** | Interactive wizard for designing consistency units (aggregates). |
| **Purpose** | Guides designers step-by-step through aggregate boundary design: fit check, command extraction, pairwise conflict matrix, business process sequencing, volume/frequency probes, data scope, inclusion/exclusion decisions, locking strategy, and final ASCII boundary diagram + detailed model. |
| **Workflow summary** | Phase 0: input → Phase 1: RC fit check (may redirect to problem-classifier) → Phase 2: extract/confirm commands → Phase 3: conflict matrix (+ time-range trap handling) → Phase 4: process sequencing probe → Phase 5: volume/partition probes → Phase 6: data scope → Phase 7: boundary inclusions/exclusions → Phase 8: locking strategy → Phase 9: final model with diagram → Optional A/B/C: persistence, locking mechanics, testing. |
| **Invocation model** | Trigger phrases (“projektowanie agregatów”, “consistency unit”, etc.). Chained from problem-classifier. Multi-phase wizard with confirmation gates at each phase. |
| **Dependencies** | **AskUserQuestion:** Yes (extensive — every phase). **Subagents:** None. **MCP:** None. **References:** None. Cross-ref: `maister:problem-class-classifier`. |
| **Line count** | 540 |
| **Language** | Mixed PL/EN |
| **Category** | Domain modeling — transformation |

---

### 6. pricing-archetype-mapper

| Field | Value |
|-------|-------|
| **Path** | `week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md` |
| **Name** | `pricing-archetype-mapper` |
| **Description** | Transform domain requirements into Pricing Archetype model (complexity levels 1–9). |
| **Purpose** | Maps domains where computed prices/rates depend on context into a structured pricing model: Calculator layer, Component tree, Validity versioning, Applicability, Parameters, product-pricing mapping. Fit test rejects accounting/state-machine domains. |
| **Workflow summary** | Fit test → Step 0: requirements → Step 1: complexity level (1–9) → Step 2: clarifying `AskUserQuestion` (standard + gap-triggered) → Steps 3–9: concept mapping, calculators, component tree, validity, applicability, parameters, product mapping → Step 9.5: decision sanity check → Full markdown model output. |
| **Invocation model** | On-demand when pricing/computed-value domain detected. Hard stop if fit test fails. |
| **Dependencies** | **AskUserQuestion:** Yes (Step 2, sanity check gaps). **Subagents:** None. **MCP:** None. **References:** None. Cross-ref: `accounting-archetype-mapper` for misfit redirect. |
| **Line count** | 591 |
| **Language** | Mixed PL/EN |
| **Category** | Domain modeling — transformation |

---

### 7. archetype-scanner

| Field | Value |
|-------|-------|
| **Path** | `week7/5-znanewzorce-demo/archetype-scanner/SKILL.md` |
| **Name** | `archetype-scanner` |
| **Description** | Scan requirements against all known archetypes in parallel; produces `fit/` directory. |
| **Purpose** | Orchestrates parallel archetype fit assessment. Each registry archetype runs independently (fit test + full mapping if fit). Merge agent consolidates into summary with concept distribution, overlaps, and gaps. |
| **Workflow summary** | Step 0: get requirements → Step 1: create `fit/` dir → Step 2: launch one Agent per registry entry in **single parallel message** → Step 3: collect results → Step 4: launch merge/summary Agent → Step 5: present results. |
| **Invocation model** | Standalone or from development-orchestrator/workshops. Not explicit-only. |
| **Dependencies** | **AskUserQuestion:** Delegated to sub-agents (mapper skills). **Subagents:** Yes — `subagent_type` per registry skill (`accounting-archetype-mapper`, `pricing-archetype-mapper`); merge via general-purpose Agent. **MCP:** None. **Registry:** Extensible table (party archetype mentioned in output template but not in registry). **Output:** `fit/[id].md`, `fit/summary.md`. |
| **Line count** | 237 |
| **Language** | EN |
| **Category** | Domain modeling — classification |

---

### 8. accounting-archetype-mapper

| Field | Value |
|-------|-------|
| **Path** | `week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md` |
| **Name** | `accounting-archetype-mapper` |
| **Description** | Transform domain requirements into accounting-style value flow model. |
| **Purpose** | Maps value-tracking domains (money, points, quota, credits, etc.) into ledger model: accounts, transactions, double-entry, reversals, validity, allocation strategy. Fit test rejects state machines and relationship graphs. |
| **Workflow summary** | Fit test → Step 0: requirements → Step 1: identify value → Step 2: clarifying questions → Steps 3–9: concept mapping, accounts, transactions, entries, reversals, validity, allocation → Step 9.5: sanity check → Full markdown model. |
| **Invocation model** | On-demand; hard stop on fit failure. Invoked directly or via archetype-scanner subagent. |
| **Dependencies** | **AskUserQuestion:** Yes (Step 2, material assumption gaps). **Subagents:** None (is subagent target). **MCP:** None. **References:** None. |
| **Line count** | 547 |
| **Language** | Mixed PL/EN |
| **Category** | Domain modeling — transformation |

---

### 9. context-distiller

| Field | Value |
|-------|-------|
| **Path** | `week7/4-uogolnienie-demo/context-distiller/SKILL.md` |
| **Name** | `maister:context-distiller` |
| **Description** | Distill bounded contexts via bidirectional linguistic analysis (generalization + ambiguity). |
| **Purpose** | Finds safe generalizations across domain concepts and context split points where same words mean different things. Two modes: full domain distillation or single-concept probe. Produces distilled context map with generalized/specific contexts and integration notes. |
| **Workflow summary** | Fit test → Step 0: input (+ mode detect) → Step 1: noun/verb inventory → Step 2: bidirectional analysis (ambiguity A, generalization B, speculative expansion C) → Step 3: `AskUserQuestion` on unresolved items → Step 4: context map → Step 5: decision sanity check → Markdown output. |
| **Invocation model** | On-demand when linguistic ambiguity or generalization opportunities exist. |
| **Dependencies** | **AskUserQuestion:** Yes (Step 3, boundary decisions). **Subagents:** None. Cross-refs: archetype mappers, aggregate-designer in examples. **MCP:** None. **References:** None. |
| **Line count** | 483 |
| **Language** | Mixed PL/EN (example output heavily Polish) |
| **Category** | Domain modeling — transformation |

---

### 10. research-gatherer

| Field | Value |
|-------|-------|
| **Path** | `week7/3-research-gatherer-demo/research-gatherer-standalone/skills/research-gatherer/SKILL.md` |
| **Name** | `research-gatherer` |
| **Description** | Lightweight research: collect and cross-verify from multiple sources; no synthesis report. |
| **Purpose** | Orchestrates research gathering through planning, parallel information-gatherer subagents, merge, and cross-source verification. Stops before synthesis — produces raw findings corpus with declarative-conclusion tagging and actor maps. |
| **Workflow summary** | Init: load orchestrator-framework refs, create task dir + state → Phase 1: brief + classify type → Pause → Phase 2A: `research-planner` subagent → Phase 2B: parallel `information-gatherer-lite` (cap 8) → Pause → Phase 3: merge (`00-summary`, `99-verification`, `98-rejected`, optional `97-actor-map`). |
| **Invocation model** | Command: `/research-gather [question] [--yolo] [--type=TYPE]`. Full orchestrator with `orchestrator-state.yml`, task directory, interactive/YOLO modes. **Not** grill-me-style on-demand utility. |
| **Dependencies** | **AskUserQuestion:** Yes (interactive pauses). **Subagents:** `research-planner`, `information-gatherer-lite` (via Task tool). **MCP:** None in skill (gatherers may use WebSearch). **References:** `references/research-methodologies.md`, `../orchestrator-framework/references/orchestrator-patterns.md`. **State:** YAML orchestrator state, TaskCreate/TaskUpdate. |
| **Line count** | 480 |
| **Language** | EN |
| **Category** | Research & gathering |

---

### 11. test-strategy-reviewer

| Field | Value |
|-------|-------|
| **Path** | `week10/test-strategy-reviewer/SKILL.md` |
| **Name** | `maister:test-strategy-reviewer` |
| **Description** | Reviews test strategy vs problem class; detects strategy mismatches. |
| **Purpose** | Read-only review: classifies production code by problem class (Transformation, Stateful Object, Integration), compares test strategy (output/state/interaction-based) against recommended strategy, reports mismatches with concrete suggestions. Does not review naming/coverage. |
| **Workflow summary** | Acquire test + production code paths → Step 1: classify production code → **confirm with user via AskUserQuestion** → Step 2: identify current test strategies → Step 3: compare vs recommendations (with exception probes) → Step 4: per-class report with OK/MISMATCH verdict. |
| **Invocation model** | Explicit trigger phrases (“review my tests”, “test strategy”, etc.). |
| **Dependencies** | **AskUserQuestion:** Yes (classification confirmation, exception probes, test-level questions). **Subagents:** None. **MCP:** None. **References:** None. Aligns with problem-class taxonomy (not formal skill chain). |
| **Line count** | 196 |
| **Language** | EN |
| **Category** | Review & verification |

---

### 12. linguistic-boundary-verifier

| Field | Value |
|-------|-------|
| **Path** | `week10/linguistic-boundary-verifier/SKILL.md` |
| **Name** | `linguistic-boundary-verifier` |
| **Description** | Verifies linguistic boundaries between bounded contexts via `language.md` files; read-only. |
| **Purpose** | Detects language leakage across module boundaries (strings, events, API calls). Proposes type-specific fixes (generalization, ACL, dependency inversion). Two modes: cross-module boundary check or single-module `--pr` new-concept check. |
| **Workflow summary** | Phase 1: parse `language.md`, build vocabulary → Phase 2: grep violations, classify, ASCII diagram → Pause → Phase 3: propose fixes with BEFORE/AFTER diagrams → Pause → Phase 4: incorporate feedback → Phase 5: `linguistic-boundary-report.md`. PR mode: diff PR, classify new terms vs module role sensitivity. |
| **Invocation model** | On-demand; requires existing `language.md` per module. `--pr` flag for single-module checks. |
| **Dependencies** | **AskUserQuestion:** Implicit at Pause markers (user validation). **Subagents:** None. **MCP:** None. **Prerequisites:** `language.md` files, codebase Read/Grep. Cross-ref: `context-distiller` for boundary discovery (this skill verifies, not discovers). |
| **Line count** | 334 |
| **Language** | EN (DDD terms optional; supports alternate relationship nomenclature) |
| **Category** | Architecture & boundaries |

---

### 13. incident-diagnosis-review

| Field | Value |
|-------|-------|
| **Path** | `tools/kg-incidents/evaluator_skills/incident-diagnosis-review/SKILL.md` |
| **Name** | `incident-diagnosis-review` |
| **Description** | Review AI agent incident diagnosis for precision, efficiency, ownership awareness. |
| **Purpose** | Evaluator rubric for scoring AI agents on production incident response. Uses ATIF trajectory as primary evidence for root-cause accuracy and diagnostic efficiency; workspace artifacts for fix scoping and escalation. Strict evidence-based scoring against `ground_truth_decisions.json`. |
| **Workflow summary** | (1) Analyze `agent/trajectory.json` — tool call categorization, thrashing, hypothesis transitions → (2) Review workspace artifacts, commits, reports → (3) Map to rubric dimensions → (4) Calibrate against ground truth → (5) Return JSON scoring block. |
| **Invocation model** | Evaluator skill within AJ kg-incidents tooling — not user-facing SDLC utility. |
| **Dependencies** | **AskUserQuestion:** None. **Subagents:** None. **External artifacts:** ATIF trajectory, workspace git diff, `ground_truth_decisions.json`, `/tmp/mcp-state/feature_gates.json`. **MCP:** Incident simulation context (implicit). |
| **Line count** | 61 |
| **Language** | EN |
| **Category** | Review & verification *(AJ-specific evaluator)* |

---

### 14. aj-kg-query

| Field | Value |
|-------|-------|
| **Path** | `.claude/skills/aj-kg-query/SKILL.md` |
| **Name** | `aj-kg-query` |
| **Description** | Answer AJ platform structure questions via Neo4j knowledge graph MCP. |
| **Purpose** | Query AJ platform KG (modules, entities, endpoints, plugins, extension points, features) instead of grepping codebase. Provides Cypher recipe patterns for common structural questions. |
| **Workflow summary** | Load MCP tool schemas → Pick minimal Cypher query → Run via `mcp__neo4j-aj-kb__*` → Present as markdown table → Cross-check filesystem if user will act on result (seed may lag working tree). |
| **Invocation model** | Auto-triggered by “what/which/how many/list/show me” platform structure questions per description. |
| **Dependencies** | **MCP:** `neo4j-aj-kb` server (`aj-kb-get_neo4j_schema`, `aj-kb-read_neo4j_cypher`). **References:** `references/labels.md`, `tools/seed/aj-kg-ontology.cypher`, `tools/questions.md`. **AskUserQuestion/Subagents:** None. |
| **Line count** | 137 |
| **Language** | EN |
| **Category** | Platform-specific |

---

## Taxonomy Summary (Research Plan Framework)

| Category | Skills | Count |
|----------|--------|-------|
| **Requirements & critique** | transcript-critic, requirements-critic | 2 |
| **Domain modeling — classification** | problem-classifier, metaprogram-classifier, archetype-scanner | 3 |
| **Domain modeling — transformation** | aggregate-designer, pricing-archetype-mapper, accounting-archetype-mapper, context-distiller | 4 |
| **Architecture & boundaries** | linguistic-boundary-verifier | 1 |
| **Review & verification** | test-strategy-reviewer, incident-diagnosis-review | 2 |
| **Research & gathering** | research-gatherer | 1 |
| **Platform-specific** | aj-kg-query | 1 |

**Total:** 14 ✓

---

## Invocation Model Taxonomy

| Model | Skills | Maister analog |
|-------|--------|----------------|
| **Explicit-only on-demand** | requirements-critic, transcript-critic (weak), test-strategy-reviewer | `grill-me`, `thermos` pattern |
| **Trigger-phrase on-demand** | problem-classifier, metaprogram-classifier, aggregate-designer, archetype mappers, context-distiller | Partial `grill-me` |
| **Interactive multi-phase wizard** | aggregate-designer, problem-classifier (partial) | Beyond simple utility |
| **Parallel subagent composite** | archetype-scanner | `thermos` pattern |
| **Full orchestrator + state** | research-gatherer | `maister:research` |
| **Read-only review** | test-strategy-reviewer, linguistic-boundary-verifier, incident-diagnosis-review | `thermo-nuclear-*`, review commands |
| **MCP platform query** | aj-kg-query | No Maister equivalent (Neo4j) |

---

## Dependency Matrix

| Skill | AskUserQuestion | Subagents (Task) | MCP | references/ |
|-------|-----------------|------------------|-----|-------------|
| transcript-critic | — | — | — | — |
| requirements-critic | ✓ | — | — | — |
| problem-classifier | ✓ | — (skill chain) | — | — |
| metaprogram-classifier | — | — | — | — |
| aggregate-designer | ✓ | — | — | — |
| pricing-archetype-mapper | ✓ | — | — | — |
| archetype-scanner | (delegated) | ✓ registry mappers + merge agent | — | — |
| accounting-archetype-mapper | ✓ | — | — | — |
| context-distiller | ✓ | — | — | — |
| research-gatherer | ✓ | ✓ planner + gatherer-lite | — (gatherers may web) | ✓ methodologies + orchestrator patterns |
| test-strategy-reviewer | ✓ | — | — | — |
| linguistic-boundary-verifier | (pause gates) | — | — | — (requires language.md) |
| incident-diagnosis-review | — | — | ATIF/workspace | — |
| aj-kg-query | — | — | ✓ neo4j-aj-kb | ✓ labels.md |

**Note:** All AJ skills use `AskUserQuestion` in body text. Maister/Cursor equivalent is `AskQuestion`. Portability requires find-replace or dual naming in adopted skills.

---

## Skill Chains & Bundles

```
problem-classifier ──(RC detected)──> aggregate-designer
context-distiller ──(recommend)──> accounting-archetype-mapper | aggregate-designer
archetype-scanner ──(parallel)──> accounting-archetype-mapper | pricing-archetype-mapper
linguistic-boundary-verifier <──(verify boundaries found by)── context-distiller
test-strategy-reviewer ←──(aligned taxonomy)── problem-classifier
requirements-critic ←──(Check 2 overlap)── problem-classifier (CRUD vs RC)
```

**Domain modeling cluster (week7/week8):** 8 skills that form a coherent DDD workshop toolkit — classifiable as a bundle for phased Maister adoption (scanner → mappers → distiller → aggregate designer).

---

## References & Supporting Artifacts

| Skill | references/ path | Purpose |
|-------|------------------|---------|
| research-gatherer | `references/research-methodologies.md` | Phase 2 methodology selection |
| research-gatherer | `../orchestrator-framework/references/orchestrator-patterns.md` | Delegation, state schema (required read at init) |
| aj-kg-query | `references/labels.md` | KG ontology labels mirror |

No other skills in the 14-file inventory ship sibling `references/` directories.

---

## Complexity Tiers (by line count)

| Tier | Lines | Skills |
|------|-------|--------|
| **Minimal** | <150 | incident-diagnosis-review (61), aj-kg-query (137) |
| **Compact** | 150–250 | transcript-critic (213), archetype-scanner (237), requirements-critic (261) |
| **Medium** | 250–350 | test-strategy-reviewer (196), linguistic-boundary-verifier (334) |
| **Large** | 450–550 | problem-classifier (487), metaprogram-classifier (472), context-distiller (483), research-gatherer (480), aggregate-designer (540), accounting-archetype-mapper (547) |
| **Very large** | 550+ | pricing-archetype-mapper (591) |

All skills are under the 1000-line Maister convention threshold.

---

## Gaps & Open Questions

| # | Question | Confidence |
|---|----------|------------|
| 1 | Is `transcript-critic` frontmatter a copy-paste error, or intentional alias marketing? Body contradicts description entirely. | **High** — body is transcript-focused |
| 2 | `archetype-scanner` registry lists 2 archetypes but output template references `party` — is party mapper planned/missing? | **Medium** |
| 3 | `aggregate-designer` references `maister:problem-class-classifier` but skill is named `maister:problem-classifier` — typo in cross-ref? | **High** — name mismatch in SKILL.md line 49 |
| 4 | Are there skill-like artifacts beyond 14 `SKILL.md` files (commands, agents)? Phase 1 sub-question — not verified in this gatherer scope. | **Low** — needs separate Glob |
| 5 | `context-distiller` line 73 has stray `a` character after "## Core Principles" — minor artifact quality issue. | **High** — observed in source |

---

## Preliminary Fit Notes (for comparative gatherer)

| Skill | Obvious Maister fit signal |
|-------|---------------------------|
| requirements-critic | **High** — explicit-only, minimal deps, matches grill-me/adoption hypothesis |
| problem-classifier | **High** — standalone, generic SDLC value |
| test-strategy-reviewer | **High** — read-only review, complements existing review commands |
| linguistic-boundary-verifier | **High** — unique gap in Maister; needs `language.md` convention |
| Domain modeling cluster | **Medium** — strong value, Polish-heavy, workshop context |
| research-gatherer | **Low** — overlaps `maister:research` orchestrator |
| aj-kg-query | **Not recommended** — Neo4j MCP, AJ platform lock-in |
| incident-diagnosis-review | **Not recommended** — ATIF evaluator, not generic SDLC |
| transcript-critic | **Defer** — fix metadata first; different skill than requirements-critic |

*Final adoption rankings owned by comparative-analysis gatherer.*

---

## Source Citations

All findings derived from full read of:

- `/Users/mrapacz/Projects/architekt-jutra-code/**/SKILL.md` (14 files)
- `/Users/mrapacz/Workspace/maister/.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/planning/research-plan.md` (taxonomy framework)
- `/Users/mrapacz/Workspace/maister/.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/planning/sources.md` (inventory manifest)
