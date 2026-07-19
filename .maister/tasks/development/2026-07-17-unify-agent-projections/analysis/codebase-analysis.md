# Codebase Analysis: Unified Agent Projections and Exact Invocation

## TL;DR

The repository has a sound deterministic materialization and transactional-install foundation, but agent parity is currently declarative rather than operational.
The 28 canonical Markdown roles are internally consistent; Cursor and Kiro carry drifted or incomplete hand-maintained projections, and no host has an executable exact-role resolver/adapter contract.
The change is **complex / high risk** because it crosses immutable source resolution, staged projection, multi-root ownership, runtime dispatch, evidence, release packaging, and removal of the legacy Codex Advisor/Arbiter lifecycle.
The first implementation blocker is ownership of the tracked, locally modified `.codex/agents/advisor.toml`, which the approved clean-install architecture requires deleting.

## Key Decisions

- Keep `plugins/maister/agents/*.md` as the sole behavior owner; derive all host projections in transaction staging.
- Define identity as `role_id = canonical filename stem = canonical frontmatter.name`; map host-facing identity deterministically to `maister-<role_id>`.
- Treat `advisor` exactly like every other canonical role; remove Codex Advisor/Arbiter TOML source, init, test, parity, and documentation lifecycle.
- Dispatch through an exact fail-closed resolver and host adapter; never fall back to inline execution, a built-in agent, the root agent, or a similar name.
- Extend Kiro installation with narrow receipt-owned leaves under native `~/.kiro/agents`, while retaining the private `.kiro-maister` root for the rest of the installation.
- Separate structural/materialization evidence from native discovery (E5) and exact invocation (E6).

## Open Questions / Risks

- **Blocking ownership decision:** may implementation delete the tracked, unstaged-modified `.codex/agents/advisor.toml`, or must the user first preserve/move that local change? The file currently has an added trailing `x` and must not be overwritten or removed without explicit direction.
- Codex generic-subagent programmatic spawn and per-spawn model control are not proven by the repository; required-but-unsupported model selection must fail closed.
- Cursor plugin-agent precedence and observable exact identity need a pinned native probe; unmanaged name collisions must remain blocking until precedence is proven.
- Kiro exact-name delegation and multi-root rollback semantics require new executable evidence and transaction tests.

## Executive Assessment

**Complexity:** complex  
**Risk:** high  
**Focused files found:** 142 (86 role projection artifacts, 25 distribution modules, 10 platform-independent suites, and 21 overlay/init/workflow/documentation/CI integration files).

This is not a local generator change. It alters four connected contracts:

1. **Source contract:** canonical Markdown must parse into one strict, versioned role manifest.
2. **Distribution contract:** projections must be created deterministically inside the existing candidate staging lifecycle and become receipt-owned outputs.
3. **Runtime contract:** workflows must resolve logical roles exactly and dispatch through real host adapters with auditable results.
4. **Evidence contract:** packaging, native discovery, and exact invocation must be proven separately and bound to source/manifest/projection digests.

The repository already contains strong fail-closed, deterministic, immutable-source, rollback, evidence, and release patterns. The highest risk is widening their present single-root model without weakening byte-exact recovery or unmanaged-content ownership.

## Ranked Relevant Files and Modules

| Rank | Path | Why it matters |
|---:|---|---|
| 1 | `plugins/maister/lib/distribution/materializer.mjs` | Correct projector insertion seam: immutable source is resolved/revalidated, an empty same-filesystem staging root is assembled, then inventory/syntax/mode/reference/hash/content validation and content hashing run. Its Kiro prompt-reference exemption currently masks all missing prompt files. |
| 2 | `plugins/maister/lib/distribution/transaction-manager.mjs` | Owns install/update/verify/uninstall orchestration, candidate inventory, tree commit, receipt publication, evidence binding, drift checks, and failure rollback. It assumes one `activeRoot`. |
| 3 | `plugins/maister/lib/distribution/recovery.mjs` | Snapshots and restores one active tree plus settings. Must evolve with the journal as a single atomic logical transaction across declared roots. |
| 4 | `plugins/maister/lib/distribution/receipt-schema.mjs` | Receipt schema has one `active_root` and inventory entries identified only by relative `path`; it has no `managed_roots`, `root_id`, projection manifest digest, or projected-tree digest. |
| 5 | `plugins/maister/lib/distribution/target-paths.mjs` and `targets.mjs` | Map each target to one discovery/active root. Kiro currently resolves to `.kiro-maister`, which is not the required native user-agent root. |
| 6 | `plugins/maister/agents/*.md` | Sole intended behavior owner. All 28 files satisfy `filename stem = frontmatter.name`, including `advisor`. |
| 7 | `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml` | Declare layouts, discovery roots, inventories, semantic binding labels, validation, and capability evidence. `delegate_agent` values are labels, not executable resolver/adapter implementations. |
| 8 | `plugins/maister/overlays/cursor/assets/agents/*.md` | Hand-maintained host projection: 27 canonical roles plus support `explore`; missing canonical `e2e-test-verifier`; nine canonical copies have behavior-body drift. |
| 9 | `plugins/maister/overlays/kiro-cli/assets/agents/*.json` | Contains 28 canonical descriptors plus `maister` and `maister-explore`, but every `file://./instructions/*.md` prompt target is absent. |
| 10 | `plugins/maister/lib/distribution/host-probes/base.mjs` and `host-probes/{codex,cursor,kiro-cli}.mjs` | E5 currently passes after only a successful `--version`; E6 remains unavailable unless an injected `scenarioProbe` is supplied. Target modules provide no native discovery or exact-invocation scenario. |
| 11 | `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs` | Requires callback-shaped `rolePort.invokeAdvisor`/`invokeArbiter`, but does not resolve canonical role IDs, create a dispatch plan, invoke a host, or bind the result to agent/projection identity. |
| 12 | `plugins/maister/skills/orchestrator-framework/references/{orchestrator-patterns.md,gate-decision-engine.md,host-capabilities.yml}` | Main consumers of Advisor/Arbiter role configuration and evidence policy; must express logical role IDs without implying special host lifecycle. |
| 13 | `plugins/maister/skills/init/SKILL.md` and `skills/init/bin/reconcile-advisor-config.sh` | Explicitly create/reconcile/remove `.codex/agents/advisor.toml`; this is the main legacy path to remove rather than migrate. |
| 14 | `tests/platform-independent/{source-materializer,overlay-contract,installer-transaction,target-registry,repository-topology,evidence-parity-topology,parity-release,release-package}.test.mjs` | Existing regression surface for deterministic output, contract validation, transaction integrity, topology, evidence, parity, and extracted archive lifecycle. |
| 15 | `.github/workflows/{validate-generated-variants,release}.yml`, `Makefile`, and release binaries | CI/release integration points for projector `generate/check`, normalized role parity, Kiro reference closure, native probes, deterministic packaging, and clean extracted lifecycle. |

## Current Installation and Runtime Flows

### Installation today

```text
source resolver
  -> immutable checkout/archive revalidation
  -> overlay layout expansion
  -> copy into one empty same-filesystem staging root
  -> inventory/syntax/mode/reference/native-hash/content validation
  -> materialized tree hash + provenance
  -> snapshot one active root + settings
  -> whole-tree replacement / settings commit
  -> verify one receipt inventory
  -> collect E1-E6 record set
  -> publish receipt
```

`materializer.mjs` is the correct staging insertion seam. The projector should run after `buildAssemblyPlan`/canonical source resolution has established trusted inputs and before `stagingEntries`, validation, content hashing, provenance, and receipt inventory are finalized. That makes generated artifacts ordinary candidate files: validation, drift detection, rollback, packaging, and release hashes all see the exact same bytes.

### Runtime today

```text
workflow prose/config selects an agent name
  -> overlay declares semantic_bindings.delegate_agent = <host>.subagent
  -> host-specific execution is expected externally
```

There is no repository implementation that converts `maister:<role_id>` into exactly one canonical manifest row, verifies projection/source digests, constructs a host dispatch envelope, invokes the host, rejects wrong identity, and records a terminal execution result. Likewise, the gate engine's injected `rolePort` callback is a testable orchestration seam but not an executable exact-role port.

## Role Inventory and Drift Findings

### Canonical source

- `plugins/maister/agents/` contains exactly **28** Markdown roles.
- All 28 satisfy `filename stem = frontmatter.name`; there are no canonical mismatches.
- The role set includes `advisor` and `e2e-test-verifier`.
- Canonical Markdown is packaged as a Codex prompt resource under `skills/orchestrator-framework/agents/`; it is not a native `.codex/agents` inventory.

### Cursor

- The Cursor overlay contains **28 files**, but normalized parity is **27/28 canonical + 1 support role**.
- Missing canonical role: `e2e-test-verifier.md`.
- Extra support role: `explore.md`; this must be classified separately and cannot substitute for a canonical row.
- Nine shared filenames have behavior-body drift from canonical: `code-reviewer`, `implementation-planner`, `production-readiness-checker`, `project-analyzer`, `task-classifier`, `task-group-implementer`, `thermo-nuclear-code-quality-review-subagent`, `thermo-nuclear-review-subagent`, and `user-docs-generator`.
- Cursor's `advisor.md` also adds host-only `readonly: true`. Under the approved target, Advisor may receive a normal tools profile derived from the same manifest mechanism, but must not have a special projection branch or lifecycle.

### Kiro CLI

- The Kiro overlay contains **30 JSON descriptors**: all **28 canonical identities** plus support descriptors `maister` and `maister-explore`.
- All 30 descriptors reference `file://./instructions/<name>.md`.
- **0/30 referenced prompt files exist** in the overlay.
- `materializer.mjs:isHistoricalReferenceException` exempts any Kiro `agents/*` descriptor matching that URI shape, so reference validation reports success while closure is actually zero.
- The install root is `.kiro-maister`; native agent discovery requires a narrow projection under `~/.kiro/agents`. The support `maister` parent currently uses a wildcard allowlist and must instead receive a deterministic exact canonical/support inventory if the host contract permits it.

### Codex legacy topology

- `.codex/agents/advisor.toml` and `.codex/agents/arbiter.toml` are tracked repository files.
- Init documentation and `reconcile-advisor-config.sh` implement a Codex-only TOML lifecycle.
- Codex parity baselines also enumerate Advisor/Arbiter TOML templates.
- `.codex/agents/advisor.toml` is currently dirty with an unstaged trailing `x`; deleting it is architecturally required but operationally blocked pending user ownership direction.

## Reusable Seams and Patterns

| Existing seam/pattern | Reuse |
|---|---|
| Sorted assembly plan and normalized collision checks | Build deterministic manifest/projection entries in canonical role order and reject duplicate/case-fold/path collisions before output. |
| Empty, same-filesystem staging with source revalidation | Run the pure projector without mutating checkout or runtime roots. Revalidate source both before and after projection. |
| Materializer validation object | Add role-schema, normalized parity, declared-transform, descriptor/prompt closure, and projection-digest checks as first-class E2 inputs. |
| `hashTree`, provenance binding, receipt publication | Bind canonical-set, manifest, projector-version, and projected-tree digests to candidate provenance and later execution evidence. |
| Drift detector and receipt-owned inventory | Detect hand edits, delete only stale receipt-owned projections, and refuse modified stale files with zero state change. |
| Journal transitions, failure injection, snapshot/restore | Extend rather than replace transactional guarantees; parameterize by managed root and test every failure boundary. |
| Typed `DistributionError` failures | Introduce precise errors for role schema, projection collision, missing reference, unknown role, missing projection, unavailable adapter, unsupported model override, digest mismatch, and wrong observed identity. |
| E1-E6 evidence schema with `passed`/`failed`/`unavailable` | Preserve the outcome model while correcting E5 semantics and supplying versioned native E5/E6 scenarios. |
| Deterministic package and extracted lifecycle tests | Prove generated projections are archive-contained, target-isolated, reproducible, installable, verifiable, and uninstallable from clean extraction. |

## Consumers, Dependencies, Tests, and Fixtures

### Consumer map

| Producer / contract | Direct consumers | Change implication |
|---|---|---|
| Canonical agent Markdown | Codex overlay copy, future projector/parser, workflow delegations | Parser must preserve complete instruction body and extract only stable portable metadata. |
| Projection manifest | Cursor/Kiro projectors, Codex injection adapter, parity validator, execution record, native probes | Manifest schema becomes the shared identity and provenance boundary. |
| Overlay layout/inventory | Materializer, overlay tests, parity/release packaging | Replace behavior-bearing agent assets with generated declarations/inputs without leaving a second owner. |
| Target paths / receipt | Transaction manager, drift detector, recovery, status/verify/uninstall | Multi-root schema must flow through every lifecycle command, not only install. |
| Exact role resolver | Development/research/product-design/performance/migration orchestrators and gate advisor/arbiter paths | Existing prose names and role configuration must normalize to `maister:<role_id>` and fail before host dispatch on ambiguity. |
| Native probe records | Transaction compatibility, release claims, docs | A successful executable version probe cannot certify native discovery. |

### Existing tests to extend

- `source-materializer.test.mjs`: deterministic projection bytes/modes/order; canonical mutation invalidates check; duplicate/mismatch/collision gives zero output; Kiro prompt closure fails without exemption.
- `overlay-contract.test.mjs`: manifest/overlay schema, support-role separation, exact adapter declarations, forbidden Advisor special cases.
- `installer-transaction.test.mjs`: multi-root install/update/verify/uninstall; stale owned leaves; unrelated Kiro agents preserved; user-modified managed leaf rejects with zero state change; injected-failure exact rollback.
- `target-registry.test.mjs`: private root plus declared native leaf root policy.
- `repository-topology.test.mjs`: no legacy Codex TOML lifecycle, no checked-in behavior-bearing Cursor/Kiro copies, expected canonical source only.
- `evidence-parity-topology.test.mjs`: corrected E5 discovery proof; E6 exact-role result binding; unavailable remains unavailable; wrong identity fails.
- `parity-release.test.mjs`: normalized 28/28 parity per host, helpers separate, zero unresolved reference/transform differences.
- `release-package.test.mjs`: deterministic target archives and extracted install/verify/uninstall across every managed root, with no foreign target or stale projection.

### Additional existing regression suites

- `tests/gate-evaluator.test.sh` protects Advisor/Arbiter gate behavior and can be adapted to the exact role port.
- `tests/advisor-config-reconciliation.test.sh` and `tests/advisor-workflow-snapshot.test.sh` encode the legacy/special Advisor model; they need removal or replacement with equality/no-special-path assertions.
- Parity fixtures and `plugins/maister/overlays/*/parity-baseline.json` must change only after projector, closure, transaction, and native evidence gates are in place.

## Current-to-Target Subsystem Mapping

| Current subsystem | Target subsystem |
|---|---|
| 28 canonical Markdown files plus hand-maintained Cursor/Kiro behavior copies | Canonical parser + versioned 28-row role IR/manifest + separately declared support agents |
| Static overlay copy of Cursor agent Markdown | Deterministic Cursor Markdown projector with `name: maister-<role_id>` |
| Kiro JSON descriptors in `.kiro-maister` with missing prompts | Generated descriptor+prompt pairs under receipt-owned leaves in native `~/.kiro/agents` |
| Codex canonical prompt resources plus special `.codex/agents/{advisor,arbiter}.toml` | Canonical prompt resources + generic subagent runtime injection for every role; no special TOML path |
| `semantic_bindings.delegate_agent` string labels | Executable resolver producing a validated `DispatchPlan`, followed by target-specific adapter invocation |
| Gate evaluator callback `invokeAdvisor` / `invokeArbiter` | Logical `maister:advisor` resolution through the same adapter contract and evidence record as every other role |
| Single `active_root` receipt/inventory | Versioned `managed_roots` with `whole_tree` or `leaf_set`; inventory identity `root_id + relative path` |
| One-tree snapshot/commit/verify/uninstall | One journal coordinating all declared roots, exact restore, and receipt publication only after every root verifies |
| E5 = successful `--version` | E5 = native discovery of expected external IDs for a pinned host/scenario/projection |
| Optional injected E6 `scenarioProbe` | Versioned E6 exact invocation of at least two distinguishable roles plus ordinary `advisor`, with observed identity/result binding |

## Required Invariants

### Projection invariants

1. Exactly 28 canonical rows; each has unique normalized `role_id`, and `role_id = filename stem = frontmatter.name`.
2. Support roles never count toward canonical parity and cannot substitute for a missing canonical role.
3. Every host has a bijective mapping for all 28 canonical rows; host ID is deterministically derived.
4. A projection is either canonical bytes or the result of a named, versioned, allowlisted transform with fixture coverage.
5. Two runs from identical source, target, manifest schema, and projector version produce identical paths, bytes, modes, order, and projected-tree digest.
6. Projection runs only in empty transaction staging and never writes to source checkout or invocation-time runtime roots.
7. All Kiro descriptor prompt references resolve inside the staged candidate; no shape-based exemption remains.
8. `advisor` has no exceptional destination, readonly/sandbox field, model lifecycle, adapter branch, or test bypass.

### Runtime invariants

1. Workflows select `maister:<role_id>`; resolver returns exactly one manifest row or a typed error.
2. Before dispatch, source/manifest/projection digests and expected host external ID are validated.
3. Unknown, duplicate, missing, collision, unavailable adapter, unsupported required model, digest mismatch, or wrong observed identity aborts with zero fallback.
4. Codex injects the complete canonical prompt into a generic native subagent; Cursor and Kiro invoke exact native projected IDs.
5. Terminal execution records bind workflow/work item, logical role, canonical digest, manifest/projection digest, host/version, external ID, dispatch ID, model/inheritance status, attempts, timestamps, and result.

### Transaction and ownership invariants

1. Receipt root identity is explicit; every managed entry is addressed by `root_id + safe relative path`.
2. Kiro native ownership is a computed leaf set only; unrelated `~/.kiro/agents/*`, project-local agents, and settings remain unmanaged.
3. Update removes only stale receipt-owned leaves. A modified owned leaf causes drift conflict before mutation.
4. Failure at any injected point restores bytes, modes, symlinks, existence, settings, directory topology, and previous receipt across all roots.
5. Verify and uninstall cover all roots; receipt publication occurs only after every root verifies.

### Evidence invariants

1. Structural/materialization success does not imply native discovery or invocation.
2. E5 observes expected native external IDs; executable presence/version alone is insufficient.
3. E6 invokes exact distinguishable roles and binds observed identity/result to current provenance.
4. Missing runtime, auth, safe scenario, or host capability is `unavailable`, never `passed`.
5. Host version, source commit/version, manifest/projector/projection digests, overlay version, or scenario version changes invalidate prior evidence.

## Missing Seams, Hazards, and Required Negative Proofs

### Missing seams

- No canonical agent parser, role IR, manifest schema, transform registry, or agent projector exists.
- Materializer has no post-assembly/pre-validation projection phase API or projection provenance fields.
- Receipt, drift, journal, recovery, transaction, status, verify, and uninstall contracts are single-root.
- No exact logical-role resolver, dispatch-plan schema, target adapter implementations, or shared execution record exists.
- Host probes have no real discovery scenarios and no repository-provided exact invocation scenarios.
- Normalized role parity and support-role classification are absent from current overlay/release gates.

### Hazards

- Adding generated files after `stagingEntries` or content hashing would create unreceipted, unhashed output.
- Reusing the current Kiro exemption would preserve a false-green materialization state.
- Treating all `~/.kiro` or `~/.kiro/agents` as one managed tree would delete or overwrite user-owned agents.
- Updating install but not recovery/uninstall/verify would produce non-recoverable partial multi-root state.
- Reusing hand-maintained Cursor/Kiro prompt bodies during transition would retain a second behavior owner.
- Deleting `.codex/agents/advisor.toml` now would discard a dirty tracked user change.
- Claiming E5 from `--version` or E6 from a mocked callback would overstate operational host support.

### Required negative proofs

- Duplicate/case-fold/path-colliding role IDs, `stem != name`, missing/extra/substituted canonical roles: typed failure, empty output.
- Undeclared transform or hand-edited generated projection: deterministic check/drift failure.
- Missing Kiro prompt or escaping/absolute prompt URI: `E_MATERIALIZE_REFERENCE`, no target mutation.
- Missing/unknown/duplicate runtime role, unmanaged host-name collision, digest mismatch, wrong identity, unavailable adapter, unsupported required model: no dispatch and no fallback.
- Multi-root injected failures before/after each leaf commit, verification, settings write, and receipt publication: exact restoration of every root and prior receipt.
- Unrelated Kiro native agent and project-local shadow fixtures remain byte-exact; collisions fail closed.
- Repository/init/release artifacts contain neither Advisor/Arbiter TOML nor special Advisor projection/dispatch logic after clean removal.
- E5 without an executed discovery scenario and E6 without exact identity observation remain `unavailable`.

## Documentation, CI, and Release Impact

### Documentation

- `.maister/docs/project/architecture.md`: role IR/projector, staged generation, exact adapters, execution records, managed roots, Kiro leaf ownership, and clean legacy removal.
- `.maister/docs/project/{vision,roadmap,tech-stack}.md`: parity terminology, projector/manifest technology, and operational evidence limits.
- `.maister/docs/standards/global/build-pipeline.md`: agent projection generate/check, normalized 28/28 parity, reference closure, and release order.
- `.maister/docs/standards/testing/test-writing.md`: multi-root transactional rejection/rollback, exact invocation identity, and native evidence prerequisites.
- `docs/commands.md` and `docs/workflows.md`: logical IDs, host destinations, fail-closed errors, support-role distinction, and removal of Codex Advisor profile claims.
- Init skill/help/output: retain Advisor gate policy configuration, but remove creation/reconciliation of Codex TOML profiles.

### CI and release

1. Add deterministic projector generate/check and normalized role-parity jobs before materializer tests.
2. Require Kiro descriptor/prompt closure and reject the historical exemption.
3. Run all target materialization and multi-root lifecycle suites in `make validate`.
4. Keep strict dirty-source release behavior; update parity baselines only after reviewed target changes pass new gates.
5. Package from clean isolated output, build each target twice, compare hashes, and run extracted install/verify/uninstall including Kiro native leaves.
6. Record native E5/E6 only from pinned executable scenarios; absence remains provisional/unavailable and must not become a release support claim.
7. Bind manifest/projector/projection digests into receipts, SBOM/provenance metadata as appropriate, and native scenario provenance.

## Critical Clarification

The target architecture explicitly removes `.codex/agents/advisor.toml` and `.codex/agents/arbiter.toml` from the repository and removes all init/runtime migration logic. However, `.codex/agents/advisor.toml` is tracked and currently contains an unstaged user modification (a trailing `x`). The implementation phase must not erase that work implicitly.

**Question:** May the implementation delete both tracked legacy TOML files and intentionally discard the current local change to `advisor.toml`, or should the user preserve/move that change before implementation continues?

Until answered, analysis/specification/planning may continue, but source implementation that removes or rewrites the dirty file is blocked.

## Recommended Dependency Order

1. **Canonical contract:** parser, strict role IR/schema, 28-row manifest, support inventory, `stem = name`, Advisor-equality tests.
2. **Pure projector:** deterministic Cursor/Kiro/Codex representation functions, named transform registry, golden fixtures, projection digests; no active install switch yet.
3. **Materializer integration:** run projector in staging before validation/hash/provenance; add normalized parity and reference closure; remove Kiro exemption only when generated prompts exist.
4. **Managed-root transaction model:** version receipt/journal/recovery/drift/verify/uninstall around `managed_roots` and Kiro leaf-set; complete injected-failure tests before enabling native destination.
5. **Host projections:** switch Cursor to generated 28/28 Markdown and Kiro to generated native descriptor+prompt pairs; keep support agents separate.
6. **Exact runtime:** logical resolver, `DispatchPlan`, Codex/Cursor/Kiro adapters, execution record, and workflow/gate role bindings.
7. **Clean legacy removal:** after explicit dirty-file ownership approval, remove tracked TOMLs, templates, reconciliation code, special tests, parity entries, and documentation; add negative topology proof and no migration code.
8. **Native evidence:** implement pinned E5 discovery and E6 exact-invocation scenarios for two distinguishable roles plus ordinary `advisor`; preserve `unavailable` where prerequisites do not exist.
9. **Release and docs:** regenerate reviewed parity baselines, run deterministic target packages and extracted lifecycle, then update architecture/standards/operator documentation and release metadata.

This ordering keeps the new representation and provenance contract testable before widening transaction ownership, and keeps native support claims behind executable evidence rather than file-count parity.
