# @status

Read the active `orchestrator-state.yml` under `.maister/tasks/` and report:

- Current task path and workflow type
- `current_phase` and `completed_phases`
- Any blockers or pending gates

If no active workflow exists, say so clearly.
