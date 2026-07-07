# Gap Analysis: Upstream Merge Sync (v2.2.1)

**Date:** 2026-07-07  
**Task:** Sync fork with upstream `SkillPanel/maister` v2.2.1 while preserving fork features and git continuity  
**Analyzer:** gap-analyzer subagent  
**Inputs:** `analysis/codebase-analysis.md`, `CLAUDE.md`, prior sync work-log (`2026-06-14-upstream-sync-integration`)

---

## Executive Summary

The fork is **4 upstream commits behind** (`679958b` v2.1.8 → `945f60b` v2.2.1) with **53 fork-only commits** on top. The delta is dominated by the **operator visibility layer** (~3,000 lines): dashboard HTML, HTML companion reports, `.maister/config.yml` gating, TL;DR artifact contract, and a new `html-companion-writer` agent.

Mechanically, the merge is **low-conflict** (3 version-manifest files). Validationally, it is **high-effort**: Kiro agent-count tests, CHAT GATE thresholds, semantic review of 14 auto-merged orchestrator files, and platform-specific behavior for browser auto-open and HTML companions.

**Recommended approach:** `git merge upstream/master` (not cherry-pick) to preserve bidirectional ancestry, resolve 3 version conflicts to `2.2.1-fork.1`, rebuild all four platform variants, then run full `make validate` plus Kiro test suites.

**Overall gap severity:** Medium-high — few merge conflicts, large validation surface.

---

## 1. Current vs Desired State Comparison

### Repository Position

| Dimension | Current (fork) | Desired |
|-----------|----------------|---------|
| **HEAD** | `9f78d52` (`2.1.8-fork.2`) | Post-merge commit on `master` |
| **Upstream sync point** | `c790e51` marker at v2.1.8 content | Ancestry includes `945f60b` (v2.2.1) |
| **Version** | `2.1.8-fork.2` on 6 manifests | `2.2.1-fork.1` on all manifests |
| **Upstream content** | Missing v2.2.0–v2.2.1 (4 commits) | Full operator visibility layer integrated |
| **Fork features** | Kiro, Kilo, Cursor, 12 AJ skills, thermo-nuclear agents | Unchanged and passing validation |
| **Git continuity** | Empty merge marker from v2.1.8 sync | Merge commit linking fork + upstream histories |

### Content Gaps (upstream present, fork absent)

| Gap | Upstream evidence | Impact if not integrated |
|-----|-------------------|--------------------------|
| **Operator dashboard** | `orchestrator-framework/assets/dashboard.html` (615 lines), §8 in `orchestrator-patterns.md` | Orchestrators reference missing asset; init/dashboard steps fail |
| **HTML companions** | `html-report-style.md`, `html-companion-writer` agent, §9 patterns | No `.html` twins for spec/plan/brief artifacts |
| **Project config** | `.maister/config.yml` with `html_output` gate | No opt-out for HTML/dashboard; orchestrators assume it exists |
| **TL;DR artifact contract** | §7 in `orchestrator-patterns.md`; 13 agents updated | Subagent outputs lack required summary blocks |
| **Timestamp rule** | `date -u` capture at init (development SKILL) | Stale `T00:00:00Z` timestamps in state/artifacts |
| **Decision gate pattern** | One question per decision (not flattened multi-select) | Gate UX diverges from upstream contract |
| **Init Copilot fix** | `56f7e7b` argument-hint array quoting | Copilot CLI init skill may have invalid frontmatter |
| **Plan HTML reconciliation** | Post-implementation `sed` marker-flip backstop | Stale todo markers in `implementation-plan.html` |
| **Canonical verification report** | Re-invoke verifier when fixes applied | Stale pre-fix reports block phase exit |

### Fork Divergence (must preserve)

| Category | Count / items | Risk if lost |
|----------|---------------|--------------|
| **Platforms** | Cursor, Kiro CLI, Kilo CLI (`platforms/*/build.sh`) | Multi-platform distribution breaks |
| **Fork-only skills** | 12: aggregate-designer, context-distiller, grill-me, linguistic-boundary-verifier, metaprogram-classifier, problem-classifier, requirements-critic, test-strategy-reviewer, thermo-nuclear-*, thermos, transcript-critic | AJ skill bundles A–D lost |
| **Fork-only agents** | 2: thermo-nuclear-*-subagent | Thermos parallel review broken |
| **Cursor overrides** | quick-dev, quick-plan skill overrides | Cursor-specific plan/dev flows regress |
| **Kiro transforms** | AskUserQuestion → CHAT GATE, todo transforms, 28 validate rules | Kiro CLI incompatible with source |
| **Version scheme** | `X.Y.Z-fork.N` | Conflicts with upstream-only versioning |

### Merge Conflict Forecast

| Category | Files | Resolution |
|----------|-------|------------|
| **Hard conflicts** | 3 manifests: `.claude-plugin/marketplace.json`, `plugins/maister/.claude-plugin/plugin.json`, `plugins/maister-copilot/.claude-plugin/plugin.json` | Take upstream structure; set `2.2.1-fork.1` |
| **Auto-merge overlap** | 14 files: 6 orchestrator SKILLs, `orchestrator-patterns.md`, `CLAUDE.md`, 13 agent prompts (subset overlaps orchestrators) | Git auto-merges; **manual semantic review required** |
| **Clean adds** | `dashboard.html`, `html-report-style.md`, `html-companion-writer.md` | No conflict — upstream-only paths |
| **Generated variants** | `maister-copilot/`, `maister-cursor/`, `maister-kiro/`, `maister-kilo/` | Never hand-merge; `make build` regenerates |

`git merge-tree` simulation confirms exactly 3 conflicted files (all version fields).

---

## 2. Task Characteristics

| Field | Value | Rationale |
|-------|-------|-----------|
| **has_reproducible_defect** | `false` | No runtime bug; fork is intentionally behind upstream |
| **modifies_existing_code** | `true` | 51 upstream files touch existing orchestrators, agents, init skill |
| **creates_new_entities** | `true` | Integrates 3 new upstream assets + 1 agent (`html-companion-writer`) absent from fork |
| **involves_data_operations** | `false` | Git/build pipeline only; no application CRUD |
| **ui_heavy** | `false` | Task is repo sync; upstream adds operator HTML but this task does not build UI features |

**Change type:** Integrative — upstream additive content merged into fork-extended codebase.

**Compatibility requirements:** Strict — fork platforms must remain green after merge; AJ skills and thermo-nuclear agents must survive auto-merge of `CLAUDE.md` and orchestrators.

---

## 3. Risk Level

**Medium-high**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Kiro agent count test failure (26 → 27) | **Certain** | Blocks `validate-kiro` | Update `e2e-matrix.test.sh`, `build-completion.test.sh`, `build.sh` docs |
| CHAT GATE threshold breach (rule 26) | Medium | Blocks Kiro validation | Re-audit counts post-build; update thresholds in `validation.test.sh` if upstream added gates |
| Semantic drift in auto-merged orchestrators | Medium | Wrong gate/dashboard behavior on fork platforms | Manual review of 14 overlapped files; spot-check development + product-design |
| `CLAUDE.md` loses fork skill tables | Low | High | Verify AJ skills, grill-me, thermos sections post-merge |
| Browser auto-open in Kiro/Cursor headless | Medium | Low (non-blocking per upstream) | `html_output: false` default for CI; document platform limits |
| Generated variant hand-edits | Low | High (overwritten) | Enforce source-only rule; `make build` after merge |
| Cherry-pick vs merge breaks future sync | Low | High | Use `git merge upstream/master` per codebase-analysis recommendation |

---

## 4. Decisions Needed

### Critical (must decide before implementation)

1. **Merge strategy: full merge vs cherry-pick**
   - **Issue:** v2.1.8 sync cherry-picked substantive commit + empty marker; v2.2.1 has 4 commits (2 version bumps).
   - **Options:** (A) `git merge upstream/master` — one merge commit, full ancestry; (B) Cherry-pick `8d9e3b3` + `56f7e7b`, skip version commits, add marker
   - **Recommendation:** **A** — fewer manual steps, standard fork workflow, `docs/cursor-agent-support.md` documents merge pattern
   - **Rationale:** Version commits conflict anyway; merge preserves `git log upstream/master` continuity for next sync

2. **Fork version after merge**
   - **Issue:** Upstream is `2.2.1`; fork uses `X.Y.Z-fork.N`.
   - **Options:** (A) `2.2.1-fork.1`; (B) `2.2.1-fork.2` (continue from current fork.2 series); (C) Drop fork suffix
   - **Recommendation:** **A** — new upstream base resets fork patch counter (matches v2.1.8 → `2.1.8-fork.1` precedent)
   - **Rationale:** Clear signal: first fork release on v2.2.1 base

3. **Kiro agent inventory: 26 → 27**
   - **Issue:** Upstream adds `html-companion-writer`; fork adds 2 thermo-nuclear agents upstream lacks. Net: 25 upstream + 2 fork-only + 1 new = **27 JSON agents** after build.
   - **Options:** (A) Update all hardcoded `26` assertions to `27`; (B) Exclude html-companion-writer from Kiro build
   - **Recommendation:** **A** — agent is required by product-design orchestrator
   - **Rationale:** Tests `e2e-matrix.test.sh` L79–98, `build-completion.test.sh` L46–83, `build.sh` L780 will fail otherwise

4. **Semantic review scope for auto-merged orchestrators**
   - **Issue:** 14 files merge cleanly in git but both sides edited orchestrator logic since v2.1.8.
   - **Options:** (A) Full read of all 6 orchestrator SKILLs + `orchestrator-patterns.md`; (B) Diff-only review of conflict-free hunks; (C) Trust git auto-merge
   - **Recommendation:** **A** for `development`, `product-design`, `init`; **B** for migration/performance/research
   - **Rationale:** Development/product-design have largest upstream visibility additions overlapping fork CHAT GATE transforms

### Important (should decide)

1. **CHAT GATE threshold update strategy**
   - **Issue:** `validation.test.sh` rule 26: `dev_count >= 53 && total >= 200`. Upstream adds gates and MANDATORY GATE blocks.
   - **Options:** (A) Run build first, adjust thresholds to measured values; (B) Pre-compute from upstream source grep
   - **Default:** **A** — empirical after `make build-kiro`
   - **Rationale:** Fork transforms differ from upstream AskUserQuestion counts

2. **`html_output` default for fork users**
   - **Issue:** Upstream defaults `html_output: true` (dashboard + companions). Kiro Terminal cannot auto-open browser.
   - **Options:** (A) Keep upstream default `true`; (B) Fork init override scaffolds `html_output: false` for Kiro docs; (C) Platform build strips browser auto-open lines
   - **Default:** **A** with platform documentation noting graceful degradation (upstream already says "on failure just print the path")
   - **Rationale:** Parity with upstream; opt-out via config.yml

3. **Manifest version uniformity**
   - **Issue:** 6 version-bearing files at `2.1.8-fork.2`; marketplace lists only maister + maister-copilot (not cursor/kiro/kilo).
   - **Options:** (A) Bump all 6 to `2.2.1-fork.1`; (B) Also add cursor marketplace entry
   - **Default:** **A** — matches v2.1.8 sync pattern (6 manifests)
   - **Rationale:** Cursor/Kiro/Kilo versions live in `.cursor-plugin/plugin.json` and build output, not root marketplace

4. **`plugins/maister-copilot/CLAUDE.md` auto-merge**
   - **Issue:** merge-tree shows copilot CLAUDE.md auto-merges with visibility sections; copilot variant is generated.
   - **Options:** (A) Accept auto-merge then `make build-copilot` overwrites; (B) Resolve manually
   - **Default:** **A** — generated file; build is source of truth
   - **Rationale:** CLAUDE.md rule: never edit generated variants except via build

5. **Commit structure**
   - **Issue:** Prior sync left changes uncommitted per user request; verification report reviewed commit `2af3a99`.
   - **Options:** (A) Single merge commit + separate version-bump commit; (B) Squash merge content + marker
   - **Default:** **A** — mirrors standard fork workflow in root `CLAUDE.md` beta merge docs
   - **Rationale:** Merge commit documents upstream integration point

---

## 5. Integration Points

| Integration point | Current state | Required action | Owner step |
|-------------------|---------------|-----------------|------------|
| `plugins/maister/` (SOT) | v2.1.8 + fork skills/agents | Merge upstream; preserve 12 skills + 2 agents | Merge + review |
| `plugins/maister/skills/orchestrator-framework/assets/` | No `dashboard.html` | Accept upstream add | Auto |
| `plugins/maister/agents/html-companion-writer.md` | Absent | Accept upstream add | Auto |
| `plugins/maister/skills/*/SKILL.md` (6 orchestrators) | Fork gates + upstream visibility | Auto-merge + semantic review | Manual review |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | +186 lines upstream | Auto-merge; verify §7–9 + fork refs intact | Manual review |
| `plugins/maister/CLAUDE.md` | Fork AJ tables + upstream docs | Auto-merge; verify skill/command tables | Manual review |
| `plugins/maister/skills/init/SKILL.md` | Missing Copilot fix | Accept upstream `argument-hint` fix | Auto |
| `.claude-plugin/marketplace.json` + 2 plugin.json | `2.1.8-fork.2` | Conflict resolve → `2.2.1-fork.1` | Manual |
| `.cursor-plugin/marketplace.json` + cursor plugin.json | `2.1.8-fork.2` | Bump to `2.2.1-fork.1` (no merge conflict) | Manual |
| `platforms/cursor/build.sh` | Copies overrides; no HTML awareness | Rebuild; verify new assets copied to variant | `make build-cursor` |
| `platforms/kiro-cli/build.sh` | 26-agent assumption; CHAT GATE sed | Update agent count refs; rebuild; audit rule 26 | Post-merge fix |
| `platforms/kiro-cli/tests/*.sh` | Hardcoded 26 agents, gate thresholds | Update to 27 + measured thresholds | Post-merge fix |
| `platforms/kilo-cli/build.sh` | Mechanical copy + sed | Rebuild; grep for `html-companion-writer` propagation | `make build-kilo` |
| `Makefile` | `validate` × 4 platforms | Run full validate after build | CI/local |
| `docs/cursor-agent-support.md` | Documents merge workflow | Optional: note v2.2.1 sync complete | Follow-up |
| Prior sync work-log | Cherry-pick pattern at v2.1.8 | Superseded by merge strategy for v2.2.1 | Reference only |

### Patterns to follow

- **v2.1.8 sync:** `.maister/tasks/development/2026-06-14-upstream-sync-integration/implementation/work-log.md` — version scheme, `make build && make validate`, Cursor override pattern
- **Never edit generated:** `CLAUDE.md` (repo root) — `plugins/maister-copilot/`, `maister-cursor/`, `maister-kiro/` rebuilt only
- **Build pipeline:** `plugins/maister/` → `make build` → all four variants

---

## 6. Recommended Merge Approach (Step-by-Step)

### Phase A — Preparation

1. Ensure clean working tree on `master` (or dedicated `upstream-sync-v2.2.1` branch).
2. `git fetch upstream`
3. Confirm divergence: `git log --oneline 679958b..upstream/master` (expect 4 commits) and `git rev-list --left-right --count HEAD...upstream/master` (expect 53/4).
4. Optional: create backup branch `git branch backup/pre-v2.2.1-merge`.

### Phase B — Merge

5. `git merge upstream/master -m "Merge upstream v2.2.1 (operator visibility layer)"`
6. Resolve 3 manifest conflicts — set `"version": "2.2.1-fork.1"` in:
   - `.claude-plugin/marketplace.json`
   - `plugins/maister/.claude-plugin/plugin.json`
   - `plugins/maister-copilot/.claude-plugin/plugin.json`
7. Bump non-conflicting manifests to `2.2.1-fork.1`:
   - `.cursor-plugin/marketplace.json`
   - `plugins/maister-cursor/.cursor-plugin/plugin.json`

### Phase C — Semantic review (auto-merged files)

8. Review `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` — confirm §7–9 present; fork-specific references intact.
9. Review `plugins/maister/skills/development/SKILL.md` and `product-design/SKILL.md` — operator visibility blocks present; fork-specific content not regressed.
10. Review `plugins/maister/CLAUDE.md` — AJ skills (12), bundles A–D, grill-me, thermos, thermo-nuclear entries preserved.
11. Spot-check `init/SKILL.md` for Copilot `argument-hint` fix from `56f7e7b`.
12. Verify new files exist: `dashboard.html`, `html-report-style.md`, `agents/html-companion-writer.md`.

### Phase D — Platform rebuild and fork fixes

13. `make build` — regenerate all four platform variants.
14. Update Kiro hardcoded agent count `26` → `27` in:
    - `platforms/kiro-cli/tests/e2e-matrix.test.sh`
    - `platforms/kiro-cli/tests/build-completion.test.sh`
    - `platforms/kiro-cli/build.sh` (comment at ~L780)
15. Run `make build-kiro`; measure CHAT GATE counts; update `validation.test.sh` rule 26 thresholds if needed.
16. `make validate` — all four platforms must PASS.
17. Run Kiro extended tests: `platforms/kiro-cli/tests/build-core.test.sh`, `chat-gate.test.sh`, `validation.test.sh`.

### Phase E — Verification and release

18. Confirm 6 manifests uniformly at `2.2.1-fork.1`.
19. Grep generated variants for `html-companion-writer`, `dashboard.html` references.
20. Document in task `implementation/work-log.md` (decisions, files touched, test results).
21. Commit merge resolution + Kiro test fixes + rebuilt variants (awaiting user commit request per project rules).

### Alternative (not recommended): Cherry-pick path

If merge is blocked by policy: cherry-pick `8d9e3b3` (substance) and `56f7e7b` (init fix); skip `68e3720` and `945f60b` (version bumps); manually set `2.2.1-fork.1`; add empty marker commit `Mark sync with upstream/master at v2.2.1`. Higher manual effort, same semantic review and platform fixes required.

---

## 7. Impact Assessment on Fork-Specific Features

### Cursor (`platforms/cursor/`, `plugins/maister-cursor/`)

| Area | Impact | Action |
|------|--------|--------|
| **Build pipeline** | Low — mechanical copy from SOT | `make build-cursor`; new assets flow automatically |
| **quick-dev / quick-plan overrides** | None expected — overrides in `platforms/cursor/overrides/` untouched by upstream | Verify overrides still wired in `build.sh` step 12 |
| **AskQuestion gates** | Low — upstream uses `AskUserQuestion`; Cursor maps to `AskQuestion` | Existing transforms apply; new gates in orchestrators get transformed on build |
| **Dashboard browser open** | Medium — `open`/`xdg-open` in orchestrator SKILLs | Works in Cursor IDE environment; document for CLI-only users |
| **html-companion-writer** | Low — new agent propagates to `agents/` | Verify `maister-html-companion-writer` naming after `maister:` → prefix transform |
| **validate-cursor** | Low — structural checks | Run `make validate-cursor`; quick-plan integrity guard unchanged |

### Kiro CLI (`platforms/kiro-cli/`, `plugins/maister-kiro/`)

| Area | Impact | Action |
|------|--------|--------|
| **Agent JSON count** | **High — certain test failure** | 26 → 27 in tests and docs |
| **CHAT GATE transforms** | Medium — upstream adds MANDATORY GATE / AskUserQuestion in orchestrators | Kiro `build.sh` sed rules should catch new patterns; audit rule 26 counts |
| **html-companion-writer** | Medium — new subagent for product-design inline artifacts | Propagates via `generate-agent-json.sh`; add to trustedAgents if required |
| **Dashboard / browser open** | Medium — CHAT GATE transform may leave `open`/`xdg-open` bash calls | Accept graceful failure (print path); consider documenting `html_output: false` for Kiro |
| **Skill dir counts** | Low — upstream adds no new skills (only agent) | Rule 14/28 (67/42) likely unchanged |
| **Skill merges (commands→skills)** | Low — no new commands in upstream delta | 67 skill dirs stable |
| **Hooks / steering** | None | No upstream hook changes |

### Kilo CLI (`platforms/kilo-cli/`, `plugins/maister-kilo/`)

| Area | Impact | Action |
|------|--------|--------|
| **Build pipeline** | Low — `cp -r` + sed from SOT | `make build-kilo` |
| **CHAT GATE sed** | Medium — broader AskUserQuestion → CHAT GATE replacement | Rebuild; spot-check development orchestrator |
| **New agent + assets** | Low — mechanical propagation | Verify agent file and dashboard asset present in output |
| **validate-kilo** | Low | Run `make validate-kilo` |
| **Smoke test** | Low | Run `platforms/kilo-cli/smoke-cli.sh` if available |

### AJ Skills (12 fork-only skills)

| Area | Impact | Action |
|------|--------|--------|
| **Skill files** | **None** — upstream did not touch fork-only skill directories | No action |
| **CLAUDE.md registration** | Medium — auto-merge may affect tables | Verify all 12 skills + commands still documented |
| **Orchestrator soft suggestions** | Low — upstream orchestrator edits don't remove AJ suggestion blocks | Spot-check development/product-design for preserved suggestions |
| **Bundles A–D** | Low | Confirm chain documentation in CLAUDE.md |
| **Kiro skill dir count** | None — fork skills already counted in 67 total | No change |

### Thermo-nuclear / Thermos (fork-only review skills)

| Area | Impact | Action |
|------|--------|--------|
| **Skill + agent files** | **None** — fork-only paths | No action |
| **CLAUDE.md entries** | Medium — same auto-merge risk as AJ skills | Verify thermo-nuclear + thermos sections |
| **Upstream agent updates** | Low — 13 upstream agents got TL;DR contract; thermo-nuclear agents did not exist upstream | No merge conflict on agent bodies |

### Copilot CLI (`platforms/copilot-cli/`, `plugins/maister-copilot/`)

| Area | Impact | Action |
|------|--------|--------|
| **Init skill fix** | **Positive** — `56f7e7b` fixes argument-hint quoting | Included in merge |
| **Generated CLAUDE.md** | Medium — auto-merge adds visibility docs | `make build-copilot` overwrites |
| **validate-copilot** | Low | Run `make validate-copilot` |

---

## Risk Assessment Summary

- **Mechanical merge risk:** Low (3 conflicts)
- **Semantic integration risk:** Medium (orchestrator visibility layer + fork gate transforms)
- **Platform regression risk:** Medium-high (Kiro tests certain to fail until updated)
- **Fork feature loss risk:** Low (disjoint paths for AJ skills, platforms)
- **Future sync risk:** Low if merge strategy used (vs cherry-pick-only)

---

## References

- Codebase analysis: `analysis/codebase-analysis.md`
- Prior sync work-log: `.maister/tasks/development/2026-06-14-upstream-sync-integration/implementation/work-log.md`
- Prior sync verification: `.maister/tasks/development/2026-06-14-upstream-sync-integration/verification/verification-report.md`
- Fork merge strategy: `docs/cursor-agent-support.md`
- Build rules: root `CLAUDE.md` (never edit generated variants)
- Upstream delta: `git diff 679958b..upstream/master` (51 files, +2975/−123 lines)

---

```yaml
task_characteristics:
  has_reproducible_defect: false
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: false
  ui_heavy: false

risk_level: medium-high

decisions_needed:
  critical:
    - id: merge-strategy
      question: "Use git merge upstream/master vs cherry-pick substantive commits?"
      recommendation: "git merge upstream/master"
      rationale: "Preserves bidirectional ancestry; documented fork workflow; 4 commits with 2 version-only"
    - id: fork-version
      question: "What fork version string after integrating v2.2.1?"
      recommendation: "2.2.1-fork.1"
      rationale: "Matches v2.1.8-fork.1 precedent; resets fork patch on new upstream base"
    - id: kiro-agent-count
      question: "Update Kiro hardcoded 26-agent assertions to 27?"
      recommendation: "Yes — include html-companion-writer"
      rationale: "product-design orchestrator requires agent; tests will fail otherwise"
    - id: semantic-review-scope
      question: "How much manual review of auto-merged orchestrator files?"
      recommendation: "Full review of development, product-design, init, orchestrator-patterns; diff review for others"
      rationale: "Largest overlapping edits since v2.1.8; visibility layer changes gate behavior"
  important:
    - id: chat-gate-thresholds
      question: "Update Kiro rule 26 CHAT GATE thresholds before or after build?"
      recommendation: "After make build-kiro — measure then adjust"
      default: "empirical post-build"
    - id: html-output-default
      question: "Keep upstream html_output default true for fork?"
      recommendation: "Yes — document Kiro/Cursor CLI graceful degradation"
      default: true
    - id: manifest-uniformity
      question: "Bump all 6 version manifests to 2.2.1-fork.1?"
      recommendation: "Yes"
      default: "6 manifests"
    - id: copilot-claude-automerge
      question: "Manually resolve maister-copilot/CLAUDE.md or rely on make build?"
      recommendation: "Rely on make build-copilot"
      default: "rebuild overwrites"
    - id: commit-structure
      question: "Single merge commit vs squash?"
      recommendation: "Merge commit + optional separate version commit"
      default: "standard fork workflow"
```
