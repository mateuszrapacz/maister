# Pi Host Contract (installed host baseline)

## TL;DR
The executable actually selected by `PATH` is `@earendil-works/pi-coding-agent` **0.80.10** on Node **25.9.0**, not the 0.79.10 user-tree copy assumed by the research brief.
Pi's portable distribution unit is a package whose manifest or conventional directories expose extensions, skills, prompts, and themes; there is no standalone filesystem `commands/` primitive.
Headless integration is first-class through print, JSON-event, RPC, and SDK surfaces; RPC also exposes a typed resource inventory through `get_commands` and typed negative responses.
An isolated offline probe loaded and executed an extension command and discovered a prompt and skill from one local package, without a persisted session or mutation of active Pi settings.

## Key Decisions
- Bind the initial Maister Pi adapter and its evidence to executable/package version 0.80.10, Node 25.9.0, and `pi-subagents` 0.35.1.
- Project commands as either Pi prompt templates, skill commands, or extension-registered commands; do not invent a Pi `commands/` directory.
- Use RPC or the exported SDK for automation, and treat JSON mode as a one-shot event stream rather than a control plane.
- Keep Maister resources in a Pi package with an explicit `pi` manifest and use package filters/receipts for ownership rather than editing unrelated user resource arrays.

## Open Questions / Risks
- `PI_CODING_AGENT_DIR` isolates Pi's agent/config root but does **not** suppress automatic discovery of `~/.agents/skills`; hermetic tests must also pass `--no-skills` and explicitly add only the skill paths under test.
- The user npm tree contains `@earendil-works/pi-coding-agent` 0.79.10 while the active global executable is 0.80.10. Depending on package-local Pi copies would create split-host behavior; extensions should use host-provided peers/loader aliases.
- RPC `success: true` for `prompt` means accepted/queued/handled, not that later agent work succeeded; terminal outcome must be derived from events and message/tool results.
- Extension resources execute with full user permissions. Installation is therefore a code-execution boundary, not a data-only copy operation.

## Evidence baseline and version resolution

| Evidence | Observation | Classification | Confidence |
|---|---|---|---|
| `which pi` | `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/bin/pi` | observation | high |
| executable symlink | `../lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js` | observation | high |
| `pi --version` | `0.80.10` | observation | high |
| executable package manifest | `@earendil-works/pi-coding-agent` 0.80.10, Node engine `>=22.19.0`, export `.` and `./rpc-entry` | observation | high |
| `node --version` | `v25.9.0` | observation | high |
| official tag | `v0.80.10` resolves to commit `8dc78834cde4e329284cf505f9e3f99763df5529` | upstream contract | high |
| user npm-tree package | `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/package.json` is 0.79.10 | observation | high |
| native-agent extension | `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/package.json` is 0.35.1; its development Pi packages are 0.80.10 and its Pi peers are `*` | observation | high |

The active executable manifest is `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/lib/node_modules/@earendil-works/pi-coding-agent/package.json`; the repository and binary fields identify the official fork and `dist/cli.js`. The version-matched upstream source is [earendil-works/pi at v0.80.10](https://github.com/earendil-works/pi/tree/v0.80.10/packages/coding-agent) (accessed 2026-07-19).

**Inference (high):** the planning assumption that the host is 0.79.10 is stale. The 0.79.10 package is in the user package dependency tree and is not the `PATH` executable. The installed `pi-subagents` development baseline actually matches the active 0.80.10 host, although a separate native-runtime probe is still needed to establish behavioral compatibility.

## Sanitized active package inventory

Only names, versions, settings key names, and public filesystem locations were read. No credential, endpoint, model configuration value, auth file, or session content was inspected.

The active global settings file has these top-level keys: `compaction`, `defaultModel`, `defaultProjectTrust`, `defaultProvider`, `defaultThinkingLevel`, `enableInstallTelemetry`, `enabledModels`, `lastChangelogVersion`, `packages`, and `theme`. Its `packages` declarations, confirmed by `pi list`, are:

| Package | Installed version |
|---|---:|
| `pi-cursor-sdk` | 0.1.60 |
| `context-mode` | 1.0.169 |
| `pi-mcp-adapter` | 2.11.0 |
| `pi-subagents` | 0.35.1 |
| `pi-system-prompt` | 0.1.4 |
| `pi-web-access` | 0.13.0 |
| `remote-pi` | 0.5.5 |
| `pi-context` | 2.1.0 |

Evidence: `/Users/mrapacz/.pi/agent/settings.json` (keys and package names only), `/Users/mrapacz/.pi/agent/npm/package.json`, `/Users/mrapacz/.pi/agent/npm/package-lock.json`, and each named package's `package.json`. **Observation, high confidence.**

## Configuration roots, scope, ownership, and precedence

Pi derives its user agent root from `PI_CODING_AGENT_DIR`, otherwise `~/.pi/agent`; `PI_CODING_AGENT_SESSION_DIR` separately overrides session storage, while `PI_PACKAGE_DIR` overrides the executable's shipped asset/package root. This is implemented in the installed 0.80.10 `dist/config.js` (`getPackageDir`, `ENV_AGENT_DIR`, `ENV_SESSION_DIR`, `getAgentDir`; lines 294-417) and exposed in `pi --help`. **Upstream/installed contract, high confidence.**

Global settings are `~/.pi/agent/settings.json`; trusted project settings are `.pi/settings.json`, and project values deep-merge over global values. In non-interactive print/JSON/RPC modes, no trust prompt is shown: `defaultProjectTrust` applies unless `--approve` or `--no-approve` overrides it for that run ([installed settings docs, lines 1-22](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/settings.md#L1-L22)). **Upstream contract, high confidence.**

Package identity and deduplication are explicit: project declarations win over the same global package, except project `autoload: false` acts as a delta; identity is npm name, git URL without ref, or resolved local absolute path ([installed packages docs, lines 190-228](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/packages.md#L190-L228)). Within resolved resources the installed package manager ranks project settings, project auto-discovery, user settings, user auto-discovery, then package resources; name collisions use first-wins (`dist/core/package-manager.js`, `resourcePrecedenceRank`, lines 47-65). **Installed implementation, high confidence.**

**Recommendation (high):** Maister should own one explicit Pi package declaration and the files within that package. Existing user settings, unrelated packages, global resources, project trust decisions, model/provider settings, auth, sessions, and `~/.agents/skills` remain operator-owned. A local-checkout development install can use a local package path; a release install should use a pinned npm or git source and record the source identity and version in the Maister receipt.

## Resource discovery and loading contract

| Resource | Native primitive / convention | Discovery and invocation | Disable/selection controls | Ownership note |
|---|---|---|---|---|
| Package | Pi-native package manager | npm, git, or local path; explicit `pi` manifest or conventional directories | `packages` object filters, `pi config`, global/project scope | Package identity is the dedupe/receipt unit |
| Extension | Pi-native executable module/API | `~/.pi/agent/extensions/*.ts|js`, subdirectory `index`, trusted `.pi/extensions`, settings/CLI, or package `pi.extensions`; default export receives `ExtensionAPI` | `--extension/-e`, `--no-extensions`, package filters | Full-process permissions; behavior-bearing |
| Skill | Agent Skills resource with Pi loader semantics | `~/.pi/agent/skills`, `~/.agents/skills`, trusted project `.pi/skills` and ancestor `.agents/skills`, package/settings/CLI; recursive `SKILL.md` | `--skill` remains additive even with `--no-skills` | Loaded progressively and exposed as `/skill:<name>` |
| Prompt template | Pi-native file resource | global/project/package/settings/CLI `.md`; conventional `prompts/` is non-recursive | `--prompt-template`, `--no-prompt-templates`, filters | Filename becomes slash command |
| Command | Runtime registration/projection, not a package directory | extension `pi.registerCommand()`, prompt filename, or skill name | visible through RPC `get_commands`; built-in TUI commands are interactive-only | Maister command projection must choose one of these three sources |
| Theme | Pi-native JSON resource | global/project/package/settings/CLI or package `themes/` | `--theme`, `--no-themes`, filters | Presentation-only unless explicitly depended upon |
| Context files | Built-in discovery | `AGENTS.md` and `CLAUDE.md` by working-directory ancestry | `--no-context-files`; project trust applies | Operator/project-owned context, not a Maister package behavior source |

The manifest form supports `extensions`, `skills`, `prompts`, and `themes`; absent a manifest, the same conventional directories are discovered ([packages docs, lines 107-173](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/packages.md#L107-L173)). Filters can omit, exclude, or force exact paths but only narrow resources allowed by the package manifest ([lines 190-216](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/packages.md#L190-L216)). Skills and prompt-specific locations are documented at [skills.md lines 20-41](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/skills.md#L20-L41) and [prompt-templates.md lines 7-17, 92-95](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/prompt-templates.md#L7-L17). **Upstream contract plus isolated observation, high confidence.**

The installed `DefaultResourceLoader` resolves package and CLI sources, loads extensions first, then allows extension `resources_discover` events to contribute additional skill/prompt/theme paths (`dist/core/resource-loader.js`, `reload` and `extendResources`, lines 74-315; `docs/extensions.md`, lines 369-385). **Installed implementation, high confidence.** This means extension-contributed resources are native, but dynamically behavior-bearing; Maister should prefer static manifest resources except where the runtime bridge genuinely requires an extension.

## Automation, sessions, events, cwd, and failure surfaces

### CLI modes

- `--print/-p`: one prompt, non-interactive exit. Useful for human-oriented output but weaker than JSON/RPC for evidence.
- `--mode json`: one-shot JSONL session header followed by agent/turn/message/tool lifecycle events, including queue, compaction, and retry events ([json.md lines 1-75](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/json.md#L1-L75)).
- `--mode rpc`: strict LF-delimited JSON commands on stdin and responses/events on stdout; request IDs correlate responses, not events. It exposes prompt/steer/follow-up/abort, model/thinking, bash, session replacement/tree/entries/stats, export, and command discovery ([rpc.md lines 1-37](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/rpc.md#L1-L37)).
- SDK: `createAgentSession`/`AgentSession` provides `prompt`, queueing, `subscribe`, model control, state, compaction, abort, and dispose; `AgentSessionRuntime` owns new/resume/fork/import replacement and requires event re-subscription after replacement (`docs/sdk.md`, `createAgentSession`, `AgentSession`, `AgentSessionRuntime`, lines 45-177). The active package also exports `./rpc-entry`.

The working directory is the process cwd; the CLI has no separate `--cwd` flag. A subprocess adapter must spawn with the desired cwd (the shipped `RpcClientOptions.cwd` does this), while SDK callers pass cwd through runtime/service construction. Resource discovery, project settings/trust, context ancestry, and default session grouping are all cwd-bound. **Installed implementation/inference, high confidence.**

### Sessions and events

Sessions default to JSONL under `~/.pi/agent/sessions/`, organized by cwd. CLI surfaces include continue, resume, explicit session, session ID, fork, custom session directory, and `--no-session`; interactive session commands include new, tree, clone, compact, export, and share ([sessions.md lines 1-35](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/sessions.md#L1-L35)). Extension lifecycle includes startup/reload/new/resume/fork, pre-switch/pre-fork cancellation, shutdown/rebind, compaction, tree, model, tool, and agent events (`docs/extensions.md`, lines 273-348 and 388-449). **Upstream contract, high confidence.**

RPC `get_commands` returns extension, prompt, and skill commands with source metadata; built-in TUI commands are explicitly absent ([rpc.md lines 763-804](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/rpc.md#L763-L804)). RPC failures use `{type:"response", success:false, error}`. Prompt acceptance is not terminal success; failures after acceptance arrive on the event/message stream ([rpc.md lines 43-76](https://github.com/earendil-works/pi/blob/v0.80.10/packages/coding-agent/docs/rpc.md#L43-L76)). **Upstream contract and probe, high confidence.**

**Recommendation (high):** use RPC as the initial subprocess port because it gives command correlation, cancellation, session selection, typed command failures, and event streaming. Persist only sanitized event envelopes required by Maister evidence. Use SDK only if in-process lifecycle control materially reduces ambiguity and the adapter can remain isolated from Pi internals.

## Isolated empirical probes

### Probe PHC-1: executable and active package discovery

- **Hypothesis:** resolve the executable actually used and enumerate package identities without reading secrets.
- **Execution window:** 2026-07-19, completed at `2026-07-19T12:34:30Z`.
- **Commands:** `rtk which pi`; `rtk pi --version`; `rtk node --version`; `rtk pi --help`; `rtk pi list`; `rtk jq` projections over package manifests, the settings top-level keys/package array, and lockfile package versions.
- **Result:** exit 0; active host 0.80.10, Node 25.9.0, eight active packages listed above. No settings values beyond package names were emitted; no sessions/auth contents were read.
- **Conclusion:** the 0.79.10 premise is not the executable baseline. **High confidence.**

### Probe PHC-2: local package extension/skill/prompt discovery and command execution

- **Hypothesis:** one local package can expose an extension, skill, and prompt through manifest-native discovery and RPC without model or session use.
- **Isolation:** `mktemp -d /tmp/maister-pi-host-probe.XXXXXX`; `PI_CODING_AGENT_DIR=<tmp>/agent`; `PI_OFFLINE=1`; `PI_SKIP_VERSION_CHECK=1`; empty temporary project cwd; `defaultProjectTrust=never`; install telemetry false; active settings untouched.
- **Fixture:** package manifest with `pi.extensions`, `pi.skills`, and `pi.prompts`; extension registered `/probe-extension`; skill `probe-skill`; prompt `probe-template`.
- **Sanitized command:** `rtk env PI_CODING_AGENT_DIR=<tmp>/agent PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 pi --mode rpc --no-session --no-builtin-tools --no-context-files --no-approve --offline`, with RPC `get_state`, `prompt /probe-extension`, and `get_commands` JSONL input.
- **Observed result:** exit 0; `get_commands` returned `probe-extension` (`source: extension`), `probe-template` (`source: prompt`), and `skill:probe-skill` (`source: skill`), each with package source metadata; invoking `/probe-extension` emitted an `extension_ui_request` notification and returned `prompt success:true`; `get_state` omitted `sessionFile`; no session file was created.
- **Side effects:** Pi created `<tmp>/agent/auth.json` during isolated startup; it was not opened. The entire explicit temporary root was deleted and absence verified. Raw logs/sessions were deliberately not retained; sanitized results are recorded here.
- **Additional observation:** user `~/.agents/skills` still appeared despite the isolated agent root. This matches skill auto-discovery docs and proves `PI_CODING_AGENT_DIR` alone is not hermetic. **High confidence.**

### Probe PHC-3: typed negative RPC response

- **Sanitized command:** same isolated environment, additionally `--no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files`, sending `{"id":"negative","type":"not_a_command"}`.
- **Observed result:** process exit 0 and correlated response `{type:"response", command:"not_a_command", success:false, error:"Unknown command: not_a_command"}`.
- **Conclusion:** command-level protocol rejection is typed without forcing process failure; adapters must inspect response success as well as exit code. **High confidence.**

## Version mismatches and design implications

1. **Executable vs user tree:** active 0.80.10 vs nested 0.79.10. **Observation, high.** Do not resolve runtime APIs from `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent`; bind to the executable host/peer surface.
2. **Research plan vs reality:** the brief's 0.79.10 executable statement is outdated. **Observation, high.** Update all later synthesis/evidence rows to 0.80.10 while retaining 0.79.10 as a collision risk.
3. **`pi-subagents` alignment:** its published 0.35.1 development Pi version is 0.80.10, matching the active host. **Observation, high.** This removes the planned peer-version mismatch but does not prove native delegation semantics.
4. **Docs vs RPC shape:** v0.80.10 docs illustrate legacy `location/path` fields, while the probe returned richer `sourceInfo` metadata. **Observation, medium-high.** Consumers should schema-check `sourceInfo` and tolerate documented legacy fields rather than hard-code the prose example.
5. **Isolation boundary:** agent-root override does not relocate `~/.agents/skills`. **Observation, high.** Test harnesses need explicit discovery-off flags and additive explicit paths; production should document the intentional coexistence with cross-harness skills.

## Recommended Pi host contract for Maister

- **Package boundary:** generate a Pi overlay/package with an explicit manifest. Put static skills and prompts in their manifest paths; put only the runtime bridge and truly Pi-native command handlers in extensions.
- **Command projection:** map portable command content to prompt templates or skills according to semantics; reserve extension commands for imperative host integration. Treat command origin metadata as evidence.
- **Installation:** never rewrite the whole settings file. Add/remove a single source identity transactionally, preserve package filters and all unrelated keys, and use project scope only when the operator chose project-local installation/trust.
- **Runtime:** spawn `pi --mode rpc` with explicit cwd, version check, `--offline` where network startup is not required, an explicit session policy, and resource selection flags. Correlate responses by ID and independently reduce lifecycle events to terminal success/failure/cancelled.
- **Evidence:** record executable realpath and package version, Node version, Pi package source/version, resource `sourceInfo`, cwd, session policy/ID (not transcript), selected extension version, normalized terminal event, and cleanup outcome.
- **Failure policy:** missing executable, unsupported version, untrusted project resources, missing required extension/command, malformed RPC, or absent terminal observation must yield typed unavailable/blocked/failed—not a silent inline fallback.

Overall confidence in the version-bound Pi host/resource/automation contract is **high** because installed source, shipped docs, package metadata, and isolated behavior converge. Confidence in long-term compatibility across Pi versions is **medium** until the adapter has an explicit supported-version matrix and versioned behavior tests.
