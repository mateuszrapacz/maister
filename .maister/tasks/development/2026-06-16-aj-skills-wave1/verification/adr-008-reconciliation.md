# ADR-008 Reconciliation — Epic E1 Wave 1

**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave1`  
**Date:** 2026-06-16  
**Spec:** FR-5 (ADR-008 Documentation Requirement)  
**Primary artifact:** This file (per M-4 / implementation-plan Group 4)

---

## Summary

Epic E1 Wave 1 ships **both** ADR-008 alternatives **8A** (explicit-only critics) **and** **8B** (optional orchestrator soft suggestions). The original research decision deferred 8B to post–Wave 1; implementation included 8B ahead of schedule. At the Phase 2 scope gate, the user confirmed: **keep 8B as intentional Wave 1 inclusion**. There is **no revert** to strict 8A-only.

---

## User Decision (Phase 2 Gate)

| Decision | Outcome |
|----------|---------|
| `adr-008-orchestrator-scope` (gap-analysis) | **Keep** soft suggestions in `development` and `product-design` |
| Revert orchestrator bullets to strict 8A standalone | **Rejected** |
| Document intentional early 8B inclusion | **Required** (this artifact) |

**Rationale:** Optional bullets improve discoverability of critique skills at natural workflow touchpoints without violating the explicit-only critique principle. Suggestions are prose guidance only — no Skill tool delegation, no phase hooks (8C), no hard integration (8E).

---

## ADR-008 Scope Model

| Alternative | Wave 1 status | Mechanism |
|-------------|---------------|-----------|
| **8A** — Standalone only | ✅ Shipped | Three skills + `quick-*` commands; `disable-model-invocation: true` on all three Wave 1 skills |
| **8B** — Soft suggestions | ✅ Shipped (intentional early inclusion) | Optional bullets in orchestrator phase text; user may invoke via command |
| **8C** — Optional phase hooks | ❌ Deferred | No `--requirements-critic` flags or state-file hooks |
| **8D** — implementation-verifier extension | ❌ Deferred | No automatic test-strategy hook |
| **8E** — product-design hard integration | ❌ Deferred | No auto transcript-critic gate |

---

## Orchestrator Locations (file:line)

### `development` — requirements-critic suggestion

| Field | Value |
|-------|-------|
| File | `plugins/maister/skills/development/SKILL.md` |
| Line | 251 |
| Phase | Phase 5 — Technical Approach, Requirements & Specification |
| Placement | Part B (Requirements Gathering), after requirements saved to `analysis/requirements.md`, before Part C (Specification Creation) |
| Trigger condition | After requirements are drafted |
| Suggested command | `/maister:quick-requirements-critic` |
| Guard | `Do not invoke the skill automatically.` |

```251:251:plugins/maister/skills/development/SKILL.md
**Optional (ADR-008 — soft suggestion, no auto-invocation):** After requirements are drafted, you may suggest the user run `requirements-critic` via `/maister:quick-requirements-critic` for interactive quality critique. Do not invoke the skill automatically.
```

### `product-design` — transcript-critic suggestion

| Field | Value |
|-------|-------|
| File | `plugins/maister/skills/product-design/SKILL.md` |
| Line | 251 |
| Phase | Phase 1 — Context Synthesis |
| Placement | Step 2 (read `context/` folder), before synthesis |
| Trigger condition | When meeting transcripts are present in `context/` |
| Suggested command | `/maister:quick-transcript-critic` |
| Guard | `Do not invoke the skill automatically.` |

```251:251:plugins/maister/skills/product-design/SKILL.md
   **Optional (ADR-008 — soft suggestion, no auto-invocation):** When meeting transcripts are present in `context/`, you may suggest `/maister:quick-transcript-critic` for decision-process audit before synthesis. Do not invoke the skill automatically.
```

---

## Auto-Invocation Verification

Grep sweep confirms **no Skill tool auto-delegation** to critique skills from orchestrators:

| Check | Result | Evidence |
|-------|--------|----------|
| `Skill tool` + `requirements-critic` in orchestrators | **PASS — none found** | `rg 'Skill tool.*requirements-critic'` → 0 matches in `plugins/maister/skills/` |
| `Skill tool` + `transcript-critic` in orchestrators | **PASS — none found** | `rg 'Skill tool.*transcript-critic'` → 0 matches in `plugins/maister/skills/` |
| `maister:requirements-critic` / `maister:transcript-critic` in orchestrators | **PASS — none found** | `rg 'maister:(requirements|transcript)-critic'` in development/product-design → 0 matches |
| Only references are 8B soft-suggestion bullets | **PASS** | Sole matches: `development/SKILL.md:L251`, `product-design/SKILL.md:L251` |
| 8C phase-hook wiring | **PASS — absent** | No `--requirements-critic` flags or state-file critique hooks |

Orchestrators retain explicit Skill tool delegation for **other** skills (e.g., `codebase-analyzer`, `implementation-plan-executor`, `implementation-verifier`) — unchanged and unrelated to ADR-008 critique scope.

---

## Historical Context Reconciliation

The original ADR-008 entry in `analysis/research-context/decision-log.md` (lines 307–308) stated:

> **8A for Wave 1** … **8B after Wave 1** — soft suggestions in `development` Phase 5 and `product-design` transcript phases.

That timeline is **superseded** for Epic E1 by the user Phase 2 gate decision documented here. The historical entry is preserved unchanged; a cross-link addendum was appended to the decision log (see below).

**Explicit statement:** Wave 1 will **not** revert to strict 8A-only. Orchestrator bullets remain as intentional Maister ENHANCEMENT (not AJ source content — see `aj-rubric-diff.md` ADR-008 section when Group 2 completes).

---

## Five Documentation Verification Checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Reconciliation doc states Wave 1 ships **8A and 8B** | **PASS** | § Summary, § ADR-008 Scope Model |
| 2 | No Skill tool auto-delegation from orchestrators to critique skills | **PASS** | § Auto-Invocation Verification |
| 3 | `development/SKILL.md` bullet present with no-auto-invoke guard (after requirements drafted, before spec creation) | **PASS** | L251; Phase 5 Part B → Part C boundary |
| 4 | `product-design/SKILL.md` bullet present when transcripts in `context/` | **PASS** | L251; Phase 1 step 2 |
| 5 | Decision-log cross-link addendum added (not full rewrite of historical ADR-008 entry) | **PASS** | `analysis/research-context/decision-log.md` — Wave 1 reconciliation addendum |

**Overall verdict:** All 5 documentation checks **PASS**.

---

## Related Artifacts

| Artifact | Role |
|----------|------|
| `verification/ac-static-audit.md` | AC-9/AC-10 orchestrator guard evidence (Group 1) |
| `analysis/scope-clarifications.md` | User decision: keep ADR-008 suggestions |
| `implementation/spec.md` | FR-5 acceptance criteria; Architecture Decisions table |
| `analysis/research-context/decision-log.md` | Original ADR-008 + Wave 1 addendum cross-link |

---

*Linked from: `analysis/research-context/decision-log.md` (ADR-008 Wave 1 reconciliation addendum)*
