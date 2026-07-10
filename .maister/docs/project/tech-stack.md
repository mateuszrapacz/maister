# Technology Stack

## Overview

This document describes the technology choices and rationale for **Maister** — a Claude Code / Codex / Cursor Agent plugin marketplace that distributes AI-driven SDLC workflow plugins across multiple AI platforms from a single source of truth.

**Primary goal:** Maintain and evolve multi-platform AI SDLC plugins (skills, commands, agents, hooks) with consistent behavior across Claude Code, Codex, GitHub Copilot CLI, Cursor Agent, and Kiro CLI.

## Languages

### Markdown (Primary)
- **Usage**: ~70% of source artifacts (skills, agents, commands, references, docs)
- **Rationale**: Plugin logic is documentation-as-code — orchestration workflows, agent definitions, and user-facing commands are expressed as structured markdown consumed by AI platforms
- **Key Features Used**: Frontmatter metadata, phased workflow definitions, cross-references between skills/agents/commands

### Bash
- **Usage**: Build scripts, CI hooks, smoke tests (~12 files)
- **Rationale**: Platform transform pipelines (`platforms/*/build.sh`) use sed-based transforms without requiring a heavyweight build toolchain
- **Key Features Used**: Sed transforms, file copying, validation grep patterns

### JSON
- **Usage**: Plugin manifests, MCP configuration, hooks configuration
- **Rationale**: Native format for Claude Code and Cursor plugin manifests
- **Key Files**: `.claude-plugin/marketplace.json`, `plugins/maister/.claude-plugin/plugin.json`, `.mcp.json`

### YAML
- **Usage**: GitHub Actions CI/CD workflows
- **Rationale**: Standard format for GitHub Actions pipeline definitions

### JavaScript (ESM, minimal)
- **Usage**: Single file — product-design visual companion server
- **Rationale**: Lightweight HTTP server for browser-based design prototyping during product-design workflows
- **Key File**: `plugins/maister/skills/product-design/server/index.mjs`

## Frameworks

### Frontend
*Not applicable.* Maister is a plugin distribution repository, not a UI application. No React, Vue, Angular, or frontend build tools are used.

### Backend
*Not applicable.* No server application, API framework, or database layer. The only runtime code is a minimal Node.js HTTP server for the product-design visual companion.

### Plugin Platform APIs
| Platform | API | Variant Directory |
|----------|-----|-------------------|
| Claude Code | Plugin API (skills, commands, agents, hooks) | `plugins/maister/` (source of truth) |
| Codex CLI / IDE | Native plugin API (skills, hooks, MCP, marketplace) | `plugins/maister-codex/` (generated) |
| GitHub Copilot CLI | Copilot CLI Plugin API | `plugins/maister-copilot/` (generated) |
| Cursor Agent | Cursor Agent Plugin API | `plugins/maister-cursor/` (generated) |
| Kiro CLI | Kiro CLI agent/skills/hooks API | `plugins/maister-kiro/` (generated) |

### Testing
| Tool | Purpose |
|------|---------|
| `make validate` | Structural validation via grep patterns (20+ checks per platform variant) |
| `platforms/cursor/smoke-cli.sh` | Cursor CLI smoke tests |
| `platforms/cursor/smoke-install.sh` | Cursor plugin install smoke tests |
| `platforms/kiro-cli/smoke-cli.sh` | Kiro CLI headless smoke tests |
| `platforms/kiro-cli/smoke-install.sh` | Kiro isolated `KIRO_HOME` install |
| `platforms/codex-cli/smoke-cli.sh` | Codex plugin structural smoke tests |
| Playwright MCP (`@playwright/mcp`) | E2E browser verification via `e2e-test-verifier` agent |

*No unit test framework* (Jest, pytest, etc.) — validation is structural and smoke-based by design.

## Database

*Not applicable.* No database, ORM, or persistent data layer. Plugin state in consumer projects is managed via YAML files (`orchestrator-state.yml`) and markdown artifacts.

## Build Tools & Package Management

### Makefile
- **Role**: Primary build orchestration entry point
- **Targets**: `build`, `build-copilot`, `build-cursor`, `build-kiro`, `build-kilo`, `build-codex`, `validate`, `clean`, `watch`
- **Rationale**: Simple, universal, no dependency installation required

### Platform Build Scripts
| Script | Transform |
|--------|-----------|
| `platforms/copilot-cli/build.sh` | `maister` → `maister-copilot` (command prefixes, tool mappings) |
| `platforms/cursor/build.sh` | `maister` → `maister-cursor` (Task/TodoWrite, hook formats, rules) |
| `platforms/kiro-cli/build.sh` | `maister` → `maister-kiro` (chat gates, MD→JSON agents, subagent/todo) |
| `platforms/codex-cli/build.sh` | Native Codex skills, hooks, MCP, and marketplace packaging |

### Package Management
*None at repository root.* Intentionally dependency-free for the plugin itself. Playwright MCP is invoked via `npx @playwright/mcp@latest` at runtime.

## Infrastructure

### Containerization
*Not used.* No Docker or container orchestration.

### CI/CD
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/release.yml` | Tag push (`v*`) | Create GitHub releases via `softprops/action-gh-release` |
| `.github/workflows/build-copilot.yml` | Push to `master` | Auto-rebuild and commit `maister-copilot` variant |

**Gap:** No equivalent auto-rebuild CI for `maister-cursor` on master push (Copilot variant has this, Cursor does not yet).

### Hosting / Distribution
| Channel | Details |
|---------|---------|
| Claude Code marketplace | `SkillPanel/maister` — `maister-plugins` v2.1.8 |
| Cursor Agent | Local plugin install from generated `plugins/maister-cursor/` |
| Kiro CLI | Isolated profile install (`~/.kiro-maister`) from `plugins/maister-kiro/` |
| Codex CLI / IDE | Native plugin install from the repo marketplace at `.agents/plugins/marketplace.json` |
| Beta channel | `maister-plugins-beta` with `X.Y.Z-beta.N` versioning |

## Development Tools

### Linting & Formatting
*No repo-level ESLint, Prettier, or similar tools.* Conventions are enforced through:
- Plugin documentation principles (`plugins/maister/CLAUDE.md`)
- `make validate` structural checks
- Review during development workflows

### Type Checking
*Not applicable.* No TypeScript or typed language in the primary codebase.

### Dev Watch Mode
- `make watch` — uses `fswatch` to trigger rebuilds on source changes

## Key Dependencies

| Dependency | Version | Usage |
|------------|---------|-------|
| `@playwright/mcp` | `latest` (via npx) | Browser automation for E2E verification |
| `fswatch` | System package | Dev watch mode (optional) |
| `softprops/action-gh-release` | GitHub Action | Release automation |

## Version Management

| Aspect | Approach |
|--------|----------|
| Semantic versioning | `2.1.8` (stable), `X.Y.Z-beta.N` (beta channel) |
| Manifest files | `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, and each generated variant manifest |
| Branch strategy | `master` (stable) + `beta` (pre-release) with documented squash-merge workflow |
| Generated variants | Version synced across the source manifest and every generated variant during release |

## Architecture Notes

```
plugins/maister/          ← SOURCE OF TRUTH (edit here only)
    ↓ make build-copilot
plugins/maister-copilot/  ← GENERATED (never edit)
    ↓ make build-cursor
plugins/maister-cursor/   ← GENERATED (never edit)
    ↓ make build-kiro
plugins/maister-kiro/     ← GENERATED (never edit)
    ↓ make build-codex
plugins/maister-codex/    ← GENERATED (never edit)
```

**Critical rule:** Never edit files under `plugins/maister-copilot/`, `plugins/maister-cursor/`, `plugins/maister-kiro/`, or `plugins/maister-codex/` — changes are overwritten by `make build`.

## Migration Path

Not a legacy project. Ongoing evolution areas:
- Add Cursor variant auto-rebuild CI (parity with Copilot)
- Automated regression tests for sed-based build transforms
- Dependency pinning for product-design Node server

---
*Last Updated*: 2026-07-10
*Auto-detected*: Languages, build pipeline, CI/CD, platform APIs, testing approach, version management
*User-provided*: Project name (Maister), primary goal (maintain and evolve multi-platform plugins)
