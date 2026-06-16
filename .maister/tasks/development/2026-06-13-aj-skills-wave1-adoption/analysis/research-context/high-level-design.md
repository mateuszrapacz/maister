# High-Level Design: Architekt Jutra Skills Adoption into Maister Plugin

**Task:** `2026-06-09-architekt-jutra-skills-analysis`  
**Date:** 2026-06-09  
**Status:** Accepted (Phase 4 convergence confirmed)  
**Inputs:** `outputs/research-report.md`, `analysis/synthesis.md`, `outputs/solution-exploration.md`

---

## Design Overview

Maister's SDLC orchestrators cover development, research, product design, and verification well, but lack **requirements critique**, **DDD modeling**, **bounded-context verification**, and **stakeholder communication analysis**. Architekt Jutra (AJ) provides 14 skills; **11 are adoptable** as on-demand utilities following the `grill-me` / `thermos` pattern.

**Chosen approach:** Port **11 individual skills** into `plugins/maister/` with **category-aligned commands** (`quick-*`, `reviews-*`, `modeling-*`), **strict phased waves 1–4**, and **"Recommended next steps"** chain sections in each SKILL.md — **no meta-orchestrator**. Critique skills ship with `disable-model-invocation: true`; interactive skills preserve bilingual bodies with English-primary frontmatter and optional language preference gates.

**Key decisions:**

- **Packaging (1D):** Standalone skills + in-skill chain sections; bundles A–D documented in CLAUDE.md only
- **Commands (2B):** `quick-*` for critique/classification, `reviews-*` for read-only audits, `modeling-*` for DDD pack (new category)
- **Waves (3A):** Strict delivery waves 1–4; optional validation pause after Wave 1
- **research-gatherer (4B):** `--gather-only` flag on `maister:research` — separate epic E6, not a new skill
- **archetype-scanner (5B):** Wave 4 with mapper subagents + merge agent + `references/archetype-registry.md`
- **language.md (6A+6B):** Standard in `.maister/docs/standards/` before Wave 2; verifier degrades gracefully without files
- **Localization (7A+7D):** Bilingual SKILL.md bodies; EN frontmatter; language ask on interactive skills
- **Workflow (8A+8B):** Wave 1 standalone + explicit-only; soft suggestions in `development` / `product-design` after Wave 1

---

## Architecture

### System Context (C4 Level 1)

Maister plugin consumers invoke AJ-derived skills alongside existing orchestrators. Source lives in `plugins/maister/`; platform variants are generated. AJ source repo is read-only reference during port — not a runtime dependency.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Maister Plugin Ecosystem                           │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐         explicit invoke          ┌─────────────────────────┐
  │ Developer /  │ ────────────────────────────────► │   Maister Plugin        │
  │ Architect    │   /maister:quick-*               │   (plugins/maister/)    │
  │              │   /maister:reviews-*             │                         │
  │              │   /maister:modeling-*            │   11 AJ-derived skills  │
  │              │   Skill tool (on-demand)         │   + existing 18 skills  │
  └──────────────┘                                  └───────────┬─────────────┘
       │                                                        │
       │ uses orchestrators                                     │ reads/writes
       ▼                                                        ▼
  ┌──────────────┐                                  ┌─────────────────────────┐
  │ /maister:    │  soft suggestions (Wave 2+)     │   Target Project        │
  │ development  │ ◄─────────────────────────────── │   .maister/docs/        │
  │ product-     │                                  │   language.md (conv.)   │
  │ design       │                                  │   source code           │
  │ research     │ ◄── E6: --gather-only            └─────────────────────────┘
  └──────────────┘

  ┌──────────────────────┐
  │ architekt-jutra-code │  read-only port reference (not distributed)
  │ (14 SKILL.md files)  │
  └──────────────────────┘

  ┌──────────────────────┐
  │ make build/validate  │  generates maister-cursor, maister-copilot, maister-kiro
  └──────────────────────┘
```

**External actors:**

| Actor | Role |
|-------|------|
| Developer / Architect | Invokes skills via commands, natural language, or Skill tool |
| Maister maintainers | Port AJ SKILL.md → `plugins/maister/`, run `make build && make validate` |
| CI pipeline | Gates merges on build + validate across all three platform variants |

**Excluded from ecosystem:** `aj-kg-query` (Neo4j MCP), `incident-diagnosis-review` (ATIF evaluator) — platform lock-in, not portable.

---

### Container Overview (C4 Level 2)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        plugins/maister/ (source of truth)                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ skills/         │  │ commands/       │  │ agents/                 │  │
│  │ (29 total after │  │ (flat layout)   │  │ (+3 Wave 4 subagents)   │  │
│  │  full adoption) │  │                 │  │                         │  │
│  │                 │  │ quick-*    (7)  │  │ accounting-archetype-   │  │
│  │ 11 AJ ports     │  │ reviews-*  (7)  │  │   mapper-subagent       │  │
│  │ grill-me        │  │ modeling-* (5)  │  │ pricing-archetype-      │  │
│  │ thermos         │  │ workflow   (5)  │  │   mapper-subagent       │  │
│  │ orchestrators   │  │                 │  │ archetype-scanner-merge │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘  │
│           │                    │                       │                  │
│           └────────────────────┼───────────────────────┘                  │
│                                ▼                                          │
│                    ┌───────────────────────┐                              │
│                    │ CLAUDE.md             │                              │
│                    │ - Available Skills    │                              │
│                    │ - Available Commands  │                              │
│                    │ - Recommended flows   │                              │
│                    │   (Bundles A–D)       │                              │
│                    └───────────────────────┘                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ references/ (per-skill, selective)                                   │  │
│  │   archetype-scanner/references/archetype-registry.md  (Wave 4)      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                          make build (platforms/*/build.sh)
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Generated variants (NEVER edit directly)                                   │
│  plugins/maister-cursor/  │  plugins/maister-copilot/  │  plugins/maister-kiro/ │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Project standards (consumer projects, not plugin source)                   │
│  .maister/docs/standards/global/language-md-convention.md  (E2, Wave 2)   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Container responsibilities:**

| Container | Responsibility |
|-----------|----------------|
| `skills/` | Rubric, workflow phases, chain sections, invocation guards |
| `commands/` | Thin wrappers delegating to skills via Skill tool |
| `agents/` | Wave 4 parallel mapper execution + merge consolidation |
| `references/` | Registry and supporting docs (not user-invocable) |
| `CLAUDE.md` | Discovery index, bundle flows, command taxonomy |
| Build pipeline | Platform naming transforms, validation gates |
| `.maister/docs/standards/` | `language.md` convention for consumer projects |

---

### Component View (C4 Level 3)

Logical components within the Maister plugin for AJ skill integration:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Skill Integration Layer                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │ Bundle A:           │  │ Bundle B:           │  │ Bundle C:       │ │
│  │ Requirements        │  │ DDD Modeling        │  │ Architecture    │ │
│  │ Quality             │  │                     │  │ Review          │ │
│  │                     │  │ problem-classifier  │  │                 │ │
│  │ requirements-critic │  │ context-distiller   │  │ test-strategy-  │ │
│  │ transcript-critic   │  │ aggregate-designer  │  │   reviewer      │ │
│  │                     │  │ accounting-mapper   │  │ linguistic-     │ │
│  │ quick-* commands    │  │ pricing-mapper      │  │   boundary-     │ │
│  │ disable-model-inv.  │  │ archetype-scanner   │  │   verifier      │ │
│  └─────────────────────┘  │ modeling-* commands │  │ reviews-* cmds  │ │
│                           └─────────────────────┘  └─────────────────┘ │
│                                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │ Bundle D:           │  │ Orchestrator        │  │ Build &         │ │
│  │ Stakeholder Comm.   │  │ Integration         │  │ Validate        │ │
│  │                     │  │ (Wave 2+ only)      │  │                 │ │
│  │ metaprogram-        │  │                     │  │ make build      │ │
│  │   classifier        │  │ development: soft   │  │ make validate   │ │
│  │ + grill-me (doc)    │  │   suggestions       │  │ Kiro skill      │ │
│  │                     │  │ product-design:     │  │   count update  │ │
│  │ quick-metaprogram-* │  │   transcript hint   │  │ platform sed    │ │
│  └─────────────────────┘  │ research: E6 flag   │  └─────────────────┘ │
│                           └─────────────────────┘                        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Deferred / Excluded                                                  │ │
│  │  E6: maister:research --gather-only (not a skill)                   │ │
│  │  EXCLUDED: aj-kg-query, incident-diagnosis-review                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Command Taxonomy and Directory Structure

### Command Categories

| Category | Prefix | Invocation model | AJ skills mapped |
|----------|--------|------------------|------------------|
| Quick utilities | `quick-*` | Interactive / on-demand critique & classification | requirements-critic, transcript-critic, problem-classifier, metaprogram-classifier |
| Reviews | `reviews-*` | Read-only audit rubrics | test-strategy-reviewer, linguistic-boundary-verifier |
| Modeling | `modeling-*` | Multi-phase DDD wizards | context-distiller, aggregate-designer, accounting-archetype-mapper, pricing-archetype-mapper, archetype-scanner |
| Workflow | (existing) | Orchestrators with state | development, research, product-design, etc. |

**Naming convention (source):** `name: maister:<command-stem>` in command frontmatter per `build-pipeline.md`. On-demand skill frontmatter uses **plain kebab** `name:` (no `maister:` prefix) per `grill-me` / `thermos` precedent.

### Full Directory Layout (Post-Adoption Target)

```
plugins/maister/
├── agents/
│   ├── ... (26 existing)
│   ├── accounting-archetype-mapper-subagent.md      # Wave 4 (E5)
│   ├── pricing-archetype-mapper-subagent.md         # Wave 4 (E5)
│   └── archetype-scanner-merge-subagent.md          # Wave 4 (E5)
│
├── commands/
│   ├── ... (8 existing)
│   │
│   │  # Wave 1 (E1)
│   ├── quick-requirements-critic.md
│   ├── quick-transcript-critic.md
│   ├── quick-problem-classifier.md
│   │
│   │  # Wave 2 (E3)
│   ├── quick-metaprogram-classifier.md
│   ├── reviews-test-strategy.md
│   ├── reviews-linguistic-boundaries.md
│   │
│   │  # Wave 3 (E4)
│   ├── modeling-context-distiller.md
│   ├── modeling-aggregate-designer.md
│   ├── modeling-accounting-archetype.md
│   ├── modeling-pricing-archetype.md
│   │
│   │  # Wave 4 (E5)
│   └── modeling-archetype-scanner.md
│
├── skills/
│   ├── ... (18 existing)
│   │
│   │  # Wave 1
│   ├── requirements-critic/SKILL.md
│   ├── transcript-critic/SKILL.md
│   ├── problem-classifier/SKILL.md
│   │
│   │  # Wave 2
│   ├── test-strategy-reviewer/SKILL.md
│   ├── linguistic-boundary-verifier/SKILL.md
│   ├── metaprogram-classifier/SKILL.md
│   │
│   │  # Wave 3
│   ├── context-distiller/SKILL.md
│   ├── aggregate-designer/SKILL.md
│   ├── accounting-archetype-mapper/SKILL.md
│   ├── pricing-archetype-mapper/SKILL.md
│   │
│   │  # Wave 4
│   └── archetype-scanner/
│       ├── SKILL.md
│       └── references/
│           └── archetype-registry.md
│
└── CLAUDE.md                    # Updated per wave: skills, commands, bundle flows
```

### Skill Frontmatter Template (On-Demand AJ Ports)

```yaml
---
name: requirements-critic                    # plain kebab — NO maister: prefix
description: Interactive critique of requirement quality. Use on explicit request only.
argument-hint: "[requirements text or file path]"
disable-model-invocation: true               # critique skills (Wave 1)
---
```

Interactive classifiers (problem-classifier, metaprogram-classifier) omit `disable-model-invocation` or set it optionally; include language preference gate per 7D.

### Thin Command Template

```yaml
---
name: maister:quick-requirements-critic
description: Critique requirement quality — problem vs solution, behavior vs CRUD
---

**ACTION REQUIRED**: Invoke the `requirements-critic` skill via Skill tool NOW.
Pass user arguments. Do not execute the rubric yourself.
```

---

## Skill Chain Topology

Chains are **documentation + explicit handoff**, not orchestrator state. Each skill ends with a **"Recommended next steps"** section listing sibling skills by kebab dir name.

```
                    ┌─────────────────────┐
                    │  problem-classifier │  Wave 1
                    └──────────┬──────────┘
                               │ RC detected
                               ▼
                    ┌─────────────────────┐
                    │  aggregate-designer │  Wave 3
                    └─────────────────────┘

┌──────────────────┐     boundaries      ┌────────────────────────────┐
│ context-distiller│ ──────────────────► │ linguistic-boundary-     │  Wave 2–3
│                  │                     │ verifier                 │
└────────┬─────────┘                     └────────────────────────────┘
         │ fit signals
         ▼
┌────────────────────────┐    ┌────────────────────────┐
│ accounting-archetype-  │    │ pricing-archetype-     │  Wave 3
│ mapper                 │    │ mapper                 │
└───────────┬────────────┘    └───────────┬────────────┘
            │                             │
            └──────────┬──────────────────┘
                       │ parallel Task (Wave 4)
                       ▼
            ┌─────────────────────┐
            │  archetype-scanner  │
            │  + merge subagent   │
            └─────────────────────┘

problem-classifier ──(classifies code)──► test-strategy-reviewer  Wave 2

Meeting flow (Bundle A):
transcript-critic ──(refined questions)──► requirements-critic  Wave 1

Stakeholder flow (Bundle D):
metaprogram-classifier ──(communication strategy)──► grill-me  Wave 2 (doc only)
```

### Bundle Reference (CLAUDE.md Documentation Only)

| Bundle | Skills | Primary commands | Wave |
|--------|--------|------------------|------|
| **A: Requirements Quality** | requirements-critic, transcript-critic | `quick-requirements-critic`, `quick-transcript-critic` | 1 |
| **B: DDD Modeling** | problem-classifier → context-distiller → mappers → aggregate-designer → archetype-scanner | `quick-problem-classifier`, `modeling-*` | 1, 3, 4 |
| **C: Architecture Review** | linguistic-boundary-verifier, test-strategy-reviewer | `reviews-linguistic-boundaries`, `reviews-test-strategy` | 2 |
| **D: Stakeholder Communication** | metaprogram-classifier + grill-me | `quick-metaprogram-classifier` | 2 |

---

## Phased Delivery Waves

| Wave | Epic | Skills | Commands | Agents | Standards | Effort |
|------|------|--------|----------|--------|-----------|--------|
| **1** | E1 | requirements-critic, transcript-critic, problem-classifier | 3× `quick-*` | — | — | 3× S (~3 days) |
| **2 prep** | E2 | — | — | — | `language-md-convention.md` | M (~2 days, parallel) |
| **2** | E3 | test-strategy-reviewer, linguistic-boundary-verifier, metaprogram-classifier | 2× `reviews-*`, 1× `quick-*` | — | E2 prerequisite for full LBV | 2× S + 1× S (~4 days) |
| **3** | E4 | context-distiller, aggregate-designer, 2× mappers | 4× `modeling-*` | — | — | 4× S (~4 days) |
| **4** | E5 | archetype-scanner | 1× `modeling-archetype-scanner` | 3 subagents + registry | — | M–L (~3 days) |
| **Parallel** | E6 | — (extends `maister:research`) | flag on existing command | — | — | M (~2 days) |

**Wave gate:** Optional 1–2 week validation pause after E1 before committing E3.

### Per-Wave Deliverables Checklist

Every wave PR must include:

1. `plugins/maister/skills/<kebab>/SKILL.md` with normalized frontmatter
2. Thin command(s) in `plugins/maister/commands/` (when applicable)
3. CLAUDE.md entries (5–15 lines per skill, 3–8 per command)
4. "Recommended next steps" chain section in each ported skill
5. `make build && make validate` passing on all three variants
6. Kiro Makefile skill count update (if applicable)
7. Cross-ref fixes (e.g., `problem-class-classifier` → `problem-classifier` in aggregate-designer)

---

## Epic Mapping (E1–E6)

| Epic | Name | Scope | Depends on | Acceptance criteria |
|------|------|-------|------------|---------------------|
| **E1** | Wave 1 — Requirements & Classification | 3 skills, 3 commands, `disable-model-invocation` on critics, CLAUDE.md backfill for grill-me/thermos | None | Commands invoke skills; validate passes; critics explicit-only |
| **E2** | language.md Standard | `.maister/docs/standards/global/language-md-convention.md` + INDEX.md entry | None (parallel with E1) | Standard defines location, template, examples |
| **E3** | Wave 2 — Review & Stakeholder | 3 skills, 3 commands, soft suggestions in development/product-design | E2 for full LBV value; E1 complete for suggestions | Verifier degrades without language.md; metaprogram + grill-me flow documented |
| **E4** | Wave 3 — DDD Core | 4 skills, 4 modeling commands, cross-ref fixes | E1 (problem-classifier) | Full mapper + distiller + designer chain refs valid |
| **E5** | Wave 4 — archetype-scanner | Scanner skill, 3 agents, `archetype-registry.md`, modeling command | E4 mappers proven | Parallel Task per registry entry; merge agent consolidates |
| **E6** | research --gather-only | Extend `maister:research` with `--gather-only`; port actor-map, rejected-info rubric fragments | None (after Wave 1) | Phase 1 gather + merge only; no synthesis/brainstorm/design |

---

## archetype-scanner Component Design (Wave 4)

### Registry (`references/archetype-registry.md`)

| Archetype ID | Mapper skill | Subagent | Fit criteria summary |
|--------------|--------------|----------|----------------------|
| `accounting` | `accounting-archetype-mapper` | `accounting-archetype-mapper-subagent` | Value tracking, ledger, double-entry |
| `pricing` | `pricing-archetype-mapper` | `pricing-archetype-mapper-subagent` | Calculated prices, component trees, validity |

**Party archetype:** Deferred — not in AJ registry; omit until AJ adds it.

### Parallel Execution Flow

```
archetype-scanner (skill)
    │
    ├─ Read archetype-registry.md
    ├─ Gather domain description from user
    │
    ├─ Task (parallel, same message)
    │     ├─ accounting-archetype-mapper-subagent  → fit/no-fit + evidence
    │     └─ pricing-archetype-mapper-subagent     → fit/no-fit + evidence
    │
    └─ Task: archetype-scanner-merge-subagent
          → consolidated report with ranked fits
```

Subagents preload mapper SKILL.md rubric (thermo-nuclear subagent pattern). Interactive full mapper wizards remain standalone via `modeling-*` commands.

---

## linguistic-boundary-verifier Integration (Wave 2)

### Prerequisite: language.md Convention (E2)

Standard path: `.maister/docs/standards/global/language-md-convention.md`

Defines:
- File location: `<module>/language.md` or project-specific pattern
- Template: bounded context name, ubiquitous language glossary, forbidden terms
- Optional vs required adoption

### Graceful Degradation (6B)

When no `language.md` files found:
1. Skill completes with **"Convention not adopted"** report
2. Links to E2 standard and template
3. Optionally runs limited string-leakage heuristics without glossary
4. Does **not** fail or block invocation

**Deferred:** `language-md-generator` skill (Wave 2.5 or separate research) — not in scope.

---

## Localization Strategy

| Aspect | Rule |
|--------|------|
| Frontmatter `description` | English-primary (discovery) |
| SKILL.md body | Preserve AJ bilingual content (PL examples where pedagogically valuable) |
| Interactive skills | Optional first-step language preference via AskUserQuestion (requirements-critic, problem-classifier, metaprogram-classifier) |
| Output language | Match user preference when gate used; otherwise follow rubric defaults |
| Build pipeline | No locale transforms — single source SKILL.md per skill |

---

## Workflow Integration

### Wave 1 (8A): Standalone Only

- No changes to `development`, `product-design`, `research` SKILL.md
- `requirements-critic` and `transcript-critic`: `disable-model-invocation: true`
- Users invoke via command, explicit natural language, or Skill tool

### Wave 2+ (8B): Soft Suggestions

Add optional bullets (no auto Skill invocation):

| Orchestrator | Phase | Suggestion |
|--------------|-------|------------|
| `development` | Phase 5 (spec creation) | "After requirements draft, consider `requirements-critic`" |
| `product-design` | Transcript ingest phase | "Consider `transcript-critic` for decision-process audit" |
| `implementation-verifier` | References only | Optional mention of `test-strategy-reviewer` — not automatic |

**Bundle D:** Document metaprogram-classifier → grill-me flow in CLAUDE.md only.

**Deferred:** Orchestrator phase flags (`--requirements-critic`, `--ddd-classify`) — 8C not adopted.

---

## Build Pipeline Integration

### Source-Only Edit Rule

All AJ adoption edits go to `plugins/maister/` only. Never edit `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/` directly.

### Per-Wave Build Steps

```bash
# After each wave PR
make build          # platforms/copilot-cli, cursor, kiro-cli build.sh
make validate       # structural gates per variant
```

### Validation Impact

| Check | AJ adoption consideration |
|-------|---------------------------|
| No `maister:` in generated variants | On-demand skills use plain `name:` in source — transforms must not add prefix |
| Flat commands layout | All new commands directly under `commands/` |
| Cursor agent `maister-` prefix | Wave 4 subagents follow naming convention |
| Kiro AskUserQuestion ban | Interactive skills use CHAT GATE transforms in Kiro build |
| Skill count in Kiro Makefile | Update after each wave |
| No CLAUDE.md refs in skills | Cross-ref skills by kebab dir path, not CLAUDE.md |

### Standards Update

Add `modeling-*` command category to `.maister/docs/standards/global/plugin-development.md` during E1 or E4:

```markdown
### Modeling Command Category
DDD transformation skills use `modeling-*` prefix (e.g., `modeling-context-distiller`).
Commands are thin wrappers; orchestration lives in skill SKILL.md.
```

---

## What NOT to Port

| Skill | Reason | Maister alternative |
|-------|--------|---------------------|
| **aj-kg-query** | Neo4j MCP lock-in; AJ ontology-specific Cypher recipes | `codebase-analyzer`, Grep, Read |
| **incident-diagnosis-review** | ATIF trajectory + ground_truth_decisions.json evaluator | `reviews-code`, `implementation-verifier`, thermo reviews |
| **research-gatherer** | Overlap with `maister:research` Phase 1–2 | E6: `--gather-only` flag |
| **Party archetype mapper** | Referenced in AJ templates but not in registry | Defer indefinitely |
| **language-md-generator** | Deferred per 6C decision | Manual convention + future skill |
| **DDD meta-orchestrator** | Rejected per 1C | Individual skills + chain sections |

---

## Data Flow

### Skill Invocation Flow

```
User request
    │
    ├─ /maister:quick-requirements-critic  ──► command ──► Skill tool ──► requirements-critic/SKILL.md
    │
    ├─ "critique these requirements"         ──► disable-model-invocation gate ──► explicit match ──► skill
    │
    └─ development Phase 5 (Wave 2+)       ──► soft suggestion text ──► user chooses to invoke
```

### archetype-scanner Data Flow

```
Domain description (user input)
    → archetype-scanner skill
    → archetype-registry.md (archetype list)
    → parallel subagent Tasks (per mapper)
    → fit assessments (structured)
    → merge subagent
    → consolidated fit report (ranked)
```

### linguistic-boundary-verifier Data Flow

```
Module paths (user input)
    → Grep/Read for language.md files
    ├─ found: cross-module term comparison → leakage report + fixes
    └─ not found: graceful degradation report + convention link
```

---

## Integration Points

| Integration | Type | Wave | Notes |
|-------------|------|------|-------|
| `development` orchestrator | Soft doc suggestion | 2+ | No auto-invocation |
| `product-design` orchestrator | Soft doc suggestion | 2+ | transcript-critic hint |
| `maister:research` | `--gather-only` flag | E6 | Phase skip logic |
| `grill-me` | CLAUDE.md pairing doc | 2 | Bundle D flow |
| `thermos` / thermo reviews | Complementary | 2 | test-strategy + linguistic after thermos on same PR |
| `implementation-verifier` | Reference mention | 2 | test-strategy-reviewer optional |
| `.maister/docs/INDEX.md` | Standards discovery | 2 | language.md convention |
| `make build/validate` | CI gate | Every wave | Mandatory before merge |

---

## Design Decisions

| # | Decision | ADR |
|---|----------|-----|
| 1 | Individual skills + chain sections, no meta-orchestrator | [ADR-001](decision-log.md#adr-001-individual-skills-with-chain-sections-no-meta-orchestrator) |
| 2 | Category-aligned commands: quick-*, reviews-*, modeling-* | [ADR-002](decision-log.md#adr-002-category-aligned-command-taxonomy) |
| 3 | Strict phased waves 1–4 | [ADR-003](decision-log.md#adr-003-strict-phased-delivery-waves) |
| 4 | research-gatherer as --gather-only on maister:research | [ADR-004](decision-log.md#adr-004-research-gather-only-flag-instead-of-new-skill) |
| 5 | archetype-scanner with dedicated subagents + registry | [ADR-005](decision-log.md#adr-005-archetype-scanner-subagent-delegation-with-registry) |
| 6 | language.md standard + graceful verifier degradation | [ADR-006](decision-log.md#adr-006-languagemd-convention-with-graceful-degradation) |
| 7 | Bilingual bodies, EN frontmatter, language ask | [ADR-007](decision-log.md#adr-007-bilingual-skill-bodies-with-english-frontmatter) |
| 8 | Standalone Wave 1; soft orchestrator suggestions Wave 2+ | [ADR-008](decision-log.md#adr-008-standalone-first-then-soft-workflow-suggestions) |
| 9 | Exclude aj-kg-query and incident-diagnosis-review | [ADR-009](decision-log.md#adr-009-exclude-platform-locked-aj-skills) |

---

## Concrete Examples

### Example 1: Requirements hardening before development

**Given** a product owner pastes meeting notes and a draft user story,  
**When** the architect runs `/maister:quick-transcript-critic` then `/maister:quick-requirements-critic`,  
**Then** they receive decision-process audit findings with evidence quotes, followed by interactive requirement quality critique with reformulated stories — no orchestrator state is created.

### Example 2: DDD modeling chain

**Given** a new billing feature description,  
**When** the architect runs `/maister:quick-problem-classifier` and receives RC (Resource Contention),  
**Then** the skill's "Recommended next steps" suggests `aggregate-designer`; after Wave 3, `/maister:modeling-aggregate-designer` walks through consistency unit design.

### Example 3: Architecture review on a PR

**Given** a PR touching payment and invoicing modules with `language.md` files present,  
**When** the team runs `/maister:reviews-linguistic-boundaries` and `/maister:reviews-test-strategy` after `thermos`,  
**Then** they get leakage report between bounded contexts plus test strategy alignment vs problem class — complementing code quality from `reviews-code`.

### Example 4: archetype fit scan (Wave 4)

**Given** a domain description for a loyalty points system,  
**When** the architect runs `/maister:modeling-archetype-scanner`,  
**Then** parallel mapper subagents assess accounting vs pricing fit, merge agent returns ranked recommendation with evidence — user may follow up with interactive `/maister:modeling-accounting-archetype`.

---

## Out of Scope

- Neo4j knowledge graph integration (`aj-kg-query`)
- ATIF incident evaluation (`incident-diagnosis-review`)
- DDD meta-orchestrator skill (`maister:ddd-modeling`)
- `language-md-generator` skill (deferred)
- Party archetype mapper (until AJ registry includes it)
- Orchestrator phase flags for automatic skill invocation (8C)
- Locale-specific build transforms (7C)
- Auto-creation of `language.md` in `maister:init` (6D default)
- Rewriting Maister orchestrators around DDD workflows

---

## Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | All 11 adoptable skills invocable standalone | Manual smoke per skill + `make validate` |
| 2 | Command taxonomy discoverable in CLAUDE.md | 12 new commands documented by wave completion |
| 3 | Chain topology preserved via "Recommended next steps" | Cross-ref grep shows kebab sibling names |
| 4 | Critique skills never auto-invoke during requirements writing | `disable-model-invocation: true` on critics |
| 5 | linguistic-boundary-verifier usable without convention | Graceful degradation report when no language.md |
| 6 | archetype-scanner runs parallel mappers | Wave 4 integration test with 2 registry entries |
| 7 | Build pipeline passes all three variants after each wave | CI `make build && make validate` green |
| 8 | Excluded skills have no artifacts in plugin | No aj-kg-query or incident-diagnosis-review dirs |
| 9 | research-gatherer features available via --gather-only | E6 acceptance: gather + merge, no synthesis |
| 10 | Bilingual pedagogical content preserved | PL examples present in ported metaprogram-classifier |

---

## Estimated Calendar

```
E1 (Wave 1)     ███░░░░░░░  ~3 days
E2 (language)   ██░░░░░░░░  ~2 days (parallel)
E3 (Wave 2)     ████░░░░░░  ~4 days
E4 (Wave 3)     ████░░░░░░  ~4 days
E5 (Wave 4)     ███░░░░░░░  ~3 days
E6 (gather-only)██░░░░░░░░  ~2 days (parallel after Wave 1)
────────────────────────────────────
Total           ~12–15 implementation days
```

---

*Next step: `/maister:development` epic E1 (Wave 1) — port requirements-critic, transcript-critic, problem-classifier.*
