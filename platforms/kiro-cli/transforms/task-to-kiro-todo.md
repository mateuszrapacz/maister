# TaskCreate/TaskUpdate → todo (Kiro build transform)

Applied by `platforms/kiro-cli/build.sh` to orchestrator skills and references.

Enable in Kiro: `kiro-cli settings chat.enableTodoList true`

## Semantic mapping

| Claude Code | Kiro `todo` tool |
|-------------|------------------|
| `TaskCreate` (pending) | `todo` create with pending status |
| `TaskUpdate` → `in_progress` | `todo` update to in_progress |
| `TaskUpdate` → `completed` | `todo` mark completed |
| `TaskUpdate addBlockedBy` | Order items in todo list to reflect dependencies |
| `activeForm` | Include activity in item content (e.g. "Phase 3: Planning") |
| `metadata: {skipped: true}` | cancelled status |

## Orchestrator initialization pattern (Kiro)

```
1. todo: create items for all phases (pending), ordered by dependency
2. On phase start: todo update — set current phase in_progress
3. On phase end (after gate): todo mark completed
4. On resume: recreate todos, mark completed phases from orchestrator-state.yml
```

## Edge cases

- **Parallel implementation waves**: group-level todos; wave dispatch sets multiple items in_progress
- **Skipped phases** (scope flags): mark cancelled, not completed
- **Restored on resume**: note `(restored)` in content
- **State file is source of truth** for resume; `todo` mirrors for UX only

## Files transformed

- `skills/maister-orchestrator-framework/**`
- `skills/maister-development/SKILL.md`
- `skills/maister-product-design/SKILL.md`
- `skills/maister-performance/SKILL.md`, `maister-migration/SKILL.md`, `maister-research/SKILL.md`
- `skills/maister-init/SKILL.md`, `maister-standards-discover/SKILL.md`
- `skills/maister-implementation-verifier/SKILL.md`, `maister-implementation-plan-executor/SKILL.md`
- `agents/*.md` (pre-JSON generation)
- `CLAUDE.md` (until converted to `steering/maister-workflows.md` in Group 6)
- `steering/maister-workflows.md` Progress Tracking section (when present)
