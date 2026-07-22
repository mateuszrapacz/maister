# Specification Audit

> **TL;DR**: The specification is implementation-ready for the confirmed Codex overlay-only boundary. It covers the five requested lifecycle skills, the current materializer contract, state semantics, parity evidence, focused tests, documentation, and acceptance criteria. No critical or major gap blocks implementation.
>
> **Key Findings**:
> - The proposed asset location and `merge: true` overlay mapping match the current distribution architecture.
> - Host-relative frontmatter names correctly preserve Codex's `$maister:<command>` namespace.
> - The behavior contract preserves read-only semantics for `next`/`status` and prevents `bye` from falsely completing active work.
> - The test contract covers package contents, frontmatter, forbidden vocabulary, deterministic materialization, and historical parity.
>
> **Open Questions & Risks**:
> - During implementation, remove exactly the ten now-materialized lifecycle entries from the Codex expected-deletion baseline (five directories and five `SKILL.md` files), while preserving unrelated legacy entries.
> - The skills are prompt-level adapters; Codex has no native process-shutdown primitive supplied by this plugin contract.

## Audit scope

Reviewed:

- confirmed requirements and scope clarifications;
- codebase and gap analysis;
- `implementation/spec.md` and its HTML companion;
- Codex overlay, inventory, validation, materializer, parity, and test conventions;
- project architecture and applicable coding/testing standards.

## Findings

### Critical gaps

None.

### Major gaps

None.

### Minor findings

1. The exact baseline edit must be verified after materialization. The current historical expected-deletion rule names `skills/bye`, `skills/bye/SKILL.md`, `skills/dev`, `skills/dev/SKILL.md`, `skills/next`, `skills/next/SKILL.md`, `skills/resume`, `skills/resume/SKILL.md`, `skills/status`, and `skills/status/SKILL.md`. The implementation should remove only those ten entries from the rule or otherwise regenerate equivalent reviewed observations.
2. The focused test should assert the absence of host-specific vocabulary using the overlay's existing forbidden-vocabulary contract rather than duplicating a broad, unrelated list.

## Contract checks

| Area | Result | Evidence in specification |
| --- | --- | --- |
| User journey | Pass | Direct `$maister:*` invocation and per-command behavior are defined. |
| Existing code reuse | Pass | Current overlay/materializer, orchestrator state, and historical behavior are named. |
| Architecture boundary | Pass | Codex-only overlay assets; common inventory and removed builders are explicitly excluded. |
| Packaging | Pass | `assets/skills` tree, `skills` destination, merge semantics, names, and modes are specified. |
| State safety | Pass | `bye`, `next`, `resume`, and `status` semantics are bounded against the existing state file. |
| Testability | Pass | Focused materialization assertions and repository verification commands are listed. |
| Evidence/parity | Pass with implementation check | Ten expected-deletion observations must be reconciled precisely. |
| Documentation | Pass | `docs/commands.md` update and behavior notes are required. |

## Audit decision

**Implementation-ready: yes.** Proceed to implementation planning. The current common source already contains host-specific lifecycle files, so implementation must use a narrowly scoped native-overlay precedence rule to make the Codex frontmatter/content win at the same destination; unrelated collisions must remain errors. The parity baseline observation is an implementation-time verification point, not a specification blocker.
