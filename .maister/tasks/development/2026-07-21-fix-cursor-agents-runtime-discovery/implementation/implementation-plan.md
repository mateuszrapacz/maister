# Implementation Plan: Fix Cursor agents runtime discovery

**Task:** `2026-07-21-fix-cursor-agents-runtime-discovery`  
**Worktree:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`  
**Spec:** `implementation/spec.md`  
**Audit:** `verification/spec-audit.md` (planner addresses High A1, A2)  
**TDD contract:** `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs` (4 RED → green)  
**Generated:** 2026-07-21T21:35:36Z  

---

## TL;DR

Ship a packaged Cursor exact-native bridge (distribution + overlay leaf), teach `probeCursor` hybrid E5 discovery from `pluginRoot/agents/*.md` when `discover` is omitted, honor TDD probe seams (`hostVersion` / `clock`), accept CLI `--agents-fallback` with minimal post-install dual-write, and surface reload guidance — then make the four TDD tests green without regressing evidence-parity or release-package Cursor paths.

**Automated Done** = 4/4 TDD green. **Product Task Done (S7)** = manual smoke after reload — hybrid disk E5 is not Task-enum proof.

## Key Decisions

1. **Bridge first, full exact-native shape** — `createMaisterAgentBridgeV1` returns closed inspect/launch including `schema_version: 1` and launch `{ observed_native_role_external_id, output, native_observations }` (release-package fixture), not TDD minimum alone (audit A5).
2. **A1 — expected inventory shape** — extend `expectedNativeInventory` so rows matching `target` include (a) `row.target === target` **or** (b) missing `row.target` when `manifest.target === target`; preserve per-row parity fixtures.
3. **A2 — probe seams** — `probeHost` accepts injected `hostVersion` (treat host available, skip/short-circuit `agent --version` spawn) and maps `clock` → `now` when `clock` is a function; keep existing `now` / `run` behavior for production callers.
4. **Primary delivery stays plugin** — dual-write only when `agentsFallback === true`; prefer **copy** (not symlink) of `agents/*.md` into home `~/.cursor/agents` and, when resolvable, project `.cursor/agents`.
5. **Done split** — automated gate ≠ Task enum; docs must say reload before claiming Task discovery.

## Open Questions & Risks

| ID | Item | Plan resolution |
|----|------|-----------------|
| A1 | Top-level `manifest.target` vs per-row `target` | Explicit G2 step; dual-shape derivation |
| A2 | TDD `hostVersion`/`clock` ignored today | Explicit G2 `probeHost` seams |
| A3 | Dual-write home vs project; copy vs symlink | **Copy** to **both** `$HOME/.cursor/agents` and `<cwd>/.cursor/agents` when flag set; no exhaustion detector (flag alone) |
| R1/R2 | Hybrid ≠ live Task | Keep S7 manual; do not inflate E5 |
| R3 | Bridge is mockable, not real Task subprocess | Exact-native + observable identity only |
| R6 | Support `explore` vs `maister-explore` | Out of scope; do not block |

---

## Planning Inputs

- `implementation/spec.md`, `implementation/tdd-red-gate.md`
- `verification/spec-audit.md` (High H1/H2 ≡ A1/A2)
- `analysis/{requirements,scope-clarifications,gap-analysis}.md`
- `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs`
- Code: `host-probes/{cursor,base}.mjs`, `cli-contract.mjs`, `production-owner.mjs`, `overlays/cursor/{overlay,inventory}.yml`, release-package Cursor bridge fixture, `transaction-manager.mjs` / `maister-install.mjs` for fallback + messaging
- Standards via `.maister/docs/INDEX.md` (minimal-implementation, error-handling, validation, testing, build-pipeline)

**Constraint:** No production code in this planning phase. Implementation groups below are for the executor.

---

## Dependency Graph and Execution Waves

| Group | Purpose | Depends on | Parallel with |
|-------|---------|------------|---------------|
| **G1** | Bridge package + overlay asset/layout/inventory | Spec approval | G3 parse-only prep |
| **G2** | Hybrid discover + A1 expectedNativeInventory + A2 probe seams | Spec approval | G1 (different files) |
| **G3** | `--agents-fallback` CLI parse + minimal dual-write | Spec approval (parse); G1 optional for agent source path | G1/G2 for parse; dual-write after G1 plugin path known |
| **G4** | Reload / docs messaging | Spec approval | G1–G3 |
| **G5** | TDD suite green + regression | G1, G2, G3 (parse), G4 (messaging optional for TDD) | — |

```text
Wave 1: G1 ∥ G2 ∥ G3(parse) ∥ G4
Wave 2: G3(dual-write wiring)
Wave 3: G5 (critical-path tip)
```

**Critical path:** G1 + G2 (A1/A2) → G5. G3 parse is on the TDD critical path for test 4; dual-write and G4 are FR completeness, not required for the four assertions except parse.

---

## Task Groups

### G1 — Bridge package + overlay asset / layout / inventory

**Purpose:** Satisfy FR1 / TDD tests 1–2 and production-owner load path for `bridge_module`.

**Depends on:** Spec approval.

**Owned write scope:**

- `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` *(new)*
- `plugins/maister/overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` *(new)*
- `plugins/maister/overlays/cursor/overlay.yml` (layout leaf + inventory required)
- `plugins/maister/overlays/cursor/inventory.yml` (required leaf)

**Implementation steps (TDD-driven):**

- [x] **1.1** Confirm RED: `node --test tests/platform-independent/cursor-agents-runtime-discovery.test.mjs` fails on missing bridge paths.
- [x] **1.2** Add `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` exporting `async function createMaisterAgentBridgeV1(request)`.
- [x] **1.3** Model factory on `tests/platform-independent/release-package.test.mjs` Cursor fixture: return `{ schema_version: 1, target: "cursor", credentials_owner: "host", version_owner: "host", native_port }`.
- [x] **1.4** Implement `native_port` closed set: `hostVersion` (non-empty string), `authenticated` (boolean), `externalCollisions` (array), `inspect`, `launch` (optional `cancel`).
- [x] **1.5** `inspect({ schema_version: 1 })` → `{ schema_version: 1, exact_launch: true, observable_identity: true }` (A5 full shape).
- [x] **1.6** `launch({ schema_version: 1, native_role_external_id, … })` → `{ schema_version: 1, observed_native_role_external_id: <echo>, output: {…}, native_observations: {…} }` (TDD asserts echo; full shape for exact-native adapter).
- [x] **1.7** Package identical-contract overlay asset at `overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` (copy or shared content — both paths must exist and load).
- [x] **1.8** Add overlay `layout` entry: `kind: file`, `source: assets/runtime/cursor-bridge-v1.mjs`, `destination: runtime/cursor-bridge-v1.mjs`, `mode: "0644"`, `ownership: whole_file` (destination must match TDD regex `destination:.*cursor-bridge-v1\.mjs|runtime\/cursor-bridge-v1`).
- [x] **1.9** Add `runtime/cursor-bridge-v1.mjs` to `overlay.yml` `inventory.required` and top-level `inventory.yml` `required` so materialize/`--check` fail closed if missing.
- [x] **1.10** Do **not** add speculative `native_assets` sha256 row unless overlay validation requires it for this leaf; prefer layout+inventory only to avoid digest churn.
- [x] **1.11** Spot-check: dynamic import of both bridge paths; `production-owner` closed-field expectations satisfied by shape (no Codex/Pi changes).

**Acceptance criteria:**

- TDD tests 1–2 pass in isolation once G1 lands.
- Overlay YAML mentions `cursor-bridge-v1.mjs` / `runtime/cursor-bridge-v1` per TDD regexes.
- Bridge is registerable as `bridge_module` for `target: "cursor"`.

**Exit:** Bridge files exist; overlay inventory/layout require the leaf.

---

### G2 — Hybrid discover + A1 expectedNativeInventory + A2 probeHost seams

**Purpose:** Satisfy FR2 / TDD test 3; address audit High A1 and A2.

**Depends on:** Spec approval. Parallel with G1 (touches `host-probes/*` only).

**Owned write scope:**

- `plugins/maister/lib/distribution/host-probes/base.mjs` (**A1**, **A2**)
- `plugins/maister/lib/distribution/host-probes/cursor.mjs` (hybrid default discover)

**Implementation steps:**

#### A1 — `expectedNativeInventory` TDD manifest shape (explicit)

- [x] **2.1** Reproduce failure mode: TDD fixture has top-level `target: "cursor"` and rows **without** `row.target`; current `filter(row => row?.target === target)` yields `[]` → `null` → E5 `manifest-discovery-subject-unavailable`.
- [x] **2.2** Extend `expectedNativeInventory(manifest, target)`:
  - Keep selecting rows where `row.target === target`.
  - **Additionally**, when `manifest?.target === target`, include rows that omit `row.target` (or treat missing as subject match).
  - Still require every selected `native_role_external_id` to be a non-empty string; return sorted unique-ready list (existing sort).
- [x] **2.3** Preserve evidence-parity behavior: `nativeManifest("cursor")` rows with per-row `target` still produce the same expected ID set.
- [x] **2.4** Add/adjust a focused unit assertion if needed (optional small case in existing probe tests) — do not weaken parity topology tests.

#### A2 — `probeHost` `hostVersion` / `clock` seams (explicit)

- [x] **2.5** Extend `probeHost` destructuring to accept `hostVersion` (string) and `clock` (function).
- [x] **2.6** Timestamp seam: if `typeof clock === "function"`, use `clock()` as the evidence `timestamp` (equivalent to injected `now`); else keep `now` default.
- [x] **2.7** Host-version seam: if `typeof hostVersion === "string" && hostVersion.length > 0`, treat host as **available** with that version and **do not** require a successful `run(command, ["--version"])` for availability (skip or ignore version spawn failure for this path). Production callers that omit `hostVersion` keep current spawn behavior.
- [x] **2.8** Ensure injected `run` still works for evidence-parity Cursor tests that pass `run: availableVersion` without `hostVersion`.

#### Hybrid default discover

- [x] **2.9** In `probeCursor`, when `typeof options.discover === "function"`, keep existing inject → `compareNativeInventory` path (wins over hybrid).
- [x] **2.10** When `discover` omitted and `pluginRoot` is a usable directory containing `agents/*.md`:
  - Read each `*.md` under `pluginRoot/agents/`.
  - Extract frontmatter `name` with a simple YAML-line matcher (reuse Pi-style `frontmatterValue` pattern or local equivalent; fixture format is `---\nname: maister-…\n`).
  - Build observation `{ native_role_external_ids: names }` (omit `observable_identity: false` / `safe_adapter: false`).
  - Pass to `compareNativeInventory({ manifest, target: "cursor", observation })` as the default `discover` implementation wired into `probeHost`.
- [x] **2.11** When `discover` omitted and `pluginRoot` missing/unusable: leave discover unset → honest E5 `unavailable` (`safe-adapter-not-configured` or clearer provisional reason — never fake Task API pass).
- [x] **2.12** Pass through `pluginRoot`, `hostVersion`, `clock`/`now`, `manifest`, `provenance` from `probeCursor` options into `probeHost`.
- [x] **2.13** Confirm TDD test 3 path: temp plugin with three agents, omit `discover`, inject `hostVersion` + `clock` → E5 `result === "passed"`.

**Acceptance criteria:**

- TDD test 3 passes.
- A1: top-level-target manifests and per-row-target manifests both yield non-null expected sets when IDs are valid.
- A2: hybrid test does not depend on a live `agent` binary.
- Injected `discover` still drives evidence-parity Cursor E5 pass/fail tests.

**Exit:** Hybrid E5 green under TDD seams; parity inject path unchanged.

---

### G3 — CLI `--agents-fallback` + minimal dual-write

**Purpose:** Satisfy FR3 / TDD test 4 (parse) and audit M1 minimal dual-write semantics.

**Depends on:** Spec approval for parse; dual-write after install commit (uses plugin active root from G1 layout world).

**Owned write scope:**

- `plugins/maister/lib/distribution/cli-contract.mjs` (`parseCliArgs`)
- `plugins/maister/lib/distribution/transaction-manager.mjs` and/or `plugins/maister/bin/maister-install.mjs` (flag-gated dual-write after successful cursor install/update)
- Optional tiny helper colocated under `lib/distribution/` if needed (e.g. `cursor-agents-fallback.mjs`) — only if it keeps transaction-manager smaller; otherwise inline minimal block

**Implementation steps:**

- [x] **3.1** Confirm RED: `parseCliArgs([…, "--agents-fallback"])` throws `E_USAGE` unknown option.
- [x] **3.2** Accept boolean flag `--agents-fallback` (no value); set `options.agentsFallback = true`.
- [x] **3.3** Ensure unknown-option rejection still applies to other unknown flags; flag absent ⇒ `agentsFallback` undefined/falsy.
- [x] **3.4** Thread `agentsFallback` through `executeLifecycle` / install-update options for `target === "cursor"` only.
- [x] **3.5** **Minimal dual-write (plan choice for A3):** when `agentsFallback === true` and command is `install` or `update` for cursor, **after** successful primary plugin materialize/commit:
  - Source: projected agents from active plugin root `…/agents/*.md`.
  - Destinations (both, create parents as needed):
    1. `$HOME/.cursor/agents/` (from `--home` / resolved home)
    2. `<cwd>/.cursor/agents/` (process working directory; best-effort)
  - Mechanism: **file copy** (not symlink) of agent markdown leaves; do not replace unrelated operator files outside copied names if avoidable — overwrite same-named Maister agent files only.
  - Label in messaging as **fallback**, not primary delivery.
- [x] **3.6** Flag absent ⇒ **no** dual-write (plugin-only).
- [x] **3.7** No separate “plugin-path exhaustion” detector — flag alone is sufficient (scope clarification optional-fallback).
- [x] **3.8** Do not dual-write for Codex/Pi/Kiro; do not change managedRoots registry to make dual-write primary.

**Acceptance criteria:**

- TDD test 4: `parsed.agentsFallback === true`.
- Flag-absent install path unchanged (no dual-write).
- Dual-write documented in implementation log as copy-to-home-and-cwd fallback.

**Exit:** Parse green; cursor-only optional dual-write wired behind the flag.

---

### G4 — Reload / docs messaging

**Purpose:** Satisfy FR4 / S5 — reload is a prerequisite for Task discovery claims.

**Depends on:** Spec approval. Parallel with G1–G3.

**Owned write scope (pick the smallest operator-facing surfaces that already emit install success):**

- `plugins/maister/bin/maister-install.mjs` success `envelope.message` for cursor install/update (extend beyond bare `"install completed"`)
- and/or a short note in Cursor overlay operator docs if one exists under `plugins/maister/overlays/cursor/` / project docs — prefer CLI envelope so every install sees it
- Optional: include one line in dual-write success path that fallback still requires reload

**Implementation steps:**

- [x] **4.1** On successful cursor `install`/`update`, set operator-facing message text that states Cursor must be **reloaded/restarted** after agent materialize before claiming Task / `subagent_type` discovery of `maister-*`.
- [x] **4.2** When `--agents-fallback` was used, mention fallback dual-write is secondary and reload still required.
- [x] **4.3** Keep messaging fail-closed honest: do not claim Task enum observed from disk/hybrid alone.
- [x] **4.4** No mass skill rewrite; skills stay Task-oriented (Key Decision 5).

**Acceptance criteria:**

- S5: install/update success path for cursor mentions reload before Task discovery claims.
- No invented Task API claims in messaging.

**Exit:** Operator guidance present on the success envelope (and docs if touched).

---

### G5 — Make TDD suite green + regression

**Purpose:** FR5 / S6 — four TDD tests pass; no Codex or Cursor parity regressions.

**Depends on:** G1, G2, G3 (parse at minimum), G4 (non-blocking for TDD assertions).

**Owned write scope:**

- Fixes only as needed from G1–G4 failures; no new features
- Task `implementation/implementation-log.md` (executor records results)

**Implementation steps:**

- [x] **5.1** Run `node --test tests/platform-independent/cursor-agents-runtime-discovery.test.mjs` → **4 pass / 0 fail**.
- [x] **5.2** Regression: Cursor inject-discover cases in `tests/platform-independent/evidence-parity-topology.test.mjs` (E5 pass/fail/collision) remain green.
- [x] **5.3** Regression: `tests/platform-independent/release-package.test.mjs` Cursor bridge injection / packaging paths remain green.
- [x] **5.4** Smoke-adjacent: `tests/platform-independent/launcher-cli.test.mjs` / `target-registry.test.mjs` still parse known options; `--agents-fallback` does not break launcher contract (launcher may still reject the flag — only `parseCliArgs` install path must accept it).
- [x] **5.5** Confirm Codex probe/install paths untouched (no file edits under Codex overlay/adapters unless accidental — revert if so).
- [x] **5.6** Record automated Done vs S7 manual smoke split in implementation log.
- [x] **5.7** Manual checklist (not automated): after install + reload, Task lists/invokes at least `maister-explore` / `maister-code-reviewer` when claiming product Done.

**Acceptance criteria:**

- S6: full TDD file green.
- Evidence-parity Cursor + release-package Cursor paths green.
- No Codex regressions from this worktree’s Cursor-scoped changes.

**Exit:** Phase 9 automated gate ready; S7 remains operator smoke.

---

## Acceptance Criteria Summary (cross-group)

| ID | Criterion | Group |
|----|-----------|-------|
| S1 | Packaged bridge exact-native + observable identity | G1 |
| S2 | Overlay asset + inventory/layout require bridge | G1 |
| S3 | Hybrid `probeCursor` E5 passed from plugin agents | G2 (A1+A2) |
| S4 | `--agents-fallback` → `agentsFallback: true` | G3 |
| S5 | Reload guidance on install messaging | G4 |
| S6 | TDD file 4/4 green | G5 |
| S7 | Manual Task smoke (product Done) | G5 checklist / operator |
| A1 | Top-level + per-row manifest target shapes | G2 |
| A2 | `hostVersion` / `clock` seams | G2 |

---

## File Touch List

| Path | Action | Group |
|------|--------|-------|
| `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` | **Create** | G1 |
| `plugins/maister/overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` | **Create** | G1 |
| `plugins/maister/overlays/cursor/overlay.yml` | **Edit** (layout + inventory.required) | G1 |
| `plugins/maister/overlays/cursor/inventory.yml` | **Edit** (required leaf) | G1 |
| `plugins/maister/lib/distribution/host-probes/base.mjs` | **Edit** (A1 `expectedNativeInventory`, A2 seams) | G2 |
| `plugins/maister/lib/distribution/host-probes/cursor.mjs` | **Edit** (hybrid discover + option passthrough) | G2 |
| `plugins/maister/lib/distribution/cli-contract.mjs` | **Edit** (`--agents-fallback`) | G3 |
| `plugins/maister/lib/distribution/transaction-manager.mjs` | **Edit** (optional dual-write hook) | G3 |
| `plugins/maister/bin/maister-install.mjs` | **Edit** (message +/or dual-write orchestration) | G3/G4 |
| `plugins/maister/lib/distribution/cursor-agents-fallback.mjs` | **Create if needed** (minimal helper) | G3 |
| `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs` | **Run only** (do not weaken) | G5 |
| `tests/platform-independent/evidence-parity-topology.test.mjs` | **Run** regression | G5 |
| `tests/platform-independent/release-package.test.mjs` | **Run** regression | G5 |

**Out of touch (explicit):** Codex overlays/adapters, `agent-projector.mjs` / frontmatter (unless smoke later proves need), support inventory `explore` ID, skill mass rewrite, invented Task inventory API.

---

## Self-check (planner)

- [x] Addresses audit High A1 and A2 with explicit steps
- [x] Five groups cover bridge/overlay, hybrid+seams, CLI+dual-write, reload docs, TDD/regression
- [x] Checkbox steps; TDD-first where applicable
- [x] Acceptance criteria per group
- [x] File touch list
- [x] No production code written in this phase
- [x] Dual-write plan choice recorded (copy; home + cwd; flag-alone)
- [x] Done split automated vs S7 manual preserved
