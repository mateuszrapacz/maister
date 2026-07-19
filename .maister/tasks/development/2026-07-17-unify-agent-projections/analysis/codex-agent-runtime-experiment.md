# Codex Agent Runtime Experiment

## TL;DR

The current Codex documentation defines native custom agents with per-agent `model`, `model_reasoning_effort`, instructions, tools, and sandbox configuration. That is the right target architecture when Maister must select a model per logical agent.

The tested tool-backed Codex CLI 0.144.5 surface does not expose the required `agent_type`, `model`, or `reasoning_effort` spawn inputs. It exposes only `task_name`, `message`, and `fork_turns`. Even with an explicitly registered role and `fork_turns = "none"`, the child recorded `agent_role: null` and inherited the parent `gpt-5.6-terra/low` policy. Therefore the documented native architecture is not executable through this particular runtime surface today.

Generic prompt injection works but cannot enforce a different child model. A separate `codex exec` process can enforce model and effort, but it is not a native subagent and would be a different host backend.

## Key Decisions

- Treat generated native custom-agent TOMLs as the target Codex projection when per-role model selection is required.
- Capability-gate native role dispatch: the adapter must prove that the runtime exposes an agent selector and that the child applies the configured role, model, effort, and instructions.
- On the tested tool-backed surface, mark native custom-agent dispatch unavailable. Do not silently degrade a requested per-agent model to inherited parent settings.
- Generic prompt injection remains a distinct fallback backend for roles that explicitly allow inherited execution settings.
- Keep external `codex exec` out of the native-subagent contract. It works as a separate process backend but changes sandbox, authentication, lifecycle, and observability semantics.

## Open Questions / Risks

- The official documentation and the tested tool-backed runtime currently disagree about whether project custom agents are callable by name.
- Codex has more than one subagent surface. A CLI/TUI build that exposes `agent_type` can support the documented architecture, while this tool-backed surface cannot.
- Older releases reportedly allowed selecting the V1 path with `--disable multi_agent_v2`; the tested 0.144.5 distribution remained on V2 despite that flag. A pinned older release requires a separate compatibility probe before it can be treated as a supported backend.
- Full-history forks inherit the parent role/model/effort. Role-specific workers should use a fresh child context (`fork_turns = "none"`) and receive a bounded task/evidence packet.
- App-server events contain optional requested-model and requested-effort fields, but the tested model-visible `spawn_agent` input does not expose corresponding arguments.
- `codex exec --ephemeral` could not spawn a child because the ephemeral parent thread was unavailable to the collaboration router.

## Scope

The experiment tested Codex CLI `0.144.5` on macOS with `multi_agent` enabled. It used both the trusted Maister repository and an isolated temporary fixture. It did not modify the repository's existing `.codex/agents` files.

The parent session was pinned to:

```text
model: gpt-5.6-sol
reasoning effort: low
sandbox: read-only
approval policy: never
```

The custom profile fixture requested:

```toml
name = "maister_test_terra_high"
model = "gpt-5.6-terra"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
```

Its developer instructions required the exact marker `MAISTER_PROFILE_TERRA_HIGH_OK`.

## Results

| Experiment | Result | Runtime evidence | Verdict |
|---|---|---|---|
| Generic child with complete task prompt | Child returned exact `GENERIC_PROMPT_INJECTION_OK` | Child turn context recorded `gpt-5.6-sol` and `low`, matching the parent | Supported, with inherited execution settings |
| Per-spawn model and effort request | Spawn schema exposed neither field | Parent explicitly reported that it could not submit `gpt-5.6-terra/high` | Unsupported |
| Custom TOML selected by hyphenated name | Spawn rejected the name because task names allow only lowercase letters, digits, and underscores | No child was created | Unsupported |
| Custom TOML selected by matching underscore `task_name` | A generic child was created, but its context remained the parent model/effort; the TOML marker and developer instructions were absent | Spawn call arguments contained only `fork_turns`, `message`, and `task_name` | Unsupported |
| Trusted project custom agent (`arbiter`) | Child recorded `agent_role: null`, `gpt-5.6-terra/low`, and no role developer instructions | The valid `.codex/agents/arbiter.toml` requested `gpt-5.6-sol/high` | Unsupported on tested surface |
| Explicit `[agents.probe_worker]` registration plus `config_file` | With `fork_turns = "none"`, child still recorded `agent_role: null` and inherited `gpt-5.6-terra/low`; configured exact marker was not returned | Runtime spawn schema still contained only `task_name`, `message`, and `fork_turns` | Unsupported on tested surface |
| `use_agent_identity` enabled | No change: child remained generic and inherited the parent policy | Feature was marked under development by the CLI | Unsupported / no effect in probe |
| `--disable multi_agent_v2` on CLI 0.144.5 | Session still persisted `multi_agent_version: "v2"` and exposed the V2 task-oriented schema | No user config explicitly enabled V2 | V1 is not selectable on the tested distribution |
| External `codex exec` with explicit flags | Returned exact marker successfully | Persisted turn context recorded `gpt-5.6-terra` and `high` | Supported as a separate process backend, not as a native subagent |
| Ephemeral parent spawning a child | Collaboration router reported `no thread with id` for the parent | No child result | Unsupported in tested ephemeral mode |

## Exact Runtime Observations

The successful generic spawn call contained only:

```json
{
  "fork_turns": "all",
  "message": "<encrypted complete child task prompt>",
  "task_name": "generic_prompt_test"
}
```

The spawned child's effective turn context was:

```json
{
  "model": "gpt-5.6-sol",
  "effort": "low",
  "collaboration_mode": {
    "settings": {
      "model": "gpt-5.6-sol",
      "reasoning_effort": "low",
      "developer_instructions": null
    }
  }
}
```

Using `task_name: maister_test_terra_high` produced the same effective context. This proves that `task_name` names the child task/path; it does not select `.codex/agents/maister-test-terra-high.toml`.

The stronger registered-role probe used:

```toml
[agents.probe_worker]
description = "Deterministic probe worker"
config_file = "/private/tmp/maister-codex-agent-probe/.codex/agents/probe-worker.toml"
```

and requested a fresh child with `fork_turns = "none"`. The resulting child metadata still contained:

```json
{
  "agent_role": null,
  "model": "gpt-5.6-terra",
  "effort": "low"
}
```

The role file requested `gpt-5.6-sol/high` and an exact `NATIVE_ROLE_CONFIG_APPLIED` marker, neither of which was applied.

The separate-process control used explicit CLI flags and persisted:

```json
{
  "model": "gpt-5.6-terra",
  "effort": "high",
  "collaboration_mode": {
    "settings": {
      "model": "gpt-5.6-terra",
      "reasoning_effort": "high"
    }
  }
}
```

## Architectural Consequence

The documented target path for per-agent model selection is:

```text
maister:<role_id>
  -> generated native custom-agent definition
  -> spawn with exact agent_type and fork_turns = none
  -> child applies configured model, effort, sandbox, and instructions
  -> runtime receipt proves logical role plus effective execution policy
```

The currently executable fallback on this tool-backed surface is:

```text
maister:<role_id>
  -> exact manifest lookup and digest validation
  -> canonical Markdown prompt loading
  -> complete role prompt injected into generic spawn_agent message
  -> generic child inherits parent model/effort
  -> execution record stores logical role, prompt digest, parent execution policy, child task/thread identity, and result
```

For the generic fallback backend:

- E5 should prove exact adapter discovery and resolvability of `maister:<role_id>`, not the existence of a native per-role Codex agent.
- E6 should prove that the resolved canonical prompt was injected into a successfully spawned generic child and that its result is bound to the requested logical role.
- Per-role model and effort overrides must report `unavailable` rather than silently falling back.
- Parent-level model and effort remain valid and inherited execution policy.

If Maister later adopts an external-process backend, it must be specified separately from `codex.subagent`. That backend can enforce `model` and `model_reasoning_effort`, but needs its own capability probe, sandbox and approval contract, authentication behavior, cancellation semantics, receipt/evidence identity, and failure handling.

## Recommendation For The Pending Gate

The answer now depends on whether per-agent model selection is a requirement:

- If yes, use `Require 28 native Codex role IDs` as the target contract, generate those definitions from the canonical source, and keep Codex E5/E6 unavailable on any runtime whose capability probe cannot select and verify them.
- If no, `Prove generic adapter discovery` is implementable today, but its contract must explicitly state that children inherit the parent model and effort.

Do not select a generic adapter while presenting per-agent model choice as supported.
