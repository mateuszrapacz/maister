# Decision Summary — Platform-Independent Maister Distribution

**Generated:** 2026-07-16  
**Workflow:** Development  
**Current status:** Completed  
**Task:** Implement platform-independent Maister distribution

## TL;DR

The workflow implemented and independently verified one portable Maister source with explicit Codex, Cursor, and Kiro CLI overlays, a transactional installer, immutable source and evidence binding, deterministic packaging, and removal of Claude and committed generated host trees.

Implementation verification passed with **39/39 plan steps**, **17/17 requirements**, **114/114 authoritative tests**, **20/20 focused evidence/topology tests**, package lifecycle **4/4**, and clean strict parity for all three targets with zero unresolved differences. Phase 12 E2E browser verification was intentionally skipped by user choice; Phase 13 produced a validated CLI user guide. The user approved the denylisted final handoff, and Phase 14 plus the overall task are durably completed.

## Key Decisions

- Support exactly Codex, Cursor, and Kiro CLI; remove Claude and generated/marketplace projections.
- Use one common portable source plus strict, versioned target overlays.
- Use hybrid `whole_file` and `managed_keys` settings ownership with receipts, journals, backups, drift detection, recovery, and exact rollback.
- Require E1–E4 and shared-core E3; record unavailable E5/E6 honestly and never promote unavailable evidence to passed.
- Bind install/update overlay selection, materialization, E3 evidence, and receipts to one immutable source identity.
- Keep supported-target enumeration in the central Node registry, outside caller-controlled Make expansion.
- Validate repository topology through Git-tracked plus non-ignored untracked candidates, while preserving raw recursive scans for fixtures.
- Treat the implementation as ready to merge; production publication remains conditional on the exact clean tag workflow.

## Open Questions and Release Conditions

- Native E5/E6 remains unavailable where no reviewed host runtime scenario exists.
- Checksums, SBOM, and provenance are unsigned and require a trusted release channel.
- Installer locks coordinate cooperating Maister processes, not arbitrary external writers.
- The exact tag commit must rerun the complete clean release sequence, explicitly request `contents: write`, and publish only a recreated allowlisted same-job artifact set.

## Outcome and Evidence

| Area | Outcome | Context |
| --- | --- | --- |
| Specification | 17/17 requirements covered | [Specification](../implementation/spec.md) |
| Plan | 39/39 steps across 5 groups | [Implementation plan](../implementation/implementation-plan.md) |
| Implementation log | All groups and repair cycles recorded | [Work log](../implementation/work-log.md) |
| Verification | Passed; zero open implementation findings | [Implementation verification](../verification/implementation-verification.md) |
| Tests | 114/114 authoritative; 20/20 focused; package lifecycle 4/4 | [Test results](../verification/test-suite-results.md) |
| Production readiness | Implementation GO; exact-tag publication conditional | [Production readiness](../verification/production-readiness-report.md) |
| User documentation | CLI guide complete and validated | [User guide](../documentation/user-guide.md) |
| Canonical workflow state | Phase 14 and task completed | [Orchestrator state](../orchestrator-state.yml) |

## Decision-Engine Audit

- The ledger below contains all **31 terminal gate records** currently in canonical `orchestrator.gate_history`, in persisted order.
- Every record has status `decided`; 30 were finalized by the user and one recovery reconciliation was finalized by the system after the original agent session completed.
- Advisor model `gpt-5.6-sol` and arbiter model `gpt-5.6-sol` were configured on every record, but no advisor or arbiter response was used. Every attempts list is empty, no retry was scheduled, and neither agent was exhausted.
- No arbitration occurred, no user override was recorded, and every terminal record has `error: null`.
- Decision 13 differs from its original recommendation because the same timed-out Group 1 session recovered and completed; the durable system reconciliation records the actual outcome.
- Decision 18 explicitly chose to skip optional browser E2E against the recommendation. The later Phase 12 exit correctly records that configured skip.
- Decision 26 stopped the original exhausted repair loop. The workflow was later explicitly resumed from Phase 11 with repair counters reset while preserving this historical decision.
- Reused idempotent decisions were not duplicated: the canonical re-verification decision and resumed fix-selection decision retained their original keys.
- Decision 31 is the protected final-handoff approval. It was finalized by the user without advisor or automatic authority.

## Complete Decision Ledger

| # | Phase / gate | Question and ordered options | Recommendation → selection | Actor / confidence | Rationale and context |
| ---: | --- | --- | --- | --- | --- |
| 1 | Phase 1 / clarification | **Question:** Confirm Codex, Cursor, Kiro CLI only, with Claude and generated trees removed?<br>**Options:** Confirm assumptions · Correct assumptions · Provide more context | Confirm assumptions → **Confirm assumptions** | User / high | Confirmed the research-approved target and deletion scope. [Analysis](../analysis/clarifications.md) |
| 2 | Phase 1 / exit | **Question:** Continue to Phase 2?<br>**Options:** Continue to Phase 2 · Pause workflow | Continue to Phase 2 → **Continue to Phase 2** | User / high | Continued into gap analysis. [Codebase analysis](../analysis/codebase-analysis.md) |
| 3 | Phase 2 / host-contract closure | **Question:** Which host-contract closure policy?<br>**Options:** Contract-first overlay v1 with E1/E2/E4 for every host and E5/E6 when runtime exists · Host-doc-first overlay using legacy outputs only as semantic comparison fixtures · Runtime-gated support until native discovery and critical scenario evidence exist | Contract-first overlay v1… → **Contract-first overlay v1…** | User / high | Discovery roots, inventories, settings destinations, and bindings required a versioned overlay contract. [Gap analysis](../analysis/gap-analysis.md) |
| 4 | Phase 2 / settings ownership | **Question:** Which settings and shell-configuration ownership contract?<br>**Options:** Hybrid whole_file and managed_keys ownership with journal, backup, drift detection, and exact rollback · Dedicated files only, with manual configuration where unavailable · Managed-key merging for every shared settings file | Hybrid ownership → **Hybrid ownership** | User / high | Shared settings required explicit ownership and rollback semantics. [Gap analysis](../analysis/gap-analysis.md) |
| 5 | Phase 2 / native evidence | **Question:** Minimum release evidence without native runtime?<br>**Options:** Require E1-E4 and shared-core E3; record E5/E6 as unavailable, never pass · Require E5/E6 before labeling any host supported · Keep hosts provisional or unsupported until fresh native evidence exists | Require E1-E4… → **Require E1-E4…** | User / high | Cursor and Kiro native evidence was unavailable and could not be represented as passing. [Gap analysis](../analysis/gap-analysis.md) |
| 6 | Phase 2 / evidence freshness | **Question:** Which evidence freshness policy?<br>**Options:** Per-capability expiry with host, version, scenario, and timestamp renewal · Release-bound expiry when Maister or host contracts change · No expiry beyond recorded host version and manual review | Per-capability expiry → **Per-capability expiry** | User / high | Host contracts and binaries change independently, requiring explicit renewal. [Gap analysis](../analysis/gap-analysis.md) |
| 7 | Phase 2 / documentation boundary | **Question:** Which documentation and release migration boundary?<br>**Options:** Update all affected documentation, standards, Make/CI/release paths, and support matrices in this task · Defer documentation migration · Retain legacy instructions as compatibility guide | Update all affected paths → **Update all affected paths** | User / high | Stale instructions would preserve removed generated-tree and Claude workflows. [Gap analysis](../analysis/gap-analysis.md) |
| 8 | Phase 2 / routing | **Question:** Continue to Phase 5?<br>**Options:** Continue to Phase 5: Technical Approach, Requirements & Specification · Pause workflow | Continue to Phase 5 → **Continue to Phase 5** | User / high | The task required specification but had no defect-driven TDD-red or UI-heavy phase. [Requirements](../analysis/requirements.md) |
| 9 | Phase 5 / exit | **Question:** Continue to specification audit?<br>**Options:** Continue to specification audit · Pause workflow | Continue → **Continue** | User / high | Specification artifacts and structural checks were ready for independent audit. [Specification](../implementation/spec.md) |
| 10 | Phase 6 / exit | **Question:** Continue to implementation planning?<br>**Options:** Continue to implementation planning · Pause workflow | Continue → **Continue** | User / high | Audit found no critical/high defects; two medium contract clarifications moved into planning. [Spec audit](../verification/spec-audit.md) |
| 11 | Phase 7 / exit | **Question:** Continue to implementation approval?<br>**Options:** Continue to implementation approval · Pause workflow | Continue → **Continue** | User / high | The five-group plan covered all requirements and 39 synchronized steps. [Plan](../implementation/implementation-plan.md) |
| 12 | Phase 7 / protected implementation approval | **Question:** Approve this complete implementation scope?<br>**Options:** Approve complete implementation scope · Reject implementation scope · Request scope changes | Approve → **Approve complete implementation scope** | User / high | Explicit user authority was required before implementation. [Plan](../implementation/implementation-plan.md) |
| 13 | Phase 8 / Group 1 recovery | **Question:** Group 1 agent timed out; how to proceed?<br>**Options:** Try suggested fix · Retry group · Complete manually · Rollback changes · Stop | Retry group → **Try suggested fix** | System / high | The same session recovered and completed, so the durable record reconciled the observed outcome without duplicate work. [Work log](../implementation/work-log.md) |
| 14 | Phase 8 / Group 4 recovery | **Question:** Materialization parity red for all three target inventory/vocabulary contracts; how to proceed?<br>**Options:** Try suggested fix · Retry group · Complete manually · Rollback changes · Stop | Try suggested fix → **Try suggested fix** | User / high | Common-source and inventory contracts required reconciliation. [Work log](../implementation/work-log.md) |
| 15 | Phase 8 / Group 4 parity recovery | **Question:** Materialization green but 573 shadow-parity differences remain; how to proceed?<br>**Options:** Try suggested fix · Retry group · Complete manually · Rollback changes · Stop | Try suggested fix → **Try suggested fix** | User / high | Directed review of every difference to distinguish intentional packaging changes from missing behavior. [Work log](../implementation/work-log.md) |
| 16 | Phase 8 / exit | **Question:** Continue to verification?<br>**Options:** Continue to verification · Pause workflow | Continue → **Continue** | User / high | Five groups completed, 34 tests passed, targets materialized, parity had zero unresolved, and topology was clean. [Work log](../implementation/work-log.md) |
| 17 | Phase 10 / verification matrix | **Question:** Which standard verifications?<br>**Options:** Code review · Pragmatic review · Reality check · Production readiness | Run all recommended → **All four tracks** | User / high | Architecture, installer, filesystem, CI/release, and host changes warranted every standard review. [Verification](../verification/implementation-verification.md) |
| 18 | Phase 10 / optional E2E | **Question:** Enable E2E browser verification?<br>**Options:** Yes (Recommended) · No, skip | Yes → **No, skip** | User / medium | Optional browser E2E was declined; Phase 12 was later skipped as configured. [State](../orchestrator-state.yml) |
| 19 | Phase 10 / optional user docs | **Question:** Generate user documentation?<br>**Options:** Yes (Recommended) · No, skip | Yes → **Yes** | User / high | Installer, hosts, sources, recovery, and release operation changed materially. [User guide](../documentation/user-guide.md) |
| 20 | Phase 11 / fix selection 1 | **Question:** Which issues should be fixed?<br>**Options:** Fix all fixable issues · Let me choose specific issues · Skip fixes, proceed as-is | Fix all → **Fix all** | User / high | Initial verification found five critical blockers and sixteen warning groups. [Verification history](../verification/implementation-verification.md) |
| 21 | Phase 11 / rerun 1 | **Question:** Re-run verification?<br>**Options:** Yes, re-run verification · No, proceed | Yes → **Yes** | User / high | First hardening pass produced 60/60 tests and integrated validation. [Verification history](../verification/implementation-verification.md) |
| 22 | Phase 11 / fix selection 2 | **Question:** Which issues should be fixed?<br>**Options:** Fix all fixable issues · Let me choose specific issues · Skip fixes, proceed as-is | Fix all → **Fix all** | User / high | Re-verification found four critical blockers and ten warnings. [Verification history](../verification/implementation-verification.md) |
| 23 | Phase 11 / rerun 2 | **Question:** Re-run verification?<br>**Options:** Yes, re-run verification · No, proceed | Yes → **Yes** | User / high | Second hardening pass reached 91/91 tests, package lifecycle 4/4, clean parity, and `make validate`. [Verification history](../verification/implementation-verification.md) |
| 24 | Phase 11 / fix selection 3 | **Question:** Which issues should be fixed?<br>**Options:** Fix all fixable issues · Let me choose specific issues · Skip fixes, proceed as-is | Fix all → **Fix all** | User / high | Review found pathname TOCTOU, source mutation, split provenance, and Make injection boundaries. [Verification history](../verification/implementation-verification.md) |
| 25 | Phase 11 / rerun 3 | **Question:** Re-run verification?<br>**Options:** Yes, re-run verification · No, proceed | Yes → **Yes** | User / high | Third hardening pass reached 109/109 tests and zero-unresolved diagnostic parity. [Verification history](../verification/implementation-verification.md) |
| 26 | Phase 11 / unresolved critical | **Question:** Proceed with known issues?<br>**Options:** Proceed with known issues · Stop workflow | Stop → **Stop workflow** | User / high | Two P1s remained after the three-attempt limit, so the workflow stopped safely. [Verification history](../verification/implementation-verification.md) |
| 27 | Phase 11 resumed / fix selection | **Question:** Which issues should be fixed?<br>**Options:** Fix all fixable issues · Let me choose specific issues · Skip fixes, proceed as-is | Fix all → **Fix all** | User / high | Explicit resume/reset authorized repair of both remaining P1 trust boundaries. [Work log](../implementation/work-log.md) |
| 28 | Phase 11 / exit | **Question:** Continue to Phase 12?<br>**Options:** Continue to Phase 12 · Pause workflow | Continue → **Continue** | User / high | Final verifier passed with 114/114 tests and zero open findings. [Final verification](../verification/implementation-verification.md) |
| 29 | Phase 12 / exit | **Question:** E2E complete. Continue to Phase 13?<br>**Options:** Continue to Phase 13 · Pause workflow | Continue → **Continue** | User / high | E2E was skipped by configuration and the workflow continued to enabled documentation. [State](../orchestrator-state.yml) |
| 30 | Phase 13 / exit | **Question:** Documentation complete. Continue to Phase 14?<br>**Options:** Continue to Phase 14 · Pause workflow | Continue → **Continue** | User / high | The CLI guide was complete and validated before finalization. [User guide](../documentation/user-guide.md) |
| 31 | Phase 14 / protected final handoff | **Question:** Complete workflow or keep it open?<br>**Options:** Complete workflow · Keep workflow open | Complete workflow → **Complete workflow** | User / high | The user explicitly approved the final implementation, verification, documentation, and decision-summary handoff. [Canonical state](../orchestrator-state.yml) |

## Idempotency Keys

1. `sha256:ec02c7f9f82f78391846592009ec9aee11bb8cb1d6d24dc1c4a45208d9328a78`
2. `sha256:ba5d887d0c4265cbcbe1c13696ffdc0cf70e09b9b115fd0cea577002cb7aee7a`
3. `sha256:9e22d1cd8c8c8ccd768742a06292a9988d36f58656d7964e7799638229d15117`
4. `sha256:d6c3f6d878255f05159dce1edbaff998b8ea79e84c59a7cecfe5ca12aeb92970`
5. `sha256:a0da58fe5a1961fb662f7592b49c157c182bb70d3929cb36b7a5376a78c54e50`
6. `sha256:cc8019c200d90a666bb76ac3bae53660de40b4ed9ece30fd3779ea4351bc1064`
7. `sha256:7049cc17ddbd24dd6410f8e24ac74d5fae4ccb63534d828b41f1244006b45172`
8. `sha256:cb8d23e0e7ad2eb2968a831e300e4a2f2c77b56b18216abfeff974cd16f1ab52`
9. `sha256:8358f6a9980394365c8e29349d3538166c7645e2aeb8875de965b725f22f292f`
10. `sha256:eeba59811d29c2483cca234227ab77fd47023e60becab582b5c75f9a3d6994fe`
11. `sha256:3816e7b010ce22a0a421f05dde1915496a6c69d60c72a8a783a82a76a8361265`
12. `sha256:663a42aa519cf64427fd11758ef12c313a7364b973068f67fc85f046e6b8e17b`
13. `sha256:8427cbf0e377cd8f234e79d9f5346062d6bd293fe524dc517f25db71193408de`
14. `sha256:0e17e4a7c76e0fca66e93b36dd463df1e18f93bfcfa027baae084a83f0503922`
15. `sha256:7f3c4d56a3554cb24346cdbc9f46a6e8c551345121ef316d84827f26966be760`
16. `sha256:19568792996c419f61acb934284693bd396df535db9c9b4ac814b5f6c528d7a5`
17. `sha256:239981881b195b61ea682efd83565288e6737e9def74584192f949dbc6d517e9`
18. `sha256:98c61b5e2542abb49b807564e2ad43644f9b6443be62cba708dc99c212945c5a`
19. `sha256:430715d582c5f8acbf15c124fe155cb078622e8f8ea39e2c79f92d9958b04bb4`
20. `sha256:4faf97df6ac300025973a0db05ef2a15baaf46b02c225599fc10464dd193d969`
21. `sha256:198f8c6133aeb3ec728a3f71473293f3f72dcc7f7e72b7aa48b0e9c4367dd9c1`
22. `sha256:6921f6d132122613094ce1e600a5d075a682cd0557d4341a33ffcaf2e39815ec`
23. `sha256:34eed63ef305b80ab06583847d5489291da6c39ed01a71bbb088ebb412d433be`
24. `sha256:b0651b64f08d41434582be22a7b6f1b659a40d0f9faa356884dc366d93300f2a`
25. `sha256:0ff4b47f90b0bdeac3716368d31f017fae20a732dc012d511834a5c49d1f7c0e`
26. `sha256:3c9a3ae5d02a4d3badb43d3c03f40df5149a06021c9bcc48e3bed2d32803015d`
27. `sha256:b38801fbc024277030edaf7d11b3461eac96c4fcb2402dda48ee0d161f5f1f01`
28. `sha256:949c1c70eecbf5b542f80cfb36dc9f5090ec10164e69582d0727f8e47ed16346`
29. `sha256:5d3db71e7a2ecdaf6c5f3b8638d2ffd3418ea06b44e4aa52e4220cfe59c4992c`
30. `sha256:4190f0156e5926ddbfbb8dc4a7f936990fca079a77de6d4a9b2fd6262f1193ba`
31. `sha256:6d7f6ae8df3ed9da15c045e924b897b137471f0083602540051e6cd0bb590c6e`

## Final-Handoff Decision

The protected gate was resolved by the user as **Complete workflow**. No advisor, arbiter, or automatic continuation was permitted to authorize this boundary. The terminal record, Phase 14 completion, overall task completion, Markdown summary, and HTML companion are durable.
