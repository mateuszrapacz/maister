# Requirements: Wave 1 AJ Skills Verification & Completion

**Task:** `.maister/tasks/development/2026-06-14-aj-skills-adoption`  
**Date:** 2026-06-14  
**Research basis:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`

---

## Initial Description

Verify and complete Wave 1 adoption of Architekt Jutra skills into `plugins/maister/` per research recommendations. Wave 1 code already exists (requirements-critic, transcript-critic, problem-classifier + quick-* commands). Close remaining gaps to meet E1 acceptance criteria.

---

## Q&A from Clarification Rounds

### Phase 1

| Question | Answer |
|----------|--------|
| Task scope? | Verify & complete Wave 1 only |
| problem-classifier invocation? | Add `disable-model-invocation: true` |

### Phase 2

| Question | Answer |
|----------|--------|
| Kiro @ shortcuts? | Defer |
| Language preference gate? | Include (G4) |
| README depth? | Minimal (3 command rows + Bundle A sentence) |

### Phase 5

| Question | Answer |
|----------|--------|
| User journey? | `/maister:quick-*` commands or natural language; Bundle A is manual chain via Recommended Next Steps |
| Code reuse? | `requirements-critic` + `quick-requirements-critic` as gold template; edit `plugins/maister/` only |
| Language gate scope? | Both `requirements-critic` and `problem-classifier` |

---

## Similar Features Identified

| Feature | Path | Reuse |
|---------|------|-------|
| Gold skill template | `plugins/maister/skills/requirements-critic/SKILL.md` | Frontmatter, invocation guard, chain sections |
| Gold command template | `plugins/maister/commands/quick-requirements-critic.md` | Thin Skill tool delegation |
| On-demand pattern | `plugins/maister/skills/grill-me/SKILL.md` | Interactive skill shape |
| Explicit-only pattern | `plugins/maister/skills/thermos/SKILL.md` | `disable-model-invocation` precedent |
| CLAUDE.md entries | `plugins/maister/CLAUDE.md` L503–584 | Already complete — no changes needed |
| Kiro build | `platforms/kiro-cli/build.sh` | Already integrated — no shortcut changes |

---

## Visual Assets

None — plugin markdown artifacts only, no UI.

---

## Functional Requirements Summary

### FR-1: problem-classifier explicit invocation (G1)
- Add `disable-model-invocation: true` to frontmatter
- Add Invocation guard block matching `requirements-critic` pattern
- Include trigger phrases from description

### FR-2: README discoverability (G2)
- Add 3 rows to Quick Commands table:
  - `/maister:quick-transcript-critic` — meeting decision-process audit
  - `/maister:quick-requirements-critic` — interactive requirements quality critique
  - `/maister:quick-problem-classifier` — DDD problem classification
- Add one Bundle A sentence: transcript-critic → requirements-critic → problem-classifier (when RC signals)

### FR-3: Language preference gate (G4)
- Add first-step `AskUserQuestion` on `requirements-critic` and `problem-classifier`
- Options: English / Polish / Match input language
- Gate runs before main workflow; output language follows selection

### FR-4: Build validation
- Run `make build && make validate` after all edits
- All three platform variants must pass validation
- Confirm `disable-model-invocation` present in all 3 Wave 1 skills across source

### FR-5: Conformance verification
- Commands delegate via Skill tool (no inline rubric)
- Bundle A chain sections present in all 3 SKILL.md files
- No orchestrator changes in development/product-design skills
- No re-porting of AJ rubric content

---

## Reusability Opportunities

- Copy invocation guard structure from `requirements-critic` to `problem-classifier`
- README Quick Commands table format matches existing `quick-plan`, `quick-dev`, `quick-bugfix` rows
- Language gate can use same AskUserQuestion pattern across both interactive skills

---

## Scope Boundaries

**Included:**
- G1, G2, G4 fixes in source
- `make build && make validate`
- Conformance grep checks documented in spec

**Excluded:**
- Wave 2+ ports
- Kiro @ shortcuts
- Orchestrator soft suggestions
- `language.md` convention file (E2)
- CLAUDE.md changes (already complete)
- Generated variant direct edits

---

## Technical Considerations

- Edit only `plugins/maister/`; regenerate via `make build`
- `AskUserQuestion` transforms to `AskQuestion` on Cursor build
- Kiro transforms AskUserQuestion to CHAT GATE markers — language gate must work on all platforms
- Skill count unchanged (no new skills) — Kiro Makefile counts stay at 57/25/32
- Risk: low — documentation and frontmatter edits only
