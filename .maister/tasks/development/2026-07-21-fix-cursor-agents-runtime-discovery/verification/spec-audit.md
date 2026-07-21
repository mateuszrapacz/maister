# Specification Audit (Pre-Implementation)

**Task:** `2026-07-21-fix-cursor-agents-runtime-discovery`  
**Spec:** `implementation/spec.md`  
**Audit type:** Pre-implementation (Phase 6)  
**Auditor:** Maister spec-auditor  
**Date:** 2026-07-21  

**Compliance status:** Mostly Compliant

---

## TL;DR

The spec is implementable and well-aligned with the RED TDD contract (4 tests), production-owner exact-native bridge rules, and scoped requirements (hybrid E5, E6 bridge packaging, `--agents-fallback`, reload docs). Missing bridge/hybrid modules in the codebase are **expected** for this additive work and are not Non-Compliant. Main residual risks for planner/implementer: (1) `expectedNativeInventory` must accept the TDD top-level-`target` manifest shape or hybrid E5 stays `unavailable`; (2) `probeHost` must honor TDD seams `hostVersion` / `clock|now` (today it ignores them and always runs `agent --version`); (3) FR3 dual-write semantics beyond parse are underspecified vs TDD (parse-only); (4) product Done (Task enum) still depends on manual smoke S7 — hybrid disk discover ≠ live Task.

---

## Key Decisions (auditor concurrence)

| Decision | Spec | Audit |
|----------|------|-------|
| E6 bridge packaging in-scope | Key Decision 4; FR1; scope clarifications | Concur — matches TDD tests 1–2 and `createMaisterAgentBridgeV1` / production-owner load path |
| Primary delivery = Cursor plugin; dual-write behind `--agents-fallback` | Key Decisions 2–3; FR3 | Concur — matches clarifications Q2 and TDD test 4 |
| Hybrid E5 from `pluginRoot/agents/*.md` when discover omitted | Key Decision 3; FR2; §6.2 | Concur — matches TDD test 3; honesty when `pluginRoot` absent is correct |
| Do not invent Task inventory API | Non-goals; R1–R2 | Concur — avoids false E5 |
| Skills stay Task-oriented; no speculative projector churn | Key Decision 5; non-goals | Concur |
| Codex / sibling targets untouched | Key Decision 6 | Concur |

---

## Open Questions & Risks

| ID | Severity | Item | Spec coverage | Residual for planner |
|----|----------|------|---------------|----------------------|
| A1 | **High** | TDD manifest has top-level `target` only; `expectedNativeInventory` filters `row.target === target` | Spec R4 + §6.2 require derivation that accepts this shape | Plan explicit `base.mjs` change; preserve parity fixtures that set per-row `target` |
| A2 | **High** | TDD passes `hostVersion` + `clock`; `probeHost` only uses `now` and always spawns version | Spec FR2 requires seams | Implement override: injected `hostVersion` ⇒ treat host available; map `clock()` → `now` (or accept both) |
| A3 | **Medium** | FR3 dual-write (copy vs symlink; home vs project; “exhaustion” vs flag-alone) | WHAT stated loosely; TDD only asserts parse | Plan minimal flag-gated dual-write; document destinations; no new TDD required unless product claims stronger |
| A4 | **Medium** | Product success (Task lists `maister-*`) ≠ green TDD | Spec S7 + R1/R2 | Keep Done gate split: automated = 4 green; Task claim = manual smoke |
| A5 | **Medium** | Bridge TDD launch asserts only `observed_native_role_external_id`; exact-native adapter requires closed launch `{schema_version, observed_…, output, native_observations}` | Spec §6.1 prefers release-package shape | Ship full closed launch (and inspect with `schema_version: 1`) so production gate works |
| A6 | **Low** | Support inventory `explore` vs `maister-explore` | Spec R6 / non-goals | Out of scope; do not block |
| A7 | **Low** | Frontmatter parse algorithm unspecified | FR2 says read `name` from frontmatter | Simple YAML frontmatter extract matching fixture format is enough |

---

## 1. Audit scope & method

**Read:**
- `implementation/spec.md`, `implementation/tdd-red-gate.md`
- `analysis/{requirements,gap-analysis,scope-clarifications}.md`
- `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs`
- Source: `host-probes/{cursor,base}.mjs`, `cli-contract.mjs`, `production-owner.mjs`, `overlays/cursor/{overlay,inventory}.yml`, release-package Cursor bridge fixture, `exact-native.mjs` closed schemas

**Pre-implementation rules applied:**
- “Missing from codebase” for new bridge / hybrid discover = expected if SPEC requires them
- Critical/High only for ambiguous, contradictory, incomplete, or non-implementable SPEC claims
- Every FR mapped to TDD or explicit docs acceptance
- Contracts checked against production-owner / `probeCursor` extension points

---

## 2. FR ↔ TDD / docs acceptance mapping

| FR | Requirement | Acceptance | Status |
|----|-------------|------------|--------|
| **FR1** Bridge packaging (distribution + overlay asset + inventory/layout) | TDD tests 1–2; S1–S2 | **Mapped** | Spec paths match TDD `PACKAGED_BRIDGE` / `OVERLAY_BRIDGE_ASSET` |
| **FR2** Hybrid default discover via `pluginRoot` | TDD test 3; S3 | **Mapped** | Also requires `expectedNativeInventory` + probe seams (A1–A2) |
| **FR3** `--agents-fallback` → `agentsFallback: true` | TDD test 4; S4 | **Mapped (parse)** | Dual-write semantic WHAT has **no** automated AC (A3) |
| **FR4** Reload guidance | S5 docs/messaging | **Mapped (docs)** | No TDD — acceptable for messaging |
| **FR5** Full suite green + no Codex regressions | S6 + FR5 text | **Mapped** | Planner should list regression suites (evidence-parity, release-package) |

**Verdict:** No FR lacks acceptance. FR3 beyond parse is the weakest AC binding (Medium).

---

## 3. Contract alignment (production-owner / probe / CLI)

### 3.1 `createMaisterAgentBridgeV1` — Compliant with caveats

| Contract element | production-owner / exact-native | Spec §6.1 | TDD |
|------------------|---------------------------------|-----------|-----|
| Export name | Required | Match | Match |
| Bridge fields | `schema_version`, `target`, `credentials_owner`, `version_owner`, `native_port` | Match | Match |
| Port closed set | `hostVersion`, `authenticated`, `externalCollisions`, `inspect`, `launch` (+ optional `cancel`) | Match | Implicit via usage |
| Inspect | exact-native requires `schema_version` + booleans | TDD asserts `exact_launch` + `observable_identity`; spec prefers `schema_version: 1` | Prefer full closed inspect for gate |
| Launch | exact-native closed set includes `output` + `native_observations` | Spec notes TDD minimum + release-package full shape | Implement full shape (A5) |
| Request subset | `loadBridge` passes schema/operation/target/paths/`plugin_source_root` | Spec lists same minimum | Match |

**Missing modules** (`bridges/cursor-bridge-v1.mjs`, overlay asset): expected; not Non-Compliant.

### 3.2 `probeCursor` hybrid — Implementable; High hazards documented

Current `cursor.mjs` (lines 4–15): inject-only `discover`; no `pluginRoot` hybrid.

Current `expectedNativeInventory` (`base.mjs:206–214`):

```text
filter row.target === target
```

TDD fixture (`cursor-agents-runtime-discovery.test.mjs:33–54`): top-level `target: "cursor"`, rows **without** `row.target` → today yields `null` → E5 `manifest-discovery-subject-unavailable` even after hybrid discover lands.

Evidence-parity Cursor fixtures use **per-row** `target` (`nativeManifest`). Spec correctly requires both shapes — **High** implementability item, but **not** a Spec omission (R4 / §6.2).

Probe seams: TDD uses `hostVersion` + `clock`; `probeHost` ignores both (uses `run` + `now`). Spec FR2 mandates seams — **High** for planner, Spec is clear.

### 3.3 CLI `--agents-fallback` — Compliant for TDD

`parseCliArgs` unknown-option reject (`cli-contract.mjs:46`) explains RED. Spec §6.3 matches TDD assertion. Flag-absent ⇒ no dual-write is clear.

### 3.4 Overlay inventory / layout — Compliant with TDD regex

TDD requires:
- Asset file at `assets/runtime/cursor-bridge-v1.mjs`
- `overlay.yml` / `inventory.yml` mention `cursor-bridge-v1.mjs`
- Layout `destination` matching `/destination:.*cursor-bridge-v1\.mjs|runtime\/cursor-bridge-v1/`

Current overlay has no runtime leaf (expected). Spec §6.4 matches TDD. Recommend planner use a `kind: file` layout entry analogous to `assets/plugin.json` → destination under plugin root (e.g. `runtime/cursor-bridge-v1.mjs`) and add the same path to both inventory required lists.

---

## 4. Findings catalog

### Critical

*None.* Spec does not contradict TDD; core FRs have ACs; production-owner extension points are named correctly.

### High

| ID | Category | Finding | Evidence |
|----|----------|---------|----------|
| H1 | Implementability | Hybrid E5 cannot pass without extending `expectedNativeInventory` for top-level-target manifests | `base.mjs:206–214` vs TDD fixture `target` at top level only; Spec R4 |
| H2 | Implementability | Hybrid E5 TDD depends on probe seams not present in `probeHost` today | TDD `hostVersion`/`clock` vs `probeHost` destructuring (`base.mjs:66–83`); Spec FR2 |
| H3 | Clarity (residual) | Product “Task discovery” Done vs automated Done must stay split | Clarifications Q1 vs Spec S1–S6/S7; R1–R2 — Spec documents this; planner must not treat 4 green as Task enum proof |

### Medium

| ID | Category | Finding | Evidence |
|----|----------|---------|----------|
| M1 | Incomplete AC | FR3 dual-write destinations/algorithm underspecified; only parse is TDD-backed | Spec FR3 vs TDD test 4; scope “after exhaustion” vs flag-alone |
| M2 | Completeness | Production-usable bridge should satisfy exact-native closed inspect/launch, not TDD minimum alone | `exact-native.mjs:16–25`; release-package fixture; Spec §6.1 soft “prefer/may” |
| M3 | Ambiguity | Frontmatter `name` extraction method unspecified | FR2; fixture is simple `---` YAML — acceptable default |

### Low

| ID | Category | Finding | Evidence |
|----|----------|---------|----------|
| L1 | Out of scope | Support `explore` ID skew | Spec R6; inventory.yml `native_role_external_id: explore` |
| L2 | Docs | Exact CLI message / doc file for reload not named | FR4 / S5 — any operator-facing install success path is enough |

### Extra / Incorrect

*None* in the Spec relative to scope clarifications (E6 in-scope is correctly elevated vs gap-analysis default “out-of-scope”).

### Ambiguous (resolved by Spec or accepted)

| Topic | Resolution |
|-------|------------|
| Gap analysis defaulted E6 out-of-scope | Scope clarifications + Spec override to in-scope — consistent |
| Hybrid ≠ Task API | Explicit honesty + S7 — acceptable Hybrid C |
| Duplicate bridge paths (lib + overlay asset) | Spec requires both; TDD requires both — clear |

---

## 5. Codebase readiness (expected gaps)

| Area | Current state | Spec expectation | Audit |
|------|---------------|------------------|-------|
| `bridges/cursor-bridge-v1.mjs` | Missing | Create | Expected |
| Overlay `assets/runtime/cursor-bridge-v1.mjs` | Missing | Create + inventory/layout | Expected |
| `probeCursor` hybrid | Inject-only | Default discover from disk | Expected extend |
| `expectedNativeInventory` | Per-row `target` only | Accept TDD shape | **Must extend** (H1) |
| `probeHost` seams | No `hostVersion` / `clock` | Honor for TDD | **Must extend** (H2) |
| `parseCliArgs` | Unknown option | Add flag | Expected |
| Dual-write install path | Absent | Flag-gated | Expected; tighten plan (M1) |
| Reload messaging | Not verified in this audit as present | Required | Docs FR4 |

---

## 6. Standards / scope consistency

- Minimal implementation / fail-closed honesty: Spec §8 matches project standards intent.
- Non-goals correctly exclude invented Task API, dual-install-as-primary, Codex, speculative frontmatter.
- Scope clarifications (Hybrid, optional fallback, E6 in-scope, Task-only skills) are reflected in Spec Key Decisions and FRs.
- Requirements.md FR summary maps 1:1 to Spec FR1–FR5.

---

## 7. Compliance summary

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Completeness | Strong | FRs, non-goals, contracts, acceptance↔TDD table |
| Clarity | Good | Residual dual-write / Task-vs-hybrid honesty |
| Implementability | Good with High planner items | H1–H2 are called out in Spec but easy to miss in code |
| TDD alignment | Strong | 4 tests ↔ S1–S4; S5 docs; S6 suite; S7 smoke |
| production-owner / probe alignment | Strong | Exact-native closed sets + inject path preserved |
| Overall | **Mostly Compliant** | Ready for planning/implementation with recommendations below |

Not **Compliant** solely due to High implementability hazards (H1–H2) and Medium FR3 AC softness — Spec is still safe to proceed.

Not **Non-Compliant**: no Critical omissions or Spec↔TDD contradictions.

---

## 8. Recommendations for planner / implementer

1. **Task group A — Bridge:** Add `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` modeled on release-package Cursor fixture; export `createMaisterAgentBridgeV1`; return full exact-native inspect/launch closed shapes (include `schema_version`, launch `output` + `native_observations`) so production-owner + exact-native adapter work, not only TDD.
2. **Task group B — Overlay:** Copy/package identical contract to `overlays/cursor/assets/runtime/cursor-bridge-v1.mjs`; add `kind: file` layout leaf + required inventory entries in both `overlay.yml` and `inventory.yml` so TDD regex and materialize `--check` fail closed.
3. **Task group C — Hybrid E5:** In `probeCursor`, when `discover` omitted and `pluginRoot` usable, read `agents/*.md` frontmatter `name`s → `compareNativeInventory`. **Must** update `expectedNativeInventory` to treat top-level `manifest.target === target` (or equivalent) when rows lack `row.target`, without breaking per-row parity fixtures.
4. **Task group D — Probe seams:** Honor injected `hostVersion` (skip/short-circuit version spawn as available) and `clock`→`now` so TDD test 3 is CI-safe without relying on live `agent`.
5. **Task group E — CLI:** Parse `--agents-fallback` → `agentsFallback: true`; wire minimal dual-write after plugin primary (document: home `~/.cursor/agents` and/or project `.cursor/agents`; prefer copy or symlink — pick one in plan). Flag absent = no dual-write.
6. **Task group F — Docs:** Install/update success messaging: reload Cursor before claiming Task discovery.
7. **Regression:** Keep evidence-parity Cursor inject-discover tests and release-package bridge injection green; do not touch Codex paths.
8. **Done criteria:** Automated Done = 4/4 TDD green; Product Task Done = S7 manual smoke only — do not inflate hybrid E5 as Task enum proof.

---

## 9. Clarification requests (non-blocking)

If stakeholders want tighter FR3 before implement:
- Confirm dual-write targets: user agents dir only, project only, or both when flag set.
- Confirm flag alone is sufficient (no separate “exhaustion detector”).

Otherwise planner may choose a minimal both-or-home-only approach and document it.

---

```yaml
audit_type: pre-implementation
compliance_status: mostly_compliant
critical_count: 0
high_count: 3
medium_count: 3
low_count: 2
tdd_fr_coverage: complete
blocking_for_implementation: false
report_path: verification/spec-audit.md
```
