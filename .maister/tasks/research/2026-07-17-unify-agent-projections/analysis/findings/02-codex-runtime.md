# Codex runtime: unified injected agent roles

## TL;DR
Codex does not require one native custom-agent registration per Maister role: a generic subagent can receive the selected canonical Markdown role in its task prompt.
Today the Codex overlay copies every role, including `advisor.md`, only as a plugin resource under `skills/orchestrator-framework/agents/`; it does not implement the declared `codex.subagent` runtime adapter.
The target path should therefore be runtime injection with an explicit, validated logical role ID and no `.codex/agents`, read-only, sandbox, or Advisor exception.
Native TOML custom agents remain a supported Codex alternative, but they are neither a plugin component nor necessary for the requested equal-role design.

## Key Decisions
- Use one generic Codex subagent path for every canonical role — it satisfies the equal-treatment constraint and avoids project/user custom-agent registration.
- Resolve `maister:<role-id>` against a closed canonical role manifest, inject the exact Markdown plus task context, and fail closed on missing, ambiguous, or unavailable delegation.
- Treat model selection as inherited unless the active Codex adapter exposes a verified per-spawn model control; reject a requested override rather than silently ignoring it.
- Use a unique dispatch identity derived from logical role plus workflow work-item ID; do not use host agent discovery or a similarly named native custom agent as fallback.

## Open Questions / Risks
- Public Codex documentation explains prompt-driven subagents but does not publish a stable programmatic `spawn_agent` schema; current callable-tool behavior is environment evidence, not a portable public API contract.
- Official documentation states that a custom agent overrides a same-named built-in, but does not state project-versus-user duplicate-name precedence; the injected design must avoid depending on that behavior.
- No current repository test or native probe proves that a materialized canonical role is selected and executed by Codex; current E5/E6 claims must remain unavailable until an isolated invocation probe exists.
- Generic dynamic spawning in the observed runtime has no verified per-call model field, so non-null per-role model configuration cannot yet be promised deterministically.

## Scope and evidence convention

This finding covers the Codex path only. `plugins/maister/agents/advisor.md` is intentionally evaluated as an ordinary canonical role. No recommendation below gives it a native profile, permission, sandbox, read-only, or discovery exception.

Confidence follows the research plan: **high** means direct evidence confirmed by at least two source types; **medium** means one direct source or consistent inference; **low/unavailable** means the contract is undocumented, unprobed, or contradicted.

Official Codex citations are from living OpenAI documentation accessed **2026-07-17**. The locally observed host was **codex-cli 0.144.5** (`codex --version`); the public pages do not pin their content to that CLI version.

## Current Codex path

### 1. Installation and materialization

The Codex target installs to the personal plugin root `.codex/plugins/local/maister`, as declared both by the target registry and the overlay (`plugins/maister/lib/distribution/targets.mjs:1-8`; `plugins/maister/overlays/codex/overlay.yml:4-8`). `getTargetPaths` resolves that root beneath the selected home directory and keeps installer state separately under the XDG state root (`plugins/maister/lib/distribution/target-paths.mjs:19-40`).

The overlay maps `common/agents` to `skills/orchestrator-framework/agents`, not to `.codex/agents` or a plugin-root `agents/` component (`plugins/maister/overlays/codex/overlay.yml:9-30`). `common/agents` resolves to `plugins/maister/agents` through the materializer's common-source candidate rules (`plugins/maister/lib/distribution/materializer.mjs:147-176`), and the assembly plan copies the tree without a role-specific transformation (`plugins/maister/lib/distribution/materializer.mjs:220-250`).

An isolated materialization on 2026-07-17 produced, among the ordinary role resources:

```text
skills/orchestrator-framework/agents/advisor.md
skills/orchestrator-framework/agents/information-gatherer.md
skills/orchestrator-framework/agents/research-planner.md
skills/orchestrator-framework/agents/research-synthesizer.md
...
```

This confirms **materialization**, not native agent discovery or invocation. Confidence: **high** (overlay/materializer source plus isolated staged-tree observation).

### 2. Plugin resource versus native agent discovery

The overlay explicitly forbids plugin-root `agents/*.md` and `agents/*.json`, while requiring the plugin manifest, skills, skill metadata, hooks, and a runtime module (`plugins/maister/overlays/codex/overlay.yml:68-98`). The structural test asserts the same Codex inventory and only checks that the six semantic bindings are declared (`tests/platform-independent/overlay-contract.test.mjs:17-40`, `tests/platform-independent/overlay-contract.test.mjs:79-91`).

Officially, a Codex plugin can contain a `.codex-plugin/plugin.json`, `skills/`, `hooks/`, `.app.json`, `.mcp.json`, and presentation assets. The documented plugin structure has no native `agents` component. See OpenAI, **Build plugins → Plugin structure**, accessed 2026-07-17: https://learn.chatgpt.com/docs/build-plugins#plugin-structure.

Native custom agents are a separate configuration surface: standalone TOML files under `~/.codex/agents/` for personal agents or `.codex/agents/` for project-scoped agents. Each requires `name`, `description`, and `developer_instructions`. See OpenAI, **Subagents → Custom agents / Custom agent file schema**, accessed 2026-07-17: https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents.

Therefore the installed Markdown files are **plugin resources**, not native registered agent types. Confidence: **high** (repository layout and official discovery contract agree).

### 3. Declared delegation is not an executable adapter

The overlay declares `delegate_agent.adapter: codex.subagent`, `capability: delegation`, and `fail_closed: true` (`plugins/maister/overlays/codex/overlay.yml:43-51`). That string is only overlay metadata. The overlay validator proves field presence and fail-closed shape, not executable host dispatch (`tests/platform-independent/overlay-contract.test.mjs:144-162`).

The portable primitive points `delegate_agent` to `applySelectionAndCreateDispatch` (`plugins/maister/common/primitives.yml:9-14`). That operation creates a durable dispatch-outbox entry containing phase and target IDs (`plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs:83-126`), then offers claim/acknowledgement state transitions (`plugins/maister/skills/orchestrator-framework/bin/workflow-continuation.mjs:129-202`). It does not load a role Markdown file, compose a prompt, call a Codex subagent primitive, select a model, or collect an agent result.

The workflow instructions still name a foreign `Task tool` and `subagent_type`, for example research planner/synthesizer dispatch (`plugins/maister/skills/research/SKILL.md:215-255`) and the shared delegation rules (`plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:7-20`). Other skills request exact named types such as `maister:test-suite-runner` (`plugins/maister/skills/implementation-verifier/SKILL.md:102-146`). These names do not resolve through any checked-in Codex adapter.

Current state: static role resources **pass materialization**, but role-specific Codex invocation is **unavailable**. Confidence: **high** (declaration, executable module, and call sites triangulated).

## Official Codex runtime contract

### Generic subagents can receive dynamic role instructions

Official documentation says Codex starts subagents after a direct request or an applicable project/skill instruction, and recommends putting division of work, waiting behavior, and expected output in the subagent prompt. It also describes specialized subagents for exploration, tests, or log analysis. See OpenAI, **Subagents → Triggering subagent workflows / Orchestration and thread controls**, accessed 2026-07-17: https://learn.chatgpt.com/docs/agent-configuration/subagents#triggering-subagent-workflows.

The current session's native collaboration surface accepts a dynamic `message`, a `task_name`, and context-forking selection. It does not require a registered custom-agent name. This directly demonstrates that the selected canonical Markdown can be embedded in a generic subagent's task message in this environment.

Conclusion: **native TOML registration is not required** to give a spawned subagent role-specific instructions. Runtime injection is supported as a prompt-level behavior contract. Confidence: **high for the observed Codex environment** (official prompt-driven contract plus callable runtime observation), **medium as a stable programmatic product API** because the public page does not specify the tool schema.

Important limitation: injected Markdown is task prompt content, not a separately registered `developer_instructions` configuration layer. If Maister later requires role instructions to occupy that native configuration layer, TOML custom agents would be required; that is not required by the present equal-role design.

### Model choice

Official documentation says that, absent an explicit model or reasoning setting, Codex may choose a setup; it recommends steering the choice in the prompt or setting `model` and `model_reasoning_effort` in a custom-agent file. See OpenAI, **Subagents → Choosing models and reasoning**, accessed 2026-07-17: https://learn.chatgpt.com/docs/agent-configuration/subagents#choosing-models-and-reasoning.

The observed generic spawn surface has no per-call `model` field. A model name placed in the task prompt is steering, not a deterministic runtime selection. Required contract:

- null/absent role model: inherit the parent/runtime choice and record that fact;
- non-null required model: use it only when a verified host adapter exposes a real per-spawn model control;
- otherwise: return `unsupported_model_override` and fail closed.

Confidence: **high** for the limitation in the observed environment; **unavailable** for any undocumented future per-spawn model API.

### Naming, precedence, and collision behavior

For registered custom agents, Codex identifies the type by the TOML `name` field; filenames are convention only. A custom agent that matches a built-in such as `explorer` takes precedence. See OpenAI, **Subagents → Custom agent file schema / Global settings**, accessed 2026-07-17: https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agent-file-schema.

The official page does not document:

- precedence between two custom TOML agents with the same `name` across project and user roots;
- duplicate-name diagnostics;
- a public command that lists all resolved custom-agent types and their source file;
- missing named-agent fallback behavior for a programmatic delegation call.

Those items are **unavailable**, not assumed. The injected design avoids them entirely: host custom-agent discovery is not part of role selection.

## Recommended end-to-end Codex sequence

```text
canonical role request: maister:<role-id>
  -> validate against canonical role manifest
  -> resolve exactly plugins/maister/agents/<role-id>.md
  -> parse/validate frontmatter and exact body digest
  -> compose one generic-subagent message
       logical_role_id + canonical role body + task context + output contract
  -> spawn generic native Codex subagent with unique dispatch task name
  -> wait/collect result
  -> persist role ID, source digest, dispatch ID, runtime/model evidence, result
```

For an installed plugin, the runtime resolves the corresponding packaged resource under `skills/orchestrator-framework/agents/<role-id>.md`; build-time validation must prove its digest derives from the canonical file. The canonical repository path remains the only behavior owner.

Recommended message envelope:

```text
MAISTER_LOGICAL_ROLE_ID: maister:<role-id>
MAISTER_ROLE_SOURCE_SHA256: <digest>

Follow the complete role instructions below for this delegated task.
--- BEGIN CANONICAL ROLE ---
<validated Markdown body>
--- END CANONICAL ROLE ---

Task context:
<bounded workflow context, artifact paths, output path, completion contract>
```

The host-facing `task_name` should be presentation/dispatch identity, for example `maister_<role-id>_<work-item-suffix>`. It must not be used to resolve behavior. Multiple simultaneous instances of the same role remain legal because the work-item suffix is unique.

`maister:advisor` follows this exact sequence. It is read from `advisor.md`, injected into the same generic subagent type, inherits the same runtime policy, and has the same missing-role/model/collision errors as every other role.

## Explicit selection and failure semantics

| Condition | Required behavior | Reason |
|---|---|---|
| Unknown logical role | Reject before spawn | Prevents typo-driven default behavior. |
| Missing packaged Markdown | Reject as projection/reference failure | Installed content cannot satisfy the canonical role. |
| Duplicate normalized role ID | Fail build/materialization | Selection would be ambiguous. |
| Source digest differs from generated manifest | Fail validation/update | Prevents silent prompt drift. |
| Generic subagent capability unavailable | Persist `unavailable` and stop delegated phase | Inline execution or a built-in agent would change the execution contract. |
| Spawn rejects task-name collision | Retry only with the predetermined unique dispatch suffix; otherwise fail | Do not select another role or native agent. |
| Requested model override unsupported | Reject explicitly | Prompt steering is not deterministic model selection. |
| Native custom agent with same/similar name exists | Ignore it | Injection does not use native name discovery. |
| `advisor.md` selected | Apply the ordinary row above | No profile, sandbox, or read-only exception. |

No fallback should silently run the root agent, `default`, `worker`, `explorer`, or an installed custom agent. A workflow may offer an explicit user-controlled retry or a separately specified direct-execution mode later, but it cannot report that as successful delegated-role execution.

## Evidence matrix

| Claim/stage | Evidence | Status | Confidence |
|---|---|---|---|
| Canonical Markdown copied into Codex plugin | Overlay mapping, source resolver, isolated materialization | passed | high |
| Markdown is a plugin resource, not native custom-agent registration | Overlay destination/forbidden inventory plus official custom-agent roots | passed | high |
| `codex.subagent` executable implementation exists | Only binding string; runtime module creates outbox state, no host call | unavailable | high |
| Generic subagent accepts dynamic role/task prompt | Official prompt-driven subagents plus current callable `message` surface | supported in observed runtime | high locally / medium portable |
| Exact canonical role selected at runtime | No adapter/probe | unavailable | high |
| Per-spawn deterministic model override | No observed field; docs offer prompt steering or custom TOML | unavailable | high locally |
| Project/user duplicate custom-agent precedence | Not documented or probed | unavailable | low |
| Plugin-native `agents` component | Official plugin structure omits it | unsupported | high |
| `advisor.md` can use ordinary injected path | Same materialized location and generic prompt contract | supported by design, not yet implemented | medium |
| Native discovery and role-specific invocation evidence (E5/E6) | No isolated Codex probe in current suite | unavailable | high |

## Development requirements for `maister:development`

1. **Add a canonical role manifest/IR.** Enumerate normalized `maister:<role-id>` values, canonical relative source, description, content digest, and optional model requirement. Include `advisor` with no extra fields or branch.
2. **Project the Codex role resources deterministically.** Continue installing them inside the plugin, but generate the packaged path and manifest from `plugins/maister/agents/*.md`; reject missing, extra, duplicate-normalized, or digest-divergent roles.
3. **Implement the real Codex delegation adapter.** It must resolve one logical ID, load exactly one packaged role body, compose the message envelope, invoke one generic native subagent, wait, collect, and return a structured result.
4. **Replace host-foreign workflow syntax.** Remove `Task tool`, `AskUserQuestion`, `Explore`, and `subagent_type: maister:*` assumptions from portable instructions or transform them through a verified Codex projection. Every call site supplies `logical_role_id`, task context, and result/output contract instead.
5. **Separate dispatch persistence from execution.** Extend the outbox record or an adjacent execution record with logical role ID, role digest, runtime dispatch ID, model/inheritance status, attempts, and terminal result. `applySelectionAndCreateDispatch` alone must not count as delegation.
6. **Fail closed.** Unknown/missing/ambiguous roles, unavailable collaboration tools, unsupported required model overrides, and spawn failures must never fall back to another role or inline execution.
7. **Namespace display identities without native registration.** Use `maister_<role-id>_<stable-work-item-suffix>` for spawned task identity and preserve `maister:<role-id>` as the semantic identifier.
8. **Delete the Advisor exception from the target design.** Do not generate, reconcile, migrate to, or require `.codex/agents/advisor.toml`/`maister-advisor.toml`; do not set `sandbox_mode` or read-only behavior. Existing project TOML remnants belong to migration handling, not the runtime contract.
9. **Add layered tests.** Unit-test role normalization, closed lookup, message composition, content digests, duplicate rejection, model-override rejection, and ordinary Advisor parity. Integration-test materialization reference closure and transactional ownership. A native test must distinguish at least two injected roles by role-specific output and record the selected role/digest.
10. **Keep E5/E6 honest.** Structural and materialization tests may establish packaging only. Native discovery is not applicable to injected roles; native runtime evidence must prove generic subagent availability and exact role-prompt injection. Missing executable/session prerequisites produce `unavailable`, not passed.

## Required native probe to close gaps

On a supported, isolated Codex installation:

1. record `codex --version` and active multi-agent capability;
2. materialize/install a plugin containing two intentionally distinguishable canonical test roles through the production transaction path;
3. invoke the adapter twice with explicit logical IDs and identical task context;
4. assert each result contains only its role-specific sentinel/contract, while the execution record contains the expected source digest and dispatch ID;
5. request an unknown role and a non-null unsupported model override and assert no subagent is spawned;
6. repeat with `advisor` as an ordinary third role and assert the same envelope, inherited permissions/model behavior, and error semantics;
7. mark the probe `unavailable` when the CLI/session cannot expose native delegation—never replace it with a structural assertion.

Until this probe passes, Codex role-specific runtime support is development-ready as a design but not verified as an end-to-end native capability.
