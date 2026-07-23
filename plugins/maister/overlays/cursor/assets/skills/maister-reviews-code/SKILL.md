---
name: maister-reviews-code
description: Run automated code quality, security, and performance analysis on your code
---

**Cursor user-gate adapter:** Prefer the `AskQuestion` tool for mandatory gates and clarifying choices. If `AskQuestion` is not available in this session (for example `Tool not found: AskQuestion`, as with some Grok 4.5 sessions), fall back to an **inline chat question** that lists the same options, then WAIT for the user's reply before continuing. Never skip a gate because the tool is missing.

**ACTION REQUIRED**: This command delegates through the common exact-role runtime. The `<command-name>` tag refers to THIS command, not the target. Resolve and dispatch the code-reviewer now with the bounded path and scope. Do not execute the review inline.

You are running a comprehensive code review using the `code-reviewer` subagent.

## Your Task

You are performing automated code analysis to identify quality, security, and performance issues.

## Parse User Request

**Determine the following from the user's request:**

1. **Path to analyze**:
   - If provided: Use the specified path
   - If not provided: Use AskQuestion to ask what to analyze

2. **Analysis scope**:
   - If `--scope=quality`: Only code quality analysis
   - If `--scope=security`: Only security analysis
   - If `--scope=performance`: Only performance analysis
   - If `--scope=all` or no scope: Complete analysis (recommended)

## Your Instructions

**Resolve and dispatch exact code-reviewer NOW:**

```
resolveAgent({ logical_role_id: "maister:code-reviewer" })
dispatchAgent:
  actor: reviews-code
  work_item: code-quality-review
  output: "[path]/code-review-report.md"
  bounded_task: |
    Analyze code at: [path from user or from AskQuestion]
    Scope: [quality|security|performance|all]
    Report path: [path]/code-review-report.md
```

**Wait for the exact dispatch to complete before proceeding.**

The code-reviewer subagent will:
1. Analyze code for complexity, duplication, and code smells
2. Detect security vulnerabilities and hardcoded secrets
3. Identify performance issues (N+1 queries, missing indexes, caching opportunities)
4. Generate comprehensive report with findings categorized by severity
5. Provide actionable recommendations with code examples

## Examples

**Example 1**: Review specific task
```
User: /maister-reviews-code .maister/tasks/development/2025-10-24-auth/
```

**Example 2**: Review with specific scope
```
User: /maister-reviews-code src/api/ --scope=security
```

**Example 3**: Review entire project
```
User: /maister-reviews-code src/
```

## What to Expect

The code-reviewer will provide:
- Summary of issues found (critical, warnings, info)
- Detailed findings with file locations and line numbers
- Code examples showing issues and fixes
- Metrics on code quality, security, and performance
- Prioritized recommendations
- Go/no-go assessment for code review

## Notes

- This is analysis only - no code will be modified
- Focus on actionable findings
- Severity levels guide prioritization:
  - **Critical**: Must fix before production
  - **Warning**: Should fix before merge
  - **Info**: Nice to have improvements
