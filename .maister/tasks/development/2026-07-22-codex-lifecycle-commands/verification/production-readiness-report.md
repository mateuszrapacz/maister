# Production-readiness report: Codex lifecycle skills

## Structured summary

| Field | Result |
| --- | --- |
| Status | **CONDITIONAL / NO-GO for production package release** |
| Target | Codex overlay and package change |
| Scope | Materialization, target inventory, deterministic output, parity/evidence, documentation, rollback/safety, and known blockers |
| Review mode | Read-only; no source, test, documentation, workflow state, or other report files were changed |
| Change-specific defects | 0 confirmed |
| Blocking findings | 3, all pre-existing or external to this change |
| Non-blocking concerns | 2 |
| Exact report path | `.maister/tasks/development/2026-07-22-codex-lifecycle-commands/verification/production-readiness-report.md` |

The Codex lifecycle change itself is healthy at the target-artifact level. It produces the five requested `$maister:*` skills with the correct Codex-relative names, modes, content, inventory validation, and deterministic hashes. The package is not releasable from the current worktree because the repository-wide release gates are blocked by pre-existing projection/evidence drift and an unrelated Codex native rollback failure.

## Checks performed

| Area | Result | Evidence |
| --- | --- | --- |
| Codex materialization | **PASS** | Direct production-shaped materialization produced `skills/bye/SKILL.md`, `skills/dev/SKILL.md`, `skills/next/SKILL.md`, `skills/resume/SKILL.md`, and `skills/status/SKILL.md`. All have frontmatter names matching their directories and mode `0644`. |
| Target inventory | **PASS** | `make test-overlay TARGET=codex` exited 0. Direct materialization reported `inventory`, `syntax`, `modes`, `hashes`, and `content` validation all `true`. |
| Deterministic output | **PASS** | `node --test tests/platform-independent/codex-utility-skills.test.mjs` passed 1/1 and asserted repeated materialization content/tree hashes are identical. A direct run reported content/tree hash `1cba32ea58447c7dcc50fe06021827fb394401590f24f0532d9df07d3aecb3d5`. |
| Lifecycle semantics | **PASS** | Focused test asserted `$maister:development`, `--from=<phase>`, read-only behavior for `next`/`status`, and state-preserving behavior for `bye`. Forbidden Cursor/Claude/Pi vocabulary checks passed. |
| Parity/evidence | **PASS** | `make test-evidence` exited 0 with 46/46 tests passing. The Codex baseline removes exactly the ten lifecycle directory/file absence observations required by the new materialized paths. |
| Repository topology | **PASS** | `make test-topology` exited 0 with no violations. |
| Documentation | **PASS** | `docs/commands.md` documents all five Codex commands, their state semantics, and the read-only behavior of `next` and `status`. |
| Rollback and deployment | **BLOCKED** | Release-package lifecycle coverage cannot complete in the current repository state; see PR-B3. The implementation remains additive and uses the existing transaction/deployment machinery, but the complete production rollback path was not demonstrated. |

## Blocking findings

### PR-B1 — Cursor canonical projection drift

- **Severity:** Blocking for repository release; pre-existing and outside this task's approved scope.
- **Observed:** `make check-cursor-projection` exited 2 with:

  `Canonical source drift for development: expected 4fb5185d50a644ae6bb4a95720318d19aa88b785374b1134d319107cb7699db8, got c8493353beb2b571cf63372b5f537d95556a6c81a534b2b01d4388ad4d862ed0`

- **Impact:** The core overlay test fails its Cursor projection assertion, and package creation is stopped by the Makefile's Cursor projection gate before release archives can be exercised.
- **Disposition:** Resolve the existing Cursor/source projection drift in its own change, then rerun the full repository and release checks. No Cursor files were changed during this review.

### PR-B2 — Stale Pi command source digest

- **Severity:** Blocking for the repository-wide core suite; pre-existing and outside this task's approved scope.
- **Observed:** Two `source-materializer.test.mjs` cases fail with `E_AGENT_PROJECTION_BINDING` for `commands/modeling-aggregate-designer.md`: expected digest `9f80a86f66a9a83e5a410851f087309d3dc0da486afc5693889948e33ff35087`, actual digest `e26cc4e9edf01a3fcf72d2fc5bbb297549a7cdf7e352e945986b6b9fa35a5ecf`.
- **Impact:** `make test-core` completed 72 passing tests but failed 3, including these two materializer cases. This prevents a clean repository-wide core verdict.
- **Disposition:** Reconcile the Pi command projection/source digest in its own scoped change or restore the expected source bytes; do not alter it as part of this Codex lifecycle task.

### PR-B3 — Codex native deployment rollback failure

- **Severity:** Critical safety blocker for production release; pre-existing/unrelated to the five skill assets.
- **Observed:** The release-package CLI scenario failed with exit code `7` and `E_RECOVERY_FAILURE`: `Codex native deployment rollback could not be completed`.
- **Impact:** The release-package suite completed 1 passing and 6 failing tests. Five package scenarios were stopped earlier by PR-B1; the remaining GitHub-CLI scenario reached Codex deployment and exposed the rollback failure. A production deployment cannot be approved without a verified rollback boundary.
- **Disposition:** Diagnose and fix the Codex deployment recovery path separately, then rerun the package lifecycle and rollback scenarios in a clean environment.

## Non-blocking concerns

### PR-C1 — Shared materializer precedence has only end-to-end regression coverage

- **Severity:** Medium concern, not a demonstrated defect.
- The implementation adds native-overlay precedence to the shared assembly planner so the Codex asset files replace the same-path common `maister-*` lifecycle files. The production-shaped Codex materialization test proves the requested result, but there is no isolated unit case covering both native-over-common and common-over-native ordering while preserving rejection of unrelated collisions.
- **Mitigation:** Add a focused assembly-plan regression test before broadening this materializer behavior or relying on it for additional targets.

### PR-C2 — `bye` is a semantic handoff, not a native process-exit primitive

- **Severity:** Low, accepted design limitation.
- The Codex skill can preserve and summarize workflow state, but it cannot force the host process to terminate. This is explicit in the specification and documentation and does not invalidate resumability.
- **Mitigation:** Keep the wording state-preserving and avoid presenting `$maister:bye` as an operating-system or Codex process shutdown API.

## Safety and rollback assessment

- The change is additive at the overlay/package level: five files, one merged Codex skills tree, focused coverage, parity reconciliation, and command documentation.
- The canonical portable skill source and non-Codex projections were not changed by this task's implementation files.
- The five new files use `0644`; the overlay declares the merged tree as `0755`; target inventory and content validation passed.
- `next` and `status` explicitly prohibit workflow execution/mutation. `bye` explicitly preserves active state and does not mark an in-progress workflow complete. `resume` intentionally continues the persisted workflow.
- Full deployment and rollback safety remains **unverified** because PR-B3 fails the existing Codex native rollback scenario. This is a release gate, not evidence that the five new skill files cause the failure.

## Worktree and release hygiene

The worktree is intentionally dirty and contains unrelated Pi probe/evidence modifications plus generated/untracked task and environment artifacts. The reviewed implementation files are identifiable, but this state should not be used as a release source until the unrelated changes are isolated and the repository-wide gates are rerun from a clean, reproducible checkout.

## Release recommendation

**Do not publish the production package from the current worktree.** The Codex lifecycle artifact is ready for targeted integration, with no change-specific blocker found. Production approval should wait for:

1. resolution of PR-B1 and PR-B2;
2. resolution and successful rerun of the Codex rollback scenario in PR-B3;
3. a clean-checkout rerun of `make test-core`, `make check-cursor-projection`, `make test-evidence`, `make test-topology`, and the complete release-package suite;
4. optional hardening of the shared materializer precedence test described in PR-C1.

## Post-fix update

PR-C1 is resolved: the materializer now requires explicit `native: true` opt-in, and the focused Codex test covers native-over-common in both orders plus native/native and unrelated collision rejection. The production-package recommendation remains conditional/no-go only because the pre-existing Cursor/Pi projection failures and unrelated Codex rollback failure still block a clean repository-wide release.
