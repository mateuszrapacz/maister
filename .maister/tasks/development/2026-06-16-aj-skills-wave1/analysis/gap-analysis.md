# Gap Analysis: Epic E1 — AJ Skills Wave 1

**Date:** 2026-06-16  
**Task:** Port `requirements-critic`, `transcript-critic`, and `problem-classifier` into `plugins/maister/`  
**Analyzer:** gap-analyzer subagent  
**Inputs:** codebase-analysis.md, research-context (HLD, decision-log, research-report), live file verification, `make build && make validate`

---

## Executive Summary

Epic E1 is **substantially complete** in the Maister source plugin. All three skills, three `quick-*` commands, Bundle A chain documentation, CLAUDE.md/README registration, and generated platform variants are present and conform to ADR-001/002/003. **`make build` and `make validate` pass** on all four platforms (Copilot, Cursor, Kiro, Kilo) as of this analysis.

The task should be reframed from **greenfield porting** to **verification and gap closure**: AJ rubric fidelity diff, manual command smoke tests, and an explicit ADR-008 scope decision (orchestrator soft suggestions are already implemented despite research deferring them to Wave 2+).

**Overall gap severity:** Low — no blocking implementation missing; remaining work is evidence gathering and one product decision.

---

## Desired State (Epic E1 Acceptance Criteria)

From `high-level-design.md` Epic E1 row and per-wave deliverables checklist:

| # | Criterion | Source |
|---|-----------|--------|
| 1 | Three skills in `plugins/maister/skills/` with normalized frontmatter | E1 scope |
| 2 | Three `quick-*` thin command wrappers | ADR-002 |
| 3 | `disable-model-invocation: true` on critique skills (`requirements-critic`, `transcript-critic`) | ADR-008 / E1 |
| 4 | "Recommended next steps" chain sections in each SKILL.md | ADR-001 |
| 5 | CLAUDE.md entries for Wave 1 skills + commands + Bundle A | Per-wave checklist |
| 6 | CLAUDE.md backfill for `grill-me` / `thermos` | E1 acceptance row |
| 7 | README user-facing command docs | Per-wave checklist |
| 8 | `make build && make validate` passing on all platform variants | Per-wave checklist |
| 9 | Commands invoke skills (explicit-only, no auto-invocation from orchestrators) | E1 acceptance |
| 10 | Wave 1 standalone — no orchestrator auto-invocation (ADR-008 8A) | ADR-008 |

---

## Current State Verification

### Skills (source: `plugins/maister/skills/`)

| Skill | Exists | Frontmatter `name` | `disable-model-invocation` | Chain section | Lines |
|-------|--------|-------------------|---------------------------|---------------|-------|
| `requirements-critic` | ✅ | plain kebab | ✅ true | ✅ "Recommended Next Steps" | 292 |
| `transcript-critic` | ✅ | plain kebab | ✅ true | ✅ "Recommended Next Steps" | 225 |
| `problem-classifier` | ✅ | plain kebab | ✅ true (beyond E1 minimum) | ✅ "Recommended next steps" | 509 |

**Maister enhancements over AJ source:** invocation guards, language preference gate (`requirements-critic`), archetype vs problem-class distinction table (`problem-classifier`), Bundle A cross-references.

### Commands (source: `plugins/maister/commands/`)

| Command | Exists | Pattern | Skill delegation |
|---------|--------|---------|------------------|
| `quick-requirements-critic.md` | ✅ | Thin wrapper, `**ACTION REQUIRED**` | `requirements-critic` |
| `quick-transcript-critic.md` | ✅ | Thin wrapper | `transcript-critic` |
| `quick-problem-classifier.md` | ✅ | Thin wrapper | `problem-classifier` |

### Documentation

| Artifact | Wave 1 content | grill-me / thermos backfill |
|----------|----------------|----------------------------|
| `plugins/maister/CLAUDE.md` | ✅ Skills table, commands table, Bundle A, task-classifier vs problem-classifier distinction | ✅ Both documented in On-Demand Skills section |
| `README.md` | ✅ Three quick commands + Bundle A flow | N/A |

### Orchestrator integration (ADR-008)

| Orchestrator | Soft suggestion present | Auto-invocation |
|--------------|------------------------|-----------------|
| `development/SKILL.md` | ✅ Suggests `/maister:quick-requirements-critic` after requirements draft | ❌ Explicit "Do not invoke automatically" |
| `product-design/SKILL.md` | ✅ Suggests `/maister:quick-transcript-critic` when transcripts in context | ❌ Explicit "Do not invoke automatically" |

**Scope note:** ADR-008 decision log specifies **8A (standalone only) for Wave 1** and **8B (soft suggestions) after Wave 1**. Current code implements 8B ahead of schedule.

### Build pipeline (verified this session)

```
make build   → exit 0 (Copilot, Cursor, Kiro, Kilo)
make validate → exit 0 (all platform checks including Kiro rule 14: 63 skill dirs)
```

Generated variants confirmed for Cursor (`plugins/maister-cursor/skills/{requirements-critic,transcript-critic,problem-classifier}/`).

### ADR alignment

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Individual skills + chain sections | ✅ Implemented |
| ADR-002 | Category-aligned `quick-*` commands | ✅ Implemented |
| ADR-003 | Strict Wave 1 scope (3 skills) | ✅ Scope matches |
| ADR-008 | Standalone Wave 1; soft suggestions Wave 2+ | ⚠️ Skills standalone ✅; orchestrator 8B already present |

---

## Gap Summary

### Done (no further implementation required unless rubric diff finds regressions)

- [x] Three AJ skills ported to `plugins/maister/skills/`
- [x] Three `quick-*` command wrappers
- [x] `disable-model-invocation: true` on both critique skills (and additionally on `problem-classifier`)
- [x] Bundle A chain sections in all three SKILL.md files
- [x] CLAUDE.md skills, commands, Bundle A, naming collision guard
- [x] CLAUDE.md backfill for `grill-me` and `thermos`
- [x] README user-facing quick command documentation
- [x] Platform build transforms and generated variants
- [x] `make build && make validate` passing

### Missing or unverified

| Gap | Severity | Notes |
|-----|----------|-------|
| AJ vs Maister semantic rubric diff | Medium | Line counts verified (+12–31 Maister deltas); no checklist-level comparison against AJ week8 source |
| Manual E2E smoke: `/maister:quick-*` → Skill tool delegation | Low | No automated test; structural validation passes |
| ADR-008 scope reconciliation | Medium | Orchestrator soft suggestions exist; decision log says defer to Wave 2+ |
| Chain section heading consistency | Trivial | `Recommended Next Steps` vs `Recommended next steps` — cosmetic only |
| Task artifacts | Low | `implementation/spec.md` not yet created; expected at Phase 5 |

### Out of scope (correctly deferred)

- Wave 2+ skills (`test-strategy-reviewer`, etc. — already exist in repo but not E1)
- Meta-orchestrator, `modeling-*` commands, archetype mappers
- `language.md` standard (E2 parallel epic)

---

## Integration Points

| Integration | Type | Wave 1 status | Notes |
|-------------|------|---------------|-------|
| Bundle A user flow | Skill-to-skill chain via Recommended next steps | ✅ Active | transcript → requirements → problem-classifier |
| `development` orchestrator | Soft suggestion (ADR-008 8B) | ⚠️ Present early | Phase: after requirements drafted |
| `product-design` orchestrator | Soft suggestion (ADR-008 8B) | ⚠️ Present early | Phase: when transcripts in `context/` |
| `test-strategy-reviewer` | Downstream consumer | ✅ Cross-ref | Points to `problem-classifier` when class unclear |
| `metaprogram-classifier` | Sibling skill | ✅ Cross-ref | Suggests `requirements-critic` for requirements-quality issues |
| `make build/validate` | CI gate | ✅ Passing | Copilot, Cursor, Kiro (63 dirs), Kilo |
| Kiro `build-core.test.sh` | Build test | ✅ Present | Asserts merged quick-* skill dirs |
| AJ source repo | Read-only reference | External | `/Users/mrapacz/Projects/architekt-jutra-code/week8/` |

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| False completion without rubric diff | Medium | Medium | Perform AJ semantic checklist before E1 close |
| ADR-008 confusion (8A vs 8B timeline) | Low | Medium | User decision: keep or revert orchestrator bullets |
| Kiro skill count drift on future edits | Medium | Low | Re-run validate after any skill add/remove |
| `task-classifier` vs `problem-classifier` conflation | Low | Medium | Already documented in CLAUDE.md — preserve |

**Risk level:** **low** (build/validate green; code complete; remaining gaps are verification and one scope decision)

**Effort estimate:** **low** — likely 0–1 day for rubric diff + smoke + spec; zero code changes if diff is clean

---

## Decisions Needed

### Critical

| id | issue | options | recommendation | rationale |
|----|-------|---------|----------------|-----------|
| `adr-008-orchestrator-scope` | Orchestrator soft suggestions (8B) are already in `development` and `product-design`, but ADR-008 defers 8B to post–Wave 1 | **A)** Keep as intentional Wave 1 inclusion — update decision log<br>**B)** Revert orchestrator bullets to strict 8A standalone | **A — Keep** | Suggestions are optional text with explicit no-auto-invoke guards; improves discoverability without violating explicit-only critique principle |

### Important

| id | issue | options | default | rationale |
|----|-------|---------|---------|-----------|
| `rubric-fidelity-gate` | AJ vs Maister semantic diff not performed | **A)** Full checklist diff against AJ week8 before E1 sign-off<br>**B)** Accept line-count parity + spot-check as sufficient | **A** | Research emphasized faithful port; Maister added guards/gates that could mask rubric omissions |
| `problem-classifier-invocation` | `problem-classifier` has `disable-model-invocation: true`; research marked this optional for classifiers | **A)** Keep (explicit-only classification)<br>**B)** Remove flag (allow description-triggered) | **A — Keep** | Consistent with "classification on explicit request" guard; matches critique skills UX |
| `e1-close-criteria` | Task framed as implement but code exists | **A)** Close E1 after verification evidence only<br>**B)** Require net-new commits | **A** | Aligns with codebase reality; acceptance is validate + fidelity, not diff size |

---

## Recommended Next Steps (for orchestrator)

1. **User decision:** Resolve `adr-008-orchestrator-scope` (keep vs revert orchestrator suggestions).
2. **Specification phase:** Write lightweight `implementation/spec.md` focused on verification evidence, not greenfield port plan.
3. **Rubric audit:** Diff Maister SKILL.md checklists against AJ week8 source for all three skills; patch only if sections missing.
4. **Smoke test:** Manually invoke each `/maister:quick-*` command in target platform (Cursor) and confirm Skill tool delegation.
5. **Close E1:** If rubric diff clean and smoke passes, mark epic complete with minimal or zero code diff.

---

## Structured Output (Orchestrator State Update)

```yaml
status: partial
report_path: analysis/gap-analysis.md
risk_level: low
effort_estimate: low

task_characteristics:
  has_reproducible_defect: false
  modifies_existing_code: true
  creates_new_entities: false
  involves_data_operations: false
  ui_heavy: false

change_type: modificative
compatibility_requirements: strict

integration_points:
  - Bundle A skill chain (transcript-critic → requirements-critic → problem-classifier)
  - development orchestrator soft suggestion (ADR-008 8B — ahead of schedule)
  - product-design orchestrator soft suggestion (ADR-008 8B — ahead of schedule)
  - test-strategy-reviewer cross-reference to problem-classifier
  - make build/validate multi-platform pipeline (Copilot, Cursor, Kiro, Kilo)
  - AJ source repo read-only reference (architekt-jutra-code/week8)

decisions_needed:
  critical:
    - id: adr-008-orchestrator-scope
      issue: Orchestrator soft suggestions present despite ADR-008 deferring 8B to post-Wave 1
      options:
        - Keep as intentional Wave 1 inclusion; update decision log
        - Revert development/product-design bullets to strict 8A standalone
      recommendation: Keep — optional bullets with no auto-invocation
      rationale: Improves discoverability without violating explicit-only critique guards
  important:
    - id: rubric-fidelity-gate
      issue: AJ vs Maister semantic rubric diff not yet performed
      options:
        - Full checklist diff against AJ week8 before E1 sign-off
        - Accept line-count parity and spot-check
      default: Full checklist diff
      rationale: Faithful port was research goal; Maister enhancements may mask omissions
    - id: problem-classifier-invocation
      issue: problem-classifier has disable-model-invocation beyond E1 minimum
      options:
        - Keep explicit-only classification
        - Remove flag for description-triggered invocation
      default: Keep
      rationale: Consistent with invocation guard pattern
    - id: e1-close-criteria
      issue: Task framed as implement but implementation largely pre-exists
      options:
        - Close after verification evidence
        - Require net-new commits
      default: Close after verification evidence
      rationale: Acceptance criteria are validate + fidelity, not diff size

scope_expansion_recommended: false
critical_issues: []
patterns_to_follow:
  - requirements-critic/SKILL.md + quick-requirements-critic.md (canonical on-demand pair)
  - Thin command wrappers with ACTION REQUIRED Skill-tool delegation
  - Source-only edits in plugins/maister/; make build for variants
architectural_impact: low
```
