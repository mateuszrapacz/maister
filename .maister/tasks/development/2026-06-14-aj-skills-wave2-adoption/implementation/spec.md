# Specification: Wave 2 AJ Skills Adoption (E2 + E3)

**Status:** Implemented  
**Research basis:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis`

## Scope

### In scope

1. **E2 — `language-md-convention` standard**
   - Create `.maister/docs/standards/global/language-md-convention.md`
   - Add INDEX.md entry

2. **E3 — Three skills ported from Architekt Jutra**
   - `test-strategy-reviewer` — invocation guard, `disable-model-invocation`, language gate, chain section
   - `linguistic-boundary-verifier` — invocation guard, `disable-model-invocation`, graceful degradation (ADR-006), chain section
   - `metaprogram-classifier` — invocation guard, language gate, chain to `grill-me`

3. **E3 — Three thin commands**
   - `reviews-test-strategy.md`
   - `reviews-linguistic-boundaries.md`
   - `quick-metaprogram-classifier.md`

4. **ADR-008 soft orchestrator suggestions**
   - `development/SKILL.md` Phase 5 — optional requirements-critic suggestion
   - `product-design/SKILL.md` Phase 1 — optional transcript-critic suggestion when transcripts in `context/`

5. **Documentation**
   - `plugins/maister/CLAUDE.md` — Wave 2 skills, commands, Bundles C/D, reviews delegation note
   - `README.md` — command rows + Bundles C/D sections

6. **Build / CI**
   - `platforms/kiro-cli/build.sh` updates (merge_one, skills_needing_args, sedi cross-refs)
   - Makefile count rules: 57→63, 32→38
   - Kiro validation tests updated

### Out of scope

- Kiro `@` shortcuts for Wave 2 commands (deferred)
- `implementation-verifier` optional test-strategy mention (8D)
- `language-md-generator` skill
- Orchestrator auto-invocation of review skills (ADR-008: soft suggestions only)

## Requirements

| ID | Requirement | Acceptance |
|----|-------------|------------|
| R1 | language-md-convention standard exists and is indexed | File + INDEX.md entry |
| R2 | Three skills in `plugins/maister/skills/` with Maister conventions | Kebab-case, frontmatter, guards |
| R3 | Review skills have `disable-model-invocation: true` | test-strategy-reviewer, linguistic-boundary-verifier |
| R4 | Three ACTION REQUIRED command wrappers | Thin Skill invocations |
| R5 | Soft suggestions in orchestrators only | No auto-invocation |
| R6 | CLAUDE.md and README document Bundles C/D | Full bundle documentation |
| R7 | `make build && make validate` pass | Exit code 0 |
| R8 | Kiro counts: 63 skills, 25 shortcuts, 38 maister-* dirs | Post-build verification |

## Architecture

- **Source of truth:** `plugins/maister/` only; generated variants via `make build`
- **Pattern:** Wave 1 gold templates (requirements-critic, problem-classifier)
- **Bilingual:** EN frontmatter; preserve AJ body language; language gates on interactive skills

## Assumptions

- AJ source read-only at `/Users/mrapacz/Projects/architekt-jutra-code/`
- linguistic-boundary-verifier degrades gracefully when no `language.md` files exist
