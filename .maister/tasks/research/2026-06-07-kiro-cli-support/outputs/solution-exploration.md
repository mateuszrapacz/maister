# Solution Exploration: Kiro CLI Support for Maister

**Research question:** Jak przygotować implementację wsparcia kiro-cli analogicznie do Cursor, Copilot i Claude Code?  
**Date:** 2026-06-07  
**Confidence:** Medium (architecture High; mitigations Medium)

---

## Problem Reframing

### Research Question

Maister already ships Claude Code (source), Copilot CLI, and Cursor Agent via `platforms/*/build.sh` → `plugins/maister-*`. Kiro CLI is the fourth platform. It is **semantically closest to Cursor** (`maister-foo` naming, `AGENTS.md`, hooks retained, Playwright MCP) but **format-divergent** (agents as JSON, hooks embedded in agent JSON, no `commands/` API, no plugin manifest/`--plugin-dir`). The core question is not *whether* to port, but *how to resolve six architectural forks* without editing `plugins/maister/`.

**Evidence:** Synthesis cross-source table (High confidence on build pattern, naming, transforms); grill decisions #15–16 mandate same fork architecture (`docs/cursor-agent-support.md`).

### How Might We Questions

| # | HMW | Decision area |
|---|-----|---------------|
| HMW-1 | How might we install Maister for Kiro users and CI without a marketplace or `--plugin-dir`? | Distribution |
| HMW-2 | How might we preserve orchestrator progress UX when Kiro's `todo` is experimental and `orchestrator-state.yml` already exists? | Progress tracking |
| HMW-3 | How might we preserve interactive phase gates when Kiro has no `AskQuestion`/`AskUserQuestion`? | Phase gates |
| HMW-4 | How might we route `/maister-*` workflows and hook embedding when Kiro has no Skill tool and hooks live in agent JSON? | Orchestrator agent model |
| HMW-5 | How might we hide six `user-invocable: false` internal skills when Kiro exposes all skills as slash commands? | Internal skills visibility |
| HMW-6 | How might we convert 24 MD agents to JSON with explicit tool whitelists at build time? | MD→JSON conversion |

### Scope Guardrails (in-scope vs out-of-scope)

| In scope | Out of scope (deferred) |
|----------|-------------------------|
| `platforms/kiro-cli/build.sh` + assets | Public Kiro marketplace submission |
| Generated `plugins/maister-kiro/` (committed) | Editing `plugins/maister/` for Kiro-specific APIs |
| Makefile `build-kiro` / `validate-kiro` / `clean-kiro` | Unified multi-platform install CLI |
| Smoke scripts (`smoke-install.sh`, `smoke-cli.sh`) | Full Playwright MCP E2E in CI (P2) |
| README Kiro install section | Auto-commit strategy for all variants (team decision) |
| Fazy 0–1 MVP; defer 1.5 `todo` | Adding `tools:` frontmatter to source MD agents (optional later) |
| Adapt Cursor overrides (quick-plan, quick-bugfix) | `preCompact` parity (document gap only) |

**Invariant (all alternatives must respect):** `plugins/maister/` = sole source of truth; never manually edit `plugins/maister-kiro/` (`build-pipeline.md`, grill #1, #4).

---

## Explored Alternatives

### Decision Area 1: Distribution Strategy

**Context:** Kiro has no plugin manifest or `--plugin-dir`. Skills/agents/steering load from `~/.kiro/` (global) or `.kiro/` (workspace). Local wins over global on name collision (Kiro docs). Cursor uses `~/.cursor/plugins/local/` + optional workspace rules; smoke uses install copy (`research-report.md` §Dystrybucja).

#### Alternative 1A: Global-only (`~/.kiro/`)

Copy `plugins/maister-kiro/` subtrees to `~/.kiro/skills/`, `~/.kiro/agents/`, `~/.kiro/steering/`, `~/.kiro/settings/mcp.json` via `smoke-install.sh`.

| | |
|---|---|
| **Strengths** | Parity with Cursor `smoke-install.sh`; matches Kiro default for `/agent create`; one install serves all projects; simple README |
| **Weaknesses** | CI headless cannot rely on user home without isolation; version pinning per-project impossible; install overwrites global state |
| **Best when** | Primary audience is individual developers cloning the fork |
| **Evidence** | `planning-decisions-cursor-template.md` grill #3 (local + GitHub); `kiro-agents-hooks.md` §4 global path table |

#### Alternative 1B: Workspace-only (`.kiro/` in project)

Ship install script that copies build output into test project's `.kiro/` only.

| | |
|---|---|
| **Strengths** | CI-friendly: ephemeral workspace in `/tmp/maister-kiro-smoke-$$`; reproducible E2E; project-pinned Maister version in repo |
| **Weaknesses** | Every project needs manual or init-time copy; poor DX for "install once, use everywhere"; duplicates Cursor's global install story |
| **Best when** | CI-only validation with no user install path |
| **Evidence** | `research-report.md` smoke-cli workspace pattern; Kiro local-first precedence |

#### Alternative 1C: Hybrid — global install + workspace override for CI/E2E

`smoke-install.sh` → `~/.kiro/` for users; `smoke-cli.sh` copies `plugins/maister-kiro/` into workspace `.kiro/` for headless tests. Document that project `.kiro/` overrides global.

| | |
|---|---|
| **Strengths** | Best of both: developer ergonomics + CI isolation; aligns with Kiro's native precedence model; mirrors Cursor global install + workspace rules conceptually |
| **Weaknesses** | Two code paths to maintain; docs must explain when to use which; slight risk of drift between global and workspace copies |
| **Best when** | Shipping both user install and automated validation (recommended default) |
| **Evidence** | `kiro-agents-hooks.md` §4 "Both" row; synthesis pattern #3 (smoke dwuwarstwowy) |

#### Alternative 1D: Repo-relative symlink from `plugins/maister-kiro/`

Symlink `~/.kiro/skills` → repo output (dev workflow).

| | |
|---|---|
| **Strengths** | Instant rebuild feedback; zero copy on Linux/macOS |
| **Weaknesses** | Windows symlink failures (Copilot lesson); breaks when repo moves; not suitable for end-user docs |
| **Best when** | Maintainer local dev only — not primary distribution |
| **Evidence** | `research-report.md` known pitfalls (Windows `cp -r` fallback) |

#### Alternative 1E: Flat install (no `plugins/maister-kiro/` wrapper in user dir)

Install script flattens output directly into `~/.kiro/` without preserving repo tree shape.

| | |
|---|---|
| **Strengths** | Matches Kiro's expected layout exactly |
| **Weaknesses** | Open question on exact layout vs repo output (`research-report.md` open Q#1, Low confidence); harder to uninstall cleanly |
| **Best when** | After smoke-install prototype validates layout |
| **Evidence** | Research report open questions table |

---

### Decision Area 2: Progress Tracking

**Context:** Claude uses `TaskCreate`/`TaskUpdate`; Cursor Fase 1.5 maps to `TodoWrite`; Kiro has experimental `todo` tool + `chat.enableTodoList` + storage in `.kiro/cli-todo-lists/`. Maister already uses `orchestrator-state.yml` as session SOT (`synthesis.md` gap #preCompact).

#### Alternative 2A: Kiro `todo` tool (Fase 1.5, Cursor parity)

Build-time transform `TaskCreate`/`TaskUpdate` → `todo` instructions; enable `chat.enableTodoList true` in docs/smoke.

| | |
|---|---|
| **Strengths** | UX parity with Cursor TodoWrite; native Kiro UI (`/todo view`, `/todo resume`); users see progress in CLI |
| **Weaknesses** | `todo` marked experimental; API may change; extra build patches (`task-to-kiro-todo.md`); smoke depends on setting |
| **Best when** | Post-MVP polish when headless init smoke is green |
| **Evidence** | `kiro-tools-mcp-subagents.md` §3; grill #7 adapted for Kiro; synthesis recommends defer Fase 1.5 |

#### Alternative 2B: `orchestrator-state.yml` only (no `todo`)

Orchestrators read/write YAML state file; no `todo` tool references in Kiro build.

| | |
|---|---|
| **Strengths** | Platform-agnostic; already required for resume/`--from=PHASE`; no experimental API; simpler Fase 1 MVP |
| **Weaknesses** | No in-chat progress UI; user must open task folder to see phase; diverges from Cursor UX |
| **Best when** | MVP ship or when `todo` stability is uncertain |
| **Evidence** | Synthesis Faza 1 without todo; research report defer pattern (like Cursor MVP without TodoWrite) |

#### Alternative 2C: Hybrid — `orchestrator-state.yml` as SOT + optional `todo` mirror

State file remains authoritative for resume; Fase 1.5 adds best-effort `todo` sync for display only.

| | |
|---|---|
| **Strengths** | Resilient to `todo` API changes; resume works even if todos cleared; progressive UX enhancement |
| **Weaknesses** | Dual-write complexity in orchestrator instructions; risk of drift between todo list and YAML |
| **Best when** | Long-term production quality after MVP |
| **Evidence** | `preCompact` gap mitigation (state file as SOT) in synthesis |

#### Alternative 2D: Chat-native progress (narrative only)

Orchestrator prints phase checklist in chat; no structured tracking.

| | |
|---|---|
| **Strengths** | Zero new tooling; works headless |
| **Weaknesses** | Lost on compaction; no resume fidelity; fails Maister orchestrator contract |
| **Best when** | Not recommended — fails spec |
| **Evidence** | Orchestrator patterns require structured state |

#### Alternative 2E: Defer all progress tracking to Fase 3+

Ship Fase 1 with neither `todo` nor state-file patches beyond existing references.

| | |
|---|---|
| **Strengths** | Fastest MVP |
| **Weaknesses** | Breaks `/maister-development` resume and multi-phase workflows — unacceptable for orchestrators |
| **Best when** | Never — state file is minimum bar |
| **Evidence** | E2E checklist scenario 3 (resume) |

---

### Decision Area 3: AskUserQuestion / Phase Gates

**Context:** 200+ `AskUserQuestion` occurrences in source; Cursor sed → `AskQuestion`; Kiro has **no** equivalent built-in tool (High confidence gap). Copilot lesson: multi-select → sequential questions.

#### Alternative 3A: Chat-based gates (natural language)

Rewrite instructions: "ask user in chat with numbered options; wait for reply before proceeding." Pattern from Kiro Plan agent.

| | |
|---|---|
| **Strengths** | Works in interactive `kiro-cli chat`; no fake tool; aligns with Kiro docs; build.sh sed removes `AskUserQuestion` references |
| **Weaknesses** | Non-deterministic in headless; agent may proceed without waiting; no structured option validation |
| **Best when** | Default for all orchestrator gates in Kiro variant |
| **Evidence** | Synthesis resolved conflict table; `kiro-tools-mcp-subagents.md` gap #22 |

#### Alternative 3B: Headless skip — auto-approve gates in `--no-interactive`

Document that smoke/CI uses `--no-interactive --trust-all-tools`; orchestrator patches include "if non-interactive, use defaults from brief/state."

| | |
|---|---|
| **Strengths** | Unblocks CI smoke (`/maister-init`); matches Cursor headless AskQuestion defaults pattern |
| **Weaknesses** | Masks gate bugs; defaults may be wrong for real workflows; interactive E2E still required separately |
| **Best when** | Smoke scripts and CI only — combined with 3A for interactive |
| **Evidence** | Research report P0 blockers #1, #11; smoke-cli.sh design |

#### Alternative 3C: Sequential prompts workaround (Copilot pattern)

Replace multi-select `AskUserQuestion` with series of single-choice chat questions at build time.

| | |
|---|---|
| **Strengths** | Proven in Copilot port; works without multi-select API; clearer for users |
| **Weaknesses** | More chat round-trips; build-time transform complexity for init Phase 3; longer init flow |
| **Best when** | `maister-init` standards selection and any `allow_multiple` gates |
| **Evidence** | Copilot `copilot-cli-issues.md` multi-select lesson; synthesis §3 |

#### Alternative 3D: File-based gates (write choices to file, user edits)

Orchestrator writes `gate-response.md`; user edits and says "continue."

| | |
|---|---|
| **Strengths** | Works headless with file watch; auditable decisions |
| **Weaknesses** | Poor UX vs chat; not Maister convention; extra artifacts |
| **Best when** | Automation/CI scenarios — niche |
| **Evidence** | No Maister precedent |

#### Alternative 3E: Interactive permission prompts as gate substitute

Rely on Kiro `/tools` approval flows.

| | |
|---|---|
| **Strengths** | Native Kiro mechanism |
| **Weaknesses** | Wrong semantic (tool approval ≠ business gate); unusable headless; not suitable for phase transitions |
| **Best when** | Not recommended for orchestrator gates |
| **Evidence** | `kiro-tools-mcp-subagents.md` — unsuitable for headless |

---

### Decision Area 4: Orchestrator Agent Model

**Context:** Claude/Cursor use Skill tool + Task tool in default context. Kiro has no Skill tool; skills auto-discover as `/slash` commands; hooks embed in agent JSON; `subagent` replaces Task.

#### Alternative 4A: Single `maister-orchestrator.json` (synthetic agent)

Build synthesizes one orchestrator agent with hooks, `subagent` + core tools, `trustedAgents: ["maister-*"]`, `skill://` resources glob.

| | |
|---|---|
| **Strengths** | Central hook embedding (required by Kiro); matches research architecture; one `--agent maister-orchestrator` entry point; clear separation from 24 converted subagents |
| **Weaknesses** | Extra synthetic agent not in source; users must know to launch it; slash commands may still hit default agent |
| **Best when** | Default recommendation — hooks must live somewhere |
| **Evidence** | `kiro-agents-hooks.md` §3.4, §5.2; research-report step 18 |

#### Alternative 4B: Default Kiro agent + skill auto-discovery only

No custom orchestrator; users run `/maister-development` on default agent; rewrite Skill tool → slash in orchestrator text only.

| | |
|---|---|
| **Strengths** | Minimal synthetic artifacts; leverages Kiro skill discovery |
| **Weaknesses** | **Cannot embed hooks** (hooks are per-agent in Kiro); no `trustedAgents` tuning; internal skills exposed; bash guard/subagent tracking harder |
| **Best when** | Only if hooks deferred entirely — conflicts with grill #10 (keep hooks) |
| **Evidence** | Kiro hooks only in agent JSON; Cursor keeps hooks (semantic alignment) |

#### Alternative 4C: Per-workflow orchestrator agents

`maister-development-orchestrator.json`, `maister-research-orchestrator.json`, etc.

| | |
|---|---|
| **Strengths** | Tailored tools/resources per workflow; smaller context per agent |
| **Weaknesses** | 6+ synthetic agents to maintain; hook duplication or shared template complexity; diverges from single Skill-tool entry point |
| **Best when** | If context limits bite — premature for v1 |
| **Evidence** | 14 skills + 8 commands — manageable in one orchestrator |

#### Alternative 4D: Default agent + `chat.defaultAgent` setting

Ship `settings` recommending `chat.defaultAgent: maister-orchestrator` in install docs.

| | |
|---|---|
| **Strengths** | Slash commands route to orchestrator automatically |
| **Weaknesses** | Setting behavior Medium confidence (open Q#6); overrides user default agent globally |
| **Best when** | Complement to 4A — document, don't hard-require |
| **Evidence** | Research report open questions #6 |

#### Alternative 4E: Orchestrator as steering-only (no dedicated agent)

Put orchestration logic in `steering/maister-workflows.md`; use default agent.

| | |
|---|---|
| **Strengths** | Fewer JSON files |
| **Weaknesses** | No hook attachment point; weak enforcement of Maister workflow patterns |
| **Best when** | Not viable given hook requirements |
| **Evidence** | `skill-invocation-reminder` needs agent hook |

---

### Decision Area 5: Internal Skills Visibility

**Context:** Six skills have `user-invocable: false` (`docs-manager`, `codebase-analyzer`, `orchestrator-framework`, etc.). Kiro exposes all `.kiro/skills/*/SKILL.md` as slash commands — no `user-invocable` equivalent (High confidence gap).

#### Alternative 5A: Accept all skills as slash commands

Strip `user-invocable: false` at build; document that `/maister-docs-manager` is advanced/internal.

| | |
|---|---|
| **Strengths** | Simplest build; zero orchestrator resource gymnastics; power users can invoke directly |
| **Weaknesses** | Polluted slash completion (22+ commands); risk users run internal engines incorrectly; diverges from Claude/Cursor intent |
| **Best when** | P2 acceptable UX debt; fastest MVP |
| **Evidence** | Research report gap #5 "or accept extra commands (P2)" |

#### Alternative 5B: Custom orchestrator + selective `skill://` resources

Orchestrator gets `skill://` globs for **user-invocable** skills only; internal skills referenced only in subagent/orchestrator prompts via explicit `skill://.kiro/skills/maister-docs-manager/SKILL.md`.

| | |
|---|---|
| **Strengths** | Preserves internal/external boundary in orchestration; progressive load via resources; aligns with Kiro `resources` design |
| **Weaknesses** | **Does not hide slash commands** if files exist in `.kiro/skills/` — only controls orchestrator context; needs experiment on whether slash still appears (open Q#5, Low) |
| **Best when** | Recommended orchestration model regardless of visibility |
| **Evidence** | `kiro-agents-hooks.md` §5.3; synthesis insight #4 |

#### Alternative 5C: Naming convention hide (`_internal/` or `maister-internal-*` prefix)

Rename internal skill dirs to suppress discovery (if Kiro ignores `_` prefix or similar).

| | |
|---|---|
| **Strengths** | Might reduce slash noise without orchestrator complexity |
| **Weaknesses** | **Unverified** Kiro behavior; breaks `maister-foo` naming consistency; validate rules would need exceptions |
| **Best when** | Only after empirical test confirms Kiro ignores pattern |
| **Evidence** | Open Q#5 — Low confidence |

#### Alternative 5D: Omit internal skills from install tree

Only copy user-invocable skills to `~/.kiro/skills/`; keep internal skills as `file://` resources bundled under `agents/prompts/` or `steering/`.

| | |
|---|---|
| **Strengths** | Truly hides slash commands |
| **Weaknesses** | Subagents that need to "invoke skill" break; `codebase-analyzer` workflow broken; major refactor of skill layout |
| **Best when** | If 5C fails and UX is critical — high implementation cost |
| **Evidence** | `codebase-analyzer` invokes via Skill tool in source |

#### Alternative 5E: Dual tree — `skills/` public + `skills-internal/` not in Kiro path

Install script copies only public subset to `.kiro/skills/`; internal kept in `plugins/maister-kiro/internal-skills/` referenced by path.

| | |
|---|---|
| **Strengths** | Clean slash list; internal content still available to orchestrator via `file://` |
| **Weaknesses** | Non-standard layout; build.sh complexity; subagent `skill://` URIs need rewriting |
| **Best when** | Phase 2+ if 5A UX complaints arise |
| **Evidence** | Stretch goal — not Fase 1 |

---

### Decision Area 6: Agent MD→JSON Conversion

**Context:** 24 source agents lack `tools` in frontmatter; Kiro requires JSON with explicit tool whitelist. Largest unique cost vs Cursor (~2–3 extra days). Plus 2 synthetic agents (`maister-explore`, `maister-orchestrator`).

#### Alternative 6A: Build-time bash + `jq` loop

`build.sh` reads each `agents/*.md`, extracts frontmatter with `sed`/`awk`, looks up tools in `platforms/kiro-cli/agent-tools.json`, emits JSON via `jq`.

| | |
|---|---|
| **Strengths** | No new runtime deps beyond `jq` (already in `validate-kiro`); consistent with bash-first pipeline (`set -e`, `sedi()`); single script owns transform |
| **Weaknesses** | Fragile frontmatter parsing in bash; harder to test; complex nested JSON for hooks embed |
| **Best when** | Team wants zero Node/Python in build |
| **Evidence** | `validate-kiro` already uses `jq`; `build-pipeline.md` bash conventions |

#### Alternative 6B: Standalone Node script (`platforms/kiro-cli/generate-agents.mjs`)

Node reads MD, uses gray-matter or similar, outputs JSON; `build.sh` invokes it.

| | |
|---|---|
| **Strengths** | Robust frontmatter parsing; easier unit tests; cleaner template for `resources`/`hooks` embed; JSON manipulation native |
| **Weaknesses** | New dep in build (Node required in CI — likely already present); second file to maintain; diverges from pure-bash Copilot/Cursor builds |
| **Best when** | MD parsing complexity grows (resources inference from `skills:` frontmatter) |
| **Evidence** | Research report open Q#10 — tools inference maintainability |

#### Alternative 6C: Embedded Python in `build.sh`

Inline Python heredoc for MD→JSON (like some codegen pipelines).

| | |
|---|---|
| **Strengths** | Single entry point; good text processing; no separate package.json |
| **Weaknesses** | Python version variance; mixes languages in one script; repo has no Python build precedent |
| **Best when** | If Node unavailable and bash too fragile |
| **Evidence** | No existing Python in Maister build pipeline |

#### Alternative 6D: Pre-generated JSON committed in `platforms/kiro-cli/agent-json/` (manual or semi-auto)

Build copies static JSON instead of generating from MD each time.

| | |
|---|---|
| **Strengths** | Predictable output; easy review in PRs |
| **Weaknesses** | **Drift** when source agents change; violates DRY; double maintenance — rejected by build-pipeline philosophy |
| **Best when** | Never for 24 agents |
| **Evidence** | Grill #4 — generated artifacts from build, not hand-maintained parallel tree |

#### Alternative 6E: Extend source MD with `tools:` frontmatter (upstream change)

Add optional `tools:`/`allowedTools:` to `plugins/maister/agents/*.md`; generator reads directly.

| | |
|---|---|
| **Strengths** | Single source for tool policy; easier cross-platform future |
| **Weaknesses** | **Violates scope guardrail** — edits core plugin for Kiro; upstream PR friction |
| **Best when** | Long-term if all platforms need explicit tool lists |
| **Evidence** | Research report "Co NIE zmienia się w plugins/maister" |

---

## Trade-Off Analysis

### Comparison Matrix (recommended path vs key alternatives)

Scoring: **H** = favorable, **M** = neutral, **L** = unfavorable.

| Alternative | Technical Feasibility | User Impact | Simplicity | Risk | Scalability |
|-------------|----------------------|-------------|------------|------|-------------|
| **1C Hybrid distribution** | H — matches Kiro precedence + Cursor install | H — install once, CI isolated | M — two install paths | L — doc drift | H — add platforms same pattern |
| 1A Global-only | H | H for devs | H | M — CI awkward | M |
| 1B Workspace-only | H | L — reinstall per project | M | L | M |
| **2B State SOT + 2A defer todo** | H — MVP first | M — no todo UI until 1.5 | H — defer experimental | H — avoids experimental API | H — add todo later |
| 2A todo immediate | M — experimental | H — native UX | M | M — API churn | M |
| **3A+3B+3C Chat gates + headless skip + sequential** | M — needs E2E proof | M — interactive OK, CI defaults | M — sed + docs | M — agent may skip gates | H — pattern reusable |
| 3A alone | M | M | H | M — headless fails | M |
| **4A Single maister-orchestrator** | H — designed in research | H — clear entry point | M — synthetic agent | L | H — one hook surface |
| 4B Default agent only | L — no hooks | M | H | H — missing guards | L |
| **5B Selective skill:// + 5A accept slash (MVP)** | H | M — extra slashes | H — strip frontmatter only | L | M — revisit 5E later |
| 5D Omit internal from install | M | H — clean UX | L — layout fork | M — breaks flows | M |
| **6A bash+jq** (or 6B if parsing hurts) | H — fits pipeline | H — transparent build | H/M | M — bash fragility | M — migrate to 6B if needed |
| 6B Node script | H | H | M — extra dep | L | H — testable |

### Cross-cutting trade-offs

| Tension | Resolution |
|---------|------------|
| MVP speed vs UX parity | Ship Fase 1 without `todo` (2B), add 1.5 later — same Cursor pattern (grill #7) |
| Interactive vs headless | Dual-mode gates (3A+3B); never block MVP on interactive-only E2E |
| Hook requirement vs minimal agents | 4A mandatory — hooks cannot live in default-only model |
| Internal skill secrecy vs build simplicity | Accept 5A slash pollution for MVP; implement 5B resources for orchestrator correctness |

---

## User Preferences

No interactive user preferences were collected in this research phase. Constraints treated as fixed requirements:

| Constraint | Source |
|------------|--------|
| Fork architecture, commit generated artifacts | Grill #2, #4, #15 |
| `maister-foo` naming, keep hooks | Grill #5, #10, #15–16 |
| `make build` includes all platforms | Grill #16, `build-pipeline.md` |
| Base implementation on Cursor, not Copilot | Synthesis cross-source (High) |
| No marketplace | Grill #3 |
| Core plugin untouched | CLAUDE.md, synthesis |

---

## Recommended Approach

### Summary

Implement Kiro CLI support as **Cursor build.sh extension** with a **hybrid distribution model**, **single synthetic orchestrator agent**, **bash+jq MD→JSON generation** (upgrade to Node if frontmatter parsing fails in Fase 1), **chat-native gates with headless defaults**, **orchestrator-state.yml as progress SOT** with **deferred Fase 1.5 `todo`**, and **accept internal skills in slash list for MVP** while wiring **selective `skill://` resources** on the orchestrator.

### Per decision area

| Area | Recommendation | Confidence |
|------|----------------|------------|
| **1. Distribution** | **1C Hybrid** — `smoke-install.sh` → `~/.kiro/`; `smoke-cli.sh` → workspace `.kiro/` copy | High |
| **2. Progress** | **2B now + 2A in Fase 1.5** — `orchestrator-state.yml` authoritative; add `todo` when smoke green | High |
| **3. Gates** | **3A + 3B + 3C** — chat gates in text; headless defaults for CI; sequential questions for multi-select (init) | Medium |
| **4. Orchestrator** | **4A + 4D document** — `maister-orchestrator.json` with embedded hooks; optional `chat.defaultAgent` in README | High |
| **5. Internal skills** | **5B orchestration + 5A slash acceptance** for MVP; experiment 5C/5E in Fase 2 if needed | Medium |
| **6. MD→JSON** | **6A bash+jq** with `agent-tools.json` lookup; spike 6B if generator exceeds ~100 lines or parsing bugs | High (design); Medium (implementation) |

### Implementation bundle (Fase 0–1)

```
platforms/kiro-cli/
├── build.sh              # Cursor-derived, ~16 steps
├── agent-tools.json      # Role → tools whitelist
├── generate-agent-json.sh # or generate-agents.mjs (6A/6B)
├── overrides/            # quick-plan, quick-bugfix (from Cursor)
├── templates/            # agents-md, steering-maister-docs
├── hooks/                # adapted .sh (exit code 2)
├── smoke-install.sh      # → ~/.kiro/
└── smoke-cli.sh          # → workspace .kiro/
```

**Critical build outputs:** 24 JSON agents + `maister-explore.json` + `maister-orchestrator.json`; 22 skill dirs (14+8 merged commands); `steering/maister-workflows.md`; `settings/mcp.json`.

### Key assumptions

1. `jq` is available locally and in CI (already assumed by `validate-kiro` design).
2. `kiro-cli chat --no-interactive --trust-all-tools` can invoke `/maister-init` (open Q#9 — validate in Fase 1 smoke).
3. `preToolUse` on `subagent` exposes enough payload for bash guard (open Q#2 — Fase 2 verify).
4. Kiro does not hide slash commands for skills omitted from orchestrator `resources` (if false, escalate to 5E in Fase 2).

### Confidence in recommendation

**Medium overall** — architecture High; gate mitigation and internal skill visibility Medium; headless path Medium.

---

## Why Not Others

| Rejected | Rationale |
|----------|-----------|
| **1B Workspace-only** | Poor developer UX vs Cursor install story; grill #3 expects local install |
| **1D Symlink-primary** | Windows breakage; maintainer-only |
| **2D/2E No structured progress** | Breaks orchestrator resume contract |
| **2A todo in Fase 1** | Experimental API; synthesis explicitly defers — blocks MVP on unstable surface |
| **3D File-based gates** | Non-idiomatic; adds friction without precedent |
| **3E Tool permission gates** | Wrong abstraction; headless incompatible |
| **4B Default agent only** | Cannot embed hooks — violates semantic alignment with Cursor (keep hooks) |
| **4C Per-workflow orchestrators** | Over-engineering for v1; hook duplication |
| **5D Omit internal skills** | Breaks `codebase-analyzer` and Skill-tool delegation chain |
| **6D Hand-maintained JSON** | Drift risk; anti-pattern per build-pipeline |
| **6E Source MD tools:** | Scope violation — platform adapt in `platforms/kiro-cli/` only |

---

## Deferred Ideas

| Idea | Why deferred | When to revisit |
|------|--------------|-----------------|
| Kiro marketplace packaging | No marketplace API identified | If Kiro ships plugin registry |
| Unified CI auto-commit for all `maister-*` variants | Team decision (open Q#7) | Fase 4 release |
| `preCompact` hook parity | Kiro gap — no equivalent | If Kiro adds event or state-only proves insufficient |
| `KIRO_PLUGIN_ROOT` env in hooks | Medium confidence undocumented | Fase 1 empirical test |
| Playwright MCP `--e2e` in CI | P2 optional | Fase 3+ |
| Per-agent `tools:` in source MD (6E) | Core plugin change | If 3+ platforms need shared tool manifest |
| `skills-internal/` dual tree (5E) | Build complexity | If slash pollution confuses users in E2E |
| Node-based full build orchestrator | bash sufficient for MVP | If generator maintenance hurts |
| Public skill naming hide convention (5C) | Unverified Kiro behavior | After slash discovery experiment |
| Adding `platforms/kiro-cli` to upstream SkillPanel PR | Fork-first strategy | Post-stabilization on fork `master` |

---

## Convergence Note for Orchestrator

This document is **input to Phase 4 (Solution Convergence)** — the implementing agent should treat the recommended bundle as a **starting direction**, not a locked contract. Highest-uncertainty forks requiring smoke-test validation before locking:

1. Headless `/maister-init` (gate 3B)
2. `preToolUse` subagent payload (hooks Fase 2)
3. Whether `skill://`-only orchestrator resources affect slash discovery (5B vs 5A)

**Suggested next command:** `/maister-development` with task path `.maister/tasks/research/2026-06-07-kiro-cli-support`, scope Fase 0 + Fase 1 MVP.
