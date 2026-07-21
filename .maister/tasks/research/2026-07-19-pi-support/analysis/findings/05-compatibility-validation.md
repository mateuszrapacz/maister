# Pi Compatibility and Validation Contract

## TL;DR
Pi can reuse Maister's canonical source, projection, transaction, provenance, event, and release machinery, but it needs a fourth target entry, a Pi package projection, and a `pi-subagents`-backed runtime adapter.
E1-E4 must pass before Pi is structurally supported; E5 may be provisional only when version-bound native discovery is observed; E6 requires a safe role-specific delegation scenario and terminal event/identity evidence.
The current evidence model already fails closed on missing, stale, unavailable, or mismatched native evidence, but all closed target enumerations and three-target fixtures must be parameterized for Pi.
Focused baseline tests passed except the parity-release oracle test, which currently detects an unrelated working-tree baseline mismatch and correctly fails closed.

## Key Decisions
- Define support as graduated levels, never a single boolean: registered, structurally supported, installable, native-discovery verified, native-runtime verified, semantically verified.
- Add Pi to every closed registry/schema/release loop before accepting any Pi evidence record.
- Require `pi` 0.80.10 plus `pi-subagents` 0.35.1 for the first versioned E5/E6 scenario; record any other version combination as unavailable until separately qualified.
- Treat prompt acceptance, extension presence, or version output as discovery inputs only; none can independently pass E5 or E6.
- Keep generated Pi projections out of canonical source and make topology/parity tests reject checked-in behavior duplication.

## Open Questions / Risks
- The native-runtime gatherer must still prove whether `pi-subagents` exposes exact selected identity, durable completion/failure events, cancellation, and resumed inspection; until then E6 is unavailable.
- Pi RPC returns command source metadata, but docs and observed 0.80.10 shapes differ (`sourceInfo` versus illustrated `location/path`); discovery fixtures must tolerate the versioned real schema without weakening identity checks.
- `PI_CODING_AGENT_DIR` does not isolate `~/.agents/skills`; test scenarios must disable ambient discovery and explicitly load fixture resources.
- The repository currently has a parity baseline observation mismatch in `exact-native.mjs`; this is existing concurrent work, not evidence against Pi, but release validation remains red until reconciled.

## Current evidence policy: verified facts

The repository recognizes exactly E1-E6 and results `passed`, `failed`, or `unavailable`; a complete target set contains exactly one record per level. Native E5/E6 passes require complete projection provenance and `provenance.host === target`; unavailable records require a reason (`plugins/maister/lib/distribution/evidence-schema.mjs`, `EVIDENCE_LEVELS`, `validateEvidenceRecord`, `validateEvidenceSet`, lines 5-69 and 241-360). **Fact, high confidence.**

The policy maps E1 overlay, E2 materialization, E3 portable core, E4 installer transaction, E5 native discovery, and E6 native runtime. E1-E4 are always baseline evidence; E5/E6 become required when runtime is available. Semantic, safety, persistence, and rollback classes fail closed; packaging alone may remain provisional when E1-E4 pass and only native evidence is unavailable (`evidence-policy.mjs`, lines 11-24, 104-226). **Fact, high.**

Freshness binds timestamp plus host/version, source/overlay versions, commit, scenario/schema/projector versions, and canonical/manifest/projected-tree digests. Any non-pass result, expiry, or binding change requires renewal (`evidence-policy.mjs`, `evidenceNeedsRenewal`, lines 104-132). **Fact, high.**

The roadmap requires explicit unavailable native outcomes and names the current requirement-to-test and success-criterion suites (`.maister/docs/project/roadmap.md`, lines 3-75). **Fact, high.**

## Four-target resource and behavior gap matrix

| Capability | Codex | Cursor | Kiro CLI | Pi 0.80.10 + subagents 0.35.1 | Pi validation action |
|---|---|---|---|---|---|
| Target registry/root | `.codex/plugins/local/maister`, whole tree | `.cursor/plugins/local/maister`, whole tree | `.kiro-maister` whole tree + `.kiro/agents` leaf set | not registered; package/config roots are Pi-specific | add closed `pi` target and explicit managed package/root ownership |
| Skills | projected plugin skills | projected skills plus Cursor support asset | projected skills | native package `pi.skills`; also ambient `.agents/skills` | Pi manifest fixture; disable ambient skills in tests |
| Commands | plugin/skill host surface | Cursor command/plugin surface | projected CLI-compatible skills | no `commands/` directory; prompt, skill, or extension command | projection tests must assert chosen mapping and RPC origin |
| Agent representation | complete prompt + role output schema, no TOML native agent | one native descriptor per exact Maister ID | descriptor/prompt pairs | `pi-subagents` descriptors/extension convention, not core Pi | new Pi projector/profile and exact external-ID manifest |
| Gates/state | common deterministic JS runtime | same | same | common JS is runnable; Pi command/package entry needed | reuse portable core; package smoke invokes same gate/state modules |
| Native adapter | managed `codex exec` | `cursor.native` | `kiro-cli.native` | absent; must call installed subagents rather than emulate | add `pi.native` only after public/observable contract is proven |
| Event stream | managed JSONL + durable Group 5 stream | adapter observations normalized | adapter observations normalized | Pi RPC JSONL; subagent event durability unresolved | normalize to existing event schema; missing terminal = failure |
| Exact identity | schema-bound logical ID | observed native ID required | observed native ID required | command source visible; child identity proof unresolved | wrong/unobservable child ID => unavailable/failed, no fallback |
| Install/lifecycle | transactional whole-tree | transactional whole-tree | whole-tree + leaf-set | Pi package declaration plus package files; settings operator-owned | Pi-specific fixture for merge/rollback/uninstall preservation |
| Evidence/release | E1-E6 schema supported | supported | supported | schema currently rejects `pi` as unknown | expand schema/fixtures and produce target-aware archive/smoke |

Current three-target facts come from `targets.mjs` lines 6-39, `agent-projection.test.mjs` tests “projects an exact canonical bijection…” and host-specific projection tests, and `agent-adapters.test.mjs` exact-native scenarios. Pi host facts come from finding 02 and the installed v0.80.10 package/RPC probe. **Fact where stated; Pi design rows are recommendation, high/medium confidence.**

## Pi capability/evidence matrix

| Level | Pi scenario and required proof | Must not count | Current status |
|---|---|---|---|
| E1 `overlay-contract-v1` | Pi overlay schema, complete required inventory, ownership, semantic bindings, safe destinations, no foreign topology | a hand-written installed package without canonical bindings | unavailable until overlay exists |
| E2 `materialize-v1` | deterministic projection from canonical roles/skills/commands into Pi package, exact manifest, hashes/modes/order, no source mutation | checked-in generated projection or manual copy | unavailable |
| E3 `portable-core-v1` | fresh portable-core attestation bound to source tree/commit and consumed by package/installer | target-local reimplementation | reusable producer; new Pi binding required |
| E4 `installer-transaction-v1` | staged package/settings delta, committed integrity, receipt/journal, rollback/recovery/uninstall preserving operator keys | successful `pi install` alone | unavailable until lifecycle fixture passes |
| E5 `native-discovery-v1` | executable realpath/version 0.80.10, Node, auth readiness where needed, installed subagents 0.35.1, exact required agent IDs/resources, RPC/control availability, complete provenance | `pi --version`, package presence, prompt acceptance | host/resource discovery partly observed; native identity inventory pending |
| E6 `native-runtime-v1` | safe versioned delegation for ordinary role(s) and advisor; exact requested/observed IDs, request bounds, terminal result, event chain, policy, cancellation/failure observations, fresh digests | interactive text, self-reported identity, accepted RPC prompt, silent inline result | unavailable pending native probe |

**Recommendation (high):** initially publish E5/E6 as `unavailable` with precise reasons, not failed, when prerequisites/scenarios are absent. Use `failed` only after a versioned scenario starts and violates identity, behavior, policy, event, timeout, or provenance assertions.

## Requirement-to-test traceability

| Requirement group | Existing suites to parameterize for `pi` | Pi-specific additions |
|---|---|---|
| R1-R6 / SC1-SC2: canonical IR, projection, identity | `overlay-contract`, `agent-projection`, `agent-resolver`, `repository-topology`; restore/run `agent-ir` suite referenced by roadmap if file location changed | Pi descriptor/prompt/skill transform fixtures; exact external-ID coverage; no Pi behavior source outside canonical + overlay |
| R7-R12 / SC3-SC6: deterministic materialization/registry | `source-materializer`, `target-registry`, `agent-projection` | fourth-target counts, package manifest and command-origin assertions, deterministic independent projections |
| R13-R16 / SC10-SC11: adapters/semantic bindings | `agent-adapters`, `agent-execution-events`, `overlay-contract` | `pi.native` availability, exact launch/identity, RPC malformed/terminal/cancel paths, no generic/inline fallback |
| R17-R22 / SC7-SC9: install/ownership/recovery | `target-registry`, `installer-transaction`, `repository-topology` | preserve unrelated `settings.json` keys/packages; package identity dedupe; auth/session untouched; rollback after settings/package failure |
| R23-R28 / SC10: resolution/events/gates | `agent-resolver`, `agent-adapters`, `agent-execution-events`, `gate-evaluator` | untrusted project, missing extension, missing agent, stale receipt, wrong ID, no terminal event, resumed event inspection |
| R29-R31 / SC12-SC13: evidence | `evidence-parity-topology`, `installer-transaction` | Pi E1-E6 fixtures; 0.80.10/0.35.1 provenance; version/digest/scenario renewal; typed unavailable reasons |
| R32-R35 / SC14-SC15: packaging/release/topology | `make-interface`, `parity-release`, `release-package`, `repository-topology` | Pi archive, checksum/SBOM/provenance, extracted install/update/verify/uninstall smoke, four-target parity oracle |

This grouping preserves the roadmap's exact mappings rather than redefining requirements (`roadmap.md`, “Unified projections requirement-to-test inventory”). **Recommendation, high confidence.**

## Proposed parameterized tests

1. Change all literal target arrays and expected registry loops from three targets to `SUPPORTED_TARGET_IDS`; update exact expected counts intentionally (`agent-projection.test.mjs` currently has `TARGETS = ["codex","cursor","kiro-cli"]` and canonical/support counts at lines 29 and 113-118).
2. Add Pi required inventory and allowed topology to `overlay-contract.test.mjs`; retain unknown fields, unsafe destinations, collisions, foreign-host vocabulary, ownership, and semantic fail-closed cases.
3. Extend materializer/projection tests for byte-identical independent Pi builds, complete canonical coverage, stable modes/hashes/order, and hand-edit rejection.
4. Extend resolver/runtime composition registry with `pi.native`, preserving the one plan/one terminal shape and exact manifest lookup.
5. Run installer lifecycle and evidence-set assertions for Pi using the same generic helpers; keep Pi settings mutation in a fixture root only.
6. Extend release loops, archive names, checksums, SBOM inventory, extracted lifecycle smoke, and immutable parity oracle to all four targets.

## Required Pi-specific and negative tests

- Missing `pi`, unsupported host version, missing Node requirement, missing `pi-subagents`, or absent authentication/readiness => typed `unavailable`; never passed E5.
- Ambient `~/.agents/skills` shadowing a Maister ID => collision/failure; test harness uses `--no-skills` plus explicit fixture path.
- RPC `success:true` without terminal subagent observation => E6 unavailable/failed; process exit 0 alone is insufficient.
- Unknown agent, wrong observed ID, self-reported-only ID, duplicate ID, or alternate/similar role => terminal failure; zero retry to another identity and zero inline/root fallback.
- Missing durable pre-dispatch record prevents Pi invocation; post-launch record failure requests cancellation and never reports success.
- Timeout, malformed JSONL, process non-zero, extension error, missing terminal event, stale session/event cursor, and cancellation-unobservable paths retain observations and fail closed.
- Older passed E5/E6 followed by newer unavailable/failed, changed host/subagents/scenario/digest, or expiry => renewal/blocked, preventing stale evidence reuse.
- A generated Pi agents/skills/prompts/package tree checked into a forbidden source location, or support inventory satisfying canonical completeness, fails repository topology and projection tests.
- Installer update/uninstall preserves byte-exact unrelated Pi settings, packages, auth, sessions, trust, models, and ambient skills; injected failure rolls back both package and managed settings delta.
- E1-E4 structural success with E5/E6 unavailable may yield only packaging `provisional`; semantic/safety/persistence/rollback claims remain blocked.

These negatives mirror existing tests such as “dispatcher never uses an inline…fallback,” wrong observed identity, malformed/missing terminal streams, freshness renewal, structural evidence cannot satisfy native support, and fail-closed semantic capabilities (`agent-resolver.test.mjs`, `agent-adapters.test.mjs`, `agent-execution-events.test.mjs`, `evidence-parity-topology.test.mjs`). **Recommendation, high confidence.**

## CI and release gates

1. **PR structural gate:** build/check Pi overlay; target registry, overlay, IR/projection, materializer, topology, runtime composition, evidence schema.
2. **Portable evidence gate:** fresh E3 producer plus Pi E1/E2 records; reject dirty/generated ownership and digest drift.
3. **Lifecycle gate:** isolated Pi package install/verify/update/uninstall/rollback/recovery with fresh E4 and unchanged operator state.
4. **Native environment gate:** opt-in runner with pinned Pi/subagents versions and safe credentials/model; collect E5/E6 or explicit unavailable. Never fabricate pass on runners lacking prerequisites.
5. **Release gate:** four deterministic archives, checksums, CycloneDX inventory, reproducibility provenance, extracted lifecycle smoke, complete evidence set, and immutable four-target parity comparison.
6. **Claim gate:** publish support terminology from evaluated capability status, not target registry presence.

`make-interface.test.mjs` already asserts projection/target/evidence/topology/release wiring and rejects unsafe E3 commands; `release-package.test.mjs` covers target-aware extracted lifecycle/runtime smoke; `parity-release.test.mjs` protects the immutable oracle. **Fact, high confidence.**

## Support-level terminology

| Term | Minimum condition | Allowed claim |
|---|---|---|
| Registered | closed target/schema recognizes `pi` | internal target known; no functionality claim |
| Structurally supported | fresh passed E1-E3 | deterministic Pi artifact exists; not install/native claim |
| Installable/transactional | fresh passed E1-E4 | supported install/update/uninstall/recovery in isolated lifecycle |
| Native-discovery verified | fresh passed E5 for exact version set | required Pi/subagent identities and controls observed |
| Native-runtime verified | fresh passed E6 versioned scenario | exact native dispatch and terminal observation proven |
| Semantically verified | E1-E6 plus role-specific behavior/parity scenario with zero unresolved differences | full capability claim for the tested version/scenario |
| Provisional packaging | E1-E4 pass, E5/E6 explicitly unavailable | package may ship as provisional; native/semantic claims forbidden |
| Unsupported/unavailable | prerequisite or safe scenario absent | explicit reason and remediation only |

## Focused verification run

Command: `rtk node --test` over target-registry, overlay-contract, source-materializer, agent-projection, agent-resolver, agent-adapters, agent-execution-events, evidence-parity-topology, release-package, and parity-release suites on 2026-07-19. All observed structural/runtime/evidence tests passed except `parity-release.test.mjs` test “the parity release gate compares all targets to the immutable oracle,” which failed closed with `E_PARITY_BASELINE_OBSERVATION` for `exact-native.mjs`. A focused rerun reproduced 1 pass/1 fail. **Observation, high confidence.** No production source or active Pi configuration was modified.

Overall confidence is **high** for the validation architecture and E1-E6 requirements, **medium** for Pi E5 feasibility, and **low-to-medium** for E6 until the native-runtime gatherer supplies direct identity/event/cancellation evidence.
