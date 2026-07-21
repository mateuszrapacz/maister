# Specification: Fix Cursor agents runtime discovery

**Task:** `2026-07-21-fix-cursor-agents-runtime-discovery`  
**Worktree:** `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`  
**TDD contract:** `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs` (4 RED → must go green)  
**Risk:** High · **Scope expanded:** E6 bridge in-scope

---

## TL;DR

Cursor plugin install already materializes 29 agents under `~/.cursor/plugins/local/maister` and declares them in `plugin.json`, but Task/`subagent_type` does not surface `maister-*`, and Maister E5/E6 stay `unavailable` without injected discover/invoke and without a packaged bridge. This work packages a Cursor exact-native bridge for E6, gives `probeCursor` a hybrid default discover from plugin `agents/*.md` when `pluginRoot` is available, adds CLI `--agents-fallback` for optional dual-write after plugin-path exhaustion, and documents reload as a prerequisite for discovery claims — without inventing a public Cursor Task inventory API and without making dual-install the primary delivery path.

## Key Decisions

1. **Success** = operator can list/invoke `maister-*` via Task/`subagent_type` after plugin install (+ reload); automated half is hybrid E5 from plugin-disk names; E6 bridge packaging is in-scope.
2. **Primary delivery** = Cursor plugin overlay (`~/.cursor/plugins/local/maister`); dual-copy/symlink to `~/.cursor/agents` or project `.cursor/agents` only behind `--agents-fallback`.
3. **Hybrid E5** = when `options.discover` is omitted and `pluginRoot` is set, observe `maister-*` names from on-disk agent frontmatter; when discover is injected, keep existing injection path; when neither is available, remain honest `unavailable` / provisional + mandatory manual smoke for release claims.
4. **Bridge** = ship `createMaisterAgentBridgeV1` as a loadable exact-native port (inspect/launch + observable identity), modeled on the release-package fixture and validated by `production-owner` contract — packaged at distribution + overlay asset/inventory/layout.
5. **Skills stay Task-oriented**; frontmatter/filename projector churn only with smoke evidence (not speculative).
6. **Codex / sibling runtimes untouched**; worktree isolation.

## Open Questions & Risks

| ID | Item | Mitigation in this spec |
|----|------|-------------------------|
| R1 | Cursor may still omit plugin agents from Task after correct packaging (product/session skew) | Plugin-primary + reload guidance + optional `--agents-fallback`; do not fake Task API |
| R2 | Hybrid disk discover ≠ live Task enum | Document as automated proof of projected inventory presence; manual smoke remains mandatory for “Task lists `maister-*`” Done claims when no live Task observer exists |
| R3 | Bridge launch is test/host-mockable, not a real Cursor Task subprocess | Exact-native contract + observable identity; fail-closed without `bridge_module` remains for non-packaged paths |
| R4 | TDD manifest fixture uses top-level `target` without per-row `target` | Expected-inventory derivation for Cursor hybrid must accept that shape so E5 can pass |
| R5 | Projection digest/`--check` churn if frontmatter changes | Out of scope unless smoke proves loader rejection |
| R6 | Support inventory `explore` vs `maister-explore` ID skew | Do not block this task; E5 compare uses canonical rows; note for follow-up if support rows enter compare |

---

## 1. Problem statement & success criteria

### Problem

Layer 1–2 (projection + on-disk plugin agents) are healthy; Layer 3 (host Task access) fails. Maister `verify` and default E5/E6 prove receipt/hash integrity only — they never observe Task inventory and do not ship a Cursor `bridge_module`. Operators get a green install while orchestrator skills that `Task` `maister-*` fail.

### Success criteria

| # | Criterion | Proof |
|---|-----------|-------|
| S1 | Packaged Cursor bridge exports `createMaisterAgentBridgeV1` with exact-native inspect/launch + observable identity | TDD test 1 + production-owner contract |
| S2 | Overlay ships bridge leaf and requires it in inventory/layout | TDD test 2 |
| S3 | `probeCursor({ pluginRoot, manifest, … })` without injected `discover` yields E5 `passed` when plugin agents on disk match manifest native IDs | TDD test 3 |
| S4 | `parseCliArgs([…, "--agents-fallback"])` → `agentsFallback: true` | TDD test 4 |
| S5 | Operator guidance states reload Cursor after install/update before claiming Task discovery | Docs / install messaging |
| S6 | Full TDD file green: `node --test tests/platform-independent/cursor-agents-runtime-discovery.test.mjs` | Phase 9 gate |
| S7 | Manual smoke (when claiming Done for Task enum): after reload, Task lists/invokes at least `maister-explore` / `maister-code-reviewer` | Operator checklist |

---

## 2. Functional requirements

### FR1 — Bridge packaging (E6)

- **New module** at `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs` exporting `createMaisterAgentBridgeV1`.
- **Overlay asset** at `plugins/maister/overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` (same contract; may be identical content or a packaged copy of the distribution module — WHAT: both paths exist and are loadable).
- **Overlay layout** includes a leaf mapping source → destination for `cursor-bridge-v1.mjs` under the plugin install tree (destination path must match inventory and be discoverable as `runtime/cursor-bridge-v1.mjs` or equivalent named in overlay YAML).
- **Inventory** (`overlay.yml` inventory + `inventory.yml`) lists/requires the bridge leaf so materialize/`--check` fail closed if missing.
- Bridge is registerable as production `bridge_module` for `target: "cursor"`.

### FR2 — Hybrid default discover for `probeCursor`

- When `options.discover` is a function: keep current behavior (inject → `compareNativeInventory`).
- When `options.discover` is omitted **and** `pluginRoot` is a usable plugin install root containing `agents/*.md`:
  - Default-discover by reading agent markdown frontmatter `name` values (expected `maister-*`).
  - Feed those IDs as `native_role_external_ids` into `compareNativeInventory` against the supplied `manifest`.
  - E5 result `passed` when observed set exactly matches expected native IDs for the Cursor subject.
- When discover is omitted and `pluginRoot` is missing/unusable: remain `unavailable` with an honest reason (e.g. `safe-adapter-not-configured` or a clearer provisional reason) — never invent a Task API pass.
- Explicit injected `discover` always wins over hybrid default.
- Test seams required by the TDD contract: honor injected `hostVersion` / `clock` (or `now`) so probes are mockable without depending on a live `agent --version` binary for the hybrid-discover test path.

### FR3 — CLI `--agents-fallback`

- `parseCliArgs` accepts boolean flag `--agents-fallback` and sets `agentsFallback: true`.
- Semantic WHAT (beyond parse): when set on install/update for `cursor`, after primary plugin-path materialize, optionally dual-write/symlink projected agents into the user agents dir (`~/.cursor/agents`) and/or project `.cursor/agents` as a **fallback** path — clearly labeled fallback, not primary delivery.
- Flag absent ⇒ no dual-write (plugin-only).

### FR4 — Reload guidance

- Install/update/verify operator-facing messaging (CLI envelope message and/or Cursor overlay docs) states that Cursor must be reloaded/restarted after agent materialize before claiming Task/`subagent_type` discovery.
- Discovery claims without reload are incomplete.

### FR5 — Green TDD suite

- All four tests in `cursor-agents-runtime-discovery.test.mjs` pass without weakening assertions.
- Existing evidence-parity / release-package Cursor probe and bridge-injection tests remain green (no Codex regressions).

---

## 3. Non-goals

- Inventing or scraping a public Cursor Task/`subagent_type` inventory API.
- Making dual-install to `~/.cursor/agents` the default/primary delivery.
- Mass skill rewrite or bridge-first skill text (skills stay Task-oriented).
- Speculative frontmatter/`advisor.md` vs `name` normalization without smoke evidence.
- Codex runtime install, Pi adapter changes, or other-target overlays.
- UI/mockups.
- Claiming `native_discovery` solely from disk hashes without hybrid/manual honesty.
- Changing support inventory `explore` → `maister-explore` unless required for a failing contract (documented risk only).

---

## 4. Reusability analysis

| Asset | Action | Rationale |
|-------|--------|-----------|
| `host-probes/cursor.mjs` | **Extend** | Add hybrid default discover + `pluginRoot` / test seams; keep injection path |
| `host-probes/base.mjs` `compareNativeInventory` / `expectedNativeInventory` | **Extend if needed** | Must accept TDD manifest shape (top-level `target`, rows with `native_role_external_id`) so hybrid E5 can pass; preserve existing parity tests that use per-row `target` |
| `cli-contract.mjs` `parseCliArgs` | **Extend** | Add `--agents-fallback` → `agentsFallback` |
| Overlay `layout` / `inventory` patterns (hooks, skills) | **Reuse** | Add runtime bridge leaf the same way other required leaves are declared |
| `production-owner.mjs` exact-native validation | **Reuse (no redesign)** | Bridge must satisfy existing closed field sets |
| `release-package.test.mjs` Cursor bridge fixture | **Model after** | Factory shape, inspect/launch return fields, ownership |
| `exact-native.mjs` / `host-adapters/cursor.mjs` | **Reuse as consumers** | Bridge supplies `native_port`; adapters already expect exact-native |
| `agent-projector.mjs` / frontmatter | **Leave** unless smoke evidence | Avoid digest churn |
| New `bridges/cursor-bridge-v1.mjs` | **Create** | No packaged Cursor bridge exists today |

---

## 5. Component / module responsibilities

| Component | Responsibility |
|-----------|----------------|
| `bridges/cursor-bridge-v1.mjs` | Export `createMaisterAgentBridgeV1`; return closed bridge + exact-native `native_port` (inspect/launch; optional cancel) |
| `overlays/cursor/assets/runtime/cursor-bridge-v1.mjs` | Installable plugin leaf identical in contract to the distribution bridge |
| `overlays/cursor/overlay.yml` + `inventory.yml` | Declare layout destination + required inventory for the bridge leaf |
| `host-probes/cursor.mjs` | Wire hybrid discover from `pluginRoot`; preserve inject-discover; pass through probeHost |
| `host-probes/base.mjs` (if touched) | Expected-inventory derivation compatible with hybrid + existing fixtures |
| `cli-contract.mjs` | Parse `--agents-fallback` |
| Install/transaction path (cursor) | When `agentsFallback`, perform optional dual-write after plugin primary; surface reload guidance in success messaging |
| Operator docs / messages | Reload prerequisite; fallback flag semantics |

---

## 6. Contracts

### 6.1 `createMaisterAgentBridgeV1` — exact-native Cursor port

**Export:** `async function createMaisterAgentBridgeV1(request)`

**Request (minimum accepted by TDD; align with production-owner closed set when used as `bridge_module`):**

| Field | Constraint |
|-------|------------|
| `schema_version` | `1` |
| `operation` | `"evaluate_gate"` (production); TDD may pass same |
| `target` | `"cursor"` |
| `home`, `state_root`, `working_root`, `state_path`, `plugin_source_root` | paths (production validates realpaths) |

**Bridge response (exact fields):**

| Field | Value |
|-------|--------|
| `schema_version` | `1` |
| `target` | `"cursor"` |
| `credentials_owner` | `"host"` |
| `version_owner` | `"host"` |
| `native_port` | exact-native port object |

**`native_port` (production-owner exact-native):**

| Field | Constraint |
|-------|------------|
| `hostVersion` | non-empty string |
| `authenticated` | boolean |
| `externalCollisions` | array |
| `inspect` | async function |
| `launch` | async function |
| `cancel` | optional function |

**`inspect({ schema_version: 1, … })` →** includes `exact_launch: true` and `observable_identity: true` (TDD asserts both; prefer also `schema_version: 1` for release-fixture parity).

**`launch({ schema_version: 1, native_role_external_id, task, … })` →** returns `observed_native_role_external_id` equal to the requested `native_role_external_id` (TDD). Full production launch may also return `output` + `native_observations` as in the release-package fixture; TDD only requires observed identity.

**Packaging paths (both required):**

1. `plugins/maister/lib/distribution/bridges/cursor-bridge-v1.mjs`
2. `plugins/maister/overlays/cursor/assets/runtime/cursor-bridge-v1.mjs`

### 6.2 `probeCursor` — hybrid discover

```text
probeCursor(options):
  if typeof options.discover === "function"
    → existing inject path → compareNativeInventory(observation)
  else if pluginRoot usable
    → observation.native_role_external_ids = names from pluginRoot/agents/*.md frontmatter
    → compareNativeInventory({ manifest, target: "cursor", observation })
  else
    → E5 unavailable (honest reason)
```

**Observation shape for compare:** mapping with `native_role_external_ids: string[]` (and not `observable_identity: false` / `safe_adapter: false`).

**Expected IDs:** derived from `manifest.rows` for Cursor such that the TDD fixture (top-level `target: "cursor"`, rows with `native_role_external_id` only) yields a non-null expected set matching the three fixture names. Existing parity fixtures that set per-row `target` must keep working.

**E5:** `passed` when sorted unique observed IDs exactly equal sorted unique expected IDs.

### 6.3 CLI flag

```text
parseCliArgs(["install"|"update", "--target", "cursor", …, "--agents-fallback"])
  → options.agentsFallback === true
```

Unknown-option rejection must not apply to `--agents-fallback`. Flag is boolean (no value).

### 6.4 Overlay inventory / layout (bridge leaf)

- Overlay YAML references `cursor-bridge-v1.mjs` (path form matching TDD regex: `runtime/cursor-bridge-v1.mjs` or bare `cursor-bridge-v1.mjs`).
- Inventory YAML contains `cursor-bridge-v1.mjs`.
- Layout entry includes `destination` pointing at the installed bridge path (`…cursor-bridge-v1.mjs` or `runtime/cursor-bridge-v1`).

---

## 7. Acceptance criteria ↔ TDD mapping

| TDD test | Acceptance |
|----------|------------|
| **packages `createMaisterAgentBridgeV1` at distribution bridge path** | File exists; dynamic import exports function; factory returns bridge with schema/target/owners; `inspect` ⇒ `exact_launch` + `observable_identity`; `launch` echoes `native_role_external_id` as `observed_native_role_external_id` |
| **overlay ships bridge asset and requires it in inventory** | Overlay asset file exists; `overlay.yml` and `inventory.yml` mention bridge; layout destination present |
| **probeCursor hybrid default discover observes maister-* from plugin agents** | Temp `pluginRoot` with three agents; omit `discover`; E5 record `result === "passed"` |
| **install CLI accepts `--agents-fallback`** | `parseCliArgs(… "--agents-fallback").agentsFallback === true` |

**Suite command:**

```bash
cd /Users/mrapacz/Workspace/maister-wt-fix-cursor-agents
node --test tests/platform-independent/cursor-agents-runtime-discovery.test.mjs
```

**Done for automated gate:** 4 pass / 0 fail.  
**Done for product smoke (S7):** reload + Task enum observation (manual).

---

## 8. Standards compliance notes

| Standard | Application |
|----------|-------------|
| **Minimal implementation** | Only bridge packaging, hybrid discover, CLI flag, overlay inventory/layout, reload messaging, and fallback wiring needed for the contracts — no speculative projector/API layers |
| **Coding style / conventions** | ESM under `plugins/maister/`; match host-probe and cli-contract patterns; no dead stubs |
| **Error handling** | Fail-closed: missing bridge asset fails inventory; missing discover stays `unavailable`; never turn absence into a false E5/E6 pass |
| **Validation** | Bridge closed fields; CLI allowlist for `--agents-fallback`; overlay schema/inventory validation continues to reject missing required leaves |
| **Test writing** | Behavior at host seam; distinguish `passed` / `failed` / `unavailable`; TDD file is the critical-path contract; do not weaken parity topology tests |
| **Build pipeline** | Overlay/layout changes remain under canonical `plugins/maister/`; no hand-edited generated targets |
| **Architecture** | Canonical plugin + target adapter; Cursor remains `cursor.native` exact-native; credentials/version ownership stay `host` |

---

## 9. User journey (operator)

1. Install/update Maister for `--target cursor` (plugin primary).
2. Optionally pass `--agents-fallback` only after plugin-path exhaustion or for known Task-gap hosts.
3. Reload Cursor.
4. Confirm Task/`subagent_type` lists `maister-*` (manual smoke).
5. Orchestrator skills that Task `maister-*` succeed; Advisor/gate can register packaged `bridge_module` for E6 when claiming `native_runtime`.

---

## 10. Self-verification checklist

- [ ] Spec states **WHAT**, not a step-by-step implementation plan
- [ ] FR cover: bridge packaging, hybrid discover, `--agents-fallback`, reload guidance, green TDD
- [ ] Non-goals exclude dual-install-as-primary, invented Task API, Codex, speculative frontmatter
- [ ] Reusability: extend probe/cli/overlay; new bridge module; model release-package fixture
- [ ] Contracts: `createMaisterAgentBridgeV1`, `probeCursor`+`pluginRoot`, CLI flag, overlay inventory/layout
- [ ] Acceptance mapped 1:1 to the four failing tests
- [ ] Standards notes cite INDEX domains used
- [ ] E6 bridge marked in-scope (scope clarifications)
- [ ] Hybrid honesty preserved when `pluginRoot` absent
- [ ] No production source code modified by this phase
- [ ] HTML companion (optional) mirrors md content only

---

## References

- `analysis/requirements.md`
- `analysis/gap-analysis.md`
- `analysis/clarifications.md`
- `analysis/scope-clarifications.md`
- `analysis/codebase-analysis.md`
- `implementation/tdd-red-gate.md`
- `tests/platform-independent/cursor-agents-runtime-discovery.test.mjs`
- `plugins/maister/lib/distribution/host-probes/{cursor,base}.mjs`
- `plugins/maister/lib/distribution/cli-contract.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-owner.mjs`
- `tests/platform-independent/release-package.test.mjs` (Cursor bridge fixture)
- `.maister/docs/INDEX.md`
