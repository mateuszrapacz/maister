# AC Static Audit Report (FR-1)

**Task:** `.maister/tasks/development/2026-06-16-aj-skills-wave1`  
**Date:** 2026-06-16  
**Scope:** Wave 1 E1 acceptance criteria (AC-1–AC-10) against `plugins/maister/` source  
**Auditor:** Task Group 1 (implementation-plan-executor)

---

## Executive Summary

| Field | Result |
|-------|--------|
| **Overall status** | **PASS** |
| **AC rows passing** | 10 / 10 |
| **Focused verification checks** | 8 / 8 pass (1 observation on transcript-critic guard style) |
| **Remediation triggers** | None — no Group 5 items |

All Wave 1 source artifacts, documentation, orchestrator guards, and build pipeline gates verified with file:line evidence.

---

## Eight Focused Verification Checks (Step 1.1)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | AC-1: Three skills with plain kebab `name:` (no `maister:` prefix) | **PASS** | `requirements-critic/SKILL.md:2`, `transcript-critic/SKILL.md:2`, `problem-classifier/SKILL.md:2` |
| 2 | AC-2: Three `quick-*` commands with `**ACTION REQUIRED**` + Skill tool delegation | **PASS** | `quick-requirements-critic.md:6-9`, `quick-transcript-critic.md:6-9`, `quick-problem-classifier.md:6-9` |
| 3 | AC-3: `disable-model-invocation: true` on all three skills (incl. `problem-classifier`) | **PASS** | `requirements-critic/SKILL.md:4`, `transcript-critic/SKILL.md:4`, `problem-classifier/SKILL.md:4` |
| 4 | AC-4: "Recommended next steps" chain sections in all three SKILL.md | **PASS** | `transcript-critic/SKILL.md:219`, `requirements-critic/SKILL.md:280`, `problem-classifier/SKILL.md:501` |
| 5 | AC-5–AC-7: CLAUDE.md Wave 1 + Bundle A + grill-me/thermos; README quick commands + Bundle A | **PASS** | `CLAUDE.md:505-515,521-524,595-597`; `README.md:112-119` |
| 6 | AC-9–AC-10: Orchestrator no-auto-invoke guards | **PASS** | `development/SKILL.md:251`, `product-design/SKILL.md:251` |
| 7 | Invocation guard blocks in all three skill bodies | **PASS**¹ | `requirements-critic/SKILL.md:10-12`, `problem-classifier/SKILL.md:10-12`, `transcript-critic/SKILL.md:3-4` |
| 8 | `task-classifier` vs `problem-classifier` distinction in CLAUDE.md | **PASS** | `CLAUDE.md:515`, `CLAUDE.md:612` |

¹ **Observation (non-blocking):** `transcript-critic` uses frontmatter `Invoked ONLY on explicit request` (L3) plus `disable-model-invocation: true` (L4) rather than a dedicated `**Invocation guard**` body block. `requirements-critic` and `problem-classifier` have full body guards. Intent satisfied; optional FR-4 alignment would add a matching body block.

---

## AC-1 Through AC-10 Pass/Fail Table

| AC | Criterion | Status | Evidence (file:line) |
|----|-----------|--------|----------------------|
| **AC-1** | Three skills in `plugins/maister/skills/` with normalized frontmatter (plain kebab `name`, no `maister:` prefix on engine skills) | **PASS** | `skills/requirements-critic/SKILL.md:2` `name: requirements-critic`; `skills/transcript-critic/SKILL.md:2` `name: transcript-critic`; `skills/problem-classifier/SKILL.md:2` `name: problem-classifier` |
| **AC-2** | Three `quick-*` thin command wrappers with ACTION REQUIRED + Skill tool delegation; no embedded rubric | **PASS** | `commands/quick-requirements-critic.md:6-9` (skill: `requirements-critic`); `commands/quick-transcript-critic.md:6-9` (skill: `transcript-critic`); `commands/quick-problem-classifier.md:6-9` (skill: `problem-classifier`). Each file 11 lines; rubric lives in skills only |
| **AC-3** | `disable-model-invocation: true` on critique skills; `problem-classifier` also has flag (scope gate) | **PASS** | `skills/requirements-critic/SKILL.md:4`; `skills/transcript-critic/SKILL.md:4`; `skills/problem-classifier/SKILL.md:4` |
| **AC-4** | "Recommended next steps" chain sections with kebab sibling refs (ADR-001) | **PASS** | `transcript-critic/SKILL.md:219-225` → `requirements-critic`; `requirements-critic/SKILL.md:280-288` → `transcript-critic`, `problem-classifier`; `problem-classifier/SKILL.md:501-509` → `aggregate-designer` (Wave 3 stub) |
| **AC-5** | CLAUDE.md entries: Wave 1 skills, commands, Bundle A, task-classifier vs problem-classifier distinction | **PASS** | Skills table `CLAUDE.md:505-511`; Bundle A `CLAUDE.md:513`; distinction `CLAUDE.md:515`; quick commands `CLAUDE.md:595-597` |
| **AC-6** | CLAUDE.md backfill for `grill-me` and `thermos` | **PASS** | `CLAUDE.md:521` (`grill-me`); `CLAUDE.md:524` (`thermos`). Section: `### Review & Utility Skills` (L517) — spec references "On-Demand Skills"; content present under Review & Utility |
| **AC-7** | README user-facing quick command docs + Bundle A | **PASS** | Quick commands `README.md:112-114`; Bundle A flow `README.md:119` |
| **AC-8** | `make build && make validate` passes all four platforms | **PASS** | Executed 2026-06-16: `make build` exit 0 (Copilot, Cursor, Kiro, Kilo); `make validate` exit 0 — Copilot, Cursor, Kiro (rules 1–28, 63 skill dirs), Kilo checks passed. Generated variants: `plugins/maister-cursor/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md`; `plugins/maister-copilot/commands/quick-{requirements-critic,transcript-critic,problem-classifier}.md` |
| **AC-9** | Commands invoke skills; no orchestrator auto-invocation | **PASS** | Commands delegate via Skill tool (AC-2). Orchestrator guards: `development/SKILL.md:251` "Do not invoke the skill automatically"; `product-design/SKILL.md:251` "Do not invoke the skill automatically" |
| **AC-10** | Wave 1 standalone — critics not auto-invoked during drafting | **PASS** | `disable-model-invocation: true` on all three (AC-3). Body/frontmatter guards: `requirements-critic/SKILL.md:10-12`; `problem-classifier/SKILL.md:10-12`; `transcript-critic/SKILL.md:3` (frontmatter explicit-only). Orchestrator soft-suggestion-only (AC-9) |

---

## Grep Results (Steps 1.3–1.4)

### Step 1.3 — `disable-model-invocation` on Wave 1 skills

```bash
rg -l 'disable-model-invocation: true' plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md
```

**Result:** 3 files matched (exit 0)

```
plugins/maister/skills/requirements-critic/SKILL.md:4:disable-model-invocation: true
plugins/maister/skills/transcript-critic/SKILL.md:4:disable-model-invocation: true
plugins/maister/skills/problem-classifier/SKILL.md:4:disable-model-invocation: true
```

### Step 1.4 — CLAUDE.md and README Wave 1 entries

| Pattern | File | Lines |
|---------|------|-------|
| `requirements-critic`, `transcript-critic`, `problem-classifier` | `plugins/maister/CLAUDE.md` | 509–511 |
| Bundle A | `plugins/maister/CLAUDE.md` | 513 |
| `task-classifier` vs `problem-classifier` | `plugins/maister/CLAUDE.md` | 515, 612 |
| `grill-me`, `thermos` | `plugins/maister/CLAUDE.md` | 521, 524 |
| `/maister:quick-*` commands | `plugins/maister/CLAUDE.md` | 595–597 |
| Quick commands + Bundle A | `README.md` | 112–119 |

---

## Orchestrator Guard Evidence (Step 1.5)

| Orchestrator | Location | Guard text |
|--------------|----------|------------|
| `development/SKILL.md` | L251 | `**Optional (ADR-008 — soft suggestion, no auto-invocation):** After requirements are drafted, you may suggest the user run requirements-critic via /maister:quick-requirements-critic ... Do not invoke the skill automatically.` |
| `product-design/SKILL.md` | L251 | `**Optional (ADR-008 — soft suggestion, no auto-invocation):** When meeting transcripts are present in context/, you may suggest /maister:quick-transcript-critic ... Do not invoke the skill automatically.` |

---

## Frontmatter & Command Wrapper Detail (Step 1.2)

### Skills — frontmatter

| Skill | `name:` | `disable-model-invocation` | Invocation guard |
|-------|---------|---------------------------|------------------|
| `requirements-critic` | L2: `requirements-critic` | L4: `true` | L10–12: `**Invocation guard**` + `Do NOT invoke when...` |
| `transcript-critic` | L2: `transcript-critic` | L4: `true` | L3: description `Invoked ONLY on explicit request` |
| `problem-classifier` | L2: `problem-classifier` | L4: `true` | L10–12: `**Invocation guard**` + `Do NOT invoke when...` |

### Commands — thin wrappers

| Command | `name:` (maister: prefix OK for commands) | ACTION REQUIRED | Skill delegation |
|---------|------------------------------------------|-----------------|------------------|
| `quick-requirements-critic` | L2: `maister:quick-requirements-critic` | L6 | L8–9: `skill: "requirements-critic"` |
| `quick-transcript-critic` | L2: `maister:quick-transcript-critic` | L6 | L8–9: `skill: "transcript-critic"` |
| `quick-problem-classifier` | L2: `maister:quick-problem-classifier` | L6 | L8–9: `skill: "problem-classifier"` |

---

## Build Pipeline Evidence (AC-8)

| Step | Command | Exit code | Platforms verified |
|------|---------|-----------|-------------------|
| Build | `make build` | 0 | Copilot CLI, Cursor Agent, Kiro CLI, Kilo CLI |
| Validate | `make validate` | 0 | Copilot, Cursor, Kiro (28 rules), Kilo |

---

## Remediation Triggers (Group 5)

| Item | Severity | Action |
|------|----------|--------|
| — | — | No failures; Group 5 not required |

**Optional observation (not a trigger):** Add explicit `**Invocation guard**` body block to `transcript-critic/SKILL.md` for parity with `requirements-critic` and `problem-classifier` if FR-4 strict guard uniformity is desired.

---

## Steps Completed

| Step | Description | Status |
|------|-------------|--------|
| 1.1 | Eight focused verification checks defined and executed | ✅ |
| 1.2 | Frontmatter and command wrappers read; file:line evidence recorded | ✅ |
| 1.3 | Grep `disable-model-invocation` on Wave 1 skills | ✅ |
| 1.4 | Grep CLAUDE.md and README for Wave 1 / Bundle A entries | ✅ |
| 1.5 | Orchestrator no-auto-invoke bullets confirmed | ✅ |
| 1.6 | This report populated with AC-1–AC-10 table | ✅ |
| 1.7 | All 8 verification checks pass (1 non-blocking observation) | ✅ |
