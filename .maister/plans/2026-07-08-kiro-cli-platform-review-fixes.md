# Kiro CLI Platform Review — Findings & Fix Plan

**Date**: 2026-07-08
**Scope**: `platforms/kiro-cli/` (build transform) and its generated output `plugins/maister-kiro/`
**Origin**: Ad-hoc review requested by user — "how consistent are the Kiro-CLI-specific changes vs. the Claude Code source, do they use the latest/appropriate Kiro CLI tools and features, is anything unnecessary/missing/wrong". This document captures the findings so implementation doesn't need to re-derive them.

**How to use this file**: Each issue below is self-contained (problem, evidence, why it matters, concrete fix, acceptance check). Pick items top-to-bottom by priority, or cherry-pick by ID. Re-run `make build-kiro && make validate-kiro` after every change (build must stay reproducible — `git status --porcelain plugins/maister-kiro` should be clean after a fresh build once the change is applied to `platforms/kiro-cli/` and rebuilt).

**Baseline verified at time of writing**: `make build-kiro && make validate-kiro` pass cleanly with zero drift (fresh build matches committed `plugins/maister-kiro/` exactly). 27 subagents + `maister` + `maister-explore` = 29 agent JSON files, 67 skill directories (42 `maister-*` + 25 unprefixed shortcuts).

---

## Applicable standards (read before touching anything)

- `.maister/docs/standards/global/build-pipeline.md` — sections "Kiro Agent Layout", "Kiro Instruction File Mapping", "Kiro Hooks Contract", "Kiro-Specific API Bans", "Never Edit maister-kiro Output". **Never edit `plugins/maister-kiro/` directly** — edit `platforms/kiro-cli/*` and/or `plugins/maister/*`, then `make build-kiro`.
- `.maister/docs/standards/global/minimal-implementation.md` — YAGNI, no speculative/"just in case" capabilities. Directly relevant to M1 below.
- `docs/kiro-cli-support.md` — user-facing doc; several items below require updating its "Known gaps" table and "Manual equivalent" install instructions.
- `platforms/kiro-cli/README.md`, `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` — normative specs for the build pipeline.

Key files involved in this plan:
- `platforms/kiro-cli/build.sh` — the transform script (source → `plugins/maister-kiro/`), especially `synthesize_orchestrator_agents()` and `apply_kiro_overrides()`
- `platforms/kiro-cli/generate-agent-json.sh` — MD→JSON agent generator
- `platforms/kiro-cli/agent-tools.json` — per-subagent tool declarations
- `platforms/kiro-cli/smoke-install.sh` — contains `fix_agent_prompts()` and `fix_hook_paths()` (the runtime patches referenced in H1)
- `platforms/kiro-cli/hooks/*.sh`
- `Makefile` (target `validate-kiro`, rules 1–28)
- `docs/kiro-cli-support.md`

**External references used to verify current Kiro CLI behavior** (re-check these if Kiro CLI ships a new version before implementing, since this whole review is time-bound to Kiro CLI's state as of 2026-07):
- `https://kiro.dev/docs/cli/reference/built-in-tools` — canonical tool names/aliases
- `https://kiro.dev/docs/cli/custom-agents/configuration-reference` — agent JSON schema (fields: `name`, `description`, `prompt`, `mcpServers`, `tools`, `toolAliases`, `allowedTools`, `toolsSettings`, `resources`, `hooks`, `includeMcpJson`, `model`, `keyboardShortcut`, `welcomeMessage`)
- `https://kiro.dev/docs/cli/hooks` — hook event contract (`agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`, `stop`)
- GitHub issues (open as of check date): `kirodotdev/Kiro#5241` ("File syntax for prompt field broken for sub agents"), `kirodotdev/Kiro#6100` ("Subagents do not read file prompt"), `kirodotdev/Kiro#7776` ("Relative file:// paths use different bases in prompt vs resources")

---

## Priority: HIGH

### H1. Committed agent JSON uses non-existent `promptFile` field and invalid `model: "inherit"` value — build output is not valid Kiro agent config on its own

**Files**: `platforms/kiro-cli/generate-agent-json.sh`, `platforms/kiro-cli/build.sh` (`synthesize_orchestrator_agents()`), `platforms/kiro-cli/smoke-install.sh` (`fix_agent_prompts()`)

**Problem**: Every generated agent JSON in `plugins/maister-kiro/agents/*.json` (29 files) contains:

```json
{
  "model": "inherit",
  "promptFile": "instructions/maister-task-group-implementer.md"
}
```

Per the current official Kiro CLI agent configuration schema (`kiro.dev/docs/cli/custom-agents/configuration-reference`), there is **no `promptFile` field**. The only supported field is `prompt`, which accepts either inline text or a `file://` URI: `"prompt": "file://./instructions/x.md"`. There is also no documented `"inherit"` value for `model` — the field expects a real model ID, or should be omitted entirely to use the default model.

The maintainers already know this — it's documented in `smoke-install.sh`:

```bash
# Kiro CLI runtime fixes applied at install/smoke time (empirical API).
# - promptFile → prompt with file:// URI
# - model "inherit" → removed (not valid in kiro-cli headless)
fix_agent_prompts() {
  ...
  jq '
    if .promptFile then
      .prompt = "file://./" + .promptFile | del(.promptFile)
    else . end
    | if .model == "inherit" then del(.model) else . end
  ' "$f" >"$tmp"
  ...
}
```

But this fix is only applied by `smoke-install.sh`, **not** by `build.sh`/`generate-agent-json.sh`. Consequences:

1. `plugins/maister-kiro/` as committed to the repo is not a self-sufficient, valid Kiro agent bundle — it requires a second, separate processing step (`smoke-install.sh`) to become valid. This is in tension with the project's own stated contract in `build-pipeline.md`: *"`plugins/maister-kiro/` must be reproducible from `make build-kiro` only — same pattern as `maister-cursor` and `maister-copilot`."* Reproducible ≠ correct: the tree is faithfully reproducible, but not valid as-is.
2. `docs/kiro-cli-support.md` documents a "Manual equivalent" install path that bypasses `smoke-install.sh` entirely:
   ```bash
   make build-kiro
   cp -r plugins/maister-kiro ~/.kiro-maister
   ```
   Following these exact documented steps produces a broken install: every agent's `prompt` is unset (because `promptFile` isn't a real field, so it's silently ignored), meaning **no agent gets its instructions**. This is a real, reproducible bug in a documented user-facing path, not just theoretical.
3. `make validate-kiro` (28 rules) does not catch this — it only checks `jq empty` (valid JSON syntax), not schema/field validity. See H3/M4 below.

**What to do**:
1. Move the `promptFile → prompt` (`file://` URI) conversion directly into `generate-agent-json.sh`'s `generate_agent()` function and into `build.sh`'s `synthesize_orchestrator_agents()` — i.e., **generate `"prompt": "file://./instructions/<name>.md"` directly**, never emit `promptFile` in the first place.
2. Stop emitting `"model": "inherit"` at all. If the intent is "use whatever the parent/default model is," simply omit the `model` field (per docs: *"If not specified, the agent will use the default model"*). Only emit `model` when a specific model ID is genuinely required.
3. Delete `fix_agent_prompts()` from `smoke-install.sh` entirely once build output is correct at the source — it becomes dead code once step 1–2 land. Keep `fix_hook_paths()` (that one is legitimately install-location-specific, not a bug fix).
4. Update `docs/kiro-cli-support.md`'s "Manual equivalent" section — it should keep working exactly as documented once this is fixed (no code changes needed there, just re-verify the doc is accurate after the fix).
5. Rebuild and diff every generated `agents/*.json` file to confirm the new shape (`"prompt": "file://./instructions/<name>.md"`, no `promptFile`, no `model` key when it was `"inherit"`).

**Acceptance check**: `grep -rl 'promptFile\|"model": "inherit"' plugins/maister-kiro/agents/*.json` returns nothing after `make build-kiro`. `cp -r plugins/maister-kiro ~/.kiro-maister-test && KIRO_HOME=~/.kiro-maister-test kiro-cli agent validate` (or equivalent) reports no schema errors, with zero post-processing. Confirm at least one subagent (e.g. `maister-gap-analyzer`) actually receives its system prompt when invoked (real `subagent` call, inspect its behavior/response for evidence it read its instructions file).

---

### H2. Relative `file://` prompt paths may silently fail to load for subagents (unverified, known upstream Kiro bug, not tracked in "Known gaps")

**Files**: All `plugins/maister-kiro/agents/*.json` (after H1 is fixed, they'll all use `"prompt": "file://./instructions/<name>.md"`, a relative path); `docs/kiro-cli-support.md` ("Known gaps" table)

**Problem**: Maister-kiro's entire architecture is subagent-heavy — the `maister` orchestrator delegates to ~27 subagents via the `subagent` tool, each with its own JSON config whose `prompt` field (once H1 is fixed) will be a **relative** `file://` path.

Three open GitHub issues in `kirodotdev/Kiro` describe exactly this failure mode:
- `#5241` "File syntax for prompt field broken for sub agents" — relative prompt paths resolve from a different base when an agent is launched *as a subagent* vs. as the main agent, causing the subagent to silently start without its intended instructions.
- `#6100` "Subagents do not read file prompt" — same symptom, referenced as related.
- `#7776` "Relative file:// paths use different bases in prompt vs resources" — confirms `prompt` resolves relative to the agent config file's directory while `resources` behaves workspace-root-relative, and that this mismatch is easy to trigger unintentionally, with **no warning shown** when it happens (silent failure).

This is not a hypothetical: if this bug is present in the Kiro CLI version end users actually run, then most/all of maister-kiro's subagents could be starting with **no system prompt at all**, silently, with no error — meaning they'd just behave like a bare default agent instead of e.g. `maister-gap-analyzer` or `maister-task-group-implementer`. This would be a severe, silent correctness failure for the entire platform, and it is currently **not listed** in `docs/kiro-cli-support.md`'s "Known gaps" table (which currently only lists: `preCompact` hook, TUI task sync, max 4 subagents, Scenario 7 MCP, interactive multi-select).

**What to do**:
1. Empirically verify against a real, currently-installed `kiro-cli` version: after H1's fix, install via `smoke-install.sh`, start `maister-kiro chat --agent maister`, dispatch a subagent (e.g. via `/maister-development` triggering `maister-gap-analyzer`), and confirm — by observing its actual behavior/output, or by adding a temporary debug line to one instructions file (e.g. "If you are reading this, respond with the literal string PROMPT_LOADED_OK") — that the subagent's prompt file is actually loaded.
2. If the bug reproduces: workaround by switching `prompt` to an **absolute** path (`file:///$HOME/.kiro-maister/agents/instructions/<name>.md` for the default profile, rewritten by `fix_hook_paths`-equivalent logic for non-default `KIRO_HOME` — extend the existing rewrite mechanism in `smoke-install.sh` to also rewrite `prompt`, the same way it already rewrites `.resources` entries that start with `~/.kiro-maister/`). Trade-off: absolute paths are less portable if the profile is relocated without going through `smoke-install.sh`'s rewrite step — document this clearly.
3. If the bug does not reproduce (may be version-dependent / already fixed upstream): document the minimum Kiro CLI version verified to work correctly, and note that upgrading Kiro CLI could reintroduce silent breakage without warning if the fix is later reverted or regresses — worth a periodic re-check.
4. Either way, add an explicit entry to `docs/kiro-cli-support.md`'s "Known gaps" table referencing the relevant upstream issue numbers, so this isn't rediscovered from scratch later.
5. Consider a smoke test in `platforms/kiro-cli/tests/` that specifically asserts a subagent's prompt content is actually influencing its behavior (not just that the JSON file exists/parses), to catch a regression here or upstream.

**Acceptance check**: A documented, empirically-verified statement in `docs/kiro-cli-support.md` about whether subagent prompt loading works correctly on the tested Kiro CLI version, with a mitigation (absolute paths) implemented if the bug reproduces, and a linked upstream issue reference either way.

---

### H3. `skill-invocation-reminder.sh` (Kiro variant) likely emits a JSON envelope that Kiro does not parse — inconsistent with the project's own documented Kiro hook contract

**File**: `platforms/kiro-cli/hooks/skill-invocation-reminder.sh`

**Problem**: This hook (wired to both `agentSpawn` and `userPromptSubmit` in `agents/maister.json`) outputs:

```bash
cat <<'EOF'
{
  "additional_context": "MAISTER PLUGIN RULE: ..."
}
EOF
exit 0
```

This is a direct copy of the Claude Code / Cursor hook pattern (`plugins/maister/hooks/skill-invocation-reminder.sh`, `platforms/cursor/hooks/skill-invocation-reminder.sh`), which is correct for those platforms because their hook contracts parse a `hookSpecificOutput`/`additional_context`-shaped JSON envelope from stdout.

Per `kiro.dev/docs/cli/hooks`, the documented contract for `agentSpawn`/`userPromptSubmit` is simply: *"Exit Code Behavior: 0: Hook succeeded, STDOUT is added to agent's context."* There is no mention of a JSON envelope being parsed for these two hook types (contrast with `stop`, which *does* document a specific `{"decision": "block", "reason": ...}` JSON contract — meaning Kiro's hook system does parse specific JSON shapes when it needs to, so the omission for `agentSpawn`/`userPromptSubmit` is meaningful, not an oversight in the docs).

Tellingly, the **sibling script in the same directory**, `platforms/kiro-cli/hooks/rtk-rewrite.sh`, has an explicit comment showing the maintainers already understand this platform difference:

```bash
# Kiro contract (no hookSpecificOutput): block with STDERR + exit 2 so the agent
# re-runs using the suggested command. See kiro.dev/docs/cli/hooks.md.
```

`skill-invocation-reminder.sh` was apparently not updated to match this same understanding. If the docs are accurate, the practical effect is that the agent's context gets literal text like `{\n  "additional_context": "MAISTER PLUGIN RULE: ..."\n}` injected verbatim — which still probably "works" in the sense that an LLM can parse the intent from the raw JSON text, but it's sloppy, wastes tokens on JSON punctuation, and isn't the documented/intended mechanism.

**What to do**:
1. Empirically verify (same kind of manual test as H2 — run a real session, inspect whether the agent's visible context includes raw JSON or clean text) whether Kiro actually strips/parses this envelope somewhere undocumented, or truly just inlines it raw.
2. If raw: rewrite `platforms/kiro-cli/hooks/skill-invocation-reminder.sh` to emit **plain text** (matching the style of the "Agent Examples" in Kiro's own docs, e.g. plain `git status` / `ls -la` output — no JSON wrapper), containing the same "MAISTER PLUGIN RULE" / "ORCHESTRATOR GATE RULE" content currently embedded in the `additional_context` value.
3. Audit every other hook script in `platforms/kiro-cli/hooks/` for the same Claude/Cursor-envelope-leftover pattern (currently: `block-destructive-commands-kiro.sh` correctly uses STDERR + exit 2, no JSON — good; `subagent-spawn-tracker.sh` and `subagent-complete-cleanup.sh` don't emit stdout content — fine; `post-compact-reminder-stub.sh` — check separately, see L4).

**Acceptance check**: `platforms/kiro-cli/hooks/skill-invocation-reminder.sh` no longer contains `additional_context` or a JSON envelope; a real session shows clean text context injection (verified manually, since this can't be asserted by a structural test alone).

---

## Priority: MEDIUM

### M1. `use_aws` tool granted to all 26 subagents by default, including pure read-only/analysis agents with no plausible AWS use case

**File**: `platforms/kiro-cli/agent-tools.json`

**Problem**: The `defaults.tools` array (`["read", "grep", "glob", "use_aws"]`) and every per-agent override in `agents/*` include `use_aws`, even for agents whose entire job is text analysis/classification with no AWS-related purpose: `bottleneck-analyzer`, `gap-analyzer`, `task-classifier`, `project-analyzer`, `code-quality-pragmatist`, `code-reviewer`, `implementation-completeness-checker`, `production-readiness-checker`, `reality-assessor`, and others.

Git history shows this was added deliberately across multiple commits (`9deb86a feat(kiro): add use_aws to all subagents via build sources`, `98d6795`/`b43d290 feat(kiro): add use_aws tool to all subagents, inherit default model`) as a blanket policy, not a per-agent judgment call.

This directly contradicts the project's own `standards/global/minimal-implementation.md` (YAGNI — no speculative/"just in case" capabilities). It also has a real (if small) cost: broader tool grants increase the permission surface Kiro will prompt about (or auto-allow, if `use_aws`/`aws` ends up in `allowedTools`) for agents that will genuinely never call it, and it's one more thing a future maintainer has to reason about when auditing what each agent can do.

**What to do**:
1. Review each of the 26 agents in `platforms/kiro-cli/agent-tools.json` and decide, case by case, whether `use_aws` is plausible for its actual job (e.g. `docs-operator`, `user-docs-generator`, or an agent whose task genuinely could involve inspecting cloud infra as part of the codebase it's analyzing, might have a case — most will not).
2. Remove `use_aws` from `defaults.tools` and from every agent that doesn't have a concrete justification. If there's no agent that plausibly needs it, remove it from `agent-tools.json` entirely (simplify to `["read", "grep", "glob"]` as the default read tool set).
3. Rebuild (`make build-kiro`) and update `make validate-kiro` if any rule references tool counts/lists.

**Acceptance check**: `jq -r '.tools[]' plugins/maister-kiro/agents/*.json | sort -u` no longer includes `use_aws` unless a specific, documented (in a code comment in `agent-tools.json`) justification exists for the agents that still have it.

---

### M2. `use_aws` uses the tool's alias name, not its current canonical name (`aws`) — inconsistent with the rest of the tool list

**File**: `platforms/kiro-cli/agent-tools.json`, `platforms/kiro-cli/build.sh`

**Problem**: Per `kiro.dev/docs/cli/reference/built-in-tools`, canonical tool names are `read`, `glob`, `grep`, `write`, `shell`, **`aws`** (with `use_aws` listed as the *alias*, inherited from the tool's Amazon Q Developer CLI predecessor naming). Every other tool in this codebase already uses the current canonical short name (`read` not `fs_read`, `write` not `fs_write`, `shell` not `execute_bash`) — `use_aws` is the one holdout still using the legacy alias instead of the current canonical `aws`.

This is purely cosmetic (aliases work identically to canonical names per docs), but it's a small "not using the latest/most-current naming" inconsistency worth fixing while touching this file for M1 anyway.

**What to do**: If `use_aws` survives the M1 review for any agent, rename it to `aws` everywhere in `agent-tools.json` (and anywhere else it's referenced, e.g. hardcoded in `build.sh`'s `synthesize_orchestrator_agents()` `--argjson tools` for `maister-explore`).

**Acceptance check**: `grep -rn 'use_aws' platforms/kiro-cli/ plugins/maister-kiro/` returns nothing (assuming M1 removes it entirely) or only appears in a documented, justified context using the canonical `aws` name.

---

### M3. Orchestrator's `resources: ["skill://.kiro/skills/**/SKILL.md"]` may resolve against the wrong base directory, and may be redundant given Kiro's default resource inheritance

**File**: `platforms/kiro-cli/build.sh` (`synthesize_orchestrator_agents()`)

**Problem**: The `maister` agent's hand-written JSON sets:

```json
"resources": ["skill://.kiro/skills/**/SKILL.md"]
```

This is a **relative, project-workspace-style path** (`.kiro/skills/...`). But maister-kiro's skills live in the **global profile** directory (`~/.kiro-maister/skills/...` by default), not in a `.kiro/skills/` folder inside the user's project workspace. Per the `#7776` GitHub issue investigated in H2, `resources` paths appear to resolve **workspace-root-relative** in practice — meaning `skill://.kiro/skills/**/SKILL.md` would look for skills inside the user's *current project* (`<project>/.kiro/skills/`), which will essentially always be empty for a global-profile install like maister-kiro's default. Contrast this with the per-agent `resources` generated in `generate-agent-json.sh`, which correctly use an absolute form: `skill://~/.kiro-maister/skills/maister-${stem}/SKILL.md` (later rewritten by `fix_hook_paths` for non-default `KIRO_HOME`).

Separately, per `configuration-reference`'s "Disabling default resource inheritance" section: *"By default, custom agents inherit default resources (steering files, skills, and AGENTS.md) alongside their own configured resources."* This means Kiro may already auto-include all installed skills for every custom agent without this explicit `resources` entry at all (unless `chat.disableInheritingDefaultResources` is set, which maister-kiro's `settings/cli.json` does not set) — making the explicit entry possibly redundant on top of possibly-wrong.

Note: git history shows a prior commit `b43d290 fix(kiro): remove redundant skill resource path from maister agent` — worth checking what exactly that commit touched, since the field is still present today; it may have removed a *different* duplicate entry, not this one.

**What to do**:
1. `git show b43d290` to understand what was actually removed previously and confirm this current `resources` entry wasn't already flagged as the "redundant" one and left behind by mistake.
2. Empirically test (real session): with the current `resources: ["skill://.kiro/skills/**/SKILL.md"]` entry left in place, confirm whether `/maister-*` slash skills are discoverable/invocable at all. If yes, the entry is likely redundant (default inheritance is doing the real work) — remove it to simplify. If no (skills aren't otherwise loaded), fix the path to correctly point at the profile's actual skills location (absolute, consistent with the per-agent pattern, rewritten by the same install-time path-fixing mechanism as H2's fix for `prompt`).
3. Update `build-pipeline.md`'s "Kiro Agent Layout" standard entry to reflect whatever the correct final behavior is, since it currently states this glob as if it were the intended mechanism.

**Acceptance check**: Documented, empirically-verified statement of whether the orchestrator's explicit `resources` skill glob is necessary, redundant, or was pointing at the wrong location — with the code fixed to match reality.

---

### M4. `make validate-kiro` never checks agent JSON against the actual Kiro schema — only checks that it's syntactically valid JSON

**File**: `Makefile` (`validate-kiro` target, rule 7)

**Problem**: Rule 7 is `jq empty "$$f"` — this only confirms the file parses as JSON, not that its fields/values are meaningful to Kiro CLI. This is exactly why H1 (`promptFile`, `model: "inherit"`) went undetected by the existing 28-rule validation suite: both are syntactically valid JSON, just semantically wrong.

**What to do**:
1. Add validate-kiro rules that assert *known-bad* patterns are absent, mirroring how rules 2/4/5/11/12/20/25 already grep for banned Claude/Cursor-isms: e.g. a rule asserting no `agents/*.json` contains a `promptFile` key, and none has `"model": "inherit"` (`jq -e 'has("promptFile") or .model == "inherit"'` should fail for all files).
2. If/when `kiro-cli` is available in the CI/dev environment, investigate whether a real schema-validation command exists (referenced in GitHub issue repro steps as `kiro-cli agent validate`) and wire it into `smoke-cli.sh` or a new structural test, gated the same way other `kiro-cli`-dependent tests already are (skip if binary absent).

**Acceptance check**: New validate-kiro rules fail against the pre-H1-fix output (sanity check by temporarily reverting H1) and pass after H1 is fixed.

---

### M5. No `stop` hook, despite Kiro supporting one and the Cursor variant already having an equivalent for the same problem

**File**: `platforms/kiro-cli/build.sh` (`synthesize_orchestrator_agents()`), compare `platforms/cursor/hooks/stop-state-reminder.sh`

**Problem**: Kiro CLI supports a `stop` hook type (fires when the assistant finishes responding), including a `{"decision": "block", "reason": "..."}` mechanism that can *prevent* the agent from stopping and feed a corrective message back in — strictly more powerful than what Cursor offers for the equivalent lifecycle point. The Cursor variant already uses its `stop`-equivalent hook (`stop-state-reminder.sh`) to remind the agent to keep `orchestrator-state.yml` in sync with actual progress before ending a turn. Kiro's `agents/maister.json` has no `hooks.stop` entry at all — this is a feature gap relative to Cursor's own implementation of the *same underlying need* (this project's orchestrator-state consistency problem), and Kiro's version of the mechanism is actually better suited to it (can force a re-check loop, not just remind).

**What to do**:
1. Add a `hooks/stop-state-reminder-kiro.sh` (or reuse/adapt naming) that checks (or reminds the agent to check) `orchestrator-state.yml` consistency, mirroring `platforms/cursor/hooks/stop-state-reminder.sh`'s intent but adapted to Kiro's actual `stop` hook contract (plain text or `{"decision":"block","reason":...}` JSON if a hard block is desired for unfinished phases).
2. Wire it into `agents/maister.json`'s `hooks.stop` array in `synthesize_orchestrator_agents()`.
3. Add it to the hooks copied in `build.sh` step 19-21 and to `Makefile`'s rule 22 executable check (already glob-based, should pick it up automatically).
4. Update `docs/kiro-cli-support.md`'s hooks table ("Hooks (Phase 2)") and `build-pipeline.md`'s "Kiro Hooks Contract" entry to include `stop`.

**Acceptance check**: `agents/maister.json` has a non-empty `hooks.stop` array; `make validate-kiro` rule 17 (or a new rule) asserts this.

---

## Priority: LOW

### L1. `code` tool (LSP/symbol search) unused by any analysis subagent

**File**: `platforms/kiro-cli/agent-tools.json`

**Problem**: Kiro's built-in `code` tool provides symbol search / LSP-based code intelligence ("Find the UserRepository class" style lookups), which would plausibly improve agents like `gap-analyzer`, `codebase-analysis-reporter`, `bottleneck-analyzer` beyond plain `grep`/`glob` text search. Not currently included in any agent's `tools` list.

**What to do**: Not urgent. Evaluate adding `code` to the tool list of 2-3 codebase-analysis-oriented subagents as an experiment, see if it measurably improves their output quality vs. `grep`/`glob` alone.

---

### L2. `knowledgeBase` resource type unused for `.maister/docs/`

**File**: `platforms/kiro-cli/build.sh`

**Problem**: Kiro supports a `knowledgeBase` resource type (semantic search over indexed docs, with `autoUpdate`) that could give the `maister` orchestrator (or `maister-explore`) better long-term access to `.maister/docs/standards/` than plain `file://`/`skill://` loading, especially as the standards corpus grows. Currently unused.

**What to do**: Not urgent — evaluate once `.maister/docs/standards/` grows large enough that context-window pressure from loading it all via `file://` becomes a real problem. Low priority, speculative feature until there's a concrete pain point (careful: adding this before it's needed would itself violate the minimal-implementation standard referenced in M1).

---

### L3. `delegate` (background/async agent) and `/goal` (iterative verification loop) tools not leveraged

**File**: N/A (architecture-level observation)

**Problem**: Kiro's `delegate` tool (background agents for long-running tasks) and `/goal` tool (goal-driven iterative loop with built-in verification, default max 5 iterations) both map conceptually onto things maister already does manually with custom orchestration (parallel subagent waves capped at 4; the `implementation-verifier` skill's manual pass/fail loop). These are native Kiro primitives that could potentially simplify or complement the current hand-rolled orchestration logic.

**What to do**: Architecture-level exploration, not a bug fix. Worth a dedicated research/spike task (not squeezed into this fix-list) to evaluate whether `/goal` could replace or wrap parts of the `implementation-verifier`/TDD-loop logic for the Kiro variant specifically. Do not implement speculatively — this needs its own design discussion first.

---

### L4. `hooks/post-compact-reminder-stub.sh` is dead code — never wired, by design, but still shipped as an executable script

**File**: `platforms/kiro-cli/hooks/post-compact-reminder-stub.sh`

**Problem**: Explicitly documented (in `platforms/kiro-cli/README.md` and `docs/kiro-cli-support.md`) as "documented only, not wired" because Kiro has no `preCompact` hook equivalent. Shipping a `.sh` file that will never execute is a minor deviation from `minimal-implementation.md` (unused code), even though it's intentional and explained.

**What to do**: Low priority, cosmetic. Consider replacing the orphaned executable script with just a documentation note (in `steering/maister-workflows.md` or `docs/kiro-cli-support.md`) describing the gap and the intended mitigation (`orchestrator-state.yml` + `/status`/`/resume`), without shipping dead executable code. Only worth doing if touching this area for another reason (e.g. bundled with H3's hook audit) — not worth a standalone change.

---

### L5. Verify `hooks/skill-invocation-reminder.sh` audit extends to checking whether hook output should also include check for `subagent-spawn-tracker.sh` / `subagent-complete-cleanup.sh` correctness under the `stop` hook addition (M5)

**Problem**: Once M5 adds a `stop` hook, make sure `.hook-state/` cleanup (`subagent-complete-cleanup.sh`) still correctly removes session-scoped tracker files (`session-${SESSION_ID}.type`) so a new `stop`-hook check doesn't read stale state from a previous, unrelated subagent invocation earlier in the same session.

**What to do**: Just a review checkpoint to fold into M5's implementation — not a separate change on its own. Read `platforms/kiro-cli/hooks/subagent-complete-cleanup.sh` alongside implementing M5 and confirm no stale-state interaction.

---

## Summary checklist (in suggested order)

- [ ] H1 — Move `promptFile`→`prompt` and `model: "inherit"`-removal fixes from `smoke-install.sh` into `build.sh`/`generate-agent-json.sh`; delete the now-redundant `fix_agent_prompts()`
- [ ] H2 — Empirically verify relative `file://` subagent prompt loading; fix (absolute paths) or document as a tracked known gap with upstream issue links
- [ ] H3 — Audit and fix `hooks/skill-invocation-reminder.sh` to emit plain text instead of a Claude/Cursor-style `additional_context` JSON envelope (verify Kiro's actual behavior first)
- [ ] M1 — Remove blanket `use_aws` grant from subagents that don't need it; keep only where justified
- [ ] M2 — Rename any surviving `use_aws` references to canonical `aws`
- [ ] M3 — Fix or remove the orchestrator's `resources: ["skill://.kiro/skills/**/SKILL.md"]` entry after verifying actual resolution behavior and necessity given default resource inheritance
- [ ] M4 — Add `validate-kiro` rules that catch schema-invalid agent JSON (banned keys/values), not just `jq empty`
- [ ] M5 — Add a `stop` hook mirroring Cursor's `stop-state-reminder.sh` intent, adapted to Kiro's stronger `stop` hook contract
- [ ] L1 — Evaluate adding `code` tool to codebase-analysis subagents
- [ ] L2 — Evaluate `knowledgeBase` resources for `.maister/docs/` (defer until there's a concrete pain point)
- [ ] L3 — Spike/research task: could `/goal` or `delegate` simplify existing custom orchestration logic (separate from this fix-list)
- [ ] L4 — Consider replacing the orphaned `post-compact-reminder-stub.sh` with a documentation-only note
- [ ] L5 — Fold into M5: verify `.hook-state/` cleanup correctness when adding the `stop` hook

## Open questions for the user/maintainer before implementing

1. **H2**: Is a specific `kiro-cli` version available/installed to actually test subagent prompt loading, or does this need to be scheduled as a separate empirical-verification pass before any code changes? Cannot responsibly implement the H2 workaround (absolute paths) without first confirming the bug reproduces — doing so speculatively would itself violate the minimal-implementation standard if the bug turns out not to apply.
2. **M1**: Confirm whether *any* Maister-Kiro workflow is expected to touch AWS infrastructure (e.g. as part of a user's project). If genuinely never, remove `use_aws`/`aws` entirely rather than trying to cherry-pick which agents "might" need it.
3. **M3**: Needs the same empirical access as H2 (a real `kiro-cli` session) to resolve definitively rather than guess.
4. **L3**: Decide if this is worth a dedicated follow-up research task at all, or explicitly deprioritized/rejected for now.
