# Phase 6 Independent Specification Re-audit — GitHub-Only Distribution

## TL;DR

Verdict: **PASS** with **0 blocking, 0 important, and 0 advisory findings**.
Every prior finding is resolved: acquisition identity, current-public/future-private verification, transport timing, exact requirement parity, drift rejection, and active workflow summaries are coherent and testable.
R-001–R-038 remain complete and release-blocking, and the original security, authority, archive, transaction, recovery, and release contracts show no regression.
No production code, tests, requirements, technical clarifications, specification, HTML, workflow state, or user documentation was modified.

## Key Decisions

- Accept the prepare-time manifest plus protected-CI evidence as a coherent split: runtime proves the materialized full commit, while protected CI proves use of a literal exact tag/full-commit selector without trusting ambient npm, cache, URL, or caller metadata.
- Accept the visibility policy as state-dependent: the currently public canonical repository requires real anonymous E2E now; private behavior is hermetic now; the same canonical repository must pass protected real private E2E before or after a future private migration.
- Accept one 15-second per-fetch pre-header deadline as the complete DNS/TCP/TLS/proxy/header bound, composed with fresh redirect/retry attempt clocks and non-resetting body-idle, resource-wall, and aggregate clocks.
- Treat R-001–R-038 as one exact normative set across requirements Markdown, specification Markdown, and decoded HTML, guarded by an explicit automated drift gate.
- Advance with no remaining specification decision: `decisions_needed` is empty.

## Verdict and Counts

| Verdict | Blocking | Important | Advisory | decisions_needed |
|---|---:|---:|---:|---:|
| **PASS** | 0 | 0 | 0 | 0 |

The specification is implementation-ready. This verdict assesses specification completeness, consistency, testability, and conformity; it does not claim that downstream implementation or release evidence already passes.

## Inputs Read Completely

- `orchestrator-state.yml`
- previous `verification/spec-audit.md`
- previous `analysis/spec-fix-decisions.md`
- `analysis/requirements.md`
- `analysis/technical-clarifications.md`
- `implementation/spec.md`
- `implementation/spec.html`
- `implementation/tdd-red-gate.md`
- `.maister/docs/INDEX.md` and applicable project, build, convention, validation, error-handling, minimal-implementation, and testing standards

## Prior Finding Disposition

| Prior finding | Classification on re-audit | Resolution evidence | Result |
|---|---|---|---|
| B-001: exact Git acquisition identity lacked a trustworthy handoff | Resolved | R-001/R-002/R-015 define the package-carried commit evidence and protected selector proof (`requirements.md:63-64,77`). The producer has fixed argv, actual-checkout `cwd`, a closed schema, restricted atomic output, fail-closed cleanup, and no public override (`technical-clarifications.md:29-52`). CI resolves and invokes literal tag/full-commit selectors while runtime explicitly rejects ambient npm/cache inference (`technical-clarifications.md:54-66`; `spec.md:137-168`). | **Resolved** |
| B-002: one fixed repository could not be both public and private | Resolved | R-005/R-006/R-036 bind current real anonymous E2E to the public canonical repository and make private behavior hermetic now (`requirements.md:67-68,98`). The normative checklist activates authenticated real E2E against that same canonical repository when visibility changes, with protected credentials and full identity reruns (`technical-clarifications.md:188-200`; `spec.md:401-415`). No additional private repository is required or claimed. | **Resolved** |
| I-001: HTML requirements twin was lossy | Resolved | All three artifacts contain exactly 38 ordered rows, all priorities are `Must`, the Markdown row triples are byte-identical, and decoded HTML triples are exactly equal. HTML rows are at `spec.html:263-300`; the canonical Markdown rows are `requirements.md:63-100` and `spec.md:437-474`. | **Resolved** |
| I-002: connection deadline was undefined | Resolved | R-013 specifies one 15-second pre-header attempt deadline and all required composition semantics (`requirements.md:75`). Start/end, DNS/TCP/TLS/proxy/header coverage, fresh redirect/retry clocks, earliest-deadline behavior, typed abort, retry eligibility, cleanup, and body-idle separation are explicit (`technical-clarifications.md:123-125`; `spec.md:228-251`). | **Resolved** |
| I-003: active workflow summaries carried superseded npm/latest/browser behavior | Resolved | Active state has `tech_clarified: true` and a GitHub-only architecture (`orchestrator-state.yml:1958-1964`). Current scope, requirement, clarification, and specification summaries use exact Git refs, API asset URLs, zero registry mutation, public E2E, and future private migration (`orchestrator-state.yml:2090-2180`). Historical research is explicitly marked superseded (`orchestrator-state.yml:1983-1991`). | **Resolved** |

## Required Re-audit Checks

### Acquisition identity and selector authority

The contract now separates observations at the boundary where each can be proved:

1. `prepare` runs against the actual Git checkout with fixed non-shell `git rev-parse --verify HEAD^{commit}` and emits only repository, package version, and resolved full commit.
2. The manifest is package-carried, closed-schema, restricted, atomically written, no-follow validated, and mandatory before network or host mutation.
3. The public CLI/environment cannot supply or override selector, manifest, resolved commit, source, evidence, or Git metadata.
4. Protected CI resolves the literal tag or full commit, invokes npm with that exact selector, and binds it to the Release tag target.
5. Runtime compares the manifest commit with Release, sidecar, archive manifest/digest, E3, and installed receipt identity.

This is coherent and independently testable. It does not infer the original selector from ambient npm variables, cache layout, package URL, arbitrary Git metadata, or caller input. Its stated threat model also avoids claiming protection against a malicious canonical commit, compromised npm/Git executable, or privileged same-user package mutation.

### Current public and future private verification

The live anonymous GitHub repository API returned `full_name: mateuszrapacz/maister`, `private: false`, `visibility: public`, `archived: false`, and `disabled: false` during this audit. The specification therefore correctly requires the real public exact-tag/full-commit Git-package and Release E2E now.

Private credential precedence, denial/retry, API asset transport, authorization confinement, cross-host stripping, malformed credential, timeout, redaction, and leak behavior remain release-blocking hermetic tests now. A complete normative migration checklist blocks a visibility change or subsequent release until operator-equivalent Git credentials, all API credential sources, protected environments, authenticated canonical private Git/Release E2E, no-leak evidence, and exact selector/manifest/tag/sidecar/archive/E3/lifecycle evidence pass. This resolves the former topology contradiction without creating another repository or a production repository override.

### Transport deadline composition

The transport contract has one unambiguous timing model:

- each initial, redirect, or retry fetch receives one fresh 15-second pre-header deadline;
- that deadline starts immediately before fetch and includes DNS, TCP, TLS, proxy negotiation, and response-header wait;
- response headers end the pre-header deadline and begin a separate 15-second body-idle timer;
- redirect/retry clocks do not reset 30/120-second resource walls or the 180-second aggregate wall;
- the earliest deadline wins, timeout is typed, transport is aborted and awaited, partial owned files are cleaned, and retry is permitted only before accepted semantic body and within all remaining budgets.

No second hidden connection timer or uncovered pre-header phase remains.

### Requirement parity and drift gate

An independent parser check produced:

```text
requirements rows:       38
specification rows:      38
decoded HTML rows:       38
ordered R-001..R-038:    true
Markdown byte triples:   identical
HTML decoded triples:    identical
priorities:              Must only
```

R-038 requires automated drift rejection, and the detailed gate rejects missing, duplicate, extra, out-of-order, priority-mismatched, or text-mismatched rows after HTML decoding (`technical-clarifications.md:202`; `spec.md:497-501`). Summaries are explicitly non-normative.

### Active workflow authority

The current continuation fields no longer direct npm publication, dist-tag/latest promotion, or browser-asset acquisition. Active architecture and summaries require exact Git refs, GitHub API asset delivery, zero registry mutation, current anonymous public smoke, and future private activation. Older gate/history material remains historical, and the active research summary labels superseded registry advice as superseded.

## Regression Audit of Original Contracts

| Area | Requirements | Re-audit result |
|---|---|---|
| Package and CLI boundary | R-001–R-005 | Closed exact-ref package, protected package metadata, exact dependency, seven-command/three-target CLI, and non-configurable canonical identity remain explicit and fail closed. |
| Credential security and transport authority | R-006–R-013 | Anonymous-first behavior, strict credential precedence, bounded non-shell `gh`, API-only authorization, cross-host stripping, API asset URLs, byte/redirect/retry/time bounds, redaction, abort, and cleanup remain testable. |
| Release and candidate identity | R-014–R-016 | Stable exact Release, unique assets, prepare commit evidence, protected selector evidence, digest/source/E3 agreement, and unsigned-evidence limitations remain indivisible and terminal on mismatch. |
| Archive and resource safety | R-017–R-020 | Pre-write hostile archive inspection, strict filtered exact `tar@7.5.20`, no-follow extraction, streaming, measurable cross-platform RSS ceilings, topology/source/overlay/installer/E3 validation, and immutable descriptor remain complete. |
| Mutation and control-plane authority | R-021–R-025 | GitHub archives remain payload authority and `maister-install.mjs` remains sole mutation authority; install/update delegation and receipt-bound offline state-only authority contain no launcher mutation or ambient fallback. |
| Journals, transactions, crash, and recovery | R-026–R-029 | Exact journal selection, unselected-journal identity, every durable crash boundary, terminal aggregate evidence, and pre-spawn byte/mode/link/existence/topology zero-mutation proof remain release-blocking. |
| Output, signals, and cleanup | R-030–R-032 | Typed/redacted pre-spawn diagnostics, byte-faithful child streams/codes/JSON, signal forwarding/mapping, result precedence, identity-guarded cleanup, and first-install recovery-root retention remain explicit. |
| Deterministic release and no-registry policy | R-033–R-036 | Three-target parity/E3/source/sidecar/lifecycle gates, GitHub-only publication states, static/runtime no-registry-mutation proof, real current public E2E, hermetic private behavior, and future private activation remain coherent. |
| Platform, TDD, docs, and drift | R-037–R-038 | Linux/macOS/Windows Node 22 plus declared npm major, all three red-to-green contracts, distribution metadata/legal boundary, user/operator migration docs, and exact artifact drift rejection remain mandatory. |

No ambiguity, contradiction, hidden decision, untestable acceptance condition, implementation blocker, or regression was found in these contracts.

## Validation Evidence

- Read all required task artifacts and applicable project standards in full.
- Parsed and compared all requirement triples mechanically; all parity checks passed.
- Queried the canonical repository through the unauthenticated GitHub API; current visibility is public.
- Searched active workflow state for `NPM_EXACT_PUBLISHED`, `LATEST_PROMOTED`, `browser_download_url`, npm publication, latest promotion, and `tech_clarified: false`; none occur in active continuation summaries, and `tech_clarified` is true.
- Reconciled every prior finding against requirements, technical clarification, Markdown specification, decoded HTML, and active workflow summary evidence.
- Performed no implementation tests because this is a specification re-audit; downstream acceptance tests and release evidence remain future implementation/verification work.

## decisions_needed

### critical

None.

### important

None.
