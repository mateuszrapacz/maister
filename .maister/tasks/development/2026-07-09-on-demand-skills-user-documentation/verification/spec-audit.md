# Specification Audit Report

**Spec**: `implementation/spec.md`  
**Audit type**: Pre-implementation  
**Date**: 2026-07-09

## TL;DR

The spec is **implementation-ready** for a documentation-only task. It aligns with Phase 1 clarifications and matches the codebase skill/command inventory. **Verdict: pass-with-concerns** — 0 Critical, 1 High, 4 Medium, 5 Low. No blockers to starting P1.

## Key Decisions

- **Phase 1 overrides plan D7** — Spec D7 (no CLAUDE.md cross-link) correctly supersedes plan optional cross-link.
- **10 catalog entries cover 12 skills** — Thermo-nuclear sub-skills consolidated under `thermos` per D6.
- **8 command wrappers verified** — grill-me/thermos have no wrappers; FR-6 explicit-request primary is correct.

## Open Questions / Risks

- **FR-13 vs FR-6 tension** — commands.md entries use `/maister:grill-me` headings while Claude Code may not resolve them; lead with explicit-request wording.
- **P4 atomic trim** — README L103–127 must be replaced in one edit.
- **grill-me/thermos lack Recommended next steps** — Catalog "Suggested next" must derive from bundle context.

---

## Verdict Summary

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 1 |
| Medium | 4 |
| Low | 5 |

**Overall**: pass-with-concerns

## High Findings

**H1 — Catalog "Suggested next" has no SKILL.md source for grill-me and thermos**

Skills lack "Recommended next steps" sections. P1 writer must use bundle pairing or "see Bundles A–D".

## Medium Findings

- **M1** — FR-8 language-md-convention path should use full relative path from `docs/`
- **M2** — FR-6/FR-13 dual treatment for grill-me/thermos in commands.md — define entry template with explicit-request lead paragraph
- **M3** — requirements.md says 12 subsections; spec correctly says 10 (upstream drift)
- **M4** — README bundle prose duplication — enforce atomic P4 replace

## Recommendations Before Implementation

1. Fix FR-8 language-md-convention path during P1 writing
2. Add catalog-template exception for skills without Recommended Next Steps
3. Define commands.md boilerplate for explicit-request-only skills
4. Proceed P1 → P4 in spec order
