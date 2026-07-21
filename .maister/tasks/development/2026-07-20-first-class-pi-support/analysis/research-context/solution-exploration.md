# Solution Exploration: First-Class Pi Support

## TL;DR
Five material decisions were explored through HMW/SCAMPER divergence and evaluated from technical feasibility, user impact, simplicity, risk, and scalability perspectives.
The strongest coherent solution is a private generated Pi package, hybrid prompt/skill projection, a thin `pi.native` adapter over public delegation v1, identity-aware ownership of one package-array entry, and greenfield admission layered beside frozen historical parity.
Maister remains owner of canonical roles, resolution, policy, durable events, receipts, and evidence; Pi owns host loading and `pi-subagents` owns child execution.
The design is deliberately version-bound and graduated: E1-E4 establish installable structure, while E5/E6 require fresh observed native capability.

## Key Decisions
- Package/discovery: install one deterministic private Pi package with an explicit `pi` manifest.
- Projection: use skills for workflow capabilities, prompts for command-like templates, and an extension only for imperative runtime bridging.
- Native bridge: call public `pi-subagents/delegation` v1 for dispatch only; keep resolver and durable event stream in Maister.
- Ownership: manage exactly one normalized `packages[]` member and the private package tree; preserve all other Pi state.
- Admission/release: retain the three-target historical oracle and add all-target greenfield gates, deterministic Pi archives, and evidence-driven claims.

## Open Questions / Risks
- Cancellation and resumed inspection are not full public delegation-v1 capabilities; the first adapter must report them as unsupported/unavailable instead of inventing semantics.
- Exact prompt-versus-skill mapping needs a reviewed per-command table, although the governing rule is clear.
- Pi RPC/source metadata differs between documentation and observed 0.80.10 behavior; fixture schemas must be version-bound.
- Array-entry transactions introduce a reusable ownership primitive whose normalization and rollback rules need exceptionally strong negative tests.

## Method and evaluation frame

HMW questions opened the space: How might Maister become Pi-native without a second source of truth? How might commands feel native without turning every command into code? How might native agents be delegated without surrendering identity, policy, and auditability? How might installation own one package while preserving operator state? How might Pi join releases without rewriting a historical three-target migration oracle?

SCAMPER generated substitutes (loose resources versus package), combinations (skills plus prompts plus bridge), adaptations (exact-native port and leaf ownership), eliminations (no bundled subagents, no generic fallback), and reversals (admit a target through greenfield evidence rather than retroactively changing historical parity). Each alternative is assessed on five perspectives: **T**echnical feasibility, **U**ser impact, **S**implicity, **R**isk, and **Sc**alability, scored 1–5 where 5 is best.

## Decision Area 1 — Package and discovery integration

Why it matters: this boundary decides whether Pi support is deterministic and receipted or dispersed across mutable user directories.

### Alternative 1A — One private generated Pi package (recommended)

Materialize a complete target package under a Maister-private root with an explicit `package.json#pi` manifest for extensions, skills, and prompts. Add exactly one local package identity to Pi settings; Pi performs discovery, while Maister owns bytes and lifecycle.

- **Pros:** atomic ownership; deterministic hashing/archive; native discovery metadata; clean uninstall; no behavior duplication.
- **Cons:** needs package-array ownership and a Pi projector; local package source is less conventional than an npm release.
- **Evidence alignment:** matches Pi package probing, distribution finding 04, canonical materialization, receipts, and sourceInfo observation.
- **Assumptions:** Pi continues to support local package paths and explicit manifests; private root is stable and trusted.
- **5-perspective:** T5 / U4 / S4 / R5 / Sc5.
- **Confidence:** high.

### Alternative 1B — Loose global resources

Install extension, skills, and prompts directly into `~/.pi/agent/{extensions,skills,prompts}`. Discovery is immediate and requires no package declaration, but Maister must own leaves across shared operator directories.

- **Pros:** easy to understand; minimal Pi package machinery; direct `/reload` behavior.
- **Cons:** collision-heavy; fragmented receipts; difficult drift/uninstall; shared-directory mutation; weaker provenance unit.
- **Evidence alignment:** Pi supports these locations, but Maister architecture favors contained whole-tree ownership.
- **Assumptions:** leaf-level ownership can be made race-safe across three shared roots.
- **5-perspective:** T4 / U3 / S2 / R2 / Sc2.
- **Confidence:** high that feasible, high that inferior.

### Alternative 1C — Publish/bundle a self-contained npm package including subagents

Ship Maister and `pi-subagents` as one npm-distributed unit and let `pi install` manage it. This maximizes conventional Pi installation but transfers dependency mutation and package availability into the critical lifecycle.

- **Pros:** familiar Pi UX; one external version spec; portable across machines.
- **Cons:** duplicates operator-installed subagents; expands supply-chain/rollback scope; external publishing prerequisite; conflicts with operator ownership.
- **Evidence alignment:** Pi supports npm packages, but dry-run analysis shows bundling duplicates a separately versioned dependency.
- **Assumptions:** publishing, peer resolution, and offline reproducibility can be controlled.
- **5-perspective:** T3 / U5 / S3 / R2 / Sc4.
- **Confidence:** medium.

**Recommendation:** choose **1A** because it is the only option that simultaneously preserves canonical ownership, deterministic release artifacts, native Pi discovery, and transactional uninstall.

## Decision Area 2 — Command and skill projection strategy

Why it matters: Pi has no native `commands/` directory; slash behavior arises from prompt templates, skill commands, or extension registration.

### Alternative 2A — Hybrid semantic projection (recommended)

Project reusable workflows as Pi skills, simple command-shaped text expansions as prompt templates, and only imperative host actions as extension commands. Maintain a closed mapping table so each canonical command has one intentional Pi representation and RPC `get_commands` verifies origin.

- **Pros:** uses each primitive for its intended semantics; minimal executable code; preserves progressive disclosure; testable origin metadata.
- **Cons:** three projection transforms; mapping review required; users see both `/name` and `/skill:name` forms.
- **Evidence alignment:** directly matches Pi host contract and existing semantic-binding/projection machinery.
- **Assumptions:** every canonical command can be classified without ambiguous dual registration.
- **5-perspective:** T5 / U4 / S4 / R5 / Sc5.
- **Confidence:** high for rule, medium-high for exact mapping.

### Alternative 2B — Everything as prompt templates

Render every command as a Markdown prompt template and keep skills only where already canonical. This produces simple slash commands but pushes multi-step workflows and policy into always-expanded prompt text.

- **Pros:** uniform invocation; smallest extension surface; simple file projection.
- **Cons:** loses skill progressive disclosure/assets; weak fit for complex workflows; risks oversized prompts and semantic drift.
- **Evidence alignment:** Pi prompt templates are native, but Maister skills carry structured references and scripts that templates cannot faithfully replace.
- **Assumptions:** command behavior is mostly textual and needs no skill resources.
- **5-perspective:** T4 / U5 / S5 / R3 / Sc3.
- **Confidence:** medium.

### Alternative 2C — Everything as extension commands

Register every slash command from one TypeScript extension and load canonical content programmatically. This centralizes command naming and can reproduce arbitrary behavior, but converts declarative workflows into executable host code.

- **Pros:** exact command UX; centralized collision handling; imperative flexibility.
- **Cons:** large trusted-code surface; behavior-bearing projection; harder parity review; needless runtime coupling.
- **Evidence alignment:** technically supported by `registerCommand`, but contradicts minimal implementation and single-source projection goals.
- **Assumptions:** code generation can remain mechanically equivalent and safely audited.
- **5-perspective:** T4 / U5 / S2 / R2 / Sc3.
- **Confidence:** high that feasible, high that not preferred.

**Recommendation:** choose **2A** and make the mapping a closed versioned semantic contract, with collisions and duplicate registrations failing before materialization.

## Decision Area 3 — Native bridge shape

Why it matters: Maister needs exact native child execution without reimplementing subagents or giving an extension authority over resolution, durable state, and evidence.

### Alternative 3A — Thin direct-import delegation adapter (recommended)

Implement `pi.native` as a thin wrapper over public `pi-subagents/delegation` v1: Maister resolves the exact role, writes durable dispatch intent, and calls `delegate()` with bounded task/cwd/agent. The adapter maps returned events/results into Maister's hash-chained stream; unsupported cancellation/resume are declared explicitly.

- **Pros:** public API; exact selected agent and structured event trail; smallest bridge; keeps policy/evidence with Maister.
- **Cons:** process-local API; cancellation/resume gaps; requires bridge execution in a module environment that resolves operator package peers.
- **Evidence alignment:** successful installed delegation probe, public export, and synthesis decision that delegation owns dispatch only.
- **Assumptions:** delegation v1 remains available for the supported version tuple; runtime can safely import it.
- **5-perspective:** T5 / U4 / S5 / R4 / Sc4.
- **Confidence:** high for dispatch, medium for operational integration.

### Alternative 3B — Parent-facing Pi tool/RPC mediation

Invoke the subagent extension through Pi's registered parent tool or RPC prompt and infer completion from parent-visible events. This stays fully inside Pi's host lifecycle but inserts model/command mediation between Maister and the child.

- **Pros:** natural Pi integration; no direct package import; can reuse active session UI.
- **Cons:** identity/result detail loss; prompt acceptance is not terminal success; harder deterministic policy and evidence; model-dependent routing.
- **Evidence alignment:** foreground tool probe launches a child, but the research explicitly observed loss of deterministic detail.
- **Assumptions:** future RPC exposes stable subagent-specific terminal events and identity.
- **5-perspective:** T3 / U5 / S3 / R2 / Sc3.
- **Confidence:** medium-low.

### Alternative 3C — Maister-owned child-process reimplementation

Spawn Pi child agents directly using copied/internal subagents logic and own concurrency, identity, cancellation, and event transport. This could fit Maister's runtime port perfectly but ceases to rely on the installed native extension.

- **Pros:** maximum control; durable event semantics can be designed exactly; independent cancellation/resume.
- **Cons:** duplicates `pi-subagents`; unstable internal dependencies; large maintenance/security surface; violates explicit project direction.
- **Evidence alignment:** conflicts with public-boundary and no-reimplementation conclusions.
- **Assumptions:** internal APIs remain stable or can be continually tracked.
- **5-perspective:** T2 / U3 / S1 / R1 / Sc2.
- **Confidence:** high that it should be eliminated.

**Recommendation:** choose **3A**. The ownership seam is explicit: Maister owns `resolveAgent`, request validation, durable before/after events, cancellation request semantics, and evidence; delegation v1 owns the child launch and result/event observation it actually exposes.

## Decision Area 4 — Settings and package ownership

Why it matters: Pi's `packages` setting is a shared array, while Maister's current shared-settings model owns keys rather than one identity-normalized member.

### Alternative 4A — Identity-aware managed array entries (recommended)

Extend transaction metadata with a closed `managed_array_entries` rule for one normalized Pi package identity. Install/update/uninstall compare the owned member and its before/after bytes while preserving order and byte-exact unrelated entries and settings.

- **Pros:** narrowest ownership; transactional rollback; reusable for shared list settings; detects string/object aliases and drift.
- **Cons:** new transaction primitive; normalization/order semantics are subtle; requires extensive rejection tests.
- **Evidence alignment:** directly answers finding 04's proven model gap and Pi's package dedupe identity rules.
- **Assumptions:** identity normalization can be closed and versioned for local/npm/git forms.
- **5-perspective:** T4 / U5 / S4 / R4 / Sc5.
- **Confidence:** high.

### Alternative 4B — Own the complete `packages` key

Treat `packages` as a managed key, snapshot the whole array, and merge operator entries during lifecycle. This reuses current managed-key machinery but makes Maister authoritative over an operator-owned package registry.

- **Pros:** little schema work; straightforward snapshot/restore.
- **Cons:** ownership too broad; concurrent package edits become conflicts; uninstall/rollback can overwrite user intent.
- **Evidence alignment:** technically compatible with current transaction code, but violates explicit operator ownership.
- **Assumptions:** Pi packages never change outside Maister during lifecycle.
- **5-perspective:** T5 / U2 / S4 / R1 / Sc2.
- **Confidence:** high that it is unsafe.

### Alternative 4C — Never touch settings; require manual operator registration

Install only the private package bytes and instruct the operator to add/remove its local path manually. This avoids shared-file mutation but splits install completion and makes receipts unable to prove discoverability.

- **Pros:** zero shared settings ownership; reversible package bytes; minimal installer change.
- **Cons:** not first-class; error-prone; lifecycle cannot be atomic; E4/E5 ambiguous; poor uninstall UX.
- **Evidence alignment:** safe but falls short of the requested first-class support and transactional guarantees.
- **Assumptions:** operators accept a mandatory manual step and maintain exact identity.
- **5-perspective:** T5 / U1 / S3 / R4 / Sc2.
- **Confidence:** high.

**Recommendation:** choose **4A**, with fail-before-mutation tests for duplicates, aliases, normalized collisions, unsupported object shapes, drift, symlinks, and concurrent edits.

## Decision Area 5 — Greenfield admission and release architecture

Why it matters: the existing shadow-parity oracle records a historical three-target migration boundary; rewriting it to pretend Pi existed would destroy its meaning.

### Alternative 5A — Dual-track historical parity plus greenfield admission (recommended)

Freeze the three-target historical parity oracle and add Pi through all-target registry, overlay, projection, lifecycle, evidence, topology, and release matrices. Pi publishes only when its deterministic archive and E1-E4 pass; native/semantic claims follow fresh E5/E6 for the pinned version tuple.

- **Pros:** preserves historical evidence; clean fourth-target architecture; graduated claims; deterministic releases; no retroactive fiction.
- **Cons:** two conceptually distinct gate families; documentation must explain their roles; CI matrix expands.
- **Evidence alignment:** matches synthesis, roadmap evidence policy, and finding 05 admission recommendation.
- **Assumptions:** release tooling can require both the historical gate and all-target greenfield gates.
- **5-perspective:** T5 / U4 / S4 / R5 / Sc5.
- **Confidence:** high.

### Alternative 5B — Expand the historical parity oracle to four targets

Add Pi rows to the immutable legacy comparison and require it to match historical host behavior. This yields one apparent parity gate but invents a legacy Pi baseline and entangles greenfield transforms with migration-era artifacts.

- **Pros:** one headline parity matrix; superficially uniform release process.
- **Cons:** corrupts oracle semantics; requires fabricated baseline; encourages generated/history artifacts; false equivalence.
- **Evidence alignment:** contradicts architecture's migration boundary and explicit accumulated decision.
- **Assumptions:** a defensible historical Pi source can be produced, which evidence does not support.
- **5-perspective:** T2 / U3 / S3 / R1 / Sc2.
- **Confidence:** high that it should be rejected.

### Alternative 5C — Ship Pi experimentally outside the main release matrix

Publish a separate preview package or manual installation path with minimal target registration and defer deterministic archive/evidence integration. This accelerates user testing but creates a side channel that can become a second distribution architecture.

- **Pros:** fastest feedback; isolates early instability; lower initial CI cost.
- **Cons:** weak receipts/provenance; inconsistent UX; risk of permanent experimental debt; support claims become ambiguous.
- **Evidence alignment:** packaging may be provisional with E5/E6 unavailable, but E1-E4 still need the normal architecture.
- **Assumptions:** preview distribution can be strictly time-boxed and non-authoritative.
- **5-perspective:** T4 / U3 / S2 / R2 / Sc2.
- **Confidence:** medium.

**Recommendation:** choose **5A**. A Pi archive may be labeled provisional only after E1-E4; `registered`, `structurally supported`, `installable`, `native-discovery verified`, `native-runtime verified`, and `semantically verified` remain distinct release claims.

## Cross-area 5-perspective comparison

| Decision | Recommended alternative | T | U | S | R | Sc | Dominant reason |
|---|---|---:|---:|---:|---:|---:|---|
| Package/discovery | 1A private package | 5 | 4 | 4 | 5 | 5 | deterministic ownership and native discovery |
| Command/skill projection | 2A hybrid semantics | 5 | 4 | 4 | 5 | 5 | lowest executable surface with faithful workflows |
| Native bridge | 3A delegation v1 | 5 | 4 | 5 | 4 | 4 | public boundary and exact observable dispatch |
| Settings ownership | 4A managed array entry | 4 | 5 | 4 | 4 | 5 | transactional narrow ownership |
| Admission/release | 5A dual-track gates | 5 | 4 | 4 | 5 | 5 | preserves history while admitting greenfield target |

The recommended alternatives reinforce one another: the private package supplies stable discovery identities; the hybrid projection limits code; the extension bridge delegates rather than reimplements; the settings primitive owns only the package membership; and greenfield evidence binds all those artifacts to versioned claims.

## Recommended implementation sequence

1. Admit `pi` in closed target/schema/test loops and define the private package overlay plus projection profile.
2. Implement deterministic skills/prompts/28-agent projection and package manifest generation.
3. Add `managed_array_entries` and Pi lifecycle fixtures before wiring active discovery.
4. Add `pi.native` around delegation v1, preserving Maister resolver and durable events; expose unsupported cancellation/resume honestly.
5. Add E1-E6 scenarios, deterministic Pi archive/extracted lifecycle, and greenfield release gates while leaving historical parity unchanged.

## Deferred ideas

- **Npm marketplace publication:** valuable after local/archive/GitHub lifecycle is stable; deferred because it adds publisher authenticity and external release governance.
- **Vendored `pi-subagents`:** could improve hermeticity, but deferred/rejected until an operator-owned prerequisite proves inadequate; current evidence favors avoiding duplication.
- **Full background resume/cancel control:** revisit when public `pi-subagents` APIs expose durable IDs and cancellation; do not depend on internal event buses/RPC today.
- **Generic multi-host array-entry framework:** the primitive should be reusable, but broad adoption beyond Pi is a separate design/research task.
- **Ambient cross-harness skill federation:** Pi already discovers `.agents/skills`; intentionally coordinating that ecosystem is outside first-class Maister target support.

## Evidence basis and confidence

The alternatives are grounded in `analysis/synthesis.md`, `outputs/research-report.md`, findings 01–05, and project vision/architecture/roadmap/tech-stack. High-confidence observations cover Pi 0.80.10 resource/RPC behavior, installed `pi-subagents` 0.35.1 delegation v1, Maister's canonical projection/transaction/evidence contracts, and deterministic release requirements; medium-confidence details are explicitly limited to exact command mapping and operational import/cancellation mechanics.
