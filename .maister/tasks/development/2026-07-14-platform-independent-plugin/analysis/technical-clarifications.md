# Technical Clarifications: Platform-independent Maister distribution

## TL;DR

The architecture is already decided by the research handoff and Phase 2 gates: one portable common layer, explicit Codex/Cursor/Kiro CLI overlays, and a transactional installer. The remaining technical constraints are encoded as requirements rather than open forks. Native evidence may remain unavailable, but it must never be represented as passing evidence.

## Resolved technical decisions

- **Source ownership**: common behavior is maintained once; host-specific behavior is explicit overlay data and native assets.
- **Semantic abstraction**: use minimal typed primitives only at control-flow, safety, persistence, delegation, continuation, and capability boundaries; do not introduce a full DSL.
- **Installation lifecycle**: resolve, stage, validate, snapshot, commit atomically, publish receipt, and recover/rollback through a journal.
- **Settings ownership**: prefer dedicated whole-file ownership; use narrowly allowlisted managed keys for unavoidable shared settings, with drift detection and exact rollback.
- **Compatibility**: fail closed for semantic, safety, persistence, and rollback capabilities; allow provisional status only for packaging-only differences.
- **Evidence**: require E1/E2/E4 for each host plus shared-core E3; record E5/E6 as unavailable when no runtime exists. Evidence expires per capability.
- **Migration exit**: use legacy generated outputs as shadow oracle, require zero unresolved semantic/inventory/reference/hook/permission/topology differences, then delete legacy infrastructure.

## No unresolved architectural fork

The host-contract, settings-ownership, native-evidence, evidence-freshness, and documentation-boundary choices were presented as Phase 2 gates and accepted by the user. Specification creation should encode those choices, not reopen them.
