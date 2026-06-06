
## Cursor: TodoWrite Patterns

On Cursor Agent, use `TodoWrite` for progress tracking (replaces Claude Code's task tracking tools).

### Phase initialization

```json
{
  "merge": false,
  "todos": [
    { "id": "phase-1", "content": "Phase 1: Initialize", "status": "pending" },
    { "id": "phase-2", "content": "Phase 2: Codebase Analysis", "status": "pending" }
  ]
}
```

### Phase start / complete

```json
{ "merge": true, "todos": [{ "id": "phase-2", "content": "Phase 2: Codebase Analysis", "status": "in_progress" }] }
```

```json
{ "merge": true, "todos": [{ "id": "phase-2", "content": "Phase 2: Codebase Analysis", "status": "completed" }] }
```

### Skipped phase (scope)

```json
{ "merge": true, "todos": [{ "id": "phase-4", "content": "Phase 4: skipped (scope=quick)", "status": "cancelled" }] }
```

### Resume from orchestrator-state.yml

1. Read `completed_phases` from state file
2. `TodoWrite` all phases as `pending`, then `merge: true` to mark completed ones
3. Set next phase `in_progress` before executing

State file remains source of truth; todos mirror for UX only.
