# Requirements: Upstream Merge Sync v2.2.1

## Initial Description

Sprawdź co nowego pojawiło się w głównym repo (upstream SkillPanel/maister), zaplanuj merge tych zmian do nas, ale w taki sposób żeby te commity trafiły do nas i była zachowana ciągłość na git, żebyśmy widzieli potem nowe zmiany od nich. Sprawdź na ile te zmiany wpływają na nasz projekt.

## Q&A from Clarification Rounds

### Phase 2 Decisions
- **Merge strategy:** `git merge upstream/master`
- **Fork version:** `2.2.1-fork.1`
- **Kiro agent count:** Update 26 → 27
- **Semantic review:** Full review of development, product-design, init, orchestrator-patterns

### Phase 5 Requirements
- **Branch:** master (direct merge)
- **Commit:** Execute merge + fixes, do NOT commit (user decides)
- **Preserve fork:** All fork-specific features (Kiro, Kilo, Cursor, 12 AJ skills, thermo-nuclear agents)

## Similar Features / Prior Work

- `.maister/tasks/development/2026-06-14-upstream-sync-integration/` — v2.1.8 cherry-pick + empty merge marker
- `.maister/tasks/research/2026-06-14-upstream-sync-consistency/` — full divergence analysis
- `docs/cursor-agent-support.md` — fork merge workflow documentation

## Functional Requirements Summary

1. **Fetch & merge** upstream/master into fork master
2. **Resolve** 3 version manifest conflicts → `2.2.1-fork.1`
3. **Bump** remaining 3 manifests to `2.2.1-fork.1`
4. **Semantic review** auto-merged orchestrator files (6 SKILLs + orchestrator-patterns + CLAUDE.md)
5. **Verify** new upstream assets present (dashboard.html, html-companion-writer, html-report-style.md)
6. **Rebuild** all 4 platform variants via `make build`
7. **Fix** Kiro test assertions (agent count 26→27, CHAT GATE thresholds if needed)
8. **Validate** `make validate` + Kiro test suite passes
9. **Document** work in implementation/work-log.md
10. **Do NOT commit** — leave changes staged/unstaged for user review

## Reusability Opportunities

- v2.1.8 sync work-log as step template
- Makefile validate rules as CI gate
- Cursor quick-plan override pattern if corruption detected

## Scope Boundaries

**Included:** Git merge, conflict resolution, semantic review, platform rebuild, Kiro test fixes, validation
**Excluded:** Git commit, push to remote, upstream PR, E2E dashboard browser testing

## Technical Considerations

- Never edit generated platform variants directly
- Source of truth: `plugins/maister/` + `platforms/*/`
- Kiro highest risk platform (28 validate rules, 12 test files)
- Operator visibility layer is additive — fork features on disjoint paths
