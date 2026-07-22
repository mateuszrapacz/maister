# Clarifications

> **TL;DR**: The request names three lifecycle commands and says “etc.” Existing Maister history defines that set as five Codex utility skills: `bye`, `dev`, `next`, `resume`, and `status`.
>
> **Key Decisions**:
> - Include all five historical Codex utilities for parity with Cursor and the former Codex target.
> - Use Codex-native `$maister:*` references in skill instructions.
>
> **Open Questions & Risks**:
> - No additional scope clarification is required before gap analysis; the historical implementation provides a precise behavioral reference.

## Resolved assumptions

1. “etc.” includes `maister:dev` and `maister:next`, matching the prior Codex implementation and the current Cursor projection.
2. `orchestrator-state.yml` remains the only workflow-state source; utility skills read or preserve it and do not introduce another state store.
3. This change is Codex-specific. The common skill inventory and Pi/Kiro projections remain unchanged.
