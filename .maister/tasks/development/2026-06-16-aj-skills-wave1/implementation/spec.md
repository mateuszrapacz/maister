# Specification: Epic E1 (Wave 1) Verification & Close

**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave1`  
**Epic:** E1 — Wave 1 Requirements & Classification  
**Research:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`  
**Risk level:** Low  
**Date:** 2026-06-16

---

## Goal

Verify and close Epic E1 by confirming that `requirements-critic`, `transcript-critic`, and `problem-classifier` — plus their three `quick-*` commands, Bundle A documentation, and build pipeline integration — already meet Wave 1 acceptance criteria in `plugins/maister/`. Produce evidence via `make build && make validate` and a full semantic AJ rubric diff report. Apply minimal source-only fixes only when verification reveals gaps. Document ADR-008 orchestrator soft suggestions as intentional Wave 1 scope.

This is a **verification-first close**, not a greenfield port. Net-new code is conditional, not assumed.

---

## User Stories

- As a **Maister maintainer**, I want Epic E1 closed with objective evidence (`make validate` pass + AJ rubric diff) so Wave 2+ work can proceed without uncertainty about Wave 1 fidelity.
- As an **architect or product owner**, I want to invoke `/maister:quick-transcript-critic`, `/maister:quick-requirements-critic`, and `/maister:quick-problem-classifier` explicitly and receive AJ-equivalent rubric output with documented Maister enhancements.
- As a **development workflow user**, I want optional soft suggestions in `development` and `product-design` orchestrators pointing to Wave 1 critics without auto-invocation during requirements drafting.
- As a **plugin consumer**, I want Bundle A (transcript → requirements → problem-classifier) documented in `CLAUDE.md`, `README.md`, and skill chain sections so I can chain skills manually.

---

## Scope Boundaries

### In scope

| Area | Action |
|------|--------|
| E1 acceptance criteria audit | Verify all 10 criteria from gap analysis against live `plugins/maister/` artifacts |
| AJ rubric fidelity diff | Full semantic checklist diff vs AJ week8 source for all three skills |
| Build pipeline gate | Run and record `make build && make validate` on Copilot, Cursor, Kiro, Kilo |
| Conditional remediation | Minimal fixes in `plugins/maister/` (and `platforms/kiro-cli/` only if build integration gap found) |
| ADR-008 documentation | Record decision to keep orchestrator soft suggestions as intentional Wave 1 inclusion |
| Task artifacts | AJ diff report, validation evidence, work-log entries |

### Out of scope

| Item | Rationale |
|------|-----------|
| Greenfield re-port from AJ | Implementation pre-exists per codebase analysis |
| Wave 2+ skills | E3/E4/E5 — `test-strategy-reviewer`, `metaprogram-classifier`, DDD pack, etc. |
| Meta-orchestrator | Rejected per ADR-001 |
| E2E browser / Playwright smoke | User explicitly excluded at Phase 2 gate |
| Manual CLI smoke of `/maister:quick-*` | Not selected; structural validate + rubric diff suffice |
| Editing generated variants directly | `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/`, `maister-kilo/` — rebuild only |
| Orchestrator auto-invocation (ADR-008 8C) | No Skill tool auto-delegation from orchestrators |
| `language.md` standard (E2) | Parallel epic |
| `research --gather-only` (E6) | Separate epic |
| Reverting ADR-008 soft suggestions | User chose **keep** at scope gate |
| Unit / integration tests for rubric content | No application code; validate gate is structural |

---

## Core Requirements

### FR-1: E1 Acceptance Criteria Verification

Verify each Epic E1 criterion from research HLD and gap analysis. Record pass/fail with file-path evidence.

| ID | Criterion | Verification method | Expected evidence location |
|----|-----------|---------------------|----------------------------|
| AC-1 | Three skills in `plugins/maister/skills/` with normalized frontmatter (plain kebab `name`, no `maister:` prefix on engine skills) | Read frontmatter of each SKILL.md | `skills/requirements-critic/`, `skills/transcript-critic/`, `skills/problem-classifier/` |
| AC-2 | Three `quick-*` thin command wrappers (ADR-002) | Read command files; confirm ACTION REQUIRED + Skill tool delegation; no embedded rubric | `commands/quick-requirements-critic.md`, `quick-transcript-critic.md`, `quick-problem-classifier.md` |
| AC-3 | `disable-model-invocation: true` on critique skills | Grep frontmatter | `requirements-critic`, `transcript-critic` (minimum); `problem-classifier` also has flag — keep per scope gate |
| AC-4 | "Recommended next steps" chain sections in each SKILL.md (ADR-001) | Section present with kebab sibling refs | All three SKILL.md files |
| AC-5 | CLAUDE.md entries: Wave 1 skills, commands, Bundle A, task-classifier vs problem-classifier distinction | Grep + read relevant sections | `plugins/maister/CLAUDE.md` |
| AC-6 | CLAUDE.md backfill for `grill-me` and `thermos` | Grep On-Demand Skills section | `plugins/maister/CLAUDE.md` |
| AC-7 | README user-facing quick command docs + Bundle A | Read README | `README.md` |
| AC-8 | `make build && make validate` passes all four platforms | Run commands; capture exit codes and summary | Task `verification/` or work-log |
| AC-9 | Commands invoke skills; no orchestrator auto-invocation | Read orchestrator SKILL.md guards; confirm critics are explicit-only | `development/SKILL.md`, `product-design/SKILL.md` |
| AC-10 | Wave 1 standalone — critics not auto-invoked during drafting | `disable-model-invocation` + invocation guard blocks in skill bodies | All three skills |

**Acceptance:** All AC-1 through AC-10 pass, or failing items remediated per FR-4 and re-verified.

---

### FR-2: AJ Rubric Fidelity Diff

Produce a semantic diff report comparing Maister skills against AJ week8 source rubrics.

**AJ source paths (read-only baseline):**

| Skill | AJ path |
|-------|---------|
| `transcript-critic` | `/Users/mrapacz/Projects/architekt-jutra-code/week8/1/transcript-critic/SKILL.md` (~213 lines) |
| `requirements-critic` | `/Users/mrapacz/Projects/architekt-jutra-code/week8/2/requirements-critic/SKILL.md` (~261 lines) |
| `problem-classifier` | `/Users/mrapacz/Projects/architekt-jutra-code/week8/3/problem-classifier/SKILL.md` (~487 lines) |

**Maister targets:**

| Skill | Maister path | Expected delta |
|-------|--------------|----------------|
| `transcript-critic` | `plugins/maister/skills/transcript-critic/SKILL.md` (~225 lines) | +invocation guard, Bundle A chain, fixed frontmatter |
| `requirements-critic` | `plugins/maister/skills/requirements-critic/SKILL.md` (~292 lines) | +language gate, invocation guard, Bundle A chain |
| `problem-classifier` | `plugins/maister/skills/problem-classifier/SKILL.md` (~509 lines) | +invocation guard, archetype distinction, Bundle A, Wave 3 stub |

**Diff report output:** `.maister/tasks/development/2026-06-16-aj-skills-wave1/verification/aj-rubric-diff.md`

**Diff dimensions (all three skills):**

1. **Rubric checks** — Every AJ analysis check / class / probe preserved (not summarized away)
2. **Output formats** — Structured report templates, severity categories, class assignment format intact
3. **Chain topology** — Recommended next steps reference correct kebab siblings; Wave 3 stubs documented where AJ invoked live skills
4. **Intentional Maister enhancements** — Explicitly labeled as *expected*, not regressions:
   - `disable-model-invocation: true` and invocation guard blocks
   - Language preference gate (`requirements-critic`; ADR-007)
   - Bundle A cross-references (ADR-001)
   - Archetype vs problem-class distinction table (`problem-classifier`)
   - Plain kebab frontmatter `name` (strip AJ `maister:` prefix)
   - English-primary frontmatter `description` where adapted

**Per-skill checklist (minimum):**

| Skill | Must-verify rubric elements |
|-------|----------------------------|
| `transcript-critic` | 7 decision-process checks; severity + evidence quote format; diagnostic questions; non-interactive (no AskUserQuestion); frontmatter description distinct from requirements-critic |
| `requirements-critic` | 4 checks (problem vs solution, CRUD vs behavior, signal map, quantifier probing); interactive reformulation in Checks 2–4; explicit trigger phrases; bilingual body preserved |
| `problem-classifier` | 4 classes (CRUD, T&P, Integration, RC); signal scan; up to 4 discriminating questions; composite decomposition; RC handoff stub to Wave 3 `aggregate-designer`; edge cases section |

**Diff verdict categories:**

| Verdict | Meaning | Action |
|---------|---------|--------|
| **PASS** | All AJ rubric elements present; deltas are documented enhancements only | No code change |
| **GAP** | Missing or materially altered AJ rubric section | Remediate per FR-4 |
| **ENHANCEMENT** | Maister addition beyond AJ (guard, gate, chain) | Document in diff report; no revert unless breaks AC |

**Acceptance:** Diff report exists with per-skill PASS/GAP/ENHANCEMENT table; zero unresolved GAP items at E1 close.

---

### FR-3: Build Pipeline Gate

Run and record structural validation evidence.

**Commands (mandatory gate):**

```
make build
make validate
```

**Platforms validated:** Copilot (`maister-copilot`), Cursor (`maister-cursor`), Kiro (`maister-kiro`), Kilo (`maister-kilo`).

**Evidence to capture:**

| Evidence | Content |
|----------|---------|
| Exit codes | Both commands exit 0 |
| Kiro rule 14 | Skill directory count matches Makefile expectation (currently 63 dirs per gap analysis) |
| Generated skill dirs | All three Wave 1 skills present in each platform variant after build |
| Kiro merged commands | `maister-quick-*` dirs exist (per `platforms/kiro-cli/tests/build-core.test.sh`) |

**Evidence output:** `.maister/tasks/development/2026-06-16-aj-skills-wave1/verification/build-validate-evidence.md` (or inline in work-log with command output summary).

**Acceptance:** `make build && make validate` exit 0 on clean tree at E1 close. If fail, remediate per FR-4 and re-run.

---

### FR-4: Conditional Gap Remediation

Apply fixes **only** when FR-1, FR-2, or FR-3 reveal gaps. Default outcome is zero or near-zero code diff.

**Remediation rules:**

| Trigger | Allowed action | Forbidden action |
|---------|----------------|------------------|
| Missing AJ rubric section (GAP in diff) | Patch corresponding section in `plugins/maister/skills/*/SKILL.md` | Rewriting entire skill; changing unrelated waves |
| Command missing Skill delegation | Fix thin wrapper in `plugins/maister/commands/quick-*.md` | Embedding rubric in command |
| CLAUDE.md / README gap | Add missing index entries or Bundle A text | Restructuring full CLAUDE.md |
| Build/validate failure | Fix source in `plugins/maister/` or Kiro transform in `platforms/kiro-cli/` | Editing generated plugin dirs |
| Cosmetic only (heading case, wording) | Fix only if explicitly flagged as GAP affecting discoverability | Scope creep refactors |
| ADR-008 suggestion missing | Add optional bullet with no-auto-invoke guard | Auto-invocation wiring |

**Post-remediation sequence:**

1. Edit source only (`plugins/maister/` ± `platforms/kiro-cli/`)
2. `make build && make validate`
3. Re-run affected FR-1 checks and AJ diff sections
4. Update diff report verdict to PASS

**Acceptance:** No open GAP items; validate green after any remediation.

---

### FR-5: ADR-008 Documentation Requirement

Original ADR-008 decision: **8A standalone for Wave 1**; **8B soft suggestions after Wave 1**. Current implementation includes 8B in orchestrators ahead of schedule. User confirmed at Phase 2 gate: **keep as intentional Wave 1 inclusion**.

**Required documentation:**

| Artifact | Content |
|----------|---------|
| This spec | ADR-008 scope reconciliation recorded (see Architecture Decisions) |
| AJ diff report | Note orchestrator soft suggestions as Maister enhancement, not AJ source content |
| Decision log addendum | Append note to task `analysis/research-context/decision-log.md` **or** task `verification/adr-008-reconciliation.md` stating: Wave 1 ships 8A (explicit-only critics) **and** 8B (optional orchestrator bullets); no auto-invocation |

**Orchestrator bullets to verify (must remain optional with explicit guards):**

| Orchestrator | Phase context | Suggestion text present |
|--------------|---------------|-------------------------|
| `development` | After requirements drafted (Phase 5 area) | May suggest `/maister:quick-requirements-critic`; "Do not invoke automatically" |
| `product-design` | When transcripts in `context/` | May suggest `/maister:quick-transcript-critic`; "Do not invoke automatically" |

**Acceptance:** ADR-008 reconciliation artifact exists; orchestrator bullets verified present with no-auto-invoke guards; no revert to strict 8A-only.

---

## Reusable Components

### Existing Code to Leverage (primary deliverables — verify, do not recreate)

| Artifact | Path | Role in E1 close |
|----------|------|------------------|
| requirements-critic skill | `plugins/maister/skills/requirements-critic/SKILL.md` | Primary rubric to diff and verify |
| transcript-critic skill | `plugins/maister/skills/transcript-critic/SKILL.md` | Primary rubric to diff and verify |
| problem-classifier skill | `plugins/maister/skills/problem-classifier/SKILL.md` | Primary rubric to diff and verify |
| quick-* commands | `plugins/maister/commands/quick-{requirements-critic,transcript-critic,problem-classifier}.md` | Thin wrapper verification |
| Plugin index | `plugins/maister/CLAUDE.md` | Skills table, commands, Bundle A, grill-me/thermos backfill |
| User docs | `README.md` | Quick commands + Bundle A |
| Orchestrator integration | `plugins/maister/skills/development/SKILL.md`, `product-design/SKILL.md` | ADR-008 soft suggestions |
| Build gate | `Makefile`, `platforms/*/build.sh` | `make build`, `make validate` |
| Kiro build test | `platforms/kiro-cli/tests/build-core.test.sh` | Merged quick-* dir assertions |
| On-demand pattern reference | `plugins/maister/skills/test-strategy-reviewer/SKILL.md` | Convention comparison if frontmatter questions arise |
| AJ source rubrics | `architekt-jutra-code/week8/{1,2,3}/*/SKILL.md` | Read-only fidelity baseline |

### New Components Required

| Component | Condition |
|-----------|-----------|
| `verification/aj-rubric-diff.md` | **Always** — primary E1 deliverable |
| `verification/build-validate-evidence.md` | **Always** — unless equivalent captured in work-log |
| `verification/adr-008-reconciliation.md` | **If** decision log not updated inline |
| Source code patches | **Only if** FR-4 triggered by GAP or validate failure |

No new skill directories, commands, or agents expected for nominal close.

---

## Technical Approach

### Verification-First Workflow

```
Phase A: Static audit (FR-1)
    └── Read source artifacts → AC checklist pass/fail

Phase B: AJ rubric diff (FR-2)
    └── Side-by-side semantic checklist → aj-rubric-diff.md

Phase C: Build gate (FR-3)
    └── make build && make validate → evidence capture

Phase D: Conditional remediation (FR-4)
    └── IF any GAP or validate fail → minimal patch → rebuild → re-verify

Phase E: ADR-008 documentation (FR-5)
    └── Reconciliation note + orchestrator guard verification

Phase F: E1 close
    └── All AC pass + diff clean + validate green → mark epic complete
```

### Architecture Context (unchanged from research)

Hybrid pattern ADR-001: individual skills with in-skill "Recommended next steps" chain sections; no meta-orchestrator. Users invoke via `/maister:quick-*` → Skill tool → engine SKILL.md. Bundle A flow: `transcript-critic` → clarification → `requirements-critic` → `problem-classifier` when RC signals appear.

### Naming and Convention Guardrails

| Rule | Verification |
|------|--------------|
| Engine skill frontmatter: plain kebab | No `maister:` in skill `name:` |
| Command frontmatter: `maister:quick-*` | Source commands use colon prefix |
| Cross-refs use kebab dir names | No `CLAUDE.md` refs inside skill bodies (validate rule 5) |
| task-classifier ≠ problem-classifier | Documented in CLAUDE.md — preserve distinction |

---

## Implementation Guidance

### Recommended Verification Sequence

1. **AC static audit** — Read all Wave 1 source files; fill AC-1–AC-10 checklist
2. **AJ rubric diff** — Per skill, walk checklist dimensions; write `aj-rubric-diff.md`
3. **Build gate** — Run `make build && make validate`; capture evidence
4. **ADR-008 doc** — Write reconciliation note; verify orchestrator guards
5. **Conditional fix** — Only if steps 1–3 surface GAPs
6. **Re-verify** — Re-run failed checks after any patch
7. **Close** — Update work-log; proceed to implementation-verifier if orchestrator requires

Phases 1–2 can run in parallel per skill. Phase 3 follows static audit (or runs first if re-validating known-green tree). Phase 5 is conditional.

### Testing Approach

Wave 1 close uses **structural validation**, not application unit tests. No new test files for rubric content.

**Verification checks per step group (2–8 focused checks each):**

| Step group | Checks |
|------------|--------|
| AC static audit | Frontmatter schema per skill; disable-model-invocation present on critics; chain sections exist; CLAUDE.md + README entries; orchestrator no-auto-invoke guards |
| transcript-critic diff | All 7 AJ checks mapped; output format preserved; frontmatter description correct; ENHANCEMENT labels applied |
| requirements-critic diff | All 4 AJ checks mapped; interactive probes preserved; invocation guard + language gate labeled ENHANCEMENT |
| problem-classifier diff | 4 classes + probes + edge cases mapped; aggregate-designer stub correct; disable-model-invocation noted as Maister choice |
| Command wrappers | Three files exist; ACTION REQUIRED; Skill tool target matches skill dir name; no rubric duplication |
| Build gate | `make build` exit 0; `make validate` exit 0; spot-check generated Cursor commands for `maister-` prefix |
| ADR-008 | Both orchestrator bullets present; explicit "Do not invoke automatically"; reconciliation doc written |
| Post-remediation (if any) | Re-run validate; re-run affected diff sections; confirm GAP → PASS |

**Mandatory gate:** `make build && make validate` must pass before E1 close.

**Not in scope:** Playwright E2E, manual `/maister:quick-*` smoke, rubric output quality regression tests, Kiro shortcut layer validation.

### Standards Compliance

| Standard | Applicable rules |
|----------|------------------|
| `plugin-development.md` | Source-only edits; kebab-case dirs; thin commands; SKILL.md as SOT; never edit generated variants |
| `build-pipeline.md` | Source `maister:` command prefix; flat commands layout; platform transforms; CI validate gate |
| `conventions.md` | Task artifacts under task directory; spec before implementation |
| ADR-001 | Hybrid chain sections verified |
| ADR-002 | Category-aligned `quick-*` commands verified |
| ADR-003 | Strict Wave 1 scope — three skills only |
| ADR-007 | Bilingual bodies preserved; EN frontmatter |
| ADR-008 | Explicit-only critics + intentional soft suggestions documented |

---

## Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| SC-1 | All AC-1–AC-10 pass | Static audit checklist with file evidence |
| SC-2 | AJ rubric diff complete; zero unresolved GAPs | `verification/aj-rubric-diff.md` |
| SC-3 | `make build && make validate` green | Evidence file or work-log with exit 0 |
| SC-4 | ADR-008 reconciliation documented | Reconciliation artifact + orchestrator guard verification |
| SC-5 | Critics explicit-only (`disable-model-invocation: true`) | Frontmatter on requirements-critic, transcript-critic |
| SC-6 | Bundle A documented at plugin and skill level | CLAUDE.md + README + three chain sections |
| SC-7 | task-classifier vs problem-classifier distinguished | CLAUDE.md explicit comparison preserved |
| SC-8 | Source-only discipline maintained | No direct edits to generated platform variants |
| SC-9 | Conditional remediation only | Zero code diff acceptable if verification clean |
| SC-10 | Bilingual pedagogical content preserved | Diff confirms PL/EN content in requirements-critic, problem-classifier |

---

## Architecture Decision References

| ADR | Original decision | E1 verification application |
|-----|-------------------|-------------------------------|
| ADR-001 | Individual skills + chain sections | Verify "Recommended next steps" in all three SKILL.md |
| ADR-002 | Category-aligned `quick-*` commands | Verify three thin command wrappers |
| ADR-003 | Strict Wave 1 (3 skills) | Scope frozen; no Wave 2+ ports |
| ADR-007 | Bilingual bodies, EN frontmatter | Diff labels language gate as ENHANCEMENT |
| ADR-008 | 8A standalone + 8B soft suggestions post-W1 | **Reconciled:** 8A + 8B both ship Wave 1; document intentional early 8B inclusion; no auto-invocation |

---

## Known Limitations

- No automated rubric regression tests — fidelity depends on manual semantic diff quality
- E2E command smoke excluded by user — discovery relies on CLAUDE.md index and explicit invocation
- Full DDD chain incomplete until Waves 3–4 (`aggregate-designer` stub only)
- AJ source repo is external read-only reference — path must exist locally for diff
- Gap analysis recorded validate green as of 2026-06-16; re-run required at implementation close if source changed since

---

## Specification Revision History

| Date | Change | Trigger |
|------|--------|---------|
| 2026-06-16 | Initial verification-first spec | Task reframed from greenfield port to confirm-and-close |

---

**Estimated effort:** Low (~0–1 day — mostly diff + evidence; zero code if verification clean)  
**Prior greenfield spec (reference only):** `.maister/tasks/development/2026-06-13-aj-skills-wave1-adoption/implementation/spec.md`
