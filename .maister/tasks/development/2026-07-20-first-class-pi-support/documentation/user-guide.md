# Pi support guide

## TL;DR

Maister can package and install a self-contained Pi target from the generated release archive. The package projects the canonical Maister agents, skills, prompts, and the single `maister-delegate` extension command. Installation owns only the generated `~/.pi/agent/maister/**` tree and one identity-managed `packages[]` entry; operator-owned settings and Pi state remain intact.

The implementation supports two explicit release levels. A complete bound E1–E6 manifest publishes `pi.native-semantic`; if a host cannot provide both native levels, E1–E4 may still publish `pi.structural-transactional.provisional`. The current verified host tuple has passed E5 and E6.

## Supported contract

The v1 contract is pinned to:

- Pi `0.80.10`
- Node `25.9.0`
- `pi-subagents` `0.35.1`
- public delegation protocol v1

Unsupported or unverifiable tuples fail closed as unavailable. Maister does not bundle `pi-subagents`, credentials, auth, trust, sessions, `node_modules`, or other operator-owned Pi state.

## Install from an extracted package

From the extracted package root, use the generated installer and provide an immutable local source plus the target:

```sh
node plugins/maister/bin/maister-install.mjs install \
  --target pi \
  --source local:/path/to/extracted-package \
  --evidence plugins/maister/.maister-e3-attestation.json \
  --json
```

The installer validates the source binding, overlay, E3 attestation, package projection, settings ownership, and transaction plan before mutating the Pi home. A successful receipt records the managed package identity, provenance, evidence, and rollback information.

## Lifecycle commands

The installer supports the same transactional lifecycle as the other Maister targets:

```sh
node plugins/maister/bin/maister-install.mjs verify   --target pi --json
node plugins/maister/bin/maister-install.mjs update   --target pi --source local:/path/to/source --evidence /path/to/e3.json --json
node plugins/maister/bin/maister-install.mjs rollback --target pi --json
node plugins/maister/bin/maister-install.mjs recover  --target pi --json
node plugins/maister/bin/maister-install.mjs uninstall --target pi --json
```

Use `recover` after a process interruption when the installer reports an unresolved journal. If more than one journal is unresolved, select the exact journal with `--journal-id <uuid>`.

## Settings ownership

Maister edits the Pi settings file only through the configured Pi agent root. It normalizes one identity-managed `packages[]` member for `./maister`, preserving whether that entry was a string or object and preserving unrelated entries, object fields, order, file mode, auth, trust, and sessions. Ambiguous or incompatible matching entries are rejected before mutation.

## Delegation

The generated extension registers exactly one public `maister-delegate` command. The runtime adapter uses `pi-subagents/delegation` v1 and freezes the logical identity as `maister:<role>`. Requests have bounded timeout, turn, tool, and byte budgets. Cancellation, process loss, malformed identity, and terminal status are recorded as typed outcomes.

Maister writes a durable `maister-observation-v1` JSONL stream before the corresponding native side effect. Events are private, canonical, redacted, fsync-backed, sequence-validated, and hash chained. A retry after process loss must use a new dispatch ID; the public contract does not silently replay a lost foreground process.

## Evidence and support boundary

The release admission report must contain the exact targets `codex`, `cursor`, `kiro-cli`, and `pi`. A full native-semantic Pi claim requires:

- E5: package-agent discovery, executable identity, pinned versions, public export set, and protocol identity.
- E6: the full ordinary/advisor public delegation lifecycle, including progress, cancellation, process loss, retry identity, and durable observations.

E5 and E6 must pass together on the same fresh source/overlay/projection/package/host binding. Do not advertise native or semantic Pi support if either level is unavailable, mixed, stale, or expired. When both are unavailable, use the explicit provisional label and renew the evidence before promotion.

## Verification

Repository maintainers can run the focused integrated acceptance test:

```sh
node --test tests/platform-independent/pi-integration.test.mjs
```

The current-target release gate is:

```sh
make test-current-target-admission
```

The full implementation verification and review reports live under the task's `verification/` directory.
