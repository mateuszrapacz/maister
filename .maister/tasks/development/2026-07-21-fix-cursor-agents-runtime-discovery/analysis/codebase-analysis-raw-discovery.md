## TL;DR

Maister’s Cursor install path is doing what the code claims: materialize **28** canonical agents + **1** support (`explore`) into `~/.cursor/plugins/local/maister/agents/*.md` with frontmatter `name: maister-<role_id>`, declare `"agents": "./agents/"` in `.cursor-plugin/plugin.json`, and hash them into the receipt. **Skills load; agents sit on disk.** The active Cursor receipt records **E5/E6 as `unavailable`** (`runtime-or-scenario-unavailable`) — install never proves host Task inventory. Skills are rewritten to call `subagent_type: "maister-explore"` / `maister-*`, which **depends** on Cursor exposing plugin agents in the Task enum. Observed smoke (Task only lists built-ins) contradicts Maister’s assumed Cursor contract; the gap is **runtime discovery / host surface**, not a missing projected file. Separate from IDE Task: `cursor.native` is an injected bridge (`inspect`/`launch`) that defaults to unavailable without a host bridge module.

## Key Decisions

1. **Canonical → Cursor identity:** `plugins/maister/agents/<role_id>.md` → staged `agents/<role_id>.md` with `name: maister-<role_id>` (`agent-projector.mjs` `cursorAgent`, `TARGET_IDENTITIES.cursor.nativePrefix = "maister-"`).
2. **Materialize owns agents:** layout copies only `assets/support-agents` → `agents`; canonical roles are written by `projectCanonicalAgents` after assembly (`materializer.mjs`). No checked-in `overlays/cursor/assets/agents/` behavior tree.
3. **Delegation binding:** overlay `delegate_agent.adapter: cursor.native` — exact-native adapter, not a separate Task wrapper (`overlay.yml`, `host-adapters/cursor.mjs` → `exact-native.mjs`).
4. **Skill transform:** `cursor-explore-agent-v1` rewrites Explore → `maister-explore` in skill text (`cursor-skill-projector.mjs`).
5. **Evidence honesty:** default install synthesizes E5/E6 unavailable; Cursor E5 only passes with an injected `discover` observation matching manifest IDs (`host-probes/base.mjs`, receipt on this machine).
6. **Kiro contrast:** Kiro also installs into native `~/.kiro/agents` leaf_set; Cursor has **only** the plugin whole_tree root (`targets.mjs`) — no parallel user/project agents root in Maister’s managed inventory.

## Open Questions & Risks

1. **Docs gap (Cursor product):** Plugins docs package `agents/`; Subagents docs document Task discovery for `.cursor/agents/` / `~/.cursor/agents/` and omit plugin roots. Bridging behavior is underspecified — **do not invent** that plugin agents are Task-invisible; also do not treat disk+manifest as Task proof.
2. **Session dependence:** sibling Cursor-docs research notes this subagent may see `maister-*` in Task while the parent smoke saw only built-ins — reload / loader bugs are plausible confounders.
3. **Extra frontmatter:** Maister emits `color`, `skills:` arrays not in Cursor’s published agent field table — unknown whether that blocks registration (hypothesis).
4. **Filename vs `name`:** files are `advisor.md` with `name: maister-advisor` (official template often matches filename to name) — unknown impact.
5. **Support ID mismatch:** overlay support `native_role_external_id: explore` vs file `name: maister-explore` — E5 inventory uses canonical rows only (not support), so install E5 would not catch this; Task/skills still need `maister-explore`.
6. **Two delegation stories:** IDE skills say “use Task + `maister-*`”; gate/runtime says “use `cursor.native` bridge.” Fixing one without aligning the other leaves workflows broken.
7. **Codex sibling:** Codex does not use Task `subagent_type` for roles (`codex.exec` prompt injection) — fixing Codex runtime install does not fix Cursor Task discovery.

---

# 1. How Cursor overlay projects agents

## 1.1 Overlay contract

**File:** `plugins/maister/overlays/cursor/overlay.yml`

| Concern | Code fact |
|---|---|
| Discovery root | `target.discovery_roots: [.cursor/plugins/local/maister]` (lines 7–8) |
| Skills layout | `assets/skills` → `skills` (tree) |
| Support agents layout | `assets/support-agents` → `agents` (tree) — **only** `explore.md` in assets |
| Manifest | `assets/plugin.json` → `.cursor-plugin/plugin.json` |
| Inventory | required `agents/*.md`, `skills/maister-*/SKILL.md` |
| Delegation | `semantic_bindings.delegate_agent.adapter: cursor.native` (lines 47–50) |
| Capabilities | `native_discovery` requires E1,E2,E5; `native_runtime` requires E3,E6 |
| Agent projection | 28 `canonical_roles`; destination `agents/{role_id}.md`; transforms `canonical-body-v1`, `cursor-frontmatter-v1` |
| Support | `support_id: explore`, `native_role_external_id: explore`, destination `agents/explore.md` |

Mirror: `plugins/maister/overlays/cursor/inventory.yml` (same projection block).

## 1.2 Plugin manifest asset

**File:** `plugins/maister/overlays/cursor/assets/plugin.json`

```json
"skills": "./skills/",
"agents": "./agents/",
"hooks": "./hooks/hooks.json"
```

**Installed evidence (read-only):** `~/.cursor/plugins/local/maister/.cursor-plugin/plugin.json` matches. No root-level `plugin.json` (correct per Cursor plugins reference requiring `.cursor-plugin/plugin.json`).

## 1.3 Agent IR → manifest → projection

| Module | Role |
|---|---|
| `plugins/maister/lib/distribution/agent-manifest.mjs` | Contract validation; Cursor expected identity `adapter_id: cursor.native`, `representation: cursor-markdown`, template `maister-{role_id}` (EXPECTED_TARGETS, lines 18–22); `buildAgentManifest` expands destinations per role |
| `plugins/maister/lib/distribution/agent-projector.mjs` | `TARGET_IDENTITIES.cursor` (lines 19–24); `cursorAgent()` emits YAML frontmatter + body (lines 176–188); canonical Cursor outputs require destination kind `agent` and path `agents/${role_id}.md` (lines 269–281); `supportOutputs` copies support assets including explore |
| `plugins/maister/lib/distribution/materializer.mjs` | `withoutProjectionOwnedLeaves` strips layout leaves that projection owns (lines 1232–1236, 1318–1321); then `projectCanonicalAgents` (1238–1255, 1342–1346) |

**Projection identity invariant (code):** for Cursor, `native_role_external_id === "maister-" + role_id` must match manifest row or projection fails (`agent-projector.mjs` validateInputs, lines 105–117).

**Support explore content (code):** `overlays/cursor/assets/support-agents/explore.md` frontmatter `name: maister-explore` (not `explore`). Overlay support inventory still declares `native_role_external_id: explore` (`overlay.yml` lines 191–198).

## 1.4 Installed on-disk set (evidence)

| Count | Content |
|---|---|
| 28 | Canonical roles (`advisor.md` … `user-docs-generator.md`) with `name: maister-<role_id>` |
| +1 | `explore.md` → `name: maister-explore` |
| =29 | Matches smoke |

Receipt inventory includes `agents/` directory + all agent files (`receipts/8dbfaa16-…json`, 145 managed entries).

---

# 2. How `cursor.native` is supposed to dispatch agents

## 2.1 Adapter stack (code facts)

```
createCursorAdapter (host-adapters/cursor.mjs)
  → createExactNativeAdapter({ adapterId: "cursor.native", target: "cursor" })
       (host-adapters/exact-native.mjs)
```

**Dispatch algorithm (`exact-native.mjs`):**

1. Validate dispatch plan (`target`, `adapter_id`, `native_role_external_id`).
2. `nativePort.inspect` → must return `{ schema_version: 1, exact_launch: true, observable_identity: true }` or status `unavailable` (`E_NATIVE_EXACT_LAUNCH_UNAVAILABLE` / `E_NATIVE_IDENTITY_UNOBSERVABLE`).
3. Record durable events; `nativePort.launch` with exact `native_role_external_id`.
4. Compare `observed_native_role_external_id` byte-for-byte to plan; mismatch → `E_AGENT_WRONG_OBSERVED_IDENTITY`.
5. **No** Task-tool call, **no** filesystem fallback, **no** built-in Explore fallback.

**Registry:** `host-adapters/index.mjs` registers `cursor.native` only when `cursor.nativePort` is supplied.

## 2.2 Production wiring (code facts)

| Piece | Behavior |
|---|---|
| `production-runtime.mjs` `unavailableNativePort()` | Default: `exact_launch: false`, `observable_identity: false`; `launch` throws (lines 154–161) |
| `createProductionAgentRuntime` | Uses `nativePorts.cursor` or unavailable stub (lines 247–267) |
| `production-owner.mjs` | Loads optional `bridge_module` exporting `createMaisterAgentBridgeV1`; validates closed `native_port` with `inspect`/`launch` (lines 112–120, 124–149) |
| README “Agent projections and dispatch” | Documents bridge ownership of credentials/version; never invents Task enum |

**Important distinction:** IDE agents using Skill/Task prompts are **not** automatically going through `cursor.native`. Gate/Advisor path uses the owner + bridge. Orchestrator skills still instruct the **Cursor Agent** to call Task with `maister-*` strings.

## 2.3 Resolver (code facts)

`agent-resolver.mjs` maps target `cursor` → `{ adapterId: "cursor.native", representation: "cursor-markdown", native: true }`. Logical role `maister:<role_id>` resolves to `native_role_external_id: maister-<role_id>`.

## 2.4 Host probe for E5/E6 (code facts)

`host-probes/cursor.mjs`:

- Discovery scenario: `cursor-native-inventory-v1`
- Invocation scenario: `cursor-native-invocation-v1`
- `discover` only if caller injects `options.discover`; then `compareNativeInventory` against manifest rows’ `native_role_external_id` list
- Without `discover`: E5 result path → `unavailable` / `safe-adapter-not-configured` (`base.mjs` lines 118–132)
- Without `invoke`+`runScenario`: E6 → `scenario-not-configured`

`host-capabilities.yml` documents Cursor `runtime_evidence: unavailable-until-safe-observable-configured-scenario`.

**This machine’s active Cursor receipt:** E5/E6 `unavailable`, scenarios labeled `native-discovery-v1` / `native-runtime-v1` (evidence-policy placeholder names via `collectEvidence` / `unavailableReason: runtime-or-scenario-unavailable` in `transaction-manager.mjs` ~300), not a passed `cursor-native-inventory-v1` observation.

---

# 3. Skills rewrite Explore → `maister-explore` (Task dependency)

## 3.1 Transform (code fact)

`plugins/maister/lib/distribution/cursor-skill-projector.mjs` `applyCursorTransforms` (lines 244–247):

```js
apply('cursor-explore-agent-v1', 'subagent_type="Explore"', 'subagent_type="maister-explore"');
apply('cursor-explore-agent-v1', 'subagent_type: "Explore"', 'subagent_type: "maister-explore"');
apply('cursor-explore-agent-v1', 'subagent_type="explore"', 'subagent_type="maister-explore"');
apply('cursor-explore-agent-v1', 'subagent_type: "explore"', 'subagent_type: "maister-explore"');
```

## 3.2 Checked-in / installed skill text (evidence)

Installed overlay skills already contain rewritten forms, e.g.:

- `skills/maister-quick-plan/SKILL.md`: `subagent_type: "maister-explore"`
- `skills/maister-quick-bugfix/SKILL.md`: `Task + maister-explore`

Portable orchestrator patterns still teach Task for agents (`orchestrator-patterns.md`: “agents always use Task tool”; wrong type → “Agent type not found”).

## 3.3 Dependency chain

```
Skill instructs Task(subagent_type=maister-*)
  → Cursor must expose that type in available_subagent_types
    → Smoke: only built-ins present
      → Skill path fails even though agents/*.md exist
```

**Hook asymmetry:** `block-risky-subagents.sh` still **allows** built-in `explore`/`Explore` and `maister-*` (lines 12–22). Rewrite pushes workflows off the allowlisted built-in onto a type that may not be registered → worse failure mode than leaving Explore.

---

# 4. Install / materialize steps that might omit agents or fail to register with Cursor

## 4.1 What install **does** prove (code + receipt)

1. Materialize staging with projected agents + support explore.
2. Transactional copy into `~/.cursor/plugins/local/maister` (whole_tree).
3. Receipt managed inventory hashes for `agents/*.md`.
4. E1–E4 pass; E5/E6 unavailable placeholders unless host probe records supplied.

**Verify** = receipt drift / inventory integrity — **not** “Cursor loaded these into Task” (`transaction-manager.mjs`; contrast Codex-only native deploy verify).

## 4.2 What install **does not** do

| Missing step | Evidence |
|---|---|
| Call Cursor to list discovered agents | No Cursor equivalent of Codex `plugin list` verify (`codex-deployment` tests; context analysis) |
| Inject default filesystem/Task `discover` into `probeCursor` | Tests only pass E5 with mock `discover` (`evidence-parity-topology.test.mjs` ~688–700) |
| Install into `~/.cursor/agents/` or project `.cursor/agents/` | `targets.mjs` Cursor managedRoots = plugin_private only; Kiro alone has `kiro_native_agents` leaf_set |
| Require session reload | Outside Maister code; Cursor docs/staff often require restart (sibling docs research) |
| Ship a production Cursor bridge module by default | Owner requires explicit `bridge_module`; else unavailable native port |

## 4.3 Omission hypotheses ranked lower for **this** smoke

Because smoke already sees **29 files + plugin.json agents key + working skills**, root cause is unlikely “projector skipped agents” or “layout wiped agents.” More likely host registration / Task surface / session.

---

# 5. Docs / tests about Cursor agent discovery, native-discovery-v1, E5–E6

## 5.1 In-repo docs / research (facts)

| Source | Claim |
|---|---|
| `docs/README.md` | E5/E6 may be unavailable; unavailable ≠ passed |
| `README.md` Agent section | Cursor materializes `maister-<role_id>` markdown; dispatch via bridge |
| Research `2026-07-17-unify-agent-projections` finding 03 | Plugin shape matches docs; Task `subagent_type: maister-*` in skills; **no stable public API** to assert selected custom subagent; collision precedence unavailable |
| Finding 04 | Native discovery/invocation not proved by structural suites |
| `host-capabilities.yml` | Cursor discovery_subject `manifest-native-role-external-ids`; scenarios `cursor-native-inventory-v1` / `cursor-native-invocation-v1` |

## 5.2 Official Cursor docs (fetched 2026-07-21 — product docs, not Maister code)

| Doc | Fact |
|---|---|
| Plugins reference | Plugins may declare `agents`; default discover `agents/*.md`; frontmatter `name` + `description` |
| Subagents | Custom subagents in `.cursor/agents/`, `~/.cursor/agents/` (and compat paths); descriptions show in Task hints; invoke via `/name` or natural language; parallel Task calls |
| Subagents | **Does not** list `~/.cursor/plugins/local/.../agents` as a Task discovery root |
| Plugins | **Does not** explicitly say plugin agents appear in Task `subagent_type` enum |

## 5.3 Tests (facts)

| Test area | What it proves / does not |
|---|---|
| `agent-projection.test.mjs` | Cursor emits 28+support paths and `name: maister-advisor` — **filesystem shape** |
| `evidence-parity-topology.test.mjs` | Cursor E5 with injected inventory match; bare probe unavailable |
| `agent-adapters.test.mjs` | Mock `nativePort` exact launch — **not** IDE Task |
| `installer-transaction.test.mjs` | Cursor install lifecycle; E5/E6 can remain unavailable |
| `.github/workflows/cursor-cli-smoke.yml` (per context) | Bare `probeCursor()`; unavailable → notice |
| **Absent** | Any test that fails when disk agents match but Task enum lacks `maister-*` |

## 5.4 Live receipt evidence (this machine)

```
E1–E4: passed
E5: unavailable  scenario=native-discovery-v1  reason≈runtime-or-scenario-unavailable
E6: unavailable  scenario=native-runtime-v1
```

So packaging is provisional regarding native discovery/runtime; smoke defect is consistent with “never certified.”

---

# 6. Codex comparison (Cursor-focused)

| Dimension | Codex | Cursor |
|---|---|---|
| Role representation | Prompt (+ schema) under plugin skills tree; **no** TOML native roles | Markdown agents under plugin `agents/` |
| Adapter | `codex.exec` managed process | `cursor.native` exact-native port |
| Workflow invocation in skills | Portable text still mentions Task historically; execution intended via exec injection | Skills rewritten / authored for Task `maister-*` |
| Extra managed root | Plugin whole_tree only | Plugin whole_tree only (Kiro alone mirrors into host agents dir) |
| E5 subject | `codex.exec` control surface | Manifest native role ID inventory (when discover injected) |
| Sibling fix relevance | Codex install/`plugin list` verify helps Codex | Does **not** register Cursor Task types |

---

# 7. Hypotheses for root cause (ranked)

Legend: **F** = code/install/docs fact supporting the hypothesis; **H** = hypothesis about Cursor product/session.

### H1 — High likelihood: Plugin agents are installed correctly but **not** appearing on the Task `subagent_type` surface used by the smoke session

- **F:** 29 agents on disk; `plugin.json` declares agents; skills (35) work from same plugin root.
- **F:** Receipt E5/E6 unavailable — install never observed Task inventory.
- **F:** Subagents docs emphasize `.cursor/agents` / `~/.cursor/agents` for Task-oriented custom agents; plugins docs package agents without an explicit Task-bridge sentence.
- **H:** Cursor loader exposes plugin skills/hooks but fails or delays plugin agents into Task enum (partial component load / session cache / Desktop vs CLI).
- **H:** Restart/reload required (staff/forum per sibling docs note) and smoke session was stale for agents only.

### H2 — High likelihood: Skill rewrite + Task instructions create a hard dependency on H1 succeeding

- **F:** `cursor-explore-agent-v1` and overlay skills require `maister-explore`.
- **F:** Built-in Explore would still be allowlisted by hooks, but skills no longer ask for it.
- **H:** Even if `/maister-code-reviewer` slash works, Task enum omission breaks skill-driven orchestration.

### H3 — Medium: Maister never installs into the Subagents-documented discovery roots

- **F:** `targets.mjs` Cursor managed root is only `.cursor/plugins/local/maister`.
- **F:** Kiro pattern proves Maister knows how to dual-install into a host agents leaf_set.
- **H:** Copying/linking projected agents into `~/.cursor/agents/` (receipt-owned leaf_set) would populate Task even if plugin agents do not.
- **Risk:** Collision/precedence with plugin copies undocumented (research finding 03).

### H4 — Medium: Non-standard frontmatter or filename/`name` mismatch breaks agent registration

- **F:** Projector emits `color`, optional `skills:` list; official agent field table lists `name`, `description`, `model`, `readonly`, `is_background`.
- **F:** Filename `code-reviewer.md` vs `name: maister-code-reviewer` (template often aligns).
- **H:** Parser ignores extras OR rejects file; skills still load independently.

### H5 — Medium: Product contract is bridge-first; Task discovery was never a certified support claim

- **F:** Architecture ships `cursor.native` + bridge; default port unavailable.
- **F:** E5/E6 unavailable on successful install.
- **H:** Smoke expectation (“Task must list maister-*”) exceeds what Maister currently certifies; “bug” is missing E5 discover + skill/docs alignment, not missing files.

### H6 — Lower: Support `native_role_external_id: explore` vs `name: maister-explore` causes identity confusion

- **F:** Mismatch exists in overlay vs asset.
- **F:** E5 `expectedNativeInventory` uses only canonical manifest **rows**, not support inventory (`base.mjs` 206–214).
- **H:** Would matter for a future E5 that includes support IDs or for slash-name vs Task-name confusion; weaker explanation for all 28 missing types.

### H7 — Lower: Agents omitted during materialize/install

- **F:** Contradicted by smoke disk count and receipt inventory listing `agents/*.md`.
- Demote unless a different machine’s install differs.

---

# 8. Key files likely needing changes

Depending on chosen fix direction (host Task registration vs bridge-only vs dual-root):

### Projection / overlay / install

| File | Why |
|---|---|
| `plugins/maister/overlays/cursor/overlay.yml` | Destinations, support identity, possible second managed root / leaf_set |
| `plugins/maister/overlays/cursor/inventory.yml` | Keep in sync with overlay |
| `plugins/maister/lib/distribution/targets.mjs` | Add Cursor agents leaf_set if dual-install |
| `plugins/maister/lib/distribution/agent-projector.mjs` | Destination paths, frontmatter fields, filename strategy |
| `plugins/maister/lib/distribution/agent-manifest.mjs` / `agent-projection-v1.json` | Contract for new destinations / support IDs |
| `plugins/maister/lib/distribution/materializer.mjs` | Assembly vs projection ownership for new roots |
| `plugins/maister/overlays/cursor/assets/plugin.json` | Only if manifest discovery path changes |
| `plugins/maister/overlays/cursor/assets/support-agents/explore.md` | Align `name` with support `native_role_external_id` |

### Skills / transforms

| File | Why |
|---|---|
| `plugins/maister/lib/distribution/cursor-skill-projector.mjs` | Explore rewrite policy; maybe stop rewriting until Task discovery proven |
| `plugins/maister/overlays/cursor/assets/skills/**` | Checked-in projected skill text (`maister-explore`, Task instructions) |
| `plugins/maister/overlays/cursor/assets/hooks/block-risky-subagents.sh` | Policy once discovery story is fixed |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | Portable Task guidance vs bridge-first |

### Runtime / evidence

| File | Why |
|---|---|
| `plugins/maister/lib/distribution/host-probes/cursor.mjs` + `base.mjs` | Real discover that observes host Task/plugin agent list (or documents filesystem-only as insufficient) |
| `plugins/maister/lib/distribution/host-probes/scenarios/cursor.mjs` | E6 invocation against exact identity |
| `plugins/maister/lib/distribution/transaction-manager.mjs` | Wire probe into install/verify; refuse provisional-only when Task is required |
| `plugins/maister/lib/distribution/evidence-policy.mjs` | Align placeholder scenario names vs `cursor-native-inventory-v1` |
| `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/{cursor,exact-native}.mjs` | Only if bridge launch must map to Task |
| `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-{owner,runtime}.mjs` | Default bridge / unavailable behavior |
| Host bridge module (new, outside or beside plugin) | Concrete Cursor Task/API inspect+launch |

### Tests / CI / docs

| File | Why |
|---|---|
| `tests/platform-independent/evidence-parity-topology.test.mjs` | Fail when disk≠observed Task inventory |
| `tests/platform-independent/agent-projection.test.mjs` | New destinations / frontmatter |
| `tests/platform-independent/installer-transaction.test.mjs` | Dual-root ownership / verify |
| `tests/platform-independent/overlay-contract.test.mjs` | Inventory/support identity |
| `.github/workflows/cursor-cli-smoke.yml` | Stop treating bare unavailable as soft-only if Task is required |
| `docs/README.md` / `README.md` | Document certified Cursor invocation surface |

---

# 9. Evidence index (paths)

**Worktree (primary):**

- `plugins/maister/overlays/cursor/overlay.yml`
- `plugins/maister/overlays/cursor/assets/plugin.json`
- `plugins/maister/overlays/cursor/assets/support-agents/explore.md`
- `plugins/maister/lib/distribution/{agent-projector,agent-manifest,materializer,cursor-skill-projector,targets}.mjs`
- `plugins/maister/lib/distribution/host-probes/{cursor,base}.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/{cursor,exact-native,index}.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/production-{runtime,owner}.mjs`
- `tests/platform-independent/{agent-projection,agent-adapters,evidence-parity-topology,installer-transaction}.mjs`
- `.maister/tasks/research/2026-07-17-unify-agent-projections/analysis/findings/03-cursor-kiro-runtime.md`

**Installed (read-only evidence):**

- `~/.cursor/plugins/local/maister/{.cursor-plugin/plugin.json,agents/*.md,skills/}`
- `~/.local/state/maister/cursor/receipts/8dbfaa16-f6c7-4285-9630-f19edf14ebe0.json`

**Sibling analysis in this task (do not treat as primary source of truth):**

- `analysis/codebase-analysis-raw-context.md`
- `analysis/codebase-analysis-raw-cursor-docs.md`

**External docs (product; accessed 2026-07-21):**

- https://cursor.com/docs/reference/plugins.md
- https://cursor.com/docs/subagents.md
