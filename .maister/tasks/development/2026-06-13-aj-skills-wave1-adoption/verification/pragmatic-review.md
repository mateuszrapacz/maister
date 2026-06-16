# Pragmatic Code Review: AJ Skills Wave 1 Adoption (Epic E1)

**Reviewer:** maister-code-quality-pragmatist  
**Date:** 2026-06-13  
**Scope:** Three ported AJ skills, three `quick-*` command wrappers, `CLAUDE.md` backfill, Kiro build integration (FR-1–FR-7)  
**Spec:** `implementation/spec.md`  
**Focus:** Over-engineering, unnecessary complexity in plugin markdown + build integration

---

## Executive Summary

**Overall complexity:** Medium  
**Status:** ⚠️ **Mostly appropriate — rubric depth is intentional; packaging adds avoidable indirection**

Wave 1 delivers real value: three on-demand utilities that did not exist in Maister (`requirements-critic`, `transcript-critic`, `problem-classifier`), with sensible guardrails (`disable-model-invocation` on critics only, no new agents, no orchestrator hooks). The ~993 lines of rubric content are a faithful AJ port, not speculative abstraction.

The main pragmatic concern is **packaging fragmentation**, not rubric size. Wave 1 introduces a third `quick-*` pattern alongside existing ones (`quick-bugfix` as skill-only with `maister:` prefix, `quick-plan`/`quick-dev` as inline commands), plus a command→Skill-tool hop that duplicates input handling. Kiro consumers get **two directories per capability** (standalone + merged quick-*), and maintainers must bump **six hardcoded touchpoints** per future utility batch.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 6 |
| Low | 4 |

**Verdict:** Shippable. Consolidate entry-point patterns before Wave 2–4 adds more AJ skills.

---

## Complexity Assessment

### Deliverable size

| Artifact | Lines | Notes |
|----------|------:|-------|
| `requirements-critic/SKILL.md` | 279 | Interactive 4-check rubric; bilingual probes |
| `transcript-critic/SKILL.md` | 225 | Non-interactive 7-check audit |
| `problem-classifier/SKILL.md` | 489 | Full 4-class pedagogical rubric (AJ source) |
| `quick-*` commands (×3) | 9 each | Thin delegates — appropriately minimal |
| Build integration | ~15 lines changed + count rebaseline | Fixed pre-existing Rule 14 drift (51→57) |

### Appropriateness evaluation

**Justified complexity (keep):**

- Full rubrics in `SKILL.md` — single source of truth; splitting into `references/` would add navigation cost without reducing consumer-facing depth.
- `disable-model-invocation: true` on critics — prevents accidental critique during requirements writing; matches `thermo-nuclear-review` precedent.
- `CLAUDE.md` backfill for `grill-me`, `thermos`, thermo-nuclear-* — was a real discoverability gap.
- Bundle A flow documentation — lightweight cross-skill guidance, not orchestration.
- Rule 14 baseline fix (51→57) — mandatory; pre-existing validate failure on master.

**Disproportionate complexity (simplify over time):**

- Hybrid **skill + command + Kiro merged skill** triple entry points per capability.
- Hardcoded Makefile/test counts that increment by 6 Kiro dirs per 3 source skills.
- Overlapping input-acquisition logic in both command wrappers and skills.
- A third `quick-*` packaging pattern when two already exist.
- Kiro merged wrappers that double-hop to a sibling skill using source kebab names.

---

## Key Issues Found

### High

#### H1. Three coexisting `quick-*` packaging patterns confuse consumers

**Evidence:**

| Utility | Packaging | Consumer invokes via |
|---------|-----------|---------------------|
| `quick-bugfix` | Skill only (`name: maister:quick-bugfix` in SKILL.md) | `/maister:quick-bugfix` → skill directly |
| `quick-plan`, `quick-dev` | Command only (full workflow in command file, ~130 lines) | `/maister:quick-plan` → agent executes inline |
| Wave 1 critics/classifier | **Hybrid**: plain-kebab skill + thin `maister:quick-*` command | `/maister:quick-requirements-critic` → Skill tool → `requirements-critic` |

Compare with peer utilities that need no command:

- `grill-me` — skill only, natural-language or Skill tool
- `thermo-nuclear-review` — skill only, explicit request

**Problem:** Plugin consumers learning Maister must infer which pattern applies to each utility. Documentation lists Wave 1 commands under **Requirements & Modeling Commands** while `quick-bugfix` stays under **Quick Commands** — logical grouping, but underlying mechanics differ.

**Impact:** "Which slash command do I use?" is answerable from `CLAUDE.md`, but "why does this one delegate to a skill and that one doesn't?" is not. Agents may skip the Skill-tool hop and run rubrics inline despite ACTION REQUIRED.

**Recommendation:** Pick one on-demand utility pattern for future waves:

1. **Skill-only with `maister:` prefix (preferred for rubric utilities):** Follow `quick-bugfix` — drop separate command files; one skill dir, one slash name. Eliminates hybrid indirection on all platforms.
2. **Skill-only plain kebab (current peer):** Follow `grill-me` / `thermo-nuclear-review` — document Skill-tool / natural-language invocation only.

For Wave 1 shipped state: add a 3-line **"On-demand utility patterns"** note to `CLAUDE.md` explaining the two supported models (skill-only vs hybrid) and when each applies. Defer command removal to a breaking-change window.

**Estimated effort:** 30 minutes (docs); 2–3 hours if consolidating Wave 1 to skill-only later.

---

#### H2. Kiro exposes duplicate entry points per Wave 1 capability

**Evidence:** `platforms/kiro-cli/build.sh` adds both standalone and merged dirs:

- `maister-requirements-critic` (from source skill)
- `maister-quick-requirements-critic` (from command merge)

Same for transcript-critic and problem-classifier — **6 new Kiro dirs for 3 capabilities**. Each also appears in `skills_needing_args` (6 entries).

**Problem:** Kiro users browsing `plugins/maister-kiro/skills/` see two similarly named skills per tool. The merged quick-* skill is a 12-line wrapper that tells the agent to invoke the standalone skill — unnecessary when the standalone already has the full rubric and `$ARGUMENTS` injection.

**Impact:** Wrong skill selection, duplicated maintenance, and +6 to magic-number validate counts on every future utility batch.

**Recommendation (Wave 2+):**

- **Option A:** Merge-only on Kiro — do not emit standalone dirs for skills that always have a `quick-*` command.
- **Option B:** Standalone-only — drop `merge_one` for utilities where the skill *is* the product (preferred; matches `grill-me` / thermo-nuclear on Kiro).

Pragmatic minimum for Wave 1: document in `CLAUDE.md`: *"On Kiro, prefer `/maister-requirements-critic` (full rubric); `/maister-quick-requirements-critic` is a thin alias."*

**Estimated effort:** 1 hour (docs); 4–6 hours (build pipeline dedup).

---

### Medium

#### M1. Command and skill both handle missing input

**Evidence:**

Command (`plugins/maister/commands/quick-requirements-critic.md`):

```markdown
1. Parse user input from command arguments; if missing, use AskUserQuestion to prompt...
```

Skill (`plugins/maister/skills/requirements-critic/SKILL.md` § Input Acquisition):

```markdown
- If argument provided: use it directly.
- If no argument: scan the conversation...
- If nothing found: ask the user to paste...
```

**Problem:** Two layers can both prompt, or the command's Skill-tool invocation may not pass args the skill expects. Low risk in practice but violates "thin wrapper" literally.

**Recommendation:** Commands should only parse args and invoke Skill tool. Move all fallback logic to `SKILL.md` only (delete step 1's AskUserQuestion from commands). Same for all three quick-* files.

**Estimated effort:** 15 minutes.

---

#### M2. Hardcoded Kiro inventory counts are operational debt

**Evidence:** FR-6 updates atomically:

- Makefile Rule 14: **57** total dirs
- Makefile Rule 28: **32** `maister-*` dirs
- Rule 23: **25** shortcut dirs
- `build-core.test.sh`: 57 / 25 shortcuts / 11 merged commands
- `validation.test.sh`: 57 / 32
- `build.sh` `skills_needing_args`: +6 manual entries
- `merge_one`: +3 manual entries

**Problem:** Every future skill batch (Waves 2–4 plan ~10+ more AJ ports) repeats this six-file/count dance. Pre-existing Rule 14 drift (26 expected vs 51 actual) shows the fragility.

**Recommendation:** Replace absolute counts with **delta checks** or a single generated manifest:

```bash
# Example: assert build output matches manifest
diff <(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d | sort) \
     platforms/kiro-cli/expected-skill-dirs.txt
```

Short-term: acceptable for Wave 1. Track as tech debt before Wave 2.

**Estimated effort:** 4–8 hours for manifest-based validate (cross-cutting).

---

#### M3. Kiro merged wrappers reference source kebab skill names

**Evidence:** Generated `plugins/maister-kiro/skills/maister-quick-requirements-critic/SKILL.md`:

```markdown
2. Invoke `/maister-*` slash skill with skill `requirements-critic` and pass the input as args.
```

On Kiro, the actual skill directory is `maister-requirements-critic`, not `requirements-critic`. Build transforms replace "Skill tool" with "/maister-* slash skill" but do not rewrite delegated skill names to `maister-*` form.

**Problem:** Agents following the merged wrapper literally may fail to resolve the target skill on Kiro. Standalone `maister-requirements-critic` works; the quick-* alias is the fragile path.

**Recommendation:** Either (a) drop Kiro merge for these utilities (H2 Option B), or (b) extend `apply_delegation_transforms` to rewrite `skill \`requirements-critic\`` → `/maister-requirements-critic` in merged command-skills.

**Estimated effort:** 30 minutes (build sed rule) or 0 if deduping entry points.

---

#### M4. Bilingual rubrics without language gate (deferred ADR-007)

**Evidence:** `requirements-critic` Check 2 probing table mixes Polish questions with English headings; reformulation options include `"Akceptuję"`. `problem-classifier` preserves AJ bilingual pedagogical content (~489 lines).

**Problem:** English-only consumers get mixed-language interactive prompts. Spec explicitly defers language preference gate — not an implementation bug, but a **consumer UX gap**.

**Recommendation:** Wave 2 (`language-md-convention`) should add a frontmatter `language:` or session gate before Wave 3 adds more bilingual modeling skills. Interim: note in skill intros — *"Probing questions may appear in PL or EN; respond in your preferred language."*

**Estimated effort:** 1 line per skill now; full gate is E2 scope.

---

#### M5. `problem-classifier` cognitive load for casual users

**Evidence:** 489 lines including composite decomposition ASCII patterns, 15+ edge-case traps, class quick-reference table, Wave 3 stub table.

**Problem:** Appropriate for DDD practitioners; overwhelming for a PM running `/maister:quick-problem-classifier` on a ticket. Skill does not offer a "quick scan vs deep classification" mode.

**Recommendation:** Not a Wave 1 blocker — rubric fidelity was the goal. Consider a one-paragraph **"Start here"** box at top: signal scan → up to 4 questions → class assignment → stop unless RC (then Wave 3 note). Avoid trimming edge cases; add exit ramp instead.

**Estimated effort:** 30 minutes.

---

#### M6. Chain sections partially duplicate `CLAUDE.md` Bundle A

**Evidence:**

- `plugins/maister/CLAUDE.md` lines 511–513: Bundle A flow + task-classifier distinction
- Each skill's "Recommended next steps" repeats handoff guidance (transcript → requirements → problem-classifier)

**Problem:** Mild duplication across 4 places. Helps when skill is invoked in isolation; redundant when user read index first.

**Recommendation:** Keep skill chain sections (invoked standalone). Optional: trim `CLAUDE.md` Bundle A to 2 lines with "see skill chain sections for detail" — or keep as-is (low cost).

**Estimated effort:** Optional; 15 minutes.

---

### Low

#### L1. `task-classifier` vs `problem-classifier` naming collision risk

**Evidence:** `CLAUDE.md` documents the distinction explicitly (lines 513, 598). Names remain one word apart.

**Impact:** Search/autocomplete confusion; users may invoke wrong tool.

**Recommendation:** Monitor support feedback. If confusion persists, rename agent to `workflow-classifier` in a future major version (out of Wave 1 scope).

---

#### L2. Wave 1 commands split across two CLAUDE.md subsections

**Evidence:** `Quick Commands` (plan/dev/bugfix) vs `Requirements & Modeling Commands` (three new).

**Impact:** Minor — grouping is logical. Slightly harder to grep "all quick commands."

**Recommendation:** Add a one-line cross-reference under Quick Commands: *"See also Requirements & Modeling Commands below."*

---

#### L3. `reviews-code` cited as template but differs substantially

**Evidence:** Spec FR-4 derives from `reviews-code.md` (Task tool, 86 lines, examples). Wave 1 commands are 9-line Skill-tool delegates.

**Impact:** Implementer confusion only; shipped commands are simpler than template (good).

---

#### L4. No smoke tests for behavioral guarantees

**Evidence:** Verification is structural (`make validate`) + manual smoke recommended. No automated check that critics respect `disable-model-invocation` behavior.

**Impact:** Acceptable for markdown plugin; known spec limitation.

---

## Developer Experience (Plugin Consumers)

### Friction points

| Area | Assessment |
|------|------------|
| **Discoverability** | ✅ Improved — backfill + new CLAUDE.md sections; Bundle A gives a workflow story |
| **Invocation clarity** | ⚠️ Three `quick-*` patterns; hybrid adds Skill-tool hop |
| **Kiro-specific** | ⚠️ Duplicate skill dirs; merged wrappers use wrong skill names (M3); 57-dir inventory opaque |
| **Language** | ⚠️ Mixed PL/EN in interactive critics/classifier |
| **Safety during requirements work** | ✅ Critics won't auto-invoke — good default |
| **Expectation setting** | ✅ Wave 3 `aggregate-designer` stub is honest |
| **Command file size** | ✅ Excellent — 9 lines, no rubric duplication |

### Positive DX choices

- Thin commands with ACTION REQUIRED — clear agent instruction
- Separate **Requirements & Modeling** index section — better mental model than dumping into generic Quick Commands
- Explicit invocation guards and trigger phrases in critic skills
- `argument-hint` on all three skills — helps slash-command UX
- No task directories or orchestrator state for on-demand utilities — low ceremony
- Fixing validate baseline unblocks CI for all contributors
- `transcript-critic` frontmatter defect fixed (was copied from requirements-critic in AJ source)

### Consumer mental model (recommended)

```text
Meeting notes messy?     → /maister:quick-transcript-critic
Ticket/story unclear?    → /maister:quick-requirements-critic  (interactive)
Modeling class unclear?  → /maister:quick-problem-classifier     (interactive)

Bundle A: transcript → clarify → requirements → (optional) problem-classifier
```

Document this 4-line decision tree in `CLAUDE.md` — currently implied but not boxed.

---

## Requirements Alignment

| Requirement | Status | Pragmatic note |
|-------------|--------|----------------|
| FR-1 requirements-critic | ✅ Met | Rubric depth appropriate |
| FR-2 transcript-critic | ✅ Met | Frontmatter defect fixed |
| FR-3 problem-classifier | ✅ Met | Large but faithful; Wave 3 stub clean |
| FR-4 quick-* commands | ✅ Met | Hybrid pattern adds indirection (H1) |
| FR-5 CLAUDE.md | ✅ Met | High-value backfill |
| FR-6 build pipeline | ✅ Met | Count rebaseline necessary; debt remains (M2) |
| FR-7 platform discipline | ✅ Met | Source-only respected |

### Requirement inflation (within spec, worth questioning for future)

- Hybrid packaging mandated by ADR-001/002 though peer utilities use skill-only
- Six Kiro `skills_needing_args` entries for three capabilities
- Three command files where `maister:`-prefixed skill-only (`quick-bugfix` model) might suffice

### Correctly deferred (reduces over-engineering)

- No orchestrator modifications
- No new subagents
- No Kiro @shortcut layer
- No language preference gate (E2)
- No `aggregate-designer` implementation (Wave 3)

---

## Context Consistency

| Pattern A | Pattern B | Location |
|-----------|-----------|----------|
| Skill-only utilities (`grill-me`, thermo-nuclear-*) | Hybrid skill + command (Wave 1) | `skills/` vs `commands/quick-*` |
| `quick-bugfix` skill has `maister:` prefix | Wave 1 skills use plain kebab `name` | Frontmatter conventions |
| `plugin-development.md`: commands delegate via Task tool | Wave 1: Skill tool | Spec documents intentional deviation |
| Command prompts for missing input | Skill also prompts | M1 duplication |
| 51 Kiro dirs before Wave 1 | 57 after — validate expects exact count | Makefile rules 14/28 |
| Kiro skill dirs use `maister-*` prefix | Merged wrappers delegate to plain kebab names | M3 |

---

## Recommended Simplifications

### Priority 1 — Document on-demand utility patterns (H1)

Add a short `CLAUDE.md` subsection clarifying skill-only vs hybrid packaging and a 4-line Bundle A decision tree.

**Impact:** Reduces consumer confusion without code changes.

---

### Priority 2 — Deduplicate input handling (M1)

Remove AskUserQuestion/AskQuestion from command wrappers; rely on skill Input Acquisition sections.

**Impact:** True thin wrappers; one prompt path.

---

### Priority 3 — Fix or eliminate Kiro double-hop (H2 + M3)

Prefer standalone-only on Kiro (drop `merge_one` for Wave 1 utilities). If keeping merge, add build transform for delegated skill names.

**Impact:** Prevents wrong-skill invocation and 57 → 69+ dir explosion in Wave 2.

---

### Priority 4 — Manifest-based validate counts (M2)

Replace hardcoded 57/32/25/11 with generated expected-dir manifest.

**Impact:** Maintainer DX; fewer Wave N count PRs.

---

## Summary Statistics

| Metric | Wave 1 delivered | After top-3 consumer DX fixes (est.) |
|--------|------------------|--------------------------------------|
| Source skills added | 3 | 3 |
| Source commands added | 3 | 3 (or 0 if later consolidated) |
| Kiro skill dirs added | 6 | 3 (after H2 dedup) |
| `skills_needing_args` entries | +6 | +3 (if deduped) |
| Hardcoded count touchpoints | 4 files | 4 (or 1 manifest) |
| Command LOC (×3) | 27 | ~18 (drop redundant prompts) |
| Packaging patterns for utilities | 3 | 2 documented + 1 target |

---

## Conclusion

Wave 1 is **not over-engineered at the rubric level**. The AJ content is dense because the problems (CRUD disguised as domain logic, false consensus in meetings, DDD class confusion) require dense guidance. Porting faithfully was the right call.

Over-engineering shows up in **packaging and platform plumbing**:

1. A third `quick-*` pattern where skill-only peers already work (`grill-me`, thermo-nuclear-*, or `quick-bugfix` with `maister:` prefix).
2. Six Kiro directories and six `$ARGUMENTS` hooks for three user-facing tools.
3. Hardcoded inventory counts that already drifted once before this epic fixed them.
4. Kiro merged wrappers that double-hop to sibling skills with unresolved kebab names.

For plugin consumers, the skills themselves are usable and well-guarded. The friction is **learning which entry point to use**, **Kiro alias reliability**, and **mixed-language interactive prompts** until E2.

### Action items (ordered by ROI)

1. **Add on-demand utility pattern note + Bundle A decision tree to `CLAUDE.md`** (30 min)
2. **Remove duplicate input prompts from command wrappers** (15 min)
3. **Add one-line bilingual note to interactive skills** (15 min)
4. **Document Kiro duplicate-dir guidance; prefer standalone slash skills** (30 min)
5. **Before Wave 2: decide Kiro merge-only vs standalone-only; fix M3 if keeping merge** (design — 1–2 h)
6. **Before Wave 3+: manifest-based validate counts** (4–8 h)

**Total estimated simplification effort:** ~2 hours immediate; 5–9 hours structural  
**Risk of simplification:** Low for docs and M1; medium for Kiro dedup (requires build design)

---

*Review is read-only. No code was modified.*
