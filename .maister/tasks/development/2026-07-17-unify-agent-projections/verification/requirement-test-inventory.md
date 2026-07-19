# Requirement-to-Test Inventory

## TL;DR

R1-R35 and SC1-SC15 have named behavioral or release evidence. Runtime evidence that depends on a real authenticated host remains explicitly `unavailable` until observed; structural tests never promote it to native support.

## Core requirements

| ID | Named evidence | Latest outcome |
|---|---|---|
| R1 | `overlay-contract`: exact real 28-role IR | passed |
| R2 | `overlay-contract`: strict frontmatter, filename, body parsing | passed |
| R3 | `overlay-contract`: unknown fields, collisions, unsafe dependencies rejected | passed |
| R4 | `overlay-contract`: deterministic versioned manifest and identities | passed |
| R5 | `agent-projection`: support inventory cannot satisfy canonical completeness | passed |
| R6 | `agent-adapters`: Advisor uses identical native adapter path | passed |
| R7 | `source-materializer`: projection executes inside staging before enumeration | passed |
| R8 | `agent-projection`: independent projections are byte-identical | passed |
| R9 | `agent-projection`: named transform fixtures bind host shapes | passed |
| R10 | `agent-projection`: check mode does not change checkout | passed |
| R11 | `agent-projection`: exact bijection and Kiro reference closure | passed |
| R12 | `agent-resolver`: receipt/projection digest mismatch fails closed | passed |
| R13 | `agent-adapters`: managed Codex argv/stdin and private artifacts | passed |
| R14 | `agent-projection`: exact Cursor IDs including E2E | passed |
| R15 | `agent-projection`: Kiro descriptor/prompt pairs close exactly | passed |
| R16 | `agent-adapters`: pinned profiles and proven concurrency classes | passed |
| R17 | `target-registry`: schema-v2 managed root identity and ownership | passed |
| R18 | `installer-transaction`: one multi-root lock/journal lifecycle | passed |
| R19 | `installer-transaction`: unrelated Kiro leaves remain byte-identical | passed |
| R20 | `installer-transaction`: unmanaged collision and stale-leaf drift reject | passed |
| R21 | `installer-transaction`: injected failures restore exact topology | passed |
| R22 | `installer-transaction`: mutation-boundary drift and cooperative lock | passed |
| R23 | `agent-resolver`: exact grammar rejects aliases and defaults | passed |
| R24 | `agent-resolver`: receipt, representation, capability preflight | passed |
| R25 | `agent-resolver`: typed failures with no fallback | passed |
| R26 | `agent-resolver`: all adapters share terminal contract | passed |
| R27 | `agent-execution-events`: private fsynced hash-chained stream | passed |
| R28 | `gate-evaluator`: decision, idempotency, dispatch, and role IDs distinct | passed |
| R29 | `evidence-parity-topology`: target-specific E5 and version-only rejection | passed |
| R30 | `evidence-parity-topology`: three-role E6 scenarios and wrong identity | passed; real host may be unavailable |
| R31 | `evidence-parity-topology`: passed/failed/unavailable and freshness | passed |
| R32 | `release-package`: three target packages, evidence-qualified claims, and extracted production-runtime tracer | passed structurally; native support remains evidence-qualified |
| R33 | `release-package`: archive source/bootstrap closure plus extracted installed-state invocation | passed |
| R34 | `repository-topology` and gate snapshots: clean legacy cutover | passed |
| R35 | architecture, build, operator, workflow, release documentation, and distribution-target evidence matrix | passed |

## Success criteria

| ID | Named evidence | Latest outcome |
|---|---|---|
| SC1 | `overlay-contract`: exact 28 canonical roles | passed |
| SC2 | `agent-adapters`: Advisor equality | passed |
| SC3 | `agent-projection`: deterministic output | passed |
| SC4 | `agent-projection`: 28/28 host representations | passed |
| SC5 | projection/materializer negative cases: zero-write rejection | passed |
| SC6 | `agent-resolver`: provenance mismatch refusal | passed |
| SC7 | target registry and installer lifecycle matrix | passed |
| SC8 | injected rollback/recovery with unrelated Kiro leaves | passed |
| SC9 | collision, stale leaf, and drift refusal | passed |
| SC10 | extracted package `evaluateGate` tracer through production bootstrap, resolver, preparer, Codex/exact-native adapters, and durable terminal decision | passed for deterministic production seams; live host evidence remains separate |
| SC11 | Codex pinned worker and exact native identity suites | passed |
| SC12 | evidence suite target-specific E5 | passed; native observation may be unavailable |
| SC13 | evidence suite multi-role E6 and freshness | passed; native observation may be unavailable |
| SC14 | gate config, topology, parity, and v1 rejection | passed |
| SC15 | deterministic package and extracted lifecycle release suite | passed |

## Open Questions & Risks

- Real-host E5/E6 status remains environment-specific and must be renewed for the exact host/version/scenario/projection binding.
- `passed` above describes the named contract test. It never converts an `unavailable` native observation into operational support.
