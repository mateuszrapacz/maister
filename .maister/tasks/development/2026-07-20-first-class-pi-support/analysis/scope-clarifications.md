# Phase 2: Scope Clarifications

## TL;DR
Five decisions freeze the smallest safe Pi implementation boundary before specification work.
The recommended scope keeps canonical behavior in Maister, projects Pi semantics explicitly, owns one package registration, uses only public delegation v1, and separates provisional packaging from native/semantic evidence.
Each decision is independent and must be answered separately even though they are presented together in one batch.

## Key Decisions
- Use one generated user-scope Pi package at `~/.pi/agent/maister/` and keep external `pi-subagents` operator-owned.
- Use hybrid semantic projection with an explicit closed command map.
- Add identity-aware `managed_array_entries` ownership for exactly one local package identity.
- Use a thin direct-import `pi-subagents/delegation` v1 adapter with no fallback or private API dependency.
- Use current-state all-target admission with graduated Pi evidence claims.

## Open Questions / Risks
- These are the remaining Phase 2 scope decisions; changing one may expand the implementation plan and test matrix.
- Package-agent discovery for all 28 roles and public export resolution from an installed local package remain empirical acceptance gates.
- Process loss after a foreground delegation starts cannot be replayed by Pi v1 and must be represented as a durable typed failure.

## Decision 1 — Generated package layout

**Question:** Which Pi distribution unit should v1 implement?

**Options (ordered):**

1. `One private generated Pi package (Recommended)` — materialize one deterministic package under `~/.pi/agent/maister/` with extensions, skills, prompts, agents, and private runtime closure.
2. `Loose global resources` — install scattered resources into Pi's global roots, increasing ownership and collision risk.
3. `Self-contained npm package including subagents` — bundle the external native-agent dependency, increasing duplication and lifecycle risk.
4. `Need more info` — pause scope resolution.

**Original recommendation:** One private generated Pi package (Recommended).

## Decision 2 — Command and skill projection

**Question:** How should canonical Maister commands and skills map to Pi primitives?

**Options (ordered):**

1. `Hybrid semantic projection (Recommended)` — project reusable workflows as skills, textual entry points as prompts, imperative host operations through a minimal extension, and roles as namespaced agent descriptors.
2. `Everything as prompt templates` — reduce executable code but lose typed host operations and failure semantics.
3. `Everything as extension commands` — preserve imperative control but create an unnecessarily large executable surface.
4. `Need more info` — pause scope resolution.

**Original recommendation:** Hybrid semantic projection (Recommended).

## Decision 3 — Native bridge shape

**Question:** Which Pi native-agent execution boundary should `pi.native` use?

**Options (ordered):**

1. `Thin direct-import delegation adapter (Recommended)` — consume public `pi-subagents/delegation` v1, retain Maister resolver/event policy, and map typed terminal events without private imports.
2. `Parent-facing Pi tool/RPC mediation` — use host mediation but obscure exact delegation identity and typed native failures.
3. `Maister-owned child-process reimplementation` — duplicate subagent orchestration and drift from Pi-native behavior.
4. `Need more info` — pause scope resolution.

**Original recommendation:** Thin direct-import delegation adapter (Recommended).

## Decision 4 — Shared settings ownership

**Question:** How should Maister register the local Pi package in shared settings?

**Options (ordered):**

1. `Identity-aware managed array entries (Recommended)` — own exactly one normalized local package identity, preserve unrelated members and representation, and fail closed on duplicates, drift, malformed data, or ambiguous entries.
2. `Own the complete packages key` — simpler implementation but unsafe for unrelated operator packages.
3. `Never touch settings; require manual registration` — least mutation but loses deterministic install/verify/update/uninstall semantics.
4. `Need more info` — pause scope resolution.

**Original recommendation:** Identity-aware managed array entries (Recommended).

## Decision 5 — Admission and evidence

**Question:** How should Pi enter release admission while native E5/E6 evidence is still environment-dependent?

**Options (ordered):**

1. `Current-state all-target admission with graduated evidence (Recommended)` — include Pi in current structural/transactional admission, mark native/semantic capabilities unavailable or provisional until version-bound E5/E6 passes, and do not expand the historical three-target oracle.
2. `Block all Pi packaging until E5/E6 passes` — strongest claim boundary but prevents structural and transactional validation from shipping.
3. `Experimental Pi outside the main matrix` — reduces immediate release impact but creates a second product contract.
4. `Need more info` — pause scope resolution.

**Original recommendation:** Current-state all-target admission with graduated evidence (Recommended).

## Normative Gap-Analyzer Decision Inventory

The following six decisions are the authoritative Phase 2 inventory. They supersede any preliminary wording above where the options differ. Decisions SCOPE-001 through SCOPE-005 are presented in the first requested batch; SCOPE-006 remains for the next batch.

### SCOPE-001 — Command representation

**Question:** Which normative Pi representation should cover every canonical command and skill?

**Options:**

1. `Use the researched hybrid mapping (Recommended)` — skills for reusable workflows, prompts for textual commands, and `extensions/maister.ts` only for imperative registration and delegation; fail closed for unmappable commands.
2. `Represent all commands as prompts or skills` — limit the extension to runtime plumbing.
3. `Register all commands imperatively in the extension` — move every command into executable host code.

**Original recommendation:** Use the researched hybrid mapping (Recommended).

### SCOPE-002 — Package-entry representation

**Question:** How should Maister own and represent one `packages[]` entry while preserving operator-owned Pi package fields?

**Options:**

1. `Normalize identity and preserve representation (Recommended)` — insert `./maister`, treat string/object source forms as one identity, preserve matching object fields, and refuse duplicates or conflicts.
2. `Always replace a matching entry with a canonical object` — canonicalize representation on every lifecycle operation.
3. `Treat string and object forms as different identities` — keep representations semantically separate.

**Original recommendation:** Use normalized identity with representation preservation and refusal of ambiguous duplicates.

### SCOPE-003 — Schema and event evolution

**Question:** Should new managed-array and delegation-progress semantics be additive or receive explicit schema versions and event types?

**Options:**

1. `Use additive changes unless semantic closure requires a version bump (Recommended)` — add a new versioned event only when existing events cannot represent updates without loss.
2. `Introduce explicit overlay, receipt, journal, and delegation-update schema versions before Pi support` — version every affected contract up front.
3. `Keep schemas unchanged and omit durable delegation progress` — discard progress semantics.

**Original recommendation:** Prefer additive changes, with a version bump when strict validation proves an existing contract is no longer semantically closed.

### SCOPE-004 — Historical parity disposition

**Question:** What is the disposition of historical three-target parity machinery after current-state all-target admission is adopted?

**Options:**

1. `Replace the active parity gate with current all-target validation (Recommended)` — remove obsolete parity-only code and fixtures.
2. `Retain parity as a clearly non-gating historical audit` — preserve the machinery for informational comparison.
3. `Keep historical parity as a required release gate` — require the old three-target oracle for release.

**Original recommendation:** Remove or replace the active historical gate because it contradicts the confirmed current-state admission policy.

### SCOPE-005 — Installation without native prerequisites

**Question:** May structural and transactional Pi installation proceed when Pi or `pi-subagents` is unavailable?

**Options:**

1. `Allow installation and record E5/E6 as unavailable (Recommended)` — structural checks proceed and the receipt records the precise native prerequisite status.
2. `Require the pinned Pi and pi-subagents prerequisites for any install` — fail installation before host mutation.
3. `Allow package generation but refuse host installation until E5/E6 prerequisites exist` — separate artifact generation from lifecycle installation.

**Original recommendation:** Separate structural/transactional installation from native evidence, consistent with the confirmed provisional packaging assumption.

### SCOPE-006 — E6 scenario and event sequence

**Question:** What minimum Pi scenario and event shape are required for E6?

**Options:**

1. `Require the full public delegation v1 lifecycle (Recommended)` — ordinary and advisor delegation, exact IDs, start/update/response, queued cancellation, bounded failure and process-loss handling, and a hash-chained Maister event sequence.
2. `Require ordinary dispatch and cancellation only` — make progress updates non-durable diagnostics.
3. `Claim E6 from package inspection and one successful dispatch` — do not require the full lifecycle.

**Original recommendation:** Require the full public delegation v1 lifecycle with bounded, sanitized, durable observations.
