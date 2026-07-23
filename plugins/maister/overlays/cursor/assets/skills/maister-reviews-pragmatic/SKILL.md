---
name: maister-reviews-pragmatic
description: Run pragmatic code review to detect over-engineering and ensure code matches project scale
---

**Cursor user-gate adapter:** Prefer the `AskQuestion` tool for mandatory gates and clarifying choices. If `AskQuestion` is not available in this session (for example `Tool not found: AskQuestion`, as with some Grok 4.5 sessions), fall back to an **inline chat question** that lists the same options, then WAIT for the user's reply before continuing. Never skip a gate because the tool is missing.

**ACTION REQUIRED**: This command delegates through the common exact-role runtime. The `<command-name>` tag refers to THIS command, not the target. Resolve and dispatch the code-quality-pragmatist now with the bounded path. Do not execute the review inline.

You are running a pragmatic code review using the `code-quality-pragmatist` agent.

## Your Task

You are performing pragmatic analysis to identify over-engineering, unnecessary complexity, and developer experience issues.

## Parse User Request

**Determine the following from the user's request:**

1. **Path to analyze**:
   - If provided: Use the specified path
   - If not provided: Use AskQuestion to ask what to analyze (file, directory, or task path)

## Your Instructions

**Resolve and dispatch exact code-quality-pragmatist NOW:**

```
resolveAgent({ logical_role_id: "maister:code-quality-pragmatist" })
dispatchAgent:
  actor: reviews-pragmatic
  work_item: pragmatic-code-review
  output: verification/pragmatic-review.md
  bounded_task: |
    You are the code-quality-pragmatist agent. Review the code at: [path]

    Your task:
    1. Assess overall complexity relative to project scale (check .maister/docs/project/ for scale)
    2. Detect over-engineering patterns (infrastructure overkill, excessive abstraction, enterprise patterns in simple code)
    3. Assess developer experience (setup complexity, feedback loops, error messages, consistency)
    4. Verify requirements alignment (if spec.md available, compare implementation to requirements)
    5. Recommend specific simplifications with before/after examples
    6. Prioritize top 3 changes with highest impact

    Generate comprehensive pragmatic review report.
    Save to: verification/pragmatic-review.md

    Focus on: Simple solutions for simple problems. Code should match project needs, not theoretical best practices.
```

**Wait for the agent to complete before proceeding.**

The code-quality-pragmatist agent will:
1. Assess complexity relative to project scale (MVP vs Enterprise)
2. Detect over-engineering (Redis in MVP, excessive layers, premature optimization)
3. Identify developer experience friction points
4. Compare implementation to requirements (if spec available)
5. Recommend concrete simplifications with impact estimates
6. Provide top 3 priority actions

## Examples

**Example 1**: Review specific feature
```
User: /maister-reviews-pragmatic .maister/tasks/development/2025-11-17-user-management/
```

**Example 2**: Review source directory
```
User: /maister-reviews-pragmatic src/features/payments/
```

**Example 3**: Review specific file
```
User: /maister-reviews-pragmatic src/services/cache-service.ts
```

## What to Expect

The code-quality-pragmatist will provide:
- Complexity assessment (Low/Medium/High) relative to project scale
- Over-engineering patterns with severity (Critical/High/Medium/Low)
- Developer experience issues and friction points
- Requirements alignment assessment
- Concrete simplification recommendations with before/after examples
- Top 3 priority actions with estimated impact
- Summary statistics (LOC reduction potential, dependencies removable)

## Notes

- This is analysis only - no code will be modified
- Focus on pragmatism: appropriate complexity for actual needs
- Identifies unnecessary infrastructure, abstractions, and patterns
- Severity levels guide prioritization:
  - **Critical**: Severe over-engineering blocking development
  - **High**: Significant unnecessary complexity
  - **Medium**: Moderate complexity issues
  - **Low**: Minor improvements
