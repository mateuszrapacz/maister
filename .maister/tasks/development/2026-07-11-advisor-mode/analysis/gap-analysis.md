# Gap Analysis

## TL;DR
The feature is cross-cutting but fits existing Maister conventions: source-only edits, build transforms, state-driven resume, and HTML companions.
The missing capability is a shared decision protocol, not a new runtime service.
Implementation must distinguish advisory analysis from source mutation and must fail closed when platform auto-answer support is unavailable.

## Key Decisions
- Use a nested `orchestrator.options.advisor` config copied into state at init — follows the existing `html_output` precedent.
- Make the denylist a hard safety floor — protects rollback, data integrity, scope, critical verification, and production decisions.
- Store full records in `gate_history` and generate `outputs/decision-summary.md`/`.html` — closes resume and accountability gaps.

## Open Questions / Risks
- The Markdown workflow can describe a host adapter but cannot itself guarantee a synthetic response API on Cursor, Copilot, Kiro, or Codex.

| Current state | Desired state | Gap closure |
|---|---|---|
| Manual `AskUserQuestion`/platform transforms | Per-type manual/advisor/fully automatic resolution | Shared §2.2 resolver contract and orchestrator call-site instructions |
| Phase-local `{question, answer}` | Full advisor/arbiter/user audit | `gate_history` plus dashboard projection |
| `html_output` only | Advisor models, policies, retry/backoff | Init/config/state schema |
| Implementation starts after normal plan gate | Implementation requires explicit approval state | Executor precondition and denylisted `implementation-approval` gate |
| No final decision report | MD + HTML report on every terminal path | Finalization instructions and companion registration |
