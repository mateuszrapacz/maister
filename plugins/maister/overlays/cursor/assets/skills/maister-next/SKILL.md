---
name: maister-next
description: "Suggest the best next action from the active Maister workflow state."
user-invocable: true
---

Read `orchestrator-state.yml` in the active task directory under `.maister/tasks/`.
Use a task path supplied in the user's request when present. Otherwise discover
only top-level task state files matching
`.maister/tasks/<workflow>/<task>/orchestrator-state.yml`; exclude nested files
such as `analysis/research-context/**`.

Choose the state with the same deterministic rule as `maister-status`: select
the newest top-level task by `orchestrator.updated`, using
`orchestrator.created` as the tie-breaker. This is the active task whether it
is completed, in progress, or blocked. Never prefer an older blocked/failed
task over a newer task. Never use filesystem mtime or directory name ordering,
and never select a historical failed state merely because it contains a failed
phase. A historical task is selected only when the user supplies its path
explicitly.

Suggest exactly one best next action based on `current_phase`,
`completed_phases`, failed phases, blockers, and pending gates. Name the phase,
skill, or user decision and explain the reason in one sentence. Do not execute
the suggested action.

If the selected workflow is terminal, do not invent a failed phase or gate
adapter blocker. Suggest `$maister-maister-work` for a new task instead. If the
selected workflow has an actual failed phase, blocker, or pending gate, report
that item as the next action.

If no workflow is active, suggest `/maister-init` when `.maister/docs/` is
missing; otherwise suggest `/maister-work`.
