# Specification Audit: Harden the `phase-continue` Input Contract

## TL;DR

Verdict: Pass with concerns. The specification covers the requested transport migration, validation boundary, persistence safety, call-site migration, generated rebuild, and verification matrix. No scope contradiction or missing core deliverable blocks planning. Three implementation details need careful execution: dependency-free duplicate-key detection, canonical YAML validation without silently broadening the accepted subset, and deterministic recovery after the first durable state write.

## Key Decisions

- Classify the specification as pass-with-concerns rather than pass — the core contract is complete, but the state/retry implementation has meaningful failure modes that must be tested.
- Keep the concerns as implementation constraints, not scope expansion — the plan already includes the affected runner, tests, source references, and generated variants.

## Open Questions / Risks

- A custom JSON parser or duplicate-key-aware scanner must reject duplicate object keys before `JSON.parse` loses that information.
- Canonical YAML validation must prove the exact anchors and record shapes without accidentally accepting unsupported YAML.
- Report failure and the second state write occur across separate files/operations; recovery tests must prove no stale or downgraded transition.

## Audit Scope

Reviewed `implementation/spec.md` against:

- `analysis/requirements.md`, `analysis/codebase-analysis.md`, and `analysis/gap-analysis.md`
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`
- the five source orchestrator skills
- `tests/fully-automatic-phase-continue.test.sh` and `tests/gate-decision-engine.test.sh`
- `Makefile` and platform build ownership rules

## Findings by Severity

### Critical: 0

No critical specification omission prevents implementation planning.

### High: 0

The specification explicitly includes the runner, normative reference, five source skills, tests, generated variants, retry behavior, denylist/idempotency, and required build checks.

### Medium: 3

1. **Duplicate JSON keys require an explicit dependency-free strategy.** The current runner uses `JSON.parse` only after CLI parsing, so a direct replacement with `JSON.parse` would violate R2/R3. The implementation plan should name a small scanner/reviver strategy and test nested payload objects even though the current payload is shallow.

2. **Canonical YAML acceptance needs a fixture-defined subset.** The current `parseGateHistory` and `updatePhaseState` rely on exact text patterns and do not prove nesting, duplicate anchors, or record completeness. The planner should define representative empty/populated states and malformed variants before implementing the validator; otherwise “canonical” can drift during coding.

3. **Recovery semantics need failure injection.** The current runner writes state, then reports, then transition state. The specification correctly requires retry recovery, but the test plan must make report failure and transition-write failure observable without corrupting the task state. A retry must reuse the terminal selection and apply only the missing work.

### Low: 0

No low-severity wording issue changes scope or acceptance.

## Compliance Matrix

| Area | Verdict | Evidence |
|---|---|---|
| JSON transport and allowlist | Covered | Spec sections 3 and 8, requirements R1-R3 |
| Input/state preflight | Covered with implementation concern | Spec section 4, R2/R4 |
| Denylist/idempotency | Covered | Spec section 5, R5-R6 |
| Atomic persistence/reporting/retry | Covered with test concern | Spec section 6, R7 |
| Source call-site migration | Covered | Spec section 7, R9 |
| Generated platform ownership | Covered | Spec sections 2, 7, 11, R11-R12 |
| Verification | Covered | Spec section 9 and R1-R12 |
| Scope exclusions | Covered | Spec section 2 and requirements |

## Recommendation

Proceed to implementation planning with the three medium concerns carried as explicit plan steps and tests. No specification rewrite is required before planning; the concerns are already represented by the specification’s requirements and verification matrix.

## Audit Limitation

The dedicated native audit-agent dispatch was unavailable because the agent thread limit was reached. This report is a read-only orchestrator fallback based on direct inspection of the same artifacts and does not modify source or generated files.
