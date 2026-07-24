---
name: maister-status
description: "Report the active Maister workflow state, phase, and blockers."
user-invocable: true
---

Read the active `orchestrator-state.yml` under `.maister/tasks/`. Use the task
path supplied in the user's request when present. Otherwise discover only
top-level task state files matching `.maister/tasks/<workflow>/<task>/orchestrator-state.yml`;
exclude nested files such as `analysis/research-context/**`.

Choose the newest top-level task by `orchestrator.updated`, using
`orchestrator.created` as the tie-breaker. This is the active task for an
invocation without an explicit path, whether it is completed, in progress, or
blocked. Never prefer an older blocked/failed task over a newer task. Never use
filesystem mtime or directory name ordering, and never select a historical
failed state merely because it contains a failed phase. A historical task is
selected only when the user supplies its path explicitly.

Report:

- task path and workflow type
- task status and `current_phase`
- `completed_phases` and failed phases
- blockers, pending gates, and the next incomplete phase

For a terminal workflow, report that it is completed and do not describe its
skipped phases as blockers. If there is no non-terminal workflow, say that no
workflow is currently active and suggest `/maister-work` for a new task.

Do not start or resume the workflow. If no active workflow exists, say so
clearly and suggest `/maister-init` or `/maister-work`.
