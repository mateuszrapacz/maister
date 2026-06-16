# Decision Log: Architekt Jutra Skills Adoption into Maister Plugin

**Task:** `2026-06-09-architekt-jutra-skills-analysis`  
**Date:** 2026-06-09  
**Status:** All decisions Accepted (Phase 4 user convergence)

Decisions are recorded in MADR (Markdown Any Decision Record) format. Alternatives analyzed in `outputs/solution-exploration.md`.

---

## ADR-001: Individual Skills with Chain Sections, No Meta-Orchestrator

### Status
Accepted

### Context
AJ provides 11 adoptable skills ranging from single-shot critique (213 lines) to multi-phase DDD wizards (540+ lines) and parallel orchestration (`archetype-scanner`). Maister already has full SDLC orchestrators (`development`, `research`, `product-design`). Users need DDD and requirements utilities without a second workflow state machine. Research bundles A–D group skills conceptually but must not create invocation complexity.

### Decision Drivers
- Match existing on-demand pattern (`grill-me`, `thermos`)
- Avoid duplicate orchestrator maintenance
- Preserve independent skill versioning and testing
- Keep `SKILL.md` as single source of truth per `plugin-development.md`
- Enable incremental wave delivery

### Considered Options
1. **Individual skills only** — each skill standalone; bundles in CLAUDE.md only (1A)
2. **Bundle manifest docs** — individual skills + `references/bundle-*.md` documentation (1B)
3. **Meta-orchestrator** — `maister:ddd-modeling` runs classify → distill → map → scan phases (1C)
4. **Hybrid** — individual skills + "Recommended next steps" chain section in each SKILL.md (1D)

### Decision Outcome
Chosen option: **4 (Hybrid 1D)**, because it preserves skill independence while embedding chain discoverability at the point of use — matching AJ's existing cross-ref pattern without adding a meta-skill, state file, or new artifact type.

### Consequences

#### Good
- Each skill independently invocable, testable, and versionable
- Chain topology visible where users finish a skill
- No orchestrator state schema to maintain
- Aligns with research goal of standalone invocable utilities

#### Bad
- Chain logic distributed across multiple SKILL.md files; topology updates require touching several files
- No single "start DDD modeling" entry point (mitigated by CLAUDE.md bundle docs and `modeling-*` commands)

---

## ADR-002: Category-Aligned Command Taxonomy

### Status
Accepted

### Context
Maister has 8 commands today: `quick-*` (3), `reviews-*` (5), plus workflow orchestrators. `grill-me` and `thermos` have no commands — description-triggered only. AJ skills span critique, read-only audit, and DDD transformation. Users need discoverability in `/maister:` command lists without hiding specific rubrics behind consolidation gates.

### Decision Drivers
- Discoverability in plugin command index
- Mental model clarity (quick = interactive, reviews = read-only, modeling = DDD)
- Compliance with flat `commands/` layout per `build-pipeline.md`
- Scriptable invocation of specific rubrics

### Considered Options
1. **Skill-only** — no new commands; natural language / Skill tool only (2A)
2. **Category-aligned** — `quick-*`, `reviews-*`, `modeling-*` per skill category (2B)
3. **Consolidated** — 3 mega-commands with AskUserQuestion picker gates (2C)
4. **Reviews-only commands** — commands for read-only skills only; rest skill-only (2D)

### Decision Outcome
Chosen option: **2 (Category-aligned 2B)**, because it provides clear discoverability and maps skill intent to command prefix without adding picker friction. Ship commands per wave: 3 `quick-*` in Wave 1, `reviews-*` + `quick-metaprogram-classifier` in Wave 2, 5 `modeling-*` in Waves 3–4.

**Command naming nuance:** Mappers use shortened stems — `modeling-accounting-archetype`, `modeling-pricing-archetype` — with body text referencing full skill paths.

### Consequences

#### Good
- 12 new commands organized by user intent
- Thin wrappers preserve orchestration in SKILL.md
- `modeling-*` establishes precedent documented in `plugin-development.md`

#### Bad
- Command surface grows from 8 to ~20
- Some redundancy with skill description triggers
- New `modeling-*` prefix requires standards documentation update

---

## ADR-003: Strict Phased Delivery Waves

### Status
Accepted

### Context
11 skills span requirements critique (immediate value, zero deps) through DDD orchestration (registry + subagents, medium confidence). Big-bang delivery risks large PRs, blocks on archetype-scanner design, and delays high-value critique skills. Research estimates ~12–15 implementation days total.

### Decision Drivers
- Risk spreading across PRs
- Early user feedback on port pipeline and localization
- Wave 1 shippable in ~3 days with zero dependencies
- archetype-scanner blocked until mappers proven

### Considered Options
1. **Strict phased waves 1–4** — research roadmap order (3A)
2. **Wave 1 only + pause** — validate before continuing (3B)
3. **Big-bang DDD pack** — Waves 1+3+4 batched (3C)
4. **Parallel tracks** — multiple contributors on separate tracks (3D)

### Decision Outcome
Chosen option: **1 (Strict phased 3A)** with **optional 3B gate** after Wave 1, because it balances immediate value delivery with manageable PR size. Do not big-bang DDD (3C) unless archetype-scanner design (ADR-005) is pre-resolved.

| Wave | Skills |
|------|--------|
| 1 | requirements-critic, transcript-critic, problem-classifier |
| 2 | test-strategy-reviewer, linguistic-boundary-verifier, metaprogram-classifier |
| 3 | context-distiller, aggregate-designer, accounting-archetype-mapper, pricing-archetype-mapper |
| 4 | archetype-scanner |

### Consequences

#### Good
- Wave 1 delivers Bundle A + DDD classifier in ~3 days
- Each wave has clear acceptance criteria and validate gate
- archetype-scanner deferred until mapper rubrics stable

#### Bad
- Full DDD chain incomplete until Waves 3–4 (~11 days from start)
- Partial chain may frustrate power users between waves (mitigated by chain section docs)

---

## ADR-004: research --gather-only Flag Instead of New Skill

### Status
Accepted

### Context
`research-gatherer` scored Low (16/30) due to substantial overlap with `maister:research` Phase 1–2. Unique features — declarative conclusion tagging, actor-map, rejected-info audit trail — add value but stop before synthesis, matching a gather-only use case. A standalone skill would confuse users versus `/maister:research`.

### Decision Drivers
- Single research entry point
- Preserve orchestrator state model
- Avoid duplicate top-level skill discovery
- Cherry-pick valuable rubric fragments without full port

### Considered Options
1. **Do not port; ignore** — no changes to research (4A)
2. **Embed `--gather-only` in `maister:research`** — skip synthesis/brainstorm/design phases (4B)
3. **Internal engine skill** — `research-gatherer-lite`, `user-invocable: false` (4C)
4. **Standalone on-demand skill** — full AJ port (4D)

### Decision Outcome
Chosen option: **2 (Embed 4B)** as **separate epic E6 after Wave 1**, because it preserves a single research entry point while capturing gather-only value. Port actor-map and rejected-info patterns into Phase 1 references or `information-gatherer` agent. Reject standalone port (4D).

### Consequences

#### Good
- No new top-level skill to maintain
- Gather-only mode scriptable via existing command
- Unique AJ rubric fragments preserved selectively

#### Bad
- Touches core research orchestrator (higher regression risk)
- Phase-skip logic and flag docs needed across platform transforms
- Kiro/Cursor must handle new flag in command/skill invocation

---

## ADR-005: archetype-scanner Subagent Delegation with Registry

### Status
Accepted

### Context
`archetype-scanner` orchestrates parallel fit assessment per archetype registry entry. AJ uses hard-coded `subagent_type` values incompatible with Maister's agent naming. Maister has `thermos` parallel pattern and 26 existing subagents. Portability confidence is Medium; party mapper referenced in templates but absent from registry (2 mappers: accounting, pricing).

### Decision Drivers
- Clean parallel Task delegation
- Explicit tool whitelists per mapper
- Registry extensibility without SKILL.md bloat
- Align with thermo-nuclear subagent preload pattern

### Considered Options
1. **Inline registry in SKILL.md** — parallel Tasks with inline rubric instructions (5A)
2. **New subagents per mapper + merge agent + `references/archetype-registry.md`** (5B)
3. **Defer scanner entirely** — mappers standalone only (5C)
4. **Reuse thermos infrastructure** — extend for archetype fit (5D)

### Decision Outcome
Chosen option: **2 (Subagents + registry 5B)** in **Wave 4 (E5)**, because it provides production-quality delegation and maintainable registry separation. Create:

- `accounting-archetype-mapper-subagent.md`
- `pricing-archetype-mapper-subagent.md`
- `archetype-scanner-merge-subagent.md`
- `skills/archetype-scanner/references/archetype-registry.md`

**Fallback:** 5C (defer scanner) if agent architecture blocked. **Exclude** party mapper until AJ registry includes it.

### Consequences

#### Good
- Parallel execution matches AJ intent with Maister conventions
- Registry table extensible without rewriting scanner skill
- Mapper interactive wizards remain available standalone

#### Bad
- +3 agent files and build transform overhead
- Wave 4 blocked on E4 mapper validation
- Medium implementation effort (M–L)

---

## ADR-006: language.md Convention with Graceful Degradation

### Status
Accepted

### Context
`linguistic-boundary-verifier` requires per-module `language.md` describing bounded-context vocabulary. Maister has no such convention. Wave 2 ships this skill; undefined convention blocks full value but should not block skill delivery.

### Decision Drivers
- Enable full verifier value on DDD-aware projects
- Do not block Wave 2 skill shipment
- Position Maister as DDD-capable via standards
- Avoid init scope creep

### Considered Options
1. **Standard first** — publish `.maister/docs/standards/global/language-md-convention.md` before Wave 2 (6A)
2. **Graceful degradation** — skill runs without language.md, outputs adoption guidance (6B)
3. **Generator skill** — auto-draft language.md from code (6C)
4. **Embed in init** — auto-create stubs during `maister:init` (6D)

### Decision Outcome
Chosen option: **6A + 6B in parallel** — publish standard in **E2 (Wave 2 prep)** while shipping verifier with graceful degradation. **Defer 6C** (generator skill) to Wave 2.5 or separate research. **Defer 6D** as optional future `init` flag, not default.

### Consequences

#### Good
- Verifier educates teams even without convention adoption
- Standard enables INDEX.md discovery and standards-discover detection
- Wave 2 not blocked on generator skill

#### Bad
- Limited verifier value until teams adopt convention
- Upfront documentation effort before full skill utility
- Manual language.md creation burden on users

---

## ADR-007: Bilingual Skill Bodies with English Frontmatter

### Status
Accepted

### Context
AJ skills mix PL/EN: `requirements-critic` bilingual, `metaprogram-classifier` Polish marker examples, `transcript-critic` EN-native. Maister plugin docs are English-primary. Build pipeline has no locale transforms. Polish teams value AJ course parity; English-only rewrite loses pedagogical nuance.

### Decision Drivers
- Faithful port with minimal edit risk
- English discoverability in frontmatter descriptions
- Runtime language flexibility for interactive skills
- No new build infrastructure

### Considered Options
1. **Preserve bilingual bodies** — EN frontmatter, bodies as-is (7A)
2. **English-primary rewrite** — PL examples to `references/pl-examples.md` (7B)
3. **Split locale files** — `SKILL.pl.md` + build transform (7C)
4. **User language at invocation** — AskUserQuestion preference gate (7D)

### Decision Outcome
Chosen option: **7A + 7D** — preserve AJ bilingual bodies with English-primary frontmatter `description`. Add optional language preference gate at first step for interactive skills: `requirements-critic`, `problem-classifier`, `metaprogram-classifier`. Do not invest in 7C until build pipeline supports locale.

### Consequences

#### Good
- Low port effort; Polish pedagogical examples retained
- English discovery via frontmatter and CLAUDE.md
- Runtime output language matches user preference

#### Bad
- Mixed-language rubric for English-only users
- Longer token usage in bilingual skills
- Inconsistent UX without language gate on non-interactive skills

---

## ADR-008: Standalone First, Then Soft Workflow Suggestions

### Status
Accepted

### Context
Development orchestrator writes requirements and specs but has no critique pass. Product-design ingests transcripts without decision-process audit. Risk: critique skills auto-invoking during requirements writing adds noise and slows flow. Maister principle: commands/skills thin; orchestrators optional.

### Decision Drivers
- Prevent accidental critique during requirements drafting
- Zero orchestrator regression risk in Wave 1
- Discovery without behavior change in Wave 2+
- `disable-model-invocation` precedent from thermos

### Considered Options
1. **Standalone only** — no orchestrator changes (8A)
2. **Soft suggestions** — optional bullets in phase text (8B)
3. **Optional phase hooks** — `--requirements-critic` flags with state (8C)
4. **implementation-verifier extension** — auto test-strategy hook (8D)
5. **product-design hard integration** — auto transcript-critic gate (8E)

### Decision Outcome
Chosen option: **8A for Wave 1** with `disable-model-invocation: true` on `requirements-critic` and `transcript-critic`. **8B after Wave 1** — soft suggestions in `development` Phase 5 and `product-design` transcript phases. Optional **8E** for product-design transcript-critic mention only. **Defer 8C**. **8D** as optional reference mention for `test-strategy-reviewer` in implementation-verifier, not automatic invocation.

### Consequences

#### Good
- Wave 1 zero orchestrator touch; fastest adoption
- Explicit-only critique prevents workflow disruption
- Wave 2+ improves discoverability without auto-invocation

#### Bad
- Users may miss skills without reading suggestions
- Soft suggestions easy to ignore
- No integrated quality gates until future 8C (if ever)

---

## ADR-009: Exclude Platform-Locked AJ Skills

### Status
Accepted

### Context
Two of 14 AJ skills are tightly coupled to AJ platform infrastructure: `aj-kg-query` requires Neo4j MCP with AJ ontology; `incident-diagnosis-review` requires ATIF trajectory artifacts. Maister distributes to Claude Code, Cursor, and Kiro without Neo4j or ATIF infrastructure. Research scored both ≤14/30 (Not recommended).

### Decision Drivers
- Generic SDLC value across all Maister consumers
- No extra MCP dependencies in plugin distribution
- Avoid maintaining AJ-specific ontology and evaluator rubrics
- Research brief explicit exclusion

### Considered Options
1. **Port with MCP dependency** — ship Neo4j MCP config (rejected)
2. **Port with degraded mode** — stub KG query via codebase search (partial)
3. **Exclude entirely** — no artifacts in Maister plugin (chosen)
4. **Defer for future AJ platform integration** — not applicable to Maister marketplace

### Decision Outcome
Chosen option: **3 (Exclude entirely)** for both `aj-kg-query` and `incident-diagnosis-review`. Maister alternatives: `codebase-analyzer` / Grep for structural queries; `reviews-code`, thermo reviews, `implementation-verifier` for quality evaluation.

### Consequences

#### Good
- Zero infrastructure burden on plugin consumers
- Clear scope boundary for adoption epic
- No misleading half-ported skills

#### Bad
- Teams using AJ Neo4j KG lose that capability in Maister
- Incident AI evaluation rubric not available in generic distribution

---

## Decision Summary Table

| ADR | Title | Chosen alternative | Epic / Wave |
|-----|-------|-------------------|-------------|
| ADR-001 | Packaging | 1D — Individual + chain sections | All waves |
| ADR-002 | Commands | 2B — quick/reviews/modeling | E1, E3, E4, E5 |
| ADR-003 | Waves | 3A — Strict 1–4 | E1–E5 |
| ADR-004 | research-gatherer | 4B — --gather-only | E6 |
| ADR-005 | archetype-scanner | 5B — Subagents + registry | E5 (Wave 4) |
| ADR-006 | language.md | 6A + 6B | E2, E3 |
| ADR-007 | Localization | 7A + 7D | All port waves |
| ADR-008 | Workflow | 8A → 8B | E1, E3 |
| ADR-009 | Exclusions | Exclude 2 skills | N/A |

---

## Deferred Decisions (Not in Scope)

| Topic | Status | Notes |
|-------|--------|-------|
| Pause after Wave 1 validation | Optional | Product may gate E3 on E1 metrics |
| `language-md-generator` skill | Deferred | Wave 2.5 or separate research |
| Party archetype mapper | Deferred | Wait for AJ registry |
| Orchestrator phase flags (8C) | Deferred | Until proven skill demand |
| product-design hard integration (8E) | Optional | Soft mention sufficient for now |
| Locale build transforms (7C) | Deferred | No infrastructure today |

---

## ADR-008 Wave 1 Reconciliation Addendum (2026-06-16)

Epic E1 (`2026-06-16-aj-skills-wave1`) superseded the original ADR-008 timeline for Wave 1 only: both **8A** (explicit-only critics with `disable-model-invocation: true`) and **8B** (optional orchestrator soft suggestions) ship in Wave 1 as intentional scope. The user confirmed at the Phase 2 gate to **keep** existing bullets in `development/SKILL.md` (L251) and `product-design/SKILL.md` (L251) with explicit no-auto-invoke guards — no revert to strict 8A-only, no 8C phase hooks. Full evidence and verification checks: [`verification/adr-008-reconciliation.md`](../../verification/adr-008-reconciliation.md).

---

*Linked from: `outputs/high-level-design.md`*
