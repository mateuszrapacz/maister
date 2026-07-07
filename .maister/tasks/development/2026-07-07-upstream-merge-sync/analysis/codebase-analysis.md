# Codebase Analysis: Upstream Merge Sync (v2.2.1)

## TL;DR

Upstream `SkillPanel/maister` released **v2.2.0–v2.2.1** (4 commits) since fork last synced at **v2.1.8** (`c790e51`). Main change is **operator visibility layer** (+~3000 lines). Fork has **53 divergent commits** (Kiro, Kilo, Cursor, AJ skills). Merge is **mechanically low-conflict** (3 version files) but **validationally high-effort** (Kiro transforms, agent count tests).

## Key Decisions

- **Merge strategy**: `git merge upstream/master` (preserves fork history + upstream ancestry for future syncs)
- **Version scheme**: `2.2.1-fork.1` (continue `X.Y.Z-fork.N` convention)
- **Source-only edits**: `plugins/maister/` + `platforms/*/`, never generated variants

## Open Questions & Risks

- Kiro `e2e-matrix.test.sh` agent count (26 → 27) will fail post-merge
- Kiro CHAT GATE count thresholds may break from `development/SKILL.md` changes
- Browser auto-open for dashboard may not work in Kiro Terminal UI
- Auto-merged orchestrator SKILLs need manual semantic review

---

## Repository State

| Item | Value |
|------|-------|
| Fork remote | `origin` → `mateuszrapacz/maister` |
| Upstream remote | `upstream` → `SkillPanel/maister` |
| Merge base | `679958b` (v2.1.8) |
| Fork HEAD | `9f78d52` (2.1.8-fork.2) |
| Upstream HEAD | `945f60b` (v2.2.1) |
| Fork-only commits | 53 |
| Upstream-only commits | 4 |

## Upstream Changes (v2.2.0 → v2.2.1)

| Commit | Description |
|--------|-------------|
| `8d9e3b3` | **Operator visibility layer** — dashboard.html, html-companion-writer agent, config.yml, TL;DR artifact contract, HTML companions |
| `68e3720` | Bump version to 2.2.0 |
| `56f7e7b` | Fix argument-hint array quoting in init skill (Copilot CLI) |
| `945f60b` | Bump version to 2.2.1 |

### New Assets (absent from fork)

- `plugins/maister/skills/orchestrator-framework/assets/dashboard.html` (615 lines)
- `plugins/maister/skills/orchestrator-framework/references/html-report-style.md` (168 lines)
- `plugins/maister/agents/html-companion-writer.md` (55 lines)

### Touched Orchestrators

`development`, `init`, `migration`, `performance`, `product-design`, `research` + 13 agents

## Fork Divergence (preserve)

### Fork-Only Platforms

| Platform | Build script | Output |
|----------|-------------|--------|
| Cursor | `platforms/cursor/build.sh` | `plugins/maister-cursor/` |
| Kiro CLI | `platforms/kiro-cli/build.sh` | `plugins/maister-kiro/` |
| Kilo CLI | `platforms/kilo-cli/build.sh` | `plugins/maister-kilo/` |

### Fork-Only Skills (12)

`aggregate-designer`, `context-distiller`, `grill-me`, `linguistic-boundary-verifier`, `metaprogram-classifier`, `problem-classifier`, `requirements-critic`, `test-strategy-reviewer`, `thermo-nuclear-*`, `thermos`, `transcript-critic`

## Merge Conflict Analysis

### Hard Conflicts (3) — version only

- `.claude-plugin/marketplace.json`
- `plugins/maister/.claude-plugin/plugin.json`
- `plugins/maister-copilot/.claude-plugin/plugin.json`

### Auto-Mergeable Overlap (14)

Orchestrator SKILL.md files + CLAUDE.md — both sides edited, git merge-tree shows clean combined result but needs semantic review.

## Build Pipeline

```
plugins/maister/ (SOURCE) → make build → maister-copilot, maister-cursor, maister-kiro, maister-kilo
```

**Rule**: Never edit generated variants directly.

## Prior Sync Pattern (v2.1.8)

1. Cherry-pick substantive commit (`fb5a8f3`), skip version commit (`679958b`)
2. Manual review of CLAUDE.md, init/SKILL.md
3. Platform build fixes (Cursor overrides)
4. `make build && make validate`
5. Empty merge marker (`c790e51`) for git ancestry

## Key Reference Files

| Path | Purpose |
|------|---------|
| `.maister/tasks/research/2026-06-14-upstream-sync-consistency/` | Full v2.1.8 sync research |
| `.maister/tasks/development/2026-06-14-upstream-sync-integration/` | v2.1.8 integration work-log |
| `docs/cursor-agent-support.md` | Fork merge strategy docs |
| `CLAUDE.md` | Never edit generated files rule |
| `Makefile` | validate rules + quick-plan corruption guard |

## Risk Level

**Medium-high** — low mechanical conflict count but extensive validation surface (Kiro 28 rules, 12 test suites, new agent propagation).
