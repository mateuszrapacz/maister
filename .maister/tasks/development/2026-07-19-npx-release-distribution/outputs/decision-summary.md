# Decision Summary — npx Release Distribution

## Outcome

The approved GitHub-only implementation scope was executed and hardened through
three Phase 11 fix loops. CQ-102 is now locally fixed test-first: public smoke
does not persist checkout credentials and rejects checkout-local Git auth residue
before acquisition. The source-controlled implementation now passes its current
local verification gates, including the direct platform-independent run and the
focused policy/guard suite. Overall release acceptance remains **failed / NO-GO**
because V-007 (real `v2.2.1` tag/Release/protected run) and V-008 (repository
protections) remain external release blockers.

## Scope decision

- Selected: **Approve complete implementation scope**.
- Actor: user.
- Scope: G1 package/CLI, G2 GitHub metadata/transport, G3 archive boundary,
  G4 receipt-bound control plane/transactions, G5 delegation/signals/cleanup,
  G6 adversarial/platform tests, G7 publication state machine, and G8 docs /
  ownership metadata.

## Architecture decisions

- Keep `maister-install.mjs` as the sole host-state mutation authority.
- Keep GitHub Release archives as payload source of truth.
- Use a thin `@mateuszrapacz/maister` ESM launcher with Node 22+.
- Use exact GitHub release metadata, fixed allowlisted asset URLs, bounded
  HTTPS transport, fail-closed archive inspection, private extraction, and
  unchanged child output/result forwarding.
- Route state-only commands through an active-receipt-bound, hash-verified
  local authority without launcher network calls.
- Use a valid non-SemVer npm staging tag before exact-version smoke and
  explicit `latest` promotion.
- Keep unsigned sidecars as integrity/consistency evidence, not publisher
  authentication.

## Advisor decisions

- Verification matrix: run code, pragmatic, reality, and production reviews;
  skip browser E2E; generate user docs.
- Verification issue resolution: **Fix all fixable issues**.
- Phase 11 exit: **Continue to Phase 12**, with publication still NO-GO.
- Phase 13 exit: **Continue to Phase 14**.
- E2E phase: **Skipped** because `e2e_enabled: false`; no browser evidence was claimed.

## Fixes applied after review

- Durable top-level backup root/hash are used by recovery before candidate
  receipt creation.
- Recovery uses a UUID-only `--journal-id` selector under the target journal
  root; retained launcher commands include the exact ID when available.
- Control-plane promotion is an atomic same-filesystem rename.
- Acquisition signals abort transport, do not retry, return conventional
  status, and clean the private operation root.
- Publication workflow uses a valid staging tag, external-state reconciliation,
  public GitHub byte comparison, exact npm smoke for all three targets, and
  delayed `latest` promotion with retained evidence.

## Evidence

- Detailed local verification evidence: **530 passed, 0 failed**; the current
  direct `make test-platform-independent` run exits 0.
- Focused policy and Git-auth guard suite: **16/16 passed**.
- Package validation, pack dry-run, valid npm publish dry-run, and diff check:
  passed.
- Clean lifecycle, control-plane failure recovery, failed-journal idempotence,
  journal selector parsing, signal cleanup, and non-retrying transport abort:
  passed.
- Aggregate watchdog wrappers and their child suites have terminal passing
  evidence in the detailed verification report.
- Protected/public release workflow: not executed from this workspace.

## Final handoff status

The workflow is prepared for final handoff, but the denylisted final-handoff
approval is intentionally not inferred from the implementation approval. No
publication or `latest` promotion was performed. The exact public `v2.2.1`
Release/protected run and required GitHub protections remain external blockers,
so overall release acceptance remains **NO-GO** even though the local
source-controlled implementation passes.

## Scope revision — GitHub-only distribution

The user kept the workflow open and replaced the public npmjs design with
direct execution from an exact GitHub tag or full commit. Maister will not be
published to npmjs, GitHub Packages, or another package registry; GitHub
Release archives remain the payload authority and the existing installer
remains the mutation authority. Advisors are disabled for the revised scope.

- Selected archive dependency option: keep exact `tar@7.5.20` as a normal
  dependency and permit read-only acquisition from npmjs.
- Boundary: third-party dependency acquisition is allowed; publishing Maister,
  setting dist-tags, or using registry publication credentials is forbidden.
- Selected credential order: `GH_TOKEN`, then `GITHUB_TOKEN`, then a bounded
  non-shell `gh auth token --hostname github.com` fallback, then anonymous
  access for public repositories.

## Phase 2 routing

- Question: **Continue to Phase 3: TDD Red Gate?**
- Selected: **Continue to Phase 3: TDD Red Gate**.
- Actor: user.
- Rationale: the user explicitly selected the recommended route after the
  complete GitHub-only scope and remaining verification risks were presented.

## Phase 3 exit

- Question: **TDD red gate complete. Continue to Phase 4?**
- Selected: **Continue to Phase 4**.
- Actor: user.
- Rationale: all three GitHub-only contract tests failed for their intended
  reasons, so the defect is reproducible and ready for specification.

## Phase 4 exit

- Question: **UI mockups complete. Continue to Phase 5?**
- Selected: **Continue to Phase 5**.
- Actor: user.
- Rationale: UI work was correctly skipped because this distribution task has
  no user-interface surface.

## Phase 5 exit

- Question: **Continue to specification audit?**
- Selected: **Continue to specification audit**.
- Actor: user.
- Rationale: the rewritten GitHub-only specification is complete, traceable,
  and has no unresolved design decisions.

## Specification-audit selection

- Question: **Run specification audit? (Recommended)**
- Selected: **Yes, run audit (Recommended)**.
- Actor: user.
- Rationale: an independent audit is required before implementation planning
  for this high-risk distribution and transaction scope.

## Audit remediation — Git acquisition identity

- Selected: **Generate a prepare-time resolved-commit manifest and enforce exact selector use in protected CI. (Recommended)**
- Actor: user.
- Rationale: runtime verifies the materialized full commit without trusting
  ambient npm/cache metadata; protected CI proves exact selector usage.

## Audit remediation — repository visibility

- Selected: **Keep the current public repository, run public E2E now, and document the private migration checklist for future activation.**
- Actor: user.
- Rationale: no additional repository is created. Real anonymous E2E is
  release-blocking now; private mode is hermetically tested and gains a real
  protected smoke when the canonical repository becomes private.

## Audit remediation — connection timing

- Selected: **Use one 15-second pre-header deadline per attempt covering DNS, TCP, TLS, proxy negotiation, and response headers. (Recommended)**
- Actor: user.
- Rationale: the deadline is portable on Node 22 and composes with separate
  idle, resource-wall, and aggregate-operation limits.

## Phase 11 second fix selection

- Question: **Which issues should I fix?**
- Selected: **Fix all fixable issues**.
- Actor: user.
- Rationale: the user selected option 1, authorizing the V-016 source fix while
  leaving external GitHub prerequisites unchanged.

## V-016 lifecycle remediation

- `github-release` now ends at `GITHUB_VERIFIED` and transfers an immutable
  baseline artifact.
- The Linux, macOS, and Windows public-smoke jobs retain hidden anonymous
  evidence files.
- `finalize-release-evidence` requires the complete public matrix, records
  `PUBLIC_NO_AUTH_SMOKE_VERIFIED`, runs hermetic private transport, records
  `HERMETIC_PRIVATE_TRANSPORT_VERIFIED`, and only then uploads canonical evidence.
- Local evidence: lifecycle policy 8/8, policy/Make/drift 19/19, evidence 40/40,
  package validation, YAML parsing, and diff checks all pass.

## Phase 11 second verification rerun

- Question: **Re-run verification to check fixes?**
- Selected: **Yes, re-run verification**.
- Actor: user.
- Rationale: the user authorized full post-V-016 verification and canonical
  report replacement.

## Final local remediation result and current gate

- Detailed local suite evidence remains **530 passed, 0 failed**; the current
  direct `make test-platform-independent` run exits 0, and the focused policy /
  Git-auth guard suite passes **16/16**.
- CQ-102 and the subsequent release-harness, redirect, ambient-environment, and
  diagnostic findings are fixed and locally regression-tested.
- External blockers: V-007 and V-008 remain unchanged; stale `dist/` remains
  untouched and non-authoritative.
- The user selected **Proceed with known issues**, explicitly allowing workflow
  continuation while preserving the release NO-GO status.
- Phase 11 exit: **Continue to Phase 12**; Phase 12 E2E was then skipped by
  configuration.

## Phase 12 E2E decision

- Question: **E2E complete. Continue to Phase 13?**
- Selected: **Continue to Phase 13**.
- Actor: user.
- Rationale: E2E is disabled for this non-browser task; the enabled user-docs
  phase still had to run.

## Phase 13 documentation result

- Question: **Documentation complete. Continue to Phase 14?**
- Selected: **Continue to Phase 14**.
- Actor: user.
- Artifact: `documentation/user-guide.md`.
- Result: the guide documents exact GitHub tag/full-commit installation and
  `npm exec`, public/private credential boundaries, provenance, recovery,
  supported targets, current release blockers, and the future-private
  migration checklist without inventing E2E evidence.

## Final handoff gate

- Question: **Complete workflow?**
- Options: **Complete workflow** / **Keep workflow open**.
- Recommendation: **Complete workflow**.
- Selected: **Complete workflow**.
- Actor: user.
- Status: **workflow completed**. No repository, tag, Release, registry
  publication, or external GitHub protection was created or changed during
  this workflow.
