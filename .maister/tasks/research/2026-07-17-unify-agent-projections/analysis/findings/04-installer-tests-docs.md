# Installer, Projection Lifecycle, Migration, Tests, and Documentation

## TL;DR
Generate all host agent projections in a pure, deterministic pre-materialization step that writes only to transaction staging; never mutate the resolved source checkout or generate agents at runtime.
The existing receipt, drift, snapshot, replacement-tree, rollback, recovery, and uninstall mechanics can own projected files unchanged once they appear in the staged inventory.
Legacy project `.codex/agents/advisor.toml` and `arbiter.toml` require a separate versioned cleanup: remove only byte-identical known legacy artifacts after backup, and preserve modified or unknown files as conflicts.
Acceptance must prove canonical-role bijection, reference closure, collision failure, explicit role selection, exact rollback, and native discovery/invocation separately; `advisor` uses the ordinary row in every test.

## Key Decisions
- Run agent projection before materializer validation but inside its isolated staging lifecycle — this preserves immutable source binding while making projected bytes part of inventory, provenance, receipts, drift checks, rollback, and release packages.
- Keep the projector pure and manifest-driven — identical canonical sources, projection manifest, and projector version must produce byte-identical trees, with no host-specific Advisor branch.
- Treat old project-scoped Codex TOML files as legacy migration inputs, not current installer inventory — automatic deletion is allowed only for exact known legacy bytes, after a durable backup.
- Require exact logical-role resolution before delegation — missing, duplicate, colliding, or unavailable roles fail closed and cannot fall back to another agent or inline execution.

## Open Questions / Risks
- The current receipt schema owns files only beneath a target's personal plugin root plus declared settings; project `.codex/agents/*` cleanup therefore needs an explicit migration receipt/backup boundary rather than being smuggled into ordinary uninstall.
- Native host discovery and role-specific invocation are not proved by the inspected platform-independent suites; those acceptance rows remain `unavailable` until safe versioned host probes exist.
- Existing parity baselines may encode migration-era omissions; updating them before the new projection invariants pass would merely bless the current gaps.

## Scope and confidence

This finding covers the installer lifecycle, projection stage, ownership, drift, recovery, stale-file migration, platform-independent tests, and documentation impact. It does not establish Codex, Cursor, or Kiro native runtime behavior.

Confidence labels:

- **High** — executable source and behavior-focused tests or standards agree.
- **Medium** — recommended design follows current transaction boundaries but is not implemented.
- **Unavailable** — native executable/session evidence or a production adapter is absent from this evidence stream.

## Current ownership and lifecycle boundary

### Per-target destinations

The target registry resolves one personal active root per host and keeps installer state outside it:

| Target | Managed active root beneath `--home` | State root |
|---|---|---|
| Codex | `.codex/plugins/local/maister` | `$XDG_STATE_HOME/maister/codex` or `~/.local/state/maister/codex` |
| Cursor | `.cursor/plugins/local/maister` | `$XDG_STATE_HOME/maister/cursor` or `~/.local/state/maister/cursor` |
| Kiro CLI | `.kiro-maister` | `$XDG_STATE_HOME/maister/kiro-cli` or `~/.local/state/maister/kiro-cli` |

`getTargetPaths` derives the active root from the registered discovery root and creates separate lock, journal, receipt, backup, and staging paths under the target state root (`plugins/maister/lib/distribution/target-paths.mjs:19-40`). The architecture document states the same ownership split: receipt-listed inventory and managed settings keys belong to Maister; unlisted content belongs to the operator (`.maister/docs/project/architecture.md:9-17`).

**Finding: high confidence.** The path resolver and architecture contract agree.

### How projected files become owned

The assembly plan recursively expands overlay sources, normalizes destinations, rejects duplicate destinations and file/child topology collisions, and sorts the plan deterministically (`plugins/maister/lib/distribution/materializer.mjs:201-273`). After assembly, materialization validates required/forbidden inventory, syntax, modes, references, native hashes, and content before returning a content hash and provenance (`plugins/maister/lib/distribution/materializer.mjs:842-935`).

The transaction converts every staged tree entry into `managed_inventory`, recording path, type, mode, file hash or symlink target, and ownership (`plugins/maister/lib/distribution/transaction-manager.mjs:557-569`). Thus projected agent files need no special receipt type: once emitted into staging, the existing receipt model can own and verify them as ordinary whole-file artifacts.

**Finding: high confidence.** Materialization output feeds the receipt inventory directly.

### Install and update behavior

Install/update performs materialization before snapshot or target mutation, validates that materialization used the same resolved source, checks that portable-core bytes did not change, prepares settings, and rejects conflicting pre-existing user files on an initial install (`plugins/maister/lib/distribution/transaction-manager.mjs:747-805`). It then snapshots active state, swaps a replacement tree, commits settings, verifies integrity, publishes the receipt, and only then removes staging (`plugins/maister/lib/distribution/transaction-manager.mjs:806-877`).

Update preserves unrelated content because `commitTree` first copies the entire active tree to a replacement, removes only paths owned by the prior receipt that are absent from the candidate inventory, and overlays candidate inventory before an atomic rename (`plugins/maister/lib/distribution/transaction-manager.mjs:594-647`). This is the correct mechanism for removing stale generated Cursor/Kiro agent projections: a projection absent from the new candidate is removed only if the previous receipt owned it.

**Finding: high confidence.** The replacement-tree algorithm explicitly distinguishes prior managed inventory from unrelated content.

### Drift, uninstall, rollback, and recovery

Drift detection compares every receipt entry's type, mode, hash or symlink target and checks whole-file settings hashes or managed settings keys (`plugins/maister/lib/distribution/drift-detector.mjs:9-45`). Update, uninstall, rollback, and explicit verify invoke drift checks before changing installed state (`plugins/maister/lib/distribution/transaction-manager.mjs:747-758`, `plugins/maister/lib/distribution/transaction-manager.mjs:920-926`, `plugins/maister/lib/distribution/transaction-manager.mjs:978-992`, `plugins/maister/lib/distribution/transaction-manager.mjs:1036-1057`). A user-modified managed projection is therefore preserved by failure, not overwritten or deleted.

Snapshots record the active root, declared settings, and active receipt before commit (`plugins/maister/lib/distribution/recovery.mjs:295-314`). Restore validates the backup manifest and fingerprints before restoring (`plugins/maister/lib/distribution/recovery.mjs:358-423`), while transaction failure attempts exact restoration and records `rollback_failed` when recovery cannot be trusted (`plugins/maister/lib/distribution/transaction-manager.mjs:878-917`). Uninstall removes receipt entries in deepest-first order, removes only managed settings or keys, and leaves a non-empty active directory intact (`plugins/maister/lib/distribution/transaction-manager.mjs:920-975`).

**Finding: high confidence.** The executable drift and recovery paths match the byte-exact recovery requirement in `.maister/docs/standards/testing/test-writing.md:7-11`.

## Required projection stage

### Recommendation

Use a dedicated pure `agent-projector` as a pre-validation stage of materialization:

```text
immutable resolved checkout
  -> parse canonical plugins/maister/agents/*.md + projection manifest
  -> emit host projection into empty transaction staging
  -> build/merge deterministic assembly plan
  -> validate inventory, syntax, references, hashes, content
  -> hash staged tree + bind provenance
  -> snapshot, commit, receipt, verify
```

The projector may be a separate module, but its production invocation must occur after immutable source resolution and before `materialize()` returns its validated content hash. It must write only within the transaction's empty `stagingRoot`; it must never rewrite the source checkout. This follows from the lifecycle's explicit source-binding and before/after portable-core hash checks (`plugins/maister/lib/distribution/transaction-manager.mjs:759-784`) and the materializer's empty-staging and same-filesystem requirements (`plugins/maister/lib/distribution/materializer.mjs:842-889`).

Runtime generation is rejected because it would produce bytes outside receipt ownership, release-package closure, provenance, drift validation, and rollback. Mutating checked-in overlay copies during install is rejected because it violates immutable-source validation and recreates a second behavior owner. A build-time `--check` command may exercise the same projector without committing output, but the installer must still produce and validate the staged projection from canonical inputs.

**Finding: medium confidence.** This is a design recommendation grounded in current source-binding and transaction seams; the projector does not yet exist.

### Deterministic projector contract

The projector input must be limited to:

- canonical agent Markdown bytes;
- a versioned projection manifest containing logical IDs, host output forms, destinations, namespace rule, allowlisted transforms, and separately classified support agents;
- a versioned projector implementation.

The projector output must satisfy:

1. Canonical filename stem and frontmatter identity normalize to one unique logical role.
2. Every canonical logical role yields exactly one projection or injection record for each supported host.
3. Host support agents cannot satisfy or mask a missing canonical role.
4. All output paths and host-facing names are derived deterministically and collision-checked after case/path normalization.
5. Prompt bytes derive from canonical Markdown through named, allowlisted transforms only.
6. Every local descriptor reference resolves inside the final staged tree.
7. `advisor` has the same fields, transforms, destinations, ownership, drift behavior, and invocation-map rules as every other canonical role.
8. Two runs with identical inputs have identical file bytes, modes, path order, tree hash, and receipt inventory.

The existing materializer already rejects normalized destination collisions (`plugins/maister/lib/distribution/materializer.mjs:240-269`) and normally rejects unresolved internal references (`plugins/maister/lib/distribution/materializer.mjs:640-672`). However, it currently exempts every Kiro `agents/* -> file://./instructions/*.md` reference (`plugins/maister/lib/distribution/materializer.mjs:627-647`). Development must delete that blanket exception so projected Kiro descriptors cannot pass without their prompt files.

## Safe migration and stale-file removal

### Installer-owned stale projections

For files already listed in a prior target receipt, ordinary update is sufficient and should remain the only cleanup path:

- detect drift first;
- generate the complete candidate projection;
- remove prior managed entries absent from the candidate only in the replacement tree;
- preserve every unlisted file and directory;
- snapshot before commit and restore exactly on failure;
- publish a receipt only after integrity passes.

If an obsolete managed projection was modified, update must fail with a drift conflict and leave the active tree byte-for-byte unchanged. The user must explicitly restore the expected bytes, move the customized file elsewhere, or choose a future force/migration flow; silent overwrite is forbidden.

### Legacy project `.codex/agents` remnants

Project `.codex/agents/advisor.toml` and `.codex/agents/arbiter.toml` are outside all three installer active roots. They cannot safely be added to an ordinary target receipt without broadening target ownership into the user's project. Because Advisor is now an ordinary canonical agent, ongoing init/install logic must stop creating, reconciling, or toggling these TOML files.

Implement one explicit, versioned legacy-cleanup operation with this decision table:

| Observed legacy path | Required behavior |
|---|---|
| Missing | No-op; record `absent`. |
| Regular file with bytes matching an allowlisted historical Maister template hash | Snapshot file bytes, mode, existence, and parent topology; durably record the migration; remove the file; remove `.codex/agents` and `.codex` only if empty and recorded as created/legacy-empty. |
| Modified bytes, unknown template/version, symlink, non-regular file, or unsafe path identity | Fail closed; do not change the file or directories; report `user_modified_or_unknown` with the exact path. |
| Failure after any removal | Restore exact bytes, mode, existence, and topology from the migration backup; keep an auditable failed migration record. |

This cleanup should run as a one-time migration during an explicit upgrade/init path, never as a side effect of `advisor.enabled`, agent invocation, or normal host uninstall. The migration record must bind project root identity, legacy path, observed hash/mode/type, matched legacy-template version, backup reference, result, and timestamp. Re-running a completed migration must be idempotent.

The current workspace demonstrates why hash-gated cleanup is mandatory: `.codex/agents/advisor.toml` is locally modified while `.codex/agents/arbiter.toml` is a separate tracked legacy artifact. Research must not infer that either file is safe to delete merely from its name.

**Finding: high confidence for the safety requirement; medium confidence for the proposed migration record placement.** Current receipts cannot own these project paths, and project testing standards require exact pre/post topology evidence.

## Existing test coverage and gaps

Relevant platform-independent suites are:

- `tests/platform-independent/source-materializer.test.mjs` — deterministic materialization, normalized destination collision rejection, staged inventory/syntax/mode/hash validation, and internal-reference validation.
- `tests/platform-independent/overlay-contract.test.mjs` — three-host overlay shape and required inventory; it currently checks Cursor **skill** projection drift, not agent projection equality.
- `tests/platform-independent/target-registry.test.mjs` — supported target registry and path acceptance.
- `tests/platform-independent/installer-transaction.test.mjs` — clean lifecycle for all targets, unrelated-content preservation, drift refusal, exact failure rollback, recovery idempotency, receipt/evidence integrity, and path-race rejection.
- `tests/platform-independent/repository-topology.test.mjs` — release wiring and forbidden active wording; it does not establish agent-projection parity or project `.codex/agents` cleanup.
- `tests/platform-independent/evidence-parity-topology.test.mjs` — evidence classification, migration parity, and final topology checks; native unavailable outcomes are kept distinct from passes.
- `tests/platform-independent/parity-release.test.mjs` — clean-checkout comparison of all registered targets to the reviewed immutable migration oracle.
- `tests/platform-independent/release-package.test.mjs` — deterministic, isolated, self-contained target archives and extracted install/verify/uninstall lifecycle.

The standards require parameterization at overlay/materializer/installer/native seams rather than duplicating the portable suite (`.maister/docs/standards/testing/test-writing.md:1-5`), exact topology comparisons for rejection/rollback (`.maister/docs/standards/testing/test-writing.md:7-11`), and deterministic extracted-package lifecycle for all three targets (`.maister/docs/standards/testing/test-writing.md:13-15`). The build pipeline already exposes target-aware overlay, materializer, installer, parity, topology, validation, and package entry points (`.maister/docs/standards/global/build-pipeline.md:5-23`).

## Acceptance test matrix for `maister:development`

| Layer | Acceptance criterion | Required negative proof | Status before implementation |
|---|---|---|---|
| Canonical IR | All canonical role IDs are unique after normalization; filename/frontmatter disagreement fails. | Duplicate/case-fold/path-normalized collision produces a stable typed error and no outputs. | Missing |
| Projection determinism | Two projections for every host from identical inputs yield identical bytes, modes, ordered paths, and tree hashes. | One canonical byte or manifest transform change invalidates `--check` and changes the bound output hash. | Partial: whole-tree materialization only |
| Inventory bijection | Every canonical role appears exactly once per host; support agents are counted separately. | Missing, extra, duplicate, or substituted canonical role fails with a role-level diff. | Missing |
| Content derivation | Every generated prompt maps to one canonical source digest plus named transforms. | Hand-edited Cursor/Kiro prompt or undeclared transform fails projection check. | Missing |
| Reference closure | Every local descriptor/prompt/file reference resolves inside staging. | Missing Kiro instruction target fails `E_MATERIALIZE_REFERENCE`; no target-wide exception. | Failing by historical exception |
| Destination collisions | Generated and overlay destinations are unique after normalization and topology-safe. | Case-only duplicate and file-containing-child fixtures fail before target mutation. | Partially covered |
| Transaction ownership | All projected files appear in the receipt with correct type/mode/hash/ownership. | Receipt omission or tampering fails validation/verify. | Mechanism covered; projection assertions missing |
| Clean update | Removing/renaming a canonical role removes only prior receipt-owned stale outputs and preserves unrelated content. | Modified stale projection causes drift failure with byte/mode/topology equality before and after. | Generic behavior covered |
| Rollback/recovery | Failures after projection, snapshot, tree swap, settings commit, integrity, and receipt publication restore or recover exact prior state. | Injected failures compare bytes, modes, symlinks, existence, directories, active receipt, journal, and backup. | Generic phases covered; projection fixture missing |
| Legacy Codex cleanup | Known unmodified legacy Advisor/Arbiter templates are backed up and removed idempotently. | Modified/unknown/symlink legacy files remain untouched; injected cleanup failure restores exact project topology. | Missing |
| Explicit invocation map | Every workflow logical role resolves to exactly one installed/injected representation before dispatch. | Unknown, missing, duplicate, or unavailable role never falls back to another agent or inline execution. | Missing |
| Advisor equality | The ordinary `advisor` row passes every IR, projection, transaction, migration-independent invocation, and native-runtime case. | Test rejects any Advisor-only destination, TOML profile, read-only field, sandbox field, or special adapter branch. | Missing |
| Native discovery | Host lists/discovers the expected projected inventory at the supported version. | Missing executable/auth/session/scenario records `unavailable`, never passed. | Unavailable |
| Native invocation | Two distinguishable roles plus `advisor` are explicitly invoked and produce role-specific evidence bound to role ID/digest. | Wrong-role, implicit fallback, or ambiguous selection fails. | Unavailable |
| Release closure | Every archive contains the canonical source, projection manifest/projector, target projection, and no other target's native projection; two builds hash identically and clean lifecycle passes. | Missing prompt/reference, foreign target artifact, or stale generated tree blocks packaging. | Generic package coverage exists |

Release parity baselines should be updated only after the new role-level projection tests pass. Baseline exceptions that currently encode missing projections must be removed rather than re-recorded as accepted differences. Native discovery and invocation remain separate E5/E6-style evidence rows; structural, materialization, transaction, or package success cannot promote them.

## Documentation impact

Development must update these contracts together with code:

1. `.maister/docs/project/architecture.md` — add the canonical agent IR/projector, place projection inside pre-validation staging, define receipt ownership, and document versioned legacy Codex cleanup. Remove wording that leaves behavior-bearing host projection as accepted debt once migration is complete.
2. `.maister/docs/project/tech-stack.md` and `.maister/docs/project/roadmap.md` — record the projector/manifest and replace the generic “no generated projections” wording with the precise rule: no independently maintained generated source trees; ephemeral deterministic staged projections are allowed and receipt-owned.
3. `.maister/docs/standards/global/build-pipeline.md` — add agent projection generate/check entry points, role-bijection/reference-closure gates, and require them before materializer/parity/package validation.
4. `.maister/docs/standards/testing/test-writing.md` — add the stale managed-projection and legacy project-file migration cases, including modified-file preservation and exact rollback topology.
5. `docs/commands.md` — document install/update/verify/uninstall/rollback/recover behavior, per-host destinations, projection checks, migration command/result states, and explicit logical role naming. Remove any implication that `/maister:init --advisor` installs a Codex agent profile.
6. `docs/workflows.md` — replace generic “delegates to subagents” claims with the logical-role-to-host adapter contract, fail-closed unavailable behavior, and the rule that `advisor` uses the same invocation path as every other role.
7. Init skill/user output — keep `advisor.enabled` only as gate-policy configuration; remove Codex TOML creation/reconciliation/removal from normal preflight and route legacy files through the one-time migration described above.

## Development requirements

1. Add a host-neutral canonical agent parser and versioned projection manifest.
2. Add a pure projector that writes only into controlled staging and returns a sorted output inventory plus canonical-source and transform digests.
3. Integrate projection before materializer validation/content hashing without mutating resolved source bytes.
4. Replace duplicated Cursor agent bodies and incomplete Kiro descriptor-only assets with deterministic staged outputs; require full reference closure.
5. Extend receipts/provenance or the materialization evidence record so the projector version, manifest digest, canonical agent-set digest, and projected tree digest are auditable.
6. Implement exact logical-role resolution and explicit delegation records; fail closed on missing, duplicate, collision, unavailable capability, or unsupported model override.
7. Remove all current Codex Advisor profile generation/reconciliation and any `readonly`/`sandbox_mode` installation exception; keep `advisor` ordinary.
8. Implement the versioned, hash-gated, recoverable project `.codex/agents` legacy cleanup with modified-file preservation.
9. Add the acceptance matrix above to platform-independent and native-probe suites, maintaining `unavailable` for absent native prerequisites.
10. Update architecture, build/test standards, commands, workflows, and migration notes in the same change; then run target-aware projection, materializer, installer, parity, topology, package, and extracted lifecycle validation for Codex, Cursor, and Kiro CLI.

## Remaining gaps

- **Unavailable:** production host adapters proving explicit role selection and successful native invocation.
- **Unavailable:** host-versioned native discovery/listing behavior in this evidence stream.
- **Open design detail:** exact schema and storage root for the project-scoped legacy migration record; it must remain separate from ordinary target active-root ownership.
- **Open design detail:** whether projection evidence extends receipt schema v1 or is included through existing provenance/evidence hashes. Either choice must preserve strict receipt validation and rollback compatibility.

