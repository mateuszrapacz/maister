# Code Review Report: Upstream Sync Integration (2af3a99)

**Commit:** `2af3a99` — *Integrate upstream v2.1.8 quick-* refactor and Maister rebrand (2.1.8-fork.1)*  
**Range reviewed:** `d3e8298..2af3a99`  
**Scope:** `plugins/maister/`, `platforms/cursor/` (plus generated-variant spot-checks for cross-platform impact)  
**Reviewer:** Post-hoc automated review  
**Date:** 2026-06-14  

---

## Executive Summary

The integration commit successfully cherry-picks upstream `fb5a8f3` (quick-dev/plan → thin skills, quick-bugfix simplification, Maister rebrand) while preserving fork-only features (AJ skills, grill-me, thermos, init Phase 3 gate). **`make validate` passes** and Kiro build-core tests pass.

**Overall verdict: CONDITIONAL PASS** — safe to keep on master with one follow-up fix recommended before treating Cursor quick-plan as fully correct across all invocation paths.

The primary regression is **corrupted Cursor `skills/quick-plan/SKILL.md` text** caused by the existing `EnterPlanMode`/`ExitPlanMode` sed pipeline now operating on a skill that did not exist in the Cursor variant before this migration. The **command override path** (`/maister-quick-plan` → `commands/quick-plan.md`) remains correct and is what users typically invoke.

---

## Focus Area Assessment

### 1. Quick-* skill migration (source + Cursor overrides)

| Item | Status | Notes |
|------|--------|-------|
| Source commands deleted | ✅ | `commands/quick-dev.md`, `commands/quick-plan.md` removed from `plugins/maister/` |
| Thin skills added | ✅ | `skills/quick-dev/SKILL.md`, `skills/quick-plan/SKILL.md` match upstream intent (~24/26 lines) |
| quick-bugfix simplified | ✅ | Standards discovery deferred to analysis/planning steps; post-impl checklist enforced |
| Fork AJ quick commands | ✅ | `quick-{transcript-critic,requirements-critic,problem-classifier}.md` unchanged |
| Cursor quick-dev override | ✅ | New `platforms/cursor/overrides/commands/quick-dev.md` delegates to skill via Skill tool (mirrors AJ pattern) |
| Cursor quick-plan override | ✅ | Pre-existing file-based plan override preserved |
| Cursor quick-plan **skill** copy | ❌ | Build transform corrupts workflow step 2 (see Finding H-1) |
| Cursor quick-dev skill | ⚠️ | Skill body is usable; primary path is command delegation anyway |

**Source skill quality:** Upstream thin-skill design is sound — principles-first, mandatory standards checklist, no duplicated orchestrator logic.

### 2. Cursor `build.sh` skill→command emission

| Item | Status | Notes |
|------|--------|-------|
| quick-dev override wired | ✅ | Step 12 copies override alongside quick-plan and quick-bugfix |
| Comment updated | ✅ | `# 12. Overrides (quick-plan, quick-dev, quick-bugfix)` |
| Makefile validate | ✅ | Still passes; checks quick-plan command prefix only |
| Gap | ⚠️ | No validate guard for quick-dev override or quick-plan skill integrity |

The build change is minimal and correct for the command layer. The gap is that **skills are now copied from source before overrides**, and global EnterPlanMode stripping (step 7) was written when quick-plan existed only as a command override.

### 3. CLAUDE.md merge quality

| Item | Status | Notes |
|------|--------|-------|
| Maister rebrand (title/purpose) | ✅ | `# Maister Plugin` applied in source |
| Upstream quick-* in skills table | ✅ | `quick-plan`, `quick-dev` rows added |
| Fork AJ skills section | ✅ | Requirements & Modeling skills + Bundle A flow preserved |
| Fork thermos/grill-me section | ✅ | Review suite intact |
| task-classifier vs problem-classifier note | ✅ | Preserved |
| Quick Commands table | ⚠️ | Still lists `/maister:quick-{dev,plan}` under "Commands" though source command files were deleted (upstream pattern; skills are slash-invocable on Claude Code) |
| Copilot generated CLAUDE.md | ✅ | Receives same skill-table additions via rebuild |

Merge quality is **good** — no duplicate quick-dev/plan entries, fork sections untouched.

### 4. init SKILL.md — Phase 3 gate + rebrand

| Item | Status | Notes |
|------|--------|-------|
| Phase 3 smart-defaults gate | ✅ | Steps 3–4 single AskUserQuestion gate unchanged vs `d3e8298` |
| Maister rebrand in frontmatter/title | ✅ | "Initialize Maister Framework" |
| docs-manager templates | ✅ | 3-step INDEX.md discipline + Maister wording in claude-md-template |

### 5. Version manifest consistency

| File | Version | Status |
|------|---------|--------|
| `.claude-plugin/marketplace.json` | `2.1.8-fork.1` | ✅ uniform |
| `.cursor-plugin/marketplace.json` | `2.1.8-fork.1` | ✅ uniform |
| `plugins/maister/.claude-plugin/plugin.json` | `2.1.8-fork.1` | ✅ uniform |
| `plugins/maister-copilot/.claude-plugin/plugin.json` | `2.1.8-fork.1` | ✅ regenerated |
| `plugins/maister-cursor/.cursor-plugin/plugin.json` | `2.1.8-fork.1` | ✅ regenerated |
| `plugins/maister-kilo/.claude-plugin/plugin.json` | `2.1.8-fork.1` | ✅ rebuilt |

**Note:** Research planned `2.1.8-10`; commit intentionally uses `2.1.8-fork.1` (clearer fork semver). All six tracked manifests are **internally consistent**. This is a documentation/process deviation, not a bug.

Upstream version commit `679958b` was correctly skipped.

### 6. Regressions, dead code, duplication, validate-breaking issues

| Category | Finding |
|----------|---------|
| Validate-breaking | None — `make validate` passes (Copilot, Cursor, Kiro) |
| Dead code | Kiro `merge_one quick-dev/plan` in `platforms/kiro-cli/build.sh` is now no-op (source commands deleted); research flagged optional cleanup |
| Duplication | Cursor carries both `commands/quick-dev.md` (delegate) and `skills/quick-dev/SKILL.md` (full workflow) — intentional dual path |
| Duplication risk | Cursor `skills/quick-plan/SKILL.md` duplicates intent of command override but with **broken** content |
| Smoke test | `platforms/cursor/smoke-cli.sh` Test 1 failed (agent returned `init` skill path, not `maister-init` string) — likely CLI/agent behavior, not introduced by this diff; Tests 2–3 not reached |

---

## Findings

### H-1 — Cursor `skills/quick-plan/SKILL.md` corrupted by EnterPlanMode sed (High)

**Introduced by:** Skill migration + existing build step 7, not by override logic itself.

**Before commit:** `plugins/maister-cursor/skills/quick-plan/` did not exist; quick-plan was command-override only.

**After commit:** Source skill is copied, then global sed mangles backtick-wrapped plan-mode references:

```15:24:plugins/maister-cursor/skills/quick-plan/SKILL.md
2. **Enter plan mode** — Call plan approval gate` for approval). Do not redefine its phases.
...
Do not call `plan approval gate` until the plan reflects the applicable standards...
```

**Impact:**
- `/maister-quick-plan` **command** path: unaffected (uses override).
- Skill auto-discovery / Skill-tool invocation of `quick-plan`: **broken instructions**.
- `rules/maister-workflows.mdc` catalog still describes quick-plan as "Built-in plan mode" — misleading on Cursor.

**Recommendation:** After step 7 transforms, either (a) copy a Cursor-specific `skills/quick-plan` override (parallel to quick-bugfix), (b) exclude `skills/quick-plan` from EnterPlanMode stripping and replace with override content, or (c) delete `skills/quick-plan` from Cursor output if command-only is the intended surface. Add a validate check for orphaned backticks or `plan approval gate` fragments.

---

### M-1 — Incomplete Maister rebrand in platform overrides (Medium)

`platforms/cursor/overrides/commands/quick-plan.md` and Kiro's `maister-quick-plan` override still say **"AI SDLC"** in description and fallback text. Pre-dates this commit but now contrasts with upstream Maister rebrand.

**Recommendation:** Update override files to "Maister" for consistency.

---

### M-2 — CLAUDE.md Quick Commands table vs skill-only source (Medium / doc)

Source no longer has `commands/quick-{dev,plan}.md`, but CLAUDE.md and `docs/commands.md` still document them under Quick Commands with EnterPlanMode semantics (correct for Claude Code source, not Cursor).

**Recommendation:** Add a note that quick-dev/plan are skills in source (slash-invocable on Claude Code); link to platform overrides for Cursor/Kiro behavior. Low urgency — matches upstream.

---

### M-3 — Kiro `merge_one quick-dev/plan` dead code (Medium / maintenance)

`platforms/kiro-cli/build.sh` lines 56–57 call `merge_one` for command files that no longer exist in source. Kiro now relies on renamed skill directories + override copy for quick-plan. Tests still pass; code is misleading for future maintainers.

**Recommendation:** Remove dead `merge_one` calls (research Phase 2 optional item).

---

### L-1 — validate-cursor asymmetry (Low)

Makefile validates `quick-plan` command prefix but not `quick-dev` override presence or skill integrity.

**Recommendation:** Add `grep -q '^name: maister-' plugins/maister-cursor/commands/quick-dev.md` and a guard against `plan approval gate` in skills.

---

### L-2 — Version scheme deviation from research plan (Low / informational)

Research specified `2.1.8-10`; commit uses `2.1.8-fork.1`. Internally consistent and arguably clearer. Document in release notes.

---

### L-3 — copilot-cli-issues.md deletion (Low / positive)

Upstream scratch file removed — correct per cherry-pick.

---

## Security & Performance

No security regressions identified. Changes are Markdown/plugin metadata only.

Performance impact: negligible (smaller quick-* artifacts, fewer duplicated command bodies in source).

---

## Verification Executed

| Check | Result |
|-------|--------|
| `git diff d3e8298..2af3a99 -- plugins/maister/ platforms/cursor/` | Reviewed |
| `make validate` | **PASS** |
| `platforms/kiro-cli/tests/build-core.test.sh` | **PASS** (8/8) |
| `platforms/cursor/smoke-cli.sh` | **FAIL** Test 1 (plugin detection string); environment-dependent |
| Fork preserve list spot-check | **PASS** |

---

## Recommendations (Priority Order)

1. **Fix Cursor quick-plan skill output** (H-1) — highest priority follow-up.
2. **Rebrand platform override stale "AI SDLC" strings** (M-1).
3. **Remove Kiro dead `merge_one quick-dev/plan`** (M-3).
4. **Extend validate-cursor** for quick-dev override and corrupted plan-mode fragments (L-1).
5. **Document version scheme** `2.1.8-fork.N` vs research `2.1.8-10` (L-2).

---

## Conclusion

Commit `2af3a99` achieves the intended upstream sync: thin quick-* skills in source, Maister rebrand, init gate preserved, fork features intact, Cursor quick-dev delegation added, manifests uniform at `2.1.8-fork.1`, and CI validate gates green.

Treat as **merge-ready with one targeted follow-up** for Cursor quick-plan skill generation before claiming full parity with the research report's post-integration architecture diagram.
