
## Kiro TUI: Progress Tracking

Maister targets the **Terminal UI** (default since Kiro CLI 2.0). Classic interface, `/experiment`, and `/todo` slash commands are not used.

### User visibility

- **Activity tray** (`Ctrl+X`) — task progress and queued messages without scrolling chat history
- **Crew monitor** (`Ctrl+G`) — live subagent status (parallel waves capped at 4)

TUI tasks are always on. Do **not** set `chat.enableTodoList` (classic only).

### Agent behavior

Use the `todo` tool to mirror workflow phases in the TUI task list.

### Phase initialization

Create tasks for all phases as pending, ordered by dependency:

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
2. Recreate tasks for all phases, then mark completed ones
3. Set next phase `in_progress` before executing

`orchestrator-state.yml` remains source of truth; the TUI task list mirrors for UX only.
