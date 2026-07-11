# Maister Plugin

This plugin provides AI-powered Software Development Lifecycle (SDLC) capabilities for Claude Code projects.

## Purpose

The Maister plugin helps teams streamline software development workflows by providing:

- **Workflow Commands**: Slash commands for common SDLC tasks like feature development, bug fixes, and code reviews
- **Specialized Agents**: AI agents optimized for specific development tasks (spec writing, implementation, verification)
- **Skills**: Reusable capabilities for managing standards, documentation, and development workflows
- **Coding Standards**: Project-level standards and best practices that can be customized and enforced

## Installation

Install this plugin in your project to gain access to structured development workflows and standards management.

## Features

- Step-by-step guided development workflows
- Automated task planning and tracking
- Reusable skills for common development tasks
- Customizable coding standards
- Verification and quality assurance capabilities

## Critical Principle: User-Confirmed Rollback

**NEVER automatically rollback or revert code changes without user confirmation.**

All workflows in this plugin follow this pattern when failures occur:

1. **STOP** - Don't attempt automatic fixes for critical failures
2. **ANALYZE** - Examine the root cause (config issue? test setup? actual logic error?)
3. **CHECK FOR EASY FIXES** - Often failures are simple config/setup issues
4. **ASK USER** - → **CHAT GATE** — Present the question in chat with options:
   - "Try suggested fix" (if easy fix identified)
   - "Rollback changes" (user confirms rollback)
   - "Let me investigate" (pause for manual investigation)
5. **EXECUTE** - Only perform rollback if user explicitly confirms

**Rationale**: Automatic rollback discards potentially valid work, hides root causes, and frustrates users. Many failures are simple configuration issues with easy 1-line fixes.

## Workflow Types Supported

This plugin supports 4 workflow types that route to specialized orchestrators:

| Workflow Type | Purpose | Orchestrator | Classification Keywords |
|---------------|---------|-------------|------------------------|
| **Development** | Bug fixes, enhancements, new features | development | "fix", "bug", "add", "new", "improve", "enhance", "create" |
| **Performance** | Optimize speed/efficiency | performance | "slow", "optimize", "speed up", "faster" |
| **Migration** | Move tech/patterns | migration | "migrate", "move from X to Y", "upgrade" |
| **Research** | Investigate and document findings | research | "research", "investigate", "explore options" |
| **Product Design** | Design features/products before building | product-design | "design", "product design", "feature design", "wireframe", "prototype" |

### Design Principles

- **Adaptive Phases**: The development orchestrator's phases activate based on detected task characteristics, not predetermined types
- **Characteristic Detection**: The gap-analyzer detects whether a task involves reproducible defects, existing code modifications, new capabilities, data operations, or UI changes
- **Flexible Granularity**: Complex steps can have substeps when needed
- **Consistent Core**: All workflows share planning, specification, implementation, and verification phases
- **Conditional Stages**: Phases activate based on context (e.g., TDD gates when defects detected, UI mockups when UI-heavy)

## Terminology

To avoid confusion, this plugin uses specific terminology:

**Development Task** (or simply "Task")
- The high-level work item: a bug fix, new feature, enhancement, refactoring, etc.
- Represents the overall piece of work from start to finish
- Located in: `.maister/tasks/[workflow-type]/YYYY-MM-DD-task-name/`
- Contains: specification, requirements, implementation plan, and verification results

**Implementation Step** (or "Implementation Task")
- Specific actionable steps executed during the implementation phase
- The detailed breakdown of HOW to build the development task
- Listed in: `implementation-plan.md` within each development task folder
- Example: "1.1 Create User model", "2.3 Write API endpoint", "3.5 Add form validation"

**Key Distinction**: A "development task" is WHAT to build (the feature/fix), while "implementation steps" are HOW to build it (the specific actions).

## User-Centric Development Focus

This plugin prioritizes usability and user experience throughout development:

### User Journey Analysis

**During Requirements Gathering** (when creating new capabilities):
- Asks how users will discover the feature
- Identifies target personas (admin, regular user, power user, etc.)
- Maps feature into existing workflows
- Documents access patterns and navigation paths

**During Gap Analysis** (when modifying existing features):
Comprehensive analysis ensuring complete, usable features:

**User Journey Impact Assessment**:
- **Feature Reachability**: Current vs new access paths, dead end analysis, discoverability scoring (1-10 scale)
- **Multi-Persona Analysis**: Per-persona workflow impact assessment with value/learning curve metrics
- **Flow Integration**: How enhancement fits existing workflows without disruption
- **Navigation Consistency**: Alignment with app-wide UI/navigation patterns
- **Discoverability Before/After**: Quantified improvement metrics showing usability impact

**Data Entity Lifecycle Analysis**:
- **Three-Layer Verification Framework**: Backend capability + UI component + User accessibility (all required)
- **Backend ≠ User Operability**: API endpoints alone don't confirm users can actually perform operations
- **Orphaned Display Detection**: Flags features that display data with no way to input it (useless feature)
- **Orphaned Input Detection**: Flags data capture with nowhere to view/use it (user frustration)
- **Layer 3 Critical Checks**: Component rendering, page routing, navigation access, permissions
- **Multi-Touchpoint Discovery**: Finds ALL places where data should appear, not just user-mentioned locations
- **CRUD Completeness**: Ensures data has complete lifecycle with verified user accessibility
- **Scope Expansion Recommendations**: Suggests phased approach when critical gaps found
- **Safety-Critical Awareness**: Heightened analysis for healthcare, finance, legal domains

**Why This Matters**:
- Prevents orphaned features that users can't find
- Ensures logical user flows and navigation
- Identifies discoverability issues early
- Analyzes impact from multiple persona perspectives
- Documents navigation integration concerns
- **Prevents incomplete features**: Catches "display allergy info" requests that lack input mechanisms
- **Ensures safety**: Identifies missing critical touchpoints (e.g., allergies in prescription workflow)

**Real-World Example**:
User requests: "Display allergy info on patient summary"

*Without data lifecycle analysis*:
- ✅ Implements display component
- ❌ No way to input allergies (feature useless)
- ❌ Missing from prescription workflow (safety issue)

*With data lifecycle analysis*:
- ⚠️ Detects orphaned display (no input mechanism)
- ⚠️ Discovers 5 additional critical touchpoints (prescriptions, appointments, emergencies)
- ✅ Recommends phased approach: Phase 1 (input + 3 critical displays), Phase 2 (remaining displays), Phase 3 (edit/delete)
- ✅ Result: Complete, safe, usable feature

**Output**: Ensures features are discoverable, accessible, complete, and logically integrated into the application

### ASCII Mockup Generation

For UI-heavy features/enhancements, the plugin can generate ASCII mockups:
- Shows how new UI integrates with existing layout structure
- Identifies reusable components from current codebase
- Visualizes navigation patterns and placement
- Annotates with actual component file references
- Ensures consistency with existing app patterns

**When Used**:
- Optional phase in development workflow
- Auto-triggered when `task_characteristics.ui_heavy` is true
- Invoked automatically by development orchestrator

**Output**: `analysis/design-context/ascii/ui-mockups.md` with ASCII diagrams, plus stable screen/component IDs appended to `analysis/design-context/INDEX.md`

**Example**:
```
┌──────────────────────────────────────┐
│ Toolbar: [Existing] [Buttons] [NEW] │
│          └─ Integration point here   │
└──────────────────────────────────────┘
```

**Benefits**:
- Visualize layout before implementation
- Ensure consistency with existing UI
- Identify reusable components early
- Prevent navigation confusion
- No external design tools needed

## Structure Organization

### Separation of Concerns

This plugin separates reference documentation from work items:

**`.maister/docs/`** - Reference documentation (stable)
- Project vision, roadmap, tech stack
- Coding standards and conventions
- Architecture documentation
- Read these to understand the project

**`.maister/tasks/`** - Work items (active, growing)
- Individual development tasks
- Feature implementations, bug fixes, etc.
- Active work in progress
- Create/reference these when building

**Why separate?**
- Keeps INDEX.md focused on project understanding (not task lists)
- Better scalability (tasks grow independently from docs)
- Clearer navigation (docs = learn, tasks = work)
- Different lifecycle (docs = stable reference, tasks = active work)

## Documentation & Task Organization

### Project Documentation Structure

The maister plugin uses this structure:

```
.maister/
├── config.yml                    # Project configuration (optional; scaffolded by /maister-init)
├── docs/                         # Reference documentation (stable)
│   ├── INDEX.md                 # Master index - READ THIS FIRST
│   ├── project/                 # Project-level documentation
│   │   ├── vision.md           # Project vision and goals
│   │   ├── roadmap.md          # Development roadmap
│   │   ├── tech-stack.md       # Technology choices and rationale
│   │   └── architecture.md     # System architecture (optional)
│   └── standards/               # Technical standards and conventions
│       ├── global/             # Language-agnostic standards
│       ├── frontend/           # Frontend-specific standards
│       ├── backend/            # Backend-specific standards
│       └── testing/            # Testing standards
└── tasks/                        # Development tasks (active, growing)
    ├── development/
    ├── performance/
    ├── migrations/
    ├── research/
    └── product-design/
```

**Core Principle**:
- Reference documentation in `.maister/docs/` is the source of truth for understanding the project
- Always read `docs/INDEX.md` first to understand available documentation and standards
- Development tasks live separately in `.maister/tasks/` for better organization and scalability

### Project Configuration (`.maister/config.yml`)

An optional project-level config file holds defaults that apply to every workflow. `/maister-init` scaffolds it with documented defaults; orchestrators read it at initialization and fall back to defaults when it is absent (so existing projects are unaffected).

```yaml
html_output: true   # Generate the operator dashboard + HTML companion reports. false = markdown-only.
advisor:
  enabled: false
  gate_policies: {}          # gate_type -> manual | advisor | fully_automatic
  advisor_agent: advisor
  advisor_model: null
  arbiter_agent: advisor
  arbiter_model: null
  arbiter_enabled_on_disagreement: true
  retry:
    advisor_attempts: 3
    arbiter_attempts: 3
    backoff: exponential
```

- **`html_output`** (default `true`): when `false`, workflows skip the operator dashboard (`dashboard.html`/`dashboard-data.js`, no browser auto-open) AND the HTML companion reports (`.html` twins). Markdown artifacts, their `## TL;DR` summary blocks, `orchestrator-state.yml`, and product-design's visual mockups are produced regardless. The value is read once at init and seeded into `orchestrator.options.html_output` in state.

- **`advisor`** (default disabled): configures per-gate `manual`, `advisor`, or `fully_automatic` handling. Advisor and arbiter responses are read-only recommendations recorded in `orchestrator.gate_history`; they never authorize source changes. The hard safety denylist and the explicit implementation-approval gate always require user control. See `skills/orchestrator-framework/references/orchestrator-patterns.md` § 2.2.

**See**: `skills/orchestrator-framework/references/orchestrator-patterns.md` § 4 "Project Configuration" for the read/seed/gate mechanism.

### Development Task Organization

Development tasks are organized by workflow type in `.maister/tasks/`:

```
.maister/tasks/
├── development/
│   └── YYYY-MM-DD-task-name/
├── performance/
│   └── YYYY-MM-DD-task-name/
├── migrations/
│   └── YYYY-MM-DD-task-name/
├── research/
│   └── YYYY-MM-DD-task-name/
└── product-design/
    └── YYYY-MM-DD-task-name/
```

**Benefits of workflow-based organization:**
- Clear routing to orchestrator
- Date-prefixed naming provides chronological sorting
- Scales well to 100s of tasks

### Base Task Structure

Each development task follows a common structure with core directories:

```
YYYY-MM-DD-task-name/
├── orchestrator-state.yml        # Execution state and task metadata
├── dashboard.html                # Operator dashboard (copied plugin asset — never model-generated)
├── dashboard-data.js             # Dashboard data projection (rewritten after each phase/gate)
├── analysis/                     # Analysis and planning artifacts
│   ├── research-context/        # From research (if --research provided)
│   │   └── research-report.md   # Full research findings
│   ├── design-context/          # Mockups and design artifacts (when present — see below)
│   │   ├── mockups/             # HTML/PNG/screenshots (from product-design or inline prompt refs)
│   │   ├── ascii/               # ASCII mockups generated by ui-mockup-generator
│   │   ├── brief.md             # Product brief (when handed off from product-design task)
│   │   ├── external-links.md    # Figma/Sketch/Zeplin URLs
│   │   └── INDEX.md             # Screen/component inventory with stable IDs
│   └── requirements.md          # Gathered requirements
├── implementation/               # Implementation work
│   ├── spec.md                  # Main specification (WHAT to build)
│   ├── spec.html                # Operator-facing HTML companion
│   ├── implementation-plan.md   # Implementation steps breakdown (HOW to build)
│   ├── implementation-plan.html # Operator-facing HTML companion
│   ├── visual-coverage.md       # Coverage matrix (when design-context exists)
│   └── work-log.md              # Chronological activity log
├── verification/                 # Verification results
│   ├── spec-audit.md            # Independent spec audit (conditional, complex tasks only)
│   └── visual-fidelity.md       # Mockup-vs-rendered comparison (when design-context exists, report-only)
└── documentation/                # User-facing docs (if applicable)
```

### Operator Visibility Layer

Workflow artifacts accumulate deep detail for subagent context — the operator monitoring layer distills them:

1. **Artifact Summary Contract**: every markdown artifact opens with `## TL;DR` (max 5 lines) + `## Key Decisions` + `## Open Questions / Risks` (sections omitted when empty). Operators read the first 20 lines of any artifact; full detail follows unchanged.
2. **Operator Dashboard**: each task root carries `dashboard.html` (static plugin asset from `skills/orchestrator-framework/assets/`, never model-generated) + `dashboard-data.js` (terse projection of state, rewritten after each phase/gate). Open the HTML in a browser — phase timeline, decisions/risks, verification status, artifact deep-links; auto-refreshes every 5s, works from `file://` with no server.
3. **HTML Companion Reports**: high-value artifacts (spec, implementation plan, verification reports) get a rich HTML twin written by the same subagent that writes the md, following the shared style guide (`skills/orchestrator-framework/references/html-report-style.md`). The md stays the source of truth for subagents; HTML is for humans. Companions never block the workflow.

**See**: `skills/orchestrator-framework/references/orchestrator-patterns.md` § 7-9 for the full contracts and the `dashboard-data.js` schema.

**Design context** (`analysis/design-context/`) is auto-populated by the development orchestrator's Step 4 when:
- The argument is a product-design task path (mockups + brief copied in)
- The task description references mockup file paths (auto-ingested) or design-tool URLs (recorded)
- `task_characteristics.ui_heavy` is true and no external mockups exist (Phase 4 generates ASCII into `design-context/ascii/`)

When present, mockups are **binding inputs** to implementation — the planner attaches `Visual References` to UI task groups, the implementer reads each mockup before coding, and Phase 12 produces a structural visual-fidelity report. When no mockups exist, the entire `design-context/` directory is omitted and behavior is unchanged.

**See**: `skills/development/SKILL.md` § "Design-Informed Development" for the full propagation model.

Task types can add specialized subdirectories as needed (e.g., `analysis/bug-analysis/` for bug fixes, `implementation/metrics/` for performance tasks).

**Note**: The `implementation/implementation-plan.md` file contains implementation steps (the detailed breakdown of actions), created by the implementation-planner subagent after the specification is approved.

### Naming Conventions

**Workflow Type Directories:**
- Use workflow names: `development/`, `performance/`, `migrations/`, `research/`, `product-design/`

**Task Directories:**
- Format: `YYYY-MM-DD-task-name`
- Example: `2025-10-23-user-authentication`
- Example: `2025-10-23-fix-login-timeout`
- Date prefix enables chronological sorting
- Concise but descriptive name (3-5 words)

### Integration

- **Documentation Discovery**: Always read `.maister/docs/INDEX.md` before starting work to understand project context
- **Task Discovery**: Browse `.maister/tasks/` to find development tasks by workflow type
- **Standards Compliance**: Follow standards from `.maister/docs/standards/` during implementation
- **Task Tracking**: Task status, priority, tags, and time tracking are in the `task:` section of `orchestrator-state.yml`
- **Activity Logging**: Record work in `implementation/work-log.md` for transparency

## Plugin Documentation Principles

These principles guide how we document skills, commands, orchestrators, and agents in this plugin to avoid verbosity and duplication while trusting Claude to reason effectively.

### Philosophy

**Trust Claude to reason.** Provide principles and patterns, not prescriptive implementations. Claude can discover technical details from skill.md files when needed—AGENTS.md and commands should guide thinking, not dictate exact steps.

### Core Principles

1. **No Verbose Pseudocode** - Show conceptual patterns and decision frameworks, not complete implementations
2. **No Prescriptive Templates** - Guide thinking with principles, don't dictate exact prompts or scripts
3. **Avoid Duplication** - If technical details exist in skill.md, reference them in AGENTS.md/commands
4. **Commands as Thin Wrappers** - User-facing guidance in commands, technical orchestration logic in skills
5. **Single Source of Truth** - Orchestration logic lives in skill.md, not scattered across multiple files
6. **Principle Over Process** - Explain WHY and WHEN, trust Claude to figure out HOW

### Content Guidelines

Target lengths for different documentation types:

| Documentation Type | Target Length | Focus |
|-------------------|---------------|-------|
| Skill descriptions (in AGENTS.md) | 5-15 lines | Purpose, key capabilities, philosophy |
| Command descriptions (in AGENTS.md) | 3-8 lines | What it does, when to use |
| Orchestrator sections (in AGENTS.md) | 20-30 lines | Overview, key features, reference skill |
| Reference files (in skills/) | <1,000 lines | Conceptual patterns, not implementations |
| Agent files (in agents/) | 300-450 lines | Core mission, decision frameworks, workflow principles |
| Individual standards (### sections in standard files) | 1-10 lines (excluding code snippets) | ### heading + description + optional code example. Multiple standards per topic file. |

### When Adding New Content

Ask these questions before documenting:

1. **"Does this duplicate skill.md content?"** → Reference instead of duplicating
2. **"Am I providing exact implementation?"** → Simplify to principles
3. **"Would Claude need this spelled out?"** → Probably not, trust reasoning ability
4. **"Is this a manual or guidance?"** → Should be guidance, not manual

### Examples

**❌ Too Verbose** (Manual approach):
```markdown
**Process**:
1. Initialize: Check prerequisites, load state, validate inputs
2. Analyze: Parse task description, extract key entities, determine scope
3. Plan: Create task groups, define dependencies, set milestones
4. Execute: For each group: (a) run tests, (b) implement, (c) verify
5. Finalize: Generate report, update metadata, commit changes
```

**✅ Principle-Based** (Guidance approach):
```markdown
Orchestrates implementation from plan to verified code. Delegates each task group to subagent, maintains continuous standards discovery, follows test-driven approach.

**See**: `skills/implementation-plan-executor/SKILL.md` for execution model and technical details.
```

## Reference Documentation Guidelines

Reference files (`references/*.md`) in skills provide conceptual patterns and decision frameworks. They guide implementation rather than provide complete code.

### Purpose of References

References should answer:
- **WHAT** patterns to use (strategies, approaches)
- **WHEN** to apply them (decision criteria)
- **WHY** certain approaches work (rationale)
- **HOW** (conceptually) to structure solutions (high-level)

References should NOT contain:
- Complete function implementations
- Production-ready code (>10 lines)
- Extensive pseudocode implementations
- Framework-specific boilerplate

### Size Guidelines

| Reference Type | Target Size | Max Size | Token Budget |
|---------------|-------------|----------|--------------|
| Orchestrator phase reference | 600-800 lines | 1,000 lines | ~8K tokens |
| Algorithm pattern reference | 400-600 lines | 800 lines | ~6K tokens |
| Strategy/decision reference | 300-500 lines | 600 lines | ~4K tokens |

**Total per skill**: Aim for <3,000 lines across all references (~24K tokens)

### Content Structure

**✅ Good Reference Style** (Conceptual):
```markdown
### Algorithm: Feature Detection

**Purpose**: Locate existing files using multi-strategy search

**Strategy**:
1. **Filename search**: Extract nouns → Generate patterns → Glob search
2. **Code pattern search**: Detect tech hints → Search for patterns → Grep
3. **Scoring**: Combine filename match + directory + size + tests + usage

**Decision Criteria**:
- High confidence (>80%): Present top 3 matches
- Medium confidence (50-80%): Present top 5 with warnings
- Low confidence (<50%): Expand search or prompt user

**Output**: Ranked list with confidence scores
```

**❌ Bad Reference Style** (Implementation):
```python
def detect_feature_files(description, codebase_root):
    """Complete 100-line implementation"""
    tokens = tokenize(description)
    patterns = []
    for token in tokens:
        # 50+ lines of detailed logic
        patterns.append(generate_pattern(token))
    # More implementation details...
    return scored_results
```

### When to Use Code Examples

Acceptable scenarios for code examples (keep <10 lines):
- **Test patterns**: Show expected test structure
- **Configuration examples**: YAML/JSON structure samples
- **API usage**: Brief integration examples
- **Decision pseudocode**: If-then logic (5-10 lines max)

### Review Checklist

Before finalizing reference documentation:

✓ Does this explain WHAT/WHEN/WHY rather than implement HOW?
✓ Are code examples <10 lines and conceptual?
✓ Is total file size under target guidelines?
✓ Could an experienced developer implement from this guide?
✓ Is it tool/framework agnostic where possible?
✓ Does it focus on patterns over implementation?

### Philosophy

**References are maps, not detailed instructions.**
- Maps show landmarks, routes, decision points
- Instructions show every step, every turn
- Skills/agents follow the map to create their own path

## Orchestrator Creation Guidelines

When creating or auditing orchestrators, follow the patterns established in existing orchestrators and consult the framework reference files.

**See**: `skills/orchestrator-framework/references/orchestrator-creation-checklist.md` for the complete creation checklist and anti-patterns.
**See**: `skills/orchestrator-framework/references/orchestrator-patterns.md` for execution rules, schemas, and patterns.

## Catalog Reference

For the full listing of available skills, commands, and subagents, read:
`skills/maister-orchestrator-framework/references/catalog.md`

Key facts (always available without reading catalog):
- **5 orchestrator workflows**: development, performance, migration, research, product-design
- **Delegation**: skills via `/maister-*` slash, agents via subagent tool
- **Bundles**: A (requirements quality), B (DDD modeling), C (architecture review), D (stakeholder communication)

## Key Workflow Principles

1. **Documentation First**: Always check docs/INDEX.md before and during work
2. **Specification Before Implementation**: Create clear specs before coding
3. **Planning Before Execution**: Break implementation into manageable steps
4. **Test-Driven Approach**: Write tests first, implement, then verify
5. **Continuous Standards Discovery**: Check standards throughout, not just at start
6. **Incremental Verification**: Run only new tests after each group, not entire suite
7. **Comprehensive Verification Before Commit**: Run full test suite and create verification report before code review
8. **Task Directory Artifact Anchoring**: ALL workflow artifacts (reports, documentation, screenshots) MUST be saved under the task directory (`.maister/tasks/[type]/[task-name]/`). NEVER save task artifacts to project directories like `docs/`, `src/`, or project root.

**For detailed workflow documentation, see**: individual skill `SKILL.md` files

## Progress Tracking (TUI)

All orchestrators use `todo`/`todo` for real-time progress visibility at two levels:

### Orchestrator Phase Tracking

- At workflow start: `todo` for all phases (pending), then `todo ordering in todo list` for phase dependencies
- At each phase: `todo` to `in_progress` (shows spinner with `activity description in content`) → execute → `todo` to `completed`
- Optionally set `owner` when delegating to skills/agents, and `metadata` for timing/artifacts
- State file (`orchestrator-state.yml`) is source of truth for resume logic
- TUI task list mirrors state for UX and provides dependency visualization

### Implementation Task Group Tracking

- At planning: `todo` for each task group with `Dependencies` AND `Files to Modify` declared in `implementation-plan.md`
- During execution: executor computes parallel waves from dependencies + file overlap, then dispatches all groups in a wave concurrently via parallel `Task` tool calls. The `--sequential` flag (read from `orchestrator-state.yml` as `orchestrator.options.sequential`) forces the legacy one-at-a-time loop
- `todo` to `in_progress` on wave dispatch → execute → `todo` to `completed` on each group's return
- Markdown checkboxes in `implementation-plan.md` remain the step-level source of truth
- TUI task list provides group-level visibility with dependencies, timing, ownership, and wave membership

See individual orchestrator `skill.md` files for phase-specific task tables.

## Hooks

The plugin includes hooks that fire at specific Claude Code lifecycle events.

### Post-Compaction State Reminder

**Hook**: `SessionStart` (matcher: `compact`)
**Location**: `hooks/post-compact-reminder.sh`

This hook fires after context compaction and injects a reminder into Claude's context to check the `orchestrator-state.yml` file for the active workflow.

**Purpose**: Reminds Claude to check `orchestrator-state.yml` for completed phases and → **CHAT GATE** — Present the question in chat at phase gates after compaction, regardless of any "continue without asking" instructions in the compacted context.

**See**: `agents/maister.json (embedded hooks)` for hook configuration (auto-discovered by Claude Code).

### Destructive Command Protection

**Hook**: `PreToolUse` (matcher: `Bash`)
**Location**: `hooks/block-destructive-commands.sh`

Blocks destructive shell commands (`git stash`, `git reset --hard`, `git checkout .`, `git clean`, `git push --force`, `rm -rf`) from subagents that should not perform such operations. Uses a whitelist approach — only explicitly trusted execution agents bypass the check:

**Unprotected agents** (full Bash access): `test-suite-runner`, `e2e-test-verifier`, `user-docs-generator`, `docs-operator`

`task-group-implementer` is **not** whitelisted. It runs implementation code under the same destructive-command guard as ordinary agents to prevent rogue `git stash` / `reset --hard` from clobbering sibling implementers in a parallel wave (see "Implementation Task Group Tracking" above).

All other agents and the main agent pass through normally. When adding a new agent that needs full Bash access, add it to the `case` statement in the hook script.

## Kiro CLI Documentation

**IMPORTANT**: Always consult the latest Claude Code documentation when working with plugins and skills. The documentation is regularly updated with new features, best practices, and implementation details.

### Essential Reading

Before working with this plugin, read the following up-to-date documentation:

1. **Plugins Overview**: https://kiro.dev/docs/cli/custom-agents/
   - Understanding plugin architecture and capabilities
   - How plugins extend Claude Code functionality
   - Plugin installation and configuration

2. **Skills Documentation**: https://kiro.dev/docs/cli/custom-agents/creating
   - How to create and use skills effectively
   - Skill best practices and patterns
   - Skill discovery and invocation

3. **Plugins Reference**: https://kiro.dev/docs/cli/custom-agents/-reference
   - Complete plugin API reference
   - Plugin structure and requirements
   - Available plugin features and hooks

4. **Sub-agents/Agents documentation**: https://kiro.dev/docs/cli/reference/built-in-tools https://kiro.dev/docs/cli/custom-agents/-reference#agents
   - Sub-agent architecture and capabilities
   - Agent definition and tool access

5. **Built-in tools** available for usage: https://gist.github.com/bgauryy/0cdb9aa337d01ae5bd0c803943aa36bd

### Documentation Priority

When implementing or modifying plugin features:
1. **Current official documentation** (links above) - Always check for latest updates
2. **Project-specific documentation** (this file and .maister/docs/)
3. **Code patterns** in this plugin's codebase
4. **General best practices**

**Note**: Claude Code is actively developed. Always verify implementation details against the current documentation before making changes.

## Platform: Kiro CLI

This is the Kiro CLI variant. Key differences from Claude Code:
- **Command names**: Prefix `maister-foo` (e.g. `/maister-development`); install to `KIRO_HOME` (~/.kiro-maister)
- **Project instructions file**: Use `AGENTS.md` instead of `AGENTS.md`, plus `.kiro/steering/maister-docs.md` after init
- **User questions**: Chat-native **CHAT GATE** — present options in chat and wait for reply (no AskQuestion tool)
- **Headless gates**: `--no-interactive` may use a documented default only for a non-protected gate; unsupported automatic injection, denylisted gates, and implementation approval persist `blocked` rather than approving.
- **UI**: Terminal UI (Kiro CLI default); activity tray (`Ctrl+X`) and crew monitor (`Ctrl+G`)
- **Progress tracking**: `todo` tool mirrors phases in activity tray (`Ctrl+X`); subagents in crew monitor (`Ctrl+G`)
- **Planning**: File-based plans in `.maister/plans/` with chat gates (no EnterPlanMode)
- **Subagents**: Custom `maister-explore` agent; other agents referenced as `maister-*`
- **Hooks**: Embedded in `agents/maister.json`; scripts at profile-root `hooks/` (`~/.kiro-maister/hooks/*.sh`; `smoke-install.sh` rewrites to `$DEST/hooks/` for non-default installs)
- **preCompact gap**: Kiro has no `preCompact` hook — use `orchestrator-state.yml` + `@status` / `@resume`; `hooks/post-compact-reminder-stub.sh` is documented only (not wired)
- **Slash shortcuts**: `/dev`, `/work`, `/research`, `/quick-dev`, etc. — shortcut skills in `skills/` that delegate to full `/maister-*` skills
- **MCP**: `settings/mcp.json` (enable Playwright for `--e2e` workflows). Empirical: `kiro-cli settings mcp.includeMcpJson true` (verify vs `useLegacyMcpJson` for your CLI version)
- **Orchestrator**: `maister-kiro chat --agent maister` or `kiro-cli chat --agent maister`

### Kiro CLI Documentation

- Custom agents: https://kiro.dev/docs/cli/custom-agents/
- Hooks: https://kiro.dev/docs/cli/hooks
- Built-in tools: https://kiro.dev/docs/cli/reference/built-in-tools
