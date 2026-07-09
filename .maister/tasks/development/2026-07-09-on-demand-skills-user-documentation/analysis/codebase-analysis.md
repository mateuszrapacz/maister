# Codebase Analysis — On-Demand Skills User Documentation

## TL;DR

Documentation-only task: create `docs/on-demand-skills.md` and `docs/README.md`, extend `docs/commands.md` after line 197 with 10 missing Wave 1–3 slash commands, and trim `README.md` Quick Commands duplication. All 12 on-demand skills already exist in `plugins/maister/skills/` with rich `SKILL.md` specs; user docs must be navigational (2–4 sentences + when/when-not), not copies of skill bodies. Four skills (`grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review`) lack thin command wrappers — verify slash-command resolution before asserting `/maister:grill-me` and `/maister:thermos` in user docs.

## Key Decisions

- **Primary user guide** — `docs/on-demand-skills.md` (locked D1); hub at `docs/README.md` (D2).
- **Single-source hierarchy** — `SKILL.md` = behavior; `on-demand-skills.md` = human when/why; `commands.md` = slash reference; `CLAUDE.md` = agent catalog (optional one-line cross-link only).
- **Command naming** — Document Claude Code `/maister:…` as primary; short Cursor `/maister-…` callout (D4).
- **Bundle A–D** — Keep naming from `CLAUDE.md`; use commands in examples, skill names in chaining logic; add mermaid flows in guide (D6).
- **README P4 trim** — Replace Quick Commands table (10 rows) + four bundle paragraphs with one-liner + links to guide and `commands.md`.
- **ADR-008** — Document per-skill: `requirements-critic` soft-suggested only in `development`; `transcript-critic` soft-suggested only in `product-design`; never auto-invoked.

## Open Questions / Risks

- **Unverified slash commands** — `grill-me`, `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` have plain `name:` frontmatter (no `maister:` prefix) and no files under `plugins/maister/commands/`. README already lists `/maister:grill-me` and `/maister:thermos` but empirical invocation is unconfirmed; document as "explicit request" if slash resolution fails.
- **README vs guide drift** — Quick Commands table omits `grill-me` and `thermos` while bundle prose references them; P4 trim must not leave stale partial lists.
- **Internal docs in hub** — Exclude `cursor-agent-implementation-plan.md` and `cursor-e2e-checklist.md` from `docs/README.md` (per plan).
- **No build step** — Documentation-only; link verification is manual (`grep` checklist in plan).

---

## 1. Task Context

| Field | Value |
|-------|-------|
| **Plan** | `.maister/plans/2026-07-09-on-demand-skills-user-documentation.md` (277 lines, authoritative spec) |
| **Scope** | User-facing docs in `docs/` + `README.md` navigation; no changes to `plugins/maister/skills/*/SKILL.md` or generated platform plugins |
| **Phases** | P1 guide → P2 hub → P3 commands extension → P4 README trim (+ optional `CLAUDE.md` cross-link) |

---

## 2. Current Documentation Landscape

### 2.1 Existing files (relevant)

| Path | Lines / role | Coverage | Gap for this task |
|------|----------------|----------|-------------------|
| `README.md` | ~363 | Install, orchestrators, Quick Commands table (10 cmds), Bundle A–D prose, Learn More links | Duplicates bundle detail; missing `grill-me`/`thermos` in table; no `docs/README.md` link |
| `docs/commands.md` | 217 | Orchestrators, reviews, standards, quick-plan/dev/bugfix | **Ends at `quick-bugfix` (L217)** — all 10 Wave 1–3 commands missing |
| `docs/workflows.md` | ~259 | Five orchestrator phase tables | No on-demand skills; **Internal Skills** section (L247+) is inverse pattern (auto-invoked, not user-called) |
| `plugins/maister/CLAUDE.md` | ~800 | Richest catalog: skills, bundles A–D, command tables | Agent-oriented; not end-user navigation |
| `plugins/maister/skills/*/SKILL.md` | 12 in-scope | Full behavioral spec | Hard to discover; no "start here" |
| `docs/kiro-cli-support.md` | — | Platform guide with **Related docs** block | Template for hub cross-links |
| `docs/cursor-agent-support.md`, `docs/kilo-cli-support.md` | — | Platform guides | Link from hub, not modified |

### 2.2 Planned deliverables (not yet present)

- `docs/on-demand-skills.md` — **does not exist**
- `docs/README.md` — **does not exist**

### 2.3 De facto documentation hub today

`README.md` § Learn More (L356–362) links to `workflows.md`, `commands.md`, and platform guides. After P2/P4, `docs/README.md` becomes the canonical docs index; root README keeps onboarding and points there first.

---

## 3. Skill & Command Inventory (Wave 1–3)

### 3.1 Twelve on-demand skills in scope

| Wave | Skill | Command wrapper in `commands/`? | Auto in orchestrator? |
|------|-------|--------------------------------|----------------------|
| 1 | `transcript-critic` | Yes (`quick-transcript-critic.md`) | Soft suggest in `product-design` only (ADR-008) |
| 1 | `requirements-critic` | Yes (`quick-requirements-critic.md`) | Soft suggest in `development` only (ADR-008) |
| 1 | `problem-classifier` | Yes (`quick-problem-classifier.md`) | No |
| 1 | `grill-me` | **No** | No |
| 1 | `thermo-nuclear-review` | **No** (skill/agent invocation) | No |
| 1 | `thermo-nuclear-code-quality-review` | **No** (skill/agent invocation) | No |
| 1 | `thermos` | **No** | No |
| 2 | `linguistic-boundary-verifier` | Yes (`reviews-linguistic-boundaries.md`) | No |
| 2 | `test-strategy-reviewer` | Yes (`reviews-test-strategy.md`) | No |
| 2 | `metaprogram-classifier` | Yes (`quick-metaprogram-classifier.md`) | No |
| 3 | `context-distiller` | Yes (`modeling-context-distiller.md`) | No |
| 3 | `aggregate-designer` | Yes (`modeling-aggregate-designer.md`) | No |

**Command wrapper count**: 8 of 12 skills have thin wrappers under `plugins/maister/commands/`. The four without wrappers use plain kebab `name:` in skill frontmatter (e.g. `grill-me`, `thermos`) rather than `maister:…` prefix used by wrapped commands.

### 3.2 Commands to add in `docs/commands.md` (P3)

Insert after Quick Commands section (~line 197), mirroring existing `### /maister:…` + **When to use** + link pattern:

1. `/maister:quick-transcript-critic`
2. `/maister:quick-requirements-critic`
3. `/maister:quick-problem-classifier`
4. `/maister:quick-metaprogram-classifier`
5. `/maister:modeling-context-distiller`
6. `/maister:modeling-aggregate-designer`
7. `/maister:reviews-linguistic-boundaries`
8. `/maister:reviews-test-strategy`
9. `/maister:grill-me` (pending verification)
10. `/maister:thermos` (+ note wrapping both thermo-nuclear skills)

### 3.3 Platform naming

| Platform | Prefix | Example |
|----------|--------|---------|
| Claude Code | `/maister:` | `/maister:quick-problem-classifier` |
| Cursor Agent | `/maister-` | `/maister-quick-problem-classifier` |
| Kiro CLI | Shortcuts + `/maister-*` | `/grill-me`, `/thermos`, `/quick-plan` (see `README.md` L278) |

Document Claude form as primary; one short callout for Cursor hyphen form. Kiro shortcuts can be referenced from platform guide links in hub.

---

## 4. Documentation Patterns & Templates

### 4.1 Best templates to follow

| Template | Use for |
|----------|---------|
| `docs/workflows.md` | Overall structure: H1 title, H2 categories, tables, phase/resume blocks |
| `docs/commands.md` | Per-command entry: `###` heading, lead paragraph, optional flag table, **When to use**, task directory notes |
| `docs/kiro-cli-support.md` | **Related docs** block at top with relative `docs/` links |

### 4.2 Established conventions

- H1 document title; H2 for major sections; H3 per command with `/maister:` prefix in headings
- Relative links within `docs/` (e.g. `[On-Demand Skills Guide](on-demand-skills.md)`)
- English throughout (consistent with existing `docs/`)

### 4.3 Anti-patterns (avoid)

| Anti-pattern | Why |
|--------------|-----|
| Duplicating Bundle A–D prose across README and guide | Creates drift; P4 moves bundles to guide only |
| Asserting slash commands without command wrappers | Four skills may be explicit-request-only |
| Copy-pasting `SKILL.md` bodies | Violates plan non-goals; link to `plugins/maister/skills/<name>/SKILL.md` instead |
| Treating on-demand skills as orchestrator phases | Key user message: manual chaining via Recommended Next Steps |

### 4.4 Single-source hierarchy

```
SKILL.md                    → complete behavior, guards, algorithms
docs/on-demand-skills.md    → when/why, bundles, decision tree, 2–4 sentences per skill
docs/commands.md            → slash syntax, flags, short "when to use" + link to guide
plugins/maister/CLAUDE.md   → agent catalog (optional cross-link to human guide)
```

### 4.5 Per-skill subsection template (`on-demand-skills.md` §5)

For each of 12 skills:

- What it does (2–4 sentences)
- When to use / when not to use
- Command (or explicit-request phrasing if unverified)
- Output type (report vs interactive session)
- Suggested next skill
- Link: `../plugins/maister/skills/<name>/SKILL.md` (relative from `docs/`)

### 4.6 Inverse pattern reference

`docs/workflows.md` § Internal Skills (L247+) documents skills users **do not** call directly (`codebase-analyzer`, `implementation-plan-executor`, etc.). On-demand guide is the complement: skills users **do** invoke manually, outside orchestrator phase pipelines.

---

## 5. Target File Structure (post-implementation)

```
docs/
├── README.md                 ← NEW hub
├── on-demand-skills.md       ← NEW main guide
├── workflows.md              ← unchanged (orchestrators)
├── commands.md               ← extend (~10 new entries)
├── cursor-agent-support.md   ← linked from hub
├── kiro-cli-support.md       ← linked from hub
├── kilo-cli-support.md       ← linked from hub
├── cursor-agent-implementation-plan.md   ← excluded from hub
└── cursor-e2e-checklist.md               ← excluded from hub
```

---

## 6. Integration Points by Phase

### P1 — `docs/on-demand-skills.md`

**Content outline** (from plan):

1. Introduction — on-demand vs orchestrator; manual invocation; `disable-model-invocation` in plain language
2. How to invoke — platform callout
3. Decision tree — which skill to use (ASCII or mermaid)
4. Bundles A–D — mermaid flow diagrams
5. Skill catalog — 12 subsections per template above
6. Common scenarios — post-meeting, Jira ticket, new domain RC, PR review
7. Related docs — `language-md-convention.md`, `workflows.md`, `commands.md`

**Prerequisite**: Live verification of `/maister:grill-me` and `/maister:thermos` before writing those entries as slash commands.

### P2 — `docs/README.md`

- Intro: "Start here for Maister user documentation"
- Link table: root README, on-demand-skills, workflows, commands, platform guides
- Suggested reading order (new users vs contributors)
- Model **Related docs** style from `kiro-cli-support.md`

### P3 — `docs/commands.md`

- Extension point: after `quick-bugfix` block (current EOF ~L217)
- New H2 section suggested: **On-Demand Skills** or split under **Requirements & Modeling** + **Reviews** to mirror `CLAUDE.md`
- Each entry: 2–4 lines + `See [On-Demand Skills Guide](on-demand-skills.md) for when to use.`

### P4 — `README.md` navigation

| Location | Change |
|----------|--------|
| § Learn More (L356+) | Add `docs/README.md` as **first** link |
| § Quick Commands (L103–127) | Replace table + bundle paragraphs with one-liner + links to `docs/on-demand-skills.md` and `docs/commands.md` |
| Optional | `plugins/maister/CLAUDE.md` — one line under Available Skills pointing to human guide |

---

## 7. Bundle Flows (content to centralize in guide)

| Bundle | Chain | Notes |
|--------|-------|-------|
| **A** — Requirements quality | transcript-critic → requirements-critic → problem-classifier | When RC signals appear |
| **B** — DDD modeling | problem-classifier → context-distiller → aggregate-designer → linguistic-boundary-verifier | When `language.md` exists for LBV |
| **C** — Architecture review | linguistic-boundary-verifier → test-strategy-reviewer → optional thermos | Link `language-md-convention.md` |
| **D** — Stakeholder communication | metaprogram-classifier → grill-me | Stress-test before difficult conversation |

All chains are **manual** — via each skill's Recommended Next Steps, not orchestrator wiring.

---

## 8. Key Source Files for Implementers

| Priority | Path | Role |
|----------|------|------|
| 1 | `.maister/plans/2026-07-09-on-demand-skills-user-documentation.md` | Authoritative spec, acceptance criteria, verification grep script |
| 2 | `plugins/maister/CLAUDE.md` | Skill descriptions, bundle prose, command tables (§ Requirements & Modeling, Review & Utility) |
| 3 | `docs/commands.md` | Extension target and entry-format template |
| 4 | `docs/workflows.md` | Structural template; Internal Skills inverse pattern |
| 5 | `README.md` | P4 trim targets (L103–127, L356+) |
| 6 | `plugins/maister/skills/{transcript-critic,requirements-critic,development,product-design}/SKILL.md` | ADR-008 soft-suggestion line refs (~L266–267) |
| 7 | `plugins/maister/commands/*.md` | Confirmed slash command names for 8 wrapped skills |
| 8 | `docs/kiro-cli-support.md` | Related docs block pattern |

### Per-skill `SKILL.md` paths (link targets)

```
plugins/maister/skills/transcript-critic/SKILL.md
plugins/maister/skills/requirements-critic/SKILL.md
plugins/maister/skills/problem-classifier/SKILL.md
plugins/maister/skills/grill-me/SKILL.md
plugins/maister/skills/thermo-nuclear-review/SKILL.md
plugins/maister/skills/thermo-nuclear-code-quality-review/SKILL.md
plugins/maister/skills/thermos/SKILL.md
plugins/maister/skills/linguistic-boundary-verifier/SKILL.md
plugins/maister/skills/test-strategy-reviewer/SKILL.md
plugins/maister/skills/metaprogram-classifier/SKILL.md
plugins/maister/skills/context-distiller/SKILL.md
plugins/maister/skills/aggregate-designer/SKILL.md
```

---

## 9. Verification Checklist (from plan)

```bash
# Link sanity
grep -r 'on-demand-skills' README.md docs/

# Commands coverage
for cmd in quick-transcript-critic quick-requirements-critic quick-problem-classifier \
  quick-metaprogram-classifier modeling-context-distiller modeling-aggregate-designer \
  reviews-linguistic-boundaries reviews-test-strategy grill-me thermos; do
  grep -q "maister:${cmd}" docs/commands.md || echo "MISSING: $cmd"
done
```

No `make build` required — documentation-only change.

---

## 10. Complexity Assessment

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| **Implementation effort** | Moderate | Mostly greenfield prose in 2 files + ~10 command stubs + README trim; no code/plugin changes |
| **Content risk** | Low–medium | Factual accuracy depends on slash-command verification for 4 skills |
| **Maintenance** | Low | Single guide + thin command entries; `SKILL.md` remains source of truth |
| **Cross-link surface** | ~15 internal links across README, hub, guide, commands |

---

## 11. Recommendations for Implementation Order

1. **Verify** `/maister:grill-me` and `/maister:thermos` in a live session (or default to explicit-request wording).
2. **P1** — Write `docs/on-demand-skills.md` (highest user value; unblocks P3 cross-links).
3. **P2** — Create `docs/README.md` hub referencing P1 output.
4. **P3** — Extend `docs/commands.md` with 10 entries linking to guide.
5. **P4** — Trim `README.md`; add Learn More link; optional `CLAUDE.md` one-liner.
6. **Verify** with plan grep script and manual link click-through.

---

## 12. Files Discovered Summary

| Category | Count |
|----------|-------|
| Existing `docs/` user-facing files | 6 (commands, workflows, 3 platform guides) |
| Internal/WIP docs (exclude from hub) | 2 |
| Wave 1–3 skills (`SKILL.md`) | 12 |
| Command wrappers for in-scope skills | 8 |
| Files to **create** | 2 |
| Files to **modify** | 2–3 (`commands.md`, `README.md`, optional `CLAUDE.md`) |
| **Total key paths referenced** | 22+ |
