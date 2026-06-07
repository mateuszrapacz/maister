
## Kiro: todo Patterns

On Kiro CLI, use the experimental `todo` tool for progress tracking (replaces Claude Code's task tracking tools). Enable with `kiro-cli settings chat.enableTodoList true`.

### Phase initialization

Create a todo list with all phases as pending items, ordered by dependency:

```
Phase 1: Initialize — pending
Phase 2: Codebase Analysis — pending
```

### Phase start / complete

- **Start**: update current phase to `in_progress`
- **Complete**: mark phase `completed` after the exit gate

### Skipped phase (scope)

Mark skipped phases as cancelled with a note (e.g. "Phase 4: skipped (scope=quick)").

### Resume from orchestrator-state.yml

1. Read `completed_phases` from state file
2. Recreate todo items for all phases, then mark completed ones
3. Set next phase `in_progress` before executing

State file remains source of truth; todo list mirrors for UX only.
