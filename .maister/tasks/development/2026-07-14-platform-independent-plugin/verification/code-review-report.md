# Phase 11 Independent Code Quality and Security Review — Final Re-Verification

## TL;DR

**Patch security verdict: APPROVED. Verification verdict: PASSED WITH ENVIRONMENT ISSUE. Current-workspace release verdict: DO NOT RELEASE.**
Both prior P1 defects are closed in their reported interfaces, the two test-only repairs are correct, and no production or test regression was found.
The sole 111/112 failure is ignored local IDE residue in `.idea/workspace.xml`, not repository product state; strict release parity also correctly refuses the dirty checkout.
Run the unchanged release gates from a clean isolated checkout before publication.

## Key Decisions

- Close P1-01 — install/update now establishes one immutable source binding before lifecycle state creation and carries that exact binding through overlay selection, materialization, revalidation, evidence, and receipt provenance.
- Close P1-02 for the reported threat — the Makefile no longer expands a caller-controlled target list, rejects ordinary `SUPPORTED_TARGETS=<value>` overrides without reading the value, and delegates enumeration to the central Node registry.
- Accept both test-only repairs — the overlay-negative fixture now reaches its intended immutable-source boundary, and the topology contract now checks fixed Make-to-Node delegation rather than requiring duplicate Make ownership.
- Classify `.idea/workspace.xml` as environment residue — it is ignored, untracked, and outside production/test/package inputs; its stale changelist text does not reproduce a product defect.
- Do not add an editor-specific `.idea` exclusion — prefer a clean checkout or Git-aware topology enumeration so all tracked and non-ignored candidate files are checked without creating a blind spot for a future force-added IDE file.

## Open Questions / Risks

- Strict parity has not passed in this shared dirty checkout; the dirty-local zero-unresolved result is diagnostic only.
- Native E6 remains unavailable where no reviewed host scenario exists; unavailable is not a semantic pass.
- GNU Make immediately evaluates arbitrary command-line `:=`/`!=` assignments before it reads the Makefile. The repaired boundary is safe for untrusted values passed through a fixed assignment/environment interface, but arbitrary Make argv must remain trusted.
- Four previously recorded hardening limits remain unchanged: cooperative-writer pathname guarantees, broad materializer exceptions, broad topology exclusions, and caller-supplied package commit identity outside the protected release flow.

## Scope and Evidence

- Repository: `/Users/mrapacz/Workspace/maister`
- Task: `.maister/tasks/development/2026-07-14-platform-independent-plugin`
- Review scope: final Phase 11 production/security delta, two prior P1s, the iteration-2 test-only repairs, final test report, and ignored IDE topology residue.
- Inputs reviewed: project standards, `orchestrator-state.yml`, specification, implementation plan, work log, current working-tree delta, prior review, and final `test-suite-results.md`.
- Independent focused execution: source-binding A/B rejection, overlay-outside-source failure ordering, Make override rejection, and central registry enumeration all passed (5/5 Node test records; four named contracts plus the loaded topology test file).
- Canonical test evidence: 111/112 authoritative tests; package lifecycle 4/4; dirty-local parity 3/3 with zero unresolved; strict parity failed closed with `E_SOURCE_DIRTY`.
- Reviewer mutations: production code, tests, and IDE state were not modified. Only this report was replaced.

## Prior P1 Re-Verification

### P1-01 — Split lifecycle/materializer source binding: resolved

| Field | Result |
| --- | --- |
| Prior severity | P1 — source provenance and installed-byte integrity |
| Current status | Resolved |
| Production locations | `transaction-manager.mjs:476-554`, `747-784`, `1036-1069`; `materializer.mjs:842-935`; `source-resolver.mjs:551-649` |
| Regression | `installer-transaction.test.mjs:395-424` |

`executeLifecycle()` resolves or revalidates the source before `getTargetPaths()` and `ensureDirectories()` (`transaction-manager.mjs:1036-1046`). `assertSourceRootBinding()` realpath-normalizes the resolved root, any direct `resolvedSourceRoot`, and a local/file source argument and rejects disagreement (`transaction-manager.mjs:476-493`). This closes the original direct A/B path before lifecycle state is created.

Install/update selects overlays only from that bound root (`transaction-manager.mjs:521-554`, `747-754`) and passes the frozen resolved binding to `materialize()` (`transaction-manager.mjs:770-775`). The materializer revalidates the same checkout rather than resolving source text again, verifies it before and after copying, and returns the resulting identity (`materializer.mjs:847-850`, `889-933`; `source-resolver.mjs:551-649`). The lifecycle compares the provenance-significant binding fields before advancing the transaction (`transaction-manager.mjs:496-519`, `776`) and separately rechecks the portable-core hash (`transaction-manager.mjs:759-784`).

The adversarial A/B regression passed and proved `E_SOURCE_ROOT` occurs before both the state root and active target exist. No overlay-root fallback remains for source-bound install/update. No regression was found.

### P1-02 — Pre-validation `SUPPORTED_TARGETS` recipe expansion: resolved within the reported interface

| Field | Result |
| --- | --- |
| Prior severity | P1 — Make recipe command injection |
| Current status | Resolved for fixed assignment/environment values; arbitrary Make argv remains a trusted boundary |
| Production locations | `Makefile:3-6`, `63-65`; `release-interface.mjs:298-302`, `372-380`; `targets.mjs:1-26` |
| Regressions | `make-interface.test.mjs:43-70` |

The Makefile does not own or interpolate a target list. Its guard expands only `$(origin SUPPORTED_TARGETS)` and emits a constant error (`Makefile:3-6`); `validate` invokes a fixed Node command (`Makefile:63-65`). Node enumerates `SUPPORTED_TARGET_IDS` from the central frozen registry and invokes validation with argument arrays (`release-interface.mjs:298-302`; `targets.mjs:1-26`). The existing Make-function, shell-metacharacter, and exact-registry regressions passed without producing their sentinels.

An additional adversarial probe showed that `make validate 'SUPPORTED_TARGETS:=$(shell ...)'` executes the shell function while GNU Make parses its command line, before any Makefile can guard it. This does **not** recreate the reported product flaw: arbitrary Make command-line syntax is itself executable input, and the same primitive works under any variable name independently of this repository. It does mean the phrase “any override is rejected before evaluation” is too broad. CI or wrappers must pass untrusted data only as values through a fixed assignment/environment field and must never accept arbitrary extra Make argv. If arbitrary argv ever becomes an input requirement, validation must occur in a wrapper before GNU Make starts.

## Test-Only Repair Assessment

### Repair T-01 — Make/topology contract: correct

`evidence-parity-topology.test.mjs:927-937` now asserts all of the intended properties:

- no Make-owned `SUPPORTED_TARGETS` declaration;
- a constant non-configurable-origin guard;
- fixed `release-interface.mjs validate-overlays` delegation;
- the focused platform-independent test entry point;
- Cursor projection enforcement; and
- absence of legacy generated-tree vocabulary.

`make-interface.test.mjs:64-70` remains the executable owner of the exact `codex`, `cursor`, `kiro-cli` enumeration contract. The repair removes the stale duplicate-registry expectation without weakening production behavior. The Make assertions are currently masked in the combined real-checkout test by the earlier `.idea` topology failure, but direct source inspection and the independently executed registry test confirm them.

### Repair T-02 — Missing-overlay fixture identity: correct

`installer-transaction.test.mjs:362-393` supplies the copied fixture with a source-bound Git seam whose top-level root, full commit, and clean status satisfy immutable-source resolution. The fixture still lacks its selected overlay, so it now reaches the intended `E_OVERLAY_IO` boundary. The assertions retain the important transactional contract: neither active content nor an active receipt exists after rejection.

The focused test passed. The repair changes only test setup; it does not weaken production source resolution or reorder production errors.

## Ignored `.idea` Topology Residue

### Classification: environment residue; not a production defect and not a test-contract defect

| Evidence | Result |
| --- | --- |
| Path | `.idea/workspace.xml` |
| Git status | Ignored by `.gitignore:5` (`.idea/`) |
| Tracking | `git ls-files --error-unmatch` confirms it is untracked |
| Stale text | 554 legacy-path matches in local IDE changelist/history state |
| Scanner behavior | `scanTopology()` recursively reads every non-excluded file from the filesystem (`shadow-parity.mjs:485-510`) |
| Product/package reachability | None shown; package lifecycle passes 4/4 and the file is not a repository input |

The topology gate is correctly fail-closed for the filesystem tree it was asked to scan, but the real-checkout test couples repository-topology validation to ignored operator state. That makes the current run environment-sensitive; it does not establish stale production topology. The 111/112 result should therefore be reported as `passed_with_environment_issue`, not as a production regression and not as a green release gate.

An explicit `.idea` entry in `excludePaths` is **not recommended**. It would fix one editor symptom while allowing a future tracked or force-added `.idea` file to bypass topology policy. Preferred remedies are:

1. Run the unchanged topology and strict parity gates in the required clean isolated checkout; or
2. Make real-repository topology enumeration Git-aware: scan tracked files plus non-ignored untracked files, excluding ignored files generically. This still catches newly added implementation files while avoiding editor/cache-specific exclusions.

No production, test, or IDE mutation is warranted in this read-only review.

## Regression, Quality, Security, and Performance Assessment

- No source A / materialized source B route remains through the reviewed install/update interface.
- No caller-controlled target-list value reaches a Make recipe, shell interpolation, or inline JavaScript boundary.
- Both repaired production boundaries fail before persistent target mutation in their covered adversarial cases.
- The two test-only changes preserve stronger fail-fast ordering and transactional no-mutation assertions.
- No new secret, credential, unsafe remote-script, dynamic shell construction, unbounded retry, N+1 I/O pattern, or material performance regression was found in the final delta.
- The final 111/112 failure and strict-parity refusal are checkout-state conditions, not evidence that either prior P1 persists.

## Findings

### Warning W-ENV-01 — Ignored IDE state blocks the real-checkout topology acceptance test

- Category: verification environment
- Location: `.idea/workspace.xml`; scanner at `plugins/maister/bin/shadow-parity.mjs:485-510`
- Production defect: no
- Test defect: no stale behavioral assertion; the test is environment-coupled
- Effect: authoritative suite remains 111/112 and `make validate` remains non-zero in this checkout
- Action: rerun unchanged gates in a clean isolated checkout, or separately adopt Git-aware topology enumeration; do not special-case `.idea` alone

### Info I-REL-01 — Strict parity is not established in the current checkout

- Category: release precondition
- Evidence: `test-parity-release` correctly returns `E_SOURCE_DIRTY`; dirty-local diagnostic parity is 3/3 with zero unresolved
- Effect: no publication authorization from this workspace
- Action: run strict parity and same-job package checks from a clean isolated checkout

### Info I-THREAT-01 — Arbitrary GNU Make argv is executable input

- Category: threat-model boundary
- Evidence: immediate `:=` assignment expansion occurs before the Makefile guard
- Production defect: no, provided callers control the assignment syntax and pass untrusted text only as a value
- Action: never expose arbitrary Make argv to untrusted input; use a pre-Make wrapper if that requirement changes

## Carried Non-Blocking Hardening Risks

The following pre-existing risks were not introduced or worsened by the final repairs:

1. Pathname guarantees rely on the documented cooperative-writer boundary, not protection from arbitrary malicious same-user or privileged mutation.
2. Materializer generic text/reference exceptions remain broader than ideal.
3. Existing topology exclusions are broad enough to hide future product content placed below excluded roots.
4. Package/E3 commit identity is caller-supplied outside the protected CI release flow.

These are hardening debt and claim-boundary constraints, not regressions in the reviewed final delta.

## Structured Result

```yaml
status: passed_with_environment_issue
verdict: approved
patch_security_verdict: approved
verification_verdict: passed_with_environment_issue
release_verdict: do_not_release_from_current_checkout
report_path: verification/code-review-report.md
summary:
  critical: 0
  warning: 1
  info: 2
  production_regressions: 0
  test_regressions: 0
issues:
  - id: W-ENV-01
    source: code_review
    severity: warning
    category: verification_environment
    description: ignored local IDE state blocks the real-checkout topology test
    location: .idea/workspace.xml
    production_defect: false
    classification: environment_residue
    fixable: true
    suggestion: rerun in a clean isolated checkout or use Git-aware topology enumeration; do not add an editor-specific exclusion
  - id: I-REL-01
    source: code_review
    severity: info
    category: release_precondition
    description: strict parity correctly refuses the dirty shared checkout
    location: repository_worktree
    production_defect: false
    fixable: true
    suggestion: run strict parity and same-job release checks in a clean isolated checkout
  - id: I-THREAT-01
    source: code_review
    severity: info
    category: security_claim_boundary
    description: arbitrary GNU Make argv can execute during Make command-line parsing before any Makefile guard
    location: Make invocation boundary
    production_defect: false
    fixable: false
    suggestion: keep Make argv trusted and pass untrusted data only through fixed value fields
issue_counts:
  critical: 0
  warning: 1
  info: 2
carried_hardening_risks:
  warning: 4
repaired_boundaries:
  lifecycle_materializer_source_binding: resolved
  supported_targets_recipe_expansion: resolved_for_fixed_value_interface
test_only_repairs:
  make_topology_contract: correct
  immutable_overlay_fixture: correct
tests:
  authoritative: 111/112
  focused_independent: passed
  release_package: 4/4
  parity_dirty_local_diagnostic: 3/3_zero_unresolved
  parity_strict: failed_closed_dirty_checkout
idea_topology:
  classification: environment_residue
  production_defect: false
  test_contract_defect: false
  explicit_idea_exclusion_recommended: false
production_code_modified: false
tests_modified: false
ide_state_modified: false
```
