# Specification Audit — Cursor Skill Prefix & Slash Palette

**Auditor**: maister-spec-auditor  
**Date**: 2026-07-08  
**Artifacts reviewed**:
- `implementation/spec.md`
- `.maister/plans/2026-07-08-cursor-skill-prefix-and-palette.md`
- `analysis/gap-analysis.md`
- `platforms/cursor/build.sh` (current, 303 lines)
- `Makefile` (`validate-cursor`, L37–103)

**Evidence baseline**: Current tree has **16** `plugins/maister-cursor/commands/*.md` (14 from source + 2 Cursor-only overrides for `quick-plan`/`quick-dev`), **28** `skills/*/SKILL.md`, and `validate-cursor` still **requires** `commands/`, thin wrappers, and `"commands"` in `plugin.json`.

---

## Overall Verdict

**pass-with-concerns**

The specification is substantially complete, aligned with the authoritative plan and gap analysis, and implementable with a clear PR sequence (PR1→PR5), locked decisions (D1–D6), and per-PR gates. Kiro reference patterns are correctly cited. Several gaps would cause regressions or merge mistakes if implemented literally without correction—most notably **quick-dev content sourcing**, **collapse skip logic in `merge_commands_to_skills()`**, and **agent `skills:` preload updates for PR4**.

---

## Issue Counts

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning  | 9 |
| Info     | 5 |

---

## Detailed Findings

### Critical

#### C1. `quick-dev` content source is wrong (§4.2.1, §5 collapse map)

**Reference**: `implementation/spec.md` §4.2.1 rule 3, §5 row `commands/quick-dev`; `platforms/cursor/overrides/commands/quick-dev.md`

The spec states `platforms/cursor/overrides/commands/quick-dev.md` is merged into the skill directory as the skill body. That file is a **12-line thin wrapper** delegating to `skill: "quick-dev"`—the same anti-pattern being eliminated. Rich content lives in `plugins/maister/skills/quick-dev/SKILL.md` (copied by build, then colon→hyphen transformed).

There is **no** `platforms/cursor/overrides/skills/quick-dev/SKILL.md` (unlike `quick-plan` and `quick-bugfix`).

**Impact**: Implementing the spec literally would replace the full quick-dev workflow with a thin delegator, breaking `/maister-quick-dev` behavior.

**Required fix before implementation**: Collapse map row should be:

| Retire | Keep | Content source |
|--------|------|----------------|
| `commands/quick-dev` (override) + skill dup | `maister-quick-dev` | `skills/quick-dev/SKILL.md` (source; global transforms apply) |

Do **not** copy `overrides/commands/quick-dev.md` into `skills/`. Stop emitting it under `commands/` (per rule 3). PR3 renames dir/frontmatter to `maister-quick-dev`; PR3 sed must rewrite any `skill: "quick-dev"` remnants (including inside the retired command file if still referenced).

---

### Warnings

#### W1. `merge_commands_to_skills()` lacks explicit collapse skip list (§4.2.1, §5)

**Reference**: `implementation/spec.md` §4.2.1 rules 1–2; `platforms/kiro-cli/build.sh` L41–72

Kiro’s `merge_one` copies **all** collapse stems (e.g. `quick-problem-classifier` → `maister-quick-problem-classifier`). The Cursor spec correctly chooses D1 shorter names and rule 2 (“do not copy thin command wrapper”), but the function sketch only shows command-only merges and `rm -rf commands`—no **explicit skip list** for the 8 collapse stems + `quick-plan`/`quick-dev` command files.

**Impact**: Porting Kiro verbatim recreates duplicate skill dirs and violates PR2 acceptance (“no `maister-quick-problem-classifier`”).

**Recommendation**: Add a normative skip table in §4.2.1 matching §5 collapse rows, or pseudocode: `for stem in collapse_stems; do skip merge_one; done`.

---

#### W2. PR2 `validate-cursor` expects post-PR3 paths without phase gating (§4.2.4)

**Reference**: `implementation/spec.md` §4.2.4; `Makefile` L40–49 (current)

Proposed checks reference `skills/maister-work/SKILL.md`, `maister-quick-plan`, etc., while noting “interim: `work/` or `quick-plan/` pre-PR3”. The spec does not define **which Makefile commit** uses interim vs final paths. PR2 acceptance also lists `maister-problem-classifier` existence, but PR2 only keeps `problem-classifier/` until PR3 rename.

**Impact**: Either PR2 validation fails if written as specified, or implementers guess path names.

**Recommendation**: Split Makefile changes into explicit per-PR blocks (PR2: plain-kebab + no commands; PR3: prefix/dir checks).

---

#### W3. Makefile inversion incomplete—retained checks not reconciled (§4.2.4, §7.2)

**Reference**: `implementation/spec.md` §4.2.4; `Makefile` L40–51, L91

Spec lists removals (L40–49 command wrappers, L91 `"commands"` required) but omits updates for:

| Retained check | Issue after PR2/PR3 |
|----------------|---------------------|
| L40–41 colon check on `commands/` | Harmless if `commands/` absent; should be removed or guarded |
| L50–51 `skills/quick-plan/SKILL.md` integrity | Path becomes `skills/maister-quick-plan/SKILL.md` in PR3 |
| L42–43 `commands/quick-*.md` | Removed with commands dir—covered |

Also missing: **PR4** concrete `validate-cursor` rules (§7.2 table mentions outcome but no bash snippets unlike PR1/PR3).

---

#### W4. `apply_skill_reference_transforms()` under-specified vs actual source patterns (§4.3.2)

**Reference**: `implementation/spec.md` §4.3.2; orchestrator SKILL.md files in `plugins/maister/`

Orchestrators primarily delegate internal engines via backtick forms already transformed by global step 4 (`maister:` → `maister-`), e.g. `` Skill tool - `maister:codebase-analyzer` ``. The minimum sed list focuses on `skill: "plain-kebab"` strings (mostly in `commands/`, which PR2 removes).

Gaps:

- No mention of updating **`agents/*.md` `skills:` preload lists** (e.g. `docs-operator` has `skills: - docs-manager`; built output `plugins/maister-cursor/agents/docs-operator.md` L4–5).
- No `Skill tool - \`maister-*\`` normalization beyond global colon pass.
- Bundle flow prose (`run \`problem-classifier\``, “Invoke the `transcript-critic` skill”)—Kiro’s `apply_delegation_transforms` has ~30 patterns; spec says “extend from Kiro” but does not require parity checklist.

**Impact**: PR3 `validate-cursor` grep for `skill: "` may pass while backtick/plain-name prose still references old names; PR4 agent preload may break after rename/relocation.

---

#### W5. PR4 / sentinel test—fixture injection mechanism underspecified (§4.4.3)

**Reference**: `implementation/spec.md` §4.4.3; `platforms/cursor/smoke-cli.sh`

The sentinel gate is sound (exact string match, reject self-reported resolution), but the spec contradicts itself:

- “Build copies fixture to `$OUT/lib/skills/maister-sentinel-lib-skill/` during PR4 branch only”
- “remove from production output after gate passes”

It does not specify **whether** injection is via `build.sh` conditional, `smoke-cli.sh` pre-copy, or a dedicated test script—and how production builds exclude the sentinel afterward.

`/maister-init` smoke (§4.4.5) exercises **docs-operator → docs-manager preload**, not direct Skill-tool invocation of `maister-docs-manager`. That is a weaker proof of 4B for relocated internals than the sentinel alone.

**Recommendation**: Document: (1) fixture copy only in `smoke-cli.sh` or `tests/lib-skill-resolution.sh`, never in committed `plugins/maister-cursor/`; (2) separate sentinel (Skill tool by name) vs init smoke (agent preload path).

---

#### W6. PR1 path-update scope may miss `implementation-verifier` (§4.1.2)

**Reference**: `implementation/spec.md` §4.1.2 table; `plugins/maister/skills/implementation-verifier/SKILL.md` L188

Table lists orchestrators (`development`, `migration`, …) but `implementation-verifier` references `../orchestrator-framework/references/html-report-style.md`. It is in `TODO_GLOB` (build.sh L281) but not in the orchestrator path-update table.

**Impact**: Stale relative path after lib move if sed/find scope is orchestrator-only.

---

#### W7. Public skill inventory arithmetic error (§6)

**Reference**: `implementation/spec.md` §6 “Modeling / classifiers (8)”

Section header says **(8)** but lists **10** skills (`maister-grill-me` through `maister-thermo-nuclear-code-quality-review`). Full inventory sums to **29** public skills before PR4 internal relocation; target “~25–27” is achievable only after moving 4 internals out, but the section header mismatch will confuse `skill-inventory.test.sh` baseline.

---

#### W8. Build pipeline step order vs `apply_todo_transforms` (§3.1)

**Reference**: `implementation/spec.md` §3.1; `platforms/cursor/build.sh` L272–300

Pipeline correctly places `relocate_orchestrator_framework()` before `rename_skill_directories()` (D5) and updates `TODO_GLOB` to `lib/orchestrator-framework` (PR1). **Verified consistent** with current `apply_todo_transforms` running last (step 19).

Minor ambiguity: §3.1 labels step 13 `apply_cursor_overrides()` before step 14 `merge_commands_to_skills()`. Overrides must land on skill dirs **before** merge deletes `commands/` and before collapse invariants are checked—order is OK, but `merge_commands` must not recreate command-derived duplicates after overrides (see W1).

---

#### W9. Generated `README.md` still documents “Commands” (out of §9 file list)

**Reference**: `platforms/cursor/build.sh` L104–128; `implementation/spec.md` §9

`build.sh` writes `plugins/maister-cursor/README.md` with a “## Commands” section and `/maister-*` commands wording. D3 eliminates `commands/`; PR5 docs work does not list updating this generated README template block.

**Impact**: User-facing drift in the built plugin root README.

---

### Info

#### I1. Collapse map completeness vs source inventory — **complete**

Verified against `plugins/maister/commands/*.md` (14 files) + Cursor overrides:

| Category | Covered in §5 |
|----------|----------------|
| 8 collapse pairs (quick-*, modeling-*, reviews-test-strategy, reviews-linguistic-boundaries) | Yes |
| 6 command-only (reviews-*, work) | Yes |
| quick-plan / quick-dev (override commands, no source command) | Yes (quick-dev source fix needed—C1) |
| quick-bugfix (skill-only; override skill) | Yes (“if present” hedge) |
| 8 orchestrators + utilities (prefix-only PR3) | Yes |
| orchestrator-framework | PR1 lib move (not in collapse table—correct) |
| 4 internal engines | PR4 (not public collapse) |

No orphan commands in current `maister-cursor/commands/` outside the map.

---

#### I2. PR ordering vs `cursor-platform-review-fixes` — documented, low conflict

**Reference**: `implementation/spec.md` §3.2, §8; `.maister/plans/2026-07-08-cursor-platform-review-fixes.md`

Plans are orthogonal (palette/naming vs hooks/readonly). Platform-review plan notes it is largely complete. Residual risk is `build.sh` merge conflicts only—adequately mitigated in spec §8.

---

#### I3. `skill-invocation-reminder.sh` — no change required (§4.3.2)

**Reference**: `platforms/cursor/hooks/skill-invocation-reminder.sh`

Hook text already references `/maister-*` only; spec’s “verify post-transform” is satisfied by inspection.

---

#### I4. CI coverage split

| Gate | CI workflow |
|------|-------------|
| Drift (`git diff plugins/maister-cursor`) | `validate-generated-variants.yml` (`make build` only) |
| Structural `validate-cursor` | `release.yml` / `build-copilot.yml` (`make validate`) — not path-filtered to cursor |
| Runtime smoke | `cursor-cli-smoke.yml` (`smoke-cli.sh`) |

Per-PR spec gates include `validate-cursor` + `smoke-cli.sh`; developers must run locally. Consider wiring `make validate-cursor` into cursor path-filtered CI (optional enhancement).

---

#### I5. `quick-bugfix` has no command in current build

**Reference**: `plugins/maister-cursor/commands/` listing; §5 “if present”

Only skill + override skill exist today—no duplicate command entry. Collapse row is precautionary, not active dedup.

---

## Focus-Area Checklist (requested)

| Area | Assessment |
|------|------------|
| **PR ordering conflicts** | **Pass with minor ambiguity** — D5 lib-first ordering is correct; override→merge sequence OK; fix C1/W1 before PR2 coding. |
| **Missing validation updates** | **Concerns** — PR4 Makefile snippets absent; retained L50–51 path stale; PR2 interim vs final paths unclear (W2–W3). |
| **Collapse map completeness** | **Pass** — all 16 command palette entries accounted for; C1 fixes quick-dev *source* cell only. |
| **Sentinel test adequacy** | **Pass with concerns** — gate design is strong; injection/cleanup mechanism and init vs Skill-tool paths need detail (W5). |
| **Makefile inversion completeness** | **Concerns** — removals listed; retained checks and phase-gated additions incomplete (W2–W3). |
| **Override handling (quick-plan / quick-dev / quick-bugfix)** | **Mixed** — quick-plan ✅ override skill; quick-bugfix ✅ override skill; quick-dev ❌ wrong source (C1). |

---

## Recommendations

### Must fix before PR2

1. **Correct §4.2.1 and §5** for `quick-dev`: source skill body, not `overrides/commands/quick-dev.md`.
2. **Add normative skip list** to `merge_commands_to_skills()` for all collapse stems (§5 table)—do not port Kiro `merge_one` lines 62–69 unchanged.

### Should fix in spec (any PR before coding that phase)

3. **Split `validate-cursor` changes** into PR2 / PR3 / PR4 / PR5 Makefile snippets with exact paths per phase (W2–W3).
4. **Extend §4.3.2** with agent `skills:` frontmatter updates and a Kiro parity checklist for backtick/plain-name patterns (W4).
5. **Clarify sentinel fixture** lifecycle: smoke-only copy, never committed in `plugins/maister-cursor/` (W5).
6. **Add `implementation-verifier`** to PR1 path-update table (W6).
7. **Fix §6 inventory counts** (8 vs 10; document 29→25 after internal move) (W7).
8. **Add `build.sh` README block** to §9 PR5 (skills-only palette wording) (W9).

### Implementation discipline

9. After each PR, run the spec’s per-PR gate verbatim: `make build-cursor && make validate-cursor`, `platforms/cursor/smoke-cli.sh`, `git diff --exit-code plugins/maister-cursor`.
10. On PR4, run sentinel **before** merging 4B; if fail, execute 4A fallback and update orchestrator + agent references to `maister-internal-*` in the same PR.

---

## Consistency: Spec vs Plan vs Gap Analysis

| Topic | Aligned? |
|-------|----------|
| D1–D6 locked decisions | Yes |
| PR1–PR5 sequence | Yes |
| Collapse map rows | Yes (except quick-dev source—plan §Phase 2 repeats same error) |
| Gap analysis integration points | Yes — accurately reflects current `build.sh` / `validate-cursor` gap |
| Target palette ~25–27 | Yes — with §6 counting fix |

---

## Implementation Readiness Summary

| Dimension | Rating |
|-----------|--------|
| Completeness | High — all major functions, files, and phases named |
| Consistency | Medium — quick-dev sourcing error duplicated in plan |
| Implementability | High after C1 + W1 fixes |
| Testability | High — gates well defined; PR4 fixture mechanics need one paragraph |
| Risk coverage | High — 4B/4A fallback and D5 ordering are sound |

**Auditor conclusion**: Proceed with implementation after applying **C1** and **W1** spec amendments. Treat **W2–W5** as required clarifications during PR2–PR4 execution even if not all are edited into `spec.md` first.
