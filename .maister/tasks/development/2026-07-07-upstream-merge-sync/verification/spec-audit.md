# Specification Audit: Upstream Merge Sync v2.2.1

**Date:** 2026-07-07  
**Auditor:** maister-spec-auditor  
**Spec:** `implementation/spec.md`  
**Cross-checks:** `analysis/gap-analysis.md`, `analysis/codebase-analysis.md`, `analysis/requirements.md`, `analysis/scope-clarifications.md`  
**Method:** Independent evidence verification via codebase inspection, `git merge-tree`, and manifest/agent inventory (no implementation assumed complete)

---

## Verdict

**pass-with-concerns**

The specification is **substantially complete, implementable, and well-aligned** with gap analysis and codebase analysis. Merge mechanics, platform impact, Kiro test fixes, semantic review scope, and fork preservation are documented with actionable phases. **Two high-severity internal contradictions** (git commit vs acceptance criteria) and several medium inconsistencies (manifest count, CHAT GATE threshold locations) should be resolved before implementation to avoid ambiguous “done” state.

---

## Summary

| Dimension | Assessment |
|-----------|------------|
| Completeness vs requirements | Strong — all 10 functional requirements from `requirements.md` covered |
| Alignment with gap analysis | Strong — merge strategy, version scheme, Kiro 26→27, semantic review scope match |
| Alignment with codebase analysis | Strong — SHAs, commit count, conflict forecast verified |
| Implementability | High — phased procedure, conflict rules, validation checklist present |
| Internal consistency | **Weak** — commit/no-commit contradiction in acceptance criteria |
| Evidence accuracy | Mostly accurate — 3 hard conflicts confirmed; agent target 27 correct; manifest count debatable |

---

## Critical Issues

*None.* No blocking gaps that make the spec unimplementable; high issues below are correctable contradictions, not missing scope.

---

## High Severity

### H-1: Acceptance criteria contradict no-commit requirement

**Spec references:** FR-11, Acceptance Criteria §1, Post-Merge Checklist line 360

**Evidence:**
- FR-11: “Leave merge resolution, version bumps, rebuild output, and test fixes **uncommitted** for user review.”
- Acceptance Criteria §1: “Fork history includes upstream v2.2.1 commits via merge … **`git log --oneline --merges` shows upstream integration point**.”
- Checklist: “**Merge commit exists** in working tree (or merge in progress completed)”
- `analysis/scope-clarifications.md` and `requirements.md` Phase 5: “do NOT commit”

**Category:** Contradictory / Ambiguous

**Impact:** Implementer cannot satisfy both “no commit” and “merge commit visible in `git log --merges`.” A completed `git merge` with resolved conflicts remains in **uncommitted** state until `git commit`; upstream ancestry is not recorded in history until then.

**Recommendation:** Rewrite Acceptance Criteria §1 and checklist item to match handoff intent, e.g.:
- “Upstream v2.2.1 content integrated in working tree via `git merge upstream/master` with 3 manifest conflicts resolved.”
- “Merge ready to commit; **no** `git commit` performed (user handoff per FR-11).”
- Remove or reword “`git log --merges` shows integration point” as a **post-user-commit** expectation, not task completion.

---

### H-2: Gap analysis commit-structure default conflicts with spec handoff

**Spec reference:** Key Decisions table — “Do NOT commit”

**Evidence:**
- `analysis/gap-analysis.md` §4 Important #5 and YAML `commit-structure`: default “Merge commit + optional separate version commit”
- `analysis/scope-clarifications.md`: “Creating git commit … out of scope”
- Spec resolves toward no commit but gap-analysis YAML still recommends merge commit

**Category:** Ambiguous (cross-artifact)

**Impact:** Implementer reading gap-analysis YAML may commit despite spec FR-11.

**Recommendation:** Treat spec FR-11 as authoritative; add one line in spec Implementation Guidance: “Gap-analysis `commit-structure` default superseded by Phase 5 no-commit decision.”

---

## Medium Severity

### M-1: Manifest count inconsistency (5 vs 6)

**Spec reference:** FR-3, Success Criteria — “5/5 manifests at `2.2.1-fork.1`”

**Evidence:**
- Spec lists 5 version-bearing files (2 marketplace + 3 plugin.json)
- `analysis/gap-analysis.md`, `analysis/scope-clarifications.md`, prior sync work-log reference **6** manifests including `plugins/maister-kilo/.claude-plugin/plugin.json`
- Current repo: only **5** root-tracked version fields (`grep '"version":'` across marketplace + plugin.json)
- `platforms/kilo-cli/build.sh` **removes** `.claude-plugin` from Kilo output (line 22); no `plugin.json` in `plugins/maister-kilo/` in current tree

**Category:** Incomplete / inconsistent across artifacts

**Impact:** Low runtime risk (spec matches current repo); confusion if implementer hunts for a 6th manifest per gap-analysis.

**Recommendation:** Standardize on **5 manifests** in all task docs, or add FR-3 note: “Kilo has no separate version manifest in current build pipeline (6th manifest from v2.1.8 sync retired).”

---

### M-2: CHAT GATE rule 26 thresholds duplicated in Makefile — spec omits Makefile

**Spec reference:** FR-8, Phase D step 22, OQ-1 — update `platforms/kiro-cli/tests/validation.test.sh`

**Evidence:**
- `validation.test.sh` lines 90–93: `dev_count -ge 53 && total -ge 200`
- `Makefile` `validate-kiro` lines 148–150: identical hardcoded `>= 53` and `>= 200`
- FR-9 requires `make validate` PASS; `make validate` invokes `validate-kiro`

**Category:** Incomplete

**Impact:** If upstream visibility gates push counts **below** current thresholds (unlikely) or thresholds must be **raised** after measurement, updating only `validation.test.sh` leaves `make validate` failing.

**Recommendation:** Add to FR-8 / Phase D: “If rule 26 thresholds change, update **both** `platforms/kiro-cli/tests/validation.test.sh` and `Makefile` `validate-kiro` rule 26 blocks (lines 148–150).”

---

### M-3: Agent-count rationale oversimplified

**Spec reference:** Key Decisions — “25 upstream + 2 fork-only + 1 new = 27”

**Evidence:**
- `find plugins/maister/agents -name '*.md' | wc -l` → **26** agents today (includes 2 thermo-nuclear subagents)
- `html-companion-writer` absent from fork (grep returns 0 files)
- Post-merge expected: 26 + 1 = **27** (target in spec is correct)
- Kiro tests hardcode 26: `e2e-matrix.test.sh` L81, `build-completion.test.sh` L50, `build.sh` L780 comment

**Category:** Incorrect explanation (correct target)

**Impact:** Implementer may mis-audit agent inventory during semantic review.

**Recommendation:** Replace rationale with: “Fork 26 source agents + 1 upstream add (`html-companion-writer`) = 27 Kiro JSON agents after build.”

---

### M-4: requirements.md manifest arithmetic error

**Spec reference:** FR-2, FR-3

**Evidence:**
- `analysis/requirements.md` §3: “Resolve 3 conflicts” + “Bump **remaining 3** manifests”
- Spec: 3 conflicted + **2** non-conflicting cursor manifests = 5 total

**Category:** Incorrect (upstream requirements artifact)

**Impact:** Minor — spec is correct; requirements summary misleading.

**Recommendation:** Fix requirements.md to “remaining **2** manifests” or defer to spec as SoT.

---

### M-5: Semantic review scope for `orchestrator-patterns.md` path ambiguous

**Spec reference:** Phase C step 11 — `orchestrator-patterns.md`

**Evidence:**
- Actual path: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`
- Gap analysis uses full path; spec uses shorthand

**Category:** Ambiguous (low)

**Recommendation:** Use full path in Phase C for unambiguous file open.

---

## Low Severity

### L-1: Kiro extended test suite scope undefined vs 12 available scripts

**Evidence:** `platforms/kiro-cli/tests/` contains **12** `*.test.sh` files; spec lists **5** as “Kiro Extended Tests”; not in Makefile/CI grep.

**Recommendation:** Add note: “Extended suite = listed 5 scripts (minimum gate); run remaining 7 optionally if time permits or prior sync regressions suspected.”

---

### L-2: `build-completion.test.sh` comment not in update list

**Evidence:** `test_exactly_26_json_agents` assert message: “exactly 26 JSON agents (24 converted + 2 synthetic)” — count update covered; explanatory string may stale.

**Recommendation:** Update assert description when changing count to 27.

---

### L-3: OQ-2 (`trustedAgents` for html-companion-writer) likely N/A

**Evidence:** `platforms/kiro-cli/build.sh` L592 and `agent-tools.json` use `trustedAgents: ["maister-*"]` wildcard; `generate-agent-json.sh` defaults same.

**Recommendation:** Close OQ-2 as “no action unless smoke fails” — already spec default.

---

### L-4: Post-merge checklist item “Merge commit exists”

Same family as H-1; downgrade after AC rewrite.

---

## Verified Claims (Evidence-Based)

| Claim | Status | Evidence |
|-------|--------|----------|
| Fork HEAD `9f78d52` | ✅ | `git rev-parse HEAD` |
| Divergence 53 / 4 | ✅ | `git rev-list --left-right --count HEAD...upstream/master` |
| 4 upstream commits since `679958b` | ✅ | `git log --oneline 679958b..upstream/master` |
| Exactly **3** hard merge conflicts | ✅ | `git merge-tree` → 3 `<<<<<<<` markers, all in manifest JSON |
| 17 “changed in both” auto-merge files | ✅ | merge-tree; spec correctly scopes manual review to 14 semantic files |
| 12 fork-only skills on disk | ✅ | All 12 directories exist under `plugins/maister/skills/` |
| `html-companion-writer` absent pre-merge | ✅ | 0 matches in repo |
| 26 agents pre-merge | ✅ | 26 `.md` files in `plugins/maister/agents/` |
| Kiro agent tests hardcoded 26 | ✅ | `e2e-matrix.test.sh`, `build-completion.test.sh`, `build.sh` L780 |
| CHAT GATE thresholds 53 / 200 | ✅ | `validation.test.sh` L93; `Makefile` L149–150 |
| Cursor overrides step 12 | ✅ | `platforms/cursor/build.sh` L179–182 |
| `make validate-cursor` quick-plan guard | ✅ | `Makefile` L42–43 |
| `dashboard.html` absent pre-merge | ✅ | 0 files in repo |
| Merge strategy documented | ✅ | `docs/cursor-agent-support.md` L49–54 |

---

## Cross-Document Alignment

| Topic | spec.md | gap-analysis | codebase-analysis | Match |
|-------|---------|--------------|-------------------|-------|
| Merge strategy | `git merge upstream/master` | Same | Same | ✅ |
| Fork version | `2.2.1-fork.1` | Same | Same | ✅ |
| Hard conflicts | 3 manifests | 3 manifests | 3 manifests | ✅ |
| Kiro agents | 26 → 27 | 26 → 27 | 26 → 27 | ✅ |
| Semantic review | Full: dev, product-design, init, patterns | Same | Implied | ✅ |
| No commit | FR-11 explicit | Phase E says “awaiting user commit” in gap §6 | Not stated | ⚠️ |
| Manifest count | 5 | 6 | Not specified | ⚠️ |
| html_output default | `true` | `true` | Not specified | ✅ |

---

## Clarifications Needed

1. **Authoritative completion state:** Confirm handoff = “merge resolved + built + validated + uncommitted” (no merge commit in history). **Recommend yes** — aligns with Phase 5 and prior v2.1.8 work-log pattern.
2. **Manifest uniformity:** Confirm 5 manifests (not 6) for this sync. **Recommend 5** based on current repo layout.

---

## Recommendations (Priority Order)

1. **Fix H-1 before implementation:** Rewrite Acceptance Criteria §1 and checklist to match uncommitted handoff; separate “user commit” expectations from task completion.
2. **Resolve M-1:** Align gap-analysis / scope-clarifications manifest count with spec (5) or document Kilo exception.
3. **Extend FR-8 (M-2):** Include Makefile `validate-kiro` when adjusting CHAT GATE thresholds.
4. **Correct agent math (M-3)** in Key Decisions table.
5. **Use full path** for `orchestrator-patterns.md` in Phase C.
6. **Optional:** Add explicit step to run `platforms/kilo-cli/smoke-cli.sh` if present (already in checklist as optional — adequate).

---

## Compliance Status

| Criterion | Status |
|-----------|--------|
| Requirements coverage | ✅ All FR-1–FR-11 addressed |
| Gap analysis decisions incorporated | ✅ Critical decisions reflected |
| Codebase implementability | ✅ Paths, scripts, tests verified |
| Acceptance criteria testable | ⚠️ AC §1 conflicts with FR-11 |
| Rollback plan | ✅ User-confirmed rollback aligned with Maister principles |
| Standards (never edit generated) | ✅ Rule 2, Rule 5, Implementation Guidance |

**Overall:** Spec is ready for implementation **after resolving H-1** (and preferably M-1, M-2). No re-specification required.

---

## Audit Metadata

```yaml
verdict: pass-with-concerns
critical_count: 0
high_count: 2
medium_count: 5
low_count: 4
blocking: false
recommended_action: resolve_h1_then_implement
```
