# Specification Audit: Codex Fully Automatic Continuation

## TL;DR

The corrected specification is **plan-ready and compliant**. It retains the accepted A3/B1/C1/D1 architecture and now resolves every finding from the initial audit with normative, repository-grounded contracts for schema migration, dispatch recovery, capability evidence, mixed policies, and filesystem behavior.

The Markdown specification and HTML companion are materially consistent. Both preserve the confirmed no-UI user journey, canonical/generated ownership, protected-gate safety, and the requirement that Codex remain `unsupported` until real native evidence succeeds.

**Overall status:** ✅ Compliant (pre-implementation)  
**Open findings:** 0 Critical, 0 High, 0 Medium, 0 Low  
**Resolved findings:** F1–F5  
**Blocking ambiguities:** None  
**Scope assessment:** Correct; no scope expansion is required.

## Key Decisions Verified

- A3/B1/C1/D1 remains binding: one shared evaluator, evaluator-owned full gate envelope, workflow-owned inventory/outbox/receipt, and a thin Codex binding (`implementation/spec.md:12-19`, `95-100`, `104-114`).
- Schema-v2, migration, policy transition, dispatch, repository, and evidence-bootstrap behavior is now normative rather than left to planner inference (`implementation/spec.md:116-171`).
- Runner responsibility remains narrow and domain-independent (`implementation/spec.md:55`, `106-108`).
- Canonical sources and adapters remain the only edit targets, with generated variants produced deterministically (`implementation/spec.md:63`, `86-91`, `199-203`; `.maister/docs/standards/global/build-pipeline.md:3-10`).
- Protected/denylisted gates never gain automatic continuation, and implementation approval remains out of scope (`implementation/spec.md:42`, `50`, `60`, `64-70`, `207-213`; `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:107-128`).
- Capability activation still requires the real Codex entrypoint and distinguishes exit `0` from unavailable exit `77` (`implementation/spec.md:64`, `167-177`, `232-234`; `Makefile:29-52`).

## Open Questions / Risks

No specification ambiguity blocks implementation planning.

One accepted implementation risk remains: the exact Codex active-turn hook must be proved by the planned narrow spike. The specification supplies the correct stop condition—if D1 is disproved, return to scope clarification before considering an MCP fallback (`implementation/spec.md:21-26`, `177`; `analysis/technical-clarifications.md:16-18`). This is a dependency risk, not an unresolved specification decision.

## Re-audit of Initial Findings

### F1 — Schema-v2 and migration contract

- **Previous severity/category:** High — Missing / Incomplete
- **Resolution status:** Resolved
- **Corrected specification evidence:**
  - R12, R13, and R26 bind implementation to the normative contract and migration matrix (`implementation/spec.md:52-54`, `66`).
  - The root, phase, gate, role-attempt, provenance, inventory, enum, nullability, and timestamp requirements are explicit (`implementation/spec.md:116-126`).
  - Supported legacy shapes, deterministic mappings, revision-1 migration, preserved/non-authorizing legacy provenance, and named rejection boundaries are explicit (`implementation/spec.md:128-140`).
  - Success criteria require validation of every field/transition and every migration row/rejection (`implementation/spec.md:224-226`).
- **Repository grounding:** This directly addresses the current exact schema-v1 validator and optional cursor behavior in `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:502-561`, plus the migration gaps identified in `analysis/gap-analysis.md:53-54`, `65-70`, and `169-173`.
- **Verdict:** The planner no longer needs to invent which legacy shapes authorize new effects or which must fail closed.

### F2 — Crash-after-effect receiver deduplication

- **Previous severity/category:** High — Ambiguous / Incomplete
- **Resolution status:** Resolved
- **Corrected specification evidence:**
  - R18 and R27 define `pending → claimed → acknowledged|blocked`, token/lease claim semantics, and one atomic checkpoint-plus-acknowledgement commit as the sole logical start effect (`implementation/spec.md:58`, `67`).
  - Claimed state starts no target work; post-commit/pre-observation retry returns the stored acknowledgement; source/target/dispatch identity is immutable (`implementation/spec.md:153-159`).
  - Required tests cover claimed-only crash, safe same-ID reclaim, and post-ack-commit failure with one checkpoint and one logical target start (`implementation/spec.md:193`, `222`).
- **Repository grounding:** The contract fills the previously absent workflow receiver identified in `analysis/gap-analysis.md:55-59`, `65-69`, and `175-194`; it goes beyond the simple fixture dispatcher in `tests/codex-fully-automatic-workflow-loop.test.sh:32-40` without treating that unimplemented production path as a defect.
- **Verdict:** The logical effect and uncertain crash window now have an implementable durable boundary.

### F3 — Capability activation and native-E2E bootstrap

- **Previous severity/category:** High — Ambiguous
- **Resolution status:** Resolved
- **Corrected specification evidence:**
  - R24 and R29 limit the bootstrap to a repository-owned, non-packaged platform test adapter that changes declaration eligibility only and is unreachable from production CLI, environment, configuration, or workflow input (`implementation/spec.md:64`, `69`).
  - The evidence bootstrap must invoke the real Codex plugin/skill entrypoint while preserving all safety and no-UI checks (`implementation/spec.md:167-170`).
  - Activation is explicitly two-step: native exit `0` while still declared unsupported, then a separate declaration change and normal capability-matrix run (`implementation/spec.md:171`, `232-234`).
  - Tests must prove bootstrap isolation from generated/installable artifacts and normal inputs (`implementation/spec.md:194`).
- **Repository grounding:** This resolves the bootstrap cycle between the current eligibility rule (`plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:110-119`), unsupported Codex row (`plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:16-18`), native exit `77` placeholder (`platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:1-5`), and declaration/evidence equality check (`Makefile:29-52`).
- **Verdict:** Native proof can precede activation without exposing a production bypass or weakening safety.

### F4 — Manual and Advisor-assisted schema-v2 behavior

- **Previous severity/category:** Medium — Incomplete
- **Resolution status:** Resolved
- **Corrected specification evidence:**
  - R22 and R28 bind manual, Advisor, user override, unsupported fallback, and `user_pending` resume behavior (`implementation/spec.md:62`, `68`).
  - The normative transition table defines manual; Advisor agreement and disagreement; user override precedence; unsupported automatic fallback; and pending resume (`implementation/spec.md:142-151`).
  - The test plan and success criteria require each path without duplicate role/user decisions (`implementation/spec.md:190`, `226`, `230`).
- **Repository grounding:** These transitions preserve the existing user-final-choice contract in `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:119-126` and cover the compatibility risks recorded in `analysis/gap-analysis.md:122-132` and `140-149`.
- **Verdict:** Schema-v2 adoption no longer leaves existing policy semantics implicit.

### F5 — Repository metadata and lock semantics

- **Previous severity/category:** Medium — Ambiguous
- **Resolution status:** Resolved
- **Corrected specification evidence:**
  - R14 and R30 bind owner-token locking, revision comparison, symlink rejection, bounded supported-platform semantics, safe metadata handling, and token-owned cleanup (`implementation/spec.md:54`, `70`).
  - The repository contract defines sibling-directory lock structure, timeout, conservative stale-lock reclaim, successor protection, canonicalization, regular-file checks, exact mode preservation, safely possible ownership preservation, flush/rename/directory durability, and cleanup (`implementation/spec.md:161-165`).
  - Tests cover live/expired/malformed/foreign locks, cleanup tokens, symlinks, metadata, stale revisions, and platform durability (`implementation/spec.md:191-193`, `227-228`).
- **Repository grounding:** This precisely extends the current writer, which has staging, file `fsync`, and rename but lacks lock/CAS/mode/directory durability (`plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:597-616`; `analysis/gap-analysis.md:74-78`).
- **Verdict:** The requirements are implementable on the declared macOS/Linux Node runtimes and do not require unconditional privileged ownership changes.

## Markdown / HTML Consistency

The HTML companion faithfully contains the corrected normative content:

- Schema-v2 fields and migration matrix: `implementation/spec.html:248-282`
- Manual/Advisor/fallback transitions: `implementation/spec.html:284-286`
- Dispatch claim/checkpoint/acknowledgement: `implementation/spec.html:288-291`
- Platform-bounded repository contract: `implementation/spec.html:293-296`
- Native evidence bootstrap and two-step activation: `implementation/spec.html:298-301`
- Matching test and success criteria: `implementation/spec.html:316-366`

No material requirement is present only in the visual companion, and no visual implementation requirement has been introduced.

## Completeness and Traceability Assessment

| Area | Assessment | Evidence |
|---|---|---|
| User journey / no UI | Complete | `implementation/spec.md:28-37`, `41`, `209` |
| A3/B1/C1/D1 boundaries | Complete | `implementation/spec.md:12-19`, `95-114` |
| Agreement / arbitration | Complete | `implementation/spec.md:47-49`, `217-219` |
| State / migration | Complete | `implementation/spec.md:52-54`, `116-140`, `224-225` |
| Dispatch / recovery | Complete | `implementation/spec.md:58-61`, `67`, `153-159`, `222` |
| Existing-policy compatibility | Complete | `implementation/spec.md:62`, `68`, `142-151`, `226`, `230` |
| Repository safety | Complete | `implementation/spec.md:54`, `65`, `70`, `161-165`, `227-228` |
| Build / generated ownership | Complete | `implementation/spec.md:63`, `86-91`, `199` |
| Capability evidence | Complete | `implementation/spec.md:64`, `69`, `167-177`, `232-234` |
| Testing | Complete and risk-proportionate | `implementation/spec.md:185-195` |
| Scope / visuals | Complete | `implementation/spec.md:205-213`; no UI artifacts required |

## Final Verdict

The specification is complete, internally consistent, repository-grounded, testable, correctly scoped, and sufficiently unambiguous for Phase 7 implementation planning. The plan should preserve the stated dependency ordering by proving the D1 active-turn hook before downstream binding-dependent implementation, but no further specification correction or user clarification is required.
