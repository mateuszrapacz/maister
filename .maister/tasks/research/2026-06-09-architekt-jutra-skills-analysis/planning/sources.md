# Research Sources: Architekt Jutra Skills for Maister Adoption

**Created:** 2026-06-09  
**Research question:** Extract and analyze skills from architekt-jutra-code; categorize and recommend adoption into Maister plugin (like `grill-me` / `thermos`).

---

## External Skills Repository (Primary)

**Root:** `/Users/mrapacz/Projects/architekt-jutra-code`

### Complete SKILL.md Inventory (14 files — verified 2026-06-09)

| # | Path | Skill name (frontmatter) | Theme |
|---|------|--------------------------|-------|
| 1 | `week8/4/metaprogram-classifier/SKILL.md` | `maister:metaprogram-classifier` | Communication / NLP metaprograms |
| 2 | `week8/3/problem-classifier/SKILL.md` | `maister:problem-classifier` | Modeling problem class (CRUD, transformation, integration, contention) |
| 3 | `week8/2/requirements-critic/SKILL.md` | `maister:requirements-critic` | Requirements critique (canonical) |
| 4 | `week8/1/transcript-critic/SKILL.md` | `transcript-critic` | Requirements critique (likely duplicate of #3) |
| 5 | `week7/6-jednostkispojnosci-demo/aggregate-designer/SKILL.md` | `maister:aggregate-designer` | Aggregate / consistency unit design wizard |
| 6 | `week7/5-znanewzorce-demo/pricing-archetype-mapper/SKILL.md` | `pricing-archetype-mapper` | Pricing archetype domain model |
| 7 | `week7/5-znanewzorce-demo/archetype-scanner/SKILL.md` | `archetype-scanner` | Parallel archetype fit scan |
| 8 | `week7/5-znanewzorce-demo/accounting-archetype-mapper/SKILL.md` | `accounting-archetype-mapper` | Accounting archetype domain model |
| 9 | `week7/4-uogolnienie-demo/context-distiller/SKILL.md` | `maister:context-distiller` | Bounded context / generalization distillation |
| 10 | `week7/3-research-gatherer-demo/research-gatherer-standalone/skills/research-gatherer/SKILL.md` | `research-gatherer` | Lightweight research gathering (no full synthesis) |
| 11 | `week10/test-strategy-reviewer/SKILL.md` | `maister:test-strategy-reviewer` | Test strategy vs problem class alignment |
| 12 | `week10/linguistic-boundary-verifier/SKILL.md` | `linguistic-boundary-verifier` | Bounded context language leakage |
| 13 | `tools/kg-incidents/evaluator_skills/incident-diagnosis-review/SKILL.md` | `incident-diagnosis-review` | AI incident diagnosis review (evaluator) |
| 14 | `.claude/skills/aj-kg-query/SKILL.md` | `aj-kg-query` | AJ platform KG queries via Neo4j MCP |

### File Patterns (Glob)

```
/Users/mrapacz/Projects/architekt-jutra-code/**/SKILL.md
/Users/mrapacz/Projects/architekt-jutra-code/**/references/**
/Users/mrapacz/Projects/architekt-jutra-code/.claude/skills/**
```

### Grep Patterns (investigate during gathering)

| Pattern | Purpose |
|---------|---------|
| `AskUserQuestion\|AskQuestion` | Interactive gate portability (Maister/Cursor uses AskQuestion) |
| `subagent_type\|Task tool` | Subagent dependencies — must map to Maister agents or inline workflow |
| `MCP\|neo4j\|mcp__` | External MCP requirements (low fit for generic Maister) |
| `disable-model-invocation` | Explicit-only invocation pattern |
| `Invoked ONLY\|Invocation guard` | On-demand skill guards (grill-me / requirements-critic pattern) |
| `maister:` | Prefix usage in AJ repo (naming inconsistency) |
| `language\.md\|bounded context` | DDD-specific inputs (linguistic-boundary-verifier) |
| `fit/` \| `Archetype Registry` | Skills with filesystem output conventions |

### Supporting AJ Artifacts (secondary — context only)

| Path | Relevance |
|------|-----------|
| `week7/3-research-gatherer-demo/research-gatherer-standalone/skills/research-gatherer/references/research-methodologies.md` | Compare with Maister research skill references (overlap analysis) |
| `.claude/skills/aj-kg-query/references/labels.md` | KG ontology — confirms AJ-specific scope |
| `tools/seed/aj-kg-ontology.cypher` | AJ platform schema — not portable to Maister |
| `tools/questions.md` | AJ KG query catalog — aj-kg-query scope |

### Excluded AJ Paths (explicit per brief)

| Path | Reason |
|------|--------|
| `week-demo/**` application code | Out of scope — skill artifacts only |
| AJ-dotnet runtime, host bridge | Not skill adoption |
| `aj-kg-query` MCP server config | Platform-specific unless generalized to codebase-analyzer |

---

## Maister Codebase Sources

### Source Plugin (edit only here)

| Path | Relevance |
|------|-----------|
| `plugins/maister/skills/**/SKILL.md` | **18 skills** — baseline inventory for gap analysis |
| `plugins/maister/commands/*.md` | 8 thin command wrappers — pattern for new adopted skills |
| `plugins/maister/agents/*.md` | Subagents skills may delegate to (thermo-nuclear-*, research-*, etc.) |
| `plugins/maister/CLAUDE.md` | Skill/command/agent tables, documentation principles |
| `plugins/maister/.claude-plugin/plugin.json` | Manifest — new skills may need listing in description |
| `plugins/maister/hooks/` | Hooks unlikely for on-demand skills; note if AJ skill assumes hooks |

### Adoption Reference Skills (read first)

| Path | Pattern |
|------|---------|
| `plugins/maister/skills/grill-me/SKILL.md` | Interactive on-demand; no orchestrator state; one question at a time |
| `plugins/maister/skills/thermos/SKILL.md` | Composite skill; `disable-model-invocation`; parallel subagents |
| `plugins/maister/skills/thermo-nuclear-review/SKILL.md` | Review subagent host |
| `plugins/maister/skills/thermo-nuclear-code-quality-review/SKILL.md` | Review subagent host |
| `plugins/maister/skills/quick-bugfix/SKILL.md` | On-demand with escalation to full orchestrator |

### Maister Skill Inventory (18 skills — baseline)

| Directory | name (frontmatter) | Role (hypothesis) |
|-----------|-------------------|-------------------|
| `init/` | `maister:init` | Orchestrator |
| `development/` | `maister:development` | Orchestrator |
| `research/` | `maister:research` | Orchestrator |
| `product-design/` | `maister:product-design` | Orchestrator |
| `performance/` | `maister:performance` | Orchestrator |
| `migration/` | `maister:migration` | Orchestrator |
| `quick-bugfix/` | `maister:quick-bugfix` | On-demand |
| `grill-me/` | `grill-me` | On-demand |
| `thermos/` | `thermos` | On-demand composite |
| `thermo-nuclear-review/` | `thermo-nuclear-review` | On-demand review |
| `thermo-nuclear-code-quality-review/` | `thermo-nuclear-code-quality-review` | On-demand review |
| `standards-update/` | `maister:standards-update` | Utility |
| `standards-discover/` | `maister:standards-discover` | Utility |
| `codebase-analyzer/` | `codebase-analyzer` | Internal engine |
| `docs-manager/` | `docs-manager` | Internal engine |
| `implementation-plan-executor/` | `implementation-plan-executor` | Internal engine |
| `implementation-verifier/` | `implementation-verifier` | Internal engine |
| `orchestrator-framework/` | `orchestrator-framework` | Reference (not executable) |

### Maister Commands (thin wrappers)

| Path | Delegates to |
|------|--------------|
| `commands/quick-plan.md` | Planning mode |
| `commands/quick-dev.md` | Direct implementation |
| `commands/reviews-code.md` | code-reviewer agent |
| `commands/reviews-pragmatic.md` | code-quality-pragmatist agent |
| `commands/reviews-spec-audit.md` | spec-auditor agent |
| `commands/reviews-reality-check.md` | reality-assessor agent |
| `commands/reviews-production-readiness.md` | production-readiness-checker agent |
| `commands/work.md` | task-classifier routing |

### Generated Variants (read-only — verify build impact)

| Path | Relevance |
|------|-----------|
| `plugins/maister-cursor/skills/` | Cursor transform of skill names (`maister-` prefix) |
| `platforms/cursor/build.sh` | Skill/command naming transforms for new skills |

### File Patterns (Glob)

```
plugins/maister/skills/**/*
plugins/maister/commands/**/*
plugins/maister/agents/**/*
platforms/*/build.sh
Makefile
```

---

## Project Documentation Sources

| Path | Relevance |
|------|-----------|
| `.maister/docs/INDEX.md` | Discovery entry — project context |
| `.maister/docs/project/tech-stack.md` | Markdown-as-code, multi-platform plugin architecture |
| `.maister/docs/standards/global/plugin-development.md` | **Primary adoption standard** — skill dirs, frontmatter, thin commands, SOT in SKILL.md |
| `.maister/docs/standards/global/conventions.md` | Naming, task artifacts, documentation-first workflow |
| `.maister/docs/standards/global/build-pipeline.md` | Platform transforms when adding new skills |
| `.maister/docs/standards/global/minimal-implementation.md` | YAGNI — avoid over-adopting skill bundle |
| `CLAUDE.md` (repo root) | Never edit generated variants; beta workflow |
| `AGENTS.md` (repo root) | Maister workflow execution rules |

---

## Comparative Analysis Sources

Comparative gatherer consumes outputs from the three source categories above. No additional primary repos.

### Comparison Dimensions

| Dimension | AJ source | Maister source |
|-----------|-----------|----------------|
| Skill count | 14 external | 18 internal |
| On-demand utilities | requirements-critic, test-strategy-reviewer, … | grill-me, thermos, quick-bugfix |
| Research workflows | research-gatherer (lightweight) | maister:research (full orchestrator) |
| Domain modeling | week7/week8 cluster | None dedicated |
| Review / audit | test-strategy-reviewer, linguistic-boundary-verifier | reviews-* commands, thermo-nuclear-* |
| Platform lock-in | aj-kg-query, incident-diagnosis-review | Playwright MCP only (shared) |

### Overlap Hypotheses (validate in comparative gatherer)

| AJ skill | Potential Maister overlap |
|----------|----------------------------|
| `research-gatherer` | `maister:research` Phase 1 gather (subset) |
| `requirements-critic` | `development` requirements gathering (different — critique vs collect) |
| `test-strategy-reviewer` | `reviews-code`, implementation-verifier test analysis |
| `linguistic-boundary-verifier` | No direct equivalent (complement) |
| `problem-classifier` | task-classifier (different — modeling vs workflow routing) |

---

## Configuration Sources

| Path | Relevance |
|------|-----------|
| `plugins/maister/.mcp.json` | Maister MCP (Playwright) — compare with AJ Neo4j MCP requirement |
| `.claude-plugin/marketplace.json` | Marketplace listing if new skills change plugin description |
| `Makefile` | `make validate` — new skills must pass structural checks |

---

## External / Literature Sources (optional)

| URL | Purpose |
|-----|---------|
| https://code.claude.com/docs/en/skills | Official Claude Code skills API — validate frontmatter conventions |
| https://code.claude.com/docs/en/plugins | Plugin structure for new skill registration |

*No web research required for core question — primary evidence is both local codebases.*

---

## Source Priority

When findings conflict, resolve in this order:

1. **Full SKILL.md content** (AJ and Maister) — authoritative for workflow and dependencies
2. **Project standards** (`.maister/docs/standards/global/plugin-development.md`)
3. **Maister CLAUDE.md** — documented skill inventory and principles
4. **Research brief exclusions** — aj-kg-query, incident-diagnosis-review default to not recommended
5. **Frontmatter description only** — lowest confidence if body contradicts

---

## Gatherer → Source Mapping

| Gatherer category | Primary sources from this manifest |
|-------------------|-----------------------------------|
| `external-skills-repo` | Complete 14-file inventory, grep patterns, references/ dirs |
| `maister-codebase` | 18 Maister skills, commands, grill-me/thermos references, CLAUDE.md |
| `plugin-standards` | plugin-development.md, conventions.md, tech-stack.md, build-pipeline.md |
| `comparative-analysis` | Cross-product tables in "Comparative Analysis Sources"; consumes gatherer findings 1–3 |

---

## Access Notes

- **AJ repo path:** `/Users/mrapacz/Projects/architekt-jutra-code` — external to Maister workspace; Read/Glob with absolute paths
- **Maister repo path:** `/Users/mrapacz/Workspace/maister` — primary workspace
- **No secrets or credentials** expected in SKILL.md files
