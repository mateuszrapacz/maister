# TaskCreate/TaskUpdate → TUI task list (Kiro build transform)

Applied by `platforms/kiro-cli/build.sh` to orchestrator skills and references.

Maister targets **Terminal UI** (`chat.ui` = `tui`). Classic `/todo` commands and `chat.enableTodoList` are not used.

## Semantic mapping

| Claude Code | Kiro TUI |
|-------------|----------|
| `TaskCreate` (pending) | `todo` tool — create pending task (visible in activity tray) |
| `TaskUpdate` → `in_progress` | `todo` update to in_progress |
| `TaskUpdate` → `completed` | `todo` mark completed |
| `TaskUpdate addBlockedBy` | Order tasks to reflect dependencies |
| `activeForm` | Include activity in task content (e.g. "Phase 3: Planning") |
| `metadata: {skipped: true}` | cancelled status |

## Orchestrator initialization pattern (Kiro TUI)

```
1. todo: create items for all phases (pending), ordered by dependency
2. On phase start: todo update — set current phase in_progress
3. On phase end (after gate): todo mark completed
4. On resume: recreate tasks, mark completed phases from orchestrator-state.yml
```

User monitors progress via activity tray (`Ctrl+X`); subagent waves via crew monitor (`Ctrl+G`).

## Edge cases

- **Parallel implementation waves**: group-level tasks; wave dispatch sets multiple items in_progress
- **Skipped phases** (scope flags): mark cancelled, not completed
- **Restored on resume**: note `(restored)` in content
- **State file is source of truth** for resume; TUI task list mirrors for UX only

## Files transformed

- `skills/maister-orchestrator-framework/**`
- `skills/maister-development/SKILL.md`
- `skills/maister-product-design/SKILL.md`
- `skills/maister-performance/SKILL.md`, `maister-migration/SKILL.md`, `maister-research/SKILL.md`
- `skills/maister-init/SKILL.md`, `maister-standards-discover/SKILL.md`
- `skills/maister-implementation-verifier/SKILL.md`, `maister-implementation-plan-executor/SKILL.md`
- `agents/*.md` (pre-JSON generation)
- `steering/maister-workflows.md` Progress Tracking section (when present)
