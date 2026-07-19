# Specification: Unified Agent Projections and Exact Invocation

## TL;DR

Maister will derive every supported-host agent representation from the same 28 canonical Markdown roles and materialize those projections inside the existing validated transaction boundary.
Workflows will select exact `maister:<role_id>` identities through a fail-closed resolver; Codex runs managed `codex exec` worker processes with enforceable per-role model, reasoning, sandbox, prompt, and output contracts, while Cursor and Kiro use deterministic native projections.
Kiro native agent leaves will participate in one multi-root, receipt-owned lifecycle that preserves unrelated user agents.
Advisor follows the same parser, manifest, projection, resolver, adapter, and evidence contracts as every ordinary role; legacy Codex TOML topology is removed without migration compatibility.

## Key Decisions

- **One behavior owner** — the 28 files in `plugins/maister/agents/*.md` are the sole canonical role definitions; host artifacts are projections, never independently maintained prompt copies.
- **Strict, versioned role contract** — canonical Markdown is parsed into a sorted role IR and projection manifest that enforces exact identity, normalized uniqueness, support-role separation, and digest bindings.
- **Projection inside staging** — host artifacts are generated after immutable source resolution and normal assembly, but before staging enumeration, validation, hashing, provenance finalization, and target mutation.
- **Host-specific execution, common semantics** — Codex uses managed `codex exec` workers, Cursor uses generated Markdown agents, and Kiro uses generated descriptor/prompt pairs in its native agent root.
- **Exact dispatch with no fallback** — only exact `maister:<role_id>` requests are accepted; ambiguity, missing state, unsupported controls, collisions, or digest mismatches stop before host invocation.
- **Narrow multi-root ownership** — Kiro adds a receipt-owned `leaf_set` under its shared native agent root while the existing private installation root remains managed as a whole tree.
- **Advisor equality** — `advisor` has no special TOML, readonly, sandbox, destination, permissions, model, adapter, evidence, or lifecycle branch.
- **Independent proof layers** — structural materialization, native discovery (E5), and exact invocation (E6) remain separate; missing prerequisites are `unavailable`, while observed incorrect behavior is `failed`.

## Open Questions / Risks

- Codex process workers require an authenticated CLI whose `exec` surface exposes the pinned model, reasoning-effort, sandbox, working-root, JSONL, output-schema, and last-message controls. A missing or changed control surface is `unavailable`; silent inheritance or flag removal is prohibited.
- Cursor does not provide a stable, universal precedence guarantee for plugin agents versus colliding user or project agents. Unmanaged external-ID collisions remain blocking until a versioned probe proves safe behavior.
- Kiro exact-name delegation and observed dispatch identity depend on the native host version. Textual routing or descriptor presence alone cannot satisfy E6.
- Multi-root Kiro ownership is the highest safety risk: receipt, journal, snapshot, commit, drift, verify, recovery, update, uninstall, rollback, and status must understand the same root registry before the native destination is enabled.
- Existing E5 records may overstate support because the current producer treats a successful `--version` command as discovery. Existing baselines must not be renewed until corrected scenarios pass.
- Clean-install compatibility is intentional: v1 receipts and legacy Codex TOML installations are rejected clearly rather than interpreted, migrated, backed up, or repaired.
- Target E5/E6 may legitimately remain `unavailable` in development and release environments without a runtime, authentication, safe scenario, required control surface, or observable identity; structural success must not be presented as operational support.

## Goal

Provide one deterministic, auditable agent-delivery and invocation contract across Codex, Cursor, and Kiro CLI so every canonical role—including Advisor—is transformed, installed, resolved, invoked, and evidenced consistently without weakening existing provenance or byte-exact transaction guarantees.

## User Stories

### Maintainer

As a Maister maintainer, I want to edit one canonical Markdown role and have every selected host representation derived deterministically, so behavior cannot drift between hosts.

As a Maister maintainer, I want canonical and support roles validated separately, so a helper such as `explore` cannot hide a missing canonical role.

As a release maintainer, I want projection schema versions and digests bound into package and receipt provenance, so I can reproduce and audit the exact role bytes delivered to each host.

### Installer and operator

As an installer, I want projection errors, collisions, and unsafe references rejected before target mutation, so an invalid role set cannot leave a partial installation.

As a Kiro operator, I want Maister to manage only its computed native agent leaves, so my unrelated agents remain byte-identical across install, update, rollback, recovery, and uninstall.

As an operator, I want obsolete receipts or unsupported host prerequisites reported with specific outcomes, so I know whether the installation is invalid, the runtime is unavailable, or observed behavior is wrong.

### Workflow operator

As a workflow operator, I want each logical `maister:<role_id>` request to resolve to exactly one verified host representation, so the requested role executes or the workflow fails before dispatch.

As a workflow operator, I want Advisor to use the same role path and execution record as every other canonical role, so gate decisions do not depend on an untracked special host profile.

As an auditor, I want append-only execution records that bind requested and observed identity to source and projection digests, so installation evidence and runtime evidence are not conflated.

## Core Requirements

Priorities use **P0** for correctness or safety gates required before support can be claimed and **P1** for required operator and maintainability behavior that completes the delivery contract.

### Canonical role domain

1. **R1 — Canonical inventory (P0):** The system shall treat exactly the 28 Markdown files in `plugins/maister/agents/*.md` as canonical roles. Adding or removing a canonical role is outside this task and shall fail the expected-inventory gate until explicitly revised.
2. **R2 — Strict role parsing (P0):** Each canonical file shall parse into a versioned IR only when filename stem, frontmatter `name`, and logical `role_id` are equal; the behavior body is non-empty; and all accepted metadata is well-formed.
3. **R3 — Identity and metadata rejection (P0):** Parsing shall reject unknown metadata, duplicate IDs, case-folded or normalized collisions, unsafe or missing skill dependencies, unsafe paths, malformed frontmatter, and missing behavior bodies with typed errors and no projection output.
4. **R4 — Versioned projection manifest (P0):** A sorted manifest shall bind each canonical role to its source digest, presentation metadata, skill dependencies, named transforms, tools profile, and target execution policy. Identity fields shall be distinct: exact `logical_role_id`, target `adapter_id`, and nullable `native_role_external_id`. Codex rows use `adapter_id: codex.exec` and `native_role_external_id: null`; Cursor and Kiro rows use their exact native IDs. The manifest shall expose its schema and projector versions and a deterministic digest.
5. **R5 — Support-role separation (P0):** Support agents such as Cursor `explore` and Kiro `maister`/`explore` shall live in an explicit support inventory and shall never count toward, replace, or inherit canonical 28/28 completeness.
6. **R6 — Advisor equality invariant (P0):** `advisor` shall be an ordinary canonical row. Both gate actors resolve exact `maister:advisor` through the common resolver and execution-policy path; actor identity remains separate from role identity. Validation shall reject any Advisor-only TOML representation, readonly or sandbox field, destination, permissions profile, model lifecycle, adapter branch, evidence bypass, or compatibility exception.

### Deterministic projection and provenance

7. **R7 — Materializer insertion boundary (P0):** Target projection shall run only within the isolated materializer staging tree, after immutable source revalidation and normal assembly establish trusted inputs and before staging enumeration, syntax/reference validation, content hashing, and provenance finalization.
8. **R8 — Deterministic output (P0):** Identical source commit, target, manifest, overlay, schema, and projector version shall yield identical normalized paths, UTF-8 bytes, newline policy, JSON formatting, modes, ordering, per-output hashes, and projected-tree digest.
9. **R9 — Declared semantic transforms (P0):** A host projection may change canonical semantics only through a named, versioned, allowlisted transform with fixture coverage. Undeclared transformations and hand-maintained behavior-bearing copies shall fail validation.
10. **R10 — No source or invocation-time generation (P0):** Projection shall never mutate the source checkout, write committed generated behavior trees, or generate host files during role invocation.
11. **R11 — Projection completeness and closure (P0):** Validation shall prove a bijection between 28 canonical rows and each target representation, report support roles separately, enforce destination/case-fold collision safety, and require all internal references—especially every Kiro descriptor-to-prompt URI—to resolve in the candidate tree.
12. **R12 — Projection provenance (P0):** Materialization provenance and the active receipt shall bind schema version, projector version, canonical-set digest, manifest digest, and projected-tree digest. Installed verification and runtime resolution shall reject stale or mismatched bindings.

### Host representations

13. **R13 — Codex representation and worker contract (P0):** Codex shall package all 28 canonical prompts and invoke a selected role as a separately managed `codex exec` process. The adapter shall pass the complete canonical prompt and bounded task on stdin; use `--ignore-user-config` for deterministic execution defaults while retaining normal authentication; pin `-C`, `-m`, `model_reasoning_effort`, and `--sandbox`; require `--json`, `--output-schema`, and `--output-last-message`; and validate the final result before accepting it. No `.codex/agents/*.toml`, native `spawn_agent`, special Advisor/Arbiter profile, built-in-agent lookup, prompt truncation, or inherited user model policy is permitted. Read-only workers may run concurrently; workspace-writing workers targeting one checkout run serially until isolated-worktree ownership is separately specified.
14. **R14 — Cursor representation (P0):** Cursor shall receive 28 deterministic native Markdown agents whose external identities are exactly `maister-<role_id>`. The projection shall include `e2e-test-verifier`, remove behavior drift and Advisor-only metadata, and retain `explore` only as explicit support inventory.
15. **R15 — Kiro representation (P0):** Kiro shall receive 28 native `maister-<role_id>` descriptor/prompt pairs under its supported native agent leaf root, with relative prompt references closed against the installed descriptor location. Kiro `maister` and `explore` remain separately owned support agents with explicit prompt ownership.
16. **R16 — Execution, tools, and permissions profiles (P0):** Host tools, permissions, model, reasoning effort, timeout, output schema, and concurrency class shall be declared and validated through common target execution profiles referenced by manifest rows. Role-name conditionals, including conditions for `advisor`, are prohibited. A required Codex model or effort may never degrade to inheritance.

### Multi-root transaction and ownership

17. **R17 — Managed-root contract (P0):** Versioned receipt and journal schemas shall declare stable managed-root IDs and an ownership policy of `whole_tree` or `leaf_set`. Inventory identity shall be the pair of root ID and a normalized safe relative path, never an uncontrolled absolute path.
18. **R18 — One logical transaction (P0):** All declared roots shall participate in one target lock and durable journal covering preflight, snapshot, mutation, integrity verification, receipt publication, rollback, recovery, update, uninstall, drift detection, verify, and status.
19. **R19 — Narrow Kiro ownership (P0):** The Kiro native root shall own only the computed, receipt-listed Maister leaf set. Unrelated user files and directories under `~/.kiro/agents` shall remain outside ownership and byte-identical throughout every lifecycle and injected-failure path.
20. **R20 — Collision and stale-leaf rules (P0):** An unmanaged destination collision shall fail before mutation even when bytes happen to match. Update or uninstall may remove a stale managed leaf only when the previous receipt owns it and its installed bytes, mode, type, and link target still match the receipt.
21. **R21 — Exact recovery (P0):** Failure after any mutation shall restore every managed root, setting, active receipt, and journaled state to the exact prior bytes, modes, symlinks, existence, and directory topology. An unresolved recovery shall preserve diagnostic state and use the existing code-7 semantics.
22. **R22 — Cooperative concurrency boundary (P1):** Root mutation shall retain path-identity revalidation and drift refusal. Documentation shall state that Maister's lock coordinates Maister lifecycle processes only and requires host/editor/synchronization writers to be quiescent; it shall not claim atomicity against arbitrary same-user or privileged writers.

### Exact resolution, adapters, and runtime records

23. **R23 — Exact logical grammar (P0):** Runtime selection shall accept only the exact `maister:<role_id>` grammar and shall resolve exactly one canonical manifest row. Aliases, fuzzy or case-insensitive matching, natural-language selection, and implicit default roles are not accepted.
24. **R24 — Resolver preflight (P0):** Before dispatch, resolution shall validate the active receipt, canonical and manifest digests, installed projection digest, expected target representation, adapter ID, optional native external ID, unmanaged collisions, adapter availability, host-version contract, authentication, required CLI controls, model availability, and enforceable model/reasoning policy.
25. **R25 — Typed fail-closed outcomes (P0):** Unknown, ambiguous, duplicate, missing, stale, mismatched, collided, unavailable, unsupported-control, and wrong-observed-identity conditions shall return distinct typed failures. No condition may fall back to inline execution, the root agent, a built-in/default role, a similar name, or an alternate host representation.
26. **R26 — Common adapter result contract (P0):** Codex, Cursor, and Kiro adapters shall consume the same validated dispatch information and return a common terminal result shape while preserving the selected target mechanism. `advisor` shall use the identical resolver and target adapter path as ordinary roles.
27. **R27 — Durable execution event stream (P0):** Each dispatch shall own an immutable, versioned JSONL stream at `<task_path>/execution/agent-dispatches/<dispatch_id>.jsonl`, under a per-dispatch lock, with directory mode `0700` and file mode `0600`. Canonical events are `dispatch_started`, `attempt_started`, `attempt_completed`, and exactly one `dispatch_terminal`; each carries a zero-based monotonic sequence, nullable previous-event digest, event digest, idempotency key, workflow/work item, logical role, canonical/manifest/projection digests, adapter/native identity fields, host/version, requested and effective execution policy, timestamps, and result or error data. `event_digest` is SHA-256 over the canonical event object with `event_digest` omitted. Each append shall be lock-protected, single-line canonical JSON, flushed and fsynced before the next side effect. Duplicate idempotency keys reuse the validated stream. A write failure before spawn prevents invocation; a write failure after spawn triggers cancellation when possible and returns `execution_record_failure`, never success. Recovery validates sequence and hash-chain continuity and preserves incomplete streams for diagnosis.
28. **R28 — Identity separation (P1):** Gate-decision instance IDs, idempotency keys, dispatch IDs, and canonical role IDs shall remain distinct fields. Existing gate-attempt records may supply durability and audit patterns but shall not become the canonical role lookup key.

### Evidence, release, topology, and documentation

29. **R29 — Target-specific E5 discovery (P0):** E5 shall observe the manifest-declared discovery subject for the selected target and host version. For Codex, it shall prove adapter identity `codex.exec`, an authenticated executable, an allowed version, and the exact required `exec` controls (`-C`, `-m`, `model_reasoning_effort`, sandbox, JSONL, output schema, and last-message output); it shall not claim 28 native role IDs. For Cursor and Kiro, E5 shall observe the exact native external-ID inventory. Executable presence or `--version` alone shall never produce `passed` evidence.
30. **R30 — Exact E6 invocation (P0):** E6 shall invoke at least two behaviorally distinguishable ordinary roles plus ordinary `advisor`. Codex scenarios shall launch managed workers with distinct role-specific prompts, nonces, schemas, and requested execution policies; validate the structured `logical_role_id`, prompt/manifest digests, nonce, role-specific behavior, worker session/dispatch identity, and effective model/effort evidence; and reject implicit, inherited, or wrong-role execution. Cursor and Kiro scenarios shall additionally validate observed native role identity.
31. **R31 — Evidence outcomes and freshness (P0):** Missing executable, authentication, safe adapter, configured scenario, or observable identity shall produce `unavailable`. An observed missing/wrong ID, digest mismatch, timeout after an available scenario begins, or incorrect scenario result shall produce `failed`. Source, overlay, host, scenario, manifest, or projection changes shall expire prior evidence.
32. **R32 — Unified delivery and support claims (P0):** Codex, Cursor, and Kiro CLI shall ship as one dependency-ordered delivery scope; a target shall not be documented or released as natively supported until its required evidence passes. Release validation shall independently require deterministic projections, normalized 28/28 parity, support separation, closed references, multi-root extracted lifecycle, accurate E5/E6 records, and absence of forbidden legacy topology.
33. **R33 — Package ownership boundary (P0):** Release packages shall contain canonical sources, manifest inputs, projector logic, support assets, and everything required for deterministic extracted materialization; they shall not contain checked-in behavior-bearing Cursor/Kiro copies or legacy Codex TOML profiles.
34. **R34 — Clean-install and workflow-binding cutover (P0):** Both tracked legacy Codex TOML profiles—including the explicitly authorized dirty Advisor edit—and their init/reconciliation, tests, parity entries, documentation, and host-specific branches shall be removed during approved implementation. `advisor_agent` and `arbiter_agent` shall accept exact logical IDs and both default to `maister:advisor`; Advisor and Arbiter remain distinct gate actors and attempt streams. Legacy `advisor_model`/`arbiter_model`, unnamespaced `advisor`, and non-canonical `arbiter` configuration values shall be removed from project defaults, init output, all orchestrators, and gate-evaluator inputs and rejected with actionable typed configuration errors. Model/effort come only from the common role execution profile. No migration, backup, cleanup runtime, compatibility flag, or v1 receipt interpretation shall be added; obsolete state shall fail clearly before mutation.
35. **R35 — Operator documentation (P1):** Command, workflow, architecture, build, testing, and release documentation shall describe exact logical IDs, target destinations, support-role boundaries, ownership, evidence semantics, clean-install assumptions, and the difference between ephemeral staged projections and prohibited committed generated trees.

## Reusable Components

The scope is large, so reuse was assessed across distribution, runtime orchestration, evidence, and release boundaries rather than only the current agent asset directories.

### Existing Code to Leverage

| Existing code | Reusable capability | Required use in this feature |
|---|---|---|
| `plugins/maister/lib/distribution/materializer.mjs` | Sorted assembly planning, immutable-source revalidation, empty same-filesystem staging, syntax/reference/content validation, and candidate hashing | Insert role projection into its post-assembly/pre-enumeration seam and make projected files normal validation and provenance inputs; remove only the broad Kiro prompt-reference exemption once closure exists. |
| `plugins/maister/lib/distribution/path-safety.mjs` | Safe relative-path normalization, case-fold keys, containment checks, symlink defense, path-identity snapshots, and mutation-boundary revalidation | Apply the same grammar and race defenses to manifest destinations, managed-root entries, native leaf mutations, and execution-record paths. |
| `plugins/maister/lib/distribution/hash-tree.mjs` | Stable sorted tree inventory and SHA-256 hashing across files, directories, symlinks, and modes | Compute canonical-set and projected-tree inventories without creating an alternate hashing implementation. |
| `plugins/maister/lib/distribution/provenance.mjs` | Canonical JSON and validated source/overlay/materialized provenance bindings | Extend the established provenance payload with versioned agent-projection bindings and reuse its deterministic digest rules. |
| `plugins/maister/lib/distribution/overlay-loader.mjs` | Strict allowlisted overlay schemas, exact-field validation, target contracts, semantic bindings, inventory, and native assets | Extend the overlay contract to declare projection format, destinations, support inventory, transforms, tools profiles, and adapter capability instead of adding free-form host config. |
| `plugins/maister/lib/distribution/cursor-skill-projector.mjs` | Sorted input enumeration, explicit transform IDs, source fingerprints, deterministic writes, and check-mode drift detection | Reuse its pure-transform and fingerprint patterns for role projection; do not reuse its checkout-writing lifecycle or blanket token replacements. |
| `plugins/maister/lib/distribution/transaction-manager.mjs` | Target lock, durable journal transitions, staged commit, receipt publication, evidence binding, injected-failure seams, verify/update/uninstall/rollback/status flows | Generalize the existing lifecycle over a managed-root registry; do not create a second Kiro installer or publish a receipt until all roots verify. |
| `plugins/maister/lib/distribution/recovery.mjs` | Byte/mode/symlink/topology snapshots, exact restore, safe removal, idempotent journal recovery | Parameterize snapshot and restore by managed root while preserving the current exact rollback contract and code-7 unresolved state. |
| `plugins/maister/lib/distribution/receipt-schema.mjs` | Strict unknown-field rejection, normalized inventory validation, source/target/provenance binding, and safe receipt reads | Introduce the clean-install schema version with managed roots and projection digests; explicitly reject rather than migrate v1 receipts. |
| `plugins/maister/lib/distribution/journal-schema.mjs` | Validated state machine, legal transitions, exact step records, and receipt/journal correlation | Version the same state machine around multi-root snapshot and mutation state rather than inventing a parallel journal format. |
| `plugins/maister/lib/distribution/drift-detector.mjs` | Receipt-to-filesystem comparison for type, mode, bytes, symlink target, and managed settings | Resolve each inventory entry through its root ID and enforce the same drift refusal for stale or active generated leaves. |
| `plugins/maister/lib/distribution/settings-owner.mjs` | Narrow ownership of managed keys and atomic settings writes | Preserve the existing shared-settings boundary; agent leaf ownership must remain a separate, equally narrow filesystem policy. |
| `plugins/maister/lib/distribution/targets.mjs` and `target-paths.mjs` | Supported-target registry and target-scoped state/active-root path derivation | Evolve target definitions to declare stable managed roots, including the Kiro native leaf root, while retaining target-scoped state directories and locks. |
| `plugins/maister/lib/distribution/evidence-schema.mjs` and `evidence-policy.mjs` | Strict E1-E6 records, `passed`/`failed`/`unavailable` outcomes, freshness, and capability evaluation | Add manifest/projection bindings and corrected scenario semantics without replacing the existing evidence model. |
| `plugins/maister/lib/distribution/host-probes/base.mjs` and target probe modules | Injectable command boundary, timeout handling, host-version observation, and evidence record creation | Retain the injected native boundary but replace E5's version-only success and supply versioned target discovery/invocation scenarios. |
| `plugins/maister/skills/orchestrator-framework/bin/gate-evaluator.mjs` | Strict attempt records, frozen invocation context, idempotency, and injected role ports | Reuse the audit and port-boundary patterns while routing Advisor/Arbiter requests through canonical logical IDs; do not equate gate decision identity with role identity. |
| `tests/platform-independent/*.test.mjs`, `tests/gate-evaluator.test.sh`, and release workflows | Determinism, overlay contract, transaction failure injection, topology, parity, evidence, and extracted-package lifecycle fixtures | Extend existing behavior suites at their real seams, retaining the project's small focused test style and byte-exact negative proofs. |

### New Components Required

| Required capability | Why existing code is insufficient | Boundary |
|---|---|---|
| Canonical role IR and manifest validator | Current materialization copies trees but does not parse 28 role identities, validate role metadata/dependencies, or establish one shared host mapping and digest. | Pure canonical-source input; sorted validated role and support inventories as output. |
| Deterministic agent projector and projection validator | The Cursor skill projector handles a different artifact family and writes a compatibility projection to the checkout; existing overlay copying cannot safely derive all host role formats or prove 28/28 semantic closure. | Target + validated role manifest + staging root; deterministic host artifacts and projection provenance. |
| Managed-root registry contract | Receipts, journals, drift, recovery, and transactions currently assume one `active_root`; Kiro native discovery requires a shared leaf destination without taking ownership of the whole directory. | Stable root IDs and `whole_tree`/`leaf_set` policies consumed by every existing lifecycle operation. |
| Exact role resolver | Semantic-binding strings and injected callbacks do not verify manifest uniqueness, active receipt state, projection digests, external collisions, or model controls. | Exact logical identity + verified installed state; one immutable dispatch description or typed failure. |
| Codex worker process manager | Existing collaboration tools cannot select a custom agent or enforce a per-child model, and raw shell invocation lacks lifecycle guarantees. | Validated Codex dispatch plan in; bounded stdin, process start, JSONL capture, timeout/cancel, concurrency policy, schema-validated result, and process observations out. |
| Host adapter ports | No repository implementation manages deterministic `codex exec` workers or exact Cursor/Kiro native dispatch under a common no-fallback result contract. | Validated dispatch information and task context; process/native attempt and terminal observations only. |
| Workflow execution-event schema and writer | Installation receipts are immutable ownership records, while gate attempts represent decisions; neither provides a durable per-dispatch event stream. | Locked, hash-chained, append-only workflow events with role, policy, digest, host, attempt, and terminal fields. |
| Versioned E5/E6 scenarios | The present host probe proves only executable/version availability for E5 and has no repository-owned exact-role E6 scenario. | Target/host-version-specific adapter or native discovery plus invocation observations that feed the existing evidence schema. |

Every new component has an immediate caller in the accepted end-to-end flow. No general workflow DSL, generic code-generation framework, universal host protocol, migration framework, or future-host abstraction is required.

## Technical Approach

### Architectural boundaries

The accepted dependency direction is:

`canonical Markdown → strict role IR/manifest → staged projector/validator → materializer/provenance → managed-root transaction/receipt`

Runtime remains a separate downstream path:

`workflow logical ID → exact resolver + active receipt/projection → target adapter → append-only execution record`

The role domain must not know active filesystem paths or host invocation mechanisms. The projector must not inspect mutable installed state. The resolver must not generate files. Adapters must not bypass manifest or receipt validation. Evidence consumers must not infer discovery or invocation from structural materialization.

### Canonical identity and manifest

The parser consumes only the immutable source resolved by the existing distribution boundary. The IR preserves the complete canonical instruction body and only metadata needed by active projection or dispatch callers. Identity is deliberately narrow: lowercase canonical filename/name values define `role_id`; workflows add the `maister:` namespace; host-native identities are deterministically declared by target representation.

The manifest is the shared mapping and provenance boundary, not a second behavior source. It records canonical rows and support rows separately, declares target mappings and named transforms, and rejects unknown fields. All consumers use the same normalized identity/path collision rules so parser, projector, topology checks, resolver, and native probes cannot disagree about equivalence.

The Agent IR source schema is versioned and closed. Canonical frontmatter accepts only the following fields:

| Field | Contract |
|---|---|
| `name` | Required lowercase safe role ID; must equal filename stem. |
| `description` | Required non-empty single-line string; normalized only for newline representation, never rewritten semantically. |
| `model` | Optional logical model-profile ID; defaults to `inherit`. Raw target model slugs live in target execution profiles, not canonical behavior. |
| `color` | Optional presentation token from the versioned allowlist; omitted means no color. |
| `skills` | Optional non-empty, duplicate-free sequence of safe skill IDs. Each resolves exactly to `plugins/maister/skills/<skill-id>/SKILL.md` in the immutable source. |

Unknown frontmatter fields, body-derived pseudo-dependencies, unsafe skill IDs, missing skill files, duplicate skills, YAML aliases/tags, non-string scalars, and unsupported model/color profile IDs fail parsing. Canonical serialization uses sorted object keys, source-order-preserving skill entries after duplicate validation, UTF-8, LF, and one trailing newline. Target execution policy, adapter identity, transforms, destinations, and tools profiles are not inferred from prompt prose; they come from closed versioned overlay tables keyed by exact role ID and must cover all 28 rows.

### Projection and materialization

Normal overlay assembly first establishes trusted portable and host-support inputs inside empty staging. The role projector then emits the selected target's canonical representations into that same staging candidate. Existing staging enumeration and validators subsequently see projected outputs as ordinary files, allowing reference checks, modes, hashes, inventory, release closure, and receipt ownership to cover the exact installed bytes.

Codex retains canonical prompt resources and receives no native profile tree. Cursor receives generated Markdown native agents. Kiro receives generated descriptors and prompt leaves destined for the native agent root. Support assets remain overlay-owned inputs but are inventoried separately and must close their own references.

### Managed roots and transaction safety

The single-root lifecycle becomes a root-registry-driven lifecycle rather than a special Kiro copy path. Dedicated plugin roots use `whole_tree`; shared native roots use `leaf_set`. The journal covers all root preconditions and snapshots before the first mutation, then records commit and verification across every root before publishing the active receipt.

For a `leaf_set`, collision preflight distinguishes unmanaged entries from prior receipt-owned entries. Unmanaged collisions fail regardless of byte equality. Prior managed entries may be replaced or removed only after exact drift validation. Snapshot and restore include touched leaves plus the minimum parent topology needed to return existence and directory structure exactly, while unrelated siblings remain outside the snapshot ownership set.

### Exact runtime dispatch

Workflows request a canonical logical ID without knowing target-native filenames or invocation syntax. Resolution validates grammar and the current installation, then selects one manifest row and target representation. Required model control is part of preflight: inheritance is recorded only where the selected execution profile permits it, an enforceable override is applied only through a proven host control, and an unenforceable required override fails closed.

The Codex adapter starts a non-ephemeral managed `codex exec` worker with user config ignored for execution defaults while retaining normal authentication. It supplies the canonical role and bounded task on stdin, captures JSONL and last-message artifacts, validates the role-specific JSON Schema, records the returned session/thread identifier, and treats non-zero exit, timeout, malformed output, policy mismatch, or missing terminal event as failure. Cursor and Kiro use the exact manifest-declared native external identity. Every adapter writes the durable execution events required by R27 before and after side effects.

Gate configuration is a clean exact-ID binding. `advisor_agent` and `arbiter_agent` both default to `maister:advisor` and resolve the same canonical row; `advisor` and `arbiter` remain distinct decision actors, idempotency contexts, and attempt streams. The gate evaluator receives resolved dispatch plans rather than independent `{agent, model}` ports. Common target execution profiles select model and effort. Obsolete actor model fields or unnamespaced role values fail configuration validation and are never rewritten implicitly.

### Evidence and support status

Structural projection and transaction verification remain prerequisites but do not satisfy E5 or E6. Codex E5 observes the `codex.exec` adapter and its required control surface; Cursor and Kiro E5 enumerate or otherwise observe native identities and compare them to the expected manifest inventory. E6 scenarios invoke at least two distinguishable ordinary roles plus `advisor` and bind process/native observations to the active source/manifest/projection state.

Evidence records retain the existing result vocabulary. A prerequisite that prevents a safe observation is `unavailable`; an executed observation that contradicts the expected identity or behavior is `failed`. Strict support and release claims require the policy-defined records to pass. Provisional packaging may represent unavailable native prerequisites only where the existing release policy explicitly permits it, and never as native support.

### Clean topology cutover

Legacy Codex Advisor/Arbiter TOML files, reconciliation scripts, init instructions, special tests, parity rows, actor-model configuration, and documentation are removed as source topology during approved implementation. Project defaults, init output, every orchestrator, and the gate evaluator switch to exact logical role IDs and common execution profiles. The installer does not search for, back up, migrate, or delete historical runtime files. Persisted v1 receipt state is outside the supported clean-install contract and is rejected before mutation with an actionable error.

## Implementation Guidance

### Testing Approach

- Organize focused tests around eight behavioral boundaries: canonical IR/manifest; deterministic projection; materializer/provenance; managed-root lifecycle; host projections and support inventory; resolver/adapters/execution records; E5/E6 evidence; topology/release/documentation contracts.
- Add the minimum non-redundant focused tests required to cover every distinct behavior and failure boundary, with no fixed maximum. Group verification runs only new or directly affected tests; broader target-aware and release suites run at integration and final verification boundaries.
- Use the real 28-role inventory alongside small malformed fixtures. Avoid count-only assertions: verify exact normalized role IDs, mapping, source digests, and support separation.
- Projection tests shall compare two independent runs for paths, bytes, modes, order, and hashes; negative fixtures shall prove typed failure and zero output for metadata, identity, path, transform, collision, and reference errors.
- Transaction tests shall snapshot every affected managed root and relevant parent topology before invalid-input and injected-failure cases, then compare bytes, modes, symlinks, existence, directories, settings, receipts, journals, and unrelated Kiro agents after rollback or recovery.
- Resolver and adapter tests shall prove exact grammar, digest preflight, external collision refusal, unsupported model-control failure, no-fallback behavior, Advisor equality, and append-only terminal records.
- Evidence tests shall distinguish `passed`, `failed`, and `unavailable`, exercise freshness invalidation, and prove that version success cannot satisfy E5 or E6.
- Release verification shall build each target twice with fixed inputs, compare archives, inspect target isolation and canonical/support closure, then perform install/verify/uninstall from clean extraction across every declared root.

### Standards Compliance

- `.maister/docs/standards/global/build-pipeline.md`: canonical edits remain under `plugins/maister/`; target-specific contracts stay explicit; all three targets require reproducible validation, strict topology/parity, and extracted lifecycle checks.
- `.maister/docs/standards/global/coding-style.md`: use descriptive role/root/digest names, focused functions, shared identity helpers, no dead compatibility code, and no duplicated host behavior.
- `.maister/docs/standards/global/commenting.md`: prefer explicit contracts and types; comments explain only non-obvious transaction, evidence, or host constraints and never serve as change logs.
- `.maister/docs/standards/global/conventions.md`: keep dependencies minimal, document only proven host support, preserve clean release inputs, and state the cooperative concurrency boundary accurately.
- `.maister/docs/standards/global/error-handling.md`: validate early, use actionable typed errors, preserve journals and backups for code-7 outcomes, and never install unpinned native prerequisites during evidence collection.
- `.maister/docs/standards/global/minimal-implementation.md`: every parser field, transform, adapter operation, and abstraction must have an immediate caller; no migration scaffolding, future-host stubs, or generic workflow framework.
- `.maister/docs/standards/global/validation.md`: enforce allowlisted schemas, containment, collision safety, source/projection provenance, evidence freshness, external-writer rechecks, and clean extracted artifact validation.
- `.maister/docs/standards/testing/test-writing.md`: use behavior-focused tests, parameterize actual host seams, prove byte-exact multi-root rejection/recovery, and never treat unavailable native evidence as passed support.

## Out of Scope

- Migration, backup, preservation, hash-gated cleanup, runtime deletion, or backward compatibility for legacy `.codex/agents/*.toml` or receipt schema v1.
- New canonical roles beyond the existing 28, or promotion of `maister`, `explore`, or any other support helper into the canonical inventory.
- A general workflow DSL, redesign of unrelated orchestration behavior, or use of gate-decision identity as canonical role identity.
- A universal physical agent format across hosts; host representations remain native and intentionally different.
- Runtime projection generation, writes to the source checkout, or committed behavior-bearing generated Cursor/Kiro trees.
- Special Advisor permissions, model, readonly, sandbox, destination, installation, adapter, or evidence behavior.
- Fuzzy, alias-based, natural-language, default, built-in, root-agent, or inline fallback execution.
- Ownership of all `~/.kiro`, arbitrary project-local user agents, unrelated host settings, or protection against malicious same-user/privileged concurrent mutation.
- Claiming native discovery or invocation when a safe, authenticated, observable host scenario is unavailable.
- Native Codex custom-agent dispatch, multi-agent V1/V2 switching, and app-server worker orchestration until a separate documented capability contract and runtime probe pass.
- Concurrent workspace-writing Codex workers against one checkout, or isolated-worktree merge orchestration, until their ownership and conflict contracts are separately specified.
- Unrelated removal of the existing Cursor skill-projection compatibility exception, except for a narrowly required token-aware logical-role correction.
- UI changes, mockups, screenshots, frontend components, or other visual-design work.

## Success Criteria

1. The canonical parser returns exactly the expected 28 unique role IDs, with `role_id = filename stem = frontmatter.name`, and rejects malformed, unknown, unsafe, duplicate, case-folded, or normalized-colliding inputs before projection.
2. `advisor` is indistinguishable from other canonical rows in manifest shape, projection rules, destination policy, tools/model profiles, resolver/adapters, and evidence; negative topology tests reject every prohibited exception.
3. Two projections from identical inputs produce identical paths, bytes, newline/JSON formatting, modes, order, per-output hashes, manifest digest, and projected-tree digest.
4. Codex packages all canonical prompts with no legacy TOML profile; Cursor has exact normalized 28/28 native Markdown parity; Kiro has exact 28/28 descriptor/prompt parity and 100% reference closure; support roles are reported separately.
5. Projection failures, unresolved references, undeclared transforms, unsafe destinations, and unmanaged collisions yield typed errors with no target mutation and no source-checkout writes.
6. Active provenance and receipts bind canonical-set, manifest, schema/projector, and projected-tree digests, and verification rejects installed or recorded mismatches.
7. Install, update, verify, status, uninstall, rollback, and recovery use one managed-root registry and one journal; no command silently ignores the Kiro native leaf root.
8. Injected failure after each mutation boundary restores all managed roots, settings, active receipts, bytes, modes, symlinks, existence, and topology exactly, while unrelated Kiro native agents remain byte-identical.
9. Updates remove only receipt-owned, unchanged stale leaves; modified managed leaves and unmanaged collisions fail with zero state change.
10. Every accepted workflow role request uses exact `maister:<role_id>` syntax, produces one validated dispatch description, and records a valid hash-chained dispatch/attempt/terminal event stream; all prohibited fallback paths are absent. Advisor and Arbiter actors both default to exact `maister:advisor`, use the same execution profile, and remain distinct only in decision-attempt identity.
11. Codex launches a managed worker with the complete canonical role prompt, exact requested model/effort/sandbox, validated structured output, and durable execution events; Cursor and Kiro dispatch exact native external IDs; required but unsupported controls fail closed; `advisor` uses the same path.
12. Codex E5 proves the exact `codex.exec` control surface and Cursor/Kiro E5 observe the expected native inventory; none can pass from version availability alone. E6 distinguishes at least two ordinary roles plus `advisor` and validates logical/native identity, policy, session, nonce, and digest observations where applicable.
13. Missing native prerequisites produce `unavailable`; wrong discovery, wrong identity, digest mismatch, or executed-scenario failure produces `failed`; freshness changes invalidate prior records.
14. Repository topology, init behavior, tests, parity fixtures, and documentation contain no active legacy Advisor/Arbiter TOML lifecycle or compatibility code, and obsolete persisted state fails clearly before mutation.
15. Clean, deterministic release artifacts for Codex, Cursor, and Kiro contain canonical source and projector inputs, exclude forbidden behavior copies and foreign target assets, and pass extracted install/verify/uninstall across every managed root under the applicable evidence policy.
