# Documentation Index

**IMPORTANT**: Read this file at the beginning of any development task to understand available documentation and standards.

## Quick Reference

### Project Documentation
Project-level documentation covering vision, goals, roadmap, architecture, and technology choices.

### Technical Standards
Coding standards, conventions, and best practices organized by domain.

---

## Project Documentation

Located in `.maister/docs/project/`

### Vision (`project/vision.md`)
Defines Maister as a safe, auditable, resumable multi-platform SDLC plugin; records its users, purpose, current state, platform-parity goals, Advisor/Arbiter safety principles, and expected evolution.

### Roadmap (`project/roadmap.md`)
Captures the current v2.2.1 feature baseline and analysis-derived priorities for runtime continuation coverage, Advisor/Arbiter assurance, platform parity, tool compatibility, reproducibility, semantic transforms, and governance.

### Tech Stack (`project/tech-stack.md`)
Documents the Markdown/YAML, Bash, JavaScript ESM, JSON, TOML, HTML/CSS, Make, shell-tool, GitHub Actions, and optional Playwright MCP stack, including testing, distribution, persistence, and version-management choices.

### Architecture (`project/architecture.md`)
Describes the canonical-plugin and deterministic multi-target adapter architecture, generated artifact ownership, orchestration and Advisor/Arbiter flows, build validation, external integrations, state persistence, configuration, and deployment model.

---

## Technical Standards

### Global Standards

Located in `.maister/docs/standards/global/`

#### Build Pipeline (`standards/global/build-pipeline.md`)
Canonical edits in `plugins/maister/`, host-specific adapters in `platforms/`, generated-target ownership, reproducible `make build` outputs, CI drift detection, and mandatory cross-platform `make build && make validate` before `v*` releases.

#### Coding Style (`standards/global/coding-style.md`)
Naming consistency, automatic formatting, descriptive names, focused functions, uniform indentation, dead-code removal, intentional compatibility, and DRY guidance.

#### Commenting (`standards/global/commenting.md`)
Self-explanatory code, sparing comments for non-obvious logic, and timeless comments rather than change logs.

#### Conventions (`standards/global/conventions.md`)
Project structure, current documentation, version-control hygiene, environment configuration, dependency discipline, reviews, test expectations, feature flags, changelogs, and avoiding speculative work.

#### Error Handling (`standards/global/error-handling.md`)
Actionable user errors, fail-fast checks, typed exceptions, boundary-level handling, graceful degradation, retry backoff, and resource cleanup.

#### language.md Convention (`standards/global/language-md-convention.md`)
Optional bounded-context language files, required glossary and integration sections, DDD relationship semantics, published APIs, adoption guidance, and linguistic-boundary verification.

#### Minimal Implementation (`standards/global/minimal-implementation.md`)
Called code only, clear purpose, removal of exploration artifacts and dead code, no future stubs, no speculative abstractions, and pre-commit caller review.

#### Validation (`standards/global/validation.md`)
Server and client validation responsibilities, early and specific failures, allowlists, type and format checks, sanitization, business-rule placement, and consistent enforcement.

### Frontend Standards

*Not initialized for this project. If you need frontend standards, you can:*

- *Add them manually using the docs-manager skill*
- *Run `/maister:standards-discover --scope=frontend` to auto-discover*

### Backend Standards

*Not initialized for this project. If you need backend standards, you can:*

- *Add them manually using the docs-manager skill*
- *Run `/maister:standards-discover --scope=backend` to auto-discover*

### Testing Standards

Located in `.maister/docs/standards/testing/`

#### Test Writing (`standards/testing/test-writing.md`)
Behavior-focused tests, descriptive naming, external-dependency mocks, fast execution, risk-based depth, critical-path protection, and transactional rejection tests that prove byte-exact state, permissions, and directory topology remain unchanged or are fully rolled back.

---

## How to Use This Documentation

1. **Start Here**: Always read this INDEX.md first to understand what documentation exists
2. **Project Context**: Read relevant project documentation before starting work
3. **Standards**: This index only points to the standards — open and follow the specific standard files relevant to your task; don't rely on the index alone
4. **Keep Updated**: Update documentation when making significant changes
5. **Customize**: Adapt all documentation to your project's specific needs

## Updating Documentation

- Project documentation should be updated when goals, tech stack, or architecture changes
- Technical standards should be updated when team conventions evolve
- Always update INDEX.md when adding, removing, or significantly changing documentation

---

**Last Generated**: 2026-07-13
**Maintained by**: Documentation Manager skill
