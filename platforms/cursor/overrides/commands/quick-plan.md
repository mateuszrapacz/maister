---
name: maister-quick-plan
description: Plan a task with Maister standards awareness (Cursor)
---

**ACTION REQUIRED**: This command delegates to a skill. Invoke the `quick-plan` skill via the Skill tool NOW with the user's command arguments. Do not execute the workflow yourself.

## Usage

```bash
/maister-quick-plan [task description]
```

## Examples

```bash
/maister-quick-plan "Add user authentication with email/password"
/maister-quick-plan "Refactor the payment processing module"
```

Invoke Skill tool:
  skill: "quick-plan"
  args: "[user arguments from command]"
