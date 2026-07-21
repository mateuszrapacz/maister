# Specification: First-Class Pi Support

## TL;DR
Add Pi as a fourth first-class Maister target through a deterministic generated package, a closed hybrid projection, one identity-managed `packages[]` entry, and a thin public `pi-subagents/delegation` v1 adapter.
Canonical sources remain authoritative; Pi artifacts are generated inside the existing materializer and participate in receipts, provenance, rollback, evidence, packaging, and release validation.
Pi 0.80.10 / Node 25.9.0 / `pi-subagents` 0.35.1 is the initial evidence tuple. Structural and transactional support may be provisional; E5/E6 remain unavailable until the full native lifecycle passes.
The implementation must replace active historical parity gating with current-state four-target admission and preserve unrelated operator-owned Pi state.

## Key Decisions
- Add `pi` with `pi.native`; use current-state all-target admission rather than expanding the historical three-target oracle.
- Generate one package at `~/.pi/agent/maister/`; keep `pi-subagents`, settings outside the owned entry, auth, trust, sessions, and unrelated packages operator-owned.
- Project every canonical command/skill and all 28 agents exactly once through skills, prompts, and a minimal extension; reject omissions and ambiguous origins.
- Add normalized identity-aware `managed_array_entries` ownership for one local package member, preserving unrelated values and representation.
- Use public delegation v1 only and require full E6 lifecycle evidence with exact identity and durable hash-chained events.

## Resolved Contract Risks
- Package-agent discovery remains an E5 proof obligation, but the descriptor identity, origin, collision, and evidence contract is fixed in Appendix A.
- Foreground process loss is a terminal `process_lost` observation; retry is a new dispatch and is never reported as resume.
- The managed-settings contract is versioned as `managed_array_entries_v1` / `pi_local_package_v1`; any semantic change requires a new version.
- Historical three-target parity is removed from active code, fixtures, and release metadata. Target-independent assertions remain, but no historical comparison path is retained.

## 1. Goals and Non-Goals

### Goals

1. Register and validate Pi as a first-class supported target.
2. Generate and package a deterministic user-scope Pi package from canonical Maister sources.
3. Preserve exact canonical role identity, command origin, ownership, provenance, and transaction semantics.
4. Provide native foreground delegation over public `pi-subagents/delegation` v1.
5. Record bounded progress and terminal outcomes in Maister's durable event stream.
6. Add Pi structural, transactional, native, and semantic evidence without converting unavailable prerequisites into passes.
7. Replace the active historical parity release gate with current all-target admission.

### Non-Goals

- Rewriting Pi or `pi-subagents`.
- Bundling or automatically installing/removing `pi-subagents`.
- Deep-importing private Pi or `pi-subagents` modules.
- Implementing Pi-native durable replay/resume for foreground delegation.
- Adding a browser/UI product surface.
- Modifying unrelated targets or unrelated user worktree changes.

## 2. Compatibility and Support Contract

The initial supported evidence tuple is:

| Component | Required baseline |
| --- | --- |
| Pi executable | 0.80.10, resolved by executable realpath |
| Node | 25.9.0, satisfying Pi's engine requirement |
| `pi-subagents` | 0.35.1, operator-owned prerequisite |
| Delegation API | public `pi-subagents/delegation` v1 |
| Target identity | `pi.native` |
| Generated package | `~/.pi/agent/maister/` |

Missing executable, wrong realpath/version, missing public export, absent prerequisite, ambiguous package discovery, or unsupported protocol returns a typed `unavailable`/`blocked` result. It never triggers a fallback host, generic agent, inline prompt, or private API.

Support claims are graduated:

- Registered: registry, overlay, schema, and target closure pass.
- Structural: deterministic package, topology, projection, and provenance pass.
- Transactional: install/update/verify/uninstall/rollback/recovery and settings preservation pass.
- Native discovery: Pi and `pi-subagents` discover the final package and all 28 exact identities.
- Native runtime: full delegation lifecycle and exact observed identity pass.
- Semantic: role-specific scenarios pass with current evidence and provenance.

## 3. Target and Overlay Contract

Add `pi` to `plugins/maister/lib/distribution/targets.mjs` and target path resolution. Add `plugins/maister/overlays/pi/overlay.yml` and `inventory.yml` validated by `overlay-v1.schema.json`.

The overlay must define:

- target id `pi` and projection identity `pi.native`;
- user discovery root `.pi/agent/maister` and platform-resolved absolute root;
- `plugin_private` / `whole_tree` ownership for the generated package;
- one `managed_array_entries` settings ownership entry for `settings.json` `packages[]`;
- required package files, skill/prompt/agent inventories, support inventory, and forbidden topology;
- six semantic bindings: `user_gate`, `delegate_agent`, `track_progress`, `resolve_task_root`, `persist_state`, `continue_workflow`;
- compatibility tuple, executable/prerequisite probes, evidence requirements, and target state paths;
- command-origin mapping and exact role identity mapping.

Validation rejects unknown fields, unsafe paths, duplicate destinations, unresolved tokens, foreign-target vocabulary, missing bindings, and incomplete inventories.

## 4. Generated Package and Projection

Materialization must generate this package in the existing same-filesystem staging tree:

```text
~/.pi/agent/maister/
├── package.json
├── .maister-source.json
├── extensions/maister.ts
├── skills/<canonical-skill-id>/SKILL.md
├── prompts/maister-<command>.md
├── agents/maister-<role>.md
├── agent-projection-v1.json
├── common/
├── lib/
├── bin/
└── orchestrator-framework/
```

The package manifest exposes only Pi-supported resource kinds. Private `agents/` descriptors are consumed through the verified `pi-subagents` package-agent discovery path. `pi-subagents` is never included in the package archive.

Projection requirements:

- Start from the canonical 28 files in `plugins/maister/agents/`.
- Emit exactly one namespaced `maister:<role>` identity for every canonical role.
- Preserve role source digest, projection schema digest, manifest digest, and execution profile in provenance.
- Generate every canonical command/skill entry exactly once using the closed hybrid map.
- Emit skills for reusable workflows, prompts for textual command views, and extension code only for imperative registration/delegation.
- Reject missing, duplicated, unmappable, shadowed, unsafe, or wrong-origin outputs before enumeration and hashing.
- Never hand-maintain generated behavior in the repository.

## 5. Settings Ownership and Lifecycle

Add `managed_array_entries` as a closed ownership kind. The Pi algorithm `pi_local_package_v1` must:

1. Parse the settings file strictly and fail before mutation on malformed JSON.
2. Locate `packages[]` and accept string or object entries with a `source` field.
3. Resolve relative local sources relative to `settings.json` and normalize one absolute identity.
4. Match exactly the identity of the generated Maister package.
5. Preserve matching object fields and representation when updating an existing member.
6. Refuse duplicate identities, conflicting object filters, incompatible representations, and ambiguous matches.
7. Preserve unrelated array members, order, bytes where possible, modes, symlinks, and file topology.
8. Record file path, array path, ownership and merge algorithm versions, normalized identity, exact installed entry, before/after hashes/modes, and backup reference.

Thread the ownership receipt through transaction preflight, staging, commit, validation, install, verify, update, uninstall, rollback, crash recovery, drift detection, and injected-failure coverage. Any failure must leave unrelated settings and the prior managed state byte-exact and topology-exact.

## 6. `pi.native` Runtime Adapter

The adapter implements the existing three-method runtime port:

- `resolveAgent(roleId)`: accept only exact `maister:<role>` identities, validate the active receipt/projection, and freeze the role source digest and execution profile.
- `dispatchAgent(plan, task)`: create a bounded request with `requestId === dispatch_id`, append the planned start event before side effects, subscribe to delegation events before emission, and map public v1 events to typed runtime outcomes.
- `readExecutionEventStream(dispatchId)`: read the Maister-owned hash-chained stream, not a private Pi status file.

The public event flow is:

```text
resolve exact role
  -> append planned/start event
  -> subscribe to delegation v1 stream
  -> emit request
  -> sanitize bounded updates
  -> observe response/cancel/failure
  -> verify response.agent against frozen role
  -> append typed terminal event
```

The adapter must support ordinary and advisor scenarios, exact requested/observed identity, unknown/wrong role, malformed events, timeout, cancellation, budget failure, prerequisite absence, process loss, and durable-write failure. Process loss after `started` is a typed terminal failure; no replay/resume claim is made. Cancellation uses public v1 cancel semantics and remains best-effort only where the public contract is best-effort.

## 7. Evidence and Release

Add Pi producers/fixtures to the evidence policy and bind every record to target, capability, executable realpath/version, Node, prerequisite version, scenario version, source/overlay/projection digests, timestamp, result, and expiry.

- E1/E2: registry, overlay, package, inventory, and deterministic projection.
- E3: portable-core attestation and package binding.
- E4: transactional lifecycle, settings preservation, receipts, rollback, and recovery.
- E5: native discovery of the final package and all 28 exact namespaced agents with collision checks.
- E6: full public delegation v1 lifecycle, exact identity, updates, cancellation, bounded failures, process loss, and durable event chain for ordinary and advisor roles.

Unavailable or expired records are never passes. Native evidence is renewed when executable, prerequisite, source, overlay, projection, or scenario identity changes.

Replace active `test-parity-release`/historical three-target release assumptions with current-state all-target admission over Codex, Cursor, Kiro CLI, and Pi. Retain any historical comparison only as clearly non-gating context. Update Make, CI, package archives, checksums, SBOM, provenance, extracted lifecycle smoke, and topology tests to include Pi and exclude bundled external prerequisites.

## 8. Acceptance Criteria

1. `make validate` and target-aware focused suites run with Pi included in current-state loops.
2. Pi overlay and inventory validate with no unresolved fields, paths, identities, bindings, or topology violations.
3. Two materializations from identical source/date inputs produce byte-identical Pi package outputs and matching provenance.
4. All 28 canonical roles and every canonical command/skill entry are present exactly once with correct origin and digest.
5. Generated package archive contains no bundled `pi-subagents`, unrelated target artifacts, credentials, sessions, or auth.
6. Install/update/verify/uninstall preserve unrelated settings entries and pass injected failure, drift, rollback, and recovery tests.
7. Missing or mismatched Pi prerequisites produce typed unavailable results without mutating operator-owned state.
8. E5 proves final package discovery and all 28 exact identities under hermetic collision-controlled conditions.
9. E6 proves ordinary and advisor full delegation lifecycle with exact identity, bounded progress, cancellation, failures, process loss, and durable event hashes.
10. Release metadata distinguishes provisional structural/transactional Pi support from native/semantic availability.
11. No active historical parity gate blocks current-state four-target admission.
12. Existing Codex, Cursor, and Kiro CLI behavior remains green except for intentional current-admission/test-fixture rewrites documented in the implementation log.

## 9. Test Strategy

Parameterize target-independent suites for Pi where semantics are shared. Add Pi-specific tests for overlay/package topology, closed command origins, all 28 role projection, package-agent discovery, managed-array string/object identity, duplicate/conflict/drift behavior, transaction rollback/recovery, public delegation event mapping, process loss, evidence unavailable states, deterministic archive closure, and current all-target release admission. Use behavior-focused tests and compare bytes, modes, symlinks, existence, and topology in all transactional failure paths.

## Appendix A — Normative closed contracts

This appendix is normative. If an earlier section uses a broad term such as “mapping”, “bounded”, “unavailable”, or “package manifest”, this appendix supplies its closed meaning. An implementation may not add an unlisted source, destination, event, setting field, or release claim without a versioned specification change.

### A.1 Source universe and exact projection map

The canonical source universe is the checked-in tree at the implementation commit:

| Source class | Count | Canonical root | Pi destination | Kind | Transform |
| --- | ---: | --- | --- | --- | --- |
| Skills | 29 | `plugins/maister/skills/<id>/**` | `skills/<id>/**` | Pi skill | `pi-skill-v1`, `pi-reference-rewrite-v1` |
| Commands | 14 | `plugins/maister/commands/<id>.md` | `prompts/<id>.md` | Pi prompt | `pi-prompt-v1` |
| Agents | 28 | `plugins/maister/agents/<role>.md` | `agents/maister-<role>.md` | package-agent descriptor | `pi-agent-frontmatter-v1` |
| Runtime | bounded tree | `plugins/maister/common/**`, `plugins/maister/lib/**`, selected framework files | `common/**`, `lib/**`, `orchestrator-framework/**` | package closure | `copy-v1` |

The following command map is closed. The digest is SHA-256 of the exact UTF-8 source file at materialization time; the checked-in projection manifest must contain the same digest and a stale or missing digest is a validation error.

| Canonical command source | SHA-256 | Pi kind | Destination | Origin rule |
| --- | --- | --- | --- | --- |
| `modeling-aggregate-designer.md` | `9f80a86f66a9a83e5a410851f087309d3dc0da486afc5693889948e33ff35087` | prompt | `prompts/modeling-aggregate-designer.md` | canonical command |
| `modeling-context-distiller.md` | `8199bc624c4cf946ff08f0a05244e3cd65610388384723c750519cbcecbbecea` | prompt | `prompts/modeling-context-distiller.md` | canonical command |
| `quick-metaprogram-classifier.md` | `0571d8b2165bd62bf1522cf6a41596c82b22b5db80c24462d96d52c417b92f60` | prompt | `prompts/quick-metaprogram-classifier.md` | canonical command |
| `quick-problem-classifier.md` | `68e2b2e255434e87b046deb7926799834b535e86965bb956a4f1425ac850bea9` | prompt | `prompts/quick-problem-classifier.md` | canonical command |
| `quick-requirements-critic.md` | `a0c18c0f0799cebdcee7b22eae69c33cf5776584ffc071c17374ba353e9d9586` | prompt | `prompts/quick-requirements-critic.md` | canonical command |
| `quick-transcript-critic.md` | `98ab55db3d0e7042d634cb32c50eecdf211dd96dd9fc6c7d8da709cd90021b25` | prompt | `prompts/quick-transcript-critic.md` | canonical command |
| `reviews-code.md` | `41f74eddea48b0c95e7d0381317b23e6379a6a9d670f8585d6afabba6a58acca` | prompt | `prompts/reviews-code.md` | canonical command |
| `reviews-linguistic-boundaries.md` | `7db5aabd22181440f4dac7a49be0d0ac0b3574071151c686a9c1fad1867b9594` | prompt | `prompts/reviews-linguistic-boundaries.md` | canonical command |
| `reviews-pragmatic.md` | `b07186d87723010cb28ef8a4ba8eecbcaf854991125ed57c17857a6e00f6117f` | prompt | `prompts/reviews-pragmatic.md` | canonical command |
| `reviews-production-readiness.md` | `6f743f360cbf3415d63d6befbdad4e762655e53a385ba170ccd18d620f930ae7` | prompt | `prompts/reviews-production-readiness.md` | canonical command |
| `reviews-reality-check.md` | `a98ec01a40b89c04bef21ee25fc0445880a0fa12debf8489ff0a3ede6e86e38e` | prompt | `prompts/reviews-reality-check.md` | canonical command |
| `reviews-spec-audit.md` | `0103c7c2c504c343277a48d85326ad14e6628fec957041fff260d33a0edae8b6` | prompt | `prompts/reviews-spec-audit.md` | canonical command |
| `reviews-test-strategy.md` | `c444cd58625ecbdb875af0a985f3149e0941992a1a69356635924667420dfd9c` | prompt | `prompts/reviews-test-strategy.md` | canonical command |
| `work.md` | `f3fd5d90f76362c88df32a46fc1b7ba86dc67a13b83c0f8495a9f661d24326f7` | prompt | `prompts/work.md` | canonical command |

The 29 skill IDs are the directory names currently present below `plugins/maister/skills`: `aggregate-designer`, `codebase-analyzer`, `context-distiller`, `development`, `docs-manager`, `grill-me`, `grill-with-docs`, `implementation-plan-executor`, `implementation-verifier`, `init`, `linguistic-boundary-verifier`, `metaprogram-classifier`, `migration`, `orchestrator-framework`, `performance`, `problem-classifier`, `product-design`, `quick-bugfix`, `quick-dev`, `quick-plan`, `requirements-critic`, `research`, `standards-discover`, `standards-update`, `test-strategy-reviewer`, `thermo-nuclear-code-quality-review`, `thermo-nuclear-review`, `thermos`, `transcript-critic`. Each directory is copied recursively, with each `SKILL.md` digest and every referenced file included in the package digest. No skill is silently excluded; internal engine skills remain under the package runtime closure and are not advertised as public prompt commands.

The 29 `SKILL.md` source digests at the current specification commit are:

```text
aggregate-designer  adac890b928187465a7063436a9fcf61dd2402e5ba86a49c994a8cf42b698f50
codebase-analyzer   5ce0b1280d6088931b7958e0d42c09356e17441ef17c365d31b48ac0647c2a43
context-distiller   b8ca96cb1a743d8616af7237b5f60ecb7f18e084c0fecc23cd6f26e63d6dffba
development         f1b519a76a010426e3a418741e4d1c774a7c54159a1e6243cfa7edfd2312ba26
docs-manager        3aef890c141d2304ae058de1c98efcce0ef872f73cb46dd0fe9866f0d87b5dd4
grill-me            bce096e2d54529dad9d4ab4bf0d127220d3168acd56997c5f4e9cea2142706a0
grill-with-docs     0d5e2f384d1ea720f6f77e37fe19037d0c2785aa0ec359aeb6feb885a2b1e5b0
implementation-plan-executor ba08a8a884b1d1c981bd0b08421e6a56895578b29658fdb48f88477de7234dad
implementation-verifier      6ad4cd087b24277fe06aa7923e1e25a40b0b1b1233c73eb43c4eabba018a4fac
init                315118ebf837afeb5d718f951e09eef15cf1ead46df5fc8f7b651cff8830f1c2
linguistic-boundary-verifier dc76289f90c34903dfb5c5c2c9cfc579a3145c71976db5c934061051b81cbe64
metaprogram-classifier fa958dff65d78c17c81ccba88d478b41e3864956dfcdc2d10c59209bf72d0a26
migration            093a52e439e17310eae57db9b451f0d28e7d9cd60ed42341596a92050526e463
orchestrator-framework 539445e7b185cc8c4b850cd808ceadcb0aac5ad34288bec1f7f0e68eed90dc17
performance          b9945f763ebad7e970b8eef581526260dd433ef39250b64681f277e54bd7f820
problem-classifier   adb1e2d5a5d67d316a21cb0be793cc3adde2d58b31c05b2e7bf18ee5b319731b
product-design       1c59fd3eb45363dbb173612006fc7368ca916d8bd0f3de6d8310ebd776e867b1
quick-bugfix         06b40422f513ac70f2fec26c01aabe32cf6244b3e67c44b5987bfc6c16087529
quick-dev            4a6bcb912b2dd6f5c6f397bed8cb770f2c8341d3d281e70133d52dd31eeb62b2
quick-plan           4fee562dd2302bcb13b0d4184e23721250f9efa5c0fe59a20bf842b2fd8515f5
requirements-critic 5691a0882199f8520a8f34f116820446d20c1d91b8ddaee314da97c4a8548dfc
research             5a5c5f06ad7526f817abff2f53acb3062386c4f93da34d53680cefc69bcaa59c
standards-discover   2aff792ce3f915bffbca0769dd5f4a427ba812711cf83db43b2f3c0a2fb3be57
standards-update     b0f70336ac2f4d150a1ab549be2595ff26b3e8196fc712a81b8e366a85f5a92f
test-strategy-reviewer abc55f151f73a84cdf53293ba51261b3be7dba450a5c94cce6691ab13110c58e
thermo-nuclear-code-quality-review fcc5ff2e24acd24bf5d088fb063eb4c257a9d416f6a2294a5748d1dbd43fa36b
thermo-nuclear-review b95c1bf434c925a5e2323e2e0b05683116118f89a37ad34f8dcba113f4006542
thermos             330e1e5c78296eeacea959092361114e5545fd068b79355164eecd9f19a7af16
transcript-critic   97eae41b4342d2dbd7f40fc65afe377b60286e9666d7e284703bc0581ef25751
```

The extension is not a second canonical origin. It is one generated file, `extensions/maister.ts`, and may contain only imperative registration, delegation, sanitization, and event-bridge code. Every command/skill/agent output must reference its canonical source path and digest in `agent-projection-v1.json`; the validator rejects duplicate source IDs, duplicate destinations, omissions, stale digests, and any output with `origin != canonical`.

### A.2 Role identity and discovery bijection

The exact role set is the sorted `expected_role_ids` from `plugins/maister/agent-projection-v1.json`:

```text
advisor, bottleneck-analyzer, code-quality-pragmatist, code-reviewer,
codebase-analysis-reporter, docs-operator, e2e-test-verifier, gap-analyzer,
html-companion-writer, implementation-completeness-checker, implementation-planner,
information-gatherer, production-readiness-checker, project-analyzer,
reality-assessor, research-planner, research-synthesizer, solution-brainstormer,
solution-designer, spec-auditor, specification-creator, task-classifier,
task-group-implementer, test-suite-runner, thermo-nuclear-code-quality-review-subagent,
thermo-nuclear-review-subagent, ui-mockup-generator, user-docs-generator
```

For each role `r`, the generated descriptor is `agents/maister-r.md`, has frontmatter `name: "maister:r"` and the canonical `description`, and records `maister_role_id: r`, `canonical_source`, `canonical_source_sha256`, `projection_schema: "pi-agent-frontmatter-v1"`, and the selected execution profile. The projection field `native_role_external_id` is exactly `maister:r`; it is not inferred from ambient Pi discovery.

E5 must discover exactly one descriptor for each expected external ID, and each returned resource must have package source metadata pointing to the generated package identity `maister` and the generated package root. Any ambient/project/user descriptor with the same ID is a collision, even if its content is identical. A missing `sourceInfo`, wrong package identity, duplicate ID, disabled descriptor, or precedence ambiguity is `unavailable`/`failed`, never a pass. `resolveAgent` resolves the logical role only from the Maister manifest/receipt and passes the frozen external ID to dispatch; it never imports Pi's private discovery functions.

### A.3 Compatibility and authoritative version resolution

The policy has four separate version concepts:

| Policy | Value | Meaning |
| --- | --- | --- |
| Pi engine floor | `>=22.19.0` Node engine declared by the Pi executable package | Minimum for structural host compatibility; not native evidence by itself |
| Tested host tuple | Pi `0.80.10`, Node `25.9.0` | Exact tuple required for E5/E6 claims in v1 |
| Delegation prerequisite | `pi-subagents >=0.35.0 <0.36.0`, tested at `0.35.1` | Public delegation v1 minimum and tested package identity |
| Public protocol | `SUBAGENT_DELEGATION_PROTOCOL_VERSION === 1` | Required named export and event protocol |

The authoritative resolution sequence is: resolve `pi` from `PATH`; follow symlinks to the executable realpath; run that exact executable with `--version`; resolve the executable's own `@earendil-works/pi-coding-agent/package.json` relative to its realpath; capture `process.execPath`/`node --version`; resolve `pi-subagents` through the active Pi package manager/settings source and read that package's manifest; import only its exported `pi-subagents/delegation` entry. A similarly named package in another `node_modules` tree is not evidence. `PI_PACKAGE_DIR` is recorded as host configuration but cannot replace the executable identity. A mismatch returns a typed reason (`pi_missing`, `pi_version_mismatch`, `node_engine_mismatch`, `delegation_package_missing`, `delegation_version_mismatch`, `public_export_missing`, or `protocol_mismatch`).

### A.4 Package manifest, closure, and deterministic inventory

The generated `package.json` is exactly this shape, with no unknown fields:

```json
{
  "name": "maister",
  "version": "1.0.0-generated",
  "private": true,
  "description": "Maister workflow package for Pi",
  "pi": {
    "extensions": ["./extensions/maister.ts"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "subagents": {
      "agents": ["./agents"]
    }
  }
}
```

The `pi.subagents.agents` field is the public `pi-subagents` package-agent discovery contract; the generated `agents/` directory is registered there rather than inferred from an undocumented convention. There is no generated `commands/` directory. Package filters, when the operator has supplied them, are preserved in the settings entry; Maister never broadens them silently. A filter that excludes `extensions/maister.ts`, any projected skill, any projected prompt, or any expected agent is incompatible and causes a preflight refusal.

The required closure is: `package.json`, `.maister-source.json`, `agent-projection-v1.json`, `extensions/maister.ts`, all 29 skill directories recursively, all 14 prompt files, all 28 agent descriptors, `common/**`, `lib/**`, `bin/**`, and `orchestrator-framework/**` selected by the overlay inventory. The optional closure is empty in v1. Forbidden paths are `commands/**`, `.git/**`, `node_modules/**`, credentials, auth, trust, session files, `.pi/**` state, any `pi-subagents` source, any other target overlay, and any path outside the generated package root. Files are UTF-8, LF, sorted by bytewise relative POSIX path, with modes fixed by inventory (`0755` directories, `0644` ordinary files, `0700` package root); symlinks are forbidden in generated output.

### A.5 Overlay, semantic bindings, and paths

The Pi overlay is `schema_version: 1`, `overlay_id: maister/pi`, `overlay_version: 1.0.0`, target `pi`, projection `pi.native`, and host constraint `0.80.x`. It contains these closed layout and ownership rows:

| Source | Destination | Kind | Ownership | Mode |
| --- | --- | --- | --- | --- |
| generated package tree | `<agentRoot>/maister/**` | private tree | `plugin_private` | inventory |
| operator settings | `<agentRoot>/settings.json:packages[]` | managed array | `managed_array_entries` | preserve |
| external prerequisite | active Pi package-manager package | reference only | operator-owned | preserve |

`agentRoot` is `PI_CODING_AGENT_DIR` when set, otherwise `$HOME/.pi/agent`; the user-scope settings file is `<agentRoot>/settings.json`; sessions use `PI_CODING_AGENT_SESSION_DIR` and are never managed. `PI_PACKAGE_DIR` is only a host package-root override and is never an ownership destination. v1 supports POSIX paths on macOS/Linux; Windows paths return `platform_unsupported` before mutation. The package root must remain contained under `agentRoot`; an escaping or ambiguous symlink parent is refused.

The six semantic bindings are closed as follows:

| Binding | Input | Output | Adapter | Fail-closed condition |
| --- | --- | --- | --- | --- |
| `user_gate` | gate question, exact options | terminal user choice | existing gate engine through Pi command/extension | no terminal choice |
| `delegate_agent` | frozen role plan, task, cwd | typed delegation observation | `pi.native` | missing public v1 export or identity mismatch |
| `track_progress` | bounded runtime event | Maister event envelope | `execution-event-writer` | durable append failure |
| `resolve_task_root` | Pi process cwd and task path | canonical repository/task root | existing task-root resolver | cwd escapes workspace or is ambiguous |
| `persist_state` | orchestrator transition | `orchestrator-state.yml` update | existing state repository | lock/journal/write failure |
| `continue_workflow` | terminal phase result | next persisted gate | existing phase continuation | no valid next phase or gate |

The extension uses Pi's documented `ExtensionAPI` registration lifecycle and its public `on(event, handler)` / `emit(event, payload)` event bus only. E1 must assert those signatures against Pi 0.80.10; private runner/event-bus imports are forbidden. The extension registers exactly one imperative command, `maister-delegate`, for the `delegate_agent` binding; its input is the frozen dispatch plan and its output is the typed Maister terminal result. It registers no other command, and static resources come from the manifest.

The generated extension entry point is a default export `ExtensionFactory = (pi: ExtensionAPI) => void | Promise<void>`. Registration constructs one `PiDelegationBus` from `pi.events`, whose public methods are `on(channel: string, handler: (data: unknown) => void): () => void` and `emit(channel: string, data: unknown): void`, installs the five public delegation handlers, and registers `pi.on("session_shutdown", (event, ctx) => ...)` for cleanup. Cleanup removes every event-bus listener and rejects any still-pending dispatch as `process_lost`; it never reads Pi session files. The only public command is registered as `pi.registerCommand("maister-delegate", { description, handler: async (args, ctx: ExtensionCommandContext) => ... })`. Its argument is a bounded JSON object containing the frozen dispatch plan; its result is the typed Maister terminal event, not a process-exit inference. The only host-specific code is this binding from `ExtensionAPI`/`ExtensionContext` to the runtime port `{ on, emit, cwd: ctx.cwd, sessionId: ctx.sessionManager.getSessionId() }`; E1 fails if the documented Pi 0.80.10 signatures differ. No Pi private package path, runner, RPC, async directory, or direct `node_modules` filesystem path is imported.

For hermetic E5/E6 discovery, the harness starts Pi with `--no-skills --no-prompt-templates --no-context-files` and explicit package/resource paths, and asserts that every returned `sourceInfo` points to the generated package. `PI_CODING_AGENT_DIR` alone is not treated as isolation because `~/.agents/skills` can remain discoverable; any unrequested resource origin is a collision or an unavailable evidence result.

### A.6 `managed_array_entries_v1` and `pi_local_package_v1`

The owned settings contract is versioned. The settings path is `<agentRoot>/settings.json`, array path is `packages`, and the only managed identity is the generated local package root. Entries must be a string or an object with a string `source`; npm names, Git URLs, URLs, and objects without `source` cannot match the Maister local identity.

Identity normalization is: expand a leading `~` against the current user home; resolve relative paths against the settings file directory; normalize separators and `.`/`..`; apply Unicode NFC; resolve existing symlinks; preserve case (Pi v1 is case-sensitive); remove a trailing separator except for the filesystem root; then compare absolute POSIX paths. The expected identity is the normalized realpath of `<agentRoot>/maister`, and the lexical path is retained for an absent staged path. A symlink that resolves outside `agentRoot` is refused.

The supported package-object fields are exactly `source`, `autoload`, `extensions`, `skills`, `prompts`, and `themes`; all are preserved verbatim, and unknown fields are preserved as opaque operator data but never interpreted by Maister. `autoload: false` is an explicit operator choice and is incompatible with a native-support claim because it prevents discovery. A filter list is compatible only if it contains the complete generated extension, all 29 generated skill roots, all 14 prompt files, and the agent discovery root; a filter that excludes any required resource is `filter_conflict`. This makes string/object equivalence explicit while keeping operator-selected filters authoritative.

If `settings.json` is absent, install creates it with `{"packages":["<lexical package path>"]}` and mode `0600`. If the file exists and `packages` is absent, install adds that property while preserving all other properties. If `packages` is present but not an array, or JSON is malformed, the operation fails before mutation. A matching string remains a string; a matching object remains an object and all unrelated fields are preserved. Object filters are compatible only when they do not exclude any required generated resource. String/object forms are equivalent identities, not conflicting representations; two entries resolving to one identity are duplicates and fail closed. Conflicting filters, two matching members, source changes since preflight, or an operator write between preflight and commit return `duplicate`, `filter_conflict`, `drift`, or `concurrent_write` respectively.

On successful update, only the owned member is inserted/replaced/removed and array order of unrelated members is unchanged. On rejected or rolled-back operations, the original settings bytes, mode, ownership, and topology are restored byte-for-byte. A successful JSON rewrite may change whitespace only under the existing settings serializer contract; the receipt records before/after full-file hashes and an `unmanaged_projection_hash` proving all unrelated values are unchanged. Receipt fields are `ownership_schema: "managed_array_entries_v1"`, `merge_schema: "pi_local_package_v1"`, `settings_path`, `array_path`, `normalized_identity`, `entry_representation`, `entry_before`, `entry_after`, `before_sha256`, `after_sha256`, `unmanaged_projection_sha256`, `mode_before`, `mode_after`, and `backup_ref`.

### A.7 Public delegation v1 adapter and request policy

The only delegation import is the package export `pi-subagents/delegation`. The adapter imports these named exports and no deep path:

```text
SUBAGENT_DELEGATION_PROTOCOL_VERSION
SUBAGENT_DELEGATION_REQUEST_EVENT = "prompt-template:subagent:request"
SUBAGENT_DELEGATION_STARTED_EVENT = "prompt-template:subagent:started"
SUBAGENT_DELEGATION_UPDATE_EVENT = "prompt-template:subagent:update"
SUBAGENT_DELEGATION_RESPONSE_EVENT = "prompt-template:subagent:response"
SUBAGENT_DELEGATION_CANCEL_EVENT = "prompt-template:subagent:cancel"
```

The v1 request shape is closed: `version: 1`, `requestId`, `agent`, `task`, `context`, and `cwd` are required; `model`, `timeoutMs`, `turnBudget`, `toolBudget`, `skill`, `output`, `outputMode`, `acceptance`, and `artifacts` are optional and only populated from the frozen Maister plan. `requestId === dispatch_id`; `context` is `fresh` for ordinary and advisor E6 scenarios; cwd is the resolved task root. Defaults are `timeoutMs=900000`, `turnBudget.maxTurns=8`, `toolBudget.hard=64`, and update limits below. A plan exceeding these bounds is rejected before emission.

The adapter subscribes to started/update/response before emitting request. It emits cancel with the same request ID. A duplicate active request ID is rejected without child side effects. Queued cancellation must yield `cancelled`; active cancellation is best effort, and absence of a terminal response after cancellation is `process_lost`, not success. Process exit 0 without a response is `process_lost`. A retry always allocates a new dispatch/request ID and links `retry_of`; no execution is called resume.

Status mapping is: `completed` plus present, exact matching `response.agent` is a candidate success; `failed`, `timed_out`, `cancelled`, `interrupted`, `turn_budget_exhausted`, `tool_budget_exhausted`, and `acceptance_failed` are typed terminal failures; `invalid_request` and `unavailable_context` are typed unavailable. Missing or wrong `response.agent`, malformed version/request ID, response after a different request, and missing terminal response override any process exit and fail closed. Acceptance `rejected` does not erase execution completion, but E6 semantic evidence requires the configured acceptance policy to pass.

### A.8 `maister-observation-v1` durable event schema

Every dispatch has one Maister-owned JSONL stream. Each record has `schema_version: 1`, `stream_id`, `event_id`, `sequence` starting at zero, `event_type`, `occurred_at` RFC3339 UTC milliseconds, `dispatch_id`, `request_id`, `target: "pi"`, `adapter_id: "pi.native"`, `protocol_version`, `logical_role_id`, `requested_agent`, optional `observed_agent`, `status`, `payload`, `previous_hash`, and `hash`.

Allowed event types are `dispatch_requested`, `started`, `update`, `cancel_requested`, `response_observed`, `terminal`, `failure`, and `process_lost`. Allowed terminal statuses are `completed`, `failed`, `timed_out`, `cancelled`, `interrupted`, `turn_budget_exhausted`, `tool_budget_exhausted`, `acceptance_failed`, `invalid_request`, `unavailable_context`, `identity_mismatch`, `durable_write_failed`, and `process_lost`. `dispatch_requested` is the planned start event and must be durable before any request emission.

Payload bounds are closed: max 128 updates per dispatch, max 16 KiB canonical event bytes, `currentTool` 128 bytes, `currentToolArgs` 2048 bytes, `recentOutput` 4096 bytes, each recent tool pair 1024 bytes, max 16 recent tools, task/output paths represented only as package-relative paths or 64-byte digests, counters as non-negative integers, and warnings max 8 entries of 256 bytes. Strip ANSI/control characters, redact credential-like key/value pairs, replace home/agent/session prefixes with `$PI_AGENT_ROOT`/`$PI_SESSION_ROOT`, and never persist raw transcripts, auth, cookies, or session contents. Over-limit updates are truncated with `truncated: true`; over-limit required request fields are rejected.

Canonical JSON is UTF-8, recursively sorted object keys, original array order, no insignificant whitespace, and a final LF in the JSONL record. `hash = sha256(previous_hash || "\n" || canonical_json(record_without_hash))`; the genesis `previous_hash` is `null`. The writer fsyncs each record and verifies sequence/hash continuity on read. A chain gap, invalid hash, duplicate sequence, or durable append failure is a typed failure; after a pre-request write failure no Pi side effect is allowed, and after a started write failure the adapter emits/returns `durable_write_failed` if possible and never claims success.

### A.9 Evidence envelope and graduated release truth

Every E1-E6 record is `evidence_schema_version: 1` and contains `evidence_id`, `target_id`, `capability`, `result` (`passed`, `failed`, or `unavailable`), `reason` and `remediation` when not passed, `source_commit`, `source_tree_sha256`, `overlay_sha256`, `projection_sha256`, `package_sha256`, `scenario_id`, `scenario_version`, `schema_versions`, executable realpath and version, Node version, `pi-subagents` source identity/version/digest, protocol version, observed_at, expires_at, and artifact references. E1-E4 expire after 30 days; E5-E6 expire after 14 days. Any source/overlay/projection/package/schema/host/prerequisite/scenario change invalidates a pass. A newer failed or unavailable record for the same binding invalidates the prior pass. Unavailable records always include a typed reason and remediation and are never coerced into passes.

Admission is:

| Requested claim | Required result | If E5/E6 unavailable |
| --- | --- | --- |
| registered | E1 passed | no change |
| structural | E1 + E2 passed | no change |
| transactional | E1-E4 passed | no change |
| native + semantic | E1-E6 passed, including the full public delegation v1 lifecycle | publish only `unavailable`, no native or semantic claim |
| provisional package | E1-E4 passed, E5/E6 explicit unavailable | allowed with label `pi.structural-transactional.provisional` |

When both E5 and E6 pass for the same fresh binding, admission publishes `pi.native-semantic` and marks structural/transactional, native discovery, native runtime, and semantic status as passed. A mixed E5/E6 state is rejected. If both native levels are unavailable, the package may remain admitted only under the explicit provisional label.

Missing Pi, Node, auth/readiness, or `pi-subagents` blocks native probes but does not block structural materialization or the transactional settings/package lifecycle when settings validation succeeds. The receipt records E5/E6 as unavailable and the provisional label. Malformed settings, unsafe paths, ownership ambiguity, or transaction failure blocks mutation regardless of host readiness.

### A.10 Transaction, recovery, platform, and release contract

The installer locks `<agentRoot>/.maister.lock`, snapshots the package tree and settings bytes/mode, and writes a journal with phases `prepared`, `staged`, `tree_committed`, `settings_committed`, `verified`, or `unresolved`. It stages on the same filesystem, verifies source hashes and preflight settings hashes, commits the package tree first, then the one settings member, then verifies discovery/receipt. A hash/mode change by another writer between preflight and commit returns `concurrent_write` without mutation. Failure before verification rolls back both owned surfaces; rollback failure preserves backups and returns the existing unresolved recovery status/code 7. No operation may auto-resolve an unresolved journal or overwrite an operator change.

Platform path rules are the ones in A.5. Root directories are `0700`, generated directories `0755`, generated files `0644`, settings mode is preserved on update and `0600` on first creation. Only package identity names, versions, paths after redaction, and typed probe results may enter logs/evidence; auth, trust, session, provider, model credentials, and raw output are excluded. Project `.pi/settings.json`, sessions, and `~/.agents/skills` are operator-owned and are not read as Maister package state.

The Pi archive is a deterministic `.tar.gz` using the repository release adapter: bytewise sorted POSIX entries, fixed `SOURCE_DATE_EPOCH` (required input and recorded), uid/gid zero, empty owner names, inventory modes, normalized LF text, zero gzip mtime, and no xattrs. It contains target closure only. SBOM/provenance lists `pi-subagents` as an external prerequisite with source identity/version, never as an archive member. The extracted lifecycle smoke runs materialize, install, verify, update, uninstall, and fault-injected recovery in the same job and asserts package closure, receipt hashes, settings preservation, and absence of external prerequisite files.

Historical parity fixtures, `parity-baseline.json` inputs, parity-specific release metadata, and active `test-parity-release` gating are removed from the implementation scope. Current admission is exactly `[codex, cursor, kiro-cli, pi]`; target-independent tests remain and are not labelled parity.

### A.11 Traceability matrix

| Requirement / proof | Normative artifact | Required test/evidence |
| --- | --- | --- |
| target/overlay closure | `overlays/pi/overlay.yml`, `inventory.yml` | E1 overlay/schema/topology |
| 29 skills + 14 commands exact-once | `pi-command-projection-v1.json` and A.1 | structural projection/origin fixture, E2 |
| 28 role bijection | `agent-projection-v1.json`, A.2 | E2 projection and E5 discovery/collision |
| package closure | generated `package.json`, inventory, A.4 | archive/tree/SBOM/provenance fixture, E2/E3 |
| settings ownership | `managed_array_entries_v1`, `pi_local_package_v1` | string/object/duplicate/filter/drift/fault tests, E4 |
| transaction/recovery | receipt/journal schemas and A.10 | rollback, unresolved recovery, concurrent-writer tests, E4 |
| public adapter | `pi.native` and A.7 | export/version/request/event/cancel/identity tests, E5/E6 |
| durable events | `maister-observation-v1`, A.8 | ordering, limits, hash-chain, process-loss tests, E6 |
| evidence/release policy | A.9/A.10 | freshness/invalidation/admission/archive/extracted lifecycle tests, E1-E6 |
| historical parity removal | current target set declaration | `make validate`, CI current-target loop, release metadata test |

The implementation log must be `.maister/tasks/development/2026-07-20-first-class-pi-support/implementation/implementation-log.md`. Each intentional current-admission rewrite records old assertion, new assertion, rationale, and the test proving the new current-state contract.
