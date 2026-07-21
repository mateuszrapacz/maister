# Synthesis: First-Class Pi Support

## TL;DR
Pi może zostać czwartym pełnoprawnym targetem Maister bez reimplementacji subagentów: wymaga wygenerowanego pakietu Pi, cienkiego bridge’a do publicznego `pi-subagents/delegation` v1 oraz zachowania resolvera i trwałego event streamu po stronie Maister.
Autorytatywny baseline to aktywne Pi 0.80.10 na Node 25.9.0 z `pi-subagents` 0.35.1; kopia coding-agent 0.79.10 w user npm tree jest nieaktywna i nie może wiązać evidence.
Największe nowe elementy to czwarta projekcja 28 agentów, bezpieczne zarządzanie pojedynczym wpisem tablicy `packages`, oraz osobna greenfield admission zamiast fałszowania historycznego parity oracle.
Research potwierdził natywną delegację, dokładną tożsamość, typed unknown-agent failure i cancellation, ale oficjalne E5/E6 pozostają niedostępne do czasu implementacji targetu i scenariusza evidence.

## Key Decisions
- Add `pi` as a real fourth target with adapter ID `pi.native`, not as an alias or optional unmanaged sidecar.
- Install one Maister-owned local Pi package under `~/.pi/agent/maister/`; keep the active Pi executable, auth, sessions, settings outside the owned entry, and `pi-subagents` operator-owned.
- Generate Pi skills, command views, and all 28 namespaced agent descriptors from canonical sources during materialization; never check in duplicate behavior bodies.
- Use public `pi-subagents/delegation` v1 for foreground native dispatch. Keep `resolveAgent` and the durable hash-chained `readExecutionEventStream` in Maister.
- Add identity-aware `managed_array_entries` ownership for exactly one Pi package membership; do not claim the whole `packages` array and do not invoke `pi install` inside the Maister transaction.
- Preserve the immutable historical parity oracle for Codex/Cursor/Kiro and create a greenfield admission matrix for every supported target, including Pi.
- Publish graduated support levels from E1-E6 evidence; successful research probes do not by themselves authorize a product support claim.

## Open Questions / Risks
- Pi-subagents package-agent discovery for a separately installed Maister local package must be verified for all 28 namespaced identities; the research proved builtin `researcher`, not the future projected set.
- The exact command-by-command split between prompt templates, skills, and extension commands remains a projection design task; Pi has no native `commands/` directory.
- Public foreground delegation has no durable replay/resume API. A lost Pi process after `started` must terminate as typed failure while Maister retains its own event history.
- Ambient `~/.agents/skills` and higher-precedence project/user agents can shadow resources. E5 must detect collisions and the test harness must disable ambient discovery.
- The current repository has an unrelated parity baseline mismatch for `exact-native.mjs`; release validation remains red until that concurrent drift is resolved.

## Evidence-to-decision synthesis

| Evidence pattern | Convergent sources | Decision | Confidence |
|---|---|---|---|
| Target, projection, runtime and release schemas are independently closed over three targets | `01-maister-core-contract.md` §§1-2; tracked `targets.mjs`, `overlay-loader.mjs`, `agent-manifest.mjs`, runtime and release tests at commit `debc79d…` | Add Pi atomically across registry, overlay, 28-role projection, runtime, evidence, packaging and tests | High |
| Active PATH executable is Pi 0.80.10; nested 0.79.10 is stale | `02-pi-host-contract.md`, PHC-1; `03-pi-subagents-native-runtime.md` “Zakres i wersje”; `04-distribution-installation.md` DI-1 | Bind initial compatibility/evidence to Pi 0.80.10 + Node 25.9.0 + subagents 0.35.1 | High |
| Pi package is the native distribution unit; no core commands directory exists | `02-pi-host-contract.md` resource table and PHC-2; v0.80.10 package/prompt/skill/RPC docs | Generate one explicit Pi package; project commands to prompt/skill/extension origins | High |
| Public delegation v1 exposes exact identity and terminal/progress events | `03-pi-subagents-native-runtime.md` P2-P4; installed `src/api/delegation.ts` and bridge mapping | Use delegation v1 as the only subagent execution boundary | High |
| Delegation events are process-local and background-work is only active IDs/session | `03-pi-subagents-native-runtime.md` public surface, P5 | Preserve Maister-owned durable execution stream and do not deep-import async internals | High |
| Existing settings owner cannot own one array member safely | `04-distribution-installation.md` §4.2; `overlay-loader.mjs` and `settings-owner.mjs` | Introduce closed identity-aware managed-array ownership before Pi install | High |
| Legacy parity oracle can never truthfully contain greenfield Pi | `01-maister-core-contract.md` §§2,4; `04-distribution-installation.md` §6 | Separate migrated-target historical parity from all-target greenfield admission | High |
| Current evidence policy already models E1-E6 and fails closed | `05-compatibility-validation.md`, evidence policy and roadmap mapping | Reuse evidence schema/policy, extend target closure and add Pi scenarios | High |

## Contradictions resolved

1. **Runtime 0.79.10 vs 0.80.10.** Planning/source catalog initially treated `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent` 0.79.10 as the host. Three independent runtime checks resolved `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/bin/pi` and observed 0.80.10. Per the source precedence rule, executable behavior wins; 0.79.10 remains only a split-host risk. **Resolution confidence: high.**
2. **RPC vs delegation API.** Host research recommended Pi RPC as the initial subprocess automation port; native-runtime research later found the more specific, exported `pi-subagents/delegation` v1 contract. RPC remains useful for host/resource discovery and command inventory, while delegation v1 is the native-agent launch boundary. **Resolution confidence: high.**
3. **E6 unknown vs demonstrated.** Compatibility research predated the native probe and marked E6 feasibility low. P2 then proved exact `agent=researcher`, terminal result, updates and cancel on the version tuple. This raises feasibility to high, but official E6 remains unavailable because no Pi target adapter/projection/provenance-bound scenario exists. **Resolution confidence: high.**
4. **Four-target parity oracle vs greenfield admission.** Compatibility wording suggested extending the immutable oracle to four targets, conflicting with core/distribution findings. The oracle represents pre-migration trees and cannot truthfully include Pi. Retain it for three migrated targets; make four-target admission a separate gate. **Resolution confidence: high.**
5. **Direct dependency vs external prerequisite.** Pi package isolation could tempt bundling `pi-subagents`. Its public exported event API is consumable by Pi extensions and the native probe succeeded with the operator-installed package. Keep it external; only revisit bundling if a packaged bridge cannot resolve the public export in an isolated lifecycle test. **Resolution confidence: medium-high.**

## Cross-source architecture pattern

```text
Canonical Maister source
  ├─ skills / commands / 28 agents / common runtime
  └─ Pi overlay + projection rules
          │ materialize deterministically
          ▼
~/.pi/agent/maister/  (Maister whole_tree)
  ├─ package.json → extensions, skills, prompts
  ├─ extensions/maister.ts
  ├─ skills/*
  ├─ prompts/*
  └─ agents/maister-*.md
          │ public event contract v1
          ▼
operator-owned pi-subagents 0.35.1 on active Pi 0.80.10
          │ started / update / response / cancel
          ▼
Pi native port → exact-native adapter
          │ append-before-side-effect + terminal append
          ▼
Maister-owned hash-chained execution events and E5/E6 evidence
```

This shape follows the canonical/projection boundary in `01`, the verified package contract in `02`, the smallest runtime boundary in `03`, the ownership design in `04`, and the fail-closed evidence model in `05`. **Recommendation, high confidence.**

## Capability gaps after synthesis

- **Closed by research:** host/version resolution; package resources; headless/RPC inventory; exact foreground delegation; observed identity; progress; typed unknown-agent failure; queued cancellation; process-local background snapshot behavior.
- **Implementation gaps:** Pi registry/overlay; 28-role projection; extension bridge; managed array entry ownership; receipts and recovery delta; Pi probes/evidence producers; release archive and CI loops.
- **Verification gaps:** discovery of all projected namespaced agents; active cancellation under process failure; restart/lost-terminal handling; ambient collision detection; package-export resolution from the installed Maister package; role-specific advisor scenario.
- **Explicitly unsupported in v1:** Pi-native durable replay/resume of foreground delegation, direct use of private subagents RPC/async files, automatic installation/removal of `pi-subagents`, and full semantic parity claims before E1-E6 plus role-specific tests.

## Confidence assessment

- **Overall architecture:** high. All five categories converge on the same canonical package + thin native adapter + Maister-owned evidence design.
- **Host/package contract:** high for Pi 0.80.10/Node 25.9.0/subagents 0.35.1; medium for other versions.
- **Native adapter feasibility:** high for foreground dispatch and identity; medium for failure recovery across process loss.
- **Installer design:** high for private tree and transaction reuse; medium-high until `managed_array_entries` is implemented and adversarially tested.
- **Semantic support:** unavailable today. Research proves feasibility, not product admission.

## Artifact index

- `analysis/findings/01-maister-core-contract.md` — canonical source, projection/runtime closures, historical parity.
- `analysis/findings/02-pi-host-contract.md` — active 0.80.10 host, package/resource/RPC contract.
- `analysis/findings/03-pi-subagents-native-runtime.md` — delegation v1 probes and three-method mapping.
- `analysis/findings/04-distribution-installation.md` — package tree, settings ownership, lifecycle and provenance.
- `analysis/findings/05-compatibility-validation.md` — E1-E6, gap and test strategy.
- `outputs/research-report.md` — implementation-ready recommendation.
