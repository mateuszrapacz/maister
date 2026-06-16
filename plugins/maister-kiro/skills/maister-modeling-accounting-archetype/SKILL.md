---
name: maister-modeling-accounting-archetype
description: Map a domain to the accounting archetype (value tracking, ledger, double-entry patterns)
---

**User input**: `$ARGUMENTS`

**ACTION REQUIRED**: This command delegates to a skill. Invoke the `maister-accounting-archetype-mapper` skill via the `/maister-*` slash skill NOW with the user's command arguments. Do not execute the modeling yourself.

Invoke `/maister-*` slash skill:
  skill: "maister-accounting-archetype-mapper"
  args: "[user arguments from command]"
