---
name: next
description: "Suggest the best next action based on current workflow state."
user-invocable: true
---

Read `orchestrator-state.yml` in the active task directory under `.maister/tasks/`.

Suggest the single best next action (phase, skill, or subagent) based on current state.

If no workflow is active, suggest `/init` or `/dev` as appropriate.
