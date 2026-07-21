# Pi native host evidence

## Result

The fresh real-host probe passes both native evidence levels for the pinned Pi tuple. The records are version-bound, package-bound, and expire after 14 days.

| Field | Observed value |
| --- | --- |
| Pi | `0.80.10` |
| Node | `25.9.0` |
| `pi-subagents` | `0.35.1` |
| Delegation protocol | public v1, protocol `1` |
| Package identity | `maister` |
| Package-agent discovery | `pi.subagents.agents: ["./agents"]` |
| Native inventory | 28 exact `maister:<role>` identities |
| E5 | `passed` |
| E6 | `passed` |

## E5 — native discovery

The probe resolved the real Pi executable and Node engine, loaded the active public `pi-subagents/delegation` export through Pi's supported TypeScript loader family, verified the exact six public exports and five public event values, and inspected the generated package. Every one of the 28 generated descriptors had the expected `maister:<role>` identity, `name`, enabled state, package identity, and package-root source information. Inventory comparison was exact and collision-free.

## E6 — native runtime and semantics

The probe exercised the real public request boundary for `code-reviewer`, `implementation-planner`, and `advisor`. Each scenario verified the requested and observed native identity, bound execution policy, expected role behavior, and a complete durable observation stream:

```text
dispatch_requested -> started -> update -> response_observed -> terminal
```

The advisor scenario also passed the structured output contract. The event reader verified the append-only sequence and hash chain. No private Pi import, bundled `pi-subagents`, credential, or ambient operator state was used as a substitute for the public lifecycle.

The resulting E5/E6 records can be combined with the passed E1–E4 transaction manifest to publish `pi.native-semantic`. If a later host run cannot pass both native levels together, current admission rejects a mixed claim and safely falls back to the explicit `pi.structural-transactional.provisional` path.
