# On-Demand Skills User Documentation — Implementation Plan

**Date**: 2026-07-09  
**Scope**: User-facing documentation in `docs/` and navigation in `README.md` (source plugin `plugins/maister/` unchanged unless cross-links added to `CLAUDE.md`)  
**Origin**: User conversation — Wave 1–3 (AJ) skills are documented across `README.md` (short table), `plugins/maister/CLAUDE.md` (agent catalog), and individual `skills/*/SKILL.md` files, but there is no single human-oriented guide explaining what each skill does, when to invoke it, and how on-demand skills relate to orchestrator workflows.  
**Status**: Planned — implementation pending.

**How to use this file**: Work phase-by-phase (P1 → P4). After content changes, verify links manually (no generated-plugin rebuild required). Do **not** duplicate full skill bodies from `SKILL.md` — link to them for depth.

---

## Problem statement

Maister fork adds **12 on-demand skills** (Wave 1–3) plus supporting commands. Users cannot answer these questions from one place:

1. **Which skills exist** beyond the five orchestrators (`development`, `research`, `performance`, `migration`, `product-design`)?
2. **Are they automatic** in `/maister:development` or must they be invoked manually?
3. **What does each skill do** and **when should I call it**?
4. **How do Bundle A–D chains work** in practice (meeting → ticket → modeling → PR review)?

### Current documentation map

| Location | What it covers | Gap |
|----------|----------------|-----|
| `README.md` | Install, orchestrators, one-line Quick Commands table, Bundle A–D one-liners | No per-skill detail; no manual-vs-auto; incomplete command list (`grill-me`, `thermos`, `thermo-nuclear-*` missing from table) |
| `docs/workflows.md` | Orchestrator phases only | No on-demand skills |
| `docs/commands.md` | Workflows, reviews (upstream set), quick-plan/dev/bugfix | **Missing all Wave 1–3 commands** |
| `plugins/maister/CLAUDE.md` | Full skill catalog, bundles, "Explicit request only" | Written for agents, not end-user navigation |
| `plugins/maister/skills/*/SKILL.md` | Complete specification | Hard to discover; no "start here" |

There is **no `docs/README.md`** hub — `README.md` § Learn More is the de facto index.

---

## Goals

1. **Single entry point** for user documentation (`docs/README.md`).
2. **One comprehensive user guide** for on-demand skills (`docs/on-demand-skills.md`).
3. **Complete command reference** — extend `docs/commands.md` with missing Wave 1–3 entries (short form + link to guide).
4. **Reduce README duplication** — keep onboarding; link to guide for skill details.
5. **Preserve single source of truth** — orchestration logic stays in `SKILL.md`; user docs are navigational and decision-oriented.

## Non-goals

- Translating all user docs to Polish (match existing English `docs/` unless user requests PL later).
- Duplicating wizard steps from `aggregate-designer/SKILL.md` or algorithm details from `context-distiller/SKILL.md`.
- Changing skill invocation behavior (still on-demand / explicit request; ADR-008 soft suggestions unchanged).
- Platform build changes (`platforms/cursor/`, generated variants).
- Moving or renaming skills/commands.

---

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | Primary user guide file | **`docs/on-demand-skills.md`** |
| D2 | Documentation hub | **`docs/README.md`** — map of all user docs |
| D3 | Language | **English** — consistent with `docs/workflows.md`, `docs/commands.md` |
| D4 | Command naming in docs | Document **Claude Code** form (`/maister:…`) as primary; note **Cursor** hyphen form (`/maister-…`) in a short platform callout |
| D5 | Skill depth | User guide: 2–4 sentences + when/when-not + command + output type + next step; full detail → link to `plugins/maister/skills/<name>/SKILL.md` |
| D6 | Bundles | Keep Bundle A–D naming from `CLAUDE.md`; add mermaid flow diagrams in the guide |
| D7 | `CLAUDE.md` cross-link | Add one line under "Available Skills" pointing to `docs/on-demand-skills.md` for human readers (optional P4) |

---

## Skill inventory (in scope for the guide)

### Wave 1 — Requirements, decisions, branch review

| Skill | Command (Claude Code) | Auto in orchestrator? |
|-------|----------------------|------------------------|
| `transcript-critic` | `/maister:quick-transcript-critic` | Soft suggest only in `product-design` (ADR-008, `SKILL.md:267`) |
| `requirements-critic` | `/maister:quick-requirements-critic` | Soft suggest only in `development` (ADR-008, `SKILL.md:266`) |
| `problem-classifier` | `/maister:quick-problem-classifier` | No |
| `grill-me` | `/maister:grill-me`⚠️ | No |
| `thermo-nuclear-review` | skill / agent invocation⚠️ | No |
| `thermo-nuclear-code-quality-review` | skill / agent invocation⚠️ | No |
| `thermos` | `/maister:thermos`⚠️ (or explicit request) | No |

⚠️ **Unverified**: `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` have plain kebab `name:` frontmatter (no `maister:` prefix) and **no command wrapper** in `plugins/maister/commands/` — unlike `problem-classifier`/`transcript-critic`/`requirements-critic`, which are exposed via thin command wrappers. Per `.maister/docs/standards/global/plugin-development.md` § Skill Frontmatter Schema, user-invocable skills should carry the `maister:` prefix; these four don't, yet README already documents them as slash commands. **Before P1 writing**, do a quick empirical check (invoke `/maister:grill-me` in a live session) to confirm these actually resolve as slash commands vs. natural-language-only invocation. If unconfirmed, document them in the guide as "explicit request" (e.g. "ask for a thermos review") rather than asserting a slash command.

### Wave 2 — Architecture language, tests, communication

| Skill | Command | Auto? |
|-------|---------|-------|
| `linguistic-boundary-verifier` | `/maister:reviews-linguistic-boundaries` | No |
| `test-strategy-reviewer` | `/maister:reviews-test-strategy` | No |
| `metaprogram-classifier` | `/maister:quick-metaprogram-classifier` | No |

### Wave 3 — Strategic DDD

| Skill | Command | Auto? |
|-------|---------|-------|
| `context-distiller` | `/maister:modeling-context-distiller` | No |
| `aggregate-designer` | `/maister:modeling-aggregate-designer` | No |

**Key message for users**: On-demand skills are **not phases** of `/maister:development`. Chain them manually via Bundle A–D or each skill's "Recommended next steps".

---

## Target documentation structure

```
docs/
├── README.md                 ← NEW: documentation hub
├── on-demand-skills.md       ← NEW: main user guide (this plan's deliverable)
├── workflows.md              ← existing (orchestrators)
├── commands.md               ← extend (missing commands)
├── cursor-agent-support.md   ← existing
├── kiro-cli-support.md       ← existing
└── kilo-cli-support.md       ← existing
```

Note: `docs/` also contains `cursor-agent-implementation-plan.md` and `cursor-e2e-checklist.md` — intentionally excluded from the hub as internal/WIP artifacts, not user-facing docs.

### `docs/on-demand-skills.md` — outline

1. **Introduction**
   - On-demand vs orchestrator workflows
   - Manual invocation (slash command or explicit request)
   - `disable-model-invocation` / "Explicit request only" in plain language

2. **How to invoke**
   - Claude Code: `/maister:command`
   - Cursor: `/maister-command`
   - Trigger phrases (summary table, not full guards)

3. **Which skill should I use?** — decision tree (ASCII or mermaid)

4. **Recommended bundles (A–D)**
   - Bundle A: requirements quality (transcript → requirements → problem-classifier)
   - Bundle B: DDD modeling (problem-classifier → context-distiller → aggregate-designer → linguistic-boundary-verifier)
   - Bundle C: architecture review (linguistic-boundary-verifier → test-strategy-reviewer → optional thermos)
   - Bundle D: stakeholder communication (metaprogram-classifier → grill-me)
   - Note: chains are manual; "Recommended next steps" in each skill, not an orchestrator

5. **Skill catalog** — one subsection per skill:
   - What it does
   - When to use / when not to use
   - Command
   - Output type (report vs interactive session)
   - Suggested next skill
   - Link: `plugins/maister/skills/<name>/SKILL.md`

6. **Common scenarios** (worked examples)
   - Post-meeting notes → implementation
   - Jira ticket before spec
   - New domain with resource contention
   - PR review before merge

7. **Related docs**
   - `language-md-convention.md` (for Bundle C)
   - `docs/workflows.md`, `docs/commands.md`

---

## Implementation phases

### P1 — Create `docs/on-demand-skills.md` (highest value)

- [ ] **Prerequisite**: Verify `/maister:grill-me` and `/maister:thermos` actually resolve as slash commands in a live Claude Code session (see ⚠️ note in Skill inventory above). If unconfirmed, phrase their invocation in the guide as explicit natural-language request instead of a slash command.
- [ ] Write sections 1–7 per outline above
- [ ] Include mermaid diagrams for Bundle A–D
- [ ] Document ADR-008 behavior correctly and per-skill: `requirements-critic` soft-suggested only in `development` (`SKILL.md:266`); `transcript-critic` soft-suggested only in `product-design` (`SKILL.md:267`) — never both, never auto-invoked
- [ ] Document all 12 skills with consistent subsection template
- [ ] Add platform callout (Claude Code `maister:` vs Cursor `maister-`)

**Acceptance**: A new user can answer "what is `context-distiller` and when do I run it?" without opening `SKILL.md`.

---

### P2 — Create `docs/README.md` hub

- [ ] Short intro: "Start here for Maister user documentation"
- [ ] Link table:

  | Doc | Purpose |
  |-----|---------|
  | `README.md` (repo root) | Install, first workflow |
  | `on-demand-skills.md` | Wave 1–3 skills, bundles, when to use |
  | `workflows.md` | Orchestrator phases |
  | `commands.md` | Command reference |
  | Platform guides | Cursor / Kiro / Kilo |

- [ ] Suggested reading order for new users vs contributors

**Acceptance**: `docs/README.md` is the single navigation entry for all user docs.

---

### P3 — Extend `docs/commands.md`

Add sections (mirror style of existing Reviews & Quick Commands):

- [ ] `/maister:quick-transcript-critic`
- [ ] `/maister:quick-requirements-critic`
- [ ] `/maister:quick-problem-classifier`
- [ ] `/maister:quick-metaprogram-classifier`
- [ ] `/maister:modeling-context-distiller`
- [ ] `/maister:modeling-aggregate-designer`
- [ ] `/maister:reviews-linguistic-boundaries`
- [ ] `/maister:reviews-test-strategy`
- [ ] `/maister:grill-me`
- [ ] `/maister:thermos` (+ note: wraps thermo-nuclear-review + thermo-nuclear-code-quality-review)

Each entry: 2–4 lines + "See [On-Demand Skills Guide](on-demand-skills.md) for when to use."

**Acceptance**: Every command listed in README Quick Commands table has a matching `docs/commands.md` entry.

---

### P4 — Update navigation (trim duplication)

- [ ] `README.md` § Learn More — add `docs/README.md` as first link
- [ ] `README.md` § Quick Commands — replace long table + bundle paragraphs with:
  - One-line summary
  - Link to `docs/on-demand-skills.md`
  - Link to `docs/commands.md`
- [ ] (Optional) `plugins/maister/CLAUDE.md` — under "Available Skills", add: *Human-readable guide: `docs/on-demand-skills.md`*

**Acceptance**: README stays scannable; no conflicting bundle descriptions between README and guide.

---

## Files to create or modify

| Action | Path |
|--------|------|
| **Create** | `docs/on-demand-skills.md` |
| **Create** | `docs/README.md` |
| **Modify** | `docs/commands.md` |
| **Modify** | `README.md` (Learn More + Quick Commands) |
| **Optional modify** | `plugins/maister/CLAUDE.md` (cross-link only) |

**Do not modify**: `plugins/maister/skills/*/SKILL.md` (source of truth unchanged), generated platform plugins.

---

## Acceptance criteria (overall)

- [ ] New user can find all user docs starting from `docs/README.md`
- [ ] All 12 Wave 1–3 skills documented in `docs/on-demand-skills.md` with when-to-use guidance
- [ ] Bundles A–D explained with example flows
- [ ] Manual vs orchestrator invocation clearly stated
- [ ] `docs/commands.md` complete for Wave 1–3 commands
- [ ] README links to guide; no stale duplicate bundle prose
- [ ] Internal links resolve (relative paths within `docs/`)
- [ ] No copy-paste of large sections from `SKILL.md` (link instead)

---

## Verification checklist

```bash
# Link sanity (manual)
grep -r 'on-demand-skills' README.md docs/

# Commands coverage — every Wave 1–3 command appears in commands.md
# Note: use grep -E (or ripgrep) — macOS/BSD grep does not support \| alternation without -E
for cmd in quick-transcript-critic quick-requirements-critic quick-problem-classifier \
  quick-metaprogram-classifier modeling-context-distiller modeling-aggregate-designer \
  reviews-linguistic-boundaries reviews-test-strategy grill-me thermos; do
  grep -q "maister:${cmd}" docs/commands.md || echo "MISSING: $cmd"
done
```

No `make build` required — documentation-only change.

---

## References

- `plugins/maister/CLAUDE.md` — § Requirements & Modeling Skills, Review & Utility Skills, Bundles A–D
- `plugins/maister/skills/development/SKILL.md` — ADR-008 optional suggestion (line ~266)
- `.maister/tasks/research/2026-06-14-upstream-sync-consistency/analysis/findings/upstream-diff-report.md` — fork-added AJ skills context
- `.maister/docs/standards/global/plugin-development.md` — docs principles (SKILL.md as source of truth; commands as thin wrappers)
