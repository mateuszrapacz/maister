# Runtime Capability Matrix: Advisor and Arbiter Mode

## TL;DR

The repository provides read-only advisor wiring, platform transforms, user-gate vocabulary, durable state, and a normalized `phase_continue(selected_option)` continuation seam. `fully_automatic` continues from a validated terminal result instead of synthesizing UI input.

## Key Decisions

- Keep `plugins/maister/` as the source of truth and preserve generated-variant builds.
- Treat host invocation, user interaction, state persistence, resume, and phase continuation as separate adapter capabilities.
- Fail closed when a host cannot consume a validated result through `phase_continue(selected_option)`; use an interactive gate where available and otherwise persist a blocked state.

## Open Questions & Risks

- Codex, Cursor, Kiro, Kilo, and Copilot differ in how they invoke agents and present questions, but the orchestrator continuation seam is host-neutral.
- Existing smoke tests must verify that a validated terminal decision reaches `phase_continue(selected_option)` without opening a user gate.

## Explicit source adapter mappings

The mappings below describe the source/bootstrap contract. They do not synthesize
answers into UI prompts; `fully_automatic` consumes the normalized result through
`phase_continue(selected_option)`. State remains owned by the orchestrator and
`orchestrator-state.yml` is the only resume source.

| Host | Advisor invocation | Arbiter invocation | User gate | State write | Resume | `fully_automatic` |
|---|---|---|---|---|---|---|
| Cursor | Source `agents/advisor.md` → generated `maister-advisor`, invoked by Cursor subagent/Task call. | Invoke the same `maister-advisor` role with both competing recommendations and arbitration context. | Source `AskUserQuestion` → `AskQuestion`; user keeps the final choice after disagreement. | Orchestrator writes `.maister/tasks/**/orchestrator-state.yml`. | `/maister-resume` reads the task state and reuses terminal gate records. | `fully_automatic: supported` through `phase_continue(selected_option)`; denylisted gates remain manual. |
| Kiro | Source `agents/advisor.md` → generated `maister-advisor` JSON agent; `agent-tools.json` permits only `read`, `grep`, `glob`. | Invoke the same read-only `maister-advisor` JSON agent with both recommendations. | Source question markers → **CHAT GATE** for interactive fallback. | Orchestrator writes `.maister/tasks/**/orchestrator-state.yml`; stop hook blocks until state is checked. | `@resume`/state read resumes `advisor_pending`, `arbiter_pending`, or `user_pending` without replaying terminal records. | `fully_automatic: supported` through `phase_continue(selected_option)`; denylisted and implementation-approval gates remain manual. |
| Kilo | Source `agents/advisor.md` → `.kilo/agents/maister-advisor.md`, invoked as `@maister-advisor`; edit and bash are denied. | Invoke the same `@maister-advisor` role with both recommendations. | `AskUserQuestion`, `AskQuestion`, and `ask_user` transform to a chat gate. | Orchestrator writes `.maister/tasks/**/orchestrator-state.yml`. | `.maister` state read via the resume workflow reuses persisted gate history. | `fully_automatic: supported` through `phase_continue(selected_option)`; denylisted gates remain manual. |
| Copilot | Source `agents/advisor.md` is copied as the generated `advisor` agent; `maister:` references become `maister-`. | Invoke the generated `advisor` agent again with both recommendations and arbitration context. | `AskUserQuestion` → `ask_user`; user makes the final choice after disagreement. | Orchestrator writes `.maister/tasks/**/orchestrator-state.yml`. | Resume workflow reads state and reuses terminal gate records. | `fully_automatic: supported` through `phase_continue(selected_option)`; denylisted gates remain manual. |
| Codex | `templates/advisor.toml` defines the read-only native `advisor` role. | Invoke the same native `advisor` role with both competing recommendations. | Source `AskUserQuestion`/`AskQuestion` → plain-text user question. | Orchestrator writes `.maister/tasks/**/orchestrator-state.yml`. | `$maister:resume` reads state and reuses terminal gate records. | `fully_automatic: supported` through `phase_continue(selected_option)`; denylisted gates remain manual. |

## Evidence

| Evidence | Assessment |
|---|---|
| `plugins/maister/agents/advisor.md` and `platforms/codex-cli/templates/advisor.toml` | Structured YAML, read-only boundary, no state writes, no user-tool invocation, and no implementation approval authority are explicit. |
| `platforms/cursor/build.sh`, `platforms/kilo-cli/build.sh`, `platforms/kiro-cli/agent-tools.json`, and `platforms/copilot-cli/build.sh` | Agent names, permissions, and user-gate transforms are explicit in source/bootstrap logic. |
| `plugins/maister/hooks/post-compact-reminder.sh`, `platforms/cursor/hooks/post-compact-reminder.sh`, and `platforms/kiro-cli/hooks/stop-state-reminder-kiro.sh` | In-scope reminders preserve pending advisor, arbiter, and user gates plus implementation approval. Kiro has no pre-compaction hook; its stop hook remains the recovery checkpoint. The separate Codex post-compaction hook remains a generic state reminder and is not changed in this Group 3 ownership slice. |
| Existing smoke tests and generated docs | Prove packaging, selected agent wiring, and the normalized continuation contract; they do not grant denylisted approvals. |

Every host supports `fully_automatic` at the orchestrator continuation seam.
Invalid, low-confidence, escalated, or denylisted results remain manual or
blocked; no UI answer is synthesized.
