# Gap Analysis: Maister Kiro CLI Platform Support (Phases 0–4)

## Summary

- **Risk Level**: High
- **Estimated Effort**: High (~1.5–2.5 weeks; largest net-new: MD→JSON generator, commands→skills merge, chat-native gates, embedded hooks)
- **Detected Characteristics**: Greenfield platform variant; modifies existing integration files; creates ~15–20 platform assets + full generated artifact tree

---

## Task Characteristics

| Field | Value | Rationale |
|-------|-------|-----------|
| **has_reproducible_defect** | no | No existing Kiro implementation to fix; absence is by design |
| **modifies_existing_code** | yes | `Makefile`, `README.md`, `CLAUDE.md`, CI workflows, `docs/`, `.maister/docs/standards/global/build-pipeline.md` |
| **creates_new_entities** | yes | `platforms/kiro-cli/` (~15–20 files), `plugins/maister-kiro/` (generated), wrapper `maister-kiro` |
| **involves_data_operations** | no | Build/transform pipeline only; no application CRUD entities |
| **ui_heavy** | no | CLI platform; no UI components or routes |

**Change type**: Additive — no changes to `plugins/maister/` source of truth required.

**Compatibility requirements**: flexible — new platform alongside Copilot/Cursor; existing platforms unaffected.

---

## Gaps Identified

### Missing Features (verified absent in repo)

| Gap | Evidence | Target state |
|-----|----------|--------------|
| **Platform build directory** | `glob platforms/kiro-cli/**` → 0 files | Full `platforms/kiro-cli/` per HLD |
| **Generated artifact** | `glob plugins/maister-kiro/**` → 0 files | Committed install tree after `make build-kiro` |
| **`build.sh` orchestrator** | No file | ~18-step pipeline from Cursor template |
| **`generate-agent-json.sh`** | No file | 24 MD agents → JSON + `agents/instructions/*.md` |
| **`agent-tools.json`** | No file | Per-agent Kiro tool whitelist lookup (binding user clarification) |
| **Commands→skills merge** | 8 commands exist at `plugins/maister/commands/*.md`; Kiro has no `commands/` API | 22 skill dirs (14 + 8 merged) |
| **Synthetic agents** | N/A | `agents/maister.json` (orchestrator) + `agents/maister-explore.json` → 26 total JSON |
| **Hooks embedded in agent JSON** | Cursor uses standalone `hooks/hooks.json` | Hooks in `agents/maister.json`; scripts at `$KIRO_HOME/hooks/` with `../hooks/*.sh` refs (ADR-016) |
| **`@prompts` layer** | No prompts dir | `$KIRO_HOME/prompts/` with `@init`, `@dev`, `@research`, etc. (ADR-012) |
| **`maister-kiro` wrapper** | No file | `KIRO_HOME=~/.kiro-maister exec kiro-cli "$@"` (ADR-015) |
| **Todo transforms** | Cursor has `apply_todo_transforms()` in `platforms/cursor/build.sh` L194–245; no Kiro equivalent | `TaskCreate`/`TaskUpdate` → `todo` in Kiro build (binding: include in this task, ADR-014) |
| **Makefile targets** | `Makefile` L1–3: `build` = copilot + cursor only | `build-kiro`, `validate-kiro`, `clean-kiro`; extend aggregates |
| **`validate-kiro`** | No target | ~22 structural checks (mirror `validate-cursor`) |
| **Smoke scripts** | Cursor has `smoke-install.sh`, `smoke-cli.sh` | Kiro variants targeting `KIRO_HOME=~/.kiro-maister` |
| **User docs** | `README.md` has Cursor section (L179+); no Kiro section | README block + `docs/kiro-cli-support.md` |
| **CI Kiro path** | `build-copilot.yml` auto-commits only `maister-copilot/`; no `build-kiro.yml` | `release.yml` picks up Kiro once Makefile updated; optional `build-kiro.yml` |
| **Build-pipeline standards** | `.maister/docs/standards/global/build-pipeline.md` — Copilot/Cursor only | Kiro naming, layout, API bans section |

### Incomplete Features

None — Kiro support is 0% implemented. Copilot and Cursor pipelines are complete reference implementations.

### Behavioral Changes Needed (integration files)

| File | Current | Required change |
|------|---------|-----------------|
| `Makefile` | 3 platform targets (copilot, cursor) | Add kiro build/validate/clean; extend `build`, `validate`, `clean`, `watch` |
| `README.md` | Cursor install docs only | Kiro CLI section: prerequisites, `maister-kiro`, `smoke-install.sh`, headless examples |
| `CLAUDE.md` | Lists copilot/cursor in structure | Document `maister-kiro` generated artifact rule |
| `.github/workflows/release.yml` | `make build && make validate` | Auto-includes Kiro once Makefile updated (no workflow edit required) |
| `docs/cursor-agent-support.md` | Forward-looking Kiro note (grill #15–16) | Cross-link or spawn `docs/kiro-cli-support.md` |
| `.maister/docs/standards/global/build-pipeline.md` | No Kiro section | Kiro naming, no `commands/`, JSON agents, API bans |

### Source Inventory vs Target Output (drift check)

Verified counts match research (2026-06-07):

| Asset | Source (`plugins/maister/`) | Kiro target | Gap |
|-------|----------------------------|-------------|-----|
| Agents | 24 `.md` | 26 `.json` (24 converted + 2 synthetic) | +generator, +synthesis |
| Skills | 14 directories | 22 (14 + 8 from commands) | +merge step |
| Commands | 8 `.md` | 0 (merged) | +merge + remove `commands/` |
| Hooks | 4 scripts + `hooks.json` | 5 adapted `.sh` + embedded in `maister.json` | +event remap |
| MCP | `.mcp.json` | `settings/mcp.json` | +path adapt |
| Manifest | `.claude-plugin/` | None | +remove step |
| Internal skills | 5 with `user-invocable: false` | Strip frontmatter; accept extra slashes (ADR-005) | +strip + docs |

**Commands to merge** (8 files, all verified present):

`quick-dev`, `quick-plan`, `reviews-code`, `reviews-pragmatic`, `reviews-production-readiness`, `reviews-reality-check`, `reviews-spec-audit`, `work`

---

## Semantic Transform Gaps (Claude Code → Kiro)

| Transform | Cursor (exists) | Kiro (missing) | Gap severity |
|-----------|-----------------|----------------|--------------|
| Naming `maister:foo` → `maister-foo` | `build.sh` L42–55 | Not implemented | Low (copy) |
| `CLAUDE.md` → `AGENTS.md` | L76–79 | Not implemented | Low (copy) |
| `AskUserQuestion` → platform tool | → `AskQuestion` (L63–66) | → **chat-native gates** (no Kiro tool) | **High** — ~230+ occurrences across 28 files |
| `Task` → delegation tool | unchanged | → `subagent` + `maister-*` names | Medium — ~100+ refs across 24 files |
| `Skill` tool → slash | unchanged | → `/maister-*` + `skill://` resources | Medium |
| `TaskCreate`/`TaskUpdate` → progress | → `TodoWrite` (L194–245) | → `todo` tool | Medium — ~70 refs across 15 files |
| `Explore` subagent | → `explore` (L57–61) | → `maister-explore` synthetic agent | Medium |
| Agents format | `.md` + frontmatter prefix (L167–174) | `.json` + `instructions/` | **High** — net-new generator |
| Commands | kept in `commands/` | merge to `skills/` | **High** — net-new step |
| Hooks | `hooks/hooks.json` (L160–165) | embedded in `maister.json` | **High** — schema + path resolution |
| Plugin doc | `rules/maister-workflows.mdc` | `steering/maister-workflows.md` | Low (adapt) |
| Init project rule | `.cursor/rules/maister-docs.mdc` (L185–188) | `.kiro/steering/maister-docs.md` | Medium (patch init skill) |
| Distribution | `~/.cursor/plugins/local/maister-cursor` | `KIRO_HOME=~/.kiro-maister` + wrapper | Medium (new install model) |
| `@prompts` shortcuts | N/A | `$KIRO_HOME/prompts/` (9 files) | Medium (Phase 2) |

### Kiro API Gaps (no sed target — design work required)

| API gap | Impact | Mitigation (designed, not implemented) |
|---------|--------|----------------------------------------|
| No `AskQuestion` | P0 — orchestrator phase gates, init Phase 3 | 3A+3B+3C chat gates; headless defaults |
| No built-in `explore` | P1 — codebase-analyzer, quick-plan | `maister-explore.json` synthetic agent |
| No `preCompact` | P2 — post-compaction resume | Stub hook + `orchestrator-state.yml` SOT |
| No `subagentStart`/`subagentStop` | P1 — bash guard context | `preToolUse`/`postToolUse` matcher `subagent` |
| No plugin manifest / `--plugin-dir` | P1 — discovery | Install tree under `KIRO_HOME` |
| `todo` experimental | P1 — progress UX | `orchestrator-state.yml` SOT + `todo` mirror (ADR-014) |
| No `user-invocable: false` | P1 — 5 internal skills exposed as slash | Orchestrator `skill://` resources; accept extra commands (ADR-005) |

---

## User Journey Impact Assessment

Kiro is a **new distribution channel**, not a modification of existing user flows.

| Dimension | Current | After | Assessment |
|-----------|---------|-------|------------|
| **Reachability** | Kiro users: no Maister | `maister-kiro` wrapper + `smoke-install.sh` → `KIRO_HOME` | ✅ New path |
| **Discoverability** | N/A | `/maister-*` slashes + `@prompts` layer | ⚠️ 22+ slashes may pollute completion (ADR-005 accepted) |
| **Flow Integration** | N/A | Same orchestrator phases via skills; resume via `orchestrator-state.yml` | ✅ Parity intent |
| **Multi-Persona** | N/A | Developer (interactive), CI (headless `--no-interactive`) | ⚠️ Gates need separate interactive E2E (Faza 3 scenariusz 2a) |

**Discoverability score**: N/A → 7/8 (slash + @prompts; noise from internal skills)

---

## Data Lifecycle Analysis

Not applicable — this task does not introduce application data entities. Build pipeline produces static install artifacts; runtime state lives in `.maister/tasks/` and `orchestrator-state.yml` (already platform-agnostic).

---

## Phase Summary (Phases 0–4)

Binding scope: **full Phases 0–4**, todo transforms **in this task** (not deferred).

### Phase 0 — Scaffold (~0.25 day)

| Deliverable | Status |
|-------------|--------|
| `platforms/kiro-cli/` directory skeleton | ❌ Missing |
| Stub `build.sh` (`sedi()`, copy, naming, remove manifest) | ❌ Missing |
| Stub `agent-tools.json` | ❌ Missing |
| Makefile: `build-kiro`, `validate-kiro`, `clean-kiro` | ❌ Missing |
| Stub `validate-kiro` (artifact exists) | ❌ Missing |

**Exit**: `make build-kiro` produces minimal `plugins/maister-kiro/`

### Phase 1 — MVP mechanical (~2–3 days)

| Deliverable | Status |
|-------------|--------|
| Full `build.sh` steps 1–17 | ❌ Missing |
| `generate-agent-json.sh` — all 24 agents | ❌ Missing |
| Commands→skills merge (8 → skill dirs) | ❌ Missing |
| `agents/maister.json` + `maister-explore.json` synthesis | ❌ Missing |
| Hooks Phase 1 (shell block + subagent trackers) embedded | ❌ Missing |
| Overrides, templates, steering | ❌ Missing (reuse from `platforms/cursor/`) |
| Chat-native gates (replace `AskUserQuestion`) | ❌ Missing |
| `Task` → `subagent`; `Skill` → slash semantics | ❌ Missing |
| Init patch: `.kiro/steering/maister-docs.md` | ❌ Missing |
| `smoke-install.sh`, `smoke-cli.sh` | ❌ Missing |
| `validate-kiro` rules 1–19 | ❌ Missing |
| **Todo transforms** (`TaskCreate`/`TaskUpdate` → `todo`) | ❌ Missing (binding: in this task) |
| Commit `plugins/maister-kiro/` | ❌ Manual (binding: like Cursor) |

**Exit**: `make build-kiro && make validate-kiro && bash smoke-cli.sh` — test 1 PASS

### Phase 1.5 — Progress parity (merged into Phase 1 per ADR-014)

Per grill decision ADR-014 and user binding, todo transforms ship in Phase 1 build, not as separate defer:

| Deliverable | Status |
|-------------|--------|
| `transforms/task-to-kiro-todo.md` | ❌ Missing (adapt from `platforms/cursor/transforms/task-to-todo.md`) |
| `patches/orchestrator-patterns-todo.md` | ❌ Missing |
| `apply_todo_transforms()` in build.sh | ❌ Missing |
| `validate-kiro`: ban `TaskCreate`/`TaskUpdate` | ❌ Missing |
| `chat.enableTodoList true` docs | ❌ Missing |

### Phase 2 — Hooks + polish (~1–2 days)

| Deliverable | Status |
|-------------|--------|
| Full hook set in `maister.json` | ❌ Missing |
| `@prompts` layer (`$KIRO_HOME/prompts/`, 9 files) | ❌ Missing |
| `maister-kiro` wrapper script | ❌ Missing |
| `smoke-uninstall.sh` | ❌ Missing |
| `post-compact-reminder-stub.sh` | ❌ Missing |
| `validate-kiro` rules 21–22 (trustedAgents, executable hooks) | ❌ Missing |
| README Kiro section (mirror Cursor L179–242) | ❌ Missing |

### Phase 3 — E2E (~2–3 days)

| Scenario | Status |
|----------|--------|
| `/maister-init` full flow | ❌ Not testable |
| `/maister-development` + progress/todo | ❌ Not testable |
| Resume `[task-path] [--from=PHASE]` | ❌ Not testable |
| Parallel subagent waves | ❌ Not testable |
| quick-plan + quick-bugfix overrides | ❌ Assets exist in Cursor; not ported |
| Playwright MCP `--e2e` | ❌ Optional P2 |

**Requires**: `KIRO_API_KEY` for CI headless (optional secret)

### Phase 4 — Release (~0.5 day)

| Deliverable | Status |
|-------------|--------|
| Commit `platforms/kiro-cli/` + `plugins/maister-kiro/` | ❌ Pending implementation |
| Bump Claude/Cursor manifest versions | ❌ N/A until release |
| `docs/kiro-cli-support.md` | ❌ Missing |
| Extend `build-pipeline.md` Kiro section | ❌ Missing |
| Optional `build-kiro.yml` | ❌ Missing (user binding: manual commit like Cursor — auto-commit CI optional) |

---

## Integration Points

| Integration point | Current state | Required action | Phase |
|-------------------|---------------|-----------------|-------|
| `Makefile` | No kiro targets | Add `build-kiro`, `validate-kiro`, `clean-kiro`; extend aggregates | 0 |
| `plugins/maister/` (SOT) | 24 agents, 14 skills, 8 commands | **Zero edits** — all logic in `platforms/kiro-cli/` | — |
| `platforms/cursor/` | 15 files, 247-line `build.sh` | Copy/adapt: overrides, templates, hooks bodies, todo transform pattern | 1 |
| `platforms/copilot-cli/build.sh` | 74-line baseline | Reference only (naming opposite); not template | — |
| `.github/workflows/release.yml` | `make build && make validate` | Auto-validates Kiro after Makefile update | 4 |
| `.github/workflows/build-copilot.yml` | Auto-commit `maister-copilot/` only | **No change required** (manual commit binding); optional unified workflow | 4 |
| `README.md` | Cursor section only | Add Kiro install/usage block | 2–4 |
| `docs/cursor-agent-support.md` | Grill #15–16 mandate | Spawn `docs/kiro-cli-support.md` or extend | 4 |
| `.maister/docs/standards/global/build-pipeline.md` | Copilot/Cursor only | Add Kiro standards section | 4 |
| `watch` target | `fswatch` → `make build` | Auto-rebuilds Kiro once in aggregate `build` | 0 |
| External: `kiro-cli` binary | Not in repo | Prerequisite for smoke; `KIRO_API_KEY` for CI | 1–3 |
| External: `jq` | Used by validate pattern | Required for JSON agent validation | 1 |

### Patterns to follow

- **Build script**: `platforms/cursor/build.sh` — `sedi()`, numbered steps, `apply_todo_transforms()` pattern
- **Validation**: `validate-cursor` — grep-based structural checks in Makefile
- **Smoke**: `platforms/cursor/smoke-install.sh`, `smoke-cli.sh` — adapt paths and CLI invocation
- **Agent frontmatter**: `plugins/maister/agents/gap-analyzer.md` — representative MD→JSON test case
- **Grill decisions**: ADR-001–016 in research decision log; ADR-010–016 override pre-grill naming/install paths

---

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

1. **Orchestrator agent filename and `name` field**
   - **Issue**: Pre-grill docs use `maister-orchestrator.json`; grill ADR-011 mandates `agents/maister.json` with `name: "maister"`. HLD body still mixes both names.
   - **Options**: (A) `maister.json` / `name: maister` per ADR-011; (B) `maister-orchestrator.json` per pre-grill HLD
   - **Recommendation**: **A** — ADR-011 explicitly supersedes ADR-004; user runs `maister-kiro chat --agent maister`
   - **Rationale**: Grill decisions are post-research binding; validate rules and smoke must use consistent name

2. **Hook script path resolution in `maister.json`**
   - **Issue**: ADR-016 uses `../hooks/*.sh` relative to `agents/`; research open Q#3: `${KIRO_PLUGIN_ROOT}` undocumented. Build may need absolute paths.
   - **Options**: (A) Relative `../hooks/`; (B) Absolute paths baked at build time; (C) Empirical test then decide
   - **Recommendation**: **C then B fallback** — prototype in Phase 1 smoke; if relative fails, emit `$KIRO_HOME/hooks/` absolute paths in JSON
   - **Rationale**: Blocking for hook execution; no documentation certainty

3. **Agent body directory: `agents/instructions/` vs `agents/prompts/`**
   - **Issue**: ADR-013 renames to `instructions/` to avoid confusion with `$KIRO_HOME/prompts/`; older research/HLD still say `agents/prompts/`.
   - **Options**: (A) `agents/instructions/` per ADR-013; (B) `agents/prompts/` per pre-grill HLD
   - **Recommendation**: **A** — grill binding; update validate rules accordingly
   - **Rationale**: Two different `@prompts` concepts must not collide

### Important (Should Decide)

1. **`chat.defaultAgent` setting at install**
   - **Issue**: Without default, slash commands may route to wrong agent; hooks only fire on `maister` agent sessions.
   - **Options**: (A) `smoke-install.sh --set-default` opt-in (ADR-015, default N); (B) Always set; (C) Document only, never set
   - **Default**: **A** per ADR-015
   - **Rationale**: User choice; README must explain `--agent maister` requirement if not default

2. **CI workflow for Kiro artifact**
   - **Issue**: `build-copilot.yml` auto-commits copilot only; user binding says manual commit for `maister-kiro` (like Cursor).
   - **Options**: (A) No auto-commit CI (manual discipline); (B) New `build-kiro.yml` with auto-commit; (C) Unified workflow for all `maister-*` variants
   - **Default**: **A** per user binding
   - **Rationale**: Cursor has no auto-commit workflow; parity with manual commit discipline

3. **Internal skills slash exposure (5A vs 5E)**
   - **Issue**: 5 skills with `user-invocable: false` become discoverable slashes in Kiro; 22+ commands may confuse users.
   - **Options**: (A) Accept extra slashes MVP (ADR-005); (B) `skills-internal/` dual tree (5E); (C) Naming hide convention
   - **Default**: **A** for MVP; revisit in Phase 2+ if UX problematic
   - **Rationale**: Orchestrator needs `skill://` access to internal engines; omitting breaks delegation

4. **`generate-agent-json.sh` runtime: bash+jq vs Node (6A vs 6B)**
   - **Issue**: 24 agents × 300–450 lines; bash frontmatter parsing is fragile.
   - **Options**: (A) bash+jq per ADR-006; (B) Escalate to `generate-agents.mjs` if parser exceeds ~100 lines or fails edge cases
   - **Default**: **A** with 6B escape hatch
   - **Rationale**: Repo convention is bash-first build; prototype with `gap-analyzer.md` first

5. **Headless smoke gate behavior (3B)**
   - **Issue**: ~230 `AskUserQuestion` refs need chat gate rewrites; headless may skip waits.
   - **Options**: (A) Documented defaults in skill instructions for `--no-interactive`; (B) Separate smoke prompts bypassing gates; (C) Both
   - **Default**: **C**
   - **Rationale**: CI needs green smoke; interactive E2E covers real gate UX (Faza 3 scenariusz 2a)

6. **`useLegacyMcpJson` vs `includeMcpJson` Kiro settings**
   - **Issue**: Research open Q#8 — MCP config key naming uncertain.
   - **Options**: Empirical test during Phase 1 smoke; document working setting
   - **Default**: Test in smoke; document in README
   - **Rationale**: Blocks Playwright MCP for `--e2e` workflows if wrong

---

## Recommendations

1. **Start Phase 0 immediately** — scaffold `platforms/kiro-cli/` and Makefile; proves aggregate `make build` wiring before heavy transforms.
2. **Copy `platforms/cursor/build.sh` as base** — reuse steps 1–10, 12–13, 14 (todo); replace steps 11 (hooks), agent handling, manifest removal.
3. **Prototype generator on `gap-analyzer.md` first** — representative frontmatter + long body; validate JSON with `jq empty`.
4. **Resolve naming to grill ADRs** — `maister.json`, `agents/instructions/`, `KIRO_HOME=~/.kiro-maister` in all new files (not pre-grill `maister-orchestrator` / `~/.kiro/`).
5. **Include todo transforms in Phase 1 build** — mirror Cursor `apply_todo_transforms()` with Kiro-specific sed mappings; do not defer.
6. **Do not modify `plugins/maister/`** — enforce platforms-only rule in code review.
7. **Manual commit discipline** — after `make build-kiro && make validate-kiro`, commit `plugins/maister-kiro/` manually (like Cursor).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MD→JSON generator bugs | High | High | Incremental rollout; `jq` validation; golden-file for 2–3 agents |
| Chat gates UX regression | Medium | High | 3A+3B+3C patterns; interactive E2E in Phase 3 |
| Hook path resolution failure | Medium | High | Empirical smoke; absolute path fallback |
| Kiro `todo` API instability | Medium | Medium | `orchestrator-state.yml` SOT |
| Commands→skills merge breaks discovery | Low | High | Validate 22 dirs; smoke test `/maister-init` |
| Document naming drift (orchestrator vs maister) | Medium | Medium | Lock to ADR-011 in spec phase |
| Scope creep into source plugin | Low | High | Platforms-only enforcement |
| Install path confusion | Medium | Low | `KIRO_HOME` wrapper + docs |

- **Complexity Risk**: High — most format-divergent platform (JSON agents, no manifest, commands absorbed)
- **Integration Risk**: Medium — additive Makefile/CI/docs; no SOT changes
- **Regression Risk**: Low — existing Copilot/Cursor unaffected

---

## References

- Codebase analysis: `analysis/codebase-analysis.md`
- Research report: `analysis/research-context/research-report.md`
- High-level design: `analysis/research-context/high-level-design.md`
- Decision log (ADR-001–016): `analysis/research-context/decision-log.md`
- Cursor reference: `platforms/cursor/build.sh` (247 lines)
- Grill mandate: `docs/cursor-agent-support.md` (#15–16)
