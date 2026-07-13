# Automatic Codex workflow continuation

## What this changes

Maister can now continue an eligible workflow automatically when the main
agent and Advisor agree on a decision. You do not need to answer an extra
question between those phases.

When the two recommendations differ, Maister asks one Arbiter to resolve the
difference. The selected result is saved before the workflow moves on, so a
retry can safely resume without repeating the decision or starting the next
step twice.

## Who should use this

This behavior is available to users running existing `maister:*` workflows in
Codex with the fully automatic policy enabled. No new command or user-interface
setup is required.

## Before you start

- Start a normal Maister workflow, such as development, research, or migration.
- Keep the workflow state in its task directory so Maister can resume it after
  an interruption.
- Use the existing workflow options and gates; automatic continuation does not
  change protected approval or safety decisions.

## What happens during a workflow

1. Maister evaluates the current gate and records the recommendation.
2. If the Advisor agrees, Maister records the Advisor decision and continues.
3. If the Advisor disagrees, Maister invokes one logical Arbiter decision. The
   Arbiter receives both recommendations and the same read-only context.
4. Maister saves the complete terminal decision and requested reports.
5. The workflow continues to the next phase or work item using the saved choice.

The continuation runner accepts the validated decision through its JSON
transport. It reads from standard input or an explicitly named input file and
returns a compact JSON result. Extra command-line arguments are rejected.

## Protected decisions

Some decisions always require you. Examples include implementation approval,
rollback, unresolved critical verification findings, production go/no-go, and
final handoff. Automatic continuation never bypasses these safeguards.

## If a workflow is interrupted

Resume the same Maister task. Maister reuses the saved terminal decision,
regenerates missing reports, and applies a pending phase transition once. It
does not append a duplicate history entry or start the same target twice.

## If automatic continuation cannot proceed

Maister fails closed. A low-confidence, invalid, denied, or non-zero runner
result returns the workflow to an explicit user gate or records a blocked
state. The phase is not advanced silently.

## Troubleshooting

### I still see a question

That gate may be protected, low-confidence, or configured for manual review.
Answer it normally; automatic continuation is intentionally limited to safe,
validated gates.

### The workflow says it is blocked

Read the latest gate and verification report in the task directory. Resolve the
reported issue or provide the requested decision, then resume the same task.

### A report is missing after a retry

Resume the task again. Reports are projections of the durable workflow history
and are regenerated from the saved terminal decision.

## Related artifacts

- [Implementation verification](../verification/implementation-verification.md)
- [Workflow decision summary](../outputs/decision-summary.md)
- [Implementation specification](../implementation/spec.md)
