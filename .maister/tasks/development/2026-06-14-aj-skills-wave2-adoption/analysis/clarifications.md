# Phase 1 Clarifications

**Date:** 2026-06-14

## Q1: Wave 2 epic scope

**Question:** Wave 2 per research HLD includes E2 (language-md-convention standard) + E3 (3 skills, 3 commands, soft orchestrator suggestions). What should this development task cover?

**Answer:** Full Wave 2 — E2 standard + E3 skills/commands/suggestions (recommended per HLD).

**Implication:** Task delivers `.maister/docs/standards/global/language-md-convention.md` + INDEX.md entry, ports 3 AJ skills, creates 3 commands, adds ADR-008 soft suggestions to development/product-design orchestrators, updates CLAUDE.md and README.

## Q2: README discoverability

**Question:** README discoverability for Wave 2 commands?

**Answer:** Full — README section on AJ adoption bundles C & D.

**Implication:** Beyond minimal table rows: document Bundle C (Architecture Review) and Bundle D (Stakeholder Communication) with command paths and flow guidance.

## Q3: Kiro @ shortcuts

**Question:** Kiro @ shortcut skills for Wave 2 commands?

**Answer:** Defer (Wave 1 pattern — merged maister-* dirs only).

**Implication:** No build.sh shortcut changes; Kiro counts increase by 6 skill dirs (57 → 63: three standalone skills + three merged command skills); Rule 23 stays at 25.

## Assumptions confirmed

- Edit source only in `plugins/maister/` and `.maister/docs/`; regenerate via `make build`
- Wave 1 gold templates: requirements-critic (critique pattern), problem-classifier (classifier + language gate)
- AJ source read-only at `/Users/mrapacz/Projects/architekt-jutra-code/`
- Bilingual bodies preserved; EN frontmatter; language gates on interactive skills (metaprogram-classifier, test-strategy-reviewer)
- linguistic-boundary-verifier: graceful degradation when no language.md (ADR-006)
- test-strategy-reviewer + reviews skills: `disable-model-invocation: true` (read-only audit rubrics)
- No orchestrator auto-invocation — soft suggestions only per ADR-008
