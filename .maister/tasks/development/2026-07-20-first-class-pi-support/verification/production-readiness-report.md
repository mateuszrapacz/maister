# Production Readiness — Final

## Decision

**Ready for release as `pi.native-semantic` when the complete fresh E1-E6 manifest is supplied.** The explicit provisional fallback remains available when both native levels are unavailable.

## Readiness matrix

| Area | Status | Evidence |
| --- | --- | --- |
| Target registration and closed projection | Ready | Four-target validation, deterministic 28-role/command/skill projection, package closure checks |
| Operator ownership and settings safety | Ready | Identity-aware `packages[]`, pre-rename concurrent-write check, drift/lock/rollback tests |
| Runtime and observations | Ready for native-semantic boundary | Public delegation v1 adapter, bounded requests, cancellation/process loss, session/retry identity, durable redacted hash chains, real E6 lifecycle |
| Evidence and release admission | Ready for graduated boundary | Validated E1–E6 envelope, current evidence binding, expiry/remediation, checksums/SBOM/provenance, archive lifecycle, full-pass promotion |
| Recovery and rollback | Ready | Journal, backup, injected-failure, recover, verify, and uninstall scenarios |
| Native discovery/runtime | Ready on pinned tuple | Real E5/E6 probe passed Pi 0.80.10, Node 25.9.0, pi-subagents 0.35.1, and public delegation v1 |
| Semantic support | Ready on pinned tuple | E6 passed ordinary/planner/advisor lifecycle with exact identities and durable observations |

## Release controls

- Run `make validate` in a clean release checkout.
- Run current four-target admission and use `pi.native-semantic` only when the complete E1-E6 manifest is fresh and consistently bound.
- Keep the provisional fallback for hosts where both E5/E6 are explicitly unavailable; mixed, stale, or failed native records must be rejected.
- Do not bundle Pi auth, trust, sessions, `node_modules`, or `pi-subagents`.
- Preserve the receipt/journal/backup rollback path and the installer watchdog.

## Conclusion

The pinned host is ready for native-semantic release. Evidence expires after 14 days and remains bound to the observed Pi/Node/pi-subagents tuple; other hosts must re-run the probe before promotion.
