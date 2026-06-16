# Specification: Wave 1 AJ Skills Verification & Completion (Epic E1)

**Task:** `.maister/tasks/development/2026-06-14-aj-skills-adoption`  
**Date:** 2026-06-14  
**Baseline:** Commit `607ed5b` (v2.2.0) — Wave 1 artifacts already in `plugins/maister/`  
**Research basis:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`  
**Epic:** E1 — Wave 1 Requirements & Classification

---

## Summary

Wave 1 Architekt Jutra (AJ) skill adoption is ~95% complete. Three skills (`requirements-critic`, `transcript-critic`, `problem-classifier`), three `quick-*` commands, Bundle A chain sections, and CLAUDE.md documentation are already in place. This task closes three remaining gaps (G1, G2, G4), re-runs the build pipeline, and verifies E1 acceptance criteria. No new skills or commands are created.

**Gold templates:**
- Skill: `plugins/maister/skills/requirements-critic/SKILL.md` (frontmatter, invocation guard, chain sections)
- Command: `plugins/maister/commands/quick-requirements-critic.md` (thin Skill tool delegation)
- Explicit-only precedent: `plugins/maister/skills/thermos/SKILL.md` (`disable-model-invocation: true`)

---

## Scope

### Included

| ID | Work item |
|----|-----------|
| G1 | Add `disable-model-invocation: true` and invocation guard to `problem-classifier` |
| G2 | Minimal README update — 3 Quick Commands rows + Bundle A sentence |
| G4 | First-step language preference gate on `requirements-critic` and `problem-classifier` |
| — | `make build && make validate` after all edits |
| — | Conformance grep checks against E1 acceptance criteria |
| — | Verification that generated variants inherit changes (via build, not direct edits) |

### Excluded

| Item | Rationale |
|------|-----------|
| Wave 2+ skill ports (E3–E5) | Out of scope per user clarification |
| G3 — Kiro `@` shortcut skills | Deferred per scope clarifications |
| Orchestrator soft suggestions (ADR-008 Wave 2+) | Correctly absent in Wave 1 |
| `language.md` convention file (E2) | Separate parallel epic |
| CLAUDE.md changes | Already complete (lines ~507–584) |
| Re-porting AJ rubric content | Already done in baseline |
| `modeling-*` standard documentation (G5) | Deferred to E4 |
| Direct edits to `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/` | Generated — rebuild only |
| New skills, commands, or agents | Skill count unchanged (Kiro: 57/25/32) |

---

## Functional Requirements

### FR-1: problem-classifier explicit invocation (G1)

**File:** `plugins/maister/skills/problem-classifier/SKILL.md`

1. Add `disable-model-invocation: true` to YAML frontmatter (after `argument-hint`, matching sibling skills).
2. Insert an **Invocation guard** section immediately after the H1 title, matching the `requirements-critic` pattern:
   - State that the skill activates ONLY on explicit user request.
   - Include trigger phrases from the frontmatter `description`:
     - "jaka klasa problemu"
     - "jak to sklasyfikować modelarsko"
     - "problem class"
     - "which modeling class"
     - "classify" / "classification" in modeling context
   - Include a **Do NOT invoke** clause: do not run when the user is writing, describing, or elaborating requirements without asking for classification; do not auto-invoke during requirements drafting or spec creation.
3. Preserve existing intent table, 4-class rubric, clarifying-question workflow, and Recommended next steps section — no rubric re-porting.

**Rationale:** E1 requires explicit-only invocation on all Wave 1 on-demand utilities. User clarification confirmed `problem-classifier` gets `disable-model-invocation: true` for parity with critic skills (ADR-008).

---

### FR-2: README discoverability (G2)

**File:** `README.md` — Quick Commands section (currently lines ~107–111)

1. Append three rows to the existing Quick Commands table (same `| Command | Use When |` format as `quick-plan`, `quick-dev`, `quick-bugfix`):

   | Command | Use When |
   |---------|----------|
   | `/maister:quick-transcript-critic` | Audit a meeting transcript for decision-process problems |
   | `/maister:quick-requirements-critic` | Interactive requirements quality critique (4-check rubric) |
   | `/maister:quick-problem-classifier` | Classify business requirements into DDD modeling problem classes |

2. Add one sentence immediately after the table describing Bundle A:

   > **Bundle A (requirements quality):** Run `transcript-critic` → `requirements-critic` → `problem-classifier` when resource-contention signals appear — chain via each skill's Recommended Next Steps, not an orchestrator.

3. Do **not** add a dedicated AJ adoption section, Kiro `@` hints, or duplicate CLAUDE.md content. Minimal discoverability only.

---

### FR-3: Language preference gate (G4)

**Files:**
- `plugins/maister/skills/requirements-critic/SKILL.md`
- `plugins/maister/skills/problem-classifier/SKILL.md`

Per ADR-007 (7A + 7D), add a **first-step language preference gate** on both interactive skills, before Input Acquisition / signal scan / Check 1.

#### Gate specification

Insert a new section `## Language Preference` as the first workflow step after the invocation guard (requirements-critic) or after the intent table block (problem-classifier), before existing input/workflow logic.

**Gate behavior:**

1. Invoke `AskUserQuestion` with prompt: *"Which language should I use for questions and output?"*
2. Options (exactly three):
   - **English** — all questions, reports, and reformulations in English
   - **Polish** — all questions, reports, and reformulations in Polish
   - **Match input language** — detect language from user-provided requirements/transcript text; default to English if ambiguous
3. Store the selection and apply it for the remainder of the skill session.
4. Update or supersede existing inline "Match the user's language" instructions (e.g., requirements-critic line ~263) to reference the gate selection: *"Use the language chosen in the Language Preference gate for all questions and output."*
5. Gate runs once per invocation; do not re-ask mid-workflow unless the user explicitly requests a language change.

#### Platform compatibility

| Platform | Transform | Requirement |
|----------|-----------|-------------|
| Claude Code (source) | None | `AskUserQuestion` in source |
| Cursor | `AskUserQuestion` → `AskQuestion` (`platforms/cursor/build.sh`) | Gate must use standard `AskUserQuestion` wording so sed transform applies |
| Kiro | `AskUserQuestion` → **CHAT GATE** (`platforms/kiro-cli/transforms/askuser-to-chat-gate.md`) | Gate text must match transform patterns; headless default: **Match input language** |

**Out of scope for G4:** `transcript-critic` (non-interactive report skill), `metaprogram-classifier` (Wave 2).

---

### FR-4: Build validation

After all G1/G2/G4 edits:

```bash
make build && make validate
```

**Pass criteria:**
- Exit code 0 for both commands
- All three platform variants (`maister-cursor`, `maister-copilot`, `maister-kiro`) pass structural validation
- Kiro skill directory counts unchanged: 57 total, 25 shortcuts, 32 `maister-*` dirs (no G3 shortcut additions)
- Generated `problem-classifier/SKILL.md` in each variant carries `disable-model-invocation: true`
- Generated interactive skills carry language gate (as `AskQuestion` on Cursor, CHAT GATE on Kiro)

---

### FR-5: Conformance verification

Confirm existing Wave 1 implementation meets E1 without re-porting:

| Check | Expected state |
|-------|----------------|
| Commands delegate via Skill tool | All three `quick-*.md` use `ACTION REQUIRED` + Skill tool pattern — no inline rubric |
| Bundle A chain sections | Present in all three SKILL.md files (`## Recommended Next Steps` or `## Recommended next steps`) |
| `disable-model-invocation` on critics + classifier | All three Wave 1 skills in source after G1 fix |
| No orchestrator leakage | Zero references to Wave 1 skills in `skills/development/` or `skills/product-design/` |
| CLAUDE.md complete | Skills table, commands table, Bundle A, task-classifier distinction — no edits needed |
| No AJ rubric re-port | Edit only frontmatter, guards, language gate, README — not rubric bodies |

---

## Acceptance Criteria by Gap

### G1 — problem-classifier explicit invocation

| # | Criterion | Verification |
|---|-----------|--------------|
| G1-AC-1 | Frontmatter contains `disable-model-invocation: true` | `rg 'disable-model-invocation: true' plugins/maister/skills/problem-classifier/SKILL.md` |
| G1-AC-2 | Invocation guard block present after H1 with trigger phrases and Do NOT invoke clause | Manual read; structure matches `requirements-critic` |
| G1-AC-3 | Flag propagates to all generated variants | `rg disable-model-invocation plugins/maister-*/skills/problem-classifier/SKILL.md` after `make build` |
| G1-AC-4 | Existing rubric, intent table, and chain section unchanged in substance | Diff review — only guard + frontmatter additions |

### G2 — README discoverability

| # | Criterion | Verification |
|---|-----------|--------------|
| G2-AC-1 | Three new rows in Quick Commands table with correct command names and one-line purposes | Read `README.md` Quick Commands section |
| G2-AC-2 | Bundle A sentence present after table | Grep `Bundle A` in `README.md` |
| G2-AC-3 | No new sections beyond minimal table + sentence | Diff review — no AJ adoption essay, no Kiro section changes |

### G4 — Language preference gate

| # | Criterion | Verification |
|---|-----------|--------------|
| G4-AC-1 | `## Language Preference` section exists as first workflow step in both interactive skills | Grep `Language Preference` in both SKILL.md files |
| G4-AC-2 | Gate uses `AskUserQuestion` with English / Polish / Match input language options | Manual read |
| G4-AC-3 | Subsequent workflow references gate selection, not ad-hoc language detection | Grep "Language Preference gate" in both files |
| G4-AC-4 | `make validate` passes — Kiro CHAT GATE transform succeeds | `make build && make validate` |
| G4-AC-5 | Cursor variant contains `AskQuestion` at language gate | Grep language gate section in `plugins/maister-cursor/skills/*/SKILL.md` |

### E1 — Epic acceptance (aggregate)

| # | Criterion | Verification |
|---|-----------|--------------|
| E1-AC-1 | 3 skills, 3 commands present and functional | Artifact inventory + smoke invoke |
| E1-AC-2 | Commands invoke skills; critics/classifier explicit-only | G1 + command read + `disable-model-invocation` grep |
| E1-AC-3 | `make build && make validate` green | CI-equivalent local run |
| E1-AC-4 | CLAUDE.md backfill complete (grill-me/thermos + Wave 1) | Already satisfied — confirm no regression |
| E1-AC-5 | README lists Wave 1 quick commands | G2 acceptance |

---

## File Change List

| File | Change type | Gap / FR |
|------|-------------|----------|
| `plugins/maister/skills/problem-classifier/SKILL.md` | Edit | G1, G4 |
| `plugins/maister/skills/requirements-critic/SKILL.md` | Edit | G4 |
| `README.md` | Edit | G2 |

### Files explicitly NOT changed

| File | Reason |
|------|--------|
| `plugins/maister/skills/transcript-critic/SKILL.md` | Already has `disable-model-invocation`; non-interactive — no language gate |
| `plugins/maister/commands/quick-*.md` | Already complete thin wrappers |
| `plugins/maister/CLAUDE.md` | Already documents Wave 1 skills, commands, Bundle A |
| `platforms/kiro-cli/build.sh` | No G3 shortcuts; counts unchanged |
| `Makefile`, `platforms/kiro-cli/tests/build-core.test.sh` | No count updates needed |
| `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/` | Regenerated via `make build` only |

### Generated outputs (via build, not hand-edited)

- `plugins/maister-cursor/skills/problem-classifier/SKILL.md`
- `plugins/maister-cursor/skills/requirements-critic/SKILL.md`
- `plugins/maister-copilot/skills/problem-classifier/SKILL.md`
- `plugins/maister-copilot/skills/requirements-critic/SKILL.md`
- `plugins/maister-kiro/skills/maister-problem-classifier/SKILL.md` (or equivalent merged path)
- `plugins/maister-kiro/skills/maister-requirements-critic/SKILL.md` (or equivalent merged path)

---

## Implementation Notes

### Edit discipline

- Source-only edits in `plugins/maister/` per `plugin-development.md` and `build-pipeline.md`
- Minimal diff: frontmatter, guard blocks, language gate section, README rows — no rubric rewrites
- Match existing formatting: `---` frontmatter, `##` section headings, `AskUserQuestion` tool references

### Language gate placement

**requirements-critic** — insert after Invocation guard block (line ~12), before `## Input Acquisition`:

```markdown
## Language Preference

AskUserQuestion — "Which language should I use for questions and output?"
Options: English | Polish | Match input language

Apply the selected language for all questions, reformulations, and report output in this session.
```

**problem-classifier** — insert after intent table / scope paragraph (before `## The 4 Problem Classes`), after any invocation guard added in G1.

### Invocation guard placement (G1)

Insert immediately after `# Modelling Problem Classifier` H1, before the existing "This is a problem class classifier" paragraph. Move or retain the intent table after the guard.

### README table format

Follow existing Quick Commands rows exactly — backtick-wrapped command names, concise "Use When" column, no extra markdown nesting.

---

## Verification Checklist

Execute in order after implementation:

### Structural validation

- [ ] `make build` exits 0
- [ ] `make validate` exits 0
- [ ] No manual edits under `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/`

### G1 — disable-model-invocation

```bash
rg 'disable-model-invocation: true' \
  plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md
```

Expected: 3 matches (one per file).

```bash
rg 'Invocation guard' plugins/maister/skills/problem-classifier/SKILL.md
```

Expected: 1 match.

### G2 — README

```bash
rg 'quick-transcript-critic|quick-requirements-critic|quick-problem-classifier|Bundle A' README.md
```

Expected: 4+ matches (3 commands + Bundle A sentence).

### G4 — Language gate

```bash
rg 'Language Preference' \
  plugins/maister/skills/{requirements-critic,problem-classifier}/SKILL.md
```

Expected: 2 matches.

### FR-5 — Conformance

```bash
rg 'requirements-critic|transcript-critic|problem-classifier' \
  plugins/maister/skills/development/
```

Expected: no matches.

```bash
rg 'ACTION REQUIRED' plugins/maister/commands/quick-{requirements-critic,transcript-critic,problem-classifier}.md
```

Expected: 3 matches.

```bash
rg -i 'recommended next' \
  plugins/maister/skills/{requirements-critic,transcript-critic,problem-classifier}/SKILL.md
```

Expected: 3 matches.

### Generated variant spot-check (post-build)

```bash
rg 'disable-model-invocation' plugins/maister-cursor/skills/problem-classifier/SKILL.md
rg 'AskQuestion|CHAT GATE' plugins/maister-cursor/skills/requirements-critic/SKILL.md
```

### Smoke test (manual)

- [ ] `/maister:quick-transcript-critic` with sample meeting notes → structured critique report
- [ ] `/maister:quick-requirements-critic` with sample requirement → language gate fires, then 4-check critique
- [ ] `/maister:quick-problem-classifier` with sample feature description → language gate fires, then classification with clarifying questions

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Duplicate re-porting of AJ rubrics | High if attempted | Spec limits edits to guards, gates, README only |
| Kiro CHAT GATE transform failure on new gate text | Low | Use standard `AskUserQuestion` phrasing; run `make validate` |
| Scope creep to Wave 2+ or G3 | Medium | Explicit exclusion list; no build.sh shortcut changes |
| Language gate conflicts with bilingual rubric examples | Low | Gate controls output language; PL examples in rubric remain as pedagogical reference |

---

## References

| Artifact | Path |
|----------|------|
| Requirements | `analysis/requirements.md` |
| Gap analysis | `analysis/gap-analysis.md` |
| Scope clarifications | `analysis/scope-clarifications.md` |
| Research HLD | `analysis/research-context/high-level-design.md` |
| Decision log (ADR-007, ADR-008) | `analysis/research-context/decision-log.md` |
| Plugin development standard | `.maister/docs/standards/global/plugin-development.md` |
| Build pipeline standard | `.maister/docs/standards/global/build-pipeline.md` |
| Kiro AskUserQuestion transform | `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` |

---

## Definition of Done

1. G1, G2, G4 acceptance criteria pass
2. E1 aggregate acceptance criteria pass
3. `make build && make validate` green
4. File change list matches actual diff (3 source files only)
5. No generated variant hand-edits
6. Work logged in `implementation/work-log.md`
