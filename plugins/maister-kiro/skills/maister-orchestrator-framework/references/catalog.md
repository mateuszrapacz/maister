# Maister Skill, Command & Agent Catalog

Reference listing of all available skills, commands, and subagents.
This file is loaded on-demand by orchestrators — not always in context.

## Available Skills

Skills are automatically invoked by Claude when appropriate. Details live in each skill's `skill.md` file.

### Core Workflow Skills

| Skill | Purpose | Details |
|-------|---------|---------|
| `codebase-analyzer` | Thin dispatcher: selects agent roles adaptively, launches parallel maister-explore subagents, delegates report synthesis to `codebase-analysis-reporter` subagent | `skills/codebase-analyzer/SKILL.md` |
| `implementation-verifier` | Read-only QA orchestrator: delegates completeness checks, test execution, code review, and production readiness to specialized subagents; compiles results into verification report | `skills/implementation-verifier/SKILL.md` |
| `standards-discover` | Parallel multi-source standards discovery (config, code, docs, PRs/CI) with confidence scoring | `skills/standards-discover/SKILL.md` |
| `docs-manager` | Internal engine for doc file operations, INDEX.md generation, AGENTS.md integration. Not user-invocable — accessed via `docs-operator` agent (subagent tool) by init, standards-update, standards-discover | `skills/docs-manager/skill.md` |
| `maister-init` | Initialize `.maister/docs/` with project analysis, documentation generation, and baseline standards | `skills/init/SKILL.md` |
| `standards-update` | Update or create standards from conversation context or explicit input | `skills/standards-update/SKILL.md` |
| `quick-plan` | Built-in plan mode + standards enforcement: discovers matched standards from INDEX.md during planning and folds a Standards Compliance Checklist into the plan | `skills/quick-plan/SKILL.md` |
| `quick-dev` | Direct main-agent development (no plan mode) + standards enforcement: applies matched standards while implementing and verifies compliance after | `skills/quick-dev/SKILL.md` |
| `quick-bugfix` | Quick TDD-driven bug fix with complexity escalation to full development workflow | `skills/quick-bugfix/SKILL.md` |

### Orchestrator Framework

All orchestrators share patterns documented in a single reference file:

| File | Purpose |
|------|---------|
| `orchestrator-patterns.md` | Delegation rules, interactive mode, state schema, context passing, initialization, resume, issue resolution, artifact summary contract (§ 7), operator dashboard (§ 8), HTML companion reports (§ 9) |
| `orchestrator-creation-checklist.md` | Authoring checklist for new orchestrators (not loaded at runtime) |
| `html-report-style.md` | Shared style guide for HTML companion reports (standard CSS, severity badges, per-artifact layouts) |
| `assets/dashboard.html` | Static operator dashboard viewer, copied into each task directory at workflow init (never model-generated) |

Each orchestrator reads `orchestrator-patterns.md` at initialization and implements domain-specific phases. Key principles: state-driven execution, resume capability, interactive phase gates, user-confirmed rollback, context passing between phases via `phase_summaries`, delegation enforcement (`/maister-*` slash skill for skills, subagent tool for agents).

### Orchestrator Skills

Orchestrators manage complete workflows with state management, auto-recovery, and pause/resume.

| Skill | Purpose | Details |
|-------|---------|---------|
| `development` | **Unified workflow** (14 phases: 1-14) for all development tasks. Phases activate based on detected task characteristics (not predetermined types). TDD gates activate when defects detected, UI mockups when UI-heavy. | `skills/development/SKILL.md` |
| `performance` | Static code analysis for bottleneck detection, reuses standard spec/plan/implement/verify pipeline | `skills/performance/SKILL.md` |
| `migration` | Code/data/architecture migrations with rollback plans | `skills/migration/SKILL.md` |
| `research` | Multi-source research with synthesis, solution brainstorming, high-level design, and citations | `skills/research/SKILL.md` |
| `product-design` | **Interactive product/feature design** (9 phases: 0-8) with adaptive scope (feature-level default, product-level when detected), mixed interaction pattern (questioning for exploration, propose-and-refine for convergence), iterative refinement loops, browser-based visual companion, and layered product brief output. | `skills/product-design/SKILL.md` |

### Requirements & Modeling Skills

| Skill | Purpose | Details |
|-------|---------|---------|
| `transcript-critic` | Audits meeting transcripts for decision-process problems (false consensus, marginalized voices, scope drift). Produces structured non-interactive critique with severity, evidence quotes, and diagnostic questions. Explicit request only. | `skills/transcript-critic/SKILL.md` |
| `requirements-critic` | Interactive requirements critique via 4 checks: problem vs solution framing, observable behavior, extensible signal map, rigid quantifier probing. Explicit request only. | `skills/requirements-critic/SKILL.md` |
| `problem-classifier` | Classifies business requirements into 4 modeling problem classes (CRUD, Transformation & Presentation, Integration, Resource Contention). Signal scan, clarifying questions, implementation guidance — not an archetype mapper. | `skills/problem-classifier/SKILL.md` |
| `context-distiller` | Distills bounded contexts via bidirectional linguistic analysis — finds generalization candidates and context-split signals. Strategic design artifact, not implementation. | `skills/context-distiller/SKILL.md` |
| `aggregate-designer` | Multi-phase wizard for Resource Contention consistency units (aggregate boundaries, command locking, optimistic concurrency). | `skills/aggregate-designer/SKILL.md` |

**Bundle A — Requirements quality flow**: Run `transcript-critic` on the meeting transcript first. Use its diagnostic questions in follow-up clarification (meeting or async). Capture refined user stories or tickets, then run `requirements-critic` for interactive quality critique. When concurrency or resource-contention signals appear, run `maister-problem-classifier` for modeling-class guidance.

**Bundle B — DDD modeling flow**: Run `problem-classifier` on requirements → `context-distiller` for strategic boundaries when generalization/ambiguity signals appear → `aggregate-designer` when RC class is detected → `linguistic-boundary-verifier` when `language.md` files exist. Chain via each skill's Recommended next steps, not an orchestrator.

> **Naming distinction**: `task-classifier` **agent** routes task descriptions to orchestrators (5 workflow types: development, performance, migration, research, product-design). `problem-classifier` **skill** classifies business requirements into 4 DDD modeling problem classes. Different domains — do not conflate.

### Review & Utility Skills

| Skill | Purpose | Details |
|-------|---------|---------|
| `grill-me` | Relentless interactive interview to stress-test a plan or design until shared understanding; walks the decision tree one question at a time with recommended answers | `skills/grill-me/SKILL.md` |
| `thermo-nuclear-review` | Comprehensive branch/PR audit for bugs, breaking changes, security vulnerabilities, devex regressions, and feature-flag leaks. Explicit request only. | `skills/thermo-nuclear-review/SKILL.md` |
| `thermo-nuclear-code-quality-review` | Strict maintainability audit: abstraction quality, file-size growth, spaghetti detection, structural simplification ("code judo"). Explicit request only. | `skills/thermo-nuclear-code-quality-review/SKILL.md` |
| `thermos` | Launches both thermo-nuclear review subagents in parallel, then synthesizes deduplicated findings. Explicit request only. | `skills/thermos/SKILL.md` |
| `test-strategy-reviewer` | Read-only review: classifies production code by problem class and compares test strategy (output/state/interaction-based) against recommendations. Explicit request only. | `skills/test-strategy-reviewer/SKILL.md` |
| `linguistic-boundary-verifier` | Read-only bounded-context language leakage audit via `language.md` files; graceful degradation when convention not adopted. Explicit request only. | `skills/linguistic-boundary-verifier/SKILL.md` |
| `metaprogram-classifier` | Diagnoses NLP metaprogram patterns in communication and suggests context-specific strategies. Interactive classifier. | `skills/metaprogram-classifier/SKILL.md` |

**Bundle C — Architecture review flow**: Run `linguistic-boundary-verifier` when modules have `language.md` files (see `.maister/docs/standards/global/language-md-convention.md`). Then run `maister-test-strategy-reviewer` on tests for the same scope. Optional: pair with `thermos` on the same PR for code risk + boundaries + test strategy.

**Bundle D — Stakeholder communication flow**: Run `metaprogram-classifier` on the stakeholder's message or described behavior, then `grill-me` to stress-test your proposal before the conversation. Documented pairing only — no orchestrator wire-up.

> **reviews-* delegation note**: Existing `reviews-code`, `reviews-spec-audit`, etc. delegate to **subagents** via subagent tool. Wave 2 `reviews-test-strategy` and `reviews-linguistic-boundaries` delegate to **skills** via `/maister-*` slash skill (architecture-review rubrics).

## Available Commands

Commands invoke orchestrators and utilities. All orchestrators support `--from=phase` (resume point).

### Setup & Standards

| Command | Usage | Purpose |
|---------|-------|---------|
| `/maister-init` | `/maister-init [--standards-from=PATH]` | Initialize framework with project analysis and smart defaults for docs/standards. Optionally copy standards from another project's `.maister/docs/standards/` instead of built-in defaults. |
| `/maister-standards-update` | `/maister-standards-update [description] [--from=PATH]` | Update/create standards from conversation context, or sync from another project |
| `/maister-standards-discover` | `/maister-standards-discover [--scope=SCOPE]` | Discover standards from config files and code patterns |

> **Note**: These are all skills (not commands). `/maister-init`, `/maister-standards-update`, and `/maister-standards-discover` invoke their respective skills which delegate file operations to the internal `docs-manager` skill.

### Workflow Commands

Each workflow skill handles both new tasks and resuming existing ones. Pass a task description to start new, or a task path to resume.

| Command | Usage | Task Directory |
|---------|-------|----------------|
| `/maister-development` | `[desc] [--e2e] [--user-docs] [--research=PATH] [--sequential]` (new) / `[task-path] [--from=PHASE] [--reset-attempts] [--sequential]` (resume) | `.maister/tasks/development/` |
| `/maister-performance` | `[desc] [--sequential]` (new) / `[task-path] [--from=PHASE] [--sequential]` (resume) | `.maister/tasks/performance/` |
| `/maister-migration` | `[desc] [--type=TYPE] [--sequential]` (new) / `[task-path] [--from=PHASE] [--sequential]` (resume) | `.maister/tasks/migrations/` |
| `/maister-research` | `[question] [--type=TYPE] [--brainstorm] [--no-brainstorm] [--design] [--no-design]` (new) / `[task-path] [--from=PHASE]` (resume) | `.maister/tasks/research/` |
| `/maister-product-design` | `[desc] [--research=PATH] [--no-visual]` (new) / `[task-path] [--from=PHASE]` (resume) | `.maister/tasks/product-design/` |

**Research-Based Development**: Start development informed by a completed research workflow:
```bash
# Auto-detect research folder (recommended)
/maister-development .maister/tasks/research/2026-01-12-oauth-research

# Explicit --research flag
/maister-development "Implement OAuth" --research=.maister/tasks/research/2026-01-12-oauth-research
```
Research context flows through ALL phases without skipping any. Research artifacts are copied to `analysis/research-context/` and summaries pass to every subagent via Pattern 7.

### Review & Audit Commands

| Command | Usage | Purpose |
|---------|-------|---------|
| `/maister-reviews-code` | `[path] [--scope=SCOPE]` | Automated code quality, security, performance analysis |
| `/maister-reviews-pragmatic` | `[path]` | Detect over-engineering, ensure code matches project scale |
| `/maister-reviews-spec-audit` | `[spec-path]` | Independent spec audit for completeness and clarity |
| `/maister-reviews-reality-check` | `[task-path]` | Validate work actually solves the problem |
| `/maister-reviews-production-readiness` | `[path] [--target=ENV]` | Pre-deployment verification with GO/NO-GO recommendation |
| `/maister-reviews-test-strategy` | `[test path or directory]` | Review whether test strategy matches production code problem class |
| `/maister-reviews-linguistic-boundaries` | `[modules or all or module --pr]` | Verify linguistic boundaries between bounded contexts via language.md |

### Quick Commands

| Command | Usage | Purpose |
|---------|-------|---------|
| `/maister-quick-plan` | `[task description]` | Enter planning mode with standards awareness from INDEX.md |
| `/maister-quick-dev` | `[task description]` | Implement directly with standards awareness (no planning) |
| `/maister-quick-bugfix` | `[bug description]` | Quick bug fix with TDD red/green gates and complexity escalation |

### Requirements & Modeling Commands

| Command | Usage | Purpose |
|---------|-------|---------|
| `/maister-quick-transcript-critic` | `[transcript or notes]` | Audit meeting transcript for decision-process problems; structured critique report |
| `/maister-quick-requirements-critic` | `[requirements text]` | Interactive requirements quality critique (4-check rubric) |
| `/maister-quick-problem-classifier` | `[business requirements]` | Classify requirements into modeling problem classes with clarifying questions |
| `/maister-quick-metaprogram-classifier` | `[utterance or email]` | Classify NLP metaprograms and suggest communication strategies |
| `/maister-modeling-context-distiller` | `[domain description or concepts]` | Distill bounded contexts via generalization analysis |
| `/maister-modeling-aggregate-designer` | `[RC domain description]` | Design consistency units for resource-contention problems |

**See**: Individual `commands/` and `skills/*/skill.md` files for detailed documentation.

## Available Subagents

Subagents are specialized AI agents invoked by skills and orchestrators. All agents are read-only unless specified.

### Initialization & Analysis Agents

| Agent | Purpose | Invoked By | Details |
|-------|---------|------------|---------|
| `project-analyzer` | Deep codebase analysis for tech stack, architecture, conventions | `/maister-init` | `agents/project-analyzer.md` |
| `docs-operator` | Internal service agent: executes docs-manager operations mid-workflow via subagent tool. Has docs-manager skill preloaded. **Special case**: companion agent pattern only works here because docs-manager does NOT spawn subagents (only file operations). Do not use this pattern for skills that spawn subagents. | init, standards-update, standards-discover | `agents/docs-operator.md` |
| `task-classifier` | Classifies task descriptions into **5 workflow types** (development, performance, migration, research, product-design) with confidence scoring. Not to be confused with `problem-classifier` skill (4 DDD modeling problem classes). | `/work` command | `agents/task-classifier.md` |
| `gap-analyzer` | Compares current vs desired state with characteristic-detection-based analysis modules | development orchestrator | `agents/gap-analyzer.md` |
| `specification-creator` | Creates specs from gathered requirements with reusability search and self-verification | development, migration orchestrators | `agents/specification-creator.md` |
| `implementation-planner` | Breaks specs into task groups with test-driven steps and dependency chains | development, migration orchestrators | `agents/implementation-planner.md` |
| `codebase-analysis-reporter` | Merges raw maister-explore agent findings into structured analysis report with deduplication, cross-referencing, and risk assessment | codebase-analyzer skill | `agents/codebase-analysis-reporter.md` |

**Deprecated Agent**:
- `existing-feature-analyzer` → Replaced by `codebase-analyzer` skill (uses adaptive parallel maister-explore subagents)

### UI & Documentation Agents

| Agent | Purpose | Invoked By | Details |
|-------|---------|------------|---------|
| `ui-mockup-generator` | ASCII mockups showing UI integration with existing layouts | development orchestrator (feature/enhancement), product-design orchestrator (Phase 7 ASCII fallback) | `agents/ui-mockup-generator.md` |
| `e2e-test-verifier` | Runtime browser verification via Playwright MCP tools (not test file generation) | development orchestrator (optional) | `agents/e2e-test-verifier.md` |
| `user-docs-generator` | User documentation with Playwright screenshots | development orchestrator (optional) | `agents/user-docs-generator.md` |
| `html-companion-writer` | Generates an HTML companion report from one finalized markdown artifact (style-guide compliant). For orchestrators that write artifacts inline and have no producing subagent to attach a companion to. | product-design orchestrator (Phases 5/6/8) | `agents/html-companion-writer.md` |

### Performance Agents

| Agent | Purpose | Invoked By | Details |
|-------|---------|------------|---------|
| `bottleneck-analyzer` | Static code analysis detecting N+1 queries, missing indexes, O(n^2) algorithms, blocking I/O, memory leak patterns. Optionally incorporates user-provided profiling data. | performance orchestrator | `agents/bottleneck-analyzer.md` |

### Research Agents

| Agent | Purpose | Invoked By | Details |
|-------|---------|------------|---------|
| `research-planner` | Creates methodology and identifies sources | research orchestrator | `agents/research-planner.md` |
| `information-gatherer` | Multi-source data collection with citations | research orchestrator, product-design orchestrator (Phase 1 mini-research) | `agents/information-gatherer.md` |
| `research-synthesizer` | Pattern identification, insights generation | research orchestrator | `agents/research-synthesizer.md` |
| `solution-brainstormer` | Solution alternatives with multi-perspective trade-off analysis | research orchestrator, product-design orchestrator | `agents/solution-brainstormer.md` |
| `solution-designer` | High-level C4 architecture design and ADR documentation | research orchestrator | `agents/solution-designer.md` |

### Verification Agents

| Agent | Purpose | Invoked By | Details |
|-------|---------|------------|---------|
| `implementation-completeness-checker` | Plan completion + standards compliance + documentation completeness | implementation-verifier | `agents/implementation-completeness-checker.md` |
| `test-suite-runner` | Runs full test suite, analyzes results, flags regressions | implementation-verifier | `agents/test-suite-runner.md` |
| `code-reviewer` | Automated code quality, security, performance analysis | implementation-verifier, standalone command | `agents/code-reviewer.md` |
| `production-readiness-checker` | Pre-deployment verification with GO/NO-GO recommendation | implementation-verifier, performance orchestrator, standalone command | `agents/production-readiness-checker.md` |

### Review & Audit Agents

| Agent | Purpose | Invoked By | Details |
|-------|---------|------------|---------|
| `code-quality-pragmatist` | Detects over-engineering, ensures scale-appropriate code | implementation-verifier | `agents/code-quality-pragmatist.md` |
| `spec-auditor` | Independent spec audit with senior auditor perspective | orchestrators | `agents/spec-auditor.md` |
| `reality-assessor` | Validates work actually solves the problem | implementation-verifier | `agents/reality-assessor.md` |

**See**: Individual `agents/*.md` files for detailed workflows and philosophies.

