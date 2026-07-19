# Unified agent projections: operator guide

Last updated: 2026-07-19

This guide explains how to install, verify, and operate Maister's unified agent roles on Codex, Cursor, and Kiro CLI. It is for Maister maintainers, installers, workflow operators, and people auditing an installation.

This feature has no web page or dashboard. Its production entry point is a command-line program that accepts one JSON request on standard input and returns one JSON envelope on standard output. Phase 12 therefore produced no UI screenshots, and this guide intentionally contains none.

## What changed

Maister has one canonical set of 28 roles. Every supported target is derived from those same Markdown role definitions during installation:

- **Codex** runs a separately managed `codex exec` worker using the selected canonical prompt and result schema. It does not use native `.codex/agents/*.toml` profiles.
- **Cursor** installs native Markdown agents named `maister-<role_id>`.
- **Kiro CLI** installs native descriptors named `maister-<role_id>` and their receipt-owned prompts.

The workflow always requests an exact logical name such as `maister:advisor`. Maister either verifies and dispatches that exact role or stops. It never falls back to the main agent, a built-in agent, a similar name, an inline prompt, or another target.

## Before you begin

You need:

- Node.js capable of running the packaged `.mjs` programs;
- a clean Maister source checkout or an approved self-contained release archive;
- an existing target home directory and working checkout;
- a writable private state location, normally `$XDG_STATE_HOME/maister/<target>` or `~/.local/state/maister/<target>`;
- the selected host installed and authenticated when live native execution is required;
- a host-owned bridge module compatible with the exact host version when invoking the production agent gate.

Stop the host application and any editor, synchronization tool, or other process that can modify the selected target while running install, update, uninstall, rollback, or recovery. Maister's lock coordinates Maister lifecycle processes only; it cannot stop unrelated writers.

## Install a target

Use one target name throughout a lifecycle: `codex`, `cursor`, or `kiro-cli`.

For a clean local checkout:

```sh
SOURCE=/absolute/path/to/maister
REF="$(git -C "$SOURCE" rev-parse HEAD)"
node "$SOURCE/plugins/maister/bin/maister-install.mjs" install \
  --target codex \
  --source "local:$SOURCE" \
  --ref "$REF" \
  --home "$HOME" \
  --json
```

Production installation rejects dirty, untracked, and ignored source inputs. The `MAISTER_ALLOW_DIRTY_LOCAL=1` escape hatch is for development diagnostics only and is not valid release or support evidence.

An immutable GitHub installation should use a full commit SHA:

```sh
node plugins/maister/bin/maister-install.mjs install \
  --target cursor \
  --source github:SkillPanel/maister \
  --ref 0123456789012345678901234567890123456789 \
  --home "$HOME" \
  --json
```

### What success looks like

A successful lifecycle command exits with code `0` and returns a JSON envelope with `ok: true`. Keep the reported receipt path: the receipt binds the installed files to the source, projection, and evidence used for that transaction.

Installation success proves structural delivery. It does not by itself prove that a particular host/version can discover and invoke native agents.

## Verify, update, and uninstall

Run `status` to inspect the active target and `verify` before using its runtime:

```sh
node plugins/maister/bin/maister-install.mjs status \
  --target codex --home "$HOME" --json

node plugins/maister/bin/maister-install.mjs verify \
  --target codex --source local:/absolute/path/to/maister \
  --home "$HOME" --json
```

Use the same trusted source policy for an update that you used for installation:

```sh
SOURCE=/absolute/path/to/maister
REF="$(git -C "$SOURCE" rev-parse HEAD)"
node "$SOURCE/plugins/maister/bin/maister-install.mjs" update \
  --target codex \
  --source "local:$SOURCE" \
  --ref "$REF" \
  --home "$HOME" \
  --json
```

Uninstall removes only inventory and settings owned by the active receipt:

```sh
node plugins/maister/bin/maister-install.mjs uninstall \
  --target codex --source local:/absolute/path/to/maister \
  --home "$HOME" --json
```

For Kiro CLI, unrelated files below `~/.kiro/agents` are outside Maister ownership and must remain unchanged. An unmanaged collision at a destination is an error even if its bytes happen to match.

Do not hand-edit managed projection files or receipts. If verification reports drift, identify the external change before retrying. Preserve the complete target state directory after any transaction, rollback, or recovery error.

## Select an exact role

Logical role names use this grammar:

```text
maister:<role_id>
```

Examples:

```text
maister:advisor
maister:code-reviewer
maister:test-suite-runner
```

Bare names such as `advisor`, aliases, different capitalization, and natural-language requests such as “use the reviewer” are invalid. The selected logical role is translated as follows:

| Target | Runtime representation |
|---|---|
| Codex | `codex.exec`; no native external role ID |
| Cursor | native agent `maister-<role_id>` |
| Kiro CLI | native agent `maister-<role_id>` |

The 28 canonical role IDs are:

```text
advisor
bottleneck-analyzer
code-quality-pragmatist
code-reviewer
codebase-analysis-reporter
docs-operator
e2e-test-verifier
gap-analyzer
html-companion-writer
implementation-completeness-checker
implementation-planner
information-gatherer
production-readiness-checker
project-analyzer
reality-assessor
research-planner
research-synthesizer
solution-brainstormer
solution-designer
spec-auditor
specification-creator
task-classifier
task-group-implementer
test-suite-runner
thermo-nuclear-code-quality-review-subagent
thermo-nuclear-review-subagent
ui-mockup-generator
user-docs-generator
```

Cursor's `explore` and Kiro's `maister` and `maister-explore` are support roles. They are not part of the canonical 28 and cannot replace a missing canonical role.

## Model, reasoning, and concurrency policy

Model and reasoning policy comes from the installed, versioned projection manifest. It is not selected by adding fields to an owner request or by relying on the main agent's settings.

- **Codex:** the current manifest pins model `gpt-5.6-terra` and reasoning effort `high` for every canonical role. The managed worker passes both explicitly and ignores user execution defaults while retaining normal host authentication. If that exact model, effort, or required `codex exec` control cannot be verified, dispatch becomes unavailable; it does not inherit the orchestrator's model.
- **Cursor and Kiro CLI:** the current manifest delegates model and reasoning choice to the native host. Maister verifies exact role dispatch and observed native identity, but does not claim per-role model enforcement on these hosts.
- **Concurrency:** read-only profiles permit up to four workers. Workspace-writing profiles are serialized per checkout. Do not assume that a role is read-only from its name; use the profile recorded in the dispatch plan and execution evidence.

Changing the model or effort is a reviewed manifest change followed by materialization, validation, installation/update, and renewed evidence. It is not a per-invocation operator override.

## Invoke the production agent gate

The installed entry point is:

```sh
node plugins/maister/bin/maister-agent-gate.mjs
```

It accepts exactly one owner-v1 JSON object. The following request is a complete shape for a non-interactive phase gate. Replace every absolute path and the gate values with those from the active workflow. `state_path` must be the `orchestrator-state.yml` directly inside `gate_context.context.task_path`.

```json
{
  "schema_version": 1,
  "operation": "evaluate_gate",
  "target": "codex",
  "home": "/Users/operator",
  "state_root": "/Users/operator/.local/state",
  "working_root": "/work/project",
  "state_path": "/work/project/.maister/tasks/development/example/orchestrator-state.yml",
  "bridge_module": "/absolute/path/to/registered-codex-bridge.mjs",
  "gate_context": {
    "schema_version": 1,
    "phase_id": "phase-11",
    "gate_type": "phase-exit",
    "question": "Continue?",
    "options": ["Continue", "Pause"],
    "original_recommendation": "Continue",
    "policy": "fully_automatic",
    "safety_classification": "configurable",
    "context": {
      "task_path": "/work/project/.maister/tasks/development/example",
      "workflow_id": "development"
    }
  },
  "role_config": {
    "advisor": {"logical_role_id": "maister:advisor", "max_attempts": 1},
    "arbiter": {"logical_role_id": "maister:advisor", "max_attempts": 1},
    "arbiter_enabled_on_disagreement": true,
    "backoff_ms": 0
  },
  "automatic_continuation_supported": true,
  "interactive": false
}
```

Save the object as `owner-request.json`, then run:

```sh
node plugins/maister/bin/maister-agent-gate.mjs < owner-request.json
```

The owner request is closed: unknown or missing fields are rejected. `interactive` must be `false`; this CLI cannot answer or impersonate a user gate. In this entry point, `role_config` selects the exact Advisor and Arbiter logical roles used by gate evaluation. Other workflow delegations also use exact `maister:<role_id>` resolution through the common runtime.

### Bridge registration

`bridge_module` is either an existing, real, non-symlinked ESM file registered by the host integration or `null`. A real module exports `async createMaisterAgentBridgeV1(request)` and owns host credentials, host-version discovery, and compatibility with the host API.

- A Codex bridge supplies the required capability inspection port. The runtime itself launches the managed `codex exec` process after verifying the executable, authentication, version, controls, model, and effort.
- A Cursor or Kiro bridge supplies exact-native `inspect` and `launch` functions plus host version, authentication state, and external collision data. Its optional `cancel` function is best-effort.

Maister does not cache bridge code or credentials. Register the module explicitly on every invocation, replace it when host compatibility changes, and renew E5/E6 evidence for that exact bridge and host version. Passing `null` is valid input, but live dispatch then resolves to typed unavailable/blocked rather than another execution route.

## Read the result

The program writes one JSON line to stdout.

Boundary success exits `0`:

```json
{"schema_version":1,"status":"succeeded","result":{},"error":null}
```

The actual `result` is the gate evaluator's result. Inspect it rather than treating outer `status: "succeeded"` as proof that a worker ran or a gate continued.

A request, path, target, or bridge-contract error exits `2`:

```json
{"schema_version":1,"status":"failed","result":null,"error":{"code":"E_AGENT_OWNER_INPUT","message":"...","retryable":false,"details":{}}}
```

Missing runtime prerequisites after gate evaluation are recorded as a typed unavailable attempt and a fail-closed `blocked` gate. They are not converted into a successful decision.

Every real dispatch also writes a private, hash-chained event stream below:

```text
<task_path>/execution/agent-dispatches/<dispatch_id>.jsonl
```

Use the terminal event and the committed gate result together. Requested role, adapter, model policy, observed identity/policy, projection digests, and terminal result are separate evidence fields. Do not accept a model's text claiming its own identity or model as runtime evidence.

## Interpret compatibility evidence

Maister records different evidence layers:

- **E1:** source, schema, and overlay validation;
- **E2:** deterministic projection and content validation;
- **E3:** portable core behavior;
- **E4:** install, receipt, drift, recovery, and rollback behavior;
- **E5:** discovery and integration for the exact host/version;
- **E6:** real runtime scenarios and observed identity/policy.

`passed`, `failed`, and `unavailable` have different meanings:

- `passed` means the versioned scenario was observed successfully;
- `failed` means an available scenario ran and produced incorrect behavior;
- `unavailable` means a prerequisite such as the executable, authentication, compatible bridge, safe scenario, required control, or observable identity was absent.

An unavailable E5/E6 record is not a pass. A structurally valid package may be described as provisional, but native support must not be claimed until current E5/E6 evidence passes for the exact bridge, host version, authentication state, scenario, and projection provenance.

## Troubleshooting

### The role is rejected before launch

Check that the request uses the exact `maister:<role_id>` spelling and that the ID appears in the canonical inventory. Do not retry with a bare name or alias. Then run installer `verify` and inspect the active receipt for stale or mismatched projection digests.

### The gate is blocked as unavailable

This is expected fail-closed behavior when the executable, authentication, bridge, host version, required control, pinned Codex model/effort, safe scenario, or observable native identity cannot be verified. Correct the named prerequisite and renew evidence. Do not bypass the check by using the main agent or a different target.

### Cursor or Kiro reports the wrong native identity

Confirm that the bridge observed the exact `maister-<role_id>` identity and that no unmanaged agent collides with it. A successful launch with the wrong observed ID is a failure, not partial success.

### Installation reports drift or a collision

Stop the host and all external writers. Preserve target and state data, inspect the reported path, and restore or deliberately reconcile the operator-owned change before retrying. Never delete receipts or journals to force progress.

### Recovery or rollback exits with code 7

Stop. Preserve the complete target-scoped state directory, journals, receipts, and backups. Correct the underlying permission, missing-backup, or drift condition before running `recover`; then run `verify`. Do not repeatedly retry rollback.

### Strict parity reports `E_SOURCE_DIRTY`

Run the release gate from a clean checkout. `PARITY_ALLOW_DIRTY_LOCAL=1` is diagnostic only; its output cannot authorize publication.

## Accepted known limitations

The final implementation verification accepted two warnings. They remain follow-up work and should be included in operational risk reviews:

- **RV3-W1 — stdin ingestion:** the CLI checks the advertised 1 MiB limit only after `fs.readFileSync(0)` has already read all input. A very large local input can therefore consume more than 1 MiB of memory, and a read failure during default argument evaluation can occur before the typed-envelope handler. Send only a small, trusted request object and apply an upstream input cap until incremental bounded reading is implemented.
- **RV3-W2 — optional native cancellation:** Cursor/Kiro `cancel` is optional and best-effort, but v1 does not yet publish a complete closed request shape, exact invocation timing, or return/throw semantics. Do not depend on cancellation as a transactional guarantee. Durable event and gate state determine the outcome.

Additional support boundaries:

- Native behavior depends on the exact installed host version and authentication state.
- Cursor agent precedence in the presence of colliding unmanaged agents is not universally guaranteed; collisions remain blocking unless a versioned probe proves safe behavior.
- Kiro exact-name delegation and observable identity depend on its native host contract.
- Codex support requires an authenticated CLI exposing every pinned `exec` control. A missing control, unsupported model, or unsupported reasoning effort is unavailable, never inherited.
- Clean strict parity is still required before release publication.

## Maintainer checklist

When changing a canonical role or execution policy:

1. Edit the canonical role or versioned projection contract, not a generated host copy.
2. Run the repository validation and target materialization checks.
3. Build all selected targets from the same clean source revision.
4. Install or update through the transactional installer.
5. Verify the active receipt and projection digests.
6. Renew E5/E6 for every exact bridge and host/version whose native support is claimed.
7. Retain receipts, parity output, E3, SBOM, provenance, and checksums with a published artifact.

Advisor follows exactly the same role, policy, resolver, adapter, event, and evidence path as every other canonical role. Do not add a special Advisor TOML profile, model override, sandbox exception, or fallback branch.
