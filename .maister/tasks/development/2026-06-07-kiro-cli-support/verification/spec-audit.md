# Specification Audit: Maister Kiro CLI Platform Support

**Auditor:** maister-spec-auditor  
**Date:** 2026-06-07 (re-audit after C1–C3 fixes)  
**Spec:** `implementation/spec.md`  
**Requirements:** `analysis/requirements.md`  
**Risk level:** High (greenfield platform)  
**Binding inputs:** ADR-010–016 (grill), Cursor `platforms/cursor/build.sh` template

---

## Re-Audit: C1–C3 Fix Verification

Previous audit (same date, pre-fix) identified three **Critical** blockers. This section independently verifies each fix in the updated `implementation/spec.md` against the codebase. No `platforms/kiro-cli/` or `plugins/maister-kiro/` exist yet — assessment is spec-internal consistency plus source-inventory feasibility.

### C1. Build step order: MD→JSON after semantic rewrites — **RESOLVED ✅ Adequate**

| Check | Evidence | Verdict |
|-------|----------|---------|
| JSON generation is last among markdown transforms | Build table steps 0–16 transform `.md`; step **17** `generate-agent-json.sh`; steps 18–21 post-JSON synthesis (`spec.md` lines 482–505) | ✅ |
| Normative ordering principle stated | "All semantic transforms on `.md` files complete **before** `generate-agent-json.sh`" (lines 478–478) | ✅ |
| Task→subagent and todo precede JSON | Step 13: delegation on **all `*.md` incl. `agents/*.md`**; step 14: `apply_todo_transforms()` on agents glob (lines 497–498) | ✅ |
| Post-build bans on `agents/instructions/` | Explicit ban on `Task tool`, `Skill tool`, `TaskCreate`, `TaskUpdate`, `AskUserQuestion` (line 507) | ✅ |
| Data-flow narrative aligned | Data Flow § step 1 matches build order (line 115) | ✅ |
| Cursor reference pattern | Cursor keeps agents as `.md` through todo transforms (`platforms/cursor/build.sh` lines 167–245); Kiro defers JSON to step 17 — equivalent outcome | ✅ |

**Conclusion:** C1 fix is **adequate**. Implementer has unambiguous ordering; validate post-build bans close the loop on instruction bodies.

---

### C2. Skill directory rename — **RESOLVED ✅ Adequate**

| Check | Evidence | Verdict |
|-------|----------|---------|
| Dedicated build step | Step **6** `rename_skill_directories()` after command merge (step 5), before Explore/chat transforms (lines 490–491) | ✅ |
| Contract with pseudocode | `Skill Directory Rename Contract (C2 fix)` (lines 245–257) | ✅ |
| Source inventory matches | 14 source skills (`plugins/maister/skills/*/SKILL.md`) + 8 merged commands = 22 total (verified in repo) | ✅ |
| Merged commands exempt | "Merged commands (step 12) already create `skills/maister-<name>/`" — note: merge is build **step 5**; numbering typo only (line 268) | ⚠️ Low |
| Validate coverage | Rule 13 updated; **rule 28** added: exactly 22 `maister-*` dirs (lines 270–272) | ✅ |
| `skill://` path alignment | Layout contract + `maister.json` resources assume `maister-*` folders (lines 93–94, 291) | ✅ |

**Conclusion:** C2 fix is **adequate**. Rename step placement is correct (after `name:` prefix transform, after command merge). Minor cross-reference typo ("step 12" vs step 5) is cosmetic.

---

### C3. Chat-native gates mechanical contract — **RESOLVED ✅ Mostly adequate**

| Check | Evidence | Verdict |
|-------|----------|---------|
| Mechanical transform (not doc-only) | "mechanical build transform" + `apply_chat_gate_transforms()` at step **8** (lines 145, 181–182, 492) | ✅ |
| Detection patterns table | AskUserQuestion blocks, `→ Pause` / `MANDATORY GATE`, multi-select 3C, code fences (lines 151–158) | ✅ |
| Gate template 3A | Normative markdown block (lines 160–164) | ✅ |
| Headless defaults 3B | Eight gate contexts with `--no-interactive` defaults (lines 166–177) | ✅ |
| Transform reference file | `transforms/askuser-to-chat-gate.md` required (lines 181, 189) | ✅ |
| Validate rules 25–27 | Ban symbols; CHAT GATE marker count; transform doc exists (lines 185–189) | ✅ |
| Override strategy | quick-plan + quick-bugfix in file checklist; step 9 copies overrides post-transform (lines 183, 492–493, 593–594) | ✅ |
| Source scale | ~230+ `AskUserQuestion` refs across 28 files in `plugins/maister/` (grep verified) | — |

**Residual C3 gaps (non-blocking):**

| Gap | Severity | Detail |
|-----|----------|--------|
| `development` override listed but not in file checklist | Medium | Line 183 references `overrides/skills/development/SKILL.md`; file checklist (lines 593–594) omits it — 53 `AskUserQuestion` refs in `development/SKILL.md` |
| Rule 26 "documented exceptions" undefined | Medium | Count formula `≥ source count minus documented exceptions` (line 188) has no exception list |
| Transform doc content thin | Medium | Detection table is high-level; no before/after examples comparable to `task-to-kiro-todo.md` |
| Rules 25–27 absent from main validate table | Medium | Defined in Chat Gates section (lines 185–189) but `validate-kiro` table stops at rule 24 (lines 357–383) |
| Rule 11 duplicates rule 25 | Low | Both ban `AskUserQuestion`/`AskQuestion` |

**Conclusion:** C3 fix is **adequate to begin implementation**. Mechanical contract, function name, step placement, headless defaults, and testable rules are present. Remaining gaps are **Medium** polish items, not Phase 1 blockers.

---

## Summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| Completeness vs requirements | ✅ Complete | FR-1–13 covered; C1–C3 gaps closed |
| Implementability | ⚠️ Mostly ready | High items (JSON schema, agent-tools, subagent syntax) remain |
| ADR alignment (010–016) | ✅ Aligned | Layout, naming, todo Phase 1, KIRO_HOME |
| Acceptance criteria testability | ⚠️ Improved | Structural checks strong; runtime API syntax still weak |
| Risk coverage | ✅ Good | Chat-gate risk now mitigated in spec |
| Scope boundaries | ✅ Clear | Out-of-scope well defined |

**Overall compliance:** ⚠️ **Mostly Compliant** — **critical blockers resolved**; specification is ready for phased `/maister-development` execution. Six **High** findings should be addressed during Phase 0–1 to avoid generator and delegation rework.

**Issue counts:**

| Severity | Count | Δ from prior audit |
|----------|-------|-------------------|
| Critical | **0** | −3 (C1–C3 resolved) |
| High | **6** | unchanged |
| Medium | **8** | +2 (validate table drift, override checklist) |
| Low | **4** | unchanged |

**Codebase verification:** Greenfield confirmed — no `platforms/kiro-cli/`, no `plugins/maister-kiro/`, no `build-kiro`/`validate-kiro` in `Makefile`. Source inventory: **24 agents**, **14 skills**, **8 commands**, **5** `user-invocable: false` skills. `release.yml` runs `make build && make validate` — will include Kiro once Makefile extended.

---

## Critical Issues

*None.* Prior C1–C3 findings are resolved in spec (see Re-Audit section).

---

## High Issues

### H1. Kiro agent JSON schema not normative

**Spec reference:** `generate-agent-json.sh` Contract (lines 198–218).

**Evidence:** Fields listed as minimum with `promptFile` or equivalent; no golden JSON example; grill notes `file://` vs `resources` uncertainty ([kiro#7776](https://github.com/kirodotdev/Kiro/issues/7776)); only `docs-operator.md` has `skills:` frontmatter — `resources` inference applies to 1/24 agents.

**Category:** Ambiguous  
**Severity:** **High**

**Recommendation:** Add appendix with complete `maister-gap-analyzer.json` golden file; document `agent-tools.json` keys (`defaults`, `agents`, `synthetic`).

---

### H2. `agent-tools.json` coverage undefined for 26 agents

**Spec reference:** FR-2; Phase 0 stub "2–3 agent entries" (line 393).

**Evidence:** 24 source + `maister` + `maister-explore` = 26 JSON files; no per-agent tool bucket table; `trustedAgents` scope says "orchestrator-class agents" without listing which qualify.

**Category:** Incomplete  
**Severity:** **High**

**Recommendation:** Add agent → tool bucket → readOnly mapping table; cross-reference Cursor bash-guard whitelist (`platforms/cursor/hooks/block-destructive-commands.sh`).

---

### H3. `subagent` tool invocation syntax unspecified

**Spec reference:** T5; smoke-cli test 2; build step 13.

**Evidence:** Source uses `Task tool - maister:gap-analyzer subagent` (`plugins/maister/skills/development/SKILL.md` line 132); spec says `subagent` + `agent: maister-*` with no before/after examples; post-build bans mention `Task tool` (line 507) but no numbered validate rule; no `subagent_type` ban beyond Explore (rule 12).

**Category:** Ambiguous  
**Severity:** **High**

**Recommendation:** Add `transforms/task-to-subagent.md` with 3–5 rewrite examples; add validate rules 29–31 for `Task tool`, `Skill tool`, `subagent_type`.

---

### H4. Synthetic agent instruction bodies undefined

**Spec reference:** File checklist — `agents/instructions/maister.md`, `maister-explore.md` (lines 622–623).

**Evidence:** `maister.json` and `maister-explore.json` synthesized outside MD loop; no instruction body content spec for orchestrator or explore agent.

**Category:** Missing  
**Severity:** **High**

**Recommendation:** Add `platforms/kiro-cli/templates/instructions-maister.md` and `instructions-maister-explore.md`.

---

### H5. Hook `.hook-state` partially specified

**Spec reference:** Build step 19 (line 503); Hooks Phase 1.

**Evidence:** Step 19: "create `.hook-state/`" — **improvement** over prior audit. Cursor creates `.hook-state/` with gitignore (`platforms/cursor/build.sh` lines 164–165). Kiro hook contract section (lines 274–291) and file checklist do **not** document `.hook-state/` or env var mapping (`CURSOR_PLUGIN_ROOT` → `KIRO_HOME`).

**Category:** Incomplete  
**Severity:** **High** (downgraded from full Missing — step 19 partially addresses)

**Recommendation:** Add `.hook-state/` to layout contract, file checklist, and hook adaptation section.

---

### H6. Phase / step numbering inconsistencies

**Spec reference:** New Components table "18-step pipeline" (line 54); Phase 1 "steps 0–21" (line 402); Phase 2 exit "All **24** validate rules" (line 431); acceptance "all **28** rules" (line 540).

**Evidence:**

| Location | Says | Should say |
|----------|------|------------|
| Line 54 | 18-step pipeline | 22 steps (0–21) |
| Line 268 | merged commands at "step 12" | step 5 |
| Line 431 | 24 validate rules | 28 (rules 25–28 added) |
| Lines 357–383 | validate table 1–24 only | include 25–28 |

**Category:** Ambiguous  
**Severity:** **High**

**Recommendation:** Consolidate validate rules 1–28 in single table; align phase exit criteria and pipeline labels.

---

## Medium Issues

### M1. `steering/maister-docs.md` dual role unclear

**Spec reference:** Layout (line 97); FR-8; grill decision 15.

**Evidence:** Output layout includes `steering/maister-docs.md`; grill target layout shows only `maister-workflows.md` in steering; init creates `project/.kiro/steering/maister-docs.md` from template. Unclear if KIRO_HOME copy is global steering, template artifact, or both.

**Severity:** **Medium**

---

### M2. `validate-kiro` structural checks incomplete

**Spec reference:** validate-kiro rules; post-build bans (line 507).

**Gaps:**

| Missing check | Why it matters |
|---------------|----------------|
| Rules 25–28 not in main table | Implementer may omit Phase 2 rules |
| No `Task tool` / `Skill tool` numbered rules | Only prose ban at line 507 |
| No `agents/instructions/` count (26) | Generator completeness |
| No `skill://` path sanity | Resource 404s |
| No `steering/maister-docs.md` existence | FR-8 |
| `watch` target extension | FR-9 mentions extend `watch`; no detail |

**Severity:** **Medium**

---

### M3. Smoke-cli hybrid install under-specified

**Spec reference:** Distribution & Smoke (lines 346–351).

**Evidence:** "ephemeral `$KIRO_HOME` + workspace `.kiro/` copy" — no step-by-step pseudocode; unclear what subset copies to workspace `.kiro/`.

**Severity:** **Medium**

---

### M4. E2E scenario pass/fail matrix lacks objective criteria

**Spec reference:** Phase 3 scenarios 1–8 (lines 435–449).

**Evidence:** Scenario 2a manual-only without rubric; scenario 4 (max 4 concurrent) lacks expected behavior when >4 groups; scenario 7 optional in table but not in acceptance criteria.

**Severity:** **Medium**

---

### M5. `plugin-development.md` update deferred to Phase 4

**Evidence:** `.maister/docs/standards/global/plugin-development.md` line 4 lists only `maister-copilot` and `maister-cursor` — no `maister-kiro` never-edit rule yet. Phase 1 manual commit of generated artifact precedes standard update.

**Severity:** **Medium**

---

### M6. Internal skills count drift in ADR-005 text

**Evidence:** Spec T16 says 5 skills; `grep user-invocable: false` → 5 files (orchestrator-framework, implementation-verifier, implementation-plan-executor, docs-manager, codebase-analyzer). ADR-005 Polish text may say "sześć" — spec is correct.

**Severity:** **Medium** (for implementers reading ADR literally)

---

### M7. Commands merge vs override step mismatch

**Spec reference:** Commands→Skills Contract step 4 (line 227); build step 5 merge, step 9 overrides.

**Evidence:** Merge contract says apply quick-plan override at merge time; build table defers overrides to step 9 (after chat-gate transforms). Workable if intentional (overrides replace post-transform files) but contradictory prose.

**Severity:** **Medium**

---

### M8. `development` orchestrator override missing from file checklist

**Spec reference:** Chat gates build implementation (line 183) vs File Checklist (lines 593–594).

**Evidence:** C3 names `overrides/skills/development/SKILL.md`; checklist only lists quick-plan and quick-bugfix overrides. `development/SKILL.md` has highest `AskUserQuestion` density (53 matches).

**Severity:** **Medium**

---

## Low Issues

### L1. Research artifacts stale vs grill ADRs

`high-level-design.md` still references `maister-orchestrator.json`, conditional todo, `~/.kiro/skills/`. Spec footer supersession note is correct.

**Severity:** **Low**

---

### L2. Build step count label ("18" vs 22)

Line 54 "18-step pipeline" vs steps 0–21 (22 steps). Cosmetic if H6 resolved.

**Severity:** **Low**

---

### L3. `tech-stack.md` fourth platform entry deferred

`.maister/docs/project/tech-stack.md` lists three platforms. Phase 4 update planned — correct timing.

**Severity:** **Low**

---

### L4. Rule 11 / rule 25 duplication

Both ban `AskUserQuestion`/`AskQuestion`. Consolidate or cross-reference.

**Severity:** **Low**

---

## Requirements Traceability

| Requirement | Spec FR | Status |
|-------------|---------|--------|
| Build pipeline | FR-1, FR-3, FR-4 | ✅ C1/C2 fixed |
| Distribution | FR-2, FR-6 | ✅ |
| @prompts | FR-7 | ✅ (Phase 2) |
| Init integration | FR-8 | ⚠️ M1 steering ambiguity |
| Makefile & validation | FR-5, FR-9 | ⚠️ M2 validate gaps |
| Hooks | FR-6 | ⚠️ H5 partial |
| Progress / todo | FR-10 | ✅ |
| Documentation | FR-11 | ✅ |
| E2E | FR-12 | ⚠️ M4 testability |
| Release | FR-13 | ✅ |

---

## ADR Alignment (010–016)

| ADR | Spec alignment |
|-----|----------------|
| 010 KIRO_HOME, 1:1 layout | ✅ |
| 011 `maister.json`, `name: maister` | ✅ |
| 012 @prompts (9 files) | ✅ |
| 013 `agents/instructions/` | ✅ |
| 014 todo Phase 1 | ✅ |
| 015 wrapper, install UX | ✅ |
| 016 hooks at profile root | ✅ |

---

## Acceptance Criteria Testability

### Structurally testable (strong)

- `make build-kiro`, `make validate-kiro` (28 rules when table consolidated)
- Grep bans, directory counts, `jq empty` on JSON agents
- CHAT GATE marker rule 26 (once exceptions documented)

### Weakly testable

| Criterion | Issue |
|-----------|-------|
| `subagent` delegation | H3 — no normative API |
| Headless chat gates | Improved (3B table); smoke prompts must embed defaults |
| Resume `--from=PHASE` | No Phase 1 smoke test |
| Interactive E2E 2a | Manual — needs rubric (M4) |

---

## Clarification Questions (remaining)

1. **`steering/maister-docs.md` in KIRO_HOME:** Global steering, template-only in `platforms/kiro-cli/templates/`, or both? (M1)
2. **Rule 26 exceptions:** Which gates may omit `CHAT GATE` marker? (C3 residual)
3. **`development` override:** Full-file override required, or rely on `apply_chat_gate_transforms()` alone? (M8)
4. **Kiro `subagent` parameters:** Exact post-rewrite syntax? (H3)

---

## Recommendations (Priority Order)

1. Consolidate **validate rules 1–28** in single table; add `Task tool`/`Skill tool` bans (H6, M2, H3).
2. Publish **golden JSON** + `agent-tools.json` schema (H1, H2).
3. Add **`transforms/task-to-subagent.md`** with examples (H3).
4. Add **synthetic instruction templates** for `maister` and `maister-explore` (H4).
5. Document **`.hook-state/`** in hook contract and checklist (H5).
6. Resolve **`development` override** — add to checklist or remove from C3 prose (M8).
7. Document **rule 26 exceptions** for CHAT GATE count (C3 residual).
8. Add **`maister-kiro` to plugin-development.md** in Phase 0 (M5).
9. Add **smoke-cli pseudocode** (M3).

---

## Conclusion

The C1–C3 fixes are **adequate**:

- **C1:** JSON generation at step 17 after all markdown transforms — unambiguous and aligned with Cursor pattern.
- **C2:** `rename_skill_directories()` at step 6 with validate rules 13 and 28 — implementable.
- **C3:** Mechanical chat-gate contract with `apply_chat_gate_transforms()`, headless defaults, and rules 25–27 — sufficient to start; polish overrides and validate table consolidation during Phase 0.

**Compliance status:** ⚠️ **Mostly Compliant** — proceed to phased implementation. No Critical blockers remain.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 6 |
| Medium | 8 |
| Low | 4 |
| **Total open** | **18** |

---

*Re-audit performed by independent codebase inspection. Files examined: `implementation/spec.md`, `verification/spec-audit.md` (prior), `analysis/requirements.md`, `analysis/research-context/{decision-log,grill-decisions,high-level-design}.md`, `.maister/docs/standards/global/{build-pipeline,plugin-development}.md`, `platforms/cursor/build.sh`, `Makefile`, `plugins/maister/{agents,skills,commands}/`, `plugins/maister-cursor/skills/`.*
