# Project Analysis: Maister

## Classification

- Project maturity: existing, mature, actively developed
- Architecture type: Standard, multi-platform
- Architecture: single-source, multi-target plugin transformation and distribution pipeline
- Source of truth: `plugins/maister/`
- Generated variants: `plugins/maister-cursor/`, `plugins/maister-kiro/`, `plugins/maister-codex/`

## Purpose

Maister provides standards-aware, resumable SDLC workflows for AI coding hosts. It covers requirements, specification, planning, implementation, verification, research, migration, performance, and product design while maintaining consistent behavior across Claude Code, Codex, Cursor, and Kiro.

## Technology

- Markdown with YAML frontmatter for skills, agents, commands, references, and documentation
- Bash, `sed`, `awk`, `grep`, `find`, and `jq` for platform transforms and validation
- JavaScript ESM on Node.js for continuation and product-design runtime components
- JSON, YAML, TOML, HTML, CSS, and Cursor MDC assets
- GNU Make for build and validation orchestration
- GitHub Actions for drift validation, releases, and smoke checks
- Shell contract tests, fixtures, generated-output assertions, and host-specific smoke tests

There is no conventional frontend/backend application, database, container stack, root package manager, or traditional unit-test framework.

## Core Conventions

- Edit the canonical source and platform adapters; never edit generated variants directly.
- Keep skills and agents kebab-cased with validated YAML frontmatter.
- Keep commands thin and orchestration in `SKILL.md`.
- Use fail-fast, portable shell code with safe temporary-file and rollback behavior.
- Validate boundary inputs with allowlists and fail closed on ambiguity.
- Treat `orchestrator-state.yml` as the authoritative resumable state.
- Require explicit user confirmation for rollback and safety-sensitive gates.
- Keep source and marketplace versions synchronized.

## Strengths

- Clear source/generated boundary and deterministic platform adapters
- Broad host coverage with explicit native contracts
- Strong fixture-based safety, state, and configuration validation
- Automated drift detection and release checks
- Minimal dependency footprint
- Strict atomic Advisor/Arbiter configuration and read-only roles

## Opportunities

- Reduce fragility in large text-transform pipelines with semantic helpers or stronger golden fixtures.
- Add focused runtime tests for the Node continuation runner and product-design HTTP behavior.
- Pin optional Playwright MCP versions where reproducibility matters.
- Document required local tool versions and capabilities.
- Add an architecture document for source-to-target flow, state ownership, and Advisor/Arbiter decisions.

## Inferred Context

- Primary goals: cross-host semantic consistency; safe, auditable, resumable decisions; deterministic generation; Advisor/Arbiter automation without bypassing protected user gates.
- Team: small maintainer group with two dominant contributors and several additional contributors/automation.
- Requirements: macOS/Linux portability, exact generated-output drift checks, host-native vocabulary, read-only Advisor/Arbiter roles, explicit hard-denylisted gates, local installs, and synchronized versions.

## Recommended Defaults

- Documentation per Standard rule: Vision, Roadmap, Tech Stack, and Architecture
- Standards: global and testing
- Exclude frontend and backend standards

## User Correction

The initial Umbrella classification was corrected to Standard, multi-platform. The generated platform variants are artifacts of one cohesive product rather than independent systems.

## Evidence

Key sources inspected include `README.md`, `CLAUDE.md`, `Makefile`, plugin manifests and instructions, platform build scripts, Advisor and gate-engine tests, GitHub Actions workflows, workflow documentation, repository history, and semantic tags through v2.2.1. Analysis was read-only; no runtime tests were executed.
