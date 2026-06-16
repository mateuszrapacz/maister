# Pragmatic Code Review: AJ Skills Wave 2 Adoption (E2 + E3)

**Reviewer:** maister-code-quality-pragmatist  
**Date:** 2026-06-14  
**Scope:** `language-md-convention` standard, three ported AJ skills, three command wrappers, ADR-008 soft orchestrator suggestions, Bundles C/D docs, Kiro build integration  
**Spec:** `implementation/spec.md`  
**Focus:** Over-engineering, unnecessary complexity, developer experience in ported skills and build changes

---

## Executive Summary

**Overall complexity:** Medium  
**Status:** ✅ **Appropriate for scope — rubric depth is intentional; packaging debt from Wave 1 continues**

Wave 2 delivers real, differentiated capabilities: architecture review (`linguistic-boundary-verifier`, `test-strategy-reviewer`), stakeholder communication (`metaprogram-classifier`), and a lean optional standard (`language-md-convention.md`). ADR-008 soft suggestions in orchestrators are minimal one-liners — exactly the right level of indirection. Command wrappers are genuinely thin (no duplicate input handling).

The main pragmatic concerns carry forward from Wave 1: **six Kiro directories per three user-facing tools**, **hardcoded inventory counts**, and **growing sed-based cross-reference transforms**. Wave 2 partially fixes Wave 1 Kiro delegation (M3) for merged wrappers and `run \`skill\`` chain links, but chain phrasing like "pair with \`thermos\`" still resolves to plain kebab names on Kiro.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 7 |
| Low | 5 |

**Verdict:** Shippable. Address Kiro chain-reference gaps and test staleness before Wave 3 adds more skills.

---

## Complexity Assessment

### Deliverable size

| Artifact | Lines | Notes |
|----------|------:|-------|
| `language-md-convention.md` | 90 | Lean optional standard with minimal example |
| `test-strategy-reviewer/SKILL.md` | 221 | Interactive classification + strategy comparison |
| `linguistic-boundary-verifier/SKILL.md` | 356 | Multi-phase boundary audit with mandatory ASCII diagrams |
| `metaprogram-classifier/SKILL.md` | 498 | Full 7-metaprogram pedagogical rubric (AJ source) |
| Command wrappers (×3) | 11 each | Thin Skill-tool delegates — appropriately minimal |
| Orchestrator suggestions | 1 line each | ADR-008 soft hints in development + product-design |
| Build integration | ~28 lines + count rebaseline (57→63, 32→38) | Incremental sed rules + 6 new merge/args entries |

### Appropriateness evaluation

**Justified complexity (keep):**

- Full rubrics in `SKILL.md` — faithful AJ port; splitting into `references/` would add navigation without reducing invocation depth.
- `disable-model-invocation: true` on review skills (`test-strategy-reviewer`, `linguistic-boundary-verifier`) — prevents unsolicited architecture/test audits during normal work.
- Language preference gates on interactive skills (`test-strategy-reviewer`, `metaprogram-classifier`) — addresses Wave 1 M4 for new interactive ports.
- Graceful degradation when no `language.md` files exist — avoids blocking teams that haven't adopted the convention.
- Bundles C/D documentation in `CLAUDE.md` and `README.md` — clear consumer workflows without orchestrator wiring.
- `reviews-* delegation note` in `CLAUDE.md` — honestly documents Skill-tool vs subagent split for review commands.

**Disproportionate complexity (simplify over time):**

- Continued hybrid **skill + command + Kiro merged skill** triple entry points (+6 Kiro dirs).
- Hardcoded Makefile/test counts incremented again (57→63, 32→38).
- ~17 new sed rules in `apply_delegation_transforms` — pattern-matching debt grows per wave.
- `build-core.test.sh` still references "11 commands" while 14 are merged; no assertions for Wave 2 merged files.
- Two different `reviews-*` delegation models (subagent vs skill) without a consumer decision tree.

---

## Key Issues Found

### High

#### H1. Wave 1 packaging debt compounded — six more Kiro dirs for three capabilities

**Evidence:** `platforms/kiro-cli/build.sh` adds both standalone and merged dirs per Wave 2 skill:

| Capability | Standalone Kiro dir | Merged command dir |
|------------|--------------------|--------------------|
| Test strategy review | `maister-test-strategy-reviewer` | `maister-reviews-test-strategy` |
| Linguistic boundaries | `maister-linguistic-boundary-verifier` | `maister-reviews-linguistic-boundaries` |
| Metaprogram classifier | `maister-metaprogram-classifier` | `maister-quick-metaprogram-classifier` |

Each also appears in `skills_needing_args` (+6 entries). Total Wave 1+2: **12 Kiro dirs for 6 user-facing tools**.

**Problem:** Kiro users browsing `plugins/maister-kiro/skills/` see duplicate entry points. Wave 1 pragmatic review (H2) recommended standalone-only or merge-only before Wave 2; Wave 2 repeated the pattern.

**Impact:** Wrong skill selection, validate count churn on every batch, maintainer burden scaling with Waves 3–4.

**Recommendation:** Before Wave 3, pick one Kiro strategy (standalone-only preferred — merged wrappers are 11-line aliases). Short-term: add Kiro guidance to `CLAUDE.md` — *"Prefer standalone `/maister-test-strategy-reviewer`; `/maister-reviews-test-strategy` is a thin alias."*

**Estimated effort:** 30 min (docs); 4–6 h (build dedup).

---

### Medium

#### M1. Kiro chain cross-references only partially transformed

**Evidence:** Wave 2 sed rules in `build.sh` (lines 314–320) match `run \`skill\`` patterns only. After `make build-kiro`, generated skills show:

- ✅ `run \`maister-test-strategy-reviewer\`` in `maister-linguistic-boundary-verifier`
- ✅ `run \`maister-problem-classifier\`` in `maister-test-strategy-reviewer`
- ❌ `pair with \`thermos\`` in `maister-test-strategy-reviewer` (not `maister-thermos`)
- ❌ `stress-test ... with \`grill-me\`` in `maister-metaprogram-classifier` (not `maister-grill-me`)
- ❌ Prose references to `context-distiller` (Wave 3) remain un-prefixed — skill does not exist yet

**Problem:** Agents following chain sections on Kiro may fail to resolve peer skills when phrasing isn't exactly `run \`skill\``.

**Recommendation:** Extend transforms with broader patterns, e.g. `` `thermos` `` → `` `maister-thermos` `` for known skill names (array-driven loop), or normalize chain sections to always use `run \`skill\`` phrasing in source.

**Estimated effort:** 1–2 h.

---

#### M2. Hardcoded Kiro inventory counts remain operational debt

**Evidence:** Wave 2 rebaselines atomically:

- Makefile Rule 14: **63** total dirs (was 57)
- Makefile Rule 28: **38** `maister-*` dirs (was 32)
- `build-core.test.sh`: 63 / 25 shortcuts
- `validation.test.sh`: 63 / 38
- `skills_needing_args`: +6 manual entries
- `merge_one`: +3 manual entries

**Problem:** Wave 3+ will repeat this six-touchpoint dance. Wave 1 pragmatic review flagged this (M2); Wave 2 did not address it.

**Recommendation:** Replace absolute counts with manifest-based diff (see Wave 1 pragmatic review M2 example). Acceptable deferral until Wave 3 planning.

**Estimated effort:** 4–8 h (cross-cutting).

---

#### M3. `build-core.test.sh` stale after Wave 2

**Evidence:**

- Test description still says *"11 commands merged"* (`build-core.test.sh` line 96) — now **14** merged commands.
- `test_commands_merged()` asserts Wave 1 quick commands only; does not check `maister-reviews-test-strategy`, `maister-reviews-linguistic-boundaries`, or `maister-quick-metaprogram-classifier`.

**Problem:** Wave 2 merge regressions would not be caught until `make validate-kiro` count failure or manual inspection.

**Recommendation:** Update test description to 14; add three `test -f` assertions for Wave 2 merged skills.

**Estimated effort:** 15 minutes.

---

#### M4. Two `reviews-*` delegation models without consumer guidance

**Evidence:**

| Command | Delegates via | Target |
|---------|--------------|--------|
| `/maister:reviews-code`, `reviews-pragmatic`, etc. | Task tool → subagent | `code-reviewer`, `code-quality-pragmatist`, … |
| `/maister:reviews-test-strategy`, `reviews-linguistic-boundaries` | Skill tool → skill | `test-strategy-reviewer`, `linguistic-boundary-verifier` |

`CLAUDE.md` documents the difference in a blockquote (line 533) but README command table lists all `reviews-*` uniformly.

**Problem:** Consumers expect consistent mechanics under the `reviews-*` namespace. Agents may use Task tool for Wave 2 reviews despite ACTION REQUIRED saying Skill tool.

**Recommendation:** Add a one-line note to README Reviews section: *"Architecture review commands (`reviews-test-strategy`, `reviews-linguistic-boundaries`) invoke skills; code audit commands invoke subagents."* Optional: rename to `quick-*` for skill-delegates (breaking change — defer).

**Estimated effort:** 15 minutes (docs).

---

#### M5. `linguistic-boundary-verifier` mandatory diagram ceremony

**Evidence:** `linguistic-boundary-verifier/SKILL.md` lines 111–113, 253–255:

> **ALWAYS draw diagrams when presenting violations and fixes to the user.** Every violation gets a BEFORE diagram … This is not optional.

**Problem:** Appropriate for architecture review fidelity, but high token/latency cost for large codebases (15+ violations noted in Gotchas). No "summary mode" for quick scans.

**Recommendation:** Not a Wave 2 blocker — AJ fidelity was the goal. Consider adding an optional scope gate at skill start: *"Full diagram review vs. table-only summary?"* in a future iteration if users report fatigue.

**Estimated effort:** 30 min (optional scope gate).

---

#### M6. `test-strategy-reviewer` blocks on classification confirmation

**Evidence:** Step 1 (lines 51–67): **Do NOT proceed to Step 3 until classification is confirmed** via `AskUserQuestion`.

**Problem:** Correct for accuracy; friction for experienced users reviewing a single obvious transformation. Multiple `AskUserQuestion` gates (classification, mock exceptions, facade level) make a "quick test sanity check" a multi-round session.

**Recommendation:** Accept as intentional interactive design. Optional: add escape hatch — *"Skip confirmation — proceed with preliminary classification"* for power users.

**Estimated effort:** 15 min if added later.

---

#### M7. Growing sed sprawl in `apply_delegation_transforms`

**Evidence:** Wave 1 added ~10 sed rules; Wave 2 added ~17 more (lines 304–320). Each future wave likely adds another batch for new skill names and chain references.

**Problem:** Maintainability — easy to miss a pattern variant (see M1). No single mapping table.

**Recommendation:** Refactor to a bash array loop:

```bash
SKILL_RENAMES=(requirements-critic maister-requirements-critic ... )
for pair in "${SKILL_RENAMES[@]}"; do
  # apply standard pattern set for each pair
done
```

**Estimated effort:** 2–3 h (refactor + verify build output).

---

### Low

#### L1. `metaprogram-classifier` lacks `disable-model-invocation`

**Evidence:** Spec R3 applies only to review skills. `metaprogram-classifier` has invocation guard text but no frontmatter flag.

**Impact:** Model may auto-invoke on communication-friction questions — similar to `grill-me` (also unguarded). Low risk given explicit trigger phrases.

**Recommendation:** Monitor; add `disable-model-invocation: true` only if unwanted auto-invocation is reported.

---

#### L2. Wave 3 skill references in chain sections

**Evidence:** `linguistic-boundary-verifier` references `context-distiller` (Wave 3) in fit test and chain sections. Honest "(Wave 3)" label on line 355 — matches Wave 1 `aggregate-designer` pattern.

**Impact:** Agents may attempt to invoke non-existent skill. Mitigated by explicit Wave 3 deferral label.

---

#### L3. Kiro `@` shortcuts deferred again

**Evidence:** Spec out of scope; Wave 1 same deferral.

**Impact:** Kiro users must use full `/maister-*` names for Wave 2 commands. Consistent with Wave 1.

---

#### L4. Repeated boilerplate phrase in linguistic-boundary-verifier

**Evidence:** *"architectural dependency tools (ArchUnit, deptrac, Nx, etc.)"* appears 4+ times in one skill.

**Impact:** Minor maintainability noise if tool list changes.

**Recommendation:** Optional single glossary reference at top of Phase 2.

---

#### L5. `linguistic-boundary-report.md` output path unspecified

**Evidence:** Phase 5 specifies filename only, not task-directory anchoring.

**Impact:** Standalone invocation may write report to cwd. Consistent with other on-demand AJ skills (requirements-critic outputs inline). Acceptable for plugin utilities.

---

## Developer Experience (Plugin Consumers)

### Friction points

| Area | Assessment |
|------|------------|
| **Discoverability** | ✅ Bundles C/D in README + CLAUDE.md; language-md standard indexed |
| **Invocation clarity** | ⚠️ Hybrid skill+command pattern continues; two `reviews-*` delegation models |
| **Kiro-specific** | ⚠️ Duplicate dirs (H1); partial chain transforms (M1); @ shortcuts deferred |
| **Language** | ✅ Language gates on new interactive skills; boundary verifier mostly EN |
| **Safety during dev work** | ✅ Review skills won't auto-invoke |
| **Optional convention adoption** | ✅ Graceful degradation when no language.md — excellent |
| **Orchestrator intrusion** | ✅ ADR-008 one-line soft suggestions only — no auto-invocation |
| **Command file size** | ✅ 11 lines, true thin wrappers |

### Positive DX choices

- `language-md-convention.md` is optional, well-scoped, with a copy-paste minimal example
- Graceful degradation path ("Convention not adopted" report) avoids punishing teams without DDD docs
- Language preference gates on `test-strategy-reviewer` and `metaprogram-classifier`
- Bundles C/D give clear workflow stories without orchestrator complexity
- `reviews-*` vs subagent distinction documented in CLAUDE.md
- Wave 2 command wrappers fixed Wave 1 M1 (no duplicate input prompts)
- Kiro merged wrappers correctly transform delegated skill names after full build (Wave 1 M3 fix extended to Wave 2)
- Source-only discipline maintained — no direct edits to generated variants

### Consumer mental model (recommended)

```text
Architecture review (modules with language.md)?
  → /maister:reviews-linguistic-boundaries
  → then /maister:reviews-test-strategy on same scope
  → optional: /maister:thermos on PR

Stakeholder communication friction?
  → /maister:quick-metaprogram-classifier on their message
  → then /maister:grill-me to stress-test your proposal

During development (optional, not automatic):
  → /maister:quick-requirements-critic after requirements drafted
  → /maister:quick-transcript-critic when transcripts in product-design context/
```

---

## Requirements Alignment

| Requirement | Status | Pragmatic note |
|-------------|--------|----------------|
| R1 language-md-convention | ✅ Met | Lean 90-line standard |
| R2 three skills with Maister conventions | ✅ Met | Guards, frontmatter, kebab-case |
| R3 disable-model-invocation on review skills | ✅ Met | Classifier intentionally excluded |
| R4 three ACTION REQUIRED commands | ✅ Met | True thin wrappers |
| R5 soft suggestions only | ✅ Met | One line each — minimal |
| R6 Bundles C/D documented | ✅ Met | README + CLAUDE.md |
| R7 make build && validate | ✅ Met | Verified post-build |
| R8 Kiro counts 63/25/38 | ✅ Met | Hardcoded — debt remains |

### Correctly deferred (reduces over-engineering)

- No orchestrator auto-invocation of review skills
- No Kiro @ shortcuts
- No `implementation-verifier` test-strategy mention (8D)
- No `language-md-generator` skill
- No `context-distiller` implementation (Wave 3)

---

## Context Consistency

| Pattern A | Pattern B | Location |
|-----------|-----------|----------|
| Wave 1 hybrid packaging (skill + command + Kiro merge) | Wave 2 same pattern | `build.sh` merge_one |
| `reviews-*` → subagent (existing) | `reviews-*` → skill (Wave 2) | commands/ |
| `quick-*` for classifiers (Wave 1) | `reviews-*` for architecture audits (Wave 2) | Naming split — logical |
| Wave 1 M3 sed fix for merged wrappers | M1 gap for non-`run` chain phrasing | build.sh |
| Plugin doc: skills <1000 lines | metaprogram-classifier 498 lines | Within guideline |
| ADR-008 soft suggestions | No orchestrator hooks | development/product-design SKILL.md |

---

## Recommended Simplifications

### Priority 1 — Extend Kiro chain transforms (M1)

Broaden sed patterns or normalize chain section phrasing to `run \`skill\`` so `thermos`, `grill-me`, and future peers resolve on Kiro.

**Impact:** Reliable Bundle C/D chaining on Kiro.

---

### Priority 2 — Update build-core tests (M3)

Assert Wave 2 merged files exist; fix "11 commands" → "14 commands" label.

**Impact:** Catch merge regressions early.

---

### Priority 3 — Document Kiro duplicate-dir + reviews delegation (H1 + M4)

Add Kiro alias guidance and reviews subagent vs skill note to README.

**Impact:** Consumer clarity without code changes.

---

### Priority 4 — Decide Kiro dedup strategy before Wave 3 (H1)

Standalone-only or merge-only for on-demand utilities.

**Impact:** Prevents 63 → 75+ dir explosion.

---

## Summary Statistics

| Metric | Wave 2 delivered | Cumulative (W1+W2) |
|--------|------------------|---------------------|
| Source skills added | 3 | 6 |
| Standards added | 1 | 1 |
| Source commands added | 3 | 6 |
| Kiro skill dirs added | 6 | 12 |
| `skills_needing_args` entries | +6 | +12 |
| Hardcoded count touchpoints updated | 4 files | 4 files (same files, again) |
| Sed rules in delegation transforms | +17 | ~27 total |
| Packaging patterns for utilities | 3 (skill-only, quick-hybrid, reviews-skill-hybrid) | unchanged count, new variant |

---

## Conclusion

Wave 2 is **not over-engineered at the content level**. The AJ rubrics are dense because linguistic boundaries, test strategy alignment, and metaprogram diagnosis require dense guidance. The optional `language-md-convention` standard and graceful degradation path are pragmatic highlights — teams without DDD docs aren't blocked.

Over-engineering and DX friction concentrate in **platform packaging**, carried forward from Wave 1:

1. Six more Kiro directories for three tools (12 total across both waves).
2. Hardcoded inventory counts bumped again without manifest-based validate.
3. Sed-based cross-reference transforms growing per wave, with gaps for non-`run` chain phrasing.
4. Two `reviews-*` delegation models that README doesn't distinguish.

Wave 2 **did** improve on Wave 1: language gates, true thin command wrappers, Kiro merged-wrapper skill name fixes for Wave 2 commands, and ADR-008 orchestrator hints that are appropriately minimal.

### Action items (ordered by ROI)

1. **Update `build-core.test.sh` for 14 merged commands + Wave 2 file assertions** (15 min)
2. **Add README note on reviews subagent vs skill delegation** (15 min)
3. **Extend Kiro chain sed patterns for `thermos`, `grill-me`, and prose skill refs** (1–2 h)
4. **Document Kiro standalone vs alias preference in CLAUDE.md** (30 min)
5. **Before Wave 3: Kiro dedup strategy + manifest-based validate counts** (design — 5–9 h)

**Total estimated simplification effort:** ~2–3 h immediate; 5–9 h structural  
**Risk of simplification:** Low for docs and tests; medium for Kiro dedup

---

*Review is read-only. No code was modified.*
