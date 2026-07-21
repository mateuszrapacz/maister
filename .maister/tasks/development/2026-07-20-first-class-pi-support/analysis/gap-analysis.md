# Phase 2: Gap Analysis

## TL;DR
The accepted Pi design maps cleanly onto existing Maister seams, but there is no safe registry-only or adapter-only change: Pi needs one coordinated target slice across distribution, lifecycle, runtime, evidence, and release.
The dominant task is high-risk modification plus creation of new contracts; it has no reproducible defect and no UI-heavy work.
Five scope decisions cover package layout, semantic projection, managed settings ownership, the native bridge failure boundary, and evidence/release admission.

## Key Decisions
- Preserve the confirmed current-state all-target admission and least-ownership boundaries from Phase 1.
- Treat each Pi contract as closed and fail-closed: missing mappings, ambiguous ownership, unsupported versions, wrong identities, and unavailable evidence must not degrade to fallback behavior.
- Reuse existing materializer, transaction, runtime-event, evidence, packaging, and test infrastructure; add Pi-specific seams only where host semantics require them.

## Open Questions / Risks
- The five decisions below determine the exact implementation boundary and must be recorded before requirements/specification work.
- `managed_array_entries` and Pi package discovery are new safety-sensitive boundaries requiring adversarial lifecycle and collision tests.
- Public foreground delegation has no durable replay/resume contract; process loss must remain a typed failure with preserved Maister history.
- The active repository still contains three-target assumptions in tests and release loops; current-state admission requires deliberate rewrites, not blind parameterization.

## Current vs Desired State

| Area | Current state | Desired Pi state | Change class |
| --- | --- | --- | --- |
| Target registry | Codex, Cursor, Kiro CLI only | Add `pi` with `pi.native` identity and closed semantic bindings | Parameterize + new target |
| Overlay | Versioned target overlays, no Pi overlay | Pi manifest, inventory, projection identity, roots, probes, evidence, forbidden topology | New projection |
| Agent projection | Canonical 28 roles projected to existing hosts | Exact 28 namespaced Pi descriptors discovered from the generated package | Pi projection |
| Commands/skills | Canonical workflows with host-specific representations | Reviewed hybrid mapping to Pi skills, prompts, and minimal extension commands | Pi projection |
| Materialization | Deterministic staged source/overlay assembly | One generated private Pi package with portable closure and provenance | Reuse + Pi package |
| Settings ownership | Whole-file and managed-key ownership | One identity-aware `packages[]` entry without claiming the array | New ownership primitive |
| Runtime | Three-method exact-native port and durable events | Public `pi-subagents/delegation` v1 bridge with exact identity and typed failures | New adapter |
| Evidence | E1-E6 policy and target closure over three targets | Pi E1-E6 producers and explicit unavailable/provisional outcomes | Parameterize + scenarios |
| Release/CI | Three-target loops and historical oracle references | Current-state four-target admission and Pi archive/lifecycle coverage | Rewrite loops |

## Task Characteristics

```yaml
risk_level: high
task_characteristics:
  has_reproducible_defect: false
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: true
  ui_heavy: false
scope_expanded: true
```

## Integration Points

- Registry and overlay validation: `targets.mjs`, `overlay-loader.mjs`, `overlay-v1.schema.json`, Pi overlay/inventory.
- Projection/materialization: `agent-manifest.mjs`, `agent-projector.mjs`, `materializer.mjs`, package manifest and deterministic closure.
- Lifecycle: `settings-owner.mjs`, `transaction-manager.mjs`, receipt/journal schemas, `recovery.mjs`, install/update/verify/uninstall commands.
- Runtime and events: production runtime owner, exact-native adapter seam, Pi bridge, `execution-event-writer.mjs`, resolver and cancellation/error mapping.
- Evidence and release: evidence policy/probes, release interface, Make/CI target loops, archives, provenance, extracted lifecycle smoke, target topology.
- Tests: target/overlay/agent projection/materializer/installer/runtime/evidence/release/topology suites, plus Pi-specific native and collision fixtures.

## Phase Summary

Gap analysis confirms that the research recommendation is implementation-ready only as a coordinated end-to-end scope. No TDD Red or UI mockup phase is activated. Phase 5 should produce the detailed requirements and specification after the five scope decisions below are explicitly recorded.

## Scope Decisions Needed

The separate decision inventory is in `analysis/scope-clarifications.md`; each item retains its own ordered options and recommendation.
