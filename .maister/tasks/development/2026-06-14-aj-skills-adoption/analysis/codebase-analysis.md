# Codebase Analysis Report: AJ Skills Wave 1 Adoption

**Task:** `.maister/tasks/development/2026-06-14-aj-skills-adoption`  
**Research basis:** `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/`

---

## 1. Executive Summary

Wave 1 of the Architekt Jutra (AJ) skills adoption is **already implemented** in `plugins/maister/` (commit `607ed5b`, v2.2.0): three on-demand skills (`requirements-critic`, `transcript-critic`, `problem-classifier`), three thin `quick-*` command wrappers, CLAUDE.md documentation including the Bundle A chain, and Kiro CLI build/test integration. The development task should **pivot from greenfield implementation to verification and completion** — closing documented gaps (README, `disable-model-invocation` parity, optional language gate, Kiro `@` shortcuts) and running `make build && make validate` rather than re-porting skills.

---

## 2. Primary Language & Tech Stack

| Layer | Technology |
|-------|------------|
| Plugin source | Markdown (SKILL.md, commands, agents) in `plugins/maister/` |
| Generated variants | `plugins/maister-cursor/`, `plugins/maister-copilot/`, `plugins/maister-kiro/` via `make build` |
| Build / validation | `Makefile` (`make build`, `make validate`) |
| Platform transforms | `platforms/cursor/build.sh`, `platforms/copilot-cli/build.sh`, `platforms/kiro-cli/build.sh` |
| Task orchestration | YAML state (`orchestrator-state.yml`), development orchestrator (14 phases) |
| Testing | Shell tests under `platforms/kiro-cli/tests/` (skill dir counts, file presence) |

This is a **Claude Code / Cursor plugin marketplace repo**, not an application codebase. All Wave 1 deliverables are documentation-as-code (skills + commands).

---

## 3. Key Files

| Path | Purpose | Relevance |
|------|---------|-----------|
| `plugins/maister/skills/requirements-critic/SKILL.md` | Interactive 4-check requirements critique; `disable-model-invocation: true`; Bundle A chain | **Gold template** for Wave 1 skills |
| `plugins/maister/skills/transcript-critic/SKILL.md` | Non-interactive meeting transcript audit; `disable-model-invocation: true` | Wave 1 skill — reference sibling |
| `plugins/maister/skills/problem-classifier/SKILL.md` | 4-class DDD modeling classifier with clarifying questions | Wave 1 skill — **missing `disable-model-invocation`** |
| `plugins/maister/commands/quick-requirements-critic.md` | Thin wrapper → Skill tool delegation | **Gold template** for commands |
| `plugins/maister/commands/quick-transcript-critic.md` | Thin wrapper for transcript-critic | Wave 1 command |
| `plugins/maister/commands/quick-problem-classifier.md` | Thin wrapper for problem-classifier | Wave 1 command |
| `plugins/maister/CLAUDE.md` | Skill/command tables, Bundle A flow, `task-classifier` vs `problem-classifier` distinction | Documentation completeness check |
| `plugins/maister/skills/grill-me/SKILL.md` | Skill-only, no command | Template: on-demand skill without wrapper |
| `plugins/maister/skills/thermos/SKILL.md` | Subagent delegation pattern | Template for multi-step delegation (not Wave 1) |
| `platforms/kiro-cli/build.sh` | Merges AJ skills + renames for Kiro | Build integration — already updated |
| `platforms/kiro-cli/tests/build-core.test.sh` | Asserts 57 skill dirs + AJ file presence | Validation gate |
| `README.md` | User-facing plugin docs | **Gap: no Wave 1 / AJ mention** |
| `.maister/tasks/research/2026-06-09-architekt-jutra-skills-analysis/` | Research artifacts, ADRs, wave plan | Source of truth for scope |

---

## 4. Architecture Overview

### Three-tier skill taxonomy

- **Tier A — Orchestrators** (`maister:*` prefix): development, research, migration, etc.
- **Tier B — On-demand skills** (plain kebab-case): Wave 1 skills live here
- **Tier C — Internal engines** (`user-invocable: false`): docs-manager, orchestrator-framework

### Bundle A chain (documented hybrid flow)

```
transcript-critic → (clarification) → requirements-critic → problem-classifier (when contention signals)
```

### Build pipeline

```
plugins/maister/ (source of truth) → make build → generated variants → make validate
```

---

## 5. Existing Patterns to Follow

- Plain kebab `name:` for on-demand skills (no `maister:` prefix)
- `disable-model-invocation: true` for critique skills
- Thin `quick-*` command wrappers (~10 lines, Skill tool delegation)
- "Recommended Next Steps" chain sections in SKILL.md
- CLAUDE.md tables for discovery (5–15 lines/skill, 3–8 lines/command)

---

## 6. Integration Points

| Integration | Status |
|-------------|--------|
| Skills + commands in source | ✅ Done |
| CLAUDE.md documentation | ✅ Done |
| Build pipeline + Kiro tests | ✅ Done (`make validate` passes) |
| README.md | ❌ Gap |
| Kiro `@` shortcuts | ❌ Gap |
| Orchestrator soft suggestions (Wave 2+) | ⏸ Deferred |

---

## 7. Risks & Considerations

| Risk | Severity |
|------|----------|
| Duplicate implementation | High — re-porting wastes effort |
| `disable-model-invocation` gap on problem-classifier | Medium |
| Hardcoded Kiro skill count (57) | Medium — update on future waves |
| README drift | Low |
| Scope creep to Wave 2+ | Medium |

---

## 8. Recommended Approach

**Pivot: verification & completion, not greenfield.**

1. Treat commit `607ed5b` as Wave 1 baseline
2. Close gaps: `disable-model-invocation` parity, README, optional language gate
3. Run `make build && make validate` (currently passing)
4. Conformance audit against research spec
5. Defer Wave 2+ and orchestrator integration
