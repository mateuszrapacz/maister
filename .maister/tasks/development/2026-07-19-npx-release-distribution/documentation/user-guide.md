# Maister GitHub-only distribution — user guide

## At a glance

Maister is acquired from the canonical GitHub repository, `mateuszrapacz/maister`, and its release payload is downloaded from the matching GitHub Release. Maister is not published to npmjs, GitHub Packages, or any other package registry.

The supported package selectors are immutable exact refs only:

- an exact stable release tag such as `#v2.2.1`;
- a lowercase full 40-character commit such as `#0123456789abcdef0123456789abcdef01234567`.

Branches, `HEAD`, omitted refs, `latest`, npm dist-tags, semver versions or ranges, prereleases, pull-request refs, short SHAs, alternate repositories, and moving URLs are unsupported.

Requirements:

- Node.js 22 or newer;
- Git available to npm;
- access to the selected commit in `github.com/mateuszrapacz/maister`;
- for `install` and `update`, access to the corresponding GitHub Release metadata and assets.

The canonical repository is public at present, so ordinary public use does not require a token.

## Install the exact Git package

Replace the example full commit with the approved lowercase 40-character commit for the release you are using:

```text
0123456789abcdef0123456789abcdef01234567
```

### Project installation

Install an exact tag as a development dependency:

```sh
npm install --save-dev "github:mateuszrapacz/maister#v2.2.1"
```

Or install the exact full commit:

```sh
npm install --save-dev "github:mateuszrapacz/maister#0123456789abcdef0123456789abcdef01234567"
```

After installation, run the project-local binary without resolving another package:

```sh
npx --no-install maister install --target codex
npx --no-install maister status --target codex
```

The package `prepare` step must run. Do not use `--ignore-scripts`; lifecycle-disabled acquisition cannot generate the required checkout-commit manifest and is unsupported.

### One-shot `npm exec`

`npm exec` can acquire and run the exact Git package without adding it to the current project. Use `--yes` for a non-interactive invocation:

```sh
npm exec --yes \
  --package="github:mateuszrapacz/maister#v2.2.1" \
  -- maister install --target codex
```

The equivalent full-commit invocation is:

```sh
npm exec --yes \
  --package="github:mateuszrapacz/maister#0123456789abcdef0123456789abcdef01234567" \
  -- maister verify --target cursor
```

`npx --yes --package="..." -- maister ...` is the equivalent npm alias:

```sh
npx --yes \
  --package="github:mateuszrapacz/maister#v2.2.1" \
  -- maister install --target kiro-cli
```

The exact Git selector belongs to the package acquisition command. The Maister launcher does not accept a repository, URL, version, branch, source, or selector override as a CLI argument.

## Supported targets and lifecycle flows

The target is always explicit and must be exactly one of `codex`, `cursor`, or `kiro-cli`:

```sh
npm exec --yes --package="github:mateuszrapacz/maister#v2.2.1" -- maister install --target codex
npm exec --yes --package="github:mateuszrapacz/maister#v2.2.1" -- maister install --target cursor
npm exec --yes --package="github:mateuszrapacz/maister#v2.2.1" -- maister install --target kiro-cli
```

The same target forms are used for updates and local state operations:

```text
maister install   --target <codex|cursor|kiro-cli>
maister update    --target <codex|cursor|kiro-cli>
maister status    --target <codex|cursor|kiro-cli>
maister verify    --target <codex|cursor|kiro-cli>
maister uninstall --target <codex|cursor|kiro-cli>
maister rollback  --target <codex|cursor|kiro-cli>
maister recover   --target <codex|cursor|kiro-cli> [--journal-id <uuid>]
```

Add `--json` at most once when machine-readable installer output is needed. `--journal-id` is accepted only by `recover` and must be an exact canonical UUID.

The target archive and overlay are fixed by the implementation:

| Target | GitHub Release archive | Selected overlay |
|---|---|---|
| `codex` | `maister-codex.tar.gz` | `plugins/maister/overlays/codex/**` |
| `cursor` | `maister-cursor.tar.gz` | `plugins/maister/overlays/cursor/**` |
| `kiro-cli` | `maister-kiro-cli.tar.gz` | `plugins/maister/overlays/kiro-cli/**` |

`install` and `update` acquire and verify the exact GitHub Release. The release archive's `plugins/maister/bin/maister-install.mjs` is then invoked. That installer remains the only component allowed to mutate target files, managed settings, locks, journals, backups, staging, receipts, control planes, rollback state, or recovery state.

## Public and private authentication

Git package authentication and GitHub API authentication are separate mechanisms.

### Public repository and Release

For the current public repository:

- npm/Git can clone the exact Git ref anonymously;
- the launcher requests the exact Release metadata anonymously first;
- release assets are fetched through the GitHub API asset endpoint without an `Authorization` header;
- a successful anonymous request locks the invocation into public mode, even if token variables happen to exist in the environment.

Do not add a token to a public command. A public Release failure is not repaired by switching to a different tag, repository, asset URL, or moving release.

### Private repository: npm/Git credentials

If the canonical repository becomes private, npm must authenticate the Git checkout through normal Git facilities. Supported approaches include:

- an SSH agent/key with repository access, using an exact `git+ssh://` package spec;
- an HTTPS credential helper or askpass mechanism managed by the operator.

For example, with an exact private full commit and an SSH agent:

```sh
npm exec --yes \
  --package="git+ssh://git@github.com/mateuszrapacz/maister.git#0123456789abcdef0123456789abcdef01234567" \
  -- maister install --target codex
```

The launcher does not read, convert, persist, or log Git credentials. Never embed a token in a Git/package URL, command line, lockfile, committed npm configuration, or diagnostic output.

### Private Release: GitHub API credentials

Git checkout credentials are not automatically reused for GitHub API requests. A private Release needs a least-privilege token with repository Contents/Release read access. Credential resolution is strictly:

1. the first non-empty `GH_TOKEN`;
2. otherwise the first non-empty `GITHUB_TOKEN`;
3. otherwise the bounded result of `gh auth token --hostname github.com`;
4. otherwise no API credential.

The first present environment source is authoritative. If an explicitly present `GH_TOKEN` or `GITHUB_TOKEN` is malformed, the launcher fails closed; it does not silently fall through to the next source. `gh` failure, timeout, missing executable, malformed output, or output overflow is treated as no command credential and does not reveal command output or token details.

The launcher only sends API authorization to HTTPS `api.github.com` on the fixed Release metadata and numeric Release-asset routes. Authorization is permanently removed before a cross-host redirect. It is never sent to `github.com`, release-content hosts, signed asset URLs, or arbitrary hosts. Public anonymous success bypasses the credential chain entirely.

## Exact selector and provenance expectations

There are two related but distinct pieces of evidence:

1. Protected release CI proves that the original npm package selector was literal and exact. For a tag, it proves the exact `vX.Y.Z` tag target; for a commit, it proves the literal lowercase full commit.
2. The package `prepare` step records the actual checkout commit in `.maister-resolved-commit.json`. The launcher requires this manifest and does not infer the original selector from npm cache layout, URLs, Git metadata, or caller input.

The candidate is accepted only when all of these observations agree:

| Evidence | Expected identity |
|---|---|
| Protected-CI package selector | The literal exact tag or full commit used to invoke npm |
| Package manifest | The actual lowercase full checkout commit and package version |
| GitHub Release | `vX.Y.Z`, non-draft/non-prerelease, with the tag pointing to that commit |
| Release sidecars | The same package version and full source commit |
| Archive `.maister-source.json` | The same version, full commit, and content hash |
| E3 attestation | The same version/full commit and portable-core/artifact digest |
| Installed receipt | The same source identity, content hash, and control-plane identity |

The archive is streamed and checked against `SHA256SUMS`, SBOM, provenance, and GitHub's asset digest when present. These are integrity and consistency checks; the current unsigned sidecars are not publisher authentication.

Missing or conflicting identity, duplicate or unexpected assets, a wrong target archive, an invalid archive topology, or a failed digest check stops the operation before host mutation. No other Release, branch, URL, asset, or package can substitute.

## npm and registry policy

Maister distribution is GitHub-only:

- there is no Maister npmjs package to install;
- no Maister package, metadata, dist-tag, or provenance is published to npmjs;
- GitHub Release assets are the payload authority;
- GitHub Actions may publish and verify GitHub Release assets only;
- GitHub Packages and other registries are not distribution fallbacks.

The root package is deliberately `private: true` and has no publication configuration. npm is used only as a local Git-package client and executable runner.

There is one deliberate exception: npm may make read-only registry requests to acquire the exact locked third-party dependency `tar@7.5.20` and its transitive closure. This is a runtime dependency of the launcher, not a Maister publication channel. No registry mutation or Maister registry credential is permitted.

## What requires the network

`install` and `update` need the exact GitHub Release metadata, sidecars, and selected target archive. Before the launcher starts, npm may also need Git, its cache, and read-only dependency-registry access for `tar@7.5.20`.

After the exact package has been acquired, these commands are state-only and do not perform launcher DNS, HTTP, Git, registry, GitHub credential, `gh`, npm-cache, current-checkout, or PATH discovery:

- `status`;
- `verify`;
- `uninstall`;
- `rollback`;
- `recover`.

State-only commands discover the active receipt and its version-matched control-plane closure under the canonical target state root. They fail closed and make no mutation if that authority is absent, legacy, ambiguous, corrupt, symlinked, escaping, or mismatched. Only a verified `install` or `update` may migrate a pre-feature receipt through a transaction.

Truly disconnected use therefore requires the exact Git package and its dependency closure to already be installed or cached locally. “Offline state-only” begins after npm has acquired and started the package; it does not mean npm can fetch a missing package without a network.

## Rollback, interruption, and recovery

The installer serializes Maister lifecycle processes with a target-scoped lock and records durable transaction state in journals, receipts, backups, staging, and control planes. Stop the host application and any editor, synchronization service, or other process that can write the target or managed settings before lifecycle recovery. The lock does not protect against arbitrary host writers.

### Rollback

Rollback is local and receipt-bound:

```sh
npx --no-install maister rollback --target codex
```

It validates the historical receipt and its matching retained control-plane closure before restoring the active pointer. It does not download a new release or guess a receipt, backup, or version. Historical closures remain while referenced by active, history, rollback, recovery, backup, or journal state.

### Recovery after code 7 or an interrupted operation

Exit code `7` means transaction, recovery, rollback, or child-termination state is unresolved. Treat the retained state as evidence:

- stop competing writers and the host application;
- do not delete the lock, journal, backup, staging directory, receipt, control plane, or retained operation root;
- do not hand-edit any of those files;
- do not repeatedly retry rollback;
- use the exact recovery command and journal identity reported by the failed operation.

The normal form is:

```sh
npx --no-install maister recover \
  --target codex \
  --journal-id <journal-uuid> \
  --json
```

The UUID is resolved only below that target's journal directory. If multiple unresolved journals exist, recovery without `--journal-id` fails closed rather than choosing the newest or oldest journal. Qualified recovery changes only the selected journal's operation-owned paths and preserves every unselected journal and its state byte-for-byte and topology-for-topology.

An interrupted first install may retain its verified private operation root and exact evidence until recovery reaches a terminal state. Cleanup is allowed only after that terminal state. If recovery returns code `7` again, stop and preserve the state for diagnosis.

## Exit codes

The launcher and installer preserve the documented exit codes:

| Code | Meaning | First action |
|---:|---|---|
| `0` | Success | Inspect the receipt if needed. |
| `2` | Usage or settings format error | Correct the command or settings input. |
| `3` | Source or Release acquisition failure | Check exact ref, Git access, Release availability, and network. |
| `4` | Validation failure | Stop; do not bypass identity, archive, or provenance checks. |
| `5` | Drift conflict | Stop competing writers and review the reported target drift. |
| `6` | Lock busy or offline authority unavailable | Do not remove the lock; resolve the active process or missing local authority. |
| `7` | Transaction, recovery, rollback, or child termination failure | Preserve state and follow the exact-journal recovery route. |
| `8` | Integrity failure | Treat the release or local state as untrusted and stop. |

An interruption cannot produce success. The first signal aborts acquisition or is forwarded to the child; cleanup never becomes an implicit rollback.

## Troubleshooting

| Symptom | Response |
|---|---|
| “Unsupported selector” or a branch/range/latest command is rejected | Use `#vX.Y.Z` or a lowercase full 40-character commit. Do not substitute a short SHA or a moving ref. |
| Package identity or `.maister-resolved-commit.json` is missing, malformed, or mismatched | Reacquire the same exact Git package with lifecycle scripts enabled. Do not create or edit the manifest by hand. |
| npm cannot clone a private repository | Fix npm/Git authentication through the SSH agent, HTTPS credential helper, or askpass. Keep credentials out of the package URL and logs. |
| A public Release request returns 404/403/401 | Confirm the exact tag and Release exist. Do not switch repositories or use a browser download URL. If the repository is private, configure the API credential chain. |
| `GH_TOKEN` or `GITHUB_TOKEN` is rejected | The first non-empty variable wins. Correct or unset the authoritative variable; a malformed explicit token will not fall through. |
| `gh` fallback is unavailable | For a public Release, anonymous access may continue. For a private Release, configure a valid protected token or a working `gh auth token --hostname github.com` source. |
| Checksum, SBOM, provenance, source manifest, E3, or Release identity mismatch | Stop immediately. Do not retry against another asset, disable validation, or treat unsigned sidecars as publisher authentication. |
| Archive path/type/mode/size/compression policy failure | Treat the archive as invalid and preserve the diagnostic. Extraction is intentionally fail-closed. |
| Exit code `5` | Stop editor/sync/direct writers, inspect drift, and retry only when the target is stable. |
| Exit code `6` | Determine whether another Maister lifecycle operation is active. Preserve lock metadata; do not delete it to force progress. |
| Exit code `7` | Stop competing writers and use `recover --journal-id` with the exact UUID. Preserve all retained state if recovery does not reach a terminal result. |
| `status`, `verify`, `rollback`, or `recover` cannot find a valid local authority | This is a mutation-free failure. Acquire a verified package and use `install` or `update`; do not rely on PATH, npm cache, a sibling receipt, or a current checkout. |
| Install/update works only with network access | This is expected. Installation needs GitHub Release acquisition; state-only commands are network-free only after package acquisition. |

## Current release status and evidence limits

The implementation is GitHub-only, but public release acceptance is currently blocked by external prerequisites. Do not represent the following as complete:

- the canonical public `v2.2.1` Git tag and immutable GitHub Release assets do not yet exist;
- no protected Linux/macOS/Windows Node 22 run has yet supplied the required real public exact-tag/full-commit smoke evidence;
- required immutable tag/ruleset controls, protected default-branch controls, and the protected `github-release` environment are not yet evidenced.

Local tests, workflow definitions, a dry-run package, a checksum, a substitute repository, a local fixture, or an unprotected run cannot replace those external release gates. Until they exist, public install examples in this guide describe the supported contract; they are not a claim that the canonical `v2.2.1` release is available.

Phase 12 browser E2E was skipped (`e2e_enabled: false`). This guide therefore makes no screenshot, browser, or browser-evidence claim.

## Future-private-repository migration checklist

If the existing canonical repository changes from public to private, complete every item below before treating private distribution as supported. Keep the same canonical repository and GitHub-only policy; do not create a second repository or add a package registry.

- Keep all package specs pinned to the canonical repository and an exact `vX.Y.Z` tag or lowercase full commit.
- Provision developer and CI Git checkout access through an SSH agent/key or HTTPS credential helper; prohibit token-bearing Git URLs and committed credentials.
- Provision a least-privilege GitHub API token with repository Contents/Release read access. Store it only in protected host/CI secrets and environments that are unavailable to untrusted pull requests.
- Preserve and test the `GH_TOKEN` → `GITHUB_TOKEN` → bounded `gh auth token --hostname github.com` precedence. Preserve invalid-explicit fail-closed behavior, redaction, approved API routes, octet-stream asset requests, and permanent cross-host Authorization stripping.
- Replace the real anonymous public smoke gate with a protected authenticated private-repository E2E gate using both exact tag and full-commit selectors. Exercise acquisition, Release assets, install, status, verify, uninstall, all three targets, and cleanup. Retain the hermetic credential, transport, redaction, and anonymous-denial tests.
- In protected CI, prove that the original selector, package prepare manifest, peeled Release tag target, sidecar source identity, archive `.maister-source.json`, archive/content hashes, E3 digest, and installed receipt all identify the approved full commit and version.
- Keep the Linux/macOS/Windows matrix on Node 22 and the exact release npm major. Classify missing host credentials or unsupported native behavior as `unavailable`, never as passed.
- Apply and verify immutable `v*` tag rules, protected default-branch rules, and the protected `github-release` environment before granting release authority.
- Audit logs, artifacts, subprocess output, URLs, redirects, signed query diagnostics, credential helpers, home-directory paths, and private paths for leakage. Rotate any credential exposed during migration testing.
- Update this guide and the protected workflow evidence with the effective private-access procedure and the date and approved commit at which private E2E became mandatory.

