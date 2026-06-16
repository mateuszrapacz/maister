---
name: maister-quick-plan
description: Plan a task with Maister standards awareness (Cursor)
argument-hint: "[task description]"
---

# Quick Plan — File-Based Planning with Standards Enforcement

Plan a task with automatic discovery of project standards from `.maister/docs/`. Uses a file-based plan artifact and AskQuestion gate instead of built-in plan mode.

## Workflow

1. **Get the task** — Use the argument if provided. If none, ask with `AskQuestion`: "What would you like to plan?"

2. **Discover and read standards (before planning)** — If `.maister/docs/INDEX.md` exists: read INDEX.md, identify applicable standards, **READ each standard file** (INDEX alone is not sufficient). If not: note no standards and continue.

3. **Explore codebase** — Use Task tool with `subagent_type: "maister-explore"`. Include standards context in the explore prompt.

4. **Write plan file (mandatory)** — Save to `.maister/plans/YYYY-MM-DD-plan-name.md`. The plan MUST include:
   - **## Applicable Standards** — each standard file read with key guidelines. If none: "No Maister standards found. Consider running `/maister-init`."
   - **## Standards Compliance Checklist** — checkboxes per applicable guideline (each annotated with source file)
   - **## Implementation Plan** — concrete steps informed by standards and exploration

5. **Approval gate** — Use AskQuestion: **Approve** / **Revise** / **Cancel**. Do not implement without approval.

6. **Implement and verify (after approve)** — Execute the approved plan. After implementation, verify each item in the Standards Compliance Checklist — mark pass/fail and report results.

If `.maister/docs/` does not exist, continue planning and note `/maister-init` in Applicable Standards.
