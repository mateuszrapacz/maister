---
name: maister-status
description: "Report the active Maister workflow state, phase, and blockers."
user-invocable: true
---

Read the active `orchestrator-state.yml` under `.maister/tasks/`. Use the task
path supplied in the user's request when present; otherwise use the latest
active state file.

Report:

- task path and workflow type
- task status and `current_phase`
- `completed_phases` and failed phases
- blockers, pending gates, and the next incomplete phase

Do not start or resume the workflow. If no active workflow exists, say so
clearly and suggest `/maister-init` or `/maister-work`.
