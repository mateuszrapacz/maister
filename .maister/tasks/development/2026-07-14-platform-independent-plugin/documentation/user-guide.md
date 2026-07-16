# Install and manage Maister on Codex, Cursor, or Kiro CLI

**Last updated:** 2026-07-16  
**Applies to:** Maister 2.2.1 platform-independent distribution

## TL;DR

Maister uses one installer for three targets: Codex, Cursor, and Kiro CLI. You
choose the target with `--target`, install from a clean local source or an
immutable GitHub commit, and use the same command for updates, checks,
uninstall, rollback, and recovery.

The examples in this guide are complete terminal actions. This is a CLI-only
feature with no web interface, so screenshots are not applicable and this
guide intentionally contains no image references.

## Key decisions

- Use `codex`, `cursor`, or `kiro-cli` exactly as the target name.
- Prefer a full 40-character Git commit for every install and update.
- Keep the target home and its Maister state directory private and backed up.
- Stop the host and other programs that may write its settings before a
  lifecycle command.
- Treat `provisional` compatibility and `unavailable` native evidence as
  limitations, not as successful native verification.

## Open questions and risks

- Native E5/E6 checks can remain unavailable when the selected host, login, or
  safe native test scenario is missing.
- The installer coordinates other Maister installer processes, but it cannot
  stop an editor, sync tool, backup tool, or another process from changing the
  same files.
- An unsigned checksum or provenance file proves integrity only when you got it
  through a trusted release channel.

## Contents

- [What Maister installs](#what-maister-installs)
- [Before you start](#before-you-start)
- [Choose a target](#choose-a-target)
- [Set up your terminal](#set-up-your-terminal)
- [Install from a clean local source](#install-from-a-clean-local-source)
- [Install from an immutable GitHub source](#install-from-an-immutable-github-source)
- [Check status and verify the installation](#check-status-and-verify-the-installation)
- [Update Maister](#update-maister)
- [Uninstall Maister](#uninstall-maister)
- [Roll back to the previous receipt](#roll-back-to-the-previous-receipt)
- [Recover an interrupted transaction](#recover-an-interrupted-transaction)
- [Protect your home and state](#protect-your-home-and-state)
- [Understand results and exit codes](#understand-results-and-exit-codes)
- [Understand compatibility evidence](#understand-compatibility-evidence)
- [Troubleshooting](#troubleshooting)

## What Maister installs

Maister combines one common source with the overlay for your selected host. It
stages and validates the result before changing the target directory.

| Target | Use with `--target` | Default installed location |
| --- | --- | --- |
| Codex | `codex` | `$HOME/.codex/plugins/local/maister` |
| Cursor | `cursor` | `$HOME/.cursor/plugins/local/maister` |
| Kiro CLI | `kiro-cli` | `$HOME/.kiro-maister` |

Claude and the old generated or marketplace layouts are not supported targets.

The installer records which files and settings it owns. Receipt-listed files
and explicitly managed settings keys are Maister-owned. Other files and
settings remain yours.

## Before you start

You will need:

- Node.js 22, which is the version used by the project's validation jobs.
- Git on your `PATH` for a local Git checkout or GitHub source.
- The selected host: Codex, Cursor, or Kiro CLI.
- A trusted Maister installer or extracted Maister package.
- For `install` and `update`, a current, passed E3 portable-core attestation
  that matches the exact source commit and source bytes. A self-contained
  release archive can include this record; otherwise, use `--attestation`.
- Write access to your chosen home and state directories.

⚠️ Do not run the installer with `sudo` into another user's home. Do not use
the filesystem root as `--home`; the installer rejects it.

Before any command that changes files, close the selected host and pause any
editor, sync, backup, or automation process that may write the target or shared
settings.

The commands below use POSIX shell syntax for macOS and Linux. Replace the
example paths with real absolute paths on your computer.

## Choose a target

Pick one of these exact values:

```sh
export MAISTER_TARGET="codex"
```

Use `cursor` or `kiro-cli` instead when installing for those hosts. Each target
has separate installed files, receipts, journals, backups, and a lock.

## Set up your terminal

Point the commands at the trusted installer you obtained and the home where the
host stores its configuration:

```sh
export MAISTER_INSTALLER_ROOT="/path/to/maister"
export MAISTER_INSTALLER="$MAISTER_INSTALLER_ROOT/plugins/maister/bin/maister-install.mjs"
export MAISTER_HOME="$HOME"
export MAISTER_TARGET="codex"
export MAISTER_ATTESTATION="/path/to/e3-portable-core.json"

test -f "$MAISTER_INSTALLER"
node --version
git --version
```

✅ The first command should be silent, and the version commands should print
the installed Node.js and Git versions.

If you use a custom state location, set it before the first command and keep
the same value for every later command:

```sh
export XDG_STATE_HOME="$HOME/.local/state"
```

## Install from a clean local source

Use this flow for a clean Git checkout. The source must be the checkout root,
its checked-out `HEAD` must match the selected commit, and it must have no
changed, untracked, or ignored inputs.

```sh
export MAISTER_SOURCE="/path/to/clean/maister-checkout"
export MAISTER_REF="$(git -C "$MAISTER_SOURCE" rev-parse HEAD)"

test "$MAISTER_SOURCE" = "$(git -C "$MAISTER_SOURCE" rev-parse --show-toplevel)"
test -z "$(git -C "$MAISTER_SOURCE" status --porcelain=v1 --untracked-files=all --ignored=matching --no-renames)"

node "$MAISTER_INSTALLER" install \
  --target "$MAISTER_TARGET" \
  --source "local:$MAISTER_SOURCE" \
  --ref "$MAISTER_REF" \
  --attestation "$MAISTER_ATTESTATION" \
  --home "$MAISTER_HOME" \
  --json
```

✅ A successful result has `"ok":true`, `"code":0`, and a non-null
`receipt_path`. Keep that receipt path for audit and support.

### Install from a self-contained archive

An approved extracted release archive has a `.maister-source.json` manifest and
can contain its matching E3 attestation. Point both the installer and source at
the extracted root:

```sh
export MAISTER_SOURCE="/path/to/extracted/maister-package"
export MAISTER_INSTALLER="$MAISTER_SOURCE/plugins/maister/bin/maister-install.mjs"
export MAISTER_REF="$(node --input-type=module -e 'import fs from "node:fs"; console.log(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).source_commit)' "$MAISTER_SOURCE/plugins/maister/.maister-source.json")"

node "$MAISTER_INSTALLER" install \
  --target "$MAISTER_TARGET" \
  --source "local:$MAISTER_SOURCE" \
  --ref "$MAISTER_REF" \
  --home "$MAISTER_HOME" \
  --json
```

The installer automatically looks for an embedded E3 record in recognized
package locations. If your approved archive stores the matching attestation
separately, add `--attestation "$MAISTER_ATTESTATION"`.

## Install from an immutable GitHub source

Use a full 40-character commit whenever possible. The installer resolves the
ref, creates a temporary detached checkout, checks its identity and contents,
uses the overlay from that same checkout, and removes the temporary checkout
after the transaction.

```sh
export MAISTER_GITHUB_SOURCE="github:SkillPanel/maister"
export MAISTER_REF="0123456789012345678901234567890123456789"

node "$MAISTER_INSTALLER" install \
  --target "$MAISTER_TARGET" \
  --source "$MAISTER_GITHUB_SOURCE" \
  --ref "$MAISTER_REF" \
  --attestation "$MAISTER_ATTESTATION" \
  --home "$MAISTER_HOME" \
  --json
```

Replace the example commit with the full commit that matches your attestation.
A safe branch or tag is accepted, but it is resolved to a full commit and that
commit is written to the receipt. Short commit IDs are rejected.

Git operations time out after 30 seconds by default. If your connection needs
longer, set a whole number of milliseconds from 1 through 600000:

```sh
export MAISTER_GIT_TIMEOUT_MS="120000"
```

## Check status and verify the installation

### Check status

`status` reads the current receipt. It does not change installed files.

```sh
node "$MAISTER_INSTALLER" status \
  --target "$MAISTER_TARGET" \
  --home "$MAISTER_HOME" \
  --json
```

✅ An active installation has `"ok":true`, `"code":0`, and a non-null
`receipt_path`. If no active receipt exists, the command still completes but
returns `receipt_path:null`.

### Verify files and managed settings

`verify` checks receipt-listed files and the settings owned by Maister. Use the
same trusted installer package you used for the lifecycle operation.

```sh
node "$MAISTER_INSTALLER" verify \
  --target "$MAISTER_TARGET" \
  --home "$MAISTER_HOME" \
  --json
```

✅ For an installed target, success is `"ok":true`, `"code":0`, and a
non-null `receipt_path`. Like `status`, `verify` returns a successful empty
result when there is no active receipt, so check the receipt path.

Verification checks installed integrity and drift. It does not turn unavailable
host-native E5/E6 evidence into a pass.

## Update Maister

An update needs a source and a matching, current E3 attestation, just like the
first install. It refuses unexpected changes to managed files or settings.

For a clean local source:

```sh
export MAISTER_REF="$(git -C "$MAISTER_SOURCE" rev-parse HEAD)"

node "$MAISTER_INSTALLER" update \
  --target "$MAISTER_TARGET" \
  --source "local:$MAISTER_SOURCE" \
  --ref "$MAISTER_REF" \
  --attestation "$MAISTER_ATTESTATION" \
  --home "$MAISTER_HOME" \
  --json
```

For GitHub, use the same command with `--source "$MAISTER_GITHUB_SOURCE"` and
set `MAISTER_REF` to the new full commit. Supply the E3 attestation created for
that exact commit and portable-core content.

If you are updating from a self-contained archive that embeds its matching E3
record, omit `--attestation` and use its extracted root as `MAISTER_SOURCE` and
`MAISTER_INSTALLER`.

✅ A successful update publishes a new receipt. Run `verify` immediately and
retain both the new and previous receipts so rollback remains auditable.

## Uninstall Maister

Uninstall removes only the managed inventory and managed settings recorded by
the active receipt. It refuses unsafe drift rather than overwriting a change it
does not understand.

```sh
node "$MAISTER_INSTALLER" uninstall \
  --target "$MAISTER_TARGET" \
  --home "$MAISTER_HOME" \
  --json
```

✅ A successful uninstall returns code 0 and publishes an `uninstalled`
receipt. Unlisted files and unmanaged settings are preserved.

Do not delete the state directory after uninstall if you may need its audit
history, backups, or rollback information.

## Roll back to the previous receipt

Rollback restores the immediately previous receipt and its exact backed-up
state. It is useful after an update or an uninstall when the current receipt
points to a prior transaction.

1. Stop the host and every other writer.
2. Preserve a copy of the target's Maister state directory.
3. Run:

```sh
node "$MAISTER_INSTALLER" rollback \
  --target "$MAISTER_TARGET" \
  --home "$MAISTER_HOME" \
  --json
```

4. Run `verify` and confirm the returned `receipt_path` is the receipt you
   expected.

Rollback returns code 7 when no previous receipt is available or exact restore
cannot be completed. Do not repeatedly retry a failed rollback. Preserve its
journal and backups, correct the reported permission, missing-backup, or drift
problem, and follow the recovery steps.

## Recover an interrupted transaction

`recover` selects the newest unresolved journal for the target and restores
from its recorded backup. If no unresolved journal exists, it returns the
current active receipt without changing it.

1. Confirm the failed installer process and every external writer have stopped.
2. Preserve the complete target state directory.
3. Make sure its `journals/` and `backups/` entries are readable.
4. Run:

```sh
node "$MAISTER_INSTALLER" recover \
  --target "$MAISTER_TARGET" \
  --home "$MAISTER_HOME" \
  --json
```

5. Inspect `journal_path` and `receipt_path` in the response.
6. Run `verify` with the same trusted installer before another install or
   update.

⚠️ If recovery returns code 7, stop. Do not delete the lock, journal, receipt,
or backup, and do not claim the installation is restored. Copy the state
directory for diagnosis and correct the underlying filesystem problem first.

## Protect your home and state

By default, state is stored separately from installed plugin files:

```text
$XDG_STATE_HOME/maister/<target>/
```

When `XDG_STATE_HOME` is unset, it defaults below the selected `--home`:

```text
$MAISTER_HOME/.local/state/maister/<target>/
```

Each target state directory contains:

```text
active-receipt.json
receipts/
journals/
backups/
staging/
install.lock
```

Follow these safety rules:

- Keep state directories at mode `0700` and receipt, journal, backup metadata,
  settings snapshots, and lock files at mode `0600`.
- Use the same `--home` and `XDG_STATE_HOME` values for every command. Changing
  either selects different target or state paths.
- Never hand-edit receipts, journals, backups, or the active receipt pointer.
- Never remove `install.lock` while its owning process may still be running.
- Back up the whole target state directory before manual recovery work.
- Treat files listed in a receipt and its managed settings keys as
  Maister-owned. Make changes through an update rather than editing them during
  a lifecycle operation.
- Stop the host, editor, shell automation, and sync tools before install,
  update, uninstall, rollback, or recovery.

The lock prevents two cooperating Maister lifecycle processes from changing
the same target and state root at once. It cannot lock unrelated programs or
protect against a malicious process running as the same user or as an
administrator.

## Understand results and exit codes

The commands in this guide return a JSON object. Important fields are:

- `ok`: `true` only when the command exited successfully.
- `code`: the same number used as the process exit status.
- `message`: a short result or error description.
- `error.kind`: the specific error category when `ok` is false.
- `error.details`: paths, conflicts, or other details needed to fix the issue.
- `receipt_path`: the active or newly published receipt, when available.
- `journal_path`: the transaction journal, when available.
- `evidence`: the evidence copied from the receipt.

| Code | Meaning | What to do |
| ---: | --- | --- |
| 0 | Success | Check the receipt path, provenance, compatibility, and evidence. |
| 2 | Command usage or settings format | Correct the command, target, option, path, or settings format. Do not retry unchanged. |
| 3 | Source or Git resolution | Use a clean source, full commit, safe ref, and matching checkout. |
| 4 | Overlay, materialization, settings, provenance, or evidence validation | Use a valid source/overlay and the E3 attestation that matches it. |
| 5 | Managed file or settings drift | Review the reported conflict. Preserve your change and reconcile it before retrying. |
| 6 | Target lock busy | Confirm whether another installer is running. Retry only after it exits. |
| 7 | Transaction, rollback, or recovery failure | Stop, preserve state and journals, and follow the recovery procedure. |
| 8 | Integrity verification failure | Do not continue. Preserve the receipt and journal and investigate the changed files. |

All unknown options are rejected. `--evidence` and `--attestation` are aliases
for the E3 attestation path, but you may supply only one. They are accepted only
for `install` and `update`.

`--failure-point` is a test-only option. It is rejected unless failure
injection is explicitly enabled and must not be used in normal operation.

## Understand compatibility evidence

Every installation receipt records evidence by capability:

- **E1:** source, schema, and overlay validation.
- **E2:** deterministic materialization, inventory, paths, syntax, and modes.
- **E3:** shared portable-core behavior. Install and update require a current,
  passed E3 attestation bound to the source commit and portable-core hash.
- **E4:** installer transaction, receipt, settings ownership, drift, recovery,
  and rollback behavior.
- **E5:** host-native discovery and integration.
- **E6:** a host-native runtime scenario.

`passed`, `failed`, and `unavailable` have different meanings. E5 or E6 can be
`unavailable` because the host executable, authentication, safe probe, or
configured scenario is missing. Unavailable never means passed.

The normal offline policy can report the installation as `provisional` when
the structural and transactional evidence passes but native evidence is not
available. This can be enough to assemble and install the package, but it does
not certify native host discovery or runtime behavior. Re-run an approved
native probe when its prerequisite becomes available or the evidence expires.

## Troubleshooting

### The command says an E3 attestation is missing, stale, failed, or does not match

Use the attestation supplied for the exact source commit and source bytes. Do
not reuse one from another commit, edit it, or substitute a native E5/E6 record.
For an approved self-contained archive, confirm that exactly one recognized E3
record exists inside it or pass the matching file with `--attestation`.

### The local source is reported as dirty

Run:

```sh
git -C "$MAISTER_SOURCE" status --porcelain=v1 --untracked-files=all --ignored=matching --no-renames
```

Commit, move, or remove every reported changed, untracked, or ignored input,
then retry from the clean checkout. `MAISTER_ALLOW_DIRTY_LOCAL=1` exists only
for deliberate development experiments; it is not production provenance and
must not be used for a release or support reproduction.

### A GitHub ref is rejected

Use a full lowercase 40-character commit. Safe branch and tag names are also
accepted, but short commits, ambiguous refs, and unsafe characters are not. If
Git is timing out, set `MAISTER_GIT_TIMEOUT_MS` within the supported 1–600000 ms
range and retry after checking network access.

### Install says the target is already installed

Use `update`, not `install`. First run `status`, preserve the active receipt,
and confirm that the source and matching E3 attestation are for the intended
new version.

### A drift conflict is reported

Do not force the operation or delete the changed file. Read
`error.details.conflicts` or the reported path, preserve your change, and
compare it with the active receipt. Reconcile the managed file or managed
settings key before retrying.

### The lock is busy

Check whether another Maister installer is running for the same target and
state root. Wait for it to finish. If the process is confirmed gone, preserve a
copy of `install.lock` and the journals before any cleanup; do not delete a live
process's lock.

### Status or verify returns code 0 with no receipt

Check `receipt_path`. A null value means no active receipt was found under the
selected target, home, and state root. Confirm `--target`, `--home`, and
`XDG_STATE_HOME` match the original install.

### Verify reports integrity failure

Stop the host and other writers. Preserve the installed target, receipt,
journal, and backups. Do not update or uninstall until you understand the
changed receipt-listed file or setting.

### Rollback or recovery returns code 7

Stop. Preserve the entire target state directory and the installed target. Do
not repeatedly invoke rollback, hand-edit the journal, or treat a later code-0
command as proof of restoration. Correct the reported permission, path, or
backup problem, run recovery once it is safe, then require a non-null receipt
and a successful verify.

## Related documentation

- [Platform-independent distribution specification](../implementation/spec.md)
- [Implementation verification report](../verification/implementation-verification.md)
