# Specification Audit: First-Class Pi Support — Re-audit

## Scope and method

- Specification: `implementation/spec.md` (revised, 424 lines at audit time).
- Mode: pre-implementation.
- Inputs: confirmed requirements, gap analysis, scope decisions, five research findings, project architecture, and build/validation/testing standards.
- The first delegated audit identified F-01 through F-18. A second delegated auditor did not return or update this report after three full wait windows, so this re-audit is the documented fallback review against the same finding checklist. No production source or test implementation was inspected or modified.

## Compliance status

**✅ Compliant for implementation planning.**

The revised specification now contains a normative closed-contract appendix. It fixes the previously missing projection universe, role identity, package manifest/closure, public adapter boundary, request and event schemas, settings ownership algorithm, evidence freshness, release admission, transaction recovery, platform ownership, and requirements traceability. No Critical or High specification blocker remains.

The remaining items below are implementation verification obligations, not unresolved specification choices.

## Prior finding disposition

| Finding | Disposition | Evidence |
| --- | --- | --- |
| F-01 command/skill projection | Addressed | `spec.md:190-257` gives 30-skill/14-command source universe, exact command rows, digests, destinations, transforms, origin/rejection rules, and complete skill digest list. |
| F-02 version policy | Addressed | `spec.md:277-289` separates Node engine floor, exact tested tuple, prerequisite range, protocol version, and executable/package resolution order. |
| F-03 package closure | Addressed | `spec.md:290-311` gives an exact manifest, forbids invented `commands/`, defines required/optional/forbidden closure, filters, modes, ordering, and external prerequisite exclusion. |
| F-04 role identity | Addressed | `spec.md:258-276` lists the exact 28-role set and defines descriptor frontmatter, external ID, package origin, collision, and E5 assertions. |
| F-05 native adapter boundary | Addressed | `spec.md:312-340` defines overlay bindings, `ExtensionFactory`, `ExtensionAPI`, `pi.events`, `session_shutdown`, `maister-delegate`, cleanup, and the no-private-import rule. |
| F-06 durable event schema | Addressed | `spec.md:372-381` defines `maister-observation-v1`, event types/fields, canonical JSON, SHA-256 chain, fsync, sequence validation, and write ordering. |
| F-07 request/status bounds | Addressed | `spec.md:353-371` defines v1 request fields, numeric defaults, payload limits, terminal status mapping, duplicate IDs, cancellation, missing terminal response, process loss, and retry IDs. |
| F-08 discovery/origin collisions | Addressed | `spec.md:258-276` and `spec.md:336-340` require package `sourceInfo`, reject ambient collisions, and specify hermetic discovery flags. |
| F-09 managed-array ambiguity | Addressed | `spec.md:341-352` defines both schema versions, identity normalization, missing/non-array behavior, allowed object fields, filters, representation preservation, drift, and receipt fields. |
| F-10 unavailable prerequisite installation | Addressed | `spec.md:397-398` distinguishes structural/transactional installation from unavailable E5/E6 and defines the provisional label and mutation blockers. |
| F-11 evidence envelope/freshness | Addressed | `spec.md:382-398` defines versioned fields, result/reason/remediation, bindings, expiry, invalidation, and unavailable semantics. |
| F-12 historical parity | Addressed | `spec.md:406-407` explicitly removes active parity fixtures, metadata, and gates; current admission is exactly four targets. |
| F-13 archive/release determinism | Addressed | `spec.md:399-407` defines source-date epoch, tar/gzip normalization, sorted entries, modes, provenance/SBOM, external prerequisite representation, and extracted lifecycle smoke. |
| F-14 overlay/bindings/inventory | Addressed | `spec.md:312-336` provides overlay identity, layout/ownership rows, paths, six binding contracts, and failure conditions. |
| F-15 platform/sensitive state | Addressed | `spec.md:312-336` and `spec.md:399-407` define environment precedence, supported platforms, modes, containment, and a sensitive-state allowlist. |
| F-16 transaction/recovery | Addressed | `spec.md:399-407` defines lock scope, snapshot/journal phases, commit ordering, concurrency drift, rollback, and unresolved recovery. |
| F-17 release admission | Addressed | `spec.md:386-398` contains the claim/evidence truth table and explicit provisional behavior. |
| F-18 test traceability | Addressed | `spec.md:409-424` maps each contract to artifacts and required evidence/tests and fixes the implementation-log path. |

## Remaining implementation obligations

1. E1 must verify the pinned Pi 0.80.10 `ExtensionAPI`/`EventBus` signatures and reject any host mismatch; this is an evidence check, not an ambiguity in the spec (`spec.md:337`).
2. Implementation must generate the promised `pi-command-projection-v1.json`, Pi overlay, inventory, receipt schemas, and implementation log. Their required contents and validation behavior are specified; the files are deliberately implementation outputs.
3. E5/E6 remain unavailable until the host, package origin, exact identity, public delegation lifecycle, and durable event chain are observed under the stated scenarios.

## Audit conclusion

The specification is sufficiently closed to enter implementation planning. Planning must preserve the normative Appendix A contracts and must not treat the remaining E1/E5/E6 obligations as already passed. The Phase 6 exit gate may be reopened after this report is persisted.
