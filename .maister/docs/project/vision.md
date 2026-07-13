# Project Vision

## Overview

Maister is a multi-platform AI software-development lifecycle plugin that provides standards-aware, safe, auditable, and resumable workflows across Claude Code, Codex, Cursor, and Kiro.

## Current State

- **Age**: Actively developed since June 2026
- **Status**: Active development with semantic releases through v2.2.1
- **Users**: Software teams and maintainers using AI coding hosts for structured delivery work
- **Tech Stack**: Markdown and YAML, Bash, JavaScript ESM on Node.js, JSON, TOML, GNU Make, and GitHub Actions

## Purpose

AI coding hosts expose different tools, naming schemes, agent models, and continuation capabilities. Maister exists to give those hosts a consistent workflow model without erasing their native constraints. It turns requirements, research, planning, implementation, verification, migration, performance, and product-design work into explicit phases with persistent state, documented standards, and protected user decisions.

The project emphasizes:

- one canonical workflow source with deterministic platform variants;
- `orchestrator-state.yml` as the authoritative resume and audit record;
- fail-closed validation at configuration and safety boundaries;
- explicit user control for protected or destructive decisions;
- optional read-only Advisor and Arbiter assistance at workflow gates;
- a minimal dependency footprint and local installation support.

## Goals (Next 6–12 Months)

- Preserve semantic parity across Claude Code, Codex, Cursor, and Kiro as their APIs evolve.
- Strengthen runtime coverage for continuation, dashboard, and product-design server behavior.
- Reduce fragility in high-risk text transformation pipelines through semantic helpers or stronger golden fixtures.
- Improve documentation of supported host capabilities and required local tool versions.
- Keep Advisor and Arbiter automation auditable, portable, and unable to bypass hard safety gates.
- Maintain exact synchronization between canonical sources, generated variants, manifests, and release versions.

## Evolution

Maister has evolved from a Claude-oriented plugin into a single cohesive, multi-platform product. Its canonical source remains under `plugins/maister/`, while platform adapters translate workflows into native Cursor, Kiro, and Codex contracts. Recent work has strengthened state-driven continuation and introduced strict Advisor/Arbiter configuration with atomic reconciliation, bounded retries, inherited model selection, and read-only roles.

The project is heading toward deeper semantic validation and runtime assurance while retaining its documentation-as-code architecture and small operational footprint.
