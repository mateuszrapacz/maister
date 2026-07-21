# Reality Check — Final

## Decision

**The approved implementation is real, exercised, and release-shaped.** The native boundary is now proven on the pinned host through public Pi semantics rather than inferred from versions or text output.

## Fresh checks

| Check | Result |
| --- | --- |
| `make validate` | Passed after final workflow expectation fixes |
| `make test-pi` | 26 passed, 0 failed |
| `make test-evidence` | 45 passed, 0 failed |
| `make test-runtime` | Passed |
| `make test-core` | Passed under watchdog |
| Pi integrated lifecycle | 7 passed, 0 failed |
| Release/archive/current-admission/topology components | Passed |
| Cursor projection, syntax, and `git diff --check` | Passed |

## Observed behavior

The integrated suite exercises deterministic package materialization, absent and existing settings, representation preservation, update/rollback/recover/uninstall, operator drift, cooperating locks, injected failure, durable event ordering, cancellation, process loss, retry links, archive extraction, and clean archive lifecycle.

The fresh release-boundary run successfully installs, verifies, and uninstalls the extracted Pi archive. Its receipt evidence contains E1–E4 passed with the same source, overlay, materialized, provenance, canonical-set, manifest, and projected-tree bindings. The real host probe adds fresh E5/E6 records bound to the same tuple; the combined manifest is eligible for `pi.native-semantic` admission.

The real pinned-host probe returns:

```json
[
  {"capability":"E5","result":"passed"},
  {"capability":"E6","result":"passed"}
]
```

E5 discovered all 28 exact generated package identities and E6 completed the ordinary/planner/advisor public delegation lifecycle with ordered durable observations. The release metadata can publish `pi.native-semantic` when it receives the complete fresh E1-E6 manifest; mixed or stale records remain fail-closed.

## Conclusion

The package and lifecycle work, and the safety fixes are covered by regression tests. The real host evidence closes the E5/E6 gap; retain the 14-day expiry and exact tuple binding when publishing the claim.
