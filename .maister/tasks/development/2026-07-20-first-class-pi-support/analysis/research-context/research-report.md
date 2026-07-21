# Research Report: First-Class Pi Support for Maister

## TL;DR
Maister should add `pi` as a fourth first-class target delivered as one generated local Pi package, with all behavior still owned by canonical Maister sources.
Native agents should run through the public `pi-subagents/delegation` v1 event contract; Maister must retain exact role resolution, append-before-side-effect recording, terminal identity verification, and its durable hash-chained event stream.
The default install should own only `~/.pi/agent/maister/**` plus one identity-managed `packages` member, while active Pi, `pi-subagents`, settings, auth, sessions, trust, and other packages remain operator-owned.
The initial verified tuple is active Pi 0.80.10, Node 25.9.0, and `pi-subagents` 0.35.1. Research proves feasibility, but the product remains unsupported until the Pi overlay, projection, installer, adapter, and E1-E6 evidence are implemented.

## Key Decisions
- Register `pi` as a real target with adapter `pi.native`; do not model it as a Codex/Kiro alias or an unmanaged companion install.
- Materialize one deterministic Pi package at `~/.pi/agent/maister/`, generated from canonical skills, commands, common runtime, and all 28 canonical agents.
- Use `pi-subagents/delegation` protocol v1 for native foreground execution. Keep `resolveAgent` and `readExecutionEventStream` owned by Maister.
- Add identity-aware `managed_array_entries` ownership for exactly one local package declaration; never own the whole `packages` array and never call `pi install` inside the Maister transaction.
- Keep `pi-subagents` external and operator-owned; verify exact configured identity/version and fail closed when absent, ambiguous, incompatible, or inactive.
- Keep the immutable historical parity oracle scoped to Codex, Cursor, and Kiro CLI; admit Pi through a separate greenfield all-target gate.
- Make support claims graduated and evidence-driven: registered → structural → transactional → native discovery → native runtime → semantic.

## Open Questions / Risks
- The future Maister package must prove that `pi-subagents` discovers all 28 package-local, namespaced descriptors without being shadowed by ambient project/user agents.
- Command projection needs a reviewed per-command mapping to Pi prompt, skill, or extension origin; Pi has no standalone `commands/` resource directory.
- Foreground delegation has no public durable replay or same-run resume. Process loss after `started` must become a typed terminal failure while preserving Maister history.
- `managed_array_entries` is a new receipt/drift/rollback primitive and must be adversarially tested before any active settings mutation.
- Active Pi can update independently from the user package tree. Version/evidence resolution must follow the executable realpath and invalidate stale E5/E6.
- Current historical parity validation has an unrelated `exact-native.mjs` baseline mismatch; release remains blocked until that concurrent drift is resolved.

## 1. Answer to the research question

The smallest safe design is a **generated Pi target package plus a thin public delegation bridge**, not a Pi-specific rewrite of Maister and not a bundled fork of `pi-subagents`.

```text
plugins/maister canonical sources
  ├─ skills / commands / common runtime / 28 agents
  └─ overlays/pi + Pi projection rules
                 │ deterministic materialization
                 ▼
~/.pi/agent/maister/                  Maister-owned whole_tree
  ├─ package.json                     Pi resources manifest
  ├─ extensions/maister.ts            host + delegation bridge
  ├─ skills/**                        projected canonical skills
  ├─ prompts/**                       selected command views
  ├─ agents/maister-*.md              projected exact-native roles
  └─ portable runtime/lib/bin closure
                 │ protocol v1 request/start/update/response/cancel
                 ▼
operator-owned pi-subagents 0.35.1 on active Pi 0.80.10
                 │ exact observed agent + bounded result
                 ▼
Maister exact-native adapter + durable execution event stream + E5/E6
```

This design preserves the repository's one-source projection invariant, existing three-method runtime port, transactional ownership, and fail-closed evidence policy. It is supported by the core contract [F1](../analysis/findings/01-maister-core-contract.md), verified host behavior [F2](../analysis/findings/02-pi-host-contract.md), native probes [F3](../analysis/findings/03-pi-subagents-native-runtime.md), distribution analysis [F4](../analysis/findings/04-distribution-installation.md), and validation model [F5](../analysis/findings/05-compatibility-validation.md). **Recommendation, high confidence.**

## 2. Verified, version-bound Pi host contract

| Contract element | Verified baseline | Design consequence | Confidence / source |
|---|---|---|---|
| Active executable | `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/bin/pi`, Pi 0.80.10 | Evidence and adapter preflight bind to resolved executable realpath/version | High; F2 PHC-1, F3 scope, F4 DI-1 |
| Node | 25.9.0; active Pi engine requires `>=22.19.0` | Installer validates engine/runtime compatibility | High; F2 baseline, F4 scope |
| Stale package copy | user npm tree contains coding-agent 0.79.10 but it is not the PATH executable | Never infer host version from arbitrary `~/.pi/.../node_modules` presence | High; F2 version mismatch, F3 scope |
| Native extension | configured `pi-subagents` 0.35.1; dev baseline uses Pi 0.80.10, Pi peers are optional `*` | Initial supported tuple is exact, not an inferred wildcard range | High; installed package metadata, F2/F3/F4 |
| User root | `PI_CODING_AGENT_DIR` or `~/.pi/agent`; sessions may be separately overridden | Resolve active settings/package roots explicitly; never capture sessions/auth | High; F2 configuration roots |
| Distribution unit | Pi package with explicit `pi` manifest or conventional extensions/skills/prompts/themes | Install one local Maister package; no scattered shared leaves | High; F2 resource contract, F4 §1 |
| Command inventory | commands originate from extension registration, prompt filenames, or skills; no package `commands/` primitive | Every canonical command needs an explicit projection origin | High; F2 resource table and PHC-2 |
| Automation | print, JSONL, RPC and SDK exist; RPC has typed command responses and `get_commands` | Use RPC for host/resource E5 discovery; do not confuse prompt acceptance with terminal agent success | High; F2 automation and PHC-3 |
| Project trust | project settings/resources require trust; headless modes do not prompt | Default to user-scope package; future project scope must be explicit | High; F2/F4 settings contract |
| Ambient discovery | `PI_CODING_AGENT_DIR` does not suppress `~/.agents/skills` | Hermetic tests require `--no-skills` plus explicit fixture paths | High; F2 PHC-2 |

**Contradiction resolved.** The planning premise of Pi 0.79.10 is superseded by reproducible active runtime observations. Version-matched upstream v0.80.10 resolves to commit `8dc78834cde4e329284cf505f9e3f99763df5529`; the nested 0.79.10 copy remains a split-host negative-test fixture, not a compatibility baseline. [F2, “Evidence baseline and version resolution”](../analysis/findings/02-pi-host-contract.md) **Fact, high confidence.**

## 3. Target, overlay, and generated package

### 3.1 Registry and overlay contract

Add `pi` to the central distribution registry only in the same change that adds:

- `plugins/maister/overlays/pi/overlay.yml` and `inventory.yml`;
- projection identity `pi.native`, a closed Pi representation, transforms, destination templates, modes, and execution profiles;
- all six fail-closed semantic bindings: `user_gate`, `delegate_agent`, `track_progress`, `resolve_task_root`, `persist_state`, `continue_workflow`;
- E1-E6 requirements, host probe, executable probe, managed roots, and required/optional/forbidden topology;
- runtime adapter/native port registration, evidence target closure, Make/CI/package loops, and tests.

A registry-only patch must fail. Today these contracts are independently closed in `targets.mjs`, `overlay-loader.mjs`, `agent-projection-v1.json`, `agent-manifest.mjs`, `agent-projector.mjs`, runtime owner/factory modules, release interfaces, and parity tests. [F1 §§1-2](../analysis/findings/01-maister-core-contract.md) **Fact/recommendation, high confidence.**

### 3.2 Installed package layout

Recommended user-scope tree:

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

The whole tree is `plugin_private` / `whole_tree`; Pi's package manifest exposes only supported Pi resource kinds (`extensions`, `skills`, `prompts`). The package-private `agents/` directory is consumed through the verified `pi-subagents` package-agent discovery path, which must be proven for the final package in E5. Pi core itself has no `agents` manifest kind. [F2 resource contract](../analysis/findings/02-pi-host-contract.md), [F3 discovery](../analysis/findings/03-pi-subagents-native-runtime.md), [F4 §2](../analysis/findings/04-distribution-installation.md) **Recommendation, medium-high confidence.**

The deterministic package manifest should use a stable package identity, `type: module`, a `pi` manifest, and Pi core as an unbundled peer. `pi-subagents` remains an external prerequisite unless lifecycle testing proves the public export cannot resolve from a separately configured package; such failure would be a design escalation, not permission to deep-import its internals. [F4 §§1-2](../analysis/findings/04-distribution-installation.md) **Recommendation, medium-high confidence.**

## 4. Canonical projection rules

### 4.1 Skills

1. Canonical skill directories remain behavior owners under `plugins/maister/skills/` and common source.
2. Materialization copies or explicitly transforms each selected skill into package-local `skills/<id>/SKILL.md`, preserving referenced assets, safe relative paths, modes, and hashes.
3. The Pi package manifest declares only the generated `./skills` root; no generated Pi skill becomes canonical source.
4. Collisions with ambient/user/project skills are detected during E5; tests disable ambient discovery and load only fixture paths.
5. Support-only Pi helpers cannot satisfy canonical skill or agent completeness.

These rules reuse the materializer's canonical-source/provenance sequence and Pi's recursive skill discovery. [F1 §§1.3-1.4](../analysis/findings/01-maister-core-contract.md), [F2 resource discovery](../analysis/findings/02-pi-host-contract.md) **Recommendation, high confidence.**

### 4.2 Commands and prompts

Pi has no standalone `commands/` resource. Add a closed mapping per canonical command:

| Command semantics | Pi projection | Rule |
|---|---|---|
| Reusable workflow/instruction with progressive loading | Skill command | Prefer when the canonical unit is already a skill or needs assets/references |
| Textual parameterized entry point that expands into a prompt | Prompt template | Generate `prompts/maister-<command>.md`; filename is invocation identity |
| Imperative host integration, status, installation, or bridge control | Extension command | Register in `extensions/maister.ts`; keep handler thin and call portable core |

RPC `get_commands` must observe the expected source metadata for every projected command. A Markdown file is not automatically a prompt merely because it can be copied; the mapping is part of the overlay/projection contract and test fixtures. [F2 PHC-2 and command resource row](../analysis/findings/02-pi-host-contract.md), [F4 §2.3](../analysis/findings/04-distribution-installation.md) **Recommendation, high confidence for the rule; medium for individual mappings.**

### 4.3 All 28 canonical agents

1. Extend the closed projection contract so every canonical role row has a Pi execution profile; preserve exact 28-role bijection and source digest.
2. Generate one descriptor per role under `agents/`, using a namespaced runtime external ID such as the canonical `maister:<role>` identity. The descriptor contains projected prompt/policy metadata, never a second hand-maintained body.
3. Map the existing policy classes—read-only, read-only-shell, workspace-write—to Pi/subagent descriptor tools, model/reasoning constraints, context mode, timeout/budget, and acceptance metadata. Unsupported enforcement causes resolver preflight failure.
4. Declare only allowlisted deterministic transforms, destinations, file modes, and references. Reject missing roles, duplicates, unsafe paths, normalized collisions, undeclared transforms, foreign host vocabulary, or support assets covering canonical roles.
5. `resolveAgent` selects the exact projected `native_role_external_id`; the delegation terminal must independently return the byte-exact same `response.agent` before success.
6. E5 enumerates all 28 effective identities in the installed scope and rejects any higher-precedence shadow/collision. E6 exercises at least an ordinary read-only role and the advisor role.

Current projection closure and canonical completeness are directly enforced by `agent-projection-v1.json`, `agent-manifest.mjs`, `agent-projector.mjs`, `agent-projection-validator.mjs`, and passing projection suites. Pi-subagents parses descriptor frontmatter and merges builtin/package/user/project definitions; the final package-scoped discovery remains a required E5 proof. [F1 §1.4](../analysis/findings/01-maister-core-contract.md), [F3 “Discovery agentów i tożsamość”](../analysis/findings/03-pi-subagents-native-runtime.md) **Recommendation, high confidence for invariants; medium-high for final descriptor shape.**

## 5. Native-agent runtime adapter

### 5.1 Verified public contract

`pi-subagents/delegation` exports protocol v1 request/start/update/response/cancel events. Requests carry exact agent, task, cwd, fresh/fork context and optional model, timeout, turn/tool budgets, skill/output/acceptance/artifact controls. Responses distinguish completed, failed, timed out, cancelled, interrupted, budget exhaustion, acceptance failure, invalid request, and unavailable context, and may carry run ID, observed agent, model, exit code, output, paths, and metrics. [F3 public surface; installed `src/api/delegation.ts:1-158`](../analysis/findings/03-pi-subagents-native-runtime.md) **Fact, high confidence.**

The decisive probe on 2026-07-19 emitted `started`, bounded `update` events, then `status=completed`, `runId=1b25ec38`, `agent=researcher`, effective model, exit 0, and exact output `NATIVE_API_OK`. A public unknown-agent request returned typed `status=failed`; queued cancel returned typed `status=cancelled`. The process-local background provider returned only active provider/id/session tuples. [F3 P2-P5](../analysis/findings/03-pi-subagents-native-runtime.md) **Observation, high confidence.**

### 5.2 Adapter sequence

1. `resolveAgent` remains unchanged in shape: validate target paths, projection/receipt/provenance, exact logical role, policy, host/version and capability preflight; return a frozen plan with `adapter_id=pi.native` and exact external identity.
2. The Pi native port resolves the active executable realpath/version, Node, configured/active `pi-subagents` identity/version, protocol v1 availability, authentication/readiness needed by the selected model, and exact agent discovery. Missing capability returns `unavailable`.
3. Before any request emission, append a durable Maister `dispatch_started`/attempt event. If this write fails, do not launch Pi.
4. Subscribe to response before emitting. Set delegation `requestId = dispatch_id`, exact `agent`, task, cwd, context and supported controls; launch through the public event contract, not a parent model tool call.
5. Map `started` and sanitized/bounded `update` fields into the existing Maister event schema. Do not persist raw session transcripts, unbounded tool args, credentials, or private paths.
6. On terminal response, map extension status to typed adapter observation. Require `response.agent === plan.native_role_external_id`; missing or wrong identity is failure even if process exit and text appear successful.
7. Append terminal observation/result durably, then return the standard dispatch terminal. `readExecutionEventStream` reads only Maister's private hash-chained task stream.
8. On cancellation or terminal-write failure after launch, emit v1 cancel with the same request ID; record cancellation request/outcome. If cancellation cannot be observed, never report success.

This preserves the existing `createAgentRuntime()` three-method port and `createExactNativeAdapter` semantics, including no generic/inline fallback and best-effort cancellation after record failure. [F1 §1.6](../analysis/findings/01-maister-core-contract.md), [F3 adapter boundary](../analysis/findings/03-pi-subagents-native-runtime.md) **Recommendation, high confidence.**

### 5.3 Explicit runtime limits

- Public foreground delegation offers no replay/read-after-restart or same-run resume. Maister can resume workflow reasoning from its own event stream, but a lost child execution is terminally failed and a retry is a new dispatch.
- `pi-subagents/background-work` is not an event store; it exposes process-local active IDs/session only.
- Internal `src/extension/rpc.ts`, async `status.json`/`events.jsonl`, and deep package paths are unsupported adapter dependencies despite internal protocol labels.
- Parent-facing `subagent(...)` is not an adapter API: the unknown-agent tool path returned `isError:false`, whereas public delegation returned typed failure.

[F3 public surfaces, P3 and capability matrix](../analysis/findings/03-pi-subagents-native-runtime.md) **Fact/recommendation, high confidence.**

## 6. Installation, settings ownership, receipts, and recovery

### 6.1 Ownership boundary

| State | Owner | Maister behavior |
|---|---|---|
| `~/.pi/agent/maister/**` | Maister | One `plugin_private` / `whole_tree` root; stage, replace, verify, drift-check, uninstall transactionally |
| Exact package membership resolving to `~/.pi/agent/maister` | Maister | One identity-aware managed array member |
| `settings.json` file and all other keys/package entries | Pi/operator | Snapshot for rollback; preserve unrelated semantic values/order; never claim whole file/array |
| Active `pi` executable/global package | Operator/toolchain | Read-only realpath/version/engine preflight |
| Configured `pi-subagents` and its files | Pi/operator | Read-only prerequisite; never bundle/update/remove |
| auth, sessions, trust, models/providers, ambient skills | Pi/operator | Never own, archive, log, or restore as Maister state |
| `$XDG_STATE_HOME/maister/pi/**` | Maister | Private lock, staging, journals, backups, receipts and active pointer |

[F4 §3](../analysis/findings/04-distribution-installation.md) **Recommendation, high confidence.**

### 6.2 New `managed_array_entries` contract

Current `managed_keys` replaces a whole dotted JSON value and cannot own one `packages` member safely. Add a closed ownership form conceptually equivalent to:

```yaml
settings:
  - path: .pi/agent/settings.json
    format: json
    ownership: managed_array_entries
    array_path: packages
    identity: pi_local_package_v1
    entries:
      - source: ./maister
    merge_policy: preserve_unmanaged_refuse_drift
```

The identity algorithm must match Pi: resolve local paths relative to the settings file and treat string `"./maister"` and object `{source:"./maister", ...filters}` as the same package identity. Duplicates, an operator-owned conflicting object, or drift in the owned member fail before mutation. Receipt data records array path, normalized identity, exact installed entry, merge algorithm version, before/after file hashes and modes, and backup reference. [F4 §4.2](../analysis/findings/04-distribution-installation.md) **Recommendation, high confidence.**

### 6.3 Lifecycle

1. Resolve/revalidate one immutable local/archive/GitHub source and select its Pi overlay.
2. Read-only probe the active Pi and configured subagents tuple.
3. Materialize the complete package and 28-role projection in empty same-filesystem staging.
4. Reject unmanaged private root, symlink/path collision, settings identity collision, unsafe manifest, or incompatible prerequisite.
5. Snapshot roots, exact settings bytes/mode, active receipt, and recovery metadata.
6. Atomically replace the private tree, then merge exactly one managed package member.
7. Verify all receipt-owned bytes/modes/links and package membership; produce E4 and optionally E5/E6.
8. Publish receipt only after integrity succeeds.

Update repeats drift checks and preserves prior receipt. Uninstall removes only the exact member and owned tree. Any failure restores exact settings bytes/mode, prior tree topology and active receipt; unresolved recovery state remains durable. Do not call `pi install`, whose package/settings sequence is not the Maister journaled multi-root transaction. [F4 §§1.2,4.3](../analysis/findings/04-distribution-installation.md) **Recommendation, high confidence.**

## 7. Greenfield admission and historical parity

The immutable parity oracle represents legacy trees migrated for Codex, Cursor, and Kiro CLI. Pi has no pre-migration tree, so adding a fabricated Pi row would make the oracle dishonest. Split target sets:

- `MIGRATED_PARITY_TARGET_IDS = [codex, cursor, kiro-cli]` for immutable historical shadow parity;
- `SUPPORTED_TARGET_IDS = [codex, cursor, kiro-cli, pi]` for registry, overlay, projection, materialization, install, runtime, evidence, archive, extracted lifecycle, topology, and release admission.

Pi passes a greenfield admission gate requiring deterministic source projection, canonical completeness, lifecycle/rollback, native capability evidence, archive reproducibility, and no foreign-target leakage. Existing targets continue to pass both the historical and all-target gates. [F1 historical parity](../analysis/findings/01-maister-core-contract.md), [F4 §6](../analysis/findings/04-distribution-installation.md) **Recommendation, high confidence.**

## 8. Evidence and support levels E1-E6

| Level | Required Pi evidence | Research status | Product claim now |
|---|---|---|---|
| E1 overlay | valid closed Pi overlay/inventory/ownership/semantic bindings | design only | unavailable |
| E2 materialization | deterministic package + exact 28-role/skill/command projection, hashes/modes/order | design only | unavailable |
| E3 portable core | fresh source/commit-bound portable attestation consumed by Pi build | existing producer reusable; Pi binding absent | unavailable for Pi |
| E4 installer | staged tree/settings member, receipt/journal, verify/update/uninstall/rollback/recovery | primitives proven; array ownership absent | unavailable |
| E5 native discovery | executable realpath 0.80.10, Node, active subagents 0.35.1, protocol/control, exact 28 IDs, command origins, collision-free provenance | host/package partial proof; not 28 projected roles | unavailable |
| E6 native runtime | versioned safe ordinary-role + advisor scenarios, exact request/observed IDs, terminal result, durable Maister event chain, failure/cancel cases | researcher delegation feasibility proven; adapter/provenance absent | unavailable |

Support vocabulary:

| Level | Minimum | Allowed claim |
|---|---|---|
| Registered | target/schema recognizes `pi` | internal target known only |
| Structurally supported | fresh passed E1-E3 | deterministic package exists |
| Installable/transactional | fresh passed E1-E4 | lifecycle supported in isolated roots |
| Native-discovery verified | fresh passed E5 for exact tuple | resources/identities/controls discovered |
| Native-runtime verified | fresh passed E6 scenario | exact native dispatch verified |
| Semantically verified | E1-E6 plus role-specific behavior/parity with no unresolved differences | full claim for tested tuple/scenario |
| Provisional packaging | E1-E4 passed; E5/E6 explicitly unavailable | package may ship, native/semantic claim forbidden |
| Unsupported/unavailable | prerequisite or safe scenario absent | explicit reason/remediation only |

Evidence freshness must bind host/subagents versions, source/overlay/commit, scenario/schema/projector versions, canonical/manifest/projected-tree digests and timestamp. Any tuple/digest/scenario change or later failure/unavailability renews or blocks earlier E5/E6. [F5 evidence policy and support terminology](../analysis/findings/05-compatibility-validation.md) **Fact/recommendation, high confidence.**

## 9. Four-target gap matrix

| Area | Codex | Cursor | Kiro CLI | Pi target action | Classification |
|---|---|---|---|---|---|
| Registry/root | whole-tree plugin | whole-tree plugin | private tree + agent leaf set | private local package + managed settings member | Pi adapter required |
| Overlay/inventory | present | present | present | add closed Pi contract | Pi projection required |
| Skills | canonical projection | canonical + support | canonical projection | package `pi.skills`, ambient collision checks | Reuse + Pi projection |
| Commands | plugin/skill surface | Cursor surface | CLI-compatible skills | explicit prompt/skill/extension mapping | Pi projection required |
| 28 agents | prompt profiles | native descriptors | descriptor/prompt pairs | namespaced subagents descriptors | Pi projection required |
| Gates/state | portable core | portable core | portable core | same portable core via package command/skill | Reuse unchanged |
| Native runtime | managed codex exec | `cursor.native` | `kiro-cli.native` | `pi.native` → delegation v1 | Pi adapter + extension prerequisite |
| Exact identity | schema-bound/managed | observed exact | observed exact | terminal `response.agent` exact match | Reuse invariant |
| Event stream | durable Maister | normalized adapter | normalized adapter | normalize process events into Maister stream | Reuse + Pi adapter |
| Install | whole tree | whole tree | multi-root | tree + one array member | New ownership primitive |
| Settings | target-private | target-private | target/native roots | shared operator JSON with managed member | Pi-specific transaction |
| Evidence | E1-E6 | E1-E6 | E1-E6 | extend target closure and scenarios | Parameterize + Pi probes |
| Packaging | deterministic archive | deterministic archive | deterministic archive | selected Pi assets + external prerequisite provenance | Parameterize |
| Historical parity | legacy oracle | legacy oracle | legacy oracle | no legacy row; greenfield admission | Separate gate |

Current target facts and closed assumptions: [F1](../analysis/findings/01-maister-core-contract.md). Pi host/runtime/install facts and recommendations: [F2](../analysis/findings/02-pi-host-contract.md), [F3](../analysis/findings/03-pi-subagents-native-runtime.md), [F4](../analysis/findings/04-distribution-installation.md). **Confidence: high except final descriptor/command details, medium-high.**

## 10. Requirements-to-test traceability

| Requirement | Existing suites to parameterize | Pi-specific acceptance/negative tests |
|---|---|---|
| R1-R6 canonical IR/projection/identity | `overlay-contract`, `agent-ir`, `agent-projection`, `agent-resolver`, `repository-topology` | exact 28-role Pi bijection; namespaced IDs; profiles; no behavior copies; missing/duplicate/wrong transform fails |
| R7-R12 deterministic registry/materialization | `target-registry`, `source-materializer`, `agent-projection` | fourth-target counts; byte-identical builds; manifest/command origins; safe paths/modes/hashes |
| R13-R16 adapters/semantic bindings | `agent-adapters`, `agent-runtime-composition`, `agent-execution-events`, `overlay-contract` | `pi.native` availability; public v1 launch; unknown/wrong/missing ID; malformed/duplicate/timeout/cancel; no inline fallback |
| R17-R22 ownership/lifecycle | `target-registry`, `installer-transaction`, `repository-topology` | string/object package identity dedupe; preserve unrelated settings/order; drift refusal; injected rollback/recovery; auth/session untouched |
| R23-R28 resolution/events/gates | `agent-resolver`, `agent-adapters`, `agent-execution-events`, `gate-evaluator` | durable write before launch; post-launch write failure cancels; lost terminal fails; resumed read uses Maister stream only |
| R29-R31 evidence | `evidence-parity-topology`, `installer-transaction` | exact 0.80.10/0.35.1 tuple; 28-ID E5; ordinary+advisor E6; freshness/renewal; typed unavailable prerequisites |
| R32-R35 package/release/topology | `make-interface`, `release-package`, `parity-release`, `repository-topology` | Pi archive/checksum/SBOM/provenance; extracted lifecycle; no foreign assets; three-target legacy + four-target greenfield gates |

Additional mandatory negatives:

- missing `pi`, unsupported Node/Pi, inactive or ambiguous `pi-subagents`, missing auth/readiness → typed unavailable;
- ambient skill/agent shadowing → collision, never alternate identity;
- RPC prompt accepted without terminal delegation response → not E6;
- process exit 0 without typed terminal/identity → failure;
- stale E5/E6 after executable, extension, scenario or digest change → renewal/block;
- generated Pi behavior checked into forbidden canonical/source topology → test failure;
- E1-E4 alone → at most provisional packaging.

[F5 traceability and negative tests](../analysis/findings/05-compatibility-validation.md), updated with the completed F3 native probes. **Recommendation, high confidence.**

## 11. Staged implementation slices

### Slice 0 — contract migration and parity split

Implement central target enumeration reuse, Pi schema identity, projection contract migration, and separate migrated-parity/all-target admission sets.

**Acceptance:** registry-only Pi fails; existing three targets remain byte/evidence compatible; legacy oracle is unchanged; all-target greenfield gate recognizes Pi; focused baseline is green after resolving unrelated drift.

### Slice 1 — Pi overlay, package, and canonical projections

Add overlay/inventory/assets, deterministic package manifest, skill/command mapping, and all 28 Pi agent profiles/descriptors.

**Acceptance:** exact canonical bijection; deterministic independent builds; RPC sees expected command origins; package/subagents discovery sees all 28 exact names; no checked-in behavior duplication or foreign assets.

### Slice 2 — settings ownership and transactional lifecycle

Add `managed_array_entries`, receipt schema migration, drift detector, merge/unmerge, journal snapshots, rollback/recovery and user-scope Pi target paths.

**Acceptance:** local/archive/GitHub installs produce equivalent package/receipts; unrelated settings/packages/auth/sessions remain untouched; identity collisions and drift fail before mutation; injected failures restore exact prior bytes/modes/tree/receipt.

### Slice 3 — `pi.native` runtime bridge

Add host adapter/native port, public delegation v1 bridge, host/subagents preflight, exact identity mapping, sanitization, terminal classification and cancellation.

**Acceptance:** successful projected role returns exact observed ID; unknown/wrong/missing ID, timeout, malformed response, process loss, no terminal and unavailable prerequisites fail typed; event write before launch is enforced; no parent-tool, inline, or alternate-agent fallback.

### Slice 4 — E1-E6 probes and capability policy

Add Pi host/resource E5 and ordinary-role/advisor E6 scenarios, version/digest freshness, collision and cancellation cases.

**Acceptance:** exact tuple evidence passes only on complete observations; unavailable runners emit reasons; stale evidence cannot satisfy support; research probe is reproduced through the production adapter and Maister event chain.

### Slice 5 — release, CI, docs, and extracted lifecycle

Parameterize Make/CI/release loops, Pi archive/checksum/SBOM/provenance, extracted install/update/verify/uninstall/recovery, and support-level documentation.

**Acceptance:** reproducible four-target releases; selected target assets only; external Pi/subagents tuple recorded but not bundled; legacy parity still covers three migrated targets; claims match evaluated evidence level.

### Slice 6 — semantic qualification

Run role-specific behavior suites for representative read-only, read-only-shell, workspace-write, advisor and orchestrator paths.

**Acceptance:** no unresolved semantic differences for the declared scenario; gates/state/resume remain portable; only then publish “semantically verified” for the exact tuple.

## 12. Risks, unsupported outcomes, and confidence

| Risk / unknown | Consequence | Mitigation | Confidence |
|---|---|---|---|
| Package-local 28-agent discovery differs from builtin probe | E5 cannot prove exact projected identities | Isolated final-package discovery test; fail unavailable | Medium |
| Public export resolution across Pi package roots | bridge may not import delegation contract | lifecycle smoke with configured packages; no deep import/bundling without explicit escalation | Medium-high |
| Active cancellation/process loss semantics | orphan or missing terminal | bounded read-only tests, cancel correlation, Maister terminal timeout/failure | Medium |
| Ambient resource shadowing | wrong skill/agent identity | namespace, explicit E5 inventory, hermetic flags, collision failure | High |
| Array merge schema bug | operator settings corruption | implement before target install; adversarial transaction and exact rollback tests | High |
| Independent host updates | stale support claim | bind freshness to executable/package tuple and scenario | High |
| Internal subagents API temptation | brittle coupling | allow only package exports; topology/import lint tests | High |
| Historical parity mismatch | release gate remains red | resolve concurrent baseline drift; never weaken oracle for Pi | High |

Explicitly unsupported for the first release: private subagents RPC/async-file coupling, automatic `pi-subagents` installation/removal, project-scope install without separate trust design, Pi-native durable foreground resume, and semantic/full-parity claims without fresh E1-E6 plus role scenarios.

Overall recommendation confidence is **high** for the architecture and staged plan, **medium-high** for package-local agent discovery/import mechanics pending implementation tests, and **unavailable** for a product support claim today.

## Sources

- [F1 — Maister Core Contract](../analysis/findings/01-maister-core-contract.md): tracked source and focused tests at commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`.
- [F2 — Pi Host Contract](../analysis/findings/02-pi-host-contract.md): active Pi 0.80.10, Node 25.9.0, v0.80.10 docs/source and isolated package/RPC probes.
- [F3 — Pi Subagents Native Runtime](../analysis/findings/03-pi-subagents-native-runtime.md): installed `pi-subagents` 0.35.1 exports/source and successful/negative/cancel/background probes.
- [F4 — Distribution and Installation](../analysis/findings/04-distribution-installation.md): Pi package/settings contract, current transaction code and isolated safety tests.
- [F5 — Compatibility and Validation](../analysis/findings/05-compatibility-validation.md): E1-E6 policy, four-target gaps, traceability, focused baseline validation.
- [Version-matched Pi source v0.80.10](https://github.com/earendil-works/pi/tree/v0.80.10/packages/coding-agent), accessed 2026-07-19.
- Installed exact-version sources under `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/`, especially `package.json`, `src/api/delegation.ts`, `src/api/background-work.ts`, `src/slash/prompt-template-bridge.ts`, and `src/slash/delegation-adapters.ts`.

No active Pi settings, credentials, sessions, installed package files, or Maister production sources were modified during research.
