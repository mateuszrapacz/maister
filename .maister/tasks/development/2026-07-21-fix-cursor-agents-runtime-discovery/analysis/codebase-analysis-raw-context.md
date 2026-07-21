# Codebase analysis: Cursor agents runtime discovery

Worktree: `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`  
Branch: `fix/cursor-agents-runtime-discovery`  
Gathered: 2026-07-21

---

## TL;DR

Smoke after Cursor install shows **29 agent files on disk** under `~/.cursor/plugins/local/maister/agents` and `plugin.json` declares `"agents": "./agents/"`, yet the Cursor session Task/`subagent_type` surface only lists **built-ins**. **Skills (35) work.** Maister’s install/`verify` path proves **filesystem inventory + receipt hashes**, not Cursor **runtime** agent discovery. E5/E6 Cursor probes exist but **default to `unavailable`** unless a host `discover`/`invoke` bridge is injected; CI’s Cursor smoke calls bare `probeCursor()` and treats unavailable as provisional. Prior unify-agent-projections research already separated declaration → materialization → discovery → invocation and flagged native discovery as unproven.

## Key Decisions (current code, not proposals)

1. **Cursor install root** is whole-tree `~/.cursor/plugins/local/maister` (`targets.mjs` / `overlay.yml` `discovery_roots`).
2. **Agents are projected at materialize time** from canonical `plugins/maister/agents/*.md` into staged `agents/{role_id}.md` with frontmatter `name: maister-{role_id}`; **no** checked-in `overlays/cursor/assets/agents/` behavior tree (directory empty / forbidden in release archives).
3. **Skills are checked-in projected assets** under `overlays/cursor/assets/skills/` (35 skill dirs), kept byte-equivalent via `projectCursorSkills` + overlay layout copy `assets/skills` → `skills`.
4. **Support agent** `explore` is the only checked-in agent asset (`assets/support-agents/explore.md` → `agents/explore.md`); counts as the 29th file with 28 canonical roles.
5. **`maister verify --target cursor`** = receipt drift + managed inventory integrity (+ Codex native deploy only for Codex). **No** Cursor host list / Task inventory check.
6. **Runtime dispatch** for Maister workflows is `cursor.native` via an injected **bridge** (`inspect`/`launch`), not “trust Cursor Task enum alone.”
7. **E5 scenario id for Cursor** is `cursor-native-inventory-v1` (host probe); evidence-policy default string remains `native-discovery-v1` when synthesizing unavailable placeholders.

## Open Questions & Risks

1. **Does Cursor Agent Task tool discover plugin `agents/` at all?** Smoke says files + `plugin.json` are present but Task only shows built-ins. Official docs (research 2026-07-17) claim plugin agent discovery; runtime evidence here contradicts that for Task/`subagent_type`. Need a version-pinned Cursor observation of which surfaces load plugin agents (`/maister-*` slash, Task, both, none).
2. **Is Task the intended operator path, or only `cursor.native` bridge?** Spec/docs push exact native bridge + E5/E6; skills still embed `subagent_type: "maister-…"` strings. If Task never sees plugin agents, skill text is misleading even when install is correct.
3. **No default filesystem discoverer for Cursor E5.** Unlike Pi (reads package descriptors), `probeCursor` only compares inventory when `options.discover` is supplied. Bare probe → E5/E6 `unavailable` (`safe-adapter-not-configured` / `scenario-not-configured`). Install success never implies E5 pass.
4. **Inventory glob ≠ count.** Required `agents/*.md` passes if ≥1 matching file; tests do not assert installed agent count == 28+support.
5. **Plugin vs project/user agent precedence** for colliding `maister-*` names remains **unavailable** (research finding 03).
6. Research task `2026-07-21-detect-verify-codex-plugin-installation` is **absent** from this worktree (Codex native `plugin list` verify exists in code/tests; no parallel Cursor host verify).
7. Risk of “fixing” install when the bug is **host loading / session reload / component surface**, not missing files.

---

## Defect statement (from task)

From `orchestrator-state.yml` task description:

- After Maister Cursor plugin install, smoke saw **29 agents** on disk at `~/.cursor/plugins/local/maister/agents` and `plugin.json` `agents: ./agents/`.
- In Cursor runtime Task/`subagent_type`, only built-ins appear (`generalPurpose`, `cursor-guide`, `bugbot`, `security-review`, `best-of-n-runner`).
- Skills (**35**) work.
- Goal: Maister agents (e.g. `maister-code-reviewer`, `maister-explore`) discoverable/invocable via Task — **or** document/implement the correct delegation bridge if Task is not the target mechanism.

---

## Agents install path vs skills install path

| Dimension | Skills | Agents |
|---|---|---|
| Canonical source | `plugins/maister/skills/` (+ Cursor transforms) | `plugins/maister/agents/*.md` (28 roles) |
| Checked-in Cursor overlay assets | `overlays/cursor/assets/skills/` (**35** dirs) | **No** `assets/agents/`; only `assets/support-agents/explore.md` |
| Projector | `cursor-skill-projector.mjs` (`projectCursorSkills`, `--check` parity) | `agent-projector.mjs` (`projectAgents` / `projectCanonicalAgents` during materialize) |
| Overlay layout | `assets/skills` → `skills` (tree) | Support: `assets/support-agents` → `agents`; canonical agents **written by projector into staging**, not layout-copied |
| Destination under install root | `~/.cursor/plugins/local/maister/skills/…` | `~/.cursor/plugins/local/maister/agents/{role_id}.md` (+ `explore.md`) |
| `plugin.json` | `"skills": "./skills/"` | `"agents": "./agents/"` |
| Inventory required | `skills/maister-*/SKILL.md` | `agents/*.md` (glob) |
| Frontmatter / identity | skill dirs `maister-*` | file path `agents/{role_id}.md`, YAML `name: maister-{role_id}` |
| Install verify | Hash/drift of managed leaves | Same — **filesystem only** |
| Observed smoke | Works in Cursor session | Files present; **Task surface missing** |

Expected on-disk agent set after install: **28 canonical + 1 support (`explore`) = 29**, matching the smoke count.

---

## Install / verify / evidence code (relevant)

| Path | Role |
|---|---|
| `plugins/maister/overlays/cursor/overlay.yml` | Layout, inventory, `agent_projection`, E5/E6 capability requirements |
| `plugins/maister/overlays/cursor/inventory.yml` | Same inventory + projection mirror |
| `plugins/maister/overlays/cursor/assets/plugin.json` | Declares skills/agents/hooks dirs |
| `plugins/maister/lib/distribution/targets.mjs` | Cursor `discoveryRoot: .cursor/plugins/local/maister`, `whole_tree` |
| `plugins/maister/lib/distribution/materializer.mjs` | Layout assembly + `projectCanonicalAgents` into staging; `validateInventory` for required globs |
| `plugins/maister/lib/distribution/agent-projector.mjs` | Emits Cursor markdown agents |
| `plugins/maister/lib/distribution/cursor-skill-projector.mjs` | Cursor skill projection / check |
| `plugins/maister/lib/distribution/transaction-manager.mjs` | install/update/verify; `verify` = drift + `verifyReceipt` (hashes); Codex-only native deploy verify |
| `plugins/maister/bin/maister-install.mjs` | Public CLI (`install`/`verify`/…) |
| `plugins/maister/lib/distribution/host-probes/cursor.mjs` | `probeCursor` → E5 `cursor-native-inventory-v1`, E6 `cursor-native-invocation-v1` |
| `plugins/maister/lib/distribution/host-probes/base.mjs` | Default E5/E6 unavailable without `discover`/`invoke`; `compareNativeInventory` exact sorted ID match |
| `plugins/maister/lib/distribution/evidence-policy.mjs` | Default scenarios include `E5: native-discovery-v1` |
| `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/cursor.mjs` | `createCursorAdapter` → exact-native inspect/launch |
| `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/exact-native.mjs` | Fail-closed if no exact launch / unobservable identity |
| `.github/workflows/cursor-cli-smoke.yml` | Provisional: `probeCursor()` with no discover; notice if unavailable |

**Critical gap:** nothing in install/`verify` asks Cursor “what agents did you load?” Files + hashes can all pass while Task stays on built-ins.

---

## Concrete tests and what they assert

### E5 / E6 / `native-discovery-v1` / Cursor inventory

| File | Assertions (Cursor / discovery relevant) |
|---|---|
| `tests/platform-independent/evidence-parity-topology.test.mjs` | Validates E1–E6 schema; collects unavailable E5/E6 explicitly; **Cursor E5 passes** only when injected `discover` returns exact `native_role_external_ids` matching manifest; **fails** on collision/mismatch; **E6 unavailable** without `invoke`; E6 fails on wrong/missing observed identity, timeout, digest/behavior mismatch; provenance rules for native evidence |
| `tests/platform-independent/installer-transaction.test.mjs` | Candidate receipts bind complete E1–E6; E5/E6 default **unavailable** offline; supplied native evidence accepted only with matching provenance hashes; provisional packaging vs fail-closed policy |
| `tests/platform-independent/pi-evidence.test.mjs` | Pi claim evaluation; E5 scenario `pi-native-discovery-v1`; blocks native/semantic claims when E5/E6 unavailable |
| `tests/platform-independent/pi-integration.test.mjs` | G7: E5 remains unavailable without Pi host inference; levels E5/E6 loop |
| `tests/platform-independent/current-target-admission.test.mjs` | Pi admission from bound E1–E6; provisional when E5/E6 unavailable; promote only when both passed; reject native claims without E5/E6 |
| `tests/platform-independent/release-package.test.mjs` | Fixtures set E5/E6 unavailable; provenance encodes that; Cursor archive install + verify lifecycle; gate unavailable without bridge; bridge mock enables invoke; archives **must not** contain `overlays/cursor/assets/agents/` |

### Agent projection / inventory / overlay (install shape, not Task)

| File | Assertions |
|---|---|
| `tests/platform-independent/agent-projection.test.mjs` | Cursor projection: **28** canonical outputs + **1** support; paths `agents/{role_id}.md`; frontmatter `name: maister-advisor`; no `readonly:`; includes `e2e-test-verifier`; deterministic digests; collision/drift/isolation; `project-agents.mjs --check` |
| `tests/platform-independent/overlay-contract.test.mjs` | Cursor required inventory includes `agents/*.md` and `skills/maister-*/SKILL.md`; Cursor skill projection equivalence + drift detection; **empty** checked-in `assets/agents`; support `explore` only; 28-role IR; support inventory separated |
| `tests/platform-independent/source-materializer.test.mjs` | Materialize inventory/reference/hash/mode rules (generic; uses support-agents fixtures) |
| `tests/platform-independent/target-registry.test.mjs` | Target discovery roots / ownership (incl. Kiro leaf_set agents) |

### Runtime adapters / resolver (bridge contract, mocked host)

| File | Assertions |
|---|---|
| `tests/platform-independent/agent-adapters.test.mjs` | **Cursor** `createCursorAdapter`: exact launch; unavailable without exact_launch / observable_identity; wrong observed identity fails; no fallback; cancel-v1 after durable write failure |
| `tests/platform-independent/agent-resolver.test.mjs` | Exact `maister:<role>` → `cursor.native` + `maister-{role}`; fail-closed for missing/stale/collision/unavailable host; advisor same path; wrong observed identity terminal |
| `tests/platform-independent/agent-runtime-composition.test.mjs` | Packaged runtime composes resolver + exact native adapter + events (cursor fixture with **mock** nativePort) |
| `tests/platform-independent/agent-gate-cli.test.mjs` / `agent-execution-events.test.mjs` | Gate/CLI and durable events (shared runtime; not Cursor Task discovery) |

### Install / verify CLI (filesystem, not host discovery)

| File | Assertions |
|---|---|
| `tests/platform-independent/installer-transaction.test.mjs` | Clean lifecycle install/status/verify/uninstall for **every target including cursor**; drift detection; receipts; **no** assertion that Cursor lists agents |
| `tests/platform-independent/launcher-delegation.test.mjs` | Launcher forwards `verify --target …` to `maister-install.mjs` |
| `tests/platform-independent/launcher-cli.test.mjs` | Allowed commands include `verify` |
| `tests/platform-independent/codex-deployment.test.mjs` | Codex-only native `plugin list` verify (contrast: **no Cursor equivalent**) |
| `tests/release/public-git-package-smoke.mjs` + `release-github-only-policy.test.mjs` | Public npm/git smoke for all targets; not Cursor Task discovery |
| `.github/workflows/cursor-cli-smoke.yml` | Overlay validate + bare `probeCursor()`; unavailable → notice, not fail |

### Failing / skipped tests about agent runtime discovery

- **No failing tests** in-repo that encode the smoke defect (Task missing Maister agents). Suites mock `discover`/`invoke`/`nativePort` and therefore **cannot** catch host Task inventory gaps.
- **Skipped:** only unrelated `t.skip("symlink creation is unavailable")` in `launcher-package-identity.test.mjs`.
- **By design unavailable:** default Cursor/Codex/Kiro probes without adapters; Pi E5/E6 until host evidence; release/admission fixtures mark E5/E6 `unavailable`.

---

## Prior research informing this task

### `research/2026-07-17-unify-agent-projections/` (present)

- **Decision summary:** 28 canonical MD → IR/manifest → host projections; Cursor = plugin markdown agents; exact fail-closed resolver; separate materialization vs native discovery vs invocation; missing prerequisite → `unavailable`.
- **Finding 03 (`analysis/findings/03-cursor-kiro-runtime.md`):** Cursor plugin shape matches docs (`agents/` + `plugin.json`); materialization ≠ proven discovery/invocation; Task uses `subagent_type: maister-*` in skills; **no stable public API** to assert custom subagent selected; collision precedence unavailable. *(Note: finding predates projection implementation; checked-in `assets/agents` is now gone — projection path is current.)*
- **Finding 04 (`analysis/findings/04-installer-tests-docs.md`):** Projected agents owned via ordinary receipt inventory; **native discovery/invocation not proved** by platform-independent suites until versioned probes exist.

### `development/2026-07-17-unify-agent-projections/` (summaries only)

- Workflow completed; unified projections implemented (28 roles, adapters, evidence, packaging).
- Verification Passed/GO for that scope; browser E2E N/A.
- Does **not** claim Cursor Task UI discovery of plugin agents as a shipped, observed host fact.

### `research/2026-07-21-detect-verify-codex-plugin-installation/`

- **Not present** in this worktree.

### Smoke notes

- Task smoke description is the primary defect evidence (orchestrator-state).
- Repo smoke/CI: public-git package smoke (lifecycle), Cursor CLI evidence workflow (provisional probe), release extracted install/verify — **none** assert Cursor Task/`subagent_type` inventory includes `maister-*`.

---

## Synthesis for implementers

1. **Likely not a missing-file install bug** if smoke already counts 29 agents + `plugin.json` agents key; verify would pass.
2. **Two product interpretations:**
   - **A.** Cursor should expose plugin agents to Task — then need host/docs investigation + possibly reload/registration, and a real E5 discover that observes Task inventory (not just disk).
   - **B.** Maister’s supported path is `cursor.native` bridge — then fix/docs/skills must stop implying Task `subagent_type` discovery, and E5/E6 must bind to bridge inspect/launch evidence.
3. **Tests to add (gap):** end-to-end or host-probe that fails when disk inventory matches manifest but observed Task/plugin agent list does not; exact count 28+support in install verify optional but weaker than host observation.
4. **Skills vs agents asymmetry** is architectural (checked-in skill assets vs generate-on-materialize agents) and is **not** by itself the runtime bug; skills working only shows Cursor loads `skills/` from the same plugin root.

---

## Evidence index (quick paths)

- Overlay: `plugins/maister/overlays/cursor/overlay.yml`
- Plugin manifest: `plugins/maister/overlays/cursor/assets/plugin.json`
- Probe: `plugins/maister/lib/distribution/host-probes/cursor.mjs`, `base.mjs`
- Verify: `plugins/maister/lib/distribution/transaction-manager.mjs` (`executeLifecycle` status/verify branch)
- Adapter: `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/{cursor,exact-native}.mjs`
- Primary tests: `tests/platform-independent/evidence-parity-topology.test.mjs`, `agent-projection.test.mjs`, `agent-adapters.test.mjs`, `installer-transaction.test.mjs`, `overlay-contract.test.mjs`
- Research: `.maister/tasks/research/2026-07-17-unify-agent-projections/analysis/findings/03-cursor-kiro-runtime.md`
)
