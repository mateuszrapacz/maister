# Pragmatic Code Quality Review

**Task**: `.maister/tasks/development/2026-07-09-improve-grill-skills`  
**Reviewer**: maister-code-quality-pragmatist  
**Scope**: Source changes vs `implementation/spec.md` — over-engineering, scope creep, unnecessary abstraction  
**Date**: 2026-07-10  
**Verdict**: **pass-with-concerns**

## TL;DR

Implementation matches the spec’s scale for a Markdown/bash plugin task. The strongest pragmatic choice is **D2 — no shared grilling engine**: two short `SKILL.md` files (63 and 82 lines) instead of a reusable protocol module. `grill-me` grew from 11 lines to 63, but that expansion buys explicit invocation guards, read-only prohibitions, and a convergence gate — appropriate for a safety-sensitive interactive skill. The main concerns are **intentional protocol duplication** (drift risk), a **brittle FR-5.4 grep contract** (~80 lines of prose assertions), and **`grill-with-docs` packing three concerns** (grilling, `language.md`, sparse ADRs) into one skill — product-intentional, but boundary-heavy. No command wrappers, no `CONTEXT.md`, no orchestrator wiring. **0 critical / 0 high** over-engineering findings; merge-ready from a pragmatist perspective with minor maintenance watch-items.

## Key Decisions

- **Two skills, not one mode flag** — Spec D1/D6 and implementation follow through: `grill-me` (read-only) and `grill-with-docs` (docs-only writes). A single skill with a `--docs` flag would be smaller on disk but worse for discovery and invocation guards; the split is justified.
- **Duplicate protocol, don’t abstract** — Both skills repeat ~15 lines of grilling discipline with a one-line parity note (“update both skills when changing grilling rules”). Correct YAGNI for two consumers; extraction deferred until a third appears (spec D2).
- **Structural tests over behavioral E2E** — FR-5.4 adds six grep patterns in `phase2.test.sh` because skills are prose. Pragmatic given the domain, but tests assert wording not session behavior.
- **Sparse ADR gate inline** — Three significance criteria plus a 7-line MADR skeleton embedded in `grill-with-docs` rather than a `references/` file or shared ADR skill. Right-sized; avoids a new abstraction.
- **User docs follow existing catalog pattern** — Four doc files updated with short entries linking to `SKILL.md` for depth (FR-7.7). No skill-body duplication in docs.
- **Kiro inventory bump is mechanical, not architectural** — +2 directories, six synchronized count sites (Makefile + three tests + build). Operational tax inherited from the build pipeline, not new framework code.

## Open Questions / Risks

- **Protocol drift** — If grilling rules change, both `grill-me` and `grill-with-docs` must be edited manually. The parity note helps; there is no automated check that the two protocol sections stay identical.
- **Grep contract fragility** — FR-5.4 patterns (e.g. pattern D’s `(edit|mutat).*(documentation|code|files?)`) can pass on incidental prose or fail on valid rewording. Acceptable guardrail, not a behavioral guarantee.
- **`grill-with-docs` boundary pressure** — Vocabulary testing + edge-case scenarios overlap conceptually with `context-distiller` and `linguistic-boundary-verifier`. The “Not This Skill” table and user-doc when-to-use table mitigate, but real sessions may still blur lines without user discipline.
- **Working tree hygiene** — `plugins/maister/skills/grill-with-docs/` was untracked at review time; ensure it is committed with the rest of the source changes.
- **Generated Kiro tree** — Local `plugins/maister-kiro/skills` showed incomplete inventory (43 dirs, missing `/grill-with-docs` shortcut) while work-log reports `make validate` PASS. Regenerate before merge if the tree is stale.

---

## Review Dimensions

### 1. Scale appropriateness

| Artifact | Lines / size | Assessment |
|----------|--------------|------------|
| `grill-me/SKILL.md` | 63 (was 11) | ✅ Within FR-1.10 target (60–100). Growth is guards + prohibitions, not ceremony. |
| `grill-with-docs/SKILL.md` | 82 | ✅ Within NFR-1 ceiling (60–150). |
| `phase2.test.sh` addition | ~80 lines (FR-5.4) | ⚠️ Large relative to skill size; justified as the only automated safety net for prose skills. |
| User docs delta | ~+50 lines `on-demand-skills.md` | ✅ Required by FR-7; follows link-not-copy pattern. |
| `platforms/*/build.sh` | +2–4 lines each | ✅ Minimal copy-adjacent Kiro shortcut + sed. |
| Implementation plan | 52 steps / 7 groups | ℹ️ Process artifact; source diff is ~220 insertions across 12 tracked files + 1 new skill dir. |

**Conclusion**: Code and doc volume match task complexity. Not over-built for a multi-platform plugin change.

### 2. Over-engineering check

| Pattern | Present? | Verdict |
|---------|----------|---------|
| Shared grilling engine / `references/` module | No | ✅ Correct per D2 and `minimal-implementation.md` |
| Command wrappers | No | ✅ Skills invoked via palette / natural language (NFR-2) |
| `CONTEXT.md` / `CONTEXT-MAP.md` | No | ✅ Explicitly prohibited |
| Orchestrator auto-chain | No | ✅ Standalone utilities |
| Session state files | No | ✅ FR-1.10 honored |
| ADR policy harmonization with research workflow | No | ✅ Out of scope |
| Cursor/Kilo new test infrastructure | No | ✅ FR-5.6 skipped; count stays in band |
| MADR template as separate artifact | No | ✅ 7-line inline skeleton sufficient |

**Conclusion**: No unnecessary abstractions introduced. The implementation resists the obvious trap (extracting a “grilling framework”).

### 3. Scope creep check

| Item | In spec? | Creep? |
|------|----------|--------|
| New `grill-with-docs` skill | FR-2 | No — core deliverable |
| Rewrite `grill-me` with explicit-only + read-only | FR-1 | No |
| Four user-doc files | FR-7 | No |
| Kiro shortcut `/grill-with-docs` | FR-4.2 | No |
| Cursor `build.sh` sed for cross-skill refs | FR-4.5 (Should) | Minor optional scope; 2 lines, low cost |
| FR-5.4 six-pattern grep contract | FR-5.4 | No — spec-required; slightly heavier than minimal “file exists” test |
| Bundle D wording update in `CLAUDE.md` | FR-3.4 | No |
| When-to-use comparison table | FR-7.2 | No |

**Conclusion**: Implementation stays inside spec boundaries. No drive-by refactors or unrelated platform changes in the source diff.

### 4. Duplication and maintainability

**Protocol duplication (medium concern)**  
`grill-me` lines 25–37 and `grill-with-docs` lines 14–21 express the same four-step protocol in slightly different wording. Spec chose this over a shared include (no templating in the build pipeline for skill bodies). Mitigations present:

- Cross-reference in both skills to update the pair together
- FR-5.4 partially guards prohibitions, not protocol parity

**Recommendation (optional, not blocking)**: If protocol drifts in practice, add a single grep test that both files contain the same four bold headings (`One question at a time`, `Facts vs decisions`, etc.) — cheaper than a shared engine.

**Documentation duplication (low concern)**  
Boundary guidance appears in: skill “Not This Skill” table, `CLAUDE.md` catalog note, `on-demand-skills.md` when-to-use table. Redundant but appropriate for discovery at each entry point; entries are short.

**Kiro count synchronization (low concern, pre-existing)**  
Six sites must bump together on every new skill. This task follows the established pattern correctly; the tax is pipeline-wide, not introduced by grilling work.

### 5. Skill design pragmatism

**`grill-me`**  
Follows proven patterns from `requirements-critic` (invocation guard) and `thermos` (`disable-model-invocation`). Prohibitions are explicit and repeated (“Never implement the plan”) — slightly redundant but helps FR-5.4 and model compliance. `Input` section is minimal; no over-structured session framework.

**`grill-with-docs`**  
Adds three doc-specific sections on top of the shared protocol:

1. Session discovery (read INDEX, `language.md`, ADRs, code)
2. Vocabulary / boundary testing during grilling
3. `language.md` maintenance + sparse ADR policy

Each section is principle-based bullets, not algorithms. The three-criteria ADR gate is a good anti-proliferation guard (addresses spec risk “trivial ADR proliferation”). Per-term edit gate (“one confirmed term, one edit”) aligns with one-question discipline without extra machinery.

**Could one skill suffice?**  
A mode flag would reduce file count but worsen explicit invocation, catalog clarity, and read-only safety. Two skills is the right trade-off for this plugin’s discovery model.

### 6. Test pragmatism

**Appropriate**

- Inventory counts (69/43/26) — necessary for Kiro build integrity
- Shortcut mapping test — one grep, high value
- Prohibition grep (patterns A, B, F) — catches accidental “go implement” regression

**Heavy but acceptable**

- Patterns C–E (permissive language scan, read-only doc mutation, CONTEXT.md ban) — regex on prose is fragile; still cheaper than manual-only verification for a markdown-only feature

**Missing (acceptable gap)**

- No test that protocol sections stay in sync between skills
- No behavioral session test (infeasible without live agent runs)

### 7. Positive findings

1. **YAGNI respected** — No speculative `grilling` skill, factory, or orchestrator extension.
2. **Line budgets met** — Both skills concise; no `references/` directory bloat.
3. **Thin platform transforms** — Kiro/Cursor changes are copy-adjacent to existing `grill-me` pattern.
4. **Catalog discipline** — Both skills marked “Explicit request only.” in `CLAUDE.md` and user docs (implementation-plan D3).
5. **Clear mutability boundary** — Read-only vs docs-only distinction survives in generated Cursor output (`maister-grill-with-docs/SKILL.md` inspected).
6. **TDD red gate** — Count tests updated before skill content; appropriate for inventory-driven pipeline.

---

## Findings

| ID | Severity | Category | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| P1 | Medium | Duplication | Grilling protocol duplicated across two `SKILL.md` files with no automated parity check | Accept per D2; add optional heading-level grep test if drift observed in practice |
| P2 | Medium | Test design | FR-5.4 six-pattern grep contract tests wording, not behavior; rewording can break CI | Keep for prohibitions; avoid expanding to full protocol assertions |
| P3 | Medium | Skill scope | `grill-with-docs` combines grilling + `language.md` + ADRs — high conceptual surface vs `grill-me` | Keep as specified; rely on “Not This Skill” + user doc table; no further features without user demand |
| P4 | Low | Docs | Boundary matrix repeated in catalog, skill, and `on-demand-skills.md` | Accept — discovery at each entry point outweighs DRY here |
| P5 | Low | Process | `grill-with-docs` source directory untracked in git at review | Stage and commit with the rest of the task |
| P6 | Low | Pipeline | Six-site Kiro inventory sync remains operational burden | No action this task; consider codegen of counts only if a third skill add causes another miss |

---

## Verdict Summary

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 3 |

**Overall**: **pass-with-concerns**

The implementation is appropriately lean for a Markdown/bash plugin task. Spec-mandated duplication and grep-based safety nets are the main maintainability trade-offs; neither rises to over-engineering. No scope creep beyond the written spec. Safe to merge after confirming `grill-with-docs` is tracked and `make build && make validate` passes on a clean tree.

---

## Standards Alignment

| Standard | Status |
|----------|--------|
| `minimal-implementation.md` — no speculative abstractions | ✅ |
| `plugin-development.md` — principles in SKILL.md, source-only edits | ✅ |
| `build-pipeline.md` — Kiro counts, shortcuts, sed transforms | ✅ |
| `language-md-convention.md` — `language.md` not `CONTEXT.md` | ✅ |
| `conventions.md` — user-confirmed doc edits | ✅ |

---

## Manual Session Checklist (behavioral — not automatable)

For post-merge spot-check (spec acceptance criteria 1–2):

- [ ] `grill-me` asks one question, waits, does not edit files when grilled on a sample plan
- [ ] `grill-with-docs` proposes a term, waits for confirmation, then edits `language.md` only after confirm
- [ ] `grill-with-docs` does not offer ADR for trivial reversible choices
- [ ] Neither skill starts implementation when user says “sounds good, build it”
