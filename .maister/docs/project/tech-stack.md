# Technology Stack

## Overview

Maister is a documentation-as-code plugin system. Most behavior is expressed as Markdown instructions and YAML state contracts, transformed by portable shell tooling into native plugin variants for multiple AI coding hosts. Small JavaScript ESM components provide runtime continuation and visual-companion behavior.

## Languages and Artifact Formats

### Markdown with YAML Frontmatter

- **Usage**: Primary repository format for skills, agents, commands, references, standards, and user documentation
- **Rationale**: Human-readable, versionable, portable across AI coding hosts, and suitable for declarative workflow contracts
- **Key features used**: Structured headings, templates, cross-references, command wrappers, skill metadata, and agent metadata

### Bash and POSIX-Oriented Shell

- **Usage**: Build transforms, installation, validation, smoke tests, and release support
- **Rationale**: Available in target developer environments and effective for filesystem-oriented plugin generation
- **Key features used**: Fail-fast execution, functions, temporary files, traps, pipelines, fixture setup, and macOS/Linux compatibility branches

### JavaScript ESM on Node.js

- **Usage**: Workflow continuation and the product-design visual companion server
- **Rationale**: Provides portable process, HTTP, filesystem, path, and cryptographic primitives without a large application framework
- **Key features used**: `node:http`, `node:fs`, `node:path`, and `node:crypto`

### JSON, YAML, and TOML

- **Usage**: Plugin manifests, marketplaces, MCP configuration, workflow state, GitHub Actions, project configuration, and Codex agent configuration
- **Rationale**: These are the native configuration formats of the supported hosts and automation systems

### HTML, CSS, and MDC

- **Usage**: Operator dashboards, visual companion output, and Cursor-native rules
- **Rationale**: Lightweight presentation and host-native rule delivery without a frontend framework

## Frameworks

### Frontend

No frontend application framework is used. HTML and CSS assets are generated or served directly where visual output is needed.

### Backend

No backend framework is used. Runtime services use Node.js built-in modules.

### Testing

- Shell contract tests (`*.test.sh`)
- Fixture-driven YAML, TOML, JSON, and generated-file validation
- Structural assertions against generated platform variants
- Host-specific installation, smoke, and end-to-end scripts
- `make validate` as the primary full quality gate
- Optional Playwright MCP integration for browser-oriented verification

## Database

No database, ORM, or persistent service is used. Workflow state is stored as project-local YAML, primarily `orchestrator-state.yml`; reports and dashboards are derived projections.

## Build Tools and Package Management

- **GNU Make**: Coordinates build, validation, and watch workflows.
- **Platform build scripts**: `platforms/cursor/build.sh`, `platforms/kiro-cli/build.sh`, and `platforms/codex-cli/build.sh` generate native variants.
- **Text and data tooling**: `sed`, `awk`, `grep`, `find`, and `jq` perform transforms and validation.
- **Package management**: There is no root package manifest or lockfile. Optional Node-based tools may be invoked with `npx`.

## Infrastructure

### Containerization

No Docker, Kubernetes, or infrastructure-as-code layer is present.

### CI/CD

GitHub Actions provides:

- generated-variant drift validation on pushes and pull requests;
- tag-triggered releases using `softprops/action-gh-release@v2`;
- periodic non-blocking Cursor CLI smoke checks.

### Distribution

- Claude Code plugin marketplace
- Codex CLI/IDE local marketplace and native plugin layout
- Cursor Agent plugin/CLI layout
- Kiro CLI custom agents and skills

## Development Tools

### Linting and Formatting

There is no general ESLint, Prettier, or equivalent formatter configuration. Repository-specific structural validation, shell checks, deterministic builds, and diff checks enforce the relevant contracts.

### Type Checking

No static type checker is configured. JavaScript runtime components are intentionally small and use Node.js built-ins.

## Key Dependencies

- Node.js runtime for ESM continuation and visual companion components
- GNU Make and standard shell tools for build orchestration
- `jq` for Kiro configuration generation and validation
- GitHub Actions maintained actions for checkout and releases
- Optional `@playwright/mcp` through `npx` for browser verification

## Version Management

The project uses semantic version tags and synchronizes version metadata across the canonical plugin, generated variants, and marketplace manifests. The repository follows a master/beta workflow with release automation and generated-output drift checks.

---

*Last Updated*: 2026-07-13
*Auto-detected*: Repository formats, build tools, runtime components, CI workflows, platform adapters, testing patterns, and version tags. Project purpose and priorities were confirmed during initialization.
