# Maister

Maister is a portable, auditable SDLC plugin. The repository contains one common source, three explicit host overlays, and one transactional installer. Host selection happens at installation time; maintainers do not independently maintain generated host trees. Cursor's checked-in compatibility projection is deterministically derived and drift-checked from the canonical source, with explicit hash-locked exceptions, and remains migration debt rather than a second source of truth.

## Distribution targets

Maister builds and installs packages for Codex, Cursor, and Kiro CLI. Package availability is not itself a native-support claim:

| Target | Structural delivery | Native discovery and invocation |
|---|---|---|
| Codex | Packaged projection, installer, and managed-worker bridge | Supported only for a host/version whose current E5/E6 records pass; otherwise provisional or unavailable |
| Cursor | Packaged projection, installer, and exact-native bridge | Supported only for a host/version whose current E5/E6 records pass; otherwise provisional or unavailable |
| Kiro CLI | Packaged projection, multi-root installer, and exact-native bridge | Supported only for a host/version whose current E5/E6 records pass; otherwise provisional or unavailable |

### Migration boundary (historical)

The old generated host trees, marketplace projections, and legacy host support were removed during the platform-independent distribution migration. They are retained only as migration history/parity context and are not supported installation targets.

## Installation

The public installer supports a clean local Git checkout, a self-contained Maister archive, or a GitHub source. Production source must resolve to one full commit and must be free of untracked or ignored inputs. For `github:owner/repo`, the bounded resolver uses Git to resolve the requested safe ref, creates a temporary detached checkout at the resolved commit, verifies `HEAD`, status, and content hash, and removes the checkout after the transaction. The overlay is selected from that same checkout, so source and host contract cannot silently come from different revisions.

```sh
SOURCE=/path/to/maister
test -z "$(git -C "$SOURCE" status --porcelain --untracked-files=all --ignored=matching)"
REF="$(git -C "$SOURCE" rev-parse HEAD)"
node plugins/maister/bin/maister-install.mjs install \
  --target codex \
  --source "local:$SOURCE" \
  --ref "$REF" \
  --home "$HOME" \
  --json
```

For an immutable GitHub install, prefer the full commit SHA:

```sh
node plugins/maister/bin/maister-install.mjs install \
  --target codex \
  --source github:SkillPanel/maister \
  --ref 0123456789012345678901234567890123456789 \
  --home "$HOME" \
  --json
```

The resolver also accepts a safe branch or tag ref, but resolves it with `git ls-remote` and records the resulting full commit. Short SHAs, unsafe ref syntax, ambiguous refs, dirty checkouts, and Git operations exceeding the bounded timeout are rejected. Git operations default to 30 seconds; `MAISTER_GIT_TIMEOUT_MS` may explicitly set a value from 1 ms through 10 minutes.

For development-only work on an intentionally dirty checkout:

```sh
MAISTER_ALLOW_DIRTY_LOCAL=1 node plugins/maister/bin/maister-install.mjs install \
  --target cursor \
  --source local:/path/to/maister \
  --home "$HOME" \
  --json
```

`MAISTER_ALLOW_DIRTY_LOCAL=1` is an explicit development escape hatch. It is not production provenance: do not use it for a release, support reproduction, or an operator runbook that claims immutable source.

The lifecycle commands are `install`, `update`, `status`, `verify`, `uninstall`, `rollback`, and `recover`. Installation stages and validates the source and overlay before it changes a target home. Updates refuse unsafe drift, preserve unmanaged settings, and publish a receipt only after integrity verification.

State is kept outside the plugin source:

```text
$XDG_STATE_HOME/maister/<target>/active-receipt.json
$XDG_STATE_HOME/maister/<target>/receipts/
$XDG_STATE_HOME/maister/<target>/journals/
$XDG_STATE_HOME/maister/<target>/backups/
```

If `XDG_STATE_HOME` is unset, the default is `~/.local/state`. State roots, journals, receipts, backups, staging directories, and lock files should be private to the operator (`0700` directories and `0600` files). A journal records transaction boundaries. Recovery and rollback are safety-sensitive operations; see the runbook below and preserve the state directory whenever a transaction does not complete.

### Concurrency and ownership boundary

The installer lock coordinates cooperating Maister lifecycle processes for one target and state root. It does not lock the host application, the user's editor, shell scripts, synchronization software, backup tools, or another process that writes the target tree or shared settings directly. Maister owns only the inventory and settings keys recorded in its receipt; all other content remains operator-owned. Path-identity revalidation, drift checks, staging, journals, and rollback reduce time-of-check/time-of-use risk, but they cannot make arbitrary external writers participate in the transaction.

Before install, update, uninstall, rollback, or recovery, stop the host and any process that may write the selected target or settings. Do not manually edit managed files, receipts, journals, backups, or settings keys during a lifecycle operation. If an external writer races the installer, treat a drift, integrity, transaction, or recovery error as unresolved: stop all writers, preserve target and state data, then follow the recovery runbook. The threat model assumes the operator controls the local account and state directory; it does not defend against a malicious same-user process or privileged process that can replace files while the transaction runs.

## Exit codes

The JSON envelope includes the same numeric `code` as the process exit status:

| Code | Meaning | Typical action |
| ---: | --- | --- |
| 0 | Completed successfully | Inspect the receipt for provenance and evidence. |
| 2 | Usage or settings-format error | Correct arguments or the settings format; do not retry unchanged. |
| 3 | Source or Git resolution error | Use a clean local checkout and a full commit; for GitHub, use a safe ref or preferably its full commit SHA and inspect the resolver details. |
| 4 | Overlay, materialization, or settings validation error | Fix the source/overlay contract; no target mutation should be accepted. |
| 5 | Managed-target or settings drift conflict | Review the reported unmanaged change before retrying. |
| 6 | Target lock is busy | Confirm another installer is not running, then retry. |
| 7 | Transaction, recovery, or rollback failure | Preserve state and journals; follow the recovery runbook. |
| 8 | Integrity verification failure | Do not continue; inspect provenance and receipt/journal evidence. |

## Locks, journals, recovery, and rollback failures

1. Stop concurrent Maister operations for the affected target and preserve the complete target state directory.
2. Check `$XDG_STATE_HOME/maister/<target>/install.lock` (or `~/.local/state/maister/<target>/install.lock`). Do not remove it while an installer process is alive. If the process is confirmed gone, preserve a copy of the lock and journals before any cleanup.
3. Inspect `journals/`, `active-receipt.json`, `receipts/`, and `backups/`. These are audit and recovery inputs; do not hand-edit them.
4. Run `recover --target <target> --home <home> --json` only after the process is stopped and the backup/journal paths are readable. Verify the returned journal path and receipt before retrying install/update.
5. For a rollback failure, do not repeatedly invoke `rollback`. Preserve the failing journal and backup, copy the target-scoped state directory for support, and repair the underlying permission, missing-backup, or drift condition first.
6. If recovery or rollback returns code 7, stop. A successful command exit is not evidence that the prior state was restored unless `verify` succeeds and the receipt/journal record the expected target.

Recovery follows the durable journal and target-scoped backups. A code-7 result means the transaction or recovery boundary is unresolved: preserve the state, correct the underlying condition, run `recover`, and then run `verify`. Do not treat a successful recovery command as proof of correctness without the resulting receipt and integrity verification.

## Packaged archive lifecycle and provenance

`make package TARGET=<target>` creates a self-contained deterministic target tarball under `dist/`. It includes the distribution runtime, installer, canonical source, selected overlay, and `.maister-source.json` containing source commit, version, and content hash. Before an artifact is published or installed, inspect it and its checksum:

```sh
sha256sum dist/maister-<target>.tar.gz
tar -tzf dist/maister-<target>.tar.gz
cat dist/SHA256SUMS
```

Treat `dist/` as disposable local build output. Filenames and timestamps do not prove that an archive was produced by the current source: old flat-layout or partially generated archives may remain there after development. Before a manual release, remove or isolate prior output, regenerate all three archives in the same clean release run, and require each archive to contain `plugins/maister/bin/maister-install.mjs` plus only its selected overlay. Never publish a pre-existing `dist/` archive that did not pass the current run's extracted lifecycle, checksum, metadata, and strict parity gates.

The package test's default mode builds each target twice with fixed inputs and verifies byte-for-byte deterministic output. Each package contains the canonical role source, `agent-projection-v1.json`, projector/runtime/installer code, the selected target's support assets, and minimal contract-only overlay inputs required to build the shared manifest. It excludes foreign target assets, checked-in Cursor/Kiro behavior copies, parity baselines, and all legacy Codex TOML profiles. The installer requires a passed, current portable-core E3 record for install/update. Generate the deterministic record only after the core gate, then pass the same bytes to every target package:

```sh
make test-core
make generate-e3-attestation E3_OUTPUT=dist/e3-portable-core.json E3_RESULT=passed SOURCE_VERSION=2.2.1
E3_ATTESTATION=dist/e3-portable-core.json make package TARGET=codex SOURCE_VERSION=2.2.1
```

Release CI runs `make test-core`, generates one deterministic E3 record, embeds it in all three archives, and blocks publication unless the extracted archive smoke completes install, verify, and uninstall for every target. The E3 schema/digest binding remains owned by the portable-core evidence boundary; the release record is not a cryptographic signature.

To exercise an approved archive manually:

```sh
EXTRACT="$(mktemp -d)"
SANDBOX="$(mktemp -d)"
HOME_DIR="$SANDBOX/home"
STATE_DIR="$SANDBOX/state"
mkdir -p "$HOME_DIR" "$STATE_DIR"
tar -xzf dist/maister-codex.tar.gz -C "$EXTRACT"
REF="$(node --input-type=module -e 'import fs from "node:fs"; console.log(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).source_commit)' "$EXTRACT/plugins/maister/.maister-source.json")"
XDG_STATE_HOME="$STATE_DIR" node "$EXTRACT/plugins/maister/bin/maister-install.mjs" install --target codex --source "local:$EXTRACT" --ref "$REF" --home "$HOME_DIR" --json
XDG_STATE_HOME="$STATE_DIR" node "$EXTRACT/plugins/maister/bin/maister-install.mjs" verify --target codex --source "local:$EXTRACT" --home "$HOME_DIR" --json
XDG_STATE_HOME="$STATE_DIR" node "$EXTRACT/plugins/maister/bin/maister-install.mjs" uninstall --target codex --source "local:$EXTRACT" --home "$HOME_DIR" --json
rm -rf "$EXTRACT" "$SANDBOX"
```

Use an isolated home/state directory for destructive lifecycle checks. The release test performs this flow in temporary sandboxes for every target.

The release workflow generates `dist/SHA256SUMS`, a CycloneDX artifact inventory at `dist/SBOM.cdx.json`, and an unsigned build provenance record at `dist/PROVENANCE.json`; it uploads these alongside the archives. Provenance and SBOM entries bind the embedded E3 canonical digest and attestation bytes as well as each archive hash. These files provide reproducibility and integrity only after they are obtained through a trusted release channel: they are not signatures, do not authenticate the publisher, and do not claim native E6. An attacker able to replace an archive can also replace unsigned checksums and metadata. Release actions are pinned to verified commit SHAs. Operators should retain the checksum, source commit, overlay/version identifier, parity report, E3 record, SBOM, and provenance record with the artifact.

## Repository model

```text
plugins/maister/common/       portable primitives and common source
plugins/maister/overlays/     codex, cursor, and kiro-cli contracts
plugins/maister/lib/          resolver, materializer, evidence, and installer
plugins/maister/bin/          validation, materialization, installation, parity
tests/platform-independent/   core and target-seam tests
```

Portable behavior is intended to have one owner. Codex and Kiro CLI consume the canonical common source; Cursor currently carries a behavior-bearing skills projection under its overlay, which is migration debt and must not be treated as an independent source of truth. An overlay should otherwise own only native manifests, layout, settings ownership, bindings, inventories, and forbidden vocabulary. The materializer produces a staging tree; the installer owns the target transaction.

## Agent projections and dispatch

Workflows request only exact logical IDs such as `maister:advisor`; aliases, bare role names, and defaults fail before dispatch. Canonical prompts live at `plugins/maister/agents/<role_id>.md`. Codex packages those prompts and starts managed `codex exec` workers; it has no native TOML role profiles. Cursor materializes `maister-<role_id>` Markdown agents, while Kiro materializes `~/.kiro/agents/maister-<role_id>.json` with receipt-owned prompts at `~/.kiro/agents/instructions/maister-<role_id>.md`.

The shipped owner is `plugins/maister/bin/maister-agent-gate.mjs`. An operator or host sends one JSON object on stdin; the CLI selects the target and installed state, loads an explicitly registered bridge module when configured, calls the packaged production runtime, passes that runtime to the gate evaluator, and writes one JSON result on stdout. It never invokes the projector and has no root-agent, inline, built-in, fuzzy, or alternate-target fallback.

### Agent-gate owner v1

Invoke the installed package entrypoint as `node plugins/maister/bin/maister-agent-gate.mjs`. Stdin is bounded to 1 MiB and must be one closed object with exactly these fields:

| Field | v1 value / ownership |
|---|---|
| `schema_version` | integer `1` |
| `operation` | exact string `evaluate_gate` |
| `target` | `codex`, `cursor`, or `kiro-cli` |
| `home` | existing real host home directory selected by the host |
| `state_root` | existing real Maister state root; the owner binds it as `XDG_STATE_HOME` |
| `working_root` | existing real worker checkout/root |
| `state_path` | existing real `orchestrator-state.yml` directly inside the task root |
| `bridge_module` | `null`, or an existing real non-symlinked ESM file explicitly registered by the host |
| `gate_context` | the closed gate-context v1 object accepted by `gate-evaluator.mjs` |
| `role_config` | the closed Advisor/Arbiter role-config object accepted by `gate-evaluator.mjs` |
| `automatic_continuation_supported` | boolean host capability decision |
| `interactive` | exactly `false`; the CLI does not impersonate a user gate |

The task root is `gate_context.context.task_path`; `state_path` must be its direct child. The source root is not caller-selectable: it is the `plugins/maister` tree containing the running owner. The runtime validates that source against the receipt-owned installed projection bytes. Credentials and host-version discovery belong to the bridge owner, never to Maister configuration or the workflow prompt.

stdout is always one closed envelope. Success uses `{"schema_version":1,"status":"succeeded","result":<evaluateGate result>,"error":null}` and exit code `0`. Boundary failure uses `{"schema_version":1,"status":"failed","result":null,"error":{"code":"...","message":"...","retryable":false,"details":{}}}` and exit code `2`. A runtime prerequisite that is absent after gate evaluation remains a typed unavailable failure in the durable gate attempt and produces a fail-closed `blocked` gate; it is not converted into a successful decision.

### Registered bridge module v1

A non-null `bridge_module` must export `async createMaisterAgentBridgeV1(request)`. The factory request is closed and contains exactly `schema_version: 1`, `operation: "evaluate_gate"`, `target`, canonical real paths `home`, `state_root`, `working_root`, `state_path`, and the immutable packaged `plugin_source_root`.

The factory response is also closed:

- Codex: exactly `{schema_version: 1, target: "codex", credentials_owner: "host", version_owner: "host", capability_port: {inspect}}`.
- Cursor/Kiro: exactly `{schema_version: 1, target, credentials_owner: "host", version_owner: "host", native_port}`. `native_port` has required fields `hostVersion` (non-empty string), `authenticated` (boolean), `externalCollisions` (array), `inspect` (function), and `launch` (function). `cancel` is the only optional field and is best-effort; cancellation support is not required.

The Codex `capability_port.inspect` input is one of two closed v1 shapes: resolver preflight `{schema_version, adapter_id}`, or dispatch preflight `{schema_version, adapter_id, host_version, required_model, required_reasoning_effort}`. It returns exactly:

```json
{
  "schema_version": 1,
  "executable": {"available": true, "path": "/absolute/codex"},
  "authentication": {"available": true, "authenticated": true},
  "version": {"value": "host-version", "allowed": true},
  "controls": {"working_root": true, "model": true, "reasoning_effort": true, "sandbox": true, "jsonl": true, "output_schema": true, "last_message": true, "ignore_user_config": true},
  "model": {"available": true, "supported": true, "value": "gpt-5.6-terra"},
  "reasoning": {"available": true, "supported": true, "value": "high"}
}
```

Every field is required and unknown fields are rejected. Availability fields may be `false`, executable/model/reasoning values may be `null` where the source validator permits it, and unsupported authentication, versions, controls, model, or effort produce typed unavailable/unsupported outcomes rather than inheritance.

The exact-native `inspect` input is either resolver preflight `{schema_version: 1, adapter_id, native_role_external_id: null}` or dispatch preflight `{schema_version: 1, adapter_id, host_version, native_role_external_id}`. It returns exactly `{schema_version: 1, exact_launch: boolean, observable_identity: boolean}`. `launch` receives exactly `{schema_version: 1, adapter_id, native_role_external_id, plan, task}` and returns exactly `{schema_version: 1, observed_native_role_external_id, output, native_observations}`. `plan` is dispatch-plan v1 with the exact top-level fields `schema_version`, `dispatch_id`, `requested_logical_role_id`, `role_id`, `role_source_digest`, `target`, `representation`, `adapter_id`, `native_role_external_id`, `host`, `host_version`, `policy`, and `provenance`; `policy` and `provenance` use the closed field sets enforced by `dispatch-contract.mjs`. `task` is the prepared exact-native task with exactly `task_path`, `bounded_task`, `canonical_source_digest`, `execution_context`, `gate_context`, and `work_item`.

The bridge owns credentials, host-version discovery, and compatibility with its host API. An unavailable module/factory, malformed response, failed inspection, unauthenticated host, unsupported version/control/policy, launch failure, or wrong observed identity remains a typed fail-closed result. The registration lifecycle is explicit: install/verify the matching target first, provide the module path for each owner invocation, replace the module only when its host compatibility changes, and renew E5/E6 evidence for that exact bridge/host version. Maister does not cache bridge code or credentials.

Projection is staged during materialization, never written back to the source checkout or generated during invocation. Kiro's shared native root is a receipt-owned `leaf_set`; Maister never owns unrelated Kiro agents. Cursor `explore`, and Kiro `explore`/`maister`, are explicit support roles and do not count toward the canonical 28 roles.

## Compatibility evidence

Evidence is recorded per target, capability, host version, scenario, timestamp, provenance, and expiry:

- E1 — source, schema, and overlay validation
- E2 — deterministic materialization and content validation
- E3 — shared portable-core behavior
- E4 — installer transaction, receipt, settings, drift, recovery, and rollback
- E5 — host-native discovery and integration
- E6 — host-native runtime scenarios

`passed`, `failed`, and `unavailable` are distinct. E5 or E6 may be unavailable because the host executable, authentication, a safe probe adapter, or a versioned runtime scenario is absent. An unavailable record is never promoted to passed and does not prove host-native discovery or runtime semantics. Packaging may be reported as provisional under the selected policy when its structural and transactional evidence passes, but semantic support that requires unavailable E5/E6 remains unverified and must not be advertised as supported. Re-probe after the missing prerequisite is supplied or evidence expires.

## Development

```sh
make test-core
make test-overlay TARGET=codex
make test-materializer TARGET=cursor
make test-install TARGET=kiro-cli
make test-evidence
make test-parity-release
make test-topology
make validate
make package TARGET=codex
```

For migration parity, `make test-parity-release` reconstructs the three reviewed legacy trees directly from the immutable Git-tree oracle, materializes all three targets from the same checkout, and requires zero unresolved differences. It needs no external legacy root. A release candidate must run this command from a clean checkout; `E_SOURCE_DIRTY` is a release stop, not a warning. `PARITY_ALLOW_DIRTY_LOCAL=1` is available only for development diagnostics, and a passing dirty-local comparison is never release evidence. Release CI runs the strict command without that override. The CLI rejects a missing manifest and accepts only explicit, versioned path rules with immutable observations, category, and rationale; it does not auto-learn differences from the candidate output. Edit `plugins/maister/` and its overlays directly. Do not create generated target directories or marketplace entries. `make validate` validates every supported overlay, the common core, evidence policy, and repository topology before packaging.

More operator detail is in [docs/README.md](docs/README.md).
