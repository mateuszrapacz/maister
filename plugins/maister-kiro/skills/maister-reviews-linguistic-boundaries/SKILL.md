---
name: maister-reviews-linguistic-boundaries
description: Verify linguistic boundaries between bounded contexts via language.md files
---

**User input**: `$ARGUMENTS`

**ACTION REQUIRED**: This command delegates to a skill. Invoke the `maister-linguistic-boundary-verifier` skill via the `/maister-*` slash skill NOW with the user's command arguments. Do not execute the verification yourself.

Invoke `/maister-*` slash skill:
  skill: "maister-linguistic-boundary-verifier"
  args: "[user arguments from command]"
