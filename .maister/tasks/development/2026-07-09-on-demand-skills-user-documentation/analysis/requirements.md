# Requirements — On-Demand Skills User Documentation

## Initial Description

Implement user-facing documentation for Wave 1–3 on-demand skills per plan at `.maister/plans/2026-07-09-on-demand-skills-user-documentation.md`.

Deliverables:
- `docs/on-demand-skills.md` — comprehensive user guide
- `docs/README.md` — documentation hub
- Extend `docs/commands.md` with 10 Wave 1–3 commands
- Update `README.md` navigation (Learn More + Quick Commands trim)

## Q&A from Clarification Rounds

### Phase 1 Clarifications

| Topic | Decision |
|-------|----------|
| grill-me / thermos invocation | Explicit request primary; Cursor `/maister-grill-me`, `/maister-thermos` callout |
| thermo-nuclear skills | Document only via combined `thermos` entry |
| CLAUDE.md cross-link | Skip — keep agent-only catalog |
| Kiro detail | Minimal callout; link to `docs/kiro-cli-support.md` |

### Phase 5 Requirements

| Question | Answer |
|----------|--------|
| User journey | New users: README → `docs/README.md` hub → `on-demand-skills.md`; contributors use `CLAUDE.md` |
| Reuse patterns | `docs/commands.md` entry format, `docs/kiro-cli-support.md` Related docs block, `CLAUDE.md` bundle naming |
| Visual assets | No mockups; mermaid diagrams for bundles A–D and decision tree |

## Similar Features Identified

| Reference | Reuse for |
|-----------|-----------|
| `docs/commands.md` | Command entry structure (`###`, When to use, flags) |
| `docs/workflows.md` | Section structure; Internal Skills inverse pattern |
| `docs/kiro-cli-support.md` | Related docs block at hub top |
| `plugins/maister/CLAUDE.md` | Bundle A–D naming, skill one-liners (link, don't copy) |
| `plugins/maister/skills/*/SKILL.md` | When/when-not, Recommended next steps (link for depth) |

## Functional Requirements Summary

1. **docs/on-demand-skills.md** — 7 sections per plan outline; 12 skill subsections (thermo-nuclear via thermos); mermaid for bundles + decision tree; ADR-008 behavior documented
2. **docs/README.md** — hub with link table, reading order; exclude internal WIP docs
3. **docs/commands.md** — 10 new entries after `quick-bugfix`; each links to guide
4. **README.md** — Learn More adds hub first; Quick Commands trimmed to one-liner + links

## Reusability Opportunities

- Plan file (`.maister/plans/2026-07-09-on-demand-skills-user-documentation.md`) is authoritative spec — spec should reference, not duplicate
- Verification grep script from plan for acceptance testing
- Existing README Quick Commands table as content source for command one-liners

## Scope Boundaries

### In scope
- English user docs in `docs/` + README navigation
- 10 command entries in `commands.md`
- Mermaid diagrams in guide

### Out of scope
- `plugins/maister/skills/*/SKILL.md` changes
- `plugins/maister/CLAUDE.md` cross-link
- Platform build / generated plugin changes
- Polish translation
- Copy-pasting SKILL.md algorithm sections

## Technical Considerations

- Documentation-only — no `make build` required
- Relative links within `docs/`; `../plugins/maister/skills/<name>/SKILL.md` for skill depth
- Claude Code `/maister:` primary; Cursor `/maister-` hyphen callout
- Manual link verification via plan grep script
