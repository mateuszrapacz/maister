# Phase 1 Clarifications

**Date:** 2026-06-14

## Q1: Development task scope

**Question:** Wave 1 skills already exist. What should this development task focus on?

**Answer:** Verify & complete Wave 1 only — close gaps (README, disable-model-invocation parity, conformance audit).

**Implication:** No Wave 2+ porting in this task. Focus on auditing existing implementation against research spec and fixing documented gaps.

## Q2: problem-classifier invocation model

**Question:** problem-classifier lacks `disable-model-invocation: true`. How to handle?

**Answer:** Add `disable-model-invocation: true` for consistency with critic skills.

**Implication:** Update `plugins/maister/skills/problem-classifier/SKILL.md` frontmatter and ensure invocation guard language matches siblings.

## Assumptions confirmed

- Edit source only in `plugins/maister/`; regenerate via `make build`
- Research ADRs (packaging, commands, waves) apply as acceptance criteria
- Bundle A chain documentation is sufficient; no meta-orchestrator needed
- Bilingual skill bodies are acceptable; English-primary frontmatter
