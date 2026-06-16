# Phase 2 Scope Clarifications

**Date:** 2026-06-14

## Decisions Made

### G1 — problem-classifier invocation (critical — pre-resolved in Phase 1)
Add `disable-model-invocation: true` + invocation guard block to `problem-classifier/SKILL.md`.

### G2 — README depth
**Chosen:** Minimal — 3 command rows + Bundle A sentence in Quick Commands section.

### G3 — Kiro @ shortcuts
**Chosen:** Defer — not included in this task.

### G4 — Language preference gate
**Chosen:** Add first-step `AskUserQuestion` language preference gate on interactive skills (`requirements-critic`, `problem-classifier`) per ADR-007.

## Scope boundaries

**In scope:**
- G1: problem-classifier frontmatter + invocation guard
- G2: README minimal update
- G4: Language preference gate on interactive skills
- `make build && make validate`
- Conformance verification against E1 acceptance criteria

**Out of scope:**
- Wave 2+ skill ports
- Kiro @ shortcuts
- Orchestrator soft suggestions
- Re-porting AJ rubrics (already done)
- `modeling-*` standard documentation (E4)
