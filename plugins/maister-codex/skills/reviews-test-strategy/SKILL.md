---
name: reviews-test-strategy
description: Review whether test strategy matches the problem class of production code
---

**ACTION REQUIRED**: This command delegates to a skill. Invoke the `maister:test-strategy-reviewer` skill via the skill loader NOW with the user's command arguments. Do not execute the review yourself.

Invoke skill loader:
  skill: "$maister:test-strategy-reviewer"
  args: "[user arguments from command]"
