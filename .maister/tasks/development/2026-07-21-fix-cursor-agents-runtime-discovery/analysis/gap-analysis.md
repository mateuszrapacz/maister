# Gap Analysis: Fix Cursor agents runtime discovery

## TL;DR

On-disk Cursor plugin install is already correct (29 agents under `~/.cursor/plugins/local/maister/agents/`, `plugin.json` declares `"agents": "./agents/"`), but Task/`subagent_type` still shows only built-ins — success is **host Task discovery of plugin agents**, not re-projection. Maister `verify` and default E5/E6 prove filesystem/receipt integrity only; they never observe Task inventory. Work must fix/enable plugin-path discovery end-to-end (install/reload/frontmatter/loader), add an honest discovery proof in verify/E5, and keep dual-copy to `~/.cursor/agents/` as fallback-only if the plugin path remains insufficient.

## Key Decisions

- **Success criterion = Task enum** — clarifications lock success to listing/invoking `maister-*` via Task/`subagent_type`, not bridge-only.
- **Delivery = Cursor plugin overlay** — primary mechanism remains `~/.cursor/plugins/local/maister`; dual-install to user/project agents dirs is fallback only.
- **Projection is not the defect** — 28 canonical + `explore` materialize correctly; gap is runtime discovery / verify honesty / skill–runtime alignment.
- **Characteristics** — defect + modify existing distribution/runtime code; likely new E5 discover/verify path (and possibly bridge packaging) → `creates_new_entities: true`.
- **Change type = modificative + additive** — change verify/probe behavior and skill/docs guidance; add discovery observation path without replacing the plugin whole_tree model.

## Open Questions / Risks

- Cursor Subagents docs omit plugin roots while Plugins docs package agents; staff imply plugin agents should appear in Task when loaded — product behavior may be session-/version-dependent (reload required; partial component load observed: skills yes, agents no).
- Extra frontmatter (`color`, `skills:`) and filename (`advisor.md`) vs `name: maister-advisor` mismatch are unproven blockers.
- Support inventory declares `native_role_external_id: explore` while file `name` is `maister-explore` — E5 compare uses canonical rows only, so install E5 would not catch support ID skew.
- Gate/runtime `cursor.native` bridge remains unavailable by default; Task success does not automatically make E6 pass.

## Summary

- **Risk Level**: High
- **Estimated Effort**: Medium–High
- **Detected Characteristics**: has_reproducible_defect, modifies_existing_code, creates_new_entities

## Task Characteristics

- Has reproducible defect: yes
- Modifies existing code: yes
- Creates new entities: yes (new host-discovery observation / verify path; optional bridge packaging for E6)
- Involves data operations: no
- UI heavy: no

## Gaps Identified

### Missing Features

- **Host Task inventory observation for Cursor E5**: `host-probes/cursor.mjs` only runs `compareNativeInventory` when `options.discover` is injected; bare `probeCursor()` → E5 `unavailable` / `safe-adapter-not-configured`. No default discoverer reads Cursor’s Task/`subagent_type` catalog (contrast: Pi reads package descriptors).
- **Cursor-native verify that agents loaded**: `transaction-manager` `verify` for Cursor = receipt drift + managed inventory hashes; Codex alone has native deploy verify (`verifyCodexDeployment`). Nothing asserts “Task lists `maister-*`.”
- **Packaged Cursor `nativePort` bridge for E6** (optional relative to Task success, required for `native_runtime` claims): production defaults to `unavailableNativePort()`; bridge loads only via injected `bridge_module` exporting `createMaisterAgentBridgeV1`. Plugin does not ship a Task-backed or host-backed bridge today.
- **Install/verify guidance that forces Cursor reload** after agent materialize: docs/staff note restart often required for Task enum; Maister install success does not encode reload-as-prerequisite for discovery claims.
- **Automated test encoding the smoke defect**: suites mock `discover`/`invoke`/`nativePort`; no test fails when Task misses plugin agents.

### Incomplete Features

- **`native_discovery` / `native_runtime` capabilities on Cursor overlay**: overlay requires E5 (and E6 for runtime) but install synthesizes unavailable placeholders (`runtime-or-scenario-unavailable`). Capability claims are provisional while disk looks healthy.
- **Skill ↔ runtime delegation story**: `cursor-skill-projector` rewrites Explore → `subagent_type: "maister-explore"` / Task-oriented text; overlay binds `delegate_agent` → `cursor.native` exact-native adapter. Skills assume Task enum; gate assumes bridge — only Task half is the clarified success surface, but bridge/E6 remains incomplete for full vertical capability claims.
- **Support explore identity**: overlay `support_inventory.native_role_external_id: explore` vs asset frontmatter `name: maister-explore`. Skills and Task need `maister-explore`; support row ID does not match.
- **Inventory glob strength**: required `agents/*.md` passes with ≥1 file; does not assert count == 28+support or name set parity with manifest.

### Behavioral Changes Needed

- **Verify semantics**: From “receipt/hash OK ⇒ install healthy” to “receipt/hash OK **and** (when configured) host Task inventory matches projected `maister-*` IDs” — or explicit documented manual smoke gate when automated observation is impossible.
- **Install operator UX**: From silent filesystem success to actionable “reload Cursor / confirm Task lists `maister-*`” when discovery cannot be asserted automatically.
- **Fallback policy**: Dual-copy/symlink into `~/.cursor/agents/` (or project `.cursor/agents/`) only after plugin-path best-effort fails — not as primary delivery (clarification Q2).
- **Possible frontmatter/path normalization**: From emitting extra fields / role_id filenames to Cursor-template-aligned shape if loader rejects current form (hypothesis-driven; not confirmed root cause).

## User Journey Impact Assessment

| Dimension | Current | After (desired) | Assessment |
|-----------|---------|-----------------|------------|
| Reachability | Agents on disk under plugin root; Task enum = built-ins only | Task lists/invokes `maister-*` after plugin install (+ reload) | ❌ → ✅ |
| Discoverability | Skills discoverable (slash); agents undiscoverable via Task (~2/10) | Agents appear in Task hints/enum like skills (~8–9/10) | 2/10 → 8/10 (+6) |
| Flow Integration | Orchestrator skills instruct Task `maister-*` → fails at invoke | Same skill text works because host loads plugin agents | ❌ → ✅ |
| Multi-Persona | Affects all Cursor operators using Maister workflows (parent agent + Task) | Same personas; no role split | ⚠️ → ✅ |

**Personas**: Cursor IDE operator running Maister skills; Maister install/verify CLI user; CI smoke (currently provisional on bare probe).

**Orphaned-ops analogy (three-layer, non-CRUD)**: Layer 1 Backend/projection ✅ (files + manifest); Layer 2 “component” ✅ (agent markdown); Layer 3 User access ❌ (Task does not surface IDs). Classic CREATE-without-READ equivalent for agent registration.

## Defect Analysis

### Reproduction Data

- **Inputs**: Maister Cursor overlay install to `~/.cursor/plugins/local/maister`; `plugins.maister.enabled: true`; 29 `agents/*.md` with `name: maister-*`; `.cursor-plugin/plugin.json` `"agents": "./agents/"`; skills present and working.
- **State**: Active receipt E5/E6 `unavailable`; `~/.cursor/agents/` empty; worktree has no `.cursor/agents/`.
- **Steps**:
  1. Install/update Maister for target `cursor`.
  2. Confirm disk inventory (29 agents) and plugin enabled.
  3. In a Cursor Agent session, inspect Task/`subagent_type` available types (or attempt Task with `maister-explore` / `maister-code-reviewer`).
- **Expected**: Task lists/invokes `maister-*` agents (clarified success).
- **Actual**: Task lists only built-ins (`generalPurpose`, `cursor-guide`, `bugbot`, `security-review`, `best-of-n-runner`); skills still work. Session skew possible (some sessions may list `maister-*` after reload).

### Root Cause Hypothesis

Primary: **Cursor host does not (reliably) register plugin-root agents into the Task enum in the observed session**, despite correct packaging — loader/session staleness, partial component load, or undocumented discovery gap between Plugins packaging and Subagents Task locations. Secondary contributors to investigate within plugin path: non-template frontmatter (`color`, `skills`), filename≠`name`, missing post-install reload, and Maister’s inability to fail verify when Task inventory is empty. Not a missing projected file.

### Regression Risk Areas

- `agent-projector.mjs` / `cursor-frontmatter-v1` (frontmatter shape changes break digests and `--check` parity).
- `materializer.mjs` / receipt inventory / hash provenance if install layout or dual-path leaves appear.
- `host-probes/cursor.mjs` + `base.mjs` + evidence-policy / admission tests if E5 becomes fail-closed.
- `transaction-manager.mjs` verify path (false failures if discover is flaky or Cursor CLI-only).
- `cursor-skill-projector.mjs` / installed skill text if delegation wording changes.
- Overlay inventory / support `explore` ID alignment.
- Sibling Codex install/verify must remain untouched (worktree isolation).

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

1. **How to prove Task discovery in verify / E5**
   - **Issue**: Without an observation of Task inventory, install can stay green while success criterion fails. No stable public Cursor API is documented for listing Task `subagent_type`s.
   - **Options**: (A) Inject/implement a host `discover` observation (CLI/session probe, documented Cursor surface, or operator-supplied inventory file) and wire into `probeCursor` + optional verify gate; (B) Keep E5 unavailable by default and gate success via **documented manual smoke** checklist (reload + Task enum screenshot/list) as acceptance; (C) Hybrid — automated discover when available, else explicit provisional + mandatory manual smoke for release claims.
   - **Recommendation**: (C) Hybrid — fail-closed only when a discoverer is configured; otherwise require documented manual smoke for this task’s Done, and stop implying `native_discovery` from disk alone.
   - **Rationale**: Matches current probe design (injection), avoids inventing a fake API, still closes the honesty gap.

2. **Fallback if plugin path still fails after best-effort fixes**
   - **Issue**: Clarifications forbid dual-install as **primary** design, but product may still not expose plugin agents to Task after frontmatter/reload/loader fixes.
   - **Options**: (A) Best-effort plugin-only; if still broken, stop and escalate to Cursor product/docs limitation (no dual-copy); (B) After documented plugin-path exhaustion, enable **optional** fallback copy/symlink into `~/.cursor/agents/` (or project) behind explicit flag/policy, with clear “fallback” labeling; (C) Always dual-write (rejected by clarification as primary — only as last resort).
   - **Recommendation**: (B) — keep plugin primary; pre-define exit criteria for “plugin path exhausted” then optional fallback.
   - **Rationale**: Honors Q2 while preserving an operable path if Cursor’s plugin→Task bridge is broken in target versions.

### Important (Should Decide)

1. **Whether to add Cursor native bridge packaging into the plugin for E6**
   - **Issue**: Task success (Q1) does not equal E6/`cursor.native` exact launch. Overlay still declares `native_runtime` needing E6; gate remains unavailable without `bridge_module`.
   - **Options**: (A) In-scope: package/document a Task-backed or host bridge so E6 can pass alongside Task discovery; (B) Out-of-scope for this task: achieve Task listing/invoke only; leave E6 unavailable and document bridge as follow-up; (C) Soft-wire: document how operators inject `bridge_module` without shipping one.
   - **Default**: (B) Out-of-scope for Done unless Task invoke alone is insufficient for orchestrator gates used in Cursor workflows.
   - **Rationale**: Clarified success is Task; expanding to full E6 bridge is scope growth with high integration risk.

2. **Whether skill text should stay Task-oriented or also document the bridge**
   - **Issue**: Skills already say Task + `maister-*`; runtime gate uses `cursor.native`. Dual stories confuse operators when one path works and the other does not.
   - **Options**: (A) Keep Task-only skill text (aligned with success criterion); (B) Add short note that gate/Advisor uses `cursor.native` bridge when injected; (C) Rewrite skills toward bridge-first (conflicts with Q1).
   - **Default**: (A), plus optional one-line pointer to bridge docs if E6 work is deferred (B-lite).
   - **Rationale**: Avoid rewriting all skill transforms unless bridge becomes the operator path.

3. **Frontmatter / filename normalization strategy**
   - **Issue**: Extras (`color`, `skills`) and `advisor.md` vs `name: maister-advisor` may or may not block registration.
   - **Options**: (A) Experimentally strip extras / align names only if A/B smoke shows they matter; (B) Proactively match Cursor plugin-template shape in projector; (C) Leave projection unchanged; treat as non-cause until proven.
   - **Default**: (A) — change projector only with evidence from controlled reload smoke.
   - **Rationale**: Digest/test churn is high; avoid speculative projection rewrites.

## Recommendations

1. Treat the defect as **runtime discovery under the plugin delivery path**, not missing materialization — preserve whole_tree plugin install as primary.
2. Implement an **honest discovery proof** (hybrid E5 discover injection + mandatory manual Task smoke) so verify cannot claim health when Task lacks `maister-*`.
3. Exhaust plugin-path levers in order: reload guidance → frontmatter/filename experiments → loader/settings checks → only then optional dual-path fallback.
4. Align support `explore` inventory ID with `maister-explore` if E5 ever includes support rows or skills/Task checks.
5. Keep Codex paths and sibling runtime work isolated; do not dual-install as default.
6. Defer shipping a full Cursor E6 bridge unless orchestrator gates in this worktree require it for the Task success story.
7. Add at least one test that fails when discover observation omits expected `maister-*` IDs (when discover is supplied), mirroring Pi/evidence-parity patterns.

## Risk Assessment

- **Complexity Risk**: Medium–High — spans distribution probes, verify semantics, possible projector changes, and Cursor product behavior outside Maister control.
- **Integration Risk**: High — depends on undocumented/underspecified Cursor plugin→Task loading; session skew and restart requirements make automation brittle.
- **Regression Risk**: Medium — projection/digest/`--check` and evidence admission can break if E5 becomes fail-closed or frontmatter changes; Codex must not regress.

---

```yaml
status: "success"
report_path: "analysis/gap-analysis.md"

risk_level: "high"
effort_estimate: "high"

task_characteristics:
  has_reproducible_defect: true
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: false
  ui_heavy: false

change_type: "modificative"
compatibility_requirements: "moderate"

reproduction_data:
  steps:
    - "Install/update Maister Cursor overlay to ~/.cursor/plugins/local/maister"
    - "Confirm 29 agents on disk and plugin.json agents: ./agents/"
    - "In Cursor Agent session, inspect Task/subagent_type available types or invoke maister-*"
  inputs:
    - "plugins.maister.enabled: true"
    - "29 agents/*.md with name: maister-*"
    - "skills working (35)"
  expected: "Task lists and can invoke maister-* agents (e.g. maister-explore, maister-code-reviewer)"
  actual: "Task lists only built-ins; skills work; E5/E6 unavailable on receipt"
regression_risk_areas:
  - "plugins/maister/lib/distribution/agent-projector.mjs"
  - "plugins/maister/lib/distribution/materializer.mjs"
  - "plugins/maister/lib/distribution/host-probes/cursor.mjs"
  - "plugins/maister/lib/distribution/host-probes/base.mjs"
  - "plugins/maister/lib/distribution/transaction-manager.mjs"
  - "plugins/maister/lib/distribution/cursor-skill-projector.mjs"
  - "plugins/maister/overlays/cursor/overlay.yml"
  - "evidence admission / installer-transaction / agent-projection tests"
root_cause_hypothesis: "Cursor host does not reliably register correctly packaged plugin-root agents into the Task subagent_type enum (loader/session/partial-component or docs gap); Maister verify never observes Task inventory so install stays green."

user_journey_impact:
  reachability_change: "+1"
  discoverability_before: 2
  discoverability_after: 8
  flow_integration: "positive"

integration_points:
  - "plugins/maister/lib/distribution/host-probes/cursor.mjs (E5 discover injection)"
  - "plugins/maister/lib/distribution/transaction-manager.mjs (verify honesty)"
  - "plugins/maister/overlays/cursor/overlay.yml + assets/plugin.json"
  - "plugins/maister/lib/distribution/agent-projector.mjs (optional frontmatter/path)"
  - "plugins/maister/lib/distribution/cursor-skill-projector.mjs (skill Task text)"
  - "plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/cursor.mjs + exact-native.mjs (optional E6 bridge)"
patterns_to_follow:
  - "Pi host-probe discover reading host descriptors (host-probes/pi.mjs)"
  - "Codex verifyCodexDeployment native verify contrast"
  - "evidence-parity-topology tests injecting discover for Cursor E5 pass/fail"
  - "Cursor plugin-template agents frontmatter (name + description)"
architectural_impact: "medium"

decisions_needed:
  critical:
    - id: "verify-task-discovery-proof"
      issue: "How to prove Task discovery in verify/E5 when no stable public Task inventory API is documented"
      options:
        - "Inject/implement host discover observation wired into probeCursor + optional verify"
        - "Documented manual smoke (reload + Task enum) as acceptance; keep E5 unavailable by default"
        - "Hybrid: automated discover when available, else provisional + mandatory manual smoke"
      recommendation: "Hybrid"
      rationale: "Closes honesty gap without inventing a Cursor API; matches existing injection-based probe design"
    - id: "plugin-path-fallback"
      issue: "What to do if plugin-path best-effort fixes still leave Task without maister-* agents"
      options:
        - "Plugin-only; escalate as Cursor product limitation (no dual-copy)"
        - "After exhaustion, optional fallback copy/symlink to ~/.cursor/agents or project .cursor/agents behind explicit flag"
        - "Always dual-write (conflicts with clarified primary delivery)"
      recommendation: "Optional fallback after documented plugin-path exhaustion"
      rationale: "Honors plugin-primary delivery while preserving an operable last resort"
  important:
    - id: "e6-bridge-packaging"
      issue: "Whether to add Cursor native bridge packaging into the plugin for E6 alongside Task discovery"
      options:
        - "In-scope: ship/document Task-backed or host bridge for E6"
        - "Out-of-scope: Task list/invoke only; leave E6 unavailable"
        - "Document bridge_module injection without shipping a bridge"
      default: "Out-of-scope for Done unless gates require E6"
      rationale: "Clarified success is Task; full E6 bridge is scope expansion"
    - id: "skill-text-delegation-story"
      issue: "Whether skill text should stay Task-oriented or also document the cursor.native bridge"
      options:
        - "Keep Task-only skill text"
        - "Task-primary plus short bridge note"
        - "Rewrite skills bridge-first"
      default: "Keep Task-only (optional one-line bridge pointer if E6 deferred)"
      rationale: "Aligns with Task success criterion; avoid mass skill rewrite"
    - id: "frontmatter-filename-normalization"
      issue: "Whether to normalize frontmatter extras and filename vs name before evidence they block Task registration"
      options:
        - "Change only if controlled smoke proves they matter"
        - "Proactively match Cursor plugin-template shape"
        - "Leave projection unchanged"
      default: "Change only with smoke evidence"
      rationale: "Avoid speculative digest/test churn"

scope_expansion_recommended: false
critical_issues:
  - "Task/subagent_type missing maister-* despite correct plugin disk install (reproducible smoke)"
  - "verify/E5 does not observe Task inventory — false sense of install health"
  - "Primary delivery must remain Cursor plugin; dual-install is fallback-only"
```
