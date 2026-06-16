# Work Log

## 2026-06-14 — Wave 2 Started

**Task:** `.maister/tasks/development/2026-06-14-aj-skills-wave2-adoption`  
**Scope:** Epic E2 + E3 (per user clarifications)

### Clarifications resolved
- Full Wave 2: E2 standard + E3 skills/commands/suggestions
- README: full Bundles C/D documentation
- Kiro @ shortcuts: deferred

---

## 2026-06-14 — Implementation (E2 + E3)

### E2: language-md-convention standard
- Created `.maister/docs/standards/global/language-md-convention.md`
- Updated `.maister/docs/INDEX.md`

### E3: Skills ported (AJ → Maister)
- `plugins/maister/skills/test-strategy-reviewer/SKILL.md` — invocation guard, disable-model-invocation, language gate, chain section
- `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md` — invocation guard, disable-model-invocation, graceful degradation, chain section
- `plugins/maister/skills/metaprogram-classifier/SKILL.md` — invocation guard, language gate, chain to grill-me

### E3: Commands
- `reviews-test-strategy.md`, `reviews-linguistic-boundaries.md`, `quick-metaprogram-classifier.md`

### E3: ADR-008 soft suggestions
- `development/SKILL.md` Phase 5 — optional requirements-critic suggestion
- `product-design/SKILL.md` Phase 1 — optional transcript-critic suggestion when transcripts in context/

### Documentation
- `plugins/maister/CLAUDE.md` — Wave 2 skills, commands, Bundles C/D, reviews delegation note
- `README.md` — 3 command rows + Bundles C/D

### Build / CI
- `platforms/kiro-cli/build.sh` — merge_one, skills_needing_args, sedi cross-refs
- `Makefile` rules 14/28: 57→63, 32→38
- Kiro tests updated

### Build results

| Command | Exit Code |
|---------|-----------|
| `make build` | 0 |
| `make validate` | 0 |

Kiro counts: 63 skill dirs, 25 shortcuts, 38 `maister-*` dirs

---

## 2026-06-14 — Verification fixes (Phase 11)

Applied all fixable issues from verification report:

| Fix | File(s) |
|-----|---------|
| Ship `language-md-convention` via init bundle | `plugins/maister/skills/docs-manager/docs/standards/global/language-md-convention.md`, `docs-manager/docs/INDEX.md` |
| Taxonomy disambiguation (testing vs modeling class) | `test-strategy-reviewer/SKILL.md` |
| EN/PL output templates per language gate | `metaprogram-classifier/SKILL.md` |
| Report outline numbering | `linguistic-boundary-verifier/SKILL.md` |
| Wave 2 merged command assertions (14 total) | `platforms/kiro-cli/tests/build-core.test.sh` |
| context-distiller Wave 3 deferral note | `linguistic-boundary-verifier/SKILL.md` |

**Deferred (manual):** commit working tree, semver bump.
