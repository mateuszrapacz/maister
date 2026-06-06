# TaskCreate/TaskUpdate → TodoWrite (Cursor build transform)

Applied by `platforms/cursor/build.sh` to orchestrator skills and references.

## Semantic mapping

| Claude Code | Cursor TodoWrite |
|-------------|------------------|
| `TaskCreate` (pending) | `TodoWrite` with `status: "pending"` |
| `TaskUpdate` → `in_progress` | `TodoWrite` with `status: "in_progress"`, `merge: true` |
| `TaskUpdate` → `completed` | `TodoWrite` with `status: "completed"`, `merge: true` |
| `TaskUpdate addBlockedBy` | Order todos in array to reflect dependencies; use `merge: true` |
| `activeForm` | Include activity in `content` (e.g. "Phase 3: Planning") |
| `metadata: {skipped: true}` | `status: "cancelled"` |

## Orchestrator initialization pattern (Cursor)

```
1. TodoWrite: create todos for all phases (pending), ordered by dependency
2. On phase start: TodoWrite merge=true, set current phase in_progress
3. On phase end (after gate): TodoWrite merge=true, set completed
4. On resume: recreate todos, mark completed phases from orchestrator-state.yml
```

## Edge cases

- **Parallel implementation waves**: group-level todos; wave dispatch sets multiple items `in_progress`
- **Skipped phases** (scope flags): mark `cancelled`, not `completed`
- **Restored on resume**: `metadata` equivalent — note `(restored)` in content
- **State file is source of truth** for resume; TodoWrite mirrors for UX only

## Files transformed

- `skills/orchestrator-framework/**`
- `skills/development/SKILL.md`
- `skills/product-design/SKILL.md`
- `skills/performance/SKILL.md`, `migration/SKILL.md`, `research/SKILL.md`
- `skills/init/SKILL.md`, `standards-discover/SKILL.md`
- `skills/implementation-verifier/SKILL.md`, `implementation-plan-executor/SKILL.md`
- Plugin `rules/maister-workflows.mdc` Progress Tracking section
