# Technical Clarifications: Unified Agent Projections

## TL;DR

The original generic-subagent assumption was invalidated by Codex 0.144.5 runtime probes: the exposed spawn surface cannot select a custom role or enforce a per-worker model. The user therefore selected managed `codex exec` workers as the binding Codex backend for enforceable per-role model and reasoning policy. Cursor and Kiro retain their native projections.

## Key Decisions

- Keep the 28 canonical Markdown agents as the sole behavior owner and derive host representations deterministically inside transaction staging.
- Add exact logical-role resolution, receipt/projection validation, host adapters, and separate execution records with no fallback behavior.
- Generalize the transaction boundary to support narrow receipt-owned Kiro native leaves while preserving unrelated user files and byte-exact rollback.
- Treat Advisor as an ordinary role and remove the legacy Codex TOML topology without migration or compatibility code.
- Bind both Advisor and Arbiter gate actors to exact `maister:advisor`; remove actor-specific model fields and resolve model/effort through the common execution profile.
- Separate structural projection, target-specific discovery (E5), and exact invocation (E6): Codex E5 proves `codex.exec` controls, while Cursor/Kiro E5 prove native IDs.
- Persist each dispatch as a locked, hash-chained JSONL event stream with failure-closed recording semantics.

## Open Questions / Risks

- Codex `exec` controls and model availability, Cursor precedence, and Kiro observable identity remain host-version-dependent. Unsupported prerequisites must produce typed failures or `unavailable` evidence rather than alternate architecture.
- Multi-root persistence and recovery must be introduced as one versioned lifecycle; partial adoption would weaken installer guarantees.

## Clarification Outcome

- Technical approach clarified: yes.
- Multiple unresolved architectural approaches: no.
- Additional technical decision gates required: resolved in Phase 6 by explicit user approval of managed `codex exec` workers.
- Binding source: copied research artifacts, accepted Phase 1/2 decisions, official Codex documentation, and the Phase 6 runtime experiment.
