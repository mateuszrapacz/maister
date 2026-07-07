# Scope Clarifications

## Decisions Made (Phase 2 Gate)

| Decision | Choice |
|----------|--------|
| Merge strategy | `git merge upstream/master` |
| Fork version | `2.2.1-fork.1` |
| Kiro agent count | Update tests 26 → 27 (include html-companion-writer) |
| Semantic review | Full review of development, product-design, init, orchestrator-patterns |

## Important Defaults (accepted)

- CHAT GATE thresholds: measure after `make build-kiro`, then adjust
- `html_output` default: keep upstream `true`
- Manifest uniformity: bump all 6 manifests to `2.2.1-fork.1`
- Copilot CLAUDE.md: rely on `make build-copilot`
- Commit structure: merge commit (+ optional separate version commit)

## Scope Boundaries

**In scope:**
- Merge upstream v2.2.1 into fork master
- Resolve 3 version conflicts
- Semantic review of auto-merged orchestrator files
- Rebuild all 4 platform variants
- Fix Kiro test assertions (agent count, CHAT GATE thresholds if needed)
- Full `make validate` + Kiro test suite

**Out of scope:**
- Pushing to remote (unless user requests)
- Creating git commit (unless user requests)
- Contributing fork changes back to upstream
- E2E browser verification of dashboard HTML
