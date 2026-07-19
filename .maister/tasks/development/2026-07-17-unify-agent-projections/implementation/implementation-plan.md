# Implementation Plan: Unified Agent Projections and Exact Invocation

## TL;DR

The work is split into 11 dependency-safe tracer groups across nine execution waves. The canonical role contract lands first; deterministic projection and durable execution-event persistence can then proceed in parallel. Materializer/provenance and the atomic multi-root Kiro lifecycle serialize before exact resolution, while host adapters and workflow configuration form the second safe parallel wave. Gate integration and legacy topology removal follow, with native evidence, release gates, documentation, and full verification last. Coverage is risk-based: the plan requires at least 120 non-redundant focused scenarios and sets no fixed maximum.

## Key Decisions

- Use one checked-in projection contract, `plugins/maister/agent-projection-v1.json`, plus strict parser/manifest code — it fixes the expected 28-role inventory and target execution tables without creating another behavior owner.
- Generate target artifacts only inside materializer staging and install the validated manifest as internal runtime metadata — resolver and evidence consumers can verify the same bytes and digests that receipts own.
- Version receipt and journal persistence directly to a clean-install multi-root schema — v1 state is rejected before mutation; no migration or compatibility branch is planned.
- Put the exact resolver, execution-event writer, process manager, and adapters under `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/` — that common runtime is already packaged for every supported target and can be imported by the gate evaluator without a second copy.
- Treat Cursor and Kiro native launch as versioned adapters that return typed `unavailable` when exact selection or observed identity cannot be enforced — no natural-language, built-in, inline, or root-agent fallback is permitted.
- Keep all parity-baseline, support-claim, release, and documentation changes until Groups 10-11 — structural output and transaction safety must be green before evidence or release claims change.

## Open Questions / Risks

- Codex CLI flags, authentication, model availability, and JSONL/session observations are version-sensitive. Capability inspection must fail before spawn when any required `codex exec` control is absent.
- Cursor plugin-agent precedence and Kiro delegated identity observability may remain unavailable on some host versions. Correct structural delivery does not authorize a native-support claim.
- Multi-root Kiro ownership is the highest-risk change. Receipt, journal, snapshot, drift, commit, verify, status, update, uninstall, rollback, and recovery must ship together in Group 4.
- Preserve unrelated worktree files. By explicit recovery-gate override, Group 9 deletes exactly `.codex/agents/{advisor,arbiter,luna_smoke_agent}.toml`; all other `.codex/agents/*` remain out of scope.
- Workspace-writing Codex workers against one checkout must remain serialized. Read-only workers may be concurrent only after the execution profile and adapter classify them as read-only.

## Overview

- Total Steps: 92
- Task Groups: 11
- Execution Waves: 9
- Expected Tests: at least 120 distinct focused scenarios; no fixed maximum
- Testing Group: Group 11 performs cross-feature gap review and full target/release verification
- Visual Coverage: Not applicable; no design context exists, so no `Visual References` or `visual-coverage.md` is created

## Frozen Implementation Contracts

### Canonical role and projection contract

- The immutable input is exactly `plugins/maister/agents/*.md`; no role is added, removed, or maintained in a target overlay.
- `role_id`, filename stem, and frontmatter `name` are identical lowercase safe IDs. Workflow identity is exactly `maister:<role_id>`.
- `plugins/maister/agent-projection-v1.json` records the exact expected role inventory, schema/projector versions, target representations, named transforms, tools/permissions/model/reasoning/timeout/output-schema/concurrency profiles, destinations, and separate support inventories.
- A generated manifest row keeps `logical_role_id`, `adapter_id`, and nullable `native_role_external_id` distinct. Codex uses `codex.exec` and `null`; Cursor and Kiro use exact `maister-<role_id>` native IDs.
- The staged manifest and target outputs use canonical JSON, UTF-8, LF, one trailing newline where textual, stable modes, sorted paths/keys, per-output SHA-256, and a projected-tree digest.
- Codex receives all 28 prompts plus deterministic role-specific output schemas; Cursor receives 28 generated native Markdown agents; Kiro receives 28 generated descriptor/prompt pairs. Support agents are validated and owned separately.

### Multi-root clean-install contract

- Receipt and journal schema v2 reject schema v1 before any mutation and do not migrate, back up, interpret, or clean old runtime state.
- `managed_roots` uses stable IDs and `whole_tree | leaf_set` policies. Managed inventory identity is `(root_id, normalized relative path)`.
- Codex and Cursor use one `whole_tree` plugin root. Kiro uses its private `whole_tree` root plus `kiro_native_agents` as a `leaf_set` rooted at `~/.kiro/agents`.
- One target lock and one journal cover every root and managed setting. Receipt publication occurs only after every root and setting verifies.
- Unmanaged collisions fail before mutation even when bytes match. Stale leaves are removable only when the prior receipt owns them and current type, bytes, mode, and link target still match.
- Code 7 remains unresolved recovery semantics: preserve lock/journal/backup/staging diagnostics and never advise deleting state.

### Runtime dispatch and evidence contract

- The resolver accepts only exact `maister:<role_id>`, validates the active v2 receipt and projection bindings, and emits one immutable `DispatchPlan` or a typed failure.
- Every dispatch owns `<task_path>/execution/agent-dispatches/<dispatch_id>.jsonl`, directory mode `0700`, file mode `0600`, and a per-dispatch lock.
- Event order is `dispatch_started`, one or more `attempt_started`/`attempt_completed` pairs, and exactly one `dispatch_terminal`; each canonical JSON event has a zero-based sequence, previous digest, and SHA-256 event digest.
- A durable event is flushed and fsynced before the next side effect. Pre-spawn write failure prevents invocation; post-spawn write failure attempts cancellation and returns `execution_record_failure`.
- Codex uses managed `codex exec` processes with `--ignore-user-config`, `-C`, `-m`, `model_reasoning_effort`, `--sandbox`, `--json`, `--output-schema`, and `--output-last-message`. Native custom agents, `spawn_agent`, V1/V2 switching, and app-server orchestration remain out of scope.
- Cursor and Kiro adapters use only their exact manifest-declared native IDs. A host without enforceable exact selection or observable identity returns `unavailable`; it never falls back.
- Gate actor identity, gate idempotency key, dispatch ID, execution idempotency key, and canonical role ID remain separate fields. Advisor and Arbiter both request `maister:advisor` but retain distinct decision-attempt identity.

### Testing contract

- Every implementation group starts with tests for its own behavioral and failure boundaries; test count follows risk and non-redundancy, with no fixed maximum.
- Group verification runs only new or directly affected tests. Group 11 runs broader target-aware, parity, topology, package, and extracted-lifecycle suites.
- The real 28-role inventory is tested alongside small malformed fixtures. Counts alone are insufficient; assertions cover exact IDs, mappings, digests, support separation, and reference closure.
- Transaction rejection and injected-failure tests compare bytes, modes, symlinks, existence, directory topology, settings, receipts, journals, and unrelated Kiro agents before and after.
- Native evidence distinguishes `passed`, `failed`, and `unavailable`. Executable presence or `--version` never satisfies E5 or E6.

## Requirement Coverage

| Requirement | Primary Group(s) | Planned proof |
|---|---|---|
| R1 | 1 | Exact 28-file allowlist and real-inventory parser test |
| R2 | 1 | Closed IR/frontmatter/body validation |
| R3 | 1 | Typed malformed, unknown, collision, unsafe dependency, and zero-output cases |
| R4 | 1 | Sorted versioned manifest, separate identity fields, deterministic digest |
| R5 | 1-2 | Explicit support inventories and canonical-bijection tests |
| R6 | 1, 8-10 | Advisor equality in manifest, config, adapters, topology, and evidence |
| R7 | 3 | Projector inserted after trusted assembly and before enumeration/hash |
| R8 | 2-3 | Independent repeated projections and stable bytes/modes/order/hashes |
| R9 | 1-2 | Named allowlisted transforms with fixtures; undeclared drift rejected |
| R10 | 2-3 | Staging-only writes and source/runtime-generation negative proofs |
| R11 | 2-3 | 28/28 bijection, collision safety, support separation, Kiro reference closure |
| R12 | 3-4, 6 | Provenance/receipt bindings and installed/runtime mismatch rejection |
| R13 | 2, 7 | Codex prompt/schema projection and managed `codex exec` worker contract |
| R14 | 2 | Generated Cursor 28/28 Markdown, E2E role included, no Advisor metadata |
| R15 | 2, 4 | Kiro 28 descriptor/prompt pairs plus separately owned support agents |
| R16 | 1, 7 | Common validated execution profiles; no role-name conditionals or inheritance degradation |
| R17 | 4 | Receipt/journal v2 managed-root and `(root_id,path)` identity |
| R18 | 4 | One lock/journal across every lifecycle command and root |
| R19 | 4 | Kiro leaf-set preservation tests for unrelated user agents |
| R20 | 4 | Pre-mutation collision refusal and exact stale-leaf ownership checks |
| R21 | 4 | Byte/mode/symlink/existence/topology recovery at every mutation boundary |
| R22 | 4, 11 | Path identity/drift refusal and accurate cooperative-concurrency docs |
| R23 | 6 | Exact logical grammar; alias/fuzzy/default negative cases |
| R24 | 6-7 | Receipt/digest/collision/host/auth/control/model preflight |
| R25 | 6-7 | Distinct typed failures and no-fallback adapter tests |
| R26 | 6-7 | Common terminal result contract across three target adapters |
| R27 | 5, 7 | Locked, fsynced, hash-chained JSONL lifecycle and write-failure handling |
| R28 | 5, 9 | Separate gate, idempotency, dispatch, attempt, and role identities |
| R29 | 7, 10 | Codex control-surface discovery and Cursor/Kiro native inventory discovery |
| R30 | 7, 10 | Two distinguishable ordinary roles plus ordinary Advisor exact-invocation scenarios |
| R31 | 10 | `passed`/`failed`/`unavailable` and freshness invalidation |
| R32 | 10-11 | One dependency-ordered delivery scope and evidence-gated support claims |
| R33 | 2, 11 | Packages include canonical/projector inputs and exclude behavior copies/TOML profiles |
| R34 | 8-9, 11 | Exact gate bindings, removed legacy fields/topology, clean-state rejection |
| R35 | 11 | Commands, workflows, architecture, build, testing, release, ownership, and evidence docs |

## Implementation Steps

### Task Group 1: Canonical Agent IR, Manifest, and Execution Profiles

**Dependencies:** None  
**Files to Modify:** `plugins/maister/agent-projection-v1.json` (new), `plugins/maister/lib/distribution/agent-ir.mjs` (new), `plugins/maister/lib/distribution/agent-manifest.mjs` (new), `plugins/maister/lib/distribution/overlay-loader.mjs`, `plugins/maister/overlays/schema/overlay-v1.schema.json`, `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml`, `plugins/maister/overlays/{codex,cursor,kiro-cli}/inventory.yml`, `tests/platform-independent/overlay-contract.test.mjs`, `tests/fixtures/platform-independent/overlays/{codex,cursor,kiro-cli}/{overlay.yml,inventory.yml}`, `tests/fixtures/platform-independent/agent-ir/**` (new)  
**Read-only Inputs:** `plugins/maister/agents/*.md`, `plugins/maister/skills/*/SKILL.md`  
**Expected Tests:** at least 10 distinct focused scenarios; add more for any uncovered parser/profile failure boundary  
**Estimated Steps:** 8

- [x] 1.0 Complete the canonical role and execution-profile contract.
  - [x] 1.1 Write focused parser, manifest, profile, support-separation, and Advisor-equality tests first.
    - Use the real 28-role tree plus minimal malformed fixtures.
    - Cover exact inventory, stem/name/logical identity, closed metadata, body presence, skill resolution, YAML alias/tag/scalar rejection, duplicate/case-fold/normalized collisions, unknown fields, unsupported profile IDs, and zero manifest output on failure.
  - [x] 1.2 Implement strict canonical Markdown parsing into immutable versioned Agent IR.
    - Reuse canonical YAML parsing, path safety, and hashing; do not add a dependency or infer policy from prompt prose.
    - Preserve complete instruction bodies and source-order skill dependencies after duplicate validation.
  - [x] 1.3 Add `agent-projection-v1.json` as the closed expected-inventory and target-policy input.
    - Declare exactly 28 role IDs, named transforms, target destinations, support inventories, tools/permissions/model/reasoning/timeout/output-schema/concurrency profiles, and schema/projector versions.
    - Use defaults plus explicit profile references; code must not branch on `advisor` or any other role name.
  - [x] 1.4 Build and validate the sorted projection manifest.
    - Bind source path/digest, metadata, skill dependencies, transform IDs, profile IDs, `logical_role_id`, `adapter_id`, nullable `native_role_external_id`, manifest digest, and canonical-set digest.
  - [x] 1.5 Extend the strict overlay schema/loader and target fixtures for the projection/profile contract.
    - Reject unknown fields, incomplete 28-role coverage, unsafe destinations, unsafe support assets, duplicate profiles, and target/adapter identity mismatches.
  - [x] 1.6 Enforce support-role separation and the Advisor equality invariant as negative validation.
    - Reject Advisor-only TOML, readonly/sandbox/destination/permissions/model/adapter/evidence/lifecycle fields or exceptions.
  - [x] 1.7 Run only `overlay-contract.test.mjs` plus the new Agent IR fixtures and make all Group 1 scenarios pass.

**Acceptance Criteria:**

- The parser produces exactly the expected 28 immutable rows and a separately reported support inventory.
- Every manifest row has deterministic identity/profile/projection fields and digest bindings; Codex native identity is null, Cursor/Kiro native identities are exact.
- Every invalid metadata, dependency, collision, profile, path, or Advisor-special-case input fails with a typed error and no manifest/projection output.
- No canonical agent file is modified and no target behavior copy is introduced.

### Task Group 2: Pure Deterministic Projector and Host Representations

**Dependencies:** Group 1  
**Files to Modify:** `plugins/maister/agent-projection-v1.json`, `plugins/maister/lib/distribution/agent-projector.mjs` (new), `plugins/maister/lib/distribution/agent-projection-validator.mjs` (new), `plugins/maister/bin/project-agents.mjs` (new), `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml`, `plugins/maister/overlays/{codex,cursor,kiro-cli}/inventory.yml`, `plugins/maister/overlays/cursor/assets/agents/**` (delete canonical behavior copies), `plugins/maister/overlays/cursor/assets/support-agents/**` (new/moved support input), `plugins/maister/overlays/kiro-cli/assets/agents/**` (delete canonical descriptor copies), `plugins/maister/overlays/kiro-cli/assets/support-agents/**` (new explicit descriptor/prompt inputs), `plugins/maister/overlays/kiro-cli/assets/agent-tools.json`, `tests/platform-independent/agent-projection.test.mjs` (new), `tests/platform-independent/overlay-contract.test.mjs`, `tests/fixtures/platform-independent/agent-projection/**` (new)  
**Expected Tests:** at least 12 distinct focused scenarios; parameterize only genuine target representation seams  
**Estimated Steps:** 8

- [x] 2.0 Complete pure deterministic target projection.
  - [x] 2.1 Write projector determinism, transform, host-shape, support-inventory, collision, and closure tests first.
    - Compare two independent runs for ordered paths, UTF-8 bytes, LF/trailing-newline policy, canonical JSON, modes, per-output hashes, manifest digest, and projected-tree digest.
    - Prove missing/substituted roles, undeclared transforms, unsafe destinations, case collisions, unresolved Kiro URIs, and hand-edited outputs fail with zero committed output.
  - [x] 2.2 Implement a pure staging-root projector and sorted output inventory.
    - Accept only validated IR/manifest/target/staging inputs; reuse hash-tree and path-safety helpers.
    - Never mutate the checkout, installed roots, or invoke a host.
  - [x] 2.3 Emit all three representations from the same 28 rows.
    - Codex: complete canonical prompt resources plus deterministic role-specific JSON schemas; no TOML/native-agent files.
    - Cursor: 28 Markdown agents named exactly `maister-<role_id>`, including `e2e-test-verifier`, with only named transforms.
    - Kiro: 28 `maister-<role_id>.json` descriptors plus matching `instructions/maister-<role_id>.md` prompts with closed relative URIs.
  - [x] 2.4 Validate canonical bijection, normalized identity, support separation, destinations, modes, transforms, and all internal references.
  - [x] 2.5 Replace checked-in canonical Cursor/Kiro behavior assets with explicit non-canonical support inputs.
    - Cursor `explore` and Kiro `maister`/`explore` remain separate support assets with explicit prompt ownership and hashes; they never satisfy 28/28.
  - [x] 2.6 Add a developer `project-agents --check` entry point that compares an isolated projection without writing generated behavior back to the checkout.
  - [x] 2.7 Run only Group 2 projection/overlay tests and make every scenario pass.

**Acceptance Criteria:**

- Each target has exact 28/28 canonical projection and a separately named support inventory.
- Two identical runs are byte-, path-, mode-, order-, per-file-hash-, manifest-, and tree-digest-identical.
- Cursor has no Advisor-only metadata or missing E2E role; Kiro has 100% descriptor/prompt closure.
- No checked-in Cursor/Kiro canonical behavior copy remains; support assets cannot mask canonical gaps.

### Task Group 3: Materializer Boundary and Projection Provenance

**Dependencies:** Group 2  
**Files to Modify:** `plugins/maister/lib/distribution/materializer.mjs`, `plugins/maister/lib/distribution/provenance.mjs`, `plugins/maister/lib/distribution/hash-tree.mjs`, `plugins/maister/lib/distribution/path-safety.mjs`, `plugins/maister/bin/materialize.mjs`, `tests/platform-independent/source-materializer.test.mjs`, `tests/fixtures/platform-independent/source-repos/agent-projection/**` (new), `tests/fixtures/platform-independent/agent-projection/**`  
**Expected Tests:** at least 8 distinct focused scenarios  
**Estimated Steps:** 8

- [x] 3.0 Integrate projection at the trusted materializer seam.
  - [x] 3.1 Write materializer insertion, provenance, zero-mutation, and source-revalidation tests first.
    - Assert projection occurs after immutable source revalidation/normal assembly and before staging enumeration, syntax/reference validation, content hashing, and provenance finalization.
  - [x] 3.2 Add the explicit post-assembly/pre-enumeration projection phase.
    - Project only into the caller-provided empty same-filesystem staging tree and merge outputs into normal candidate validation.
  - [x] 3.3 Extend materialization provenance with schema version, projector version, canonical-set digest, manifest digest, and projected-tree digest.
    - Reuse canonical JSON and existing provenance digest rules.
  - [x] 3.4 Make projected files ordinary inventory, syntax, mode, reference, hash, and content-hash inputs.
  - [x] 3.5 Remove the broad Kiro prompt-reference exception only after generated descriptor/prompt closure is active.
  - [x] 3.6 Add negative proof that projection cannot write to immutable source or generate host files during invocation.
  - [x] 3.7 Run only `source-materializer.test.mjs` and Group 3 fixtures and make every scenario pass.

**Acceptance Criteria:**

- Projection failures happen before snapshot or target mutation and leave no source-checkout writes.
- Candidate validation and provenance cover the exact projected bytes installed later.
- Kiro missing/escaping/absolute prompt references fail normally; no shape-based exception remains.
- Source/overlay/manifest/projector changes deterministically alter and invalidate the corresponding provenance binding.

### Task Group 4: Atomic Managed-Root v2 Lifecycle and Kiro Leaf Ownership

**Dependencies:** Group 3  
**Files to Modify:** `plugins/maister/lib/distribution/targets.mjs`, `plugins/maister/lib/distribution/target-paths.mjs`, `plugins/maister/lib/distribution/receipt-schema.mjs`, `plugins/maister/lib/distribution/journal-schema.mjs`, `plugins/maister/lib/distribution/drift-detector.mjs`, `plugins/maister/lib/distribution/recovery.mjs`, `plugins/maister/lib/distribution/transaction-manager.mjs`, `plugins/maister/lib/distribution/cli-contract.mjs`, `plugins/maister/bin/maister-install.mjs`, `plugins/maister/overlays/kiro-cli/overlay.yml`, `plugins/maister/overlays/kiro-cli/inventory.yml`, `tests/platform-independent/target-registry.test.mjs`, `tests/platform-independent/installer-transaction.test.mjs`, `tests/fixtures/platform-independent/user-homes/multi-root/**` (new), `tests/fixtures/platform-independent/source-repos/agent-projection/**`  
**Expected Tests:** at least 18 distinct focused scenarios, plus one assertion for every implemented mutation/failure boundary  
**Estimated Steps:** 11

- [x] 4.0 Deliver managed-root schema and the complete Kiro lifecycle atomically.
  - [x] 4.1 Write v2 schema, multi-root lifecycle, collision, stale-leaf, drift, rollback, recovery, and topology tests first.
    - Snapshot every affected root, setting, receipt, journal, unrelated Kiro leaf, and minimum parent topology before invalid-input and injected-failure cases.
  - [x] 4.2 Define receipt/journal v2 with stable root IDs, `whole_tree | leaf_set`, and `(root_id,path)` inventory identity.
    - Reject v1 state with an actionable typed clean-install error before mutation; add no interpreter or migration branch.
  - [x] 4.3 Extend target definitions/path resolution with a managed-root registry.
    - Codex/Cursor: one private whole tree. Kiro: private whole tree plus `kiro_native_agents` leaf set under the supported native root.
  - [x] 4.4 Generalize drift and inventory resolution across root IDs while preserving type/mode/hash/symlink checks and identity revalidation.
  - [x] 4.5 Generalize snapshot, backup-manifest, exact restore, and recovery across all roots and minimum parent topology.
  - [x] 4.6 Generalize install, update, status, verify, uninstall, rollback, and recover under one target lock and durable journal.
    - Publish the receipt only after every root, setting, and projection binding verifies.
  - [x] 4.7 Enforce pre-mutation unmanaged-collision and stale-leaf rules.
    - Byte-identical unmanaged files still collide; modified receipt-owned leaves cause zero-change drift failure.
  - [x] 4.8 Preserve cooperative concurrency boundaries.
    - Revalidate path identity and managed-state drift at mutation boundaries; retain code-6 busy and code-7 unresolved semantics.
  - [x] 4.9 Enable Kiro native leaves only after all lifecycle/failure tests are green and verify unrelated user agents remain byte-identical.
  - [x] 4.10 Run only `target-registry.test.mjs` and `installer-transaction.test.mjs` and make every Group 4 scenario pass.

**Acceptance Criteria:**

- All lifecycle commands operate over the same managed-root registry; no command ignores Kiro native leaves.
- Initial collisions and modified stale leaves fail before mutation; unchanged receipt-owned stale leaves are removed safely.
- Failure after every mutation boundary restores bytes, modes, symlinks, existence, directories, settings, receipts, and journaled state exactly.
- Unrelated `~/.kiro/agents` content remains outside ownership and byte-identical across install/update/rollback/recovery/uninstall.
- Receipt/journal v1 is rejected clearly with no compatibility or migration behavior.

### Task Group 5: Durable Dispatch Event Schema and Writer

**Dependencies:** Group 1  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-schema.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs` (new), `tests/platform-independent/agent-execution-events.test.mjs` (new), `tests/fixtures/platform-independent/agent-execution-events/**` (new)  
**Expected Tests:** at least 10 distinct focused scenarios  
**Estimated Steps:** 8

- [x] 5.0 Complete the append-only dispatch event boundary before live dispatch exists.
  - [x] 5.1 Write schema, permissions, sequence, digest-chain, locking, idempotency, recovery, and write-failure tests first.
  - [x] 5.2 Implement the closed versioned event schema and canonical JSON/digest function.
    - Validate workflow/work item, role/projection identity, adapter/native identity, host/version, requested/effective policy, timestamps, attempt/result/error data, sequence, previous digest, and event digest.
  - [x] 5.3 Implement safe dispatch IDs, task-root containment, directory/file modes, and per-dispatch locking.
    - Reuse path-safety and atomic/durable filesystem patterns; never use gate IDs as path identity.
  - [x] 5.4 Implement single-line append, flush, fsync, reread validation, and exactly-one-terminal enforcement.
  - [x] 5.5 Implement duplicate idempotency-key reuse and incomplete-stream recovery with sequence/hash-chain validation.
  - [x] 5.6 Define pre-side-effect and post-side-effect write-failure results so later adapters can prevent spawn or request cancellation.
  - [x] 5.7 Run only `agent-execution-events.test.mjs` and make every Group 5 scenario pass.

**Acceptance Criteria:**

- Valid streams are immutable, canonical, sequential, hash-chained, mode-correct, lock-protected, and terminal exactly once.
- Duplicate idempotency keys reuse a validated stream; corrupt or conflicting streams fail closed.
- Pre-spawn recording failure makes invocation impossible; the API exposes post-spawn cancellation/failure semantics without returning success.
- Dispatch, idempotency, work-item, gate-decision, and logical-role identities are distinct.

### Task Group 6: Exact Resolver and Common Dispatch Contracts

**Dependencies:** Groups 1, 3, 4, and 5  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/dispatch-contract.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/agent-resolver.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/dispatch-agent.mjs` (new), `plugins/maister/lib/distribution/receipt-schema.mjs`, `plugins/maister/lib/distribution/target-paths.mjs`, `tests/platform-independent/agent-resolver.test.mjs` (new), `tests/fixtures/platform-independent/agent-resolver/**` (new)  
**Expected Tests:** at least 12 distinct focused scenarios  
**Estimated Steps:** 8

- [x] 6.0 Complete exact logical-role resolution and shared adapter envelopes.
  - [x] 6.1 Write grammar, receipt/projection preflight, collision, capability, model-control, Advisor, and no-fallback tests first.
  - [x] 6.2 Define strict `maister:<role_id>` parsing and immutable `DispatchPlan`/terminal-result schemas.
    - Keep requested logical identity, adapter identity, nullable native identity, dispatch ID, policy, and provenance fields separate.
  - [x] 6.3 Implement exact manifest lookup and uniqueness validation with no aliases, case folding, fuzzy matching, natural-language selection, or defaults.
  - [x] 6.4 Implement installed-state preflight.
    - Validate active receipt schema/status, canonical/manifest/projected-tree digests, expected target representation, root inventory, and external-name collisions.
  - [x] 6.5 Implement adapter/host/version/auth/control/model/reasoning availability hooks as required pre-dispatch checks.
  - [x] 6.6 Return distinct typed outcomes for unknown, ambiguous, duplicate, missing, stale, mismatched, collided, unavailable, unsupported-control/model, and wrong-observed-identity states.
    - Prove ordinary `advisor` traverses the identical lookup and policy path.
  - [x] 6.7 Run only `agent-resolver.test.mjs` and make every Group 6 scenario pass.

**Acceptance Criteria:**

- Every accepted request yields exactly one immutable validated dispatch plan; every prohibited request fails before host invocation.
- Resolver preflight binds installed bytes and policies to the active receipt and generated manifest.
- No failure path can fall back to inline/root/built-in/default/similar/alternate-host execution.
- All adapters can consume the same plan and return the same terminal shape without losing native observations.

### Task Group 7: Managed Codex Workers and Native Host Adapters

**Dependencies:** Groups 5 and 6  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/codex-exec-capabilities.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/codex-worker-manager.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/index.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/codex-exec.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/cursor.mjs` (new), `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/kiro-cli.mjs` (new), `plugins/maister/agent-projection-v1.json`, `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml`, `tests/platform-independent/agent-adapters.test.mjs` (new), `tests/fixtures/platform-independent/agent-adapters/**` (new)  
**Expected Tests:** at least 12 distinct focused scenarios, including every Codex process side-effect boundary  
**Estimated Steps:** 9

- [x] 7.0 Complete concrete target adapters, with managed `codex exec` as the approved Codex backend.
  - [x] 7.1 Write capability, argv/stdin, event-ordering, structured-result, timeout/cancel, concurrency, native-identity, and no-fallback tests first using injected process/native ports.
  - [x] 7.2 Implement a versioned Codex capability inspector.
    - Prove executable/authentication/allowed version and exact support for working root, model, reasoning effort, sandbox, JSONL, output schema, last-message output, and ignore-user-config controls.
  - [x] 7.3 Implement the managed Codex process lifecycle.
    - Pass the complete canonical role plus bounded task on stdin; pin `-C`, `-m`, `model_reasoning_effort`, and sandbox; require JSONL, role-specific schema, and last-message output.
    - Retain normal authentication while ignoring user execution defaults.
  - [x] 7.4 Bind process side effects to durable events.
    - Write/fsync started events before spawn, capture attempt observations, cancel on post-spawn record failure when possible, and never return success without a durable terminal event.
  - [x] 7.5 Validate Codex exit status, timeout, JSONL/session identity, final schema, logical role/digests/nonce, effective model/effort, and terminal output.
  - [x] 7.6 Enforce concurrency classes.
    - Allow proven read-only concurrency; serialize workspace-writing workers per checkout. Do not implement worktrees, merging, V1/V2, native custom agents, `spawn_agent`, or app-server orchestration.
  - [x] 7.7 Implement Cursor and Kiro exact-native adapter ports.
    - Use only manifest-declared native IDs and versioned launch/observation capabilities; return `unavailable` if exact invocation or identity cannot be enforced/observed.
  - [x] 7.8 Run only `agent-adapters.test.mjs` and make every Group 7 scenario pass.

**Acceptance Criteria:**

- Codex launches only a fully pinned, schema-validated managed `codex exec` worker after capability and durable-event preflight.
- Missing controls, auth, model, exact native launch, or observable identity return typed unavailable/unsupported outcomes without fallback.
- Read-only concurrency and workspace-write serialization follow manifest profiles; Advisor has no special path.
- Cursor/Kiro results preserve requested and observed native identity in the common terminal contract.

### Task Group 8: Exact Workflow Requests and Gate Configuration Cutover

**Dependencies:** Group 6  
**Files to Modify:** `plugins/maister/skills/init/SKILL.md`, `plugins/maister/skills/init/bin/reconcile-gate-config.sh` (new), `plugins/maister/skills/init/bin/reconcile-advisor-config.sh` (delete), `plugins/maister/skills/{codebase-analyzer,development,implementation-plan-executor,implementation-verifier,migration,performance,product-design,research,standards-discover,standards-update,thermos}/SKILL.md`, `plugins/maister/commands/{reviews-code,reviews-pragmatic,reviews-production-readiness,reviews-reality-check,reviews-spec-audit,work}.md`, `plugins/maister/skills/orchestrator-framework/references/{orchestrator-patterns.md,orchestrator-creation-checklist.md}`, `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs`, `plugins/maister/lib/distribution/cursor-skill-projector.mjs`, `plugins/maister/overlays/cursor/assets/skills/**` (mechanically regenerated compatibility projection), `tests/gate-config-reconciliation.test.sh` (new/renamed), `tests/advisor-config-reconciliation.test.sh` (delete), `tests/advisor-workflow-snapshot.test.sh`, `tests/fixtures/gate-config/**` (new/renamed), `tests/fixtures/advisor-config/**` (delete after replacement), `tests/fixtures/advisor-state/canonical-advisor.yml`  
**Expected Tests:** at least 6 distinct focused scenarios plus repository-wide exact-role call-site assertions  
**Estimated Steps:** 7

- [x] 8.0 Cut project/workflow configuration to exact logical role IDs before gate-evaluator integration.
  - [x] 8.1 Write configuration/default/rejection and workflow-call-site tests first.
    - Require `advisor_agent` and `arbiter_agent` to default to exact `maister:advisor`.
    - Reject legacy `advisor_model`/`arbiter_model`, unnamespaced `advisor`, non-canonical `arbiter`, aliases, and incomplete configuration without rewriting.
  - [x] 8.2 Replace Advisor host-profile reconciliation with project-only gate configuration normalization.
    - Keep gate policy/retry settings; remove all host TOML generation, permissions, model, readonly, sandbox, cleanup, or migration behavior.
  - [x] 8.3 Update all five orchestrator templates/snapshots and init output to exact role IDs and remove actor-specific model fields.
  - [x] 8.4 Update canonical workflow/command delegation instructions to call the exact resolver contract with `maister:<role_id>`.
    - Remove host-foreign Task/subagent assumptions where the common runtime owns dispatch; retain actor/work-item/output context as bounded task input.
  - [x] 8.5 Apply only the narrowly required token-aware logical-role changes to the existing Cursor skill projector, regenerate its checked-in compatibility projection, and reject drift.
  - [x] 8.6 Run only Group 8 shell/snapshot/projection checks and make every scenario pass.

**Acceptance Criteria:**

- Project defaults, init output, every orchestrator, and every in-scope delegation call site use exact namespaced logical IDs.
- Advisor and Arbiter both resolve `maister:advisor`; model/effort come only from common execution profiles.
- Legacy actor model fields and unnamespaced/non-canonical values fail clearly and are never silently normalized.
- No init path creates, reconciles, removes, migrates, or documents Codex agent TOML files.

### Task Group 9: Gate Evaluator Integration and Clean Legacy Topology

**Dependencies:** Groups 2, 3, 7, and 8  
**Files to Modify:** `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs`, `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs`, `plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs` (only if required by the new frozen event fields), `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`, `plugins/maister/lib/distribution/materializer.mjs`, `.codex/agents/advisor.toml` (delete), `.codex/agents/arbiter.toml` (delete), `.codex/agents/luna_smoke_agent.toml` (delete by explicit recovery-gate override), `tests/gate-evaluator.test.sh`, `tests/orchestrator-state-migration.test.sh`, `tests/orchestrator-state-repository.test.sh`, `tests/advisor-workflow-snapshot.test.sh`, `tests/platform-independent/repository-topology.test.mjs`, `tests/fixtures/orchestrator-state-v2/**`, `tests/fixtures/advisor-state/canonical-advisor.yml`  
**Expected Tests:** at least 8 distinct focused scenarios plus negative topology scans  
**Estimated Steps:** 8

- [x] 9.0 Integrate exact dispatch into gate execution and remove the legacy Codex topology.
  - [x] 9.1 Write gate dispatch-plan, Advisor/Arbiter equality, distinct-identity, durable-result, retry/arbitration, and negative-topology tests first.
  - [x] 9.2 Replace callback-specific `{agent, model}` invocation with the common resolver/dispatcher plan.
    - The evaluator supplies actor, gate context, work item, idempotency context, output schema, and bounded task; it does not select model or host representation.
  - [x] 9.3 Keep role identity and decision identity separate in gate state.
    - Both actors record `maister:advisor`; each keeps distinct actor/attempt/idempotency/dispatch fields and existing one-arbiter/retry semantics.
  - [x] 9.4 Persist only validated durable terminal dispatch results before gate decisions advance; preserve user/denylist/implementation-approval safety rules.
  - [x] 9.5 Delete exactly `.codex/agents/advisor.toml`, `.codex/agents/arbiter.toml`, and user-authorized `.codex/agents/luna_smoke_agent.toml`; remove materializer/init references to the tracked legacy lifecycle.
    - Preserve every other `.codex/agents/*`; add no runtime cleanup or migration logic.
  - [x] 9.6 Add repository topology rejection for TOML profiles, special Advisor branches, legacy reconciliation, and compatibility flags.
  - [x] 9.7 Run only Group 9 gate/state/topology tests and make every scenario pass.

**Acceptance Criteria:**

- Gate evaluator dispatches both Advisor and Arbiter through the same exact manifest row/profile/adapter path while keeping decision actors and attempts distinct.
- A dispatch/event/validation failure cannot be recorded as an approved gate result or silently run inline.
- The three explicitly named TOML files are absent, active legacy lifecycle references are absent, and every other user file is untouched.
- Negative topology tests reject Advisor-only permissions, model, destination, adapter, evidence, or compatibility behavior.

### Task Group 10: Correct E5/E6 Discovery and Invocation Evidence

**Dependencies:** Groups 4, 7, and 9  
**Files to Modify:** `plugins/maister/lib/distribution/evidence-schema.mjs`, `plugins/maister/lib/distribution/evidence-policy.mjs`, `plugins/maister/lib/distribution/host-probes/base.mjs`, `plugins/maister/lib/distribution/host-probes/{codex,cursor,kiro-cli,index}.mjs`, `plugins/maister/lib/distribution/host-probes/scenarios/{codex,cursor,kiro-cli}.mjs` (new), `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`, `plugins/maister/agent-projection-v1.json`, `tests/platform-independent/evidence-parity-topology.test.mjs`, `tests/fixtures/platform-independent/evidence/**`, `tests/fixtures/platform-independent/host-probes/**` (new)  
**Expected Tests:** at least 14 distinct focused scenarios across passed/failed/unavailable/freshness boundaries  
**Estimated Steps:** 8

- [x] 10.0 Correct native discovery and exact-invocation evidence after production adapters exist.
  - [x] 10.1 Write target-specific E5/E6, outcome, freshness, wrong-identity, timeout, and no-version-only-pass tests first.
  - [x] 10.2 Bind evidence provenance/freshness to source, overlay, host, scenario, schema/projector, canonical-set, manifest, and projected-tree state.
  - [x] 10.3 Implement target-specific E5 subjects.
    - Codex proves `codex.exec`, authentication, allowed version, and every required control; it does not claim 28 native IDs.
    - Cursor/Kiro observe and compare the exact manifest-declared native ID inventory and collisions/shadows.
  - [x] 10.4 Implement versioned E6 scenarios for at least two behaviorally distinguishable ordinary roles plus ordinary `advisor`.
    - Validate logical/native identity, distinct prompts/nonces/schemas, canonical/manifest/projection digests, role-specific behavior, dispatch/session identity, and effective execution policy.
  - [x] 10.5 Classify missing executable/auth/safe adapter/scenario/observable identity as `unavailable`; classify observed wrong/missing identity, digest mismatch, started-scenario timeout, or wrong behavior as `failed`.
  - [x] 10.6 Update capability policy so structural success cannot satisfy E5/E6 or native support, while explicit provisional packaging remains policy-bounded.
  - [x] 10.7 Run only `evidence-parity-topology.test.mjs` and Group 10 probe fixtures and make every scenario pass.

**Acceptance Criteria:**

- `--version` success alone can never produce passed E5/E6 evidence.
- Codex E5 proves the managed process control surface; Cursor/Kiro E5 prove exact native inventory.
- E6 differentiates two ordinary roles and Advisor, binds runtime observations to current projection state, and rejects implicit/inherited/wrong-role execution.
- Freshness changes expire prior evidence; `unavailable` stays distinct from `failed` and never becomes native support.

### Task Group 11: Release, Documentation, and Cross-Feature Verification

**Dependencies:** Groups 1-10  
**Files to Modify:** `Makefile`, `.github/workflows/validate-generated-variants.yml`, `.github/workflows/cursor-cli-smoke.yml`, `.github/workflows/release.yml`, `plugins/maister/bin/release-interface.mjs`, `plugins/maister/bin/release-metadata.mjs`, `plugins/maister/bin/parity-release.mjs`, `plugins/maister/bin/shadow-parity.mjs`, `plugins/maister/overlays/{codex,cursor,kiro-cli}/{inventory.yml,parity-baseline.json}`, `plugins/maister/overlays/codex/overlay.yml` *(recovery expansion 1)*, `plugins/maister/overlays/{cursor,kiro-cli}/overlay.yml` *(recovery expansion 2)*, `tests/platform-independent/{make-interface,parity-release,release-package,repository-topology}.test.mjs`, `tests/fixtures/platform-independent/parity-oracle/manifest.json`, `tests/fixtures/platform-independent/source-repos/basic/overlay.yml` *(recovery expansion 1)*, `README.md`, `docs/{README.md,commands.md,workflows.md}`, `.maister/docs/project/{vision,roadmap,tech-stack,architecture}.md`, `.maister/docs/standards/global/{build-pipeline,conventions,error-handling,validation}.md`, `.maister/docs/standards/testing/test-writing.md`  
**Expected Tests:** at least 10 additional integration/release scenarios if not already covered; no fixed maximum  
**Estimated Steps:** 9

- [x] 11.0 Complete release/evidence gating, documentation, and final risk-based test review.
  - [x] 11.1 Write missing package/parity/topology/release-boundary tests first after reviewing all Group 1-10 tests against R1-R35.
    - Add every non-redundant critical gap found; do not impose a numeric cap or duplicate host-independent behavior.
  - [x] 11.2 Update package validation for canonical/projector/runtime closure and target isolation.
    - Include canonical sources, projection contract/projector/runtime/support assets, installed manifest/provenance, and all extracted-lifecycle dependencies.
    - Exclude checked-in Cursor/Kiro canonical behavior copies, foreign-target artifacts, and legacy Codex TOML profiles.
  - [x] 11.3 Update parity oracle/baselines only after deterministic projection, closure, multi-root lifecycle, exact dispatch, and corrected evidence tests pass.
    - Remove exceptions for missing Cursor E2E, missing Kiro prompts, Advisor TOML topology, and obsolete reconciliation; never relearn baselines from current output.
  - [x] 11.4 Wire projector checks, target materializer/install tests, evidence, topology, strict parity, deterministic packaging, and extracted multi-root lifecycle into Make and CI in dependency order.
  - [x] 11.5 Update operator, workflow, architecture, build, testing, and release documentation.
    - Cover exact logical IDs, target destinations, managed-root ownership, support roles, staged-vs-committed generation, managed Codex workers, evidence semantics, clean-install/v1 rejection, cooperative concurrency, and code-7 recovery.
  - [x] 11.6 Run focused cross-feature verification and record a requirement-to-test inventory for all 35 requirements and 15 success criteria.
  - [x] 11.7 Run `make test-core`, target overlay/materializer/install checks, `make test-evidence`, `make test-topology`, strict `make test-parity-release`, and `make validate`.
  - [x] 11.8 Generate one fresh E3 attestation, build each target twice from fixed inputs, compare hashes, inspect sidecars, and run clean extracted install/verify/uninstall across every managed root; target E5/E6 may remain explicitly `unavailable` but may not be reported as passed support.

**Acceptance Criteria:**

- Every R1-R35 requirement and success criterion maps to at least one passing, behavior-focused assertion.
- All three target packages are deterministic, isolated, self-contained, projection-complete, reference-closed, and cleanly lifecycle-tested across declared roots.
- Strict parity/topology reports zero unresolved semantic, inventory, reference, permission, symlink, or legacy-topology differences.
- Documentation and release claims distinguish packaged, discovered, invoked, unavailable, and failed states accurately.
- No native-support claim is published without current passing policy-required E5/E6 evidence.

## Execution Order and Safe Serialization

| Wave | Groups | Parallelism and serialization rule |
|---|---|---|
| 1 | Group 1 | Single writer freezes role/manifest/overlay contract. |
| 2 | Groups 2 and 5 | Safe in parallel: Group 2 owns distribution projection/overlays; Group 5 owns new execution-event files/tests. |
| 3 | Group 3 | Serialized after Group 2 because both own materializer projection fixtures/contracts. |
| 4 | Group 4 | Single atomic lifecycle group; no Kiro root/schema/lifecycle sub-work may be split across agents. |
| 5 | Group 6 | Serialized after receipt/projection/event contracts stabilize. |
| 6 | Groups 7 and 8 | Safe in parallel after Group 6: adapters/runtime files versus workflow/configuration files. Shared `agent-projection-v1.json` is owned by Group 7 in this wave; Group 8 must not edit it. |
| 7 | Group 9 | Serialized after both adapters and exact configuration; owns gate/state shared files and legacy deletion. |
| 8 | Group 10 | Evidence runs only after production adapters, Kiro lifecycle, and gate integration exist. |
| 9 | Group 11 | Sole writer for parity baselines, release wiring, support claims, docs, and final verification. |

Additional serialization rules:

- `agent-projection-v1.json` and the three `overlay.yml` files serialize Groups 1 → 2 → 7.
- `materializer.mjs` serializes Groups 3 → 9; Group 9 only removes obsolete legacy topology references after the new projection path is green.
- `orchestrator-state-schema.mjs` serializes Groups 8 → 9; configuration shape lands before gate execution records change.
- `repository-topology.test.mjs` serializes Groups 9 → 11; legacy removal lands before final package/topology expansion.
- Parity baselines, the parity oracle, Make, CI release wiring, and release documentation have exactly one writer: Group 11.
- All tests write only to isolated temporary homes/task roots. Live native probes run only with an explicitly safe configured scenario; otherwise they record `unavailable`.
- Any workspace-writing Codex worker against this checkout is serialized regardless of task-group parallelism; read-only concurrency requires an explicit validated profile.

## Standards Compliance

Follow the project contracts indexed by `.maister/docs/INDEX.md`:

- `project/vision.md`, `project/architecture.md`, `project/tech-stack.md`, and `project/roadmap.md` — preserve one canonical owner, deterministic target adapters, transaction safety, explicit evidence, and target-aware release shape.
- `standards/global/build-pipeline.md` — keep canonical edits under `plugins/maister/`, use explicit target checks, maintain clean strict parity, and prove extracted deterministic packages before release.
- `standards/global/coding-style.md` and `commenting.md` — use descriptive role/root/digest names, focused functions, no dead compatibility paths, and comments only for non-obvious transaction/runtime constraints.
- `standards/global/conventions.md` — keep dependencies minimal, support claims evidence-backed, release output isolated, and concurrency boundaries accurate.
- `standards/global/error-handling.md` — fail early with typed actionable outcomes, preserve code-7 diagnostics, clean up process resources, and never install unpinned native prerequisites.
- `standards/global/minimal-implementation.md` — add only immediately used parser, projector, root, resolver, event, adapter, probe, and release seams; no migration framework, workflow DSL, future host, native Codex-agent, or worktree orchestration stubs.
- `standards/global/validation.md` — enforce closed schemas, containment, collision safety, digest freshness, mutation-boundary identity checks, and extracted artifact closure.
- `standards/testing/test-writing.md` — use risk-based non-redundant coverage, parameterize real host seams, and prove byte-exact rejection/recovery rather than exit codes alone.

## Notes

- Test-first is mandatory for every group; the obsolete fixed `2-8` per-group ceiling and total maximum do not apply.
- Group-local verification runs only new/directly affected tests; broad suites and release evidence run last in Group 11.
- The plan introduces no UI work, mockups, screenshots, `Visual References`, or visual-coverage artifact.
- The executor must mark both Markdown checkboxes and matching HTML `data-group`/`data-step` markers as work completes.
- Source implementation must not begin by deleting unrelated worktree content. Only files explicitly declared in the active group are writable.
