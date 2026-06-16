# Documentation Index

**IMPORTANT**: Read this file at the beginning of any development task to understand available documentation and standards.

## Quick Reference

### Project Documentation
Project-level documentation covering vision, goals, architecture, and technology choices.

### Technical Standards
Coding standards, conventions, and best practices organized by domain.

---

## Project Documentation

Located in `.maister/docs/project/`

### Vision (`project/vision.md`)
*Pending generation.* Will define the project's mission, goals, target users, and long-term vision.

### Roadmap (`project/roadmap.md`)
*Pending generation.* Will outline development milestones, planned features, and timeline.

### Tech Stack (`project/tech-stack.md`)
Multi-platform AI SDLC plugin marketplace technology choices: Markdown-as-code for skills, commands, agents, and docs (~70% of artifacts); Bash build/transform scripts; JSON plugin manifests and MCP config; YAML GitHub Actions CI; minimal Node.js ESM for product-design visual companion. Plugin Platform APIs for Claude Code (source of truth in `plugins/maister/`), GitHub Copilot CLI, Cursor Agent, and Kiro CLI (generated variants). Makefile orchestration (`build`, `validate`, `watch`); sed-based platform transforms; structural validation via `make validate` and smoke tests; Playwright MCP for E2E verification. No database, containerization, or traditional frontend/backend frameworks. Distribution via Claude Code marketplace, local Cursor install, and isolated Kiro `KIRO_HOME` profile; semantic versioning with master/beta branch workflow.

### Architecture (`project/architecture.md`)
*Pending generation.* Will describe system architecture, component structure, data flow, and design patterns.

---

## Technical Standards

### Global Standards

Located in `.maister/docs/standards/global/`

These standards apply across the entire codebase, regardless of frontend/backend context.

#### Error Handling (`standards/global/error-handling.md`)
Structured error types, error propagation patterns, user-facing vs internal error messages, try-catch placement guidelines, error logging conventions.

#### Validation (`standards/global/validation.md`)
Input validation at system boundaries, sanitization patterns, validation error message formatting, schema validation approach.

#### Conventions (`standards/global/conventions.md`)
Naming conventions, file organization, documentation-first workflow, INDEX.md discovery, standards adherence, specification and planning before implementation, environment variables, version control, testing requirements.

#### language.md Convention (`standards/global/language-md-convention.md`)
Per-module ubiquitous language documentation for bounded contexts. Defines `language.md` location, template sections, DDD relationship types, and optional adoption. Used by `linguistic-boundary-verifier` for cross-context language leakage detection.

#### Coding Style (`standards/global/coding-style.md`)
Indentation and formatting rules, spacing conventions, line length limits, bracket style, consistent code readability patterns.

#### Commenting (`standards/global/commenting.md`)
When to comment (non-obvious logic only), documentation comment format, inline explanation guidelines, TODO/FIXME conventions.

#### Minimal Implementation (`standards/global/minimal-implementation.md`)
No speculative code, no unused methods, no "just in case" abstractions, YAGNI principle enforcement, lean code guidelines.

#### Plugin Development (`standards/global/plugin-development.md`)
Source-only edits in `plugins/maister/` with `make build`; kebab-case agents/skills/commands; agent and skill frontmatter schemas; thin command wrappers; SKILL.md as single source of truth; principles over prescriptive implementations; plugin directory layout; backtick path cross-references; task directory naming and artifact placement; user-confirmed rollback; mandatory Maister workflow execution; docs-operator companion pattern scope.

#### Build Pipeline (`standards/global/build-pipeline.md`)
Platform-specific command/agent naming transforms (source `maister:`, Copilot plain, Cursor `maister-` hyphenated); flat command layout; platform instruction file mapping (CLAUDE.md, copilot-instructions.md, AGENTS.md); Cursor manifest, MCP, and hooks contracts; destructive shell command guards; Copilot/Cursor API bans; Bash fail-fast and cross-platform sed; CI build/validate gates; auto-rebuild and tag-triggered release; git ignore local artifacts.

---

### Frontend Standards

*Not initialized for this project. If you need frontend standards, you can:*
- *Add them manually using the docs-manager skill*
- *Run `/maister-standards-discover --scope=frontend` to auto-discover*

---

### Backend Standards

*Not initialized for this project. If you need backend standards, you can:*
- *Add them manually using the docs-manager skill*
- *Run `/maister-standards-discover --scope=backend` to auto-discover*

---

### Testing Standards

Located in `.maister/docs/standards/testing/`

These standards apply to all testing code (unit, integration, E2E).

#### Test Writing (`standards/testing/test-writing.md`)
Test behavior focus, clear naming, mocking external dependencies, fast execution, risk-based testing, coverage balance, critical path focus, structural validation via `make validate`, Playwright MCP for E2E, CLI smoke tests, TDD red/green gates for bug fixes, incremental and full-suite verification, read-only test verifier agents, test-before-implementation ordering.

---

## How to Use This Documentation

1. **Start Here**: Always read this INDEX.md first to understand what documentation exists
2. **Project Context**: Read relevant project documentation before starting work
3. **Standards**: Reference appropriate standards when writing code
4. **Keep Updated**: Update documentation when making significant changes
5. **Customize**: Adapt all documentation to your project's specific needs

## Updating Documentation

- Project documentation should be updated when goals, tech stack, or architecture changes
- Technical standards should be updated when team conventions evolve
- Always update INDEX.md when adding, removing, or significantly changing documentation

---

**Last Generated**: 2026-06-07
**Maintained by**: Documentation Manager skill
