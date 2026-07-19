# Requirements: Unified Agent Projections

## TL;DR

Maister must derive every supported-host representation from the same 28 canonical Markdown agents, install those representations through the existing validated transaction boundary, resolve logical roles exactly, and produce auditable discovery and invocation evidence. Codex, Cursor, and Kiro CLI are one delivery scope. Advisor follows the identical manifest, resolver, adapter, and evidence path as every ordinary role. The work is a clean-install cutover: legacy Codex TOML profiles and behavior-bearing host copies are removed without migration compatibility.

## Key Decisions

- The 28 files in `plugins/maister/agents/*.md` remain the sole canonical behavior owners.
- Host representations are deterministic, versioned projections created inside materialization staging before enumeration, validation, hashing, and provenance finalization.
- Runtime role selection is exact and fail closed; no aliases, fuzzy matching, built-in fallback, inline fallback, or default-role fallback are allowed.
- Kiro native agent leaves are receipt-owned through one multi-root transaction while unrelated user agents remain untouched.
- Execution records are append-only workflow records and are not installation receipts.
- E5 proves the manifest-declared discovery subject: Codex's managed `codex.exec` adapter/control surface or Cursor/Kiro native identities. E6 proves exact invocation and observed logical/native identity. Missing prerequisites are `unavailable`, while wrong behavior, policy, or identity is `failed`.
- Codex roles that require per-agent model control execute as managed `codex exec` workers with pinned model, effort, sandbox, structured output, and durable process evidence; native custom-agent selection is not part of the current contract.
- `advisor`, `maister`, and `explore` do not receive exceptions: Advisor is one of the 28 canonical roles, while `maister` and `explore` remain explicitly separate support roles.

## Open Questions / Risks

- Codex `exec` controls, Cursor identity precedence, and Kiro observable dispatch identity vary by host version. The implementation must version probes and refuse unsupported required controls rather than simulating success.
- Multi-root Kiro receipt, journal, recovery, drift, update, verify, uninstall, and status behavior must ship together; partial lifecycle support risks data loss.
- Existing parity baselines and evidence may currently bless incomplete or misleading host behavior and must be renewed only after the new gates pass.

## Initial Description

How should Maister transform, install, discover, and invoke all canonical agents consistently on Codex, Cursor, and Kiro CLI when `maister-advisor` follows the same rules as every other agent?

## Confirmed Requirements Q&A

1. **User journey and personas**
   - Assumption: primary users are Maister maintainers, installers, and workflow operators. Workflows select exact logical role IDs transparently, while installation and evidence expose clear typed outcomes.
   - Answer: confirmed.

2. **Existing code reuse**
   - Assumption: extend the existing materializer, transaction, receipt, recovery, overlay, gate, and evidence patterns instead of creating parallel lifecycle implementations.
   - Answer: confirmed.

3. **Visual assets**
   - Assumption: this is non-UI work and has no mockups, wireframes, screenshots, or other visual assets.
   - Answer: confirmed.

4. **Compatibility boundary**
   - Assumption: clean-install scope excludes v1 receipt migration and legacy Codex TOML compatibility; obsolete persisted state must fail clearly instead of being silently interpreted or migrated.
   - Answer: confirmed.

5. **Evidence semantics**
   - Assumption: E5/E6 report `unavailable` when native prerequisites are absent and `failed` when discovery or observed identity is wrong.
   - Answer: confirmed.

6. **Execution-record ownership**
   - Assumption: runtime execution records are append-only per workflow and separate from immutable installation receipts.
   - Answer: confirmed.

7. **Support-agent boundary**
   - Assumption: support agents such as `maister` and `explore` remain outside the 28 canonical roles and live under explicit support ownership.
   - Answer: confirmed.

8. **Delivery scope**
   - Assumption: Codex, Cursor, and Kiro CLI ship as one dependency-ordered implementation scope; the project must not claim support for a host until its required evidence passes.
   - Answer: confirmed.

## User Journeys

### Maintainer defines or changes a role

1. Maintainer edits one canonical Markdown role.
2. Strict parsing validates identity, metadata, dependencies, and normalized uniqueness.
3. The manifest and canonical-set digest change deterministically.
4. Each selected target projects the role inside isolated staging using only declared transforms and profiles.
5. Validation proves canonical bijection, support separation, prompt/reference closure, destination safety, and deterministic bytes before any target mutation.

### Installer installs or updates a target

1. Installer materializes a target from immutable source into staging.
2. Projection outputs participate in normal hashing and provenance.
3. One journal covers every managed root and ownership policy.
4. Kiro writes only computed, receipt-owned native agent leaves; unrelated files remain byte-identical.
5. On any failure, recovery restores files, modes, symlinks, existence, topology, settings, receipts, and journals exactly.

### Workflow invokes a role

1. A workflow requests exact `maister:<role_id>` identity.
2. Resolver finds exactly one manifest row and validates the active receipt, projection, digests, collisions, adapter, and model controls.
3. Codex starts a managed `codex exec` worker with the canonical prompt, bounded task, pinned execution policy, and validated output contract; Cursor and Kiro receive exact native external identities.
4. Any ambiguity or unavailable required capability fails before host invocation.
5. The adapter records requested and observed role identity, projection bindings, host/version, attempts, and terminal outcome.

### Operator verifies host support

1. Structural projection/materialization validation proves deterministic installed topology.
2. E5 observes the exact target discovery subject: Codex `codex.exec` controls or Cursor/Kiro native external IDs; executable/version availability alone is insufficient.
3. E6 invokes at least two distinguishable ordinary roles plus `advisor` and checks logical/native role identity, execution policy, session/dispatch identity, nonces, and digests as applicable.
4. Missing runtime, authentication, safe scenario, or observable identity yields `unavailable`; an incorrect observed result yields `failed`.

## Similar Features and Reusable Patterns

- `plugins/maister/lib/distribution/materializer.mjs`: immutable-source revalidation, sorted assembly, isolated staging, syntax/reference validation, hashing, and provenance seams.
- `plugins/maister/lib/distribution/transaction-manager.mjs`: staged replacement, drift refusal, receipts, journals, and exact failure boundaries.
- `plugins/maister/lib/distribution/recovery.mjs`: byte/mode/symlink/topology snapshots and idempotent recovery.
- `plugins/maister/lib/distribution/receipt-schema.mjs` and `journal-schema.mjs`: strict persisted schemas with unknown-field rejection.
- `plugins/maister/lib/distribution/hash-tree.mjs` and `provenance.mjs`: deterministic hashes and canonical JSON.
- `plugins/maister/lib/distribution/cursor-skill-projector.mjs`: sorted inputs, explicit transforms, source fingerprints, and drift checking; reuse these patterns but not its checkout-writing lifecycle or blanket role-ID rewrites.
- `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs`: strict attempt records, idempotency, frozen invocation context, and injected ports; do not reuse its decision-instance logical identity as canonical role identity.
- Existing platform-independent materializer, installer-transaction, evidence, release-package, and topology suites provide the required negative-test and injected-failure patterns.

## Functional Requirements

### Canonical role domain

- Parse exactly 28 canonical Markdown agents into a strict versioned IR.
- Require filename stem, frontmatter `name`, and logical role ID to agree.
- Reject malformed or unknown metadata, duplicate IDs, case-folded or normalized collisions, unsafe dependencies, and missing behavior bodies.
- Generate or validate a sorted manifest with canonical source digests, presentation metadata, model requirements, skill dependencies, host representations, external IDs, named transforms, and tools profiles.
- Keep support agents in a separate manifest section; they cannot satisfy canonical completeness.

### Deterministic projection

- Run target projectors after normal assembly and immutable-source validation but before staging enumeration, content validation, hashing, and provenance finalization.
- Emit stable UTF-8/newline/JSON formatting, paths, modes, ordering, and hashes.
- Permit semantic changes only through named, allowlisted, fixture-tested transforms.
- Never write generated agent projections into the source checkout or generate them during role invocation.
- Bind schema/projector version, canonical-set digest, manifest digest, and projected-tree digest into provenance and receipts.

### Host representations

- Codex uses all 28 installed canonical prompts through separately managed `codex exec` workers. Each manifest row resolves a versioned execution profile containing model, reasoning effort, sandbox, timeout, output schema, and concurrency class; it has no special Advisor or Arbiter TOML representation.
- Cursor receives all 28 deterministic native Markdown agents with exact `maister-<role_id>` identities; `explore` remains support inventory.
- Kiro receives all 28 native descriptor/prompt pairs with closed references and exact identities under the native agent leaf root; `maister` and `explore` remain support inventory with explicit prompt ownership.
- Host tools/permissions profiles are declared and validated without role-name special cases.
- Read-only Codex workers may execute concurrently; workspace-writing workers sharing one checkout execute serially until isolated worktree ownership is separately designed.

### Transaction and ownership

- Version receipt and journal schemas around stable managed-root IDs and `whole_tree | leaf_set` ownership policies.
- Inventory identity is `(root_id, safe relative path)`.
- Treat all managed roots as one logical transaction for snapshot, mutation, verification, publication, rollback, recovery, update, uninstall, drift detection, and status.
- Reject unmanaged collisions before mutation, even when bytes match.
- Remove stale managed leaves only when the previous receipt owns them and installed bytes still match.
- Preserve unrelated Kiro agent leaves across every lifecycle and injected failure.

### Exact resolver and adapters

- Accept only exact `maister:<role_id>` grammar and require one manifest match.
- Validate active receipt, installed manifest/projection digests, external collisions, adapter availability, and required model controls before invocation.
- Return typed failures for unknown, ambiguous, missing, stale, mismatched, collided, unavailable, or unsupported roles.
- Prohibit fuzzy matching, aliases, built-in/default roles, inline execution, root-agent fallback, and natural-language fallback.
- Route `advisor` through the same resolver and adapter code path as ordinary roles.
- Require gate configuration to store exact IDs; both `advisor_agent` and `arbiter_agent` default to `maister:advisor`, while decision-actor identity remains separate. Remove and reject legacy actor-specific model fields and unnamespaced/non-canonical values.

### Execution records

- Persist one locked, hash-chained, append-only JSONL event stream per dispatch, separate from installation receipts, with `dispatch_started`, attempt lifecycle, and exactly one terminal event.
- Bind workflow/work item, logical role, canonical/manifest/projection digests, adapter and optional native ID, host/version, dispatch/idempotency ID, requested/effective execution policy, attempts, observed identity, timestamps, and terminal result. Fsync each canonical event before the next side effect and fail closed on recording failure.
- Do not overload gate-decision instance identity as canonical role identity.

### Evidence, release, and topology

- Make Codex E5 validate the exact `codex.exec` adapter/control surface and Cursor/Kiro E5 validate native discovery of exact expected external IDs.
- Make E6 exact-invoke at least two distinguishable ordinary roles plus Advisor and validate observed identity, execution policy, nonce, session/dispatch, and digests.
- Keep `passed`, `failed`, and `unavailable` semantically distinct.
- Gate release on deterministic all-host projections, normalized canonical/support parity, closed references, multi-root extracted lifecycle, correct evidence, and absence of forbidden legacy topology.
- Package canonical sources, manifest inputs, and projector logic—not checked-in generated behavior copies.

## Reusability Opportunities

- Centralize normalized identity and path collision checks so parser, projector, resolver, and topology validation share one grammar.
- Generalize the transaction root registry once and route every lifecycle consumer through it.
- Share a normalized `DispatchPlan` and terminal execution-result schema across host adapters.
- Share scenario freshness/provenance binding across E5 and E6 without conflating their evidence meanings.
- Express target differences as small named transforms or tools profiles rather than duplicated behavior files.

## Scope Boundaries

### In scope

- Canonical role parser/IR/manifest and strict validation.
- Deterministic Codex prompt/execution-policy, Cursor native-agent, and Kiro descriptor/prompt projections inside staging.
- Projection provenance and receipt binding.
- Multi-root transaction lifecycle and Kiro leaf ownership.
- Exact resolver, host adapters/ports, execution records, and workflow bindings.
- Accurate E5/E6 probes, negative proofs, release gates, CI, and documentation.
- Direct removal of both tracked legacy Codex TOML profiles, including the user-authorized dirty Advisor edit, during implementation.
- Removal of active Advisor/Arbiter reconciliation, tests, documentation, special permissions, and host branches.

### Out of scope

- Migration or backward compatibility for legacy Codex TOML profiles or v1 receipts.
- Treating support agents as canonical roles.
- Runtime generation of projections or mutation of the source checkout.
- UI changes or visual design work.
- Pretending unavailable host-native capabilities are supported.
- Native Codex custom-agent dispatch, multi-agent V1/V2 selection, and app-server orchestration until a separate documented and passing capability contract exists.
- Parallel workspace-writing Codex workers without isolated worktree ownership and merge semantics.
- Unrelated removal of the existing Cursor skill-projection migration exception except where token-aware logical role handling requires a targeted change.

## Technical Considerations and Acceptance Boundaries

- Parser/projection errors must happen before target mutation.
- Multi-root mutations must retain the current project's drift refusal, durable journal, cryptographic snapshot, and exact recovery guarantees.
- Advisor equality must be enforced through negative topology and branch tests, not only documentation.
- Structural parity, discovery evidence, and invocation evidence are independent gates.
- Clean-install schemas may reject legacy state but must do so with explicit typed errors and no partial mutation.
- Tests must use the real 28-role inventory in addition to small fixtures.
- Documentation must distinguish prohibited checked-in generated agent trees from valid ephemeral projections inside transaction staging.
