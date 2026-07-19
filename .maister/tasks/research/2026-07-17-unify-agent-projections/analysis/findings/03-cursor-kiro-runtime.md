# Cursor and Kiro CLI agent projection and runtime findings

## TL;DR

- Cursor has a documented native plugin-agent contract: Markdown agents in a plugin's `agents/` directory are discovered, and an exact agent can be requested as `/maister-<role>`. Maister installs to that shape, but its 28 checked-in Cursor agents are a second behavior tree with no agent projector or parity test. The tree replaces canonical `e2e-test-verifier` with non-canonical `explore`, and `advisor` alone receives host permission metadata. Current runtime invocation is prompt text that names `subagent_type: maister-<role>`; there is no executable `cursor.subagent` adapter or native invocation evidence in the repository.
- Kiro CLI is currently non-functional as an agent projection. Maister stages 30 JSON descriptors under `~/.kiro-maister/agents`, while Kiro 2.12.1 discovers only `.kiro/agents` and `~/.kiro/agents`. Every descriptor points to `file://./instructions/...`; Kiro resolves that relative to the descriptor directory, and all 30 referenced files are absent. Native validation reports `File URI not found`, while Maister's materializer explicitly exempts these references from closure validation.
- Kiro's 30 descriptors comprise all 28 canonical roles plus two synthetic entries, `maister` and `maister-explore`. Cursor has 28 descriptors but only 27 canonical roles plus `maister-explore`. Synthetic runtime helpers must be classified outside canonical parity, not silently substituted for a canonical role.
- Target rule for both hosts: generate `maister-${role_id}` deterministically from each canonical `plugins/maister/agents/${role_id}.md`, install into a host-native discovery location, verify reference closure and unique names, and invoke that exact name. `advisor` follows the same generator, destination, collision, and invocation path as every role; do not emit `readonly`, sandbox, profile, or other host-specific permission branches for it.

## Key Decisions

- Preserve one logical namespace: canonical `role_id` is the frontmatter `name`; every host-facing ID is `maister-${role_id}`.
- Replace Cursor's checked-in `assets/agents` behavior copies with a deterministic projection and parity check.
- Install Kiro descriptors and their prompt files together under a Kiro-native agent root; retain `.kiro-maister` only for non-agent resources if the transaction architecture still needs it.
- Treat native discovery and native invocation as separate acceptance gates. A valid file or overlay declaration is not runtime evidence.
- Fail closed on a missing role, duplicate normalized ID, unresolved prompt, local shadow, unavailable delegation tool, or mismatch between requested and observed agent identity.

## Open Questions & Risks

- Cursor's official docs define project/user precedence but do not document precedence between a plugin agent and a project/user agent with the same identifier. This is **unavailable** native evidence; a collision probe is required.
- Cursor exposes exact user invocation (`/name`) and describes Task-tool delegation, but no stable public programmatic API for asserting the selected custom subagent was found. A versioned native probe is required.
- Kiro documents local-over-global precedence with a warning. A project-owned `.kiro/agents/maister-*.json` can therefore shadow a globally installed Maister agent; installation and preflight must detect this and refuse ambiguous delegation.
- Kiro's natural-language custom-subagent selection (`Use the backend agent ...`) depends on model routing. Maister needs an exact-name adapter/probe rather than treating natural-language intent as deterministic selection.
- Local native observations were performed on Cursor Agent `2026.07.13-7fe37d2` and Kiro CLI `2.12.1`; official pages are current as accessed 2026-07-17, but host contracts remain version-sensitive.

## Scope and evidence model

This finding treats `advisor.md` as an ordinary canonical row. Its prompt may describe behavioral boundaries, but no host projection exception is allowed. Four stages are reported separately:

1. **Declaration** — overlay or workflow text claims an agent path/adapter.
2. **Materialization** — the staged/installed files actually exist and references resolve.
3. **Discovery** — the host lists or otherwise recognizes the agent.
4. **Invocation** — the exact requested role executes and returns a distinguishable result.

Repository evidence is cited as `path:line`. Official host claims cite the official page and section, accessed 2026-07-17.

## Canonical parity audit

The canonical corpus contains 28 Markdown roles. Each file declares its unprefixed logical ID on line 2; `advisor` is structurally ordinary (`plugins/maister/agents/advisor.md:1-6`). The normalized inventory is:

`advisor`, `bottleneck-analyzer`, `code-quality-pragmatist`, `code-reviewer`, `codebase-analysis-reporter`, `docs-operator`, `e2e-test-verifier`, `gap-analyzer`, `html-companion-writer`, `implementation-completeness-checker`, `implementation-planner`, `information-gatherer`, `production-readiness-checker`, `project-analyzer`, `reality-assessor`, `research-planner`, `research-synthesizer`, `solution-brainstormer`, `solution-designer`, `spec-auditor`, `specification-creator`, `task-classifier`, `task-group-implementer`, `test-suite-runner`, `thermo-nuclear-code-quality-review-subagent`, `thermo-nuclear-review-subagent`, `ui-mockup-generator`, `user-docs-generator`.

| Host projection | Files | Canonical roles present | Missing canonical | Extra/synthetic | Prompt closure |
|---|---:|---:|---|---|---|
| Cursor `assets/agents/*.md` | 28 | 27/28 | `e2e-test-verifier` | `explore` | Inline Markdown bodies exist |
| Kiro `assets/agents/*.json` | 30 | 28/28 | none | `maister`, `explore` | 0/30 referenced prompt files exist |

Cursor's extra is explicit in `plugins/maister/overlays/cursor/assets/agents/explore.md:1-6`; the missing canonical role exists at `plugins/maister/agents/e2e-test-verifier.md:1-6`. Kiro separately contains both `maister-e2e-test-verifier.json` and `maister-explore.json`; its synthetic orchestrator is `plugins/maister/overlays/kiro-cli/assets/agents/maister.json:1-21`. **Confidence: high** — direct normalized filesystem enumeration and representative content evidence.

## Cursor current state

### Projection and installation

The Cursor overlay copies `assets/agents` wholesale to plugin-root `agents` (`plugins/maister/overlays/cursor/overlay.yml:9-19`) and requires `agents/*.md` (`plugins/maister/overlays/cursor/overlay.yml:67-73`). The plugin manifest explicitly maps `"agents": "./agents/"` (`plugins/maister/overlays/cursor/assets/plugin.json:1-16`). Target resolution installs the complete plugin at `~/.cursor/plugins/local/maister` (`plugins/maister/lib/distribution/targets.mjs:10-15`; `plugins/maister/lib/distribution/target-paths.mjs:19-33`).

This shape matches Cursor's native plugin contract. Official Cursor documentation says plugins can contain agents, automatic component discovery scans `agents/` for Markdown, and agent files use YAML frontmatter `name` and `description`: [Cursor Plugins reference, “Plugin structure”, “Component discovery”, and “Agents format”](https://cursor.com/docs/reference/plugins.md), accessed 2026-07-17. Local plugins are loaded from `~/.cursor/plugins/local/<plugin>`: [Cursor Plugins, “Test plugins locally”](https://cursor.com/docs/plugins.md), accessed 2026-07-17.

However, the agent tree is not a deterministic projection in current source. The only checked-in Cursor projector is `projectCursorSkills`, and the only projection-equivalence test copies/checks `plugins/maister/skills`, Cursor `assets/skills`, and `skill-projection-v1.json` (`tests/platform-independent/overlay-contract.test.mjs:94-117`). No `projectCursorAgents` implementation or agent-content parity test was found. The overlay therefore installs a hand-maintained second behavior owner. **Confidence: high** for the copy/install flow; **medium-high** for “no generator” because it is based on complete repository symbol/path search plus the projector test boundary.

### Naming and Advisor inconsistency

Cursor assets use `name: maister-${role_id}`. For example, canonical Advisor declares `name: advisor` (`plugins/maister/agents/advisor.md:1-6`), while Cursor's copy declares `name: maister-advisor` and uniquely adds `readonly: true` (`plugins/maister/overlays/cursor/assets/agents/advisor.md:1-7`). This is exactly the type of host-specific Advisor branch excluded by the research constraint. The target projector must prefix the name but must not emit `readonly`, sandbox, profile, or equivalent special handling. **Confidence: high**.

### Discovery, collision, and exact invocation

Cursor documents project agents in `.cursor/agents/`, user agents in `~/.cursor/agents/`, project precedence on name conflicts, and `.cursor` precedence over compatibility roots: [Cursor Subagents, “File locations”](https://cursor.com/docs/subagents.md), accessed 2026-07-17. Plugin-agent discovery is separately documented by the plugin reference above. The docs do not state how plugin agents rank against project/user agents of the same name. That collision behavior is **unavailable**, so the `maister-` namespace reduces but does not eliminate risk.

Cursor documents exact invocation with `/name`, for example `/security-auditor ...`, and natural-language mention; it also says parallel delegation uses multiple Task calls: [Cursor Subagents, “Using subagents”](https://cursor.com/docs/subagents.md), accessed 2026-07-17. Maister's projected skills instead embed exact Task-tool role strings, for example `subagent_type: "maister-code-reviewer"` (`plugins/maister/overlays/cursor/assets/skills/maister-reviews-code/SKILL.md:30-34`) and development requests `maister-e2e-test-verifier` even though that agent is absent (`plugins/maister/overlays/cursor/assets/skills/maister-development/SKILL.md:608`). The overlay's `cursor.subagent` is only a semantic binding declaration (`plugins/maister/overlays/cursor/overlay.yml:42-50`); no executable adapter implementation was found.

Consequently:

- **Declared discovery:** supported.
- **Materialized native shape:** supported for the 28 checked-in files.
- **Canonical parity:** failed.
- **Exact workflow mapping:** failed for `e2e-test-verifier`; textually present for many other roles.
- **Successful native discovery/invocation:** **unavailable**. Cursor Agent `2026.07.13-7fe37d2` is installed, but its CLI exposes no agent-list diagnostic. No authenticated role-distinguishing invocation was run during this read-only gathering pass.

### Cursor development requirements

1. Add an agent projector that parses every canonical Markdown, validates `role_id`, and emits exactly one `agents/${role_id}.md` whose frontmatter name is `maister-${role_id}` and whose body derives from the canonical file.
2. Remove the checked-in behavior-copy authority. Generated artifacts may remain checked in only if `--check` proves byte-for-byte equivalence, analogous to the current skill projection test.
3. Restore `maister-e2e-test-verifier`; classify `maister-explore` as a host helper outside canonical parity or remove it. Never substitute it for a canonical role.
4. Apply the identical transform to `advisor`; omit the current `readonly: true` field and any sandbox/profile branch.
5. Generate an invocation map `role_id -> maister-${role_id}` and make workflows call the exact type. If the Task tool cannot resolve that type, stop with an unavailable-role error; do not fall back to natural-language selection or a built-in agent.
6. Add structural tests for normalized inventory equality, duplicate names, frontmatter validity, and derived content, plus a native probe that loads the plugin, explicitly invokes two distinguishable roles (including Advisor as an ordinary sample), and records the observed `subagent_type`/result.
7. Add a collision probe for plugin versus `.cursor/agents`/`~/.cursor/agents`; until precedence is proven, fail preflight when an unmanaged `maister-*` identifier collides.

## Kiro CLI current state

### Projection and installation root

The Kiro overlay copies `assets/agents` to `agents` under a declared discovery root `.kiro-maister` (`plugins/maister/overlays/kiro-cli/overlay.yml:4-19`). The target registry and path resolver turn that into `~/.kiro-maister` (`plugins/maister/lib/distribution/targets.mjs:17-22`; `plugins/maister/lib/distribution/target-paths.mjs:19-33`). It also writes managed `chat.defaultAgent = "maister"` into `~/.kiro-maister/settings/settings.json` (`plugins/maister/overlays/kiro-cli/overlay.yml:40-51`; `plugins/maister/lib/distribution/settings-owner.mjs:93-99`).

Kiro's native locations are instead workspace `.kiro/agents/` and global `~/.kiro/agents/`; local wins over global with a warning: [Kiro CLI Agent configuration reference, “File locations” and “Agent precedence”](https://kiro.dev/docs/cli/custom-agents/configuration-reference/), accessed 2026-07-17. Kiro troubleshooting likewise says a missing agent must be placed in one of those two roots: [Kiro CLI Troubleshooting custom agents, “Custom agent not found”](https://kiro.dev/docs/cli/custom-agents/troubleshooting/), accessed 2026-07-17.

Native observation on Kiro CLI 2.12.1 from this repository ran `kiro-cli agent list`. It reported workspace `~/Workspace/maister/.kiro/agents`, global `~/.kiro/agents`, and only the three built-ins; no `.kiro-maister` descriptor was discovered. Thus `.kiro-maister` is a Maister storage root, not a proven Kiro agent discovery root. **Confidence: high** — repository path flow, official contract, and native listing agree.

### Descriptor schema and broken prompt closure

The JSON files use documented fields (`name`, `description`, `tools`, `allowedTools`, `prompt`). Advisor is representative (`plugins/maister/overlays/kiro-cli/assets/agents/maister-advisor.json:1-14`). Kiro documents JSON agent configuration, an inline or `file://` prompt, and explicitly resolves a relative `file://` URI relative to the agent config file: [Kiro CLI Agent configuration reference, “prompt” and “Path Resolution”](https://kiro.dev/docs/cli/custom-agents/configuration-reference/), accessed 2026-07-17.

Every Maister descriptor uses `file://./instructions/maister-*.md`. Therefore a descriptor at `agents/maister-advisor.json` requires `agents/instructions/maister-advisor.md`, not root-level `instructions/maister-advisor.md`. The overlay copies no `instructions` tree (`plugins/maister/overlays/kiro-cli/overlay.yml:9-39`). Native `kiro-cli agent validate --path .../maister-advisor.json` reports:

`File URI not found: file://./instructions/maister-advisor.md (resolved to plugins/maister/overlays/kiro-cli/assets/agents/instructions/maister-advisor.md)`.

A complete audit produced the same missing-file condition for 30/30 descriptors. Worse, the materializer explicitly treats any Kiro `agents/*` reference matching `file://./instructions/*.md` as a historical exception (`plugins/maister/lib/distribution/materializer.mjs:627-637`), bypassing the normal staged-reference closure check (`plugins/maister/lib/distribution/materializer.mjs:640-665`). Generic tests prove missing references are normally rejected (`tests/platform-independent/source-materializer.test.mjs:554-573`), but the Kiro exception prevents that guarantee here. **Confidence: high**.

### Naming and workflow mismatch

Kiro descriptors consistently use `maister-${role_id}`. The synthetic `maister` orchestrator allows/trusts `maister-*` subagents (`plugins/maister/overlays/kiro-cli/assets/agents/maister.json:2-21`), which matches Kiro's documented requirement that a custom orchestrator include the `subagent` tool and may constrain `availableAgents`/`trustedAgents`: [Kiro CLI Subagents, “Choosing an agent” and “Configuring subagent access”](https://kiro.dev/docs/cli/chat/subagents/), accessed 2026-07-17.

But Kiro installs the unprojected common skills (`plugins/maister/overlays/kiro-cli/overlay.yml:9-14`). Those skills request colon-form logical names such as `maister:research-planner` (`plugins/maister/skills/research/SKILL.md:222`) and `maister:gap-analyzer` (`plugins/maister/skills/development/SKILL.md:258`), while the installed descriptors are hyphen-form (`maister-research-planner`, `maister-gap-analyzer`). The overlay declares `kiro-cli.subagent` (`plugins/maister/overlays/kiro-cli/overlay.yml:52-60`), but no executable adapter mapping colon IDs to hyphen IDs was found. **Confidence: high** for the mismatch; **medium-high** for absence of an adapter based on complete repository search.

### Discovery, collision, and exact invocation

Kiro supports exact main-agent selection through `kiro-cli chat --agent agent_name`, in-session `/agent swap code-reviewer`, and `chat.defaultAgent`: [Kiro CLI Slash commands, “/agent”](https://kiro.dev/docs/cli/reference/slash-commands/), and [Kiro CLI Settings, “Chat interface”](https://kiro.dev/docs/cli/reference/settings/), accessed 2026-07-17. For delegated subagents, current official docs say to reference the custom agent by name in the assignment; absent that, the built-in default is used: [Kiro CLI Subagents, “Choosing an agent”](https://kiro.dev/docs/cli/chat/subagents/), accessed 2026-07-17.

That delegated selection is semantically weaker than a structured exact-name call: it leaves model routing between the text and the spawned descriptor. Current Maister cannot test it because the descriptors are undiscovered and invalid. Local-over-global precedence is documented, but duplicate behavior inside one root and a machine-readable assertion of the actually spawned agent identity are **unavailable**.

Consequently:

- **Descriptor syntax:** structurally plausible, but native validation reports missing prompt URIs.
- **Materialization/reference closure:** failed 30/30.
- **Native discovery:** failed from the installed root contract; local `agent list` sees no Maister agents.
- **Workflow-to-name mapping:** failed (`maister:<role>` versus `maister-<role>`).
- **Successful named subagent invocation:** unavailable because prerequisites fail.

### Kiro development requirements

1. Split agent projections from the private `.kiro-maister` resource root. Transactionally install managed descriptors under `~/.kiro/agents/` (or explicitly project per workspace to `.kiro/agents/`) so Kiro can discover them.
2. Generate one descriptor and one prompt file per canonical role. A closed layout is `~/.kiro/agents/maister-${role_id}.json` plus `~/.kiro/agents/instructions/maister-${role_id}.md`, with `prompt: file://./instructions/maister-${role_id}.md`.
3. Delete the historical reference exception and require all Kiro prompt URIs to pass the same staged closure validator as other internal references.
4. Generate descriptor `name` and prompt body from canonical metadata/content. Keep role-specific tools as separate projection metadata if required, but do not create a distinct Advisor installation or invocation branch and do not add host permission/sandbox special cases.
5. Project every workflow delegation through the same explicit map `role_id -> maister-${role_id}`. Do not ship colon-form calls to a host whose descriptors use hyphens.
6. Keep the synthetic `maister` orchestrator outside the canonical-role equality check, document why it exists, and ensure it includes the native `subagent` tool plus an exact `availableAgents` allowlist derived from canonical names. Remove or separately classify synthetic `maister-explore`; it must not satisfy any canonical row.
7. Before invocation, run/replicate `kiro-cli agent list` and reject missing or shadowed `maister-*` entries. Because workspace agents override global ones, refuse an unmanaged local collision rather than allowing it to shadow the installed role.
8. Add native acceptance probes on a pinned Kiro version: validate every JSON, assert all prompt resolutions, list every expected name, start the `maister` parent, delegate two distinguishable exact roles, and verify the returned session/summary identifies the requested configuration. Include `advisor` as an ordinary matrix row, not a special test path.

## Comparative end-to-end target sequences

### Cursor

`plugins/maister/agents/<role>.md` -> parse canonical metadata/body -> emit plugin `agents/<role>.md` with `name: maister-<role>` -> install under `~/.cursor/plugins/local/maister` -> Cursor plugin discovery -> workflow Task call for exact `maister-<role>` (or explicit `/maister-<role>` at the user boundary) -> verify role-specific result and observed agent identity.

### Kiro CLI

`plugins/maister/agents/<role>.md` -> parse canonical metadata/body plus declarative tool projection -> emit native `~/.kiro/agents/maister-<role>.json` and `~/.kiro/agents/instructions/maister-<role>.md` -> validate reference closure -> `kiro-cli agent list` discovery -> `maister` parent delegates exact `maister-<role>` allowed by generated `availableAgents` -> verify spawned configuration and summary.

In both sequences, `role = advisor` substitutes into the same template with no branch.

## Development acceptance matrix

| Gate | Cursor | Kiro CLI |
|---|---|---|
| Canonical inventory | 28/28 generated; no substitution | 28/28 generated; synthetic helpers excluded |
| Deterministic naming | `maister-${role_id}` in Markdown frontmatter | `maister-${role_id}` in filename and JSON name |
| Content ownership | Generated from canonical Markdown; parity check | Prompt generated from canonical Markdown; descriptor metadata generated |
| Reference closure | Inline prompt body/frontmatter valid | Every `file://` resolves from descriptor directory |
| Collision behavior | Preflight unmanaged project/user/plugin collision; fail closed | Preflight local-over-global shadow; fail closed |
| Discovery proof | Pinned host loads plugin and exposes expected agents | `kiro-cli agent list` exposes all expected agents |
| Invocation proof | Exact Task type and `/name` probe, role-distinguishing result | Exact named custom subagent from `maister` parent, role-distinguishing result |
| Advisor equality | Same generator, root, name mapping, invocation; no `readonly`/sandbox branch | Same generator, root, name mapping, invocation; no host permission branch |

## Confidence summary

- **High:** current overlay paths, target roots, inventory counts, Cursor canonical drift, Kiro non-native root, 30/30 missing Kiro prompt files, Kiro path-resolution semantics, Kiro local/global precedence, and documented explicit main-agent selection.
- **Medium-high:** absence of executable `cursor.subagent`/`kiro-cli.subagent` adapters or an agent projector, based on repository-wide search and existing test/projector boundaries.
- **Unavailable:** successful Cursor native discovery/invocation for this plugin, Cursor plugin-vs-project collision precedence, successful Kiro named delegation, Kiro same-root duplicate resolution, and a machine-readable host assertion of selected subagent identity. These require the versioned probes listed above; they must not be treated as passed by structural tests.
