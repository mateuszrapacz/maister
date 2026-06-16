# Research Sources: Upstream Fork Sync Consistency

Manifest of all data sources for information gatherers. Repo root: `/Users/mrapacz/Workspace/maister`.

---

## Git Remotes & Commit References

### Remotes (verified)

| Remote | URL | Role |
|--------|-----|------|
| `origin` | `git@github.com:mateuszrapacz/maister.git` | Fork (local HEAD) |
| `upstream` | `https://github.com/SkillPanel/maister.git` | Upstream (already fetched) |

### Anchor Commits

| Ref | SHA | Description |
|-----|-----|-------------|
| Divergence base | `1fc5d3c` | Bump version to 2.1.7 — last common ancestor |
| Upstream commit 1 | `fb5a8f3` | Rework quick-* workflows, Maister rebrand, docs templates |
| Upstream commit 2 | `679958b` | Bump version to 2.1.8 |
| Upstream tip | `upstream/master` | SkillPanel/maister master @ v2.1.8 |
| Fork tip | `HEAD` | mateuszrapacz/maister @ v2.2.0 |
| Fork version note | `1707a26` | Fork-local "Bump version to 2.1.8" (parallel to upstream) |
| Fork Wave 1 | `607ed5b` | Port Wave 1 AJ skills with quick-* commands (v2.2.0) |
| Fork Cursor | `c726313` | Add Cursor Agent variant (maister-cursor) |

### Git Commands to Run

```bash
# Divergence metrics
git rev-list --count 1fc5d3c..HEAD
git rev-list --count 1fc5d3c..upstream/master

# Commit lists
git log --oneline 1fc5d3c..upstream/master
git log --oneline 1fc5d3c..HEAD

# File-level diffs
git diff --stat 1fc5d3c..upstream/master
git diff --stat 1fc5d3c..HEAD
git diff --name-only 1fc5d3c..upstream/master -- plugins/maister/
git diff --name-only 1fc5d3c..HEAD -- plugins/maister/

# Overlap (both sides changed same path)
comm -12 \
  <(git diff --name-only 1fc5d3c..upstream/master -- plugins/maister/ | sort) \
  <(git diff --name-only 1fc5d3c..HEAD -- plugins/maister/ | sort)

# Per-commit inspection
git show fb5a8f3 --stat
git show fb5a8f3 -- plugins/maister/
git show 679958b

# Cherry-pick dry-run (research branch only — do not commit)
git cherry-pick --no-commit fb5a8f3
git status
git cherry-pick --abort   # or git reset --hard after abort

# Upstream file at tip (when fork lacks file)
git show upstream/master:plugins/maister/skills/quick-dev/SKILL.md
git show upstream/master:plugins/maister/skills/quick-plan/SKILL.md
```

---

## GitHub API & Web Sources

### GitHub CLI (`gh`)

```bash
# Upstream repo metadata
gh api repos/SkillPanel/maister --jq '{default_branch, pushed_at}'
gh api repos/SkillPanel/maister/commits/fb5a8f3 --jq '{sha, commit: .commit.message}'
gh api repos/SkillPanel/maister/commits/679958b --jq '{sha, commit: .commit.message}'

# Compare API (optional cross-check)
gh api repos/SkillPanel/maister/compare/1fc5d3c...679958b --jq '.files[].filename'

# Fork repo
gh api repos/mateuszrapacz/maister --jq '{default_branch, pushed_at}'
gh api repos/mateuszrapacz/maister/compare/1fc5d3c...HEAD --jq '.total_commits'
```

### Web URLs

| Resource | URL |
|----------|-----|
| Upstream compare | https://github.com/SkillPanel/maister/compare/1fc5d3c...679958b |
| Upstream commit fb5a8f3 | https://github.com/SkillPanel/maister/commit/fb5a8f3 |
| Upstream commit 679958b | https://github.com/SkillPanel/maister/commit/679958b |
| Fork compare | https://github.com/mateuszrapacz/maister/compare/1fc5d3c...master |

---

## Codebase Sources — Upstream Diff (`upstream-diff`)

### Upstream-Changed Files (since `1fc5d3c`, full tree)

From `git diff --name-only 1fc5d3c..upstream/master`:

| Path | Change type | Area |
|------|-------------|------|
| `.claude-plugin/marketplace.json` | version/description | versioning-manifests |
| `copilot-cli-issues.md` | deleted | docs |
| `docs/commands.md` | modified | rebrand-docs |
| `plugins/maister/.claude-plugin/plugin.json` | version | versioning-manifests |
| `plugins/maister/CLAUDE.md` | rebrand + quick command docs | rebrand-docs, quick-workflows |
| `plugins/maister/commands/quick-dev.md` | **deleted** | quick-workflows |
| `plugins/maister/commands/quick-plan.md` | **deleted** | quick-workflows |
| `plugins/maister/hooks/hooks.json` | minor | config |
| `plugins/maister/skills/docs-manager/references/claude-md-template.md` | Maister templates | rebrand-docs |
| `plugins/maister/skills/docs-manager/references/index-md-template.md` | Maister templates | rebrand-docs |
| `plugins/maister/skills/init/SKILL.md` | standards awareness | init-standards |
| `plugins/maister/skills/quick-bugfix/SKILL.md` | simplified | quick-workflows |
| `plugins/maister/skills/quick-dev/SKILL.md` | **added** | quick-workflows |
| `plugins/maister/skills/quick-plan/SKILL.md` | **added** | quick-workflows |
| `plugins/maister/skills/research/references/research-methodologies.md` | rebrand | rebrand-docs |
| `plugins/maister-copilot/**` | mirror of maister changes | generated (via build) |

### Upstream-Only Read Targets

```bash
git show upstream/master:plugins/maister/skills/quick-dev/SKILL.md
git show upstream/master:plugins/maister/skills/quick-plan/SKILL.md
git show upstream/master:plugins/maister/skills/quick-bugfix/SKILL.md
git show upstream/master:plugins/maister/CLAUDE.md
```

---

## Codebase Sources — Fork Divergence (`fork-divergence`)

### Overlapping Source Files (both sides modified `plugins/maister/`)

Verified intersection since `1fc5d3c`:

- `plugins/maister/.claude-plugin/plugin.json`
- `plugins/maister/CLAUDE.md`
- `plugins/maister/skills/init/SKILL.md`

Also changed on both sides (verify during gather):

- `plugins/maister/skills/quick-bugfix/SKILL.md`

### Fork-Only Source Additions (preserve)

**Commands**

- `plugins/maister/commands/quick-problem-classifier.md`
- `plugins/maister/commands/quick-requirements-critic.md`
- `plugins/maister/commands/quick-transcript-critic.md`
- `plugins/maister/commands/quick-dev.md` *(still present — upstream deleted)*
- `plugins/maister/commands/quick-plan.md` *(still present — upstream deleted)*

**Skills (Wave 1 AJ + thermos)**

- `plugins/maister/skills/grill-me/SKILL.md`
- `plugins/maister/skills/thermos/SKILL.md`
- `plugins/maister/skills/thermo-nuclear-review/SKILL.md`
- `plugins/maister/skills/thermo-nuclear-code-quality-review/SKILL.md`
- `plugins/maister/skills/problem-classifier/SKILL.md`
- `plugins/maister/skills/requirements-critic/SKILL.md`
- `plugins/maister/skills/transcript-critic/SKILL.md`

**Agents**

- `plugins/maister/agents/thermo-nuclear-review-subagent.md`
- `plugins/maister/agents/thermo-nuclear-code-quality-review-subagent.md`

### Fork-Only Directories (generated — read for impact, do not edit)

- `plugins/maister-cursor/` — Cursor Agent variant (~117 files)
- `plugins/maister-kiro/` — Kiro CLI variant (agents, skills, steering, hooks)
- `plugins/maister-copilot/` — Copilot CLI variant (regenerated)

### Fork Commit Themes (grep / log)

```bash
git log --oneline 1fc5d3c..HEAD -- platforms/
git log --oneline 1fc5d3c..HEAD -- plugins/maister/skills/
git log --oneline 1fc5d3c..HEAD --grep='kiro\|cursor\|kilo\|AJ\|thermo\|grill'
```

---

## Codebase Sources — Platform Build (`platform-build`)

### Build Orchestration

| File | Purpose |
|------|---------|
| `Makefile` | `build`, `build-copilot`, `build-cursor`, `build-kiro`, `validate-*`, `clean-*` |
| `platforms/copilot-cli/build.sh` | Copilot variant generation |
| `platforms/cursor/build.sh` | Cursor variant generation |
| `platforms/kiro-cli/build.sh` | Kiro variant + shortcut skills (step 20) |
| `platforms/kilo-cli/build.sh` | Kilo CLI variant |
| `platforms/cursor/smoke-install.sh` | Cursor install verification |
| `platforms/kiro-cli/smoke-install.sh` | Kiro install + aliases |
| `platforms/kilo-cli/smoke-install.sh` | Kilo smoke install |

### Platform Tests

| Path | Purpose |
|------|---------|
| `platforms/kiro-cli/tests/*.test.sh` | Kiro build/validation matrix |
| `platforms/kiro-cli/tests/e2e-matrix.test.sh` | E2E coverage |
| `platforms/kiro-cli/tests/build-core.test.sh` | Core build steps |

### Platform Transforms & Templates

| Path | Purpose |
|------|---------|
| `platforms/cursor/transforms/task-to-todo.md` | Task→TodoWrite transform |
| `platforms/cursor/patches/orchestrator-patterns-todowrite.md` | Orchestrator patch |
| `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` | Kiro AskUserQuestion transform |
| `platforms/cursor/templates/agents-md-template.md` | AGENTS.md generation |
| `platforms/kiro-cli/templates/steering-maister-docs.md` | Kiro steering |
| `platforms/cursor/rules/maister-docs.mdc` | Cursor rules |

### Validate Rules (Makefile excerpts to read)

- Cursor: expects `plugins/maister-cursor/commands/quick-plan.md` with `name: maister-` prefix
- Copilot: no `maister:` prefixes in variant
- Kiro: agent JSON, hooks, skill resources

---

## Codebase Sources — Quick Workflows (`quick-workflows`)

### Source of Truth (fork current state)

| Path | Fork state | Upstream state |
|------|------------|----------------|
| `plugins/maister/commands/quick-dev.md` | **exists** | deleted in `fb5a8f3` |
| `plugins/maister/commands/quick-plan.md` | **exists** | deleted in `fb5a8f3` |
| `plugins/maister/skills/quick-dev/SKILL.md` | **missing** | added in `fb5a8f3` |
| `plugins/maister/skills/quick-plan/SKILL.md` | **missing** | added in `fb5a8f3` |
| `plugins/maister/skills/quick-bugfix/SKILL.md` | modified (fork) | simplified (upstream) |

### Platform Overrides

| Path | Platform |
|------|----------|
| `platforms/cursor/overrides/commands/quick-plan.md` | Cursor command override |
| `platforms/kiro-cli/overrides/commands/quick-plan.md` | Kiro command override |
| `platforms/cursor/overrides/skills/quick-bugfix/SKILL.md` | Cursor skill override |
| `platforms/kiro-cli/overrides/skills/quick-bugfix/SKILL.md` | Kiro skill override |

### Generated Quick-* Outputs (post-build reference)

| Path | Platform |
|------|----------|
| `plugins/maister-cursor/commands/quick-plan.md` | Cursor |
| `plugins/maister-cursor/skills/quick-bugfix/SKILL.md` | Cursor |
| `plugins/maister-kiro/skills/quick-dev/SKILL.md` | Kiro shortcut skill |
| `plugins/maister-kiro/skills/quick-plan/SKILL.md` | Kiro shortcut skill |
| `plugins/maister-kiro/skills/quick-bugfix/SKILL.md` | Kiro |
| `plugins/maister-copilot/commands/quick-plan.md` | Copilot (check if removed upstream) |
| `plugins/maister-copilot/skills/quick-dev/SKILL.md` | Copilot (upstream adds) |
| `plugins/maister-copilot/skills/quick-plan/SKILL.md` | Copilot (upstream adds) |

### Related Documentation

| Path | Notes |
|------|-------|
| `docs/commands.md` | User-facing command list (upstream modified) |
| `plugins/maister/CLAUDE.md` | Quick Commands section |
| `plugins/maister-cursor/rules/maister-workflows.mdc` | Cursor workflow rules |
| `plugins/maister-kiro/steering/maister-workflows.md` | Kiro @prompt → slash mapping |
| `platforms/kiro-cli/README.md` | Kiro platform docs |

### Grep Patterns

```bash
rg -l 'quick-dev|quick-plan|quick-bugfix' plugins/maister/ platforms/
rg 'maister:quick-dev|maister:quick-plan' plugins/ upstream/master
```

---

## Codebase Sources — Versioning & Manifests (`versioning-manifests`)

### Manifest Files (must compare at 3 refs: `1fc5d3c`, `upstream/master`, `HEAD`)

| File | Current fork (`HEAD`) | Notes |
|------|----------------------|-------|
| `.claude-plugin/marketplace.json` | version `2.2.0`, plugins: maister, maister-copilot | Upstream @2.1.8 same plugin list |
| `plugins/maister/.claude-plugin/plugin.json` | version `2.2.0` | Source plugin |
| `plugins/maister-copilot/.claude-plugin/plugin.json` | version `2.2.0` | Generated copilot manifest |

### Manifest Files (fork-only variants — version tracking)

| File | Notes |
|------|-------|
| `plugins/maister-cursor/.claude-plugin/plugin.json` | If present — Cursor marketplace |
| `plugins/maister-kiro/.claude-plugin/plugin.json` | If present — Kiro plugin |

### Git History for Versions

```bash
git show 1fc5d3c:.claude-plugin/marketplace.json
git show upstream/master:.claude-plugin/marketplace.json
git show HEAD:.claude-plugin/marketplace.json
git show 1707a26:.claude-plugin/marketplace.json   # fork parallel 2.1.8 bump
git show 679958b:.claude-plugin/marketplace.json   # upstream 2.1.8 bump
git show 607ed5b:.claude-plugin/marketplace.json   # fork 2.2.0 bump
```

### Target Version Scheme

- **Approved scheme**: `2.1.8-10` (upstream semver base + fork postfix)
- Document all locations requiring synchronized version string after integration

---

## Documentation Sources

### Project Documentation (task context)

| Path | Purpose |
|------|---------|
| `.maister/docs/INDEX.md` | Project standards index |
| `.maister/docs/project/tech-stack.md` | Tech stack (orchestrator state reference) |
| `.maister/docs/standards/global/conventions.md` | Conventions |

### Task Artifacts

| Path | Purpose |
|------|---------|
| `.maister/tasks/research/2026-06-14-upstream-sync-consistency/planning/research-brief.md` | Research question & constraints |
| `.maister/tasks/research/2026-06-14-upstream-sync-consistency/planning/research-plan.md` | This plan |
| `.maister/tasks/research/2026-06-14-upstream-sync-consistency/orchestrator-state.yml` | Task metadata |

### Repository Documentation

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Repo overview, beta workflow, never edit generated files rule |
| `README.md` | User-facing plugin docs |
| `plugins/maister/CLAUDE.md` | Plugin internals, commands, skills catalog |
| `AGENTS.md` | Agent instructions |

### Upstream Docs Templates (changed in fb5a8f3)

| Path | Purpose |
|------|---------|
| `plugins/maister/skills/docs-manager/references/claude-md-template.md` | CLAUDE.md template |
| `plugins/maister/skills/docs-manager/references/index-md-template.md` | INDEX.md template |
| `plugins/maister/skills/research/references/research-methodologies.md` | Research methodology refs |

---

## Configuration Sources

| Path | Purpose |
|------|---------|
| `Makefile` | Build/validate/clean targets |
| `plugins/maister/hooks/hooks.json` | Hook config (minor upstream change) |
| `platforms/cursor/hooks/hooks.json` | Cursor hooks |
| `platforms/kiro-cli/agent-tools.json` | Kiro agent tool allowlist |
| `platforms/kiro-cli/hooks/rtk-rewrite.sh` | RTK token optimization hook |
| `.claude-plugin/marketplace.json` | Marketplace manifest schema |

---

## External Sources (Reference Only)

| Resource | URL | Use |
|----------|-----|-----|
| Claude Code Plugins | https://code.claude.com/docs/en/plugins | Plugin structure, commands vs skills |
| Claude Code Skills | https://code.claude.com/docs/en/skills | Skill invocation model |
| Marketplace schema | https://anthropic.com/claude-code/marketplace.schema.json | Manifest validation |

---

## Source → Gatherer Mapping

| Category ID | Primary Sources |
|-------------|-----------------|
| `upstream-diff` | Git refs `fb5a8f3`, `679958b`; upstream-changed file list; `git show upstream/master:...` |
| `fork-divergence` | `git log 1fc5d3c..HEAD`; fork-only paths; overlap comm -12 |
| `platform-build` | `Makefile`, `platforms/*/build.sh`, tests, smoke-install scripts |
| `quick-workflows` | Command/skill paths table above; platform overrides; generated quick-* outputs |
| `versioning-manifests` | Manifest files at three refs; `1707a26` vs `679958b`; target `2.1.8-10` |

---

## Files Explicitly Out of Scope for Direct Edit

Per research constraints — analyze impact only, edit in development phase via source + build:

- `plugins/maister-copilot/**` (except reading generated output)
- `plugins/maister-cursor/**`
- `plugins/maister-kiro/**`

Correct workflow: change `plugins/maister/` and/or `platforms/*` → `make build` → `make validate`.
