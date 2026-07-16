# Reality Check — Final Phase 11 Verification

## TL;DR

**Implementation verdict: ✅ READY. Merge/release-candidate verdict: ✅ GO. Production publication verdict: ⚠️ CONDITIONAL GO.**
The final platform-independent distribution passes **114/114**, `make validate`, focused topology **20/20**, and packaged lifecycle **4/4**; both former P1 trust-boundary defects remain resolved.
A clean history-preserving committed clone also passed strict parity for all three targets with zero unresolved differences, passed topology, remained clean, and generated all three target packages.
Publication is authorized only after the exact tag commit repeats these gates and closes three release-workflow controls: explicit release permission, full-suite execution, and an empty allowlisted artifact set.

## Key Decisions

- Approve the implementation and merge — no critical or high production defect remains, all functional and release-candidate evidence is green, and both former P1s are closed.
- Approve the Git-aware topology repair — it scans tracked plus non-ignored untracked files, detects force-added ignored files, and fails closed without adding an editor-specific exclusion.
- Treat clean-clone strict parity as satisfied release-candidate evidence — it proves the final patch can pass the three-target release boundary from clean committed history.
- Make publication conditional — the tag workflow must explicitly request release permission, run the complete 114-test suite, and publish only a verified same-job allowlist from a recreated output directory.

## Open Questions / Risks

- Native E6 remains unavailable where no reviewed host scenario/runtime exists; host-native semantic support must remain provisional.
- Checksums, SBOM, and provenance are unsigned and authenticate nothing unless obtained through a trusted release channel.
- Filesystem guarantees retain the documented cooperative-writer boundary; host/editor/synchronization writers must be stopped during lifecycle and recovery operations.
- Arbitrary GNU Make command-line syntax is executable input before a Makefile loads; automation must expose fixed value fields, never untrusted free-form Make argv.

## Scope and Evidence

- Task: `.maister/tasks/development/2026-07-14-platform-independent-plugin`
- Phase: final resumed Phase 11 verification
- Assessment mode: read-only except replacement of this report
- Reviewed: final production and test code, specification, plan, work log, workflow state, standards, canonical verification reports, release workflow, and clean-clone release evidence
- Independently rechecked by this assessor: evidence/topology **20/20**, repository topology command, JavaScript syntax for both topology entry points, and `git diff --check` — all passed
- Production code, tests, IDE state, and workflow state modified by this assessor: no

The interim 111/112 report is superseded by the final Git-aware repair and final evidence. The authoritative implementation result is now **114/114**, and `make validate` is green in the original checkout.

## Decisive Reality Verdict

The platform-independent distribution now works for its intended supported scope. It has one portable source boundary, explicit Codex/Cursor/Kiro CLI overlays, immutable source identity, deterministic materialization and packages, transaction receipts, ownership and drift enforcement, rollback/recovery, explicit capability evidence, and a release-grade parity boundary.

| Decision surface | Verdict | Reality basis |
| --- | --- | --- |
| Production implementation | **✅ READY** | 114/114, green integrated validation, 20/20 topology, 4/4 packaged lifecycle, zero production regressions. |
| Merge / release candidate | **✅ GO** | Both P1s are resolved; final topology repair is fail-closed and production-suitable. |
| Publication from dirty shared checkout | **❌ NO-GO** | Strict release operations must originate from clean committed source, not the active migration worktree or existing `dist/`. |
| Publication from exact tag commit | **⚠️ CONDITIONAL GO** | Repeat clean strict parity/package verification and close the three tag-workflow controls below. |
| Native host semantics | **⚠️ PROVISIONAL** | E6 unavailable is explicit and is not a semantic pass. |

This is a release-process qualification, not an implementation qualification. The code is ready; production publication is not authorized until the release workflow enforces the exact evidence already demonstrated manually in the clean committed clone.

## Former P1 Findings

### P1-01 — Lifecycle root A could diverge from materialized root B: resolved

Install/update establishes one immutable source binding before target state creation. Caller-supplied roots and local/file source paths must match that binding; source-bound overlay selection has no running-checkout fallback; the same binding is revalidated before and after assembly; and the lifecycle compares the materialized identity before transaction progress.

The adversarial A/B regression proves disagreement fails with `E_SOURCE_ROOT` before either lifecycle state or target content is created. Overlay selection, portable-core evidence, installed bytes, and receipt provenance therefore share one reviewed source identity.

### P1-02 — `SUPPORTED_TARGETS` could execute before Node validation: resolved for the supported interface

Make no longer owns or interpolates a target list. A defined `SUPPORTED_TARGETS` origin is rejected through a constant guard, `validate` invokes a fixed Node command, and Node enumerates the frozen central target registry. Make-function and shell-metacharacter regressions prove fixed-field overrides do not execute their payloads, while normal enumeration validates exactly Codex, Cursor, and Kiro CLI.

Free-form Make argv remains trusted because GNU Make itself evaluates some command-line assignment forms before loading any Makefile. This is a documented invocation boundary, not a residual repository defect; CI and wrappers must pass untrusted data only as values through fixed fields.

## Final Git-Aware Topology Repair

The previous `.idea/workspace.xml` failure was ignored operator residue, not live repository topology. The final repair correctly changes the repository-facing candidate universe rather than weakening forbidden patterns or adding an editor-specific exclusion.

`scanRepositoryTopology()` now uses NUL-delimited Git enumeration equivalent to:

```text
git ls-files --cached --others --exclude-standard -z
```

This produces the correct release-relevant behavior:

- tracked files are always scanned, including force-added ignored paths;
- non-ignored untracked implementation files are scanned before commit;
- ignored editor/cache/operator state is excluded generically;
- unusual valid filenames are preserved through NUL delimiting;
- candidate containment is rechecked before access;
- Git enumeration failures raise `E_TOPOLOGY_GIT`;
- candidate inspection/read failures raise `E_TOPOLOGY_READ`;
- the repository CLI and release interface share one topology policy;
- raw recursive traversal remains available for isolated fixture tests.

Independent final execution passed all **20/20** evidence/topology cases and returned `{"ok":true,"violations":[]}` from the production topology command.

## Functional Reality by Workflow

| Workflow | Assessment | Evidence and qualification |
| --- | --- | --- |
| Install / update | **Ready** | One immutable source binding drives overlay, evidence context, materialization, provenance, and receipt creation; unsafe disagreement fails before mutation. |
| Status / verify | **Ready** | Receipt-backed inventory, settings ownership, drift, modes, hashes, symlinks, and integrity are covered. |
| Uninstall | **Ready** | Extracted target packages uninstall cleanly; unmanaged content and ownership conflicts remain protected. |
| Rollback / recovery | **Ready within documented threat model** | Backup integrity, exact topology restoration, journal transitions, tamper rejection, idempotency, and unresolved code-7 handling are covered. |
| Package | **Ready** | Deterministic, sorted, self-contained, target-isolated archives pass extracted lifecycle **4/4**. |
| Parity / topology | **Ready** | Clean committed-clone strict parity passes 3/3 with zero unresolved; current topology and focused suite are green. |
| Publication automation | **Conditional** | Functional artifacts are proven, but the tag workflow still needs the three controls below. |
| Native runtime semantics | **Provisional** | E6 remains unavailable where scenarios/runtimes are absent and must not be advertised as passed. |

## Clean Release-Candidate Evidence

The final patch was applied to a history-preserving clean clone and committed. In that environment:

- strict `make test-parity-release` passed for Codex, Cursor, and Kiro CLI;
- all three targets reported zero unresolved differences;
- topology validation passed;
- validation left the Git tree clean;
- Codex, Cursor, and Kiro CLI packages were generated in isolated output directories.

Combined with current **114/114**, green `make validate`, focused topology **20/20**, and package lifecycle **4/4**, this closes the prior uncertainty about whether the implementation can actually satisfy its clean-source release boundary.

## Publication Conditions

These three conditions block production publication, not merge or release-candidate preparation:

1. **Declare release permission explicitly.** Add `permissions: contents: write` at the appropriate workflow/job scope before relying on the GitHub release publisher.
2. **Run the complete authoritative suite at the exact release commit.** The tag workflow currently runs `make validate`, strict parity, and package lifecycle, but not the additional Make-interface, registry, release-interface, and adversarial contracts owned by `make test-platform-independent`. Require **114/114** at the tag commit.
3. **Recreate and allowlist the same-job artifact set.** Start with an absent/empty isolated output directory, generate all artifacts in the validation job, reject unexpected files, and upload/publish only the three named target archives plus the named parity, E3, checksum, SBOM, and provenance sidecars. Replace broad `dist/*` publication.

At the exact tag commit, repeat strict three-target parity and package generation/lifecycle, retain reports and hashes, and publish only after all three controls pass.

## Residual Claim and Operational Boundaries

The following eight concerns are non-blocking for implementation approval but must remain visible:

1. E6 native runtime semantics are unavailable where no reviewed scenario/runtime exists.
2. `SHA256SUMS`, CycloneDX SBOM, and `PROVENANCE.json` are unsigned and require a trusted channel.
3. Installer locking coordinates cooperating Maister processes, not arbitrary external or privileged writers.
4. No abrupt process-kill, power-loss, hostile continuous-writer, or live-network GitHub drill is recorded.
5. Some materializer text/reference exceptions and repository topology exclusions remain broader than ideal.
6. Local package/E3 commit identity is caller-supplied outside protected CI; publication authority belongs to the protected clean-release job.
7. Arbitrary GNU Make argv is executable input and must not be exposed to untrusted callers.
8. Cursor's behavior-bearing projection remains explicit drift-checked migration debt, not a second intended source of truth.

## Supported and Unsupported Claims

Supported now:

- one maintained portable source with three explicit supported-host overlays;
- deterministic target-isolated archives for Codex, Cursor, and Kiro CLI;
- install, update, verify, uninstall, rollback, and recovery at the tested transactional boundary;
- immutable source-to-overlay-to-materialization-to-receipt binding;
- exact ownership, drift refusal, backup integrity, and fail-closed recovery behavior;
- clean strict three-target parity with zero unresolved differences;
- Git-aware final topology that ignores non-release operator residue without hiding tracked or non-ignored implementation files.

Not supported without qualification:

- publication directly from the dirty shared checkout or pre-existing local `dist/`;
- production publication before the three tag-workflow controls are closed;
- native semantic certification while E6 is unavailable;
- publisher authentication from unsigned sidecars;
- safety against arbitrary malicious same-user or privileged concurrent mutation.

## Structured Verdict

```yaml
status: ready_with_publication_conditions
implementation_verdict: READY
merge_verdict: GO
release_candidate_verdict: GO
publication_verdict: CONDITIONAL_GO
dirty_shared_checkout_publication: NO_GO
exact_clean_tag_commit_publication: GO_AFTER_CONDITIONS
report_path: verification/reality-check.md
assessment_mode: read_only_except_report
issue_counts:
  critical_production_defects: 0
  high_production_defects: 0
  implementation_blockers: 0
  publication_process_blockers: 3
  residual_concerns: 8
  production_regressions: 0
evidence:
  authoritative_suite: 114/114
  make_validate: passed
  focused_topology: 20/20
  package_lifecycle: 4/4
  clean_clone_strict_parity:
    targets: 3/3
    unresolved: 0
  clean_clone_topology: passed
  clean_clone_tree_after_validation: clean
  clean_clone_packages_generated:
    - codex
    - cursor
    - kiro-cli
  syntax: passed
  diff_hygiene: passed
prior_p1_findings:
  lifecycle_materializer_source_binding: resolved
  supported_targets_prevalidation_evaluation: resolved_for_fixed_value_interface
topology_repair:
  verdict: approved
  candidate_set: tracked_plus_nonignored_untracked
  ignored_operator_residue: excluded
  force_added_ignored_files: scanned
  git_failure: fail_closed_E_TOPOLOGY_GIT
  read_failure: fail_closed_E_TOPOLOGY_READ
publication_conditions:
  - explicit_contents_write_permission
  - full_114_test_suite_at_exact_tag_commit
  - recreated_allowlisted_same_job_artifact_set
claim_boundaries:
  e6: provisional_when_unavailable
  provenance: unsigned_trusted_channel_required
  filesystem: cooperative_writer_model
production_code_modified: false
tests_modified: false
ide_state_modified: false
workflow_state_modified: false
```
