---
name: maister-quick-bugfix
description: Quick bug fix with TDD red/green gates and complexity escalation
argument-hint: "[bug description]"
---

**User input**: `$ARGUMENTS`

# Quick Bug Fix

Lightweight TDD-driven bug fix workflow with file-based fix plan. Analyze the bug, present a fix plan for approval, then reproduce with a failing test, fix, and verify.

For complex bugs, escalate to `/maister-development`.

## Usage

```bash
/maister-quick-bugfix "Login form submits twice on slow connections"
```

---

## Workflow

### Step 1: Parse Input

- Use argument if provided
- Else scan recent conversation for bug context
- If neither, → **CHAT GATE** — Present in chat: "Describe the bug — expected vs actual behavior?" Do not proceed until the user replies.

### Step 2: Discover Standards

**CRITICAL: Complete before planning.**

If `.maister/docs/INDEX.md` exists: read INDEX.md, identify applicable standards, **READ each file**. If not: note absence and suggest `/maister-init` in summary.

### Step 3: Analyze & Assess Complexity

1. Explore codebase (Glob, Grep, Read, subagent + maister-explore)
2. Form root cause hypothesis
3. Escalation check — if **2+** signals (5+ files, schema changes, architectural trade-offs, security-sensitive, unclear root cause), → **CHAT GATE** — Present in chat: continue quick fix or switch to `/maister-development`? In `--no-interactive` mode, default: **Stay in quick-bugfix** (no escalation).

### Step 4: Write Fix Plan File

Save to `.maister/plans/YYYY-MM-DD-bugfix-name.md` (mandatory artifact).

Plan MUST include:

```markdown
## Bug Analysis
**Root Cause**: [hypothesis with evidence]
**Affected Files**: [list]

## Proposed Fix
[what changes and why]

## Test Strategy
[what the failing test will assert]

## Applicable Standards
[standards read, or note to run /maister-init]

## Standards Compliance Checklist
- [ ] [guideline] (from `standards/[path]`)
```

### Step 5: Approval Gate

→ **CHAT GATE** — Present in chat: **Approve** / **Revise** / **Cancel**. Do not proceed to TDD without approval. In `--no-interactive` mode, default: **Approve** (proceed with generated plan).

### Step 6: TDD Red Gate

Write a failing test reproducing the bug. Run it — must fail. If it passes, → **CHAT GATE** — Present in chat: whether the bug description is accurate. In `--no-interactive` mode, default: treat description as accurate and adjust test strategy.

### Step 7: Fix & Verify (TDD Green)

Implement per approved plan. Run test (must pass). Run related tests. Max 3 fix iterations; then escalate suggestion.

### Step 8: Summary

Root cause, fix, files modified, standards applied, test results, commit suggestion. Verify checklist from plan file.

---

## Graceful Fallback

If no `.maister/docs/`, proceed and note `/maister-init` recommendation in summary.
