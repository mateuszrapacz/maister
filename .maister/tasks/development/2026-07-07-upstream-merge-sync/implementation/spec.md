# Specification: Upstream Merge Sync v2.2.1

## TL;DR

Integrate upstream `SkillPanel/maister` **v2.2.1** (4 commits, operator visibility layer) into the fork via **`git merge upstream/master`**, resolve **3 version-manifest conflicts** to **`2.2.1-fork.1`**, perform **full semantic review** of auto-merged orchestrator files, **rebuild all four platform variants**, fix **Kiro agent-count assertions (26 → 27)**, run **`make validate`** plus Kiro extended tests, document in **`implementation/work-log.md`**, and **leave changes uncommitted** for user review.

**Risk:** Medium-high — mechanically low-conflict (3 files), validationally high-effort (Kiro transforms, 14 auto-merged orchestrator files, fork feature preservation).

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Merge strategy | `git merge upstream/master` | Preserves bidirectional ancestry for future syncs; documented in `docs/cursor-agent-support.md`; supersedes v2.1.8 cherry-pick pattern |
| Fork version | `2.2.1-fork.1` | Matches v2.1.8 → `2.1.8-fork.1` precedent; resets fork patch counter on new upstream base |
| Target branch | `master` (direct merge) | Per Phase 5 requirements |
| Kiro agent count | Update hardcoded **26 → 27** | Upstream adds `html-companion-writer`; fork retains 2 thermo-nuclear agents upstream lacks |
| Semantic review scope | **Full** review of `development`, `product-design`, `init`, `orchestrator-patterns`; diff review for migration/performance/research | Largest overlapping edits since v2.1.8; visibility layer changes gate behavior |
| CHAT GATE thresholds | Measure after `make build-kiro`, then adjust `validation.test.sh` rule 26 if needed | Fork transforms differ from upstream AskUserQuestion counts |
| `html_output` default | Keep upstream `true` | Parity with upstream; graceful degradation on Kiro/Cursor CLI (print path on browser-open failure) |
| Manifest uniformity | Bump **all 5** version-bearing manifest files to `2.2.1-fork.1` | Kiro/Kilo versions live in build output, not root manifests |
| Copilot `CLAUDE.md` auto-merge | Rely on `make build-copilot` | Generated variant; build is source of truth |
| Git commit | **Do NOT commit** | User decides commit structure and timing |
| Push to remote | Out of scope unless user requests | Per scope boundaries |

---

## Open Questions

| ID | Question | Default / Mitigation |
|----|----------|----------------------|
| OQ-1 | Will upstream visibility gates push CHAT GATE counts above rule 26 thresholds (`dev_count >= 53`, `total >= 200`)? | Measure empirically after `make build-kiro`; adjust thresholds in `platforms/kiro-cli/tests/validation.test.sh` to measured values |
| OQ-2 | Does `html-companion-writer` need explicit `trustedAgents` wiring in Kiro `build.sh`? | Verify after build; add only if Kiro smoke/validation fails on agent delegation |
| OQ-3 | Are Cursor `quick-dev` / `quick-plan` overrides still wired after orchestrator edits? | Verify `platforms/cursor/build.sh` step 12 and `make validate-cursor` quick-plan integrity guard |
| OQ-4 | Does auto-merged `CLAUDE.md` retain all 12 AJ skills, bundles A–D, grill-me, thermos, thermo-nuclear entries? | Explicit checklist during Phase C semantic review |
| OQ-5 | Should `docs/cursor-agent-support.md` note v2.2.1 sync completion? | Optional follow-up; not blocking acceptance |

---

## Goal

Synchronize the fork with upstream v2.2.1 while preserving git continuity (merge ancestry, not cherry-pick-only), all fork-specific platforms and skills, and passing validation across Copilot, Cursor, Kiro, and Kilo variants.

## User Stories

- As a **fork maintainer**, I want upstream v2.2.1 merged via standard git merge so future syncs can use `git log upstream/master` and `git merge` without manual replay.
- As a **multi-platform contributor**, I want all four generated variants rebuilt and validated so Kiro, Kilo, and Cursor continue working after upstream orchestrator changes.
- As a **workflow user**, I want the operator visibility layer (dashboard, HTML companions, TL;DR contract) available in the fork without losing AJ skills, thermo-nuclear review, or platform-specific gate transforms.
- As a **release owner**, I want changes left uncommitted so I can review the merge resolution, version bumps, and test results before committing.

---

## Scope

### In Scope

- Fetch upstream and merge `upstream/master` into fork `master`
- Resolve 3 version-manifest conflicts → `2.2.1-fork.1`
- Bump remaining 2 manifests to `2.2.1-fork.1`
- Semantic review of auto-merged orchestrator and documentation files
- Verify upstream-only assets present in source tree
- Rebuild all four platform variants via `make build`
- Fix Kiro test assertions (agent count 26 → 27; CHAT GATE thresholds if needed)
- Run `make validate` (all platforms) + Kiro extended test suite
- Document actions and results in `implementation/work-log.md`
- Leave working tree changes uncommitted for user review

### Out of Scope

- Creating git commit (unless user explicitly requests)
- Pushing to remote (unless user explicitly requests)
- Contributing fork changes back to upstream
- E2E browser verification of `dashboard.html` rendering
- Adding Cursor/Kiro/Kilo to root `.claude-plugin/marketplace.json`
- Changing fork version scheme away from `X.Y.Z-fork.N`
- Alternative cherry-pick path (documented as fallback only)

---

## Upstream Delta Summary

### Repository Position

| Item | Current (fork) | Target (post-merge) |
|------|----------------|---------------------|
| Fork HEAD | `9f78d52` (`2.1.8-fork.2`) | Merge result on `master` (uncommitted) |
| Upstream HEAD | `945f60b` (v2.2.1) | Ancestry included via merge commit |
| Last sync point | `679958b` / marker `c790e51` at v2.1.8 | Full v2.2.0–v2.2.1 content integrated |
| Divergence | 53 fork-only / 4 upstream-only commits | Bidirectional history linked |

### Four Upstream Commits (`679958b..upstream/master`)

| Commit | Description |
|--------|-------------|
| `8d9e3b3` | **Operator visibility layer** — primary substantive change (~3,000 lines) |
| `68e3720` | Version bump to 2.2.0 |
| `56f7e7b` | Fix `argument-hint` array quoting in init skill (Copilot CLI) |
| `945f60b` | Version bump to 2.2.1 |

### Operator Visibility Layer (commit `8d9e3b3`)

**New assets (clean adds — no merge conflict):**

| Asset | Path |
|-------|------|
| Operator dashboard | `plugins/maister/skills/orchestrator-framework/assets/dashboard.html` (~615 lines) |
| HTML report styling | `plugins/maister/skills/orchestrator-framework/references/html-report-style.md` (~168 lines) |
| HTML companion agent | `plugins/maister/agents/html-companion-writer.md` (~55 lines) |

**Behavioral additions across existing files:**

- `.maister/config.yml` scaffolding with `html_output` gate (default `true`)
- TL;DR artifact contract — §7 in `orchestrator-patterns.md`; 13 upstream agents updated
- HTML companion generation — §9 patterns; orchestrators emit `.html` twins for spec/plan/brief
- Dashboard integration — §8 in `orchestrator-patterns.md`; orchestrators reference `dashboard.html`
- Timestamp rule — `date -u` capture at init (development SKILL)
- Decision gate pattern — one question per decision (not flattened multi-select)
- Plan HTML reconciliation — post-implementation `sed` marker-flip backstop for stale todo markers
- Canonical verification report — re-invoke verifier when fixes applied

**Touched orchestrators:** `development`, `init`, `migration`, `performance`, `product-design`, `research` + 13 agents

**Scale:** ~51 files changed, +2,975 / −123 lines (`git diff 679958b..upstream/master`)

---

## Fork Impact Assessment

### Merge Conflict Forecast

| Category | Files | Expected resolution |
|----------|-------|---------------------|
| Hard conflicts | 3 manifests (version fields only) | Set `2.2.1-fork.1`; preserve fork marketplace naming |
| Auto-merge overlap | 14 files (6 orchestrator SKILLs, `orchestrator-patterns.md`, `CLAUDE.md`, agent subset) | Git auto-merges; **manual semantic review required** |
| Clean adds | 3 upstream-only assets | Accept as-is |
| Generated variants | `maister-copilot/`, `maister-cursor/`, `maister-kiro/`, `maister-kilo/` | **Never hand-merge** — `make build` regenerates |

### Cursor (`platforms/cursor/`, `plugins/maister-cursor/`)

| Area | Impact | Required action |
|------|--------|-----------------|
| Build pipeline | Low — mechanical copy from SOT | `make build-cursor`; new assets flow automatically |
| quick-dev / quick-plan overrides | None expected — `platforms/cursor/overrides/` disjoint from upstream | Verify `build.sh` step 12 wiring; run `make validate-cursor` |
| AskQuestion → AskQuestion gates | Low — upstream uses AskUserQuestion; Cursor maps to AskQuestion | New orchestrator gates transformed on build |
| Dashboard browser open | Medium — `open`/`xdg-open` in orchestrator SKILLs | Works in Cursor IDE; graceful path print for CLI-only |
| html-companion-writer | Low — propagates to `agents/` | Verify `maister-html-companion-writer` naming after prefix transform |
| validate-cursor | Low | Run as part of `make validate` |

### Kiro CLI (`platforms/kiro-cli/`, `plugins/maister-kiro/`)

| Area | Impact | Required action |
|------|--------|-----------------|
| Agent JSON count | **High — certain test failure** | Update 26 → 27 in `e2e-matrix.test.sh`, `build-completion.test.sh`, `build.sh` comment (~L780) |
| CHAT GATE transforms | Medium — upstream adds MANDATORY GATE / AskUserQuestion blocks | Rebuild; audit rule 26 in `validation.test.sh`; adjust thresholds if counts change |
| html-companion-writer | Medium — required by product-design inline artifacts | Propagate via `generate-agent-json.sh`; verify trustedAgents if needed |
| Dashboard / browser open | Medium — CHAT GATE transform may leave bash `open` calls | Accept graceful failure; document `html_output: false` for Kiro Terminal |
| Skill dir counts | Low — upstream adds agent only, no new skills | Rules 14/28 likely unchanged |
| Hooks / steering | None | No upstream hook changes |

**Files requiring post-merge edits:**

- `platforms/kiro-cli/tests/e2e-matrix.test.sh` (L79–98)
- `platforms/kiro-cli/tests/build-completion.test.sh` (L46–83)
- `platforms/kiro-cli/build.sh` (comment ~L780)
- `platforms/kiro-cli/tests/validation.test.sh` (rule 26 thresholds, if needed)

### Kilo CLI (`platforms/kilo-cli/`, `plugins/maister-kilo/`)

| Area | Impact | Required action |
|------|--------|-----------------|
| Build pipeline | Low — `cp -r` + sed from SOT | `make build-kilo` |
| CHAT GATE sed | Medium — broader AskUserQuestion → CHAT GATE replacement | Rebuild; spot-check development orchestrator |
| New agent + assets | Low — mechanical propagation | Grep output for `html-companion-writer`, `dashboard.html` |
| validate-kilo | Low | Run `make validate-kilo`; optional `platforms/kilo-cli/smoke-cli.sh` |

### Copilot CLI (`platforms/copilot-cli/`, `plugins/maister-copilot/`)

| Area | Impact | Required action |
|------|--------|-----------------|
| Init skill fix | **Positive** — `56f7e7b` included in merge | Verify `init/SKILL.md` argument-hint quoting |
| Generated CLAUDE.md | Medium — auto-merge adds visibility docs | `make build-copilot` overwrites |
| validate-copilot | Low | Run `make validate-copilot` |

### AJ Skills (12 fork-only)

| Skill | Impact |
|-------|--------|
| Skill files on disk | **None** — upstream did not touch fork-only directories |
| `CLAUDE.md` registration | **Medium** — auto-merge may affect tables | Verify all 12 skills + commands documented |
| Bundles A–D | Low | Confirm chain documentation intact |
| Orchestrator soft suggestions | Low | Spot-check development/product-design for preserved AJ suggestion blocks |
| Kiro skill dir count (67) | None — fork skills already counted |

**Fork-only skills to preserve:** `aggregate-designer`, `context-distiller`, `grill-me`, `linguistic-boundary-verifier`, `metaprogram-classifier`, `problem-classifier`, `requirements-critic`, `test-strategy-reviewer`, `thermo-nuclear-code-quality-review`, `thermo-nuclear-review`, `thermos`, `transcript-critic`

### Thermo-nuclear / Thermos (fork-only)

| Area | Impact | Action |
|------|--------|--------|
| Skill + agent files | **None** — fork-only paths | No file edits expected |
| `CLAUDE.md` entries | Medium — same auto-merge risk as AJ skills | Verify thermo-nuclear + thermos sections |
| Upstream agent TL;DR updates | Low — thermo-nuclear agents did not exist upstream | No agent body merge conflict |

---

## Core Requirements

1. **FR-1 Git merge** — Fetch upstream; merge `upstream/master` into fork `master` with merge message documenting v2.2.1 operator visibility layer.
2. **FR-2 Version conflicts** — Resolve 3 conflicted manifests to `2.2.1-fork.1` while preserving fork marketplace structure.
3. **FR-3 Version uniformity** — Bump all 5 version-bearing manifest files to `2.2.1-fork.1`:
   - `.claude-plugin/marketplace.json`
   - `plugins/maister/.claude-plugin/plugin.json`
   - `plugins/maister-copilot/.claude-plugin/plugin.json`
   - `.cursor-plugin/marketplace.json`
   - `plugins/maister-cursor/.cursor-plugin/plugin.json`
4. **FR-4 Upstream assets** — Confirm presence of `dashboard.html`, `html-report-style.md`, `html-companion-writer.md` in source after merge.
5. **FR-5 Semantic review** — Full review of `development/SKILL.md`, `product-design/SKILL.md`, `init/SKILL.md`, `orchestrator-patterns.md`; diff review of migration/performance/research orchestrators and auto-merged `CLAUDE.md`.
6. **FR-6 Fork preservation** — All fork platforms, 12 AJ skills, 2 thermo-nuclear agents, Cursor overrides, and Kiro transforms remain intact and documented.
7. **FR-7 Platform rebuild** — Run `make build` to regenerate all four variants from `plugins/maister/` source only.
8. **FR-8 Kiro test fixes** — Update agent count 26 → 27; adjust CHAT GATE rule 26 thresholds empirically if build changes counts.
9. **FR-9 Validation gate** — `make validate` passes for Copilot, Cursor, Kiro, Kilo; Kiro extended tests pass.
10. **FR-10 Work log** — Record decisions, files touched, test results in `implementation/work-log.md`.
11. **FR-11 No commit** — Leave merge resolution, version bumps, rebuild output, and test fixes uncommitted for user review.

---

## Reusable Components

### Existing Code to Leverage

| Component | Path | Reuse |
|-----------|------|-------|
| Prior sync work-log | `.maister/tasks/development/2026-06-14-upstream-sync-integration/implementation/work-log.md` | Step template: version scheme, build/validate, Cursor override pattern |
| Fork merge strategy docs | `docs/cursor-agent-support.md` | Documents `git merge upstream/master` workflow |
| Never-edit-generated rule | Root `CLAUDE.md` | Source-only edits in `plugins/maister/` + `platforms/*/` |
| Build pipeline | `Makefile` (`build`, `validate`, per-platform targets) | CI gate after merge |
| Cursor override pattern | `platforms/cursor/overrides/` + `build.sh` step 12 | Reference if corruption detected post-merge |
| Divergence research | `.maister/tasks/research/2026-06-14-upstream-sync-consistency/` | Historical context |
| validate-cursor quick-plan guard | `Makefile` `validate-cursor` | Detect orchestrator corruption |

### New Components Required

| Component | Why |
|-----------|-----|
| None | Integrative merge — no new features; only version bumps, Kiro test threshold updates, and work-log documentation |

---

## Detailed Merge Procedure

### Phase A — Preparation

1. Ensure clean working tree on `master` (stash or commit unrelated work first).
2. Optional safety branch: `git branch backup/pre-v2.2.1-merge`.
3. `git fetch upstream`.
4. Confirm divergence:
   - `git log --oneline 679958b..upstream/master` — expect **4 commits**.
   - `git rev-list --left-right --count HEAD...upstream/master` — expect **53 / 4** (fork-only / upstream-only).
5. Record pre-merge SHAs in work-log: fork HEAD, upstream HEAD, merge base.

### Phase B — Merge

6. `git merge upstream/master -m "Merge upstream v2.2.1 (operator visibility layer)"`.
7. If merge aborts unexpectedly, stop and consult rollback plan — do not force.
8. Resolve **3 manifest conflicts** — set `"version": "2.2.1-fork.1"` in:
   - `.claude-plugin/marketplace.json`
   - `plugins/maister/.claude-plugin/plugin.json`
   - `plugins/maister-copilot/.claude-plugin/plugin.json`
9. Bump **non-conflicting manifests** to `2.2.1-fork.1`:
   - `.cursor-plugin/marketplace.json`
   - `plugins/maister-cursor/.cursor-plugin/plugin.json`
10. Stage conflict resolutions; **do not commit**.

### Phase C — Semantic Review (Auto-Merged Files)

11. **`orchestrator-patterns.md`** — Confirm §7 (TL;DR), §8 (dashboard), §9 (HTML companions) present; fork-specific references intact.
12. **`development/SKILL.md`** — Operator visibility blocks present; timestamp rule; fork CHAT GATE / delegation patterns not regressed.
13. **`product-design/SKILL.md`** — HTML companion / inline brief flow; visibility integration; fork gates intact.
14. **`init/SKILL.md`** — Copilot `argument-hint` array quoting fix from `56f7e7b`; init config.yml scaffolding.
15. **`CLAUDE.md`** (source: `plugins/maister/CLAUDE.md`) — All 12 AJ skills, bundles A–D, grill-me, thermos, thermo-nuclear entries preserved; upstream visibility docs merged correctly.
16. **Diff review** — `migration/SKILL.md`, `performance/SKILL.md`, `research/SKILL.md` for gate/dashboard additions without fork regression.
17. **Verify new files exist:**
    - `plugins/maister/skills/orchestrator-framework/assets/dashboard.html`
    - `plugins/maister/skills/orchestrator-framework/references/html-report-style.md`
    - `plugins/maister/agents/html-companion-writer.md`
18. If semantic corruption found (e.g., missing fork skill table), fix in **source only** (`plugins/maister/`), not generated variants.

### Phase D — Platform Rebuild and Fork Fixes

19. `make build` — regenerate Copilot, Cursor, Kiro, Kilo variants.
20. Update Kiro hardcoded agent count **26 → 27** in:
    - `platforms/kiro-cli/tests/e2e-matrix.test.sh`
    - `platforms/kiro-cli/tests/build-completion.test.sh`
    - `platforms/kiro-cli/build.sh` (README comment ~L780)
21. `make build-kiro` — measure CHAT GATE counts in built output.
22. If rule 26 fails, update `platforms/kiro-cli/tests/validation.test.sh` thresholds to measured `dev_count` and `total` (currently `>= 53` and `>= 200`).
23. Re-run `make build` if source or platform script edits were made.

### Phase E — Verification and Handoff

24. Confirm all **5 manifests** uniformly at `2.2.1-fork.1`.
25. Grep generated variants for `html-companion-writer`, `dashboard.html` references.
26. Run validation suite (see Post-Merge Validation Checklist).
27. Document in `implementation/work-log.md`: decisions, SHAs, files touched, test results, known limitations.
28. **Do not commit** — leave changes for user review.

### Alternative Path (Not Recommended)

If merge is blocked by policy: cherry-pick `8d9e3b3` + `56f7e7b`; skip version commits `68e3720` and `945f60b`; manually set `2.2.1-fork.1`; add empty marker commit. Same semantic review and platform fixes still required; loses full merge ancestry benefit.

---

## Conflict Resolution Rules

### Rule 1 — Version Manifests (Hard Conflicts)

- **Take:** Upstream JSON structure and description fields where non-conflicting.
- **Set:** `"version": "2.2.1-fork.1"` in all conflicted version fields.
- **Preserve:** Fork marketplace naming (`maister-plugins` or fork-specific name — do not revert to upstream-only marketplace identity if fork differs).
- **Never:** Drop fork suffix or adopt bare upstream `2.2.1` without `-fork.N`.

### Rule 2 — Source of Truth Hierarchy

- **Editable:** `plugins/maister/` and `platforms/*/`.
- **Never edit directly:** `plugins/maister-copilot/`, `plugins/maister-cursor/`, `plugins/maister-kiro/`, `plugins/maister-kilo/`.
- **Resolution order:** Fix conflicts in source → `make build` → validate generated output.

### Rule 3 — Auto-Merged Orchestrator Files

- **Default:** Accept git auto-merge as starting point.
- **Override when:** Fork-specific content missing (AJ skill tables, CHAT GATE references, thermo-nuclear entries, Cursor/Kiro transform targets).
- **Prefer:** Combine both sides — upstream visibility layer + fork gate/delegation patterns.
- **Never:** Delete fork-only skill references to resolve ambiguity.

### Rule 4 — Fork-Only Paths

- **Never delete:** `platforms/cursor/overrides/`, `platforms/kiro-cli/`, `platforms/kilo-cli/`, fork-only skill directories under `plugins/maister/skills/`.
- **Upstream-only adds:** Accept wholesale (`dashboard.html`, `html-report-style.md`, `html-companion-writer.md`).

### Rule 5 — Generated Variant Conflicts

- If git marks generated files as conflicted: resolve by **deleting conflict markers and running `make build`**, not by manual merge of generated content.

### Rule 6 — Kiro Test Thresholds

- Update thresholds to **measured post-build values**, not upstream guesses.
- Document old and new values in work-log.

### Rule 7 — Commit Discipline

- Stage merge resolution as needed for validation, but **do not create commit** unless user explicitly requests.

---

## Post-Merge Validation Checklist

### Source Tree Verification

- [ ] Merge commit exists in working tree (or merge in progress completed)
- [ ] `dashboard.html`, `html-report-style.md`, `html-companion-writer.md` present under `plugins/maister/`
- [ ] `orchestrator-patterns.md` contains §7, §8, §9
- [ ] `plugins/maister/CLAUDE.md` lists all 12 AJ skills + thermo-nuclear/thermos entries
- [ ] All 5 manifests at `2.2.1-fork.1`

### Build Verification

- [ ] `make build` completes without error
- [ ] `plugins/maister-cursor/agents/html-companion-writer.md` (or prefixed equivalent) exists post-build
- [ ] `plugins/maister-kiro/agents/maister-html-companion-writer.json` exists post-build
- [ ] Dashboard asset copied to generated variants where applicable

### Platform Validation

- [ ] `make validate` — all platforms PASS
- [ ] `make validate-copilot` — PASS
- [ ] `make validate-cursor` — PASS (including quick-plan integrity guard)
- [ ] `make validate-kiro` — PASS
- [ ] `make validate-kilo` — PASS

### Kiro Extended Tests

- [ ] `platforms/kiro-cli/tests/build-core.test.sh` — PASS
- [ ] `platforms/kiro-cli/tests/build-completion.test.sh` — PASS (27 agents)
- [ ] `platforms/kiro-cli/tests/e2e-matrix.test.sh` — PASS (27 agents)
- [ ] `platforms/kiro-cli/tests/chat-gate.test.sh` — PASS
- [ ] `platforms/kiro-cli/tests/validation.test.sh` — PASS (rule 26 thresholds)

### Optional Smoke

- [ ] `platforms/kilo-cli/smoke-cli.sh` — PASS (if available)

### Documentation

- [ ] `implementation/work-log.md` updated with SHAs, decisions, test output summary
- [ ] Working tree left uncommitted per FR-11

---

## Acceptance Criteria

1. **Git continuity:** Fork history includes upstream v2.2.1 commits via merge (not cherry-pick-only); `git log --oneline --merges` shows upstream integration point.
2. **Upstream content integrated:** Operator visibility layer assets and behavioral patterns (§7–9, config.yml gate, TL;DR contract) present in `plugins/maister/`.
3. **Fork features preserved:** Kiro, Kilo, Cursor platforms build; 12 AJ skills and 2 thermo-nuclear agents documented in source `CLAUDE.md`; Cursor overrides wired.
4. **Version correctness:** All 5 manifests read `2.2.1-fork.1`.
5. **Kiro agent inventory:** Exactly **27** JSON agents in built Kiro output; all hardcoded test assertions updated.
6. **Validation green:** `make validate` passes; Kiro extended test suite passes.
7. **Source-only discipline:** No direct edits to generated platform variants except via `make build`.
8. **Handoff ready:** Work-log complete; changes uncommitted for user review.

---

## Rollback Plan

### Before Merge (Phase A)

- **Action:** `git checkout master` on backup branch or `git merge --abort` if merge not yet completed.
- **Cost:** Zero — no changes applied.

### After Merge, Before Build (Phases B–C)

- **Action:** `git merge --abort` if merge still in progress; OR `git reset --hard backup/pre-v2.2.1-merge` if backup branch was created.
- **Requires:** User confirmation before destructive reset (per Maister user-confirmed rollback principle).
- **Cost:** Loses merge resolution work; safe if backup branch exists.

### After Build / Test Fixes (Phases D–E)

- **Action:** `git reset --hard backup/pre-v2.2.1-merge` OR `git checkout backup/pre-v2.2.1-merge -- .` for selective revert.
- **Alternative:** `git stash` current work for later inspection before reset.
- **Requires:** Explicit user confirmation — do not auto-rollback on validation failure.
- **On validation failure:** STOP → analyze root cause → attempt targeted fix (Kiro thresholds, semantic fix in source) → re-run validate → ask user if rollback preferred.

### Recovery Without Backup Branch

- **Action:** `git reflog` to find pre-merge HEAD (`9f78d52`); `git reset --hard 9f78d52`.
- **Requires:** User confirmation; document in work-log.

### Rollback Does Not Include

- Remote push reversal (out of scope).
- Upstream remote modification.

---

## Implementation Guidance

### Testing Approach

This task does not use TDD. Validation is **integration/regression testing**:

- Primary gate: `make validate` (structural checks across 4 platforms)
- Secondary gate: Kiro extended test scripts (agent count, CHAT GATE transforms)
- Optional: Kilo smoke CLI
- No new test files required unless CHAT GATE thresholds change (update existing assertions only)
- If implementation-planner groups work: 2–8 verification checks per group (grep assertions, manifest version checks, single test script runs)

### Standards Compliance

- **Never edit generated files:** Root `CLAUDE.md` / repo `CLAUDE.md` rule — edits only in `plugins/maister/` and `platforms/*/`
- **Build pipeline:** `plugins/maister/` → `make build` → four variants
- **User-confirmed rollback:** Do not auto-reset on validation failure; ask user per Maister plugin principle
- **Fork version scheme:** `X.Y.Z-fork.N` documented in prior sync work-log

---

## Success Criteria (Measurable)

| Metric | Target |
|--------|--------|
| Upstream commits integrated | 4 (`679958b..945f60b`) |
| Hard merge conflicts resolved | 3 manifest files |
| Manifest version uniformity | 5/5 at `2.2.1-fork.1` |
| Kiro agent JSON count | 27 |
| `make validate` | PASS (all 4 platforms) |
| Kiro extended tests | PASS (5 scripts) |
| Fork-only skills in CLAUDE.md | 12/12 present |
| New upstream assets in source | 3/3 present |
| Git commit created | **None** (user handoff) |

---

## Known Limitations

- E2E browser testing of dashboard HTML is explicitly out of scope; dashboard presence verified by file existence and grep only.
- Kiro Terminal cannot auto-open browser; upstream graceful-degradation (print path) is acceptable.
- Cherry-pick alternative documented but not executed unless merge strategy fails.
