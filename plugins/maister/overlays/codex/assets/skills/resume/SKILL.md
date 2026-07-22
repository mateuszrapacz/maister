---
name: resume
description: "Resume an interrupted Maister workflow from orchestrator-state.yml."
---

Resume the Maister workflow from saved state.

1. Treat an explicit task path in the user's request as authoritative.
2. If no task path was supplied, find the latest `orchestrator-state.yml` under
   `.maister/tasks/`.
3. Read the workflow type, task path, `current_phase`, `completed_phases`, and
   any failed phases or pending gates.
4. If `current_phase` is missing, use the first phase that is not listed in
   `completed_phases`.
5. Invoke the matching workflow skill with the task path and
   `--from=<phase>`:
   - `development` → `$maister:development`
   - `performance` → `$maister:performance`
   - `migration` or `migrations` → `$maister:migration`
   - `research` → `$maister:research`
   - `product-design` → `$maister:product-design`

Preserve additional flags from the user's request. Do not restart from scratch
unless the user explicitly asks. If no active state exists, report that clearly
and suggest `$maister:work` or `$maister:init` as appropriate.
