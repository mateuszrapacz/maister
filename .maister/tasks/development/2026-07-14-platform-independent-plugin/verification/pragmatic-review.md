# Pragmatic Review — Resumed Phase 11 Final Re-Verification

## TL;DR

**Verdict: PASSED WITH ISSUES.** The production implementation is approved: its high complexity is proportionate to the approved transactional distribution, immutable provenance, three-host overlay, exact rollback, evidence, and packaging requirements. Both former P1 defects are resolved, and no production regression or speculative framework was found.

The authoritative suite is **111/112** only because ignored, untracked IDE history in `.idea/workspace.xml` contains 554 references to deleted legacy paths. This is **environment/user-state residue, not a production defect and not a stale assertion**. It does expose an environment-coupled repository-topology contract. The contract should be repaired generically to inspect Git tracked files plus non-ignored untracked files; it should not add an editor-specific `.idea` exclusion.

## Key Decisions

- Approve both prior P1 repairs as minimal and maintainable: one immutable source binding across lifecycle/materialization, and one Node-owned supported-target registry.
- Classify the sole topology failure primarily as ignored environment residue. It cannot enter the repository or release package, and packaged lifecycle verification passes 4/4.
- Change the repository-facing topology candidate set to Git tracked files plus non-ignored untracked files. Preserve raw filesystem traversal for isolated fixture tests.
- Do not special-case `.idea`, weaken forbidden patterns, delete operator IDE state, or treat a clean-checkout rerun as the permanent fix.
- Keep strict parity and same-job release verification as publication conditions; the current dirty checkout correctly fails closed with `E_SOURCE_DIRTY`.

## Open Questions / Risks

- `make validate` remains non-zero in this checkout until the repository-facing topology contract is repaired or verification is run from an isolated checkout without ignored residue.
- Publication remains blocked until strict parity and the complete release sequence pass from a clean isolated checkout.
- Native E5/E6 evidence remains environment-dependent; unavailable evidence must remain explicit and never be promoted to passed.
- `executeLifecycle()` retains the compatibility inputs `source`, `resolvedSource`, and `resolvedSourceRoot`. They now fail safely on disagreement, so contracting this seam should wait for an intentional breaking revision.

## Review Scope

Generated: `2026-07-15T22:04:50Z`

The independent pragmatic specialist reviewed the project scale and architecture, the 17-requirement specification, all 39 implementation-plan steps, the current production and test changes, and the final Phase 11 verification artifacts. Particular attention was given to:

- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/lib/distribution/materializer.mjs`
- `plugins/maister/bin/maister-install.mjs`
- `plugins/maister/bin/release-interface.mjs`
- `plugins/maister/bin/shadow-parity.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `Makefile`
- the repaired platform-independent regression and topology tests
- `.idea/workspace.xml` only as the ignored path reported by the test runner

No production code, test code, dependency, ignored IDE state, or workflow state was modified by this review. This canonical report is the only mutation.

## Overall Complexity and Project Fit

**Complexity: high, but proportionate to the approved risk and current requirements.** The implementation installs into user-owned host configuration, binds immutable source identity, applies three versioned host overlays, manages shared and dedicated settings, journals multi-file transactions, promises byte-exact rollback, records capability evidence, and builds deterministic release packages. The code serving those boundaries is called and tested; it is not speculative infrastructure.

No unnecessary service tier, general workflow DSL, external state store, factory hierarchy, dependency-injection framework, or new third-party dependency was introduced. The latest P1 repairs reduce competing ownership:

- Source identity changed from independently resolvable values to one binding that is revalidated at trust boundaries.
- Supported-target enumeration changed from a duplicated Make/Node policy to a fixed Make delegation backed by the Node registry.

The platform-independent suite has grown beyond the original estimate, but its cases cover distinct filesystem, provenance, recovery, packaging, and hostile-input boundaries. A fixed test-count ceiling would be less pragmatic than risk-based coverage for this installer. The roughly 107-second acceptance suite and roughly 85-second core suite are acceptable release gates; focused Make targets remain the appropriate developer feedback loop.

Immediate production-code reduction potential is negligible, and no dependency is safely removable. The remaining simplification opportunity is localized to repository-topology enumeration and policy ownership.

## Prior P1 Resolution Assessment

### P1-01 — Lifecycle source root A versus materialized source root B

**Status: resolved. Current severity: none.**

The lifecycle now resolves or accepts one source binding before destination state is created, validates caller-provided source/root compatibility, passes the same binding through overlay selection and materialization, revalidates it around assembly, and compares the returned materialized identity before transaction progress. The direct A/B regression proves rejection before target or state mutation.

This repeated checking is deliberate trust-boundary verification of one value, not redundant ownership or over-engineering.

### P1-02 — GNU Make expands caller-controlled `SUPPORTED_TARGETS` before Node validation

**Status: resolved for the fixed supported-target interface. Current severity: none.**

The Makefile no longer declares or interpolates a caller-controlled target list. It rejects a defined `SUPPORTED_TARGETS` origin without evaluating its value, invokes a fixed `validate-overlays` command, and lets `targets.mjs` own the exact `codex`, `cursor`, `kiro-cli` registry. Hostile Make-function and shell-metacharacter regressions pass without creating sentinels.

GNU Make can still evaluate arbitrary command-line assignment syntax before reading a Makefile; callers able to supply arbitrary extra Make arguments remain trusted. That language-level boundary is not a defect in the fixed project interface.

## Sole `.idea/workspace.xml` Failure

### Classification

| Question | Answer |
| --- | --- |
| Primary cause | Environment/user-state residue |
| Production defect | No |
| Stale test assertion | No |
| Environment-coupled verification contract | Yes |
| Contract change recommended | Yes |
| Explicit `.idea` exclusion recommended | No |

Evidence supporting this classification:

- `.idea/workspace.xml` is ignored by `.gitignore` and is not tracked by Git.
- Its 554 matches are IDE changelist/history references to paths deliberately deleted by this migration, not live repository topology.
- Ignored IDE metadata is not a package input; the extracted package lifecycle passes 4/4.
- The two prior P1 regressions and both repaired stale test contracts pass independently.
- `scanTopology()` currently sees all recursively walked filesystem entries except manually excluded names, so the real-repository result varies with editor/cache state that cannot enter a commit or release artifact.

The topology assertion is valuable and correctly reports the bytes it was asked to scan. The problem is the candidate universe used by the repository-facing gate, not the forbidden patterns and not the generic scanner used by fixtures.

### Recommended Contract Repair

For the real repository, enumerate:

```text
Git tracked files
+ untracked files not ignored by Git
```

An equivalent candidate boundary is:

```text
git ls-files --cached --others --exclude-standard -z
```

This contract excludes ignored IDE/cache/operator state generically while retaining the important cases:

- every tracked file is scanned, including a force-added editor file;
- new non-ignored untracked implementation files are scanned before commit;
- future forbidden legacy paths and references still fail;
- release-relevant repository topology remains fail-closed.

The raw recursive `scanTopology()` API should remain available for isolated fixtures. The repository-facing command should provide the Git-derived candidate set. Regression coverage should prove that ignored residue is skipped, while tracked and non-ignored untracked stale references still fail.

## Findings

### M-01 — Repository topology validation is coupled to ignored operator state

- **Severity:** Medium
- **Type:** Suite-blocking developer-experience / verification-contract issue
- **Production defect:** No
- **Observed path:** `.idea/workspace.xml`

Raw recursive traversal makes `make validate` depend on local editor/cache contents that cannot become a release artifact. The result is a false negative for repository state and creates pressure for accumulating tool-specific exclusions. Git-aware candidate enumeration is both narrower and more accurate without weakening tracked-content validation.

### L-01 — Repository topology policy is duplicated

- **Severity:** Low
- **Locations:** topology policy at the `shadow-parity.mjs` CLI seam and `release-interface.mjs`

Forbidden-path, forbidden-pattern, and exclusion policy is represented in more than one repository-facing entry point. While repairing candidate enumeration, export one repository-topology policy and consume it from both commands. This is a small consolidation, estimated at roughly 20–40 lines, and requires no new dependency.

Before:

```text
shadow-parity CLI policy
release-interface topology policy
```

After:

```text
one repositoryTopologyPolicy()
→ shadow-parity CLI
→ release-interface topology
```

### L-02 — Lifecycle source compatibility surface is wider than the canonical model

- **Severity:** Low
- **Location:** `executeLifecycle()` options

The public seam accepts `source`, `resolvedSource`, and `resolvedSourceRoot`. The implementation now validates disagreement and preserves compatibility safely. Immediate contraction would create migration risk without resolving a current defect. In a planned breaking revision, prefer one `sourceBinding` input and keep source-string parsing at the CLI boundary.

### I-01 — Strict parity correctly rejects the current dirty checkout

- **Severity:** Informational

The current shared workspace is not suitable for release-grade parity, and strict mode returns `E_SOURCE_DIRTY`. The explicit dirty-local diagnostic passes all three targets with zero unresolved differences, but it is not a substitute for the clean isolated release gate.

### I-02 — Native semantic evidence remains intentionally provisional

- **Severity:** Informational

Unavailable native E5/E6 evidence is represented explicitly rather than promoted to passed. This is an honest environment limitation and does not justify adding emulation infrastructure in this task.

## Requirements and Plan Alignment

The implementation aligns with **17/17 specification requirements** and **39/39 implementation-plan steps**. In particular:

- immutable source identity binds overlay selection, materialized bytes, portable-core evidence, provenance, and final receipt publication;
- Node owns supported-target policy while Make exposes fixed commands;
- receipts, journals, recovery, settings ownership, and rollback implement current persisted-contract requirements;
- legacy host trees were removed only after parity, packaging, and adversarial lifecycle coverage existed;
- native evidence limitations remain visible rather than being overclaimed.

No requirement appears to have been implemented through a materially more general abstraction than needed.

## Developer Experience

The repaired architecture has a simple operational explanation:

1. Resolve one source.
2. Revalidate that source at trust boundaries.
3. Select the overlay from that source.
4. Materialize and compare the resulting identity.
5. Let Node own the target registry.

Typed failures, focused Make targets, and deterministic package checks are positive developer-experience features. The remaining avoidable friction is that `make validate` currently changes outcome based on ignored local editor history. A Git-aware repository boundary fixes that without weakening security or adding editor-specific policy.

## Top Three Actions

1. **Make repository topology enumeration Git-aware.** Scan tracked plus non-ignored untracked candidates, retain raw traversal for fixtures, and add ignored/tracked/untracked regression cases. Do not special-case `.idea`.
2. **Rerun the full acceptance sequence after the scoped repair.** Require 112/112, `make validate`, package lifecycle 4/4, and strict parity from a clean isolated checkout.
3. **Centralize repository-topology policy while touching that seam.** Use one forbidden-path/pattern policy for both CLI entry points. Defer lifecycle `sourceBinding` API contraction until an intentional breaking revision.

## Merge and Release Recommendation

**Production-code recommendation: approve.** Both P1 repairs are correct, proportionate, and maintainable.

**Merge recommendation: changes required for a green canonical suite.** Repair the repository-facing topology candidate contract and rerun verification; do not merge while the authoritative suite is 111/112.

**Release recommendation: no-go from the current checkout.** Release requires a green full suite, `make validate`, package lifecycle, and strict parity in the clean isolated release environment. Native semantic claims remain provisional while E5/E6 evidence is unavailable.

## Structured Result

```yaml
status: passed_with_issues
verdict: production_approved_scoped_verification_contract_repair_recommended
merge_recommendation: changes_required_for_green_suite
release_recommendation: no_go_from_current_checkout
report_path: verification/pragmatic-review.md
complexity:
  level: high
  assessment: proportionate_to_approved_transactional_distribution_risk
requirements:
  implemented: 17
  total: 17
plan:
  completed_steps: 39
  total_steps: 39
issue_counts:
  critical: 0
  high: 0
  medium: 1
  low: 2
  info: 2
production_regressions: 0
prior_p1:
  lifecycle_source_binding_split: resolved
  supported_targets_make_expansion: resolved_for_fixed_value_interface
tests:
  authoritative_platform_independent: 111/112
  package_lifecycle: 4/4
  dirty_local_parity: 3/3_zero_unresolved
  strict_parity: failed_closed_dirty_checkout
idea_topology:
  primary_classification: environment_user_state_residue
  production_defect: false
  stale_test_assertion: false
  environment_coupled_contract: true
  topology_contract_change_recommended: true
  recommended_scope: tracked_plus_nonignored_untracked
  explicit_idea_exclusion_recommended: false
simplification:
  immediate_production_loc_removal: negligible
  topology_policy_loc_reduction_estimate: 20_to_40
  removable_dependencies: 0
review_mutations:
  production_code: false
  tests: false
  ide_state: false
  report_only: true
```
