## TL;DR

Research selected a thin public `@mateuszrapacz/maister` npx launcher that resolves and verifies target-specific archives from `mateuszrapacz/maister` GitHub Releases, then delegates every host mutation to the existing transactional `maister-install.mjs`.

Brainstorming and high-level design both ran. The design uses ports and adapters around the existing transactional core and records five accepted MADR decisions. Confidence is high for the local installer/release boundary and medium for npm publication and publisher-authentication details that still require implementation validation.

Workflow status: **completed** after explicit protected handoff approval on `2026-07-18T11:51:51.390Z`. The canonical full decision context is [orchestrator-state.yml](../orchestrator-state.yml); the live projection is [dashboard.html](../dashboard.html).

## Key Decisions

- Publish `@mateuszrapacz/maister` with a `maister` binary as a thin distribution adapter.
- Keep GitHub Release archives as target-specific payloads and `maister-install.mjs` as the sole host mutation authority.
- Require an explicit `codex`, `cursor`, or `kiro-cli` target.
- Treat exact versions as reproducible; make `latest` display and record its resolved immutable version.
- Fail closed on target, release, digest, archive topology, source manifest, or E3 mismatch before delegation.
- Coordinate npm and GitHub publication as one logical release unit while stating that unsigned integrity metadata does not authenticate the publisher.

## Open Questions / Risks

- Verify the minimum Node engine during implementation; Node 22 is the current CI reference.
- Select an extraction implementation that proves the accepted cross-platform safety policy.
- Define partial-publication handling because npm and GitHub publication is not atomic.
- Decide later whether trusted publishing or stronger signing becomes a required publisher-authentication anchor.
- Two Phase 3 recovery questions describe running agents as failed. The canonical review note corrects this: those agents were interrupted by the orchestrator before terminal status.

## Output Inventory

- [Research report](research-report.md) · [HTML](research-report.html)
- [Solution exploration](solution-exploration.md) · [HTML](solution-exploration.html)
- [High-level design](high-level-design.md) · [HTML](high-level-design.html)
- [Decision log](decision-log.md) · [HTML](decision-log.html)
- [Research dashboard](../dashboard.html)

## Optional Phases

| Phase | Ran | Result |
|---|---:|---|
| Brainstorming | Yes | Compared GSD, Superpowers, Matt Pocock skills, `vercel-labs/skills`, and `gh skill install`; generated four alternatives. |
| Convergence | Yes | Selected `Thin npx release launcher (Recommended)`. |
| High-level design | Yes | Produced ports-and-adapters design and five accepted MADR records. |

## Gate Decision Ledger

All gates were configured `fully_automatic`, but this host did not advertise safe automatic continuation. Effective policy was therefore `manual`; every terminal selection was made by the user. Advisor and Arbiter models were not invoked, their attempt lists are empty, and gate confidence is `null`.

### 1. Research foundation exit

- Phase / type: `phase-1` / `phase-1-exit`
- Question: Research foundation complete (initialized, planned, gathered, synthesized). Continue to brainstorming evaluation?
- Options: `Continue to brainstorming evaluation`; `Pause workflow`
- Original recommendation: `Continue to brainstorming evaluation`
- Selected: `Continue to brainstorming evaluation`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-17T21:55:16Z` / `2026-07-17T22:17:30Z`
- Full context: [canonical state](../orchestrator-state.yml), [research report](research-report.md)

### 2. Brainstorming selection

- Phase / type: `phase-2` / `optional-phase-selection`
- Question: The synthesis identifies one dominant architecture and no materially competing approaches. Would you like to explore solution alternatives?
- Options: `Yes, explore alternatives`; `No, skip brainstorming`
- Original recommendation: `No, skip brainstorming`
- Selected: `Yes, explore alternatives`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `true`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-17T22:18:11Z` / `2026-07-17T22:28:03Z`
- Full context: [canonical state](../orchestrator-state.yml), [solution exploration](solution-exploration.md)

### 3. First Phase 3 recovery

- Phase / type: `phase-3` / `design-failure-recovery`
- Question: The solution brainstormer failed to produce its required artifacts after two attempts. How should the workflow recover?
- Options: `Retry design`; `Skip design`; `Stop workflow`
- Original recommendation: `Retry design`
- Selected: `Retry design`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-17T22:32:19Z` / `2026-07-17T22:36:16Z`
- Context correction: the agent had timed out from the wait window but was still `running`; it was interrupted by the orchestrator rather than returning an error.
- Full context: [canonical state](../orchestrator-state.yml)

### 4. Second Phase 3 recovery

- Phase / type: `phase-3` / `design-failure-recovery`
- Question: The user-approved retry also failed to produce the required solution-exploration artifacts. How should the workflow recover now?
- Options: `Retry design`; `Skip design`; `Stop workflow`
- Original recommendation: `Skip design`
- Selected: `Retry design`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `true`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-17T22:40:59Z` / `2026-07-17T22:46:46Z`
- Context correction: absence of intermediate files was incorrectly treated as failure; the later resumed agent completed successfully when allowed to reach a terminal state.
- Full context: [canonical state](../orchestrator-state.yml), [solution exploration](solution-exploration.md)

### 5. Solution generation exit

- Phase / type: `phase-3` / `phase-3-exit`
- Question: Continue to solution convergence?
- Options: `Continue to solution convergence`; `Pause workflow`
- Original recommendation / selected: `Continue to solution convergence` / `Continue to solution convergence`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-17T22:55:05Z` / `2026-07-17T23:27:31Z`
- Full context: [canonical state](../orchestrator-state.yml), [solution exploration](solution-exploration.md)

### 6. Primary architecture convergence

- Phase / type: `phase-4` / `research-convergence`
- Question: Which primary distribution architecture should Maister adopt?
- Options: `Thin npx release launcher (Recommended)`; `Agent Skills copy/symlink package`; `Per-host managed marketplace plugins`; `Hybrid universal bootstrap plus host adapters`; `Need more info`
- Original recommendation / selected: `Thin npx release launcher (Recommended)` / `Thin npx release launcher (Recommended)`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-17T23:28:42Z` / `2026-07-18T09:58:57Z`
- Full context: [canonical state](../orchestrator-state.yml), [solution exploration](solution-exploration.md)

### 7. High-level design selection

- Phase / type: `phase-2` / `optional-phase-selection`
- Question: The selected npx launcher introduces concrete architecture decisions that feed directly into development. Would you like to generate a high-level design?
- Options: `Yes, generate design`; `No, skip design`
- Original recommendation / selected: `Yes, generate design` / `Yes, generate design`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-18T09:58:57Z` / `2026-07-18T10:31:36Z`
- Full context: [canonical state](../orchestrator-state.yml), [high-level design](high-level-design.md)

### 8. Convergence exit

- Phase / type: `phase-4` / `phase-4-exit`
- Question: Brainstorming complete. Continue to high-level design?
- Options: `Continue to high-level design`; `Pause workflow`
- Original recommendation / selected: `Continue to high-level design` / `Continue to high-level design`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-18T10:32:09Z` / `2026-07-18T11:23:52Z`
- Full context: [canonical state](../orchestrator-state.yml), [decision log](decision-log.md)

### 9. Design assumptions clarification

- Phase / type: `phase-5` / `research-clarification`
- Question: Are the proposed high-level design assumptions correct?
- Options: `Confirm assumptions`; `Correct assumptions`; `Provide more context`
- Original recommendation / selected: `Confirm assumptions` / `Confirm assumptions`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-18T11:24:48Z` / `2026-07-18T11:29:11Z`
- Full context: [canonical state](../orchestrator-state.yml), [high-level design](high-level-design.md)

### 10. Design exit

- Phase / type: `phase-5` / `phase-5-exit`
- Question: Design complete. Continue to output generation?
- Options: `Continue to output generation`; `Pause workflow`
- Original recommendation / selected: `Continue to output generation` / `Continue to output generation`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-18T11:44:20Z` / `2026-07-18T11:46:14Z`
- Full context: [canonical state](../orchestrator-state.yml), [decision log](decision-log.md)

### 11. Final handoff approval

- Phase / type: `phase-6` / `final-handoff-approval`
- Question: Research outputs are complete. Approve final handoff?
- Options: `Complete workflow`; `Keep workflow open`
- Original recommendation / selected: `Complete workflow` / `Complete workflow`
- Actor / status: `user` / `decided`
- Rationale: The user selected an exact supplied option.
- Confidence / override: `null` / `false`
- Effective / configured policy: `manual` / `fully_automatic`
- Safety classification: `denylisted`; explicit user approval was mandatory
- Advisor / Arbiter: no model, no response, 0 attempts, not exhausted
- Created / decided: `2026-07-18T11:50:21.328Z` / `2026-07-18T11:51:51.390Z`
- Full context: [canonical state](../orchestrator-state.yml), [dashboard](../dashboard.html)

## Architectural Decision Highlights

1. `@mateuszrapacz/maister` is a distribution adapter; it never owns host mutation.
2. Target archives remain immutable GitHub Release payloads selected by a closed target map.
3. Exact package versions map only to matching `vX.Y.Z` releases; `latest` resolves visibly through npm to one exact version.
4. Verification and archive inspection complete before private extraction and installer delegation.
5. npm and GitHub publication form one logical release, with explicit handling for skew and unsigned provenance limitations.

## Recommended Next Step

Start development from the accepted design in a fresh session:

```text
$maister:development .maister/tasks/research/2026-07-17-npx-release-distribution
```
