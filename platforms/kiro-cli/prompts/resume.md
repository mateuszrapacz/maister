# @resume

Resume the Maister workflow from saved state.

1. Find the latest `orchestrator-state.yml` under `.maister/tasks/`
2. Read task path, `current_phase`, and `completed_phases`
3. Invoke the appropriate `/maister-*` skill with `--from=<phase>` if supported, or continue from `current_phase`

Do not restart from scratch unless the user asks.
