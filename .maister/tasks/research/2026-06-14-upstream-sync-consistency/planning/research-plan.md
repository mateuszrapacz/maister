# Research Plan: Upstream Fork Sync Consistency

## Research Overview

### Research Question

Are upstream SkillPanel/maister v2.1.8 changes (commits `fb5a8f3`, `679958b`) consistent with fork-specific changes in mateuszrapacz/maister (34 commits since `1fc5d3c`)? What cherry-pick integration strategy is safe, and which conflicts require manual resolution?

### Research Type

**Mixed** — technical codebase diff + integration strategy + versioning policy.

### Scope

| Boundary | Details |
|----------|---------|
| **Included** | Upstream commits `fb5a8f3` (quick-* rework, Maister rebrand, docs templates), `679958b` (version bump); fork divergences (Cursor/Kiro/Kilo platforms, Wave 1 AJ skills, multi-platform build); versioning `2.1.8-10`; cherry-pick feasibility per change area; quick-dev/quick-plan command→skill refactor vs Kiro shortcut skills and Cursor variants |
| **Excluded** | Implementing the integration; upstream beta branch; non-maister marketplace distribution |
| **Constraints** | Cherry-pick only (no blind merge); edit source in `plugins/maister/` + `platforms/*` only (never generated variants directly); preserve fork-only features (AJ skills, grill-me, thermos, platform variants) |

### Sub-Questions

1. **Upstream delta**: What exactly changed in `fb5a8f3` and `679958b` at file and semantic level?
2. **Fork delta**: What 34 commits added/modified that upstream lacks?
3. **Overlap**: Which source files were touched on both sides since `1fc5d3c`?
4. **Quick workflows**: Is upstream's command→skill migration compatible with fork command files and platform overrides?
5. **Platform build**: Do build scripts (`make`, `platforms/*/build.sh`) assume command-based or skill-based quick-* wiring?
6. **Versioning**: How should manifests reflect `2.1.8-10` without breaking fork marketplace layout?
7. **Cherry-pick order**: Which commit first (`fb5a8f3` then `679958b`)? Dry-run conflict prediction?
8. **Go/no-go**: Can development proceed with high confidence after documented adaptations?

---

## Methodology

### Primary Approach

**Three-way comparative git analysis** combined with **platform build impact assessment**:

1. Establish common ancestor `1fc5d3c` (v2.1.7 bump).
2. Diff upstream `1fc5d3c..upstream/master` (2 commits, ~26 files).
3. Diff fork `1fc5d3c..HEAD` (34 commits, ~501 files).
4. Compute intersection of changed paths (especially under `plugins/maister/`).
5. Simulate cherry-pick with `git cherry-pick --no-commit` (research only — do not commit).
6. Map upstream semantic changes to fork platform transforms and generated output expectations.
7. Produce compatibility matrix and manifest update plan.

### Fallback Strategies

- If cherry-pick dry-run is too noisy on generated files: restrict analysis to **source-of-truth paths** (`plugins/maister/`, `platforms/`, manifests, `Makefile`, `docs/`).
- If command/skill naming ambiguity remains: read upstream commit messages and full diffs for `fb5a8f3`; compare fork `platforms/*/overrides/commands/quick-plan.md` and Kiro shortcut skill generation.
- If versioning policy unclear: inspect upstream `679958b` manifest diffs and fork's intermediate `1707a26` (fork also bumped to 2.1.8) vs current `2.2.0`.

### Analysis Framework

#### 1. Change-Area Taxonomy

Classify every affected path into one area:

| Area ID | Description | Cherry-pick risk |
|---------|-------------|------------------|
| `quick-workflows` | quick-dev, quick-plan, quick-bugfix command/skill refactor | **High** — upstream deletes commands, adds skills; fork keeps commands + platform overrides |
| `rebrand-docs` | Maister rename, docs-manager templates, research-methodologies | **Medium** — may overlap fork doc additions |
| `init-standards` | init skill, default standards/docs awareness | **Medium** — fork modified init Phase 3 gate |
| `versioning-manifests` | marketplace.json, plugin.json, version strings | **High** — fork at 2.2.0 with extra plugins |
| `platform-build` | Makefile, platforms/cursor|kiro|kilo|copilot-cli build.sh | **Medium** — fork-only; must rebuild after source merge |
| `fork-only-skills` | AJ skills, grill-me, thermos, problem-classifier, etc. | **Low conflict / preserve** |
| `generated-variants` | maister-copilot/cursor/kiro output | **Out of scope for direct edit** — validate via `make build` |

#### 2. Compatibility Matrix (per area)

For each area, assign one status with evidence:

| Status | Meaning |
|--------|---------|
| **Compatible** | Cherry-pick applies cleanly; no fork adaptation |
| **Needs adaptation** | Cherry-pick applies with manual merge or follow-up edits in source |
| **Conflict** | Overlapping edits; requires designed resolution preserving fork features |
| **N/A** | Upstream-only or fork-only; no cherry-pick action |

#### 3. Cherry-Pick Feasibility Rubric

Score each upstream commit:

- **Clean apply**: `git cherry-pick --no-commit` succeeds on source paths
- **Conflict files**: list from `git status` / conflict markers
- **Semantic conflict**: both sides changed behavior without git conflict (e.g., command deleted upstream, still present in fork)
- **Platform ripple**: change requires updates to `platforms/*/overrides/` or build steps
- **Rebuild requirement**: `make build` + `make validate` must pass post-integration

#### 4. Version Scheme Analysis (`2.1.8-10`)

Document required manifest updates:

- `.claude-plugin/marketplace.json` — name, version, plugin list (fork has maister-copilot only in marketplace; Cursor/Kiro may be separate install paths)
- `plugins/maister/.claude-plugin/plugin.json`
- `plugins/maister-copilot/.claude-plugin/plugin.json`
- Fork-only: whether Cursor/Kiro/Kilo variants carry independent version fields
- Consistency rule: upstream base `2.1.8` + fork postfix `-10` → `2.1.8-10`

---

## Research Phases

### Phase 1: Baseline & Commit Inventory

**Goal**: Establish authoritative commit graph and divergence metrics.

**Actions**:
1. Verify remotes: `origin` (fork), `upstream` (SkillPanel/maister).
2. Confirm divergence point: `1fc5d3c` (v2.1.7).
3. List upstream commits: `git log --oneline 1fc5d3c..upstream/master`.
4. List fork commits: `git log --oneline 1fc5d3c..HEAD` (34 commits).
5. Record fork intermediate version commit `1707a26` (Bump version to 2.1.8) — parallel to upstream `679958b`.
6. Capture `--stat` summaries for both sides.

**Outputs**: Commit inventory table, divergence timeline note.

---

### Phase 2: Upstream Change Decomposition (`fb5a8f3`, `679958b`)

**Goal**: Full understanding of upstream intent and file scope.

**Actions**:
1. `git show fb5a8f3 --stat` and full diff for source paths only.
2. Categorize changes: quick-* refactor, rebrand (Maister), docs templates, hooks, copilot-cli-issues removal.
3. `git show 679958b` — version-only diff on manifests.
4. Extract upstream quick-dev/quick-plan skill definitions (new) vs deleted command files.
5. Note upstream quick-bugfix skill simplification.

**Outputs**: Upstream change catalog by area ID; semantic summary of command→skill migration.

---

### Phase 3: Fork Divergence Mapping

**Goal**: Document fork-only features that must survive integration.

**Actions**:
1. Group 34 commits by theme: Cursor variant, Kiro CLI, Kilo CLI, AJ Wave 1 skills, grill-me/thermos, init fixes, build pipeline.
2. Map fork changes under `plugins/maister/` vs `platforms/` vs generated `plugins/maister-*`.
3. Identify overlapping source files already known: `plugin.json`, `CLAUDE.md`, `skills/init/SKILL.md`, `skills/quick-bugfix/SKILL.md`.
4. Document fork quick-* state: commands exist at `plugins/maister/commands/quick-dev.md`, `quick-plan.md`; no source `skills/quick-dev|quick-plan` (upstream adds these).

**Outputs**: Fork feature inventory; preserve-list for integration.

---

### Phase 4: Overlap & Conflict Detection

**Goal**: Predict cherry-pick conflicts before development phase.

**Actions**:
1. `comm -12` on changed file lists: `plugins/maister/` upstream vs fork.
2. Per overlapping file: side-by-side diff `git diff 1fc5d3c..upstream/master -- FILE` vs `git diff 1fc5d3c..HEAD -- FILE`.
3. Dry-run cherry-pick on a temporary branch (research workspace only):
   - `git cherry-pick --no-commit fb5a8f3`
   - Record conflicts; `git cherry-pick --abort` or reset
4. Detect **semantic conflicts** (no git conflict but incompatible design):
   - Upstream removes commands; fork + platforms reference commands
   - Upstream adds skills; fork build may not copy them to Cursor/Kiro yet
5. List all files requiring manual merge.

**Outputs**: Conflict file list; semantic conflict list; recommended resolution strategy per file.

---

### Phase 5: Platform Build & Quick-Workflow Consistency

**Goal**: Assess whether upstream skill-based quick-* aligns with fork multi-platform model.

**Actions**:
1. Read `Makefile` validate rules for quick-plan command expectations (Cursor uses `maister-` prefix).
2. Read `platforms/cursor/build.sh`, `platforms/kiro-cli/build.sh`, `platforms/copilot-cli/build.sh` — how commands/skills are transformed.
3. Read platform overrides:
   - `platforms/cursor/overrides/commands/quick-plan.md`
   - `platforms/kiro-cli/overrides/commands/quick-plan.md`
   - `platforms/kiro-cli/overrides/skills/quick-bugfix/SKILL.md`
4. Compare generated variants: `plugins/maister-cursor/commands/quick-plan.md`, `plugins/maister-kiro/skills/quick-plan/SKILL.md`.
5. Determine integration pattern: adopt upstream skills in source + update platform overrides vs keep fork commands + port upstream skill content into overrides.

**Outputs**: Platform impact assessment; recommended quick-* integration pattern.

---

### Phase 6: Versioning & Manifest Plan

**Goal**: Define exact manifest edits for `2.1.8-10`.

**Actions**:
1. Compare manifest files at `1fc5d3c`, upstream `679958b`, fork `HEAD`.
2. Document marketplace plugin list differences (fork marketplace may omit maister-cursor/kiro).
3. Specify version strings and description updates for each manifest.
4. Note whether copilot variant version must track source maister version.
5. Define post-cherry-pick sequence: edit source manifests → `make build` → validate.

**Outputs**: Manifest update checklist for `2.1.8-10`.

---

### Phase 7: Synthesis & Recommendation

**Goal**: Answer research question with evidence and confidence.

**Actions**:
1. Complete per-area compatibility matrix.
2. Consolidate manual-merge file list.
3. Propose cherry-pick order and adaptation steps (no implementation).
4. Run `make validate` feasibility assessment (document expected failures pre-fix).
5. Issue **GO / CONDITIONAL GO / NO-GO** with confidence (high/medium/low) and prerequisites for development phase.

**Outputs**: `analysis/research-report.md` (synthesizer phase); go/no-go recommendation.

---

## Gathering Strategy

### Instances: 5 (max 8)

| # | Category ID | Focus Area | Tools | Output Prefix |
|---|-------------|------------|-------|---------------|
| 1 | `upstream-diff` | Upstream commits `fb5a8f3` + `679958b`: file lists, diffs, semantic intent, rebrand/docs changes | Shell (git), Read, Grep | `upstream-diff` |
| 2 | `fork-divergence` | 34 fork commits since `1fc5d3c`: thematic grouping, preserve-list, overlapping paths in `plugins/maister/` | Shell (git), Read, Grep | `fork-divergence` |
| 3 | `platform-build` | Makefile, `platforms/*/build.sh`, smoke-install, validate rules, generated variant expectations | Read, Grep, Shell | `platform-build` |
| 4 | `quick-workflows` | quick-dev/quick-plan/quick-bugfix: upstream skill migration vs fork commands + Cursor/Kiro overrides + generated outputs | Read, Grep, Shell (git diff) | `quick-workflows` |
| 5 | `versioning-manifests` | Manifest version history, `2.1.8-10` scheme, marketplace plugin list, fork `1707a26` vs upstream `679958b` | Read, Shell (git), Grep | `versioning-manifests` |

### Rationale

Upstream changes are small (2 commits) but semantically heavy (command→skill refactor). Fork changes are large (34 commits, multi-platform). Splitting gatherers by **upstream delta**, **fork delta**, **platform pipeline**, **quick-* consistency**, and **versioning** avoids overlap while covering the brief's primary concern: upstream flow changes vs fork platform/skill extensions. Cherry-pick dry-run and conflict detection span gatherers 1, 2, and 4; synthesizer merges into compatibility matrix.

### Expected Finding Files

```
analysis/findings/upstream-diff-*.md
analysis/findings/fork-divergence-*.md
analysis/findings/platform-build-*.md
analysis/findings/quick-workflows-*.md
analysis/findings/versioning-manifests-*.md
```

---

## Success Criteria

From research brief — all must be satisfied:

1. **Per-area compatibility matrix** — every area ID rated compatible / needs adaptation / conflict with citations.
2. **Explicit manual-merge file list** — paths expected to conflict on cherry-pick or require designed merge.
3. **Version manifest update plan** — file-by-file checklist for `2.1.8-10`.
4. **Go/no-go recommendation** — for development phase with confidence level and prerequisites.

Additional quality gates:

- Cherry-pick order documented (`fb5a8f3` before `679958b`, with rationale).
- Fork preserve-list confirmed (AJ skills, grill-me, thermos, Kiro/Cursor/Kilo platforms).
- Platform rebuild/validate path documented (`make build`, `make validate`).
- No recommendation to edit generated `plugins/maister-copilot|cursor|kiro/` directly.

---

## Expected Outputs

| Artifact | Location | Owner Phase |
|----------|----------|-------------|
| Gathering findings (5 categories) | `analysis/findings/[prefix]-*.md` | Information gathering |
| Compatibility matrix | `analysis/compatibility-matrix.md` | Synthesis |
| Manual merge file list | `analysis/cherry-pick-conflicts.md` | Phase 4 |
| Version update plan | `analysis/version-plan-2.1.8-10.md` | Phase 6 |
| Research report | `analysis/research-report.md` | Synthesizer |
| Go/no-go recommendation | `analysis/research-report.md` § Recommendation | Synthesizer |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Fork already contains partial 2.1.8 bump (`1707a26`) diverging from upstream `679958b` | Compare both version commits; treat `679958b` as content authority for upstream manifest text |
| Semantic conflict invisible to git | Explicit quick-workflows gatherer; compare command vs skill invocation paths |
| Generated file noise in diffs | Restrict analysis to source + platforms; validate via build |
| Kiro shortcut skills duplicate quick-plan naming | Map Kiro `/quick-plan` skill to upstream skill content vs `@quick-plan` prompt history |
