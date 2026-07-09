# Gap Analysis: On-Demand Skills User Documentation

## TL;DR

Documentation-only task with zero plugin code gaps — all 12 Wave 1–3 skills exist with complete `SKILL.md` specs. The gap is entirely user-facing navigation: two missing files (`docs/on-demand-skills.md`, `docs/README.md`), 10 missing command entries in `docs/commands.md`, and duplicated bundle prose in `README.md`. Phase 1 clarifications lock invocation wording. Effort is moderate prose across P1–P4; risk is low.

## Key Decisions

- **D1–D6 (plan locked)** — Guide at `docs/on-demand-skills.md`, hub at `docs/README.md`, English, Claude `/maister:` primary + Cursor callout, 2–4 sentences per skill linking to `SKILL.md`, Bundle A–D with mermaid.
- **Phase 1 overrides** — `grill-me`/`thermos`: explicit request + Cursor platform callout; thermo-nuclear skills only under `thermos` entry; no `CLAUDE.md` cross-link; minimal Kiro in guide.
- **Single-source hierarchy** — `SKILL.md` = behavior; guide = when/why; `commands.md` = slash reference.

## Open Questions / Risks

- **README ↔ guide drift** — P4 trim must replace entire Quick Commands block atomically.
- **Internal docs exclusion** — Hub must not index `cursor-agent-implementation-plan.md` or `cursor-e2e-checklist.md`.
- **ADR-008 precision** — `requirements-critic` soft-suggested only in `development`; `transcript-critic` only in `product-design`.

---

## Summary

- **Risk Level**: Low
- **Estimated Effort**: Medium
- **Detected Characteristics**: modifies_existing_code, creates_new_entities

## Task Characteristics

- Has reproducible defect: no
- Modifies existing code: yes
- Creates new entities: yes
- Involves data operations: no
- UI heavy: no

## Gaps Identified

### Missing Features

- `docs/on-demand-skills.md` — full 7-section user guide (P1)
- `docs/README.md` — documentation hub with link table and reading order (P2)

### Incomplete Features

- `docs/commands.md` — ends at `quick-bugfix` (L217); 0/10 Wave 1–3 commands documented (P3)
- `README.md` § Quick Commands — 10-row table + bundle prose duplicates `CLAUDE.md`; missing `grill-me`/`thermos` in table (P4)
- `README.md` § Learn More — no `docs/README.md` hub link (P4)

### Behavioral Changes Needed

- README Quick Commands: replace table + bundle paragraphs with one-liner + links to guide and `commands.md`
- Learn More: prepend `docs/README.md` as first link

## User Journey Impact Assessment

| Dimension | Current | After | Assessment |
|-----------|---------|-------|------------|
| Reachability | README → partial table; no hub | README → hub → guide/commands | ✅ |
| Discoverability | 4/10 | 8/10 | +4 |
| Flow Integration | Bundles split across README/CLAUDE | Bundles centralized in guide | ✅ |
| Multi-persona | Users vs contributors conflated | Clear separation via hub | ✅ |

## Issues Requiring Decisions

No scope decisions needed — Phase 1 locked D1–D7 and invocation model.

## Recommendations

1. P1 first — unblocks P3 cross-links
2. Atomic P4 — replace entire L103–127 block in one edit
3. Thermos consolidation — single catalog entry covering both thermo-nuclear subagents
4. ADR-008 block in guide §1 with per-skill mapping
5. Skip `CLAUDE.md` cross-link per user decision

## Risk Assessment

- **Complexity Risk**: Low — documentation-only
- **Integration Risk**: Low — relative links within `docs/`
- **Regression Risk**: Medium — doc drift if P4 partial; mitigated by atomic trim
