---
name: maister-next
description: "Suggest the best next action from the active Maister workflow state."
user-invocable: true
---

Read `orchestrator-state.yml` in the active task directory under `.maister/tasks/`.
Use a task path supplied in the user's request when present; otherwise use the
latest active state file.

Suggest exactly one best next action based on `current_phase`,
`completed_phases`, failed phases, blockers, and pending gates. Name the phase,
skill, or user decision and explain the reason in one sentence. Do not execute
the suggested action.

If no workflow is active, suggest `/maister-init` when `.maister/docs/` is
missing; otherwise suggest `/maister-work`.
