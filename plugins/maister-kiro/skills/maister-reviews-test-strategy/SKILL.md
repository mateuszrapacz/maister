---
name: maister-reviews-test-strategy
description: Review whether test strategy matches the problem class of production code
---

**User input**: `$ARGUMENTS`

**ACTION REQUIRED**: This command delegates to a skill. Invoke the `maister-test-strategy-reviewer` skill via the `/maister-*` slash skill NOW with the user's command arguments. Do not execute the review yourself.

Invoke `/maister-*` slash skill:
  skill: "maister-test-strategy-reviewer"
  args: "[user arguments from command]"
