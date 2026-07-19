# Gap Analysis: Unified Agent Projections and Exact Invocation

## TL;DR

Maister has a strong deterministic materializer and transactional installer, but it does not yet have an operational agent projection or exact-dispatch layer.
The requested outcome requires both modification of existing distribution behavior and new capabilities: a strict canonical role IR/manifest, staged host projectors, multi-root Kiro ownership, an exact resolver with host adapters, and evidence that observes discovery and invocation rather than executable presence.
The work is **high risk / high effort** because Kiro widens the transaction boundary and runtime support must fail closed where host-native control is unavailable.
No unresolved scope decision remains: the accepted research and the Phase 1 clarification already bind all material choices, including direct deletion of both legacy Codex TOML profiles during implementation.

## Key Decisions

- Classify the task as both **modifying existing code** and **creating new capabilities** — current materialization, transaction, overlay, evidence, init, and release contracts must change, while role IR/projector/resolver/adapter/record components do not yet exist.
- Classify the dominant change as **modificative** with **moderate compatibility requirements** — safety, ownership, and supported-host lifecycle guarantees remain strict, but backward compatibility with the legacy Codex TOML topology is explicitly excluded.
- Keep the accepted research architecture as binding scope — 28 canonical Markdown roles, deterministic staging projection, exact fail-closed dispatch, narrow Kiro leaf ownership, ordinary Advisor handling, and separate E5/E6 evidence are not open alternatives.
- Route directly to specification after Phase 2 — there is no reproducible defect requiring a TDD-red phase and no UI-heavy work requiring mockups.

## Open Questions / Risks

- Codex generic-subagent invocation and per-spawn model enforcement are not represented by a stable repository adapter; a required but unsupported control must produce a typed unavailable/unsupported result.
- Cursor collision precedence and Kiro exact identity observation remain host-version-dependent; implementation can provide versioned probes and fail-closed outcomes, but cannot manufacture native proof when prerequisites are absent.
- Kiro native installation changes the receipt/journal/recovery model from one whole-tree root to one logical transaction across a private root and a receipt-owned native leaf set; partial implementation would weaken rollback and uninstall guarantees.
- The current E5 producer records a successful `--version` command as discovery success, so existing evidence can overstate native discovery until the producer and tests are corrected.

## Summary

- **Risk Level**: High
- **Estimated Effort**: High
- **Detected Characteristics**: Modifies existing code; creates new capabilities
- **Change Type**: Modificative
- **Compatibility Requirements**: Moderate — strict for current safety/ownership/evidence contracts, intentionally none for legacy Codex TOML upgrades
- **Scope Expansion Recommended**: No — the accepted research already includes every subsystem required for an end-to-end result

## Task Characteristics

- Has reproducible defect: **no**
- Modifies existing code: **yes**
- Creates new entities/capabilities: **yes**
- Involves data operations: **no**
- UI heavy: **no**

### Detection Rationale

- **No reproducible defect**: current parity and evidence failures are measurable architectural gaps, but the task does not present a single failing input/step/expected/actual defect scenario.
- **Modifies existing code**: `materializer.mjs`, transaction/receipt/recovery modules, target roots, overlays, probes, init behavior, topology tests, release gates, and documentation all require behavioral changes.
- **Creates new capabilities**: repository searches and Phase 1 analysis found no canonical agent IR/manifest, agent projector, exact role resolver, concrete host adapter set, or shared execution record.
- **No data operations**: managed filesystem artifacts and receipts are distribution state, not application-domain entities with a user-facing CRUD lifecycle; the data-lifecycle module does not apply.
- **Not UI heavy**: the scope contains no pages, components, forms, routes serving views, navigation, or styling.

## Gaps Identified

### Missing Features

1. **Strict canonical role parser and versioned manifest**
   - Current evidence: `plugins/maister/agents/*.md` contains the valid 28-role source inventory, but there is no parser/IR/schema that enforces `role_id = filename stem = frontmatter.name`, normalized uniqueness, portable metadata, support-role separation, and canonical digests as one executable contract.
   - Required state: one sorted 28-row manifest plus separately declared support agents and allowlisted, versioned host transforms.

2. **Deterministic staged agent projector and projection provenance**
   - Current evidence: `plugins/maister/lib/distribution/materializer.mjs` copies an assembly plan, immediately enumerates staging, validates it, and hashes it. It has no post-assembly/pre-enumeration agent projection phase and no manifest/projector/projected-tree digest in provenance.
   - Required state: project canonical roles into the empty transaction staging tree before `stagingEntries`, validation, and content hashing so generated outputs are ordinary validated, receipt-owned candidate files.

3. **Multi-root transaction and narrow Kiro native ownership**
   - Current evidence: `target-paths.mjs` returns one `activeRoot`; receipt schema v1 contains one `active_root`; inventory identity is only relative `path`; `transaction-manager.mjs` snapshots, commits, verifies, and hashes one tree; recovery manifests likewise contain one root.
   - Required state: a versioned `managed_roots` contract, `root_id + relative path` inventory identity, one journal across all roots, and a Kiro `leaf_set` under `~/.kiro/agents` that never owns unrelated user files.

4. **Exact role resolver, concrete host adapters, and execution records**
   - Current evidence: overlay values such as `codex.subagent`, `cursor.subagent`, and `kiro-cli.subagent` are declarative labels. `gate-evaluator.mjs` invokes injected callbacks with a logical role field, but it does not resolve a canonical manifest row, verify installed projection digests, invoke a host representation, observe identity, or persist a shared dispatch record.
   - Required state: `maister:<role_id>` resolves to exactly one validated `DispatchPlan`; Codex injects the complete prompt into a generic subagent, Cursor and Kiro target exact native IDs, and all adapters share terminal record and no-fallback semantics.

5. **Native discovery and exact-invocation scenarios**
   - Current evidence: `host-probes/base.mjs` marks E5 `passed` whenever `<host> --version` exits successfully. E6 executes only when a caller injects a `scenarioProbe`; target probe modules provide no repository-owned exact-role scenario.
   - Required state: versioned E5 scenarios that observe expected external IDs and E6 scenarios that distinguish at least two roles plus ordinary `advisor`, bound to source, manifest, projection, overlay, host, and scenario versions.

### Incomplete Features

1. **Host role parity is structural but not normalized or closed**
   - Cursor has 27/28 canonical roles plus support `explore`, is missing `e2e-test-verifier`, and retains behavior-body drift in multiple checked-in role copies.
   - Kiro has descriptors for all 28 canonical roles plus two support descriptors, but none of their referenced instruction files exist in the overlay.
   - Codex packages canonical prompt resources but still has a special tracked Advisor/Arbiter TOML lifecycle outside the ordinary role path.

2. **Kiro reference validation contains a false-green exception**
   - `materializer.mjs:isHistoricalReferenceException` accepts any Kiro `agents/*` reference matching `file://./instructions/*.md` without requiring the referenced path to exist in staging.
   - This masks zero prompt closure and must disappear when generated descriptor/prompt pairs are introduced.

3. **Transaction safety is complete only for one managed tree**
   - Existing snapshot/commit/verify/rollback/uninstall behavior is strong for `activeRoot`, but cannot safely express Kiro's private root plus native leaf destination.
   - Extending install alone would leave recovery, drift detection, status, verify, update, and uninstall inconsistent.

4. **Workflow role intent is recorded but not executable**
   - Orchestrator state and gate code can store logical role identifiers and callback attempts, yet there is no exact manifest lookup or host dispatch boundary behind those callbacks.
   - A callback success therefore does not prove which canonical role or projected bytes executed.

5. **Advisor remains special in repository topology**
   - `.codex/agents/advisor.toml`, `.codex/agents/arbiter.toml`, init reconciliation, tests, parity baselines, and documentation encode a separate Codex lifecycle.
   - The user has authorized direct removal of both tracked TOML files, including discarding the current unstaged Advisor edit, during the approved implementation phase. No migration or runtime cleanup is in scope.

### Behavioral Changes Needed

- Change projection from copied, behavior-bearing host assets to deterministic outputs derived from the canonical 28-role source inside staging.
- Change parity from file counts to a normalized canonical bijection with support agents reported separately and prompt/reference closure enforced.
- Change Kiro delivery from one private `.kiro-maister` tree to one logical transaction that additionally owns only computed native agent leaves.
- Change workflow delegation from semantic labels or injected callbacks to exact role resolution, digest validation, native adapter dispatch, and auditable terminal records.
- Change E5 from executable/version availability to observed native discovery; retain `unavailable` when the runtime, authentication, or safe scenario is absent.
- Remove the special Codex Advisor/Arbiter TOML source, init, test, parity, and documentation paths without adding compatibility code.

## User Journey Impact Assessment

This task affects maintainer, installer-operator, and workflow execution journeys rather than a graphical user interface.

| Dimension | Current | Target | Assessment |
|---|---|---|---|
| Reachability | Workflows name or imply roles, but exact execution depends on external host behavior or injected callbacks. | Every workflow selects `maister:<role_id>` and either obtains one verified dispatch plan or a typed failure. | Positive |
| Discoverability | Structural files and `--version` evidence can appear healthy without proving role discovery. Estimated 3/10. | Normalized parity plus native E5 exposes the exact discovered external IDs. Estimated 8/10 where a scenario exists. | +5 |
| Flow integration | Install, verify, workflow dispatch, and evidence are disconnected contracts. | Projection provenance flows through receipt validation into resolver preflight and execution records. | Positive |
| Failure clarity | Missing roles, collisions, unsupported controls, and wrong identity can be hidden by labels or fallback outside this repository. | Typed fail-closed outcomes stop before target mutation or wrong-role dispatch. | Positive |
| Multi-host consistency | Same intended role has divergent or incomplete host representations. | One logical role and canonical digest map deterministically to each supported host representation. | Positive |

Structured journey result: reachability change **+1**, discoverability **3 -> 8**, flow integration **positive**.

## New Capability Integration Points

| Integration point | Existing seam | Required change |
|---|---|---|
| Canonical role input | `plugins/maister/agents/*.md` | Parse strict frontmatter/body into a sorted, versioned IR and manifest. |
| Projection insertion | `plugins/maister/lib/distribution/materializer.mjs` between `copyPlan`/source revalidation and `stagingEntries` | Run target projector before all candidate validation, hashing, and provenance finalization. |
| Overlay contract | `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml` and overlay schema | Declare representation, destination, transforms, support inventory, and executable adapter contract without behavior copies. |
| Ownership schema | `receipt-schema.mjs`, `journal-schema.mjs`, `target-paths.mjs`, `targets.mjs` | Version managed roots and leaf-set ownership; preserve safe relative path validation per root. |
| Transaction lifecycle | `transaction-manager.mjs`, `recovery.mjs`, drift detector, verify/uninstall/status paths | Snapshot, mutate, validate, recover, and remove all declared roots as one journaled operation. |
| Runtime selection | New runtime seam plus current workflow/gate callers | Resolve exact logical IDs, validate active receipt/projection binding, and produce a dispatch plan. |
| Host execution | Codex/Cursor/Kiro adapter ports | Implement native representation-specific invocation with typed unavailable and wrong-identity failures. |
| Evidence | `host-probes/*.mjs`, evidence schema/policy | Correct E5 semantics; add versioned E6 exact invocation and projection-digest freshness. |
| Clean topology | `.codex/agents`, init reconciliation, parity fixtures/baselines, docs | Remove Advisor/Arbiter TOML paths and replace special-path tests with Advisor-equality negative proofs. |
| Release | Make targets, platform-independent suites, release workflow | Gate packaging on deterministic projection, normalized parity, reference closure, multi-root extracted lifecycle, and accurate evidence. |

## Patterns to Follow

- **Sorted, collision-checked assembly plans**: reuse materializer path normalization and zero-output failures for duplicate, case-fold, and path collisions.
- **Immutable-source revalidation**: keep projection between source identity checks and revalidate before returning materialization provenance.
- **Empty same-filesystem staging**: project only inside the transaction's isolated staging tree; never write generated artifacts into the checkout or invocation-time runtime roots.
- **Typed `DistributionError` failures**: add precise schema, parity, projection, resolution, adapter, model-control, digest, and observed-identity errors.
- **Receipt-owned drift detection**: stale generated leaves may be removed only when the previous receipt owns them and installed bytes still match; modified managed leaves fail with zero state change.
- **Durable journal and injected-failure tests**: extend the existing transition/snapshot/recovery model across roots rather than introducing a parallel installer.
- **`passed` / `failed` / `unavailable` evidence**: preserve the outcome model while making discovery and invocation scenarios semantically accurate.
- **Deterministic extracted-release lifecycle**: build targets twice, compare archive hashes, then install/verify/uninstall from clean extraction across every managed root.

## Architectural Impact

**Impact: High.** The change introduces a portable role domain boundary and runtime port while versioning distribution persistence. Dependencies should remain one-way:

```text
canonical Markdown -> role IR/manifest -> staged projector -> validated candidate/provenance
                                                     -> transaction/receipt
workflow logical ID -> exact resolver + active receipt -> host adapter -> execution record
```

The projector must not depend on active runtime state, the resolver must not generate files, and host adapters must not bypass canonical or receipt/projection validation. Kiro's additional native destination belongs to the transaction/ownership layer, not to a special-purpose copy command.

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

None. The high-confidence research and accepted ADRs already decide canonical ownership, host representations, exact fail-closed dispatch, Kiro leaf ownership, clean-install behavior, Advisor equality, and evidence semantics.

### Important (Should Decide)

None. The remaining unknowns are host capabilities and implementation details. They have predetermined outcomes (`unavailable`, typed failure, or versioned probe) and do not require a scope choice before specification.

## Recommendations

1. Specify and implement in dependency order: role IR/manifest, pure projector/validator, materializer integration, managed-root schema and lifecycle, host projections, exact runtime, clean legacy removal, native evidence, then release/docs.
2. Treat receipt, journal, recovery, drift, verify, update, uninstall, and status as one versioned multi-root change; do not enable the Kiro native destination until injected-failure rollback coverage is complete.
3. Keep all 28 roles on one parser/resolver/adapter contract and add explicit negative topology tests rejecting Advisor-only TOML, readonly, sandbox, destination, permissions, or dispatch branches.
4. Make structural parity, native discovery, and exact invocation independent gates. A missing prerequisite remains `unavailable`; only observed wrong behavior is `failed`.
5. Replace checked-in behavior-bearing Cursor/Kiro agent copies only after deterministic projector fixtures and staging reference-closure tests pass.

## Risk Assessment

- **Complexity Risk: High** — the work spans source parsing, deterministic generation, persistence schemas, transaction recovery, runtime dispatch, evidence, init, tests, release, and documentation.
- **Integration Risk: High** — the projector must run at an exact materializer seam, while multi-root inventory identity must propagate through every lifecycle command.
- **Regression Risk: High** — a partial schema or lifecycle migration can corrupt rollback/uninstall behavior; inaccurate probes can make unsupported native claims; wrong resolver behavior can execute a different role.
- **Compatibility Risk: Medium** — supported clean-install and transactional contracts remain protected, but legacy Codex TOML upgrade compatibility is deliberately removed.
- **Operational Evidence Risk: High** — host-native E5/E6 may remain `unavailable` in environments lacking executable, authentication, a safe scenario, or observable exact identity.

## Critical Technical Issues

- Kiro's current descriptor references are accepted without closure because of a broad historical exception.
- Receipt/journal/recovery state cannot currently address more than one managed root.
- E5 currently equates a successful version probe with native discovery.
- No repository implementation proves exact role resolution, adapter dispatch, or observed role identity.

