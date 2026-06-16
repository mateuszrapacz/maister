# Code Review Report: Wave 2 AJ Skills Adoption

**Task:** `.maister/tasks/development/2026-06-14-aj-skills-wave2-adoption`  
**Reviewer:** code-reviewer (automated)  
**Date:** 2026-06-14  
**Scope:** All files listed in `implementation/work-log.md` (E2 standard, E3 skills/commands, orchestrator suggestions, docs, build/CI)

---

## Executive Summary

Wave 2 adoption is **largely well-executed** and aligns with spec R1–R8. The three AJ skills follow established Wave 1 patterns (invocation guards, thin command wrappers, chain sections, Kiro `build.sh` parity). Documentation (CLAUDE.md, README.md, INDEX.md) and ADR-008 soft orchestrator suggestions are correctly scoped.

**Verdict:** Approve with minor fixes. No blocking security or correctness defects in source artifacts. Five fixable documentation/consistency issues and two informational notes below.

---

## Scope Reviewed

| Area | Files |
|------|-------|
| Standard (E2) | `.maister/docs/standards/global/language-md-convention.md`, `.maister/docs/INDEX.md` |
| Skills (E3) | `plugins/maister/skills/test-strategy-reviewer/SKILL.md`, `linguistic-boundary-verifier/SKILL.md`, `metaprogram-classifier/SKILL.md` |
| Commands (E3) | `plugins/maister/commands/reviews-test-strategy.md`, `reviews-linguistic-boundaries.md`, `quick-metaprogram-classifier.md` |
| Orchestrators | `plugins/maister/skills/development/SKILL.md` (Phase 5), `product-design/SKILL.md` (Phase 1) |
| Plugin docs | `plugins/maister/CLAUDE.md`, `README.md` |
| Build / CI | `platforms/kiro-cli/build.sh`, `Makefile`, `platforms/kiro-cli/tests/build-core.test.sh`, `validation.test.sh` |

---

## Positive Findings

1. **Spec compliance (R1–R6):** `language-md-convention` standard is complete, indexed, and cross-linked from `linguistic-boundary-verifier` graceful-degradation path. Review skills include `disable-model-invocation: true` per R3. Commands are thin Skill-tool wrappers per R4/R5.

2. **Wave 1 pattern fidelity:** Frontmatter schemas, invocation guards, language gates (test-strategy, metaprogram), and `Recommended next steps` chain sections mirror `requirements-critic` / `problem-classifier` gold templates.

3. **ADR-008 orchestrator suggestions:** Development Phase 5 and product-design Phase 1 additions are correctly soft (“may suggest”, “do not invoke automatically”) with explicit command paths.

4. **Bundle documentation:** Bundles C/D are documented consistently in README.md and CLAUDE.md with correct command ordering and `language-md-convention` reference.

5. **Kiro build integration:** `merge_one` entries, `skills_needing_args` entries, and Wave 2 `sedi` cross-ref blocks in `platforms/kiro-cli/build.sh` mirror Wave 1 structure. Makefile rules 14/28 correctly updated (57→63, 32→38).

6. **Graceful degradation:** `linguistic-boundary-verifier` “Convention not adopted” path is well-defined and points to the new standard — satisfies ADR-006 intent.

---

## Issues

| ID | Severity | Location | Issue | Fixable |
|----|----------|----------|-------|---------|
| CR-1 | **Medium** | `plugins/maister/skills/test-strategy-reviewer/SKILL.md:210` | Chain recommends `problem-classifier` when “production code problem class is unclear”, but the two skills use **different taxonomies**: test-strategy uses Transformation / Stateful Object / Integration (xUnit-style); problem-classifier uses CRUD / T&P / Integration / RC (modeling). Users chaining Bundle A → Bundle C may get conflicting classifications. | Yes — add a disambiguation note in the chain section (e.g., “modeling class vs testing class”) or point to a requirements/business-requirement path only. |
| CR-2 | **Low** | `plugins/maister/skills/metaprogram-classifier/SKILL.md:421-451` | Language gate offers English/Polish/Match input, but Step 5 output template is **hardcoded Polish** section headers (`Analiza Metaprogramów`, `Wykryte Metaprogramy`, `Rób`/`Unikaj`). English selection will produce mixed-language output. | Yes — provide EN/PL template variants or instruct “translate section headers per language gate”. |
| CR-3 | **Low** | `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md:284-287` | Phase 5 report outline has **duplicate item number 3** (`Context Inventory` and `Relationship Map` both numbered 3). | Yes — renumber to 3, 4, 5, 6. |
| CR-4 | **Low** | `plugins/maister/skills/linguistic-boundary-verifier/SKILL.md:42,355` | References `context-distiller` (Wave 3, not ported). Kiro `sedi` only rewrites `run \`context-distiller\`` — prose references remain un-prefixed on Kiro. | Yes — add “(Wave 3 — not yet available)” consistently (line 42 already implies deferral; line 355 has it; align line 42) or use neutral wording until Wave 3 ships. |
| CR-5 | **Low** | `platforms/kiro-cli/tests/build-core.test.sh:28-37,96` | Test comment/assertion still says **“11 commands merged”** and only asserts Wave 1 merged commands (`quick-requirements-critic`, etc.). Wave 2 adds three more (`reviews-test-strategy`, `reviews-linguistic-boundaries`, `quick-metaprogram-classifier`). | Yes — update count comment to 14 and assert presence of new merged SKILL.md files. |
| CR-6 | **Info** | `plugins/maister/skills/metaprogram-classifier/SKILL.md` (frontmatter) | No `disable-model-invocation: true` (unlike review skills). Spec R3 exempts metaprogram; guard text is present. Optional hardening for auto-discovery platforms. | Yes — add flag if parity with `requirements-critic` / `problem-classifier` is desired. |
| CR-7 | **Info** | `plugins/maister/skills/metaprogram-classifier/SKILL.md` | ~499 lines — large but within skill reference budget for pedagogical AJ port; no action required unless trimming is a project goal. | N/A |

---

## Spec Requirement Traceability

| Req | Status | Notes |
|-----|--------|-------|
| R1 language-md standard + INDEX | ✅ Pass | Standard complete; INDEX entry at `standards/global/language-md-convention.md` |
| R2 Three skills with conventions | ✅ Pass | Kebab-case dirs, frontmatter, invocation guards |
| R3 Review skills `disable-model-invocation` | ✅ Pass | test-strategy-reviewer, linguistic-boundary-verifier |
| R4 Three ACTION REQUIRED commands | ✅ Pass | Thin Skill delegations |
| R5 Soft orchestrator suggestions only | ✅ Pass | development Phase 5, product-design Phase 1 |
| R6 CLAUDE.md + README Bundles C/D | ✅ Pass | Full bundle docs + reviews delegation note |
| R7 `make build && make validate` | ⚠️ Unverified in review env | Work-log reports exit 0; reviewer environment hit unrelated stale-artifact / lock errors on full `make build`. Kiro-only clean rebuild logic is sound when build completes. |
| R8 Kiro counts 63/25/38 | ✅ Pass (post `build-kiro`) | Count rules and validation.test.sh updated correctly |

---

## Build / CI Notes

- **Makefile:** Rules 14 and 28 correctly expect 63 total and 38 `maister-*` skill directories (+6 from three skills + three merged commands).
- **Kiro `build.sh`:** Wave 2 `merge_one`, `skills_needing_args`, and `sedi` blocks are complete and symmetric with Wave 1.
- **Test gap:** `build-core.test.sh` should assert Wave 2 merged command skills (CR-5).
- **Environment:** Full `make validate` failed in review session due to missing `plugins/maister-cursor/commands/quick-plan.md` (pre-existing generated-tree drift, not introduced by Wave 2 source edits).

---

## Security & Safety

- No secrets, credentials, or unsafe shell patterns in changed source files.
- Review skills are read-only by design (`linguistic-boundary-verifier` explicitly states no code modification).
- `metaprogram-classifier` includes ethical guardrails against manipulation/profiling — appropriate for stakeholder-communication use case.

---

## Recommendations (Priority Order)

1. **CR-1:** Clarify taxonomy relationship between test-strategy-reviewer and problem-classifier in chain section (highest user-impact).
2. **CR-2:** Align metaprogram output template with language gate.
3. **CR-3:** Fix duplicate numbering in linguistic-boundary report outline.
4. **CR-5:** Extend Kiro build-core test coverage for Wave 2 merged commands.
5. **CR-4 / CR-6:** Optional polish before Wave 3.

---

## Conclusion

Wave 2 AJ skills adoption meets the implementation spec with strong consistency to Wave 1 patterns. Address CR-1 and CR-2 before treating the feature as fully polished; remaining items are documentation and test-hygiene fixes.
