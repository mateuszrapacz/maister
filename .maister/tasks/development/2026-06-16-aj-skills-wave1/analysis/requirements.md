# Requirements: AJ Skills Wave 1 (E1) Verification & Close

**Date:** 2026-06-16  
**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave1`

## Initial Description

Implement Epic E1 (Wave 1) from architekt-jutra skills research: port requirements-critic, transcript-critic, and problem-classifier from Architekt Jutra into `plugins/maister/` as standalone on-demand skills with category-aligned `quick-*` commands.

**Research finding:** Implementation substantially pre-exists. Task reframed per Phase 2 gate to **verification-first close**.

## Q&A from Clarification Rounds

### Phase 2 Scope Gate

| Question | Answer |
|----------|--------|
| ADR-008 orchestrator soft suggestions | Keep as intentional Wave 1 inclusion |
| Task framing | Verification-first; minimal code changes |
| AJ rubric fidelity | Full semantic diff against AJ week8 |
| E2E smoke | Out of scope |

### Phase 5 Requirements

| Question | Answer |
|----------|--------|
| User journey | Explicit `/maister:quick-*` invocation; optional soft suggestions from development/product-design after drafting |
| Code reuse | Verify existing `plugins/maister/` implementation; fix only gaps found |
| Acceptance evidence | `make build && make validate` pass + AJ rubric diff report + gap fixes if any |

## Similar Features Identified

| Feature | Path | Reuse |
|---------|------|-------|
| requirements-critic (existing) | `plugins/maister/skills/requirements-critic/SKILL.md` | Primary deliverable to verify |
| transcript-critic (existing) | `plugins/maister/skills/transcript-critic/SKILL.md` | Primary deliverable to verify |
| problem-classifier (existing) | `plugins/maister/skills/problem-classifier/SKILL.md` | Primary deliverable to verify |
| quick-* command pattern | `plugins/maister/commands/quick-requirements-critic.md` | Template for command verification |
| On-demand skill pattern | `plugins/maister/skills/test-strategy-reviewer/SKILL.md` | Reference for frontmatter conventions |
| Bundle A documentation | `plugins/maister/CLAUDE.md` | Verify chain docs |
| AJ source rubrics | `/Users/mrapacz/Projects/architekt-jutra-code/week8/{1,2,3}/*/SKILL.md` | Fidelity baseline |

## Visual Assets

None — non-UI plugin task.

## Functional Requirements Summary

### FR-1: E1 Acceptance Criteria Verification
Verify existing implementation meets Epic E1 criteria from research high-level-design:
- 3 skills with correct frontmatter (`disable-model-invocation` on critics, plain kebab names)
- 3 `quick-*` thin command wrappers
- Recommended next steps / Bundle A chain sections
- CLAUDE.md + README documentation
- grill-me/thermos CLAUDE.md backfill (if not already done)

### FR-2: Build Pipeline Gate
Run `make build && make validate` on all platform variants; record pass/fail evidence.

### FR-3: AJ Rubric Fidelity Diff
Produce semantic diff report comparing Maister skills vs AJ week8 source for:
- transcript-critic (week8/1)
- requirements-critic (week8/2)
- problem-classifier (week8/3)

Diff must cover: rubric checks, output formats, chain topology, and note intentional Maister enhancements (language gate, invocation guard, ADR-008).

### FR-4: Gap Remediation (Conditional)
If diff or validate reveals regressions or missing E1 criteria, apply minimal fixes in `plugins/maister/` only; rebuild and re-validate.

### FR-5: ADR-008 Documentation
Document decision to keep orchestrator soft suggestions as intentional Wave 1 scope (not deferred).

## Reusability Opportunities

- Existing Wave 1 files are the implementation — no new skill directories unless diff reveals missing content
- Build/validate Makefile targets for evidence
- Research artifacts in `analysis/research-context/` for acceptance criteria traceability

## Scope Boundaries

### In scope
- Verification, diff report, conditional minimal fixes
- Source edits only in `plugins/maister/`
- ADR-008 scope note

### Out of scope
- Greenfield re-port
- Wave 2+ skills
- E2E browser testing
- Generated variant direct edits
- Meta-orchestrator

## Technical Considerations

- Edit only `plugins/maister/`; run `make build` for platform variants
- Kiro build has Wave 1-specific sed rules — validate must pass
- AJ source uses `maister:` prefix in skill names; Maister uses plain kebab (intentional)
- Bilingual bodies preserved; English-primary frontmatter per ADR-007
