---
name: maister-quick-plan
description: Plan a task with AI SDLC standards awareness (Kiro)
---

**User input**: `$ARGUMENTS`

# Planning with Standards Awareness

Plan a task with automatic discovery of project standards from `.maister/docs/`. Uses a file-based plan artifact and **CHAT GATE** approval instead of built-in plan mode.

## Usage

```bash
/maister-quick-plan [task description]
```

## Examples

```bash
/maister-quick-plan "Add user authentication with email/password"
/maister-quick-plan "Refactor the payment processing module"
/maister-quick-plan
```

---

## Workflow

### Step 1: Parse Input

- If provided as argument, use it directly
- If not provided, → **CHAT GATE** — Present in chat:
  ```
  "What would you like to plan? Please describe the task or feature."
  ```
  Do not proceed until the user replies. In `--no-interactive` mode, stop — task description is required.

### Step 2: Discover and Read Standards (BEFORE planning)

**CRITICAL: Complete this step before writing the plan file.**

1. Check if `.maister/docs/INDEX.md` exists
   - If not: note no standards available, continue to Step 3
   - If exists: read INDEX.md, identify applicable standards, **READ each standard file** (INDEX alone is not sufficient)
2. Summarize key guidelines from each file read

### Step 3: Explore Codebase

Use subagent with `maister-explore` (or explore directly) to understand relevant code paths. Include standards context in the explore prompt.

### Step 4: Write Plan File (mandatory artifact)

Save the plan to `.maister/plans/YYYY-MM-DD-plan-name.md` (create `.maister/plans/` if needed).

The plan file MUST include:

1. **## Applicable Standards** — each standard file read with key guidelines. If none: "No AI SDLC standards found. Consider running `/maister-init`."
2. **## Standards Compliance Checklist** — checkboxes per applicable guideline
3. **## Implementation Plan** — concrete steps informed by standards and codebase exploration

### Step 5: Approval Gate

→ **CHAT GATE** — Present options in chat:
- **Approve** — proceed to implementation in agent mode
- **Revise** — user provides feedback; update plan file and re-gate
- **Cancel** — stop without implementation

Do not proceed until the user replies. In `--no-interactive` mode, use default: **Proceed with generated plan** (see Headless Defaults table in `platforms/kiro-cli/transforms/askuser-to-chat-gate.md`).

### Step 6: Implement (after approve)

Execute the approved plan in agent mode. Apply standards from the plan checklist.

---

## Graceful Fallback

If `.maister/docs/` does not exist, continue planning and note in Applicable Standards that `/maister-init` is recommended.

## Post-Implementation Verification

After implementation, verify each item in the Standards Compliance Checklist from the plan file.
