---
name: maister-bye
description: "End a Maister session gracefully while preserving workflow state for resume."
user-invocable: true
---

End the Maister session gracefully.

1. Identify the active task from the user's request or the latest
   `orchestrator-state.yml` under `.maister/tasks/`.
2. Ensure the state file reflects the latest `current_phase`,
   `completed_phases`, blockers, pending gates, and task status.
3. Do not mark an in-progress workflow as completed.
4. Summarize what was completed and what remains.
5. Record the task path and the command `/maister-resume <task-path>` for the
   next session.

Do not discard in-progress workflow state.
