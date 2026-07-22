# Gap Analysis

> **TL;DR**: The current Codex overlay exposes the shared Maister skills but not the five host-specific lifecycle entrypoints already present in the historical Codex target and preserved by the Cursor projection. The implementation should add a merged Codex-only utility-skill tree and leave the portable inventory unchanged.
>
> **Key Decisions**:
> - Add `bye`, `dev`, `next`, `resume`, and `status` under the Codex overlay as host-relative skills.
> - Update target evidence and focused materialization coverage for the new paths.
> - Document the Codex `$maister:*` shortcuts alongside the existing Pi shortcuts.
>
> **Open Questions & Risks**:
> - Scope boundary is gated below: overlay-only assets are recommended; promoting them to common source would unintentionally expand other host inventories.
> - The parity baseline must be reconciled with the new Codex package contents.
> - The skills can guide state handling but cannot provide a native Codex process-exit API; `bye` must preserve workflow state and summarize the handoff.

## Current state

`plugins/maister/overlays/codex/overlay.yml` materializes `common/skills` into Codex's `skills/` directory and merges Codex-specific metadata and hooks. It has no target-specific utility-skill asset tree, so `$maister:bye`, `$maister:dev`, `$maister:next`, `$maister:resume`, and `$maister:status` are not available in the produced Codex plugin.

Cursor contains equivalent preserved projection exceptions (`maister-bye`, `maister-dev`, `maister-next`, `maister-resume`, and `maister-status`). Repository history also contains the former generated Codex implementation with the five utilities. The old host-specific builders were removed during the distribution migration and should not be restored.

## Desired state

The Codex package should contain these deterministic files:

```text
skills/bye/SKILL.md
skills/dev/SKILL.md
skills/next/SKILL.md
skills/resume/SKILL.md
skills/status/SKILL.md
```

Each file uses a host-relative frontmatter name (`bye`, `dev`, `next`, `resume`, or `status`) so the Codex plugin namespace exposes `$maister:<command>`. The instructions should reference the current Codex/Maister workflow model, including `orchestrator-state.yml` and the canonical `$maister:development` skill, without adding another state store or changing shared skills.

## Integration points

1. Codex overlay contract: merge `overlays/codex/assets/skills` into `skills`.
2. Five Codex-native `SKILL.md` assets based on the historical behavior.
3. Codex parity/evidence baseline and a focused platform-independent materialization test.
4. `docs/commands.md` documentation for the Codex command names and lifecycle behavior.

## Scope decision

Recommended: **Codex overlay-only utility skills**.

Promoting the files to `plugins/maister/skills/` would make them part of every common projection, changing Pi, Kiro, and other target inventories. Restoring the removed builders would reintroduce the pre-overlay distribution architecture. Neither is necessary to satisfy Codex parity with Cursor.

## Task characteristics

- Reproducible defect: no; this is a missing target capability.
- Existing code modified: yes, overlay contract and evidence/documentation.
- New entities: yes, five Codex skill assets and focused tests.
- Data operations: no.
- UI-heavy: no.
- Risk: medium, because generated package contracts and parity evidence are affected.
