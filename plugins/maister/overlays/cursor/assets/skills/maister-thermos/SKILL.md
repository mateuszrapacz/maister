---
name: maister-thermos
description: "Launch both thermo-nuclear review subagents in parallel, then synthesize their findings. Use for thermos, double thermo review, or combined bug/security and code-quality branch audits."
disable-model-invocation: true
---

# Thermos

Run the two thermo review passes as parallel common-runtime dispatches, then synthesize their results.

## Workflow

1. Determine the review scope from the user request, PR, current branch, or relevant changed files.
2. Gather the diff and any file/context excerpts needed for reviewers to evaluate the change without guessing.
3. Resolve `resolveAgent({ logical_role_id: "maister:thermo-nuclear-review-subagent" })` and `resolveAgent({ logical_role_id: "maister:thermo-nuclear-code-quality-review-subagent" })`, then dispatch both before awaiting either result.
4. For each dispatch use actor `thermos`, a distinct review work item, response-only prioritized-findings output, and the same bounded diff/file context.
5. After both finish, synthesize the results with findings first, deduplicated across reviewers. Weight overlapping findings more heavily, resolve disagreements with your own judgment, and keep summaries brief.

If individual background summaries are already visible to the user, do not restate them wholesale. Surface the unified verdict, the highest-signal findings, and any remaining uncertainty.
